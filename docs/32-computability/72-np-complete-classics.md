---
title: NP 完全经典案例
lesson_id: computability/np-complete-classics
prereqs:
  - computability/np-completeness
volume: 3
layer: L6
track:
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - subset-sum
  - vertex-cover
  - hamiltonian-path
  - knapsack
applications:
  - resource-allocation
  - circuit-design
  - scheduling
exits:
  - engineering
  - research
---

# NP 完全经典案例

## 1. 从一个场景开始

你是一家物流公司的调度员：10 辆卡车、50 个仓库、200 个配送点，每条路线有成本、每辆车有容量。你直觉觉得"最优方案应该算得出来"，但算法跑了一天一夜还没停。这不是你写错了代码——你很可能撞上了一个 NP 完全问题。这一课看几个最经典的"硬骨头"，理解它们为何难、如何互相关联。

## 2. 直觉解释

上一课证明了 SAT 是 NP 完全的"始祖"。但现实世界的问题不是布尔公式——它们说的是图、数字、背包。NP 完全理论的真正威力在于：**一旦证明了某个问题是 NP 完全的，所有 NP 问题都可以"翻译"成它**。

这意味着什么？假如有人找到了子集和问题的多项式算法，那么顶点覆盖、Hamilton 路径、旅行商、背包问题——全部瞬间可解。所以研究者宁可把精力花在寻找近似算法，也不赌那个"万一存在"的多项式解法。

本课选四个经典案例，每个都从不同角度展现 NP 完全的"硬"。

## 3. 正式定义

| 问题 | 输入 | 问的是 | 归约自 |
| --- | --- | --- | --- |
| **子集和**（Subset Sum） | 集合 $S=\{a_1,\ldots,a_n\}$，目标 $t$ | 是否存在子集使其元素之和 $=t$？ | 3-SAT |
| **顶点覆盖**（Vertex Cover） | 图 $G=(V,E)$，整数 $k$ | 是否存在大小 $\le k$ 的顶点集覆盖所有边？ | 3-SAT |
| **Hamilton 路径** | 图 $G=(V,E)$ | 是否存在恰好经过每个顶点一次的路径？ | 顶点覆盖 |
| **0/1 背包**（Knapsack） | $n$ 件物品重量 $w_i$、价值 $v_i$，容量 $W$ | 是否存在总重 $\le W$ 且总价值最大？ | 子集和 |

**关键区别**：子集和是"判定版"（有/无），背包问题通常问"最大值"（优化版）。但优化版可以二分搜索调用判定版——两者多项式等价。

## 4. 分步例题

**例：子集和 → 0/1 背包的归约直觉**

给定子集和实例：$S=\{3,5,7,8\}$，$t=15$。问是否存在子集和为 15。

构造背包实例：4 件物品重量 $(3,5,7,8)$、价值也取 $(3,5,7,8)$、容量 $W=15$。

- 如果背包存在总重 $\le 15$ 且总价值 $=15$ 的装法，那重量和价值相等意味着选中物品的重量之和恰好为 15——这就是子集和的解；
- 反之，子集和的解直接给出背包的一种装法。

更精确地：设背包最大价值为 $V^*$。$V^*=t$ 当且仅当子集和有解。因为价值=重量，装进背包的总价值=总重量，总重 $\le W=15$ 时最大价值只能 $\le 15$——达到 15 就意味着找到了和为 15 的子集。

这就是归约的精髓：**把一个问题的实例"翻译"成另一个问题的实例，保持答案不变**。

## 5. 动手实验

### 实验 1（viz）：子集和的搜索空间爆炸

```viz
{
  "type": "plot",
  "title": "n 个元素的子集数 = 2^n",
  "expr": "2^x",
  "xmin": 1,
  "xmax": 30,
  "sliders": []
}
```

$n=20$ 时有约 100 万个子集，暴力搜索勉强可行；$n=50$ 时子集数超过 $10^{15}$——全宇宙的计算机并行也算不完。

### 实验 2（python）：子集和的暴力搜索 vs 动态规划

```python title="子集和：指数暴力 vs 多项式 DP（但仅限整数且 t 不大时）"
import itertools   # 组合工具库

def subset_sum_brute(S, t):
    # 暴力枚举所有子集：指数时间 O(2^n)
    n = len(S)
    for r in range(n + 1):
        for combo in itertools.combinations(S, r):  # 取 r 个元素的组合
            if sum(combo) == t:
                return True
    return False

def subset_sum_dp(S, t):
    # 动态规划：O(n*t) 时间，但 t 很大时退化为伪多项式
    dp = [False] * (t + 1)   # dp[j]=True 表示和 j 可达
    dp[0] = True             # 空集和为 0
    for a in S:
        for j in range(t, a - 1, -1):  # 逆序遍历避免重复使用
            if dp[j - a]:
                dp[j] = True
    return dp[t]

S = [3, 5, 7, 8, 11, 13]
t = 15
print(f"暴力: {subset_sum_brute(S, t)}")   # True (3+5+7=15)
print(f"DP:   {subset_sum_dp(S, t)}")       # True

S2 = [3, 5, 7, 8, 11, 13]
t2 = 100
print(f"暴力: {subset_sum_brute(S2, t2)}")  # False
print(f"DP:   {subset_sum_dp(S2, t2)}")      # False
```

DP 对小 $t$ 很快，但注意：如果 $t$ 是 200 位整数，DP 数组要开 $10^{200}$ 个位置——这就是为什么它是**伪多项式**时间，不是真正多项式。

### 快问快答

```quiz
为什么说子集和问题是"伪多项式"而非"多项式"时间可解？
- 它的 DP 算法时间与 n 和 t 都有关，而 t 的位数才是输入大小 [*]
- 它根本没有多项式算法
- 它的时间复杂度是 O(n log t)
? DP 的 O(n·t) 中，t 是数值本身而非其位数。t 有 b 位时，t 可达 2^b，DP 变成 O(n·2^b)——关于输入大小 b 是指数级的。
```

```quiz
如果有人找到了子集和的真正多项式算法，会发生什么？
- 只有子集和变快了
- 所有 NP 完全问题都变成 P [*]
- 只有背包问题受益
? 子集和是 NP 完全的。任何 NP 完全问题的多项式算法意味着 P=NP，所有 NP 问题都可在多项式时间内求解——计算复杂度理论的根基地震。
```

:::warning[常见误区]

**误区一**："NP 完全 = 不可解。" NP 完全不是说不能解，而是说目前没有已知的多项式时间精确算法。小规模实例完全可以暴力或 DP 求解；工程中常用近似算法或启发式得到"足够好"的解。

**误区二**："背包问题是多项式可解的。" 动态规划的 $O(nW)$ 是伪多项式——$W$ 很大时仍是指数级。真正的 0/1 背包是 NP 完全的。但分数背包（物品可以切分）是贪心可解的多项式问题——两者一字之差，难度天壤之别。

**误区三**："NP 完全问题之间没有区别。" 虽然理论上多项式等价，但实际难度差异巨大。3-SAT 有极高效的 SAT 求解器，而旅行商问题的精确解在 $n>30$ 时基本无望。近似比也不同：顶点覆盖有 2-近似，但旅行商（一般图）除非 P=NP 否则没有常数近似比。

:::

## 6. 练习

**练习 1**：用动态规划判断 $\{2,3,7,8,10\}$ 中是否存在子集和为 11。

<details>
<summary>点开查看逐步解答</summary>

DP 表从 dp[0]=True 开始。加入 2：dp[2]=True。加入 3：dp[3]=True，dp[5]=True。加入 7：dp[7]=True，dp[9]=True，dp[10]=True，dp[12]（超界跳过）。加入 8：dp[8]=True，dp[10]已有，dp[11]=True（因为 dp[3]=True 且 3+8=11）。所以有解：$\{3,8\}$。
</details>

**练习 2**：补全顶点覆盖的暴力搜索——代码能跑但结果不对：

```exercise
# @title: 练习：顶点覆盖暴力搜索
# @check: True
# @check: 2
# @hint: 大小为 k 的顶点覆盖 = 选 k 个顶点，使得每条边至少有一个端点被选中
from itertools import combinations

edges = [(0,1), (1,2), (2,3), (3,0)]  # 四边形图
n = 4

def is_vertex_cover(vertices, edges):
    # 检查选中的顶点是否覆盖了所有边
    cover = set(vertices)
    for u, v in edges:
        if u not in cover and v not in cover:
            return True      # ← 逻辑反了：有边未覆盖却返回 True
    return False             # ← 逻辑反了：全覆盖却返回 False

# 寻找最小顶点覆盖
for k in range(1, n + 1):
    for combo in combinations(range(n), k):
        if is_vertex_cover(combo, edges):
            print(True)
            print(k)
            break
    else:
        continue
    break
```

<details>
<summary>点开查看逐步解答</summary>

```python
def is_vertex_cover(vertices, edges):
    cover = set(vertices)
    for u, v in edges:
        if u not in cover and v not in cover:
            return False     # 有边未被覆盖
    return True              # 所有边都被覆盖

# 四边形图的最小顶点覆盖大小为 2：选 {0,2} 或 {1,3}
edges = [(0,1), (1,2), (2,3), (3,0)]
n = 4
for k in range(1, n + 1):
    for combo in combinations(range(n), k):
        if is_vertex_cover(combo, edges):
            print(True)
            print(k)
            break
    else:
        continue
    break
# 输出 True, 2
```
</details>

## 7. 选读：归约的艺术——从 3-SAT 到顶点覆盖

<details>
<summary>选读 · 经典归约构造</summary>

Karp 1972 年的论文用 21 个归约串联起 NP 完全版图。其中 3-SAT → 顶点覆盖的构造尤为精巧：

给定 3-SAT 实例（子句 $C_1,\ldots,C_m$，变量 $x_1,\ldots,x_n$），构造图 $G$：
1. 每个变量 $x_i$ 造一个"小对"：两个顶点 $v_i,\bar{v}_i$，连一条边——这对中必须选一个（代表变量取真或假）；
2. 每个子句 $C_j=\{\ell_1,\ell_2,\ell_3\}$ 造一个"三角形"：三个顶点两两相连——三角形至少要选两个才能覆盖三条边；
3. 把三角形的每个顶点连向对应文字的小对顶点。

令 $k=n+2m$（每对选 1 个 + 每三角选 2 个）。可证：$G$ 有大小 $\le k$ 的顶点覆盖当且仅当 3-SAT 可满足。构造是多项式时间的——因为图的大小与公式大小线性相关。

这个归约的美在于"物理直觉"：小对是二选一的开关，三角形是至少两个的约束，连接边是"如果你选了那个文字的真值，就帮我覆盖这条边"的契约。

</details>

## 8. 下一站

NP 完全告诉我们"这些问题很难精确求解"，但它们的代数根基——有限域的结构——可以反过来帮助我们。下一课回到代数，看有限域 $F_{p^m}$ 如何从不可约多项式中诞生。

→ [有限域 $F_{p^m}$ 构造](../../33-algebraic-structures/67-finite-field-construction.md)
