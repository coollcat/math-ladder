/* =========================================================================
 * lab 组件：diagonal-enumeration —— 把无穷摆成一张表，再沿对角线一格一格点名
 * -------------------------------------------------------------------------
 * 演示什么：正有理数能排成一列。办法不是比大小，而是把 i/j 摆进矩阵、沿反对角线
 * 蛇形扫描——第 s 层 (i + j = s) 只有 s − 1 个格子，层数却一直往上长，所以每个格子
 * 终会在某个有限时刻被点到名。这就是可数性。
 *
 * 用法（第 27 章 · 可数性与基数入门 的 lab 围栏）：
 *
 *   { "type": "diagonal-enumeration", "title": "对角线点名：无穷也能排队" }
 *
 * 字段：
 *   n        网格边长（默认 6；行 i、列 j 都取 1..n）
 *   speed    每秒点几个名（默认 4）
 *   skipDup  true 时重复分数（2/4 与 1/2 同值）不编号，默认 true
 *
 * 完美教具五问：
 *   1 动手量：滑块换网格边长 n（3..10）与点名速度；按钮切换「重复项要不要编号」。
 *   2 即时后果：播放后每一帧网格上多一个编号点，折线把点名次序连成一条蛇形轨迹。
 *   3 读数：当前格 (i, j)、它化简后的分数、对角层 s = i + j、本层格子数、已点名多少格、
 *     其中互不相同的分数有几个——都能和课文第 4 节的 $s = i + j$ 逐项对照。
 *   4 啊哈预设：换层时「本层格子」读数始终只比上一层多 1，而「已点名」一直往上涨；
 *     重复格不编号（红色空心），一眼看出这张表有多余但不会漏。
 *   5 默认状态：n = 6、打开即自动点名，(1, 1) 已编号 1，读数 s = 2、本层 1 格；
 *     正文照此读数写。系统开了「减少动效」时不自动播，读者自己按播放。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, mkBtn, buildToolbar,
  polyline, label, clamp, anim, mergeSpec, clearBg,
} from '../core.js';

/* 反对角线序：先按 s = i + j 分层，层内正向/反向交替，轨迹才是蛇形而不是老贴边 */
function orderCells(n) {
  const out = [];
  for (let s = 2; s <= 2 * n; s += 1) {
    const layer = [];
    for (let i = Math.max(1, s - n); i <= Math.min(n, s - 1); i += 1) layer.push([i, s - i]);
    if (s % 2 === 0) layer.reverse();
    for (const c of layer) out.push(c);
  }
  return out;
}

function gcd(a, b) {
  let x = a;
  let y = b;
  while (y) { const t = x % y; x = y; y = t; }
  return x;
}

const BASE = [
  { name: 'n', label: '网格边长 n', min: 3, max: 10, step: 1, value: 6 },
  { name: 'speed', label: '点名速度（格/秒）', min: 1, max: 12, step: 0.5, value: 4, fmt: 1 },
];

export default function render(host, spec) {
  const st = mergeSpec(BASE, {
    n: typeof spec.n === 'number' ? clamp(Math.round(spec.n), 3, 10) : 6,
    speed: typeof spec.speed === 'number' ? spec.speed : 4,
  });
  let skipDup = spec.skipDup !== false;

  const sliders = buildSliders({ sliders: st }, (v) => {
    st[0].value = Math.round(v.n);
    st[1].value = v.speed;
    rebuild();
  });
  const ro = buildReadout({
    当前格: '—', 对角层: '—', 本层格子: '—', 已扫: '—', 拿到编号: '—', 不同分数: '—',
  });

  const dupBtn = mkBtn('重复项不编号：开');
  dupBtn.addEventListener('click', () => {
    skipDup = !skipDup;
    dupBtn.textContent = '重复项不编号：' + (skipDup ? '开' : '关');
    /* 编号是扫描时定的：换了规矩就把已扫的那些重新编一遍，否则按钮点了像没反应 */
    const upto = idx;
    marks = list.map(() => null);
    seen = new Set();
    idx = 0;
    sweep(upto);
    draw();
  });
  const cv = setupCanvas(host, 360);
  host.appendChild(buildToolbar(dupBtn));
  host.appendChild(ro.box);

  const g = { x0: 0, y0: 0, cell: 0 };
  let n = st[0].value;
  let list = orderCells(n);
  let marks = [];
  let seen = new Set();
  let idx = 0;            /* 已扫过的格子数（含重复项） */
  let clock = 0;          /* 动画累加器：已扫 = floor(clock) */
  let done = false;

  function rebuild() {
    n = Math.round(st[0].value);
    list = orderCells(n);
    marks = list.map(() => null);
    seen = new Set();
    idx = 0;
    clock = 1;
    done = false;
    sweep(1);        /* 第一格先点上：读数栏不该空着等动画 */
    draw();
  }

  /* 推进到扫描 k 格：一次一格的登记，重复项打标记后决定要不要编号 */
  function sweep(k) {
    while (idx < k && idx < list.length) {
      const [i, j] = list[idx];
      const d = gcd(i, j);
      const key = (i / d) + '/' + (j / d);
      const dup = seen.has(key);
      seen.add(key);
      const rank = skipDup && dup ? null : (skipDup ? seen.size : idx + 1);
      marks[idx] = { i, j, key, dup, rank };
      idx += 1;
    }
    done = idx >= list.length;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    if (!W || !H) return;

    /* 网格居中；右侧留出读数栏 */
    const side = Math.min(W - 160, H - 52);
    g.cell = Math.max(12, side / n);
    g.x0 = 74 + Math.max(0, (side - g.cell * n) / 2);
    g.y0 = 36 + Math.max(0, (side - g.cell * n) / 2);
    const cx = (i) => g.x0 + (i - 1) * g.cell;
    const cy = (j) => g.y0 + (n - j) * g.cell;

    label(ctx, 'i（分子）→', g.x0, g.y0 - 12, C.axis, { size: 11 });
    label(ctx, 'j（分母）↑', g.x0 - 60, g.y0 + 4, C.axis, { size: 11 });

    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i <= n; i += 1) for (let j = 1; j <= n; j += 1) ctx.strokeRect(cx(i), cy(j), g.cell, g.cell);
    ctx.restore();
    for (let i = 1; i <= n; i += 1) label(ctx, String(i), cx(i) + g.cell / 2, g.y0 + g.cell * n + 14, C.axis, { size: 10, align: 'center' });
    for (let j = 1; j <= n; j += 1) label(ctx, String(j), g.x0 - 8, cy(j) + g.cell / 2 + 4, C.axis, { size: 10, align: 'right' });

    /* 当前这一层：整层描一圈，把「有限层」画出来 */
    const cur = idx > 0 && idx <= list.length ? marks[idx - 1] : null;
    if (cur) {
      ctx.save();
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      const s = cur.i + cur.j;
      for (let i = Math.max(1, s - n); i <= Math.min(n, s - 1); i += 1) {
        ctx.strokeRect(cx(i) + 1, cy(s - i) + 1, g.cell - 2, g.cell - 2);
      }
      ctx.restore();
    }

    /* 已点名：点 + 编号 + 蛇形连线 */
    const pts = [];
    for (let k = 0; k < idx; k += 1) {
      const m = marks[k];
      if (!m) continue;
      const px = cx(m.i) + g.cell / 2;
      const py = cy(m.j) + g.cell / 2;
      pts.push([px, py]);
      if (m.rank === null) {
        ctx.save();
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, g.cell * 0.22), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, g.cell * 0.26), 0, Math.PI * 2);
        ctx.fill();
        if (g.cell >= 24) label(ctx, String(m.rank), px, py + 3.5, C.bg, { size: 9, align: 'center', weight: 700 });
      }
    }
    polyline(ctx, pts, C.accent, Math.max(1, g.cell * 0.05));

    /* ---------- 右侧读数 ---------- */
    const rx = g.x0 + g.cell * n + 22;
    let y = g.y0 + 8;
    const line = (txt, color, size) => {
      label(ctx, txt, rx, y, color || C.fg, { size: size || 11.5 });
      y += (size || 11.5) + 7;
    };
    let numbered = 0;
    for (let k = 0; k < idx; k += 1) if (marks[k] && marks[k].rank !== null) numbered += 1;
    if (cur) {
      line('(' + cur.i + ', ' + cur.j + ') = ' + cur.i + '/' + cur.j, C.fg, 12);
      line('化简后 ' + cur.key + (cur.dup ? '（见过）' : '（新）'), cur.dup ? C.bad : C.accent, 11);
      line('s = i + j = ' + (cur.i + cur.j), C.fg, 11);
    } else {
      line('还没开始点名', C.axis, 12);
    }
    line('已扫 ' + idx + ' / ' + list.length + ' 格', C.fg, 11);
    line('拿到编号 ' + numbered + ' 个', C.fg, 11);
    line('不同的分数 ' + seen.size + ' 个', C.fg, 11);
    y += 6;
    line('每层有限，层数无穷，', C.axis, 10.5);
    line('所以每个格子都轮得到。', C.axis, 10.5);

    if (cur) {
      const s2 = cur.i + cur.j;
      const inLayer = Math.max(1, Math.min(n, s2 - 1) - Math.max(1, s2 - n) + 1);
      ro.set('当前格', '(' + cur.i + ', ' + cur.j + ') = ' + cur.i + '/' + cur.j + ' → ' + cur.key);
      ro.set('对角层', 's = ' + s2);
      ro.set('本层格子', inLayer + ' 个');
    } else {
      ro.set('当前格', '—');
      ro.set('对角层', '—');
      ro.set('本层格子', '—');
    }
    ro.set('已扫', idx + ' / ' + list.length + ' 格');
    ro.set('拿到编号', numbered + ' 个');
    ro.set('不同分数', seen.size + ' 个');
  }

  const loop = anim(host, {
    onTick(dt) {
      if (done) { clock = list.length; return; }
      clock = Math.min(clock + dt * st[1].value, list.length);
      const want = Math.floor(clock);
      if (want !== idx) { sweep(want); draw(); }
    },
    onReset() { rebuild(); },
  });

  rebuild();
  /* 打开就开始点名：读者不用先找按钮。系统要求减少动效时不自动播。 */
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!reduced) loop.toggle(true);
  cv.redraw = () => draw();
  return { slidersBox: sliders.box, destroy() { loop.stop(); cv.redraw = null; } };
}
