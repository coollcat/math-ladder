/* =========================================================================
 * lab 组件：gridworld-value-lab —— 价值怎么从终点「渗」回每一个格子
 * -------------------------------------------------------------------------
 * 用法（第 50 章 Bellman 期望 / 最优 / 价值迭代三课共用，用 mode 切换）：
 *
 *   { "type": "gridworld-value-lab", "title": "价值回传波纹", "mode": "expectation" }
 *
 * 字段（都可省）：
 *   mode    "expectation"（固定策略，对随机性取期望）
 *           "optimality" （每格对动作取 max）
 *           "vi"         （价值迭代：同步扫描 + 误差上界）默认
 *   gamma   折扣因子 0.5..0.99，默认 0.9
 *   slip    滑倒概率 0..0.5，默认 0.2（另外 1-slip 的概率走预定方向）
 *   rows / cols / walls / start / goal 网格与地图，默认 4×4 + 两堵墙
 *   maxSweeps 播放上限，默认 40
 *   height  画布高度，默认 520
 *
 * 三种模式的同一个骨架：网格世界，终点给 r=1、其余 0，V(终点)=0。
 *   · 每一轮备份按「从终点向外」的波纹顺序落格：先给格子换上新值，再画
 *     几条从下一状态流回来的小点（点的粗细 = 转移概率）。
 *   · 期望模式：策略 π 固定（默认沿 BFS 最短路的箭头），只对环境的滑倒
 *     取期望；最优 / 迭代模式：每个动作算一遍再取 max，被选中的分支亮绿。
 *   · 策略箭头直接画在格子里：最优模式每轮扫完会重画——价值一变，箭头就变。
 *   · 单步 = 一轮同步扫描（有波纹动画）；播放 = 连续扫到上限或收敛；
 *     读数给出 Δ_k、误差上界 γ/(1−γ)·Δ_k 和实际误差（对照内置不动点）。
 *
 * 取舍：
 *   - 真值（V* 或 V^π）在参数变化时用同一套 backup 迭代 400 轮离线算出，
 *     只用于「实际误差」读数；上界 γ/(1−γ)Δ 不依赖真值，学生自己也能算。
 *   - 减少动效：播放禁用、单步直接给终值（不跑波纹动画）。
 *   - 离屏自动停循环；全部控件走按钮，移动端不需要悬停。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, arrow, clamp, fmt, clearBg, onScreen,
} from '../core.js';

const MODES = [
  { id: 'expectation', label: '期望备份（π 固定）', hint: '固定策略：先按 π 选动作，再对环境的随机性取期望' },
  { id: 'optimality', label: '最优备份（max）', hint: 'max 只在动作上取；环境的随机性仍要平均' },
  { id: 'vi', label: '价值迭代（同步扫描）', hint: '同步扫描：整轮只读旧表 V_k，全部状态一起替换' },
];

const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];       /* 上 右 下 左 */
const DIR_GLYPH = ['↑', '→', '↓', '←'];

const BASE = [
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
  { name: 'slip', label: '滑倒概率', min: 0, max: 0.5, step: 0.05, value: 0.2 },
];

export default function render(host, spec) {
  const rows = clamp(spec.rows || 4, 3, 6);
  const cols = clamp(spec.cols || 4, 3, 6);
  const H = spec.height || 600;
  const goal = Array.isArray(spec.goal) ? spec.goal.slice() : [rows - 1, cols - 1];
  const start = Array.isArray(spec.start) ? spec.start.slice() : [0, 0];
  const walls = Array.isArray(spec.walls) ? spec.walls : [[1, 1], [2, 2]];
  const maxSweeps = clamp(spec.maxSweeps || 40, 4, 200);

  const N = rows * cols;
  const K = (r, c) => r * cols + c;
  const ROW = (k) => Math.floor(k / cols);
  const COL = (k) => k % cols;
  const goalK = K(goal[0], goal[1]);
  const isWall = new Array(N).fill(false);
  walls.forEach((w) => {
    if (Array.isArray(w) && w[0] >= 0 && w[0] < rows && w[1] >= 0 && w[1] < cols) {
      isWall[K(w[0], w[1])] = true;
    }
  });
  isWall[goalK] = false;
  isWall[K(start[0], start[1])] = false;

  let mode = MODES.some((m) => m.id === spec.mode) ? spec.mode : 'vi';
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);
  let slip = clamp(typeof spec.slip === 'number' ? spec.slip : 0.2, 0, 0.5);
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let V = new Float64Array(N);
  let Vfix = new Float64Array(N);
  let iter = 0;
  let delta = null;
  let prevDelta = null;
  let stopped = '';                    /* 停下来的一句话（上限 / 收敛） */
  let sweep = null;                    /* { prev, next, head, acc } */
  let ripples = [];
  let flash = new Float64Array(N);
  let lastState = -1;
  let lastInfo = null;                 /* 最近一次落格的账本快照 */
  let playing = false;
  let gapT = 0;

  /* ---- 动力学：预定方向 + 左右滑倒；撞墙/出界 = 原地 ---- */
  function stepOf(r, c, a) {
    const nr = r + DIRS[a][0];
    const nc = c + DIRS[a][1];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return K(r, c);
    if (isWall[K(nr, nc)]) return K(r, c);
    return K(nr, nc);
  }
  /* 合并后的转移：[(下一状态下标, 概率), …]，同格概率相加 */
  function transOf(r, c, a) {
    const splits = slip > 0
      ? [[a, 1 - slip], [(a + 3) % 4, slip / 2], [(a + 1) % 4, slip / 2]]
      : [[a, 1]];
    const acc = new Map();
    splits.forEach(([aa, p]) => {
      const k = stepOf(r, c, aa);
      acc.set(k, (acc.get(k) || 0) + p);
    });
    return [...acc.entries()];
  }
  const rewardOf = (k) => (k === goalK ? 1 : 0);

  function qOf(v, k, a) {
    let s = 0;
    transOf(ROW(k), COL(k), a).forEach(([nk, p]) => {
      s += p * (rewardOf(nk) + gamma * v[nk]);
    });
    return s;
  }

  /* ---- 固定策略（期望模式用）：从终点 BFS，每格朝更近的邻居走 ---- */
  const dist = new Int16Array(N).fill(-1);
  {
    dist[goalK] = 0;
    const q = [goalK];
    while (q.length) {
      const k = q.shift();
      DIRS.forEach(([dr, dc]) => {
        const nr = ROW(k) + dr;
        const nc = COL(k) + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
        const nk = K(nr, nc);
        if (isWall[nk] || dist[nk] !== -1) return;
        dist[nk] = dist[k] + 1;
        q.push(nk);
      });
    }
  }
  const policyFixed = new Int8Array(N).fill(1);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const k = K(r, c);
      if (isWall[k] || k === goalK) continue;
      let best = -1;
      DIRS.forEach(([dr, dc], a) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
        const nk = K(nr, nc);
        if (isWall[nk] || dist[nk] === -1) return;
        if (dist[k] !== -1 && dist[nk] < dist[k] && (best === -1 || dist[nk] < dist[best])) best = nk;
      });
      if (best !== -1) {
        policyFixed[k] = DIRS.findIndex(([dr, dc]) => ROW(best) - r === dr && COL(best) - c === dc);
      }
    }
  }

  /* 波纹顺序：离终点越近越先更新（一次扫描的视觉方向 = 从终点向外扩散） */
  const order = [];
  for (let k = 0; k < N; k += 1) {
    if (!isWall[k] && k !== goalK) order.push(k);
  }
  order.sort((a, b) => ((dist[a] === -1 ? 1e9 : dist[a]) - (dist[b] === -1 ? 1e9 : dist[b])) || (a - b));

  /* ---- 一轮 backup（同步：整轮只读 vIn） ---- */
  function backupOnce(vIn) {
    const nv = Float64Array.from(vIn);
    for (let k = 0; k < N; k += 1) {
      if (isWall[k] || k === goalK) continue;
      if (mode === 'expectation') {
        nv[k] = qOf(vIn, k, policyFixed[k]);
      } else {
        let best = -Infinity;
        for (let a = 0; a < 4; a += 1) best = Math.max(best, qOf(vIn, k, a));
        nv[k] = best;
      }
    }
    nv[goalK] = 0;
    return nv;
  }
  /* 真值（V* 或 V^π）：同一套 backup 离线迭代到不动点，只用于「实际误差」 */
  function recomputeFix() {
    let v = new Float64Array(N);
    for (let i = 0; i < 400; i += 1) v = backupOnce(v);
    Vfix = v;
  }

  /* 当前使用的动作：期望模式 = 固定 π；最优模式 = 对旧表取 max 的那个 */
  function actionOf(vIn, k) {
    if (mode === 'expectation') return policyFixed[k];
    let best = -Infinity;
    let bestA = 1;
    for (let a = 0; a < 4; a += 1) {
      const q = qOf(vIn, k, a);
      if (q > best + 1e-12) { best = q; bestA = a; }
    }
    return bestA;
  }
  function policyGreedy(vIn) {
    const p = new Int8Array(N);
    for (let k = 0; k < N; k += 1) p[k] = actionOf(vIn, k);
    return p;
  }

  /* ---- DOM ---- */
  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (stx) => {
    gamma = stx.gamma;
    slip = stx.slip;
    hardReset();
  });
  const ro = buildReadout({
    轮数: '0',
    '本轮 Δ': '—',
    '误差上界 γ/(1−γ)·Δ': '—',
    '实际误差': '—',
    'Δ 比上一轮': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    MODES.map((m) => ({ label: m.label, value: m.id })),
    mode,
    (v) => { mode = v; hardReset(); },
  ));
  const bStep = mkBtn('单步 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bPlay, bReset));
  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '单步 = 一轮同步扫描（波纹从终点往外扩散）；播放 = 连续扫到收敛或上限。';
  host.appendChild(hint);

  /* ---- 循环：波纹 + 播放，无需求时不占用帧 ---- */
  let raf = null;
  let last = 0;
  let visible = true;
  const period = reduced ? 0 : 0.24;            /* 每个格子落格的间隔（秒） */
  const rippleLife = 0.5;

  function needLoop() {
    return playing || gapT > 0 || !!sweep || ripples.length > 0 || flash.some((v) => v > 0);
  }
  function ensureLoop() {
    if (raf == null && visible && host.isConnected && needLoop()) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    raf = null;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    advance(dt);
    draw();
    sync();
    if (needLoop()) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => { visible = v; if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else ensureLoop(); });

  /* ---- 一轮扫描的推进 ---- */
  function startSweep() {
    if (sweep) return;
    if (iter >= maxSweeps) { stopped = '已到 ' + maxSweeps + ' 轮上限，自动停下'; playing = false; syncPlayBtn(); return; }
    if (delta !== null && delta < 1e-9) { stopped = '已收敛（Δ < 1e-9）'; playing = false; syncPlayBtn(); return; }
    sweep = { prev: Float64Array.from(V), next: backupOnce(V), head: 0, acc: 0 };
    if (reduced) {
      for (let i = 0; i < order.length; i += 1) applyOne();
      finishSweep();
    }
    ensureLoop();
  }
  function applyOne() {
    const k = order[sweep.head];
    sweep.head += 1;
    V[k] = sweep.next[k];
    lastState = k;
    const a = actionOf(sweep.prev, k);
    const branches = transOf(ROW(k), COL(k), a).map(([nk, p]) => ({
      nk, p, nextV: sweep.prev[nk], reward: rewardOf(nk),
    })).sort((x, y) => y.p - x.p);
    lastInfo = {
      k,
      a,
      best: mode === 'expectation' ? null : DirBestLabel(sweep.prev, k, a),
      branches,
      before: sweep.prev[k],
      after: sweep.next[k],
    };
    /* 减少动效用户不跑波纹：只换数字 + 留一个静态的「最近落格」圈 */
    if (!reduced) {
      flash[k] = 1;
      branches.forEach((b) => {
        if (b.p < 0.02) return;
        ripples.push({ from: b.nk, to: k, p: b.p, age: 0 });
      });
    }
  }
  /* 最优模式：写一句「为什么选它」（最大 q 与次大的差） */
  function DirBestLabel(vIn, k, a) {
    let second = -Infinity;
    for (let aa = 0; aa < 4; aa += 1) {
      if (aa === a) continue;
      second = Math.max(second, qOf(vIn, k, aa));
    }
    const gap = qOf(vIn, k, a) - second;
    return 'max 选 ' + DIR_GLYPH[a] + '（领先次优 ' + fmt(gap, 2) + '）';
  }
  function finishSweep() {
    let d = 0;
    for (let i = 0; i < N; i += 1) d = Math.max(d, Math.abs(V[i] - sweep.prev[i]));
    prevDelta = delta;
    delta = d;
    iter += 1;
    sweep = null;
    if (playing) gapT = 0.45;
  }
  function advance(dt) {
    for (let i = 0; i < N; i += 1) if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 2.6);
    ripples.forEach((r) => { r.age += dt; });
    ripples = ripples.filter((r) => r.age < rippleLife);
    if (sweep) {
      sweep.acc += dt;
      while (sweep && sweep.acc >= period && sweep.head < order.length) {
        sweep.acc -= period;
        applyOne();
      }
      if (sweep && sweep.head >= order.length) finishSweep();
      return;
    }
    if (playing && gapT > 0) {
      gapT -= dt;
      if (gapT <= 0) { gapT = 0; startSweep(); }
    }
  }

  /* ---- 状态切换 ---- */
  function hardReset() {
    V = new Float64Array(N);
    iter = 0;
    delta = null;
    prevDelta = null;
    stopped = '';
    sweep = null;
    ripples = [];
    flash = new Float64Array(N);
    lastState = -1;
    lastInfo = null;
    gapT = 0;
    playing = false;
    syncPlayBtn();
    recomputeFix();
    sync();
    draw();
  }
  function syncPlayBtn() {
    bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
  }

  bStep.addEventListener('click', () => {
    playing = false;
    syncPlayBtn();
    stopped = '';
    startSweep();
    ensureLoop();
    /* 减少动效用户没有循环可跑，这里直接把新状态画出来 */
    draw();
    sync();
  });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    if (playing) { stopped = ''; gapT = 0; startSweep(); }
    syncPlayBtn();
    ensureLoop();
  });
  bReset.addEventListener('click', () => hardReset());

  /* ---- 读数 ---- */
  function sync() {
    ro.set('轮数', String(iter) + ' / ' + maxSweeps + (stopped ? '（' + stopped + '）' : ''));
    ro.set('本轮 Δ', delta === null ? '—' : fmt(delta, 4));
    ro.set('误差上界 γ/(1−γ)·Δ', delta === null ? '—' : fmt((gamma / (1 - gamma)) * delta, 4));
    let err = 0;
    for (let i = 0; i < N; i += 1) err = Math.max(err, Math.abs(V[i] - Vfix[i]));
    ro.set('实际误差', iter === 0 ? '—' : fmt(err, 4) + (mode === 'expectation' ? '（对照 V^π）' : '（对照 V*）'));
    ro.set('Δ 比上一轮', (prevDelta === null || delta === null || prevDelta === 0)
      ? '—' : fmt(delta / prevDelta, 3) + '（≤ γ 一定成立）');
  }

  /* ---- 绘制 ---- */
  const geo = { gx: 0, gy: 0, cell: 0, px: 0, py: 0, pw: 0, W: 0, H: 0, wide: true };
  function layout(W, Hh) {
    const pad = 12;
    geo.wide = W >= 640;
    const gridMax = geo.wide ? Math.min(W * 0.5, Hh - 150) : Math.min(W - pad * 2, 300);
    geo.cell = Math.floor(gridMax / cols);
    geo.gx = geo.wide ? pad + 4 : Math.max(pad, Math.round((W - geo.cell * cols) / 2));
    geo.gy = 40;
    geo.px = geo.wide ? geo.gx + geo.cell * cols + 18 : pad;
    geo.py = geo.wide ? 40 : geo.gy + geo.cell * rows + 12;
    geo.pw = geo.wide ? W - geo.px - pad : W - pad * 2;
    geo.W = W;
    geo.H = Hh;
  }
  const centerOf = (k) => ({
    x: geo.gx + COL(k) * geo.cell + geo.cell / 2,
    y: geo.gy + ROW(k) * geo.cell + geo.cell / 2,
  });

  function drawLedger(ctx, C, x, y) {
    label(ctx, '最近落格（账本）', x, y, C.axis, { size: 10.5, weight: 600 });
    if (!lastInfo) {
      label(ctx, '点「单步 ▶」或「播放」，看价值从终点回传。', x, y + 18, C.fg, { size: 11 });
      return;
    }
    const info = lastInfo;
    label(ctx, `s = (${ROW(info.k)},${COL(info.k)})　动作 ${DIR_GLYPH[info.a]}`
      + (info.best ? '　' + info.best : '　（固定策略 π）'),
    x, y + 18, C.fg, { size: 11, weight: 600 });
    info.branches.slice(0, 3).forEach((b, i) => {
      const yy = y + 36 + i * 15;
      label(ctx, `${fmt(b.p, 2)} → (${ROW(b.nk)},${COL(b.nk)})`, x, yy, C.fg, { size: 10.5 });
      label(ctx, `r=${b.reward}　γV=${fmt(gamma * b.nextV, 3)}　→ ${fmt(b.p * (b.reward + gamma * b.nextV), 3)}`,
        x + 96, yy, C.axis, { size: 10.5 });
    });
    const yy = y + 36 + Math.min(info.branches.length, 3) * 15 + 6;
    label(ctx, `V(${ROW(info.k)},${COL(info.k)})：${fmt(info.before, 3)} → ${fmt(info.after, 3)}`,
      x, yy, C.ok, { size: 11.5, weight: 700 });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);
    const md = MODES.find((m) => m.id === mode);

    label(ctx, md.label + '　γ = ' + fmt(gamma, 2) + '　滑倒 = ' + fmt(slip * 100, 0) + '%'
      + '　r(终点) = 1，V(终点) = 0', geo.gx, 22, C.fg, { size: 12, weight: 700 });

    /* 热力范围 */
    let vmin = Infinity;
    let vmax = -Infinity;
    for (let k = 0; k < N; k += 1) {
      if (isWall[k]) continue;
      vmin = Math.min(vmin, V[k]);
      vmax = Math.max(vmax, V[k]);
    }
    const span = Math.max(vmax - vmin, 1e-9);
    const policy = policyGreedy(V);

    /* 波纹底下的连线：从下一状态回到当前格 */
    ripples.forEach((r) => {
      if (r.from === r.to) return;
      const a = centerOf(r.from);
      const b = centerOf(r.to);
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - r.age / rippleLife);
      ctx.strokeStyle = mode === 'expectation' ? C.accent2 : C.ok;
      ctx.lineWidth = 1 + r.p * 3;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    });

    /* 网格 */
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const k = K(r, c);
        const x = geo.gx + c * geo.cell;
        const y = geo.gy + r * geo.cell;
        if (isWall[k]) {
          ctx.fillStyle = C.named('gray');
          ctx.globalAlpha = 0.8;
          ctx.fillRect(x, y, geo.cell, geo.cell);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = C.bg;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.75, y + 0.75, geo.cell - 1.5, geo.cell - 1.5);
          continue;
        }
        const t = (V[k] - vmin) / span;
        ctx.fillStyle = C.bg;
        ctx.fillRect(x, y, geo.cell, geo.cell);
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.10 + 0.52 * clamp(t, 0, 1);
        ctx.fillRect(x, y, geo.cell, geo.cell);
        ctx.globalAlpha = 1;
        if (flash[k] > 0) {
          ctx.fillStyle = C.ok;
          ctx.globalAlpha = 0.35 * flash[k];
          ctx.fillRect(x, y, geo.cell, geo.cell);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = k === lastState ? C.ok : C.grid;
        ctx.lineWidth = k === lastState ? 2 : 1;
        ctx.strokeRect(x + 0.5, y + 0.5, geo.cell - 1, geo.cell - 1);

        if (k === goalK) {
          ctx.save();
          ctx.strokeStyle = C.bad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + geo.cell / 2, y + geo.cell / 2, geo.cell * 0.22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          label(ctx, 'G', x + geo.cell / 2, y + geo.cell / 2 + geo.cell * 0.07, C.bad,
            { size: Math.min(16, geo.cell * 0.3), align: 'center', weight: 700 });
        } else {
          label(ctx, fmt(V[k], 2), x + geo.cell / 2, y + geo.cell * 0.38, C.fg,
            { size: Math.min(15, geo.cell * 0.28), align: 'center', weight: 600 });
        }
        if (r === start[0] && c === start[1]) {
          label(ctx, 'S', x + 4, y + 12, C.ok, { size: 10.5, weight: 700 });
        }
        /* 策略箭头（期望模式 = 固定 π；最优模式 = 当前 V 的贪心策略） */
        if (k !== goalK) {
          const a = mode === 'expectation' ? policyFixed[k] : policy[k];
          const [dr, dc] = DIRS[a];
          const cx = x + geo.cell / 2;
          const cy = y + geo.cell * 0.72;
          const L = geo.cell * 0.22;
          const broken = dist[k] === -1;
          arrow(ctx, cx - dc * L * 0.35, cy - dr * L * 0.35, cx + dc * L, cy + dr * L,
            broken ? C.axis : (mode === 'expectation' ? C.accent2 : C.ok), 2, 6);
        }
      }
    }

    /* 波纹上的小点 */
    ripples.forEach((r) => {
      const a = centerOf(r.from);
      const b = centerOf(r.to);
      const tt = clamp(r.age / rippleLife, 0, 1);
      const x = r.from === r.to ? a.x : a.x + (b.x - a.x) * tt;
      const y = r.from === r.to ? a.y : a.y + (b.y - a.y) * tt;
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - tt);
      ctx.fillStyle = mode === 'expectation' ? C.accent2 : C.ok;
      ctx.beginPath();
      ctx.arc(x, y, 2.4 + r.p * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (lastState >= 0 && V[lastState] !== undefined) {
      const p = centerOf(lastState);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = C.ok;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, geo.cell * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* 图例 + 账本 + 公式 + 上界 */
    const lx = geo.gx;
    const ly = geo.gy + geo.cell * rows + 18;
    if (geo.wide) {
      label(ctx, '数字 = V(s)　箭头 = 策略 π(s)　绿色圆环 = 最近回传的格', lx, ly, C.axis, { size: 10.5 });
    } else {
      label(ctx, '数字 = V(s)　箭头 = 策略 π(s)', lx, ly, C.axis, { size: 10.5 });
      label(ctx, '绿色圆环 = 最近回传的格', lx, ly + 15, C.axis, { size: 10.5 });
    }

    const px = geo.px;
    let py = geo.py;
    const pw = geo.pw;
    if (geo.wide) {
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(px - 4, py - 12, pw + 8, Math.min(geo.H - py, 300));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(px - 4.5, py - 12.5, pw + 9, Math.min(geo.H - py, 300));
      ctx.restore();
      drawLedger(ctx, C, px + 4, py + 4);
      py += 150;
    } else {
      py = ly + 32;
      drawLedger(ctx, C, px, py);
      py += 132;
    }
    const formula = mode === 'expectation'
      ? ['V(s) ← Σ_a π(a|s) Σ_s′ P(s′|s,a)[r + γV(s′)]', md.hint]
      : (mode === 'optimality'
        ? ['V(s) ← max_a Σ_s′ P(s′|s,a)[r + γV(s′)]', md.hint]
        : ['V_{k+1}(s) ← max_a Σ_s′ P(s′|s,a)[r + γV_k(s′)]', md.hint]);
    label(ctx, formula[0], px, py, C.fg, { size: 11.5, weight: 600 });
    label(ctx, formula[1], px, py + 15, C.axis, { size: 10.5 });
    const bound = delta === null ? null : (gamma / (1 - gamma)) * delta;
    label(ctx, '误差上界：‖V_k − ' + (mode === 'expectation' ? 'V^π' : 'V*') + '‖∞ ≤ γ/(1−γ)·Δ_k'
      + (bound === null ? '' : ' = ' + fmt(bound, 3) + '（当前 γ=' + fmt(gamma, 2) + '）'),
    px, py + 36, C.named('purple'), { size: 10.5, weight: 600 });
    label(ctx, 'Δ_k ≤ γ·Δ_{k−1}：每轮最多变成上一轮的 γ 倍——这就是压缩映射。', px, py + 51, C.axis, { size: 10.5 });
  }

  /* 收尾：初始化 + 主题重绘 */
  recomputeFix();
  sync();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() {
      playing = false;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      cv.redraw = null;
    },
  };
}
