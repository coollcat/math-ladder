---
title: 旋转位置编码 RoPE
lesson_id: transformer/rope-math
prereqs:
  - transformer/positional-encoding
volume: 5
layer: L10
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import:
  - torch
introduces_concepts:
  - rope-encoding
  - rotation-matrix
  - relative-position
applications:
  - llm-positional-encoding
  - long-context-modeling
exits:
  - alibi-bias
  - long-context-extension
---

# 旋转位置编码 RoPE

## 1. 从一个场景开始

原始 Transformer 用正弦/余弦函数做绝对位置编码（sinusoidal PE），但有个问题：模型很难泛化到训练时没见过的序列长度。如果训练时最长 512 token，推理时给 1024 就可能崩溃。

2021 年 Su 等人提出 RoPE（Rotary Position Embedding）：**不给 token 加位置，而是对 Q 和 K 做旋转**。旋转有一个优美的数学性质——两个向量旋转后的内积只取决于它们的**相对位置差**，天然编码了相对位置信息。

## 2. 直觉解释

想象两个人站在转盘上。

- 绝对位置编码：每个人身上贴一个坐标标签——"我在位置 3"。
- RoPE：每个人**转一个角度**——位置 $m$ 的人转 $m\theta$ 度。

当两个人对视时（计算注意力分数 $q \cdot k$），转盘效果取决于"你比我多转了多少"——即 $m - n$，相对位置。

```viz
{
  "type": "sines",
  "title": "RoPE 的旋转频率基底",
  "terms": [1, 2, 4, 8]
}
```

不同维度对用不同频率旋转，就像正弦位置编码用不同频率——但这里是**旋转**而非加法。

## 3. 正式定义

### 二维情形

对于位置 $m$ 处的查询向量 $q$，RoPE 对每一对维度 $(q_{2i}, q_{2i+1})$ 施加旋转：

$$\begin{pmatrix} q_{2i}' \\ q_{2i+1}' \end{pmatrix} = \begin{pmatrix} \cos m\theta_i & -\sin m\theta_i \\ \sin m\theta_i & \cos m\theta_i \end{pmatrix} \begin{pmatrix} q_{2i} \\ q_{2i+1} \end{pmatrix}$$

其中频率 $\theta_i = 10000^{-2i/d}$，$d$ 是头维度。

### 复数视角

把每对维度看作复数 $z_i = q_{2i} + i \cdot q_{2i+1}$，RoPE 就是：

$$z_i' = z_i \cdot e^{i m \theta_i}$$

乘以 $e^{i\phi}$ 就是旋转 $\phi$ 弧度——复数乘法的几何意义。

### 相对位置性质

$$\langle R_m q, R_n k \rangle = \langle q, R_{n-m} k \rangle$$

**证明**：旋转矩阵是正交矩阵，$R_m^T = R_{-m}$，所以 $R_m q \cdot R_n k = q^T R_m^T R_n k = q^T R_{n-m} k$。

| 符号 | 含义 |
| --- | --- |
| $R_m$ | 位置 $m$ 的旋转矩阵 |
| $\theta_i$ | 第 $i$ 对维度的旋转频率 |
| $d$ | 头维度（必须是偶数） |
| $m, n$ | token 的绝对位置 |

## 4. 分步例题

**例**：对 $d=4$ 的向量 $q = [1, 0, 1, 0]^T$，位置 $m=1$，计算 RoPE 编码后结果。

1. **频率**：$\theta_0 = 10000^0 = 1$，$\theta_1 = 10000^{-0.5} = 0.01$
2. **维度对 (0,1)**：旋转角 $= 1 \times 1 = 1$ 弧度
$$\begin{pmatrix} q_0' \\ q_1' \end{pmatrix} = \begin{pmatrix} \cos 1 & -\sin 1 \\ \sin 1 & \cos 1 \end{pmatrix} \begin{pmatrix} 1 \\ 0 \end{pmatrix} = \begin{pmatrix} 0.5403 \\ 0.8415 \end{pmatrix}$$
3. **维度对 (2,3)**：旋转角 $= 1 \times 0.01 = 0.01$ 弧度
$$\begin{pmatrix} q_2' \\ q_3' \end{pmatrix} = \begin{pmatrix} \cos 0.01 & -\sin 0.01 \\ \sin 0.01 & \cos 0.01 \end{pmatrix} \begin{pmatrix} 1 \\ 0 \end{pmatrix} \approx \begin{pmatrix} 1.0000 \\ 0.0100 \end{pmatrix}$$
4. **结果**：$q' = [0.5403, 0.8415, 1.0000, 0.0100]^T$

低维对旋转大角度（编码短距离关系），高维对旋转小角度（编码长距离关系）。

## 5. 动手实验

### 实验 1：RoPE 的相对位置性质验证

```python title="验证 ⟨R_m q, R_n k⟩ = ⟨q, R_{n-m} k⟩"
import numpy as np

def rotation_matrix(angle):  # 2D 旋转矩阵
    return np.array([[np.cos(angle), -np.sin(angle)],
                     [np.sin(angle),  np.cos(angle)]])

def apply_rope(vec, pos, theta=1.0):  # 对一对维度施加 RoPE
    angle = pos * theta
    return rotation_matrix(angle) @ vec

q = np.array([1.0, 0.5])
k = np.array([0.3, 0.8])
m, n = 3, 7  # 两个位置

# 方法 1：分别旋转后点积
q_rot = apply_rope(q, m)
k_rot = apply_rope(k, n)
dot1 = np.dot(q_rot, k_rot)  # dot：向量点积

# 方法 2：只旋转 k 的相对位置
k_rel = apply_rope(k, n - m)
dot2 = np.dot(q, k_rel)

print(f"⟨R_m q, R_n k⟩ = {dot1:.8f}")
print(f"⟨q, R_{{n-m}} k⟩ = {dot2:.8f}")
print(f"差值: {abs(dot1 - dot2):.2e}")
```

两数应该完全相等（浮点精度内）——这就是 RoPE 的核心数学性质。

### 实验 2：不同频率的旋转效果

```python title="低维 vs 高维的旋转速度对比"
import numpy as np
import matplotlib.pyplot as plt

d = 64
positions = np.arange(0, 512)
# theta_i = 10000^(-2i/d)
thetas = [10000 ** (-2*i/d) for i in [0, 7, 15, 31]]  # 4 个不同频率

fig, axes = plt.subplots(2, 2, figsize=(10, 6))
for ax, theta, idx in zip(axes.flat, thetas, [0, 7, 15, 31]):
    angles = positions * theta
    ax.plot(positions, np.cos(angles), label="cos", linewidth=0.8)
    ax.plot(positions, np.sin(angles), label="sin", linewidth=0.8)
    ax.set_title(f"维度对 {idx}: θ = {theta:.4f}")
    ax.set_xlabel("Position")
    ax.legend(fontsize=8)

plt.tight_layout()
```

低维度对（$\theta$ 大）旋转快，像高频正弦波——编码细粒度位置差异；高维度对（$\theta$ 小）旋转慢——编码粗粒度的长距离关系。

RoPE 的 PyTorch 实现核心：对 Q、K 每对维度做复数乘法 $z' = z \cdot e^{im\theta}$，避免显式构造旋转矩阵。只需预计算 $\cos$ 和 $\sin$ 表，逐元素乘加即可——计算量与加法位置编码相当。

:::warning[常见误区]

**误区一**："RoPE 是一种加法位置编码。"
不是。RoPE 是对 Q、K 做**乘法旋转**，不改变向量范数，也不添加额外向量——和 sinusoidal PE 的"加到嵌入上"完全不同。

**误区二**："RoPE 天然支持任意长度外推。"
RoPE 的相对位置性质确实让它比绝对位置编码更灵活，但训练长度外的泛化仍需额外技术（如 NTK-aware 缩放、YaRN 等）。

**误区三**："头维度 $d$ 必须是偶数。"
严格来说是的——RoPE 需要两两配对。如果 $d$ 是奇数，最后一维通常不做旋转。

:::

## 6. 练习

**练习 1**：对于 $d=8$，计算前 4 对维度的频率 $\theta_0, \theta_1, \theta_2, \theta_3$。

<details>
<summary>点开查看解答</summary>

$\theta_i = 10000^{-2i/8} = 10000^{-i/4}$

- $\theta_0 = 10000^0 = 1$
- $\theta_1 = 10000^{-0.25} \approx 0.1778$
- $\theta_2 = 10000^{-0.5} = 0.01$
- $\theta_3 = 10000^{-0.75} \approx 0.00178$

频率从 1 到 0.00178，跨越 3 个数量级——这和 sinusoidal PE 的多频率设计一脉相承。
</details>

**练习 2**：补全 RoPE 旋转的核心计算。

```exercise
# @title: 实现 RoPE 旋转
# @check: norm preserved: True
# @hint: q1*cos - q2*sin, q1*sin + q2*cos
import numpy as np

def apply_rope_pair(q_pair, angle):
    """q_pair: (2,) 向量, angle: 旋转角（弧度）"""
    q1, q2 = q_pair[0], q_pair[1]
    cos_a = np.cos(angle)
    sin_a = np.sin(angle)
    # 请补全旋转后的两个分量
    out1 = q1       # ← 修复
    out2 = q2       # ← 修复
    return np.array([out1, out2])

# 验证：旋转不改变向量长度
q = np.array([3.0, 4.0])
q_rot = apply_rope_pair(q, 0.7)
print(f"原始范数: {np.linalg.norm(q):.4f}")  # norm：向量的欧几里得长度
print(f"旋转范数: {np.linalg.norm(q_rot):.4f}")
print(f"norm preserved: {abs(np.linalg.norm(q) - np.linalg.norm(q_rot)) < 1e-10}")
```

```quiz
RoPE 的注意力分数 ⟨R_m q, R_n k⟩ 等于什么？
- ⟨q, k⟩（与位置无关）
- ⟨q, R_m k⟩（只看 q 的位置）
- ⟨q, R_{n-m} k⟩（只看相对位置差） [*]
- ⟨R_{m+n} q, k⟩（看绝对位置和）
? 旋转矩阵的正交性保证 R_m^T R_n = R_{n-m}，因此注意力分数只取决于相对位置 n-m。
```

```quiz
RoPE 中低维度对的旋转频率和高维度对相比如何？
- 低维度对频率低，高维度对频率高
- 低维度对频率高，高维度对频率低 [*]
- 所有维度对频率相同
- 频率随机分配
? θ_i = 10000^(-2i/d)，i 越小 θ 越大，低维度对旋转快，编码细粒度位置差异。
```

## 7. 选读：RoPE 的李群视角

<details>
<summary>选读 · 旋转矩阵与 SO(2) 群</summary>

二维旋转矩阵的集合构成**特殊正交群 SO(2)**：

$$\text{SO}(2) = \lbrace R \in \mathbb{R}^{2\times 2} \mid R^T R = I, \det R = 1\rbrace$$

SO(2) 是**阿贝尔群**（交换群）：$R_\alpha R_\beta = R_{\alpha+\beta} = R_\beta R_\alpha$。

正是这个交换性保证了 $R_m^T R_n = R_{n-m}$——相对位置性质的群论根源。

更深层的联系：SO(2) 同构于单位复数群 $\lbrace e^{i\theta}\rbrace$，这就是为什么复数视角如此自然。对于更高维的 $d$，RoPE 将向量拆成 $d/2$ 个独立的 SO(2) 旋转——每个频率 $\theta_i$ 对应 SO(2) 的一个"表示"。

</details>

## 8. 下一站

RoPE 通过旋转编码了位置信息，但注意力的 $O(n^2)$ 复杂度仍是长序列的瓶颈。有没有办法从控制论的视角理解序列建模？状态空间模型（SSM）给出了另一条路。

→ [现代 RNN 与 SSM](./100-modern-rnn-ssm.md)
