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

边 AB,BC,CD,CE 中，A-B-C-B-C-E 是通路但因重复 B、C 不是路径；去掉重复得路径 A-B-C-E。删除 BC 后分成 {A,B} 与 {C,D,E} 两个分量。

## 5. 动手实验

### 实验 1（lab）：BFS 一层一层铺开，顺便数清有几个岛

```lab
{
  "type": "gt-path-walk",
  "title": "从 A 出发：BFS 给每个点标层号，F 一直是灰的——它在另一个连通分量里",
  "nodes": ["A", "B", "C", "D", "E", "F"],
  "edges": [["A", "B"], ["B", "C"], ["C", "D"], ["C", "E"], ["A", "C"]],
  "start": "A",
  "height": 520
}
```

BFS 用队列把点按「离起点几步」的分层顺序扫出去：**「单步 ▶」**推进一层，每个点旁边写上它的层号与父指针，队列里还排着谁也实时列出来。层号就是**最短**边数——BFS 先把近处扫完才轮到远处，所以它给出的路不可能有捷径。

F 全程保持灰白：它没有任何边接进来，是独立的连通分量。右侧「连通性体检」直接数出分量个数，并列出每个岛包含哪些点——这正是「连通 $\ne$ 处处有路」的现场。**点任意顶点**可以把它设成新的目标，绿色那条就是到目标的最短路径；点一个不可达的目标，面板会直接写「不可达」，而不是画一条假路。

### 实验 2（python）：用队列做广度优先可达检查

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
# @hint: 现在只扩散了一层就停了——对照上面实验块，把只执行一次的 if 换成循环写法。E 只指着 D、D 没指回来，所以不会出现在答案里。
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
