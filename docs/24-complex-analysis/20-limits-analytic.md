---
title: 极限与解析
lesson_id: complex-analysis/limits-analytic
prereqs:
  - complex-analysis/complex-functions-maps
  - series/convergence
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
  - complex-limit
  - analytic-function
applications:
  - local-linearization
exits:
  - engineering
  - research
---

# 极限与解析

## 1. 开场钩子

实函数的极限只需要从左右两侧靠近一个点。复平面却有无穷多个方向：东边来、北边来、沿螺旋来。一个复极限要经得住所有方向的拷问；一旦通过，函数就会展现出异常整齐的结构。

## 2. 直觉解释

说 $f(z)\to L$，意思是：无论从哪个方向靠近 $z_0$，像点都靠近同一个 $L$。距离用复数模长度量：

$$\lvert f(z)-L\rvert < \varepsilon.$$

如果 $f$ 在 $z_0$ 的某个开邻域内处处可导，就说 $f$ 在 $z_0$ 解析。解析比实可导苛刻得多：它不是“有一条切线”，而是“局部像一台旋转伸缩机”。后面会看到：区域上的复可导已经足以推出积分刚性，甚至还能送出无穷可导。

## 3. 正式定义

复导数为

$$f'(z_0)=\lim_{h\to0}\frac{f(z_0+h)-f(z_0)}{h},\qquad h\in\mathbb C.$$

关键在于 $h$ 可以取任意复方向。若同一极限对所有方向相同，则称 $f$ 在 $z_0$ 复可导。若在包含 $z_0$ 的某个开圆盘内处处复可导，则称 $f$ 在 $z_0$ 解析。

| 名称 | 要求 | 直觉 |
| --- | --- | --- |
| 复极限 | 所有小圆邻域的像都落入目标小圆 | 方向无关 |
| 复可导 | 差商的方向无关极限存在 | 局部线性且无剪断 |
| 解析 | 邻域内处处复可导 | 一片区域都规整 |

## 4. 分步例题

检验 $f(z)=z^2$ 在任意点 $z_0$ 的导数。

1. 写差商：$\dfrac{(z_0+h)^2-z_0^2}{h}$；
2. 展开分子：$2z_0h+h^2$；
3. 除以 $h$：得到 $2z_0+h$；
4. 令 $h\to0$：极限为 $2z_0$，与方向无关；
5. 因此 $z^2$ 处处解析，且 $f'(z)=2z$。

反例也很有名：$f(z)=\bar z=x-iy$ 在原点附近不可复导。沿实方向 $h=t$，差商为 $1$；沿纯虚方向 $h=it$，差商为 $-1$。两个方向给出不同答案。

## 5. 动手实验

### 实验 1（viz）：先回顾“带子收紧”的语言

```viz
{
  "type": "epsilon-delta-probe",
  "title": "ε-δ 语言的一维预演",
  "expr": "(x^2-4)/(x-2)",
  "a": 2,
  "limit": 4,
  "epsilon": 0.5
}
```

绿色带是允许误差，橙色区间是需要控制的输入范围。复极限把这条水平带换成以 $L$ 为中心的圆盘，把输入区间换成挖掉中心的圆形邻域。

### 实验 2（python）：从多个方向逼近同一点

```python title="检验 (z^2-z)/(z-0) 在四个方向的趋势"
for n in range(1, 7):
    r = 1 / (2 ** n)          # 半径每次减半
    directions = [1, 1j, -1, -1j]
    errors = []
    for h in directions:
        z = r * h             # 从四个方向接近 0
        value = (z * z - z) / z
        errors.append(abs(value + 1))   # abs 是复数的模长
    print(f"r={round(r, 6)}, 四个方向误差={errors}")
```

半径越小，四行误差越接近 0，说明函数 $z-1$ 的候选极限 $-1$ 不挑方向。

### 实验 3（python）：共轭函数暴露方向裂缝

```python title="conjugate(z)/z 沿不同方向的差商"
z0 = 0
steps = [0.1, 0.01, 0.001]
for t in steps:
    hs = [t, t * 1j]
    quotients = []
    for h in hs:
        # complex(h) 把 h 明确当作复数处理；conjugate 返回共轭复数
        quotient = (complex(h).conjugate() - 0) / h
        quotients.append(round(quotient.real, 3))
    print(f"h={t}, 实方向与虚方向={quotients}")
```

输出始终是 `1` 与 `-1` 的对比。无论步长多小，方向裂缝都不会消失，所以共轭函数在原点不可复导。

:::warning[常见误区]

**误区一**：你以为实部和虚部分别连续就够了。复极限还要求两者以相同的速率靠近目标，方向之间不能打架。

**误区二**：你以为一点可导就是解析。解析要求该点周围整整一片区域都可导。

**误区三**：你以为复导数很难算。多项式形式上和实多项式一样求导；难的是判断哪些函数根本没有资格这样做。

:::

## 6. 练习

```exercise
# @title: 练习：找共轭差商的方向矛盾
# @check: 1.0
# @check: -1.0
# @hint: 沿实方向 h=t，conjugate(h)=t；沿虚方向 h=i*t，conjugate(h)=-i*t。
t = 0.001
h_real = 1j * t        # 这里故意用错方向，请改成实方向
q_real = h_real.conjugate() / h_real

h_imag = t             # 这里故意用错方向，请改成纯虚方向
q_imag = h_imag.conjugate() / h_imag
print(round(q_real.real, 1))
print(round(q_imag.real, 1))
```

<details>
<summary>点开查看逐步解答</summary>

令 $h=t$，则 $\bar h=h$，差商为 $1$。令 $h=it$，则 $\bar h=-it$，差商为 $-1$。

同一个点的复导数不可能既等于 1 又等于 -1，所以 $f(z)=\bar z$ 在原点不可复导。
</details>

## 7. 选读：为什么解析这么强

<details>
<summary>选读 · 局部机器的刚性</summary>

实可导只约束横向变化率；复可导同时约束东西、南北以及所有斜方向的变化率。Jacobian 若写成矩阵，就必须形如

$$\begin{pmatrix}a&-b\\ b&a\end{pmatrix},$$

这正是一个“旋转加均匀伸缩”矩阵。普通二维可微映射可以有剪切、压扁和各向异性拉伸；解析映射不允许这些自由度。这种刚性最终会推出 Cauchy 积分理论和唯一延拓。
</details>

## 8. 下一站

“所有方向一致”听起来抽象，但它可以翻译成两个偏导数方程。下一课请出 Cauchy-Riemann 方程，让解析性变成可检查的代数条件。

→ [Cauchy-Riemann 方程](./30-cauchy-riemann.md)
