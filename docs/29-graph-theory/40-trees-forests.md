---
title: 树与森林
lesson_id: graph-theory/trees-forests
prereqs:
  - graph-theory/paths-connectivity
  - math-language/induction-advanced
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
  - tree
  - forest
  - leaf
  - tree-edge-count
applications:
  - family-tree
  - organization-chart
exits:
  - exam
  - engineering
---
# 树与森林

## 1. 开场钩子

家谱、公司架构和文件夹系统都不喜欢混乱的环。它们选择同一种形状：从根不断分叉，却永远不绕回自己。

## 2. 直觉解释

树是“刚刚好连通”的图：少一边断开，多一边成环。叶是没有孩子的末端节点；几棵互不相接的树放在一起就是森林。

## 3. 正式定义

无环连通图称为树；无环图称为森林。若树有 $n\ge1$ 个顶点，则恰有 $n-1$ 条边。度数为 1 的顶点叫叶。

## 4. 分步例题

星形树中心 R 连接 A,B,C：4 点 3 边，符合 $n-1$，外点是叶。添加 AB 出现回路 R-A-B-R；删除 RC 则分成两棵树，构成森林。

## 5. 动手实验

```python title="验证 n 个点的连通无环树有 n-1 条边"
trees=[
    [["A","B"]],
    [["A","B"],["B","C"]],
    [["A","B"],["A","C"],["A","D"]]
]
for edges in trees:
    vertices=set()          # set 只保留不重复元素
    for u,v in edges:
        vertices.add(u)
        vertices.add(v)
    print(len(vertices),len(edges),len(vertices)-len(edges))
```

三行差值都是 1。给第二组再加边 B-C，观察它不再是无环树。

:::warning[常见误区]

**误区一**：没有环还必须连通才是树。

**误区二**：顶点数固定时树的边数不随形状改变。

**误区三**：树不限制度数；中心可以有很高度。

:::

## 6. 练习与定理快问

```exercise
# @title: 判断树、森林还是含环图
# @check: tree
# @check: forest
# @check: cycle
# @hint: 边数够 n-1 不一定是树——先看连不连通。不连通时无环等价于 m == n - c，其中 c 是连通分量数（用上面给的分量计数函数）。

def component_count(vertices, edges):
    adj = {}
    for v in vertices:
        adj[v] = []            # 每个顶点先挂一张空邻居表
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    seen = set()
    count = 0
    for start in vertices:
        if start not in seen:  # 遇到没见过的点就发现一个新分量
            count += 1
            queue = [start]
            seen.add(start)
            while queue:       # 上一课的 BFS：把整个分量标完
                current = queue.pop(0)
                for nb in adj[current]:
                    if nb not in seen:
                        seen.add(nb)
                        queue.append(nb)
    return count

cases = [
    [["A", "B"], ["B", "C"], ["C", "D"]],
    [["A", "B"], ["C", "D"]],
    [["A", "B"], ["B", "C"], ["C", "A"], ["D", "E"]],
]

for edges in cases:
    verts = set()
    for u, v in edges:
        verts.add(u)
        verts.add(v)
    n = len(verts)
    m = len(edges)
    c = component_count(verts, edges)
    # ↓ 分类逻辑有漏洞：第三张图边数恰好 n-1 却不连通，会骗过它
    if m == n - 1:
        print("tree")
    elif m < n - 1:
        print("forest")
    else:
        print("cycle")
```

```quiz
一棵树有 10 个顶点，边数是多少？
- 9 [*]
- 10
- 11
? 连通且无环的最小边数是 n-1。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

对 n 归纳。单点树无边；删去一片叶得到 n-1 点树，由归纳假设有 n-2 条边，加回删除的那条边即 n-1。
</details>

## 7. 方法边界

树适合层级和唯一父路径，不适合表达多条可选路线。下一课允许删边但保留全网连通。

## 8. 下一站

若必须覆盖全部村庄又想尽量少修路，该留下哪些边？

→ [生成树与最小生成树](./50-spanning-mst.md)
