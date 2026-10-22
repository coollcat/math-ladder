import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';
import '@site/src/css/graph-pages.css';

/* =========================================================================
 * 知识树页（/tree）·「课程家谱」
 * -------------------------------------------------------------------------
 * 2026-10 重做：整棵千余节点的块布局树退役，改为「一次看一门课」的来路与去向。
 * 焦点来自地址栏 ?l=课程id（可分享、可后退），所以组件只在浏览器里渲染
 * （BrowserOnly）——SSR 拿不到查询串，先画默认课再跳会闪一下。
 * 实现见 LessonLineage.js 与 lineageLayout.js。
 * ========================================================================= */
export default function TreePage() {
  return (
    <Layout
      title="知识树"
      description="课程家谱：任选一门课，看它站在哪些课的肩上、又解锁了哪些课；有学习记录时标出下一步该补哪一块砖"
    >
      <main className="ml-gp container margin-vert--md">
        <header className="ml-gp-head">
          <p className="ml-gp-kicker">知识树 · 课程家谱</p>
          <h1>每一门课，都站在别的课肩上</h1>
          <p className="ml-gp-lede">
            左边是它的先修，一层层往前追到地基；右边是学会它之后能去的地方。单击任意一门课，图就以它为中心重排。
            想看全站版图，去<Link to="/graph">知识图谱</Link>。
          </p>
        </header>
        <BrowserOnly fallback={<div className="ml-lin ml-lin--loading">正在铺开家谱…</div>}>
          {() => {
            const LessonLineage = require('@site/src/components/ml-home/LessonLineage').default;
            return <LessonLineage />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
