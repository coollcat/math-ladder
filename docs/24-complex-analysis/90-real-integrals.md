---
title: 定积分计算应用
lesson_id: complex-analysis/real-integrals
prereqs:
  - complex-analysis/residue-theorem
  - fourier/transform
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - semicircular-contour
applications:
  - signal-integrals
  - probability-normalization
exits:
  - engineering
  - research
---

# 定积分计算应用

## 1. 开场钩子

$\displaystyle\int_{-\infty}^{\infty}\frac{dx}{x^2+1}$ 用实方法要背反正切公式。复分析却换一条路：把线段补成上半大半圆，只问里面藏了哪些极点。大弧消失后，实积分自己交出答案。

## 2. 直觉解释

取从 $-R$ 到 $R$ 的实线段，再接上上半平面半径为 $R$ 的半圆弧，形成闭围道。若被积函数在大弧上衰减够快，弧长虽然增长，贡献却趋于 0。

于是：

$$\int_{-\infty}^{\infty}f(x)\,dx=2\pi i\sum_{\operatorname{Im}z_k>0}\operatorname{Res}_{z=z_k}f.$$

只加上半平面的极点，因为下半平面不在围道内。

## 3. 正式适用条件

经典半圆法适合形如

$$\int_{-\infty}^{\infty}R(x)\,dx$$

的有理函数积分，其中 $R=P/Q$ 满足：

1. 分母在实轴上没有零点；
2. 分母次数至少比分子高两次；
3. 极点位置已知且非重合于实轴。

带三角函数的积分常把 $e^{iaz}$ 与 Jordan 引理配合使用；实轴上有单极点时要用缩进围道绕开并取半留数。

## 4. 分步例题

计算

$$I=\int_{-\infty}^{\infty}\frac{dx}{x^2+1}.$$

1. 令 $f(z)=1/(z^2+1)$，奇点为 $z=\pm i$；
2. 取上半大半圆，只包含 $z=i$；
3. 一阶极点留数为

$$\operatorname{Res}_{z=i}f=\frac{1}{2i};$$

4. 围道积分为 $2\pi i\cdot\dfrac1{2i}=\pi$；
5. 大弧半径 $R\to\infty$ 时贡献为 0；
6. 所以 $I=\pi$。对称性也可给出 $\displaystyle\int_0^\infty=\pi/2$。

## 5. 动手实验

### 实验 1（viz）：看看大尾巴有多快衰减

```viz
{
  "type": "plot",
  "title": "1/(x^2+1) 的钟形衰减",
  "expr": "1/(x^2+1)",
  "xmin": -10,
  "xmax": 10,
  "sliders": []
}
```

远离原点时曲线迅速贴向横轴。这正是半圆弧贡献可以被压住的几何原因。

### 实验 2（python）：数值逼近实积分

```python title="用压缩映射估算全实轴积分"
import math

N = 100000
total = 0.0
for k in range(N):
    t = (k + 0.5) / N
    # x=t/(1-t) 把 [0,∞) 压进 (0,1)；dx=dt/(1-t)^2，再利用偶函数乘 2
    x = t / (1 - t)
    weight = 1 / ((1 - t) * (1 - t))
    total += 2 / (x * x + 1) * weight
answer = total / N
print(round(answer, 6))
```

数值接近 $\pi\approx3.141593$；中点取样也避开了 $t=1$ 对应的无穷远端。

### 实验 3（python）：用留数直接算

```python title="上半平面极点给出的 π"
import math

residue = 1 / (2 * 1j)
contour_value = 2 * math.pi * 1j * residue
print(round(contour_value.real, 6))
print(round(contour_value.imag, 6))
```

输出 `3.141593 0`。复数配额完全落在实轴积分上。

```quiz
用上半大半圆计算实积分时，哪些极点进入留数和？
- 上半平面内的极点 [*]
- 全部有限极点
- 只取实轴上的极点
? 围道只包住上半平面，所以只加上半平面内部极点的留数。
```

:::warning[常见误区]

**误区一**：你以为任何有理函数都能用半圆法。分母衰减不够时，大弧贡献不会消失。

**误区二**：你以为上下半平面留数都要加。围道选在上半平面就只加上半平面极点。

**误区三**：你以为实轴上的极点只是小麻烦。它们需要缩进小半圆并单独计入半留数。

:::

## 6. 练习

```exercise
# @title: 练习：计算 1/(x^2+4) 的全实轴积分
# @check: 1.571
# @hint: 奇点是 z=2i；留数为 1/(4i)，围道积分等于 pi/2。
import math

residue = 1 / (2 * 1j)       # 请改成 1/(z^2+4) 在 z=2i 的留数
integral = abs(2 * math.pi * 1j * residue)
print(round(integral, 3))
```

<details>
<summary>点开查看逐步解答</summary>

$f(z)=1/[(z-2i)(z+2i)]$。上半平面极点是 $2i$，留数为

$$\lim_{z\to2i}\frac1{z+2i}=\frac1{4i}.$$

因此

$$I=2\pi i\cdot\frac1{4i}=\frac{\pi}{2}\approx1.571.$$
</details>

## 7. 选读：Jordan 引理在说什么

<details>
<summary>选读 · 让指数帮忙压住大弧</summary>

若 $f$ 在上半大圆上随 $R\to\infty$ 一致地满足 $|f(z)|\to0$，且 $a>0$，则 $e^{iaz}$ 在上半大圆的上半段按

$$|e^{ia(R\cos t+iR\sin t)}|=e^{-aR\sin t}$$

衰减。即使弧长随 $R$ 增长，$\sin t$ 提供的指数压制仍能把弧积分推向零。这个引理是把 Fourier 型积分交给留数定理的关键通行证。
</details>

## 8. 下一站

复积分已经能算实积分；接下来把同一套复指数语言转向系统响应。Laplace 变换会把微分方程变成 $s$ 平面上的代数问题。

→ [Laplace 变换与 s 平面](./100-laplace-s-plane.md)
