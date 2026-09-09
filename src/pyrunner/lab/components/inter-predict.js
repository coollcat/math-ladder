/* =========================================================================
 * lab 组件：inter-predict —— 帧间预测与残差：压缩率是从哪儿来的
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "inter-predict",
 *     "title": "残差越空，码流越小",
 *     "blockSize": 16,
 *     "search": 8,
 *     "dx": 6,
 *     "dy": 0,
 *     "gain": 3,
 *     "mode": "mc"
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：16×16 块、搜索半径 8、
 * 位移 (6, 0)、残差增益 3、默认走运动补偿。
 *
 * 字段：
 *   blockSize  块匹配块边长 4..24，默认 16
 *   search     搜索半径 2..12，默认 8
 *   dx / dy    场景的真实位移 −12..12，默认 (6, 0)
 *   gain       残差显示增益 1..8，默认 3（残差本身很「空」，放大才看得见）
 *   mode       "mc"（运动补偿，默认）或 "copy"（直接把上一帧搬来当预测）
 *
 * 能拖什么：
 *   **在四张图的任意一张上拖动 = 直接把场景拖着走**（dx / dy 跟着变，滑块同步）；
 *   块大小 / 搜索半径 / 水平位移 / 垂直位移 / 残差增益 五个滑块；
 *   「运动补偿 / 直接复制」分段按钮 —— 这是本组件最要紧的一个开关。
 *
 * 看什么：
 *   四张图：当前帧 → 预测帧 → 残差（0.5 灰 = 完全一致）→ 重建帧。
 *   下面那张分布对比图才是重点：灰色是当前帧的像素分布，蓝的是残差的分布。
 *   运动补偿把残差挤成一个又尖又窄的峰 —— 熵从 ~6 bit 掉到 ~2 bit，
 *   这就是「视频比一串图片小得多」的全部秘密。切到「直接复制」，
 *   残差里全是物体边缘，熵几乎没降，压缩率也就无从谈起。
 *
 * 用的引擎函数：synth / conv2 / KERNELS（合成带纹理的场景）/ blockMatch
 *               motionCompensate / residual / psnr / entropy / histogram
 * 画面来源：程序化随机纹理经 conv2 平滑 + synth 的小球，不依赖外部视频。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, label, polyline, fmt, clamp,
} from '../core.js';
import {
  synth, conv2, KERNELS, blockMatch, motionCompensate, residual, psnr, entropy, histogram,
} from '../engines/media.js';

const IW = 96;
const IH = 72;
const N = IW * IH;
const PAD = 16;
const BW = IW + PAD * 2;
const BH = IH + PAD * 2;
const HBINS = 64;

function makeTexture(w, h) {
  const r = new Float64Array(w * h);
  for (let i = 0; i < r.length; i += 1) r[i] = Math.random();
  return conv2(r, w, h, KERNELS.boxBlur);
}

function makeBig() {
  const tex = makeTexture(BW, BH);
  const ball = synth(BW, BH, 'moving-ball', 30);
  const img = new Float64Array(BW * BH);
  for (let i = 0; i < img.length; i += 1) img[i] = clamp(0.62 * tex[i] + 0.38 * ball[i], 0, 1);
  return img;
}

function cropView(big, ox, oy) {
  const out = new Float64Array(N);
  for (let y = 0; y < IH; y += 1) {
    for (let x = 0; x < IW; x += 1) out[y * IW + x] = big[(oy + y) * BW + ox + x];
  }
  return out;
}

function toCanvas(data, w, h, map) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d');
  const im = cx.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const v = clamp(map ? map(data[i], i) : data[i], 0, 1) * 255;
    const k = i * 4;
    im.data[k] = v;
    im.data[k + 1] = v;
    im.data[k + 2] = v;
    im.data[k + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  return cv;
}

/* entropy 只认 0..1 的输入（它按 value×bins 分箱），残差会超出这个范围，先夹住 */
function clampedCopy(arr) {
  const out = new Float64Array(arr.length);
  for (let i = 0; i < arr.length; i += 1) out[i] = clamp(arr[i], 0, 1);
  return out;
}

export default function render(host, spec) {
  const big = makeBig();
  let bs = clamp(Math.round((spec.blockSize ?? 16) / 4) * 4, 4, 24);
  let R = clamp(Math.round(spec.search ?? 8), 2, 12);
  let tdx = clamp(Math.round(spec.dx ?? 6), -12, 12);
  let tdy = clamp(Math.round(spec.dy ?? 0), -12, 12);
  let gain = clamp(spec.gain ?? 3, 1, 8);
  let mode = spec.mode === 'copy' ? 'copy' : 'mc';

  let ref = null;
  let cur = null;
  let pred = null;
  let res = null;
  let rec = null;
  let hCur = new Array(HBINS).fill(0);
  let hRes = new Array(HBINS).fill(0);
  let stat = { eCur: 0, eRes: 0, mse: 0, p: 0 };

  const cv = setupCanvas(host, 340);

  const seg = buildSegmented(
    [
      { label: '运动补偿预测', value: 'mc' },
      { label: '直接复制上一帧', value: 'copy' },
    ],
    mode,
    (v) => { mode = v; recompute(); draw(); },
  );
  host.appendChild(seg);

  const ro = buildReadout({
    预测方式: '—', 当前帧熵: '—', 残差熵: '—', 熵降幅: '—', 残差能量: '—', 重建PSNR: '—',
  });
  host.appendChild(ro.box);

  const box = { img: null, hist: null };
  let drag = null;

  function recompute() {
    ref = cropView(big, PAD, PAD);
    cur = cropView(big, PAD + tdx, PAD + tdy);
    if (mode === 'mc') {
      const mvs = blockMatch(ref, cur, IW, IH, bs, R, false);
      pred = motionCompensate(ref, IW, IH, mvs.vectors, bs);
    } else {
      pred = Float64Array.from(ref);
    }
    res = residual(cur, pred);
    rec = new Float64Array(N);
    let mse = 0;
    for (let i = 0; i < N; i += 1) {
      const v = clamp(pred[i] + res[i] - 0.5, 0, 1);
      rec[i] = v;
      const d = v - cur[i];
      mse += d * d;
    }
    mse /= N;
    hCur = histogram(clampedCopy(cur), HBINS);
    hRes = histogram(clampedCopy(res), HBINS);
    stat = {
      eCur: entropy(clampedCopy(cur), HBINS),
      eRes: entropy(clampedCopy(res), HBINS),
      mse,
      p: psnr(cur, rec),
    };

    ro.set('预测方式', mode === 'mc'
      ? `运动补偿（${bs}×${bs} 块，搜索半径 ${R}）`
      : '直接复制上一帧（不做运动补偿）');
    ro.set('当前帧熵', fmt(stat.eCur, 2) + ' bit/像素');
    ro.set('残差熵', fmt(stat.eRes, 2) + ' bit/像素');
    ro.set('熵降幅', `${fmt((1 - stat.eRes / Math.max(stat.eCur, 1e-6)) * 100, 1)}%`
      + '（无损编码的下界跟着降这么多）');
    ro.set('残差能量', `MSE = ${fmt(stat.mse, 5)}（原帧自身的方差约 ${fmt(variance(cur), 5)}）`);
    ro.set('重建PSNR', stat.p > 60 ? '> 60 dB（逐位几乎相同）' : fmt(stat.p, 2) + ' dB');
  }

  function variance(a) {
    let m = 0;
    for (let i = 0; i < a.length; i += 1) m += a[i];
    m /= a.length;
    let v = 0;
    for (let i = 0; i < a.length; i += 1) v += (a[i] - m) * (a[i] - m);
    return v / a.length;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const gap = 14;
    const pw = Math.min(158, (W - 20 - gap * 3) / 4);
    const ph = Math.round((pw * IH) / IW);
    const off = Math.max(10, (W - (pw * 4 + gap * 3)) / 2);
    const topY = 22;

    const titles = ['当前帧（要编码的）', mode === 'mc' ? '预测帧（运动补偿）' : '预测帧（= 上一帧）',
      `残差 ×${fmt(gain, 0)}（灰=0）`, '重建帧（预测 + 残差）'];
    const imgs = [
      toCanvas(cur, IW, IH),
      toCanvas(pred, IW, IH),
      toCanvas(res, IW, IH, (v) => (v - 0.5) * gain + 0.5),
      toCanvas(rec, IW, IH),
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
    box.img = { x: off, y: topY, w: pw * 4 + gap * 3, h: ph, pw };

    /* ---- 分布对比：当前帧 vs 残差 ---- */
    const hy = topY + ph + 34;
    const hh = H - hy - 30;
    const hx = 46;
    const hw = W - hx - 16;
    box.hist = { x: hx, y: hy, w: hw, h: hh };

    label(ctx, '分布对比：灰色是当前帧，蓝色是残差 —— 残差越尖，熵越小，越好压',
      10, hy - 8, C.fg, { size: 11, weight: 600 });

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 0.5);
    ctx.lineTo(hx + hw, hy + 0.5);
    ctx.moveTo(hx + 0.5, hy);
    ctx.lineTo(hx + 0.5, hy + hh);
    ctx.stroke();

    let mx = 1;
    for (let i = 0; i < HBINS; i += 1) mx = Math.max(mx, hCur[i], hRes[i]);
    const bw2 = hw / HBINS;
    /* 当前帧分布：灰色面积 */
    ctx.fillStyle = C.axis;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < HBINS; i += 1) {
      const bh = (hCur[i] / mx) * (hh - 4);
      ctx.fillRect(hx + i * bw2, hy + hh - bh, Math.max(1, bw2), bh);
    }
    ctx.globalAlpha = 1;
    /* 残差分布：蓝色折线（更醒目） */
    const pts = [];
    for (let i = 0; i < HBINS; i += 1) {
      const bh = (hRes[i] / mx) * (hh - 4);
      pts.push([hx + i * bw2 + bw2 / 2, hy + hh - bh]);
    }
    polyline(ctx, pts, C.accent, 2);

    /* 0.5 灰 = 残差为 0 的位置 */
    const zx = hx + hw / 2;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(zx, hy);
    ctx.lineTo(zx, hy + hh);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '残差 = 0（0.5 灰）', zx + 4, hy + 12, C.accent2, { size: 10 });

    label(ctx, '像素值 →', hx + hw, hy + hh + 13, C.axis, { size: 10, align: 'right' });
    label(ctx, '像素数', 6, hy + 10, C.axis, { size: 10 });
    label(ctx, '在四张图上拖动 = 把场景拖着走，看残差怎么长出来；切「直接复制」看没有补偿时有多糟',
      10, H - 4, C.accent, { size: 11 });
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const r = box.img;
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return 'move';
      return null;
    },
    down(id, x, y) {
      drag = { x, y, tdx, tdy };
    },
    move(id, x, y) {
      if (!drag) return;
      /* 图上 1 像素 = 屏幕上 k 个 CSS 像素；拖右 = 内容跟手向右 = 采样窗左移 */
      const k = (box.img.pw || IW) / IW;
      const ndx = clamp(Math.round(drag.tdx - (x - drag.x) / k), -12, 12);
      const ndy = clamp(Math.round(drag.tdy - (y - drag.y) / k), -12, 12);
      if (ndx === tdx && ndy === tdy) return;
      tdx = ndx;
      tdy = ndy;
      syncSlider(2, tdx, 0);
      syncSlider(3, tdy, 0);
      recompute();
      draw();
    },
    up() { drag = null; },
  });

  function syncSlider(idx, value, digits) {
    try {
      const row = sl.box.children[idx];
      if (!row) return;
      const input = row.querySelector('input');
      const val = row.querySelector('.ml-slider__val');
      if (input) input.value = String(value);
      if (val) val.textContent = fmt(value, digits);
    } catch (e) { void e; }
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'blockSize', label: '块大小', min: 4, max: 24, step: 4, value: bs, fmt: 0 },
        { name: 'search', label: '搜索半径', min: 2, max: 12, step: 1, value: R, fmt: 0 },
        { name: 'dx', label: '位移 x', min: -12, max: 12, step: 1, value: tdx, fmt: 0 },
        { name: 'dy', label: '位移 y', min: -12, max: 12, step: 1, value: tdy, fmt: 0 },
        { name: 'gain', label: '残差增益', min: 1, max: 8, step: 0.5, value: gain, fmt: 1 },
      ],
    },
    (st) => {
      bs = clamp(Math.round((st.blockSize ?? bs) / 4) * 4, 4, 24);
      R = clamp(Math.round(st.search ?? R), 2, 12);
      tdx = clamp(Math.round(st.dx ?? tdx), -12, 12);
      tdy = clamp(Math.round(st.dy ?? tdy), -12, 12);
      gain = clamp(st.gain ?? gain, 1, 8);
      recompute();
      draw();
    },
  );

  recompute();
  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
