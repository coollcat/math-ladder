---
title: 矩估计
lesson_id: statistical-inference/method-of-moments
prereqs:
  - statistical-inference/mle
volume: 4
layer: L7
track:
  - probability-statistics
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import:
  - scipy
introduces_concepts:
  - method-of-moments
  - sample-moment
  - population-moment
applications:
  - parameter-estimation
  - moment-matching
  - simulation
exits:
  - research
---

# 矩估计

## 1. 从一个场景开始

你有一组数据，怀疑它来自某个分布（比如正态分布），但不知道参数。MLE 需要解优化问题，有时很复杂。有没有更简单的方法？

矩估计（Method of Moments, MoM）的想法朴素到极致：**让样本矩等于总体矩，解出参数。** 一阶矩对应均值，二阶矩对应方差——联立方程就能求参数。

## 2. 直觉解释

总体分布有某些"特征数字"（矩），比如均值、方差。样本也有对应的"特征数字"（样本矩）。

矩估计的逻辑：如果样本来自总体，那么样本的均值应该"接近"总体的均值。把"接近"换成"相等"，就得到方程。

对于一个未知参数，用一阶矩就够了。两个未知参数，用一阶和二阶矩联立。$k$ 个参数，用前 $k$ 个矩。

## 3. 正式定义

**总体 $r$ 阶矩**：

$$\mu_r = E[X^r]$$

**样本 $r$ 阶矩**：

$$m_r = \frac{1}{n}\sum_{i=1}^n X_i^r$$

**矩估计法**：设总体分布含 $k$ 个未知参数 $\theta_1,\ldots,\theta_k$。令前 $k$ 个总体矩等于对应的样本矩：

$$\mu_r(\theta_1,\ldots,\theta_k) = m_r, \quad r=1,2,\ldots,k$$

解出 $\hat{\theta}_1,\ldots,\hat{\theta}_k$ 即为矩估计量。

| 概念 | 含义 |
| --- | --- |
| $\mu_r$ | 总体 $r$ 阶矩 $=E[X^r]$ |
| $m_r$ | 样本 $r$ 阶矩 $=\frac{1}{n}\sum X_i^r$ |
| 中心矩 | $E[(X-\mu)^r]$，如方差是二阶中心矩 |

## 4. 分步例题

**例 1**：$X\sim\text{Poisson}(\lambda)$，求 $\lambda$ 的矩估计。

1. 总体一阶矩：$E[X]=\lambda$；
2. 样本一阶矩：$m_1=\bar{X}$；
3. 令 $\lambda=\bar{X}$；
4. 矩估计量 $\hat{\lambda}=\bar{X}$。

**例 2**：$X\sim N(\mu,\sigma^2)$，求 $\mu,\sigma^2$ 的矩估计。

1. 总体一阶矩：$E[X]=\mu$；
2. 总体二阶矩：$E[X^2]=\text{Var}(X)+(E[X])^2=\sigma^2+\mu^2$；
3. 令 $\mu=m_1=\bar{X}$；
4. 令 $\sigma^2+\mu^2=m_2=\frac{1}{n}\sum X_i^2$；
5. 解得 $\hat{\mu}=\bar{X}$，$\hat{\sigma}^2=\frac{1}{n}\sum X_i^2-\bar{X}^2=\frac{1}{n}\sum(X_i-\bar{X})^2$。

注意：矩估计的 $\hat{\sigma}^2$ 分母是 $n$ 而非 $n-1$，是有偏的。MLE 也是如此。

**例 3**：$X\sim\text{Uniform}(0,\theta)$，求 $\theta$ 的矩估计。

1. $E[X]=\theta/2$；
2. 令 $\theta/2=\bar{X}$；
3. $\hat{\theta}=2\bar{X}$。

## 5. 动手实验

### 实验 1（python）：正态分布的矩估计

```python title="用样本矩估计正态参数"
import numpy as np

np.random.seed(42)
# 真实参数
true_mu, true_sigma = 5.0, 2.0
n = 100

# 生成样本
sample = np.random.normal(true_mu, true_sigma, n)  # 正态采样

# 矩估计
mu_hat = np.mean(sample)  # 一阶矩 = 样本均值
sigma2_hat = np.mean((sample - mu_hat)**2)  # 二阶中心矩（分母为 n）

print(f"真实 μ = {true_mu}")
print(f"矩估计 μ = {mu_hat:.3f}")
print(f"真实 σ² = {true_sigma**2}")
print(f"矩估计 σ² = {sigma2_hat:.3f}")
```

### 实验 2（python）：矩估计 vs MLE 对比

```python title="均匀分布的矩估计与 MLE"
from scipy.optimize import minimize_scalar

np.random.seed(42)
true_theta = 10.0
n = 30
sample = np.random.uniform(0, true_theta, n)  # 均匀分布采样

# 矩估计
theta_mom = 2 * np.mean(sample)

# MLE（均匀分布的 MLE 是最大观测值）
theta_mle = np.max(sample)

# 对比
print(f"真实 θ = {true_theta}")
print(f"矩估计 θ = {theta_mom:.3f}")
print(f"MLE θ = {theta_mle:.3f}")
print(f"|矩估计 - 真实| = {abs(theta_mom - true_theta):.3f}")
print(f"|MLE - 真实| = {abs(theta_mle - true_theta):.3f}")
```

均匀分布的 MLE 是最大观测值（总是低估），矩估计是 $2\bar{X}$（可能高估也可能低估）。两者各有优劣。

### 实验 3（python）：矩估计的渐近性质

```python title="增大样本量，矩估计收敛"
import matplotlib.pyplot as plt

np.random.seed(42)
true_mu = 5.0
sample_sizes = [10, 20, 50, 100, 200, 500, 1000]

estimates = []
for n in sample_sizes:
    sample = np.random.normal(true_mu, 2.0, n)
    estimates.append(np.mean(sample))

plt.plot(sample_sizes, estimates, "bo-", label="矩估计")
plt.axhline(true_mu, color="r", linestyle="--", label=f"真实值 {true_mu}")
plt.xlabel("样本量")
plt.ylabel("估计值")
plt.title("矩估计随样本量收敛到真实值")
plt.legend()
```

样本量越大，估计越精确——这就是大数定律的效果。

### 实验 4（python）：Gamma 分布的矩估计

```python title="Gamma 分布：两个参数，两个矩"
from scipy.stats import gamma

np.random.seed(42)
true_alpha, true_beta = 3.0, 1.5  # 形状和速率
n = 200
sample = gamma.rvs(true_alpha, scale=1/true_beta, size=n)  # Gamma 采样

# 矩估计
# E[X] = α/β, E[X²] = α(α+1)/β²
m1 = np.mean(sample)  # 样本一阶矩
m2 = np.mean(sample**2)  # 样本二阶矩

# 解方程：m1 = α/β, m2 = α(α+1)/β²
# 从第一式 β = α/m1，代入第二式
# m2 = α(α+1)/(α/m1)² = m1²(α+1)/α
# m2*α = m1²*α + m1²
# α(m2 - m1²) = m1²
# α = m1² / (m2 - m1²) = m1² / var_hat
var_hat = m2 - m1**2
alpha_hat = m1**2 / var_hat
beta_hat = alpha_hat / m1

print(f"真实 α={true_alpha}, β={true_beta}")
print(f"矩估计 α={alpha_hat:.3f}, β={beta_hat:.3f}")
```

### 实验 5：矩匹配过程

```viz
{
  "type": "plot",
  "title": "矩估计：样本矩逼近总体矩",
  "expr": "(1/sqrt(2*pi*s*s))*exp(-(x-m)*(x-m)/(2*s*s))",
  "xmin": -5,
  "xmax": 15,
  "ymin": 0,
  "ymax": 0.5,
  "sliders": [
    {"name": "m", "min": 0, "max": 10, "step": 0.5, "value": 5},
    {"name": "s", "min": 0.5, "max": 4, "step": 0.1, "value": 2}
  ]
}
```

拖动滑块 m（均值）和 s（标准差），观察正态密度曲线的变化。矩估计的思路就是：用样本均值匹配 m，用样本方差匹配 s²，让理论曲线尽可能贴合数据。

:::warning[常见误区]

**你以为矩估计和 MLE 总是相同。** 它们只在指数族分布中通常一致（如正态、泊松）。在其他分布中可能给出不同的估计。

**你以为矩估计总是无偏的。** 矩估计通常是渐近无偏的（大样本下趋于无偏），但在有限样本中可能有偏。

**你以为样本方差的分母一定是 $n-1$。** 矩估计用的二阶中心矩分母是 $n$（有偏估计）。$n-1$ 是无偏估计，来自不同的推导。

:::

## 6. 练习

```exercise
# @title: 练习：泊松分布的矩估计
# @check: sample mean: 4.850
# @check: lambda estimate: 4.850
# @hint: 泊松分布的 E[X]=λ，所以矩估计就是样本均值
import numpy as np

np.random.seed(42)
# 从 Poisson(5) 采样
sample = np.random.poisson(5, 100)  # 泊松采样：参数 5，100 个样本

# 矩估计
lambda_hat = np.mean(sample)  # ← 矩估计公式

print(f"sample mean: {np.mean(sample):.3f}")
print(f"lambda estimate: {lambda_hat:.3f}")
```

```quiz
矩估计的基本原理是什么？
- 最大化似然函数
- 让样本矩等于总体矩，解出参数 [*]
- 最小化均方误差
? 矩估计的思想是：样本矩是总体矩的无偏估计，令两者相等得到参数的估计方程。
```

```quiz
正态分布的矩估计 σ² 与无偏估计 σ² 的区别是什么？
- 完全相同
- 矩估计分母用 n，无偏估计分母用 n-1 [*]
- 矩估计分母用 n-1，无偏估计分母用 n
? 矩估计 σ² = (1/n)Σ(Xi-X̄)²，无偏估计 s² = (1/(n-1))Σ(Xi-X̄)²。区别仅在分母，大样本下差异可忽略。
```

## 7. 选读：广义矩估计

<details>
<summary>选读 · GMM：当矩比参数多</summary>

当可用的矩条件多于未知参数时（过度识别），无法精确满足所有方程。广义矩估计（GMM）通过最小化矩条件的加权平方和来处理：

$$\hat{\theta}=\arg\min_\theta\left(\frac{1}{n}\sum g(X_i,\theta)\right)^TW\left(\frac{1}{n}\sum g(X_i,\theta)\right)$$

GMM 在计量经济学中无处不在：工具变量估计、面板数据模型、资产定价检验都建立在 GMM 框架上。它的优势是只需要矩条件，不需要完整分布假设——这在经济数据中尤其重要，因为我们很少知道精确的分布形式。

</details>

## 8. 下一站

矩估计和 MLE 都是点估计——给出一个具体的数值。但估计有多可靠？下一课先立两条纪律：数据能不能无损压缩（充分性）、拒绝域能不能画到最优（Neyman-Pearson）。

→ [充分统计量与最优检验](./55-sufficiency-np.md)
