---
title: 回报与折扣因子
lesson_id: rl/return-discount
prereqs:
  - rl/mdp
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - return
  - discount-factor
applications:
  - finance-horizon
  - autonomous-driving
exits:
  - engineering
  - data-ai
---

# 回报与折扣因子

## 1. 开场钩子

今天的 100 分和十年后的 100 分不一样值钱。强化学习用折扣因子把这句话变成数学：越远的奖励，权重越小，但不必直接归零。

## 2. 直觉解释

回报是从当前时刻开始累计的未来奖励。折扣因子 $\gamma$ 在 0 和 1 之间：

- 接近 1：更重视长远；
- 接近 0：更贪图眼前；
- 等于 1 且任务无终点，总和可能发散。

折扣也像“每过一步，未来的承诺都要打一次折”。

## 3. 正式定义

从时间 $t$ 出发的折扣回报为：

$$G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\cdots=\sum_{k=0}^{\infty}\gamma^kR_{t+k+1},\qquad 0\le\gamma<1.$$

若奖励上限为 $M$，则几何级数给出上界：

$$G_t\le\frac{M}{1-\gamma}.$$

## 4. 分步例题

取 $\gamma=0.5$，未来三次奖励分别是 $4,0,8$：

1. 第一步奖励权重为 $1$，贡献 $4$；
2. 第二步权重为 $0.5$，贡献 $0$；
3. 第三步权重为 $0.25$，贡献 $2$；
4. 所以 $G_0=4+0+0.5^2\times8=6$；
5. 不折扣时总分为 $12$，说明折扣改变了排序结果的可能性。

## 5. 动手实验

用现有 plot 组件看折扣权重随时间和参数变化。横轴是等待步数，纵轴是该步奖励在今天的系数。

```viz
{
  "type": "plot",
  "title": "第 k 步奖励的折扣系数 gamma^k",
  "expr": "g^x",
  "xmin": 0,
  "xmax": 10,
  "sliders": [
    { "name": "g", "min": 0.05, "max": 0.95, "step": 0.05, "value": 0.7 }
  ]
}
```

再运行一个小脚本，比较两条奖励序列在不同 gamma 下的回报。

```python title="两个奖励序列的折扣回报"
MAX_HORIZON = 20          # 最大求和时间步

def discounted_return(rewards, gamma):     # rewards 是奖励列表
    total = 0.0
    for k, r in enumerate(rewards[:MAX_HORIZON]):  # enumerate 同时给出下标和值
        total += (gamma ** k) * r          # ** 是乘方运算符
    return total

a_rewards = [0, 0, 10] + [0] * 17           # 列表重复拼接
b_rewards = [3] * 20                        # 每一步稳定得 3
for gamma in [0.2, 0.7, 0.99]:
    print("gamma", gamma,
          "late", round(discounted_return(a_rewards, gamma), 3),
          "steady", round(discounted_return(b_rewards, gamma), 3))
```

:::warning[常见误区]

- 你以为折扣因子是学习率，它其实属于目标函数，不控制更新步长。
- 你以为 gamma 越接近 1 总是越好，会放大延迟信号，也可能让数值和学习更难。
- 你以为没有奖励就一定没有价值，后续状态可能通向大奖励。

:::

## 6. 练习

```exercise
# @title: 计算折扣回报
# @check: 6.5
# @hint: 分别乘 1、0.5、0.25 后相加。
rewards = [4, 2, 6]
gamma = 0.5
return_ = rewards[0] + rewards[1] + rewards[2]  # 学生需加入折扣幂
print(return_)
```

<details><summary>点开查看逐步解答</summary>

$G=4+0.5\times2+0.5^2\times6=4+1+1.5=6.5$。代码应写成 `rewards[0]+gamma*rewards[1]+gamma**2*rewards[2]`。

</details>

## 7. 选读边界

平均奖励 formulation 用长期平均而非折扣和，适合持续任务。工程中也常用有限 horizon；此时不需要几何级数上界，但要明确截断带来的偏差。

## 8. 下一站

回报是一条轨迹上的数。把它对所有随机性取期望，就得到状态价值函数。

→ [状态价值函数](./70-state-value.md)
