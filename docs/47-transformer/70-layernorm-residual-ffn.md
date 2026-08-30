---
title: LayerNorm、残差与前馈层：每个 Transformer 块的骨架
lesson_id: transformer/layernorm-residual-ffn
prereqs:
  - transformer/self-attention
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - transformer-block
applications:
  - large-language-models
exits:
  - data-ai
---

# LayerNorm、残差与前馈层：每个 Transformer 块的骨架

## 1. 从一个场景开始

流水线车间里，明星工位从来不是全部：除了主角机器，还得有**传送带**把半成品稳稳送到下一站、**质检仪**保证每件货规格统一、以及深度加工的**精加工车间**。自注意力就是那位明星工位——但一个 Transformer 块要真正成型，还需要三样配角：残差连接、LayerNorm 与前馈层。

而多数人没算过的另一笔账：翻开任意一份大模型参数表，参数大头并不在注意力里。这一课把骨架搭起来，顺便揭晓参数都藏在哪个车间。

## 2. 直觉解释

**残差：信息高速公路。** 子层不做的事：**替换**整车货物。每个子层只往车上**添置**新货（一个修正项 $\Delta$），老货原封不动：

$$\text{新表示} = \text{旧表示} + \text{子层产出}$$

最坏情况下子层啥也没学会，$\Delta\to 0$，通路自动退化成"直通车"。反向传播同理：误差可以沿这条不加改动的干道一路开回浅层——这就是常说的"梯度直通车"直觉（细节在第 46 章的残差课展开）。

**LayerNorm：每辆车自带音量旋钮。** 各 token 向量的分量幅度可能天差地别：有的 token 携带数值巨大的特征，成了"大嗓门"，在后续矩阵乘法里垄断话语权。LayerNorm 沿每个 token 自己的特征维做一次标准化（减均值、除标准差），不管进门多吵出门一律调成统一音量——46 章学的归一化元件在此上岗。

**前馈层：按位变换的记忆库。** 注意力负责"去哪儿取材"，前馈层负责"加工成什么"。它是同一个两层 MLP 被逐个施加在每个位置上，第一层像一排**问题检测器**，第二层按触发强度写入对应的知识条目——研究者因此常把它比作模型的键值记忆库。重点来了：它的中间宽度通常是模型维度的 $4$ 倍，参数量约为注意力模块的两倍——车间才是库里囤货最多的地方。

## 3. 正式定义

记子层函数为 $\text{Sub}(\cdot)$（可以是注意力，也可以是 FFN），Transformer 块有两种装配顺序：

$$\text{Post-LN：}\ x \leftarrow \text{LN}\big(x + \text{Sub}(x)\big)\qquad \text{Pre-LN：}\ x \leftarrow x + \text{Sub}\big(\text{LN}(x)\big)$$

前馈层本体：

$$\text{FFN}(x) = W_2\,\sigma\!\left(W_1 x\right)$$

| 部件 | 形状（以 $d=512$ 计） | 要点 |
| --- | --- | --- |
| $W_1$ | $4d\times d$（即 $2048\times 512$） | 升维 4 倍，像把每个 token 展成更宽的工作台 |
| $W_2$ | $d\times 4d$（即 $512\times 2048$） | 收拢回去 |
| $\sigma$ | 逐元素激活 | 只增丰富度不换形状；现代模型常用 GELU/ReLU 族 |
| 注意力三投影 $+$ 输出融合 | 共约 $4d^2\approx 105$ 万 | 上一课清点的账 |
| FFN 两层 | $8d^2\approx 210$ 万 | 单块内占 $\tfrac23$ 参数——记住这个数 |

两种装配只差 LN 站的位置：**Post-LN 相加后归一，Pre-LN 先归一再进站**。本课只认结构差别（主干是否被归一站隔断），训练动态差异点到为止。

## 4. 分步例题

**例**：迷你 token $\vec x=(1,\ 2)$ 过一个 Pre-LN 块的注意力站与前馈站（LN 用 $\gamma=1,\beta=0$ 默认款，即纯粹减均值除标准差）。

1. 进站前先调音量：$\vec x$ 均值 $1.5$、标准差 $0.5$，归一得 $(−1,\ 1)$——两个分量的向量总被对称归一，这是二维巧合，真实 512 维没有；
2. 注意力站读完语境，交出添头 $\Delta=(0.5,\ −0.25)$——注意它针对的是**归一后的输入**计算的，但残差要加回**原始的** $\vec x$：$\vec x_1=(1,\ 2)+(0.5,\ −0.25)=(1.5,\ 1.75)$；
3. 第二站开工前再次调音量：$(1.5,\ 1.75)$ 均值 $1.625$、标准差 $0.125$，又是对称读数 $(−1,\ 1)$；
4. 设前馈站吐出添头 $\Delta=(0.25,\ 0.75)$：最终 $\vec x_2=(1.5,\ 1.75)+(0.25,\ 0.75)=(1.75,\ 2.5)$。

全程两次"添而不换"：就算删掉两个子层，$(1,2)\to(1,2)$ 的原始信息也毫发无损地流到了出口——这就是高速公路的意义。

## 5. 动手实验

### 实验 1：高速公路的主路始终是那条直线

```viz
{
  "type": "plot",
  "title": "子层加得再多，主路仍接近恒等直线 y = x",
  "expr": "x + c*sin(x)",
  "expr2": "c*sin(x)",
  "xmin": -6,
  "xmax": 6,
  "sliders": [
    { "name": "c", "min": 0, "max": 2, "step": 0.25, "value": 0.5 }
  ]
}
```

细曲线是某个子层贡献的"弯道" $c\sin x$，粗大的主线是块的总输出 $x+c\sin x$——拖动滑块看：弯道起伏再剧烈，主线的走向始终贴着 $45°$ 直线。若换成普通链式结构（没有那条恒等捷径），子层的任何扭曲都会被层层放大叠加，主路很快面目全非。

### 实验 2：参数大头账本 + 大嗓门调节器

```python title="数一数参数，再看 LayerNorm 抹平音量差"
import math
import matplotlib.pyplot as plt

# —— 第一部分：一块内部的参数账（d=512，FFN 宽 4 倍）——
d = 512
attn_params = 4 * d * d          # 注意力：Q/K/V 三投影 + 输出融合层
ffn_params = 8 * d * d           # 前馈：两层全连接 d→4d→d
print(attn_params)
print(ffn_params)
print(round(ffn_params / (attn_params + ffn_params), 3))   # 前馈占比

# —— 第二部分：大嗓门与小声量 token 过同一台均衡器 ——
tok_loud = [120.0, 180.0]        # 幅度巨大的特征
tok_quiet = [0.03, 0.05]         # 几乎无声的特征

def layernorm(vals):
    m = sum(vals) / len(vals)    # 均值：len 取列表长度
    sq_total = 0                 # 平方差累加器
    for v in vals:
        sq_total += (v - m) ** 2
    sd = math.sqrt(sq_total / len(vals))    # 标准差
    return [(v - m) / sd for v in vals]

normed_loud = layernorm(tok_loud)
normed_quiet = layernorm(tok_quiet)
print([round(v, 3) for v in normed_loud])
print([round(v, 3) for v in normed_quiet])

fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].bar(["大嗓门", "小声量"], [max(tok_loud), max(tok_quiet)])
axes[0].set_title("归一化前：相差几千倍")
axes[1].bar(["大嗓门", "小声量"], [max(normed_loud), max(normed_quiet)])
axes[1].set_title("LayerNorm 后：同一尺度")
axes[1].set_ylim(0, 2)

plt.tight_layout()
```

第一部分揭晓谜底：单块之内前馈占比恰为三分之二——一个几十层的堆叠再把这份账乘上层数，FFN 就是参数宇宙的主体。第二部分的左图两个柱子高度差着三个数量级；右图却齐刷刷同一高度：LayerNorm 不管你进门多大嗓门，出口一律同规格。（二维对称样本被精确归一到 $\pm 1$ 属于巧合；真实 512 维不会这么极端，但"抹平尺度"的效果相同。）

### 快问快答

```quiz
Pre-LN 与 Post-LN 两种装配方式，最直接的结构区别在哪？
- 用没用残差连接
- LayerNorm 摆在子层入口侧还是相加之后 [*]
- 有没有前馈层
? 两式都含残差和 FFN；唯一差别是 LN 站位：Post-LN 每次相加完就归一（把住主干出口），Pre-LN 把归一挪到匝道上、恒等捷径一路畅通。
```

:::warning[常见误区]

**误区一**："每个子层都要彻底改写 token 的内容。"——残差的设定恰好相反：子层只提交**添头**，旧车默认照开；学得好就添得多，学不动就整段跳过，浅层信息因此永不丢失。

**误区二**："Transformer 的参数都花在注意力上。"——单块里 FFN 占约三分之二，整个模型的参数重心在前馈车间；注意力是高性价比的路由部门，不是仓储中心。

**误区三**："这里的 LayerNorm 是把一句子里所有 token 放一起归一。"——它沿**单个 token 自身的特征维**操作，token 之间互不掺和；跨样本统计归一是第 46 章 BatchNorm 干的事，且因文本长度多变已被 Transformer 全线弃用。

:::

## 6. 练习

**练习 1**：为什么说残差连接是"梯度直通车"？请从"$y=x+f(x)$ 对 $x$ 求导"出发给一句话理由。

<details>
<summary>点开查看逐步解答</summary>

$y = x+f(x)$ 时 $\partial y/\partial x = 1+\partial f/\partial x$：无论子层学得多糟糕，求导结果里永远带着恒等的 $1$ 那一项。反向传播的误差顺着无数个"至少含 1 的通道"汇回浅层，深网络的梯度既不容易消失也不容易爆炸——车流始终有一条不减速的主干道。
</details>

**练习 2**：亲手把例题里的两段"添而不换"补完：

```exercise
# @title: 练习：跑通一个迷你块的两次高速相加
# @check: 1.5
# @check: 1.75
# @check: [1.75, 2.5]
# @hint: 高速公路只有一种动作：对应位置相加。x1 是 x 加注意力添头，y 再加一次前馈添头即可。
x = [1.0, 2.0]              # token 进门的样子（已示范取值）
delta_attn = [0.5, -0.25]   # 注意力站的添头
delta_ffn = [0.25, 0.75]    # 前馈站的添头

x1 = [0, 0]                 # ← 问题在这：x 加上注意力添头得新 token
print(round(x1[0], 2))
print(round(x1[1], 2))

y = [0, 0]                  # ← 问题在这：再走一次高速，加上前馈添头
print([round(v, 2) for v in y])
```

**练习 3**：概念题——假如把块里的 FFN 整个拆掉（只留注意力+残差），理论上还剩什么能力？丢什么？

<details>
<summary>点开查看逐步解答</summary>

还能做"混合检索"：注意力本身可以把别的位置的信息搬过来加权汇总。丢的是"加工深度"：注意力基本在做线性搬运（softmax 配比加权和），而 FFN 的两层结构带着逐元素非线性，负责在每个位置内部完成知识的存取与变形。砍掉 FFN 的模型明显变笨——它只有邮局，没有工厂。
</details>

## 7. 选读：为什么现代大模型偏爱 Pre-LN

<details>
<summary>选读 · 一句结构层面的比较</summary>

结构视角（不涉优化动力学）：Post-LN 的归一站立在**主干出口**上——信息哪怕全程走捷径，到了每一层尽头也要被强行重新校音；网络越深，这种反复拦截对信号的扰动越难掌控。Pre-LN 把 LN 挪到**匝道口**：主干道上的 $x$ 从第一层一路原速通到顶层，需要加工的信息才绕进"LN→子层"的匝道。代价是主干上的表征会随深度缓慢膨胀，需要结尾再加一次 Final LN 收口——GPT 系与当前主流开源模型基本都是这个装配图。
</details>

## 8. 下一站

骨架长好了：注意力管开会，FFN 管加工，残差送快递，LayerNorm 调音量。可是成品车间越盖越大，能不能让每位顾客只进真正对口的那间房？下一课开启稀疏时代的分诊台。

→ [MoE 与稀疏门控：专家们的分诊台](./80-moe-gating.md)
