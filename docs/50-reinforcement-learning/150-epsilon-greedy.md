---
title: epsilon-greedy 探索
lesson_id: rl/epsilon-greedy
prereqs:
  - rl/q-learning
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - exploration-exploitation
  - epsilon-greedy
applications:
  - ad-selection
  - menu-testing
exits:
  - data-ai
---

# epsilon-greedy 探索

## 1. 开场钩子

你常去 A 店，但附近新开了 B 店。永远去 A 可能错过更好的 B，天天尝新又浪费预算。epsilon-greedy 的答案是：大部分时间用当前最好选择，小概率强制尝试别的。

## 2. 直觉解释

给定参数 $\epsilon\in[0,1]$：

- 以概率 $1-\epsilon$ 执行贪心动作；
- 以概率 $\epsilon$ 均匀随机探索。

$\epsilon=0$ 完全利用，容易锁死次优动作；$\epsilon=1$ 完全探索，不积累收益。常见做法是让 epsilon 随训练逐渐变小。

## 3. 正式定义

$$\pi(a\mid s)=1-\epsilon+\epsilon/|\mathcal A(s)|\ \text{若}\ a=\arg\max_bQ(s,b),\ \text{否则}\ \pi(a\mid s)=\epsilon/|\mathcal A(s)|.$$

显示公式必须单行；上式表示贪心动作获得基础概率加上均分出的探索份额。

## 4. 分步例题

三个动作，$\epsilon=0.3$：

1. 总探索概率为 0.3，每个动作分到 $0.1$；
2. 剩余利用概率为 0.7；
3. 若动作 2 是贪心动作，它的总概率是 $0.7+0.1=0.8$；
4. 动作 1 和 3 各为 0.1；
5. 所有动作概率之和回到 1。

## 5. 动手实验

先看现有 plot 组件中探索比例随 epsilon 变化，再运行一个两臂小模拟。

```viz
{
  "type": "plot",
  "title": "greedy 概率与探索概率",
  "expr": "1-eps+eps/2",
  "expr2": "eps/2",
  "label": "greedy 动作概率",
  "label2": "单个动作的探索份额",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "eps", "min": 0, "max": 1, "step": 0.05, "value": 0.2 }
  ]
}
```

```python title="epsilon-greedy 两臂模拟"
import random  # 抽样探索与奖励

random.seed(151)              # 固定随机种子
MAX_PULLS = 1000              # 最大尝试次数
true_probs = [0.35, 0.60]     # 两台老虎机的真实成功率
counts = [0, 0]               # 每个动作被选次数
successes = [0, 0]            # 每个动作成功次数

def greedy_action():          # 平局时偏向第一个动作
    values = []
    for i in range(2):
        mean = successes[i] / counts[i] if counts[i] else float("inf")  # float("inf") 是正无穷：没试过的臂先当最强
        values.append(mean)
    return values.index(max(values))

for t in range(MAX_PULLS):
    epsilon = max(0.02, 0.40 * (0.99 ** t))    # 逐步衰减但保底 2%
    if random.random() < epsilon:
        a = random.randrange(2)
    else:
        a = greedy_action()
    reward = 1 if random.random() < true_probs[a] else 0
    counts[a] += 1
    successes[a] += reward

print("counts", counts)
print("empirical means", [round(successes[i] / counts[i], 3) for i in range(2)])
print("overall success", round(sum(successes) / MAX_PULLS, 3))
```

:::warning[常见误区]

- 你以为探索只在开始需要，环境变化时要保留一点持续探索。
- 你以为 epsilon 是学习率，它是动作抽样概率，不影响单次参数更新幅度。
- 你以为探索一定提高长期得分，探索本身有机会成本，要靠总量和衰减平衡。

:::

## 6. 练习

```exercise
# @title: 计算 epsilon-greedy 概率
# @check: 0.75
# @hint: 贪心动作得到利用份额加一份探索份额。
n_actions = 2
epsilon = 0.5
greedy_prob = 1 - epsilon  # 学生需加上平均分给贪心动作的探索份额
print(greedy_prob)
```

<details><summary>点开查看逐步解答</summary>

探索份额为 $0.5/2=0.25$，贪心动作概率为 $0.5+0.25=0.75$。另一个动作为 0.25。

</details>

## 7. 选读边界

UCB 用置信上界显式奖励“少被尝试”的动作；Thompson sampling 从后验抽样动作。它们通常比固定 epsilon 更聪明，但 epsilon-greedy 因实现极简而广泛使用。

## 8. 下一站

把探索成本单独记账，就进入多臂老虎机和 regret。

→ [160 · 多臂老虎机与 regret 预告](./160-bandit-regret.md)
