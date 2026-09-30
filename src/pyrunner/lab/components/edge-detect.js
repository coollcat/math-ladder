/* =========================================================================
 * lab 组件：edge-detect（边缘 = 梯度大的地方）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "edge-detect",
 *     "title": "双阈值怎么决定哪些边算边"
 *   }
 *   ```
 *
 * 演示什么：
 *   四张图并排：原图 → 梯度幅值（Sobel，边越陡越亮）→ 梯度**方向**（用色相编码，
 *   能看出方向是垂直于边的）→ Canny 结果（非极大值抑制 + 双阈值）。
 *   对比第二张和第四张：幅值图里的边是**粗**的，Canny 把它们削成了一条线——
 *   这就是非极大值抑制。拖低/高两个阈值，看弱边怎么被连上来、噪声怎么被甩掉：
 *   高阈值定「肯定是边」的强边，低阈值决定「挨着强边才勉强算边」的弱边。
 *   底部是放大裁切 + 箭头场（quiver），箭头的方向就是梯度方向、长度就是幅值。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   src   内置示例图，默认 'scene'（程序化生成的风景：山脊斜边 / 竖条栅栏 /
 *         高频棋盘 / 太阳的圆弧）。也可填 'circle' | 'rings' | 'checker' |
 *         'stripes'（直接调 media.synth）
 *   lo    低阈值 0..1，默认 0.15
 *   hi    高阈值 0..1，默认 0.40
 *   zoom  底部裁切放大倍数 1..8，默认 4
 *
 * 能拖什么：
 *   - 在四张图的任意一张上拖动：移动底部放大裁切的窗口
 *   - 底部滑块：低阈值、高阈值、放大倍数
 *
 * 用到的引擎函数：media.synth（图案）、media.edgeMagnitude（Sobel 幅值与方向）、
 *   media.canny（非极大值抑制 + 双阈值，返回 1 = 强边、0.5 = 弱边）、
 *   media.countNonZero（边缘像素计数）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout, bindPointer, label,
  clamp, fmt, grayCanvas, blit,
  sceneGray,
  clearBg,
  cssToRGB,
} from '../core.js';
import { synth, edgeMagnitude, canny, countNonZero } from '../engines/media.js';

const W0 = 160;
const H0 = 120;
const AR = W0 / H0;

/* 幅值图 + 方向图 + Canny 结果：三类像素各有一种画法，因此单独一个装填函数 */
function paintCanvas(w, h, painter) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c2 = cv.getContext('2d');
  const im = c2.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const o = painter(i);
    im.data[i * 4] = clamp(o[0], 0, 255);
    im.data[i * 4 + 1] = clamp(o[1], 0, 255);
    im.data[i * 4 + 2] = clamp(o[2], 0, 255);
    im.data[i * 4 + 3] = 255;
  }
  c2.putImageData(im, 0, 0);
  return cv;
}

/* 主题色是 CSS 字符串（#rrggbb 或 rgb()/rgba()），ImageData 需要数字三元组。
   半透明色（如暗色主题的 soft）只取 rgb 部分，另由调用方决定底色。 */

export default function render(host, spec) {
  const s = {
    src: spec.src || 'scene',
    lo: spec.lo ?? 0.15,
    hi: spec.hi ?? 0.40,
    zoom: spec.zoom ?? 4,
  };
  const loadImg = (mode) => (mode === 'scene' ? sceneGray(W0, H0) : synth(W0, H0, mode));
  let img = loadImg(s.src);
  let cx = 0.20 * W0;
  let cy = 0.50 * H0;
  const rects = [];

  const cv = setupCanvas(host, 380);

  const seg = buildSegmented(
    [
      { label: '风景', value: 'scene' },
      { label: '圆', value: 'circle' },
      { label: '圆环', value: 'rings' },
      { label: '棋盘', value: 'checker' },
      { label: '条纹', value: 'stripes' },
    ],
    s.src,
    (v) => {
      s.src = v;
      img = loadImg(v);
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ '边缘像素': '—', '强 / 弱': '—', 裁切: '—' });
  host.appendChild(ro.box);

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    rects.length = 0;

    const lo = Math.min(s.lo, s.hi);
    const hi = s.hi;
    const { mag, dir } = edgeMagnitude(img, W0, H0);
    const edge = canny(img, W0, H0, lo, hi);

    /* 主题色解析成 rgb，供 ImageData 着色用。半透明的 soft 不能拿来当底色，
       否则暗色主题下会是一片白，这里按明暗直接给一个确定的底色。 */
    const colFg = cssToRGB(C.fg, [232, 234, 237]);
    const colAcc = cssToRGB(C.accent2, [217, 154, 78]);
    const colSoft = C.dark ? [32, 36, 44] : [238, 240, 243];

    const pad = 8;
    const topH = Math.max(110, (H - pad * 3) * 0.56);
    const cellW = (W - pad * 5) / 4;
    const imgW = Math.min(cellW - 6, (topH - 20) * AR);
    const imgH = imgW / AR;

    const items = [
      { t: '原图', c: grayCanvas(img, W0, H0) },
      { t: '梯度幅值（边越陡越亮）', c: grayCanvas(mag, W0, H0) },
      {
        t: '梯度方向（色相 = 角度）',
        c: paintCanvas(W0, H0, (i) => {
          if (mag[i] < lo) return colSoft;
          const a = ((dir[i] + Math.PI) / (2 * Math.PI)) * 360;
          const lum = 30 + 45 * clamp(mag[i], 0, 1);
          return hslToRgb(a, 0.72, lum / 100);
        }),
      },
      {
        t: `Canny（低 ${fmt(lo, 2)} / 高 ${fmt(hi, 2)}）`,
        c: paintCanvas(W0, H0, (i) => {
          if (edge[i] === 1) return colFg;
          if (edge[i] > 0) return colAcc;
          return colSoft;
        }),
      },
    ];

    items.forEach((it, ci) => {
      const x0 = pad + ci * (cellW + pad);
      label(ctx, it.t, x0 + 2, pad + 13, C.fg, { size: 11 });
      const bx = x0 + (cellW - imgW) / 2;
      const by = pad + 20;
      blit(ctx, it.c, bx, by, imgW, imgH);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, imgW, imgH);
      rects.push({ x: bx, y: by, w: imgW, h: imgH });
    });

    /* ---------- 底部：放大裁切 + 箭头场 ---------- */
    const n = Math.max(6, Math.round(56 / s.zoom));
    const ox = Math.round(clamp(cx - n / 2, 0, W0 - n));
    const oy = Math.round(clamp(cy - n / 2, 0, H0 - n));
    const y0 = pad * 2 + topH;
    const side = Math.min((W - pad * 3) / 3 - 20, H - y0 - pad - 26);
    const sidePx = Math.max(40, side);

    label(ctx, `裁切 ${n}×${n}（在任意一张图上拖动）`, pad + 2, y0 + 13, C.fg, { size: 11 });
    const cropCv = paintCanvas(n, n, (i) => {
      const j0 = Math.floor(i / n);
      const g = img[(oy + j0) * W0 + ox + (i % n)];
      const v = Math.round(clamp(g, 0, 1) * 255);
      return [v, v, v];
    });
    blit(ctx, cropCv, pad, y0 + 20, sidePx, sidePx);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(pad + 0.5, y0 + 20.5, sidePx, sidePx);

    /* 箭头场：方向 = 梯度方向，长度 ∝ 幅值 */
    const qx = pad * 2 + sidePx;
    label(ctx, '梯度场：箭头方向 = 梯度方向，长度 ∝ 幅值', qx + 2, y0 + 13, C.fg, { size: 11 });
    const cell = sidePx / n;
    blit(ctx, cropCv, qx, y0 + 20, sidePx, sidePx);
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(qx, y0 + 20, sidePx, sidePx);
    ctx.globalAlpha = 1;
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const k = (oy + j) * W0 + ox + i;
        const m = clamp(mag[k], 0, 1);
        if (m < lo * 0.5) continue;
        const px = qx + (i + 0.5) * cell;
        const py = y0 + 20 + (j + 0.5) * cell;
        const L = cell * (0.25 + 0.75 * m) * 0.95;
        const dx = Math.cos(dir[k]) * L;
        const dy = Math.sin(dir[k]) * L;
        ctx.strokeStyle = edge[k] === 1 ? C.accent2 : C.accent;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px - dx / 2, py - dy / 2);
        ctx.lineTo(px + dx / 2, py + dy / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + dx / 2, py + dy / 2);
        ctx.lineTo(px + dx / 2 - dx * 0.3 - dy * 0.18, py + dy / 2 - dy * 0.3 + dx * 0.18);
        ctx.moveTo(px + dx / 2, py + dy / 2);
        ctx.lineTo(px + dx / 2 - dx * 0.3 + dy * 0.18, py + dy / 2 - dy * 0.3 - dx * 0.18);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(qx + 0.5, y0 + 20.5, sidePx, sidePx);

    /* 右侧说明 */
    const tx = qx + sidePx + pad + 6;
    const lines = [
      '幅值图里的边是粗的（Sobel 有一格宽），',
      'Canny 把它削成了一条线 —— 非极大值抑制：',
      '只保留梯度方向上「比两个邻居都大」的点。',
      '',
      `低阈值 ${fmt(lo, 2)}：够这条线的弱边才被保留，`,
      '而且必须挨着强边（否则是噪声）。',
      `高阈值 ${fmt(hi, 2)}：定「肯定是边」的强边。`,
    ];
    lines.forEach((t, i) => label(ctx, t, tx, y0 + 30 + i * 16, C.fg, { size: 11 }));

    /* 计数 */
    let strong = 0;
    for (let i = 0; i < edge.length; i += 1) if (edge[i] === 1) strong += 1;
    const nz = countNonZero(edge);
    ro.set('边缘像素', `${fmt((nz / edge.length) * 100, 2)}%（${nz} 个）`);
    ro.set('强 / 弱', `强 ${strong} · 弱 ${nz - strong}`);
    ro.set('裁切', `${n}×${n} @ (${ox}, ${oy})`);
  }

  /* HSL → RGB（方向图用色相编码角度，属于数据着色） */
  function hslToRgb(h, sat, lum) {
    const c = (1 - Math.abs(2 * lum - 1)) * sat;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let rgb = [0, 0, 0];
    if (hp < 1) rgb = [c, x, 0];
    else if (hp < 2) rgb = [x, c, 0];
    else if (hp < 3) rgb = [0, c, x];
    else if (hp < 4) rgb = [0, x, c];
    else if (hp < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const m = lum - c / 2;
    return rgb.map((v) => Math.round((v + m) * 255));
  }

  /* ---- 拖动：在任意一张图上移动裁切窗口 ---- */
  const hit = (x, y) => rects.find(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
  );
  let drag = null;
  bindPointer(cv.canvas, {
    pick: (x, y) => (hit(x, y) ? 'crop' : null),
    down(id, x, y) {
      const r = hit(x, y);
      if (r) drag = { x0: x, y0: y, cx0: cx, cy0: cy, r };
    },
    move(id, x, y) {
      if (!drag) return;
      const r = drag.r;
      const n = Math.max(6, Math.round(56 / s.zoom));
      cx = clamp(drag.cx0 + ((x - drag.x0) / r.w) * W0, n / 2, W0 - n / 2);
      cy = clamp(drag.cy0 + ((y - drag.y0) / r.h) * H0, n / 2, H0 - n / 2);
      draw();
    },
    up() { drag = null; },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'lo', label: '低阈值', min: 0.02, max: 1, step: 0.01, value: s.lo },
        { name: 'hi', label: '高阈值', min: 0.05, max: 1, step: 0.01, value: s.hi },
        { name: 'zoom', label: '裁切放大', min: 1, max: 8, step: 1, value: s.zoom },
      ],
    },
    (st) => {
      s.lo = st.lo;
      s.hi = st.hi;
      s.zoom = st.zoom;
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
