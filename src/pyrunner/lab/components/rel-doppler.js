/* =========================================================================
 * lab 组件：rel-doppler —— 拖 β 与视角：谱线怎么红移、怎么蓝移
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-doppler", "title": "拖着速度箭头转一圈，看谱线搬家", "beta": 0.6, "theta": 0 }
 *   ```
 *
 * 字段：
 *   beta   光源速度（单位 c），0..0.99，默认 0.6
 *   theta  速度方向与"光源 → 观察者"连线的夹角（度），-180..180，默认 0（迎面而来）
 *
 * 能拖什么：
 *   ① 上半幅里的速度箭头 —— 绕着光源转，θ 想拖到哪就拖到哪；
 *   ② β 滑块。下半幅的谱线会立刻跟着搬家。
 *
 * 看什么：
 *   虚线是实验室里静止光源的四条氢巴尔末线（410 / 434 / 486 / 656 nm），
 *   实线是运动光源的同一组线。θ = 0 迎面而来 → 整体左移（蓝移）；
 *   θ = 180° 转身而去 → 右移（红移）；θ = 90° 正横着掠过 → 仍然红移，
 *   倍数恰好是 1/γ —— 这是"时间膨胀"唯一能露脸的地方，没有它这一格无法解释。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  polyline, label, fmt, clamp,
} from '../core.js';

const LINES = [410.2, 434.0, 486.1, 656.3];  /* 氢原子巴尔末线（nm） */
const LAM0 = 656.3;                          /* 高亮追踪的那条：Hα */
const LAM_MIN = 260;
const LAM_MAX = 1000;

function pickSlider(spec, name, def) {
  const s = (spec.sliders || []).find((it) => it && it.name === name);
  return s ? { name, label: s.label || def.label, min: s.min, max: s.max, step: s.step, value: s.value } : def;
}

export default function render(host, spec) {
  let beta = clamp(Number(spec.beta ?? 0.6), 0, 0.99);
  let theta = clamp(Number(spec.theta ?? 0), -180, 180);

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({ 视角: '—', 多普勒因子: '—', Hα谱线: '—', 光行差: '—' });
  host.appendChild(ro.box);

  const geo = { sx: 0, sy: 0, ox: 0, oy: 0, lx0: 0, lx1: 0, ly: 0 };
  const gam = () => 1 / Math.sqrt(1 - beta * beta);
  /* 多普勒因子：θ 从"光源 → 观察者"方向量起 */
  const factor = () => 1 / (gam() * (1 - beta * Math.cos((theta * Math.PI) / 180)));
  const XL = (lam) => geo.lx0 + ((lam - LAM_MIN) / (LAM_MAX - LAM_MIN)) * (geo.lx1 - geo.lx0);

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const g = gam();
    const D = factor();
    const rad = (theta * Math.PI) / 180;

    /* ---- 上半幅：光源、观察者、速度箭头 ---- */
    geo.ox = 62;
    geo.oy = 148;
    geo.sx = W - 78;
    geo.sy = 118;

    /* 视线 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(geo.ox, geo.oy);
    ctx.lineTo(geo.sx, geo.sy);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '视线', (geo.ox + geo.sx) / 2, (geo.oy + geo.sy) / 2 - 8, C.axis, { size: 10 });

    /* θ 的角弧 */
    const R = 62;
    const a0 = Math.PI;            /* 屏幕坐标系里"指向观察者"= 左 = π */
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(geo.sx, geo.sy, R, Math.min(a0, a0 - rad), Math.max(a0, a0 - rad));
    ctx.stroke();
    label(ctx, `θ = ${fmt(theta, 0)}°`, geo.sx - R * 0.86, geo.sy + (theta >= 0 ? 20 : -14),
      C.accent2, { size: 12, weight: 700 });

    /* 速度箭头（屏幕方向：θ=0 → 朝左指向观察者） */
    const ux = -Math.cos(rad), uy = -Math.sin(rad);
    const ax = geo.sx + ux * 96, ay = geo.sy + uy * 96;
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(geo.sx, geo.sy);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - ux * 12 + uy * 7, ay - uy * 12 - ux * 7);
    ctx.lineTo(ax - ux * 12 - uy * 7, ay - uy * 12 + ux * 7);
    ctx.closePath();
    ctx.fillStyle = C.named('red');
    ctx.fill();
    label(ctx, `v = ${fmt(beta, 2)}c`, ax + ux * 12, ay + uy * 12 + 4, C.named('red'),
      { size: 11, weight: 600 });

    /* 光源与观察者 */
    ctx.beginPath();
    ctx.arc(geo.sx, geo.sy, 10, 0, Math.PI * 2);
    ctx.fillStyle = C.named('amber');
    ctx.fill();
    label(ctx, '光源', geo.sx + 14, geo.sy - 12, C.fg, { size: 11, weight: 600 });
    ctx.beginPath();
    ctx.arc(geo.ox, geo.oy, 9, 0, Math.PI * 2);
    ctx.fillStyle = C.accent;
    ctx.fill();
    label(ctx, '观察者', geo.ox - 12, geo.oy + 4, C.fg, { size: 11, align: 'right', weight: 600 });
    label(ctx, '拖动红色箭头：θ 从 0°（迎面）转到 180°（远离）', 12, 20, C.accent, { size: 11 });

    /* ---- 下半幅：谱线 ---- */
    geo.lx0 = 54;
    geo.lx1 = W - 26;
    geo.ly = 300;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(geo.lx0, geo.ly + 0.5);
    ctx.lineTo(geo.lx1, geo.ly + 0.5);
    ctx.stroke();
    for (let lam = 300; lam <= LAM_MAX; lam += 100) {
      const px = XL(lam);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, geo.ly - 4);
      ctx.lineTo(px + 0.5, geo.ly + 4);
      ctx.stroke();
      label(ctx, `${lam}`, px, geo.ly + 18, C.axis, { size: 9, align: 'center' });
    }
    label(ctx, '波长（nm）', geo.lx1, geo.ly + 34, C.axis, { size: 10, align: 'right' });

    const hl = (lam, obs) => {
      const x1 = XL(lam);
      const x2 = clamp(obs, LAM_MIN, LAM_MAX);
      /* 原位置（虚线） */
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1 + 0.5, geo.ly - 66);
      ctx.lineTo(x1 + 0.5, geo.ly - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      /* 观测位置（实线） */
      const off = obs < LAM_MIN || obs > LAM_MAX;
      ctx.strokeStyle = off ? C.bad : lam === LAM0 ? C.named('red') : C.ok;
      ctx.lineWidth = lam === LAM0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x2 + 0.5, geo.ly - 66);
      ctx.lineTo(x2 + 0.5, geo.ly - 4);
      ctx.stroke();
      /* 一条连接箭头，说明它搬了多远 */
      if (Math.abs(x2 - x1) > 1.5) {
        polyline(ctx, [[x1, geo.ly - 72], [x2, geo.ly - 72]], C.grid, 1.4);
      }
      label(ctx, fmt(obs, 1), x2, geo.ly - 76, lam === LAM0 ? C.named('red') : C.ok,
        { size: 10, align: 'center' });
      if (off) {
        label(ctx, obs < LAM_MIN ? '← 移出左边' : '移出右边 →', x2, geo.ly - 92,
          C.bad, { size: 10, align: 'center' });
      }
    };
    LINES.forEach((lam) => hl(lam, lam / D));

    label(ctx, '虚线 = 静止时的谱线，实线 = 运动光源的谱线', 12, geo.ly - 104, C.fg,
      { size: 11, weight: 600 });
    label(ctx, D > 1 ? '谱线整体左移：蓝移（迎面而来）'
      : Math.abs(theta) === 90 ? '谱线右移：横向多普勒，纯时间膨胀'
        : '谱线整体右移：红移（转身而去）',
    12, geo.ly + 46, D > 1 ? C.accent : C.bad, { size: 11, weight: 600 });

    /* ---- 读数 ---- */
    const lamObs = LAM0 / D;
    ro.set('视角', `θ = ${fmt(theta, 0)}°（0° = 正对观察者冲过来）`);
    ro.set('多普勒因子', `D = 1/(γ(1 − βcosθ)) = ${fmt(D, 4)}`);
    ro.set('Hα谱线', `656.3 nm → ${fmt(lamObs, 2)} nm（${D > 1 ? '蓝移' : D < 1 ? '红移' : '不动'}，波长${D > 1 ? '缩短' : '拉长'} ${fmt(Math.abs(lamObs - LAM0), 1)} nm）`);
    ro.set('光行差', `源系的前半束光被挤进半角 arccos β = ${fmt((Math.acos(beta) * 180) / Math.PI, 2)}°`);
  }

  bindPointer(cv.canvas, {
    pick(x, y) { return y < 230 ? 'theta' : null; },
    move(id, x, y) {
      const wx = x - geo.sx, wy = y - geo.sy;
      if (Math.hypot(wx, wy) < 8) return;
      theta = clamp(Math.round((Math.atan2(-wy, -wx) * 180) / Math.PI), -180, 180);
      draw();
    },
  });
  cv.canvas.style.cursor = 'grab';

  const sl = buildSliders({
    sliders: [pickSlider(spec, 'beta', {
      name: 'beta', label: '光源速度 β', min: 0, max: 0.99, step: 0.01, value: beta,
    })],
  }, (st) => {
    beta = clamp(st.beta ?? beta, 0, 0.99);
    draw();
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
