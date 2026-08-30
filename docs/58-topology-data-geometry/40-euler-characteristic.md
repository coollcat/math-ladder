---
title: Euler 示性数
lesson_id: tdg/euler-characteristic
prereqs:
  - tdg/homeomorphism
volume: 5
layer: L8
track:
  - geometry-space
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - euler-characteristic
applications:
  - mesh-analysis
exits:
  - engineering
---

# Euler 示性数

## 1. 开场钩子

足球、立方体和金字塔外观差异很大，但如果只看顶点、棱和面怎样拼合，它们的账本可能给出同一个数。这个数不怕拉伸压缩，却会被洞改变，它就是 Euler 示性数。

## 2. 直觉解释

对一个由顶点、边和面组成的封闭分割，计算 $\chi=V-E+F$。球面上无论怎样细分，只要分割规则良好，结果都是 2。轮胎面有一个贯穿环柄，结果变成 0。每增加一个柄，示性数减 2。

这不是巧合，而是拓扑不变量：合法重分面时，顶点、边、面的增减会互相抵消。

## 3. 正式定义

对有限单纯复形 $K$，令 $V,E,F$ 分别是顶点数、边数和二维面数，则：

$$\chi(K)=V-E+F=c_0-c_1+c_2$$

更一般地按维度交替求和。若闭定向曲面有 $g$ 个环柄，则 $\chi=2-2g$。

## 4. 分步例题

四面体有 4 个顶点、6 条边、4 个面：

1. $V=4$；
2. $E=6$；
3. $F=4$；
4. $\chi=4-6+4=2$。

四棱锥有 5 个顶点、8 条边、5 个面：

1. $V=5$；
2. $E=8$；
3. $F=5$；
4. $\chi=5-8+5=2$。

两者都同胚于球面，所以账本一致。

## 5. 动手实验

```viz
{
  "type": "plot",
  "title": "三角形复形的 Euler 账本",
  "expr": "3 - 3 + f",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "f", "min": 0, "max": 1, "step": 1, "value": 0 }
  ]
}
```

滑块 `f=0` 表示空心三角形：3 个顶点、3 条边、0 个面，账本是 0；切到 `f=1` 表示填入三角形面，账本变成 1。顶点、边和面的增减最终汇入同一个不变量。

```python title="给几个网格算 Euler 示性数"
shapes = {
    "tetrahedron": {"vertices": 4, "edges": 6, "faces": 4},
    "square_pyramid": {"vertices": 5, "edges": 8, "faces": 5},
    "triangular_prism": {"vertices": 6, "edges": 9, "faces": 5},
    "torus_mesh": {"vertices": 9, "edges": 27, "faces": 18},
}

for name, counts in shapes.items():
    chi = counts["vertices"] - counts["edges"] + counts["faces"]
    print(f"{name}: {chi}")
```

前三个都应输出 2，表示球面型；示例轮胎网格输出 0，表示一个环柄。

## 6. 练习

```exercise
# @title: 练习：从示性数推环柄数
# @check: 1
# @check: 2
# @check: 3
# @hint: 使用公式 g = (2 - chi) / 2，并检查是否能整除。
chi_values = [0, -2, -4]

for chi in chi_values:
    genus = 0
    print(genus)
```

初始代码把所有曲面都当成球面。

<details>
<summary>点开查看逐步解答</summary>

闭定向曲面满足 $\chi=2-2g$，移项得：

```python
chi_values = [0, -2, -4]
for chi in chi_values:
    # // 是整除：chi 为偶数时 g 才是整数，否则该曲面不是闭定向曲面
    genus = (2 - chi) // 2
    print(genus)
```

本练习从轮胎面开始：$\chi=0$ 时 $g=1$；$\chi=-2$ 时 $g=2$；$\chi=-4$ 时 $g=3$。所以三行输出依次为 1、2、3。

</details>

```quiz
轮胎面的 Euler 示性数是多少？
- 2
- 1
- 0 [*]
? 一个环柄使球面的 2 减少 2，所以结果是 0。
```

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为任意网格都能直接算。网格必须有合法拼接关系，不能有重复顶点、破洞或错误粘合。

**误区二**：你以为主观看到的洞数总等于亏格。平面上的圆孔和三维贯穿环柄不是同一回事。

**误区三**：你以为示性数相同就能断定同胚。它只是一个不变量；还需方向性或其他代数工具辅助分类。

:::

## 8. 选读：为什么重分不改账本

<details>
<summary>选读 · 加一个顶点时的抵消</summary>

在一个三角形内部加一个顶点，并把它连到三个旧顶点，就把 1 个面分成 3 个面。变化量为顶点加 1，边加 3，面净加 2：

$$+1-3+2=0$$

其他局部操作同样满足抵消规律，因此 $\chi$ 在合法重分下稳定。

</details>

## 9. 下一站

Euler 示性数给出总量，但还不描述所有洞的类型。下一站用它进入闭曲面的分类地图。

→ [曲面分类直观](./45-surface-classification.md)
