---
title: 第 24 章 · 复分析
description: 复函数的解析性、Cauchy-Riemann 方程、积分与留数方法。
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
---

# 复分析

复分析把旋转、伸缩和二维平面流动统一起来。解析函数异常规整：一点附近的信息可以决定大范围行为，围道积分也能反过来计算实积分。

本章你会学到：

1. [复变函数与映射](./10-complex-functions-maps.md)——把一张橡皮网格放进流水里，每个点都会被推到新位置；
2. [极限与解析](./20-limits-analytic.md)——实函数的极限只需要从左右两侧靠近一个点；
3. [Cauchy-Riemann 方程](./30-cauchy-riemann.md)——一张理想热传导图的温度线与热流线总是互相垂直，而且疏密配合得天衣无缝；
4. [Möbius 变换：把圆还给你](./35-conformal-mobius.md)——把上半平面卷成单位圆盘，还要保住每一个角：一条分数式就能办到；
5. [复级数与幂级数](./40-power-series.md)——实数世界里的泰勒级数像一条安全区间；
6. [围道积分](./50-contour-integrals.md)——在实积分里，你只能从左走到右；
7. [Cauchy-Goursat 定理](./60-cauchy-theorem.md)——如果一片湖水里没有任何旋涡，小船绕任意闭合圈回到原地，风做的总功就是零；
8. [Cauchy 积分公式](./65-cauchy-integral-formula.md)——只知道一个解析函数在圆边界上的值，能算出圆心处的值吗？；
9. [Laurent 级数与孤立奇点](./70-laurent-singularities.md)——$e^z$ 在全平面规规矩矩，$e^{1/z}$ 却在 $z=0$ 附近疯狂振荡：无穷多个负幂挤进一个点；
10. [留数定理](./80-residue-theorem.md)——绕一大圈积分，听起来要做无穷多次微小累加；
11. [定积分计算应用](./90-real-integrals.md)——$\displaystyle\int_{-\infty}^{\infty}\frac{dx}{x^2+1}$ 用实方法要背反正切公式，复方法只要一条上半围道；
12. [Laplace 变换与 s 平面](./100-laplace-s-plane.md)——微分方程里的求导、时移和卷积，到了 Laplace 世界都变成乘法与除法；
13. [解析延拓选讲](./110-analytic-continuation.md)——你只知道一个函数在小圆盘内的幂级数，却想知道它在远处长什么样；
14. [复分析与方法地图](./120-method-map.md)——学完整章最容易丢的不是定理，而是“下一步该用哪件工具”。

## 前置回望

实数世界的极限、级数与一致收敛在第 19 章已经练熟；把自变量换成复数 $z$ 后它们照常工作，只是直线邻居变成了整个平面邻域。泰勒级数的工具也随身带来，收敛半径在新平面里改叫收敛盘。

## 生产状态

首批 14 门课程草稿已完成（含 2026-08 回填插课“Möbius 变换：把圆还给你”）；配套的 `COMPONENT_SPEC.md` 是生产侧资源，不作为读者课程发布。本轮使用已上线 viz 类型和浮窗 Python 兜底；专属组件落地后按规格回填。

## 实战挑战 · 用留数定理拿下一个经典实积分

> 情境原创 · 经典题型：$\int_0^\infty \dfrac{dx}{1+x^4}$ 是复变函数教材与考研复分析辅导书反复收录的常客（各校讲义常用例题），此处按本章工具重排，未指认具体考年。

备考研究生考试的你翻到一道号称"实方法算到头疼、复方法三行收工"的经典题：算出

$$I=\int_0^{\infty}\frac{dx}{1+x^4}.$$

用实方法，你得先知道欧拉换元或背出 beta 函数；用第 80、90 课的方法，只需要一条上半大半圆围道和两个留数。设 $f(z)=\dfrac{1}{z^4+1}$，围道取 $[-R,R]$ 加上半大圆弧。

**(a)** $z^4+1$ 的四个根是 $e^{i\pi/4},\ e^{3i\pi/4},\ e^{5i\pi/4},\ e^{7i\pi/4}$。指出哪两个落在上半平面，并说明它们都是一阶极点（提示：看分母导数在这些点是否为零）。

**(b)** 题面直接给出超前公式——若 $\zeta$ 是 $z^4+1$ 的单零点，则

$$\operatorname{Res}_{z=\zeta}\frac{1}{z^4+1}=\frac{1}{4\zeta^3}.$$

用它算出上半平面两个留数之和，证明答案是纯虚数 $-\dfrac{\sqrt{2}}{4}i$。

**(c)** 全直线积分等于 $2\pi i\times$ 总留数（大弧贡献随 $R\to\infty$ 消失）；再用偶函数对称性对折出 $I$。下面代码骨架已就位，两处标记了待修点：

```exercise
# @title: 实战挑战：两个留数换一个 π/√2
# @check: 2.221441469079183
# @check: 1.1107207345395915
# @hint: (b) 的总留数是纯虚数 -√2/4 · i：给 residue_sum 补上 j 记号；(c) 偶函数对折是除以 2，不是除以 4。
pi = 3.141592653589793    # 圆周率直接写字面量，本挑战不引入任何库
s2 = 2 ** 0.5             # ** 是幂运算符：2 ** 0.5 就是根号 2

residue_sum = -s2 / 4     # ← (b) 只写对了系数：它其实是纯虚数，补上 j 记号
full_line = 2 * pi * 1j * residue_sum   # 全直线积分 = 2πi × 总留数
half_line = full_line / 4               # ← (c) 对折错了：偶函数该怎么分？
print(full_line.real)     # .real 取复数的实部；积分值应落回实轴
print(half_line.real)
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** 四个根把单位圆四等分：辐角 $45^\circ,135^\circ$ 的两个点纵坐标为正，落在上半平面；$225^\circ,315^\circ$ 的两个在下半平面。$(z^4+1)'=4z^3$ 在这些根处都不为零（模长为 1），所以四个都是一阶极点。

**(b)** 记 $\zeta_1=e^{i\pi/4}$、$\zeta_2=e^{3i\pi/4}$，则 $\zeta_1^3=e^{3i\pi/4}$、$\zeta_2^3=e^{9i\pi/4}=e^{i\pi/4}$。模长为 1 的复数取倒数等于取共轭：

$$\operatorname{Res}_1+\operatorname{Res}_2=\frac{\overline{\zeta_1^3}+\overline{\zeta_2^3}}{4}=\frac{\sqrt{2}}{8}\bigl[(-1-i)+(1-i)\bigr]=-\frac{\sqrt{2}}{4}i.$$

只有负一次幂的系数留下净额——这正是留数的脾气。

**(c)** 留数定理给出全直线积分

$$2\pi i\cdot\Bigl(-\frac{\sqrt{2}}{4}i\Bigr)=\frac{\pi\sqrt{2}}{2}\approx 2.221441469079183,$$

其中大弧贡献被 $|f(z)|\le \frac{1}{R^4-1}$ 配合弧长 $\pi R$ 压成 $O(R^{-3})\to 0$。被积函数是偶函数，所以 $I=\dfrac{\pi\sqrt{2}}{4}\approx 1.1107207345395915$。

数值哨卡：对照更简单的邻居 $\int_0^\infty \frac{dx}{1+x^2}=\frac{\pi}{2}\approx 1.571$，本题答案略小于它（分母在大半区间上更大），量级合理 ✓。运行修正后的代码，两行输出应精确到上面的小数。

</details>

## 现实挑战 · 用一次留数读出点涡环流

> 场景简化：二维理想流体中的点涡是空气动力学与海洋流教材常用模型；这里只关心绕小圈一周的净环流，不模拟黏性和压缩性。

设流体复势为 $w(z)$，速度按 $u-iv=\dfrac{dw}{dz}$ 读出。一个强度为 $\Gamma$ 的逆时针点涡对应

$$V(z)=\frac{dw}{dz}=-\frac{i\Gamma}{2\pi z}.$$

$z=0$ 是唯一奇点，留数为 $-\dfrac{i\Gamma}{2\pi}$。取 $\Gamma=3$，把围道积分 $2\pi i\times$ 留数翻译回环流。下面的骨架漏了点涡的方向因子：

```exercise
# @title: 现实挑战：点涡环流
# @check: 3.0
# @check: 0.0
# @hint: V(z) 的留数带 -i 因子；先补上方向，再用 2*pi*i 乘留数。
pi = 3.141592653589793    # 圆周率字面量，本挑战不引入库
gamma = 3.0               # 点涡强度：正号表示逆时针
residue = gamma / (2 * pi)    # ← 漏了 -i 方向因子
circulation = 2 * pi * 1j * residue
print(circulation.real)
print(abs(circulation.imag))    # abs 只读幅值，清掉浮点负零尾巴
```

修正后，环流应等于 $3$，虚部账本为 $0$。围道半径可以变小或变大，但只要不越过涡心，这个净额不变——这正是留数在势流里的物理身份。

<details>
<summary>点开查看环流账本</summary>

复速度 $V(z)=-i\Gamma/(2\pi z)$ 在涡心的留数就是 $-i\Gamma/(2\pi)$。因此逆时针一周的净环流为

$$\oint V(z)\,dz=2\pi i\cdot\left(-\frac{i\Gamma}{2\pi}\right)=\Gamma.$$

当 $\Gamma=3$ 时，实部账本给出 $3$，虚部只剩浮点负零；用幅值读数后稳定为 $0$。

</details>

课程回链：[留数定理](./80-residue-theorem.md)（一阶极点公式）、[定积分计算应用](./90-real-integrals.md)（上半平面围道与大弧估计）。
