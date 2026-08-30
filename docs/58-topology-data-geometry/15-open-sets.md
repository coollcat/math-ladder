---
title: 开集与拓扑空间
lesson_id: tdg/open-sets
prereqs:
  - tdg/shape-invariants
volume: 5
layer: L8
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - open-set
  - topological-space
applications:
  - neighborhood-analysis
exits:
  - research
---

# 开集与拓扑空间

## 1. 开场钩子

地铁站周边 500 米服务圈，如果恰好把边界上的住户也算进去，就会遇到争议：站在边界的人算不算“周边”？拓扑学常用办法是把边界留给别人，只收内部点，这就是开集的雏形。

## 2. 直觉解释

开集是一批没有边界争议的点：只要你在集合里，就能向四周挪一小步仍留在集合里。实数轴上的区间 $(0,1)$ 是开的；端点 0 和 1 不在里面，所以不用回答“端点是否算入”。

拓扑空间更进一步：先声明哪些子集叫“开集”，再让这些声明遵守三条规则。距离可以被丢掉，“靠近”由开集系统直接定义。

## 3. 正式定义

设 $X$ 是集合，$\tau$ 是 $X$ 的一些子集组成的族。若满足：

$$\varnothing\in\tau,\quad X\in\tau,\quad \tau\text{ 对任意并封闭，且对有限交封闭}$$

则称 $\tau$ 是 $X$ 上的拓扑，$(X,\tau)$ 称为拓扑空间。$\tau$ 的元素叫开集。

点 $p$ 的邻域是包含某个含 $p$ 开集的集合。映射连续的简洁定义是：每个目标开集的原像是开集。

## 4. 分步例题

取 $X=\mathbb R$，普通开区间生成的拓扑。

1. $(0,1)$ 是开集，因为任取 $x\in(0,1)$，令半径 $\varepsilon=\frac12\min(x,1-x)>0$，则 $(x-\varepsilon,x+\varepsilon)\subset(0,1)$；
2. $[0,1]$ 不是开集，点 0 在其中，但任何向左的小步都会离开它；
3. $(0,0.2)\cup(0.5,1)$ 仍是开集，因为任意个开集的并可并；
4. $(0,0.5)\cap(0.2,1)=(0.2,0.5)$ 仍是开集；无限交可能失败，例如 $\bigcap_{n=1}^{\infty}(-1/n,1/n)=\lbrace 0\rbrace$ 不是开集。

## 5. 动手实验

### 实验 1：用图像看“内点带”

```viz
{
  "type": "plot",
  "title": "以 (0.5, 1) 为中心的开圆盘边界",
  "expr": "sqrt(r^2 - (x - 0.5)^2) + 1",
  "expr2": "-sqrt(r^2 - (x - 0.5)^2) + 1",
  "xmin": -0.2,
  "xmax": 1.2,
  "sliders": [
    { "name": "r", "min": 0.1, "max": 0.5, "step": 0.01, "value": 0.25 }
  ]
}
```

拖动滑块 `r` 就是在改这枚"邻域硬币"的半径：只要点严格落在圆盘内部，总存在一个更小的同心圆盘把它整个装下——这正是内点的定义。端点争议被排除在集合之外，开集因此没有边界归属问题。

```python title="检查一维点是否是内点"
def is_interior(point, low, high):
    # def 定义函数；返回布尔值 True/False
    return low < point < high

samples = [(0.01, 0, 1), (0.00, 0, 1), (0.99, 0, 1), (1.00, 0, 1)]
for value, low, high in samples:
    print(value, is_interior(value, low, high))
```

输出显示 0.01 和 0.99 是内点，而 0 和 1 不是。开区间的端点被刻意排除，正是为了避免边界归属争议。

```quiz
下列哪个说法符合开集公理？
- 任意多个开集相交仍是开集
- 有限个开集的交集仍是开集 [*]
- 一个集合只能配一种拓扑
? 拓扑只保证任意并和有限交封闭；无限交可能缩成一点。同一集合也允许声明不同拓扑。
```

## 6. 练习

```exercise
# @title: 练习：找出不属于开区间的点
# @check: boundary
# @check: ['0', '1']
# @hint: 开区间要求严格不等式 low<x<high；把端点误判成内部，就会漏掉边界。
samples = [0, 0.001, 0.999, 1]
low = 0
high = 1

outside = []
for value in samples:
    inside = low <= value <= high
    if not inside:
        outside.append(str(value))

print("boundary")
print(outside)
```

<details>
<summary>点开查看逐步解答</summary>

正确条件是严格不等式：

```python
samples = [0, 0.001, 0.999, 1]
low = 0
high = 1
outside = []
for value in samples:
    inside = low < value < high
    if not inside:
        outside.append(str(value))
print("boundary")
print(outside)
```

`not` 表示逻辑非。这样 0 和 1 进入 `outside`，打印为 `['0', '1']`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为“开”是集合的天然属性。同一个 $X$ 可配多种拓扑，开与否取决于声明的 $\tau$。

**误区二**：你以为开集不能有边界形状。开圆盘当然有几何边缘，但边缘点不属于开集本身。

**误区三**：你以为任意多个开集相交还是开。拓扑只保证有限交；无限交可能缩成一个点甚至空集。

:::

## 8. 选读：闭集与补集

<details>
<summary>选读 · 为什么闭集也重要</summary>

$F\subset X$ 称为闭集，当且仅当它的补集 $X\setminus F$ 是开集。于是闭集对任意交和有限并封闭。开与闭并不互斥：在普通实数轴拓扑中，$\mathbb R$ 和 $\varnothing$ 既开又闭。

极限点、收敛和紧致性常用闭集表达。后续课程的“有界闭集”直觉会从这里长出来。

</details>

## 9. 下一站

有了开集，就可以精确问一个空间会不会断成几块。下一站研究连通性与道路连通。

→ [连通性与道路连通](./20-connectedness.md)
