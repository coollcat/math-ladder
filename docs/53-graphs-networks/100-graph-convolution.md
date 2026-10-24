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

### 实验 1（lab）：三种归一化，谁压得住枢纽

课程例题用了最朴素的链形图。下面这张卡把场景换成「一个枢纽 + 四个叶子」——枢纽的度是 4，叶子们只有 2～3。这是度归一化真正被拉开的地方：

```lab
{
  "type": "g53-gcn-aggregate",
  "title": "一层聚合：普通求和 / 行归一化 / 对称归一化",
  "nodes": ["枢纽", "甲", "乙", "丙", "丁"],
  "edges": [[0, 1], [0, 2], [0, 3], [1, 2], [3, 4]],
  "x": [1, 0, 0, 0, 1]
}
```

三种模式轮流点一遍，盯住两个数：

- `普通求和`（含自环）：结果 `[1, 1, 1, 2, 1]`。丁只收自己 1 票、丙收四票，**度数直接变成了特征**。
- `行归一化`：结果 `[0.25, 0.333, 0.333, 0.667, 0.5]`。每行都除掉了自己的度，数值被压到 1 以下，但枢纽依旧最小——它把一份票分给了四个邻居，每个邻居只分到一点点。
- `对称归一化`：结果 `[0.25, 0.289, 0.289, 0.697, 0.5]`。这一次枢纽和邻居的度都被开根号除了进去，两端的「谁更吃亏」被对称地摊平。

再点 `自环：关`：枢纽第 0 位立刻变成 `0`——**它把自己忘了**。这就是课程「误区一」：没有自环，节点下一层会完全丢失自己的旧特征。把它重新打开，数值才恢复。

最后连点两次 `再来一层`。三次之后各位从 `[0.25, 0.289, 0.289, 0.697, 0.5]` 走到 `[0.407, 0.301, 0.301, 0.512, 0.475]`，再往下差距会继续缩小——同一张传播矩阵反复左乘，特征会被磨平。这件事的后果在下一门课专门讲。

### 实验 2（python）：手算链形图

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

## 9. 选读：归一化后的谱为什么被关在 [-1, 1] 里

<details>
<summary>选读 · 对称归一化传播矩阵的谱半径不超过 1</summary>

GCN 反复乘 $\tilde D^{-1/2}\tilde A\tilde D^{-1/2}$ 却不会把特征放大到爆炸，靠的是一条谱上界。

记 $S=\tilde D^{-1/2}\tilde A\tilde D^{-1/2}$。它是**对称**的，所以特征值全为实数，而且用二次型就能把它夹住。对任意非零 $\vec x$：

$$\big\lvert \vec x^{\top}S\vec x\big\rvert=\Big\lvert\sum_{i,j}\tilde A_{ij}\frac{x_ix_j}{\sqrt{\tilde d_i\tilde d_j}}\Big\rvert\ \le\ \frac12\sum_{i,j}\tilde A_{ij}\Big(\frac{x_i^2}{\tilde d_i}+\frac{x_j^2}{\tilde d_j}\Big)=\sum_i x_i^2=\lVert\vec x\rVert^2.$$

第一步是代入定义，第二步用 $2\lvert a\rvert\lvert b\rvert\le a^2+b^2$ 逐边配平，第三步把每个 $x_i^2/\tilde d_i$ 乘回它那一行的度和 $\tilde d_i$，正好合成 $x_i^2$（两项各贡献一半）。于是 $S$ 的瑞利商被关在 $[-1,1]$ 里，特征值也只能落在这里：

$$\lvert\lambda\rvert\le 1.$$

等号只在 $\vec x$ 为常数向量时取到（此时 $\lambda=1$）。

**实跑对账**：链 $A-B-C$ 加自环后，$S$ 的三个特征值是 $-0.1667,\ 0.5,\ 1$；五节点星形加自环后是 $-0.3,\ 0.5,\ 0.5,\ 0.5,\ 1$。两组都在 $[-1,1]$ 内，最大值恰好等于 $1$，最小值为负——负特征值意味着聚合会**反号**，这正是 105 号课"多层之后振荡"的伏笔。

**边界**：上界靠"对称归一化"这一条。换成行归一化的 $\tilde D^{-1}\tilde A$，矩阵不再对称，特征值可以跑进复平面，谱半径的上界要改由 Perron–Frobenius 给出。

</details>

## 10. 下一站

度数定死的配比只是聚合的一种。下一课让每个节点学着决定「该多听谁」。

→ [图注意力：邻居的权重也学出来](./102-graph-attention.md)
