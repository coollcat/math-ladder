---
title: 最优调度与资源分配
lesson_id: engineering-cybernetics/optimal-scheduling-allocation
prereqs:
  - engineering-cybernetics/diagnosis-maintenance-decision
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
  - resource-shadow-price
  - scheduling-horizon
applications:
  - satellite-task-scheduling
  - factory-shift-planning
exits:
  - engineering
---

# 最优调度与资源分配

## 1. 开场钩子

地面站只有有限通信窗口，工厂只有固定工时。调度不是把任务塞进日历，而是在容量、截止时间和切换成本之间寻找全局可行解。

## 2. 直觉解释

资源分配的核心是边际收益：下一单位资源给谁？收益递减时，不断给当前边际最高者直到约束用尽；若有顺序依赖或切换成本，还必须检查时间先后。

## 3. 正式定义

$$\max_x \sum_i b_i(x_i)\quad\text{s.t.}\quad \sum_i x_i\le B,\quad x_i\ge0.$$

若 $b_i$ 可微且凹，内点最优满足 $b_i'(x_i)=\lambda$。$\lambda$ 是影子价格：放松一单位总量约束带来的近似边际收益。

## 4. 分步例题

两任务共享 5 小时，收益分别为 $b_A=8x_A-x_A^2$ 和 $b_B=6x_B-x_B^2$。边际收益为 $8-2x_A$ 和 $6-2x_B$。令两者相等并代入总量，得 $x_A=3$、$x_B=2$；对应边际大小为 2，这就是影子价格。注意最优解只用满 5 小时约束：若把总量放宽到 10，两个任务各自的饱和点（4 与 3）加起来都不到 10，多出的时间不值得投入。

## 5. 动手实验

### 实验 1：贪心增量分配

```python title="离散资源的有限增量分配"
# sliders: budget=10 [4:16:1], step=0.5 [0.1:1:0.1]
allocations = [0.0, 0.0]       # 两个任务的初始分配
max_steps = int(16 / step)     # 最大步数上限，保证有界

for step_index in range(max_steps):
    if sum(allocations) >= budget - 1e-9:
        break
    marginal_a = max(8 - 2 * allocations[0], 0) # A 的当前边际收益
    marginal_b = max(6 - 2 * allocations[1], 0)
    if marginal_a <= 0 and marginal_b <= 0:
        break
    amount = min(step, budget - sum(allocations))
    if marginal_a >= marginal_b:
        allocations[0] += amount
    elif marginal_b > 0:
        allocations[1] += amount

benefit_a = 8 * allocations[0] - allocations[0] ** 2
benefit_b = 6 * allocations[1] - allocations[1] ** 2
print(f"A={allocations[0]:.2f}, B={allocations[1]:.2f}")
print(f"总收益={benefit_a+benefit_b:.2f}")
```

缩小步长更接近连续最优。这个贪心法适合凹收益；有启动成本或顺序约束时要换方法。

### 实验 2：边际收益递减

```viz
{
  "type": "plot",
  "title": "A 的边际收益递减",
  "expr": "(8 - 2*x + abs(8 - 2*x)) / 2",
  "expr2": "price",
  "xmin": 0,
  "xmax": 5,
  "sliders": [
    { "name": "price", "min": 0, "max": 8, "step": 0.5, "value": 3 }
  ]
}
```

橙色水平线代表资源价格；蓝色曲线是 A 的边际收益。曲线高于横线的区间才值得投入；拖高价格，可投入区间收窄。

## 6. 练习

```exercise
# @title: 练习：修正比例分配
# @check: 6
# @check: 3
# @hint: 权重 2:1 的总权重是 3，不是任务数 2。
budget = 9
weights = [2, 1]
for weight in reversed(weights):
    print(round(budget * weight / len(weights)))
```

<details>
<summary>点开查看逐步解答</summary>

单位权重分到 $9/3=3$，因此分配应为 6 和 3。初始代码用 `len(weights)` 当总权重，又把顺序反过来。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为先来先服务公平。它可能让高价值紧急任务长期等待。

**误区二**：你以为局部最快就是全局最优。切换成本会改变排序。

**误区三**：你以为影子价格只是财务量。它告诉你放松哪个约束能带来最多收益。

:::

## 8. 选读：滚动时域

<details>
<summary>选读 · 计划随信息更新</summary>

滚动时域每次只优化未来有限窗口，执行第一步后根据新观测重算。它在长周期不确定性和实时反馈之间折中，广泛用于电网、供应链和机器人调度。

</details>

## 9. 快问快答

```quiz
凹收益函数下，均衡分配的标志是什么？
- 所有任务平均分配
- 未触界任务的边际收益相等 [*]
- 总收益等于预算
? 边际不等时，总能从低边际任务转移少量资源到高边际任务来改进目标。
```

## 10. 下一站

任务到达本身常有随机性。下一课用排队论分析吞吐量与等待。

→ [排队论与吞吐量](./81-queueing-throughput.md)
