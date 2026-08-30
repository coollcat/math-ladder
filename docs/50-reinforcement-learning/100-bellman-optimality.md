---
title: Bellman 最优方程
lesson_id: rl/bellman-optimality
prereqs:
  - rl/bellman-expectation
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - bellman-optimality-equation
applications:
  - shortest-path
  - energy-scheduling
exits:
  - research
  - engineering
---

# Bellman 最优方程

## 1. 开场钩子

导航软件在每个路口不是问“常走的路线怎么走”，而是问“从这里出发，哪条下一步能让总时间最短”。把“平均”换成“最大”，Bellman 期望方程就变成最优方程。

## 2. 直觉解释

最优状态价值 $V^*(s)$ 是所有策略中能达到的最高长期期望回报。它的递推结构仍是“即时奖励 + 未来”，但动作不再由固定策略决定，而由当前这一步选择最有希望的动作。

注意：最大化发生在动作上，环境随机性仍然要平均。

## 3. 正式定义

$$V^*(s)=\max_a\sum_{s'}P(s'\mid s,a)\left[R(s,a,s')+\gamma V^*(s')\right].$$

对应地，

$$Q^*(s,a)=\sum_{s'}P(s'\mid s,a)\left[R(s,a,s')+\gamma V^*(s')\right],$$

且

$$V^*(s)=\max_a Q^*(s,a).$$

贪心于 $Q^*$ 的策略是最优策略。

## 4. 分步例题

两个动作，$\gamma=1$：

1. 左：确定得 3，之后价值为 1，backup 为 4；
2. 右：确定得 4，之后价值为 6，backup 为 10；
3. 这里每个动作只有一条确定性出路，所以不需要对下一状态加权；
4. 左的 backup 是 4，右的 backup 是 10；
5. 所以 $V^*(s)=10$，最优动作是右。

## 5. 动手实验

下面比较“贪图眼前”和“Bellman 最优”在有岔路的小迷宫中的表现。

```python title="单路口的最优动作选择"
MAX_BRANCHES = 2       # 最大分支数
GAMMA = 1.0            # 本例为有限两步，可取 1

def backup(r, next_v):                    # 计算一个确定性转移的评价
    return r + GAMMA * next_v

branches = []                             # 每个元素是 (r, 下一状态价值)
for i in range(MAX_BRANCHES):
    if i == 0:
        branches.append((3, 1))           # 慢但后续价值较低
    else:
        branches.append((4, 6))           # 稍慢但通往高价值状态

expected_backups = []
for r, next_v in branches:                # 元组解包
    expected_backups.append(backup(r, next_v))

best_action = expected_backups.index(max(expected_backups))
print("expected backups", [round(x, 3) for x in expected_backups])
print("best action", best_action, "V*", max(expected_backups))
```

:::warning[常见误区]

- 你以为 max 应该放在环境和动作上都用，随机性要先对下一状态取期望。
- 你以为最优策略一定唯一，若有多个动作并列最大，可有多个最优策略。
- 你以为 $V^*$ 是某个策略的价值，它是所有策略可达价值的上确界，通常由最优策略实现。

:::

## 6. 练习

```quiz
Bellman 最优方程和期望方程最关键的差别是什么？
- 最优方程没有折扣因子
- 最优方程在动作上取 max，期望方程按固定策略加权平均 [*]
- 最优方程不需要考虑下一状态
? 随机下一状态仍要平均；区别在于动作如何被选中。
```

```exercise
# @title: 找出最优 backup
# @check: 10.0
# @hint: 分别计算两个动作的即时奖励加未来价值，再输出较大者。
candidates = [3.0 + 1.0, 4.0 + 6.0]
best = candidates[0]  # 学生应改成两个候选中的最大值
print(best)
```

<details><summary>点开查看逐步解答</summary>

两个候选 backup 分别是 4.0 和 10.0。这里第二个动作更优，所以应使用 `best = max(candidates)`，输出 `10.0`。

</details>

## 7. 选读证明

<details><summary>选读：为什么贪心于 Q* 是最优</summary>

若在每一步选择使 $Q^*(s,a)$ 最大的动作，则每步都达到 $V^*(s)=\max_aQ^*(s,a)$。归纳可得由此构造的策略获得 $V^*$ 对应的期望回报；任何其他策略不能超过它，因为它已在动作层逐点最大化。

</details>

## 8. 下一站

知道最优方程还不够，要有能算出它的算法。第一站是策略迭代。

→ [110 · 策略迭代](./110-policy-iteration.md)
