---
title: 谱与特征值
lesson_id: functional-analysis/spectrum-eigenvalues
prereqs:
  - functional-analysis/adjoint-operators
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - spectrum
applications:
  - vibration-modes
  - stability-analysis
exits:
  - research
introduces_builtin: []
---

# 谱与特征值

## 1. 开场钩子

一根弦只愿意按某些频率振动；一个矩阵在某些方向只做伸缩。把这些特殊参数收集起来，就得到谱。它是系统的“共振说明书”。

## 2. 直觉解释

对矩阵 $A$，复数 $\lambda$ 属于谱，当 $A-\lambda I$ 不可逆。有限维时这等价于存在非零 $v$ 使 $Av=\lambda v$。无穷维中还可能没有特征向量；此时 $A-\lambda I$ 可能失去单射性、满射性或有界逆。

## 3. 正式定义

有界算子 $T:X\to X$ 的**预解集**是使 $T-\lambda I$ 有有界逆的复数集合；其补集叫**谱** $\sigma(T)$。若存在非零向量满足：

$$Tv=\lambda v,$$

则 $\lambda$ 叫特征值，$v$ 叫特征向量。

## 4. 分步例题

取 $A=\begin{pmatrix}2&1\\1&2\end{pmatrix}$。

1. 特征多项式为 $(2-\lambda)^2-1=0$；
2. 解出 $\lambda=3$ 与 $\lambda=1$；
3. 对 $\lambda=3$，$(A-3I)v=0$ 给出 $v=(1,1)$；
4. 验证 $Av=(3,3)=3v$；
5. 对 $\lambda=1$，可得另一个特征方向 $(1,-1)$。

## 5. 动手实验

### 实验 1：拖到特征方向吸附

```viz
{
  "type": "eigen-direction",
  "title": "谱中的伸缩方向",
  "matrix": [2, 1, 1, 2]
}
```

蓝色输入通常会被转向；红色输出与蓝线重合时，你找到了特征方向，读数给出对应特征值。也可以点“吸附最近特征方向”按钮。

### 实验 2：数值迭代找主特征方向

```python title="幂迭代的三步"
v = [1.0, 0.0]
A = [[2.0, 1.0], [1.0, 2.0]]
for step in range(1, 4):
    Av = [A[0][0] * v[0] + A[0][1] * v[1],
          A[1][0] * v[0] + A[1][1] * v[1]]
    # max() 从两个候选中取较大者；这里用它记录当前最大坐标长度。
    size = max(abs(Av[0]), abs(Av[1]))
    v = [Av[0] / size, Av[1] / size]
    print(step, v, size)
```

向量逐渐靠近 $(1,1)$，尺寸记录趋近主特征值 3。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为谱一定都是特征值。无穷维算子的连续谱可以不含任何特征点。

**误区二**：你以为复矩阵总有实特征值。旋转矩阵的特征值可以是成对复数。

**误区三**：你以为谱半径就是最大特征值的长度。它确实是复谱模长上确界，但谱点未必可枚举为有限列表。

:::

## 7. 练习

```exercise
# @title: 练习：验证特征对
# @check: lambda=3.0
# @hint: 若 Av 的两个分量都是 v 的三倍，则 lambda 为 3。
A = [[3.0, 0.0], [0.0, 3.0]]
v = [1.0, -2.0]
Av = [A[0][0] * v[0] + A[0][1] * v[1],
      A[1][0] * v[0] + A[1][1] * v[1]]
lam = Av[0] / v[0] + Av[1] / v[1]
print("lambda=" + str(lam))
```

<details>
<summary>点开查看逐步解答</summary>

$Av=(3,-6)=3(1,-2)$。比值分别是 3 和 3；应检查两者相等并取共同值，而不是相加得到 6。

```python
A = [[3.0, 0.0], [0.0, 3.0]]
v = [1.0, -2.0]
Av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]
ratio0 = Av[0] / v[0]
ratio1 = Av[1] / v[1]
lam = ratio0
if ratio0 != ratio1:
    print("not-eigenpair")
else:
    print("lambda=" + str(lam))
```
</details>

## 8. 快问快答

```quiz
矩阵 A-lambda*I 不可逆时，lambda 属于哪里？
- 一定属于预解集
- 属于谱 [*]
- 只能属于零矩阵
? 不可逆正是谱点的标志；有限维下还会出现非零特征向量。
```

## 9. 选读证明

<details>
<summary>选读 · 谱非空的有限维线索</summary>

复系数多项式 $\det(A-\lambda I)$ 至少有一个复根，所以有限维复矩阵必有特征值。无穷维没有行列式可用，谱的存在性要靠预解集的开性和 Banach 代数中可逆元邻域的结构来证明。
</details>

## 10. 下一站

有些谱虽然无穷，却表现得像有限维一样温和。下一课研究紧算子和它们的离散谱。

→ [紧算子选讲](./75-compact-operators.md)



