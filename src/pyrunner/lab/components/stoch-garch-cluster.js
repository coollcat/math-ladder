/* =========================================================================
 * lab 组件：stoch-garch-cluster —— GARCH(1,1) 的波动聚集（第 37 章 · 95 课）
 * -------------------------------------------------------------------------
 * 演示什么：按 σ_t² = ω + α·ε_{t−1}² + β·σ_{t−1}² 一步一步造收益序列。
 * 上半屏是收益柱（高低不齐），叠一条条件标准差 σ_t 的曲线；下半屏把每一步的
 * 方差拆成三段堆叠柱：ω（地板）、α·ε²（今天的冲击）、β·σ²（昨天的记忆）。
 * 一眼能看出：柱高的变化不是随机的，一段高柱后面还跟着高柱——这就是「波动
 * 聚集」；而长期方差 ω/(1−α−β) 是那条让 σ_t² 反复回归的水位线。
 *
 * 参数取课文实验里的 ω=0.01、α=0.12、β=0.82（α+β=0.94，长期方差 0.1667）。
 * α、β 可用滑块改；若把 α+β 推过 1，组件会把它截到 0.985 并在读数条里明说：
 * 否则长期方差会发散，模型不再有稳态。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "stoch-garch-cluster",
 *     "title": "GARCH(1,1)：波动聚集成串，σ² 又总被拉回水位线",
 *     "alpha": 0.12, "beta": 0.82 }
 *
 * 字段（都可省）：
 *   alpha   新冲击权重 α，默认 0.12（0.02..0.4）
 *   beta    波动持续权重 β，默认 0.82（0.3..0.95）
 *   n       步数，默认 240（60..600）
 *   seed    随机种子，默认 42
 *   height  画布高度，默认 500
 *
 * 能玩什么：
 *   - 「单步」多造一天；「回退」退回前一天
 *   - 拖 α / β：β 越大，高波动段的「余波」拖得越久；α+β → 1 时水位线上移、回归变慢
 *   - 切「方差拆解」视图，看每一天的方差到底是谁贡献的
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, polyline, fmt,
  buildSliders, buildToolbar, buildReadout, buildSegmented, anim, mkBtn, mergeSpec,
  mulberry32, gaussOf,
} from '../core.js';

const OMEGA = 0.01;      // 方差地板，与课文实验一致

const BASE_SLIDERS = [
  { name: 'alpha', label: 'α 新冲击权重', min: 0.02, max: 0.4, step: 0.01, value: 0.12, fmt: 2 },
  { name: 'beta', label: 'β 旧波动权重', min: 0.3, max: 0.95, step: 0.01, value: 0.82, fmt: 2 },
];

/* 生成：返回每一步的 { ret, varNow, varPrev, shock2 } */
function simulate(alpha, beta, n, seed) {
  const rnd = mulberry32(seed * 42967 + 23);
  const out = [];
  let sigma2 = OMEGA / Math.max(1 - alpha - beta, 0.05);
  for (let t = 0; t < n; t += 1) {
    const sd = Math.sqrt(Math.max(sigma2, 1e-9));
    const ret = gaussOf(rnd) * sd;
    const shock2 = ret * ret;
    const next = OMEGA + alpha * shock2 + beta * sigma2;
    out.push({ ret, sd, varNow: sigma2, shock2, next, shockPart: alpha * shock2, memPart: beta * sigma2 });
    sigma2 = next;
  }
  return out;
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 340, 820) : 500;
  let alpha = Number.isFinite(spec.alpha) ? clamp(spec.alpha, 0.02, 0.4) : 0.12;
  let beta = Number.isFinite(spec.beta) ? clamp(spec.beta, 0.3, 0.95) : 0.82;
  const n = Number.isFinite(spec.n) ? clamp(Math.round(spec.n), 60, 600) : 240;
  const seed = Number.isFinite(spec.seed) ? Math.round(spec.seed) : 42;
  let view = 'series';
  let t = n;
  let capped = false;
  let sim = null;

  function rebuild() {
    /* α+β ≥ 1 会让长期方差发散：截到 0.985，并在读数条里如实说明 */
    let b = beta;
    capped = alpha + b >= 0.985;
    if (capped) b = Math.max(0.3, 0.985 - alpha);
    sim = simulate(alpha, b, n, seed);
    return b;
  }
  let betaEff = rebuild();

  const ro = buildReadout({
    '条件方差 σ_t²': '—',
    '长期方差 ω/(1−α−β)': '—',
    '今天的方差来自谁': '—',
    '波动聚集': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (st) => {
    if (st.alpha !== undefined) alpha = st.alpha;
    if (st.beta !== undefined) beta = st.beta;
    betaEff = rebuild();
    draw();
  });

  host.appendChild(buildSegmented(
    [
      { label: '收益与条件波动', value: 'series' },
      { label: '方差拆解', value: 'decomp' },
    ],
    'series',
    (v) => { view = v; draw(); },
  ));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    geo.narrow = W < 620;
    geo.x = 48;
    geo.y = 44;
    geo.w = W - 72;
    geo.h = Hh - 156;
  }

  function longRun() {
    return OMEGA / Math.max(1 - alpha - betaEff, 1e-6);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const last = sim[Math.max(t - 1, 0)];
    const lr = longRun();

    label(ctx, 'GARCH(1,1)：σ²ₜ = ω + α·ε²ₜ₋₁ + β·σ²ₜ₋₁　ω = ' + fmt(OMEGA, 2)
      + '，α = ' + fmt(alpha, 2) + '，β = ' + fmt(betaEff, 2)
      + (capped ? '（β 已被截到 ' + fmt(betaEff, 2) + '，否则 α+β ≥ 1 会让长期方差发散）' : ''),
      geo.x - 36, 18, capped ? C.bad : C.fg, { size: geo.narrow ? 10 : 11, weight: 700 });
    label(ctx, 'α+β = ' + fmt(alpha + betaEff, 3) + '　长期方差 ω/(1−α−β) = ' + fmt(lr, 3)
      + '　长期标准差 √ = ' + fmt(Math.sqrt(lr), 3),
      geo.x - 36, 34, C.axis, { size: 10 });

    if (view === 'series') drawSeries(ctx, C, lr);
    else drawDecomp(ctx, C, lr);

    label(ctx, '上：收益柱（灰）与条件标准差 σₜ（橙线）　下：每 20 步一格的平方收益均值（聚集体检）',
      geo.x - 36, cv.H - 24, C.grid, { size: 10 });
    label(ctx, '大波动之后更容易继续大波动，这就是「聚集」；虚线是长期标准差 √(ω/(1−α−β))',
      geo.x - 36, cv.H - 8, C.grid, { size: 10 });

    ro.set('条件方差 σ_t²', fmt(last.varNow, 4) + '　（长期值 ' + fmt(lr, 4) + '，'
      + fmt(last.varNow / lr * 100, 0) + '% 水位）');
    ro.set('长期方差 ω/(1−α−β)', fmt(lr, 4) + '　标准差 ' + fmt(Math.sqrt(lr), 4)
      + (capped ? '　⚠︎ α+β 被截断' : ''));
    ro.set('今天的方差来自谁', '地板 ' + fmt(OMEGA, 3) + ' + 冲击 ' + fmt(last.shockPart, 4)
      + ' + 记忆 ' + fmt(last.memPart, 4));
    /* 聚集指标：后半段平方收益均值 / 前半段 */
    const half = Math.floor(t / 2);
    const avg2 = (a, b) => {
      let s = 0;
      for (let i = a; i < b; i += 1) s += sim[i].ret * sim[i].ret;
      return s / Math.max(b - a, 1);
    };
    const early = avg2(0, half);
    const late = avg2(half, t);
    ro.set('波动聚集', t < 20 ? '步数太少，看不出聚集'
      : '前半段平均平方收益 ' + fmt(early, 4) + '，后半段 ' + fmt(late, 4)
        + '，相差 ' + fmt(late / Math.max(early, 1e-9), 2) + ' 倍');
  }

  function drawSeries(ctx, C, lr) {
    const upH = Math.round(geo.h * 0.62);
    const y0 = geo.y;
    const y1 = geo.y + upH + 34;
    const loH = Math.round(geo.h * 0.28);
    const maxAbs = Math.max(...sim.slice(0, t).map((d) => Math.abs(d.ret)), Math.sqrt(lr) * 2);
    const yz = y0 + upH / 2;
    const barW = Math.max(geo.w / Math.max(t, 1) * 0.7, 0.8);

    /* 零线 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geo.x, yz + 0.5);
    ctx.lineTo(geo.x + geo.w, yz + 0.5);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < t; i += 1) {
      const d = sim[i];
      const x = geo.x + (i / Math.max(t, 1)) * geo.w;
      const hh = (Math.abs(d.ret) / maxAbs) * (upH / 2);
      ctx.save();
      ctx.fillStyle = d.ret >= 0 ? C.named('green') : C.named('red');
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x, d.ret >= 0 ? yz - hh : yz, barW, hh);
      ctx.restore();
    }
    /* 条件标准差曲线（上下对称画两遍，读起来像通道） */
    const upper = [];
    const lower = [];
    const lrUpper = [];
    for (let i = 0; i < t; i += 1) {
      const x = geo.x + (i / Math.max(t, 1)) * geo.w;
      const hh = (sim[i].sd / maxAbs) * (upH / 2);
      upper.push([x, yz - hh]);
      lower.push([x, yz + hh]);
      lrUpper.push([x, yz - (Math.sqrt(lr) / maxAbs) * (upH / 2)]);
    }
    polyline(ctx, upper, C.named('amber'), 1.8);
    polyline(ctx, lower, C.named('amber'), 1.8, [4, 4]);
    polyline(ctx, lrUpper, C.named('gray'), 1.3, [6, 5]);
    label(ctx, 'σₜ 通道', geo.x + geo.w, yz - (Math.sqrt(lr) / maxAbs) * (upH / 2) - 6,
      C.named('amber'), { size: 9.5, align: 'right' });
    label(ctx, '长期 σ 水位线', geo.x, yz - (Math.sqrt(lr) / maxAbs) * (upH / 2) - 6,
      C.named('gray'), { size: 9.5 });

    /* 下：20 步一窗的平方收益均值 */
    const W = 20;
    const wins = [];
    for (let s = 0; s + W <= t; s += W) {
      let acc2 = 0;
      for (let i = s; i < s + W; i += 1) acc2 += sim[i].ret * sim[i].ret;
      wins.push({ s, v: acc2 / W });
    }
    const maxW = Math.max(...wins.map((w) => w.v), lr);
    const wy = (v) => y1 + loH - (v / maxW) * loH;
    wins.forEach((w, i) => {
      const x = geo.x + (i / Math.max(wins.length, 1)) * geo.w;
      const bw = Math.max(geo.w / Math.max(wins.length, 1) * 0.72, 1.5);
      const hh = y1 + loH - wy(w.v);
      ctx.save();
      ctx.fillStyle = C.series(0);
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, wy(w.v), bw, hh);
      ctx.restore();
    });
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.named('gray');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(geo.x, wy(lr) + 0.5);
    ctx.lineTo(geo.x + geo.w, wy(lr) + 0.5);
    ctx.stroke();
    ctx.restore();
    label(ctx, '每 20 步的平方收益均值（波动代理量）', geo.x, y1 - 8, C.axis, { size: 10 });
  }

  function drawDecomp(ctx, C, lr) {
    const base = geo.y + geo.h;
    const span = Math.max(t, 1);
    const keys = [
      { k: 'omega', name: 'ω 地板', color: 'gray' },
      { k: 'shockPart', name: 'α·ε² 今天的冲击', color: 'orange' },
      { k: 'memPart', name: 'β·σ² 昨天的记忆', color: 'blue' },
    ];
    const maxV = Math.max(...sim.slice(0, t).map((d) => OMEGA + d.shockPart + d.memPart), lr);
    const barW = Math.max(geo.w / span * 0.72, 0.8);
    for (let i = 0; i < t; i += 1) {
      const d = sim[i];
      const x = geo.x + (i / span) * geo.w;
      let acc2 = 0;
      keys.forEach((kk) => {
        const val = kk.k === 'omega' ? OMEGA : d[kk.k];
        const hh = (val / maxV) * geo.h;
        ctx.save();
        ctx.fillStyle = C.named(kk.color);
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, base - acc2 - hh, barW, hh);
        ctx.restore();
        acc2 += hh;
      });
    }
    /* 长期方差水位线 */
    const ly = base - (lr / maxV) * geo.h;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(geo.x, ly + 0.5);
    ctx.lineTo(geo.x + geo.w, ly + 0.5);
    ctx.stroke();
    ctx.restore();
    label(ctx, '长期方差 ω/(1−α−β)', geo.x + geo.w, ly - 5, C.named('red'),
      { size: 9.5, align: 'right' });
    label(ctx, '每一根堆叠柱 = 当天的条件方差 σₜ²，由三部分组成', geo.x, geo.y - 10,
      C.axis, { size: 10 });
    /* 图例 */
    keys.forEach((kk, i) => {
      const y = geo.y + 12 + i * 15;
      const x = geo.x + geo.w - 150;
      ctx.save();
      ctx.fillStyle = C.named(kk.color);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y - 8, 12, 9);
      ctx.restore();
      label(ctx, kk.name, x + 18, y, C.fg, { size: 10 });
    });
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.06) return;
      acc = 0;
      t = t >= n ? 30 : t + Math.max(1, Math.round(n / 60));
      draw();
    },
    onReset() { acc = 0; t = n; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    t = Math.min(t + Math.max(1, Math.round(n / 60)), n);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    t = Math.max(t - Math.max(1, Math.round(n / 60)), 20);
    draw();
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); cv.redraw = null; } };
}
