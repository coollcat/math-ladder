---
title: PPO 的裁剪思想
lesson_id: rl/ppo-clipping
prereqs:
  - rl/baseline-variance
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - importance-sampling-ratio
  - clipped-surrogate-objective
applications:
  - large-scale-rlhf
  - robotics-training
exits:
  - data-ai
  - engineering
---

# PPO 的裁剪思想

## 1. 开场钩子

策略梯度拿到一批数据就想大步更新，但旧数据是由旧策略产生的；新策略一旦离旧策略太远，这批证据就不再可信。PPO 给更新装上限位器。

## 2. 直觉解释

定义新旧策略的概率比：

$$r_t(\theta)=\frac{\pi_\theta(A_t\mid S_t)}{\pi_{\theta_\text{old}}(A_t\mid S_t)}.$$

r 等于 1 表示没变；大于 1 表示更倾向这个动作；小于 1 表示更回避。PPO 的裁剪目标不让 r 走出 $[1-\epsilon,1+\epsilon]$ 继续获得更多收益。

## 3. 正式定义

未裁剪替代目标为：

$$L=r_tA_t.$$

PPO 裁剪代理目标把“未裁剪收益”和“夹住比率后的收益”中较小的那个作为优化信号：

$$L^{\mathrm{CLIP}}(r_t,A_t)=\min(r_tA_t,\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)A_t).$$

其中 $\epsilon$ 通常很小，如 0.1 或 0.2。

## 4. 分步例题

取 $\epsilon=0.2$，优势 $A=2$：

1. 若 $r=1.1$，裁剪后仍为 1.1，目标值为 2.2；
2. 若 $r=1.5$，被夹到 1.2，目标值封顶为 2.4；
3. 即使继续增大 r，这一项也不再上升；
4. 若 $A=-2$，过小的 r 同样会限制收益；
5. 因此单批数据不会驱动策略无限偏离采样分布。

## 5. 动手实验

下面画出并枚举裁剪函数的关键行为，不训练真实网络。

```python title="计算 PPO 裁剪项"
EPSILON = 0.20                     # 允许的概率变化半径
RATIOS = [0.70, 0.90, 1.00, 1.15, 1.40]   # 新旧概率比
advantages = [2.0, 2.0, 2.0, 2.0, -2.0]   # 对应优势

def clip(x, lo, hi):               # 把 x 限制在区间 [lo,hi]
    return min(max(x, lo), hi)

for ratio, adv in zip(RATIOS, advantages):
    clipped_ratio = clip(ratio, 1 - EPSILON, 1 + EPSILON)
    unclipped = ratio * adv
    objective = min(unclipped, clipped_ratio * adv)
    print("ratio", ratio,
          "clipped", clipped_ratio,
          "objective", round(objective, 4))
```

:::warning[常见误区]

- 你以为 PPO 把参数本身硬夹住，它裁剪的是概率比构造的目标。
- 你以为 clip 总会改变数值，只有在比率越过边界时才生效。
- 你以为 PPO 不需要 baseline，优势 A 通常正是 actor-critic（见 [深度强化学习：把表格换成网络](./175-dqn-actor-critic.md)）或 GAE 提供的。

:::

## 6. 练习

```quiz
PPO 的 clip 主要约束什么？
- 新旧策略的概率比构造的目标 [*]
- 神经网络的每个参数本身
- 学习率必须固定不变
? clip 允许参数更新，但限制新旧策略的概率比离开可信区间后继续放大目标。
```

```exercise
# @title: 应用概率比裁剪
# @check: 1.2
# @hint: epsilon 为 0.2 时允许区间是 0.8 到 1.2。
ratio = 1.55
epsilon = 0.2
clipped = ratio  # 学生应使用 min/max 夹到允许区间
print(clipped)
```

<details><summary>点开查看逐步解答</summary>

允许上限是 $1+0.2=1.2$。因为 1.55 超过上限，所以输出 `min(max(1.55,0.8),1.2)=1.2`。

</details>

## 7. 选读边界

KL 正则版 PPO 用惩罚项约束新旧策略距离；TRPO 在信赖域内做二阶约束。裁剪版工程实现简单，但 epsilon 不是数学上的精确信任域半径。

## 8. 下一站

算法会优化你给的目标。若奖励设计错了，它会忠实地 hack 你的目标。

→ [200 · 奖励设计与奖励 hacking](./200-reward-hacking.md)
