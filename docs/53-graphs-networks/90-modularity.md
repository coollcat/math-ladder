---
title: 模块度
lesson_id: graphs-networks/modularity
prereqs:
  - graphs-networks/community-detection
volume: 5
layer: L11
track:
  - information-learning
  - probability-statistics
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - modularity
applications:
  - social-community-scoring
  - biological-module-discovery
exits:
  - data-ai
---

# 模块度

## 1. 开场钩子

两组各有 100 条内部边就一定一样好吗？如果一组本该有 500 条，另一本该只有 80 条，答案不同。模块度把观察到的组内边与“随机接线下的期望”相减。

它回答的是：这个分区比随机好多少？

## 2. 直觉解释

模块度高表示同社区边比随机配置更多，跨社区边相对少。但它是模型化分数，不是真理：

- 分辨率限制会漏掉小社区；
- 加权和度序列都会改变期望；
- 最大模块度不一定是真实生成过程。

先记住最常用的无权版本。

## 3. 正式定义

对无向图和划分 $c(i)$，模块度为

$$Q=\frac{1}{2m}\sum_{ij}\left(A_{ij}-\frac{k_i k_j}{2m}\right)\mathbf 1[c(i)=c(j)].$$

等价的组分数形式是

$$Q=\sum_c(e_{cc}-a_c^2).$$

$e_{cc}$ 是社区 $c$ 内部边占总边数比例，$a_c$ 是与社区 $c$ 中节点相连的边端点占比，也就是该社区度数和除以 $2m$。

## 4. 分步例题

五个点、五条边：三角形 A-B-C，一条边 D-E，外加桥 A-D。

1. 总边数 $m=5$；
2. 社区 1 内部边有 3 条，$e_{11}=3/5$；
3. 社区 2 内部边有 1 条，$e_{22}=1/5$；
4. 社区 1 的度端点和为 $3+2+2=7$，所以 $a_1=7/(2m)=0.7$；
5. 社区 2 的 $a_2=3/10=0.3$；
6. 因此

$$Q=(0.6+0.2)-(0.7^2+0.3^2)=0.22.$$

## 5. 动手实验

下面代码逐条累加模块度贡献。改变一个节点标签，看正负贡献如何翻转。

```python title="手算一个小图的模块度"
A = [
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
]
labels = [0, 0, 0, 1, 1]
n = len(A)
m = sum(sum(row) for row in A) / 2 # 无向矩阵中每条边计两次
k = [sum(row) for row in A]

Q = 0.0
for i in range(n):
    for j in range(n):
        if labels[i] == labels[j]:
            Q += (A[i][j] - k[i] * k[j] / (2 * m)) / (2 * m)

print(m)
print(round(Q, 3))
```

若把节点 3 改到社区 0，桥不再被切开，但 D-E 会成为跨组边，总分通常下降。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 Q 高就是真社区。它只是相对配置模型的偏差。

**误区二**：你忘记归一化。原始内部边数无法在不同规模图间比较。

**误区三**：你把加权图当无权图算。权重、方向和自环都要进入对应公式。

:::

## 7. 练习

```exercise
# @title: 练习：计算两社区模块度
# @check: 5.0
# @check: 0.22
# @hint: 先把总度数除以 2 得到 m；再用 e11+e22-a1²-a2²，其中 e 要除以 m、a 要除以 2m。
internal_edges = [3, 1]
degree_sums = [7, 3]
total_degree = 8

m = total_degree / 2
a_values = [degree_sum for degree_sum in degree_sums]
Q = sum(a_values)
print(m)
print(round(Q, 3))
```

<details>
<summary>点开查看逐步解答</summary>

真实总度数是 $7+3=10$，所以 `total_degree` 应改成 10，$m=10/2=5.0$。模块度为：

```python
internal_edges = [3, 1]
degree_sums = [7, 3]
m = 5.0

Q = sum(internal_edges) / m - (degree_sums[0] / (2 * m)) ** 2 - (degree_sums[1] / (2 * m)) ** 2
print(round(Q, 3))
```

即 $e_{11}+e_{22}=3/5+1/5=0.8$，$a_1^2+a_2^2=(7/10)^2+(3/10)^2=0.58$，故 $Q=0.8-0.58=0.22$。

</details>

```quiz
模块度 Q 很高能证明什么？
- 相对配置模型，同社区边确实偏多 [*]
- 社区生成机制已经被证明
- 小型稠密团一定不会被漏掉
? Q 只是相对零模型的偏差分数；分辨率限制和建模选择仍需另行检验。
```

## 8. 解释边界

模块度优化有分辨率极限：很小的稠密团可能被并入大团。加权、时间演化或层次结构需要改用对应模型。报告 Q 时应同时报告分区大小和边定义。

## 9. 下一站

社区是静态分组；接下来看信息如何在邻居之间逐层传递，这正是消息传递神经网络的核心动作。

→ [消息传递](./95-message-passing.md)
