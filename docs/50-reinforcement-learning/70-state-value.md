---
title: 状态价值函数
lesson_id: rl/state-value
prereqs:
  - rl/return-discount
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - state-value-function
applications:
  - map-navigation
  - portfolio-control
exits:
  - data-ai
---

# 状态价值函数

## 1. 开场钩子

地图上两个房间现在都没有宝藏，但一个靠近出口，另一个被墙围住。它们的价值不同：价值看的不是眼前奖励，而是从这里出发的长期前景。

## 2. 直觉解释

状态价值回答一个问题：**如果一直按某个策略行动，从这个状态出发，平均能拿到多少折扣回报？**

关键词有三个：

- **长期**：包含未来所有奖励；
- **期望**：平均掉环境和策略的随机性；
- **给定策略**：换策略，同一个状态的价值也会变。

## 3. 正式定义

给定策略 $\pi$，状态价值函数定义为：

$$V^\pi(s)=\mathbb E_\pi\left[G_t\mid s_t=s\right].$$

它不是某条轨迹的实际回报，而是从 $s$ 出发、按 $\pi$ 行动时 $G_t$ 的期望。

## 4. 分步例题

三个格子 A、B、C，$\gamma=0.9$，策略总是向右：

1. C 是终点，之后奖励为 0，所以 $V(C)=0$（不计进入 C 的即时奖励）；
2. 从 B 向右得到 $r=1$ 后结束，所以 $V(B)=1$；
3. 从 A 向右得到 0，进入 B，所以 $V(A)=0+0.9V(B)=0.9$；
4. 若把 B 的奖励改成 2，则 $V(A)$ 也变为 $1.8$；
5. 价值沿时间倒着向后传播。

## 5. 动手实验

下面的模拟用穷举小树计算期望，而不是训练。最大深度固定，随机种子固定。

```viz
{
  "type": "plot",
  "title": "一步备份：未来价值如何折回当前状态",
  "expr": "1 + gam * x",
  "label": "当前状态价值",
  "xmin": 0,
  "xmax": 3,
  "sliders": [
    { "name": "gam", "min": 0, "max": 0.95, "step": 0.05, "value": 0.8 }
  ]
}
```

```python title="小型随机路径的状态价值"
import random  # 抽样随机分支

random.seed(70)       # 固定随机种子
MAX_DEPTH = 6         # 最大展开深度
N_SAMPLES = 2000      # 最大样本数，用于蒙特卡洛估计

def step(state):      # state 只能是 A 或 B
    if state == "A":
        return ("B", 0) if random.random() < 0.8 else ("C", -1)
    if state == "B":
        return ("C", 1) if random.random() < 0.5 else ("A", 0)
    return ("C", 0)   # 终点自环

def rollout(start):   # 一条有界经验
    s, g = start, 0.0
    for depth in range(MAX_DEPTH):
        old_s = s
        s, r = step(s)
        g += (0.9 ** depth) * r
        if s == "C":
            break
        if old_s == s and depth == MAX_DEPTH - 1:
            break
    return g

for start_state in ["A", "B"]:
    samples = [rollout(start_state) for _ in range(N_SAMPLES)]  # 列表推导式
    mean_value = sum(samples) / len(samples)                    # sum 是全局已引入内置函数
    print(start_state, "estimated V =", round(mean_value, 3))
```

:::warning[常见误区]

- 你以为价值是即时分数，它是长期折扣回报的期望。
- 你以为价值属于状态本身，$V^\pi$ 依赖策略 $\pi$。
- 你以为一次模拟结果就是价值，一次只是样本，很多次平均才逼近期望。

:::

## 6. 练习

```quiz
状态价值 V(s) 的准确含义是什么？
- 当前状态的即时奖励
- 从 s 出发、按给定策略行动的折扣回报期望 [*]
- 状态自身永远不变的固有分数
? V(s) 是长期折扣回报的期望，并且依赖它所对应的策略。
```

```exercise
# @title: 一步备份状态价值
# @check: 2.6
# @hint: 即时奖励加折扣后的下一状态价值。
r = 1
next_v = 2.0
gamma = 0.8
v = r  # 学生应加上折扣后的 next_v
print(v)
```

<details><summary>点开查看逐步解答</summary>

$V(s)=1+0.8\times2=1+1.6=2.6$。这一步把“未来的价值”折算回当前状态。

</details>

## 7. 选读证明

<details><summary>选读：从展开式到 Bellman 直觉</summary>

把 $G_t=R_{t+1}+\gamma G_{t+1}$ 代入定义并对策略与环境取期望，得到 $V^\pi(s)=\mathbb E[R_{t+1}+\gamma V^\pi(S_{t+1})\mid s]$。这就是下一课 Bellman 期望方程的直接来源。

</details>

## 8. 下一站

状态价值告诉你这里好不好，但不告诉你在分叉路口该先迈哪只脚。这需要动作价值。

→ [动作价值函数 Q](./80-action-value.md)
