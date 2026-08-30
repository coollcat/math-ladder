---
title: 策略迭代
lesson_id: rl/policy-iteration
prereqs:
  - rl/bellman-optimality
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - policy-iteration
applications:
  - gridworld-navigation
  - inventory-planning
exits:
  - engineering
  - data-ai
---

# 策略迭代

## 1. 开场钩子

教练先看一套战术能拿多少分，再针对弱点改一套战术；改完继续评估。策略迭代就是“评估—改进”的两个舞步反复交替。

## 2. 直觉解释

策略迭代有两半：

1. **策略评估**：固定当前策略，解 Bellman 期望方程，得到 $V^\pi$；
2. **策略改进**：在每个状态看看有没有动作的 $Q^\pi(s,a)$ 大于当前 $V^\pi(s)$，有就换。

只要改进存在，新策略不会更差。有限表格 MDP 通常在有限轮内停止改进。

## 3. 正式定义

策略改进规则：

$$\pi'(s)\in\arg\max_a\sum_{s'}P(s'\mid s,a)\left[R(s,a,s')+\gamma V^\pi(s')\right].$$

若对所有 $s$ 都有 $\pi'(s)=\pi(s)$，则当前策略已最优。

## 4. 分步例题

一行三格，动作左右，$\gamma=0.9$：

1. 初始策略全部向左；
2. 评估后发现多数状态远离奖励；
3. 用 $r+\gamma V$ 检查向右；
4. 中间和左侧的向右 backup 更大，因此改进为向右；
5. 再评估新策略，若无动作可改进，算法结束。

## 5. 动手实验

下面的三格世界显式执行最多 10 轮外循环，每轮内部最多 50 次评估扫描。

```python title="三格世界的策略迭代"
GAMMA = 0.9                 # 折扣因子
MAX_OUTER = 10              # 最大策略迭代轮数
MAX_EVAL = 50               # 每轮最大评估扫描数
n_states = 3                # 格子数

def reward_for(next_state):          # 到达终点时给奖励
    return 1 if next_state == 2 else 0

def transition(s, action):           # action: 0 左，1 右
    if action == 0:
        return max(0, s - 1)
    return min(2, s + 1)

policy = [0] * n_states              # 初始全向左
v = [0.0] * n_states

for outer in range(MAX_OUTER):
    for _ in range(MAX_EVAL):        # 下划线表示不用循环变量
        old_v = v[:]
        for s in range(n_states - 1):
            ns = transition(s, policy[s])
            v[s] = reward_for(ns) + GAMMA * old_v[ns]

    changed = False                  # 标记本轮是否发生策略改进
    for s in range(n_states - 1):
        backups = []
        for a in [0, 1]:
            ns = transition(s, a)
            backups.append(reward_for(ns) + GAMMA * v[ns])
        best = backups.index(max(backups))
        if best != policy[s]:
            policy[s] = best
            changed = True
    print("outer", outer + 1, "value", [round(x, 4) for x in v], "policy", policy)
    if not changed:
        break
```

:::warning[常见误区]

- 你以为每次都要精确解评估，截断的 modified policy iteration 常够用。
- 你以为策略改进一定立刻改变所有箭头，很多状态本来已指向正确方向。
- 你以为终止条件是价值等于 0，实际是没有动作能改进当前策略。

:::

## 6. 练习

```exercise
# @title: 实现策略改进判断
# @check: 改进
# @hint: 如果任一动作的 backup 高于当前状态价值，就应该改进。
q_left = 1.2
q_right = 1.8
current_v = 1.2
verdict = "不变"
# 学生应根据 q_left/q_right 与 current_v 比较，把 verdict 改成 “改进”
print(verdict)
```

<details><summary>点开查看逐步解答</summary>

右侧动作的 $Q=1.8>1.2$，说明存在严格更好的动作。代码可用 `if q_right > current_v: verdict="改进"`。

</details>

## 7. 选读证明

<details><summary>选读：策略改进定理</summary>

设 $\pi'$ 由 $V^\pi$ 的贪心规则产生。对每个 $s$ 有 $Q^\pi(s,\pi'(s))\ge V^\pi(s)$。展开递推并对时间归纳，得到 $V^{\pi'}(s)\ge V^\pi(s)$。若处处相等且无改进动作，则满足 Bellman 最优方程。

</details>

## 8. 下一站

策略迭代先完整评估再改进。价值迭代把两者压得更紧：每扫一遍就直接朝最优价值收缩。

→ [120 · 价值迭代](./120-value-iteration.md)
