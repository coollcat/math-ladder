---
title: 多层 GNN 与过平滑
lesson_id: graphs-networks/over-smoothing
prereqs:
  - graphs-networks/graph-convolution
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
  - over-smoothing
applications:
  - deep-graph-models
  - molecular-representation
exits:
  - data-ai
  - research
---

# 多层 GNN 与过平滑

## 1. 开场钩子

直觉上，层数越多，模型越强。图网络却常常相反：堆太多层后，所有节点反复平均邻居，特征越来越像，分类边界反而糊掉。

这就是过平滑。它不是训练失败，而是重复传播的结构后果。

## 2. 直觉解释

链形三个节点的特征从 `[1, 2, 3]` 开始。做一次“自身加邻居的平均”，得到：

$$[1.5,\ 2.0,\ 2.5].$$

再做一次：

$$[1.75,\ 2.0,\ 2.25].$$

范围从 2 缩到 0.5。层数继续增加，差异会继续缩小；远处的信息确实传来了，但局部身份也被抹掉了。

## 3. 正式定义

对含自环的行归一化传播矩阵 $S$，多层无非线性模型可写成

$$H^{(k)}=S^kH^{(0)}.$$

若 $S$ 满足合适的遍历条件，则当 $k\to\infty$ 时，$S^kH^{(0)}$ 的行会趋向同一个由结构决定的向量。节点表示的方差随之下降。

常用诊断是相邻层特征变化或成对余弦相似度：

$$\text{smoothness}=\frac{1}{n}\sum_v\lVert h_v^{(k)}-h_v^{(k-1)}\rVert.$$

## 4. 分步例题

链形图 $A-B-C$ 使用含自环的平均聚合。

1. 初始：`[1, 2, 3]`；
2. 一层后 A 为 $(1+2)/2=1.5$，B 为 $(1+2+3)/3=2$，C 为 $(2+3)/2=2.5$；
3. 二层后 A 为 $(1.5+2)/2=1.75$，B 为 $(1.5+2+2.5)/3=2$，C 为 $(2+2.5)/2=2.25$；
4. 最大减最小从 2 变成 0.5。

## 5. 动手实验

下面代码最多传播 6 层并输出每层的极差。把层数调大、改图或改初始特征，观察差异收缩速度。

```python title="观察多层平均导致的过平滑"
H = [1.0, 2.0, 3.0]          # 初始节点特征
neighborhoods = [
    [0, 1],                   # A 的自环和唯一邻居 B
    [0, 1, 2],                # B 的自环和两个邻居
    [1, 2],                   # C 的邻居 B 和自环
]
max_layers = 6               # 层数上限：避免无限传播

initial_range = sorted(H)[-1] - sorted(H)[0] # 排序后取最大减最小
print(0, H, round(initial_range, 3))
for layer in range(1, max_layers + 1):
    nxt = []
    for i in range(len(neighborhoods)):
        total = 0.0
        for j in neighborhoods[i]:
            total += H[j] / len(neighborhoods[i]) # 含自身的普通平均聚合
        nxt.append(total)
    H = nxt
    current_range = sorted(H)[-1] - sorted(H)[0]
    print(layer, [round(value, 3) for value in H], round(current_range, 3))
```

工程上可用残差连接、门控自环、JK 聚合或更少层数缓解，但没有万能解。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你把过拟合和过平滑混为一谈。前者训练好测试差，后者可能连训练表示都失去区分度。

**误区二**：你以为加深一定无用。配合残差、正则和任务设计，深层图模型仍可受益。

**误区三**：只看准确率。特征方差、邻居分布和同质化速度更能定位问题。

:::

## 7. 练习

```exercise
# @title: 练习：计算两层后的过平滑
# @check: [1.75, 2.0, 2.25]
# @hint: 先算一次含自身与邻居的平均，再对结果重复一次。
H = [1.0, 2.0, 3.0]
neighbors = [
    [0, 1],
    [0, 1, 2],
    [1, 2],
]

nxt = []
for group in neighbors:
    nxt.append(sum(H[i] for i in group))
H = nxt

print([round(value, 3) for value in H])
```

<details>
<summary>点开查看逐步解答</summary>

一层后是 `[1.5, 2.0, 2.5]`。再平均一层：

$$A=(1.5+2)/2=1.75,$$

$$B=(1.5+2+2.5)/3=2.0,$$

$$C=(2+2.5)/2=2.25.$$

</details>

```quiz
为了缓解过平滑，下面哪个做法最符合本课证据？
- 减少层数或加入残差/门控等自环机制 [*]
- 无限增加层数让所有节点充分混合
- 删除图中所有环
? 过平滑来自邻居信息反复平均；可控深度和保留自身信息是常见缓解方向。
```

## 8. 设计边界

过平滑说明感受野不是免费的。选择层数要同时考虑图的直径、任务需要多远的上下文、标签数量和特征噪声。深图模型应报告层数、传播矩阵和同质化指标。

## 9. 下一站

最后把邻接矩阵、谱方法、随机游走和消息传递放进同一张方法地图，练习按问题选工具。

→ [110 · 图网络方法地图](./110-method-map.md)
