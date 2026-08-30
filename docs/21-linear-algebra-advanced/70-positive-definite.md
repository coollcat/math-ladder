---
title: 正定二次型
lesson_id: linalg-advanced/positive-definite
prereqs:
  - linalg-advanced/eigenvalues
volume: 2
layer: L6
track:
  - geometry-space
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - positive-definite
applications:
  - optimization
  - stability-analysis
exits:
  - engineering
  - data-ai
---

# 正定二次型

## 1. 从一个场景开始

把一个碗放在桌上，无论小球从哪个水平方向移动，高度都会上升；把马鞍放在桌上，有的方向上升，有的方向下降。二次型就是在问：这个矩阵描述的曲面，到底是碗、马鞍，还是圆柱状洼地？

## 2. 直觉解释

对称矩阵

$$A=\begin{pmatrix}a&b\\b&c\end{pmatrix}$$

对应二次函数

$$Q(x,y)=\begin{pmatrix}x&y\end{pmatrix}A\begin{pmatrix}x\\y\end{pmatrix}=ax^2+2bxy+cy^2.$$

正定不是说 $a$ 和 $c$ 都是正数，而是说**所有方向**上的 $Q$ 都大于零。只要有一个方向给出负值，矩阵就不够格。

## 3. 正式定义

对称矩阵 $A$ 正定，等价于：

$$\vec x^TA\vec x>0\quad\text{对所有非零}\ \vec x.$$

二维对称矩阵可用两条等价判据：

| 判据 | 正定条件 |
| --- | --- |
| 顺序主子式 | $a>0$ 且 $ac-b^2>0$ |
| 特征值 | 所有特征值大于 0 |

若行列式小于 0，必为不定；若行列式等于 0，至少有一个方向被压成零，称半正定或半负定。

## 4. 分步例题

取

$$A=\begin{pmatrix}2&1\\1&2\end{pmatrix}.$$

1. 第一主子式 $a=2>0$；
2. 行列式 $=2\cdot2-1\cdot1=3>0$；
3. 所以 $A$ 正定；
4. 验证两个点：$Q(1,1)=6$，$Q(-1,1)=2$，都大于零。

若改成 $\begin{pmatrix}1&2\\2&1\end{pmatrix}$，行列式为 $1\cdot1-2\cdot2=-3$。虽然对角元都是 1，但代入方向 $(1,-1)$ 得 $Q=1^2+2\cdot2\cdot1\cdot(-1)+(-1)^2=-2$——注意别把它和行列式 $-3$ 混为一谈——一个负方向就足以否定正定，所以是马鞍。

## 5. 动手实验

### 实验 1：符号场与特征线

```viz
{
  "type": "quadratic-form",
  "title": "碗、鞍与符号场",
  "matrix": [2, 1, 1, 2]
}
```

拖动 $a,b,c$。绿色区域是 $Q\ge0$，红色区域是 $Q<0$；两条特征线把符号场切成骨架。

### 实验 2：沿特征方向看伸缩

```viz
{
  "type": "eigen-direction",
  "title": "正定矩阵的特征值全为正",
  "matrix": [2, 1, 1, 2]
}
```

吸附两个特征方向，读特征值。只要最小特征值也大于 0，任何方向上的二次型都不可能变负。

### 实验 3：Python 逐点验证

```python title="先算值，再分类"
a = 2
b = 1
c = 2

def q(x, y):
    return a * x * x + 2 * b * x * y + c * y * y

print(q(1, 1))
print(q(-1, 1))
det = a * c - b * b
status = "positive definite" if a > 0 and det > 0 else "not positive definite"
print(status)
```

输出 `6`、`2`、`positive definite`。对称二阶矩阵用顺序主子式判据：`a > 0 and det > 0`；逐点验证只能增强信心，不能替代判据。

## 6. 练习

```exercise
# @title: 练习：计算并分类二次型
# @check: 6
# @check: 2
# @check: positive definite
# @hint: 交叉项系数是 2b；行列式用 ac-b²。
a = 2
b = 1
c = 2

def q(x, y):
    return a * x * x - 2 * b * x * y + c * y * y

print(q(1, 1))
print(q(-1, 1))
det = a * c - b * b
status = "indefinite"
print(status)
```

<details>
<summary>点开查看逐步解答</summary>

交叉项应加不应减：

```python
def q(x, y):
    return a * x * x + 2 * b * x * y + c * y * y
```

于是：

```text
Q(1,1)=2+2+2=6
Q(-1,1)=2-2+2=2
det=2*2-1*1=3
```

两个主子式都为正，所以输出 `positive definite`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为对角元都正就正定。反例 $\begin{pmatrix}1&2\\2&1\end{pmatrix}$ 的两个对角元都是 1，却是不定。

**误区二**：你以为交叉项系数就是 $b$。矩阵里写 $b$，展开后是 $2bxy$。

**误区三**：你以为测几个正点就够。正定是全称命题；一个负方向就足以否定，而确认必须靠判据。

:::

## 8. 快问快答

```quiz
对称矩阵的特征值是 3 和 -1，它是什么类型？
- 正定
- 半正定
- 不定 [*]
? 只要有一个正特征值和一个负特征值，就存在上升方向和下降方向，曲面像马鞍。
```

## 9. 选读：为什么正定等价于特征值全正

<details>
<summary>选读 · 换到特征坐标</summary>

对称矩阵有一组正交特征向量（[谱定理](./45-symmetric-spectral-theorem.md)的担保）。把任意单位方向写成特征方向的组合，代入二次型后，交叉项消失，只剩

$$Q=\lambda_1c_1^2+\lambda_2c_2^2.$$

若所有 $\lambda_i>0$，组合不可能为负；若有负特征值，取那个方向就得到负值。

</details>

## 10. 下一站

正定性告诉我们“最低点是否真的是碗底”。下一课把矩阵放进数据拟合：当方程无解时，如何找最优近似。

→ [最小二乘与正规方程](./80-least-squares.md)
