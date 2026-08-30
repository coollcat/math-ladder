---
title: 动作价值函数 Q
lesson_id: rl/action-value
prereqs:
  - rl/state-value
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - action-value-function
applications:
  - ad-selection
  - robot-gait
exits:
  - data-ai
---

# 动作价值函数 Q

## 1. 开场钩子

导航软件不只评估“你在市中心”，还要比较“从市中心开车”“从市中心步行”。前者像状态价值，后者像动作价值 Q。

## 2. 直觉解释

$Q^\pi(s,a)$ 回答：**在状态 $s$ 先执行动作 $a$，之后再按策略 $\pi$ 行动，长期折扣回报的期望是多少？**

注意“先”字。Q 不是动作的单独得分，而是把这一个强制动作放进整条未来轨迹里评估。

## 3. 正式定义

给定策略 $\pi$：

$$Q^\pi(s,a)=\mathbb E_\pi\left[G_t\mid s_t=s,a_t=a\right].$$

两者关系是：

$$V^\pi(s)=\sum_a\pi(a\mid s)Q^\pi(s,a).$$

也就是说，状态价值是把各动作的 Q 按策略概率加权平均。

## 4. 分步例题

状态 $s$ 有左右两个动作：

1. 左：立刻得 1，随后状态价值为 2；
2. 右：立刻得 0，随后状态价值为 5；
3. 取 $\gamma=1$ 的有限例子，$Q(s,\text{左})=1+2=3$；
4. $Q(s,\text{右})=0+5=5$；
5. 若策略以 0.25 概率左、0.75 概率右，则 $V(s)=0.25\times3+0.75\times5=4.5$。

## 5. 动手实验

下面维护一张 2 个状态、2 个动作的教学 Q 表，并用有界 rollout 平均估计其中一格。

```python title="教学 Q 表与抽样估计"
import random  # 抽样动作和环境响应

random.seed(80)                  # 固定随机种子
MAX_EPISODES = 300               # 最大 episode 数
MAX_STEPS = 8                    # 每个 episode 最大步数
states = ["低档", "高档"]
actions = ["省电", "加速"]
q_table = [[1.0, 0.0], [0.0, 3.0]]   # 二维列表当作表格

def choose_greedy(state_idx):         # 选择当前表中较大的动作
    values = q_table[state_idx]
    return values.index(max(values))  # index 返回元素首次出现的位置

def environment(state_idx, action_idx):   # 教学环境的确定性规则
    gain = q_table[state_idx][action_idx]
    next_idx = min(1, state_idx + (1 if action_idx == 1 else 0))
    return next_idx, gain

estimates = []                       # 收集从 低档+加速 开始的回报样本
for ep in range(MAX_EPISODES):
    s, a, g = 0, 1, 0.0              # 强制第一步为 低档+加速
    for t in range(MAX_STEPS):
        s, r = environment(s, a)
        g += (0.9 ** t) * r
        if s == 1 and t > 0:
            a = 1                    # 到高档后继续加速，形成简单策略
        else:
            a = choose_greedy(s)
        if s == 1 and t == MAX_STEPS - 1:
            break
    estimates.append(g)

print("table", q_table)
print("sampled Q(low, boost)", round(sum(estimates) / len(estimates), 3))
```

:::warning[常见误区]

- 你以为 Q 就是即时奖励，它还包含之后所有折扣回报。
- 你以为 Q 和 V 是同一个东西，V 平均掉动作选择，Q 先固定第一个动作。
- 你以为最优动作永远让即时奖励最大，延迟收益可能完全反转排序。

:::

## 6. 练习

```exercise
# @title: 从 Q 计算 V
# @check: 4.25
# @hint: 用策略概率给两个动作的 Q 加权平均。
probs = [0.5, 0.5]
qs = [2.0, 6.5]
v = qs[0]  # 学生应完成加权求和
print(v)
```

<details><summary>点开查看逐步解答</summary>

$V(s)=0.5\times2+0.5\times6.5=1+3.25=4.25$。这个公式把“先选动作的价值”汇总成“状态的价值”。

</details>

## 7. 选读证明

<details><summary>选读：全期望公式视角</summary>

对第一个动作使用条件期望：$V^\pi(s)=\sum_a\pi(a\mid s)\mathbb E[G_t\mid s,a]$。括号内正是 $Q^\pi(s,a)$，所以状态价值是 Q 的策略加权平均。

</details>

## 8. 下一站

有了 V 和 Q，就能写出强化学习的核心递推式：Bellman 方程。

→ [Bellman 期望方程](./90-bellman-expectation.md)
