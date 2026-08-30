---
title: 多臂老虎机与 regret 预告
lesson_id: rl/bandit-regret
prereqs:
  - rl/epsilon-greedy
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - multi-armed-bandit
  - regret
applications:
  - ab-testing
  - clinical-trial-design
exits:
  - data-ai
  - research
---

# 多臂老虎机与 regret 预告

## 1. 开场钩子

医院要在两种疗法间分配病人，广告系统要在多个素材间分配曝光。没有状态转移，只有“选哪个臂”的困境：早知道哪个好很重要，但试验本身也有代价。

## 2. 直觉解释

多臂老虎机去掉 MDP 的状态转移：每拉一根臂只得到一次奖励。核心矛盾变成探索与利用。

Regret 衡量“如果一开始就拉最佳臂”和“算法实际所得”的差距。好的算法让总 regret 随时间增长得很慢，而不是线性落后。

## 3. 正式定义

设臂 $a$ 的期望奖励为 $\mu_a$，最优值为：

$$\mu^*=\max_a\mu_a.$$

前 $T$ 步的 pseudo-regret 为：

$$\mathbb E[\text{Regret}_T]=T\mu^*-\sum_{t=1}^{T}\mu_{A_t}.$$

也可写成 $\sum_a\Delta_a\mathbb E[N_T(a)]$，其中 $\Delta_a=\mu^*-\mu_a$。

## 4. 分步例题

三根臂的真实均值是 0.2、0.5、0.6：

1. 最佳均值是 0.6；
2. 若 100 次全拉第二臂，得期望 50；
3. 理想可得 60；
4. regret 为 10；
5. 若前 20 次探索后锁定第三臂，regret 通常远小于 10。

## 5. 动手实验

下面比较纯贪心和带探索的策略。所有轮数硬编码，随机种子固定。

```python title="教学规模 bandit regret"
import random  # 抽样臂奖励

random.seed(160)                  # 固定随机种子
HORIZON = 1200                    # 最大时间步
mus = [0.25, 0.45, 0.65]          # 三根臂真实均值
optimal = max(mus)

def run(policy_name):             # policy_name 只用于标签
    counts = [0] * len(mus)
    sums = [0.0] * len(mus)
    total_reward = 0.0
    def empirical_best():         # 用均值而不是累计和比较老虎机
        values = [
            sums[i] / counts[i] if counts[i] else -float("inf")
            for i in range(len(mus))
        ]
        return values.index(max(values))

    for t in range(HORIZON):
        if policy_name == "greedy":
            a = empirical_best()          # 初期未试过的臂视为无穷大
        else:
            if t < 30 or random.random() < 0.08:
                a = random.randrange(len(mus))
            else:
                a = empirical_best()
        r = 1 if random.random() < mus[a] else 0
        counts[a] += 1
        sums[a] += r
        total_reward += r
    return total_reward, counts

for name in ["greedy", "explore"]:
    reward, counts = run(name)
    print(name, "reward", reward,
          "sample regret", round(HORIZON * optimal - reward, 2),
          "counts", counts)
```

:::warning[常见误区]

- 你以为一次模拟的样本 regret 就是理论期望 regret，前者只是后者的噪声估计。
- 你以为多臂老虎机就是简化 RL，它是无状态特例，也是探索理论的清晰入口。
- 你以为平均样本最高就能直接上线，还要考虑置信度、变化环境和商业约束。

:::

## 6. 练习

```exercise
# @title: 计算简单 regret
# @check: 30.0
# @hint: 最优均值乘次数，减去实际均值乘次数。
mu_best = 0.75
mu_chosen = 0.5
n_pulls = 120
regret = 0.0  # 学生应写成 (mu_best-mu_chosen)*n_pulls
print(regret)
```

<details><summary>点开查看逐步解答</summary>

理想收益为 $120\times0.75=90$，实际期望收益为 $120\times0.5=60$，regret 为 30。也可以直接用 $(0.75-0.5)\times120$。

</details>

## 7. 选读预告

UCB1 选择 $\hat\mu_a+c\sqrt{\ln T/N_a}$ 最大的臂；Thompson sampling 为每根臂维护 Beta 分布并从中抽样。两者的共同目标是让探索次数集中在真正接近最优的臂上。

## 8. 下一站

接下来从逐格 Q 表转向直接优化策略本身：REINFORCE。

→ [170 · REINFORCE 策略梯度](./170-reinforce.md)
