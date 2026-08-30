---
title: Episode 与 Trajectory
lesson_id: rl/episode-trajectory
prereqs:
  - rl/agent-environment
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - episode
  - trajectory
applications:
  - game-rounds
  - session-recommendation
exits:
  - data-ai
---

# Episode 与 Trajectory

## 1. 开场钩子

一局棋有胜负，一局游戏会回到主菜单，一次推荐会话会结束。这些完整往返叫 episode。而中间每一次“看见—行动—得到反馈”串起来，就是 trajectory。

## 2. 直觉解释

**Trajectory** 是一条具体路径：哪个状态、做了什么、得了几分。**Episode** 是从开始到终止的一次完整体验。

有些任务天然有终点，如迷宫和棋局；有些任务没有终点，如长期控制。教学中仍然要设置最大步数，否则一次失控训练会卡住浏览器。

## 3. 正式定义

有限轨迹常写作：

$$\tau=(s_0,a_0,r_1,\ldots,s_T).$$

若存在终止状态 $s_\text{terminal}$ 或达到上限 $T$，则称一次 episode 结束。

| 术语 | 含义 |
| --- | --- |
| episodic task | 有自然终点的任务 |
| continuing task | 理论上持续进行的任务 |
| time limit | 工程上强制截断的最大步数 |

## 4. 分步例题

机器人从格子 0 出发，目标是到达格子 2：

1. $s_0=0$，选择右到 1，得 0；
2. $s_1=1$，选择左回 0，得 $-1$；
3. 再右、再右，依次经过 1、2；
4. 到达 2 时得到 $+10$；
5. 这五次转移构成一条轨迹，最后一次到达构成一个 episode 的终点。

## 5. 动手实验

下面跑两个 episode，每个最多 12 步；固定种子后可以比较不同起点的轨迹长度。

```python title="两个小 episode 的轨迹表"
import random  # 抽样左右动作

random.seed(31)        # 固定随机种子
MAX_STEPS = 12         # 每个 episode 的最大步数
NUM_EPISODES = 2       # 最大 episode 数也是常数，防止批量失控

def run_episode(start):                    # 定义一次完整试验
    s = start                              # 局部变量只在函数内使用
    path = [(s, 0)]                        # path 存状态与刚获得的奖励
    for t in range(MAX_STEPS):
        a = random.choice([-1, 1])
        old_s = s
        s = min(max(s + a, 0), 2)
        r = 10 if s == 2 and old_s != 2 else (-1 if s == old_s else 0)
        path.append((s, r))                # append 向列表末尾添加元素
        if s == 2:
            return path, True              # 提前返回轨迹和终止标记
    return path, False

for ep in range(NUM_EPISODES):
    traj, done = run_episode(ep)           # ep 分别为 0 和 1
    print("episode", ep + 1, "steps", len(traj) - 1, "done", done)
    print(traj)
```

:::warning[常见误区]

- 你以为 episode 数越多越好，教学和调试要先看少量轨迹是否合理。
- 你以为 time limit 就是任务自然失败，它只是工程保护，学习时最好区分截断与真正终止。
- 你以为轨迹就是奖励列表，它还包含状态和动作的因果顺序。

:::

## 6. 练习

```exercise
# @title: 统计轨迹中的转移数
# @check: 4
# @hint: 转移数等于相邻状态对的个数。
traj = [0, 1, 2, 1, 2]
n_transitions = len(traj)  # 学生需要修正成转移数量
print(n_transitions)
```

<details><summary>点开查看逐步解答</summary>

五个状态之间有四段移动：0 到 1、1 到 2、2 到 1、1 到 2。所以转移数为 `len(traj) - 1`，结果是 4。

</details>

## 7. 选读边界

策略梯度方法通常直接给轨迹打分；价值方法则从轨迹中抽取局部更新。同一批数据可以服务不同算法，但都必须保留时间顺序。

## 8. 下一站

下一课问一个关键问题：什么样的状态已经足够记住未来？

→ [Markov 性质](./40-markov-property.md)
