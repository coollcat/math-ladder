/* =========================================================================
 * /graph「阶梯版图」的数据模型（纯函数，可用 node 直接单测）
 * -------------------------------------------------------------------------
 * 版图是一张矩阵：
 *   列 = 层级（地基 / 主干 / 进阶 / 高等 / 深水 / 前沿），算法**不在这里**——
 *        直接用 ringLayout.chapterModel 的 ring 字段（难度等分位 + 卷序下限 +
 *        强先修单调上修）。那是层级口径的唯一事实来源，这里只换了画法：
 *        同心环的「半径」变成了版图的「列」。
 *   行 = 七卷（领域）。
 * 于是每张章卡的位置同时回答两件事：它属于哪个领域、它在多高的台阶上。
 * 整张图天然呈阶梯形（卷一挤在左边，卷五卷六卷七压在右边），这就是本站的形状。
 *
 * 格内章卡顺序：按章难度 → 章号。章号即学习顺序，同难度时照目录读。
 * 第 0 章（Python 工具箱）不进版图（chapterModel 已排除）。
 * ========================================================================= */
import { NODES, EDGES, DEPTH } from './full-graph-data.js';
import { allChapterGroups } from './data.js';
import { chapterModel, chainTo, closure, ringLabel, RING_NAMES } from './ringLayout.js';

export { RING_NAMES };

export function buildAtlas() {
  const groups = allChapterGroups();
  const flat = [];
  groups.forEach((g, vi) => {
    g.chapters.forEach((c) => flat.push({ ...c, vi }));
  });
  const model = chapterModel(NODES, EDGES, DEPTH, flat);

  /* 每章的课按目录顺序（ord）排好：章卡里的方格就是这个顺序 */
  model.chapters.forEach((c) => {
    c.lessons.sort((a, b) => NODES[a].ord - NODES[b].ord);
  });

  const R = model.rings.length;
  const cells = groups.map(() => Array.from({ length: R }, () => []));
  model.chapters.forEach((c) => cells[c.vi][c.ring].push(c.n));
  cells.forEach((row) =>
    row.forEach((list) =>
      list.sort((a, b) => model.byN.get(a).diff - model.byN.get(b).diff || a - b),
    ),
  );

  /* 章级边按 a>b 建索引：画线时要拿权重（课级先修条数） */
  const edgeW = new Map(model.edges.map((e) => [`${e.a}>${e.b}`, e.w]));

  const volumes = groups.map((g, vi) => {
    const chs = model.chapters.filter((c) => c.vi === vi);
    return {
      vi,
      n: g.n,
      title: g.title,
      chapters: chs.map((c) => c.n),
      lessons: chs.flatMap((c) => c.lessons),
    };
  });

  const levels = model.rings.map((r) => ({
    ri: r.ri,
    name: r.name,
    count: r.count,
    lessons: r.lessons,
    label: ringLabel(model, r.ri),
  }));

  return { model, cells, volumes, levels, edgeW };
}

/** 到某章的最长先修链（从地基一头排起，含自身） */
export function chainOf(atlas, n) {
  return chainTo(atlas.model, n);
}

/** 全部来路（祖先章闭包）/ 全部去向（后代章闭包） */
export function ancestorsOf(atlas, n) {
  return closure(atlas.model, n, 'pred');
}
export function descendantsOf(atlas, n) {
  return closure(atlas.model, n, 'succ');
}

/** 章名搜索：章号、全名、短名都认 */
export function searchChapters(atlas, q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  return atlas.model.chapters
    .filter(
      (c) =>
        String(c.n) === s ||
        String(c.title).toLowerCase().includes(s) ||
        String(c.short).toLowerCase().includes(s),
    )
    .map((c) => c.n);
}
