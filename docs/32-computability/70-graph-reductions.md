---
title: 图着色、团与独立集
lesson_id: computability/graph-reductions
prereqs:
  - computability/sat-three-sat
volume: 3
layer: L4
track:
  - discrete-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - graph-coloring-reduction
  - clique-independent-set
applications:
  - timetable-conflicts
  - network-analysis
exits:
  - engineering
  - research
---

# 图着色、团与独立集

## 1. 从一个场景开始

排课时，两位老师不能在同一时段进同一间教室；通信网络里，相邻基站不能用同一频率。这些冲突都能画成图：点是待安排对象，边是“不许相同”。

图着色问最少需要几种颜色。团找一群彼此都相连的点。独立集找一群彼此都不相连的点。三者看起来性格不同，却可以在多项式时间里互相变形。

## 2. 直觉解释

先记住三条核心对应：

| 问题 | 寻找什么 | 关系 |
| --- | --- | --- |
| k 着色 | 给每个点一种颜色，相邻点不同 | 冲突约束的空间化 |
| 团 | 大小为 k 的两两相连点集 | 补图中的独立集 |
| 独立集 | 大小为 k 的两两不相连点集 | 原图团的补图版本 |

“补图”指保留原来的点，把有边改成无边、无边改成有边。原图中一群互不相邻的点，放到补图中就变成一群两两相连的点，反之亦然。

因此若能解独立集，就能先构造补图再解团；若能解团，也能先构造补图再解独立集。构造补图只需遍历所有点对，时间是多项式。

## 3. 正式定义

设无向图 $G=(V,E)$。

$$k\text{-COLOR}=\lbrace G:\exists c:V\to\lbrace1,\dots,k\rbrace,\ \forall (u,v)\in E,\ c(u)\ne c(v)\rbrace$$

$$CLIQUE_k=\lbrace G:G\text{ 存在大小为 }k\text{ 的两两相邻顶点集合}\rbrace$$

$$INDSET_k=\lbrace G:G\text{ 存在大小为 }k\text{ 的两两不相邻顶点集合}\rbrace$$

对同一顶点集 $V$，令补图 $\overline G=(V,\binom V2\setminus E)$。则

$$G\in CLIQUE_k \Longleftrightarrow \overline G\in INDSET_k$$

这就是最短的多项式归约之一。

## 4. 分步例题

例题：判断三角形图是否有大小为 3 的团和大小为 2 的独立集。

1. 三角形有三个点 A、B、C；
2. 三条边分别是 AB、BC、CA；
3. 点集 A、B、C 两两相连，所以有大小为 3 的团；
4. 任取两点都有边，所以不存在大小为 2 的独立集；
5. 最大独立集大小只有 1。

再看补图：原图三条边消失，三条原本缺失的边出现，但只有三个点时，补图没有任何边。于是三角形图的补图最大团大小也是 1。大小关系随“相连”与“不相连”同步翻转，不能凭图形直觉跳步。

## 5. 动手实验

### 实验 1：三种视角的证明链

```viz
{
  "type": "proof-trail",
  "title": "团与独立集的镜像",
  "steps": [
    { "id": "原图", "text": "在 G 中找互不相邻点集" },
    { "id": "翻边", "text": "构造补图，保留所有点" },
    { "id": "镜像", "text": "不相连变成两两相连" },
    { "id": "借用", "text": "调用团算法回答原图问题" }
  ],
  "edges": [["原图", "翻边"], ["翻边", "镜像"], ["镜像", "借用"]]
}
```

这条链没有任何高深数学，却能完整传递难度：翻边步骤遍历点对，成本多项式。

### 实验 2：小图上的团与独立集体检

```python title="四个点的小图检查"
vertices = [0, 1, 2, 3]
edges = [(0, 1), (1, 2), (2, 3)]

def has_edge(a, b):               # 判断无向图中两点是否相连
    return (a, b) in edges or (b, a) in edges

def is_clique(group):
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            if not has_edge(group[i], group[j]):
                return False
    return True

def is_independent(group):
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            if has_edge(group[i], group[j]):
                return False
    return True

print(is_clique([0, 1]))
print(is_clique([0, 2]))
print(is_independent([0, 2]))
print(is_independent([0, 1]))
```

路径 0-1-2-3 中，0 和 1 组成团；0 和 2 没有直接边，组成独立集。你可以把 `[0, 1, 2]` 同时喂给两个函数，体会同一组点在两种性质下只能活在一个世界里。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为图着色只是给点编号。颜色数量是资源，相邻约束决定能否共用。

**误区二**：你以为团和独立集毫无关系。补图让它们成为同一问题的两张照片。

**误区三**：你以为任何 SAT 到图着色的映射都很随意。标准 gadget 构造要为变量、否定关系和每个子句设计局部结构，并证明可满足性与可着色性严格等价。

:::

## 7. 练习

```exercise
# @title: 练习：修复独立集检查器
# @check: False
# @check: True
# @hint: 独立集中任意两点都必须没有边；当前实现把找到边当作合格。
edges = [(0, 1), (2, 3)]

def is_independent(group):
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            a, b = group[i], group[j]
            if (a, b) in edges or (b, a) in edges:
                return True
    return False

print(is_independent([0, 1]))
print(is_independent([0, 2]))
```

初始函数遇到边就返回 True，方向反了。请把它改成发现边立刻失败，全部点对都没有边才成功。

<details>
<summary>点开查看逐步解答</summary>

把内层条件中的 `return True` 改成 `return False`。这样 `[0, 1]` 因有边被判假；`[0, 2]` 没有边，循环结束后返回真。若要检查更大集合，还应考虑重复点：同一个点和自身不算合法的两两不同顶点，可在进入循环前先去重并比较长度。

</details>

## 8. 快问快答

```quiz
把团问题归约到独立集问题时，通常对输入图做什么？
- 直接删掉所有边
- 构造补图后保持点集不变 [*]
- 给每个点复制一份
? 补图把两两相连翻转成两两不相连，从而保留 yes/no 的对应。
```

## 9. 选读：3-SAT 到三着色的 gadget 思路

<details>
<summary>选读 · 用三角骨架锁住真假</summary>

标准构造中有三个特殊点 T、F、B，它们组成三角形，因此需要三种颜色。每个变量点同时连接 T 和 F，迫使它只能取剩下那种颜色，从而编码真假。每条变量与其否定的冲突关系用相应的边表达。每个子句再加一个小 gadget，保证只有当子句中至少一个文字为真时整体才可三着色。整个图的大小与变量数和子句数成线性关系，因此 3-SAT 多项式归约到三着色。

</details>

## 10. 下一站

知道问题是 NP 完全并不等于放弃。下一课讨论如何在保证透明度的前提下交付近似解，以及启发式方法何时够用。

→ [近似与启发式出口](./75-approximation-heuristics.md)
