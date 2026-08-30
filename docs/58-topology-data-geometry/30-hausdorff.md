---
title: Hausdorff 与分离条件选讲
lesson_id: tdg/hausdorff
prereqs:
  - tdg/compactness
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
  - hausdorff-space
applications:
  - limit-uniqueness
exits:
  - research
---

# Hausdorff 与分离条件选讲

## 1. 开场钩子

两辆公交车若停在同一坐标，导航就很难说“到达哪一辆”。Hausdorff 条件要求任意两个不同点都能被互不重叠的小邻域分开；它让极限、收敛和唯一性变得可靠。

## 2. 直觉解释

在普通地图上任取两个不同地点，总能画两个不相交的圆圈分别罩住它们。这就是最常用的分离直觉。

但拓扑空间不必如此。有些人为构造会把两个“不同名字”的点永远绑在同一批开集里，使任何开集都分不开它们。这样的空间仍可定义，但分析性质会很奇怪。

## 3. 正式定义

空间 $X$ 称为 Hausdorff 空间，若任意 $p\neq q$ 都存在开集 $U,V$ 使：

$$p\in U,\quad q\in V,\quad U\cap V=\varnothing$$

更强的正则性和正规性还会把点与闭集、两个闭集分开。度量空间都是 Hausdorff 空间：取半径为距离三分之一的两个开球即可。

## 4. 分步例题

**例 A**：实数轴是 Hausdorff。取 $p=0,q=1$，可选 $U=(-0.2,0.2)$，$V=(0.8,1.2)$。

**例 B**：若把两个点强行规定为不可分的“重影点”，则任何包含一个点的开集也包含另一个。它们不满足定义中不相交的要求。

**例 C**：在 Hausdorff 空间中，一个序列若有极限 $L_1,L_2$，取两个不相交邻域后，序列尾部最终必须同时落在两者内，矛盾；因此 $L_1=L_2$。

## 5. 动手实验

```viz
{
  "type": "numberline",
  "title": "两点的有向差",
  "min": -2,
  "max": 4,
  "op": "-",
  "sliders": [
    { "name": "a", "min": -1, "max": 3, "step": 0.1, "value": 0 },
    { "name": "b", "min": -1, "max": 3, "step": 0.1, "value": 2 }
  ]
}
```

拖动两点时，数轴显示有向差 `a-b`；真正的距离是它的绝对值。只要两点不相等，就能各取小于一半距离的小邻域。若允许两点完全重叠，分离就会失败。

```python title="计算两个不相交开区间"
def separate(p, q):
    middle = (p + q) / 2
    return (p - 1, middle), (middle, q + 1)

left, right = separate(0, 2)
print(left)
print(right)
```

这里用元组表示区间，函数一次返回两个值。

## 6. 练习

```exercise
# @title: 练习：判断能否分离
# @check: True
# @check: False
# @hint: 只有 p 和 q 是不同数值时才能找到中间分界。
pairs = [(0, 2), (1, 1)]

for p, q in pairs:
    can_separate = abs(p - q) >= 0
    print(can_separate)
```

<details>
<summary>点开查看逐步解答</summary>

Hausdorff 分离要求两个点是不同的：

```python
pairs = [(0, 2), (1, 1)]
for p, q in pairs:
    can_separate = p != q
    print(can_separate)
```

`(0,2)` 可分，输出 `True`；`(1,1)` 是同一个点，输出 `False`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为所有拓扑空间都像欧氏空间。没有度量的抽象空间可能不满足 Hausdorff。

**误区二**：你以为分离条件只是技术洁癖。它保证极限唯一，并支撑许多连续映射定理。

**误区三**：你以为紧致一定自动 Hausdorff。一般空间中这是独立条件；某些定理会同时要求二者。

:::

## 8. 选读：分离层级

<details>
<summary>选读 · 从 T1 到正规</summary>

T1 要求每个单点集是闭集；Hausdorff 又叫 T2，强于 T1。正则空间能把点与不含它的闭集分开；正规空间能分离两个不相交闭集。度量空间同时满足这些条件。

分离条件不是越高越好，验证成本和结构限制也随之增加。建模时应选择刚好支撑所需定理的层级。

</details>

## 9. 下一站

现在可以正式回答咖啡杯与甜甜圈的问题：什么叫做“同一块橡皮泥”。下一站讲同胚与橡皮几何。

→ [同胚与橡皮几何](./35-homeomorphism.md)
