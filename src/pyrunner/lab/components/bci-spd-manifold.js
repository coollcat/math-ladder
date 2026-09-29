/* SPD 流形上的脑电分类：2×2 协方差矩阵的形状部分（行列式固定为 1）与
   上半个平面一一对应，而仿射不变度量下的距离 = √2 × 双曲距离。
   在平面上拖动测试点，看「最近均值」分类怎么在一块弯曲的空间里切边界。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildToolbar, mkBtn,
  label, clamp, fmt,
} from '../core.js';

/* z = (u, v)，v > 0  ↔  行列式为 1 的 SPD 矩阵 */
function matOf(u, v) {
  return [[(u * u + v * v) / v, u / v], [u / v, 1 / v]];
}
/* SPD → （z, τ = ln det）：先除掉 √det，再取 z = (b + i)/c */
function zOf(A) {
  const dt = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const sc = Math.sqrt(dt);
  return { u: A[0][1] / A[1][1], v: sc / A[1][1], tau: Math.log(dt) };
}
function dH(p, q) {
  const du = p.u - q.u;
  const dv = p.v - q.v;
  return Math.acosh(Math.max(1 + (du * du + dv * dv) / (2 * p.v * q.v), 1));
}
/* 仿射不变距离：d² = 2·d_H² + (Δτ)²/2 */
function dAI(p, q) {
  return Math.sqrt(2 * dH(p, q) ** 2 + (p.tau - q.tau) ** 2 / 2);
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    u: spec.u ?? 1.6,        // 测试点的双曲坐标 u
    v: spec.v ?? 0.75,       // v > 0
    tau: spec.tau ?? 0,      // ln det
  };
  const A1 = spec.A1 || [[1, 0], [0, 1]];        // 类 1 的均值协方差
  const A2 = spec.A2 || [[3, 1], [1, 1]];        // 类 2
  const z1 = zOf(A1);
  const z2 = zOf(A2);

  const cv = setupCanvas(host, 360);
  const ro = buildReadout({
    测试点: '—', '到类 1 均值': '—', '到类 2 均值': '—', 判定: '—', 距离分解: '—',
  });
  host.appendChild(ro.box);

  const btnDiag = mkBtn('把测试点放到 diag(4,1)');
  btnDiag.addEventListener('click', () => {
    /* diag(4,1) 的形状是 diag(2, 0.5) → z = 2i，τ = ln 4 */
    s.u = 0; s.v = 2; s.tau = Math.log(4);
    syncSliders();
    draw();
  });
  host.appendChild(buildToolbar(btnDiag));

  const sl = buildSliders(
    {
      sliders: [
        { name: 'u', label: '测试点 u（实部）', min: -3, max: 3, step: 0.05, value: s.u, fmt: 2 },
        { name: 'v', label: '测试点 v（虚部 > 0）', min: 0.3, max: 3.5, step: 0.05, value: s.v, fmt: 2 },
        { name: 'tau', label: 'ln det（体积那一维）', min: -1.5, max: 1.5, step: 0.05, value: s.tau, fmt: 2 },
      ],
    },
    (x) => { s.u = x.u; s.v = Math.max(x.v, 0.12); s.tau = x.tau; draw(); },
  );
  const ranges = sl.box.querySelectorAll('input[type="range"]');
  function syncSliders() {
    [s.u, s.v, s.tau].forEach((val, i) => {
      if (!ranges[i]) return;
      ranges[i].value = String(val);
      const box = ranges[i].parentNode.querySelector('.ml-slider__val');
      if (box) box.textContent = fmt(val, 2);
    });
  }

  /* 视窗：u ∈ [-3.2, 3.2]，v ∈ [0.08, 4.2] */
  function view() {
    const W = cv.W;
    const H = cv.H;
    const padL = 42;
    const padR = 96;
    const padT = 30;
    const padB = 34;
    const pw = W - padL - padR;
    const ph = H - padT - padB;
    const u0 = -3.2;
    const u1 = 3.2;
    const v0 = 0.08;
    const v1 = 4.2;
    return {
      pw, ph, padL, padT, u0, u1, v0, v1,
      X: (u) => padL + ((u - u0) / (u1 - u0)) * pw,
      Y: (v) => padT + ph - ((v - v0) / (v1 - v0)) * ph,
    };
  }

  /* 双曲测地线：过两点、与实轴正交的圆（u 相同时退化成竖直线）。
     画布横竖比例不等，所以必须逐点参数化再映射，不能用 ctx.arc 直接画圆。 */
  function geoPts(p, q, n) {
    const pts = [];
    if (Math.abs(p.u - q.u) < 1e-4) {
      for (let i = 0; i <= n; i += 1) pts.push([p.u, 0.02 + (i / n) * 4.4]);
      return pts;
    }
    const c = (p.u * p.u + p.v * p.v - q.u * q.u - q.v * q.v) / (2 * (p.u - q.u));
    const r = Math.hypot(p.u - c, p.v);
    const a = Math.atan2(p.v, p.u - c);
    let b = Math.atan2(q.v, q.u - c);
    while (b - a > Math.PI) b -= 2 * Math.PI;
    while (a - b > Math.PI) b += 2 * Math.PI;
    for (let i = 0; i <= n; i += 1) {
      const t = a + ((b - a) * i) / n;
      pts.push([c + r * Math.cos(t), r * Math.sin(t)]);
    }
    return pts;
  }
  function geodesic(ctx, p, q, color, width, dash) {
    const V = view();
    const pts = geoPts(p, q, 48);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(([u, v], i) => {
      if (i === 0) ctx.moveTo(V.X(u), V.Y(v));
      else ctx.lineTo(V.X(u), V.Y(v));
    });
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const V = view();
    const test = { u: s.u, v: s.v, tau: s.tau };

    /* ---- 判定地图：先把底色涮一遍（固定 τ 的最近均值分类） ---- */
    const stepPx = 5;
    for (let px = V.padL; px < V.padL + V.pw; px += stepPx) {
      for (let py = V.padT; py < V.padT + V.ph; py += stepPx) {
        const u = V.u0 + ((px - V.padL) / V.pw) * (V.u1 - V.u0);
        const v = V.v0 + ((V.padT + V.ph - py) / V.ph) * (V.v1 - V.v0);
        const pt = { u, v, tau: s.tau };
        const c1 = dAI(pt, z1) <= dAI(pt, z2);
        ctx.fillStyle = c1
          ? (C.dark ? 'rgba(122,165,232,0.10)' : 'rgba(59,116,214,0.07)')
          : (C.dark ? 'rgba(217,154,78,0.10)' : 'rgba(232,135,30,0.07)');
        ctx.fillRect(px, py, stepPx, stepPx);
      }
    }

    /* ---- 双曲网格：竖直线 + 以实轴为直径的圆 ---- */
    ctx.save();
    ctx.beginPath();
    ctx.rect(V.padL, V.padT, V.pw, V.ph);
    ctx.clip();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let u = -6; u <= 6; u += 0.5) {
      if (V.X(u) < V.padL - 2 || V.X(u) > V.padL + V.pw + 2) continue;
      ctx.beginPath();
      ctx.moveTo(V.X(u), V.Y(V.v0));
      ctx.lineTo(V.X(u), V.Y(V.v1));
      ctx.stroke();
    }
    ctx.beginPath();
    [0.25, 0.5, 1, 2, 3.5, 6].forEach((r) => {
      for (let c = -8; c <= 8; c += 1) {
        for (let i = 0; i <= 30; i += 1) {
          const t = (Math.PI * i) / 30;
          const u = c + r * Math.cos(t);
          const v = r * Math.sin(t);
          if (v < V.v0 || u < V.u0 - 0.4 || u > V.u1 + 0.4) {
            ctx.moveTo(V.X(u), V.Y(v));
          } else {
            ctx.lineTo(V.X(u), V.Y(v));
          }
        }
      }
    });
    ctx.stroke();
    ctx.restore();

    /* ---- 实轴与边框 ---- */
    const yAxisPx = V.padT + V.ph;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(V.padL, yAxisPx);
    ctx.lineTo(V.padL + V.pw, yAxisPx);
    ctx.stroke();
    label(ctx, '实轴（v → 0：行列式被压扁到 0）', V.padL + 4, yAxisPx + 14, C.fg, { size: 10 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(V.padL + 0.5, V.padT + 0.5, V.pw, V.ph);

    /* ---- 两个类均值 + 它们之间的测地线 ---- */
    geodesic(ctx, z1, z2, C.named('gray'), 2, [6, 4]);
    [[z1, '类 1 均值', C.accent], [z2, '类 2 均值', C.accent2]].forEach(([z, nm, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(V.X(z.u), V.Y(z.v), 6, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, nm, V.X(z.u) + 9, V.Y(z.v) - 6, col, { size: 10, weight: 600 });
    });
    /* 到两类的测地线 */
    geodesic(ctx, test, z1, C.accent, 1.6, [3, 3]);
    geodesic(ctx, test, z2, C.accent2, 1.6, [3, 3]);

    /* ---- 测试点（可拖） ---- */
    const tx = V.X(test.u);
    const ty = V.Y(test.v);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, '测试协方差', tx + 10, ty + 4, C.bad, { size: 11, weight: 600 });
    label(ctx, '双曲平面（形状部分）—— 拖红点，或拖滑块改行列式', V.padL, 20, C.fg,
      { size: 11, weight: 600 });

    /* ---- 右栏：行列式那一维 ---- */
    const bx = V.padL + V.pw + 22;
    const bw = W - bx - 12;
    if (bw > 40) {
      const t0 = -1.6;
      const t1 = 1.6;
      const TY = (t) => V.padT + 10 + ((t1 - t) / (t1 - t0)) * (V.ph - 40);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, V.padT + 10);
      ctx.lineTo(bx + bw / 2, V.padT + V.ph - 30);
      ctx.stroke();
      [[z1, C.accent, 'τ₁'], [z2, C.accent2, 'τ₂'], [test, C.bad, 'τ']].forEach(([z, col, nm]) => {
        const y = TY(z.tau);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(bx + bw / 2, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        label(ctx, nm + ' = ' + fmt(z.tau, 2), bx + bw / 2 + 8, y + 4, col, { size: 10 });
      });
      label(ctx, 'ln det 轴', bx, V.padT - 2, C.fg, { size: 11, weight: 600 });
      label(ctx, '平行移动不改', bx, V.padT + V.ph - 16, C.fg, { size: 9 });
      label(ctx, '形状（仿射不变）', bx, V.padT + V.ph - 4, C.fg, { size: 9 });
    }

    /* ---- 读数 ---- */
    const d1 = dAI(test, z1);
    const d2 = dAI(test, z2);
    const shape1 = Math.SQRT2 * dH(test, z1);
    const shape2 = Math.SQRT2 * dH(test, z2);
    const A = matOf(test.u, test.v);
    const scale = Math.exp(test.tau / 2);
    ro.set('测试点', 'A = ' + fmt(scale * A[0][0], 2) + '×[[' + fmt(A[0][0], 2) + ', ' + fmt(A[0][1], 2)
      + '], [' + fmt(A[1][0], 2) + ', ' + fmt(A[1][1], 2) + ']]  det = ' + fmt(Math.exp(test.tau), 3));
    ro.set('到类 1 均值', fmt(d1, 4) + '（形状项 ' + fmt(shape1, 4) + '）');
    ro.set('到类 2 均值', fmt(d2, 4) + '（形状项 ' + fmt(shape2, 4) + '）');
    ro.set('判定', d1 <= d2 ? '判为类 1（离类 1 均值更近）' : '判为类 2');
    ro.set('距离分解', 'd² = 2d_H² + (Δln det)²/2；此处 Δτ = '
      + fmt(Math.abs(test.tau - z1.tau), 3) + ' / ' + fmt(Math.abs(test.tau - z2.tau), 3));
  }

  /* ---------- 拖动 ---------- */
  let dragging = false;
  function setPoint(ev) {
    const V = view();
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / rect.width);
    const y = (ev.clientY - rect.top) * (cv.canvas._H / rect.height);
    s.u = clamp(V.u0 + ((x - V.padL) / V.pw) * (V.u1 - V.u0), -3.2, 3.2);
    s.v = clamp(V.v0 + ((V.padT + V.ph - y) / V.ph) * (V.v1 - V.v0), 0.12, 4.2);
    syncSliders();
    draw();
  }
  function onDown(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / rect.width);
    const V = view();
    if (x < V.padL + V.pw + 6) { dragging = true; setPoint(ev); }
  }
  function onMove(ev) { if (dragging) setPoint(ev); }
  function onUp() { dragging = false; }
  cv.canvas.style.cursor = 'crosshair';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

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
