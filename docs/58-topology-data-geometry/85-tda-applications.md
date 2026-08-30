---
title: 拓扑数据分析应用
lesson_id: tdg/applications
prereqs:
  - tdg/mapper-graphs
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - tda-workflow
applications:
  - sensor-networks
  - molecular-structure
  - embedding-inspection
exits:
  - data-ai
---

# 拓扑数据分析应用

## 1. 开场钩子

TDA 不是“万能洞检测器”。它的价值在于把一个具体问题翻译成可检验的形状假设：传感器是否连成片？嵌入空间是否有环状自由度？候选分子构象是否稳定跨尺度？

## 2. 直觉解释

一条成熟工作流通常有五步：

1. 明确对象：点云、距离矩阵、时间延迟嵌入或覆盖关系；
2. 选择度量与归一化；
3. 构造过滤复形或 mapper 覆盖；
4. 报告持久特征、条码和参数敏感性；
5. 用领域证据复核，而不是只看图。

形状特征是线索，不是因果证明。

## 3. 应用对照表

| 领域 | 输入 | 常用工具 | 谨慎解释 |
| --- | --- | --- | --- |
| 传感器网络 | 通信半径与位置 | Čech/nerve | 判断覆盖空洞，还要考虑故障和定位误差 |
| 分子构象 | 原子距离矩阵 | Rips + persistence | 环不等于化学活性，需能量与实验佐证 |
| 时间序列 | 延迟嵌入 | sliding-window persistence | 周期候选要排除采样伪影 |
| 表示学习 | 向量库样本 | mapper + PCA 镜头 | 簇语义由标签和人工审核确认 |
| 可信 AI | 中间表示偏移 | 持久图对比 | 不能直接推出公平性或安全裕度 |

## 4. 分步例题：传感器覆盖

五个传感器半径均为 100 米，中心排成五边形，相邻间距 120 米，对角间距约 194 米。

1. 相邻球相交，因此边界链连通；
2. 连续相邻的三台（例如 0、1、2 号）有公共交叠，可填成三角形；隔一位的三台没有公共交叠；
3. 五个球的中心构成正五边形，最小包围圆半径约 102 米，大于感知半径 100 米，所以五球没有公共点；
4. nerve 的账本是 $V=5,E=10,F=5$，因此 $\chi=5-10+5=0$；
5. 覆盖连通且没有四面体，$\chi=0$ 说明有一个候选 $H_1$ 空洞；应增加中继或提高功率后重新检查参数敏感性。

## 5. 动手实验

```viz
{
  "type": "fit",
  "n": 12
}
```

拖动十二个点模拟传感器中心。先构造闭合链，再拉开一个缺口；趋势线不会告诉你环断了，但阈值邻接模型会。

```python title="报告不同阈值下的边数"
sensors = [[0, 102], [-97, 32], [-60, -83], [60, -83], [97, 32]]  # 正五边形顶点，相邻间距约 120 米
radii = [100, 110, 130]
max_pairs = 200   # 上限防止大网格失控

for radius in radii:
    count = 0
    for i in range(len(sensors)):
        for j in range(i + 1, len(sensors)):
            dx = sensors[i][0] - sensors[j][0]
            dy = sensors[i][1] - sensors[j][1]
            if (dx * dx + dy * dy) ** 0.5 <= 2 * radius and count < max_pairs:
                count += 1
    print(radius, count)
```

三档半径都数出全部 10 对两两相交。但第 65 课的误区一提醒过：**两两相交不等于公共交叠**。本例的连续相邻三元组有公共交叠，而全部五个球的公共交叠被 102 米的最小包围半径挡住；只统计必要条件无法确定盲区的同调类型。严格 Čech 必须继续检查高维公共交集。

## 6. 练习

```exercise
# @title: 练习：生成敏感性摘要
# @check: threshold=1.0 edges=3 components=2
# @check: threshold=1.5 edges=4 components=1
# @hint: 统计距离不超过阈值的边；再用并查集或广度优先求连通块。
points = [[0, 0], [1, 0], [2, 0], [3.4, 0], [4.2, 0]]
thresholds = [1.0, 1.5]

for limit in thresholds:
    edges = 0
    components = len(points)
    print("unknown")
```

<details>
<summary>点开查看逐步解答</summary>

可用简单合并：

```python
points = [[0, 0], [1, 0], [2, 0], [3.4, 0], [4.2, 0]]
thresholds = [1.0, 1.5]

def find(x):
    # 路径压缩：把沿途标签都指向祖先，让簇的查询越跑越快
    while labels[x] != x:
        labels[x] = labels[labels[x]]
        x = labels[x]
    return x

for limit in thresholds:
    edges = 0
    labels = list(range(len(points)))   # 开始时每个点自成一簇
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            if abs(points[i][0] - points[j][0]) <= limit:
                a, b = find(i), find(j)
                if a != b:
                    labels[b] = a       # 合并两个不同的簇
                    edges += 1
    components = len(set(find(i) for i in range(len(points))))
    print(f"threshold={limit} edges={edges} components={components}")
```

五个样本在阈值 1.0 时形成左侧三点链和右侧两点链，共三条边、两个连通块；阈值放宽到 1.5 后，2 号点与 3 号点之间的桥加入，四条边把全部样本接成一个连通块。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为拓扑特征自动带有业务含义。它只是表示空间中的形状候选，需要领域证据复核。

**误区二**：你以为 TDA 可以替代领域模型。它是探索和假设生成工具，不能自动命名机制。

**误区三**：你以为一次运行就是结论。必须报告尺度范围、样本上限、随机种子和失败模式。

:::

## 8. 选读：结果交流模板

<details>
<summary>选读 · 给团队的三段式结论</summary>

第一段说数据和度量：多少样本、如何清洗、为什么选择该表示。第二段说计算设置：复形类型、阈值范围、最大点数、同调维度。第三段说解释边界：哪些特征长寿，哪些只在窄区间出现，下一步需要什么实验。

这个模板能阻止“图很漂亮所以系统有环”式的跳跃。

</details>

## 9. 下一站

最后一课不引入新定理，而是帮你选对拓扑方法并识别不适配场景。

→ [拓扑方法地图](./90-method-map.md)
