/* =========================================================================
 * lab 组件：frame-diff —— 帧间差分与运动检测
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "frame-diff",
 *     "title": "拖阈值，看噪声和漏检怎么此消彼长",
 *     "threshold": 0.15,
 *     "shift": 8,
 *     "noise": 0.02
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：threshold 0.15、shift 8 px、noise 0.02。
 *
 * 字段：
 *   threshold  初始差分阈值 0.01..0.6，默认 0.15
 *   shift      两帧之间小球平移多少像素 0..24，默认 8
 *   noise      传感器噪声幅度 0..0.12，默认 0.02
 *   pos        小球在第一帧里的水平位置 0.15..0.6，默认 0.3
 *
 * 能拖什么：
 *   阈值 / 位移 / 噪声 三个滑块；
 *   **直接在下方直方图上左右拖动** = 拖阈值线（直方图里那根竖线就是 τ）。
 *
 * 看什么：
 *   上排四张图：帧 A、帧 B、|A−B|（差分）、阈值化掩膜。背景是静止的棋盘格，
 *   所以差分里只剩「动过的东西」—— 这就是运动检测的起点。
 *   掩膜上那圈橙色轮廓是「真正的运动区域」（无噪声真值），白色是检测到的：
 *   轮廓外的白点 = 误检（噪声冒头），轮廓内没被填白 = 漏检（阈值太高）。
 *   下方直方图是 |A−B| 的分布（纵轴对数），左边那个尖峰是静止背景，
 *   右边那个小包是运动像素 —— 阈值就是在这两个包之间切一刀。
 *   把噪声拖大，两个包会糊到一起，此时没有阈值能同时躲开误检和漏检。
 *
 * 用的引擎函数：synth（'moving-ball' + 'checker' 合成场景）/ frameDiff / histogram
 * 画面来源：synth 程序化生成，不依赖外部视频或图片。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, label, fmt, clamp,
  toCanvas,
  setSliderRow,
  clearBg,
} from '../core.js';
import { synth, frameDiff, histogram } from '../engines/media.js';

const IW = 96;
const IH = 72;
const N = IW * IH;
const HMAX = 0.6;    /* 直方图横轴范围 */
const HBINS = 48;
const GAIN = 1.8;    /* 差分图的显示增益 */

/* 场景 = 静止棋盘背景 + 一个会平移的小球。背景静止，差分才干净。 */
function sceneAt(u) {
  const ball = synth(IW, IH, 'moving-ball', ((u - 0.2) / 0.6) * 60);
  const bg = synth(IW, IH, 'checker');
  const img = new Float64Array(N);
  for (let i = 0; i < N; i += 1) img[i] = clamp(0.42 * bg[i] + 0.58 * ball[i], 0, 1);
  return img;
}

/* 边界像素：真值为 1 且四邻里有 0 —— 用来在掩膜上画真值轮廓 */
function boundary(mask) {
  const out = [];
  for (let y = 0; y < IH; y += 1) {
    for (let x = 0; x < IW; x += 1) {
      const i = y * IW + x;
      if (!mask[i]) continue;
      if (x === 0 || x === IW - 1 || y === 0 || y === IH - 1
        || !mask[i - 1] || !mask[i + 1] || !mask[i - IW] || !mask[i + IW]) out.push(i);
    }
  }
  return out;
}

export default function render(host, spec) {
  let tau = clamp(spec.threshold ?? 0.15, 0.01, HMAX);
  let shift = clamp(spec.shift ?? 8, 0, 24);
  let noise = clamp(spec.noise ?? 0.02, 0, 0.12);
  let pos = clamp(spec.pos ?? 0.3, 0.15, 0.6);

  /* 单位方差噪声场，只生成一次，之后按 σ 缩放 —— 这样拖阈值时画面不抖 */
  const nA = new Float64Array(N);
  const nB = new Float64Array(N);
  for (let i = 0; i < N; i += 1) {
    nA[i] = ((Math.random() + Math.random() + Math.random()) - 1.5) * 1.15;
    nB[i] = ((Math.random() + Math.random() + Math.random()) - 1.5) * 1.15;
  }

  let A = new Float64Array(N);
  let B = new Float64Array(N);
  let truth = new Uint8Array(N);
  let truthEdge = [];
  let fd = null;
  let hist = new Array(HBINS).fill(0);
  let metrics = { fp: 0, fn: 0, hit: 0 };

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    阈值: '—', 平均差分能量: '—', 运动像素: '—', 误检: '—', 漏检: '—',
  });
  host.appendChild(ro.box);

  const geo = { hx: 0, hy: 0, hw: 0, hh: 0 };

  function rebuildFrames() {
    const cleanA = sceneAt(pos);
    const cleanB = sceneAt(pos + shift / IW);
    A = new Float64Array(N);
    B = new Float64Array(N);
    truth = new Uint8Array(N);
    for (let i = 0; i < N; i += 1) {
      A[i] = clamp(cleanA[i] + nA[i] * noise, 0, 1);
      B[i] = clamp(cleanB[i] + nB[i] * noise, 0, 1);
      truth[i] = Math.abs(cleanA[i] - cleanB[i]) > 0.02 ? 1 : 0;
    }
    truthEdge = boundary(truth);
    recomputeMask();
  }

  function recomputeMask() {
    fd = frameDiff(A, B, tau);
    /* 直方图：把 |diff| 折到 [0, HMAX] 再交给引擎的 histogram */
    const scaled = new Float64Array(N);
    for (let i = 0; i < N; i += 1) scaled[i] = clamp(fd.diff[i] / HMAX, 0, 1);
    hist = histogram(scaled, HBINS);
    let fp = 0;
    let fn = 0;
    let hit = 0;
    for (let i = 0; i < N; i += 1) {
      if (truth[i]) {
        if (fd.mask[i]) hit += 1; else fn += 1;
      } else if (fd.mask[i]) fp += 1;
    }
    metrics = { fp, fn, hit };
    const pct = (v) => `${fmt((v / N) * 100, 2)}%`;
    ro.set('阈值', `τ = ${fmt(tau, 3)}`);
    ro.set('平均差分能量', fmt(fd.energy, 4));
    ro.set('运动像素', `${pct(metrics.hit + metrics.fp)}（真值 ${pct(metrics.hit + metrics.fn)}）`);
    ro.set('误检', `${metrics.fp} 像素 ${pct(metrics.fp)} —— 轮廓外的白点`);
    ro.set('漏检', `${metrics.fn} 像素 ${pct(metrics.fn)} —— 轮廓内没填白`);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const gap = 12;
    const pw = Math.min(160, (W - 20 - gap * 3) / 4);
    const ph = Math.round((pw * IH) / IW);
    const off = Math.max(10, (W - (pw * 4 + gap * 3)) / 2);
    const topY = 22;

    const titles = ['帧 A（t）', `帧 B（t+1，平移 ${fmt(shift, 0)} px）`, '|A − B|（增益 ×1.8）', `掩膜（|A−B| > ${fmt(tau, 2)}）`];
    const imgs = [
      toCanvas(A, IW, IH),
      toCanvas(B, IW, IH),
      toCanvas(fd.diff, IW, IH, (v) => v * GAIN),
      toCanvas(fd.mask, IW, IH),
    ];

    for (let k = 0; k < 4; k += 1) {
      const x = off + k * (pw + gap);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(imgs[k], x, topY, pw, ph);
      ctx.restore();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, topY + 0.5, pw - 1, ph - 1);
      label(ctx, titles[k], x, topY - 6, C.fg, { size: 10, weight: 600 });
    }

    /* 真值轮廓叠在掩膜上 */
    const mx = off + 3 * (pw + gap);
    const sx = pw / IW;
    ctx.fillStyle = C.accent2;
    truthEdge.forEach((i) => {
      const x = i % IW;
      const y = Math.floor(i / IW);
      ctx.fillRect(mx + x * sx, topY + y * sx, Math.max(1, sx), Math.max(1, sx));
    });

    /* ---- 差分直方图 + 可拖的阈值线 ---- */
    const hy = topY + ph + 34;
    const hh = H - hy - 26;
    const hx = 52;
    const hw = W - hx - 16;
    geo.hx = hx;
    geo.hy = hy;
    geo.hw = hw;
    geo.hh = hh;

    label(ctx, '|A − B| 的分布（纵轴对数）：左边尖峰是静止背景，右边小包是运动像素',
      10, hy - 8, C.fg, { size: 11, weight: 600 });

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 0.5);
    ctx.lineTo(hx + hw, hy + 0.5);
    ctx.moveTo(hx + 0.5, hy);
    ctx.lineTo(hx + 0.5, hy + hh);
    ctx.stroke();

    let maxLog = 1;
    hist.forEach((c) => { maxLog = Math.max(maxLog, Math.log10(c + 1)); });
    const bw = hw / HBINS;
    for (let i = 0; i < HBINS; i += 1) {
      const t = Math.log10(hist[i] + 1) / maxLog;
      const bh = t * (hh - 4);
      const lo = (i / HBINS) * HMAX;
      ctx.fillStyle = lo >= tau ? C.accent : C.axis;
      ctx.fillRect(hx + i * bw + 0.5, hy + hh - bh, Math.max(1, bw - 1), bh);
    }

    /* 阈值线（可拖） */
    const tx = hx + (tau / HMAX) * hw;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, hy);
    ctx.lineTo(tx, hy + hh);
    ctx.stroke();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(tx, hy - 2);
    ctx.lineTo(tx - 5, hy - 9);
    ctx.lineTo(tx + 5, hy - 9);
    ctx.closePath();
    ctx.fill();
    label(ctx, `τ = ${fmt(tau, 3)}`, tx + 6, hy + 12, C.accent2, { size: 11, weight: 600 });

    /* 横轴刻度 */
    for (let i = 0; i <= 6; i += 1) {
      const v = (i / 6) * HMAX;
      label(ctx, fmt(v, 2), hx + (v / HMAX) * hw, hy + hh + 13, C.axis, { size: 10, align: 'center' });
    }
    label(ctx, '像素数（对数）', 8, hy + 10, C.axis, { size: 10 });
    label(ctx, '在直方图上左右拖动 = 拖阈值；噪声拖大后两个包会糊在一起，此时没有一刀能两全',
      10, H - 4, C.accent, { size: 11 });
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (geo.hw > 0 && y >= geo.hy - 12 && y <= geo.hy + geo.hh + 16
        && x >= geo.hx - 10 && x <= geo.hx + geo.hw + 10) return 'tau';
      return null;
    },
    down(id, x) { setTauFromX(x); },
    move(id, x) { setTauFromX(x); },
  });

  function setTauFromX(x) {
    const v = clamp(((x - geo.hx) / geo.hw) * HMAX, 0.01, HMAX);
    const r = Math.round(v * 1000) / 1000;
    if (Math.abs(r - tau) < 1e-4) return;
    tau = r;
    setSliderRow(sl, 0, tau, 3);
    recomputeMask();
    draw();
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'threshold', label: '阈值 τ', min: 0.01, max: HMAX, step: 0.005, value: tau, fmt: 3 },
        { name: 'shift', label: '帧间位移', min: 0, max: 24, step: 1, value: shift, fmt: 0 },
        { name: 'noise', label: '噪声 σ', min: 0, max: 0.12, step: 0.005, value: noise, fmt: 3 },
        { name: 'pos', label: '小球位置', min: 0.15, max: 0.6, step: 0.01, value: pos, fmt: 2 },
      ],
    },
    (st) => {
      const t2 = st.threshold ?? tau;
      const s2 = st.shift ?? shift;
      const n2 = st.noise ?? noise;
      const p2 = st.pos ?? pos;
      const framesChanged = s2 !== shift || n2 !== noise || p2 !== pos;
      tau = t2;
      shift = s2;
      noise = n2;
      pos = p2;
      if (framesChanged) rebuildFrames(); else recomputeMask();
      draw();
    },
  );

  rebuildFrames();
  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
