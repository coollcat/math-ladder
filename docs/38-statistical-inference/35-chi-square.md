---
title: 卡方检验
lesson_id: statistical-inference/chi-square
prereqs:
  - statistical-inference/hypothesis-testing
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
  - chi-squared-test
  - goodness-of-fit
  - test-of-independence
applications:
  - quality-control
  - survey-analysis
  - genetics
exits:
  - research
---

# 卡方检验

## 1. 从一个场景开始

一家工厂生产红、蓝、绿三种颜色的零件，理论比例应为 5:3:2。质检员从一批产品中随机抽取 200 个，发现红 95、蓝 65、绿 40。这批产品是否偏离了理论比例？

t 检验处理连续数据的均值，这里需要处理分类数据的频数——卡方检验正是为此设计的。

## 2. 直觉解释

卡方检验的核心思想：**比较"观察到的频数"和"期望频数"之间的差距。**

如果理论正确，观察值和期望值应该接近。差距用 $\chi^2$ 统计量衡量：

$$\chi^2=\sum\frac{(O_i-E_i)^2}{E_i}$$

$O_i$ 是观察频数，$E_i$ 是期望频数。差距越大，$\chi^2$ 越大，越倾向于拒绝理论。

## 3. 正式定义

**卡方统计量**：

$$\chi^2=\sum_{i=1}^{k}\frac{(O_i-E_i)^2}{E_i}$$

在零假设下近似服从 $\chi^2(\nu)$ 分布，其中 $\nu$ 是自由度。

**拟合优度检验**（Goodness of Fit）：

- $H_0$：数据服从某个指定分布
- $H_1$：数据不服从该分布
- 自由度 $\nu=k-1-m$（$k$ 为类别数，$m$ 为估计的参数个数）

**独立性检验**（Test of Independence）：

- $H_0$：两个分类变量独立
- $H_1$：两个变量相关
- 自由度 $\nu=(r-1)(c-1)$（$r$ 行，$c$ 列）

| 检验类型 | 零假设 | 自由度 |
| --- | --- | --- |
| 拟合优度 | 数据服从指定分布 | $k-1$（或 $k-1-m$） |
| 独立性 | 两变量独立 | $(r-1)(c-1)$ |

## 4. 分步例题

**例 1**（拟合优度）：红蓝绿零件比例 5:3:2，抽 200 个，观察 (95, 65, 40)。

1. 期望频数：红 $200\times0.5=100$，蓝 $200\times0.3=60$，绿 $200\times0.2=40$；
2. $\chi^2=(95-100)^2/100+(65-60)^2/60+(40-40)^2/40$
3. $=25/100+25/60+0=0.25+0.417+0=0.667$；
4. 自由度 $\nu=3-1=2$；
5. $P(\chi^2(2)\ge0.667)\approx0.717$，远大于 0.05；
6. 不拒绝 $H_0$：没有足够证据说明比例偏离。

**例 2**（独立性）：调查性别与偏好颜色是否独立。

| | 红 | 蓝 | 绿 | 合计 |
| --- | --- | --- | --- | --- |
| 男 | 30 | 50 | 20 | 100 |
| 女 | 40 | 30 | 30 | 100 |
| 合计 | 70 | 80 | 50 | 200 |

1. 期望频数 $E_{ij}=R_iC_j/N$，如男-红 $=100\times70/200=35$；
2. 计算所有 6 个格子的 $(O-E)^2/E$ 并求和；
3. 自由度 $(2-1)(3-1)=2$；
4. 查表或计算 $p$ 值判断。

## 5. 动手实验

### 实验 1（python）：拟合优度检验

```python title="检验零件比例是否符合 5:3:2"
from scipy.stats import chisquare

observed = [95, 65, 40]  # 观察频数
expected_ratio = [0.5, 0.3, 0.2]  # 期望比例
total = sum(observed)
expected = [r * total for r in expected_ratio]  # 期望频数 = 比例 × 总数

chi2_stat, p_value = chisquare(observed, f_exp=expected)  # chisquare：卡方拟合优度检验
print(f"观察频数: {observed}")
print(f"期望频数: {[f'{e:.1f}' for e in expected]}")
print(f"χ² = {chi2_stat:.3f}")
print(f"p 值 = {p_value:.4f}")
```

### 实验 2（python）：独立性检验

```python title="性别与颜色偏好是否独立"
from scipy.stats import chi2_contingency
import numpy as np

# 列联表：行=性别，列=颜色偏好
table = np.array([
    [30, 50, 20],  # 男
    [40, 30, 30],  # 女
])

chi2_stat, p_value, dof, expected = chi2_contingency(table)  # 列联表卡方检验
print(f"χ² = {chi2_stat:.3f}")
print(f"自由度 = {dof}")
print(f"p 值 = {p_value:.4f}")
print(f"期望频数:\n{expected}")
```

### 实验 3（python）：模拟卡方统计量的分布

```python title="多次模拟生成卡方分布"
import matplotlib.pyplot as plt
from scipy.stats import chi2

np.random.seed(42)
# 模拟：从 5:3:2 分布抽样 200 次，重复 10000 次
n_sim = 10000
chi2_values = []

for _ in range(n_sim):
    sample = np.random.choice([0, 1, 2], size=200, p=[0.5, 0.3, 0.2])  # 按比例抽样
    counts = [np.sum(sample == i) for i in range(3)]
    expected = [100, 60, 40]
    chi2_val = sum((o - e)**2 / e for o, e in zip(counts, expected))
    chi2_values.append(chi2_val)

plt.hist(chi2_values, bins=50, density=True, alpha=0.7, label="模拟")

# 叠加理论 χ²(2) 密度
x = np.linspace(0, 15, 200)
plt.plot(x, chi2.pdf(x, 2), "r-", label="χ²(2) 理论", linewidth=2)
plt.title("模拟 vs 理论卡方分布")
plt.legend()
```

模拟分布与理论 $\chi^2(2)$ 完美吻合——这就是大样本下卡方检验有效的原因。

### 实验 4：卡方分布密度族

```viz
{
  "type": "plot",
  "title": "卡方分布密度曲线",
  "expr": "(x^(k/2-1)*exp(-x/2)) / (2^(k/2)*gamma(k/2))",
  "xmin": 0.01,
  "xmax": 30,
  "ymin": 0,
  "ymax": 0.3,
  "sliders": [
    {"name": "k", "min": 1, "max": 20, "step": 1, "value": 4}
  ]
}
```

拖动自由度 k 滑块，观察卡方分布如何从严重右偏（k=1）逐渐变为近似正态（k 大）。k=1 时密度在 0 附近爆炸，k 增大后峰值右移且分布更对称。

:::warning[常见误区]

**你以为卡方检验可以用于小样本。** 经验法则：每个格子的期望频数不应小于 5，否则卡方近似失效。

**你以为 p 值小就说明效应大。** 卡方统计量受样本量影响极大，大样本时微小偏差也会产生显著 $p$ 值。应配合效应量（如 Cramér's $V$）使用。

**你以为独立性检验证明因果关系。** 只能说明两变量相关，不能说明谁导致谁。

:::

## 6. 练习

```exercise
# @title: 练习：拟合优度检验
# @check: chi2 statistic: 3.500
# @check: p value: 0.3212
# @hint: 期望比例为均匀分布 [0.25, 0.25, 0.25, 0.25]，用 chisquare 函数
from scipy.stats import chisquare

# 观察频数：四种颜色
observed = [45, 55, 50, 50]
# 期望比例：均匀分布
expected_ratio = [0.25, 0.25, 0.25, 0.25]
total = sum(observed)
expected = [r * total for r in expected_ratio]

chi2_stat, p_value = chisquare(observed, f_exp=expected)
print(f"chi2 statistic: {chi2_stat:.3f}")
print(f"p value: {p_value:.4f}")
```

```quiz
卡方拟合优度检验的自由度是多少？
- 等于样本量 n
- 等于类别数 k
- 等于 k - 1 [*]
? 自由度为类别数减 1。因为所有观察频数之和固定为 n，最后一个频数由其他频数决定，所以损失一个自由度。
```

```quiz
独立性检验的自由度如何计算？
- 等于样本量 n
- 等于 (行数-1)×(列数-1) [*]
- 等于行数×列数
? 自由度 = (r-1)(c-1)。每行的合计固定、每列的合计也固定，所以自由度是行和列各损失一个后的乘积。
```

## 7. 选读：似然比检验与卡方

<details>
<summary>选读 · G 检验：卡方的对数版本</summary>

似然比检验统计量 $G=2\sum O_i\ln(O_i/E_i)$ 也近似服从 $\chi^2$ 分布，称为 G 检验。它与 Pearson 卡方在大样本下等价，但在小样本或期望频数较低时表现略有不同。

G 检验的优势：可以像 ANOVA 一样做嵌套模型的比较（$G$ 统计量可加），这在对数线性模型中很有用。

</details>

## 8. 下一站

卡方检验只能比较两组或检验独立性。当有三组或更多组均值需要同时比较时，多次 t 检验会膨胀第一类错误率——下一课学习方差分析 ANOVA。

→ [方差分析 ANOVA](./45-anova.md)
