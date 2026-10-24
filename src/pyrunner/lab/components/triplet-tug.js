/* =========================================================================
 * lab 组件：triplet-tug —— triplet 损失的拔河现场：两个手柄、一道及格圈
 * -------------------------------------------------------------------------
 * 演示什么：锚点钉死在原点，正例 p 与负例 n 各是一根可以拖的木桩。
 *   屏幕上那个虚线圈是"及格线"——n 必须站到圈外，损失才归零；圈内差多少，
 *   读数就报多少罚分。再把距离换成平方距离，同一个位置、同一组点，
 *   罚分与及格圈一起变——d(·,·) 一旦选定就不能中途换。
 *
 * 用法（第 48 章《对比学习与 triplet 损失》动手实验）：
 *   { "type": "triplet-tug",
 *     "title": "拖正例与负例，看罚单什么时候清零",
 *     "hint": "拖蓝方块 p 与红三角 n；虚线圈是及格线",
 *     "anchor": [0, 0],
 *     "p": [3, 4],
 *     "n": [5, 0],
 *     "margin": 2 }
 *
 * 字段（都可省）：anchor 锚点（默认原点）/ p、n 两个手柄初值 /
 *   margin 间隔 m（默认 2，滑块可调 0~5）/ metric 初值 'euclid' 或 'sq'。
 *
 * 五问：
 *   1. 动手量：拖 p 和 n —— 它们就是 triplet 里那两个"待优化的自由度"；
 *      锚点特意按住不动，好让读者只看另外两根桩的命运。
 *   2. 即时后果：及格圈半径、两段连线、罚分读数一帧内全部重画。
 *   3. 读数：d(a,p)、d(a,n)、L = max(0, d(a,p) − d(a,n) + m) 逐项亮出，
 *      与正文公式逐字对应；默认 p=[3,4]、n=[5,0]、m=2 得 5.0000 / 5.0000 / 2.0000。
 *   4. 啊哈预设：「刚好卡线」把 n 放到 (7,0)——距离 7.0000 恰好等于 5+2，
 *      罚分 0.0000 而圈上一分不多；「平方陷阱」换成 p=[1,0]、n=[2.5,0.5]，
 *      欧氏距离下罚 0.4505、平方距离下直接归零。
 *   5. 默认状态：p 在远处、n 贴着及格圈内侧，一打开就是"秩序失效"的那一帧。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildSegmented, buildReadout,
  buildSliders, setSliderRow, mkBtn, label, polyline, clamp, fmt, clearBg,
} from '../core.js';

const dist = (u, v, sq) => {
  const s = (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2;
  return sq ? s : Math.sqrt(s);
};

export default function render(host, spec) {
  const anchor = Array.isArray(spec.anchor) && spec.anchor.length === 2 ? spec.anchor.map(Number) : [0, 0];
  const p0 = Array.isArray(spec.p) && spec.p.length === 2 ? spec.p.map(Number) : [3, 4];
  const n0 = Array.isArray(spec.n) && spec.n.length === 2 ? spec.n.map(Number) : [5, 0];

  const st = {
    p: [p0[0], p0[1]],
    n: [n0[0], n0[1]],
    margin: Number.isFinite(spec.margin) ? spec.margin : 2,
    sq: spec.metric === 'sq',
  };

  const cv = setupCanvas(host, spec.height || 350);
  const ro = buildReadout({
    'd(a,p) 正例距离': '—',
    'd(a,n) 负例距离': '—',
    '及格线半径': '—',
    'L（罚分）': '—',
  });
  host.appendChild(ro.box);

  const view = { S: 0, ox: 0, oy: 0, X0: (x) => x, Y0: (y) => y };

  /* 世界窗口固定：这样拖动手感不随 p、n 乱跑（自适应的缩放会让"拖一点就飞出去"） */
  const WIN = { x0: -2.5, x1: 13, y0: -9, y1: 9 };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const padL = 34;
    const padR = 16;
    const padT = 18;
    const padB = 22;
    const S = Math.min((W - padL - padR) / (WIN.x1 - WIN.x0), (H - padT - padB) / (WIN.y1 - WIN.y0));
    const ox = padL - WIN.x0 * S;
    const oy = padT - WIN.y0 * S;
    const X = (x) => ox + x * S;
    /* y 向上为正：屏幕上要翻个个儿 */
    const Y = (y) => H - padB - (y - WIN.y0) * S;
    view.S = S;
    view.ox = ox;
    view.oy = oy;
    view.Y = Y;

    /* 网格与轴 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = Math.ceil(WIN.x0); gx <= WIN.x1; gx += 1) {
      ctx.moveTo(X(gx), Y(WIN.y1));
      ctx.lineTo(X(gx), Y(WIN.y0));
    }
    for (let gy = Math.ceil(WIN.y0); gy <= WIN.y1; gy += 1) {
      ctx.moveTo(X(WIN.x0), Y(gy));
      ctx.lineTo(X(WIN.x1), Y(gy));
    }
    ctx.stroke();
    ctx.restore();

    /* 及格圈：n 站在圈外 ⇔ 罚分为零。半径按当前距离口径算：
       欧氏 → d(a,p)+m；平方距离 → √(d²(a,p)+m)（同一个不等式，圈的半径却小了一圈） */
    const dap = dist(anchor, st.p, st.sq);
    const dan = dist(anchor, st.n, st.sq);
    const gateR = st.sq ? Math.sqrt(dap + st.margin) : dap + st.margin;
    ctx.save();
    ctx.strokeStyle = C.ok;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(X(anchor[0]), Y(anchor[1]), gateR * S, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    label(ctx, '及格线 r = ' + fmt(gateR, 3), X(anchor[0]) + gateR * S * 0.72,
      Y(anchor[1]) - gateR * S * 0.72, C.ok, { size: 10 });

    /* 两条连线：a→p（拉）、a→n（推） */
    polyline(ctx, [[X(anchor[0]), Y(anchor[1])], [X(st.p[0]), Y(st.p[1])]], C.named('blue'), 2.2);
    polyline(ctx, [[X(anchor[0]), Y(anchor[1])], [X(st.n[0]), Y(st.n[1])]], C.named('red'), 2.2);

    /* 锚点：星形 */
    const ax = X(anchor[0]);
    const ay = Y(anchor[1]);
    ctx.fillStyle = C.fg;
    ctx.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const r = k % 2 === 0 ? 8 : 3.6;
      const a2 = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = ax + r * Math.cos(a2);
      const py = ay + r * Math.sin(a2);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    label(ctx, 'a 锚点（固定）', ax + 11, ay + 16, C.fg, { size: 10 });

    /* p：方块 */
    const px2 = X(st.p[0]);
    const py2 = Y(st.p[1]);
    ctx.fillStyle = C.named('blue');
    ctx.fillRect(px2 - 7, py2 - 7, 14, 14);
    label(ctx, 'p 正例', px2 + 11, py2 - 8, C.named('blue'), { size: 11, weight: 600 });

    /* n：三角 */
    const nx = X(st.n[0]);
    const ny = Y(st.n[1]);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.moveTo(nx, ny - 9);
    ctx.lineTo(nx + 8, ny + 6);
    ctx.lineTo(nx - 8, ny + 6);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'n 负例', nx + 11, ny + 4, C.named('red'), { size: 11, weight: 600 });

    /* n 在圈内就画一段"欠账"箭头：还差多少才出圈 */
    if (dan < gateR - 1e-9) {
      const gapE = gateR - (st.sq ? Math.sqrt(dan) : dan);
      const ux = (st.n[0] - anchor[0]) || 1;
      const uy = (st.n[1] - anchor[1]) || 0;
      const len = Math.hypot(ux, uy) || 1;
      const ex = st.n[0] + (ux / len) * gapE;
      const ey = st.n[1] + (uy / len) * gapE;
      ctx.save();
      ctx.strokeStyle = C.bad;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(X(st.n[0]), Y(st.n[1]));
      ctx.lineTo(X(ex), Y(ey));
      ctx.stroke();
      ctx.restore();
      label(ctx, '还差 ' + fmt(gapE, 3), (X(st.n[0]) + X(ex)) / 2 + 6,
        (Y(st.n[1]) + Y(ey)) / 2 - 6, C.bad, { size: 10 });
    }

    if (spec.hint) label(ctx, String(spec.hint), padL, H - 5, C.grid, { size: 10 });

    const loss = Math.max(0, dap - dan + st.margin);
    /* 距离一律四位小数：这一课的三个数要能直接和正文的 5 / 5 / 2 逐位对账，
       自动省略小数点的 fmt 会让 "5" 与 "5.0000" 混着出现。 */
    ro.set('d(a,p) 正例距离', dap.toFixed(4) + (st.sq ? '（平方）' : '（欧氏）'));
    ro.set('d(a,n) 负例距离', dan.toFixed(4) + (st.sq ? '（平方）' : '（欧氏）'));
    ro.set('及格线半径', gateR.toFixed(3) + (st.sq ? '　= √(d²(a,p)+m)' : '　= d(a,p)+m'));
    ro.set('L（罚分）', loss < 1e-12
      ? '0.0000　✔ 已排序，铰链关闭'
      : loss.toFixed(4) + '　✘ 排序被破坏，罚这么多');
  }

  function toWorld(x, y) {
    if (!(view.S > 0)) return null;
    return [(x - view.ox) / view.S, (WIN.y0 + (cv.H - 22 - y) / view.S)];
  }

  const hitTest = (x, y) => {
    const px = view.ox + st.p[0] * view.S;
    const py = view.Y(st.p[1]);
    const nx = view.ox + st.n[0] * view.S;
    const ny = view.Y(st.n[1]);
    const dp = Math.hypot(x - px, y - py);
    const dn = Math.hypot(x - nx, y - ny);
    if (dp < 16 && dp <= dn) return 'p';
    if (dn < 16) return 'n';
    return null;
  };

  bindPointer(cv.canvas, {
    pick: (x, y) => hitTest(x, y),
    down: (id, x, y) => {
      const w = toWorld(x, y);
      if (!w) return;
      st[id] = [clamp(Math.round(w[0] * 4) / 4, -2, 12), clamp(Math.round(w[1] * 4) / 4, -8, 8)];
      draw();
    },
    move: (id, x, y) => {
      const w = toWorld(x, y);
      if (!w) return;
      st[id] = [clamp(Math.round(w[0] * 4) / 4, -2, 12), clamp(Math.round(w[1] * 4) / 4, -8, 8)];
      draw();
    },
  });

  const seg = buildSegmented(
    [
      { label: '欧氏距离 d', value: 'euclid' },
      { label: '平方距离 d²', value: 'sq' },
    ],
    st.sq ? 'sq' : 'euclid',
    (v) => { st.sq = v === 'sq'; draw(); },
  );
  host.appendChild(seg);

  const sliders = buildSliders(
    { sliders: [{ name: 'm', label: '间隔 m', min: 0, max: 6, step: 0.1, value: st.margin, fmt: 1 }] },
    (state) => { st.margin = state.m; draw(); },
  );

  /* 统一的状态回写：读数、滑块、分段按钮三处必须同时对齐，
     否则读者按下预设后看到的数字与控件位置会互相打脸。 */
  function applyPreset(p, n, m, sq) {
    st.p = p.slice();
    st.n = n.slice();
    st.margin = m;
    st.sq = sq;
    setSliderRow(sliders, 0, m, 1, 'm');
    Array.from(seg.children).forEach((b, i) => {
      b.classList.toggle('is-active', (i === 1) === sq);
    });
    draw();
  }

  const bar = buildToolbar(
    (() => {
      const b = mkBtn('刚好卡线');
      b.addEventListener('click', () => applyPreset([3, 4], [7, 0], 2, false));
      return b;
    })(),
    (() => {
      const b = mkBtn('负例躲进圈里');
      b.addEventListener('click', () => applyPreset([3, 4], [1, 1], 2, false));
      return b;
    })(),
    (() => {
      const b = mkBtn('换距离口径的陷阱');
      b.addEventListener('click', () => applyPreset([1, 0], [2.5, 0.5], 2, false));
      return b;
    })(),
  );
  host.appendChild(bar);

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
