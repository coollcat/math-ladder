---
title: MDP 五元组
lesson_id: rl/mdp
prereqs:
  - rl/markov-property
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - markov-decision-process
applications:
  - inventory-control
  - game-playing
exits:
  - data-ai
  - engineering
---

# MDP 五元组

## 1. 开场钩子

仓库每天决定补多少货：库存是状态，补货量是动作，缺货和仓储成本是奖励的反面。把这类问题抽象到最简，就是 Markov 决策过程。

## 2. 直觉解释

MDP 像一台带规则的桌游：

- 你能看到棋盘位置；
- 你能从有限或可枚举的动作里选择；
- 骰子和事件按概率改变局面；
- 每次移动给出分数；
- 目标不是单步高分，而是长期总分。

Markov 性质让“一步转移表”成为完整世界模型。

## 3. 正式定义

MDP 是五元组：

$$\mathcal M=(\mathcal S,\mathcal A,P,R,\gamma).$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\mathcal S$ | 状态集 | 所有可能状态 |
| $\mathcal A$ | 动作集 | 所有可选动作 |
| $P(s'\mid s,a)$ | 转移核 | 执行动作后到下一状态的概率 |
| $R(s,a,s')$ | 奖励函数 | 转移产生的即时评价 |
| $\gamma$ | 折扣因子 | 未来奖励折算到现在的方式 |

策略是规则 $\pi(a\mid s)$：在状态 $s$ 下给每个动作分配概率。

## 4. 分步例题

两格仓库只有“空”与“满”：

1. $\mathcal S=\lbrace\text{空},\text{满}\rbrace$；
2. $\mathcal A=\lbrace\text{不补货},\text{补货}\rbrace$；
3. “满”时不再补货则可能缺货，奖励为 $-2$；
4. “空”时补货花费 $1$ 但避免后续更大缺货；
5. 转移概率和折扣因子共同决定哪个规则更好。

## 5. 动手实验

下面用固定策略跑一个教学版 MDP。种子、最大 episode 数、最大步数都写死，保证不会不可中断。

```python title="三状态库存 MDP 的有界采样"
import random  # 抽样随机需求

random.seed(50)              # 固定随机种子
MAX_EPISODES = 3             # 最大回合数
MAX_STEPS = 10               # 每回合最大步数

def transition(stock, order):      # stock 是当前库存，order 是补货量
    stock = min(2, stock + order)   # min 限制库存上限
    demand = random.choice([0, 1])  # 教学规模的需求只有 0 或 1
    next_stock = max(0, stock - demand)
    reward = -order - (2 if next_stock == 0 else 0)
    return next_stock, reward

for ep in range(MAX_EPISODES):
    stock = ep                 # 三个回合分别从 0、1、2 开始
    total = 0
    print("episode", ep + 1)
    for t in range(MAX_STEPS):
        action = 0 if stock == 2 else 1   # 一个简单固定规则
        stock, r = transition(stock, action)
        total += r
        print(t + 1, "stock", stock, "reward", r)
        if total < -12:        # 小型止损条件，额外保证回合尽早结束
            break
```

:::warning[常见误区]

- 你以为 MDP 必须状态很少，表格法用小例子，真实问题可用函数近似表示大状态。
- 你以为策略是一个分数，策略是从状态到动作分布的规则。
- 你以为奖励函数可以随便设，它会悄悄定义你真正优化的目标。

:::

## 6. 练习

```quiz
MDP 中策略 pi(a|s) 的准确含义是什么？
- 状态 s 的长期得分
- 在状态 s 选择动作 a 的规则或概率 [*]
- 动作 a 带来的即时奖励
? 策略是动作规则；分数属于价值函数，即时评价属于奖励。
```

```exercise
# @title: 数出 MDP 元素个数
# @check: 5
# @hint: 五元组包括状态集、动作集、转移核、奖励函数和折扣因子。
n_components = 4
# 学生应把 n_components 改成 MDP 五元组的元素数量
print(n_components)
```

<details><summary>点开查看逐步解答</summary>

MDP 写作 $(\mathcal S,\mathcal A,P,R,\gamma)$，依次是状态集、动作集、转移核、奖励函数和折扣因子，所以共有 5 个组成部分。

</details>

## 7. 选读证明

<details><summary>选读：为什么只标一条边</summary>

若动作后到达的状态唯一且确定，转移概率为 1，箭头标签可省略概率。这是确定性 MDP 的特例。随机环境中同一对状态和动作可能对应多个下一状态，因此需要完整转移核。

</details>

## 8. 下一站

有了模型，下一步要回答：一串未来奖励今天到底值多少？

→ [回报与折扣因子](./60-return-discount.md)
