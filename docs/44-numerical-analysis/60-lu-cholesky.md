---
title: 直接法：LU 分解与 Cholesky
lesson_id: numerical-analysis/lu-cholesky
prereqs:
  - numerical-analysis/floating-point
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
  - lu-factorization
  - cholesky-factorization
  - cubic-work-accounting
applications:
  - structural-engineering
  - circuit-simulation
exits:
  - engineering
  - data-ai
---

# 直接法：LU 分解与 Cholesky

## 1. 从一个场景开始

一座桥的风荷载每天都不一样：结构工程师的求解器每天醒来都要解一个**系数矩阵完全相同、右端项全新**的方程组。要是每来一个新荷载都把高斯消元从头演一遍，等于每天都重新装修一遍只为换一盏灯。

能不能把第一次消元的辛苦**记在账本上**，之后每个新右端项只付零钱？可以——这本账本就是 **LU 分解**：一次分解，终身复用。

## 2. 直觉解释

回看高斯消元，它其实只有一句台词：**用第 $i$ 行减去第 $j$ 行的多少倍**。"多少倍"就是乘子 $m_{ij}$——把它们按位置存进一个下三角矩阵 $L$ 的格子里，消完剩下的上三角结果存成 $U$，于是

$$A = LU$$

 decomposition 不是什么新算法，而是**把消元过程本身写成乘法**：$L$ 是"减了几倍"的备忘录，$U$ 是"消完长什么样"。复用时对每个新 $b$ 只做两段快速代入：

1. **前代**：先解 $Ly=b$（从上往下逐个算出 $y$）；
2. **回代**：再解 $Ux=y$（从下往上逐个算出 $x$）。

两段都是三角方程组，各只需约 $n^2/2$ 次运算——相对 $n^3$ 级的分解是彻底的零钱账。

而 Cholesky 是对称正定情形的专属福利：既然 $A$ 关于对角线对称，信息存一半就够——**只算下三角**，工作量直接砍半，且天生稳定无需选主元（原因见选读）。

## 3. 正式定义

**LU 分解**：若 $A$ 的各阶顺序主子式非零，则存在单位下三角 $L$（对角线为 1）与上三角 $U$ 使 $A=LU$。

**Cholesky 分解**：$A$ 对称正定（SPD：任何向量 $v\ne0$ 都使 $v^{\mathsf T}Av>0$）当且仅当存在对角元为正的下三角 $L$ 使

$$A=LL^{\mathsf T}$$

| 名词 | 含义 |
| --- | --- |
| 单位下三角 | 对角线全 1、左下方可有数、右上方全零 |
| 正定 | 二次型 $v^{\mathsf T}Av>0$ 对一切非零 $v$ 成立 |
| 前代 / 回代 | 依次解三角组 $Ly=b$ 与 $Ux=y$ 的标准流程 |
| 工作量 $O(n^3)$ | 分解约 $\tfrac{n^3}{3}$ 次乘加；Cholesky 约 $\tfrac{n^3}{6}$ |

Cholesky 的逐列公式也值得抄一遍（每个元素都能被"已算好的部分"直接表达）：

$$l_{jj}=\sqrt{a_{jj}-\textstyle\sum_{k<j}l_{jk}^{\,2}},\qquad l_{ij}=\frac{a_{ij}-\sum_{k<j}l_{ik}l_{jk}}{l_{jj}}\;(i>j)$$

观察第 4 步例题里这个公式的用法；$O(n^3)$ 的直觉账在第 5 节实验 2 里对表核算。

## 4. 分步例题

**例**：对 $A=\begin{pmatrix} 9 & 3 & 6 \\ 3 & 5 & 2 \\ 6 & 2 & 20 \end{pmatrix}$ 做 Cholesky 分解并解 $Ax=b,\ b=(33,19,70)^{\mathsf T}$。

1. 第 1 列：$l_{11}=\sqrt9=3$；$l_{21}=a_{21}/l_{11}=3/3=1$；$l_{31}=6/3=2$；
2. 第 2 列：$l_{22}=\sqrt{a_{22}-l_{21}^2}=\sqrt{5-1}=2$；$l_{32}=(a_{32}-l_{31}l_{21})/l_{22}=(2-2)/2=0$；
3. 第 3 列：$l_{33}=\sqrt{a_{33}-l_{31}^2-l_{32}^2}=\sqrt{20-4-0}=4$；
4. 于是 $L=\begin{pmatrix} 3&0&0 \\ 1&2&0 \\ 2&0&4 \end{pmatrix}$——注意所有根号下都是干净的完全平方，这是精心挑选的例题福利；
5. 前代 $Ly=b$：$y_1=11$，$y_2=(19-11)/2=4$，$y_3=(70-22)/4=12$；
6. 回代 $L^{\mathsf T}x=y$：第三行 $4x_3=12\Rightarrow x_3=3$；第二行 $2x_2+0=4\Rightarrow x_2=2$；第一行 $3x_1+x_2+2x_3=11\Rightarrow 3x_1=11-2-6$，得 $x_1=1$。
7. 验收：$A(1,2,3)^{\mathsf T}=(33,19,70)^{\mathsf T}$ ✓。

真实数据不会这么整齐，但流程一字不差——下一节让机器跑给你看。

## 5. 动手实验

### 实验 1：整条流水线跑起来

```python title="Cholesky 分解 + 三角两次代入"
A = [[9, 3, 6],
     [3, 5, 2],
     [6, 2, 20]]
b = [33, 19, 70]
n = 3
L = [[0.0] * n for _ in range(n)]     # 列表推导式：造 n×n 的空账本
for j in range(n):                    # 逐列填 L
    acc = A[j][j]
    for k in range(j):
        acc = acc - L[j][k] * L[j][k]   # 减去已定格的平方项
    L[j][j] = acc ** 0.5               # ** 0.5 就是开平方
    for i in range(j + 1, n):
        s = A[i][j]
        for k in range(j):
            s = s - L[i][k] * L[j][k]
        L[i][j] = s / L[j][j]          # 除法得到浮点分量

yy = [0.0] * n                        # 前代：Ly = b
for i in range(n):
    s = b[i]
    for k in range(i):
        s = s - L[i][k] * yy[k]
    yy[i] = s / L[i][i]

LT = [[L[r][c] for r in range(n)] for c in range(n)]   # 双重推导式求转置
xx = [0.0] * n                        # 回代：LT·x = y
for i in reversed(range(n)):          # reversed：倒着迭代 i = 2,1,0
    s = yy[i]
    for k in range(i + 1, n):
        s = s - LT[i][k] * xx[k]
    xx[i] = s / LT[i][i]

print(L[0][0], L[1][1], L[2][2])      # 对角线三兄弟
print(yy)
print(xx)
rec = [[sum(L[i][k] * L[j][k] for k in range(n)) for j in range(n)] for i in range(n)]
print(all(abs(rec[i][j] - A[i][j]) < 1e-9 for i in range(n) for j in range(n)))   # LLᵀ 还原 A 吗？
```

输出依次是对角元 $3.0, 2.0, 4.0$、中间量 $[11.0, 4.0, 12.0]$、解 $[1.0, 2.0, 3.0]$，以及一行 `True`——$\;LL^{\mathsf T}$ 把 $A$ 一字不差地拼了回去。这台流水线正是例题的手工步骤，只是每一步不再靠脑力。

### 实验 2：$O(n^3)$ 的直觉账——规模翻倍，苦头八倍

消元为什么是立方级？粗算：外层选主元行 $n$ 次 × 内层扫剩余行列约 $n^2$ 次 ≈ $n^3$，系数收敛到 $\tfrac13$。表格里的"翻倍定律"是检验复杂度最锋利的尺子——幂次对了，比例必然死死钉在那个常数上。

```python title="规模每次翻倍，运算量恰好 ×8"
prev_ops = 0
for nn in [50, 100, 200, 400]:        # 规模成倍增长
    ops = nn * nn * nn / 3            # 消元的核心工作量模型 n³/3
    if prev_ops > 0:
        print(nn, f"{ops:.3e}", "ratio", ops / prev_ops)
    else:
        print(nn, f"{ops:.3e}")
    prev_ops = ops
```

f-string 里 `{ops:.3e}` 表示按三位小数的科学计数法格式化。四行的比值清一色是 `8.0`：$2^3$ 一次不多一次不少——这正是 $O(n^3)$ 的指纹，比任何口头解释都有说服力。同一张表也解释了为何实验 1 的三角代入部分（$\approx n^2$ 级）在 $n$ 大时几乎免费。

```viz
{
  "type": "plot",
  "title": "同样的精度，Cholesky 只掏一半力气：n³/6 对 n³/3",
  "expr": "x^3 / 3",
  "expr2": "x^3 / 6",
  "label": "LU 全量",
  "label2": "Cholesky 半价",
  "xmin": 1,
  "xmax": 8
}
```

### 快问快答

```quiz
对一个固定的大矩阵要连续处理五千个不同的右端项，最划算的做法是什么？
- 每个右端项都完整重做一遍高斯消元
- 先做一次 LU 分解记账，随后每个右端项只需前代加回代 [*]
- 把五千个右端项平均一下再解一次
? 分解是最贵的立方级劳动，只该做一次；三角代入只要平方级，五千次也便宜。
```

:::warning[常见误区]

**误区一**："LU 分解是另一种高斯消元。" 它就是把高斯消元的乘子收集起来的**记账形式**：算法没变，变的是"把中间过程留下来"的意识。

**误区二**："Cholesky 快是因为近似或丢了信息。" 半价的原因纯粹是利用对称性少算一半重复的格子，结果是精确等价的分解，不是近似牺牲。

**误区三**："任何矩阵都能享受半价。" SPD 是前提：不对称会得到两块不相干的三角阵，不保证开方成功也不保证稳定。判定对称容易，判正定请交给主子式或试分解本身。

:::

## 6. 练习

**练习 1**（概念）：为什么 $A=LU$ 之后，解三角系统 $Ly=b$ 要从第一行往下算、而 $Ux=y$ 要从最后一行往上算？

<details>
<summary>点开查看逐步解答</summary>

$L$ 是下三角：第一行只有一个未知数 $y_1$，立即可得，随后每一行都比上一行多一个已知数——顺藤摸瓜从上往下正好。$U$ 是上三角镜像相反：最后一行先独享 $x_n$，回代自底向上。三角结构的全部红利就是"总有一个只含一个未知数的行当下手处"。
</details>

**练习 2**（判题）：下面这段代码想完成 Cholesky 流水线，但对角更新忘了开平方，整个分解从此失真。修复它，看四个检查值重新对齐（全是浮点表示下精确的整数，无舍入歧义）。

```exercise
# @title: 练习：补上 Cholesky 的那记开方
# @check: 1.0
# @check: 2.0
# @check: 3.0
# @check: 4.0
# @hint: 对角元 l_jj = sqrt(a_jj − Σ l_jk²)：acc 算完差值后别忘了 ** 0.5。
A = [[9, 3, 6],
     [3, 5, 2],
     [6, 2, 20]]
b = [33, 19, 70]
n = 3
L = [[0.0] * n for _ in range(n)]
for j in range(n):
    acc = A[j][j]
    for k in range(j):
        acc = acc - L[j][k] * L[j][k]
    L[j][j] = acc            # ← 错了：这里应该开平方
    for i in range(j + 1, n):
        s = A[i][j]
        for k in range(j):
            s = s - L[i][k] * L[j][k]
        L[i][j] = s / L[j][j]

yy = [0.0] * n
for i in range(n):
    s = b[i]
    for k in range(i):
        s = s - L[i][k] * yy[k]
    yy[i] = s / L[i][i]

LT = [[L[r][c] for r in range(n)] for c in range(n)]
xx = [0.0] * n
for i in reversed(range(n)):
    s = yy[i]
    for k in range(i + 1, n):
        s = s - LT[i][k] * xx[k]
    xx[i] = s / LT[i][i]

print(xx[0])
print(xx[1])
print(xx[2])
print(L[2][2])           # 隐藏彩蛋：这个对角元其实是整数
```

修好后依次输出 $1.0, 2.0, 3.0, 4.0$：解回到真值，最后一个 $4.0$ 提醒你 $l_{33}=\sqrt{20-16}$ 这一步开了方才落定。

**练习 3**：把实验 1 里 $b$ 换成 $(31,\ 21,\ 64)$，笔算预测解，再运行核对——体会"分解不动、右端项随便换"的快乐。

<details>
<summary>点开查看逐步解答</summary>

想找整数解的话反推：取 $x=(2,1,2)^{\mathsf T}$ 则 $b=Ax=(18+3+12,\ 6+5+4,\ 12+2+40)=(33,\ 15,\ 54)$ 不合题意——按给定 $b$ 老实走账：前代 $y_1=31/3$ 不整洁，说明这组右端对应的真解并非整数（浮窗输出的就是带小数的真相）。**要点不在凑整，而在体验：L 与 U 原封未动，只重复两段平方级代入。**
</details>

## 7. 选读：为什么对称正定不必选主元

<details>
<summary>选读 · 正定性给数值稳定性的保证金</summary>

一般矩阵的高斯消元可能撞上小的主元（对角位置的除数），除以小数字会把舍入误差放大——所以普通 LU 要按列选最大元交换行次序（部分主元法）。SPD 矩阵有个漂亮的定理：消元过程的 Schur 补仍保持对称正定，且对角元 $a^{new}_{ii}\ge a_{ii}$（越消越壮，不会萎缩）。主元永远足够大，选主元这道工序可以整体免掉——这就是工程界（有限元刚度阵、协方差矩阵、图拉普拉斯）偏爱 Cholesky 的第二个理由：省一半劳力之外还省一份提心吊胆。付出的代价同样清晰：开方操作的存在要求严格正定；准正定的矩阵要走 LDLᵀ 变体，把根号换成符号商。

</details>

## 8. 下一站

三角形账本对付得了方阵，可现实测量常常给出**比未知数还多的方程**——没有精确解可谈，只能谈最好的折中。把折中做稳的关键角色是一类特殊的矩阵：正交矩阵。QR 分解登场。

→ [正交化：QR 分解与最小二乘](./70-qr-least-squares.md)
