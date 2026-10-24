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

:::note[与别章的分工]
谱聚类和 [PCA](../21-linear-algebra-advanced/60-pca-compression.md) 是同一套谱工具的两次使用：PCA 分解协方差矩阵，谱聚类分解图 Laplacian。本课假定你已经认识特征值与谱分解。
:::


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

### 实验 1（lab）：刀放在哪儿，Ncut 说了算

双三角图配一把可以拖的刀。上半是原图，下半把六个节点按 Fiedler 值从小到大排成一行——结构上最该切的地方，就是这一行上最大的那道缝：

```lab
{
  "type": "g53-spectral-cut",
  "title": "谱分割：切点挪一格，Ncut 差多少",
  "nodes": ["0", "1", "2", "3", "4", "5"],
  "edges": [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [2, 3]],
  "cut": 3
}
```

初始刀在 $k=3$，正好把 `{0,1,2}` 和 `{3,4,5}` 分开：切掉 1 条边，两组度数各是 7，$\mathrm{Ncut}=1/7+1/7\approx 0.286$。把刀往左拖到 $k=1$：切边变成 2 条，一组只剩一个节点、$\mathrm{vol}=2$，$\mathrm{Ncut}$ 飙到 1.167——**分母太小，割的代价被放大**。这就是「极小簇不划算」的算术版本，和正文误区三对上。

再点 `换成按键号切`：还是同样六个节点，但排序换成编号顺序，最优位置就不再是结构上的缝了，读数明显变差。点 `回到按 Fiedler 切` 复原，然后点 `打乱节点标号`——图的连接一条没变，只是重新起了名字，最优 $\mathrm{Ncut}$ 依然是 0.286。**谱方法看结构不看标签**，这两颗按钮就是把这句话做成实验。

### 实验 2（python）：改阈值

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

## 9. 选读：切一刀，怎么算"切得好"

<details>
<summary>选读 · RatioCut、Ncut，与为什么只取符号</summary>

正文把 Fiedler 向量的符号当分界线用。这条分界线在优化什么？答案是切图的代价函数。

**两种代价。** 设把节点分成 $S$ 与 $\bar S$，$\text{cut}(S)$ 是跨越两边的边数。

$$\text{RatioCut}(S)=\text{cut}(S)\Big(\frac{1}{|S|}+\frac{1}{|\bar S|}\Big),\qquad \text{Ncut}(S)=\text{cut}(S)\Big(\frac{1}{\text{vol}(S)}+\frac{1}{\text{vol}(\bar S)}\Big).$$

差别只在分母：RatioCut 数**人头**，Ncut 数**度数和**。所以 Ncut 不会因为把几个孤立点单独切出去而"占便宜"，RatioCut 会。

**实跑对账**（六节点：两个三角形 + 一座桥 $2{-}3$，$m=7$）：

| 切法 | cut | vol | RatioCut | Ncut |
| --- | --- | --- | --- | --- |
| $\lbrace0,1,2\rbrace$ vs 其余 | 1 | 7 | $0.667$ | $0.286$ |
| $\lbrace0,1\rbrace$ vs 其余 | 2 | 4 | $1.500$ | $0.700$ |
| $\lbrace0\rbrace$ vs 其余 | 2 | 2 | $2.400$ | $1.167$ |

三种切法的大小次序两种度量一致，但**相对差距完全不同**：Ncut 认为正确切法比"切掉一个点"好四倍，RatioCut 只认为好三倍半。选哪个，会改变算法在边界情形下的偏好。

**为什么只取符号就够。** 松弛后的最小化问题是 $\min_{\vec x\perp\vec 1}\vec x^{\top}L\vec x/\vec x^{\top}\vec x$，瑞利商的最小值正是 $\lambda_2$，取到它的就是 Fiedler 向量。而"分成两块"这件事只关心 $x_i$ 的正负——值的大小是松弛的副产品，不是结论。

**边界**：符号切法要求图近似两块。三块以上要取前 $k$ 个特征向量再 K-means，且此时"符号"不再是判据。

</details>

## 10. 下一站

接下来不再静态切图，而是让粒子按转移矩阵移动，看看全局流形如何暴露社区和平稳分布。

→ [随机游走](./65-random-walks.md)
