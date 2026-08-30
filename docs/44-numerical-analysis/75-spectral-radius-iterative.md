---
title: 迭代法与谱半径
lesson_id: numerical-analysis/spectral-radius-iterative
prereqs:
  - numerical-analysis/fixed-point-iteration
volume: 5
layer: L6
track:
  - scientific-computing
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - matrix-splitting-iteration
  - spectral-radius
applications:
  - heat-grid-simulation
  - power-flow-analysis
exits:
  - engineering
  - data-ai
---

# 迭代法与谱半径

## 1. 从一个场景开始

给一块 $1000\times1000$ 的金属网格做稳态温度仿真：每个格点的温度等于四个邻点温度的平均。未知量一百万个，方程一百万条，系数矩阵里九成九以上是零——只有邻点之间才有联系。

直接法在此撞墙：消元会把大片零"填满"（前大半矩阵本不相连的行被迫稠密化），存储和运算都爆炸。工程师的出路朴素得惊人：**先猜一张温度场，再按平均规则反复修正**——每轮只动该动的格子。这就是把第 30 课"按一个键反复收敛"的思想升级到向量：Jacobi 与 Gauss-Seidel 迭代。

## 2. 直觉解释

把 $Ax=b$ 的第 $i$ 个方程改写成"x_i 等于其余变量的组合"：

$$x_i=\frac{1}{a_{ii}}\Big(b_i-\sum_{j\ne i} a_{ij}x_j\Big)$$

- **Jacobi**：右边所有变量都用上一轮的旧值——整班同学同时交卷；
- **Gauss-Seidel**：算到哪个变量就用哪个刚出炉的新值——后排同学抄前排当堂答案。

两种写法都能装进同一个模具：

$$x_{k+1}=Mx_k+c$$

那个矩阵 $M$ 叫**迭代矩阵**，它就是误差的搬运工。把当前的误差向量 $\epsilon_k=x_k-x^\ast$ 代进更新式，真解自动满足方程、于是恰好剩下

$$\epsilon_{k+1}=M\,\epsilon_k$$

迭代多少轮，误差就被 $M$ 搬运多少次（第 30 课收敛因子的矩阵版）。而矩阵搬运有个分解视图：误差沿各个特征方向各乘自己的特征值 $(\lambda_i)^k$。**$|\lambda|$ 最大的那个方向决定生死与节奏**——它的最大值就是谱半径。

## 3. 正式定义

把 $A$ 拆成对角、下三角、上三角三块：$A=D+L+U$。

| 名词 | 记号 | 含义 |
| --- | --- | --- |
| Jacobi 迭代矩阵 | $M_J=-D^{-1}(L+U)$ | 全部用旧值 |
| Gauss-Seidel 迭代矩阵 | $M_G=-(D+L)^{-1}\,U$ | 新旧混用（就地更新） |
| 谱半径 | $\rho(M)=\max_i\lvert\lambda_i(M)\rvert$ | 特征值模长的最大者 |

**收敛定理**：迭代收敛到真解的充要条件是

$$\rho(M)<1$$

且越小于 1 收敛越快；某方向的 $|\lambda_i|\ge1$ 时，落在那个方向上的误差分量永不消退甚至放大。一个好用但不必要的充分条件：$A$ **严格对角占优**（每行对角元绝对值大于其余之和）时 Jacobi 必收敛——工程网格方程组常满足它。

## 4. 分步例题

**例**：解 $\begin{cases}3x+y=5\\ x+2y=5\end{cases}$（真解 $(1,2)$）。

1. 拆块：$D=\begin{pmatrix}3&0\\0&2\end{pmatrix}$，$L=\begin{pmatrix}0&0\\1&0\end{pmatrix}$，$U=\begin{pmatrix}0&1\\0&0\end{pmatrix}$；
2. 写成两个"修正公式"：$x\leftarrow\dfrac{5-y}{3}$，$y\leftarrow\dfrac{5-x}{2}$；
3. Jacobi 的搬运工：$M_J=\begin{pmatrix}0&-\frac13\\-\frac12&0\end{pmatrix}$，其特征值满足 $\lambda^2-\tfrac16=0$，即 $\lambda=\pm\tfrac{1}{\sqrt6}$，$\rho(M_J)\approx0.408<1$ ✓ 收敛但带着正负交替的脾气；
4. Gauss-Seidel 的搬运工：$M_G=\begin{pmatrix}0&-\frac13\\0&\frac16\end{pmatrix}$，特征值只有 $0$ 和 $\frac16$，$\rho(M_G)=\frac16\approx0.167$ ——恰是 $\rho(M_J)^2$，快了一个平方级；
5. 两边对比预演：从零向量起跑，同样的步数下 GS 应明显更贴。

这份"GS 比 Jacobi 快约一倍幂次"的好礼不是普适保证，但对一类常见的对角占优系统成立——数值实践里也因此默认优先 GS。

## 5. 动手实验

### 实验 1：ρ 旋钮上的生死线

拖动滑块改变谱半径 $\rho$，横轴是迭代轮数，纵轴是剩余误差的水平 $\rho^k$：旋钮越过 1 的瞬间，曲线由俯冲改仰冲——收敛与发散只隔一根手指的距离。

```viz
{
  "type": "plot",
  "title": "误差每轮乘 ρ：跌破 1 才算熬出头",
  "expr": "rho^x",
  "xmin": 0,
  "xmax": 20,
  "sliders": [
    { "name": "rho", "min": 0.2, "max": 1.6, "step": 0.05, "value": 0.85 }
  ]
}
```

### 实验 2：两台修正机的同场竞技

```python title="Jacobi 对 Gauss-Seidel：五轮迭代实录"
x, y = 0.0, 0.0          # 起点是零猜测
print("Jacobi:")
for sweep in range(5):   # range(5)：产生 0,1,2,3,4 五个轮次
    xn = (5 - y) / 3     # 全用旧值
    yn = (5 - x) / 2
    x, y = xn, yn
    print(" ", round(x, 4), round(y, 4))

x, y = 0.0, 0.0
print("Gauss-Seidel:")
for sweep in range(5):
    xn = (5 - y) / 3     # x 先用新值登场
    y = (5 - xn) / 2     # y 直接享用刚出炉的 x
    x = xn
    print(" ", round(x, 4), round(y, 4))

rhoJ = (1 / 6) ** 0.5    # 特征方程 λ² = 1/6 开根号
rhoG = 1 / 6
print(round(rhoJ, 6), "|", round(rhoG, 6))
```

五行对照表里 GS 步步领先：第五轮已到 `1.0005, 1.9997`，而 Jacobi 还在 `1.0185, 2.0139` 外打转。最后的谱半径一行 `0.408248 | 0.166667` 把差距翻译成了理论数字——**节奏由最慢的特征方向定调**，这正是引子"整场温度同时松弛"的现实时间表。

### 实验 3：谱半径与轮数的换算账

谱半径给出一张速算表：想让误差缩到原来的 $10^{-t}$，大约需要

$$k\;\approx\;\frac{t\ln 10}{\ln(1/\rho)}\ \text{轮}$$

按 GS 的 $\rho=\tfrac16$ 试算削一千倍：$3\ln10/\ln6\approx3.9$——四轮上下理应完成一个数量级的跨越；那"削掉十个数量级"就是 $\approx12.8$ 轮的活。脚本数格子验收这张表：

```python title="数一数：GS 到底几轮进前十位有效数字"
tolerance = 1e-10        # 允许的误差地板
limit = 60               # 防失控的最大轮数（好习惯）
x, y = 0.0, 0.0
step = 0
while abs(x - 1) + abs(y - 2) > tolerance and step < limit:
    step += 1            # += 是"自增后存回"的简写
    xn = (5 - y) / 3
    y = (5 - xn) / 2
    x = xn
print(step)              # 达标所用的总轮数
```

输出的轮数落在理论预报 $\approx13$ 的隔壁（交替符号带来一点启动损耗）：换算账成立。while 循环配上限值是浮窗代码的安全带——永远别让"再等一轮"变成无期徒刑。

### 快问快答

```quiz
迭代矩阵 M 的谱半径从 0.8 压到 0.3，迭代次数大约会怎样变化？
- 几乎不变
- 大幅减少：1/0.3 的收敛速度远高于 1/0.8 [*]
- 与谱半径无关，看运气
? 谱半径是误差的公比：0.8 时削一位数字要约 10 轮，0.3 时只需约 2 轮。
```

:::warning[常见误区]

**误区一**："多迭代几轮总能凑合。" 谱半径大于 1 时每多一轮错得更多；先看 ρ 再开跑，是第 30 课"先验算导数"的矩阵版家规。

**误区二**："Gauss-Seidel 永远比 Jacobi 快。" 顺序恰好相反的反例存在（取决于系统的几何结构）；严谨说法是对一大类规则网格系统 GS 更快，具体项目仍需实测。

**误区三**："谱半径看矩阵 A 就行。" 判收敛读的是迭代矩阵 M 的谱半径，不是原系数矩阵 A 的——同一道题不同的拆块方式得到不同的 M，选型空间正在这里。

:::

## 6. 练习

**练习 1**（概念）：为什么对角占优的系统适合搞 Jacobi/GS 迭代？（提示：把修正公式里的分母想一想。）

<details>
<summary>点开查看逐步解答</summary>

对角占优保证 $|a_{ii}|>\sum_{j\ne i}|a_{ij}|$：修正公式里自己占大头、别人都是小份，一步修正最多把你拽回一小段路，不会过冲——这正是压缩映像的离散版。更硬核的说法：此时可以证明 $\rho(M_J)\le\lVert M_J\rVert_\infty<1$ 收敛有保证金。而主元偏小的病态系统里，别人的小贡献可能压过自己的大身板，修正方向失真。
</details>

**练习 2**（判题）：下面的代码想实现 Gauss-Seidel 加速，却把 y 的更新写回了旧值配方——退成了普通 Jacobi。请改成"就地吃新值"，让两处输出全部达标。

```exercise
# @title: 练习：把 Jacobi 改造成 Gauss-Seidel
# @check: 1.1111
# @check: 1.9444
# @check: 1.0
# @check: 2.0
# @hint: y 要用刚算出的新 x：y = (5 − x_next) / 2，然后才 x = x_next。
x, y = 0.0, 0.0
for sweep in range(12):
    x_next = (5 - y) / 3
    y_next = (5 - x) / 2      # ← 错了：这是上一轮的旧 x，正宗 Jacobi
    x, y = x_next, y_next
    if sweep == 1:
        print(round(x, 4))    # 第二轮的中途快照
        print(round(y, 4))

print(round(x, 6))            # 十二轮后的落点
print(round(y, 6))
```

修好后四行依次是 `1.1111`、`1.9444`、`1.0`、`2.0`：第二轮快照与十二轮收尾双双对齐理论值——最后一行的 `1.0` 尤其挑剔，唯有真正吃到新值的写法才能在这个精度上站住。

**练习 3**：把实验 2 换成这道更凶险的题——$\begin{cases}x+y=6\\ 2x+y=8\end{cases}$（真解 $(2,4)$）。先用谱半径笔算预测两台机器的命运，再各跑十轮验证。

<details>
<summary>点开查看逐步解答</summary>

系数阵 $A=\begin{pmatrix}1&1\\2&1\end{pmatrix}$ 两行都不对角占优，坏味道先行。Jacobi 迭代矩阵 $M_J=\begin{pmatrix}0&-1\\-2&0\end{pmatrix}$，特征方程 $\lambda^2-2=0$，$\rho(M_J)=\sqrt2>1$：**预测双双发散且振荡**。验证脚本（Jacobi 版，十轮封顶）：

```python
x, y = 0.0, 0.0
for sweep in range(10):
    xn = 6 - y          # 全旧值配方
    yn = 8 - 2 * x
    x, y = xn, yn
    print(sweep + 1, round(abs(x - 2) + abs(y - 4), 4))
```

误差序列 $8, 12, 16, 24,\ldots$ 每两轮放大约 2 倍（连续两步恰好平方回 $\sqrt2^{\,2}$），符号逐段翻转——教科书级的发散样本。教训收编：动笔之前先查谱半径，省下一万轮白费功夫。
</details>

## 7. 选读：SOR——把谱半径亲手拧小

<details>
<summary>选读 · 松弛因子的一次性买卖</summary>

Gauss-Seidel 修正的是"这轮走到哪"；SOR 问的是"能不能走得更夸张一点"：$x^{new}=(1-\omega)x^{old}+\omega\,x_{GS}^{new}$，松弛因子 $\omega$ 在 $(0,2)$ 内调解步幅。妙处在理论可以精确定价：对一类规整网格问题，最优 $\omega$ 能把谱半径压到 $(\rho_{GS})^{\text{半}}$ 级别——轮数从 $O(1/\delta)$ 缩到 $O(1/\sqrt{\delta})$（$\delta$ 为目标精度指数）。代价同样明码标价：$\omega$ 略微越界立即发散，最优值依赖网格尺寸需经验公式预估。现代多层网格法更进一步——粗细分辨率互相传递残差——但骨架仍是本课的"拆块 + 谱半径审计"。第 52 章控制系统的稳定性判据与此同源：增益与反馈的取舍从来不免费。

</details>

## 8. 下一站

方程组的规模战到此收官。接下来换一件头疼事：只知道函数在几个采样点上的值，导数和积分都得靠邻居互相"打听"——差分步长怎么选才是聪明问法？

→ [数值微分与数值积分](./85-numdiff-integration.md)
