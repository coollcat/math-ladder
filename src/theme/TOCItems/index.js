import React, { useEffect, useState } from 'react';
import TOCItems from '@theme-original/TOCItems';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import PrereqPanel from '@site/src/components/doc-widgets/PrereqPanel';
import { NODES } from '@site/src/components/ml-home/full-graph-data';
import { readProgress, doneCount, progressNS, onProgressChange } from '../../learning/progress';

/* 右栏 TOC 顶部挂件（swizzle wrap）：前置知识面板 + 学习进度条，位于目录上方。
 * 存储与文末进度按钮、首页「继续学习」共用 src/learning/progress.js 的命名空间实现：
 * 未登录读游客空间、登录后读账号空间，登录态一变这里也跟着换。
 * 挂件只在桌面右栏显示（≥997px），窄屏由正文内的横条版前置知识接管。 */

const TOTAL_LESSONS = NODES.length;

function useProgressSnapshot() {
  /* 初始值与 SSR 一致（空），挂载后再读真实值，避免水合不匹配 */
  const [snap, setSnap] = useState({ done: 0, current: false, ns: ':guest' });
  useEffect(() => {
    const update = () =>
      setSnap({
        done: doneCount(),
        current: !!readProgress()[window.location.pathname],
        ns: progressNS(),
      });
    update();
    return onProgressChange(update);
  }, []);
  return snap;
}

function MiniProgress() {
  const { done, current, ns } = useProgressSnapshot();
  const pct = Math.min(100, Math.round((done / TOTAL_LESSONS) * 100));
  return (
    <div className="ml-miniprogress">
      <div className="ml-miniprogress__head">
        <span className="ml-miniprogress__title">▣ 学习进度</span>
        <span className="ml-miniprogress__count">已学 {done} / {TOTAL_LESSONS} 节</span>
      </div>
      <div className="ml-miniprogress__bar">
        <div className="ml-miniprogress__fill" style={{ width: pct + '%' }} />
      </div>
      <div className="ml-miniprogress__note">
        {current ? '✓ 本课已标记学完' : '本课还没标记——读完可在文末标记'}
        {ns !== ':guest' && ' · 账号空间 ' + ns.slice(1)}
      </div>
    </div>
  );
}

export default function TOCItemsWrapper(props) {
  let prereqs = [];
  try {
    const { frontMatter } = useDoc();
    if (Array.isArray(frontMatter?.prereqs)) prereqs = frontMatter.prereqs;
  } catch {
    /* 不在 docs 文档上下文（如移动 TOC 其他复用处）——只渲染进度条 */
  }
  return (
    <>
      <div className="ml-toc-widgets">
        {prereqs.length > 0 && <PrereqPanel prereqs={prereqs} variant="toc" />}
        <MiniProgress />
      </div>
      <TOCItems {...props} />
    </>
  );
}
