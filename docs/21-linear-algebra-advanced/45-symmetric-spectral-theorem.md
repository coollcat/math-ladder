---
title: 对称矩阵与谱定理：正交的特征方向
lesson_id: linalg-advanced/symmetric-spectral-theorem
prereqs:
  - linalg-advanced/eigenvalues
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
  - spectral-theorem
  - orthogonal-diagonalization
applications:
  - vibration-analysis
  - data-compression
exits:
  - engineering
  - data-ai
---

# 对称矩阵与谱定理：正交的特征方向

## 1. 从一个场景开始

上一课抓到的特征方向经常歪歪扭扭：例题里 $(1,1)$ 与 $(-1,2)$ 两条特征线互相斜着。可物理里琴弦的振动模态、数据里 PCA 的主轴，总是互相垂直的——这些场合背后的矩阵共享一个身份：**对称矩阵**（沿主对角线对折，左右两半重合）。本课证明垂直不是巧合：**对称矩阵的特征方向必然可以选成一组正交标架**。这条定理叫谱定理——SVD 的正交性担保书、正定判据的地基，也是量子测量课跨章承诺的那份"完满"。

## 2. 直觉解释

对称的几何气质：**变换不偏心**。对称矩阵拉伸平面时没有"拧"的成分——想象沿两根互相垂直的轴各自伸缩，动作天生不产生斜向拖拽。非对称矩阵混入剪切成分，特征方向才会歪。

代数上一句话看穿：设 $A\vec u = \lambda \vec u$、$A\vec v = \mu \vec v$，且 $\lambda \ne \mu$，则

$$\lambda\,(\vec u \cdot \vec v) = (A\vec u)\cdot \vec v = \vec u\cdot (A\vec v) = \mu\,(\vec u \cdot \vec v)$$

两端不同，只能是 $\vec u \cdot \vec v = 0$：**垂直是身份的自动结果**。中间那次"$A$ 从左边的点积搬家到右边"，只有对称矩阵做得到。

## 3. 正式定义

**对称矩阵**：$A^T = A$（即 $a_{ij} = a_{ji}$）。

**谱定理**（实对称情形）：实对称矩阵 $A$ 必有 $n$ 个互相正交的单位特征向量，拼成正交矩阵 $Q$（满足 $Q^TQ = I$），使

$$A = Q\Lambda Q^T, \qquad \Lambda = \begin{pmatrix}\lambda_1 & & \\ & \ddots & \\ & & \lambda_n\end{pmatrix}$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $A^T = A$ | 对称身份 | 沿主对角线对折重合 |
| $Q^TQ = I$ | 正交矩阵 | 列是正交单位向量：只旋转/反射、不拉伸 |
| $A = Q\Lambda Q^T$ | 正交对角化 | 换到特征正交轴后，动作退化为纯伸缩 |
| 谱 | 特征值全家 | 系统只能按这几个"频率"振动 |

搬家通行证的验算一行完成：

$$(A\vec u)\cdot\vec v = \sum_{i,j} a_{ij}u_jv_i = \sum_{i,j} a_{ji}u_jv_i = \vec u\cdot(A\vec v)$$

第二步正是 $a_{ij} = a_{ji}$——对称身份即通行证。

## 4. 分步例题

取 $A = \begin{pmatrix}2&1\\1&2\end{pmatrix}$（对称：$a_{12} = a_{21} = 1$）。

1. 特征方程：$\det(A-\lambda I) = (2-\lambda)^2 - 1 = 0$，得 $\lambda_1 = 3$、$\lambda_2 = 1$；
2. $\lambda = 3$：$(A-3I)\vec v = 0$ 给方向 $(1,1)$，单位化 $\vec q_1 = \frac{1}{\sqrt2}(1,1)$；
3. $\lambda = 1$：方向 $(1,-1)$，单位化 $\vec q_2 = \frac{1}{\sqrt2}(1,-1)$；
4. 正交验收：$\vec q_1\cdot\vec q_2 = \frac12(1 - 1) = 0$——两条特征轴恰好成 $90°$；
5. 正交对角化：$A = Q\Lambda Q^T$。几何读法：先转 $-45°$（$Q^T$）、沿正交轴各伸缩 $3$ 倍与 $1$ 倍、再转回 $+45°$（$Q$）——全程没有"拧"的成分。

## 5. 动手实验

### 实验 1：正交轴捕手

```viz
{
  "type": "eigen-direction",
  "title": "对称矩阵的两条特征轴",
  "matrix": [2, 1, 1, 2]
}
```

拖动蓝色向量找特征方向，按钮把向量吸附到最近的特征轴。把两条轴都找出来再验收：上一课的同款实验里两条特征轴是斜的，这一次**它们互相垂直**（斜率 $1$ 与 $-1$，夹角 $90°$）——谱定理在屏幕上立正站好。

### 实验 2：网格里看"纯伸缩"

```viz
{
  "type": "matrix",
  "title": "对称变换：正交轴上各自伸缩",
  "a": 2,
  "b": 1,
  "c": 1,
  "d": 2
}
```

两条虚线是特征轴：沿它们的方向只伸缩、不偏转；网格整体虽被拉歪，却没有任何"拧"的花样——对称变换就是"两根正交轴各自伸缩"的合成。

### 实验 3：数值验收正交与重建

```python title="正交验收 + Q·Λ·Q^T 重建 A"
import math

u = [1, 1]                       # λ = 3 的特征方向
v = [1, -1]                      # λ = 1 的特征方向
dot = u[0] * v[0] + u[1] * v[1]  # 点积验收：应为 0
print("u · v =", dot)

A = [[2, 1], [1, 2]]
s = math.sqrt(2)                 # math.sqrt：平方根（卷一根号课的老工具）
Q = [[1 / s, 1 / s], [1 / s, -1 / s]]   # 正交矩阵：两列为单位特征向量
L = [[3, 0], [0, 1]]             # 特征值对角阵 Λ

def matmul(X, Y):
    # 矩阵乘矩阵：AB 的 (i, j) 格 = X 的第 i 行与 Y 的第 j 列对应相乘再相加
    C = []
    for i in range(2):
        row = []
        for j in range(2):
            total = X[i][0] * Y[0][j] + X[i][1] * Y[1][j]
            row.append(round(total, 6))    # round：四舍五入，抹平浮点尘埃
        C.append(row)
    return C

def transpose(X):
    # 转置：行变列、列变行（沿主对角线对折）
    return [[X[0][0], X[1][0]], [X[0][1], X[1][1]]]

A_back = matmul(matmul(Q, L), transpose(Q))   # Q·Λ·Q^T：谱定理的重建公式
print(A_back)                    # 应还原出 [[2.0, 1.0], [1.0, 2.0]]
```

第一行打印 `u · v = 0`——正交承诺兑现；第二行打印 `[[2.0, 1.0], [1.0, 2.0]]`——$Q\Lambda Q^T$ 严丝合缝重建出 $A$。

## 6. 练习

```exercise
# @title: 练习：验收第二组正交特征方向
# @check: 0
# @hint: A = [[0,1],[1,0]] 的另一个特征值是 −1，对应方向满足 A·v = −v——试试 (1, −1)。当前代码里的 v 抄错了
A = [[0, 1], [1, 0]]
u = [1, 1]
v = [1, 2]        # ← 这不是特征方向：A·v = (2, 1) ≠ −v

dot = u[0] * v[0] + u[1] * v[1]
print(dot)
```

**练习 2**：SVD 课（下一课）声称 $U, V$ 的列是正交单位向量。用本课解释这份正交从哪来。

<details>
<summary>点开查看逐步解答</summary>

$A^TA$ 与 $AA^T$ 都是对称矩阵（$(A^TA)^T = A^TA$）。谱定理保证对称矩阵的特征向量可选成正交单位组——而 $A^TA$ 的特征向量正是右奇异向量、$AA^T$ 的特征向量正是左奇异向量。SVD 的正交性不是巧合，是谱定理的两次接力。
</details>

**练习 3**：对称矩阵的二次型 $f(\vec x) = \vec x^T A\, \vec x$，为什么它的等高线是"主轴沿特征方向"的椭圆？

<details>
<summary>点开查看逐步解答</summary>

换正交坐标 $\vec x = Q\vec y$：$f = \vec y^T \Lambda \vec y = \lambda_1 y_1^2 + \lambda_2 y_2^2$——交叉项消失，只剩纯平方和。$\lambda_i > 0$ 时这是标准椭圆方程，主轴正是特征方向 $\vec q_i$。非对称矩阵的交叉项让椭圆歪着长——70 课正定判据（特征值全正 ⇔ 碗形）就建立在本课的这条化简上。
</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**：你以为所有矩阵的特征方向都该垂直。上一课的 $\begin{pmatrix}4&1\\2&3\end{pmatrix}$ 特征方向 $(1,1)$ 与 $(-1,2)$ 点积为 $1$，并不垂直——正交是**对称家族**的特权。

**误区二**：你以为对称只是"长得整齐"。对称身份换来三样硬货：特征值必为实数、特征方向可选成正交组、永不亏损（重根也有足量方向）——第 22 章相图课的"亏损重根"惨案在对称家族里不会发生。

**误区三**：你以为正交对角化只是普通对角化换个名字。普通 $P$ 只要求可逆；$Q$ 还要求正交——变换只旋转不拉伸，长度与角度全部保真。能量类问题（振动、正定、量子）非它不可。

::::

## 8. 快问快答

```quiz
对称矩阵两个不同特征值对应的特征向量，夹角是多少？
- 0°
- 90° [*]
- 45°
? 点积搬家一步逼出 u·v = 0：λ(u·v) = μ(u·v) 且 λ ≠ μ，只能垂直。不同特征值的特征方向自动互成直角。
```

## 9. 选读：谱定理的 2×2 证明骨架

<details>
<summary>选读 · 为什么对称必正交</summary>

**情形一（两个不同特征值）**：第 2 节的点积搬家一步完成——$\lambda \ne \mu$ 逼出 $\vec u \cdot \vec v = 0$。

**情形二（重根）**：$2\times2$ 对称 $A = \begin{pmatrix}a&b\\b&d\end{pmatrix}$ 只有一个特征值时，判别式 $(a-d)^2 + 4b^2 = 0$。平方和为零只能两项全零：$a = d$ 且 $b = 0$，即 $A = \lambda I$——整个平面都是特征空间，任取一组正交基都是特征向量。

**一般 n 维**：归纳法——找一个特征方向 $\vec q_1$，对称性保证 $A$ 把与 $\vec q_1$ 垂直的子空间映回自身（又是搬家通行证），在子空间里继续递归。顺带清账：量子测量课曾承诺"这套语言在谱定理处达到完满"——兑现于本课：测量基的正交性由谱定理担保。

</details>

## 10. 下一站

对称家族有了正交骨架。那一般矩阵——甚至长方形矩阵——怎么办？下一课的 SVD 把谱定理用了两次：$A^TA$ 与 $AA^T$ 都对称，两次正交对角化的接力拆出 $U$、$\Sigma$、$V$。

→ [SVD 与低秩近似](./50-svd-low-rank.md)
