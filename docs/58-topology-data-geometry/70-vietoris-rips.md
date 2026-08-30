---
title: Vietoris-Rips 复形
lesson_id: tdg/vietoris-rips
prereqs:
  - tdg/cech-complexes
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - vietoris-rips-complex
applications:
  - topological-feature-extraction
exits:
  - data-ai
---

# Vietoris-Rips 复形

## 1. 开场钩子

社交网络的“朋友的朋友”常被自动拉进同一个群。Vietoris-Rips 复形也做类似事：只要两点足够近就连边，然后任何互相连接的团都填成高维单纯形。它牺牲一点几何严格性，换来可计算性。

## 2. 直觉解释

给定距离上限 $\varepsilon$：

1. 每个点是顶点；
2. 距离不超过 $\varepsilon$ 的两点连边；
3. 任意两两连边的 $k+1$ 个点构成 $k$ 维单纯形；
4. 随着上限增大，边和高维团只会增加，形成过滤复形。

与 Čech 不同，Rips 不检查所有球是否有公共点，而是用两两距离生成团。

## 3. 正式定义

对度量空间中的有限点集 $P$ 和尺度 $\varepsilon$，定义：

$$VR_\varepsilon(P)=\lbrace \sigma\subset P\mid d(p,q)\le\varepsilon\ \text{对所有}\ p,q\in\sigma,\ p\neq q\rbrace$$

若 $\varepsilon_1\le\varepsilon_2$，则 $VR_{\varepsilon_1}(P)\subset VR_{\varepsilon_2}(P)$。

## 4. 分步例题

直线三点坐标为 0、1、2：

| 上限 | 边 | 高维团 | Euler 示性数 |
| --- | --- | --- | --- |
| 0.9 | 无 | 无 | 3 |
| 1.0 | 01,12 | 无 | 1 |
| 1.5 | 01,12 | 无 | 1 |
| 2.0 | 01,12,02 | 三角形 | 1 |

注意最后一步虽然三点不在同一位置，Rips 仍按规则填入三角形。

## 5. 动手实验

```viz
{
  "type": "fit",
  "n": 10
}
```

拖动十个点构造一个环、两个团或噪声尾巴。未来 Rips 过滤盘会提供横轴双轴拖拽和实时连线；当前先手工观察哪些点应该被阈值连上。

```python title="按上限生成 Rips 边"
points = [[0, 0], [1, 0], [0.5, 0.85]]
epsilon = 1.0
edges = []

for i in range(len(points)):
    for j in range(i + 1, len(points)):
        dx = points[i][0] - points[j][0]
        dy = points[i][1] - points[j][1]
        if (dx * dx + dy * dy) ** 0.5 <= epsilon:
            edges.append((i, j))

print(edges)
print(3 - len(edges) + (1 if len(edges) == 3 else 0))
```

三条边同时出现时，按团规则补一个二维面。

## 6. 练习

```exercise
# @title: 练习：扫描 Rips 过滤过程
# @check: 3
# @check: 2
# @check: 1
# @hint: 对每个阈值统计距离不超过它的边数；不要重复计数同一对点。
points = [[0, 0], [1, 0], [2.2, 0], [5, 0]]
thresholds = [2.5, 1.5, 1.1]
edge_counts = []

for limit in thresholds:
    count = len(points)   # 错：这是点的个数，不是边数
    edge_counts.append(count)

for count in edge_counts:
    print(count)
```

初始代码把每个阈值下的边数都当成了点数。四个点在一条直线上，两两距离是 1、2.2、5、1.2、4、2.8；请按真实距离重新统计。

<details>
<summary>点开查看逐步解答</summary>

正确循环如下：

```python
points = [[0, 0], [1, 0], [2.2, 0], [5, 0]]
thresholds = [2.5, 1.5, 1.1]
for limit in thresholds:
    count = 0
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            if abs(points[i][0] - points[j][0]) <= limit:
                count += 1
    print(count)
```

阈值从大到小：2.5 时边 01（距离 1）、12（1.2）、02（2.2）都存在，23 距离 2.8 还没连上，共 3 条；1.5 时 02 消失，剩 2 条；1.1 只剩 01 这 1 条。

</details>

```quiz
Vietoris-Rips 复形的二维三角形什么时候加入？
- 只要三个点的外接圆半径不超过阈值
- 只要三个点两两距离都不超过阈值 [*]
- 只要至少两条边已经存在
? Rips 用两两邻近生成最大团；不检查三个对应球是否有公共交点。
```

```quiz
Čech 复形的二维三角形什么时候加入？
- 只要三个对应球有公共交点 [*]
- 只要三个点两两距离都不超过阈值
- 只要至少两条边已经存在
? 两两相交只是必要条件；Čech 高维单纯形要求对应覆盖集合的公共交集非空。
```

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 Rips 就是 Čech。它在尺度较大时会填出额外高维单纯形。

**误区二**：你以为边越多越好。过大的阈值会把不同簇粘成一个无信息的大团。

**误区三**：你以为全点对计算没有代价。$n$ 个点的复杂度约为平方级，大样本必须降采样或近邻搜索，并设置硬上限。

:::

## 8. 选读：与 Čech 的包含关系

<details>
<summary>选读 · 尺度夹逼</summary>

对单位球背景中的有限点集，常有：

$$\check C_\varepsilon(P)\subset VR_{2\varepsilon}(P)$$

而 Rips 在一定条件下又与某个放大后的 Čech 同伦。Niyogi-Smale-Weinberger 型采样定理利用这类夹逼说明：样本足够稠密时，重建复形能恢复底层流形同调。

常数依赖维度、条件数和覆盖率，不能脱离假设当作万能保证。

</details>

## 9. 下一站

单一阈值容易武断。下一站让阈值连续变化，记录特征的出生和死亡。

→ [persistence diagram 和 barcode](./75-persistence-diagrams.md)
