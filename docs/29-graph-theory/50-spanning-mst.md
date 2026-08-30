---
title: 生成树与最小生成树
lesson_id: graph-theory/spanning-mst
prereqs:
  - graph-theory/trees-forests
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
  - spanning-tree
  - minimum-spanning-tree
  - kruskal-greedy
applications:
  - power-grid
  - cable-layout
exits:
  - engineering
  - optimization-control
---
# 生成树与最小生成树

## 1. 开场钩子

五个村庄要通水，不必两两铺管；只要一棵覆盖全村的管道树。若每条候选管有造价，最省钱方案就是最小生成树。

## 2. 直觉解释

生成树保留原图所有顶点，只留 n-1 条无环连通边。Kruskal 像采购员：每次挑当前不会造成环的最便宜边。

## 3. 正式定义

包含连通图所有顶点的树叫生成树；边权和最小的生成树叫最小生成树 MST。

## 4. 分步例题

边 AB=1,BC=2,AC=3,CD=4,BD=5。Kruskal 选 AB、BC，跳过 AC 因成环，再选 CD；总代价 7。

## 5. 动手实验

```python title="Kruskal：排序后贪心选不成环的边"
edges=[(1,"A","B"),(2,"B","C"),(3,"A","C"),(4,"C","D"),(5,"B","D")]
parent={"A":"A","B":"B","C":"C","D":"D"}
def find(x):              # def 定义函数；找 x 所在集合的代表
    while parent[x]!=x:
        x=parent[x]
    return x
chosen=[]
total=0
for weight,u,v in sorted(edges):   # sorted 按元组第一项升序
    ru,rv=find(u),find(v)
    if ru!=rv:
        parent[rv]=ru       # 合并两个集合
        chosen.append((weight,u,v))
        total+=weight
print(chosen,total)
```

:::warning[常见误区]

**误区一**：MST 不是把所有短边都塞进去，短边也可能成环。

**误区二**：总代价最优不等于每条边都局部最短。

**误区三**：权相同时可能存在多个 MST。

:::

## 6. 练习与定理快问

```exercise
# @title: 完成 Kruskal 总代价
# @check: [(1, 'A', 'B'), (2, 'B', 'C'), (4, 'C', 'D')]
# @check: 7
# @hint: 边没有按权重排好——Kruskal 第一步是排序（参考上面实验块的写法）；排序后权重 3 的 AC 会和 AB、BC 形成环，自动被跳过。
edges=[(3,"A","C"),(1,"A","B"),(4,"C","D"),(2,"B","C")]
parent={"A":"A","B":"B","C":"C","D":"D"}
def find(x):
    while parent[x]!=x:
        x=parent[x]
    return x
chosen=[]
total=0
for weight,u,v in edges:
    if find(u)!=find(v):
        parent[find(v)]=find(u)
        chosen.append((weight,u,v))
        total+=weight
print(chosen)
print(total)
```

```quiz
Kruskal 拒绝一条边的主要理由是什么？
- 它太长
- 它会形成环 [*]
- 它连接叶节点
? 贪心规则是在不产生环时取当前最便宜边。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

割性质：把已选集合与其余点分开时，横跨割的最小安全边必属于某个 MST。Kruskal 每步选择的正是这样的安全边。
</details>

## 7. 方法边界

MST 解决全网连通最低成本，不管任意两点间运输距离。点到点最优要进入最短路径。

## 8. 下一站

现在换目标：不是全网便宜，而是从起点到终点越快越好。

→ [最短路径](./60-shortest-path.md)
