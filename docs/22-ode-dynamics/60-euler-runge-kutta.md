---
title: Euler 法与 Runge-Kutta
lesson_id: ode/euler-runge-kutta
prereqs:
  - ode/vibration-resonance
  - integrals/riemann
  - integrals/numeric
volume: 2
layer: L9
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - euler-method
  - runge-kutta
applications:
  - simulation
  - orbital-mechanics
exits:
  - engineering
  - scientific-computing
---

# Euler 法与 Runge-Kutta

## 1. 从一个场景开始

很多微分方程没有漂亮公式，但飞船仍然能飞、气候仍然能算。秘密是数值解：不一次看穿未来，而是在很小的时间步里不断问“现在斜率是多少”。

## 2. 直觉解释

Euler 法最朴素：

$$y_{n+1}=y_n+h f(t_n,y_n).$$

它在每一步用起点斜率画一条短线。步长小，误差小；步长大，轨迹容易跑偏。

Runge-Kutta 不只看起点。经典 RK4 在步首、两次步中点和步末各采样一次，再加权平均，用同样的步长通常得到更准的解。

## 3. 正式定义

Euler 法：

$$y_{n+1}=y_n+h f(t_n,y_n).$$

Heun 法先预测终点，再用两端斜率平均：

$$\tilde y=y_n+h f(t_n,y_n),\qquad y_{n+1}=y_n+\frac h2\left[f(t_n,y_n)+f(t_{n+1},\tilde y)\right].$$

经典 RK4 为：

$$y_{n+1}=y_n+\frac h6(k_1+2k_2+2k_3+k_4).$$

其中 $k_1=f(t_n,y_n)$，$k_2=f(t_n+h/2,y_n+hk_1/2)$，$k_3=f(t_n+h/2,y_n+hk_2/2)$，$k_4=f(t_n+h,y_n+hk_3)$。

## 4. 分步例题

用方程 $y'=3-y$、初值 $y(0)=1$、步长 $h=0.1$ 做一步。

1. Euler：$y_1=1+0.1(3-1)=1.2$；
2. 精确解为 $y(t)=3-2e^{-t}$，所以 $y(0.1)=3-2e^{-0.1}\approx1.1903$；
3. Euler 误差约为 $1.2-1.1903=0.0097$；
4. RK4 在同一小步的误差远小于 Euler。

## 5. 动手实验

### 实验 1：三种方法赛跑

```viz
{
  "type": "ode-solver-race",
  "title": "Euler、Heun 与 RK4",
  "lambda": -1,
  "y0": 2,
  "tEnd": 2,
  "h": 0.4
}
```

把步长从 0.8 拖到 0.02。黑线是精确解；红、棕、绿分别是 Euler、Heun 和 RK4。

### 实验 2：方向场里的折线

```viz
{
  "type": "slope-field",
  "title": "y' = 3-y 的方向场",
  "expr": "3-y",
  "t0": 0,
  "y0": 1,
  "tmin": 0,
  "tmax": 3,
  "ymin": 0,
  "ymax": 4
}
```

拖动初值点。Euler 就是用一段段短线外推；步长越小，折线越难和真实曲线区分。

### 实验 3：Python 手算 Euler 一步

```python title="一步 Euler 与精确值对照"
import math

def f(t, y):
    return 3 - y

h = 0.1
y0 = 1.0
y1_euler = y0 + h * f(0, y0)
y_exact = 3 - 2 * math.exp(-0.1)
error = y_exact - y1_euler
print(round(y1_euler, 3))
print(round(y_exact, 3))
print(round(error, 3))
```

输出 `1.2`、`1.19`、`-0.01`。

### 实验 4：手算一步 RK4

仍用 $y'=3-y$、$y(0)=1$ 和 $h=0.1$。RK4 采样四个斜率：

```python title="一步 RK4 与精确值对照"
import math

def f(t, y):
    return 3 - y

h = 0.1
y = 1.0
k1 = f(0, y)
k2 = f(0 + h / 2, y + h * k1 / 2)
k3 = f(0 + h / 2, y + h * k2 / 2)
k4 = f(0 + h, y + h * k3)
y = y + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6
y_exact = 3 - 2 * math.exp(-0.1)
error = y_exact - y
print(k1)
print(k2)
print(k3)
print(k4)
print(round(y, 6))
print(f"{error:.7f}")   # .7f 表示固定显示 7 位小数
```

四个斜率约为 `2.0`、`1.9`、`1.905`、`1.8095`；RK4 得到 `1.190325`，误差只有约 `0.0000002`。同样的步长下，Euler 的误差约为 `0.0097`——多次采样换来了明显精度。

## 6. 练习

```exercise
# @title: 练习：修正 Euler 斜率
# @check: 1.2
# @check: 1.19
# @check: -0.01
# @hint: 方程是 y'=3-y；在 (0,1) 处斜率是 2，不是 4。
import math

def f(t, y):
    return 3 + y

h = 0.1
y0 = 1.0
y1_euler = y0 + h * f(0, y0)
y_exact = 3 - 2 * math.exp(-0.1)
error = y_exact - y1_euler
print(round(y1_euler, 3))
print(round(y_exact, 3))
print(round(error, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正规则：

```python
import math

def f(t, y):
    return 3 - y

h = 0.1
y0 = 1.0
y1_euler = y0 + h * f(0, y0)
y_exact = 3 - 2 * math.exp(-0.1)
error = y_exact - y1_euler
print(round(y1_euler, 3))
print(round(y_exact, 3))
print(round(error, 3))
```

Euler 一步：

```text
y1=1+0.1*(3-1)=1.2
```

精确值：

```text
y(0.1)=3-2e^(-0.1)≈1.1903
```

误差约为 $1.1903-1.2=-0.0097$，四舍五入为 `-0.01`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为步长减半误差一定减半。Euler 全局误差大约减半，RK4 的误差下降快得多。

**误区二**：你以为数值解贴合一段就一定长期可靠。刚性问题、大步长或不稳定区域会让误差爆炸。

**误区三**：你以为高阶方法永远更好。RK4 每步要算四次斜率；在相同计算预算下，有时小步长低阶法更合适。

:::

## 8. 快问快答

```quiz
Euler 法一步使用哪个斜率？
- 步首的斜率 [*]
- 步中点的斜率
- 步末的斜率
? 显式 Euler 只在当前点问一次斜率，然后沿这条短线跨到下一步。
```

## 9. 选读：为什么 RK4 更准

<details>
<summary>选读 · 多采样抵消误差</summary>

Euler 只用左端斜率，把弯曲路径当成直线。Heun 加入终点修正，RK4 则在步首、两次步中和步末采样，并用类似 Simpson 公式的权重组合。对光滑问题，Euler 全局误差大约与步长成正比，而经典 RK4 全局误差大约与步长的四次方成正比。步长减半时，RK4 的误差可能缩小到原来的约十六分之一。

</details>

## 10. 下一站

RK4 一步采样四次斜率，准了很多——但有一种方程，方法再准也救不了：快慢两个时钟共存的刚性问题。下一课看显式法如何被步长逼疯，隐式法如何一招治愈。

→ [刚性方程：快慢两个时钟的折衷](./62-stiff-equations.md)
