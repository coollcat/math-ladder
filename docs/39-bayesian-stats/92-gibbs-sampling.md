---
title: Gibbs 采样
lesson_id: bayesian/gibbs-sampling
prereqs:
  - bayesian/mcmc-hmc
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - gibbs-sampler
  - conditional-sampling
  - scan-strategy
applications:
  - bayesian-inference
  - image-restoration
  - topic-models
exits:
  - data-ai
---

# Gibbs 采样

## 1. 从一个场景开始

你在做一个贝叶斯层次模型：参数 $\theta_1,\theta_2,\theta_3$ 互相耦合，联合后验 $p(\theta_1,\theta_2,\theta_3|\text{data})$ 复杂到没法直接采样。但有一个好消息：**固定任意两个参数后，第三个的条件分布是已知的标准分布**——正态、Gamma、Beta……都是可以直接抽样的。

能不能把"从复杂的联合分布采样"分解成"轮流从一维条件分布采样"？1984 年 Geman 兄弟给出了肯定的答案——**Gibbs 采样**，MCMC 家族中最优雅也最实用的成员之一。

## 2. 直觉解释

上一课的 MH 算法像一个游客随机试方向：试了可能被拒。Gibbs 采样更像一个**走迷宫的人沿墙摸**：

- 站在 $(x_1,x_2,x_3)$；
- 固定 $x_2,x_3$，从 $p(x_1|x_2,x_3)$ 精确抽一个新 $x_1$——**永远接受**，因为条件分布就是目标分布的"切片"；
- 固定 $x_1$（新的），$x_3$，从 $p(x_2|x_1,x_3)$ 抽新 $x_2$；
- 固定 $x_1,x_2$，从 $p(x_3|x_1,x_2)$ 抽新 $x_3$。

每次只动一个坐标，沿着目标分布的"等高线"滑行。因为每一步都是从精确的条件分布抽样，**不需要计算接受率**——MH 的接受率恒为 1。

## 3. 正式定义

**Gibbs 采样器**（系统扫描版）：

设目标分布为 $p(x_1,\ldots,x_d)$。从初始点 $\mathbf{x}^{(0)}$ 开始，第 $t$ 次迭代：

$$x_i^{(t)} \sim p\left(x_i \mid x_1^{(t)},\ldots,x_{i-1}^{(t)},\ x_{i+1}^{(t-1)},\ldots,x_d^{(t-1)}\right), \quad i=1,\ldots,d$$

注意：更新 $x_i$ 时，$x_1,\ldots,x_{i-1}$ 已经是第 $t$ 轮的新值（**系统扫描**），$x_{i+1},\ldots,x_d$ 还是上一轮的旧值。

**符号说明**：

| 符号 | 含义 |
| --- | --- |
| $x_i^{(t)}$ | 第 $t$ 次迭代时第 $i$ 个分量的值 |
| $p(x_i\mid x_{-i})$ | 固定其他分量后 $x_i$ 的条件分布 |
| 扫描 | 一次完整遍历所有 $d$ 个分量 |
| burn-in | 初始阶段丢弃的样本（尚未收敛） |

**Gibbs 作为 MH 的特例**：Gibbs 的提议是"从条件分布抽样"，接受率 $\alpha=\min(1,\frac{p(x')q(x\mid x')}{p(x)q(x'\mid x)})$。由于 $q(x'\mid x)=p(x'_i\mid x_{-i})$ 且 $p(x')=p(x'_i\mid x_{-i})p(x_{-i})$，代入后分子分母完全相等——$\alpha=1$。

## 4. 分步例题

**例**：二元正态分布 $p(x,y)\propto\exp(-\frac{1}{2(1-\rho^2)}[x^2-2\rho xy+y^2])$，$\rho=0.8$。

条件分布都是正态：
- $p(x|y)=N(\rho y, 1-\rho^2)$
- $p(y|x)=N(\rho x, 1-\rho^2)$

**手推一步**：从 $(x^{(0)},y^{(0)})=(0,0)$ 出发。

1. 更新 $x$：$x^{(1)}\sim N(0.8\times0, 1-0.64)=N(0,0.36)$。抽到 $x^{(1)}=0.5$；
2. 更新 $y$：$y^{(1)}\sim N(0.8\times0.5, 0.36)=N(0.4,0.36)$。抽到 $y^{(1)}=0.7$；
3. 新状态 $(0.5, 0.7)$——已经偏离原点，沿相关方向漂移。

随着迭代增加，样本的分布逐渐逼近目标二元正态。

## 5. 动手实验

### 实验 1（viz）：Gibbs 的游走轨迹

```viz
{
  "type": "plot",
  "title": "ρ 控制 Gibbs 的游走形状",
  "expr": "exp(-(x^2 - 2*rho*x*y + y^2)/(2*(1-rho^2)))",
  "xmin": -3,
  "xmax": 3,
  "sliders": [
    { "name": "rho", "min": -0.9, "max": 0.9, "step": 0.1, "value": 0.8 },
    { "name": "y", "min": -3, "max": 3, "step": 0.1, "value": 0 }
  ]
}
```

拖动 $\rho$ 接近 1 时，条件分布的方差 $1-\rho^2$ 趋近 0——每步只能挪一小寸，Gibbs 蜿蜒爬行极度缓慢。这就是**高相关导致的慢混合**。

### 实验 2（python）：Gibbs 采样二元正态

```python title="Gibbs 采样二元正态：可视化收敛与相关"
import random
import math
random.seed(2026)

rho = 0.8                         # 相关系数
var = 1 - rho ** 2                # 条件方差 = 0.36
sd = math.sqrt(var)               # 条件标准差

x, y = 0.0, 0.0                   # 初始值
samples = []
for t in range(5000):
    # 更新 x：p(x|y) = N(rho*y, 1-rho^2)
    x = random.gauss(rho * y, sd)
    # 更新 y：p(y|x) = N(rho*x, 1-rho^2)
    y = random.gauss(rho * x, sd)
    samples.append((x, y))

# 统计（跳过 burn-in）
burn = 500
xs = [s[0] for s in samples[burn:]]
ys = [s[1] for s in samples[burn:]]
mean_x = sum(xs) / len(xs)
mean_y = sum(ys) / len(ys)
# 样本相关系数
cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / len(xs)
var_x = sum((x - mean_x) ** 2 for x in xs) / len(xs)
var_y = sum((y - mean_y) ** 2 for y in ys) / len(ys)
sample_rho = cov_xy / math.sqrt(var_x * var_y)

print(f"样本均值: x={round(mean_x, 3)}, y={round(mean_y, 3)}")
print(f"样本相关系数: {round(sample_rho, 3)} (理论值 {rho})")
print(f"自相关(滞后1): {round(sum((xs[i]-mean_x)*(xs[i+1]-mean_x) for i in range(len(xs)-1)) / ((len(xs)-1)*var_x), 3)}")
```

自相关很高——$\rho=0.8$ 时 Gibbs 每步只挪一点点，样本高度粘连。这就是为什么高相关模型中 HMC 通常碾压 Gibbs。

### 快问快答

```quiz
Gibbs 采样和 MH 的核心区别是什么？
- Gibbs 更快
- Gibbs 每步从精确条件分布抽样，接受率恒为 1 [*]
- Gibbs 不需要知道目标分布
? Gibbs 的提议就是条件分布本身，MH 的接受率公式代入后分子分母相消为 1。代价是必须能从所有条件分布直接抽样。
```

```quiz
什么情况下 Gibbs 采样效率很低？
- 目标分布是多峰的
- 变量之间高度相关 [*]
- 变量维度很低
? 高相关使条件分布的方差很小，每步只能移动一小步，样本自相关极高。HMC 用梯度信息做定向长跳，能有效克服这个问题。
```

:::warning[常见误区]

**误区一**："Gibbs 不需要 burn-in。" Gibbs 仍然是 MCMC，初始值的影响需要若干轮扫描才能消退。丢弃前 10-20% 的样本是标准操作。

**误区二**："Gibbs 比 MH 更好。" Gibbs 是 MH 的特殊情况（接受率=1），但前提是能从所有条件分布精确抽样。如果条件分布不是标准形式，每一步还要用 MH 近似——变成了"Metropolis-within-Gibbs"，优势大打折扣。

**误区三**："扫描顺序无关紧要。" 系统扫描（每轮按固定顺序更新）和随机扫描（每轮随机选一个分量更新）在理论上都收敛，但收敛速度可以差很多。某些模型中，改变扫描顺序能显著改善混合。

:::

## 6. 练习

**练习 1**：对 $\rho=0.5$ 的二元正态，用 Gibbs 从 $(0,0)$ 走 3 步（设随机数为 $z_1=0.3, z_2=-0.1, z_3=0.5, z_4=0.2, z_5=-0.4, z_6=0.1$，按 $x=\mu+\sigma z$ 映射）。

<details>
<summary>点开查看逐步解答</summary>

$\rho=0.5$，条件方差 $=1-0.25=0.75$，$\sigma=\sqrt{0.75}\approx0.866$。

步 1：$x^{(1)}=0.5\times0+0.866\times0.3=0.260$；$y^{(1)}=0.5\times0.260+0.866\times(-0.1)=0.043$。

步 2：$x^{(2)}=0.5\times0.043+0.866\times0.5=0.455$；$y^{(2)}=0.5\times0.455+0.866\times0.2=0.401$。

步 3：$x^{(3)}=0.5\times0.401+0.866\times(-0.4)=-0.146$；$y^{(3)}=0.5\times(-0.146)+0.866\times0.1=0.014$。

轨迹：$(0,0)\to(0.260,0.043)\to(0.455,0.401)\to(-0.146,0.014)$——来回游走，逐渐填满椭圆区域。
</details>

**练习 2**：补全 Gibbs 采样器——代码能跑但条件分布的参数不对：

```exercise
# @title: 练习：修复 Gibbs 条件分布
# @check: 0.6
# @check: 0.0
# @hint: 条件均值是 rho × 另一个变量，不是 rho × 自己
import random, math
random.seed(99)

rho = 0.6
var = 1 - rho ** 2
sd = math.sqrt(var)

x, y = 0.0, 0.0
sx = sy = sxy = sxx = syy = 0.0
n, burn = 20000, 1000          # 前 1000 步当预热，丢掉不统计
for t in range(n):
    x = random.gauss(rho * x, sd)     # ← bug：应该用 y 不是 x
    y = random.gauss(rho * y, sd)     # ← bug：应该用 x 不是 y
    if t >= burn:
        sx += x; sy += y
        sxx += x * x; syy += y * y; sxy += x * y

m = n - burn
mx, my = sx / m, sy / m
cov = sxy / m - mx * my
corr = cov / math.sqrt((sxx / m - mx * mx) * (syy / m - my * my))
print(round(corr, 1))    # 修正后应接近 rho = 0.6
print(round(mx, 1))      # 均值应接近 0
```

<details>
<summary>点开查看逐步解答</summary>

```python
import random, math
random.seed(99)
rho = 0.6
var = 1 - rho ** 2
sd = math.sqrt(var)

x, y = 0.0, 0.0
sx = sy = sxy = sxx = syy = 0.0
n, burn = 20000, 1000
for t in range(n):
    x = random.gauss(rho * y, sd)     # p(x|y) = N(ρy, 1-ρ²)
    y = random.gauss(rho * x, sd)     # p(y|x) = N(ρx, 1-ρ²)
    if t >= burn:
        sx += x; sy += y
        sxx += x * x; syy += y * y; sxy += x * y

m = n - burn
mx, my = sx / m, sy / m
cov = sxy / m - mx * my
corr = cov / math.sqrt((sxx / m - mx * mx) * (syy / m - my * my))
print(round(corr, 1))    # 0.6：样本相关系数复原了 rho
print(round(mx, 1))      # 0.0：均值回到 0
```

**为什么不看最后一步的取值**：单步位置是一个随机数，换一次运行就变；
而**样本相关系数**是这条链的统计性质——它等于 rho 才是"采样器对了"的证据。
初版练习拿 `round(x, 1)` 当期望值，等于让判题去猜一枚硬币，现已改成相关系数。
</details>

## 7. 选读：LDA 与 Gibbs 的黄金搭档

<details>
<summary>选读 · 隐含狄利克雷分配中的 Collapsed Gibbs</summary>

主题模型 LDA（Latent Dirichlet Allocation）是 Gibbs 采样最辉煌的应用之一。LDA 假设每篇文档是多个主题的混合，每个主题是词的分布。要推断的主题-词分配 $z$ 是一个离散隐变量，维度极高（词数 × 主题数）。

Collapsed Gibbs 采样的妙处在于：对主题分配 $z$ 做 Gibbs，同时**积分掉**（collapsed）主题-词分布 $\phi$ 和文档-主题分布 $\theta$——因为它们的共轭先验（Dirichlet）让条件分布有解析形式。每一步只需重新分配一个词的主题，条件概率正比于"这个词在该文档中被分到该主题的次数"乘以"这个词在该主题中出现的次数"——极其简洁。

LDA 的成功让 Gibbs 采样成为文本挖掘的标准工具。后来的变分推断更快但近似，Gibbs 更慢但精确——在"精度 vs 速度"的天平上各占一端。2012 年以后，随机变分推断（SVI）逐渐取代了 Gibbs 在大规模文本上的地位，但 Gibbs 的精确性仍在小数据和诊断场景中不可替代。

</details>

## 8. 下一站

Gibbs 解决了"怎么采样后验"。但后验本身从哪来？下一课把贝叶斯推断应用到最经典的模型——线性回归，看共轭先验如何让后验有解析解，以及贝叶斯回归如何自然地给出预测区间。

→ [贝叶斯线性回归](./94-bayesian-linear-regression.md)
