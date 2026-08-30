---
title: 工程控制论方法地图
lesson_id: engineering-cybernetics/engineering-cybernetics-method-map
prereqs:
  - engineering-cybernetics/automation-human-safety-boundary
volume: 5
layer: L11
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cybernetic-method-selection
applications:
  - system-of-systems-review
  - safety-case-writing
exits:
  - engineering
  - research
---

# 工程控制论方法地图

## 1. 开场钩子

拿到一个大系统问题，最大风险不是不会公式，而是用错层级：给战略问题做毫秒控制，或给实时失稳写年度报告。方法地图帮你先选问题形状，再选工具。

## 2. 直觉解释

先问五件事：

1. 边界在哪里？哪些量可控？
2. 关键状态能否观测？
3. 主导扰动在什么频段和时间尺度？
4. 失效路径和安全边界是什么？
5. 组织反馈能否修正模型和需求？

## 3. 方法对照

| 问题形状 | 首选方法 | 本章落点 |
| --- | --- | --- |
| 输入输出关系未知 | 黑箱探测 | 20 |
| 内部状态隐藏 | 状态估计与可观测性 | 25、75 |
| 高频振荡或失稳 | Bode/Nyquist 与裕度 | 30–50 |
| 多子系统耦合 | 分解协调与影子价格 | 55、80 |
| 随机到达与拥堵 | 排队与 Little 定律 | 81 |
| 故障传播 | 故障树与共因分析 | 70 |
| 人机责任模糊 | 独立保护层 | 90 |

## 4. 分步例题

城市轨道交通高峰拥挤，先画边界和瓶颈；再用排队判断利用率；用分层控制区分行车计划与站台限流；用诊断决定维护窗口；最后用组织反馈更新时刻表需求。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "left": ["频率穿越不稳", "队列爆炸", "多区资源冲突", "隐藏健康状态", "共因断电"],
  "right": ["Nyquist/Bode", "排队论", "分解协调", "状态估计/诊断", "故障树"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]
}
```

这张映射盘刻意粗糙。真实项目常要组合多种方法，并明确证据由谁验证。

```python title="有限条目的方法推荐"
# sliders: has_hidden_state=1 [0:1:1]
features = {"frequency-risk": False, "queueing": True, "hidden-state": bool(has_hidden_state)}

if features["frequency-risk"]:
    answer = "bode-nyquist-margin"
elif features["queueing"]:
    answer = "little-law-bottleneck"
elif features["hidden-state"]:
    answer = "observer-diagnosis"
else:
    answer = "requirements-loop"

print(answer)
```

改布尔值和滑块，体会优先级：安全失稳通常先于性能优化。

## 6. 练习

```exercise
# @title: 练习：输出正确方法标签
# @check: queueing
# @check: fault-tree
# @hint: 到达率接近服务率选 queueing；一次断电打掉多条通路选 fault-tree。
def choose(utilization, common_cause):
    return "nyquist"

print(choose(0.97, False))
print(choose(0.60, True))
```

<details>
<summary>点开查看逐步解答</summary>

高利用率且未稳定对应 `queueing`；共同原因能打掉冗余通路对应 `fault-tree`。初始函数忽略了两个判据。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为一张图解决一切。方法组合必须说明假设和适用范围。

**误区二**：你以为复杂系统只能整体仿真。合理分解常比黑箱巨模型更可审。

**误区三**：你以为历史贡献可以简化成口号。《工程控制论》的价值在于跨装置的系统分析方法。

:::

## 8. 选读：从方法到证据链

<details>
<summary>选读 · 系统之系统评审</summary>

大型项目需要把需求追踪、模型假设、试验证据、运行数据和变更记录连成链。每个结论都要能回答：哪个模型、哪组工况、谁负责更新。

</details>

## 9. 本章回望

你带走的不应是名词清单，而是一条闭环：建模边界、估计状态、检查稳定性、协调层级、验证需求、分析失效、安排资源和修正组织反馈。钱学森《工程控制论》提醒我们，数学结构与工程实现必须在同一张图上看。

## 10. 下一站

下一章可进入图与网络、可信 AI 或科学计算前沿；本章的方法地图会成为它们共同的工程入口。

→ [第 53 章 · 图与网络](../53-graphs-networks/index.md)
