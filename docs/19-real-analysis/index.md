---
title: 第 19 章 · 实分析
description: 从计算极限走向严格定义：完备性、Cauchy、ε-δ 连续、一致收敛、Riemann 上下和与 Fourier 收敛。
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
---

# 实分析

卷一用直观逼近建立了极限、导数和积分；本章把这些工具重新放在实数完备性的地基上。核心不是把简单事说难，而是看清哪些直觉可靠、哪些会在序列、函数列和病态函数面前失效。

本章你会学到：

1. [实数完备性与上确界](./10-completeness-supremum.md)——有理数里可以不断列出平方小于 2 的数：1，1.4，1.41，1.414……它们有上界，却没有最大值；
2. [数列极限与 Cauchy 判据](./20-cauchy-sequences.md)——有时你不知道数列要去哪儿，只能看它后面的项是否彼此靠近；
3. [单调有界必收敛与 Bolzano-Weierstrass](./25-monotone-bw.md)——方向单一、涨不出界的数列必收敛；哪怕上蹿下跳，有界数列也能抽出收敛子列；
4. [函数极限与连续性](./30-epsilon-delta-continuity.md)——“想多近有多近”还不够严格：谁先给定？；
5. [一致连续：ε 不许看位置](./32-uniform-continuity.md)——每点都雇得起自己的 δ，不等于全域雇得起一把通用尺；
6. [中值定理与洛必达法则](./35-mean-value-lhopital.md)——把"局部导数"与"整体增量"接起来的桥，洛必达是它算极限的副产品；plot 滑块现场演示「型值趋稳」的极限游戏；
7. [一致收敛与交换次序](./40-uniform-convergence.md)——一个班每个学生都在进步，不代表全班整体已经达到目标线；
8. [Riemann 积分的严格定义](./50-riemann-upper-lower.md)——第 14 章的黎曼和用中点、左端点或右端点取样，已经能算面积；
9. [Fourier 级数的分析视角](./60-fourier-strict-convergence.md)——第 16 章你看见方波合成时跳点旁总有一个尖包。

## 生产状态

本章九门课（10–60 全段含 25/32/35 号）已全部上线。配套交互组件包括完备性阶梯、Cauchy 尾部、epsilon-delta 探针、一致收敛缩放、Riemann 上下和与 Fourier 严格收敛观察。

## 实战挑战 · 用 ε-N 语言证明极限

> 经典题型（考研数学·数列极限的定义证明）。"用定义证极限"是考研数学的经典考法，也是本章 ε-N 语言的综合练习。

**背景**：数控机床的迭代定位程序每一步输出一个位置估计 $a_n=\dfrac{3n+1}{n+2}$（单位毫米），真值是 3 毫米。工程师不关心"第几步到了多近"，只关心一件能写进验收文档的事：**给定公差 ε，存在一个步数 N，从 N 步之后永远不再超差**。这句话翻译成数学，正是 ε-N 定义。

**(1)** 用 ε-N 定义证明：

$$\lim_{n\to\infty}\frac{3n+1}{n+2}=3$$

**(2)** 取公差 $\varepsilon=0.01$，编程求出你证明中那个"停机时刻"：使 $n>N$ 时误差恒小于 0.01 的最小整数 $N$，并打印它。

```exercise
# @title: 实战挑战：求最小停机时刻 N
# @check: 499
# @check: 498
# @hint: 误差是 5/(n+2) 而不是 5/n——分母里那个 +2 正是证明时可以省出来的余量。让循环找到第一个真正进带的 n，N 就是它减一。
epsilon = 0.01
n = 1
while 5 / n >= epsilon:   # ← 问题在这：误差的分母应该是 n + 2
    n = n + 1

print(n)
print(n - 1)
```

<details>
<summary>点开查看完整证明与解答</summary>

**第 (1) 问·ε-N 证明**：任给 $\varepsilon>0$。先放大误差：

$$\left|\frac{3n+1}{n+2}-3\right|=\left|\frac{3n+1-3n-6}{n+2}\right|=\frac{5}{n+2}<\frac{5}{n}$$

要它小于 $\varepsilon$，只需 $n>5/\varepsilon$。于是取 $N=\lceil 5/\varepsilon \rceil$，则当 $n>N$ 时恒有

$$\left|\frac{3n+1}{n+2}-3\right|<\frac{5}{n}<\varepsilon$$

按定义，该数列收敛到 3。证明结束。注意整个论证只用了"放大误差再解不等式"这一招——这正是第 20 课演示过的套路。

**第 (2) 问·精确的最小 N**：编程版把不等式算得更精细。误差 $\frac{5}{n+2}<0.01$ 等价于 $n+2>500$，即 $n\ge 499$；因此最小的 $N=498$（从第 499 项起全部进带）。

```python
epsilon = 0.01
n = 1
while 5 / (n + 2) >= epsilon:
    n = n + 1

print(n)
print(n - 1)
```

循环停在 $n=499$（第一个满足 $\frac{5}{501}<0.01$ 的项），打印 `499` 和 `498`。注意边界：$n=498$ 时误差恰为 $\frac{5}{500}=0.01$，不严格小于，所以被正确排除。

工程含义：证明给出的 $N=\lceil 5/\varepsilon\rceil=500$ 是"够用的保守值"，机器找到的 498 是"精确停机时刻"。ε-N 定义只要求存在，不要求最优——但数值软件每天都在做第二件事。

</details>

本挑战综合了 [数列极限与 Cauchy 判据](./20-cauchy-sequences.md) 的 ε-N 语言与 [实数完备性与上确界](./10-completeness-supremum.md) 的逼近视角。

## 实战挑战 · ε-N 的寻找方向

数列 $a_n = \frac1n \to 0$。给 $\varepsilon = 0.01$，要找**第一个**满足 $|a_n - 0| < \varepsilon$ 的 $n$。下面这题的判断方向反了，第一个数就"达标"，修到输出 `101`：

```exercise
# @title: 实战挑战：ε-N 的寻找方向
# @check: 101
# @hint: 要找的是"进入 ε 邻域"的第一个 n，即 |a_n - L| < ε；现在写成了 >。
eps = 0.01
L = 0.0
N = 0
for n in range(1, 1000):
    a = 1.0 / n
    if abs(a - L) > eps:    # ← 问题在这：条件反了
        N = n
        break
print(N)
```

<details>
<summary>点开查看逐步解答</summary>

极限定义要的是"落进 $\varepsilon$ 邻域"：

```python
if abs(a - L) < eps:    # |a_n - L| < ε 才达标
    N = n
    break
print(N)                # 101
```

改完：从 $n=1$ 起逐个试，$a_{101} = \frac1{101} \approx 0.0099 < 0.01$，第一个达标，输出 `101`。初始代码写 `> eps`，$n=1$ 时 $|1-0|=1>0.01$ 就误停。ε-N 语言的方向——"想多近有多近"——靠的是找那个"进入邻域"的门槛 $N$，方向一错就成"越远越好"。

</details>
