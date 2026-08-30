---
title: 第 66 章 · 随机分析
description: 给噪声做微积分：布朗运动、Itō 引理、SDE、Euler-Maruyama 与 Fokker-Planck。
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
sidebar_position: 66
---

# 随机分析

普通微分方程描述一条确定的轨道；随机微分方程同时演化无数条轨道。本章回答：当噪声无处不在时，导数还剩多少意义、方程怎么写、计算机怎么解、群体密度又如何漂移。

十门正式课已全部按下列路线图上线：

1. [从随机游走缩放出布朗运动](./10-random-walk-scaling.md)——配速表查清三档步长的命运，滑块里拖出唯一的临界指数；
2. [布朗运动的三副面孔](./20-brownian-three-faces.md)——三级放大镜逐级下钻，浮窗实测弦斜率的爆炸现场；
3. [二次变差：普通链式法则为何失效](./30-quadratic-variation.md)——同一批噪声过三种筛子，平方账钉死在 1、普通账冲上天花板；
4. [Itō 积分直觉](./40-ito-integral-intuition.md)——迷你台账三本对拍，违规的右端点当场吐出二次变差分红；
5. [Itō 引理与几何布朗运动](./50-ito-lemma-gbm.md)——对数中位骨架的箭头场加三轨两线，凸性税现形；
6. [SDE 与 Euler-Maruyama 数值格式](./60-sde-euler-maruyama.md)——回归骨架场旁开动三档步长发动机，终点误差逐格验收；
7. [强收敛与弱收敛选讲](./70-strong-vs-weak-convergence.md)——GBM 靶场同时上两杆秤，半阶与一阶当堂分家；
8. [Fokker-Planck 方程：样本路径到密度演化](./80-fokker-planck.md)——千蜂群粒子直方图逐帧逼近理论钟形云；
9. [Ornstein-Uhlenbeck 与均值回归选讲](./90-ornstein-uhlenbeck.md)——回归之风箭头场、安置带轨迹与记忆折半的自相关账本；
10. [测度变换与鞅表示：换个世界观算期望](./95-girsanov-martingale.md)——两万条路径的汇率表对拍，漂移在换算账里当场归零。

## 前置回望

第 37 章的马尔可夫链和布朗运动入门提供离散到连续的桥；第 23 章的热方程是 Fokker-Planck 的确定性表亲；第 44 章的误差分析和第 22 章的数值 ODE 是构造数值格式的模板。

## 计划交互形态

全部以站内既有组件与浮窗实验交付：

- viz：plot 配速包络滑块、slope-field 回归骨架场（多课复用）；
- 浮窗 Python：缩放极限数据、放大镜弦斜率、二次变差双账本曲线、Itō 台账对拍、GBM 三轨两线、EM 步长误差表、强弱收敛靶场、千蜂群密度云直方图、OU 安置带与自相关折半、Girsanov 密度重加权对拍。

:::note[生产状态]

本章 10 门正式课均已上线并通过校验（2026-08-28 插缝补建 95 号测度变换与鞅表示课）；路线图条目已替换为课程链接，无遗留待写模块。

:::

## 实战挑战 · 给噪声做两次手术

随机分析最反直觉的两件事，都能在几行 Python 里"看"到：其一，均值回归的拉力与当前位置成正比；其二，布朗运动的**二次变差**收敛到时间长度，而普通的一次变差反而发散。下面两道题各治一个。

### 实战一：OU 过程的 Euler-Maruyama 一步

第 60 课把随机微分方程离散成一步步走；第 90 课的 Ornstein-Uhlenbeck 过程是它的明星病例——$dX = -\theta X\,dt + \sigma\,dW$，漂移 $-\theta X$ 是一股"离零点越远、往回拉越狠"的回归风。给定一步的布朗增量 $dW = 0.4$，手动算一步更新。初始代码把漂移项里的 $X$ 弄丢了，修到输出 `2.02`：

```exercise
# @title: 实战一：OU 过程的 Euler-Maruyama 一步
# @check: 2.02
# @hint: 漂移项是 -θ·X·dt——别丢掉 X 这个因子，均值回归的拉力与当前位置成正比。
X = 2.0        # 当前状态
theta = 0.5    # 均值回归强度 θ
sigma = 0.3    # 波动率 σ
dt = 0.1       # 时间步长
dW = 0.4       # 本步的布朗增量（已给定）

dX = -theta * dt + sigma * dW    # ← 问题在这：漂移项丢了 X 这个因子
X_new = X + dX

print(round(X_new, 2))
```

<details>
<summary>点开查看逐步解答</summary>

OU 的漂移是 $-\theta X\,dt$，不是 $-\theta\,dt$——那股"回归风"的强度与**当前位置离零点多远**成正比。补上 $X$：

```python
dX = -theta * X * dt + sigma * dW   # 漂移 -θ·X·dt + 扩散 σ·dW
```

代值：$dX = -0.5 \times 2.0 \times 0.1 + 0.3 \times 0.4 = -0.1 + 0.12 = 0.02$，于是 $X_{\text{new}} = 2.0 + 0.02 = 2.02$。注意漂移是**负**的——因为 $X=2>0$，回归风把它往零点拽；若漏了 $X$，漂移只剩 $-0.05$，回归的"力度随位置变化"这个灵魂就丢了。

</details>

### 实战二：二次变差——布朗运动的指纹

第 30 课说：布朗运动路径的**二次变差**（增量平方之和）在步长趋于 0 时收敛到时间长度 $T$，这是它与光滑曲线最本质的区别——光滑曲线的二次变差会退化为 0。下面模拟 1000 步布朗运动，验证这条"指纹"。初始代码把增量平方错写成了别的，修到两个判断都输出 `True`：

```exercise
# @title: 实战二：二次变差——布朗运动的指纹
# @check: True
# @check: True
# @hint: 二次变差累加的是增量 dW 的平方；若累加 dW 本身，那就是一次变差，会退化成 0。
import random                 # 随机数库：生成高斯增量（第 0 章引入）
import math                   # 数学库：用 sqrt 算增量的标准差

random.seed(42)               # 固定随机种子：让随机结果可复现（判题需要）

T = 1.0                       # 时间长度
N = 1000                      # 时间步数
dt = T / N                    # 每步时长

W = 0.0                       # 布朗运动当前位置
qvar = 0.0                    # 二次变差累加器

for k in range(N):            # 走 1000 步
    dW = random.gauss(0, math.sqrt(dt))   # 高斯增量：均值 0、标准差 sqrt(dt)
    W = W + dW
    qvar = qvar + dW * dW                 # ← 若错成 dW，就是一次变差

print(abs(qvar - T) < 0.1)    # 二次变差是否收敛到 T = 1.0
print(abs(W) < 1.0)           # 终点位置量级是否 O(sqrt(T))，而非发散
```

<details>
<summary>点开查看逐步解答</summary>

二次变差定义是 $\sum (\Delta W)^2$，累加的一定是增量**平方**：

```python
qvar = qvar + dW * dW   # 累加增量的平方
```

固定种子 `42` 跑完，二次变差 $qvar \approx 1.039$，与 $T = 1.0$ 的偏差不足 $0.04$，`abs(qvar - T) < 0.1` 输出 `True`——步数越多，这个收敛越紧，正是第 30 课"平方账钉死在 $T$"的数值化身。终点 $W \approx -0.58$，量级 $\sqrt{T} = 1$，`abs(W) < 1.0` 也输出 `True`。若错累加成一次变差 $\sum \Delta W$，它只会等于终点的净位移 $W_T$ 本身，量级仍是 $\sqrt{T}$ 而非发散——所以"一次变差发散、二次变差收敛"这对反直觉的账，正是随机微积分里 $dW^2 = dt$ 这条铁律的来源（第 40 课 Itō 积分赖以成立的根基）。

</details>

相关回链：[二次变差：普通链式法则为何失效](./30-quadratic-variation.md)、[SDE 与 Euler-Maruyama 数值格式](./60-sde-euler-maruyama.md)、[Ornstein-Uhlenbeck 与均值回归](./90-ornstein-uhlenbeck.md)。
