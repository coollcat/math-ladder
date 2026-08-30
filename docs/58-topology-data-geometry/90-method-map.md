---
title: 拓扑方法地图
lesson_id: tdg/method-map
prereqs:
  - tdg/applications
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
  - topology-method-selection
applications:
  - method-selection
exits:
  - research
---

# 拓扑方法地图

## 1. 开场钩子

学完一章工具后，最大的风险是看见数据就想算持久同调。这一课只做一件事：根据问题、数据规模和可解释性需求，把问题送到正确的拓扑入口。

## 2. 方法速查

| 问题 | 首选方法 | 关键输出 | 不适合时 |
| --- | --- | --- | --- |
| 是否断开 | 连通性 / $H_0$ | 连通块与桥 | 动态网络用时序图 |
| 是否有贯穿洞 | $H_1$ 或亏格 | barcode | 平面挖孔先分清边界 |
| 是否有空腔 | 高维 Betti 数 | 持久图 | 样本太稀疏时不稳定 |
| 覆盖是否有盲区 | nerve / Čech | 高维交叠 | 非凸覆盖慎用 nerve 定理 |
| 全局形状概览 | mapper | 节点图 | 参数敏感时只作探索 |
| 相位缠绕 | 覆盖空间提升 | 展开路径 | 有跳变噪声时先去噪 |
| 曲面类型 | $\chi$ + 定向性 | 分类标签 | 带边界曲面需额外结构 |

## 3. 决策流程

1. 先问数据能否表示成集合、度量、函数或覆盖；
2. 再问关心的性质是连接、环绕、空腔还是分层簇；
3. 检查样本量、噪声水平和维度诅咒；
4. 选最小充分方法：开集直觉 → 连通块 → Euler 账本 → 持久同调 → mapper；
5. 固定评估上限并做参数敏感性；
6. 用非拓扑证据验证语义。

## 4. 分步例题

**题 A**：仓库 Wi-Fi 覆盖审计。输入是接入点位置和半径，关心盲区；选 Čech/nerve，而不是全量 Rips。

**题 B**：单细胞嵌入呈环形轨迹。先看采样密度和镜头函数，再用 mapper 探索；持久 $H_1$ 只是候选周期结构。

**题 C**：三维网格修复。先检查流形性和合法粘合，再算 Euler 示性数定位破洞。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "left": ["Wi-Fi盲区", "细胞环轨迹", "网格破洞", "相位跳变"],
  "right": ["Čech覆盖", "mapper+persistence", "Euler账本", "覆盖提升"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

这张映射盘刻意粗糙：真实工程还要考虑错误恢复、性能和可维护性。

```python title="给问题贴保守方法标签"
cases = [
    {"name": "coverage", "has_balls": True, "large_n": False},
    {"name": "embedding", "has_balls": False, "large_n": True},
]

for case in cases:
    if case["has_balls"] and not case["large_n"]:
        label = "cech-first"
    elif case["large_n"]:
        label = "sample-and-mapper-first"
    else:
        label = "clarify-representation"
    print(case["name"], label)
```

标签是决策提示，不是最终结论。

## 6. 练习

```exercise
# @title: 练习：选择最小充分方法
# @check: connectivity
# @check: euler-ledger
# @check: mapper
# @hint: 只要连通选 connectivity；网格账目选 Euler；高维切片探索选 mapper。
tasks = [
    {"name": "island_count", "method": "persistence"},
    {"name": "mesh_audit", "method": "mapper"},
    {"name": "customer_segments", "method": "cech"},
]

for task in tasks:
    print(task["method"])
```

初始代码全部选了过重的方法。

<details>
<summary>点开查看逐步解答</summary>

按最小充分原则：

```python
answers = ["connectivity", "euler-ledger", "mapper"]
for answer in answers:
    print(answer)
```

孤岛数量只需连通分支；封闭网格完整性先用 Euler 示性数；客户分群的高维探索从 mapper 开始。

</details>

## 7. 本章回望

第 58 章从咖啡杯与甜甜圈出发，建立开集、连通、紧致、分离、同胚和基本群；随后进入单纯复形、Čech/Rips 过滤、持久图与 mapper。你带走的不应是名词表，而是三个习惯：先澄清表示，再选不变量，最后谨慎报告阈值和不确定性。

## 8. 后续接口

- 与第 48 章表示几何衔接：嵌入质量检查；
- 与第 53 章图网络衔接：mapper 节点图的谱分析；
- 与第 54 章可信 AI 衔接：分布偏移下的形状稳定性；
- 与第 55 章科学 ML 衔接：物理场拓扑约束。

## 9. 下一站

下一章可沿代数拓扑继续深入同调计算，或回到卷五主线，把这些形状线索接入可信 AI 和科学机器学习。

→ [第 58 章 · 拓扑与数据几何](./index.md)
