---
title: 特征值与谱布局
lesson_id: graphs-networks/spectral-layout
prereqs:
  - graphs-networks/degree-normalization
volume: 5
layer: L11
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - fiedler-vector
applications:
  - graph-layout
  - dimensionality-reduction
exits:
  - data-ai
  - research
---

# 特征值与谱布局

## 1. 开场钩子

两个三人小组由一座桥连着。肉眼看得出两组，但程序怎么知道？把 Laplacian 最小的非零特征向量当作横坐标，左边三点会聚成低值，右边三点聚成高值。

这个向量叫 Fiedler 向量，它是图最便宜的“裂缝探测器”。

## 2. 直觉解释

Laplacian 的二次型 $\vec x^TL\vec x$ 是相邻节点取值差平方和。最小值 0 对应全 1 常向量；次小特征值对应“既要变化小，又不是常数”的最佳折衷。

于是特征向量给出一种一维布局：相连节点尽量靠近，而图中最脆弱的分界自然落在中间。

## 3. 正式定义

将实对称矩阵 $L$ 的特征对按特征值从小到大排列：

$$0=\lambda_1\le\lambda_2\le\cdots\le\lambda_n.$$

$\lambda_2$ 称为代数连通度，对应特征向量称为 Fiedler 向量 $\vec q_2$。二维谱布局可用两个最小非零特征向量：

$$\text{坐标}(v_i)=(q_{2,i},q_{3,i}).$$

## 4. 分步例题

六个节点组成两个三角形，桥为 3—4。

1. 构造 $L=D-A$；
2. 计算特征值：约 `[0, 0.438, 3, 3, 3, 4.562]`；
3. 零特征值只有一个，说明整张图连通；
4. 很小的 0.438 说明存在一个容易切开的瓶颈；
5. 对应 Fiedler 向量约为 `[-0.465, -0.465, -0.261, 0.261, 0.465, 0.465]`；
6. 符号正好把前三个点和后三个点分开。

## 5. 动手实验

先用一个可拖动的二维对称矩阵找回“特征方向”的手感；下一小节再把这个代数证据放到六节点图上。

```viz
{
  "type": "eigen-direction",
  "title": "对称矩阵的不变方向热身",
  "matrix": [2, 1, 1, 2]
}
```

下面的代码画出 Fiedler 一维布局。改变桥的位置或删掉桥，再运行并观察坐标分裂。

```python title="用第二小特征向量布置图"
import numpy as np # NumPy 提供数组对象和线性代数函数
import matplotlib.pyplot as plt # matplotlib 用于绘制散点图

nodes = list(range(6)) # list 把范围对象变成可索引列表
edges = [(0, 1), (1, 2), (0, 2), (3, 4), (4, 5), (3, 5), (2, 3)]
n = len(nodes)

# np.zeros 创建 n×n 全零数组；dtype=float 表示浮点数
A = np.zeros((n, n), dtype=float)
for u, v in edges:
    A[u, v] = 1
    A[v, u] = 1

degree = A.sum(axis=1)       # axis=1 表示按行求和
L = np.diag(degree) - A      # np.diag 用向量生成对角矩阵
values, vectors = np.linalg.eigh(L) # eigh 同时返回实对称矩阵的特征值和特征向量
fiedler = vectors[:, 1]      # 特征值升序排列后第 1 列是次小特征向量

fig, ax = plt.subplots(figsize=(7, 2)) # subplots 返回图像和坐标轴对象
ax.scatter(fiedler[:3], [0, 0, 0], s=90, label="左社区")
ax.scatter(fiedler[3:], [0, 0, 0], s=90, label="右社区")
ax.axhline(0, color="gray", linewidth=0.8) # 画水平参考线
ax.set_title("Fiedler vector one-dimensional layout") # 设置标题
ax.legend()                  # 显示图例
plt.show()

print(np.round(values, 3))   # round 数组并保留三位小数
print(np.round(fiedler, 3))
```

特征值提供结构证据：一个零说明连通，很小的次小值说明瓶颈明显。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为谱布局显示的是地理坐标。它显示的是结构相似性，距离不等于物理距离。

**误区二**：你以为特征向量符号绝对稳定。同一方向的正负倍数都是合法特征向量。

**误区三**：你以为最小非零特征值小就一定能安全切图。还要看切割大小、平衡约束和归一化方式。

:::

## 7. 练习

```exercise
# @title: 练习：求双三角图的 Laplacian 特征值
# @check: [0.438, 3.0, 3.0, 3.0, 4.562]
# @check: 1
# @hint: 构造 D-A 后对 L 调用 np.linalg.eigh；第 1 行打印 values[1:] 的三位舍入，零特征值个数用 |value| < 1e-10 统计。
import numpy as np

A = np.array([
    [0, 1, 1, 0, 0, 0],
    [1, 0, 1, 0, 0, 0],
    [1, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 1],
    [0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 0],
], dtype=float)

L = -A
values, vectors = np.linalg.eigh(A)
print([round(float(value), 3) for value in np.round(values, 3)[1:]])
zero_count = 0 # 改成：统计绝对值小于 1e-10 的特征值个数
print(zero_count)
```

<details>
<summary>点开查看逐步解答</summary>

六个节点的度依次是 `2, 2, 3, 3, 2, 2`（节点 2 和 3 多一条桥）。正确写法：

```python
import numpy as np

A = np.array([
    [0, 1, 1, 0, 0, 0],
    [1, 0, 1, 0, 0, 0],
    [1, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 1],
    [0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 0],
], dtype=float)

L = np.diag(A.sum(axis=1)) - A
values, vectors = np.linalg.eigh(L)
print([round(float(value), 3) for value in np.round(values, 3)[1:]])
zero_count = int(np.sum(np.abs(values) < 1e-10))
print(zero_count)
```

对 $L$（不是 $A$）求谱：次小起是 `[0.438, 3.0, 3.0, 3.0, 4.562]`；接近零的特征值只有 1 个，说明整张图仍然连通。

</details>

## 8. 方法边界

谱方法给出证据，不自动给出唯一结论：

1. 未观测边会改变矩阵；
2. 加权、归一化和自环都会移动特征值；
3. 重根附近的方向可能不稳定；
4. 平衡约束外的极小社区可能被牺牲。

所以要把谱布局当作放大镜，而不是判决书。

## 9. 下一站

下一步把零特征值的个数翻译成连通分量个数，并用可改代码验证代数判据。

→ [连通分量与代数判据](./55-connected-components.md)
