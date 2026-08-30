---
title: 集合运算与证明
lesson_id: logic-sets/set-algebra
prereqs:
  - logic-sets/predicates-models
  - math-language/sets-relations-functions
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - set-algebra
  - de-morgan-sets
  - two-inclusion-proof
applications:
  - database-joins
  - search-filters
exits:
  - exam
---

# 集合运算与证明

## 1. 从一个场景开始

购物网站的商品筛选器是集合运算的日常马甲：

- 选"品牌 A **或** 品牌 B"——两个名单**合并**（并集）；
- 再勾"包邮"——只剩两份名单里**都出现**的商品（交集）;
- 点"排除二手"——把一个名单从另一个里**挖掉**（差集）。

每一次点击都在做集合运算。本课给这些动作正式的符号、运算律和一套"怎么证明两个集合相等"的通用套路。

## 2. 直觉解释

把集合想成一圈栅栏圈住的领地：并集是把两个圈合并成一个大圈；交集是两圈的公共草坪；补集是栅栏外的荒野——**但荒野属于谁，取决于你把哪块地当作"全世界"（全集）**。

判断元素归属时，每个对象对每个集合只回答"在 / 不在"，所以任何集合恒等式都可以翻译成一张真值表——这正是上一课命题逻辑的还魂。$A \cup B$ 就是 $\text{在}A\ \text{或在}\ B$ 的"或"；德摩根定律从命题逻辑平移过来毫无违和感。

## 3. 正式定义

设 $U$ 为全集，$A, B \subseteq U$。

| 运算 | 记号 | 定义 | 成员条件 |
| --- | --- | --- | --- |
| 并 | $A \cup B$ | $\lbrace x : x \in A \text{ 或 } x \in B\rbrace$ | 至少一边在 |
| 交 | $A \cap B$ | $\lbrace x : x \in A \text{ 且 } x \in B\rbrace$ | 两边都在 |
| 补 | $A^{c}$ | $\lbrace x \in U : x \notin A\rbrace$ | 全集中但不在 A |
| 差 | $A \setminus B$ | $\lbrace x : x \in A,\ x \notin B\rbrace$ | 在 A 且不在 B |

两条最常用的运算律（其余可由它们推出）：

$$(A \cap B)^{c} = A^{c} \cup B^{c}, \qquad (A \cup B)^{c} = A^{c} \cap B^{c}$$

$$A \cap (B \cup C) = (A \cap B) \cup (A \cap C)$$

**子集证明的双包含法**：要证 $A = B$，分两步走——先任取 $x \in A$ 推出 $x \in B$（得 $A \subseteq B$），再反向走一遍（得 $B \subseteq A$）。两头都通，才敢画等号。

## 4. 分步例题

**例**：证明 $(A \cap B)^c = A^c \cup B^c$（德摩根）。取全集 $U = \lbrace 1,2,3,4,5,6\rbrace$，$A$ = 偶数，$B = \lbrace 3,4,5\rbrace$。

1. 算左边：$A \cap B = \lbrace 4\rbrace$，它的补集是 $\lbrace 1, 2, 3, 5, 6\rbrace$；
2. 算右边：$A^c = \lbrace 1, 3, 5\rbrace$，$B^c = \lbrace 1, 2, 6\rbrace$；
3. 求并：$A^c \cup B^c = \lbrace 1, 2, 3, 5, 6\rbrace$；
4. 两边逐元素比对完全一致——具体例子里成立。要它**永远成立**，用成员逻辑："不在 $A\cap B$" 等价于 "不同时在 $A$ 和 $B$"，即"缺 $A$ 或缺 $B$"——这正是命题逻辑的德摩根 $\lnot(p \land q) \equiv \lnot p \lor \lnot q$ 换了一件衣服。

## 5. 动手实验

### 实验 1（viz）：成员身份只有四种

```viz
{
  "type": "truth-table",
  "title": "p=在A，q=在B",
  "formula": "p and q",
  "showColumns": ["p", "q", "not p", "p and q", "p or q"]
}
```

四行正好是全集里一个元素的四种归属档案。把主公式切到 `p and q`，红色行就是不在交集里的三种元素；切到 `p or q`，只剩“两个集合都不在”这一行落在并集之外。下面的特征向量会把这个想法推广成整批元素一起算。

### 实验 2（python）：特征向量——让机器做集合代数

把"元素是否在集合里"记成 0/1 数组（按全集顺序排列），集合运算就变成逐位算术：

```python title="用 0/1 特征向量验证德摩根"
universe = [1, 2, 3, 4, 5, 6]
A_flags = [0, 1, 0, 1, 0, 1]      # 偶数 {2,4,6} 的特征向量
B_flags = [0, 0, 1, 1, 1, 0]      # {3,4,5} 的特征向量

def complement(flags):
    result = []                    # 建空列表，稍后逐个装入结果
    for f in flags:
        result.append(1 - f)       # append：接到列表末尾；1-f 正好翻转 0 和 1
    return result

def union(f, g):
    result = []
    for i in range(len(f)):        # range(len(...))：按下标遍历两个等长列表
        if f[i] == 1 or g[i] == 1:
            result.append(1)
        else:
            result.append(0)
    return result

def intersection(f, g):
    result = []
    for i in range(len(f)):
        result.append(f[i] * g[i])   # 都为 1 才是 1：乘法就是“且”
    return result

left = complement(intersection(A_flags, B_flags))
right = union(complement(A_flags), complement(B_flags))
print(left)
print(right)
print(left == right)                 # == 比较两个列表内容是否完全相同，返回布尔值
```

三行输出：`[1, 1, 1, 0, 1, 1]`、`[1, 1, 1, 0, 1, 1]`、`True`。换任意初始 flags 重跑，最后一行永远是 `True`——这就是"恒等式"的程序含义。

### 实验 3（matplotlib）：画出两圈之间的领土纠纷

```python title="Venn 图与四个区域"
import matplotlib.pyplot as plt    # 画图库（第 0 章已介绍）

fig, ax = plt.subplots(figsize=(6, 4))   # 建一张画布和一支画笔
circle_a = plt.Circle((-1, 0), 1.6, color="#3b74d6", alpha=0.45)   # Circle：圆形图元；(圆心x,y)、半径、透明度
circle_b = plt.Circle((1, 0), 1.6, color="#e8871e", alpha=0.45)
ax.add_patch(circle_a)             # add_patch：把图元钉到画布上
ax.add_patch(circle_b)
ax.text(-1.7, 0, "仅 A", fontsize=13)
ax.text(0.9, 0.9, "B")
ax.text(-0.1, 0, "A∩B", fontsize=12)
ax.text(1.55, -0.2, "仅 B", fontsize=13)
ax.text(-2.6, 1.8, "外部 = 补集", fontsize=11)
ax.set_xlim(-4, 4)                 # 设定坐标范围
ax.set_ylim(-2.4, 2.4)
ax.set_aspect("equal")             # x 与 y 单位长度一致，圆不变形
```

蓝橙重叠的深色透镜区域就是交集；两圈之外的空白是补集。心里带着这张图，容斥原理（组合章）会自己送上门来。

:::warning[常见误区]

**误区一**：你以为补集是集合自己的属性。其实 $A^c$ 永远相对于全集而言；换 $U$ 就换补集，"$A$ 的补集"这句话本身就不完整。

**误区二**：你以为 $A \setminus B$ 和 $B \setminus A$ 只差个方向、大小差不多。其实两者毫无公共元素（都被对方挖干净了），方向就是一切。

**误区三**：你以为证集合相等只要举几个例子。例子能提供信心，却不能代替双包含论证——实验 1 里"随便换 flags 都是 True"之所以可信，是因为我们对**任意**输入执行了同一套规则。

:::

## 6. 练习

```quiz
已知 A={1,2,3}, B={3,4}, 全集 U={1,2,3,4,5}。B 减 A（B∖A）的结果是？
- 集合 1, 2
- 集合 4 [*]
- 集合 3
? 从 B 中挖掉与 A 共有的元素 3，剩下 4。注意 1、2 是 A∖B 的答案。
```

**练习 1**：用双包含法证明 $A \subseteq B$ 当且仅当 $A \cup B = B$。

<details>
<summary>点开查看逐步解答</summary>

正向：若 $A \subseteq B$，任取 $x \in A \cup B$，则 $x \in A$ 或 $x \in B$；前者由子集关系也给出 $x \in B$，故 $A \cup B \subseteq B$。反向本来就有 $B \subseteq A \cup B$（并集不会比成分小），于是两边相等。反着用也行：若 $A \cup B = B$，则 $A$ 中每个元素都在并集里，也就是在 $B$ 里。"吃并进肚子"和"被包含"是一回事。
</details>

**练习 2**：程序想算 $A \setminus B$（A 减 B），却把方向写反了。修正它：

```exercise
# @title: 用特征向量算差集 A−B
# @check: [0, 1, 0, 0, 0, 1]
# @hint: A∖B 是“在 A 且不在 B”。初始代码把两个身份互换了，等于算了 B∖A。
universe_size = 6
A_flags = [0, 1, 0, 1, 0, 1]      # {2, 4, 6}
B_flags = [0, 0, 1, 1, 1, 0]      # {3, 4, 5}

difference = []
for k in range(universe_size):
    difference.append((1 - A_flags[k]) * B_flags[k])   # ← 问题在这：这是“不在A且在B”
print(difference)
```

修好后输出 `[0, 1, 0, 0, 0, 1]`，对应 $\lbrace 2, 6\rbrace$——偶数里被 $\lbrace 3,4,5\rbrace$ 挖剩下的两位幸存者。

## 7. 选读：为什么运算律可以"只证一半"

<details>
<summary>选读 · 对偶原理</summary>

观察德摩根定律的两条形式：把 $\cap$ 与 $\cup$ 互换、同时 $A$ 与 $A^c$ 互换，一条就变成另一条。这不是巧合——集合代数的全部公理在这套互换下成对出现，称为**对偶原理**：任何一条已被证明的恒等式，其对偶形式自动成立。于是证明工作量减半。这个思想在线性代数（对偶空间）、格论与电路设计（德摩根化简逻辑门）中反复登场。
</details>

## 8. 下一站

集合内部的元素还能彼此"有关系"：同班、同余、不超过……下一课给关系做体检——自反、对称、传递三指标如何把世界切成等价类与秩序井然的偏序。

→ [关系、等价与序](./40-relations-equivalence-order.md)
