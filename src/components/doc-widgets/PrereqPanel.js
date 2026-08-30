import React from 'react';
import { NODES } from '@site/src/components/ml-home/full-graph-data';

/* 前置知识面板（供两处复用）：
 * - variant="inline"：渲染在正文内，桌面隐藏，窄屏退化为正文顶部横条
 * - variant="toc"：渲染在右侧 TOC 栏顶部（进度条上方），窄屏隐藏
 * 课程数据经全站 NODES 反查标题与链接。 */
const NODE_MAP = new Map(NODES.map((n) => [n.id, n]));

export default function PrereqPanel({ prereqs, variant = 'inline' }) {
  const items = prereqs.map((p) => NODE_MAP.get(String(p).replace(/\.md$/, ''))).filter(Boolean);
  if (!items.length) return null;
  return (
    <aside className={`ml-prereq ml-prereq--${variant}`} aria-label="前置知识">
      <div className="ml-prereq__title">▣ 前置知识</div>
      <ul className="ml-prereq__list">
        {items.map((it) => (
          <li key={it.id}>
            <a href={it.to}>{it.title}</a>
          </li>
        ))}
      </ul>
      <div className="ml-prereq__note">建议先读它们，再来上这一课</div>
    </aside>
  );
}
