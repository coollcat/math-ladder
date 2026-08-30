---
title: 多项式环
lesson_id: algebraic-structures/polynomial-ring
prereqs:
  - algebraic-structures/rings-fields
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - polynomial-ring
applications:
  - symbolic-computation
  - coding-theory
exits:
  - engineering
  - research
---

# 多项式环

## 1. 开场钩子

$x^2-3x+2$ 不是单个数，而是一台代入机器：给 $x$ 一个值，它吐出一个值。

更惊人的是，多项式之间可以像整数一样相加、相减、相乘。它们组成一个新的环。

## 2. 直觉解释

把多项式写成系数表，从低次到高次排列：

$$2+x-5x^3 \quad\leftrightarrow\quad [2,1,0,-5].$$

加法就是把同次数的系数相加；乘法则要把每一对系数相乘，再按次数归位。变量 $x$ 只负责搬运次数。

## 3. 正式定义

设 $R$ 是交换幺环。多项式环 $R[x]$ 由形如

$$a_0+a_1x+\cdots+a_nx^n,\qquad a_i\in R$$

的对象组成。两个多项式相等当且仅当同次系数都相等。

加法按系数相加；乘法由卷积定义：

$$\left(\sum_i a_ix^i\right)\left(\sum_j b_jx^j\right)=\sum_k\left(\sum_{i+j=k}a_ib_j\right)x^k.$$

## 4. 分步例题

计算 $(x+1)(x+2)$：

1. $x\cdot x=x^2$；
2. $x\cdot2=2x$；
3. $1\cdot x=x$；
4. 同类项合并：$2x+x=3x$；
5. 所以结果是 $x^2+3x+2$，系数表为 $[2,3,1]$。

## 5. 动手实验

```viz
{
  "type": "factoring",
  "p": 2,
  "q": 3,
  "b": 5,
  "c": 6
}
```

这里展示最简单的一次多项式相乘：$(x+p)(x+q)$。拖动滑块时，一次项系数来自 $p+q$，常数项来自 $pq$。

```python title="用系数表做多项式乘法"
a = [1, 1]
b = [2, 1]
product = [0] * (len(a) + len(b) - 1)

for i in range(len(a)):
    for j in range(len(b)):
        product[i + j] = product[i + j] + a[i] * b[j]

print(product)
```

列表第 0 位是常数项，第 1 位是一次项，第 2 位是二次项。输出 `[2, 3, 1]` 正是 $2+3x+x^2$。

## 6. 练习

```exercise
# @title: 练习：修复三次以下多项式乘法
# @check: product=[2, 3, 1]
# @check: degree=2
# @hint: i 次项乘 j 次项应放到 i+j 位；最高非零位置就是次数。
a = [2, 1]
b = [1, 1]
product = [0] * (len(a) + len(b) - 1)

for i in range(len(a)):
    product[i] = product[i] + a[i] * b[i]

degree = 0
for k in range(len(product)):
    if product[k] != 0:
        degree = k

print("product=" + str(product))
print("degree=" + str(degree))
```

<details>
<summary>点开查看逐步解答</summary>

内层循环要枚举每一对系数：

```python
a = [2, 1]
b = [1, 1]
product = [0] * (len(a) + len(b) - 1)

for i in range(len(a)):
    for j in range(len(b)):
        product[i + j] = product[i + j] + a[i] * b[j]

degree = 0
for k in range(len(product)):
    if product[k] != 0:
        degree = k

print(product)
print(degree)
```

于是 $(2+x)(1+x)=2+3x+x^2$，系数表为 `[2,3,1]`，最高非零位为 2。

</details>

## 7. 常见误区

**误区一**：你以为多项式乘法只是对应系数相乘。那是逐点乘法，不是多项式环的标准乘法。

**误区二**：你以为 $x$ 必须是一个具体数。作为形式对象，它可以不先取值；等号靠系数相等判定。

**误区三**：你以为系数可以随便来自不同集合。同一个 $x$ 配不同系数环，会得到不同多项式环。

## 8. 快问快答

```quiz
多项式环中，两个多项式相等的主要标准是什么？
- 代入某个 x 后结果相同
- 所有同次系数分别相等 [*]
- 图像看起来一样
? 形式多项式按系数判等；单点代入相同远远不够。
```

## 9. 选读：带余除法

<details>
<summary>选读 · 和整数除法的相似处</summary>

若系数来自域，给定非零除式 $g(x)$，任何 $f(x)$ 都可写成

$$f(x)=q(x)g(x)+r(x),\qquad \deg r<\deg g.$$

这和整数 $a=bq+r$ 的结构平行，也为编码理论中的循环码铺路。

</details>

## 10. 下一站

如果系数本身只能取 0 到 $p-1$，多项式会进入有限世界。下一课先看模运算里的环和域。

→ [模运算中的环和域](./60-modular-rings-fields.md)
