---
title: CFL 与显式格式稳定性
lesson_id: pde/cfl-stability
prereqs:
  - pde/finite-difference-heat
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
  - cfl-condition
  - amplification-factor
applications:
  - weather-models
  - shock-capturing
exits:
  - engineering
  - scientific-computing
---

# CFL 与显式格式稳定性

## 1. 从一个场景开始

风一分钟吹过一个格子，你的程序却两分钟才更新一次。信息在一个时间步里跨过的距离超过了网格能表达的范围，误差只好以震荡的方式接管画面。这就是 CFL 条件最朴素的版本。

## 2. 直觉解释

对流方程 $u_t+cu_x=0$ 中，信息以速度 $c$ 移动。显式迎风格式每步只能可靠地看相邻格点。

定义 CFL 数：

$$r=\frac{c\Delta t}{\Delta x}.$$

它表示一个时间步内波形跨过的格点数。对一维迎风格式，要求 $0\le r\le1$：不能跑超过一个格子。

## 3. 正式定义

设 $c>0$，迎风格式用左侧已知值：

$$U_i^{j+1}=U_i^j-r(U_i^j-U_{i-1}^j).$$

把误差模态写成 $G^j e^{i\theta i}$，可得放大因子：

$$G=1-r(1-e^{-i\theta})=1-r+r e^{-i\theta}.$$

对所有相位 $\theta$ 都要求 $|G|\le1$。几何上，$G$ 的轨迹是以 $1-r$ 为圆心、半径 $r$ 的圆；它必须留在复平面单位圆内，这正好给出 $0\le r\le1$。

## 4. 分步例题

设 $c=2$，$\Delta x=0.1$，$\Delta t=0.04$。

1. 一个时间步的空间位移是 $c\Delta t=0.08$；
2. 格距是 $\Delta x=0.1$；
3. 所以 CFL 数 $r=0.08/0.1=0.8$；
4. 因为 $r\le1$，迎风格式通过 CFL 检查。

若 $\Delta t=0.06$，则位移为 $0.12$，$r=1.2$。信息试图越过邻点，显式格式失去可靠依赖域。

## 5. 动手实验

### 实验 1：复平面安全圈

```viz
{
  "type": "stability-plane",
  "title": "迎风格式的放大因子轨迹",
  "re": 0.68,
  "im": -0.64
}
```

绿圆是不放大误差的安全域，橙圈是一个 CFL 数下所有波数的 $G$ 轨迹。白点可在实轴与虚轴构成的复平面上横纵拖动，反推出 $r$ 和相位。

### 实验 2：临界 CFL

```viz
{
  "type": "stability-plane",
  "title": "r=1 的临界轨迹",
  "re": 0,
  "im": -1
}
```

当 $r$ 接近 1，橙圈内切绿圆；所有波数刚好不放大。越过 1 后，部分轨迹离开绿圆，误差逐渐增长。

### 实验 3：扫描最坏相位

```python title="找出最大的放大倍数"
import math

r = 0.8
largest = 0

# range(0,101) 给出 0 到 100 共 101 个相位样本
for n in range(0, 101):
    theta = math.pi * n / 100
    real_part = 1 - r + r * math.cos(theta)
    imag_part = -r * math.sin(theta)
    growth = math.sqrt(real_part * real_part + imag_part * imag_part)
    # if 比较：只有发现更大的放大倍数时才替换 largest
    if growth > largest:
        largest = growth

stable = largest <= 1
print(round(r, 3))
print(round(largest, 3))
print(stable)
```

输出 `0.8`、`1.0`、`True`。把 `r` 改成 `1.2` 再运行，最大放大倍数会大于 1。

## 6. 练习

```exercise
# @title: 练习：算出 CFL 并判断稳定性
# @check: 1.2
# @check: 1.4
# @check: False
# @hint: CFL 数等于 c*dt/dx；迎风格式的稳定条件是 0<=r<=1。
c = 2.0
dt = 0.06
dx = 0.1

r = dx / dt
growth = 2 * r - 1
stable = r <= 1
print(round(r, 3))
print(round(growth, 3))
print(stable)
```

<details>
<summary>点开查看逐步解答</summary>

CFL 数应按定义计算：

```python
c = 2.0
dt = 0.06
dx = 0.1

r = c * dt / dx
growth = 2 * r - 1
stable = r <= 1
print(round(r, 3))
print(round(growth, 3))
print(stable)
```

于是：

```text
r=2*0.06/0.1=1.2
最坏相位 growth=|1-2r|=1.4
stable=False
```

这说明时间步太大，显式迎风结果不可靠。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 CFL 条件本身就是收敛证明。它常是显式格式稳定的必要条件，精度和收敛仍要另证。

**误区二**：你以为所有 PDE 的 CFL 上限都是 1。方程、维度和格式都会改变限制。

**误区三**：你以为负波速能忽略方向。迎风侧要根据传播方向选择上游格点。

:::

## 8. 快问快答

```quiz
CFL 数 r=c*dt/dx 表示什么？
- 空间格子的总数
- 一个时间步内波形跨过的格距数 [*]
- 数值解的最大振幅
? 它是比较物理传播距离 c*dt 与网格尺度 dx 的无量纲数。
```

## 9. 选读：依赖域不匹配

<details>
<summary>选读 · 为什么越过 1 会失败</summary>

连续问题的精确解在特征线 $x-ct=\text{常数}$ 上传递。显式差分解在第 $j$ 步只依赖不超过 $j$ 个格点的初始数据。若 $r>1$，真特征线在一个时间步里越出了这个数值依赖锥，格式无法看到真正决定答案的数据。

</details>

## 10. 下一站

到这里，你已经有了 PDE 的第一套完整闭环：记号、通量、定解条件、热扩散和数值稳定。后续课程将继续走向对流特征线、波动方程与分离变量。

→ [第 23 章 · 偏微分方程入门](./index.md)
