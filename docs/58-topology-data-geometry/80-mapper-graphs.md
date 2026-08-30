---
title: mapper 图概览
lesson_id: tdg/mapper-graphs
prereqs:
  - tdg/persistence-diagrams
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - mapper-graph
applications:
  - exploratory-data-analysis
exits:
  - data-ai
---

# mapper 图概览

## 1. 开场钩子

面对几百个客户或细胞，直接看点云会糊成一片。mapper 先选一个“镜头”，比如风险分数、年龄或主成分，把数据切成重叠条带；再在每个条带里聚类，把重叠的簇连成图。

## 2. 直觉解释

mapper 有三步：

1. 用连续函数 $f:X\to\mathbb R^k$ 当镜头；
2. 用带重叠的开覆盖罩住镜头空间；
3. 对每个原像做聚类，每个簇是一个节点；两个节点所属的原像有公共点就连边。

环形数据沿角度切开并允许相邻条带重叠时，mapper 通常会形成一圈；条形分布则更像一条链。

## 3. 正式定义

设 $f:X\to Z$ 连续，$\mathcal U=\lbrace U_j\rbrace$ 是 $Z$ 的有限开覆盖。对每个原像 $C_j=f^{-1}(U_j)$ 执行聚类，得到节点集合 $V$。

若节点 $v\subset f^{-1}(U_i)$ 与 $w\subset f^{-1}(U_j)$ 满足 $v\cap w\neq\varnothing$ 且 $i\neq j$，则在 mapper 图中连边 $vw$。

## 4. 分步例题

八个点的一维坐标是 $0,1,2,3,4,5,6,7$。

1. 取恒等函数为镜头；
2. 覆盖区间为 $[0,3),(2,5),(4,7]$，相邻区间重叠；
3. 第一个原像包含 0,1,2；第二个包含 3,4；第三个包含 5,6；
4. 若每段各聚成一簇，则得三个节点；
5. 因为原像本身不相交，没有边，图是三个孤点；若把重叠加大使第二个原像含 2,3,4,5，则会形成链。

## 5. 动手实验

```viz
{
  "type": "fit",
  "n": 10
}
```

先把十个点拖成水平环状轨迹，再想象用一个纵坐标镜头切成上下重叠带。当前组件支持逐点沿 x/y 双轴拖拽；未来 mapper 盘会自动显示切带、簇节点和桥边。

```python title="一维镜头的最简 mapper 原型"
values = [0, 1, 2, 3, 4, 5, 6, 7, 8]
covers = [(0, 3), (2, 5), (4, 7)]
max_points = 20   # 过滤和搜索都必须有上限

nodes = []
for low, high in covers[:max_points]:
    members = [value for value in values[:max_points] if low <= value < high]
    if members:
        nodes.append(members)

print(nodes)
```

这里每个覆盖段直接视为一簇。真实 mapper 还要做密度过滤、聚类和节点大小统计。

```quiz
mapper 图中的两个节点什么时候连边？
- 只要它们来自相邻覆盖区间
- 只要对应簇至少共享一个样本 [*]
- 只要两个节点的样本数都很大
? mapper 的桥边由原像簇的实际重叠决定；相邻覆盖只是提供产生重叠的机会。
```

## 6. 练习

```exercise
# @title: 练习：连接有公共样本的相邻簇
# @check: [(0, 1)]
# @check: []
# @hint: 对相邻覆盖段的成员求交集，只要非空就记录节点编号对。
memberships = [
    [0, 1, 2],
    [2, 3],
    [4, 5],
]
edges = []

for i in range(len(memberships) - 1):
    shared = set(memberships[i])
    print(edges)
```

<details>
<summary>点开查看逐步解答</summary>

相邻簇求交：

```python
memberships = [
    [0, 1, 2],
    [2, 3],
    [4, 5],
]
for i in range(len(memberships) - 1):
    shared = set(memberships[i]) & set(memberships[i + 1])   # & 对两个集合求交集
    if shared:
        print([(i, i + 1)])   # 有公共样本：输出这条桥边
    else:
        print([])             # 没有公共样本：空表
```

第一对共享 2 号样本，第二对不共享，所以输出 `[(0, 1)]` 和空表。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为覆盖切得越细越好。条带太密会把一个真实簇撕成假碎片，太疏又会把不同结构粘成一团——重叠比例是 mapper 的命门。

**误区二**：你以为 mapper 的环一定证明真实闭环。覆盖重叠不足或过度都会制造或破坏环路。

**误区三**：你以为节点大小就是统计显著性。最小簇大小、采样密度和镜头函数都会改变图结构。

:::

## 8. 选读：参数怎么报

<details>
<summary>选读 · 可复现 mapper 最少清单</summary>

至少报告镜头函数、覆盖区间数量、重叠比例、聚类算法、距离度量、最小簇大小、异常值处理和随机种子。还应展示参数网格下的图变化。

工程上建议先限制样本量和覆盖数上限，再并行尝试少量合理组合，而不是盲目搜索全部参数。

</details>

## 9. 下一站

工具已经齐了，接下来把它们放回真实问题：分子、传感器、图像嵌入和可信 AI。

→ [拓扑数据分析应用](./85-tda-applications.md)
