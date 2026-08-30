---
title: 大系统分解与协调
lesson_id: engineering-cybernetics/large-system-decomposition
prereqs:
  - engineering-cybernetics/robust-control-tradeoff
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
  - decomposition-coordination
applications:
  - interconnected-power-grid
  - multi-plant-production
exits:
  - engineering
---

# 大系统分解与协调

## 1. 开场钩子

一个区域电网包含成千上万机组、负荷和线路。中央控制器不可能每秒直接命令每个开关；工程师把问题切开：每个区域先求解自己的计划，再用联络线功率和价格协调边界。

## 2. 直觉解释

分解不是简单切块，而是识别弱耦合：

| 方法 | 适用情况 | 协调量 |
| --- | --- | --- |
| 时间分层 | 慢计划与快控制分离 | 目标值 |
| 空间分区 | 子系统内部联系强 | 边界流量 |
| 资源价格 | 共享资源竞争 | 影子价格 |
| 约束聚合 | 只需保证总量 | 配额 |

好的分解让局部计算可并行，同时保留耦合约束。

## 3. 正式定义

总问题：

$$\min_{x_1,\dots,x_n}\sum_i f_i(x_i)\quad\text{s.t.}\quad \sum_i A_i x_i=b.$$

给共享资源分配影子价格 $p$，子系统解：

$$x_i(p)=\arg\min_x \lbrace f_i(x)+p^\top A_i x\rbrace.$$

协调器根据 $\sum_iA_ix_i(p)-b$ 更新 $p$：资源短缺则涨价，过剩则降价。

## 4. 分步例题

两个工厂共用 10 单位电力。

1. 工厂 A 的边际收益为 $8-x_A$；
2. 工厂 B 的边际收益为 $6-x_B$；
3. 最优时两者边际净收益相等，且 $x_A+x_B=10$；
4. 由 $8-x_A=6-x_B$ 得 $x_B=x_A-2$；
5. 代入得 $2x_A-2=10$，所以 $x_A=6$，$x_B=4$，统一价格是 2。

## 5. 动手实验

### 实验 1：价格协调迭代

```python title="共享资源的有限次协调"
# sliders: price=2.0 [0:5:0.1], total_supply=10 [4:16:1]
h = 0.25                 # 步长：价格更新系数
max_steps = 20           # 最大迭代数：不使用无限循环
demand_a = 0             # 工厂 A 当前需求量
demand_b = 0             # 工厂 B 当前需求量

for step in range(max_steps):
    demand_a = max(0.0, min(8.0, 8.0 - price))       # A 的边际收益截断
    demand_b = max(0.0, min(6.0, 6.0 - price))       # B 的边际收益截断
    imbalance = demand_a + demand_b - total_supply   # 市场不平衡量
    if abs(imbalance) < 0.001 and step > 0:          # 提前停止条件
        break
    price = max(0.0, price + h * imbalance)          # 短缺涨价，过剩降价

print(f"迭代终点={step}")
print(f"协调价格={price:.3f}")
print(f"A={demand_a:.3f}, B={demand_b:.3f}")
print(f"总需求={demand_a+demand_b:.3f}, 供给={total_supply:.1f}")
```

拖动供给滑块，观察影子价格如何变化；供给越紧，价格越高，稀缺信息就传给了所有子系统。

### 实验 2：边界流量的静态映射

```viz
{
  "type": "plot",
  "title": "联络线功率随价格下降",
  "expr": "(capacity - x + abs(capacity - x)) / 2",
  "xmin": 0,
  "xmax": 6,
  "sliders": [
    { "name": "capacity", "min": 2, "max": 6, "step": 0.5, "value": 5 }
  ]
}
```

横轴是价格，纵轴是某类可削减负荷的期望用量。真实多区系统还要叠加线路容量和安全约束。

## 6. 练习

```exercise
# @title: 练习：求两区最优分配
# @check: 9
# @check: 1
# @hint: 边际收益相等并满足总量约束。
x_a = 5
x_b = 5
marginal_a = 12 - x_a
marginal_b = 4 - x_b
x_b = 10 - x_a
print(x_a)
print(x_b)
```

<details>
<summary>点开查看逐步解答</summary>

等分猜测是 $x_A=x_B=5$。最优要求边际收益相等并满足总量约束：由 $12-x_A=4-x_B$ 和 $x_B=10-x_A$ 得 $24-2x_A=6$，所以 $x_A=9$、$x_B=1$。

</details>

## 7. 常见误区

**误区一**：你以为切得越细越好。过度分解会把强耦合藏进接口，造成反复返工。

**误区二**：你以为局部最优相加就是全局最优。共享资源和公共约束必须由协调层处理。

**误区三**：你以为影子价格只是财务数字。它是稀缺性和边界约束的系统信号。

## 8. 选读：对偶性

<details>
<summary>选读 · 从约束到价格</summary>

凸优化中，拉格朗日对偶把约束问题转成关于价格的子问题。原变量表示各子系统怎么用资源，对偶变量表示资源紧张程度。强对偶成立时，价格机制能恢复全局一致性。

</details>

## 9. 快问快答

```quiz
分解协调中最关键的接口是什么？
- 各子系统的颜色样式
- 共享资源的边界量和协调信号 [*]
- 报告文件的页边距
? 边界量决定局部决策如何拼成全局可行解。
```

## 10. 下一站

分解之后还要安排谁做长期计划、谁做实时控制。下一课讲分层控制。

→ [分层控制：调度、监督、局部回路](./60-hierarchical-control.md)
