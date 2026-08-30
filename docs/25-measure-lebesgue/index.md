---
title: 第 25 章 · 测度论与 Lebesgue 入门
description: 重新定义长度、面积与概率，使更奇怪的集合和函数也能积分。
volume: 2
layer: L8
track:
  - analysis-change
  - probability-statistics
stage: research-elective
difficulty: 5
---

# 测度论与 Lebesgue 入门

Riemann 积分切开横轴，Lebesgue 积分先测量纵轴上的水平层。这个视角让概率论获得严格地基，也解释了哪些函数可积、哪些极限可以交换。

本章你会学到：

1. [从长度到测度](./10-from-length-to-measure.md)——一根线段的长度你量了十几年：区间 $[a,b]$ 的长度是 $b-a$。可一个点、一万万个点的“总长度”又是多少？；
2. [康托集与外测度](./20-cantor-outer-measure.md)——拿一根 $[0,1]$ 长的铁丝，从正中间剪掉开区间 $(\tfrac13,\tfrac23)$，再把每段的中三分之一无穷剪下去：最后剩下的铁丝有多长？；
3. [可测函数](./30-measurable-functions.md)——上一章的 [Riemann 积分的严格定义](../19-real-analysis/50-riemann-upper-lower.md)见识过数学史上著名的恶棍：Dirichlet 函数——有理数处取 1、无理数处取 0，Riemann 当场拒收；换个问法它却可能变乖；
4. [勒贝格积分思想](./40-lebesgue-integral.md)——数一罐硬币有两种方式；
5. [收敛定理](./50-convergence-theorems.md)——严格分析里还有一张老通行证叫一致收敛：它要求函数列全员齐步走；
6. [乘积测度与 Fubini：交换积分次序的资格](./55-product-fubini.md)——有限表格按行加、按列加当然一样；无穷世界里这份“显然”要重新考试；
7. [概率论的测度论视角](./60-probability-as-measure.md)——掷一次硬币，正面概率 $\tfrac12$——小学就会。

## 生产状态

七门正式课已完成：长度公理、外测度与康托集、可测函数、勒贝格积分、收敛定理、乘积测度与 Fubini，以及概率测度视角。每门课都有 viz 组件或浮窗实验，并配判题练习。

## 实战挑战 · 异常读数不该凭空变成质量

一段管道被传感器分成两类记录。连续污渍的密度是常数：基底污渍铺满 $[0,4]$，密度 $0.1$；密集碎片额外集中在 $[1,3]$，额外密度 $0.6$。另有两次异常点读数，高度分别是 $100$ 和 $80$，但它们只发生在两个单点位置。

**(1)** 按“密度 × 长度”算出连续污渍的总质量。  
**(2)** 把总质量归一化成概率后，求“位置落在 $[1,3]$”的概率。  
**(3)** 说明两个单点异常读数对质量和概率的贡献。

```exercise
# @title: 实战挑战：碎片质量、异常点与概率
# @check: 1.6
# @check: 0.875
# @check: 0
# @hint: 单点没有长度。异常读数再高，乘上的宽度也只能是 0；事件概率只看连续污渍的质量。
base_density = 0.1          # 基底污渍密度
extra_density = 0.6         # 密集碎片的额外密度

continuous_mass = base_density * 4 + extra_density * 2   # 两块区间的密度乘长度

event_mass = base_density * 2 + extra_density * 2        # [1,3] 内两块污渍的质量
probability = event_mass / continuous_mass               # 用质量占比定义概率

point_width = 1              # ← 问题在这：单点不是宽 1 的区间
point_readings = [100, 80]   # 两次异常点的高度
point_mass = sum(point_readings) * point_width   # sum：把列表里的数相加

print(round(continuous_mass, 4))
print(round(probability, 4))
print(round(point_mass, 4))
```

修好后输出 `1.6`、`0.875` 和 `0`。连续部分贡献全部质量；单点读数可以提醒我们检查传感器，却在勒贝格测度里分不到长度，所以也不改变归一化后的概率。

## 实战挑战 · 测度的可加性

勒贝格测度的核心性质之一：**不相交集合的测度等于测度之和**。两个不相交区间 $[0,1]$ 与 $[2,3]$ 的并集，测度是 $1+1=2$。下面这题把"可加"写成了"相乘"，修到输出 `2`：

```exercise
# @title: 实战挑战：测度的可加性
# @check: 2
# @hint: 不交并的测度是"加"，不是"乘"；λ([0,1]∪[2,3]) = λ([0,1]) + λ([2,3])。
def length(a, b):      # 区间的勒贝格测度就是长度
    return b - a

total = length(0, 1) * length(2, 3)    # ← 问题在这：可加性应把两个测度相加
print(total)
```

<details>
<summary>点开查看逐步解答</summary>

勒贝格测度满足**可数可加性**，不相交集合取并，测度相加：

```python
total = length(0, 1) + length(2, 3)   # 1 + 1
print(total)                          # 2
```

改完：$\lambda([0,1]\cup[2,3]) = \lambda([0,1]) + \lambda([2,3]) = 1 + 1 = 2$。初始代码相乘得 $1$，等于把"测度"当成了"概率的独立事件连乘"——测度是长度/体积的推广，并集可加，乘法是另一回事。这条可加性，正是勒贝格积分能取代黎曼积分处理病态函数的地基。

</details>
