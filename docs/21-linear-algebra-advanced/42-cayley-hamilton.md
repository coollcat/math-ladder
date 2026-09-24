---
title: Cayley-Hamilton 定理
lesson_id: linalg-advanced/cayley-hamilton
prereqs:
  - linalg-advanced/eigenvalues
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L7
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 4
introduces_concepts:
  - cayley-hamilton
  - minimal-polynomial
applications:
  - matrix-inverse
  - matrix-exponential
exits:
  - functional-calculus
---

# Cayley-Hamilton 定理

## 1. 从一个场景开始

你知道 $A^2 - 3A + 2I = 0$ 这样的矩阵方程吗？如果 $A$ 是 $2 \times 2$ 矩阵，它的特征多项式恰好是 $\lambda^2 - 3\lambda + 2$——把 $\lambda$ 换成 $A$，方程竟然成立！这不是巧合，而是 Cayley-Hamilton 定理：**每个方阵都满足自己的特征方程**。

## 2. 直觉解释

特征多项式 $p(\lambda) = \det(A - \lambda I)$ 告诉我们 $A$ 的特征值 $\lambda_1, \ldots, \lambda_n$。Cayley-Hamilton 说：如果你把这些特征值"代回"矩阵方程，得到的不是零而是——等一下，$p(A)$ 不是把数代进去，而是把整个矩阵 $A$ 代进去！

更直觉的理解：$A$ 的作用可以被 $I, A, A^2, \ldots, A^{n-1}$ 线性表示。$A^n$ 不是"新方向"——它是 $I, A, \ldots, A^{n-1}$ 的组合。这就像 $\mathbb{R}^n$ 中超过 $n$ 个向量必线性相关一样。

## 3. 正式定义

**Cayley-Hamilton 定理**：设 $A$ 是 $n \times n$ 矩阵，其特征多项式为

$$p(\lambda) = \det(A - \lambda I) = (-1)^n \lambda^n + c_{n-1}\lambda^{n-1} + \cdots + c_1 \lambda + c_0$$

则

$$p(A) = (-1)^n A^n + c_{n-1}A^{n-1} + \cdots + c_1 A + c_0 I = \mathbf{0}$$

**推论 1**（矩阵逆的多项式表示）：若 $A$ 可逆，则

$$A^{-1} = -\frac{1}{c_0}\left[(-1)^n A^{n-1} + c_{n-1}A^{n-2} + \cdots + c_1 I\right]$$

**推论 2**：$A^n$ 可以用 $I, A, \ldots, A^{n-1}$ 线性表示。

## 4. 分步例题

**例 1**：验证 $A = \begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix}$ 满足 Cayley-Hamilton 定理。

1. 特征多项式：$p(\lambda) = \det\begin{pmatrix} 2-\lambda & 1 \\ 0 & 3-\lambda \end{pmatrix} = (2-\lambda)(3-\lambda) = \lambda^2 - 5\lambda + 6$。

2. 代入矩阵：$p(A) = A^2 - 5A + 6I$。

3. 计算 $A^2 = \begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix}\begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix} = \begin{pmatrix} 4 & 5 \\ 0 & 9 \end{pmatrix}$。

4. $p(A) = \begin{pmatrix} 4 & 5 \\ 0 & 9 \end{pmatrix} - 5\begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix} + 6\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix} = \begin{pmatrix} 4-10+6 & 5-5+0 \\ 0-0+0 & 9-15+6 \end{pmatrix} = \begin{pmatrix} 0 & 0 \\ 0 & 0 \end{pmatrix}$。✓

**例 2**：用 Cayley-Hamilton 求 $A^{-1}$（$A$ 同上）。

1. $A^2 - 5A + 6I = 0 \Rightarrow 6I = 5A - A^2 = A(5I - A)$。
2. 两边左乘 $A^{-1}$：$6A^{-1} = 5I - A$。
3. $A^{-1} = \frac{1}{6}(5I - A) = \frac{1}{6}\begin{pmatrix} 3 & -1 \\ 0 & 2 \end{pmatrix}$。

验证：$AA^{-1} = \frac{1}{6}\begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix}\begin{pmatrix} 3 & -1 \\ 0 & 2 \end{pmatrix} = \frac{1}{6}\begin{pmatrix} 6 & 0 \\ 0 & 6 \end{pmatrix} = I$。✓

## 5. 动手实验

### 实验 1：数值验证 Cayley-Hamilton

```python title="对随机矩阵验证 p(A) = 0"
import numpy as np

def cayley_hamilton_check(A):
    """验证 Cayley-Hamilton 定理：p(A) 应为零矩阵"""
    n = A.shape[0]
    coeffs = np.poly(A)         # np.poly：返回特征多项式系数（最高次在前）
    # 构造 p(A) = c[0]A^n + c[1]A^{n-1} + ... + c[n]I
    result = np.zeros_like(A, dtype=float)
    power = np.eye(n)           # 从 A^0 = I 开始
    for i, c in enumerate(coeffs):
        result += c * power
        if i < len(coeffs) - 1:
            power = power @ A   # 累乘：A^0 → A^1 → ... → A^n
    return result

np.random.seed(42)
for size in [2, 3, 4]:
    A = np.random.randn(size, size)
    pA = cayley_hamilton_check(A)
    print(f"{size}×{size} 矩阵: ||p(A)|| = {np.linalg.norm(pA):.2e}")
```

误差在机器精度范围（$\sim 10^{-14}$），说明定理成立。

### 实验 2：用 Cayley-Hamilton 求逆

```python title="对比 Cayley-Hamilton 求逆与 numpy 求逆"
import numpy as np

A = np.array([[2, 1, 0], [0, 3, 1], [0, 0, 4]], dtype=float)
n = A.shape[0]

# 方法 1：numpy 直接求逆
A_inv_np = np.linalg.inv(A)

# 方法 2：Cayley-Hamilton
# p(λ) = (2-λ)(3-λ)(4-λ) = -λ^3 + 9λ^2 - 26λ + 24
# A^3 - 9A^2 + 26A - 24I = 0
# A^{-1} = (1/24)(A^2 - 9A + 26I)
A2 = A @ A
A_inv_ch = (A2 - 9*A + 26*np.eye(n)) / 24

print("numpy 求逆:")
print(A_inv_np)
print("Cayley-Hamilton 求逆:")
print(A_inv_ch)
print(f"差异: {np.max(np.abs(A_inv_np - A_inv_ch)):.2e}")
```

### 实验 3：$A^n$ 的快速计算

```python title="用 Cayley-Hamilton 避免矩阵连乘"
import numpy as np

A = np.array([[1, 1], [0, 2]], dtype=float)
# p(λ) = (1-λ)(2-λ) = λ^2 - 3λ + 2
# A^2 = 3A - 2I
# A^3 = 3A^2 - 2A = 3(3A - 2I) - 2A = 7A - 6I
# 一般地：A^n = α_n A + β_n I

def A_power_via_ch(A, n):
    """用递推关系计算 A^n"""
    if n == 0:
        return np.eye(2)
    if n == 1:
        return A
    # A^k = 3A^{k-1} - 2A^{k-2}
    prev2 = np.eye(2)           # A^0
    prev1 = A                   # A^1
    for k in range(2, n + 1):
        curr = 3 * prev1 - 2 * prev2
        prev2 = prev1
        prev1 = curr
    return curr

# 验证
n = 10
fast = A_power_via_ch(A, n)
direct = np.linalg.matrix_power(A, n)  # np.linalg.matrix_power：矩阵幂
print(f"A^{n} 误差: {np.max(np.abs(fast - direct)):.2e}")
```

## 6. 练习

```quiz
Cayley-Hamilton 定理说每个方阵满足什么？
- 自己的逆矩阵方程
- 自己的特征方程 [*]
- 自己的转置方程
? Cayley-Hamilton 定理：若 p(λ)=det(A-λI) 是特征多项式，则 p(A)=0。把 λ 换成 A，方程仍然成立。
```

```quiz
A = [[2,1],[0,3]] 的特征多项式是 λ²-5λ+6。用 Cayley-Hamilton 求 A⁻¹，结果是什么？
- (5I - A)/6 [*]
- (A - 5I)/6
- (A² - 5A)/6
? 由 A²-5A+6I=0 得 6I=5A-A²=A(5I-A)，所以 A⁻¹=(5I-A)/6。验证：A·(5I-A)/6 = I。
```

**练习 1**：对 $A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$，用 Cayley-Hamilton 定理求 $A^{-1}$。

```exercise
# @title: Cayley-Hamilton 求逆
# @check: A^{-1} = [[-2, 1], [1.5, -0.5]]
# @hint: p(λ) = λ^2 - 5λ - 2，所以 A^2 - 5A - 2I = 0
import numpy as np

A = np.array([[1, 2], [3, 4]], dtype=float)
# p(λ) = λ^2 - 5λ - 2，所以 A^2 = 5A + 2I
# A(5I + 2A^{-1})... 不对，直接用：A(A - 5I) = 2I
# A^{-1} = (A - 5I) / (-2)

A_inv = (A - 5 * np.eye(2)) / (-2)   # ← 验证这个公式对不对

print(f"A_inv = {A_inv}")
print(f"验证 A @ A_inv = {A @ A_inv}")
```

**练习 2**：$A = \begin{pmatrix} 0 & 1 \\ -2 & -3 \end{pmatrix}$，用 Cayley-Hamilton 计算 $A^5$。

<details>
<summary>点开查看解答</summary>

$p(\lambda) = \lambda^2 + 3\lambda + 2$，所以 $A^2 = -3A - 2I$。

递推：$A^3 = -3A^2 - 2A = -3(-3A - 2I) - 2A = 7A + 6I$。

$A^4 = 7A^2 + 6A = 7(-3A - 2I) + 6A = -15A - 14I$。

$A^5 = -15A^2 - 14A = -15(-3A - 2I) - 14A = 31A + 30I$。

$$A^5 = 31\begin{pmatrix} 0 & 1 \\ -2 & -3 \end{pmatrix} + 30\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix} = \begin{pmatrix} 30 & 31 \\ -62 & -63 \end{pmatrix}$$
</details>

## 7. 选读：Cayley-Hamilton 的证明思路

<details>
<summary>选读 · 伴随矩阵法</summary>

对可逆矩阵，利用 $\text{adj}(A)(A - \lambda I) = \det(A - \lambda I) \cdot I = p(\lambda) I$。

$\text{adj}(A - \lambda I)$ 的每个元素是 $\lambda$ 的多项式，写成 $B_0 + B_1 \lambda + \cdots + B_{n-1} \lambda^{n-1}$。

展开 $(B_0 + B_1\lambda + \cdots)(A - \lambda I) = p(\lambda)I$，比较 $\lambda$ 的各次幂系数，得到一系列矩阵方程。依次右乘 $A^k$ 并相加，所有项抵消，最终得到 $p(A) = 0$。

对于不可逆的情况，用连续性论证：可逆矩阵在所有矩阵中稠密，$p(A) = 0$ 对可逆矩阵成立，对极限也成立。

</details>

## 8. 下一站

Cayley-Hamilton 告诉我们 $A^n$ 可以降次。另一个基本的矩阵分解是正交化——把一组向量变成互相垂直的单位向量。

→ [Gram-Schmidt 正交化与 QR 分解](./55-gram-schmidt-qr.md)
