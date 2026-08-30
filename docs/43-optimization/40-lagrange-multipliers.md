---
title: 拉格朗日乘数法
lesson_id: optimization/lagrange-multipliers
prereqs:
  - optimization/objective-feasible
  - multivariable/partial-gradient
volume: 5
layer: L7
track:
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - lagrange-multiplier
  - tangency-condition
applications:
  - resource-allocation
  - portfolio-control
exits:
  - engineering
  - data-ai
---

# 拉格朗日乘数法

## 1. 从一个场景开始

你有 24 米围栏，要圈一块矩形菜园。矩形周长定了，长和宽怎么搭配才能让面积最大？凭经验你会说"正方形"，但**为什么**是正方形？更妙的是：如果邻居再借你 1 米围栏（总长变 25），最大面积能涨多少？

第一个问题问的是最优点，第二个问题问的是**约束松一点能赚多少**——拉格朗日乘数法一次回答两个。

## 2. 直觉解释

把目标函数的等高线画出来（一圈一圈的"海拔环"），再把约束曲线画上去（一条不许离开的轨道）。沿着轨道走，海拔先降后升——**最低的那个瞬间，恰好是等高线与轨道相切的时刻**。

相切意味着什么？两条曲线在该点共享同一条切线，也就是**法向量平行**。目标函数的法向量是 $\nabla f$，约束曲线的法向量是 $\nabla g$。于是几何条件翻译成代数条件：

$$\nabla f = \lambda \nabla g$$

这个比例系数 $\lambda$ 就是**拉格朗日乘子**。它还有一层身份：影子价格——约束右端放松一个单位，最优值大约变化 $\lambda$。

## 3. 正式定义

求 $f(x,y)$ 在约束 $g(x,y)=c$ 下的极值：构造**拉格朗日函数**

$$L(x,y,\lambda) \;=\; f(x,y)\;-\;\lambda\,\bigl(g(x,y)-c\bigr)$$

然后令 $L$ 对所有变量的一阶偏导为零：

$$\frac{\partial L}{\partial x}=0,\qquad \frac{\partial L}{\partial y}=0,\qquad \frac{\partial L}{\partial \lambda}=0$$

第三个方程其实就是原约束 $g=c$；前两个合起来正是 $\nabla f=\lambda\nabla g$。解出的候选点里挑出真正的最优点（用代入比较或凸性判断）。

$\lambda$ 的灵敏度含义：当最优值 $f^\ast(c)$ 随约束水平 $c$ 变化时，在可微的意义上 $\dfrac{df^\ast}{dc}=\lambda$。

| 符号 | 含义 |
| --- | --- |
| $f$ | 目标函数（想优化的量） |
| $g=c$ | 等式约束（必须满足的条件） |
| $\lambda$ | 拉格朗日乘子 / 影子价格 |

## 4. 分步例题

**例**：周长 24 米的矩形，面积最大是多少？（即 $\max xy$，约束 $x+y=12$。）

1. 写出拉格朗日函数：$L=xy-\lambda(x+y-12)$；
2. 偏导置零：$\partial L/\partial x=y-\lambda=0$；$\partial L/\partial y=x-\lambda=0$；
3. 前两式给出 $x=\lambda,\,y=\lambda$，代回约束：$2\lambda=12$，所以 $x=y=\lambda=6$；
4. 最优面积 $36$ 平方米——正方形胜出；
5. 影子价格：$\lambda=6$ 意味着周长每加 1 米，最大面积约增 6 平方米。验证：周长 26 时最优边长 6.5，面积 $42.25=36+6.25\approx36+6\times1+0.25$ ✓（多出来的 0.25 是二阶小量）。

注意第 3 步的结构美：**三个未知数、三个方程，机械地解就行**——不需要画图也不需要猜。

## 5. 动手实验

### 实验 1：单变量视角——约束消元后的山峰

把约束 $y=12-x$ 代进面积得 $A(x)=x(12-x)$。拖动滑块选择候选横坐标 $a$，橙色水平线显示对应面积；观察它与抛物线顶点 $36$ 的关系：

```viz
{
  "type": "plot",
  "title": "A(x) = x(12-x)：消元后就是一条开口向下的抛物线",
  "expr": "x*(12-x)",
  "expr2": "a*(12-a)",
  "label": "A(x)",
  "label2": "candidate A(a)",
  "xmin": 0,
  "xmax": 12,
  "sliders": [
    { "name": "a", "min": 0.5, "max": 11.5, "step": 0.05, "value": 6 }
  ]
}
```

消元法在这道题里很好用。但约束多、变量多时消元会迅速失控——拉格朗日方法的威力正在于**不挑形状、统一流程**。

### 实验 2：数值验证——梯度平行 + 影子价格

```python title="在约束线上撒网格找最大值，并核对 lambda"
best_x, best_a = None, None
for i in range(1201):                 # x 从 0 到 12，步长 0.01
    x = i * 0.01
    a = x * (12 - x)
    if best_a is None or a > best_a:
        best_a = a
        best_x = x
print("网格找到:", best_x, round(best_a, 3))

lam = 6.0                             # 手算的乘子
print("放松到 c=13 的预测:", 36 + lam)          # 影子价格预测
print("实际 c=13 最优:", 6.5 * 6.5)             # 精确值对照
print("放松到 c=11 的预测:", 36 - lam)
print("实际 c=11 最优:", 5.5 * 5.5)
```

网格结果 $(6.00, 36.0)$ 与手算一致；影子价格的两次预测都只差一个小尾巴（0.25）——那是曲率带来的二阶修正，一阶意义上 $\lambda$ 说得分毫不差。

### 快问快答

```quiz
拉格朗日乘子 λ 的"影子价格"含义是什么？
- 它是目标函数的最优值本身
- 约束水平放松一个单位时，最优值大约改变 λ [*]
- 它是约束条件的斜率
? df*/dc = λ：λ 越大说明这条约束卡得越疼，放松它的收益越高。资源分配问题里它直接指导"该给哪条约束追加预算"。
```

:::warning[常见误区]

**误区一**："$\lambda$ 是目标函数的一部分，要把它最小化。" $L$ 只是记账工具，$\lambda$ 不是决策变量而是待求的对偶量；真正要优化的是 $f$，$\lambda$ 负责"收费"违反约束的行为。

**误区二**："解出一阶条件就完事了。" 一阶条件给出的是**候选点**：还需比较各候选点的函数值，或用凸性确认全局性（上一课的判据在这里接上）。

**误区三**："任何约束都能这样处理。" 标准乘数法针对**等式约束且梯度不为零**的情形；带不等号（$g\le c$）时要升级为 KKT 条件——那是本章后续课程的主题，届时 $\lambda\ge0$ 会带上方向含义。

:::

## 6. 练习

**练习 1**（概念）：预算线 $x+y=10$ 上最大化效用 $u=xy$。不计算，仅利用对称性说出最优解，再用影子价格口算预算变 11 后的新最优。

<details>
<summary>点开查看逐步解答</summary>

对称目标配对称约束，最优点在对角线上 $x=y=5$，$u^\ast=25$。预算加 1：由例题同款公式，新最优 $(5.5)^2=30.25$，增量恰为 $\lambda=5$ 加二阶小量 $0.25$。**对称性先行，往往能把计算砍掉一半。**
</details>

**练习 2**（判题）：用围栏 24 米圈矩形（半周长 $x+y=12$）的问题已经手算过：$x=y=6$、$\lambda=6$、面积 36。初始代码填的是一组没经过求解的猜测值，请把四个数全部换成正确解并运行：

```exercise
# @title: 练习：解出菜园问题的乘子系统
# @check: 6
# @check: 6
# @check: 6
# @check: 36
# @hint: 由 y=lambda 与 x=lambda 得 x=y，再代回 x+y=12 解出 lambda。
x = 4      # ← 猜测值：长
y = 8      # ← 猜测值：宽
lam = 4    # ← 猜测值：乘子 λ
area = 32  # ← 猜测值：面积

print(x)
print(y)
print(lam)
print(area)
```

四行全对时你等于亲手跑通了"偏导置零 → 代回约束 → 读出影子价格"的全套流程。

**练习 3**：把例题推广到三种货物：$x+y+z=12$ 下最大化 $xyz$。猜想最优点并用拉格朗日条件验证。

<details>
<summary>点开查看逐步解答</summary>

猜想均分：$x=y=z=4$，积 64。验证：$L=xyz-\lambda(x+y+z-12)$，偏导给出 $yz=xz=xy=\lambda$；前两者相除（变量都正）得 $x=y$，同理得 $z=y$，代回约束得 $4,4,4$，此时每个偏导值 $16=\lambda$。均值不等式"积定和最小、和定积最大"在这里被乘数法重新证明了一遍。
</details>

## 7. 选读：为什么相切点是必要的

<details>
<summary>选读 · 反证一分钟</summary>

设在约束曲线上的最优点 $p$ 处 $\nabla f(p)$ 与 $\nabla g(p)$ 不平行。约束曲线在该点的切向量为 $t$，"沿曲线能动"意味着对任意小步 $s\,t$，$g$ 仍等于 $c$（一阶意义）；而 $f$ 的变化率是 $\nabla f\cdot t$。不平行则 $\nabla f$ 在切向上必有分量，取合适符号的 $s$ 就能让 $f$ 变小而不破坏约束——$p$ 就不是最优点，矛盾。故最优点处 $\nabla f$ 只能整个落在法向上，即 $\nabla f=\lambda\nabla g$。（要求 $\nabla g\neq 0$ 排除约束曲线自身退化的奇点，这就是"约束规格"。）

</details>

## 8. 下一站

优化不能只停在纸面——下一章我们看它如何变成机器学习的训练引擎：损失函数当目标、数据当地形、梯度下降当发动机。

→ [损失函数与经验风险](../45-ml-math/10-loss-function.md)
