/* =========================================================================
 * 知识图谱 · 章簇详图（/chapters）纯布局引擎
 * -------------------------------------------------------------------------
 * 无 React 依赖，可用 node 直接单测（与 ringLayout.js / treeLayout.js 同一套路数）。
 *
 * 与 /graph（同心环「阶梯星系」）的关系——**同一套骨架，两种粒度**：
 *   /graph    ：一章一颗圆点，半径＝层级。回答「整门学问从哪一层长出来」。
 *   本文件    ：一章一个**簇**——章是簇心，本章每一门课绕它排开，
 *               课级先修线全在里面。回答「这一章到底讲了些什么、怎么连的」。
 * 层级骨架直接复用 ringLayout.chapterModel()：环分配（难度分位 + 强边单调
 * 上修）与环内顺序（卷 → 难度）都是同一份算法算出来的，所以同一章在两张图上
 * 的「第几环」永远一致——不是巧合，是同一个 model。
 *
 * 三件跟 /graph 不同的地方，都是「簇比点大」逼出来的：
 *   ① **半径由课数定**：簇半径 cr = clamp(基径 + K√课数)，课多的章占的地儿大。
 *      取 √ 而不是线性：圆面积本来就正比于课数，线性会让 26 门课的章吃掉半张图。
 *   ② **环半径要解方程**：环上相邻两簇不能挨着。把每簇的张角写成
 *      2·asin((cr + 间隙/2) / r)，要求全环张角之和 ≤ 2π，对 r 二分求解——
 *      这是「一圈上摆 n 个大小不等的圆，外圈最小多大」的标准解法。
 *      朴素做法（写死一个最小弧长）在这里必然翻车：簇最大能到点的 8 倍宽。
 *   ③ **环间距也得让**：r_i − r_{i−1} ≥ crMax_{i−1} + crMax_i + 间隙，
 *      否则内环的大簇会顶穿外环的小簇。
 *
 * 中心那一簇是第 0 章「Python 工具箱」：它不参与数学先修链，同心环把它整章
 * 排除了，于是圆心空着。这一页要「详细到每一章」，正好把它放回圆心——
 * 它确实是全站的地基（sum / matplotlib 都在这儿出生），也确实是所有线的起点。
 *
 * 课点的排法：从**朝外**那个方向起排（k=0 在簇的正外侧），顺时针走，
 * 顺序＝课程顺序（NODES 已按 ch/ord 排好）。于是「章的外侧＝本章第一课」，
 * 想知道一章从哪儿开始看，看它朝外那一颗。
 * ========================================================================= */

import { chapterModel, RING_NAMES, RING_COUNT } from './ringLayout.js';

const TWO_PI = Math.PI * 2;

/** 布局参数。改这里等于改图，别在组件里另写一份。 */
export const CC = {
  ringCount: RING_COUNT,
  crBase: 17, /* 簇半径基径 */
  crK: 6.2, /* 每 √课数 的增量 */
  crMin: 34, /* 下限：再小就装不下「章号 + 一圈课点」 */
  crMax: 62, /* 上限：26 门课的章也就是 49，上限只是保险 */
  gap: 24, /* 同环相邻两簇之间的最小间隙 */
  radialGap: 26, /* 相邻两环之间的最小间隙 */
  dotR: 2.6, /* 课点半径 */
  hubK: 0.34, /* 簇心圆半径 = cr × 这个系数 */
  hubMin: 13,
  r0: 176, /* 最内环半径下限（给圆心那一簇留地儿） */
  labelPad: 130, /* 最外环之外留给标签的余量 */
  startAngle: -Math.PI / 2, /* 12 点方向起排 */
};

/**
 * 「一圈上摆大小不等的圆」：求最小环半径，使各圆张角之和 ≤ 2π。
 * 张角函数对 r 单调递减，二分即可。返回值保证 ≥ minR。
 */
function solveRingRadius(crs, minR, gap) {
  const sum = (r) => crs.reduce((s, cr) => s + 2 * Math.asin(Math.min(0.999, (cr + gap / 2) / r)), 0);
  const lo0 = Math.max(minR, ...crs.map((cr) => (cr + gap / 2) * 1.02));
  if (sum(lo0) <= TWO_PI) return lo0;
  let lo = lo0; /* sum > 2π（装不下） */
  let hi = lo0;
  for (let i = 0; i < 60 && sum(hi) > TWO_PI; i++) hi *= 1.6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (sum(mid) <= TWO_PI) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** 课数 → 簇半径。 */
export function clusterRadius(count, P = CC) {
  return Math.max(P.crMin, Math.min(P.crMax, P.crBase + P.crK * Math.sqrt(Math.max(count, 0))));
}

/**
 * 主入口。
 * @param {Array} NODES           full-graph-data 的课节点表（含 ch / ord / title / short / to）
 * @param {Array} EDGES           课级先修边 [a,b]
 * @param {Array} DEPTH           每门课的先修深度
 * @param {Array} flatChapters    allChapterGroups() 铺平后的章清单（含第 0 章、含 vi）
 * @param {object} opts           覆盖 CC 的任意项
 */
export function clusterLayout(NODES, EDGES, DEPTH, flatChapters, opts = {}) {
  const P = { ...CC, ...opts };
  const model = chapterModel(NODES, EDGES, DEPTH, flatChapters, { rings: P.ringCount });

  /* ---- 0. 圆心那一簇：第 0 章。chapterModel 按设计把它排除了，这里单独捞回来 ---- */
  const centerSrc = flatChapters.find((c) => c.n === 0) || null;

  /* ---- 1. 每环成员：沿用 ringLayout 的环分配，环内顺序也沿用（卷 → 难度 → 章号） ---- */
  const rings = model.rings.map((ring) => {
    const members = ring.chapters
      .map((n) => model.byN.get(n))
      .sort((a, b) => a.vi - b.vi || a.diff - b.diff || a.n - b.n)
      .map((c) => ({ ...c, cr: clusterRadius(c.count, P) }));
    return { ri: ring.ri, name: ring.name, diff: ring, members, crMax: Math.max(...members.map((m) => m.cr)) };
  });

  /* ---- 2. 环半径：先满足「径向不撞」（含圆心簇），再满足「周向装得下」 ---- */
  const ringR = [];
  let prevR = 0;
  let prevCrMax = centerSrc ? clusterRadius(centerSrc.count, P) : 0;
  rings.forEach((ring) => {
    const minR = Math.max(P.r0, prevR + prevCrMax + ring.crMax + P.radialGap);
    const r = solveRingRadius(ring.members.map((m) => m.cr), minR, P.gap);
    ringR.push(r);
    ring.ringR = r;
    prevR = r;
    prevCrMax = ring.crMax;
  });

  /* ---- 3. 摆位：每簇独占一段张角，段内居中，余量均分成缝 ---- */
  const clusters = new Map();
  const lessonPos = new Map(); /* NODES 下标 → {x, y, ang, ch} */

  const seat = (info, ring, angle, x, y, cr) => {
    const hubR = Math.max(P.hubMin, cr * P.hubK);
    const lessonR = cr - P.dotR - 5;
    const lessons = [];
    const indices = info.lessonsIndices || [];
    indices.forEach((i, k) => {
      const ang = angle + (k / Math.max(indices.length, 1)) * TWO_PI;
      const lx = x + Math.cos(ang) * lessonR;
      const ly = y + Math.sin(ang) * lessonR;
      lessons.push({ i, k, ang, x: lx, y: ly });
      lessonPos.set(i, { x: lx, y: ly, ang, ch: info.n });
    });
    const cluster = {
      n: info.n,
      title: info.title,
      short: info.short,
      to: info.to,
      count: indices.length,
      ring,
      angle,
      x,
      y,
      cr,
      hubR,
      lessonR,
      lessons,
      /* 标签挂在簇上方（水平文字，跟着 k 缩）：环内相邻两簇至少隔 gap，
         所以标签不会互相压；内外环之间半径差也让它们错开竖直位置。 */
      labelY: y - cr - 7,
    };
    clusters.set(info.n, cluster);
    return cluster;
  };

  rings.forEach((ring) => {
    const r = ring.ringR;
    const n = ring.members.length || 1;
    const halves = ring.members.map((m) => Math.asin(Math.min(0.999, (m.cr + P.gap / 2) / r)));
    const spare = Math.max(0, TWO_PI - halves.reduce((s, h) => s + 2 * h, 0));
    const step = spare / n;
    let cursor = P.startAngle;
    ring.members.forEach((m, k) => {
      const h = halves[k];
      const mid = cursor + step / 2 + h;
      cursor += step + 2 * h;
      const info = { ...m, lessonsIndices: m.lessons };
      const X = Math.cos(mid) * r;
      const Y = Math.sin(mid) * r;
      const cl = seat(info, ring.ri, mid, X, Y, m.cr);
      cl.vi = m.vi;
      cl.diff = m.diff;
    });
  });

  /* 圆心簇最后落位：角度取 startAngle（朝上），免得跟内环的「第一颗」方向打架 */
  let center = null;
  if (centerSrc) {
    const indices = [];
    NODES.forEach((node, i) => {
      if (node.ch === 0) indices.push(i);
    });
    center = seat(
      { ...centerSrc, lessonsIndices: indices },
      -1,
      P.startAngle,
      0,
      0,
      clusterRadius(indices.length, P),
    );
    center.vi = 0;
    center.diff = 0;
  }

  /* ---- 4. 课级邻接（聚焦一章时要画它的进出线） ---- */
  const up = NODES.map(() => []);
  const down = NODES.map(() => []);
  EDGES.forEach(([a, b]) => {
    up[b].push(a);
    down[a].push(b);
  });

  /* ---- 5. 章级边：**含第 0 章**（ringLayout 的 model.edges 按设计排除了它） ---- */
  const wmap = new Map();
  EDGES.forEach(([a, b]) => {
    const A = NODES[a].ch;
    const B = NODES[b].ch;
    if (A === B || !clusters.has(A) || !clusters.has(B)) return;
    const key = A + '>' + B;
    wmap.set(key, (wmap.get(key) || 0) + 1);
  });
  const chapterEdges = [...wmap.entries()]
    .map(([key, w]) => {
      const [a, b] = key.split('>').map(Number);
      return { a, b, w, strong: w >= 2 };
    })
    .sort((x, y) => x.a - y.a || x.b - y.b);

  /* ---- 6. 画布尺寸 ---- */
  const maxR = ringR[ringR.length - 1] || P.r0;
  const size = Math.ceil((maxR + P.labelPad) * 2);

  const lessonCount = clusters.size
    ? [...clusters.values()].reduce((s, c) => s + c.count, 0)
    : 0;

  return {
    P,
    model,
    rings,
    ringR,
    center,
    clusters,
    lessonPos,
    chapterEdges,
    strongEdges: chapterEdges.filter((e) => e.strong),
    weakEdges: chapterEdges.filter((e) => !e.strong),
    up,
    down,
    size,
    lessonCount,
  };
}

/* -------------------------------------------------------------------------
 * 二、几何小工具（组件与面板共用一份，别各写各的）
 * ------------------------------------------------------------------------- */

/** 两点之间的二次贝塞尔。bow 为横向偏移量（按方向自动取左右），0 即直线。 */
export function curve(x1, y1, x2, y2, bow = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx + nx * bow).toFixed(1)} ${(my + ny * bow).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * 章与章之间连线的路径：从 A 簇边缘出发、落在 B 簇边缘上，两边各留一点缝。
 * 同环的邻居往外弓（免得线穿过圆心那一大块空地），跨环的往里弓半格。
 */
export function chapterEdgePath(model, e, bow = 0.16) {
  const A = model.clusters.get(e.a);
  const B = model.clusters.get(e.b);
  if (!A || !B) return '';
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const pad = 3;
  const x1 = A.x + ux * (A.cr + pad);
  const y1 = A.y + uy * (A.cr + pad);
  const x2 = B.x - ux * (B.cr + pad);
  const y2 = B.y - uy * (B.cr + pad);
  return curve(x1, y1, x2, y2, len * bow);
}

/** 章难度 → 「第 N 环」的短标签（与 /graph 同口径，直接借 ringLabel 的算法）。 */
export function ringDiffLabel(ring) {
  const d = ring.diff;
  if (!d) return '';
  return d.minDiff === d.maxDiff ? `难度 ${d.minDiff}` : `难度 ${d.minDiff}–${d.maxDiff}`;
}

export { RING_NAMES };
