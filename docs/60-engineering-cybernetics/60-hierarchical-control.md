---
title: 分层控制：调度、监督、局部回路
lesson_id: engineering-cybernetics/hierarchical-control
prereqs:
  - engineering-cybernetics/large-system-decomposition
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
  - hierarchical-timescales
applications:
  - grid-dispatch
  - airport-operation
exits:
  - engineering
---

# 分层控制：调度、监督、局部回路

## 1. 开场钩子

电网调度中心提前一天定机组组合，几分钟级监督频率偏差，毫秒级逆变器稳住电压。三层不能互相代替：调度太慢，无法救急；局部回路太快，看不见全局经济性。

## 2. 直觉解释

| 层 | 时间尺度 | 问题 | 典型输出 |
| --- | --- | --- | --- |
| 调度 | 小时到天 | 资源怎么排 | 计划、预算、配额 |
| 监督 | 秒到分钟 | 偏差怎么办 | 参考值重分配 |
| 局部回路 | 毫秒到秒 | 怎么跟踪参考 | 阀门、电流、舵面指令 |

上层给目标，下层执行；下层状态经滤波汇总后反馈给上层。层级之间必须有带宽隔离，避免慢计划和快控制互相打架。

## 3. 正式定义

设第 $i$ 个快速子系统：

$$\dot x_i=f_i(x_i,u_i,d_i),\qquad u_i=k_i(x_i,r_i).$$

监督层在较慢周期 $T_s$ 内根据聚合误差更新参考：

$$r_i^{new}=r_i+\alpha_i\frac{e}{\sum_j\alpha_j}.$$

$e$ 是总偏差，$\alpha_i$ 表示能力或成本权重。调度层再以小时为单位修改可用能力和约束。

## 4. 分步例题

三个空调区共同限电 12 kW，当前参考合计 15 kW。

1. 总超量 $e=3$ kW；
2. 能力权重为 A:B:C=2:1:1；
3. 总权重是 4；
4. 削减量为 1.5、0.75、0.75 kW；
5. 新参考为 8.5、9.25、9.25 kW（假设原参考均为 10）。

## 5. 动手实验

### 实验 1：三层数据流仿真

```python title="电网调频的三层有限时段演示"
# sliders: total_error=-18 [-40:40:2], horizon=8 [2:20:1]
weights = [2, 1, 1]          # 三个机组的响应能力权重
references = [100, 100, 100] # 监督层下发的参考功率
actuals = [96, 98, 99]       # 局部回路当前实际功率
h = 1.0                      # 步长：监督层每秒更新一次
end_time = horizon * h       # 时间终点由滑块限制
max_steps = int(end_time / h)

for step in range(max_steps):
    measured_total = sum(actuals)               # 上传聚合测量
    residual = (measured_total + total_error) - sum(references) # 简化偏差
    share = residual / sum(weights)              # 平均分摊基础项
    for i in range(len(references)):
        references[i] += h * weights[i] * share * 0.2   # 慢速监督修正
        actuals[i] += h * 0.5 * (references[i] - actuals[i]) # 快速一阶跟踪

print(f"终点时间={end_time:.0f}s")
print("参考=" + ", ".join(f"{value:.1f}" for value in references))
print("实际=" + ", ".join(f"{value:.1f}" for value in actuals))
```

增大总误差，监督层改变参考；局部回路的响应速度保持较快。这个例子省略安全约束，只展示时间尺度分工。

### 实验 2：层级目标映射

```viz
{
  "type": "set-mapper",
  "left": ["明日机组启停", "频率偏差重分配", "阀门开度跟踪", "年度检修窗口"],
  "right": ["调度层", "监督层", "局部回路", "调度层"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

这张已有组件被用作分类盘：点击中间圆点核对任务与时间尺度的连线，比记名词更重要。

## 6. 练习

```exercise
# @title: 练习：按权重分配削减量
# @check: 1.50
# @check: 0.75
# @check: 0.75
# @hint: 每个单元承担 e*weight/sum(weights)。
total_cut = 3.0
weights = [2, 1, 1]
cuts = []
for weight in reversed(weights):
    cuts.append(total_cut * weight / len(weights))   # 错：分母用了单元数，顺序也反了
for value in cuts:
    print(f"{value:.2f}")
```

<details>
<summary>点开查看逐步解答</summary>

总权重为 4。单位权重削减 $3/4=0.75$；因此 A 削减 1.5，B 和 C 各削减 0.75。初始代码有两处问题：用 `len(weights)` 当总权重（应为 `sum(weights)`），又用 `reversed` 把输出顺序倒了个。

</details>

## 7. 概念快问快答

```quiz
分层控制系统里，监督层的主要职责是什么？
- 直接生成毫秒级开关信号
- 根据聚合偏差重新分配下层参考 [*]
- 取消所有局部控制器
? 监督层处在调度和快速回路之间，负责跨子系统的偏差协调。
```

## 8. 常见误区

**误区一**：你以为上层永远更聪明。它看得广但慢，必须尊重下层物理极限。

**误区二**：你以为各层可以随便通信。频繁双向指令会造成时延冲突和振荡。

**误区三**：你以为层级只是组织图。它对应不同模型精度、时间尺度和责任边界。

## 9. 选读：带宽分离

<details>
<summary>选读 · 为什么频率要隔开</summary>

若监督层的修正频率接近局部回路谐振频率，两条动态会互相激励。工程上常让上层带宽显著低于下层闭环带宽，并对上传数据低通滤波，减少噪声进入计划。

</details>

## 10. 下一站

控制不只是数学，还要回答“用户到底要什么”。下一课进入系统工程的需求闭环。

→ [系统工程的需求闭环](./65-requirements-closed-loop.md)
