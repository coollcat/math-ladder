---
title: 度矩阵与归一化 Laplacian
lesson_id: graphs-networks/degree-normalization
prereqs:
  - graphs-networks/laplacian
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
  - normalized-laplacian
applications:
  - spectral-clustering
  - graph-diffusion
exits:
  - data-ai
---

# 度矩阵与归一化 Laplacian

## 1. 开场钩子

明星账号有十万好友，普通用户只有十个。原始 Laplacian 会让高 degree 节点在能量里说话特别大声。归一化就像给每人除以自己的“嗓门”，让稀疏小社区不会被大 degree 节点淹没。

本课只讲一种最容易读的版本：随机游走归一化 $L_{\mathrm{rw}}=D^{-1}L$。

## 2. 直觉解释

链形图 $A-B-C$ 的度为 1、2、1：

$$L=\begin{pmatrix}1&-1&0\\-1&2&-1\\0&-1&1\end{pmatrix}.$$

用 $D^{-1}$ 左乘，就是把第 $i$ 行除以 $d_i$：

$L_{\mathrm{rw}}=\begin{pmatrix}1&-1&0\\-0.5&1&-0.5\\0&-1&1\end{pmatrix}.$

中间节点连接多，所以它的负邻居权重从 -1 变成 -0.5。

## 3. 正式定义

度矩阵是对角阵

$$D_{ij}=\begin{cases}d(v_i),&i=j\\0,&i\ne j\end{cases}.$$

随机游走归一化拉普拉斯为

$$L_{\mathrm{rw}}=D^{-1}L=I-D^{-1}A.$$

对称归一化版本为

$$L_{\mathrm{sym}}=D^{-1/2}LD^{-1/2}=I-D^{-1/2}AD^{-1/2}.$$

三者刻画同一张图，但特征值尺度和聚类边界可以不同。

## 4. 分步例题

继续看 $A-B-C$。

1. 第一行度是 1，保持 `[1, -1, 0]`；
2. 第二行度是 2，全部除以 2；
3. 第三行度是 1，保持 `[0, -1, 1]`；
4. 得到 $L_{\mathrm{rw}}$。

注意 $L_{\mathrm{rw}}$ 的行和仍为零，但它不再一定对称。

## 5. 动手实验

### 实验 1（lab）：三种归一化同屏对照

课程里那个链形 $A-B-C$ 直接搬上来。分段按钮在三张矩阵之间切，右边那排柱子是它们的特征值：

```lab
{
  "type": "g53-normalization-compare",
  "title": "同一条链，三种 Laplacian：矩阵不同、谱可以相同",
  "nodes": ["A", "B", "C"],
  "edges": [[0, 1], [1, 2]],
  "mode": "rw"
}
```

先在 `L_rw` 和 `L_sym` 之间来回切，盯住右边那排特征值：**两行数字一模一样**。矩阵长得完全不同，谱却完全一致——因为 $L_{\mathrm{rw}}$ 与 $L_{\mathrm{sym}}$ 是相似矩阵，只是换了基底表示同一件事。这条最容易背错，这里可以直接把两组数并排放着对。再看 $L$（组合版本）：中间那个节点的行没有被缩小，$-1$ 还那么大；切回 $L_{\mathrm{rw}}$，中间行整行除以 2，负邻居从 $-1$ 变成 $-0.5$。

然后点 `加一个枢纽（连到所有人）`：一个节点突然连上所有人。组合 $L$ 的最大特征值变化不大（$3\to3$，加根很省：它一动就稳在地上界 3，所以是**没有涨**，不是涨得多），而 $L_{\mathrm{rw}}$ 与 $L_{\mathrm{sym}}$ 那一行反而**跌**（$2\to1.5$）——因为矩阵整行被度除掉了，度变大就把每个元素压小。这就是归一化像"给每人除以自己的嗓门"的意思：$L$ 与度成正比，归一化 Laplacian 与度的**倒数**成正比，同一张图在两种尺子上朝相反方向走。

最后点右边任意一根柱子：图按对应的特征向量着色（红正、蓝负、灰近零）。点 $\lambda_2$ 那一根，两个颜色分区就是下一课要用的裂缝。

### 实验 2（python）：比较原始行和归一化行

修改下面的边表，比较原始行和归一化行。重点看高 degree 行是否被缩小。

```python title="对比原始与随机游走归一化"
nodes = ["A", "B", "C"]
edges = [("A", "B"), ("B", "C")]
n = len(nodes)

A = [[0] * n for r in range(n)]
degree = [0] * n
for u, v in edges:
    i, j = nodes.index(u), nodes.index(v)
    A[i][j] = A[j][i] = 1
    degree[i] += 1
    degree[j] += 1

L = [[0] * n for r in range(n)]
Lrw = [[0] * n for r in range(n)]
for i in range(n):
    for j in range(n):
        if i == j:
            L[i][j] = degree[i]
        else:
            L[i][j] = -A[i][j]
        Lrw[i][j] = L[i][j] / degree[i] # 每一行除以自己的度

print("L")
for row in L:
    print(row)
print("Lrw")
for row in Lrw:
    print([round(x, 3) for x in row])
```

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为归一化只是数值美化。它改变优化目标：切割大社区和小社区时惩罚方式不同。

**误区二**：你以为 $L_{\mathrm{rw}}$ 一定对称。只有 $L_{\mathrm{sym}}$ 保证对称。

**误区三**：你以为不同归一化的结论必然一致。孤立点、加权方式和度悬殊都可能翻转排序。

:::

## 7. 练习

```exercise
# @title: 练习：计算随机游走归一化
# @check: [1.0, -1.0, 0.0]
# @check: [-0.5, 1.0, -0.5]
# @check: [0.0, -1.0, 1.0]
# @hint: 第 i 行的每个元素都要除以 d_i。
L = [
    [1, -1, 0],
    [-1, 2, -1],
    [0, -1, 1],
]
degree = [1, 1, 1]

Lrw = [[value for value in row] for row in L]
for i in range(3):
    for j in range(3):
        Lrw[i][j] = L[i][j]

for row in Lrw:
    print([round(value, 3) for value in row])
```

<details>
<summary>点开查看逐步解答</summary>

真实度是 `[1, 2, 1]`。把第二行除以 2，第一、第三行不变：

$L_{\mathrm{rw}}=\begin{pmatrix}1&-1&0\\-0.5&1&-0.5\\0&-1&1\end{pmatrix}.$

</details>

```quiz
关于 L_rw = D^-1 L，下列说法最准确的是哪一项？
- 行和仍为零，但矩阵不一定对称 [*]
- 行和变为 1，而且一定对称
- 所有元素都会变成非负数
? 左乘 D^-1 是按行缩放；常数信号仍被零化，但入度和出度不再保证左右对称。
```

## 8. 解释边界

归一化不是唯一真相。社交网常用对称归一化稳定谱；扩散问题常选 $L_{\mathrm{rw}}$；带权图还要先回答权重语义。换归一化后，特征值排序和小社区稳定性都可能改变。

## 9. 选读：除以度数到底改了什么

<details>
<summary>选读 · 归一化改的是尺子，不是结构</summary>

正文说两种归一化"刻画同一张图，但特征值尺度不同"。这里给出精确版本。

**第一种近似**：$L_{\mathrm{rw}}=D^{-1}L$ 与 $L_{\mathrm{sym}}=D^{-1/2}LD^{-1/2}$ **相似**。验证只用一个恒等式：

$$L_{\mathrm{rw}}=D^{-1/2}\big(D^{-1/2}LD^{-1/2}\big)D^{1/2}=D^{-1/2}L_{\mathrm{sym}}D^{1/2}.$$

相似矩阵特征值完全相同。所以行归一化与对称归一化**不是两个谱**，是同一个谱的两种排版。链 $A-B-C$ 上实跑：两者都是 $0,1,2$。

**第二种近似**：它们与组合版 $L$ 的谱**不同**。同一条链，$L$ 的特征值是 $0,1,3$——把 $3$ 换成了 $2$。差别在于尺度：组合版的每个特征值带着"度"的量纲，归一化版把它压成无量纲数。这一点从迹上看最清楚——$\mathrm{tr}(L)=\sum_i d_i=2m$（这条链是 $4$），而两个归一化版的迹都恒等于 $n$（这条链是 $3$，因为 $\mathrm{tr}(I-D^{-1}A)=n$）。于是"$\lambda_2$ 多大算连通得紧"这件事，只有在归一化版上才有跨图可比性。

**反例：换尺子会换结论。** 取六节点图：$0$ 连 $1,2,3$；$1$ 连 $2$；$3$ 连 $4$；$4$ 连 $5$（度序列 $3,2,2,2,2,1$）。组合版算得 $\lambda_2=0.3249$，对称归一化版算得 $\lambda_2=0.196$——同一张图、同一个「第二小特征值」，数值差了近四成。更明显的是 Fiedler 向量把重音放在谁身上：组合版最大分量落在度最小的端点 $5$（$0.621$，见向量 $(0.283,\ 0.419,\ 0.419,\ -0.081,\ -0.419,\ -0.621)$）；对称归一化版的最大分量移到节点 $4$（$0.569$），端点 $5$ 退到第二（$0.500$），向量是 $(0.289,\ 0.388,\ 0.388,\ -0.207,\ -0.569,\ -0.500)$。两者符号划分一致（切法相同），但**权重分配变了**，于是「按分量大小排序取前 k 个」这类后处理会给出不同结果。所以谱聚类必须先声明用的是哪把尺子——两个数不能混用阈值。

**边界**：归一化要求所有度为正。孤立点的度为 0，$D^{-1}$ 直接除零，代码必须先处理。

</details>

## 10. 下一站

现在可以把 Laplacian 的特征向量变成坐标：第二小特征值会指出最自然的切开方向。

→ [特征值与谱布局](./50-spectral-layout.md)
