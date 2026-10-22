---
title: 微分方程与方向场
lesson_id: ode/slope-fields
prereqs:
  - calculus/chain
volume: 2
layer: L9
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - ordinary-differential-equation
  - slope-field
applications:
  - population-models
  - cooling-models
exits:
  - engineering
  - data-ai
---

# 微分方程与方向场

## 1. 从一个场景开始

你不知道明天的确切人口，只知道“人口越多，增长越快”。这句话不直接给出明天，却给出每个时刻的箭头；把箭头连起来，未来就浮出水面。

## 2. 直觉解释

普通方程问“$x$ 是多少”；微分方程问“$y$ 怎么变”。例如

$$\frac{dy}{dt}=y$$

读作：$y$ 的变化率等于 $y$ 自己。$y$ 是未知函数，$t$ 是时间。

在平面上每一点画一条斜率为 $f(t,y)$ 的短线，就得到方向场。解是一条从初值出发、处处顺着短线走的曲线。方向场本身不挑选起点；初值负责从满平面的瞬时指令中选出一条轨迹。

## 3. 正式定义

一阶常微分方程初值问题是：

$$\frac{dy}{dt}=f(t,y),\qquad y(t_0)=y_0.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $t$ | 自变量 | 常代表时间 |
| $y(t)$ | 未知函数 | 要寻找的轨迹 |
| $f(t,y)$ | 变化率规则 | 每个位置规定的斜率 |
| $y_0$ | 初值 | 出发点 |

若 $y(t)=2e^t$，则 $y'(t)=2e^t$。它确实满足 $y'=y$ 和 $y(0)=2$。

## 4. 分步例题

验证 $y(t)=2e^t$ 是 $\frac{dy}{dt}=y$ 的解：

1. 左边：$y'(t)=2e^t$；
2. 右边：$y(t)=2e^t$；
3. 左右相等，所以是解；
4. 初值 $y(0)=2e^0=2$ 也吻合。

## 5. 动手实验

### 实验 1：方向场与轨迹

```viz
{
  "type": "slope-field",
  "title": "dy/dt = y 的方向场",
  "expr": "y",
  "t0": 0,
  "y0": 2
}
```

拖动紫色初值点。橙色曲线是顺着方向场走出的解；起点不同，命运不同。

### 实验 2：解族流动

```viz
{
  "type": "separable-flow",
  "title": "y' = y 的解族",
  "k": 1,
  "a": 0,
  "y0": 2
}
```

蓝线是不同初值的解族，橙线是当前解。$k=1$ 时，所有非零解都指数离开零平衡线。

### 实验 3：Python 验证解

```python title="验证 y=2e^t"
import math                                    # 导入标准库 math：exp / sqrt / pi 都从这里取

def solution(t):                                # def 定义函数：给定时刻 t，返回该时刻的 y 值
    return 2 * math.exp(t)                     # math.exp 就是 e 的幂；系数 2 由初值 y(0)=2 定下

def derivative(t):                              # 第二个函数：候选解的变化率 y'(t)
    return 2 * math.exp(t)                     # 对 2e^t 求导仍是 2e^t——这正是 y'=y 成立的原因

residual = derivative(1) - solution(1)          # 残差 = 左边(导数) − 右边(规则)；应当为 0
print(round(residual, 3))                       # round(值, 3) 保留 3 位小数，把浮点噪音收干净
print(round(solution(1), 3))                    # 顺便报出 t=1 时的解值，供与正文的 5.437 对照
```

残差是“左边的导数减右边的规则”。输出 `0.0` 和 `5.437`，说明解在 $t=1$ 处成立。

## 6. 练习

```exercise
# @title: 练习：修正指数解
# @check: 0.0
# @check: 5.437
# @hint: 初值是 y(0)=2，而方程 y'=y 的解应写成 2e^t；检查代码里的指数系数。
import math

def solution(t):                  # 候选解：待修正，让 y(0) 与初值吻合
    return math.exp(t)           # ← 这里的系数还没对上初值（见提示）

def derivative(t):                # 候选解的导数：跟着 solution 一起改
    return math.exp(t)

residual = derivative(1) - solution(1)
print(round(residual, 3))
print(round(solution(1), 3))
```

<details>
<summary>点开查看逐步解答</summary>

初值要求 $y(0)=2$。若只写 $e^t$，则 $y(0)=1$。

```python
import math                 # 标准库 math

def solution(t):            # 修正后的解：系数补上 2
    return 2 * math.exp(t)  # 2e^t，满足 y(0)=2

def derivative(t):          # 它的导数
    return 2 * math.exp(t)  # 2e^t 求导还是 2e^t

residual = derivative(1) - solution(1)   # 残差应为 0
print(round(residual, 3))   # 0.0
print(round(solution(1), 3))   # 5.437
```

所以残差为 0，且 $y(1)=2e\approx5.437$。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为方向场里的短线就是解。它们只是局部斜率；解才是把短线连成的曲线。

**误区二**：你以为同一个方程只有一条解。初值不同，轨迹可以完全不同。

**误区三**：你以为 $y'$ 里的 $y$ 是已知数。它是要寻找的未知函数，这正是微分方程的难点。

:::

## 8. 快问快答

```quiz
方向场中一条短线表示什么？
- 一个精确解
- 某点处解的斜率 [*]
- 时间轴方向
? 方向场在每点画出 f(t,y) 给定的斜率；解必须顺着这些斜率走。
```

## 9. 选读：为什么初值很重要

<details>
<summary>选读 · 同一方程的不同解族</summary>

对 $y'=y$，通解是 $y=Ce^t$。常数 $C$ 由初值决定：$C=y(0)$。因此 $y(0)=2$ 给出 $y=2e^t$，$y(0)=-1$ 给出 $y=-e^t$。方向场把整个解族同时摆在平面上，初值负责从中选一条。

</details>

## 10. 下一站

方向场承诺"初值选出一条轨迹"——这份合同何时生效？下一课先当一回审计员：存在与唯一的条款、失效的反例，以及把解"榨"出来的皮卡迭代。

→ [解的存在与唯一：什么时候一个初值只定一条路](./15-existence-uniqueness.md)
