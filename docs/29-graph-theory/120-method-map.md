---
title: 图论方法地图
lesson_id: graph-theory/method-map
prereqs:
  - graph-theory/random-walk-preview
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
  - modeling-checklist
  - algorithm-selection
  - graph-thinking
applications:
  - project-review
  - system-design
exits:
  - life-reason
  - engineering
---
# 图论方法地图

## 1. 开场钩子

学完一章容易留下十几把工具，却不知什么时候拔哪一把。这一课把图论压缩成三问：对象是谁？约束在哪？目标是什么？

## 2. 直觉解释

先把真实场景翻译成顶点和边：人、地点、任务可为点；相识、道路、依赖可为边。再看方向、权重和目标函数，最后匹配算法族。

## 3. 正式定义

建模流程：明确顶点集合；明确边及方向；决定权重或标签；选择目标函数；匹配算法族；用小例验证输出含义。

## 4. 分步例题

外卖配送用 Dijkstra 找最快路线；课程排期用拓扑排序处理先修；社团招新用二分图匹配分配岗位。同一批对象，目标不同，工具就不同。

## 5. 动手实验

```python title="根据特征推荐图论方法"
def recommend(directed,weighted,target):   # def 定义可复用函数
    if target=="order":
        return "topological-sort"
    if target=="match":
        return "bipartite-matching"
    if weighted:
        return "dijkstra-or-mst"
    return "bfs-connectivity"
print(recommend(False,True,"connect"))
print(recommend(True,False,"order"))
print(recommend(False,True,"assign"))
```

:::warning[常见误区]

**误区一**：不要先选算法再硬凑模型。

**误区二**：依赖和网页链接有方向。

**误区三**：小图可直接枚举验证，不必追求复杂算法。

:::

## 6. 练习与定理快问

```exercise
# @title: 完成方法推荐器
# @check: bfs-connectivity
# @check: dijkstra-or-mst
# @check: topological-sort
# @hint: order 优先返回拓扑排序；带权连通再看成本结构。
def recommend(directed,weighted,target):
    if target=="order":
        return "wrong"
    if weighted:
        return "wrong"
    return "bfs-connectivity"
print(recommend(False,False,"connect"))
print(recommend(False,True,"connect"))
print(recommend(True,False,"order"))
```

```quiz
建模时应当最先确定什么？
- 使用哪种编程语言
- 顶点、边、方向与目标 [*]
- 算法名
? 工具由结构和目标决定；语言只是实现细节。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

这张地图不是定理证明，而是决策表：结构判断看树、二分和平面；度量目标看度、路径和匹配；动态过程看遍历和游走。
</details>

## 7. 方法边界

图论还有流、割、谱方法、超图等未展开主题；后续算法章会把遍历与复杂度讲得更严格。

## 8. 下一站

第 29 章到这里形成完整草案；下一步是实现专属交互组件并接入图谱与进度台账。

→ [第 29 章 · 图论](./index.md)
