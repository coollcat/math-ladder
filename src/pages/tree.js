import React from 'react';
import Layout from '@theme/Layout';
import KnowledgeGraphTree from '@site/src/components/ml-home/KnowledgeGraphTree';

export default function TreePage() {
  return (
    <Layout title="知识树" description="从加法与交换律长出来的知识树：章节模式与单元模式双视角，搜索直达任意节点">
      <main className="container margin-vert--md">
        <h1>知识树 · 从加法交换律长起</h1>
        <p className="ml-fg__lead">
          整棵树的根是「加法与交换律」。两种视角一键切换：<strong>章节模式</strong>把先修线聚合到章，看整座学科如何层层托起；
          <strong>单元模式</strong>逐课展开到全部课程节点。搜索框直达任意课程——回车定位、连续回车逐条轮询。
          巨大画布可拖动、滚轮/双击缩放；悬停胶囊看一条链的来路，点击胶囊只保留与它连通的路径。
          第 0 章「Python 工具箱」是纯工具与附录、不参与数学先修链，已整章排除。
        </p>
        <KnowledgeGraphTree />
      </main>
    </Layout>
  );
}
