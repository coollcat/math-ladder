---
title: 度序列与中心性初步
lesson_id: graphs-networks/degree-centrality
prereqs:
  - graphs-networks/graph-types
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
  - degree-sequence
  - degree-centrality
applications:
  - influence-detection
  - infrastructure-analysis
exits:
  - data-ai
---

# 度序列与中心性初步

## 1. 开场钩子

一门课有 300 个学生和 1 个答疑老师，“谁最忙”一眼可见；但五个人的项目组里，只看人数猜不出谁是协调者。度数是最便宜的中心性指标：它只数直接连接，却已经能暴露枢纽、边缘和异常。

这一课先建立度序列，再看它作为中心性的能力和盲区。

## 2. 直觉解释

无向图中，一个节点的度就是握手的次数。把所有节点的度从大到小排队，得到度序列。

星形网络：中心连着所有人，度序列像 `[4, 1, 1, 1, 1]`。链形网络：中间两人各连两侧，度序列像 `[2, 2, 1, 1]`。两者节点数相同，形状完全不同。

## 3. 正式定义

对无向图 $G=(V,E)$，节点 $v$ 的度为

$$d(v)=|\lbrace u:(u,v)\in E\rbrace|.$$

为了比较不同规模的图，可用度中心性

$$C_D(v)=\frac{d(v)}{n-1},$$

其中 $n$ 是节点数，$n-1$ 是一个节点最多能有的邻居数。

## 4. 分步例题

四人小组的边是小蓝—小橙、小蓝—小绿、小蓝—小紫、小橙—小绿。

1. 小蓝的度是 3；
2. 小橙和小绿的度各为 2；
3. 小紫的度是 1；
4. 度序列是 `[3, 2, 2, 1]`；
5. 小蓝的度中心性是 $3/(4-1)=1.0$。

## 5. 动手实验

下面代码同时计算度序列和归一化中心性。试着把一条边从小蓝移到小紫，看排名如何变化。

```python title="从边表计算度和中心性"
# 无向边：每条只记录一次
edges = [
    ("小蓝", "小橙"),
    ("小蓝", "小绿"),
    ("小蓝", "小紫"),
    ("小橙", "小绿"),
]

# 字典推导式：扫描一遍边表，给每个节点准备一个空计数器
degrees = {name: 0 for name in ["小蓝", "小橙", "小绿", "小紫"]}
for u, v in edges:
    degrees[u] += 1   # 无向边让两端各加一度
    degrees[v] += 1

n = len(degrees)
degree_sequence = sorted(degrees.values(), reverse=True) # 从大到小排序
centrality = {
    name: round(d / (n - 1), 3) # round 把小数固定到三位
    for name, d in degrees.items()
}

print(degree_sequence)
print(centrality["小蓝"])
print(centrality["小紫"])
```

度序列便宜且稳定，但它只看直接邻居；“谁站在两个群体之间”还需要路径和社区信息。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为度最高就一定最有影响力。一个高 degree 的账号可能只待在小圈子里。

**误区二**：你以为度序列相同则图相同。`[2, 1, 1]` 可以对应一条链，也可能对应两个分离部分。

**误区三**：你以为有向图可以直接套无向度。入度和出度必须分开统计。

:::

## 7. 练习

```exercise
# @title: 练习：计算项目协作度序列
# @check: [3, 2, 2, 1]
# @check: 1.0
# @hint: 先累加每条边的两端，再用 n-1 归一化最大度。
edges = [
    ("P1", "P2"),
    ("P1", "P3"),
    ("P1", "P4"),
    ("P2", "P3"),
]

degree = {"P1": 0, "P2": 0, "P3": 0, "P4": 0}
for u, v in edges:
    degree[u] += 1
    degree[v] += 1

n = len(degree)
sequence = [degree[p] for p in ["P1", "P2", "P3", "P4"]]
print(sorted(sequence, reverse=True))
print(round(degree["P1"] / n, 3))
```

<details>
<summary>点开查看逐步解答</summary>

四个节点的度分别是 3、2、2、1。最大度是 3，节点数是 4，所以最大度中心性是：

$$C_D(P_1)=\frac{3}{4-1}=1.0.$$

</details>

```quiz
有向协作网络里的“度中心性”应该优先怎么报告？
- 只报一个总数，方向无关紧要
- 分别报入度和出度，必要时再定义总度口径 [*]
- 入度永远比出度更重要
? 收到协作请求和发起协作请求是两种行为；混成一个数前必须说明业务语义。
```

## 8. 边界与下一站预告

度中心性回答“谁直接连接多”。它不区分连接到强者还是弱者，也不看中间人位置。本章的 [中心性家族比较](./80-centrality-families.md) 会把度、特征向量和路径中心性放回同一张对照表。

先把度压进矩阵：行列和会变成一眼可见的邻居结构。

## 9. 下一站

→ [邻接矩阵](./25-adjacency-matrix.md)
