---
title: 邻接矩阵与图代数
lesson_id: graph-theory/adjacency-algebra
prereqs:
  - graph-theory/graph-definition
  - linalg/matrix
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
  - adjacency-matrix
  - matrix-walk-count
  - graph-spectrum-preview
applications:
  - network-analysis
  - relational-data
exits:
  - data-ai
  - research
---
# 邻接矩阵与图代数

## 1. 开场钩子

一张 0/1 方阵可以完整记住谁连谁。更神奇的是，矩阵平方一次就能数清两步通路有多少条。

## 2. 直觉解释

邻接矩阵 A 的第 i 行第 j 列为 1 表示相邻。$(A^2)_{ij}$ 统计经过一个中间点的两步通路数；$A^k$ 统计 k 步通路数。

## 3. 正式定义

按顶点编号定义 $A_{ij}=1$ 当 $i,j$ 相邻，否则为 0。无向图的邻接矩阵对称；$(A^k)_{ij}$ 等于从 i 到 j 长度为 k 的通路数。

## 4. 分步例题

路径 1-2-3 的邻接矩阵平方为 [[1,0,1],[0,2,0],[1,0,1]]。从 1 到 3 恰有一条两步路，从 2 回到自己有经 1 或经 3 两种方式。

## 5. 动手实验

```viz
{
  "type": "datachart",
  "title": "路径图 A² 中的通路计数",
  "labels": ["1 到 1", "1 到 3", "2 到 2"],
  "values": [1, 1, 2]
}
```

```python title="手算邻接矩阵平方并读取两步路数"
A=[[0,1,0],[1,0,1],[0,1,0]]
A2=[[0,0,0],[0,0,0],[0,0,0]]
for i in range(3):
    for j in range(3):
        total=0
        for k in range(3):
            total+=A[i][k]*A[k][j]   # 经过中间点 k 的通路贡献
        A2[i][j]=total
print(A2)
print(A2[0][2],A2[1][1])
```

:::warning[常见误区]

**误区一**：矩阵平方必须按矩阵乘法累加路径，不是逐元素平方。

**误区二**：有向图的邻接矩阵可以不对称。

**误区三**：矩阵元素大于零说明存在通路，但不保证无重复点。

:::

## 6. 练习与定理快问

```exercise
# @title: 补齐路径图的 A²
# @check: [[1, 0, 1], [0, 2, 0], [1, 0, 1]]
# @check: 1 2
# @hint: 逐元素平方数不出通路——A² 的第 i 行第 j 列要按矩阵乘法算：对每个中间点 k，把 A[i][k]*A[k][j] 累加起来（参考上面实验块的三重循环）。
A=[[0,1,0],[1,0,1],[0,1,0]]
A2=[]
for row in A:
    new_row=[]
    for value in row:
        new_row.append(value*value)   # ← 这是逐元素平方，不是矩阵乘法
    A2.append(new_row)
print(A2)
print(A2[0][2],A2[1][1])
```

```quiz
(A^3)_ij 的图论含义是什么？
- 三角形个数
- i 到 j 的 3 步通路数 [*]
- 最短路径长度
? 矩阵乘法逐层组合一步连接，统计三步走法。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

对 k 归纳：一步由定义成立；若 A^(k-1) 统计 k-1 步路，则先走一步到 r，再走 k-1 步到 j，求和恰好分类所有 k 步通路。
</details>

## 7. 方法边界

邻接矩阵适合密集图和代数分析；稀疏大图仍常用邻接表。若每列换成概率，就得到随机游走转移矩阵。

## 8. 下一站

在每个路口随机选一条边，长期行为会稳定下来吗？

→ [图上的随机游走预告](./115-random-walk-preview.md)
