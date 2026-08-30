---
title: 最短路径与 Dijkstra
lesson_id: graph-theory/shortest-path
prereqs:
  - graph-theory/spanning-mst
  - python-tools/conventions
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - weighted-graph
  - shortest-path
  - dijkstra
applications:
  - navigation
  - routing
exits:
  - engineering
  - optimization-control
---
# 最短路径与 Dijkstra

## 1. 开场钩子

两条路线可能拐弯次数相同，但一条 12 分钟、另一条 25 分钟。加权图给每条边配上时间或距离，“最好走”才有精确含义。

## 2. 直觉解释

Dijkstra 像水位上涨：最近的点先确定，再用它更新邻居。一个点一旦成为未确定点中最近者，就没有更晚出发的绕路能抢先到达。

## 3. 正式定义

非负加权图中，路径权值是边权和。单源最短路径求起点到每点的最小权值；Dijkstra 每轮取出临时距离最小的未确定点并固化。

## 4. 分步例题

边 sA=2,sB=5,AB=1,BC=3,AC=8。先有 A=2,B=5；取 A 后 B 更新为 min(5,2+1)=3，C=10；取 B 后 C=6。答案 A=2,B=3,C=6。

## 5. 动手实验

```viz
{
  "type": "datachart",
  "labels": [
    "s",
    "A",
    "B",
    "C"
  ],
  "values": [
    0,
    2,
    3,
    6
  ]
}
```

```python title="小型 Dijkstra 手工版"
dist={"s":0,"A":99,"B":99,"C":99}
edges={"s":[("A",2),("B",5)],"A":[("B",1),("C",8)],"B":[("C",3)],"C":[]}
visited=set()
for step in range(4):
    # min(...)：从尚未确定的顶点里挑当前距离最短的一个
    current=min((v for v in dist if v not in visited),key=lambda v:dist[v])
    visited.add(current)
    for neighbor,weight in edges[current]:
        candidate=dist[current]+weight
        if candidate<dist[neighbor]:
            dist[neighbor]=candidate   # 松弛：发现更短路线就更新
print([dist[name] for name in ["s","A","B","C"]])
```

:::warning[常见误区]

**误区一**：边数最少不一定最快，权重不同时不成立。

**误区二**：Dijkstra 不能直接用于负权边。

**误区三**：只更新距离不记录前驱，就无法还原完整路线。

:::

## 6. 练习与定理快问

```exercise
# @title: 按松弛规则更新距离
# @check: [0, 2, 3, 6]
# @hint: 新候选路线是 dist[u]+w，只有当它比当前记录更短才更新——用 min() 把两者比一比，而不是直接覆盖。
dist={"s":0,"A":2,"B":5,"C":99}
edges={"A":[("B",1),("C",8)],"B":[("C",3)],"C":[]}
for u in ["A","B"]:
    for v,w in edges[u]:
        dist[v]=w          # ← 松弛写错了：不管远近都直接覆盖
print([dist[name] for name in ["s","A","B","C"]])
```

```quiz
Dijkstra 要求边权满足什么条件？
- 必须全是整数
- 必须非负 [*]
- 必须互不相同
? 负权会破坏“当前最近点已确定”的贪心依据。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

归纳：第一次选出的点距起点最近；若第 k+1 个点有更短路径，该路径必跨出已确定区域，其第一条跨割边的临时距离会更小，与选取规则矛盾。
</details>

## 7. 方法边界

Dijkstra 适合非负权单源问题；全源可用多次运行或 Floyd-Warshall。依赖先后关系的问题转向 DAG。

## 8. 下一站

有些关系不能绕圈：先穿袜子，再穿鞋。

→ [拓扑排序与 DAG](./70-topological-dag.md)
