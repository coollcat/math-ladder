---
title: TD 学习与自举
lesson_id: rl/td-learning
prereqs:
  - rl/value-iteration
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - temporal-difference-learning
  - bootstrapping
applications:
  - credit-risk-monitoring
  - online-control
exits:
  - data-ai
---

# TD 学习与自举

## 1. 开场钩子

蒙特卡洛方法要等一局结束才知道输赢；TD 学习每走一步就更新判断：“我原以为这里值 5，实际走一步后发现像值 4.8，那就稍微改口。”

## 2. 直觉解释

TD 用相邻两个估计的差修正当前估计：

$$\delta=r+\gamma V(s')-V(s).$$

这个 $\delta$ 叫 TD error。更新规则是：

$$V(s)\leftarrow V(s)+\alpha\delta.$$

“自举”指更新时使用 $V(s')$ 这个估计，而不是等真实完整回报。

## 3. 正式定义

对固定策略，TD(0) 的目标为：

$$G_{t:t+1}=R_{t+1}+\gamma V(S_{t+1}).$$

更新：

$$V(S_t)\leftarrow V(S_t)+\alpha\left[R_{t+1}+\gamma V(S_{t+1})-V(S_t)\right].$$

$\alpha$ 是学习率，控制单次误差改变估计的幅度。

## 4. 分步例题

取 $\gamma=0.9$，$\alpha=0.1$：

1. 当前估计 $V(A)=4$；
2. 从 A 走到 B，即时奖励为 1；
3. 当前估计 $V(B)=3$；
4. TD 目标是 $1+0.9\times3=3.7$；
5. TD error 是 $3.7-4=-0.3$；
6. 新估计是 $4+0.1\times(-0.3)=3.97$。

## 5. 动手实验

下面用固定策略跑有界 episode，观察价值从初始猜测向更合理方向移动。

```python title="TD(0) 的三格演示"
import random  # 抽样少量探索噪声

random.seed(130)             # 固定随机种子
MAX_EPISODES = 200           # 最大回合数
MAX_STEPS = 12               # 每回合最大步数
alpha = 0.10                 # 学习率
gamma = 0.90                 # 折扣因子
v = [0.0, 0.5, 0.0]          # 初始价值猜测：终点也为 0

def next_state(s):           # 固定策略向右，偶尔停住
    return min(2, s + (1 if random.random() > 0.1 else 0))

def reward_for(ns):
    return 1 if ns == 2 else 0

for ep in range(MAX_EPISODES):
    s = random.choice([0, 1])
    for t in range(MAX_STEPS):
        ns = next_state(s)
        r = reward_for(ns)
        td_error = r + gamma * v[ns] - v[s]
        v[s] += alpha * td_error       # 复合赋值执行 TD 更新
        if ns == 2 or t == MAX_STEPS - 1:
            break
        s = ns
    if ep in [0, 9, 49, MAX_EPISODES - 1]:
        print("episode", ep + 1, "v", [round(x, 4) for x in v])
```

:::warning[常见误区]

- 你以为自举一定不好，它方差低、可在线更新，只是可能带有偏差。
- 你以为学习率越大越快收敛，太大常让估计来回震荡。
- 你以为 TD 只适合无模型，模型可用时也能用 TD 思想做近似评估。

:::

## 6. 练习

```quiz
TD 学习中的“自举”是什么意思？
- 必须等整个 episode 结束才更新
- 更新目标里使用了当前的价值估计 [*]
- 直接复制环境给出的真实回报
? TD 目标包含 V(s') 或 Q(s',a')，因此称为自举。
```

```exercise
# @title: 计算 TD 更新
# @check: 4.04
# @hint: 先算 target-v，再乘 alpha 加回旧值。
v_old = 4.0
r = 1.0
next_v = 4.0
gamma = 0.8
alpha = 0.2
v_new = v_old  # 学生需替换成完整 TD 更新式
print(v_new)
```

<details><summary>点开查看逐步解答</summary>

目标为 $1+0.8\times4=4.2$，误差为 $0.2$，新值为 $4+0.2\times0.2=4.04$。

</details>

## 7. 选读证明

<details><summary>选读：为什么目标是局部一致量</summary>

在表格和衰减学习率条件下，TD(0) 的期望更新方向等于 Bellman 期望算子作用后的残差。当所有状态的期望 TD error 为零时，$V$ 满足 Bellman 方程，因此是不动点。

</details>

## 8. 下一站

TD 可以评估状态价值。把它搬到动作价值表上，并加入最优 backup，就是 Q-learning。

→ [140 · Q-learning 更新](./140-q-learning.md)
