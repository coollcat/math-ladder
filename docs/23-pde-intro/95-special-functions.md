---
title: 特殊函数：Bessel 与 Legendre 从哪里冒出来
lesson_id: pde/special-functions
prereqs:
  - pde/separation-of-variables
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - bessel-equation
  - legendre-polynomial
  - orthogonal-polynomial-family
  - radial-orthogonality-weight
applications:
  - drum-vibration
  - spherical-harmonics
  - numerical-computation
exits:
  - engineering
  - scientific-computing
---

# 特殊函数：Bessel 与 Legendre 从哪里冒出来

## 1. 从一个场景开始

鼓手敲一下鼓面，听到的是"咚"的一声加一串泛音。把鼓面上一圈一圈的节线（俗称**克拉尼图形**）数出来会发现：这些泛音的频率比不是 $1:2:3:4$，第一个泛音约是基音的 **1.593** 倍——一个无理数。

上一课把方方正正的杆拆成 $\sin$ 与 $\exp$ 的乘积就完事了。鼓面是圆的，坐标一换成极坐标，分离变量后剩下的那个常微分方程**不再是 $y''+\lambda y=0$**，它的解没有初等表达式，于是数学界只好给它起个名字：**Bessel 函数**。球面上更麻烦，出来的是 **Legendre 多项式**。本课回答两件事：它们**从哪里冒出来**、为什么它们照样铺成了正交、完备的一套"坐标轴"。

## 2. 直觉解释

第 85 课的 Sturm-Liouville 定理说：**只要方程能写成自伴形式、再配上两端夹持，就会出现一族带权正交、完备的本征函数。** 这句话不挑方程长相——正弦是其中最好算的一种，圆域和球域只是换了一副面孔。

```text
区域形状  ──分离变量──▶  剩下的径向/角度方程  ──边界夹持──▶  本征函数族
  矩形           x'' + λx = 0                          sin(nπx/L)
  圆盘           r²R'' + rR' + (λr² − n²)R = 0          J_n（Bessel）
  球面           (1−x²)P'' − 2xP' + n(n+1)P = 0         P_n（Legendre）
```

关键差别只有一处：**边界条件挂在哪个变量上**。圆盘的外边界是 $r=a$ 一圈，所以是半径这个方向在"夹持"；夹持条件 $R(a)=0$ 不能对任意 $\lambda$ 成立，只能对一串由 Bessel 零点标号的 $\lambda$ 成立——**零点表就是圆域版的"$n\pi/L$"**。

第二个直觉：这些函数都是**正交多项式/正交函数族**的成员，家族不同但规矩一样——乘上各自的权函数积分，不同成员之间积分为零。我们不是要背一张函数表，而是要把"正弦正交"这一条推广成"带权正交"这一套通用语法。

## 3. 正式定义

**圆域径向方程**。设圆盘半径 $a$，分离变量后令 $s=\lambda r$，径向方程化成 **$n$ 阶 Bessel 方程**：

$$s^2J''+sJ'+(s^2-n^2)J=0,\qquad J_n(s)=\frac{1}{\pi}\int_0^{\pi}\cos\big(n\tau-s\sin\tau\big)\,d\tau .$$

右端的积分表达式（泊松积分）是它的"出生证明"：直接来自圆周上的相位叠加，$n$ 必须是整数才单值，$s$ 就是上面的自变量。

**球域角度方程**。令 $x=\cos\theta$，得 **Legendre 方程**：

$$(1-x^2)P''-2xP'+n(n+1)P=0,\qquad x\in[-1,1].$$

$n$ 取非负整数时解退化为多项式 $P_n$，递推式为：

$$(n+1)P_{n+1}(x)=(2n+1)xP_n(x)-nP_{n-1}(x),\quad P_0=1,\ P_1=x .$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $J_n(s)$ | $n$ 阶 Bessel 函数 | 圆盘径向解，递推性的第一个零点为振荡性提供"边界筛子" |
| $j_{n,m}$ | Bessel 零点 | $J_n(j_{n,m})=0$，$m$ 号为第几个零点；本征值 $\lambda_{n,m}=j_{n,m}/a$ |
| $P_n(x)$ | Legendre 多项式 | 球面角度解，$n$ 次多项式，奇偶性与 $n$ 一致 |
| $w$ | 权函数 | 正交积分里的权重：Legendre 的 $w\equiv1$，Bessel 径向的 $w(r)=r$ |

两条正交关系是本课的全部家底：

$$\int_{-1}^{1}P_m(x)P_n(x)\,dx=0\ (m\neq n),\qquad \int_{-1}^{1}P_n^2\,dx=\frac{2}{2n+1},$$

$$\int_0^a J_n\!\Big(\frac{j_{n,m}r}{a}\Big)J_n\!\Big(\frac{j_{n,k}r}{a}\Big)r\,dr=0\ (m\neq k).$$

注意第二式里那个 $r$：它正是径向方程的权函数，**极坐标的面积元 $r\,dr\,d\theta$ 自带一个 $r$**。忘掉它，正交性立刻"看起来失效"。

## 4. 分步例题

**例 1**：从 $u_{tt}=c^2\Delta u$ 到 Bessel 方程，只需三步。

1. 极坐标下 $\Delta u=u_{rr}+\frac1r u_r+\frac{1}{r^2}u_{\theta\theta}$，设 $u=R(r)\Theta(\theta)T(t)$：先分出时间方程 $T''+c^2\lambda^2T=0$ 与角度方程 $\Theta''+n^2\Theta=0$（周期性把 $n$ 筛成整数）；
2. 剩下的径向方程 $r^2R''+rR'+(k^2r^2-n^2)R=0$，$k^2=\lambda^2$ 是分离常数；
3. 换变量 $s=kr$ 归一化，得到标准形 $s^2J''+sJ'+(s^2-n^2)J=0$——**没有哪一步是技巧，全是把变量归位**。

**例 2**：算鼓膜的前三个泛音比。用标准零点表 $j_{0,1}=2.4048$、$j_{1,1}=3.8317$、$j_{2,1}=5.1356$、$j_{3,1}=6.3802$。

1. 频率 $\propto$ 本征值 $j_{n,m}/a$，基音取 $j_{0,1}$；
2. 比值：$3.8317/2.4048\approx1.593$，$5.1356/2.4048\approx2.136$，$6.3802/2.4048\approx2.653$；
3. 结论：**泛音比不是整数比**（对比弦的 $2,3,4$），所以鼓声听起来"没有音高"——它不是不和谐，是根本没有基频谐波结构。

**例 3**：验算 $\int_{-1}^{1}P_1P_2\,dx=0$。由递推式 $P_2=(3x^2-1)/2$：被积函数 $x\cdot(3x^2-1)/2=(3x^3-x)/2$ 是奇函数，区间 $[-1,1]$ 关于原点对称，故积分为零 ✓。换成 $P_2$ 与它自己：$\int_{-1}^1\frac{(3x^2-1)^2}{4}dx=\frac{2}{5}=0.4$，正是 $\frac{2}{2n+1}\big|_{n=2}$。

## 5. 动手实验

### 实验 1：Bessel 函数长什么样

```viz
{
  "type": "plot",
  "title": "J_n 的渐近形：振幅按 1/√x 衰减的振荡",
  "expr": "sqrt(2/(pi*n*x))*cos(x - n*pi/2 - pi/4)",
  "xmin": 1, "xmax": 20,
  "sliders": [
    { "name": "n", "min": 1, "max": 3, "step": 1, "value": 1 }
  ]
}
```

这里画的是 $J_n(x)\approx\sqrt{\dfrac{2}{\pi x}}\cos\left(x-\dfrac{n\pi}{2}-\dfrac{\pi}{4}\right)$（大自变量渐近式）。拖 $n$：曲线整体右移，因为阶数越高振荡越"晚"才开始。看零点——**不等间隔**，这正是鼓膜泛音不成整数比的根源。

### 实验 2：Legendre 多项式的生成函数

```viz
{
  "type": "plot",
  "title": "生成函数 1/√(1−2xt+t²)：t 越小越接近 P₁",
  "expr": "1/sqrt(1 - 2*x*t + t^2)",
  "xmin": -0.95, "xmax": 0.95,
  "sliders": [
    { "name": "t", "min": 0.1, "max": 0.9, "step": 0.1, "value": 0.4 }
  ]
}
```

$\dfrac{1}{\sqrt{1-2xt+t^2}}=\sum_n P_n(x)t^n$：把 $t$ 拖小，曲线越来越像直线 $P_1=x$；拖大则 $P_2,P_3$ 的高次项开始说话。**一整族 Legendre 多项式被挤进了一个初等表达式**，这是它们的"出生证明"。

### 实验 3：泊松积分算出 Bessel 与其零点

```python
import math                                   # 标准数学库

def bessel(n, x, N=400):                      # def 定义函数：泊松积分算 J_n(x)
    s, h = 0.0, math.pi / N                   # math.pi 是圆周率，h 是每段宽度
    for k in range(N):                        # range(N)：0..N-1
        t = (k + 0.5) * h                     # 取每段中点
        s += math.cos(n * t - x * math.sin(t))   # math.cos/math.sin：余弦与正弦
    return s / N                              # s*h/π 化简后就是 s/N

def first_zero(n, step=0.001):                # 找 J_n 的第一个正零点
    prev, x = bessel(n, 0.05), 0.05           # 起点与上一格的值
    for k in range(1, 8000):                  # 最多扫到 8.05
        x = 0.05 + k * step
        if prev * bessel(n, x) < 0:           # 相邻两格变号 → 中间必有零点
            return round(x, 3)                # round(x, 3)：保留三位小数
        prev = bessel(n, x)
    return None

print(round(bessel(0, 1), 4))                 # J_0(1)
z0, z1, z2 = first_zero(0), first_zero(1), first_zero(2)
print(z0, z1, z2)                             # 前三个零点
print(round(z1 / z0, 3), round(z2 / z0, 3))   # 与基音的比值
```

输出 `0.7652`、`2.405 3.832 5.136`、`1.593 2.136`。手算的零点表和数值扫描互相印证：$j_{1,1}/j_{0,1}\approx1.593$ **不是有理数**，鼓膜泛音当然不成整数比。整段代码只用正弦余弦加一个积分——**特殊函数不必"特殊地"算，它就是一个积分。**

### 实验 4：正交多项式家族总表

换家族只是换题面：区间、权函数、来历三样一起换，规矩（带权正交 + 完备）分毫不变。

| 家族 | 区间 | 权函数 $w$ | 来自哪个问题 |
| --- | --- | --- | --- |
| Legendre $P_n$ | $[-1,1]$ | $1$ | 球坐标分离变量 |
| Chebyshev $T_n$ | $[-1,1]$ | $1/\sqrt{1-x^2}$ | 最佳一致逼近、谱方法 |
| Laguerre $L_n$ | $[0,\infty)$ | $e^{-x}$ | 氢原子径向方程 |
| Hermite $H_n$ | $(-\infty,\infty)$ | $e^{-x^2}$ | 谐振子、量子力学 |
| Bessel $J_n$ | $[0,a]$ | $r$ | 圆盘/圆柱坐标 |

每族的归一化常数也有一条统一公式（Legendre 是 $\frac{2}{2n+1}$，练习里要把它算出来）。

## 6. 练习

下面这段代码想交付 Legendre 递推、$P_2$ 的归一化常数，以及 $P_1$ 与 $P_2$ 的正交积分。递推系数抄错了一个，导致整个函数族都算错。

```exercise
# @title: 练习：Legendre 递推与正交性检验
# @check: -0.125
# @check: 0.4
# @check: 0.0
# @hint: 递推式是 (k+1)P_{k+1} = (2k+1)xP_k − kP_{k−1}，系数是 2k+1 不是 2k−1；归一化常数应为 2/(2n+1) = 0.4。
import math

def legendre(n, x):
    if n == 0:
        return 1.0
    p0, p1 = 1.0, x
    for k in range(1, n):
        p2 = ((2 * k - 1) * x * p1 - k * p0) / (k + 1)   # ← 有错：系数应是 2*k+1
        p0, p1 = p1, p2
    return p1

print(round(legendre(2, 0.5), 3))

steps = 4000
h = 2.0 / steps
nrm = 0.0
orth = 0.0
for k in range(steps):
    x = -1.0 + (k + 0.5) * h
    nrm += legendre(2, x) ** 2
    orth += legendre(1, x) * legendre(2, x)
nrm *= h
orth *= h
print(round(nrm, 3))
print(round(abs(orth), 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正版只改一个字符——系数 $2k-1$ 换回 $2k+1$：

```python
def legendre(n, x):
    if n == 0:
        return 1.0
    p0, p1 = 1.0, x
    for k in range(1, n):
        p2 = ((2 * k + 1) * x * p1 - k * p0) / (k + 1)
        p0, p1 = p1, p2
    return p1

print(round(legendre(2, 0.5), 3))       # -0.125

steps, h = 4000, 2.0 / 4000
nrm = orth = 0.0
for k in range(steps):
    x = -1.0 + (k + 0.5) * h
    nrm += legendre(2, x) ** 2
    orth += legendre(1, x) * legendre(2, x)
print(round(nrm * h, 3))                # 0.4 = 2/5
print(round(abs(orth * h), 3))          # 0.0：P₁ ⊥ P₂
```

```text
P₀ = 1                P₁ = x                P₂ = (3x² − 1)/2
P₂(0.5) = (0.75 − 1)/2 = −0.125
∫₋₁¹ P₂² dx = 2/(2·2+1) = 2/5 = 0.4
∫₋₁¹ P₁P₂ dx = 0        ← P₁P₂ = (3x³ − x)/2 是奇函数
```

错版把系数取成 $2k-1$，递推出来的是 $\frac{x^2-1}{2}$：它在 $x=0.5$ 处给 $-0.375$、平方积分给 $0.267$，正交积分却**照样是零**（两个错版都是奇函数）。这提醒一件事：**一条检查项通过不等于整套推导正确**，所以这类课要同时验"值"与"范数"两条线。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为特殊函数是数学家凭兴趣编出来的新玩艺。它们是**特定几何形状下的必然产物**：圆盘必然筛出 Bessel，球面必然筛出 Legendre。换个区域，函数族就换，但"边值筛选 + 带权正交"这套机制一路不变。

**误区二**：你以为 Bessel 函数的零点也有"整数间隔"的规律。零点表 $2.4048,5.5201,8.6537,\dots$ 的间隔越来越大、比值 $5.5201/2.4048\approx2.296$ 不是整数——**鼓膜泛音不成整数比**是零点表的直接后果，不是耳朵的错觉。

**误区三**：你以为正交性里的权函数可以随手丢掉。圆盘径向的正交积分必须带 $r$（它来自极坐标面积元），球面角度积分必须带那一段 $d\theta$ 换 $dx$ 的因子；漏掉权函数会把本来为零的积分算成非零，让人误以为"这族函数不正交"。

:::

## 8. 快问快答

```quiz
圆盘上振动问题的本征值由什么决定？
- Bessel 函数在圆盘边缘处的零点表 [*]
- 圆周长的整数倍
- 圆盘面积与密度的比值
? 边界条件 R(a)=0 要求 J_n(λa)=0，于是本征值被零点表 j_{n,m}/a 标号——这正是圆域版的 nπ/L。
```

```quiz
Legendre 多项式的正交积分里，权函数是什么？
- 常数 1，因为角度变量换成 x=cosθ 后权重恰好被吸收 [*]
- x，因为球面面积元带一个 x
- 1/(1−x²)，因为方程里有这个系数
? ∫₋₁¹ P_m P_n dx = 0（m≠n）、∫P_n² = 2/(2n+1)：权是常数 1；带 1/(1−x²) 的是 Chebyshev 家族。
```

## 9. 选读：为什么圆域的权是 r

<details>
<summary>选读 · 权函数是坐标准则，不是人为规定</summary>

把 $J_n$ 满足的方程写成自伴形式，权函数自动现身。Bessel 方程两边同除 $s$：

$$\big(sJ'\big)'+\Big(s-\frac{n^2}{s}\Big)J=0 .$$

写成 $-(pJ')'+qJ=\lambda wJ$ 的形状，取 $p(s)=s$、$q(s)=n^2/s$、$w(s)=s$。按第 85 课的一般结论，正交口径必然是 $\int w\,J_mJ_k\,ds=\int s\,J_mJ_k\,ds$。**所以权不是我们选的，是方程自己写在 $p$ 里的**；回到物理变量 $r$，那个 $s$ 就是 $r$。

同样的动作对 Legendre 方程做：$(1-x^2)P''-2xP'+n(n+1)P=0$ 恰可写成 $\big((1-x^2)P'\big)'+n(n+1)P=0$，对照标准形得 $p=1-x^2$、$q=0$、$w=1$。权等于 $1$ 是因为 $x=\cos\theta$ 这一步换元把 $\sin\theta$ 因子吸收掉了。

一条通用配方：**方程的 $p(x)$ 就是权函数**。这也解释了为什么特殊函数总是成"家族"出现——$p$ 的零点（Legendre 的 $x=\pm1$、Laguerre 的 $0$、Hermite 的无穷远）决定了自伴性与奇异边界处理，同一类奇异点对应同一个家族。数值上不必自己造轮子（NumPy 的 `jv`、`eval_legendre` 就是本节两个递推与积分的工程实现），自己写一遍是为了摸清它们的性格：振荡、衰减、零点位置。

</details>

## 10. 下一站

现在我们有了矩形（正弦）、圆盘（Bessel）、球面（Legendre）三套现成的模态花名册，只要形状是这三种之一，分离变量就能一路走通。可要是形状任意——飞机机翼的截面、发动机支架、心形的鼓——坐标法就直接熄火了。

下一站：[Fourier 合成：把任意初值拆成模态](./110-fourier-pde-synthesis.md) 先解决"给定初值怎么分配到各个模态上"；接着 [Laplace 与 Poisson](./120-laplace-poisson.md) 处理稳态；而对付任意形状的通用武器，在 [有限元入门](./135-fem-1d.md) 里开工。
