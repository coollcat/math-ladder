---
title: 最大模原理
lesson_id: complex-analysis/maximum-modulus
prereqs:
  - complex-analysis/laurent-singularities
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_concepts:
  - maximum-modulus-principle
  - schwarz-lemma
applications:
  - harmonic-functions
  - potential-theory
exits:
  - conformal-mapping
---

# 最大模原理

## 1. 从一个场景开始

实函数 $f(x) = \sin x$ 在 $[0, \pi]$ 上最大值是 1，在内部 $x = \pi/2$ 处取到。但复解析函数不行——$|f(z)|$ 的最大值**不能在内部取到**（除非 $f$ 是常数）。这就是最大模原理：解析函数的模像一个"鼓包"——最高点一定在边缘。

## 2. 直觉解释

解析函数满足 Cauchy-Riemann 方程，这意味着 $|f(z)|$ 是**次调和函数**——它没有局部最大值（就像二维热传导的温度分布，没有内部热源时温度不会在内部最高）。

更直觉地说：$f(z)$ 是解析的意味着它在每点都"忠实地"执行旋转+缩放。如果 $|f|$ 在某内部点最大，那么 $f$ 在该点附近的值都更小——但解析性要求 $f$ 在该点附近的行为由幂级数决定，而幂级数不可能只在一点取最大值（除非它是常数）。

## 3. 正式定义

**最大模原理**：设 $f$ 在有界区域 $D$ 上解析，在 $\overline{D}$（$D$ 加上边界）上连续。若 $f$ 不是常数，则 $|f(z)|$ 在 $D$ 的内部不能取到最大值。即：

$$\max_{z \in \overline{D}} |f(z)| = \max_{z \in \partial D} |f(z)|$$

**推论**（最小模原理）：若 $f$ 在 $D$ 内无零点，则 $|f(z)|$ 的最小值也在边界取到。

**Schwarz 引理**：设 $f$ 在单位圆盘 $\mathbb{D}$ 上解析，$f(0) = 0$，$|f(z)| \leq 1$。则：

1. $|f(z)| \leq |z|$ 对所有 $z \in \mathbb{D}$
2. $|f'(0)| \leq 1$
3. 若等号在某非零点成立，或 $|f'(0)| = 1$，则 $f(z) = e^{i\theta} z$（旋转）。

## 4. 分步例题

**例 1**：$f(z) = z^2 + 1$ 在 $|z| \leq 2$ 上的最大模在哪里取到？

1. 边界：$|z| = 2$，$|f(z)| = |z^2 + 1| \leq |z|^2 + 1 = 5$。
2. 在 $z = \pm 2$ 处，$f(\pm 2) = 5$，$|f| = 5$。
3. 在 $z = \pm 2i$ 处，$f(\pm 2i) = -3$，$|f| = 3$。
4. 最大模在边界 $z = \pm 2$ 处取到，值为 5。

**例 2**：用 Schwarz 引理证明：若 $f: \mathbb{D} \to \mathbb{D}$ 解析且 $f(0) = 0$，$f(1/2) = 1/2$，则 $f(z) = z$。

1. $g(z) = f(z)/z$ 在 $\mathbb{D}$ 上解析（$z=0$ 是可去奇点）。
2. $|g(z)| \leq 1$（由 $|f| \leq 1$ 和最大模原理）。
3. $g(1/2) = f(1/2)/(1/2) = 1$。
4. $|g|$ 在内部点 $z=1/2$ 取到最大值 1，由最大模原理，$g$ 是常数。
5. $g \equiv 1$，所以 $f(z) = z$。

## 5. 动手实验

### 实验 1：$|f(z)|$ 在边界取最大值

```python title="z^2 + 1 的模：内部 vs 边界"
import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(-2, 2, 300)
y = np.linspace(-2, 2, 300)
X, Y = np.meshgrid(x, y)
Z = X + 1j * Y

# 只在 |z| ≤ 2 内计算
mask = np.abs(Z) <= 2
W = np.where(mask, np.abs(Z**2 + 1), np.nan)

plt.contourf(X, Y, W, levels=30, cmap="viridis")
theta = np.linspace(0, 2*np.pi, 200)
plt.plot(2*np.cos(theta), 2*np.sin(theta), "r-", linewidth=2, label="边界 |z|=2")
plt.colorbar(label="|f(z)|")
plt.legend()
plt.title("|z²+1| 在圆盘上的分布（最大值在边界）")
plt.axis("equal")
```

### 实验 2：Schwarz 引理的可视化

```python title="|f(z)/z| ≤ 1 的验证"
import numpy as np
import matplotlib.pyplot as plt

# f(z) = (z - 0.3)/(1 - 0.3z) 是自同构，f(0) = -0.3 ≠ 0
# 改用 f(z) = z(z-0.5)/(1-0.5z)，使 f(0)=0
# 更简单：直接用 g(z) = f(z)/z

# 选一个满足条件的函数
def f(z):
    return 0.8 * z              # 简单的例子

x = np.linspace(-1, 1, 300)
y = np.linspace(-1, 1, 300)
X, Y = np.meshgrid(x, y)
Z = X + 1j * Y
mask = np.abs(Z) < 0.99

# |f(z)/z| = |0.8| = 0.8 处处成立
ratio = np.where(mask & (np.abs(Z) > 0.01), np.abs(f(Z) / Z), np.nan)

plt.contourf(X, Y, ratio, levels=20, cmap="RdYlGn")
plt.colorbar(label="|f(z)/z|")
theta = np.linspace(0, 2*np.pi, 200)
plt.plot(np.cos(theta), np.sin(theta), "k-", linewidth=2)
plt.title("Schwarz 引理：|f(z)/z| ≤ 1（颜色 ≤ 1）")
plt.axis("equal")
```

### 实验 3：最大模原理的"热力图"

```python title="解析函数的模没有内部鼓包"
import numpy as np
import matplotlib.pyplot as plt

# f(z) = e^z 在矩形区域
x = np.linspace(-1, 2, 300)
y = np.linspace(-2, 2, 300)
X, Y = np.meshgrid(x, y)
Z = X + 1j * Y
W = np.abs(np.exp(Z))

plt.contourf(X, Y, W, levels=30, cmap="hot")
plt.colorbar(label="|e^z|")
plt.contour(X, Y, W, levels=[W.max()*0.99], colors="cyan", linewidths=2)
plt.title("|e^z| 的等高线：最大值在边界（青色线）")
plt.xlabel("Re(z)")
plt.ylabel("Im(z)")
```

## 6. 练习

```quiz
最大模原理说解析函数的模在哪里取最大值？
- 在区域内部
- 在边界上（除非是常数） [*]
- 只在原点
? 最大模原理：若 f 在有界区域 D 上解析且非常数，则 |f| 的最大值只能在边界 ∂D 上取到。
```

```quiz
Schwarz 引理中，若 f:D→D 解析，f(0)=0，且 |f(1/2)|=1/2，那么 f 是什么？
- f(z) = z²
- f(z) = z [*]
- f(z) = 2z
? |f(z)/z|≤1（Schwarz 引理），且 |f(1/2)/(1/2)|=1，在内部取到最大值，由最大模原理 f(z)/z 是常数 1，所以 f(z)=z。
```

**练习 1**：$f(z) = z^3 - 3z$ 在 $|z| \leq 2$ 上的最大模是多少？在哪里取到？

```exercise
# @title: 最大模练习
# @check: 最大模 = 14.0
# @check: 在 z = -2 处取到
# @hint: 在边界 |z|=2 上，z = 2e^{iθ}，检查 |f| 的最大值
import numpy as np

theta = np.linspace(0, 2*np.pi, 1000)
z = 2 * np.exp(1j * theta)     # 边界上的点
f = z**3 - 3*z
max_mod = np.max(np.abs(f))
max_theta = theta[np.argmax(np.abs(f))]
print(f"最大模 = {max_mod:.1f}")
print(f"在 θ = {max_theta:.2f} (z = {2*np.exp(1j*max_theta):.2f}) 处取到")
```

**练习 2**：用最大模原理证明：若 $f$ 在整个复平面解析且有界，则 $f$ 是常数（这是 Liouville 定理的另一种证法）。

<details>
<summary>点开查看解答</summary>

对任意 $z_0 \in \mathbb{C}$ 和任意 $R > 0$，$|f(z_0)| \leq \max_{|z-z_0|=R} |f(z)| \leq M$。

但这个不等式对所有 $R$ 成立，不能直接推出 $f$ 是常数——最大模原理只适用于有界区域。

正确的做法：对 $g(z) = f(z) - f(z_0)$ 应用最大模原理。在 $|z| \leq R$ 上，$|g(z_0)| \leq \max_{|z|=R} |g(z)|$。令 $R \to \infty$，右边趋向 $\max |f - f(z_0)| \leq 2M$。这还不够。

完整证法需要 Cauchy 积分公式或 Liouville 的原始方法（Cauchy 估计）。最大模原理是 Liouville 定理的一个推论，反过来用它证 Liouville 需要额外工具。

</details>

## 7. 选读：Schwarz 引理的推广

<details>
<summary>选读 · Schwarz-Pick 定理</summary>

Schwarz 引理的推广：若 $f: \mathbb{D} \to \mathbb{D}$ 解析，则对任意 $z_1, z_2 \in \mathbb{D}$：

$$\left|\frac{f(z_1) - f(z_2)}{1 - \overline{f(z_1)}f(z_2)}\right| \leq \left|\frac{z_1 - z_2}{1 - \overline{z_1}z_2}\right|$$

左边是 Poincaré 度量下 $f(z_1)$ 和 $f(z_2)$ 的距离，右边是 $z_1$ 和 $z_2$ 的距离。

结论：**解析自映射是 Poincaré 度量下的非扩张映射**——它不会拉大双曲距离。等号成立当且仅当 $f$ 是 Möbius 自同构。

这是双曲几何的基本定理，也是复动力系统（如 Mandelbrot 集）的理论基础。

</details>

## 8. 下一站

最大模原理说模不能在内部取最大。Rouché 定理则用模的比较来数零点——两个函数如果在边界上"差不多大"，它们在内部的零点个数就相同。

→ [Rouché 定理与辐角原理](./85-rouche-argument.md)
