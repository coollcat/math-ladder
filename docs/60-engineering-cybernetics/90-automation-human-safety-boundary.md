---
title: 自动化、人和安全边界
lesson_id: engineering-cybernetics/automation-human-safety-boundary
prereqs:
  - engineering-cybernetics/information-feedback-organizations
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
  - human-automation-boundary
  - safety-instrumented-system
applications:
  - autonomous-driving
  - chemical-plant-shutdown
exits:
  - engineering
---

# 自动化、人和安全边界

## 1. 开场钩子

自动驾驶宣传里最危险的一句话是“几乎不需要人接管”。人的注意力会被自动化吸走；一旦系统交回控制权，人可能既缺时间也缺情境意识。

## 2. 直觉解释

自动化的目标不是取消人，而是重新分配任务。机器擅长快速重复计算，人擅长处理新颖情境和伦理责任。安全边界必须回答三个问题：谁能观测？谁有权限动作？失效时如何降级？

## 3. 正式定义

设自动化能力集合为 $A$，人类职责集合为 $H$，共享区为 $S=A\cap H$。安全约束要求危险状态集 $F$ 满足：

$$F\cap S=\varnothing,$$

或共享区必须有明确切换协议。独立保护层应能在主控失效时把系统带入安全态。

## 4. 分步例题

化工装置设置三级策略：基础控制维持温度；监督报警提示操作员；联锁系统在超温时切断进料。第三级不依赖操作员反应速度，也不依赖主控制器正常，因此是最后一道物理边界。

## 5. 动手实验

```python title="接管时间的有限情景表"
# sliders: automation_reliability=0.98 [0.80:0.999:0.001], takeover_time=4 [1:12:1]
scenarios = ["clear-road", "construction-zone", "sensor-fog", "unmapped-event"] # 固定终点列表
risk_multiplier = [1, 3, 6, 10]
results = []

for i in range(len(scenarios)):
    residual_risk = (1 - automation_reliability) * risk_multiplier[i]
    human_delay_penalty = max(0.0, takeover_time - 3) / 10 * risk_multiplier[i]
    results.append(residual_risk + human_delay_penalty)

worst_index = results.index(max(results))
print(f"最坏场景={scenarios[worst_index]}")
print(f"最坏风险指数={max(results):.3f}")
```

提高可靠性不等于消除风险；接管时间和场景难度也会决定边界位置。

```viz
{
  "type": "set-mapper",
  "left": ["车道保持", "紧急制动", "路线重规划", "超温切断进料"],
  "right": ["局部控制", "自动保护层", "人与系统共享", "自动保护层"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

危险最后的执行者不应是需要等待批准的人或已经失效的主控。

## 6. 练习

```exercise
# @title: 练习：判断是否满足独立保护原则
# @check: no
# @hint: 最后一级不能依赖主控制器、同一电源和人工反应。
main_controller_alive = True
operator_response_required = True
independent_final_barrier = main_controller_alive or not operator_response_required
verdict = "yes" if independent_final_barrier else "no"
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

初始逻辑用“或”把主控存活当成充分条件，违背独立性。真正最后屏障应在主控失效时仍可触发，且不需要人工及时反应。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为自动化减少所有人为错误。它也会引入模式混淆和技能退化。

**误区二**：你以为报警越多越安全。报警泛滥会淹没关键信号。

**误区三**：你以为人总能兜底。没有时间、信息和权限的兜底只是名义责任。

:::

## 8. 选读：纵深防御

<details>
<summary>选读 · 多层屏障</summary>

安全工程常用预防、控制、缓解和应急多层屏障。每层要独立评估电源、通信、传感器和维护流程，避免一层事故打穿所有层。

</details>

## 9. 快问快答

```quiz
安全仪表系统的关键特征是什么？
- 提供更漂亮的驾驶界面
- 独立监测并在必要时把过程带入安全态 [*]
- 记录更多用户行为数据
? 它是最后保护层，应尽量少依赖可能同时失效的主控和人工响应。
```

## 10. 下一站

最后一课把本章方法收成一张可携带的地图。

→ [工程控制论方法地图](./95-engineering-cybernetics-method-map.md)
