---
title: Laplacian 矩阵
lesson_id: graphs-networks/laplacian
prereqs:
  - graphs-networks/weighted-transition
volume: 5
layer: L11
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - graph-laplacian
applications:
  - community-detection
  - diffusion-analysis
exits:
  - data-ai
  - engineering
---

# Laplacian 矩阵

## 1. 开场钩子

邻接矩阵记录“哪里有边”，Laplacian 矩阵则记录“差异在哪里难发生”。如果两个相连节点被赋上不同温度，Laplacian 的能量会变大；如果整个连通块温度相同，能量为零。

这一课把度矩阵和邻接矩阵相减，得到谱图论的核心对象。

## 2. 直觉解释

三角形三个节点两两相连。每个节点的度都是 2，所以度矩阵是

$$D=\begin{pmatrix}2&0&0\\0&2&0\\0&0&2\end{pmatrix}.$$

邻接矩阵是

$$A=\begin{pmatrix}0&1&1\\1&0&1\\1&1&0\end{pmatrix}.$$

两者相减：

$$L=D-A=\begin{pmatrix}2&-1&-1\\-1&2&-1\\-1&-1&2\end{pmatrix}.$$

每一行相加都是 0。这不是巧合：常数信号在图中没有局部差异。

## 3. 正式定义

对无向无权图，令 $D$ 为度矩阵、$A$ 为邻接矩阵，则组合拉普拉斯矩阵为

$$L=D-A.$$

它的二次型满足

$$\vec x^TL\vec x=\sum_{(i,j)\in E}(x_i-x_j)^2.$$

右边是所有相邻节点取值差异的平方和。若图连通且 $L\vec x=0$，则所有 $x_i$ 相等。

## 4. 分步例题

给三角形三个节点赋值 $(1,2,4)$。

1. 边 $(1,2)$ 的差异平方是 1；
2. 边 $(1,3)$ 的差异平方是 9；
3. 边 $(2,3)$ 的差异平方是 4；
4. 总能量是 $1+9+4=14$；
5. 若改成 $(2,2,2)$，三条边差异全为 0，总能量也是 0。

## 5. 动手实验

### 实验 1（lab）：给节点赋值，看能量怎么变

$L$ 的意义不在于它长什么样，而在于它作用在一个信号上会给出什么数。下面这张卡里，每个节点的高低就是它的取值 $x_i$：

```lab
{
  "type": "g53-laplacian-energy",
  "title": "三角形上赋值 (1,2,4)：能量从哪来",
  "nodes": ["A", "B", "C"],
  "edges": [[0, 1], [0, 2], [1, 2]],
  "values": [1, 2, 4]
}
```

先对上课程例题：初始取值 $(1,2,4)$，边上写着三条差 $1$、$3$、$2$，平方和 $1+9+4=14$，右下角两个数字（按边逐条算、按 $x^{\mathsf T}Lx$ 算）都是 14——**一条边都没有被漏掉**。

然后点 `抹平（拉向均值）`：每点一次，所有取值向均值走一半，能量单调往下掉。点五六次，能量趋近 0，边上三个数字一起变成 0——这就是「若图连通且 $Lx=0$，则所有 $x_i$ 相等」。反过来，随便点 `随机取值`，能量立刻跳起来。

最后点 `用第二特征向量`：取值被换成 Fiedler 向量，此时能量恰好等于 $\lambda_2\lVert x\rVert^2$，读数条里的 $\lambda_2$ 与能量能对上。这一条是下一课谱聚类的引子，先记住「能量最低的非平凡方向就是那条裂缝」。

### 实验 2（python）：从边表构造三角形 Laplacian

下面代码从边表构造 $D-A$。你可以增加一条边，观察对应行列如何同时变化。

```python title="从边表构造三角形 Laplacian"
nodes = ["A", "B", "C"]
edges = [("A", "B"), ("A", "C"), ("B", "C")]
n = len(nodes)

A = [[0] * n for row in range(n)]
degrees = [0] * n
for u, v in edges:
    i, j = nodes.index(u), nodes.index(v)
    A[i][j] = 1
    A[j][i] = 1
    degrees[i] += 1
    degrees[j] += 1

L = [[0] * n for row in range(n)]
for i in range(n):
    for j in range(n):
        if i == j:
            L[i][j] = degrees[i]   # 对角线放度数
        else:
            L[i][j] = -A[i][j]     # 邻居位置放负边

for row in L:
    print(row)
print([sum(row) for row in L])     # 每行都应为零
```

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 Laplacian 就是 $A-D$。常见约定是 $D-A$；符号反过来会改变特征向量方向。

**误区二**：你以为行和为零只针对三角形。任何无向无权图的 $D-A$ 行和都为零。

**误区三**：你以为零特征值只有一个。零特征值的重数等于连通分量个数，下一组课程会展开。

:::

## 7. 练习

```exercise
# @title: 练习：构造链形图的 Laplacian
# @check: [1, -1, 0]
# @check: [-1, 2, -1]
# @check: [0, -1, 1]
# @check: [0, 0, 0]
# @hint: 度放在对角线，边放负一号；最后输出每行的和。
nodes = ["A", "B", "C"]
edges = [("A", "B"), ("B", "C")]

A = [[0] * 3 for row in range(3)]
degree = [0] * 3
for u, v in edges:
    i, j = nodes.index(u), nodes.index(v)
    A[i][j] = 1
    degree[i] += 1

L = [[0] * 3 for row in range(3)]
for i in range(3):
    for j in range(3):
        L[i][j] = degree[i] if i == j else -A[i][j]

for row in L:
    print(row)
print([sum(row) for row in L])
```

<details>
<summary>点开查看逐步解答</summary>

三个节点的度分别是 1、2、1。因此：

$$L=\begin{pmatrix}1&-1&0\\-1&2&-1\\0&-1&1\end{pmatrix}.$$

每行相加得到 `[0, 0, 0]`。

</details>

## 8. 快问快答

```quiz
无向无权图的组合 Laplacian 为什么行和为零？
- 因为所有元素都是整数
- 因为对角线度数等于该行邻居边的数量之和 [*]
- 因为邻接矩阵是对称矩阵
? 第 i 行中，度 Dii 正好抵消这一行所有 -1。
```

## 9. 选读：能量的两种读法

<details>
<summary>选读 · 二次型为什么等于边长差的平方和</summary>

正文直接给了 $\vec x^{\top}L\vec x=\sum_{(i,j)\in E}(x_i-x_j)^2$。这一步值得当面推一遍，因为它是整章的地基。

展开 $\vec x^{\top}(D-A)\vec x$：

$$\vec x^{\top}D\vec x=\sum_i d_i x_i^2,\qquad \vec x^{\top}A\vec x=2\sum_{(i,j)\in E}x_ix_j.$$

第一式来自 $D$ 是对角阵（每项 $d_ix_i^2$），第二式来自 $A$ 对称（无向边的 $(i,j)$ 与 $(j,i)$ 各贡献一次，合成 $2x_ix_j$）。两式相减：

$$\vec x^{\top}L\vec x=\sum_i d_ix_i^2-2\sum_{(i,j)\in E}x_ix_j=\sum_{(i,j)\in E}(x_i-x_j)^2,$$

最后一步只是把 $d_ix_i^2$ 按边拆开、每边各分一份 $x_i^2+x_j^2$。

**三个立刻可用的推论**：① 二次型恒非负，所以 $L$ 半正定；② 取等号当且仅当每条边两端取值相等，于是"零空间 = 每个连通块上取常数的向量"；③ $\vec 1$ 恒在零空间里，因为常数向量所有差都是 0。

**实跑对账**：三角形赋值 $(1,2,4)$，三条边差为 $-1,-3,-2$，平方和 $1+9+4=14$；换成常数赋值 $(2,2,2)$ 全差为零，能量 $0$——这正是推论③的具体版本。

</details>

## 10. 下一站

$D-A$ 只是最基础的形式。把度矩阵单独拿出来，还能造出适合随机游走和谱聚类的归一化版本。

→ [度矩阵与拉普拉斯含义](./45-degree-normalization.md)
