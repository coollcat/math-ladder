---
title: 向量空间与线性映射
lesson_id: linalg-advanced/linear-maps
prereqs:
  - linalg-advanced/least-squares
volume: 2
layer: L6
track:
  - geometry-space
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - linear-map
applications:
  - graphics-transforms
  - coordinate-changes
exits:
  - engineering
  - research
---

# 向量空间与线性映射

## 1. 从一个场景开始

图形引擎能旋转、拉伸、剪切整张平面，却不能把所有点统一右移一步还自称“线性变换”。差别不在公式长短，而在一个铁律：原点必须不动，加减和数乘必须先做后做都一样。

## 2. 直觉解释

向量空间是一批可以相加和数乘的对象，例如平面上的所有箭头。线性映射 $T$ 是两个空间之间的搬运规则，只保留两种结构：

$$T(\vec u+\vec v)=T(\vec u)+T(\vec v),\qquad T(k\vec v)=kT(\vec v).$$

只要知道基向量去哪里，整个空间去哪里就确定了。

## 3. 正式定义

映射 $T:V\to W$ 线性，当且仅当对所有 $\vec u,\vec v\in V$ 和数 $k$：

$$T(\vec u+k\vec v)=T(\vec u)+kT(\vec v).$$

**核**是所有被送到零向量的输入：

$$\ker(T)=\lbrace \vec v:T(\vec v)=\vec 0\rbrace.$$

**像**是所有可能输出：

$$\operatorname{Im}(T)=\lbrace T(\vec v):\vec v\in V\rbrace.$$

二维 $2\times2$ 矩阵的像维数就是秩；核维数等于 2 减去秩。

## 4. 分步例题

取

$$A=\begin{pmatrix}2&1\\1&2\end{pmatrix},\qquad T(\vec v)=A\vec v.$$

1. $T(1,0)=(2,1)$；
2. $T(0,1)=(1,2)$；
3. 两列行列式为 3，所以像是整张平面；
4. 核只有零向量；
5. $T(1,1)=(3,3)$，$T(1,-1)=(1,-1)$。

若改为 $B=\begin{pmatrix}1&2\\2&4\end{pmatrix}$，两列共线。像是一条直线，核也是一条直线；许多不同输入会被压成同一输出。

## 5. 动手实验

### 实验 1：拖输入，看输出

```viz
{
  "type": "linear-map",
  "title": "基去向决定一切",
  "matrix": [2, 1, 1, 2]
}
```

拖动蓝色输入点。蓝/橙箭头是两个基向量的去向；紫色箭头是输入点的像，永远等于“几份蓝 + 几份橙”。

### 实验 2：核与像的秩

```viz
{
  "type": "span-space",
  "title": "列向量决定像空间",
  "v1": [2, 1],
  "v2": [1, 2]
}
```

把两列拖成共线，像从平面塌成直线；这时矩阵一定有非零核。

### 实验 3：Python 验证加法保持

```python title="先加后映射，等于先映射后加"
def T(point):
    return [2 * point[0] + point[1],
            point[0] + 2 * point[1]]

u = [1, 2]
v = [3, -1]
left = T([u[0] + v[0], u[1] + v[1]])
right = [T(u)[0] + T(v)[0], T(u)[1] + T(v)[1]]
print(left)
print(right)
```

两行都输出 `[9, 6]`。

## 6. 练习

```exercise
# @title: 练习：验证线性映射并判秩
# @check: [3, 3]
# @check: [1, -1]
# @check: rank=2
# @hint: A 的两列是 (2,1) 和 (1,2)；行列式 4-1=3。
A = [[2, 1], [1, 2]]

def T(point):
    return [A[0][0] * point[0] - A[0][1] * point[1],
            A[1][0] * point[0] + A[1][1] * point[1]]

print(T([1, 1]))
print(T([1, -1]))
print("rank=1")
```

<details>
<summary>点开查看逐步解答</summary>

第一分量应为加法：

```python
def corrected_T(point):
    return [A[0][0] * point[0] + A[0][1] * point[1],
            A[1][0] * point[0] + A[1][1] * point[1]]
```

所以：

```text
T(1,1)=[3,3]
T(1,-1)=[1,-1]
det=2*2-1*1=3
```

行列式不为零，输出 `rank=2`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为“图像像直线”就是线性。一次函数 $y=3x+5$ 的图像是直线，但平移破坏了原点保持性，不是线性映射。

**误区二**：你以为核只是一个零向量。满秩方阵的核才只有零；降秩映射会把整条线甚至整个平面压到零。

**误区三**：你以为矩阵就是线性映射本身。矩阵是线性映射在一组选定基下的坐标表；换基后同一映射会有不同矩阵。

:::

## 8. 快问快答

```quiz
T(v)=[x+1, y] 是线性映射吗？
- 是，因为它每个分量都是一次式
- 不是，因为 T(0) 不是零向量 [*]
- 无法判断
? 线性映射必须把零向量送到零向量。[0,0] 被送到 [1,0]，结构已经被平移破坏。
```

## 9. 选读：任意基下的核与像

<details>
<summary>选读 · 坐标表、核与像</summary>

矩阵不是映射本身，而是线性映射在某组基下的坐标表；换基会改变矩阵外观，但核与像这两个几何对象不变。秩-零化度的完整账本已在第 20 课建立：$\dim\ker T+\operatorname{rank}T$ 等于输入空间维数。这里的增量是把这个账本放进“任意基”的语言里，为相似变换做准备。

</details>

## 10. 下一站

线性映射可以在不同基下换“外衣”。若能换到特征基，复杂动作会变成纯伸缩。下一课正式处理相似与对角化。

→ [相似与对角化](./100-diagonalization.md)
