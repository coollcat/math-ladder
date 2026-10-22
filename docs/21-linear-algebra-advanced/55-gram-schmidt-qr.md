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
import numpy as np     # 数值库；as np 是社区约定俗成的别名

def gram_schmidt(V):
    """经典 Gram-Schmidt：V 是列向量矩阵，返回正交归一化的 Q"""
    n = V.shape[1]                 # .shape 是 (行数, 列数) 的元组，[1] 取出列数
    Q = np.zeros_like(V, dtype=float)   # 造一个和 V 同形状的全零矩阵装结果；dtype=float 免得整数除法丢精度
    for k in range(n):                 # 逐个处理第 k 列
        u = V[:, k].copy()       # 取第 k 列：逗号前的冒号表示"所有行"，copy() 避免改动原矩阵
        for j in range(k):             # 只和"已经掰正"的前 k 个方向打交道
            proj = np.dot(Q[:, j], u)  # 投影系数：两个向量的点积（这里 Q 的列已是单位向量）
            u = u - proj * Q[:, j]     # 减去在已有方向上的投影，剩下的就与之垂直
        Q[:, k] = u / np.linalg.norm(u)  # 归一化：除以自身长度，把整列缩成单位向量
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
import numpy as np   # 数值库

def qr_decompose(A):
    """QR 分解：返回 Q 和 R"""
    m, n = A.shape        # 元组解包：一次拿到行数 m 和列数 n
    Q = np.zeros((m, n))  # 注意参数是"一个元组" (行, 列)，和 zeros_like 的用法不同
    R = np.zeros((n, n))
    for k in range(n):
        u = A[:, k].copy()        # 原始第 k 列（保留不动，边减边算）
        for j in range(k):
            R[j, k] = np.dot(Q[:, j], u)   # 投影系数恰好就是 R 的第 (j,k) 项
            u = u - R[j, k] * Q[:, j]      # 减去该方向上的分量
        R[k, k] = np.linalg.norm(u)   # 对角线元素 = 剩余向量的长度
        Q[:, k] = u / R[k, k]         # 再归一化就得到正交基的第 k 列
    return Q, R                       # 一次交回两个矩阵

A = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1]], dtype=float)
Q, R = qr_decompose(A)
print("Q ="); print(np.round(Q, 4))
print("R ="); print(np.round(R, 4))
print(f"QR 误差: {np.max(np.abs(Q @ R - A)):.2e}")
```

### 实验 3：数值稳定性——经典 vs 修正 Gram-Schmidt

```python title="经典 Gram-Schmidt vs 修正 Gram-Schmidt 的数值稳定性"
import numpy as np   # 数值库

def cgs(V):
    """经典 Gram-Schmidt"""
    n = V.shape[1]                  # 列数
    Q = np.zeros_like(V, dtype=float)   # 同形状零矩阵
    for k in range(n):
        u = V[:, k].copy()          # 取第 k 列
        for j in range(k):
            u -= np.dot(Q[:, j], u) * Q[:, j]   # -= 是"就地减"：等价于 u = u - …，但写起来更短
        Q[:, k] = u / np.linalg.norm(u)   # 归一化
    return Q

def mgs(V):
    """修正 Gram-Schmidt（数值更稳定）"""
    n = V.shape[1]                  # 列数
    V = V.copy().astype(float)      # 先复制再转浮点：绝不改动调用方传进来的数组
    Q = np.zeros_like(V)            # V 已是浮点，这里不用再写 dtype
    for k in range(n):
        Q[:, k] = V[:, k] / np.linalg.norm(V[:, k])   # 先归一化第 k 列
        for j in range(k + 1, n):   # 关键改动：马上去更新"后面所有"列，而不是等轮到它们再回头减
            V[:, j] -= np.dot(Q[:, k], V[:, j]) * Q[:, k]   # 就地扣掉新方向的成分
    return Q

# Hilbert 矩阵：臭名昭著的病态矩阵
n = 8                  # Hilbert 矩阵的阶数：阶数越高越病态
H = np.array([[1/(i+j+1) for j in range(n)] for i in range(n)])   # 嵌套列表推导式造二维数组：第 (i,j) 项是 1/(i+j+1)

Q_cgs = cgs(H)     # 经典版
Q_mgs = mgs(H)     # 修正版
print(f"经典 GS 正交性误差: {np.max(np.abs(Q_cgs.T @ Q_cgs - np.eye(n))):.2e}")   # .T 是转置，@ 是矩阵乘法；QᵀQ 与单位阵 np.eye(n) 差多少
print(f"修正 GS 正交性误差: {np.max(np.abs(Q_mgs.T @ Q_mgs - np.eye(n))):.2e}")   # ::.2e 是科学计数法、保留 2 位小数
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
# @check: e1 = [0.7071 0.     0.7071]
# @check: e2 = [ 0.4082  0.8165 -0.4082]
# @check: e1·e2 = 0.00e+00
# @hint: u2 = a2 - (a2·u1 / ||u1||²)·u1 —— 分母是 ||u1||² 还是 ||u1||？
import numpy as np   # 数组与线性代数都在这个库里

a1 = np.array([1, 0, 1], dtype=float)   # np.array 把列表变成向量；dtype=float 避免整数除法
a2 = np.array([1, 1, 0], dtype=float)

u1 = a1                                  # 第一步：第一个方向原样保留
e1 = u1 / np.linalg.norm(u1)             # 归一化：np.linalg.norm 求向量长度

proj = np.dot(a2, u1) / np.linalg.norm(u1)  # ← 投影系数：分母是平方还是长度？
u2 = a2 - proj * u1                      # ← 减去投影
e2 = u2 / np.linalg.norm(u2)             # ← 归一化

print(f"e1 = {np.round(e1, 4)}")         # np.round(数组, 4)：逐元素保留 4 位小数
print(f"e2 = {np.round(e2, 4)}")
print(f"e1·e2 = {np.dot(e1, e2):.2e}")   # 正交性验收：两个单位向量应当内积为 0
```

**练习 2**：为什么 QR 分解中 $R$ 是上三角矩阵？

<details>
<summary>点开查看解答</summary>

因为 Gram-Schmidt 是**按顺序**处理的：$\mathbf{e}_k$ 只依赖 $\mathbf{a}_1, \ldots, \mathbf{a}_k$。所以 $\mathbf{a}_k$ 在 $\mathbf{e}_j$（$j > k$）方向上的投影系数为 0——$\mathbf{e}_j$ 还没被构造出来。

这意味着 $R$ 的第 $k$ 列中，$r_{jk} = \langle \mathbf{a}_k, \mathbf{e}_j \rangle$，当 $j > k$ 时 $r_{jk} = 0$，所以 $R$ 是上三角。

几何意义：每个新向量只在已有的正交方向上有分量，不会在未来的方向上有分量。
</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：以为"正交"就等于"标准正交"。
Gram-Schmidt 的中间产物 $\mathbf{u}_k$ 只保证两两垂直，长度还不一定是 1；要再做一次 $\mathbf{e}_k=\mathbf{u}_k/\|\mathbf{u}_k\|$ 才成为标准正交基。少写这一步，$Q^TQ$ 得到的是对角矩阵而非单位矩阵，QR 分解里 $R$ 的对角元也会全错。

**误区二**：以为投影系数写成 $\langle\mathbf{a}_k,\mathbf{u}_j\rangle$ 就够了。
分母 $\langle\mathbf{u}_j,\mathbf{u}_j\rangle=\|\mathbf{u}_j\|^2$ 是必须的。只有当 $\mathbf{u}_j$ 已经是单位向量时，它才等于 1 可以省掉；把两种情形混着用，是手算最常见的错源。

**误区三**：以为经典 GS 与修正 GS 只是写法不同、结果一样。
精确算术下确实等价，浮点算术下不是：经典版拿**原始**的 $\mathbf{e}_j$ 去减，误差会累积；修正版一构造出 $\mathbf{e}_k$ 就立刻拿去更新所有后续列，正交性误差能小好几个数量级（本课实验 3 的 Hilbert 矩阵就是活证据）。反过来，也不能因为"修正版更稳"就以为它对秩亏矩阵也万无一失——列线性相关时 $\|\mathbf{u}_k\|\approx0$，两种写法都会崩，需要换 Householder 或带列主元的办法。

:::

## 8. 选读：Modified Gram-Schmidt 为何更稳定

<details>
<summary>选读 · 数值稳定性的根源</summary>

经典 Gram-Schmidt 在计算 $\mathbf{u}_k$ 时，用的是**原始** $\mathbf{e}_1, \ldots, \mathbf{e}_{k-1}$。由于浮点误差，这些 $\mathbf{e}_j$ 不完全正交，导致 $\mathbf{u}_k$ 残留的"垂直分量"不纯。

修正 Gram-Schmidt 的关键区别：在构造 $\mathbf{e}_k$ 后，立刻用它去**更新**所有后续向量 $\mathbf{a}_{k+1}, \ldots, \mathbf{a}_n$。这样每个后续向量在进入下一步之前，已经去除了 $\mathbf{e}_k$ 方向上的分量。

数学上两者等价（精确算术下结果相同），但浮点算术下，修正版的正交性误差从 $O(\kappa \varepsilon)$ 降到 $O(\kappa^2 \varepsilon^2)$（$\kappa$ 是条件数，$\varepsilon$ 是机器精度）。对于病态矩阵，这个差距是天壤之别。

实际工程中，Householder 变换（另一种 QR 分解方法）比两种 Gram-Schmidt 都更稳定——它直接用反射变换逐步消元，不需要显式计算投影。

</details>

## 9. 下一站

矩阵分解之后，我们转向微分方程——Laplace 变换把微分方程变成代数方程，是工程中最强大的求解工具之一。

→ [Laplace 变换求解 ODE](../22-ode-dynamics/25-laplace-transform.md)
