---
title: 拓扑排序与 DAG
lesson_id: graph-theory/topological-dag
prereqs:
  - graph-theory/paths-connectivity
  - math-language/direct-proof
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
  - directed-acyclic-graph
  - topological-order
  - indegree
applications:
  - course-scheduling
  - build-system
exits:
  - engineering
  - data-ai
---
# 拓扑排序与 DAG

## 1. 开场钩子

课程先修、菜谱步骤和编译依赖都有同一底线：不能出现“A 依赖 B，B 又依赖 A”的死锁。无环有向图可以排成合法流水线。

## 2. 直觉解释

拓扑序把任务排成一排，保证每条箭头从左指右。入度为零的任务没有前置，可先开工；完成后拆除出边，释放新任务。

## 3. 正式定义

有向无环图简称 DAG。拓扑序是顶点排列 $v_1,\dots,v_n$，使每条有向边 $v_i\to v_j$ 都满足 $i<j$。入度为零的点可作为起点。

## 4. 分步例题

边 A→B,A→C,B→D,C→D,D→E。只有 A 初始入度为零；输出 A 后 B/C 解锁，随后 D，最后 E。两种答案是 A-B-C-D-E 和 A-C-B-D-E。

## 5. 动手实验

```python title="Kahn 算法：反复移除入度为零的点"
indegree={"A":0,"B":1,"C":1,"D":2,"E":1}
children={"A":["B","C"],"B":["D"],"C":["D"],"D":["E"],"E":[]}
order=[]
available=[name for name in indegree if indegree[name]==0]
while available:
    current=available.pop(0)
    order.append(current)
    for child in children[current]:
        indegree[child]-=1
        if indegree[child]==0:
            available.append(child)
print(order)
```

把 indegree 中 D 改成 3 再运行，D 永远无法解锁，模拟依赖冲突。

:::warning[常见误区]

**误区一**：拓扑序通常不唯一。

**误区二**：方向决定依赖是否成环，不能套用无向环判断。

**误区三**：字母顺序不一定满足箭头约束。

:::

## 6. 练习与定理快问

```exercise
# @title: 修正课程依赖入度
# @check: ['Math', 'Python', 'Graph']
# @hint: Graph 同时依赖 Math 和 Python，初始入度应为 2。
indegree={"Math":0,"Python":0,"Graph":3}
children={"Math":["Graph"],"Python":["Graph"],"Graph":[]}
order=[]
available=[name for name in indegree if indegree[name]==0]
while available:
    current=available.pop(0)
    order.append(current)
    for child in children[current]:
        indegree[child]-=1
        if indegree[child]==0:
            available.append(child)
print(order)
```

```quiz
DAG 的拓扑序一定存在吗？
- 一定存在 [*]
- 只有连通时存在
- 只有唯一根时存在
? DAG 无有向环，总能找到入度为零点并逐步删除。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

DAG 必有入度为零点，否则沿入边无限回溯会得到有向环。删除该点和出边仍保持无环，归纳可得完整排序。
</details>

## 7. 方法边界

拓扑排序处理先后约束，不做资源优化；关键路径需要在 DAG 上继续动态规划。

## 8. 下一站

如果把人和工作分成两组，怎样避免两人抢同一份工作？

→ [二分图与匹配](./80-bipartite-matching.md)
