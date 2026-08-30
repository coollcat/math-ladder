---
title: 二重积分换元：极坐标与雅可比
lesson_id: multivariable/change-variables
prereqs:
  - multivariable/double-integrals
  - multivariable/jacobian-chain
volume: 2
layer: L7
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - change-of-variables
  - polar-integration
applications:
  - coordinate-transforms
  - probability-density
exits:
  - engineering
  - data-ai
---

# 二重积分换元：极坐标与雅可比

## 1. 从一个场景开始

想在半径为 2 的圆盘上算总量，上一课的方格地砖却很别扭：贴着圆边的一圈地砖总有一角露在圆外、一角缺在圆内，边界歪歪扭扭，积分限写出来全是根号。

圆的问题该用圆的工具。极坐标地砖天生是扇形小块：内圈窄、外圈宽、沿半径排开，把圆盘拼得严丝合缝。可地砖一换尺寸，账本就得重记——新的"一块地砖多大"？答案藏着本课的主角：**雅可比行列式**（[Jacobian 课](./30-jacobian-chain.md)的面积放大率，在这里正式上岗）。

## 2. 直觉解释：地砖的尺寸变了

上一课的地砖是 $\Delta x \times \Delta y$。换到极坐标 $(r, \theta)$，一小块地砖是：

- 厚度 $\Delta r$（沿半径方向迈一小步）；
- 宽度是**一小段弧长** $r\,\Delta\theta$（转一小步，半径 $r$ 越大弧越长）。

所以一块地砖的面积是

$$\Delta A \approx r\,\Delta r\,\Delta\theta$$

多出来的那个 $r$ 不是凑数：内圈的地砖窄、外圈的地砖宽，$r$ 正是"这一圈地砖到底多宽"的记账员。直觉一句话：**换了地砖，就得按新地砖的实际尺寸重新记账**。

那任意换元呢？凡是从新坐标 $(u, v)$ 到旧坐标 $(x, y)$ 的映射，它把 $uv$ 平面上一小块 $du\,dv$ 地砖搬进 $xy$ 平面时，面积放大多少倍？[Jacobian 课](./30-jacobian-chain.md)已经给过答案：$|\det J|$。换元积分的全部秘密就这一句。

## 3. 正式定义

**二重积分换元公式**：设映射 $x = x(u,v)$，$y = y(u,v)$ 把 $uv$ 平面的区域 $D$ 一一映射到 $xy$ 平面的区域 $R$，则

$$\iint_R f(x,y)\,dx\,dy = \iint_D f\big(x(u,v),\,y(u,v)\big)\,\lvert \det J \rvert\, du\,dv$$

其中 $J$ 是映射的 Jacobian 矩阵，$\lvert \det J \rvert$ 是面积放大率。

**极坐标特例**：$x = r\cos\theta$，$y = r\sin\theta$。它的 Jacobian 亲手算一遍：

$$J = \begin{pmatrix} \cos\theta & -r\sin\theta \\ \sin\theta & r\cos\theta \end{pmatrix}, \qquad \det J = r\cos^2\theta + r\sin^2\theta = r$$

（$\cos^2\theta + \sin^2\theta = 1$——单位圆的恒等式在换元里顺手变现，放大率恰好是半径 $r$。）于是

$$dx\,dy = r\,dr\,d\theta$$

| 符号 | 名字 | 一句话解释 |
| --- | --- | --- |
| $\lvert \det J \rvert$ | 面积放大率 | 一小块 $du\,dv$ 搬到 $xy$ 平面后的真实面积 |
| $r\,dr\,d\theta$ | 极坐标面积元 | 内窄外宽的扇形地砖 |
| 一一映射 | 换元资格 | 地砖不许重叠、不许漏，Jacobian 在区域内不为 0 |

## 4. 分步例题

**例 1**：用极坐标算半径为 1 的圆盘面积。

1. 换地砖：$\Delta A = r\,dr\,d\theta$；区域：$r$ 从 0 到 1，$\theta$ 从 0 到 $2\pi$；
2. 列账：$\displaystyle\int_0^{2\pi}\!\!\int_0^1 r\,dr\,d\theta$；
3. 内层：$\displaystyle\int_0^1 r\,dr = \frac12$；
4. 外层：$2\pi \times \dfrac12 = \pi$——圆面积公式 $\pi r^2$ 在 $r=1$ 的样子，账目严丝合缝。

**例 2**（高光时刻）：算高斯积分 $I = \displaystyle\int_{-\infty}^{\infty} e^{-x^2}\,dx$。

一元的 $e^{-x^2}$ 没有初等原函数，直接硬积必败。高斯的妙招：先平方，升维到二维。

1. 记 $I^2 = \displaystyle\iint_{\mathbb{R}^2} e^{-(x^2+y^2)}\,dx\,dy$（把两个一元积分叠成二重积分）；
2. 换极坐标：$x^2 + y^2 = r^2$，地砖 $r\,dr\,d\theta$；
3. 拆账：$I^2 = \displaystyle\int_0^{2\pi}\!\!\int_0^{\infty} e^{-r^2}\,r\,dr\,d\theta = 2\pi \int_0^{\infty} e^{-r^2}\,r\,dr$；
4. 内层的 $r$ 是救兵：令 $u = r^2$，$du = 2r\,dr$，于是 $\displaystyle\int_0^{\infty} e^{-r^2}\,r\,dr = \frac12$；
5. 合账：$I^2 = 2\pi \times \dfrac12 = \pi$，所以 $I = \sqrt{\pi} \approx 1.7725$。

未归一化的钟形曲线 $e^{-x^2}$ 下的总面积是 $\sqrt{\pi}$（归一化之后的正态分布密度面积才是 1）——第 25 章测度论引用过这个结论，第 36 章概率的一切连续分布都站在它肩上，而它是极坐标地砖的功劳。

## 5. 动手实验

### 实验 1：极坐标网格变形机

```viz
{
  "type": "jacobian-grid",
  "title": "极坐标映射：r 是半径，theta 是角度",
  "fx": "u*cos(v)",
  "fy": "u*sin(v)",
  "point": [1.2, 0.8]
}
```

怎么玩：上图是 $uv$ 平面（横轴 $r$、纵轴 $\theta$），下图是映射出的 $xy$ 平面——整齐的方格被掰成了一圈圈同心圆与射线。拖动白点：读数里的 $\det J$ 恰好等于 $r$（横坐标）！半径拉到 2，放大率翻倍到 2——"外圈地砖更宽"在放大率读数上现形。

### 实验 2：极坐标黎曼和对账圆面积

```python title="扇形地砖拼出圆盘"
import math   # 圆周率 π 用

R = 1.0                    # 圆盘半径
nr = 200                   # 半径方向切 200 条
nth = 360                  # 角度方向切 360 份
dr = R / nr
dth = 2 * math.pi / nth
total = 0.0
for i in range(nr):                    # 扫过每条半径环
    r = (i + 0.5) * dr                 # 该环的中点半径（地砖的代表性宽度）
    for j in range(nth):               # 扫过每个角度
        total = total + r * dr * dth   # 一块扇形地砖：宽 r·dθ、厚 dr
print(round(total, 4))                 # 应该贴着 π
```

输出约 `3.1416`。试着把 `total = total + r * dr * dth` 里的 `r *` 删掉再跑——读数变成 $2\pi R$，和 $\pi$ 差了一倍：**忘乘 $r$ 是极坐标第一大坑**，地砖的真实宽度直接被抹掉了。

### 实验 3：高斯积分的数值对账

```python title="√π 从极坐标地砖里长出来"
import math

nr = 400                              # 半径切 400 条，扫到 R = 6
R = 6.0                               # e^(-36) 已小到万亿分之一，够远
dr = R / nr
radial = 0.0
for i in range(nr):
    r = (i + 0.5) * dr
    radial = radial + math.exp(-r * r) * r * dr   # ∫ e^(-r²) r dr 的黎曼和

area_2d = 2 * math.pi * radial        # 二维高斯积分：转一整圈
one_d = math.sqrt(area_2d)            # 高斯的倒推：一维积分 = √(二维)
print(f"∫e^(-r²) r dr ≈ {round(radial, 6)}（理论 0.5）")
print(f"二维积分 ≈ {round(area_2d, 6)}（理论 π = {round(math.pi, 6)}）")
print(f"一维高斯积分 ≈ {round(one_d, 6)}（理论 √π = {round(math.sqrt(math.pi), 6)}）")
```

怎么玩：三行读数环环相扣——内层 $\int_0^\infty e^{-r^2} r\,dr$ 收在 0.5（那个救兵 $r$ 让原函数变回了 $e^{-r^2}$ 自己），乘 $2\pi$ 得 $\pi$，开方即 $\sqrt{\pi}$。没有初等原函数的一元积分，被升维 + 换地砖两步拿下。

### 快问快答

```quiz
极坐标面积元里的 r 因子，几何意义是什么？
- 半径本身，抄进去保险
- 扇形地砖的弧长宽度 r·dθ 里的 r：内窄外宽的记账员 [*]
- 一个可以省略的修正项
? 换了地砖就要按新地砖的真实尺寸记账：厚度 dr、宽度 r·dθ。漏掉 r 等于把外圈地砖按内圈宽度结账，面积整体缩水。
```

::::warning[常见误区]

**误区一**："你以为换元就是把 $x$ 换成 $r\cos\theta$ 就完事。" $dx\,dy$ 也要跟着换成 $r\,dr\,d\theta$——被积函数和地砖尺寸必须一起换，漏掉 $r$ 的答案整体错一个因子。

**误区二**："你以为积分限不用动。" 换元后区域描述也换了语言：圆盘不再是 $0 \le x, y \le 2$，而是 $0 \le r \le 2$、$0 \le \theta \le 2\pi$。旧限配新坐标，算的是另一块区域。

**误区三**："你以为 $\det J$ 直接当面积用。" 方向翻面时 $\det J$ 为负，面积要取绝对值 $\lvert \det J \rvert$——Jacobian 课的老规矩在换元里原样生效。

::::

## 6. 练习

**练习 1**：用极坐标黎曼和算半径为 3 的圆盘面积（理论值 $9\pi \approx 28.274$）。下面的代码能跑但结果不对，改到通过：

```exercise
# @title: 练习：半径 3 的圆盘面积
# @check: 28.274
# @hint: 扇形地砖的面积是 r·dr·dθ——当前代码的地砖宽度没有乘 r，整片圆盘被按内圈宽度结了账
import math

R = 3.0
nr = 100
nth = 100
dr = R / nr
dth = 2 * math.pi / nth
total = 0.0
for i in range(nr):
    r = (i + 0.5) * dr
    for j in range(nth):
        total = total + dr * dth      # ← 地砖宽度少了 r
print(round(total, 3))
```

**练习 2**：用极坐标算 $\displaystyle\iint_{x^2+y^2 \le 4} (x^2 + y^2)\,dx\,dy$。

<details>
<summary>点开查看逐步解答</summary>

被积函数 $x^2 + y^2 = r^2$，区域是半径 2 的圆盘：

$$\int_0^{2\pi}\!\!\int_0^2 r^2 \cdot r\,dr\,d\theta = 2\pi \int_0^2 r^3\,dr = 2\pi \cdot \frac{2^4}{4} = 8\pi$$

两处关键：被积函数换语言（$x^2+y^2 \to r^2$）、地砖带 $r$。被积函数里藏着的 $r^2$ 与地砖的 $r$ 相乘，积分反而比直角坐标好算得多——"圆的问题用圆的工具"的完整示范。
</details>

**练习 3**：映射 $x = 2u$，$y = 3v$ 的 $\det J$ 是多少？它把单位正方形的地砖变成什么样？

<details>
<summary>点开查看逐步解答</summary>

$J = \begin{pmatrix} 2 & 0 \\ 0 & 3 \end{pmatrix}$，$\det J = 6$：单位正方形地砖被拉成 $2 \times 3$ 的长方形，面积放大 6 倍。所以 $\iint_R f(2u, 3v)\,du\,dv$ 这类账，换回 $xy$ 语言时要乘 $\lvert \det J \rvert = 6$。线性换元的放大率是常数，弯曲换元（如极坐标）的放大率逐点变化——这正是要带 Jacobian 逐点记账的原因。
</details>

## 7. 选读：换元公式为什么长这样

<details>
<summary>选读 · 微元账本的一阶展开</summary>

取 $uv$ 平面上以 $(u_0, v_0)$ 为角、边长 $du$、$dv$ 的小方块。映射 $F(u,v) = (x(u,v), y(u,v))$ 在这一点附近可用一阶展开近似（Jacobian 课选读的原话）：

$$F(u_0 + du, v_0 + dv) \approx F(u_0, v_0) + J_F\begin{pmatrix} du \\ dv \end{pmatrix}$$

也就是说，小方块被搬走后近似是一个**平行四边形**：两条边是 $J$ 的两列各自乘上 $du$、$dv$。它的面积 = 原面积 × $\lvert \det J_F \rvert$（第 11 章行列式的几何身份）。于是每块微元的贡献

$$f(x,y)\,dx\,dy \approx f\big(x(u,v), y(u,v)\big)\,\lvert \det J \rvert\,du\,dv$$

对小方块求和、取极限，换元公式成立。"映射搬地砖、Jacobian 记放大率"——一维换元里 $dx = \varphi'(t)\,dt$ 的那个 $\varphi'$，升维后正是 $\lvert \det J \rvert$，两代账本一脉相承。

</details>

## 8. 下一站

圆盘、扇形、高斯钟形——换元把"形状对不上"的积分一一驯服。下一课转向另一类主场：沿着曲线走、贴着边界算的**路径积分**，以及把内部与边界连成一家的 Green 定理。

→ [路径积分与 Green 定理](./60-green-path-integrals.md)
