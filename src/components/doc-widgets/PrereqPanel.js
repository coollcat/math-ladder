import React from 'react';
import { PREREQ_INDEX } from '@site/src/components/ml-home/prereq-index';

/* 前置知识面板（供两处复用）：
 * - variant="inline"：渲染在正文内，桌面隐藏，窄屏退化为正文顶部横条
 * - variant="toc"：渲染在右侧 TOC 栏顶部（进度条上方），窄屏隐藏
 *
 * 数据走 prereq-index.js（生成器按 prereqs 实际引用到的课裁出来的精简索引），
 * 不引 full-graph-data.js —— 本组件是 theme 级、每个文档页都进首屏，
 * 引全量图谱会把约 317 KB 数据拖进 main.js（占首屏 JS 的三成）。 */
const NODE_MAP = new Map(Object.entries(PREREQ_INDEX));

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
