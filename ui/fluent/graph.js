/* ============================================================
   Fluent 皮肤 · 课级知识树画布(自包含模块)
   用法: const t = mountTree(container, { flat, edges, onOpen });
         t.focus(id) / t.clear() / t.fitAll() / t.markDone(set) / t.destroy()
   - 最长先修链定层级,同层等距防碰撞,逐层水平居中
   - 入场逐层生长动画(1.4s 后 delay 统一清零)
   - 点击节点 = 聚焦: 上/下闭包着色,无关节点淡出,可见层重排
   - 拖拽平移 / 滚轮缩放 / 双指捏合
   ============================================================ */

const COL_W = 190;
const LEVEL_H = 112;
const TOP_PAD = 40;
const MIN_K = 0.3;
const MAX_K = 2;
const SETTLE_MS = 1400;

export function mountTree(container, { flat, edges, onOpen }) {
  /* ---------- 层级与邻接 ---------- */
  // edges: [i, j] 表示 j 是 i 的先修(依赖方向 i → j)
  const up = flat.map(() => []);
  const down = flat.map(() => []);
  for (const [i, j] of edges) { up[i].push(j); down[j].push(i); }

  const level = new Array(flat.length).fill(-1);
  function lv(i, stack) {
    if (level[i] >= 0) return level[i];
    if (stack.has(i)) return 0; // 环防护
    stack.add(i);
    const l = up[i].length ? Math.max(...up[i].map((p) => lv(p, stack))) + 1 : 0;
    stack.delete(i);
    level[i] = l;
    return l;
  }
  for (let i = 0; i < flat.length; i++) lv(i, new Set());
  const maxLevel = Math.max(...level);

  /* ---------- 布局 ---------- */
  const pos = flat.map(() => ({ x: 0, y: 0 }));
  function layoutOf(ids) {
    const groups = new Map();
    for (const i of ids) {
      const l = level[i];
      if (!groups.has(l)) groups.set(l, []);
      groups.get(l).push(i);
    }
    const out = new Map();
    for (const [l, arr] of groups) {
      const w = (arr.length - 1) * COL_W;
      arr.forEach((idx, kk) => out.set(idx, { x: kk * COL_W - w / 2, y: TOP_PAD + l * LEVEL_H }));
    }
    return out;
  }
  function applyLayout(map) {
    for (const [idx, p] of map) { pos[idx].x = p.x; pos[idx].y = p.y; }
  }
  applyLayout(layoutOf(flat.map((_, i) => i)));

  /* ---------- DOM ---------- */
  container.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'graph-toolbar';
  toolbar.innerHTML = `
    <button type="button" class="fl-btn" data-act="fit">⤢ 全览</button>
    <button type="button" class="fl-btn" data-act="clear">清除聚焦</button>
    <button type="button" class="fl-btn" data-act="grow">↻ 重播生长</button>`;
  container.appendChild(toolbar);

  const vp = document.createElement('div');
  vp.style.cssText = 'position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab';
  const canvas = document.createElement('div');
  canvas.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform';
  vp.appendChild(canvas);
  container.appendChild(vp);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'g-svg');
  canvas.appendChild(svg);

  const edgeEls = edges.map(([i, j]) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('class', 'g-edge');
    svg.appendChild(p);
    return { el: p, i, j };
  });

  const nodeEls = flat.map((lesson, i) => {
    const n = document.createElement('button');
    n.type = 'button';
    n.className = 'g-node';
    n.textContent = lesson.title;
    n.dataset.idx = String(i);
    canvas.appendChild(n);
    return n;
  });

  const info = document.createElement('div');
  info.className = 'graph-info';
  container.appendChild(info);

  /* ---------- 视图变换 ---------- */
  let k = 1, tx = 0, ty = 0;
  let raf = 0;
  function apply() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      canvas.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;
      const W = Math.max(...pos.map((p) => p.x)) + 300, H = TOP_PAD + (maxLevel + 1) * LEVEL_H + 120;
      svg.setAttribute('width', String(Math.max(W, 10)));
      svg.setAttribute('height', String(Math.max(H, 10)));
      for (const e of edgeEls) {
        const a = pos[e.j], b = pos[e.i]; // 先修 → 依赖
        const y1 = a.y + 18, y2 = b.y - 18;
        e.el.setAttribute('d', `M ${a.x} ${y1} C ${a.x} ${(y1 + y2) / 2}, ${b.x} ${(y1 + y2) / 2}, ${b.x} ${y2}`);
      }
      for (let i = 0; i < nodeEls.length; i++) {
        nodeEls[i].style.left = pos[i].x + 'px';
        nodeEls[i].style.top = pos[i].y + 'px';
        nodeEls[i].style.transform = 'translate(-50%,-50%)';
      }
    });
  }

  function fitAll() {
    const W = vp.clientWidth, H = vp.clientHeight;
    const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
    const minX = Math.min(...xs) - 110, maxX = Math.max(...xs) + 110;
    const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 60;
    k = Math.min(MAX_K, Math.max(MIN_K, Math.min(W / (maxX - minX), H / (maxY - minY))));
    tx = (W - (minX + maxX) * k) / 2;
    ty = 24 + (H - (minY + maxY) * k) / 2;
    apply();
  }

  /* ---------- 交互: 拖拽 / 缩放 / 捏合 ---------- */
  let drag = null, pinch = null;
  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.g-node')) return;
    vp.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, tx, ty };
    vp.style.cursor = 'grabbing';
  });
  vp.addEventListener('pointermove', (e) => {
    if (drag) { tx = drag.tx + e.clientX - drag.x; ty = drag.ty + e.clientY - drag.y; apply(); }
    else if (pinch && pinch.has(e.pointerId)) {
      const first = pinch.get(e.pointerId);
      if (first) { first.x = e.clientX; first.y = e.clientY; }
      const pts = [...pinch.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.lastD > 0) zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, pinch.baseK * (d / pinch.baseD));
      pinch.lastD = d;
    }
  });
  const endDrag = (e) => { drag = null; if (pinch) pinch.delete(e.pointerId); vp.style.cursor = 'grab'; };
  vp.addEventListener('pointerup', endDrag);
  vp.addEventListener('pointercancel', endDrag);
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.offsetX, e.offsetY, k * (e.deltaY < 0 ? 1.12 : 0.89));
  }, { passive: false });
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      if (!pinch) pinch = new Map();
      pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const pts = [...pinch.values()];
        pinch.baseD = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinch.baseK = k; pinch.lastD = pinch.baseD;
        drag = null;
      }
    }
  });

  function zoomAt(cx, cy, nk) {
    nk = Math.min(MAX_K, Math.max(MIN_K, nk));
    const r = nk / k;
    tx = cx - (cx - tx) * r;
    ty = cy - (cy - ty) * r;
    k = nk;
    apply();
  }

  /* ---------- 聚焦(上/下闭包) ---------- */
  let focused = -1;
  function closure(from, adj) {
    const seen = new Set();
    const q = [from];
    while (q.length) {
      const c = q.shift();
      for (const nx of adj[c]) if (!seen.has(nx)) { seen.add(nx); q.push(nx); }
    }
    return seen;
  }
  function focus(idx) {
    focused = idx;
    const ups = closure(idx, up);     // 先修(绿)
    const downs = closure(idx, down); // 托起(橙)
    nodeEls.forEach((n, i) => {
      n.classList.remove('is-up', 'is-down', 'is-sel');
      if (i === idx) n.classList.add('is-sel');
      else if (ups.has(i)) n.classList.add('is-up');
      else if (downs.has(i)) n.classList.add('is-down');
      n.classList.toggle('is-dim', i !== idx && !ups.has(i) && !downs.has(i));
    });
    edgeEls.forEach((e) => {
      e.el.classList.remove('is-up', 'is-down', 'is-off');
      const { i, j } = e;
      const on = i === idx || j === idx || (ups.has(i) && ups.has(j)) || (downs.has(i) && downs.has(j));
      if (!on) e.el.classList.add('is-off');
      else if (j === idx || (ups.has(j) && (ups.has(i) || i === idx))) e.el.classList.add('is-up');
      else e.el.classList.add('is-down');
    });
    // 可见层重排居中
    const vis = flat.map((_, i) => i).filter((i) => i === idx || ups.has(i) || downs.has(i));
    applyLayout(layoutOf(vis));
    apply();
    fitAll();
    showInfo(idx);
  }
  function clearFocus() {
    focused = -1;
    nodeEls.forEach((n) => n.classList.remove('is-up', 'is-down', 'is-sel', 'is-dim'));
    edgeEls.forEach((e) => e.el.classList.remove('is-up', 'is-down', 'is-off'));
    applyLayout(layoutOf(flat.map((_, i) => i)));
    apply();
    fitAll();
    info.classList.remove('is-show');
  }
  function showInfo(idx) {
    const l = flat[idx];
    info.innerHTML = '';
    const t = document.createElement('b');
    t.textContent = l.title;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'fl-btn is-accent gi-btn';
    open.textContent = '进入课程 →';
    open.addEventListener('click', () => onOpen && onOpen(l));
    info.append(t, open);
    info.classList.add('is-show');
  }

  canvas.addEventListener('click', (e) => {
    const n = e.target.closest('.g-node');
    if (!n) return;
    const idx = Number(n.dataset.idx);
    if (focused === idx) showInfo(idx);
    else focus(idx);
  });
  toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'fit') fitAll();
    else if (b.dataset.act === 'clear') clearFocus();
    else if (b.dataset.act === 'grow') grow();
  });

  /* ---------- 入场生长动画 ---------- */
  let settleTimer = 0;
  function grow() {
    nodeEls.forEach((n, i) => {
      n.style.transition = 'none';
      n.style.opacity = '0';
      n.style.setProperty('--d', (level[i] * 0.09) + 's');
    });
    apply();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      nodeEls.forEach((n) => {
        n.style.transition = '';
        n.style.opacity = '';
      });
    }));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      nodeEls.forEach((n) => n.style.setProperty('--d', '0s'));
    }, SETTLE_MS);
  }

  function markDone(doneSet) {
    nodeEls.forEach((n, i) => n.classList.toggle('is-done', doneSet.has(flat[i].id)));
  }

  const ro = new ResizeObserver(() => fitAll());
  ro.observe(vp);
  fitAll();
  grow();

  return {
    focus, clear: clearFocus, fitAll, markDone,
    destroy() { ro.disconnect(); clearTimeout(settleTimer); container.innerHTML = ''; },
  };
}
