---
title: 可靠性、冗余与故障树
lesson_id: engineering-cybernetics/reliability-redundancy-fault-tree
prereqs:
  - engineering-cybernetics/requirements-closed-loop
volume: 5
layer: L11
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - fault-tree
  - common-cause-failure
applications:
  - aircraft-flight-computer
  - data-center-power
exits:
  - engineering
---

# 可靠性、冗余与故障树

## 1. 开场钩子

飞机常有多台看似重复的飞控计算机，因为单个通道可能因芯片、软件、电源或传感器同时失灵。冗余不是堆设备，而是切断共同失效路径。

## 2. 直觉解释

可靠性关注规定条件下、规定时间内完成任务的概率。串联系统一环断则全断；并联冗余只要一条通路活着就能工作。但共用电源、同一段代码或同一间水淹机房的设备并不真正独立。故障树从顶事件倒推逻辑门和底事件。

## 3. 正式定义

时间 $t$ 内可靠度记作 $R(t)$。独立两部件串联为：

$$R_{series}=R_1R_2.$$

并联为：

$$R_{parallel}=1-(1-R_1)(1-R_2).$$

共因失效 $c$ 会破坏独立性：只要它发生，多条表面独立的通路可能一起断开。

## 4. 分步例题

两条独立链路可靠度均为 $0.9$。单链失效概率是 $0.1$；双链同时失效概率是 $0.01$；并联可靠度是 $0.99$。若有共因失效概率 $0.02$，总失效约为 $0.02+(1-0.02)0.01=0.0298$，远高于天真估计。

## 5. 动手实验

### 实验 1：并联结构对比

```viz
{
  "type": "plot",
  "title": "并联冗余提升可靠度",
  "expr": "1-(1*x)**n",
  "xmin": 0.7,
  "xmax": 1,
  "sliders": [
    { "name": "n", "min": 1, "max": 4, "step": 1, "value": 2 }
  ]
}
```

横轴是单元可靠度，纵轴是结构可靠度。冗余在高可靠区收益更明显，但也带来维护成本。

### 实验 2：共因失效的有界扫描

```python title="双通道系统的故障树账本"
# sliders: independent_failure=0.010 [0.001:0.030:0.001], common_cause=0.020 [0:0.050:0.002]
events = ["CPU-A", "CPU-B", "power-A", "power-B"] # 底事件固定，循环有界
max_steps = len(events)
critical_cuts = []

for step in range(max_steps):
    name = events[step]
    if name.startswith("power"):
        critical_cuts.append(name)   # 简化模型：电源事件进入关键割集

p_single = (independent_failure / 2) ** 2 * 2      # 两路各自 CPU+电源的简化概率
total_failure = 1 - (1 - common_cause) * (1 - p_single)
print(f"扫描终点={max_steps-1}")
print(f"关键割集={', '.join(critical_cuts)}")
print(f"忽略共因={p_single:.5f}")
print(f"含共因={total_failure:.5f}")
```

增大共因滑块，总失效迅速上升。冗余必须审查物理隔离、软件多样性和维护流程。

## 6. 练习

```exercise
# @title: 练习：修正并联可靠度
# @check: 0.99
# @hint: 先算两条独立支路同时失效的概率，再用 1 减去它。
r1 = 0.9
r2 = 0.9
system_reliability = r1 * r2
print(round(system_reliability, 2))
```

<details>
<summary>点开查看逐步解答</summary>

初始代码算的是串联可靠度 $0.81$。并联应为 $1-(1-0.9)(1-0.9)=0.99$。

</details>

## 7. 概念快问快答

```quiz
哪组最可能构成危险的共因失效？
- 两台设备分别放在不同供电机房
- 两台服务器接入同一配电柜并被同一水管滴漏 [*]
- 关键模块用两种语言分别重写并隔离部署
? 共因失效会一次打掉多条表面独立的通路，使并联公式失效。
```

## 8. 常见误区

:::warning[常见误区]

**误区一**：你以为备件数量等于可靠性。切换机构、传感器和公共能源也可能是薄弱点。

**误区二**：你以为故障树给出精确概率。它首先是组织失效逻辑的工具，数值依赖数据质量。

**误区三**：你以为冗余总是值得。重量、成本、维修复杂度和误切风险都要计入。

:::

## 9. 选读：最小割集

<details>
<summary>选读 · 最小失效组合</summary>

割集是一组同时发生就会导致顶事件的底事件；最小割集去掉任一事件后不再导致顶事件。优先消除单点割集和高概率二阶割集，通常比平均加固所有部件更有效。

</details>

## 10. 下一站

故障发生后如何定位并安排维护？下一课讲可观测性与诊断决策。

→ [可观测性、诊断和维护决策](./75-diagnosis-maintenance-decision.md)
