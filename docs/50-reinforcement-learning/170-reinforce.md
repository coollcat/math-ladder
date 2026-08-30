---
title: REINFORCE 策略梯度
lesson_id: rl/reinforce
prereqs:
  - rl/bandit-regret
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - policy-gradient
  - reinforce
applications:
  - continuous-control
  - text-generation-policy
exits:
  - data-ai
  - research
---

# REINFORCE 策略梯度

## 1. 开场钩子

Q-learning 先给每个动作打分再选动作；策略梯度直接调整动作规则本身。高回报轨迹出现后，把产生它的概率推大，低回报则推小。

## 2. 直觉解释

策略 $\pi_\theta(a\mid s)$ 由参数 $\theta$ 控制。我们想优化期望回报：

$$J(\theta)=\mathbb E_{\tau\sim\pi_\theta}[G(\tau)].$$

REINFORCE 用蒙特卡洛样本估计梯度：

$$\nabla J(\theta)=\mathbb E\left[\sum_t\nabla_\theta\log\pi_\theta(A_t\mid S_t)\,G_t\right].$$

正回报放大这条对数概率路径，负回报缩小它。

## 3. 正式定义

对一个两动作 softmax：

$$\pi_\theta(a)=\frac{e^{\theta_a}}{e^{\theta_0}+e^{\theta_1}}.$$

若选择动作 $a$，得分向量是“one-hot 减去概率向量”。例如概率为 $(0.6,0.4)$ 且选中动作 1，则 $\nabla_{\theta}\log\pi=(-0.6,0.4)$。

## 4. 分步例题

取两个动作偏好 $\theta=(0,0)$，学习率 $\alpha=0.2$：

1. 两动作概率各为 0.5；
2. 抽到动作 1，折扣回报为 3；
3. score 向量为 $(-0.5,0.5)$；
4. 梯度估计为 $(-1.5,1.5)$；
5. 更新后 $\theta=( -0.3,0.3)$，动作 1 概率升高。

## 5. 动手实验

下面实现教学规模的表格 REINFORCE。episode 数、步数和种子全部固定。

```viz
{
  "type": "plot",
  "title": "softmax 策略：偏好差决定动作概率",
  "expr": "exp(beta * x) / (1 + exp(beta * x))",
  "expr2": "1 / (1 + exp(beta * x))",
  "label": "动作 1 概率",
  "label2": "动作 0 概率",
  "xmin": -2,
  "xmax": 2,
  "sliders": [
    { "name": "beta", "min": 0.5, "max": 3, "step": 0.1, "value": 1 }
  ]
}
```

```python title="两动作 REINFORCE 小实验"
import random  # 抽样动作和奖励
import math    # math.exp 用于 softmax 概率

random.seed(170)              # 固定随机种子
MAX_EPISODES = 800            # 最大 episode 数
MAX_STEPS = 10                # 每 episode 最大步数
alpha = 0.05                  # 学习率
gamma = 0.95                  # 折扣因子
true_reward = [0.2, 0.45]     # 动作 0 和 1 的真实成功概率
theta = [0.0, 0.0]            # theta 是可学习的动作偏好分数

def probabilities(scores):    # scores 是长度为 2 的列表
    e0, e1 = math.exp(scores[0]), math.exp(scores[1])
    return [e0 / (e0 + e1), e1 / (e0 + e1)]

for ep in range(MAX_EPISODES):
    chosen = []               # 记录本回合的动作
    rewards = []
    probs = probabilities(theta)
    for t in range(MAX_STEPS):
        u = random.random()
        action = 0 if u < probs[0] else 1
        reward = 1 if random.random() < true_reward[action] else 0
        chosen.append(action)
        rewards.append(reward)

    # 从后往前算折扣回报，避免重复平方复杂度。
    returns = [0.0] * len(rewards)
    next_g = 0.0
    for t in reversed(range(len(rewards))):   # reversed 反向遍历下标
        next_g = rewards[t] + gamma * next_g
        returns[t] = next_g

    score_vectors = []
    for action in chosen:
        p = probabilities(theta)
        if action == 0:
            score_vectors.append([1 - p[0], -p[1]])
        else:
            score_vectors.append([-p[0], 1 - p[1]])

    for g, score in zip(returns, score_vectors):   # zip 配对遍历两个列表
        theta[0] += alpha * g * score[0]
        theta[1] += alpha * g * score[1]
        break                       # 教学版只取第一个时间步，控制方差和规模

    if ep in [0, 99, MAX_EPISODES - 1]:
        print("episode", ep + 1,
              "probs", [round(x, 4) for x in probabilities(theta)])
```

:::warning[常见误区]

- 你以为策略梯度只看最终胜负，公式给每个时间步的 log-probability 配上对应回报。
- 你以为它不需要探索，抽样本身就是随机策略探索。
- 你以为梯度越大越稳，轨迹回报噪声很大，常需要 baseline 和较小步长。

:::

## 6. 练习

```quiz
REINFORCE 中乘在 score function 后面的 Gt 是什么？
- 即时奖励的最大值
- 从该时间步出发的折扣回报 [*]
- 学习率
? 它衡量这条后续轨迹好不好，用来决定放大还是缩小该动作概率。
```

```exercise
# @title: 计算 softmax 策略概率
# @check: 0.7311
# @hint: 分子是 exp(theta[0])；分母是 exp(theta[0]) + exp(theta[1])。
theta = [1.0, 0.0]
p0 = round(0.5, 4)  # 学生应改成 softmax 概率并保留四位小数
print(p0)
```

<details><summary>点开查看逐步解答</summary>

$p_0=e/(e+1)\approx0.7311$。判题按打印文本比较，所以要写 `round(math.exp(theta[0])/(math.exp(theta[0])+math.exp(theta[1])), 4)`。

</details>

## 7. 选读证明

<details><summary>选读：likelihood-ratio trick</summary>

对轨迹分布取导时，$\nabla P_\theta(\tau)=P_\theta(\tau)\nabla\log P_\theta(\tau)$。环境转移与 $\theta$ 无关，所以只剩策略项；按时间链式展开，得到 $\sum_t\nabla\log\pi(A_t\mid S_t)$。

</details>

## 8. 下一站

表格 Q-learning 遇到大世界怎么办？下一课把表格换成神经网络——DQN 三件套与 Actor-Critic 的出生地。

→ [深度强化学习：把表格换成网络](./175-dqn-actor-critic.md)
