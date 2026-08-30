---
title: 对流方程与特征线
lesson_id: pde/convective-characteristics
prereqs:
  - pde/cfl-stability
  - pde/heat-equation-1d
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - advection
  - characteristic-line
applications:
  - pollutant-transport
  - traffic-flow
exits:
  - engineering
---

# 对流方程与特征线

## 1. 从一个场景开始

上游工厂泄漏了一片染色剂，染料团顺流而下：一小时后在下游三公里处，形状几乎没变，还是那个团。热方程遇到峰会把峰抹平，而河水只是把峰**搬走**。搬走的规律藏在一族斜线里。

## 2. 直觉解释

想象你坐上一片顺水漂的叶子：你的位置每小时增加 $c$ 公里。环顾四周，所有和你保持"相对位置不变"的水质点，颜色浓度和你一样——因为大家被同一股流搬运。

在时空图上把这些点连起来，得到一族斜率为 $c$ 的直线。**沿着这样一条线看过去，浓度 $u$ 处处相同**。这条线就叫特征线。

对照热方程：热的峰随时间变矮消失；对流的峰随时间平移但高度不变。一个是不可逆的抹平，一个是可逆的搬运。

## 3. 正式定义

对流方程（也叫输运方程）是：

$$u_t + c\,u_x = 0.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $c$ | 流速 | 带符号：正为向右搬运，负为向左 |
| $u_t$ | 固定地点的时间变化率 | 站着不动的人看到的浓度变化 |
| $u_x$ | 固定时刻的空间变化率 | 同一时刻沿河的方向变化 |

它的全部解是：

$$u(x,t)=f(x-ct),$$

其中 $f$ 是任意一个一元函数，由初始浓度分布决定。直线族

$$x-ct=\text{常数}$$

就是特征线：$f$ 在每条特征线上取同一个值。

## 4. 分步例题

取初始分布 $f(s)=e^{-s^2}$（一座光滑小山），波速 $c=2$。

1. 解为 $u(x,t)=e^{-(x-2t)^2}$；
2. 求时间偏导：$u_t=4(x-2t)\,e^{-(x-2t)^2}$；
3. 求空间偏导：$u_x=-2(x-2t)\,e^{-(x-2t)^2}$；
4. 相加：$u_t+2u_x=0$，方程满足；
5. 峰值位置满足 $x-2t=0$，即 $x=2t$：小山以速度 2 整体右移，高度始终是 1。

对比 40 课的热方程解 $e^{-k\pi^2t}\sin(\pi x)$：那里峰值因子 $e^{-k\pi^2t}$ 必然衰减；这里没有任何衰减因子。**输运不改形状，扩散只改形状。**

## 5. 动手实验

### 实验 1：斜着看时空图

```viz
{
  "type": "pde-probe",
  "title": "特征线是时空图上的斜直线",
  "amplitude": 1,
  "speed": 1.5,
  "wavelength": 3,
  "x": 1.5,
  "t": 0.5
}
```

上方热图中的亮带就是特征线的方向：斜率由流速滑块决定。拖动紫色探针沿亮带方向移动，读数 $u$ 几乎不变——这就是"沿特征线看常数"。

### 实验 2：让河倒流

```viz
{
  "type": "pde-probe",
  "title": "负流速把特征线翻向另一侧",
  "amplitude": 1,
  "speed": -1.5,
  "wavelength": 3,
  "x": 1.5,
  "t": 0.5
}
```

把流速滑块拨到负值，亮带立刻翻向另一侧。特征线 $x-ct=$ 常数里的 $c$ 是带符号的：水流方向一变，初值的搬运方向跟着变。

### 实验 3：沿特征线采样三处

```python title="特征线上取值不变"
import math   # 数学函数库：exp 是指数函数

c = 2.0        # 流速
t = 1.5        # 当前时刻
x0 = 1.0       # 特征线在 t=0 时的出发点

# 特征线方程：x = x0 + c*t（从 x0 出发，以速度 c 前进）
x_now = x0 + c * t

# f(s)=exp(-s*s)：初始分布；特征线上的自变量恒为 x - c*t = x0
u_here = math.exp(-x_now ** 2 + 2 * c * t * x0 - (c * t) ** 2)   # 展开 (x-ct)^2 的直接计算
u_start = math.exp(-x0 ** 2)
drift = u_here - u_start   # 两处取值之差：应为 0
print(round(u_here, 3))
print(round(u_start, 3))
print(round(drift, 3) + 0.0)
```

输出 `0.368`、`0.368`、`0.0`。展开式看起来完全不同，但 $x-ct$ 恒等于 $x0$，所以两处取值一字不差。

## 6. 练习

```exercise
# @title: 练习：修好特征线的账本
# @check: 4.0
# @check: 1.0
# @check: 0.0
# @hint: 特征线从 x0 出发按 x = x0 + c*t 前进；沿线的常数值是 x - c*t，它恒等于 x0。
import math
c = 2.0        # 流速
x0 = 1.0       # 特征线在 t=0 的出发点
t = 1.5        # 当前时刻

x = x0 - c * t          # ← 有错一：特征线应往前跑，x = x0 + c*t
print(round(x, 3))

lag = x + c * t         # ← 有错二：沿特征线的不变量是 x - c*t
print(round(lag, 3))

u_now = math.exp(-lag ** 2)     # 特征线上此处的浓度
u_then = math.exp(-x0 ** 2)     # 出发点当时的浓度
drift = u_now - u_then
print(round(drift, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正后的账本：

```python
import math
c = 2.0
x0 = 1.0
t = 1.5

x = x0 + c * t
print(round(x, 3))       # 4.0

lag = x - c * t
print(round(lag, 3))     # 1.0

u_now = math.exp(-lag ** 2)
u_then = math.exp(-x0 ** 2)
print(round(u_now - u_then, 3))   # 0.0
```

```text
x = 1 + 2*1.5 = 4.0
lag = 4.0 - 3.0 = 1.0 = x0
u_now = u_then = exp(-1)
```

第三步算出的差是 0：特征线上浓度不随时间变化。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为峰和热方程一样会慢慢变矮。对流方程没有 $u_{xx}$ 项，形状严格保持，高度不变。

**误区二**：你以为特征线是竖直线。特征线斜率由流速决定，站着的观察者会看到浓度随时间变化。

**误区三**：你以为 $c$ 只管快慢。$c$ 的符号决定搬运方向，倒流时特征线翻向另一侧。

:::

## 8. 快问快答

```quiz
沿着一条特征线看，对流方程的解 u 如何变化？
- 按指数衰减到零
- 保持常数不变 [*]
- 随时间线性增长
? 对流只搬运不改变：特征线 x-c*t=常数 上，u=f(x-c*t) 取同一个值。
```

```quiz
流速 c=0 时，特征线变成什么形状？
- 斜率越来越陡的曲线
- 竖直的直线（x = 常数） [*]
- 水平的直线（t = 常数）
? c=0 时 x-0*t=常数，每条特征线都竖直：哪里都不搬，u 永不改变。
```

## 9. 选读：为什么偏偏是这条斜线

<details>
<summary>选读 · 链式法则的一步</summary>

让观察者沿 $x(t)=x_0+ct$ 移动，看它感受到的变化率。由链式法则：

$$\frac{d}{dt}u(x(t),t)=u_x\cdot\frac{dx}{dt}+u_t=c\,u_x+u_t.$$

对流方程恰好要求这个组合为零。所以"跟着波走"的观察者看到 $u$ 不变——方程本身就是这句话的微积分写法。55 课 CFL 条件里"信息沿特征线传播"的说法，源头就在这里。

</details>

## 10. 下一站

特征线搬运有个隐藏前提：全河一个流速 $c$。如果流速就是 $u$ 自己——高处跑得快、低处跑得慢——特征线就会互相追赶，剖面被挤压变陡，直到某一刻彻底翻卷。下一课看这场"追尾事故"如何制造激波。

→ [激波：特征线相交之后](./65-nonlinear-shocks.md)
