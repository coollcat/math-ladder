---
title: 秩、零空间与维数
lesson_id: linalg-advanced/rank-nullspace
prereqs:
  - linalg-advanced/elimination
volume: 2
layer: L6
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - rank
  - nullspace
applications:
  - data-compression
  - equation-solving
exits:
  - engineering
  - data-ai
---

# 秩、零空间与维数

## 1. 从一个场景开始

一个矩阵有多少“真正独立的信息”？四个数未必是四份自由。若两列成比例，实际方向只剩一条；若两行重复，约束也只剩一条。秩就是把这些重复剥掉之后剩下的维数。

## 2. 直觉解释

把矩阵 $A$ 的列看成一组箭头：

- 两列能张成整张平面，秩是 2；
- 两列落在同一条直线上，秩是 1；
- 两列都是零向量，秩是 0。

零空间则回答反向问题：哪些输入会被 $A$ 压到原点？如果只有零向量，说明没有输入被白白压扁；如果有一条直线都被压到零，说明矩阵丢失了一个方向。

## 3. 正式定义

矩阵 $A$ 的**秩** $\operatorname{rank}(A)$ 是极大线性无关列组的列数，也等于行阶梯形中非零行的行数。

齐次方程组 $A\vec x=\vec 0$ 的全部解构成**零空间** $\operatorname{Null}(A)$。零空间的维数叫零化度：

$$\text{nullity}(A)=\text{未知数个数}-\operatorname{rank}(A).$$

对 $2\times2$ 矩阵，若 $\operatorname{rank}=1$，则零空间维数 $=2-1=1$，是一条过原点的直线。

## 4. 分步例题

设

$$A=\begin{pmatrix}1&2\\2&4\end{pmatrix}.$$

1. 第二行减去 2 倍第一行，得到 $\begin{pmatrix}1&2\\0&0\end{pmatrix}$；
2. 非零行只有一行，所以 $\operatorname{rank}(A)=1$；
3. 解 $A\vec x=0$：$x+2y=0$，所以 $x=-2y$；
4. 解集是 $\left\lbrace t\binom{-2}{1}:t\in\mathbb R\right\rbrace$，零空间维数是 1。

矩阵有 2 个未知数，秩占去 1 个独立约束，剩下 1 个自由度。

## 5. 动手实验

### 实验 1：拖出秩的变化

```viz
{
  "type": "span-space",
  "title": "列向量决定秩",
  "v1": [2, 1],
  "v2": [1, 2]
}
```

两个箭头离开共线位置的瞬间，张成从一条线变成整张平面，秩从 1 跳到 2。

### 实验 2：从消元读自由度

```viz
{
  "type": "elimination",
  "title": "齐次方程 A x = 0",
  "matrix": [1, 2, 2, 4],
  "rhs": [0, 0]
}
```

消元后第二行变成 $0=0$。非零行是秩；自由变量是零空间维数。这个特殊例子里的橙色直线恰好也是零空间；一般矩阵中，消元画的是方程线，零空间要单独解 $A\vec x=0$。

### 实验 3：Python 判秩与自由度

```python title="二阶矩阵：行列式判满秩"
def rank2(a, b, c, d):
    det = a * d - b * c
    if abs(det) < 0.000001:   # abs 是绝对值；浮点数不能只判 == 0
        if a == 0 and b == 0 and c == 0 and d == 0:
            return 0
        return 1
    return 2

print(rank2(1, 2, 2, 4))
print(rank2(1, 2, 3, 4))
print(rank2(0, 0, 0, 0))
```

输出 `1`、`2`、`0`。这里的固定阈值只是二阶教学近似，实际判断还要看矩阵的量纲和缩放；高维矩阵要用消元或更稳定的数值分解。

## 6. 练习

```exercise
# @title: 练习：读出秩和自由度
# @check: rank=1
# @check: nullity=1
# @hint: 先把第二行减去 2 倍第一行；非零行数是 rank，未知数个数减 rank 是 nullity。
A = [[1, 2], [2, 4]]
rank = 2
nullity = 2 - rank
print(f"rank={rank}")
print(f"nullity={nullity}")
```

<details>
<summary>点开查看逐步解答</summary>

第二行减去 2 倍第一行：

```text
[1  2]
[0  0]
```

非零行只有 1 行，所以：

```python
rank = 1
nullity = 2 - rank
```

第二行消失，说明原矩阵把一整条直线压到了原点。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为秩是非零元素的个数。秩数的是独立方向，不是数字多少。

**误区二**：你以为零空间只有零向量。只有满秩方阵的零空间才只有零向量；降秩矩阵会压扁一整块输入。

**误区三**：你以为行数一定等于秩。行可能重复；消元后剩下的非零行才代表独立约束。

:::

## 8. 快问快答

```quiz
三列向量都在同一条直线上，它们的秩是多少？
- 3
- 2
- 1 [*]
? 秩数独立方向。无论有多少列，只要都共线，就只有一个方向。
```

## 9. 选读：秩-零化度定理的维数账本

<details>
<summary>选读 · 输入维数去了哪里</summary>

对一个 $m\times n$ 矩阵，输入空间有 $n$ 维。变换后有两类去向：一部分输入方向被压进零空间，剩下的方向被搬运成列空间。两者的维数相加必须等于输入维数：

$$\operatorname{rank}(A)+\operatorname{nullity}(A)=n.$$

这就是秩-零化度定理。它像一本维数账本：没有凭空出现的自由度，也没有凭空消失的自由度。

</details>

## 10. 下一站

秩为 0 时平面被压成点，秩为 1 时被压成直线。这个“压扁程度”还能用一个数精确记录：有向面积缩放因子，也就是行列式。

→ [行列式的几何意义](./30-determinant-geometry.md)
