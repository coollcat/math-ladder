---
title: 强化学习方法地图
lesson_id: rl/method-map
prereqs:
  - rl/dpo-preview
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - reinforcement-learning-taxonomy
applications:
  - algorithm-selection
exits:
  - data-ai
  - engineering
  - research
---

# 强化学习方法地图

## 1. 开场钩子

面对新任务，第一问不是“用 PPO 还是 Q-learning”，而是：状态转移是否已知？动作离散还是连续？能否安全试错？反馈是标量、偏好还是演示？

## 2. 直觉解释

可以把方法按三个轴看：

1. **模型知识**：已知 $P,R$ 可动态规划；不知道则学习或采样；
2. **评估对象**：价值方法学 V/Q，策略方法直接调参数；
3. **反馈来源**：环境标量、人类偏好、演示、约束或多目标效用。

价值方法适合小表格和离线推理；策略梯度适合连续动作和高维策略；偏好方法用于难以写出奖励的目标。

## 3. 正式对照表

| 方法 | 主要对象 | 需要模型 | 典型场景 | 关键风险 |
| --- | --- | --- | --- | --- |
| 策略迭代 / 价值迭代 | V 或策略 | 需要 P,R | 表格 MDP、导航 | 大状态表爆炸 |
| TD(0) | V | 不需要 | 在线策略评估 | 自举偏差 |
| Q-learning | Q | 不需要 | 离散动作控制 | 探索不足、函数近似不稳 |
| REINFORCE | 策略参数 | 不需要 | 连续动作、可抽样环境 | 高方差 |
| Actor-Critic / PPO | 策略与优势 | 不需要 | 大规模随机环境 | 超参与实现敏感 |
| RLHF | 奖励模型加策略 | 不需要 P | 语言模型对齐 | 奖励模型漏洞 |
| DPO | 策略参数 | 参考模型 | 偏好微调 | 数据质量与偏置 |

## 4. 分步例题

三个任务选型：

1. 四格迷宫且规则全知：先用价值迭代验证；
2. 机械臂连续力矩控制：优先策略梯度或 actor-critic；
3. 助手回答希望更符合人类偏好：考虑 RLHF/DPO，并配合评估与约束。

选择不是品牌站队，而是数据、动作空间、延迟和安全约束共同决定。

## 5. 动手实验

下面做一个极简“选型计分器”，根据布尔条件输出建议路线。

```python title="教学规模的方法选型器"
MAX_ROUTES = 6                  # 最大候选路线数

tasks = [
    {"name": "表格迷宫", "model_known": True, "discrete": True, "high_dim": False},
    {"name": "机械臂", "model_known": False, "discrete": False, "high_dim": True},
    {"name": "推荐反馈", "model_known": False, "discrete": True, "high_dim": False},
    {"name": "助手偏好", "model_known": False, "discrete": True, "high_dim": True},
][:MAX_ROUTES]

def recommend(task):            # task 是描述任务的字典
    if task["model_known"] and task["discrete"]:
        return "value iteration first"
    if task["high_dim"] and not task["discrete"]:
        return "actor-critic / policy gradient"
    if task["high_dim"]:
        return "policy method with function approximation"
    return "bandit exploration or tabular Q"

for task in tasks:
    print(task["name"], "->", recommend(task))
```

:::warning[常见误区]

- 你以为最新方法一定最好，基线模型常常更快、更稳、更可解释。
- 你以为 off-policy 表示可以随便混旧数据，分布和时间因果仍然重要。
- 你以为学完地图就是终点，真实工作要回到奖励、评估、安全和泛化。

:::

## 6. 练习

```quiz
规则全知的四格迷宫且动作离散，通常先选哪条路线？
- 直接上大规模 PPO
- 用表格动态规划（如价值迭代）验证 [*]
- 必须先训练神经网络
? 模型已知、状态很少时，表格动态规划通常更透明、更快，也更容易检查。
```

```exercise
# @title: 给任务匹配方法家族
# @check: policy gradient
# @hint: 连续高维动作通常不适合逐个动作建 Q 表。
task = {"continuous_actions": True, "huge_state_space": True}
method = "tabular Q-learning"  # 学生应改为合适的策略方法名
print(method)
```

<details><summary>点开查看逐步解答</summary>

连续动作无法枚举每个动作一格，且高维状态使表格爆炸。可输出 `policy gradient`，工程上常用 actor-critic/PPO 及函数近似。

</details>

## 7. 选读边界

离线 RL 处理固定日志数据，分层 RL 学习跨时间抽象，多智能体 RL 加入他人策略，安全 RL 把风险约束放进核心目标。它们都沿用本章的基本语言：状态、动作、回报、价值和策略。

## 8. 下一站

本章主线到此闭环。后续可视化组件会把网格世界、Bellman backup、Q 表热度和探索实验做成更直接的教具。
