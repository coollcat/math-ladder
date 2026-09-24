---
title: K-means 聚类
lesson_id: ml-math/kmeans
prereqs:
  - ml-math/calibration-decision-boundary
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - kmeans-clustering
  - sse-objective
  - kmeans-initialization
applications:
  - customer-segmentation
  - image-compression
  - anomaly-detection
exits:
  - gaussian-mixture-model
  - hierarchical-clustering
---

# K-means 聚类

## 1. 从一个场景开始

你是一家连锁超市的数据分析师，手上有十万名会员的年消费额和到店频次。老板问你："我们的客户能不能分成几类？"没有人给你标签——不知道谁是高价值客户、谁是价格敏感型——你只有数据本身。

K-means 聚类就是为这类"没有标准答案的分组"而设计的：你告诉算法"分成 K 组"，它自己找到最好的分法——让每组内部的成员尽量相似，不同组之间尽量不同。

## 2. 直觉解释

想象你在一个操场上撒了一百颗彩色弹珠，你想把它们分成三堆。

做法：先在操场上**随机放三个盘子**（初始聚类中心），然后：

1. **分配**：每颗弹珠走到离自己最近的盘子旁边——这一步把弹珠自然分成三组；
2. **更新**：每组弹珠算出自己的几何中心，盘子挪到中心位置——这一步让盘子"追着自己的组员跑"；
3. 重复 1-2，直到盘子不再移动。

盘子就是**聚类中心**（centroid），弹珠就是数据点，"盘子不再动"就是收敛。整个过程像是一场追逐游戏：弹珠选盘子、盘子追弹珠，反复几轮后安定下来。

关键直觉：每一轮都让"弹珠到自己盘子的距离之和"变小——目标函数单调下降，不会越跑越差。但最终停在哪里取决于盘子的初始位置——换个起点可能停在不同的分法上。

## 3. 正式定义

给定数据集 $\lbrace x_1,\ldots,x_n\rbrace\subset\mathbb{R}^d$ 和聚类数 $K$，K-means 最小化**组内平方和**（SSE, Sum of Squared Errors）：

$$J=\sum_{k=1}^{K}\sum_{x_i\in C_k}\|x_i-\mu_k\|^2$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $K$ | 聚类数 | 预设的分组个数 |
| $C_k$ | 第 $k$ 个簇 | 被分配到第 $k$ 组的数据点集合 |
| $\mu_k$ | 簇中心 | 第 $k$ 组所有点的均值 $\frac{1}{\lvert C_k\rvert}\sum_{x_i\in C_k}x_i$ |
| $J$ | SSE 目标 | 所有点到各自中心的距离平方和 |

**算法步骤**（Lloyd 算法）：

1. **初始化**：随机选 $K$ 个点作为初始中心 $\mu_1^{(0)},\ldots,\mu_K^{(0)}$；
2. **分配步**：对每个 $x_i$，计算到所有中心的距离，分配到最近的簇 $C_k^{(t)}=\lbrace x_i:\|x_i-\mu_k^{(t)}\|\le\|x_i-\mu_j^{(t)}\|,\;\forall j\rbrace$；
3. **更新步**：重新计算每个簇的中心 $\mu_k^{(t+1)}=\frac{1}{\lvert C_k^{(t)}\rvert}\sum_{x_i\in C_k^{(t)}}x_i$；
4. 重复 2-3 直到簇分配不再变化（或 $J$ 的变化小于阈值）。

**收敛性**：SSE $J$ 在每一步都单调不增（分配步和更新步各自不增加 $J$），且 $J\ge0$，所以算法一定收敛。但收敛到的是**局部最优**而非全局最优——不同的初始化可能得到不同的结果。

## 4. 分步例题

**例**：6 个点分成 2 簇。数据：$A(1,1)$、$B(1.5,1.5)$、$C(5,5)$、$D(5.5,5)$、$E(5,5.5)$、$F(9,1)$。

取 $K=2$，初始中心随机选 $\mu_1=A=(1,1)$，$\mu_2=F=(9,1)$。

**第一轮**：

1. 分配：计算各点到 $\mu_1$ 和 $\mu_2$ 的距离——
   - $A,B$ 离 $\mu_1$ 近→簇 1；$C,D,E$ 离 $\mu_2$ 近→簇 2；$F$ 就是 $\mu_2$→簇 2；
2. 更新：$\mu_1=(1.25,1.25)$，$\mu_2=(6.9,3.3)$（$C,D,E,F$ 的均值）；

**第二轮**：

1. 重新分配：$F(9,1)$ 到新 $\mu_2(6.9,3.3)$ 的距离是 $\sqrt{4.41+5.29}\approx3.11$，到 $\mu_1(1.25,1.25)$ 的距离是 $\sqrt{60.06+0.06}\approx7.76$——$F$ 仍归簇 2；其他分配不变；
2. 更新：中心不变→**收敛**。

SSE $=(0.25^2+0.25^2)+(3.25^2+3.25^2+0.25^2+0.25^2+1.75^2+2.25^2)=0.125+27.875=28.0$。分法合理：左下角一组、右上和右边一组。

## 5. 动手实验

### 实验 1（viz）：SSE 随迭代下降

```viz
{
  "type": "plot",
  "title": "SSE 随迭代轮数下降（示意）",
  "expr": "10 * exp(-0.5*x) + 1",
  "xmin": 0,
  "xmax": 15,
  "sliders": []
}
```

怎么玩：这条曲线展示了 K-means 的典型收敛行为——SSE 在前几轮快速下降，然后逐渐平缓。实际中通常 5-20 轮就收敛了。注意曲线不会反弹——每一步都是单调下降的。

### 实验 2（python）：完整的 K-means 实现

```python title="K-means 聚类：初始化→分配→更新→收敛"
import math
import random

random.seed(42)                              # 固定随机种子保证可复现

# 数据：6 个二维点
data = [(1,1), (1.5,1.5), (5,5), (5.5,5), (5,5.5), (9,1)]
K = 2                                        # 聚类数

# 随机选 K 个初始中心（从数据中抽样）
centroids = random.sample(data, K)           # sample 无放回抽样

def dist(a, b):
    """欧氏距离"""
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2)

for iteration in range(10):
    # 分配步：每个点归到最近的中心
    clusters = [[] for _ in range(K)]        # 列表推导式创建 K 个空列表
    for point in data:
        dists = [dist(point, c) for c in centroids]  # 到各中心的距离
        best = dists.index(min(dists))       # 最近中心的索引
        clusters[best].append(point)

    # 更新步：重新计算每个簇的中心
    new_centroids = []
    for k in range(K):
        if clusters[k]:                      # 防止空簇
            mx = sum(p[0] for p in clusters[k]) / len(clusters[k])
            my = sum(p[1] for p in clusters[k]) / len(clusters[k])
            new_centroids.append((mx, my))
        else:
            new_centroids.append(centroids[k])

    # 检查收敛
    if new_centroids == centroids:
        print(f"第 {iteration+1} 轮收敛")
        break
    centroids = new_centroids

# 输出结果
for k in range(K):
    print(f"簇 {k+1}: 中心=({centroids[k][0]:.2f}, {centroids[k][1]:.2f}), "
          f"成员={[str(p) for p in clusters[k]]}")

# 计算 SSE
sse = 0
for k in range(K):
    for point in clusters[k]:
        sse += dist(point, centroids[k]) ** 2
print(f"SSE = {sse:.2f}")
```

运行结果：算法通常在 3-5 轮收敛，把 $(1,1)$ 和 $(1.5,1.5)$ 分到一组，其余四个点分到另一组。SSE 约为 28。注意：换一个随机种子可能得到不同的分法——这是 K-means 对初始化敏感的直接证据。

### 快问快答

```quiz
K-means 保证找到全局最优解吗？
- 是的，因为 SSE 每步都在下降
- 不保证，它只收敛到局部最优，结果依赖初始化 [*]
- 是的，只要 K 选对了
? SSE 单调下降只能保证收敛到某个局部极小值，不能保证是全局最小。不同的初始化可能落在不同的"谷底"——实践中常用多次随机初始化取最好结果，或者用 K-means++ 做更聪明的初始化。
```

:::warning[常见误区]

**误区一**："K-means 一定能找到最好的分组。" 它找到的是某个局部最优——可能把本来是一团的群体劈成两半，或把两团合并成一团。解决办法是跑多次取 SSE 最小的结果，或者用 K-means++ 初始化。

**误区二**："K 必须凭感觉选。" 有章可循：**肘部法则**（elbow method）——画 $K$ 从 1 到 10 的 SSE 曲线，拐点处就是合适的 $K$。还有轮廓系数（silhouette score）等更精细的指标。

**误区三**："K-means 假设簇是球形的，所以很受限。" 确实如此——它用欧氏距离衡量"相似"，天然偏爱球形簇。椭圆形、环形、月牙形的数据会被错误切分。GMM（高斯混合模型）通过引入协方差矩阵放松了这个假设，是下一阶段的进阶工具。

:::

## 6. 练习

**练习 1**（概念）：K-means 的分配步和更新步，各自为什么不增加 SSE？用一句话分别解释。

<details>
<summary>点开查看逐步解答</summary>

**分配步**：每个点从旧簇换到离自己更近的新中心，距离变短，SSE 只减不增。**更新步**：簇中心被重新设为该簇所有点的均值——均值是使组内平方和最小的点（这正是最小二乘的核心结论），所以更新后的 SSE 不会比更新前更大。两步都降（或持平），SSE 单调下降。
</details>

**练习 2**（判题）：下面的 K-means 代码在更新步计算均值时忘了除以簇的大小。修好它让 SSE 小于 30。

```exercise
# @title: 练习：修好 K-means 的中心更新
# @check: True
# @hint: 簇中心应该是各维度的均值（除以 len(clusters[k])），不是求和。
import math, random
random.seed(42)

data = [(1,1), (1.5,1.5), (5,5), (5.5,5), (5,5.5), (9,1)]
K = 2
centroids = random.sample(data, K)

def dist(a, b):
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2)

for _ in range(10):
    clusters = [[] for _ in range(K)]
    for point in data:
        dists = [dist(point, c) for c in centroids]
        clusters[dists.index(min(dists))].append(point)
    new_centroids = []
    for k in range(K):
        if clusters[k]:
            mx = sum(p[0] for p in clusters[k])       # ← 错了：没除以 len
            my = sum(p[1] for p in clusters[k])       # ← 错了：没除以 len
            new_centroids.append((mx, my))
        else:
            new_centroids.append(centroids[k])
    if new_centroids == centroids:
        break
    centroids = new_centroids

sse = sum(dist(p, centroids[k])**2 for k in range(K) for p in clusters[k])
print(sse < 30)
```

把 `sum(...)` 改成 `sum(...) / len(clusters[k])` 后，输出 `True`——SSE 降到约 28。没有除以大小时，中心被拉到很远的位置，算法不会真正收敛。

**练习 3**（选做）：K-means++ 的初始化策略是：第一个中心随机选，后续中心按"与已有中心的最短距离的平方"成正比的概率选取。用一句话解释为什么这比纯随机好。

<details>
<summary>点开查看逐步解答</summary>

按距离平方的概率选意味着离已有中心越远的点越可能成为新中心——这保证了初始中心在数据空间中**尽量分散**，避免两个中心挤在同一簇里。理论上 K-means++ 的 SSE 期望值不超过最优解的 $O(\ln K)$ 倍，而纯随机初始化最坏可以差 $O(K)$ 倍。
</details>

## 7. 选读：K-means 与 EM 算法的隐秘联系

<details>
<summary>选读 · K-means 是 GMM 的硬分配特例</summary>

高斯混合模型（GMM）假设数据由 $K$ 个高斯分布混合而成，用 EM 算法估计参数。GMM 的 E 步计算每个点属于各簇的**软概率**（$\gamma_{ik}\in[0,1]$），M 步按概率加权更新中心。

K-means 是 GMM 的**硬分配**极限：假设所有高斯分量的协方差都是 $\sigma^2 I$ 且 $\sigma\to0$，则软概率退化为 0-1 指示函数——E 步变成"分配到最近的中心"，M 步变成"取均值"。这就是为什么 K-means 的两步和 EM 的两步长得一模一样：它是 EM 在极限情形下的投影。

这个联系也揭示了 K-means 的局限：它假设各簇大小相当、形状相同（球形协方差）、没有重叠。GMM 通过学习每个簇自己的协方差矩阵来放松这些假设，是 K-means 的自然升级。
</details>

## 8. 下一站

K-means 告诉你"数据长什么样"，但不告诉你"怎么预测新数据"。下一课回到有监督学习的世界：决策树用一系列"如果-那么"的规则把数据一刀刀切开——它的分裂准则与聚类的 SSE 有着奇妙的呼应。

→ [决策树与集成方法](./70-decision-trees-ensembles.md)
