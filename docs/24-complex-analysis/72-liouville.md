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

### 实验 1（viz）：R 越大，圆盘上的上界掉得越快

拖 M，看 $M/R^n$ 这条上界随半径怎么塌下去；$n\ge1$ 时它一路奔向 0——这就是「有界整函数的非零次系数必须为零」的算术现场。

```viz
{ "type": "plot", "xmin": 1, "xmax": 50, "expr": "M/x", "expr2": "M/x^2", "label": "n=1: M/R", "label2": "n=2: M/R²", "sliders": [{ "name": "M", "min": 1, "max": 50, "step": 1, "value": 10 }] }
```

两条曲线分别是 $M/R$ 和 $M/R^2$（默认 $M=10$）。$R=1$ 时两者都等于 $M$；$R=50$ 时已掉到 $0.2$ 和 $0.004$。拖 $M$ 只会把整条曲线整体抬高，**改变不了「$R\to\infty$ 时趋于 0」这件事**——因为分母是 $R^n$，分子只是个常数。而如果 $f$ 无界（比如 $e^z$），$M$ 本身就随 $R$ 涨，这条上界就失效了，Liouville 的前提也就不成立。

### 实验 2：整函数的有界性检验

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

### 实验 3：Cauchy 估计可视化

```python title="|a_n| ≤ M/R^n 随 R 增大趋向 0"
import math                     # factorial 只在 math 里，NumPy 2 已移除 np.math
import matplotlib.pyplot as plt
import numpy as np

M = 10                          # |f| 的上界
Rs = np.linspace(1, 50, 200)

plt.figure(figsize=(8, 4))
for n in [1, 2, 5, 10]:
    bound = M * math.factorial(n) / Rs**n   # factorial 来自 math；np.math 在 NumPy 2 已移除
    plt.semilogy(Rs, bound, label=f"n={n}")

plt.xlabel("R（圆盘半径）")
plt.ylabel("|aₙ| 的上界（对数刻度）")
plt.title("Cauchy 估计：|aₙ| ≤ n!·M / R^n")
plt.legend()
plt.grid(True)
```

对每个 $n \geq 1$，当 $R \to \infty$ 时上界趋向 0——所以 $a_n = 0$。

### 实验 4：$1/p(z)$ 的有界性

```python title="圆周上的最大值：精确值 vs 数值"
import numpy as np

# 目标：看清「1/p 为什么会趋于 0」，以及「为什么必须先假定 p 没有零点」。
# 取 p(z) = z^2 + 1，零点在 ±i（模长 1）。
# 关键：把观测范围取成**圆周 |z|=R**（不是整个圆盘）。
#   圆周上只要 R>1 就碰不到零点，|1/p| 才有资格谈"最大值"。
#   若取圆盘 |z|<=R（R>1），盘里就含着极点，max|1/p| 恒为 +∞，什么都看不出来。

Rs = [2, 4, 8, 16]
print("R      数值max|1/p|(圆周)   精确 1/(R²-1)")
for R in Rs:
    th = np.linspace(0, 2 * np.pi, 20000)   # 圆周上密采样
    Z = R * (np.cos(th) + 1j * np.sin(th))
    P = Z ** 2 + 1
    val = np.max(1.0 / np.abs(P))
    exact = 1.0 / (R * R - 1)               # 极**值**在 z=±iR 处取到（注意不是"极点"：p 的零点在 ±i）
    print(str(R).ljust(6), f"{val:.6f}".ljust(22), f"{exact:.6f}")

print()
print("圆盘 |z|<=R 里的 max|1/p|：R>1 时恒为 +inf（盘内含极点 z=±i）")
```

$R$ 越大，$|1/p(z)|$ 在圆周上的最大值越小，且精确等于 $\dfrac{1}{R^2-1}$——$R=2,4,8,16$ 时是 $0.333,0.0667,0.0159,0.0039$，一路趋向 $0$。

**为什么一定要走圆周而不是圆盘**：$p(z)=z^2+1$ 的零点在 $\pm i$，模长是 $1$。所以任何 $|z|\le R$（$R>1$）的**圆盘都含着极点**，$1/p$ 在盘里根本无界——这正是原版这段代码的病：它在圆盘里取 max，$R=1$ 那格恰好没踩到极点、$R=5$ 那格踩到了，于是"最大值"随 $R$ 变大而变大，与课文要讲的结论相反。换到圆周上，$R>1$ 时圆周永远碰不到 $\pm i$，最大值才存在、才有意义。

这件事恰好就是 Liouville 定理的门口：定理要求 $f$ **整**（处处有定义）且**有界**。$1/p$ 只有在 $p$ 没有零点时才是整函数；一旦 $p$ 有零点，$1/p$ 就连"有界"都谈不上。证明代数基本定理正是这么走的——**假设** $p$ 没有零点，则 $1/p$ 是整函数，而在大圆周上 $|1/p|\to0$ 给出有界，于是 $1/p$ 是常数，矛盾。

:::warning[常见误区]

**误区一**：你以为「有界」是看实部或某个方向。Liouville 要的是 $|f(z)|$ 在整个复平面上被同一个 $M$ 压住——只沿实轴有界完全不够。$\sin z$ 在实轴上恰好被 1 压住（$\sin 10=-0.544$，绝对值 $0.544$，全程 $\le 1$），可它在虚轴上是双曲正弦：$\sin(10i)=11013.2\,i$，模长 11013.2。它就是整函数、实轴有界、全平面无界。

**误区二**：你以为 $e^z$ 是「反例」，所以 Liouville 定理错了。定理是条件命题：「整 + 有界 ⟹ 常数」。$e^{20}=4.85\times10^8$、$e^{10}=22026$，它偏偏是无界的那一类，前提根本不满足。

**误区三**：你以为系数 $a_n\to 0$ 靠的是「$n!$ 长得慢」。Cauchy 估计里分子是 $n!$，分母是 $R^n$。固定 $n$ 时 $n!$ 是常数，$R\to\infty$ 时 $R^n$ 碾压它，上界才归零；反过来对固定 $R$ 让 $n$ 变大，$n!/R^n$ 会先降到谷底再爆炸（$R=10$ 时谷底在 $n=9$，$n!/10^n\approx 0.0004$；到 $n=20$ 又涨回 $0.024$，$R=3$ 时更夸张：$n=2$ 处 $0.222$，$n=20$ 处 $6.98\times10^8$）——所以这条论证的正确用法是「对每个 $n$，让 $R$ 跑掉」，不是「让 $n$ 跑掉」。

:::

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
# @title: Liouville 推广的数值验证
# @check: c = (0.8+0.2j): 满足 |c|<=1: True
# @check: c = (1+0j): 满足 |c|<=1: True
# @check: c = (1.5+0j): 满足 |c|<=1: False
# @hint: |f(z)| ≤ |z| 处处成立，等价于 |c·z|/|z| = |c| 不超过 1。检查三个候选 c，哪一个越界了？
import numpy as np

# 三个候选常数 c：前两个满足 |c| ≤ 1，第三个不满足
zs = np.array([1+0j, 1j, 2-1j, -3+4j, 0.5+0.5j])   # 5 个采样点，含实轴与虚轴方向
candidates = [0.8 + 0.2j, 1.0 + 0j, 1.5 + 0j]

for c in candidates:
    # |f(z)|/|z| 恒等于 |c|，与 z 无关 —— 这正是「有界 → 常数」的关键
    ratio = np.abs(c * zs) / np.abs(zs)**2   # ← 问题在这：分母该是一次的还是平方？
    ok = ratio.max() <= 1 + 1e-12
    print(f"c = {c}: 满足 |c|<=1: {ok}")
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
