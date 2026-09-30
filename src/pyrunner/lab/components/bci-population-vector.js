/* 群体向量解码：一群偏好方向各异的神经元同时放电，把每个神经元的
   脉冲数当成「朝它偏好方向的投票」，加起来就是群体向量。
   拖真实方向，看估计箭头跟不跟得上；把偏好方向搅乱，看它开始偏。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildToolbar, buildSegmented, mkBtn,
  polyline, label, clamp, fmt,
  mulberry32,
  pointerXY,
  clearBg,
  poissonSample as poisson,
} from '../core.js';

const DEG = 180 / Math.PI;


export default function render(host, spec) {
  const C = themeColors();
  const s = {
    theta: spec.theta ?? 30,     // deg 真实方向
    N: spec.N ?? 8,              // 神经元个数
    b: spec.b ?? 5,              // sp/s 基线
    A: spec.A ?? 5,              // sp/s 调制深度
    T: spec.T ?? 0.4,            // s
    jitter: spec.jitter ?? 0,    // 偏好方向的不均匀程度
    gain: spec.gain ?? 2,        // mm/s 每个脉冲
    base: spec.base !== false,   // 是否扣掉基线计数 bT
  };
  const cv = setupCanvas(host, 370);
  const ro = buildReadout({
    真实方向: '—', 群体向量: '—', 方向误差: '—', '|PV| 与光标速度': '—', '最大似然估计': '—',
  });
  host.appendChild(ro.box);

  let seed = 20240918;
  const prefs = [];
  function layoutPrefs() {
    prefs.length = 0;
    for (let i = 0; i < s.N; i += 1) {
      /* jitter = 0 时严格均匀铺满一圈；调大就把间距搅乱 */
      const wob = s.jitter * 0.9 * Math.sin(i * 2.399963);
      prefs.push(-180 + (360 * (i + 0.5 + wob)) / s.N);
    }
  }
  const tune = (th, phi) => Math.max(0, s.b + s.A * Math.cos((th - phi) / DEG));

  let counts = [];
  function resample() {
    const rand = mulberry32(seed);
    counts = prefs.map((phi) => poisson(tune(s.theta, phi) * s.T, rand));
  }
  function pvOf(weighted) {
    let dx = 0;
    let dy = 0;
    prefs.forEach((phi, i) => {
      const w = weighted[i];
      dx += w * Math.cos(phi / DEG);
      dy += w * Math.sin(phi / DEG);
    });
    return { dx, dy, mag: Math.hypot(dx, dy), ang: Math.atan2(dy, dx) * DEG };
  }
  const expectedCounts = () => prefs.map((phi) => tune(s.theta, phi) * s.T);

  function mlEstimate() {
    let best = -Infinity;
    let bestTh = 0;
    for (let th = -180; th < 180; th += 1) {
      let ll = 0;
      prefs.forEach((phi, i) => {
        const f = Math.max(tune(th, phi), 1e-6);
        ll += counts[i] * Math.log(f) - s.T * f;
      });
      if (ll > best) { best = ll; bestTh = th; }
    }
    return bestTh;
  }

  const btn = mkBtn('重新抽样脉冲');
  btn.addEventListener('click', () => { seed += 977; resample(); draw(); });
  host.appendChild(buildToolbar(btn));
  host.appendChild(buildSegmented(
    [{ label: '扣掉基线 bT', value: 'on' }, { label: '不扣基线', value: 'off' }],
    s.base ? 'on' : 'off',
    (v) => { s.base = v === 'on'; draw(); },
  ));

  /* 投票权重：解码器该扣掉那份与方向无关的基线 */
  const weightsOf = (ks) => ks.map((k) => (s.base ? k - s.b * s.T : k));

  const sl = buildSliders(
    {
      sliders: [
        { name: 'theta', label: '真实方向 θ (°)', min: -180, max: 180, step: 1, value: s.theta, fmt: 0 },
        { name: 'N', label: '神经元个数 N', min: 4, max: 24, step: 2, value: s.N, fmt: 0 },
        { name: 'A', label: '调制深度 A (sp/s)', min: 1, max: 20, step: 0.5, value: s.A, fmt: 1 },
        { name: 'b', label: '基线 b (sp/s)', min: 0, max: 20, step: 0.5, value: s.b, fmt: 1 },
        { name: 'T', label: '观察窗 T (s)', min: 0.1, max: 2, step: 0.05, value: s.T, fmt: 2 },
        { name: 'jitter', label: '偏好方向不均匀度', min: 0, max: 1, step: 0.05, value: s.jitter, fmt: 2 },
      ],
    },
    (v) => {
      s.theta = v.theta; s.N = Math.round(v.N); s.A = v.A;
      s.b = v.b; s.T = v.T; s.jitter = v.jitter;
      layoutPrefs(); resample(); draw();
    },
  );
  const ranges = sl.box.querySelectorAll('input[type="range"]');

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    /* ===== 左：极坐标 ===== */
    const cx = Math.min(W * 0.24, 152);
    const cy = 160;
    const R = Math.min(cx - 16, 120);
    ctx.strokeStyle = C.grid;
    [0.33, 0.66, 1].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(cx - R - 6, cy);
    ctx.lineTo(cx + R + 6, cy);
    ctx.moveTo(cx, cy - R - 6);
    ctx.lineTo(cx, cy + R + 6);
    ctx.stroke();

    /* 每个神经元的偏好方向：长度 ∝ 本次脉冲数 */
    const maxK = Math.max(...counts, 1);
    prefs.forEach((phi, i) => {
      const a = phi / DEG;
      const rr = R * (0.12 + 0.88 * (counts[i] / maxK));
      polyline(ctx, [[cx, cy], [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]],
        C.named('teal'), 1.6);
      ctx.fillStyle = C.named('teal');
      ctx.beginPath();
      ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 2.6, 0, Math.PI * 2);
      ctx.fill();
    });

    /* 群体向量 */
    const pv = pvOf(weightsOf(counts));
    const pvExp = pvOf(weightsOf(expectedCounts()));
    const scale = Math.max(pvExp.mag, 1e-6);
    const vx = cx + (pv.dx / scale) * R * 0.95;
    const vy = cy + (pv.dy / scale) * R * 0.95;
    const ex = cx + (pvExp.dx / scale) * R * 0.95;
    const ey = cy + (pvExp.dy / scale) * R * 0.95;

    /* 真实方向 */
    const ta = s.theta / DEG;
    polyline(ctx, [[cx, cy], [cx + R * Math.cos(ta), cy + R * Math.sin(ta)]], C.accent2, 2);
    /* 期望群体向量（无噪声时应与真实方向重合） */
    polyline(ctx, [[cx, cy], [ex, ey]], C.named('gray'), 1.6, [5, 4]);
    /* 单次抽样的群体向量 */
    polyline(ctx, [[cx, cy], [vx, vy]], C.accent, 3);

    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(vx, vy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    if (Math.hypot(vx - cx, vy - cy) > 30) {
      label(ctx, 'PV', vx + 8, vy + 4, C.accent, { size: 11, weight: 600 });
    }
    label(ctx, '群体向量解码 —— 拖动画布转真实方向', 8, 22, C.fg, { size: 11, weight: 600 });
    label(ctx, '橙=真实方向  蓝=群体向量  灰虚线=期望值', 8, H - 8, C.fg, { size: 10 });

    /* ===== 右上：各神经元脉冲数 ===== */
    const rx = Math.max(cx + R + 24, W * 0.48);
    const rw = W - rx - 12;
    const by0 = 40;
    const by1 = 176;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(rx + 0.5, by0 + 0.5, rw, by1 - by0);
    const bw = rw / s.N;
    const kmax = Math.max(maxK, s.b * s.T * 2, 1);
    counts.forEach((k, i) => {
      const h = (k / kmax) * (by1 - by0 - 14);
      ctx.fillStyle = C.named('teal');
      ctx.fillRect(rx + i * bw + 1.5, by1 - h, Math.max(1.5, bw - 3), h);
    });
    const yBase = by1 - ((s.b * s.T) / kmax) * (by1 - by0 - 14);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = C.bad;
    ctx.beginPath();
    ctx.moveTo(rx, yBase);
    ctx.lineTo(rx + rw, yBase);
    ctx.stroke();
    ctx.restore();
    label(ctx, '各神经元脉冲数（红虚线 = 基线 b·T）', rx, by0 - 10, C.fg, { size: 11, weight: 600 });

    /* ===== 右下：群体向量长度随真实方向变化 ===== */
    const cy0 = 216;
    const cy1 = H - 40;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(rx + 0.5, cy0 + 0.5, rw, cy1 - cy0);
    const curve = [];
    for (let th = -180; th <= 180; th += 3) {
      const tmp = weightsOf(prefs.map((phi) => Math.max(0, s.b + s.A * Math.cos((th - phi) / DEG)) * s.T));
      const p = pvOf(tmp);
      curve.push([rx + ((th + 180) / 360) * rw, cy1 - (p.mag / (kmax * 0.6 + 1e-6)) * (cy1 - cy0 - 8)]);
    }
    polyline(ctx, curve, C.named('purple'), 2);
    const markX = rx + ((s.theta + 180) / 360) * rw;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(markX, cy0);
    ctx.lineTo(markX, cy1);
    ctx.stroke();
    ctx.restore();
    label(ctx, '|PV| 随真实方向起伏 —— 越平说明解码越「各向同性」', rx, cy0 - 10, C.fg,
      { size: 11, weight: 600 });
    label(ctx, '-180°', rx, cy1 + 13, C.fg, { size: 9 });
    label(ctx, '180°', rx + rw, cy1 + 13, C.fg, { size: 9, align: 'right' });

    /* ---------- 读数 ---------- */
    const err = ((pv.ang - s.theta + 540) % 360) - 180;
    const ml = mlEstimate();
    const mlErr = ((ml - s.theta + 540) % 360) - 180;
    ro.set('真实方向', fmt(s.theta, 1) + '°');
    ro.set('群体向量', fmt(pv.ang, 2) + '°（|PV| = ' + fmt(pv.mag, 3) + '）');
    ro.set('方向误差', fmt(err, 2) + '°（ML 估计 ' + fmt(ml, 0) + '°，误差 ' + fmt(mlErr, 1) + '°）');
    ro.set('|PV| 与光标速度', fmt(pv.mag * s.gain, 3) + ' mm/s（增益 ' + fmt(s.gain, 1)
      + (s.base ? '，已扣基线' : '，未扣基线') + '）');
    ro.set('最大似然估计', fmt(ml, 0) + '°');
  }

  /* ---------- 拖动 ---------- */
  let dragging = false;
  const cxOf = () => Math.min(cv.W * 0.24, 152);
  function setTheta(deg) {
    s.theta = Math.round(clamp(deg, -180, 180));
    if (ranges[0]) {
      ranges[0].value = String(s.theta);
      const v = ranges[0].parentNode.querySelector('.ml-slider__val');
      if (v) v.textContent = fmt(s.theta, 0);
    }
    resample();
    draw();
  }
  function onDown(ev) {
    const p = pointerXY(cv.canvas, ev);
    const dx = p.x - cxOf();
    const dy = p.y - 160;
    if (dx * dx + dy * dy < 150 * 150) {
      dragging = true;
      setTheta(Math.atan2(dy, dx) * DEG);
    }
  }
  function onMove(ev) {
    if (!dragging) return;
    const p = pointerXY(cv.canvas, ev);
    setTheta(Math.atan2(p.y - 160, p.x - cxOf()) * DEG);
  }
  function onUp() { dragging = false; }
  cv.canvas.style.cursor = 'crosshair';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  layoutPrefs();
  resample();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() {
      cv.canvas.removeEventListener('pointerdown', onDown);
      cv.canvas.removeEventListener('pointermove', onMove);
      cv.canvas.removeEventListener('pointerup', onUp);
      cv.canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
