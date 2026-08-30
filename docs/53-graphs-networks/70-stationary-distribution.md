---
title: 平稳分布
lesson_id: graphs-networks/stationary-distribution
prereqs:
  - graphs-networks/random-walks
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
  - stationary-distribution
applications:
  - long-run-traffic
  - markov-chain-analysis
  - wireless-load-balance
  - brain-connectivity
exits:
  - data-ai
---

# 平稳分布

## 1. 开场钩子

地铁早高峰刚开始时人流取决于始发站；运行很久后，各站压力趋于一种结构性平衡。随机游走也有类似现象：初始位置影响变弱，转移矩阵开始主导长期流量。

这个不再变化的分布叫平稳分布。

## 2. 直觉解释

两状态链中，从 A 留在 A 的概率是 0.8，从 B 留在 B 的概率是 0.7。A 的出口更难离开（离开概率 0.2 小于 B 的 0.3），直觉上长期该有更多人待在 A。

解方程证实了这个直觉：平衡点是 $(0.6,0.4)$——六成份额落在 A；虽然个体继续移动，但总量比例不变。

## 3. 正式定义

列向量 $\vec\pi$ 是列随机矩阵 $P$ 的平稳分布，当且仅当

$$P\vec\pi=\vec\pi,\qquad \sum_i \pi_i=1,\qquad \pi_i\ge0.$$

若图对应马尔可夫链不可约且非周期，则极限存在：

$$\lim_{k\to\infty}P^k\vec p_0=\vec\pi.$$

对无向无权图的简单随机游走，常用形式是

$$\pi_i=\frac{d_i}{2m},$$

其中 $m$ 是边数。

这三个条件在真实网络里都有具体含义：无线基站切换图若被分区隔开，负载估计就只会在自己那片里打转；交通网在深夜关闭线路后可能失去不可约性；脑连接矩阵的阈值过高会把脑网络切成碎片。报告平稳分布前，先检查图是否连成一体、是否不会陷入周期交替。

## 4. 分步例题

两状态矩阵

$$P=\begin{pmatrix}0.8&0.3\\0.2&0.7\end{pmatrix}.$$

1. 设平稳分布为 $(x,1-x)$；
2. 第一行方程：$0.8x+0.3(1-x)=x$；
3. 化简得 $0.3=0.5x$；
4. 所以 $x=0.6$，另一项为 0.4。

## 5. 动手实验

幂迭代反复左乘转移矩阵。这里最多迭代 60 次，并用阈值提前停止。

先用两节点组件看收敛形状，再运行下面的幂迭代核对数字。

```viz
{
  "type": "matrix-power",
  "title": "两状态链趋向平稳分布",
  "pAA": 0.8,
  "pBB": 0.7,
  "power": 12
}
```

```python title="用幂迭代逼近平稳分布"
P = [
    [0.8, 0.3],
    [0.2, 0.7],
]
p = [1.0, 0.0]      # 初始全部在 A
max_iterations = 60 # 迭代上限
tolerance = 1e-10    # 变化小于该值就停止

for iteration in range(max_iterations):
    nxt = [
        P[0][0] * p[0] + P[0][1] * p[1],
        P[1][0] * p[0] + P[1][1] * p[1],
    ]
    change = abs(nxt[0] - p[0]) + abs(nxt[1] - p[1]) # 总变化量
    p = nxt
    print(iteration + 1, round(p[0], 6), round(p[1], 6))
    if change < tolerance:
        break               # break 提前跳出有限循环

print([round(value, 3) for value in p])
```

输出会逐渐靠近 `(0.6, 0.4)`。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为任何转移矩阵都有唯一平稳分布。不连通可能有多个，周期链可能不收敛。

**误区二**：你把行随机与列随机混写。公式方向必须一致。

**误区三**：你以为平稳等于静止。个体仍在流动，只是总体比例不变。

:::

## 7. 练习

```exercise
# @title: 练习：求两状态平稳分布
# @check: [0.6, 0.4]
# @hint: 设 x 是 A 的份额，解 0.8x + 0.3(1-x)=x。
x = 0.75
pi = [x, 1 - x]

print([round(value, 3) for value in pi])
```

<details>
<summary>点开查看逐步解答</summary>

由 $0.8x+0.3-0.3x=x$，得 $0.3=0.5x$，因此 $x=0.6$。

所以平稳分布是 `[0.6, 0.4]`。

</details>

```quiz
平稳分布存在且幂迭代收敛，通常需要转移链满足什么？
- 不可约且非周期 [*]
- 所有节点度数相同
- 矩阵所有元素都是整数
? 不可约保证没有封闭孤岛，非周期排除来回震荡；此时长期频率才由结构稳定决定。
```

## 8. 收敛边界

“长时间趋近”需要不可约和非周期。网页图里有只进不出或只出不进的节点时会失败；这正是 PageRank 加入阻尼 teleport 的动机。

## 9. 下一站

下一步给随机游走加一个逃逸出口，让每个页面都有微小到达概率，这就是 PageRank 的阻尼思想。

→ [PageRank 阻尼](./75-pagerank.md)
