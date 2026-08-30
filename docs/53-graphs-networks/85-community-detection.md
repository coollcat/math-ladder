---
title: 社区检测
lesson_id: graphs-networks/community-detection
prereqs:
  - graphs-networks/centrality-families
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
  - community-detection
applications:
  - customer-segmentation
  - protein-complex-discovery
exits:
  - data-ai
---

# 社区检测

## 1. 开场钩子

一张校园 friendship 网里，班级、社团和室友群会叠在一起。社区检测想找的不是一个人，而是“内部连接密集、之间连接稀疏”的节点组。

它常是无监督学习：图结构先给出假设，人再解释含义。

## 2. 直觉解释

好的分区像两个紧密的 friend group，中间只有一座桥；坏分区会把同一群好友硬切成两半。

所以可以用三个量评估：

1. 内部边数：组内保留了多少关系；
2. 切割边数：跨组损失多少关系；
3. 平衡度：是否把三个点算成社区、其余全算噪声。

## 3. 正式定义

给定节点划分 $\mathcal C$，切割集是

$$\text{cut}(\mathcal C)=\lbrace(u,v)\in E:c(u)\ne c(v)\rbrace.$$

Ratio cut 把切边数量除以各组大小乘积：

$$\text{RatioCut}=\sum_{k}\frac{\text{cut}(C_k,V\setminus C_k)}{|C_k|}.$$

谱聚类可看作近似最小化这类目标。归一化不同，小社区的待遇也不同。

## 4. 分步例题

六个点分两组：三角形 `{0,1,2}` 与三角形 `{3,4,5}`，中间只有桥 `(2,3)`。

1. 第一组内部有 3 条边；
2. 第二组内部有 3 条边；
3. 跨组边只有 1 条；
4. 若按符号分成两组，总内部边为 6，切割为 1；
5. 这比随机分组明显更像两个社区。

## 5. 动手实验

下面代码允许你改每个节点的社区标签。每次改动后立即输出内部、外部和平衡量。

```python title="评估一个社区划分"
edges = [
    (0, 1), (1, 2), (0, 2),
    (3, 4), (4, 5), (3, 5),
    (2, 3),
]
labels = ["A", "A", "A", "B", "B", "B"] # 可改实验变量

internal = 0
external = 0
for u, v in edges:
    if labels[u] == labels[v]:
        internal += 1   # 同社区边
    else:
        external += 1   # 跨社区切割边

sizes = {"A": labels.count("A"), "B": labels.count("B")} # count 统计出现次数
size_pair = sorted(sizes.values())       # 从小到大排列两组规模
balance = size_pair[0] / size_pair[-1]   # 最小组除以最大组，避免引入新内置函数
print(internal)
print(external)
print(round(balance, 3))
```

只优化切割会把所有点分进 singleton；必须同时看平衡和解释成本。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为社区天然唯一。重叠社区、层级社区和多关系网可能都有合理答案。

**误区二**：你忽略观测缺失。蛋白质网中未测到的相互作用会让“稀疏”变成采样盲区。

**误区三**：你只报告算法标签。没有稳定性检查和领域解释的社区很难复用。

:::

## 7. 练习

```exercise
# @title: 练习：统计社区内边与切边
# @check: 6
# @check: 1
# @hint: 标签相同计 internal，否则计 external。
edges = [
    (0, 1), (1, 2), (0, 2),
    (3, 4), (4, 5), (3, 5),
    (2, 3),
]
labels = ["A", "A", "A", "B", "B", "B"]

internal = len(edges)
external = len(edges)
print(internal)
print(external)
```

<details>
<summary>点开查看逐步解答</summary>

前六条边的两端标签相同，第七条 `(2,3)` 从 A 到 B。

所以 `internal=6`，`external=1`。

</details>

```quiz
两个社区之间只有一条切边，就能断言社区划分很好吗？
- 不一定，还要看社区大小平衡和结果稳定性 [*]
- 一定很好，因为外连边越少越纯
- 一定不好，因为社区之间必须有大量边
? 极小群组、观测缺失和参数扰动都可能制造低切边假象。
```

## 8. 方法边界

社区检测结果取决于边定义、权重、归一化和分辨率。同一张知识图谱按引用、共现和作者关系建图，可能得到完全不同的社区。应保存参数并做扰动检验。

## 9. 下一站

要比较不同分辨率下的分区，需要一把更公平的尺子——模块度。

→ [模块度](./90-modularity.md)
