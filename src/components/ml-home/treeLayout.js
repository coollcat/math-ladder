/* =========================================================================
 * 知识树纯布局引擎（无 React 依赖，可用 node 直接单测）
 * -------------------------------------------------------------------------
 * 职责：
 *   1. filterCh0        排除第 0 章（Python 工具箱）节点，并重映射边
 *   2. aggregateChapters 把课级先修边聚合为章级边
 *   3. layeredLayout     分层 + 重心交叉消减 + 层内紧凑槽位/层间对齐 + 祖先/后代位图
 * 所有函数都是纯函数：输入数组、输出对象，不读全局状态。
 * ========================================================================= */

/** 排除第 0 章：重映射索引，同步过滤先修边与工具血缘边。 */
export function filterCh0(NODES, EDGES, USE_AGG) {
  const keep = NODES.map((n) => n.ch !== 0);
  const idx = new Array(NODES.length).fill(-1);
  let k = 0;
  for (let i = 0; i < NODES.length; i++) if (keep[i]) idx[i] = k++;
  const nodes = NODES.filter((_, i) => keep[i]);
  const edges = EDGES.filter(([a, b]) => keep[a] && keep[b]).map(([a, b]) => [idx[a], idx[b]]);
  const useAgg = USE_AGG.filter(([a, b]) => keep[a] && keep[b]).map(([a, b, t]) => [idx[a], idx[b], t]);
  return { nodes, edges, useAgg };
}

/** 把课级先修边聚合为章级边（跨章才保留，去重）。chapterList 形如 [{n,title,short,to,count}]。 */
export function aggregateChapters(lessonNodes, lessonEdges, chapterList) {
  const idxOf = new Map(chapterList.map((c, i) => [c.n, i]));
  const seen = new Set();
  const edges = [];
  lessonEdges.forEach(([a, b]) => {
    const A = lessonNodes[a].ch;
    const B = lessonNodes[b].ch;
    if (A === B) return;
    if (!idxOf.has(A) || !idxOf.has(B)) return;
    const key = A + '>' + B;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([idxOf.get(A), idxOf.get(B)]);
  });
  return { nodes: chapterList, edges };
}

/** 计算以 root 为根的最长路径代数（DAG 松弛），并把不连通节点挂到第 1 代（防御性）。 */
export function computeLevels(n, pred, root) {
  const lvl = new Array(n).fill(-1);
  lvl[root] = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let b = 0; b < n; b++) {
      for (const a of pred[b]) {
        if (a === root) continue; // 根永远停在第 0 代
        if (lvl[a] >= 0 && lvl[a] + 1 > lvl[b]) {
          lvl[b] = lvl[a] + 1;
          changed = true;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) if (i !== root && lvl[i] === -1) lvl[i] = 1;
  changed = true;
  while (changed) {
    changed = false;
    for (let b = 0; b < n; b++) {
      for (const a of pred[b]) {
        if (a !== root && lvl[a] >= 0 && lvl[a] + 1 > lvl[b]) {
          lvl[b] = lvl[a] + 1;
          changed = true;
        }
      }
    }
  }
  return lvl;
}

/**
 * 章节粒度代数：把课级先修边聚合到章 DAG，在章 DAG 上算最长路径，
 * 再映射回每门课——同一章的所有课落在同一层。
 * 用于单元模式分层：避免一章内的先修链把同章课程拆到很多层
 * （逐课最长路径会让 46 层的树里同章课程散落 5~8 层，既松散又难找）。
 * @param {Array}  chOf    每个节点的章号
 * @param {Array}  edges   课级先修边
 * @param {number} rootCh  根章章号
 */
export function chapterLevels(chOf, edges, rootCh) {
  const chSet = new Set(chOf);
  const chPred = new Map();
  edges.forEach(([a, b]) => {
    const A = chOf[a];
    const B = chOf[b];
    if (A === B) return;
    if (!chPred.has(B)) chPred.set(B, new Set());
    chPred.get(B).add(A);
  });
  const chLvl = new Map();
  chSet.forEach((c) => chLvl.set(c, c === rootCh ? 0 : -1));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [b, ps] of chPred) {
      for (const a of ps) {
        if (a === rootCh) continue;
        if (chLvl.get(a) >= 0 && chLvl.get(a) + 1 > chLvl.get(b)) {
          chLvl.set(b, chLvl.get(a) + 1);
          changed = true;
        }
      }
    }
  }
  for (const c of chSet) if (c !== rootCh && chLvl.get(c) === -1) chLvl.set(c, 1);
  changed = true;
  while (changed) {
    changed = false;
    for (const [b, ps] of chPred) {
      for (const a of ps) {
        if (a !== rootCh && chLvl.get(a) >= 0 && chLvl.get(a) + 1 > chLvl.get(b)) {
          chLvl.set(b, chLvl.get(a) + 1);
          changed = true;
        }
      }
    }
  }
  return chOf.map((c) => chLvl.get(c));
}

/**
 * 分层布局主函数。
 * @param {number} n        节点数
 * @param {Array}  edges    [a,b] 先修边（a 是先修，指向 b）
 * @param {number} root     根节点下标
 * @param {object} opts     { pillW, pillH, gapX, levelH, topPad, levels? }
 *                          levels 传入时跳过内部最长路径（如 chapterLevels 的章粒度代数）
 * @returns 布局结果：lvl/parent/pos/order/maxL/minX/width/height/trunk/pred/succ/anc/desc
 */
export function layeredLayout(n, edges, root, opts = {}) {
  const pillW = opts.pillW ?? 172;
  const pillH = opts.pillH ?? 36;
  const gapX = opts.gapX ?? pillW + 16;
  const levelH = opts.levelH ?? 116;
  const topPad = opts.topPad ?? 36;

  const pred = Array.from({ length: n }, () => []);
  const succ = Array.from({ length: n }, () => []);
  edges.forEach(([a, b]) => {
    pred[b].push(a);
    succ[a].push(b);
  });

  const lvl = opts.levels || computeLevels(n, pred, root);
  const maxL = Math.max(...lvl);

  /* ---- 每层初始顺序 = 自然序（调用方保证 nodes 已按章/课号排序） ---- */
  const byL = new Map();
  for (let i = 0; i < n; i++) {
    const l = lvl[i];
    if (!byL.has(l)) byL.set(l, []);
    byL.get(l).push(i);
  }
  const order = new Map();
  for (const [l, list] of byL) order.set(l, list.slice());

  /* ---- 重心法交叉消减（Sugiyama 简化）：自顶向下 + 自底向上多轮 ---- */
  for (let iter = 0; iter < 10; iter++) {
    for (let l = 1; l <= maxL; l++) {
      const prev = order.get(l - 1);
      const posOf = new Map();
      prev.forEach((v, i) => posOf.set(v, i));
      const list = order.get(l);
      const bar = new Map();
      list.forEach((v, vi) => {
        const ps = pred[v].filter((p) => posOf.has(p));
        bar.set(v, ps.length ? ps.reduce((s, p) => s + posOf.get(p), 0) / ps.length : vi);
      });
      list.sort((a, b) => bar.get(a) - bar.get(b) || a - b);
    }
    for (let l = maxL - 1; l >= 0; l--) {
      const next = order.get(l + 1);
      const posOf = new Map();
      next.forEach((v, i) => posOf.set(v, i));
      const list = order.get(l);
      const bar = new Map();
      list.forEach((v, vi) => {
        const ss = succ[v].filter((s) => posOf.has(s));
        bar.set(v, ss.length ? ss.reduce((s, x) => s + posOf.get(x), 0) / ss.length : vi);
      });
      list.sort((a, b) => bar.get(a) - bar.get(b) || a - b);
    }
  }

  /* ---- 每节点选「主父」：代数恰少一层、且子树最大的先修（其余边画成分支线） ---- */
  const downCount = new Array(n).fill(1);
  for (let l = maxL; l >= 0; l--) {
    for (const v of order.get(l) || []) {
      for (const a of pred[v]) {
        if (lvl[a] === lvl[v] - 1) downCount[a] += downCount[v];
      }
    }
  }
  const parent = new Array(n).fill(-1);
  for (let v = 0; v < n; v++) {
    if (v === root) continue;
    const cand = pred[v].filter((p) => lvl[p] === lvl[v] - 1);
    const pool = cand.length ? cand : (pred[v].length ? [pred[v][0]] : [root]);
    parent[v] = pool.reduce((best, p) => (downCount[p] > downCount[best] ? p : best), pool[0]);
  }

  /* ---- 坐标分配：层内紧凑槽位（围绕中轴居中）+ 层间对齐松弛 ----
   * 旧算法（继承主父 x + 层内挤开 + 每层独立居中）会让稀疏层被父代位置拉宽、
   * 层内留下大量空槽（实测占用率仅 65%）；紧凑树算法（Buchheim）对本图也不适用：
   * 先修树深、叶子多，每层节点摊在大量槽位上，占用率反而跌到 20%。
   * 本图的最优解是「表格化紧凑」：
   *   1. 层内节点占连续槽位、整层围绕中轴居中（层内零空洞，占用率 100%，
   *      树冠不再左偏——窄的上层与宽的下层共用同一根中轴）；
   *   2. 每层整体有一个平移量 shift，用「边两端尽量上下对齐」的中位数松弛
   *      迭代求出（对齐父子，边尽量垂直）；
   *   3. 层内次序仍由上面的重心消叉给出——次序决定交叉数与对齐上限。 */
  const slotOf = new Array(n).fill(0);
  const layerMid = new Float64Array(maxL + 1);
  const refreshSlot = () => {
    for (const [l, list] of order) {
      layerMid[l] = (list.length - 1) / 2;
      list.forEach((v, i) => { slotOf[v] = i; });
    }
  };
  refreshSlot();

  const shift = new Float64Array(maxL + 1); /* 第 0 层（根）固定为 0，作锚 */
  const posX = new Float64Array(n);
  const refreshLayerX = (l) => {
    for (const v of order.get(l) || []) posX[v] = (slotOf[v] - layerMid[l]) * gapX + shift[l];
  };
  for (let l = 0; l <= maxL; l++) refreshLayerX(l);

  const ALIGN_ITERS = 28;
  const DAMP = 0.75;
  const relaxShifts = () => {
    for (let iter = 0; iter < ALIGN_ITERS; iter++) {
      const down = iter % 2 === 0;
      for (let step = 1; step <= maxL; step++) {
        const l = down ? step : maxL - step + 1;
        if (l === 0 || l > maxL) continue;
        const list = order.get(l) || [];
        if (!list.length) continue;
        /* 收集「本层期望平移量」：对每条关联边，若边另一端在 x_u，
           则本层平移到 x_u - (slot-mid)*gapX 时该边垂直。取中位数抗离群。 */
        const desired = [];
        for (const v of list) {
          const base = (slotOf[v] - layerMid[l]) * gapX;
          for (const u of pred[v]) desired.push(posX[u] - base);
          for (const u of succ[v]) desired.push(posX[u] - base);
        }
        if (!desired.length) continue;
        desired.sort((a, b) => a - b);
        const m = desired.length >> 1;
        const med = desired.length % 2 ? desired[m] : (desired[m - 1] + desired[m]) / 2;
        const next = shift[l] + (med - shift[l]) * DAMP;
        if (Math.abs(next - shift[l]) > 0.01) {
          shift[l] = next;
          refreshLayerX(l);
        }
      }
    }
  };
  relaxShifts();

  /* 精修两轮：用真实 x 重算重心重排序（进一步消叉/拉直长边），
     重排槽位后再做层间对齐。 */
  for (let round = 0; round < 2; round++) {
    for (let iter = 0; iter < 4; iter++) {
      for (let l = 1; l <= maxL; l++) {
        const list = order.get(l) || [];
        const bar = new Map();
        list.forEach((v) => {
          const ps = pred[v];
          bar.set(v, ps.length ? ps.reduce((s, p) => s + posX[p], 0) / ps.length : posX[v]);
        });
        list.sort((a, b) => bar.get(a) - bar.get(b) || a - b);
      }
      for (let l = maxL - 1; l >= 0; l--) {
        const list = order.get(l) || [];
        const bar = new Map();
        list.forEach((v) => {
          const ss = succ[v];
          bar.set(v, ss.length ? ss.reduce((s, x) => s + posX[x], 0) / ss.length : posX[v]);
        });
        list.sort((a, b) => bar.get(a) - bar.get(b) || a - b);
      }
    }
    refreshSlot();
    for (let l = 0; l <= maxL; l++) refreshLayerX(l);
    relaxShifts();
  }

  const pos = new Array(n).fill(null);
  for (let v = 0; v < n; v++) {
    pos[v] = { x: posX[v], y: topPad + lvl[v] * levelH, lvl: lvl[v] };
  }

  const xs = pos.map((p) => p.x);
  const minX = Math.min(...xs) - pillW / 2 - 16;
  const maxX = Math.max(...xs) + pillW / 2 + 16;
  const width = maxX - minX;
  const height = topPad + maxL * levelH + pillH / 2 + 28;

  /* ---- 主干边集合：边两端恰为主父关系 ---- */
  const trunk = new Set();
  edges.forEach(([a, b], k) => {
    if (parent[b] === a) trunk.add(k);
  });

  /* ---- 祖先/后代位图（Uint8Array，渲染期 O(1) 判属） ---- */
  const anc = new Array(n).fill(null);
  for (let l = 0; l <= maxL; l++) {
    for (const v of order.get(l) || []) {
      const a = new Uint8Array(n);
      for (const p of pred[v]) {
        a[p] = 1;
        const ap = anc[p];
        if (ap) for (let i = 0; i < n; i++) if (ap[i]) a[i] = 1;
      }
      anc[v] = a;
    }
  }
  const desc = new Array(n).fill(null);
  for (let l = maxL; l >= 0; l--) {
    for (const v of order.get(l) || []) {
      const d = new Uint8Array(n);
      for (const s of succ[v]) {
        d[s] = 1;
        const ds = desc[s];
        if (ds) for (let i = 0; i < n; i++) if (ds[i]) d[i] = 1;
      }
      desc[v] = d;
    }
  }

  return {
    lvl,
    parent,
    pos,
    order,
    maxL,
    minX,
    width,
    height,
    trunk,
    pred,
    succ,
    anc,
    desc,
  };
}

/**
 * 章节块布局（单元模式专用）。
 * ---------------------------------------------------------------------------
 * 动机：逐课最长路径会把一章的课拆到 5~8 个层里（散、难找）；而「整章一层」
 * 的章粒度分层又让热门层塞进 98 个节点（18128px 宽，横向爆炸）。
 * 折中：章 DAG 决定「带」（band，章粒度最长路径，约 20 带），
 * 每章的课在带内排成紧凑网格块（cols ≤ maxCols 的近似方阵）——
 * 同章课程永远收在一个矩形块里，块间按章 DAG 重心排序 + 中位数对齐。
 * 跨章边在块间走曲线，章内边在块内走短弧线。
 *
 * @param {Array}  nodeCh  每门课的章号
 * @param {Array}  edges   课级先修边
 * @param {number} root    根课下标（主父兜底用）
 * @param {object} opts    { pillW, pillH, gapX, levelH, topPad, rootCh, maxCols, blockGap }
 * @returns 与 layeredLayout 同构：lvl/parent/pos/order/maxL/minX/width/height/trunk/pred/succ/anc/desc
 */
export function blockLayout(nodeCh, edges, root, opts = {}) {
  const pillW = opts.pillW ?? 150;
  const pillH = opts.pillH ?? 30;
  const gapX = opts.gapX ?? 162;
  const levelH = opts.levelH ?? 82;
  const topPad = opts.topPad ?? 26;
  const rootCh = opts.rootCh ?? 1;
  const maxCols = opts.maxCols ?? 5;
  const blockGap = opts.blockGap ?? 56;

  const n = nodeCh.length;
  const pred = Array.from({ length: n }, () => []);
  const succ = Array.from({ length: n }, () => []);
  edges.forEach(([a, b]) => {
    pred[b].push(a);
    succ[a].push(b);
  });

  /* ---- 章粒度代数 → 带 ---- */
  const lvl = chapterLevels(nodeCh, edges, rootCh);
  const maxL = Math.max(...lvl);

  /* ---- 每章的课（自然序）与网格形状 ---- */
  const lessonsOf = new Map();
  nodeCh.forEach((c, i) => {
    if (!lessonsOf.has(c)) lessonsOf.set(c, []);
    lessonsOf.get(c).push(i);
  });
  const chList = [...lessonsOf.keys()].sort((a, b) => a - b);
  const grid = new Map(); /* ch -> {cols, rows} */
  chList.forEach((c) => {
    const len = lessonsOf.get(c).length;
    const cols = Math.max(1, Math.min(maxCols, Math.ceil(Math.sqrt(len))));
    grid.set(c, { cols, rows: Math.ceil(len / cols) });
  });

  /* ---- 章 DAG（跨章边去重）---- */
  const chPred = new Map(chList.map((c) => [c, new Set()]));
  const chSucc = new Map(chList.map((c) => [c, new Set()]));
  edges.forEach(([a, b]) => {
    const A = nodeCh[a];
    const B = nodeCh[b];
    if (A === B) return;
    chPred.get(B).add(A);
    chSucc.get(A).add(B);
  });

  /* ---- 带内章次序：章 DAG 上的重心消叉（自顶向下 + 自底向上） ---- */
  const chLvlOf = new Map(chList.map((c) => [c, lvl[lessonsOf.get(c)[0]]]));
  const chOrder = new Map();
  chList.forEach((c) => {
    const l = chLvlOf.get(c);
    if (!chOrder.has(l)) chOrder.set(l, []);
    chOrder.get(l).push(c);
  });
  for (let iter = 0; iter < 12; iter++) {
    for (let l = 1; l <= maxL; l++) {
      const prev = chOrder.get(l - 1) || [];
      const posOf = new Map(prev.map((c, i) => [c, i]));
      const list = chOrder.get(l) || [];
      const bar = new Map();
      list.forEach((c, ci) => {
        const ps = [...chPred.get(c)].filter((p) => posOf.has(p));
        bar.set(c, ps.length ? ps.reduce((s, p) => s + posOf.get(p), 0) / ps.length : ci);
      });
      list.sort((a, b) => bar.get(a) - bar.get(b) || a - b);
    }
    for (let l = maxL - 1; l >= 0; l--) {
      const next = chOrder.get(l + 1) || [];
      const posOf = new Map(next.map((c, i) => [c, i]));
      const list = chOrder.get(l) || [];
      const bar = new Map();
      list.forEach((c, ci) => {
        const ss = [...chSucc.get(c)].filter((s) => posOf.has(s));
        bar.set(c, ss.length ? ss.reduce((s, x) => s + posOf.get(x), 0) / ss.length : ci);
      });
      list.sort((a, b) => bar.get(a) - bar.get(b) || a - b);
    }
  }

  /* ---- 带几何：带高 = 带内最高块行数；块距 = 带内最宽块 + blockGap ---- */
  const bandH = new Float64Array(maxL + 1);
  const pitch = new Float64Array(maxL + 1);
  for (const [l, list] of chOrder) {
    let rows = 1;
    let cols = 1;
    list.forEach((c) => {
      const g = grid.get(c);
      if (g.rows > rows) rows = g.rows;
      if (g.cols > cols) cols = g.cols;
    });
    bandH[l] = rows;
    pitch[l] = cols * gapX + blockGap;
  }
  const bandY = new Float64Array(maxL + 1);
  for (let l = 1; l <= maxL; l++) bandY[l] = bandY[l - 1] + bandH[l - 1] * levelH;

  /* ---- 块 x：带内槽位（居中）+ 块级中位数对齐松弛（钳位防重叠） ---- */
  const chSlot = new Map();
  const chMid = new Float64Array(maxL + 1);
  for (const [l, list] of chOrder) {
    chMid[l] = (list.length - 1) / 2;
    list.forEach((c, i) => chSlot.set(c, i));
  }
  const blockX = new Map(); /* ch -> 块中心 x */
  const chShift = new Map(chList.map((c) => [c, 0]));
  const applyChX = (l) => {
    for (const c of chOrder.get(l) || []) {
      blockX.set(c, (chSlot.get(c) - chMid[l]) * pitch[l] + chShift.get(c));
    }
  };
  for (let l = 0; l <= maxL; l++) applyChX(l);

  /* 课坐标（随块移动而变，松弛每轮重算） */
  const posX = new Float64Array(n);
  const posY = new Float64Array(n);
  const refreshLessons = (l) => {
    for (const c of chOrder.get(l) || []) {
      const g = grid.get(c);
      const bx = blockX.get(c);
      const lessons = lessonsOf.get(c);
      lessons.forEach((v, k) => {
        const col = k % g.cols;
        const row = Math.floor(k / g.cols);
        posX[v] = bx + (col - (g.cols - 1) / 2) * gapX;
        posY[v] = topPad + bandY[l] + (row + (bandH[l] - g.rows) / 2) * levelH;
      });
    }
  };
  for (let l = 0; l <= maxL; l++) refreshLessons(l);

  /* 块级对齐：跨章边两端尽量同 x。期望位移取中位数，钳位在槽位余量内。 */
  const chEdges = [...chPred.keys()].length ? edges.filter(([a, b]) => nodeCh[a] !== nodeCh[b]) : [];
  for (let iter = 0; iter < 24; iter++) {
    const down = iter % 2 === 0;
    for (let step = 1; step <= maxL; step++) {
      const l = down ? step : maxL - step + 1;
      if (l === 0 || l > maxL) continue;
      const list = chOrder.get(l) || [];
      for (const c of list) {
        const desired = [];
        for (const [a, b] of chEdges) {
          if (nodeCh[a] === c) desired.push(posX[b] - posX[a]);
          else if (nodeCh[b] === c) desired.push(posX[a] - posX[b]);
        }
        if (!desired.length) continue;
        desired.sort((x, y) => x - y);
        const m = desired.length >> 1;
        const med = desired.length % 2 ? desired[m] : (desired[m - 1] + desired[m]) / 2;
        const g = grid.get(c);
        const room = Math.max(0, (pitch[l] - g.cols * gapX) / 2);
        const cur = chShift.get(c);
        const next = Math.min(room, Math.max(-room, cur + med * 0.5));
        if (Math.abs(next - cur) > 0.01) {
          chShift.set(c, next);
          applyChX(l);
          refreshLessons(l);
        }
      }
    }
  }

  /* ---- 输出坐标 / order（带内按块序接块内自然序） ---- */
  const order = new Map();
  for (const [l, list] of chOrder) {
    order.set(l, list.flatMap((c) => lessonsOf.get(c)));
  }
  const pos = new Array(n).fill(null);
  for (let v = 0; v < n; v++) pos[v] = { x: posX[v], y: posY[v], lvl: lvl[v] };

  const xs = pos.map((p) => p.x);
  const minX = Math.min(...xs) - pillW / 2 - 16;
  const maxX = Math.max(...xs) + pillW / 2 + 16;
  const width = maxX - minX;
  const height = topPad + bandY[maxL] + bandH[maxL] * levelH + pillH / 2 + 28;

  /* ---- 主父 / 主干边 / 祖先后代位图（与 layeredLayout 同规则） ---- */
  const downCount = new Array(n).fill(1);
  for (let l = maxL; l >= 0; l--) {
    for (const v of order.get(l) || []) {
      for (const a of pred[v]) {
        if (lvl[a] === lvl[v] - 1) downCount[a] += downCount[v];
      }
    }
  }
  const parent = new Array(n).fill(-1);
  for (let v = 0; v < n; v++) {
    if (v === root) continue;
    const cand = pred[v].filter((p) => lvl[p] === lvl[v] - 1);
    const pool = cand.length ? cand : (pred[v].length ? [pred[v][0]] : [root]);
    parent[v] = pool.reduce((best, p) => (downCount[p] > downCount[best] ? p : best), pool[0]);
  }
  const trunk = new Set();
  edges.forEach(([a, b], k) => {
    if (parent[b] === a) trunk.add(k);
  });

  const anc = new Array(n).fill(null);
  for (let l = 0; l <= maxL; l++) {
    for (const v of order.get(l) || []) {
      const a = new Uint8Array(n);
      for (const p of pred[v]) {
        a[p] = 1;
        const ap = anc[p];
        if (ap) for (let i = 0; i < n; i++) if (ap[i]) a[i] = 1;
      }
      anc[v] = a;
    }
  }
  const desc = new Array(n).fill(null);
  for (let l = maxL; l >= 0; l--) {
    for (const v of order.get(l) || []) {
      const d = new Uint8Array(n);
      for (const s of succ[v]) {
        d[s] = 1;
        const ds = desc[s];
        if (ds) for (let i = 0; i < n; i++) if (ds[i]) d[i] = 1;
      }
      desc[v] = d;
    }
  }

  return { lvl, parent, pos, order, maxL, minX, width, height, trunk, pred, succ, anc, desc };
}

/** 从 sel 沿主父回溯的最长先修链（下标数组，含 sel）。 */
export function chainOf(sel, parent) {
  if (sel == null || sel < 0) return [];
  const chain = [sel];
  let cur = sel;
  while (parent[cur] >= 0) {
    cur = parent[cur];
    chain.unshift(cur);
  }
  return chain;
}

/** 位图非零计数。 */
export function popcount(arr) {
  let c = 0;
  for (let i = 0; i < arr.length; i++) c += arr[i];
  return c;
}
