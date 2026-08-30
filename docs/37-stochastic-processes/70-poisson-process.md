---
title: 泊松过程与等待时间
lesson_id: stochastic-processes/poisson-process
prereqs:
  - probability-advanced/continuous-distributions
  - stochastic-processes/markov-chain
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
  - poisson-process
  - counting-process
  - memoryless-waiting
applications:
  - call-center-arrivals
  - server-request-load
exits:
  - queueing-theory
---

# 泊松过程与等待时间

## 1. 从一个场景开始

深夜的客服中心，电话此起彼伏：00:12 一通、00:19 一通、00:19 过半分钟又是一通……值班主管关心两个问题：**接下来一小时会响几通？** 以及 **如果刚挂断一通，下一通平均要等多久？**

这类"随机蹦出来、彼此互不打扰、单位时段平均蹦 $\lambda$ 个"的事件流无处不在：服务器请求、原子衰变、路口事故报警……统一描述它们的工具叫泊松过程。上一课的布朗运动是"连续地弥漫"，泊松过程则是"离散地蹦豆"——两条腿一起撑起随机过程的入门地基。

## 2. 直觉解释

**核心直觉：每个瞬间都很"冷"，但架不住时刻多。**

把一小时切成 $3600$ 个秒段。设每秒来电话的概率是同一个很小的 $p$（这一秒有没有电话不影响下一秒），不同秒段相互独立。那么一小时内总通数就是 $3600$ 次"冷手抓热馒头"式独立试验的成功计数——第 09 章二项分布的老场景。

继续把刀切细：毫秒、微秒……只要让每小时平均通数锁定为 $\lambda$，二项分布就稳定收敛成一条曲线：

$$P(N(t)=k)=\frac{(\lambda t)^k}{k!}\cdot e^{-\lambda t},\qquad k=0,1,2,\dots$$

读法：$t$ 小时内恰好响起 $k$ 通的概率。两个马上能用的事实：

| 量 | 值 | 直觉 |
| --- | --- | --- |
| 平均次数 $E[N(t)]$ | $\lambda t$ | 速率 × 时长 |
| 相邻间隔 $T$ | 指数分布（第 36 章） | 密度 $\lambda e^{-\lambda\tau}$，平均等待 $1/\lambda$ |

## 3. 正式定义

计数过程 $\lbrace N(t) \rbrace_{t\ge0}$（$N(t)$ 记录到时刻 $t$ 为止的事件总数）称为强度 $\lambda$ 的泊松过程，若：

1. $N(0)=0$；
2. 独立增量：不相交时段的计件数互不影响（上一小时爆满不代表这一小时也忙）；
3. 平稳增量 + 高频稀疏：长 $h$ 的时段恰发生一件的概率约为 $\lambda h$，发生两件以上 $o(h)$ 忽略不计。

**等待时间定理**：相邻两事件的间隔 $T$ 服从参数 $\lambda$ 的指数分布，

$$P(T>\tau)=e^{-\lambda\tau},$$

并且 $T$ **无记忆**——已经白等 $s$ 秒，接下来的等待分布和从头开始完全一样：

$$P(T>s+\tau\mid T>s)=P(T>\tau).$$

这是第 36 章条件概率框架里最出格的一条性质：历史毫无信息量。

## 4. 分步例题

夜间来电强度 $\lambda=20$ 通/小时。

**(a)** 接下来半小时零来电的概率？

1. $t=0.5$ 小时，$\lambda t = 10$；
2. $k=0$ 代入：$P=\dfrac{10^0}{0!}e^{-10}=e^{-10}$；
3. 约为 $4.54\times10^{-5}$——十万分之一量级，夜班想彻底清闲？没门。

**(b)** 刚接完一通，下一通至少 3 分钟后才来的概率？

1. 3 分钟 $=0.05$ 小时。间隔超过 $\tau$ 即 $P(T>\tau)=e^{-\lambda\tau}$；
2. 代入：$e^{-20\times0.05}=e^{-1}$，
3. 约 **$0.368$**——有三成多概率能喝口水。

对照直觉：平均间隔本来就是 $1/\lambda=3$ 分钟，所以"超过平均值仍在等"略低于一半——$0.368$ 合理（指数分布右偏，中位数比均值短）。

## 5. 动手实验

不做花哨的事，就用定义第 3 条直接造数据：把 6 小时切成一格格的一分钟小段，每段独立掷一次"有没有电话"（来件概率 = 每 0.5 分钟一通的节奏 → $p=\lambda/\text{格速率}$）。数每个小时的件数，画成柱状图：

```python title="一分钟一格的粗糙泊松模拟"
import random                     # 随机数库，第 0 章登场的老朋友
import matplotlib.pyplot as plt   # 绘图模块别名 plt

random.seed(42)
hours = 6                 # 观察时长
cells_per_hour = 60       # 每小时切成 60 格：一格一分钟
p = 1 / 120               # 一格内有电话的概率：期望 = 60 * 1/120 = 0.5 通/小时？

# ↑ 停一下：按 0.5 通/分钟的强度，一小时应来约 30 通——这里的 p 只给出 0.5 通！
#   把 p 改成多少才能让期望回到每 10 分钟 5 通的本课场景？改完再运行看柱状图。
counts = []
for h in range(hours):
    n = 0
    for cell in range(cells_per_hour):
        if random.random() < p:      # random() 抽 (0,1) 内均匀小数
            n += 1
    counts.append(n)

print(counts)
plt.bar(list(range(1, hours + 1)), counts)
plt.xlabel("hour")
plt.ylabel("calls")
plt.show()
```

<details>
<summary>p 应该是多少？点开对答案</summary>

本课主线场景是 **每 10 分钟约 5 通**，即每小时 $\lambda=30$ 通。格子是一分钟，故每格来件概率应设

```python
p = 30 / cells_per_hour        # = 0.5 —— 每分钟半件的期望，不是"半通的怪说法"
```

期望核对：$E[\text{每小时}] = 60\times0.5 = 30$ ✓。柱状图将围绕 $30$ 上下小幅摆动，各柱高低差通常在 ±6 之内——这就是泊松过程"统计规律平稳，具体节奏随机"的模样。想看"渐近逼近"效果，把 `cells_per_hour` 加倍同时让 `p` 减半（均值不变），锯齿会越来越温和。
</details>

## 6. 常见误区

:::warning[常见误区]

- **"每小时平均 30 通，所以两通通常相隔 2 分钟"** —— 平均间隔确实是 2 分钟，但单个间隔非常参差：下一通可能 5 秒后到，也可能十几分钟不来（指数分布高度右偏）。
- **"已经等了很久没响，应该快了"** —— 无记忆性恰恰相反：白等的时间不兑换任何进度，分布原地重启。
- **"平稳增量 = 来电像时钟一样规律"** —— 平稳说的是**统计规律**每小时相同，不是事件均匀排班。

:::

## 7. 练习

客服线强度改为 $\lambda=0.5$ 通/分钟（每 10 分钟约 5 通）。初始代码能跑、结果明显不对——修到三条检查全部通过：

```exercise
# @title: 十分钟窗口三连问
# @check: 5.0
# @check: 0.0842
# @check: 0.1353
# @hint: 平均次数是 λ·t 别写反；恰 k 通要补上 e^{−λt} 因子（e 取 2.718281828459045 用 pow 求幂）；P(T>4) 直接套 e^{−λτ}
lam = 0.5      # 通/分钟
t = 10         # 观察窗：十分钟

mean_calls = lam / t                       # ← 是乘不是除
p_exact_2 = ((lam * t) ** 2) / 2           # ← 恰 2 通少了 e^{−λt} 因子
p_wait_4 = lam ** (-4)                     # ← P(T>4 分钟) 不是这样算的

print(mean_calls)
print(round(p_exact_2, 4))
print(round(p_wait_4, 4))
```

<details>
<summary>点开查看逐步解答</summary>

取 $e\approx 2.718281828459045$（`pow` 的底数），三个量依次为：

```python
mean_calls = lam * t                                  # 0.5 × 10 = 5.0
p_exact_2 = ((lam * t) ** 2 / 2) * pow(e, -(lam*t))   # 12.5 × e^{−5} ≈ 0.0842
p_wait_4  = pow(e, -(lam * 4))                        # e^{−2} ≈ 0.1353
```

- 第一问就是定义表的"速率 × 时长"；
- 第二问：$\dfrac{5^2}{2!}e^{-5}=12.5\times0.006738\approx0.0842$；
- 第三问是等待时间定理的直接代入：$\tau=4$ 分钟，$P(T>4)=e^{-0.5\times4}=e^{-2}\approx0.1353$——恰好是无记忆性的计算入口。
</details>

再来一道概念题：

```quiz
话务员已经连续 8 分钟没有接到电话。严格按无记忆性推理，"再等 2 分钟仍无声"的概率？
- 因为已经等了很久而明显变大
- 等于 e^{−λ×2}，与之前白等的 8 分钟无关 [*]
- 需要把 8 分钟也算进指数里：e^{−λ×10}
? 无记忆性说 P(T>s+τ|T>s)=P(T>τ)：历史清零重来。8 分钟的空窗不会提高也不会降低后续等待的分布参数。
```

## 8. 选读证明：零事件的极限为什么是 e

<details>
<summary>选读：从二项分布挤出 e^{−λ}</summary>

把一小时切成 $n$ 格，每格来件概率 $p_n=\lambda/n$（保证均值恒定）。全小时静默的概率是

$$\Bigl(1-\frac{\lambda}{n}\Bigr)^{n}.$$

这是第 04 章"利滚利与 e"那串式子的孪生兄弟：对它取对数并用第 13 章的局部线性化 $\log(1-x)\approx-x$，得到

$$\lim_{n\to\infty}\Bigl(1-\frac{\lambda}{n}\Bigr)^{n}=e^{-\lambda}.$$

恰 $k$ 件的场合从 $\binom{n}{k}p_n^{k}(1-p_n)^{n-k}$ 出发：组合数 $\binom{n}{k}\to n^k/k!$ 提供主部，$\bigl(1-p_n\bigr)^{n-k}\to e^{-\lambda}$ 收走尾部——三路夹逼之下，$(\lambda t)^k/k!\cdot e^{-\lambda t}$ 就位。
</details>

## 9. 下一站

到这里你握住了随机过程的两大原型：[布朗运动入门](./60-brownian-motion.md)管"连续弥漫"，泊松过程管"离散蹦豆"。两者在水深处的第一次握手——由随机游走缩放出布朗运动——将在随机分析卷正式登场；眼下不妨回到[本章首页](./index.md)的实战挑战，看看接收缓存的排队骚动如何被转移矩阵一口吃透。
