---
title: 相图与线性化
lesson_id: ode/phase-portraits
prereqs:
  - ode/equilibrium-stability
  - linalg-advanced/eigenvalues
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
  - phase-portrait
  - linearization
applications:
  - predator-prey-models
  - control-systems
exits:
  - engineering
  - research
---

# 相图与线性化

## 1. 从一个场景开始

追踪一只兔子的数量只需一条数轴；同时追踪兔子和狐狸，就需要一个平面。横轴是兔子，纵轴是狐狸，时间被藏进箭头里——这张图叫相图。

## 2. 直觉解释

二维线性系统写成：

$$\frac{d}{dt}\binom{x}{y}=A\binom{x}{y}.$$

每个点有一个速度箭头。从初值出发顺着箭头走，得到相轨迹。

平衡点在原点。矩阵 $A$ 的特征值决定它的性格：两个负实特征值是稳定节点，一正一负是鞍点，复特征值对应螺旋。

## 3. 正式定义

对线性系统矩阵 $A$，特征方程是：

$$\lambda^2-\operatorname{tr}(A)\lambda+\det(A)=0.$$

判别式为：

$$\Delta=\operatorname{tr}(A)^2-4\det(A).$$

| 特征值 | 平衡类型 |
| --- | --- |
| 两个负实数 | 稳定节点 |
| 两个正实数 | 不稳定节点 |
| 一正一负 | 鞍点 |
| 实部均为负的复数 | 稳定螺旋 |
| 纯虚数 | 中心 |
| 相等实根 | 重根情形：沿不变方向伸缩；几何不足时还会出现剪切 |

## 4. 分步例题

取

$$A=\begin{pmatrix}0&1\\-2&-3\end{pmatrix}.$$

1. 迹为 $\operatorname{tr}(A)=-3$；
2. 行列式为 $\det(A)=0\cdot(-3)-1\cdot(-2)=2$；
3. 判别式为 $\Delta=(-3)^2-4\cdot2=1$；
4. 特征值为 $\lambda=\frac{-3\pm1}{2}$，即 $-1$ 和 $-2$；
5. 两个特征值都是负实数，原点是稳定节点。

## 5. 动手实验

### 实验 1：线性相图

```viz
{
  "type": "phase-portrait",
  "title": "稳定节点",
  "matrix": [0, 1, -2, -3],
  "x0": 2,
  "y0": 1
}
```

拖动白色初值点。紫箭头是速度场，绿线是特征方向，橙线是轨迹。所有轨迹最终被吸向原点。

### 实验 2：一维平衡对照

```viz
{
  "type": "equilibrium-probe",
  "title": "特征值 -2 对应的一维收缩",
  "expr": "-2*y",
  "ymin": -2,
  "ymax": 2,
  "y0": 1.5
}
```

把二维系统沿一个特征方向切片，就会看到指数收缩。稳定节点就是两个方向都在收缩。

### 实验 3：重根与剪切

```viz
{
  "type": "phase-portrait",
  "title": "亏损重根：只有一条不变方向",
  "matrix": [-1, 1, 0, -1],
  "x0": 1,
  "y0": 1
}
```

这个矩阵的特征值是重复的 $-1$，但几何上只剩一条不变方向。轨迹不会转圈，而是先被“剪切”一下，再贴着特征方向回到原点。这正说明：知道重根还不够，还要看有没有足够的特征方向。这类"亏损"矩阵的代数拆解——Jordan 块把动作拆成"伸缩 + 一次推搡"——在第 21 章[Jordan 标准形：不可对角化时的第二套坐标](../21-linear-algebra-advanced/105-jordan-form.md)完成。

### 实验 4：Python 分类平衡点

```python title="由迹、行列式和判别式分类"
a = 0.0
b = 1.0
c = -2.0
d = -3.0
trace = a + d
det = a * d - b * c
disc = trace * trace - 4 * det
status = "stable node" if disc > 0 and trace < 0 else "other"
print(round(trace, 3))
print(round(det, 3))
print(round(disc, 3))
print(status)
```

输出 `-3.0`、`2.0`、`1.0`、`stable node`。

## 6. 练习

```exercise
# @title: 练习：修正判别式并分类
# @check: -3.0
# @check: 2.0
# @check: 1.0
# @check: stable node
# @hint: 判别式是 trace²-4det，不要把减号写成加号；分类行也要改——det>0 且 trace<0 且 disc>0 才是 stable node。
a = 0.0
b = 1.0
c = -2.0
d = -3.0
trace = a + d
det = a * d - b * c
disc = trace * trace + 4 * det
status = "saddle" if det < 0 else "other"
print(round(trace, 3))
print(round(det, 3))
print(round(disc, 3))
print(status)
```

<details>
<summary>点开查看逐步解答</summary>

正确判别式：

```python
a, b, c, d = 0.0, 1.0, -2.0, -3.0
trace = a + d
det = a * d - b * c
disc = trace * trace - 4 * det
print(round(trace, 3))
print(round(det, 3))
print(round(disc, 3))
# 链式比较 0 < disc < trace*trace：等价于 disc>0 且 disc<trace*trace
print("stable node" if 0 < disc < trace * trace and trace < 0 else "other")
```

代入：

```text
trace=-3
det=2
disc=9-8=1
```

判别式为正且迹为负，两个特征值都是负实数，所以输出 `stable node`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为相图里的横轴是时间。相图坐标是状态 $x,y$；时间藏在轨迹的行进方向里。

**误区二**：你以为复特征值代表发散。是否发散取决于实部；纯虚数对应闭合小圆，负实部才是向内螺旋。

**误区三**：你以为鞍点会吸引一切。鞍点有吸引方向也有排斥方向，大多数初值最终被推开。

:::

## 8. 快问快答

```quiz
二维相图中一条曲线表示什么？
- 一个状态分量随时间变化的图像
- 一个初值随时间演化的轨迹 [*]
- 矩阵的一行
? 相图把时间隐藏起来，直接画出状态点在状态空间中走过的路径。
```

## 9. 选读：非线性系统的线性化

<details>
<summary>选读 · 在平衡点附近装上放大镜</summary>

对非线性系统 $\vec x'=F(\vec x)$，在平衡点 $\vec p$ 处计算 Jacobian $J_F(\vec p)$。若它有实部非零的特征值，附近轨迹常与线性系统 $\vec y'=J_F(\vec p)\vec y$ 类似。因此先求平衡点，再算 Jacobian 特征值，是判断局部稳定性的标准路线。

看一个阻尼单摆：令 $\theta$ 是偏离最低点的角度、$\omega$ 是角速度，则

$$\theta'=\omega,\qquad \omega'=-\sin\theta-0.4\omega.$$

在最低点 $(0,0)$，Jacobian 为 $\begin{pmatrix}0&1\\-1&-0.4\end{pmatrix}$，特征值为 $-0.2\pm0.98i$，所以小摆动会螺旋回到最低点。在倒立点 $(\pi,0)$，Jacobian 为 $\begin{pmatrix}0&1\\1&-0.4\end{pmatrix}$，两个实特征值一正一负，因此是鞍点。这就是“用线性放大镜看非线性平衡点”的实际用法。

</details>

## 10. 下一站

节点、鞍点和螺旋描述自由运动。下一课给系统装上弹簧、阻尼器和周期外力，看看振动如何被阻尼驯服，又被共振放大。

→ [振动、阻尼与共振](./50-vibration-resonance.md)
