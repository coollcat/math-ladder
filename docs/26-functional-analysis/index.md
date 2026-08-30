---
title: 第 26 章 · 泛函分析选讲
description: 把函数看作空间中的点，研究范数、内积、Banach 与 Hilbert 空间。
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
---

# 泛函分析选讲

当向量变成函数，几何仍然可以继续工作。距离由范数定义，角度由内积定义，微分方程和信号变换则成为算子。本章是分析、线代与 PDE 的汇合点。

## 能力主线

- 函数空间、范数、完备性与 Banach 结构
- 内积、正交投影与 Hilbert 几何
- 有界算子、对偶、伴随、谱与紧算子
- 弱收敛、变分方程与分布
- 傅里叶模态作为热方程的谱坐标

## 课程清单

- [从向量空间到函数空间](./10-function-spaces.md)——傅里叶级数把一段声音拆成一串系数，只是这次被分解的“点”不是箭头，而是整条波形；配套 sine 波形合成实验；
- [范数与完备化](./20-norm-completion.md)——两条曲线都逼近同一段信号，一条误差处处均匀、另一条只在多数点上小：先选尺子再谈接近；配套 plot 曲线对比；
- [Banach 空间](./30-banach-spaces.md)——数值迭代不断修正近似解 $x_{n+1}=T(x_n)$，何时敢断言它停在真解旁边？关键不是公式漂亮，而是空间里没有洞；配套 plot 迭代观察；
- [Lp 空间：可积函数的家](./35-lp-spaces.md)——同一根尖峰在三把尺子下是三个长度：按 p 范数给可积函数发户口，L2 是下一课 Hilbert 的正版住户；配套 plot 尖峰对照与范数滑块；
- [内积与 Hilbert 空间](./40-inner-product-hilbert.md)——比较两张脸像不像、两条信号是否同相，都是在问两个向量的方向有多一致；配套 dotprod 点积盘；
- [正交基与投影](./45-orthogonal-bases-projection.md)——傅里叶系数为什么只需“乘一下、积一次”？因为每个频率都是互相垂直的方向，求坐标变成直接量影子；配套 projection 投影实验；
- [线性算子与有界性](./50-bounded-operators.md)——微分、积分、卷积都想充当函数世界的“矩阵”，但有些机器会把极小的输入放大成巨大输出；配套 linear-map 算子演示；
- [对偶空间](./55-dual-spaces.md)——传感器给位置一个温度读数，考试给知识向量一个分数：用线性规则把向量变成数的“测量器”们自成一套空间；配套 plot 泛函图像；
- [泛函三大定理：承重墙巡礼](./58-three-big-theorems.md)——对偶为什么够用、求逆为什么稳定、逐点有界为什么可信：三根承重墙一次看全，地基都是完备性；配套 plot 逐点读数与峰值爆炸对照；
- [伴随算子](./60-adjoint-operators.md)——最小二乘公式里反复出现的“转置”，到了 Hilbert 空间改名伴随，负责把输出侧的测量搬回输入侧；配套 linear-map 对照演示；
- [谱与特征值](./70-spectrum-eigenvalues.md)——一根弦只肯按某些频率振动，一份谱就是系统的“共振说明书”；配套 eigen-direction 不变方向探针；
- [紧算子选讲](./75-compact-operators.md)——无穷维单位球大得指望不上收敛子列，但有一类算子能把这团庞然大物压软成近似有限维的样子；配套 plot 衰减示意；
- [弱收敛与强收敛](./80-weak-strong-convergence.md)——正弦波的测量读数趋于零而振幅纹丝不动：两本账簿从这里开始分岔；配套 sines 振荡实验；
- [Lax-Milgram 选读](./85-lax-milgram.md)——受热的杆、绷紧的膜都要解椭圆方程：经典导数可能不存在，但能量碗什么时候必有唯一最低点？配套 plot 能量地形；
- [分布初步](./90-distributions-intro.md)——锤击、点电荷、瞬时脉冲全挤在一个点上，经典函数写不下它们；配套 plot 测量器读数图；
- [Sobolev 空间：弱导数的家](./92-sobolev-spaces.md)——折线函数在折点没有经典导数，却有平方可积的弱导数：给“函数与弱导数都在 L²”的函数类上户口；配套 plot 折线与阶梯弱导数对照；
- [变分法选讲：Euler-Lagrange 与最速降线](./95-calculus-of-variations.md)——"未知量不是数，而是整条函数"：最短路必是直线由方程亲手吐出，最速降线交给固定网格折线赛跑与 Euler-Lagrange 方程；配套两点折线计时扫描实验；
- [泛函分析回望傅里叶与 PDE](./100-fourier-pde-bridge.md)——同一批正弦波先是声音的原料，随后成了 Hilbert 空间的特征向量，最后替热方程按频率排队冷却；配套 sines 与 plot 双实验。

## 生产状态

首批完整草案已建立：每课采用九段式骨架，配备现有 viz 或可改 Python 实验、判题式练习和概念测验。专属二维探针统一登记在生产档案 `COMPONENT_SPEC.md`，正文不引用未实现组件。

## 实战挑战 · 在函数空间里做最小二乘（$x^2$ 的最佳一次逼近）

传感器标定中测得一条抛物线状的响应曲线 $f(x)=x^2$，但显示仪表只支持一次函数（直线）。在整段区间 $[0,1]$ 上，哪条直线离它"整体最近"？这是 Hilbert 空间正交投影的经典题型：把函数看成空间中的点，"最近"由内积

$$\langle f,g\rangle=\int_0^1 f(x)\,g(x)\,dx$$

定义——正是 [正交基与投影](./45-orthogonal-bases-projection.md)的用武之地。

**(a)** 先算出六块内积积木（逐个积分即可验证）：

| $\langle 1,1\rangle$ | $\langle 1,x\rangle$ | $\langle x,x\rangle$ | $\langle x^2,1\rangle$ | $\langle x^2,x\rangle$ | $\langle x^2,x^2\rangle$ |
| --- | --- | --- | --- | --- | --- |
| $1$ | $\tfrac12$ | $\tfrac13$ | $\tfrac13$ | $\tfrac14$ | $\tfrac15$ |

**(b)** 求 $f$ 在子空间 $V=\operatorname{span}\lbrace 1,x\rbrace$ 上的正交投影 $p(x)=a+bx$：投影定理说误差 $r=f-p$ 必须垂直于 $V$，即 $\langle r,1\rangle=0$ 且 $\langle r,x\rangle=0$。写出这两个方程（法方程），解出 $a,b$。

**(c)** 计算最小误差的平方 $\lVert f-p\rVert^2=\langle f-p,f-p\rangle$。

下面的求解器藏了一处错误：

```exercise
# @title: 实战挑战：x 的平方的最佳一次逼近
# @check: -1.0
# @check: 1.0
# @check: 1.0
# @hint: 三行分别是 6a、b 和 180×误差平方。先对照题面复查内积表：⟨x,x⟩ 在 [0,1] 上等于 ∫x²dx = 1/3。
m00 = 1.0    # <1,1> = ∫ 1 dx
m01 = 0.5    # <1,x> = ∫ x dx
m11 = 0.5    # <x,x> = ∫ x*x dx   ← 这格和题面对不上，先修它
f0 = 1 / 3   # <x^2,1>
fx = 1 / 4   # <x^2,x>
fxx = 1 / 5  # <x^2,x^2>

det_ = m00 * m11 - m01 * m01                 # 法方程系数矩阵的行列式
aa = (f0 * m11 - fx * m01) / det_            # 克拉默法则解 a
bb = (m00 * fx - m01 * f0) / det_            # 克拉默法则解 b
print(round(6 * aa, 3))
print(round(bb, 3))

err_sq = fxx - 2 * aa * f0 - 2 * bb * fx + aa * aa * m00 + 2 * aa * bb * m01 + bb * bb * m11
print(round(180 * err_sq, 3))
```

<details>
<summary>点开查看逐步解答</summary>

**(b)** 条件 $\langle r,1\rangle=0$ 与 $\langle r,x\rangle=0$ 展开为：

$$a\langle 1,1\rangle+b\langle 1,x\rangle=\langle x^2,1\rangle,\qquad a\langle 1,x\rangle+b\langle x,x\rangle=\langle x^2,x\rangle$$

代入数值：

$$a+\tfrac{b}{2}=\tfrac13,\qquad \tfrac{a}{2}+\tfrac{b}{3}=\tfrac14$$

第一式乘 $\tfrac12$ 减第二式：$\tfrac{b}{4}-\tfrac{b}{3}=\tfrac16-\tfrac14=-\tfrac1{12}$，即 $-\tfrac{b}{12}=-\tfrac1{12}$，所以 $b=1$；回代得 $a=\tfrac13-\tfrac12=-\tfrac16$。最佳直线是

$$p(x)=x-\tfrac16$$

代码里三行分别打印 `-1.0`（即 $6a$）、`1.0`、`1.0`（见下）。

**(c)** $r=x^2-x+\tfrac16$，展开平方逐项积分：

$$\lVert r\rVert^2=\int_0^1\Big(x^4-2x^3+\tfrac43x^2-\tfrac13x+\tfrac1{36}\Big)dx=\tfrac15-\tfrac12+\tfrac49-\tfrac16+\tfrac1{36}$$

通分为分母 180：$36-90+80-30+5=1$，所以 $\lVert f-p\rVert^2=\tfrac1{180}$，打印 `round(180*..., 3)` 恰好回到 `1.0`。

**验算（垂直性哨卡）**：$\langle r,1\rangle=\tfrac13-\tfrac12+\tfrac16=0$ ✓；$\langle r,x\rangle=\tfrac14-\tfrac13+\tfrac1{12}=0$ ✓。误差与整个子空间垂直——这正是投影定理承诺的"最短影子"，也是 [内积与 Hilbert 空间](./40-inner-product-hilbert.md)与第 21 章[最小二乘与正规方程](../21-linear-algebra-advanced/80-least-squares.md)在同一件事上的两种口音：散点拟合是它的离散版，这里是连续版。


```python
m11 = 1.0 / 3

det_ = m00 * m11 - m01 * m01
aa = (f0 * m11 - fx * m01) / det_
bb = (m00 * fx - m01 * f0) / det_
err_sq = fxx - 2 * aa * f0 - 2 * bb * fx + aa * aa * m00 + 2 * aa * bb * m01 + bb * bb * m11
print(round(6 * aa, 3))
print(round(bb, 3))
print(round(180 * err_sq, 3))
```
</details>

相关课程：[正交基与投影](./45-orthogonal-bases-projection.md)（投影定理与法方程）、[内积与 Hilbert 空间](./40-inner-product-hilbert.md)（函数内积）、第 21 章 [最小二乘与正规方程](../21-linear-algebra-advanced/80-least-squares.md)。

## 实战挑战 · L2 范数别忘开根号

向量 $(3,4)$ 的 $L^2$ 范数（欧氏长度）是 $\sqrt{3^2+4^2}=5$。下面这题停在平方和、忘了开根号，修到输出 `5.0`：

```exercise
# @title: 实战挑战：L2 范数别忘开根号
# @check: 5.0
# @hint: L2 范数 = sqrt(分量平方和)，平方和是 25，开根号才是长度 5。
import math

v = [3, 4]
norm = v[0] * v[0] + v[1] * v[1]    # ← 问题在这：这是范数的平方
print(norm)
```

<details>
<summary>点开查看逐步解答</summary>

$L^2$ 范数（欧氏长度）要开平方根：

```python
norm = math.sqrt(v[0] * v[0] + v[1] * v[1])   # sqrt(9 + 16)
print(norm)                                    # 5.0
```

改完：$\|v\|_2 = \sqrt{3^2+4^2} = \sqrt{25} = 5.0$。初始代码输出 $25$，是范数的平方 $\|v\|^2$。在 Hilbert 空间里，内积 $\langle v,v\rangle$ 给出的是平方，开根号才是范数——这层"平方与开根"的关系，正是本章内积诱导范数的第一课。

</details>


