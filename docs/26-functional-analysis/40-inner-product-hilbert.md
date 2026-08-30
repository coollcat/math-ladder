---
title: 内积与 Hilbert 空间
lesson_id: functional-analysis/inner-product-hilbert
prereqs:
  - functional-analysis/banach-spaces
  - functional-analysis/lp-spaces
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - hilbert-space
applications:
  - least-squares
  - quantum-mechanics
exits:
  - research
---

# 内积与 Hilbert 空间

## 1. 开场钩子

判断两张脸的相似度、比较两条信号是否同相、计算最小二乘误差，都在做同一件事：问两个向量的方向有多一致。这件事的名字是内积。

## 2. 直觉解释

内积把长度和角度放进同一个公式。正数表示夹角小于直角，零表示垂直，负数表示反向。Hilbert 空间就是既有长度又有角度，而且完备到可以放心取极限的空间。

## 3. 正式定义

实向量空间上的**内积** $\langle u,v\rangle$ 是对称双线性函数，满足 $\langle v,v\rangle\ge0$ 且为零当且仅当 $v=0$。由它导出范数：

$$\lVert v\rVert=\sqrt{\langle v,v\rangle}.$$

完备内积空间称为 **Hilbert 空间**。对函数常用：

$$\langle f,g\rangle=\int_a^b f(x)g(x)\,dx.$$

## 4. 分步例题

取 $u=(2,3)$，$v=(4,1)$。

1. $\langle u,v\rangle=2\cdot4+3\cdot1=11$；
2. $\lVert u\rVert=\sqrt{13}$，$\lVert v\rVert=\sqrt{17}$；
3. 夹角余弦为 $\dfrac{11}{\sqrt{221}}$；
4. 结果为正，所以两个向量成锐角；
5. 若改 $v=(-3,2)$，则内积为 $0$，二者正交。

## 5. 动手实验

### 实验 1：点积读出角度

```viz
{
  "type": "dotprod",
  "title": "内积的正、零、负",
  "u": [2, 3],
  "v": [4, 1]
}
```

拖动两支箭头。读数为零时橙色投影缩成一点，这就是正交。

### 实验 2：用积分定义函数内积

```python title="离散近似函数内积"
# xs 均匀采样；h 是矩形法的宽度
xs = [0.0, 0.25, 0.5, 0.75]
h = 0.25
f = [x * x for x in xs]
g = [x for x in xs]
terms = [f[i] * g[i] for i in range(len(xs))]
inner = h * (terms[0] + terms[1] + terms[2] + terms[3])
print("inner≈", inner)
```

这是连续积分 $\int_0^1 x^3 dx$ 的左端点近似；增加采样点会逼近 $0.25$。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为每个 Banach 空间的范数都来自内积。平行四边形恒等式不成立时就没有这样的内积。

**误区二**：你以为正交就是不相交。两条曲线可以在原点相交但切方向不正交。

**误区三**：你以为 Cauchy-Schwarz 只是不等式技巧。它同时限制长度与夹角，是对偶估计和投影误差的基础。

:::

## 7. 练习

```exercise
# @title: 练习：找出正交向量
# @check: inner=0.0
# @hint: 对 (a,b) 与 (b,-a)，内积为 ab+b*(-a)。
a = 3.0
b = 4.0
u = [a, b]
v = [b, a]
inner = u[0] * v[0] + u[1] * v[1]
print("inner=" + str(inner))
```

<details>
<summary>点开查看逐步解答</summary>

要把 $(3,4)$ 变成法向或垂直方向，可交换分量并改变一个符号，得到 $(4,-3)$。于是内积 $12-12=0$。

```python
a = 3.0
b = 4.0
u = [a, b]
v = [b, -a]
inner = u[0] * v[0] + u[1] * v[1]
print("inner=" + str(inner))
```
</details>

## 8. 快问快答

```quiz
Hilbert 空间比 Banach 空间额外拥有哪样结构？
- 平移群
- 内积带来的角度 [*]
- 必须只有有限个元素
? Hilbert 空间首先要求范数来自内积，然后还要求完备。
```

## 9. 选读证明

<details>
<summary>选读 · Cauchy-Schwarz 的几何版</summary>

对任意实数 $t$，$0\le\lVert u-tv\rVert^2=\lVert u\rVert^2-2t\langle u,v\rangle+t^2\lVert v\rVert^2$。取 $t=\langle u,v\rangle/\lVert v\rVert^2$，得到 $\langle u,v\rangle^2\le\lVert u\rVert^2\lVert v\rVert^2$。等号成立时 $u$ 恰好落在 $v$ 的方向线上。
</details>

## 10. 下一站

有了角度，就能问“最佳近似”。下一课把投影定理推广到无穷维正交基。

→ [正交基与投影](./45-orthogonal-bases-projection.md)



