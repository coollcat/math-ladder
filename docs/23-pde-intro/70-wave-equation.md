---
title: 波动方程：弦的横振动
lesson_id: pde/wave-equation
prereqs:
  - pde/convective-characteristics
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
  - wave-equation
  - superposition-of-traveling-waves
applications:
  - string-instruments
  - structural-vibration
exits:
  - engineering
---

# 波动方程：弦的横振动

## 1. 从一个场景开始

拨一下吉他弦，弦上鼓起一个凸包，很快分裂成两个：一个向左跑，一个向右跑，各自保持形状冲向琴枕和琴码。一片凸包为什么会"知道自己该分成两半"？把弦切成小段，问每一小段的牛顿定律，答案就自己冒出来。

## 2. 直觉解释

把弦看成一颗颗串起来的小珠子，每段都绷着张力 $T$。看一小段：

- 左邻和右邻都在拉它，拉力沿弦的切线方向；
- 如果这段两边斜率一样，两个竖直拉力互相抵消，这段不动；
- 如果弦在这里是弯的，两端的竖直分量一高一低，差值就是这段的合力。

弯曲得越厉害，合力越大，加速度越大。竖直位移的"加速度正比于弯曲程度"，写出来就是波动方程。

## 3. 正式定义

一维波动方程是：

$$u_{tt}=a^2 u_{xx},\qquad a^2=\frac{T}{\rho}.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $u_{tt}$ | 位移的时间二阶偏导 | 弦上一点的竖直加速度 |
| $u_{xx}$ | 位移的空间二阶偏导 | 弦的弯曲程度 |
| $T$ | 张力 | 把弦绷紧的力，越大回复越快 |
| $\rho$ | 线密度 | 单位长度的质量，越大越笨重 |
| $a$ | 波速 | 扰动沿弦跑的速度 |

它的通解是两列平移波的叠加：

$$u(x,t)=F(x-at)+G(x+at),$$

$F$ 以速度 $a$ 向右平移，$G$ 以速度 $a$ 向左平移——吉他的"一个凸包分两半"就是一句公式。

## 4. 分步例题

**例 1**：验证 $u=F(x-at)$ 是解（右行波）。

1. 令 $\xi=x-at$，则 $u_x=F'(\xi)$，$u_{xx}=F''(\xi)$；
2. $u_t=-aF'(\xi)$，$u_{tt}=a^2F''(\xi)$；
3. 于是 $u_{tt}=a^2u_{xx}$，对任意形状 $F$ 都成立。

**例 2**：叠加两列波。取 $u=\sin(x-at)+0.5\sin(x+at)$。

1. 右行部分贡献 $u_{tt}=a^2\cdot(-\sin(x-at))$；
2. 左行部分贡献 $u_{tt}=a^2\cdot(-0.5\sin(x+at))$；
3. 两部分各自满足方程，相加后依然满足——方程是线性的，解可以随意叠加。

对比 60 课：对流方程只有一份平移解 $f(x-ct)$；波动方程含时间二阶导，允许右行与左行两份平移并存。

## 5. 动手实验

### 实验 1：平移的另一种说法叫相位

```viz
{
  "type": "wave",
  "title": "拖动相位就是拖动波形",
  "A": 1,
  "f": 1,
  "phi": 0
}
```

拖动相位滑块 $\phi$，整条曲线向右滑动，峰谷一个不少。波形方程里"随时间平移"与"改相位"是同一件事，这就是 $F(x-at)$ 的本质。

### 实验 2：右行与左行相加

```viz
{
  "type": "plot",
  "title": "两列反向平移波的叠加",
  "expr": "sin(x-a)+0.5*sin(x+a)",
  "xmin": 0, "xmax": 12,
  "sliders": [
    { "name": "a", "min": 0, "max": 3, "step": 0.05, "value": 0.8 }
  ]
}
```

振幅 1 的右行波与振幅 0.5 的左行波相加。拖动滑块当作时间流逝：有些地方始终不动（波节附近），有些地方摆动得特别猛——叠加不等于简单排队。

### 实验 3：数值验证叠加解

```python title="检查 u_tt 与 a^2*u_xx 是否相等"
import math

a = 2.0        # 波速
x = 0.6        # 空间位置
t = 0.3        # 时刻

# u = sin(x-a*t) + 0.5*sin(x+a*t)，按求导规则写出两个二阶偏导
u_tt = -(a * a) * (math.sin(x - a * t) + 0.5 * math.sin(x + a * t))
u_xx = -(math.sin(x - a * t) + 0.5 * math.sin(x + a * t))

# 两者之比应恰为 a 的平方；残差应为零
print(round(u_tt / u_xx, 3))
print(round(u_tt - a * a * u_xx, 3) + 0.0)
```

输出 `4.0` 和 `0.0`。两个二阶偏导恰好差一个 $a^2$ 因子，残差为零：叠加解真实满足方程。

## 6. 练习

```exercise
# @title: 练习：修好两列波的行进账本
# @check: 6.0
# @check: 0.0
# @check: 6.0
# @check: 2.0
# @hint: 右行波峰走 x0+a*t，左行波峰走 x0-a*t；间距用右峰减左峰（大减小）；波速是 T/rho 再开平方。
import math
x0 = 3.0       # 拨弦时凸包的位置
a = 2.0        # 波速
t = 1.5        # 经历的时间

peak_r = x0 - a * t    # ← 有错一：右行凸包应往 x 增大方向跑
peak_l = x0 + a * t    # ← 有错二：左行凸包应往 x 减小方向跑
print(round(peak_r, 3))
print(round(peak_l, 3))

gap = peak_l - peak_r  # ← 有错三：两个波峰的距离要用大减小
print(round(gap, 3))

tension = 4.0          # 弦的张力 T
density = 1.0          # 线密度 rho
speed = tension / density    # ← 有错四：a^2=T/rho，波速要开平方
print(round(speed, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正后的账本：

```python
import math
x0 = 3.0
a = 2.0
t = 1.5

peak_r = x0 + a * t
peak_l = x0 - a * t
print(round(peak_r, 3))    # 6.0
print(round(peak_l, 3))    # 0.0

gap = peak_r - peak_l
print(round(gap, 3))       # 6.0

speed = math.sqrt(tension / density)
print(round(speed, 3))     # 2.0
```

```text
peak_r = 3 + 2*1.5 = 6.0
peak_l = 3 - 2*1.5 = 0.0
gap = 6.0 - 0.0 = 6.0
speed = sqrt(4/1) = 2.0
```

一个凸包分成两半后，两个波峰以恒定间距 6 背向而行；间距随时间按 $2at$ 增长。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为弦上各点跟着波一起跑。弦上的点只在竖直方向上下振动，横向跑的是波形，不是质点。

**误区二**：你以为波速由拨弦力度决定。$a=\sqrt{T/\rho}$ 只看张力和线密度，初始凸包多大都不改它。

**误区三**：你以为两列波相遇会互相顶掉。线性叠加下它们穿过彼此后毫发无损，只在相遇瞬间形状相加。

:::

## 8. 快问快答

```quiz
波动方程通解 u = F(x-a*t) + G(x+a*t) 中，两份各自代表什么？
- 一个驻波和一个衰减模态
- 一列右行波和一列左行波 [*]
- 位移和速度两个分量
? F 以速度 a 向右平移，G 以速度 a 向左平移，弦上任一形状都可这样分解。
```

```quiz
把张力 T 加倍、线密度不变，波速 a 变为原来的几倍？
- 2 倍
- 1.414 倍（根号 2） [*]
- 不变
? a = 开根号(T/rho)，T 加倍只让 a 乘根号 2。
```

## 9. 选读：通解从换元里掉出来

<details>
<summary>选读 · 令 ξ=x-at、η=x+at</summary>

用链式法则把 $u_{xx}-\frac{1}{a^2}u_{tt}$ 改写成新变量 $\xi=x-at$、$\eta=x+at$ 的偏导，方程化为

$$u_{\xi\eta}=0.$$

"混合二阶导为零"意味着 $u_\xi$ 只依赖 $\xi$，积分一次得 $u=P(\xi)+Q(\eta)$——正是两列平移波。特征线方法在 60 课只出现一族斜线，这里因为有两条时间方向，特征线也分成左右两族。

</details>

## 10. 下一站

通解只是"两列平移波"，可给定初始形状和初速度后，$F$ 和 $G$ 到底取什么？下一课用达朗贝尔公式把答案写成闭式，不用级数就能读出任意时刻的形状。

→ [达朗贝尔解与初始形状](./75-dalembert-solution.md)
