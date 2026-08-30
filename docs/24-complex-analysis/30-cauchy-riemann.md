---
title: Cauchy-Riemann 方程
lesson_id: complex-analysis/cauchy-riemann
prereqs:
  - complex-analysis/limits-analytic
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cauchy-riemann-equations
applications:
  - potential-flow
  - harmonic-temperature
exits:
  - engineering
  - research
---

# Cauchy-Riemann 方程

## 1. 开场钩子

一张理想热传导图的温度线与热流线总是互相垂直，而且疏密配合得天衣无缝。这不是巧合，而是解析函数的指纹。Cauchy-Riemann 方程把“所有复方向可导”压缩成两个偏导数等式。

## 2. 直觉解释

把 $f(z)=u(x,y)+iv(x,y)$ 的微小变化写成 Jacobian：

$$\begin{pmatrix}u_x&u_y\\ v_x&v_y\end{pmatrix}.$$

要让这个小变换只是旋转加均匀伸缩，矩阵必须具有

$$\begin{pmatrix}a&-b\\ b&a\end{pmatrix}$$

的形状。对照系数立刻得到 $u_x=v_y$ 和 $u_y=-v_x$。这两条就是 Cauchy-Riemann 方程。

## 3. 正式定义

充分条件版：设 $u,v$ 在开集上有连续偏导数。若在该开集每点都有

$$u_x=v_y,\qquad u_y=-v_x,$$

则 $f=u+iv$ 解析。必要性更强：只要 $f$ 解析，两条方程必然成立；Goursat 理论还会进一步说明 $f'$ 也连续。

在足够光滑的前提下，满足这两条方程的实部 $u$ 与虚部 $v$ 才构成一对共轭调和函数；它们的等值线在非临界点互相垂直。

## 4. 分步例题

检验 $f(z)=z^2=x^2-y^2+2xyi$。

1. $u=x^2-y^2$，所以 $u_x=2x$，$u_y=-2y$；
2. $v=2xy$，所以 $v_x=2y$，$v_y=2x$；
3. 比较：$u_x=v_y=2x$，$u_y=-v_x=-2y$；
4. 全平面成立，因此 $z^2$ 处处解析；
5. 复导数可用 $f'=u_x+iv_x=2x+2yi=2z$ 验算。

再看 $f(z)=\bar z=x-iy$：$u_x=1$，$v_y=-1$。第一眼就不相等，所以它不解析。

## 5. 动手实验

### 实验 1（viz）：Jacobian 网格暴露保角性

```viz
{
  "type": "jacobian-grid",
  "title": "解析映射 z^2 的局部形状",
  "fx": "u^2 - v^2",
  "fy": "2*u*v",
  "point": [1, 0.5]
}
```

拖动白点。读出的 Jacobian 总是接近 $\begin{pmatrix}2x&-2y\\ 2y&2x\end{pmatrix}$，也就是旋转伸缩矩阵。

### 实验 2（viz）：非解析映射会剪切

```viz
{
  "type": "jacobian-grid",
  "title": "共轭映射把网格镜像翻转",
  "fx": "u",
  "fy": "-v",
  "point": [1, 1]
}
```

这张网的局部形状出现镜像反射。反射不能由连续旋转产生，对应 Cauchy-Riemann 第一条方程直接失败。

> 这里把 $u_x$ 读作“$u$ 对横坐标的变化率”，暂不要求掌握偏导数的完整形式理论。

### 实验 3（python）：数值检查 CR 残差

```python title="用小步长近似 z^2 的 Cauchy-Riemann 残差"
h = 0.0001
x = 0.8
y = -1.2

def u(a, b):
    return a * a - b * b

def v(a, b):
    return 2 * a * b

ux = (u(x + h, y) - u(x - h, y)) / (2 * h)
uy = (u(x, y + h) - u(x, y - h)) / (2 * h)
vx = (v(x + h, y) - v(x - h, y)) / (2 * h)
vy = (v(x, y + h) - v(x, y - h)) / (2 * h)
r1 = ux - vy
r2 = uy + vx
print(round(r1, 6))
print(round(r2, 6))
print(round(2 * x, 6))
```

两个残差都是 0，说明 CR 方程通过；最后一行的 $2x$ 只是导数实部的抽查。

```quiz
函数 f(z)=conjugate(z) 在原点为什么不解析？
- 因为它的模长不连续
- 因为沿实方向和虚方向的差商不相等 [*]
- 因为它没有图像
? 沿实方向差商是 1，沿纯虚方向是 -1。复导数要求所有方向给出同一个极限。
```

:::warning[常见误区]

**误区一**：你以为 CR 方程只在个别点成立就行。解析性需要在开区域内处处成立，还要有足够的连续性。

**误区二**：你以为 $u,v$ 各自调和就一定凑成解析函数。它们还必须互为共轭调和函数，边界与常数也要匹配；反过来，也不能只凭一阶 CR 方程就跳过光滑性去宣称调和性。

**误区三**：你以为 CR 只是无用的验算技巧。它是流体势、静电势和谐波函数之间的桥梁。

:::

## 6. 练习

```exercise
# @title: 练习：修复 f(z)=z^3 的实虚部分解
# @check: -46.0
# @check: 9.0
# @hint: z=x+iy 时 z^3=(x^3-3xy^2)+(3x^2*y-y^3)i。代入 x=2,y=3 后检查符号。
x = 2.0
y = 3.0
u = x ** 3 + 3 * x * y ** 2
v = 3 * x ** 2 * y - y ** 3
print(u)
print(v)
```

<details>
<summary>点开查看逐步解答</summary>

先用复数直接验证：$(2+3i)^2=-5+12i$，再乘 $2+3i$ 得到 $-46+9i$。

公式应为

$$z^3=(x^3-3xy^2)+(3x^2y-y^3)i.$$

所以 $u=8-54=-46$，$v=36-27=9$。对 $u,v$ 求 CR 导数还能还原 $3z^2$。
</details>

## 7. 选读：CR 方程的快速推导

<details>
<summary>选读 · 让横竖两个差商握手</summary>

沿实方向取 $h=t$：

$$f'=\lim_{t\to0}\frac{u(x+t,y)-u(x,y)}{t}+i\frac{v(x+t,y)-v(x,y)}{t}=u_x+iv_x.$$

沿纯虚方向取 $h=it$：

$$f'=\lim_{t\to0}\frac{u(x,y+t)-u(x,y)}{it}+i\frac{v(x,y+t)-v(x,y)}{it}=v_y-iu_y.$$

令实部与虚部分别相等，得到 $u_x=v_y$、$v_x=-u_y$。若导数连续，这两个方向的极限足以排除所有斜方向矛盾。
</details>

## 8. 下一站

保角性已经就位，还缺一台具体的搬运机。下一课请出 Möbius 变换：一条分数式把直线整条弯成圆，把上半平面卷进单位圆盘。

→ [Möbius 变换：把圆还给你](./35-conformal-mobius.md)
