/* 闭环脑机接口：刺激器按解码结果反过来驱动脑区，
   递推式是 x_{t+1} = a·x_t − g·x_{t−τ}。增益 g 拖过头（或者延迟 τ 变大），
   闭环就从「压住扰动」翻成「自激振荡」。下格的稳定边界是数值扫出来的。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout, buildSegmented,
  polyline, label, clamp, fmt,
  clearBg,
  lcg,
  gaussOf,
} from '../core.js';

const NSTEP = 4000;

/* 递推 n 步，返回扰动是否在衰减（衰减 = 闭环稳定）。
   判据不能用「有没有超过某个大数」——靠近边界时增长极慢，
   固定步数内根本涨不到阈值（τ=0 时会把 1.905 误判成稳定）。
   改成比较前后两半的包络峰值：稳定 ⟺ 后半段峰值更小。 */
function bounded(a, g, tau, n) {
  const x = new Array(tau + 1).fill(0);
  x[tau] = 1;
  const half = n >> 1;
  let m1 = 0;
  let m2 = 0;
  for (let i = 0; i < n; i += 1) {
    const nxt = a * x[tau] - g * x[0];
    if (!isFinite(nxt) || Math.abs(nxt) > 1e12) return false;
    const av = Math.abs(nxt);
    if (i < half) { if (av > m1) m1 = av; } else if (av > m2) m2 = av;
    x.shift();
    x.push(nxt);
  }
  return m2 < m1;
}
/* 二分扫出给定延迟下还能稳住的增益上界 */
function gainMax(a, tau) {
  let lo = 0;
  let hi = 4;
  if (bounded(a, hi, tau, 400)) return hi;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (bounded(a, mid, tau, NSTEP)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    a: spec.a ?? 0.9,      // 脑区自身的衰减系数
    g: spec.g ?? 0.8,      // 反馈增益
    tau: spec.tau ?? 2,    // 反馈延迟（采样点）
    noise: spec.noise ?? 0.02,
    mode: spec.mode || 'loop',   // loop = 闭环；ident = 开环辨识
  };
  const cv = setupCanvas(host, 380);
  const ro = buildReadout({
    真实极点: '—', 辨识结果: '—', '稳定上界 g_max': '—', 判定: '—', 最近峰值: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '闭环刺激', value: 'loop' }, { label: '开环辨识', value: 'ident' }],
    s.mode,
    (v) => { s.mode = v; reset(); draw(); },
  ));

  const st = { buf: [], delay: [], t: 0, peak: 0, est: null, sumXY: 0, sumX: 0, sumY: 0, sumXX: 0, cnt: 0 };
  let map = [];

  const rand = lcg(4242, true);
  const gauss = () => gaussOf(rand);

  function rebuildMap() {
    map = [];
    for (let tau = 0; tau <= 8; tau += 1) map.push([tau, gainMax(s.a, tau)]);
  }

  function reset() {
    st.buf = [];
    st.delay = new Array(s.tau + 1).fill(0);
    st.delay[s.tau] = 1;         // 初始扰动：敲一下看它怎么回去
    st.t = 0;
    st.peak = 0;
    st.est = null;
    st.sumXY = 0; st.sumX = 0; st.sumY = 0; st.sumXX = 0; st.cnt = 0;
    for (let i = 0; i < 120; i += 1) step();   // 预热，先跑出一段波形
  }

  function step() {
    const g = s.mode === 'ident' ? 0 : s.g;
    const tau = Math.round(s.tau);
    const nxt = s.a * st.delay[tau] - g * st.delay[0] + s.noise * gauss();
    st.delay.shift();
    st.delay.push(nxt);
    st.t += 1;
    if (Math.abs(nxt) > st.peak) st.peak = Math.abs(nxt);
    st.buf.push(nxt);
    if (st.buf.length > 320) st.buf.shift();
    /* 开环辨识：对 ln|y| 与 t 做最小二乘，斜率就是 ln a */
    if (s.mode === 'ident' && st.t <= 80 && Math.abs(nxt) > 1e-4) {
      const yy = Math.log(Math.abs(nxt));
      st.sumX += st.t; st.sumY += yy; st.sumXY += st.t * yy; st.sumXX += st.t * st.t; st.cnt += 1;
      if (st.cnt > 3) {
        const den = st.cnt * st.sumXX - st.sumX * st.sumX;
        if (Math.abs(den) > 1e-9) {
          const slope = (st.cnt * st.sumXY - st.sumX * st.sumY) / den;
          st.est = Math.exp(slope);
        }
      }
    }
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    /* ===== 上：时域波形 ===== */
    const gx = 46;
    const gw = W - gx - 16;
    const y0 = 28;
    const y1 = 200;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(gx + 0.5, y0 + 0.5, gw, y1 - y0);
    const span = 2.2;
    const Xn = (i) => gx + (i / Math.max(st.buf.length - 1, 1)) * gw;
    const Yn = (v) => (y0 + y1) / 2 - (clamp(v, -span, span) / span) * ((y1 - y0) / 2 - 4);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Yn(0));
    ctx.lineTo(gx + gw, Yn(0));
    ctx.stroke();
    polyline(ctx, st.buf.map((v, i) => [Xn(i), Yn(v)]), C.accent, 1.8);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = C.bad;
    [0.8, -0.8].forEach((e) => {
      ctx.beginPath();
      ctx.moveTo(gx, Yn(e));
      ctx.lineTo(gx + gw, Yn(e));
      ctx.stroke();
    });
    ctx.restore();
    label(ctx, s.mode === 'ident'
      ? '开环辨识：撤掉刺激，看扰动怎么自由衰减（红虚线 = ±0.8）'
      : '闭环波形（红虚线 = ±0.8）—— 拖增益把它顶出去就自激', gx, y0 - 10, C.fg,
    { size: 11, weight: 600 });
    label(ctx, '0', gx - 6, Yn(0) + 4, C.fg, { size: 9, align: 'right' });

    /* ===== 下：稳定边界图 ===== */
    const by0 = 236;
    const by1 = H - 34;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(gx + 0.5, by0 + 0.5, gw, by1 - by0);
    const TMAX = 8;
    const GMAX = 2.5;
    const XT = (tau) => gx + (tau / TMAX) * gw;
    const YG = (g) => by1 - (clamp(g, 0, GMAX) / GMAX) * (by1 - by0 - 8);
    /* 阴影：边界以上是不稳定区 */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(XT(0), YG(GMAX));
    map.forEach(([tau, gm]) => ctx.lineTo(XT(tau), YG(gm)));
    ctx.lineTo(XT(TMAX), YG(GMAX));
    ctx.closePath();
    ctx.fillStyle = C.dark ? 'rgba(232,131,123,0.16)' : 'rgba(209,72,63,0.10)';
    ctx.fill();
    ctx.restore();
    polyline(ctx, map.map(([tau, gm]) => [XT(tau), YG(gm)]), C.named('purple'), 2.2);
    map.forEach(([tau, gm]) => {
      ctx.fillStyle = C.named('purple');
      ctx.beginPath();
      ctx.arc(XT(tau), YG(gm), 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
    /* 当前工作点 */
    const cur = map[clamp(Math.round(s.tau), 0, 8)] ? map[clamp(Math.round(s.tau), 0, 8)][1] : 0;
    const over = s.mode === 'loop' && s.g > cur;
    ctx.fillStyle = over ? C.bad : C.named('green');
    ctx.beginPath();
    ctx.arc(XT(s.tau), YG(s.g), 6.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'g = ' + fmt(s.g, 2) + '，τ = ' + fmt(s.tau, 0) + ' —— 边界 g_max = ' + fmt(cur, 3),
      gx, by0 - 10, C.fg, { size: 11, weight: 600 });
    label(ctx, '延迟 τ（采样点）', gx + gw, by1 + 14, C.fg, { size: 9, align: 'right' });
    label(ctx, '2.5', gx - 6, YG(2.5) + 4, C.fg, { size: 9, align: 'right' });
    label(ctx, '0', gx - 6, YG(0) + 4, C.fg, { size: 9, align: 'right' });
    label(ctx, '上阴影 = 不稳定区（直接拖圆点改参数）', gx + 6, by0 + 14, C.fg,
      { size: 10, weight: 600 });

    /* ---------- 读数 ---------- */
    const recent = st.buf.slice(-40);
    const peak = recent.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    ro.set('真实极点', 'a = ' + fmt(s.a, 3));
    ro.set('辨识结果', st.est == null ? '（切到「开环辨识」看最小二乘拟合）'
      : 'â = ' + fmt(st.est, 4) + '（误差 ' + fmt(Math.abs(st.est - s.a) * 100, 2) + '%）');
    ro.set('稳定上界 g_max', fmt(cur, 4) + '（τ = ' + fmt(s.tau, 0) + '）'
      + (s.tau === 0 ? ' —— 恰好 1 + a' : s.tau === 1 ? ' —— 恰好 1' : ''));
    ro.set('判定', s.mode === 'ident' ? '开环：刺激关掉，只在辨识'
      : over ? '⚠ 已越过稳定边界：闭环自激' : '闭环稳定：扰动被压回去');
    ro.set('最近峰值', fmt(peak, 3));
  }

  const controls = anim(host, {
    onTick() {
      for (let i = 0; i < 2; i += 1) step();
      draw();
    },
    onReset: () => { reset(); draw(); },
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'g', label: '反馈增益 g', min: 0, max: 2.5, step: 0.02, value: s.g, fmt: 2 },
        { name: 'tau', label: '反馈延迟 τ（采样点）', min: 0, max: 8, step: 1, value: s.tau, fmt: 0 },
        { name: 'a', label: '脑区极点 a', min: 0.5, max: 0.99, step: 0.01, value: s.a, fmt: 2 },
        { name: 'noise', label: '观测/刺激噪声 σ', min: 0, max: 0.2, step: 0.005, value: s.noise, fmt: 3 },
      ],
    },
    (v) => {
      const aChanged = v.a !== s.a;
      s.g = v.g; s.tau = Math.round(v.tau); s.a = v.a; s.noise = v.noise;
      if (aChanged) rebuildMap();
      if (Math.round(v.tau) !== st.delay.length - 1) reset();
      draw();
    },
  );
  const ranges = sl.box.querySelectorAll('input[type="range"]');

  /* ---------- 拖动：在稳定边界图上直接挪工作点 ---------- */
  let dragging = false;
  function setPoint(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / rect.width);
    const y = (ev.clientY - rect.top) * (cv.canvas._H / rect.height);
    if (y < 220) return;
    const gx2 = 46;
    const gw2 = cv.W - gx2 - 16;
    const by0 = 236;
    const by1 = cv.H - 34;
    const tau = clamp(Math.round(((x - gx2) / gw2) * 8), 0, 8);
    const g = clamp(((by1 - y) / (by1 - by0 - 8)) * 2.5, 0, 2.5);
    const tauChanged = tau !== s.tau;
    s.tau = tau;
    s.g = Math.round(g * 50) / 50;
    if (ranges[0]) {
      ranges[0].value = String(s.g);
      const v0 = ranges[0].parentNode.querySelector('.ml-slider__val');
      if (v0) v0.textContent = fmt(s.g, 2);
    }
    if (ranges[1]) {
      ranges[1].value = String(s.tau);
      const v1 = ranges[1].parentNode.querySelector('.ml-slider__val');
      if (v1) v1.textContent = fmt(s.tau, 0);
    }
    if (tauChanged) reset();
    draw();
  }
  function onDown(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    const y = (ev.clientY - rect.top) * (cv.canvas._H / rect.height);
    if (y > 220) { dragging = true; setPoint(ev); }
  }
  function onMove(ev) { if (dragging) setPoint(ev); }
  function onUp() { dragging = false; }
  cv.canvas.style.cursor = 'crosshair';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  rebuildMap();
  reset();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() {
      controls.stop();
      cv.canvas.removeEventListener('pointerdown', onDown);
      cv.canvas.removeEventListener('pointermove', onMove);
      cv.canvas.removeEventListener('pointerup', onUp);
      cv.canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
