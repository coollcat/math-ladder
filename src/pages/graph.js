import React from 'react';
import Layout from '@theme/Layout';
import KnowledgeGraphRadial from '@site/src/components/ml-home/KnowledgeGraphRadial';

/* =========================================================================
 * 知识图谱页（/graph）
 * -------------------------------------------------------------------------
 * 2026-09-29：同心环 v3。环＝层级（不是难度阈值），算法见
 * src/components/ml-home/ringLayout.js —— 难度分位分类 + 强先修边单调上修，
 * 结果：各环 9/15/13/13/10/14 章、难度区间单调递增、**没有一条强先修边朝内**。
 * 于是「基础在圆心、高级在外围」不再是排版效果，而是数据本身的位置。
 * ========================================================================= */
export default function GraphPage() {
  return (
    <Layout
      title="知识图谱"
      description="同心环知识图谱：圆心是起点、外圈是前沿；半径＝层级，颜色＝所属卷，另附按环分组的章节目录"
    >
      <main className="container margin-vert--lg">
        <h1>知识图谱 · 从起点爬到前沿</h1>
        <p className="ml-rg__lead">
          一颗圆点是一章。<strong>离圆心越远，层级越高</strong>：第 1 环是卷一「数学地基」里最靠前的几章
          （算术、分数、幂与对数、代数、几何……），往外依次是主干、进阶、高等、深水，最外一环是范畴论、
          量子信息、可信 AI 这些前沿章。<strong>颜色代表卷</strong>，同色的章在环上连成一段弧。
          连的是章与章之间的先修关系，一律朝外画，看上去就是「整门学问从圆心长出去」。
        </p>
        <p className="ml-rg__lead">
          一颗圆点只能告诉你「哪一章在哪一层」；<strong>点击任意章的圆点</strong>，这一章的每一门课会
          从服务器加载、在图上原位展开成一小圈课点——再点空白处收起，随时回到全景。
          想一眼看尽全部细节？工具条<strong>「全部炸开」</strong>把 78 章的课点一次铺上图，
          再点「收回课点」回到章节模式。
        </p>
        <KnowledgeGraphRadial />
      </main>
    </Layout>
  );
}
