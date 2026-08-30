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

## 9. 下一站

现在可以把 Laplacian 的特征向量变成坐标：第二小特征值会指出最自然的切开方向。

→ [特征值与谱布局](./50-spectral-layout.md)
