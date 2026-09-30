/* =========================================================================
 * lab 组件：image-conv（图像卷积：一个 3×3 的小窗口扫过整张图）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "image-conv",
 *     "title": "改一个数字，整张图就变了"
 *   }
 *   ```
 *
 * 演示什么：
 *   左边原图，中间卷积结果，右边是**卷积核的三维柱状图**（正系数向上、负系数
 *   向下）。右侧每根柱子都能直接拖：往上拖变正、往下拖变负，中间的图立刻跟着变。
 *   八种预设（模糊 / 高斯 / 锐化 / 拉普拉斯 / 浮雕 / Sobel-X / Sobel-Y）一键切换，
 *   也可以直接在下面的 3×3 输入框里敲数字。
 *   结果图有三种显示方式：截断、偏移 +0.5、取绝对值——因为带负系数的核
 *   （锐化 / 边缘 / 浮雕）算出来的值会跑到 0 和 1 外面去，不处理就是一片黑白。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   src      内置示例图，默认 'scene'（程序化生成的风景：天空 / 太阳 / 山脊 /
 *            竖条栅栏 / 高频棋盘）。也可填 'rings' | 'checker' | 'stripes' |
 *            'gradient'（直接调 media.synth）
 *   kernel   初始 3×3 核，行优先 9 个数，默认 KERNELS.gaussian
 *   preset   初始预设名：identity | boxBlur | gaussian | sharpen | laplacian |
 *            emboss | sobelX | sobelY，默认 'gaussian'
 *   view     结果显示：'shift'（默认，偏移 +0.5）| 'clip'（截断到 0–1）|
 *            'abs'（取绝对值）
 *   normalize true 表示把核除以它的系数和（保持整体亮度不变），默认 false
 *   gain    核的整体缩放 0.2..2.5，默认 1（锐化强度旋钮）
 *
 * 能拖什么：
 *   - 右侧三维柱：上下拖任意一根，改对应系数（数字输入框同步）
 *   - 底部滑块：核的整体缩放
 *   - 顶部按钮：预设核 / 显示方式 / 是否归一化
 *
 * 用到的引擎函数：media.synth（图案）、media.conv2（二维卷积）、
 *   media.KERNELS（八种预设核）。
 *   注：conv2 的 normalize 形参在引擎里是空操作，所以「归一化」是这里先把核
 *   除以系数和再喂进去，不另写卷积。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout, buildToolbar,
  bindPointer, mkBtn, el, label, clamp, fmt, grayCanvas, blit,
  sceneGray,
  clearBg,
} from '../core.js';
import { synth, conv2, KERNELS } from '../engines/media.js';

const W0 = 160;
const H0 = 120;
const AR = W0 / H0;

const PRESETS = [
  { key: 'identity', name: '恒等' },
  { key: 'boxBlur', name: '盒式模糊' },
  { key: 'gaussian', name: '高斯模糊' },
  { key: 'sharpen', name: '锐化' },
  { key: 'laplacian', name: '边缘（拉普拉斯）' },
  { key: 'emboss', name: '浮雕' },
  { key: 'sobelX', name: 'Sobel-X（竖边）' },
  { key: 'sobelY', name: 'Sobel-Y（横边）' },
];

const NOTE = {
  identity: '原样输出：只有中心是 1，其余全 0',
  boxBlur: '九个数相等：每点取邻域平均 → 糊，但高频噪声没了',
  gaussian: '中间重、四周轻的平均：糊得自然，不会出方块',
  sharpen: '中心 5、四邻 −1：原图 + 4 倍「原图 − 平均」→ 边缘更陡',
  laplacian: '中心 −4、四邻 1：二阶导数，平坦处为 0，只有边缘亮',
  emboss: '斜向差分：给平面图案造出光照的立体感',
  sobelX: '横向差分 + 纵向平滑：只留下竖直的边',
  sobelY: '纵向差分 + 横向平滑：只留下水平的边',
};

export default function render(host, spec) {
  const s = {
    src: spec.src || 'scene',
    preset: spec.preset || 'gaussian',
    view: spec.view || 'shift',
    normalize: spec.normalize === true,
    gain: spec.gain ?? 1,
  };
  let k = Array.isArray(spec.kernel) && spec.kernel.length === 9
    ? spec.kernel.slice()
    : KERNELS[s.preset].slice();
  let note = NOTE[s.preset] || '自定义核：改数字，看结果';

  const img = s.src === 'scene' ? sceneGray(W0, H0) : synth(W0, H0, s.src);
  const fullCv = grayCanvas(img, W0, H0);

  const cv = setupCanvas(host, 320);

  /* ---------- 预设按钮 ---------- */
  const presetBar = buildToolbar(
    ...PRESETS.map((p) => {
      const b = mkBtn(p.name);
      b.addEventListener('click', () => {
        k = KERNELS[p.key].slice();
        s.preset = p.key;
        s.gain = 1;
        syncInputs();
        syncGain();
        draw();
      });
      return b;
    }),
  );
  host.appendChild(presetBar);

  /* ---------- 3×3 数字输入框（与三维柱双向同步） ---------- */
  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,68px);gap:4px;margin:8px 0 4px;';
  const inputs = [];
  for (let i = 0; i < 9; i += 1) {
    const inp = el('input');
    inp.type = 'number';
    inp.step = '0.25';
    inp.value = String(k[i]);
    inp.style.cssText = 'width:68px;padding:2px 4px;';
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      k[i] = Number.isFinite(v) ? v : 0;
      note = '自定义核：改数字，看结果';
      draw();
    });
    inputs.push(inp);
    grid.appendChild(inp);
  }
  host.appendChild(grid);

  const segView = buildSegmented(
    [
      { label: '偏移 +0.5', value: 'shift' },
      { label: '截断 0–1', value: 'clip' },
      { label: '取绝对值', value: 'abs' },
    ],
    s.view,
    (v) => { s.view = v; draw(); },
  );
  const segNorm = buildSegmented(
    [
      { label: '不归一化', value: 'off' },
      { label: '除以系数和', value: 'on' },
    ],
    s.normalize ? 'on' : 'off',
    (v) => { s.normalize = v === 'on'; draw(); },
  );
  host.appendChild(segView);
  host.appendChild(segNorm);

  const ro = buildReadout({ '系数和': '—', '输出范围': '—', 说明: '—' });
  host.appendChild(ro.box);

  function syncInputs() {
    for (let i = 0; i < 9; i += 1) inputs[i].value = String(Math.round(k[i] * 100) / 100);
  }

  /* ---------- 生效的核：先整体缩放，再（可选）除以系数和 ---------- */
  function effKernel() {
    const out = k.map((v) => v * s.gain);
    if (s.normalize) {
      let sum = 0;
      for (let i = 0; i < 9; i += 1) sum += out[i];
      if (Math.abs(sum) > 1e-9) for (let i = 0; i < 9; i += 1) out[i] /= sum;
    }
    return out;
  }

  /* ---------- 右：卷积核的三维柱状图（可拖柱高） ---------- */
  let bars = [];        // 命中测试用
  function drawKernel3d(ctx, p, C) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2 + 10;
    const cw = Math.max(16, Math.min(34, p.w / 7.4));
    const ch = cw * 0.5;
    let mx = 0.001;
    for (let i = 0; i < 9; i += 1) mx = Math.max(mx, Math.abs(k[i]));
    const hs = Math.min(74, (p.h - 70) / 2) / mx;   // 每单位系数对应的像素高度

    /* 零平面：3×3 的菱形网格 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j += 1) {
      for (let i = 0; i < 3; i += 1) {
        const bx = cx + (i - j) * cw;
        const by = cy + (i + j) * ch;
        ctx.beginPath();
        ctx.moveTo(bx, by - ch);
        ctx.lineTo(bx + cw, by);
        ctx.lineTo(bx, by + ch);
        ctx.lineTo(bx - cw, by);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(cx - 3 * cw, cy);
    ctx.lineTo(cx + 3 * cw, cy);
    ctx.stroke();

    bars = [];
    const order = [];
    for (let j = 0; j < 3; j += 1) {
      for (let i = 0; i < 3; i += 1) order.push({ i, j, s: i + j });
    }
    order.sort((a, b) => a.s - b.s);
    order.forEach(({ i, j }) => {
      const idx = j * 3 + i;
      const v = k[idx];
      const bx = cx + (i - j) * cw;
      const by = cy + (i + j) * ch;
      const hgt = v * hs;
      const yT = by - hgt;
      const neg = v < 0;
      const topCol = neg ? 'rgb(216,131,123)' : 'rgb(122,165,232)';
      const sideCol = neg ? 'rgb(150,88,82)' : 'rgb(84,118,168)';
      /* 右侧面 */
      ctx.fillStyle = sideCol;
      ctx.beginPath();
      ctx.moveTo(bx, yT + ch);
      ctx.lineTo(bx + cw, yT);
      ctx.lineTo(bx + cw, by);
      ctx.lineTo(bx, by + ch);
      ctx.closePath();
      ctx.fill();
      /* 左侧面 */
      ctx.fillStyle = neg ? 'rgb(112,64,60)' : 'rgb(60,86,124)';
      ctx.beginPath();
      ctx.moveTo(bx, yT + ch);
      ctx.lineTo(bx - cw, yT);
      ctx.lineTo(bx - cw, by);
      ctx.lineTo(bx, by + ch);
      ctx.closePath();
      ctx.fill();
      /* 顶面 */
      ctx.fillStyle = topCol;
      ctx.beginPath();
      ctx.moveTo(bx, yT - ch);
      ctx.lineTo(bx + cw, yT);
      ctx.lineTo(bx, yT + ch);
      ctx.lineTo(bx - cw, yT);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      label(ctx, fmt(v, 2), bx, yT + (v >= 0 ? -ch - 5 : ch + 13), C.fg,
        { size: 10, align: 'center' });
      bars.push({ i, idx, bx, by, yT, cw, ch });
    });
    label(ctx, '卷积核（拖柱子改数字）', p.x + 6, p.y + 14, C.fg, { size: 11 });
    label(ctx, '正系数向上 · 负系数向下', p.x + 6, p.y + p.h - 6, C.fg, { size: 10 });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const pad = 8;
    const pw = (W - pad * 4) / 3;
    const availH = H - pad * 2 - 20;
    const imgW = Math.min(pw - 6, availH * AR);
    const imgH = imgW / AR;

    const ker = effKernel();
    const res = conv2(img, W0, H0, ker);
    let mn = Infinity; let mx = -Infinity;
    for (let i = 0; i < res.length; i += 1) {
      if (res[i] < mn) mn = res[i];
      if (res[i] > mx) mx = res[i];
    }
    const map = s.view === 'clip'
      ? (v) => v
      : s.view === 'abs'
        ? (v) => Math.abs(v)
        : (v) => v * 0.5 + 0.5;

    const panels = [
      { x: pad, t: '原图', cv: fullCv },
      { x: pad * 2 + pw, t: '卷积结果', cv: grayCanvas(res, W0, H0, map) },
    ];
    panels.forEach((p) => {
      const bx = p.x + (pw - imgW) / 2;
      const by = pad + 20;
      label(ctx, p.t, p.x + 4, pad + 13, C.fg, { size: 11 });
      blit(ctx, p.cv, bx, by, imgW, imgH);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, imgW, imgH);
    });
    drawKernel3d(ctx, { x: pad * 3 + pw * 2, y: pad, w: pw, h: availH + 20 }, C);

    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += ker[i];
    ro.set('系数和', fmt(sum, 3));
    ro.set('输出范围', `${fmt(mn, 2)} … ${fmt(mx, 2)}`);
    ro.set('说明', note);
  }

  /* ---- 拖柱子改系数 ---- */
  let drag = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      for (let n = bars.length - 1; n >= 0; n -= 1) {
        const b = bars[n];
        if (Math.abs(x - b.bx) <= b.cw * 0.92
          && y >= Math.min(b.by, b.yT) - b.ch && y <= Math.max(b.by, b.yT) + b.ch) {
          return n;
        }
      }
      return null;
    },
    down(id, x, y) { drag = { idx: bars[id].idx, y0: y, v0: k[bars[id].idx] }; },
    move(id, x, y) {
      if (!drag) return;
      const v = clamp(drag.v0 - (y - drag.y0) / 26, -8, 8);
      k[drag.idx] = Math.round(v * 20) / 20;
      note = '自定义核：改数字，看结果';
      syncInputs();
      draw();
    },
    up() { drag = null; },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'gain', label: '核整体缩放（锐化强度）', min: 0.2, max: 2.5, step: 0.05, value: s.gain },
      ],
    },
    (st) => {
      s.gain = st.gain;
      draw();
    },
  );
  /* 切预设时把缩放滑块拨回 1 */
  function syncGain() {
    const range = sliders.box.querySelector('input');
    const span = sliders.box.querySelector('.ml-slider__val');
    if (range) range.value = '1';
    if (span) span.textContent = '1';
    s.gain = 1;
  }

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
