---
title: 可分离与一阶线性方程
lesson_id: ode/separable-linear
prereqs:
  - ode/slope-fields
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
  - separable-equation
  - integrating-factor
applications:
  - cooling-models
  - drug-clearance
exits:
  - engineering
  - data-ai
---

# 可分离与一阶线性方程

## 1. 从一个场景开始

热咖啡变凉、药物被身体清除、电容放电，都常说“变化率与当前差距成正比”。这类方程有代数捷径：能拆开的就两边积分，线性的就请积分因子帮忙。

## 2. 直觉解释

可分离方程形如

$$\frac{dy}{dt}=g(y)h(t).$$

把含 $y$ 的项放到一边，含 $t$ 的项放到另一边，再积分。

一阶线性方程形如

$$\frac{dy}{dt}+p(t)y=q(t).$$

积分因子像一个校正器，把左边压缩成某个函数的导数。

## 3. 正式定义

若 $g(y)\ne0$，可分离方程可写成：

$$\frac{dy}{g(y)}=h(t)\,dt.$$

一阶线性方程的积分因子是：

$$\mu(t)=e^{\int p(t)\,dt}.$$

乘以 $\mu(t)$ 后：

$$\frac{d}{dt}(\mu y)=\mu q.$$

## 4. 分步例题

解

$$\frac{dy}{dt}=-2y+4,\qquad y(0)=3.$$

1. 平衡点在 $y=2$；
2. 令偏差 $z=y-2$，则 $z'=-2z$；
3. 所以 $z=z_0e^{-2t}=e^{-2t}$；
4. 解为 $y=2+e^{-2t}$；
5. $y(1)=2+e^{-2}\approx2.135$。

同一个结果也能用积分因子得到：乘 $\mu=e^{2t}$ 后，

$$e^{2t}y'+2e^{2t}y=4e^{2t},\qquad (e^{2t}y)'=4e^{2t}.$$

两边积分再除以 $e^{2t}$，同样得到 $y=2+Ce^{-2t}$；初值 $y(0)=3$ 给出 $C=1$。

## 5. 动手实验

### 实验 1：解族与平衡线

```viz
{
  "type": "separable-flow",
  "title": "y' = -2(y-2) 的解族",
  "k": -2,
  "a": 2,
  "y0": 3
}
```

拖动初值。$k=-2$ 时，所有解都被吸向水平线 $A=2$。

### 实验 2：方向场对照

```viz
{
  "type": "slope-field",
  "title": "y' = -2y + 4",
  "expr": "-2*y + 4",
  "t0": 0,
  "y0": 3
}
```

在 $y=2$ 附近，短线几乎水平；偏离越远，拉回的箭头越陡。

### 实验 3：Python 验证解

```python title="验证 y=2+e^(-2t)"
import math                          # 标准库 math：exp 用来算自然指数 e 的幂

def solution(t):                     # def 定义函数：候选解 y(t)
    return 2 + math.exp(-2 * t)      # 平衡值 2 加上按 e^(-2t) 衰减的偏差，系数由初值 y(0)=3 定

def derivative(t):                   # 候选解的导数 y'(t)
    return -2 * math.exp(-2 * t)     # 常数 2 求导消掉，指数每求一次导就乘一个 -2

def rule(t, y):                      # 方程右端 -2y+4：给定 (t, y) 就给出该点的斜率
    return -2 * y + 4                # 4 是驱动力：它把平衡点从 0 推到 y=2

residual = derivative(1) - rule(1, solution(1))   # 残差：左边导数减右边规则，应为 0
print(round(residual, 3))            # round(x, 3)：保留三位小数，压掉浮点误差
print(round(solution(1), 3))         # 顺带报出 t=1 时的解值，与正文的 2.135 对照
```

残差为 0，且 $y(1)\approx2.135$。

## 6. 练习

```exercise
# @title: 练习：补回驱动力
# @check: 0.0
# @check: 2.135
# @hint: 方程是 y'=-2y+4，不是 y'=-2y；验证时 rule 里不要漏掉 +4。
import math

def solution(t):           # 候选解：待修正
    return 2 + math.exp(-2 * t)

def derivative(t):
    return -2 * math.exp(-2 * t)

def rule(t, y):            # 方程的斜率规则：照着 y'=-2y+4 写
    return -2 * y          # ← 这条规则和题目里的方程对不上

residual = derivative(1) - rule(1, solution(1))   # 残差为零才说明解与方程一致
print(round(residual, 3))
print(round(solution(1), 3))
```

<details>
<summary>点开查看逐步解答</summary>

把规则补全：

```python
import math       # 标准库 math

def solution(t):  # 候选解
    return 2 + math.exp(-2 * t)   # 平衡值 2 加衰减偏差

def derivative(t):   # 它的导数
    return -2 * math.exp(-2 * t)

def rule(t, y):   # 方程右端
    return -2 * y + 4   # 补回驱动力 +4

residual = derivative(1) - rule(1, solution(1))   # 残差应为 0
print(round(residual, 3))   # 0.0
print(round(solution(1), 3))   # 2.135
```

代入 $y=2+e^{-2t}$：

```text
y'=-2e^(-2t)
-2y+4=-4-2e^(-2t)+4=-2e^(-2t)
```

两边相等。$t=1$ 时 $y=2+e^{-2}\approx2.135$。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为积分常数可有可无。它由初值决定，漏掉后解族就丢了。

**误区二**：你以为两边除以 $g(y)$ 总是安全。若 $g(y)=0$，那里可能藏着平衡解。

**误区三**：你以为一阶线性方程的解一定是直线。“线性”说的是 $y$ 和 $y'$ 的结构，不是图像形状。

:::

## 8. 快问快答

```quiz
y'=-2y+4 的平衡点在哪里？
- y=0
- y=2 [*]
- y=4
? 平衡点满足 0=-2y+4，所以 y=2。这里变化率归零，解不再移动。
```

## 9. 选读：积分因子为什么有效

<details>
<summary>选读 · 乘一下，凑成导数</summary>

对 $y'+p(t)y=q(t)$，乘 $\mu=e^{\int p dt}$ 后：

$$\mu y'+\mu p y=(\mu y)'.$$

因为 $\mu'=\mu p$。于是右边只剩 $\mu q$，直接积分即可。积分因子的本质是把散落的项重新包装成一个导数。

</details>

## 10. 下一站

可分离与一阶线性方程覆盖了一批"能积出来"的方程，但真实问题里最刺眼的信号往往不是平滑的指数，而是开关一合的**跳变**——电压从 0 跳到 5V，初值在 $t=0$ 处根本不连续。下一课换一副工具：Laplace 变换把整条微分方程连跳变一起搬进 $s$ 域，解方程变成解代数式。

→ [Laplace 变换求解 ODE](./25-laplace-transform.md)

如果更想先问"长期去向"，也可以跳到 [平衡点与稳定性](./30-equilibrium-stability.md)——那里用符号和相线判断吸引还是排斥。
