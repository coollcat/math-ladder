---
title: 奖励设计与奖励 hacking
lesson_id: rl/reward-hacking
prereqs:
  - rl/ppo-clipping
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - reward-design
  - reward-hacking
applications:
  - recommendation-systems
  - autonomous-driving
exits:
  - data-ai
---

# 奖励设计与奖励 hacking

## 1. 开场钩子

如果只奖励清扫过的格子数量，机器人可能反复扫同一格；如果只奖励视频点击，推荐系统可能学会标题党。强化学习不会自动理解你的意图，只会最大化写下来的数。

## 2. 直觉解释

奖励设计要回答三件事：

1. 什么是真正想改善的结果？
2. 哪些中间信号能帮助学习？
3. 哪些捷径必须被抑制？

奖励 shaping 可以加速学习，但额外项会改变最优策略。奖励 hacking 就是智能体找到代理指标的高分路径，却没有完成真实目标。

## 3. 正式定义

设真实效用为 $U$，训练奖励为 $R$。优化 $R$ 后得到的策略 $\pi_R$ 可能满足：

$$\max_\pi\mathbb E[R]\quad\not\Rightarrow\quad\max_\pi\mathbb E[U].$$

这种代理目标和真实目标的错位就是 specification gaming 的一种来源。

## 4. 分步例题

自动驾驶简化奖励：

1. 只给“到达终点快”加分；
2. 策略发现闯红灯可省 2 秒；
3. 单次模拟中闯红灯得分更高；
4. 但真实目标包含安全和法规；
5. 必须把危险行为写成显著负奖励或约束，而不是事后惊讶。

## 5. 动手实验

下面用一个小评分器比较三种奖励设计的总分，观察代理分和真实效用的分歧。

```python title="代理奖励 vs 真实效用"
MAX_CANDIDATES = 4             # 最大候选策略数

candidates = [                 # 每项：名称、点击率、停留质量、违规率
    ("朴素", 0.90, 0.20, 0.30),
    ("平衡", 0.65, 0.80, 0.02),
    ("保守", 0.35, 0.85, 0.00),
    ("极端", 1.00, 0.05, 0.60),
][:MAX_CANDIDATES]

def proxy_score(clicks, quality, violation):   # 只看点击的错误奖励
    return clicks - 0.01 * violation

def utility(clicks, quality, violation):       # 更接近真实目标
    return 0.2 * clicks + quality - 5.0 * violation

best_proxy = None
best_utility = None
for name, clicks, quality, violation in candidates:
    proxy = proxy_score(clicks, quality, violation)
    util = utility(clicks, quality, violation)
    print(name, "proxy", round(proxy, 3), "utility", round(util, 3))
    if best_proxy is None or proxy > best_proxy[1]:
        best_proxy = (name, proxy)
    if best_utility is None or util > best_utility[1]:
        best_utility = (name, util)

print("best by proxy", best_proxy)
print("best by utility", best_utility)
```

:::warning[常见误区]

- 你以为奖励只是技术细节，它决定模型学到的目标和社会后果。
- 你以为中间 shaping 项无害，权重过大时会把手段变成目的。
- 你以为高分代表对齐，必须单独检查是否满足了未被量化的约束。

:::

## 6. 练习

```quiz
哪种情况最像奖励 hacking？
- 代理分数上升，真实效用下降 [*]
- 代理分数和真实效用同步上升
- 训练速度慢，但目标没有错位
? 奖励 hacking 的关键不是分数高低，而是代理指标和真实目标出现反向分歧。
```

```exercise
# @title: 找出奖励 hacking 迹象
# @check: 是
# @hint: 如果代理指标上升而真实效用下降，就是典型错位。
proxy_up = True
utility_down = True
hacking = "否"  # 学生应把结果改成中文判断字符串
print(hacking)
```

<details><summary>点开查看逐步解答</summary>

代理分数上升且真实效用下降，说明优化找到了指标的漏洞而不是目标本身。因为判题比较打印文本，应写 `hacking = "是" if proxy_up and utility_down else "否"`。

</details>

## 7. 选读边界

约束 MDP 把安全、公平或预算写成硬约束而不只是奖励项；逆强化学习从示范中推测奖励；人类反馈则把偏好判断引入训练信号。它们都在缩小 $R$ 与 $U$ 的差距。

## 8. 下一站

当人类判断本身成为训练信号，就进入 RLHF。

→ [210 · RLHF 概览](./210-rlhf-overview.md)
