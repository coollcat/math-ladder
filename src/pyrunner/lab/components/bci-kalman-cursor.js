/* 卡尔曼解码光标：四状态匀速模型（x, y, vx, vy），神经观测是带噪的位置。
   预测—更新两步每帧跑一遍，粉色椭圆就是当前位置协方差（2σ）。
   拖过程噪声 q / 观测噪声 r，看滤波器是「跟着噪声抖」还是「懒得动」。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout,
  label, clamp, fmt,
} from '../core.js';

const N = 4;                 // 状态数
const DT = 0.05;             // s 每帧步长

/* ---- 极简矩阵工具（够用即可，不求通用） ---- */
function mmul(A, B) {
  const rows = A.length;
  const inner = B.length;
  const cols = B[0].length;
  const C = [];
  for (let i = 0; i < rows; i += 1) {
    const row = new Array(cols).fill(0);
    for (let k = 0; k < inner; k += 1) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < cols; j += 1) row[j] += a * B[k][j];
    }
    C.push(row);
  }
  return C;
}
const madd = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));
const msub = (A, B) => A.map((r, i) => r.map((v, j) => v - B[i][j]));
const mT = (A) => A[0].map((_, j) => A.map((r) => r[j]));
const eye = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
function inv2(A) {
  const d = A[0][0] * A[1][1] - A[0][1] * A[1][0] || 1e-12;
  return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
}
/* 对称 2×2 的特征分解，画协方差椭圆用 */
function eig2(S) {
  const tr = S[0][0] + S[1][1];
  const dt = S[0][0] * S[1][1] - S[0][1] * S[1][0];
  const g = Math.sqrt(Math.max(tr * tr / 4 - dt, 0));
  const l1 = tr / 2 + g;
  const l2 = tr / 2 - g;
  let ang = 0;
  if (Math.abs(S[0][1]) > 1e-12) ang = Math.atan2(l1 - S[0][0], S[0][1]);
  else if (S[0][0] < S[1][1]) ang = Math.PI / 2;
  return { l1: Math.max(l1, 1e-9), l2: Math.max(l2, 1e-9), ang };
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    q: spec.q ?? 30,        // 过程噪声强度（mm²/s³ 量级）
    r: spec.r ?? 25,        // 观测噪声方差 mm²
    rho: spec.rho ?? 0.6,   // 两个通道观测噪声的相关系数
    every: spec.every ?? 2, // 每几帧来一次神经观测
  };
  const cv = setupCanvas(host, 380);
  const ro = buildReadout({
    位置协方差迹: '—', 稳态增益: '—', 观测噪声: '—', 位置误差: '—', 状态: '—',
  });
  host.appendChild(ro.box);

  /* 模型：x_{t+1} = F x_t + w，z_t = H x_t + v */
  const F = [
    [1, 0, DT, 0],
    [0, 1, 0, DT],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const H = [[1, 0, 0, 0], [0, 1, 0, 0]];
  const qOf = () => {
    const q = s.q;
    return [
      [q * DT ** 4 / 4, 0, q * DT ** 3 / 2, 0],
      [0, q * DT ** 4 / 4, 0, q * DT ** 3 / 2],
      [q * DT ** 3 / 2, 0, q * DT ** 2, 0],
      [0, q * DT ** 3 / 2, 0, q * DT ** 2],
    ];
  };
  const Rof = () => [[s.r, s.rho * s.r], [s.rho * s.r, s.r]];
  const Lof = () => [[Math.sqrt(s.r), 0], [s.rho * Math.sqrt(s.r), Math.sqrt(s.r * (1 - s.rho ** 2))]];

  const st = {
    t: 0,
    x: [100, 100, 0, 0],
    P: eye(N).map((r) => r.map((v) => v * 400)),
    est: [100, 100],
    trail: [],
    obs: [],
    errs: [],
    frame: 0,
    dragging: false,
    dragPrev: null,
  };

  /* 伪随机标准正态 */
  let seed = 12345;
  function gauss() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const u1 = Math.max(seed / 0x7fffffff, 1e-9);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const u2 = seed / 0x7fffffff;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  let lastK = [[0, 0], [0, 0], [0, 0], [0, 0]];
  function kalmanStep(z, doUpdate) {
    /* --- 预测 --- */
    st.x = mmul(F, st.x.map((v) => [v])).map((r) => r[0]);
    st.P = madd(mmul(mmul(F, st.P), mT(F)), qOf());
    if (!doUpdate) return;
    /* --- 更新 --- */
    const S = madd(mmul(mmul(H, st.P), mT(H)), Rof());
    const K = mmul(mmul(st.P, mT(H)), inv2(S));
    const y = [[z[0] - st.x[0]], [z[1] - st.x[1]]];
    const dx = mmul(K, y);
    st.x = st.x.map((v, i) => v + dx[i][0]);
    st.P = mmul(msub(eye(N), mmul(K, H)), st.P);
    /* 对称化，防止浮点漂移 */
    st.P = st.P.map((row, i) => row.map((v, j) => (v + st.P[j][i]) / 2));
    lastK = K;
  }

  function truePos(t) {
    return [100 + 68 * Math.sin(0.55 * t), 100 + 68 * Math.sin(0.83 * t + 1.1)];
  }

  function tick() {
    st.t += DT;
    st.frame += 1;
    if (!st.dragging) {
      const p = truePos(st.t);
      st.x[2] = (p[0] - st.x[0]) / DT;
      st.x[3] = (p[1] - st.x[1]) / DT;
      st.x[0] = p[0];
      st.x[1] = p[1];
    }
    const doUpdate = st.frame % Math.max(1, Math.round(s.every)) === 0;
    const L = Lof();
    const g = [gauss(), gauss()];
    const obs = [
      st.x[0] + L[0][0] * g[0],
      st.x[1] + L[1][0] * g[0] + L[1][1] * g[1],
    ];
    if (doUpdate) {
      st.obs.push(obs);
      if (st.obs.length > 90) st.obs.shift();
      kalmanStep(obs, true);
    } else {
      kalmanStep(null, false);
    }
    st.trail.push([st.x[0], st.x[1], st.x[0] - st.est[0], st.x[1] - st.est[1]]);
    if (st.trail.length > 400) st.trail.shift();
    st.est = [st.x[0], st.x[1]];
    /* 用后验状态当作估计位置（后验里 x[0],x[1] 就是位置） */
    st.errs.push(Math.hypot(st.x[0] - truePos(st.t)[0], st.x[1] - truePos(st.t)[1]));
    if (st.errs.length > 200) st.errs.shift();
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    ctx.clearRect(0, 0, W, Hh);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, Hh);
    /* 工作区：0–200 mm 映射到画布 */
    const pad = 34;
    const side = Math.min(W - 2 * pad - 130, Hh - 2 * pad);
    const ox = pad + 30;
    const oy = pad + 14;
    const k = side / 200;
    const PX = (x) => ox + x * k;
    const PY = (y) => oy + (200 - y) * k;

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 200; g += 50) {
      ctx.beginPath();
      ctx.moveTo(PX(g), PY(0));
      ctx.lineTo(PX(g), PY(200));
      ctx.moveTo(PX(0), PY(g));
      ctx.lineTo(PX(200), PY(g));
      ctx.stroke();
    }
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(PX(0) + 0.5, PY(200) + 0.5, 200 * k, 200 * k);

    /* 观测散点 */
    ctx.fillStyle = C.dark ? 'rgba(217,154,78,0.30)' : 'rgba(232,135,30,0.26)';
    st.obs.forEach((o) => {
      ctx.beginPath();
      ctx.arc(PX(o[0]), PY(o[1]), 2.4, 0, Math.PI * 2);
      ctx.fill();
    });

    /* 估计轨迹 */
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    st.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(PX(p[0]), PY(p[1]));
      else ctx.lineTo(PX(p[0]), PY(p[1]));
    });
    ctx.stroke();

    /* 协方差椭圆（位置块，2σ） */
    const S = [[st.P[0][0], st.P[0][1]], [st.P[1][0], st.P[1][1]]];
    const e = eig2(S);
    ctx.save();
    ctx.translate(PX(st.x[0]), PY(st.x[1]));
    ctx.rotate(-e.ang);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2 * Math.sqrt(e.l1) * k, 2 * Math.sqrt(e.l2) * k, 0, 0, Math.PI * 2);
    ctx.strokeStyle = C.named('pink');
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    /* 真实位置 */
    const tp = truePos(st.t);
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(PX(tp[0]), PY(tp[1]), 6, 0, Math.PI * 2);
    ctx.fill();
    /* 估计位置 */
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(PX(st.x[0]), PY(st.x[1]), 5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, '橙=真实光标  蓝=卡尔曼估计  粉圈=位置协方差（2σ）', ox, oy - 8, C.fg,
      { size: 11, weight: 600 });
    label(ctx, '0', PX(0) - 4, PY(0) + 14, C.fg, { size: 9, align: 'right' });
    label(ctx, '200 mm', PX(200), PY(0) + 14, C.fg, { size: 9, align: 'right' });
    label(ctx, '拖动画布可以直接拽走真实光标', ox, oy + 200 * k + 22, C.fg, { size: 10 });

    /* 右侧：稳态增益与误差时间线 */
    const rx = ox + 200 * k + 26;
    const rw = W - rx - 12;
    if (rw > 60) {
      const gy0 = oy + 10;
      const gy1 = oy + 130;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(rx + 0.5, gy0 + 0.5, rw, gy1 - gy0);
      const kmax = 1.0;
      const bars = [
        ['Kx', Math.abs(lastK[0][0]), C.accent],
        ['Ky', Math.abs(lastK[1][1]), C.accent],
        ['Kvx', Math.abs(lastK[2][0]), C.named('teal')],
        ['Kvy', Math.abs(lastK[3][1]), C.named('teal')],
      ];
      bars.forEach(([nm, v, col], i) => {
        const y = gy0 + 10 + i * 28;
        const w = (clamp(v / kmax, 0, 1)) * (rw - 46);
        ctx.fillStyle = col;
        ctx.fillRect(rx + 34, y, Math.max(1, w), 14);
        label(ctx, nm, rx + 6, y + 12, C.fg, { size: 10 });
        label(ctx, fmt(v, 2), rx + 38 + w + 4, y + 12, C.fg, { size: 9 });
      });
      label(ctx, '卡尔曼增益 K', rx, gy0 - 6, C.fg, { size: 11, weight: 600 });

      const ey0 = gy1 + 34;
      const ey1 = Hh - 30;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(rx + 0.5, ey0 + 0.5, rw, ey1 - ey0);
      const em = Math.max(...st.errs, 1);
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      st.errs.forEach((v, i) => {
        const x = rx + (i / Math.max(st.errs.length - 1, 1)) * rw;
        const y = ey1 - (v / em) * (ey1 - ey0 - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      label(ctx, '位置误差 |估计 − 真实| (mm)', rx, ey0 - 6, C.fg, { size: 11, weight: 600 });
      label(ctx, '峰值 ' + fmt(em, 1), rx + rw, ey0 - 6, C.fg, { size: 9, align: 'right' });
    }

    /* 读数 */
    const tr = S[0][0] + S[1][1];
    const rms = Math.sqrt(st.errs.reduce((a, b) => a + b * b, 0) / Math.max(st.errs.length, 1));
    ro.set('位置协方差迹', fmt(tr, 1) + ' mm²（边长 ≈ 2σ）');
    ro.set('稳态增益', 'Kx = ' + fmt(lastK[0][0], 3) + '  Kvx = ' + fmt(lastK[2][0], 3));
    ro.set('观测噪声', 'r = ' + fmt(s.r, 1) + ' mm²，相关系数 ρ = ' + fmt(s.rho, 2));
    ro.set('位置误差', 'RMS ' + fmt(rms, 2) + ' mm');
    ro.set('状态', s.q > 200 ? '过程噪声压过观测：估计盯着新观测跑' : s.r > 120 ? '观测太脏：估计几乎不动' : '预测与观测平衡');
  }

  const controls = anim(host, { onTick() { tick(); draw(); }, onReset() { reset(); } });

  function reset() {
    st.t = 0; st.frame = 0;
    const p0 = truePos(0);
    st.x = [p0[0], p0[1], 0, 0];
    st.P = eye(N).map((r, i) => r.map((v, j) => (i === j ? (i < 2 ? 900 : 400) : 0)));
    st.est = [p0[0], p0[1]];
    st.trail = []; st.obs = []; st.errs = [];
    lastK = [[0, 0], [0, 0], [0, 0], [0, 0]];
  }

  /* ---------- 拖动：直接拽真实光标 ---------- */
  function local(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (cv.canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (cv.canvas._H / rect.height),
    };
  }
  function toPlane(x, y) {
    const pad = 34;
    const side = Math.min(cv.W - 2 * pad - 130, cv.H - 2 * pad);
    const ox = pad + 30;
    const oy = pad + 14;
    const k = side / 200;
    return [clamp((x - ox) / k, 0, 200), clamp(200 - (y - oy) / k, 0, 200)];
  }
  function onDown(ev) {
    const p = local(ev);
    const q = toPlane(p.x, p.y);
    if (Math.hypot(q[0] - st.x[0], q[1] - st.x[1]) < 60) {
      st.dragging = true;
      st.dragPrev = [st.x[0], st.x[1]];
      cv.canvas.setPointerCapture(ev.pointerId);
    }
  }
  function onMove(ev) {
    if (!st.dragging) return;
    const p = local(ev);
    const q = toPlane(p.x, p.y);
    if (st.dragPrev) {
      st.x[2] = (q[0] - st.dragPrev[0]) / DT;
      st.x[3] = (q[1] - st.dragPrev[1]) / DT;
    }
    st.x[0] = q[0]; st.x[1] = q[1];
    st.dragPrev = q;
    tick();
    draw();
  }
  function onUp() { st.dragging = false; st.dragPrev = null; }
  cv.canvas.style.cursor = 'grab';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  const sl = buildSliders(
    {
      sliders: [
        { name: 'q', label: '过程噪声 q', min: 1, max: 400, step: 1, value: s.q, fmt: 0 },
        { name: 'r', label: '观测噪声 r (mm²)', min: 1, max: 200, step: 1, value: s.r, fmt: 0 },
        { name: 'rho', label: '通道噪声相关系数 ρ', min: 0, max: 0.9, step: 0.05, value: s.rho, fmt: 2 },
        { name: 'every', label: '每几帧来一次观测', min: 1, max: 6, step: 1, value: s.every, fmt: 0 },
      ],
    },
    (v) => { s.q = v.q; s.r = v.r; s.rho = v.rho; s.every = Math.round(v.every); draw(); },
  );

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
