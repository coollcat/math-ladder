import { synth, dct8x8, idct8x8, Q_LUMA, quantizeBlock, dequantizeBlock, entropy, quantize, psnr } from './src/pyrunner/lab/engines/media.js';

const IW = 96, IH = 96, N = IW * IH;
const grad = synth(IW, IH, 'gradient');
const rings = synth(IW, IH, 'rings');
const src = new Float64Array(N);
for (let i = 0; i < N; i++) src[i] = Math.min(1, Math.max(0, 0.4 * grad[i] + 0.6 * rings[i]));

function dctPath(quality) {
  const rec = new Float64Array(N);
  const allQ = new Float64Array(N);
  for (let by = 0; by + 8 <= IH; by += 8) {
    for (let bx = 0; bx + 8 <= IW; bx += 8) {
      const blk = new Float64Array(64);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = (src[(by + y) * IW + bx + x] - 0.5) * 255;
      const q = quantizeBlock(dct8x8(blk), Q_LUMA, quality);
      const back = idct8x8(dequantizeBlock(q, Q_LUMA, quality));
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const i = (by + y) * IW + bx + x;
        rec[i] = Math.min(1, Math.max(0, back[y * 8 + x] / 255 + 0.5));
        allQ[i] = q[y * 8 + x];
      }
    }
  }
  return { rec, allQ };
}

function entOfInts(ints) {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < ints.length; i++) { if (ints[i] < mn) mn = ints[i]; if (ints[i] > mx) mx = ints[i]; }
  if (mn === mx) return 0;
  const span = mx - mn;
  const bins = Math.min(4096, Math.max(64, Math.round(span) + 1));
  const norm = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i++) norm[i] = ((ints[i] - mn) / span) * (1 - 1 / bins);
  return entropy(norm, bins);
}

const t0 = Date.now();
for (const q of [99, 96, 92, 86, 78, 68, 56, 44, 32, 20, 8]) {
  const r = dctPath(q);
  console.log('q=' + q, 'rate=' + entOfInts(r.allQ).toFixed(3), 'psnr=' + psnr(src, r.rec).toFixed(2));
}
console.log('DCT 11 points cost ms:', Date.now() - t0);

const t1 = Date.now();
for (const L of [200, 120, 80, 50, 32, 20, 13, 9, 6, 4, 3, 2]) {
  const rec = quantize(src, L);
  console.log('L=' + L, 'rate=' + entropy(rec, Math.max(64, L + 1)).toFixed(3), 'psnr=' + psnr(src, rec).toFixed(2));
}
console.log('spatial 12 points cost ms:', Date.now() - t1);
console.log('src entropy(256):', entropy(src, 256).toFixed(3));
