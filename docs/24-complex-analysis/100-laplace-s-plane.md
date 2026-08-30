---
title: Laplace 变换与 s 平面
lesson_id: complex-analysis/laplace-s-plane
prereqs:
  - complex-analysis/real-integrals
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import:
  - cmath
introduces_concepts:
  - laplace-transform
  - region-of-convergence
applications:
  - control-systems
  - circuit-response
exits:
  - engineering
---

# Laplace 变换与 s 平面

## 1. 开场钩子

微分方程里的求导、时移和卷积，到了 Laplace 世界都变成乘法与除法。真正的工作台是一个复平面：横坐标 $\sigma$ 管衰减，纵坐标 $\omega$ 管振荡。极点落在左半平面还是右半平面，常常直接决定系统稳定还是爆炸。

## 2. 直觉解释

单边 Laplace 变换定义为

$$F(s)=\int_0^{\infty}e^{-st}f(t)\,dt,\qquad s=\sigma+i\omega.$$

因子 $e^{-st}$ 同时做两件事：实部 $-\sigma t$ 控制指数压制或放大；虚部 $-i\omega t$ 提供旋转探针。所以 $s$ 不是随便一个参数，而是“增长率加角频率”的复数地址。

## 3. 正式定义

若存在实数 $\sigma_0$ 使 $e^{-\sigma t}f(t)$ 在 $[0,\infty)$ 可积，则当 $\operatorname{Re}s>\sigma_0$ 时积分绝对收敛。这个半平面叫收敛域。

常用变换：

| 原函数 | Laplace 变换 | 收敛域 |
| --- | --- | --- |
| $1$ | $1/s$ | $\operatorname{Re}s>0$ |
| $e^{at}$ | $1/(s-a)$ | $\operatorname{Re}s>a$ |
| $\sin bt$ | $b/(s^2+b^2)$ | $\operatorname{Re}s>0$ |
| $\cos bt$ | $s/(s^2+b^2)$ | $\operatorname{Re}s>0$ |

导数性质：

$$\mathcal L\lbrace f'(t)\rbrace=sF(s)-f(0).$$

花括号用文字记号表示变换作用；微分被换成代数项。

## 4. 分步例题

求 $f(t)=e^{2t}$ 的变换。

1. 写积分：$\displaystyle F(s)=\int_0^\infty e^{-(s-2)t}\,dt$；
2. 当 $\operatorname{Re}s>2$ 时指数衰减；
3. 积分得 $F(s)=1/(s-2)$；
4. 极点在 $s=2$；
5. 收敛域是右边界过 2 的右半平面。

反过来，系统 $H(s)=1/(s+3)$ 的极点是 $s=-3$，位于左半平面，因此冲激响应按 $e^{-3t}$ 衰减。

> 本课只用指数模式解释极点位置；线性常微分方程的完整解法在后面的 ODE 章展开。

## 5. 动手实验

### 实验 1（viz）：看衰减率如何压住振荡

```viz
{
  "type": "plot",
  "title": "e^(-a*t)*cos(b*t)：σ 与 ω 的分工",
  "expr": "exp(-a*x)*cos(b*x)",
  "xmin": 0,
  "xmax": 6,
  "sliders": [
    { "name": "a", "min": 0, "max": 2, "step": 0.1, "value": 0.8 },
    { "name": "b", "min": 0, "max": 10, "step": 0.5, "value": 4 }
  ]
}
```

$a$ 对应极点横坐标的相反数；$b$ 对应虚部。增大 $a$ 波包更快消失，增大 $b$ 振荡更密。

### 实验 2（python）：在具体 s 点采样复指数

```python title="e^(s*t) 在三个 s 地址的行为"
import cmath   # cmath 支持复数的数学函数；cmath.exp 可接受复指数

for s in [-1 + 6j, 0 + 6j, 1 + 6j]:
    t = 2
    value = cmath.exp(s * t)   # 复指数：模长由 exp(sigma*t) 控制
    print(f"s={s}, value={round(value.real, 3)} + {round(value.imag, 3)}i")
```

左半平面的点变小，纯虚轴上的点只转圈不增减，右半平面的点迅速放大。

```quiz
系统 H(s)=1/(s+3) 的极点在 s=-3，它的自然响应会怎样？
- 指数增长
- 指数衰减 [*]
- 永远等幅振荡
? 极点位于左半平面，对应时间模式 e 的负三次 t 次方，因此衰减。
```

### 实验 3（python）：数值验证 L{1}=1/s

```python title="从 0 到 T 截断积分近似"
import cmath

s = 1 + 2j
N = 20000
T = 30
h = T / N
total = 0 + 0j
for k in range(N):
    t = (k + 0.5) * h
    total += cmath.exp(-s * t) * h
print(round(total.real, 5), round(total.imag, 5))
```

输出接近理论值

$$\frac{1}{1+2i}=0.2-0.4i.$$

:::warning[常见误区]

**误区一**：你以为 Laplace 变换只是查表游戏。核心是把时间域的微分结构翻译成 $s$ 域的代数结构。

**误区二**：你以为公式对全平面成立。每个变换都有自己的收敛域。

**误区三**：你以为极点离原点近就一定更不稳定。稳定性先看左右半平面，再看阻尼与响应速度。

:::

## 6. 练习

```exercise
# @title: 练习：判断 H(s)=1/(s+3) 的极点和频率增益
# @check: -3.0
# @check: 0.2
# @hint: 极点让分母为零；频率响应取 s=i*omega，模长是复数分母的长度。
pole_real = 3.0          # 请检查符号
omega = 4.0
gain = 1 / abs(pole_real + omega)    # 请把 s=i*omega 代入分母后再取模长
print(round(pole_real, 1))
print(round(gain, 1))
```

<details>
<summary>点开查看逐步解答</summary>

分母 $s+3=0$ 给出极点 $s=-3$，所以实部为 `-3`。

令 $s=4i$，分母为 $3+4i$，模长为 5，因此 $|H(4i)|=1/|3+4i|=0.2$。
</details>

## 7. 选读：逆变换与留数的接口

<details>
<summary>选读 · Bromwich 围道</summary>

单边逆变换可写成

$$f(t)=\frac{1}{2\pi i}\int_{\gamma-i\infty}^{\gamma+i\infty}e^{st}F(s)\,ds,$$

其中竖线放在收敛域内。闭合围道后，$t>0$ 时左侧大弧常可压住；于是逆变换由 $F(s)e^{st}$ 的留数给出。这正是留数定理进入控制工程的方式。
</details>

## 8. 下一站

一个局部幂级数只在圆盘内有效，但解析函数往往能穿过边界继续生长。下一课讲解析延拓：如何用一串互相重叠的圆盘走出更大的世界。

→ [解析延拓选讲](./110-analytic-continuation.md)
