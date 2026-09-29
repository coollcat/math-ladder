import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ChapterClusterGraph from '@site/src/components/ml-home/ChapterClusterGraph';

/* =========================================================================
 * 章簇详图页（/chapters）
 * -------------------------------------------------------------------------
 * 与 /graph（同心环「阶梯星系」）并列的第二张全景图，粒度更细：
 *   /graph   一章一颗圆点 —— 看「整门学问从圆心长出去」的层级。
 *   本页     一章一个簇   —— 看「每一章到底讲了什么、章内怎么连」。
 * 两张图共用同一套分层骨架（ringLayout.chapterModel 算出的环分配与环内顺序），
 * 同一章的「第几环」永远一致；本页额外把 1029 门课全部铺在图上，
 * 圆心那一簇是第 0 章「Python 工具箱」。
 * 算法与三档细节的说明见 src/components/ml-home/clusterLayout.js 与
 * ChapterClusterGraph.js 的头注释。
 * ========================================================================= */
export default function ChaptersPage() {
  return (
    <Layout
      title="章簇详图"
      description="79 章一章一簇的详图：章为簇心、每门课绕它排开，章内与跨章先修线全在图上——知识图谱的细节版"
    >
      <main className="container margin-vert--lg">
        <h1>章簇详图 · 每一章都有自己的一个簇</h1>
        <p className="ml-cc__lead">
          知识图谱（<Link to="/graph">同心环</Link>）用一颗圆点代表一章，看的是层级；这一页把粒度放到章里面——<strong>一个圆盘＝一章</strong>，
          盘里的<strong>每一颗小点＝一门课</strong>，本章的课按课程顺序绕着章心排一圈，章内先修线走短弧、跨章先修线走长弧。
          环与环的先后、同一章落在第几环，用的都是知识图谱那一套算法，所以两张图上同一章的层级永远对得上。
          圆盘越大，这一章课越多；圆盘的颜色是它所属的卷。圆心那一簇是第 0 章 Python 工具箱——
          它不参与数学先修分层，却是全站工具链的出生地，放在圆心最合适。
        </p>
        <p className="ml-cc__lead ml-cc__lead--sub">
          全图 <strong>78 章 / 1029 门课</strong>。第 17 章「下一程导读」是目录页而非新课，
          与知识图谱、知识树、首页统计同口径，不画进来。
        </p>
        <ChapterClusterGraph />
      </main>
    </Layout>
  );
}
