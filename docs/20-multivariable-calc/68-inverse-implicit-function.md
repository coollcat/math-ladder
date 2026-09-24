---
title: 反函数定理与隐函数定理
lesson_id: multivariable-calc/inverse-implicit-function
prereqs:
  - multivariable/divergence-stokes
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 5
introduces_concepts:
  - inverse-function-theorem
  - implicit-function-theorem
  - jacobian-invertibility
applications:
  - nonlinear-systems
  - constrained-optimization
exits:
  - differential-geometry
  - optimization
---

# 反函数定理与隐函数定理

## 1. 从一个场景开始

你有一个方程组 $u = x^2 - y$，$v = x + y^2$。在某点附近，能不能把 $x, y$ 反过来表示成 $u, v$ 的函数？直觉上，如果变换"足够不退化"，局部应该可逆。反函数定理精确回答了"什么时候可逆"以及"逆函数的导数是什么"。

## 2. 直觉解释

一元函数 $f(x) = x^3$ 在 $x=0$ 处导数为 0——图像在原点"平躺"，不可逆（$f$ 整体可逆，但在 0 附近不是局部微分同胚）。而 $f(x) = e^x$ 处处导数非零，处处局部可逆。

推广到多元：向量函数 $\mathbf{F}: \mathbb{R}^n \to \mathbb{R}^n$ 的"导数"是 **Jacobian 矩阵** $J_\mathbf{F}$。如果 $J_\mathbf{F}$ 在某点可逆（行列式非零），则 $\mathbf{F}$ 在该点附近局部可逆——就像一元函数导数非零时局部可逆一样。

隐函数定理则回答另一个问题：方程 $F(x, y) = 0$ 在什么条件下能把 $y$ 局部表示为 $x$ 的函数？

## 3. 正式定义

**反函数定理**：设 $\mathbf{F}: \mathbb{R}^n \to \mathbb{R}^n$ 在开集 $U$ 上 $C^1$（连续可微），$\mathbf{a} \in U$。若 Jacobian 行列式 $\det J_\mathbf{F}(\mathbf{a}) \neq 0$，则存在 $\mathbf{a}$ 的邻域 $V \subseteq U$ 和 $\mathbf{F}(\mathbf{a})$ 的邻域 $W$，使得 $\mathbf{F}: V \to W$ 是双射，且逆函数 $\mathbf{F}^{-1}: W \to V$ 也是 $C^1$，其 Jacobian 为：

$$J_{\mathbf{F}^{-1}}(\mathbf{y}) = \left[J_\mathbf{F}\big(\mathbf{F}^{-1}(\mathbf{y})\big)\right]^{-1}$$

**隐函数定理**：设 $F: \mathbb{R}^{n+m} \to \mathbb{R}^m$ 在开集上 $C^1$，$\mathbf{F}(\mathbf{a}, \mathbf{b}) = \mathbf{0}$。若偏导矩阵 $\frac{\partial \mathbf{F}}{\partial \mathbf{y}}\big|_{(\mathbf{a},\mathbf{b})}$ 可逆，则存在 $\mathbf{a}$ 的邻域 $U$ 和唯一的 $C^1$ 函数 $\mathbf{g}: U \to \mathbb{R}^m$ 使得 $\mathbf{g}(\mathbf{a}) = \mathbf{b}$ 且 $\mathbf{F}(\mathbf{x}, \mathbf{g}(\mathbf{x})) = \mathbf{0}$ 对所有 $\mathbf{x} \in U$ 成立。

**关键条件**：

| 定理 | 核心条件 | 结论 |
| --- | --- | --- |
| 反函数 | $\det J_\mathbf{F}(\mathbf{a}) \neq 0$ | 局部可逆 |
| 隐函数 | $\frac{\partial \mathbf{F}}{\partial \mathbf{y}}$ 可逆 | $y$ 可局部表示为 $x$ 的函数 |

## 4. 分步例题

**例 1**（反函数定理）：$\mathbf{F}(x, y) = (e^x \cos y,\; e^x \sin y)$，在 $(0, 0)$ 处验证反函数定理。

1. 计算 Jacobian：

$$J_\mathbf{F} = \begin{pmatrix} e^x \cos y & -e^x \sin y \\ e^x \sin y & e^x \cos y \end{pmatrix}$$

2. 在 $(0,0)$ 处：$J_\mathbf{F}(0,0) = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$。

3. $\det J_\mathbf{F}(0,0) = 1 \neq 0$。✓

4. 结论：$\mathbf{F}$ 在 $(0,0)$ 附近局部可逆。（实际上 $\mathbf{F}$ 是极坐标映射 $(r, \theta) \mapsto (r\cos\theta, r\sin\theta)$ 的指数版。）

**例 2**（隐函数定理）：$F(x, y) = x^2 + y^2 - 1 = 0$（单位圆），在 $(1, 0)$ 处能否把 $y$ 表示为 $x$ 的函数？

1. $\frac{\partial F}{\partial y} = 2y$。
2. 在 $(1, 0)$ 处 $\frac{\partial F}{\partial y} = 0$。**条件不满足！**
3. 换到 $(\frac{\sqrt{2}}{2}, \frac{\sqrt{2}}{2})$：$\frac{\partial F}{\partial y} = \sqrt{2} \neq 0$。✓
4. 在该点附近，$y = g(x) = \sqrt{1 - x^2}$ 是 $C^1$ 函数。

## 5. 动手实验

### 实验 1：Jacobian 行列式与局部可逆性

```python title="检查 Jacobian 行列式何时非零"
import numpy as np

def jacobian_F(x, y):
    """F(x,y) = (x^2 + y, x + y^2) 的 Jacobian 矩阵"""
    return np.array([
        [2*x, 1],               # ∂F₁/∂x, ∂F₁/∂y
        [1, 2*y]                # ∂F₂/∂x, ∂F₂/∂y
    ])

# 在几个点检查行列式
points = [(1, 1), (0, 0), (0.5, 0.5), (-1, 2)]
for (x, y) in points:
    J = jacobian_F(x, y)
    det = np.linalg.det(J)      # np.linalg.det：计算矩阵行列式
    inv_ok = abs(det) > 1e-10   # 行列式足够远离 0 → 可逆
    print(f"({x},{y}): det(J) = {det:.2f}, 局部可逆 = {inv_ok}")
```

在 $(0,0)$ 处 $\det = -1 \neq 0$，局部可逆；你需要找到 $\det = 0$ 的点来观察"不可逆"的样子。

### 实验 2：隐函数的数值求解

```python title="用 Newton 法从 F(x,y)=0 解出 y(x)"
import matplotlib.pyplot as plt
import numpy as np

# F(x, y) = x^2 + y^2 - 1（单位圆）
def F(x, y):
    return x**2 + y**2 - 1

def dFdy(x, y):
    return 2 * y               # ∂F/∂y

# 从 (√2/2, √2/2) 出发，逐步改变 x，用 Newton 法解 y
xs = []
ys = []
x, y = 0.7071, 0.7071         # 初始点
dx = 0.01                     # x 步长

for _ in range(40):
    xs.append(x)
    ys.append(y)
    x_new = x + dx
    # Newton 迭代：y_{k+1} = y_k - F(x_new, y_k) / (∂F/∂y)(x_new, y_k)
    for _ in range(10):
        y = y - F(x_new, y) / dFdy(x_new, y)
    x = x_new

plt.plot(xs, ys, "b-o", markersize=3, label="隐函数 y(x)")
theta = np.linspace(0, np.pi/2, 100)
plt.plot(np.cos(theta), np.sin(theta), "r--", label="x²+y²=1")
plt.legend()
plt.axis("equal")
plt.grid(True)
plt.title("隐函数定理：从方程解出 y(x)")
```

### 实验 3：Jacobian 行列式的热力图

```python title="哪里可逆？Jacobian 行列式的颜色地图"
import numpy as np
import matplotlib.pyplot as plt

# F(x,y) = (e^x cos y, e^x sin y)
xs = np.linspace(-2, 2, 100)
ys = np.linspace(-np.pi, np.pi, 100)
X, Y = np.meshgrid(xs, ys)
det = np.exp(2 * X)           # det(J) = e^{2x} 对这个映射

plt.contourf(X, Y, det, levels=20, cmap="viridis")
plt.colorbar(label="det(J)")
plt.contour(X, Y, det, levels=[0.01], colors="red", linewidths=2)
plt.xlabel("x")
plt.ylabel("y")
plt.title("det(J) 热力图：红色线附近行列式接近 0")
```

### 实验 4：隐函数曲线族

```viz
{
  "type": "plot",
  "title": "隐函数 F(x,y) = x² + y² - r² = 0",
  "expr": "sqrt((r*r - x*x + abs(r*r - x*x))/2)",
  "xmin": -3,
  "xmax": 3,
  "ymin": -3,
  "ymax": 3,
  "sliders": [
    {"name": "r", "min": 0.5, "max": 3, "step": 0.1, "value": 1}
  ]
}
```

圆 x²+y²=r² 是隐函数 F(x,y)=0 的典型例子。拖动滑块 r 改变半径，观察曲线族的变化。在圆上除 (±r,0) 外的点，∂F/∂y≠0，隐函数定理保证 y 可局部表示为 x 的函数。

## 6. 练习

```quiz
反函数定理的核心条件是什么？
- 函数连续
- Jacobian 行列式非零 [*]
- 函数有界
? Jacobian 行列式非零意味着线性近似可逆，从而原函数在该点附近局部可逆。行列式为零时变换退化，信息丢失。
```

```quiz
F(x,y)=x²+y²-1=0，在点 (1,0) 处能否用隐函数定理把 y 表示为 x 的函数？
- 能，因为 F 在该点可微
- 不能，因为 ∂F/∂y = 2y = 0 在该点 [*]
- 能，因为圆是光滑曲线
? 隐函数定理要求 ∂F/∂y ≠ 0。在 (1,0) 处 ∂F/∂y = 2×0 = 0，条件不满足。需要换到 y≠0 的点（如 (√2/2, √2/2)）。
```

**练习 1**：对 $\mathbf{F}(x,y) = (x^2 - y^2,\; 2xy)$（复数平方映射 $z \mapsto z^2$ 的实虚部），计算 Jacobian 并求 $\det J_\mathbf{F} = 0$ 的点集。

```exercise
# @title: 复数平方映射的 Jacobian
# @check: det(J) = 4*(x^2 + y^2)
# @check: det=0 仅在原点 (0,0)
# @hint: J = [[2x, -2y], [2y, 2x]]
import numpy as np

def jacobian(x, y):
    return np.array([[2*x, -2*y], [2*y, 2*x]])

# 计算几个点的行列式
for (x, y) in [(1, 0), (0, 1), (1, 1), (0, 0)]:
    J = jacobian(x, y)
    det = np.linalg.det(J)
    print(f"({x},{y}): det = {det:.1f}")

print("det = 0 仅在原点 → 除原点外处处局部可逆")
```

**练习 2**：$F(x, y, z) = x^2 + y^2 + z^2 - 1 = 0$。在点 $(\frac{1}{\sqrt{3}}, \frac{1}{\sqrt{3}}, \frac{1}{\sqrt{3}})$ 处，能否把 $z$ 表示为 $(x, y)$ 的函数？

<details>
<summary>点开查看解答</summary>

$\frac{\partial F}{\partial z} = 2z$。在给定点处 $z = \frac{1}{\sqrt{3}} \neq 0$，条件满足。

隐函数定理保证：存在 $(\frac{1}{\sqrt{3}}, \frac{1}{\sqrt{3}})$ 的邻域，$z = g(x,y) = \sqrt{1 - x^2 - y^2}$ 是 $C^1$ 函数。

隐函数的偏导：$\frac{\partial z}{\partial x} = -\frac{\partial F/\partial x}{\partial F/\partial z} = -\frac{2x}{2z} = -\frac{x}{z}$。
</details>

## 7. 选读：为什么 Jacobian 可逆是关键条件

<details>
<summary>选读 · 从线性近似到反函数定理</summary>

在 $\mathbf{a}$ 附近，$\mathbf{F}(\mathbf{x}) \approx \mathbf{F}(\mathbf{a}) + J_\mathbf{F}(\mathbf{a})(\mathbf{x} - \mathbf{a})$。

如果 $J_\mathbf{F}(\mathbf{a})$ 可逆，这个线性近似本身就是可逆的——逆映射近似为 $J_\mathbf{F}(\mathbf{a})^{-1}$。反函数定理的本质是说：**线性近似可逆 ⇒ 原函数局部可逆**。

证明的核心技巧是压缩映射原理：构造 $\mathbf{g}(\mathbf{y}) = \mathbf{x} - J_\mathbf{F}(\mathbf{a})^{-1}[\mathbf{F}(\mathbf{x}) - \mathbf{y}]$，证明它是压缩映射，从而有唯一不动点——这个不动点就是 $\mathbf{F}^{-1}(\mathbf{y})$。

Jacobian 不可逆时，线性近似退化（把空间压扁了），局部信息丢失，无法逆回去。这就像一元函数 $f'(a) = 0$ 时，$f$ 在 $a$ 附近"折叠"了，不能局部反转。

</details>

## 8. 下一站

矩阵分解是线性代数的核心工具。高斯消元的矩阵形式就是 LU 分解——把一个矩阵拆成"下三角 × 上三角"。

→ [LU 分解](../21-linear-algebra-advanced/25-lu-decomposition.md)
