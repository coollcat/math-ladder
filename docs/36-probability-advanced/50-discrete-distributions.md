---
title: 离散分布四大家族
lesson_id: probability-advanced/discrete-distributions
prereqs:
  - probability-advanced/expectation
  - prob/counting
  - combinatorics/count-principles
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - bernoulli-distribution
  - binomial-distribution
  - geometric-distribution
  - poisson-distribution
applications:
  - call-center-staffing
  - reliability-counting
exits:
  - data-ai
---

# 离散分布四大家族：伯努利、二项、几何、泊松

## 1. 从一个场景开始

客服中心的主管要排班，需要回答三个问题：**下一通电话是不是投诉？**（一次成败）**接满 20 通电话会有几起投诉？**（成功计数）**平均等多少通才来第一起投诉？**（等待次数）——以及深夜档的终极难题：**下一个小时会进来几个电话？**（稀有事件计数）

四个问题对应四个经典分布。它们不是四个孤立公式，而是同一颗种子（伯努利试验）长出的四代亲属：认亲的关键是看清每个场景"在数什么"。

## 2. 直觉解释

一切从**伯努利试验**开始：一次只有成、败两种结局的随机实验（抛一次偏硬币）。四家族是它的四种"数法"：

| 分布 | 在数什么 | 一句话画像 |
| --- | --- | --- |
| 伯努利 | 数 **1 次**里的成功与否 | 一枚偏硬币 |
| 二项 | 数 **n 次独立**试验里的成功总次数 | n 枚同款硬币一起抛 |
| 几何 | 等**第一次成功**要试几次 | 连抛到第一次正面 |
| 泊松 | 单位时间/面积内**稀有事件**的个数 | 每小时来电数 |

泊松看起来血统最远，其实它是二项的极限形态：当试验次数 $n$ 很大、单次概率 $p$ 很小而乘积 $\lambda=np$ 温和时，"n 人里恰有 k 个中招"几乎等于"强度 λ 的泊松计数恰好为 k"。罕见事件天然偏爱这个极限。

## 3. 正式定义

设单次成功率 $p$，独立重复 $n$ 次：

$$P(X=k)=\binom{n}{k}p^k(1-p)^{n-k} \qquad (\text{二项 } B(n,p))$$

$$P(Y=k)=p(1-p)^{k-1},\quad k=1,2,\dots \qquad (\text{几何：第 } k \text{ 次首次成功})$$

$$P(Z=k)=e^{-\lambda}\frac{\lambda^k}{k!} \qquad (\text{泊松 Poisson}(\lambda))$$

三行公式的重心与胖瘦可以查表报出——期望方差工具一用一个准：

| 分布 | 参数 | 期望 | 方差 |
| --- | --- | --- | --- |
| 伯努利 | $p$ | $p$ | $p(1-p)$ |
| 二项 | $n,p$ | $np$ | $np(1-p)$ |
| 几何 | $p$ | $1/p$ | $(1-p)/p^2$ |
| 泊松 | $\lambda$ | $\lambda$ | $\lambda$ |

泊松那一行的整齐值得多看一眼：**均值方差相等**，这是它独一无二的指纹，实战中常用来自检"该不该用泊松建模"。

## 4. 分步例题

**例**：一台数控机床每次加工的次品率为 0.1。加工 5 件，恰有 3 件次品的概率是多少？

1. 认模型：5 次独立、每次成功（出次品）率固定 → 二项 $B(5, 0.1)$；
2. 写公式：$P(X=3)=\binom{5}{3}(0.1)^3(0.9)^2$；
3. 组合数：$\binom{5}{3}=10$（哪 3 件是次品有 10 种选法）；
4. 代入：$10\times0.001\times0.81=0.0081$；
5. 用期望体检：$E[X]=5\times0.1=0.5$ 件。"恰好 3 件"远超平均水平，概率不足百分之一合情合理 ✓。

## 5. 动手实验

### 实验 1（viz）：先看最原始的一代——伯努利

```viz
{
  "type": "coinlaw",
  "title": "伯努利试验：频率向 p 收敛"
}
```

连点「+1000」，蓝线趴向的绿线位置就是单次成功率 $p$。后面三代的所有公式，都建立在这条线稳住的前提上。

### 实验 2（python）：拖滑块看二项分布的形状变化

```python title="二项分布 B(n,p)：模拟直方图 vs 理论曲线"
# sliders: n=20 [1:60:1], p=0.5 [0.05:0.95:0.05]
import random
import math
import matplotlib.pyplot as plt

runs = 4000                       # 重复"n 次一组"的组数，让直方图稳定
counts = []
for r in range(runs):
    wins = 0
    for t in range(n):
        if random.random() < p:   # random.random()：均匀落在 [0,1) 的随机小数；小于 p 即模拟成功
            wins = wins + 1
    counts.append(wins)

ks = list(range(0, n + 1))
theory = []                        # 理论 pmf：C(n,k)·p^k·(1−p)^(n−k)
for k in ks:
    cnk = math.factorial(n) / (math.factorial(k) * math.factorial(n - k))
    theory.append(cnk * p ** k * (1 - p) ** (n - k))

plt.hist(counts, bins=[b - 0.5 for b in range(n + 2)], density=True,
         color="steelblue", label="simulate")   # bins 边界取半整数，柱子对齐整数；density=True 转成频率密度
plt.plot(ks, theory, marker="o", color="tomato", label="theory")
plt.legend()
```

拖动 `n` 和 `p`：$p=0.5$ 时山峰对称居中；把 `p` 拖到 0.1，山体歪向左侧；再把 `n` 拉大，歪的山峰又渐渐变回对称的钟形——这最后一幕正是下一节连续分布课的主角预告。

### 实验 3（python)：几何分布的"平均等到第几次"

```python title="模拟验证几何分布期望 E[Y] = 1/p"
# sliders: p=0.2 [0.05:0.9:0.05]
import random

trials_total = 0                   # 所有回合的总尝试次数累加器
rounds = 5000                      # 重复多少回"等到第一次成功"
for r in range(rounds):
    count = 0
    for t in range(200):           # 每回合最多试 200 次（p 不至于太小），防个别回合拖太长
        count = count + 1
        if random.random() < p:
            break                  # break：立刻跳出当前循环——本回合等到成功了
    trials_total = trials_total + count

print(f"{rounds} 回合平均尝试 {round(trials_total / rounds, 4)} 次")
print(f"理论期望 1/p = {round(1 / p, 4)}")
```

两行数字互相咬合。直觉核对：成功率 0.2 意味着"平均五分之一的机会"，所以平均试 5 次成功一次——公平得像还债。

### 快问快答

```quiz
某广告页每小时平均被点击 3 次，想算"下一小时恰好 0 次点击"的概率，用哪个分布最合适？
- 二项 B(60, 0.05)
- 泊松，lambda 取 3 [*]
- 几何，p 取 3
? 单位时间内稀有事件的计数是泊松的主场：lambda 就是平均强度。代入 P(0)=e^-3 约 0.0498。
```

:::warning[常见误区]

**误区一**："你以为二项分布随便拿 n 个结果就能套。" 公式要求 $n$ 次试验**相互独立且成功概率相同**。从盒里不放回摸球时各次概率在变，硬套二项会出错（那是超几何分布的地盘）。

**误区二**："你以为几何分布数的是'失败次数'。" 本课约定 $Y$ 是**首次成功发生在第几次**，取值从 1 开始，期望 $1/p$；有的教材把它定义成"成功前的失败次数"，取值从 0 开始，期望 $(1-p)/p$。读文献先查口径，差一的约定害死人。

**误区三**："你以为泊松的 $\lambda$ 是个概率。" 它是**强度**——单位时间/面积内的平均发生次数，可以大于 1 甚至上百。把 $\lambda$ 当概率塞进 $[0,1]$ 是新手代码里最常见的车祸现场。

:::

## 6. 练习

**练习 1**：网站每分钟平均收到 $\lambda=2$ 条垃圾评论，且各条互不相干。求"下一分钟一条都没有"的概率。初始代码把公式抄错了一处：

```exercise
# @title: 练习：安静的下一分钟
# @check: 0.1353
# @hint: 泊松 P(0) = e^(−λ)·λ⁰/0! = e^(−λ)；λ=2 时给 math.exp 的参数应该是负的那个
import math

lam = 2
prob_zero = math.exp(-lam) * lam     # ← 多乘了一个 lam：λ⁰ 应该等于几？
print(round(prob_zero, 4))
```

修好后对照：约 13.5% 的分钟完全安静。再顺手一算"恰好 2 条"：$P(2)=e^{-2}\lambda^2/2!=0.1353\times2=0.2707$，恰是安静概率的两倍——泊松家族的数字常常这样出人意料地整齐。

**练习 2**：用期望与方差的查表结论，不写积分不算级数，直接回答：$B(100, 0.03)$ 的期望和标准差各是多少？

<details>
<summary>点开查看逐步解答</summary>

期望 $np=3$；方差 $np(1-p)=100\times0.03\times0.97=2.91$；标准差 $\sqrt{2.91}\approx1.706$。

顺手验一下泊松近似是否够格：$n=100$ 够大、$p=0.03$ 够小，$\lambda=3$ 下泊松给出的方差恰是 3，与精确值 2.91 相差不到 3%——工程上完全够用。
</details>

**练习 3**：证明二项分布的期望 $E[X]=np$（不许背表）。

<details>
<summary>点开查看逐步解答</summary>

别跟组合数搏斗，用指示器拆解：设 $X_i$ 为第 $i$ 次试验的"成功记 1、失败记 0"，则 $X=X_1+\cdots+X_n$。每个 $X_i$ 都是伯努利，$E[X_i]=1\cdot p+0\cdot(1-p)=p$。

由期望的线性性（不需要独立性！）：

$$E[X]=E[X_1]+\cdots+E[X_n]=np$$

三行收工。线性性这张免费牌的威力，第一次亮相就技惊四座。
</details>

## 7. 选读：泊松从二项里长出来的那一步

<details>
<summary>选读 · 让 (1−λ/n)^n 变成 e^(−λ)</summary>

把稀有事件放进二项框架：$n$ 个候选人每人以 $p=\lambda/n$ 中招。恰好 $k$ 人中招的概率是

$$\binom{n}{k}\left(\frac{\lambda}{n}\right)^k\left(1-\frac{\lambda}{n}\right)^{n-k}$$

令 $n\to\infty$：第一因子 $\binom{n}{k}/n^k \to 1/k!$；末尾那个 $(1-\lambda/n)^n$ 正是对数课见过的老朋友 $e^{-\lambda}$（复利极限），剩下的 $(1-\lambda/n)^{-k}\to1$。全部拼起来就是 $e^{-\lambda}\lambda^k/k!$。

历史注脚：西莫恩·泊松在 1837 年的《刑事统计研究》里导出它时，研究对象是法国法庭的误判率——稀有事件计数从诞生起就带着社会关怀。
</details>

## 8. 下一站

离散家族数的是"格子里的个数"；可身高、电压、到达间隔这些量根本不落格——它们落满整条数轴。概率如何铺成一整条曲线？均匀、指数、正态三位连续主角登场。

→ [连续分布：均匀、指数与正态](./60-continuous-normal.md)
