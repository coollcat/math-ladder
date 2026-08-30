---
title: 编码理论方法地图
lesson_id: coding-theory/method-map
prereqs:
  - coding-theory/entropy-redundancy
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - code-selection-map
applications:
  - system-design
  - protocol-review
exits:
  - engineering
  - research
---

# 编码理论方法地图

## 1. 从一个场景开始

深空探测器、内存条、二维码、Wi-Fi 和硬盘不会选同一种码。它们面对的错误率、延迟、功耗和硬件预算不同。方法地图不是排名榜，而是把需求翻译成设计参数的路线图。

## 2. 直觉解释

选码至少问五个问题：

1. 错误是孤立翻转还是成串突发？
2. 每块能容忍多少延迟？
3. 码率重要还是纠错能力重要？
4. 译码器能承受多大复杂度？
5. 需要检错重传、前向纠错，还是两者结合？

答案不同，主角就会从重复码变成 Hamming 码、CRC、卷积码或 LDPC。

## 3. 正式定义

方法地图可以用四个坐标概括：

| 坐标 | 含义 | 常见权衡 |
| --- | --- | --- |
| 码率 $R=k/n$ | 每个传输位承载的信息比例 | 高码率省带宽，低码率更强壮 |
| 最小距离 $d_{\min}$ | 保证检错与纠错半径 | 距离越大，冗余和复杂度常越高 |
| 约束长度 / 图规模 | 编码记忆或校验图大小 | 更强纠错往往带来更长延迟 |
| 译码复杂度 | 硬件与能耗成本 | 软判决更准，但计算更贵 |

没有单一最优码；只有在具体信道和系统约束下的合适码。

## 4. 分步例题

三种场景可以这样初选：

| 场景 | 主要矛盾 | 合适方向 |
| --- | --- | --- |
| 单片机传感器偶尔丢一位 | 硬件极小 | 奇偶校验或短 Hamming 码 |
| 深空链路能量稀缺 | 每比特功率宝贵 | 卷积码/Turbo/LDPC，低码率软判决 |
| 存储介质突发划痕 | 错误连续成串 | 交织 + Reed-Solomon 类代数码 |

初选之后还要算码率、时延和失败模式；地图只是防止一开始拿错工具。

## 5. 动手实验

### 实验：需求打分选择器

```python title="根据带宽、延迟和可靠性偏好排序"
methods = {
    "parity":   {"rate": 0.95, "strength": 1, "complexity": 1},
    "hamming":  {"rate": 0.57, "strength": 2, "complexity": 2},
    "conv":     {"rate": 0.50, "strength": 3, "complexity": 3},
    "ldpc":     {"rate": 0.75, "strength": 4, "complexity": 4}
}

weights = {
    "rate": 0.2,          # 越看重带宽，权重越大
    "strength": 0.7,      # 可靠性优先
    "complexity": 0.1     # 分数越高表示复杂度越高，最后要扣分
}

scores = {}
for name, traits in methods.items():   # items() 同时取出键和值
    score = (
        weights["rate"] * traits["rate"]
        + weights["strength"] * traits["strength"]
        - weights["complexity"] * traits["complexity"]
    )
    scores[name] = round(score, 2)     # round：保留两位小数便于阅读

best = None
for name, score in scores.items():
    if best is None or score > scores[best]:
        best = name

print("scores =", scores)
print("best   =", best)
```

把 `strength` 权重降到 0.1，把 `rate` 提到 0.8，再看赢家如何变化。这就是工程选型的核心动作。

## 6. 常见误区

:::warning[常见误区]

**误区一**：以为存在全能最强码。任何能力都要用带宽、延迟、功耗或复杂度支付。

**误区二**：以为高码率一定省钱。若重传风暴增加，看似高效的检错码可能比前向纠错更贵。

**误区三**：以为只看平均错误率就够。突发错误、失败后果和峰值延迟同样决定方案成败。

:::

## 7. 练习

```exercise
# @title: 练习：为场景选出初始方法
# @check: choice=ldpc
# @check: reason=high-reliability-and-good-rate
# @hint: 场景要求强纠错，同时不能接受过低的码率；不要只看实现简单。
need_reliability = 5
bandwidth_scarce = True
can_afford_complexity = True

choice = "parity"
reason = "lowest-complexity"

if need_reliability < 3:
    choice = "hamming"
    reason = "single-error-correction"

print(f"choice={choice}")
print(f"reason={reason}")
```

<details>
<summary>点开查看逐步解答</summary>

可靠性和带宽都重要，且系统能承担适度复杂度，因此 LDPC 是更好的起点：

```python
need_reliability = 5
bandwidth_scarce = True
can_afford_complexity = True
choice = "parity"
reason = "lowest-complexity"
if need_reliability >= 4 and bandwidth_scarce and can_afford_complexity:
    choice = "ldpc"
    reason = "high-reliability-and-good-rate"
print(f"choice={choice}")
print(f"reason={reason}")
```

真实项目还要比较 Turbo 码、Polar 码、交织方案和标准兼容性；课堂练习只训练第一步筛选。

</details>

## 8. 快问快答

```quiz
编码理论有没有对所有场景都最好的码？
- 有，LDPC 总是最好
- 有，最小距离最大的码总赢
- 没有，必须按信道和系统约束选择 [*]
? 码率、距离、时延、功耗和复杂度互相拉扯。脱离约束谈“最好”没有工程意义。
```

## 9. 选读：继续往前走的三个入口

<details>
<summary>选读 · 从地图到专题</summary>

想深入工程实现，可以读 Turbo 与 LDPC 的软判决译码；想深入代数，可以学有限域、BCH 和 Reed-Solomon；想理解根本边界，可以去第 40 章学习熵、互信息和信道容量。本章给了你词汇和直觉，接下来可以按出口选择支线。

</details>

## 10. 全章回望

从一条会翻转的信道开始，你已经走过：冗余、多数表决、奇偶校验、Hamming 距离、最近邻译码、线性码、生成与校验矩阵、Hamming(7,4)、最小距离、卷积记忆、多项式循环、稀疏图，直到熵和方法选择。下一站不再是“能不能纠”，而是“信息的极限在哪里”。

→ [第 40 章 · 信息论](../40-information-theory/index.md)
