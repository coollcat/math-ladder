---
title: 特征值与不变方向
lesson_id: linalg-advanced/eigenvalues
prereqs:
  - linalg-advanced/determinant-geometry
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
  - eigenpair
applications:
  - vibration-analysis
  - pagerank
exits:
  - engineering
  - data-ai
---

# 特征值与不变方向

## 1. 从一个场景开始

大多数向量经过矩阵变换后会又转向又伸缩；可总有一些方向像转门的轴——变换只把它们拉长或缩短，不把它们扳离原直线。找到这些方向，复杂变换会突然露出骨架。

## 2. 直觉解释

取矩阵

$$A=\begin{pmatrix}4&1\\2&3\end{pmatrix},\qquad \vec v=\binom11.$$

直接乘：

$$A\vec v=\binom{4+1}{2+3}=\binom55=5\binom11.$$

输出和输入在同一条直线上，只是变成 5 倍。所以 $\vec v$ 是特征向量，$5$ 是对应特征值。

特征值回答“伸缩多少倍”；特征向量回答“哪条方向不变”。

## 3. 正式定义

对方阵 $A$，若存在非零向量 $\vec v$ 和数 $\lambda$ 使

$$A\vec v=\lambda \vec v,$$

则 $\vec v$ 是特征向量，$\lambda$ 是特征值。

把右边移项：

$$(A-\lambda I)\vec v=\vec 0.$$

要有非零解，矩阵 $A-\lambda I$ 必须不可逆，因此：

$$\det(A-\lambda I)=0.$$

这个方程叫特征方程。

## 4. 分步例题

仍取 $A=\begin{pmatrix}4&1\\2&3\end{pmatrix}$。

1. $A-\lambda I=\begin{pmatrix}4-\lambda&1\\2&3-\lambda\end{pmatrix}$；
2. 行列式 $=(4-\lambda)(3-\lambda)-2=\lambda^2-7\lambda+10$；
3. 解 $\lambda^2-7\lambda+10=0$，得 $\lambda_1=5$、$\lambda_2=2$；
4. 对 $\lambda=5$，解 $(A-5I)\vec v=0$，得 $\vec v=\binom11$；
5. 对 $\lambda=2$，得另一个方向 $\vec v=\binom{-1}{2}$。

## 5. 动手实验

### 实验 1：试探方向捕手

```viz
{
  "type": "eigen-direction",
  "title": "把 Av 拉回 v 的直线",
  "matrix": [4, 1, 2, 3]
}
```

拖动蓝色向量。红色 $A\vec v$ 通常离开蓝线；当偏转残差降到 0，你就抓到了特征方向。按钮会吸附到最近实特征方向。

### 实验 2：全平面对照

```viz
{
  "type": "matrix",
  "title": "普通方向转向，特征方向不转",
  "a": 4,
  "b": 1,
  "c": 2,
  "d": 3
}
```

观察网格：多数方向被扭歪；两条虚线紫色特征线上的点只沿自身伸缩，小房子本身只是普通输入图形。

### 实验 3：验证特征对

```python title="检查 A v 是否等于 lambda v"
A = [[4, 1], [2, 3]]
v = [1, 1]
lambda_value = 5

av = [A[0][0] * v[0] + A[0][1] * v[1],
      A[1][0] * v[0] + A[1][1] * v[1]]
lv = [lambda_value * v[0], lambda_value * v[1]]
print(av)
print(lv)
```

两行都输出 `[5, 5]`。验证比求解容易；求解用特征方程。

## 6. 练习

```exercise
# @title: 练习：验证特征对
# @check: [5, 5]
# @check: [5, 5]
# @hint: 第一行乘第一列，第二行乘第二列；不要漏掉非对角项。
A = [[4, 1], [2, 3]]
v = [1, 1]
lambda_value = 5

av = [A[0][0] * v[0], A[1][1] * v[1]]
lv = [lambda_value * v[0], lambda_value * v[1]]
print(av)
print(lv)
```

<details>
<summary>点开查看逐步解答</summary>

完整矩阵乘向量：

```python
A = [[4, 1], [2, 3]]
v = [1, 1]
av = [A[0][0] * v[0] + A[0][1] * v[1],
      A[1][0] * v[0] + A[1][1] * v[1]]
print(av)
```

所以：

```text
Av = [4*1 + 1*1, 2*1 + 3*1] = [5, 5]
λv = [5*1, 5*1]             = [5, 5]
```

两者相等，特征对成立。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为零向量也是特征向量。定义要求非零；否则任何 $\lambda$ 都会无意义地成立。

**误区二**：你以为实矩阵一定只有实特征方向。旋转矩阵可能只有复特征值，平面上没有不动直线。

**误区三**：你以为特征向量唯一。特征方向是一条直线，线上任何非零倍数都是特征向量。

:::

## 8. 快问快答

```quiz
若 A v = 2 v 且 v 不是零向量，v 的长度改变多少倍？
- 不变
- 2 倍 [*]
- 4 倍
? 等式表示同一方向伸缩 2 倍。若问面积或能量，才会出现 4 或平方关系。
```

## 9. 选读：判别式告诉我们特征值的脸色

<details>
<summary>选读 · 2×2 特征方程</summary>

对 $A=\begin{pmatrix}a&b\\c&d\end{pmatrix}$：

$$\lambda^2-(a+d)\lambda+(ad-bc)=0.$$

判别式

$$\Delta=(a+d)^2-4(ad-bc).$$

$\Delta>0$ 有两个实特征方向；$\Delta=0$ 有重根；$\Delta<0$ 没有实特征方向，对应平面上的旋转趋势。

</details>

## 10. 下一站

特征方向找到了，但它们常常歪歪扭扭。有一类矩阵天生享受正交特征方向——对称矩阵，这条保障叫谱定理。下一课先立这条法律，再让 SVD 出场收拾一般矩阵。

→ [对称矩阵与谱定理](./45-symmetric-spectral-theorem.md)
