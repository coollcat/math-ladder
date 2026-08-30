---
title: 路径、回路与连通性
lesson_id: graph-theory/paths-connectivity
prereqs:
  - graph-theory/degree-handshake
  - python-tools/matplotlib
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - walk
  - path
  - cycle
  - connected-component
applications:
  - road-network
  - communication-network
exits:
  - engineering
  - research
---
# 路径、回路与连通性

## 1. 开场钩子

导航软件关心有没有路、有几段路、绕一圈是否回来。这三个问题分别对应通路、路径和回路。

## 2. 直觉解释

通路允许重复点和边；路径不重复经过点；回路从某点出发又回到它。连通像岛屿：同岛彼此可达，异岛没有桥。

## 3. 正式定义

通路是顶点与边交替序列 $v_0e_1v_1\cdots e_kv_k$。所有顶点不同的通路叫路径；$k>0$ 且 $v_k=v_0$ 叫回路。任意两点都有通路的无向图连通；极大连通子图叫连通分量。

## 4. 分步例题

边 AB,BC,CD,CE 中，A-B-C-C-E 是通路但因重复 C 不是路径；去掉重复得路径 A-B-C-E。删除 BC 后分成 {A,B} 与 {C,D,E} 两个分量。

## 5. 动手实验

```python title="用队列做广度优先可达检查"
graph={"A":["B"],"B":["A","C"],"C":["B","D","E"],"D":["C"],"E":["C"],"F":[]}
queue=["A"]      # 列表当先进先出队列
seen={"A"}       # 集合记录见过的点
while queue:     # 队列不空就继续扩散
    current=queue.pop(0)
    print(current)
    for neighbor in graph[current]:
        if neighbor not in seen:
            seen.add(neighbor)
            queue.append(neighbor)
print(sorted(seen))
```

输出层层外扩：A、B、C，最后 D/E。F 不出现，说明它在另一个分量。

:::warning[常见误区]

**误区一**：连通性只问存在路，不保证路短。

**误区二**：回路允许重复边；环通常指无重复闭合路径。

**误区三**：有向图不能由单向通路推出反向可达——单行道里"进得来"不等于"出得去"。这条裂缝往下挖，就是[强连通分量：有向图的抱团地图](./95-strong-connectivity.md)要画的抱团地图。

:::

## 6. 练习与定理快问

```exercise
# @title: 判断哪些点从 A 可达
# @check: ['A', 'B', 'C', 'D']
# @hint: 现在只扩散了一层就停了——对照上面实验块，把只执行一次的 if 换成循环写法。E 只被 D 指着、没指回来，所以不会出现在答案里。
graph={"A":["B"],"B":["A","C"],"C":["B","D"],"D":["C"],"E":["D"]}
queue=["A"]
seen={"A"}
if queue:
    current=queue.pop(0)
    for neighbor in graph[current]:
        if neighbor not in seen:
            seen.add(neighbor)
            queue.append(neighbor)
print(sorted(seen))
```

```quiz
u 可达 v 且 v 可达 w 时，u 是否一定可达 w？
- 不一定
- 一定 [*]
- 只有树才一定
? 可达关系可传递：两条路相接即可。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

广度优先搜索维护已确认集合；每次只加入未见过的直接邻居，每点最多入队一次，最终得到起点所在分量。
</details>

## 7. 方法边界

无权图中 BFS 给最少边数路线；带时间或距离要换 Dijkstra。

## 8. 下一站

当连通图不允许任何多余环路时，它就变成最经济的骨架——树。

→ [树与森林](./40-trees-forests.md)
