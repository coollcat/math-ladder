/* =========================================================================
 * lab 组件：jpeg-quant —— 量化矩阵与 JPEG 的取舍
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "jpeg-quant",
 *     "title": "把质量因子往下拖，看块效应是怎么长出来的",
 *     "quality": 35,
 *     "blockX": 5,
 *     "blockY": 5
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：quality 默认 35，选中块默认 (5,5)。
 *
 * 字段：
 *   quality  初始质量因子 2..98，默认 35（50 = JPEG 标准量化表原样，越小越狠）
 *   blockX   初始选中的 8×8 块列号 0..11，默认 5
 *   blockY   初始选中的 8×8 块行号 0..11，默认 5
 *   view     中间那张图默认看什么："rec"（重建，默认）/ "error"（误差×4）/ "src"
 *
 * 能拖什么：
 *   质量因子滑块（2..98）—— 主交互；
 *   在「原图」或「重建」上拖动 —— 换选中的 8×8 块，下排两个 8×8 网格与右上的
 *   放大图都跟着变。
 *
 * 看什么：
 *   上排：原图 / 重建（可切成误差×4 或原图）/ 选中块邻域放大（白线是块边界）。
 *   下排两个 8×8 网格：选中块的 DCT 系数（对数幅值）与量化后的整数（0 记作 ·）。
 *   质量因子往下拖，右边的 · 越来越多，重建图浮现 8×8 方格（块效应）与硬边旁的
 *   一圈水波（振铃）—— 它们都是「高频系数被整批抹成 0」的后果。
 *
 * 用的引擎函数：synth（合成图）/ dct8x8 / idct8x8 / Q_LUMA / quantizeBlock
 *               dequantizeBlock / countNonZero / psnr
 * 图像来源：synth 程序化合成（渐变 + 同心圆环 + 硬边圆盘），不依赖外部图片。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, label, fmt, clamp,
} from '../core.js';
import {
  synth, dct8x8, idct8x8, Q_LUMA, quantizeBlock, dequantizeBlock, countNonZero, psnr,
} from '../engines/media.js';

const IW = 96;   /* 图宽，8 的倍数 */
const IH = 96;   /* 图高 */
const NBX = IW / 8;
const NBY = IH / 8;
const ZOOM = 24; /* 放大窗口边长（像素），以选中块为中心取 24×24 */

/* 合成测试图：平缓渐变（低频）+ 同心圆环（中高频）+ 硬边圆盘（边缘）。
   三种成分各占一块权重，正好对应「量化时谁先死」。 */
function sourceImage() {
  const grad = synth(IW, IH, 'gradient');
  const rings = synth(IW, IH, 'rings');
  const disc = synth(IW, IH, 'circle');
  const img = new Float64Array(IW * IH);
  for (let i = 0; i < img.length; i += 1) {
    img[i] = clamp(0.35 * grad[i] + 0.45 * rings[i] + 0.2 * disc[i], 0, 1);
  }
  return img;
}

/* 灰度数组 → 离屏 canvas（之后用 drawImage 放大，关掉平滑以保住像素感） */
function toCanvas(data, w, h, map) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d');
  const im = cx.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    let v = map ? map(data[i], i) : data[i];
    v = clamp(v, 0, 1) * 255;
    const k = i * 4;
    im.data[k] = v;
    im.data[k + 1] = v;
    im.data[k + 2] = v;
    im.data[k + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  return cv;
}

function crop(data, x0, y0, n) {
  const out = new Float64Array(n * n);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const sx = clamp(x0 + x, 0, IW - 1);
      const sy = clamp(y0 + y, 0, IH - 1);
      out[y * n + x] = data[sy * IW + sx];
    }
  }
  return out;
}

/* 整幅图的 JPEG 核心链路：分块 → 电平搬移(−128) → DCT → 量化 → 反量化 → IDCT → +128。
   ⚠ 电平必须搬到 0..255 那一档：Q_LUMA 是照着「像素 0..255、搬移 −128」定的，
   直接拿 0..1 的像素去除它，系数会小两个数量级，整块被抹成 0，重建图是一片死灰。
   所以这里 (src − 0.5) × 255 进去，IDCT 之后 /255 + 0.5 回来。 */
function encodeDecode(src, quality) {
  const rec = new Float64Array(src.length);
  const err = new Float64Array(src.length);
  const blocks = [];
  let nz = 0;
  for (let by = 0; by + 8 <= IH; by += 8) {
    for (let bx = 0; bx + 8 <= IW; bx += 8) {
      const blk = new Float64Array(64);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          blk[y * 8 + x] = (src[(by + y) * IW + bx + x] - 0.5) * 255;
        }
      }
      const coef = dct8x8(blk);
      const q = quantizeBlock(coef, Q_LUMA, quality);
      const back = idct8x8(dequantizeBlock(q, Q_LUMA, quality));
      nz += countNonZero(q);
      blocks.push({ bx, by, coef, q });
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const v = clamp(back[y * 8 + x] / 255 + 0.5, 0, 1);
          const i = (by + y) * IW + bx + x;
          rec[i] = v;
          err[i] = Math.abs(v - src[i]);
        }
      }
    }
  }
  return { rec, err, blocks, nz, psnrDb: psnr(src, rec) };
}

export default function render(host, spec) {
  const src = sourceImage();
  const srcCv = toCanvas(src, IW, IH);
  const srcZoom = (bx, by) => toCanvas(crop(src, bx * 8 - 8, by * 8 - 8, ZOOM), ZOOM, ZOOM);

  let quality = clamp(spec.quality ?? 35, 2, 98);
  let sbx = clamp(Math.round(spec.blockX ?? 5), 0, NBX - 1);
  let sby = clamp(Math.round(spec.blockY ?? 5), 0, NBY - 1);
  let view = spec.view === 'error' ? 'error' : spec.view === 'src' ? 'src' : 'rec';

  let codec = null;
  let recCv = null;
  let errCv = null;

  const cv = setupCanvas(host, 400);

  const seg = buildSegmented(
    [
      { label: '重建图', value: 'rec' },
      { label: '误差 ×4', value: 'error' },
      { label: '原图', value: 'src' },
    ],
    view,
    (v) => { view = v; draw(); },
  );
  host.appendChild(seg);

  const ro = buildReadout({
    质量因子: '—', 量化缩放: '—', 非零系数: '—', 平均每块非零: '—', PSNR: '—',
  });
  host.appendChild(ro.box);

  /* 布局结果留给 bindPointer 做命中判定 */
  const box = { a: null, b: null };

  function recompute() {
    codec = encodeDecode(src, quality);
    recCv = toCanvas(codec.rec, IW, IH);
    errCv = toCanvas(codec.err, IW, IH, (v) => v * 4);
    const scale = quality < 50 ? 50 / quality : (100 - quality) / 50;
    ro.set('质量因子', String(Math.round(quality)));
    ro.set('量化缩放', fmt(scale, 2) + ' ×（整张量化表乘这个数）');
    ro.set('非零系数', `${codec.nz} / ${NBX * NBY * 64}（${fmt((codec.nz / (NBX * NBY * 64)) * 100, 1)}%）`);
    ro.set('平均每块非零', fmt(codec.nz / (NBX * NBY), 1) + ' 个 / 64');
    ro.set('PSNR', isFinite(codec.psnrDb) ? fmt(codec.psnrDb, 2) + ' dB' : '∞ dB（逐位相同）');
  }

  function panel(ctx, C, r, title, img, markBlock) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.restore();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    if (markBlock) {
      const cw = r.w / IW;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + sbx * 8 * cw, r.y + sby * 8 * cw, 8 * cw, 8 * cw);
    }
    label(ctx, title, r.x, r.y - 6, C.fg, { size: 11, weight: 600 });
  }

  function grid8(ctx, C, x, y, cell, data, opts) {
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const v = data[r * 8 + c];
        const px = x + c * cell;
        const py = y + r * cell;
        ctx.fillStyle = C.soft;
        ctx.fillRect(px, py, cell - 1, cell - 1);
        const t = clamp(opts.level(v), 0, 1);
        if (t > 0.002) {
          ctx.save();
          ctx.globalAlpha = t;
          ctx.fillStyle = opts.color;
          ctx.fillRect(px, py, cell - 1, cell - 1);
          ctx.restore();
        }
        if (opts.text) {
          label(ctx, opts.text(v), px + cell / 2, py + cell / 2 + 4, C.fg,
            { size: Math.min(11, cell * 0.5), align: 'center' });
        }
      }
    }
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cell * 8 - 1, cell * 8 - 1);
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
    const ps = Math.min(150, (W - 20 - gap * 2) / 3);
    const off = Math.max(10, (W - (ps * 3 + gap * 2)) / 2);
    const topY = 24;

    const ra = { x: off, y: topY, w: ps, h: ps };
    const rb = { x: off + ps + gap, y: topY, w: ps, h: ps };
    const rc = { x: off + (ps + gap) * 2, y: topY, w: ps, h: ps };
    box.a = ra;
    box.b = rb;

    panel(ctx, C, ra, '原图（96×96 = 12×12 个块）', srcCv, true);
    const midImg = view === 'error' ? errCv : view === 'src' ? srcCv : recCv;
    const midTitle = view === 'error' ? '重建误差 ×4（越亮错得越多）'
      : view === 'src' ? '原图（与左图同，便于左右扫视）' : '重建（反量化 + IDCT）';
    panel(ctx, C, rb, midTitle, midImg, true);

    /* 右：选中块邻域放大，白线画出 8×8 块边界 —— 块效应在这张图上一目了然 */
    const zoomSrc = view === 'error' ? codec.err : codec.rec;
    const zoomCv = toCanvas(crop(zoomSrc, sbx * 8 - 8, sby * 8 - 8, ZOOM), ZOOM, ZOOM,
      view === 'error' ? (v) => v * 4 : null);
    panel(ctx, C, rc, `选中块邻域放大 ×${Math.round(ps / ZOOM)}`, zoomCv, false);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    const zw = rc.w / ZOOM;
    for (let k = 0; k <= ZOOM; k += 8) {
      ctx.beginPath();
      ctx.moveTo(rc.x + k * zw, rc.y);
      ctx.lineTo(rc.x + k * zw, rc.y + rc.h);
      ctx.moveTo(rc.x, rc.y + k * zw);
      ctx.lineTo(rc.x + rc.w, rc.y + k * zw);
      ctx.stroke();
    }
    ctx.restore();
    if (view !== 'error') {
      /* 原图同窗口放大（左下角小图）供对照 */
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(srcZoom(sbx, sby), rc.x + 4, rc.y + rc.h - 46, 42, 42);
      ctx.restore();
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(rc.x + 4.5, rc.y + rc.h - 45.5, 41, 41);
      label(ctx, '原', rc.x + 4, rc.y + rc.h - 50, C.fg, { size: 10 });
    }

    /* ---- 下排：选中块的两个 8×8 网格 ---- */
    const y2 = topY + ps + 32;
    const cell = Math.min(22, Math.floor((W - 24) / 17));
    const blk = codec.blocks[sby * NBX + sbx];

    let maxAbs = 0;
    for (let i = 0; i < 64; i += 1) maxAbs = Math.max(maxAbs, Math.abs(blk.coef[i]));
    const denom = Math.log(1 + Math.max(maxAbs, 1e-6));

    label(ctx, `选中块 (${sbx}, ${sby}) 的 DCT 系数（对数幅值，越亮越大）`, off, y2 - 8, C.fg,
      { size: 11, weight: 600 });
    grid8(ctx, C, off, y2, cell, blk.coef, {
      color: C.accent,
      level: (v) => Math.log(1 + Math.abs(v)) / denom,
    });

    const gx2 = off + cell * 8 + 40;
    label(ctx, '量化后（÷量化表再取整，0 记作 ·）', gx2, y2 - 8, C.fg, { size: 11, weight: 600 });
    grid8(ctx, C, gx2, y2, cell, blk.q, {
      color: C.accent2,
      level: (v) => (v === 0 ? 0 : clamp(0.25 + Math.log(1 + Math.abs(v)) / denom, 0.25, 1)),
      text: (v) => (v === 0 ? '·' : String(Math.round(v))),
    });

    /* 右侧说明（窄屏放不下就省略，数字读数条里都有） */
    const tx = gx2 + cell * 8 + 28;
    if (W - tx > 230) {
      const scale = quality < 50 ? 50 / quality : (100 - quality) / 50;
      const lines = [
        `量化 = 系数 ÷（Q 表 × ${fmt(scale, 2)}）取整。`,
        'Q 表右下角（高频）本来就大，',
        '再乘缩放，高频几乎整片归零。',
        '块里只剩几个低频，块与块接不上，',
        '于是出现 8×8 方格（块效应）；',
        '硬边旁丢掉的高频让边缘过冲，',
        '荡出一圈水波（振铃）。',
      ];
      lines.forEach((t, i) => label(ctx, t, tx, y2 + 10 + i * 15, C.fg, { size: 11 }));
    }

    label(ctx, '在左/中两张图上拖动 = 换选中的 8×8 块；拖质量因子滑块 = 看取舍',
      off, H - 6, C.accent, { size: 11 });
  }

  function pickBlock(which, x, y) {
    const r = which === 'b' ? box.b : box.a;
    if (!r) return;
    const bx = clamp(Math.floor(((x - r.x) / r.w) * NBX), 0, NBX - 1);
    const by = clamp(Math.floor(((y - r.y) / r.h) * NBY), 0, NBY - 1);
    if (bx === sbx && by === sby) return;
    sbx = bx;
    sby = by;
    draw();
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const hit = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
      if (hit(box.a)) return 'a';
      if (hit(box.b)) return 'b';
      return null;
    },
    down(id, x, y) { pickBlock(id, x, y); },
    move(id, x, y) { pickBlock(id, x, y); },
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'quality', label: '质量因子', min: 2, max: 98, step: 1, value: quality, fmt: 0 },
      ],
    },
    (st) => {
      quality = st.quality ?? quality;
      recompute();
      draw();
    },
  );

  recompute();
  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
