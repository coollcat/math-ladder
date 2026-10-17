---
title: 价值迭代
lesson_id: rl/value-iteration
prereqs:
  - rl/policy-iteration
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - value-iteration
  - contraction-mapping
applications:
  - gridworld-navigation
  - shortest-path
exits:
  - engineering
  - data-ai
---

# 价值迭代

## 1. 开场钩子

往一杯水里滴墨水，每次搅拌都会让颜色更均匀。价值迭代每做一轮 Bellman 最优 backup，就把价值估计往不动点拉近一点。

## 2. 直觉解释

价值迭代不维护明确策略进行完整评估，而是在每个状态执行：

$$v_{k+1}(s)=\max_a\sum_{s'}P(s'\mid s,a)\left[r+\gamma v_k(s')\right].$$

扫完所有状态后，从最终价值导出贪心策略。$\gamma<1$ 时备份映射是压缩映射，重复应用会收敛到唯一不动点。

## 3. 正式定义

Bellman 最优算子 $T$ 定义为：

$$(Tv)(s)=\max_a\sum_{s'}P(s'\mid s,a)\left[R(s,a,s')+\gamma v(s')\right].$$

若 $0\le\gamma<1$，则对任意 $u,v$：

$$\lVert Tu-Tv\rVert_\infty\le\gamma\lVert u-v\rVert_\infty.$$

因此 $T$ 有唯一不动点 $V^*$。

## 4. 分步例题

确定性一行世界，目标在最右：

1. 初始 $v=[0,0,0]$；
2. 第一次扫描：中间格看到终点奖励，$v_1(1)=1$；
3. 第二次扫描：左格通过中间格得到 $0.9\times1$；
4. 第三次扫描几乎不再变化；
5. 最终贪心策略全部向右。

## 5. 动手实验

### 实验 1（网页）：同步扫描，Δ 和误差上界一起缩水

```lab
{
  "type": "gridworld-value-lab",
  "title": "价值迭代：Δ 与误差上界一起缩水",
  "mode": "vi",
  "gamma": 0.9,
  "slip": 0.2
}
```

怎么玩：点「单步 ▶」走一轮同步扫描——整轮只读旧表 $V_k$，波纹从终点向外一排排落格，全部落完才换新表。读数栏里 $\Delta_k$ 是本轮最大变化，$\gamma/(1-\gamma)\cdot\Delta_k$ 是**不依赖真值**的误差上界，最后一行是实际误差（对照组件内部离线算好的 $V^*$——用它验证「上界确实压得住误差」）。把 $\gamma$ 拧到 0.95：$\Delta_k\le\gamma\,\Delta_{k-1}$ 依然成立，但缩水系数最多只到 0.95，收敛明显变慢——压缩率就是收敛速度。想看「策略是价值的后果」，就在扫了几轮后读格子里的箭头：滑倒概率不为 0 时，它们未必是直线冲向终点的那一套。

### 实验 2（python，深入）：4 格线性世界逐轮打印

下面跑一个小网格的同步价值迭代，最大轮数固定，并输出策略箭头。

```python title="4 格线性世界的价值迭代"
GAMMA = 0.9                 # 必须小于 1 才有压缩性
MAX_ITERATIONS = 30         # 最大迭代轮数
TOL = 1e-6                  # 收敛阈值
n_states = 4                # 0,1,2 可动；3 为终点

values = [0.0] * n_states   # values 是长度为 4 的价值列表

def step(s, direction):     # direction=-1 左，direction=1 右
    return min(max(s + direction, 0), n_states - 1)

def immediate_reward(next_s):
    return 1 if next_s == n_states - 1 else 0

for it in range(MAX_ITERATIONS):
    new_values = values[:]              # 复制一份旧表：本轮只读 values、只写 new_values（同步更新）
    for s in range(n_states - 1):
        candidates = []
        for d in [-1, 1]:
            ns = step(s, d)
            candidates.append(immediate_reward(ns) + GAMMA * values[ns])
        new_values[s] = max(candidates)
    delta = max(abs(new_values[i] - values[i]) for i in range(n_states))
    values = new_values
    print("iter", it + 1, "values", [round(v, 5) for v in values], "delta", round(delta, 7))
    if delta < TOL:
        break

arrows = []
for s in range(n_states - 1):
    left_v = immediate_reward(step(s, -1)) + GAMMA * values[step(s, -1)]
    right_v = immediate_reward(step(s, 1)) + GAMMA * values[step(s, 1)]
    arrows.append("<" if left_v > right_v else ">")
print("greedy arrows", arrows)
```

:::warning[常见误区]

- 你以为必须等到 delta 为零，工程上常用阈值提前停止并保留近似误差。
- 你以为异步更新一定错，异步价值迭代也常收敛，但分析更依赖扫描顺序。
- 你以为价值迭代输出的是价值本身，最终使用者还需要提取贪心策略。

:::

## 6. 练习

```exercise
# @title: 提取最优贪心动作
# @check: right
# @hint: 比较左右两个 backup，返回较大的动作名。
backup_left = 2.1
backup_right = 2.7
best = "left"  # 学生应根据两个数值选择方向
print(best)
```

<details><summary>点开查看逐步解答</summary>

因为 $2.7>2.1$，贪心规则选择 `right`。代码可写成 `best = "left" if backup_left > backup_right else "right"`。

</details>

## 7. 选读证明

<details><summary>选读：压缩性来源</summary>

对每个状态，两个价值表的 backup 差至多为对应下一状态差的最大绝对值乘以 $\gamma$；max 只会选择差异最大的那个动作。因此在无穷范数下整张表被至少压缩 $\gamma$ 倍，Banach 不动点定理保证唯一收敛点。

</details>

## 8. 下一站

动态规划需要知道转移模型。下一课开始放松这个要求：只靠经验做 TD 学习。

→ [TD 学习与自举](./130-td-learning.md)
