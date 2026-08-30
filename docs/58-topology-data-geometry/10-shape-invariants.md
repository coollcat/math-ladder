---
title: 形状在不撕开不粘合下的不变性
lesson_id: tdg/shape-invariants
prereqs:
  - math-language/sets-relations-functions
volume: 5
layer: L8
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - topological-invariant
applications:
  - shape-recognition
exits:
  - research
---

# 形状在不撕开不粘合下的不变性

## 1. 开场钩子

咖啡杯和甜甜圈看起来完全不同，但陶艺家会说它们都有一根“洞”。只要允许慢慢捏橡皮泥，杯柄能变成甜甜圈的环身；洞既没有被新封住，也没有凭空出现。

## 2. 直觉解释

拓扑先忽略长度、角度和曲率，只问哪些性质在连续变形中稳定。允许拉伸、弯曲、压缩，但不许撕开，也不许把不同位置粘合。

于是“有几个洞”“是否连成一块”“边界怎样排列”比边长更顽固。地铁网可以拉长压扁，只要站点连接关系不断开也不合并，它仍然是同一张网。

## 3. 正式定义

设 $X$ 是一个集合，$d(x,y)$ 表示两点距离。一个变换 $f:X\to Y$ 叫连续，大致意思是 $x$ 靠近 $x'$ 时，$f(x)$ 也靠近 $f(x')$。若还能用逆变换 $f^{-1}$ 连续地走回去，就叫同胚。

若性质 $P$ 满足“$X$ 有 $P$ 则所有与 $X$ 同胚的空间也有 $P$”，就称 $P$ 是拓扑不变量。连通块数、洞数、边界分支数都是候选不变量。

## 4. 分步例题

比较四个对象：

| 对象 | 可否变成圆盘 | 关键原因 |
| --- | --- | --- |
| 实心圆盘 | 可以 | 无洞、单块、有圆形边界 |
| 方形纸片 | 可以 | 拉伸圆滑即可 |
| 圆环 | 不可以 | 中间有贯穿洞 |
| 两块分离纸片 | 不可以 | 有两个连通块 |

前两者在橡皮几何意义下相同；后两者的障碍不是尺寸，而是不变结构。

## 5. 动手实验

### 实验 1：拖动数据云，观察连通块

```viz
{
  "type": "fit",
  "n": 8
}
```

把点拖成两团时，直线拟合会变得很不稳；这提醒我们：先问数据是否连成一块，再谈趋势线。这里的每个点都能沿横轴和纵轴移动，相当于一个小型参数平面。

### 实验 2：Python 数连通组

```python title="按距离阈值数连通组"
points = [[0, 0], [0.2, 0.1], [5, 5], [5.1, 5.2]]
threshold = 1.0   # threshold：判断“相邻”的距离上限
groups = []       # groups：保存已经分好的组，每组是一个列表

for point in points:
    near = []     # near：收集与当前点距离不超过阈值的旧组编号
    for group_id, group in enumerate(groups):   # enumerate 同时给编号和内容
        center = group[0]
        distance = ((point[0] - center[0]) ** 2 + (point[1] - center[1]) ** 2) ** 0.5
        if distance <= threshold:
            near.append(group_id)   # append 把编号加到列表末尾
    if len(near) == 0:
        groups.append([point])
    else:
        first = near[0]
        groups[first].append(point)
        print("merge", near)        # merge：多个旧组本应合并；这里先显示提示

print(groups)
```

这个简化版故意保留一个待修问题：当阈值同时触到两组时，只把点放进第一组，还没有真正合并两组。练习会要求你补上这一步。

## 6. 练习

```exercise
# @title: 练习：修复并统计连通组
# @check: 2
# @hint: 当 near 里有多于一个编号时，要把其余组的点并入第一组，并删除被合并的组。
points = [[0, 0], [1.8, 0], [0.9, 0], [9, 9]]
threshold = 1.0
groups = []

for point in points:
    near = []
    for group_id, group in enumerate(groups):
        center = group[0]
        distance = ((point[0] - center[0]) ** 2 + (point[1] - center[1]) ** 2) ** 0.5
        if distance <= threshold:
            near.append(group_id)
    if len(near) == 0:
        groups.append([point])
    else:
        first = near[0]
        groups[first].append(point)
        # 还没有处理 near 中除 first 以外的组

print(len(groups))
```

<details>
<summary>点开查看逐步解答</summary>

从后往前合并最安全，因为删除编号不会影响还没处理的较大编号：

```python
points = [[0, 0], [1.8, 0], [0.9, 0], [9, 9]]
threshold = 1.0
groups = []
for point in points:
    near = []
    for group_id, group in enumerate(groups):
        center = group[0]
        distance = ((point[0] - center[0]) ** 2 + (point[1] - center[1]) ** 2) ** 0.5
        if distance <= threshold:
            near.append(group_id)
    if not near:
        groups.append([point])
    else:
        first = near[0]
        groups[first].append(point)
        for other in reversed(near):
            if other != first:
                groups[first].extend(groups[other])
                groups.pop(other)
print(len(groups))
```

`reversed` 表示倒序遍历，`extend` 把一组点接到另一组后面，`pop(other)` 删除指定位置的组。中间的点 [0.9, 0] 同时靠近左右两团的中心（距离都是 0.9）；只并入第一组会让 [1.8, 0] 所在的团漏并。正确合并后，左侧三个点连成一组，右上角的孤立点 [9, 9] 是另一组，所以输出 `2`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为形状相同就是全等。拓扑同胚允许拉伸弯曲，不需要保持长度和角度。

**误区二**：你以为“看起来有洞”就够了。实心球面挖一个小坑没有贯穿洞；轮胎面才有贯穿洞。

**误区三**：你以为数据聚类结果就是真实拓扑。阈值不同，连通块数可能改变，必须报告阈值和敏感性。

:::

## 8. 选读：为什么不变量像指纹

<details>
<summary>选读 · 单个指纹不够，多个指纹合用</summary>

不变量的用途常是反证：若两个空间的某个不变量不同，它们一定不同胚。例如一块有 1 个连通分支，两块有 2 个，因此不可能通过连续变形互相转化。

反过来，若干不变量相等也不能保证同胚。就像两张照片颜色分布相同，不代表拍的是同一个物体。更强的完整不变量需要代数拓扑工具，本章后半章会给出入门版。

</details>

## 9. 下一站

要严格定义“连续变形”和“洞”，需要先把“靠近”本身写成公理。下一站是拓扑学的地基：开集与拓扑空间。

→ [开集与拓扑空间](./15-open-sets.md)
