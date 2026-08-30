---
title: 曲面分类直观
lesson_id: tdg/surface-classification
prereqs:
  - tdg/euler-characteristic
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
  - genus
  - orientability
applications:
  - manifold-learning
exits:
  - research
---

# 曲面分类直观

## 1. 开场钩子

球面、甜甜圈面、双孔眼镜面看起来无穷多样，但闭定向曲面其实只需要一个整数编号：环柄数。这个编号叫亏格，它把复杂外形整理成一张地铁线路图。

## 2. 直觉解释

从一个球面开始，每接一根把手，就增加一个贯穿洞，亏格加一。甜甜圈面亏格是 1；双孔曲面亏格是 2。

还有另一条岔路：可定向性。普通纸带有两侧；Mobius 带只有一侧，沿表面走一圈会翻面。闭曲面分类因此由亏格和方向性共同决定。

## 3. 正式定义

闭定向曲面按同胚分类由亏格 $g\ge 0$ 决定，其 Euler 示性数为：

$$\chi(S_g)=2-2g$$

不可定向闭曲面可用交叉帽数 $k\ge1$ 分类，Euler 示性数为 $\chi=2-k$。Mobius 带本身带边界，不是闭曲面。

## 4. 分步例题

| 曲面 | 定向 | 亏格/交叉帽 | $\chi$ |
| --- | --- | --- | --- |
| 球面 | 可定向 | $g=0$ | 2 |
| 轮胎面 | 可定向 | $g=1$ | 0 |
| 双孔轮胎面 | 可定向 | $g=2$ | -2 |
| 射影平面 | 不可定向 | $k=1$ | 1 |
| Klein 瓶 | 不可定向 | $k=2$ | 0 |

Klein 瓶和轮胎面示性数相同，但方向性不同，所以不同胚。

## 5. 动手实验

```viz
{
  "type": "plot",
  "title": "亏格预算：chi 随环柄数下降",
  "expr": "2 - 2 * x",
  "expr2": "0 * x + (2 - 2 * g)",
  "xmin": 0,
  "xmax": 4,
  "sliders": [
    { "name": "g", "min": 0, "max": 4, "step": 1, "value": 1 }
  ]
}
```

蓝线是账本 $\chi=2-2g$ 的全景：横轴是环柄数，纵轴只落在偶数刻度 2,0,-2,-4,-6。橙色水平线随滑块 `g` 移动，它与蓝线的交点横坐标就是当前选择的亏格。未来专属组件会把环柄做成可增删的三维示意盘；当前先用图像记录账本。

```python title="判断曲面类型标签"
surfaces = [
    {"name": "sphere", "orientable": True, "chi": 2},
    {"name": "torus", "orientable": True, "chi": 0},
    {"name": "projective_plane", "orientable": False, "chi": 1},
    {"name": "klein_bottle", "orientable": False, "chi": 0},
]

for item in surfaces:
    if item["orientable"]:
        label = f"oriented-chi-{item['chi']}"
    else:
        label = f"nonorientable-chi-{item['chi']}"
    print(label)
```

这段代码用示性数做粗标签，便于观察两类差异；正式分类还需验证定向性和边界。

## 6. 练习

```exercise
# @title: 练习：修正闭定向曲面的亏格
# @check: sphere-g0
# @check: torus-g1
# @check: double-torus-g2
# @hint: 用 g=(2-chi)/2，再把名称与正确 g 拼接。
items = [
    {"name": "sphere", "chi": 2},
    {"name": "torus", "chi": 0},
    {"name": "double_torus", "chi": -2},
]

for item in items:
    genus = 1
    print(f"{item['name']}-g{genus}")
```

初始代码把所有曲面都当成单孔。

<details>
<summary>点开查看逐步解答</summary>

逐项计算：

```python
items = [
    {"name": "sphere", "chi": 2},
    {"name": "torus", "chi": 0},
    {"name": "double_torus", "chi": -2},
]
for item in items:
    # // 是整除：(2-chi) 对闭定向曲面总是偶数
    genus = (2 - item["chi"]) // 2
    label = item["name"].replace("_", "-")
    print(f"{label}-g{genus}")
```

球面 $g=0$，轮胎面 $g=1$，双孔面 $g=2$。输出顺序正好是三行判题目标。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为所有洞都会让亏格加一。平面区域挖圆孔与闭曲面环柄的拓扑含义不同。

**误区二**：你以为主观看到的洞数总等于亏格。平面上的圆孔和三维贯穿环柄不是同一回事。

**误区三**：你以为示性数相同就同类型。Klein 瓶和轮胎面同为 0，但定向性把它们分开。

:::

## 8. 选读：连接和与多边形粘贴

<details>
<summary>选读 · 分类定理的构造版</summary>

两个曲面的连接和是在各自挖一个小圆盘后沿边界粘合。定向情形下有：

$$\chi(M\#N)=\chi(M)+\chi(N)-2$$

多边形模型中，把边的字母按方向粘贴，可以得到球面、轮胎面、射影平面和 Klein 瓶。分类定理说：闭曲面恰好由这些标准构造穷尽。

</details>

## 9. 下一站

曲面分类记录静态形状；基本群将记录空间里回路的缠绕方式。下一站进入代数拓扑的大门。

→ [基本群入门](./50-fundamental-group.md)
