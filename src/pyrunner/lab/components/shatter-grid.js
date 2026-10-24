/* =========================================================================
 * lab 组件：shatter-grid —— 把「哪些贴法切得开」摊成一张表
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "shatter-grid", "title": "四点十四个贴法：直线够不着的那两个", "n": 4 }
 *   ```
 *
 * 字段（都有默认值，只写 type + title 也能渲染）：
 *   n       点数，3~6，默认 4
 *   shape   "polygon"（正多边形，默认）| "collinear"（共线）| "random"（撒点）
 *   seed    撒点的种子，默认 7（点「随机撒点」会换种子）
 *
 * 「完美教具」五问：
 *   1. 动手量：拖任意一个点（点的位置就是"点集长什么样"这个自由参数），
 *      再拖点数 n。摸的是"几何位置 ⇒ 还剩多少种贴法切得开"这条因果。
 *   2. 即时后果：点一动，下面 2^n 块贴法砖当场重算——亮的切得开、
 *      暗的划掉（末尾带 ✕），读数条的分数与判词同一帧刷新。
 *   3. 读数：可分离贴法数 / 2^n、当前贴法能否实现、判词（打碎 ⇒ VC 维 ≥ n）、
 *      以及那条能切开它的直线的法向与阈值——与正文的 8/8、14/16 逐字对得上。
 *   4. 啊哈预设：「四点共线」掉到 8/16；「正方形」是 14/16，被划掉的恰是课文写的
 *      0110 与 1001（对角同色、邻边异色）；「随机撒点」把点拖成"一凸一内"，
 *      14 立刻掉到 12 甚至更少。
 *   5. 默认状态讲对故事：默认正方形 4 点、当前贴法取全 +1，读数直接是 14/16，
 *      与正文那句"任意四点最多 14/16"当场对上；随手点一块 ✕ 砖，
 *      画布上立刻没有那条绿线——"切不开"是看得见的。
 *
 * 口径：可分离性用**精确**判据，不是采样——半平面把点按方向 u 的投影劈成
 * "投影最大的那一段"，而投影次序只在 u 垂直于某两点连线时才变；于是只需在
 * 每两个临界角之间取一个代表方向，枚举全部"沿投影切开"的贴法（正反两个方向
 * 都要，因为 u 与 −u 给出相反的次序），就穷尽了所有被半平面切开的可能。
 * 重合的投影不许被切开，按块处理。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildToolbar, mkBtn, label, clearBg, clamp, fmt, mulberry32, el,
} from '../core.js';

/* 枚举全部可分离贴法：返回长度 2^n 的数组，元素为 {u, c} 或 null（c 为阈值，u·x > c 记 +1） */
function enumerate(pts) {
  const n = pts.length;
  const total = 1 << n;
  const out = new Array(total).fill(null);

  /* 临界方向：u·(p_j − p_i) = 0，即 θ = 角(p_j − p_i) + π/2（取模 π） */
  const crit = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dx = pts[j][0] - pts[i][0];
      const dy = pts[j][1] - pts[i][1];
      if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) continue;
      crit.push(((Math.atan2(dy, dx) + Math.PI / 2) % Math.PI + Math.PI) % Math.PI);
    }
  }
  crit.sort((a, b) => a - b);
  const dirs = [];
  if (!crit.length) {
    dirs.push(0);
  } else {
    for (let k = 0; k < crit.length; k += 1) {
      const a0 = crit[k];
      const a1 = k + 1 < crit.length ? crit[k + 1] : crit[0] + Math.PI;
      dirs.push((a0 + a1) / 2);
    }
  }

  for (const th of dirs) {
    const u = [Math.cos(th), Math.sin(th)];
    const proj = pts.map((p, i) => ({ i, v: p[0] * u[0] + p[1] * u[1] }));
    proj.sort((a, b) => b.v - a.v);           /* 从大到小 */
    const blocks = [];                          /* 投影相同的一列点算一块，不能劈开 */
    for (const q of proj) {
      const last = blocks[blocks.length - 1];
      if (last && Math.abs(last.v - q.v) < 1e-9) last.ids.push(q.i);
      else blocks.push({ v: q.v, ids: [q.i] });
    }
    for (let k = 1; k <= blocks.length; k += 1) {
      const hi = blocks.slice(0, k);
      const lo = blocks.slice(k);
      if (!lo.length) continue;
      const c = (hi[hi.length - 1].v + lo[0].v) / 2;
      let mHi = 0;
      let mLo = 0;
      hi.forEach((b) => b.ids.forEach((i) => { mHi |= 1 << i; }));
      lo.forEach((b) => b.ids.forEach((i) => { mLo |= 1 << i; }));
      if (!out[mHi]) out[mHi] = { u, c };
      if (!out[mLo]) out[mLo] = { u: [-u[0], -u[1]], c: -c };
    }
  }
  /* 全同色的两个贴法：任何一条不穿过点的线都在外面 */
  out[0] = { u: [1, 0], c: 1e9, trivial: true };
  out[total - 1] = { u: [1, 0], c: -1e9, trivial: true };
  return out;
}

/* 正多边形，但**按"从下到上、从左到右"重新编号**（先 y 后 x，1e-9 容差）：
   这样四点就是正文里 P4 = 左下、右下、左上、右上的顺序，
   被划掉的两块正好复现课文写的 0110 与 1001。 */
function polygon(n) {
  const raw = [];
  for (let i = 0; i < n; i += 1) {
    const th = (i / n) * Math.PI * 2 - Math.PI / 2;
    raw.push([0.5 + 0.34 * Math.cos(th), 0.5 + 0.34 * Math.sin(th)]);
  }
  raw.sort((a, b) => (Math.abs(a[1] - b[1]) > 1e-9 ? a[1] - b[1] : a[0] - b[0]));
  return raw;
}
function collinear(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push([0.16 + 0.68 * t, 0.2 + 0.6 * t]);
  }
  return out;
}
function scatter(n, seed) {
  const rnd = mulberry32(seed >>> 0);
  const out = [];
  for (let i = 0; i < n; i += 1) out.push([0.18 + 0.64 * rnd(), 0.18 + 0.64 * rnd()]);
  return out;
}

export default function render(host, spec) {
  let n = clamp(Math.round(Number(spec.n) || 4), 3, 6);
  let shape = spec.shape === 'collinear' ? 'collinear' : spec.shape === 'random' ? 'random' : 'polygon';
  let seed = Number.isFinite(spec.seed) ? spec.seed : 7;
  let pts = shape === 'collinear' ? collinear(n) : shape === 'random' ? scatter(n, seed) : polygon(n);
  let mask = 0;
  let reach = [];

  const cv = setupCanvas(host, 300);
  cv.canvas.classList.add('ml-drag');
  const tiles = el('div');
  tiles.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:8px 0 4px';
  host.appendChild(tiles);
  const ro = buildReadout({
    可分离: '—', 全部贴法: '—', 当前贴法: '—', 判词: '—', 切线: '—',
  });
  host.appendChild(ro.box);

  const geo = { x0: 0, y0: 0, s: 1 };
  const X = (u) => geo.x0 + u * geo.s;
  const Y = (v) => geo.y0 + (1 - v) * geo.s;

  function buildTiles() {
    tiles.textContent = '';
    const C = themeColors();
    for (let m = 0; m < (1 << n); m += 1) {
      const ok = !!reach[m];
      const cur = m === mask;
      const bits = m.toString(2).padStart(n, '0');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ok ? bits : bits + ' ✕';
      b.style.cssText = 'font:600 11px ui-monospace,SFMono-Regular,monospace;padding:3px 6px;'
        + 'border-radius:5px;cursor:pointer;letter-spacing:0.03em;'
        + 'border:1px solid ' + (cur ? C.accent : ok ? C.ok : C.axis) + ';'
        + 'background:' + (cur ? C.accent : ok ? 'transparent' : C.soft) + ';'
        + 'color:' + (cur ? C.bg : ok ? C.fg : C.axis) + ';'
        + 'opacity:' + (ok ? 1 : 0.7) + ';'
        + 'text-decoration:' + (ok ? 'none' : 'line-through');
      b.title = ok ? '贴法 ' + bits + '：有直线能切开' : '贴法 ' + bits + '：任何直线都切不成这样';
      b.addEventListener('click', () => { mask = m; draw(); });
      tiles.appendChild(b);
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    geo.s = Math.min(W, H) - 40;
    geo.x0 = (W - geo.s) / 2;
    geo.y0 = (H - geo.s) / 2;

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(X(0), Y(1), geo.s, geo.s);

    const info = reach[mask];
    if (info && !info.trivial) {
      const [ux, uy] = info.u;
      const cx = info.c * ux;
      const cy = info.c * uy;
      const dx = -uy * 0.95;
      const dy = ux * 0.95;
      ctx.strokeStyle = C.ok;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(X(cx - dx), Y(cy - dy));
      ctx.lineTo(X(cx + dx), Y(cy + dy));
      ctx.stroke();
    }

    for (let i = 0; i < n; i += 1) {
      const px = X(pts[i][0]);
      const py = Y(pts[i][1]);
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fillStyle = (mask >> i) & 1 ? C.accent2 : C.accent;
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, String(i + 1), px, py + 1, C.bg, { size: 11, weight: 700, align: 'center' });
    }

    label(ctx, '橙 = +1，蓝 = −1；拖点改几何', 8, 15, C.axis, { size: 11 });
    label(ctx, info ? (info.trivial ? '全同色：随便一条线都切得开' : '绿线就是那条切线')
      : '任何直线都切不成这样', W - 8, 15, info ? C.ok : C.bad, { size: 11, align: 'right' });
  }

  function refresh() {
    reach = enumerate(pts);
    const total = 1 << n;
    const k = reach.filter(Boolean).length;
    buildTiles();
    draw();
    const info = reach[mask];
    const bits = mask.toString(2).padStart(n, '0');
    ro.set('可分离', k + ' / ' + total);
    ro.set('全部贴法', '2^' + n + ' = ' + total + '，其中 ' + (total - k) + ' 种切不开');
    ro.set('当前贴法', bits + (info ? '　✓ 切得开' : '　✗ 切不开'));
    ro.set('判词', k === total
      ? n + ' 个点被打碎了 ⇒ VC 维 ≥ ' + n
      : '没打碎：直线族在这 ' + n + ' 个点上只覆盖 ' + k + '/' + total);
    ro.set('切线', info && !info.trivial
      ? 'u = (' + fmt(info.u[0], 3) + ', ' + fmt(info.u[1], 3) + ')，阈值 ' + fmt(info.c, 3)
      : '—');
  }

  let drag = -1;
  bindPointer(cv.canvas, {
    pick(px, py) {
      for (let i = 0; i < n; i += 1) {
        if (Math.hypot(X(pts[i][0]) - px, Y(pts[i][1]) - py) < 18) return i;
      }
      return -1;
    },
    down(id) { drag = typeof id === 'number' ? id : -1; },
    move(id, px, py) {
      const i = typeof id === 'number' ? id : drag;
      if (i < 0) return;
      pts[i] = [
        clamp((px - geo.x0) / geo.s, 0.03, 0.97),
        clamp(1 - (py - geo.y0) / geo.s, 0.03, 0.97),
      ];
      refresh();
    },
    up() { drag = -1; },
  });

  function reset(nextN, nextShape) {
    n = nextN;
    shape = nextShape;
    pts = shape === 'collinear' ? collinear(n) : shape === 'random' ? scatter(n, seed) : polygon(n);
    mask = 0;
    refresh();
  }

  function btn(text, fn) {
    const b = mkBtn(text);
    b.addEventListener('click', fn);
    return b;
  }
  const bar = buildToolbar(
    btn('正三角形', () => reset(3, 'polygon')),
    btn('正方形', () => reset(4, 'polygon')),
    btn('正六边形', () => reset(6, 'polygon')),
    btn('四点共线', () => reset(4, 'collinear')),
    btn('随机撒点', () => { seed = (seed * 1103515245 + 12345) % 2147483647; reset(n, 'random'); }),
  );
  host.appendChild(bar);

  const sl = buildSliders({
    sliders: [{ name: 'n', label: '点数 n', min: 3, max: 6, step: 1, value: n }],
  }, (state) => {
    const want = clamp(Math.round(state.n), 3, 6);
    if (want !== n) reset(want, shape);
  });
  host.appendChild(sl.box);

  refresh();

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}