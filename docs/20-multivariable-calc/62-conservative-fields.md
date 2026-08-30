---
title: 保守场与势函数
lesson_id: multivariable/conservative-fields
prereqs:
  - multivariable/green-path-integrals
  - multivariable/partial-gradient
volume: 2
layer: L7
track:
  - analysis-change
  - geometry-space
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - conservative-field
  - potential-function
  - path-independence
applications:
  - gravitational-field
  - energy-conservation
exits:
  - engineering
  - research
---

# 保守场与势函数

## 1. 从一个场景开始

山脚到山顶的亭子有两条路：缓坡盘山道和陡峭石阶。走哪条，**爬升的高度都一样**——海拔只认起点和终点，不认你绕了多少弯。可换个场景就不同了：在沙滩上拖一箱行李走两条不同路线，沙子上蹭掉的力气全看走多远，绕远路就是更累。

力场也分这两种脾气。有的场像山（走法无关，只看端点），有的场像沙滩（走法决定代价）。上一课 Green 定理留了伏笔：旋度为零**只是起点**，是保守的必要不充分条件。这一课把"像山的场"请上正席——它叫**保守场**，而且它有一张隐藏的"海拔图"。

## 2. 直觉解释

想象一个场 $\vec F$ 背后藏着一张海拔图 $\phi$（一个普通的二元函数，等高线图画过的那种），而 $\vec F$ 处处指向海拔下降最快的方向、大小正好是坡度——这就是第 20 课说过的梯度：$\vec F=\nabla\phi$。这样的场沿任何路径做的功，其实就是"海拔下降了多少"：

$$\text{功}=\phi(\text{起点})-\phi(\text{终点})$$

起点终点一锁，功就锁死——走缓坡还是石阶毫无区别。绕闭合路径一圈回到原地，海拔差为零，**净功恒为零**：山不欠你任何东西。反观上一课的旋涡场 $(-y, x)$，单位圆一周环流 $2\pi$，绕圈就在凭空做功——它背后根本没有那张海拔图。

"保守"这个名字来自物理：重力场是保守场，物体绕一周重力不做净功，机械能才能**守恒**。"保守"者，"守恒"也。

## 3. 正式定义

若存在可微函数 $\phi(x,y)$ 使得

$$\vec F=\nabla\phi,\qquad \text{即}\quad P=\frac{\partial\phi}{\partial x},\ \ Q=\frac{\partial\phi}{\partial y}$$

则称 $\vec F$ 为**保守场**，$\phi$ 为它的**势函数**。此时路径积分只依赖端点（**路径无关**）：

$$\int_A^B \vec F\cdot d\vec r=\phi(B)-\phi(A)$$

这条公式叫**线积分基本定理**——把定积分基本定理（原函数值相减）原样搬到了二维。

**判据**：在**单连通**区域（没有洞）上，$\vec F$ 保守 $\iff$

$$\frac{\partial Q}{\partial x}=\frac{\partial P}{\partial y}$$

这正是上一课 Green 定理里旋度表达式 $\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}$ 归零。上一课选读说的"有洞的例外"这里要记牢：区域有洞时，零旋度不再保证保守。

## 4. 分步例题

**例**：场 $\vec F=(y, x)$。它保守吗？若保守，求从 $(0,0)$ 到 $(2,3)$ 的功。

1. **验判据**：$\frac{\partial Q}{\partial x}=\frac{\partial}{\partial x}(x)=1$，$\frac{\partial P}{\partial y}=\frac{\partial}{\partial y}(y)=1$，相等 ✓（全平面无洞）；
2. **凑势函数**：由 $\frac{\partial\phi}{\partial x}=y$，对 $x$ 积分得 $\phi=xy+g(y)$——积分常数允许是 $y$ 的函数 $g(y)$，因为它对 $x$ 求导时消无；
3. **定积分常数**：代回第二个条件 $\frac{\partial\phi}{\partial y}=x+g'(y)=x$，得 $g'(y)=0$，取 $g=0$。势函数 $\phi=xy$；
4. **一步算功**：$\phi(2,3)-\phi(0,0)=6-0=6$。

不必走任何一条具体路径，答案已经封死。对照上一课的旋涡场 $(-y,x)$：判据给出 $1-(-1)=2\neq 0$，判据当场否决——**没有势函数，就永远逃不掉"算路径"的命运**。

## 5. 动手实验

### 实验 1（viz）：换一个场，路径不再使坏

```viz
{
  "type": "path-integral",
  "title": "场 F=(y,x)：直线与弧线，功相同",
  "p": "y",
  "q": "x",
  "kind": "line",
  "end": 2
}
```

怎么玩：上一课的老组件，只是把场从 $(-y,x)$ 换成了 $(y,x)$。切换直线和弧线、试试反向路径——功的读数**纹丝不动**，这就是路径无关的现场目击。再想想例题：$(y,x)$ 的势函数是 $xy$，端点 $(-1,0)$、$(1,0)$ 处 $xy$ 都是 $0$，所以怎么走都是 $0-0=0$。

### 实验 2（viz）：闭路环流恒为零

```viz
{
  "type": "green-theorem",
  "title": "保守场的闭路环流",
  "p": "y",
  "q": "x",
  "radius": 1.2
}
```

拖动半径：环流读数**始终是零**——绕任何圈回原点，海拔差为零。对照上一课 $(-y,x)$ 的 $2\pi r^2$：一个有海拔图的场，Green 定理右边的旋度密度本来就是 $0$。

### 实验 3（python）：两条路径 + 一步公式，三方对账

```python title="直线、折线、势函数公式：三个答案必须一致"
n = 1000                        # 每条路径切成多少小段
straight = 0.0                  # 直线路径 (0,0)→(2,3)：(2t, 3t)
for k in range(n):              # 逐段累加 F·dr，场 F=(y, x)
    t1 = k / n
    t2 = (k + 1) / n
    x1, y1 = 2 * t1, 3 * t1     # 小段起点
    x2, y2 = 2 * t2, 3 * t2     # 小段终点
    straight = straight + y1 * (x2 - x1) + x1 * (y2 - y1)   # P·dx + Q·dy

broken = 0.0                    # 折线路径：(0,0)→(2,0)→(2,3)
for k in range(n):              # 第一段：沿 x 走，y=0、dy=0
    x1 = 2 * k / n
    x2 = 2 * (k + 1) / n
    broken = broken + 0 * (x2 - x1)         # y=0 时 P=y=0，这项白送
for k in range(n):              # 第二段：沿 y 走，x=2、dx=0
    y1 = 3 * k / n
    y2 = 3 * (k + 1) / n
    broken = broken + 2 * (y2 - y1)         # Q=x=2，乘上高度增量

formula = 2 * 3 - 0 * 0         # 线积分基本定理：φ(2,3) − φ(0,0)，φ=xy
print(round(straight, 3))
print(round(broken, 3))
print(round(formula, 3))
```

三行都是 $6.0$。直线路径、拐直角的折线路径、还有连路径都不碰的势函数公式——三方对账一致，路径无关不是数学家的客气话，是可以拿计算器验的硬承诺。

## 6. 常见误区

:::warning[常见误区]

**误区一**："你以为零旋度就万事大吉。" 判据 $\frac{\partial Q}{\partial x}=\frac{\partial P}{\partial y}$ 的生效范围是**单连通区域**。上一课选读的警告在此兑现：$F=\left(\frac{-y}{x^2+y^2},\frac{x}{x^2+y^2}\right)$ 在全平面（去掉原点这个"洞"）处处满足判据，但绕原点一周环流是 $2\pi$——洞里藏着一个旋涡，等高线图拼不拢。判据之前，先看地形。

**误区二**："你以为凑势函数时积分常数只能是数字。" 由 $\frac{\partial\phi}{\partial x}=y$ 积分，"常数"是任何**不依赖 $x$** 的东西，即某个函数 $g(y)$。它由第二个偏导条件审讯定罪——忘掉 $g(y)$ 是凑势函数的头号翻车点。

**误区三**："你以为验了一个偏导就算过关。" $\vec F=\nabla\phi$ 是**两个**合同条款（$P=\phi_x$ 且 $Q=\phi_y$），凑出来的候选 $\phi$ 必须两条全过。练习里那个冒牌势函数就倒在第二条上。

:::

## 7. 练习

**练习 1**：场 $\vec F=(2xy,\ x^2)$。求从原点到 $(2,3)$ 的功——不许算路径，请出势函数。下面的代码猜了个答案，先验偏导再改：

```exercise
# @title: 练习：请出势函数，一步算功
# @check: 12.0
# @hint: 候选 φ=x²+y² 要过两关：φ 对 x 的偏导 = 2xy 吗？φ 对 y 的偏导 = x² 吗？两关全过才是真势函数。
x1 = 2.0
y1 = 3.0                        # 终点 (2, 3)，起点是原点

phi = x1 ** 2 + y1 ** 2         # ← 猜的势函数？先验：它的两个偏导配得上 F 吗
work = phi - 0.0
print(round(work, 1))
```

先验判据：$\frac{\partial Q}{\partial x}$ 对第二个分量 $x^2$ 求 $x$ 导，得 $2x$；$\frac{\partial P}{\partial y}$ 对第一个分量 $2xy$ 求 $y$ 导，得 $2x$——相等 ✓，全平面单连通，保守。凑势函数：由 $\frac{\partial\phi}{\partial x}=2xy$ 得 $\phi=x^2y+g(y)$；代回 $\frac{\partial\phi}{\partial y}=x^2+g'(y)=x^2$ 得 $g=0$。真势函数 $\phi=x^2y$，功 $=\phi(2,3)-0=12$。猜的 $x^2+y^2$ 倒在第二关：它对 $y$ 的偏导是 $2y$，不是 $x^2$。

<details>
<summary>点开查看逐步解答</summary>

1. 验判据：$\frac{\partial Q}{\partial x}=\frac{\partial}{\partial x}(x^2)=2x$；$\frac{\partial P}{\partial y}=\frac{\partial}{\partial y}(2xy)=2x$。相等，全平面单连通 → 保守 ✓；
2. 凑势函数：$\frac{\partial\phi}{\partial x}=2xy \Rightarrow \phi=x^2y+g(y)$；
3. 审讯：$\frac{\partial\phi}{\partial y}=x^2+g'(y)=x^2 \Rightarrow g'(y)=0$，取 $\phi=x^2y$；
4. 线积分基本定理：$\int_A^B=\phi(2,3)-\phi(0,0)=4\times 3-0=12$。

复核练习代码：把 `phi = x1 ** 2 + y1 ** 2` 改成 `phi = x1 ** 2 * y1`，输出 `12.0`。
</details>

**练习 2**（思考）：势函数 $\phi$ 唯一吗？

<details>
<summary>点开查看逐步解答</summary>

不唯一，但只差一个常数：若 $\phi_1,\phi_2$ 都是 $\vec F$ 的势函数，则 $\nabla(\phi_1-\phi_2)=\vec 0$ 处处成立——一张处处水平的图只能是一张平的图，$\phi_1-\phi_2$ 是常数。所以"海拔图"的高度原点随你定，海拔**差**才是场的真身。这和一元情形"原函数族 $F(x)+C$"一模一样，也是为什么定积分算功时起点项 $\phi(A)$ 永远带着：常数在相减里自动抵消。
</details>

## 8. 边界之外

- **三维升级**：$\vec F=\nabla\phi$ 的三维版判据要动用旋度向量 $\nabla\times\vec F=\vec 0$（三个分量方程），边界账本也随之升级为散度定理与 Stokes——下一课的三连击收官。
- **能量守恒**：物理里重力场 $\vec F=(0,-g)$ 的势函数是 $\phi=gy$，"功=势能差"就是线积分基本定理的本名。保守场沿闭路零净功 $\iff$ 机械能守恒，"保守"由此得名。
- **复分析的预告**：第 24 章会看到解析函数的积分也路径无关——那是"保守"思想在复平面的亲戚，而且那里的"势函数"（原函数）存在性判据（Cauchy–Riemann）同样两个方程一组。
- **有洞区域的完整故事**：形如 $\frac{(-y,x)}{x^2+y^2}$ 的场与"环量在洞周围守恒"的现象，是拓扑学进入分析的第一个路口，测度论之后的矢量分析再回来收网。

## 9. 下一站

海拔图到手：保守场做功只认端点，闭路一圈分文不取。但场的账本还有最后两页没翻开——**从边界读内部**的三维版：封闭曲面进出的通量、还有 Stokes 那块翘曲的边界。下一课把 Green 定理的武器库整个搬进三维。

→ [散度定理与 Stokes：三维的边界定理](./65-divergence-stokes.md)
