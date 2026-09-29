/* =========================================================================
 * 数据面板：备份 / 还原 / 搬家 / 快照
 * -------------------------------------------------------------------------
 * 为什么要有它：登录态、学习进度、笔记本、代码仓库全在浏览器的 localStorage 里，
 *   按命名空间分空间（未登录 :guest / 登录后 :<用户名>）。于是有两个坑：
 *     1. 游客学了半天，登录后一换空间，进度看着像「没了」；
 *     2. 换浏览器、换设备、清缓存，数据全不带走。
 *   本模块就是这两件事的出口：**搬家**（空间之间搬）与**备份**（导出成文件带走）。
 *
 * 三种挂载形态（同一套内容与逻辑，只是落点不同）：
 *   **顶栏气泡（popover）**——2026-09-29 起的**主位置**：登录后页面右上角那颗
 *     「数据」钮点开，面板就挂在那颗钮**下方**（见 src/theme/Navbar/index.js 的
 *     DataPanel）。位置固定、随手可得，不用先跑去登录页。
 *   **内嵌（inline）**——挂进页面里某个容器，随页面一起滚动，常驻可见。
 *     登录页（/login）账号卡片右下方仍是这一形态，登录前后一眼能看见。
 *   **浮窗（float）**——挂到 body 上、可开关的老形态，供 openBackup() 用。
 *
 * 三种形态可以同时存在（顶栏气泡 + 登录页内嵌同屏是常态），所以内嵌实例
 * 用**集合**持有，不是单个引用——早先写单例时，后者一挂就会把前者悄悄拆掉。
 *
 * 与云同步的边界（务必对用户说清楚）：站点可能开了云同步（server/sync-server.mjs），
 *   也可能没有——**同步是可选的增强**。开了且连得上，这一页顶上会显示同步状态；
 *   没开或连不上，数据就只在这台浏览器里，备份文件是唯一能带走它的形式，
 *   落盘后请自己收好（网盘 / U 盘 / 邮件给自己）。
 *
 * 数据形状（备份文件 .json）：
 *   { app:'math-ladder-backup', v:1, at, spaces:{ <空间名>: {progress, exercises,
 *     last, notebook, repo} } }
 * 空间名就是 'guest' 或用户名小写，导入时按原名还原。
 *
 * 对外：openBackup() / closeBackup() / isBackupOpen() / mountBackup(host, opts)。
 * ========================================================================= */

import { progressNS, listSpaces, readSpace, writeSpace, clearSpaceNS } from '../learning/progress';
import { peekNotebook, writeNotebook } from './notebook';
import { peekRepo, writeRepo } from './repo';
import { getAuth, AUTH_EVENT } from '../auth';
import { syncNow, syncHint, SYNC_EVENT } from '../sync';
import { watchPanel, bringToFront, isTopmost } from './zorder';

const FORMAT = 'math-ladder-backup';
const VERSION = 1;
const SNAP_KEY = 'ml-snapshot';

/* 三个实例互不干扰：顶栏气泡里一份、登录页内嵌一份，同时用户又按了快捷键开浮窗——
   各自持有自己的 body/foot/输入框，不能共用一份 els（否则一个面板改状态，
   另一个面板的 DOM 被偷偷改写）。 */
let floatEls = null;
const inlineSet = new Set();
let authHooked = false;
let cloudHooked = false;
let escHooked = false;

function liveSet() {
  return [floatEls, ...inlineSet].filter(Boolean);
}

/* ---------- 小工具 ---------- */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function btn(label, cls, title, fn) {
  const b = el('button', cls || 'py-runner__btn', label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', fn);
  return b;
}

function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function currentNS() {
  return progressNS().slice(1); /* ':guest' → 'guest' */
}

/* ---------- 云端状态行（面板顶上那一条） ----------
 * 显示原则：**没有后端就当它不存在**。站点可能压根没部署同步服务，
 * 那时弹一行「同步失败」纯属噪音；只有「之前同步成功过、这次连不上」
 * 才值得告诉用户（那才是真的有改动没送上去）。
 *
 * 状态判定与文案**一律走 syncHint()**（登录页用的也是它），这里不另写一份：
 * 同一句话在两处各写一遍的结果必然是文案漂移。传 'panel' 是因为同一批文案
 * 也显示在登录页上，那边才需要指路到数据面板，在这儿指就成了自指。 */

function syncAction(label, title) {
  const b = el('button', 'py-runner__btn py-runner__btn--ghost ml-backup__cloud-act', label);
  b.type = 'button';
  b.title = title;
  b.addEventListener('click', () => {
    syncNow();
    liveSet().forEach(renderCloudInto);
  });
  return b;
}

function renderCloudInto(els) {
  if (!els) return;
  const row = els.cloud;
  /* 'panel' = 这段文案显示在「数据」面板内部，别再指路到数据面板——用户已经在这儿了 */
  const hint = syncHint('panel');

  row.innerHTML = '';
  row.className = 'ml-backup__cloud';

  if (!hint) {
    /* 登录了、也有令牌，但**一次都没同步成功过**（state 是 off，或 nobackend 且 lastAt=0）
       —— 这种多半是这个站点压根没部署同步服务。整行藏掉，静默降级。 */
    row.classList.add('is-hidden');
    return;
  }

  row.classList.add('is-' + hint.tone);
  /* syncHint 把「正在同步」也归到 muted 里，只有这里需要区分——它在动，得让人看见 */
  if (hint.state === 'syncing') row.classList.add('is-syncing');

  row.append(el('span', 'ml-backup__cloud-dot'), el('span', 'ml-backup__cloud-text', hint.text));

  if (hint.action) {
    row.appendChild(
      syncAction(
        hint.action,
        hint.tone === 'warn'
          ? '现在就重试一次，不用等自动重试的那 30 秒'
          : '立刻把云端的改动拉下来，同时把本地的推上去',
      ),
    );
  }
  /* hint.error 是给用户看的原因（「数据太大，单账号 4 MB 上限」这类）。
     这类问题用户自己能解决，只塞进 title 里不够，得摊开写在下面。 */
  if (hint.tone === 'warn' && hint.error) {
    row.appendChild(el('div', 'ml-backup__cloud-why', hint.error));
  }
}

/* ---------- 数据读写 ---------- */

function collectSpace(ns) {
  const base = readSpace(ns);
  base.notebook = peekNotebook(ns);
  base.repo = peekRepo(ns);
  return base;
}

function collectAll() {
  const out = {};
  for (const ns of listSpaces()) out[ns] = collectSpace(ns);
  return out;
}

/** 把一个空间的数据写进目标空间；mode: 'merge' | 'replace' */
function applySpace(ns, data, mode) {
  const d = data || {};
  writeSpace(ns, d, mode);
  const nb = writeNotebook(ns, d.notebook, mode);
  const rp = writeRepo(ns, d.repo, mode);
  return { notebook: nb, repo: rp };
}

function clearSpaceAll(ns) {
  clearSpaceNS(ns);
  writeNotebook(ns, null, 'replace');
  writeRepo(ns, null, 'replace');
}

function statsOf(d) {
  const books = (d && d.notebook && d.notebook.books) || [];
  const cells = books.reduce((n, b) => n + ((b.cells || []).length), 0);
  const prog = (d && d.progress) || {};
  return {
    done: Object.keys(prog).filter((k) => prog[k]).length,
    ex: Object.keys((d && d.exercises) || {}).length,
    books: books.length,
    cells,
    codes: ((d && d.repo && d.repo.items) || []).length,
  };
}

function isEmpty(d) {
  const s = statsOf(d);
  return !s.done && !s.ex && !s.books && !s.codes;
}

/* ---------- 快照（误删兜底，一个空间留一份） ---------- */

function snapKey(ns) {
  return SNAP_KEY + ':' + ns;
}

function saveSnapshot(ns) {
  try {
    window.localStorage.setItem(snapKey(ns), JSON.stringify({ at: Date.now(), space: collectSpace(ns) }));
    return true;
  } catch {
    /* 配额不够：笔记本大 + 代码多的时候会撞上，提示用户改用导出文件 */
    return false;
  }
}

function readSnapshot(ns) {
  try {
    const v = JSON.parse(window.localStorage.getItem(snapKey(ns)) || 'null');
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/* ---------- 文件下载 / 读取 ---------- */

function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportSpaces(els, names, label) {
  const spaces = {};
  let n = 0;
  for (const ns of names) {
    const d = collectSpace(ns);
    if (!isEmpty(d)) {
      spaces[ns] = d;
      n += 1;
    }
  }
  if (!n) {
    setStatus(els, '这个范围里没有任何数据可导');
    return;
  }
  const who = n === 1 ? Object.keys(spaces)[0] : label;
  download(`math-ladder-${who}-${stamp()}.json`, {
    app: FORMAT,
    v: VERSION,
    at: new Date().toISOString(),
    spaces,
  });
  setStatus(els, `已导出 ${n} 个空间：${Object.keys(spaces).join('、')}`);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读不出来'));
    reader.readAsText(file);
  });
}

/* ---------- 面板 ---------- */

function setStatus(els, s) {
  if (els) els.foot.textContent = s || '';
}

/**
 * 造一个面板。
 * @param {'float'|'inline'|'popover'} mode 浮窗（挂 body、可开关）／内嵌（挂容器、常驻）
 *        ／顶栏气泡（挂顶栏下拉里，头部带关闭钮）
 * @param {object} [opts] popover 用：{ onClose } —— 头部关闭钮的回调
 */
function buildPanel(mode, opts = {}) {
  const inline = mode !== 'float';
  const panel = el('div', 'ml-backup' + (inline ? ' is-inline' : '') + (mode === 'popover' ? ' is-popover' : ''));
  if (mode === 'float') panel.id = 'ml-backup';

  const head = el('div', 'ml-backup__head');
  const title = el('span', 'ml-backup__title', '数据 · 备份与搬家');
  const nsTip = el('span', 'ml-backup__ns', '');
  head.append(title, nsTip);

  /* 内嵌态没有「关闭」这一说——它就长在页面上，关了就没了。
     浮窗态与顶栏气泡态都要关闭钮：气泡盖在正文上，没有出口用户只能去点别处。 */
  let close = null;
  if (mode !== 'inline') {
    close = el('button', 'ml-backup__close', '×');
    close.type = 'button';
    close.title = mode === 'popover' ? '收起（Esc）' : '关闭（Esc）';
    close.setAttribute('aria-label', mode === 'popover' ? '收起数据面板' : '关闭数据面板');
    head.appendChild(close);
  }

  /* 云端状态行：放在标题与工具条之间，一眼能看见，又不挤占下面的空间列表。
     默认带 is-hidden：站点多半没部署同步服务，不该先闪一行再消失。 */
  const cloud = el('div', 'ml-backup__cloud is-hidden');

  const bar = el('div', 'ml-backup__bar');
  const modeSel = el('select', 'ml-backup__mode');
  const optMerge = el('option', '', '导入方式：合并');
  optMerge.value = 'merge';
  const optReplace = el('option', '', '导入方式：覆盖');
  optReplace.value = 'replace';
  modeSel.append(optMerge, optReplace);
  modeSel.title =
    '合并＝同名的课/本子取并集，不删你现有的东西（默认，安全）；覆盖＝先用备份里的东西替换掉同名空间';

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';

  /* 按钮闭包要用到 els，先占位再补（buildPanel 返回前把 els 写进去） */
  const box = { panel, cloud, body: null, foot: null, nsTip, mode: modeSel, fileInput, kind: mode };
  const bAll = btn('⬇ 导出全部空间', 'py-runner__btn', '所有账号/游客空间的数据打成一个 .json，换设备就靠它', () =>
    exportSpaces(box, listSpaces(), '全部'),
  );
  const bCur = btn('⬇ 只导出当前账号', 'py-runner__btn py-runner__btn--ghost', '只打包你现在所在的这个空间', () =>
    exportSpaces(box, [currentNS()], currentNS()),
  );
  const bImport = btn('⬆ 从备份文件导入', 'py-runner__btn py-runner__btn--ghost', '选一个之前导出的 .json', () =>
    fileInput.click(),
  );
  bar.append(bAll, bCur, bImport, modeSel);

  const body = el('div', 'ml-backup__body');
  const foot = el('div', 'ml-backup__foot', '');
  box.body = body;
  box.foot = foot;
  panel.append(head, cloud, bar, body, foot);
  panel.appendChild(fileInput);

  if (close) {
    close.addEventListener('click', () => {
      if (mode === 'popover') {
        if (typeof opts.onClose === 'function') opts.onClose();
        return;
      }
      closeBackup();
    });
  }

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await readFile(f));
    } catch (e2) {
      setStatus(box, '这个文件不是合法的备份：' + ((e2 && e2.message) || e2));
      return;
    }
    if (!data || data.app !== FORMAT || !data.spaces || typeof data.spaces !== 'object') {
      setStatus(box, '这不是数学阶梯的备份文件（缺 app/spaces 字段）');
      return;
    }
    const m = box.mode.value === 'replace' ? 'replace' : 'merge';
    const names = Object.keys(data.spaces);
    if (m === 'replace' && !window.confirm(`覆盖会把这 ${names.length} 个空间里现有的同名数据替换掉，确定？`)) return;
    setStatus(box, '正在导入…');
    const parts = [];
    for (const ns of names) {
      const r = applySpace(ns, data.spaces[ns], m);
      const s = statsOf(data.spaces[ns]);
      parts.push(`${ns}（${s.done} 门课 / ${s.books} 本笔记 / ${s.codes} 段代码）`);
      if (r.notebook && !r.notebook.ok) setStatus(box, `⚠ ${ns} 的笔记本没写进去：存储空间不够`);
    }
    /* 导入会动到别的空间：两个实例都要重画 */
    liveSet().forEach(renderBodyInto);
    setStatus(box, `已导入 ${names.length} 个空间：${parts.join('；')}`);
  });

  if (mode === 'float') watchPanel(panel);
  return box;
}

function renderBodyInto(els) {
  if (!els) return;
  const cur = currentNS();
  const auth = getAuth();
  els.nsTip.textContent = cur === 'guest' ? '游客空间' : '账号 ' + cur;
  els.nsTip.title =
    cur === 'guest'
      ? '没登录，数据存在这台浏览器的游客空间。登录后请到这儿点「搬到当前账号」。'
      : `数据存在账号「${cur}」的空间里。云同步连不上时它只在这台浏览器，换设备请用「导出全部空间」。`;

  renderCloudInto(els);

  const names = listSpaces();
  if (!names.includes(cur)) names.unshift(cur);
  const data = {};
  names.forEach((ns) => {
    data[ns] = collectSpace(ns);
  });

  els.body.innerHTML = '';

  /* 最要紧的一条提示：游客有货、当前不是游客 → 数据没跟过来，可以搬 */
  if (cur !== 'guest' && !isEmpty(data.guest || {})) {
    const g = statsOf(data.guest);
    const tip = el('div', 'ml-backup__tip');
    tip.append(
      el(
        'div',
        '',
        `游客空间里还有 ${g.done} 门课的进度、${g.books} 本笔记、${g.codes} 段代码。登录只是换了个抽屉，不会自动把东西搬过来——点下面那一行的「搬到当前账号」即可（原游客空间保留，搬完确认没问题再清）。`,
      ),
    );
    els.body.appendChild(tip);
  }

  const note = el('p', 'ml-backup__note');
  note.textContent =
    '这一页管的是：学习进度 / 练习通过记录 / 数学笔记本 / 代码仓库。站点开着云同步时它们会跟着账号走；' +
    '没开（或连不上）时就只存在这台浏览器里——换设备请「导出全部空间」，把 .json 收好。';
  els.body.appendChild(note);

  names.forEach((ns) => {
    const d = data[ns];
    const s = statsOf(d);
    const row = el('div', 'ml-backup__space');

    const top = el('div', 'ml-backup__space-top');
    const nameEl = el('span', 'ml-backup__spacename', ns === 'guest' ? '游客空间' : '账号 ' + ns);
    if (ns === cur) nameEl.classList.add('is-current');
    const tags = el('span', 'ml-backup__tags');
    if (ns === cur) tags.appendChild(el('span', 'ml-backup__tag is-current', '当前'));
    if (ns !== 'guest' && auth && auth.u === ns) tags.appendChild(el('span', 'ml-backup__tag', '已登录'));
    top.append(nameEl, tags);

    const stat = el('div', 'ml-backup__stat');
    stat.textContent = isEmpty(d)
      ? '（这个空间还没有数据）'
      : `已学 ${s.done} 门课 · 练习通过 ${s.ex} 条 · 笔记本 ${s.books} 本（${s.cells} 个单元）· 代码 ${s.codes} 段`;

    const acts = el('div', 'ml-backup__acts');
    acts.appendChild(
      btn('导出这个空间', 'py-runner__btn py-runner__btn--ghost', '只导出这一个空间', () => exportSpaces(els, [ns], ns)),
    );
    if (ns !== cur) {
      acts.appendChild(
        btn(
          `搬到「${cur === 'guest' ? '游客空间' : cur}」`,
          'py-runner__btn',
          `把 ${ns} 的数据合并进当前空间（源空间保留）`,
          () => {
            const r = applySpace(cur, d, 'merge');
            const s2 = statsOf(d);
            liveSet().forEach(renderBodyInto);
            if (r.notebook && !r.notebook.ok) {
              setStatus(els, '⚠ 笔记本没搬完：存储空间不够，先删几条再试');
              return;
            }
            setStatus(els, `已把 ${ns} 的 ${s2.done} 门课 / ${s2.books} 本笔记 / ${s2.codes} 段代码搬进当前空间`);
          },
        ),
      );
    }
    acts.appendChild(
      btn('存快照', 'py-runner__btn py-runner__btn--ghost', '在本机留一份当前状态的快照，误删时可恢复（一个空间只留一份）', () => {
        setStatus(els, saveSnapshot(ns) ? `已存快照（${fmtTime(Date.now())}）` : '⚠ 快照没存下：浏览器存储配额不够，请改用「导出这个空间」存成文件');
      }),
    );
    const snap = readSnapshot(ns);
    if (snap) {
      acts.appendChild(
        btn(
          `恢复快照（${fmtTime(snap.at)}）`,
          'py-runner__btn py-runner__btn--ghost',
          '把这一个空间恢复到存快照时的状态（合并方式，不会删现有东西）',
          () => {
            if (!window.confirm(`把「${ns}」恢复到 ${fmtTime(snap.at)} 的快照？以合并方式写回，不会删除现有数据。`)) return;
            const r = applySpace(ns, snap.space, 'merge');
            liveSet().forEach(renderBodyInto);
            setStatus(els, r.notebook && r.notebook.ok ? '已恢复快照' : '⚠ 恢复时笔记本写不进去：存储空间不够');
          },
        ),
      );
    }
    if (!isEmpty(d)) {
      const bClear = btn('清空这个空间', 'py-runner__btn py-runner__btn--ghost ml-backup__danger', '删掉这个空间里的全部数据（不可恢复，建议先导出或存快照）', () => {
        if (!window.confirm(`清空「${ns === 'guest' ? '游客空间' : ns}」的全部数据？这一步不可恢复。`)) return;
        if (!window.confirm('再确认一次：进度、笔记本、代码仓库都会被删掉。真的要清空吗？')) return;
        clearSpaceAll(ns);
        liveSet().forEach(renderBodyInto);
        setStatus(els, `已清空 ${ns}`);
      });
      acts.appendChild(bClear);
    }

    row.append(top, stat, acts);
    els.body.appendChild(row);
  });
}

/* ---------- 全局监听（都只挂一次） ----------
 * 这三个原先写在 buildPanel 里：面板跨代重建（enhancer 拆壳后重开）一次就多挂一份，
 * 旧闭包还抱着已被摘掉的 DOM。改成模块级单例，统一作用在**当前**的两个实例上。 */

function hookGlobals() {
  if (authHooked) return;
  authHooked = true;
  /* 登录/登出会换空间：面板开着也要跟着换，否则显示的还是上一个账号的统计。 */
  window.addEventListener(AUTH_EVENT, () => {
    liveSet().forEach((e2) => {
      renderCloudInto(e2);
      renderBodyInto(e2);
    });
  });
}
function hookCloud() {
  if (cloudHooked) return;
  cloudHooked = true;
  /* 同步状态自己会变（后台推成功 / 失败），面板开着时要跟着换。 */
  document.addEventListener(SYNC_EVENT, () => liveSet().forEach(renderCloudInto));
}
function hookEsc() {
  if (escHooked) return;
  escHooked = true;
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    /* 只关浮窗态：内嵌的那一块是页面的一部分，Esc 不该把它弄没 */
    if (!floatEls || !floatEls.panel.classList.contains('is-open')) return;
    /* 分层关闭：上面还叠着别的浮窗（笔记本/仓库/公式）时，这一层不动 */
    if (!isTopmost(floatEls.panel)) return;
    closeBackup();
  });
}

/* =========================================================================
 * 对外：浮窗形态
 * ========================================================================= */

export function openBackup() {
  hookGlobals();
  hookCloud();
  hookEsc();
  if (!floatEls || !document.contains(floatEls.panel)) floatEls = buildPanel('float');
  if (!document.contains(floatEls.panel)) document.body.appendChild(floatEls.panel);
  renderBodyInto(floatEls);
  setStatus(floatEls, '换设备前记得「导出全部空间」—— 云同步关着的时候，它是唯一能把数据带走的办法。');
  floatEls.panel.classList.add('is-open');
  bringToFront(floatEls.panel);
}

export function closeBackup() {
  if (floatEls) floatEls.panel.classList.remove('is-open');
}

export function isBackupOpen() {
  return !!(floatEls && floatEls.panel.classList.contains('is-open'));
}

/* =========================================================================
 * 对外：内嵌 / 顶栏气泡形态
 * -------------------------------------------------------------------------
 * 挂进 React 给的容器里。注意：容器是 React 渲染的空 div，React 不管它的
 * 子节点，所以往里塞 DOM 是安全的；但容器一旦被 React 卸载（比如退出登录
 * 后整块换掉），这一份实例就废了——务必用返回的 destroy() 收尾，
 * 否则它会留在 liveSet() 里，被后续事件反复重绘一个已经不在页面上的面板。
 *
 * 可以同时挂多份（顶栏气泡 + 登录页内嵌）。同一容器重复挂载会先收掉旧的，
 * 免得两块面板叠在一起抢同一块屏幕。
 * ========================================================================= */

/**
 * @param {HTMLElement} host 宿主容器
 * @param {object} [opts] { variant: 'inline' | 'popover', onClose }
 *        popover 形态头部多一颗关闭钮（点了走 onClose）。
 */
export function mountBackup(host, opts = {}) {
  if (!host) return { destroy() {} };
  hookGlobals();
  hookCloud();
  hookEsc();
  const variant = opts.variant === 'popover' ? 'popover' : 'inline';
  /* 同一容器只允许一份实例：登录态切换时 React 可能先挂载新的再卸载旧的，
     不先收掉旧的就会有两块 body 抢同一块屏幕。 */
  for (const old of [...inlineSet]) {
    if (old.host === host) {
      old.panel.remove();
      inlineSet.delete(old);
    }
  }
  const els = buildPanel(variant, opts);
  host.appendChild(els.panel);
  els.panel.classList.add('is-open');
  els.host = host;
  renderBodyInto(els);
  setStatus(els, '');
  inlineSet.add(els);

  return {
    refresh() {
      renderBodyInto(els);
    },
    destroy() {
      inlineSet.delete(els);
      els.panel.remove();
    },
  };
}
