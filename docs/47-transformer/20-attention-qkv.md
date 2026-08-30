---
title: 注意力：查询、键、值
lesson_id: transformer/attention-qkv
prereqs:
  - transformer/token-embedding
  - linalg/dot-product
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
  - attention-mechanism
  - query-key-value
applications:
  - machine-translation
  - coreference-resolution
exits:
  - data-ai
---

# 注意力：查询、键、值

## 1. 从一个场景开始

读"小明把书放下，因为他累了"——你瞬间知道"他"指小明而不是书。人脑的秘诀是**回看**：读到代词时回头扫一遍前文，跟语境匹配的部分多吸收一点。

早期的机器翻译没有这个动作：编码器把整句压成一个固定向量，长句一压就糊。2017 年的 Transformer 把"回看"做成了数学运算——**注意力**，从此模型读长文不再气短。本课拆开它的三个角色：查询（Query）、键（Key）、值（Value）。

## 2. 直觉解释

去图书馆找书，一套完整流程：

- 你脑中的需求是**查询（Query）**："我要神经网络入门书"；
- 每本书书脊上的标签是**键（Key）**：《深度学习》《红楼梦》《菜谱大全》……；
- 书的实际内容是**价值（Value）**——真正会被你带走的东西。

智能检索不是只借标签完全一致的那本，而是**按相关程度加权混合**：深度学习那本借八成，隔壁《统计学习》借两成，《红楼梦》不借。注意力对句子里的词做的事一模一样：

$$\text{输出} = \sum_j (\text{第 } j \text{ 本的相关度}) \times \vec v_j$$

一个词就这样"吸收语境"改写了自己——同一个"苹果"，在手机评测句里向"华为"大量取材，在水果摊句里向"香蕉"取材。

## 3. 正式定义

设输入词向量 $\vec x \in \mathbb{R}^{d_{\text{model}}}$，三条独立变换把它派生成三个分身：

$$\vec q = W_Q \vec x \in \mathbb{R}^{d_k} \qquad \vec k = W_K \vec x \in \mathbb{R}^{d_k} \qquad \vec v = W_V \vec x \in \mathbb{R}^{d_v}$$

其中 $W_Q, W_K \in \mathbb{R}^{d_k \times d_{\text{model}}}$，$W_V \in \mathbb{R}^{d_v \times d_{\text{model}}}$——矩阵左乘列向量时，行数是输出维、列数是输入维。打分要求两个向量同维，所以 $q$ 和 $k$ 都取 $d_k$；加权后的输出则保持价值空间的维度 $d_v$。

词 $i$ 对词 $j$ 的匹配分数与加权输出：

$$\text{score}(i, j) = \vec q_i \cdot \vec k_j \qquad \text{output}_i = \sum_j \alpha_{ij}\, \vec v_j$$

其中权重 $\alpha_{ij}$ 由下一课的 softmax 从分数生成（保证非负且总和为 1）。

| 符号 | 含义 |
| --- | --- |
| $\vec q \in \mathbb{R}^{d_k}$ | 查询：我在找什么 |
| $\vec k \in \mathbb{R}^{d_k}$ | 键：我能被什么找到 |
| $\vec v \in \mathbb{R}^{d_v}$ | 价值：真被选中后交付的内容 |
| $W_Q, W_K, W_V$ | 三张可学习的变换矩阵；前两张输出 $d_k$ 维，第三张输出 $d_v$ 维 |
| $\alpha_{ij}$ | 归一化后的注意力权重 |

## 4. 分步例题

**例**：句子里"它"要决定指代谁。设它的查询 $\vec q = (1,\ 2)$；候选词"华为"（技术义）的键 $\vec k_1 = (0.5,\ 2.5)$，"苹果"（水果义）的键 $\vec k_2 = (2,\ 1)$。

1. 与华为的匹配分：$1 \times 0.5 + 2 \times 2.5 = 5.5$；
2. 与苹果的匹配分：$1 \times 2 + 2 \times 1 = 4$；
3. 结论：$5.5 > 4$，softmax 之后"华为"将获得更大的注意力权重；
4. 设归一化后 $\alpha = (0.6,\ 0.4)$，两词的价值向量 $\vec v_1 = (0,\ 1)$、$\vec v_2 = (1,\ 1)$，则"它"的新表示：

$$\text{output} = 0.6 \times (0,\ 1) + 0.4 \times (1,\ 1) = (0.4,\ 1.0)$$

新向量偏向了技术语义——"它"完成了指代消解。

## 5. 动手实验

### 实验 1：匹配强度就是投影长度

```viz
{
  "type": "projection",
  "title": "查询落在键方向上的影子越长，越匹配",
  "u": [2, 1],
  "v": [3, 1]
}
```

蓝色是某词的查询向量，绿色是一把键。拖动它们：橙色影子（投影）越长，点积越大，注意力配比就越倾斜。注意即使键比查询短很多，只要方向对，照样能拿到高分——匹配看的是方向。

### 实验 2：手写打分循环

```python title="一个查询对多个键的注意力打分"
q = [1.0, 2.0]                       # "它"的查询向量
keys = {                             # 候选词的键
    "华为": [0.5, 2.5],
    "苹果": [2.0, 1.0],
    "石头": [-1.0, 0.5],
}

def dot(u, v):
    total = 0
    for i in range(len(u)):
        total += u[i] * v[i]
    return total

scores = {}
for word in keys:                    # 逐个候选词打分
    scores[word] = round(dot(q, keys[word]), 2)

print(scores)                        # 打分表
winner = max(scores, key=scores.get) # max 的 key 参数：按字典的值比大小，返回对应的键
print("注意力最倾斜的词:", winner)
```

三行核心逻辑：遍历、点积、取最大。真实的注意力只是把这个循环同时发给成千上万个查询，并把"取最大"升级成下一课的 softmax 配比。

### 快问快答

```quiz
Query 和 Key 都由同一个词向量变出来，为什么不干脆用同一个向量？
- 节省内存
- 变换矩阵不同：一个负责"我想找什么"，另一个负责"我能提供什么"，解耦两种角色 [*]
- 纯属历史习惯
? 同一个词在句中既是寻求者又是被寻求者，两种身份的需求不同。WQ 和 WK 让模型分开学习这两种行为。
```

:::warning[常见误区]

**误区一**："注意力权重就是词的重要程度。"——权重是**当前查询视角下**的有用度：同一个"银行"，"存钱"看它和"河流"看它拿到的权重完全不同。离开查询谈重要度没有意义。

**误区二**："价值向量等于原词向量。"——$\vec v$ 是第三张变换表的产物，常刻意与 q/k 不同维；"标签"和"货"本来就是两回事。

**误区三**："点积分数可以直接当权重。"——原始分数有正有负、总和乱七八糟，不能当配比。必须先过 softmax（下一课主角），另外大维度下还要先除以 $\sqrt d$ 防爆（第 40 课见）。

:::

## 6. 练习

**练习 1**：翻译任务里，输出英文"bank"这个词时模型该向中文原句的哪些字索取高注意力？说明你的理由。

<details>
<summary>点开查看逐步解答</summary>

取决于上下文：若原句含"存款/账户"，应聚焦"银"字附近；若含"河岸/岸边"，则聚焦"岸"。这正是注意力的威力：软对齐由数据自动学出，无需人工词典。
</details>

**练习 2**：补全"它"的打分程序，找出指代对象：

```exercise
# @title: 练习：它指的是谁？
# @check: 4.0
# @check: 5.5
# @check: 它 -> 华为
# @hint: 第二处照抄第一行的写法换成 tech；点积就是对应位置相乘再相加。程序最后还会打印指代结果。
q = [1.0, 2.0]              # "它"的查询向量
k_food = [2.0, 1.0]         # "苹果"（水果义）的键
k_tech = [0.5, 2.5]         # "华为"（技术义）的键

def dot(u, v):
    total = 0
    for i in range(len(u)):
        total += u[i] * v[i]
    return total

score_food = round(dot(q, k_food), 2)   # 已示范
score_tech = 0                          # ← 问题在这：算出与华为的匹配分

print(score_food)
print(score_tech)
if score_tech > score_food:
    print("它 -> 华为")
else:
    print("它 -> 苹果")
```

**练习 3**：概念题——为什么"价值"要和"键"分开？让被选中的书连内容带标签一起给你不行吗？

<details>
<summary>点开查看逐步解答</summary>

标签的功能是"被检索到"，内容的功能是"被使用"，两者最优形态往往不同。比如摘要任务中，键可以突出主题词特征便于匹配，而价值携带完整的语义信息供融合。合二为一等于强迫一张向量兼任两个工种，表达力受损——三个变换矩阵给了模型自由。
</details>

## 7. 选读：注意力并非 2017 年发明

<details>
<summary>选读 · 一段谱系</summary>

为翻译做"软对齐"的加性注意力早在 2014–2015 年就已出现（Bahdanau 等）；点积形式与"完全抛弃循环结构、纯注意力堆叠"的组合才是 2017 年《Attention Is All You Need》的贡献。更早的根须还能伸向信息检索：搜索引擎给"查询—文档"打相关性分，用的正是同一套点积思想。顺带补一句谱系：承载这些早期注意力的上一代主力是循环神经网络——RNN 时代的"回看"就长在时间步之间，底子见第 46 章[RNN 与 LSTM：把时间卷进网络](../46-deep-learning/60-rnn-lstm.md)。Transformer 的功绩是把一个老想法放进了可大规模并行的架构里。
</details>

## 8. 下一站

打分有了，怎么把一堆正负不齐的分数变成"总和为 1、非负"的配比？而且为什么调一个温度旋钮就能控制模型说话的风格？下一课的主角：softmax。

→ [Softmax 与温度](./30-softmax-temperature.md)
