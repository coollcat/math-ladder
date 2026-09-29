/* =========================================================================
 * 知识图谱（/graph）纯布局引擎：「阶梯星系」同心环
 * -------------------------------------------------------------------------
 * 无 React 依赖，可用 node 直接单测（与 treeLayout.js 同一套路数）。
 *
 * 口径（2026-09-29 重构，改之前先读完这一段）：
 *
 *   半径 ＝ 层级。层级**不是**随手按难度切的阈值，而是两步算出来的：
 *     ① 分类：按「章难度」等分位分 R 环。章难度 = 本章所有课程平均先修深度
 *        （与首页、旧版图谱同一口径，**别换算法**，换了整张图会重排）。
 *        等分位而不是固定阈值，是为了每环章数相近——固定阈值下外圈会挤爆。
 *     ② 上修：若 A 是 B 的**强先修**（A→B 这条章级边由 ≥2 门课的跨章先修
 *        支撑），则 ring(B) ≥ ring(A)。也就是「先修章永远不在被托起章的外圈」。
 *
 *   **为什么只按强边（w ≥ 2）上修**：293 条章级边里有 219 条只由**一门课**的
 *   跨章先修支撑——那是「这一课顺手引用了别章的一课」，不是章的从属关系。
 *   按全部边上修会让约束一路级联，把外圈撑到 23 章、内圈只剩 7 章（实测），
 *   而且难度区间互相穿插，「谁在里谁在外」反而更难读。按强边上修后实测：
 *   各环 12/13/12/13/10/14 章，难度区间 5–16 | 14–19 | 19–23 | 23–26 | 26–30 |
 *   27–38 **单调递增**，且强边一条都不朝内（弱边朝内的还有，那正是它们的性质：
 *   交叉引用，不是层级）。
 *
 *   同环内的顺序：按卷 → 难度排，同色的章连成一段弧，一眼看出这一环里
 *   哪一段属于哪个领域。每环整体旋转半个间隔，使正上方（12 点方向）永远是
 *   两章之间的空隙——环名标签写在那条轴上不会压住节点。
 *
 * 连线的两个档位：
 *   strong（w ≥ 2）——**默认显示**，章与章的从属关系，一律朝外；
 *   weak  （w = 1）——默认隐藏，可切换显示（教学上的交叉引用）。
 * ========================================================================= */

/** 环数。6 环是实测下来规模与可读性的平衡点（12/13/12/13/10/14 章）。 */
export const RING_COUNT = 6;

/** 环名。前五环按难度阶梯命名，最外环是「还没被托起多久」的前沿。 */
export const RING_NAMES = ['地基', '主干', '进阶', '高等', '深水', '前沿'];

const R0 = 96; /* 最内环半径 */
const DR = 74; /* 环间距下限（实际取 max(DR 累加, 弧长需求)） */
const MIN_ARC = 88; /* 同环相邻两章的最小弧长（要放得下章名标签） */
const LABEL_PAD = 92; /* 最外环之外留给标签的余量 */

/* -------------------------------------------------------------------------
 * 一、章级模型
 * ------------------------------------------------------------------------- */

/**
 * 把课级图谱聚合成章级模型。
 * @param {Array}  NODES       full-graph-data 的节点表（含 ch / to / title）
 * @param {Array}  EDGES       课级先修边 [a,b]
 * @param {Array}  DEPTH       每门课的先修深度
 * @param {Array}  chapterList allChapterGroups() 铺平后的章清单（{n,title,short,to,count,vi}）
 * @param {object} opts        { rings }
 */
export function chapterModel(NODES, EDGES, DEPTH, chapterList, opts = {}) {
  const rings = opts.rings ?? RING_COUNT;

  /* 排除第 0 章（Python 工具箱）：纯工具附录，不参与数学先修链 */
  const chapters = chapterList
    .filter((c) => c.n !== 0)
    .map((c) => ({
      ...c,
      diff: 0,
      ring: 0,
      gen: 0,
      pred: [],
      succ: [],
      lessons: [],
    }));
  const byN = new Map(chapters.map((c) => [c.n, c]));

  /* 每章的课 + 平均先修深度 */
  const sum = new Map();
  const cnt = new Map();
  NODES.forEach((n, i) => {
    if (!byN.has(n.ch)) return;
    byN.get(n.ch).lessons.push(i);
    sum.set(n.ch, (sum.get(n.ch) || 0) + DEPTH[i]);
    cnt.set(n.ch, (cnt.get(n.ch) || 0) + 1);
  });
  chapters.forEach((c) => {
    c.count = c.lessons.length;
    c.diff = Math.round((sum.get(c.n) || 0) / (cnt.get(c.n) || 1));
  });

  /* 章级边（带权重 = 支撑它的课级边条数） */
  const wmap = new Map();
  EDGES.forEach(([a, b]) => {
    const A = NODES[a].ch;
    const B = NODES[b].ch;
    if (A === B || !byN.has(A) || !byN.has(B)) return;
    const k = A + '>' + B;
    wmap.set(k, (wmap.get(k) || 0) + 1);
  });
  const edges = [...wmap.entries()].map(([k, w]) => {
    const [a, b] = k.split('>').map(Number);
    return { a, b, w, strong: w >= 2 };
  });
  edges.forEach((e) => {
    byN.get(e.a).succ.push(e.b);
    byN.get(e.b).pred.push(e.a);
  });
  /* 邻接表按章号排序：标签与面板里的列表顺序稳定，不随数据文件顺序抖动 */
  chapters.forEach((c) => {
    c.pred.sort((x, y) => x - y);
    c.succ.sort((x, y) => x - y);
  });

  /* 代数：强先修子图上的最长路（拓扑序、上修、链都靠它） */
  const strongPred = new Map(chapters.map((c) => [c.n, []]));
  const strongSucc = new Map(chapters.map((c) => [c.n, []]));
  edges.forEach((e) => {
    if (!e.strong) return;
    strongPred.get(e.b).push(e.a);
    strongSucc.get(e.a).push(e.b);
  });
  const gen = new Map();
  const busy = new Set();
  const calc = (ch) => {
    if (gen.has(ch)) return gen.get(ch);
    if (busy.has(ch)) return 0; /* 数据万一成环：停在这儿，不死循环 */
    busy.add(ch);
    const ps = strongPred.get(ch) || [];
    const g = ps.length ? Math.max(...ps.map(calc)) + 1 : 0;
    busy.delete(ch);
    gen.set(ch, g);
    return g;
  };
  chapters.forEach((c) => {
    c.gen = calc(c.n);
  });

  /* ① 按难度等分位分类：每环章数尽量相等 */
  const asc = chapters.slice().sort((a, b) => a.diff - b.diff || a.n - b.n);
  const per = asc.length / rings;
  asc.forEach((c, i) => {
    c.ring = Math.min(rings - 1, Math.floor(i / per));
  });

  /* ② 卷序下限（分位是主序，这一条只矫正少数「难度低但明明是后期章」的例外）：
       第 1 环只放卷一「数学地基」的章；卷五（应用 AI 与前沿）、卷六（工程与系统）
       不许落进最内两环。实测只影响 3 章（18 数学语言 / 25 测度论 / 44 数值分析）——
       它们在课程内部的先修链很短，于是难度均值偏低；但读者在圆心看到「测度论」
       只会觉得图错了。加上这条，「圆心＝起步」才名副其实。 */
  const volFloor = (vi) => (vi >= 4 ? 2 : vi === 0 ? 0 : 1);
  chapters.forEach((c) => {
    c.ring = Math.max(c.ring, Math.min(rings - 1, volFloor(c.vi)));
  });

  /* ③ 按强先修上修：先修的环绝不大于被托起章的环 */
  const topo = chapters.slice().sort((a, b) => a.gen - b.gen || a.n - b.n);
  topo.forEach((c) => {
    let r = c.ring;
    for (const p of strongPred.get(c.n)) r = Math.max(r, byN.get(p).ring);
    c.ring = Math.min(rings - 1, r);
  });

  /* 环统计 */
  const ringInfo = Array.from({ length: rings }, (_, ri) => {
    const list = chapters.filter((c) => c.ring === ri).sort((a, b) => a.diff - b.diff || a.n - b.n);
    const diffs = list.map((c) => c.diff);
    return {
      ri,
      name: RING_NAMES[ri] || `第 ${ri + 1} 环`,
      chapters: list.map((c) => c.n),
      count: list.length,
      lessons: list.reduce((s, c) => s + c.count, 0),
      minDiff: diffs.length ? Math.min(...diffs) : 0,
      maxDiff: diffs.length ? Math.max(...diffs) : 0,
    };
  });

  return {
    chapters,
    byN,
    edges,
    strongEdges: edges.filter((e) => e.strong),
    strongPred,
    strongSucc,
    rings: ringInfo,
    maxRing: rings - 1,
  };
}

/* -------------------------------------------------------------------------
 * 二、几何：环半径与章坐标
 * ------------------------------------------------------------------------- */

/**
 * 摆位。
 * @returns {{size, ringR, hubR, pos: Map<number,{x,y,angle,r,ring,diff}>}}
 */
export function layoutRings(model, opts = {}) {
  const r0 = opts.r0 ?? R0;
  const dr = opts.dr ?? DR;
  const minArc = opts.minArc ?? MIN_ARC;
  const labelPad = opts.labelPad ?? LABEL_PAD;
  const startAngle = opts.startAngle ?? -Math.PI / 2;

  /* 环半径：既要比上一环大 DR，又要容得下环内每一章的弧长 */
  const ringR = [];
  model.rings.forEach((ring, ri) => {
    const need = (Math.max(ring.count, 1) * minArc) / (2 * Math.PI);
    const prev = ri === 0 ? r0 : ringR[ri - 1] + dr;
    ringR.push(Math.max(prev, need));
  });

  /* 摆位：同环内按「卷 → 难度」排，同色的连成一段弧；
     相位加半个间隔，让正上方那条轴落在两章之间的空隙上（环名写在那儿）。 */
  const pos = new Map();
  model.rings.forEach((ring, ri) => {
    const list = ring.chapters
      .map((n) => model.byN.get(n))
      .sort((a, b) => a.vi - b.vi || a.diff - b.diff || a.n - b.n);
    const n = list.length || 1;
    const step = (2 * Math.PI) / n;
    const r = ringR[ri];
    list.forEach((c, k) => {
      const angle = startAngle + step / 2 + k * step;
      pos.set(c.n, {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        angle,
        r,
        ring: ri,
        diff: c.diff,
      });
    });
  });

  const maxR = ringR[ringR.length - 1] || r0;
  const size = Math.ceil((maxR + labelPad) * 2);
  const hubR = Math.max(30, ringR[0] - 54);

  /* 每环的章名能写几个字：由这一环的**弦长**（相邻两章的直线距离）决定，
     扣掉圆点直径与两侧留白，再按中文字宽（≈12.5px）折算。
     写死字数两头都会出错：写 4 字时有 11 章被截成「多元微积…」，
     写 6 字时最内环的标签会互相压住（那一环的可用弦长只有 55px 左右）。 */
  const labelBudget = model.rings.map((ring, ri) => {
    const n = Math.max(ring.count, 1);
    const chord = n > 1 ? 2 * ringR[ri] * Math.sin(Math.PI / n) : 999;
    const room = chord - 2 * 10 - 14;
    return Math.max(3, Math.min(12, Math.floor(room / 12.5)));
  });

  return { size, ringR, hubR, pos, labelBudget };
}

/* -------------------------------------------------------------------------
 * 三、图上的查询（面板与高亮都用它，别在组件里各写一份）
 * ------------------------------------------------------------------------- */

/** 沿邻接表求闭包（图上万一有环也不会死循环）。 */
export function closure(model, start, dir) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const v = stack.pop();
    const c = model.byN.get(v);
    if (!c) continue;
    for (const w of c[dir]) {
      if (!seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  return seen;
}

/**
 * 到某一章的**最长先修链**（含自身），从地基那一头排起。
 *
 * 两条纪律：
 *   1. 优先走强先修边（章的从属关系）；某一章一条强先修都没有时，退回它的全部
 *      先修边——否则像 53 章图网络这种「只有弱先修」的章会显示成孤立点。
 *   2. **环号必须单调不减**：退回分支里若混进朝内的弱边，面包屑会出现
 *      「…→ 傅里叶（第 4 环）→ 实分析（第 2 环）→ …」这种读法，
 *      「来路」当场失去意义（实测 39 处）。所以只保留环号 ≤ 自己的先修。
 * 用于「从地基走到这儿」的导航面包屑。
 */
export function chainTo(model, ch) {
  const memo = new Map();
  const ringOf = (n) => model.byN.get(n)?.ring ?? 0;
  const walk = (n, guard) => {
    if (memo.has(n)) return memo.get(n);
    if (guard > 60) return [n]; /* 数据异常时的保险丝 */
    const c = model.byN.get(n);
    if (!c) return [n];
    const strong = model.strongPred.get(n) || [];
    const base = strong.length ? strong : c.pred;
    const ps = base.filter((p) => ringOf(p) <= c.ring);
    let best = [];
    for (const p of ps) {
      const cand = walk(p, guard + 1);
      if (cand.length > best.length) best = cand;
    }
    const out = [...best, n];
    memo.set(n, out);
    return out;
  };
  return walk(ch, 0);
}

/** 章难度 → 「第 N 环」的短标签。 */
export function ringLabel(model, ri) {
  const r = model.rings[ri];
  if (!r) return '';
  return r.minDiff === r.maxDiff ? `难度 ${r.minDiff}` : `难度 ${r.minDiff}–${r.maxDiff}`;
}
