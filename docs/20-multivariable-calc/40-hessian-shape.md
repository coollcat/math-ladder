---
title: Hessian 与局部形状
lesson_id: multivariable/hessian-shape
prereqs:
  - multivariable/jacobian-chain
volume: 2
layer: L7
track:
  - analysis-change
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - hessian
applications:
  - optimization
  - stability-analysis
exits:
  - data-ai
  - engineering
---

# Hessian 与局部形状

## 1. 从一个场景开始

地形图上高度为零的点可能是谷底、山顶，也可能是马鞍。只看一阶导数都等于零，分不清这三种命运；要继续问“离开这一点后，坡度如何变化”。

## 2. 直觉解释

梯度是坡度向量；Hessian 是坡度的变化率矩阵。它记录四个二阶变化：

$$H=\begin{pmatrix}f_{xx}&f_{xy}\\f_{yx}&f_{yy}\end{pmatrix}.$$

对称 Hessian 常有两个互相垂直的特殊弯曲方向：沿某个方向二阶变化的放大系数叫它的特征值。这里先记住直觉——两个特征值都为正，所有方向都向上弯，临界点是局部最低点；一正一负，则是马鞍。正式求法会在后面的特征值课展开。

## 3. 正式定义

若二阶偏导连续，则 $f_{xy}=f_{yx}$，Hessian 是对称矩阵：

$$H_f=\begin{pmatrix}\partial^2 f/\partial x^2 & \partial^2 f/\partial x\partial y\\\partial^2 f/\partial y\partial x & \partial^2 f/\partial y^2\end{pmatrix}.$$

在临界点 $\nabla f=0$ 处：

| Hessian | 临界点 |
| --- | --- |
| 正定 | 局部最小 |
| 负定 | 局部最大 |
| 不定 | 鞍点 |
| 半定/零 | 退化，需要更多分析 |

## 4. 分步例题

取

$$f(x,y)=2x^2+3y^2+xy.$$

1. $f_x=4x+y$，$f_y=x+6y$；
2. 原点满足 $f_x=f_y=0$；
3. 二阶偏导：$f_{xx}=4$，$f_{xy}=1$，$f_{yy}=6$；
4. Hessian 为 $\begin{pmatrix}4&1\\1&6\end{pmatrix}$；
5. 行列式 $=24-1=23>0$ 且 $f_{xx}=4>0$，所以原点是局部最小。

## 5. 动手实验

### 实验 1：曲率形状盘

```viz
{
  "type": "hessian-curvature",
  "title": "碗底、山顶与马鞍",
  "a": 2,
  "b": 3,
  "c": 1
}
```

拖动系数。绿色/红色箭头是 Hessian 特征方向；等高线会从椭圆变成双曲线。

### 实验 2：正定性对照

```viz
{
  "type": "quadratic-form",
  "title": "Hessian 的二次型",
  "matrix": [4, 1, 1, 6]
}
```

若二次型全绿，Hessian 正定；出现红色区域，则存在下降方向。

### 实验 3：Python 分类临界点

```python title="由二阶偏导分类"
def f(x, y):
    return 2 * x * x + 3 * y * y + x * y

x = 0.0
y = 0.0
h = 0.0001
fxx = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / (h * h)
fyy = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / (h * h)
fxy = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h)
det = fxx * fyy - fxy * fxy
print([round(fxx, 3), round(fxy, 3)])
print([round(fxy, 3), round(fyy, 3)])
status = "local minimum" if det > 0 and fxx > 0 else "not minimum"
print(status)
```

这里的 `A if 条件 else B` 是 Python 三元表达式：条件成立取 `A`，否则取 `B`。

输出 `[4.0, 1.0]`、`[1.0, 6.0]`、`local minimum`。

## 6. 练习

```exercise
# @title: 练习：修正 Hessian 与分类
# @check: [4, 1]
# @check: [1, 6]
# @check: local minimum
# @hint: fxx 是 2x² 的二阶导；fyy 是 3y² 的二阶导；交叉项 xy 各求一次。注意初始代码的分类条件写反了：行列式为正且 fxx>0 应输出 local minimum。
def f(x, y):
    return 2 * x * x + 3 * y * y + x * y

x = 0.0
y = 0.0
h = 0.0001
fxx = 2
fxy = 1
fyy = 3
det = fxx * fyy - fxy * fxy
# A if 条件 else B 表示：条件成立取 A，否则取 B。
status = "saddle" if det > 0 else "local minimum"
print([fxx, fxy])
print([fxy, fyy])
print(status)
```

<details>
<summary>点开查看逐步解答</summary>

二阶偏导：

```python
fxx = 4
fxy = 1
fyy = 6
```

行列式：

```text
det=4*6-1*1=23
```

行列式为正且 $f_{xx}>0$，所以输出 `local minimum`。

完整判定还要同时反转初始代码中的分类条件：

```python
fxx = 4
fxy = 1
fyy = 6
det = fxx * fyy - fxy * fxy
status = "local minimum" if det > 0 and fxx > 0 else "not a local minimum"
print([fxx, fxy])
print([fxy, fyy])
print(status)
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 Hessian 是向量。它是二阶偏导排成的矩阵。

**误区二**：你以为临界点只有最大和最小。鞍点同样满足梯度为零。

**误区三**：你以为只看对角元就够。交叉项会影响特征方向和正定性。

:::

## 8. 快问快答

```quiz
临界点处 Hessian 两个特征值一正一负，它是什么？
- 局部最小
- 局部最大
- 鞍点 [*]
? 正特征方向上升，负特征方向下降，所以既有上坡路也有下坡路。
```

## 9. 选读：二阶 Taylor 的局部骨架

<details>
<summary>选读 · 临界点附近的主形状</summary>

在临界点附近：

$$f(\vec p+\vec h)\approx f(\vec p)+\tfrac12\vec h^TH\vec h.$$

一次项消失后，Hessian 的二次型决定主形状。换到特征基后，交叉项消失，只剩 $\tfrac12(\lambda_1s_1^2+\lambda_2s_2^2)$。

</details>

## 10. 下一站

一阶放大器和二阶形状都齐了。下一课把“分割—取样—求和”升级到二维面积，进入二重积分。

→ [二重积分与 Fubini 直觉](./50-double-integrals.md)
