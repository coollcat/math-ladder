/* =========================================================================
 * 知识树纯布局引擎（无 React 依赖，可用 node 直接单测）
 * -------------------------------------------------------------------------
 * 职责：
 *   1. filterCh0        排除第 0 章（Python 工具箱）节点，并重映射边
 *   2. aggregateChapters 把课级先修边聚合为章级边
 *   3. layeredLayout     分层 + 重心交叉消减 + 坐标分配 + 祖先/后代位图
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
 * 分层布局主函数。
 * @param {number} n        节点数
 * @param {Array}  edges    [a,b] 先修边（a 是先修，指向 b）
 * @param {number} root     根节点下标
 * @param {object} opts     { pillW, pillH, gapX, levelH, topPad }
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

  const lvl = computeLevels(n, pred, root);
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

  /* ---- 坐标分配：沿主父继承 x，再在「重心顺序」内挤开、层内居中 ---- */
  const pos = new Array(n).fill(null);
  for (let l = 0; l <= maxL; l++) {
    const list = order.get(l) || [];
    list.forEach((v) => {
      const px = parent[v] >= 0 && pos[parent[v]] ? pos[parent[v]].x : 0;
      pos[v] = { x: px, y: topPad + l * levelH, lvl: l };
    });
    for (let pass = 0; pass < 4; pass++) {
      for (let k = 1; k < list.length; k++) {
        const a = list[k - 1];
        const b = list[k];
        if (pos[b].x - pos[a].x < gapX) pos[b].x = pos[a].x + gapX;
      }
      for (let k = list.length - 2; k >= 0; k--) {
        const a = list[k];
        const b = list[k + 1];
        if (pos[b].x - pos[a].x < gapX) pos[a].x = pos[b].x - gapX;
      }
    }
    const mid = (pos[list[0]].x + pos[list[list.length - 1]].x) / 2;
    list.forEach((v) => { pos[v].x -= mid; });
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
