---
title: 图注意力：邻居的权重也学出来
lesson_id: graphs-networks/graph-attention
prereqs:
  - graphs-networks/graph-convolution
  - transformer/attention-qkv
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
  - graph-attention
applications:
  - node-classification
  - molecule-embedding
exits:
  - data-ai
---

# 图注意力：邻居的权重也学出来

## 1. 开场钩子

小组讨论时，每个人说话的分量不该一样：有的邻居句句切题，有的只会灌水。上一课的 GCN 却一视同仁——聚合配比 $1/\sqrt{\tilde d_i\tilde d_j}$ 由度数出生就定死，跟内容无关。图注意力网络（GAT）把配比也交给模型：每个节点自己学着决定「该多听谁」。

## 2. 直觉解释

第 47 章的图书馆里，查询问「我要什么」，键答「我是什么」，相关度决定借几成。把这套搬上图的每个节点：

- 节点 $i$ 对每个邻居 $j$ 配对打分：把两人的特征变换后拼在一起，过一个打分函数得 $e_{ij}$；
- 分数过 softmax 变成非负、总和为一的配比 $\alpha_{ij}$；
- 新特征就是按配比混合的邻居消息。

与 GCN 的差别一句话说清：**GCN 的权重是连接结构的函数（只看度数），GAT 的权重是特征内容的函数（由可学习参数算出）**。同一个邻居，在训练前后、在不同节点眼里，配比都可以不同——「该听谁」本身成了被学出来的对象。

## 3. 正式定义

对每个节点 $i$ 与它的邻居 $j$（含自环），GAT 的一层聚合为：

$$e_{ij}=\operatorname{LeakyReLU}\left(a^{\top}\left[Wh_i\,\Vert\,Wh_j\right]\right),\qquad \alpha_{ij}=\frac{\exp e_{ij}}{\sum_{k\in\mathcal N(i)}\exp e_{ik}},\qquad h_i'=\phi\left(\sum_{j\in\mathcal N(i)}\alpha_{ij}\,Wh_j\right).$$

| 符号 | 含义 |
| --- | --- |
| $W$ | 共享变换矩阵：先把所有节点的特征升维重组（GCN 也有它） |
| $a$ | 打分向量：决定「怎样的拼接对才算相关」，是本课新生的可学习参数 |
| $\Vert$ | 拼接：把 $Wh_i$ 和 $Wh_j$ 首尾相接成一个长向量 |
| $e_{ij}$ | 配对打分：LeakyReLU 对负分保留一小部分响应，梯度不熄火 |
| $\alpha_{ij}$ | 注意力系数：softmax 保证非负且每行总和为 1（第 47 章的老朋友） |
| $\mathcal N(i)$ | 节点 $i$ 的邻居集合，含自环——自己也可以给自己投票 |

对比上一课的对称归一化 $1/\sqrt{\tilde d_i\tilde d_j}$：那是一个只依赖度数的**固定**函数；这里的 $\alpha_{ij}$ 依赖 $h_i$、$h_j$ 与可学习的 $W,a$，是**学出来**的。两者都可写作「加权平均邻居」，差别只在权重从哪来。

## 4. 分步例题

链形图 $A-B-C$，一维特征 $h_A=1,\ h_B=2,\ h_C=3$；取 $W=1$、打分向量 $a=(1,1)$、LeakyReLU 负斜率 $0.2$：

1. 配对打分：$e_{AB}=\operatorname{LeakyReLU}(1+2)=3$，$e_{AA}=\operatorname{LeakyReLU}(1+1)=2$；正数原样放行——若某对打分是 $-1$，则得 $-0.2$，负分也留两成响应；
2. A 行 softmax：$e=(2,3)$ 配比 $(0.269,\ 0.731)$——B 的特征值更大更「有料」，权重倒向 B；
3. B 行三个邻居 $e=(3,4,5)$，配比 $\approx(0.090,\ 0.245,\ 0.665)$：打分随特征值单调走高；
4. 加权聚合：$h_A'=0.269\times 1+0.731\times 2=1.731$，$h_B'=0.090+0.490+1.996=2.575$，C 与 A 对称得 $2.731$；
5. 同一张图上 GCN 给 A 的固定配比是 $(0.500,\ 0.408)$——自身权重比 B 还大；GAT 按内容重排成 $(0.269,\ 0.731)$。结构相同，配比随内容变了。

## 5. 动手实验

下面代码显式算出三行注意力系数，并排打印成权重矩阵——三行排在一起就是一张热力图：B 行的亮点在 C，A、C 行的亮点各偏一侧，哪些邻居被高亮一眼可见。末尾附同图同特征的 GCN 对照。

```python title="打印一张注意力权重矩阵（热力图直觉）"
import math  # math.exp：softmax 配比要用

h = {"A": 1.0, "B": 2.0, "C": 3.0}   # 每个节点一维特征
neighbors = {
    "A": ["A", "B"],                  # 含自己的自环
    "B": ["A", "B", "C"],
    "C": ["B", "C"],
}
a1 = 1.0                              # 打分向量两个分量（本例 a = (1, 1)）
a2 = 1.0
leak = 0.2                            # LeakyReLU 的负半轴斜率

def leaky(x):                         # LeakyReLU：正数原样，负数只留两成
    if x > 0:
        return x
    return leak * x

for i in ["A", "B", "C"]:
    scores = {}
    for j in neighbors[i]:
        pair = a1 * h[i] + a2 * h[j]  # a 上标 T 乘 [h_i 拼接 h_j] 的一维简化
        scores[j] = leaky(pair)
    total = 0.0
    for j in neighbors[i]:
        total = total + math.exp(scores[j])   # softmax 分母：全行指数之和
    row = []
    for j in neighbors[i]:
        row.append(round(math.exp(scores[j]) / total, 3))
    print(i, "attention:", row)

# GCN 对照：同图同特征，固定对称归一化
h_list = [1.0, 2.0, 3.0]
adj = [
    [1, 1, 0],
    [1, 1, 1],
    [0, 1, 1],
]
degrees = []
for row_adj in adj:
    degrees.append(sum(row_adj))      # 加自环后的度
gcn = []
for i in range(3):
    total2 = 0.0
    for j in range(3):
        if adj[i][j]:
            factor = 1 / ((degrees[i] * degrees[j]) ** 0.5)   # ** 0.5 表示开平方
            total2 = total2 + factor * h_list[j]
    gcn.append(round(total2, 3))
print("GCN 对照:", gcn)
```

A 行配比 `[0.269, 0.731]` 与 B 行 `[0.09, 0.245, 0.665]` 复现了例题；GCN 对照 `[1.316, 2.3, 2.316]` 则是固定配比的世界。把 `h` 里任何一个数字改大，再看权重矩阵怎么重排——GCN 的聚合配比纹丝不动，GAT 的热力图当场换亮区。

## 6. 常见误区

::::warning[常见误区]

**误区一**：你以为注意力权重是邻居的「重要度」。权重是当前查询视角下的瞬时配比：特征一变、训练一动就重排；离开打分函数谈「谁更重要」没有意义。

**误区二**：你以为 softmax 之前的分数可以直接当权重。$e_{ij}$ 有正有负、总和乱七八糟，不归一就不是配比——必须先过 softmax。

**误区三**：你以为 GAT 全面碾压 GCN。表达力是双刃剑：数据同质时固定归一化更稳、参数更省；图太小或特征太弱，学出来的注意力未必比度数靠谱。

::::

## 7. 练习

```exercise
# @title: 练习：算出 A 行的注意力配比
# @check: 0.269
# @check: 0.731
# @hint: 自环对的打分是 LeakyReLU(1 加 1) = 2.0，A-B 对是 LeakyReLU(1 加 2) = 3.0；配比按 exp(e) 的占比分。
import math  # math.exp：softmax 配比要用

e_AA = 0.0           # ← 问题在这：自环对的打分
e_AB = 0.0           # ← 问题在这：A-B 对的打分
total = math.exp(e_AA) + math.exp(e_AB)
alpha_AA = round(math.exp(e_AA) / total, 3)
alpha_AB = round(math.exp(e_AB) / total, 3)
print(alpha_AA)
print(alpha_AB)
```

<details>
<summary>点开查看逐步解答</summary>

一维拼接的打分就是分量和：$e_{AA}=\operatorname{LeakyReLU}(1+1)=2$，$e_{AB}=\operatorname{LeakyReLU}(1+2)=3$。配比 $\alpha_{AA}=e^2/(e^2+e^3)\approx 0.269$，$\alpha_{AB}\approx 0.731$。两个打分都是正数，LeakyReLU 没有截断它们；若把 $e_{AA}$ 换成 $-1$，它将变成 $-0.2$ 再进 softmax。

</details>

## 8. 快问快答

```quiz
GAT 与 GCN 的本质区别是什么？
- GAT 的图一定比 GCN 的图大
- GCN 的聚合权重由度数固定，GAT 的由特征内容经可学习参数算出 [*]
- GAT 不能加自环
? 归一化系数出生就定死；GAT 让每个节点学着决定该多听谁——权重本身成了被训练的对象。
```

## 9. 下一站

注意力解决了「该听谁」，但层数一多还有新麻烦：反复加权平均会让节点越长相像。下一课量化这种过平滑。

→ [多层 GNN 与过平滑](./105-over-smoothing.md)
