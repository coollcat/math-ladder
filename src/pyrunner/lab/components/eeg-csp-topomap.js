/* CSP 头皮地形图：把“空间滤波器方向”落到电极权重上。

   契约：
   { "type": "eeg-csp-topomap", "phi": 45 }

   这是双源教学头模型，不是个体源定位。左/右两个感觉运动源经导联场混合到
   19 个头皮电极；用户拖动源空间方向，实时看通道权重、投影输出和方差比。 */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildReadout,
  bindPointer, setSliderRow, label, polyline, fmt, clamp, clearBg, arrow,
} from '../core.js';

const BASE = [
  { name: 'phi', label: '滤波器方向 φ', min: 0, max: 180, step: 1, value: 15 },
];
const DEG = Math.PI / 180;

/* 19 个示意电极：外圈 + 内圈 + 中央。坐标为头皮俯视图 [-1,1]。 */
const ELECTRODES = [
  [-0.78, 0.00], [-0.60, 0.52], [-0.55, -0.52], [0.00, 0.78],
  [0.55, 0.52], [0.78, 0.00], [0.55, -0.52], [0.00, -0.78],
  [-0.28, 0.27], [0.28, 0.27], [-0.28, -0.27], [0.28, -0.27],
  [-0.42, 0.00], [0.42, 0.00], [0.00, 0.42], [0.00, -0.42],
  [-0.12, 0.12], [0.12, 0.12], [0.00, 0.00],
];
const SRC_L = [-0.34, 0.08];
const SRC_R = [0.34, 0.08];

function gain(pos, src) {
  const d2 = (pos[0] - src[0]) ** 2 + (pos[1] - src[1]) ** 2;
  return Math.exp(-d2 / 0.16);
}

const RAW_L = ELECTRODES.map((p) => gain(p, SRC_L));
const RAW_R = ELECTRODES.map((p) => gain(p, SRC_R));
const meanL = RAW_L.reduce((a, b) => a + b, 0) / RAW_L.length;
const P1 = RAW_L.map((v) => v - meanL);
const dot12 = P1.reduce((sum, v, i) => sum + v * RAW_R[i], 0);
const dot11 = P1.reduce((sum, v) => sum + v * v, 0) || 1;
const P2 = RAW_R.map((v, i) => v - (dot12 / dot11) * P1[i]);
const norm1 = Math.sqrt(dot11);
const norm2 = Math.sqrt(P2.reduce((sum, v) => sum + v * v, 0)) || 1;
const G_L = P1.map((v) => v / norm1);
const G_R = P2.map((v) => v / norm2);

function projection(phi) {
  const c = Math.cos(phi * DEG);
  const s = Math.sin(phi * DEG);
  const w = G_L.map((g, i) => c * g + s * G_R[i]);
  const vl = G_L.reduce((sum, g, i) => sum + w[i] * g, 0);
  const vr = G_R.reduce((sum, g, i) => sum + w[i] * g, 0);
  const ratio = (vl * vl + 1e-8) / (vr * vr + 1e-8);
  return { w, vl, vr, ratio, angle: phi };
}

export default function render(host, spec) {
  const C = themeColors();
  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    () => draw(),
  );
  const ro = buildReadout({
    '左源输出': '—',
    '右源输出': '—',
    '方差比 J': '—',
  });
  host.appendChild(ro.box);

  const cv = setupCanvas(host, 350);
  const geo = { cx: 0, cy: 0, R: 0, dx: 0, dy: 0, dr: 0 };

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const phi = sliders.state.phi;
    const p = projection(phi);
    const topX = Math.min(W * 0.44, 350);
    const topY = H * 0.49;
    const R = Math.min(topX * 0.38, H * 0.37);

    /* 左侧：头皮俯视图与电极权重。 */
    const cx = topX * 0.50;
    const cy = topY;
    geo.cx = cx;
    geo.cy = cy;
    geo.R = R;
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    /* 鼻子与双耳，给出头皮方向。 */
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.15, cy - R * 0.96);
    ctx.lineTo(cx, cy - R * 1.10);
    ctx.lineTo(cx + R * 0.15, cy - R * 0.96);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - R * 1.05, cy, R * 0.12, -Math.PI / 2, Math.PI / 2);
    ctx.arc(cx + R * 1.05, cy, R * 0.12, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();
    ctx.restore();

    const maxW = Math.max(...p.w.map(Math.abs), 1e-6);
    const maxR = R * 0.92;
    ELECTRODES.forEach((pos, i) => {
      const x = cx + pos[0] * maxR;
      const y = cy - pos[1] * maxR;
      const v = p.w[i] / maxW;
      const col = v >= 0 ? C.named('orange') : C.named('blue');
      const rad = 4.2 + 5.2 * Math.abs(v);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(v);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    label(ctx, '头皮俯视图 · 点大小 = |通道权重|', cx, 18, C.fg, {
      size: 11,
      weight: 700,
      align: 'center',
    });
    label(ctx, '橙 = 正权重', 10, H - 34, C.named('orange'), { size: 10 });
    label(ctx, '蓝 = 负权重', 10, H - 16, C.named('blue'), { size: 10 });

    /* 右侧上：源空间罗盘，可直接拖方向。 */
    const dx = W * 0.72;
    const dy = 72;
    const dr = Math.min((W - dx) * 0.52, 78);
    geo.dx = dx;
    geo.dy = dy;
    geo.dr = dr;
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.moveTo(dx - dr, dy);
    ctx.lineTo(dx + dr, dy);
    ctx.moveTo(dx, dy - dr);
    ctx.lineTo(dx, dy + dr);
    ctx.stroke();
    const sxL = dx - dr * 0.52;
    const sxR = dx + dr * 0.52;
    ctx.fillStyle = C.named('orange');
    ctx.beginPath();
    ctx.arc(sxL, dy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.named('blue');
    ctx.beginPath();
    ctx.arc(sxR, dy, 5, 0, Math.PI * 2);
    ctx.fill();
    const hx = dx - Math.cos(phi * DEG) * dr * 0.72;
    const hy = dy - Math.sin(phi * DEG) * dr * 0.72;
    arrow(ctx, dx, dy, hx, hy, C.named('red'), 2.5, 8);
    label(ctx, '左源', sxL, dy + 18, C.named('orange'), { size: 9.5, align: 'center' });
    label(ctx, '右源', sxR, dy + 18, C.named('blue'), { size: 9.5, align: 'center' });
    label(ctx, '拖这里改方向', dx, dy + dr + 20, C.axis, {
      size: 9.5,
      align: 'center',
    });

    /* 右侧中：投影输出。 */
    const bx = dx - dr;
    const by = dy + dr + 44;
    const bw = dr * 2;
    const maxOut = Math.max(Math.abs(p.vl), Math.abs(p.vr), 0.1);
    const bar = (yy, value, color, name) => {
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, yy, bw, 14);
      ctx.fillStyle = color;
      const len = (Math.abs(value) / maxOut) * bw;
      if (value >= 0) ctx.fillRect(bx, yy, len, 14);
      else ctx.fillRect(bx + bw - len, yy, len, 14);
      label(ctx, name, bx - 6, yy + 11, C.fg, { size: 9.5, align: 'right' });
      label(ctx, fmt(value, 2), bx + bw, yy - 4, C.axis, { size: 9, align: 'right' });
    };
    label(ctx, 'wᵀ·两类源模式', bx, by - 8, C.fg, { size: 10.5, weight: 700 });
    bar(by, p.vl, C.named('orange'), '类 1');
    bar(by + 30, p.vr, C.named('blue'), '类 2');

    /* 右侧下：J(φ) 曲线。 */
    const jy0 = by + 76;
    const jy1 = Math.min(H - 24, jy0 + 88);
    label(ctx, 'J(φ) = 类 1 方差 / 类 2 方差', bx, jy0 - 8, C.fg, {
      size: 10.5,
      weight: 700,
    });
    const vals = [];
    for (let d = 0; d <= 180; d += 2) vals.push([d, projection(d).ratio]);
    const lo = Math.log(Math.min(...vals.map((v) => v[1]), 0.2));
    const hi = Math.log(Math.max(...vals.map((v) => v[1]), 5));
    const X = (d) => bx + (d / 180) * bw;
    const Y = (v) => jy1 - ((Math.log(Math.max(v, 1e-5)) - lo) / Math.max(hi - lo, 1e-6)) * (jy1 - jy0);
    polyline(ctx, vals.map(([d, v]) => [X(d), Y(v)]), C.named('purple'), 2);
    ctx.save();
    ctx.strokeStyle = C.named('red');
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(phi), jy0);
    ctx.lineTo(X(phi), jy1);
    ctx.stroke();
    ctx.restore();

    ro.set('左源输出', fmt(p.vl, 3));
    ro.set('右源输出', fmt(p.vr, 3));
    ro.set('方差比 J', fmt(p.ratio, 3));
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      return Math.hypot(x - geo.dx, y - geo.dy) <= geo.dr + 16 ? 'dial' : null;
    },
    hover(x, y) {
      cv.canvas.style.cursor =
        Math.hypot(x - geo.dx, y - geo.dy) <= geo.dr + 16 ? 'grab' : 'default';
    },
    leave() {
      cv.canvas.style.cursor = 'default';
    },
    move(id, x, y) {
      if (id !== 'dial') return;
      const deg = clamp((Math.atan2(geo.dy - y, x - geo.dx) / DEG + 180) % 180, 0, 180);
      setSliderRow(sliders, 0, Math.round(deg), 0, 'phi');
      draw();
    },
  });

  cv.redraw = draw;
  draw();
  return { slidersBox: sliders.box };
}
