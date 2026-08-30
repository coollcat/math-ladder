---
title: 消息传递
lesson_id: graphs-networks/message-passing
prereqs:
  - graphs-networks/modularity
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - message-passing
applications:
  - molecular-property-prediction
  - recommendation
exits:
  - data-ai
---

# 消息传递

## 1. 开场钩子

谣言扩散、交通调度和蛋白质结合预测都有一个共同动作：每个节点先听邻居说话，再更新自己的状态。图神经网络把这个动作抽象成消息传递。

这一课先不谈训练，只看一层传播到底做了什么。

## 2. 直觉解释

一个节点的下一状态通常由三件事决定：

1. 自己当前的特征；
2. 从邻居收集来的消息；
3. 一个更新函数。

聚合方式可以是求和、平均或最大值。平均对度数不敏感，求和保留规模，最大值只抓最强信号。

## 3. 正式定义

设节点 $v$ 在第 $l$ 层的特征为 $\vec h_v^{(l)}$，邻居集合为 $N(v)$。消息传递可写成

$$\vec m_v^{(l+1)}=\text{AGG}_{u\in N(v)}\left(\vec h_u^{(l)}\right),$$

$$\vec h_v^{(l+1)}=\text{UPDATE}\left(\vec h_v^{(l)},\vec m_v^{(l+1)}\right).$$

若用平均聚合：

$$\vec m_v=\frac{1}{|N(v)|}\sum_{u\in N(v)}\vec h_u.$$

## 4. 分步例题

星形图中中心 C 的三个叶子特征分别是 $(1,0)$、$(0,1)$、$(1,1)$；中心自身是 $(4,0)$。

1. 若只聚合邻居，C 收到的平均消息是 $((1+0+1)/3,(0+1+1)/3)=(2/3,2/3)$；
2. 任一叶子只收到 C 的消息 $(4,0)$；
3. 若更新时把自身也平均进来（自环让 C 的邻居变成 4 个），结果是 $((4+1+0+1)/4,(0+0+1+1)/4)=(3/2,1/2)$；
4. 是否包含自环是建模选择，会明显改变结果。

## 5. 动手实验

下面代码比较“只听邻居”与“把自己也算进邻居”。修改特征后观察两种语义的差别。

```python title="一层平均消息传递"
features = {
    "C": [4, 0],
    "L1": [1, 0],
    "L2": [0, 1],
    "L3": [1, 1],
}
neighbors = {
    "C": ["L1", "L2", "L3"],
    "L1": ["C"],
    "L2": ["C"],
    "L3": ["C"],
}

aggregate_only = {}
for node, neigh in neighbors.items():
    sums = [0.0, 0.0]
    for friend in neigh:
        sums[0] += features[friend][0] # 累加第一维消息
        sums[1] += features[friend][1]
    aggregate_only[node] = [
        value / len(neigh) for value in sums # 除以邻居数得到平均
    ]

print({node: [round(x, 3) for x in vec] for node, vec in aggregate_only.items()})
```

真实 GNN 还会在聚合后套权重矩阵和非线性函数；但结构信息已经在这张表里流动了一次。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为所有节点同时收到新消息。一层内要用旧特征计算，不能边算边覆盖。

**误区二**：你以为平均和求和可以随意互换。它们对节点度和特征尺度的影响不同。

**误区三**：你忘记方向。有向图中入邻居和出邻居代表完全不同的信息来源。

:::

## 7. 练习

```exercise
# @title: 练习：计算纯邻居平均
# @check: {'C': [2.0, 2.0], 'L1': [4.0, 0.0], 'L2': [4.0, 0.0], 'L3': [4.0, 0.0]}
# @hint: 每个节点只平均邻居列表里的旧特征；输出要保留全部原始节点键名。
features = {
    "C": [4, 0],
    "L1": [1, 2],
    "L2": [2, 3],
    "L3": [3, 1],
}
neighbors = {
    "C": ["L1", "L2", "L3"],
    "L1": ["C"],
    "L2": ["C"],
    "L3": ["C"],
}

aggregated = {}
for node, neigh in neighbors.items():
    aggregated[node] = features[node] # 错误：把自身原样放进结果

print(aggregated)
```

<details>
<summary>点开查看逐步解答</summary>

C 的三条邻居消息是 `(1,2)`、`(2,3)`、`(3,1)`，平均后是 `(2,2)`。

每个叶子只有邻居 C，所以平均后是 `(4,0)`。输出应为 `{'C': [2.0, 2.0], 'L1': [4.0, 0.0], 'L2': [4.0, 0.0], 'L3': [4.0, 0.0]}`。

</details>

## 8. 表达边界

一维 Weisfeiler-Lehman 视角说明：普通消息传递难以区分某些规则对称结构。加权重、边特征、位置编码和高阶关系可以增强表达，但也增加数据和计算成本。

## 9. 下一站

下一步把平均升级成 GCN 的对称归一化聚合：让高度数节点不会天然淹没低度数节点。

→ [100 · 图卷积一层聚合](./100-graph-convolution.md)
