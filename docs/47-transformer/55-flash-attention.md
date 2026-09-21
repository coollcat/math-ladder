---
title: Flash Attention
lesson_id: transformer/flash-attention
prereqs:
  - transformer/multihead-attention
volume: 5
layer: L10
track:
  - deep-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import:
  - torch
introduces_concepts:
  - flash-attention
  - io-aware-algorithm
  - tiling
  - online-softmax
applications:
  - llm-training
  - long-context-inference
exits:
  - ring-attention
---

# Flash Attention

## 1. 从一个场景开始

你在一台 GPU 上跑 4096 token 的自注意力。理论上 $O(n^2)$ 的计算量不算离谱，但实际运行时——GPU 显存爆了。问题不是计算太多，而是**中间结果太大**：$n \times n$ 的注意力矩阵要完整存在 HBM（高带宽显存）里，每一步 softmax 还要反复读写。

2022 年 Tri Dao 提出了 Flash Attention：**不存完整注意力矩阵**，通过分块计算把内存从 $O(n^2)$ 降到 $O(n)$，同时速度提升 2-4 倍。

## 2. 直觉解释

传统注意力的瓶颈不是"算得慢"，而是"搬数据慢"。GPU 有两层存储：

| 层级 | 容量 | 带宽 | 角色 |
| --- | --- | --- | --- |
| SRAM（片上缓存） | ~20 MB | ~19 TB/s | 快但小 |
| HBM（显存） | ~40-80 GB | ~2 TB/s | 大但慢 |

传统算法：算出 $S = QK^T$（$n \times n$）→ 写入 HBM → 从 HBM 读回算 softmax → 写入 HBM → 读回乘 $V$。来回复制成了瓶颈。

Flash Attention 的思路：**把 Q、K、V 切成小块，每块在 SRAM 里一口气算完 softmax 和加权求和，不把 $n \times n$ 矩阵写到 HBM**。

## 3. 正式定义

### 标准注意力的 IO 复杂度

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V$$

标准实现需要：
- 写入/读取 $S = QK^T$：$O(n^2)$ HBM 访问
- 总 HBM 访问量：$O(n^2 d + n^2)$

### Flash Attention 的分块策略

设 SRAM 容量为 $M$，块大小 $B = \lfloor M / (4d) \rfloor$（每个块存 Q/K/V 的一小片）：

1. 将 $Q$ 分成 $T_Q = \lceil n/B \rceil$ 块，$K, V$ 分成 $T_K = \lceil n/B \rceil$ 块
2. 外层遍历 $K, V$ 块，内层遍历 $Q$ 块
3. 每对 $(Q_{\text{block}}, K_{\text{block}})$ 在 SRAM 里计算局部 $S_{\text{block}}$
4. 用 **online softmax** 增量更新输出，无需存储完整 $S$

### Online Softmax 关键公式

$$m_{\text{new}} = \max(m_{\text{old}}, m_{\text{block}})$$
$$\ell_{\text{new}} = e^{m_{\text{old}} - m_{\text{new}}} \cdot \ell_{\text{old}} + e^{m_{\text{block}} - m_{\text{new}}} \cdot \ell_{\text{block}}$$
$$O_{\text{new}} = \frac{e^{m_{\text{old}} - m_{\text{new}}} \cdot \ell_{\text{old}} \cdot O_{\text{old}} + e^{m_{\text{block}} - m_{\text{new}}} \cdot O_{\text{block}}}{\ell_{\text{new}}}$$

每处理一个新块，只需维护**运行最大值 $m$、运行分母 $\ell$、运行输出 $O$** 三个量。

### 复杂度对比

| 指标 | 标准注意力 | Flash Attention |
| --- | --- | --- |
| 计算量 | $O(n^2 d)$ | $O(n^2 d)$（不变） |
| HBM 访问 | $O(n^2 d + n^2)$ | $O(n^2 d^2 / M)$ |
| 额外内存 | $O(n^2)$ | $O(n)$ |

计算量没变（甚至因分块有微小冗余），但 **IO 减少了**——这正是"IO-aware"的含义。

## 4. 分步例题

**例**：$n=4, d=2$，分块大小 $B=2$，手算 Flash Attention 前两步。

给定：

$$Q = \begin{pmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 1 \\ 0 & 0 \end{pmatrix}, \quad K = \begin{pmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 1 \\ 0 & 0 \end{pmatrix}, \quad V = \begin{pmatrix} 1 \\ 2 \\ 3 \\ 4 \end{pmatrix}$$

1. **块划分**：$K_1 = K_{1:2}$, $K_2 = K_{3:4}$, $Q_1 = Q_{1:2}$, $Q_2 = Q_{3:4}$
2. **处理 $(Q_1, K_1)$**：$S_{11} = Q_1 K_1^T = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$，局部 softmax，更新 $m^{(1)}, \ell^{(1)}, O^{(1)}$
3. **处理 $(Q_1, K_2)$**：算 $S_{12}$，用 online softmax 公式把新块的贡献"折叠"进 $m, \ell, O$
4. 重复直到所有块处理完毕，$O$ 就是最终输出

关键：$S_{11}, S_{12}$ 都**不需要存到 HBM**，在 SRAM 里算完就丢。

## 5. 动手实验

### 实验 1：Online Softmax 演示

```python title="增量计算 softmax：证明和一次性算结果相同"
import numpy as np

scores = np.array([2.0, 1.0, 0.5, 3.0])

# 方法 1：标准 softmax
exp_all = np.exp(scores)
softmax_std = exp_all / exp_all.sum()
print(f"标准 softmax: {softmax_std}")

# 方法 2：分两块，online softmax
m, l, o = -np.inf, 0.0, np.zeros(4)  # 初始化：最大值=-∞，分母=0，输出=0
for block_start in range(0, 4, 2):  # 每块 2 个元素
    s_block = scores[block_start:block_start+2]
    m_block = s_block.max()
    # online softmax 更新
    m_new = max(m, m_block)
    l = np.exp(m - m_new) * l + np.exp(m_block - m_new) * np.exp(s_block - m_block).sum()
    m = m_new

# 最终 softmax（只算分母，用于验证）
exp_online = np.exp(scores - m)
print(f"Online softmax 分母: {l:.6f}")
print(f"标准分母: {exp_all.sum():.6f}")
print(f"差值: {abs(l - exp_all.sum()):.2e}")  # e：科学记数法
```

两种方法得到的分母应该完全一致（在浮点精度内）。

当 $n=8192$ 时，标准方法需要约 256 MB 存注意力矩阵，Flash 只需约 0.03 MB——差距近万倍。

:::warning[常见误区]

**误区一**："Flash Attention 计算更快是因为它减少了浮点运算。"
不是。Flash Attention 的 FLOPs 和标准注意力一样（甚至略多），快在**减少了 HBM 读写次数**——GPU 是 IO-bound 而非 compute-bound。

**误区二**："Flash Attention 需要近似或截断。"
不需要。Flash Attention 计算的是**精确的注意力输出**（在浮点精度内），和标准实现数学上等价。

**误区三**："分块越小越好。"
块太小会增加循环次数和冗余计算。最优块大小取决于 SRAM 容量和 $d$，通常由编译器自动选择。

:::

## 6. 练习

**练习 1**：设序列长度 $n=4096$，头维度 $d=64$，SRAM 大小 $M=192\text{KB}$。计算分块大小 $B$。

<details>
<summary>点开查看解答</summary>

每个元素 4 字节（float32），每个块需要同时放 Q、K、V 三份：$4 \times 3 \times d \times B$ 字节。

$B = \lfloor \frac{M}{4 \times 3 \times d} \rfloor = \lfloor \frac{192 \times 1024}{12 \times 64} \rfloor = \lfloor \frac{196608}{768} \rfloor = 256$

所以每个块处理 256 个 token，总共需要 $4096/256 = 16$ 个块。
</details>

**练习 2**：实现一个极简版 Flash Attention（2 块，单头）。

```exercise
# @title: 简化版 Flash Attention
# @check: 1.000
# @hint: 分两块处理 K,V，每块计算局部 softmax 分子和分母，最后合并
import numpy as np

np.random.seed(0)
n, d = 8, 4
Q = np.random.randn(n, d)
K = np.random.randn(n, d)
V = np.random.randn(n, 1)
B = 4  # 块大小

# Flash: 分两块处理
O_flash = np.zeros((n, 1))
m_running = np.full(n, -np.inf)  # full：创建 n 个元素全为 -inf 的数组
l_running = np.zeros(n)

for j in range(0, n, B):  # 遍历 K,V 的每个块
    K_j = K[j:j+B]
    V_j = V[j:j+B]
    S = Q @ K_j.T / np.sqrt(d)  # 局部注意力分数
    m_block = S.max(axis=1)  # 每行最大值
    m_new = np.maximum(m_running, m_block)  # 更新全局最大值
    # 请补全以下两行：更新 l_running 和 O_flash
    l_running = l_running  # ← 修复
    O_flash = O_flash       # ← 修复

# 对比标准注意力
S_full = Q @ K.T / np.sqrt(d)
P_full = np.exp(S_full - S_full.max(axis=1, keepdims=True))  # keepdims：保持维度便于广播
P_full = P_full / P_full.sum(axis=1, keepdims=True)
O_std = P_full @ V

print(f"最大差异: {np.abs(O_flash - O_std).max():.6f}")
```

```quiz
Flash Attention 的加速主要来自哪个方面？
- 减少了矩阵乘法的浮点运算次数
- 减少了 GPU 显存 (HBM) 的读写次数 [*]
- 使用了更高效的激活函数
- 减少了模型参数量
? Flash Attention 的 FLOPs 与标准注意力相同，核心优化是通过分块计算减少 HBM 访问——GPU 注意力是 IO-bound 问题。
```

```quiz
Online Softmax 算法在处理新块时需要维护哪几个运行状态？
- 只需要运行和
- 运行最大值、运行分母、运行输出 [*]
- 完整的 n x n 注意力矩阵
- 每个块的独立 softmax 结果
? Online Softmax 维护三个标量：全局最大值 m、分母 l、加权输出 O，每处理一个新块就增量更新，无需存储完整矩阵。
```

## 7. 选读：从 Online Softmax 到 Flash Attention 的证明

<details>
<summary>选读 · Online Softmax 的正确性证明</summary>

**Claim**：分块计算的 $O = \frac{\sum_j e^{s_j - m} v_j}{\sum_j e^{s_j - m}}$ 与一次性计算结果完全一致。

**证明**：设前 $k$ 个块处理后的运行状态为 $(m^{(k)}, \ell^{(k)}, O^{(k)})$，其中：

$$m^{(k)} = \max_{j \leq kB} s_j, \quad \ell^{(k)} = \sum_{j \leq kB} e^{s_j - m^{(k)}}, \quad O^{(k)} = \frac{\sum_{j \leq kB} e^{s_j - m^{(k)}} v_j}{\ell^{(k)}}$$

加入第 $k+1$ 块后，用归纳法验证更新公式保持此不变量。归纳步：

$$\ell^{(k+1)} = e^{m^{(k)} - m^{(k+1)}} \ell^{(k)} + \sum_{j \in \text{block}} e^{s_j - m^{(k+1)}}$$

这是恒等式 $\sum_{j \leq (k+1)B} e^{s_j - m^{(k+1)}} = e^{m^{(k)} - m^{(k+1)}} \sum_{j \leq kB} e^{s_j - m^{(k)}} + \sum_{j \in \text{block}} e^{s_j - m^{(k+1)}}$ 的直接展开。$\square$

</details>

## 8. 下一站

Flash Attention 解决了"注意力算得慢"的问题。但还有一种优雅的数学方法能让注意力天然编码位置信息——旋转位置编码 RoPE，用旋转矩阵代替绝对位置编码。

→ [旋转位置编码 RoPE](./57-rope-math.md)
