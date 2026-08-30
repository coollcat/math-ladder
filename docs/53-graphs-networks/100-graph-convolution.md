---
title: 图卷积一层聚合
lesson_id: graphs-networks/graph-convolution
prereqs:
  - graphs-networks/message-passing
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - graph-convolution
applications:
  - node-classification
  - molecule-embedding
exits:
  - data-ai
---

# 图卷积一层聚合

## 1. 开场钩子

普通神经网络假设输入顺序固定；图的邻居却有多有少。GCN 用归一化邻接矩阵做一次加权平均，再乘可学习权重：既尊重连接，又防止明星节点主导一切。

本课拆开一层 Graph Convolution Network。

## 2. 直觉解释

GCN 层做三步：

1. 给每个节点加自环；
2. 用两端度数的平方根给每条边除权；
3. 聚合邻居和自身的归一化特征。

于是高度节点的每条边被稀释，低度节点也不会被忽略。

## 3. 正式定义

令 $\tilde A=A+I$，$\tilde D_{ii}=\sum_j \tilde A_{ij}$。单层 GCN 为

$$H^{(l+1)}=\phi\left(\tilde D^{-1/2}\tilde A\tilde D^{-1/2}H^{(l)}W^{(l)}\right).$$

其中 $W$ 是可学习参数，$\phi$ 是非线性函数。若暂不看训练，核心就是对称归一化聚合。

## 4. 分步例题

取链形图 $A-B-C$，所有特征都是 1，不加权重矩阵。

1. 加自环后度依次是 2、3、2；
2. A 的新值来自自身和 B：

$$\frac{1}{\sqrt2\sqrt2}\cdot1+\frac{1}{\sqrt2\sqrt3}\cdot1\approx0.908.$$

3. B 与两个邻居相连，且自环系数是 $1/3$，合计约 1.150；
4. C 与 A 对称，也是约 0.908；
5. 四舍五入三位得 `[0.908, 1.15, 0.908]`。

## 5. 动手实验

下面代码显式写出 $\tilde D^{-1/2}$ 的因子。你可以删除自环项或改用普通平均，看高度效应如何出现。

```python title="手算一层对称归一化聚合"
H = [1.0, 1.0, 1.0]       # 每个节点一维特征
A_tilde = [
    [1, 1, 0],
    [1, 1, 1],
    [0, 1, 1],
]
degrees = [sum(row) for row in A_tilde]

output = []
for i in range(3):
    total = 0.0
    for j in range(3):
        if A_tilde[i][j]:
            factor = 1 / ((degrees[i] * degrees[j]) ** 0.5) # **0.5 表示开平方
            total += factor * H[j]
    output.append(round(total, 3))

print(degrees)   # 加自环后的度
print(output)    # 归一化聚合结果
```

这只是一层。多层堆叠时感受野扩大，但也带来过平滑风险。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你忘记自环。没有它，节点下一层会完全丢失自己的旧特征。

**误区二**：你混淆行归一化和对称归一化。两者对应不同的传播矩阵和理论性质。

**误区三**：你以为卷积就是图像卷积核。图卷积是在不规则邻居集合上定义的聚合。

:::

## 7. 练习

```exercise
# @title: 练习：对称归一化链形聚合
# @check: [0.908, 1.15, 0.908]
# @hint: 度是 [2,3,2]，每条边因子为 1/sqrt(d_i*d_j)，自环也要参与；最后每项保留三位小数。
H = [1.0, 1.0, 1.0]
degrees = [2, 3, 2]
adjacency = [
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0],
]

output = []
for i in range(3):
    total = 0.0
    for j in range(3):
        if adjacency[i][j]:
            total += H[j]
    output.append(total)

print(output)
```

<details>
<summary>点开查看逐步解答</summary>

加自环后应使用：

$$\tilde A=I+A.$$

A 的两项因子分别是 $1/2$ 和 $1/\sqrt6$，所以约为 $0.5+0.408=0.908$。B 约为 $2/\sqrt6+1/3\approx1.150$，C 与 A 相同。

</details>

## 8. 快问快答

```quiz
GCN 对称归一化最主要防止什么？
- 邻居数量多的节点在求和中天然占优 [*]
- 特征永远不能更新
- 图中出现任何环
? 两端度平方根共同缩放边权，使不同 degree 的聚合更可比。
```

## 9. 下一站

度数定死的配比只是聚合的一种。下一课让每个节点学着决定「该多听谁」。

→ [图注意力：邻居的权重也学出来](./102-graph-attention.md)
