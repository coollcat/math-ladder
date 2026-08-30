---
title: 序贯决策与反馈延迟
lesson_id: rl/sequential-decisions
prereqs:
  - prob/law
  - sequences/fibonacci
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_builtin: []
introduces_concepts:
  - sequential-decision
applications:
  - autonomous-driving
  - recommendation-feedback
exits:
  - data-ai
---

# 序贯决策与反馈延迟

## 1. 开场钩子

自动驾驶不能只问“这一秒方向盘打多少最舒服”。一次变道可能先造成轻微晃动，三秒后才避开侧方车辆。强化学习研究的第一件事，就是把这种“现在的选择影响未来的收益”写清楚。

## 2. 直觉解释

一次性决策像单选题：选完立刻知道对错。序贯决策像走迷宫：每个路口都会改变你所在的位置，也改变后面还能走的路。

反馈延迟有两种表现：

- **奖励延迟**：迷宫出口的大奖励，要走到终点才出现；
- **责任分摊**：最后成功是很多步共同造成的，不能只夸最后一步。

## 3. 正式定义

一个离散时间序贯决策过程在时刻 $t$ 观察状态 $s_t$，选择动作 $a_t$，随后收到奖励 $r_{t+1}$ 并进入 $s_{t+1}$。

一条有限经验片段是：

$$s_0,a_0,r_1,s_1,a_1,r_2,\ldots,s_{T-1},a_{T-1},r_T,s_T.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $t$ | 时间步 | 离散的决策编号 |
| $s_t$ | 状态 | 决策所需的环境信息 |
| $a_t$ | 动作 | 智能体此刻的选择 |
| $r_{t+1}$ | 即时奖励 | 环境返回的数值评价 |
| $T$ | 终止步 | 教学模拟必须设定的上限或终点 |

## 4. 分步例题

小车在三个格子中从左往右走：起点 A、中间 B、终点 C。

1. 在 A 选择“右”，进入 B，即时奖励为 $0$；
2. 在 B 选择“停”，留在 B，奖励为 $-1$；
3. 下一步改选“右”，进入 C，奖励为 $+10$；
4. 虽然只有最后一步拿到大奖励，但“B 不停车”是成功路线的一部分；
5. 好的学习方法要把终点的功劳传回前面的路口。

## 5. 动手实验

本课让 `min` 和 `max` 第一次登场：`min(a,b)` 返回较小数，`max(a,b)` 返回较大数。两者合用可以把位置“夹”在合法区间里。

下面的模拟只允许最多 8 步，并用固定随机种子保证课堂结果可复现。它把每一步的选择和延迟奖励排成一张表。

```python title="有上限的迷宫路线记录"
import random  # 生成伪随机数；固定种子后每次实验序列相同

random.seed(370)          # 固定随机种子，让教学演示可复现
MAX_STEPS = 8             # 最大步数：任何模拟都不能无界运行
cells = ["A", "B", "C"]   # cells 是格子名列表
s = 0                     # 当前格子的下标，0 表示 A
total = 0                 # total 是累计奖励

for t in range(MAX_STEPS):          # range(8) 产生 0 到 7 的有界循环
    a = random.choice([-1, 1])      # random.choice 从列表中等概率取一个动作
    s = min(max(s + a, 0), 2)       # min/max 把位置限制在 0..2
    r = 10 if s == 2 else (-1 if a == 0 else 0)  # 条件表达式按情况给奖励
    total += r                      # 复合赋值：total = total + r
    print(f"t={t}, 动作={a:+d}, 新格子={cells[s]}, 奖励={r:+d}")
    if s == 2:                      # 到达终点就停止本条轨迹
        break                       # 跳出当前循环

print("总奖励", total)
```

:::warning[常见误区]

- 你以为只有终点那一步重要，其实前面的动作决定了能否到达终点。
- 你以为总奖励越大一定越好，还要看花了多少步和是否稳定重复成功。
- 你以为延迟奖励无法学习，其实可以用价值函数把未来折算到现在。

:::

## 6. 练习

```exercise
# @title: 判断序贯决策问题
# @check: 是
# @hint: 看当前动作是否会改变后续可选状态，而不是只看是否有随机性。
problem = "每一步选择会改变下一时刻的位置，且最终得分由整条轨迹决定"
answer = "否"  # 学生应根据“当前选择是否影响后续状态”修改判断结果
print(answer)
```

<details><summary>点开查看逐步解答</summary>

题目中的“下一步”“轨迹”都说明动作会改变后续环境，所以应把 `answer` 改为 `"是"`。若每次选择互不影响、立刻结束，才更像普通一次性决策。

</details>

## 7. 选读边界

如果所有选择互不影响，问题退化为独立优化。如果环境转移完全已知且目标可分解，动态规划常常更直接。强化学习的特殊困难在于长期后果、随机环境和有时只能通过试错获得反馈。

## 8. 下一站

下一课把“谁做决定、谁给反馈”拆成 agent 和 environment 的标准循环。

→ [Agent、Environment、State、Action 与 Reward](./20-agent-environment.md)
