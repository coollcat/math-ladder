---
title: PCA 与高维压缩
lesson_id: linalg-advanced/pca-compression
prereqs:
  - linalg-advanced/svd-low-rank
volume: 2
layer: L6
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - principal-component
applications:
  - dimensionality-reduction
  - visualization
exits:
  - data-ai
---

# PCA 与高维压缩

## 1. 从一个场景开始

一张云雾状的散点图，看似每个点都要两个坐标；若所有点其实都贴着一条斜线，一个数加上“在线上第几格”就能近似描述它们。PCA 找的就是这条最省材料的线。

## 2. 直觉解释

先把数据中心移到原点。然后在所有可能方向中找一个投影方向：

- 投影后方差最大；
- 垂直残差最小；
- 重构损失最小。

这三句话在 PCA 里是同一件事。第一主成分就是这条方向；第二主成分垂直于它，承接剩余变化。

## 3. 正式定义

给定样本点 $\vec x_1,\ldots,\vec x_n$，先计算均值：

$$\bar{\vec x}=\frac1n\sum_{i=1}^n\vec x_i.$$

中心化数据为 $\vec z_i=\vec x_i-\bar{\vec x}$。协方差矩阵的直觉形式是：

$$C=\frac1n\sum_{i=1}^n \vec z_i\vec z_i^T.$$

$C$ 的最大特征值对应单位特征向量就是第一主成分。投影系数为 $t_i=\vec z_i\cdot\vec u$。

## 4. 分步例题

取两点 $(1,1)$ 和 $(3,3)$。

1. 均值是 $(2,2)$；
2. 中心化得到 $(-1,-1)$ 和 $(1,1)$；
3. 所有变化都沿 $(1,1)$ 方向；
4. 第一主成分是 $\frac{1}{\sqrt2}(1,1)$；
5. 投影系数分别是 $-\sqrt2$ 和 $\sqrt2$；用“均值 + 系数×方向”可以完全重构两点，残差为 0。

## 5. 动手实验

### 实验 1：转动方差盘

```viz
{
  "type": "pca-projection",
  "title": "方差最大，残差最小",
  "points": [[1, 1], [2, 2.1], [3, 2.8], [4, 4.1], [5, 5]]
}
```

拖动角度滑杆。蓝点是原始样本，橙点是它们在这条方向线上的投影重构，红色竖线是被丢掉的残差；转动方向，方差变大时残差变小。点「吸附第一主成分」后残差最小。

### 实验 2：单点投影的老朋友

```viz
{
  "type": "projection",
  "title": "PCA 的每一小步都是投影",
  "u": [2, 2],
  "v": [1, 1]
}
```

PCA 只是把许多点同时投影到同一条过均值的方向线上；单点几何仍然是卷一学过的投影。

### 实验 3：Python 中心化

```python title="先去均值，再谈主成分"
points = [[1, 1], [3, 3]]
mean_x = (points[0][0] + points[1][0]) / 2
mean_y = (points[0][1] + points[1][1]) / 2

for point in points:
    centered_x = point[0] - mean_x
    centered_y = point[1] - mean_y
    print(centered_x, centered_y)
```

输出 `-1.0 -1.0` 和 `1.0 1.0`。中心化后，原点变成数据的重心。

## 6. 练习

```exercise
# @title: 练习：中心化数据
# @check: -1.0 -1.0
# @check: 1.0 1.0
# @hint: 均值是每个分量分别求平均；中心化等于原坐标减去均值。
points = [[1, 1], [3, 3]]
mean_x = 0
mean_y = 0

for point in points:
    print(point[0], point[1])
```

<details>
<summary>点开查看逐步解答</summary>

均值：

```python
mean_x = (1 + 3) / 2
mean_y = (1 + 3) / 2
```

两者都是 2。中心化：

```python
points = [[1, 1], [3, 3]]
mean_x = (1 + 3) / 2
mean_y = (1 + 3) / 2
for point in points:
    print(point[0] - mean_x, point[1] - mean_y)
```

输出 `-1.0 -1.0` 和 `1.0 1.0`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为不中心化也能直接做 PCA。均值不在原点时，最大方差方向可能只反映“重心偏移”，不是形状主轴。

**误区二**：你以为 PCA 线就是回归线。回归最小化竖直误差；PCA 最小化到方向的垂直残差。

**误区三**：你以为主成分一定有现实因果含义。它只是方差方向，解释仍要看数据和领域知识。

:::

## 8. 快问快答

```quiz
PCA 第一步通常做什么？
- 把最大值缩放到 1
- 把数据中心化到原点 [*]
- 直接删除方差最小的列
? 先去均值，协方差方向才描述样本围绕重心的形状，而不是重心位置。
```

## 9. 选读：PCA 和 SVD 的接缝

<details>
<summary>选读 · 数据矩阵的另一件外套</summary>

把中心化样本按行放成矩阵 $Z$。协方差矩阵可写成 $C=\frac1n Z^TZ$。对 $Z$ 做奇异值分解：

$$Z=U\Sigma V^T.$$

则 $V$ 的列是主成分方向，$\sigma_i^2/n$ 是对应方差。SVD 数值上更稳定，也不需要显式构造大协方差矩阵。

</details>

## 10. 下一站

线代进阶首批六课已经把“消元—秩—面积—特征方向—低秩近似—数据压缩”连成一条链。下一站进入正定二次型，为最小二乘与数值稳定性铺路。

→ [正定二次型](./70-positive-definite.md)
