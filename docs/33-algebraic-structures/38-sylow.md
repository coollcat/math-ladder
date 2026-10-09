---
title: Sylow 定理：有限群的骨架由素数幂决定
lesson_id: algebraic-structures/sylow
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
  - p-group
  - sylow-subgroup
  - sylow-theorems
applications:
  - finite-group-classification
  - cryptography
exits:
  - research
---

# Sylow 定理：有限群的骨架由素数幂决定

## 1. 从一个场景开始

15 位客人要分成几张等大的桌子。上一课的 Lagrange 定理先立了一条硬规矩：每桌人数必须整除 $15$，所以每桌只可能是 $1$、$3$、$5$、$15$ 人。

规矩说完了，问题才真正开始：**允许**不等于**存在**。这 15 个人真的能按每桌 3 人分完吗？每桌 5 人呢？如果不能，Lagrange 那张清单就只是一张空头允许证。Sylow 定理要给的，是一张**必到货清单**——而且不止"存在"，它把这类子群的**个数**也钉死了。

## 2. 直觉解释

先把群按素数拆开：$|G|=p^a\cdot m$，其中 $p$ 不整除 $m$。$p$ 这一半是群"最硬"的部分。

**$p$-子群**指阶恰好是 $p$ 的幂的子群（$1,p,p^2,\dots$）。它们像一堆 $p$ 进制积木，能塞进去的块越大越值钱。**Sylow $p$-子群**就是能塞进 $G$ 的最大那块——阶恰好是 $p^a$，一块不多一块不少。三条定理说的是：

1. **至少有一块**（存在性）；
2. **所有最大块长得一模一样**（任意两块共轭，因而是同构的镜像）；
3. **块的数量被两道夹子锁住**：$n_p\equiv 1\pmod p$ 且 $n_p$ 整除 $|G|$。

第三条最像魔术。两道夹子常常只留下一个可能值 $1$；一旦 $n_p=1$，那块 Sylow 子群就**唯一**，而唯一的东西必正规——白送一个正规子群。分类小阶群的标准起手式就是：先数 $n_p$，再看它是不是 $1$。

## 3. 正式定义

设 $G$ 是有限群，$|G|=p^{a}m$，其中 $p$ 是素数、$p\nmid m$、$a\ge 1$。

**定义一（$p$-群）**：若 $|H|=p^{k}$（$k\ge0$），则称 $H$ 为 $p$-群。

**定义二（Sylow $p$-子群）**：$G$ 的阶为 $p^{a}$ 的子群称为 Sylow $p$-子群，也就是 $G$ 里最大的 $p$-子群。

**定理一（存在性）**：Sylow $p$-子群必存在。

**定理二（共轭唯一性）**：若 $P,Q$ 都是 Sylow $p$-子群，则存在 $g\in G$ 使 $Q=gPg^{-1}$。于是 $P\cong Q$；特别地

$$P\trianglelefteq G\iff n_p=1 .$$

**定理三（计数约束）**：设 $n_p$ 为 Sylow $p$-子群的个数，$N_G(P)=\lbrace g\in G: gPg^{-1}=P\rbrace$ 是正规化子，则

$$n_p=[G:N_G(P)],\qquad n_p\equiv 1\pmod p,\qquad n_p\mid |G| .$$

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $p^{a}$ | $p$-部分 | $p$ 在 $\lvert G\rvert$ 里的最高幂，$p^{a}$ 正是 Sylow 子群的阶 |
| $m$ | $p'$-部分 | 与 $p$ 互素的那一半，$\lvert G\rvert=p^{a}m$ |
| $n_p$ | Sylow 计数 | 全要满足 $n_p\equiv1\pmod p$ 且 $n_p\mid\lvert G\rvert$ |
| $N_G(P)$ | 正规化子 | 把 $P$ 映回自身（作为集合）的元素全体，自身总是子群 |
| $\lvert P\rvert$ | Sylow 子群阶 | 恰好 $p^{a}$；比它小的叫 $p$-子群，不叫 Sylow |

一个常用推论（Cauchy 定理）：只要素数 $p$ 整除 $|G|$，群里就一定有 $p$ 阶元素——它是 Sylow 定理取 $a=1$ 时的影子。

## 4. 分步例题

**例 1（$15$ 阶群必循环）**：设 $|G|=15=3\cdot5$。

1. **筛 $n_3$**：$15$ 的因数是 $1,3,5,15$，逐个对 $3$ 取余得 $1,0,2,0$，只有 $1$ 满足 $\equiv1\pmod 3$，所以 $n_3=1$；
2. **筛 $n_5$**：同样四个因数对 $5$ 取余得 $1,3,0,0$，只有 $1$ 满足 $\equiv1\pmod 5$，所以 $n_5=1$；
3. **两个都唯一**，由定理二知 $P_3\trianglelefteq G$ 且 $P_5\trianglelefteq G$；
4. **交集平凡**：$P_3\cap P_5$ 的阶同时整除 $3$ 与 $5$（Lagrange 定理），故只能是 $1$，即 $P_3\cap P_5=\lbrace e\rbrace$；
5. **乘积铺满**：$P_3P_5$ 是子群，$|P_3P_5|=\dfrac{|P_3||P_5|}{|P_3\cap P_5|}=3\cdot5=15=|G|$，所以 $G=P_3P_5$；
6. **拼成直积**：两个正规子群交为平凡、乘积为全体，于是 $G\cong P_3\times P_5\cong \mathbb{Z}_3\times\mathbb{Z}_5$；
7. **收口**：元素 $(1,1)$ 的阶是 $3$ 与 $5$ 的最小公倍数 $15$，故 $\mathbb{Z}_3\times\mathbb{Z}_5\cong\mathbb{Z}_{15}$，进而 $G\cong\mathbb{Z}_{15}$，是循环群。

**结论**：$15$ 阶群只有一种。计数夹子把"可能"直接压成了"唯一"。

**例 2（$A_4$ 的 $n_3$ 为什么不是 $1$）**：$|A_4|=12=2^2\cdot3$。

1. **筛 $n_3$**：$12$ 的因数是 $1,2,3,4,6,12$，对 $3$ 取余得 $1,2,0,1,0,0$，满足 $\equiv1\pmod 3$ 的是 $1$ 和 $4$，所以 $n_3\in\lbrace1,4\rbrace$；
2. **点数**：$A_4$ 里三元轮换共 $8$ 个，每个 $3$ 阶子群含 $e$ 之外的两个三元轮换，$8/2=4$，故 $n_3=4$；
3. **于是不正规**：四个 $3$ 阶子群谁也压不住谁，$A_4$ 没有正规的 $3$ 阶子群；
4. **另一头**：$n_2$ 要整除 $12$ 且为奇数，候选是 $1,3$；实际 $n_2=1$——那个唯一的 Sylow $2$-子群就是 $4$ 阶的 Klein 四元群 $V_4$，它正规；
5. **对照 $S_3$**：$|S_3|=6$，$n_2=3$、$n_3=1$，两个素数恰好反过来。**数 $n_p$ 就是给群拍 X 光**：哪个素数分到了正规子群，一目了然。

## 5. 动手实验

### 实验 1（viz）：在 $S_3$ 的乘法表里数 Sylow 子群

```viz
{
  "type": "operation-table",
  "title": "S₃ 的乘法表：数一数 2 阶与 3 阶子群",
  "elements": ["e", "a", "b", "c", "r", "r2"],
  "operation": "table",
  "table": [["e","a","b","c","r","r2"],["a","e","r2","r","c","b"],["b","r","e","r2","a","c"],["c","r2","r","e","b","a"],["r","b","c","a","r2","e"],["r2","c","a","b","e","r"]],
  "highlight": ["identity", "inverses"],
  "selectedRow": 4,
  "selectedCol": 4
}
```

表里 $e$ 是单位元，$a,b,c$ 是三个对换（每个自逆，阶为 $2$），$r,r2$ 是两个三循环（互为逆，阶为 $3$）。点住行、列标题可以选中一对输入：把行和列都停在 $r$ 上，交点给出 $r^2$——两个三循环接龙又落回 $3$ 阶子群 $\lbrace e,r,r^2\rbrace$ 内部。

**读表任务**：沿着绿色互逆带找形如 $\lbrace e,\ast\rbrace$ 的两元素子群，能数出 $3$ 个（$\lbrace e,a\rbrace,\lbrace e,b\rbrace,\lbrace e,c\rbrace$）；三元素子群只有一个（$\lbrace e,r,r^2\rbrace$）。也就是 $n_2=3$、$n_3=1$——正好对上 $S_3$ 的 Sylow 计数。

### 实验 2（python）：让机器把子群全数出来

```python title="枚举 S₃ 的全部子群并点名 Sylow 计数"
import itertools

perms = list(itertools.permutations([0, 1, 2]))   # S_3 的全部 6 个置换：permutations 列出所有排列
identity = (0, 1, 2)

def compose(p, q):
    # 先做 q 再做 p：结果第 i 位是 p 把 q 送去的位置再送一次
    return tuple(p[q[i]] for i in range(3))

def is_group(subset):
    # 有限集只要对复合封闭，就自动含单位元与逆元——这是有限群的便利
    for a in subset:
        for b in subset:
            if compose(a, b) not in subset:
                return False
    return True

subgroups = []
for size in range(1, 7):
    for combo in itertools.combinations(perms, size):   # combinations 按大小取子集
        if identity in combo and is_group(combo):
            subgroups.append(combo)

n2 = 0
n3 = 0
for g in subgroups:
    if len(g) == 2:
        n2 += 1
    if len(g) == 3:
        n3 += 1

print("subgroups:", len(subgroups))
print("n2 =", n2)
print("n3 =", n3)
```

输出：

```
subgroups: 6
n2 = 3
n3 = 1
```

六个子群分别是：平凡群 $\lbrace e\rbrace$、$S_3$ 自身、三个 $2$ 阶子群、一个 $3$ 阶子群。两个计数同时通过 Sylow 的两道夹子：$n_2=3$ 是奇数且整除 $6$（即 $3\equiv1\pmod 2$）；$n_3=1\equiv1\pmod 3$ 且整除 $6$。

想看夹子里"另一个候选真的会出现"的样子，可以盯住 $S_3$ 的 $n_3$：候选是 $n_3\in\lbrace1\rbrace$（因数 $1,2,3,6$ 里只有 $1$ 除以 $3$ 余 $1$），所以 $S_3$ 的 $3$ 阶子群只能唯一。而 $A_4$ 的候选是 $\lbrace1,4\rbrace$，实际落在 $4$ 上——那正是例 2 里数出来的四个三元轮换子群。

## 6. 常见误区

:::warning[常见误区]

**误区一**："你以为 Lagrange 定理的逆命题成立：能整除就有子群。" 其实 $|A_4|=12$，$6$ 整除 $12$，但 $A_4$ 没有 $6$ 阶子群。Sylow 只保证**素数幂**那几档到货；非素数幂档位不打包票。

**误区二**："你以为 Sylow 子群一定正规。" 其实只有 $n_p=1$ 时才正规。$S_3$ 有三个 $2$ 阶子群，它们互相共轭，谁也不正规——共轭性说的正是"同族"，不是"唯一"。

**误区三**："你以为 $n_p$ 只是个数量统计。" 其实它是探针：$n_p=1$ 立刻送你一个正规子群，$n_p\ne1$ 则暗示群内部有非平凡的对称在搬运这些子群。$15$ 阶群被两条夹子夹成循环，靠的就是先算出 $n_3=n_5=1$。

:::

## 7. 练习

$12$ 阶群里的 Sylow $3$-子群有几个**可能**的个数？下面的代码能跑，但它把"因数总个数"当成了"候选个数"：

```exercise
# @title: 练习：用 Sylow 计数筛出 n_3 的候选
# @check: candidates=[1, 4]
# @check: count=2
# @hint: n_3 要同时满足两条：整除 12，且除以 3 余 1。12 的因数只有 1、2、3、4、6、12，逐个试余数，剩 1 和 4。
n = 12
divisors = [d for d in range(1, n + 1) if n % d == 0]   # 12 的全体因数
candidates = [d for d in divisors if d % 3 == 1]        # n_3 ≡ 1 (mod 3)
count = len(divisors)                                   # ← 这是因数总个数，不是候选个数
print("candidates=" + str(candidates))
print("count=" + str(count))
```

<details>
<summary>点开查看逐步解答</summary>

候选必须同时被两道夹子夹住：整除 $12$、且 $\equiv1\pmod 3$。$12$ 的因数 $1,2,3,4,6,12$ 对 $3$ 取余得 $1,2,0,1,0,0$，只有 $1$ 和 $4$ 过关，所以 `candidates` 就是 `[1, 4]`。把最后一行改成对候选计数：

```py
count = len(candidates)
print("count=" + str(count))
```

输出 `count=2`。真实值是 $A_4$ 的 $n_3=4$，但**光靠计数约束判不出是哪一个**——$1$ 和 $4$ 都合法。想知道实际值，还得回到群里点数（例 2 第 2 步）。这正是 Sylow 定理的性格：它给出强约束，却不给全部答案。

</details>

**趁热打铁**：

```quiz
一个 15 阶群的 Sylow 3-子群有几个？
- 3 个
- 1 个 [*]
- 5 个
? n_3 必须整除 15 且除以 3 余 1。15 的因数 1、3、5、15 里只有 1 满足同余条件，所以 Sylow 3-子群唯一，从而正规——这正是 15 阶群必循环的第一步。
```

## 8. 选读：n_p ≡ 1 是怎么来的

<details>
<summary>选读 · 让 P 作用在所有 Sylow 子群上</summary>

记 $\mathrm{Syl}_p(G)$ 为全部 Sylow $p$-子群的集合，个数为 $n_p$。让 $G$ 用共轭作用在它上面：$g\cdot Q=gQg^{-1}$。

**第一步（轨道-稳定子）**：这个作用只有**一个**轨道——因为任意两个 Sylow 子群共轭（定理二）。稳定子恰是正规化子 $N_G(P)$，于是

$$n_p=|\mathrm{Syl}_p(G)|=\frac{|G|}{|N_G(P)|}=[G:N_G(P)],$$

所以 $n_p\mid |G|$（这正是第 75 课[群作用与计数选读](./75-group-actions-counting.md)里轨道公式的直接红利）。

**第二步（同余）**：换成让**子群** $P$ 去作用在同一个集合上。$P$ 是 $p$-群，而 $p$-群作用的集合满足

$$|\mathrm{Syl}_p(G)|\equiv|\lbrace \text{被 }P\text{ 固定的元素}\rbrace|\pmod p .$$

再算固定点：$P$ 固定 $Q$ 意味着 $pQp^{-1}=Q$ 对所有 $p\in P$ 成立，即 $P\le N_G(Q)$。此时 $P$ 与 $Q$ 都是 $N_G(Q)$ 的 Sylow $p$-子群，由定理二在 $N_G(Q)$ 内部共轭——但 $Q$ 在 $N_G(Q)$ 里正规，只能与自身共轭，故 $P=Q$。于是固定点集合只含一个元素 $P$ 自己，代回同余式：

$$n_p\equiv 1\pmod p .$$

两条夹子合起来收工。**注意第二步只用到"$P$ 是 $p$-群"，没有任何精巧构造——Sylow 定理的威力大半来自这种朴素的计数。**

</details>

## 9. 下一站

Sylow 给出了"哪些结构必须存在"，但还没回答一个更细的问题：两个大小相同的群，运算节奏是否也完全一样？下一课给"本质相同"下精确定义。

→ [同构：结构相同的不同外壳](./40-isomorphism.md)
