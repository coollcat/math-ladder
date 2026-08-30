/* ============================================================
   Fluent 雅致皮肤 · 主应用(hash 路由 SPA,侧栏 + 内容区)
   路由: #/ #/chap/{dir} #/read/{dir}/{file} #/graph
   进度: localStorage ml-ui-progress {lessonId:true}
   数据: /api/meta 一次 + /api/lesson 按需缓存
   ============================================================ */
import { mountTree } from './graph.js';
import { mountViz } from './viz.js';

/* ---------- 本地进度 ---------- */
const progress = {
  map() { try { return JSON.parse(localStorage.getItem('ml-ui-progress')) || {}; } catch { return {}; } },
  has(id) { return !!this.map()[id]; },
  set(id, done) { const m = this.map(); if (done) m[id] = true; else delete m[id]; try { localStorage.setItem('ml-ui-progress', JSON.stringify(m)); } catch { /* 忽略 */ } },
};

/* ---------- 数据层 ---------- */
let metaPromise = null;
function loadMeta() {
  if (!metaPromise) {
    metaPromise = fetch('/api/meta')
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((j) => { if (!j.ok) throw new Error(j.error || 'meta 异常'); return j; })
      .catch((e) => { metaPromise = null; throw e; });
  }
  return metaPromise;
}
const lessonCache = new Map();
function loadLesson(id) {
  if (lessonCache.has(id)) return Promise.resolve(lessonCache.get(id));
  return fetch('/api/lesson?id=' + encodeURIComponent(id))
    .then((r) => r.json().then((j) => { if (!r.ok || !j.ok) throw new Error(j.error || 'HTTP ' + r.status); return j; }))
    .then((j) => { lessonCache.set(id, j); return j; });
}

/* ---------- 索引 ---------- */
const chapByDir = new Map();
let META = null;
function buildIndex(meta) {
  chapByDir.clear();
  for (const ch of meta.chapters) chapByDir.set(ch.dir, ch);
}
/** prereq 的 lesson_id(slug 型) → 课标题 */
function lessonTitleOf(meta, pid) {
  const [d, f] = pid.split('/');
  const ch = meta.chapters.find((c) => c.slug === d);
  if (!ch) return pid;
  const les = ch.lessons.find((l) => !l.isIndex && l.id.split('/')[1].replace(/^\d+-/, '') === f);
  return les ? les.title : pid;
}

/* ---------- 小工具 ---------- */
const $ = (s, r) => (r || document).querySelector(s);
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function view() { return $('#view'); }
function setTitle(t) { document.title = t ? t + ' · 数学阶梯' : '数学阶梯 · 雅致'; }
function setCrumbs(items) {
  const box = $('#crumbs');
  box.textContent = '';
  items.forEach((it, i) => {
    if (i) box.appendChild(el('span', 'fc-sep', '›'));
    if (it.href && i < items.length - 1) {
      const a = el('a', '', it.text);
      a.href = it.href;
      box.appendChild(a);
    } else box.appendChild(el('span', 'fc-cur', it.text));
  });
}
function closeDrawer() {
  const side = $('#side'), bd = $('#side-backdrop');
  if (side) side.classList.remove('is-open');
  if (bd) bd.hidden = true;
}

/* ---------- Reveal 高光(--mx/--my 跟随指针) ---------- */
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest('.fl-reveal');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});

/* ---------- 路由 ---------- */
let seq = 0; // 异步竞态守卫
let tree = null;

async function route() {
  const hash = location.hash || '#/';
  const mySeq = ++seq;
  if (tree) { tree.destroy(); tree = null; }
  closeDrawer();
  const m = hash.match(/^#\/read\/([^/]+)\/(.+)$/);
  if (m) return renderRead(m[1], m[2], mySeq);
  const c = hash.match(/^#\/chap\/([^/]+)$/);
  if (c) return renderChap(c[1], mySeq);
  if (hash === '#/graph') return renderGraph(mySeq);
  return renderHome(mySeq);
}
function scrollToTop() { window.scrollTo({ top: 0 }); }

/* ---------- 侧栏 ---------- */
async function buildSidebar() {
  const meta = META || await loadMeta().catch(() => null);
  if (!meta) return;
  META = meta;
  buildIndex(meta);
  const nav = $('#side-nav');
  nav.textContent = '';
  const curHash = location.hash;
  for (const ch of meta.chapters) {
    const item = el('div', 'fl-side-chap');
    const head = el('div', 'sc-head');
    const arrow = el('span', 'sc-arrow', '▶');
    const doneN = ch.lessons.filter((l) => progress.has(l.id)).length;
    head.append(arrow, el('span', '', ch.title));
    if (doneN) head.appendChild(el('span', 'sc-done', doneN + '/' + ch.lessons.length));
    head.addEventListener('click', () => item.classList.toggle('is-open'));
    item.appendChild(head);
    const box = el('div', 'fl-side-lessons');
    for (const l of ch.lessons) {
      const a = el('a', progress.has(l.id) ? 'is-done' : '');
      a.href = '#/read/' + l.id;
      a.appendChild(el('span', 'sl-dot'));
      const sp = el('span', '', l.title);
      sp.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      a.appendChild(sp);
      if (curHash === '#/read/' + l.id) {
        a.classList.add('is-cur');
        item.classList.add('is-open');
      }
      box.appendChild(a);
    }
    item.appendChild(box);
    nav.appendChild(item);
  }
}

/* ---------- 首页 ---------- */
async function renderHome(mySeq) {
  setTitle('');
  setCrumbs([{ text: '首页' }]);
  const v = view();
  let meta;
  try {
    meta = await loadMeta();
    if (mySeq !== seq) return;
    META = meta; buildIndex(meta);
  } catch (e) { return errorBox(v, '元数据加载失败', e, () => { metaPromise = null; route(); }); }
  await buildSidebar();

  v.className = 'fl-main fl-view-narrow';
  v.textContent = '';
  const totalDone = meta.chapters.reduce((a, c) => a + c.lessons.filter((l) => progress.has(l.id)).length, 0);

  const hero = el('section', 'fl-card fl-reveal home-hero');
  hero.appendChild(el('div', 'hh-kicker', 'INTERACTIVE MATH TUTORIAL'));
  hero.appendChild(el('h1', '', '数学阶梯'));
  hero.appendChild(el('p', '', '从 1+1 一路爬升到傅里叶变换的交互式数学教程。先暴力算,再猜规律,再(选读)证明——每一步都踩得实。'));
  const acts = el('div', 'hh-actions');
  const gb = el('button', 'fl-btn is-accent');
  gb.type = 'button';
  gb.textContent = '⛶ 打开知识图谱';
  gb.addEventListener('click', () => { location.hash = '#/graph'; });
  acts.appendChild(gb);
  hero.appendChild(acts);
  const stats = el('div', 'home-stats');
  const mk = (num, label) => {
    const d = el('div', 'hs-item');
    d.appendChild(el('b', '', String(num)));
    d.appendChild(el('span', '', label));
    return d;
  };
  stats.append(
    mk(meta.stats.chapters, '章节'),
    mk(meta.stats.lessons, '课程'),
    mk(meta.stats.edges, '先修关系'),
    mk(totalDone + ' / ' + meta.stats.lessons, '我的进度'),
  );
  hero.appendChild(stats);
  v.appendChild(hero);

  // 卷册分组
  meta.volumes.forEach((vol, vi) => {
    const chs = meta.chapters.filter((c) => c.volume === vi);
    if (!chs.length) return;
    const done = chs.reduce((a, c) => a + c.lessons.filter((l) => progress.has(l.id)).length, 0);
    const total = chs.reduce((a, c) => a + c.lessons.length, 0);
    const block = el('section', 'vol-block');
    const head = el('div', 'vol-head');
    head.appendChild(el('span', 'vh-n', vol.n));
    head.appendChild(el('h2', '', vol.title));
    head.appendChild(el('span', 'vh-status', vol.statusLabel));
    head.appendChild(el('span', 'vh-prog', done + ' / ' + total));
    block.appendChild(head);

    const grid = el('div', 'chap-grid');
    for (const ch of chs) {
      const d = ch.lessons.filter((l) => progress.has(l.id)).length;
      const card = el('a', 'fl-card fl-reveal hoverable chap-card');
      card.href = '#/chap/' + ch.dir;
      card.appendChild(el('span', 'cc-no', '第 ' + String(ch.n).padStart(2, '0') + ' 章'));
      card.appendChild(el('span', 'cc-title', ch.title));
      if (ch.desc) card.appendChild(el('p', 'cc-desc', ch.desc));
      const metaRow = el('div', 'cc-meta');
      const bar = el('span', 'cc-bar');
      const bi = el('i');
      bi.style.width = (ch.lessons.length ? d * 100 / ch.lessons.length : 0) + '%';
      bar.appendChild(bi);
      metaRow.append(bar, el('span', '', ch.lessons.length + ' 课'));
      if (d) metaRow.appendChild(el('span', 'cc-done', '✓ ' + d));
      card.appendChild(metaRow);
      grid.appendChild(card);
    }
    block.appendChild(grid);
    v.appendChild(block);
  });
  scrollToTop();
}

/* ---------- 章页 ---------- */
async function renderChap(dir, mySeq) {
  const v = view();
  let meta;
  try {
    meta = await loadMeta();
    if (mySeq !== seq) return;
    META = meta; buildIndex(meta);
  } catch (e) { return errorBox(v, '元数据加载失败', e, () => { metaPromise = null; route(); }); }
  const ch = chapByDir.get(dir);
  if (!ch) { location.hash = '#/'; return; }
  setTitle(ch.title);
  setCrumbs([{ text: '首页', href: '#/' }, { text: ch.title }]);
  v.className = 'fl-main fl-view-narrow';
  v.textContent = '';

  const hero = el('section', 'fl-card chap-hero');
  hero.appendChild(el('div', 'ch-no', '第 ' + String(ch.n).padStart(2, '0') + ' 章'));
  hero.appendChild(el('h1', '', ch.title));
  if (ch.desc) hero.appendChild(el('p', '', ch.desc));
  v.appendChild(hero);

  const list = el('section', 'fl-card lesson-card');
  for (const l of ch.lessons) {
    const row = el('a', 'lesson-row');
    row.href = '#/read/' + l.id;
    row.appendChild(el('span', 'lr-no', l.isIndex ? '◎' : String(l.num).padStart(2, '0')));
    row.appendChild(el('span', 'lr-title', l.title));
    if (!l.isIndex && l.prereqs && l.prereqs.length) {
      row.appendChild(el('span', 'lr-pre', '先修 ×' + l.prereqs.length));
    }
    if (progress.has(l.id)) row.appendChild(el('span', 'lr-done', '✓ 已学'));
    list.appendChild(row);
  }
  v.appendChild(list);
  buildSidebar();
  scrollToTop();
}

/* ---------- 阅读页 ---------- */
async function renderRead(dir, file, mySeq) {
  const v = view();
  const id = dir + '/' + file;
  let data;
  try { data = await loadLesson(id); }
  catch (e) { return errorBox(v, '课程加载失败', e, () => { lessonCache.delete(id); route(); }); }
  if (mySeq !== seq) return;
  setTitle(data.title);
  v.className = 'fl-main fl-view-narrow';
  v.textContent = '';

  let meta = META;
  try { meta = META = meta || await loadMeta(); buildIndex(meta); } catch { /* 侧栏失败不阻塞阅读 */ }

  // 面包屑
  setCrumbs([
    { text: '首页', href: '#/' },
    { text: data.chapter.title, href: '#/chap/' + data.dir },
    { text: data.title },
  ]);

  // 头部
  const head = el('header', 'fl-card fl-reveal read-head');
  head.appendChild(el('h1', '', data.title));
  if (data.description) head.appendChild(el('p', 'rh-desc', data.description));
  const metaBox = el('div', 'rh-meta');
  metaBox.appendChild(el('span', 'badge is-accent', data.chapter.title));
  const it = data.interactive || {};
  if (it.quiz) metaBox.appendChild(el('span', 'badge', '测验 ×' + it.quiz));
  if (it.exercise) metaBox.appendChild(el('span', 'badge', '判题练习 ×' + it.exercise));
  if (it.viz) metaBox.appendChild(el('span', 'badge', '可视化 ×' + it.viz));
  const doneBtn = el('button', 'fl-btn' + (progress.has(id) ? '' : ' is-accent'));
  doneBtn.type = 'button';
  doneBtn.textContent = progress.has(id) ? '✓ 已学完 · 点击取消' : '标记为已学完';
  doneBtn.addEventListener('click', () => {
    const now = !progress.has(id);
    progress.set(id, now);
    doneBtn.textContent = now ? '✓ 已学完 · 点击取消' : '标记为已学完';
    doneBtn.classList.toggle('is-accent', !now);
    buildSidebar();
  });
  metaBox.appendChild(doneBtn);
  head.appendChild(metaBox);
  v.appendChild(head);

  // 前置课
  if (data.prereqs && data.prereqs.length) {
    const pb = el('div', 'fl-card prereq-card');
    pb.appendChild(el('span', 'pc-t', '前置知识'));
    for (const p of data.prereqs) {
      const a = el('a', '', p.title);
      a.href = '#/read/' + p.id;
      pb.appendChild(a);
    }
    v.appendChild(pb);
  }

  // 正文(服务端已渲染)
  const body = el('article', 'fl-card lesson-body');
  body.innerHTML = data.html;
  v.appendChild(body);
  mountViz(body); // viz 卡片就地渲染交互组件

  // 上一课 / 下一课
  const nav = el('nav', 'read-nav');
  if (data.prev) {
    const a = el('a', 'fl-card fl-reveal rn-prev');
    a.href = '#/read/' + data.prev.id;
    a.appendChild(el('span', '', '‹ 上一篇'));
    a.appendChild(document.createTextNode(data.prev.title));
    nav.appendChild(a);
  } else nav.appendChild(el('div'));
  if (data.next) {
    const a = el('a', 'fl-card fl-reveal rn-next');
    a.href = '#/read/' + data.next.id;
    a.appendChild(el('span', '', '下一篇 ›'));
    a.appendChild(document.createTextNode(data.next.title));
    nav.appendChild(a);
  } else nav.appendChild(el('div'));
  v.appendChild(nav);

  buildSidebar();
  scrollToTop();
}

/* ---------- 测验交互(事件委托) ---------- */
document.addEventListener('click', (e) => {
  const opt = e.target.closest('.mlq-opt');
  if (!opt) return;
  const card = opt.closest('.ml-quiz');
  if (!card || card.classList.contains('is-done')) return;
  let okIdx = -1;
  try { okIdx = parseInt(atob(card.dataset.qk || ''), 10); } catch { okIdx = -1; }
  const opts = [...card.querySelectorAll('.mlq-opt')];
  const idx = opts.indexOf(opt);
  if (idx === okIdx) {
    opt.classList.add('is-right');
    card.classList.add('is-done');
    const expl = card.querySelector('.ml-expl');
    if (expl) expl.hidden = false;
  } else {
    opt.classList.remove('is-wrong');
    void opt.offsetWidth; // 重启抖动动画
    opt.classList.add('is-wrong');
    setTimeout(() => opt.classList.remove('is-wrong'), 600);
  }
});

/* ---------- 图谱页 ---------- */
async function renderGraph(mySeq) {
  setTitle('知识图谱');
  setCrumbs([{ text: '首页', href: '#/' }, { text: '知识图谱' }]);
  const v = view();
  let meta;
  try {
    meta = await loadMeta();
    if (mySeq !== seq) return;
    META = meta; buildIndex(meta);
  } catch (e) { return errorBox(v, '元数据加载失败', e, () => { metaPromise = null; route(); }); }
  v.className = 'fl-main';
  v.textContent = '';
  const head = el('section', 'fl-card chap-hero');
  head.style.marginBottom = '14px';
  head.appendChild(el('h1', '', '课级知识图谱'));
  head.appendChild(el('p', '', meta.stats.lessons + ' 门课 · ' + meta.stats.edges + ' 条先修关系。点击节点聚焦: 绿 = 先修,橙 = 托起;拖拽平移,滚轮缩放。'));
  v.appendChild(head);

  const shell = el('section', 'graph-shell');
  v.appendChild(shell);
  const doneSet = new Set();
  for (const ch of meta.chapters) for (const l of ch.lessons) if (progress.has(l.id)) doneSet.add(l.id);
  tree = mountTree(shell, {
    flat: meta.flat, edges: meta.edges,
    onOpen: (l) => { location.hash = '#/read/' + l.id; },
  });
  tree.markDone(doneSet);
}

/* ---------- 错误盒 ---------- */
function errorBox(v, title, err, retry) {
  v.className = 'fl-main fl-view-narrow';
  v.textContent = '';
  const box = el('section', 'fl-card err-box');
  box.appendChild(el('h2', '', '出了点问题 · ' + title));
  box.appendChild(el('p', '', String((err && err.message) || err)));
  const b = el('button', 'fl-btn is-accent');
  b.type = 'button';
  b.textContent = '重试';
  b.addEventListener('click', retry);
  box.appendChild(b);
  v.appendChild(box);
}

/* ---------- 全局搜索 ---------- */
function initSearch() {
  const input = $('#search-input');
  const drop = $('#search-drop');
  if (!input || !drop) return;
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (!q || !META) { drop.hidden = true; return; }
      drop.textContent = '';
      let hits = 0;
      for (const ch of META.chapters) {
        const les = ch.lessons.filter((l) => l.title.includes(q));
        if (!les.length && !ch.title.includes(q)) continue;
        drop.appendChild(el('div', 'sd-chap', ch.title));
        for (const l of (ch.title.includes(q) ? ch.lessons : les)) {
          if (hits >= 60) break;
          const a = el('a', 'sd-item', (l.isIndex ? '◎ ' : '') + l.title);
          a.href = '#/read/' + l.id;
          a.addEventListener('click', () => { drop.hidden = true; input.value = ''; });
          drop.appendChild(a);
          hits++;
        }
        if (hits >= 60) break;
      }
      if (!hits) drop.appendChild(el('div', 'sd-empty', '没有匹配的课程'));
      else if (hits >= 60) drop.appendChild(el('div', 'sd-more', '结果过多,仅显示前 60 条'));
      drop.hidden = false;
    }, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = drop.querySelector('a.sd-item');
      if (first) { drop.hidden = true; location.hash = first.getAttribute('href'); input.value = ''; }
    } else if (e.key === 'Escape') { drop.hidden = true; input.blur(); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.fl-search')) drop.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

/* ---------- 启动 ---------- */
initSearch();
addEventListener('hashchange', route);
$('#menu-btn').addEventListener('click', () => {
  const side = $('#side'), bd = $('#side-backdrop');
  const open = side.classList.toggle('is-open');
  bd.hidden = !open;
});
$('#side-backdrop').addEventListener('click', closeDrawer);
loadMeta().then((m) => { META = m; buildIndex(m); buildSidebar(); }).catch(() => { /* 页面级会报错重试 */ });
route();
