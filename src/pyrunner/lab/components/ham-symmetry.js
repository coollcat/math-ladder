/* =========================================================================
 * lab 组件：ham-symmetry —— 对称性开关：关掉对称，守恒量立刻漏气
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-symmetry",
 *     "title": "把对称性拧坏一点，看守恒量怎么漏",
 *     "mode": "rot",
 *     "eps": 0
 *   }
 *   ```
 *
 * 字段：
 *   mode  "rot"（旋转对称）/ "trans"（平移对称），默认 "rot"
 *   eps   各向异性 ε：V = ½(1+ε)x² + ½(1−ε)y²，−0.6..0.6，默认 0（rot 模式）
 *   g     倾斜：V = ½x² + g·y，−0.6..0.6，默认 0（trans 模式）
 *   v0    初速大小，0..1.6，默认 0.9
 *   phi   初速方向（度），0..360，默认 90
 *   x0,y0 初始位置，默认 (1.2, 0)
 *
 * 能拖什么：
 *   **在左图上拖动** = 换初始位置（红叉）；滑块改势场形状与初速；播放/重置推进时间。
 *
 * 看什么：
 *   左图底色是势能的高低（越亮越高），橙线是真实轨道。
 *   右图把守恒量随时间的曲线画出来，纵轴放大：
 *   ε = 0（旋转对称）时**角动量 L = x·p_y − y·p_x 是一条水平线**；
 *   把 ε 拖到 0.3，势场变成椭圆碗，L 立刻上下晃 —— 对称性一破，守恒量就没了。
 *   切到"平移对称"：V 不依赖 y，于是 p_y 守恒；把 g 拖离 0，p_y 开始匀速下滑
 *   （斜率恰好 −g，因为 ṗ_y = −∂V/∂y = −g）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildSegmented, bindPointer, polyline,
  label, fmt, clamp, anim, mergeSpec,
  clearBg,
} from '../core.js';

const BOX = 2.6;       /* 平面半宽 */
const NSTEP = 1800;
const TSPAN = 18;
const GW = 60;         /* 势能底图的分辨率 */
const GH = 48;

const MODES = [
  { value: 0, id: 'rot', label: '旋转对称' },
  { value: 1, id: 'trans', label: '平移对称' },
];

/* 势能：rot 用椭圆碗，trans 用"抛物槽 + 斜坡" */
function potential(mode, eps, g, x, y) {
  if (mode === 1) return 0.5 * x * x + g * y;
  return 0.5 * (1 + eps) * x * x + 0.5 * (1 - eps) * y * y;
}

/* 加速度 = −∇V */
function accel(mode, eps, g, x, y) {
  if (mode === 1) return [-x, -g];
  return [-(1 + eps) * x, -(1 - eps) * y];
}

function rk4(mode, eps, g, s, h) {
  const f = (u) => {
    const a = accel(mode, eps, g, u[0], u[1]);
    return [u[2], u[3], a[0], a[1]];
  };
  const add = (u, v, c) => u.map((val, i) => val + c * v[i]);
  const k1 = f(s);
  const k2 = f(add(s, k1, 0.5 * h));
  const k3 = f(add(s, k2, 0.5 * h));
  const k4 = f(add(s, k3, h));
  return s.map((val, i) => val + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/* 守恒量候选：旋转对称下是角动量，平移对称下是 y 方向动量 */
function charge(mode, x, y, vx, vy) {
  return mode === 1 ? vy : x * vy - y * vx;
}

export default function render(host, spec) {
  const modeOf = (name) => {
    const hit = MODES.find((m) => m.id === name);
    return hit ? hit.value : 0;
  };
  let mode = modeOf(spec.mode);
  let eps = clamp(typeof spec.eps === 'number' ? spec.eps : 0, -0.6, 0.6);
  let g = clamp(typeof spec.g === 'number' ? spec.g : 0, -0.6, 0.6);
  let v0 = clamp(typeof spec.v0 === 'number' ? spec.v0 : 0.9, 0, 1.6);
  let phi = clamp(typeof spec.phi === 'number' ? spec.phi : 90, 0, 360);
  let x0 = clamp(typeof spec.x0 === 'number' ? spec.x0 : 1.2, -BOX, BOX);
  let y0 = clamp(typeof spec.y0 === 'number' ? spec.y0 : 0, -BOX, BOX);

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    轨道: '—', 守恒量: '—', 波动: '—', 对称性: '—', 时间: '—',
  });
  host.appendChild(ro.box);

  const gx = { x0: 44, y0: 22, w: 0, h: 0, rx: 0, ry: 0, rw: 0, rh: 0 };
  let traj = [];
  let chargeTrace = [];
  let idx = 0;
  let heat = null;
  let heatKey = '';

  const SX = (x) => gx.x0 + ((x + BOX) / (2 * BOX)) * gx.w;
  const SY = (y) => gx.y0 + gx.h - ((y + BOX) / (2 * BOX)) * gx.h;

  function rebuild() {
    const h = TSPAN / NSTEP;
    const th = (phi * Math.PI) / 180;
    let s = [x0, y0, v0 * Math.cos(th), v0 * Math.sin(th)];
    traj = [];
    chargeTrace = [];
    for (let i = 0; i <= NSTEP; i += 1) {
      traj.push(s);
      chargeTrace.push(charge(mode, s[0], s[1], s[2], s[3]));
      if (Math.abs(s[0]) > 60 || Math.abs(s[1]) > 60) break;
      s = rk4(mode, eps, g, s, h);
    }
    idx = 0;
    heatKey = '';
  }

  /* 势能底图：离屏画一次，参数变了才重画 */
  function buildHeat() {
    const c = document.createElement('canvas');
    c.width = GW;
    c.height = GH;
    const cx = c.getContext('2d');
    let vmin = Infinity;
    let vmax = -Infinity;
    const vals = [];
    for (let j = 0; j < GH; j += 1) {
      for (let i = 0; i < GW; i += 1) {
        const x = -BOX + (2 * BOX * i) / (GW - 1);
        const y = BOX - (2 * BOX * j) / (GH - 1);
        const v = potential(mode, eps, g, x, y);
        vals.push(v);
        vmin = Math.min(vmin, v);
        vmax = Math.max(vmax, v);
      }
    }
    const C = themeColors();
    cx.fillStyle = C.bg;
    cx.fillRect(0, 0, GW, GH);
    cx.fillStyle = C.accent2;
    for (let n = 0; n < vals.length; n += 1) {
      const t = (vals[n] - vmin) / Math.max(vmax - vmin, 1e-9);
      cx.globalAlpha = 0.06 + 0.42 * t;
      cx.fillRect(n % GW, Math.floor(n / GW), 1, 1);
    }
    cx.globalAlpha = 1;
    heat = c;
    heatKey = `${mode}|${eps}|${g}`;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    gx.w = Math.round((W - gx.x0 - 40) * 0.56);
    gx.h = H - gx.y0 - 44;
    gx.rx = gx.x0 + gx.w + 34;
    gx.rw = W - gx.rx - 34;
    gx.ry = gx.y0 + 26;
    gx.rh = gx.h - 52;

    if (heatKey !== `${mode}|${eps}|${g}`) buildHeat();
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx.x0, gx.y0, gx.w, gx.h);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(heat, gx.x0, gx.y0, gx.w, gx.h);
    ctx.restore();

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SX(0) + 0.5, gx.y0);
    ctx.lineTo(SX(0) + 0.5, gx.y0 + gx.h);
    ctx.moveTo(gx.x0, SY(0) + 0.5);
    ctx.lineTo(gx.x0 + gx.w, SY(0) + 0.5);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx.x0, gx.y0, gx.w, gx.h);
    ctx.clip();
    const pts = traj.map((s) => [SX(s[0]), SY(s[1])]);
    polyline(ctx, pts, C.accent, 2.4);
    const cur = traj[Math.min(idx, traj.length - 1)];
    if (cur) {
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(SX(cur[0]), SY(cur[1]), 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SX(x0) - 6, SY(y0));
    ctx.lineTo(SX(x0) + 6, SY(y0));
    ctx.moveTo(SX(x0), SY(y0) - 6);
    ctx.lineTo(SX(x0), SY(y0) + 6);
    ctx.stroke();

    label(ctx, mode === 0 ? `V = ½(1+ε)x² + ½(1−ε)y²，ε = ${fmt(eps, 2)}`
      : `V = ½x² + g·y，g = ${fmt(g, 2)}`, gx.x0, gx.y0 - 8, C.fg, { size: 12, weight: 600 });
    label(ctx, '底面越亮 = 势能越高', gx.x0, H - 8, C.axis, { size: 11 });

    /* 右图：守恒量随时间 */
    const vals = chargeTrace;
    const vmin = Math.min(...vals);
    const vmax = Math.max(...vals);
    const pad = Math.max(vmax - vmin, Math.abs(vals[0]) * 0.15, 0.1) * 0.9;
    const lo = vmin - pad;
    const hi = vmax + pad;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx.rx, gx.ry + gx.rh);
    ctx.lineTo(gx.rx + gx.rw, gx.ry + gx.rh);
    ctx.moveTo(gx.rx + 0.5, gx.ry);
    ctx.lineTo(gx.rx + 0.5, gx.ry + gx.rh);
    ctx.stroke();

    const yOf = (v) => gx.ry + gx.rh - ((v - lo) / (hi - lo)) * gx.rh;
    polyline(ctx, vals.map((v, i) => [gx.rx + (i / (vals.length - 1)) * gx.rw, yOf(v)]),
      C.accent2, 2.4);
    polyline(ctx, [[gx.rx, yOf(vals[0])], [gx.rx + gx.rw, yOf(vals[0])]], C.named('gray'), 1.4, [5, 4]);
    const cx = gx.rx + (idx / (vals.length - 1)) * gx.rw;
    polyline(ctx, [[cx, gx.ry], [cx, gx.ry + gx.rh]], C.accent, 1.4);

    const qname = mode === 1 ? 'p_y = 竖直动量' : 'L = x·p_y − y·p_x';
    label(ctx, `守恒量 ${qname}`, gx.rx - 6, gx.ry - 10, C.accent2, { size: 11, weight: 600 });
    label(ctx, `纵轴 ${fmt(lo, 2)} … ${fmt(hi, 2)}（放大过）`, gx.rx - 6, gx.ry + gx.rh + 15, C.axis, { size: 11 });
    label(ctx, '灰虚线 = 出发时的值', gx.rx - 6, gx.ry + gx.rh + 29, C.axis, { size: 11 });

    const broken = mode === 0 ? Math.abs(eps) > 1e-3 : Math.abs(g) > 1e-3;
    const curS = traj[Math.min(idx, traj.length - 1)] || [x0, y0, 0, 0];
    ro.set('轨道', `位置 (${fmt(curS[0], 2)}, ${fmt(curS[1], 2)})　速度 (${fmt(curS[2], 2)}, ${fmt(curS[3], 2)})`);
    ro.set('守恒量', `${qname} = ${fmt(chargeTrace[Math.min(idx, chargeTrace.length - 1)], 4)}（出发时 ${fmt(vals[0], 4)}）`);
    ro.set('波动', `max − min = ${fmt(vmax - vmin, 4)}`);
    ro.set('对称性', broken
      ? (mode === 0 ? `ε ≠ 0：势场是椭圆碗，转一下形状就变 → 角动量不守恒`
        : `g ≠ 0：势场依赖 y，沿 y 平移不再等价 → p_y 不守恒（斜率 −g = ${fmt(-g, 2)}）`)
      : (mode === 0 ? 'ε = 0：势场绕原点旋转不变 → 角动量守恒'
        : 'g = 0：V 不含 y，沿 y 平移不变 → p_y 守恒'));
    ro.set('时间', `t = ${fmt((idx / NSTEP) * TSPAN, 2)}`);
  }

  const loop = anim(host, {
    onTick(dt) {
      idx += Math.max(1, Math.round(dt * 160));
      if (idx >= traj.length) idx = 0;
      draw();
    },
    onReset() { idx = 0; draw(); },
  });

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'eps', label: '各向异性 ε', min: -0.6, max: 0.6, step: 0.02, value: eps, fmt: 2 },
        { name: 'g', label: '斜坡 g', min: -0.6, max: 0.6, step: 0.02, value: g, fmt: 2 },
        { name: 'v0', label: '初速大小', min: 0, max: 1.6, step: 0.02, value: v0, fmt: 2 },
        { name: 'phi', label: '初速方向(°)', min: 0, max: 360, step: 1, value: phi, fmt: 0 },
      ], spec),
    },
    (st) => {
      eps = st.eps; g = st.g; v0 = st.v0; phi = st.phi;
      rebuild();
      draw();
    },
  );
  eps = sl.state.eps; g = sl.state.g; v0 = sl.state.v0; phi = sl.state.phi;

  const seg = buildSegmented(
    MODES.map((m) => ({ value: m.value, label: m.label })),
    mode,
    (v) => { mode = v; rebuild(); draw(); },
  );
  host.insertBefore(seg, ro.box);

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x >= gx.x0 - 10 && x <= gx.x0 + gx.w + 10 && y >= gx.y0 - 10 && y <= gx.y0 + gx.h + 10
        ? 'ic' : null;
    },
    down(id, x, y) { setIC(x, y); },
    move(id, x, y) { setIC(x, y); },
  });

  function setIC(x, y) {
    x0 = clamp(((x - gx.x0) / gx.w) * 2 * BOX - BOX, -BOX, BOX);
    y0 = clamp(BOX - ((y - gx.y0) / gx.h) * 2 * BOX, -BOX, BOX);
    rebuild();
    draw();
  }

  rebuild();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() { loop.stop(); },
  };
}
