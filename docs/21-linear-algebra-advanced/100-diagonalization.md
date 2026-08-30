---
title: 相似与对角化
lesson_id: linalg-advanced/diagonalization
prereqs:
  - linalg-advanced/linear-maps
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
  - similar-matrix
  - diagonalization
applications:
  - differential-equations
  - markov-chains
exits:
  - engineering
  - data-ai
---

# 相似与对角化

## 1. 从一个场景开始

同一台机器，用标准坐标看是“旋转加剪切”的复杂动作；换到特征坐标看，只剩两个独立伸缩。对角化就是给矩阵换一副合适的眼镜，把纠缠的动作拆开。

## 2. 直觉解释

设矩阵 $A$ 有两个独立特征方向 $\vec v_1,\vec v_2$：

$$A\vec v_1=\lambda_1\vec v_1,\qquad A\vec v_2=\lambda_2\vec v_2.$$

把这两个方向当作新基。在新基里，第一个方向只乘 $\lambda_1$，第二个方向只乘 $\lambda_2$。矩阵变成对角矩阵：

$$D=\begin{pmatrix}\lambda_1&0\\0&\lambda_2\end{pmatrix}.$$

原矩阵 $A$ 与 $D$ 描述同一动作，只是语言不同。

## 3. 正式定义

若存在可逆矩阵 $P$ 使

$$D=P^{-1}AP,$$

则称 $A$ 与 $D$ 相似。等价地：

$$A=PDP^{-1}.$$

$P$ 的列是新基向量，通常取特征向量；$D$ 的对角元是特征值。二维矩阵可对角化的关键是有两个线性无关特征向量。

## 4. 分步例题

取

$$A=\begin{pmatrix}4&1\\2&3\end{pmatrix}.$$

1. 特征值满足 $\lambda^2-7\lambda+10=0$，得 $\lambda_1=5$、$\lambda_2=2$；
2. 对 $\lambda_1=5$，取 $\vec v_1=(1,1)$；
3. 对 $\lambda_2=2$，取 $\vec v_2=(-1,2)$；
4. 两个向量不成倍数，所以可对角化；
5. $P=\begin{pmatrix}1&-1\\1&2\end{pmatrix}$，$D=\begin{pmatrix}5&0\\0&2\end{pmatrix}$，满足 $A=PDP^{-1}$。

## 5. 动手实验

### 实验 1：换基看网格

```viz
{
  "type": "diagonalize-grid",
  "title": "同一动作的两种语言",
  "matrix": [4, 1, 2, 3]
}
```

先看标准基下的斜网格，再切换到特征基。网格不再被剪切，只沿两条特征轴伸缩。

### 实验 2：找不变方向

```viz
{
  "type": "eigen-direction",
  "title": "对角化的两根轴",
  "matrix": [4, 1, 2, 3]
}
```

分别吸附两个特征方向。特征值 5 表示第一轴伸长 5 倍，特征值 2 表示第二轴伸长 2 倍。

### 实验 3：Python 验证特征对

```python title="对角化的原料是特征对"
A = [[4, 1], [2, 3]]
v = [1, 1]
lambda_value = 5

av = [A[0][0] * v[0] + A[0][1] * v[1],
      A[1][0] * v[0] + A[1][1] * v[1]]
lv = [lambda_value * v[0], lambda_value * v[1]]
print(av)
print(lv)
print("diagonalizable")
```

两行都输出 `[5, 5]`；两个独立特征向量存在，所以可对角化。

## 6. 练习

```exercise
# @title: 练习：组装 P 和 D
# @check: D=[[5, 0], [0, 2]]
# @check: [[4.0, 1.0], [2.0, 3.0]]
# @check: diagonalization verified
# @hint: P 的两列分别对应特征值 5 和 2；把这两个数放进 D 的对角线，再把 status 改成验证成功的文本。
A = [[4, 1], [2, 3]]
P = [[1, -1], [1, 2]]
P_inv = [[2 / 3, 1 / 3], [-1 / 3, 1 / 3]]
D00 = 4
D11 = 3
status = "not assembled"
PD = [
    [round(P[0][0] * D00 * P_inv[0][0] + P[0][1] * D11 * P_inv[1][0], 3),
     round(P[0][0] * D00 * P_inv[0][1] + P[0][1] * D11 * P_inv[1][1], 3)],
    [round(P[1][0] * D00 * P_inv[0][0] + P[1][1] * D11 * P_inv[1][0], 3),
     round(P[1][0] * D00 * P_inv[0][1] + P[1][1] * D11 * P_inv[1][1], 3)],
]
print(f"D=[[{D00}, 0], [0, {D11}]]")
print(PD)
print(status)
```

<details>
<summary>点开查看逐步解答</summary>

特征向量的排列决定对角元的位置：

```python
A = [[4, 1], [2, 3]]
P = [[1, -1], [1, 2]]
P_inv = [[2 / 3, 1 / 3], [-1 / 3, 1 / 3]]
D00 = 5
D11 = 2
status = "diagonalization verified"
PD = [
    [round(P[0][0] * D00 * P_inv[0][0] + P[0][1] * D11 * P_inv[1][0], 3),
     round(P[0][0] * D00 * P_inv[0][1] + P[0][1] * D11 * P_inv[1][1], 3)],
    [round(P[1][0] * D00 * P_inv[0][0] + P[1][1] * D11 * P_inv[1][0], 3),
     round(P[1][0] * D00 * P_inv[0][1] + P[1][1] * D11 * P_inv[1][1], 3)],
]
```

所以：

```text
D=[[5, 0], [0, 2]]
A=PDP^{-1}=[[4.0, 1.0], [2.0, 3.0]]
diagonalization verified
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为有特征值就能对角化。重复特征值可能只对应一个独立特征方向，几何重数不足时不可对角化。这类"亏损"矩阵并非无救——Jordan 标准形给它们发了第二套坐标，见[Jordan 标准形：不可对角化时的第二套坐标](./105-jordan-form.md)。

**误区二**：你以为相似矩阵有相同特征向量。它们共享特征值和行列式、迹等结构量，但特征向量会随 $P$ 改变。

**误区三**：你以为对角化只是简化计算。它把动力系统、幂和二次型的耦合方向拆开，是结构性的解释。

:::

## 8. 快问快答

```quiz
A=PDP⁻¹ 中，P 的列通常是什么？
- A 的行向量
- A 的特征向量 [*]
- D 的对角元
? P 负责把特征基坐标翻译回标准基，所以它的列是标准基下的特征向量。
```

## 9. 选读：矩阵幂为什么变容易

<details>
<summary>选读 · 相似矩阵的幂</summary>

若 $A=PDP^{-1}$，则：

$$A^2=PD P^{-1}PD P^{-1}=PD^2P^{-1}.$$

同理 $A^k=PD^kP^{-1}$。对角矩阵的幂只需把每个对角元取 $k$ 次方，耦合动作被彻底解耦。

</details>

## 10. 下一站

对角化能解释结构，但重复特征值只剩一条独立方向时它当场破产——下一课的 Jordan 标准形给亏损矩阵发第二套坐标。

→ [Jordan 标准形：不可对角化时的第二套坐标](./105-jordan-form.md)
