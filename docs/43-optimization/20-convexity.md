---
title: 凸集、凸函数与局部即全局
lesson_id: optimization/convexity
prereqs:
  - optimization/objective-feasible
  - linalg-advanced/positive-definite
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
  - convex-set
  - convex-function
  - local-global-equivalence
applications:
  - portfolio-control
  - structural-engineering
exits:
  - engineering
  - data-ai
---

# 凸集、凸函数与局部即全局

## 1. 从一个场景开始

浓雾里下山有两种命运：在一只光滑的碗底，随便朝下坡走都能走到谷底；在一片丘陵地带，你很可能走进一个小坑洼就宣布"到最低点了"——其实外面还有更深的谷。

优化把这两种地形分开的标准只有一个字：**凸**。凸的问题，贪心就是最优策略。

## 2. 直觉解释

**凸集**：集合里任取两点，连线整段都不出集合——像一块没有凹坑的橡皮泥。月亮（有缺口）不凸，圆盘凸。

**凸函数**：函数图像上任取两点，两点之间的弦**整条都压在图像上方或恰好贴着**——像一只碗。碗口可以宽窄不一，但不能有鼓包。

为什么凸性如此值钱？看弦不等式：从任意点出发沿下坡走，只要还没到全局最低点，弦的形状保证你**不可能被一个假山谷骗停**。于是：

$$\text{凸函数的局部极小} \;=\; \text{全局极小}$$

这一行等式是整个优化领域偏爱凸问题的全部理由：算法不用再担心"卡在小坑里"。

## 3. 正式定义

**凸集**：集合 $C$ 满足：对任意 $x,y\in C$ 和任意 $\theta\in[0,1]$，都有 $\theta x+(1-\theta)y\in C$（连线不出集合）。

**凸函数**：定义在凸集上的 $f$ 满足：对任意 $x,y$ 与 $\theta\in[0,1]$，

$$f(\theta x+(1-\theta)y)\;\le\;\theta f(x)+(1-\theta)f(y)$$

左边是"混合点"的函数值，右边是"函数值的混合"。读法：**先混合再算 ≤ 先算再混合**。

| 对象 | 例子 | 反例 |
| --- | --- | --- |
| 凸函数 | $x^2$、$\lvert x\rvert$、$e^x$ | $\sin x$（波浪起伏） |
| 凸集 | 圆盘、三角形、直线 | 月亮形、两个分离的圆 |

二阶判据（二次函数专用）：$f(x,y)=ax^2+by^2+cxy$ 是凸函数当且仅当它的 Hessian 矩阵半正定，用系数说即 $4ab-c^2\ge 0$ 且 $a\ge 0$（第 21 章正定课的老朋友）。

## 4. 分步例题

**例**：判断下列函数在 $\mathbb{R}$ 上是否凸。

1. $f(x)=x^2$：取 $x=1,y=3,\theta=0.5$。左边 $f(2)=4$；右边 $0.5f(1)+0.5f(3)=5$。$4\le 5$ ✓；换任何一对点都成立（抛物线开口向上），**凸**；
2. $g(x)=\lvert x\rvert$：中点抽查 $x=-1,y=1$：左边 $g(0)=0$，右边 $1$。✓。它甚至不可导——**凸性不需要可导**，**凸**；
3. $h(x)=\sin x$：取 $x=0,y=\pi,\theta=0.5$：左边 $h(\pi/2)=1$，右边 $0$。$1>0$ 违反弦不等式，**不凸**——正弦波有峰有谷，正是丘陵地形。

再看一个二维的：$f(x,y)=x^2+y^2-0.6xy$。这里 $a=1,b=1,c=-0.6$，判据给出 $4ab-c^2=4-0.36=3.64>0$ 且 $a=1>0$，**凸**；若把交叉项加强成 $c=3$，则 $4-9<0$，鞍形出场，不再凸。

## 5. 动手实验

### 实验 1：曲率实验台——调出碗、倒碗和马鞍

下面的组件画 $f(x,y)=ax^2+by^2+cxy$ 的等高线，并自动判断驻点类型。拖动滑块体会：**参数越过某条线，地形会突然变脸**。

```viz
{
  "type": "hessian-curvature",
  "title": "a·x² + b·y² + c·xy 的曲率分类",
  "a": 1,
  "b": 1,
  "c": 0.5
}
```

把 $c$ 从 $0.5$ 拖过 $2$（即超过 $2\sqrt{ab}=2$）：绿色"local minimum"瞬间变成红色的"saddle"——判据 $4ab-c^2$ 由正转负的分界，正是凸与不凸的分界。

### 实验 2：一维对比——碗与丘陵

横轴是自变量，蓝线是平方损失型的碗，橙色虚线是正弦丘陵。想象从任意起点往低处走：在蓝线上永远不会被骗停，在橙线上随时可能困在波谷。

```viz
{
  "type": "plot",
  "title": "凸碗 vs 非凸丘陵",
  "expr": "0.3*x^2",
  "expr2": "2*sin(x) + 2",
  "label": "convex",
  "label2": "non-convex",
  "xmin": -7,
  "xmax": 7
}
```

### 实验 3：中点凸性大规模抽查

```python title="随机抽查一万对点的弦不等式"
import random

def f(x):                       # 换成你想检验的函数
    return x * x

ok_count = 0
for trial in range(10000):
    a = random.uniform(-10, 10)          # uniform：在区间里取均匀随机小数
    b = random.uniform(-10, 10)
    mid = (a + b) / 2
    if f(mid) <= (f(a) + f(b)) / 2 + 1e-9:   # 容差防浮点误报
        ok_count = ok_count + 1

print(f"x^2 通过 {ok_count} / 10000")

def s(x):
    return (x - 2) ** 2 + 3              # 平移不改凸性

ok_count = 0
for trial in range(10000):
    a = random.uniform(-10, 10)
    b = random.uniform(-10, 10)
    if s((a + b) / 2) <= (s(a) + s(b)) / 2 + 1e-9:
        ok_count = ok_count + 1
print(f"(x-2)^2+3 通过 {ok_count} / 10000")
```

两轮全绿。注意抽查只能给信心；$\sin x$ 那样的反例（分步例题第 3 步）才是"不凸"的铁证——**一次反例即可否决，一万次通过也不能定案**。

### 快问快答

```quiz
凸函数的局部极小就是全局极小，根本原因是什么？
- 教科书规定的公理
- 弦永远压在图像上方，任何"假山谷"都会被弦暴露出更低的方向 [*]
- 因为凸函数一定处处可导
? 取局部极小点和真正的更优点连弦：弦不等式迫使两点之间存在函数值更小的中间点，与"局部极小"矛盾。
```

:::warning[常见误区]

**误区一**："单调递增的函数是凸的。" 单调说的是走势方向，凸说的是弯折方式——$x^3$ 在整个实数轴上单调却不凸（先凹后凸）。两者是不同维度。

**误区二**："凸函数必须处处可导。" $\lvert x\rvert$ 在原点是尖角，不可导，但完全凸。二阶判据只是**充分工具之一**，不是定义。

**误区三**："可行域凸 + 目标函数看起来对称，问题就凸。" 对称与凸是两回事。判定要回到定义或判据本身。

:::

## 6. 练习

**练习 1**（概念）：下列集合哪些是凸集？(a) 全平面；(b) 单位圆周（只有壳）；(c) 第一象限 $x\ge 0,y\ge 0$；(d) 两个不相交的圆盘之并。

<details>
<summary>点开查看逐步解答</summary>

(a) 凸——任意连线都在平面内；(b) **不凸**——球面上两点间的弦穿过球的内部，不在圆周上；(c) 凸——两个非负数混合还是非负；(d) 不凸——分别取两盘各一点，连线中途离开并集。注意 (b)：**有界的曲线壳往往不凸，实心的内部反而凸**。
</details>

**练习 2**（判题）：下面是一个中点凸性检查器，方向写反了导致所有函数都被判为"非凸"。修好方向后应全输出 True：

```exercise
# @title: 练习：修好凸性检查器的方向
# @check: True
# @check: True
# @check: True
# @hint: 中点凸性要求 f(中点) 不超过两端函数值的平均，比较符号应当是 <=。
def is_mid_convex(f, a, b):
    return f((a + b) / 2) >= (f(a) + f(b)) / 2   # ← 方向反了

def bowl(x):
    return x * x

for pair in [[0, 2], [1, 3], [-2, 4]]:
    print(is_mid_convex(bowl, pair[0], pair[1]))
```

**练习 3**：用实验 1 的判据手算 $f(x,y)=2x^2+3y^2+4xy$ 是否凸，再用组件验证你的结论。

<details>
<summary>点开查看逐步解答</summary>

$a=2,b=3,c=4$：$4ab-c^2=24-16=8>0$ 且 $a=2>0$，所以凸。组件里设 $a=2,b=3,c=4$ 应显示 local minimum。若把 $c$ 加到 5：$24-25<0$，立刻翻成 saddle——交叉项是凸性的头号杀手。
</details>

## 7. 选读：局部即全局的三行证明

<details>
<summary>选读 · 弦不等式的反证法</summary>

设 $f$ 凸，$x^\ast$ 是局部极小点。反设存在 $y$ 使 $f(y)<f(x^\ast)$。对任意 $\theta\in(0,1)$，凸性给出

$$f(\theta y+(1-\theta)x^\ast)\le \theta f(y)+(1-\theta)f(x^\ast)<f(x^\ast)$$

让 $\theta\to 0$，混合点可以落进 $x^\ast$ 的任意小邻域——邻域内竟有点比 $x^\ast$ 更低，与局部极小矛盾。故不存在这样的 $y$，$x^\ast$ 就是全局最小。证明只用了一次弦不等式加反证法，却买断了整类问题的可靠性。

</details>

## 8. 下一站

地形一旦确认是碗，就该请主角登场：沿着负梯度一步步往下走——梯度下降，以及那个牵一发而动全身的旋钮：学习率。

→ [梯度下降、学习率与收敛](./30-gradient-descent.md)
