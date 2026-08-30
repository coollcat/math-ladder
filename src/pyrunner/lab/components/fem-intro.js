/* 有限元思想：把一根变截面拉杆切成 N 段，走完「离散化 → 单元刚度 → 组装 → 求解 → 后处理」。
   拖 N 看两件事同时发生：刚度矩阵规模从 1×1 长到 N×N，而端部位移单调收敛到解析解。
   有限元不神秘——它只是「承认自己不会解连续问题，于是把它拆成会解的一堆小问题」。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

const STEPS = [
  { v: 'mesh', label: '① 离散化' },
  { v: 'elem', label: '② 单元刚度' },
  { v: 'asm', label: '③ 组装' },
  { v: 'solve', label: '④ 求解' },
  { v: 'post', label: '⑤ 后处理' },
];

const L = 2;          // 杆长 m
const E = 200e9;      // Pa
const A0 = 5e-4;      // 根部截面积 m²
/* 截面积沿轴线性收缩到一半：A(x) = A0(1 − x/(2L)) */
const areaAt = (x) => A0 * (1 - x / (2 * L));
/* 解析位移 u(x) = ∫ P/(E·A) ds */
function uExact(x, P) {
  return (P / (E * A0)) * (-2 * L) * Math.log(1 - x / (2 * L));
}

export default function render(host, spec) {
  const C = themeColors();
  const s = { N: spec.N ?? 4, P: spec.P ?? 50, step: spec.step || 'mesh' };

  const cv = setupCanvas(host, 350);
  const ro = buildReadout({ '单元数 N': '—', '自由度数': '—', '刚度矩阵规模': '—', '端部挠度 u(L)': '—', '相对误差': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(STEPS, s.step, (v) => { s.step = v; draw(); }));

  let mech = null;
  let sol = null;

  function solveFE(N) {
    const P = s.P * 1000;
    const Le = L / N;
    const ke = [];
    for (let e = 0; e < N; e += 1) ke.push((E * areaAt((e + 0.5) * Le)) / Le);
    /* 整体刚度（节点 1..N 为未知，节点 0 固定）→ 三对角 */
    const a = new Float64Array(N);
    const b = new Float64Array(N);
    const c = new Float64Array(N);
    const d = new Float64Array(N);
    for (let i = 0; i < N; i += 1) {
      b[i] = ke[i] + (i < N - 1 ? ke[i + 1] : 0);
      if (i >= 1) a[i] = -ke[i];
      if (i <= N - 2) c[i] = -ke[i + 1];
      d[i] = i === N - 1 ? P : 0;
    }
    const u = mech ? mech.tridiag(a, b, c, d) : new Float64Array(N);
    const nodeU = [0];
    for (let i = 0; i < N; i += 1) nodeU.push(u[i]);
    return { N, ke, nodeU, P, Le };
  }

  function compute() {
    if (!mech) return;
    sol = solveFE(s.N);
  }

  /* 各 N 下的端部误差，用来画收敛曲线 */
  function convergence() {
    const pts = [];
    const uE = uExact(L, s.P * 1000);
    for (let n = 1; n <= 40; n += 1) {
      const r = solveFE(n);
      const err = Math.abs(r.nodeU[r.nodeU.length - 1] - uE) / Math.abs(uE);
      pts.push([n, Math.max(err, 1e-12)]);
    }
    return pts;
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!mech || !sol) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }
    const N = s.N;
    const uE = uExact(L, sol.P);
    const err = Math.abs(sol.nodeU[N] - uE) / Math.abs(uE);

    /* ================= 上：离散化与位移解 ================= */
    const gx = 34;
    const gw = W - 78;
    const meshY = 44;
    const gy = 150;
    const gh = 78;

    /* 杆与单元划分 */
    const barH = 22;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(gx, meshY, gw, barH);
    ctx.stroke();
    /* 固定端 */
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, meshY - 6);
    ctx.lineTo(gx, meshY + barH + 6);
    ctx.stroke();
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath();
      ctx.moveTo(gx, meshY - 4 + k * ((barH + 8) / 4));
      ctx.lineTo(gx - 7, meshY + k * ((barH + 8) / 4));
      ctx.stroke();
    }
    /* 单元分隔与编号 */
    for (let e = 0; e <= N; e += 1) {
      const X = gx + (e / N) * gw;
      ctx.strokeStyle = s.step === 'mesh' ? C.named('amber') : C.axis;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X, meshY);
      ctx.lineTo(X, meshY + barH);
      ctx.stroke();
      ctx.fillStyle = s.step === 'mesh' ? C.named('amber') : C.fg;
      ctx.beginPath();
      ctx.arc(X, meshY + barH + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      if (N <= 16 || e % 2 === 0) label(ctx, String(e), X, meshY + barH + 20, C.fg, { align: 'center', size: 9 });
    }
    /* 端部载荷 */
    ctx.strokeStyle = C.named('red');
    ctx.fillStyle = C.named('red');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(gx + gw, meshY + barH / 2);
    ctx.lineTo(gx + gw + 30, meshY + barH / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + gw + 30, meshY + barH / 2);
    ctx.lineTo(gx + gw + 20, meshY + barH / 2 - 5);
    ctx.lineTo(gx + gw + 20, meshY + barH / 2 + 5);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'P = ' + fmt(s.P, 0) + ' kN', gx + gw + 6, meshY - 6, C.named('red'), { size: 10, weight: 600 });

    /* 位移解 u(x) 与解析解 */
    const uMax = Math.max(uE, ...sol.nodeU) * 1.1;
    const ux = (i) => gx + (i / N) * gw;
    const uy = (v) => gy + gh - (v / uMax) * gh;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    /* 解析解（光滑曲线） */
    const ex = [];
    for (let i = 0; i <= 120; i += 1) {
      const x = (i / 120) * L;
      ex.push([gx + (i / 120) * gw, uy(uExact(x, sol.P))]);
    }
    polyline(ctx, ex, C.grid, 1.6, [5, 4]);
    /* 有限元解（分段线性，正是形函数的样子） */
    const fe = sol.nodeU.map((v, i) => [ux(i), uy(v)]);
    polyline(ctx, fe, s.step === 'post' ? C.named('amber') : C.accent, 2.4);
    if (N <= 20) {
      sol.nodeU.forEach((v, i) => {
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(ux(i), uy(v), 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    label(ctx, '位移 u(x)：折线 = 有限元解，虚线 = 解析解', gx, gy - 8, C.fg, { size: 10 });
    label(ctx, 'u', gx - 20, gy + 10, C.fg, { size: 11 });

    /* ================= 中：五步流程提示 ================= */
    const note = {
      mesh: '把连续体切成 N 个单元、N+1 个节点——这是唯一的近似来源',
      elem: '每个单元只做一件事：kₑ = E·Aₘᵢd / Lₑ，把「材料+几何」压成一个数',
      asm: '按节点编号把单元刚度「对号入座」叠加成整体 K，这里 K 是三对角带状',
      solve: 'K·u = F，加上位移边界条件 u₀ = 0 后求解线性方程组',
      post: '把节点位移插回单元内部，再算应变与应力——这才是工程师要看的东西',
    }[s.step];
    label(ctx, note, gx, gy + gh + 34, C.accent2, { size: 10, weight: 600 });

    /* 单元刚度条 / 组装矩阵字形（按步骤切换） */
    if (s.step === 'elem' || s.step === 'asm') {
      const bx = gx;
      const by = gy + gh + 44;
      if (s.step === 'elem') {
        const kmax = Math.max(...sol.ke);
        sol.ke.forEach((k, i) => {
          const w = gw / N;
          ctx.fillStyle = C.series(i % 9);
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.rect(bx + i * w + 1, by, Math.max(w - 2, 1), (k / kmax) * 22);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        label(ctx, '各单元刚度 kₑ（A 收缩 → 端部单元更软）', bx, by + 34, C.fg, { size: 9 });
      } else {
        const cell = Math.min(6, 120 / N);
        const size = Math.max(cell, 2);
        for (let i = 0; i < N; i += 1) {
          for (let j = 0; j < N; j += 1) {
            const on = i === j || Math.abs(i - j) === 1;
            ctx.fillStyle = on ? C.named('purple') : C.soft;
            ctx.globalAlpha = on ? 0.85 : 0.35;
            ctx.beginPath();
            ctx.rect(bx + j * size, by + i * size, size - 0.6, size - 0.6);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
        label(ctx, '整体刚度矩阵 K（' + N + '×' + N + '，三对角带状，半带宽 1）', bx + N * size + 10, by + 12, C.fg, { size: 9 });
      }
    }

    /* ================= 下：收敛曲线（双对数） ================= */
    const cvy = H - 26;
    const cvh = 58;
    const cvx = gx;
    const cvw = gw;
    const conv = convergence();
    const yMin = 1e-6;
    const yMax = 1;
    const cx2 = (n) => cvx + ((n - 1) / 39) * cvw;
    const cy2 = (v) => cvy - (Math.log10(clamp(v, yMin, yMax)) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) * cvh;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cvx, cvy - cvh);
    ctx.lineTo(cvx, cvy);
    ctx.lineTo(cvx + cvw, cvy);
    ctx.stroke();
    polyline(ctx, conv.map(([n, v]) => [cx2(n), cy2(v)]), C.series(3), 2.2);
    /* 当前 N */
    const px2 = cx2(N);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px2, cvy - cvh);
    ctx.lineTo(px2, cvy);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(px2, cy2(err), 4.5, 0, Math.PI * 2);
    ctx.fill();
    [1e-1, 1e-3, 1e-5].forEach((v) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(cvx, cy2(v));
      ctx.lineTo(cvx + cvw, cy2(v));
      ctx.stroke();
      label(ctx, String(v), cvx - 4, cy2(v) + 3, C.fg, { align: 'right', size: 8 });
    });
    label(ctx, '相对误差 vs 单元数 N（双对数，斜率 ≈ −2）', cvx, cvy - cvh - 6, C.fg, { size: 10 });
    label(ctx, 'N', cvx + cvw + 6, cvy + 4, C.fg, { size: 10 });

    ro.set('单元数 N', String(N) + '（单元长度 ' + fmt(sol.Le * 1000, 1) + ' mm）');
    ro.set('自由度数', N + ' 个（节点 0 被固定，不参与求解）');
    ro.set('刚度矩阵规模', N + ' × ' + N + ' = ' + N * N + ' 个元素，但非零仅 ' + (3 * N - 2) + ' 个');
    ro.set('端部挠度 u(L)', fmt(sol.nodeU[N] * 1000, 5) + ' mm（解析 ' + fmt(uE * 1000, 5) + ' mm）');
    ro.set('相对误差', fmt(err * 100, 4) + ' %');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'N', label: '单元数 N', min: 1, max: 40, step: 1, value: s.N, fmt: 0 },
        { name: 'P', label: '端部载荷 P', min: 5, max: 200, step: 5, value: s.P, fmt: 0 },
      ],
    },
    (st) => { s.N = clamp(Math.round(st.N), 1, 40); s.P = st.P; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
