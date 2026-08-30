---
title: Cauchy-Goursat 定理
lesson_id: complex-analysis/cauchy-goursat
prereqs:
  - complex-analysis/contour-integrals
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
  - cauchy-goursat-theorem
applications:
  - conservative-complex-fields
exits:
  - research
  - engineering
---

# Cauchy-Goursat 定理

## 1. 开场钩子

如果一片湖水里没有任何旋涡，小船绕任意闭合圈回到原地，风做的总功就是零。Cauchy-Goursat 定理把这句话翻译成复分析：解析函数在没有奇点的区域内绕闭路积分为零。

## 2. 直觉解释

若 $f$ 在单连通区域 $D$ 内解析，$C$ 是 $D$ 内一条正向简单闭曲线，则

$$\oint_C f(z)\,dz=0.$$

单连通可以暂时理解为“没有洞”。若有洞或奇点，结论可能失效；例如 $1/z$ 绕原点一周就不是零。这个例外很重要：下一课它反而会变成 Cauchy 积分公式的基本配额。

## 3. 正式定义

| 名称 | 条件 | 结论 |
| --- | --- | --- |
| 单连通区域 | 区域内没有洞 | 任一闭路可连续收缩成一点 |
| Cauchy-Goursat 定理 | $f$ 在区域内解析 | 沿区域内简单闭路的积分为零 |
| 原函数判据 | 若 $F'=f$ 且路径在同区域内 | $\int_C f\,dz=F(B)-F(A)$ |

Goursat 的关键贡献是证明：这里不需要先假设 $f'$ 连续。只要复导数在区域处处存在，结论已经成立。

## 4. 分步例题

计算 $\displaystyle\oint_{|z|=1} z^3\,dz$。

1. $f(z)=z^3$ 是整函数，在单位圆及其内部解析；
2. 单位圆盘是单连通区域；
3. 原函数为 $F(z)=z^4/4$；
4. 圆的起点和终点都是 $1$，所以积分等于 $F(1)-F(1)=0$；
5. 因此 Cauchy-Goursat 定理的条件和结论都得到验证。

## 5. 动手实验

### 实验 1（viz）：z³ 对应场的双零账本

```viz
{
  "type": "green-theorem",
  "title": "z^3 对应场的环流和通量都是零",
  "p": "x^3-3*x*y^2",
  "q": "-3*x^2*y+y^3",
  "radius": 1
}
```

拖动半径滑块。这里取 $p=u,\ q=-v$，因此环流对应复积分实部，通量对应虚部；两者都保持为零。

### 实验 2（python）：数值验证 z³ 的零积分

```python title="数值计算 z^2 沿单位圆一周"
import math

N = 1000
total_re = 0.0
total_im = 0.0
for k in range(N):
    t1 = 2 * math.pi * k / N
    t2 = 2 * math.pi * (k + 1) / N
    z1 = math.cos(t1) + 1j * math.sin(t1)
    dz = (math.cos(t2) - math.cos(t1)) + 1j * (math.sin(t2) - math.sin(t1))
    piece = z1 * z1 * z1 * dz
    total_re += piece.real     # += 是累加简写
    total_im += piece.imag
print(round(total_re, 4))
print(round(total_im, 4))
```

两个输出都接近 0。网格越细，越能看清闭合回路上没有净积累。

::::warning[常见误区]

**误区一**：你以为任何闭路积分为零都叫 Cauchy 定理。必须确认被积函数在围道所围区域及其边界上解析。

**误区二**：你以为“看起来没有奇点”就够。奇点可能藏在围道内部；必须检查区域本身。

**误区三**：你以为需要先证明导数连续才能用定理。Goursat 证明只需要复可导。

::::

## 6. 练习

```exercise
# @title: 练习：修复 z^3 的闭路积分
# @check: 0.0
# @check: 0.0
# @hint: 用原函数 F=z^4/4；闭合路径起点和终点相同，差值一定是多少？
z_end = 1 + 1j          # 请改回单位圆真正的终点
F_end = z_end ** 4 / 4
F_start = 1 / 4
print(round((F_end - F_start).real, 3))
print(round((F_end - F_start).imag, 3))
```

<details>
<summary>点开查看逐步解答</summary>

$F(z)=z^4/4$。单位圆的起点和终点都返回 $1$，所以

$$\oint_{|z|=1}z^3\,dz=F(1)-F(1)=0.$$

代码应写 `z_end = 1 + 0j`。
</details>

## 7. 选读：Goursat 为什么重要

<details>
<summary>选读 · 不假设导数连续也能成立</summary>

早期证明会要求 $f'$ 连续，然后使用 Green 定理。Goursat 证明了只需复可导即可分割三角形并压缩到一点；局部积分估计自动趋于零。这使“解析”这个看似脆弱的定义拥有惊人的刚性。
</details>

## 8. 下一站

零积分只是序章。下一课看 Cauchy 积分公式如何利用 $1/(z-z_0)$ 这个特殊例外，从边界值还原内部的函数值。

→ [Cauchy 积分公式](./65-cauchy-integral-formula.md)
