---
title: 图网络方法地图
lesson_id: graphs-networks/method-map
prereqs:
  - graphs-networks/over-smoothing
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
  - graph-method-selection
applications:
  - recommendation-systems
  - knowledge-graph-reasoning
exits:
  - data-ai
  - engineering
---

# 图网络方法地图

## 1. 开场钩子

推荐系统关心用户流动，图像分割关心难切边界，引文分析关心长期重要性，分子预测依赖局部化学环境。它们都是图，但答案藏在不同矩阵里。

这一课不学新公式，而是练习选型：什么问题该请哪个方法上场。

## 2. 直觉解释

| 问题信号 | 首选视角 | 典型对象 |
| --- | --- | --- |
| “下一步会去哪？” | 转移矩阵 / 随机游走 | 用户跳转、交通流 |
| “哪里能自然切开？” | Laplacian / 谱聚类 | 社区、图像分割 |
| “谁长期重要？” | PageRank / 特征向量中心性 | 网页、引用、传染源 |
| “局部环境决定属性？” | 消息传递 / GCN | 分子、蛋白质、知识图谱 |

真实项目常组合使用：先用谱方法看形状，再用游走验证流量，最后用 GNN 学习节点标签。

## 3. 正式对照

| 方法 | 核心对象 | 强项 | 解释边界 |
| --- | --- | --- | --- |
| 邻接矩阵幂 | $A^k$ | 数固定长度游走 | 回头路会计入 |
| Laplacian | $D-A$ 或归一化版 | 连通性、切割能量 | 加权和归一化改变结论 |
| 平稳分布 | $P\vec\pi=\vec\pi$ | 长期流量 | 需不可约且非周期 |
| PageRank | $dM+(1-d)\mathbf 1/n$ | 有阻尼的重要性 | 参数和爬取范围影响排名 |
| GNN | 邻居聚合 + 参数 | 可学习表示 | 过平滑和分布偏移需监控 |

## 4. 选型流程

1. 先写清边的语义：方向、权重、缺失边含义。
2. 问目标是路径、切割、排序还是学习表示。
3. 检查数据规模：全谱、幂迭代和采样成本不同。
4. 做扰动实验：删边、换权重、换种子、换归一化。
5. 报告参数和失败案例，而不是只给一个分数。

## 5. 动手实验

下面的小路由表让你按目标选择方法。修改 `goal` 后重新运行，注意没有一种方法能回答所有问题。

```python title="按目标选择图方法"
methods = {
    "next-step": "transition-matrix",
    "community-cut": "laplacian-spectral",
    "long-term-importance": "pagerank",
    "local-property": "message-passing",
}
goals = ["next-step", "community-cut", "long-term-importance", "local-property"]

for goal in goals:                 # 逐个目标查表
    chosen = methods.get(goal, "unknown") # get 支持默认值
    print(f"{goal}->{chosen}")     # f-string 输出映射
```

如果目标变成“解释两个社区为什么相连”，就要回到边定义和领域证据，而不是继续换算法。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你因为数据能画成图就套 GNN。若答案是纯全局排序，PageRank 可能更透明高效。

**误区二**：你忽略谱结论的条件。未观测边、加权方式和归一化都可能翻转社区边界。

**误区三**：你不报告随机性。游走种子、初始化和数据切片都会影响复现。

:::

## 7. 练习

```exercise
# @title: 练习：为四个场景匹配方法
# @check: ['transition-matrix', 'laplacian-spectral', 'pagerank', 'message-passing']
# @hint: 分别对应下一步流向、社区切割、长期重要性和局部属性。
scenarios = [
    "预测用户下一跳",
    "寻找蛋白质网中的稳定模块",
    "评估引文网络的长期影响力",
    "根据原子局部环境预测毒性",
]

answers = [
    "message-passing",
    "message-passing",
    "message-passing",
    "message-passing",
]

print(answers)
```

<details>
<summary>点开查看逐步解答</summary>

1. 下一跳用转移矩阵；
2. 稳定模块先看 Laplacian 与谱聚类；
3. 引文长期影响力适合 PageRank；
4. 局部原子环境适合消息传递。

</details>

## 8. 课程回望

本章沿一条阶梯走完：

关系 → 度 → 邻接矩阵 → 幂与转移 → Laplacian → 谱证据 → 游走与平稳性 → 排序与中心性 → 社区 → 消息传递 → GNN。

每个高级方法都保留了一个朴素问题：这张图里，什么在流动，什么难切断，什么会长期留下？

## 9. 下一站

第 53 章正式课到这里完成。后续可视化组件会把拖拽布局、矩阵联动高亮和谱分裂做成站内教具。

→ [第 53 章 · 图与网络](./index.md)
