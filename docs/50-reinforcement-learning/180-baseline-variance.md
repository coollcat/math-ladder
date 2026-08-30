---
title: Baseline 与方差降低
lesson_id: rl/baseline-variance
prereqs:
  - rl/reinforce
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - baseline
  - advantage
applications:
  - actor-critic
  - high-variance-training
exits:
  - data-ai
  - research
---

# Baseline 与方差降低

## 1. 开场钩子

考试得 80 分是好是坏？平均 60 时很好，平均 90 时很差。策略梯度也需要一个参考线：不问“回报有多高”，先问“比预期高多少”。

## 2. 直觉解释

baseline $b(s)$ 只依赖状态，不依赖动作。把它从回报里减掉：

$$\nabla J=\mathbb E[\nabla\log\pi(a\mid s)(G-b(s))].$$

这不改变梯度的期望，却可能大幅降低样本方差。若用 $V^\pi(s)$ 当 baseline，剩余量就是优势函数：

$$A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s).$$

它回答“这个动作比状态平均水平好多少”。深度强化学习里这个 baseline 常由一个价值网络担任——它叫 critic，策略网络则叫 actor；架构细节见 [深度强化学习：把表格换成网络](./175-dqn-actor-critic.md)。

## 3. 正式定义

只要 $b=b(s)$，有：

$$\mathbb E_{a\sim\pi}[\nabla_\theta\log\pi_\theta(a\mid s)b(s)]=b(s)\nabla_\theta\sum_a\pi_\theta(a\mid s)=0.$$

因此减 baseline 是无偏操作。

## 4. 分步例题

某状态下两个动作的 Q 值分别是 3 和 7：

1. 若策略等概率选择，$V=5$；
2. 左动作优势为 $3-5=-2$；
3. 右动作优势为 $7-5=2$；
4. 正优势被加强，负优势被削弱；
5. 若所有回报都加常数 100，原始 G 波动巨大，优势几乎不变。

## 5. 动手实验

下面比较同一批回报的原始梯度和 baseline 校正后的梯度波动。

```python title="baseline 如何降低梯度方差"
import random  # 生成教学回报样本

random.seed(180)                 # 固定随机种子
N_SAMPLES = 1000                 # 最大样本数
base_return = 10.0               # 状态的常见长期水平
samples = []
for i in range(N_SAMPLES):
    noise = random.gauss(0, 8)   # gauss(mean,sd) 生成正态样本
    samples.append(base_return + noise + (12 if i % 50 == 0 else 0))

baseline = sum(samples) / len(samples)   # 用样本均值当简单 baseline
raw_gradients = []               # score 假设固定为 1
centered_gradients = []
for g in samples:
    raw_gradients.append(g * 1.0)
    centered_gradients.append((g - baseline) * 1.0)

def mean(xs):                    # xs 是数值列表
    return sum(xs) / len(xs)

def magnitude(xs):               # 用平均绝对值衡量更新信号大小
    return mean([abs(x) for x in xs])

print("mean raw", round(mean(raw_gradients), 4),
      "magnitude", round(magnitude(raw_gradients), 4))
print("mean centered", round(mean(centered_gradients), 4),
      "magnitude", round(magnitude(centered_gradients), 4))
```

:::warning[常见误区]

- 你以为任何常数都能当 baseline，只有不依赖当前动作才保证无偏。
- 你以为减 baseline 会把好动作变坏，符号由“相对参考线的高低”决定；它降低的是更新信号幅度，而不是把数据围绕自身均值重新居中后的离散度。
- 你以为方差降低等于更快收敛，还取决于 baseline 本身的估计误差和步长配合。

:::

## 6. 练习

```exercise
# @title: 计算优势函数
# @check: -1.25
# @hint: advantage 等于 Q 减 V。
q_value = 2.75
v_state = 4.0
advantage = q_value  # 学生应减去 v_state
print(advantage)
```

<details><summary>点开查看逐步解答</summary>

$A=2.75-4.0=-1.25$。负优势说明这个动作低于当前状态的平均长期价值，应降低其概率。

</details>

## 7. 选读证明

<details><summary>选读：无偏性的关键</summary>

对固定的 $s$，$\sum_a\nabla\pi_\theta(a\mid s)=\nabla1=0$。因此任何与 $a$ 无关的权重乘上 score 后期望为零。这就是可以自由选 baseline 的原因。

</details>

## 8. 下一站

有了低方差的策略梯度，还要防止一次更新把新策略推得太远。PPO 用裁剪解决这个问题。

→ [190 · PPO 的裁剪思想](./190-ppo-clipping.md)
