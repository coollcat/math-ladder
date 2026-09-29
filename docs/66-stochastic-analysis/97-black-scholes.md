---
title: Black–Scholes：Itô 引理最著名的出口
lesson_id: stochastic-analysis/black-scholes
prereqs:
  - stochastic-analysis/ito-lemma-gbm
  - stochastic-analysis/girsanov-martingale
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
---

# Black–Scholes：Itô 引理最著名的出口

## 1. 从一个场景开始

1973 年，期权市场刚开张。一张"三个月后可以按 100 美元买入某只股票"的合约，到底该卖多少钱？有人看涨、有人看跌，谁也说服不了谁。

Black 和 Scholes 交出一张纸：把现价、行权价、利率、波动率、剩余时间五个数代进去，**几行乘除加一次查表**，得到一个确定的数。市场先是半信半疑，后来这张纸被刻进了每一台交易终端。

本课的目标不是背公式，而是看清它是怎么被"逼"出来的：**复制组合 → 无套利 → 风险中性 → 贴现价格是鞅 → BS 公式**。这条链上的每一环，前面十门随机分析课都已经备好了零件。

## 2. 直觉解释

**第一步：期权能被股票和现金复制。**
假设股价只有两种未来（涨到 120 或跌到 80），期权到期时也就只有两个价格（20 或 0）。找一份"股票 + 现金"的组合，让它在两种未来里都与期权收益分毫不差——那么这份组合的成本就是期权的价格。**否则就存在无风险套利**：买便宜的、卖贵的，两边对冲，空手套白狼。

**第二步：复制把漂移整段消掉。**
奇妙的地方来了：上面那个组合里，股价"平均会涨多少"根本没出现。因为组合里同时有股票和现金，涨的那部分收益被空头对冲掉了——**定价只依赖波动，不依赖方向**。

**第三步：换个记账口径（第 95 课）。**
等价的说法是：换一副眼镜看世界。在**风险中性测度** $Q$ 下，所有资产的漂移都被统一换算成无风险利率 $r$，于是"贴现后的价格"变成一个**鞅**——今天的价格 = 贴现后的未来期望。

最后一句话收尾：**期权价格 = 在 $Q$ 下、把到期收益贴现回来的期望。** 这就是 BS 公式的全部思想。

## 3. 正式定义

**几何布朗运动（第 50 课）**：$dS_t = \mu S_t\,dt + \sigma S_t\,dW_t$，其中 $\mu$ 是真实漂移、$\sigma$ 是波动率。

**风险中性测度（第 95 课）**：用 Girsanov 密度换掉漂移，得到

$$dS_t = r\,S_t\,dt + \sigma S_t\,d\widetilde W_t ,$$

$\widetilde W_t$ 在新测度 $Q$ 下是标准布朗运动。**贴现价格是鞅**：

$$e^{-rt}S_t \text{ 在 } Q \text{ 下是鞅}\ \Longrightarrow\ V_0 = \operatorname{E}_Q\bigl[e^{-rT}V_T\bigr].$$

**Black–Scholes 公式**（看涨期权，到期收益 $(S_T-K)^+$）：

$$C = S_0\,\Phi(d_1) - K e^{-rT}\Phi(d_2),\qquad d_1 = \frac{\ln(S_0/K) + \bigl(r+\tfrac12\sigma^2\bigr)T}{\sigma\sqrt T},\qquad d_2 = d_1 - \sigma\sqrt T .$$

看跌期权由**平价关系**立刻得到：$C - P = S_0 - Ke^{-rT}$。

**希腊字母**（对价格求偏导）：$\Delta = \dfrac{\partial C}{\partial S} = \Phi(d_1)$，$\Gamma = \dfrac{\partial^2 C}{\partial S^2}$，$\mathrm{Vega} = \dfrac{\partial C}{\partial \sigma}$。

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $S_0(S_t)$ | 现价 | 定价的起点；后面所有量都由它派生 |
| $K$ | 行权价 | 到期能按什么价买入 |
| $r$ | 无风险利率 | 只出现在两处：贴现因子与 $Q$ 下的漂移 |
| $\sigma$ | 波动率 | 唯一的"市场温度"，也是公式真正的输入 |
| $\Phi(\cdot)$ | 标准正态分布函数 | $\Phi(z)=\tfrac12\bigl(1+\mathrm{erf}(z/\sqrt2)\bigr)$，查表/调库即可 |
| $d_1,d_2$ | 两段"距离" | 都带量纲 1（个数），$d_2 = d_1-\sigma\sqrt T$ |
| $\mu$ | 真实漂移 | **公式里根本不出现**——被复制组合消掉了 |

## 4. 分步例题

**例 1（单期复制组合手算）**：$S_0=100$，一年后涨到 120 或跌到 80，$r=0$，$K=100$。

1. 期权收益：涨 → $20$，跌 → $0$；
2. 设组合为"$\Delta$ 份股票 + 借入现金 $B$"，要求两种情形都吻合：
   up：$120\Delta - B = 20$；down：$80\Delta - B = 0$；
3. 两式相减：$40\Delta = 20$，得 $\Delta = 0.5$；代回得 $B = 40$；
4. 组合成本：$0.5\times100 - 40 = 10$——**这就是期权价格**；
5. 交叉验证：风险中性概率 $p = \dfrac{1+r-d}{u-d} = \dfrac{1-0.8}{0.4} = 0.5$，$Q$ 下期望收益 $0.5\times20 = 10$，与成本一致 ✓。

$\Delta = 0.5$ 正是"复制组合里该拿几份股票"——第 3 节把它升级成了 $\Phi(d_1)$。

**例 2（BS 公式手算）**：$S_0=100,\ K=100,\ r=0.05,\ \sigma=0.2,\ T=1$。

1. $d_1 = \dfrac{\ln 1 + (0.05+0.02)\times1}{0.2\times1} = \dfrac{0.07}{0.2} = 0.35$；
2. $d_2 = 0.35-0.2 = 0.15$；
3. 查表：$\Phi(0.35) = 0.63683$，$\Phi(0.15) = 0.55962$；
4. 贴现因子 $e^{-0.05} = 0.951229$；
5. $C = 100\times0.63683 - 100\times0.951229\times0.55962 = 63.683 - 53.235 = 10.45$。

**例 3（平价关系对账）**：承接例 2。

1. 看跌价 $P = C - S_0 + Ke^{-rT} = 10.45 - 100 + 95.123 = 5.57$；
2. 右侧理论值：$S_0 - Ke^{-rT} = 100 - 95.1229 = 4.8771$；
3. 左侧：$C - P = 10.4506 - 5.5735 = 4.8771$ ✓。

**平价关系不依赖任何模型假设**——它只需要"看涨 + 现金 = 看跌 + 股票"这一个无套利论证。所以任何定价公式都必须满足它，是可以立刻拿来验货的尺子。

## 5. 动手实验

先看清"到期收益"长什么样。下面两条折线分别是看涨与看跌的收益：**K 左边看涨一文不值、看跌全是价值；K 右边恰好相反**。

```viz
{
  "type": "plot",
  "title": "到期收益：看涨是曲棍球杆，看跌是它的镜像",
  "expr": "(x-K+abs(x-K))/2",
  "label": "看涨 max(S−K, 0)",
  "expr2": "(K-x+abs(K-x))/2",
  "label2": "看跌 max(K−S, 0)",
  "xmin": 0,
  "xmax": 200,
  "sliders": [
    { "name": "K", "min": 50, "max": 150, "step": 10, "value": 100 }
  ]
}
```

拖动 $K$ 看折点整体平移。（表达式里的 `abs` 是在手工拼出 `max`：$\max(a,0)=\frac{a+|a|}{2}$，因为绘图表达式只认 `abs`。）**注意这两条线是"到期时刻"的收益，不是今天的价格**——把折线按 $Q$ 折成期望再贴现，才得到价格。

第一步，用蒙特卡洛把风险中性期望跑出来。

```python title="蒙特卡洛定价：把风险中性期望跑出来"
import random                      # 随机数库（第 0 章出生）
import math                        # math.exp / math.sqrt：GBM 的两个零件

random.seed(97)                    # 固定种子：结果可复现
S0, K, r, sigma, T = 100, 100, 0.05, 0.2, 1.0   # 现价/行权价/利率/波动率/到期

N = 200000                         # 路径条数
total = 0.0                        # 贴现收益的累加器
total_sq = 0.0                     # 贴现收益平方的累加器（用来估标准误）
for _ in range(N):
    z = random.gauss(0, 1)                                   # 标准正态随机数
    # 风险中性 GBM 的终点：对数漂移 r − σ²/2，对数波动 σ√T（第 50 课的对数骨架）
    ST = S0 * math.exp((r - sigma ** 2 / 2) * T + sigma * math.sqrt(T) * z)
    payoff = max(ST - K, 0.0)                                # 看涨收益：涨过 K 才有钱
    disc = math.exp(-r * T) * payoff                         # 贴现回今天
    total += disc
    total_sq += disc * disc

mean = total / N                                             # 蒙特卡洛价格
var = total_sq / N - mean * mean                             # 样本方差
print("蒙特卡洛价格 =", round(mean, 2))
print("标准误       =", round(math.sqrt(var / N), 3))
```

种子 97 跑出 `10.39`，标准误约 `0.033`。等一下和解析答案对账。

第二步，用解析公式算同一个数——这里第一次用到 `math.erf`：**误差函数**，它把正态曲线下的面积变成一行算术，$\Phi(z)=\tfrac12(1+\mathrm{erf}(z/\sqrt2))$，于是不用查表也能算 $\Phi$。

```python title="解析公式：一行算出 BS 价格，顺手验平价"
import math

def Phi(z):
    """标准正态分布函数 Φ(z)：把误差函数换算成正态曲线下的面积"""
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))            # erf：误差函数

S0, K, r, sigma, T = 100, 100, 0.05, 0.2, 1.0
d1 = (math.log(S0 / K) + (r + sigma ** 2 / 2) * T) / (sigma * math.sqrt(T))
d2 = d1 - sigma * math.sqrt(T)

call = S0 * Phi(d1) - K * math.exp(-r * T) * Phi(d2)         # 看涨：BS 公式
put = K * math.exp(-r * T) * Phi(-d2) - S0 * Phi(-d1)        # 看跌：对称形式

print("d1 =", round(d1, 4), " d2 =", round(d2, 4))
print("看涨 C =", round(call, 2), " 看跌 P =", round(put, 2))
print("平价 C−P =", round(call - put, 4), " 对比 S0−Ke^(−rT) =", round(S0 - K * math.exp(-r * T), 4))
print("Delta = Φ(d1) =", round(Phi(d1), 4))
```

解析答案 `10.45`，蒙特卡洛 `10.39`——**两万次随机抽样的结果落在解析值约两个标准误之内**，这就是"随机算法的误差可量化"的日常含义。同时 `Delta = 0.6368`：想复制这张期权，今天该持有约 0.64 份股票。把它和例 1 单期模型里的 $\Delta=0.5$ 对照，会发现 $d_1 \to \infty$（深度实值）时 $\Phi(d_1)\to1$：那时期权几乎就是股票本身。

### 快问快答

```quiz
为什么 Black–Scholes 公式里没有出现股票的真实期望收益率？
- 因为假设股票收益率等于无风险利率
- 因为复制组合把方向性风险对冲掉了，价格由无套利唯一决定，与真实漂移无关 [*]
- 因为真实收益率无法估计，所以公式忽略了它
? 复制组合同时持有股票与现金，涨跌两头的收益差被对冲平掉，真实漂移 μ 在消元过程中一并消失。真实世界里股价该按 μ 涨还是照样按 μ 涨，公式只是不去用它——这也是 BS 最"反直觉"却最深刻的地方。
```

:::warning[常见误区]

**误区一**："BS 价格是对未来股价的预测。"
不是。它是一个**无套利复制成本**：今天按这个价成交，卖方的对冲组合可以无风险地把义务履行掉；偏离这个价就会被套利抹平。它预测的是价格的上界与下界，不是方向。

**误区二**："$Q$ 下的风险中性概率是市场真实的概率。"
$Q$ 只是一副**记账眼镜**：它让贴现价格变成鞅，好让期望值直接当价格用。真实世界的涨跌概率是 $P$ 下的事（第 95 课）。用"一半一半"去解释 $Q$ 概率，等于把记账口径误当成天气预报。

**误区三**："公式里有 $r$，说明股票会按 $r$ 增长。"
在 $Q$ 下确实如此，但那是**换算出来的漂移**，不是真实的期望涨速。$r$ 只出现在两处：贴现因子 $e^{-rT}$，以及 $Q$ 世界里的漂移——它代表"钱的时间价值"，不代表对股票的判断。

:::

## 6. 练习

**练习 1**：下面的代码实现了 BS 公式，但把两个 $\Phi$ 装反了，价格算成了负数。改到输出 `10.45`：

```exercise
# @title: 练习：修好 Black–Scholes 公式
# @check: 10.45
# @hint: 看涨公式是 S0·Φ(d1) − K·e^(−rT)·Φ(d2)，第一项配 d1、第二项配 d2。价格算成负数，就是两个 Φ 装反了。
import math

def Phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))

S0, K, r, sigma, T = 100, 100, 0.05, 0.2, 1.0
d1 = (math.log(S0 / K) + (r + sigma ** 2 / 2) * T) / (sigma * math.sqrt(T))
d2 = d1 - sigma * math.sqrt(T)

call = S0 * Phi(d2) - K * math.exp(-r * T) * Phi(d1)     # ← 两个 Φ 装反了
print(round(call, 2))
```

**练习 2**：把波动率从 $0.2$ 改成 $0.4$，重新算一遍看涨价格（其余参数不变），并解释为什么涨得比"翻倍"更多。

<details>
<summary>点开查看逐步解答</summary>

$\sigma=0.4$ 时 $d_1 = \dfrac{0.05+0.08}{0.4} = 0.325$，$d_2 = 0.325-0.4 = -0.075$。
$\Phi(0.325)\approx0.6274$，$\Phi(-0.075)\approx0.4701$。

$C = 100\times0.6274 - 95.1229\times0.4701 = 62.74 - 44.72 = 18.02$。

从 10.45 涨到 18.02——**不是翻倍，而是约 $1.72$ 倍**。价格对波动率单调递增（波动越大，"单向保护"越值钱），但增长快慢由 $\mathrm{Vega}$ 决定，而 $\mathrm{Vega}$ 本身也随 $\sigma$ 变化，所以不会精确成比例。原因在收益的形状：它被截断在 0——波动放大时上涨侧的好处全额保留，下跌侧最多亏到 0，这份不对称的保护让 $\sigma$ 直接变成了价格里的一个独立变量。

```python
import math
def Phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))
S0, K, r, T = 100, 100, 0.05, 1.0
for sigma in [0.2, 0.4]:
    d1 = (math.log(S0 / K) + (r + sigma ** 2 / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    print(sigma, round(S0 * Phi(d1) - K * math.exp(-r * T) * Phi(d2), 2))
```

</details>

**趁热打铁**：

```quiz
希腊字母 Delta 在复制组合里代表什么？
- 期权价格对时间的敏感度
- 复制一份期权需要持有的股票份数 [*]
- 期权价格对波动率的敏感度
? Delta = ∂C/∂S = Φ(d1)，正是复制的股票份数：股价动一点，期权价格跟着动 Φ(d1) 倍。对时间的敏感度叫 Theta，对波动率的敏感度是 Vega。
```

## 7. 选读：从 Itô 引理推出 Black–Scholes 方程

<details>
<summary>选读 · 1973 年那篇论文的两页核心</summary>

设期权价格 $V(S,t)$ 是股价与时间的函数，构造对冲组合

$$\Pi = V - \Delta\,S .$$

由 Itô 引理（第 50 课），

$$dV = \Bigl(\frac{\partial V}{\partial t} + \tfrac12\sigma^2S^2\frac{\partial^2 V}{\partial S^2}\Bigr)dt + \frac{\partial V}{\partial S}\,dS .$$

于是

$$d\Pi = \Bigl(\frac{\partial V}{\partial t} + \tfrac12\sigma^2S^2\frac{\partial^2 V}{\partial S^2}\Bigr)dt + \Bigl(\frac{\partial V}{\partial S}-\Delta\Bigr)dS .$$

**取 $\Delta = \partial V/\partial S$，含 $dS$ 的那一项当场清零**——这正是"复制消掉方向性风险"在方程层面的样子。剩下的 $\Pi$ 是无风险组合，无套利要求它只能按无风险利率增长：

$$d\Pi = r\Pi\,dt .$$

把两式对齐、约去 $dt$，得到著名的 **Black–Scholes 方程**：

$$\frac{\partial V}{\partial t} + \tfrac12\sigma^2S^2\frac{\partial^2 V}{\partial S^2} + rS\frac{\partial V}{\partial S} - rV = 0,$$

边界条件 $V(S,T) = (S-K)^+$。解这个偏微分方程就得到第 3 节的公式——这也是为什么 BS 公式与热方程共享同一套数学（回忆第 23 章：它是倒向热方程）。

**注意 $\mu$ 的下落**：它在第一次代换里就随 $dS$ 一起被消掉了，全程没机会进入方程。这不是巧合，而是"复制 + 无套利"的必然结果——**唯一无法消除的市场信息只剩 $\sigma$**。这也解释了为什么期权交易台上争论的从来不是"股票会涨多少"，而是"波动率该定多少"——后者就是所谓**隐含波动率**。

</details>

## 8. 下一站

BS 公式是 Itô 引理的出口，也是整条随机分析路线的汇流处：布朗运动的三副面孔、平方账本、Itô 积分、修正项、数值发动机、两杆秤、密度云、回归风、汇率表——最后都在这一张公式里结账。

→ [随机分析章首页](./index.md)：重温从随机游走到无套利定价的完整路线图。
