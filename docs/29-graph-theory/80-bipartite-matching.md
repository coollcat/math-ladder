---
title: 二分图与匹配
lesson_id: graph-theory/bipartite-matching
prereqs:
  - graph-theory/topological-dag
  - math-language/sets-relations-functions
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
  - bipartite-graph
  - matching
  - augmenting-path
applications:
  - job-assignment
  - school-match
exits:
  - engineering
  - data-ai
---
# 二分图与匹配

## 1. 开场钩子

三位志愿者申请两项任务：有人全能，有人只会一项。怎么分配才能让最多人有事做？这就是匹配问题。

## 2. 直觉解释

二分图把顶点分成左右两组，边只跨组。匹配是互不共用端点的边；增广路径从未配左点走到未配右点并交替翻转，可使匹配数加一。

## 3. 正式定义

图 $G=(L\cup R,E)$ 是二分图，若 $L,R$ 不交且每条边两端分属两组。两两不共享端点的边集叫匹配；边数最多者为最大匹配。

## 4. 分步例题

左 a,b,c，右 1,2，边 a1,a2,b2,c1。最大匹配不超过右点数 2；选 a1,b2 得大小 2。剩余 c 无法再配而不拆开已有配对。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "志愿者与任务的跨组匹配",
  "left": [
    "小林",
    "小美",
    "小舟"
  ],
  "right": [
    "摄影",
    "写稿"
  ],
  "arrows": [
    [
      1,
      1
    ],
    [
      0,
      1
    ],
    [
      1,
      0
    ]
  ]
}
```

```python title="检查候选边是否是合法匹配"
pairs=[("a",1),("b",2),("c",1)]
used_left=[]
used_right=[]
ok=True
for left,right in pairs:
    if left in used_left or right in used_right:
        ok=False                 # 同一点不能出现在两条匹配边中
    used_left.append(left)
    used_right.append(right)
print(ok,len(set(used_right)))
```

:::warning[常见误区]

**误区一**：候选边多不等于最大匹配大，冲突会抢端点。

**误区二**：二分图可以有偶环，不是不能有环。

**误区三**：完美匹配还要求所有点都被占用，比最大匹配更强。

:::

## 6. 练习与定理快问

```exercise
# @title: 筛选最大合法匹配
# @check: 2
# @hint: 贪心逐条看：两端都没被占用的边才能选入。c-1 的左端空闲，但右端已被 a-1 占用——条件里漏了这一半。
pairs=[("a",1),("a",2),("b",2),("c",1)]
used_left=[]
used_right=[]
best=[]
for left,right in pairs:
    # ↓ 条件只查了左端点，共享右端点的边会被误选
    if left not in used_left:
        best.append((left,right))
        used_left.append(left)
        used_right.append(right)
print(len(best))
```

```quiz
二分图的边应该怎样连接？
- 只在组内连接
- 只跨越两组 [*]
- 组内和跨组都可以
? 二分性的核心限制是所有边横跨两侧。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

若存在从未配左点到未配右点的交错路，翻转路上匹配状态会使匹配数加一；不存在增广路时无法扩大，因此当前为最大匹配。
</details>

## 7. 方法边界

手工增广建立直觉；大规模匹配需要 Hopcroft-Karp 等批量寻找增广路的算法。

## 8. 下一站

一笔画和周游城市看起来相似，难度却天差地别。

→ [Euler 图与 Hamilton 问题](./90-euler-hamilton.md)
