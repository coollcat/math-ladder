---
title: 图上的随机游走预告
lesson_id: graph-theory/random-walk-preview
prereqs:
  - graph-theory/adjacency-algebra
  - prob/law
  - linalg-advanced/matrix-powers
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
  - transition-matrix-on-graph
  - stationary-distribution
  - random-walk-preview
applications:
  - pagerank
  - diffusion
exits:
  - data-ai
  - probability-statistics
---
# 图上的随机游走预告

## 1. 开场钩子

一只蚂蚁在网络的路口随机选边。单步完全不可预测，但几千步后的位置比例可能几乎不动。图论和概率在这里握手。

## 2. 直觉解释

把邻接关系按度数归一化得到转移矩阵 P：第 j 列表示从 j 出发到各邻居的概率。分布 p 经一步变成 Pp，k 步为 P^k p。

## 3. 正式定义

无向连通非平凡图中，从顶点 j 均匀走向邻居的转移矩阵为 $P_{ij}=1/d(j)$（i 与 j 相邻）。平稳分布 $\pi$ 满足 $P\pi=\pi$；无向图常与度成正比：$\pi_i=d(i)/(2m)$。

## 4. 分步例题

路径 1-2-3 的度为 1,2,1，总度 4，平稳分布约为 1/4,1/2,1/4。中间点连接更多，长期更容易被访问。

## 5. 动手实验

```viz
{
  "type": "matrix-power",
  "title": "两态转移矩阵的幂",
  "pAA": 0.8,
  "pBB": 0.7,
  "power": 2
}
```

这个两态小网络先展示“概率转移”和“矩阵幂”：拖动自留概率或步数，看从 A 出发的分布如何变化。下面的三顶点路径图则用模拟检查度数带来的长期差异。

```python title="模拟蚂蚁在路径图上随机游走"
import random   # random 已在早期课程引入；choice 从列表中等概率抽一项
neighbors={1:[2],2:[1,3],3:[2]}
pos=1
visits={1:0,2:0,3:0}
for step in range(6000):
    visits[pos]+=1
    pos=random.choice(neighbors[pos])
print([round(visits[v]/6000,3) for v in [1,2,3]])
```

多次运行会看到比例靠近 0.25,0.50,0.25。把 6000 改成 60，波动会明显变大。

:::warning[常见误区]

**误区一**：随机游走不会均匀访问所有点，高度数点更常被访问。

**误区二**：邻接矩阵要归一化才是转移矩阵。

**误区三**：短期样本偏离不代表理论错，可能只是步数太少。

:::

## 6. 练习与定理快问

```exercise
# @title: 写出路径图平稳比例
# @check: [0.25, 0.5, 0.25]
# @hint: 平稳分布与度成正比：分母应是总度数 total（1+2+1=4），不是顶点个数。
degrees=[1,2,1]
total=sum(degrees)
stationary=[round(d/len(degrees),2) for d in degrees]   # ← 除以的不是总度数
print(stationary)
```

```quiz
无向图均匀随机游走的平稳分布与什么成正比？
- 顶点编号
- 顶点度数 [*]
- 边的颜色
? 度数大的点有更多出口，也更容易被进入。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

令 pi_i=d(i)/(2m)。对任意 j，先把每个邻居 i 的平稳概率除以它的度 d(i)，再对所有邻居求和；每条邻接边贡献 1/(2m)，共有 d(j) 个邻居，所以流入概率也是 d(j)/(2m)。因此 Pπ=π。
</details>

## 7. 方法边界

本课是卷四马尔可夫链和卷五 PageRank 的预告；严谨讨论需要不可约、非周期等条件。

## 8. 下一站

概念很多，如何判断一个问题该用哪件工具？

→ [图论方法地图](./120-method-map.md)
