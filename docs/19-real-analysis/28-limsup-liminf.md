---
title: 上极限与下极限
lesson_id: real-analysis/limsup-liminf
prereqs:
  - real-analysis/monotone-bw
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L7
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_concepts:
  - limsup
  - liminf
applications:
  - convergence-tests
  - probability
exits:
  - measure-theory
  - probability
---

# 上极限与下极限

## 1. 从一个场景开始

数列 $1, 0, 1, 0, 1, 0, \ldots$ 不收敛——它永远在 0 和 1 之间跳。但说它"完全没有趋势"也不对：它确实被限制在 $[0,1]$ 内，而且不比 1 大、不比 0 小。上极限和下极限正是捕捉这种"虽然不收敛，但上下界有极限"的工具。

## 2. 直觉解释

想象你站在山脚下观察一座不断变化的山：

- **上极限**（$\limsup$）：你记录每一刻的**最高点**，然后看这些最高点最终趋向哪里。它是"最终的天花板"。
- **下极限**（$\liminf$）：你记录每一刻的**最低点**，然后看这些最低点最终趋向哪里。它是"最终的地板"。

如果天花板和地板合拢到同一个高度，数列就收敛；如果它们有间距，数列就在这个间距里振荡。

对 $a_n = (-1)^n + 1/n$：

| $n$ | 1 | 2 | 3 | 4 | 5 | 6 | … |
| --- | --- | --- | --- | --- | --- | --- | --- |
| $a_n$ | 0 | 1.5 | -0.67 | 1.25 | -0.8 | 1.17 | … |

偶数项趋向 $+1$，奇数项趋向 $-1$。所以 $\limsup = 1$，$\liminf = -1$。

## 3. 正式定义

设 $\lbrace a_n\rbrace$ 是有界数列。定义**尾部上确界**：

$$b_n = \sup\lbrace a_k \mid k \geq n\rbrace = \sup_{k \geq n} a_k$$

$\lbrace b_n\rbrace$ 是递减数列（尾部越短，上确界越小），且有下界，由单调收敛定理有极限。定义：

$$\limsup_{n \to \infty} a_n = \lim_{n \to \infty} b_n = \lim_{n \to \infty} \sup_{k \geq n} a_k$$

类似地：

$$\liminf_{n \to \infty} a_n = \lim_{n \to \infty} \inf_{k \geq n} a_k$$

**等价刻画**：$\limsup a_n$ 是 $\lbrace a_n\rbrace$ 所有收敛子列的极限中的**最大值**。

**核心定理**：

$$\liminf a_n \leq \limsup a_n$$

$$\lim a_n \text{ 存在} \iff \liminf a_n = \limsup a_n$$

此时共同值就是 $\lim a_n$。

## 4. 分步例题

**例 1**：求 $a_n = (-1)^n(1 + 1/n)$ 的 $\limsup$ 和 $\liminf$。

1. 写出几项：$a_1 = -2$，$a_2 = 1.5$，$a_3 = -1.33$，$a_4 = 1.25$，……
2. 偶数子列 $a_{2k} = 1 + 1/(2k) \to 1$。
3. 奇数子列 $a_{2k-1} = -(1 + 1/(2k-1)) \to -1$。
4. 所有子列极限的集合为 $\lbrace -1, 1\rbrace$（其他子列必收敛到这两个值之一）。
5. $\limsup a_n = 1$，$\liminf a_n = -1$。

**例 2**：求 $a_n = \sin(n)$ 的 $\limsup$ 和 $\liminf$。

1. $\sin(n)$ 在 $[-1, 1]$ 中稠密（因为 $\pi$ 是无理数，$n \mod 2\pi$ 在 $[0, 2\pi)$ 中稠密）。
2. 子列极限的集合是整个 $[-1, 1]$。
3. $\limsup \sin(n) = 1$，$\liminf \sin(n) = -1$。

## 5. 动手实验

### 实验 1：尾部上确界和下确界的收敛

```python title="画出 b_n = sup_{k≥n} a_k 和 c_n = inf_{k≥n} a_k"
import matplotlib.pyplot as plt

# a_n = (-1)^n * (1 + 1/n)
N = 50
a = [((-1)**n) * (1 + 1/n) for n in range(1, N+1)]

sup_tail = []                  # 尾部上确界序列
inf_tail = []                  # 尾部下确界序列
for n in range(N):
    tail = a[n:]               # a[n:]：从第 n 项到末尾的切片
    sup_tail.append(max(tail)) # max()：内置函数，返回最大值
    inf_tail.append(min(tail))

plt.plot(range(1, N+1), a, "o", markersize=3, alpha=0.4, label="a_n")
plt.plot(range(1, N+1), sup_tail, "r-", linewidth=2, label="sup tail (→ limsup)")
plt.plot(range(1, N+1), inf_tail, "b-", linewidth=2, label="inf tail (→ liminf)")
plt.axhline(y=1, color="red", linestyle="--", alpha=0.3)
plt.axhline(y=-1, color="blue", linestyle="--", alpha=0.3)
plt.legend()
plt.xlabel("n")
plt.title("尾部上下确界趋向 limsup / liminf")
plt.grid(True)
```

红线（尾部上确界）单调下降趋向 1，蓝线（尾部下确界）单调上升趋向 -1。

### 实验 2：振荡数列的"地板和天花板"

```python title="limsup/liminf 作为最终的天花板和地板"
import matplotlib.pyplot as plt

# sliders: r=0.9 [0.1:1.0:0.05]
N = 60
import math
a = [r**n * math.cos(n * math.pi / 3) for n in range(N)]

plt.figure(figsize=(8, 3))
plt.plot(a, "o-", markersize=4)
plt.axhline(y=max(a[N//2:]), color="red", linestyle="--", label="后半段上界")
plt.axhline(y=min(a[N//2:]), color="blue", linestyle="--", label="后半段下界")
plt.legend()
plt.title(f"衰减振荡：r={r}")
plt.grid(True)
```

当 $r < 1$ 时振幅衰减，$\limsup$ 和 $\liminf$ 都趋向 0——数列收敛。拖动滑块看 $r$ 接近 1 时上下界如何撑开。

### 实验 3：$\sin(n)$ 的稠密性

```python title="sin(n) 的值在 [-1,1] 中稠密"
import matplotlib.pyplot as plt
import math

N = 2000
vals = [math.sin(n) for n in range(N)]

plt.figure(figsize=(8, 2))
plt.scatter(range(N), vals, s=0.5, alpha=0.3)
plt.axhline(y=1, color="red", linestyle="--")
plt.axhline(y=-1, color="blue", linestyle="--")
plt.ylim(-1.1, 1.1)
plt.title(f"sin(n), n=0..{N-1}：值在 [-1,1] 中稠密")
plt.xlabel("n")
```

点填满了整个 $[-1, 1]$ 带——说明 $\limsup = 1$，$\liminf = -1$。

### 实验 4：数列的上下极限收敛图

```viz
{
  "type": "plot",
  "title": "数列的 limsup 与 liminf",
  "expr": "(-1)^floor(x) * (1 + a/floor(x+1))",
  "xmin": 1,
  "xmax": 30,
  "ymin": -2.5,
  "ymax": 2.5,
  "sliders": [
    {"name": "a", "min": 0.5, "max": 5, "step": 0.5, "value": 1}
  ]
}
```

数列 a_n = (-1)^n (1 + a/n) 的项在上下两条水平线之间振荡。红线趋向 limsup=1，蓝线趋向 liminf=-1。拖动滑块 a 改变振荡幅度，但极限不变。

## 6. 练习

```quiz
数列 0, 1, 2, 0, 1, 2, ... 的 limsup 和 liminf 分别是多少？
- limsup=2, liminf=0 [*]
- limsup=2, liminf=1
- limsup=1, liminf=0
? 该数列周期为 3，子列极限集合为 {0,1,2}。limsup 是子列极限的最大值=2，liminf 是最小值=0。
```

```quiz
lim a_n 存在的充要条件是什么？
- limsup a_n = 0
- liminf a_n = limsup a_n [*]
- liminf a_n < limsup a_n
? lim 存在当且仅当 liminf = limsup，此时共同值就是极限。若两者不等，数列在它们之间振荡，不收敛。
```

**练习 1**：求以下数列的 $\limsup$ 和 $\liminf$：

(a) $a_n = n \mod 3$（即 $0, 1, 2, 0, 1, 2, \ldots$）
(b) $a_n = 1 + (-1)^n / n$

```exercise
# @title: 求 limsup 和 liminf
# @check: (a) limsup = 2, liminf = 0
# @check: (b) limsup = 1.0, liminf = 1.0
# @hint: 画出前几项，找子列的极限
import math

# (a) n mod 3
a_seq = [n % 3 for n in range(30)]
limsup_a = max(a_seq[-10:])     # 用最后 10 项近似
liminf_a = min(a_seq[-10:])
print(f"(a) limsup = {limsup_a}, liminf = {liminf_a}")

# (b) 1 + (-1)^n / n
b_seq = [1 + ((-1)**n) / n for n in range(1, 30)]
limsup_b = max(b_seq[-10:])
liminf_b = min(b_seq[-10:])
print(f"(b) limsup = {limsup_b}, liminf = {liminf_b}")
```

**练习 2**：用 $\limsup$ 和 $\liminf$ 判断 $a_n = \cos(n\pi/4)$ 是否收敛。

<details>
<summary>点开查看解答</summary>

$\cos(n\pi/4)$ 按周期 8 循环：$\cos(0)=1$，$\cos(\pi/4)=\frac{\sqrt{2}}{2}$，$\cos(\pi/2)=0$，……，$\cos(7\pi/4)=\frac{\sqrt{2}}{2}$，然后重复。

子列极限的集合是 $\lbrace 1, \frac{\sqrt{2}}{2}, 0, -\frac{\sqrt{2}}{2}, -1\rbrace$。

$\limsup = 1 \neq -1 = \liminf$，所以数列**不收敛**。
</details>

## 7. 选读：$\limsup$ 的子列刻画

<details>
<summary>选读 · 为什么 $\limsup$ 是子列极限的最大值</summary>

**定理**：$\limsup_{n\to\infty} a_n = \max\lbrace \text{所有收敛子列的极限}\rbrace$。

**证明**：记 $L = \limsup a_n = \lim_{n\to\infty} \sup_{k\geq n} a_k$。

**第一步**：存在子列趋向 $L$。对每个 $n$，$\sup_{k\geq n} a_k \geq L$，所以存在 $k_n \geq n$ 使 $a_{k_n} > L - 1/n$。同时 $a_{k_n} \leq \sup_{k\geq n} a_k \to L$。由夹逼，$a_{k_n} \to L$。

**第二步**：$L$ 是最大的子列极限。设子列 $a_{m_j} \to M$。对充分大的 $j$，$m_j \geq n$，所以 $a_{m_j} \leq \sup_{k\geq n} a_k$。取极限得 $M \leq L$。

因此 $L$ 确实是所有子列极限的最大值。$\liminf$ 的证明完全对称。

</details>

## 8. 下一站

从数列的极限，我们走向函数的极限、导数、积分——多元函数的世界里，一个全新的工具等待着我们：反函数定理和隐函数定理。

→ [反函数定理与隐函数定理](../20-multivariable-calc/68-inverse-implicit-function.md)
