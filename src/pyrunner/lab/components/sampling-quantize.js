/* =========================================================================
 * lab 组件：sampling-quantize（采样与量化：两种失真，两种原因）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "sampling-quantize",
 *     "title": "把空间分辨率和灰度级数分开看"
 *   }
 *   ```
 *
 * 演示什么：
 *   上半行演示**采样**（空间分辨率）：每隔 step 个像素取一个点，再放大回原尺寸。
 *   规则纹理（圆环 / 棋盘）会出现假的条纹与摩尔纹——混叠。
 *   打开「抗混叠」先做盒式模糊再取样，假纹立刻消失，代价是整体变糊——
 *   这就是「先限带、后采样」的采样定理。
 *   下半行演示**量化**（幅度分辨率）：把连续灰度归到 2 / 4 / 8 / … / 256 级。
 *   平滑渐变区会浮出一圈圈假轮廓，直方图从连续分布退化成几个孤立的尖峰。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   src     内置示例图，默认 'rings'（同心圆，最能暴露混叠）
 *           'rings' | 'scene' | 'checker' | 'stripes' | 'gradient'
 *           'scene' 是程序化生成的风景（天空/太阳/山脊/栅栏/高频棋盘）
 *   step    降采样步长 1..8，默认 4（即宽高各取 1/4，像素数 1/16）
 *   phase   取样相位 0..7，默认 0（拖动能看到摩尔纹随相位游走）
 *   levels  量化级数，默认 16；只能取 2/4/8/16/32/64/256 之一
 *   aa      true 表示开启抗混叠（先盒式模糊再取样），默认 false
 *
 * 能拖什么：
 *   - 在「原图 + 取样网格」上左右拖动：改取样相位，看假纹怎么游走
 *   - 在量化图上上下拖动：改量化级数
 *   - 底部滑块：步长 / 相位 / 量化级数（拖动的备用入口）
 *   - 分段开关：图案、抗混叠 开/关
 *
 * 用到的引擎函数：
 *   media.synth（图案） / subsample、subsampleBlurred（降采样，含抗混叠）
 *   quantize（灰度量化） / histogram（直方图） / entropy（信息量）
 *   psnr（与原图的峰值信噪比）
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout, bindPointer, label,
  clamp, fmt, grayCanvas, blit,
  sceneGray,
  clearBg,
} from '../core.js';
import { synth, subsample, subsampleBlurred, quantize, histogram, entropy, psnr } from '../engines/media.js';

const W0 = 160;
const H0 = 120;
const AR = W0 / H0;
const LEVELS = [2, 4, 8, 16, 32, 64, 256];

/* 带相位的降采样：先裁掉相位偏移的边距，再交给引擎的 subsample。
   引擎的 subsample 不支持相位，这里用裁剪绕过去，不另写取样算法。 */
function subsampleAt(img, w, h, step, ph, aa) {
  const cw = w - ph;
  const ch = h - ph;
  const crop = new Float64Array(cw * ch);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) crop[y * cw + x] = img[(y + ph) * w + x + ph];
  }
  return aa ? subsampleBlurred(crop, cw, ch, step) : subsample(crop, cw, ch, step);
}

/* 最近邻放大回原尺寸：保持硬边方块，马赛克本身就是降采样的证据 */
function upscaleNN(small, sw, sh, w, h) {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / h));
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / w));
      out[y * w + x] = small[sy * sw + sx];
    }
  }
  return out;
}

export default function render(host, spec) {
  const s = {
    src: spec.src || 'rings',
    step: spec.step ?? 4,
    phase: spec.phase ?? 0,
    levels: spec.levels ?? 16,
    aa: spec.aa === true,
  };
  let li = LEVELS.indexOf(s.levels);
  if (li < 0) li = 3;
  s.levels = LEVELS[li];

  const loadImg = (mode) => (mode === 'scene' ? sceneGray(W0, H0) : synth(W0, H0, mode));
  let img = loadImg(s.src);
  let geo = null;

  const cv = setupCanvas(host, 380);

  const segSrc = buildSegmented(
    [
      { label: '圆环', value: 'rings' },
      { label: '风景', value: 'scene' },
      { label: '棋盘', value: 'checker' },
      { label: '条纹', value: 'stripes' },
      { label: '渐变', value: 'gradient' },
    ],
    s.src,
    (v) => {
      s.src = v;
      img = loadImg(v);
      draw();
    },
  );
  const segAA = buildSegmented(
    [
      { label: '直接取样', value: 'off' },
      { label: '先模糊再取样（抗混叠）', value: 'on' },
    ],
    s.aa ? 'on' : 'off',
    (v) => {
      s.aa = v === 'on';
      draw();
    },
  );
  host.appendChild(segSrc);
  host.appendChild(segAA);

  const ro = buildReadout({
    '采样后': '—', '像素数': '—', '量化级数': '—', '熵': '—', 'PSNR': '—',
  });
  host.appendChild(ro.box);

  function cellRect(i, j, W, H) {
    const pad = 8;
    const cw = (W - pad * 3) / 2;
    const ch = (H - pad * 3) / 2;
    return { x: pad + j * (cw + pad), y: pad + i * (ch + pad), w: cw, h: ch };
  }

  /* 在格子里按 4:3 居中放一张图，返回 {x,y,w,h} */
  function imgRect(c, titleH) {
    const availH = c.h - titleH - 6;
    const w = Math.min(c.w - 8, availH * AR);
    const h = w / AR;
    return { x: c.x + (c.w - w) / 2, y: c.y + titleH, w, h };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const ph = Math.min(Math.round(s.phase), Math.max(0, Math.round(s.step) - 1));
    const small = subsampleAt(img, W0, H0, Math.round(s.step), ph, s.aa);
    const back = upscaleNN(small.data, small.w, small.h, W0, H0);
    const qimg = quantize(img, s.levels);

    /* ---------- (0,0) 原图 + 取样网格 ---------- */
    const c00 = cellRect(0, 0, W, H);
    const r00 = imgRect(c00, 20);
    label(ctx, `原图 ${W0}×${H0}（叠加取样网格，左右拖动改相位）`, c00.x + 6, c00.y + 14, C.fg, { size: 11 });
    const fullCv = grayCanvas(img, W0, H0);
    blit(ctx, fullCv, r00.x, r00.y, r00.w, r00.h);
    const gs = (r00.w / W0) * Math.round(s.step);
    if (gs >= 3) {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; ph + k * Math.round(s.step) < W0; k += 1) {
        const px = r00.x + (ph + k * Math.round(s.step)) * (r00.w / W0);
        ctx.moveTo(px + 0.5, r00.y);
        ctx.lineTo(px + 0.5, r00.y + r00.h);
      }
      for (let k = 0; ph + k * Math.round(s.step) < H0; k += 1) {
        const py = r00.y + (ph + k * Math.round(s.step)) * (r00.h / H0);
        ctx.moveTo(r00.x, py + 0.5);
        ctx.lineTo(r00.x + r00.w, py + 0.5);
      }
      ctx.stroke();
    }
    if (gs >= 6) {
      ctx.fillStyle = C.bad;
      for (let y = 0; ph + y * Math.round(s.step) < H0; y += 1) {
        for (let x = 0; ph + x * Math.round(s.step) < W0; x += 1) {
          ctx.fillRect(
            r00.x + (ph + x * Math.round(s.step)) * (r00.w / W0) - 1,
            r00.y + (ph + y * Math.round(s.step)) * (r00.h / H0) - 1, 2, 2,
          );
        }
      }
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(r00.x + 0.5, r00.y + 0.5, r00.w, r00.h);

    /* ---------- (1,0) 降采样后放大回来 ---------- */
    const c10 = cellRect(0, 1, W, H);
    const r10 = imgRect(c10, 20);
    const stepN = Math.round(s.step);
    label(ctx, `${s.aa ? '模糊后' : ''}每 ${stepN} 像素取 1 个 → ${small.w}×${small.h}，再放大回来`,
      c10.x + 6, c10.y + 14, C.fg, { size: 11 });
    blit(ctx, grayCanvas(back, W0, H0), r10.x, r10.y, r10.w, r10.h);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(r10.x + 0.5, r10.y + 0.5, r10.w, r10.h);

    /* ---------- (0,1) 量化结果 ---------- */
    const c01 = cellRect(1, 0, W, H);
    const r01 = imgRect(c01, 20);
    label(ctx, `灰度量化到 ${s.levels} 级（上下拖动改级数）`, c01.x + 6, c01.y + 14, C.fg, { size: 11 });
    blit(ctx, grayCanvas(qimg, W0, H0), r01.x, r01.y, r01.w, r01.h);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(r01.x + 0.5, r01.y + 0.5, r01.w, r01.h);

    /* ---------- (1,1) 直方图 ---------- */
    const c11 = cellRect(1, 1, W, H);
    label(ctx, '灰度直方图（64 个桶）：量化后只剩几个孤立的尖峰',
      c11.x + 6, c11.y + 14, C.fg, { size: 11 });
    const hx = c11.x + 10;
    const hy = c11.y + 24;
    const hw = c11.w - 20;
    const hh = c11.h - 46;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx, hy + hh);
    ctx.lineTo(hx + hw, hy + hh);
    ctx.stroke();
    const hq = histogram(qimg, 64);
    const ho = histogram(img, 64);
    const mx = Math.max(1, ...ho);
    const bw2 = hw / 64;
    ctx.fillStyle = C.grid;
    for (let k = 0; k < 64; k += 1) {
      const bh = (ho[k] / mx) * hh;
      ctx.fillRect(hx + k * bw2, hy + hh - bh, Math.max(1, bw2 - 0.6), bh);
    }
    ctx.fillStyle = C.accent;
    for (let k = 0; k < 64; k += 1) {
      const bh = (hq[k] / mx) * hh;
      if (bh <= 0) continue;
      ctx.fillRect(hx + k * bw2, hy + hh - bh, Math.max(1, bw2 - 0.6), bh);
    }
    label(ctx, '暗 0', hx, hy + hh + 14, C.fg, { size: 10 });
    label(ctx, '亮 1', hx + hw, hy + hh + 14, C.fg, { size: 10, align: 'right' });
    label(ctx, `原图熵 ${fmt(entropy(img, 64), 2)} → 量化后 ${fmt(entropy(qimg, 64), 2)} bit/像素`,
      hx + hw / 2, hy + hh + 14, C.accent, { size: 10, align: 'center' });

    /* ---------- 读数 ---------- */
    const ratio = (small.w * small.h) / (W0 * H0);
    ro.set('采样后', `${small.w}×${small.h}`);
    ro.set('像素数', `原来的 ${fmt(ratio * 100, 1)}%`);
    ro.set('量化级数', `${s.levels} 级`);
    ro.set('熵', `${fmt(entropy(qimg, 64), 2)} bit/像素`);
    const p1 = psnr(img, back);
    const p2 = psnr(img, qimg);
    ro.set('PSNR', `采样 ${fmt(p1, 1)} dB · 量化 ${fmt(p2, 1)} dB`);

    geo = { r00, r01 };
  }

  /* ---- 拖拽：左上图改取样相位，左下图改量化级数 ---- */
  let drag = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo) return null;
      const a = geo.r00;
      const b = geo.r01;
      if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return 'phase';
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return 'levels';
      return null;
    },
    down(id, x, y) { drag = { id, x0: x, y0: y, ph0: s.phase, li0: li }; },
    move(id, x, y) {
      if (!drag) return;
      if (id === 'phase') {
        const st = Math.max(1, Math.round(s.step));
        s.phase = clamp(Math.round(drag.ph0 + (x - drag.x0) / 14), 0, st - 1);
        sliders.set('phase', s.phase);
      } else {
        li = clamp(Math.round(drag.li0 - (y - drag.y0) / 22), 0, LEVELS.length - 1);
        s.levels = LEVELS[li];
        relabel();
      }
      draw();
    },
    up() { drag = null; },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'step', label: '取样步长', min: 1, max: 8, step: 1, value: s.step },
        { name: 'phase', label: '取样相位', min: 0, max: 7, step: 1, value: s.phase },
        { name: 'li', label: '量化级数', min: 0, max: 6, step: 1, value: li },
      ],
    },
    (st) => {
      s.step = st.step;
      s.phase = clamp(st.phase, 0, Math.max(0, Math.round(s.step) - 1));
      li = st.li;
      s.levels = LEVELS[li];
      relabel();
      draw();
    },
  );
  /* buildSliders 的值标签只显示滑块原始数值，这里把「级数索引」换成真实级数 */
  function relabel() {
    const rows = sliders.box.querySelectorAll('.ml-slider');
    const span = rows[2] && rows[2].querySelector('.ml-slider__val');
    if (span) span.textContent = `${s.levels} 级`;
  }
  /* 供拖拽回写滑块把手 */
  sliders.set = (name, v) => {
    const rows = sliders.box.querySelectorAll('.ml-slider');
    const idx = { step: 0, phase: 1, li: 2 }[name];
    const r = rows[idx];
    if (!r) return;
    const range = r.querySelector('input');
    if (range) range.value = String(v);
    const span = r.querySelector('.ml-slider__val');
    if (span && name !== 'li') span.textContent = String(v);
  };
  relabel();

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
