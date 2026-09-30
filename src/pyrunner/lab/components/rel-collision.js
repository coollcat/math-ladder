/* =========================================================================
 * lab 组件：rel-collision —— 一维弹性碰撞：动量守恒要换成 γmu
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-collision", "title": "拖两个速度开关做碰撞实验", "u1": 0.8, "u2": -0.3 }
 *   ```
 *
 * 字段：
 *   u1 / u2  两球初速度（单位 c），-0.95..0.95，默认 0.8 与 -0.3
 *   m1 / m2  两球质量（GeV/c²），0.5..3，默认 1 与 2
 *
 * 能拖什么：
 *   ① 最上面那根"速度尺"上的两个圆把手 —— 直接拖出你想要的初速度；
 *   ② 四个滑块（两个质量、两个初速度）。点「播放」让两球对撞。
 *
 * 看什么（右下角读数条）：
 *   相对论动量 Σγmu 与总能量 Σγm 在碰撞前后**分毫不差**；
 *   而牛顿的 Σmu 在碰撞前后对不上 —— 这正是"动量必须带上 γ"的实验依据。
 *   两球在质心系里只是把方向掉了个头，这一点由快度相加算出来，所以不管多快都精确守恒。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, anim, label, fmt, clamp,
  pickSlider,
  clearBg,
  gammaOf,
  setSliderRow,
} from '../core.js';

export default function render(host, spec) {
  let u1 = clamp(Number(spec.u1 ?? 0.8), -0.95, 0.95);
  let u2 = clamp(Number(spec.u2 ?? -0.3), -0.95, 0.95);
  let m1 = clamp(Number(spec.m1 ?? 1), 0.5, 3);
  let m2 = clamp(Number(spec.m2 ?? 2), 0.5, 3);
  let tt = -1;   /* 动画时间：负 = 撞前，正 = 撞后 */

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({
    相对论动量: '—', 总能量: '—', 牛顿动量: '—', 状态: '—',
  });
  host.appendChild(ro.box);

  const geo = { x0: 0, x1: 0, yu: 0, yc: 0, scale: 1 };
  const XU = (u) => geo.x0 + ((u + 1) / 2) * (geo.x1 - geo.x0);
  const iXU = (x) => ((x - geo.x0) / (geo.x1 - geo.x0)) * 2 - 1;
  const rap = (u) => 0.5 * Math.log((1 + u) / (1 - u));
  const gam = (u) => gammaOf(u);

  /* 质心系快度：解 Σ mᵢ sinh(θᵢ − θc) = 0。左边关于 θc 单调减，二分即可。 */
  function cmRapidity() {
    const th1 = rap(u1), th2 = rap(u2);
    let lo = Math.min(th1, th2) - 2, hi = Math.max(th1, th2) + 2;
    for (let i = 0; i < 90; i += 1) {
      const mid = (lo + hi) / 2;
      const f = m1 * Math.sinh(th1 - mid) + m2 * Math.sinh(th2 - mid);
      if (f > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  /* 弹性碰撞 = 质心系里各自掉头：θᵢ′ = 2θc − θᵢ */
  function after() {
    const thc = cmRapidity();
    return [Math.tanh(2 * thc - rap(u1)), Math.tanh(2 * thc - rap(u2))];
  }
  const flash = () => Math.abs(u1 - u2) < 1e-6;

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    clearBg(ctx, W, H, C);

    geo.x0 = 34;
    geo.x1 = W - 26;
    geo.yu = 74;
    geo.yc = 250;

    /* ---- 速度尺 ---- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(geo.x0, geo.yu + 0.5);
    ctx.lineTo(geo.x1, geo.yu + 0.5);
    ctx.stroke();
    for (let u = -1; u <= 1.0001; u += 0.25) {
      const px = XU(u);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, geo.yu - 4);
      ctx.lineTo(px + 0.5, geo.yu + 4);
      ctx.stroke();
      label(ctx, `${fmt(u, 2)}c`, px, geo.yu + 18, C.axis, { size: 9, align: 'center' });
    }
    label(ctx, '速度尺：拖圆把手设定两球的初速度', geo.x0, geo.yu - 14, C.fg, { size: 11, weight: 600 });

    const knob = (u, col, txt, up) => {
      const px = XU(clamp(u, -1, 1));
      ctx.beginPath();
      ctx.arc(px, geo.yu, 9, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, txt, px, geo.yu + (up ? -16 : 36), col, { size: 11, align: 'center', weight: 600 });
    };
    knob(u1, C.named('blue'), `u₁ = ${fmt(u1, 2)}c`, true);
    knob(u2, C.named('orange'), `u₂ = ${fmt(u2, 2)}c`, false);

    /* ---- 碰撞轨道 ---- */
    const cy = geo.yc;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(geo.x0, cy + 30);
    ctx.lineTo(geo.x1, cy + 30);
    ctx.stroke();
    const mid = (geo.x0 + geo.x1) / 2;
    geo.scale = (geo.x1 - geo.x0) / 2 / 1.05;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(mid + 0.5, cy - 60);
    ctx.lineTo(mid + 0.5, cy + 44);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '碰撞点', mid, cy + 58, C.accent2, { size: 10, align: 'center' });

    const [v1, v2] = after();
    const px1 = mid + (tt < 0 ? u1 : v1) * tt * geo.scale;
    const px2 = mid + (tt < 0 ? u2 : v2) * tt * geo.scale;
    const ball = (px, m, col, txt, u) => {
      const r = 11 + 5 * m;
      ctx.beginPath();
      ctx.arc(clamp(px, geo.x0 + r, geo.x1 - r), cy, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, txt, clamp(px, geo.x0 + r, geo.x1 - r), cy + 4, C.bg,
        { size: 11, align: 'center', weight: 700 });
      /* 速度箭头 */
      const ax = clamp(px, geo.x0 + r, geo.x1 - r);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, cy - r - 8);
      ctx.lineTo(ax + u * 46, cy - r - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + u * 46, cy - r - 8);
      ctx.lineTo(ax + u * 46 - Math.sign(u) * 7, cy - r - 12);
      ctx.lineTo(ax + u * 46 - Math.sign(u) * 7, cy - r - 4);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    ball(px1, m1, C.named('blue'), '1', tt < 0 ? u1 : v1);
    ball(px2, m2, C.named('orange'), '2', tt < 0 ? u2 : v2);

    label(ctx, tt < 0 ? '碰撞前' : '碰撞后', geo.x0, cy - 74, C.fg, { size: 12, weight: 700 });
    label(ctx, `m₁ = ${fmt(m1, 2)}，m₂ = ${fmt(m2, 2)}（GeV/c²）`, geo.x1, cy - 74, C.axis,
      { size: 11, align: 'right' });

    /* ---- 读数：把守恒量摆出来 ---- */
    const g1 = gam(u1), g2 = gam(u2);
    const pB = g1 * m1 * u1 + g2 * m2 * u2;
    const eB = g1 * m1 + g2 * m2;
    const nB = m1 * u1 + m2 * u2;
    const ga1 = gam(v1), ga2 = gam(v2);
    const pA = ga1 * m1 * v1 + ga2 * m2 * v2;
    const eA = ga1 * m1 + ga2 * m2;
    const nA = m1 * v1 + m2 * v2;

    ro.set('相对论动量', `Σγmu：前 ${fmt(pB, 4)} → 后 ${fmt(pA, 4)}（守恒）`);
    ro.set('总能量', `Σγm：前 ${fmt(eB, 4)} → 后 ${fmt(eA, 4)}（守恒）`);
    ro.set('牛顿动量', `Σmu：前 ${fmt(nB, 4)} → 后 ${fmt(nA, 4)}${Math.abs(nA - nB) < 1e-9 ? '（这里碰巧相等）' : '（对不上 ✗）'}`);
    ro.set('状态', flash()
      ? '两球速度相同，不会相撞 —— 拖开一点'
      : `碰后速度 u₁′ = ${fmt(v1, 4)}c，u₂′ = ${fmt(v2, 4)}c`);

    /* 质心系提示 */
    label(ctx, `质心系快度 θc = ${fmt(cmRapidity(), 4)}：在它眼里两球只是各自掉头`,
      geo.x0, H - 8, C.accent, { size: 11 });
  }

  const sl = buildSliders({
    sliders: [
      pickSlider(spec, 'u1', { name: 'u1', label: '初速度 u₁', min: -0.95, max: 0.95, step: 0.01, value: u1 }),
      pickSlider(spec, 'u2', { name: 'u2', label: '初速度 u2', min: -0.95, max: 0.95, step: 0.01, value: u2 }),
      pickSlider(spec, 'm1', { name: 'm1', label: '质量 m₁', min: 0.5, max: 3, step: 0.1, value: m1 }),
      pickSlider(spec, 'm2', { name: 'm2', label: '质量 m2', min: 0.5, max: 3, step: 0.1, value: m2 }),
    ],
  }, (st) => {
    u1 = clamp(st.u1 ?? u1, -0.95, 0.95);
    u2 = clamp(st.u2 ?? u2, -0.95, 0.95);
    m1 = clamp(st.m1 ?? m1, 0.5, 3);
    m2 = clamp(st.m2 ?? m2, 0.5, 3);
    tt = -1;
    draw();
  });
  function syncSliders() {
    setSliderRow(sl, 0, Math.round(u1 * 100) / 100, undefined, 'u1');
    setSliderRow(sl, 1, Math.round(u2 * 100) / 100, undefined, 'u2');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (Math.abs(y - geo.yu) > 24) return null;
      return Math.abs(x - XU(u1)) <= Math.abs(x - XU(u2)) ? 'u1' : 'u2';
    },
    move(id, x) {
      const v = clamp(Math.round(iXU(x) * 100) / 100, -0.95, 0.95);
      if (id === 'u1') u1 = v; else u2 = v;
      tt = -1;
      syncSliders();
      draw();
    },
  });
  cv.canvas.style.cursor = 'ew-resize';

  let controls = null;
  controls = anim(host, {
    onTick(dt) {
      tt += dt * 1.1;
      if (tt > 1.05) tt = -1.05;
      draw();
    },
    onReset() { tt = -1.05; draw(); },
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box, destroy() { controls.stop(); } };
}
