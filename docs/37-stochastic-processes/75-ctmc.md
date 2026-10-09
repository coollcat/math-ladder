---
title: 连续时间马尔可夫链
lesson_id: stochastic-processes/ctmc
prereqs:
  - stochastic-processes/markov-chain
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - generator-matrix
  - birth-death-process
  - embedded-chain
  - holding-time
applications:
  - queueing-theory
  - reliability-engineering
  - population-dynamics
exits:
  - data-ai
---

# 连续时间马尔可夫链

## 1. 从一个场景开始

一家急诊室每小时平均来 5 位患者，医生看诊平均每 12 分钟一位。候诊区有 10 个座位。问：患者到达时发现满座的概率是多少？

这不是离散时间的问题——患者不会整整齐齐每 12 分钟排一个。他们随时可能来，就诊时间也长短不一。我们需要一种模型：**状态可以在任意时刻跳转**，而不仅仅在 $t=1,2,3,\ldots$。这就是连续时间马尔可夫链（CTMC）。

## 2. 直觉解释

离散时间 MC（DTMC）像一只有固定节奏的钟：每"滴答"一次，状态按转移矩阵 $P$ 跳一次。CTMC 像一颗没准的心脏：在每个状态"待一会儿"，待多久是随机的，然后跳到下一个状态。

核心规则只有两条：

- **待多久**？在状态 $i$ 的停留时间服从指数分布 $\text{Exp}(\lambda_i)$——无记忆性意味着"还要等多久"跟"已经等了多久"无关；
- **跳去哪**？跳出 $i$ 时，跳到 $j$ 的概率 $q_{ij}/\lambda_i$ 是固定的——跳转方向和停留时长是独立的。

把"待多久"和"跳去哪"合在一起，就是 CTMC 的全部信息，浓缩在**Q 矩阵**（生成元矩阵）里。

## 3. 正式定义

**Q 矩阵**（生成元矩阵）：

$$Q = \begin{pmatrix} -\lambda_0 & q_{01} & q_{02} & \cdots \\ q_{10} & -\lambda_1 & q_{12} & \cdots \\ \vdots & & \ddots & \end{pmatrix}$$

| 符号 | 含义 |
| --- | --- |
| $q_{ij} \ge 0$（$i\ne j$） | 从 $i$ 到 $j$ 的转移速率 |
| $\lambda_i = \sum_{j\ne i}q_{ij}$ | 离开状态 $i$ 的总速率 |
| $-q_{ii} = \lambda_i$ | 对角线元素（每行和为 0） |
| $P(t) = e^{Qt}$ | 转移概率矩阵（矩阵指数） |

**嵌入链**：忽略停留时间，只看跳转方向。嵌入链的转移矩阵 $\tilde{P}_{ij}=q_{ij}/\lambda_i$（$i\ne j$），是一个标准的 DTMC。

**生灭过程**：CTMC 的重要特例，状态为 $\lbrace 0,1,2,\ldots\rbrace$，只允许相邻跳转：

- 生速率 $\lambda_i$（$i\to i+1$）
- 灭速率 $\mu_i$（$i\to i-1$）

## 4. 分步例题

**例**：M/M/1/3 队列（1 个服务员，最多 3 人排队，含正在服务的）。到达率 $\lambda=2$/小时，服务率 $\mu=3$/小时。

Q 矩阵（状态 0,1,2,3 = 系统中人数）：

$$Q = \begin{pmatrix} -2 & 2 & 0 & 0 \\ 3 & -5 & 2 & 0 \\ 0 & 3 & -5 & 2 \\ 0 & 0 & 3 & -3 \end{pmatrix}$$

**稳态分布**：解 $\pi Q=0$，$\sum\pi_i=1$。

由生灭过程的乘积公式：$\pi_n = \pi_0\prod_{i=0}^{n-1}\frac{\lambda_i}{\mu_{i+1}}=\pi_0\rho^n$，其中 $\rho=\lambda/\mu=2/3$。

$\pi_0=1/(1+\rho+\rho^2+\rho^3)=(1-\rho)/(1-\rho^4)=\frac{1/3}{1-16/81}=\frac{27}{65}$。

$\pi_1=18/65$，$\pi_2=12/65$，$\pi_3=8/65$。

满座概率 $\pi_3=8/65\approx12.3\%$。

## 5. 动手实验

### 实验 1（viz）：生灭过程的状态转移

```viz
{
  "type": "plot",
  "title": "稳态概率 π_n vs ρ = λ/μ",
  "expr": "(1-x)*x^n",
  "xmin": 0.1,
  "xmax": 0.9,
  "sliders": [
    { "name": "n", "min": 0, "max": 5, "step": 1, "value": 3 }
  ]
}
```

拖动 $n$：当 $\rho\to1$（到达≈服务），$\pi_n$ 在所有状态上趋于均匀——系统"堵死了"。

### 实验 2（python）：CTMC 的矩阵指数与模拟

```python title="CTMC 模拟：M/M/1/3 队列的稳态分布"
import random                   # 随机数库
import math                     # 数学函数库（取对数）
random.seed(42)                 # 固定随机种子：同一串随机数，结果可复现

# Q 矩阵的行：状态 0,1,2,3
lam = 2.0   # 到达率
mu = 3.0    # 服务率

def simulate_ctmc(steps):
    # CTMC 蒙特卡洛模拟
    state = 0                    # 从空系统开始
    times = [0.0, 0.0, 0.0, 0.0] # 每个状态的累计停留时间
    for _ in range(steps):
        # 计算离开当前状态的总速率
        if state == 0:
            rate = lam           # 只能到达
        elif state == 3:
            rate = mu            # 只能离开（满员）
        else:
            rate = lam + mu      # 可到达可离开

        # 停留时间：指数分布
        hold = -math.log(random.random()) / rate  # 指数分布采样
        times[state] += hold       # 按停留时间加权（不是按跳转次数）

        # 跳转方向
        if state == 0:
            state = 1
        elif state == 3:
            state = 2
        else:
            if random.random() < lam / (lam + mu):
                state = state + 1   # 到达
            else:
                state = state - 1   # 离开

    total = sum(times)
    return [v / total for v in times]    # 按停留时间占比归一化，得到稳态概率估计

# 理论值
rho = lam / mu
pi0 = (1 - rho) / (1 - rho ** 4)
theory = [pi0 * rho ** n for n in range(4)]
print(f"理论稳态: {[round(p, 4) for p in theory]}")   # f-string 内嵌列表推导，逐个 round 到 4 位小数

# 模拟值
sim = simulate_ctmc(200000)
print(f"模拟稳态: {[round(p, 4) for p in sim]}")
```

模拟值与理论值高度吻合——CTMC 的"心脏"在长期运行中找到了自己的节奏。

## 6. 常见误区

:::warning[常见误区]

**误区一**："CTMC 就是 DTMC 的时间取连续值。" 不只是连续化——DTMC 的转移概率用矩阵 $P$ 描述，CTMC 用速率矩阵 $Q$。$P$ 的每行和为 1，$Q$ 的每行和为 0。$P=e^{Qt}$ 才是真正的桥梁。

**误区二**："到达率 $\lambda$ 越大，系统越忙。" 取决于 $\rho=\lambda/\mu$。$\rho<1$ 时系统稳定，$\rho\ge1$ 时队列无限增长。单看 $\lambda$ 不看 $\mu$ 是片面的。

**误区三**："嵌入链就是 CTMC。" 嵌入链丢掉了所有时间信息——它只告诉你"跳去哪"，不告诉你"待多久"。两个完全不同的 CTMC 可以有相同的嵌入链但截然不同的行为（比如一个极快一个极慢）。

:::

## 7. 练习

**练习 1**：M/M/1/2 队列（最多 2 人），$\lambda=1$，$\mu=2$。求稳态分布。

<details>
<summary>点开查看逐步解答</summary>

$\rho=\lambda/\mu=0.5$。$\pi_0=(1-\rho)/(1-\rho^3)=0.5/(1-0.125)=0.5/0.875=4/7$。$\pi_1=\rho\pi_0=2/7$。$\pi_2=\rho^2\pi_0=1/7$。验证：$4/7+2/7+1/7=1$ ✓。
</details>

**练习 2**：补全 CTMC 模拟器——代码能跑但结果是错的：hold 变量算完却没用上：

```exercise
# @title: 练习：修复 CTMC 转移逻辑
# @check: 0.6
# @check: 0.4
# @hint: 两状态 CTMC 的稳态 π_0 = μ/(λ+μ)，π_1 = λ/(λ+μ)
import random, math
random.seed(123)

lam, mu = 4.0, 6.0

def simulate(steps):
    state = 0
    visits = [0, 0]
    for _ in range(steps):
        visits[state] += 1
        if state == 0:
            hold = -math.log(random.random()) / lam
            state = 1
        else:
            hold = -math.log(random.random()) / mu
            state = 0
    return visits[0] / sum(visits), visits[1] / sum(visits)

p0, p1 = simulate(100000)
print(round(p0, 1))   # 应为 0.6
print(round(p1, 1))   # 应为 0.4
```

<details>
<summary>点开查看逐步解答</summary>

原始代码的 `hold` 变量计算了但没用——模拟完全没用指数停留时间，只是机械地 0→1→0 交替，导致等概率（0.5/0.5）。修复后每步用指数停留时间加权，长停留的状态被多计数，得到正确的稳态 π_0=μ/(λ+μ)=0.6, π_1=λ/(λ+μ)=0.4。
</details>

### 快问快答

```quiz
CTMC 中状态的停留时间服从什么分布？
- 均匀分布
- 指数分布 [*]
- 正态分布
? 指数分布的无记忆性是马尔可夫性质在连续时间中的体现：未来只取决于现在，不取决于"已经待了多久"。
```

```quiz
Q 矩阵的每行元素之和等于多少？
- 1
- 0 [*]
- -1
? Q 矩阵的对角元素是离开总速率的相反数，所以每行和恰好为 0。这是“离开速率等于各方向转移速率之和”的数学表达。
```

## 8. 选读：从 CTMC 到排队论

<details>
<summary>选读 · Little 定理与排队网络</summary>

CTMC 是排队论的数学骨架。最重要的通用结果是 **Little 定理**：$L=\lambda W$——系统中平均人数 $L$ = 到达率 $\lambda$ × 平均逗留时间 $W$。这个公式与分布无关，只要系统稳定就成立。

M/M/1 队列中：$L=\rho/(1-\rho)$，$W=1/(\mu-\lambda)$，$L=\lambda W$ ✓。M/M/c 队列（$c$ 个服务员）需要 Erlang-C 公式计算等待概率，但骨架仍是 CTMC。

排队网络的突破来自 **乘积形式**：Jackson 网络（1957）证明了在某些条件下，多节点队列网络的稳态分布是各节点稳态的乘积——仿佛每个节点独立运行。这个惊人的结果让复杂系统的分析变成了一连串单节点问题的乘积。BCMP 定理（1975）进一步推广到多种顾客类型和服务规则。

CTMC 的另一个战场是可靠性工程：系统由多个组件串联/并联，每个组件的寿命和修复时间服从指数分布，整个系统的状态空间就是 CTMC。稳态可用性、平均故障间隔（MTBF）、平均修复时间（MTTR）都可以从 Q 矩阵直接算出。

</details>

## 9. 下一站

CTMC 用速率矩阵描述连续演化，但有一类链的状态看不见、只听得见发射：下一课的隐马尔可夫模型给每个隐藏状态配一张发射表，再用动态规划把最可能的幕后路径找回来。

→ [隐马尔可夫模型与 Viterbi 解码](./80-hmm-viterbi.md)
