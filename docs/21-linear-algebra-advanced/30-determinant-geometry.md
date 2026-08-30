---
title: 行列式的几何意义
lesson_id: linalg-advanced/determinant-geometry
prereqs:
  - linalg-advanced/rank-nullspace
volume: 2
layer: L6
track:
  - geometry-space
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - oriented-area
applications:
  - change-of-variables
  - graphics-transforms
exits:
  - engineering
---

# 行列式的几何意义

## 1. 从一个场景开始

单位正方形面积是 1。经过一个矩阵变换后，它可能变成拉长的矩形、斜斜的平行四边形，甚至被压成一条线。行列式就是这张“面积发票”上的倍数，还附带一个方向印章。

## 2. 直觉解释

把 $2\times2$ 矩阵按列读成两个箭头：

$$A=\begin{pmatrix}a&b\\c&d\end{pmatrix}\quad\Rightarrow\quad\vec c_1=\binom{a}{c},\quad \vec c_2=\binom{b}{d}.$$

单位方块的边 $\hat\imath,\hat\jmath$ 被搬到 $\vec c_1,\vec c_2$，围成平行四边形。它的有向面积是：

$$\det(A)=a d-b c.$$

绝对值回答“面积变成几倍”；符号回答“平面有没有翻面”。

## 3. 正式定义

对 $2\times2$ 矩阵：

$$\det(A)=\begin{vmatrix}a&b\\c&d\end{vmatrix}=ad-bc.$$

| 行列式 | 几何状态 | 代数状态 |
| --- | --- | --- |
| $\det A>0$ | 定向不变，面积放大 $\det A$ 倍 | 可逆 |
| $\det A<0$ | 定向翻转，面积放大 $\lvert\det A\rvert$ 倍 | 可逆 |
| $\det A=0$ | 面积压成 0，两列共线 | 不可逆 |

三维中同样思想升级为平行六面体的有向体积。

## 4. 分步例题

设两列是 $\vec c_1=(2,0)$、$\vec c_2=(1,2)$。

1. 有向面积 $=2\cdot2-1\cdot0=4$；
2. 单位正方形面积变成 4 倍；
3. 符号为正，定向不变；
4. 因为面积没有塌成 0，两列独立，矩阵可逆。

若第二列改成 $(1,0)$，则 $\det=2\cdot0-1\cdot0=0$。两个箭头都躺在横轴上，平面被压成一条线。

## 5. 动手实验

### 实验 1：有向面积盘

```viz
{
  "type": "det-area",
  "title": "单位方块的面积发票",
  "c1": [2, 0],
  "c2": [1, 2]
}
```

拖动两列向量。绿色表示定向不变，红色表示翻面；面积读数接近 0 时，平行四边形正在塌线。

### 实验 2：同一件事的全平面视角

```viz
{
  "type": "matrix",
  "title": "网格跟着面积一起变",
  "a": 2,
  "b": 1,
  "c": 0,
  "d": 2
}
```

这里矩阵按列就是 $(2,0)$ 和 $(1,2)$。网格、小房子和行列式读数同步变化；压扁预设就是 $\det=0$ 的现场。

### 实验 3：Python 算有向面积

```python title="由两列计算行列式"
def det2(c1, c2):
    return c1[0] * c2[1] - c2[0] * c1[1]   # 有向面积公式

print(det2([2, 0], [1, 2]))
print(det2([1, 2], [1, 2]))
```

输出 `4`、`0`。第二个矩阵两列相同，所以面积必然为零。

## 6. 练习

```exercise
# @title: 练习：面积、方向与可逆性
# @check: det=3
# @check: invertible
# @hint: det=a*d-b*c；只要行列式不是 0，就写 invertible。
a = 2
b = 1
c = 1
d = 2
det = a * c - b * d
status = "singular"
print(f"det={det}")
print(status)
```

<details>
<summary>点开查看逐步解答</summary>

正确公式是 $ad-bc$：

```python
a, b, c, d = 2, 1, 1, 2
det = a * d - b * c
status = "singular" if det == 0 else "invertible"
print(f"det={det}")
print(status)
```

这里 $\det=2\cdot2-1\cdot1=3$，面积放大 3 倍且不翻面。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为行列式就是面积，不管方向。其实负号记录定向翻转；交换两列会把符号反过来。

**误区二**：你以为 $\det=0$ 只是“面积小”。它是彻底塌扁，矩阵丢失反向恢复的信息。

**误区三**：你以为行和列读法会改变行列式。数值上转置后行列式不变，但读列最能看见几何意义。

:::

## 8. 快问快答

```quiz
矩阵的行列式是 -3，它把单位面积变成多少？
- -3 倍
- 3 倍 [*]
- 0 倍
? 面积看绝对值 3；负号表示定向翻转，不代表负面积。
```

## 9. 选读：为什么 $ad-bc$ 会冒出来

<details>
<summary>选读 · 从底乘高推导</summary>

把 $\vec c_1=(a,c)$ 当底，长度为 $\sqrt{a^2+c^2}$。$\vec c_2=(b,d)$ 在垂直于 $\vec c_1$ 方向上的分量是

$$\frac{ad-bc}{\sqrt{a^2+c^2}}.$$

底乘高得到 $\lvert ad-bc\rvert$。若把 $\vec c_1$ 到 $\vec c_2$ 的转向定为正，符号就自然保留在 $ad-bc$ 里。

</details>

## 10. 下一站

行列式为 0 表示有方向被压没；不为 0 表示所有方向都被搬动。可有些方向很特别：变换后仍然留在原来那条直线上。下一课找它们。

→ [特征值与不变方向](./40-eigenvalues.md)
