---
title: 正规子群与商群
lesson_id: algebraic-structures/normal-subgroup-quotient
prereqs:
  - algebraic-structures/lagrange
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - normal-subgroup
  - quotient-group
  - natural-homomorphism
applications:
  - modular-arithmetic
  - symmetry-classification
exits:
  - engineering
  - research
---

# 正规子群与商群

## 1. 从一个场景开始

时钟算术 $\mathbb{Z}_{12}$ 本质上是把整数按 12 分组：0 和 12、24 被视为同一类，1 和 13、25 被视为同一类……这种"把无限压成有限"的操作，背后有一个统一的代数语言——商群。

## 2. 直觉解释

商群就是把一个群的元素按某种规则分组，然后把每组当成一个新元素来运算。

但不是所有分组方式都行。关键要求是：**无论先运算再分组，还是先分组再运算，结果必须一致**。这需要分组方式与群运算"兼容"。

正规子群就是保证这种兼容性的条件。它说的是：用 $N$ 的元素去"平移" $N$ 自己，得到的还是 $N$（左陪集等于右陪集）。

## 3. 正式定义

**正规子群**：设 $N$ 是群 $G$ 的子群。若对所有 $g\in G$ 都有

$$gN = Ng$$

即 $gNg^{-1}=N$，则称 $N$ 是 $G$ 的**正规子群**，记作 $N\trianglelefteq G$。

**商群**：设 $N\trianglelefteq G$，定义

$$G/N = \{gN : g \in G\}$$

即所有左陪集的集合，运算定义为

$$(aN)(bN) = (ab)N$$

商群的阶为 $|G/N|=|G|/|N|$。

**自然同态**：映射 $\pi:G\to G/N$，$\pi(g)=gN$，是满同态，核为 $N$。

| 符号 | 含义 |
| --- | --- |
| $N\trianglelefteq G$ | $N$ 是 $G$ 的正规子群 |
| $G/N$ | $G$ 模 $N$ 的商群 |
| $gN$ | $g$ 所在的陪集（等价类） |
| $\pi$ | 自然同态（投影映射） |

## 4. 分步例题

**例 1**：证明 $n\mathbb{Z}$ 是 $\mathbb{Z}$ 的正规子群，并求 $\mathbb{Z}/n\mathbb{Z}$。

1. $n\mathbb{Z}=\{nk:k\in\mathbb{Z}\}$ 是 $\mathbb{Z}$ 的子群（对加法封闭）；
2. $\mathbb{Z}$ 是阿贝尔群，任何子群都正规（$gN=Ng$ 自动成立）；
3. $\mathbb{Z}/n\mathbb{Z}$ 的元素是陪集 $\{0+n\mathbb{Z},\ 1+n\mathbb{Z},\ \ldots,\ (n-1)+n\mathbb{Z}\}$；
4. 这正是 $\mathbb{Z}_n$——模 $n$ 剩余类群；
5. 运算：$(a+n\mathbb{Z})+(b+n\mathbb{Z})=(a+b)+n\mathbb{Z}$，即模 $n$ 加法。

**例 2**：$A_3$ 是 $S_3$ 的正规子群。

1. $S_3=\{e,(12),(13),(23),(123),(132)\}$，$A_3=\{e,(123),(132)\}$；
2. $|A_3|=3$，$|S_3|=6$，指数为 2；
3. 指数为 2 的子群一定正规（左陪集只有 $N$ 和 $G\setminus N$，右陪集也是如此）；
4. $S_3/A_3\cong\mathbb{Z}_2$。

## 5. 动手实验

### 实验 1（python）：构造商群

```python title="Z_12 = Z / 12Z 的运算表"
n = 12

# Z/nZ 的元素是 0 到 n-1 的剩余类
elements = list(range(n))  # list(range(n))：生成 [0, 1, ..., n-1]

# 构造加法运算表
print(f"Z/{n}Z 的加法表（行+列 mod {n}）:")
header = "  " + " ".join(f"{x:>2}" for x in elements)  # f"{x:>2}"：右对齐，宽度 2
print(header)
for a in elements:
    row = f"{a:>2}"
    for b in elements:
        row += f" {(a + b) % n:>2}"  # % 取模运算
    print(row)
```

整个 $\mathbb{Z}_{12}$ 的加法表在几行内完整呈现。每个元素就是一个陪集的代表。

### 实验 2（python）：验证正规性

```python title="检查 S3 中 A3 是否正规"
# S3 的元素用排列的元组表示
# 排列 (a,b,c) 表示 1->a, 2->b, 3->c
S3 = [
    (1,2,3),  # 恒等 e
    (2,1,3),  # (12)
    (3,2,1),  # (13)
    (1,3,2),  # (23)
    (2,3,1),  # (123)
    (3,1,2),  # (132)
]

A3 = [(1,2,3), (2,3,1), (3,1,2)]  # 偶置换

def compose(p, q):
    """两个排列的复合 p∘q：先做 q 再做 p"""
    return tuple(p[q[i]-1] for i in range(3))  # 排列合成：p(q(i))

def inverse(p):
    """排列的逆"""
    inv = [0] * 3
    for i in range(3):
        inv[p[i]-1] = i + 1  # p 把 i 映到 p[i]，逆映射把 p[i] 映回 i
    return tuple(inv)

# 验证正规性：对所有 g∈S3, n∈A3，检查 g*n*g^{-1} ∈ A3
is_normal = True
for g in S3:
    for n in A3:
        conjugate = compose(compose(g, n), inverse(g))  # gng^{-1}
        if conjugate not in A3:
            is_normal = False

print(f"A3 是 S3 的正规子群? {is_normal}")

# 商群的陪集
cosets = set()
for g in S3:
    coset = frozenset(compose(g, n) for n in A3)  # frozenset：不可变集合，可作为集合元素
    cosets.add(coset)

print(f"陪集个数: {len(cosets)}")
```

A3 确实正规，商群恰好有两个陪集，对应 $\mathbb{Z}_2$。

### 实验 3（viz）：陪集划分

```viz
{
  "type": "set-mapper",
  "title": "S3/A3 的两个陪集",
  "left": ["e", "(123)", "(132)", "(12)", "(13)", "(23)"],
  "right": ["A3 (偶置换)", "另一陪集 (奇置换)"],
  "arrows": [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 1]]
}
```

六个元素被整齐分成两组，每组内部的运算是"等价"的。

:::warning[常见误区]

**你以为所有子群都是正规子群。** 其实只有满足 $gN=Ng$ 的子群才正规。在非阿贝尔群中，许多子群不正规。

**你以为商群的元素是单个元素。** 其实商群的元素是陪集（等价类），每个陪集可能包含多个原群元素。

**你以为正规子群必须是阿贝尔群。** 正规性只要求与外层群"兼容"，不要求自身交换。

:::

## 6. 练习

```exercise
# @title: 练习：求 Z_8 的所有正规子群和商群
# @check: Subgroup {0,4}: quotient has 4 elements
# @check: Subgroup {0,2,4,6}: quotient has 2 elements
# @hint: Z_8 是阿贝尔群，所有子群都正规。子群由 8 的因子生成：{0}, {0,4}, {0,2,4,6}, Z_8。
n = 8
elements = list(range(n))

# 找出所有子群（由生成元生成）
def subgroup_of(gen, n):
    """由生成元 gen 在 Z_n 中生成的子群"""
    s = set()
    x = 0
    for _ in range(n):
        s.add(x)
        x = (x + gen) % n
    return frozenset(s)

subgroups = set()
for gen in range(n):
    subgroups.add(subgroup_of(gen, n))

# 打印非平凡正规子群及其商群
for sg in sorted(subgroups, key=len):
    if len(sg) > 1 and len(sg) < n:
        quotient_size = n // len(sg)
        print(f"Subgroup {set(sg)}: quotient has {quotient_size} elements")
```

```quiz
在阿贝尔群中，子群的正规性如何？
- 只有平凡子群正规
- 所有子群都正规 [*]
- 只有指数为素数的子群正规
? 阿贝尔群中 gN = Ng 对所有 g 恒成立，所以任何子群都自动正规。Z_n 的子群全部是正规子群。
```quiz
商群 G/N 的元素是什么？
- G 中的单个元素
- N 中的单个元素
- G 中元素的陪集（等价类） [*]
? 商群的元素是陪集 gN，不是单个元素。每个陪集可能包含多个 G 的元素，但在商群中被视为一个整体。
```

## 7. 选读：从正规子群到单群

<details>
<summary>选读 · 单群：不能再分解的积木</summary>

若群 $G$ 没有非平凡正规子群（即只有 $\{e\}$ 和 $G$ 自身是正规子群），则称 $G$ 为**单群**。

单群在群论中的地位类似于素数在数论中：任何群都可以通过正规子群逐层"分解"成单群的扩张（若尔当-赫尔德定理）。有限单群的分类是 20 世纪代数最宏大的工程之一，最终清单包括循环群 $\mathbb{Z}_p$（$p$ 素数）、交错群 $A_n$（$n\ge5$）、16 个李型族、26 个散在群。

</details>

## 8. 下一站

正规子群和商群给了我们"压扁"群的工具。下一课把这种压扁与同态联系起来：群同态基本定理告诉我们，每个同态的像都同构于某个商群。

→ [群同态基本定理](./47-isomorphism-theorem.md)
