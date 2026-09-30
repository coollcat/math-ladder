/* =========================================================================
 * lab 组件：image-fft（图像的二维傅里叶：图 ↔ 频谱）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "image-fft",
 *     "title": "在频谱上挖个洞，看图像少了什么"
 *   }
 *   ```
 *
 * 演示什么：
 *   中间那张是**频谱**（幅度取对数、零频移到中心）。中心是直流 = 整幅图的平均
 *   亮度；离中心越远 = 频率越高 = 越细的纹理；**亮的方向就是图里条纹的方向**
 *   （旋转 90° 的关系：图上的竖条纹 → 频谱横轴上的两个亮点）。
 *   在频谱上画遮罩：低通（只留中心圆，图变糊）、高通（挖掉中心，只剩边缘）、
 *   带阻（挖掉一圈，专门治周期性网纹）、方向（挖掉一个楔形，专治某一朝向的
 *   条纹）。右边是反变换回来的图，配合 PSNR 与「保留能量」看丢了什么。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   src     内置示例图，默认 'scene'（程序化生成的风景，在 128×128 上现算）。
 *           也可填 'stripes' | 'checker' | 'rings' | 'circle'（media.synth）
 *   mask    'lowpass'（默认）| 'highpass' | 'bandstop' | 'wedge'
 *   radius  归一化截止半径 0..1（1 = 半个画幅 = 奈奎斯特），默认 0.25
 *   width   带阻环的半宽 0.01..0.4，默认 0.08
 *   angle   方向遮罩的朝向（度，0..180），默认 0
 *   spread  方向遮罩的张角（度，5..90），默认 30
 *   n       变换尺寸（2 的幂），默认 128
 *
 * 能拖什么：
 *   - 在频谱图上拖动：横向定截止半径（离中心的距离），同时把方向角设成拖动的方位角
 *   - 底部滑块：半径 / 环宽 / 方向角 / 张角
 *   - 顶部开关：图案、遮罩类型
 *
 * 用到的引擎函数：dsp.fft（一维基 2 FFT，正反变换由 inverse 形参切换；
 *   二维靠逐行 + 逐列两轮一维实现）、media.synth（图案）、media.psnr（重建质量）。
 *   正向变换只在换图时算一次，拖遮罩时只重算反变换，所以拖动是跟手的。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout, bindPointer, label,
  clamp, fmt, grayCanvas, blit,
  sceneGray,
  clearBg,
} from '../core.js';
import { fft, fft2 } from '../engines/dsp.js';
import { synth, psnr } from '../engines/media.js';

export default function render(host, spec) {
  const N = [64, 128, 256].indexOf(spec.n) >= 0 ? spec.n : 128;
  const s = {
    src: spec.src || 'scene',
    mask: spec.mask || 'lowpass',
    radius: spec.radius ?? 0.25,
    width: spec.width ?? 0.08,
    angle: spec.angle ?? 0,
    spread: spec.spread ?? 30,
  };

  const loadImg = (mode) => (mode === 'scene' ? sceneGray(N, N) : synth(N, N, mode));
  let img = loadImg(s.src);
  let F = null;              // 正向变换缓存：换图才重算
  let specRect = null;       // 频谱图在画布上的位置（拖遮罩用）

  const cv = setupCanvas(host, 340);

  const segSrc = buildSegmented(
    [
      { label: '风景', value: 'scene' },
      { label: '竖条纹', value: 'stripes' },
      { label: '棋盘', value: 'checker' },
      { label: '圆环', value: 'rings' },
      { label: '圆', value: 'circle' },
    ],
    s.src,
    (v) => {
      s.src = v;
      img = loadImg(v);
      F = null;
      draw();
    },
  );
  const segMask = buildSegmented(
    [
      { label: '低通', value: 'lowpass' },
      { label: '高通', value: 'highpass' },
      { label: '带阻', value: 'bandstop' },
      { label: '方向', value: 'wedge' },
    ],
    s.mask,
    (v) => {
      s.mask = v;
      draw();
    },
  );
  host.appendChild(segSrc);
  host.appendChild(segMask);

  const ro = buildReadout({ '保留能量': '—', PSNR: '—', 说明: '—' });
  host.appendChild(ro.box);

  /* 遮罩：返回 true 表示「保留」。坐标为相对零频的 (du, dv)，单位是「格」。 */
  function keep(du, dv) {
    const half = N / 2;
    const rho = Math.hypot(du, dv) / half;
    switch (s.mask) {
      case 'highpass': return rho >= s.radius;
      case 'bandstop': {
        const d = Math.abs(rho - s.radius);
        return d > s.width;
      }
      case 'wedge': {
        if (rho < 0.008) return true;              // 直流永远留着，否则整幅图会飘
        const a = (Math.atan2(dv, du) * 180) / Math.PI;
        let diff = ((a - s.angle) % 180 + 180) % 180;
        diff = Math.min(diff, 180 - diff);
        return diff > s.spread / 2;
      }
      default: return rho <= s.radius;             // lowpass
    }
  }

  const NOTES = {
    lowpass: '只留中心 → 只剩低频，图变糊（细节都在高频）',
    highpass: '挖掉中心 → 只剩边缘与纹理，大片平坦区变黑',
    bandstop: '挖掉一圈 → 专治某个固定频率的周期性网纹',
    wedge: '挖掉一个楔形 → 专治某个朝向的条纹（看图上的竖纹是不是没了）',
  };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    if (!F) F = fft2(img, N, false);
    const half = N / 2;

    /* 幅度谱（用于显示）与能量统计 */
    const mag = new Float64Array(N * N);
    let mMax = 0;
    let eTot = 0;
    for (let i = 0; i < N * N; i += 1) {
      const m = Math.hypot(F.re[i], F.im[i]);
      mag[i] = m;
      eTot += m * m;
      if (m > mMax) mMax = m;
    }
    const dc = mag[0];

    /* 频谱显示：零频移到中心，幅度取对数后再压一道 gamma。
       不取对数的话除直流外全黑；只取对数不压 gamma 的话高频还是太暗。 */
    const A = 500 / (dc || 1);
    const disp = new Float64Array(N * N);
    for (let py = 0; py < N; py += 1) {
      for (let px = 0; px < N; px += 1) {
        const u = (px + half) % N;
        const v = (py + half) % N;
        const m = mag[v * N + u];
        disp[py * N + px] = (Math.log(1 + m * A) / Math.log(1 + mMax * A)) ** 0.8;
      }
    }

    /* 应用遮罩 → 反变换 */
    const mr = new Float64Array(N * N);
    const mi = new Float64Array(N * N);
    let eKeep = 0;
    for (let v = 0; v < N; v += 1) {
      const dv = v < half ? v : v - N;
      for (let u = 0; u < N; u += 1) {
        const du = u < half ? u : u - N;
        const i = v * N + u;
        if (keep(du, dv)) {
          mr[i] = F.re[i];
          mi[i] = F.im[i];
          eKeep += mag[i] * mag[i];
        }
      }
    }
    const back = fft2(mr, N, true);
    const rec = new Float64Array(N * N);
    for (let i = 0; i < N * N; i += 1) rec[i] = clamp(back.re[i], 0, 1);

    /* ---------- 三格布局 ---------- */
    const pad = 8;
    const pw = (W - pad * 4) / 3;
    const availH = H - pad * 2 - 22;
    const side = Math.min(pw - 6, availH);
    const titles = ['原图', '频谱（幅度取对数，中心 = 零频）', '反变换回来'];
    const pics = [
      grayCanvas(img, N, N),
      grayCanvas(disp, N, N),
      grayCanvas(rec, N, N),
    ];
    for (let ci = 0; ci < 3; ci += 1) {
      const bx = pad + ci * (pw + pad) + (pw - side) / 2;
      const by = pad + 22;
      label(ctx, titles[ci], pad + ci * (pw + pad) + 2, pad + 13, C.fg, { size: 11 });
      blit(ctx, pics[ci], bx, by, side, side);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, side, side);
      if (ci === 1) specRect = { x: bx, y: by, w: side, h: side };
    }

    /* ---------- 频谱上的遮罩轮廓 ---------- */
    if (specRect) {
      const cx = specRect.x + specRect.w / 2;
      const cy = specRect.y + specRect.h / 2;
      const R = s.radius * (specRect.w / 2);
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.5;
      if (s.mask === 'lowpass' || s.mask === 'highpass') {
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.mask === 'bandstop') {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, (s.radius - s.width) * (specRect.w / 2)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, (s.radius + s.width) * (specRect.w / 2), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const a0 = (s.angle * Math.PI) / 180;
        const da = (s.spread / 2) * (Math.PI / 180);
        const RR = specRect.w * 0.72;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a0 - da) * RR, cy + Math.sin(a0 - da) * RR);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a0 + da) * RR, cy + Math.sin(a0 + da) * RR);
        ctx.stroke();
        /* 挡掉的是这两条射线夹住的那一整条（含对侧） */
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - Math.cos(a0 - da) * RR, cy - Math.sin(a0 - da) * RR);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - Math.cos(a0 + da) * RR, cy - Math.sin(a0 + da) * RR);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = C.accent2;
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }

    const p = psnr(img, rec);
    ro.set('保留能量', `${fmt((eKeep / (eTot || 1)) * 100, 2)}%`);
    ro.set('PSNR', isFinite(p) ? `${fmt(p, 2)} dB` : '完全一样（∞）');
    ro.set('说明', NOTES[s.mask]);
  }

  /* ---- 在频谱上拖动：定截止半径 + 方向角 ---- */
  let drag = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!specRect) return null;
      if (x >= specRect.x && x <= specRect.x + specRect.w
        && y >= specRect.y && y <= specRect.y + specRect.h) return 'mask';
      return null;
    },
    down() { drag = { on: true }; },
    move(id, x, y) {
      if (!drag || !specRect) return;
      const cx = specRect.x + specRect.w / 2;
      const cy = specRect.y + specRect.h / 2;
      s.radius = clamp(Math.hypot(x - cx, y - cy) / (specRect.w / 2), 0, 1);
      s.angle = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 180) % 180;
      sliders.set('radius', s.radius);
      sliders.set('angle', s.angle);
      draw();
    },
    up() { drag = null; },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'radius', label: '截止半径', min: 0, max: 1, step: 0.01, value: s.radius, fmt: 2 },
        { name: 'width', label: '带阻环半宽', min: 0.01, max: 0.4, step: 0.01, value: s.width, fmt: 2 },
        { name: 'angle', label: '方向角', min: 0, max: 180, step: 1, value: s.angle },
        { name: 'spread', label: '方向张角', min: 5, max: 90, step: 1, value: s.spread },
      ],
    },
    (st) => {
      s.radius = st.radius;
      s.width = st.width;
      s.angle = st.angle;
      s.spread = st.spread;
      draw();
    },
  );
  /* 供拖拽回写滑块把手 */
  sliders.set = (name, v) => {
    const idx = { radius: 0, width: 1, angle: 2, spread: 3 }[name];
    const r = sliders.box.querySelectorAll('.ml-slider')[idx];
    if (!r) return;
    const range = r.querySelector('input');
    const span = r.querySelector('.ml-slider__val');
    if (range) range.value = String(Math.round(v * 100) / 100);
    if (span) span.textContent = String(Math.round(v * 100) / 100);
  };

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
