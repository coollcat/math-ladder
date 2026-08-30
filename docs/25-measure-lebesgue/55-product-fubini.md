---
title: 乘积测度与 Fubini：交换积分次序的资格
lesson_id: measure-lebesgue/product-fubini
prereqs:
  - measure-lebesgue/convergence-theorems
  - multivariable/double-integrals
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
  - product-measure
  - fubini-theorem
  - tonelli-theorem
applications:
  - iterated-integrals
  - joint-distributions
exits:
  - research
---

# 乘积测度与 Fubini：交换积分次序的资格

## 1. 从一个场景开始

20 章的[二重积分与 Fubini 直觉](../20-multivariable-calc/50-double-integrals.md)里你交换过积分次序：连续函数一路绿灯，先积 $x$ 还是先积 $y$ 结果一样。可勒贝格世界的函数又怪、区域又怪、还允许取值无穷——这份"显然"还能免检吗？

先把问题降到最朴素的地板上：往一张表格里加数。按行加完再把行和加起来，与按列加完再把列和加起来，答案当然一样。**有限**表格里这是铁律；可一旦表格变成无穷行无穷列，两本账就会打架。本课的任务：搞清楚交换积分次序什么时候是天赋，什么时候需要资格证。

## 2. 直觉解释

两个变量各占各的地盘：$x$ 轴上有一把尺（测度 $\mu$），$y$ 轴上有一把尺（测度 $\nu$）。给"矩形地砖" $A\times B$ 发产权证：

$$\text{地砖质量}(A\times B)=\mu(A)\cdot\nu(B),$$

再把整片平面按矩形地砖拼装起来——这台"长乘宽"机器造出的测度叫**乘积测度** $\mu\times\nu$。二重积分就是在新地盘上给函数称质量。

在这片新地盘上，交换次序有两道闸门把关：

- **非负放行**：函数 $f\ge 0$（允许答案是 $+\infty$）——随便换，这叫 Tonelli 定理；
- **总账放行**：绝对值的总质量 $\iint|f|$ 有限——也随便换，这叫 Fubini 定理。

没有资格证硬换呢？一张 $+1/-1$ 阶梯表格当场演示：按行加得 $1$，按列加得 $0$——次序从"习惯"变成了"生死"。

## 3. 正式定义

**定义（乘积测度）**：设 $(X,\mu)$ 与 $(Y,\nu)$ 是两个测度空间。在 $X\times Y$ 上由矩形 $A\times B$ 生成的 sigma 代数里，乘积测度满足

$$\mu\times\nu\,(A\times B)=\mu(A)\,\nu(B),$$

并可数可加地扩张到一切可测集——这正是第 10 课"先定地砖、再定全盘"的老套路在二维重演。

**定理（Tonelli，非负版）**：若 $f\ge 0$ 可测，则三个积分

$$\int\Bigl(\int f\,d\mu\Bigr)d\nu,\qquad \int\Bigl(\int f\,d\nu\Bigr)d\mu,\qquad \iint f\,d(\mu\times\nu)$$

恒相等，允许同时为 $+\infty$。

**定理（Fubini，可积版）**：若 $\iint|f|\,d(\mu\times\nu)<\infty$，则 $f$ 的两个累次积分与二重积分都有限且相等。

资格判据一句话：**非负直接放行，变号先验总账**。总账验不过，次序就不是口味问题，而是答案问题。

## 4. 分步例题

**例 1（有限表：铁律演示）**：三行三列表格，第 $i$ 行第 $j$ 列的数是 $3(i-1)+j$（也就是 1 到 9）：

1. 按行加：行和 $6,15,24$，总账 $45$；
2. 按列加：列和 $12,15,18$，总账 $45$；
3. 两本账相等——每个格子恰好数一遍，次序无关。这是有限世界的铁律。

**例 2（无穷阶梯：资格证考场）**：无穷表格在对角线（$m=n$）放 $+1$、次对角线（$m=n+1$）放 $-1$，其余为 0：

```text
+1   0   0   0   ⋯
-1  +1   0   0   ⋯
 0  -1  +1   0   ⋯
 0   0  -1  +1   ⋯
 ⋯   ⋯   ⋯   ⋯
```

1. 按行加：第 1 行只有那个 $+1$，行和为 $1$；第 $m\ge 2$ 行是 $-1+1=0$。总账 $\sum_m(\text{行和})=1$；
2. 按列加：第 $n$ 列是 $+1-1=0$，每列都一样。总账 $\sum_n(\text{列和})=0$；
3. $1\neq 0$——两个累次和**都存在，却不相等**。回头查资格：$|a_{mn}|$ 个个都是 1，总账 $\sum\sum|a_{mn}|=\infty$，Fubini 的总账关卡过不去；这张表又带符号，非负版也罩不住它。资格缺位，换序翻车，铁证如山。

**例 3（非负表：Tonelli 放行）**：$a_{mn}=2^{-m}\cdot 2^{-n}\ge 0$：

1. 按行加：第 $m$ 行和为 $2^{-m}\sum_n 2^{-n}=2^{-m}\cdot 1=2^{-m}$，总账 $\sum_m 2^{-m}=1$；
2. 按列加：对称地也是每列 $2^{-n}$，总账 $1$；
3. 两本账都收口于 $1$——非负给了随便换的资格，哪怕每一行每一列都是无穷多项。

## 5. 动手实验

### 实验 1：先把 20 章的地砖搬过来

```viz
{
  "type": "riemann2d",
  "title": "x·y 在 [0,2]×[0,3] 上的二重黎曼和",
  "expr": "x*y",
  "a": 0,
  "b": 2,
  "c": 0,
  "d": 3,
  "nx": 8,
  "ny": 8,
  "exact": 9
}
```

拖大网格数：读数逼近精确值 9（$\int_0^2 x\,dx\cdot\int_0^3 y\,dy=2\times 4.5$）。连续函数的地砖世界里横切竖切殊途同归——这是 Fubini 资格最好的正面样本，25 章给这位 20 章的旧相识发正式牌照。

### 实验 2：有限表格，两本账必须相等

```python title="3×3 表格的两种加法次序"
table = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]

row_order = 0.0
for i in range(3):              # i 是行号 0,1,2
    for j in range(3):          # j 是列号 0,1,2
        row_order += table[i][j]    # += 是累加简写：row_order = row_order + 这格的数

col_order = 0.0
for j in range(3):              # 外层换成按列走
    for i in range(3):          # 内层扫每一行
        col_order += table[i][j]

print(round(row_order, 1))
print(round(col_order, 1))
```

两行输出都是 45.0。有限表格没有隐藏陷阱：只要每个格子恰好数一遍，横着数竖着数都是同一本账。

### 实验 3：无穷阶梯，两本账分道扬镳

```python title="+1/-1 阶梯表的按行账与按列账"
BIG = 200   # 用 200 行模拟"无穷多行"
N = 6       # 外层清算前 6 行（或 6 列）

def cell(m, n):
    # 对角线放 +1，次对角线放 -1，其余是 0
    if m == n:
        return 1.0
    if m == n + 1:
        return -1.0
    return 0.0

row_order = 0.0
for m in range(1, N + 1):
    row = 0.0
    for n in range(1, BIG + 1):     # 行内扫到底：行是"短"的，200 格足够加完
        row += cell(m, n)
    row_order += row

col_order = 0.0
for n in range(1, N + 1):
    col = 0.0
    for m in range(1, BIG + 1):     # 列内扫到底：把 +1 和 -1 都收进来
        col += cell(m, n)
    col_order += col

print(round(row_order, 1))
print(round(col_order, 1))
```

输出 1.0 与 0.0：按行账本收进第 1 行那个孤零零的 $+1$（其余行正负抵消）；按列账本里每个 $+1$ 都被下一行的 $-1$ 当面抵消。同一张表，两本次序，天壤之别——这就是没有资格证硬换的下场。

### 快问快答

```quiz
非负可测函数可以随便交换积分次序吗（哪怕两边积分都是无穷）？
- 不行，必须先验证绝对值可积
- 可以，这正是 Tonelli 定理的放行条款 [*]
- 只有连续函数才可以
? 非负就有资格（Tonelli），允许两边同时是无穷；变号函数才需要 Fubini 的总账检查：绝对值的积分有限。
```

::::warning[常见误区]

**误区一**："交换次序是积分的天然属性。"有限表格确实随便换；无穷世界把它变成需要资格证的特权——要么非负，要么绝对值总账有限。

**误区二**："两个累次积分都存在，它们就该相等。"阶梯表两本账都存在（1 和 0），照样打架。存在不等于相等。

**误区三**："乘积测度就是在每个矩形上乘一下。"矩形只是地砖样品；真正的工作是把"长乘宽"可数可加地铺满整个乘积 sigma 代数——第 20 课造外测度的苦活在这里原样重演一遍。

::::

## 6. 练习

**练习 1**：下面的程序想复核阶梯表的两本账，但按列账本的内层和漏了一截：

```exercise
# @title: 练习：把按列账本加到头
# @check: 1.0
# @check: 0.0
# @hint: 第 n 列的 -1 挂在第 n+1 行；内层只扫到 N 时，最后一列的 -1 还没进门，把 0 谎报成 1。内层要扫到 BIG。
BIG = 200   # 用 200 行模拟"无穷多行"
N = 6       # 外层清算前 6 行（或 6 列）

def cell(m, n):
    if m == n:
        return 1.0
    if m == n + 1:
        return -1.0
    return 0.0

row_order = 0.0
for m in range(1, N + 1):
    row = 0.0
    for n in range(1, BIG + 1):
        row += cell(m, n)
    row_order += row

col_order = 0.0
for n in range(1, N + 1):
    col = 0.0
    for m in range(1, N + 1):   # ← 问题在这：内层只加到 N，无穷长的列被拦腰截断
        col += cell(m, n)
    col_order += col

print(round(row_order, 1))
print(round(col_order, 1))
```

修好后输出 1.0 与 0.0：每一条无穷长的列都必须加到头，$+1$ 与 $-1$ 才能当面抵消。这道题是本课概念的最小复刻——**内层和加没加到无穷，决定两本账是否还认同一张表**。

**练习 2**：把例 3 的非负表换成 $a_{mn}=3^{-m}\cdot 2^{-n}$，分别按行、按列求和，判断 Tonelli 是否放行、两本账是否相等。

<details>
<summary>点开查看逐步解答</summary>

按行：第 $m$ 行和为 $3^{-m}\sum_n 2^{-n}=3^{-m}\cdot 1=3^{-m}$，总账 $\sum_m 3^{-m}=\tfrac{1}{2}$；按列：第 $n$ 列和为 $2^{-n}\sum_m 3^{-m}=2^{-n}\cdot\tfrac{1}{2}$，总账 $\tfrac{1}{2}\sum_n 2^{-n}=\tfrac{1}{2}$。两本账都是 $\tfrac12$ ✓。表项全为正数，Tonelli 放行，相等是必然而非巧合。一般规律：$a_{mn}=x^m y^n$（$0<x,y<1$）按任何次序都加出 $\dfrac{x}{1-x}\cdot\dfrac{y}{1-y}$。
</details>

## 7. 选读：为什么非负就能换

<details>
<summary>选读 · Tonelli 的引擎是上一课的 MCT</summary>

证明骨架三步走。第一步，矩形上的"柱子函数" $\mathbf{1}_{A\times B}(x,y)$：两个累次积分都等于 $\mu(A)\nu(B)$，二重积分也是它——柱子随便换。第二步，非负简单函数是柱子的线性组合，而有限项加法的次序本来就自由（有限表格铁律），所以简单函数随便换。第三步，一般非负可测函数是简单函数的单调爬升极限——这正是第 40 课"简单函数托举"的电梯；两个累次积分随层数单调上涨，上一课的单调收敛定理保证极限可以穿过积分号，两本账同时爬到同一个（可能无穷的）上限。Fubini 可积版再把 $f$ 拆成正部与负部：$|f|$ 总账有限保证正负两半都有限，各用 Tonelli 换完再相减。整座大厦的承重墙，仍是上一课的单调收敛定理。
</details>

## 8. 下一站

乘积测度把"两个变量各占各的地盘"写成了数学。把"掷一次硬币"这件小事乘上无穷多次，就得到无限次掷硬币的样本空间——总质量为 1 的乘积测度有一个专属名字：概率。最后一课去领这套理论最丰厚的分红。

→ [概率论的测度论视角](./60-probability-as-measure.md)
