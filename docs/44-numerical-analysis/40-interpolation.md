---
title: 插值：用几个点造一条曲线
lesson_id: numerical-analysis/interpolation
prereqs:
  - functions/quadratic
  - algebra/linear-equation
  - numerical-analysis/floating-point
volume: 5
layer: L6
track:
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - interpolation
  - lagrange-basis
applications:
  - structural-engineering
  - signal-reconstruction
exits:
  - engineering
  - data-ai
---

# 插值：用几个点造一条曲线

## 1. 从一个场景开始

桥梁健康监测系统只在梁的四个位置装了位移传感器，其余位置的挠度全靠推算。质检员的问题很具体：**测点之间没有数据的地方，梁的下沉量算多少？**

给每个已知点打上钉子、再用一条光滑的数学曲线把它们全部串起来——这条曲线就是插值多项式。它不是"大概齐"的拟合（拟合允许穿不中点），而是**必须一颗不漏地穿过每颗钉子**。

## 2. 直觉解释

两点定一线、三点定一抛物线：$n{+}1$ 个点唯一确定一个次数不超过 $n$ 的多项式。怎么"造"出它？拉格朗日的想法漂亮得像魔术：

为每个数据点 $x_i$ 配一个**开关函数** $\ell_i(x)$——在自家点 $x_i$ 处等于 1，在**所有别人家**的点处等于 0。于是

$$P(x) = y_0\ell_0(x)+y_1\ell_1(x)+\cdots+y_n\ell_n(x)$$

自动满足要求：走到 $x_i$ 时只有第 $i$ 个开关亮着，$P(x_i)$ 就等于 $y_i$；其他位置则是所有高度按开关比例的混合。

开关怎么造？$\ell_0(x)=\dfrac{(x-x_1)(x-x_2)}{(x_0-x_1)(x_0-x_2)}$——分子保证在别人家归零，分母恰好把自家的值配平成 1。

## 3. 正式定义

给定互不相同的节点 $x_0,\ldots,x_n$ 及对应值 $y_0,\ldots,y_n$，**拉格朗日插值多项式**为：

$$P(x)\;=\;\sum_{i=0}^{n}\;y_i\,\ell_i(x),\qquad \ell_i(x)=\prod_{j\ne i}\frac{x-x_j}{x_i-x_j}$$

| 性质 | 内容 |
| --- | --- |
| 开关性 | $\ell_i(x_k)=1$（当 $k=i$）否则 $0$ |
| 存在唯一性 | 次数 $\le n$ 且过全部节点的多项式唯一 |
| 插值 vs 拟合 | 插值必须过点；最小二乘拟合允许留误差换平滑 |

一条工程警告先立在此处：**节点越多、次数越高，曲线未必越听话**——等距节点上高次插值会在两端剧烈甩尾（龙格现象，见选读）。

## 4. 分步例题

**例**：求过 $(0,1)$、$(1,2)$、$(2,5)$ 的二次插值多项式。

1. 设 $P(x)=ax^2+bx+c$，代入三点得方程组：
2. $x=0$：$c=1$；
3. $x=1$：$a+b+c=2$，即 $a+b=1$；
4. $x=2$：$4a+2b+c=5$，即 $4a+2b=4$，约简 $2a+b=2$；
5. 两式相减得 $a=1$，回代 $b=0$；所以 $P(x)=x^2+1$；
6. 验收：$P(0)=1$ ✓，$P(1)=2$ ✓，$P(2)=5$ ✓。中点估值 $P(0.5)=1.25$、$P(1.5)=3.25$——这就是"没有传感器的地方"给出的答案。

拉格朗日公式走的是另一条路（直接拼开关函数），殊途同归——唯一性定理保证两条路撞见同一个多项式。

## 5. 动手实验

### 实验 1：亲手调一个三次插值

目标：让下面的三次曲线穿过四个靶点 $(-2,-3)$、$(-1,2)$、$(1,0)$、$(2,5)$。组件不会把这些靶点画出来，请对着网格读坐标来验收：检查曲线是否依次经过这四处。拖动四个系数滑块开始调：

```viz
{
  "type": "plot",
  "title": "调滑块让曲线穿过四个靶点（答案是 c0=1, c1=-2, c3=1）",
  "expr": "c0 + c1*x + c2*x^2 + c3*x^3",
  "xmin": -2.5,
  "xmax": 2.5,
  "sliders": [
    { "name": "c0", "min": -3, "max": 3, "step": 0.1, "value": 0 },
    { "name": "c1", "min": -3, "max": 3, "step": 0.1, "value": 0 },
    { "name": "c2", "min": -3, "max": 3, "step": 0.1, "value": 0 },
    { "name": "c3", "min": -3, "max": 3, "step": 0.1, "value": 0 }
  ]
}
```

调到全中后你会发现 $c_2=0$——这道题的真身是 $P(x)=x^3-2x+1$。手工调参要碰运气，而拉格朗日公式一步到位，这就是公式的价值。

### 实验 2：通用插值机

```python title="拉格朗日插值：任意节点任意查询"
xs = [0, 1, 2]
ys = [1, 2, 5]

def interp(x_query):                    # 返回插值多项式在 x_query 处的值
    total = 0.0
    for i in range(len(xs)):
        term = ys[i]
        for j in range(len(xs)):
            if j != i:
                term = term * (x_query - xs[j]) / (xs[i] - xs[j])   # 累乘出开关函数
        total = total + term
    return total

print(interp(0))                        # 应精确命中已知点
print(interp(2))
print(interp(0.5))                      # 中点估值
print(interp(1.5))
```

四行输出 $1.0, 5.0, 1.25, 3.25$ 与手推一致。这台机器对任何节点表都适用——把它装进画图循环就得到完整曲线：

```python title="插值曲线与数据点的对照图"
import matplotlib.pyplot as plt

xs = [0, 1, 2]
ys = [1, 2, 5]

def interp(x_query):
    total = 0.0
    for i in range(len(xs)):
        term = ys[i]
        for j in range(len(xs)):
            if j != i:
                term = term * (x_query - xs[j]) / (xs[i] - xs[j])
        total = total + term
    return total

grid = []                                # 从 -0.5 到 2.5 均匀撒 151 个查询点
for k in range(151):
    grid.append(-0.5 + k * 0.02)

curve = [interp(t) for t in grid]
plt.plot(grid, curve, label="interp P(x)")
plt.scatter(xs, ys, s=80, color="tomato", zorder=3, label="data")   # scatter 散点；zorder 控制叠放层级
plt.legend()
plt.grid(True)
```

蓝线严格穿过每个红点——插值的合同一字千金。

### 快问快答

```quiz
插值与最小二乘拟合的本质区别是什么？
- 插值用的点更多
- 插值曲线必须精确穿过每个数据点，拟合允许有残差 [*]
- 两者完全一样只是叫法不同
? 传感数据被认为无噪声时用插值（过点是硬约束）；数据带测量噪声时强行过点会把噪声也学进去，此时应让拟合留出容错。
```

:::warning[常见误区]

**误区一**："点越多，插值多项式越准。" 高次等距插值会甩尾（龙格现象）：11 个节点能把两端振出十几倍的摆幅。实践中常用分段低次插值（样条）而非整体高次。

**误区二**："插值可以放心外推。" 开关函数在节点区间之外会疯狂放大——多项式只对区间内的行为负责。上面的例子中若问 $P(10)$，得到的 101 与真实世界毫无契约关系。

**误区三**："两个节点相同也没关系。" 节点重复会让开关函数的分母出现零，整个构造崩塌。输入数据先查重是基本卫生。

:::

## 6. 练习

**练习 1**（概念）：过 $(1,3)$、$(2,7)$ 两点的一次插值多项式是什么？用它估计 $x=1.5$ 处的值。

<details>
<summary>点开查看逐步解答</summary>

斜率 $(7-3)/(2-1)=4$，截距 $3-4\times1=-1$，即 $P(x)=4x-1$；$P(1.5)=5$。两点插值又叫**线性插值**——本章实战挑战里桥梁监测用的正是它：相邻测点之间拉直线。
</details>

**练习 2**（判题）：初始代码里的开关函数忘了除以配平分母，导致插值结果整体跑偏。补上一行修复它：

```exercise
# @title: 练习：修好插值机的开关函数
# @check: 1.25
# @check: 3.25
# @check: True
# @hint: 每个累乘因子都要除以 (xs[i] - xs[j])，把自家点的值配平成 1。
xs = [0, 1, 2]
ys = [1, 2, 5]

def interp(x_query):
    total = 0.0
    for i in range(len(xs)):
        term = ys[i]
        for j in range(len(xs)):
            if j != i:
                term = term * (x_query - xs[j])   # ← 错了：少了配平分母
        total = total + term
    return total

print(interp(0.5))
print(interp(1.5))
print(interp(2) == ys[2])     # 已知点必须精确命中
```

修好后前两行输出 $1.25$ 和 $3.25$，第三行 True——开关性回归，插值合同重新生效。

**练习 3**：往实验 2 的机器里塞入第四个点 $(3,11)$（xs 改为 `[0, 1, 2, 3]`，ys 改为 `[1, 2, 5, 11]`），看 interp(0.5) 变成多少，并解释为什么旧答案不再成立。

<details>
<summary>点开查看逐步解答</summary>

原来的三个点恰好都躺在抛物线 $P_2(x)=x^2+1$ 上（$P_2(0)=1,P_2(1)=2,P_2(2)=5$）。但 $P_2(3)=10\neq11$——新钉子不在这条抛物线上，于是插值多项式被迫升级为三次曲线并整体改形。解方程组可得新多项式

$$P_3(x)=\tfrac{1}{6}x^3+\tfrac{1}{2}x^2+\tfrac{1}{3}x+1$$

它给出 $interp(0.5)\approx1.3125$（旧答案 1.25 作废）。**插值多项式是全体节点的公共决定**：动一个点，处处重排。
</details>

## 7. 选读：龙格现象——好心的等距节点如何闯祸

<details>
<summary>选读 · 一张图看懂高次甩尾</summary>

对光顺函数 $f(x)=1/(1+25x^2)$ 在 $[-1,1]$ 上取 $n$ 个**等距**节点做插值：当 $n$ 增大时，区间中部越来越贴，但两端附近振荡幅度指数级恶化——10 次、20 次多项式在端部能甩出几十倍的摆幅。原因在于等距节点的**开关函数在端部的最大值随 $n$ 爆炸**。药方有三：切比雪夫节点（往中间挤）、分段低次（样条）、或干脆改做最小二乘拟合。一句话总结：**高次插值是把双刃剑，自由度越高，两端的野心越大。**

</details>

## 8. 下一站

有了浮点、稳定性和迭代三件工具，还差一件"用随机对付确定性"的法宝：蒙特卡洛方法——撒一把骰子也能算积分、估风险。它与本章其余课程一起，构成"让数学在计算机上可靠工作"的完整 toolbox。

→ [概率与大数定律](../09-probability/20-law-of-large-numbers.md)
