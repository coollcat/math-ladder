/* =========================================================================
 * lab 组件：autodiff-graph —— 反向模式的计算图（正存值、逆传伴随）
 *                                             （第 46 章 · 35 计算图与自动微分）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "autodiff-graph",
 *     "title": "L = (x·w + b)² 的最小计算图：先正着存值，再逆着传伴随",
 *     "x": 3, "w": 2, "b": 1
 *   }
 *   ```
 *
 * 演示什么：整门自动微分就只有这一张图。五个节点、五条边：
 *
 *     x ─┐
 *        ├→ u = x·w ──→ v = u + b ──→ L = v²
 *     w ─┘              ↑
 *                  b ───┘
 *
 * **正向**（分段按钮「正存值 →」）：从左往右按拓扑序把每个节点的值算出来存下，
 * 边上标的是局部导数 ∂子/∂父（乘法边 ∂u/∂x = w、∂u/∂w = x；加法边恒 1；
 * 平方边 ∂L/∂v = 2v）——这些局部导数在正向时顺手存下，反向时不用再算一遍。
 *
 * **反向**（分段按钮「← 逆传伴随」）：从根出发，伴随（adjoint）∂L/∂v 沿边**逆流**，
 * 每经过一条边就乘上那条边的局部导数，遇到分叉就**累加**。图里每张卡片翻成
 * 它自己的伴随值，边上的红字变成那次乘法的算式。
 *
 * 「完美教具」五问：
 *   ① 动手量：「x」「w」「b」三个叶节点的取值——图里全部自由参数就是这三个数，
 *      改它们等于换一道题。
 *   ② 即时后果：拖动任一滑块，正向模式下对应节点及其下游的数值一帧内全变；
 *      反向模式下三枚伴随值同时重算。切换分段按钮，卡片在"值"与"伴随"之间翻转。
 *   ③ 读数：L、∂L/∂x、∂L/∂w、∂L/∂b 四项，与正文 python 的打印口径逐位一致
 *      （x=3、w=2、b=1 时是 49 与 28 / 42 / 14）。
 *   ④ 啊哈预设：「w 归零」把乘法边 ∂u/∂x 压成 0——∂L/∂x 精确归零，哪怕 x 本身
 *      很大：**x 想影响 L，只能借道 w**。反过来「x 归零」时 ∂L/∂x 并不为零
 *      （节点值是 0，梯度不必是 0），这一对反差就是本课最容易混的两件事。
 *   ⑤ 默认状态：x=3、w=2、b=1 —— 正文 §5 那台机器原样摆在屏幕上，正向先给出
 *      49，切一次分段就看见 28 / 42 / 14 从右往左流出来。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, mergeSpec,
  buildReadout, buildSegmented, buildToolbar, mkBtn,
  label, clamp, fmt, clearBg, polyline, arrow,
} from '../core.js';

const BASE_SLIDERS = [
  { name: 'x', label: 'x', min: -4, max: 4, step: 0.5, value: 3 },
  { name: 'w', label: 'w', min: -4, max: 4, step: 0.5, value: 2 },
  { name: 'b', label: 'b', min: -4, max: 4, step: 0.5, value: 1 },
];

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 340, 660) : 420;
  const st = {
    x: Number.isFinite(spec.x) ? clamp(spec.x, -4, 4) : 3,
    w: Number.isFinite(spec.w) ? clamp(spec.w, -4, 4) : 2,
    b: Number.isFinite(spec.b) ? clamp(spec.b, -4, 4) : 1,
  };
  let phase = 'forward';         /* forward | backward */

  const ro = buildReadout({
    'L = (xw+b)²': '—',
    '∂L/∂x': '—',
    '∂L/∂w': '—',
    '∂L/∂b': '—',
    '阶段': '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented([
    { label: '正存值 →', value: 'forward' },
    { label: '← 逆传伴随', value: 'backward' },
  ], 'forward', (v) => { phase = v; draw(); }));

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (next) => {
    if (next.x !== undefined) st.x = next.x;
    if (next.w !== undefined) st.w = next.w;
    if (next.b !== undefined) st.b = next.b;
    draw();
  });

  function apply(patch) {
    Object.assign(st, patch);
    ['x', 'w', 'b'].forEach((k, i) => setSliderRow(sliders, i, st[k], 1, k));
    draw();
  }
  const bMain = mkBtn('正文现场');
  const bW0 = mkBtn('w 归零：x 被断开');
  const bX0 = mkBtn('x 归零：值 0 梯度非 0');
  const bBonly = mkBtn('b 独自扛');
  host.appendChild(buildToolbar(bMain, bW0, bX0, bBonly));

  const cv = setupCanvas(host, H);

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const Hh = cv.H;
    const ctx = cv.ctx;
    clearBg(ctx, W, Hh, C);

    /* 正向：按拓扑序存值 */
    const u = st.x * st.w;
    const v = u + st.b;
    const L = v * v;
    /* 反向：从根伴随 1 出发逆流 */
    const dv = 2 * v;                  /* ∂L/∂v */
    const du = dv;                     /* 加法边不改变标度 */
    const db = du;
    const dx = du * st.w;               /* 乘法边 ∂u/∂x = w */
    const dw = du * st.x;               /* 乘法边 ∂u/∂w = x */
    const showBack = phase === 'backward';

    /* 四列布局：叶节点两列 → u/v → L */
    const bw = clamp(W * 0.145, 62, 92);
    const bh = clamp(Hh * 0.17, 46, 60);
    const yMid = Hh * 0.52;
    const col1 = W * 0.03;
    const col2 = W * 0.30;
    const col3 = W * 0.56;
    const col4 = W * 0.80;
    const N = {
      x: { x: col1, y: yMid - bh * 1.15, name: 'x', val: st.x, adj: dx },
      w: { x: col1, y: yMid + bh * 0.15, name: 'w', val: st.w, adj: dw },
      u: { x: col2, y: yMid - bh * 0.5, name: 'u', val: u, adj: du, expr: 'x·w' },
      b: { x: col2, y: yMid + bh * 1.15, name: 'b', val: st.b, adj: db },
      v: { x: col3, y: yMid - bh * 0.5, name: 'v', val: v, adj: dv, expr: 'u + b' },
      L: { x: col4, y: yMid - bh * 0.5, name: 'L', val: L, adj: 1, expr: 'v²' },
    };
    const midY = (n) => n.y + bh / 2;
    const col2x = col2 + bw;      /* u/b 的右边缘 */

    /* 边：手写端口，避免多条边挤在同一点、也避免斜线穿框 */
    const edges = [
      { pts: [[N.x.x + bw, N.x.y + bh * 0.35], [N.u.x - 2, N.u.y + bh * 0.30]],
        label: '∂u/∂x = w', lx: (N.x.x + bw + N.u.x) / 2, ly: N.x.y + bh * 0.30 },
      { pts: [[N.w.x + bw, N.w.y + bh * 0.65], [N.u.x - 2, N.u.y + bh * 0.70]],
        label: '∂u/∂w = x', lx: (N.w.x + bw + N.u.x) / 2, ly: N.w.y + bh * 0.72 },
      { pts: [[N.u.x + bw, midY(N.u)], [N.v.x - 2, midY(N.v)]],
        label: '∂v/∂u = 1', lx: (N.u.x + bw + N.v.x) / 2, ly: midY(N.u) - 8 },
      /* b 在 u 正下方，先右探再上探 v 的底边 */
      { pts: [[col2x, midY(N.b)], [col2x + 14, midY(N.b)], [col2x + 14, N.v.y + bh + 2]],
        label: '∂v/∂b = 1', lx: col2x + 20, ly: N.v.y + bh + 16, vertical: true },
      { pts: [[N.v.x + bw, midY(N.v)], [N.L.x - 2, midY(N.L)]],
        label: '∂L/∂v = 2v', lx: (N.v.x + bw + N.L.x) / 2, ly: midY(N.v) - 8 },
    ];

    edges.forEach((e) => {
      const col = showBack ? C.bad : C.axis;
      const wd = showBack ? 2.2 : 1.6;
      const pts = e.pts;
      if (pts.length > 2) {
        polyline(ctx, pts.slice(0, -1), col, wd);
      }
      const a = pts[pts.length - 2];
      const b2 = pts[pts.length - 1];
      arrow(ctx, a[0], a[1], b2[0], b2[1], col, wd, 8);
      label(ctx, e.label, e.lx, e.ly, showBack ? C.bad : C.axis,
        { align: e.vertical ? 'left' : 'center', size: 10 });
    });

    /* 节点卡片：正向显示值，反向翻成伴随 */
    Object.keys(N).forEach((k) => {
      const n = N[k];
      const isLeaf = k === 'x' || k === 'w' || k === 'b';
      const col = k === 'L' ? C.accent2 : (isLeaf ? C.named('teal') : C.named('blue'));
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(n.x, n.y, bw, bh, 8);
      else ctx.rect(n.x, n.y, bw, bh);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      label(ctx, n.name, n.x + 7, n.y + 14, col, { size: 12, weight: 700 });
      if (n.expr) label(ctx, n.expr, n.x + bw - 7, n.y + 14, C.axis, { align: 'right', size: 10 });
      label(ctx, showBack ? '∇ ' + fmt(n.adj, 2) : fmt(n.val, 2),
        n.x + bw / 2, n.y + bh - 9, showBack ? C.bad : C.fg,
        { align: 'center', size: 13, weight: 700 });
    });

    /* 顶部一句说明 */
    label(ctx, showBack
      ? '反向：伴随从 L 逆流，过一条边乘一次局部导数，分叉处累加'
      : '正向：按拓扑序算出并记住每个节点的值（灰字 = 那条边的局部导数，顺手存下）',
      W * 0.02, 20, showBack ? C.bad : C.fg, { size: 11, weight: 600 });

    /* 读数 */
    ro.set('L = (xw+b)²', fmt(L, 2));
    ro.set('∂L/∂x', fmt(dx, 2) + '  (2vw)');
    ro.set('∂L/∂w', fmt(dw, 2) + '  (2vx)');
    ro.set('∂L/∂b', fmt(db, 2) + '  (2v)');
    ro.set('阶段', showBack ? '反向 · 卡片里是伴随值' : '正向 · 卡片里是节点值');
  }

  bMain.addEventListener('click', () => apply({ x: 3, w: 2, b: 1 }));
  bW0.addEventListener('click', () => apply({ x: 3, w: 0, b: 1 }));
  bX0.addEventListener('click', () => apply({ x: 0, w: 2, b: 1 }));
  bBonly.addEventListener('click', () => apply({ x: 0, w: 0, b: 2 }));

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { cv.redraw = null; } };
}
