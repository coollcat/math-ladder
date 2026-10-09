---
title: 概率不等式
lesson_id: probability-advanced/inequalities
prereqs:
  - probability-advanced/characteristic-function
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
  - markov-inequality
  - chebyshev-inequality
  - chernoff-bound
  - hoeffding-inequality
  - concentration-inequality
applications:
  - statistical-learning-theory
  - algorithm-analysis
  - signal-processing
exits:
  - research
---

# 概率不等式

## 1. 从一个场景开始

一台服务器平均每小时处理 100 个请求。运维工程师想知道："处理量超过 200 的概率有多大？"没有完整的分布信息，只知均值——能回答吗？

Markov 不等式说：能，虽然答案可能很粗糙。而 Chebyshev、Chernoff、Hoeffding 则层层收紧，给出越来越精确的尾部界。

## 2. 直觉解释

概率不等式的核心思想：**不需要知道分布的全部细节，只需要知道某些汇总统计量（均值、方差等），就能给出尾部概率的上界。**

想象一个装满水的容器。你知道总水量（期望）和容器的宽度（方差）。即使不知道容器的精确形状，你也能推断：水位不太可能在某处特别高——因为那需要其他地方特别低来补偿。

从 Markov 到 Hoeffding，不等式越来越精确，但需要的前提条件也越来越强。

## 3. 正式定义

**Markov 不等式**：对非负随机变量 $X$ 和 $a>0$，

$$P(X\ge a)\le\frac{E[X]}{a}$$

只需知道 $E[X]$，无需分布信息。

**Chebyshev 不等式**：对任意随机变量 $X$ 和 $k>0$，

$$P(|X-\mu|\ge k\sigma)\le\frac{1}{k^2}$$

其中 $\mu=E[X]$，$\sigma^2=\text{Var}(X)$。由 Markov 应用于 $(X-\mu)^2$ 推出。

**Chernoff 界**：对独立的 $[0,1]$ 值随机变量之和 $S_n=\sum X_i$，

$$P(S_n\ge(1+\delta)\mu)\le\left(\frac{e^\delta}{(1+\delta)^{1+\delta}}\right)^\mu,\quad\delta>0$$

利用矩母函数的指数衰减，尾部比 Chebyshev 紧得多。

**Hoeffding 不等式**：若 $X_1,\ldots,X_n$ 独立且 $a_i\le X_i\le b_i$，则

$$P\left(\bar{X}-E[\bar{X}]\ge t\right)\le\exp\left(-\frac{2n^2t^2}{\sum(b_i-a_i)^2}\right)$$

指数衰减，只依赖取值范围，不依赖分布形状。

| 不等式 | 需要的信息 | 尾部衰减 |
| --- | --- | --- |
| Markov | 期望 | $O(1/a)$ |
| Chebyshev | 期望 + 方差 | $O(1/k^2)$ |
| Chernoff | 独立 + 有界（$[0,1]$ 值） | 指数衰减 |
| Hoeffding | 独立 + 有界 | 指数衰减 |

## 4. 分步例题

**例 1**（Markov）：$E[X]=10$，求 $P(X\ge100)$ 的上界。

1. $X\ge0$，$a=100$；
2. $P(X\ge100)\le E[X]/100=10/100=0.1$；
3. 即使不知道分布，也能保证"超过 100"的概率不超过 10%。

**例 2**（Chebyshev）：$E[X]=50$，$\text{Var}(X)=25$，求 $P(|X-50|\ge15)$。

1. $\sigma=5$，$k=15/5=3$；
2. $P(|X-50|\ge15)\le1/9\approx0.111$；
3. 约 89% 的概率落在 $[35,65]$ 内。

## 5. 动手实验

### 实验 1（python）：模拟验证不等式

```python title="Markov 与 Chebyshev 的实际表现"
import numpy as np  # numpy 已在第 18 章登场；np 是约定短名

np.random.seed(42)  # 固定随机种子，结果可复现
n_samples = 100000

# 用指数分布验证（均值=1/beta_rate）
beta_rate = 0.5  # 均值 = 2
samples = np.random.exponential(1/beta_rate, n_samples)  # 指数分布采样

mu = 2.0  # 期望
a = 10.0

# 实际概率
actual_prob = np.mean(samples >= a)  # np.mean 对布尔数组计算 True 的比例
markov_bound = mu / a

print(f"实际 P(X>={a}): {actual_prob:.4f}")
print(f"Markov 上界: {markov_bound:.4f}")
```

Markov 上界远大于实际概率——因为它是最松的界。

### 实验 2（python）：Chebyshev vs 实际

```python title="正态分布下的 Chebyshev 界"
from scipy.stats import norm  # scipy.stats：统计分布工具箱

mu, sigma = 100, 15
k_values = [1, 2, 3, 4]

print("k  | Chebyshev 界 | 实际概率(正态)")
print("---|-------------|----------------")
for k in k_values:
    cheby_bound = 1 / k**2
    # 正态分布的实际概率
    actual = 2 * (1 - norm.cdf(k))  # cdf：累积分布函数，P(X>μ+kσ) = 1-cdf(k)
    print(f"{k}  | {cheby_bound:.4f}        | {actual:.6f}")
```

正态分布下，Chebyshev 界比实际概率大很多——但它的威力在于不依赖正态假设。

### 实验 3（python）：Hoeffding 界与实际模拟

```python title="Bernoulli 平均的集中性"
import numpy as np
from scipy.stats import bernoulli

n = 100  # 样本量
p = 0.5  # 真实概率
t = 0.1  # 偏差阈值

# Hoeffding 界：P(X_bar - p >= t) <= exp(-2nt^2)
hoeffding_bound = np.exp(-2 * n * t**2)

# 模拟
n_trials = 50000
exceeds = 0
for _ in range(n_trials):
    samples = bernoulli.rvs(p, size=n)  # bernoulli.rvs：生成伯努利样本
    # 按“正面向上的次数”比阈值：0.6-0.5 在浮点里小于 0.1，直接用 mean-p>=t 会漏掉正好 60 个正面的样本
    if samples.sum() >= n * (p + t):
        exceeds += 1

actual_prob = exceeds / n_trials

print(f"Hoeffding 界: {hoeffding_bound:.6f}")
print(f"模拟实际概率: {actual_prob:.6f}")
```

Hoeffding 界给出指数级小的上界，模拟验证它确实包住了实际概率。

### 实验 4（viz）：不等式比较

```viz
{
  "type": "plot",
  "title": "尾部上界对比",
  "expr": "1/x",
  "xmin": 1, "xmax": 10,
  "sliders": []
}
```

$1/x$ 曲线展示了 Markov 界的 $O(1/a)$ 衰减——缓慢而通用。Chebyshev 的 $1/k^2$ 衰减更快，Chernoff/Hoeffding 的指数衰减则快得多。

:::warning[常见误区]

**你以为 Chebyshev 不等式给出精确概率。** 其实它只给出上界，实际概率通常远小于界值。

**你以为 Hoeffding 不等式适用于所有分布。** 其实它要求随机变量有界（$a_i\le X_i\le b_i$）。无界分布需要其他集中不等式。

**你以为集中不等式只是理论工具。** 它们是机器学习泛化界、A/B 测试功效分析、随机算法正确性证明的核心工具。

:::

## 6. 练习

```exercise
# @title: 练习：用 Chebyshev 不等式计算概率上界
# @check: Chebyshev bound for k=2: 0.2500
# @check: Chebyshev bound for k=3: 0.1111
# @hint: P(|X-mu|>=k*sigma) <= 1/k^2
# 计算 Chebyshev 不等式的上界
for k in [2, 3]:
    bound = 1 / k      # ← 上界写成 1/k，漏了 k 的平方
    print(f"Chebyshev bound for k={k}: {bound:.4f}")
```

```quiz
Markov 不等式需要什么前提条件？
- 需要知道完整的概率分布
- 只需要随机变量非负且知道期望 [*]
- 需要知道均值和方差
? Markov 不等式只要求 X>=0 且 E[X] 存在。它是最弱但也最通用的尾部界。
```

```quiz
Hoeffding 不等式的尾部衰减是什么类型？
- 多项式衰减 (1/k^2)
- 指数衰减 [*]
- 对数衰减
? Hoeffding 不等式给出 exp(-2nt^2) 的界，是指数衰减。这比 Chebyshev 的多项式衰减快得多。
```

## 7. 选读：从 Hoeffding 到泛化界

<details>
<summary>选读 · 机器学习中的集中不等式</summary>

机器学习的核心问题是：训练误差低，真实误差也低吗？这需要泛化界，而泛化界的推导直接依赖集中不等式。

假设训练集大小为 $n$，假设空间大小为 $|\mathcal{H}|$，则对任意假设 $h$，Hoeffding 给出

$$P(|\text{训练误差}-\text{真实误差}|\ge t)\le2\exp(-2nt^2).$$

对有限假设空间，用并界（union bound）扩展到所有假设：

$$P(\exists h\in\mathcal{H}:|\hat{R}(h)-R(h)|\ge t)\le2|\mathcal{H}|\exp(-2nt^2).$$

这就是"样本量 $n$ 足够大时，所有假设的经验风险都接近真实风险"的数学保证。VC 维理论则把这一思路推广到了无限假设空间。

</details>

## 8. 下一站

概率不等式帮我们在理论上控制误差。下一课回到实验现场：当你只有小样本时，如何用 t 检验判断两组数据是否有显著差异？

→ [t 检验](../38-statistical-inference/25-t-test.md)
