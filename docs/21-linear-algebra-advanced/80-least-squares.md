---
title: 最小二乘与正规方程
lesson_id: linalg-advanced/least-squares
prereqs:
  - linalg-advanced/positive-definite
volume: 2
layer: L6
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - least-squares
applications:
  - regression
  - measurement-fitting
exits:
  - data-ai
  - engineering
---

# 最小二乘与正规方程

## 1. 从一个场景开始

三个点很少恰好落在一条直线上。方程组“斜率和截距必须同时满足所有点”往往无解；但工程师仍然要说一条最合理的线。最小二乘的回答是：放弃“完全穿过”，最小化竖直误差的平方和。

## 2. 直觉解释

给定点 $(1,1)$、$(2,2)$、$(3,4)$，想找 $y=mx+b$。三个点提出三个约束，但未知数只有两个，通常无精确解。

最小二乘把每个点与直线之间的**竖直误差**平方后相加：

$$S(m,b)=\sum_{i=1}^n(y_i-mx_i-b)^2.$$

最好的 $m,b$ 是让 $S$ 最低的一组。几何上，把 $y$ 向量投影到由 $x$ 向量和全 1 向量张成的平面。

## 3. 正式定义

对一元线性拟合，令

$$S_x=\sum x_i,\quad S_y=\sum y_i,\quad S_{xx}=\sum x_i^2,\quad S_{xy}=\sum x_iy_i.$$

正规方程给出：

$$m=\frac{nS_{xy}-S_xS_y}{nS_{xx}-S_x^2},\qquad b=\frac{S_y-mS_x}{n}.$$

分母为零时，所有 $x$ 相同，直线方向无法唯一确定。

## 4. 分步例题

用 $(1,1)$、$(2,2)$、$(3,4)$。

1. $n=3$，$S_x=6$，$S_y=7$；
2. $S_{xx}=1+4+9=14$，$S_{xy}=1+4+12=17$；
3. $m=(3\cdot17-6\cdot7)/(3\cdot14-6^2)=9/6=1.5$；
4. $b=(7-1.5\cdot6)/3=-2/3$；
5. 预测为 $0.833,2.333,3.833$，误差为 $0.167,-0.333,0.167$，平方和为 $0.167$。

## 5. 动手实验

### 实验 1：拖点看线追着跑

```viz
{
  "type": "least-squares-fit",
  "title": "竖直误差的平方和",
  "points": [[1, 1], [2, 2], [3, 4]]
}
```

拖动蓝点，紫线会实时重算。红色线段是竖直残差；把一个点抬高，看它如何拉动整条线。

### 实验 2：投影视角

```viz
{
  "type": "pca-projection",
  "title": "拟合也是把信息投影到低维骨架",
  "points": [[1, 1], [2, 2], [3, 4]]
}
```

PCA 投影最小化**垂直残差**；最小二乘回归最小化**竖直残差**。转动方向并比较两种几何问题。

### 实验 3：Python 正规方程

```python title="三步算斜率和截距"
points = [[1, 1], [2, 2], [3, 4]]
n = len(points)   # len() 返回列表长度

sx = sum(point[0] for point in points)
sy = sum(point[1] for point in points)
sxx = sum(point[0] * point[0] for point in points)
sxy = sum(point[0] * point[1] for point in points)

m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
b = (sy - m * sx) / n
print(round(m, 3))
print(round(b, 3))
residuals = [point[1] - (m * point[0] + b) for point in points]
sse = sum(residual * residual for residual in residuals)
print(round(sse, 3))
```

输出 `1.5`、`-0.667`、`0.167`。

## 6. 练习

```exercise
# @title: 练习：修正正规方程
# @check: 1.5
# @check: -0.667
# @check: 0.167
# @hint: 斜率分母是 n*Sxx-Sx²，不是加法；残差平方和要先用直线算三个预测值。
points = [[1, 1], [2, 2], [3, 4]]
n = len(points)
sx = 6
sy = 7
sxx = 14
sxy = 17

m = (n * sxy - sx * sy) / (n * sxx + sx * sx)
b = (sy - m * sx) / n
sse = 5.5
print(round(m, 3))
print(round(b, 3))
print(round(sse, 3))
```

<details>
<summary>点开查看逐步解答</summary>

分母应为：

```python
points = [[1, 1], [2, 2], [3, 4]]
n = len(points)
sx = sum(x for x, _ in points)
sy = sum(y for _, y in points)
sxx = sum(x * x for x, _ in points)
sxy = sum(x * y for x, y in points)

m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
b = (sy - m * sx) / n
predictions = [m * x + b for x, _ in points]
sse = sum((y - prediction) ** 2 for (_, y), prediction in zip(points, predictions))
print(round(m, 3))
print(round(b, 3))
print(round(sse, 3))
```

得 $m=1.5$，$b=-2/3$。预测值：

```text
x=1 -> 0.833，误差 0.167
x=2 -> 2.333，误差 -0.333
x=3 -> 3.833，误差 0.167
```

所以：

```text
0.167²+(-0.333)²+0.167²≈0.167
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为回归线最小化点到直线的垂直距离。普通最小二乘最小化竖直方向的 $y$ 误差；垂直残差是 PCA 或正交回归的问题。

**误区二**：你以为残差和最小就是最优。正负误差会抵消，所以要最小化平方和。

**误区三**：你以为正规方程总能安全硬解。当列接近共线时分母很小，数值误差会被放大，工程上常用更稳定的分解。

:::

## 8. 快问快答

```quiz
最小二乘拟合的“残差”通常指什么？
- 点到直线的垂直长度
- 实际 y 减去预测 y [*]
- 两个相邻点之间的距离
? 一元线性回归固定自变量 x，只允许直线在竖直方向上解释误差。
```

## 9. 选读：正规方程从求导来

<details>
<summary>选读 · 两个偏导置零</summary>

对 $S(m,b)$ 分别求 $\partial S/\partial m$ 和 $\partial S/\partial b$，并令其为零：

$$\sum x_i(y_i-mx_i-b)=0,\qquad \sum(y_i-mx_i-b)=0.$$

整理后正是正规方程。几何解释是：误差向量与两个拟合基向量都垂直，因此预测向量就是 $y$ 在列空间上的投影。

</details>

## 10. 下一站

最小二乘把矩阵当作“近似机器”。下一课退一步问：什么样的函数才配叫线性映射？它的核与像如何决定能保留什么、丢失什么？

→ [向量空间与线性映射](./90-linear-maps.md)
