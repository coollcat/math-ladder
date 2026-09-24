---
title: 偏序关系与良序
lesson_id: math-language/partial-order-well-order
prereqs:
  - math-language/sets-relations-functions
introduces_math: []
introduces_builtin:
  - min
introduces_import: []
volume: 2
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_concepts:
  - partial-order
  - total-order
  - well-order
  - hasse-diagram
applications:
  - scheduling
  - set-inclusion
exits:
  - abstract-algebra
  - order-theory
---

# 偏序关系与良序

## 1. 从一个场景开始

大学选课表里，"数据结构"要求先修"程序设计基础"，"算法"要求先修"数据结构"。这些依赖关系不是全序的——"线性代数"和"程序设计基础"之间没有先后要求。但只要有依赖关系，就不能乱排。偏序关系描述的正是这种"部分有先后、部分不可比"的结构。

## 2. 直觉解释

想象一群人站在一起，有些人之间可以比较高矮，有些人不能（比如一人站着一人蹲着，没法直接比）。

- **全序**：任意两个人都能比高矮——所有元素排成一条线。
- **偏序**：有些能比，有些不能——元素排成一棵树或一个有向无环图。
- **良序**：任意非空子集都有"最矮的人"——不管你怎么挑一堆人，总能找到最小的。

自然数 $\lbrace 0, 1, 2, 3, \ldots\rbrace$ 按 $\leq$ 既是全序又是良序；幂集 $\mathcal{P}(S)$ 按 $\subseteq$ 是偏序但不是全序（$\lbrace 1\rbrace$ 和 $\lbrace 2\rbrace$ 不可比）。

## 3. 正式定义

集合 $P$ 上的二元关系 $\preceq$ 若满足以下三条，称为**偏序**：

| 性质 | 符号 | 含义 |
| --- | --- | --- |
| 自反性 | $\forall a,\; a \preceq a$ | 自己不大于自己 |
| 反对称性 | $a \preceq b \land b \preceq a \Rightarrow a = b$ | 互相不大于则相等 |
| 传递性 | $a \preceq b \land b \preceq c \Rightarrow a \preceq c$ | 可链式传递 |

记作 $(P, \preceq)$，称为**偏序集**。

- **全序**（线序）：偏序 + 任意两个元素可比，即 $\forall a,b \in P,\; a \preceq b \lor b \preceq a$。
- **良序**：全序 + 任意非空子集都有最小元。

**哈斯图**：偏序集的简化有向图——省略自反环和传递边，只画"直接覆盖"关系。

## 4. 分步例题

**例 1**：画出 $\lbrace 1, 2, 3, 4, 6, 12\rbrace$ 按整除关系 $|$ 的哈斯图。

1. 列出覆盖关系（$a \prec b$ 且中间没有 $c$ 使 $a \prec c \prec b$）：
   - $1 \mid 2$，$1 \mid 3$
   - $2 \mid 4$，$2 \mid 6$，$3 \mid 6$
   - $4 \mid 12$，$6 \mid 12$
2. 画图：底层 1，第二层 2 和 3，第三层 4 和 6，顶层 12。
3. 边：$1 \to 2$，$1 \to 3$，$2 \to 4$，$2 \to 6$，$3 \to 6$，$4 \to 12$，$6 \to 12$。

这不是全序，因为 4 和 6 不可比（$4 \nmid 6$ 且 $6 \nmid 4$）。

**例 2**：$(\mathbb{N}, \leq)$ 是良序吗？

是。对任意非空 $A \subseteq \mathbb{N}$，取 $n_0 = \min A$（自然数的非空子集一定有最小元——这就是良序原理，等价于数学归纳法）。

但 $(\mathbb{Z}, \leq)$ 不是良序，因为 $\mathbb{Z}$ 本身没有最小元。

## 5. 动手实验

### 实验 1：哈斯图可视化

```python title="幂集 {a,b,c} 的包含关系哈斯图"
import matplotlib.pyplot as plt

# 用 3 位二进制编码 {a,b,c} 的子集：bit 0=a, bit 1=b, bit 2=c
labels = ["∅", "a", "b", "c", "ab", "ac", "bc", "abc"]
# 每个子集的�级 = 元素个数（popcount）
levels = [0, 1, 1, 1, 2, 2, 2, 3]

fig, ax = plt.subplots(figsize=(6, 4))
for i, label in enumerate(labels):
    ax.plot(i, levels[i], "o", markersize=14, color="steelblue")
    ax.annotate(label, (i, levels[i]), textcoords="offset points",
                xytext=(0, 12), ha="center", fontsize=9)

# 覆盖边（手动列举）
edges = [(0,1),(0,2),(0,3),(1,4),(1,5),(2,4),(2,6),(3,5),(3,6),(4,7),(5,7),(6,7)]
for u, v in edges:
    ax.plot([u, v], [levels[u], levels[v]], "k-", linewidth=0.8)

ax.set_yticks([0, 1, 2, 3])
ax.set_ylabel("元素个数（层级）")
ax.set_title("P({a,b,c}) 的哈斯图")
ax.set_xticks([])
plt.tight_layout()
```

注意：ab 和 ac 不可比——偏序不是全序。

### 实验 2：检验良序性质

```python title="随机取自然数子集，验证一定有最小元"
import random

for trial in range(5):
    subset = set(random.sample(range(1, 100), k=random.randint(3, 8)))
    # set()：集合；random.sample：无重复随机抽取
    minimum = min(subset)       # min()：内置函数，返回最小值
    print(f"子集 {sorted(subset)} → 最小元 = {minimum}")
```

每次运行，任意子集都能找到最小元——这就是 $\mathbb{N}$ 的良序性。

### 实验 3：偏序 vs 全序的矩阵

```python title="可比性矩阵：偏序与全序的区别"
import numpy as np
import matplotlib.pyplot as plt

# 整除偏序 vs 自然数全序
n = 8
div_mat = np.zeros((n, n))     # 整除矩阵
leq_mat = np.zeros((n, n))     # 全序矩阵
for i in range(1, n + 1):
    for j in range(1, n + 1):
        if j % i == 0:
            div_mat[i-1][j-1] = 1
        if i <= j:
            leq_mat[i-1][j-1] = 1

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
ax1.imshow(div_mat, cmap="Blues", origin="upper")
ax1.set_title("整除偏序")
ax1.set_xticks(range(n)); ax1.set_xticklabels(range(1, n+1))
ax1.set_yticks(range(n)); ax1.set_yticklabels(range(1, n+1))

ax2.imshow(leq_mat, cmap="Blues", origin="upper")
ax2.set_title("自然数全序 ≤")
ax2.set_xticks(range(n)); ax2.set_xticklabels(range(1, n+1))
ax2.set_yticks(range(n)); ax2.set_yticklabels(range(1, n+1))

plt.tight_layout()
```

全序矩阵是**下三角全 1**（每对元素都能比）；偏序矩阵有一些空洞（不可比的元素对）。

### 实验 4：偏序的哈斯图可视化

```viz
{
  "type": "plot",
  "title": "整除偏序哈斯图",
  "expr": "floor(x)",
  "xmin": 0,
  "xmax": 13,
  "ymin": -0.5,
  "ymax": 3.5,
  "sliders": []
}
```

图中每个整数按其质因数个数（层级）排列，连线表示直接整除关系。比较 4 和 6——它们不可比，这正是偏序与全序的区别。

## 6. 练习

```quiz
偏序关系必须满足哪些性质？
- 自反性、对称性、传递性
- 自反性、反对称性、传递性 [*]
- 反自反性、反对称性、传递性
? 偏序需要自反性（a≤a）、反对称性（a≤b且b≤a⇒a=b）和传递性。对称性是等价关系的要求，不是偏序的。
```

```quiz
自然数集 N 按 ≤ 是良序，但整数集 Z 按 ≤ 不是良序。为什么？
- Z 不满足传递性
- Z 本身没有最小元 [*]
- Z 不满足反对称性
? 良序要求任意非空子集都有最小元。Z 本身是非空子集但没有最小元（可以无限取负），所以不是良序。
```

**练习 1**：判断以下关系哪些是偏序、全序、良序：

(a) $(\mathbb{Q}^+, \leq)$
(b) $(\mathbb{Q}^+, |)$（整除）
(c) $(\lbrace 1, 2, 4, 8, 16\rbrace, |)$

<details>
<summary>点开查看解答</summary>

(a) 全序（任意两个正有理数可比），但**不是**良序：子集 $\lbrace 1, 1/2, 1/3, \ldots\rbrace$ 没有最小元。

(b) 偏序，但不是全序（$2 \nmid 3$ 且 $3 \nmid 2$）。

(c) 全序（$1 \mid 2 \mid 4 \mid 8 \mid 16$），也是良序（有限全序集自动良序）。
</details>

**练习 2**：画出 $\lbrace 2, 3, 4, 6, 8, 12\rbrace$ 按整除关系的哈斯图，并找出所有极大元和极小元。

```exercise
# @title: 整除哈斯图
# @check: 极小元 = {2, 3}
# @check: 极大元 = {8, 12}
# @hint: 极小元是没有更小的元素能整除它的；极大元是它不能整除任何更大的元素
S = [2, 3, 4, 6, 8, 12]
minimal = []
maximal = []
for a in S:
    is_minimal = True          # 假设 a 是极小元
    is_maximal = True          # 假设 a 是极大元
    for b in S:
        if a != b and b % a == 0:   # b 能被 a 整除 → a 不是极大元
            is_maximal = False
        if a != b and a % b == 0:   # a 能被 b 整除 → a 不是极小元
            is_minimal = False
    if is_minimal:
        minimal.append(a)
    if is_maximal:
        maximal.append(a)

print(f"极小元 = {set(minimal)}")
print(f"极大元 = {set(maximal)}")
```

## 7. 选读：良序原理与强归纳法

<details>
<summary>选读 · 良序原理为何等价于归纳法</summary>

**良序原理**：$\mathbb{N}$ 的每个非空子集都有最小元。

**强归纳法**：若 $P(0)$ 成立，且 $\forall k\,[(\forall j < k,\; P(j)) \Rightarrow P(k)]$，则 $\forall n,\; P(n)$。

二者等价。从良序推出强归纳法：假设 $P$ 不恒真，令 $S = \lbrace n \in \mathbb{N} \mid \neg P(n)\rbrace$，$S$ 非空，取 $n_0 = \min S$。则 $P(0), P(1), \ldots, P(n_0-1)$ 全真，由归纳步得 $P(n_0)$ 真——矛盾。

从强归纳推出良序：设 $A \subseteq \mathbb{N}$ 非空但无最小元。令 $P(n) = "n \notin A"$。$P(0)$ 真（否则 0 是 $A$ 的最小元）。若 $\forall j < k,\; P(j)$，则 $k \notin A$（否则 $k$ 是 $A$ 的最小元）。由强归纳，$P(n)$ 对所有 $n$ 成立，即 $A = \emptyset$——矛盾。

所以"自然数可以做归纳"和"自然数总有最小元"是同一件事的两面。

</details>

## 8. 下一站

偏序让我们区分了"可比"和"不可比"。如果集合里元素多到数不清呢？哪些集合能一个一个列出来，哪些根本列不完？

→ [可数与不可数](./65-countable-uncountable.md)
