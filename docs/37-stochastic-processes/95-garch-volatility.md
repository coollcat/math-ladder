---
title: GARCH 波动率模型
lesson_id: stochastic-processes/garch-volatility
prereqs:
  - stochastic-processes/time-series-models
volume: 4
layer: L7
track:
  - probability-statistics
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - garch-model
  - conditional-variance
  - volatility-clustering
applications:
  - financial-risk
  - volatility-forecasting
exits:
  - stochastic-analysis
---

# GARCH 波动率模型

## 1. 从一个场景开始

股票市场有时连续几天风平浪静，下一天却突然大幅波动；剧烈波动又常常会连续出现几天。收益本身的均值接近零，但它的波动不是恒定的：大波动会吸引大波动，小波动之后也可能继续安静一段时间。

GARCH 模型不直接预测价格涨跌，而是预测“下一步的波动会有多大”。它把今天观察到的冲击，一部分写进明天的条件方差。

## 2. 直觉解释

把价格变化记作收益 $r_t$，用平方收益 $\varepsilon_t^2$ 粗略衡量波动。ARCH/GARCH 的核心观察是：大的 $\varepsilon_t$ 会抬高未来的预期平方收益，小的 $\varepsilon_t$ 则让方差回落。

GARCH(1,1) 可以想成两盏灯：

- $\alpha$ 灯把今天的意外冲击传给明天；
- $\beta$ 灯把今天已经变大的波动继续传给明天。

长期方差不是趋于无穷，而是由 $\omega/(1-\alpha-\beta)$ 决定；这要求 $\alpha+\beta<1$，否则模型会认为冲击永久累积。

## 3. 正式定义

令 $\varepsilon_t=r_t-\mu$，条件方差为 $\sigma_t^2$。GARCH(1,1) 写作：

$$\sigma_t^2=\omega+\alpha\varepsilon_{t-1}^2+\beta\sigma_{t-1}^2$$

其中：

| 符号 | 含义 | 约束或作用 |
| --- | --- | --- |
| $\omega$ | 方差地板 | $\omega>0$ |
| $\alpha$ | 新冲击权重 | $\alpha\ge0$ |
| $\beta$ | 旧波动持续权重 | $\beta\ge0$ |
| $\alpha+\beta$ | 波动持续性 | 小于 1，长期方差有限 |

长期条件方差为：

$$\sigma_{\mathrm{long}}^2=\frac{\omega}{1-\alpha-\beta}$$

ARCH(1) 只保留 $\omega+\alpha\varepsilon_{t-1}^2$；GARCH 在它上面再加入“波动预测波动”的递归项，因此更适合描述金融收益的聚集现象。

## 4. 分步例题

设 $\omega=0.1$、$\alpha=0.1$、$\beta=0.8$，上一期方差是 $0.04$，上一期冲击是 $0.02$。

1. 冲击平方：$\varepsilon_{t-1}^2=0.0004$；
2. 新冲击贡献：$0.1\times0.0004=0.00004$；
3. 旧方差贡献：$0.8\times0.04=0.032$；
4. 下一期条件方差：$0.1+0.00004+0.032=0.13204$；
5. 长期方差：$0.1/(1-0.1-0.8)=1$。

这次冲击不大，但由于 $\beta=0.8$，上一期的大部分波动仍会被带到下一期，这就是“波动持续”。

## 5. 动手实验

### 实验 1（lab）：波动聚集成串，σ² 又总被拉回水位线

```lab
{
  "type": "stoch-garch-cluster",
  "title": "GARCH(1,1)：大波动之后更容易继续大波动",
  "alpha": 0.12,
  "beta": 0.82,
  "n": 240
}
```

参数就是本节实验里那组 $\omega = 0.01$、$\alpha = 0.12$、$\beta = 0.82$（$\alpha+\beta = 0.94$，长期方差 $0.01/0.06 \approx 0.167$）。

- 上半屏灰柱是收益、橙线是条件标准差 $\sigma_t$ 画出的通道：通道窄的一段后面往往还窄，宽的一段后面接着宽——**这就是波动聚集**；
- 下半屏每 20 步一根柱，是那个窗口里的平方收益均值（和上面那个 Python 实验是同一个量，但随机数流不同，具体数字不会一模一样）。默认参数下 12 根柱依次是 `0.113 / 0.228 / 0.077 / 0.077 / 0.103 / 0.162 / 0.453 / 0.386 / 0.596 / 0.292 / 0.115 / 0.244`：看第 7–10 根连成一串高峰——相邻两个窗口的相关系数约 0.46，**这就是可测量的「聚集」**；
- 拖 $\beta$：$\beta$ 越靠近 1，「余波」拖得越久；拖 $\alpha$：新冲击的分量变大，柱子更「跳」。切「方差拆解」视图：每一天的 $\sigma_t^2$ 被拆成 $\omega$（地板）、$\alpha\varepsilon^2$（今天的冲击）、$\beta\sigma^2$（昨天的记忆）三段堆起来——默认参数下，**240 天里有 235 天是「记忆」那一段最粗**（平均 $\beta\sigma^2 \approx 0.176$ 对 $\alpha\varepsilon^2 \approx 0.028$，差 6 倍）。想让它反过来，把 $\alpha$ 拉高、$\beta$ 拉低即可。

### 实验 2（python）：让大波动在时间序列里留下余波

```python title="让大波动在时间序列里留下余波"
import random                     # 随机库（第 0 章登场）
import math                       # 数学库：这里只用 math.sqrt 求标准差

random.seed(42)                   # 固定种子：每次运行长出同一条收益序列
n = 240                           # 造 240 天
returns = []                      # 逐日收集收益
sigma2 = 0.04                     # 初始条件方差（第一天的"记忆"）
omega = 0.01                      # 方差地板 ω
alpha = 0.12                      # 新冲击权重 α
beta = 0.82                       # 旧波动权重 β（α+β=0.94 < 1，长期方差有限）

for t in range(n):
    shock = random.gauss(0, math.sqrt(sigma2))   # 波动率为 √σ² 的正态冲击
    returns.append(shock)
    sigma2 = omega + alpha * shock * shock + beta * sigma2   # ← 递推：把今天的冲击写进明天的方差

window = 20                       # 每 20 天一个窗口
for start in range(0, n - window, window):
    sample = returns[start:start + window]       # 切片取出这 20 天
    observed = sum(value * value for value in sample) / window   # 窗口内平方收益均值（波动代理量）
    print(round(observed, 4))
```

种子 42 下逐窗口输出的平方收益均值是 `0.026 / 0.1095 / 0.072 / 0.1066 / 0.085 / 0.1369 / 0.1764 / 0.1136 / 0.0912 / 0.0934 / 0.3136`，均值 0.1204——对照长期方差 $\omega/(1-\alpha-\beta)=0.01/0.06\approx0.167$：**个别窗口能冲到 0.31，安静窗口只有 0.026，差一个数量级；但整段的平均水平一直围着长期方差转**。把输出按时间顺序看，波动较大的窗口后面常常还会出现较大的窗口。GARCH 预测的是“风险大小”，不是“下一根 K 线一定上涨还是下跌”。

## 6. 练习

```exercise
# @title: 计算 GARCH 的下一步方差
# @check: 0.132
# @check: 1.0
# @hint: 先算 shock^2，再按 omega + alpha*shock^2 + beta*previous_variance 递推；长期方差是 omega/(1-alpha-beta)。

omega = 0.1
alpha = 0.1
beta = 0.8
previous_variance = 0.04
shock = 0.02

next_variance = omega + alpha * shock ** 2 + beta * shock ** 2  # ← 问题在这：beta 应乘上一期条件方差 previous_variance，不是冲击平方
long_run_variance = omega / (1 - alpha - beta)
print(round(next_variance, 3))
print(round(long_run_variance, 1))
```

:::warning[常见误区]

**误区一**：GARCH 预测收益率的涨跌方向。它主要预测条件波动率，方向仍可能接近随机。

**误区二**：$\alpha+\beta$ 越大越稳定。恰恰相反，越接近 1 表示冲击衰减越慢、波动持续性越强。

**误区三**：平方收益就是波动率。平方收益是波动代理量；模型还要区分条件方差、长期方差和标准差。

:::

```quiz
GARCH 模型中的 beta 主要表示什么？
- 当前观测的测量误差
- 过去的波动对下一期方差的持续影响 [*]
- 收益率的长期均值
- 价格的固定趋势
? beta 乘以上一期方差，把过去的波动传给下一期；beta 越大，波动聚集通常越持久。
```

## 7. 选读：从 ARCH 到 GARCH

ARCH(1) 只记住最近一次冲击，适合解释“今天的大跌让明天也危险”。GARCH(1,1) 额外记住上一期条件方差，相当于把波动本身也视为一个会缓慢演化的状态。这个递归状态的想法和卡尔曼滤波、隐马尔可夫模型相通：不可直接观测的量，通过可观测数据逐步更新。

## 8. 下一站

GARCH 给波动率也装上了状态方程，随机过程章至此全线收束：从格子上的马尔可夫链一路走到时变方差，静态概率已经长出时间的维度。带着整套引擎走进下一章《统计推断》，看它如何驶回真实数据。

→ [第 38 章 · 统计推断与实验设计](../38-statistical-inference/index.md)
