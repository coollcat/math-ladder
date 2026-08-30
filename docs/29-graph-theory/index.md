---
title: 第 29 章 · 图论
description: 用顶点与边描述关系网络，研究树、路径、匹配、平面性与随机游走。
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 3
---

# 图论

图不关心节点画在哪里，只关心“谁和谁相连”。社交网络、路线规划、依赖调度、网页链接和神经网络都可以放进同一套语言。

## 学习路线

1. [图的定义与现实建模](./10-graph-definition.md)：从关系表到邻接表。
2. [度、握手定理与序列](./20-degree-handshake.md)：给网络做局部体检。
3. [路径、回路与连通性](./30-paths-connectivity.md)：判断能否抵达。
4. [树与森林](./40-trees-forests.md)：最经济又无环的骨架。
5. [生成树与最小生成树](./50-spanning-mst.md)：全网连通的成本优化。
6. [最短路径与 Dijkstra](./60-shortest-path.md)：点到点的最快路线。
7. [拓扑排序与 DAG](./70-topological-dag.md)：无环依赖的合法顺序。
8. [二分图与匹配](./80-bipartite-matching.md)：两边资源如何配对。
9. [Euler 图与 Hamilton 问题](./90-euler-hamilton.md)：一笔画与周游的分界。
10. [强连通分量：有向图的抱团地图](./95-strong-connectivity.md)：有向图里"互相够得着"的抱团与缩点成 DAG。
11. [平面图初步](./100-planar-graphs.md)：能不能摊平而不交叉。
12. [图着色与色数](./105-coloring.md)：相邻冲突的最少标签。
13. [邻接矩阵与图代数](./110-adjacency-algebra.md)：矩阵幂统计通路。
14. [图上的随机游走预告](./115-random-walk-preview.md)：图上的概率流动。
15. [图论方法地图](./120-method-map.md)：从建模到算法选型。
16. [网络流与最大流最小割定理](./125-max-flow.md)：瓶颈决定总流量，最小割的对偶揭示"截断与输送"的守恒。

## 前置回望

集合与关系给出形式定义，递归和算法复杂度提供分析工具，线性代数的矩阵语言承接邻接与转移。本章把这些语言安放在可见的网络结构上。

## 交互形态

现有课程使用浮窗 Python、set-mapper、datachart、plot、counting、matrix-power 与 proof-trail 等已实现组件。拖拽式 graph-builder、degree-lab、shortest-path-race、mst-cut、topo-sort-drag 和 bipartite-matching 属于后续增强，需求见 仓库内的 COMPONENT_SPEC.md。

:::note[生产状态]

16 个正式学习节点已完成并通过课程闭环校验（2026-08 回填[强连通分量：有向图的抱团地图](./95-strong-connectivity.md)）；专属拖拽组件待集成。

:::

## 实战挑战 · 六度分隔社交网络

1967 年，心理学家米尔格拉姆（Stanley Milgram）做了著名的"小世界实验"：请内布拉斯加的志愿者把信件只交给"可能更接近目标"的朋友，一站站传往波士顿。成功送达的链条平均只要五六个中间人——"六度分隔"从此流行。2011 年 Facebook 对数亿用户对的分析也发现平均距离只有三点几度。

用本章的语言说：人是**顶点**，相识是**边**，"最少经过几个中间人"就是无权图的最短路径——而按层扩散的 BFS 第一次碰到某点时，走过的层数恰好就是最短距离（第 30 课）。下面是一个六人迷你朋友圈：

| 人 | 朋友 |
| --- | --- |
| 阿静 | 波仔、陈博 |
| 波仔 | 阿静、小美 |
| 陈博 | 阿静、老周 |
| 小美 | 波仔、老周 |
| 老周 | 陈博、小美、大飞 |
| 大飞 | 老周 |

**(a)** 先做个体检：这张友谊图有多少条边？所有点的度和应该是多少（握手定理）？

**(b)** 从阿静出发做 BFS，算出每个人离她几步：大飞离她几步？

**(c)** 这张图的"分离度"是多少——离阿静最远的人需要几步？

第一问已示范，请补全 BFS 与统计部分：

```exercise
# @title: 实战挑战：六人朋友圈的分离度
# @check: 12
# @check: 3
# @check: 3
# @check: 6
# @hint: 新朋友的距离 = 当前人的距离 + 1；最远距离用一个"打擂台"变量逐个比较即可。
graph = {
    "阿静": ["波仔", "陈博"],
    "波仔": ["阿静", "小美"],
    "陈博": ["阿静", "老周"],
    "小美": ["波仔", "老周"],
    "老周": ["陈博", "小美", "大飞"],
    "大飞": ["老周"],
}

edge_count = 6          # (a)：数一数上表里的边（每条只记一次）
print(edge_count * 2)   # 握手定理：度和 = 边数的两倍

distance = {"阿静": 0}  # 起点到自己的距离是 0
queue = ["阿静"]
while queue:
    current = queue.pop(0)
    for friend in graph[current]:
        if friend not in distance:
            distance[friend] = distance[current]    # ← 少了点什么？
            queue.append(friend)

farthest = 0
for name in distance:
    if distance[name] > farthest:
        farthest = distance[name]

print(distance["大飞"])   # (b)
print(farthest)           # (c)
print(len(distance))      # 能被阿静"够到"的人数
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** 上表共 6 条边：阿静-波仔、阿静-陈博、波仔-小美、陈博-老周、小美-老周、老周-大飞。度和 = 2 × 6 = **12**（每人报一次握手次数再加总）。

**(b)** BFS 按层扩散：

| 层数 | 本层点 | 距离 |
| --- | --- | --- |
| 0 | 阿静 | 0 |
| 1 | 波仔、陈博 | 1 |
| 2 | 小美、老周 | 2 |
| 3 | 大飞 | 3 |

关键一行是把注释处补成 `distance[friend] = distance[current] + 1`：新朋友比当前人多走一步。漏掉 `+ 1` 时所有人都会被记成 0 步——BFS 的"层"信息全丢了。所以 `distance["大飞"]` 为 **3**。

**(c)** 最远的是大飞，分离度为 **3**；`len(distance)` 等于 6 说明整张图从阿静出发全部可达（连通）。对照第 30 课：第一次碰到某点的层数就是最短距离，因为 BFS 先扫完近处才扫远处。

真实社交网络的神奇之处在于：人数以亿计，实际分离度却只有几——大量"捷径边"让最短路径出奇地短，这正是网络科学中的"小世界现象"要量化的事。
</details>

课程回链：[路径、回路与连通性](./30-paths-connectivity.md)（BFS 按层求距）、[度、握手定理与序列](./20-degree-handshake.md)（体检公式）、[最短路径与 Dijkstra](./60-shortest-path.md)（带上时间权重后该换哪件工具）。

## 实战挑战 · 握手定理：边数等于度数之和的一半

握手定理说：所有顶点的度数之和等于边数的两倍。某图 4 个顶点的度分别是 $3,2,2,1$，边数应是 $\frac{3+2+2+1}{2}=4$。下面这题忘了除以 2，修到输出 `4.0`：

```exercise
# @title: 实战挑战：握手定理别忘除 2
# @check: 4.0
# @hint: 每条边贡献 2 个度数，所以边数 = 度数之和 ÷ 2。
degrees = [3, 2, 2, 1]
total = 0
for d in degrees:      # 累加所有顶点的度数
    total = total + d
edge_count = total     # ← 问题在这：忘了除以 2
print(edge_count)
```

<details>
<summary>点开查看逐步解答</summary>

每条边连接两个端点，各贡献一个度，所以度数之和是边数的两倍：

```python
edge_count = total / 2   # 8 / 2
print(edge_count)        # 4.0
```

改完：$\frac{3+2+2+1}{2} = 4.0$。初始代码输出 $8$，等于把"度数和"当成了"边数"。握手定理 $\sum\deg(v) = 2|E|$ 是图论第一公式，也是"度序列能否成图"的判据起点——任何图的度数和必为偶数。

</details>
