/* ============================================================
   HUD 科幻皮肤 · 主应用(hash 路由 SPA)
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
const lessonById = new Map(); // id -> { lesson, chapter }
let flatAll = [];
function buildIndex(meta) {
  chapByDir.clear(); lessonById.clear(); flatAll = [];
  for (const ch of meta.chapters) {
    chapByDir.set(ch.dir, ch);
    for (const l of ch.lessons) {
      lessonById.set(l.id, { lesson: l, chapter: ch });
      if (!l.isIndex) flatAll.push({ id: l.id, title: l.title, chDir: ch.dir, chTitle: ch.title });
    }
  }
}
/** prereq 的 lesson_id(slug 型) → 课标题 */
function lessonTitleOf(pid) {
  const [d, f] = pid.split('/');
  const dir = [...chapByDir.keys()].find((k) => k.replace(/^\d+-/, '') === d);
  if (!dir) return pid;
  const ch = chapByDir.get(dir);
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
function setTitle(t) { document.title = t ? t + ' · 数学阶梯 HUD' : '数学阶梯 · HUD'; }

/* ---------- 顶部读数 ---------- */
function tickClock() {
  const c = $('#ro-clock');
  if (c) c.textContent = new Date().toTimeString().slice(0, 8);
}
setInterval(tickClock, 1000);
function refreshReadouts(meta) {
  if (!meta) return;
  const done = flatAll.filter((l) => progress.has(l.id)).length;
  const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  set('#ro-chap', String(meta.stats.chapters).padStart(2, '0'));
  set('#ro-lesson', String(meta.stats.lessons).padStart(3, '0'));
  set('#ro-done', String(done).padStart(3, '0'));
  set('#ro-pct', (done * 100 / Math.max(1, meta.stats.lessons)).toFixed(1) + '%');
}

/* ---------- 路由 ---------- */
let META = null;
let seq = 0; // 异步竞态守卫
let tree = null; // 图谱实例

async function route() {
  const hash = location.hash || '#/';
  const mySeq = ++seq;
  if (tree) { tree.destroy(); tree = null; }
  const m = hash.match(/^#\/read\/([^/]+)\/(.+)$/);
  if (m) return renderRead(m[1], m[2], mySeq);
  const c = hash.match(/^#\/chap\/([^/]+)$/);
  if (c) return renderChap(c[1], mySeq);
  if (hash === '#/graph') return renderGraph(mySeq);
  return renderHome(mySeq);
}
function setActiveNav(name) {
  document.querySelectorAll('.top-nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === name));
  document.body.dataset.page = name;
}
function scrollToTop() { window.scrollTo({ top: 0 }); }

/* ---------- 首页 ---------- */
async function renderHome(mySeq) {
  setActiveNav('home');
  setTitle('');
  const v = view();
  try {
    META = await loadMeta();
    if (mySeq !== seq) return;
    buildIndex(META);
    refreshReadouts(META);
  } catch (e) { return errorBox(v, '元数据加载失败', e, () => { metaPromise = null; route(); }); }

  v.textContent = '';
  const hero = el('section', 'panel hero');
  hero.innerHTML = `
    <div class="hero-line">SYSTEM ONLINE // ${META.stats.chapters} CHAPTERS · ${META.stats.lessons} LESSONS</div>
    <h1>数学<em>阶梯</em></h1>
    <p>从 1+1 一路爬升到傅里叶变换的交互式数学教程。每一步都踩得实,每一级都看得见。</p>`;
  const acts = el('div', 'hero-actions');
  const gbtn = el('button', 'hud-btn');
  gbtn.type = 'button';
  const gs = el('span', '', '⛶ 打开知识图谱');
  gbtn.appendChild(gs);
  gbtn.addEventListener('click', () => { location.hash = '#/graph'; });
  acts.appendChild(gbtn);
  hero.appendChild(acts);
  v.appendChild(hero);

  // 卷册分组
  for (const vol of META.volumes) {
    const chs = META.chapters.filter((c) => c.volume === META.volumes.indexOf(vol));
    if (!chs.length) continue;
    const sec = el('section', 'vol-section');
    const done = chs.reduce((acc, c) => acc + c.lessons.filter((l) => progress.has(l.id)).length, 0);
    const total = chs.reduce((acc, c) => acc + c.lessons.length, 0);
    const vt = el('h2', 'vol-title');
    const n = el('span', 'vt-n', vol.n);
    const t = el('span', '', vol.title + ' · ' + vol.statusLabel);
    const range = el('span', 'vt-range', vol.range + ' // ' + done + '/' + total);
    const bar = el('span', 'vt-bar');
    const bi = el('i');
    bi.style.width = (total ? done * 100 / total : 0) + '%';
    bar.appendChild(bi);
    vt.append(n, t, range, bar);
    sec.appendChild(vt);

    const grid = el('div', 'chap-grid');
    for (const ch of chs) {
      const d = ch.lessons.filter((l) => progress.has(l.id)).length;
      const card = el('a', 'panel chap-card');
      card.href = '#/chap/' + ch.dir;
      const no = el('span', 'cc-no', 'CH.' + String(ch.n).padStart(2, '0'));
      const title = el('span', 'cc-title', ch.title);
      const desc = el('p', 'cc-desc', ch.desc || '');
      const meta = el('div', 'cc-meta');
      const dn = el('span', 'cc-done', d ? '✓' + d : '');
      const cnt = el('span', '', ch.lessons.length + ' 课');
      const mini = el('span', 'cc-mini');
      const mi = el('i');
      mi.style.width = (ch.lessons.length ? d * 100 / ch.lessons.length : 0) + '%';
      mini.appendChild(mi);
      meta.append(dn, cnt, mini);
      card.append(no, title, desc, meta);
      grid.appendChild(card);
    }
    sec.appendChild(grid);
    v.appendChild(sec);
  }
  scrollToTop();
}

/* ---------- 章页 ---------- */
async function renderChap(dir, mySeq) {
  setActiveNav('chap');
  const v = view();
  try {
    META = await loadMeta();
    if (mySeq !== seq) return;
    buildIndex(META);
    refreshReadouts(META);
  } catch (e) { return errorBox(v, '元数据加载失败', e, () => { metaPromise = null; route(); }); }
  const ch = chapByDir.get(dir);
  if (!ch) { location.hash = '#/'; return; }
  setTitle(ch.title);
  v.textContent = '';

  const head = el('section', 'panel chap-head');
  const no = el('div', 'ch-no', 'CHAPTER ' + String(ch.n).padStart(2, '0'));
  const h1 = el('h1', '', ch.title);
  head.append(no, h1);
  if (ch.desc) head.appendChild(el('p', '', ch.desc));
  v.appendChild(head);

  const list = el('section', 'panel lesson-list');
  for (const l of ch.lessons) {
    const row = el('a', 'lesson-row' + (l.isIndex ? ' is-index' : ''));
    row.href = '#/read/' + l.id;
    const n = el('span', 'lr-no', l.isIndex ? '◎' : String(l.num).padStart(2, '0'));
    const t = el('span', 'lr-title', l.title);
    row.append(n, t);
    if (!l.isIndex && l.prereqs && l.prereqs.length) {
      row.appendChild(el('span', 'lr-flag is-amber', '先修×' + l.prereqs.length));
    }
    if (progress.has(l.id)) row.appendChild(el('span', 'lr-done', '✓ 已学'));
    list.appendChild(row);
  }
  v.appendChild(list);
  scrollToTop();
}

/* ---------- 阅读页 ---------- */
async function renderRead(dir, file, mySeq) {
  setActiveNav('read');
  const v = view();
  const id = dir + '/' + file;
  let data;
  try { data = await loadLesson(id); }
  catch (e) { return errorBox(v, '课程加载失败', e, () => { lessonCache.delete(id); route(); }); }
  if (mySeq !== seq) return;
  setTitle(data.title);
  v.textContent = '';

  const wrap = el('div', 'read-wrap');
  const main = el('article', 'read-main');
  wrap.appendChild(main);
  v.appendChild(wrap);

  // 面包屑
  const crumbs = el('nav', 'crumbs');
  const home = el('a', '', '首页'); home.href = '#/';
  const s1 = el('span', 'c-sep', '▸');
  const chap = el('a', '', data.chapter.title); chap.href = '#/chap/' + data.dir;
  const s2 = el('span', 'c-sep', '▸');
  const cur = el('span', 'c-cur', data.title);
  crumbs.append(home, s1, chap, s2, cur);
  main.appendChild(crumbs);

  // 头部
  const head = el('header', 'panel read-head');
  const h1 = el('h1', '', data.title);
  head.appendChild(h1);
  if (data.description) head.appendChild(el('p', 'rh-desc', data.description));
  const metaBox = el('div', 'rh-meta');
  const chB = el('span', 'badge is-cyan', data.chapter.title);
  metaBox.appendChild(chB);
  const it = data.interactive || {};
  if (it.quiz) metaBox.appendChild(el('span', 'badge is-amber', '测验×' + it.quiz));
  if (it.exercise) metaBox.appendChild(el('span', 'badge is-amber', '练习×' + it.exercise));
  if (it.viz) metaBox.appendChild(el('span', 'badge', '可视化×' + it.viz));
  const doneBtn = el('button', 'hud-btn' + (progress.has(id) ? ' is-amber' : ''));
  doneBtn.type = 'button';
  const dspan = el('span', '', progress.has(id) ? '✓ 已学完 · 点击取消' : '□ 标记已学完');
  doneBtn.appendChild(dspan);
  doneBtn.addEventListener('click', () => {
    const now = !progress.has(id);
    progress.set(id, now);
    dspan.textContent = now ? '✓ 已学完 · 点击取消' : '□ 标记已学完';
    doneBtn.classList.toggle('is-amber', now);
    loadMeta().then((mt) => refreshReadouts(mt)).catch(() => { /* 忽略 */ });
  });
  metaBox.appendChild(doneBtn);
  head.appendChild(metaBox);
  main.appendChild(head);

  // 前置课
  if (data.prereqs && data.prereqs.length) {
    const pb = el('div', 'panel prereq-box');
    pb.appendChild(el('div', 'pb-title', '▣ 前置知识'));
    const pl = el('div', 'pb-list');
    for (const p of data.prereqs) {
      const a = el('a', '', p.title);
      a.href = '#/read/' + p.id;
      pl.appendChild(a);
    }
    pb.appendChild(pl);
    main.appendChild(pb);
  }

  // 正文(服务端已渲染好 HTML)
  const body = el('div', 'panel lesson-body');
  body.id = 'lesson-body';
  body.innerHTML = data.html;
  main.appendChild(body);
  mountViz(body); // viz 卡片就地渲染交互组件

  // 上一课 / 下一课
  const nav = el('nav', 'read-nav');
  if (data.prev) {
    const a = el('a', 'rn-prev'); a.href = '#/read/' + data.prev.id;
    a.appendChild(el('span', '', '◂ PREV'));
    a.appendChild(document.createTextNode(data.prev.title));
    nav.appendChild(a);
  } else nav.appendChild(el('div'));
  if (data.next) {
    const a = el('a', 'rn-next'); a.href = '#/read/' + data.next.id;
    a.appendChild(el('span', '', 'NEXT ▸'));
    a.appendChild(document.createTextNode(data.next.title));
    nav.appendChild(a);
  } else nav.appendChild(el('div'));
  main.appendChild(nav);

  // 主站跳转提示(静态阅读器不含浮窗交互的完整版)
  if (it.exercise || it.viz) {
    const tip = el('p', '', '');
    tip.style.cssText = 'margin-top:18px;font-size:12.5px;color:var(--ink-faint)';
    tip.textContent = '// 提示: 判题练习与可视化组件可在浮窗中直接完成;需要完整体验可访问主站对应页面(卡片右上角 ↗)。';
    main.appendChild(tip);
  }
  scrollToTop();
}

/* ---------- 测验交互(事件委托,一次绑定) ---------- */
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
  setActiveNav('graph');
  setTitle('知识图谱');
  const v = view();
  let meta;
  try {
    meta = await loadMeta();
    if (mySeq !== seq) return;
    buildIndex(meta);
  } catch (e) { return errorBox(v, '元数据加载失败', e, () => { metaPromise = null; route(); }); }
  refreshReadouts(meta);
  v.textContent = '';
  const head = el('section', 'panel chap-head');
  head.style.marginBottom = '14px';
  head.appendChild(el('div', 'ch-no', 'KNOWLEDGE MAP // ' + meta.stats.lessons + ' NODES · ' + meta.stats.edges + ' EDGES'));
  head.appendChild(el('h1', '', '课级知识图谱'));
  head.appendChild(el('p', '', '点击节点聚焦先修关系(绿=先修,橙=托起);拖拽平移,滚轮缩放;再次点击或「进入课程」直达。'));
  v.appendChild(head);

  const shell = el('section', 'panel graph-shell');
  v.appendChild(shell);
  const doneSet = new Set(flatAll.filter((l) => progress.has(l.id)).map((l) => l.id));
  tree = mountTree(shell, {
    flat: meta.flat, edges: meta.edges,
    onOpen: (l) => { location.hash = '#/read/' + l.id; },
  });
  tree.markDone(doneSet);
}

/* ---------- 错误盒 ---------- */
function errorBox(v, title, err, retry) {
  v.textContent = '';
  const box = el('section', 'panel err-box');
  box.appendChild(el('h2', '', '⚠ ' + title));
  box.appendChild(el('p', '', String(err && err.message || err)));
  const b = el('button', 'hud-btn');
  b.type = 'button';
  const s = el('span', '', '↻ 重试');
  b.appendChild(s);
  b.addEventListener('click', retry);
  box.appendChild(b);
  v.appendChild(box);
}

/* ---------- 全局搜索 ---------- */
function initSearch() {
  const input = $('#search-input');
  const drop = $('#search-drop');
  if (!input || !drop) return;
  let t = 0;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = input.value.trim();
      if (!q || !META) { drop.hidden = true; return; }
      drop.textContent = '';
      let hits = 0;
      for (const ch of META.chapters) {
        const les = ch.lessons.filter((l) => l.title.includes(q));
        const chapHit = ch.title.includes(q);
        if (!les.length && !chapHit) continue;
        const hd = el('div', 'sd-chap', 'CH.' + String(ch.n).padStart(2, '0') + ' ' + ch.title);
        drop.appendChild(hd);
        for (const l of (chapHit ? ch.lessons : les)) {
          if (hits >= 60) break;
          const a = el('a', 'sd-item', (l.isIndex ? '◎ ' : String(l.num).padStart(2, '0') + ' ') + l.title);
          a.href = '#/read/' + l.id;
          a.addEventListener('click', () => { drop.hidden = true; input.value = ''; });
          drop.appendChild(a);
          hits++;
        }
        if (hits >= 60) break;
      }
      if (!hits) drop.appendChild(el('div', 'sd-empty', '// 未检索到匹配课程'));
      else if (hits >= 60) drop.appendChild(el('div', 'sd-more', '// 结果过多,已截断至 60 条'));
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
    if (!e.target.closest('.hud-search')) drop.hidden = true;
  });
}

/* ---------- 背景: 星野 + 网格地平线(节流绘制) ---------- */
function initBackground() {
  const cv = $('#bg-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [], W = 0, H = 0, t = 0, raf = 0, last = 0;
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.75,
      r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2, sp: Math.random() * 0.9 + 0.2,
    }));
  }
  function draw(ts) {
    raf = requestAnimationFrame(draw);
    if (ts - last < 50) return; // 20fps 节流,省电
    last = ts;
    t += 0.02;
    ctx.clearRect(0, 0, W, H);
    // 星野
    for (const s of stars) {
      const a = 0.25 + 0.35 * Math.sin(t * s.sp + s.tw);
      ctx.fillStyle = `rgba(140,220,255,${a.toFixed(3)})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    // 网格地平线
    ctx.strokeStyle = 'rgba(34,211,238,0.07)';
    ctx.lineWidth = 1;
    const hy = H * 0.82;
    for (let i = 0; i < 14; i++) {
      const p = ((i / 14 + (t * 0.012) % (1 / 14)) % 1);
      const y = hy + p * p * (H - hy);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = -9; i <= 9; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 40, hy);
      ctx.lineTo(W / 2 + i * W * 0.16, H);
      ctx.stroke();
    }
  }
  addEventListener('resize', resize);
  resize();
  if (reduced) { // 静态一帧
    draw(0); cancelAnimationFrame(raf);
  } else {
    raf = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    });
  }
}

/* ---------- 启动 ---------- */
initBackground();
initSearch();
tickClock();
addEventListener('hashchange', route);
loadMeta().then((m) => { buildIndex(m); refreshReadouts(m); }).catch(() => { /* 首页会再报错重试 */ });
route();
