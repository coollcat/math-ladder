/* =========================================================================
 * lab 组件：astar-frontier —— A* 搜索现场（frontier / g・h・f / 对照实验）
 * -------------------------------------------------------------------------
 * 用法（第 65 章 A* 课 lab 围栏）：
 *
 *   { "type": "astar-frontier", "title": "A* 的 frontier 长什么样" }
 *
 * 字段（都可省）：rows / cols 网格尺寸（默认 8×8）；walls 额外墙格 [[r,c],…]；
 *   start / goal 坐标（默认 [0,0] 与 [7,7]）；inflate 高估倍数（默认 2）；
 *   height 画布高度（默认 560）。
 *
 * 一台格子机器，三本账同跑：
 *   · A*（h = 曼哈顿距离，可采纳）：f = g + h 挑最小；
 *   · Dijkstra（h = 0）：只看已走代价，frontier 铺得最满；
 *   · 高估 h（h × inflate）：跑得更猛，但会交出非最短路径——最短性作废的现场。
 * 单步/播放推进时三个搜索用同一个步数，切视图对比 frontier 形状；
 * 每格直接标出 g（左上）/ h（右上）/ f（中间），右下角面板列出 frontier 队首与
 * 展开数/路径长度的条形对照。点任意空格可切换墙/空地，三本账立刻重算。
 *
 * 取舍：
 *   - 搜索是确定性排序（f 相同时按行、再按列，与课文的 Python 同口径），
 *     每步的 frontier、g 表都预先快照，回退不需要重跑。
 *   - 点击改地图会重建快照并回到第 0 步，防止半帧错位。
 *   - 播放/重置走 core.anim（自动处理 reduced-motion 与离屏暂停）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, anim, buildSegmented, buildToolbar, buildReadout,
  bindPointer, mkBtn, label, clamp, fmt, clearBg, onScreen,
} from '../core.js';

/* 课文里的那张 8×8 仓库地图（1 = 货架） */
const CLASSROOM = [
  [0, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [1, 1, 0, 1, 0, 0, 1, 1],
  [0, 0, 0, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 1, 1, 0, 0],
];

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];   /* 上下左右，与课文一致 */

/* 栅格 A*：hMul = 0 时退化为 Dijkstra。
   返回逐步快照：steps[k] = 第 k 次展开之后的 frontier / g 表，
   便于「单步 / 回退 / 播放」直接查表，不重跑搜索。 */
export function runSearch(grid, start, goal, hMul) {
  const rows = grid.length;
  const cols = grid[0].length;
  const K = (r, c) => r * cols + c;
  const H = (r, c) => hMul * (Math.abs(r - goal[0]) + Math.abs(c - goal[1]));
  const g = new Int16Array(rows * cols).fill(-1);
  const parent = new Int16Array(rows * cols).fill(-1);
  g[K(start[0], start[1])] = 0;
  const open = [{ r: start[0], c: start[1], f: H(start[0], start[1]) }];
  const closed = new Set();
  const steps = [];
  let path = null;
  let pathAt = -1;

  while (open.length) {
    open.sort((a, b) => (a.f - b.f) || (a.r - b.r) || (a.c - b.c));
    const cur = open.shift();
    const ck = K(cur.r, cur.c);
    if (closed.has(ck)) continue;
    closed.add(ck);
    const gv = g[ck];
    const hv = H(cur.r, cur.c);

    if (cur.r === goal[0] && cur.c === goal[1]) {
      /* 回溯路径：终点 → 起点再翻转 */
      const rev = [];
      let node = ck;
      while (node !== -1) {
        rev.push(node);
        node = parent[node];
      }
      path = rev.reverse();
      pathAt = steps.length + 1;
    }

    for (const [dr, dc] of DIRS) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === 1) continue;
      const nk = K(nr, nc);
      const ng = gv + 1;
      if (g[nk] === -1 || ng < g[nk]) {
        g[nk] = ng;
        parent[nk] = ck;
        open.push({ r: nr, c: nc, f: ng + H(nr, nc) });
      }
    }

    steps.push({
      r: cur.r,
      c: cur.c,
      g: gv,
      h: hv,
      f: gv + hv,
      closed: [...closed],
      open: open.map((o) => K(o.r, o.c)),
      gSnap: Int16Array.from(g),
    });
    if (path) break;
  }

  return {
    hMul, rows, cols, steps, path, pathAt, expanded: steps.length, reached: !!path,
  };
}

export default function render(host, spec) {
  const rows = clamp(spec.rows || CLASSROOM.length, 4, 10);
  const cols = clamp(spec.cols || CLASSROOM[0].length, 4, 10);
  const start = Array.isArray(spec.start) ? spec.start.slice() : [0, 0];
  const goal = Array.isArray(spec.goal) ? spec.goal.slice() : [rows - 1, cols - 1];
  const inflate = typeof spec.inflate === 'number' && spec.inflate > 1 ? spec.inflate : 2;
  const H = spec.height || 600;

  /* 地图：默认抄课文，多退少补时按墙处理，不静默改题 */
  let grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
    const src = CLASSROOM[r] && CLASSROOM[r][c];
    return src === undefined ? 0 : src;
  }));
  (Array.isArray(spec.walls) ? spec.walls : []).forEach((w) => {
    if (Array.isArray(w) && grid[w[0]] && grid[w[0]][w[1]] !== undefined) grid[w[0]][w[1]] = 1;
  });
  grid[start[0]][start[1]] = 0;
  grid[goal[0]][goal[1]] = 0;

  const RUNS = [
    { id: 'astar', name: 'A*（h = 曼哈顿，可采纳）', hMul: 1, color: 'blue' },
    { id: 'dijkstra', name: 'Dijkstra（h = 0）', hMul: 0, color: 'gray' },
    { id: 'inflate', name: '高估 h（×' + inflate + '，不可采纳）', hMul: inflate, color: 'red' },
  ];
  let view = RUNS[0];
  let runs = {};
  let step = 0;                       /* 已展开的格数（三本账共用同一个步数） */
  let hoverCell = null;

  function measure() {
    runs = {};
    RUNS.forEach((r) => { runs[r.id] = runSearch(grid, start, goal, r.hMul); });
    step = 0;
  }
  measure();

  const cv = setupCanvas(host, H);
  const ro = buildReadout({
    视图: '—',
    刚展开: '—',
    '探针格': '—',
    '展开对照': '—',
    '路径长度': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    RUNS.map((r) => ({ label: r.name, value: r.id })),
    'astar',
    (v) => { view = RUNS.find((r) => r.id === v) || RUNS[0]; sync(); draw(); },
  ));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 上一步');
  const bClear = mkBtn('清空到第 0 步');
  host.appendChild(buildToolbar(bStep, bBack, bClear));

  function curRun() { return runs[view.id]; }
  function snap() {
    const run = curRun();
    if (step <= 0 || !run.steps.length) return null;
    return run.steps[clamp(step - 1, 0, run.steps.length - 1)];
  }
  /* 当前视图在 step 步时的 g 表；step=0 时只有起点 */
  function gView() {
    const run = curRun();
    if (step <= 0) return null;
    return run.steps[clamp(step - 1, 0, run.steps.length - 1)].gSnap;
  }
  function openView() {
    const run = curRun();
    if (step <= 0) return [start[0] * cols + start[1]];
    const s = run.steps[clamp(step - 1, 0, run.steps.length - 1)];
    const seen = new Set();
    const out = [];
    s.open.forEach((k) => { if (!seen.has(k)) { seen.add(k); out.push(k); } });
    return out;
  }

  const geo = { gx: 0, gy: 0, cell: 0, px: 0, py: 0, pw: 0, ph: 0, W: 0, H: 0 };
  function layout(W, Hh) {
    const pad = 12;
    const wide = W >= 620;
    const gridMax = wide ? Math.min(W * 0.52, Hh - 108) : Math.min(W - pad * 2, 360);
    const cell = Math.floor(gridMax / cols);
    geo.gx = pad + 4;
    geo.gy = 34;
    geo.cell = cell;
    geo.px = wide ? geo.gx + cell * cols + 18 : pad;
    geo.py = wide ? 34 : geo.gy + cell * rows + 58;
    geo.pw = wide ? W - geo.px - pad : W - pad * 2;
    geo.ph = wide ? Hh - geo.py - pad : Hh - geo.py - pad;
    geo.W = W;
    geo.H = Hh;
  }
  const cellOf = (r, c) => ({
    x: geo.gx + c * geo.cell,
    y: geo.gy + r * geo.cell,
  });
  const cellAt = (x, y) => {
    const c = Math.floor((x - geo.gx) / geo.cell);
    const r = Math.floor((y - geo.gy) / geo.cell);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return [r, c];
  };

  function sync() {
    const run = curRun();
    const s = snap();
    ro.set('视图', view.name + '　已展开 ' + Math.min(step, run.expanded) + ' / ' + run.expanded + ' 格');
    ro.set('刚展开', s ? `(${s.r},${s.c})　g=${fmt(s.g, 0)}　h=${fmt(s.h, 0)}　f=${fmt(s.f, 0)}` : '还没开始展开（第 0 步）');
    if (hoverCell) {
      const [r, c] = hoverCell;
      const gg = gView();
      const k = r * cols + c;
      if (grid[r][c] === 1) ro.set('探针格', `(${r},${c})　墙`);
      else if (step === 0 && (r !== start[0] || c !== start[1])) ro.set('探针格', `(${r},${c})　还没探到`);
      else {
        const gv = gg && gg[k] >= 0 ? gg[k] : (r === start[0] && c === start[1] ? 0 : null);
        ro.set('探针格', gv === null
          ? `(${r},${c})　还没探到`
          : `(${r},${c})　g=${gv}　h=${fmt(view.hMul * (Math.abs(r - goal[0]) + Math.abs(c - goal[1])), 0)}　f=${fmt(gv + view.hMul * (Math.abs(r - goal[0]) + Math.abs(c - goal[1])), 0)}`);
      }
    } else {
      ro.set('探针格', '把鼠标移到格子上（手机点按看读数）');
    }
    const parts = RUNS.map((r) => {
      const rr = runs[r.id];
      return `${r.id === 'astar' ? 'A*' : r.id === 'dijkstra' ? 'Dijkstra' : 'h×' + inflate}=${rr.expanded}`;
    });
    ro.set('展开对照', parts.join('　') + '（格）');
    const short = runs.astar.reached ? runs.astar.path.length - 1 : '—';
    ro.set('路径长度', RUNS.map((r) => {
      const rr = runs[r.id];
      const name = r.id === 'astar' ? 'A*' : r.id === 'dijkstra' ? 'Dijkstra' : 'h×' + inflate;
      if (!rr.reached) return `${name} 未到达`;
      return `${name} ${rr.path.length - 1} 步`;
    }).join('　') + `（最短 ${short}）`);
  }

  function drawBars(ctx, C, x, y, w) {
    const maxE = Math.max(...RUNS.map((r) => runs[r.id].expanded), 1);
    label(ctx, '展开数（越短越好）', x, y, C.axis, { size: 10.5 });
    RUNS.forEach((r, i) => {
      const yy = y + 14 + i * 17;
      const rr = runs[r.id];
      const bw = Math.max(2, (rr.expanded / maxE) * (w - 96));
      ctx.fillStyle = C.named(r.color);
      ctx.globalAlpha = view.id === r.id ? 1 : 0.55;
      ctx.fillRect(x + 84, yy - 9, bw, 11);
      ctx.globalAlpha = 1;
      label(ctx, r.id === 'astar' ? 'A*' : r.id === 'dijkstra' ? 'Dijkstra' : 'h×' + inflate,
        x + 80, yy, C.fg, { size: 10, align: 'right', weight: view.id === r.id ? 700 : 400 });
      label(ctx, String(rr.expanded) + ' 格 / ' + (rr.reached ? (rr.path.length - 1) + ' 步' : '未到达'),
        x + 88 + bw, yy, C.axis, { size: 10 });
    });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);
    const run = curRun();
    const s = snap();
    const gv = gView();
    const openKeys = new Set(openView());
    const closedKeys = s ? new Set(s.closed) : new Set();
    const pathShown = run.reached && step >= run.pathAt;
    const bestPathShown = runs.astar.reached && step >= runs.astar.pathAt;

    label(ctx, '仓库地图：点格子可在「墙 / 空地」间切换（起点 S、终点 G 不动）', geo.gx, 20, C.fg, { size: 11 });

    /* ---- 网格 ---- */
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const { x, y } = cellOf(r, c);
        const k = r * cols + c;
        const isS = r === start[0] && c === start[1];
        const isG = r === goal[0] && c === goal[1];
        const wall = grid[r][c] === 1;
        const isClosed = closedKeys.has(k);
        const isOpen = !isClosed && openKeys.has(k) && !wall;
        const isHot = s && s.r === r && s.c === c;
        const isHover = hoverCell && hoverCell[0] === r && hoverCell[1] === c;

        ctx.fillStyle = wall ? C.named('gray') : C.soft;
        ctx.globalAlpha = wall ? 0.85 : (isClosed ? 0.95 : 0.5);
        ctx.fillRect(x, y, geo.cell, geo.cell);
        ctx.globalAlpha = 1;
        if (isClosed && !wall) {
          ctx.fillStyle = C.accent;
          ctx.globalAlpha = 0.14;
          ctx.fillRect(x, y, geo.cell, geo.cell);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = isHot ? C.accent : (isOpen ? C.accent2 : C.grid);
        ctx.lineWidth = isHot ? 2.2 : (isOpen ? 1.6 : 1);
        ctx.strokeRect(x + 0.5, y + 0.5, geo.cell - 1, geo.cell - 1);
        if (isHover) {
          ctx.strokeStyle = C.fg;
          ctx.globalAlpha = 0.5;
          ctx.strokeRect(x + 1.5, y + 1.5, geo.cell - 3, geo.cell - 3);
          ctx.globalAlpha = 1;
        }

        if (!wall) {
          const known = gv && gv[k] >= 0;
          const gVal = (r === start[0] && c === start[1]) ? 0 : (known ? gv[k] : -1);
          if (gVal >= 0 && !isS && !isG) {
            const hv = view.hMul * (Math.abs(r - goal[0]) + Math.abs(c - goal[1]));
            const fs = Math.max(7.5, Math.min(9.5, geo.cell * 0.22));
            label(ctx, String(gVal), x + 3, y + fs + 2, C.named('teal'), { size: fs });
            label(ctx, fmt(hv, 0), x + geo.cell - 3, y + fs + 2, C.named('red'), { size: fs, align: 'right' });
            label(ctx, String(gVal + hv), x + geo.cell / 2, y + geo.cell * 0.62,
              C.fg, { size: Math.max(9, geo.cell * 0.26), align: 'center', weight: 700 });
          }
          if (isS) label(ctx, 'S', x + geo.cell / 2, y + geo.cell * 0.66, C.ok, { size: geo.cell * 0.34, align: 'center', weight: 700 });
          if (isG) label(ctx, 'G', x + geo.cell / 2, y + geo.cell * 0.66, C.bad, { size: geo.cell * 0.34, align: 'center', weight: 700 });
        }
      }
    }

    /* ---- 路径：当前视图的路径（绿），以及 A* 最优路径（灰虚线，高估视图对照用） ---- */
    const drawPath = (path, color, width, dash) => {
      if (!path || path.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      path.forEach((k, i) => {
        const r = Math.floor(k / cols);
        const c = k % cols;
        const { x, y } = cellOf(r, c);
        const cx = x + geo.cell / 2;
        const cy = y + geo.cell / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.restore();
    };
    if (view.id !== 'astar' && bestPathShown) drawPath(runs.astar.path, C.named('gray'), 3, [5, 4]);
    if (pathShown) {
      drawPath(run.path, view.id === 'inflate' ? C.bad : C.ok, 4);
      label(ctx, view.id === 'inflate'
        ? `高估 h 交出 ${run.path.length - 1} 步：灰虚线才是真正的 ${runs.astar.path.length - 1} 步`
        : `找到 ${run.path.length - 1} 步最短路径`,
      geo.gx, geo.gy + geo.cell * rows + 16, view.id === 'inflate' ? C.bad : C.ok, { size: 11.5, weight: 700 });
    } else if (s) {
      label(ctx, `正在展开 (${s.r},${s.c})　g + h = ${fmt(s.g, 0)} + ${fmt(s.h, 0)} = ${fmt(s.f, 0)}`,
        geo.gx, geo.gy + geo.cell * rows + 16, C.fg, { size: 11.5 });
    }

    /* ---- 右侧（移动端为下方）面板 ---- */
    const px = geo.px;
    let py = geo.py;
    const pw = geo.pw;
    ctx.save();
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(px - 4, py - 12, pw + 8, Math.min(geo.ph + 12, 260));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.grid;
    ctx.strokeRect(px - 4.5, py - 12.5, pw + 9, Math.min(geo.ph + 12, 260));
    ctx.restore();
    label(ctx, view.name, px + 4, py + 4, C.named(view.color), { size: 12, weight: 700 });
    label(ctx, '每格：左上 g　右上 h　中间 f = g + h', px + 4, py + 22, C.axis, { size: 10.5 });

    /* frontier 队首（按 f 排序；移动端收成 3 行，桌面 6 行） */
    const narrow = geo.W < 620;
    const rowMax = narrow ? 3 : 6;
    const openList = openView()
      .map((k) => ({ k, r: Math.floor(k / cols), c: k % cols }))
      .filter(({ r, c }) => !(closedKeys.has(r * cols + c)) && grid[r][c] !== 1)
      .map((o) => {
        const gv2 = gv && gv[o.k] >= 0 ? gv[o.k] : 0;
        const hv2 = view.hMul * (Math.abs(o.r - goal[0]) + Math.abs(o.c - goal[1]));
        return { ...o, g: gv2, h: hv2, f: gv2 + hv2 };
      })
      .sort((a, b) => (a.f - b.f) || (a.r - b.r) || (a.c - b.c));
    label(ctx, 'frontier 队首（下一个出队的就是它）', px + 4, py + 42, C.axis, { size: 10.5 });
    openList.slice(0, rowMax).forEach((o, i) => {
      const yy = py + 60 + i * 15;
      label(ctx, `(${o.r},${o.c})`, px + 8, yy, C.fg, { size: 10.5, weight: i === 0 ? 700 : 400 });
      label(ctx, `g=${o.g}　h=${fmt(o.h, 0)}　f=${fmt(o.f, 0)}`, px + 56, yy,
        i === 0 ? C.accent : C.axis, { size: 10.5, weight: i === 0 ? 700 : 400 });
      if (i === 0) label(ctx, '← 下一个', px + pw - 6, yy, C.accent2, { size: 10, align: 'right' });
    });
    if (!openList.length) label(ctx, '（frontier 空）', px + 8, py + 60, C.axis, { size: 10.5 });

    /* 展开数与路径长度对照 */
    drawBars(ctx, C, px + 4, py + (narrow ? 108 : 172), pw);

    /* 图例 */
    const ly = geo.gy + geo.cell * rows + 34;
    label(ctx, '橙框 = frontier（已发现未展开）　蓝底 = 已展开', geo.gx, ly, C.axis, { size: 10.5 });
    label(ctx, '红/青数字 = 该格当前视图的 g 与 h　绿线 = 找到的路径　灰虚线 = A* 最短路', geo.gx, ly + 15, C.axis, { size: 10.5 });
  }

  /* 指针：悬停读格；点一下切墙；按住拖动 = 一路刷墙（起点终点豁免）。
     拖动期间只改地图、不重跑（半帧状态可接受），抬手才 measure() 重算三本账。 */
  let paint = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      const cell = cellAt(x, y);
      if (!cell) return null;
      hoverCell = cell;
      return 'grid';
    },
    hover(x, y) {
      const cell = cellAt(x, y);
      const before = hoverCell && cell && hoverCell[0] === cell[0] && hoverCell[1] === cell[1];
      hoverCell = cell;
      cv.canvas.style.cursor = cell ? 'pointer' : 'default';
      if (!before) { sync(); draw(); }
    },
    leave() { hoverCell = null; cv.canvas.style.cursor = 'default'; sync(); draw(); },
    down(id, x, y) {
      const cell = cellAt(x, y);
      if (!cell) return;
      const [r, c] = cell;
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) { paint = null; return; }
      paint = { v: grid[r][c] === 1 ? 0 : 1 };
      grid[r][c] = paint.v;
      draw();
    },
    move(id, x, y) {
      if (!paint) return;
      const cell = cellAt(x, y);
      if (!cell) return;
      const [r, c] = cell;
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) return;
      if (grid[r][c] !== paint.v) { grid[r][c] = paint.v; draw(); }
    },
    up() {
      if (!paint) return;
      paint = null;
      measure();
      controls.stop();
      sync();
      draw();
    },
  });

  bStep.addEventListener('click', () => {
    step = Math.min(step + 1, Math.max(...RUNS.map((r) => runs[r.id].expanded)));
    sync();
    draw();
  });
  bBack.addEventListener('click', () => { step = Math.max(step - 1, 0); sync(); draw(); });
  bClear.addEventListener('click', () => { step = 0; sync(); draw(); });

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.35) return;
      acc = 0;
      const maxStep = Math.max(...RUNS.map((r) => runs[r.id].expanded));
      step = step >= maxStep ? 0 : step + 1;
      sync();
      draw();
    },
    onReset() { step = 0; acc = 0; sync(); draw(); },
  });

  /* 离屏时把 hover 态清掉，滚回来不会留下旧读数 */
  onScreen(host, (v) => { if (!v) { hoverCell = null; } });

  sync();
  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); } };
}
