---
title: Lax-Milgram 选读
lesson_id: functional-analysis/lax-milgram
prereqs:
  - functional-analysis/orthogonal-bases-projection
  - functional-analysis/inner-product-hilbert
  - functional-analysis/dual-spaces
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - lax-milgram
applications:
  - elliptic-pde
  - finite-elements
exits:
  - engineering
  - research
---

# Lax-Milgram 选读

## 1. 开场钩子

受热的杆、绷紧的膜、变形的桥梁都要解椭圆方程。经典导数可能不存在，但能量可以最小化。Lax-Milgram 回答：这样的弱解何时存在且唯一？

## 2. 直觉解释

把物理系统写成能量二次型 $\frac12a(u,u)-\ell(u)$。双线性型 $a$ 像“刚度”：连续表示小位移不会产生无限大力，强制表示任何非零形变至少储存正能量。能量碗有一个最低点。

## 3. 正式定义

设 $H$ 是 Hilbert 空间。双线性型 $a:H\times H\to\mathbb R$ 连续，即：

$$|a(u,v)|\le M\lVert u\rVert\lVert v\rVert,$$

且强制：

$$a(v,v)\ge\alpha\lVert v\rVert^2,\qquad \alpha>0.$$

若 $\ell\in H^*$，则存在唯一 $u\in H$ 使所有 $v$ 满足：

$$a(u,v)=\ell(v).$$

## 4. 分步例题

取 $H=\mathbb R^2$，$a(u,v)=u^\mathsf T A v$，$A=\begin{pmatrix}2&0\\0&5\end{pmatrix}$，$\ell(v)=(1,-3)\cdot v$。

1. $a$ 由对称正定矩阵产生；
2. 最大特征值给 $M=5$；
3. 最小特征值给 $\alpha=2$；
4. 方程组为 $2u_1=1$，$5u_2=-3$；
5. 唯一解是 $(0.5,-0.6)$。

## 5. 动手实验

### 实验 1：投影就是找能量最低点

```viz
{
  "type": "plot",
  "title": "能量碗 E(x)=0.5*k*x^2-f*x",
  "expr": "(k*x*x)/2 - f*x",
  "xmin": -1,
  "xmax": 3,
  "sliders": [
    { "name": "k", "min": 0.5, "max": 6, "step": 0.5, "value": 3 },
    { "name": "f", "min": -9, "max": 9, "step": 1, "value": 6 }
  ]
}
```

横轴是试探位移，纵轴是总能量。最低点横坐标满足 kx=f；把 k 拖大时碗变窄，平衡位移变小，这正是强制系数控制稳定性的直觉。

### 实验 2：从刚度矩阵求平衡点

```python title="对角刚度的弱解"
A = [2.0, 5.0]
b = [1.0, -3.0]
u = [b[0] / A[0], b[1] / A[1]]
energy = 0.5 * (A[0]*u[0]*u[0] + A[1]*u[1]*u[1]) - (b[0]*u[0] + b[1]*u[1])
print(u)
print("energy=", energy)
```

改变 `A` 的某个数变大，对应方向更硬，位移会更小。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为强制系数可以为零。系数为零时能量碗可能变成平底槽，解不再唯一或不稳定。

**误区二**：你以为弱解自动处处光滑。先得到能量意义下的解，光滑性还要看数据和区域。

**误区三**：你以为对称是必要条件。经典 Lax-Milgram 不要求 $a$ 对称；对称只是让解等价于最小化能量。

:::

## 7. 练习

```exercise
# @title: 练习：解一维刚度方程
# @check: u=2.0
# @hint: 刚度乘位移等于外力，所以 u=f/k。
k = 3.0
f = 6.0
u = k / f
print("u=" + str(u))
```

<details>
<summary>点开查看逐步解答</summary>

方程 $ku=f$ 给出 $u=6/3=2$。初始代码把除法方向写反，得到 0.5。

```python
k = 3.0
f = 6.0
u = f / k
print("u=" + str(u))
```
</details>

## 8. 快问快答

```quiz
Lax-Milgram 中 coercive 条件防止什么？
- 泛函取复数
- 能量方向退化导致无唯一解 [*]
- 空间必须有有限基
? a(v,v) 至少 alpha*||v||^2 保证不同非零形变的能量不可能同时压到零。
```

## 9. 选读证明

<details>
<summary>选读 · 定理骨架</summary>

$a$ 使映射 $A:H\to H^*$ 定义为 $Au(v)=a(u,v)$。用 Riesz 同构把 $A$ 换成 $H$ 上的算子 $T$。强制性给出 $\lVert Tu\rVert\ge\alpha\lVert u\rVert$，所以 $T$ 单射且值域闭。若有非零 $y$ 垂直于值域，则 $\langle Ty,y\rangle=a(y,y)=0$，与强制矛盾；因此值域是全空间。Riesz 表示把 $\ell$ 变成右端项后得到唯一解，且解连续依赖数据。
</details>

## 10. 下一站

泛函分析还能重新解释“导数”本身。下一课把不可微函数也纳入求导语言。

→ [分布初步](./90-distributions-intro.md)



