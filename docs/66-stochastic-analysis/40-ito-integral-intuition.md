---
title: Itō 积分直觉
lesson_id: stochastic-analysis/ito-integral-intuition
prereqs:
  - stochastic-analysis/quadratic-variation
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - ito-integral
  - adaptedness-left-endpoint
applications:
  - hedging-strategy-accounting
exits:
  - stochastic-analysis
---

# Itō 积分直觉

## 1. 从一个场景开始

设想你在交易一条布朗运动路线上下翻飞的资产，策略是"每时每刻决定持有多少份"。期末盈亏怎么记账？连续世界里你写的自然是 $\int F\,dB$。但上一课刚刚宣布过：$B$ 的普通变差是无穷，黎曼那套"路径逐点细分求和"在这里根本不存在。随机世界需要一份新契约，而它只有一条核心条款：**在每个时间段里做决定时，只许使用区间左端点的信息**。这一课就来验货：为什么这条看似苛刻的条款，恰好是我们唯一付得起的代价。

## 2. 直觉解释

**核心直觉：不许作弊的未来贴现——它既是道德约束，也是数学救命绳。**

想想黎曼和 $\sum f(\xi_k)\,\Delta t$：取样点 $\xi_k$ 放左端还是放右端，极限不受影响。换成 $\sum F(B)\,\Delta B$ 后取样点的选择突然变得生死攸关：

| 取样约定 | 含义 | 结局 |
| --- | --- | --- |
| 左端点 $F(B_{t_k})$ | 用当时已知的仓位应对随后冒出的噪声 | 合法且收敛——Itō 积分 |
| 右端点 $F(B_{t_{k+1}})$ | 提前偷看了这一段的结局再定仓位 | 收敛值虚高，玩出了"无中生有" |

为什么差这么多？因为 $\Delta B$ 这一近乎纯抽签的量与"尚未发生的右端点"暗通款曲：拿右端点当权重等于按未来的价格持仓——每一段都白捡一段二次变差的顺风账。而左端点所知的一切都与即将到来的抽签统计独立，于是每一笔的期望都是零：**Itō 积分不欠任何人免费午餐**（这正是"鞅"性质的萌芽，卷五后续课程专程认亲）。

## 3. 正式定义

固定分割 $\Pi:0=t_0<\cdots<t_m=T$，最细网眼趋零。称随机过程 $F$ 为**可料的**，粗略地讲就是"$t$ 时刻的取值只依赖 $t$ 及更早的路径信息"。

**Itō 积分**定义为网眼意义下的均方极限：

$$\int_0^T F\,dB=\lim_{\lVert\Pi\rVert\to0}\sum_k F_{t_k}\,\bigl(B_{t_{k+1}}-B_{t_k}\bigr).$$

| 符号 | 含义 |
| --- | --- |
| $F_{t_k}$ | 左端点取值——可料性的最小体现 |
| $B_{t_{k+1}}-B_{t_k}$ | 该时段落下的噪声 $\Delta B$ |
| 极限含义 | 整体误差平方的平均趋于零（$L^2$ 收敛），而不是逐条路径的黎曼收敛 |
| 关键性质 | $\operatorname{E}\bigl[\int F\,dB\bigr]=0$；方差由 Itō 等距管理：$\operatorname{E}\bigl[(\int F\,dB)^2\bigr]=\operatorname{E}\bigl[\int F^2\,dt\bigr]$ |

注意最后一行等距式把"随机积分的能量"换算成"被积函数能量的时间总量"——它是本章一切收敛论证的引擎。

## 4. 分步例题

手算一本两分钟的迷你台账。时间段长 $\Delta t=0.5$，四段噪声依次 $0.5,\,-1.0,\,1.0,\,0.5$；路径节点位置依次 $B_0=0,\,B_1=0.5,\,B_2=-0.5,\,B_3=0.5,\,B_4=1.0$。被积函数取最诚实的 $F=B$（仓位跟随当前价位）。

1. **Itō（左端点）账**：$\sum B_{k}\Delta B_{k}=0\times0.5+0.5\times(-1)+(-0.5)\times1+0.5\times0.5=-0.75$；
2. **后见之明（右端点）账**：$\sum B_{k+1}\Delta B_{k}=0.5\times0.5+(-0.5)(-1)+0.5\times1+1.0\times0.5=1.75$；
3. 两账差额 $=2.5$，恰好等于 $\sum(\Delta B)^2=[B]_{2}=2.5$——多出来的正是偷看未来的"二次变差分红"；
4. **中间点（Stratonovich）账**：$0.25\times0.5+0\times(-1)+0\times1+0.75\times0.5=0.5$，而且精确地满足 $B_4^2/2=0.5$——中间点保留了古典链式法则的形状（后续课程会正式收编它）。

## 5. 动手实验

先让计算机重演那本迷你台账，把三种约定的差额算到你眼前：

```python title="同一份行情，三种记账约定"
STATES = [0.0, 0.5, -0.5, 0.5, 1.0]   # 五个节点的路径位置，首为 B0
NOISES = [0.5, -1.0, 1.0, 0.5]        # 四段噪声 ΔB

def ito_sum(st, nz):                  # 左端点：仓位用 states[i]
    return sum(st[i] * nz[i] for i in range(len(nz)))
def strato_sum(st, nz):               # 中间点：仓位取两端均值
    return sum((st[i] + st[i + 1]) / 2 * nz[i] for i in range(len(nz)))
def hindsight_sum(st, nz):            # 右端点：偷看本段终局的违规账
    return sum(st[i + 1] * nz[i] for i in range(len(nz)))

print("Itō 左端点      =", round(ito_sum(STATES, NOISES), 2))
print("Stratonovich    =", round(strato_sum(STATES, NOISES), 2))
print("右端点(违规)    =", round(hindsight_sum(STATES, NOISES), 2))
print("违规多赚的部分  =", round(hindsight_sum(STATES, NOISES) - ito_sum(STATES, NOISES), 2))
print("四段噪声平方和  =", round(sum(n ** 2 for n in NOISES), 2))   # 应与上一行相等
```

最后一行故意复述了上一课的账本：违规红利恰是二次变差。跑一遍你会发现最后两行分毫不差。

再来一次 Monte Carlo 总检：给合法的 Itō 和随机抽查许多条路径，看它的样本均值是否安分地贴着零。

```python title="合法性验证：一千次期末盈亏的均值"
import random                     # 标准库随机模块
random.seed(11)
n = 500                           # 每条路径切 500 段
trials = 1000                     # 抽 1000 条不同路径
total = 0.0
for _ in range(trials):
    b = 0.0                       # 当前路径位置（=左端点信息）
    pnl = 0.0
    for k in range(n):
        hold = b                  # 仓位 = 当前已知的 B 值（左端点！）
        step = random.gauss(0.0, (1 / n) ** 0.5)
        pnl += hold * step        # 本段盈亏 = 仓位 × 新落下的噪声
        b += step                 # 路径推进一格
    total += pnl
print("样本均值 =", round(total / trials, 4), "（理论值 0）")
```

一千笔期末盈亏摁出来的平均值是个离零不远的小数——不是巧合，而是"每笔期望恒零"定理的抽样回声。你反复改种子也不会看到它系统性地偏向任何一方。

## 6. 常见误区

:::warning[常见误区]

- **"随机积分就是逐条路径上的普通积分"** —— 不是。对固定的单条粗糙路径，积分根本不存在；Itō 积分定义的是整族路径上的均方极限对象，离开概率框架就没意义。
- **"左右端点之争只是口味问题"** —— 差额是整整一段二次变差，量级不小也不偶然。选左端点是因果律（信息不可逆流）的数学化身，金融里还对应禁止内幕交易。
- **"既然每个 $F_{t_k}$ 都可能与 $B$ 相关，积分期望应该很难说清"** —— 恰好相反：左端点信息与未来噪声独立，逐段期望全零，零散加总仍是零。这道"保险"只有可料过程才保得住。

:::

## 7. 练习

迷你台账升级版来了。初始代码又一次犯了"偷看右端点"的职业病——修好左端点铁律并通过全部检查：

```exercise
# @title: 无后见之明的对冲账本
# @check: -0.75
# @check: 0.5
# @check: 2.5
# @hint: 合法仓位在本段开始那一刻就已锁定。想要每段权重，只能伸手去够"当前"那个下标。
STATES = [0.0, 0.5, -0.5, 0.5, 1.0]   # 路径节点：-states[i] 是第 i 段开始时的已知价位
NOISES = [0.5, -1.0, 1.0, 0.5]        # 各段落下的噪声

def ito_left(states, noises):
    return sum(states[i] * noises[i] for i in range(len(noises)))   # ← 下标对了吗？

def stratonovich_mid(states, noises):
    return sum((states[i] + states[i + 1]) / 2 * noises[i] for i in range(len(noises)))

def hindsight_dividend(states, noises):
    return sum(n ** 2 for n in noises)

print(round(ito_left(STATES, NOISES), 2))
print(round(stratonovich_mid(STATES, NOISES), 2))
print(round(hindsight_dividend(STATES, NOISES), 2))
```

<details>
<summary>点开查看逐步解答</summary>

第一段权重必须取 $\text{states}[i]$——本段开始时的状态：

```python
def ito_left(states, noises):
    return sum(states[i] * noises[i] for i in range(len(noises)))   # 错版曾写成 states[i+1]

print(round(ito_left([0.0, 0.5, -0.5, 0.5, 1.0], [0.5, -1.0, 1.0, 0.5]), 2))   # -0.75
```

三行答案连成一个故事：左端点账 $-0.75$ 是守规矩者的真实盈亏；中间点账 $0.5$ 另有妙处（它等于终点位置平方的一半 $1.0^2/2$，链式法则完好无损）；第三个检查 $2.5$ 复核的是"违规者比守规者多赚的钱 = 噪声平方和"。若你的第一行输出是 $1.75$，说明你还在用右端点抄近道。

</details>

两个快问快答巩固法条：

```quiz
为什么 Itō 积分的每一段都坚持用区间左端点？
- 因为左端点的数值总是比右端点小
- 因为左端点信息与本段噪声相互独立，保证每段贡献期望为零 [*]
- 因为这样计算量最小
? 关键是独立性：右端点位形与刚发生的 ΔB 直接相关，用它会凭空造出与二次变差同级的系统性偏差——那正是"预知未来"的不当得利。
```

```quiz
某同学声称："我把每段的仓位定为该段结束时的价位，这只是换个采样习惯，结果不会有实质差别。"他错在哪？
- 完全正确，采样点不影响和式的极限
- 他把相当于二次变差量级的虚增收益当成了计算精度问题 [*]
- 只有当噪声很大时才会出错
? 例题里同一路径的两种账差了 2.5，占合法盈亏绝对值的数倍之巨。这不是数值误差，是结构性差别：右端点和式不在 Itō 积分的定义里，而在"内幕消息利润表"里。
```

## 8. 选读证明：一本人人可查的天平恒等式

<details>
<summary>选读：末端平方的天平推导（Itō 公式的前菜）</summary>

对任意第 $k$ 段做一次初等展开：

$$B_{t_{k+1}}^2-B_{t_k}^2=(B_{t_k}+\Delta B_k)^2-B_{t_k}^2=2\,B_{t_k}\,\Delta B_k+(\Delta B_k)^2.$$

移项并以 $\frac12$ 通乘再对 $k$ 求和：

$$\sum_k B_{t_k}\,\Delta B_k=\frac{B_T^2-B_0^2}{2}-\frac12\sum_k(\Delta B_k)^2 .$$

左边是 Itō 和，右边第一项是普通微积分里 $\frac{B^2}{2}$ 的链式法则结果，第二项交给上一课的定理收敛到 $[B]_T/2=T/2$。于是在极限里：

$$\int_0^T B\,dB=\frac{B_T^2}{2}-\frac{T}{2}.$$

对比古典公式多了 $-T/2$：这个负号正是被丢掉的二阶项死而复生的地方（平方函数的二阶导是常数 2）。它当场演示了下一课的主角——Itō 引理——为什么会带一个"修正项"上岗。同时注意右端点和对应用恒等式重新整理可得 $\frac{B_T^2}{2}+\frac{T}{2}$：违规利润那正号的一半，来源分毫不差。

</details>

## 9. 下一站

会计制度既已立宪，该请出宪法本体了——[Itō 引理](./50-ito-lemma-gbm.md)：泰勒展开的第 0、1、2 三个层级，如何统治所有光滑函数的命运。
