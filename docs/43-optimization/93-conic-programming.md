---
title: 锥规划与 Fenchel 对偶：凸优化的统一舞台
lesson_id: optimization/conic-programming
prereqs:
  - optimization/kkt-duality
volume: 5
layer: L7
track:
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - convex-cone
  - second-order-cone
  - semidefinite-cone
  - conic-duality
  - fenchel-conjugate
applications:
  - robust-least-squares
  - max-cut-relaxation
exits:
  - semidefinite-programming
---

# 锥规划与 Fenchel 对偶：凸优化的统一舞台

## 1. 从一个场景开始

三十年前，优化界把问题分成两家人：线性规划是一家（单纯形法、内点法，几十年打磨得锋利无比），非线性规划是另一家（各写各的算法，各背各的定理）。可实践中总冒出一些"半线性"的问题：数值里带着范数，怎么算？

比如传感器网络定位：四台基站测出你到它们的距离，其中一台的表慢了两秒，测距偏了 30 米。最小二乘会把这 30 米平均摊到所有方程上，解出来的位置整体漂移；而工程上想要的其实是"最坏情况下也别偏太多"。这个要求写成数学，就是一个**范数不等式**——而它在上一课的 KKT 框架里无家可归（那套机器只认等式和逐个不等式）。

这一课要做的事，是把线性规划的舞台**整体放大**：把"坐标非负"这一条约束换成"落在一个锥里"，于是最小二乘、范数约束、矩阵不等式全部搬进同一个框架，连对偶定理都原封不动。

## 2. 直觉解释

先看那张熟悉的老图。线性规划的约束 $x\ge0$ 是什么形状？它是平面上**一整块扇形**：从原点出发，往右上无限张开，夹在两堵墙之间。这样的图形有个名字——**锥**：从原点射出的一束光。

锥的关键性质只有两条：**对加法封闭**（两束光里的向量相加，还在里面）、**对非负缩放封闭**（顺着光走多远都还在里面）。凸性自动满足，不用另外证明。

现在换一束光试试：

- 把扇形收窄成**圆锥**——"半径不超过高度"，这就是**二阶锥**，管住了欧氏范数；
- 把箭头换成**对称矩阵**，把"长度"换成"二次型非负"——"对任何方向都不产生负曲率"，这就是**半正定锥**，管住了特征值。

于是三类问题只是换了束光：LP 用方锥、SOCP 用冰淇淋筒、SDP 用矩阵冰淇淋筒。**凸性的来源从"函数凸"统一成了"落在一个锥里"**——这就是"凸优化统一舞台"的字面意思。

## 3. 正式定义

**凸锥**：集合 $K\subseteq\mathbb R^n$ 满足

$$x,y\in K,\ \alpha,\beta\ge0 \;\Longrightarrow\; \alpha x+\beta y\in K$$

三个当家锥（$\|\cdot\|_2$ 是欧氏范数）：

$$\mathcal Q^{n+1}=\lbrace(x,t)\in\mathbb R^n\times\mathbb R:\ \|x\|_2\le t\rbrace,\qquad \mathbb S_+^n=\lbrace X\in\mathbb S^n:\ v^{\mathsf T}Xv\ge0,\ \forall v\in\mathbb R^n\rbrace$$

**锥规划标准形**（$K$ 是凸锥，$A$ 为约束矩阵）：

$$\min_{x}\ c^{\mathsf T}x \quad\text{s.t.}\quad Ax=b,\ x\in K$$

**对偶锥**与 **Fenchel 共轭**：

$$K^*=\lbrace y:\ y^{\mathsf T}x\ge0,\ \forall x\in K\rbrace,\qquad f^*(y)=\sup_{x}\big(y^{\mathsf T}x-f(x)\big)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $K$ | 凸锥 | 约束落在哪个锥里；LP 取非负象限、SOCP 取 $\mathcal Q$、SDP 取 $\mathbb S_+$ |
| $x\in K$ | 锥约束 | 一个统一记号，替代"非负 + 范数 + 矩阵不等式"三套写法 |
| $K^*$ | 对偶锥 | $K$ 的"正半空间交"；$\mathcal Q^*=\mathcal Q$（自对偶）、$(\mathbb S_+^n)^*=\mathbb S_+^n$ |
| $f^*(y)$ | Fenchel 共轭 | 把函数 $f$ 换成它的对偶函数：斜率 $y$ 下能省多少 |
| $\lambda$ | 锥约束的乘子 | 必须落在对偶锥 $K^*$ 里——这正是上一课"不等式乘子非负"的推广 |

**Fenchel 对偶**：对一般问题 $\min_x f(x)+g(Ax)$，其共轭对偶是

$$\max_{y}\ -f^*(-A^{\mathsf T}y)-g^*(y)$$

**强弱对偶**：弱对偶（对偶值 $\le$ 原值）无条件下成立；若问题凸且满足 **Slater 条件**（存在严格内点），则强对偶成立、最优值相等。LP 的对偶定理是它的特例。

## 4. 分步例题：三角形最大割的 SDP 松弛

**最大割**：给每对点一个权重 $w_{ij}$，把它们分成两组，让被分开的边的权重和最大。组合优化里这是 NP 难的；下面用 SDP 松弛给它一个**能算的上界**。

取三角形三个点、每条边权重都是 1。

1. **写成 $\pm1$ 形式**：设 $y_i\in\lbrace1,-1\rbrace$ 表示第 $i$ 点在哪一组，则

$$\max\ \tfrac12\sum_{i<j}w_{ij}\big(1-y_iy_j\big)$$

   $y_iy_j=-1$（分开了）时贡献为 1，否则为 0；
2. **精确解手数**：三种"单点独处"的切法，每种都切开两条边，$y=(1,-1,-1)$ 给出 $2$。所以精确最优是 $2$；
3. **升维松弛**：把乘积 $y_iy_j$ 打包成矩阵 $Y=yy^{\mathsf T}$。此时 $Y$ 自动满足"对角为 1、半正定"，于是把"秩为 1"这个最难的约束**丢掉**，得到 SDP 松弛

$$\max\ \tfrac12\sum_{i<j}\big(1-Y_{ij}\big)\quad\text{s.t.}\quad \operatorname{diag}(Y)=1,\ Y\succeq0$$

4. **求松弛的上界**：对 $Y\succeq0$ 有 $e^{\mathsf T}Ye\ge0$（$e$ 是全 1 向量），展开得 $3+2\sum_{i<j}Y_{ij}\ge0$，即 $\sum_{i<j}Y_{ij}\ge-1.5$。代入目标：上界 $\le\tfrac12(3+1.5)=\tfrac94=2.25$；
5. **认领最优解**：取 $Y=\tfrac32 I-\tfrac12 J$（对角 1、非对角 $-0.5$），它半正定且恰好取到 $2.25$——所以 SDP 上界就是 $\tfrac94$。与精确值 $2$ 的比是 $2.25/2$：比真实答案只高 $12.5\%$，而这一步只用多项式时间。这就是 Goemans–Williamson 近似算法（1995）的出发点。

## 5. 动手实验

### 实验 1（viz）：锥的横截面

二阶锥 $\|x\|_2\le t$ 在半正定语言下与 2×2 矩阵 $\begin{pmatrix}t+x & y\\ y & t-x\end{pmatrix}\succeq0$ 完全等价。固定 $t=r$ 切开看，约束变成 $x^2+y^2\le r^2$——两个圆合起来就是锥的横截面。拖动 $r$ 看锥"长大了多少"：

```viz
{
  "type": "plot",
  "title": "半正定锥的横截面：y = ±√(r² − x²)",
  "expr": "sqrt(r^2 - x^2)",
  "expr2": "-sqrt(r^2 - x^2)",
  "label": "上半圆",
  "label2": "下半圆",
  "xmin": -2,
  "xmax": 2,
  "sliders": [
    { "name": "r", "min": 0.5, "max": 2, "step": 0.25, "value": 1 }
  ]
}
```

锥越大、能装下的向量越多——"换一个锥"其实就是"换一片可行域的边界形状"。

### 实验 2（python）：精确枚举、SDP 上界与随机取整

```python title="三角形最大割：精确解 vs SDP 松弛 vs 随机取整"
import math
import random

random.seed(7)                       # 固定随机种子：同一份代码每次跑出同一结果

edges = [(0, 1), (1, 2), (0, 2)]     # 三角形的三条边，权重都为 1

best_exact = 0
for mask in range(1 << 3):           # 1<<3 = 8：枚举 2 的 3 次方种 ±1 赋值
    y = [1 if (mask >> i) & 1 else -1 for i in range(3)]   # >> 右移取第 i 位，& 1 取最低位
    cut = sum((1 - y[i] * y[j]) / 2 for i, j in edges)     # 割边贡献 1，未割贡献 0
    best_exact = max(best_exact, cut)
print("精确最优割值:", best_exact)

Y = [[1.0, -0.5, -0.5], [-0.5, 1.0, -0.5], [-0.5, -0.5, 1.0]]   # Y = 1.5I - 0.5J
sdp = sum((1 - Y[i][j]) / 2 for i, j in edges)
print("SDP 松弛上界:", sdp)

angles = [2 * math.pi * k / 3 for k in range(3)]   # 三个方向互成 120°，内积恰为 -0.5
vecs = [(math.cos(a), math.sin(a)) for a in angles]
TRIALS = 2000
total = 0
for _ in range(TRIALS):
    theta = random.uniform(0, 2 * math.pi)          # 随机超平面：二维里就是随机一条过原点的直线
    ux, uy = math.cos(theta), math.sin(theta)
    s = [1 if vx * ux + vy * uy >= 0 else -1 for vx, vy in vecs]  # 每个向量投影到直线的哪一侧
    total += sum((1 - s[i] * s[j]) / 2 for i, j in edges)
print("随机取整平均割值:", round(total / TRIALS, 3))
```

精确最优是 `2`，SDP 上界是 `2.25`，随机取整的平均割值落在 `2.0` 附近——上界没白算，它把"最好能好到什么程度"钉死了，随机取整又几乎够到了最好。

### 快问快答

```quiz
为什么说线性规划、二阶锥规划、半正定规划是"同一门课的三件衣服"？
- 因为三者的求解代码完全一样
- 因为它们都是"线性目标 + 仿射约束 + 落在某个凸锥里"，只是换了一个锥 [*]
- 因为三者的最优解都一定落在可行域的顶点上
? 三者共享同一个锥规划骨架；锥从非负象限换成二阶锥、半正定锥，能表达的问题从线性约束扩展到范数和矩阵不等式，而对偶理论的结构原封不动。
```

:::warning[常见误区]

**误区一**："SDP 松弛是近似算法，所以结果不可信。" 松弛给出的是**严格的上界**（对最大化问题），方向永远不会错，只是可能偏松。把它再配一个随机取整就能得到可行解，于是"上界 + 可行解"把最优值夹在中间——这比一个没有证书的启发式解值钱得多。

**误区二**："范数约束只是不等式约束的一种写法，KKT 照用就行。" 单看 $1^{\mathsf T}x\le5$ 确实如此，但 $\|Ax-b\|_2\le t$ 展开成 $n$ 个二次不等式后**不再凸**（是球的外部与内部的混合）。正确的做法是引入辅助变量写成一整条锥约束——锥框架存在的意义正是保住凸性。

**误区三**："Fenchel 对偶只对可微函数有用。" 共轭的定义 $\sup$ 不要求可微，恰好相反：它最擅长的就是不可微的指示函数与范数，$\delta_K$ 的共轭直接给出对偶锥。上一课拉格朗日对偶是它在"可微 + 等式约束"下的特例。

:::

## 6. 练习

**练习 1**（判题）：下面的代码用同一套模板算三角形最大割的 SDP 目标值，但把割边的贡献写反了——修好它让输出变成松弛上界。

```exercise
# @title: 练习：修好最大割的 SDP 目标
# @check: 2.25
# @hint: 两个点被分开时 y_iy_j = -1，贡献应是 (1 − Y_ij)/2；现在是加号，方向反了。
Y = [[1.0, -0.5, -0.5], [-0.5, 1.0, -0.5], [-0.5, -0.5, 1.0]]
edges = [(0, 1), (1, 2), (0, 2)]

total = 0.0
for i, j in edges:
    total = total + (1 + Y[i][j]) / 2   # ← 问题在这：割边的贡献是 (1 - Y_ij)/2
print(round(total, 2))
```

把 `(1 + Y[i][j])` 改成 `(1 - Y[i][j])` 后输出 `2.25`：非对角项 $-0.5$ 越负，代表两个点越"对着干"，割值就越大——这是松弛把组合难度折算成几何内积的关键一步。

**练习 2**（概念）：同一个三角形最大割问题，如果用更简单的**线性**松弛（要求每个 $-1\le Y_{ij}\le1$ 而不要求 $Y\succeq0$），上界会是多少？为什么 SDP 更紧？

<details>
<summary>点开查看逐步解答</summary>

线性松弛里三条非对角项互不关联，各自取到 $-1$ 就使目标最大：$\tfrac12(3+3)=3$。真正的上界是 $2.25$，SDP 把 $1.25$ 个单位的松弛量收掉了一半多。收窄的力量来自 $Y\succeq0$：它强迫三个非对角项"手拉手"——$e^{\mathsf T}Ye\ge0$ 把三者之和锁在 $-1.5$ 以上，单条边就没法再各自乱跑了。**锥约束的价值正在于它能表达变量之间的结构关系**，这一点任何逐条不等式都做不到。
</details>

**练习 3**（选做）：为什么对偶变量必须落在对偶锥 $K^*$ 里？用 $K=\mathbb R_+$（非负象限）验证一下，看它是否退化成上一课的"不等式乘子非负"。

<details>
<summary>点开查看逐步解答</summary>

锥约束 $x\in K$ 的拉格朗日项是 $-\lambda^{\mathsf T}x$，要求它对所有 $x\in K$ 都有下界，否则内层极小化会跑到 $-\infty$。这等价于 $\lambda^{\mathsf T}x\ge0$ 对一切 $x\in K$ 成立，也就是 $\lambda\in K^*$。取 $K=\mathbb R_+$ 时，$K^*$ 仍是 $\mathbb R_+$（自对偶），条件变成 $\lambda\ge0$——与上一课 KKT 的"不等式乘子非负"逐字一致。
</details>

## 7. 选读：Fenchel 对偶与指示函数

<details>
<summary>选读 · 一条恒等式统吃三种对偶</summary>

定义集合 $K$ 的指示函数 $\delta_K(x)=0$（$x\in K$）、$+\infty$（$x\notin K$）。它的共轭是

$$\delta_K^*(y)=\sup_{x\in K}y^{\mathsf T}x=\begin{cases}0,&y\in K^*\\+\infty,&y\notin K^*\end{cases}=\delta_{K^*}(y)$$

把锥规划写成 $f(x)=\delta_K(x)$、$g(z)=0$（$z=Ax-b$ 的部分），代入 Fenchel 对偶即得**锥对偶**：对偶变量自动落在 $K^*$ 里，弱对偶无需任何条件。再取 $K=\mathbb R_+^n$，$K^*=\mathbb R_+^n$，对偶就退化成 LP 对偶定理。

这套写法是 1960 年代 Rockafellar 与 Moreau 建立凸分析的副产品，它把"拉格朗日对偶""LP 对偶""锥对偶"三层看起来不同的东西收进同一条公式。工程求解器（MOSEK、SDPA、SCS 等）内部都是按这个结构统一实现的：**输入一个锥、一个线性目标，剩下的交给算法**。
</details>

## 8. 下一站

舞台搭好了，代价也看清了：锥规划把大量问题统一进来，代价是"目标函数不再可微"这件事被推到了台前。当 $f(x)=|x|$ 这类带尖点、带范数的目标出现时，梯度根本不存在，KKT 条件要改写。下一课把"梯度"换成"次梯度"，看看尖角处怎样还能定义下降方向，以及 L1 的稀疏性到底藏在哪个几何结构里。

→ [次梯度与非光滑优化：L1 的几何](./95-subgradients-nonsmooth.md)
