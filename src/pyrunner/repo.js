/* =========================================================================
 * 代码仓库（浮窗 Python 的存档柜）
 * -------------------------------------------------------------------------
 * 干什么：把浮窗里写过的代码存成一条条条目，随时取回、改名、删除、导入导出。
 * 存在哪：localStorage，按命名空间分空间——未登录存本机游客空间，登录后存账号空间
 *         （键名 ml-repo:<ns>，与学习进度同一套分空间口径）。
 * 注意：  静态站没有服务端，账号空间只是本机多一套隔离的存档，不是云同步；
 *         换浏览器/换设备不会跟着走，需要搬家请用下面的「导出/导入」。
 *
 * 对外只有三个函数：openRepo(api) / closeRepo() / saveSnippet(...)。
 * api 由 enhancer 传入：{ getSource, setSource, getContext, status }。
 * ========================================================================= */

import { nsKey, progressNS } from '../learning/progress';

const REPO_KEY = 'ml-repo';
const MAX_ITEMS = 200;

function storeKey() {
  return nsKey(REPO_KEY);
}

function load() {
  if (typeof window === 'undefined') return { v: 1, items: [] };
  try {
    const v = JSON.parse(window.localStorage.getItem(storeKey()) || 'null');
    if (v && Array.isArray(v.items)) return v;
  } catch {
    /* 数据坏了：按空仓库处理，不阻断 */
  }
  return { v: 1, items: [] };
}

function save(data) {
  try {
    window.localStorage.setItem(storeKey(), JSON.stringify(data));
  } catch (e) {
    return e;
  }
  return null;
}

function newId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtSize(s) {
  const n = (s || '').length;
  return n < 1024 ? n + ' 字符' : (n / 1024).toFixed(1) + ' KB';
}

/* ---------- 对外：程序化保存（笔记本也会调） ---------- */

export function saveSnippet({ name, code, from = '', at } = {}) {
  const data = load();
  if (data.items.length >= MAX_ITEMS) return { ok: false, reason: 'full' };
  data.items.unshift({
    id: newId(),
    name: (name || '未命名').slice(0, 60),
    code: code || '',
    from: (from || '').slice(0, 80),
    at: at || Date.now(),
  });
  const err = save(data);
  if (err) return { ok: false, reason: 'quota', error: err };
  if (els && els.list) renderList();
  return { ok: true, id: data.items[0].id };
}

export function listSnippets() {
  return load().items;
}

/* ---------- 面板 ---------- */

let els = null; /* { panel, list, name, search, status } */
let apiRef = null;
let drag = null;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function build(api) {
  apiRef = api;
  const panel = el('div', 'ml-repo');
  panel.id = 'ml-repo';

  const head = el('div', 'ml-repo__head');
  const title = el('span', 'ml-repo__title', '代码仓库');
  const nsTip = el('span', 'ml-repo__ns', '');
  const btnClose = el('button', 'ml-repo__close', '×');
  btnClose.type = 'button';
  btnClose.title = '关闭（Esc）';
  head.append(title, nsTip, btnClose);

  const bar = el('div', 'ml-repo__bar');
  const nameInput = el('input', 'ml-repo__name');
  nameInput.type = 'text';
  nameInput.placeholder = '给这段代码起个名字';
  const btnSave = el('button', 'py-runner__btn', '＋ 存当前代码');
  btnSave.type = 'button';
  btnSave.title = '把浮窗编辑器里现在的代码存进仓库';
  const btnImport = el('button', 'py-runner__btn py-runner__btn--ghost', '导入');
  btnImport.type = 'button';
  btnImport.title = '从 .py/.txt 文件导入一段代码';
  const btnExport = el('button', 'py-runner__btn py-runner__btn--ghost', '导出');
  btnExport.type = 'button';
  btnExport.title = '把当前仓库导出成一个 .json 备份';
  const search = el('input', 'ml-repo__search');
  search.type = 'search';
  search.placeholder = '搜索名字/代码…';
  bar.append(nameInput, btnSave, btnImport, btnExport, search);

  const list = el('div', 'ml-repo__list');
  const foot = el('div', 'ml-repo__foot', '');
  panel.append(head, bar, list, foot);
  document.body.appendChild(panel);

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.py,.txt,text/plain,text/x-python';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const jsonInput = el('input');
  jsonInput.type = 'file';
  jsonInput.accept = '.json,application/json';
  jsonInput.style.display = 'none';
  document.body.appendChild(jsonInput);

  /* 拖动：只在头部按下，且不是按钮 */
  head.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button')) return;
    const r = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = r.left + 'px';
    panel.style.top = r.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', (ev) => {
    if (!drag || ev.buttons === 0) {
      drag = null;
      return;
    }
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    panel.style.left = Math.min(Math.max(ev.clientX - drag.dx, 8), window.innerWidth - w - 8) + 'px';
    panel.style.top = Math.min(Math.max(ev.clientY - drag.dy, 8), window.innerHeight - h - 8) + 'px';
  });
  const endDrag = () => { drag = null; };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  head.addEventListener('lostpointercapture', endDrag);

  btnClose.addEventListener('click', () => closeRepo());

  const setStatus = (s) => {
    foot.textContent = s || '';
  };

  btnSave.addEventListener('click', () => {
    const code = apiRef.getSource ? apiRef.getSource() : '';
    if (!code.trim()) {
      setStatus('编辑器是空的，没有可存的代码');
      return;
    }
    const ctx = apiRef.getContext ? apiRef.getContext() : '';
    const name = (nameInput.value || '').trim() || ctx || '我的代码';
    const r = saveSnippet({ name, code, from: ctx });
    if (!r.ok) {
      setStatus(r.reason === 'full' ? `仓库已满（上限 ${MAX_ITEMS} 条），先删几条` : '保存失败：浏览器存储写不进去');
      return;
    }
    nameInput.value = '';
    setStatus(`已存《${name}》（${fmtSize(code)}）`);
  });

  btnImport.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = saveSnippet({ name: f.name.replace(/\.(py|txt)$/i, ''), code: String(reader.result || '') });
      setStatus(r.ok ? `已导入 ${f.name}` : '导入失败');
      fileInput.value = '';
    };
    reader.readAsText(f);
  });

  btnExport.addEventListener('click', () => {
    const data = load();
    if (!data.items.length) {
      setStatus('仓库还是空的');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'math-ladder-code-repo.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(`已导出 ${data.items.length} 条`);
  });

  jsonInput.addEventListener('change', () => {
    const f = jsonInput.files && jsonInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const inc = JSON.parse(String(reader.result || '{}'));
        if (!inc || !Array.isArray(inc.items)) throw new Error('格式不对');
        const data = load();
        const seen = new Set(data.items.map((i) => i.code));
        let n = 0;
        inc.items.forEach((it) => {
          if (!it || typeof it.code !== 'string') return;
          if (seen.has(it.code)) return;
          seen.add(it.code);
          data.items.push({
            id: newId(),
            name: String(it.name || '导入').slice(0, 60),
            code: it.code,
            from: String(it.from || '').slice(0, 80),
            at: Number(it.at) || Date.now(),
          });
          n += 1;
        });
        save(data);
        renderList();
        setStatus(`导入 ${n} 条备份`);
      } catch (e2) {
        setStatus('这个文件读不出来：' + e2.message);
      }
      jsonInput.value = '';
    };
    reader.readAsText(f);
  });

  search.addEventListener('input', () => renderList());

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && panel.classList.contains('is-open')) {
      ev.stopPropagation();
      closeRepo();
    }
  });

  els = { panel, list, nameInput, search, setStatus, nsTip, jsonInput };
  return els;
}

function renderList() {
  if (!els) return;
  const data = load();
  const q = (els.search.value || '').trim().toLowerCase();
  const ns = progressNS();
  els.nsTip.textContent = ns === ':guest' ? '本机' : '账号 ' + ns.slice(1);
  els.nsTip.title =
    ns === ':guest'
      ? '存在这台浏览器（游客空间）。登录后代码会存进账号空间，两边互不干扰。'
      : `存在账号「${ns.slice(1)}」的空间里。静态站没有云同步，换设备请用导出/导入。`;

  const items = data.items.filter(
    (it) =>
      !q ||
      it.name.toLowerCase().includes(q) ||
      it.code.toLowerCase().includes(q) ||
      (it.from || '').toLowerCase().includes(q),
  );

  els.list.innerHTML = '';
  if (!data.items.length) {
    els.list.appendChild(el('p', 'ml-repo__empty', '仓库还是空的。在浮窗里写点代码，点上面的「＋ 存当前代码」就有了。'));
    return;
  }
  if (!items.length) {
    els.list.appendChild(el('p', 'ml-repo__empty', '没有匹配的代码。'));
    return;
  }

  items.forEach((it) => {
    const row = el('div', 'ml-repo__item');
    const main = el('div', 'ml-repo__item-main');
    const nameEl = el('div', 'ml-repo__item-name', it.name);
    const meta = el('div', 'ml-repo__item-meta');
    meta.append(
      el('span', '', fmtTime(it.at)),
      el('span', '', ' · ' + fmtSize(it.code)),
      it.from ? el('span', 'ml-repo__item-from', ' · ' + it.from) : null,
    );
    const preview = el('pre', 'ml-repo__item-code', it.code.split('\n').slice(0, 3).join('\n'));
    main.append(nameEl, meta, preview);

    const acts = el('div', 'ml-repo__item-acts');
    const bLoad = el('button', 'py-runner__btn', '载入');
    bLoad.type = 'button';
    bLoad.title = '装进浮窗编辑器（会覆盖当前槽位的内容）';
    const bRename = el('button', 'py-runner__btn py-runner__btn--ghost', '改名');
    bRename.type = 'button';
    const bUpdate = el('button', 'py-runner__btn py-runner__btn--ghost', '更新');
    bUpdate.type = 'button';
    bUpdate.title = '用编辑器里现在的代码覆盖这一条';
    const bDel = el('button', 'py-runner__btn py-runner__btn--ghost ml-repo__del', '删除');
    bDel.type = 'button';
    acts.append(bLoad, bRename, bUpdate, bDel);

    bLoad.addEventListener('click', () => {
      if (apiRef && apiRef.setSource) apiRef.setSource(it.code, it.name);
      els.setStatus(`已载入《${it.name}》到浮窗`);
    });
    bRename.addEventListener('click', () => {
      const next = window.prompt('新的名字', it.name);
      if (next == null) return;
      const data2 = load();
      const hit = data2.items.find((x) => x.id === it.id);
      if (hit) {
        hit.name = (next.trim() || it.name).slice(0, 60);
        save(data2);
        renderList();
      }
    });
    bUpdate.addEventListener('click', () => {
      const code = apiRef && apiRef.getSource ? apiRef.getSource() : '';
      if (!code.trim()) {
        els.setStatus('编辑器是空的');
        return;
      }
      const data2 = load();
      const hit = data2.items.find((x) => x.id === it.id);
      if (hit) {
        hit.code = code;
        hit.at = Date.now();
        save(data2);
        renderList();
        els.setStatus(`《${hit.name}》已更新`);
      }
    });
    bDel.addEventListener('click', () => {
      if (!window.confirm(`删除《${it.name}》？`)) return;
      const data2 = load();
      data2.items = data2.items.filter((x) => x.id !== it.id);
      save(data2);
      renderList();
      els.setStatus('已删除');
    });

    row.append(main, acts);
    els.list.appendChild(row);
  });
}

export function openRepo(api) {
  if (!els) build(api);
  else apiRef = api;
  const data = load();
  /* 首次打开时给个默认名字，省得每次手打 */
  if (!els.nameInput.value) {
    const ctx = api && api.getContext ? api.getContext() : '';
    els.nameInput.placeholder = ctx || '给这段代码起个名字';
  }
  renderList();
  els.setStatus(`共 ${data.items.length} 条`);
  els.panel.classList.add('is-open');
}

export function closeRepo() {
  if (els) els.panel.classList.remove('is-open');
}

export function isRepoOpen() {
  return !!(els && els.panel.classList.contains('is-open'));
}
