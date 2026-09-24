---
title: 可数与不可数
lesson_id: math-language/countable-uncountable
prereqs:
  - math-language/induction-advanced
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L5
track:
  - discrete-computing
  - analysis-change
stage: university-core
difficulty: 4
introduces_concepts:
  - countable-set
  - aleph-null
  - cantor-diagonal
applications:
  - computability
  - measure-theory
exits:
  - set-theory
  - measure-lebesgue
---

# 可数与不可数

## 1. 从一个场景开始

自然数有无穷多个，整数也有无穷多个——它们"一样多"吗？直觉说整数应该更多（它包含了正的和负的），但数学给出的答案令人意外：它们**一样多**。那实数呢？实数也是无穷多——但这次，它确实比自然数**多得多**。无穷不止一种大小。

## 2. 直觉解释

两个集合"一样多"意味着什么？对有限集很简单：把元素一一配对，配完没有剩余就行。

对无穷集，我们沿用同样的思路：如果能把集合 $A$ 的每个元素和集合 $B$ 的每个元素**一一配对**（双射），就说它们"一样多"。

- 整数和自然数能配对：$0 \leftrightarrow 0$，$1 \leftrightarrow 1$，$-1 \leftrightarrow 2$，$2 \leftrightarrow 3$，$-2 \leftrightarrow 4$，…… 交错排列就能覆盖所有整数。
- 有理数和自然数也能配对：把所有分数排成二维表格，走对角线蛇形遍历。
- 但实数不能——康托尔用一个巧妙的"对角线论证"证明了这一点。

能和自然数一一对应的集合叫**可数集**；不能的叫**不可数集**。

## 3. 正式定义

**定义**：集合 $S$ 是**可数的**（countable），若存在双射 $f: \mathbb{N} \to S$（或 $S$ 有限）。若 $S$ 无穷且可数，称 $S$ 为**可数无穷集**，其基数记为 $\aleph_0$（读作"阿列夫零"）。

**关键事实**：

| 集合 | 可数？ | 基数 |
| --- | --- | --- |
| $\mathbb{N}$ | 是 | $\aleph_0$ |
| $\mathbb{Z}$ | 是 | $\aleph_0$ |
| $\mathbb{Q}$ | 是 | $\aleph_0$ |
| $\mathbb{R}$ | **否** | $\mathfrak{c} = 2^{\aleph_0}$ |
| $[0,1]$ | **否** | $\mathfrak{c}$ |

**康托尔对角线定理**：$[0,1]$ 不可数。

证明思路：假设 $[0,1]$ 可数，则可将所有元素排成序列 $x_1, x_2, x_3, \ldots$。写出十进制展开：

$$x_1 = 0.d_{11}d_{12}d_{13}\ldots$$
$$x_2 = 0.d_{21}d_{22}d_{23}\ldots$$
$$x_3 = 0.d_{31}d_{32}d_{33}\ldots$$

构造一个新数 $y = 0.e_1 e_2 e_3 \ldots$，其中 $e_n \neq d_{nn}$（比如 $e_n = 5$ 若 $d_{nn} \neq 5$，否则 $e_n = 6$）。则 $y$ 与每个 $x_n$ 至少在第 $n$ 位不同，所以 $y \notin \lbrace x_1, x_2, \ldots\rbrace$——矛盾。

## 4. 分步例题

**例 1**：证明偶数集 $2\mathbb{N} = \lbrace 0, 2, 4, 6, \ldots\rbrace$ 可数。

1. 构造映射 $f: \mathbb{N} \to 2\mathbb{N}$，$f(n) = 2n$。
2. 单射：若 $f(a) = f(b)$，则 $2a = 2b$，所以 $a = b$。✓
3. 满射：对任意偶数 $2k \in 2\mathbb{N}$，取 $n = k$ 即 $f(k) = 2k$。✓
4. 结论：$f$ 是双射，$|2\mathbb{N}| = \aleph_0$。

**例 2**：证明 $\mathbb{N} \times \mathbb{N}$ 可数。

1. 用"康托尔配对函数"：$f(m,n) = \frac{(m+n)(m+n+1)}{2} + m$。
2. 这个函数按对角线枚举所有 $(m,n)$ 对：$(0,0)$，$(0,1)$，$(1,0)$，$(0,2)$，$(1,1)$，$(2,0)$，……
3. 它是双射，所以 $|\mathbb{N} \times \mathbb{N}| = \aleph_0$。

## 5. 动手实验

### 实验 1：整数的可数排列

```python title="把整数排成一个序列，与自然数一一配对"
def int_to_nat(n):
    """把整数 n 映射到自然数：0→0, 1→1, -1→2, 2→3, -2→4, ..."""
    if n >= 0:
        return 2 * n            # 非负整数映射到偶数位置
    else:
        return 2 * (-n) - 1     # 负整数映射到奇数位置

# 验证前 10 个自然数对应的整数
nat_to_int = {}                 # 反向映射字典
for z in range(-5, 6):
    n = int_to_nat(z)
    nat_to_int[n] = z
    print(f"整数 {z:+d} ↔ 自然数 {n}")

print("\n按自然数顺序排列整数：")
for n in sorted(nat_to_int):
    print(f"  n={n} → {nat_to_int[n]}")
```

### 实验 2：对角线论证模拟

```python title="模拟康托尔对角线：构造一个不在列表中的数"
import random

# 假装这些是 [0,1] 中所有实数的前 10 位小数（当然不可能真的全部列出）
digits = []
for i in range(10):
    row = [random.randint(0, 9) for _ in range(10)]  # 每行 10 位随机数字
    digits.append(row)

# 取对角线
diagonal = [digits[i][i] for i in range(10)]
print(f"对角线元素: {diagonal}")

# 构造新数：每位都与对角线不同
new_number = []
for d in diagonal:
    new_number.append((d + 1) % 10)   # 加 1 取模 10，确保不等于原数字
print(f"新数的数字: {new_number}")

# 验证：新数与每一行都不同
for i in range(10):
    differs = new_number[i] != digits[i][i]
    print(f"与第 {i} 行在第 {i} 位不同: {differs}")
```

### 实验 3：有理数的蛇形遍历

```python title="按对角线顺序枚举正有理数"
# sliders: max_sum=6 [3:12:1]
rationals = []
for s in range(2, max_sum + 1):          # 对角线 s = m + n
    for m in range(1, s):                # m 从 1 到 s-1
        n = s - m                        # n = s - m
        if m < n:                        # 只取 m/n < 1 的，避免重复
            rationals.append((m, n))

for i, (m, n) in enumerate(rationals):
    print(f"第 {i} 个: {m}/{n} = {m/n:.4f}")
```

每条对角线上 $m+n = s$ 是常数，蛇形走过所有正有理数。

### 实验 4：康托尔对角线可视化

```viz
{
  "type": "plot",
  "title": "康托尔对角线论证示意",
  "expr": "sin(pi*x)",
  "xmin": 0,
  "xmax": 10,
  "ymin": -1.5,
  "ymax": 1.5,
  "sliders": [
    {"name": "a", "min": 1, "max": 9, "step": 1, "value": 5}
  ]
}
```

每个整数点代表一个小数的某一位。对角线元素（x=1,2,3,...处的值）构成一个序列，滑块 a 控制构造的新数在对角线上的偏移——新数与每一行至少有一位不同，因此不在列表中。

## 6. 练习

```quiz
以下哪个集合是不可数的？
- 所有有限长的英文字母串
- 所有整系数多项式的根（代数数）
- 所有无穷的 0-1 序列 [*]
? 无穷 0-1 序列构成 {0,1}^N，可以用对角线论证证明不可数。前两个都是可数集。
```

```quiz
整数集 Z 和自然数集 N 的基数关系是什么？
- Z 的基数更大
- 两者基数相等，都是 ℵ₀ [*]
- 无法比较
? 存在双射 f:N→Z（如 0→0, 1→1, -1→2, 2→3, -2→4,...），所以 |Z|=|N|=ℵ₀，整数集可数。
```

**练习 1**：证明奇数集可数，给出具体的双射公式。

```exercise
# @title: 奇数集可数
# @check: f(0) = 1
# @check: f(1) = 3
# @check: f(4) = 9
# @hint: 第 n 个奇数是什么？
def f(n):
    return n + 1                # ← 试试改对公式

for n in range(5):
    print(f"f({n}) = {f(n)}")
```

**练习 2**：以下集合哪些可数、哪些不可数？给出理由。

(a) 所有有限长的英文字母串
(b) 所有无穷的 0-1 序列
(c) 所有代数数（整系数多项式的根）

<details>
<summary>点开查看解答</summary>

(a) **可数**。先按长度分组，每组有限，再把各组拼起来（可数个有限集的并仍可数）。

(b) **不可数**。这就是 $\lbrace 0,1\rbrace^\mathbb{N}$，可用对角线论证：假设列出了所有序列 $s_1, s_2, \ldots$，构造 $t$ 使 $t_n \neq (s_n)_n$，则 $t$ 不在列表中。

(c) **可数**。每个整系数多项式由有限个整数确定（$\mathbb{Z}^k$ 可数），每个多项式只有有限个根，可数个有限集的并仍可数。
</details>

## 7. 选读：连续统假设

<details>
<summary>选读 · $\aleph_0$ 与 $\mathfrak{c}$ 之间有没有别的无穷？</summary>

康托尔证明了 $\aleph_0 < \mathfrak{c}$（自然数比实数"少"）。他猜想不存在严格介于二者之间的基数——这就是**连续统假设**（CH）：

$$\nexists\, S \subseteq \mathbb{R},\quad \aleph_0 < |S| < \mathfrak{c}$$

1940 年，哥德尔证明 CH 与 ZFC 公理系统不矛盾。1963 年，科恩证明 CH 的否定也不矛盾。因此 CH 在 ZFC 中**独立**——既不能证明也不能否定。

这意味着"无穷有多少种大小"这个问题，在标准数学公理下没有唯一答案。集合论的这个角落，至今仍是数学基础中最深刻的开放问题之一。

</details>

## 8. 下一站

我们已经学会了区分"大小不同的无穷"。现在回到分析学——当数列有无穷多个聚点时，如何精确描述它的"最终趋势"？

→ [上极限与下极限](../19-real-analysis/28-limsup-liminf.md)
