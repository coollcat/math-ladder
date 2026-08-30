---
title: 条件数与数值稳定性
lesson_id: linalg-advanced/condition-number
prereqs:
  - linalg-advanced/diagonalization
  - linalg-advanced/svd-low-rank
volume: 2
layer: L6
track:
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - condition-number
applications:
  - numerical-linear-algebra
  - error-analysis
exits:
  - engineering
  - scientific-computing
---

# 条件数与数值稳定性

## 1. 从一个场景开始

两个方程组在纸上都“有唯一解”，在计算机里表现却可能天差地别。一个允许输入有毫厘误差，输出仍可靠；另一个把微小测量噪声放大成完全不同的答案。条件数就是这台放大器的倍数表。

## 2. 直觉解释

把可逆矩阵 $A$ 看作输入空间到输出空间的变形。单位小圆经过 $A$ 后变成椭圆：

- 最长轴是最大奇异值 $\sigma_1$；
- 最短轴是最小奇异值 $\sigma_2$。

若 $\sigma_1\gg\sigma_2$，某些方向的输入误差被拉得极长。定义：

$$\kappa(A)=\frac{\sigma_1}{\sigma_2}.$$

条件数越大，逆问题越敏感。

## 3. 正式定义

对可逆方阵，2-范数条件数是最大奇异值与最小奇异值之比：

$$\kappa(A)=\frac{\sigma_{\max}}{\sigma_{\min}}\ge1.$$

求解 $A\vec x=\vec b$ 时，相对误差满足直觉界：

$$\frac{\lVert\delta \vec x\rVert}{\lVert\vec x\rVert}\lesssim \kappa(A)\frac{\lVert\delta \vec b\rVert}{\lVert\vec b\rVert}.$$

$\kappa\approx10^k$ 常意味着可能损失约 $k$ 位有效数字。

## 4. 分步例题

设奇异值为 $\sigma_1=10$、$\sigma_2=0.1$。

1. $\kappa=10/0.1=100$；
2. 输入相对扰动 $0.1\%$ 可能放大到约 $10\%$；
3. 这属于病态问题；
4. 若奇异值为 $4$ 和 $1$，则 $\kappa=4$，输出通常稳定得多。

注意：行列式 $10\times0.1=1$ 看起来漂亮，但条件数已经暴露出方向极度不平衡。

## 5. 动手实验

### 实验 1：误差椭圆

```viz
{
  "type": "condition-number",
  "title": "小圆如何变成针椭圆",
  "s1": 10,
  "s2": 0.1,
  "epsilon": 0.08
}
```

蓝圈是输入小扰动，红椭圆是输出误差。把 $\sigma_2$ 调大，椭圆变胖，问题变良态。

### 实验 2：奇异轴与低秩倾向

```viz
{
  "type": "svd-stretch",
  "title": "条件数来自奇异值悬殊",
  "matrix": [10, 0, 0, 0.1]
}
```

单位圆被拉成极扁椭圆。第二奇异值越接近 0，矩阵越接近不可逆。

### 实验 3：Python 分类条件数

```python title="由奇异值计算条件数"
sigma1 = 10.0
sigma2 = 0.1
kappa = sigma1 / sigma2
status = "pathological" if kappa > 20 else "stable"
print(kappa)
print(status)
```

输出 `100.0` 和 `pathological`。

## 6. 练习

```exercise
# @title: 练习：计算并分类条件数
# @check: 100.0
# @check: pathological
# @hint: 条件数是最大奇异值除以最小奇异值；大于 20 标记 pathological。
sigma1 = 10.0
sigma2 = 0.1
kappa = sigma1 - sigma2
status = "stable"
print(kappa)
print(status)
```

<details>
<summary>点开查看逐步解答</summary>

条件数用除法，不是减法：

```python
sigma1 = 10.0
sigma2 = 0.1
kappa = sigma1 / sigma2
status = "pathological" if kappa > 20 else "stable"
print(kappa)
print(status)
```

所以 $\kappa=100$，输出 `pathological`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为行列式接近 1 就稳定。行列式不衡量方向不平衡；奇异值比才是条件数。

**误区二**：你以为残差小就一定解准。病态问题中，不同解都能给小残差，但彼此相差很远。

**误区三**：你以为条件数只属于矩阵。它属于问题与范数；同一矩阵在不同问题里可能有不同敏感度。

:::

## 8. 快问快答

```quiz
奇异值是 5 和 5 时，条件数是多少？
- 0
- 1 [*]
- 25
? 最大奇异值等于最小奇异值时，单位圆不会被拉扁，条件数达到最小值 1。
```

## 9. 选读：为什么接近奇异就病态

<details>
<summary>选读 · 逆矩阵的放大率</summary>

$A^{-1}$ 的范数约为 $1/\sigma_{\min}$。输出端的小误差经过 $A^{-1}$ 回到输入端时，会被最多放大 $1/\sigma_{\min}$。再结合 $A$ 自身的尺度 $\sigma_{\max}$，相对误差放大率自然写成 $\sigma_{\max}/\sigma_{\min}$。

</details>

## 10. 下一站

条件数处理一次求解的误差放大。下一课看矩阵反复作用：一步转移如何变成多步传播，并通向图上的随机游走。

→ [矩阵幂与图传播](./120-matrix-powers.md)
