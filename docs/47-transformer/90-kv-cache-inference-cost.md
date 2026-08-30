---
title: KV cache 与推理成本
lesson_id: transformer/kv-cache-inference-cost
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
  - kv-cache
  - autoregressive-decoding
applications:
  - inference-serving
  - long-context-models
exits:
  - data-ai
---

# KV cache 与推理成本

## 1. 从一个场景开始

跟 AI 连续对话时，你每敲一个字它就接一个字。字越来越多，回答速度却不该越来越离谱地慢——但想象一种最老实的实现：每收到一个新字，模型就把**前面所有字从头到尾再过一遍**注意力计算，才能憋出下一个字。聊到第 500 字时，开场白已经被完整复读 500 遍。

这笔浪费的账今天必须算清：自回归生成的钱到底花在哪？为什么每种推理框架都有同一个叫 **KV cache** 的东西？读完后你会知道，大模型服务的账本大头既不在权重，也不在"思考"，而在一摞随对话变长的记忆卡片。

## 2. 直觉解释

回到第 40 课的圆桌会议，不过这次是**连续剧**：每一步只放一位新嘉宾入场发言。

- 朴素做法：新嘉宾入场前，请全体老嘉宾**重新自我介绍**、重新贴标签、重新准备内容卡——因为上一场散会时大家把卡片全扔了；
- 聪明做法：**卡片落座后就不撤走**。桌上常备一摞标签卡（Key）和一摞内容卡（Value），新嘉宾只需递出自己的问题卡（Query），跟桌面上现成的 Key 们逐一配对打分，按配比抄录 Value。整个下午没人重复做第二遍自我介绍。

那 Query 为什么不一起存？看看角色的命运就明白了：Query 是**一次性**的——每位新嘉宾只拿它问一轮，问到答案就退场；Key 和 Value 却要被未来的每一位新人反复查阅，天生就该建档保存。同一批向量，两种截然不同的待遇。

## 3. 正式定义

因果注意力下，生成第 $t{+}1$ 个 token 时只需一步小计算：

$$\text{output}_{t+1} = \text{Attention}\!\left(\vec q_{t+1},\ K_{1:t},\ V_{1:t}\right)$$

| 项 | 说明 |
| --- | --- |
| $K_{1:t},V_{1:t}$ | 前 $t$ 个位置的键、价值矩阵——这就是 cache 的全部内容 |
| 数学等价性 | 掩码保证只看过去，因此结果与"全量重算"**一模一样**：缓存不改数学，只改苦力 |
| 每 token 代价 | 从"对全部历史重排整场会议"降到"一位新客入席"：打分量从 $O(t^2)$ 每步变为 $O(t)$ |

**显存账本**（MHA，多头各留各的 K/V）：

$$\text{Bytes} = \underbrace{2}_{\text{K,V 两摞}} \times\ L\ \times\ H\ \times\ n_{ctx}\ \times\ d_{head}\ \times\ b$$

| 符号 | 含义（以 LLaMA-7B 为例） |
| --- | --- |
| $L$ | Transformer 层数：32 |
| $H$ | 键值头数：32 |
| $d_{head}$ | 每头维度：128 |
| $b$ | 单个数字的字节数：fp16 为 2 |
| 每层每 token | $2\times128\times2=512$ B |

关键性质：这摞记忆**随上下文线性增长**——生成 4096 字的长文，显存正好是对 2048 字的两倍，没有摊薄余地。

## 4. 分步例题

**例**：还是上面那台 7B 小模型的配置，算三笔账。

1. **单价**：每层每 token 存 K+V 共 $512$ 字节；乘 32 层得每 token 全模型 $16\,\text{KiB}$；
2. **总账**：上下文 2048 token → $2048\times16\,\text{KiB}=32\,\text{MiB}$；扩到 32768 → $512\,\text{MiB}$——单个请求，还没算权重本身占的大头；
3. **苦力账**：不缓存的逐步累计打分量约为 $\sum_{s\le n}s^2\approx n^3/3$，缓存的增量为 $\sum_{s\le n}s\approx n^2/2$，$n=1024$ 时相差约 $\tfrac23\times1024\approx 680$ 倍。

顺带回答一个自然疑问：既然这么贵，为什么不干脆把 Q 也存进显存？——存了也只会白白翻倍：没有任何未来的步骤需要回查旧 Query。省钱的方向反过来：让多个查询头**共用一组 K/V 头**（MQA/GQA 思路），K/V 直接瘦身为原来的几分之一（选读）。

## 5. 动手实验

### 实验 1：两条工作量曲线的分岔

```viz
{
  "type": "plot",
  "title": "累计打分量：全程重算（上方）vs 增量缓存（下方）",
  "expr": "s*x^3/3",
  "expr2": "s*x^2/2",
  "xmin": 0,
  "xmax": 12,
  "sliders": [
    { "name": "s", "min": 0.25, "max": 4, "step": 0.25, "value": 1 }
  ]
}
```

横轴是已生成的 token 数，纵轴是累计打分工作量的近似（$s$ 吸收批量、层数等规模因子）。重算方案沿 $x^3/3$ 走 cubic 陡坡，缓存方案只走 $x^2/2$ 的平方坡——短文本差距不起眼，越往后差距越呈碾压之势。滑块放大规模因子 $s$：两条曲线同时抬升，但陡的那条永远摔得更狠。

### 实验 2：记账计数器 + 显存斜率表

```python title="重算 vs 缓存的打分账 & KV 显存随长度膨胀"
import matplotlib.pyplot as plt

N = 8                       # 计划生成 8 个 token
naive_steps = []            # 每步打分次数（重算法）
cache_steps = []            # 每步打分次数（缓存法）
for t in range(1, N + 1):
    naive_steps.append(t * t)      # t 位老嘉宾全部返工：人人互相打一遍
    cache_steps.append(t)          # 只有新嘉宾的 1 张查询卡扫全部历史

print(naive_steps)
print(cache_steps)
nv = sum(naive_steps)
cv = sum(cache_steps)
print(round(nv / cv, 2))                   # 总工作量之比

# —— 第二部分：LLaMA-7B 配置下的 KV 显存斜率 ——
LAYERS, HEADS, DHDR, BYTES = 32, 32, 128, 2
per_tok_bytes = 2 * HEADS * DHDR * BYTES * LAYERS   # K、V 两摞 × 每头 × 层数
print(per_tok_bytes // 1024)               # 整除：每 token 占多少 KiB

for n in [1024, 4096, 16384]:
    mib = per_tok_bytes * n / 1048576      # MiB = 字节 ÷ 2 的 20 次方
    print(n, "->", round(mib, 1), "MiB")

fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].bar(range(1, N + 1), naive_steps); axes[0].set_title("每步打分量：重算")
axes[1].bar(range(1, N + 1), cache_steps); axes[1].set_title("每步打分量：增量缓存")

plt.tight_layout()
```

左图柱子逐级拔高成三角形（平方级），右图几乎是一条水平带（线性级）。打印部分先给出 $N=8$ 的可比倍率，随后是显存表：这台模型每生成一个字记 $16$ KiB 的显存卡债，一千字就是 $16$ MiB、一万六千字累计 $256$ MiB——直线陡度虽缓却永不回头。

### 快问快答

```quiz
既然 K 和 V 都要缓存，把 Query 也一并存起来岂不更稳妥？
- 是的，能进一步省时
- 不行：Q 是一次性角色，第 t 步的查询只在当步被使用；会被反复查阅的是历史的 K/V [*]
- 无所谓，反正都要遍历
? 未来每一步新来的查询都要和历史 Key 打分、向历史 Value 取材，所以 K/V 必须常驻；而任何位置产生过的 Q 出了当步就无人问津。缓存它的唯一效果是把显存账翻倍。
```

:::warning[常见误区]

**误区一**："上了缓存，注意力就不用看旧上下文了。"——恰恰相反：cache 里攒着的正是旧 token 的 K/V，供新生查询逐一对分。缓存换掉的是**重复制作卡片**的劳动，从来不是"查看历史"这件事本身。

**误区二**："缓存改变注意力的数学。"——掩码本来只允许看过去，增量计算与全量重算逐位相等。这是缓存得以横行的底气：纯粹省工，零精度损失。

**误区三**："上下文拉长无非是响应慢一点。"——真正的硬墙是显存：KV 占用与长度严格线性，叠加并发用户后往往比权重还先爆。业界瘦身手段——MQA/GQA 共享键值头、量化存储、PagedAttention 分页管理——全是围绕这一摞卡片打的算盘。

:::

## 6. 练习

**练习 1**：小实验口算：两行注意力矩阵，$d_k$ 固定，其余条件相同。哪一行更长（字节更多）：200 个 token 的 K，还是同长度的 V？

<details>
<summary>点开查看逐步解答</summary>

完全一样长：K 与 V 位数相同（教学口径 $d_v=d_k$，真实架构中二者常常等维）。所以显存账里的系数"2"只指这两位孪生兄弟各存一份——这也是 GQA 砍半腾挪的空间所在。
</details>

**练习 2**：亲手结一次 KV 显存账（迷你模型）：

```exercise
# @title: 练习：结一次显存账
# @check: 2.0
# @check: 4.0
# @check: True
# @hint: 第二处照抄示范行的乘积再乘层数；最后一处验证账单的线性品格——上下文翻倍，账单是否恰好跟着翻倍。
L = 2                 # 层数（迷你版）
H = 4                 # 键值头数
D = 64                # 每头维度
BYTES = 2             # fp16 每个数 2 字节
n = 1024              # 当前上下文长度

per_layer = 2 * H * D * BYTES        # 一层的 K+V 每字节账（已示范）
all_layers = 0                       # ← 问题在这：乘上层数 L 得全模型每 token 开销

mib = all_layers * n / 1048576       # MiB = 字节数 ÷ 2 的 20 次方
print(round(mib, 1))

mib_double = all_layers * (n * 2) / 1048576     # 上下文翻倍后的账单
print(round(mib_double, 1))
print(mib_double == mib * 2)         # 线性关系精确成立吗？
```

**练习 3**：概念题——为什么说"batch 越大、KV 显存越成主要矛盾"？

<details>
<summary>点开查看逐步解答</summary>

权重是一份共享资产：无论同时服务多少用户都只载入一份。KV cache 却是**每条请求各自一摞**且随其上下文变长而生长。高并发长对话的服务场景里，请求数 × 平均上下文长度迅速让 KV 反超权重成为显存第一大户——推理框架的调度、抢占、淘汰策略基本都是围着这块动态蛋糕设计的。
</details>

## 7. 选读：给记忆卡片瘦身的家族谱系

<details>
<summary>选读 · MQA → GQA → PagedAttention 一句话地图</summary>

MQA（2019）：让全部查询头共享**一组** K/V，账单砍到 $1/H$，但质量略降；GQA 取折中——分组轮值共享（比如 32 个查询头共用 8 组键值），质量几乎无损、显存节约大半，LLaMA-2-70B 起成为长上下文大模型的普遍选择。另一支思路不动数量动**管理**：PagedAttention（vLLM 核心）把 KV 切成固定大小的页、按需分配，像操作系统管虚拟内存那样消灭碎片、提高并发密度。方向殊途同归：那一摞必然存在的卡片，要么变薄，要么摆放得更挤而不丢。
</details>

## 8. 下一站

本章把一台 Transformer 从里到外拆了个遍：token 有编号、词有坐标、注意力会分工、骨架有公路，训练与推理的钱也都对过账。可"词向量"这架几何机器本身就够琢磨——把它单独放进显微镜，如何变成可检索、可运算的知识地图？下一章接着往下看。

→ [第 48 章 · 嵌入与几何](../48-embeddings-geometry/index.md)
