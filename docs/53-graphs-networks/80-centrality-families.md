---
title: 中心性家族比较
lesson_id: graphs-networks/centrality-families
prereqs:
  - graphs-networks/pagerank
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
  - centrality-family
applications:
  - key-infrastructure-detection
  - influencer-analysis
exits:
  - data-ai
---

# 中心性家族比较

## 1. 开场钩子

机场枢纽、急救站和谣言关键传播者的“重要”不是同一件事。有的要直连多，有的要到谁都近，有的要站在最短路上，有的要看邻居本身有多强。

中心性不是一个数字，而是一组问题的映射。

## 2. 直觉解释

| 家族 | 问的问题 | 擅长发现 |
| --- | --- | --- |
| 度中心性 | 谁直接连接多？ | 活跃枢纽 |
| 接近中心性 | 谁到所有人都快？ | 服务覆盖点 |
| 中介中心性 | 谁常出现在最短路上？ | 桥梁和瓶颈 |
| 特征向量/PageRank | 谁连接到重要的节点？ | 结构影响力 |

同一个社交图中，客服号可能接近所有人，但不是谣言桥；跨社区账号可能中介很高，但度不算最高。

## 3. 正式定义

无向图的接近中心性常用

$$C_C(v)=\frac{n-1}{\sum_u \text{dist}(v,u)},$$

其中距离按边数计算。中介中心性为

$$C_B(v)=\sum_{s\ne v\ne t}\frac{\sigma_{st}(v)}{\sigma_{st}},$$

$\sigma_{st}$ 是 $s$ 到 $t$ 最短路径数，分子表示其中经过 $v$ 的数量。

特征向量中心性解

$$A\vec x=\lambda \vec x.$$

## 4. 分步例题

星形图：中心 C 连着三个叶子 L1、L2、L3。

1. C 的度为 3，任一叶子度为 1；
2. C 到所有点的总距离是 $1+1+1=3$，接近中心性为 $3/3=1$；
3. 叶子到其他点的总距离是 $1+2+2=5$，接近中心性为 $3/5=0.6$；
4. 若没有跨叶子边，所有最短路都经过 C，所以 C 的中介也最大。

## 5. 动手实验

下面的对照表故意让四个指标给出不同冠军。修改数值前先想：你在改变哪种“重要”？

```python title="四种中心性的语义差异"
metrics = {
    "degree":       {"客服": 9, "桥梁": 4, "明星": 8, "冷门专家": 2},
    "closeness":    {"客服": 0.91, "桥梁": 0.72, "明星": 0.65, "冷门专家": 0.31},
    "betweenness":  {"客服": 0.10, "桥梁": 0.88, "明星": 0.04, "冷门专家": 0.01},
    "eigenvector":  {"客服": 0.61, "桥梁": 0.44, "明星": 0.92, "冷门专家": 0.18},
}

for name, table in metrics.items():   # items 同时取指标名和分值表
    ranked = sorted(table, key=table.get, reverse=True)
    best = ranked[0]                  # 排序后的第一名就是最高分节点
    print(f"{name}: 第一名={best}, 排序={ranked}")
```

真实系统不应只看一张榜单；先定义要优化的风险或收益。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你把中心性当成综合实力。它们回答的问题不同，不能直接相加。

**误区二**：你忽略有向性。入中心性和出中心性必须分开。

**误区三**：你以为高中介一定高 degree。两个大群体之间的小账号可能只有两条边却控制通道。

:::

## 7. 练习

```exercise
# @title: 练习：计算星形图的归一化接近分数
# @check: ['C', 1.0]
# @check: ['L', 0.6]
# @hint: 用 (n-1) 除以到所有节点的最短距离总和。
distances = {
    "C": {"C": 0, "L1": 1, "L2": 1, "L3": 1},
    "L": {"C": 1, "L1": 0, "L2": 2, "L3": 2},
}

closeness = {}
for name, row in distances.items():
    closeness[name] = sum(row.values())

print(["C", closeness["C"]])
print(["L", closeness["L"]])
```

<details>
<summary>点开查看逐步解答</summary>

C 的总距离是 3，所以 $3/3=1.0$；叶子的总距离是 5，所以 $3/5=0.6$。

练习里应把 `closeness[name]` 改成 `3 / sum(row.values())`。

</details>

```quiz
评估无线接入网里的“关键基站”时，应该先做什么？
- 先定义失效后果：覆盖空洞、切换拥塞还是骨干中断，再选对应中心性 [*]
- 永远选择 degree 最高的基站
- 把四种中心性分数直接相加取最大
? 覆盖、切换和骨干回传对应不同风险；没有业务语义的合成分数很难解释。
```

## 8. 选型边界

选指标前先问失效模式：

1. 断开直连选 degree；
2. 缩短平均响应选 closeness;
3. 监控跨区通路选 betweenness;
4. 追踪长期影响选 PageRank 或特征向量版本。

若数据只是观测到的交互，缺失边会让所有榜单都有偏差。

## 9. 下一站

单点榜单之后，该看集体形状：哪些边在内部密集、彼此之间稀疏，这就是社区检测。

→ [社区检测](./85-community-detection.md)
