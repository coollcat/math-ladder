---
title: 图上的随机游走
lesson_id: graphs-networks/random-walks
prereqs:
  - graphs-networks/spectral-clustering
volume: 5
layer: L11
track:
  - probability-statistics
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - graph-random-walk
applications:
  - recommendation
  - network-coverage
exits:
  - data-ai
---

# 图上的随机游走

## 1. 开场钩子

一个读者在知识图谱里随机点链接：在热门概念旁停留更久，还是被长链拖去冷门角落？单步无法预测，但几百个有上限的模拟步会显出稳定形状。

随机游走把图结构翻译成“时间都花在哪里”。

## 2. 直觉解释

规则很简单：站在一个节点，等概率选一条出边走过去。城市里的人随机换乘，网页冲浪者随机点超链接，蛋白质网络中的信号随机传给结合伙伴。

短时间结果依赖起点；长时间访问频率往往由结构决定。社区像一个浅盆，游走者容易留在里面。

## 3. 正式定义

设列随机矩阵 $P$ 的第 $j$ 列是从节点 $j$ 出发的分布。若当前位置为 $X_t$，则

$$\Pr(X_{t+1}=i\mid X_t=j)=P_{ij}.$$

$k$ 步后：

$$\vec p_k=P^k\vec p_0.$$

本课模拟都会设置固定种子和最大步数，保证实验可复现且不会无限运行。

## 4. 分步例题

四节点链 $A-B-C-D$ 的列随机矩阵为

$$P=\begin{pmatrix}0&0.5&0&0\\1&0&0.5&0\\0&0.5&0&1\\0&0&0.5&0\end{pmatrix}.$$

从 A 出发：

1. 一步后必到 B；
2. 两步后一半回 A、一半到 C；
3. 所以 $P^2\vec e_A=(0.5,0,0.5,0)$。

## 5. 动手实验

先看最小的两节点游走：拖动留守概率和幂次，观察一步位置如何变成长期节奏。

```viz
{
  "type": "matrix-power",
  "title": "两节点游走的重复转移",
  "pAA": 0.2,
  "pBB": 0.7,
  "power": 8
}
```

下面代码在同一个无向三角形加尾巴的图上游走。种子固定为 7，步数最多 400。你可以改起点或步数，但保留 `random.seed` 和 `for` 上限。

```python title="有种子、有上限的随机游走"
import random # random 模块生成可复现伪随机数

neighbors = {
    0: [1, 2],
    1: [0, 2, 3],
    2: [0, 1],
    3: [1],
}
start = 0
max_steps = 400          # 游走上限：防止浏览器卡住
random.seed(7)           # 固定随机序列，让每次输出相同

position = start
visits = {node: 0 for node in neighbors}
for step in range(max_steps):   # 只允许有限步
    visits[position] += 1       # 先记录当前站
    position = random.choice(neighbors[position]) # choice 从邻居中等概率选一个

total = sum(visits.values())
frequencies = {node: round(count / total, 3) for node, count in visits.items()}
print(visits)
print(frequencies)
```

节点 3 只有唯一出口，却不是最常访问点；长期频率由整个结构共同决定。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为一次模拟就是概率。要固定种子重复足够多步，并报告不确定性。

**误区二**：你以为度高的节点一定频率最高。还要看它连向谁以及是否处在死胡同式结构里。

**误区三**：你以为无界循环没问题。课程代码必须用有限步数；真实工程也要设超时。

:::

## 7. 练习

```exercise
# @title: 练习：计算链形图两步分布
# @check: [0.5, 0.0, 0.5, 0.0]
# @hint: 先取 P 的第一列得到一步分布，再用 P 乘它。
P = [
    [0.0, 0.5, 0.0, 0.0],
    [1.0, 0.0, 0.5, 0.0],
    [0.0, 0.5, 0.0, 1.0],
    [0.0, 0.0, 0.5, 0.0],
]
p0 = [1.0, 0.0, 0.0, 0.0]

p1 = [p0[i] for i in range(4)]
p2 = [0.0, 0.0, 0.0, 0.0]
for i in range(4):
    p2[i] = sum(P[i][j] * p1[j] for j in range(i))

print([round(value, 3) for value in p2])
```

<details>
<summary>点开查看逐步解答</summary>

从 A 出发的一步分布是 $(0,1,0,0)$。两步时：

$$P\begin{pmatrix}0\\1\\0\\0\end{pmatrix}=(0.5,0,0.5,0).$$

</details>

```quiz
比较两个随机游走的访问频率时，最少要报告哪些实验设置？
- 种子或重复次数、步数上限和起点 [*]
- 只报告最终频率最高的节点
- 只报告图有多少个节点
? 随机模拟受起点、步数和随机序列影响；缺少这些设置就无法判断差异是结构还是噪声。
```

## 8. 模拟边界

有限模拟有两个误差来源：随机波动和未到达的远区。报告结论时应说明种子、步数和起点；比较算法时要用同一套设置。

## 9. 下一站

当游走时间足够长，分布可能停止变化。这个极限就是平稳分布。

→ [平稳分布](./70-stationary-distribution.md)
