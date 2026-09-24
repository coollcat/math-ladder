---
title: LU 分解
lesson_id: linalg-advanced/lu-decomposition
prereqs:
  - linalg-advanced/rank-nullspace
introduces_math: []
introduces_builtin: []
introduces_import:
  - time
volume: 2
layer: L6
track:
  - scientific-computing
stage: university-core
difficulty: 4
introduces_concepts:
  - lu-decomposition
  - pivoting
applications:
  - linear-systems
  - determinant-computation
exits:
  - numerical-linear-algebra
---

# LU 分解

## 1. 从一个场景开始

解线性方程组 $A\mathbf{x} = \mathbf{b}$ 时，如果需要对同一个 $A$ 解很多次（$\mathbf{b}$ 不同），每次都从头做高斯消元太浪费。能不能"预处理"一次 $A$，然后每次都用便宜的方式回代？LU 分解就是这个预处理：把 $A$ 拆成下三角 $L$ 和上三角 $U$ 的乘积，之后解方程只需两次三角回代——快得多。

## 2. 直觉解释

高斯消元的本质是用一系列"行变换"把矩阵变成上三角。这些行变换本身也可以用矩阵表示——把它们乘起来，得到一个下三角矩阵 $L$。

所以 $A = L \cdot U$，其中：

- $U$：消元后的上三角矩阵
- $L$：记录了消元过程的下三角矩阵（对角线全是 1）

解 $A\mathbf{x} = \mathbf{b}$ 变成两步：

1. 解 $L\mathbf{y} = \mathbf{b}$（前代，从上往下）
2. 解 $U\mathbf{x} = \mathbf{y}$（回代，从下往上）

每步都是 $O(n^2)$，比从头消元的 $O(n^3)$ 快。

## 3. 正式定义

**LU 分解**：对 $n \times n$ 矩阵 $A$，若存在下三角矩阵 $L$（对角线全 1）和上三角矩阵 $U$ 使得 $A = LU$，则称此分解为 $A$ 的 LU 分解。

**PA = LU**（带行交换）：实际消元中可能需要交换行（主元为零时）。引入置换矩阵 $P$，使得 $PA = LU$。

**唯一性**：若 $A$ 可逆且不需要行交换，则 LU 分解唯一。

**计算复杂度**：

| 操作 | 复杂度 |
| --- | --- |
| LU 分解 | $\frac{2}{3}n^3$ 次浮点运算 |
| 前代（$L\mathbf{y} = \mathbf{b}$） | $n^2$ 次 |
| 回代（$U\mathbf{x} = \mathbf{y}$） | $n^2$ 次 |
| 用 LU 解方程组 | $n^2$ 次（分解已知时） |

## 4. 分步例题

**例**：对 $A = \begin{pmatrix} 2 & 1 & 1 \\ 4 & 3 & 3 \\ 8 & 7 & 9 \end{pmatrix}$ 做 LU 分解。

**第一步**：消去第一列（$R_2 \leftarrow R_2 - 2R_1$，$R_3 \leftarrow R_3 - 4R_1$）：

$$\begin{pmatrix} 2 & 1 & 1 \\ 0 & 1 & 1 \\ 0 & 3 & 5 \end{pmatrix}$$

乘子：$l_{21} = 2$，$l_{31} = 4$。

**第二步**：消去第二列（$R_3 \leftarrow R_3 - 3R_2$）：

$$U = \begin{pmatrix} 2 & 1 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 2 \end{pmatrix}$$

乘子：$l_{32} = 3$。

**第三步**：组装 $L$：

$$L = \begin{pmatrix} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 4 & 3 & 1 \end{pmatrix}$$

**验证**：$LU = \begin{pmatrix} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 4 & 3 & 1 \end{pmatrix} \begin{pmatrix} 2 & 1 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 2 \end{pmatrix} = \begin{pmatrix} 2 & 1 & 1 \\ 4 & 3 & 3 \\ 8 & 7 & 9 \end{pmatrix} = A$。✓

## 5. 动手实验

### 实验 1：手写 LU 分解

```python title="用高斯消元实现 LU 分解"
import numpy as np

def lu_decompose(A):
    """Doolittle 算法：L 对角线为 1 的 LU 分解"""
    n = len(A)
    L = np.eye(n)               # np.eye(n)：n×n 单位矩阵
    U = np.copy(A.astype(float))  # np.copy：复制矩阵，避免修改原矩阵

    for k in range(n - 1):     # 逐列消元
        for i in range(k + 1, n):
            if U[k, k] == 0:
                raise ValueError("主元为零，需要行交换")
            L[i, k] = U[i, k] / U[k, k]  # 乘子
            for j in range(k, n):
                U[i, j] -= L[i, k] * U[k, j]  # 行变换
    return L, U

A = np.array([[2, 1, 1], [4, 3, 3], [8, 7, 9]], dtype=float)
L, U = lu_decompose(A)

print("L =")
print(L)
print("U =")
print(U)
print("LU =")
print(L @ U)                    # @ 运算符：矩阵乘法
print("A =")
print(A)
print(f"误差: {np.max(np.abs(L @ U - A)):.2e}")  # np.max(np.abs(...))：最大绝对误差
```

### 实验 2：用 LU 解方程组

```python title="前代 + 回代解 Ax = b"
import numpy as np

def forward_sub(L, b):
    """前代：解 L y = b（L 下三角，对角线为 1）"""
    n = len(b)
    y = np.zeros(n)
    for i in range(n):
        y[i] = b[i] - np.dot(L[i, :i], y[:i])  # np.dot：向量内积
    return y

def back_sub(U, y):
    """回代：解 U x = y（U 上三角）"""
    n = len(y)
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):  # range 倒序：从 n-1 到 0
        x[i] = (y[i] - np.dot(U[i, i+1:], x[i+1:])) / U[i, i]
    return x

A = np.array([[2, 1, 1], [4, 3, 3], [8, 7, 9]], dtype=float)
L, U = lu_decompose(A)

# 解 Ax = b，b = [4, 10, 24]
b = np.array([4, 10, 24], dtype=float)
y = forward_sub(L, b)          # 先解 Ly = b
x = back_sub(U, y)             # 再解 Ux = y
print(f"解 x = {x}")
print(f"验证 Ax = {A @ x}")
```

### 实验 3：LU 分解 vs 直接求逆的效率对比

```python title="解 1000×1000 方程组：LU 分解 vs np.linalg.solve"
import numpy as np
import time  # time：测量代码运行耗时

n = 500
np.random.seed(42)
A = np.random.randn(n, n)      # 500×500 随机矩阵
b = np.random.randn(n)

# 方法 1：直接用 numpy 的 solve（内部就是 LU）
t0 = time.time()
x1 = np.linalg.solve(A, b)     # np.linalg.solve：高效解 Ax=b
t1 = time.time()
print(f"np.linalg.solve: {t1-t0:.4f} 秒")

# 方法 2：先求逆再乘（慢！）
t0 = time.time()
A_inv = np.linalg.inv(A)       # np.linalg.inv：求逆矩阵
x2 = A_inv @ b
t2 = time.time()
print(f"求逆再乘: {t2-t0:.4f} 秒")
print(f"误差: {np.max(np.abs(x1 - x2)):.2e}")
```

求逆再乘比直接 LU 慢约 3 倍——这就是为什么"不要显式求逆"是数值线性代数的第一条戒律。

## 6. 练习

```quiz
LU 分解中，L 矩阵的对角线元素是什么？
- 全是 0
- 全是 1 [*]
- 与 U 相同
? Doolittle 算法规定 L 的对角线全为 1，这保证了分解的唯一性。乘子放在对角线以下的位置。
```

```quiz
为什么实际中使用 PA=LU 而不是 A=LU？
- PA=LU 计算更快
- 当主元为零时需要行交换，P 记录交换顺序 [*]
- P 矩阵可以加速求逆
? 高斯消元中如果遇到零主元，需要交换行。置换矩阵 P 记录了所有行交换，保证分解对任意可逆矩阵都存在。
```

**练习 1**：对 $A = \begin{pmatrix} 1 & 2 \\ 3 & 7 \end{pmatrix}$ 手算 LU 分解，并验证。

```exercise
# @title: 2×2 LU 分解
# @check: L = [[1, 0], [3, 1]]
# @check: U = [[1, 2], [0, 1]]
# @hint: l_{21} = a_{21}/a_{11} = 3
import numpy as np

A = np.array([[1, 2], [3, 7]], dtype=float)
# 你的 LU 分解
L = np.array([[1, 0], [0, 1]], dtype=float)   # ← 填入正确值
U = np.array([[0, 0], [0, 0]], dtype=float)   # ← 填入正确值

print(f"L = {L.tolist()}")
print(f"U = {U.tolist()}")
print(f"LU = {(L @ U).tolist()}")
print(f"A = {A.tolist()}")
```

**练习 2**：为什么 $A = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$ 不能直接做 LU 分解（不做行交换）？

<details>
<summary>点开查看解答</summary>

第一步消元需要 $l_{21} = a_{21}/a_{11} = 1/0$——主元为零，除法未定义。这就是需要行交换（选主元）的原因。$PA = LU$ 中，$P$ 会先把第一行和第二行交换，使主元非零。

实际上 $P = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$ 本身，$PA = I$，$L = U = I$。
</details>

## 7. 选读：为什么 LU 分解的复杂度是 $\frac{2}{3}n^3$

<details>
<summary>选读 · 运算次数的精确计算</summary>

第 $k$ 步消元（$k = 0, 1, \ldots, n-2$）：对 $n-k-1$ 行做行变换，每行要更新 $n-k$ 个元素，每次更新需 1 次乘法 + 1 次减法。

$$\text{总运算量} = 2 \sum_{k=0}^{n-2} (n-k-1)(n-k) = 2 \sum_{m=1}^{n-1} m(m+1) = 2\sum_{m=1}^{n-1}(m^2 + m)$$

$$= 2\left[\frac{(n-1)n(2n-1)}{6} + \frac{(n-1)n}{2}\right] = \frac{2n^3}{3} + O(n^2)$$

所以主导项是 $\frac{2}{3}n^3$。这就是为什么 LU 分解比求行列式（$O(n!)$ 展开）快几个数量级。

</details>

## 8. 下一站

LU 分解是"消元的记录"。另一个惊人的事实是：每个方阵都满足自己的特征方程——这就是 Cayley-Hamilton 定理。

→ [Cayley-Hamilton 定理](./42-cayley-hamilton.md)
