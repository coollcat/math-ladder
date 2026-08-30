---
title: 零和博弈与 minimax
lesson_id: game-theory/zero-sum-minimax
prereqs:
  - game-theory/nash-equilibrium
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - zero-sum-game
  - maximin-minimax
  - saddle-point
applications:
  - competitive-strategy
  - adversarial-robustness
exits:
  - data-ai
---

# 零和博弈与 minimax

## 1. 从一个场景开始

石头剪刀布。你出剪刀我出布，你赢一分我输一分；你出石头我出布，我赢一分你输一分。三次下来，两人的得分加起来恒等于零。

现在换个玩法：不许随机，必须提前把出招顺序写在纸上交给裁判。这个游戏立刻变得毫无悬念——对手看着你的纸条出招，你必输无疑。**固定策略在零和博弈里是致命的。**

第 20 课用"互相都是最优回应"定义了纳什均衡，那是通用语言。这一课进入一类结构特别干净的博弈：你所得的正是我失去的。干净到什么程度？只需要**一张**数字表，就能算出"最坏情况下我能保住多少"。

## 2. 直觉解释

零和博弈里双方利益完全对立，所以只需记录一方的收益：甲得 $+3$，乙自然就是 $-3$。收益表因此从两张缩成一张。

拿到这张表，两个玩家问的问题完全不同：

- **甲（行玩家）问**：我选某一行之后，对手一定会挑对我最不利的那一列——所以每行我只配得到它**最小的**那个数。既然如此，我要挑"最小值里最大的那一行"。这叫**保底**（maximin）。
- **乙（列玩家）问**：我选某一列之后，甲会挑对他最有利的那一行——所以每列我最多要付出它**最大的**那个数。既然如此，我要挑"最大值里最小的那一列"。这叫**封顶**（minimax）。

两个数字的关系永远是 $\text{maximin}\le\text{minimax}$：你想保的底，不会超过对手肯给你留的顶。当两者恰好相等时，那个格子就是**鞍点**——谁先亮牌都不吃亏，安全做法就是最优做法。当两者之间存在缝隙时，任何固定策略都能被针对，唯一的出路是随机化。

## 3. 正式定义

设甲（行玩家）的收益矩阵为 $M$，$M[j][i]$ 是甲出第 $j$ 行、乙出第 $i$ 列时甲的收益（零和意味着乙的收益恒为 $-M[j][i]$）：

$$\underline{v}=\max_j\ \min_i M[j][i]\quad\text{(maximin，甲的保底)},\qquad \overline{v}=\min_i\ \max_j M[j][i]\quad\text{(minimax，乙的封顶)}.$$

| 符号 | 名字 | 谁的视角 | 含义 |
| --- | --- | --- | --- |
| $\min_i M[j][i]$ | 第 $j$ 行的行最小值 | 甲 | 甲出这一行、被针对后能拿到的最坏结果 |
| $\max_j M[j][i]$ | 第 $i$ 列的列最大值 | 乙 | 乙出这一列、被针对后要付出的最大代价 |
| $\underline{v}$ | maximin（保底） | 甲 | 甲在所有"最坏结果"里能挑出的最好一个 |
| $\overline{v}$ | minimax（封顶） | 乙 | 乙在所有"最大代价"里能压到的最小一个 |
| 鞍点 | 两者相等的格子 | 双方 | 纯策略解：谁先亮牌都不改结果 |

**弱对偶**（恒成立）：$\underline{v}\le\overline{v}$。等号成立当且仅当存在鞍点。

## 4. 分步例题

**例 1**：取 $M=\begin{bmatrix}4&1&6\\2&3&5\end{bmatrix}$。

1. 行最小值：第一行 $\min(4,1,6)=1$，第二行 $\min(2,3,5)=2$；
2. $\text{maximin}=\max(1,2)=2$——甲出第二行，无论乙怎么选至少拿到 2；
3. 列最大值：三列分别是 $\max(4,2)=4$、$\max(1,3)=3$、$\max(6,5)=6$；
4. $\text{minimax}=\min(4,3,6)=3$——乙出第二列，最多只让甲拿到 3；
5. $2<3$，**无鞍点**：这道缝说明固定出招必被针对。

**例 2**：守门员博弈。射手（甲）可打左或打右，门将（乙）可扑左或扑右，表里的数是射手的进球率：

$$M=\begin{bmatrix}0.5&0.8\\0.9&0.2\end{bmatrix}$$

1. 行最小值 $0.5$ 与 $0.2$ → $\text{maximin}=0.5$；
2. 列最大值 $0.9$ 与 $0.8$ → $\text{minimax}=0.8$；
3. $0.5<0.8$，无鞍点，必须随机化；
4. 随机化的解落在两者之间：射手以 $0.7$ 的概率打左、$0.3$ 打右，进球率稳定在 $0.62$——比纯策略保底的 $0.5$ 高出一大截。

## 5. 动手实验

### 实验 1：亲手造一个鞍点，再亲手拆掉它

```viz
{
  "type": "payoff-matrix",
  "title": "零和收益矩阵：红色是保底，蓝色是封顶",
  "mode": "zero-sum",
  "rowNames": ["甲出 A", "甲出 B"],
  "colNames": ["乙出左", "乙出中", "乙出右"],
  "payoff": [[4, 1, 6], [2, 3, 5]]
}
```

点一个格子选中它，再用滑块改数字。右侧红色一列是各行的最小值（甲的保底候选），底部蓝色一行是各列的最大值（乙的封顶候选）。把第二行第二列那个 3 改成 4 试试：保底从 2 抬到 4，封顶从 3 抬到 4，两者撞在同一个格子上——鞍点出现了，安全做法第一次等于最优做法。

### 实验 2：随机的矩阵里，鞍点常不常见

```python title="随机生成五百个矩阵，统计有鞍点的比例"
import random

random.seed(7)                      # 固定随机种子：保证每次跑出同样的结果
trials = 500

hits23 = 0
for _ in range(trials):             # 下划线变量名：计数用不到，只是占位
    M = [[random.randint(0, 9) for _ in range(3)] for _ in range(2)]   # 列表推导：造一张随机表
    floors = [min(row) for row in M]                      # 每行的最小值
    ceilings = [max(M[0][i], M[1][i]) for i in range(3)]  # 每列的最大值
    if max(floors) == min(ceilings):
        hits23 = hits23 + 1
print(round(hits23 / trials, 3))

hits22 = 0
for _ in range(trials):
    M = [[random.randint(0, 9) for _ in range(2)] for _ in range(2)]
    floors = [min(row) for row in M]
    ceilings = [max(M[0][i], M[1][i]) for i in range(2)]
    if max(floors) == min(ceilings):
        hits22 = hits22 + 1
print(round(hits22 / trials, 3))
```

输出 `0.6` 与 `0.722`：随机生成的 2×3 矩阵约有六成带鞍点，2×2 约七成二。**鞍点既不稀有也不保证**——这正是必须先算一遍、而不能想当然的原因。

### 实验 3：没有鞍点时，随机化能多拿多少

```python title="守门员博弈：从纯策略保底 0.5 走到混合均衡 0.62"
M = [[0.5, 0.8], [0.9, 0.2]]        # 射手（行）的进球率；门将（列）的收益恰好相反

floors = [min(row) for row in M]
ceilings = [max(M[0][i], M[1][i]) for i in range(2)]
print(floors, max(floors))          # 行最小值与 maximin
print(ceilings, min(ceilings))      # 列最大值与 minimax

# 让门将两种选择无差异：扑左期望 0.5p + 0.9(1-p)，扑右期望 0.8p + 0.2(1-p)
# 令两者相等：0.9 - 0.4p = 0.2 + 0.6p  →  p = (0.9-0.2) / ((0.9-0.2) + (0.8-0.5))
p = (0.9 - 0.2) / ((0.9 - 0.2) + (0.8 - 0.5))
print(round(p, 3))
print(round(0.5 * p + 0.9 * (1 - p), 3))
```

输出 `[0.5, 0.2] 0.5`、`[0.9, 0.8] 0.8`、`0.7`、`0.62`。最后那个 0.62 严格落在保底 0.5 与封顶 0.8 之间——**这就是 von Neumann 的 minimax 定理在 2×2 里的具体模样**：无鞍点时，随机化把结果从"最坏情况下的 0.5"抬到"对手无论怎么防都是 0.62"。

## 6. 练习

```exercise
# @title: 练习：给一张零和矩阵算保底与封顶
# @check: [1, 2]
# @check: 2
# @check: [4, 3, 6]
# @check: 3
# @hint: 保底是「每行取最小，再在行里取最大」；封顶是「每列取最大，再在列里取最小」。两个方向不要弄反。
M = [[4, 1, 6], [2, 3, 5]]

floors = []
for row in M:
    val = max(row)              # ← 有错：甲被针对时拿到的是该行最小值，应为 min(row)
    floors.append(val)
print(floors)
print(max(floors))

ceilings = []
for i in range(len(M[0])):      # range 依次生成列号 0、1、2
    col = [M[0][i], M[1][i]]
    val2 = min(col)             # ← 有错：乙要防的是该列最大值，应为 max(col)
    ceilings.append(val2)
print(ceilings)
print(min(ceilings))
```

<details>
<summary>点开查看逐步解答</summary>

修正版：

```python
M = [[4, 1, 6], [2, 3, 5]]

floors = []
for row in M:
    floors.append(min(row))
print(floors)
print(max(floors))

ceilings = []
for i in range(len(M[0])):
    col = [M[0][i], M[1][i]]
    ceilings.append(max(col))
print(ceilings)
print(min(ceilings))
```

```text
行最小值：min(4,1,6)=1、min(2,3,5)=2  →  maximin = max(1,2) = 2
列最大值：max(4,2)=4、max(1,3)=3、max(6,5)=6  →  minimax = min(4,3,6) = 3
```

$2<3$，这张表没有鞍点：甲出第二行能保证拿到 2，乙出第二列能把甲压到 3，中间那道 1 的缝就是"谁先亮牌谁吃亏"的量化证据。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为保底和封顶是同一个玩家的两个量。保底是甲视角（每行取最小、再在行里取最大），封顶是乙视角（每列取最大、再在列里取最小），方向完全相反。把它们算成同一个人的账，是这类题最常见的错法。

**误区二**：你以为没有鞍点就无解。von Neumann 的 minimax 定理保证：允许随机化之后，值一定存在，且严格落在 maximin 与 minimax 之间。守门员那个 0.62 就是活证据。

**误区三**：你以为零和假设到处能用。贸易、协作、长期关系几乎都不是零和；把非零和局面硬套零和框架，会把双赢误判成你死我活——这也是本章后面几课要处理的事。

:::

## 8. 快问快答

```quiz
零和博弈里，maximin 与 minimax 的大小关系是什么？
- maximin 永远不超过 minimax [*]
- minimax 永远不超过 maximin
- 两者总是相等
? 弱对偶：先取小再取大，不会超过先取大再取小，这个不等式恒成立。两者相等时，那个格子就是鞍点。
```

```quiz
一个零和博弈没有鞍点时，最合理的做法是什么？
- 随机化自己的策略 [*]
- 选收益最高的那一行
- 干脆放弃这个博弈
? 没有鞍点意味着任何固定策略都能被针对；随机化让对手无从预判，把结果稳定在 maximin 与 minimax 之间的混合均衡值上。
```

## 9. 选读：为什么保底永远压不过封顶

<details>
<summary>选读 · 弱对偶的三步证明</summary>

要证 $\max_j\min_i M[j][i]\le\min_i\max_j M[j][i]$。

1. 取甲的安全行 $j^\ast=\arg\max_j\min_i M[j][i]$，乙的安全列 $i^\ast=\arg\min_i\max_j M[j][i]$。
2. 对这两个指标，逐点不等式恒成立：
$$\min_i M[j^\ast][i]\ \le\ M[j^\ast][i^\ast]\ \le\ \max_j M[j][i^\ast].$$
   左边是因为"某一点不小于全行的最小值"，右边是因为"某一点不大于全列的最大值"。
3. 把两端的定义代回去：
$$\underline v=\min_i M[j^\ast][i]\le M[j^\ast][i^\ast]\le\max_j M[j][i^\ast]=\overline v.$$

一句话记法：**"先取小再取大"永远不大于"先取大再取小"**。这条不等式不需要任何假设，所以叫"弱对偶"。

当等号成立时，$M[j^\ast][i^\ast]$ 同时是它所在行的最小值、所在列的最大值——从行看它是谷底，从列看它是峰顶，形状正像马鞍，故名鞍点。

至于等号不成立时该怎么办，von Neumann 在 1928 年给出的答案是：把策略空间从"有限个纯策略"扩大到"它们的所有概率混合"，此时 $\max_p\min_q=\min_q\max_p$ 一定成立。**把离散的选择换成连续的砝码，缝隙就被填平了**——这也是现代对抗训练、鲁棒优化的思路源头。

</details>

## 10. 下一站

零和博弈把"对方一定会针对我"推到了极致。可现实里的大多数博弈，对手不是只有一次交手——明天还要见面，明年还要合作。当博弈被反复进行，未来的影子会改变今天的算计：下一课看**重复博弈与合作**，理解为什么"一锤子买卖"与"细水长流"会导向完全不同的均衡：[重复博弈与合作](./30-repeated-games.md)。
