---
title: Jacobian 与多元链式法则
lesson_id: multivariable/jacobian-chain
prereqs:
  - multivariable/partial-gradient
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
  - jacobian
  - multivariable-chain-rule
applications:
  - coordinate-transforms
  - neural-networks
exits:
  - data-ai
  - engineering
---

# Jacobian 与多元链式法则

## 1. 从一个场景开始

一元函数的导数是一个数：输入动一点，输出放大多少倍。若两个输入变成两个输出，放大率有四个方向需要记录。把它们排成矩阵，就是 Jacobian。

## 2. 直觉解释

设映射

$$F(u,v)=\binom{f(u,v)}{g(u,v)}.$$

在一点附近，弯曲映射很像一个线性映射。它的四条放大率是：

$$J=\begin{pmatrix}\frac{\partial f}{\partial u} & \frac{\partial f}{\partial v}\\\frac{\partial g}{\partial u} & \frac{\partial g}{\partial v}\end{pmatrix}.$$

行列式 $\det J$ 告诉面积被放大多少倍；绝对值才面积，负号表示翻面。

## 3. 正式定义

若 $F:\mathbb R^2\to\mathbb R^2$ 可微，则 Jacobian 矩阵是：

$$J_F=\begin{pmatrix}\partial f/\partial u & \partial f/\partial v\\\partial g/\partial u & \partial g/\partial v\end{pmatrix}.$$

多元链式法则：若 $G$ 后接 $F$，则

$$J_{F\circ G}(t)=J_F(G(t))\,J_G(t).$$

顺序不能交换；矩阵乘法本身也不交换。

## 4. 分步例题

取

$$F(u,v)=\binom{u^2-v}{2uv}.$$

1. $f=u^2-v$，所以 $f_u=2u$，$f_v=-1$；
2. $g=2uv$，所以 $g_u=2v$，$g_v=2u$；
3. 在 $(1,2)$：

$$J=\begin{pmatrix}2&-1\\4&2\end{pmatrix}.$$

4. 行列式 $=2\cdot2-(-1)\cdot4=8$；
5. 一小块面积在这一点附近约被放大 8 倍。

### 链式法则走一遍

仍用这个 $F$，再让输入绕单位圆运动：

$$G(t)=\binom{\cos t}{\sin t}.$$

在 $t=0$ 时，$G(0)=(1,0)$。两个矩阵分别是：

$$J_G(0)=\binom{0}{1},\qquad J_F(1,0)=\begin{pmatrix}2&-1\\0&2\end{pmatrix}.$$

相乘得输出速度：

$$J_F(G(0))J_G(0)=\binom{-1}{2}.$$

直接代入也能核对：$F(G(t))=(\cos^2t-\sin t,\ 2\sin t\cos t)$，它在 $t=0$ 的导数同样是 $(-1,2)$。矩阵乘法替我们同时追踪了两条输出的变化。

## 5. 动手实验

### 实验 1：网格变形机

```viz
{
  "type": "jacobian-grid",
  "title": "弯曲映射的局部放大器",
  "fx": "u^2 - v",
  "fy": "2*u*v",
  "point": [1, 2]
}
```

上图是源 $uv$ 平面，下图是输出平面上的像；拖动上图白点，读数显示该点的 Jacobian 和面积放大率。

### 实验 2：先看线性近似

```viz
{
  "type": "linear-map",
  "title": "Jacobian 就是局部线性映射",
  "matrix": [2, -1, 4, 2]
}
```

这个矩阵正是上例在 $(1,2)$ 的 Jacobian。它描述一阶近似：邻域足够小时，线性预测才是可靠的局部骨架；本组件不承诺整幅弯曲网格与线性映射重合。

### 实验 3：Python 数值 Jacobian

```python title="四个偏导排成矩阵"
def fx(u, v):
    return u * u - v

def fy(u, v):
    return 2 * u * v

h = 0.0001
u = 1.0
v = 2.0
jxx = (fx(u + h, v) - fx(u - h, v)) / (2 * h)
jxy = (fx(u, v + h) - fx(u, v - h)) / (2 * h)
jyx = (fy(u + h, v) - fy(u - h, v)) / (2 * h)
jyy = (fy(u, v + h) - fy(u, v - h)) / (2 * h)
print([round(jxx, 3), round(jxy, 3)])
print([round(jyx, 3), round(jyy, 3)])
det = jxx * jyy - jxy * jyx
print(round(det, 3))
print(round(abs(det), 3))
```

输出 `[2.0, -1.0]`、`[4.0, 2.0]`、`8.0`、`8.0`。

## 6. 练习

```exercise
# @title: 练习：修正 Jacobian 与面积放大率
# @check: [2, -1]
# @check: [4, 2]
# @check: 8
# @check: 8
# @hint: g=2uv 对 u 的偏导是 2v，不是 2；行列式用 ad-bc。
u = 1
v = 2
jxx = 2 * u
jxy = -1
jyx = 2
jyy = 2 * u
det = jxx * jyy + jxy * jyx
area = det
print([jxx, jxy])
print([jyx, jyy])
print(det)
print(area)
```

<details>
<summary>点开查看逐步解答</summary>

$g_u=2v$，所以 $jyx=4$。行列式：

```python
jxx = 2
jxy = -1
jyx = 4
jyy = 2
det = jxx * jyy - jxy * jyx
```

代入：

```text
det=2*2-(-1)*4=8
area=abs(8)=8
```

负号只表示翻面；面积放大率取绝对值。

可执行复查：

```python
u = 1
v = 2
jxx = 2 * u
jxy = -1
jyx = 2 * v
jyy = 2 * u
det = jxx * jyy - jxy * jyx
area = abs(det)
print([jxx, jxy])
print([jyx, jyy])
print(det)
print(area)
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 Jacobian 是一个数。二维到二维映射的 Jacobian 是矩阵；行列式只是它的一个摘要。

**误区二**：你以为面积放大率就是 $\det J$。方向翻转时行列式为负，面积要用绝对值。

**误区三**：你以为多元链式法则把导数相乘。它是“矩阵乘矩阵”，顺序和形状都必须对齐。

:::

## 8. 快问快答

```quiz
Jacobian 矩阵的第 (1,2) 项表示什么？
- 第 1 个输出对第 2 个输入的偏导 [*]
- 第 2 个输出对第 1 个输入的偏导
- 第 1 个输入的平方
? 行是输出分量，列是输入分量；所以 (1,2) 是 f1 对 x2 的敏感度。
```

## 9. 选读：为什么局部像线性映射

<details>
<summary>选读 · 一阶展开</summary>

若 $F$ 在点 $\vec p$ 可微，则

$$F(\vec p+\vec h)\approx F(\vec p)+J_F(\vec p)\vec h.$$

常数项 $F(\vec p)$ 只负责平移；小扰动 $\vec h$ 的形状由 $J_F(\vec p)$ 决定。因此弯曲映射在显微镜下露出线性骨架。

</details>

## 10. 下一站

Jacobian 是一阶放大器；Hessian 继续追问二阶弯曲。下一课用它判断临界点是碗底、山顶，还是马鞍。

→ [Hessian 与局部形状](./40-hessian-shape.md)
