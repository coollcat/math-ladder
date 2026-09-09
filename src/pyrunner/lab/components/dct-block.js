/* =========================================================================
 * lab 组件：dct-block（DCT 与 8×8 块：JPEG 的心脏）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "dct-block",
 *     "title": "只留前几个系数，图像怎么长回来"
 *   }
 *   ```
 *
 * 演示什么：
 *   【截断】一个 8×8 块做 DCT：能量几乎全挤在左上角（低频），右下角（高频）
 *   多半是 0 附近的小数。按 Zigzag 顺序只保留前 k 个系数再反变换，
 *   拖 k 从 1 到 64，看图像怎么一点点长回来——**前 5 个系数就能认出这块是什么**。
 *   【量化】JPEG 的真实做法：不是砍掉高频，而是**把系数除以量化表再取整**
 *   （Q_LUMA）。除法把高频压成 0，取整再抹掉一层。拖质量 1..100，看非零系数
 *   个数怎么掉。
 *   【整图】把整幅图切成 8×8 逐块走一遍上面的流程，就是 JPEG 的骨架：
 *   质量一低，块的边界（方块效应）和高频纹理的丢失就一起冒出来。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   mode    'trunc'（默认，截断）| 'quant'（量化）| 'whole'（整图压缩）
 *   k       截断模式保留的系数个数 1..64，默认 6
 *   quality 量化 / 整图模式的质量 1..100，默认 50（JPEG 的基准）
 *   bx, by  选中的 8×8 块左上角坐标（8 的倍数），默认取图中间偏左的块
 *   src     内置示例图，默认 'scene'（程序化生成的风景）。
 *           也可填 'rings' | 'checker' | 'stripes' | 'gradient'（media.synth）
 *
 * 能拖什么：
 *   - 在左上的预览图上拖动：换一个 8×8 块（挑平坦的、挑有边的，对比很强烈）
 *   - 在中间的系数表上点/拖：把 k 设成这个系数的 Zigzag 序号（截断模式）
 *   - 底部滑块：k、质量
 *   - 顶部开关：模式
 *
 * 用到的引擎函数：media.dct8x8 / idct8x8 / ZIGZAG / Q_LUMA / quantizeBlock /
 *   dequantizeBlock / countNonZero / blockDct / psnr / synth。
 *   量化模式按 JPEG 的真实口径做电平偏移：块先 ×255−128 再变换（所以直流
 *   系数是「亮度偏离中间灰多少」），重建后再 +128 还原。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout,
  bindPointer, label, clamp, fmt,
} from '../core.js';
import {
  synth, dct8x8, idct8x8, ZIGZAG, Q_LUMA, quantizeBlock, dequantizeBlock,
  countNonZero, blockDct, psnr,
} from '../engines/media.js';

const W0 = 128;
const H0 = 96;
const AR = W0 / H0;

/* 程序化生成的内置示例图（与其他图像组件同源，独立一份以免互相依赖） */
function sceneGray(w, h) {
  const img = new Float64Array(w * h);
  const ar = w / h;
  const HZ = 0.58;
  const bump = (u, c, s) => Math.exp(-((u - c) * (u - c)) / (2 * s * s));
  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const rA = HZ - 0.26 * bump(u, 0.26, 0.13) - 0.17 * bump(u, 0.68, 0.08);
      const rB = HZ - 0.10 * bump(u, 0.5, 0.22);
      const far = Math.min(rA, rB);
      const near = Math.max(rA, rB);
      let val;
      if (v < far) {
        val = 0.30 + 0.44 * (v / HZ);
        const sd = Math.hypot((u - 0.78) * ar, v - 0.16);
        if (sd < 0.07) val = 0.99;
        else if (sd < 0.14) val += 0.16 * (1 - (sd - 0.07) / 0.07);
      } else if (v < near) {
        val = 0.20 + 0.10 * bump(u, 0.26, 0.13);
      } else if (v < HZ) {
        val = 0.46 + 0.10 * Math.sin(u * 46);
      } else {
        val = 0.68 - 0.36 * ((v - HZ) / (1 - HZ));
        if (v > 0.63 && v < 0.79 && u > 0.08 && u < 0.44) {
          val = Math.floor(x / 3) % 2 ? 0.90 : 0.16;
        }
        if (v > 0.80 && u > 0.60) {
          val = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 0.92 : 0.26;
        }
      }
      img[y * w + x] = clamp(val, 0, 1);
    }
  }
  return img;
}

function grayCanvas(data, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c2 = cv.getContext('2d');
  const im = c2.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const g = Math.round(clamp(data[i], 0, 1) * 255);
    im.data[i * 4] = g;
    im.data[i * 4 + 1] = g;
    im.data[i * 4 + 2] = g;
    im.data[i * 4 + 3] = 255;
  }
  c2.putImageData(im, 0, 0);
  return cv;
}

function blit(ctx, cv, x, y, w, h) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, x, y, w, h);
}

/* 把 8×8 数据画成放大后的格子图（可叠数值） */
function grid8(ctx, box, data, C, opts = {}) {
  const c = box.w / 8;
  for (let j = 0; j < 8; j += 1) {
    for (let i = 0; i < 8; i += 1) {
      const v = data[j * 8 + i];
      const col = opts.color ? opts.color(v, j * 8 + i) : null;
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(box.x + i * c, box.y + j * c, c + 0.5, c + 0.5);
      }
      if (opts.mark && opts.mark(j * 8 + i)) {
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(box.x + i * c + 0.75, box.y + j * c + 0.75, c - 1.5, c - 1.5);
      }
    }
  }
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 8; k += 1) {
    ctx.moveTo(box.x + k * c + 0.5, box.y);
    ctx.lineTo(box.x + k * c + 0.5, box.y + box.h);
    ctx.moveTo(box.x, box.y + k * c + 0.5);
    ctx.lineTo(box.x + box.w, box.y + k * c + 0.5);
  }
  ctx.stroke();
  if (opts.text && c >= 22) {
    ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < 8; j += 1) {
      for (let i = 0; i < 8; i += 1) {
        const v = data[j * 8 + i];
        const t = opts.text(v, j * 8 + i);
        if (!t) continue;
        ctx.fillStyle = opts.textColor ? opts.textColor(v, j * 8 + i) : C.fg;
        ctx.fillText(t, box.x + (i + 0.5) * c, box.y + (j + 0.5) * c);
      }
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
}

export default function render(host, spec) {
  const s = {
    mode: spec.mode || 'trunc',
    k: spec.k ?? 6,
    quality: spec.quality ?? 50,
  };
  const img = spec.src && spec.src !== 'scene' ? synth(W0, H0, spec.src) : sceneGray(W0, H0);
  const NBX = Math.floor(W0 / 8);
  const NBY = Math.floor(H0 / 8);
  let bx = clamp(Math.round((spec.bx ?? 48) / 8) * 8, 0, (NBX - 1) * 8);
  let by = clamp(Math.round((spec.by ?? 40) / 8) * 8, 0, (NBY - 1) * 8);

  const fullCv = grayCanvas(img, W0, H0);
  let prevRect = null;
  let coefRect = null;
  let wholeCache = null;      // 整图模式按 quality 缓存，避免每帧重算

  const cv = setupCanvas(host, 340);

  const seg = buildSegmented(
    [
      { label: '截断前 k 个', value: 'trunc' },
      { label: 'JPEG 量化', value: 'quant' },
      { label: '整图压缩', value: 'whole' },
    ],
    s.mode,
    (v) => {
      s.mode = v;
      roA.box.style.display = v === 'whole' ? 'none' : '';
      roB.box.style.display = v === 'whole' ? '' : 'none';
      draw();
    },
  );
  host.appendChild(seg);

  const roA = buildReadout({ '保留系数': '—', '平均误差': '—', PSNR: '—' });
  const roB = buildReadout({ 质量: '—', '非零系数/块': '—', PSNR: '—' });
  host.appendChild(roA.box);
  host.appendChild(roB.box);
  roA.box.style.display = s.mode === 'whole' ? 'none' : '';
  roB.box.style.display = s.mode === 'whole' ? '' : 'none';

  function getBlock() {
    const b = new Float64Array(64);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) b[y * 8 + x] = img[(by + y) * W0 + bx + x];
    }
    return b;
  }

  /* ---------- 模式一：按 Zigzag 顺序只留前 k 个系数 ---------- */
  function drawTrunc(ctx, W, H, C) {
    const pad = 8;
    const cellW = (W - pad * 4) / 3;
    const availH = H - pad * 2 - 20;
    const block = getBlock();
    const coef = dct8x8(block);
    const k = Math.round(clamp(s.k, 1, 64));
    const kept = new Float64Array(64);
    for (let t = 0; t < k; t += 1) kept[ZIGZAG[t]] = coef[ZIGZAG[t]];
    const rec = idct8x8(kept);
    const err = new Float64Array(64);
    let eSum = 0;
    for (let i = 0; i < 64; i += 1) {
      err[i] = Math.abs(block[i] - rec[i]);
      eSum += err[i];
    }
    let cMax = 0;
    for (let i = 0; i < 64; i += 1) cMax = Math.max(cMax, Math.abs(coef[i]));

    /* 左：预览图 + 选中的块 */
    const pw = cellW - 8;
    const phh = pw / AR;
    label(ctx, '预览（拖动换块）', pad + 2, pad + 13, C.fg, { size: 11 });
    blit(ctx, fullCv, pad + 4, pad + 20, pw, phh);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 4.5, pad + 20.5, pw, phh);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad + 4 + (bx / W0) * pw, pad + 20 + (by / H0) * phh, (8 / W0) * pw, (8 / H0) * phh);
    prevRect = { x: pad + 4, y: pad + 20, w: pw, h: phh };
    const bSize = Math.min(cellW - 8, availH - phh - 34);
    label(ctx, `选中的 8×8 块 @ (${bx}, ${by})`, pad + 2, pad + 26 + phh, C.fg, { size: 11 });
    grid8(ctx, { x: pad + 4, y: pad + 32 + phh, w: bSize, h: bSize }, block, C, {
      color: (v) => {
        const g = Math.round(clamp(v, 0, 1) * 255);
        return `rgb(${g},${g},${g})`;
      },
    });

    /* 中：DCT 系数 */
    const gSize = Math.min(cellW - 8, availH);
    const gx = pad * 2 + cellW + (cellW - gSize) / 2;
    label(ctx, 'DCT 系数（能量挤在左上角）', pad * 2 + cellW + 2, pad + 13, C.fg, { size: 11 });
    grid8(ctx, { x: gx, y: pad + 20, w: gSize, h: gSize }, coef, C, {
      color: (v, i) => {
        const on = zigOrder(i) < k;
        const t = Math.log(1 + (Math.abs(v) / (cMax || 1)) * 60) / Math.log(61);
        if (!on) return C.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const a = 0.12 + 0.83 * t;
        return C.dark
          ? `rgba(122,165,232,${a.toFixed(3)})`
          : `rgba(59,116,214,${a.toFixed(3)})`;
      },
      mark: (i) => zigOrder(i) === k - 1,
      text: (v, i) => (zigOrder(i) < k ? fmt(v, 0) : ''),
      textColor: (v, i) => {
        const t = Math.log(1 + (Math.abs(v) / (cMax || 1)) * 60) / Math.log(61);
        return t > 0.45 ? '#ffffff' : C.fg;
      },
    });
    coefRect = { x: gx, y: pad + 20, w: gSize, h: gSize };
    label(ctx, `左上角 = 低频（大块明暗）· 右下角 = 高频（细节）· 拖这里改 k = ${k}`,
      gx, pad + 26 + gSize, C.fg, { size: 11 });

    /* 右：重建 + 误差 */
    const rSize = Math.min(cellW - 8, (availH - 30) / 2);
    const rx = pad * 3 + cellW * 2 + (cellW - rSize) / 2;
    label(ctx, `只留前 ${k} 个系数重建`, rx - (cellW - rSize) / 2, pad + 13, C.fg, { size: 11 });
    grid8(ctx, { x: rx, y: pad + 20, w: rSize, h: rSize }, rec, C, {
      color: (v) => {
        const g = Math.round(clamp(v, 0, 1) * 255);
        return `rgb(${g},${g},${g})`;
      },
    });
    label(ctx, '误差 × 4（放大后才看得见）', rx - (cellW - rSize) / 2, pad + 26 + rSize, C.fg, { size: 11 });
    grid8(ctx, { x: rx, y: pad + 32 + rSize, w: rSize, h: rSize }, err, C, {
      color: (v) => {
        const g = Math.round(clamp(v * 4, 0, 1) * 255);
        return `rgb(${g},${Math.round(g * 0.35)},${Math.round(g * 0.35)})`;
      },
    });

    const p = psnr(block, rec);
    roA.set('保留系数', `${k} / 64`);
    roA.set('平均误差', fmt((eSum / 64) * 255, 2) + ' / 255');
    roA.set('PSNR', isFinite(p) ? `${fmt(p, 2)} dB` : '完全一样（∞）');
  }

  /* ---------- 模式二：JPEG 量化（电平偏移 + 除以量化表取整） ---------- */
  function drawQuant(ctx, W, H, C) {
    const pad = 8;
    const cellW = (W - pad * 4) / 3;
    const availH = H - pad * 2 - 20;
    const block = getBlock();
    /* JPEG 的真实口径：先电平偏移到 −128..127，再变换 */
    const shifted = new Float64Array(64);
    for (let i = 0; i < 64; i += 1) shifted[i] = block[i] * 255 - 128;
    const coef = dct8x8(shifted);
    const q = quantizeBlock(coef, Q_LUMA, s.quality);
    const dq = dequantizeBlock(q, Q_LUMA, s.quality);
    const recS = idct8x8(dq);
    const rec = new Float64Array(64);
    const err = new Float64Array(64);
    let eSum = 0;
    for (let i = 0; i < 64; i += 1) {
      rec[i] = clamp((recS[i] + 128) / 255, 0, 1);
      err[i] = Math.abs(block[i] - rec[i]);
      eSum += err[i];
    }
    let cMax = 0;
    for (let i = 0; i < 64; i += 1) cMax = Math.max(cMax, Math.abs(coef[i]));

    const pw = cellW - 8;
    const phh = pw / AR;
    label(ctx, '预览（拖动换块）', pad + 2, pad + 13, C.fg, { size: 11 });
    blit(ctx, fullCv, pad + 4, pad + 20, pw, phh);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 4.5, pad + 20.5, pw, phh);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad + 4 + (bx / W0) * pw, pad + 20 + (by / H0) * phh, (8 / W0) * pw, (8 / H0) * phh);
    prevRect = { x: pad + 4, y: pad + 20, w: pw, h: phh };
    const bSize = Math.min(cellW - 8, availH - phh - 34);
    label(ctx, `选中的 8×8 块 @ (${bx}, ${by})`, pad + 2, pad + 26 + phh, C.fg, { size: 11 });
    grid8(ctx, { x: pad + 4, y: pad + 32 + phh, w: bSize, h: bSize }, block, C, {
      color: (v) => {
        const g = Math.round(clamp(v, 0, 1) * 255);
        return `rgb(${g},${g},${g})`;
      },
    });

    const gSize = Math.min(cellW - 8, availH);
    const gx = pad * 2 + cellW + (cellW - gSize) / 2;
    label(ctx, `量化后的整数系数（质量 ${Math.round(s.quality)}）`, pad * 2 + cellW + 2, pad + 13, C.fg, { size: 11 });
    grid8(ctx, { x: gx, y: pad + 20, w: gSize, h: gSize }, q, C, {
      color: (v) => {
        if (v === 0) return C.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const t = clamp(Math.log(1 + Math.abs(v) * 0.35) / Math.log(40), 0.1, 1);
        return C.dark
          ? `rgba(122,165,232,${(0.15 + 0.8 * t).toFixed(3)})`
          : `rgba(59,116,214,${(0.15 + 0.8 * t).toFixed(3)})`;
      },
      text: (v) => (v === 0 ? '' : String(Math.round(v))),
      textColor: (v) => (Math.abs(v) > 12 ? '#ffffff' : C.fg),
    });
    coefRect = null;
    label(ctx, `非零系数 ${countNonZero(q)} 个 / 64 —— 变成 0 的就再也回不来了`,
      gx, pad + 26 + gSize, C.fg, { size: 11 });

    const rSize = Math.min(cellW - 8, (availH - 30) / 2);
    const rx = pad * 3 + cellW * 2 + (cellW - rSize) / 2;
    label(ctx, '反量化 + 反变换重建', rx - (cellW - rSize) / 2, pad + 13, C.fg, { size: 11 });
    grid8(ctx, { x: rx, y: pad + 20, w: rSize, h: rSize }, rec, C, {
      color: (v) => {
        const g = Math.round(clamp(v, 0, 1) * 255);
        return `rgb(${g},${g},${g})`;
      },
    });
    label(ctx, '误差 × 4', rx - (cellW - rSize) / 2, pad + 26 + rSize, C.fg, { size: 11 });
    grid8(ctx, { x: rx, y: pad + 32 + rSize, w: rSize, h: rSize }, err, C, {
      color: (v) => {
        const g = Math.round(clamp(v * 4, 0, 1) * 255);
        return `rgb(${g},${Math.round(g * 0.35)},${Math.round(g * 0.35)})`;
      },
    });

    const p = psnr(block, rec);
    roA.set('保留系数', `${countNonZero(q)} / 64`);
    roA.set('平均误差', fmt((eSum / 64) * 255, 2) + ' / 255');
    roA.set('PSNR', isFinite(p) ? `${fmt(p, 2)} dB` : '完全一样（∞）');
  }

  /* ---------- 模式三：整幅图逐块压缩（JPEG 的骨架） ---------- */
  function compressWhole(quality) {
    if (wholeCache && wholeCache.q === quality) return wholeCache;
    const shifted = new Float64Array(W0 * H0);
    for (let i = 0; i < W0 * H0; i += 1) shifted[i] = img[i] * 255 - 128;
    const blocks = blockDct(shifted, W0, H0);
    const out = new Float64Array(W0 * H0);
    let nz = 0;
    const perBlock = [];
    blocks.forEach((b) => {
      const q = quantizeBlock(b.coef, Q_LUMA, quality);
      const n = countNonZero(q);
      nz += n;
      perBlock.push(n);
      const dq = dequantizeBlock(q, Q_LUMA, quality);
      const rec = idct8x8(dq);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          out[(b.by + y) * W0 + b.bx + x] = clamp((rec[y * 8 + x] + 128) / 255, 0, 1);
        }
      }
    });
    wholeCache = { q: quality, out, nz, perBlock, nb: blocks.length };
    return wholeCache;
  }

  function drawWhole(ctx, W, H, C) {
    const pad = 8;
    const availH = H - pad * 2 - 84;
    const cellW = (W - pad * 3) / 2;
    const iw = Math.min(cellW - 8, availH * AR);
    const ih = iw / AR;
    const r = compressWhole(Math.round(s.quality));

    label(ctx, '原图', pad + 2, pad + 13, C.fg, { size: 11 });
    blit(ctx, fullCv, pad + 4, pad + 20, iw, ih);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 4.5, pad + 20.5, iw, ih);

    const x2 = pad * 2 + cellW;
    label(ctx, `质量 ${Math.round(s.quality)} 重建（每块 8×8：DCT → 除量化表取整 → 反变换）`,
      x2 + 2, pad + 13, C.fg, { size: 11 });
    blit(ctx, grayCanvas(r.out, W0, H0), x2 + 4, pad + 20, iw, ih);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(x2 + 4.5, pad + 20.5, iw, ih);

    /* 每块非零系数柱状图 */
    const gy = pad + 26 + ih;
    const gh = H - gy - pad - 14;
    const gx = pad + 4;
    const gw = W - pad * 2 - 8;
    label(ctx, `每块剩下的非零系数（${r.nb} 块，纵轴 0..64）`, gx, gy - 2, C.fg, { size: 11 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    const bw = gw / r.nb;
    r.perBlock.forEach((n, i) => {
      const h = (n / 64) * gh;
      ctx.fillStyle = C.accent;
      ctx.fillRect(gx + i * bw, gy + gh - h, Math.max(1, bw - 0.8), h);
    });
    prevRect = null;
    coefRect = null;

    const p = psnr(img, r.out);
    roB.set('质量', String(Math.round(s.quality)));
    roB.set('非零系数/块', `${fmt(r.nz / r.nb, 1)} / 64（共 ${fmt((r.nz / (r.nb * 64)) * 100, 1)}%）`);
    roB.set('PSNR', isFinite(p) ? `${fmt(p, 2)} dB` : '完全一样（∞）');
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    prevRect = null;
    coefRect = null;
    if (s.mode === 'trunc') drawTrunc(ctx, W, H, C);
    else if (s.mode === 'quant') drawQuant(ctx, W, H, C);
    else drawWhole(ctx, W, H, C);
  }

  /* Zigzag 序号：第 i 个系数在扫描中的次序 */
  const ZZ = new Int32Array(64);
  ZIGZAG.forEach((pos, order) => { ZZ[pos] = order; });
  const zigOrder = (i) => ZZ[i];

  /* ---- 拖动：预览图换块；系数表改 k ---- */
  let drag = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (prevRect && x >= prevRect.x && x <= prevRect.x + prevRect.w
        && y >= prevRect.y && y <= prevRect.y + prevRect.h) return 'block';
      if (coefRect && s.mode === 'trunc'
        && x >= coefRect.x && x <= coefRect.x + coefRect.w
        && y >= coefRect.y && y <= coefRect.y + coefRect.h) return 'k';
      return null;
    },
    down(id, x, y) {
      if (id === 'block') {
        drag = { id };
        applyBlock(x, y);
      } else if (id === 'k') {
        drag = { id };
        applyK(x, y);
      }
    },
    move(id, x, y) {
      if (!drag) return;
      if (id === 'block') applyBlock(x, y);
      else if (id === 'k') applyK(x, y);
    },
    up() { drag = null; },
  });

  function applyBlock(x, y) {
    if (!prevRect) return;
    const u = (x - prevRect.x) / prevRect.w;
    const v = (y - prevRect.y) / prevRect.h;
    const nbx = clamp(Math.floor(u * W0 / 8), 0, NBX - 1);
    const nby = clamp(Math.floor(v * H0 / 8), 0, NBY - 1);
    if (nbx * 8 === bx && nby * 8 === by) return;
    bx = nbx * 8;
    by = nby * 8;
    draw();
  }

  function applyK(x, y) {
    if (!coefRect) return;
    const i = clamp(Math.floor(((x - coefRect.x) / coefRect.w) * 8), 0, 7);
    const j = clamp(Math.floor(((y - coefRect.y) / coefRect.h) * 8), 0, 7);
    const k = clamp(zigOrder(j * 8 + i) + 1, 1, 64);
    if (k === Math.round(s.k)) return;
    s.k = k;
    sliders.set('k', k);
    draw();
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'k', label: '保留前 k 个系数', min: 1, max: 64, step: 1, value: s.k },
        { name: 'quality', label: 'JPEG 质量', min: 1, max: 100, step: 1, value: s.quality },
      ],
    },
    (st) => {
      s.k = st.k;
      s.quality = st.quality;
      draw();
    },
  );
  sliders.set = (name, v) => {
    const idx = { k: 0, quality: 1 }[name];
    const r = sliders.box.querySelectorAll('.ml-slider')[idx];
    if (!r) return;
    const range = r.querySelector('input');
    const span = r.querySelector('.ml-slider__val');
    if (range) range.value = String(v);
    if (span) span.textContent = String(v);
  };

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
