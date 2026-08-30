---
title: 深度强化学习：把表格换成网络
lesson_id: rl/dqn-actor-critic
prereqs:
  - rl/q-learning
  - rl/reinforce
  - deep-learning/backprop
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - function-approximation
  - experience-replay
  - target-network
  - actor-critic
applications:
  - atari-game-playing
  - continuous-control
exits:
  - data-ai
  - research
---

# 深度强化学习：把表格换成网络

## 1. 开场钩子

Q 表在四格小世界里很好用，可雅达利游戏的原始画面有几百万种像素组合——每个状态一行、每个动作一列的表格，内存装不下，没走过的局面更是永远填不上。2015 年的 DQN 把表格换成神经网络，配上两件稳压器，才让「深度」与「强化」真正焊在一起。本课拆开这套三件套，并顺手给 Actor-Critic 架构发出生证明——下一课的 baseline、再下一课的 PPO 都要靠它。

## 2. 直觉解释

把 Q 学习的目标再抄一遍：

$$Y=r+\gamma\max_{a'}Q(s',a').$$

表格时代，右边的 Q 查表即得；换成网络后，三件事立刻出问题，DQN 三件套一一对症：

1. **表格装不下 → 函数逼近**。让网络 $Q(s,a;\theta)$ 自己算估值：相似的状态共享同一组参数，没见过的局面也能插值出一个像样的分数。
2. **样本结块 → 经验回放**。把每一步经历 $(s,a,r,s')$ 存进回放池，训练时随机抽一小批来学：游戏里连续几帧几乎一模一样，顺序学习等于反复咀嚼同一口——洗牌打散相关性，样本才像独立抽的。
3. **追自己的影子 → 目标网络**。目标 $Y$ 里的下一状态估值不用正在训练的网络算，而用一份隔一阵才同步一次的冻结副本（参数记作 $\theta^-$）：影子不跟着你动，追逐才追得上。

下半场请出 Actor-Critic：两个网络分工——**critic** 是价值网络，负责「值不值」（学 $V(s)$）；**actor** 是策略网络，负责「怎么做」（学 $\pi(a\mid s)$）。critic 打出的分差，正好当 actor 的指南针。

## 3. 正式定义

DQN 把 Q 学习改写成一次回归：

$$L(\theta)=\mathbb E\big[(Y-Q(s,a;\theta))^2\big],\qquad Y=r+\gamma\max_{a'}Q(s',a';\theta^-).$$

| 符号 | 含义 |
| --- | --- |
| $Q(s,a;\theta)$ | 在线 Q 网络：参数 $\theta$ 每步都更新 |
| $\theta^-$ | 目标网络参数：每隔 $C$ 步才从 $\theta$ 抄一次，期间冻结 |
| $Y$ | 回归目标：即时奖励加折扣后的下一状态最优估值 |
| $L(\theta)$ | TD 误差的平方；反向传播（第 46 章）据此给全体参数定责 |

Actor-Critic 用两个网络完成一次双向更新，优势定义为：

$$A(s,a)=r+\gamma V_v(s')-V_v(s).$$

| 符号 | 含义 |
| --- | --- |
| $\pi_\theta(a\mid s)$ | actor：策略网络，参数 $\theta$ 控制动作分布 |
| $V_v(s)$ | critic：价值网络，参数 $v$ 给状态打长期回报的预期分 |
| $A(s,a)$ | 优势：这一步比 critic 的预期好多少——它正是第 130 课的 TD 误差 |

优势的完整身份是 $A=Q-V$（第 80 课减第 70 课），实践中常用 TD 误差当它的样本。下一课会证明：把只依赖状态的 $V$ 当 baseline 减掉，不改变梯度期望、却大幅降方差——这里先直接用结论：$A>0$ 推大该动作概率，$A<0$ 压小。actor 的更新沿用第 170 课的策略梯度，只是把回报 $G$ 换成优势 $A$；critic 的更新沿用第 130 课的 TD 学习。

## 4. 分步例题

**第一场：DQN 的目标走账。** 某次转移 $(s,a,r,s')$，$r=1$、$\gamma=0.9$：

1. 在线网络当前给 $Q(s,a;\theta)=2$；
2. 冻结的目标网络在下一状态两个动作上输出 $[4, 6]$；
3. 目标 $Y=1+0.9\times 6=6.4$（max 只对下一动作，$\theta^-$ 全程不动）；
4. 回归误差 $Y-Q(s,a;\theta)=4.4$，反向传播把这笔账摊给全体参数；
5. 下一次同步之前 $\theta^-$ 依然是旧参数——回归追的是一个不动的靶子。

**第二场：Actor-Critic 的一步。** 同一时刻 critic 侧 $V_v(s)=3$、$V_v(s')=6$：

1. TD 目标同样是 $1+0.9\times 6=6.4$；
2. 优势 $A=6.4-3=3.4$——实际进展比 critic 的预期高出一截；
3. actor 沿策略梯度推大动作 $a$ 的概率，幅度正比 $3.4$；
4. critic 向目标拉一小步：$3+0.1\times 3.4=3.34$；
5. 两笔更新同幕完成：critic 的分差指挥 actor，actor 的探索又喂给 critic 新数据。

## 5. 动手实验

### 实验 1：函数逼近的泛化——直线就是最简单的「网络」

```viz
{
  "type": "fit",
  "title": "拖动散点当访问过的状态，直线当估值函数",
  "n": 7
}
```

每个散点是一个「访问过的状态」，直线是单参数网络的估值函数。删掉几个点再拖拖看：没被访问的位置照样落在直线上——网络靠共享参数插值出没见过的状态的估值，这是任何 Q 表都做不到的。

### 实验 2：冻结目标 vs 在线目标——追影子的下场

三格链 0-1-2，向右走到终点领奖励 1；估值函数只有一个参数 $w$（$Q(s)=w\times(s+1)$）。两种追法代码只差一处：目标里的下一状态估值，用「十轮前的冻结副本」还是「刚刚更新的在线网络」。

```python title="冻结目标 vs 在线目标：同一个世界的两种追法"
# 世界：三格链 0-1-2，向右走到终点 2 领奖励 1；Q(s) = w * (s + 1) 只有一个参数 w
gamma = 0.9            # 折扣因子
alpha = 0.2            # 学习率：故意取大，让隐患现身
ROUNDS = 60            # 训练轮数：每轮从状态 0 扫到 2
SYNC_EVERY = 10        # 冻结版每 10 轮才把在线参数抄给目标网络

def sweep(w, w_minus, use_frozen):   # 从左到右扫一遍三个状态，返回更新后的 w
    for s in range(3):
        if s == 2:
            y = 1.0                        # 终点：目标就是奖励本身
        else:
            if use_frozen:
                q_next = w_minus           # 冻结副本给的下一状态估值
            else:
                q_next = w                 # 在线网络自己给的估值
            y = gamma * q_next * (s + 2)   # 目标 = 0 加 gamma 乘下一状态估值
        q_sa = w * (s + 1)                 # 当前估值
        w = w + alpha * (y - q_sa) * (s + 1)   # 误差乘输入：w 的梯度恰是 (s+1)
    return w

w_online = 0.0            # 在线版：目标由 w 自己提供
w_frozen = 0.0            # 冻结版的在线参数
w_minus = 0.0             # 冻结版的目标网络参数
online_track = []         # 记录在线版每 10 轮的 w 快照
frozen_track = []         # 记录冻结版每 10 轮的 w 快照
for rnd in range(ROUNDS):
    w_online = sweep(w_online, w_online, False)   # False：目标用在线网络
    w_frozen = sweep(w_frozen, w_minus, True)     # True：目标用冻结副本
    if (rnd + 1) % SYNC_EVERY == 0:    # % 是取模：能被 10 整除的轮次才同步
        w_minus = w_frozen
    if (rnd + 1) % 10 == 0:
        online_track.append(round(w_online, 1))
        frozen_track.append(round(w_frozen, 1))

print("在线目标 w 快照:", online_track)
print("冻结目标 w 快照:", frozen_track)
```

同一个世界、同一个学习率：在线版每 10 轮的快照是 `[-1.3, -8.3, -47.7, -267.9, -1499.5, -8386.8]`——目标追着刚更新的自己跑，误差自我强化，振荡一路放大；冻结版的快照是 `[0.5, 0.1, 0.5, 0.2, 0.4, 0.2]`——目标每十轮才动一次，始终贴着零附近温和摆动。把 alpha 改成 0.1 再跑：两边都收敛到 0.34 附近，差异几乎消失。**三件套不是玄学，是小步长与冻结目标两条腿一起撑住的稳定**。

### 实验 3：actor-critic 的一次双向更新

确定性的一幕：抽到动作 1、实际回报 5，critic 开局打分 2。

```python title="一次 actor-critic 双向更新（确定性走账）"
import math  # math.exp：softmax 概率要用

theta = [0.0, 0.0]     # actor 的两个动作偏好分数
v_s = 2.0              # critic 对当前状态的打分
alpha = 0.1            # actor 学习率
beta = 0.1             # critic 学习率
reward = 5.0           # 这一幕实际拿到的回报（抽到了动作 1）

e0 = math.exp(theta[0])            # 偏好 0 的指数
e1 = math.exp(theta[1])            # 偏好 1 的指数
p0 = e0 / (e0 + e1)                # 动作 0 概率
p1 = e1 / (e0 + e1)                # 动作 1 概率
advantage = reward - v_s           # 优势：实际回报比 critic 预期好多少
# 第 170 课的 score 向量：选中动作 1 时是 (负 p0, 1 减 p1)
theta[0] = theta[0] + alpha * advantage * (-p0)
theta[1] = theta[1] + alpha * advantage * (1 - p1)
v_s = v_s + beta * (reward - v_s)  # critic 向实际回报拉一小步（第 130 课的 TD）

n0 = math.exp(theta[0])            # 更新后的两个指数
n1 = math.exp(theta[1])
print("更新前概率", round(p0, 4), round(p1, 4))
print("优势", round(advantage, 4))
print("更新后概率", round(n0 / (n0 + n1), 4), round(n1 / (n0 + n1), 4))
print("critic 新打分", round(v_s, 4))
```

优势 3.0 为正：动作 1 的概率从 0.5 涨到 0.5744；critic 也把打分从 2.0 抬到 2.3——一次更新，两个网络各拿各的账。

::::warning[常见误区]

- 你以为函数逼近是无脑升级——它换掉了 Q 表的收敛保证：函数逼近、自举、离策略三者叠加可能不稳定（第 140 课点过名），DQN 三件套正是为此补的护栏。
- 你以为目标网络该随时同步——同步太勤等于没冻结，太懒又拿陈旧目标误导回归；工程上常隔几千步同步一次，或按小比例软混合。
- 你以为 actor-critic 是一个更大的网络——是两个独立网络：critic 的 TD 误差顺手就是优势估计，actor 只吃这个信号，两边学习率通常分开调。

::::

## 6. 练习

```quiz
DQN 的目标 Y 里的下一状态估值，应该由谁计算？
- 正在训练的在线网络自己
- 每隔 C 步才同步一次的冻结目标网络 [*]
- 上一课的 Q 表（要留着兜底）
? 目标必须来自不随本步更新的参数副本，否则回归追的是会动的影子——实验 2 演示了后果。
```

```exercise
# @title: 一次 DQN 目标与一次优势更新
# @check: 6.4
# @check: 3.4
# @hint: 目标是 r 加 gamma 乘目标网络输出的下一状态最大 Q；优势等于目标减 critic 打分；打印前用 round(…, 4) 修掉浮点尾巴。
q_sa = 2.0
next_q_target = [4.0, 6.0]   # 冻结的目标网络在下一状态两个动作上的输出
r = 1.0
gamma = 0.9
v_s = 3.0                    # critic 对当前状态的打分
y = r                        # 学生需补上 gamma 乘 max(next_q_target)
advantage = q_sa             # 学生需改成 y 减 v_s
print(round(y, 4))
print(round(advantage, 4))
```

<details><summary>点开查看逐步解答</summary>

max(next_q_target) 是 6，目标 $Y=1+0.9\times 6=6.4$；优势 $A=6.4-3=3.4$。目标网络只负责提供 $[4,6]$，max 挑出更好的那个——它本身不参与本步更新。

</details>

## 7. 选读边界

<details><summary>选读：影子追逐为什么振荡</summary>

在线更新把「估值」和「目标」拴在同一个参数上：$w\leftarrow w+\alpha\,(Y(w)-Q(w))$ 的每轮复合增益一旦越过了 1，误差就像对着一面会放大的镜子照镜子。实验 2 里 $\alpha=0.2$ 时在线版每轮净增益约 $1.19$ 倍——60 轮放大约六千倍；$\alpha=0.1$ 时增益约 $0.12$，稳稳收敛。目标网络把 $Y(w)$ 换成 $Y(\theta^-)$：更新链条被切断，$\theta^-$ 对本步梯度是常数，回归退化成普通的固定目标拟合——这就是它能兜底的原因。DQN 的完整配方还叠加了小学习率与梯度截断，三道防线缺一不可。

</details>

DQN 之后的改进族各治一病：Double DQN 治 max 带来的高估，Dueling 把状态价值与优势拆成两条头，优先回放让 TD 误差大的样本多上场。优势估计也有更讲究的版本（GAE）；下一章的 PPO 就是 actor-critic 加一道裁剪——它替你把「别一步走太远」装上限位器。

## 8. 下一站

有了 critic 当指南针、目标网络当稳压器，策略梯度一族还差最后一块拼图：更新幅度本身要有人管。下一课把「减 baseline 为什么不偏」讲透，为 PPO 铺路。

→ [Baseline 与方差降低](./180-baseline-variance.md)
