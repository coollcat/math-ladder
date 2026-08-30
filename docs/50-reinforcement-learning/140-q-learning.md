---
title: Q-learning 更新
lesson_id: rl/q-learning
prereqs:
  - rl/td-learning
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - q-learning
  - off-policy-learning
applications:
  - robot-navigation
  - game-agents
exits:
  - data-ai
---

# Q-learning 更新

## 1. 开场钩子

新手司机按教练策略开车，却可以在心里比较：“如果刚才超车，后续会不会更好？”行为可以保守，评估可以面向最优策略——这就是 Q-learning 的离政策思想。

## 2. 直觉解释

Q-learning 维护一张 Q 表。每次经历 $(s,a,r,s')$，用下一步**最好的 Q 值**构造目标：

$$Y=r+\gamma\max_{a'}Q(s',a').$$

然后把 $Q(s,a)$ 向 $Y$ 拉一小步。注意 max 是对下一动作，不是对当前动作重选。

## 3. 正式定义

$$Q(S_t,A_t)\leftarrow Q(S_t,A_t)+\alpha\left[R_{t+1}+\gamma\max_{a'}Q(S_{t+1},a')-Q(S_t,A_t)\right].$$

行为策略决定实际怎么探索；target policy 使用 max，因此 Q-learning 面向 $Q^*$，称为 off-policy。

## 4. 分步例题

取 $\alpha=0.1$，$\gamma=0.9$：

1. $Q(A,\text{右})=2$；
2. 走右得奖励 1，到达 B；
3. B 上两个 Q 值分别是 4 和 6；
4. 目标为 $1+0.9\times6=6.4$；
5. 新值为 $2+0.1\times(6.4-2)=2.44$。

## 5. 动手实验

下面是一行四格的小世界。训练上限、步数上限和随机种子都固定；epsilon 留给下一课详细展开。

```python title="一行格子的教学 Q-learning"
import random  # 选择探索动作

random.seed(140)                 # 固定随机种子
n_states = 4                     # 最后一个格子是终点
n_actions = 2                    # 0 左，1 右
MAX_EPISODES = 300               # 最大训练回合数
MAX_STEPS = 30                   # 每回合最大步数
alpha = 0.20                     # 学习率
gamma = 0.95                     # 折扣因子
epsilon = 0.15                   # 探索概率
q = [[0.0, 0.0] for _ in range(n_states)]   # q[s][a] 构造二维表

def step(s, a):
    ns = min(max(s + (-1 if a == 0 else 1), 0), n_states - 1)
    return ns, (1 if ns == n_states - 1 else 0)

for ep in range(MAX_EPISODES):
    s = 0
    for t in range(MAX_STEPS):
        if random.random() < epsilon:
            a = random.randrange(n_actions)    # randrange 取 0..n_actions-1
        else:
            a = q[s].index(max(q[s]))
        ns, r = step(s, a)
        best_next = max(q[ns])                 # 对下一状态的动作取最大
        target = r + gamma * best_next
        q[s][a] += alpha * (target - q[s][a])
        if ns == n_states - 1:
            break
        s = ns

print("Q table:")
for row in q:
    print([round(x, 4) for x in row])
print("greedy actions", ["L" if row[0] >= row[1] else "R" for row in q[:-1]])
```

:::warning[常见误区]

- 你以为 max 应该选当前已执行的动作，max 属于下一状态的动作评估。
- 你以为 off-policy 表示不用数据顺序，仍然要用正确的 $(s,a,r,s')$ 配对。
- 你以为 Q 表会一次到位，需要足够覆盖关键转移并逐渐降低学习率或探索。

:::

## 6. 练习

```quiz
Q-learning 更新里的 max 应该作用在哪里？
- 当前状态执行前的所有 Q 值
- 下一状态所有动作的 Q 值 [*]
- 整个 episode 的总奖励
? 当前动作已经发生；max 用下一状态最好的后续价值构造离政策目标。
```

```exercise
# @title: 完成一次 Q-learning 更新
# @check: 2.44
# @hint: 目标是 r 加 gamma 乘下一状态最大 Q。
q_sa = 2.0
r = 1.0
next_qs = [4.0, 6.0]
gamma = 0.9
alpha = 0.1
q_new = q_sa  # 学生需用 max(next_qs) 构造目标
print(q_new)
```

<details><summary>点开查看逐步解答</summary>

下一状态最大 Q 是 6，目标为 $1+0.9\times6=6.4$。更新为 $2+0.1\times(6.4-2)=2.44$。

</details>

## 7. 选读边界

表格 Q-learning 在充分探索、合适学习率条件下可收敛，但函数近似、off-policy 和自举同时出现时可能不稳定。[深度强化学习：把表格换成网络](./175-dqn-actor-critic.md) 用经验回放和独立目标网络缓解这类风险。

## 8. 下一站

max 会利用已知信息，但早期还需要主动试错。下一课讲 epsilon-greedy。

→ [150 · epsilon-greedy 探索](./150-epsilon-greedy.md)
