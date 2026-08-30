---
title: 图的定义与现实建模
lesson_id: graph-theory/graph-definition
prereqs:
  - python-tools/conventions
  - math-language/sets-relations-functions
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - vertex
  - edge
  - adjacency-list
applications:
  - social-network
  - transport-network
exits:
  - life-reason
  - engineering
---
# 图的定义与现实建模

## 1. 开场钩子

班级里的“谁认识谁”、地图上的“哪两个城市通公路”、课程表里的“哪门课是前置”，都能压成同一种记录：对象加连线。

## 2. 直觉解释

顶点是“东西”，边是“关系”。图不关心城市画在左边还是右边，也不关心线画得弯不弯，只关心两端是谁。

## 3. 正式定义

简单无向图是二元组 $G=(V,E)$：$V$ 是有限顶点集；$E$ 是由 $V$ 中两个不同元素组成的无序对集合。若 $\lbrace u,v\rbrace\in E$，就说 $u$ 与 $v$ 相邻。

## 4. 分步例题

设 $V=\lbrace A,B,C,D\rbrace$，$E=\lbrace \lbrace A,B\rbrace,\lbrace B,C\rbrace,\lbrace C,D\rbrace\rbrace$。先列顶点，再写关系，检查无自环与重复边，得到链 $A-B-C-D$。A 认识 B 不代表 A 直接认识 C。

## 5. 动手实验

### 实验 0（viz）：图建造台——V 与 E 随手搭

```viz
{
  "type": "graph-builder",
  "title": "把 §4 的链 A—B—C—D 拆开重装",
  "nodes": ["A", "B", "C", "D"],
  "edges": [["A", "B"], ["B", "C"], ["C", "D"]],
  "mode": "undirected"
}
```

怎么玩：空白处按住拖出**新顶点**；先点一个顶点、再点另一个，两点之间加边，这对顶点再点一次就删边；悬停任意顶点，它的邻接边与邻居会加亮。试着复刻 §4 的链、再造一个环——你会亲眼看到「顶点位置不是图的一部分」：拖得再乱，$V$ 和 $E$ 没变，图就没变。

```viz
{
  "type": "set-mapper",
  "title": "把人和活动的关系看成箭头",
  "left": [
    "小明",
    "小红",
    "小林"
  ],
  "right": [
    "篮球",
    "围棋"
  ],
  "arrows": [
    [
      1,
      0
    ],
    [
      0,
      1
    ],
    [
      1,
      1
    ]
  ]
}
```

点击中间圆点增删箭头。这个二部关系还不是普通友谊图，但说明同一套“对象+连接”语言能承载不同场景。

```python title="用邻接表保存一张小图"
graph = {
    "A": ["B"],        # 字典：键是顶点，值是邻居列表
    "B": ["A", "C"],
    "C": ["B", "D"],
    "D": ["C"]
}
for vertex in graph:
    neighbors = graph[vertex]   # 取出这个顶点的邻居表
    print(vertex, "->", neighbors)
```

:::warning[常见误区]

**误区一**：顶点位置不是图的一部分。

**误区二**：边可以弯曲，仍代表同一连接。

**误区三**：无向边默认对称；有向关系必须另说方向。

:::

## 6. 练习与定理快问

```exercise
# @title: 补全邻接表
# @check: A -> ['B', 'D']
# @check: D -> ['A', 'C']
# @hint: 无向边要同时登记到两个端点。
graph={"A":["B"],"B":["A","C"],"C":["B","D"],"D":[]}
print("A ->",graph["A"])
print("D ->",graph["D"])
```

```quiz
简单无向图中，把 A 连接到 A 的自环表示什么？
- 一条合法自环
- 不是简单无向图的合法边 [*]
- 一条长度为二的路径
? 简单无向图的边连接两个不同顶点。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

邻接表为每个顶点保存邻居清单；写入时双向登记，查询一端清单即可判断相邻。
</details>

## 7. 方法边界

邻接表省空间、适合稀疏网络；频繁判断任意两点是否相连时邻接矩阵更快。

## 8. 下一站

有了对象和连线，最自然的第一个统计量就是每个点连出了几条线。

→ [度、握手定理与序列](./20-degree-handshake.md)
