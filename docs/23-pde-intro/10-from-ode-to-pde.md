---
title: 从 ODE 到 PDE
lesson_id: pde/from-ode-to-pde
prereqs:
  - multivariable/partial-gradient
  - ode/slope-fields
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
  - partial-differential-equation
applications:
  - traveling-waves
  - traffic-models
exits:
  - engineering
---

# 从 ODE 到 PDE

## 1. 从一个场景开始

一根长绳被抖动一下，鼓包会向远处跑。绳上每个位置都有自己的高度，而这个高度又随时间变化。一个方程若同时管“哪里”和“何时”，它就不再只是常微分方程。

## 2. 直觉解释

ODE 追踪一个随时间变化的量，比如 $y(t)$。PDE 追踪一片量，比如 $u(x,t)$：每个位置 $x$ 都有一条自己的时间线。

把 $u(x,t)$ 想成一条会变形的曲线。横轴是位置，纵轴是时间。固定 $t$ 看横切面，得到某一瞬间的波形；固定 $x$ 看纵切面，得到某一点随时间的振动。

## 3. 正式定义

偏微分方程是未知多元函数与其偏导数满足的关系。最简单的行波方程是：

$$u_t+c u_x=0.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $u(x,t)$ | 未知函数 | 位置 $x$、时间 $t$ 处的高度 |
| $u_t$ | 时间偏导 | 固定位置时的变化率 |
| $u_x$ | 空间偏导 | 固定时刻沿空间的斜率 |
| $c$ | 波速 | 波形平移的速度 |

$u(x,t)=f(x-ct)$ 是一族解。代入后 $u_t=-c f'$，$u_x=f'$，所以 $u_t+c u_x=0$。

## 4. 分步例题

取 $u(x,t)=\sin(x-t)$。

1. 对 $t$ 求偏导：$u_t=-\cos(x-t)$；
2. 对 $x$ 求偏导：$u_x=\cos(x-t)$；
3. 相加得 $u_t+u_x=0$；
4. 因此它是波速 $c=1$ 的行波方程的解。

## 5. 动手实验

### 实验 1：时空图上的探针

```viz
{
  "type": "pde-probe",
  "title": "行波的时空地图",
  "amplitude": 1,
  "speed": 1,
  "wavelength": 2,
  "x": 1,
  "t": 0.5
}
```

在上方热图中横向拖动探针改变 $x$，纵向拖动改变 $t$；下方橙色曲线显示同一时刻的完整波形。播放时可以看到峰谷沿空间平移。

### 实验 2：让波倒着走

```viz
{
  "type": "pde-probe",
  "title": "负波速对应反向传播",
  "amplitude": 1,
  "speed": -1,
  "wavelength": 2,
  "x": 2,
  "t": 0.5
}
```

把速度滑块从正改为负，热图中的亮带方向翻转。符号 $c$ 不只是大小，还携带方向。

### 实验 3：用小差分检查偏导数

```python title="数值验证 u=sin(x-t)"
import math

h = 0.001
x = 1.0
t = 0.5

# 中心差分：用左右两个函数值的斜率近似导数
ut = (math.sin(x - (t + h)) - math.sin(x - (t - h))) / (2 * h)
ux = (math.sin((x + h) - t) - math.sin((x - h) - t)) / (2 * h)
residual = ut + ux
residual = round(residual, 3) + 0.0   # 加 0.0 是小技巧：把可能出现的负零 -0.0 变回 0.0
print(round(ut, 3))
print(round(ux, 3))
print(residual)
```

输出约为 `-0.878`、`0.878`、`0.0`。两个偏导数方向不同，但它们必须共同服从同一个 PDE。

## 6. 练习

```exercise
# @title: 练习：修好行波的残差
# @check: -0.878
# @check: 0.878
# @check: 0.0
# @hint: 方程是 u_t + c*u_x=0，当前波速为 1。注意第二项的符号。
import math

h = 0.001
x = 1.0
t = 0.5
c = 1.0
ut = (math.sin(x - (t + h)) - math.sin(x - (t - h))) / (2 * h)
ux = -(math.sin((x + h) - t) - math.sin((x - h) - t)) / (2 * h)
print(round(ut, 3))
print(round(ux, 3))
residual = round(ut + c * ux, 3) + 0.0   # 加 0.0：把可能的 -0.0 变回 0.0 再比对
print(residual)
```

<details>
<summary>点开查看逐步解答</summary>

对 $u=\sin(x-t)$ 来说：

$$u_t=-\cos(x-t),\qquad u_x=\cos(x-t).$$

所以代码里的 $u_x$ 不能再加负号。修正为：

```python
import math

h = 0.001
x = 1.0
t = 0.5
c = 1.0

ut = (math.sin(x - (t + h)) - math.sin(x - (t - h))) / (2 * h)
ux = (math.sin((x + h) - t) - math.sin((x - h) - t)) / (2 * h)
residual = ut + c * ux
residual = round(residual, 3) + 0.0
print(round(ut, 3))
print(round(ux, 3))
print(residual)
```

于是残差 $u_t+c u_x$ 接近零。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 $u_x$ 和 $u_t$ 是两个独立方程。它们是同一张时空曲面的两个切片方向。

**误区二**：你以为 PDE 只是“很多 ODE”。各点的演化还会通过空间导数互相牵连。

**误区三**：你以为波速只能是正数。正负号表示传播方向。

:::

## 8. 快问快答

```quiz
u_t 表示什么？
- 沿空间方向的斜率
- 固定位置时 u 随时间的变化率 [*]
- 波形的最大高度
? 下标 t 表示只对时间求偏导，位置 x 被暂时固定。
```

## 9. 选读：为什么 $f(x-ct)$ 自动成立

<details>
<summary>选读 · 链式法则的两步</summary>

设 $z=x-ct$，$u=f(z)$。由多元链式法则：

$$u_t=f'(z)\frac{\partial z}{\partial t}=-cf'(z),\qquad u_x=f'(z)\frac{\partial z}{\partial x}=f'(z).$$

两者相加为零。这说明任何足够光滑的初始形状都会原样向右平移。

</details>

## 10. 下一站

波形移动只是现象。要问热量、污染物或概率为什么会流，需要先给“流动”一个可计算的语言：通量。

→ [通量与守恒律](./20-flux-conservation.md)
