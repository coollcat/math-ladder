---
title: 谱聚类直觉
lesson_id: graphs-networks/spectral-clustering
prereqs:
  - graphs-networks/connected-components
volume: 5
layer: L11
track:
  - information-learning
  - discrete-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - spectral-clustering
applications:
  - customer-segmentation
  - protein-community-detection
exits:
  - data-ai
  - research
---

# 谱聚类直觉

## 1. 开场钩子

知识图谱里，“Transformer”“注意力”“嵌入”彼此靠近；“卷积”“池化”“图像分类”形成另一团。没有人工标签时，谱聚类可以用连接结构给出第一版分组。

它不是魔法分类器，而是把“难切开的点放在一起”翻译成坐标和阈值。

## 2. 直觉解释

最简单的一维流程：

1. 构造相似度或邻接矩阵；
2. 求 Laplacian 的 Fiedler 向量；
3. 向量每一项是一个节点的一维坐标；
4. 正负号或中间阈值把节点分组。

相连且同团的节点坐标接近；横跨弱桥的两侧会分别聚在低值和高值。

## 3. 正式定义

设 $\vec q_2$ 是归一化或组合 Laplacian 的第二小特征向量。一维符号聚类定义为

$$\hat y_i=\operatorname{sign}(q_{2,i}).$$

更一般的谱嵌入取前 $k$ 个最小非零特征向量，把节点 $i$ 映成

$$\vec z_i=(q_{2,i},q_{3,i},\ldots,q_{k+1,i}),$$

再对 $\vec z_i$ 做 K-means 等普通聚类。

## 4. 分步例题

双三角图的 Fiedler 向量约为

$$(-0.465,-0.465,-0.261,+0.261,+0.465,+0.465).$$

1. 前三项都是负数；
2. 后三项都是正数；
3. 按符号分为 `{0,1,2}` 和 `{3,4,5}`；
4. 唯一的桥正好被切一次。

## 5. 动手实验

下面的代码允许你改变阈值。阈值取 0 时按符号分；移到中间会强迫某一点换组，切割质量立刻变差。

```python title="用 Fiedler 符号做一维谱聚类"
fiedler = [-0.465, -0.465, -0.261, 0.261, 0.465, 0.465]
threshold = 0.0 # 可改实验变量：大于阈值进 B 组，否则进 A 组

labels = []
for value in fiedler:
    if value > threshold:
        labels.append("B")
    else:
        labels.append("A")

group_a = [index for index, label in enumerate(labels) if label == "A"] # enumerate 给出下标和值
group_b = [index for index, label in enumerate(labels) if label == "B"]
cut_edges = [(0, 3)] # 双三角图中唯一跨组桥

print(labels)
print(group_a, group_b)
print(len(cut_edges))
```

真实系统还会检查组大小是否过不平衡，以及切掉的边是否真的少。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为谱聚类自动选最佳组数。固定取前几个向量本身就是建模决定。

**误区二**：你以为正负号稳定。整体乘 -1 后标签名互换，分组不变。

**误区三**：你以为小簇一定该保留。归一化方式不同，极小簇可能被视为噪声。

:::

## 7. 练习

```exercise
# @title: 练习：按 Fiedler 符号分配社区
# @check: ['A', 'A', 'A', 'B', 'B', 'B']
# @hint: 小于 0 记 A，否则记 B。
fiedler = [-0.465, -0.465, -0.261, 0.261, 0.465, 0.465]
labels = ["B"] * len(fiedler)

for i, value in enumerate(fiedler):
    labels[i] = "B"

print(labels)
```

<details>
<summary>点开查看逐步解答</summary>

前三项小于 0，赋给 A；后三项不小于 0，赋给 B。

因此输出 `['A', 'A', 'A', 'B', 'B', 'B']`。

</details>

```quiz
Fiedler 向量整体乘以 -1 后，一维符号聚类会怎样？
- 分组不变，只是标签名可能互换 [*]
- 所有节点都会换到另一组之外的新组
- Laplacian 特征值排序也会反转
? 特征向量允许整体正负倍数；把 A、B 标签互换不改变集合划分。
```

## 8. 解释边界

谱聚类输出依赖四个选择：邻接矩阵、权重语义、Laplacian 归一化和最终聚类器。同一份数据换掉其中一项，可能得到不同边界。应把结果当结构假设，再用领域知识检验。

## 9. 下一站

接下来不再静态切图，而是让粒子按转移矩阵移动，看看全局流形如何暴露社区和平稳分布。

→ [随机游走](./65-random-walks.md)
