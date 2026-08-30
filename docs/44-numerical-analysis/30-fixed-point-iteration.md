---
title: 迭代法与收敛速度
lesson_id: numerical-analysis/fixed-point-iteration
prereqs:
  - numerical-analysis/floating-point
  - sequences/arith-geom
  - calculus/derivative
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
  - fixed-point-iteration
  - convergence-factor
applications:
  - numerical-root-finding-preview
  - power-grid-frequency
exits:
  - engineering
  - data-ai
---

# 迭代法与收敛速度

## 1. 从一个场景开始

拿起计算器，输入随便一个数（比如 5），然后反复按 `cos` 键：5 → 0.2837 → 0.9600 → 0.5741 → …… 十几按之后，屏幕上的数几乎不再变化，停在 **0.7390851332**。换起始数再玩一遍——殊途同归。

这个"按不动了"的数就是方程 $x=\cos x$ 的解。没有任何初等公式能写出它，但我们刚才**用一台只会按键的机器把它逼了出来**。这种"同一个动作反复做、逐步逼近答案"的思想叫迭代法。

## 2. 直觉解释

把方程改写成 $x=g(x)$ 的形式（比如 $x=\cos x$），然后从任意起点 $x_0$ 出发，不断计算 $x_1=g(x_0)$，$x_2=g(x_1)$……像折纸一样把纸一次次对折向某个定点。

什么时候这套动作会"收拢"？看 $g$ 在落点附近的**斜率**：

- $\lvert g'\rvert<1$：每迭代一次，误差至少乘上一个小于 1 的因子——**越滚越小的雪球**，收敛；
- $\lvert g'\rvert>1$：误差每步放大——**越滚越大的雪球**，发散；
- $g'=-0.8$ 这类负斜率：左右两侧交替跳，但幅度递减——**荡秋千式**靠近。

那个决定生死的因子 $q\approx\lvert g'(x^\ast)\rvert$ 叫**收敛因子**：它是误差的"汇率"，每步按它兑换一次。

## 3. 正式定义

若 $x^\ast$ 满足 $g(x^\ast)=x^\ast$，称 $x^\ast$ 为 $g$ 的**不动点**；序列 $x_{k+1}=g(x_k)$ 称为**不动点迭代**。

**收敛定理**：若在 $x^\ast$ 的邻域内 $g$ 可导且 $\lvert g'(x)\rvert\le q<1$，则对足够近的初值，迭代收敛到 $x^\ast$，且误差满足

$$\lvert x_k-x^\ast\rvert \;\le\; q^{k}\,\lvert x_0-x^\ast\rvert$$

误差按公比 $q$ 几何衰减（第 8 章等比数列的老朋友）。$\lvert g'(x^\ast)\rvert>1$ 时（除非初值恰好命中）迭代必不收敛。

| 现象 | 原因 |
| --- | --- |
| 单调滑入 | $0<g'<1$ |
| 震荡靠近 | $-1<g'<0$ |
| 震荡跑飞 | $g'<-1$ |
| 单调漂走 | $g'>1$ |

## 4. 分步例题

**例**：用迭代法求 $\sqrt{5}$。令 $x=g(x)=\dfrac{1}{2}\left(x+\dfrac{5}{x}\right)$（巴比伦平均：猜想与"5 除以猜想"取平均，猜大则商小，平均后更近）。

1. 取 $x_0=2$：$x_1=\dfrac12(2+2.5)=2.25$；
2. $x_2=\dfrac12(2.25+\frac{5}{2.25})=\dfrac12(2.25+2.2222)=2.236111\ldots$；
3. $x_3=2.23606797\ldots$——已经和真值 $\sqrt5=2.236067977\ldots$ 前八位一致；
4. 检查收敛因子：$g'(x)=\dfrac12(1-\dfrac{5}{x^2})$，在 $x^\ast=\sqrt5$ 处 $g'=0$！因子是零意味着误差每步平方级缩减（正确位数翻倍）——这是比几何收敛更快的**二次收敛**，牛顿法的心脏，第 22 章 RK 方法同款血统；
5. 对比：用 $g(x)=\cos x$ 解 $x=\cos x$ 时 $q=|\!-\!\sin(0.739)|\approx0.67$，每步只赚约两成进度——所以按十几下 `cos` 才稳住。

## 5. 动手实验

### 实验 1：两条曲线的交汇处

下图同时画出 $y=\cos x$ 与直线 $y=x$：迭代就是在两条线之间来回"爬阶梯"，交点即不动点。

```viz
{
  "type": "plot",
  "title": "y = cos(x) 与 y = x：交点 0.739… 就是按不动的那个数",
  "expr": "cos(x)",
  "expr2": "x",
  "label": "g(x)",
  "label2": "y=x",
  "xmin": 0,
  "xmax": 1.6
}
```

交点左侧曲线在直线上方（迭代把你往右推），右侧曲线在下（往左推）——夹逼结构正是 $\lvert g'\rvert<1$ 的几何面目。

### 实验 2：巴比伦开方的位数翻倍秀

```python title="四次迭代逼近 sqrt(5)，逐轮打印"
target = 5
x = 2.0
for step in range(4):                 # 只迭代 4 轮，看正确位数如何翻倍
    x = (x + target / x) / 2          # 巴比伦更新：猜想与商取平均
    print(step + 1, round(x, 6), "误差", abs(x - target ** 0.5))
```

四行输出的误差大约是 $10^{-2}\to10^{-5}\to10^{-10}\to 0$（第四轮已与 $\sqrt{5}$ 精确相等；初值 2 自己的误差约 $2\times 10^{-1}$）——靠近真值后，每轮正确位数大约翻倍，二次收敛名不虚传。想对比线性收敛的话，看下一个误差对数图或练习 3 的慢版本。

```python title="误差对数图：直线 vs 折半"
import matplotlib.pyplot as plt

errs_fast = []
x = 2.0
for k in range(6):
    errs_fast.append(abs(x - 5 ** 0.5) + 1e-18)   # 加小量防 log(0)
    x = (x + 5 / x) / 2

errs_slow = []
x = 2.0
for k in range(6):
    errs_slow.append(abs(x - 5 ** 0.5))
    x = 0.5 * x + 5 ** 0.5 * 0.5                  # 人造的 q=0.5 线性收缩

plt.semilogy(range(6), errs_slow, marker="o", label="linear q=0.5")
plt.semilogy(range(6), errs_fast, marker="s", label="babylonian")
plt.xlabel("iteration")
plt.ylabel("error")
plt.legend()
plt.grid(True)
```

对数坐标里线性收敛是笔直的斜坡，巴比伦曲线却越降越陡——**快方法在对数图上会"翘头向下"**，这是辨认超线性收敛的目测技巧。

### 快问快答

```quiz
迭代 x = g(x) 收敛的核心判据是什么？
- g 必须是增函数
- 不动点附近 |g'| 小于 1，误差每步乘上小于 1 的因子 [*]
- 初值必须恰好等于真解
? |g'|<1 保证映射把邻域"压"得更紧（压缩映像）；|g'|>1 时任何微小的偏差都会被逐步放大。
```

:::warning[常见误区]

**误区一**："迭代总归会收敛，多算几步而已。" 方向错了走得越多离得越远：$g(x)=5/x$ 在真根两侧永久振荡，一万次也白搭。先验算 $|g'|$ 再开跑。

**误区二**："收敛了就一定收敛到我要的解。" 同一个 $g$ 可能有好几个不动点，初值落在谁的势力范围就收向谁。解方程前先想清楚目标解在哪一带。

**误区三**："程序停了就是算完了。" 实际代码靠容差停止（如相邻两次差小于 $10^{-12}$），要同时设最大迭代次数防死循环——浮点世界里"绝对不动"往往达不到。

:::

## 6. 练习

**练习 1**（概念）：想解 $x=x^2-3$（正根 $\approx2.3028$）。直接取 $g(x)=x^2-3$ 迭代会发生什么？给出一个能收敛的重写方案。

<details>
<summary>点开查看逐步解答</summary>

$g'(x)=2x\approx4.6>1$，单调飞出。重写：由 $x^2-x-3=0$ 得 $x=\sqrt{x+3}$，即 $g(x)=\sqrt{x+3}$，$g'$ 在根处 $=\frac{1}{2\sqrt{x+3}}\approx0.217<1$ ✓ 收敛，且相当快。**同一个方程有无穷多种 $g$ 的写法，选型的全部学问就在那个导数上。**
</details>

**练习 2**（判题）：初始代码想用巴比伦法开方，但更新式写错成"与 5 取平均"。修正后应打印出逼近 $\sqrt5$ 的四行：

```exercise
# @title: 练习：修好巴比伦开方迭代
# @check: 2.25
# @check: 2.236111
# @check: 2.236068
# @check: 2.236068
# @hint: 平均的对象是"猜想 x"和"商 5/x"：(x + 5 / x) / 2。
target = 5
x = 2.0

for step in range(4):
    x = (x + target) / 2        # ← 错了：这里在和 target 本身取平均
    print(round(x, 6))
```

修好后第三、四行都显示 2.236068——不是卡住了，而是六位小数下已经完全稳定，这正是练习里"位数翻倍"的观感。

**练习 3**：把实验 2 第一段的更新改成 `x = (x + 2 * target / x) / 3`，预测收敛因子并运行验证你的预测。

<details>
<summary>点开查看逐步解答</summary>

新映射 $g(x)=\frac{x}{3}+\frac{10}{3x}$，$g'(x)=\frac13-\frac{10}{3x^2}$，在 $\sqrt5$ 处 $=\frac13-\frac23=-\frac13$。因子绝对值 $\frac13<1$：仍收敛，但退回线性震荡式（误差每次乘 $-\frac13$）。巴比伦平均之所以特殊，是因为权重 $\frac12$ 恰好让 $g'$ 归零。
</details>

## 7. 选读：从单个方程到整族方程——谱半径一瞥

<details>
<summary>选读 · 把收敛因子升级成矩阵</summary>

解线性方程组 $Ax=b$ 时可以构造迭代 $x_{k+1}=Mx_k+c$（如 Jacobi 方法：每个未知数用上一轮的旧值代入求解）。此时"收敛因子"变成矩阵 $M$ 的**谱半径** $\rho(M)$——特征值绝对值的最大值（第 21 章特征值、矩阵幂课的直接应用）：$\rho(M)<1$ 收敛，越小越快；分量方向的误差各自乘 $(\lambda_i)^k$，最慢的那个特征方向决定整体节奏。工程里的"迭代法与谱半径"模块、PageRank 的幂迭代（第 37/53 章），都是这一行的展开。

</details>

## 8. 下一站

迭代能把解逼出来，但工程师还想知道**中间没有数据的地方长什么样**：只在三个测点有读数时，两点之间的梁弯到哪里去了？插值登场。

→ [插值：用几个点造一条曲线](./40-interpolation.md)
