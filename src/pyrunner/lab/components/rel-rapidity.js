/* =========================================================================
 * lab 组件：rel-rapidity —— 快度：把"追不上光"变成一条直线
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-rapidity", "title": "快度相加是一条直线", "beta1": 0.6, "beta2": 0.6 }
 *   ```
 *
 * 字段：beta1 / beta2  两次速度合成的两个速度（单位 c），0..0.95，默认都是 0.6
 *
 * 能拖什么：
 *   ① 两个滑块（β₁、β₂）；② 最上一行两个圆把手 —— 直接沿快度尺拖动，
 *   看"快度相加 = 把两段长度接起来"这件事有多直白。
 *
 * 看什么：
 *   第一行：快度尺 φ（均匀刻度，旁边标出对应的 β = tanh φ）；
 *   第二行：把 φ₁ 与 φ₂ 首尾接起来 —— 总长度就是 φ₁ + φ₂，**加法在这里成立**；
 *   第三行：换回速度 β 看：相对论合成 tanh(φ₁+φ₂) 永远落在光速墙左边，
 *   而伽利略合成 β₁ + β₂ 会直接冲出墙外（红色）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  label, fmt, clamp,
} from '../core.js';

const PHI_MAX = 5.0;   /* 快度尺的范围 */
const BETA_MAX = 1.2;  /* 速度尺画到 1.2c，好让"越界"看得见 */

function pickSlider(spec, name, def) {
  const s = (spec.sliders || []).find((it) => it && it.name === name);
  return s ? { name, label: s.label || def.label, min: s.min, max: s.max, step: s.step, value: s.value } : def;
}

export default function render(host, spec) {
  let b1 = clamp(Number(spec.beta1 ?? 0.6), 0, 0.95);
  let b2 = clamp(Number(spec.beta2 ?? 0.6), 0, 0.95);

  const cv = setupCanvas(host, 380);
  const ro = buildReadout({
    快度: '—', 相对论合成: '—', 伽利略合成: '—', 差距: '—',
  });
  host.appendChild(ro.box);

  const geo = { x0: 0, x1: 0, yPhi: 0, yBar: 0, yBeta: 0 };
  const artanh = (v) => 0.5 * Math.log((1 + v) / (1 - v));
  const phi1 = () => artanh(b1);
  const phi2 = () => artanh(b2);

  const XP = (phi) => geo.x0 + (phi / PHI_MAX) * (geo.x1 - geo.x0);
  const XB = (b) => geo.x0 + (b / BETA_MAX) * (geo.x1 - geo.x0);
  const iXB = (px) => ((px - geo.x0) / (geo.x1 - geo.x0)) * BETA_MAX;
  const iXP = (px) => ((px - geo.x0) / (geo.x1 - geo.x0)) * PHI_MAX;

  function axis(ctx, C, y, x0, x1, max, color, title, tickFmt) {
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5);
    ctx.stroke();
    for (let k = 0; k <= max + 1e-9; k += 1) {
      const px = x0 + (k / max) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, y - 4); ctx.lineTo(px + 0.5, y + 4);
      ctx.stroke();
      label(ctx, tickFmt(k), px, y + 18, C.axis, { size: 9, align: 'center' });
    }
    label(ctx, title, x0, y - 12, color, { size: 11, weight: 600 });
  }

  function handle(ctx, C, x, y, col, txt, align) {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, txt, x, y + (align === 'up' ? -14 : 24), col, { size: 11, align: 'center', weight: 600 });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    geo.x0 = 34;
    geo.x1 = W - 22;
    geo.yPhi = 78;
    geo.yBar = 176;
    geo.yBeta = 300;

    const p1 = phi1(), p2 = phi2();
    const pSum = p1 + p2;
    const bRel = Math.tanh(pSum);
    const bGal = b1 + b2;

    /* ---- 第一行：快度尺 ---- */
    axis(ctx, C, geo.yPhi, geo.x0, geo.x1, PHI_MAX, C.fg, '① 快度 φ（这东西可以随便加）',
      (k) => `${k}`);
    for (let k = 0; k <= PHI_MAX; k += 1) {
      const px = XP(k);
      label(ctx, `β=${fmt(Math.tanh(k), 2)}`, px, geo.yPhi + 32, C.axis, { size: 9, align: 'center' });
    }
    handle(ctx, C, XP(p1), geo.yPhi, C.named('blue'), `φ₁ = ${fmt(p1, 3)}`, 'up');
    handle(ctx, C, XP(p2), geo.yPhi, C.named('orange'), `φ₂ = ${fmt(p2, 3)}`, 'down');

    /* ---- 第二行：首尾相接 ---- */
    label(ctx, '② 把两段快度接起来：总长度就是 φ₁ + φ₂（加法成立）', geo.x0, geo.yBar - 26,
      C.fg, { size: 11, weight: 600 });
    const barH = 26;
    const seg = (a, b, col, txt) => {
      const w = XP(Math.min(b, PHI_MAX)) - XP(Math.min(a, PHI_MAX));
      if (w <= 0) return;
      ctx.fillStyle = col;
      ctx.fillRect(XP(Math.min(a, PHI_MAX)), geo.yBar, w, barH);
      if (w > 44) {
        label(ctx, txt, XP(Math.min(a, PHI_MAX)) + w / 2, geo.yBar + 18, C.bg,
          { size: 11, align: 'center', weight: 600 });
      }
    };
    seg(0, p1, C.named('blue'), `φ₁ = ${fmt(p1, 2)}`);
    seg(p1, pSum, C.named('orange'), `φ₂ = ${fmt(p2, 2)}`);
    label(ctx, `φ₁ + φ₂ = ${fmt(pSum, 3)}`, XP(Math.min(pSum, PHI_MAX)) + 6, geo.yBar + 18,
      C.fg, { size: 11, weight: 600 });

    /* ---- 第三行：换回速度 ---- */
    axis(ctx, C, geo.yBeta, geo.x0, geo.x1, BETA_MAX, C.fg, '③ 换回速度 β（加法在这里失效）',
      (k) => `${k}c`);
    /* 光速墙 */
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(XB(1), geo.yBeta - 46); ctx.lineTo(XB(1), geo.yBeta + 26);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '光速墙 c', XB(1), geo.yBeta - 52, C.bad, { size: 10, align: 'center' });

    const dotOn = (b, col, txt, up) => {
      const px = XB(clamp(b, 0, BETA_MAX));
      ctx.beginPath();
      ctx.arc(px, geo.yBeta, 6, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      label(ctx, txt, px, geo.yBeta + (up ? -16 : 30), col, { size: 10, align: 'center' });
    };
    dotOn(b1, C.named('blue'), `β₁ = ${fmt(b1, 2)}`, true);
    dotOn(b2, C.named('orange'), `β₂ = ${fmt(b2, 2)}`, false);
    dotOn(bRel, C.ok, `tanh(φ₁+φ₂) = ${fmt(bRel, 3)}`, true);
    if (bGal <= BETA_MAX) {
      dotOn(bGal, C.bad, `β₁+β₂ = ${fmt(bGal, 2)}`, false);
    } else {
      /* 越界：画一个冲出去的箭头 */
      const px = geo.x1 - 2;
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(XB(1) + 4, geo.yBeta + 14);
      ctx.lineTo(px, geo.yBeta + 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, geo.yBeta + 14); ctx.lineTo(px - 8, geo.yBeta + 9);
      ctx.lineTo(px - 8, geo.yBeta + 19);
      ctx.closePath();
      ctx.fillStyle = C.bad;
      ctx.fill();
      label(ctx, `β₁+β₂ = ${fmt(bGal, 2)}c ✗ 超光速`, px, geo.yBeta + 34, C.bad,
        { size: 10, align: 'right', weight: 600 });
    }

    label(ctx, '拖第一行的圆把手，或拖下面的两个滑块', geo.x0, H - 6, C.accent, { size: 11 });

    ro.set('快度', `φ₁ = ${fmt(p1, 4)}，φ₂ = ${fmt(p2, 4)}，φ₁+φ₂ = ${fmt(pSum, 4)}`);
    ro.set('相对论合成', `β = tanh(φ₁+φ₂) = (β₁+β₂)/(1+β₁β₂) = ${fmt(bRel, 6)}`);
    ro.set('伽利略合成', `β₁ + β₂ = ${fmt(bGal, 4)}${bGal >= 1 ? '（已经超过光速，物理上不可能）' : ''}`);
    ro.set('差距', `${fmt((bGal - bRel) * 100, 2)} 个百分点（β 越大差得越离谱）`);
  }

  const sl = buildSliders({
    sliders: [
      pickSlider(spec, 'beta1', { name: 'beta1', label: 'β₁', min: 0, max: 0.95, step: 0.01, value: b1 }),
      pickSlider(spec, 'beta2', { name: 'beta2', label: 'β₂', min: 0, max: 0.95, step: 0.01, value: b2 }),
    ],
  }, (st) => {
    b1 = clamp(st.beta1 ?? b1, 0, 0.95);
    b2 = clamp(st.beta2 ?? b2, 0, 0.95);
    draw();
  });
  const inputs = sl.box.querySelectorAll('input');
  function syncSliders() {
    if (inputs[0]) inputs[0].value = String(Math.round(b1 * 100) / 100);
    if (inputs[1]) inputs[1].value = String(Math.round(b2 * 100) / 100);
    sl.state.beta1 = b1;
    sl.state.beta2 = b2;
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (Math.abs(y - geo.yPhi) > 26) return null;
      const d1 = Math.abs(x - XP(phi1()));
      const d2 = Math.abs(x - XP(phi2()));
      return d1 <= d2 ? 'h1' : 'h2';
    },
    move(id, x) {
      const v = clamp(Math.tanh(iXP(x)), 0, 0.95);
      if (id === 'h1') b1 = v; else b2 = v;
      syncSliders();
      draw();
    },
  });
  cv.canvas.style.cursor = 'ew-resize';

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
