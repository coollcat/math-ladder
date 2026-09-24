---
title: t 检验
lesson_id: statistical-inference/t-test
prereqs:
  - statistical-inference/confidence-interval
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
  - t-distribution
  - one-sample-t-test
  - two-sample-t-test
  - paired-t-test
applications:
  - clinical-trials
  - ab-testing
  - quality-control
exits:
  - research
---

# t 检验

## 1. 从一个场景开始

一家药厂测试新药：20 名患者的平均血压下降了 5 mmHg。这个效果是真实的，还是随机波动？

如果总体方差已知，用 z 检验。但现实中我们几乎从不知道总体方差——需要用样本方差代替。问题是：样本方差本身有随机性，用它代替后，检验统计量不再服从正态分布。

W.S. Gosset（笔名 Student）在 1908 年解决了这个问题：统计量服从 **t 分布**。

## 2. 直觉解释

t 分布和正态分布长得很像：都是钟形、对称、以 0 为中心。区别在于尾部——t 分布的尾部更厚，因为样本方差的不确定性增加了极端值的概率。

自由度 $\nu$ 控制尾部厚度：
- $\nu=1$ 时尾部极厚（柯西分布）；
- $\nu$ 增大时逐渐靠近正态分布；
- $\nu\ge30$ 时与正态分布几乎无区别（经验法则）。

## 3. 正式定义

**t 分布**：若 $Z\sim N(0,1)$，$V\sim\chi^2(\nu)$ 且 $Z$ 与 $V$ 独立，则

$$T=\frac{Z}{\sqrt{V/\nu}}\sim t(\nu)$$

**单样本 t 检验**：检验 $H_0:\mu=\mu_0$。

$$t=\frac{\bar{X}-\mu_0}{S/\sqrt{n}}$$

其中 $\bar{X}$ 是样本均值，$S$ 是样本标准差，$n$ 是样本量。在 $H_0$ 下 $t\sim t(n-1)$。

**双样本 t 检验**：检验 $H_0:\mu_1=\mu_2$。

$$t=\frac{\bar{X}_1-\bar{X}_2}{\sqrt{S_1^2/n_1+S_2^2/n_2}}$$

自由度用 Welch 近似（不假设等方差）。

**配对 t 检验**：对同一对象的前后测量，检验差值 $D_i=X_{i,\text{后}}-X_{i,\text{前}}$ 的均值是否为 0。

$$t=\frac{\bar{D}}{S_D/\sqrt{n}}$$

| 检验类型 | 场景 | 自由度 |
| --- | --- | --- |
| 单样本 | 样本均值 vs 已知值 | $n-1$ |
| 双样本（等方差） | 两组均值比较 | $n_1+n_2-2$ |
| 双样本（Welch） | 两组均值，方差不等 | Welch 公式 |
| 配对 | 同一对象前后对比 | $n-1$ |

## 4. 分步例题

**例**：10 名学生考试前后的成绩如下，检验培训是否有效（$\alpha=0.05$）。

前：72, 68, 75, 80, 65, 70, 78, 69, 74, 71
后：78, 75, 80, 85, 70, 76, 82, 74, 79, 77

1. 计算差值 $D_i$：6, 7, 5, 5, 5, 6, 4, 5, 5, 6；
2. $\bar{D}=5.4$，$S_D=0.843$；
3. $t=5.4/(0.843/\sqrt{10})=5.4/0.267=20.25$；
4. 自由度 $\nu=9$，$p$ 值极小（$<0.001$）；
5. 拒绝 $H_0$，培训显著有效。

## 5. 动手实验

### 实验 1（python）：t 分布 vs 正态分布

```python title="不同自由度的 t 分布"
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import t, norm

x = np.linspace(-4, 4, 500)

plt.plot(x, norm.pdf(x), "k--", label="正态 N(0,1)", linewidth=2)  # norm.pdf：正态密度
for df in [1, 5, 10, 30]:
    plt.plot(x, t.pdf(x, df), label=f"t({df})")  # t.pdf：t 分布密度

plt.title("t 分布随自由度增大逼近正态")
plt.legend()
plt.ylim(0, 0.45)
```

自由度小的时候尾部明显更厚；$\nu=30$ 时已经与正态几乎重合。

### 实验 2（python）：单样本 t 检验

```python title="检验样本均值是否等于 70"
from scipy.stats import ttest_1samp

np.random.seed(42)
# 模拟：真实均值=73，标准差=8，样本量=15
sample = np.random.normal(73, 8, 15)  # 正态采样：均值 73，标准差 8，15 个样本

t_stat, p_value = ttest_1samp(sample, popmean=70)  # 检验 H0: μ=70
print(f"样本均值: {np.mean(sample):.2f}")
print(f"t 统计量: {t_stat:.3f}")
print(f"p 值: {p_value:.4f}")
print(f"在 α=0.05 下 {'拒绝' if p_value < 0.05 else '不拒绝'} H0")
```

### 实验 3（python）：双样本 t 检验

```python title="比较两组学生的成绩"
from scipy.stats import ttest_ind

np.random.seed(42)
group_a = np.random.normal(75, 10, 20)  # A 组：均值 75
group_b = np.random.normal(80, 10, 20)  # B 组：均值 80

t_stat, p_value = ttest_ind(group_a, group_b, equal_var=False)  # Welch 检验
print(f"A 组均值: {np.mean(group_a):.2f}")
print(f"B 组均值: {np.mean(group_b):.2f}")
print(f"t 统计量: {t_stat:.3f}")
print(f"p 值: {p_value:.4f}")
```

### 实验 4（python）：配对 t 检验

```python title="同一组学生培训前后对比"
from scipy.stats import ttest_rel

np.random.seed(42)
before = np.random.normal(70, 8, 12)
effect = np.random.normal(5, 3, 12)  # 平均提升 5 分
after = before + effect

t_stat, p_value = ttest_rel(after, before)  # 配对检验
print(f"平均提升: {np.mean(after - before):.2f}")
print(f"t 统计量: {t_stat:.3f}")
print(f"p 值: {p_value:.4f}")
```

### 实验 5：t 分布与正态分布对比

```viz
{
  "type": "plot",
  "title": "t 分布 vs 正态分布",
  "expr": "(gamma((df+1)/2)/(sqrt(df*pi)*gamma(df/2))) * (1 + x*x/df)^(-(df+1)/2)",
  "xmin": -5,
  "xmax": 5,
  "ymin": 0,
  "ymax": 0.45,
  "sliders": [
    {"name": "df", "min": 1, "max": 50, "step": 1, "value": 5}
  ]
}
```

拖动自由度 df 滑块，观察 t 分布如何从厚尾的柯西分布（df=1）逐渐逼近正态分布。df≥30 时两者几乎重合——这就是为什么大样本可以用 z 检验代替 t 检验。

:::warning[常见误区]

**你以为样本量小时可以用 z 检验。** 方差未知时必须用 t 检验，尤其 $n<30$ 时差异显著。

**你以为双样本 t 检验必须假设等方差。** Welch t 检验不假设等方差，是更安全的默认选择。

**你以为 p 值小于 0.05 就证明效应存在。** p 值只衡量"假设 $H_0$ 为真时，观测到如此极端数据的概率"，不直接证明备择假设。

:::

## 6. 练习

```exercise
# @title: 练习：计算单样本 t 统计量
# @check: t statistic: 3.162
# @check: p value: 0.0039
# @hint: t = (X_bar - mu0) / (s / sqrt(n))，然后用 scipy.stats.t.sf 或 ttest_1samp
import numpy as np
from scipy.stats import ttest_1samp

# 样本数据
data = [23, 25, 28, 24, 27, 26, 29, 22, 25, 28,
        24, 26, 27, 23, 25, 28, 26, 24, 27, 25]

# 检验 H0: mu = 22
t_stat, p_val = ttest_1samp(data, popmean=22)

print(f"t statistic: {t_stat:.3f}")
print(f"p value: {p_val:.4f}")
```

```quiz
t 分布与正态分布的主要区别是什么？
- t 分布是离散的
- t 分布的尾部更厚 [*]
- t 分布均值不为 0
? t 分布因为用样本方差代替总体方差而引入额外不确定性，导致尾部比正态分布更厚。自由度增大时两者趋于一致。
```

```quiz
什么时候应该用配对 t 检验而不是双样本 t 检验？
- 两组数据来自不同的独立样本
- 同一组对象在两个时间点或条件下的测量 [*]
- 样本量非常大的时候
? 配对 t 检验用于同一对象的前后/左右/条件对比，利用配对结构减少个体差异的噪声，比独立双样本检验更有功效。
```

## 7. 选读：Student 的真实身份

<details>
<summary>选读 · Gosset 与吉尼斯啤酒</summary>

William Sealy Gosset 是吉尼斯啤酒厂的统计师。他发现小样本下用正态分布近似会低估不确定性，但吉尼斯不允许员工发表商业研究。他以"Student"为笔名在 1908 年发表了 t 分布的论文，直到去世后才被公开承认。

这个故事说明两件事：统计学的发展常常源于实际工业问题；以及好论文不一定要署真名。

</details>

## 8. 下一站

t 检验处理连续数据的均值比较。当数据是分类的（通过/不通过、男/女），需要另一种工具——下一课学习卡方检验。

→ [卡方检验](./35-chi-square.md)
