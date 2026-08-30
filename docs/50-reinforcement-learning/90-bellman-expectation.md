---
title: Bellman 期望方程
lesson_id: rl/bellman-expectation
prereqs:
  - rl/action-value
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_import: []
introduces_concepts:
  - bellman-expectation-equation
applications:
  - dynamic-programming
exits:
  - data-ai
  - research
---

# Bellman 期望方程

## 1. 开场钩子

想知道从家到机场的时间，不必一次算完整条路：先算到高速入口的一段时间，再加上“高速入口到机场”的已知时间。Bellman 方程就是这种把未来折叠进下一状态的递推。

## 2. 直觉解释

对一个**固定策略**，当前价值只有两块：

1. 这一步能拿到的即时奖励；
2. 折扣后的下一状态价值。

如果环境随机，就对所有可能的下一状态取平均。如果策略随机，先按策略对所有动作取平均。

## 3. 正式定义

状态价值满足：

$$V^\pi(s)=\sum_a\pi(a\mid s)\sum_{s'}P(s'\mid s,a)\left[R(s,a,s')+\gamma V^\pi(s')\right].$$

动作价值满足：

$$Q^\pi(s,a)=\sum_{s'}P(s'\mid s,a)\left[R(s,a,s')+\gamma V^\pi(s')\right].$$

Bellman 期望方程描述 $\pi$ 固定时的真实价值，不负责寻找更好策略。

## 4. 分步例题

确定性转移，$\gamma=0.8$：

1. 状态 A 选唯一动作右，得 $r=1$，到达 B；
2. 已知 $V(B)=2$；
3. 代入 $V(A)=1+0.8\times2=2.6$；
4. 若有两条等概率出路，分别给出 $1+0.8V(B)$ 和 $0+0.8V(C)$；
5. 则对两条 backup 取平均，而不是先平均奖励再单独处理下一状态。

## 5. 动手实验

下面用小网格手算式迭代求解固定策略的价值。迭代次数硬编码，避免无限循环。

```python title="固定策略的 Bellman 迭代"
GAMMA = 0.9                 # 折扣因子
N_SWEEPS = 20               # 最大扫描次数

# 三个格子排成一行：0 -> 1 -> 终点 2；策略总是右行。
rewards = [0, 0, 1]         # 进入每个格子的即时奖励；终点在第 2 格
v = [0.0, 0.0, 0.0]        # v 列表保存三个状态的估计值

for sweep in range(N_SWEEPS):
    new_v = v[:]             # 浅拷贝列表，得到 [v0, v1, v2]
    for s in [0, 1]:         # 只更新非终点状态
        next_s = min(2, s + 1)
        new_v[s] = rewards[next_s] + GAMMA * v[next_s]
    v = new_v
    if sweep < 5 or sweep == N_SWEEPS - 1:   # 打印前几次与最后一次
        print("sweep", sweep + 1, [round(x, 5) for x in v])
```

:::warning[常见误区]

- 你以为 Bellman 期望方程会自动找最优策略，它只评估给定策略。
- 你以为方程里的 V 是任意数，收敛后它必须同时满足所有状态的递推关系。
- 你以为必须知道整条轨迹才能算，递推允许用下一状态价值代替剩余路径。

:::

## 6. 练习

```quiz
Bellman 期望方程中的 V^pi 表示什么？
- 当前状态下即时奖励的最大值
- 按固定策略 pi 从状态出发的长期折扣回报期望 [*]
- 所有策略中最高的可能得分
? 它是评估一个已经给定的策略，不是直接求最优策略。
```

```exercise
# @title: 单步 Bellman 备份
# @check: 7.4
# @hint: 即时奖励加 gamma 乘下一状态价值。
r = 2
gamma = 0.9
next_v = 6
v_backup = r  # 学生需补上折扣后的 next_v
print(v_backup)
```

<details><summary>点开查看逐步解答</summary>

$2+0.9\times6=2+5.4=7.4$。这个数是把下一状态价值折回当前状态后的 backup 值。

</details>

## 7. 选读证明

<details><summary>选读：由条件期望推导</summary>

从 $V^\pi(s)=E_\pi[G_t\mid s]$ 开始，用 $G_t=R_{t+1}+\gamma G_{t+1}$ 展开，再用全期望公式对 $a$ 和 $s'$ 求和。因为 $E[G_{t+1}\mid s']=V^\pi(s')$，得到 Bellman 期望方程。

</details>

## 8. 下一站

固定策略会有一套 Bellman 方程。若把“按策略平均”换成“选最好的动作”，就得到 Bellman 最优方程。

→ [100 · Bellman 最优方程](./100-bellman-optimality.md)
