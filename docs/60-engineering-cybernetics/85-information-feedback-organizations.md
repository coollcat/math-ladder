---
title: 信息反馈在组织系统中的作用
lesson_id: engineering-cybernetics/information-feedback-organizations
prereqs:
  - engineering-cybernetics/queueing-throughput
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
  - organizational-feedback-loop
applications:
  - incident-review
  - production-improvement
exits:
  - engineering
---

# 信息反馈在组织系统中的作用

## 1. 开场钩子

事故后若只追责个人，流程缺陷会留下；若反馈能指向接口、培训和设计，同类事故才会减少。组织也是控制系统，只是传感器是人，执行器是流程和激励。

## 2. 直觉解释

组织回路包括测量、解释、决策、行动和复盘。坏消息衰减、指标造假和审批延迟会降低增益或引入滞后。好的制度让关键信息准时到达能改变系统的人。

## 3. 正式定义

把偏差记作 $e_k$，第 $i$ 个部门的修正强度为 $g_i$，信息延迟为 $\tau_i$：

$$e_{k+1}=e_k-\sum_i g_i e_{k-\tau_i}+n_k.$$

$n_k$ 是新任务和扰动。延迟大时，同样高的热情也可能引起振荡。

## 4. 分步例题

检验部门当天发现缺陷，客户投诉两周后回流。快回路适合即时拦截，慢回路适合根因复盘；若两者混在同一频率上，短期指标改善可能掩盖重复故障。

## 5. 动手实验

```python title="组织纠偏中的时延效应"
# sliders: gain=0.45 [0.05:1.00:0.05], delay=3 [0:6:1]
history = [1.0, 1.0, 1.0]     # 初始历史：模拟过去三期偏差
max_steps = 16                # 最大迭代数，避免无限运行

for step in range(max_steps):
    index = max(0, len(history) - 1 - delay)      # 取延迟期前的信息；启动期没有更早数据就用最早记录
    correction = gain * history[index]
    history.append(history[-1] - correction)

print(f"终点步={len(history)-1}")
print(f"最终偏差={history[-1]:.3f}")
print("轨迹=" + ", ".join(f"{value:.2f}" for value in history[-6:]))
```

增大延迟滑块，同样纠偏增益更容易过冲。周报、审批和考核周期就是这类延迟。

```viz
{
  "type": "set-mapper",
  "left": ["现场隐患照片", "退货数据", "停机日志", "培训结果"],
  "right": ["当日整改", "质量根因", "维护计划", "能力建设"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

不同信息的时效和接收者不同，统一塞进月报会浪费快信号。

## 6. 练习

```exercise
# @title: 练习：识别反馈要素
# @check: sensor
# @check: actuator
# @hint: 现场检查像传感器；整改通知像执行器。
def classify(item):
    labels = {"site-inspection": "controller", "work-order": "controller"}
    return labels[item]

print(classify("site-inspection"))
print(classify("work-order"))
```

<details>
<summary>点开查看逐步解答</summary>

现场检查采集状态，应标为 `sensor`；整改通知改变流程，应标为 `actuator`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为开会就有反馈。没有记录和验证只是广播。

**误区二**：你以为指标透明一定变好。错误指标会诱导局部最优甚至造假。

**误区三**：你以为惩罚越重越有效。过度惩罚抑制坏消息，削弱传感通道。

:::

## 8. 选读：安全文化

<details>
<summary>选读 · 报告与学习</summary>

高可靠组织先恢复系统，再无责收集事实，最后区分可接受误差与违规设计，从而保留关键负反馈。

</details>

## 9. 快问快答

```quiz
组织反馈中的相位滞后最像什么？
- 纪要字体太小
- 问题很久后才传到决策者手中 [*]
- 组织图颜色不一致
? 滞后让纠正动作对准旧状态，可能放大振荡。
```

## 10. 下一站

自动化程度越高，人机边界越关键。下一课讨论安全边界。

→ [自动化、人和安全边界](./90-automation-human-safety-boundary.md)
