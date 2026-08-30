---
title: Jordan 标准形：不可对角化时的第二套坐标
lesson_id: linalg-advanced/jordan-form
prereqs:
  - linalg-advanced/diagonalization
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
  - defective-matrix
  - generalized-eigenvector
  - jordan-block
  - jordan-form
applications:
  - differential-equations
  - matrix-powers
exits:
  - engineering
  - research
---

# Jordan 标准形：不可对角化时的第二套坐标

## 1. 从一个场景开始

上一课的误区一留了一笔悬案：重复特征值可能只对应一个独立特征方向，特征向量拼不满基，对角化当场宣告失败。可矩阵的动作并没有消失——它还在那里，只是不肯说"纯伸缩"的方言。本课给它配第二套坐标：伸缩之外，允许**恰好一次推搡**。这套坐标叫 Jordan 标准形，是第 22 章相图课"亏损重根"现象背后缺席已久的代数底牌。

## 2. 直觉解释

先看最小的案发现场——剪切矩阵

$$A=\begin{pmatrix}1&1\\0&1\end{pmatrix}.$$

特征方程：$\det(A-\lambda I)=(1-\lambda)^2=0$，特征值只有 $\lambda=1$ 一个（二重根）。找特征方向：$(A-I)\vec v=\begin{pmatrix}0&1\\0&0\end{pmatrix}\vec v=\vec 0$，通解要求第二分量为零——只剩

$$\vec v=\binom10$$

一条不变方向。横轴上所有向量都纹丝不动；竖直单位向量 $(0,1)$ 被推成 $(1,1)$——**只挪位置，不转向远离**：

$$A\binom01=\binom11=1\cdot\binom01+\binom10,$$

输出恰好落回特征方向自己身上，多出来的那份就是"推搡"。整个平面的动作读成一句话：**所有方向都在伸缩 1 倍，但"竖直一层"被水平推了一格**——伸缩加一次推搡，这就是 Jordan 块的全部剧情。

## 3. 正式定义

**Jordan 块**是形如

$$J_2(\lambda)=\begin{pmatrix}\lambda&1\\0&\lambda\end{pmatrix}$$

的矩阵：对角线上是特征值 $\lambda$，右上角多一个 $1$。

**Jordan 标准形**：若存在可逆矩阵 $P$ 使

$$A=PJP^{-1},$$

其中 $J$ 由若干 Jordan 块沿对角线拼成，则称 $J$ 是 $A$ 的 Jordan 标准形。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\det(A-\lambda I)=0$ 中根的重复次数 | 代数重数 | 这个特征值被"许诺"了几个方向 |
| 独立特征方向的个数 | 几何重数 | 实际到货的方向个数 |
| 几何重数 $<$ 代数重数 | 亏损矩阵 | 方向不够分，对角化失败 |
| 满足 $(A-\lambda I)\vec w=\vec v$ 的 $\vec w$ | 广义特征向量 | 链条第二环：被推向特征方向的向量 |
| $\begin{pmatrix}\lambda&1\\0&\lambda\end{pmatrix}$ | Jordan 块 | 一条"伸缩 + 推搡"流水线 |

$P$ 的列按链条排：先特征向量 $\vec v$，再广义特征向量 $\vec w$。链条方程 $(A-\lambda I)\vec w=\vec v$ 干的事，就是把"缺的方向"补成"被推着走的方向"。

## 4. 分步例题

取

$$A=\begin{pmatrix}3&1\\-1&1\end{pmatrix}.$$

1. 迹 $=4$、行列式 $=4$，特征方程 $\lambda^2-4\lambda+4=(\lambda-2)^2=0$：$\lambda=2$ 二重；
2. 解 $(A-2I)\vec v=\vec 0$：$\begin{pmatrix}1&1\\-1&-1\end{pmatrix}$ 的两行同为 $v_1+v_2=0$，特征方向只有 $\vec v=(1,-1)$ 一条——几何重数 $1<2$，亏损；
3. 补链条：解 $(A-2I)\vec w=\vec v$，即 $w_1+w_2=1$，取 $\vec w=(0,1)$。验收：$A\vec w=(1,1)=\vec v+2\vec w$——被推向特征方向 ✓；
4. $P=\begin{pmatrix}1&0\\-1&1\end{pmatrix}$（列 1 是 $\vec v$、列 2 是 $\vec w$），行列式为 $1$，逆为 $P^{-1}=\begin{pmatrix}1&0\\1&1\end{pmatrix}$；
5. $J=P^{-1}AP=\begin{pmatrix}2&1\\0&2\end{pmatrix}$：特征值 $2$ 坐对角线，推搡 $1$ 坐右上角——第二套坐标到手。

## 5. 动手实验

### 实验 1：亏损矩阵的方向捕手

```viz
{
  "type": "eigen-direction",
  "title": "剪切矩阵：拖遍全平面只有一条残差为零的方向",
  "matrix": [1, 1, 0, 1]
}
```

拖动蓝色向量找特征方向。只有横轴方向 $(1,0)$ 能把偏转残差压到 $0$；其他方向怎么拖都歪。对照上一课的对角化实验：那边两个方向都能吸附，这边只剩一条。

### 实验 2：重根的另一件外衣

```viz
{
  "type": "eigen-direction",
  "title": "A=[[3,1],[-1,1]]：同样只有一条不变方向",
  "matrix": [3, 1, -1, 1]
}
```

特征值 $2$ 二重，唯一不变方向是 $(1,-1)$。亏不亏损不看矩阵长相，只看方向够不够。

### 实验 3：验收第二套坐标

```python title="验证 A = P·J·P⁻¹"
A = [[3, 1], [-1, 1]]
P = [[1, 0], [-1, 1]]      # 列 1 = 特征向量 v，列 2 = 链向量 w
P_inv = [[1, 0], [1, 1]]   # 2×2 逆 = 伴随除以行列式；这里行列式恰好是 1
J = [[2, 1], [0, 2]]       # λ = 2 的 Jordan 块

def matmul(X, Y):
    # 2×2 矩阵乘法：(i, j) 格 = X 第 i 行与 Y 第 j 列对应相乘再相加
    C = []
    for i in range(2):
        row = []
        for j in range(2):
            s = X[i][0] * Y[0][j] + X[i][1] * Y[1][j]
            row.append(round(s, 6))   # round：四舍五入，抹平浮点尘埃
        C.append(row)
    return C

rebuild = matmul(matmul(P, J), P_inv)   # P·J·P⁻¹ 应当还原 A
print(rebuild)
print(A)
```

两行都输出 `[[3, 1], [-1, 1]]`——第二套坐标与原矩阵严丝合缝。

### 实验 4：Jordan 块的幂

```python title="用 Jordan 块算 A^k"
A = [[1, 1], [0, 1]]   # 它自己就是一个 λ=1 的 Jordan 块

def matmul(X, Y):
    C = []
    for i in range(2):
        row = []
        for j in range(2):
            s = X[i][0] * Y[0][j] + X[i][1] * Y[1][j]
            row.append(round(s, 6))
        C.append(row)
    return C

k = 7
Ak = [[1, 0], [0, 1]]          # 单位矩阵：连乘的出发点
for _ in range(k):             # _ 是占位名：循环体里用不到计数器本身
    Ak = matmul(Ak, A)         # 每轮左乘一次 A
print(Ak)
print([[1, k], [0, 1]])        # 公式预言：A^k = [[1, k], [0, 1]]
```

两行都输出 `[[1, 7], [0, 1]]`。对角矩阵的幂只乘对角元；Jordan 块的幂多漏一项——右上角从 $1$ 涨到 $k$，推搡的账目一次一次往下记。

## 6. 练习

```exercise
# @title: 练习：让 Jordan 块的幂兑现公式
# @check: [[1.0, 9.0], [0.0, 1.0]]
# @check: [[1, 9], [0, 1]]
# @hint: 连乘的出发点是单位矩阵 I——从 A 自己出发会把幂多乘一次；k=9 时右上角正是 9。
A = [[1, 1], [0, 1]]

def matmul(M, N):
    out = [[0.0, 0.0], [0.0, 0.0]]
    for i in range(2):
        for j in range(2):
            s = 0.0
            for t in range(2):
                s = s + M[i][t] * N[t][j]   # (i, j) 格 = M 第 i 行与 N 第 j 列对应相乘再相加
            out[i][j] = s
    return out

k = 9
Ak = [[1.0, 1.0], [0.0, 1.0]]   # ← 连乘的出发矩阵选错了
for _ in range(k):
    Ak = matmul(Ak, A)
print(Ak)
print([[1, k], [0, 1]])
```

<details>
<summary>点开查看逐步解答</summary>

出发点应是单位矩阵——$I\cdot A^k=A^k$；从 $A$ 出发就变成 $A^{k+1}$，右上角会多记一笔。

```python
k = 9
Ak = [[1.0, 0.0], [0.0, 1.0]]
for _ in range(k):
    Ak = matmul(Ak, A)
print(Ak)
print([[1, k], [0, 1]])
```

输出：

```text
[[1.0, 9.0], [0.0, 1.0]]
[[1, 9], [0, 1]]
```

上三角那个 $9$ 正是推搡次数的账目（归纳证明在选读）。

</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**：你以为特征值凑齐就能对角化。代数重数是 2 不代表方向有 2 个——差额要用广义特征向量补链，补不上的就是亏损。

**误区二**：你以为 Jordan 块的幂和对角块一样只乘对角元。右上角的 1 每乘一次就往账上漏一个 $k$：$J^k$ 的右上角是 $k\lambda^{k-1}$，不是 $\lambda^k$。

**误区三**：你以为 Jordan 标准形每个数都唯一。块的**排列顺序**可以互换；唯一的是"每个特征值配几个多大的块"——那才是矩阵的指纹。

::::

## 8. 快问快答

```quiz
A=[[3,1],[-1,1]]（λ=2 二重、只有一条特征方向）的 Jordan 标准形是？
- [[2, 0], [0, 2]]
- [[2, 1], [0, 2]] [*]
- [[3, 1], [-1, 1]]
? 链向量补上缺口后，块里长出上三角的 1；纯对角 [[2,0],[0,2]] 只有方向凑满两条时才可能出现。
```

## 9. 选读：Jordan 块的幂为什么长这样

<details>
<summary>选读 · 归纳验证 A^k = [[1,k],[0,1]]</summary>

记 $A=\begin{pmatrix}1&1\\0&1\end{pmatrix}$，对 $k$ 归纳。

**基础步**：$k=1$ 时 $A^1=\begin{pmatrix}1&1\\0&1\end{pmatrix}$，公式成立。

**归纳步**：假设 $A^k=\begin{pmatrix}1&k\\0&1\end{pmatrix}$，则

$$A^{k+1}=A^k A=\begin{pmatrix}1&k\\0&1\end{pmatrix}\begin{pmatrix}1&1\\0&1\end{pmatrix}=\begin{pmatrix}1&1+k\\0&1\end{pmatrix},$$

正是把公式里的 $k$ 换成 $k+1$。按归纳原理，对一切 $k\ge1$ 成立。

**一般公式**：把 Jordan 块写成 $J=\lambda I+N$，其中 $N=\begin{pmatrix}0&1\\0&0\end{pmatrix}$ 满足 $N^2=0$（推一次就到头）。二项式展开在 $N^2$ 处截断：

$$(\lambda I+N)^k=\lambda^k I+k\lambda^{k-1}N,$$

所以 $J^k=\begin{pmatrix}\lambda^k&k\lambda^{k-1}\\0&\lambda^k\end{pmatrix}$。代回 $\lambda=1$ 得 $A^k=\begin{pmatrix}1&k\\0&1\end{pmatrix}$——实验 4 的每一步都有这条公式兜底。

</details>

## 10. 下一站

Jordan 块把"重根 + 剪切"拆成伸缩加一次推搡，幂也变得顺手。但恰恰是这种重根结构，在数值世界里是误差放大器的温床——输入的小偏差会被放大多少倍？下一课用奇异值给"病态程度"定级。

→ [条件数与数值稳定性](./110-condition-number.md)
