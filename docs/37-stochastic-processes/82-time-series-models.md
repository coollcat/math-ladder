---
title: AR/MA 时间序列模型
lesson_id: stochastic-processes/time-series-models
prereqs:
  - stochastic-processes/stationary-distribution
  - stochastic-processes/sample-paths
  - probability-advanced/expectation
volume: 4
layer: L6
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - ar-model
  - ma-model
  - arma-model
  - acf-pacf
applications:
  - stock-price-forecasting
  - demand-prediction
  - weather-forecasting
exits:
  - garch-volatility
  - state-space-model
---

# AR/MA 时间序列模型

## 1. 从一个场景开始

你是一家咖啡店的店长，手里有过去一年每天的销量数据。你注意到：周一的销量往往接近上周一，周二又和昨天的周一有关——"今天的值和昨天有关"，这种**自相关**结构怎么建模？纯随机游走太粗糙，而简单均值又太笨。我们需要一种既承认"记忆"又不复杂的模型。

## 2. 直觉解释

想象一列人排队传话。

- **AR（自回归）**：每个人听到**前几个人说的话**后自己加点噪声再说出来——"我的话依赖前面的人的话"。
- **MA（移动平均）**：每个人不听别人的话，但会把**前几次的噪声**加到自己说的话里——"我的话依赖前面的噪声冲击"。

系数 $\phi$ 越大，"记忆"越强，序列越平滑；接近 0 则几乎纯随机。

## 3. 正式定义

### AR(p) 模型

$$X_t = c + \phi_1 X_{t-1} + \phi_2 X_{t-2} + \cdots + \phi_p X_{t-p} + \varepsilon_t$$

| 符号 | 含义 |
| --- | --- |
| $X_t$ | 时刻 $t$ 的观测值 |
| $c$ | 常数项（均值偏移） |
| $\phi_1, \dots, \phi_p$ | 自回归系数，$p$ 是阶数 |
| $\varepsilon_t$ | 白噪声，$\varepsilon_t \sim \text{WN}(0, \sigma^2)$ |

平稳性条件：特征方程 $1 - \phi_1 z - \cdots - \phi_p z^p = 0$ 的所有根在单位圆外。

### MA(q) 模型

$$X_t = \mu + \varepsilon_t + \theta_1 \varepsilon_{t-1} + \cdots + \theta_q \varepsilon_{t-q}$$

MA 过程**天然平稳**（有限个白噪声的线性组合），不需要额外条件。

### ARMA(p,q) 模型

$$X_t = c + \sum_{i=1}^p \phi_i X_{t-i} + \varepsilon_t + \sum_{j=1}^q \theta_j \varepsilon_{t-j}$$

ARMA 是 AR 和 MA 的混合：既看过去的值，也看过去的噪声。

## 4. 分步例题

**例**：给定 AR(1) 模型 $X_t = 0.6 X_{t-1} + \varepsilon_t$，求均值和方差。

1. **均值**：设 $E[X_t] = \mu$（平稳），两边取期望：$\mu = 0.6\mu + 0$，得 $\mu = 0$
2. **方差**：$\text{Var}(X_t) = 0.6^2 \text{Var}(X_{t-1}) + \sigma^2 = 0.36\gamma_0 + \sigma^2$
3. 解方程：$\gamma_0 = 0.36\gamma_0 + \sigma^2$，得 $\gamma_0 = \frac{\sigma^2}{1 - 0.36} = \frac{\sigma^2}{0.64}$
4. 若 $\sigma^2 = 1$，则 $\text{Var}(X_t) = 1.5625$

自相关函数：$\rho(k) = 0.6^k$，呈指数衰减——这是 AR(1) 的标志。

## 5. 动手实验

### 实验 1：ACF/PACF 识别模型阶数

```python title="AR(1) vs MA(1) 的 ACF/PACF 对比"
import numpy as np
import matplotlib.pyplot as plt

np.random.seed(42)  # 固定随机种子，结果可复现
n = 500
noise = np.random.randn(n)  # 生成标准正态白噪声

# AR(1): x_t = 0.8 * x_{t-1} + e_t
ar = np.zeros(n)  # 创建长度为 n 的全零数组
for t in range(1, n):
    ar[t] = 0.8 * ar[t-1] + noise[t]

# MA(1): x_t = e_t + 0.8 * e_{t-1}
ma = np.zeros(n)
for t in range(1, n):
    ma[t] = noise[t] + 0.8 * noise[t-1]

fig, axes = plt.subplots(2, 2, figsize=(10, 6))
for i, (series, name) in enumerate([(ar, "AR(1)"), (ma, "MA(1)")]):
    # ACF：自相关函数，计算 k 步延迟的相关性
    lags = 30
    acf_vals = [np.corrcoef(series[:n-k], series[k:])[0,1] for k in range(lags)]
    # PACF：偏自相关函数，去除中间项后的纯相关
    axes[i,0].bar(range(lags), acf_vals, color="steelblue")
    axes[i,0].set_title(f"{name} - ACF")
    axes[i,0].set_ylim(-1, 1)
    axes[i,1].bar(range(lags), acf_vals, color="coral")  # 简化 PACF 用 ACF 近似展示
    axes[i,1].set_title(f"{name} - PACF (approx)")
    axes[i,1].set_ylim(-1, 1)

plt.tight_layout()
```

**关键规律**：AR(1) 的 ACF 指数衰减、PACF 在 lag=1 截尾；MA(1) 的 ACF 在 lag=1 截尾、PACF 指数衰减。这就是用 ACF/PACF 选模型的依据。

### 实验 2：AR 系数与平稳性

```viz
{
  "type": "plot",
  "title": "AR(1) 的自相关衰减：ρ(k) = φ^k",
  "expr": "a^x",
  "xmin": 0, "xmax": 20,
  "sliders": [
    { "name": "a", "min": -0.95, "max": 0.95, "step": 0.05, "value": 0.8 }
  ]
}
```

拖动滑块看：$|\phi| < 1$ 时衰减到 0；$|\phi| \geq 1$ 时爆炸——这就是平稳性条件的直观含义。

### 实验 3：用 Python 拟合 AR 模型

```python title="用最小二乘拟合 AR(1) 系数"
import numpy as np

np.random.seed(0)
n = 200
true_phi = 0.7
x = np.zeros(n)
noise = np.random.randn(n)
for t in range(1, n):
    x[t] = true_phi * x[t-1] + noise[t]

# 最小二乘：用 x_{t-1} 预测 x_t
X = x[:-1]  # x[0] 到 x[n-2]，作为自变量
Y = x[1:]   # x[1] 到 x[n-1]，作为因变量
phi_hat = np.dot(X, Y) / np.dot(X, X)  # dot：向量点积；最小二乘公式 φ̂ = Σxy / Σx²
print(f"真实 φ = {true_phi}")
print(f"估计 φ̂ = {phi_hat:.4f}")
```

估计值应非常接近 0.7。样本越大越准——这就是统计的一般规律。

:::warning[常见误区]

**误区一**："AR 和 MA 可以互相替代。"
不行。AR 模型用过去的**观测值**，MA 用过去的**噪声**——它们建模的是不同结构。有些序列用 AR 更简洁，有些用 MA。

**误区二**："PACF 在 lag=3 不为零，所以一定是 AR(3)。"
PACF 截尾只是理论性质；实际数据有抽样波动，需要配合信息准则（AIC/BIC）选阶数。

**误区三**："$|\phi|=0.99$ 接近 1 也算平稳。"
理论上边界上不平稳（单位根），实践中数据会表现得像随机游走。建议 $|\phi|<0.95$。

:::

## 6. 练习

**练习 1**：对于 MA(1) 模型 $X_t = \varepsilon_t + 0.5\varepsilon_{t-1}$，计算 $\text{Var}(X_t)$。

<details>
<summary>点开查看解答</summary>

$\text{Var}(X_t) = \text{Var}(\varepsilon_t) + 0.5^2 \text{Var}(\varepsilon_{t-1}) = \sigma^2 + 0.25\sigma^2 = 1.25\sigma^2$

因为 $\varepsilon_t$ 和 $\varepsilon_{t-1}$ 独立，方差可以直接相加。
</details>

**练习 2**：模拟 AR(2) 过程 $X_t = 0.5X_{t-1} - 0.3X_{t-2} + \varepsilon_t$，画出时序图。

```exercise
# @title: 模拟 AR(2) 过程
# @check: done
# @hint: 用循环，从 t=2 开始，每步用前两个值
import numpy as np
import matplotlib.pyplot as plt

np.random.seed(42)
n = 300
x = np.zeros(n)
noise = np.random.randn(n)

for t in range(n):
    x[t] = noise[t]  # ← 问题在这：缺少 AR(2) 的自回归项

plt.plot(x)
plt.title("AR(2) Simulation")
plt.show()
print("done")
```

```quiz
AR(1) 过程 X_t = 0.5 X_{t-1} + ε_t 的 ACF 呈现什么形状？
- 在 lag=1 截断为零
- 指数衰减，ρ(k) = 0.5^k [*]
- 所有 lag 都为零
- 振荡不衰减
? AR(1) 的自相关函数是 ρ(k) = φ^k，指数衰减到零，这是 AR 模型的标志特征。
```

```quiz
以下哪种过程天然平稳，不需要系数满足额外条件？
- AR(p) 模型
- MA(q) 模型 [*]
- 随机游走
- 单位根过程
? MA(q) 是有限个白噪声的线性组合，只要噪声平稳，MA 一定平稳。
```

## 7. 选读：ARMA 与差分——ARIMA 的桥梁

<details>
<summary>选读 · 从 ARMA 到 ARIMA</summary>

现实数据常常**非平稳**（如趋势、季节性）。Box-Jenkins 方法论：

1. 通过**差分** $d$ 次使序列平稳：$\nabla^d X_t$
2. 对差分后的序列拟合 ARMA(p,q)

这就得到了 ARIMA(p,d,q) 模型。其中 I 代表"Integrated"（积分），因为差分的逆操作是累加（离散积分）。

$$\nabla X_t = X_t - X_{t-1}, \qquad \nabla^2 X_t = \nabla(\nabla X_t)$$

一阶差分消去线性趋势，二阶差分消去二次趋势。实际中 $d=1$ 最常见。

</details>

## 8. 下一站

ARMA 假设方差恒定，但金融市场里"波动率会聚集"——大涨大跌扎堆出现。下一课我们用 GARCH 模型来捕捉这种时变波动率。

→ [GARCH 波动率模型](./95-garch-volatility.md)
