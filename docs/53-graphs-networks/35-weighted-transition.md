---
title: 加权图与转移矩阵
lesson_id: graphs-networks/weighted-transition
prereqs:
  - graphs-networks/adjacency-powers
volume: 5
layer: L11
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - transition-matrix-on-graph
applications:
  - traffic-flow
  - recommendation
exits:
  - data-ai
---

# 加权图与转移矩阵

## 1. 开场钩子

从首页出发，用户可能花 70% 时间进入商品页、30% 进入帮助页。邻接矩阵只知道“能去”，不知道“更可能去哪”。把出边权重归一化，就得到转移矩阵：每一列是一份离开当前节点的概率预算。

本课统一使用**列随机**约定：分布写在右侧，第 $j$ 列表示从节点 $j$ 出发。

## 2. 直觉解释

三页链接如下：

| 起点 | 可去位置 | 权重 |
| --- | --- | --- |
| A | B | 1 |
| B | A | 2 |
| B | C | 2 |
| C | A | 1 |

B 有两个等权出口，于是各拿 0.5；A 和 C 只有一个出口，概率都是 1。

$$P=\begin{pmatrix}0&0.5&1\\1&0&0\\0&0.5&0\end{pmatrix}.$$

每一列相加都等于 1。

## 3. 正式定义

设加权邻接矩阵 $W_{ij}\ge0$ 表示从 $j$ 到 $i$ 的强度。列随机转移矩阵定义为

$$P_{ij}=\frac{W_{ij}}{\sum_r W_{rj}}.$$

因此

$$\sum_i P_{ij}=1.$$

若初始分布是列向量 $\vec p_0$，则下一步分布为

$$\vec p_1=P\vec p_0.$$

## 4. 分步例题

从 A 出发，初始分布 $\vec p_0=(1,0,0)^T$。

1. 取 $P$ 的第一列：`(0, 1, 0)`；
2. 所以一步后一定在 B；
3. 再取第二列：`(0.5, 0, 0.5)`；
4. 两步后一半概率在 A，一半在 C。

## 5. 动手实验

### 实验 1（lab）：把权重一列一列归一化成概率

课程那个 $3\times3$ 的权重矩阵可以直接上手。下面这张卡里，每根箭头的粗细是原始权重，矩阵默认显示已经归一化后的 $P$：

```lab
{
  "type": "g53-transfer-builder",
  "title": "权重 W → 列随机矩阵 P：分母是每一列自己的和",
  "nodes": ["A", "B", "C"],
  "edges": [[0, 1, 2], [1, 2, 1], [2, 0, 3], [0, 2, 1]]
}
```

先点 `切换：权重 W / 概率 P` 来回切两次。切到 $W$ 时，矩阵每列下面写着这一列的和；切回 $P$ 时，每列和都变成 1——**归一化就是每列各除以自己那一列的和，列与列之间互不影响**。悬停任意一格，图上对应的那条有向边会加粗，读数条会告诉你这一格的 $P$ 是「权重 ÷ 列和」算出来的。

再点几次 `下一步`：节点的圆随概率变大变小，最后会稳定到平稳分布。注意方向——本课约定是**列随机**，所以推进是 $P$ 左乘当前的列向量 $p$，不是 $p$ 右乘 $P$。这一步方向搞反，整页公式都会跟着错。

### 实验 2（viz）：调整留守概率

```viz
{
  "type": "matrix-power",
  "title": "调整留守概率，观察长期流向",
  "pAA": 0.8,
  "pBB": 0.7,
  "power": 6
}
```

下面代码把任意正权重列归一化成概率。你可以改权重，但不要让一列出全零，否则会出现“无处可去”。

```python title="从权重构造列随机矩阵"
W = [
    [0, 2, 1],   # 行=A：从 B、C 指向 A 的强度
    [1, 0, 0],   # 行=B
    [0, 2, 0],   # 行=C
]
n = len(W)

P = [[0 for c in range(n)] for r in range(n)]
for source in range(n):
    column_sum = 0
    for target in range(n):
        column_sum += W[target][source] # 先累计这一列的总强度
    for target in range(n):
        P[target][source] = W[target][source] / column_sum

for row in P:
    print([round(x, 3) for x in row])
print([round(sum(P[row][col] for row in range(n)), 3) for col in range(n)])
```

最后一行是三列的和，应当都是 1。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为权重越大概率越大。若它是通勤时间，应先转换为速度或效用，再做归一化。

**误区二**：你混用行列约定。列随机配 $P\vec p$；若坚持行随机，就写 $\vec p^T P$。

**误区三**：你忽略孤立节点。出度为零的节点没有概率出口，需要特殊处理，PageRank 会专门解决它。

:::

## 7. 练习

```exercise
# @title: 练习：把加权出边变成转移矩阵
# @check: [0.0, 0.5, 1.0]
# @check: [1.0, 0.0, 0.0]
# @check: [0.0, 0.5, 0.0]
# @hint: 分别归一化第 1、2、3 列。
W = [
    [0, 2, 1],
    [1, 0, 0],
    [0, 2, 0],
]

P = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
for source in range(3):
    total = sum(W[target][source] for target in range(3))
    for target in range(3):
        P[source][target] = W[target][source] / total

for row in P:
    print([round(value, 3) for value in row])
```

<details>
<summary>点开查看逐步解答</summary>

三列的总权重分别是 1、4、1。归一化后：

$$P=\begin{pmatrix}0&0.5&1\\1&0&0\\0&0.5&0\end{pmatrix}.$$

</details>

```quiz
本课采用列随机矩阵 P，分布写在右侧。下一步分布应该怎么写？
- 用 P 乘当前分布向量 [*]
- 用当前分布行向量乘 P 的逆矩阵
- 把 P 每一行归一化后直接相加
? 列随机约定下，第 j 列是从节点 j 出发的概率预算，所以右乘列向量为 P 乘 p。
```

## 8. 边界提醒

转移矩阵回答“如果只按这些边随机移动，下一站在哪里”。它不等于真实用户行为，也不保证唯一长期分布；连通性和周期性会在平稳分布课继续展开。

## 9. 选读：列和为 1 保证了什么

<details>
<summary>选读 · 总量守恒与收敛速度</summary>

列随机最直接的后果是**总量守恒**：若 $\vec p$ 的各个分量加起来是 1，那么

$$\sum_i \left(P\vec p\right)_i=\sum_i\sum_j P_{ij}p_j=\sum_j p_j\underbrace{\sum_i P_{ij}}_{=1}=\sum_j p_j=1.$$

先对 $i$ 求和、再把 $P$ 的列和提出来，两个求和号可以交换——这是「每一步都恰好搬走 100% 的概率」的代数版本。

**它不保证收敛**。本课那个三页例子的 $P$ 的特征值是 $1,-0.75,-0.25$：其中 $-0.75$ 是负的，说明分布会**左右摇摆**才慢慢靠近 $[0.4,0.4,0.2]$，收敛速率是 $0.75^k$。把负特征值当成「误差会变号」来读：每一步不是单调逼近，而是像钟摆一样越摆越小。

**它也不保证唯一**。若图裂成两块互相走不到的区域，$P$ 可以写成块对角，此时 1 这个特征值至少出现两次，两块的相对权重就由起点决定了。正文「连通性和周期性会在平稳分布课继续展开」，指的就是这两件事。

</details>

## 10. 下一站

有了度和转移视角，就可以问另一个结构问题：去掉一条边需要克服多大的“阻力”？Laplacian 矩阵会给出答案。

→ [Laplacian 矩阵](./40-laplacian.md)
