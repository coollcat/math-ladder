---
title: 差分与稳定性
lesson_id: pde/finite-difference-heat
prereqs:
  - pde/heat-equation-1d
  - ode/euler-runge-kutta
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
  - finite-difference
  - numerical-stability
applications:
  - simulation
  - numerical-solver
exits:
  - engineering
  - scientific-computing
---

# 差分与稳定性

## 1. 从一个场景开始

屏幕上没有无限细的金属杆，只有一格一格的温度值。要用计算机解热方程，就得把导数变成相邻格点的加减法。可一旦时间步迈得太大，数值解会突然炸成锯齿。

## 2. 直觉解释

把空间分成间距 $\Delta x$ 的格子，把时间分成步长 $\Delta t$。记第 $i$ 格、第 $j$ 层的温度为 $U_i^j$。

时间导数用向前差分，二阶空间导数用三点模板：

$$U_{i-1}^j,\quad U_i^j,\quad U_{i+1}^j.$$

这样得到显式格式：下一层的值可以直接由上一层算出。

## 3. 正式定义

显式 Euler 热方程格式为：

$$U_i^{j+1}=U_i^j+r(U_{i-1}^j-2U_i^j+U_{i+1}^j),$$

其中：

$$r=\frac{k\Delta t}{\Delta x^2}.$$

对一维热方程，这个格式稳定的经典条件是：

$$r\le\frac12.$$

$r$ 可以看成“一步内最多搬走多少份差异”。超过一半时，局部高点会被过度修正成低点，误差来回放大。

## 4. 分步例题

设三个相邻值为 $U_{i-1}=0.4$，$U_i=0.8$，$U_{i+1}=0.2$，取 $r=0.4$。

1. 三点组合为 $0.4-2\times0.8+0.2=-1.0$；
2. 更新量为 $r(-1.0)=-0.4$；
3. 新值是 $0.8-0.4=0.4$；
4. 高点下降但没有翻到过头的负差异。

若改用 $r=1.2$，新值为 $0.8+1.2(-1.0)=-0.4$。原本非负的温度被推成负数，这是失稳的信号。

## 5. 动手实验

### 实验 1：拖动差分模板

```viz
{
  "type": "fd-heat-stencil",
  "title": "热方程三层模板",
  "cols": 10,
  "rows": 6,
  "i": 4,
  "j": 2
}
```

白框可以在时空网格上横向换空间位置、纵向换时间层。绿色是当前已知值，橙色是左右邻居；紫色目标格由它们加权得到。

### 实验 2：观察一层更新

```viz
{
  "type": "fd-heat-stencil",
  "title": "把模板移到边界附近",
  "cols": 12,
  "rows": 5,
  "i": 1,
  "j": 1
}
```

靠近边界的格点少了一个自由邻居，实际程序必须先应用上一课的边界规则，再使用内部模板。

### 实验 3：手算一步并测试稳定参数

```python title="显式热格式的一步"
r = 0.4
u_left = 0.4
u_center = 0.8
u_right = 0.2

# 显式格式：当前值加上 r 倍的二阶差分
u_new = u_center + r * (u_left - 2 * u_center + u_right)
stable = r <= 0.5
print(round(u_new, 3))
print(stable)
```

输出 `0.4` 和 `True`。把 `r` 改成大于 0.5 后再运行，就能看到过度修正。

## 6. 练习

```exercise
# @title: 练习：修正显式格式的新值
# @check: -0.4
# @check: False
# @hint: 使用 U+r*(left-2*center+right)，并用 r<=0.5 判断稳定性。
r = 1.2
u_left = 0.4
u_center = 0.8
u_right = 0.2

u_new = u_center - r * (u_left - 2 * u_center + u_right)
stable = r < 1
print(round(u_new, 3))
print(stable)
```

<details>
<summary>点开查看逐步解答</summary>

正确更新为：

```python
r = 1.2
u_left = 0.4
u_center = 0.8
u_right = 0.2

u_new = u_center + r * (u_left - 2 * u_center + u_right)
stable = r <= 0.5
print(round(u_new, 3))
print(stable)
```

三点组合是 `-1.0`，所以：

```text
u_new=0.8+1.2*(-1.0)=-0.4
stable=False
```

负温度和 False 都提示这个步长不可信。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为数值解爆炸说明热方程错了。通常是离散格式或步长违反稳定条件。

**误区二**：你以为缩小空间格距一定更好。$\Delta x$ 变小时，显式方法允许的 $\Delta t$ 也按平方变小。

**误区三**：你以为输出有界就一定准确。稳定只排除放大失控，精度还要另看截断误差。

:::

## 8. 快问快答

```quiz
一维显式热格式的经典稳定条件是什么？
- r 小于等于 0.5 [*]
- r 小于等于 1
- 只要 Delta t 很小就行
? 还要与 k、Delta x 一起组成 r=k*Delta t/(Delta x)^2；条件是 r<=1/2。
```

## 9. 选读：为什么条件是 1/2

<details>
<summary>选读 · 用傅里叶模态看放大因子</summary>

把误差写成波模 $G^j e^{ik i\Delta x}$。代入格式得：

$$G=1-4r\sin^2\frac{k\Delta x}{2}.$$

要所有波模都不放大，需 $|G|\le1$。最坏情况对应 $\sin^2=1$，于是 $|1-4r|\le1$，给出 $0\le r\le1/2$。

</details>

## 10. 下一站

热方程的限制来自二阶扩散。对流方程会更挑剔吗？下一课把 CFL 数请出来，看信息跑多快和时间步的关系。

→ [CFL 与显式格式稳定性](./55-cfl-stability.md)
