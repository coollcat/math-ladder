---
title: PageRank 与阻尼
lesson_id: graphs-networks/pagerank
prereqs:
  - graphs-networks/stationary-distribution
volume: 5
layer: L11
track:
  - information-learning
  - discrete-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - pagerank-damping
applications:
  - web-ranking
  - citation-analysis
exits:
  - data-ai
---

# PageRank 与阻尼

## 1. 开场钩子

一个只被别人指向、从不指向别人的页面会让朴素随机游走卡死；一个孤立页面则没有任何出口。PageRank 的办法很直接：每个时刻用小概率“传送”到任意页面。

这个阻尼项让算法稳定，也让重要性能沿整张链接图流动。

## 2. 直觉解释

想象一个随机冲浪者：

- 以概率 $d$ 按当前页面的链接前进；
- 以概率 $1-d$ 无视链接，等概率跳到任意页面；
- $d$ 常取 0.85。

于是每个页面都有最低流量保底，而高质量入链会持续送来额外流量。重要页面投出的票也更值钱。

## 3. 正式定义

设列随机矩阵 $M$ 表示纯链接转移，阻尼系数为 $d$，则 Google 矩阵为

$$G=dM+(1-d)\frac{1}{n}\vec{\mathbf 1}^{\,T}.$$

PageRank 向量是平稳分布：

$$\vec r=G\vec r,\qquad \sum_i r_i=1.$$

幂迭代从均匀分布开始：

$$\vec r^{\,(t+1)}=G\vec r^{\,(t)}.$$

## 4. 分步例题

三页链接：A 指向 B、C；B 指向 C；C 指向 A。

$$M=\begin{pmatrix}0&0&1\\0.5&0&0\\0.5&1&0\end{pmatrix}.$$

取 $d=0.85$，初始 $\vec r_0=(1/3,1/3,1/3)$：

1. 纯链接部分 $M\vec r_0=(1/3,1/6,1/2)$；
2. 阻尼底薪是 $(1-0.85)/3=0.05$；
3. 新 A 得 $0.85\times(1/3)+0.05\approx0.333$；
4. 新 B 得 $0.85\times(1/6)+0.05\approx0.192$，新 C 得 $0.85\times(1/2)+0.05\approx0.475$。

一步更新后总分仍约为 1。注意 C 虽然只被两页指向，但其中 B 把全部票投给了它，所以涨得最快。

## 5. 动手实验

下面代码做有上限的幂迭代。把 `damping` 改成 0 或 1，观察阻尼如何消除结构性死角带来的不稳定。

```python title="PageRank 幂迭代"
M = [
    [0.0, 0.0, 1.0],
    [0.5, 0.0, 0.0],
    [0.5, 1.0, 0.0],
]
n = len(M)
damping = 0.85      # 可改实验变量：按链接走的概率
r = [1 / n, 1 / n, 1 / n]
max_iterations = 100 # 迭代上限
tolerance = 1e-12

for iteration in range(max_iterations):
    link_flow = []
    for i in range(n):
        flow = 0.0
        for j in range(n):
            flow += M[i][j] * r[j] # 从第 j 页流向第 i 页
        link_flow.append(flow)

    nxt = [
        damping * flow + (1 - damping) / n
        for flow in link_flow
    ]
    change = sum(abs(a - b) for a, b in zip(nxt, r)) # zip 配对两列表元素
    r = nxt
    if change < tolerance:
        break

print([round(value, 3) for value in r])
```

结果不是入链数量的简单计数；它还取决于“谁投了票”。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 PageRank 只数入链。来源的重要性和出边数量都会稀释投票。

**误区二**：你以为阻尼就是噪声。它是保证连通性和唯一平稳分布的数学修正。

**误区三**：你以为分数绝对可比。不同爬取范围、权重和时间片会改变整个矩阵。

:::

## 7. 练习

```exercise
# @title: 练习：计算一步阻尼更新
# @check: [0.333, 0.192, 0.475]
# @hint: 先对每页累加 M*r0 的链接流，再乘 0.85，最后每项加底薪 (1-0.85)/3。
M = [
    [0.0, 0.0, 1.0],
    [0.5, 0.0, 0.0],
    [0.5, 1.0, 0.0],
]
r0 = [0.333, 0.333, 0.333]
damping = 0.85

next_rank = [0.0, 0.0, 0.0]
for i in range(3):
    next_rank[i] = damping * r0[i]

print([round(value, 3) for value in next_rank])
```

<details>
<summary>点开查看逐步解答</summary>

$$M\vec r_0=\begin{pmatrix}1/3\\1/6\\1/2\end{pmatrix}.$$

乘以 0.85 后分别约为 0.283、0.142、0.425；再加上底薪 0.05，得到 `[0.333, 0.192, 0.475]`。

</details>

## 8. 快问快答

```quiz
PageRank 中的阻尼项最主要解决什么问题？
- 让排名永远均匀
- 保证每个节点都有正到达概率并改善收敛 [*]
- 删除网页之间的重复链接
? teleport 使 Google 矩阵更接近良态的遍历链，孤立和死端不再吞掉游走者。
```

## 9. 下一站

PageRank 是中心性家族的一员。下一步把它与度、路径和特征向量中心性放回同一张对照表。

→ [中心性家族比较](./80-centrality-families.md)
