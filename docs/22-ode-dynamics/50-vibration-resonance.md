---
title: 振动、阻尼与共振
lesson_id: ode/vibration-resonance
prereqs:
  - ode/phase-portraits
volume: 2
layer: L9
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - damped-oscillation
  - resonance
applications:
  - suspension-systems
  - structural-engineering
exits:
  - engineering
  - scientific-computing
---

# 振动、阻尼与共振

## 1. 从一个场景开始

秋千被人按正确节奏轻推，越荡越高；汽车压过减速带，悬挂系统却要把颠簸吞掉。同一套二阶微分方程，既解释共振的凶猛，也解释阻尼的温柔。

## 2. 直觉解释

无外力的弹簧振子常写成：

$$mx''+cx'+kx=0.$$

$m$ 是惯性，$c$ 是阻尼，$k$ 是恢复刚度。阻尼小则来回振动；阻尼大到一定程度，系统不再越过平衡点。

若有周期外力 $F\cos(\omega t)$，当驱动频率接近固有频率时，振幅可能急剧增大，这就是共振。

## 3. 正式定义

固有角频率为：

$$\omega_0=\sqrt{\frac{k}{m}}.$$

阻尼比为：

$$\zeta=\frac{c}{2\sqrt{mk}}.$$

对稳态受迫振动，振幅为：

$$A=\frac{F}{\sqrt{(k-m\omega^2)^2+(c\omega)^2}}.$$

分母越小，振幅越大。无阻尼且 $\omega=\omega_0$ 时，经典线性模型的分母为零。有阻尼时，位移振幅峰通常略低于 $\omega_0$；阻尼越大，峰值越矮、越宽。

## 4. 分步例题

取 $m=1$，$c=0.2$，$k=4$，$F=0.4$，驱动频率 $\omega=2$。

1. 固有频率 $\omega_0=\sqrt{4/1}=2$；
2. 阻尼比 $\zeta=0.2/(2\sqrt{4})=0.05$；
3. 分母 $=\sqrt{(4-1\cdot4)^2+(0.2\cdot2)^2}=0.4$；
4. 稳态振幅 $A=0.4/0.4=1$；
5. 驱频正好等于固有频率，且阻尼很小，所以接近共振。

## 5. 动手实验

### 实验 1：共振实验室

```viz
{
  "type": "resonance-lab",
  "title": "驱频扫过固有频率",
  "m": 1,
  "c": 0.2,
  "k": 4,
  "force": 0.4,
  "omega": 2
}
```

把 $\omega$ 滑到 2 附近，振幅迅速增大；再把阻尼 $c$ 调大，峰值被压平。

### 实验 2：阻尼振动的相图

```viz
{
  "type": "phase-portrait",
  "title": "欠阻尼振子向内螺旋",
  "matrix": [0, 1, -4, -0.2],
  "x0": 1.5,
  "y0": 0
}
```

横轴是位移，纵轴是速度。轨迹向内螺旋，说明机械能被阻尼不断带走。

### 实验 3：Python 计算振幅

```python title="由参数计算固有频率与振幅"
import math                       # 标准库 math：sqrt 开根号要用

m = 1.0                           # 振子质量：决定惯性
c = 0.2                           # 阻尼系数：越大能量耗散越快
k = 4.0                           # 弹簧刚度：决定自然频率
F = 0.4                           # 外力幅值（驱动力的大小）
omega = 2.0                       # 外力角频率：这里正好等于自然频率，是共振点
natural = math.sqrt(k / m)        # 自然频率 ω₀=√(k/m)，本课等于 2
ratio = c / (2 * math.sqrt(m * k))  # 阻尼比 ζ：除以 2√(mk) 才无量纲，<1 为欠阻尼
denominator = math.sqrt((k - m * omega ** 2) ** 2 + (c * omega) ** 2)  # 分母 = 刚度失配与阻尼的合成
amplitude = F / denominator      # 稳态振幅：分子是外力，分母越小振幅越吓人
print(round(natural, 3))         # round(值, 3)：保留三位小数
print(round(ratio, 3))
print(round(amplitude, 3))
```

输出 `2.0`、`0.05`、`1.0`。

## 6. 练习

```exercise
# @title: 练习：修正稳态振幅公式
# @check: 2.0
# @check: 0.05
# @check: 1.0
# @hint: 共振附近不能只用 F/k；分母要包含刚度失配项和阻尼项。
import math                     # 标准库 math：sqrt / pi

m = 1.0
c = 0.2
k = 4.0
F = 0.4
omega = 2.0
natural = math.sqrt(k / m)      # 自然频率，这行没错
ratio = c / (2 * math.sqrt(m * k))
amplitude = F / k               # ← 只在静态（ω=0）时才成立，共振附近必须用完整分母
print(round(natural, 3))
print(round(ratio, 3))
print(round(amplitude, 3))
```

<details>
<summary>点开查看逐步解答</summary>

稳态振幅公式是：

```python
import math      # 标准库 math：sqrt 开平方

m, c, k, F, omega = 1.0, 0.2, 4.0, 0.4, 2.0   # 元组解包：质量、阻尼、刚度、外力、驱动频率一次赋完
denominator = math.sqrt((k - m * omega ** 2) ** 2 + (c * omega) ** 2)   # 分母是实部与虚部的平方和再开方
amplitude = F / denominator   # 稳态振幅 = 外力 ÷ 分母
print(round(math.sqrt(k / m), 3))               # 固有频率 √(k/m)
print(round(c / (2 * math.sqrt(m * k)), 3))     # 阻尼比 c/(2√(mk))
print(round(amplitude, 3))                      # 稳态振幅
```

代入：

```text
denominator=sqrt(0²+0.4²)=0.4
amplitude=0.4/0.4=1.0
```

静态近似 $F/k$ 在共振附近完全失灵。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为共振一定意味着无限振幅。真实系统总有阻尼、非线性或破坏，振幅会被限制。

**误区二**：你以为阻尼只让运动变慢。它还消耗能量并改变位移与外力的相位。

**误区三**：你以为固有频率只和弹簧有关。它由刚度和质量共同决定。

:::

## 8. 快问快答

```quiz
阻尼比 ζ=0.05 表示什么？
- 临界阻尼
- 欠阻尼且接近无阻尼 [*]
- 过阻尼
? ζ<1 是欠阻尼；0.05 很小，所以仍会来回振动，共振峰很尖。
```

## 9. 选读：二阶方程变成二维一阶系统

<details>
<summary>选读 · 相空间升级</summary>

令 $v=x'$，则 $mx''+cx'+kx=0$ 等价于：

$$x'=v,\qquad v'=(-kx-cv)/m.$$

这样二阶方程变成二维一阶系统。相图中的螺旋或节点，就是位移和速度共同演化的轨迹。

</details>

## 10. 下一站

解析解漂亮，但三种阻尼情况各写各的解法，看着像三套武功。下一课把它们收进同一个框架：特征方程的三种根、一张表管总——同一个二阶方程的三种外衣。

→ [同一个二阶方程的三种外衣](./55-second-order-unified.md)
