---
title: Liouville 定理
lesson_id: complex-analysis/liouville
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
  - liouville-theorem
  - fundamental-theorem-algebra
applications:
  - polynomial-zeros
  - entire-functions
exits:
  - complex-analysis-deep
---

# Liouville 定理

## 1. 从一个场景开始

$e^z$ 是整函数（处处解析），但它无界——$|e^z|$ 可以任意大。$\sin z$ 也是整函数，同样无界。有没有非平凡的有界整函数？Liouville 定理给出了惊人答案：**没有**。有界整函数只能是常数。

这个结论直接蕴含代数基本定理：每个非常数多项式必有零点。

## 2. 直觉解释

整函数可以在整个复平面上展开为幂级数 $f(z) = \sum_{n=0}^{\infty} a_n z^n$。如果 $f$ 有界，$|f(z)| \leq M$，那么系数 $a_n$ 必须非常小——Cauchy 估计说 $|a_n| \leq M/R^n$，$R$ 可以任意大，所以 $a_n = 0$（$n \geq 1$）。

换句话说：幂级数没有"高次项"来支撑，只剩常数项。

## 3. 正式定义

**Liouville 定理**：若 $f: \mathbb{C} \to \mathbb{C}$ 是整函数（在全平面解析），且存在常数 $M$ 使得 $|f(z)| \leq M$ 对所有 $z \in \mathbb{C}$ 成立，则 $f$ 是常数。

**Cauchy 估计**：若 $f$ 在 $|z| \leq R$ 上解析且 $|f| \leq M$，则

$$|f^{(n)}(0)| \leq \frac{n! M}{R^n}$$

**代数基本定理**：每个非常数多项式 $p(z)$ 在 $\mathbb{C}$ 中至少有一个零点。

## 4. 分步例题

**例 1**：用 Liouville 定理证明代数基本定理。

1. 设 $p(z) = a_n z^n + \cdots + a_0$（$n \geq 1$，$a_n \neq 0$）。
2. 假设 $p(z)$ 无零点，则 $g(z) = 1/p(z)$ 是整函数。
3. 当 $|z| \to \infty$，$|p(z)| \to \infty$（首项 $a_n z^n$ 主导），所以 $|g(z)| \to 0$。
4. $g$ 连续且在无穷远处趋向 0，所以 $g$ 有界。
5. 由 Liouville 定理，$g$ 是常数，$p$ 也是常数——矛盾。

**例 2**：证明 $f(z) = e^z$ 不是有界整函数（验证 Liouville 的前提不满足）。

1. $e^z$ 是整函数。✓
2. $|e^z| = |e^{x+iy}| = e^x$。
3. 当 $x \to +\infty$，$e^x \to \infty$。$e^z$ 无界。✓
4. Liouville 定理不适用（前提不满足），所以 $e^z$ 可以是非常数的整函数——确实如此。

## 5. 动手实验

### 实验 1：整函数的有界性检验

```python title="检验几个整函数是否有界"
import numpy as np

# 在大圆盘上采样，检查 |f(z)| 的最大值
def check_bounded(f, name, R=100, n=1000):
    """在 |z| ≤ R 上检查 |f(z)| 是否有界"""
    # 在圆盘上随机采样
    np.random.seed(42)
    r = R * np.sqrt(np.random.rand(n))     # 半径：√分布保证均匀采样
    theta = 2 * np.pi * np.random.rand(n)  # 角度
    z = r * np.exp(1j * theta)             # 极坐标转直角坐标
    vals = np.abs(f(z))                    # |f(z)|
    print(f"{name}: |f| 最大值 = {np.max(vals):.2e}, R = {R}")

check_bounded(lambda z: np.exp(z), "e^z")
check_bounded(lambda z: np.sin(z), "sin(z)")
check_bounded(lambda z: z**2 + 1, "z²+1")
check_bounded(lambda z: np.ones_like(z), "常数 1")
```

### 实验 2：Cauchy 估计可视化

```python title="|a_n| ≤ M/R^n 随 R 增大趋向 0"
import matplotlib.pyplot as plt
import numpy as np

M = 10                          # |f| 的上界
Rs = np.linspace(1, 50, 200)

plt.figure(figsize=(8, 4))
for n in [1, 2, 5, 10]:
    bound = M * np.math.factorial(n) / Rs**n
    plt.semilogy(Rs, bound, label=f"n={n}")

plt.xlabel("R（圆盘半径）")
plt.ylabel("|aₙ| 的上界（对数刻度）")
plt.title("Cauchy 估计：|aₙ| ≤ n!·M / R^n")
plt.legend()
plt.grid(True)
```

对每个 $n \geq 1$，当 $R \to \infty$ 时上界趋向 0——所以 $a_n = 0$。

### 实验 3：$1/p(z)$ 的有界性

```python title="多项式的倒数在无穷远处趋向 0"
import numpy as np
import matplotlib.pyplot as plt

# p(z) = z^2 + 1，1/p(z) 是整函数吗？不是（z=±i 是极点）
# 但如果 p 无零点（如 z^2 + 1 替换为 z^2 + 1 在实轴上无零点）
# 用 p(z) = z^3 + 2 验证：|1/p(z)| 在大圆盘上趋向 0

Rs = [1, 5, 10, 50]
fig, axes = plt.subplots(1, 4, figsize=(14, 3))

for ax, R in zip(axes, Rs):
    x = np.linspace(-R, R, 200)
    y = np.linspace(-R, R, 200)
    X, Y = np.meshgrid(x, y)
    Z = X + 1j * Y
    P = Z**3 + 2
    with np.errstate(divide='ignore', invalid='ignore'):
        W = 1.0 / np.abs(P)
        W[W > 5] = 5              # 截断以便可视化
    ax.contourf(X, Y, W, levels=20, cmap="hot")
    ax.set_title(f"|1/p(z)|, R={R}")
    ax.set_aspect("equal")

plt.tight_layout()
```

$R$ 越大，$|1/p(z)|$ 的最大值越小——趋向 0，说明 $1/p$ 有界。

## 6. 练习

```quiz
Liouville 定理的结论是什么？
- 整函数一定无界
- 有界整函数一定是常数 [*]
- 常数函数一定有界
? Liouville 定理：若 f 是整函数且 |f(z)|≤M 对所有 z 成立，则 f 是常数。有界性+整函数=常数。
```

```quiz
如何用 Liouville 定理证明代数基本定理？
- 假设多项式无零点，则其倒数是有界整函数，由 Liouville 得出矛盾 [*]
- 直接计算多项式的根
- 用数学归纳法
? 若 p(z) 无零点，则 1/p(z) 是整函数。当 |z|→∞ 时 |1/p|→0，所以有界。Liouville 定理推出 1/p 是常数，矛盾。
```

**练习 1**：证明：若 $f$ 是整函数且 $|f(z)| \leq |z|$ 对所有 $z$ 成立，则 $f(z) = cz$（某常数 $c$，$|c| \leq 1$）。

```exercise
# @title: Liouville 推广
# @check: f(z) = c*z, |c| <= 1
# @hint: 考虑 g(z) = f(z)/z 在 z=0 处的可去奇点
import numpy as np

# f 是整函数，|f(z)| ≤ |z|
# g(z) = f(z)/z 在 z≠0 解析，z=0 是可去奇点
# g 有界（|g| ≤ 1），由 Liouville 定理 g 是常数 c
# 所以 f(z) = cz，且 |c| ≤ 1

print("思路：f(z)/z 有界 → Liouville → f(z)/z = c → f(z) = cz")
print("结论：f(z) = c*z，其中 |c| ≤ 1")
```

**练习 2**：用 Liouville 定理证明：若 $f$ 和 $g$ 都是整函数，$f^2 + g^2 = 1$，则 $f$ 和 $g$ 都是常数。

<details>
<summary>点开查看解答</summary>

设 $h = f + ig$，则 $|h|^2 = |f+ig|^2 = f^2 + g^2 = 1$（因为 $f, g$ 取实值——不对，$f, g$ 是复值函数）。

更精确的做法：$f^2 + g^2 = 1$ 意味着 $(f+ig)(f-ig) = 1$。设 $F = f + ig$，$G = f - ig$，则 $FG = 1$。

$F$ 是整函数。若 $F$ 有零点 $z_0$，则 $F(z_0)G(z_0) = 0 \neq 1$——矛盾。所以 $F$ 无零点。

$H = 1/F = G$ 也是整函数。$|H| = |G| = |f - ig| \leq |f| + |g|$。

由 $f^2 + g^2 = 1$ 和 Cauchy-Schwarz，$|f|^2 + |g|^2 \geq 1$，但更重要的是 $|F| = |f+ig|$ 和 $|G| = |f-ig|$ 都有界（因为 $|F||G| = 1$，若一个无界另一个趋向 0，但两个都是整函数不能有极点）。

实际上 $|F| \cdot |G| = 1$ 且 $F, G$ 都是整函数。若 $|F|$ 无界，$|G| = 1/|F|$ 趋向 0，$G$ 有界，$G$ 是常数（Liouville），则 $F = 1/G$ 也是常数。

所以 $f = (F+G)/2$ 和 $g = (F-G)/(2i)$ 都是常数。

</details>

## 7. 选读：Liouville 定理的推广

<details>
<summary>选读 · 广义 Liouville 定理</summary>

**广义 Liouville 定理**：若 $f$ 是整函数且 $|f(z)| \leq M|z|^k$（$|z|$ 充分大），则 $f$ 是次数不超过 $k$ 的多项式。

证明：Cauchy 估计给出 $|a_n| \leq MR^k/R^n = M/R^{n-k}$。当 $n > k$，$R \to \infty$ 时 $|a_n| \to 0$，所以 $a_n = 0$。

**应用**：若整函数 $f$ 满足 $|f(z)| \leq A + B|z|^3$，则 $f(z) = a_0 + a_1 z + a_2 z^2 + a_3 z^3$（三次多项式）。

这个推广是复分析中判断整函数类型的基本工具。

</details>

## 8. 下一站

Liouville 说有界整函数是常数。最大模原理更进一步：解析函数的模不能在内部取到最大值——最大值一定在边界。

→ [最大模原理](./75-maximum-modulus.md)
