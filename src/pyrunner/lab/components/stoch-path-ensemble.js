/* =========================================================================
 * lab 组件：stoch-path-ensemble —— 样本路径叠加 + 云带（第 37 章 · 55 课）
 * -------------------------------------------------------------------------
 * 演示什么：一次生成十几条 ±1 随机游走的样本路径，全部叠在同一张图上；
 * 再用两条粗线夹出「同一时刻的 5% / 95% 分位」，那就是把胶片在同一刻切开看到的
 * 云带。三条曲线（个体、集体平均、云带边界）讲的是同一件事的三个层次：
 *   · 个体路径四处乱窜，终点散布得很开；
 *   · 集体平均几乎贴着 0 爬（期望被平均兑现）；
 *   · 云带宽度 ∝ √t——方差随时间线性增长，这是随机游走的签名。
 *
 * 参数少而准，所有随机数走固定种子：换了「种子」才换一批平行宇宙，换
 * 「路径条数」只在同一批里多取或少取，方便对照。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "stoch-path-ensemble",
 *     "title": "十二条平行宇宙：个体乱窜，集体贴零，云带越张越开",
 *     "paths": 12,
 *     "seed": 7 }
 *
 * 字段（都可省）：
 *   paths   路径条数，默认 12（范围 2..30）
 *   seed    随机种子，默认 7
 *   steps   时间轴格数，默认 200（范围 40..600）
 *   height  画布高度，默认 460
 *
 * 能玩什么：
 *   - 「单步」把时间推进一段（看云带从零逐渐张开）；「回退」收回；
 *   - 拖动「路径条数」滑块：同一棵随机数树上多摘或少摘几条；
 *   - 换「种子」整批重掷，对照「平均线依旧贴零、个体依旧四散」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, polyline, fmt,
  buildSliders, buildToolbar, buildReadout, anim, mkBtn, mergeSpec,
  mulberry32, onScreen,
} from '../core.js';

const BASE_SLIDERS = [
  { name: 'paths', label: '路径条数', min: 2, max: 30, step: 1, value: 12 },
  { name: 'seed', label: '随机种子', min: 1, max: 40, step: 1, value: 7 },
];

const MAX_PATHS = 30;

function buildEnsemble(seed, steps, n) {
  const rnd = mulberry32(seed * 7919 + 13);
  const rows = [];
  for (let k = 0; k < MAX_PATHS; k += 1) {
    const route = new Float64Array(steps + 1);
    let p = 0;
    for (let t = 1; t <= steps; t += 1) {
      p += rnd() < 0.5 ? 1 : -1;
      route[t] = p;
    }
    rows.push(route);
  }
  return rows.slice(0, n);
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 320, 760) : 460;
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const steps = Number.isFinite(spec.steps) ? clamp(Math.round(spec.steps), 40, 600) : 200;
  let seed = Number.isFinite(spec.seed) ? clamp(Math.round(spec.seed), 1, 40) : 7;
  let nPaths = Number.isFinite(spec.paths) ? clamp(Math.round(spec.paths), 2, MAX_PATHS) : 12;
  let rows = buildEnsemble(seed, steps, nPaths);
  let t = steps;              // 当前画到第几格（单步推进；默认直接给全程）

  const ro = buildReadout({
    '图中路径': '—',
    '终点散布': '—',
    '集体平均': '—',
    '云带宽度': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (st) => {
    if (st.seed !== undefined) seed = Math.round(st.seed);
    if (st.paths !== undefined) nPaths = Math.round(st.paths);
    rows = buildEnsemble(seed, steps, nPaths);
    draw();
  });
  /* 滑块交给 lab/index.js 挂在卡片底部（slidersBox 约定，与本章其它组件一致） */

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false, scale: 2 };

  function bounds() {
    let lo = 0;
    let hi = 0;
    rows.forEach((r) => {
      for (let i = 0; i <= t; i += 1) {
        if (r[i] < lo) lo = r[i];
        if (r[i] > hi) hi = r[i];
      }
    });
    const pad = Math.max((hi - lo) * 0.08, 2);
    return { lo: lo - pad, hi: hi + pad };
  }

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    geo.narrow = W < 620;
    geo.x = 46;
    geo.y = 42;
    geo.w = W - 68;
    geo.h = Hh - 122;
  }

  function xy(i, v, b) {
    const x = geo.x + (i / Math.max(t, 1)) * geo.w;
    const y = geo.y + geo.h - ((v - b.lo) / Math.max(b.hi - b.lo, 1e-9)) * geo.h;
    return [x, y];
  }

  function quantile(vals, q) {
    const a = vals.slice().sort((x, y) => x - y);
    if (!a.length) return 0;
    const idx = clamp(Math.round(q * (a.length - 1)), 0, a.length - 1);
    return a[idx];
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const b = bounds();
    const tt = Math.max(t, 1);

    label(ctx, '±1 随机游走：同一时刻所有路径的叠放就是「云带」',
      geo.x - 34, 18, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });

    /* 网格：只画零线与几条高度参考线 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    const zy = xy(0, 0, b)[1];
    ctx.beginPath();
    ctx.moveTo(geo.x, zy + 0.5);
    ctx.lineTo(geo.x + geo.w, zy + 0.5);
    ctx.stroke();
    ctx.restore();
    label(ctx, '0', geo.x - 8, zy + 4, C.axis, { size: 9.5, align: 'right' });
    [b.lo * 0.6, b.hi * 0.6].forEach((v) => {
      const p = xy(0, v, b);
      label(ctx, fmt(v, 0), geo.x - 8, p[1] + 4, C.grid, { size: 9, align: 'right' });
    });

    /* 云带：逐时刻算 5% / 95% 分位 */
    const lo = [];
    const hi = [];
    const avg = [];
    const stride = Math.max(1, Math.floor(tt / 160));
    for (let i = 0; i <= tt; i += stride) {
      const vals = rows.map((r) => r[i]);
      lo.push(xy(i, quantile(vals, 0.05), b));
      hi.push(xy(i, quantile(vals, 0.95), b));
      avg.push(xy(i, vals.reduce((s, v) => s + v, 0) / vals.length, b));
    }
    if (lo.length > 1) {
      ctx.save();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(hi[0][0], hi[0][1]);
      hi.forEach((p) => ctx.lineTo(p[0], p[1]));
      for (let i = lo.length - 1; i >= 0; i -= 1) ctx.lineTo(lo[i][0], lo[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      polyline(ctx, lo, C.accent, 1.2, [4, 3]);
      polyline(ctx, hi, C.accent, 1.2, [4, 3]);
    }

    /* 个体路径 */
    rows.forEach((r, k) => {
      const pts = [];
      for (let i = 0; i <= tt; i += stride) pts.push(xy(i, r[i], b));
      polyline(ctx, pts, C.series((k + 1) % 9), 0.9);
      /* 终点圆点：让「散布」这个东西有具体的落点 */
      const end = xy(tt, r[tt], b);
      ctx.save();
      ctx.fillStyle = C.series((k + 1) % 9);
      ctx.beginPath();
      ctx.arc(end[0], end[1], 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* 集体平均：期望恒为 0 的那条线 */
    if (avg.length > 1) polyline(ctx, avg, C.named('red'), 2.6);

    label(ctx, '细线 = 个体样本路径　红线 = 同一时刻的集体平均　蓝带 = 5%–95% 分位',
      geo.x - 34, cv.H - 24, C.grid, { size: 10 });
    label(ctx, '蓝带半宽 ≈ 1.64√t（t 越大越宽），个体终点则散布到 ±2√t 之外',
      geo.x - 34, cv.H - 8, C.grid, { size: 10 });

    /* 读数 */
    const ends = rows.map((r) => r[tt]);
    const mn = Math.min(...ends);
    const mx = Math.max(...ends);
    const mean = ends.reduce((s, v) => s + v, 0) / ends.length;
    const v05 = quantile(rows.map((r) => r[tt]), 0.05);
    const v95 = quantile(rows.map((r) => r[tt]), 0.95);
    ro.set('图中路径', nPaths + ' 条，画到第 ' + Math.round(tt) + ' / ' + steps + ' 格');
    ro.set('终点散布', '最低 ' + fmt(mn, 0) + '，最高 ' + fmt(mx, 0) + '，跨 ' + fmt(mx - mn, 0));
    ro.set('集体平均', fmt(mean, 2) + '（期望 0；抽样抖动 ≈ ±' + fmt(Math.sqrt(tt / nPaths), 1) + '）');
    ro.set('云带宽度', fmt(v05, 1) + ' … ' + fmt(v95, 1) + '，宽 ' + fmt(v95 - v05, 1)
      + '（理论 ≈ ' + fmt(3.29 * Math.sqrt(tt), 1) + '）');
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.3) return;
      acc = 0;
      t = t >= steps ? 0 : Math.min(t + Math.max(1, Math.round(steps / 20)), steps);
      draw();
    },
    onReset() { acc = 0; t = steps; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    t = Math.min(t + Math.max(1, Math.round(steps / 20)), steps);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    t = Math.max(t - Math.max(1, Math.round(steps / 20)), 12);
    draw();
  });

  onScreen(host, (v) => { if (!v) controls.stop(); });
  t = reduced ? steps : steps;
  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); cv.redraw = null; } };
}
