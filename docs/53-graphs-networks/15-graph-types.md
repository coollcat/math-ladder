---
title: 图的类型与建模
lesson_id: graphs-networks/graph-types
prereqs:
  - graphs-networks/network-models
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
  - directed-graph
  - weighted-graph
applications:
  - routing
  - web-link-analysis
exits:
  - data-ai
  - engineering
---

# 图的类型与建模

## 1. 开场钩子

“我关注你”不等于“你关注我”；“两地相距 8 公里”也不等于“只连不连”。如果把关注关系建成无向图，粉丝数会凭空翻倍；如果丢掉道路长度，导航只能告诉你能不能到，不能告诉你哪条更快。

建图的第一步不是写算法，而是回答：边有没有方向？有没有权重？能不能重复？

## 2. 直觉解释

| 图类型 | 最像什么 | 关键约定 |
| --- | --- | --- |
| 无向图 | 微信好友 | $(A,B)=(B,A)$ |
| 有向图 | 微博关注 / 网页链接 | $A\to B$ 不保证 $B\to A$ |
| 加权图 | 公路里程 / 通勤时间 | 每条边带数字 |
| 多重图 | 同城高铁与普铁并行 | 两节点间可有多条边 |

本课主线使用简单图：没有自环、没有重边。遇到真实数据时，要先决定自环和重复边代表信息还是脏数据。

## 3. 正式定义

有向加权图可写成三元组 $G=(V,E,w)$。若 $(u,v)\in E$ 且 $(v,u)\notin E$，则关系单向；权重函数 $w(u,v)$ 给这条边赋值。

出度是离开一个节点的边数：

$$d_{\text{out}}(u)=|\lbrace v:(u,v)\in E\rbrace|.$$

入度是进入一个节点的边数：

$$d_{\text{in}}(u)=|\lbrace v:(v,u)\in E\rbrace|.$$

## 4. 分步例题

三位同学互相转发笔记：

1. 小甲转发给小乙和小丙；
2. 小乙转发给小丙；
3. 小丙只接收，没有转发。

于是出度依次是 $2,1,0$，入度依次是 $0,1,2$。总出度等于总入度，因为每条有向边都恰好有一个起点和一个终点。

## 5. 动手实验

修改下面三种关系的方向和权重，观察模型语义立刻改变。

```python title="同一个三人小组的三种图"
# 出边表：键是人，值是他能直接联系到的人
follows = {
    "A": ["B", "C"],   # A 关注 B 和 C
    "B": ["C"],        # B 关注 C
    "C": [],           # C 没有关注任何人
}

# 出度：直接取邻居列表长度
out_degrees = []
for person in ["A", "B", "C"]:
    out_degrees.append(len(follows[person])) # append 在列表末尾加一项

# 入度：从零开始计数，再扫描每条出边
in_degrees = {"A": 0, "B": 0, "C": 0}
for source, targets in follows.items():      # items 同时取出键和值
    for target in targets:
        in_degrees[target] += 1              # 收到一条入边就加一

print(out_degrees)
print([in_degrees[p] for p in ["A", "B", "C"]])

# 加权道路：每条边是起点、终点和时间
roads = [
    ("站点A", "站点B", 7),
    ("站点B", "站点C", 3),
    ("站点A", "站点C", 12),
]
for u, v, minutes in roads:
    print(f"{u}->{v}:{minutes}")             # f-string 把变量嵌进文字
```

同样的三个人，友谊图、关注图、通勤图会给出三个不同的答案。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为社交网络天然无向。好友关系通常对称，但点赞、转发、关注是有向事件。

**误区二**：你以为权重越大越重要。距离、时间、容量、相似度的含义不同，最优方向可能相反。

**误区三**：你以为多重边必须合并。交通网中两条并行的路线可能代表不同班次或可靠性。

:::

## 7. 练习

```exercise
# @title: 练习：计算邮件网络的出入度
# @check: [2, 1, 0]
# @check: [0, 1, 2]
# @hint: 出度看每个键对应的邻居数量；入度要扫描所有出边。
mails = {
    "甲": ["乙", "丙"],
    "乙": ["丙"],
    "丙": [],
}

out_degree = [
    len(mails["乙"]),
    len(mails["丙"]),
    len(mails["甲"]),
]
in_degree = {"甲": 0, "乙": 1, "丙": 2}

print(out_degree)
print([in_degree[name] for name in ["甲", "乙", "丙"]])
```

<details>
<summary>点开查看逐步解答</summary>

甲发出 2 封，乙发出 1 封，丙发出 0 封。乙收到甲的一封，丙收到甲和乙的两封。

因此输出是 `[2, 1, 0]` 和 `[0, 1, 2]`。

</details>

## 8. 建模边界

选型时连续追问四件事：

1. 方向是否有意义？
2. 权重是强度、成本还是概率？
3. 自环是反馈、停留，还是采集错误？
4. 缺失边是“不可能”，还是“还没观察到”？

最后一个问题在蛋白质网络尤其关键。未检测到的相互作用不一定不存在；谱结论也会随观测矩阵变化。

## 9. 下一站

有了正确的边语义后，可以把“谁连谁”压进一张矩阵，让度数和邻居关系变成一眼可见的行列结构。

→ [度序列与中心性初步](./20-degree-centrality.md)
