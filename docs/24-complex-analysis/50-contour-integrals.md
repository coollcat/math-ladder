---
title: 围道积分
lesson_id: complex-analysis/contour-integrals
prereqs:
  - complex-analysis/power-series
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
  - contour-integral
applications:
  - work-around-obstacle
exits:
  - engineering
  - research
---

# 围道积分

## 1. 开场钩子

在实积分里，你只能从左走到右。复平面允许绕路：直线、圆弧、多边形都可以成为道路。于是自然出现一个关键问题——换一条路，积分值会不会变？对解析函数，答案出奇地干净。

## 2. 直觉解释

把路径 $C$ 参数化为 $z(t)=x(t)+iy(t)$，一小段位移是 $dz=z'(t)\,dt$。复积分就是把乘积 $f(z)\,dz$ 沿路径累加：

$$\int_C f(z)\,dz=\int_a^b f(z(t))z'(t)\,dt.$$

结果一般是复数。可以把 $f=u+iv$ 展开，得到两个实路径积分的组合：

$$\int_C f\,dz=\int_C(u\,dx-v\,dy)+i\int_C(v\,dx+u\,dy).$$

所以围道积分同时记录两本功账。

## 3. 正式定义

设 $C:[a,b]\to\mathbb C$ 是分段光滑曲线，$f$ 在其附近连续。则

$$\oint_C f(z)\,dz=\int_a^b f(C(t))C'(t)\,dt,$$

其中圆圈记号表示闭路径。反向路径使结果变号：

$$\int_{-C}f\,dz=-\int_C f\,dz.$$

若区域内存在原函数 $F$ 且 $C$ 从 $A$ 到 $B$，则积分为 $F(B)-F(A)$，与具体路线无关。

## 4. 分步例题

沿单位圆逆时针一周计算 $\oint z^2\,dz$。

1. 参数化 $z=e^{it}$，其中 $t$ 从 0 到 $2\pi$；
2. 微分得 $dz=ie^{it}\,dt$；
3. 被积表达式变成 $e^{2it}ie^{it}=ie^{3it}$；
4. 积分 $\displaystyle i\int_0^{2\pi}e^{3it}\,dt=0$；
5. 也可以用原函数 $z^3/3$：起点和终点相同，差值为零。

这说明没有奇点的整函数绕闭合回路不留下净额。

## 5. 动手实验

### 实验 1（viz）：路径形状如何改变实功

```viz
{
  "type": "path-integral",
  "title": "同一场中不同路径的功",
  "p": "-y",
  "q": "x",
  "kind": "line",
  "end": 1
}
```

切换直线与弧线，观察读数变化。这个向量场有旋涡，所以路径重要。解析复积分的“无旋无散”条件会让许多路径变得可互换。

### 实验 2（viz）：解析场绕闭合圈的零环流

```viz
{
  "type": "green-theorem",
  "title": "z^2 对应场的环流和通量都是零",
  "p": "x^2-y^2",
  "q": "-2*x*y",
  "radius": 1
}
```

拖动半径。这里取 $p=u,\ q=-v$，因此环流对应复积分实部，通量对应虚部；两者都保持为零。

> 环流在这里只需按“沿边界切线累加”理解；Green 公式后面会在多元微积分里正式登场。

### 实验 3（python）：数值验证单位圆上的零积分

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
    piece = z1 * z1 * dz
    total_re += piece.real     # += 是累加简写
    total_im += piece.imag
print(round(total_re, 4))
print(round(total_im, 4))
```

两个输出都接近 0。网格越细，越能看清闭合回路上没有净积累。

:::warning[常见误区]

**误区一**：你以为复积分就是弧长积分。弧长积分加的是长度，围道积分加的是带方向的复数微元。

**误区二**：你以为所有路径积分都可互换。只有被积函数在两路围成的区域内解析时才可靠。

**误区三**：你以为结果为复数就说明算错。复数结果包含实部和虚部两本账。

:::

## 6. 练习

```exercise
# @title: 练习：修复线段上的 z 积分
# @check: 0.0
# @check: 1.0
# @hint: 从 0 到 1+i 时，参数化 z=t(1+i)，dz=(1+i)dt；也可以用原函数 z^2/2。
t_end = 1.0
z_end = 0 + 1j * t_end       # 请改成终点 1+i
F = z_end * z_end / 2
print(round(F.real, 3))
print(round(F.imag, 3))
```

<details>
<summary>点开查看逐步解答</summary>

取 $z(t)=t(1+i)$，$0\le t\le1$，则 $\displaystyle\int_0^1 z\,dz=\left[z^2/2\right]_0^{1+i}=i$。

所以正确输出是实部 `0.000`、虚部 `1.000`。把终点改成 `z_end = 1 + 1j * t_end` 即可通过。
</details>

## 7. 选读：为什么需要分段光滑

<details>
<summary>选读 · 允许拐弯，不允许撕裂</summary>

工程中的围道常由直线段和圆弧拼接。拼接处导数可能跳变，但只要分成有限段、每段都有方向且长度有限，就可以逐段积分再相加。若路径无限折返或长度爆炸，就需要更精细的可求长曲线理论。
</details>

## 8. 下一站

零积分只是序章。下一课 Cauchy-Goursat 定理会告诉我们它在什么条件下必然成立；再下一课的 Cauchy 公式则会进一步说：只要知道边界上的值，就能还原内部的函数值。

→ [Cauchy-Goursat 定理](./60-cauchy-theorem.md)
