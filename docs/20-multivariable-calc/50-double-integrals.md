---
title: 二重积分与 Fubini 直觉
lesson_id: multivariable/double-integrals
prereqs:
  - multivariable/hessian-shape
  - integrals/riemann
volume: 2
layer: L7
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - double-integral
  - fubini
applications:
  - volume
  - probability-density
exits:
  - engineering
  - data-ai
---

# 二重积分与 Fubini 直觉

## 1. 从一个场景开始

一元积分把曲线下的线段切成小条；二元积分把曲面下的区域切成小地砖。每块地砖上立一根柱子，柱体体积加起来，就是曲面下的体积。

## 2. 直觉解释

把矩形 $[a,b]\times[c,d]$ 切成 $m\times n$ 个小矩形。每个小格取中心高度 $f(x_i,y_j)$，底面积是

$$\Delta A=\Delta x\,\Delta y.$$

二重黎曼和为：

$$\sum_{j=1}^n\sum_{i=1}^m f(x_i,y_j)\Delta x\Delta y.$$

网格无限变细时，这个和趋向二重积分。

## 3. 正式定义

$$\iint_R f(x,y)\,dA=\int_c^d\left(\int_a^b f(x,y)\,dx\right)dy.$$

对连续函数，先固定 $y$ 对 $x$ 积分，再对 $y$ 积分；也可以交换顺序。这个交换思想常叫 Fubini 直觉。

## 4. 分步例题

计算

$$\int_0^3\int_0^2xy\,dx\,dy.$$

1. 固定 $y$，内层：

$$\int_0^2xy\,dx=y\left[\frac{x^2}{2}\right]_0^2=2y.$$

2. 外层：

$$\int_0^32y\,dy=\left[y^2\right]_0^3=9.$$

3. 所以曲面下的体积是 9。

注意一个特殊现象：各小格中心的高度并不相同——离原点近的格子矮，远的格子高。真正不随网格变化的是这些高度的平均值：均匀网格的中心点在 $x$ 方向关于 $\frac{a+b}{2}$ 左右对称、在 $y$ 方向关于 $\frac{c+d}{2}$ 前后对称，偏高偏低逐对抵消，两个方向的中心点各自平均出 $\frac{a+b}{2}$ 与 $\frac{c+d}{2}$；又因均匀网格恰好让每个 $x$ 中心与每个 $y$ 中心各搭配一次，全部高度的平均值就是二者之积 $\frac{a+b}{2}\cdot\frac{c+d}{2}$（本例即 $1\times1.5=1.5$）。黎曼和等于「平均高度 × 总面积」，所以只要划分均匀，网格无论多粗都得 $1.5\times6=9$。下面另用非线性例子观察真正的收敛过程。

## 5. 动手实验

### 实验 1：二维黎曼柱体

```viz
{
  "type": "riemann2d",
  "title": "x²y² 的二重黎曼和",
  "expr": "x^2*y^2",
  "a": 0,
  "b": 2,
  "c": 0,
  "d": 3,
  "nx": 6,
  "ny": 6,
  "exact": 24
}
```

拖动网格数。小柱体越分越细，读数逼近精确值 24；读数旁会同时显示误差。

### 实验 2：一元切片对照

```viz
{
  "type": "riemann",
  "title": "外层：8y²/3 从 0 到 3（图中 x 轴代表 y）",
  "expr": "(8.0/3.0)*x*x",
  "xmin": 0,
  "xmax": 3,
  "n": 8
}
```

对 $x^2y^2$ 先积 $x$，被积函数变成 $\frac83y^2$。这张图展示外层积分的面积。

### 实验 3：Python 数值二重黎曼和

```python title="用中心点近似体积"
def f(x, y):
    return x * x * y * y

a = 0.0
b = 2.0
c = 0.0
d = 3.0
nx = 200
ny = 200
dx = (b - a) / nx
dy = (d - c) / ny
total = 0.0
for i in range(nx):
    for j in range(ny):
        x = a + (i + 0.5) * dx
        y = c + (j + 0.5) * dy
        total = total + f(x, y) * dx * dy
print(round(total, 3))
```

输出 `24.0`。

### 实验 4：矩形之外先切条带

上面的网页组件只画矩形区域。若区域变成三角形 $R=\lbrace 0\le y\le x\le2\rbrace$，就让外层 $y$ 从 0 到 2，内层 $x$ 从 $y$ 到 2：

```python title="用中心点近似三角形上的总量"
def f(x, y):
    return x * x * y * y

a = 0.0
b = 2.0
n = 200
dy = (b - a) / n
total = 0.0
for j in range(n):
    y = a + (j + 0.5) * dy
    dx = (b - y) / n
    for i in range(n):
        x = y + (i + 0.5) * dx
        total = total + f(x, y) * dx * dy
print(round(total, 3))
```

输出 `3.556`。这里没有新的公式魔法：只是把每个 $y$ 条带的左端点从常数换成 $y$，让“地砖”跟着斜边收缩。

## 6. 练习

```exercise
# @title: 练习：补全二重积分
# @check: 4.0
# @check: 9.0
# @check: 9.0
# @hint: 先算内层 ∫xy dx；再把它作为 y 的函数从 0 积到 3。
def inner_integral(y):
    return y

def outer_integral(y):
    return inner_integral(y)

print(round(inner_integral(2), 3))
print(round(outer_integral(3), 3))
print(round(outer_integral(3), 3))
```

<details>
<summary>点开查看逐步解答</summary>

内层：

```python
def inner_integral(y):
    return 2.0 * y
```

在 $y=2$ 时值是 4。外层：

```python
def outer_integral(limit):
    return 1.0 * limit * limit
```

所以：

```text
inner_integral(2)=4
outer_integral(3)=9
```

判题期望的三个数分别对应内层积分在 $y=2$ 的值、外层积分在 $y=3$ 的值和最终体积：`4.0`、`9.0`、`9.0`。

可执行复查：

```python
def inner_integral(y):
    return 2.0 * y

def outer_integral(limit):
    return 1.0 * limit * limit

print(round(inner_integral(2), 3))
print(round(outer_integral(3), 3))
print(round(outer_integral(3), 3))
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为二重积分只能先积 $x$。对连续函数，两种顺序都行；选错顺序只是计算更难。

**误区二**：你以为高度必须非负。负高度贡献负体积，二重积分算的是带符号总量。

**误区三**：你以为网格粗细不影响结果。有限黎曼和只是近似；精确值来自极限。

:::

## 8. 快问快答

```quiz
二重积分中 dA 表示什么？
- 一条线段的长度
- 一小块面积 [*]
- 一个曲面本身
? dA=dx·dy，代表小矩形的面积；乘以高度后成为小柱体体积。
```

## 9. 选读：为什么连续函数可交换顺序

<details>
<summary>选读 · Fubini 的直观版</summary>

把矩形区域切成许多小格。按行求和再按列求和，总数相同。连续函数保证网格变细时两个方向的黎曼和都趋向同一极限，因此累次积分可以交换。若函数不连续或有奇点，就要更谨慎。

</details>

## 10. 下一站

矩形地砖对付矩形区域顺手，碰上圆盘就磕磕绊绊。下一课换地砖：极坐标扇形地砖配上 Jacobian 记账员，把"形状对不上"的积分一一驯服。

→ [二重积分换元：极坐标与雅可比](./55-change-variables.md)
