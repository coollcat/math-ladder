---
title: 卡尔曼滤波
lesson_id: control/kalman-filter
prereqs:
  - control/state-space-model
volume: 5
layer: L10
track:
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import:
  - numpy
introduces_concepts:
  - kalman-filter
  - prediction-update
  - kalman-gain
applications:
  - gps-navigation
  - sensor-fusion
  - object-tracking
exits:
  - extended-kalman-filter
  - particle-filter
---

:::note[与别章的分工]
本课是卡尔曼滤波的**递推公式与直觉**（预测—校正两步行）；它的大型工程应用场在 [第 65 章 · IMU/GNSS 融合](../65-robotics-motion/120-kalman-imu-gnss.md)，非线性版本见 [扩展卡尔曼滤波](./88-extended-kalman-filter.md)。
:::


# 卡尔曼滤波

## 1. 从一个场景开始

你的手机 GPS 定位精度约 5 米，但你同时有加速度计和陀螺仪的数据。GPS 告诉你"大概在这里"，惯性传感器告诉你"大概在往这个方向移动"——**两种不完美的信息，能不能合成一个更准确的估计？**

1960 年 Rudolf Kalman 给出了答案：卡尔曼滤波。阿波罗登月飞船用它融合雷达和惯性导航数据，至今仍是自动驾驶、机器人、金融领域最广泛的状态估计算法。

## 2. 直觉解释

想象你在浓雾中追踪一只兔子。

- **预测**：兔子上一秒在位置 5，速度 2，所以这一秒"大概在 7"——但这个猜测有误差（速度可能变了）
- **观测**：雷达说兔子在 6.8 附近——但雷达也有误差
- **融合**：两个不完美信息，谁更可信就多听谁的

卡尔曼滤波做的事情就这三步，但它用**最优权重**来融合——这个权重叫**卡尔曼增益**。

```viz
{
  "type": "plot",
  "title": "预测 vs 观测 vs 融合",
  "expr": "x",
  "xmin": 0, "xmax": 10,
  "sliders": []
}
```

## 3. 正式定义

### 状态空间模型

**预测（运动模型）**：

$$\hat{x}_{k|k-1} = A \hat{x}_{k-1|k-1} + B u_k$$
$$P_{k|k-1} = A P_{k-1|k-1} A^T + Q$$

**观测（传感器模型）**：

$$z_k = H x_k + v_k, \quad v_k \sim \mathcal{N}(0, R)$$

**更新（融合）**：

$$K_k = P_{k|k-1} H^T (H P_{k|k-1} H^T + R)^{-1}$$
$$\hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k (z_k - H \hat{x}_{k|k-1})$$
$$P_{k|k} = (I - K_k H) P_{k|k-1}$$

| 符号 | 含义 |
| --- | --- |
| $\hat{x}_{k|k-1}$ | 预测状态（先验） |
| $\hat{x}_{k|k}$ | 更新状态（后验） |
| $P$ | 误差协方差矩阵 |
| $K_k$ | 卡尔曼增益 |
| $A$ | 状态转移矩阵 |
| $B$ | 控制输入矩阵 |
| $H$ | 观测矩阵 |
| $Q$ | 过程噪声协方差 |
| $R$ | 观测噪声协方差 |
| $z_k - H\hat{x}_{k|k-1}$ | 新息（innovation） |

### 卡尔曼增益的直觉

$$K = \frac{\text{预测不确定性}}{\text{预测不确定性} + \text{观测不确定性}}$$

- $K \approx 0$：预测很准，不太信观测
- $K \approx 1$：观测很准，不太信预测
- 最优增益使后验方差 $P_{k|k}$ 最小（MMSE 估计）

## 4. 分步例题

**例**：追踪一维匀速运动，$x = [位置, 速度]^T$，时间步 $\Delta t = 1$。

$$A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}, \quad H = \begin{pmatrix} 1 & 0 \end{pmatrix}, \quad Q = \begin{pmatrix} 0.1 & 0 \\ 0 & 0.1 \end{pmatrix}, \quad R = 1$$

初始：$\hat{x}_0 = [0, 1]^T$，$P_0 = I$。观测：$z_1 = 2.1$（真实位置 2）。

1. **预测**：$\hat{x}_{1|0} = A \hat{x}_0 = [1, 1]^T$
2. **预测协方差**：$P_{1|0} = APA^T + Q = \begin{pmatrix} 2.1 & 1 \\ 1 & 1.1 \end{pmatrix}$
3. **卡尔曼增益**：$K = P_{1|0} H^T (HP_{1|0}H^T + R)^{-1} = \frac{1}{3.1}\begin{pmatrix} 2.1 \\ 1 \end{pmatrix} \approx \begin{pmatrix} 0.677 \\ 0.323 \end{pmatrix}$
4. **新息**：$z_1 - H\hat{x}_{1|0} = 2.1 - 1 = 1.1$
5. **更新**：$\hat{x}_{1|1} = [1, 1]^T + [0.677, 0.323]^T \times 1.1 = [1.745, 1.355]^T$

位置估计从 1 修正到 1.745（真实值 2），速度估计从 1 修正到 1.355（真实值 1）。

## 5. 动手实验

### 实验 1：一维卡尔曼滤波完整实现

```python title="追踪匀速运动目标"
import numpy as np
import matplotlib.pyplot as plt

np.random.seed(42)
dt = 1.0
n_steps = 50

# 真实系统
A = np.array([[1, dt], [0, 1]])
H = np.array([[1, 0]])
Q = np.array([[0.1, 0], [0, 0.1]])
R = np.array([[1.0]])

# 真实轨迹
x_true = np.array([[0.0], [1.0]])  # 初始位置 0，速度 1
true_states = [x_true[0, 0]]
for _ in range(n_steps - 1):
    x_true = A @ x_true + np.random.multivariate_normal([0, 0], Q).reshape(2, 1)
    true_states.append(x_true[0, 0])

# 观测
observations = [s + np.random.normal(0, 1) for s in true_states]

# 卡尔曼滤波
x_est = np.array([[0.0], [0.0]])  # 初始估计
P = np.eye(2)  # eye：单位矩阵
estimates = []

for z in observations:
    # 预测
    x_pred = A @ x_est
    P_pred = A @ P @ A.T + Q
    # 更新
    S = H @ P_pred @ H.T + R          # 新息协方差
    K = P_pred @ H.T @ np.linalg.inv(S)  # inv：矩阵求逆
    x_est = x_pred + K @ (z - H @ x_pred)
    P = (np.eye(2) - K @ H) @ P_pred
    estimates.append(x_est[0, 0])

plt.figure(figsize=(10, 4))
plt.plot(true_states, "g-", label="真实轨迹", linewidth=2)
plt.plot(observations, "r.", label="观测", markersize=6)
plt.plot(estimates, "b-", label="卡尔曼估计", linewidth=2)
plt.legend()
plt.grid(True)
plt.title("卡尔曼滤波：融合噪声观测")
plt.xlabel("时间步")
```

蓝色线（估计）明显比红色点（观测）更平滑、更接近绿色线（真实）——这就是滤波的力量。

增益从初始的 ~0.9 快速收敛到稳态值——系统“学会”了该多信预测还是多信观测。实践中观察增益收敛是调试 Q、R 参数的重要手段。

:::warning[常见误区]

**误区一**："卡尔曼滤波只能用于线性系统。"
标准卡尔曼滤波确实假设线性。**扩展卡尔曼滤波（EKF）** 通过局部线性化（Jacobian）处理非线性系统；**无迹卡尔曼滤波（UKF）** 用 sigma 点避免求导。

**误区二**："Q 和 R 必须精确知道。"
实践中 Q 和 R 往往是调参。Q 大 → 更信观测（跟踪快但噪声大）；R 大 → 更信预测（平滑但响应慢）。

**误区三**："卡尔曼滤波是滑动平均。"
不是。滑动平均对所有历史数据等权，卡尔曼滤波根据**不确定性动态调整权重**——新数据的可信度取决于预测和观测的相对精度。

:::

## 6. 练习

**练习 1**：如果观测噪声 $R \to \infty$（传感器完全不可靠），卡尔曼增益 $K$ 会趋近多少？系统会怎么表现？

<details>
<summary>点开查看解答</summary>

$K = P_{\text{pred}} H^T (HP_{\text{pred}}H^T + R)^{-1} \to 0$（当 $R \to \infty$）。

系统完全忽略观测，只做预测：$\hat{x}_{k|k} = \hat{x}_{k|k-1}$。这就是"开环预测"——传感器废了，只能靠模型猜。

</details>

**练习 2**：补全卡尔曼滤波的更新步骤。

```exercise
# @title: 卡尔曼滤波更新
# @check: estimated position: 1.82
# @hint: K = P_pred @ H.T @ inv(S)
import numpy as np

A = np.array([[1, 1], [0, 1]], dtype=float)
H = np.array([[1, 0]], dtype=float)
Q = np.diag([0.1, 0.1])
R = np.array([[1.0]])
P = np.eye(2)
x = np.array([[0.0], [1.0]])

# 预测
x_pred = A @ x
P_pred = A @ P @ A.T + Q

z = 2.5  # 观测值
S = H @ P_pred @ H.T + R
K = P_pred @ H.T @ np.linalg.inv(S)

# 请补全更新步骤
x_est = x_pred       # ← 修复：加上卡尔曼增益修正
P = P_pred           # ← 修复：更新协方差

print(f"estimated position: {x_est[0,0]:.2f}")
```

```quiz
卡尔曼增益 K=0.8 意味着什么？
- 80% 信任预测，20% 信任观测
- 80% 信任观测，20% 信任预测 [*]
- 观测误差是预测误差的 0.8 值
- 系统 80% 的时间是稳定的
? K 接近 1 表示更信任观测。K = P_pred / (P_pred + R)，K 大说明预测不确定性远大于观测不确定性。
```

```quiz
卡尔曼滤波的"新息" (innovation) 是什么？
- 控制输入 u_k
- 观测值 z_k
- 观测与预测的差 z_k - H*x_pred [*]
- 卡尔曼增益 K
? 新息 = z_k - H*x̂_{k|k-1}，是"新信息"——观测中不能被预测解释的部分。
```

## 7. 选读：卡尔曼滤波的贝叶斯推断视角

<details>
<summary>选读 · 为什么卡尔曼增益是最优的</summary>

卡尔曼滤波是**高斯假设下的贝叶斯最优估计**。先验 $p(x_k|z_{1:k-1}) = \mathcal{N}(\hat{x}_{k|k-1}, P_{k|k-1})$，似然 $p(z_k|x_k) = \mathcal{N}(Hx_k, R)$。两个高斯的乘积仍是高斯，经矩阵恒等式推导即得卡尔曼更新公式。$K$ 是使后验方差最小的 MMSE 增益——不是近似，是精确推断。粒子滤波处理非高斯情形，EKF 处理非线性情形（但只是近似）。

</details>

## 8. 下一站

卡尔曼滤波假设系统是线性的，但现实中很多系统高度非线性（如机器人关节运动、化学反应动力学）。**扩展卡尔曼滤波（EKF）** 通过在每个工作点做局部线性化来处理非线性——代价是可能引入线性化误差。

→ [扩展卡尔曼滤波](./88-extended-kalman-filter.md)
