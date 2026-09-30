/* 调谐曲线 + 泊松脉冲栅格：一个神经元对某个方向「偏好」到什么程度，
   写成一条曲线；真实放电是这条曲线驱动的泊松点过程。拖方向箭头，
   看栅格重掷、看 Fisher 信息怎么随「离偏好方向多远」起落。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout,
  polyline, label, clamp, fmt,
  pois,
  mulberry32,
  clearBg,
} from '../core.js';

const DEG = 180 / Math.PI;

function wrapDeg(d) {
  let x = ((d + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    sigma: spec.sigma ?? 30,     // deg 调谐宽度
    rmax: spec.rmax ?? 50,       // sp/s 峰值发放率
    T: spec.T ?? 1.0,            // s 观察窗
    theta: spec.theta ?? 40,     // deg 刺激方向
    pref: spec.pref ?? 0,        // deg 偏好方向
  };
  const cv = setupCanvas(host, 370);
  const ro = buildReadout({
    发放率: '—', 期望计数: '—', 实测均值: '—', 'Fisher 信息': '—', '信息上界': '—',
  });
  host.appendChild(ro.box);

  const rate = (th) => s.rmax * Math.exp(-(wrapDeg(th - s.pref) ** 2) / (2 * s.sigma ** 2));

  /* ---------- 栅格重掷 ---------- */
  const TRIALS = 22;
  const DT = 0.004;
  let raster = [];
  let counts = [];
  function respike() {
    const nb = Math.max(2, Math.round(s.T / DT));
    const seed = (Math.round(s.theta * 7 + s.pref * 13) * 131
      + Math.round(s.sigma * 17 + s.rmax * 3 + s.T * 1000)) >>> 0;
    const rand = mulberry32(seed || 1);
    const p = clamp(rate(s.theta) * DT, 0, 1);
    raster = [];
    counts = [];
    for (let j = 0; j < TRIALS; j += 1) {
      const row = [];
      for (let i = 0; i < nb; i += 1) if (rand() < p) row.push(i * DT);
      raster.push(row);
      counts.push(row.length);
    }
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'theta', label: '刺激方向 θ (°)', min: -180, max: 180, step: 1, value: s.theta, fmt: 0 },
        { name: 'sigma', label: '调谐宽度 σ (°)', min: 5, max: 60, step: 1, value: s.sigma, fmt: 0 },
        { name: 'rmax', label: '峰值发放率 (sp/s)', min: 10, max: 100, step: 1, value: s.rmax, fmt: 0 },
        { name: 'T', label: '观察窗 T (s)', min: 0.2, max: 2, step: 0.05, value: s.T, fmt: 2 },
      ],
    },
    (v) => { s.theta = v.theta; s.sigma = v.sigma; s.rmax = v.rmax; s.T = v.T; respike(); draw(); },
  );
  const ranges = sl.box.querySelectorAll('input[type="range"]');

  /* ---------- 画 ---------- */
  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    /* ===== 左：极坐标调谐曲线 ===== */
    const cx = Math.min(W * 0.23, 150);
    const cy = 156;
    const R = Math.min(cx - 16, 116);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach((f) => {
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

    /* 调谐曲线本体：半径 ∝ r(θ) */
    const lobe = [];
    for (let d = -180; d <= 180; d += 2) {
      const rr = (rate(d) / s.rmax) * R;
      const a = (d - 90) / DEG;
      lobe.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lobe[0][0], lobe[0][1]);
    lobe.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = C.dark ? 'rgba(122,165,232,0.18)' : 'rgba(59,116,214,0.14)';
    ctx.fill();
    ctx.restore();
    polyline(ctx, lobe.concat([lobe[0]]), C.accent, 2);

    /* 偏好方向 */
    const pa = (s.pref - 90) / DEG;
    polyline(ctx, [[cx, cy], [cx + R * Math.cos(pa), cy + R * Math.sin(pa)]], C.named('gray'), 1.4, [4, 3]);
    label(ctx, '偏好 ' + fmt(s.pref, 0) + '°',
      cx + (R + 6) * Math.cos(pa), cy + (R + 6) * Math.sin(pa), C.named('gray'), { size: 9 });

    /* 刺激方向（可拖） */
    const ta = (s.theta - 90) / DEG;
    const tx = cx + R * Math.cos(ta);
    const ty = cy + R * Math.sin(ta);
    polyline(ctx, [[cx, cy], [tx, ty]], C.bad, 2.4);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(tx, ty, 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'θ = ' + fmt(s.theta, 0) + '°', tx + 9, ty + 4, C.bad, { size: 11, weight: 600 });
    label(ctx, '调谐曲线 r(θ) —— 拖圆上的红点转方向', 8, 22, C.fg, { size: 11, weight: 600 });

    /* ===== 右上：脉冲栅格 ===== */
    const rx = Math.max(cx + R + 26, W * 0.47);
    const rw = W - rx - 12;
    const ry0 = 36;
    const ry1 = 158;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(rx + 0.5, ry0 + 0.5, rw, ry1 - ry0);
    const TX = (t) => rx + (t / s.T) * rw;
    const dy = (ry1 - ry0) / TRIALS;
    raster.forEach((row, j) => {
      const y = ry0 + j * dy;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + rw, y);
      ctx.stroke();
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      row.forEach((t) => {
        ctx.moveTo(TX(t), y + 1);
        ctx.lineTo(TX(t), y + dy - 1);
      });
      ctx.stroke();
    });
    label(ctx, '脉冲栅格（22 次试验，每行一次）', rx, ry0 - 10, C.fg, { size: 11, weight: 600 });
    label(ctx, '0', rx, ry1 + 12, C.fg, { size: 9 });
    label(ctx, fmt(s.T, 2) + ' s', rx + rw, ry1 + 12, C.fg, { size: 9, align: 'right' });

    /* ===== 右下：计数分布 ===== */
    const hy0 = 206;
    const hy1 = H - 30;
    const lam = rate(s.theta) * s.T;
    const kmax = clamp(Math.ceil(lam + 4 * Math.sqrt(lam) + 2), 6, 40);
    const pmf = [];
    for (let k = 0; k <= kmax; k += 1) pmf.push(pois(k, lam));
    const pmax = Math.max(...pmf, 1e-6);
    const bw = rw / (kmax + 1);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(rx + 0.5, hy0 + 0.5, rw, hy1 - hy0);
    pmf.forEach((p, k) => {
      const h = (p / pmax) * (hy1 - hy0 - 16);
      ctx.fillStyle = C.accent2;
      ctx.fillRect(rx + k * bw + 1.5, hy1 - h, Math.max(1.5, bw - 3), h);
    });
    /* 实测计数刻度（每次试验一根短竖线） */
    const mean = counts.reduce((a, b) => a + b, 0) / TRIALS;
    counts.forEach((k) => {
      const x = rx + clamp(k, 0, kmax) * bw + bw / 2;
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, hy1);
      ctx.lineTo(x, hy1 - 9);
      ctx.stroke();
    });
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = C.bad;
    ctx.beginPath();
    ctx.moveTo(rx + (clamp(lam, 0, kmax) + 0.5) * bw, hy0);
    ctx.lineTo(rx + (clamp(lam, 0, kmax) + 0.5) * bw, hy1);
    ctx.stroke();
    ctx.restore();
    label(ctx, '计数分布 Poisson(λ = r·T = ' + fmt(lam, 2) + ')', rx, hy0 - 10, C.fg,
      { size: 11, weight: 600 });
    label(ctx, '紫刻度 = 各次试验实测计数', rx + rw, hy0 - 10, C.named('purple'),
      { size: 10, align: 'right' });

    /* ---------- 读数 ---------- */
    const f = rate(s.theta);
    const u = wrapDeg(s.theta - s.pref);
    const J = f > 0 ? (s.T * f * (u / (s.sigma * s.sigma)) ** 2) : 0;
    const Jmax = (2 * s.T * s.rmax) / (Math.E * s.sigma * s.sigma);
    ro.set('发放率', fmt(f, 2) + ' sp/s（峰值 ' + fmt(s.rmax, 0) + '）');
    ro.set('期望计数', 'λ = ' + fmt(lam, 3) + ' 个脉冲');
    ro.set('实测均值', fmt(mean, 2) + ' 个脉冲');
    ro.set('Fisher 信息', fmt(J, 4) + ' /deg²（离偏好 ' + fmt(u, 0) + '°）');
    ro.set('信息上界', fmt(Jmax, 4) + ' = 2T·rmax/(e·σ²)');
  }

  /* ---------- 拖动：极坐标里转刺激方向 ---------- */
  let dragging = false;
  const cxOf = () => Math.min(cv.W * 0.23, 150);
  function setTheta(deg) {
    s.theta = Math.round(clamp(deg, -180, 180));
    if (ranges[0]) {
      ranges[0].value = String(s.theta);
      const v = ranges[0].parentNode.querySelector('.ml-slider__val');
      if (v) v.textContent = fmt(s.theta, 0);
    }
    respike();
    draw();
  }
  function onDown(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / rect.width);
    const y = (ev.clientY - rect.top) * (cv.canvas._H / rect.height);
    const dx = x - cxOf();
    const dy2 = y - 156;
    if (dx * dx + dy2 * dy2 < 150 * 150) {
      dragging = true;
      setTheta(Math.atan2(dy2, dx) * DEG + 90);
    }
  }
  function onMove(ev) {
    if (!dragging) return;
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / rect.width);
    const y = (ev.clientY - rect.top) * (cv.canvas._H / rect.height);
    setTheta(Math.atan2(y - 156, x - cxOf()) * DEG + 90);
  }
  function onUp() { dragging = false; }
  cv.canvas.style.cursor = 'crosshair';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  respike();
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
