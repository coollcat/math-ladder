---
title: σ-代数与 Borel 集
lesson_id: measure-lebesgue/sigma-algebra
prereqs:
  - measure-lebesgue/from-length-to-measure
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L10
track:
  - analysis-change
  - probability-discrete
stage: university-core
difficulty: 4
introduces_concepts:
  - sigma-algebra
  - borel-sigma-algebra
  - generated-sigma-algebra
applications:
  - probability-axioms
  - measurable-functions
exits:
  - probability-measure
  - functional-analysis
---

# σ-代数与 Borel 集

## 1. 从一个场景开始

"任意集合都有长度"这句话对吗？不对——Vitali 集合表明，如果我们坚持长度的几条合理性质（平移不变、可数可加），就一定存在**无法测量**的集合。σ-代数正是回答"哪些集合可以被测量"的框架：它规定了测量的"合法操作范围"。

## 2. 直觉解释

想象你是一个"测量员"，手里有一把尺子。你能测量区间 $[0,1]$ 的长度是 1。但你能测量 $[0,1] \cap \mathbb{Q}$（$[0,1]$ 中的有理数）的长度吗？

σ-代数就是你"许可证"上写的：你可以测量哪些集合。它必须满足三条规则：

1. 全集可以测量
2. 如果 $A$ 可以测量，$A$ 的补集也可以
3. 如果一列集合 $A_1, A_2, \ldots$ 都可以测量，它们的并集也可以

这三条规则确保了你做补集、并集操作时不会"出界"。

## 3. 正式定义

**σ-代数**（σ-域）：集合 $X$ 的子集族 $\mathcal{F}$ 若满足以下三条，称为 $X$ 上的 σ-代数：

| 性质 | 符号 | 含义 |
| --- | --- | --- |
| 包含全集 | $X \in \mathcal{F}$ | 全集可测 |
| 对补集封闭 | $A \in \mathcal{F} \Rightarrow A^c \in \mathcal{F}$ | 补集可测 |
| 对可数并封闭 | $A_n \in \mathcal{F} \Rightarrow \bigcup_{n=1}^\infty A_n \in \mathcal{F}$ | 可数并可测 |

**推论**：σ-代数也对可数交封闭（由 De Morgan 律：$\bigcap A_n = (\bigcup A_n^c)^c$）。

**Borel σ-代数**：$\mathbb{R}$ 上由所有开集生成的 σ-代数，记为 $\mathcal{B}(\mathbb{R})$。其中的集合叫 **Borel 集**。

**生成 σ-代数**：对任意集族 $\mathcal{C}$，$\sigma(\mathcal{C})$ 是包含 $\mathcal{C}$ 的最小 σ-代数（所有包含 $\mathcal{C}$ 的 σ-代数的交）。

## 4. 分步例题

**例 1**：$X = \{1, 2, 3\}$ 上有哪些 σ-代数？

1. 最小的：$\{\emptyset, X\}$（只有空集和全集）。
2. 若包含 $\{1\}$，则必含 $\{2,3\}$（补集），进一步必含 $\{1,2\}$, $\{3\}$, $\{2\}$, $\{1,3\}$, $\emptyset$, $X$——整个幂集 $\mathcal{P}(X)$。
3. 有限集上的 σ-代数一定是有限代数（因为可数并退化为有限并）。

**例 2**：$[0,1]$ 中的 Borel 集有哪些？

1. 所有开区间 $(a,b)$ 是 Borel 集。
2. 所有闭区间 $[a,b]$ 是 Borel 集（$[a,b] = (a,b)^c \cap \ldots$ 用开集的可数交表示）。
3. 所有单点集 $\{x\}$ 是 Borel 集（$\{x\} = \bigcap_{n=1}^\infty (x-1/n, x+1/n)$）。
4. $\mathbb{Q}$ 是 Borel 集（可数集 = 可数个单点集的并）。
5. 但存在不是 Borel 的集合（虽然很难构造）。

**例 3**：$\sigma(\{(0,1)\})$ 是什么？

1. 包含 $(0,1)$，必含 $(0,1)^c = (-\infty, 0] \cup [1, \infty)$。
2. 只需对这两块做可数并/交/补——结果是 $\{\emptyset, (0,1), (0,1)^c, \mathbb{R}\}$。
3. 验证：这四集合确实构成 σ-代数。

## 5. 动手实验

### 实验 1：有限集上的 σ-代数

```python title="枚举 X={0,1,2} 上所有 σ-代数"
from itertools import combinations

X = frozenset({0, 1, 2})        # frozenset：不可变集合
power_set = []
for r in range(len(X) + 1):
    for c in combinations(X, r):
        power_set.append(frozenset(c))

def is_sigma_algebra(X, family):
    """检查 family 是否是 X 上的 σ-代数"""
    if X not in family or frozenset() not in family:
        return False
    for A in family:
        if X - A not in family:  # 补集封闭
            return False
    # 对有限集，可数并退化为有限并
    for A in family:
        for B in family:
            if A | B not in family:  # 并集封闭
                return False
    return True

# 枚举所有子集族，找出 σ-代数
sigma_algebras = []
for r in range(1, len(power_set) + 1):
    for fam in combinations(power_set, r):
        fam_set = set(fam)
        if is_sigma_algebra(X, fam_set):
            sigma_algebras.append(fam_set)

print(f"X={set(X)} 上的 σ-代数（共 {len(sigma_algebras)} 个）：")
for i, sa in enumerate(sigma_algebras):
    print(f"  {i+1}. {[set(s) for s in sorted(sa, key=lambda s: (len(s), sorted(s)))]}")
```

### 实验 2：Borel 集的层级

```python title="从开区间出发，逐步生成 Borel 集"
import matplotlib.pyplot as plt
import numpy as np

# 可视化：从开区间出发，通过补集、并集、交集生成越来越复杂的集合
fig, axes = plt.subplots(2, 3, figsize=(12, 6))

# 层 0：开区间
ax = axes[0, 0]
for a, b in [(0.2, 0.5), (0.6, 0.9)]:
    ax.fill_between([a, b], 0, 1, alpha=0.5, color="blue")
ax.set_title("层 0：开区间")
ax.set_xlim(0, 1); ax.set_ylim(0, 1)

# 层 1：补集（闭区间和无穷区间）
ax = axes[0, 1]
ax.fill_between([0, 0.2], 0, 1, alpha=0.5, color="red")
ax.fill_between([0.5, 0.6], 0, 1, alpha=0.5, color="red")
ax.fill_between([0.9, 1], 0, 1, alpha=0.5, color="red")
ax.set_title("层 1：补集（闭区间）")

# 层 2：可数并（Fσ 集）
ax = axes[0, 2]
for n in range(1, 8):
    a = 1/(n+1)
    b = 1/n
    ax.fill_between([a, b], 0, 1, alpha=0.4, color="green")
ax.set_title("层 2：Fσ（可数个闭区间的并）")

# 层 3：可数交（Gδ 集）
ax = axes[1, 0]
for n in range(1, 8):
    a = -1/n
    b = 1 + 1/n
    ax.fill_between([max(a,0), min(b,1)], 0, 1, alpha=0.15, color="purple")
ax.set_title("层 3：Gδ（可数个开集的交）")

# 层 4：单点集 = Gδ
ax = axes[1, 1]
ax.fill_between([0.5, 0.501], 0, 1, alpha=0.8, color="orange")
ax.set_title("单点集 {0.5}（Gδ 集）")

# 层 5：Q ∩ [0,1]
ax = axes[1, 2]
rationals = []
for d in range(1, 10):
    for n in range(d):
        x = n / d
        if 0 <= x <= 1:
            rationals.append(x)
for x in set(rationals):
    ax.plot([x, x], [0, 1], "r-", linewidth=0.5)
ax.set_title("Q ∩ [0,1]（可数集 = Fσ）")

for ax in axes.flat:
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xticks([])

plt.tight_layout()
```

### 实验 3：验证 σ-代数的性质

```python title="Borel 集对可数并封闭"
import numpy as np

# A_n = [1/(n+1), 1/n]，可数并 = (0, 1]
print("可数个闭区间的并：")
union = set()
for n in range(1, 20):
    interval = set(np.linspace(1/(n+1), 1/n, 100))
    union = union | interval    # 集合并运算
    print(f"  n={n}: [1/{n+1}, 1/{n}] ≈ [{1/(n+1):.4f}, {1/n:.4f}]")

print(f"\n并集趋向 (0, 1]")
```

## 6. 练习

```quiz
σ-代数必须满足哪三条性质？
- 包含空集、对并集封闭、对交集封闭
- 包含全集、对补集封闭、对可数并封闭 [*]
- 包含全集、对有限并封闭、对补集封闭
? σ-代数的三条公理：(1)全集 X∈F，(2)A∈F⇒Aᶜ∈F，(3)可数个 Aₙ∈F⇒∪Aₙ∈F。关键区别于代数的是"可数"并。
```

```quiz
Borel σ-代数是由什么生成的？
- 所有闭集
- 所有开集 [*]
- 所有单点集
? Borel σ-代数 B(R) 是由 R 上所有开集生成的最小 σ-代数。它包含所有开集、闭集、区间、可数集等"自然"集合。
```

**练习 1**：证明 $\{A \subseteq \mathbb{R} \mid A \text{ 可数或 } A^c \text{ 可数}\}$ 是 $\mathbb{R}$ 上的 σ-代数。

```exercise
# @title: 可数-余可数 σ-代数
# @check: 包含全集: True
# @check: 补集封闭: True
# @check: 可数并封闭: True
# @hint: 可数个可数集的并仍可数

# 验证三条性质
import math

# 1. 全集 R 的补集是空集（可数）→ R 在族中
print(f"包含全集: True")  # R^c = ∅ 可数

# 2. 若 A 可数，A^c 的补集是 A（可数）→ A^c 在族中
#    若 A^c 可数，A 的补集是 A^c（可数）→ A 在族中
print(f"补集封闭: True")

# 3. 若每个 A_n 可数，∪A_n 可数（可数个可数集的并可数）
#    若某个 A_n^c 可数，(∪A_n)^c = ∩A_n^c ⊆ A_n^c 可数
print(f"可数并封闭: True")
```

**练习 2**：$\sigma(\{(0,1), (2,3)\})$ 包含哪些集合？

<details>
<summary>点开查看解答</summary>

设 $A = (0,1)$，$B = (2,3)$。σ-代数必须包含：

- $\emptyset$, $\mathbb{R}$
- $A$, $B$
- $A^c = (-\infty,0] \cup [1,\infty)$, $B^c = (-\infty,2] \cup [3,\infty)$
- $A \cup B = (0,1) \cup (2,3)$
- $A^c \cap B^c = (A \cup B)^c = (-\infty,0] \cup [1,2] \cup [3,\infty)$
- $A \cap B^c = (0,1)$（已含）
- $A^c \cup B = (-\infty,0] \cup [1,3)$
- 等等——共 16 个集合，对应 $\{A, B\}$ 生成的 4 个"原子"区域的所有组合。

四个原子：$(0,1)$，$(2,3)$，$[1,2]$，$(-\infty,0] \cup [3,\infty)$。σ-代数是这四个原子的所有并集，共 $2^4 = 16$ 个。

</details>

## 7. 选读：为什么需要 σ-代数而不是代数

<details>
<summary>选读 · 可数性的必要性</summary>

**代数**只要求对**有限**并封闭，σ-代数要求对**可数**并封闭。概率论中，事件"无穷次抛硬币中出现无穷多个正面"是可数个事件的并/交——只靠代数无法讨论。Lebesgue 积分中，简单函数的极限也需要可数并来描述。

**Vitali 集合**的存在说明：如果坚持平移不变性和可数可加性，$\mathbb{R}$ 的幂集不可能成为测度空间的定义域。σ-代数在"太大"（包含不可测集）和"太小"（无法处理常见集合）之间找到了平衡。Borel σ-代数恰好足够大（包含所有自然出现的集合）又足够小（不包含病态的不可测集）。

</details>

## 8. 下一站

σ-代数定义了"哪些集合可以测量"。下一个问题是：如何在这些集合上定义"大小"——测度。这就是 Lebesgue 测度的故事。

→ [Lebesgue 积分](../25-measure-lebesgue/40-lebesgue-integral.md)
