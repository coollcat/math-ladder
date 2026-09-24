---
title: GRU 门控循环单元
lesson_id: deep-learning/gru
prereqs:
  - deep-learning/rnn-lstm
volume: 5
layer: L9
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import:
  - torch
introduces_concepts:
  - gru-gate
  - reset-gate
  - update-gate
applications:
  - text-generation
  - speech-recognition
  - time-series-forecasting
exits:
  - transformer/self-attention
---

# GRU 门控循环单元

## 1. 从一个场景开始

你训练了一个 LSTM 来翻译句子。效果不错，但模型参数太多，手机上跑起来卡顿。能不能找个**更轻量**的方案，保留 LSTM"选择性记忆"的核心思想，同时砍掉冗余？

GRU（Gated Recurrent Unit）就是答案——2014 年 Cho 等人提出，用**两个门**替代 LSTM 的三个门，参数量减少约 25%，在许多任务上效果相当。

## 2. 直觉解释

LSTM 有两条信息通道：长期记忆 $c_t$ 和短期状态 $h_t$，外加三个门（遗忘、输入、输出）来管理它们。

GRU 说：**一条通道就够了**。它把长期和短期合并成单一状态 $h_t$，然后用两个门来控制：

- **重置门 $r$**：决定"忘掉多少旧记忆再写新内容"——相当于 LSTM 遗忘门 + 输入门的合并
- **更新门 $z$**：决定"新旧状态各保留多少"——相当于 LSTM 输出门的角色

```viz
{
  "type": "plot",
  "title": "sigmoid 函数：门的输出范围",
  "expr": "1 / (1 + 2.718^(-x))",
  "xmin": -6, "xmax": 6,
  "sliders": []
}
```

所有门的值都在 0 到 1 之间（通过 sigmoid），0 表示"完全关闭"，1 表示"完全打开"。

## 3. 正式定义

GRU 在时间步 $t$ 的计算：

### 更新门

$$z_t = \sigma(W_z x_t + U_z h_{t-1} + b_z)$$

控制新旧状态的混合比例。

### 重置门

$$r_t = \sigma(W_r x_t + U_r h_{t-1} + b_r)$$

控制计算候选状态时参考多少旧记忆。

### 候选隐藏状态

$$\tilde{h}_t = \tanh(W_h x_t + U_h (r_t \odot h_{t-1}) + b_h)$$

$r_t \odot h_{t-1}$：逐元素相乘，重置门"过滤"旧状态。

### 最终隐藏状态

$$h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde{h}_t$$

| 符号 | 含义 |
| --- | --- |
| $z_t$ | 更新门，$\in (0,1)^d$ |
| $r_t$ | 重置门，$\in (0,1)^d$ |
| $\tilde{h}_t$ | 候选状态 |
| $h_t$ | 最终隐藏状态 |
| $\odot$ | Hadamard 积（逐元素乘法） |
| $\sigma$ | sigmoid 函数 |

## 4. 分步例题

**例**：给定单变量、隐层维度 2 的 GRU，手算一步前向传播。

已知：$h_{t-1} = [0.5, -0.3]^T$，$x_t = 1.0$，所有权重均为 0.1，偏置为 0。

1. **更新门**：$z_t = \sigma(0.1 \cdot 1 + 0.1 \cdot 0.5) = \sigma(0.15) \approx 0.537$
2. **重置门**：$r_t = \sigma(0.1 \cdot 1 + 0.1 \cdot 0.5) = \sigma(0.15) \approx 0.537$
3. **过滤旧状态**：$r_t \odot h_{t-1} = [0.537 \times 0.5,\ 0.537 \times (-0.3)] = [0.269,\ -0.161]$
4. **候选状态**：$\tilde{h}_t = \tanh(0.1 \cdot 1 + 0.1 \cdot 0.269) \approx \tanh(0.127) \approx 0.126$
5. **混合**：$h_t = (1 - 0.537) \cdot 0.5 + 0.537 \cdot 0.126 \approx 0.232 + 0.068 = 0.300$

## 5. 动手实验

### 实验 1：GRU vs LSTM 参数量对比

```python title="参数量对比：GRU vs LSTM"
import torch  # PyTorch 深度学习框架
import torch.nn as nn  # nn 模块包含神经网络层

input_size = 128
hidden_size = 256

# LSTM：3 个门 + 候选值 = 4 组权重
lstm = nn.LSTM(input_size, hidden_size, batch_first=True)  # batch_first：输入维度顺序为 (batch, seq, feature)
lstm_params = sum(p.numel() for p in lstm.parameters())  # numel：参数元素总数

# GRU：2 个门 + 候选值 = 3 组权重
gru = nn.GRU(input_size, hidden_size, batch_first=True)
gru_params = sum(p.numel() for p in gru.parameters())

print(f"LSTM 参数量: {lstm_params:,}")
print(f"GRU  参数量: {gru_params:,}")
print(f"GRU 节省: {(1 - gru_params/lstm_params)*100:.1f}%")
```

GRU 大约节省 25% 的参数——少了一组门的权重矩阵。

### 实验 2：门值的可视化

```python title="观察 GRU 门值如何随训练变化"
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

torch.manual_seed(0)
seq_len, input_size, hidden_size = 20, 10, 32

gru = nn.GRU(input_size, hidden_size, batch_first=True)
x = torch.randn(1, seq_len, input_size)  # 1 个样本，20 步序列
output, hn = gru(x)  # output: 所有时间步的隐藏状态

# 手动计算各时间步的门值（需要访问内部权重）
W_z, U_z, b_z = gru.weight_ih_l0[hidden_size:2*hidden_size], gru.weight_hh_l0[hidden_size:2*hidden_size], gru.bias_ih_l0[hidden_size:2*hidden_size] + gru.bias_hh_l0[hidden_size:2*hidden_size]

h = torch.zeros(1, hidden_size)
z_values = []
for t in range(seq_len):
    z = torch.sigmoid(x[0, t] @ W_z.T + h @ U_z.T + b_z)  # @：矩阵乘法运算符
    z_values.append(z.mean().item())  # item：取标量值
    _, h = gru(x[:, t:t+1, :], h.unsqueeze(0))  # unsqueeze：在指定维度增加一个维度

plt.plot(z_values, marker="o")
plt.xlabel("Time Step")
plt.ylabel("Mean Update Gate Value")
plt.title("GRU Update Gate Activation Over Time")
plt.grid(True)
```

:::warning[常见误区]

**误区一**："GRU 是 LSTM 的简化版，效果一定更差。"
不完全对。在数据量较小或序列较短的任务上，GRU 经常表现得和 LSTM 一样好甚至更好——更少的参数意味着更不容易过拟合。

**误区二**："$h_t = (1-z)h_{t-1} + z\tilde{h}_t$ 里的 $z$ 和 LSTM 遗忘门一样。"
不一样。GRU 的更新门 $z$ 控制的是"新旧混合比例"，而 LSTM 的遗忘门 $f$ 控制的是"旧记忆保留多少"——语义不同。

**误区三**："GRU 没有梯度消失问题。"
GRU 缓解但**不能完全消除**梯度消失。极端长序列仍然需要 Transformer 等架构。

:::

## 6. 练习

**练习 1**：对于隐层维度 $d=256$ 的 GRU 单元，输入维度 $d_{in}=128$，计算一个 GRU 层的总参数量。

<details>
<summary>点开查看解答</summary>

每组门有：$W$ 矩阵 $d_{in} \times d = 128 \times 256$，$U$ 矩阵 $d \times d = 256 \times 256$，偏置 $d = 256$。

每组参数 = $128 \times 256 + 256 \times 256 + 256 = 32768 + 65536 + 256 = 98560$

3 组（$z, r, \tilde{h}$）= $3 \times 98560 = 295680$

验证：`nn.GRU(128, 256).parameters()` 总计约 295,680。
</details>

**练习 2**：补全 GRU 前向传播代码。

```exercise
# @title: 手写 GRU 单步前向
# @check: h_new shape: torch.Size([1, 32])
# @hint: 用 sigmoid 和 tanh，注意三组权重的切分方式
import torch

d_in, d_h = 16, 32
W = torch.randn(3 * d_h, d_in)   # 三组合并的输入权重
U = torch.randn(3 * d_h, d_h)     # 三组合并的隐藏权重
b = torch.zeros(3 * d_h)          # 合并偏置

x_t = torch.randn(1, d_in)
h_prev = torch.randn(1, d_h)

# 切分出三组权重
W_z, W_r, W_h = W[:d_h], W[d_h:2*d_h], W[2*d_h:]
U_z, U_r, U_h = U[:d_h], U[d_h:2*d_h], U[2*d_h:]
b_z, b_r, b_h = b[:d_h], b[d_h:2*d_h], b[2*d_h:]

# 请补全：计算 z_t, r_t, h_t_new
z_t = torch.sigmoid(x_t @ W_z.T + h_prev @ U_z.T + b_z)
r_t = torch.sigmoid(x_t @ W_r.T + h_prev @ U_r.T + b_r)
h_candidate = torch.tanh(x_t @ W_h.T + (r_t * h_prev) @ U_h.T + b_h)
h_new = (1 - z_t) * h_prev + z_t * h_candidate  # ← 修复这里

print(f"h_new shape: {h_new.shape}")
```

```quiz
GRU 相比 LSTM 减少了哪个组件？
- 遗忘门
- 输出门（cell state 独立通道） [*]
- 更新门
- sigmoid 激活函数
? GRU 用单一隐藏状态 h_t 替代 LSTM 的 (h_t, c_t) 双通道，因此不再需要独立的输出门。
```

```quiz
GRU 更新门 z_t = 0 时，隐藏状态会怎样？
- 完全由候选状态决定
- 完全保持旧状态 h_{t-1} [*]
- 变为零向量
- 随机初始化
? h_t = (1-0)*h_{t-1} + 0*ḧ = h_{t-1}，更新门为 0 时旧状态完全保留。
```

## 7. 选读：GRU 的梯度流分析

<details>
<summary>选读 · 更新门如何缓解梯度消失</summary>

沿时间反向传播时，$\frac{\partial h_t}{\partial h_{t-1}} = (1 - z_t) + z_t \cdot \frac{\partial \tilde{h}_t}{\partial h_{t-1}}$。

当 $z_t \approx 0$（更新门关闭），梯度几乎直接通过 $(1-z_t) \approx 1$ 传播——这是一条"梯度高速公路"。LSTM 通过 cell state 实现类似效果，GRU 则通过更新门的线性插值实现。

两者殊途同归：都创造了**接近恒等映射的路径**，让梯度能走远。

</details>

## 8. 下一站

GRU 和 LSTM 都是"逐步处理序列"的设计——timestep 之间必须串行。有没有办法**一步看到整个序列**？Transformer 的自注意力机制正是为此而生。

→ [自注意力机制](../47-transformer/40-self-attention.md)
