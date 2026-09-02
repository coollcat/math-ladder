import React from 'react';
import Link from '@docusaurus/Link';
import { NODES } from './full-graph-data';
import { CHAPTERS } from './data';
import {
  readProgress,
  readLast,
  doneCount,
  progressNS,
  onProgressChange,
} from '../../learning/progress';

/* =========================================================================
 * 首页「继续学习」入口
 * -------------------------------------------------------------------------
 * 判定顺序：
 *   1. 有停留记录且那课还没标记学完 → 回到那一课（kind='last'）；
 *   2. 那一课已学完（或位置已失效）→ 顺延到课程顺序里的下一门未学课（kind='next'）；
 *   3. 既没停留记录也没任何学完标记 → 返回 null，首页退回「随机翻一章」。
 *
 * 数据随命名空间走：未登录读本地游客空间，登录后读账号空间（见 learning/progress.js）。
 * 水合安全：首次渲染一律走「随机翻一章」分支，挂载后读到真实记录才换成继续学习。
 * ========================================================================= */

const BY_PATH = new Map(NODES.map((n) => [n.to, n]));

export function pickContinueTarget() {
  const done = readProgress();
  const last = readLast();
  let learned = 0;
  for (const k of Object.keys(done)) if (done[k]) learned += 1;
  if (!last && learned === 0) return null;

  if (last && BY_PATH.has(last.path) && !done[last.path]) {
    return { node: BY_PATH.get(last.path), kind: 'last' };
  }

  /* 上次那课已学完 → 沿课程顺序往后找第一门没学的 */
  let start = 0;
  if (last && BY_PATH.has(last.path)) {
    start = NODES.findIndex((n) => n.to === last.path) + 1;
  }
  if (start > 0) {
    for (let k = start; k < NODES.length; k++) {
      if (!done[NODES[k].to]) return { node: NODES[k], kind: 'next' };
    }
  }
  for (let k = 0; k < NODES.length; k++) {
    if (!done[NODES[k].to]) return { node: NODES[k], kind: 'next' };
  }
  return null; /* 全部学完：退回随机 */
}

/** 首页主按钮：有记录 → 继续学习；没记录 → 随机翻一章。 */
export function ContinueButton() {
  const [target, setTarget] = React.useState(null);

  React.useEffect(() => {
    const update = () => setTarget(pickContinueTarget());
    update();
    return onProgressChange(update);
  }, []);

  const randomChapter = () => {
    const ch = CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)];
    window.location.href = ch.to;
  };

  if (!target) {
    return (
      <button
        type="button"
        className="button button--secondary button--lg button--outline"
        onClick={randomChapter}
      >
        随机翻一章
      </button>
    );
  }

  const n = target.node;
  const label = target.kind === 'last' ? '▶ 继续学习' : '▶ 下一课';
  const tip =
    target.kind === 'last'
      ? `上次学到《${n.title}》，接着往下读`
      : `《${n.title}》之前的都学完了，顺延到下一课`;
  return (
    <Link
      className="button button--secondary button--lg button--outline ml-hero__btn--continue"
      to={n.to}
      title={tip}
    >
      {label}：{n.short}
    </Link>
  );
}

/** 按钮下方的进度小条：已学节数 / 百分比 / 存在哪个空间。 */
export function ProgressStrip() {
  const [snap, setSnap] = React.useState(null);

  React.useEffect(() => {
    const update = () => setSnap({ done: doneCount(), ns: progressNS() });
    update();
    return onProgressChange(update);
  }, []);

  if (!snap) return null;
  const guest = snap.ns === ':guest';
  if (snap.done === 0 && guest) return null; /* 一条记录都没有就不占版面 */

  const pct = Math.min(100, Math.round((snap.done / NODES.length) * 100));
  return (
    <p className="ml-hero__progress">
      <span className="ml-hero__progress-bar">
        <i style={{ width: pct + '%' }} />
      </span>
      <span className="ml-hero__progress-text">
        已学 <strong>{snap.done}</strong> / {NODES.length} 节 · {pct}%
        {guest ? ' · 记录存在本机（登录后可存入账号）' : ` · 账号空间 ${snap.ns.slice(1)}`}
      </span>
    </p>
  );
}
