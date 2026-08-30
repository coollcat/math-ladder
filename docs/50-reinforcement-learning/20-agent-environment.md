---
title: Agent、Environment、State、Action 与 Reward
lesson_id: rl/agent-environment
prereqs:
  - rl/sequential-decisions
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - agent-environment-loop
  - state
  - action
  - reward
applications:
  - game-playing
  - robotics
exits:
  - data-ai
---

# Agent、Environment、State、Action 与 Reward

## 1. 开场钩子

游戏玩家盯着屏幕，按下按键，游戏改变画面和分数。这个看似普通的循环，正是强化学习的骨架：智能体观察、行动，环境回应。

## 2. 直觉解释

**Agent** 是做决定的程序或生物。**Environment** 是它之外的一切规则。**State** 是环境给它的信息。**Action** 是它能做的事。**Reward** 是环境给出的数字信号。

推荐系统也有同一形状：用户历史是状态，候选内容对应动作，点击、停留或跳过变成奖励。奖励只是优化信号的代理，不等于用户的全部福祉。

## 3. 正式定义

在每个时间步：

$$s_{t+1}\sim P(\cdot\mid s_t,a_t),\qquad r_{t+1}\sim P(\cdot\mid s_t,a_t,s_{t+1}).$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\mathcal A$ | 动作集 | 所有允许的动作 |
| $\mathcal S$ | 状态集 | 所有可能出现的状态 |
| $P$ | 转移分布 | 给出下一状态的随机规则 |
| $R$ | 奖励函数 | 把转移映射成数值 |

## 4. 分步例题

一个两臂老虎机式小游戏：

1. 状态只有一个“待选择”；
2. 动作集是 $\lbrace\text{左},\text{右}\rbrace$；
3. 左臂以概率 $0.3$ 得 $1$ 分，右臂以概率 $0.7$ 得 $1$ 分；
4. 环境根据动作抽样奖励；
5. 单次得分可能误导，多次平均才能看出差异。

## 5. 动手实验

代码把循环显式写成四个函数式步骤，最多运行 20 次，并固定种子。

```python title="20 步以内的 agent-environment 循环"
import random  # 用于环境抽样

random.seed(20)                 # 固定种子，方便对照输出
MAX_STEPS = 20                  # 最大步数硬上限
ACTIONS = ["左", "右"]           # 动作集

def observe(state):             # def 定义函数；state 是传入参数
    return state                # 这个玩具里状态原样返回

def choose(actions):            # choose 表示策略占位符
    return random.choice(actions)

def environment_step(action):   # environment_step 封装环境规则
    win_prob = 0.3 if action == "左" else 0.7
    reward = 1 if random.random() < win_prob else 0  # random.random 返回 [0,1) 均匀数
    return "待选择", reward     # 返回下一状态与奖励

state = "待选择"
score = 0
for t in range(MAX_STEPS):      # 有界循环
    action = choose(ACTIONS)
    state, reward = environment_step(action)
    score += reward
    print(t + 1, action, reward, score)
```

:::warning[常见误区]

- 你以为 reward 是目标本身，其实它只是我们设计出来的训练信号。
- 你以为 state 必须是完整世界快照，其实只需包含影响未来奖励的信息。
- 你以为 agent 能直接控制下一状态，其实它只能控制动作，转移由环境完成。

:::

## 6. 练习

```quiz
在 agent-environment 循环中，动作和反馈分别由谁给出？
- agent 选择动作，environment 返回新状态和奖励 [*]
- environment 选择动作，agent 返回新状态和奖励
- agent 和 environment 各自独立计算奖励，不需要交互
? agent 只能选择自己可控制的动作；环境负责产生转移结果和评价信号。
```

```exercise
# @title: 找出推荐系统的动作
# @check: 展示视频A
# @hint: 动作必须是系统能直接选择的项，不是用户产生的结果。
options = ["用户点击", "展示视频A", "点击率上升"]
action = options[0]  # 学生应改成表示系统可选行为的那个元素
print(action)
```

<details><summary>点开查看逐步解答</summary>

初始的“用户点击”是环境响应；应把下标改为 `1`，输出“展示视频A”。“点击率上升”是统计结果。奖励可以从点击构造，但它们都不是动作本身。

</details>

## 7. 选读边界

部分可观测环境中，agent 只看到观测 $o_t$，不一定知道真实状态。此时要用历史或信念状态概括过去。本课先用完全可观测的小模型建立直觉。

## 8. 下一站

下一课把多步循环展开成 episode 和 trajectory，并解释为什么轨迹是强化学习的原始数据。

→ [Episode 与 Trajectory](./30-episode-trajectory.md)
