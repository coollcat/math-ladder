---
title: Markov 性质
lesson_id: rl/markov-property
prereqs:
  - rl/episode-trajectory
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - markov-property
  - state-representation
applications:
  - board-games
  - queueing-control
exits:
  - data-ai
---

# Markov 性质

## 1. 开场钩子

下象棋时，裁判不会要求你背出前四十手才允许思考。只要当前棋盘局面给定，未来规则就不再依赖你是怎么走到这里的。这就是 Markov 性质带来的解放。

## 2. 直觉解释

如果“现在状态 + 动作”已经包含预测未来所需的全部信息，未来就只依赖现在，而不依赖更早的历史。

这不是说过去没用，而是说过去的有用部分已经被压进当前状态。若状态只记汽车的位置却不记速度，加速度控制就不是 Markov 的；把速度加进状态，往往又变回 Markov。

## 3. 正式定义

转移满足 Markov 性质，当对所有历史 $h_t$、状态 $s'$ 和动作 $a$：

$$P(s_{t+1}=s'\mid s_t=s,a_t=a,h_t)=P(s_{t+1}=s'\mid s_t=s,a_t=a).$$

其中 $h_t$ 表示截至 $t$ 的完整历史。

## 4. 分步例题

迷宫机器人的状态有两个版本：

1. 版本 A 只记录坐标 $(x,y)$；
2. 若门钥匙是否持有会影响通行，则 A 不是 Markov；
3. 版本 B 记录 $(x,y,\text{有无钥匙})$；
4. 给定 B 和动作，下一步概率不再依赖更早路径；
5. 所以扩大状态表示可以让过程恢复 Markov 性质。

## 5. 动手实验

用一个有界计数器检查“只看当前位置”和“看位置加剩余冷却”的预测差异。

```python title="判断补全状态是否消除历史依赖"
import random  # 抽样隐藏事件

random.seed(44)               # 固定随机种子
MAX_STEPS = 16                # 最大步数

def next_cell(partial_state): # 只根据位置给出确定性猜测
    return partial_state[0]

def next_full(full_state):    # 根据位置和冷却阶段预测
    position, phase = full_state
    return position if phase == 0 else position + 1

history = []                  # history 保存历史元组
s = (0, 1)                   # 完整状态：位置 0，阶段 1
for t in range(MAX_STEPS):
    hidden = random.randint(0, 1)   # randint 包含两端整数
    history.append((s, hidden))
    if hidden == 1:
        break
    s = (s[0], 1 - s[1])     # 元组下标访问并在 0/1 间切换

last_partial = history[-1][0][0]   # 最后位置的简化状态
last_full = history[-1][0]
print("partial prediction", next_cell((last_partial,)))
print("full prediction", next_full(last_full))
```

:::warning[常见误区]

- 你以为 Markov 表示“未来与过去无关”，其实是给定现在后，额外的历史不提供新信息。
- 你以为随机性破坏 Markov 性质，破坏者通常是遗漏了关键状态变量。
- 你以为状态越多越好，冗余特征会增加表格规模和学习难度。

:::

## 6. 练习

```exercise
# @title: 补全购物推荐的状态
# @check: ['浏览历史', '最近购买间隔']
# @hint: 让状态包含会影响下次响应的近期事实，而不是不可验证的心理动机。
features = ["浏览历史"]
if False:                             # 学生应把条件改成缺少关键特征时为真
    pass                              # pass 表示暂时不执行任何操作
print(features)
```

<details><summary>点开查看逐步解答</summary>

只看浏览历史时，同样页面可能因为刚刚买过而得到不同响应。可写 `if "最近购买间隔" not in features: features.append("最近购买间隔")`。加入后，当前状态更能决定下一步分布，输出为列表 `['浏览历史', '最近购买间隔']`。

</details>

## 7. 选读证明

<details><summary>选读：条件独立性视角</summary>

Markov 性质等价于在条件 $s_t,a_t$ 下，未来变量与过去历史条件独立。用链式法则展开联合分布时，所有含历史的因子都可替换成只含 $s_t,a_t$ 的转移因子，因此建模只需要一步转移核。

</details>

## 8. 下一站

有了 Markov 状态，就能写出强化学习最核心的数学模型：MDP 五元组。

→ [MDP 五元组](./50-mdp.md)
