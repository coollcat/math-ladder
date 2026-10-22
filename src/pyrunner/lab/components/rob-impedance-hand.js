/* =========================================================================
 * rob-impedance-hand —— 阻抗控制的弹簧-阻尼手感台（第 65 章 · 力与阻抗控制）
 * -------------------------------------------------------------------------
 * 给机械臂末端接一根虚拟弹簧 + 一个虚拟阻尼器：
 *   F = m·ẍ + c·ẋ + k·(x − x₀)
 * 环境（或人手）以恒力 F_push 压过来，末端按这条律退让。
 *
 * 三件真实操作：
 *   ① 三个滑块调 k / c / m —— 同一台机械臂从「铁棒」变「铅笔」；
 *   ② 「推一把」按钮施加恒力，「松手」撤掉外力，看它弹回；
 *   ③ 分段按钮切换三种预设手感（打磨 / 压装 / 拖地），三种旋钮组合
 *      各配一句工程理由。
 *
 * 画布上同时在跑：上幅是位移 x(t) 的实时曲线（弹簧-阻尼阶跃响应），
 * 下幅是三根条形图实时显示这一瞬的弹簧项 k(x−x₀)、阻尼项 c·ẋ 与外力
 * 怎么分账。右侧读数是稳态退让量、超调百分比与调节时间。
 *
 * 数值积分用半隐式欧拉（先更新速度再更新位置），dt 固定 4 ms，
 * 所以「c 太小就自己弹钢琴」在画面上是真的会振起来。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 * 
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, mkBtn,
  buildSliders, buildToolbar, buildSegmented, buildReadout, clearBg,
  mergeSpec, onScreen, anim,
} from '../core.js';

const DT = 0.004;            /* 积分步长（秒）：4 ms，比控制周期还细一档 */
const F_PUSH = 5.0;          /* 环境施加的恒力（牛顿） */
const T_WINDOW = 3.0;        /* 时间窗口（秒） */

/* 三档预设，每档的 ζ = c/(2√(km)) 都算过：
   打磨 ζ≈1.90（过阻尼，慢慢趴回去、绝不颤）；压装 ζ≈1.11（过阻尼但硬得多，
   稳态只让 0.125 米）；拖地 ζ≈0.25（欠阻尼，会振一两下，但顺从快）。 */
const PRESETS = [
  { label: '打磨（软而黏）', k: 10, c: 12, why: '退让 0.5 米、ζ≈1.9 过阻尼——曲面贴合要的就是这份「让」且「不颤」' },
  { label: '压装（硬而稳）', k: 40, c: 14, why: '稳态只让 0.125 米、ζ≈1.1 仍不振荡——顶得住精密压装' },
  { label: '拖地（软而快）', k: 6, c: 1.2, why: '顺从快、ζ≈0.25 会振一两下——恒力作业的性价比档' },
];

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};

  let k = Number.isFinite(safe.k) ? clamp(safe.k, 1, 60) : 10;
  let c = Number.isFinite(safe.c) ? clamp(safe.c, 0.2, 20) : 6;
  let m = Number.isFinite(safe.m) ? clamp(safe.m, 0.2, 5) : 1;

  /* ---------- 仿真状态 ---------- */
  let x = 0;                 /* 末端位移（米） */
  let v = 0;                 /* 末端速度（米/秒） */
  let t = 0;                 /* 仿真时间（秒） */
  let pushing = false;       /* 环境是否在压 */
  let trail = [];            /* [t, x] 采样，用于画曲线 */
  let peak = 0;              /* 本轮回弹的最大位移，用来看超调 */

  function resetSim() {
    x = 0;
    v = 0;
    t = 0;
    trail = [];
    peak = 0;
  }

  function stepSim() {
    const ext = pushing ? F_PUSH : 0;
    const fImp = -k * x - c * v;          /* 弹簧回弹 + 阻尼消振 */
    const a = (ext + fImp) / Math.max(0.05, m);
    v += a * DT;
    x += v * DT;
    t += DT;
    peak = Math.max(peak, x);
    if (trail.length === 0 || t - trail[trail.length - 1][0] > 0.01) {
      trail.push([t, x]);
      while (trail.length && t - trail[0][0] > T_WINDOW) trail.shift();
    }
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    '刚度 k': '—',
    '阻尼 c': '—',
    '稳态退让': '—',
    '超调': '—',
    '结论': '—',});
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(PRESETS.map((p) => ({ label: p.label, value: p.label })),
    PRESETS[0].label, (val) => {
      const p = PRESETS.find((q) => q.label === val) || PRESETS[0];
      k = p.k;
      c = p.c;
      applySliders();
      resetSim();
      sync();
      draw();
    }));

  const base = [
    { name: 'k', label: '虚拟刚度 k（N/m）', min: 1, max: 60, step: 1, value: k, fmt: 0 },
    { name: 'c', label: '虚拟阻尼 c（N·s/m）', min: 0.2, max: 20, step: 0.2, value: c, fmt: 1 },
    { name: 'm', label: '虚拟质量 m（kg）', min: 0.2, max: 5, step: 0.2, value: m, fmt: 1 },
  ];
  const sliders = buildSliders({ sliders: mergeSpec(base, safe) }, () => {
    k = sliders.state.k;
    c = sliders.state.c;
    m = sliders.state.m;
    resetSim();
    sync();
    draw();
  });

  function applySliders() {
    const vals = [k, c, m];
    [0, 1, 2].forEach((i) => {
      const row = sliders.box.children[i];
      if (!row) return;
      const input = row.children[1];
      const val = row.children[2];
      if (input) input.value = String(vals[i]);
      if (val) val.textContent = i === 0 ? String(vals[i]) : vals[i].toFixed(1);
    });
    sliders.state.k = k;
    sliders.state.c = c;
    sliders.state.m = m;
  }

  const bPush = mkBtn('推一把（恒力 5 N）');
  const bRelease = mkBtn('松手');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bPush, bRelease, bReset));

  const cv = setupCanvas(host, 430);
  const geo = { W: 0, H: 0 };

  /* ---------- 绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    geo.W = W;
    geo.H = H;
    clearBg(ctx, W, H, C);

    /* --- 上幅：位移曲线 --- */
    const padL = 46;
    const padR = 16;
    const cy0 = 40;
    const cy1 = 190;
    label(ctx, '末端位移 x(t)：环境以 ' + F_PUSH + ' N 恒力压过来后，它按 F = mẍ + cẋ + k(x−x₀) 退让',
      10, 18, C.fg, { size: 11, weight: 700 });

    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, cy0);
    ctx.lineTo(padL, cy1);
    ctx.moveTo(padL, cy1);
    ctx.lineTo(W - padR, cy1);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'x (m)', padL - 8, cy0 + 6, C.axis, { size: 9.5, align: 'right' });
    label(ctx, 't (s)', W - padR, cy1 + 14, C.axis, { size: 9.5, align: 'right' });

    const xSteady = F_PUSH / Math.max(0.1, k);
    const xMax = Math.max(xSteady * 1.6, 0.35);
    const toX = (tt) => padL + (tt / T_WINDOW) * (W - padL - padR);
    const toY = (xx) => cy1 - clamp(xx / xMax, 0, 1.05) * (cy1 - cy0 - 8);

    /* 稳态参考线 */
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, toY(xSteady));
    ctx.lineTo(W - padR, toY(xSteady));
    ctx.stroke();
    ctx.restore();
    label(ctx, '稳态 ' + xSteady.toFixed(3) + ' m = F/k = ' + F_PUSH + '/' + Math.round(k),
      W - padR - 4, toY(xSteady) - 6, C.named('amber'), { size: 9.5, align: 'right' });

    /* 曲线 */
    if (trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = C.named('blue');
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach(([tt, xx], i) => {
        const px = toX(tt);
        const py = toY(xx);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
      const last = trail[trail.length - 1];
      ctx.save();
      ctx.fillStyle = C.named('blue');
      ctx.beginPath();
      ctx.arc(toX(last[0]), toY(last[1]), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* --- 下幅：力的分账条 --- */
    const by0 = 240;
    const ext = pushing ? F_PUSH : 0;
    const fSpring = k * x;
    const fDamp = c * v;
    const bars = [
      { name: '外力', val: ext, col: C.named('red'), note: '环境/人手压过来' },
      { name: '弹簧项 k(x−x₀)', val: fSpring, col: C.named('green'), note: '偏离参考的回弹' },
      { name: '阻尼项 c·ẋ', val: fDamp, col: C.named('purple'), note: '速度相关的黏滞' },
    ];
    const fMax = Math.max(1, ...[ext, Math.abs(fSpring), Math.abs(fDamp)]);
    label(ctx, '这一瞬的三笔账（牛顿）：合力 = 外力 − 弹簧项 − 阻尼项', 10, by0 - 12, C.fg,
      { size: 11, weight: 700 });
    bars.forEach((b, i) => {
      const y = by0 + 12 + i * 34;
      const bx = 116;
      const bw = W - bx - 100;
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, y, bw, 18);
      ctx.fillStyle = b.col;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(bx, y, bw * clamp(Math.abs(b.val) / fMax, 0, 1), 18);
      ctx.globalAlpha = 1;
      ctx.restore();
      label(ctx, b.name, bx - 8, y + 13, C.fg, { size: 10, align: 'right' });
      label(ctx, b.val.toFixed(2) + ' N', bx + bw + 8, y + 13, b.col, { size: 10, weight: 600 });
      label(ctx, b.note, bx, y + 30, C.axis, { size: 9 });
    });

    /* 手感判词 */
    const zeta = c / (2 * Math.sqrt(Math.max(0.01, k * m)));
    let feel;
    if (zeta < 0.45) feel = '欠阻尼：松手会来回振（ζ = ' + zeta.toFixed(2) + '）';
    else if (zeta < 0.9) feel = '接近临界：一两次轻微回摆就到位（ζ = ' + zeta.toFixed(2) + '）';
    else feel = '过阻尼：慢慢趴回去，不振荡（ζ = ' + zeta.toFixed(2) + '）';
    label(ctx, feel, 10, H - 30, C.accent, { size: 10.5, weight: 600 });
    label(ctx, '打磨选软而黏、压装选硬而稳——同一台机械臂，旋钮一拧性格全变。刚度是精度与安全的天平。',
      10, H - 12, C.axis, { size: 10 });
  }

  /* ---------- 读数 ---------- */

  function sync() {
    const xSteady = F_PUSH / Math.max(0.1, k);
    const zeta = c / (2 * Math.sqrt(Math.max(0.01, k * m)));
    const overshoot = zeta < 1
      ? Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100
      : 0;
    ro.set('刚度 k', k.toFixed(0) + ' N/m（稳态退让就由它一家决定）');
    ro.set('阻尼 c', c.toFixed(1) + ' N·s/m（ζ = ' + zeta.toFixed(2) + '）');
    ro.set('稳态退让', xSteady.toFixed(3) + ' m');
    ro.set('超调', zeta < 1 ? overshoot.toFixed(1) + ' %' : '0（不会越过稳态）');
    ro.set('结论', pushing
      ? (x > xSteady ? '正在退让，当前 ' + x.toFixed(3) + ' m' : '还在靠近稳态')
      : '松手后回到参考位；刚度决定它退多远，阻尼决定它晃不晃');
  }

  /* ---------- 交互 ---------- */

  /* resetSim 不动 pushing，所以「推一把」= 先清零再通电；
     「松手」= 撤掉外力、从稳态继续走回参考位（不清轨迹，能看见回弹）。 */
  bPush.addEventListener('click', () => {
    resetSim();
    pushing = true;
    playThrough(0.9);
    sync();
    draw();
  });
  bRelease.addEventListener('click', () => {
    pushing = false;
    playThrough(1.2);
    sync();
    draw();
  });

  /* 静态推进 n 秒：不依赖「播放」按钮，点一下就看得见响应曲线 */
  function playThrough(seconds) {
    const n = Math.round(seconds / DT);
    for (let i = 0; i < n; i += 1) stepSim();
  }
  bReset.addEventListener('click', () => {
    k = 10;
    c = 6;
    m = 1;
    pushing = false;
    applySliders();
    resetSim();
    sync();
    draw();
  });

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      /* 每帧最多补 6 个积分步，避免切回标签页时爆步 */
      let guard = 0;
      while (acc >= 0.033 && guard < 6) {
        stepSim();
        acc -= 0.033;
        guard += 1;
      }
      sync();
      draw();
    },
    onReset() {
      pushing = false;
      resetSim();
      sync();
      draw();
    },
  });

  onScreen(host, (v) => { if (!v) acc = 0; });

  resetSim();
  sync();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); cv.redraw = null; },
  };
}