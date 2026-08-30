/* 步进电机的细分驱动：整步是给两相轮流通方波，细分是把方波换成量化正弦，
   让转子每步只挪一点点。步距角小了，分辨率上去了，单步冲击和振动也跟着小了。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  polyline, label, fmt,
} from '../core.js';

const MICRO = [1, 2, 4, 8, 16];
const FULL_STEP_DEG = 1.8;                 // 1.8°／整步 → 200 步/转
const ELEC_PER_MECH = 360 / (FULL_STEP_DEG * 4); // 一个电周期 = 4 个整步

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    m: spec.m ?? 1,          // 细分数
    rate: spec.rate ?? 100,  // 指令步率（整步/秒）
  };
  let t = 0;
  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    步距角: '—', 分辨率: '—', 单步跳变: '—', 位置误差峰峰: '—', 振动指数: '—', 脉冲率: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '整步', value: '1' }, { label: '半步', value: '2' }, { label: '1/4', value: '4' },
      { label: '1/8', value: '8' }, { label: '1/16', value: '16' }],
    String(s.m),
    (v) => { s.m = parseInt(v, 10); draw(); },
  ));

  const stepDeg = () => FULL_STEP_DEG / s.m;        // 当前步距角（机械度）
  /* 指令电角度被量化到微步：这就是「阶梯」的来源 */
  const quantE = (thE) => {
    const q = 90 / s.m;                              // 每微步的电角度
    return Math.round(thE / q) * q;
  };

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const sd = stepDeg();

    /* ---- 上：两相电流（量化阶梯 vs 理想正弦），横轴一个电周期 ---- */
    const g1 = { x: 34, y: 26, w: W - 34 - 40, h: 118 };
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(g1.x, g1.y);
    ctx.lineTo(g1.x, g1.y + g1.h);
    ctx.lineTo(g1.x + g1.w, g1.y + g1.h);
    ctx.stroke();
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(g1.x, g1.y + g1.h / 2);
    ctx.lineTo(g1.x + g1.w, g1.y + g1.h / 2);
    ctx.stroke();
    const X1 = (d) => g1.x + (d / 360) * g1.w;
    const Y1 = (v) => g1.y + g1.h / 2 - v * (g1.h / 2) * 0.88;
    ['A', 'B'].forEach((ph, k) => {
      const ideal = [];
      const stair = [];
      for (let d = 0; d <= 360; d += 1) {
        const fn = k === 0 ? Math.sin : Math.cos;
        ideal.push([X1(d), Y1(fn((d * Math.PI) / 180))]);
        stair.push([X1(d), Y1(fn((quantE(d) * Math.PI) / 180))]);
      }
      polyline(ctx, ideal, C.grid, 1.2, [3, 3]);
      polyline(ctx, stair, C.series(k), 2.2);
      label(ctx, ph + ' 相', g1.x + g1.w + 6, g1.y + 12 + k * 16, C.series(k), { size: 10 });
    });
    label(ctx, '两相绕组电流（虚线=理想正弦，实线=细分量化）', g1.x, g1.y - 8, C.fg, { size: 10 });
    label(ctx, '一个电周期 = 4 个整步', g1.x + g1.w, g1.y + g1.h + 14, C.fg, { align: 'right', size: 9 });

    /* ---- 下：转子位置阶梯 vs 理想直线 ---- */
    const g2 = { x: 34, y: 186, w: W - 34 - 40, h: 96 };
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(g2.x, g2.y + g2.h);
    ctx.lineTo(g2.x + g2.w, g2.y + g2.h);
    ctx.stroke();
    const win = 4 / s.rate;                     // 窗口：4 个整步的时间
    const thetaNow = FULL_STEP_DEG * s.rate * t;
    const theta0 = thetaNow - FULL_STEP_DEG * 4;
    const X2 = (th) => g2.x + ((th - theta0) / (FULL_STEP_DEG * 4)) * g2.w;
    const Y2 = (th) => g2.y + g2.h - ((th - theta0) / (FULL_STEP_DEG * 4)) * g2.h * 0.92;
    /* 理想位置：斜线 */
    polyline(ctx, [[X2(theta0), Y2(theta0)], [X2(thetaNow), Y2(thetaNow)]], C.grid, 1.4, [3, 3]);
    /* 实际位置：阶梯 */
    const stair = [];
    const stepsShown = 4 * s.m;
    for (let i = 0; i <= stepsShown; i += 1) {
      const th = theta0 + (i / stepsShown) * FULL_STEP_DEG * 4;
      const q = Math.round(th / sd) * sd;
      stair.push([X2(th), Y2(q)]);
    }
    polyline(ctx, stair, C.accent, 2.2);
    label(ctx, '转子位置（阶梯）vs 指令位置（虚线）', g2.x, g2.y - 8, C.fg, { size: 10 });
    label(ctx, '↑ 每个台阶 = ' + fmt(sd, 3) + '°', g2.x + 4, g2.y + 12, C.accent, { size: 10 });

    /* ---- 右：各细分的单步跳变对比 ---- */
    const bx = W - 34;
    label(ctx, '单步跳变', bx - 12, 26, C.fg, { size: 9 });
    MICRO.forEach((m, i) => {
      const yy = 186 + i * 22;
      const frac = m === s.m ? 1 : Math.min(1, (FULL_STEP_DEG / m) / FULL_STEP_DEG * 1.0);
      const wmax = 30;
      ctx.fillStyle = C.grid;
      ctx.fillRect(bx, yy, wmax, 12);
      ctx.fillStyle = m === s.m ? C.accent : C.soft;
      ctx.fillRect(bx, yy, Math.max(2, wmax * frac), 12);
      label(ctx, '1/' + m, bx - 4, yy + 10, m === s.m ? C.accent : C.fg, { align: 'right', size: 9 });
    });

    /* 振动指数：单步跳变越小越平稳，用 1/跳变 归一到整步为 1 */
    ro.set('步距角', fmt(sd, 4) + '°（整步 ' + FULL_STEP_DEG + '°）');
    ro.set('分辨率', 200 * s.m + ' 步/转');
    ro.set('单步跳变', fmt(sd, 4) + '°');
    ro.set('位置误差峰峰', fmt(sd, 4) + '°（±' + fmt(sd / 2, 4) + '°）');
    ro.set('振动指数', fmt(sd / FULL_STEP_DEG * 100, 1) + ' %（整步=100%）');
    ro.set('脉冲率', fmt(s.rate * s.m, 0) + ' 脉冲/秒（步率 ' + fmt(s.rate, 0) + ' 整步/s）');
  }

  const controls = anim(host, {
    onTick(dt) {
      t += dt;
      draw();
    },
    onReset() { t = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rate', label: '指令步率（整步/秒）', min: 5, max: 400, step: 5, value: s.rate, fmt: 0 },
      ],
    },
    (v) => { s.rate = v.rate; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
