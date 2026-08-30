---
title: 邻接矩阵
lesson_id: graphs-networks/adjacency-matrix
prereqs:
  - graphs-networks/degree-centrality
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
  - adjacency-matrix
applications:
  - social-network-analysis
  - infrastructure-analysis
exits:
  - data-ai
---

# 邻接矩阵

## 1. 开场钩子

三个城市之间有直达道路时，画图很直观；可三百个路口同时变化时，肉眼立刻失效。邻接矩阵把所有“谁连谁”压进一张方表：一行扫过去就是一个节点的全部邻居。

这一课把关系数据变成能做乘法的对象。

## 2. 直觉解释

四位车站 A、B、C、D 有三条相邻区段：A—B、A—C、B—D。写一张 4×4 表：

- 行代表起点，列代表终点；
- 有边记 1，无边记 0；
- 无向图的邻接矩阵沿主对角线对称。

$$A=\begin{pmatrix}0&1&1&0\\1&0&0&1\\1&0&0&0\\0&1&0&0\end{pmatrix}.$$

第一行 `[0, 1, 1, 0]` 一眼说明 A 连着 B 和 C。

## 3. 正式定义

对节点顺序为 $v_1,\ldots,v_n$ 的简单无向图 $G=(V,E)$，邻接矩阵 $A$ 满足

$$A_{ij}=\begin{cases}1,&(v_i,v_j)\in E\\0,&\text{其他}\end{cases}.$$

若图无向，则 $A_{ij}=A_{ji}$。第 $i$ 行相加就是节点 $v_i$ 的度：

$$\sum_j A_{ij}=d(v_i).$$

## 4. 分步例题

取上图中的 4 节点道路网。

1. 第一行相加：$0+1+1+0=2$，所以 A 的度是 2。
2. 第二行相加：$1+0+0+1=2$，所以 B 的度是 2。
3. 第三行相加：$1$，所以 C 的度是 1。
4. 第四行相加：$1$，所以 D 的度是 1。

矩阵第一行的非零列正好是 A 的邻居 B、C。

## 5. 动手实验

下面的代码检查无向边的双向记录是否完整。修改任意一条边后重新运行。

```python title="检查无向邻接矩阵"
nodes = ["A", "B", "C", "D"]
edges = [("A", "B"), ("A", "C"), ("B", "D")]

A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
for u, v in edges:
    i, j = nodes.index(u), nodes.index(v) # index 找出编号
    A[i][j] = 1
    A[j][i] = 1                            # 无向图补上反向格

for row in A:
    print(row)
print(sum(A[0]))                           # sum 计算第一行度数
```

如果删除 `A[j][i] = 1`，矩阵会悄悄变成有向图。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为矩阵元素相加等于边数。无向图中每条边会在对称两格各出现一次。

**误区二**：你以为行列顺序无关。同一张图换节点顺序，矩阵会相似地重排。

**误区三**：你以为缺失格一定表示不可能相连。蛋白质网中未观测到的相互作用不一定不存在。

:::

## 7. 练习

```exercise
# @title: 练习：补全无向邻接矩阵
# @check: [0, 1, 1, 0]
# @check: [1, 0, 0, 1]
# @check: [1, 0, 0, 0]
# @check: [0, 1, 0, 0]
# @hint: 每条无向边都要在两个对称格各写一次。
nodes = ["A", "B", "C", "D"]
edges = [("A", "B"), ("A", "C"), ("B", "D")]

A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
for u, v in edges:
    i, j = nodes.index(u), nodes.index(v)
    A[i][j] = 1

for row in A:
    print(row)
```

<details>
<summary>点开查看逐步解答</summary>

三条边分别写入 `(A,B)`、`(A,C)`、`(B,D)` 及其反向格：

$$A=\begin{pmatrix}0&1&1&0\\1&0&0&1\\1&0&0&0\\0&1&0&0\end{pmatrix}.$$

</details>

## 8. 快问快答

```quiz
无向简单图的邻接矩阵一定满足什么？
- 主对角线全为 1
- 沿主对角线对称 [*]
- 所有元素都是 0 或都是 1
? 无向边在两个方向各记录一次，但自环和稠密程度由具体图决定。
```

## 9. 下一站

矩阵不仅能存一张图。把邻接矩阵自己乘自己，就会数出长度为 2 的路径。

→ [邻接矩阵幂与路径计数](./30-adjacency-powers.md)
