import React from 'react';
import Layout from '@theme/Layout';
import KnowledgeGraphFull from '@site/src/components/ml-home/KnowledgeGraphFull';

export default function GraphPage() {
  return (
    <Layout title="知识图谱" description="全站课程的完整依赖网络：先修关系、工具血缘与先修深度">
      <main className="container margin-vert--md">
        <h1>知识图谱 · 逐课细览</h1>
        <p className="ml-fg__lead">
          每条线都来自课程的真实数据：先修线来自各课 front matter 的 prereqs，血缘线来自对全部代码块的扫描。左侧数字是先修深度——从 1+1 出发走到这节课最长要经过多少层。
        </p>
        <KnowledgeGraphFull />
      </main>
    </Layout>
  );
}
