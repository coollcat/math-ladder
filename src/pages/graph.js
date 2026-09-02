import React from 'react';
import Layout from '@theme/Layout';
import KnowledgeGraphFull from '@site/src/components/ml-home/KnowledgeGraphFull';

/* 知识图谱页（泳道图）。组件由子代理从零重写中，这里先保持最小装配。 */
export default function GraphPage() {
  return (
    <Layout title="知识图谱" description="全站课程的完整依赖网络">
      <main className="container margin-vert--md">
        <h1>知识图谱</h1>
        <KnowledgeGraphFull />
      </main>
    </Layout>
  );
}
