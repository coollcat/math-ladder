/* =========================================================================
 * lab 组件：brachistochrone-track —— 最速降线：两段折线的滑道计时赛
 * -------------------------------------------------------------------------
 * 演示什么：一条从 A 到 B 的滑道，形状由你自己掰。拖动拐点 P 立刻读出这一趟的
 *   用时；再按「换摆线」，看真正的最速降线还能再快多少。变分法课上最反直觉的
 *   那句话——"两点之间最快的不是直线"——在这里变成一根可以亲手掰弯的滑道。
 *
 * 用法（第 26 章《变分法选讲》动手实验）：
 *   { "type": "brachistochrone-track",
 *     "title": "掰弯滑道，看总用时",
 *     "hint": "拖动拐点 P；浅色格子边长 0.25",
 *     "goal": [4, 3],
 *     "kink": [0.5, 1.25] }
 *
 * 字段（都可省）：goal 终点（起点钉死在原点，y 向下为正）/ kink 拐点初值 /
 *   height 画布高度（默认 306）。
 *
 * 五问：
 *   1. 动手量：拖拐点 P —— 它就是"候选曲线的唯一自由参数"，函数空间的无穷多
 *      候选在这里塌缩成两个坐标。
 *   2. 即时后果：滑道、拐点、底部三根计时条一帧内全部重算。
 *   3. 读数：总用时与课文 Python 实验同一套匀加速公式；默认拐点 (0.5, 1.25)
 *      是 0.25 网格上的冠军 3645 ms，直线 4082 ms，摆线 3558 ms。
 *   4. 啊哈预设：「换成摆线」一键换上解析冠军——网格冠军仍慢 87 ms，
 *      这就是离散网格的天花板，也是变分法比"挑数组"多出来的那部分。
 *   5. 默认状态：停在网格冠军上，卡片一打开就写着三条用时，读者不用动也能
 *      看出"折线已经赢直线、却还没赢摆线"。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, polyline, clamp, fmt, clearBg,
} from '../core.js';

const G = 1;
const GRID = 0.25;

/* 一段直滑道上的匀加速下滑，与课文 Python 的 seg_time 同构：
   返回 [这段耗时, 段末速度]。y 向下为正，所以切向加速度 g·dy/L 自带符号——
   向上爬的段 a<0，速度先减；能量不够翻不过去就返回 Infinity。 */
function segTime(v0, p0, p1) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) return [0, v0];
  const a = (G * dy) / L;
  const disc = v0 * v0 + 2 * a * L;
  if (disc <= 0) return [Infinity, 0];
  const v1 = Math.sqrt(disc);
  if (Math.abs(a) < 1e-9) return [v0 > 0 ? L / v0 : Infinity, v0];
  const t = (v1 - v0) / a;
  return t < 0 ? [Infinity, v1] : [t, v1];
}

function pathTime(pts) {
  let v = 0;
  let t = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const r = segTime(v, pts[i - 1], pts[i]);
    if (!Number.isFinite(r[0])) return Infinity;
    t += r[0];
    v = r[1];
  }
  return t;
}

/* 摆线 x=r(θ−sinθ), y=r(1−cosθ) 过终点 (gx, gy)：先二分 (θ−sinθ)/(1−cosθ)=gx/gy
   （这个比值在 (0, 2π) 上单调），再由端点条件定 r。 */
function cycloidThrough(gx, gy, n) {
  const ratio = gx / gy;
  let lo = 1e-6;
  let hi = 2 * Math.PI - 1e-6;
  const f = (th) => (th - Math.sin(th)) / (1 - Math.cos(th)) - ratio;
  for (let k = 0; k < 120; k += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  const th = (lo + hi) / 2;
  const r = gy / (1 - Math.cos(th));
  const out = [];
  for (let k = 0; k <= n; k += 1) {
    const a = (th * k) / n;
    out.push([r * (a - Math.sin(a)), r * (1 - Math.cos(a))]);
  }
  return out;
}

const snapTo = (v) => Math.round(v / GRID) * GRID;

export default function render(host, spec) {
  const goal = Array.isArray(spec.goal) && spec.goal.length === 2
    ? spec.goal.map(Number) : [4, 3];
  const start = [0, 0];
  const kinkMaxX = Math.max(GRID, goal[0] - GRID);
  const kinkMaxY = Math.max(GRID, goal[1] + 1);
  const k0 = Array.isArray(spec.kink) && spec.kink.length === 2 ? spec.kink.map(Number) : [0.5, 1.25];

  const st = {
    kink: [clamp(k0[0], GRID, kinkMaxX), clamp(k0[1], GRID, kinkMaxY)],
    mode: 'kink',           // 'kink' 两段折线 / 'cycloid' 解析冠军
  };

  const cycloid = cycloidThrough(goal[0], goal[1], 240);
  const tStraight = pathTime([start, goal]);
  const tCycloid = pathTime(cycloid);
  const tGridBest = pathTime([start, [0.5, 1.25], goal]);

  const cv = setupCanvas(host, spec.height || 306);
  const ro = buildReadout({
    '总用时': '—',
    '直线参照': '—',
    '比直线省': '—',
    '摆线（真冠军）': '—',
  });
  host.appendChild(ro.box);

  /* 世界 → 屏幕的换算只算一次、存进 view；snapTo 复用同一套参数，
     免得"画的时候一套、拖的时候另一套"（这是本仓库踩过的坑）。 */
  const view = { S: 0, padL: 46, padT: 24, wx0: -0.3, wy0: -0.4 };

  const currentPath = () => (st.mode === 'cycloid' ? cycloid : [start, st.kink, goal]);

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const padL = 46;
    const padR = 18;
    const padT = 24;
    const padB = 78;
    const wx0 = -0.3;
    const wx1 = goal[0] + 0.5;
    const wy0 = -0.4;
    const wy1 = goal[1] + 0.5;
    const S = Math.min((W - padL - padR) / (wx1 - wx0), (H - padT - padB) / (wy1 - wy0));
    view.S = S;
    view.padL = padL;
    view.padT = padT;
    view.wx0 = wx0;
    view.wy0 = wy0;
    const X = (x) => padL + (x - wx0) * S;
    const Y = (y) => padT + (y - wy0) * S;

    /* 0.25 网格：折点只能落在格点上，这就是"离散化"的物理形态 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= goal[0] + 1e-9; gx += GRID) {
      ctx.moveTo(X(gx), Y(0));
      ctx.lineTo(X(gx), Y(goal[1]));
    }
    for (let gy = 0; gy <= goal[1] + 1e-9; gy += GRID) {
      ctx.moveTo(X(0), Y(gy));
      ctx.lineTo(X(goal[0]), Y(gy));
    }
    ctx.stroke();
    ctx.restore();

    /* 直线参照（灰虚线）、摆线参照（紫点线） */
    polyline(ctx, [[X(start[0]), Y(start[1])], [X(goal[0]), Y(goal[1])]], C.named('gray'), 2, [6, 5]);
    polyline(ctx, cycloid.map((p) => [X(p[0]), Y(p[1])]), C.named('purple'), 1.8, [2, 4]);

    /* 当前滑道 */
    const cur = currentPath();
    polyline(ctx, cur.map((p) => [X(p[0]), Y(p[1])]), st.mode === 'cycloid' ? C.named('purple') : C.accent, 3.4);

    /* 拐点手柄（摆线模式下变灰：此时 P 不参与计价） */
    if (st.mode === 'kink') {
      const kp = [X(st.kink[0]), Y(st.kink[1])];
      ctx.fillStyle = C.accent2;
      ctx.beginPath();
      ctx.arc(kp[0], kp[1], 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      label(ctx, 'P', kp[0] + 10, kp[1] - 8, C.accent2, { size: 11, weight: 600 });
    }

    /* 起终点 */
    [[start, 'A 静止释放', C.fg], [goal, 'B', C.bad]].forEach(([p, txt, col], i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(X(p[0]), Y(p[1]), 5.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, txt, X(p[0]) + 8, Y(p[1]) + (i === 0 ? -10 : 16), C.fg, { size: 10.5 });
    });

    /* 底部三根计时条：这一趟 vs 直线 vs 摆线 */
    const tNow = pathTime(cur);
    const rows = [
      { txt: st.mode === 'cycloid' ? '这一趟(摆线)' : '你这一趟', t: tNow, col: st.mode === 'cycloid' ? C.named('purple') : C.accent },
      { txt: '直线', t: tStraight, col: C.named('gray') },
      { txt: '摆线', t: tCycloid, col: C.named('purple') },
    ];
    const tMax = Math.max(tStraight, tCycloid, Number.isFinite(tNow) ? tNow : 0) * 1.02;
    const bx = padL + 66;
    const bw = Math.max(20, W - bx - padR - 74);
    const by = H - padB + 16;
    rows.forEach((r, i) => {
      const y = by + i * 19;
      label(ctx, r.txt, padL - 4, y + 4, C.fg, { align: 'right', size: 10.5 });
      const wpx = Number.isFinite(r.t) ? Math.max(2, (r.t / tMax) * bw) : 2;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = r.col;
      ctx.fillRect(bx, y - 10, wpx, 14);
      ctx.restore();
      label(ctx, Number.isFinite(r.t) ? fmt(r.t * 1000, 0) + ' ms' : '翻不过去',
        bx + wpx + 6, y + 3, C.fg, { size: 10 });
    });

    if (spec.hint) label(ctx, String(spec.hint), padL, H - 6, C.grid, { size: 10 });

    const save = Number.isFinite(tNow) ? tStraight - tNow : NaN;
    ro.set('总用时', Number.isFinite(tNow) ? fmt(tNow * 1000, 0) + ' ms' : '翻不过去（能量不足）');
    ro.set('直线参照', fmt(tStraight * 1000, 0) + ' ms');
    ro.set('比直线省', !Number.isFinite(save)
      ? '—'
      : Math.abs(save) < 1e-6
        ? '0 ms　（拐点在直线上：这一趟就是直线）'
        : (save > 0 ? '+' : '') + fmt(save * 1000, 0) + ' ms（'
          + fmt((save / tStraight) * 100, 1) + '%）');
    ro.set('摆线（真冠军）', fmt(tCycloid * 1000, 0) + ' ms　比网格冠军再省 '
      + fmt((tGridBest - tCycloid) * 1000, 0) + ' ms');
  }

  function toWorld(x, y) {
    if (!(view.S > 0)) return null;
    return [(x - view.padL) / view.S + view.wx0, (y - view.padT) / view.S + view.wy0];
  }

  bindPointer(cv.canvas, {
    pick: () => 'kink',
    down: (id, x, y) => {
      const w = toWorld(x, y);
      if (!w) return;
      st.mode = 'kink';
      st.kink = [clamp(snapTo(w[0]), GRID, kinkMaxX), clamp(snapTo(w[1]), GRID, kinkMaxY)];
      draw();
    },
    move: (id, x, y) => {
      const w = toWorld(x, y);
      if (!w) return;
      st.mode = 'kink';
      st.kink = [clamp(snapTo(w[0]), GRID, kinkMaxX), clamp(snapTo(w[1]), GRID, kinkMaxY)];
      draw();
    },
  });

  const bar = buildToolbar(
    (() => {
      const b = mkBtn('换成摆线（解析冠军）');
      b.addEventListener('click', () => { st.mode = 'cycloid'; draw(); });
      return b;
    })(),
    (() => {
      const b = mkBtn('回到网格冠军');
      b.addEventListener('click', () => { st.mode = 'kink'; st.kink = [0.5, 1.25]; draw(); });
      return b;
    })(),
    (() => {
      const b = mkBtn('拐点放回直线上');
      b.addEventListener('click', () => {
        st.mode = 'kink';
        /* 拐点严格落在 AB 上（不吸附格点）：两段折线首尾共线，
           计时必须与"直线"分毫不差——这是本组件自带的正确性自检。 */
        const u = 1 / 3;
        st.kink = [goal[0] * u, goal[1] * u];
        draw();
      });
      return b;
    })(),
  );
  host.appendChild(bar);

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
