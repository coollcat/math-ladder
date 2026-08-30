---
title: 平面图初步
lesson_id: graph-theory/planar-graphs
prereqs:
  - graph-theory/euler-hamilton
  - geometry/pythagoras
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
  - planar-embedding
  - face
  - euler-formula-planar
applications:
  - map-drawing
  - circuit-layout
exits:
  - engineering
  - research
---
# 平面图初步

## 1. 开场钩子

地铁图为了美观常常弯折，但工程师真正担心的是能不能不交叉。平面图研究的就是这种“摊平能力”。

## 2. 直觉解释

平面嵌入把顶点放在平面、边画成不交叉曲线。边把平面划分出的连续区域叫面，外部也算一面。

## 3. 正式定义

若图可嵌入平面且边不相交，则称平面图。连通平面嵌入满足 $V-E+F=2$。简单连通平面图在 $V\ge3$ 时有 $E\le3V-6$。

## 4. 分步例题

三角形 V=3,E=3,F=2，公式成立。K5 若平面会要求 10≤9，矛盾，所以非平面。注意必要条件不满足一定非平面，满足未必平面。

## 5. 动手实验

```viz
{
  "type": "plot",
  "expr": "3*x - 6",
  "expr2": "m",
  "label": "E上限",
  "label2": "边数m",
  "xmin": 3,
  "xmax": 12,
  "sliders": [
    {
      "name": "m",
      "min": 0,
      "max": 36,
      "step": 1,
      "value": 9
    }
  ]
}
```

蓝线是必要条件允许的边数上限 $3V-6$，橙色虚线是实际边数 $m$。拖动滑块改变 $m$：横线一旦顶到蓝线上方（如 $V=5,m=10$），图必非平面；横线在下方只说明"暂未违规"。

```python title="检查 V,E 是否违反平面必要条件"
vertices=5
edge_count=10
limit=3*vertices-6
verdict="bound-ok-not-proof"
if edge_count>limit:
    verdict="nonplanar-by-bound"
print(limit,verdict)
```

:::warning[常见误区]

**误区一**：画出交叉不代表不是平面图，可能重新布局后不交叉。

**误区二**：外部区域也是一个面。

**误区三**：E≤3V-6 只是必要条件，不是充分判定。

:::

## 6. 练习与定理快问

```exercise
# @title: 用边数上限筛掉非平面图
# @check: K5 9 nonplanar-by-bound
# @check: K3,3 12 bound-ok-not-proof
# @hint: 上限公式是 E ≤ 3V − 6（代码里写 3*v-6）。注意 K3,3 通过筛选仍可能非平面——必要条件不是判定书。
cases=[["K5",5,10],["K3,3",6,9]]
for name,v,e in cases:
    limit=2*v          # ← 上限公式不对，正文里有一条更紧的
    verdict="bound-ok-not-proof"
    if e>limit:
        verdict="nonplanar-by-bound"
    print(name,limit,verdict)
```

```quiz
连通平面嵌入的 V,E,F 满足什么公式？
- V-E+F=0
- V-E+F=2 [*]
- V+E-F=1
? 外部区域也计入面数。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

每个面至少 3 条边界，每条边至多被两个面共享，所以 3F≤2E。代入 F=2-V+E 得 E≤3V-6。
</details>

## 7. 方法边界

平面性只是第一步；实际布线还涉及交叉最少、面积和层。下一课用颜色区分冲突。

## 8. 下一站

给地图上色时相邻地区不能同色，本质上是给顶点分配标签。

→ [图着色](./105-coloring.md)
