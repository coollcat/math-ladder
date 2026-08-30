---
title: SVD 与低秩近似
lesson_id: linalg-advanced/svd-low-rank
prereqs:
  - linalg-advanced/eigenvalues
  - linalg-advanced/symmetric-spectral-theorem
volume: 2
layer: L6
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - singular-value
applications:
  - image-compression
  - recommender-systems
exits:
  - data-ai
  - engineering
---

# SVD 与低秩近似

## 1. 从一个场景开始

任何线性变换都可以拆成三个动作：先把输入转到一组合适的轴，再沿这些轴伸缩，最后转到输出位置。这套分解就是奇异值分解；丢掉最短的伸缩轴，就得到最省材料的近似。

## 2. 直觉解释

单位圆经过一个 $2\times2$ 矩阵后通常变成椭圆。椭圆有两条互相垂直的主轴：

- 输入侧的轴叫右奇异向量，组成 $V$；
- 输出侧的轴叫左奇异向量，组成 $U$；
- 每条轴的伸缩倍数是非负数，叫奇异值 $\sigma$。

于是：

$$A=U\Sigma V^T.$$

若 $\sigma_1\gg\sigma_2$，第二个方向贡献很小。只用第一项近似 $A$，就是最优 rank-1 近似。

## 3. 正式定义

实矩阵 $A$ 的奇异值分解为：

$$A=U\Sigma V^T,$$

其中 $U,V$ 的列是正交单位向量，$\Sigma$ 的对角元 $\sigma_1\ge\sigma_2\ge\cdots\ge0$ 是奇异值。

对 $2\times2$ 矩阵，右奇异向量是 $A^TA$ 的特征向量（$A^TA$ 是对称矩阵，正交性由[上一课的谱定理](./45-symmetric-spectral-theorem.md)担保）；奇异值满足

$$\sigma_i=\sqrt{\lambda_i(A^TA)}.$$

保留前 $k$ 个奇异项，是在 Frobenius 范数意义下所有 rank-$k$ 矩阵中最优的近似。

## 4. 分步例题

设

$$A=\begin{pmatrix}3&0\\0&2\end{pmatrix}.$$

1. $A^TA=\begin{pmatrix}9&0\\0&4\end{pmatrix}$；
2. 特征值是 9 和 4，所以奇异值是 $\sigma_1=3$、$\sigma_2=2$；
3. $V$ 和 $U$ 都是标准基；
4. rank-1 近似只保留第一项：$A_1=\begin{pmatrix}3&0\\0&0\end{pmatrix}$；
5. 保留能量比例是 $\sigma_1^2/(\sigma_1^2+\sigma_2^2)=9/13\approx0.692$。

## 5. 动手实验

### 实验 1：椭圆与奇异轴

```viz
{
  "type": "svd-stretch",
  "title": "旋转-伸缩-旋转",
  "matrix": [3, 1, 0, 2]
}
```

单位圆被 $A$ 推成椭圆。蓝/橙箭头是输入侧右奇异方向 $V$，紫/绿箭头是对应输出侧左奇异方向 $U$。切换 rank-1，看第二根轴的贡献被丢掉。

### 实验 2：面积与秩的对照

```viz
{
  "type": "det-area",
  "title": "奇异值连乘决定面积",
  "c1": [3, 0],
  "c2": [0, 2]
}
```

对方阵，$\lvert\det A\rvert=\sigma_1\sigma_2$。若一个奇异值是 0，面积归零，矩阵不可逆。

### 实验 3：Python 算保留能量

```python title="由奇异值比较 rank-1 保留比例"
sigma1 = 3.0
sigma2 = 2.0

total_energy = sigma1 ** 2 + sigma2 ** 2   # ** 是乘方
kept_energy = sigma1 ** 2
ratio = kept_energy / total_energy
print("rank-1")
print(round(ratio, 3))
```

输出 `rank-1` 和 `0.692`。奇异值平方越大，对应方向携带的结构能量越多。

## 6. 练习

```exercise
# @title: 练习：选择最优低秩近似
# @check: rank-1
# @check: 0.692
# @hint: rank-1 只保留最大奇异值；比例用 sigma1 的平方除以所有奇异值平方和。
sigma1 = 3.0
sigma2 = 2.0
best = "rank-2"
ratio = (sigma1 + sigma2) ** 2 / (sigma1 ** 2 + sigma2 ** 2)
print(best)
print(round(ratio, 3))
```

<details>
<summary>点开查看逐步解答</summary>

rank-1 近似只保留最大奇异项：

```python
sigma1 = 3.0
sigma2 = 2.0
best = "rank-1"
ratio = sigma1 ** 2 / (sigma1 ** 2 + sigma2 ** 2)
print(best)
print(round(ratio, 3))
```

代入得 $9/13=0.692307\ldots$，四舍五入为 `0.692`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为奇异值就是特征值。奇异值来自 $A^TA$ 的特征值开方，总是非负；长方形矩阵也有奇异值。

**误区二**：你以为 $U$ 和 $V$ 可以互换。$V$ 住在输入空间，$U$ 住在输出空间；方向弄反，几何解释就错了。

**误区三**：你以为低秩近似只是随便删小数。SVD 的删法有最优性：在给定秩下，它让平方误差最小。

:::

## 8. 快问快答

```quiz
奇异值是 5 和 1 时，最优 rank-1 近似丢掉多少能量比例？
- 1/26 [*]
- 1/25
- 1/5
? 总能量是 5²+1²=26；rank-1 丢掉 σ2²=1，所以丢掉比例是 1/26。若问保留比例，才是 25/26。
```

## 9. 选读：为什么 rank-1 误差等于最小奇异值

<details>
<summary>选读 · Eckart-Young 的二维版</summary>

把 $A$ 写成两个奇异项：

$$A=\sigma_1\vec u_1\vec v_1^T+\sigma_2\vec u_2\vec v_2^T.$$

rank-1 近似保留第一项，误差是第二项。因为两个奇异方向正交，误差平方就是 $\sigma_2^2$。任何其他 rank-1 矩阵都无法同时保留更多两个正交方向的能量，所以这是最小误差。

</details>

## 10. 下一站

SVD 告诉我们矩阵的最佳低秩骨架。把矩阵换成中心化数据矩阵，同样的骨架就变成数据最舒展的方向：主成分。

→ [PCA 与高维压缩](./60-pca-compression.md)
