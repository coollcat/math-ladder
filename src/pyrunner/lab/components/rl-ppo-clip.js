/* =========================================================================
 * lab 组件：rl-ppo-clip —— 概率比 r 的裁剪窗口与「梯度归零区」
 * -------------------------------------------------------------------------
 * 用法（第 50 章 PPO 的裁剪思想）：
 *
 *   { "type": "rl-ppo-clip", "title": "PPO 裁剪窗口", "epsilon": 0.2, "adv": 2 }
 *
 * 字段（都可省）：
 *   epsilon  裁剪半径 ε，0.05..0.5，默认 0.2
 *   adv      优势 A 的大小，0.5..4，默认 2（正负由按钮切）
 *   r        概率比游标的初值，0.5..1.5，默认 1
 *   height   画布高度，默认 480
 *
 * 演示什么：把 L^CLIP(r) = min(rA, clip(r, 1−ε, 1+ε)·A) 整条曲线画出来：
 *   · 虚线是未裁剪的 r·A（一条过原点的直线，斜率为 A）；
 *   · 实线是真正的替代目标：进入裁剪窗口外后，它被钉成一条水平线；
 *   · 水平段就是「梯度归零区」——r 再往外推，目标不再变大，也就没有梯度。
 *   · 游标 r 可以左右拖：读数给出当前 r、目标值、以及数值斜率 dL/dr。
 *     A>0 时归零区在右侧（r>1+ε），A<0 时在左侧（r<1−ε）——这一点很多
 *     示意图画错，所以这里两个方向都能切，让曲线自己说话。
 *   · 单步 = r 往外走一格；「推到边界」= 直接跳到最近的那个窗口边界。
 * 取舍：只画单条优势值的目标函数，不训练真实网络；PPO 的 KL 变体只作提示。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, clamp, fmt, clearBg, buildSegmented, label,
} from '../core.js';
import { fillRound, caption, plotFrame, colorRGBA, dot, dashedLine, chip } from './rl-common.js';

const BASE = [
  { name: 'epsilon', label: '裁剪半径 ε', min: 0.05, max: 0.5, step: 0.05, value: 0.2 },
  { name: 'adv', label: '优势 |A|', min: 0.5, max: 4, step: 0.5, value: 2 },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 480, 340, 900);
  let eps = clamp(typeof spec.epsilon === 'number' ? spec.epsilon : 0.2, 0.05, 0.5);
  let adv = clamp(typeof spec.adv === 'number' ? spec.adv : 2, 0.5, 4);
  let sign = spec.advSign === '-' || (typeof spec.adv === 'number' && spec.adv < 0) ? -1 : 1;
  let r = clamp(typeof spec.r === 'number' ? spec.r : 1, 0.5, 1.5);

  const A = () => sign * adv;
  const obj = (rr, a) => Math.min(rr * a, clamp(rr, 1 - eps, 1 + eps) * a);
  const slope = (rr, a) => {
    const h = 1e-4;
    return (obj(rr + h, a) - obj(rr - h, a)) / (2 * h);
  };

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    eps = st.epsilon;
    adv = st.adv;
    syncAll();
  });

  host.appendChild(buildSegmented([
    { label: 'A > 0（该动作比平均好）', value: 'pos' },
    { label: 'A < 0（该动作比平均差）', value: 'neg' },
  ], sign > 0 ? 'pos' : 'neg', (v) => { sign = v === 'neg' ? -1 : 1; syncAll(); }));

  const ro = buildReadout({
    '优势 A': '—',
    '概率比 r': '—',
    '未裁剪 r·A': '—',
    '裁剪后 L^CLIP': '—',
    '斜率 dL/dr': '—',
    '状态': '—',
  });
  host.appendChild(ro.box);

  const bOut = mkBtn('r 往外走 ▶');
  const bIn = mkBtn('r 往里走 ◀');
  const bEdge = mkBtn('推到窗口边界');
  const bReset = mkBtn('重置 r = 1');
  host.appendChild(buildToolbar(bOut, bIn, bEdge, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '实线是训练真正在爬的目标；它一旦走平（水平段），就再没有梯度去推动 r 了。';
  host.appendChild(hint);

  function syncAll() { syncReadout(); draw(); }

  function syncReadout() {
    const a = A();
    const L = obj(r, a);
    const un = r * a;
    const sl = slope(r, a);
    const hi = 1 + eps;
    const lo = 1 - eps;
    ro.set('优势 A', (a > 0 ? '+' : '') + fmt(a, 2) + (a > 0 ? '（好动作）' : '（坏动作）'));
    ro.set('概率比 r', fmt(r, 3) + '（窗口 [' + fmt(lo, 2) + ', ' + fmt(hi, 2) + ']）');
    ro.set('未裁剪 r·A', fmt(un, 3));
    ro.set('裁剪后 L^CLIP', fmt(L, 3));
    ro.set('斜率 dL/dr', fmt(sl, 3));
    const zero = Math.abs(sl) < 1e-6;
    ro.set('状态', zero
      ? (a > 0 ? '在右侧窗口外：目标被钉住，梯度 = 0' : '在左侧窗口外：目标被钉住，梯度 = 0')
      : (Math.abs(r - 1) < 1e-9 ? 'r = 1：新旧策略一致，起点'
        : (a > 0 ? '在窗口内（或左侧未裁剪段）：还能爬' : '在窗口内（或右侧未裁剪段）：还能爬')));
  }

  /* 按钮 */
  function nudge(d) {
    r = clamp(Math.round((r + d) * 100) / 100, 0.5, 1.5);
    syncAll();
  }
  bOut.addEventListener('click', () => nudge(sign > 0 ? 0.05 : 0.05));
  bIn.addEventListener('click', () => nudge(-0.05));
  bEdge.addEventListener('click', () => {
    /* 跳到「离当前 r 最近、且已经进入归零区」的那个边界 */
    const edge = A() > 0 ? 1 + eps : 1 - eps;
    r = clamp(Math.round((edge + (A() > 0 ? 0.02 : -0.02)) * 100) / 100, 0.5, 1.5);
    syncAll();
  });
  bReset.addEventListener('click', () => { r = 1; syncAll(); });

  /* 画布拖动游标 */
  cv.canvas.addEventListener('pointerdown', onPointer);
  cv.canvas.addEventListener('pointermove', (ev) => { if (ev.buttons) onPointer(ev); });
  function onPointer(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / (rect.width || 1));
    const box = geo.box;
    if (!box) return;
    r = clamp(Math.round((0.5 + ((x - box.x) / box.w) * 1.0) * 100) / 100, 0.5, 1.5);
    syncAll();
  }

  const geo = { box: null };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const a = A();
    label(ctx, 'PPO 裁剪：目标函数在窗口外走平，走平的地方就没有梯度',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'ε = ' + fmt(eps, 2) + '　窗口 = [1−ε, 1+ε] = [' + fmt(1 - eps, 2) + ', ' + fmt(1 + eps, 2)
      + ']　A = ' + (a > 0 ? '+' : '') + fmt(a, 2), 14, 38, C.axis, { size: 10.5 });

    const pad = 14;
    const box = { x: pad + 56, y: 66, w: W - pad * 2 - 74, h: Math.min(Hh - 250, 250) };
    geo.box = box;
    const rRange = [0.5, 1.5];
    const yMax = Math.max(adv * 1.5, Math.abs(a) * (1 + eps) * 1.35, 0.5);
    const yMin = Math.min(-yMax, a * 0.5) * (a < 0 ? 1 : 0.2);
    const { X, Y } = plotFrame(ctx, C, box, rRange, [yMin, yMax], { xTicks: 5, yTicks: 4 });

    /* 裁剪窗口底色 */
    ctx.save();
    ctx.fillStyle = colorRGBA(C.named('green'), 0.10);
    ctx.fillRect(X(1 - eps), box.y, Math.max(X(1 + eps) - X(1 - eps), 1), box.h);
    ctx.restore();
    dashedLine(ctx, X(1 - eps), box.y, X(1 - eps), box.y + box.h, C.named('green'), 1.4, [4, 4]);
    dashedLine(ctx, X(1 + eps), box.y, X(1 + eps), box.y + box.h, C.named('green'), 1.4, [4, 4]);
    label(ctx, '裁剪窗口', X(1), box.y + 12, C.named('green'), { size: 9.5, align: 'center', weight: 600 });

    /* 未裁剪直线 r·A */
    const ptsUn = [0.5, 1.5].map((v) => [X(v), Y(v * a)]);
    ctx.save();
    ctx.strokeStyle = colorRGBA(C.named('orange'), 0.85);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(ptsUn[0][0], ptsUn[0][1]);
    ctx.lineTo(ptsUn[1][0], ptsUn[1][1]);
    ctx.stroke();
    ctx.restore();
    label(ctx, '未裁剪 r·A（斜率 = A）', X(1.32), Y(a * 1.32) - 8, C.named('orange'),
      { size: 9.5, align: 'center' });

    /* 裁剪后的目标：分段直线 */
    const grid = [];
    for (let v = 0.5; v <= 1.5001; v += 0.01) grid.push(v);
    ctx.save();
    ctx.strokeStyle = C.named('teal');
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    grid.forEach((v, i) => {
      const x = X(v);
      const y = Y(obj(v, a));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    /* 梯度归零区（水平段）用粗线覆盖 + 标注 */
    const zeroLo = a > 0 ? 1 + eps : 0.5;
    const zeroHi = a > 0 ? 1.5 : 1 - eps;
    const zeroVal = a > 0 ? a * (1 + eps) : a * (1 - eps);
    if (zeroHi - zeroLo > 0.02) {
      ctx.save();
      ctx.strokeStyle = C.named('red');
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(zeroLo), Y(zeroVal));
      ctx.lineTo(X(zeroHi), Y(zeroVal));
      ctx.stroke();
      ctx.restore();
      label(ctx, '梯度 = 0：再推 r，目标也不变', X((zeroLo + zeroHi) / 2), Y(zeroVal) + (a > 0 ? 16 : -10),
        C.named('red'), { size: 9.5, align: 'center', weight: 700 });
    }

    /* 坐标轴刻度文字 */
    [0.5, 0.8, 1, 1.2, 1.5].forEach((v) => {
      label(ctx, fmt(v, 1), X(v), box.y + box.h + 14, C.axis, { size: 9, align: 'center' });
    });
    label(ctx, '概率比 r = π新 / π旧', box.x + box.w / 2, box.y + box.h + 30, C.axis, { size: 10, align: 'center' });
    label(ctx, '目标 L', box.x - 8, box.y + 10, C.axis, { size: 9.5, align: 'right' });
    if (yMin < 0 && yMax > 0) dashedLine(ctx, box.x, Y(0), box.x + box.w, Y(0), C.axis, 1, [3, 3]);

    /* 游标 */
    const cx = X(r);
    const cy = Y(obj(r, a));
    dashedLine(ctx, cx, box.y, cx, box.y + box.h, C.fg, 1.2, [3, 3]);
    dot(ctx, cx, cy, 5, C.fg);
    dot(ctx, cx, cy, 2.6, C.bg);
    /* 当前斜率画成一小段切线：归零时切线是水平的 */
    const sl = slope(r, a);
    const dx = 0.06;
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(r - dx), Y(obj(r, a) - sl * dx));
    ctx.lineTo(X(r + dx), Y(obj(r, a) + sl * dx));
    ctx.stroke();
    ctx.restore();
    chip(ctx, 'r = ' + fmt(r, 2) + '　L = ' + fmt(obj(r, a), 2) + '　斜率 ' + fmt(sl, 2),
      cx, box.y - 14, C, { size: 9.5, fill: colorRGBA(C.accent, 0.16) });

    /* 下面的说明块 */
    const iy = box.y + box.h + 44;
    const slip = 'A > 0 时，PPO 只挡「把好动作的概率继续抬」这一侧：r > 1+ε 后目标封顶；'
      + 'r < 1−ε（把好动作压得太狠）时 min 取未裁剪的 rA，仍然有梯度把它拉回来。';
    const slit = 'A < 0 时镜像：r < 1−ε（还不够回避这个坏动作）才被夹住；'
      + 'r > 1+ε 时目标取未裁剪段。所以「梯度归零区」总在**朝外推优势方向**的那一侧。';
    fillRound(ctx, pad, iy - 14, W - pad * 2, 62, 8, colorRGBA(C.named('purple'), 0.10));
    label(ctx, a > 0 ? slip : slit, pad + 10, iy + 2, C.fg, { size: 10.5, weight: 600 });
    const cur = Math.abs(r - 1) < 1e-9 ? 'r = 1 是起点：新旧策略一样，这一项等于 A 本身。'
      : (sl === 0 ? '现在正踩着水平段：这一批数据已经无法再推动策略，得换新数据。'
        : '现在还在有斜率的段上：梯度会按 A 的方向继续推 r。');
    label(ctx, cur, pad + 10, iy + 22, C.axis, { size: 10 });
    if (Hh > iy + 74) {
      chip(ctx, '把 ε 调大：窗口变宽，可用的更新步更少被夹住；ε 调小则更快进入水平段。',
        pad + 4, iy + 48, C, { size: 9, padX: 5, height: 15, align: 'left' });
    }
    caption(ctx, '公式：L^CLIP = min( r·A, clip(r, 1−ε, 1+ε)·A )', pad + 2, box.y - 30, C);
  }

  syncReadout();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}
