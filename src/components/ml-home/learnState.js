/* =========================================================================
 * 课级学习状态：把 progress.js 的「学完标记 + 续学位置」翻译成每门课的四态
 * -------------------------------------------------------------------------
 * /graph（阶梯版图）与 /tree（课程家谱）共用；纯函数，可用 node 直接单测。
 *
 *   DONE    已学：ml-progress 里标了学完
 *   CURRENT 在学：ml-last 指向它、且还没标学完（「继续学习」的那一课）
 *   READY   可学：没学完，但它的直接先修全部学完（或者它本来就没有先修）
 *   LOCKED  未解锁：还有直接先修没学完
 *
 * 口径细节：
 *   · 进度键是课页的 location.pathname（enhancer 写入），可能带尾斜杠，
 *     这里按「去掉尾斜杠」统一比对。
 *   · 第 0 章（Python 工具箱）是工具附录，不参与数学先修链：判「可学」时
 *     不要求读者先学完第 0 章的课。
 *   · 读者一门课都没标、也没有续学位置时 hasData = false——UI 应该切到
 *     中性配色，而不是把全站 1000 多门课画成一片「未解锁」灰。
 * ========================================================================= */
import { NODES, EDGES } from './full-graph-data.js';

export const LOCKED = 0;
export const READY = 1;
export const CURRENT = 2;
export const DONE = 3;

export const STATE_NAME = ['未解锁', '可学', '在学', '已学'];
export const STATE_CLASS = ['is-locked', 'is-ready', 'is-current', 'is-done'];

/* ---- 模块级：课级邻接表与索引（整站一份） ---- */
const N = NODES.length;
export const PRED = Array.from({ length: N }, () => []);
export const SUCC = Array.from({ length: N }, () => []);
EDGES.forEach(([a, b]) => {
  PRED[b].push(a);
  SUCC[a].push(b);
});

const trim = (p) => String(p || '').replace(/\/+$/, '');

/** 课页路径 → 课下标（去尾斜杠比对） */
export const INDEX_BY_TO = new Map(NODES.map((n, i) => [trim(n.to), i]));
/** 课 id（如 calculus/derivative）→ 课下标 */
export const INDEX_BY_ID = new Map(NODES.map((n, i) => [n.id, i]));

/**
 * @param {object} prog  readProgress() 的结果 { '/docs/x/y': true }
 * @param {object|null} last readLast() 的结果 { path, at }
 * @returns {{ state: Uint8Array, hasData: boolean, done: number, current: number }}
 */
export function lessonStates(prog, last) {
  const state = new Uint8Array(N);
  const doneSet = new Set();
  if (prog && typeof prog === 'object') {
    Object.keys(prog).forEach((k) => {
      if (!prog[k]) return;
      const i = INDEX_BY_TO.get(trim(k));
      if (i != null) doneSet.add(i);
    });
  }
  const cur = last && last.path ? INDEX_BY_TO.get(trim(last.path)) : undefined;

  for (let i = 0; i < N; i++) {
    if (doneSet.has(i)) {
      state[i] = DONE;
      continue;
    }
    let ok = true;
    for (const p of PRED[i]) {
      if (NODES[p].ch === 0 && NODES[i].ch !== 0) continue;
      if (!doneSet.has(p)) {
        ok = false;
        break;
      }
    }
    state[i] = ok ? READY : LOCKED;
  }
  let current = -1;
  if (cur != null && state[cur] !== DONE) {
    state[cur] = CURRENT;
    current = cur;
  }
  return { state, hasData: doneSet.size > 0 || cur != null, done: doneSet.size, current };
}

/** 一组课的进度小计 */
export function tally(indices, state) {
  let done = 0;
  let ready = 0;
  for (const i of indices) {
    if (state[i] === DONE) done += 1;
    else if (state[i] === READY || state[i] === CURRENT) ready += 1;
  }
  return { total: indices.length, done, ready };
}
