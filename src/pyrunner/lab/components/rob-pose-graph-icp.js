/* =========================================================================
 * rob-pose-graph-icp —— 位姿图弹簧网 + ICP 三拍循环（第 65 章 · SLAM 后端）
 * -------------------------------------------------------------------------
 * mode="posegraph"（位姿图优化）
 *   一维走廊里 9 段、10 个位姿节点。里程计每条边说「前进 1.05 米」
 *   （5% 高估，航位推算末位漂到 9.45 米），回环边说「末位离起点 9 米」。
 *   两张账互相矛盾，最小二乘不偏袒谁：把所有边的残差平方和一起压小。
 *   法方程 H x = b 是稀疏三对角的，用高斯-赛德尔逐点扫——按一次
 *   「单步」扫一轮，看着整条链被回环边「拽」回去、9 段边逐渐缩成
 *   同一个长度。收敛目标有闭式解，画布上直接标出来供对照。
 *   注意：最小二乘**不会**把回环残差压到零，它只在两张账之间取加权折中。
 *
 * mode="icp"（迭代最近点）
 *   一帧"激光扫描"里三样真实结构：左墙、地脚线、桌上的方箱（共 50 点）。
 *   运动云是同一场景隔点采样 + 抖动 + 整体错位 (0.45, −0.30)——模拟下一帧：
 *   更稀、有噪声、还没对齐。三拍循环：配对（每点找目标云里最近的）、
 *   求解（平均错位）、套用（挪过去再看）。按「单步」走一拍，画布上用细线
 *   连出当前配对。平均错位 0.2535 → 0.1476 → 0.0677 → … → 0，
 *   六轮咬到万分之一以内；注意它不是等比收敛——配对一变，速度就换档。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "rob-pose-graph-icp", "mode": "posegraph" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp,
  buildSegmented, buildToolbar, buildReadout, mkBtn, clearBg, fmt,
} from '../core.js';

const N = 10;                 /* 节点数：一维走廊里走了 9 段 */
const ODOM_STEP = 1.05;      /* 里程计每条边的读数：5% 高估 */
const LOOP_SPAN = 9.0;       /* 回环边的读数：末位与起点相距 9 米 */
const LOOP_W = 20;           /* 回环边的信息权重（比相邻边硬得多） */
const GAUGE_W = 30;          /* 固定起点 x0 = 0 的定规权重，否则整体平移不唯一 */
const ITERS_MAX = 60;
const ICP_ROUNDS = 6;

/* 一帧"激光扫描"该长什么样：三样真实结构——
   左墙（竖）、地脚线（横）、桌角上的一个方箱。
   目标云就是这帧扫描；运动云是同一场景隔点采样 + 少量抖动 + 整体错位，
   模拟"下一帧扫描"：点更稀、有噪声、位姿还没对齐。 */
function buildScene() {
  const pts = [];
  for (let y = 0; y <= 4.001; y += 0.25) pts.push([0, y]);          /* 左墙 */
  for (let x = 0; x <= 4.001; x += 0.25) pts.push([x, 0]);          /* 地脚线 */
  for (let i = 0; i <= 3; i += 1) {                                  /* 方箱四边 */
    pts.push([2.4 + i * 0.2, 2.4]);
    pts.push([2.4, 2.4 + i * 0.2]);
    pts.push([3.0 - i * 0.2, 3.0]);
    pts.push([3.0, 3.0 - i * 0.2]);
  }
  return pts;
}
const TARGET = buildScene();

/* 固定种子的伪随机：同一个页面刷新多少次，图都一样 */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
const MOVING0 = (() => {
  const rnd = seeded(9);
  return TARGET.filter((_, i) => i % 2 === 0)
    .map(([x, y]) => [x + 0.45 + rnd() * 0.06, y - 0.30 + rnd() * 0.06]);
})();

function nearest(p, cloud) {
  let best = cloud[0];
  let bd = (p[0] - best[0]) ** 2 + (p[1] - best[1]) ** 2;
  for (let i = 1; i < cloud.length; i += 1) {
    const q = cloud[i];
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let mode = safe.mode === 'icp' ? 'icp' : 'posegraph';

  /* ---------- posegraph 状态 ---------- */
  let poses = null;          /* 当前位姿（米） */
  let iter = 0;

  /* 位姿图的最小二乘在这里被解成一张稀疏线性方程组：
       相邻边   r_k = (x_{k+1} − x_k) − 1.05，权重 1
       回环边   r_L = (x_{N−1} − x_0) − 9.0，权重 LOOP_W（信息矩阵的分量）
       定规     x_0 = 0，权重 GAUGE_W（否则整条轨迹可以整体平移）
     法方程 H x = b 是对称稀疏的，这里用高斯-赛德尔逐点扫：
     每扫一轮 = 「单步」按一次，误差在相邻节点之间来回搬，
     最终所有边一起缩到同一个长度——这就是「摊账」在代码里的样子。 */
  let H = null;
  let bvec = null;

  function buildNormal() {
    H = [];
    for (let i = 0; i < N; i += 1) H.push(new Array(N).fill(0));
    bvec = new Array(N).fill(0);
    const add = (i, j, v) => { H[i][j] += v; };
    for (let k = 0; k < N - 1; k += 1) {
      add(k, k, 1); add(k + 1, k + 1, 1); add(k, k + 1, -1); add(k + 1, k, -1);
      bvec[k] += -ODOM_STEP;
      bvec[k + 1] += ODOM_STEP;
    }
    add(0, 0, LOOP_W); add(N - 1, N - 1, LOOP_W);
    add(0, N - 1, -LOOP_W); add(N - 1, 0, -LOOP_W);
    bvec[0] += -LOOP_W * LOOP_SPAN;
    bvec[N - 1] += LOOP_W * LOOP_SPAN;
    add(0, 0, GAUGE_W);
  }

  function resetPose() {
    buildNormal();
    poses = [];
    for (let i = 0; i < N; i += 1) poses.push(i * ODOM_STEP);
    iter = 0;
  }
  resetPose();

  /* 一轮高斯-赛德尔：原地更新每个节点，用最新值继续扫 */
  function relaxOnce() {
    const next = poses.slice();
    for (let i = 0; i < N; i += 1) {
      let s = bvec[i];
      for (let j = 0; j < N; j += 1) {
        if (j !== i) s -= H[i][j] * next[j];
      }
      next[i] = s / H[i][i];
    }
    poses = next;
    iter += 1;
  }

  /* 闭式解：一维链上所有边最终必然等长（拉格朗日量只依赖边长），
     e = (1.05 + LOOP_W·9) / (1 + LOOP_W·9)，直接给出收敛目标供读数对照。 */
  const EXACT_EDGE = (ODOM_STEP + LOOP_W * LOOP_SPAN) / (1 + LOOP_W * (N - 1));

  /* ---------- icp 状态 ---------- */
  let moving = MOVING0.map((p) => p.slice());
  let round = 0;
  let history = [];
  let pairs = [];

  function resetIcp() {
    moving = MOVING0.map((p) => p.slice());
    round = 0;
    history = [];
    pairs = [];
  }

  function icpStep() {
    /* 一拍 = 配对 + 求解 + 套用 */
    let sx = 0;
    let sy = 0;
    pairs = moving.map((p) => {
      const q = nearest(p, TARGET);
      sx += q[0] - p[0];
      sy += q[1] - p[1];
      return { p, q };
    });
    const shift = [sx / moving.length, sy / moving.length];
    moving = moving.map((p) => [p[0] + shift[0], p[1] + shift[1]]);
    round += 1;
    history.push(Math.hypot(shift[0], shift[1]));
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    模式: '—',
    '迭代 / 轮次': '—',
    闭环残差: '—',
    '最大单边偏差': '—',
    本轮修正: '—',
    结论: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [{ label: '位姿图弹簧网', value: 'posegraph' }, { label: 'ICP 三拍循环', value: 'icp' }],
    mode,
    (v) => {
      mode = v;
      sync();
      draw();
    },
  ));

  const bStep = mkBtn('单步');
  const bAll = mkBtn('跑到收敛');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bStep, bAll, bReset));

  const cv = setupCanvas(host, 400);

  const geo = { W: 0, H: 0 };

  /* ---------- posegraph 绘制 ---------- */

  function drawPoseGraph(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    const H = geo.H;
    const padL = 40;
    const padR = 20;
    const xMax = Math.max(poses[N - 1], N * ODOM_STEP) + 0.4;
    const sx = (v) => padL + (v / xMax) * (W - padL - padR);
    const yAll = 96;
    const yCur = 150;

    /* 尺子 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let m = 0; m <= Math.floor(xMax); m += 1) {
      const x = sx(m);
      ctx.beginPath();
      ctx.moveTo(x, yAll - 26);
      ctx.lineTo(x, yAll + 40);
      ctx.stroke();
      label(ctx, m + 'm', x, yAll + 54, C.grid, { size: 9, align: 'center' });
    }
    ctx.restore();

    label(ctx, '灰色：里程计航位推算（每拍 +1.05，5% 高估）', 20, 22, C.axis, { size: 10.5 });
    label(ctx, '彩色：松弛后的位姿（回环边把漂移摊回每一段）', 20, 38, C.ok, { size: 10.5, weight: 600 });

    /* 原始里程计轨迹 */
    for (let i = 0; i < N; i += 1) {
      const x = sx(i * ODOM_STEP);
      ctx.save();
      ctx.fillStyle = C.axis;
      ctx.beginPath();
      ctx.arc(x, yAll, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx(0), yAll);
    ctx.lineTo(sx((N - 1) * ODOM_STEP), yAll);
    ctx.stroke();
    ctx.restore();
    label(ctx, '末位漂到 ' + fmt((N - 1) * ODOM_STEP, 2) + ' m', sx((N - 1) * ODOM_STEP), yAll - 14,
      C.axis, { size: 9.5, align: 'center' });

    /* 当前位姿 */
    const col = C.named('green');
    poses.forEach((v, i) => {
      const x = sx(v);
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = i === N - 1 ? 2.4 : 1.6;
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(sx(poses[i - 1]), yCur);
        ctx.lineTo(x, yCur);
        ctx.stroke();
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, yCur, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* 回环边：末位与起点的连接弧 */
    const xa = sx(poses[N - 1]);
    const xb = sx(poses[0]);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xa, yCur - 10);
    ctx.bezierCurveTo(xa, yCur - 52, xb, yCur - 52, xb, yCur - 10);
    ctx.stroke();
    ctx.restore();
    label(ctx, '回环边：这里我来过', (xa + xb) / 2, yCur - 62, C.named('amber'),
      { size: 10.5, align: 'center', weight: 700 });

    /* 每条边的当前长度：收敛后所有边都缩到同一个值 */
    const yBar = 232;
    const lens = [];
    for (let i = 0; i < N - 1; i += 1) lens.push(poses[i + 1] - poses[i]);
    const meanLen = lens.reduce((a, c) => a + c, 0) / Math.max(1, lens.length);
    const spread = Math.max(...lens) - Math.min(...lens);
    label(ctx, '每条边的当前长度（收敛后全体缩到同一值 ' + fmt(EXACT_EDGE, 4) + ' m）',
      20, yBar - 14, C.fg, { size: 10.5, weight: 700 });
    for (let i = 0; i < N - 1; i += 1) {
      const len = lens[i];
      const dev = Math.abs(len - meanLen);
      const bx = 24 + i * ((W - 60) / (N - 1));
      const bw = Math.max(8, (W - 60) / (N - 1) - 6);
      const h = clamp(dev * 120, 1, 44);
      ctx.save();
      ctx.fillStyle = dev < 0.01 ? C.ok : C.bad;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(bx, yBar + 44 - h, bw, h);
      ctx.globalAlpha = 1;
      ctx.restore();
      label(ctx, fmt(len, 3), bx + bw / 2, yBar + 62, dev < 0.01 ? C.ok : C.bad,
        { size: 9, align: 'center' });
    }
    label(ctx, '柱高 = 该边与均值的偏离；全绿说明整条链已经「摊平」', 20, yBar + 76, C.axis,
      { size: 9.5 });
    void spread;

    /* 结论 */
    const total = poses[N - 1] - poses[0];
    const yEnd = geo.H - 8;
    label(ctx, '回环边残差 = ' + fmt(total - LOOP_SPAN, 4) + ' m　（' + iter + ' 轮松弛后；'
      + '最小二乘不会把任何一条边压到零）', 20, yEnd - 20, C.fg, { size: 10, weight: 600 });
    label(ctx, Math.abs(spread) < 0.02
      ? '结论：回环一收紧，9 段边各让一点、全体缩到同一长度——没有哪一段被单独定罪。'
      : '继续按「单步」：每一轮都在把总误差重新分配，收敛是渐进的，不是一次到位。',
      20, yEnd - 4, C.axis, { size: 10 });
  }

  /* ---------- icp 绘制 ---------- */

  function drawIcp(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    const H = geo.H;
    const left = 20;
    const boxW = Math.min(W * 0.56, 340);
    const boxH = 250;
    const pad = 14;
    /* 场景覆盖 0…4 米，留一点余量后等比例铺满方框 */
    const sc = (boxW - pad * 2) / 4.4;
    const ox = left + pad;
    const oy = 54;
    const toX = (v) => ox + v * sc;
    const toY = (v) => oy + (boxH - 20) - pad - v * sc;

    label(ctx, '目标云（空心圆）与运动云（实心点）；细线是这一拍的最近邻配对',
      10, 18, C.fg, { size: 11, weight: 700 });
    label(ctx, '三拍循环：配对 → 求解（平均错位）→ 套用（挪过去再看）', 10, 34, C.axis, { size: 10 });

    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(left, oy, boxW, boxH - 20);
    ctx.restore();

    /* 配对线 */
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 0.9;
    pairs.forEach(({ p, q }) => {
      ctx.beginPath();
      ctx.moveTo(toX(p[0]), toY(p[1]));
      ctx.lineTo(toX(q[0]), toY(q[1]));
      ctx.stroke();
    });
    ctx.restore();

    /* 目标云 */
    TARGET.forEach(([x, y]) => {
      ctx.save();
      ctx.strokeStyle = C.named('blue');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(toX(x), toY(y), 2.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    /* 运动云 */
    moving.forEach(([x, y]) => {
      ctx.save();
      ctx.fillStyle = C.named('red');
      ctx.beginPath();
      ctx.arc(toX(x), toY(y), 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* 右侧：误差曲线 */
    const cx0 = left + boxW + 26;
    const cw = W - cx0 - 16;
    if (cw > 90) {
      label(ctx, '每轮修正量', cx0, oy + 4, C.fg, { size: 10.5, weight: 700 });
      const maxV = Math.max(0.6, ...history, 0.2);
      const cy0 = oy + 26;
      const ch = boxH - 70;
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 + ch);
      ctx.lineTo(cx0 + cw, cy0 + ch);
      ctx.stroke();
      ctx.restore();
      history.forEach((v, i) => {
        const x = cx0 + (i / Math.max(1, ICP_ROUNDS - 1)) * (cw - 8);
        const y = cy0 + ch - (v / maxV) * ch;
        ctx.save();
        ctx.fillStyle = C.named('green');
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (i > 0) {
          const px = cx0 + ((i - 1) / Math.max(1, ICP_ROUNDS - 1)) * (cw - 8);
          const py = cy0 + ch - (history[i - 1] / maxV) * ch;
          ctx.save();
          ctx.strokeStyle = C.named('green');
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.restore();
        }
        label(ctx, fmt(v, 3), x, cy0 + ch + 14, C.axis, { size: 8.5, align: 'center' });
      });
      label(ctx, '第 1 轮修正 ' + (history.length ? fmt(history[0], 3) : '—') + ' m', cx0,
        cy0 + ch + 34, C.axis, { size: 9.5 });
      label(ctx, '第 ' + round + ' 轮修正 ' + (history.length ? fmt(history[history.length - 1], 5) : '—') + ' m',
        cx0, cy0 + ch + 50, round >= ICP_ROUNDS ? C.ok : C.axis, { size: 9.5 });
    }

    /* 剩余错位 */
    let sx = 0;
    let sy = 0;
    moving.forEach(([x, y]) => {
      const q = nearest([x, y], TARGET);
      sx += q[0] - x;
      sy += q[1] - y;
    });
    const remain = Math.hypot(sx / moving.length, sy / moving.length);
    const yEnd = geo.H - 14;
    label(ctx, '剩余错位 = ' + fmt(remain, 4) + ' m（' + round + ' / ' + ICP_ROUNDS + ' 轮）',
      14, yEnd - 16, remain < 1e-3 ? C.ok : C.axis, { size: 10.5, weight: 600 });
    label(ctx, round >= ICP_ROUNDS
      ? '六轮走完：平均错位从 0.25 米咬到万分之一以内——配对、求解、套用，三拍循环直到对齐。'
      : '每按一次「单步」走完一拍。注意修正量不是等比的：配对一变，下降速度就跟着变。',
      14, yEnd, C.axis, { size: 10 });
  }

  /* ---------- 主绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    geo.W = cv.W;
    geo.H = cv.H;
    clearBg(ctx, cv.W, cv.H, C);
    if (mode === 'posegraph') drawPoseGraph(C);
    else drawIcp(C);
  }

  /* ---------- 读数 ---------- */

  function sync() {
    ro.set('模式', mode === 'posegraph' ? '位姿图弹簧网' : 'ICP 三拍循环');
    if (mode === 'posegraph') {
      const lens = [];
      for (let i = 0; i < N - 1; i += 1) lens.push(poses[i + 1] - poses[i]);
      const mean = lens.reduce((a, c) => a + c, 0) / Math.max(1, lens.length);
      const spread = Math.max(...lens) - Math.min(...lens);
      const loopResid = (poses[N - 1] - poses[0]) - LOOP_SPAN;
      ro.set('迭代 / 轮次', iter + ' / ' + ITERS_MAX + ' 轮');
      ro.set('闭环残差', fmt(loopResid, 4) + ' m（回环边读数 9.0 与当前估计之差）');
      ro.set('最大单边偏差', fmt(spread, 4) + ' m（最长边 − 最短边）');
      ro.set('本轮修正', '边均值 ' + fmt(mean, 4) + ' m，收敛目标 ' + fmt(EXACT_EDGE, 4) + ' m');
      ro.set('结论', spread < 0.02
        ? '已摊平：全体边缩到同一长度，回环被吸收进每一段'
        : '航位推算的漂移还堆在线性末端');
    } else {
      let sx = 0;
      let sy = 0;
      moving.forEach(([x, y]) => {
        const q = nearest([x, y], TARGET);
        sx += q[0] - x;
        sy += q[1] - y;
      });
      const remain = Math.hypot(sx / moving.length, sy / moving.length);
      ro.set('迭代 / 轮次', round + ' / ' + ICP_ROUNDS + ' 轮');
      ro.set('闭环残差', '—（本模式看配准）');
      ro.set('最大单边偏差', '剩余错位 ' + fmt(remain, 4) + ' m');
      ro.set('本轮修正', history.length ? fmt(history[history.length - 1], 5) + ' m' : '—');
      ro.set('结论', remain < 1e-3 ? '已对齐：配对与位姿互为因果' : '配对还是「最近的」，不是「对的」');
    }
  }

  function act() {
    if (mode === 'posegraph') {
      if (iter < ITERS_MAX) relaxOnce();
    } else if (round < ICP_ROUNDS) {
      icpStep();
    }
    sync();
    draw();
  }

  bStep.addEventListener('click', act);
  bAll.addEventListener('click', () => {
    if (mode === 'posegraph') {
      for (let k = 0; k < ITERS_MAX; k += 1) relaxOnce();
    } else {
      while (round < ICP_ROUNDS) icpStep();
    }
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    resetPose();
    resetIcp();
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    destroy() { cv.redraw = null; },
  };
}