---
title: 扩散模型的完整推导：加噪与去噪的账本
lesson_id: generative/diffusion-math
prereqs:
  - generative/diffusion-denoising
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - noise-schedule
  - ddpm-reverse-process
  - noise-prediction-objective
applications:
  - image-generation
exits:
  - data-ai
---

# 扩散模型的完整推导：加噪与去噪的账本

## 1. 从一个场景开始

上一课你见过扩散模型的直觉：把图慢慢揉进噪声，再让网络学着一步步把噪声"擦"回去；本章实战挑战里我们也真的手算过三步加噪——只是那里偷偷做了个简化：把 DDPM 的 $\sqrt{\beta}$ 固定成 1，每步噪声强度一模一样。

真实的 DDPM 账本要精细得多：每步的噪声强度 $\beta_t$ 各不相同（先轻后重地排班）；反向的每一步不是拍脑袋"减噪声"，而是一个均值、方差都写得出解析式的高斯；训练目标"猜噪声"也不是天上掉下来的，而是从变分下界一步步塌缩出来的产物。这一课把这三笔账一次算清——算完，你就拿到了从"去噪直觉"通往 DDPM 论文的整段台阶。

## 2. 直觉解释

**第一笔账：$\beta_t$ 怎么排班（噪声调度）。** 把 $\beta$ 固定成同一个数有两难：调大了，画面刚显出的雏形很快被砸烂，网络来不及学"轻手轻脚"的小修正；调小了，要走到天荒地老。DDPM 的答案是让 $\beta_t$ 随步数爬坡：开局每步只掺一丁点噪声，收尾放大——前期大刀阔斧埋结构，后期细水长流磨细节。这张"每步强度表"叫**噪声调度**。2021 年的改良版把线性爬坡换成余弦包络，让信号被销毁的累计进度更平滑（下一节亲手看两条曲线）。

想盯住销毁进度，光看单步的 $\beta_t$ 不如记一本累计账：

$$\bar{\alpha}_t = (1-\beta_1)(1-\beta_2)\cdots(1-\beta_t)$$

$\bar{\alpha}_t$ 是"信号存留率"：走完 $t$ 步，原始信号还剩 $\sqrt{\bar{\alpha}_t}$ 倍。它是整本账的主角——跳步公式、反向均值方差、训练目标，全都要围着它转。

**第二笔账：任意时刻的直达快车。** 一步步走太慢，能不能从 $x_0$ 直接跳到任意第 $t$ 步？把两步串起来看：

$$x_2 = \sqrt{1-\beta_2}\big(\sqrt{1-\beta_1}\,x_0 + \sqrt{\beta_1}\,\varepsilon_1\big) + \sqrt{\beta_2}\,\varepsilon_2 = \sqrt{\bar{\alpha}_2}\,x_0 + \underbrace{\sqrt{(1-\beta_2)\beta_1}\,\varepsilon_1 + \sqrt{\beta_2}\,\varepsilon_2}_{\text{两份噪声}}$$

两份独立噪声的方差恰好相加：$(1-\beta_2)\beta_1 + \beta_2 = 1 - \bar{\alpha}_2$——不多不少，正好凑成一份标准差为 $\sqrt{1-\bar{\alpha}_2}$ 的高斯。于是任何时刻都能一步直达：

$$x_t = \sqrt{\bar{\alpha}_t}\, x_0 + \sqrt{1-\bar{\alpha}_t}\; \varepsilon$$

**第三笔账：反向到底怎么走。** 训练时我们手里同时有原始的 $x_0$ 和加噪得到的 $x_t$，问"上一步 $x_{t-1}$ 最可能在哪"——这是一个如假包换的贝叶斯问题（第 39 章的账本又回来了）。把"先验直觉"（没有 $x_t$ 时，$x_{t-1}$ 大概在哪）与"观测拉力"（$x_t$ 是从 $x_{t-1}$ 加噪来的）两个高斯按贝叶斯拼起来，答案出奇地干净：后验仍是一个高斯，均值是两路信息的加权平均，方差比单步的 $\beta_t$ 还小——知道终点 $x_0$，每一步反而更有把握。下一节把这两行公式正式写出来。

## 3. 正式定义

**前向过程**（写死的公式，零参数零学习）：

$$q(x_t \mid x_{t-1}) = N\big(x_t;\ \sqrt{1-\beta_t}\, x_{t-1},\ \beta_t\big), \qquad x_t = \sqrt{1-\beta_t}\, x_{t-1} + \sqrt{\beta_t}\, \varepsilon_t$$

$$x_t = \sqrt{\bar{\alpha}_t}\, x_0 + \sqrt{1-\bar{\alpha}_t}\; \varepsilon, \qquad \bar{\alpha}_t = \prod_{s=1}^{t} (1-\beta_s)$$

**噪声调度**两大家族：

$$\text{线性：}\ \beta_t = \beta_{\min} + \frac{t-1}{T-1}\,(\beta_{\max} - \beta_{\min}) \qquad \text{余弦：}\ \bar{\alpha}_t = \frac{f(t)}{f(0)},\ \ f(t) = \cos^2\!\left(\frac{t/T + s}{1+s}\cdot\frac{\pi}{2}\right)$$

**反向过程**：给定 $x_t$（训练时还知道 $x_0$），真实后验是高斯：

$$q(x_{t-1} \mid x_t, x_0) = N\big(\tilde{\mu}_t,\ \tilde{\beta}_t\big), \qquad \tilde{\mu}_t = \frac{\sqrt{\bar{\alpha}_{t-1}}\,\beta_t\, x_0 + \sqrt{1-\beta_t}\,(1-\bar{\alpha}_{t-1})\, x_t}{1-\bar{\alpha}_t}, \qquad \tilde{\beta}_t = \frac{1-\bar{\alpha}_{t-1}}{1-\bar{\alpha}_t}\,\beta_t$$

**训练目标**：网络 $\varepsilon_\theta(x_t, t)$ 看着脏图猜本步掺入的噪声，损失是均方误差：

$$L = \mathbb{E}\big[\lVert \varepsilon - \varepsilon_\theta(\sqrt{\bar{\alpha}_t}\,x_0 + \sqrt{1-\bar{\alpha}_t}\,\varepsilon,\ t) \rVert^2\big]$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\beta_t$ | 单步噪声强度 | 调度表第 $t$ 格：本步掺入的噪声方差 |
| $\bar{\alpha}_t$ | 信号存留率 | $(1-\beta)$ 的连乘；信号成分乘 $\sqrt{\bar{\alpha}_t}$ |
| $\tilde{\mu}_t$ | 反向均值 | 知道 $x_t$（与 $x_0$）时，上一步的期望位置 |
| $\tilde{\beta}_t$ | 反向方差 | 恒小于 $\beta_t$：知道终点，步子更稳 |
| $\varepsilon_\theta$ | 噪声预测网络 | 唯一被训练的部件；采样时由它换算反向均值 |

两条性质：

1. **账本自洽**：由直达式立即读出 $\mathbb{E}[x_t \mid x_0] = \sqrt{\bar{\alpha}_t}\, x_0$、$\mathrm{Var}(x_t \mid x_0) = 1 - \bar{\alpha}_t$——均值萎缩与方差膨胀由同一个 $\bar{\alpha}_t$ 记账，画面始终"亮度正常"，只是越来越花；
2. **方差可以不学**：采样时把反向方差固定成 $\tilde{\beta}_t$（甚至 $\beta_t$），成图质量几乎不掉——网络只需输出噪声预测，均值按公式现场换算。这是"猜噪声"目标能成立的前提之一。

## 4. 分步例题

取两步小账本：$\beta_1 = 0.1$、$\beta_2 = 0.2$（一个微型调度表），$x_0 = 8$，两步噪声定成 $\varepsilon_1 = 1$、$\varepsilon_2 = -1$。

1. **逐步走**：$x_1 = \sqrt{0.9}\times 8 + \sqrt{0.1}\times 1 \approx 7.9057$；$x_2 = \sqrt{0.8}\times 7.9057 - \sqrt{0.2} \approx 6.6239$；
2. **跳步对账**：$\bar{\alpha}_2 = 0.9 \times 0.8 = 0.72$，直达式宣称 $x_2 = \sqrt{0.72}\times 8 + \sqrt{0.28}\,\varepsilon = 6.7882 + 0.5292\,\varepsilon$。反解等效噪声 $\varepsilon = (6.6239 - 6.7882)/0.5292 \approx -0.3106$——两份噪声果然折合成了一枚标准高斯；
3. **反向均值（$x_0$ 版公式）**：$\tilde{\mu}_2 = \dfrac{\sqrt{0.9}\times 0.2\times 8 + \sqrt{0.8}\times 0.1\times 6.6239}{1-0.72} \approx 7.5370$；
4. **反向均值（$\varepsilon$ 版公式）**：$\tilde{\mu}_t = \dfrac{1}{\sqrt{1-\beta_t}}\left(x_t - \dfrac{\beta_t}{\sqrt{1-\bar{\alpha}_t}}\,\varepsilon\right)$，代入得 $\dfrac{1}{\sqrt{0.8}}\left(6.6239 - \dfrac{0.2}{\sqrt{0.28}}\times(-0.3106)\right) \approx 7.5370$——两套写法精确相等（$\varepsilon$ 版就是把 $x_0 = (x_t - \sqrt{1-\bar{\alpha}_t}\,\varepsilon)/\sqrt{\bar{\alpha}_t}$ 代进 $x_0$ 版重排的结果）；
5. **反向方差**：$\tilde{\beta}_2 = \dfrac{1-0.9}{1-0.72}\times 0.2 \approx 0.0714$，确实比单步的 $\beta_2 = 0.2$ 小——知道 $x_0 = 8$ 之后，"上一步在哪"的把握大增。

值得停一秒：实测走出来的 $x_1 = 7.9057$ 并不等于后验均值 $7.5370$。后验均值是"所有与 $(x_2, x_0)$ 相容的来路"的平均，不是对单条轨迹的复读——网络要学的正是这个平均意义下的账。

## 5. 动手实验

### 实验 1（viz）：两种调度表的"存留率曲线"

蓝线是线性调度（把前 $x$ 步的爬坡折算成平均 $\beta$ 的近似），橙线是余弦调度的精确闭式。拖动 $\beta$ 的起止档位与总步数：线性曲线近似匀速下滑，余弦曲线是 S 形——前期几乎无损、中段陡降、收尾放平。"信息的主体"被余弦调度安排在最顺滑的中段处理。

```viz
{
  "type": "plot",
  "title": "信号存留率 abar(t)：线性 vs 余弦调度",
  "expr": "(1 - (b0 + (b1 - b0) * (x - 1) / (2 * (T - 1)))) ^ x",
  "expr2": "cos(((x / T + 0.008) / 1.008) * pi / 2) ^ 2",
  "label": "线性（平均 β 近似）",
  "label2": "余弦（精确）",
  "xmin": 1,
  "xmax": 1000,
  "sliders": [
    { "name": "b0", "min": 0.0005, "max": 0.005, "step": 0.0005, "value": 0.001 },
    { "name": "b1", "min": 0.005, "max": 0.05, "step": 0.005, "value": 0.02 },
    { "name": "T", "min": 200, "max": 1000, "step": 100, "value": 1000 }
  ]
}
```

### 实验 2（python）：单步账本实测——均值方差对得上吗

单步公式宣称：均值 $\sqrt{1-\beta}\, x_{t-1}$、方差恰为 $\beta$。抽十万次看实测贴不贴（公式一侧应打出均值 $7.155$、方差 $0.2$；实测一侧每次运行只在小数点后两三位内抖动）：

```python title="单步加噪的均值与方差实测"
import random
import math

random.seed(7)
x_prev = 8.0          # 上一步的状态
beta = 0.2            # 本步噪声强度（调度表当前格）

trials = 100000
acc = 0.0
acc_sq = 0.0
for k in range(trials):
    eps = random.gauss(0, 1)      # 标准正态噪声：均值 0、标准差 1
    x_new = math.sqrt(1 - beta) * x_prev + math.sqrt(beta) * eps
    acc = acc + x_new
    acc_sq = acc_sq + x_new * x_new

mean_sim = acc / trials
var_sim = acc_sq / trials - mean_sim * mean_sim
print("实测均值 =", round(mean_sim, 3), "；公式宣称 =", round(math.sqrt(1 - beta) * x_prev, 3))
print("实测方差 =", round(var_sim, 3), "；公式宣称 =", beta)
```

### 实验 3（python）：反向均值两版对账（纯手算可复现）

把例题的两步账本交给程序重算：$x_0$ 版、$\varepsilon$ 版，再加一位"独立第三方"——直接手搓贝叶斯加权（先验是 $x_1 \sim N(\sqrt{0.9}\times 8,\ 0.1)$，观测是 $x_2$ 从 $\sqrt{0.8}\,x_1$ 处加噪而来）。三个数必须一字不差：

```python title="反向均值：两套公式加手搓贝叶斯，三方对账"
import math

x0 = 8.0                     # 原始信号
x2 = 6.6239                  # 走完两步后的状态（例题实测值）
b1 = 0.1                     # 第一步噪声强度
b2 = 0.2                     # 第二步噪声强度
abar1 = 1 - b1               # 存留率账本：abar_1 = 0.9
abar2 = (1 - b1) * (1 - b2)  # 存留率账本：abar_2 = 0.72

mean_x0 = (math.sqrt(abar1) * b2 * x0 + math.sqrt(1 - b2) * (1 - abar1) * x2) / (1 - abar2)

eps_eff = (x2 - math.sqrt(abar2) * x0) / math.sqrt(1 - abar2)
mean_eps = (x2 - b2 / math.sqrt(1 - abar2) * eps_eff) / math.sqrt(1 - b2)

prec = 1 / b1 + (1 - b2) / b2            # 先验精度加观测精度
mean_bayes = (math.sqrt(abar1) * x0 / b1 + math.sqrt(1 - b2) * x2 / b2) / prec

print("x0 版均值  =", round(mean_x0, 4))
print("ε 版均值   =", round(mean_eps, 4))
print("手搓贝叶斯 =", round(mean_bayes, 4))
print("后验方差   =", round((1 - abar1) / (1 - abar2) * b2, 4))
```

三行均值都是 $7.537$、后验方差 $0.0714$——解析公式、重排形式、贝叶斯加权在同一个点上会师，这本账闭环了。

### 快问快答

```quiz
训练好的 DDPM 采样时，网络每一步实际输出的是什么？
- 一张完整的成品图
- 本步噪声的预测值，均值由它换算、再配一份固定方差去采样 [*]
- 下一步该把 β 调大还是调小
? 反向方差被固定成不学的量，网络唯一的输出是噪声预测；采样时按均值公式换算方向、按固定方差加一点随机性，一步步走到 t=0。
```

::::warning[常见误区]

**误区一**："你以为 β_t 是常数。" 上一课为教学固定了 β；真实 DDPM 用线性爬坡或余弦包络的调度表。调度的本质是安排"信息销毁"的节奏——它直接影响训练难度与成图质量。

**误区二**："你以为反向过程是逐步'减去噪声'。" 反向每一步是从一个高斯里采样：均值里扣掉预测噪声的大头，方差里还留一份随机性（所以同一提示词两次生成结果不同）。均值公式来自贝叶斯，不是拍脑袋的减法。

**误区三**："你以为训练目标天生就是均方误差。" 完整的变分下界是一串 KL 加权的总账（ELBO 家族）；固定反向方差并重参数化之后，它才塌缩成"猜噪声"的均方误差。简化是挣来的，不是白送的。

::::

## 6. 练习

**练习 1**（概念口答）：反向方差公式 $\tilde{\beta}_t = \frac{1-\bar{\alpha}_{t-1}}{1-\bar{\alpha}_t}\,\beta_t$ 里藏着一个"越走越稳"的秘密——为什么 $\tilde{\beta}_t$ 永远小于 $\beta_t$？

<details>
<summary>点开查看逐步解答</summary>

调度保证存留率一路下降：$\bar{\alpha}_{t-1} > \bar{\alpha}_t$，于是 $1-\bar{\alpha}_{t-1} < 1-\bar{\alpha}_t$，比值恒在 0 与 1 之间。换句话说：条件上"知道终点 $x_0$"之后，不确定性只会缩小不会放大——这是贝叶斯更新的一般脾气。数值复核：例题里 $\tilde{\beta}_2 = 0.0714 < \beta_2 = 0.2$。
</details>

**练习 2**（判题）：直达快车公式是本课的枢纽。现在它能跑，但两个系数都没开根号——信号按方差缩、噪声按方差掺，账全记错了：

```exercise
# @title: 练习：把任意时刻的直达快车修对
# @check: 6.7882
# @check: 0.5292
# @hint: 存留率是 abar，但信号成分乘 sqrt(abar)、噪声成分乘 sqrt(1-abar)——两个 sqrt 各管一头，一个都不能丢。
import math

abar = 0.72                    # 两步后的存留率：(1-0.1)*(1-0.2)

def jump(x0, abar, eps):
    return x0 * abar + eps * (1 - abar)   # ← 问题在这：忘了开根号，乘的是方差不是标准差

print(round(jump(8.0, abar, 0.0), 4))
print(round(jump(0.0, abar, 1.0), 4))
```

第一行把噪声关掉（eps = 0），专查信号那一半：修好后输出 $8\sqrt{0.72} = 6.7882$；第二行把信号关掉，专查噪声那一半：$\sqrt{0.28} = 0.5292$。两行分别卡住账本的两端。

## 7. 选读：均方误差是从哪一步塌缩出来的

<details>
<summary>选读 · 从变分下界到"猜噪声"的三步</summary>

完整的目标是变分下界（[变分推断、ELBO 与 VAE](./52-elbo-vae.md) 里的天花板家族成员）：把逆向每一步与真实后验的 KL 加起来。塌缩有三步——第一步，把反向分布设计成与真实后验同方差的高斯，两个同方差高斯的 KL 恰好是均值差的平方，方差项整列消失；第二步，均值经重参数化改写成噪声预测的形式，"对准均值"变成"猜对那把 $\varepsilon$"；第三步，训练时每次随机抽一个时刻 $t$、抽一把 $\varepsilon$，直接算 $\lVert \varepsilon - \varepsilon_\theta(x_t, t)\rVert^2$，连逐项权重都简化成 1。三步走完，变分下界变成了一道最好下饭的均方误差。

"预测噪声"还能换算成"预测密度坡度"：最优的噪声预测乘一个只依赖 $\bar{\alpha}_t$ 的系数，恰是对数密度的梯度（score）——[Score matching 直觉](./76-score-matching.md) 的指北针场由此接上。再把离散的时刻 $t$ 换成连续时间，整本账就流成一条随机微分方程：第 55 章 [随机微分方程与 SDE 网络](../55-scientific-ml/60-sde-networks.md) 正等着从河的这头接棒。
</details>

## 8. 下一站

扩散的账本记完了：调度表排好班、直达快车通到任意时刻、反向均值方差有解析式、训练目标塌缩成一道均方误差。接下来换一条生成路线——不掺噪声，改逐位打字：概率链式法则怎么把一张天文数字大的联合概率表，切成一位一位的小表？

→ [自回归模型与条件分解](./45-autoregressive-models.md)
