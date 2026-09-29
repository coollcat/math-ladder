/* CSP 空间滤波：两通道脑电，两类任务各有自己的协方差椭圆。
   判别方向 w 可以拖——转一转就看见，只有一个角度让「类间方差比」
   w'Σ₁w / w'Σ₂w 冲到最大。那个角度就是广义特征向量。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout,
  polyline, label, clamp, fmt,
} from '../core.js';

const DEG = 180 / Math.PI;

function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussOf(rand) {
  const u1 = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
}
const mul2 = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
];
const tran2 = (A) => [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
const quad = (S, w) => w[0] * (S[0][0] * w[0] + S[0][1] * w[1]) + w[1] * (S[1][0] * w[0] + S[1][1] * w[1]);

/* 广义特征值：解 det(Σ₁ − λΣ₂) = 0，再取 (Σ₁ − λΣ₂) 的零向量 */
function cspAxes(S1, S2) {
  const a = S1[0][0]; const b = S1[0][1]; const c = S1[1][0]; const d = S1[1][1];
  const e = S2[0][0]; const f = S2[0][1]; const g = S2[1][0]; const h = S2[1][1];
  const A = e * h - f * g;
  const B = -(a * h + d * e - b * g - c * f);
  const Cc = a * d - b * c;
  const disc = Math.max(B * B - 4 * A * Cc, 0);
  const l1 = (-B + Math.sqrt(disc)) / (2 * A);
  const l2 = (-B - Math.sqrt(disc)) / (2 * A);
  const nullOf = (lam) => {
    const M = [
      [S1[0][0] - lam * S2[0][0], S1[0][1] - lam * S2[0][1]],
      [S1[1][0] - lam * S2[1][0], S1[1][1] - lam * S2[1][1]],
    ];
    const c1 = [-M[0][1], M[0][0]];
    const c2 = [M[1][1], -M[1][0]];
    const w = Math.hypot(c1[0], c1[1]) > Math.hypot(c2[0], c2[1]) ? c1 : c2;
    const n = Math.hypot(w[0], w[1]) || 1;
    return [w[0] / n, w[1] / n];
  };
  let w1 = nullOf(l1);
  if (w1[0] < 0 || (Math.abs(w1[0]) < 1e-12 && w1[1] < 0)) w1 = [-w1[0], -w1[1]];
  let ang = (Math.atan2(w1[1], w1[0]) * DEG + 180) % 180;
  return { l1, l2, w1, ang };
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    theta: spec.theta ?? 45,     // deg 两类协方差主轴的夹角（各转 ±θ）
    aspect: spec.aspect ?? 2,    // 主轴与次轴的标准差之比
    n: spec.n ?? 60,             // 每类样本数
    phi: spec.phi ?? 30,         // deg 当前判别方向
  };
  const SCALE = 2;               // σ₂² 基准

  const cv = setupCanvas(host, 380);
  const ro = buildReadout({
    当前方向: '—', '方差比 J(w)': '—', 对数方差差: '—', 广义特征值: '—', 最优方向: '—',
  });
  host.appendChild(ro.box);

  let cov = null;
  let data = null;
  function rebuild() {
    const t = s.theta / DEG;
    const ct = Math.cos(t);
    const sn = Math.sin(t);
    const R = [[ct, -sn], [sn, ct]];
    const v1 = SCALE * s.aspect * s.aspect;
    const v2 = SCALE;
    cov = {
      S1: mul2(mul2(R, [[v1, 0], [0, v2]]), tran2(R)),
      S2: mul2(mul2([[ct, sn], [-sn, ct]], [[v1, 0], [0, v2]]), tran2([[ct, sn], [-sn, ct]])),
    };
    const rand = rng(90210);
    data = [[], []];
    [cov.S1, cov.S2].forEach((S, ci) => {
      const L = [[Math.sqrt(S[0][0]), 0],
        [S[0][1] / Math.sqrt(S[0][0]), Math.sqrt(Math.max(S[1][1] - S[0][1] ** 2 / S[0][0], 1e-9))]];
      for (let i = 0; i < s.n; i += 1) {
        const g = [gaussOf(rand), gaussOf(rand)];
        data[ci].push([L[0][0] * g[0], L[1][0] * g[0] + L[1][1] * g[1]]);
      }
    });
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'phi', label: '判别方向 φ (°)', min: 0, max: 180, step: 1, value: s.phi, fmt: 0 },
        { name: 'theta', label: '两类主轴夹角 ±θ (°)', min: 0, max: 45, step: 1, value: s.theta, fmt: 0 },
        { name: 'aspect', label: '主轴 / 次轴 标准差比', min: 1, max: 3, step: 0.1, value: s.aspect, fmt: 1 },
        { name: 'n', label: '每类样本数', min: 20, max: 200, step: 10, value: s.n, fmt: 0 },
      ],
    },
    (v) => {
      const need = v.theta !== s.theta || v.aspect !== s.aspect || Math.round(v.n) !== s.n;
      s.phi = v.phi; s.theta = v.theta; s.aspect = v.aspect; s.n = Math.round(v.n);
      if (need) rebuild();
      draw();
    },
  );
  const ranges = sl.box.querySelectorAll('input[type="range"]');

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const ax = cx0data();
    const { S1, S2 } = cov;
    const w = [Math.cos(s.phi / DEG), Math.sin(s.phi / DEG)];
    const J = quad(S1, w) / Math.max(quad(S2, w), 1e-9);
    const opt = cspAxes(S1, S2);

    /* ===== 左：散点 + 协方差椭圆 + 判别方向 ===== */
    const cx = ax.cx;
    const cy = ax.cy;
    const k = ax.k;
    ctx.strokeStyle = C.grid;
    for (let g = -8; g <= 8; g += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + g * k, cy - 8 * k);
      ctx.lineTo(cx + g * k, cy + 8 * k);
      ctx.moveTo(cx - 8 * k, cy + g * k);
      ctx.lineTo(cx + 8 * k, cy + g * k);
      ctx.stroke();
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(cx - 8.4 * k, cy);
    ctx.lineTo(cx + 8.4 * k, cy);
    ctx.moveTo(cx, cy - 8.4 * k);
    ctx.lineTo(cx, cy + 8.4 * k);
    ctx.stroke();
    label(ctx, '通道 1', cx + 8.4 * k, cy + 14, C.fg, { size: 10, align: 'right' });
    label(ctx, '通道 2', cx + 6, cy - 8.4 * k - 4, C.fg, { size: 10 });

    /* 最优方向（浅色虚线）与当前方向 */
    const oa = opt.ang / DEG;
    polyline(ctx, [[cx - 9 * k * Math.cos(oa), cy + 9 * k * Math.sin(oa)],
      [cx + 9 * k * Math.cos(oa), cy - 9 * k * Math.sin(oa)]], C.named('gray'), 1.4, [6, 4]);

    data.forEach((pts, ci) => {
      const S = ci === 0 ? S1 : S2;
      const col = ci === 0 ? C.accent : C.accent2;
      ctx.fillStyle = col;
      pts.forEach((p) => {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx + p[0] * k, cy - p[1] * k, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* 1σ / 2σ 椭圆 */
      const tr = S[0][0] + S[1][1];
      const dt = S[0][0] * S[1][1] - S[0][1] ** 2;
      const gg = Math.sqrt(Math.max(tr * tr / 4 - dt, 0));
      const l1 = tr / 2 + gg;
      const l2 = Math.max(tr / 2 - gg, 1e-9);
      const ang = Math.abs(S[0][1]) > 1e-12 ? Math.atan2(l1 - S[0][0], S[0][1]) : 0;
      [1, 2].forEach((sig) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, sig * Math.sqrt(l1) * k, sig * Math.sqrt(l2) * k, 0, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = sig === 1 ? 1.8 : 1;
        ctx.globalAlpha = sig === 1 ? 1 : 0.45;
        ctx.stroke();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    });

    /* 判别方向 w（可拖） */
    polyline(ctx, [[cx - 9 * k * Math.cos(s.phi / DEG), cy + 9 * k * Math.sin(s.phi / DEG)],
      [cx + 9 * k * Math.cos(s.phi / DEG), cy - 9 * k * Math.sin(s.phi / DEG)]], C.bad, 2.6);
    const hx = cx + 8.2 * k * Math.cos(s.phi / DEG);
    const hy = cy - 8.2 * k * Math.sin(s.phi / DEG);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'w  φ = ' + fmt(s.phi, 0) + '°', hx + 9, hy + 4, C.bad, { size: 11, weight: 600 });
    label(ctx, '两类散点与 1σ/2σ 椭圆 —— 拖红点转判别方向', 10, 20, C.fg,
      { size: 11, weight: 600 });
    label(ctx, '灰虚线 = 广义特征向量（最优方向）', 10, H - 8, C.fg, { size: 10 });

    /* ===== 右上：J(φ) 曲线 ===== */
    const rx = cx + 9 * k + 24;
    const rw = W - rx - 12;
    if (rw > 80) {
      const jy0 = 34;
      const jy1 = 186;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(rx + 0.5, jy0 + 0.5, rw, jy1 - jy0);
      const vals = [];
      for (let p = 0; p <= 180; p += 2) {
        const ww = [Math.cos(p / DEG), Math.sin(p / DEG)];
        vals.push([p, quad(S1, ww) / Math.max(quad(S2, ww), 1e-9)]);
      }
      const vmax = Math.max(...vals.map((v) => v[1]), 1.001);
      const vmin = Math.min(...vals.map((v) => v[1]), 0);
      const XX = (p) => rx + (p / 180) * rw;
      const YY = (v) => jy1 - ((v - vmin) / Math.max(vmax - vmin, 1e-9)) * (jy1 - jy0 - 10) - 5;
      polyline(ctx, vals.map(([p, v]) => [XX(p), YY(v)]), C.named('purple'), 2);
      /* 峰值 */
      const peak = vals.reduce((a, b) => (b[1] > a[1] ? b : a));
      ctx.fillStyle = C.named('gray');
      ctx.beginPath();
      ctx.arc(XX(peak[0]), YY(peak[1]), 4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, '峰 ' + fmt(peak[1], 3) + ' @ ' + fmt(peak[0], 0) + '°', XX(peak[0]) + 6,
        YY(peak[1]) - 6, C.named('gray'), { size: 10 });
      /* 当前 */
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.bad;
      ctx.beginPath();
      ctx.moveTo(XX(s.phi), jy0);
      ctx.lineTo(XX(s.phi), jy1);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'J(φ) = wᵀΣ₁w / wᵀΣ₂w', rx, jy0 - 8, C.fg, { size: 11, weight: 600 });

      /* ===== 右下：沿 w 的投影分布 ===== */
      const py0 = 226;
      const py1 = H - 34;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(rx + 0.5, py0 + 0.5, rw, py1 - py0);
      const proj = data.map((pts) => pts.map((p) => p[0] * w[0] + p[1] * w[1]));
      const all = proj[0].concat(proj[1]);
      const lo = Math.min(...all);
      const hi = Math.max(...all);
      const span = Math.max(hi - lo, 1e-6);
      const BINS = 26;
      const hist = proj.map((arr) => {
        const h = new Array(BINS).fill(0);
        arr.forEach((v) => {
          const bi = clamp(Math.floor(((v - lo) / span) * BINS), 0, BINS - 1);
          h[bi] += 1;
        });
        return h;
      });
      const hmax = Math.max(...hist[0], ...hist[1], 1);
      const bw = rw / BINS;
      [0, 1].forEach((ci) => {
        hist[ci].forEach((v, i) => {
          const hgt = (v / hmax) * (py1 - py0 - 12);
          ctx.fillStyle = ci === 0 ? C.accent : C.accent2;
          ctx.globalAlpha = 0.65;
          ctx.fillRect(rx + i * bw + 1, py1 - hgt, Math.max(1, bw - 2), hgt);
        });
      });
      ctx.globalAlpha = 1;
      label(ctx, '投影到 w 上的一维分布（CSP 特征 = 对数方差）', rx, py0 - 8, C.fg,
        { size: 11, weight: 600 });
    }

    /* ---------- 读数 ---------- */
    const v1 = quad(S1, w);
    const v2 = quad(S2, w);
    ro.set('当前方向', 'φ = ' + fmt(s.phi, 0) + '°');
    ro.set('方差比 J(w)', fmt(J, 4) + '（类 1 方差 ' + fmt(v1, 3) + ' / 类 2 ' + fmt(v2, 3) + '）');
    ro.set('对数方差差', 'ln(v₁/v₂) = ' + fmt(Math.log(Math.max(v1, 1e-9) / Math.max(v2, 1e-9)), 4));
    ro.set('广义特征值', 'λ₁ = ' + fmt(opt.l1, 4) + '，λ₂ = ' + fmt(opt.l2, 4));
    ro.set('最优方向', fmt(opt.ang, 1) + '°（Σ₁w = λΣ₂w 的解）');
  }

  function cx0data() {
    const W = cv.W;
    const H = cv.H;
    const cx = Math.min(W * 0.27, 168);
    const cy = (H - 20) / 2 + 6;
    const k = Math.min((W * 0.5 - 34) / 17, (H - 40) / 17);
    return { cx, cy, k };
  }

  /* ---------- 拖动：转判别方向 ---------- */
  let dragging = false;
  function setPhi(deg) {
    s.phi = Math.round(((deg % 180) + 180) % 180);
    if (ranges[0]) {
      ranges[0].value = String(s.phi);
      const v = ranges[0].parentNode.querySelector('.ml-slider__val');
      if (v) v.textContent = fmt(s.phi, 0);
    }
    draw();
  }
  function local(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (cv.canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (cv.canvas._H / rect.height),
    };
  }
  function onDown(ev) {
    const p = local(ev);
    const ax = cx0data();
    if (p.x < ax.cx + 9 * ax.k + 12) {
      dragging = true;
      setPhi(Math.atan2(ax.cy - p.y, p.x - ax.cx) * DEG);
    }
  }
  function onMove(ev) {
    if (!dragging) return;
    const p = local(ev);
    const ax = cx0data();
    setPhi(Math.atan2(ax.cy - p.y, p.x - ax.cx) * DEG);
  }
  function onUp() { dragging = false; }
  cv.canvas.style.cursor = 'crosshair';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  rebuild();
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
