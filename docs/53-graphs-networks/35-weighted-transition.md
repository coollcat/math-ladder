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

## 9. 下一站

有了度和转移视角，就可以问另一个结构问题：去掉一条边需要克服多大的“阻力”？Laplacian 矩阵会给出答案。

→ [Laplacian 矩阵](./40-laplacian.md)
