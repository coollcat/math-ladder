/* =========================================================================
 * /tree「课程家谱」纯布局引擎（无 React、无 DOM，可用 node 直接单测）
 * -------------------------------------------------------------------------
 * 以一门课为焦点，往左铺它的先修（祖先），往右铺它解锁的后续（后代）：
 *
 *   [更早的根基·按章折叠] … 先修第 2 层 | 直接先修 | ★本课 | 直接后续 | 后续第 2 层 …
 *
 * 为什么能画清楚（实测，1029 门课 / 1429 条先修）：直接先修中位数 1、最多 4；
 * 往前 3 步之内的祖先中位数 5、90 分位 10；整个祖先闭包中位数 39、最多 184。
 * 所以「近处逐课画、远处按章折叠」：近处是一棵几乎不分叉的树，远处只报数。
 *
 * 口径：
 *   · 纳入：按 BFS 步数（最短距离）——直接先修永远在图上，不会因为另有一条
 *     长路而被挤出窗口。
 *   · 分列：在纳入的子图里按**最长路**分列，于是每条边都严格朝右（朝焦点 /
 *     朝后续），不会出现同列边、回头边。列数可能比窗口步数多一两列，如实画。
 *   · 列内顺序：先按（章号, 目录序）初排，再做两轮重心消叉。
 *   · 列太长（> MAX_PER_COL）时只留优先的那些（先修看离焦点近、难度低；后续看
 *     难度低），其余收成列尾一张「还有 N 门」——浅层课的后续第 2 层能到 46 门。
 *   · 第 0 章（Python 工具箱）不参与数学先修链：焦点不在第 0 章时不往那里走。
 * ========================================================================= */
import { NODES, DEPTH } from './full-graph-data.js';
import { PRED, SUCC } from './learnState.js';

export const CARD_W = 196;
export const CARD_H = 68;
export const COL_GAP = 68;
export const ROW_GAP = 12;
export const PAD = 24;
export const MAX_PER_COL = 14;

const PITCH_X = CARD_W + COL_GAP;
const PITCH_Y = CARD_H + ROW_GAP;

function bfs(start, adj, maxStep, skip) {
  const dist = new Map([[start, 0]]);
  let frontier = [start];
  for (let d = 1; d <= maxStep && frontier.length; d++) {
    const next = [];
    for (const v of frontier) {
      for (const w of adj[v]) {
        if (dist.has(w) || skip(w)) continue;
        dist.set(w, d);
        next.push(w);
      }
    }
    frontier = next;
  }
  dist.delete(start);
  return dist;
}

function closureOf(start, adj, skip) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const v = stack.pop();
    for (const w of adj[v]) {
      if (seen.has(w) || skip(w)) continue;
      seen.add(w);
      stack.push(w);
    }
  }
  return seen;
}

/** 在纳入集合内求「到焦点的最长路」：toward = 指向焦点方向的邻接表 */
function longestLevels(focus, set, toward) {
  const memo = new Map([[focus, 0]]);
  const busy = new Set();
  const lev = (v) => {
    if (memo.has(v)) return memo.get(v);
    if (busy.has(v)) return 1; /* 数据万一成环：保险丝 */
    busy.add(v);
    let best = 0;
    for (const w of toward[v]) {
      if (w !== focus && !set.has(w)) continue;
      best = Math.max(best, lev(w) + 1);
    }
    busy.delete(v);
    memo.set(v, best);
    return best;
  };
  set.forEach((v) => lev(v));
  memo.delete(focus);
  return memo;
}

const byChapter = (a, b) => NODES[a].ch - NODES[b].ch || NODES[a].ord - NODES[b].ord;

/**
 * @param {number} focus 焦点课下标
 * @param {{back?: number, fwd?: number}} opts 往前 / 往后纳入的步数
 */
export function buildLineage(focus, opts = {}) {
  const back = Math.max(0, opts.back ?? 3);
  const fwd = Math.max(0, opts.fwd ?? 2);
  const skip = NODES[focus].ch === 0 ? () => false : (v) => NODES[v].ch === 0;

  const ancDist = bfs(focus, PRED, back, skip);
  const descDist = bfs(focus, SUCC, fwd, skip);
  const ancAll = closureOf(focus, PRED, skip);
  const descAll = closureOf(focus, SUCC, skip);

  /* 分列：先修列为负、后续列为正 */
  const ancLev = longestLevels(focus, new Set(ancDist.keys()), SUCC);
  const descLev = longestLevels(focus, new Set(descDist.keys()), PRED);

  const colMap = new Map(); /* col -> [i] */
  const put = (col, i) => {
    if (!colMap.has(col)) colMap.set(col, []);
    colMap.get(col).push(i);
  };
  ancLev.forEach((l, i) => put(-l, i));
  descLev.forEach((l, i) => put(l, i));
  put(0, focus);

  /* 截断过长的列：优先留下离焦点近、难度低的 */
  const overflow = new Map(); /* col -> 被收起的课 */
  colMap.forEach((list, col) => {
    if (col === 0 || list.length <= MAX_PER_COL) return;
    const dist = col < 0 ? ancDist : descDist;
    list.sort((a, b) => dist.get(a) - dist.get(b) || DEPTH[a] - DEPTH[b] || byChapter(a, b));
    overflow.set(col, list.slice(MAX_PER_COL - 1));
    colMap.set(col, list.slice(0, MAX_PER_COL - 1));
  });

  const shown = new Set();
  colMap.forEach((list) => list.forEach((i) => shown.add(i)));

  /* 列内初排 + 重心消叉（从焦点往外扫，再往回扫一遍） */
  const cols = [...colMap.keys()].sort((a, b) => a - b);
  cols.forEach((c) => colMap.get(c).sort(byChapter));
  const rank = new Map();
  const setRank = (c) => {
    const list = colMap.get(c);
    const mid = (list.length - 1) / 2;
    list.forEach((i, k) => rank.set(i, k - mid));
  };
  cols.forEach(setRank);
  const neighbors = (i) => [...PRED[i], ...SUCC[i]].filter((w) => shown.has(w));
  const sweep = (order) => {
    order.forEach((c) => {
      if (c === 0) return;
      const list = colMap.get(c);
      const bary = new Map(
        list.map((i) => {
          const ns = neighbors(i).filter((w) => Math.abs(colOf(w)) < Math.abs(c) || Math.sign(colOf(w)) !== Math.sign(c));
          const v = ns.length ? ns.reduce((s, w) => s + rank.get(w), 0) / ns.length : rank.get(i);
          return [i, v];
        }),
      );
      list.sort((a, b) => bary.get(a) - bary.get(b) || byChapter(a, b));
      setRank(c);
    });
  };
  const colIndex = new Map();
  colMap.forEach((list, c) => list.forEach((i) => colIndex.set(i, c)));
  function colOf(i) {
    return colIndex.get(i);
  }
  const outward = [...cols.filter((c) => c < 0).reverse(), ...cols.filter((c) => c > 0)];
  sweep(outward);
  sweep(outward);

  /* 坐标：每列绕画布中线竖直居中；列尾的「还有 N 门」占一个槽位 */
  const minCol = cols[0];
  const maxCol = cols[cols.length - 1];
  const slots = (c) => colMap.get(c).length + (overflow.has(c) ? 1 : 0);
  const maxSlots = Math.max(...cols.map(slots));
  const height = Math.max(3, maxSlots) * PITCH_Y - ROW_GAP + PAD * 2;
  const width = (maxCol - minCol + 1) * PITCH_X - COL_GAP + PAD * 2;
  const xOf = (c) => PAD + (c - minCol) * PITCH_X;
  const yTop = (c) => (height - (slots(c) * PITCH_Y - ROW_GAP)) / 2;

  const nodes = [];
  const pos = new Map();
  cols.forEach((c) => {
    const y0 = yTop(c);
    colMap.get(c).forEach((i, k) => {
      const p = { i, col: c, x: xOf(c), y: y0 + k * PITCH_Y };
      pos.set(i, p);
      nodes.push(p);
    });
  });
  const more = [];
  overflow.forEach((list, c) => {
    more.push({ col: c, count: list.length, lessons: list, x: xOf(c), y: yTop(c) + colMap.get(c).length * PITCH_Y });
  });

  /* 连线：两端都在图上的课级先修边 */
  const edges = [];
  shown.forEach((b) => {
    PRED[b].forEach((a) => {
      if (!shown.has(a)) return;
      const A = pos.get(a);
      const B = pos.get(b);
      if (!(A.col < B.col)) return;
      const sx = A.x + CARD_W;
      const sy = A.y + CARD_H / 2;
      const tx = B.x;
      const ty = B.y + CARD_H / 2;
      const dx = Math.max(28, (tx - sx) * 0.5);
      edges.push({ a, b, d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}` });
    });
  });

  /* 窗口之外的祖先：按章折叠（「更早的根基」） */
  const beyondMap = new Map();
  ancAll.forEach((i) => {
    if (shown.has(i)) return;
    const ch = NODES[i].ch;
    if (!beyondMap.has(ch)) beyondMap.set(ch, []);
    beyondMap.get(ch).push(i);
  });
  const beyond = [...beyondMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ch, lessons]) => ({ ch, lessons: lessons.sort(byChapter) }));

  const columns = cols.map((c) => ({ col: c, x: xOf(c), count: colMap.get(c).length + (overflow.get(c)?.length || 0) }));

  return {
    focus,
    nodes,
    pos,
    edges,
    more,
    columns,
    beyond,
    ancAll,
    descAll,
    shown,
    width,
    height,
    maxBack: maxDepthOf(focus, PRED, skip),
    maxFwd: maxDepthOf(focus, SUCC, skip),
  };
}

/** 焦点沿某方向最远能走几步（BFS 层数）——决定「再往前一层」按钮何时置灰 */
function maxDepthOf(start, adj, skip) {
  const dist = bfs(start, adj, 1e9, skip);
  let m = 0;
  dist.forEach((d) => {
    if (d > m) m = d;
  });
  return m;
}

/**
 * 「下一步学什么」：在焦点及其全部祖先里，挑可学（直接先修都学完）且没学完的课，
 * 难度（先修深度）最低的优先——先补最底下的那块砖。
 * @param {Uint8Array} state learnState.lessonStates().state
 * @param {number} READY / CURRENT 状态常量由调用方传入，避免循环依赖
 */
export function suggestNext(lin, state, READY, CURRENT) {
  const pool = [...lin.ancAll, lin.focus].filter((i) => state[i] === READY || state[i] === CURRENT);
  pool.sort((a, b) => DEPTH[a] - DEPTH[b] || byChapter(a, b));
  return pool.slice(0, 3);
}

/** 悬停某张卡时要点亮的路径：它与焦点之间的所有课（含两端） */
export function pathToFocus(lin, i) {
  const out = new Set([i, lin.focus]);
  if (i === lin.focus) return out;
  const col = lin.pos.get(i)?.col ?? 0;
  /* 先修侧：i 的后代 ∩ 焦点的祖先；后续侧：i 的祖先 ∩ 焦点的后代 */
  const fromI = closureOf(i, col < 0 ? SUCC : PRED, (v) => !lin.shown.has(v));
  fromI.forEach((v) => {
    if (col < 0 ? lin.ancAll.has(v) || v === lin.focus : lin.descAll.has(v) || v === lin.focus) out.add(v);
  });
  return out;
}

/** 课名搜索：标题包含即可，命中按（是否前缀, 标题长度, 章号）排 */
export function searchLessons(q, limit = 8) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  const hits = [];
  NODES.forEach((n, i) => {
    const t = String(n.title).toLowerCase();
    const k = t.indexOf(s);
    if (k >= 0) hits.push({ i, k, len: t.length });
  });
  hits.sort((a, b) => (a.k === 0 ? 0 : 1) - (b.k === 0 ? 0 : 1) || a.len - b.len || NODES[a.i].ch - NODES[b.i].ch);
  return hits.slice(0, limit).map((h) => h.i);
}
