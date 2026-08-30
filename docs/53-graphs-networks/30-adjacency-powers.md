---
title: 邻接矩阵幂与路径计数
lesson_id: graphs-networks/adjacency-powers
prereqs:
  - graphs-networks/adjacency-matrix
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
  - walk-counting
applications:
  - route-analysis
  - information-diffusion
exits:
  - data-ai
  - engineering
---

# 邻接矩阵幂与路径计数

## 1. 开场钩子

消息从 A 出发，两跳后可能到达谁？有几条不同走法？逐条画路径很快会乱。邻接矩阵的幂把“先走一步，再走一步”变成一次乘法：$A^2$ 的第 $i$ 行第 $j$ 列直接给出长度为 2 的游走数。

注意这里数的是**游走**，允许回头；不是必须不重复经过节点的简单路径。

## 2. 直觉解释

取链形图 $1-2-3-4$：

- 从 1 走两步到 3，只有 $1\to2\to3$ 一条；
- 从 2 走两步回到 2，有 $2\to1\to2$ 和 $2\to3\to2$ 两条；
- 从 2 走两步到 4，只有 $2\to3\to4$ 一条。

所以

$$A^2=\begin{pmatrix}1&0&1&0\\0&2&0&1\\1&0&2&0\\0&1&0&1\end{pmatrix}.$$

## 3. 正式定义

若 $A$ 是无向图邻接矩阵，则对正整数 $k$，

$$\left(A^k\right)_{ij}=\text{从 }v_i\text{ 到 }v_j\text{ 的长度为 }k\text{ 的游走数}.$$

矩阵乘法中的每一项

$$\left(A^2\right)_{ij}=\sum_r A_{ir}A_{rj}$$

正好枚举中间点 $r$。

## 4. 分步例题

仍用链形图。

1. 从 1 到 3：中间只能选 2，计数为 1；
2. 从 2 回到 2：中间可先去 1 或 3，再返回，计数为 2；
3. 从 2 到 4：中间只能选 3，计数为 1；
4. 这些数字正是第二行 `[0, 2, 0, 1]`。

## 5. 动手实验

```viz
{
  "type": "matrix-power",
  "title": "重复传播：两状态的概率演化",
  "pAA": 0.8,
  "pBB": 0.7,
  "power": 1
}
```

上面的已有组件用概率矩阵演示同一件事：矩阵自乘会把一步转移组合成多步转移。下面的 Python 则精确数无向图的游走。

```python title="手算 A² 并检查链形图"
A = [
    [0, 1, 0, 0],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [0, 0, 1, 0],
]
n = len(A)

# 建一个全零结果矩阵；外层循环行，中层循环列
A2 = [[0 for column in range(n)] for row in range(n)]
for i in range(n):
    for j in range(n):
        total = 0
        for r in range(n):                 # r 是长度为 2 游走的中间点
            total += A[i][r] * A[r][j]     # 两段都存在时贡献 1
        A2[i][j] = total

print(A2[0])
print(A2[1])
```

试着加一条边 `1-3`，再看哪些格子变化最快。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 $A^k$ 数的是最短路径。它数所有固定长度的游走，包含回头路。

**误区二**：你以为矩阵平方就是每个元素平方。必须按矩阵乘法汇总所有中间点。

**误区三**：你以为大数一定是直达影响力。高次幂会混合回退、绕路和重复访问。

:::

## 7. 练习

```exercise
# @title: 练习：计算链形图的两步游走
# @check: [1, 0, 1, 0]
# @check: [0, 2, 0, 1]
# @hint: 对每个格子累加 A[i][r] * A[r][j]。
A = [
    [0, 1, 0, 0],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [0, 0, 1, 0],
]

A2 = [[0] * 4 for row in range(4)]
for i in range(4):
    for j in range(4):
        A2[i][j] = A[i][j] * A[j][i]

print(A2[0])
print(A2[1])
```

<details>
<summary>点开查看逐步解答</summary>

以 `(2,2)` 为例：

$$\left(A^2\right)_{22}=A_{21}A_{12}+A_{23}A_{32}=1+1=2.$$

其余格子同理，得到第一行 `[1, 0, 1, 0]`、第二行 `[0, 2, 0, 1]`。

</details>

## 8. 解释边界

$A^k$ 很适合解释“局部信息扩散几步后在哪里”。但它对边的方向、权重和归一化极其敏感：把计数换成概率，就要改成列随机或行随机矩阵。

## 9. 下一站

下一步给边加上权重，并把每列归一化成概率。这样矩阵幂就从“数路径”变成“预测流向”。

→ [加权图与转移矩阵](./35-weighted-transition.md)
