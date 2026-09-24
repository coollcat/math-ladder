---
title: Gamma 分布与 Beta 分布
lesson_id: probability-advanced/gamma-beta
prereqs:
  - probability-advanced/discrete-distributions
volume: 4
layer: L6
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import:
  - scipy
introduces_concepts:
  - gamma-function
  - gamma-distribution
  - beta-distribution
  - chi-squared-distribution
  - conjugate-prior
applications:
  - bayesian-statistics
  - reliability-engineering
  - survival-analysis
exits:
  - research
---

# Gamma 分布与 Beta 分布

## 1. 从一个场景开始

一家客服中心记录每个来电的等待时间。单次等待服从指数分布，但经理更关心"今天前 10 个来电总共等了多久"——多个指数分布之和是什么分布？

答案是 Gamma 分布。它和 Beta 分布一起，构成了连续概率论中最重要的两个分布家族。

## 2. 直觉解释

Gamma 分布是"等到第 $k$ 件事发生要多久"的模型。如果每次事件之间的等待时间独立且服从指数分布，那么总共等 $k$ 次的总时间就服从 Gamma 分布。

- $k=1$ 时退化为指数分布；
- $k$ 越大，分布越往右移、越对称（中心极限定理的效果）；
- $k$ 为整数时叫 Erlang 分布，是排队论的基石。

Beta 分布则是"概率的概率"。如果你要估计一枚硬币正面朝上的概率 $p$，在看到数据之前，$p$ 本身可以有分布。Beta 分布定义在 $[0,1]$ 上，天然适合建模概率、比例、百分比。

两者之间有优美的共轭关系：Beta 分布是二项分布的共轭先验，Gamma 分布是泊松分布的共轭先验。

## 3. 正式定义

**Gamma 函数**：

$$\Gamma(\alpha)=\int_0^{\infty}t^{\alpha-1}e^{-t}\,dt,\quad \alpha>0$$

性质：$\Gamma(n)=(n-1)!$（正整数时），$\Gamma(1/2)=\sqrt{\pi}$，$\Gamma(\alpha+1)=\alpha\Gamma(\alpha)$。

**Gamma 分布** $\text{Gamma}(\alpha,\beta)$：密度函数

$$f(x)=\frac{\beta^{\alpha}}{\Gamma(\alpha)}x^{\alpha-1}e^{-\beta x},\quad x>0$$

其中 $\alpha>0$ 是形状参数，$\beta>0$ 是速率参数。

$$E[X]=\frac{\alpha}{\beta},\quad \text{Var}(X)=\frac{\alpha}{\beta^2}$$

**卡方分布** $\chi^2(k)$：是 $\text{Gamma}(k/2,1/2)$ 的特例，即 $k$ 个独立标准正态变量的平方和。

**Beta 分布** $\text{Beta}(a,b)$：密度函数

$$f(x)=\frac{\Gamma(a+b)}{\Gamma(a)\Gamma(b)}x^{a-1}(1-x)^{b-1},\quad 0<x<1$$

$$E[X]=\frac{a}{a+b},\quad \text{Var}(X)=\frac{ab}{(a+b)^2(a+b+1)}$$

| 分布 | 定义域 | 参数 | 典型用途 |
| --- | --- | --- | --- |
| Gamma$(\alpha,\beta)$ | $(0,\infty)$ | 形状、速率 | 等待时间、保险理赔 |
| $\chi^2(k)$ | $(0,\infty)$ | 自由度 $k$ | 假设检验、方差估计 |
| Beta$(a,b)$ | $(0,1)$ | 形状 $a,b$ | 比例估计、贝叶斯先验 |

## 4. 分步例题

**例 1**：$X\sim\text{Gamma}(3,2)$，求 $E[X]$ 和 $\text{Var}(X)$。

1. $E[X]=\alpha/\beta=3/2=1.5$；
2. $\text{Var}(X)=\alpha/\beta^2=3/4=0.75$；
3. 标准差 $\sigma=\sqrt{0.75}\approx0.866$。

**例 2**：$Y\sim\text{Beta}(2,5)$，求 $E[Y]$。

1. $E[Y]=a/(a+b)=2/7\approx0.286$；
2. $\text{Var}(Y)=(2\times5)/(7^2\times8)=10/392\approx0.0255$；
3. 分布左偏：众数 $=(a-1)/(a+b-2)=1/5=0.2$，小于均值。

## 5. 动手实验

### 实验 1（python）：Gamma 分布族的形状

```python title="不同 alpha 和 beta 下的 Gamma 密度"
import numpy as np  # 数值计算库
import matplotlib.pyplot as plt
from scipy.stats import gamma  # scipy.stats：统计分布工具箱

x = np.linspace(0.01, 10, 500)  # linspace：在区间内均匀取 500 个点

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

# 固定 beta=1，变 alpha
for a in [1, 2, 3, 5, 9]:
    axes[0].plot(x, gamma.pdf(x, a, scale=1), label=f"α={a}")  # pdf：概率密度函数
axes[0].set_title("Gamma 分布 (β=1)")
axes[0].legend()

# 固定 alpha=2，变 beta
for b in [0.5, 1, 2, 5]:
    axes[1].plot(x, gamma.pdf(x, 2, scale=1/b), label=f"β={b}")  # scale=1/β 是 scipy 的参数化
axes[1].set_title("Gamma 分布 (α=2)")
axes[1].legend()

plt.tight_layout()
```

$\alpha=1$ 时是指数分布（单调递减）；$\alpha$ 增大后逐渐变成钟形。

### 实验 2（python）：Beta 分布族的形状

```python title="Beta 分布：从 U 形到钟形"
from scipy.stats import beta

x = np.linspace(0.001, 0.999, 500)

params = [(0.5, 0.5), (1, 1), (2, 5), (5, 2), (2, 2)]
for a, b in params:
    plt.plot(x, beta.pdf(x, a, b), label=f"Beta({a},{b})")

plt.title("Beta 分布族")
plt.legend()
plt.xlabel("x")
plt.ylabel("密度")
```

$a=b=1$ 是均匀分布；$a<1,b<1$ 是 U 形（两端高）；$a>1,b>1$ 是钟形。

### 实验 3（python）：卡方分布与 Gamma 的关系

```python title="χ²(k) = Gamma(k/2, 1/2)"
from scipy.stats import chi2

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

# 卡方分布
for k in [1, 2, 4, 8, 16]:
    axes[0].plot(x, chi2.pdf(x, k), label=f"k={k}")  # chi2.pdf：卡方密度
axes[0].set_title("χ² 分布")
axes[0].legend()
axes[0].set_xlim(0, 25)

# 用 Gamma 验证：Gamma(k/2, 1/2) 应该和 chi2(k) 一样
k_test = 4
axes[1].plot(x, chi2.pdf(x, k_test), "b-", label=f"χ²({k_test})", linewidth=3)
axes[1].plot(x, gamma.pdf(x, k_test/2, scale=2), "r--", label=f"Gamma({k_test/2}, 0.5)", linewidth=2)
axes[1].set_title("卡方 = Gamma 的特例")
axes[1].legend()

plt.tight_layout()
```

两条曲线完全重合——卡方分布就是 Gamma 分布的特例。

### 实验 4（python）：共轭先验演示

```python title="Beta 先验 + 二项数据 → Beta 后验"
from scipy.stats import beta as beta_dist

# 先验：Beta(2, 2)（轻微偏好 0.5 附近的 p）
a_prior, b_prior = 2, 2

# 观测数据：10 次抛硬币，7 次正面
heads, tails = 7, 3

# 后验：Beta(a+heads, b+tails)
a_post = a_prior + heads
b_post = b_prior + tails

x = np.linspace(0.001, 0.999, 500)
plt.plot(x, beta_dist.pdf(x, a_prior, b_prior), "b--", label=f"先验 Beta({a_prior},{b_prior})")
plt.plot(x, beta_dist.pdf(x, a_post, b_post), "r-", label=f"后验 Beta({a_post},{b_post})")
plt.title("共轭更新：Beta 是二项的共轭先验")
plt.legend()
```

先验偏中间，数据偏正面，后验峰值右移——贝叶斯更新的几何图像。

### 实验 5：Gamma/Beta 密度曲线族

```viz
{
  "type": "plot",
  "title": "Gamma 分布密度曲线",
  "expr": "(b^a / gamma(a)) * x^(a-1) * exp(-b*x)",
  "xmin": 0.01,
  "xmax": 15,
  "ymin": 0,
  "ymax": 1,
  "sliders": [
    {"name": "a", "min": 0.5, "max": 10, "step": 0.5, "value": 2},
    {"name": "b", "min": 0.5, "max": 5, "step": 0.5, "value": 1}
  ]
}
```

拖动形状参数 a 和速率参数 b，观察 Gamma 密度曲线如何从指数分布（a=1）变为钟形。a 越大越对称，b 越大越集中。

:::warning[常见误区]

**你以为 Gamma 分布只有整数形状参数。** 其实 $\alpha$ 可以是任意正实数，只是整数时有"第 $k$ 次事件"的直觉。

**你以为卡方分布和 Gamma 分布是两个不同的东西。** 其实 $\chi^2(k)=\text{Gamma}(k/2,1/2)$，卡方只是 Gamma 的特例。

**你以为 Beta 分布只用于贝叶斯。** 它也广泛用于建模比例、百分比、评分分布等任何定义在 $[0,1]$ 上的随机变量。

:::

## 6. 练习

```exercise
# @title: 练习：计算 Gamma 和 Beta 分布的均值
# @check: Gamma mean: 2.5
# @check: Beta mean: 0.4
# @hint: Gamma 均值 = alpha/beta，Beta 均值 = a/(a+b)
from scipy.stats import gamma, beta

# Gamma(5, 2) 的均值
alpha, beta_rate = 5, 2
gamma_mean = alpha / beta_rate  # ← 检查公式是否正确

# Beta(2, 3) 的均值
a, b = 2, 3
beta_mean = a / (a + b)  # ← 检查公式是否正确

print(f"Gamma mean: {gamma_mean}")
print(f"Beta mean: {beta_mean}")
```

```quiz
Beta(1, 1) 是什么分布？
- 指数分布
- 均匀分布 [*]
- 正态分布
? Beta(1,1) 的密度 f(x)=1，x∈(0,1)，正是均匀分布 U(0,1)。
```

```quiz
二项分布的共轭先验是什么？
- 正态分布
- Gamma 分布
- Beta 分布 [*]
? Beta 分布是二项分布的共轭先验：先验 Beta(a,b) + 数据 Bin(n,p) → 后验 Beta(a+成功数, b+失败数)。
```

## 7. 选读：Gamma 函数的解析延拓

<details>
<summary>选读 · 阶乘的连续版本</summary>

$\Gamma(n)=(n-1)!$ 把阶乘从正整数延拓到了所有正实数甚至复数。$\Gamma$ 函数满足函数方程 $\Gamma(z+1)=z\Gamma(z)$，这是阶乘递推 $n!=n\cdot(n-1)!$ 的连续推广。

斯特林公式 $\Gamma(z)\approx\sqrt{2\pi/z}(z/e)^z$ 在 $z$ 大时给出精确近似。$\Gamma(1/2)=\sqrt{\pi}$ 则连接了阶乘与圆周率——这个意外的联系来自高斯积分 $\int_{-\infty}^{\infty}e^{-x^2}dx=\sqrt{\pi}$。

</details>

## 8. 下一站

有了具体的分布族，下一步需要一套通用工具来衡量"尾部有多薄"。下一课学习概率不等式：Markov、Chebyshev、Chernoff、Hoeffding，它们是集中不等式的核心。

→ [概率不等式](./68-inequalities.md)
