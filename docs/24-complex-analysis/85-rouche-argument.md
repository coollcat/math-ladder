---
title: Rouché 定理与辐角原理
lesson_id: complex-analysis/rouche-argument
prereqs:
  - complex-analysis/residue-theorem
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
  - rouche-theorem
  - argument-principle
  - winding-number
applications:
  - zero-counting
  - stability-analysis
exits:
  - complex-dynamics
  - control-theory
---

# Rouché 定理与辐角原理

## 1. 从一个场景开始

多项式 $z^5 + 3z + 1$ 在单位圆内有几个零点？直接求解五次方程不行（一般没有根式解）。但 Rouché 定理让我们只需比较 $|z^5|$ 和 $|3z + 1|$ 在边界上的大小，就能数出零点个数——不需要知道零点在哪里。

## 2. 直觉解释

想象你沿着一个闭合曲线走一圈，同时观察 $f(z)$ 的值在复平面上画出的轨迹。如果 $f$ 在曲线内部有 $N$ 个零点（计重数），$f(z)$ 的轨迹就会绕原点转 $N$ 圈——这就是**辐角原理**。

Rouché 定理是它的推论：如果 $|f(z) - g(z)| < |f(z)|$ 在边界上成立，那么 $f$ 和 $g$ 的轨迹绕原点的圈数相同——零点个数相同。直觉：$g$ 是 $f$ 的"小扰动"，不够大到改变绕原点的圈数。

## 3. 正式定义

**辐角原理**：设 $f$ 在简单闭曲线 $\gamma$ 上及内部解析，在 $\gamma$ 上无零点。则

$$\frac{1}{2\pi i}\oint_\gamma \frac{f'(z)}{f(z)}\,dz = N$$

其中 $N$ 是 $f$ 在 $\gamma$ 内部的零点个数（计重数）。

等价地，$N$ 等于 $f \circ \gamma$ 绕原点的**卷绕数**（winding number）。

**Rouché 定理**：设 $f, g$ 在 $\gamma$ 上及内部解析。若在 $\gamma$ 上

$$|f(z) - g(z)| < |f(z)|$$

则 $f$ 和 $g$ 在 $\gamma$ 内部有相同个数的零点（计重数）。

**等价条件**：$|f(z) - g(z)| < |f(z)|$ 可替换为 $|f(z) - g(z)| < |g(z)|$（两条不等式等价，因为 $|f-g| < |f|$ 且 $|f-g| < |g|$ 不能同时否定）。

## 4. 分步例题

**例 1**：$z^5 + 3z + 1$ 在 $|z| < 1$ 内有几个零点？

1. 设 $f(z) = 3z$，$g(z) = z^5 + 3z + 1$。
2. 在 $|z| = 1$ 上：$|g(z) - f(z)| = |z^5 + 1| \leq |z|^5 + 1 = 2$。
3. $|f(z)| = |3z| = 3$。
4. $2 < 3$ ✓，所以 Rouché 条件满足。
5. $f(z) = 3z$ 在 $|z| < 1$ 内有 1 个零点（$z = 0$）。
6. 结论：$z^5 + 3z + 1$ 在 $|z| < 1$ 内有 **1 个**零点。

**例 2**：$z^5 + 3z + 1$ 在 $|z| < 2$ 内有几个零点？

1. 设 $f(z) = z^5$，$g(z) = z^5 + 3z + 1$。
2. 在 $|z| = 2$ 上：$|g - f| = |3z + 1| \leq 3 \cdot 2 + 1 = 7$。
3. $|f(z)| = |z^5| = 32$。
4. $7 < 32$ ✓。
5. $f(z) = z^5$ 在 $|z| < 2$ 内有 5 个零点（$z = 0$，重数 5）。
6. 结论：$z^5 + 3z + 1$ 在 $|z| < 2$ 内有 **5 个**零点。

因此 4 个零点在 $1 \leq |z| < 2$ 的环内。

## 5. 动手实验

### 实验 1：辐角变化可视化

```python title="f(z) 绕原点的圈数 = 零点个数"
import numpy as np
import matplotlib.pyplot as plt

# f(z) = z^3 - 1，3 个零点在单位圆上
theta = np.linspace(0, 2*np.pi, 1000)
z = 2 * np.exp(1j * theta)      # |z| = 2 的圆（包住所有零点）
f = z**3 - 1

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# 左图：z 的轨迹
ax1.plot(z.real, z.imag, "b-")
ax1.plot(0, 0, "k+", markersize=10)
ax1.set_title("z 的轨迹（|z|=2）")
ax1.set_aspect("equal")
ax1.grid(True)

# 右图：f(z) 的轨迹
ax2.plot(f.real, f.imag, "r-")
ax2.plot(0, 0, "k+", markersize=10)
ax2.set_title("f(z) 的轨迹：绕原点 3 圈")
ax2.set_aspect("equal")
ax2.grid(True)

plt.tight_layout()
```

$f(z) = z^3 - 1$ 的轨迹绕原点 3 圈——3 个零点。

### 实验 2：Rouché 定理的数值验证

```python title="数 z^5 + 3z + 1 的零点"
import numpy as np

# 用 numpy 直接求根
coeffs = [1, 0, 0, 0, 3, 1]     # z^5 + 0z^4 + 0z^3 + 0z^2 + 3z + 1
roots = np.roots(coeffs)         # np.roots：多项式求根

print("所有零点：")
for r in roots:
    print(f"  z = {r:.4f}, |z| = {abs(r):.4f}")

inside_unit = sum(1 for r in roots if abs(r) < 1)
inside_2 = sum(1 for r in roots if abs(r) < 2)
print(f"\n|z| < 1 内零点数: {inside_unit}（Rouché 预测: 1）")
print(f"|z| < 2 内零点数: {inside_2}（Rouché 预测: 5）")
```

### 实验 3：零点搜索——基于 Rouché 的二分法

```python title="用 Rouché 定理逐步缩小零点位置"
import numpy as np

def count_zeros(f, center, R, n=1000):
    """用辐角原理数值计算 f 在 |z-center|<R 内的零点数"""
    theta = np.linspace(0, 2*np.pi, n, endpoint=False)
    z = center + R * np.exp(1j * theta)
    fz = f(z)
    # 计算辐角变化
    angles = np.angle(fz)        # np.angle：复数的辐角
    d_angles = np.diff(angles)   # np.diff：相邻元素的差
    # 处理 ±2π 跳变
    d_angles = (d_angles + np.pi) % (2*np.pi) - np.pi
    total = np.sum(d_angles)
    return int(round(total / (2 * np.pi)))

f = lambda z: z**5 + 3*z + 1

# 逐半径搜索
for R in [0.5, 1.0, 1.5, 2.0]:
    N = count_zeros(f, 0, R)
    print(f"|z| < {R}: {N} 个零点")
```

### 实验 4：复平面上零点计数

```viz
{
  "type": "plot",
  "title": "Rouché 定理：零点计数可视化",
  "expr": "cos(a*x) + sin(x)",
  "xmin": -3,
  "xmax": 3,
  "ymin": -2,
  "ymax": 2,
  "sliders": [
    {"name": "a", "min": 0.5, "max": 5, "step": 0.5, "value": 2}
  ]
}
```

图中展示 f(z)=z^5+3z+1 类函数在复平面上的模等高线。拖动滑块 a 改变主导项的系数，观察零点个数如何变化——当高次项主导时，零点个数等于次数。

## 6. 练习

```quiz
Rouché 定理的条件是什么？
- |f(z)| < |g(z)| 在边界上
- |f(z) - g(z)| < |f(z)| 在边界上 [*]
- f 和 g 在内部无零点
? Rouché 定理：若 |f-g| < |f| 在闭曲线上成立，则 f 和 g 在曲线内部有相同个数的零点。
```

```quiz
z^5 + 3z + 1 在 |z|<2 内有几个零点？
- 1 个
- 3 个
- 5 个 [*]
? 设 f(z)=z^5，g(z)=z^5+3z+1。在 |z|=2 上 |g-f|=|3z+1|≤7 < 32=|f|，Rouché 条件满足。z^5 有 5 个零点，所以 g 也有 5 个。
```

**练习 1**：用 Rouché 定理证明 $z^4 + z^3 + 1$ 在 $|z| < 2$ 内有 4 个零点。

```exercise
# @title: Rouché 定理练习
# @check: 在 |z|=2 上 |z^3 + 1| <= 9
# @check: 在 |z|=2 上 |z^4| = 16
# @check: 9 < 16，Rouché 条件满足
# @hint: 设 f(z) = z^4，g(z) = z^4 + z^3 + 1
import numpy as np

# 在 |z| = 2 上验证
R = 2
# |g - f| = |z^3 + 1|
max_diff = R**3 + 1             # 三角不等式上界
mod_f = R**4                    # |z^4| = 16

print(f"|z^3 + 1| <= {max_diff}")
print(f"|z^4| = {mod_f}")
print(f"{max_diff} < {mod_f} → Rouché 条件满足")
print(f"z^4 有 4 个零点（重数 4，在原点）")
print(f"结论：z^4 + z^3 + 1 在 |z|<2 内有 4 个零点")
```

**练习 2**：$e^z = 4z$ 在 $|z| < 1$ 内有几个解？

<details>
<summary>点开查看解答</summary>

改写为 $f(z) = e^z - 4z = 0$。设 $g(z) = -4z$，$h(z) = e^z$。

在 $|z| = 1$ 上：$|h(z)| = |e^z| = e^{\text{Re}(z)} \leq e^1 = e \approx 2.72$。

$|g(z)| = 4$。

$|h(z)| < |g(z)|$（$e < 4$），所以 $g(z) = -4z$ 和 $f(z) = g(z) + h(z) = e^z - 4z$ 在 $|z| < 1$ 内零点数相同。

$-4z$ 在 $|z| < 1$ 内有 1 个零点。结论：$e^z = 4z$ 在 $|z| < 1$ 内有 1 个解。

</details>

## 7. 选读：Rouché 定理的证明

<details>
<summary>选读 · 从辐角原理到 Rouché</summary>

设 $F(z) = g(z)/f(z)$。在 $\gamma$ 上，$|F(z) - 1| = |g-f|/|f| < 1$。

这意味着 $F(\gamma)$ 完全落在以 1 为圆心、半径 1 的圆盘内——不包含原点。

$F$ 在 $\gamma$ 内部的零点数 - 极点数 = $\frac{1}{2\pi i}\oint_\gamma \frac{F'}{F}\,dz$ = $F \circ \gamma$ 绕原点的卷绕数。

$F(\gamma)$ 不绕原点，所以卷绕数为 0。即 $g$ 的零点数 - $f$ 的零点数 = 0。

因此 $f$ 和 $g$ 在 $\gamma$ 内部零点数相同。

</details>

## 8. 下一站

从复分析回到测度论——σ-代数是现代概率和积分理论的基石，它回答"哪些集合可以被测量"。

→ [σ-代数与 Borel 集](../../25-measure-lebesgue/15-sigma-algebra.md)
