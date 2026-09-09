/* =========================================================================
 * lab 组件：rate-distortion —— 码率控制与率失真：同样码率下选失真更低的那个
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "rate-distortion",
 *     "title": "拖那根竖线：同样多的比特，也能压得更清楚",
 *     "rate": 1.6
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：目标码率默认取两条曲线码率范围的中点。
 *
 * 字段：
 *   rate   初始目标码率（bit/像素）0.1 .. 曲线最大码率，默认取中点
 *
 * 能拖什么：
 *   **直接在图上左右拖动那根橙色竖线** = 拖目标码率（滑块同步）；
 *   也可以点曲线上的圆点 = 跳到那个工作点；
 *   目标码率滑块。
 *
 * 看什么：
 *   两条率失真（R-D）曲线：蓝的是「8×8 DCT + 量化矩阵」（JPEG 那条路），
 *   橙的是「直接对每个像素做均匀量化」（不换基，硬压）。
 *   任意码率下，蓝线都在橙线上方 —— 这就是变换编码的全部价值：
 *   把能量集中到少数系数上，再扔掉剩下的，比一刀切地压像素划算得多。
 *   右侧两张图是同一码率下两种方案的重建结果，肉眼就能分出高下。
 *
 * 口径（比较的公平性全靠这两条）：
 *   码率 = 编码符号的一阶熵（bit/像素），用引擎的 entropy 算。
 *          它忽略了游程编码与霍夫曼，绝对数值偏大，但两种方案用同一把尺子，
 *          相对高低是可信的。
 *   失真 = PSNR（dB），用引擎的 psnr 算，越大越好。
 *
 * 用的引擎函数：synth（合成图）/ dct8x8 / idct8x8 / Q_LUMA / quantizeBlock
 *               dequantizeBlock / countNonZero / quantize / entropy / psnr
 * 图像来源：synth 程序化合成（渐变 + 同心圆环），不依赖外部图片。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, polyline, label, fmt, clamp,
} from '../core.js';
import {
  synth, dct8x8, idct8x8, Q_LUMA, quantizeBlock, dequantizeBlock, countNonZero, quantize,
  entropy, psnr,
} from '../engines/media.js';

const IW = 96;
const IH = 96;
const N = IW * IH;

/* DCT 方案的扫描点：JPEG 质量因子从高到低。这 11 个点是实测挑的 ——
   码率覆盖 0.77 ~ 4.42 bit/px，正好和下面像素域那条曲线有足够重叠，
   竖线停在这个区间里两条曲线都有话说。每个点要跑一遍全图 DCT/IDCT，
   11 个点合计约 120 ms（实测），首屏只算这一次。 */
const DQ = [99, 96, 92, 86, 78, 68, 56, 44, 32, 20, 8];
/* 空间域方案的扫描点：量化电平数（0..1 上均匀取 levels 级） */
const SL = [200, 120, 80, 50, 32, 20, 13, 9, 6, 4, 3, 2];

function sourceImage() {
  const grad = synth(IW, IH, 'gradient');
  const rings = synth(IW, IH, 'rings');
  const img = new Float64Array(N);
  for (let i = 0; i < N; i += 1) img[i] = clamp(0.4 * grad[i] + 0.6 * rings[i], 0, 1);
  return img;
}

/* 整数序列的一阶熵：先仿射映射到 [0,1) 再交给引擎的 entropy。
   仿射是一一映射，分箱数取到「不同取值个数」以上，所以不会把两个值并成一格。 */
function entropyOfInts(ints) {
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < ints.length; i += 1) {
    if (ints[i] < mn) mn = ints[i];
    if (ints[i] > mx) mx = ints[i];
  }
  if (!isFinite(mn) || mn === mx) return 0;
  const span = mx - mn;
  const bins = Math.min(4096, Math.max(64, Math.round(span) + 1));
  const norm = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i += 1) {
    norm[i] = ((ints[i] - mn) / span) * (1 - 1 / bins);
  }
  return entropy(norm, bins);
}

/* DCT 支路：分块 DCT → 量化 → 反量化 → IDCT。
   ⚠ 电平要搬到 0..255 那一档：Q_LUMA 是照着「像素 0..255、搬移 −128」定的，
   拿 0..1 的像素直接去除它，系数会小两个数量级，整块被抹成 0，
   曲线会坍缩成一条水平线（实测过，PSNR 一路 12.31 dB）。
   所以 (src − 0.5) × 255 进去，IDCT 之后 /255 + 0.5 回来。 */
function dctPath(src, quality) {
  const rec = new Float64Array(N);
  const allQ = new Float64Array(N);
  for (let by = 0; by + 8 <= IH; by += 8) {
    for (let bx = 0; bx + 8 <= IW; bx += 8) {
      const blk = new Float64Array(64);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          blk[y * 8 + x] = (src[(by + y) * IW + bx + x] - 0.5) * 255;
        }
      }
      const q = quantizeBlock(dct8x8(blk), Q_LUMA, quality);
      const back = idct8x8(dequantizeBlock(q, Q_LUMA, quality));
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const i = (by + y) * IW + bx + x;
          rec[i] = clamp(back[y * 8 + x] / 255 + 0.5, 0, 1);
          allQ[i] = q[y * 8 + x];
        }
      }
    }
  }
  return { rec, rate: entropyOfInts(allQ), nz: countNonZero(allQ) };
}

/* 空间域支路：直接对像素做均匀量化（levels 级） */
function spatialPath(src, levels) {
  const rec = quantize(src, levels);
  return { rec, rate: entropy(rec, Math.max(64, levels + 1)) };
}

function toCanvas(data) {
  const cv = document.createElement('canvas');
  cv.width = IW;
  cv.height = IH;
  const cx = cv.getContext('2d');
  const im = cx.createImageData(IW, IH);
  for (let i = 0; i < N; i += 1) {
    const v = clamp(data[i], 0, 1) * 255;
    const k = i * 4;
    im.data[k] = v;
    im.data[k + 1] = v;
    im.data[k + 2] = v;
    im.data[k + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  return cv;
}

export default function render(host, spec) {
  const src = sourceImage();
  const srcCv = toCanvas(src);

  /* ---- 一次性把两条曲线扫出来（拖竖线时不再重算） ---- */
  const dctPts = DQ.map((quality) => {
    const r = dctPath(src, quality);
    return {
      p: quality, rec: r.rec, cv: toCanvas(r.rec), rate: r.rate, nz: r.nz,
      psnrDb: psnr(src, r.rec), label: `质量因子 ${quality}`,
    };
  });
  const spPts = SL.map((levels) => {
    const r = spatialPath(src, levels);
    return {
      p: levels, rec: r.rec, cv: toCanvas(r.rec), rate: r.rate,
      psnrDb: psnr(src, r.rec), label: `${levels} 级均匀量化`,
    };
  });

  let rMax = 0;
  let pMin = Infinity;
  let pMax = -Infinity;
  [...dctPts, ...spPts].forEach((pt) => {
    rMax = Math.max(rMax, pt.rate);
    pMin = Math.min(pMin, pt.psnrDb);
    pMax = Math.max(pMax, pt.psnrDb);
  });
  rMax = Math.max(1, Math.ceil(rMax * 10) / 10);
  pMin = Math.max(5, Math.floor(pMin - 1));
  pMax = Math.min(60, Math.ceil(pMax + 1));

  let target = clamp(spec.rate ?? rMax * 0.45, 0.05, rMax);

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({
    目标码率: '—', 'DCT 方案': '—', '空间域方案': '—', '同样码率下的收益': '—',
  });
  host.appendChild(ro.box);

  const box = { plot: null };

  /* 在一条曲线上按码率插值出工作点（取码率最接近的样点用于出图） */
  function pick(pts, r) {
    let bi = 0;
    let bd = Infinity;
    pts.forEach((pt, i) => {
      const d = Math.abs(pt.rate - r);
      if (d < bd) { bd = d; bi = i; }
    });
    /* 线性插值出 PSNR，便于在竖线上标出交叉点 */
    const sorted = pts.slice().sort((a, b) => a.rate - b.rate);
    let p = pts[bi].psnrDb;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if ((r >= a.rate && r <= b.rate) || (r <= a.rate && r >= b.rate)) {
        const t = Math.abs(b.rate - a.rate) < 1e-9 ? 0 : (r - a.rate) / (b.rate - a.rate);
        p = a.psnrDb + (b.psnrDb - a.psnrDb) * t;
        break;
      }
    }
    return { pt: pts[bi], psnrAt: p, rate: r };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const px0 = 54;
    const pw = Math.max(120, W * 0.5 - px0);
    const py0 = 30;
    const phh = H - py0 - 46;
    box.plot = { x: px0, y: py0, w: pw, h: phh };

    const X = (r) => px0 + (r / rMax) * pw;
    const Y = (p) => py0 + phh - ((p - pMin) / (pMax - pMin)) * phh;

    /* 网格与刻度 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
      const r = (i / 5) * rMax;
      const x = X(r);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, py0);
      ctx.lineTo(x + 0.5, py0 + phh);
      ctx.stroke();
      label(ctx, fmt(r, 1), x, py0 + phh + 14, C.axis, { size: 10, align: 'center' });
      const p = pMin + ((pMax - pMin) * i) / 5;
      const y = Y(p);
      ctx.beginPath();
      ctx.moveTo(px0, y + 0.5);
      ctx.lineTo(px0 + pw, y + 0.5);
      ctx.stroke();
      label(ctx, fmt(p, 0), px0 - 6, y + 4, C.axis, { size: 10, align: 'right' });
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(px0 + 0.5, py0);
    ctx.lineTo(px0 + 0.5, py0 + phh);
    ctx.moveTo(px0, py0 + phh + 0.5);
    ctx.lineTo(px0 + pw, py0 + phh + 0.5);
    ctx.stroke();
    label(ctx, '码率（bit/像素）', px0 + pw, py0 + phh + 28, C.fg, { size: 11, align: 'right' });
    label(ctx, 'PSNR (dB)', 6, py0 - 10, C.fg, { size: 11 });
    label(ctx, '率失真曲线：越靠左上越好（少比特 + 高保真）', px0, 16, C.fg,
      { size: 11, weight: 600 });

    /* 两条曲线 */
    const drawCurve = (pts, color) => {
      const p2 = pts.slice().sort((a, b) => a.rate - b.rate)
        .map((pt) => [X(pt.rate), Y(pt.psnrDb)]);
      polyline(ctx, p2, color, 2);
      pts.forEach((pt) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(X(pt.rate), Y(pt.psnrDb), 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    drawCurve(spPts, C.accent2);
    drawCurve(dctPts, C.accent);

    /* 图例 */
    label(ctx, '● DCT + 量化矩阵', px0 + 8, py0 + 14, C.accent, { size: 10, weight: 600 });
    label(ctx, '● 像素域均匀量化', px0 + 8, py0 + 28, C.accent2, { size: 10, weight: 600 });

    /* 目标码率竖线 + 两条曲线上的交叉点 */
    const a = pick(dctPts, target);
    const b = pick(spPts, target);
    const xr = X(target);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xr, py0);
    ctx.lineTo(xr, py0 + phh);
    ctx.stroke();
    ctx.setLineDash([]);
    [[a, C.accent], [b, C.accent2]].forEach(([q, col]) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(xr, Y(q.psnrAt), 5.5, 0, Math.PI * 2);
      ctx.stroke();
    });

    /* 收益标注：同一码率下两条曲线的垂直落差 */
    const ya = Y(a.psnrAt);
    const yb = Y(b.psnrAt);
    if (Math.abs(ya - yb) > 3) {
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xr + 10, ya);
      ctx.lineTo(xr + 10, yb);
      ctx.moveTo(xr + 7, ya);
      ctx.lineTo(xr + 13, ya);
      ctx.moveTo(xr + 7, yb);
      ctx.lineTo(xr + 13, yb);
      ctx.stroke();
      label(ctx, `+${fmt(a.psnrAt - b.psnrAt, 1)} dB`, xr + 16, (ya + yb) / 2 + 4, C.fg,
        { size: 11, weight: 700 });
    }

    /* ---- 右侧：同一码率下两种方案的重建图（三张并排，最左是原图） ---- */
    const ix = px0 + pw + 26;
    const avail = W - 10 - ix;
    const gapI = 12;
    const iw = Math.min(112, (avail - gapI * 2) / 3);
    if (iw > 56) {
      const iy = 34;
      const cards = [
        { img: srcCv, title: '原图', sub: '未压缩', col: C.axis,
          m: [`${fmt(entropy(src, 256), 2)} bit/px`] },
        { img: a.pt.cv, title: 'DCT + 量化矩阵', sub: a.pt.label, col: C.accent,
          m: [`${fmt(a.pt.rate, 2)} bit/px`, `${fmt(a.pt.psnrDb, 1)} dB`] },
        { img: b.pt.cv, title: '像素域均匀量化', sub: b.pt.label, col: C.accent2,
          m: [`${fmt(b.pt.rate, 2)} bit/px`, `${fmt(b.pt.psnrDb, 1)} dB`] },
      ];
      cards.forEach((cd, k) => {
        const x = ix + k * (iw + gapI);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cd.img, x, iy, iw, iw);
        ctx.restore();
        ctx.strokeStyle = cd.col;
        ctx.lineWidth = k === 0 ? 1 : 2;
        ctx.strokeRect(x + 0.5, iy + 0.5, iw - 1, iw - 1);
        label(ctx, cd.title, x, iy - 6, k === 0 ? C.fg : cd.col, { size: 10, weight: 600 });
        label(ctx, cd.sub, x, iy + iw + 14, C.axis, { size: 9 });
        cd.m.forEach((t, j) => label(ctx, t, x, iy + iw + 30 + j * 14, C.fg, { size: 10 }));
      });
      label(ctx, '右边两张花的比特几乎一样，', ix, iy + iw + 66, C.fg, { size: 10 });
      label(ctx, '差别全在「先换基再扔」这一步。', ix, iy + iw + 80, C.fg, { size: 10 });
    }

    label(ctx, '在图上左右拖动那根竖线 = 拖目标码率；点曲线上的圆点 = 跳到那个工作点',
      10, H - 4, C.accent, { size: 11 });

    ro.set('目标码率', `${fmt(target, 2)} bit/像素（原图一阶熵 ${fmt(entropy(src, 256), 2)}）`);
    ro.set('DCT 方案', `${a.pt.label}　码率 ${fmt(a.pt.rate, 2)}　PSNR ${fmt(a.pt.psnrDb, 2)} dB`
      + `　非零系数 ${a.pt.nz} / ${N}`);
    ro.set('空间域方案', `${b.pt.label}　码率 ${fmt(b.pt.rate, 2)}　PSNR ${fmt(b.pt.psnrDb, 2)} dB`);
    ro.set('同样码率下的收益', `DCT 高 ${fmt(a.psnrAt - b.psnrAt, 2)} dB`
      + `（MSE 只有像素域的 ${fmt(10 ** (-(a.psnrAt - b.psnrAt) / 10), 3)} 倍）`);
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const p = box.plot;
      if (!p) return null;
      if (y >= p.y - 14 && y <= p.y + p.h + 18 && x >= p.x - 12 && x <= p.x + p.w + 12) return 'rate';
      return null;
    },
    down(id, x) { setRateFromX(x); },
    move(id, x) { setRateFromX(x); },
  });

  function setRateFromX(x) {
    const p = box.plot;
    const v = clamp(((x - p.x) / p.w) * rMax, 0.05, rMax);
    const r = Math.round(v * 100) / 100;
    if (Math.abs(r - target) < 1e-3) return;
    target = r;
    syncSlider(0, target, 2);
    draw();
  }

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
        { name: 'rate', label: '目标码率', min: 0.05, max: rMax, step: 0.05, value: target, fmt: 2 },
      ],
    },
    (st) => {
      target = clamp(st.rate ?? target, 0.05, rMax);
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
