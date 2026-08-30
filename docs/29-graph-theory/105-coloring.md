---
title: 图着色与色数
lesson_id: graph-theory/coloring
prereqs:
  - graph-theory/planar-graphs
  - math-language/contradiction-counterexample
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - proper-coloring
  - chromatic-number
  - greedy-coloring
applications:
  - timetabling
  - register-allocation
exits:
  - engineering
  - research
---
# 图着色与色数

## 1. 开场钩子

排课时，有共同学生的两门课不能同一时段；芯片里同时活跃的两个变量不能共用寄存器。两者都在问：最少几种颜色？

## 2. 直觉解释

正常着色让相邻顶点异色。色数是最少颜色数。贪心法按顺序逐点选未被邻居使用的最小编号；顺序不好会多用颜色。

## 3. 正式定义

映射 $c:V\to\lbrace1,\dots,k\rbrace$ 是正常 k 着色，若每条边两端异色。色数是可行正常着色的最小 k。二分图色数为 2；奇环色数为 3。

## 4. 分步例题

三角形 ABC：第一点染 1，第二点染 2，第三点同时邻接两者染 3。四边形 ABCD 可交替 1,2,1,2；若加弦 AC 又含奇三角，需要 3 色。

## 5. 动手实验

```python title="贪心着色一个小图"
graph={"A":["B","C"],"B":["A","C"],"C":["A","B"],"D":["A"]}
order=["A","B","C","D"]
color={}
for vertex in order:
    forbidden=set(color[n] for n in graph[vertex] if n in color)
    color_number=1
    while color_number in forbidden:
        color_number+=1
    color[vertex]=color_number
print(color)
```

把 order 改成 D,A,B,C，D 先拿 1 色，A 因邻 D 改 2，B/C 仍需 1/3。顺序影响过程，三角形本身决定下限。

:::warning[常见误区]

**误区一**：贪心结果不总是最优。

**误区二**：平面图不一定 2 色，四色定理只保证 4 色足够。

**误区三**：这里是顶点着色，不是边着色。

:::

## 6. 练习与定理快问

```exercise
# @title: 贪心着色：只避开邻居的颜色
# @check: {'A': 1, 'B': 2, 'C': 1, 'D': 2}
# @hint: forbidden 里混进了非邻居用过的颜色——生成器里遍历的应是当前点的邻接表 graph[vertex]，而不是整个图。
graph={"A":["B"],"B":["A","C"],"C":["B"],"D":["A"]}
order=["A","B","C","D"]
color={}
for vertex in order:
    # ↓ 收集禁用色时遍历的对象不对
    forbidden=set(color[n] for n in graph if n in color)
    color_number=1
    while color_number in forbidden:
        color_number+=1
    color[vertex]=color_number
print(color)
```

```quiz
奇圈的顶点色数至少是多少？
- 2
- 3 [*]
- 4
? 奇圈不能二色交替，至少三种颜色。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

二分图可按左右组分别染 1/2，所以不超过 2 色；含奇圈则不能只用 2 色。一般图的色数下界来自最大团，上界可由任意顺序贪心的最大度加一得到。
</details>

## 7. 方法边界

精确色数在大图上很难。调度常用启发式、局部搜索或整数规划。

## 8. 下一站

把连接表变成方阵后，图会突然和线性代数接上电。

→ [邻接矩阵与图代数](./110-adjacency-algebra.md)
