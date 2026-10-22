/* =========================================================================
 * lab 组件：stoch-martingale-book —— 鞅：公平赌局的三本账（第 37 章 · 90 课）
 * -------------------------------------------------------------------------
 * 演示什么：同一次掷硬币（同一串随机数），三种赌法同时记账：
 *   公平局     每局 ±1，条件期望恰好等于当前身家 → 鞅
 *   庄家抽水   赢时只拿 +0.95，输时照付 −1 → 上鞅（账本每期往下漏一点）
 *   倍投法     输了翻倍下注，赢了回到 1（Martingale 追损法）
 * 三条身家曲线叠在同一张图上，另有一条红线画「全体玩家的平均身家」。
 * 最反直觉的一幕是倍投法：它的个体曲线几乎一路上升，看起来稳赚——但平均线
 * 还是平的，而且它的波动幅度大得离谱：把「用更大的波动换更小的破产概率」
 * 这件事摆到明面上。**鞅说的是期望，不是运气。**
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "stoch-martingale-book",
 *     "title": "同一次掷硬币，三本账：公平局 / 抽水局 / 倍投法",
 *     "players": 6,
 *     "steps": 120 }
 *
 * 字段（都可省）：
 *   players  玩家数，默认 6（2..12）：平均线需要好几位玩家才看得出「冻结」
 *   steps    每人的局数，默认 120（20..400）
 *   seed     随机种子，默认 7
 *   height   画布高度，默认 500
 *
 * 能玩什么：
 *   - 「单步」推进一局（四条线同时更新）；「回退」退回上一局
 *   - 切「账本视图」：身家曲线 / 单局盈亏直方（看 ±1 与 +0.95/−1 的不对称）
 *   - 拖「玩家数」：人越多，平均线越贴平，但个体终点依旧四散
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, polyline, fmt,
  buildSliders, buildToolbar, buildReadout, buildSegmented, anim, mkBtn, mergeSpec,
  mulberry32,
} from '../core.js';

const BASE_SLIDERS = [
  { name: 'players', label: '玩家数', min: 2, max: 12, step: 1, value: 6 },
  { name: 'steps', label: '每人局数', min: 20, max: 400, step: 10, value: 120 },
];

const START = 100;
const RAKE = 0.95;    // 抽水局：赢时只结算 95%

/* 一次性算好所有轨迹：同一串硬币结果喂给三种赌法 */
function simulate(players, steps, seed) {
  const rnd = mulberry32(seed * 31337 + 11);

  const fair = [];      // 每条：玩家 -> 每局后的身家
  const raked = [];
  const chase = [];
  const chaseBet = [];  // 倍投法的下注额轨迹（观察它怎么指数冲锋）

  for (let k = 0; k < players; k += 1) {
    const a = [START];
    const b = [START];
    const c = [START];
    const bets = [1];
    let w = START;
    let r = START;
    let v = START;
    let bet = 1;
    for (let t = 0; t < steps; t += 1) {
      /* 每位玩家各自掷自己的硬币：共用一串会让所有曲线完全重合，
         「平均线贴平、个体四散」这一幕就演不出来了 */
      const win = rnd() < 0.5;
      w += win ? 1 : -1;
      r += win ? RAKE : -1;
      /* 倍投：输了下注翻倍，赢了回到 1 */
      if (v - bet >= 0) {
        v += win ? bet : -bet;
        bet = win ? 1 : Math.min(bet * 2, 64);
      } else {
        /* 押不起就只押得起多少押多少（现实里就是破产边缘） */
        bet = Math.max(1, Math.floor(v));
        v += win ? bet : -bet;
        bet = win ? 1 : Math.min(bet * 2, 64);
      }
      a.push(w);
      b.push(r);
      c.push(v);
      bets.push(bet);
    }
    fair.push(a);
    raked.push(b);
    chase.push(c);
    chaseBet.push(bets);
  }
  return { fair, raked, chase, chaseBet };
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 340, 800) : 500;
  let players = Number.isFinite(spec.players) ? clamp(Math.round(spec.players), 2, 12) : 6;
  let steps = Number.isFinite(spec.steps) ? clamp(Math.round(spec.steps), 20, 400) : 120;
  let seed = 7;
  let view = 'paths';
  let t = 0;
  let sim = simulate(players, steps, seed);

  const ro = buildReadout({
    '平均身家（公平局）': '—',
    '平均身家（抽水局）': '—',
    '倍投法个体': '—',
    '鞅的性质': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (st) => {
    if (st.players !== undefined) players = Math.round(st.players);
    if (st.steps !== undefined) steps = Math.round(st.steps);
    sim = simulate(players, steps, seed);
    t = 0;
    draw();
  });

  host.appendChild(buildSegmented(
    [
      { label: '身家曲线', value: 'paths' },
      { label: '单局盈亏分布', value: 'diff' },
    ],
    'paths',
    (v) => { view = v; draw(); },
  ));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    geo.narrow = W < 620;
    geo.x = 52;
    geo.y = 46;
    geo.w = W - 76;
    geo.h = Hh - 150;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    if (view === 'paths') drawPaths(ctx, C);
    else drawDiff(ctx, C);

    label(ctx, '同一次掷硬币喂给三种赌法：蓝色多条 = 每位玩家的公平局身家，'
      + '橙线 = 抽水局，紫线 = 倍投法，红线 = 公平局的全体平均',
      geo.x - 40, cv.H - 24, C.grid, { size: 10 });
    label(ctx, '鞅 = 条件期望等于当前值：平均值钉在原地，个体却可以四处乱飞',
      geo.x - 40, cv.H - 8, C.grid, { size: 10 });

    const avgOf = (arr) => {
      let s = 0;
      for (let k = 0; k < arr.length; k += 1) s += arr[k][t];
      return s / arr.length;
    };
    const aFair = avgOf(sim.fair);
    const aRake = avgOf(sim.raked);
    const aChase = avgOf(sim.chase);
    ro.set('平均身家（公平局）', fmt(aFair, 2) + '（起点 ' + START + '，理论恒为 ' + START + '）');
    ro.set('平均身家（抽水局）', fmt(aRake, 2) + '　每局期望 −'
      + fmt((1 - RAKE) / 2, 3) + '　经过 ' + t + ' 局约 −' + fmt(t * (1 - RAKE) / 2, 1));
    ro.set('倍投法个体', '共 ' + players + ' 人，此刻最高 ' + fmt(Math.max(...sim.chase.map((r) => r[t])), 0)
      + '，最低 ' + fmt(Math.min(...sim.chase.map((r) => r[t])), 0)
      + '　平均 ' + fmt(aChase, 2));
    ro.set('鞅的性质', t === 0 ? '还没开局'
      : '公平局平均偏离起点 ' + fmt(Math.abs(aFair - START), 2)
        + '　（波动 ≈ ±' + fmt(Math.sqrt(t / players), 2) + ' 量级）');
  }

  function drawPaths(ctx, C) {
    const all = [];
    sim.fair.forEach((r) => { for (let i = 0; i <= t; i += 1) all.push(r[i]); });
    sim.raked.forEach((r) => { for (let i = 0; i <= t; i += 1) all.push(r[i]); });
    sim.chase.forEach((r) => { for (let i = 0; i <= t; i += 1) all.push(r[i]); });
    let lo = Math.min(...all, START);
    let hi = Math.max(...all, START);
    const pad = Math.max((hi - lo) * 0.08, 2);
    lo -= pad;
    hi += pad;
    const px = (i) => geo.x + (i / Math.max(t, 1)) * geo.w;
    const py = (v) => geo.y + geo.h - ((v - lo) / (hi - lo)) * geo.h;

    /* 起点参考线 */
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geo.x, py(START) + 0.5);
    ctx.lineTo(geo.x + geo.w, py(START) + 0.5);
    ctx.stroke();
    ctx.restore();
    label(ctx, '起点 ' + START, geo.x - 8, py(START) + 4, C.axis, { size: 9.5, align: 'right' });

    sim.fair.forEach((r) => {
      const pts = [];
      for (let i = 0; i <= t; i += 1) pts.push([px(i), py(r[i])]);
      polyline(ctx, pts, C.series(0), 1.1);
    });
    sim.raked.forEach((r) => {
      const pts = [];
      for (let i = 0; i <= t; i += 1) pts.push([px(i), py(r[i])]);
      polyline(ctx, pts, C.series(1), 0.9);
    });
    sim.chase.forEach((r) => {
      const pts = [];
      for (let i = 0; i <= t; i += 1) pts.push([px(i), py(r[i])]);
      polyline(ctx, pts, C.series(4), 1.3);
    });

    /* 公平局平均线 */
    const avg = [];
    for (let i = 0; i <= t; i += 1) {
      let s = 0;
      sim.fair.forEach((r) => { s += r[i]; });
      avg.push([px(i), py(s / sim.fair.length)]);
    }
    if (avg.length > 1) polyline(ctx, avg, C.named('red'), 2.6);

    /* 倍投法的下注额在副轴上画成柱（只画一位玩家），直观展示「指数冲锋」 */
    label(ctx, '倍投法的下注额（第 1 位玩家，纵轴为对数刻度）',
      geo.x, geo.y - 8, C.axis, { size: 9.5 });
    const bets = sim.chaseBet[0];
    const maxBet = Math.max(...bets.slice(0, t + 1), 1);
    const bx = (i) => geo.x + (i / Math.max(t, 1)) * geo.w;
    for (let i = 1; i <= t; i += Math.max(1, Math.floor(t / 50))) {
      const hh = (Math.log2(bets[i]) / Math.max(Math.log2(maxBet), 1)) * 26;
      ctx.save();
      ctx.fillStyle = C.series(4);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(bx(i), geo.y + geo.h + 22 - hh, Math.max(geo.w / Math.max(t, 1) * 0.8, 1), hh);
      ctx.restore();
    }
    label(ctx, '下注额 ≤ ' + maxBet, geo.x + geo.w, geo.y + geo.h + 34, C.series(4),
      { size: 9.5, align: 'right' });
  }

  function drawDiff(ctx, C) {
    /* 单局盈亏直方：公平局 ±1 等概率，抽水局 +0.95 / −1 —— 不对称在这里现形 */
    const binsF = { '-1': 0, '+1': 0 };
    const binsR = { '-1': 0, '+0.95': 0 };
    sim.fair.forEach((r) => {
      for (let i = 1; i <= Math.min(t, r.length - 1); i += 1) {
        const d = +(r[i] - r[i - 1]).toFixed(2);
        if (d > 0) binsF['+1'] += 1; else binsF['-1'] += 1;
      }
    });
    sim.raked.forEach((r) => {
      for (let i = 1; i <= Math.min(t, r.length - 1); i += 1) {
        const d = +(r[i] - r[i - 1]).toFixed(2);
        if (d > 0) binsR['+0.95'] += 1; else binsR['-1'] += 1;
      }
    });
    const groups = [
      { name: '公平局', bins: binsF, color: 0 },
      { name: '抽水局', bins: binsR, color: 1 },
    ];
    const maxV = Math.max(...Object.values(binsF), ...Object.values(binsR), 1);
    const base = geo.y + geo.h;
    let gi = 0;
    groups.forEach((g) => {
      const keys = Object.keys(g.bins);
      keys.forEach((k, j) => {
        const bx = geo.x + (gi * 2 + j) * (geo.w / (groups.length * 2 + 1)) + geo.w * 0.06;
        const bw = geo.w / (groups.length * 2 + 1.6);
        const hh = (g.bins[k] / maxV) * (geo.h - 40);
        ctx.save();
        ctx.fillStyle = C.series(g.color);
        ctx.globalAlpha = 0.82;
        ctx.fillRect(bx, base - hh, bw, hh);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.series(g.color);
        ctx.strokeRect(bx + 0.5, base - hh + 0.5, bw - 1, hh - 1);
        ctx.restore();
        label(ctx, g.bins[k] + ' 次', bx + bw / 2, base - hh - 6, C.series(g.color),
          { size: 10, align: 'center', weight: 600 });
        label(ctx, k, bx + bw / 2, base + 16, C.fg, { size: 11, align: 'center', weight: 700 });
        label(ctx, g.name, bx + bw / 2, base + 32, C.axis, { size: 9.5, align: 'center' });
      });
      gi += 1;
    });
    label(ctx, '公平局的盈亏对称 ±1，均值 0；抽水局右侧只有 +0.95，均值 −0.025/局',
      geo.x, geo.y - 10, C.axis, { size: 10 });
    label(ctx, '这就是「上鞅」：不是某一局会输，而是每一局的期望都略低于当前身家',
      geo.x, geo.y + geo.h + 56, C.grid, { size: 10 });
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.18) return;
      acc = 0;
      t = t >= steps ? 0 : t + 1;
      draw();
    },
    onReset() { acc = 0; t = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    t = Math.min(t + 1, steps);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    t = Math.max(t - 1, 0);
    draw();
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); cv.redraw = null; } };
}
