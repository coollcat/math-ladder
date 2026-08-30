---
title: Euler 图与 Hamilton 问题
lesson_id: graph-theory/euler-hamilton
prereqs:
  - graph-theory/degree-handshake
  - graph-theory/paths-connectivity
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
  - euler-circuit
  - hamilton-cycle
  - np-complete-intuition
applications:
  - route-inspection
  - travel-planning
exits:
  - research
  - engineering
---
# Euler 图与 Hamilton 问题

## 1. 开场钩子

七桥问题的规则是每座桥走一次；旅行商的规则是每个城市到一次。前者有漂亮的度数判据，后者至今没有已知高效通用解。

## 2. 直觉解释

Euler 回路关心边：中间点每次都要一进一出，所以奇度点不能多。Hamilton 回路关心点：即使度数很高，也可能找不到恰好访问所有点一圈的路线。

## 3. 正式定义

经过每条边恰好一次的闭通路叫 Euler 回路；连通图中存在当且仅当所有顶点度为偶。经过每个顶点恰好一次的回路叫 Hamilton 回路；一般判定是 NP 完全问题。

## 4. 分步例题

正方形 ABCD 有 Euler 回路 A-B-C-D-A。加入对角线 AC 后 A/C 变 3 度、B/D 仍 2 度，只有两个奇度点，因此有 Euler 路而无 Euler 回路；同一图仍有 Hamilton 回路 ABCDA。

## 5. 动手实验

正方形 ABCD 的 Hamilton 回路有多少条？先按排列来数：给 4 个城市排访问顺序，共 $P(4,4)=24$ 种。

```viz
{
  "type": "counting",
  "n": 4,
  "k": 4
}
```

但回路首尾相接：换个起点出发是同一条回路，反着走一遍也是——得从这 24 种排列里除掉此类重复。Hamilton 回路的计数比排列更挑剔。

```python title="按度数判断 Euler 回路可行性"
edges=[["A","B"],["B","C"],["C","D"],["D","A"],["A","C"]]
degree={"A":0,"B":0,"C":0,"D":0}
for u,v in edges:
    degree[u]+=1
    degree[v]+=1
odd=[name for name,value in degree.items() if value%2==1]
print(degree)
print("euler-circuit:",len(odd)==0)
```

:::warning[常见误区]

**误区一**：只有 Euler 有完整度数刻画，Hamilton 不能只看度数。

**误区二**：Hamilton 回路只要求所有点各一次，不包含所有边。

**误区三**：“NP 完全”不是说永远解不了，而是目前不知道对所有输入的高效通用算法。

:::

## 6. 练习与定理快问

```exercise
# @title: 修正奇度诊断
# @check: ['A', 'C']
# @check: False
# @hint: 对角线让 A 和 C 各增加一度。
edges=[["A","B"],["B","C"],["C","D"],["D","A"],["A","C"]]
degree={"A":0,"B":0,"C":0,"D":0}
for u,v in edges:
    degree[u]+=1
    degree[v]+=1
odd=[name for name,value in degree.items() if value%2==0]
possible=len(odd)==0
print(odd)
print(possible)
```

```quiz
连通图存在 Euler 回路的核心条件是什么？
- 所有度数相等
- 所有顶点度数为偶 [*]
- 恰有两个奇度点
? 中间点每次进出消耗两度，所以必须偶度。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

必要性来自每次进出贡献两度。充分性可由 Hierholzer 算法说明：从剩余边构造小回路，并在共享顶点处拼接成大回路。
</details>

## 7. 方法边界

小图可暴力枚举 Hamilton 回路；大图需要启发式、近似算法或特殊结构。下一课回到有向图，把连通性的方向版补齐。

## 8. 下一站

方向改写了"连通"二字：单向街的世界里，谁和谁互相够得着？

→ [强连通分量：有向图的抱团地图](./95-strong-connectivity.md)
