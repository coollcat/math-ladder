---
title: 矩阵幂与图传播
lesson_id: linalg-advanced/matrix-powers
prereqs:
  - linalg-advanced/condition-number
volume: 2
layer: L6
track:
  - geometry-space
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - transition-matrix
  - matrix-power
applications:
  - pagerank
  - markov-chain
exits:
  - data-ai
  - engineering
---

# 矩阵幂与图传播

## 1. 从一个场景开始

一个人今天在 A 城或 B 城，明天按概率移动。问“后天还在 A 城的概率”时，不用逐条模拟所有路径；把一步转移写成矩阵，平方一次就得到两步答案。

## 2. 直觉解释

两状态转移矩阵按列写出“从哪里出发”：

$$P=\begin{pmatrix}0.8&0.3\\0.2&0.7\end{pmatrix}.$$

第一列表示从 A 出发：0.8 留在 A，0.2 去 B；第二列表示从 B 出发：0.3 去 A，0.7 留在 B。每一列相加都是 1。

从 A 出发的分布是 $\binom10$。两步后：

$$P^2\binom10=P\left(P\binom10\right).$$

矩阵乘法天然记录“先走一步，再走一步”。

## 3. 正式定义

若列随机矩阵 $P$ 的第 $j$ 列表示从状态 $j$ 出发的概率分布，则：

$$\sum_{i=1}^n P_{ij}=1.$$

$k$ 步转移矩阵是 $P^k$。初始概率分布向量 $\vec p_0$ 的各分量相加为 1，则 $k$ 步后分布为：

$$\vec p_k=P^k\vec p_0.$$

若 $P^k$ 收敛，极限列通常对应平稳分布。

## 4. 分步例题

仍取

$$P=\begin{pmatrix}0.8&0.3\\0.2&0.7\end{pmatrix}.$$

1. 一步后从 A 出发：$(0.8,0.2)$；
2. 两步留在 A 的概率：

$$0.8\cdot0.8+0.3\cdot0.2=0.64+0.06=0.70.$$

3. 两步到 B 的概率：

$$0.2\cdot0.8+0.7\cdot0.2=0.16+0.14=0.30.$$

4. 所以 $P^2\binom10=(0.70,0.30)$。

## 5. 动手实验

### 实验 1：多步传播盘

```viz
{
  "type": "matrix-power",
  "title": "从 A 出发的概率演化",
  "pAA": 0.8,
  "pBB": 0.7,
  "power": 1
}
```

把幂次从 1 拖到 12。柱状图从 $(1,0)$ 开始逐渐靠近长期分布；调整两个留守概率，观察收敛速度。

### 实验 2：一步矩阵的几何视角

```viz
{
  "type": "matrix",
  "title": "转移矩阵也是一次线性映射",
  "a": 0.8,
  "b": 0.3,
  "c": 0.2,
  "d": 0.7
}
```

概率分布是向量，转移矩阵是线性映射；矩阵幂就是把同一映射反复作用。

### 实验 3：Python 手算平方

```python title="不依赖库，算 P² 并乘初始分布"
P = [[0.8, 0.3], [0.2, 0.7]]

p00 = round(P[0][0] * P[0][0] + P[0][1] * P[1][0], 3)
p01 = round(P[0][0] * P[0][1] + P[0][1] * P[1][1], 3)
p10 = round(P[1][0] * P[0][0] + P[1][1] * P[1][0], 3)
p11 = round(P[1][0] * P[0][1] + P[1][1] * P[1][1], 3)
P2 = [[p00, p01], [p10, p11]]

state = [P2[0][0], P2[1][0]]
print(state)
print(round(state[0], 3))
print(round(state[1], 3))
```

输出 `[0.7, 0.3]`、`0.7`、`0.3`。

## 6. 练习

```exercise
# @title: 练习：计算两步传播
# @check: [0.7, 0.3]
# @check: 0.7
# @check: 0.3
# @hint: 先算 P²，再用 P² 的第一列乘从 A 出发的初始分布。
P = [[0.8, 0.3], [0.2, 0.7]]
state = [P[0][0], P[1][0]]
print([round(state[0], 3), round(state[1], 3)])
print(round(state[0], 3))
print(round(state[1], 3))
```

<details>
<summary>点开查看逐步解答</summary>

两步矩阵第一列：

```python
P = [[0.8, 0.3], [0.2, 0.7]]
p00 = round(P[0][0] * P[0][0] + P[0][1] * P[1][0], 3)
p10 = round(P[1][0] * P[0][0] + P[1][1] * P[1][0], 3)
state = [p00, p10]
print(state)
```

代入：

```text
p00=0.64+0.06=0.70
p10=0.16+0.14=0.30
```

所以输出 `[0.7, 0.3]`、`0.7`、`0.3`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为矩阵幂是每个元素各自乘方。矩阵幂要按矩阵乘法组合所有路径。

**误区二**：你以为概率一定会变大。概率只在 0 到 1 之间重新分配；矩阵的元素可能增长，概率向量不会超过 1。

**误区三**：你以为行和列归一可以混用。列随机对应“分布放右侧”，行随机对应“分布放左侧”；全文必须统一。

:::

## 8. 快问快答

```quiz
列随机矩阵 P 的每一列相加是多少？
- 每列都是 1 [*]
- 每行都是 1
- 整个矩阵所有元素相加是 1
? 第 j 列表示从状态 j 出发的完整概率分布，所以该列内部相加为 1。
```

## 9. 选读：为什么长期分布稳定

<details>
<summary>选读 · 平稳分布的直觉</summary>

若列向量 $\vec \pi$ 满足 $P\vec\pi=\vec\pi$，它就是特征值 1 的特征向量，也称为平稳分布。经过一步转移后分布不变。对许多非周期连通图，无论初始分布如何，$P^k\vec p_0$ 都会靠近 $\vec\pi$；这正是 PageRank 幂法的基础。

</details>

## 10. 下一站

第 21 章第二批已把线代从求解、拟合、映射推进到数值稳定和图传播。后续可继续扩展二次型应用与更一般的最小二乘数值方法。

→ [第 21 章 · 线性代数进阶](./index.md)
