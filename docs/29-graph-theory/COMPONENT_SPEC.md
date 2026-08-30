---
title: 第 29 章 · 组件规格（生产档案）
description: 图网络章未来专属组件的需求登记，生产侧文档，不对读者发布。
draft: true
---

# 第 29 章 · 未来专属组件规格

本文件只登记尚未实现的组件需求，正文不得引用未上线渲染器。实现时应遵循 enhancer.js 的 mlBound 守卫、pre[class*="language-"] 选择器基准和路由重扫机制。

| 组件 | 教学目标 | 数据字段 | 交互要求 | 状态 |
| --- | --- | --- | --- | --- |
| graph-builder | 建立“顶点+边”抽象，支持无向/有向切换 | nodes, edges, mode | 空白处拖出节点；节点可拖到画布任意 x/y；点击两端建/删边；悬停高亮邻接 | ✅ 已实现（2026-08-29，回填 10 号课） |
| degree-lab | 观察度序列与握手定理 | nodes, edges, selectedId | 节点自由拖动；度徽标实时更新；右侧排序度序列；奇度点成对面板 | ✅ 已实现（2026-08-28，回填 20 号课） |
| traversal-race | 比较 DFS/BFS 访问层与栈/队列差异 | nodes, edges, startId | 单步/播放；当前队栈可视化；访问号与父指针显示 | 待实现 |
| shortest-path-race | 展示 Dijkstra 固化顺序和松弛 | weightedGraph, source, target | 拖动节点；单步弹出最近点；松弛边闪红；距离表同步 | 待实现 |
| mst-cut | 对照 Kruskal 安全边与割性质 | weightedUndirectedGraph | 节点可拖动；选中割一侧；安全边绿色，成环边灰色；总代价显示 | 待实现 |
| topo-sort-drag | 手动排出合法依赖 | dagNodes, dagEdges | 节点拖入时间轴槽位；非法放置即时提示；剩余入度显示 | 待实现 |
| bipartite-matching | 构造并增广匹配 | left, right, edges, currentMatching | 左右节点可拖动 x/y；点击建边；增广路径动画并一键翻转 | 待实现 |
| euler-hamilton-lab | 分离“每边一次”和“每点一次” | smallGraph | 拖动节点；笔画轨迹回放；奇度面板；Hamilton 尝试计数 | 待实现 |
| planar-crossing | 检查平面嵌入与交叉数 | positionedNodes, edges | 自由拖动节点；交叉点标记；面数与 Euler 公式联动 | 待实现 |
| coloring-board | 正常着色与色数实验 | graph, paletteSize | 拖动节点；点选上色；冲突边报警；贪心顺序编辑 | 待实现 |

## 通用红线

- 节点坐标必须是画布内自由 x/y，不允许固定网格锁死。
- 每次拖动后边、权重和算法状态同步重绘。
- 算法状态至少区分未访问、frontier/current、confirmed、rejected、selected 五类。
- 移动端提供 44px 以上触控目标和缩放或平移。
- 暗色模式下节点填充、边线和文字对比度均需达标。
