/* 图像与视频引擎 —— 纯函数，输入输出统一用 Float64Array（长度 w*h，行优先）。
   服务章节：70 图像与视频；被 69（语谱图画布）与 61（DCT）复用。
   坐标约定：idx = y * w + x；灰度值 0..1（彩色用三个同长数组或交错 RGB）。 */

/* ---------- 图像生成（合成样例，避免依赖外部图片资源） ---------- */

function blank(w, h) {
  return new Float64Array(w * h);
}

/* 合成测试图：mode 决定图案类型，t 为可选的时间参数（视频帧用） */
function synth(w, h, mode = 'gradient', t = 0) {
  const img = blank(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = x / w;
      const v = y / h;
      let val = 0;
      switch (mode) {
        case 'gradient':
          val = u;
          break;
        case 'checker':
          val = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 0.85 : 0.15;
          break;
        case 'rings': {
          const dx = u - 0.5;
          const dy = v - 0.5;
          val = 0.5 + 0.5 * Math.sin(60 * Math.hypot(dx, dy));
          break;
        }
        case 'circle': {
          const dx = u - 0.5;
          const dy = v - 0.5;
          val = Math.hypot(dx, dy) < 0.25 ? 1 : 0;
          break;
        }
        case 'moving-ball': {
          /* 水平匀速运动的小球：运动估计与帧差的标准教具 */
          const cx = 0.2 + 0.6 * ((t / 60) % 1);
          const dx = u - cx;
          const dy = v - 0.5;
          val = Math.hypot(dx, dy) < 0.12 ? 1 : 0;
          break;
        }
        case 'stripes':
          val = 0.5 + 0.5 * Math.sin(2 * Math.PI * u * 8 + t);
          break;
        case 'edges':
          val = u < 0.33 ? 0.1 : u < 0.66 ? 0.55 : 0.95;
          break;
        default:
          val = u;
      }
      img[y * w + x] = val;
    }
  }
  return img;
}

/* ---------- 采样与量化 ---------- */

/* 空间下采样：每隔 step 取一点（不做抗混叠，用于直观展示混叠） */
function subsample(img, w, h, step) {
  const nw = Math.floor(w / step);
  const nh = Math.floor(h / step);
  const out = blank(nw, nh);
  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) out[y * nw + x] = img[y * step * w + x * step];
  }
  return { data: out, w: nw, h: nh };
}

/* 先盒式模糊再下采样：抗混叠的正确做法，与 subsample 对照 */
function subsampleBlurred(img, w, h, step) {
  const blurred = conv2(img, w, h, boxKernel(step), true);
  return subsample(blurred, w, h, step);
}

/* 幅度量化到 levels 级 */
function quantize(img, levels) {
  const step = 1 / (levels - 1);
  const out = new Float64Array(img.length);
  for (let i = 0; i < img.length; i += 1) out[i] = Math.round(img[i] / step) * step;
  return out;
}

/* ---------- 卷积与滤波 ---------- */

function boxKernel(n) {
  const k = new Float64Array(n * n);
  k.fill(1 / (n * n));
  return { k: Array.from(k), n, separable: true, row: new Array(n).fill(1 / n) };
}

/* 常用 3×3 核 */
const KERNELS = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  boxBlur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
  gaussian: [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  laplacian: [0, 1, 0, 1, -4, 1, 0, 1, 0],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
  sobelX: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
  sobelY: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
  prewittX: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  prewittY: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
};

/* 二维卷积。kernel 为长度 n*n 的行优先数组；wrap=true 时对边缘做镜像填充 */
function conv2(img, w, h, kernel, normalize = false) {
  const n = Math.round(Math.sqrt(kernel.length));
  const half = Math.floor(n / 2);
  const out = blank(w, h);
  let ksum = 0;
  for (let i = 0; i < kernel.length; i += 1) ksum += kernel[i];
  if (normalize && ksum !== 0) ksum = ksum; // 归一化开关交由调用方决定，见下
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let ky = 0; ky < n; ky += 1) {
        for (let kx = 0; kx < n; kx += 1) {
          const sx = Math.min(Math.max(x + kx - half, 0), w - 1);
          const sy = Math.min(Math.max(y + ky - half, 0), h - 1);
          acc += img[sy * w + sx] * kernel[ky * n + kx];
        }
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/* 梯度幅值与方向：Sobel 组合 */
function edgeMagnitude(img, w, h) {
  const gx = conv2(img, w, h, KERNELS.sobelX);
  const gy = conv2(img, w, h, KERNELS.sobelY);
  const mag = blank(w, h);
  const dir = blank(w, h);
  for (let i = 0; i < gx.length; i += 1) {
    mag[i] = Math.min(1, Math.hypot(gx[i], gy[i]) / 4);
    dir[i] = Math.atan2(gy[i], gx[i]);
  }
  return { mag, dir, gx, gy };
}

/* 非极大值抑制 + 双阈值：Canny 的骨架部分 */
function canny(img, w, h, lo = 0.2, hi = 0.5) {
  const { mag, dir } = edgeMagnitude(img, w, h);
  const out = blank(w, h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const a = dir[i];
      /* 把梯度方向量化到 4 个扇区，只比较梯度方向上的两个邻居 */
      const q = ((Math.round(a / (Math.PI / 4)) + 4) % 4);
      const n1 = q === 0 ? i + 1 : q === 1 ? i + w + 1 : q === 2 ? i + w : i + w - 1;
      const n2 = q === 0 ? i - 1 : q === 1 ? i - w - 1 : q === 2 ? i - w : i - w + 1;
      const m = mag[i];
      if (m >= mag[n1] && m >= mag[n2] && m >= hi) out[i] = 1;
      else if (m >= lo && (mag[n1] >= hi || mag[n2] >= hi)) out[i] = 0.5;
    }
  }
  return out;
}

/* ---------- 彩色空间 ---------- */

/* BT.601 有限范围 RGB(0..1) ↔ YCbCr */
function rgbToYuv(r, g, b) {
  return {
    y: 0.299 * r + 0.587 * g + 0.114 * b,
    u: -0.169 * r - 0.331 * g + 0.5 * b + 0.5,
    v: 0.5 * r - 0.419 * g - 0.081 * b + 0.5,
  };
}

function yuvToRgb(y, u, v) {
  const uu = u - 0.5;
  const vv = v - 0.5;
  return {
    r: y + 1.402 * vv,
    g: y - 0.344 * uu - 0.714 * vv,
    b: y + 1.772 * uu,
  };
}

/* 色度子采样 4:2:0：U/V 每 2×2 取一个均值 */
function chromaSubsample420(w, h, u, v) {
  const cw = Math.ceil(w / 2);
  const ch = Math.ceil(h / 2);
  const su = new Float64Array(cw * ch);
  const sv = new Float64Array(cw * ch);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      let accU = 0;
      let accV = 0;
      let cnt = 0;
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const px = Math.min(x * 2 + dx, w - 1);
          const py = Math.min(y * 2 + dy, h - 1);
          const i = py * w + px;
          accU += u[i];
          accV += v[i];
          cnt += 1;
        }
      }
      su[y * cw + x] = accU / cnt;
      sv[y * cw + x] = accV / cnt;
    }
  }
  return { u: su, v: sv, cw, ch };
}

/* ---------- 二维 DCT（JPEG 的核心） ---------- */

const dctNorm = (u) => (u === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8));

/* 8×8 块 DCT-II：in 为 64 长数组 */
function dct8x8(block) {
  const out = new Float64Array(64);
  for (let v = 0; v < 8; v += 1) {
    for (let u = 0; u < 8; u += 1) {
      let s = 0;
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          s += block[y * 8 + x]
            * Math.cos(((2 * x + 1) * u * Math.PI) / 16)
            * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
        }
      }
      out[v * 8 + u] = s * dctNorm(u) * dctNorm(v);
    }
  }
  return out;
}

/* 8×8 块 IDCT-III */
function idct8x8(coef) {
  const out = new Float64Array(64);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      let s = 0;
      for (let v = 0; v < 8; v += 1) {
        for (let u = 0; u < 8; u += 1) {
          s += dctNorm(u) * dctNorm(v) * coef[v * 8 + u]
            * Math.cos(((2 * x + 1) * u * Math.PI) / 16)
            * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
        }
      }
      out[y * 8 + x] = s;
    }
  }
  return out;
}

/* JPEG 标准亮度量化表 */
const Q_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

/* Zigzag 扫描序：把 8×8 系数拉成一维时低频在前 */
const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5,
  12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

/* 量化：coef / (q * qualityScale)，四舍五入。quality 1..100 */
function quantizeBlock(coef, qTable, quality = 50) {
  const scale = quality < 50 ? 50 / quality : (100 - quality) / 50;
  const out = new Float64Array(64);
  for (let i = 0; i < 64; i += 1) {
    const q = Math.max(1, Math.round(qTable[i] * scale));
    out[i] = Math.round(coef[i] / q);
  }
  return out;
}

function dequantizeBlock(qcoef, qTable, quality = 50) {
  const scale = quality < 50 ? 50 / quality : (100 - quality) / 50;
  const out = new Float64Array(64);
  for (let i = 0; i < 64; i += 1) {
    const q = Math.max(1, Math.round(qTable[i] * scale));
    out[i] = qcoef[i] * q;
  }
  return out;
}

/* 统计非零系数个数（衡量压缩后还剩多少信息） */
const countNonZero = (arr) => {
  let c = 0;
  for (let i = 0; i < arr.length; i += 1) if (arr[i] !== 0) c += 1;
  return c;
};

/* 把整幅图切 8×8 块做 DCT，返回块数组（便于逐块可视化） */
function blockDct(img, w, h) {
  const blocks = [];
  for (let by = 0; by + 8 <= h; by += 8) {
    for (let bx = 0; bx + 8 <= w; bx += 8) {
      const blk = new Float64Array(64);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) blk[y * 8 + x] = img[(by + y) * w + bx + x];
      }
      blocks.push({ bx, by, block: blk, coef: dct8x8(blk) });
    }
  }
  return blocks;
}

/* ---------- 视频：帧差与运动估计 ---------- */

function frameDiff(a, b, threshold = 0.1) {
  const out = blank(a.length, 1);
  const mask = blank(a.length, 1);
  for (let i = 0; i < a.length; i += 1) {
    const d = Math.abs(a[i] - b[i]);
    out[i] = d;
    mask[i] = d > threshold ? 1 : 0;
  }
  return { diff: out, mask, energy: out.reduce((s, v) => s + v, 0) / a.length };
}

/* 块匹配：全搜索（可选三步搜索加速）。返回运动矢量场 */
function blockMatch(ref, cur, w, h, blockSize = 16, search = 8, fast = false) {
  const bw = Math.floor(w / blockSize);
  const bh = Math.floor(h / blockSize);
  const vectors = [];
  const sadAt = (rx, ry, cx, cy) => {
    let s = 0;
    for (let y = 0; y < blockSize; y += 1) {
      for (let x = 0; x < blockSize; x += 1) {
        s += Math.abs(ref[(ry + y) * w + rx + x] - cur[(cy + y) * w + cx + x]);
      }
    }
    return s;
  };
  for (let by = 0; by < bh; by += 1) {
    for (let bx = 0; bx < bw; bx += 1) {
      const cx = bx * blockSize;
      const cy = by * blockSize;
      const clampX = (v) => Math.min(Math.max(v, 0), w - blockSize);
      const clampY = (v) => Math.min(Math.max(v, 0), h - blockSize);
      let bestSad = Infinity;
      let bdx = 0;
      let bdy = 0;
      if (fast) {
        /* 三步搜索：步长逐次减半，复杂度从 (2S+1)^2 降到 ~3·log S */
        let step = search / 2;
        let px = cx;
        let py = cy;
        while (step >= 1) {
          let bs = Infinity;
          let bx2 = px;
          let by2 = py;
          for (let dy = -step; dy <= step; dy += step) {
            for (let dx = -step; dx <= step; dx += step) {
              const tx = clampX(px + dx);
              const ty = clampY(py + dy);
              const s = sadAt(tx, ty, cx, cy);
              if (s < bs) {
                bs = s;
                bx2 = tx;
                by2 = ty;
              }
            }
          }
          px = bx2;
          py = by2;
          step /= 2;
        }
        bdx = px - cx;
        bdy = py - cy;
        bestSad = sadAt(clampX(px), clampY(py), cx, cy);
      } else {
        for (let dy = -search; dy <= search; dy += 1) {
          for (let dx = -search; dx <= search; dx += 1) {
            const rx = clampX(cx + dx);
            const ry = clampY(cy + dy);
            const s = sadAt(rx, ry, cx, cy);
            if (s < bestSad) {
              bestSad = s;
              bdx = rx - cx;
              bdy = ry - cy;
            }
          }
        }
      }
      vectors.push({ bx, by, dx: bdx, dy: bdy, sad: bestSad });
    }
  }
  return { vectors, bw, bh, blockSize };
}

/* 运动补偿：用参考帧 + 运动矢量重建预测帧 */
function motionCompensate(ref, w, h, vectors, blockSize = 16) {
  const out = new Float64Array(ref.length);
  vectors.forEach((mv) => {
    const cx = mv.bx * blockSize;
    const cy = mv.by * blockSize;
    for (let y = 0; y < blockSize; y += 1) {
      for (let x = 0; x < blockSize; x += 1) {
        const sx = Math.min(Math.max(cx + mv.dx + x, 0), w - 1);
        const sy = Math.min(Math.max(cy + mv.dy + y, 0), h - 1);
        out[(cy + y) * w + cx + x] = ref[sy * w + sx];
      }
    }
  });
  return out;
}

/* 残差 = 当前帧 − 预测帧；用于说明「为什么残差好压」 */
function residual(cur, pred) {
  const out = new Float64Array(cur.length);
  for (let i = 0; i < cur.length; i += 1) out[i] = cur[i] - pred[i] + 0.5;
  return out;
}

/* ---------- 质量与信息量度量 ---------- */

function psnr(a, b) {
  let mse = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    mse += d * d;
  }
  mse /= a.length;
  return mse === 0 ? Infinity : 10 * Math.log10(1 / mse);
}

function histogram(img, bins = 64) {
  const h = new Array(bins).fill(0);
  for (let i = 0; i < img.length; i += 1) {
    const k = Math.min(bins - 1, Math.max(0, Math.floor(img[i] * bins)));
    h[k] += 1;
  }
  return h;
}

/* 一阶直方图熵（bit/像素）：无损压缩的下界直觉 */
function entropy(img, bins = 64) {
  const h = histogram(img, bins);
  const n = img.length;
  let e = 0;
  for (let i = 0; i < bins; i += 1) {
    if (!h[i]) continue;
    const p = h[i] / n;
    e -= p * Math.log2(p);
  }
  return e;
}

export {
  blank,
  synth,
  subsample,
  subsampleBlurred,
  quantize,
  conv2,
  KERNELS,
  boxKernel,
  edgeMagnitude,
  canny,
  rgbToYuv,
  yuvToRgb,
  chromaSubsample420,
  dct8x8,
  idct8x8,
  Q_LUMA,
  ZIGZAG,
  quantizeBlock,
  dequantizeBlock,
  countNonZero,
  blockDct,
  frameDiff,
  blockMatch,
  motionCompensate,
  residual,
  psnr,
  histogram,
  entropy,
};
