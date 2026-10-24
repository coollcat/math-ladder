/* =========================================================================
 * lab 组件：betti-homology —— 数洞不靠眼睛，靠两个秩
 *                     （第 58 章 · 58 课《同调与 Betti 数：数一数有几个洞》）
 * -------------------------------------------------------------------------
 * 演示什么：Betti 数是"算出来的"，不是"看出来的"。一块复形只给三个计数
 *   V / E / F，同调再把它们拆细（全程 Z2 系数，加法就是异或）：
 *     beta0 = V - rank(d1)              连通块数
 *     beta1 = E - rank(d1) - rank(d2)   一维洞数
 *     beta2 = F - rank(d2)              空腔数
 *   点任意一条边可以把它删掉 / 补回来，三个 Betti 数当场重算：一个洞
 *   就是"多出来的一条边"，一块面就是"补上去的那块皮"，账本立刻显示出来。
 *   边一删，靠它的面跟着塌 —— ∂∂ = 0 的具体样子。
 *
 * 五组预设（数字全部与课文例题对得上）：
 *   · 四边圆周 V=4 E=4 F=0：chi=0，beta=(1,1,0) —— 空心三角形就是圆周；
 *   · 填面三角形 V=3 E=3 F=1：chi=1，beta=(1,0,0) —— 洞被面补死；
 *   · 四面体边界 V=4 E=6 F=4：chi=2，beta=(1,0,1) —— 包住一个空腔；
 *   · 两个分离三角形 V=6 E=6：chi=0，beta=(2,2,0) —— 两片，两洞；
 *   · 3×3 环面网格 V=9 E=27 F=18：chi=0，beta=(1,2,1) —— 环面的指纹。
 *   无论怎么增删，chi = beta0 - beta1 + beta2 恒成立，底栏一直在核这条账。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "betti-homology",
 *     "title": "同一块复形，补一条边 beta1 就从 1 跳到 2",
 *     "preset": "circle" }
 *
 * 字段（都可省）：
 *   preset  "circle"（默认）| "disk" | "sphere" | "two" | "torus"
 *   faces   初始是否把预设的面全部补上，true / false；不给就用预设的默认值
 *   height  画布高度，默认 400
 *
 * 交互（完美教具五问）：
 *   1. 动手量：点任意一条边增删它 —— 对应"复形的 1-骨架怎么搭"这个自由选择；
 *      按预设换空间，等于换一道题。
 *   2. 即时后果：被点的边立刻由实线变虚线（或反之），V E F、三个 Betti 数、
 *      chi 一帧之内全部重算。
 *   3. 读数：V / E / F / beta0 / beta1 / beta2 / chi / 状态 八行；数字与课文
 *      例 2（圆周 beta1=1）、例 3（球面 beta2=1）、例 4（两个孔 beta1=2）逐项对上。
 *   4. 啊哈预设：circle 上按「加一条弦」——beta1 从 1 跳到 2、chi 从 0 掉到 -1；
 *      再按「补上所有面」，beta1 被面打回 0、chi 回到 1。洞与面的会计关系
 *      一次看完。
 *   5. 默认状态：circle，V=4 E=4 F=0，beta=(1,1,0)、chi=0，正是课文里
 *      "空心三角形是圆周"那一条。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildSegmented,
  buildReadout, mkBtn, label, clearBg, clamp,
} from '../core.js';

/* 预设复形。pos 是单位方块里的顶点坐标；edges 是初始活着的边；
   extra 是可以一键补上、但一开始不在的边（"加一条弦"用）；
   tris 是这个复形真正该有的二维面（顶点三元组），fill 是初始是否补上。
   注意：环面不能靠"所有能拼的三角形"去补 —— 那样会拼出 27 个面、把亏格
   拼没了。面表必须跟着构造走，V=9 E=27 F=18 才是环面。 */
const PRESETS = {
  circle: {
    label: '四边圆周',
    pos: [[0.5, 0.10], [0.90, 0.50], [0.5, 0.90], [0.10, 0.50]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0]],
    extra: [[0, 2]],
    tris: [[0, 1, 2], [0, 2, 3]],
    fill: false,
  },
  disk: {
    label: '填面三角形',
    pos: [[0.5, 0.12], [0.90, 0.84], [0.10, 0.84]],
    edges: [[0, 1], [1, 2], [2, 0]],
    extra: [],
    tris: [[0, 1, 2]],
    fill: true,
  },
  sphere: {
    label: '四面体边界',
    pos: [[0.5, 0.08], [0.92, 0.52], [0.22, 0.86], [0.78, 0.90]],
    edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
    extra: [],
    tris: [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]],
    fill: true,
  },
  two: {
    label: '两个分离三角形',
    pos: [[0.08, 0.18], [0.44, 0.18], [0.26, 0.62],
      [0.56, 0.44], [0.92, 0.44], [0.74, 0.88]],
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]],
    extra: [],
    tris: [[0, 1, 2], [3, 4, 5]],
    fill: false,
  },
  torus: {
    label: '3×3 环面网格',
    pos: null,                                   /* 由 torusComplex() 现场生成 */
    edges: null,
    extra: [],
    tris: null,
    fill: true,
  },
};

const ekey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

/* 3×3 环面网格：9 个顶点、每个胞腔拆成两个三角形。
   结果 V=9、E=27、F=18，chi = 9-27+18 = 0，beta = (1,2,1) —— 环面的指纹。
   顶点编号按行列排，胞腔 (i,j) 的第四个角绕回 0，所以周长方向是循环的。 */
function torusComplex() {
  const pos = [];
  for (let j = 0; j < 3; j += 1) {
    for (let i = 0; i < 3; i += 1) pos.push([0.13 + i * 0.37, 0.13 + j * 0.37]);
  }
  const vid = (i, j) => (((j % 3) + 3) % 3) * 3 + (((i % 3) + 3) % 3);
  const edges = [];
  const seen = new Set();
  const addE = (a, b) => {
    const k = ekey(a, b);
    if (seen.has(k)) return;
    seen.add(k);
    edges.push(a < b ? [a, b] : [b, a]);
  };
  const tris = [];
  for (let j = 0; j < 3; j += 1) {
    for (let i = 0; i < 3; i += 1) {
      const a = vid(i, j);
      const b = vid(i + 1, j);
      const c = vid(i + 1, j + 1);
      const d = vid(i, j + 1);
      addE(a, b); addE(b, c); addE(a, c); addE(c, d); addE(d, a);
      tris.push([a, b, c]);
      tris.push([a, c, d]);
    }
  }
  return { pos, edges, tris };
}

/* 模 2 高斯消元求秩。行 = 定义域的一组坐标，列 = 值域的坐标。 */
function rankGF2(rows, ncols) {
  const M = rows.map((r) => r.slice());
  let r = 0;
  for (let c = 0; c < ncols && r < M.length; c += 1) {
    let piv = -1;
    for (let i = r; i < M.length; i += 1) if (M[i][c]) { piv = i; break; }
    if (piv < 0) continue;
    const tmp = M[r]; M[r] = M[piv]; M[piv] = tmp;
    for (let i = 0; i < M.length; i += 1) {
      if (i !== r && M[i][c]) {
        for (let j = 0; j < ncols; j += 1) M[i][j] ^= M[r][j];
      }
    }
    r += 1;
  }
  return r;
}

export default function render(host, spec) {
  const st = {
    preset: PRESETS[spec.preset] ? spec.preset : 'circle',
    pos: [],
    all: [],                                     /* 图上可能出现过的全部边（含预留的弦） */
    on: new Set(),                               /* 当前活着的边 */
    tris: [],                                    /* 预设声明的二维面 */
    fill: false,
    hover: null,
  };

  const cv = setupCanvas(host, clamp(spec.height || 400, 340, 700));
  const ro = buildReadout({
    V: '—', E: '—', F: '—',
    beta0: '—', beta1: '—', beta2: '—',
    chi: '—', 状态: '—',
  });
  host.appendChild(ro.box);

  const bChord = mkBtn('加一条弦');
  const bFill = mkBtn('补上所有面');
  const bReset = mkBtn('回到预设');
  host.appendChild(buildToolbar(bChord, bFill, bReset));

  const segKeys = Object.keys(PRESETS);
  const seg = buildSegmented(
    segKeys.map((k) => ({ label: PRESETS[k].label, value: k })),
    st.preset,
    (v) => { st.preset = v; loadPreset(); },
  );
  host.appendChild(seg);
  const segBtns = Array.from(seg.children);
  function syncSeg() {
    segBtns.forEach((b, i) => { b.classList.toggle('is-active', segKeys[i] === st.preset); });
  }

  function loadPreset() {
    const base = PRESETS[st.preset];
    const src = base.pos ? base : torusComplex();
    st.pos = src.pos;
    st.all = src.edges.concat(base.extra || []);
    st.on = new Set(src.edges.map((e) => ekey(e[0], e[1])));
    st.tris = src.tris || [];
    st.fill = typeof spec.faces === 'boolean' ? spec.faces : base.fill;
    st.hover = null;
    syncSeg();
    draw();
  }

  /* 由"活着的边"推出复形：面还要三条边都在才算数（边一删，面就塌）。
     这正是 ∂∂ = 0 的现场：面的边界由边组成，边没了，面也就不存在了。 */
  function complex() {
    const edges = st.all.filter((e) => st.on.has(ekey(e[0], e[1])));
    const set = new Set(edges.map((e) => ekey(e[0], e[1])));
    const faces = st.fill
      ? st.tris.filter((f) => (
        set.has(ekey(f[0], f[1])) && set.has(ekey(f[1], f[2])) && set.has(ekey(f[0], f[2]))
      ))
      : [];
    return { pos: st.pos, edges, faces, allEdges: st.all };
  }

  /* 同调账本：d1 是 E×V，d2 是 F×E，全程模 2。 */
  function hom() {
    const a = complex();
    const V = a.pos.length;
    const E = a.edges.length;
    const F = a.faces.length;
    const idx = new Map();
    a.edges.forEach((e, i) => idx.set(ekey(e[0], e[1]), i));
    const d1 = a.edges.map((e) => {
      const row = new Array(V).fill(0);
      row[e[0]] ^= 1;
      row[e[1]] ^= 1;
      return row;
    });
    const d2 = a.faces.map((f) => {
      const row = new Array(E).fill(0);
      for (let k = 0; k < 3; k += 1) {
        const i = idx.get(ekey(f[k], f[(k + 1) % 3]));
        if (i !== undefined) row[i] ^= 1;
      }
      return row;
    });
    const r1 = rankGF2(d1, V);
    const r2 = rankGF2(d2, E);
    return {
      V, E, F, r1, r2,
      b0: V - r1, b1: E - r1 - r2, b2: F - r2,
      chi: V - E + F,
    };
  }

  /* 单位方块 → 画布：上方留 26px 说明，下方留 34px 恒等式横幅 */
  function mapper(W, H) {
    const pad = 26;
    const s = Math.max(40, Math.min(W - pad * 2, H - 26 - 34 - pad));
    const ox = (W - s) / 2;
    const oy = 26 + Math.max(0, (H - 26 - 34 - s) / 2);
    return (p) => [ox + p[0] * s, oy + p[1] * s];
  }

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    if (W < 40) return;
    clearBg(cv.ctx, W, H, C);
    const ctx = cv.ctx;
    const a = complex();
    const h = hom();
    const map = mapper(W, H);

    label(ctx, '点一条边增删它：边一删，靠它的面一起塌', 12, 18,
      C.fg, { size: 12, weight: 600 });

    a.faces.forEach((f) => {
      const p = f.map((i) => map(a.pos[i]));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      ctx.lineTo(p[1][0], p[1][1]);
      ctx.lineTo(p[2][0], p[2][1]);
      ctx.closePath();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.restore();
    });

    /* 已被点掉的边画成虚线灰影：它本来在这里，读者要能看见"缺了什么" */
    a.allEdges.forEach((e) => {
      if (st.on.has(ekey(e[0], e[1]))) return;
      const p0 = map(a.pos[e[0]]);
      const p1 = map(a.pos[e[1]]);
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
      ctx.restore();
    });

    a.edges.forEach((e) => {
      const p0 = map(a.pos[e[0]]);
      const p1 = map(a.pos[e[1]]);
      const hot = st.hover === ekey(e[0], e[1]);
      ctx.save();
      ctx.strokeStyle = hot ? C.accent2 : C.fg;
      ctx.lineWidth = hot ? 4 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
      ctx.restore();
    });

    a.pos.forEach((p, i) => {
      const q = map(p);
      ctx.save();
      ctx.beginPath();
      ctx.arc(q[0], q[1], 4.5, 0, Math.PI * 2);
      ctx.fillStyle = C.fg;
      ctx.fill();
      ctx.restore();
      if (a.pos.length <= 6) label(ctx, 'v' + i, q[0] + 7, q[1] - 6, C.fg, { size: 10 });
    });

    const rhs = h.b0 - h.b1 + h.b2;
    const okChi = h.chi === rhs;
    label(ctx,
      'chi = V-E+F = ' + h.V + '-' + h.E + '+' + h.F + ' = ' + h.chi
      + '    |    beta0-beta1+beta2 = ' + rhs + (okChi ? '  ok' : '  BAD'),
      12, H - 12, okChi ? C.ok : C.bad, { size: 12, weight: 600 });

    ro.set('V', String(h.V));
    ro.set('E', String(h.E));
    ro.set('F', String(h.F));
    ro.set('beta0', String(h.b0));
    ro.set('beta1', String(h.b1));
    ro.set('beta2', String(h.b2));
    ro.set('chi', String(h.chi));
    ro.set('状态', 'rank(d1)=' + h.r1 + '，rank(d2)=' + h.r2
      + (h.b1 > 0 ? '：还有 ' + h.b1 + ' 个洞没被面补死' : '：洞都被面补死了'));
  }

  function pickEdge(x, y) {
    const a = complex();
    const map = mapper(cv.W, cv.H);
    let best = null;
    let bestD = 13;
    a.allEdges.forEach((e) => {
      const p0 = map(a.pos[e[0]]);
      const p1 = map(a.pos[e[1]]);
      const vx = p1[0] - p0[0];
      const vy = p1[1] - p0[1];
      const len2 = vx * vx + vy * vy;
      let t = len2 ? ((x - p0[0]) * vx + (y - p0[1]) * vy) / len2 : 0;
      t = clamp(t, 0, 1);
      const d = Math.hypot(x - (p0[0] + t * vx), y - (p0[1] + t * vy));
      if (d < bestD) { bestD = d; best = ekey(e[0], e[1]); }
    });
    return best;
  }

  bindPointer(cv.canvas, {
    pick: pickEdge,
    down(id) {
      if (st.on.has(id)) st.on.delete(id); else st.on.add(id);
      draw();
    },
    hover(x, y) {
      const k = pickEdge(x, y);
      if (k !== st.hover) { st.hover = k; draw(); }
    },
    leave() {
      if (st.hover !== null) { st.hover = null; draw(); }
    },
  });

  /* 加一条弦：把预设预留的对角线接上（只有 circle 预留了 0-2）。
     接上之后 beta1 从 1 跳到 2、chi 从 0 掉到 -1 —— 本课的反例按钮。 */
  bChord.addEventListener('click', () => {
    (PRESETS[st.preset].extra || []).forEach((e) => st.on.add(ekey(e[0], e[1])));
    draw();
  });
  bFill.addEventListener('click', () => { st.fill = true; draw(); });
  bReset.addEventListener('click', () => { loadPreset(); });

  loadPreset();

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}
