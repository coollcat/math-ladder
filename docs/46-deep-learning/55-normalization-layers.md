---
title: BatchNorm 与 LayerNorm
lesson_id: deep-learning/normalization-layers
prereqs:
  - deep-learning/initialization-symmetry
volume: 5
layer: L7
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - batch-normalization
  - layer-normalization
applications:
  - vision-training
  - transformer-training
exits:
  - data-ai
---

# BatchNorm 与 LayerNorm

## 1. 从一个场景开始

合唱团排练时调音师最头疼的事：每位歌手的音量都在变——今天嗓子开、明天嗓子哑。与其一遍遍重调总台，不如在每个人嘴边装一个**自动稳压器**：不管你唱多响，出支架之前的信号先归一到标准音量，再按音乐需要整体放大。

深度网络同理：训练中权重不断更新，每一层收到的输入分布随之漂移（上一课辛苦校准的方差又被下一轮更新推歪）。批量归一化与层归一化就是插在网络中间的两款稳压器。

## 2. 直觉解释

**核心直觉：先把每个数拉回"均值 0、方差 1"的标准位，再交还网络自己调节形状的权利。**

稳压器分两步：

1. **标准化**：对一组数 $\lbrace x_i \rbrace$ 算均值 $\mu$ 与方差 $\sigma^{2}$，逐个变换为

$$\hat{x}_i=\frac{x_i-\mu}{\sqrt{\sigma^{2}+\varepsilon}}\qquad(\varepsilon \text{ 是防除零的小垫片})$$

2. **可学习缩放与平移**：$\hat x$ 只有标准身材，太死板——再来一对参数 $\gamma,\beta$ 让网络自己决定胖瘦高低：$y_i=\gamma\hat{x}_i+\beta$。

妙处在于 $\gamma,\beta$ 也是可训练的：如果"原始分布"本来就好用，网络可以把 $\gamma=\sigma_{\text{旧}},\ \beta=\mu_{\text{旧}}$ 学回去——稳压器**有恢复原状的能力却不强制**，表达力没有损失，收益是上游漂移被当场截住。

两款归一化的区别只在"**对哪一组数求 μ 和 σ**"：

| | 求统计量的方向 | 典型战场 |
| --- | --- | --- |
| BatchNorm | 跨**批内样本**：同一特征在不同图片之间 | CNN 图像训练 |
| LayerNorm | 跨**单条样本的特征维**：同一段序列内部 | Transformer / 变长文本 |

## 3. 正式定义

设输入为 $d$ 维向量集合。

**LayerNorm**（Ba et al. 2016）对每条样本独立计算：

$$\mu=\frac{1}{d}\sum_{j=1}^{d}x_j,\qquad \sigma^{2}=\frac{1}{d}\sum_{j=1}^{d}(x_j-\mu)^{2}\quad(\text{有偏方差，除以 } d)$$

**BatchNorm**（Ioffe & Szegedy 2015）对每个特征位置在一批 $m$ 个样本间计算统计量，且训练结束后另存一套**滑动平均**的 $\mu,\sigma$ 用于推理（推理时不依赖"凑一批"）。

两处工程细节值得点名：

- 方差一律**除以 d（有偏口径）**——不是第 09 章 t 检验里那个除以 $n-1$ 的无偏版；这里是工程标准化，不是参数估计。
- $\varepsilon$ 出现在**根号里面**：$\sqrt{\sigma^2+\varepsilon}$，而不是根号外加一截。

## 4. 分步例题

**问**：向量 $(2,\,4,\,6)$ 过 LayerNorm（$\gamma=1,\beta=0$），输出的第一个分量是多少？

1. 均值：$\mu=(2+4+6)/3=4$；
2. 偏差：$(-2,\,0,\,2)$；
3. 有偏方差：$(4+0+4)/3=8/3$；$\sigma=\sqrt{8/3}\approx 1.633$；
4. 第一分量标准化：$-2/1.633\approx \mathbf{-1.2247}$。

若再加上 $\gamma=2,\ \beta=0.5$，则第一分量变为 $-1.2247\times 2+0.5=-1.9495$——注意乘性缩放发生在加性平移之前（先伸缩后搬运，次序颠倒结果就错）。

## 5. 动手实验

用滑块亲手转动那对"恢复旋钮"，看标准化后的骨架如何被塑回任何想要的形状：

```viz
{
  "type": "plot",
  "title": "y = γ·normalize(x) + β 的仿射重塑",
  "expr": "(g*(x-4)/1.63299)+b",
  "xmin": 0,
  "xmax": 10,
  "sliders": [
    { "name": "g", "min": 0.5, "max": 2, "step": 0.1, "value": 1 },
    { "name": "b", "min": -2, "max": 2, "step": 0.25, "value": 0 }
  ]
}
```

再来一段数值实验确认整条流水线（含那个"除以 d 不是 d−1"的陷阱）：

```python title="手写 LayerNorm 单测"
def layer_norm_last(vals, gamma, beta):
    n = len(vals)
    mu = sum(vals) / n                       # 均值
    var = sum((v - mu) ** 2 for v in vals) / n   # 有偏方差：除以 n
    std = var ** 0.5
    return [(v - mu) / (std + 1e-5) * gamma + beta for v in vals]

raw = [2.0, 4.0, 6.0]
print(round(layer_norm_last(raw, 1.0, 0.0)[0], 4))    # 标准化后第一个分量
print(round(layer_norm_last(raw, 2.0, 0.5)[0], 4))    # 加上 γ=2, β=0.5 之后
print(round(sum(layer_norm_last(raw, 1.0, 0.0)), 4))  # 标准化输出总和应≈0
```

输出 `−1.2247`、`−1.9495`、`0.0`——与手算例题严丝合缝。

## 6. 常见误区

:::warning[常见误区]

- **"BatchNorm 在推理时也用当前这批数据算均值"** —— 推理用的是训练期间积累的滑动平均，否则来一张图也得凑齐一批才能过网。
- **"ε 是加在 σ 后面的"** —— 它在根号内给方差兜底：$\sqrt{\sigma^2+\varepsilon}$，防止某个特征恰好全等于均值导致除零。
- **"Transformer 也该配 BatchNorm 才先进"** —— 文本长度多变、批内对齐困难，跨样本统计不稳，所以 Transformer 全线选用 LayerNorm。

:::

## 7. 练习

初始代码把方差算成了无偏口径（除以 n−1），还会把仿射的顺序颠倒——修到三条检查通过：

```exercise
# @title: LayerNorm 流水线修正案
# @check: -1.2247
# @check: -1.9495
# @check: 0.0
# @hint: 有偏方差除以 n 不除 n-1；γ 在 β 前面（先缩放后平移）
def layer_norm(vals, gamma, beta):
    n = len(vals)
    mu = sum(vals) / n
    var = sum((v - mu) ** 2 for v in vals) / (n - 1)   # ← 除错了口径
    std = var ** 0.5
    out = []
    for v in vals:
        out.append((v - mu) / (std + 1e-5))
    return [gamma + o * beta for o in out]             # ← 缩放和平移装反了

base = layer_norm([2.0, 4.0, 6.0], 1.0, 0.0)   # 基准组：γ=1、β=0，只看标准化本身对不对
print(round(base[0], 4))
fixed = layer_norm([2.0, 4.0, 6.0], 2.0, 0.5)  # 仿射组：γ=2、β=0.5，检验 γβ 的拼接次序
print(round(fixed[0], 4))
print(round(sum(base), 4))
```

<details>
<summary>点开查看逐步解答</summary>

两处修正一行一处：

```python
var = sum((v - mu) ** 2 for v in vals) / n          # 有偏口径
return [o * gamma + beta for o in out]              # 先 ×γ 再 +β
```

修正后三条打印依次落到：

```python
print(round(base[0], 4))        # −1.2247 —— γ=1、β=0 的基准组，第一分量
print(round(fixed[0], 4))       # −1.9495 —— γ=2、β=0.5 的仿射组，第一分量
print(round(sum(base), 4))      # 0.0 —— 三分量之和恰为零的守恒验证
```

判题锚点的含义：第一条证明标准化本身正确；第二条检验你把 γβ 依正确次序接回去；第三条的"和为零"是中心化后的必然性质——三条连起来，这条小流水线就没有藏污纳垢之处了。
</details>

## 8. 选读证明：为什么"稳住分布"能加速训练

<details>
<summary>选读：平滑性视角的一段公案</summary>

BatchNorm 原论文（2015）把这招解释为消除"内部协变量偏移"：每层输入分布稳定了，下游就不用追着移动靶学习。这个叙事后来被 Santurkar 等（NeLoco 2018）质疑——他们构造了把 BN 换成随机噪声注入的实验，发现真正起作用的是**再参数化让损失面更平滑**：Lipschitz 常数下降，梯度更可预测，于是敢用更大学习率（呼应第 30 课）。今天的主流结论：两种叙述都对了一半——分布稳定是表象，平滑优化地形才是杠杆。这也是"理论叙事会迭代，而机制可以先用起来"的一个活标本。
</details>

## 9. 下一站

稳压器管住了"横向的分布"，但序列任务里还有一维没管：时间。下一门课把循环请回网络——[RNN 与 LSTM：把时间卷进网络](./60-rnn-lstm.md)，同一枚权重沿时间盖下去，看梯度如何在连乘里蒸发或爆炸、门控如何救场。
