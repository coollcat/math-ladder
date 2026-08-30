---
title: 网络不只是点线图
lesson_id: graphs-networks/network-models
prereqs:
  - linalg-advanced/matrix-powers
  - linalg-advanced/eigenvalues
  - prob/law
volume: 5
layer: L11
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - relational-data
applications:
  - social-network-analysis
  - knowledge-graphs
exits:
  - data-ai
---

# 网络不只是点线图

## 1. 开场钩子

一张地铁线路图看起来只是点和线，但它同时回答了三个完全不同的问题：哪站换乘最多、哪两站要经过几段、哪些站故障会让系统裂成两块。网页链接、好友关系、蛋白质相互作用和知识图谱也都有这种“局部简单、全局复杂”的特点。

本章不把网络当成插图，而是把它变成能计算的对象。

## 2. 直觉解释

| 场景 | 节点 | 边 | 一条边表示 |
| --- | --- | --- | --- |
| 社交平台 | 人 | 友谊 | 两人互相认识 |
| 网页 | 页面 | 超链接 | 一个页面指向另一个页面 |
| 地铁网 | 车站 | 相邻区段 | 两站之间有直达轨道 |
| 蛋白质网 | 蛋白质 | 相互作用 | 两种蛋白质能结合或协作 |

这些场景的共同语言是**图**：圆点叫节点，连线叫边。真正重要的不是圆点画在哪里，而是“谁和谁相连”。

## 3. 正式定义

一个无向图可以写成 $G=(V,E)$，其中节点集 $V=\lbrace A,B,C\rbrace$，边集 $E=\lbrace (A,B),(B,C)\rbrace$。

- $V$ 是所有节点的集合；
- $E$ 是所有边的集合；
- 无向边 $(A,B)$ 与 $(B,A)$ 表示同一条关系；
- 有向图则会区分箭头方向。

## 4. 分步例题

假设四位同学的关系是：小蓝认识小橙，小橙认识小绿，小绿认识小紫。

1. 节点集是 $\lbrace$小蓝, 小橙, 小绿, 小紫$\rbrace$。
2. 无向边有三条：小蓝—小橙、小橙—小绿、小绿—小紫。
3. 小橙出现在两条边里，所以它的度是 2。
4. 删除小橙后，图会分成两个互不可达的部分。这就是结构信息，不能从单独一行名单里看出来。

## 5. 动手实验

下面的代码把关系表压缩成“唯一关系”。你可以增删名单，观察重复记录和反向记录如何被去掉。

```python title="把聊天记录整理成唯一友谊"
# 字典：用大括号给每个名字分配一个编号，方便程序处理
name_to_id = {"小蓝": 0, "小橙": 1, "小绿": 2, "小紫": 3}

# 列表：每条记录是一对名字；同一份友情可能被两个人各记了一次
raw_links = [
    ("小蓝", "小橙"),
    ("小橙", "小蓝"),
    ("小橙", "小绿"),
    ("小绿", "小橙"),
    ("小绿", "小紫"),
]

# 集合：相同内容只会保留一次；sorted 把一对名字排成固定顺序
unique_links = set()
for a, b in raw_links:          # for 会逐条取出列表中的元素
    key = tuple(sorted((a, b))) # tuple 让一对名字成为不可变的集合键
    unique_links.add(key)       # add 向集合加入一个元素

print(len(unique_links))        # len 计算集合中有多少条唯一边
for link in sorted(unique_links):
    print(link)
```

这不是装饰性的点线图：同一个数据被整理成了可检查的边集。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为节点坐标很重要。基础图论只关心连接关系；画得远不等于关系弱。

**误区二**：你以为两条反向记录一定代表两条边。无向 friendship 通常要去重，而有向 follow 必须保留方向。

**误区三**：你以为网络分析只是找最大点。枢纽、桥、社区和传播路径都藏在整个连接模式里。

:::

## 7. 练习

```exercise
# @title: 练习：统计唯一合作关系
# @check: 4
# @hint: 先把每条无向边排序成固定形式，再用集合去重。
raw_edges = [
    ("P1", "P2"),
    ("P2", "P1"),
    ("P2", "P3"),
    ("P3", "P2"),
    ("P3", "P4"),
    ("P4", "P5"),
]

unique_edges = raw_edges
print(len(unique_edges))
```

<details>
<summary>点开查看逐步解答</summary>

无向边 $(P_1,P_2)$ 和 $(P_2,P_1)$ 是同一条关系。先把每一对按字典序排列：

$$\lbrace(P1,P2),(P2,P3),(P3,P4),(P4,P5)\rbrace$$

所以唯一边数是 4。

</details>

## 8. 结构视角

同一个网络可以从三个尺度看：

1. **局部**：一个节点有几条边；
2. **路径尺度**：两点之间隔几个中间人；
3. **全局**：网络是否连通，是否分成社区，随机消息会流向哪里。

矩阵、谱方法和随机游走分别把这些直觉变成公式。它们不是不同学科，而是同一张图的几种投影。

## 9. 下一站

下一步先学会选择正确的图类型：朋友关系、网页跳转和道路长度不能用同一种边来建模。

→ [图的类型与建模](./15-graph-types.md)
