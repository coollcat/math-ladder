---
title: 布朗运动入门
lesson_id: stochastic-processes/brownian-motion
prereqs:
  - probability-advanced/continuous-distributions
  - stochastic-processes/stationary-distribution
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
  - brownian-motion
  - scaling-limit
  - sqrt-time-scaling
applications:
  - physics-brownian-pollen
  - finance-price-noise
exits:
  - stochastic-analysis
---

# 布朗运动入门

## 1. 从一个场景开始

1828 年，植物学家布朗把花粉撒进水滴，用显微镜盯着它们看：每一粒都在不停地折线乱撞，没有一刻安静。他排除了"花粉有生命"的解释，却没能说清这股躁动从何而来。一百多年后人们才彻底看懂：这是亿万水分子从四面八方不停撞击花粉留下的合力噪声——撞击来自四面八方且时刻改变，合力等于零几乎不可能。

今天你想检测发动机轴承是否磨损，做法就是把传感器读数里的这种"噪声"单独拎出来看——它的数学名字就叫布朗运动。学完本课你会明白两个反直觉的事实：**走 4 倍的时间，典型距离只变成 2 倍**；以及**这条轨迹到处连续，却又处处没有切线**。

## 2. 直觉解释

**核心直觉：把抛硬币游戏无限切细。**

回顾第 09 章的老朋友—— drunkard walking：每一步等概率向左或向右挪一格。现在把规则改苛刻一点：

- 每 $\Delta t$ 秒挪动一小格，步长是 $\pm\sqrt{\Delta t}$；
- 让 $\Delta t$ 一路压缩到 $0$（步子越来越碎、越来越小）。

极限出来的那条曲线就是布朗运动 $B_t$。别忘了第 03 章的老结论：**独立误差相加时，方差相加**（而不是标准差相加）。$t$ 秒里大约走了 $t/\Delta t$ 步，总方差是

$$\frac{t}{\Delta t}\cdot(\sqrt{\Delta t})^{2}=t .$$

看到了吗？那个看起来别扭的 $\sqrt{\Delta t}$ 步长正是精心挑好的——它让总方差不多不少恰好等于时间 $t$。于是：

| 时间跨度 | 方差 | 典型波动幅度 |
| --- | --- | --- |
| $t$ | $t$ | $\sqrt{t}$ |
| $4t$ | $4t$ | $2\sqrt{t}$ ← 只翻倍 |

**这就是全课最重要的图像：典型距离随时间的平方根生长。** 时间流逝带来的不是匀速奔跑，而是越走越慢地弥漫开去。

## 3. 正式定义

称 $\lbrace B_t \rbrace_{t\ge 0}$ 为（标准）布朗运动，若它满足三条公理：

| 符号 | 含义 |
| --- | --- |
| $B_0=0$ | 从原点出发 |
| 独立增量 | 任取不相交时段 $(s,t)$、$(u,v)$，两段的位移 $B_t-B_s$ 与 $B_v-B_u$ 互不影响 |
| 正态增量 | 每个 $B_t-B_s \sim N(0,\,t-s)$：均值为 $0$，方差等于**时段长度** |
| 路径连续 | $B_t$ 关于 $t$ 连续——没有瞬移 |

由第二条立刻读出两条常用推论：任一时刻 $E[B_t]=0$；$\mathrm{Var}(B_t)=t$。

## 4. 分步例题

**问**：$B_t$ 走到 $t=4$ 时，位置落在区间 $[-4, 4]$ 内的概率大约是多少？

1. 方差 $\mathrm{Var}(B_4)=4$，故标准差 $\sigma=\sqrt{4}=2$；
2. 第 09 章学过正态分布的 2σ 法则：落在一个标准差以内约 $68\%$，两个标准差以内约 $95\%$；
3. 区间 $[-4,4]$ 恰是 $\pm 2\sigma$，
4. 所以概率约为 **$95\%$**。

注意区间宽度并没有"按时间比例"变成 $[\,-16,16\,]$——那是对 $\sqrt{t}$ 法则最常见的误用。

## 5. 动手实验

下面的滑动参数 $c$ 是"波动率"：不同的噪声强度让包围带张开的速度不同。真实花粉的轨迹就被夹在这样的 $\pm c\sqrt{t}$ 喇叭口里。

```viz
{
  "type": "plot",
  "title": "位移幅度的平方根包络 |B_t| ≈ c·√t",
  "expr": "c*x^0.5",
  "xmin": 0,
  "xmax": 16,
  "sliders": [
    { "name": "c", "min": 0.2, "max": 2.0, "step": 0.1, "value": 1 }
  ]
}
```

再来真正生成一批轨迹，亲眼看看"显微镜下的世界"。种子固定是为了每次看到同一片森林（`seed` 让随机数序列可复现，这是调试随机程序的标准手法）：

```python title="模拟五条布朗路径"
import random        # 随机数发生器（标准库），这里用 seed 保证可复现
import matplotlib.pyplot as plt   # 首次出现：绘图模块起别名 plt，约定俗成

random.seed(7)
steps = 400          # 把 [0, 4] 时段切成 400 小段，Δt = 0.01
for path_id in range(5):
    pos = 0.0
    xs = [0]
    ys = [0]
    for k in range(steps):
        pos = pos + random.gauss(0, 0.1)   # 首次出现：gauss(mu, sigma) 抽一个正态数；步长 √Δt = 0.1
        xs.append((k + 1) / 100)
        ys.append(pos)
    plt.plot(xs, ys, linewidth=0.8)
plt.plot(xs, [(x ** 0.5) for x in xs], color="red", linestyle="--")     # 上包络 √t
plt.plot(xs, [-(x ** 0.5) for x in xs], color="red", linestyle="--")    # 下包络 −√t
plt.xlabel("time")
plt.ylabel("position")
plt.show()
```

你会看到绝大多数路径挤在红色喇叭口里，偶尔越界又很快被"吸"回来。

## 6. 常见误区

:::warning[常见误区]

- **"时间翻倍，走得也翻倍"** —— 不对。位移的标准差按 $\sqrt{t}$ 增长：时间 ×4，典型距离才 ×2。
- **"标准差不方便加，那就把标准差相加"** —— 各段独立时可加的是**方差**，别拿标准差直接做加法。
- **"这条曲线这么毛糙，是不是中间有跳跃？"** —— 没有。它处处连续，只是处处不可微：任何一点上都找不到确定的切线方向。

:::

## 7. 练习

下面的函数应该回答"给定时长 $h$，位移的典型幅度（标准差）是多少"。初始代码犯了本课点名批评的错误——把它修到三条检查全部通过：

```exercise
# @title: 平方根法则修正案
# @check: 0.5
# @check: 3.0
# @check: 4.0
# @hint: 方差才和时间成正比；标准差要开根号——这正是你在第 03 章练过的幂运算
def typical_displacement(h):
    return h              # ← 方差是线性长出来的，标准差可不是

print(typical_displacement(0.25))
print(typical_displacement(9))
print(round(typical_displacement(2) * typical_displacement(8), 4))
```

<details>
<summary>点开查看逐步解答</summary>

标准差 $=\sqrt{h}$（方差 $h$ 开根号）。修正后的函数：

```python
def typical_displacement(h):
    return h ** 0.5       # sqrt 用幂运算 0.5 次方表达

print(typical_displacement(0.25))                  # 0.5
print(typical_displacement(9))                     # 3.0
print(round(typical_displacement(2) * typical_displacement(8), 4))  # √2 · √8 = √16 = 4.0
```

第三条检查是本课灵魂：先走 $2$ 秒、再走 $8$ 秒，两段各自的标准差相乘恰好是 $4$——如果错按"标准差 ∝ 时间"，这个乘积会是 $10$。
</details>

再来一道概念题：

```quiz
同一粒花粉在水中观察，下列哪个时间段内的位移波动范围（典型幅度）最大？
- 前 1 秒
- 中间 4 秒（从第 3 秒到第 7 秒） [*]
- 最后 9 秒的一半，即约最后 4.5 秒
? 波动幅度看的是 √(时段长度)：4 秒对应 √4 = 2，比 1 秒的 √1 = 1 大；而两种 4 秒级别的时段幅度相同——关键是总时长开根号，与"早走晚走"无关。
```

## 8. 选读证明：为什么步长偏偏是 √Δt

<details>
<summary>选读：把硬币游戏切细，极限真的存在吗</summary>

设每步行走 $\varepsilon$，共走 $n=t/\Delta t$ 步。末位置 $S_n=\sum_{i\le n} X_i$ 的方差为

$$\mathrm{Var}(S_n) = n\varepsilon^2 = \frac{t}{\Delta t}\cdot\varepsilon^2 .$$

要让极限曲线满足 $\mathrm{Var}(B_t)\to t$，就需要 $n\varepsilon^2 = t$ 恒成立，也就是 $\varepsilon=\sqrt{\Delta t}$。步长一旦换成别的速度（比如 $\Delta t$ 本身），方差将随 $\Delta t\to 0$ 塌缩成 $0$——粒子"冻结"；换成 $\Delta t^{1/4}$ 则方差爆炸——粒子"沸腾"。只有 $\sqrt{\ }$ 这一个临界速度给出非平凡的连续极限。

这也是第 08 章归纳思想的一次倒影：我们逐轮缩小时刻并证明极限分布稳定（版本的历史叫 Donsker 不变性原理，远期会在随机分析卷正式见面）。
</details>

## 9. 下一站

布朗运动答的是"位置怎么弥漫"；下一门课转向另一类完全不同的问题——[泊松过程与等待时间](./70-poisson-process.md)：客服电话什么时候响第二声？格子何时涨到第 100 个用户？
