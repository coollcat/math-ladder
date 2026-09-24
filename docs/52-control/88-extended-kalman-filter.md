---
title: 扩展卡尔曼滤波
lesson_id: control/extended-kalman-filter
prereqs:
  - control/kalman-filter
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
  - extended-kalman-filter
  - local-linearization
  - jacobian-update
applications:
  - gps-navigation
  - robot-sensing
exits:
  - unscented-kalman-filter
  - particle-filter
---

# 扩展卡尔曼滤波

## 1. 从一个场景开始

卡尔曼滤波假设状态转移和观测都是线性的，但真实世界常常不是这样：机器人测到的距离可能是位置的平方，摄像机的观测角度会经过投影，化学反应速率也随浓度非线性变化。

扩展卡尔曼滤波（EKF）的办法不是把所有非线性都硬算到底，而是在当前估计点附近做一次局部线性化，再把线性卡尔曼滤波的四步流程借过来。

## 2. 直觉解释

假设你在山路上行走，GPS 误差不大，但手机姿态传感器的读数经过角度变换。预测时，真实坡度会让位置变化不是一个固定矩阵；观测时，角度和位置也不是简单相加。

EKF 每走一步都问两个问题：

1. 在当前点附近，系统对状态的变化有多敏感？这是状态转移的 Jacobian。
2. 在当前点附近，观测对状态的变化有多敏感？这是观测函数的 Jacobian。

拿到这两个“局部导演”后，就把复杂的曲线暂时看成一条切线。切线不是整条曲线，但在一个小范围内足以指导下一步。

## 3. 正式定义

非线性状态空间模型写成：

$$x_k=f(x_{k-1},u_k)+w_k$$
$$z_k=h(x_k)+v_k$$

其中 $f$ 是状态转移函数，$h$ 是观测函数，$w_k,v_k$ 是噪声。

EKF 在当前估计 $\hat{x}_{k|k-1}$ 处计算两个 Jacobian：

$$A_k=\left.\frac{\partial f}{\partial x}\right|_{x=\hat{x}_{k|k-1}},\qquad H_k=\left.\frac{\partial h}{\partial x}\right|_{x=\hat{x}_{k|k-1}}$$

预测步骤为：

$$\hat{x}_{k|k-1}=f(\hat{x}_{k-1|k-1},u_k)$$
$$P_{k|k-1}=A_kP_{k-1|k-1}A_k^T+Q$$

更新步骤仍然使用卡尔曼形式：

$$S_k=H_kP_{k|k-1}H_k^T+R$$
$$K_k=P_{k|k-1}H_k^T S_k^{-1}$$
$$\hat{x}_{k|k}=\hat{x}_{k|k-1}+K_k(z_k-h(\hat{x}_{k|k-1}))$$
$$P_{k|k}=(I-K_kH_k)P_{k|k-1}$$

| 符号 | 含义 |
| --- | --- |
| $A_k$ | 状态转移函数的局部 Jacobian |
| $H_k$ | 观测函数的局部 Jacobian |
| $K_k$ | 局部线性化后的卡尔曼增益 |
| $P_k$ | 估计误差协方差 |

## 4. 分步例题

考虑一维位置估计，状态转移是 $x_k=x_{k-1}$，但观测是非线性的：

$$z=x^2+v$$

当前预测位置为 $2$，观测值为 $5$，预测方差为 $1$，观测噪声方差为 $4$。

1. 观测函数的导数是 $h'(x)=2x$，所以 $H=2\times2=4$；
2. 新息协方差 $S=4^2\times1+4=20$；
3. 卡尔曼增益 $K=1\times4/20=0.2$；
4. 原始观测残差是 $5-2^2=1$，不是 $5-2$；
5. 更新位置 $\hat{x}=2+0.2\times1=2.2$；
6. 更新方差 $P=(1-0.2\times4)\times1=0.2$。

关键在第 4 步：EKF 的观测残差必须使用非线性观测函数，不能把 $z$ 直接和预测状态相减。

## 5. 动手实验

### 实验 1：非线性观测的一步 EKF

```python title="用局部导数修正非线性观测"
omega = 0.0
alpha = 0.1
beta = 0.8
x_hat = 0.0
variance = 1.0
measurement_variance = 4.0
z = 1.2

# h(x)=x^2 在当前估计处的导数
h_value = x_hat * x_hat
h_jacobian = 2 * x_hat
innovation = z - h_value
innovation_covariance = h_jacobian * h_jacobian * variance + measurement_variance
kalman_gain = variance * h_jacobian / innovation_covariance
x_hat = x_hat + kalman_gain * innovation
variance = (1 - kalman_gain * h_jacobian) * variance

print(round(x_hat, 3))
print(round(variance, 3))
```

在 $x=0$ 附近，$h'(x)=0$，观测几乎不提供位置信息；当估计点远离零点时，观测的局部斜率变大，滤波器会更有把握地跟随观测。

## 6. 练习

```exercise
# @title: 手算一次 EKF 更新
# @check: 1.4
# @check: 0.2
# @hint: 先算 h(2)=4 和 h'(2)=4；新息要减去 h(x_pred)，不是减去 x_pred。

x_pred = 2.0
z = 5.0
P_pred = 1.0
R = 4.0
H = 4.0

innovation = z - x_pred
S = H * H * P_pred + R
K = P_pred * H / S
x_est = x_pred + K * innovation
P_est = (1 - K * H) * P_pred

print(round(x_est, 1))
print(round(P_est, 1))
```

:::warning[常见误区]

**误区一**：EKF 等于把非线性函数替换成全局线性函数。它只在当前工作点做局部线性化，工作点移动后会重新计算 Jacobian。

**误区二**：观测残差可以直接相减。对 $z=h(x)+v$，残差必须是 $z-h(\hat{x})$。

**误区三**：EKF 对强非线性系统一定比线性模型好。局部切线可能在远距离失效，此时应考虑无迹卡尔曼滤波或粒子滤波。

:::

```quiz
EKF 中的 Jacobian 有什么作用？
- 把非线性函数在整个状态空间上变成精确的线性函数 [*]
- 在当前估计点附近提供局部线性近似
- 用来生成随机噪声
- 把所有状态变成标量
? Jacobian 是函数在当前工作点的一阶导数矩阵，EKF 用它把非线性问题暂时化为局部线性问题。
```

## 7. 选读：EKF 与无迹卡尔曼滤波

EKF 传播的是均值和协方差，Jacobian 相当于在曲线上取切线。无迹卡尔曼滤波（UKF）不直接求导，而是从分布中抽取一组 sigma 点，让这些点穿过非线性函数，再重新拟合均值和协方差。两者都在局部近似，但近似方式不同。

## 8. 下一站

想回顾 EKF 的线性骨架，先回到[卡尔曼滤波](/docs/control/kalman-filter)；如果系统噪声分布明显不近似高斯，下一步应比较粒子滤波。
