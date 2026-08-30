---
title: 可观测性、诊断和维护决策
lesson_id: engineering-cybernetics/diagnosis-maintenance-decision
prereqs:
  - engineering-cybernetics/reliability-redundancy-fault-tree
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
  - diagnostic-observability
  - maintenance-tradeoff
applications:
  - wind-turbine-maintenance
  - metro-fleet-health
exits:
  - engineering
---

# 可观测性、诊断和维护决策

## 1. 开场钩子

风机可以等坏了再修，但吊车进场一次很贵；也可以每季度检修，却浪费剩余寿命。维护要在看不见的健康状态、误报和漏报之间找平衡。

## 2. 直觉解释

诊断是逆问题：由观测反推内部故障。可观测性回答“传感器够不够区分故障”；维护决策回答“何时动作最划算”。误报浪费停机时间，漏报可能变成事故。

## 3. 正式定义

设健康状态为 $h$，观测为 $y$。若两个不同健康状态在所有允许测量下产生相同结果，就诊断不可分。期望维护代价可写成：

$$J(a)=C_{repair}P_{fault}+C_{downtime}P_{false}+C_{delay}P_{miss}.$$

阈值应比较继续运行与立即维护的期望总代价。

## 4. 分步例题

立即停机成本 10 万元，若真故障损失 100 万元，当前故障概率估计为 0.15。继续运行的期望损失约 15 万元；若停机成本更低且风险不会马上下降，应选择停机。

## 5. 动手实验

### 实验 1：症状映射

```viz
{
  "type": "set-mapper",
  "left": ["轴承温度升高", "电流谐波变宽", "振动峰值左移", "润滑油压下降"],
  "right": ["摩擦增大", "负载波动", "转速异常", "润滑不足"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

单一症状通常不能唯一定因，要把多个观测和工况放在一起。

### 实验 2：维护阈值扫描

```python title="有限阈值集合中的最小代价"
# sliders: repair_cost=10 [2:30:1], fault_loss=100 [20:200:5]
thresholds = [0.05, 0.10, 0.15, 0.20] # 阈值列表固定终点
false_rate = [0.20, 0.12, 0.07, 0.04]
miss_rate = [0.08, 0.06, 0.04, 0.03]
best_cost = None
best_index = -1

for i in range(len(thresholds)):
    p_fault = thresholds[i]
    cost = repair_cost + fault_loss * (p_fault * miss_rate[i] + (1-p_fault) * false_rate[i])
    if best_cost is None or cost < best_cost:
        best_cost = cost
        best_index = i

print(f"最佳阈值={thresholds[best_index]:.2f}")
print(f"最小相对代价={best_cost:.2f}")
```

提高事故损失滑块，最佳阈值通常会前移：宁可早修，也不冒高损失风险。

## 6. 练习

```exercise
# @title: 练习：计算期望损失并选动作
# @check: 18.00
# @check: maintain
# @hint: 期望损失=故障概率×故障损失；相等时按安全策略偏向维护。
failure_probability = 0.12
failure_loss = 150
downtime_cost = 18
expected_loss = failure_probability + failure_loss   # 错：把概率当金额直接相加
action = "wait"                                       # 错：还没比较就先下结论
print(f"{expected_loss:.2f}")
print(action)
```

<details>
<summary>点开查看逐步解答</summary>

期望损失是 $0.12\times150=18$。初始代码把概率当金额相加；两者相等时应输出 `maintain`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为传感器越多越好。不可分辨的观测只会增加成本。

**误区二**：你以为准确率足够。类别不平衡时，漏报代价可能远高于误报。

**误区三**：你以为预测寿命就是维护日期。还要看备件、窗口、安全和生产计划。

:::

## 8. 选读：状态监测

<details>
<summary>选读 · 滤波与剩余寿命</summary>

工程中常把温度、振动、油液数据融合成健康指标，再用退化模型预测剩余有用寿命。预测必须给出不确定度，否则无法做风险决策。

</details>

## 9. 快问快答

```quiz
两类故障产生完全相同的所有可测症状时叫什么？
- 完全可控
- 诊断不可分 [*]
- 必然稳定
? 即使状态可观测，若测量集合太弱，故障模式仍可能无法区分。
```

## 10. 下一站

从单台设备转向整个系统资源。下一课讲最优调度与分配。

→ [最优调度与资源分配](./80-optimal-scheduling-allocation.md)
