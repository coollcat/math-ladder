---
title: 环与域
lesson_id: algebraic-structures/rings-fields
prereqs:
  - algebraic-structures/homomorphism-kernel
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
  - ring
  - field
  - zero-divisor
applications:
  - error-correcting-codes
  - cryptography
exits:
  - engineering
  - research
---

# 环与域

## 1. 开场钩子

钟表既能加也能乘：9 点过 5 小时是 2 点，而 $9\times5=45$ 落在 9 点。

一旦允许两种运算互相配合，新的问题出现：什么时候能安全做除法？

## 2. 直觉解释

环像一座有加减乘三种通道的工厂。加法部分必须是阿贝尔群，乘法要有结合律，分配律负责把两种运算接起来。

域更进一步：除 0 以外，每个元素都有乘法逆元。因此有理数集、实数集都是域；整数只是环，因为 $2$ 没有整数乘法逆元。

## 3. 正式定义

集合 $R$ 配有两种运算 $+$ 和 $\times$，称为**交换幺环**，当：

1. $\langle R,+\rangle$ 是阿贝尔群，加法单位元记作 $0$；
2. $\times$ 满足结合律，且有乘法单位元 $1$；
3. 乘法交换；
4. 分配律成立：

$$a(b+c)=ab+ac,\qquad(a+b)c=ac+bc.$$

若还满足每个 $a\ne0$ 都有 $a^{-1}$ 使 $aa^{-1}=1$，则称 $R$ 为**域**。

若非零元素 $a,b$ 相乘得到 0，则称它们为零因子。

## 4. 分步例题

看模 6 乘法：

1. 加法显然成群；
2. 乘法封闭、结合、交换，1 是单位元；
3. 分配律继承自普通整数；
4. 但 $2\times3=6\equiv0$；
5. 所以 $\mathbb Z_6$ 只是环；两个非零数相乘归零，不能当好除法系统。

## 5. 动手实验

```viz
{
  "type": "distributive",
  "a": 4,
  "b": 5,
  "c": 2
}
```

分配律是环的接线规则：一个数乘以和，等于分别乘再相加。拖动紫点时，两条路径面积始终一致。

```viz
{
  "type": "operation-table",
  "title": "Z6 的乘法表：找零因子",
  "elements": [0, 1, 2, 3, 4, 5],
  "operation": "(a*b) mod 6",
  "zero": 0,
  "highlight": ["identity", "inverses", "zero-products"],
  "selectedRow": 2,
  "selectedCol": 3
}
```

选中第 2 行和第 3 列，交点正是 0。打开“零因子”后，2 与 3 相遇的深红格说明：非零相乘也能落回加法单位元。

```python title="在模 6 中找零因子与单位"
n = 6
zero_divisors = []
units = []

for a in range(1, n):
    makes_zero = False
    makes_one = False
    for b in range(1, n):
        if (a * b) % n == 0:
            makes_zero = True
        if (a * b) % n == 1:
            makes_one = True
    if makes_zero:
        zero_divisors.append(a)
    if makes_one:
        units.append(a)

print("zero_divisors:", zero_divisors)
print("units:", units)
```

模 6 的单位只有 1 和 5；2、3、4 都是零因子。这个表直接显示为什么它不是域。

## 6. 练习

```exercise
# @title: 练习：判断模 8 的单位
# @check: zero_divisors=[2, 4, 6]
# @check: units=[1, 3, 5, 7]
# @hint: 对每个 a 尝试所有 b，看乘积是否可能为 0 或 1。
n = 8
zero_divisors = []
units = [0]

for a in range(1, n):
    makes_zero = False
    makes_one = False
    for b in range(1, n):
        if (a * b) % n == 0:
            makes_zero = True
    if makes_zero:
        zero_divisors.append(a)

print("zero_divisors=" + str(zero_divisors))
print("units=" + str(units))
```

<details>
<summary>点开查看逐步解答</summary>

完整检查可以这样写：

```python
n = 8
zero_divisors = []
units = []

for a in range(1, n):
    makes_zero = False
    makes_one = False
    for b in range(1, n):
        if (a * b) % n == 0:
            makes_zero = True
        if (a * b) % n == 1:
            makes_one = True
    if makes_zero:
        zero_divisors.append(a)
    if makes_one:
        units.append(a)

print(zero_divisors)
print(units)
```

于是：

| 类别 | 元素 | 原因 |
| --- | --- | --- |
| 零因子 | 2,4,6 | 分别可与 4、2、4 相乘得 0 |
| 单位 | 1,3,5,7 | 都与 8 互素 |

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为环一定没有除法。有些环里部分元素可逆；“域”才要求所有非零元素都可逆。

**误区二**：你以为非零相乘不可能为 0。模合数的系统里零因子很常见。

**误区三**：你以为减法和负数要单独定义。在加法群中，逆元自动给出减法。

:::

## 8. 快问快答

```quiz
域和一般交换环最关键的区别是什么？
- 域必须有加法
- 域的非零元素都有乘法逆元 [*]
- 域必须有无穷多个元素
? 有限域也存在；关键是除法安全性，而不是元素个数。
```

## 9. 选读：整环通向素数模

<details>
<summary>选读 · 没有零因子的好处</summary>

没有零因子的交换幺环叫整环。若 $p$ 是素数且 $p\mid ab$，则 $p\mid a$ 或 $p\mid b$；这正说明 $\mathbb Z_p$ 没有零因子。有限整环还会自动成为域，这是下一课的主角。

</details>

## 10. 下一站

把未知数也放进系数系统，就得到多项式环。下一课让 $x$ 参加加减乘。

→ [多项式环](./55-polynomial-ring.md)
