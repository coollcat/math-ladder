/* =========================================================================
 * 首页章级知识树 · 布局（纯计算，不碰 DOM；node 可直接 import 做单测）
 * -------------------------------------------------------------------------
 * 输入：生成数据 full-graph-data.js（课级 NODES/EDGES + 章表 CHAPTER_INFO）。
 * 输出：每章的「代」、坐标，章间边（带权重、是否属于骨架、走线路径）。
 *
 * 1. 章间边 = 课级先修边投到章上去重，权重 = 投上来的课级边条数（越粗越「离不开」）。
 * 2. 代（层）= 从根（第 1 章 算术四则）出发的**最长**先修链长度：
 *    第 n 代的章，至少要先走完 n 步先修。工具箱（第 0 章）不依赖任何课，和根并排在第 0 代。
 * 3. 骨架 = 传递约简：A→B 若还能经别的章绕到 B，这条边就是「推得出来的」，默认不画。
 *    313 条边约简后剩一半左右，图一下子能读了；「全部依赖」开关可以切回去。
 * 4. 层内排序：重心法上下来回扫 24 遍，按（直线近似的）交叉数挑最好的一次；
 *    横坐标用「保序 + 最小间距」的保序回归（PAV）把每章拉向它邻居的平均位置——
 *    边因此尽量是竖的，而不是像旧版那样只看一个主父。
 * 5. 跨多代的长边不直穿中间那几层的胶囊：在每个中间层找最近的空隙当路点，
 *    再用竖直切线的三次曲线串起来（看着像地铁线绕站走）。
 * ========================================================================= */

import { NODES, EDGES, CHAPTER_INFO } from './full-graph-data.js';

export const GEOM = {
  W: 108,      /* 章卡片宽 */
  H: 30,       /* 章卡片高 */
  SLOT: 122,   /* 同层相邻两章的最小中心距 */
  ROW: 56,     /* 层距 */
  TOP: 44,     /* 第 0 代的中心 y */
  LEFT: 70,    /* 左侧「第 n 代」标尺的宽度 */
  PAD: 18,     /* 四周留白 */
};

const ROOT_CH = 1;

/** 保序回归（非降），等权。返回拟合值数组 */
function pav(ys) {
  const blocks = [];
  ys.forEach((y) => {
    blocks.push({ sum: y, n: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1];
      const a = blocks[blocks.length - 2];
      if (a.sum / a.n <= b.sum / b.n) break;
      a.sum += b.sum;
      a.n += b.n;
      blocks.pop();
    }
  });
  const out = [];
  blocks.forEach((b) => {
    const m = b.sum / b.n;
    for (let k = 0; k < b.n; k += 1) out.push(m);
  });
  return out;
}

function segCross(p1, p2, p3, p4) {
  const d = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d1 = d(p3[0], p3[1], p4[0], p4[1], p1[0], p1[1]);
  const d2 = d(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
  const d3 = d(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  const d4 = d(p1[0], p1[1], p2[0], p2[1], p4[0], p4[1]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export function buildHomeTree(opts) {
  const G = Object.assign({}, GEOM, opts);
  const { W, H, SLOT, ROW, TOP } = G;

  /* ---------- 章与课 ---------- */
  const chapters = CHAPTER_INFO.map((c, i) => ({
    i,
    n: c.n,
    title: c.title,
    short: c.short,
    to: c.to,
    vol: Math.max(0, (c.volume || 1) - 1),
    count: c.lessons,
    lessons: [],
  }));
  const idxOf = new Map(chapters.map((c) => [c.n, c.i]));
  NODES.forEach((nd) => {
    const i = idxOf.get(nd.ch);
    if (i !== undefined) chapters[i].lessons.push({ title: nd.title, short: nd.short, to: nd.to });
  });
  const N = chapters.length;

  /* ---------- 章间边（带权） ---------- */
  const wmap = new Map();
  EDGES.forEach(([a, b]) => {
    const A = idxOf.get(NODES[a] && NODES[a].ch);
    const B = idxOf.get(NODES[b] && NODES[b].ch);
    if (A === undefined || B === undefined || A === B) return;
    const k = A * 4096 + B;
    wmap.set(k, (wmap.get(k) || 0) + 1);
  });
  let raw = [];
  wmap.forEach((w, k) => raw.push({ a: Math.floor(k / 4096), b: k % 4096, w }));
  raw.sort((p, q) => p.a - q.a || p.b - q.b);

  /* ---------- 代：最长先修链 ---------- */
  const root = idxOf.has(ROOT_CH) ? idxOf.get(ROOT_CH) : 0;
  const lvl = new Array(N).fill(-1);
  lvl[root] = 0;
  const relax = () => {
    for (let pass = 0; pass < N + 2; pass += 1) {
      let changed = false;
      raw.forEach(({ a, b }) => {
        if (b === root || lvl[a] < 0) return;
        if (lvl[a] + 1 > lvl[b]) {
          lvl[b] = lvl[a] + 1;
          changed = true;
        }
      });
      if (!changed) break;
    }
  };
  relax();
  const hasPred = new Array(N).fill(false);
  raw.forEach(({ b }) => { hasPred[b] = true; });
  for (let i = 0; i < N; i += 1) if (lvl[i] < 0) lvl[i] = hasPred[i] ? 1 : 0;
  relax();
  /* 只留「往下走」的边：指回根、或同代互指的（数据里出现了就是回环）不参与布局 */
  const dropped = raw.filter((e) => !(lvl[e.b] > lvl[e.a])).length;
  raw = raw.filter((e) => lvl[e.b] > lvl[e.a]);
  const maxL = Math.max(...lvl);

  const succ = chapters.map(() => []);
  const pred = chapters.map(() => []);
  raw.forEach((e) => {
    succ[e.a].push(e);
    pred[e.b].push(e);
  });

  /* ---------- 传递约简 ---------- */
  const reach = chapters.map(() => new Uint8Array(N));
  const byDeep = chapters.map((c) => c.i).sort((p, q) => lvl[q] - lvl[p]);
  byDeep.forEach((i) => {
    succ[i].forEach(({ b }) => {
      reach[i][b] = 1;
      const rb = reach[b];
      for (let k = 0; k < N; k += 1) if (rb[k]) reach[i][k] = 1;
    });
  });
  raw.forEach((e) => {
    e.red = !succ[e.a].some((s) => s.b !== e.b && reach[s.b][e.b]);
  });
  const redSucc = chapters.map(() => []);
  const redPred = chapters.map(() => []);
  raw.forEach((e) => {
    if (!e.red) return;
    redSucc[e.a].push(e.b);
    redPred[e.b].push(e.a);
  });

  /* 主父：恰比自己少一代的先修里，课级边最多的那个（最长先修链沿它往回走） */
  const critPred = chapters.map((c) => {
    const cand = pred[c.i].filter((e) => lvl[e.a] === lvl[c.i] - 1);
    if (!cand.length) return -1;
    return cand.reduce((best, e) => (e.w > best.w ? e : best), cand[0]).a;
  });

  /* ---------- 层内排序 + 横坐标 ---------- */
  const layers = [];
  for (let l = 0; l <= maxL; l += 1) layers.push([]);
  chapters.forEach((c) => layers[lvl[c.i]].push(c.i));
  /* 初始顺序：按卷、再按章号——同卷的章先挨在一起，颜色成片 */
  layers.forEach((L) => L.sort((p, q) => chapters[p].vol - chapters[q].vol || chapters[p].n - chapters[q].n));

  const widest = Math.max(...layers.map((L) => L.length));
  const bound = ((widest - 1) * SLOT) / 2 + SLOT;
  const x = new Float64Array(N);
  const y = (l) => TOP + l * ROW;

  function place(L, desired) {
    const ys = L.map((v, k) => desired[k] - k * SLOT);
    const fit = pav(ys);
    const xs = fit.map((v, k) => v + k * SLOT);
    if (xs.length) {
      const lo = xs[0];
      const hi = xs[xs.length - 1];
      let shift = 0;
      if (hi - lo <= 2 * bound) {
        if (lo < -bound) shift = -bound - lo;
        else if (hi > bound) shift = bound - hi;
      }
      L.forEach((v, k) => { x[v] = xs[k] + shift; });
    }
  }
  const mean = (arr) => arr.reduce((s, v) => s + x[v], 0) / arr.length;
  function desiredOf(v, mode) {
    const up = redPred[v];
    const dn = redSucc[v];
    let nb;
    if (mode === 'down') nb = up.length ? up : dn;
    else if (mode === 'up') nb = dn.length ? dn : up;
    else nb = up.concat(dn);
    return nb.length ? mean(nb) : x[v];
  }

  layers.forEach((L) => place(L, L.map((v, k) => (k - (L.length - 1) / 2) * SLOT)));

  const redEdges = raw.filter((e) => e.red);
  function crossings() {
    let c = 0;
    const segs = redEdges.map((e) => [[x[e.a], y(lvl[e.a])], [x[e.b], y(lvl[e.b])], e.a, e.b]);
    for (let i = 0; i < segs.length; i += 1) {
      for (let j = i + 1; j < segs.length; j += 1) {
        const s = segs[i];
        const t = segs[j];
        if (s[2] === t[2] || s[3] === t[3] || s[2] === t[3] || s[3] === t[2]) continue;
        if (segCross(s[0], s[1], t[0], t[1])) c += 1;
      }
    }
    return c;
  }

  let best = { c: crossings(), layers: layers.map((L) => L.slice()), x: Float64Array.from(x) };
  for (let it = 0; it < 24; it += 1) {
    const down = it % 2 === 0;
    const seq = [];
    for (let l = 0; l <= maxL; l += 1) seq.push(down ? l : maxL - l);
    seq.forEach((l) => {
      const L = layers[l];
      const key = new Map(L.map((v) => [v, desiredOf(v, down ? 'down' : 'up')]));
      L.sort((p, q) => key.get(p) - key.get(q));
      place(L, L.map((v) => key.get(v)));
    });
    const c = crossings();
    if (c < best.c) best = { c, layers: layers.map((L) => L.slice()), x: Float64Array.from(x) };
  }
  best.layers.forEach((L, l) => { layers[l] = L; });
  x.set(best.x);
  const initialCross = best.c;
  /* 相邻对换：重心法只看平均位置，交叉常在「两章互换一下就好」的地方残留。
     动一层只影响连着这一层的边，只数这些边参与的交叉（比全量重数快十来倍，首页水合不卡） */
  function localCross(l) {
    const aff = [];
    const rest = [];
    redEdges.forEach((e) => {
      const s = [[x[e.a], y(lvl[e.a])], [x[e.b], y(lvl[e.b])], e.a, e.b];
      if (lvl[e.a] === l || lvl[e.b] === l) aff.push(s);
      else rest.push(s);
    });
    const hit = (s, t) => !(s[2] === t[2] || s[3] === t[3] || s[2] === t[3] || s[3] === t[2]) &&
      segCross(s[0], s[1], t[0], t[1]);
    let c = 0;
    for (let i = 0; i < aff.length; i += 1) {
      for (let j = i + 1; j < aff.length; j += 1) if (hit(aff[i], aff[j])) c += 1;
      for (let j = 0; j < rest.length; j += 1) if (hit(aff[i], rest[j])) c += 1;
    }
    return c;
  }
  for (let pass = 0; pass < 4; pass += 1) {
    let improved = false;
    for (let l = 0; l <= maxL; l += 1) {
      const L = layers[l];
      let cur = localCross(l);
      for (let k = 0; k + 1 < L.length; k += 1) {
        const keep = L.map((v) => x[v]);
        [L[k], L[k + 1]] = [L[k + 1], L[k]];
        place(L, L.map((v) => desiredOf(v, 'both')));
        const c = localCross(l);
        if (c < cur) {
          cur = c;
          improved = true;
        } else {
          [L[k], L[k + 1]] = [L[k + 1], L[k]];
          L.forEach((v, j) => { x[v] = keep[j]; });
        }
      }
    }
    if (!improved) break;
  }
  /* 收尾：上下邻居一起拉，来回几遍，边更竖 */
  for (let it = 0; it < 6; it += 1) {
    const seq = [];
    for (let l = 0; l <= maxL; l += 1) seq.push(it % 2 === 0 ? l : maxL - l);
    seq.forEach((l) => {
      const L = layers[l];
      place(L, L.map((v) => desiredOf(v, 'both')));
    });
  }
  const finalCross = crossings();

  /* 平移到正坐标：左边留出代标尺 */
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < N; i += 1) {
    minX = Math.min(minX, x[i]);
    maxX = Math.max(maxX, x[i]);
  }
  const off = G.LEFT + G.PAD + W / 2 - minX;
  chapters.forEach((c) => {
    c.lvl = lvl[c.i];
    c.x = x[c.i] + off;
    c.y = y(lvl[c.i]);
    c.critPred = critPred[c.i];
    c.preds = pred[c.i].map((e) => ({ i: e.a, w: e.w })).sort((p, q) => q.w - p.w);
    c.succs = succ[c.i].map((e) => ({ i: e.b, w: e.w })).sort((p, q) => q.w - p.w);
    c.desc = reach[c.i].reduce((s, v) => s + v, 0);
  });
  const width = maxX - minX + W + G.LEFT + 2 * G.PAD;
  const height = y(maxL) + H / 2 + G.PAD + 14;

  /* ---------- 走线 ---------- */
  const rows = layers.map((L) => L.map((v) => chapters[v].x).sort((p, q) => p - q));
  function gapNear(l, ideal) {
    const xs = rows[l];
    const clear = W / 2 + 7;
    if (!xs.some((cx) => Math.abs(cx - ideal) < clear)) return ideal;
    const cand = [];
    if (xs.length) {
      cand.push(xs[0] - clear - 6);
      cand.push(xs[xs.length - 1] + clear + 6);
    }
    for (let k = 0; k + 1 < xs.length; k += 1) {
      if (xs[k + 1] - xs[k] >= 2 * clear + 2) cand.push((xs[k] + xs[k + 1]) / 2);
    }
    return cand.reduce((b, v) => (Math.abs(v - ideal) < Math.abs(b - ideal) ? v : b), cand[0]);
  }
  const fx = (v) => Math.round(v * 10) / 10;
  const edges = raw.map((e) => {
    const A = chapters[e.a];
    const B = chapters[e.b];
    const pts = [[A.x, A.y + H / 2]];
    const span = B.lvl - A.lvl;
    for (let l = A.lvl + 1; l < B.lvl; l += 1) {
      const t = (l - A.lvl) / span;
      pts.push([gapNear(l, A.x + (B.x - A.x) * t), y(l)]);
    }
    pts.push([B.x, B.y - H / 2]);
    let d = 'M' + fx(pts[0][0]) + ' ' + fx(pts[0][1]);
    for (let k = 1; k < pts.length; k += 1) {
      const p = pts[k - 1];
      const q = pts[k];
      const dy = (q[1] - p[1]) * 0.5;
      d += ' C' + fx(p[0]) + ' ' + fx(p[1] + dy) + ' ' + fx(q[0]) + ' ' + fx(q[1] - dy) + ' ' + fx(q[0]) + ' ' + fx(q[1]);
    }
    return { a: e.a, b: e.b, w: e.w, red: e.red, span, d };
  });

  const levels = layers.map((L, l) => ({ l, y: y(l), count: L.length }));
  return {
    chapters,
    edges,
    levels,
    maxL,
    root,
    width,
    height,
    geom: G,
    stats: {
      chapters: N,
      lessons: NODES.length,
      lessonEdges: EDGES.length,
      edges: edges.length,
      skeleton: edges.filter((e) => e.red).length,
      crossings: finalCross,
      crossingsBeforeSwap: initialCross,
      dropped,
      generations: maxL + 1,
    },
  };
}

const fx1 = (v) => Math.round(v * 10) / 10;

/**
 * 聚焦重排：把「这一章 + 它全部先修 + 它托起的全部后代」单独摆一张图。
 * ---------------------------------------------------------------
 * 每代仍是一行（行高、左侧代标尺都不动，所以「第几代」仍然对得上），
 * 行内按原来的左右次序紧挨着排、整行居中；画布不窄于整棵树，
 * 于是看到的是「同一张纸上只留下这一支」，而不是原地的空位。
 * keep 是被保留的章号集合；返回 { pos, width }。
 */
export function focusLayout(T, keep) {
  const G = T.geom;
  const rows = new Map();
  T.chapters.forEach((c) => {
    if (!keep.has(c.i)) return;
    if (!rows.has(c.lvl)) rows.set(c.lvl, []);
    rows.get(c.lvl).push(c);
  });
  let width = T.width;
  rows.forEach((list) => {
    const w = (list.length - 1) * G.SLOT + G.W + G.PAD * 2;
    if (w > width) width = w;
  });
  const pos = {};
  rows.forEach((list) => {
    list.sort((a, b) => a.x - b.x);
    const start = (width - (list.length - 1) * G.SLOT) / 2;
    list.forEach((c, k) => { pos[c.i] = { x: start + k * G.SLOT, y: c.y }; });
  });
  return { pos, width };
}

/** 聚焦重排后的边：端点用新坐标，跨多代也走一条平滑 S 曲线（行内已没有要绕的卡片） */
export function focusEdgePath(T, pos, a, b) {
  const H2 = T.geom.H / 2;
  const A = pos[a];
  const B = pos[b];
  const y0 = A.y + H2;
  const y1 = B.y - H2;
  const dy = (y1 - y0) * 0.5;
  return 'M' + fx1(A.x) + ' ' + fx1(y0)
    + ' C' + fx1(A.x) + ' ' + fx1(y0 + dy)
    + ' ' + fx1(B.x) + ' ' + fx1(y1 - dy)
    + ' ' + fx1(B.x) + ' ' + fx1(y1);
}

/** 第 i 章的最长先修链：从根一路沿主父走到它（含两端） */
export function chainTo(T, i) {  const out = [];
  let v = i;
  const guard = new Set();
  while (v >= 0 && !guard.has(v)) {
    guard.add(v);
    out.unshift(v);
    v = T.chapters[v].critPred;
  }
  return out;
}

/** 先修（向上）与托起（向下）的全部闭包，沿全部章间边走 */
export function closureOf(T, i) {
  const grow = (key) => {
    const s = new Set([i]);
    const st = [i];
    while (st.length) {
      const v = st.pop();
      T.chapters[v][key].forEach(({ i: w }) => {
        if (!s.has(w)) {
          s.add(w);
          st.push(w);
        }
      });
    }
    return s;
  };
  return { up: grow('preds'), down: grow('succs') };
}
