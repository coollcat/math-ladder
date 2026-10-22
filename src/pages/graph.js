import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import KnowledgeAtlas from '@site/src/components/ml-home/KnowledgeAtlas';
import '@site/src/css/graph-pages.css';

/* =========================================================================
 * 知识图谱页（/graph）·「阶梯版图」
 * -------------------------------------------------------------------------
 * 2026-10 重做：同心环退役。列 = 层级（ringLayout.chapterModel 的口径不变），
 * 行 = 七卷，一章一张卡、一格一门课。实现与口径见 KnowledgeAtlas.js 头注释与
 * UNIT_GUIDES/graph-pages.md。
 * ========================================================================= */
export default function GraphPage() {
  return (
    <Layout
      title="知识图谱"
      description="阶梯版图：七卷 × 六级台阶，一章一张卡、一格一门课，悬停看先修与后续，并点亮你的学习进度"
    >
      <main className="ml-gp container margin-vert--md">
        <header className="ml-gp-head">
          <p className="ml-gp-kicker">知识图谱 · 阶梯版图</p>
          <h1>整座数学阶梯，一张图看完</h1>
          <p className="ml-gp-lede">
            往右是台阶，往下是领域。每张卡是一章，卡里每一格是一门课。悬停看谁托起它，点击看课表和来路。
            想看单门课的来龙去脉，去<Link to="/tree">课程家谱</Link>。
          </p>
        </header>
        <KnowledgeAtlas />
      </main>
    </Layout>
  );
}
