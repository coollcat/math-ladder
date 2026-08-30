---
title: DPO 思想预告
lesson_id: rl/dpo-preview
prereqs:
  - rl/rlhf-overview
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - direct-preference-optimization
applications:
  - language-model-tuning
exits:
  - research
  - data-ai
---

# DPO 思想预告

## 1. 开场钩子

RLHF 要维护奖励模型，还要在语言模型上做强化学习。DPO 问：既然最优策略可以用奖励表示，能否把偏好损失直接写在对数概率比上？

## 2. 直觉解释

对一个固定 KL 系数，RLHF 目标的最优策略满足奖励与新旧模型对数概率比成正比：

$$r(x,y)=\beta\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}+\text{常数}.$$

把这个关系代回 Bradley-Terry 偏好模型，就得到只含策略参数的 DPO 损失。它绕开显式奖励模型和采样式 RL 循环。

## 3. 正式定义

令：

$$\rho_\theta(x,y)=\log\frac{\pi_\theta(y\mid x)}{\pi_{\text{ref}}(y\mid x)}.$$

DPO 对偏好对 $(y_w\succ y_l)$ 使用：

$$L=-\log\sigma\left(\beta[\rho_\theta(x,y_w)-\rho_\theta(x,y_l)]\right).$$

它增大 preferred 与 rejected 的相对 log-probability 差距。

## 4. 分步例题

设 $\beta=0.1$：

1. 参考模型给出两个回答的对数概率；
2. 当前模型更新后，preferred 的 $\rho$ 为 1.2；
3. rejected 的 $\rho$ 为 0.2；
4. 差距为 1.0，乘以 $\beta$ 后为 0.1；
5. 损失为 $-\log\sigma(0.1)\approx0.644$，只比盲猜的 $\log 2\approx0.693$ 低一点——模型略占上风，但差距仍需继续拉开。

## 5. 动手实验

下面不训练真实语言模型，只用两个标量模拟相对对数概率的优化趋势。

```viz
{
  "type": "plot",
  "title": "DPO 损失：偏好差距越大，惩罚越小",
  "expr": "log(1 + exp(-beta * x))",
  "label": "DPO 损失",
  "xmin": -3,
  "xmax": 3,
  "sliders": [
    { "name": "beta", "min": 0.25, "max": 2, "step": 0.05, "value": 1 }
  ]
}
```

```python title="DPO 损失的一维直觉"
import math    # math.log/math.exp 用于损失与概率

BETA = 0.10                     # KL 强度系数
N_STEPS = 200                   # 最大更新步数
LEARNING_RATE = 0.05            # 教学学习率
rho_worse = 0.20                # rejected 的相对对数概率
rho_better = 0.40               # preferred 的相对对数概率

def sigmoid(z):
    return 1 / (1 + math.exp(-z))          # math.exp 是指数函数

def dpo_loss(margin):
    return -math.log(sigmoid(BETA * margin))   # math.log 是自然对数

for step in range(N_STEPS):
    margin = rho_better - rho_worse
    loss = dpo_loss(margin)
    p_pref = sigmoid(BETA * margin)
    grad_common = BETA * (1 - p_pref)
    rho_better += LEARNING_RATE * grad_common      # 提高偏好回答
    rho_worse -= LEARNING_RATE * grad_common       # 降低被拒回答
    if step in [0, N_STEPS // 2 - 1, N_STEPS - 1]:
        print("step", step + 1,
              "margin", round(rho_better - rho_worse, 4),
              "loss", round(loss, 4))
```

:::warning[常见误区]

- 你以为 DPO 没有 RL 思想，它的损失正是从带 KL 约束的 RL 目标推出的闭式替代。
- 你以为只要提高 preferred 的概率就好，参考模型相对比很重要，否则容易整体漂移。
- 你以为 DPO 完全没有奖励，它隐式使用了对数概率比形式的奖励。

:::

## 6. 练习

```exercise
# @title: 计算 DPO 边际
# @check: 1.0
# @hint: 用 preferred 的 rho 减去 rejected 的 rho。
rho_preferred = 1.5
rho_rejected = 0.5
beta = 0.1
margin = 0.0  # 学生应改成两个 rho 的差
scaled_margin = beta * margin
print(margin)
```

<details><summary>点开查看逐步解答</summary>

$\rho_\theta(x,y_w)-\rho_\theta(x,y_l)=1.5-0.5=1.0$。乘以 $\beta=0.1$ 后进入 sigmoid，得到缩放边际 0.1。

</details>

## 7. 选读边界

DPO 简化了训练管线，但不等于免费对齐：偏好数据质量、分布外行为、过拟合和长度偏置仍需评估。KTO、IPO 等变体调整了目标与数据假设。

## 8. 下一站

最后一张地图把这些方法放回同一个决策问题坐标系。

→ [230 · 强化学习方法地图](./230-method-map.md)
