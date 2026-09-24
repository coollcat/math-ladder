---
title: 等价关系与等价类
lesson_id: math-language/equivalence-relations
prereqs:
  - math-language/sets-relations-functions
introduces_math: []
introduces_builtin: []
introduces_import:
  - numpy
volume: 2
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_concepts:
  - equivalence-relation
  - equivalence-class
  - quotient-set
applications:
  - modular-arithmetic
  - classification
exits:
  - abstract-algebra
---

# 等价关系与等价类

## 1. 从一个场景开始

身份证号不同、长相不同、住处不同——但"住在同一座城市"这件事，把一群人分成了若干堆。每堆里的人彼此互为"同城"关系，不同堆之间没有这种关系。这种"互相归为同一堆"的直觉，正是等价关系要捕捉的东西。

## 2. 直觉解释

想象你有一堆积木，每块积木上写着一个数字。你按"除以 3 的余数相同"把积木分堆：

- 余 0 的一堆：{0, 3, 6, 9, …}
- 余 1 的一堆：{1, 4, 7, 10, …}
- 余 2 的一堆：{2, 5, 8, 11, …}

每堆内部，任意两块积木都"同余"；不同堆之间，没有任何两块同余。这三堆就是三个**等价类**，它们合起来构成**商集**。

等价关系的三条规则恰好确保了这种"完美分堆"：

1. 每块积木至少在自己那堆里（自反性）
2. 如果 A 和 B 同堆，B 和 A 也同堆（对称性）
3. 如果 A 和 B 同堆、B 和 C 同堆，A 和 C 也同堆（传递性）

## 3. 正式定义

设 $R$ 是集合 $S$ 上的二元关系。若 $R$ 满足以下三条，称 $R$ 为**等价关系**：

| 性质 | 符号 | 含义 |
| --- | --- | --- |
| 自反性 | $\forall a \in S,\; aRa$ | 每个元素与自己相关 |
| 对称性 | $aRb \Rightarrow bRa$ | 关系双向 |
| 传递性 | $aRb \land bRc \Rightarrow aRc$ | 关系可链式传导 |

等价关系通常记作 $\sim$（波浪号）。

对 $a \in S$，$a$ 的**等价类**为：

$$[a] = \lbrace x \in S \mid x \sim a\rbrace$$

所有等价类构成的集合叫**商集**，记作 $S/{\sim}$：

$$S/{\sim} = \lbrace [a] \mid a \in S\rbrace$$

**模等价**是最常见的等价关系：$a \equiv b \pmod{n}$ 当且仅当 $n \mid (a-b)$。此时商集 $\mathbb{Z}/n\mathbb{Z}$ 恰好有 $n$ 个等价类。

## 4. 分步例题

**例 1**：验证模 4 同余是等价关系。

1. **自反性**：$a - a = 0$，$4 \mid 0$，所以 $a \equiv a \pmod{4}$。✓
2. **对称性**：若 $4 \mid (a-b)$，则 $a-b=4k$，于是 $b-a=4(-k)$，$4 \mid (b-a)$。✓
3. **传递性**：若 $4 \mid (a-b)$ 且 $4 \mid (b-c)$，则 $a-b=4j$、$b-c=4k$，相加得 $a-c=4(j+k)$。✓

**例 2**：列出 $\mathbb{Z}/4\mathbb{Z}$ 的所有等价类。

- $[0] = \lbrace \ldots, -8, -4, 0, 4, 8, \ldots\rbrace$
- $[1] = \lbrace \ldots, -7, -3, 1, 5, 9, \ldots\rbrace$
- $[2] = \lbrace \ldots, -6, -2, 2, 6, 10, \ldots\rbrace$
- $[3] = \lbrace \ldots, -5, -1, 3, 7, 11, \ldots\rbrace$

商集 $\mathbb{Z}/4\mathbb{Z} = \lbrace [0], [1], [2], [3]\rbrace$，共 4 个元素。

## 5. 动手实验

### 实验 1：模等价分堆

```python title="把 0~19 按模 5 的余数分堆"
n = 5                          # 模数
classes = {}                   # 空字典：键是余数，值是该余数对应的数列表
for a in range(20):
    r = a % n                  # % 取余运算：a 除以 n 的余数
    if r not in classes:       # 如果这个余数还没出现过
        classes[r] = []        # 新建一个空列表
    classes[r].append(a)       # 把 a 放进对应余数的列表

for r in sorted(classes):
    print(f"[{r}] = {classes[r]}")
```

你会看到 5 堆，每堆内的数彼此模 5 同余。

### 实验 2：等价关系的矩阵表示

```python title="用邻接矩阵可视化等价关系"
import matplotlib.pyplot as plt
import numpy as np  # numpy：数值数组与矩阵运算库

n = 8
# 按模 3 分组的等价关系
mat = np.zeros((n, n))        # 创建 8×8 全零矩阵
for i in range(n):
    for j in range(n):
        if i % 3 == j % 3:    # 模 3 余数相同 → 等价
            mat[i][j] = 1      # 在矩阵对应位置标 1

plt.imshow(mat, cmap="Blues", origin="upper")  # imshow：矩阵热力图
plt.xticks(range(n))
plt.yticks(range(n))
plt.xlabel("j")
plt.ylabel("i")
plt.title("模 3 等价关系矩阵")
plt.colorbar(label="是否等价")
```

等价关系的矩阵呈**分块对角**结构——同一等价类内的元素构成一个全 1 小方块，不同类之间全为 0。

### 实验 3：探索商集大小

```python title="n 个元素按模 m 分堆，商集有多大"
# sliders: m=3 [2:10:1]
n = 12
classes = set()                # set()：集合，自动去重
for a in range(n):
    classes.add(a % m)         # add：往集合里加元素
print(f"0~{n-1} 模 {m} 的商集大小 = {len(classes)}")
print(f"等价类 = {sorted(classes)}")
```

### 实验 4：等价类划分可视化

```viz
{
  "type": "plot",
  "title": "等价类划分可视化",
  "expr": "sin(pi*x/n)",
  "xmin": 0,
  "xmax": 20,
  "ymin": -1.5,
  "ymax": 1.5,
  "sliders": [
    {"name": "n", "min": 2, "max": 8, "step": 1, "value": 3}
  ]
}
```

拖动滑块改变模数 n，观察同余类如何将整数点按颜色分组——相同余数的点落在同一条正弦曲线上。

## 6. 练习

```quiz
以下哪个不是等价关系？
- 整数集上的模 5 同余
- 实数集上的 ≤ 关系 [*]
- 三角形集合上的相似关系
? ≤ 关系不满足对称性：3 ≤ 5 成立但 5 ≤ 3 不成立，所以它不是等价关系。
```

```quiz
集合 {0,1,...,11} 按模 4 同余划分，商集有多少个等价类？
- 3
- 4 [*]
- 12
? 模 4 同余将整数分为 4 个等价类：余 0、余 1、余 2、余 3，商集大小为 4。
```

**练习 1**：判断以下哪些是等价关系，哪些不是。对不是的，指出违反了哪条性质。

(a) 整数集上，$a \sim b$ 当 $a \leq b$。
(b) 实数集上，$a \sim b$ 当 $|a - b| < 1$。
(c) 三角形集合上，$a \sim b$ 当 $a$ 与 $b$ 相似。

<details>
<summary>点开查看解答</summary>

(a) **不是**。$a \leq b$ 且 $b \leq a$ 只能推出 $a = b$，所以对称性不成立（$3 \leq 5$ 但 $5 \not\leq 3$）。

(b) **不是**。$|0 - 0.6| < 1$ 且 $|0.6 - 1.2| < 1$，但 $|0 - 1.2| = 1.2 \geq 1$，违反传递性。

(c) **是**。自反：每个三角形与自身相似；对称：相似是双向的；传递：$a \sim b$ 且 $b \sim c$ 则 $a \sim c$。
</details>

**练习 2**：在 $\mathbb{Z}$ 上定义 $a \sim b$ 当 $a^2 = b^2$。验证这是等价关系，并列出 $[3]$ 和 $[0]$。

```exercise
# @title: 平方等价关系
# @check: [3] = {-3, 3}
# @check: [0] = {0}
# @hint: a^2 = b^2 意味着 a = b 或 a = -b
s = set(range(-10, 11))       # 用有限集近似，range(-10,11) 生成 -10 到 10 的整数
eq_class_3 = set()
for a in s:
    if a * a == 3 * 3:        # 判断 a² 是否等于 3²
        eq_class_3.add(a)
print(f"[3] = {eq_class_3}")

eq_class_0 = set()
for a in s:
    if a * a == 0 * 0:
        eq_class_0.add(a)
print(f"[0] = {eq_class_0}")
```

## 7. 选读：商集是"合法的除法"

<details>
<summary>选读 · 为什么叫"商集"</summary>

"商"来自除法。整数除法 $12 \div 4 = 3$ 本质上在说：把 12 个东西每 4 个分一堆，得到 3 堆。商集做的是同样的事——只是分堆规则更一般。

等价关系 $\sim$ 把集合 $S$ 切成不重叠的等价类，商集 $S/{\sim}$ 就是"切完之后的那堆堆"。当我们用模 5 同余把 $\mathbb{Z}$ 切成 5 堆时，商集 $\mathbb{Z}/5\mathbb{Z}$ 里的每个元素不再是单个整数，而是一整类"长得一样（除以 5 余数相同）"的整数。

抽象代数里，群、环、模的商结构都建立在这个思想上：先用等价关系把"看起来不同但本质相同"的元素归为一类，再在商集上定义运算。这就是"商"的真正含义。

</details>

## 8. 下一站

等价关系把集合切成"平级"的堆。但如果元素之间有"大小"或"先后"之分呢？

→ [偏序关系与良序](./37-partial-order-well-order.md)
