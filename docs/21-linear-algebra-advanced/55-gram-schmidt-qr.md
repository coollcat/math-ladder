---
title: Gram-Schmidt 正交化与 QR 分解
lesson_id: linalg-advanced/gram-schmidt-qr
prereqs:
  - linalg-advanced/svd-low-rank
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
  - gram-schmidt
  - qr-decomposition
  - orthonormal-basis
applications:
  - least-squares
  - eigenvalue-algorithms
exits:
  - numerical-linear-algebra
---

# Gram-Schmidt 正交化与 QR 分解

## 1. 从一个场景开始

你有一组线性无关的向量，想把它们变成互相垂直的单位向量——就像把歪歪扭扭的坐标轴掰正。为什么？因为正交坐标系里计算投影、距离、最小二乘都变得极其简单。Gram-Schmidt 正交化就是这个"掰正"的过程，而 QR 分解是它的矩阵形式。

## 2. 直觉解释

想象你在三维空间里有三根不垂直的棍子。Gram-Schmidt 的做法：

1. 第一根棍子不动，只归一化（变成单位向量）。
2. 第二根棍子：减去它在第一根方向上的分量，剩下的部分就与第一根垂直了。归一化。
3. 第三根棍子：减去它在前两根方向上的分量，剩下的就与前两根都垂直。归一化。

每一步都是"减去投影"——把不垂直的分量去掉，只留下垂直的新方向。

## 3. 正式定义

**Gram-Schmidt 正交化**：给定线性无关向量 $\mathbf{a}_1, \ldots, \mathbf{a}_n$，构造正交向量 $\mathbf{u}_1, \ldots, \mathbf{u}_n$：

$$\mathbf{u}_1 = \mathbf{a}_1$$

$$\mathbf{u}_k = \mathbf{a}_k - \sum_{j=1}^{k-1} \frac{\langle \mathbf{a}_k, \mathbf{u}_j \rangle}{\langle \mathbf{u}_j, \mathbf{u}_j \rangle} \mathbf{u}_j, \quad k = 2, \ldots, n$$

归一化：$\mathbf{e}_k = \mathbf{u}_k / \|\mathbf{u}_k\|$。

**QR 分解**：对 $m \times n$ 矩阵 $A$（$m \geq n$，列满秩），

$$A = QR$$

其中 $Q$ 是 $m \times n$ 列正交矩阵（$Q^TQ = I$），$R$ 是 $n \times n$ 上三角矩阵。

$R$ 的元素：$r_{jk} = \langle \mathbf{a}_k, \mathbf{e}_j \rangle$（$j \leq k$），$r_{kk} = \|\mathbf{u}_k\|$。

## 4. 分步例题

**例**：对 $\mathbf{a}_1 = (1, 1, 0)^T$，$\mathbf{a}_2 = (1, 0, 1)^T$，$\mathbf{a}_3 = (0, 1, 1)^T$ 做 Gram-Schmidt。

**第一步**：$\mathbf{u}_1 = (1, 1, 0)^T$，$\|\mathbf{u}_1\| = \sqrt{2}$，$\mathbf{e}_1 = \frac{1}{\sqrt{2}}(1, 1, 0)^T$。

**第二步**：
- 投影系数：$\frac{\langle \mathbf{a}_2, \mathbf{u}_1 \rangle}{\langle \mathbf{u}_1, \mathbf{u}_1 \rangle} = \frac{1 \cdot 1 + 0 \cdot 1 + 1 \cdot 0}{2} = \frac{1}{2}$
- $\mathbf{u}_2 = (1, 0, 1)^T - \frac{1}{2}(1, 1, 0)^T = (\frac{1}{2}, -\frac{1}{2}, 1)^T$
- $\|\mathbf{u}_2\| = \sqrt{\frac{1}{4} + \frac{1}{4} + 1} = \sqrt{\frac{3}{2}}$
- $\mathbf{e}_2 = \frac{1}{\sqrt{3/2}}(\frac{1}{2}, -\frac{1}{2}, 1)^T$

**第三步**：
- $\frac{\langle \mathbf{a}_3, \mathbf{u}_1 \rangle}{\langle \mathbf{u}_1, \mathbf{u}_1 \rangle} = \frac{1}{2}$，$\frac{\langle \mathbf{a}_3, \mathbf{u}_2 \rangle}{\langle \mathbf{u}_2, \mathbf{u}_2 \rangle} = \frac{1/2}{3/2} = \frac{1}{3}$
- $\mathbf{u}_3 = (0,1,1)^T - \frac{1}{2}(1,1,0)^T - \frac{1}{3}(\frac{1}{2},-\frac{1}{2},1)^T = (-\frac{2}{3}, \frac{2}{3}, \frac{2}{3})^T$
- $\mathbf{e}_3 = \frac{1}{\sqrt{3}}(-1, 1, 1)^T$

## 5. 动手实验

### 实验 1：手写 Gram-Schmidt

```python title="经典 Gram-Schmidt 正交化"
import numpy as np

def gram_schmidt(V):
    """经典 Gram-Schmidt：V 是列向量矩阵，返回正交归一化的 Q"""
    n = V.shape[1]
    Q = np.zeros_like(V, dtype=float)
    for k in range(n):
        u = V[:, k].copy()       # 取第 k 列
        for j in range(k):
            proj = np.dot(Q[:, j], u)  # 投影系数
            u = u - proj * Q[:, j]     # 减去在已有方向上的投影
        Q[:, k] = u / np.linalg.norm(u)  # 归一化
    return Q

A = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1]], dtype=float)
Q = gram_schmidt(A)
print("Q =")
print(Q)
print(f"Q^T Q =\n{Q.T @ Q}")   # 应接近单位矩阵
print(f"正交性误差: {np.max(np.abs(Q.T @ Q - np.eye(3))):.2e}")
```

### 实验 2：QR 分解

```python title="QR 分解：A = QR"
import numpy as np

def qr_decompose(A):
    """QR 分解：返回 Q 和 R"""
    m, n = A.shape
    Q = np.zeros((m, n))
    R = np.zeros((n, n))
    for k in range(n):
        u = A[:, k].copy()
        for j in range(k):
            R[j, k] = np.dot(Q[:, j], u)
            u = u - R[j, k] * Q[:, j]
        R[k, k] = np.linalg.norm(u)
        Q[:, k] = u / R[k, k]
    return Q, R

A = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1]], dtype=float)
Q, R = qr_decompose(A)
print("Q ="); print(np.round(Q, 4))
print("R ="); print(np.round(R, 4))
print(f"QR 误差: {np.max(np.abs(Q @ R - A)):.2e}")
```

### 实验 3：数值稳定性——经典 vs 修正 Gram-Schmidt

```python title="经典 Gram-Schmidt vs 修正 Gram-Schmidt 的数值稳定性"
import numpy as np

def cgs(V):
    """经典 Gram-Schmidt"""
    n = V.shape[1]
    Q = np.zeros_like(V, dtype=float)
    for k in range(n):
        u = V[:, k].copy()
        for j in range(k):
            u -= np.dot(Q[:, j], u) * Q[:, j]
        Q[:, k] = u / np.linalg.norm(u)
    return Q

def mgs(V):
    """修正 Gram-Schmidt（数值更稳定）"""
    n = V.shape[1]
    V = V.copy().astype(float)
    Q = np.zeros_like(V)
    for k in range(n):
        Q[:, k] = V[:, k] / np.linalg.norm(V[:, k])
        for j in range(k + 1, n):
            V[:, j] -= np.dot(Q[:, k], V[:, j]) * Q[:, k]
    return Q

# Hilbert 矩阵：臭名昭著的病态矩阵
n = 8
H = np.array([[1/(i+j+1) for j in range(n)] for i in range(n)])

Q_cgs = cgs(H)
Q_mgs = mgs(H)
print(f"经典 GS 正交性误差: {np.max(np.abs(Q_cgs.T @ Q_cgs - np.eye(n))):.2e}")
print(f"修正 GS 正交性误差: {np.max(np.abs(Q_mgs.T @ Q_mgs - np.eye(n))):.2e}")
```

修正 Gram-Schmidt 的正交性误差通常比经典版小好几个数量级。

### 实验 4：正交化过程向量图

```viz
{
  "type": "plot",
  "title": "Gram-Schmidt 正交化示意",
  "expr": "a*sin(x)",
  "xmin": -1,
  "xmax": 5,
  "ymin": -2,
  "ymax": 2,
  "sliders": [
    {"name": "a", "min": 0.2, "max": 3, "step": 0.1, "value": 1}
  ]
}
```

图中展示原始向量（蓝色箭头）逐步投影、减去分量、得到正交向量（红色箭头）的过程。拖动滑块 a 改变原始向量的夹角，观察正交化如何调整方向。

## 6. 练习

```quiz
Gram-Schmidt 正交化中，第 k 步做了什么操作？
- 把第 k 个向量归一化
- 从第 k 个向量中减去它在前 k-1 个正交方向上的投影，再归一化 [*]
- 把前 k 个向量全部重新正交化
? 第 k 步：u_k = a_k - Σ(proj of a_k onto u_j for j<k)，然后 e_k = u_k/||u_k||。每步只减去已有正交方向上的投影。
```

```quiz
QR 分解中 R 为什么是上三角矩阵？
- 因为 Gram-Schmidt 按顺序处理，后面的正交基还没构造出来 [*]
- 因为矩阵必须是对称的
- 因为 R 的对角线必须是 1
? a_k 在 e_j（j>k）方向上的投影系数为 0，因为 e_j 还没被构造。所以 R 的下三角部分为 0，是上三角。
```

**练习 1**：对 $\mathbf{a}_1 = (1, 0, 1)^T$，$\mathbf{a}_2 = (1, 1, 0)^T$ 手算 Gram-Schmidt，得到 $\mathbf{e}_1, \mathbf{e}_2$。

```exercise
# @title: Gram-Schmidt 练习
# @check: e1 = [0.7071, 0, 0.7071]
# @check: e2 = [0.4082, 0.8165, -0.4082]
# @hint: u1 = a1, u2 = a2 - (a2·u1/||u1||²) u1
import numpy as np

a1 = np.array([1, 0, 1], dtype=float)
a2 = np.array([1, 1, 0], dtype=float)

u1 = a1
e1 = u1 / np.linalg.norm(u1)

proj = np.dot(a2, u1) / np.dot(u1, u1)  # ← 计算投影系数
u2 = a2 - proj * u1                      # ← 减去投影
e2 = u2 / np.linalg.norm(u2)             # ← 归一化

print(f"e1 = {np.round(e1, 4)}")
print(f"e2 = {np.round(e2, 4)}")
print(f"e1·e2 = {np.dot(e1, e2):.2e}")   # 应接近 0
```

**练习 2**：为什么 QR 分解中 $R$ 是上三角矩阵？

<details>
<summary>点开查看解答</summary>

因为 Gram-Schmidt 是**按顺序**处理的：$\mathbf{e}_k$ 只依赖 $\mathbf{a}_1, \ldots, \mathbf{a}_k$。所以 $\mathbf{a}_k$ 在 $\mathbf{e}_j$（$j > k$）方向上的投影系数为 0——$\mathbf{e}_j$ 还没被构造出来。

这意味着 $R$ 的第 $k$ 列中，$r_{jk} = \langle \mathbf{a}_k, \mathbf{e}_j \rangle$，当 $j > k$ 时 $r_{jk} = 0$，所以 $R$ 是上三角。

几何意义：每个新向量只在已有的正交方向上有分量，不会在未来的方向上有分量。
</details>

## 7. 选读：Modified Gram-Schmidt 为何更稳定

<details>
<summary>选读 · 数值稳定性的根源</summary>

经典 Gram-Schmidt 在计算 $\mathbf{u}_k$ 时，用的是**原始** $\mathbf{e}_1, \ldots, \mathbf{e}_{k-1}$。由于浮点误差，这些 $\mathbf{e}_j$ 不完全正交，导致 $\mathbf{u}_k$ 残留的"垂直分量"不纯。

修正 Gram-Schmidt 的关键区别：在构造 $\mathbf{e}_k$ 后，立刻用它去**更新**所有后续向量 $\mathbf{a}_{k+1}, \ldots, \mathbf{a}_n$。这样每个后续向量在进入下一步之前，已经去除了 $\mathbf{e}_k$ 方向上的分量。

数学上两者等价（精确算术下结果相同），但浮点算术下，修正版的正交性误差从 $O(\kappa \varepsilon)$ 降到 $O(\kappa^2 \varepsilon^2)$（$\kappa$ 是条件数，$\varepsilon$ 是机器精度）。对于病态矩阵，这个差距是天壤之别。

实际工程中，Householder 变换（另一种 QR 分解方法）比两种 Gram-Schmidt 都更稳定——它直接用反射变换逐步消元，不需要显式计算投影。

</details>

## 8. 下一站

矩阵分解之后，我们转向微分方程——Laplace 变换把微分方程变成代数方程，是工程中最强大的求解工具之一。

→ [Laplace 变换求解 ODE](../22-ode-dynamics/25-laplace-transform.md)
