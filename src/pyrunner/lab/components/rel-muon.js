/* =========================================================================
 * lab 组件：rel-muon —— 光钟为什么变慢，μ 子为什么活得那么久
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-muon", "title": "光钟滴答与 μ 子下坠", "beta": 0.6, "muonBeta": 0.9994, "h": 10 }
 *   ```
 *
 * 字段：
 *   beta      光钟相对实验室的速度（单位 c），0..0.95，默认 0.6
 *   muonBeta  μ 子速度（单位 c），0.9..0.9999，默认 0.9994
 *   h         μ 子生成高度（km），1..20，默认 10
 *
 * 能拖什么：三个滑块随便拖；画布上左右两栏都能点一下把动画从头放一遍
 * （左栏 = 光钟，右栏 = μ 子下坠），点「播放」连续跑。
 *
 * 看什么：
 *   左栏：光子钟的两个镜子。竖着的虚线是"时钟自己看见的"光程 D，
 *   斜边是"实验室看见的"光程 γD —— 光速不变，路程变长，所以一 tick 更久。
 *   右栏：μ 子从 h 公里高处往下掉。红叉是"没有时间膨胀只能走 βcτ₀"的位置，
 *   绿箭头是"有时间膨胀能走 βcγτ₀"。两者一比，就是 μ 子能不能活着到地面的全部秘密。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, anim, polyline, label,
  fmt, clamp, pickSlider,
  clearBg,
  gammaOf,
} from '../core.js';

const C_LIGHT = 299792458;   /* 光速 m/s */
const TAU0 = 2.2e-6;         /* μ 子固有寿命（秒） */
const RING = 0.55;           /* 光子在斜边上跑完一趟用掉的真实秒数 */

export default function render(host, spec) {
  let beta = clamp(Number(spec.beta ?? 0.6), 0, 0.95);
  let mb = clamp(Number(spec.muonBeta ?? 0.9994), 0.9, 0.9999);
  let hkm = clamp(Number(spec.h ?? 10), 1, 20);
  let anim1 = 0;    /* 光钟：0..1 的一个周期游标 */
  let anim2 = 0;    /* μ 子：0..1 的下坠进度 */

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({
    光钟: '—', μ子: '—', 能走多远: '—', 结局: '—',
  });
  host.appendChild(ro.box);

  const g1 = () => gammaOf(beta);
  const gm = () => gammaOf(mb);

  function drawClock(ctx, C, x0, y0, w, h, g) {
    /* 两条镜面 + 光子斜边：竖边 D、横边 βγD、斜边 γD，整体缩放以塞进画框。
       比例来自光速不变：同样的竖直 D，实验室里光走的是斜边 γD。 */
    const boxTop = y0 + 50;
    const boxBottom = y0 + h - 34;
    const Dp = Math.max(boxBottom - boxTop, 40);
    const stepX = Dp * Math.sqrt(Math.max(g * g - 1, 0));
    const k = Math.min(1, (w - 60) / Math.max(stepX, 1e-6));
    const sx = stepX * k, sy = Dp * k;
    const bx = x0 + 28, by = boxBottom;
    const tx = bx + sx, ty = by - sy;

    /* 下镜的"原位置"与"现在位置"（时钟整体向右走了 sx） */
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx - 14, by + 8); ctx.lineTo(bx + 14, by + 8);
    ctx.moveTo(tx - 14, ty - 8); ctx.lineTo(tx + 14, ty - 8);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(tx - 14, by + 8); ctx.lineTo(tx + 14, by + 8);
    ctx.stroke();
    ctx.restore();
    label(ctx, '下镜当时', bx, by + 24, C.axis, { size: 10, align: 'center' });
    label(ctx, '下镜现在', tx, by + 24, C.axis, { size: 10, align: 'center' });

    /* 竖边（时钟系光程）与横边（时钟走的路） */
    polyline(ctx, [[bx, by], [bx, ty]], C.named('purple'), 1.6, [5, 4]);
    polyline(ctx, [[bx, by], [tx, by]], C.axis, 1.4, [3, 3]);
    label(ctx, 'D', bx - 6, (by + ty) / 2, C.named('purple'), { size: 11, align: 'right' });
    label(ctx, `βγD = ${fmt(Math.sqrt(Math.max(g * g - 1, 0)), 2)}D`, (bx + tx) / 2, by + 13,
      C.axis, { size: 10, align: 'center' });

    /* 斜边（实验室系光程），光子沿它走 */
    polyline(ctx, [[bx, by], [tx, ty]], C.accent, 2.2);
    const t = anim1;
    const px = bx + sx * t, py = by - sy * t;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = C.named('amber');
    ctx.fill();
    label(ctx, `γD = ${fmt(g, 3)} D`, (bx + tx) / 2 + 6, (by + ty) / 2 - 6, C.accent,
      { size: 11, weight: 600 });

    /* 两根进度条：时钟自己的时间走 1 格，实验室时间走 γ 格 */
    const barW = w - 56;
    const bx0 = x0 + 28;
    const bar = (yy, frac, col, txt) => {
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx0, yy, barW, 8);
      ctx.fillStyle = col;
      ctx.fillRect(bx0, yy, barW * clamp(frac, 0, 1), 8);
      label(ctx, txt, bx0, yy - 3, col, { size: 10 });
    };
    bar(y0 + 14, t, C.named('purple'), '时钟自己的时间：1 格 = 光子上下一次');
    bar(y0 + 40, (t * g) % 1, C.accent, `实验室的时间：同样这一次，过了 ${fmt(g, 3)} 格`);
  }

  function drawMuon(ctx, C, x0, y0, w, h, g) {
    const pad = 26;
    const gy = y0 + h - 34;                 /* 地面 y */
    const ty = y0 + 52;                     /* 最高高度（20 km）的 y */
    const yOf = (km) => gy - (km / 20) * (gy - ty);
    const cx = x0 + w * 0.42;

    /* 大气柱 */
    ctx.fillStyle = C.soft;
    ctx.fillRect(cx - 12, ty, 24, gy - ty);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, gy + 0.5); ctx.lineTo(cx + 12, gy + 0.5);
    ctx.stroke();
    label(ctx, '地面', cx + 16, gy + 4, C.fg, { size: 10 });
    for (let km = 5; km <= 20; km += 5) {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(cx - 18, yOf(km) + 0.5); ctx.lineTo(cx - 12, yOf(km) + 0.5);
      ctx.stroke();
      label(ctx, `${km}`, cx - 20, yOf(km) + 4, C.axis, { size: 9, align: 'right' });
    }
    label(ctx, '高度 km', cx - 20, ty - 8, C.axis, { size: 9, align: 'right' });

    /* μ 子生成点 */
    const startY = yOf(hkm);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(cx, startY, 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, `生成：${fmt(hkm, 1)} km`, cx + 16, startY + 4, C.named('red'), { size: 10 });

    const v = mb * C_LIGHT;
    const labLife = g * TAU0;
    const dNo = v * TAU0 / 1000;      /* 无膨胀能走的 km */
    const dYes = v * labLife / 1000;  /* 有膨胀能走的 km */
    const decayKm = Math.max(hkm - dNo, 0);

    /* 红叉：不做时间膨胀会死在这里 */
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 2;
    const dy = yOf(clamp(decayKm, 0, 20));
    ctx.beginPath();
    ctx.moveTo(cx - 9, dy - 9); ctx.lineTo(cx + 9, dy + 9);
    ctx.moveTo(cx + 9, dy - 9); ctx.lineTo(cx - 9, dy + 9);
    ctx.stroke();
    if (decayKm > 0.05) {
      label(ctx, `无膨胀死在这（${fmt(dNo, 2)} km）`, cx + 16, dy + 4, C.bad, { size: 10 });
    }

    /* 绿箭头：有时间膨胀能走多远 */
    const dy2 = yOf(clamp(hkm - dYes, 0, 20));
    ctx.strokeStyle = C.ok;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, startY);
    ctx.lineTo(cx - 4, dy2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 8, dy2 - 6); ctx.lineTo(cx - 4, dy2); ctx.lineTo(cx, dy2 - 6);
    ctx.stroke();
    label(ctx, `有膨胀能走 ${fmt(dYes, 2)} km`, cx + 16, Math.max(dy2 + 4, ty + 14), C.ok, { size: 10 });

    /* μ 子本体：跟着进度往下掉 */
    const my = startY + (gy - startY) * anim2;
    ctx.fillStyle = C.named('blue');
    ctx.beginPath();
    ctx.arc(cx, my, 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'μ', cx - 14, my + 4, C.named('blue'), { size: 12, weight: 700, align: 'right' });

    /* 两个钟：μ 子自己的与实验室的读数（微秒） */
    const tLab = anim2 * (hkm * 1000 / v) / 1e-6;
    label(ctx, `自己的钟 τ = ${fmt(tLab / g, 2)} μs`, x0 + 6, y0 + h - 12, C.named('purple'),
      { size: 11 });
    label(ctx, `实验室钟 t = ${fmt(tLab, 2)} μs`, x0 + 6, y0 + h + 4, C.fg, { size: 11 });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    clearBg(ctx, W, H, C);

    const g = g1();
    const gm2 = gm();
    const half = Math.round(W * 0.5);
    /* 分隔线 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(half + 0.5, 10); ctx.lineTo(half + 0.5, H - 10);
    ctx.stroke();

    label(ctx, `① 光钟（β = ${fmt(beta, 3)}，γ = ${fmt(g, 3)}）`, 10, 20, C.fg,
      { size: 12, weight: 700 });
    drawClock(ctx, C, 6, 26, half - 16, H - 64, g);

    label(ctx, `② μ 子（β = ${fmt(mb, 4)}，γ = ${fmt(gm2, 2)}）`, half + 12, 20, C.fg,
      { size: 12, weight: 700 });
    drawMuon(ctx, C, half + 8, 26, W - half - 16, H - 74, gm2);

    const v = mb * C_LIGHT;
    const dNo = v * TAU0 / 1000;
    const dYes = v * gm2 * TAU0 / 1000;
    ro.set('光钟', `实验室时间 / 时钟时间 = γ = ${fmt(g, 3)}`);
    ro.set('μ子', `γ = ${fmt(gm2, 2)}，固有寿命 ${fmt(TAU0 * 1e6, 1)} μs → 实验室 ${fmt(gm2 * TAU0 * 1e6, 2)} μs`);
    ro.set('能走多远', `无膨胀 ${fmt(dNo, 3)} km / 有膨胀 ${fmt(dYes, 2)} km（生成高度 ${fmt(hkm, 1)} km）`);
    ro.set('结局', dYes >= hkm ? `到达地面（余量 ${fmt(dYes - hkm, 2)} km）` : `半路衰变，差 ${fmt(hkm - dYes, 2)} km`);
  }

  bindPointer(cv.canvas, {
    pick(x) { return x < cv.W / 2 ? 'clock' : 'muon'; },
    down(id) {
      if (id === 'clock') anim1 = 0;
      else anim2 = 0;
      draw();
    },
    /* 左栏横向拖 = 手动拖光子的位置；右栏纵向拖 = 手动拖 μ 子下落 */
    move(id, x, y) {
      if (id === 'clock') anim1 = clamp((x - 20) / Math.max(cv.W / 2 - 46, 1), 0, 1);
      else anim2 = clamp((y - 26) / Math.max(cv.H - 100, 1), 0, 1);
      draw();
    },
  });
  cv.canvas.style.cursor = 'grab';

  let controls = null;
  controls = anim(host, {
    onTick(dt) {
      anim1 = (anim1 + dt / RING) % 1;
      anim2 += dt / 2.6;
      if (anim2 >= 1) { anim2 = 1; controls.stop(); }
      draw();
    },
    onReset() { anim1 = 0; anim2 = 0; draw(); },
  });

  const sl = buildSliders({
    sliders: [
      pickSlider(spec, 'beta', { name: 'beta', label: '光钟速度 β', min: 0, max: 0.95, step: 0.01, value: beta }),
      pickSlider(spec, 'muonBeta', { name: 'muonBeta', label: 'μ 子速度 β', min: 0.9, max: 0.9999, step: 0.0001, value: mb }),
      pickSlider(spec, 'h', { name: 'h', label: '生成高度 km', min: 1, max: 20, step: 0.5, value: hkm }),
    ],
  }, (st) => {
    beta = clamp(st.beta ?? beta, 0, 0.95);
    mb = clamp(st.muonBeta ?? mb, 0.9, 0.9999);
    hkm = clamp(st.h ?? hkm, 1, 20);
    anim1 = 0; anim2 = 0;
    draw();
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box, destroy() { controls.stop(); } };
}
