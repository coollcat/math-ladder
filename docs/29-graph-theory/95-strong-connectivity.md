---
title: 强连通分量：有向图的抱团地图
lesson_id: graph-theory/strong-connectivity
prereqs:
  - graph-theory/paths-connectivity
  - graph-theory/topological-dag
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
  - strongly-connected-component
  - kosaraju-algorithm
  - condensation-dag
applications:
  - deadlock-detection
  - web-community
exits:
  - engineering
  - research
---
# 强连通分量：有向图的抱团地图

## 1. 开场钩子

单行道城市里，导航说"从家能开到机场"，不代表"从机场能开回家"。方向一上场，"连通"就分成了两半：到得了，还得回得来，才算是真正的一伙。把有向图里"互相够得着"的点圈成一片片——这就是本课要画的抱团地图。

## 2. 直觉解释

第 30 课的连通分量数的是"有没有路"，不问方向；误区三留下的那道裂缝——单向通路推不出反向可达——这一课正式补上。互相走得过去、也走得回来的点，叫强连通；把"再也扩不进去"的一伙强连通点打成一片，就是强连通分量（SCC）。分量内部四通八达，分量之间却只有单行道。

## 3. 正式定义

有向图中若 $u$ 可达 $v$ 且 $v$ 可达 $u$，称两点强连通。强连通分量是极大的强连通子图：同一分量内任意两点互相可达，分量之间不存在双向通路。把每个分量缩成一个点、保留分量之间的边，得到缩点图——它必定是 DAG，能按拓扑排序排出先后。

## 4. 分步例题

六点图，边 A→B、B→C、C→A、C→D、D→E、E→F、F→D：

1. 找圈：A→B→C→A 三点咬合成环，彼此互相可达；D→E→F→D 同理；
2. 验跨界：C→D 让左边一伙够得到右边一伙；反过来找，D、E、F 没有任何路回到 A、B、C；
3. 定分量：{A,B,C} 与 {D,E,F}，两片；
4. 缩点：两片之间只剩一条单向边——一个两点的 DAG，恰好能按[拓扑排序与 DAG](./70-topological-dag.md)排出"组0 在前"；
5. 陷阱：再补一条 F→B，两片立刻互相可达，融成一个分量——单向边是唯一的隔墙。

## 5. 动手实验

Kosaraju 的两遍 DFS 分两步：第一遍给每个点记"收工顺序"；第二遍把所有箭头反过来，从最晚收工的点出发圈人。直觉：收工越晚越像整张图的上游；在反图上从它出发能走到的，正是"从它进得来、又被它锁住出不去"的那一窝。

```python title="Kosaraju 两遍 DFS：先排收工顺序，再反图圈点"
graph={"A":["B"],"B":["C"],"C":["A","D"],"D":["E"],"E":["F"],"F":["D"]}

# 第一遍：在原图上 DFS，记收工顺序
visited=set()
order=[]                    # 收工越晚，排得越靠后
for start in graph:         # 逐个点当起点，保证不漏任何一块
    if start in visited:
        continue
    stack=[start]           # 栈：后进先出，用列表末端当出入口
    visited.add(start)
    while stack:
        node=stack[-1]      # 看一眼栈顶（负下标），先不拿走
        fresh=[nxt for nxt in graph[node] if nxt not in visited]
        if fresh:           # 还有没去过的邻居：先去那里
            visited.add(fresh[0])
            stack.append(fresh[0])
        else:               # 邻居全走遍了：这个点收工出栈
            stack.pop()     # pop()：弹出并删除列表末尾元素
            order.append(node)
print("收工顺序", order)

# 第二遍：反图上从最晚收工的点开始圈
rgraph={}
for u in graph:
    rgraph[u]=[]            # 每个点先配一个空邻居表
for u in graph:
    for v in graph[u]:
        rgraph[v].append(u) # 原来的 u→v 翻成 v→u

visited=set()
comps=[]                    # 收集一个个分量
for start in reversed(order):   # reversed：把列表倒过来遍历
    if start in visited:
        continue
    group=[]
    queue=[start]
    visited.add(start)
    while queue:
        node=queue.pop(0)
        group.append(node)
        for nxt in rgraph[node]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    comps.append(sorted(group)) # sorted：组内按字母排好，方便对照
print("强连通分量", comps)
```

两行输出：收工顺序 `['F', 'E', 'D', 'C', 'B', 'A']`，分量 `[['A', 'B', 'C'], ['D', 'E', 'F']]`——与手画例题完全一致。

```python title="收缩成 DAG：缩点后只剩一条单向街"
graph={"A":["B"],"B":["C"],"C":["A","D"],"D":["E"],"E":["F"],"F":["D"]}
comps=[["A","B","C"],["D","E","F"]]   # 上一块算好的分量，直接拿来用

which={}
for i in range(len(comps)):
    for name in comps[i]:
        which[name]=i             # 记下每个点属于哪个分量（编号从 0 起）

condensation=[]                   # 缩点图的边：[起点组, 终点组]
for u in graph:
    for v in graph[u]:
        if which[u]!=which[v] and [which[u],which[v]] not in condensation:
            condensation.append([which[u],which[v]])
print("缩点后的边", condensation)
print("文字图 组0", comps[0], "-> 组1", comps[1])
```

缩点图只剩 组0→组1 一条单向边——DAG，能拓扑排序。原图里纵横交错的箭头，一收缩立刻眉清目秀；死锁检测、网页互链聚团，用的都是这张缩点地图。

::::warning[常见误区]

**误区一**：把箭头抹掉后连通 ≠ 强连通。无向视角四通八达，单行道却可能"进去就出不来"。

**误区二**：你以为一个点可以同时属于两个分量。互相可达会传递：u↔v、v↔w 则 u↔w，所以每个点恰好落在一个分量里——分量是划分，不是朋友圈。

**误区三**：你以为缩点之后还能绕回起点。若缩点图出现有向环，环上各分量就互相可达，本该合并成一个分量——所以缩点图必是 DAG。

::::

## 6. 练习与定理快问

```exercise
# @title: 谁和 A 真正"互相够得着"
# @check: ['A', 'B', 'C']
# @hint: 强连通要来回都有路：把所有箭头反过来再从 A 扩散一遍，两边都到过的点才算。反向邻居表的造法：u→v 翻成 v→u，也就是 rgraph[v] 收下 u。
graph={"A":["B"],"B":["C"],"C":["A","D"],"D":["E"],"E":["F"],"F":["D"]}

# 第一步：从 A 出发正向扩散
queue=["A"]
seen={"A"}
while queue:
    current=queue.pop(0)
    for nxt in graph[current]:
        if nxt not in seen:
            seen.add(nxt)
            queue.append(nxt)

# 第二步：造反向图 rgraph，再从 A 扩散一遍记进 back（还没写——补上它）

# 第三步：两边都见过的点才互相可达（现在直接打印了正向结果——改掉它）
print(sorted(seen))
```

初始码把"正向可达"当成了答案，打印出全部六个点；补上反向扩散再取交集，才得到真正与 A 强连通的三点。

```quiz
把每个强连通分量缩成一个点后，得到的图一定满足什么？
- 一定是完全图
- 一定是无环的有向图 [*]
- 一定是无向连通图
? 若缩点图出现有向环，环上分量互相可达，本该合并成一个分量——矛盾，所以必是 DAG。
```

<details>
<summary>选读 · 为什么反图配收工顺序能圈准分量</summary>

收工晚的点倾向于站在图的"上游"。Kosaraju 的配对论证：$s$ 所在的强连通分量，恰好等于"原图里从 $s$ 出发能撒到的点"与"反图里从 $s$ 出发能撒到的点"的交集——正着走得出、反着走也回得来，正是互相可达。第二遍按收工从晚到早圈人，每圈一窝就摘掉一窝，各分量互不粘连。同为主流算法的 Tarjan 只需一遍 DFS（靠栈维护"当前圈的候选"），复杂度同为线性；本书取两遍版，因为它的每一步都能用"上游/下游"讲清。

</details>

## 7. 方法边界

Kosaraju 与 Tarjan 都是线性时间，本书只取两遍版的直觉。无向图一侧还有自己的结构体检：割点（拔掉它整图裂开）、桥（拔掉它两边断联）与图同构（两张图是否只差画法）——都是独立的进阶话题，本书点到为止。

## 8. 下一站

有向图的抱团地图画完，回到无向图问一个画图问题：哪些线路图能摊平在纸面上不交叉？

→ [平面图初步](./100-planar-graphs.md)
