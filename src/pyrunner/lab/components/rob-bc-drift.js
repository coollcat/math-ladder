/* =========================================================================
 * rob-bc-drift —— 行为克隆的分布偏移走廊（第 65 章 · 模仿学习与行为克隆）
 * -------------------------------------------------------------------------
 * 一条窄走廊（半宽 0.55 米），学员从 0.25 米的初始偏差起步，一步步往前走。
 *
 * 每一步的动作由**最近邻查表**决定：在示范集里找横向位置最接近的那笔账，
 * 照抄专家的动作。专家示范集只覆盖中心附近的一条带 ±band，动作是
 *   a = −K · x（把车往中心拉）。
 *
 * 走廊模型（学员自己的动力学，故意带一点系统漂移）：
 *   x ← (1 + GROW)·x + DRIFT + a
 * 其中 GROW 让任何残余偏差被放大、DRIFT 是"轮胎轻微跑偏"。
 *
 * 三件事因此可以在同一屏里看清：
 *   ① 一旦 |x| 超出示范带，最近邻查到的永远是**带边缘**那一笔，
 *      动作不再随偏差增长 → 偏差滚雪球 → 撞墙。这就是分布偏移；
 *   ② 「示范加密 ×2」只让阶梯变细，**带边缘没变**，照样撞墙——
 *      多而不覆盖没有用（这正是课文误区二）；
 *   ③ 「放宽示范覆盖」把带撑开 → 立刻不撞墙；「DAgger 补课」不用你选带宽，
 *      老师把学员**真的走到过**的位置补上标注，覆盖自然跟上执行分布。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "rob-bc-drift", "band": 0.05, "dagger": false }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, mkBtn,
  buildSegmented, buildToolbar, buildReadout, clearBg, anim,
} from '../core.js';

const STEPS = 60;              /* 走廊总步数 */
const HALF_W = 0.55;           /* 走廊半宽（米） */
const X0 = 0.25;               /* 起步偏差 */
const K = 0.60;                /* 专家动作增益：a = −K·x */
const GROW = 0.10;             /* 走廊动力学：残余偏差每步被放大的比例 */
const DRIFT = 0.02;            /* 走廊动力学：系统性漂移（轮胎跑偏） */

const BANDS = [0.05, 0.15, 0.35];   /* 示范覆盖的三档带宽 */

/* 示范集：专家在 ±band 内均匀采 n 个位置，动作恒为 −K·x */
function buildDemo(band, n) {
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const x = -band + (2 * band * i) / n;
    out.push({ at: x, act: -K * x });
  }
  return out;
}

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let bandIdx = 0;
  let dagger = safe.dagger === true;
  let density = 1;               /* 示范点加密倍数：1 / 2 / 4 */

  /* ---------- 状态 ---------- */
  let demo = [];                 /* 当前示范集 */
  let path = [];                 /* 走过的轨迹 [{s, x, act}] */
  let collided = false;
  let wallStep = 0;

  function resetRun() {
    demo = buildDemo(BANDS[bandIdx], 8 * density);
    path = [{ s: 0, x: X0, act: 0 }];
    collided = false;
    wallStep = 0;
  }

  function lookup(x) {
    let best = demo[0];
    let bd = Math.abs(demo[0].at - x);
    for (let i = 1; i < demo.length; i += 1) {
      const d = Math.abs(demo[i].at - x);
      if (d < bd) { bd = d; best = demo[i]; }
    }
    return best.act;
  }

  function advance(n) {
    for (let i = 0; i < n; i += 1) {
      if (collided || path.length > STEPS) return;
      const cur = path[path.length - 1];
      const x = cur.x;
      const act = lookup(x);
      const next = (1 + GROW) * x + DRIFT + act;
      path.push({ s: cur.s + 1, x: next, act });
      if (dagger) {
        /* DAgger：老师对"学员真的到达的那个位置"给出正确动作 −K·x。
           注意补的是**执行分布**上的账，不是把带宽整体撑开。 */
        demo = demo.concat([{ at: next, act: -K * next }]);
      }
      if (Math.abs(next) > HALF_W) {
        collided = true;
        wallStep = cur.s + 1;
        return;
      }
    }
  }

  function current() {
    return path[path.length - 1];
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    已走步数: '—',
    当前横向偏差: '—',
    示范覆盖: '—',
    示范点: '—',
    结论: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [{ label: '纯 BC', value: 'bc' }, { label: 'DAgger 补课', value: 'dagger' }],
    dagger ? 'dagger' : 'bc',
    (v) => {
      dagger = v === 'dagger';
      resetRun();
      sync();
      draw();
    },
  ));

  const bStep = mkBtn('前进 10 步');
  const bDense = mkBtn('示范加密 ×2');
  const bWide = mkBtn('放宽示范覆盖');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bStep, bDense, bWide, bReset));

  const cv = setupCanvas(host, 400);
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

    const band = BANDS[bandIdx];
    label(ctx, dagger
      ? 'DAgger：老师跟着学员走，学员到过得地方就有标注——覆盖自动跟上执行分布'
      : '纯 BC：示范只覆盖中心 ±' + band.toFixed(2) + ' 米，走出去就查不到对的账',
      10, 18, C.fg, { size: 11, weight: 700 });
    label(ctx, '俯视走廊：横轴 = 前进距离，纵轴 = 横向偏差；蓝色刻度段 = 示范覆盖范围',
      10, 34, C.axis, { size: 10 });

    /* 走廊 */
    const padL = 54;
    const padR = 18;
    const top = 58;
    const bot = 288;
    const sx = (s) => padL + (s / STEPS) * (W - padL - padR);
    const yMid = (top + bot) / 2;
    const yScale = ((bot - top) / 2) / (HALF_W * 1.18);
    const sy = (x) => yMid - x * yScale;

    ctx.save();
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(padL, sy(HALF_W), W - padL - padR, sy(-HALF_W) - sy(HALF_W));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, sy(HALF_W), W - padL - padR, sy(-HALF_W) - sy(HALF_W));
    /* 中心线 */
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(padL, sy(0));
    ctx.lineTo(W - padR, sy(0));
    ctx.stroke();
    ctx.restore();
    label(ctx, '中心线（专家轨迹）', padL + 6, sy(0) - 6, C.axis, { size: 9.5 });
    label(ctx, '墙', padL - 8, sy(HALF_W) + 4, C.named('red'), { size: 9.5, align: 'right' });
    label(ctx, '墙', padL - 8, sy(-HALF_W) + 4, C.named('red'), { size: 9.5, align: 'right' });

    /* 示范覆盖带：整条走廊上下两条虚线 */
    [band, -band].forEach((v) => {
      ctx.save();
      ctx.strokeStyle = C.named('blue');
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(padL, sy(v));
      ctx.lineTo(W - padR, sy(v));
      ctx.stroke();
      ctx.restore();
    });
    label(ctx, '示范覆盖 ±' + band.toFixed(2) + ' m', padL + 6, sy(band) - 5, C.named('blue'),
      { size: 9.5, weight: 600 });

    /* 学员轨迹 */
    if (path.length > 1) {
      ctx.save();
      ctx.strokeStyle = collided ? C.bad : C.named('orange');
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      path.forEach((p, i) => {
        if (i === 0) ctx.moveTo(sx(p.s), sy(p.x));
        else ctx.lineTo(sx(p.s), sy(p.x));
      });
      ctx.stroke();
      ctx.restore();
    }
    /* DAgger 补的标注点 */
    if (dagger) {
      ctx.save();
      ctx.fillStyle = C.ok;
      ctx.globalAlpha = 0.55;
      path.forEach((p, i) => {
        if (i % 2) return;
        ctx.beginPath();
        ctx.arc(sx(p.s), sy(p.x), 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    const cur = current();
    ctx.save();
    ctx.fillStyle = collided ? C.bad : C.named('orange');
    ctx.beginPath();
    ctx.arc(sx(cur.s), sy(cur.x), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* 偏差曲线 */
    const cy0 = 312;
    const cy1 = 366;
    label(ctx, '横向偏差 |x| 随步数增长（虚线 = 撞墙阈值 ' + HALF_W + ' m）', 10, cy0 - 8,
      C.fg, { size: 10, weight: 600 });
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(padL, cy1);
    ctx.lineTo(W - padR, cy1);
    ctx.stroke();
    ctx.strokeStyle = C.bad;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, cy0 + 2);
    ctx.lineTo(W - padR, cy0 + 2);
    ctx.stroke();
    ctx.restore();
    if (path.length > 1) {
      ctx.save();
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      path.forEach((p, i) => {
        const px = sx(p.s);
        const py = cy1 - clamp(Math.abs(p.x) / HALF_W, 0, 1) * (cy1 - cy0 - 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }

    /* 判词 */
    let msg;
    if (collided) {
      msg = '第 ' + wallStep + ' 步撞墙（偏差 ' + Math.abs(cur.x).toFixed(3) + ' m > 半宽 '
        + HALF_W + '）。偏差超出示范带后，最近邻查到的永远是带边缘那一笔，动作不再随偏差增长——'
        + '错是「滚雪球」，不是「跳一下」。';
    } else if (cur.s >= STEPS) {
      msg = '走完全程，末端偏差 ' + Math.abs(cur.x).toFixed(3) + ' m。'
        + (dagger ? 'DAgger 把账补在学员真正会去的地方，所以它没被甩出去。'
          : '带够宽，查得到对的账，所以它收敛了——覆盖才是解药。');
    } else {
      msg = '每按一次「前进 10 步」走一段。盯着蓝色虚线段：一旦越出去，动作就变成常数，偏差开始滚雪球。';
    }
    label(ctx, msg, 10, H - 10, collided ? C.bad : C.axis, { size: 10 });
  }

  /* ---------- 读数 ---------- */

  function sync() {
    const cur = current();
    ro.set('已走步数', cur.s + ' / ' + STEPS + (collided ? '（已撞墙）' : ''));
    ro.set('当前横向偏差', Math.abs(cur.x).toFixed(3) + ' m（半宽 ' + HALF_W + ' m）');
    ro.set('示范覆盖', '±' + BANDS[bandIdx].toFixed(2) + ' m'
      + (dagger ? ' + DAgger 实时补账' : ''));
    ro.set('示范点', demo.length + ' 条（' + (8 * density + 1) + ' 条专家示范'
      + (dagger ? ' + ' + (demo.length - 8 * density - 1) + ' 条补账' : '') + '）');
    ro.set('结论', collided ? '已撞墙：分布偏移的雪球'
      : cur.s >= STEPS ? '走完全程' : '进行中');
  }

  /* ---------- 交互 ---------- */

  bStep.addEventListener('click', () => {
    advance(10);
    sync();
    draw();
  });
  bDense.addEventListener('click', () => {
    density = density >= 4 ? 1 : density * 2;
    resetRun();
    sync();
    draw();
  });
  bWide.addEventListener('click', () => {
    bandIdx = (bandIdx + 1) % BANDS.length;
    resetRun();
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    bandIdx = 0;
    dagger = false;
    density = 1;
    resetRun();
    sync();
    draw();
  });

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.10) return;
      acc = 0;
      advance(1);
      sync();
      draw();
    },
    onReset() {
      resetRun();
      sync();
      draw();
    },
  });

  resetRun();
  sync();
  draw();
  cv.redraw = draw;
  return {
    destroy() { controls.stop(); cv.redraw = null; },
  };
}
