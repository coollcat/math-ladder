/* =========================================================================
 * lab 组件：sigma-algebra-lattice —— 规定几条，闭包替你长出剩下的全部
 *                     （第 25 章 · 15 课《sigma-代数与 Borel 集》）
 * -------------------------------------------------------------------------
 * 演示什么：sigma-代数不是"随手凑一堆子集"，而是"你对哪些事件能问概率"的
 *   最小闭集体。X = {0,1,2} 一共只有 8 个子集，可以全部摊在桌上数：
 *   · 上半是 X 的三个点，同色的点落在同一个原子 —— 原子就是你真的能分辨的粒度；
 *   · 下半是 8 张成员卡：亮着的是进了 F 的，灰的是没进的，卡内三个小方块
 *     逐位显示"这个子集含不含 0 / 1 / 2"；
 *   · 点上半的点（或直接点卡片）增删生成元，闭包当场长出补集与并集。
 *
 * 为什么不是"随便凑"：X={0,1,2} 上全体 sigma-代数只有 5 个，大小分别是
 *   2、4、4、4、8 —— 4 永远不缺席，6 永远造不出来。永远满足 |F| = 2^(原子数)。
 *   这就是本课的算术骨架。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "sigma-algebra-lattice",
 *     "title": "三点的 sigma-代数：闭包只肯给你 2 的幂",
 *     "gens": [0],
 *     "mode": "sigma" }
 *
 * 字段（都可省）：
 *   gens    生成元数组，每项是元素下标 0/1/2（表示把单点集 {0} / {1} / {2}
 *           规定进 F），默认 [0]
 *   mode    "sigma"（默认，画闭包）| "union"（画两个 sigma-代数之并的反例）
 *   height  画布高度，默认 430
 *
 * 交互（完美教具五问）：
 *   1. 动手量：点 X 的三个点增删生成元 —— 对应概念里唯一的自由参数
 *      "你事先规定了多少信息"。
 *   2. 即时后果：一帧之内，8 张成员卡亮灭重排、三个点重新按原子着色、读数换新。
 *   3. 读数：|F| / 原子划分 / 2^原子数 / 状态四行。|F| 与课文"5 个 sigma-代数、
 *      大小 2/4/4/4/8"逐个对得上；原子划分与"sigma({0}) = {空集, X, {0}, {1,2}}"
 *      逐字对得上。
 *   4. 啊哈预设：「并集反例」一键切到 sigma({0}) 并 sigma({1})：只亮 6 张卡，
 *      {0,1} 被红框圈出 —— 少了它就不闭合，6 个成员根本不是 sigma-代数。
 *   5. 默认状态：gens=[0]，|F|=4，原子 {0} 与 {1,2}，正是课文实验 1 的第一个例子。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildSegmented,
  buildReadout, mkBtn, label, clearBg, clamp,
} from '../core.js';

/* X = {0,1,2}，子集用 3 位掩码表示（第 i 位 = 元素 i 在不在集合里） */
const N = 3;
const FULL = (1 << N) - 1;                       /* 7 = {0,1,2} */
/* 成员卡的固定陈列顺序：空集、三个单点、三个对、全集。
   这个顺序让"亮了几张、缺的是哪张"一眼可数。 */
const ORDER = [0, 1, 2, 4, 3, 5, 6, 7];

function bitsOf(m) {
  const out = [];
  for (let i = 0; i < N; i += 1) if ((m >> i) & 1) out.push(i);
  return out;
}

function setName(m) {
  if (m === 0) return '\u2205';
  return '{' + bitsOf(m).join(',') + '}';
}

/* 闭包：从生成元出发，反复补「补集」与「有限并」，直到不再长出新成员。
   两轮各自拍快照，避免边遍历边改 Set。 */
function closureOf(gens) {
  const F = new Set([0, FULL]);
  gens.forEach((g) => { F.add(1 << g); });
  let grew = true;
  while (grew) {
    grew = false;
    Array.from(F).forEach((a) => {
      const c = FULL ^ a;
      if (!F.has(c)) { F.add(c); grew = true; }
    });
    const snap = Array.from(F);
    snap.forEach((a) => {
      snap.forEach((b) => {
        const u = a | b;
        if (!F.has(u)) { F.add(u); grew = true; }
      });
    });
  }
  return F;
}

/* 原子：包含元素 x 的所有 F 成员之交，就是"x 所在的最小可分辨块"。
   F 是 sigma-代数时每个元素落在唯一一块里，块数 k 满足 |F| = 2^k。 */
function atomsOf(F) {
  const out = [];
  for (let x = 0; x < N; x += 1) {
    let s = FULL;
    F.forEach((a) => { if ((a >> x) & 1) s &= a; });
    if (!out.includes(s)) out.push(s);
  }
  return out.sort((a, b) => a - b);              /* 排序只为让配色稳定 */
}

/* 并集反例：sigma({0}) 并 sigma({1})。它有 6 个成员，但 {0} 与 {1} 的并
   {0,1} 不在里面 —— 习题里最经典的那个"并集不闭合"。 */
function unionCase() {
  const U = new Set();
  closureOf([0]).forEach((a) => U.add(a));
  closureOf([1]).forEach((a) => U.add(a));
  const members = Array.from(U);
  const missing = [];
  members.forEach((a) => {
    members.forEach((b) => {
      const u = a | b;
      if (!U.has(u) && !missing.includes(u)) missing.push(u);
    });
  });
  return { F: U, missing: missing.sort((a, b) => a - b) };
}

export default function render(host, spec) {
  const st = {
    mode: spec.mode === 'union' ? 'union' : 'sigma',
    gens: new Set(Array.isArray(spec.gens)
      ? spec.gens.map((g) => clamp(Math.round(Number(g) || 0), 0, N - 1))
      : [0]),
    sigma: new Set(),
    active: new Set(),
    atoms: [],
    missing: [],
    hover: null,
  };

  const cv = setupCanvas(host, clamp(spec.height || 430, 340, 720));
  const ro = buildReadout({ '|F|': '—', 原子: '—', '2^原子数': '—', 状态: '—' });
  host.appendChild(ro.box);

  const bClear = mkBtn('清空生成元（最粗）');
  const bPair = mkBtn('再加 {1}');
  const bFull = mkBtn('全幂集（最细）');
  host.appendChild(buildToolbar(bClear, bPair, bFull));

  const seg = buildSegmented(
    [{ label: 'sigma-代数', value: 'sigma' }, { label: '并集反例', value: 'union' }],
    st.mode,
    (v) => { st.mode = v; recompute(); draw(); },
  );
  host.appendChild(seg);
  /* buildSegmented 只返回盒子、不返回 setter，切模式时手动同步高亮 */
  const segBtns = Array.from(seg.children);
  function syncSeg() {
    segBtns.forEach((b, i) => {
      b.classList.toggle('is-active', (i === 0 ? 'sigma' : 'union') === st.mode);
    });
  }

  function recompute() {
    st.sigma = closureOf(Array.from(st.gens));
    const u = unionCase();
    st.active = st.mode === 'union' ? u.F : st.sigma;
    st.missing = st.mode === 'union' ? u.missing : [];
    st.atoms = atomsOf(st.sigma);
  }

  function setGens(list) {
    st.gens = new Set(list);
    st.mode = 'sigma';
    syncSeg();
    recompute();
    draw();
  }

  /* 布局：上半 X 上的三个点，下半 8 张成员卡（4 列 2 行）。 */
  function geom(W) {
    const r = clamp(W * 0.055, 16, 28);
    const cy = 84;
    const cols = 4;
    const gapX = 8;
    const gapY = 8;
    const cw = (W - 24 - gapX * (cols - 1)) / cols;
    return {
      r, cy, cols, gapX, gapY, cw, ch: 56,
      cx: [W * 0.26, W * 0.5, W * 0.74],
      x0: 12, y0: 196,
    };
  }

  function cardRect(g, idx) {
    const col = idx % g.cols;
    const row = Math.floor(idx / g.cols);
    return {
      x: g.x0 + col * (g.cw + g.gapX),
      y: g.y0 + row * (g.ch + g.gapY),
      w: g.cw,
      h: g.ch,
    };
  }

  /* 点 x 落在哪个原子块里 —— 上半三个点的颜色由此决定。 */
  function atomOfPoint(x) {
    let s = FULL;
    st.sigma.forEach((a) => { if ((a >> x) & 1) s &= a; });
    return s;
  }

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    if (W < 40) return;
    clearBg(cv.ctx, W, H, C);
    const ctx = cv.ctx;
    const g = geom(W);
    const k = st.atoms.length;

    /* ---- 上半：X 的三个点 ---- */
    label(ctx, 'X = {0,1,2}：同色的点属于同一个原子', 12, 22, C.fg, { size: 12, weight: 600 });
    for (let i = 0; i < N; i += 1) {
      const cx = g.cx[i];
      const at = atomOfPoint(i);
      const ai = st.atoms.indexOf(at);
      const col = C.series(ai < 0 ? 0 : ai);
      const isGen = st.gens.has(i);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, g.cy, g.r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.26;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = isGen ? 3.5 : 1.5;
      ctx.strokeStyle = isGen ? C.accent2 : col;
      ctx.stroke();
      ctx.restore();
      label(ctx, String(i), cx, g.cy + 6, C.fg, { size: 17, weight: 700, align: 'center' });
      label(ctx, isGen ? '生成元' : '点我加入', cx, g.cy + g.r + 16,
        isGen ? C.accent2 : C.fg, { size: 11, align: 'center' });
    }
    label(ctx,
      st.mode === 'union'
        ? '并集里原子不再构成划分（红框成员缺席）'
        : '原子划分：' + st.atoms.map(setName).join('  |  ') + '   →  |F| = 2^' + k,
      12, 160, C.fg, { size: 12 });

    /* ---- 下半：8 张成员卡 ---- */
    label(ctx,
      st.mode === 'union'
        ? '两个 sigma-代数之并：6 个成员，红框是缺的那个'
        : 'X 的全部 8 个子集：亮着 = 在 F 里（' + st.active.size + ' 个）',
      12, 184, C.fg, { size: 12, weight: 600 });

    for (let idx = 0; idx < ORDER.length; idx += 1) {
      const m = ORDER[idx];
      const rc = cardRect(g, idx);
      const inF = st.active.has(m);
      const missing = st.missing.indexOf(m) >= 0;
      const hot = st.hover === 'card' + idx;
      ctx.save();
      ctx.fillStyle = inF ? C.accent : C.soft;
      ctx.globalAlpha = inF ? 0.22 : 0.55;
      ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      ctx.globalAlpha = 1;
      ctx.lineWidth = missing ? 2.5 : (hot ? 2 : 1);
      ctx.strokeStyle = missing ? C.bad : (hot ? C.accent2 : (inF ? C.accent : C.grid));
      ctx.strokeRect(rc.x + 0.5, rc.y + 0.5, rc.w - 1, rc.h - 1);
      ctx.restore();

      label(ctx, setName(m), rc.x + rc.w / 2, rc.y + 20,
        inF ? C.fg : C.fg, { size: 12, weight: inF ? 600 : 400, align: 'center' });

      /* 三位小方块：这个子集含不含 0 / 1 / 2，与掩码位一一对应 */
      const bw = 12;
      const bgap = 3;
      const bx = rc.x + (rc.w - (bw * N + bgap * (N - 1))) / 2;
      for (let i = 0; i < N; i += 1) {
        const on = (m >> i) & 1;
        const px = bx + i * (bw + bgap);
        ctx.save();
        if (on) {
          ctx.fillStyle = inF ? C.accent : C.grid;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(px, rc.y + 30, bw, bw);
          ctx.globalAlpha = 1;
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = inF ? C.accent : C.grid;
        ctx.strokeRect(px + 0.5, rc.y + 30.5, bw - 1, bw - 1);
        ctx.restore();
        label(ctx, String(i), px + bw / 2, rc.y + 40,
          on ? C.bg : C.fg, { size: 9, align: 'center' });
      }
    }

    /* ---- 读数 ---- */
    if (st.mode === 'union') {
      ro.set('|F|', st.active.size + '（不是 2 的幂）');
      ro.set('原子', st.missing.map(setName).join('、') + ' 不在 F 里');
      ro.set('2^原子数', '—');
      ro.set('状态', '不闭合：{0}、{1} 都在，{0,1} 缺席');
      return;
    }
    ro.set('|F|', String(st.active.size));
    ro.set('原子', st.atoms.map(setName).join(' | '));
    ro.set('2^原子数', String(Math.pow(2, k)));
    ro.set('状态', st.gens.size === 0
      ? '最粗：只知道"一定发生"与"一定不发生"'
      : (st.active.size === FULL + 1 ? '最细：每个子集都能问概率' : '闭包里补集、并集都齐了'));
  }

  function pick(x, y) {
    const g = geom(cv.W);
    for (let i = 0; i < N; i += 1) {
      if (Math.hypot(x - g.cx[i], y - g.cy) <= g.r + 8) return 'pt' + i;
    }
    for (let idx = 0; idx < ORDER.length; idx += 1) {
      const rc = cardRect(g, idx);
      if (x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h) {
        return 'card' + idx;
      }
    }
    return null;
  }

  function toggleMember(m) {
    const next = new Set(st.gens);
    if (next.has(m)) next.delete(m); else next.add(m);
    setGens(Array.from(next));
  }

  bindPointer(cv.canvas, {
    pick,
    down(id) {
      if (id.indexOf('pt') === 0) { toggleMember(Number(id.slice(2))); return; }
      const m = ORDER[Number(id.slice(4))];
      const next = new Set(st.gens);
      const bits = bitsOf(m);
      /* 点卡片：单点集 → 直接当生成元；多点集 → 把它拆成单点集全部加入 */
      if (m === 0 || m === FULL) return;
      bits.forEach((b) => {
        if (next.has(b)) next.delete(b); else next.add(b);
      });
      setGens(Array.from(next));
    },
    hover(x, y) {
      const h = pick(x, y);
      if (h !== st.hover) { st.hover = h; draw(); }
    },
    leave() {
      if (st.hover !== null) { st.hover = null; draw(); }
    },
  });

  bClear.addEventListener('click', () => { setGens([]); });
  bPair.addEventListener('click', () => {
    const next = new Set(st.gens);
    next.add(1);
    setGens(Array.from(next));
  });
  bFull.addEventListener('click', () => { setGens([0, 1, 2]); });

  syncSeg();
  recompute();
  cv.redraw = draw;
  draw();

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}
