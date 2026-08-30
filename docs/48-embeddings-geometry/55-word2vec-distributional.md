---
title: 词嵌入与分布式语义
lesson_id: embeddings/word2vec-distributional
prereqs:
  - embeddings/cosine-similarity
volume: 5
layer: L11
track:
  - information-learning
  - geometry-space
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - co-occurrence-counting
  - low-rank-factorization-of-corpus
  - negative-sampling
applications:
  - semantic-search
exits:
  - data-ai
---

# 词嵌入与分布式语义

## 1. 从一个场景开始

你在外地咖啡馆想拼一句当地话，掏出手机敲下"我想点一杯……"，输入法的候选栏已经排好了"拿铁、美式、卡布奇诺"。它怎么知道这三个词是一家的？没人给输入法标注过"饮品分类"，它只是读过海量文本。

线索来自语言学家 Firth 那句话：**"观其伴而知其义。"**（You shall know a word by the company it keeps.）"拿铁"总跟"点、喝、杯"同框，"轮胎"总跟"换、爆、气"同框。这一课把这句格言拆成一条真正的生产线：**数共现 → 压缩成向量 → 用它们做算术**——也就是 word2vec 之前世代的算法谱系。

## 2. 直觉解释

想判断两个陌生人是不是一个圈子的，你不用偷听他们聊什么，只要看**他们总跟谁同桌吃饭**。词也一样：所谓上下文，就是词周围半径 $w$ 个位置内的同伴，这个半径叫**滑动窗口**。

生产线一共三站：

1. **数**：把语料从头滚到尾，凡是落在同一个窗口里的词对，就在表格里记一笔——得到一张巨大的**共现计数表**；
2. **压**：这张表的行（或列）就是每个词的初始向量，但表太大且稀疏，用第 21 章的低秩近似思想把它压成紧凑因子——"新瓶装旧酒"式的降维；
3. **学**：2013 年 word2vec 出场，干脆跳过"先造表再压缩"，直接训一个小网络，让每个词同时挂两套向量。

第三站是革命性的提速，但请注意：**它的学习压力仍然是那句话——同框的词，向量要对齐。**

## 3. 正式定义

**共现计数**：设窗口半宽为 $w$，词对 $(i,j)$ 的共现计数

$$C_{ij} = \sum_{t} \; [\text{中心词}_t = i] \times [j \text{ 出现在位置 } t \pm w \text{ 内}]$$

读法：方括号叫**示性函数**，条件成立记 $1$、不成立记 $0$——整个和式就是在数"有多少个以词 $i$ 为中心的位置，其窗口里看见了词 $j$"。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $w$ | 窗口半宽 | 一边各看几个词；$w$ 越大，记下的语义越宏观 |
| $C_{ij}$ | 共现计数 | 词 $i$ 与 $j$ 同框的次数，按句边界截断 |
| $\sigma(x)$ | sigmoid 函数 | $\frac{1}{1+e^{-x}}$，把任意实数压进 $(0,1)$ |
| $k$ | 负例个数 | 每个真实搭配配几个"陪练错误答案" |

**word2vec 的负采样目标**：对真实搭配（中心词 $w$，上下文词 $c$），拉高它们共存的机会、压低随机假搭配的机会：

$$\max \; \log\sigma(\vec v_c \cdot \vec u_w) \;+\; k \cdot \log\sigma(-\vec v_{c'} \cdot \vec u_w), \quad c' \text{ 按噪声分布抽取}$$

$\vec u$ 与 $\vec v$ 是同一词的两套角色向量（中心 / 上下文），训练结束通常取一套当最终词向量。假搭配的抽样分布常取词频的 $\frac{3}{4}$ 次幂——略微提拔生僻词，免得全是"的、了、是"陪跑。

而第二站的"压"，数学上是把计数矩阵 $C$ 分解为两个矮胖矩阵相乘 $C \approx U V^{\top}$，只留最大的 $d$ 个秩——这就是**低秩近似**，SVD 在第 21 章干过的活。

## 4. 分步例题

微型宇宙六件套，约定 $w=2$ 后统计出的（虚构）共现表如下：

|  | 爪子 | 沙发 | 鱼 | 轮胎 | 引擎 |
| --- | --- | --- | --- | --- | --- |
| **猫** | 4 | 2 | 1 | 0 | 0 |
| **狗** | 1 | 3 | 0 | 0 | 1 |
| **汽车** | 0 | 0 | 0 | 5 | 4 |

问："猫"的最近邻是谁？

1. 取行向量：猫 $=[4,2,1,0,0]$，狗 $=[1,3,0,0,1]$，汽车 $=[0,0,0,5,4]$；
2. 点积：猫·狗 $= 4+6+0+0+0=10$；猫·汽车 $=0$；
3. 归一化（上一课的余弦登场）：$\lVert\rVert=\sqrt{16+4+1}\approx 4.58$，
   $\cos(\text{猫},\text{狗})\approx \frac{10}{4.58\times 3.32}\approx 0.66$；
4. 结论：猫与狗同住"宠物区"，汽车孤悬"机械区"——**纯计数没有读到任何语法书，却已复现常识分区。**

至于大名鼎鼎的 king $-$ man $+$ woman：真实流程是把得到的目标向量再做一次余弦最近邻，并且**先把 king、man、woman 三个输入词从候选里踢出去**，queen 才有机会登顶。下一节的实验里你会亲手犯这个"忘踢自己"的错误。

## 5. 动手实验

### 实验 1（viz）：关系是一条通道，两个词各站一头

蓝绿两支箭头各代表一对词之间的"关系通道"。试着把绿箭拖到与蓝箭平行：类比推理成立的条件，就是"男人→女人"和"国王→女王"这两条通道指向同一方向。

```viz
{
  "type": "vecadd",
  "title": "两条关系通道：平行才算同类关系",
  "u": [3, -1],
  "v": [2.4, -0.8]
}
```

### 实验 2（python）：小词典的滑窗共现与近邻查询

```python title="数共现，然后问猫最近的朋友是谁"
import math          # 数学库：这里只用 sqrt 开平方

corpus = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "sat", "on", "the", "rug"],
    ["a", "cat", "and", "a", "dog", "played"],
]
w = 2                 # 窗口半宽：左右各看 2 个词

co = {}               # 共现表：co[i][j] 计数，i j 都是词
def bump(a, b):
    if a not in co:
        co[a] = {}
    co[a][b] = co[a].get(b, 0) + 1    # get(b, 0)：没有计数就默认 0 再加一

for sent in corpus:
    n = len(sent)
    for i in range(n):
        # 窗口范围：下界 max(0, i-w)，上界 min(n-1, i+w)，含两端
        lo = max(0, i - w)
        hi = min(n - 1, i + w)
        for j in range(lo, hi + 1):
            if j != i:
                bump(sent[i], sent[j])    # 有序计数：中心词行记录上下文词

for name in ["cat", "dog"]:
    partners = []
    for ctx in co[name]:
        partners.append(ctx + ":" + str(co[name][ctx]))   # str()：把计数数字转成文字以便拼接
    print(name, "的伙伴 ->", partners)

def dot(a, b):
    s = 0
    for k in range(len(a)):
        s = s + a[k] * b[k]
    return s

VOCAB = ["the", "cat", "sat", "on", "mat", "dog", "rug", "a", "and", "played"]
def row(word):
    # 全部维度对所有词展开，缺失共现补 0，得到稠密行向量
    return [co[word].get(other, 0) for other in VOCAB]

def cosine(u, v):
    nu = math.sqrt(dot(u, u))         # sqrt：平方根，用来求模长
    nv = math.sqrt(dot(v, v))
    return dot(u, v) / (nu * nv)

target = "cat"
best = None
best_val = -2
for cand in VOCAB:
    if cand == target:
        continue                       # 跳过自己：自己跟自己余弦永远是 1
    val = cosine(row(target), row(cand))
    print("cos(cat,", cand, ") =", round(val, 3))
    if val > best_val:
        best_val = val
        best = cand

print("cat 的最近邻 ->", best)
```

跑完会看到 cat 与 dog 的余弦明显领先，"坐"在最像的位置附近。这就是"观其伴"的全部技术含量：**没有人告诉模型谁是什么，同框记录自己长出了语义。**

### 快问快答

```quiz
对目标做 king 减 man 加 woman 之后，取余弦最近邻时为什么必须先剔除这三个输入词？
- 因为输入词的向量太长，会影响程序运行速度
- 因为不剔除的话，得分最高的常常就是 king 本身，答案等于原地踏步 [*]
- 因为 queen 不在词典里，需要腾出位置
? 目标向量本来就在 king 附近区域打转，它的余弦最亲密者经常是自己的成分词。论文的做法正是排除全部输入词后再取第一名——这也是许多"量子速读式吹捧"漏讲的细节。
```

:::warning[常见误区]

**误区一**："你以为负采样的'负'是某种减法运算。" 它指的是训练时给每个真实搭配配上的 $k$ 个**假搭配**充当反面教材，逼着模型学会区分"真同框"与"硬凑对"。采样本身完全按普通随机抽签进行。

**误区二**："你以为共现计数越高越相似，表越大越好。" 高频虚词（"的""了""是"）几乎跟谁都同框，原始计数充满了这类无信息的大数。成熟方案会用 PMI 等加权把"共同出现超出随机预期的部分"才记为正分，再配合截断稀有事件。

**误区三**："你以为 king $-$ man $+$ woman 是万能公式。" 这类算术只在少数高频抽象关系（性别、首都、时态）上相对可靠，属于均值意义下的巧合放大，逐个案都能复现的说法是被夸大的传说。语义方向的适用范围与失效边界，后面讲潜在空间插值时专门清算。

:::

## 6. 练习

**练习 1**：下面是一个现成的共现行向量库，目标是找出"猫"的最近邻。代码能跑，但它一脸认真地回答了一个无聊的问题——查出了"猫"自己。修复它：

```exercise
# @title: 练习：别让最近的邻居是你自己
# @check: 爪子
# @check: 0.966
# @hint: 循环里那个条件想排除的只是 target 自己，现在的写法却把所有其他候选全数请出了场，最后放行的恰恰是不该参加比武的那一位。检查 != 的含义。
rows = {
    "猫":   [4, 2, 1, 0],
    "爪子": [3, 1, 0, 0],
    "沙发": [1, 0, 2, 1],
    "汽车": [0, 0, 3, 5],
}
target = "猫"

def dot(a, b):
    s = 0
    for k in range(len(a)):
        s = s + a[k] * b[k]
    return s

def norm(a):
    return dot(a, a) ** 0.5

best_name = None
best_cos = -2
for name in rows:
    if name != target:        # ← 问题在这：想排除自己，条件却写成了"不是自己就跳过"
        continue
    c = dot(rows[target], rows[name]) / (norm(rows[target]) * norm(rows[name]))
    if c > best_cos:
        best_cos = c
        best_name = name

print(best_name)
print(round(best_cos, 3))
```

**练习 2**：把实验 2 的窗口改成 $w=1$，重新跑一遍。cat 的最近邻变了吗？想一想"窗口变大，记住的语义为什么会变宽"。

<details>
<summary>点开查看逐步解答</summary>

$w=1$ 时每个词只看见贴身邻居：cat 的名单缩成 the、sat（第一句）、a、and（第三句）；dog 的名单是 the、sat（第二句）、a、played（第三句）。两队仍高度重合，cat 与 dog 的余弦反而变得更高——但也更平庸：家具里的 mat、rug 与它们共享几乎所有贴身伙伴，动物区与家居区的边界在数据上开始融化。

规律：**窄窗口记语法亲缘（主谓搭配、固定短语），宽窗口记话题亲缘（同场出席）**。word2vec 类系统常用多档窗口或多个模型对齐这两种粒度。这也是"调参即世界观"的一个例子。
</details>

## 7. 选读：softmax 为什么被负采样救了

<details>
<summary>选读 · 从全词典分类到 k 场小型辨析赛</summary>

word2vec 的原型训练是个巨大的多分类题：给定中心词，在整个词典里猜"哪个上下文词会同框"。词典动辄十万级，每一轮都要对**全体词**算一遍得分再归一化（softmax 的分母），代价天文数字。

负采样的手术刀就此落下：不再问"哪个词是对的"，只问"这一个搭配是真还是假"。每轮抽 1 个正例、$k$ 个按噪声分布抽来的负例，做多场小型二分类 sigmoid 比赛——分母从十万降到 $k+1$。证明这还真是最大似然估计的一门独立方法的学问叫 NCE（噪声对比估计），负采样是它去掉一点理论上衣的工程简化版。

至于为什么噪声分布偏爱词频的 $\frac34$ 次幂：纯词频会被超级高频词霸榜，$\frac34$ 次幂把生僻词的概率温和抬高（例如频率占比 $0.01$ 的词，份额抬到 $0.01^{0.75}\approx 0.032$）。指数本身没有深刻定理背书，是实验扫出来的甜点位——工程史上一贯的诚实。
</details>

## 8. 下一站

共现这条路证明了"无标注也能长出语义"。但对图片、用户、句子来说，哪里来的天然"上下文"？答案是：**没有标签，就自己配对**——拉开相近的、推开无关的。下一课认识现代表示学习的通用引擎：对比学习与 triplet 损失。

→ [对比学习与 triplet 损失](./62-contrastive-triplet.md)
