---
title: 伴随算子
lesson_id: functional-analysis/adjoint-operators
prereqs:
  - functional-analysis/dual-spaces
  - functional-analysis/inner-product-hilbert
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - adjoint-operator
applications:
  - normal-equations
  - inverse-problems
exits:
  - engineering
  - research
---

# 伴随算子

## 1. 开场钩子

最小二乘公式里总有一个 $A^\mathsf T$；量子力学里测量算子也要先取厄米共轭。这个反复出现的“转置”就是 Hilbert 空间中的伴随。

## 2. 直觉解释

算子 $A$ 把输入空间搬到输出空间；伴随 $A^*$ 把输出侧的测量搬回输入侧。它保证两种记账方式相等：

$$\langle Ax,y\rangle=\langle x,A^*y\rangle.$$

左边先搬运再测量，右边先把测量器送回入口。

## 3. 正式定义

设 $H_1,H_2$ 是 Hilbert 空间，$A:H_1\to H_2$ 是有界线性算子。满足上式的唯一有界算子 $A^*:H_2\to H_1$ 称为**伴随算子**。矩阵情形中实内积下：

$$A=\begin{pmatrix}a&b\\c&d\end{pmatrix},\qquad A^*=A^\mathsf T=\begin{pmatrix}a&c\\b&d\end{pmatrix}.$$

复空间还要对分量取共轭，即共轭转置。

## 4. 分步例题

取 $A=\begin{pmatrix}2&1\\-1&2\end{pmatrix}$，$x=(1,2)$，$y=(3,-1)$。

1. $Ax=(4,3)$；
2. $\langle Ax,y\rangle=12-3=9$；
3. $A^*=\begin{pmatrix}2&-1\\1&2\end{pmatrix}$；
4. $A^*y=(7,1)$；
5. $\langle x,A^*y\rangle=7+2=9$，两本账一致。

## 5. 动手实验

### 实验 1：对照正向搬运和回送测量

```viz
{
  "type": "linear-map",
  "title": "正向算子 A",
  "matrix": [2, 1, -1, 2]
}
```

```viz
{
  "type": "linear-map",
  "title": "伴随算子 A 转置",
  "matrix": [2, -1, 1, 2]
}
```

分别拖动相同坐标，观察两个像不同；但把它们分别代入上面的内积账本时结果一致。

### 实验 2：数值核对伴随恒等式

```python title="两种顺序得到同一个数"
A = [[2.0, 1.0], [-1.0, 2.0]]
At = [[2.0, -1.0], [1.0, 2.0]]
x = [1.0, 2.0]
y = [3.0, -1.0]
Ax = [A[0][0] * x[0] + A[0][1] * x[1],
      A[1][0] * x[0] + A[1][1] * x[1]]
left = Ax[0] * y[0] + Ax[1] * y[1]
Aty = [At[0][0] * y[0] + At[0][1] * y[1],
       At[1][0] * y[0] + At[1][1] * y[1]]
right = x[0] * Aty[0] - x[1] * Aty[1]
print(left)
print(right)
```

第二处应使用加号而不是减号；修好后两行都输出 9。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为伴随只是机械交换行列。它由内积关系定义；基变化后矩阵表也会跟着变。

**误区二**：你以为任何线性算子都有全局伴随。无界算子需要讨论定义域，不能省略。

**误区三**：你以为自伴等于对称矩阵。有限维实空间中二者一致，无穷维还要求定义域恰当且稠密。

:::

## 7. 练习

```exercise
# @title: 练习：求转置并验证内积
# @check: left=13.0
# @check: right=13.0
# @hint: A 的第一行变成 A^T 的第一列。
A = [[2.0, 1.0], [0.0, 1.0]]
At = [[2.0, 0.0], [1.0, 1.0]]
x = [1.0, 3.0]
y = [2.0, 1.0]
Ax = [A[0][0] * x[0] + A[0][1] * x[1],
      A[1][0] * x[0] + A[1][1] * x[1]]
left = Ax[0] * y[0] + Ax[1] * y[1]
Aty = [y[0], y[1]]
right = x[0] * Aty[0] + x[1] * Aty[1]
print("left=" + str(left))
print("right=" + str(right))
```

<details>
<summary>点开查看逐步解答</summary>

$A^*$ 已经是转置。$Ax=(5,3)$，$\langle Ax,y\rangle=10+3=13$；同时 $A^*y=(4,3)$，$\langle x,A^*y\rangle=4+9=13$。初始代码直接把 $y$ 当成 $A^*y$ 使用，第二行得到 1；应先做转置再算内积。

```python
A = [[2.0, 1.0], [0.0, 1.0]]
At = [[2.0, 0.0], [1.0, 1.0]]
x = [1.0, 3.0]
y = [2.0, 1.0]
Ax = [A[0][0] * x[0] + A[0][1] * x[1], A[1][0] * x[0] + A[1][1] * x[1]]
Aty = [At[0][0] * y[0] + At[0][1] * y[1], At[1][0] * y[0] + At[1][1] * y[1]]
left = Ax[0] * y[0] + Ax[1] * y[1]
right = x[0] * Aty[0] + x[1] * Aty[1]
print("left=" + str(left))
print("right=" + str(right))
```
</details>

## 8. 快问快答

```quiz
伴随算子的定义核心是哪一个等式？
- Ax=A^*x
- 内积 Ax,y 等于内积 x,A^*y [*]
- 行列式不变
? 伴随不是要求算子本身相同，而是要求两种内外顺序的测量结果相同。
```

## 9. 选读证明

<details>
<summary>选读 · 存在性的构造直觉</summary>

固定 $y$，映射 $x\mapsto\langle Ax,y\rangle$ 是有界线性泛函。Hilbert 空间的 Riesz 表示定理给出唯一向量 $z$ 使 $\langle Ax,y\rangle=\langle x,z\rangle$。令 $A^*y=z$；线性和有界性由表示过程继承，唯一性由内积非退化保证。
</details>

## 10. 下一站

伴随让矩阵的代数结构变完整。下一课推广特征值：谱不只包含真正的特征方向，还包括阻碍求逆的所有频率。

→ [谱与特征值](./70-spectrum-eigenvalues.md)



