---
title: 模型预测控制 MPC
lesson_id: control/model-predictive-control
prereqs:
  - control/lqr-optimal-control
volume: 5
layer: L10
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - model-predictive-control
  - rolling-horizon
  - constraint-handling
applications:
  - autonomous-driving
  - chemical-process-control
  - robotics-locomotion
exits:
  - stochastic-mpc
  - robust-mpc
---

# 模型预测控制 MPC

## 1. 从一个场景开始

自动驾驶汽车在高速上以 100 km/h 行驶。前方 200 米有辆车在减速——你需要决定：现在刹车多重、要不要变道、变道时方向盘打多少度。每一步决策都要考虑未来 5 秒的后果，同时满足物理约束（转向角度不能无限大、加速度有上限、不能撞护栏）。

LQR 能处理"无约束最优控制"，但现实充满了约束。**模型预测控制（MPC）** 正是为这类问题设计的：每一步都在有限时域内求解带约束的优化问题，然后只执行第一步，再重新规划。

## 2. 直觉解释

MPC 的核心思路用一句话概括：**像下棋一样想三步，只走一步**。

```viz
{
  "type": "plot",
  "title": "MPC 滚动优化：每步重规划",
  "expr": "x",
  "xmin": 0, "xmax": 10,
  "sliders": []
}
```

想象你在浓雾中开车：

1. **看不远**：你只能看到前方 $N$ 步（预测时域），看不到终点
2. **规划**：在这 $N$ 步内找最优控制序列
3. **只走第一步**：执行最优序列的第 1 个动作
4. **雾退一步**：到了新位置，视野前移，重新规划

每一步都重新求解优化——这就是"滚动时域"（receding horizon）。

## 3. 正式定义

### 离散时间系统

$$x_{k+1} = f(x_k, u_k)$$

线性情形：$x_{k+1} = Ax_k + Bu_k$。

### MPC 优化问题

在每个时间步 $t$，求解：

$$\min_{u_t, \ldots, u_{t+N-1}} \sum_{k=0}^{N-1} \left[ x_{t+k}^T Q x_{t+k} + u_{t+k}^T R u_{t+k} \right] + x_{t+N}^T P x_{t+N}$$

$$\text{s.t.} \quad x_{t+k+1} = f(x_{t+k}, u_{t+k}), \quad k = 0, \ldots, N-1$$

$$x_{\min} \leq x_{t+k} \leq x_{\max}, \quad u_{\min} \leq u_{t+k} \leq u_{\max}$$

| 符号 | 含义 |
| --- | --- |
| $N$ | 预测时域（horizon）长度 |
| $Q, R$ | 状态/控制权重矩阵（同 LQR） |
| $P$ | 终端代价矩阵 |
| $x_{\min}, x_{\max}$ | 状态约束 |
| $u_{\min}, u_{\max}$ | 控制约束 |

**关键区别**：只执行 $u_t^*$（第一步），然后 $t \leftarrow t+1$，重新求解。

### 与 LQR 的关系

- **无约束 + 无限时域 + 线性** → MPC 退化为 LQR（解析解）
- **有约束** → MPC 无法用 Riccati 方程，必须数值求解
- **有限时域** → 需要终端代价 $P$ 保证稳定性

## 4. 分步例题

**例**：一维系统 $x_{k+1} = x_k + u_k$，约束 $|u_k| \leq 1$，$N=3$，$Q=1, R=0.1$，当前状态 $x_0 = 5$。

1. **写出优化**：$\min \sum_{k=0}^{2}(x_k^2 + 0.1 u_k^2) + x_3^2$，s.t. $x_{k+1} = x_k + u_k$，$|u_k| \leq 1$
2. **暴力搜索**（因为维度低）：最优 $u_0^* = -1$（最大减速），$u_1^* = -1$，$u_2^* = -1$
3. **状态轨迹**：$x_0=5, x_1=4, x_2=3, x_3=2$
4. **只执行** $u_0^* = -1$，下一时刻 $x_1 = 4$
5. **重新求解**：以 $x_1=4$ 为起点，再算 $N=3$ 步——这就是滚动

注意：约束 $|u| \leq 1$ 限制了减速能力。如果 $x_0=100$，MPC 会持续以 $u=-1$ 减速直到接近 0。

## 5. 动手实验

### 实验 1：无约束 MPC ≈ LQR

```python title="无约束 MPC 求解（手动推导）"
import numpy as np

# 系统: x_{k+1} = x_k + u_k
A, B = np.array([[1.0]]), np.array([[1.0]])
Q, R = np.array([[1.0]]), np.array([[0.1]])
N = 10
x0 = np.array([[5.0]])

# 无约束 MPC：解析求解（等价于有限时域 LQR）
# 通过反向 Riccati 递推
P = Q.copy()  # 终端代价
for k in range(N-1, -1, -1):  # 倒序
    K = np.linalg.solve(R + B.T @ P @ B, B.T @ P @ A)  # 增益矩阵
    P = Q + A.T @ P @ A - A.T @ P @ B @ K  # Riccati 更新

# 前向模拟
x = x0.copy()
states = [x[0,0]]
controls = []
for k in range(N):
    u = -np.linalg.solve(R + B.T @ P @ B, B.T @ P @ A) @ x
    x = A @ x + B @ u
    states.append(x[0,0])
    controls.append(u[0,0])

print("状态轨迹:", [f"{s:.2f}" for s in states])
print("控制序列:", [f"{u:.2f}" for u in controls])
```

上图展示了 MPC 的典型行为：状态从 10 平滑趋向 0，控制量始终被约束在 $[-2, 2]$ 内。当状态远离目标时，控制量饱和在约束边界（最大减速）；接近目标后逐渐减小。

:::warning[常见误区]

**误区一**："MPC 每步都求全局最优。"
MPC 求的是**有限时域内的最优**，不是全局最优。时域 $N$ 越短，"近视"越严重。但 $N$ 越大，计算量越高——这是工程权衡。

**误区二**："MPC 只适用于线性系统。"
非线性 MPC（NMPC）同样可用，只是优化问题变成了非凸的，需要更复杂的求解器（如 IPOPT）。

**误区三**："有了约束就能用 MPC 替代 PID。"
MPC 计算量远大于 PID，对模型精度要求也更高。快速回路（如电机控制）仍常用 PID，MPC 更适合慢速但复杂的场景（如路径规划、化工过程）。

:::

## 6. 练习

**练习 1**：对于系统 $x_{k+1} = 0.9x_k + u_k$，$N=3$，$Q=1, R=0.01$，无约束时的最优控制策略是什么形式？

<details>
<summary>点开查看解答</summary>

这是有限时域 LQR，最优策略仍是状态反馈 $u_k = -K_k x_k$，但增益 $K_k$ 随时间步变化（非稳态）。

通过反向 Riccati 递推得到每步的 $K_k$。与无限时域 LQR 不同，有限时域的增益在最后几步会变化。

</details>

**练习 2**：补全 MPC 滚动模拟的核心逻辑。

```exercise
# @title: MPC 滚动时域模拟
# @check: final state: 0.00
# @hint: 每步调用 mpc_step 取最优 u，然后更新状态
import numpy as np

def mpc_step(x, N=5):
    """简单 MPC：u = -x/N（启发式，无约束时近似最优）"""
    return -x / N

x = 10.0
for t in range(20):
    u = 0  # ← 问题在这：应该用 mpc_step
    x = x + u

print(f"final state: {x:.2f}")
```

```quiz
MPC 与 LQR 的核心区别是什么？
- MPC 用神经网络，LQR 用线性模型
- MPC 能处理约束并通过滚动时域重新规划 [*]
- MPC 计算更快
- MPC 只适用于单输入系统
? LQR 求解无约束问题的解析解；MPC 通过数值优化处理约束，每步重新求解有限时域问题。
```

```quiz
MPC 为什么需要终端代价项 P？
- 为了惩罚最终状态远离原点
- 为了保证有限时域优化的稳定性 [*]
- 为了减少计算量
- 为了处理非线性
? 没有终端代价，MPC 可能"只顾眼前"导致系统不稳定。终端代价连接了有限时域与无限时域的性能。
```

## 7. 选读：MPC 的稳定性保证

<details>
<summary>选读 · 终端约束与 Lyapunov 稳定性</summary>

标准 MPC 稳定性证明依赖三个条件（Mayne et al., 2000）：

1. **终端代价** $P$ 满足 Lyapunov 不等式：$P \geq A^T P A - A^T P B(R + B^T P B)^{-1} B^T P A + Q$
2. **终端约束集** $\mathcal{X}_f$ 是控制不变集：$\forall x \in \mathcal{X}_f, \exists u \in \mathcal{U}$ 使得 $f(x,u) \in \mathcal{X}_f$
3. **终端状态** $x_{t+N} \in \mathcal{X}_f$

直观理解：MPC 的"最后一步"不能把系统扔到一个不可控的状态。终端约束集 $\mathcal{X}_f$ 保证了"接手的策略能继续稳住系统"。

无约束线性 MPC 中，取 $P$ 为 DARE 的解（无限时域 LQR 的 Riccati 方程），$\mathcal{X}_f = \mathbb{R}^n$，稳定性自动满足。

</details>

## 8. 下一站

MPC 依赖精确的系统模型，但实际中模型总有误差、传感器总有噪声。如何在不确定环境中做出最优估计？卡尔曼滤波给出了最优的"预测-更新"框架。

→ [卡尔曼滤波](./87-kalman-filter.md)
