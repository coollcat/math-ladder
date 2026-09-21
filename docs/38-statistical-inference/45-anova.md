---
title: 方差分析 ANOVA
lesson_id: statistical-inference/anova
prereqs:
  - statistical-inference/ab-test
volume: 4
layer: L7
track:
  - data-inference
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import:
  - scipy
introduces_concepts:
  - anova
  - f-statistic
  - between-group-variance
  - within-group-variance
applications:
  - experiment-design
  - clinical-trials
  - manufacturing-quality
exits:
  - research
---

# 方差分析 ANOVA

## 1. 从一个场景开始

一家连锁咖啡店在三个城市测试新的营销方案。每个城市收集了 20 家门店的月销售额。问题：三个城市的平均销售额有显著差异吗？

如果用 t 检验两两比较（3 对比较），每对的 $\alpha=0.05$，整体犯错概率高达 $1-(1-0.05)^3\approx0.14$。多次 t 检验会膨胀第一类错误率。

ANOVA（Analysis of Variance）用一次检验同时比较所有组的均值，把错误率控制在 $\alpha$。

## 2. 直觉解释

ANOVA 的核心思想：**把总变异分解为"组间变异"和"组内变异"。**

- 组间变异：各组均值之间的差异，反映处理效果；
- 组内变异：每组内部的随机波动，反映噪声。

如果处理有效，组间变异应该远大于组内变异。F 统计量就是这两者的比值：

$$F=\frac{\text{组间均方}}{\text{组内均方}}$$

$F$ 很大说明组间差异超出随机波动的范围，处理可能真的有效。

## 3. 正式定义

**单因素 ANOVA**：设 $k$ 个组，第 $i$ 组有 $n_i$ 个观测值 $X_{ij}$。

$$H_0:\mu_1=\mu_2=\cdots=\mu_k,\quad H_1:\text{至少一对不等}$$

**平方和分解**：

| 来源 | 公式 | 自由度 |
| --- | --- | --- |
| 组间 SSB | $\sum n_i(\bar{X}_i-\bar{X})^2$ | $k-1$ |
| 组内 SSW | $\sum\sum(X_{ij}-\bar{X}_i)^2$ | $N-k$ |
| 总和 SST | $\sum\sum(X_{ij}-\bar{X})^2$ | $N-1$ |

$$\text{SST}=\text{SSB}+\text{SSW}$$

**F 统计量**：

$$F=\frac{\text{SSB}/(k-1)}{\text{SSW}/(N-k)}=\frac{\text{MSB}}{\text{MSW}}\sim F(k-1,N-k)$$

| 符号 | 含义 |
| --- | --- |
| $k$ | 组数 |
| $n_i$ | 第 $i$ 组的样本量 |
| $N$ | 总样本量 |
| $\bar{X}_i$ | 第 $i$ 组的均值 |
| $\bar{X}$ | 总均值 |
| MSB | 组间均方 $=\text{SSB}/(k-1)$ |
| MSW | 组内均方 $=\text{SSW}/(N-k)$ |

## 4. 分步例题

**例**：三个城市的月销售额（万元），检验均值是否相等。

城市 A：12, 15, 11, 14, 13
城市 B：18, 20, 17, 19, 21
城市 C：14, 16, 15, 13, 15

1. 计算各组均值：$\bar{X}_A=13$，$\bar{X}_B=19$，$\bar{X}_C=14.6$；
2. 总均值：$\bar{X}=(13+19+14.6)/3=15.533$；
3. $\text{SSB}=5(13-15.533)^2+5(19-15.533)^2+5(14.6-15.533)^2$
4. $=5(6.418+12.018+0.871)=5\times19.307=96.533$；
5. $\text{SSW}=\sum$ 各组内部离差平方和 $=(1+4+0+1+0)+(4+1+4+1+4)+(0+4+1+4+1)=6+14+10=30$；
6. $\text{MSB}=96.533/2=48.267$，$\text{MSW}=30/12=2.5$；
7. $F=48.267/2.5=19.307$；
8. $F(2,12)$ 的临界值（$\alpha=0.05$）约为 3.89，$19.31\gg3.89$，拒绝 $H_0$。

## 5. 动手实验

### 实验 1（python）：手动实现单因素 ANOVA

```python title="从原始数据到 F 统计量"
import numpy as np

# 三个城市的销售数据
city_a = [12, 15, 11, 14, 13]
city_b = [18, 20, 17, 19, 21]
city_c = [14, 16, 15, 13, 15]
groups = [city_a, city_b, city_c]

k = len(groups)  # 组数
N = sum(len(g) for g in groups)  # 总样本量
grand_mean = np.mean([x for g in groups for x in g])  # 总均值

# 组间平方和 SSB
ssb = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)

# 组内平方和 SSW
ssw = sum(sum((x - np.mean(g))**2 for x in g) for g in groups)

# 均方
msb = ssb / (k - 1)
msw = ssw / (N - k)

# F 统计量
f_stat = msb / msw

print(f"SSB = {ssb:.3f}")
print(f"SSW = {ssw:.3f}")
print(f"MSB = {msb:.3f}")
print(f"MSW = {msw:.3f}")
print(f"F = {f_stat:.3f}")
```

### 实验 2（python）：用 scipy 验证

```python title="scipy 一键 ANOVA"
from scipy.stats import f_oneway

f_stat, p_value = f_oneway(city_a, city_b, city_c)  # f_oneway：单因素 ANOVA
print(f"F = {f_stat:.3f}")
print(f"p 值 = {p_value:.4f}")
print(f"结论: {'拒绝 H0' if p_value < 0.05 else '不拒绝 H0'}")
```

手动计算与 scipy 结果一致。

### 实验 3（python）：可视化组间与组内变异

```python title="箱线图：一眼看组间差异"
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

# 左图：数据分布
axes[0].boxplot([city_a, city_b, city_c], labels=["A", "B", "C"])  # 箱线图
axes[0].set_title("各组数据分布")
axes[0].set_ylabel("销售额 (万元)")

# 右图：均值与总均值
means = [np.mean(g) for g in groups]
axes[1].bar(["A", "B", "C"], means, color=["steelblue", "tomato", "green"], alpha=0.7)
axes[1].axhline(grand_mean, color="black", linestyle="--", label=f"总均值 {grand_mean:.1f}")  # 水平参考线
axes[1].set_title("组均值 vs 总均值")
axes[1].legend()

plt.tight_layout()
```

箱线图直观展示：B 组明显高于其他两组，组间差异清晰可见。

### 实验 4：F 分布与拒绝域

```viz
{
  "type": "plot",
  "title": "F 分布密度曲线",
  "expr": "sqrt(((d1*x)^d1 * d2^d2) / ((d1*x+d2)^(d1+d2))) * (gamma((d1+d2)/2)/(gamma(d1/2)*gamma(d2/2))) / x",
  "xmin": 0.01,
  "xmax": 8,
  "ymin": 0,
  "ymax": 2,
  "sliders": [
    {"name": "d1", "min": 1, "max": 30, "step": 1, "value": 5},
    {"name": "d2", "min": 1, "max": 30, "step": 1, "value": 10}
  ]
}
```

拖动分子自由度 d1 和分母自由度 d2，观察 F 分布形状的变化。F 分布是 ANOVA 中 F 统计量的理论分布，拒绝域在右侧尾部——F 值越大越倾向于拒绝 H₀。

:::warning[常见误区]

**你以为 ANOVA 能告诉你哪些组之间有差异。** ANOVA 只检验"所有组均值相等"这个整体假设。具体哪两组不同，需要做事后检验（如 Tukey HSD）。

**你以为 ANOVA 要求各组样本量相同。** ANOVA 可以处理不等样本量（unbalanced design），只是计算稍复杂。

**你以为 F 检验拒绝就说明所有组都不同。** 只说明至少有一对不同，可能是 A vs B 显著，A vs C 和 B vs C 不显著。

:::

## 6. 练习

```exercise
# @title: 练习：计算 F 统计量
# @check: F statistic: 19.307
# @check: p value: 0.0002
# @hint: 用 f_oneway 函数，传入三个组的数据
from scipy.stats import f_oneway

group1 = [12, 15, 11, 14, 13]
group2 = [18, 20, 17, 19, 21]
group3 = [14, 16, 15, 13, 15]

f_stat, p_value = f_oneway(group1, group2, group3)

print(f"F statistic: {f_stat:.3f}")
print(f"p value: {p_value:.4f}")
```

```quiz
ANOVA 的 F 统计量是什么的比值？
- 最大组均值与最小组均值之比
- 组间均方与组内均方之比 [*]
- 总平方和与组间平方和之比
? F = MSB / MSW。组间均方衡量处理效果，组内均方衡量随机噪声。F 大说明处理效果超出噪声。
```

```quiz
如果 ANOVA 的 F 检验拒绝了 H0，能得出什么结论？
- 所有组的均值都互不相同
- 至少有一对组的均值不同 [*]
- 只有最大和最小均值的组不同
? F 检验是整体检验，拒绝 H0 只说明至少有一对不同，但不指明是哪一对。需要做事后检验（如 Tukey HSD）来确定具体差异。
```

## 7. 选读：ANOVA 与线性模型的统一

<details>
<summary>选读 · ANOVA 是回归的特例</summary>

ANOVA 可以写成线性模型 $X_{ij}=\mu+\alpha_i+\varepsilon_{ij}$，其中 $\mu$ 是总均值，$\alpha_i$ 是第 $i$ 组的效应，$\varepsilon_{ij}$ 是误差。

这个模型与线性回归 $Y=X\beta+\varepsilon$ 的形式完全相同，只是设计矩阵 $X$ 的列变成了组指示变量（虚拟编码）。F 检验等价于检验"所有 $\alpha_i=0$"。

这种统一视角意味着：ANOVA 的所有假设（正态性、等方差、独立性）都可以用回归诊断工具来检查。广义线性模型则把这一框架扩展到了非正态响应变量。

</details>

## 8. 下一站

ANOVA 比较多组均值，但"均值"只是矩的一种。当我们需要从样本矩估计分布参数时，矩估计法是最直接的方法——下一课介绍矩估计及其与 MLE 的对比。

→ [矩估计](./52-method-of-moments.md)
