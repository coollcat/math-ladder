---
title: CLIP 与多模态对齐：让图文住进同一个坐标系
lesson_id: embeddings/clip-multimodal
prereqs:
  - embeddings/contrastive-triplet
  - transformer/self-attention
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
  - multimodal-alignment
  - contrastive-pretraining
  - zero-shot-classification
applications:
  - image-search
  - vision-language-models
exits:
  - robotics-motion
---

# CLIP 与多模态对齐：让图文住进同一个坐标系

## 1. 从一个场景开始

在相册 App 里输入"海边的狗"，它翻出三年前那张照片——可照片的文件名是 `IMG_2043.jpg`，没有任何文字。系统怎么会知道？图像和文字本是两套语言：像素住在三维数组里，句子住在词序列里，坐标根本不相通。**CLIP**（Contrastive Language-Image Pre-training）做的事只有一件：**把两套语言嵌进同一个向量空间**——让"海边的狗"这张图与这句话，在几何上成为邻居。

## 2. 直觉解释

第 62 课的对比学习已经搭好了半座桥：anchor 拉近正例、推远负例。CLIP 把"正例"定义成**天然配对**：互联网上海量"图片 + 它的说明文字"——图文对是免费的监督信号。

架构是**两座塔**：图像塔（卷积或视觉 Transformer）把图片压成向量，文本塔（Transformer）把句子压成向量，**两座塔的输出维度相同**——同一个房间，从两扇门进。训练规则是一场大型"连连看"：一个批次装 $N$ 对图文，$N$ 张图与 $N$ 句话两两算余弦相似度，得到 $N \times N$ 记分板；**对角线上的真配对拉高分，其余 $N^2 - N$ 个错配全部压低**——一个批次白赚 $N^2$ 个监督信号。

学成之后最惊人的副产品是**零样本分类**：不训练一个新分类器，把每个类名写成句子"a photo of a cat"嵌进空间，图像的向量跟哪句最近，就判它是什么类——第 30 课的最近邻检索，从没见过的类别也照用不误。

## 3. 正式定义

记图像嵌入 $v_i$、文本嵌入 $t_j$（都已归一化），相似度矩阵 $S_{ij} = v_i^{T} t_j$（即余弦相似度）。对称的对比损失（InfoNCE）按行、按列各算一遍交叉熵：

$$L = \frac{1}{2}\left( \sum_i -\log \frac{e^{S_{ii}/\tau}}{\sum_j e^{S_{ij}/\tau}} + \sum_j -\log \frac{e^{S_{jj}/\tau}}{\sum_i e^{S_{ij}/\tau}} \right)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $v_i$ | 图像嵌入 | 图像塔输出的向量（归一化后躺上单位球面） |
| $t_j$ | 文本嵌入 | 文本塔输出的向量 |
| $S_{ij}$ | 相似度矩阵 | 第 $i$ 张图与第 $j$ 句的余弦相似度 |
| $\tau$ | 温度 | 软化 softmax 的旋钮（第 47 章）：越小越"苛刻"，盯着最难区分的错配学 |

按行看：第 $i$ 张图要在 $N$ 句话里认出自己那句；按列看：第 $j$ 句话要在 $N$ 张图里认回自己那张。两座塔被同一份记分板同时拉扯，慢慢把配对的方向捏到一起。

## 4. 分步例题

玩具空间里看一次"连连看"。两张图、两句话，嵌入都在二维：

- 图 $v_1 = [1, 0]$（竖条纹照片），图 $v_2 = [0, 1]$（圆形图案照片）；
- 句 $t_1 = [1, 0]$（"竖条纹"），句 $t_2 = [0, -1]$（"圆形"）。

1. 算相似度矩阵：$S_{11} = 1 \times 1 + 0 \times 0 = 1$；$S_{12} = 1 \times 0 + 0 \times (-1) = 0$；$S_{21} = 0$；$S_{22} = 0 \times 0 + 1 \times (-1) = -1$；
2. 按行读账：图 1 与句 1 相似度 1、与句 2 是 0 → 认领句 1；图 2 与句 1 是 0、与句 2 是 $-1$ → "两害相权取其轻"仍认领句 2；
3. 损失看到的问题：$S_{22} = -1$ 是配对却拿了最低分——梯度会同时推图 2 远离"竖条纹"方向、把句 2 拽向图 2 的方向，直到记分板上对角线最高。

真实 CLIP 做的事一模一样，只是房间从二维换成几百维、$N$ 从 2 换成几万。

## 5. 动手实验

### 实验（python）：一座玩具双塔的对比训练

```python title="玩具双塔：图文对齐的对比训练"
import math
import random
import matplotlib.pyplot as plt

random.seed(3)

pairs = [                                       # 四对"图文"：图与它的话本该同方向
    ([1.0, 0.0], [0.9, 0.1]),                   # 图嵌入, 文本嵌入
    ([0.0, 1.0], [0.1, 0.9]),
    ([-1.0, 0.0], [-0.9, -0.1]),
    ([0.0, -1.0], [-0.1, -0.9]),
]

def unit(v):                                    # 归一化：躺上单位球面（余弦相似度的前提）
    n = math.sqrt(v[0] * v[0] + v[1] * v[1])
    return [v[0] / n, v[1] / n]

def loss_and_matrix(pairs, tau=0.2):            # 对称 InfoNCE + 相似度记分板
    n = len(pairs)
    L = 0.0
    S = []
    for i in range(n):
        row = []
        vi = unit(pairs[i][0])
        for j in range(n):
            tj = unit(pairs[j][1])
            row.append(vi[0] * tj[0] + vi[1] * tj[1])   # 余弦相似度
        S.append(row)
    for i in range(n):
        mx = max(S[i])                          # 稳定 softmax：先减最大值防爆
        Z = 0.0
        for j in range(n):
            Z = Z + math.exp((S[i][j] - mx) / tau)
        L = L - (S[i][i] - mx) / tau + math.log(Z)
    return L / n, S

lr = 0.5                                        # 学习率
history = []
for epoch in range(60):                         # 简化：直接对嵌入本身做梯度式的挪动
    L, S = loss_and_matrix(pairs)
    history.append(L)
    for i in range(len(pairs)):
        vi, ti = pairs[i]
        pull = unit(ti)                         # 拉向自己的配对（教学版：省略完整 softmax 梯度）
        pairs[i] = ([vi[0] + lr * 0.1 * (pull[0] - vi[0]),
                     vi[1] + lr * 0.1 * (pull[1] - vi[1])], ti)
    if epoch % 20 == 0 or epoch == 59:
        print("epoch", epoch, " loss =", round(L, 3))

L, S = loss_and_matrix(pairs)
print("训练后记分板：")
for row in S:
    print([round(x, 2) for x in row])

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(history)
ax.set_xlabel("epoch")
ax.set_ylabel("contrastive loss")
plt.show()
```

怎么玩：损失一路下滑，记分板的对角线（真配对）明显高于非对角——两塔把配对的方向捏齐了。真实的 CLIP 用 4 亿对图文、两座深度网络跑同一套逻辑；玩具里我们直接挪嵌入，省略了"梯度穿过塔"的部分（第 46 课反向传播全权负责）。把 `tau` 调到 1.0 再跑：温度升高，softmax 变"宽容"，损失降得慢——温度决定它盯着谁学。

```quiz
用 CLIP 做"零样本分类"时，分类器是怎么来的？
- 在目标类别上重新训练一个分类头
- 把每个类名写成句子嵌入，看图像向量与哪句最像 [*]
- 随机初始化一个分类器凑合用
? 类名 → 句子 → 文本塔嵌入，分类退化成一次最近邻检索：没见过的新类别照样能用，这正是"零样本"三个字的来历。
```

::::warning[常见误区]

**误区一**："你以为 CLIP 真的'理解'了语言。" 它学到的是**图文共现统计**："a photo of a dog" 常与狗的像素一起出现，所以两团向量靠近。让 CLIP 数图中物体个数、比较左右方位，成绩会骤降——两塔各自编码、只在顶层对点积，细粒度的空间结构没处记账。

**误区二**："你以为提示词随便写。" "dog" 与 "a photo of a dog" 的检索成绩可以差好几个点——训练数据里网图配的多是后者这类完整句子，查询文本要"说训练时它听过的话"。提示工程不是玄学，是对训练分布的体贴。

**误区三**："你以为对齐就是两塔输出维度一样。" 维度一样只是"住进同一间房"；**几何关系对**（配对近、错配远、语义方向可迁移）才是对齐——这靠对比损失一锤一锤敲出来，维度本身一分忙也帮不上。

::::

## 6. 练习

```exercise
# @title: 练习：给图像嵌入找最像的一句话
# @check: 1.0
# @check: 0.8
# @check: -0.32
# @hint: 余弦相似度 = 点积除以两个模长的乘积——"方向是否一致"要除掉长度的影响。
import math

img = [2.0, 1.0]                                # 图像塔输出的嵌入
texts = {                                       # 文本塔输出：三句话的嵌入
    "a photo of a cat": [2.0, 1.0],
    "a photo of a dog": [1.0, 2.0],
    "a photo of a bicycle": [-1.0, 1.0],
}

def norm(v):                                    # 向量模长
    return math.sqrt(v[0] * v[0] + v[1] * v[1])

for name, t in texts.items():
    dot = img[0] * t[0] + img[1] * t[1]
    sim = dot                                   # ← 问题在这：忘除以两个模长的乘积
    print(round(sim, 2))
```

<details>
<summary>点开查看逐步解答</summary>

补上归一化：

```python
    sim = dot / (norm(img) * norm(t))           # 余弦相似度
```

三句话的余弦相似度依次：$1.0$（方向完全一致）、$0.8$、$-0.32$（方向相反，钝角）。初始代码只算点积：$\sqrt5 \approx 2.24$ 的模长混进读数，"cat" 句会读出 $5$——点积衡量"又长又同向"，余弦只问方向。CLIP 的记分板从头到尾只用余弦：嵌入归一化躺上单位球面后，点积才与"像不像"严格同义（第 20 课的教训，在多模态房间里再上了一遍）。检索判案：最像的是"a photo of a cat"。
</details>

**练习 2**：批次 $N = 8$ 的对比训练，一个批次里有几对"真配对"、几对"被推远的错配"？$N$ 翻倍，错配信号涨几倍？

<details>
<summary>点开查看逐步解答</summary>

真配对 $N = 8$ 对（对角线），错配 $N^2 - N = 56$ 对。$N$ 翻倍到 16：错配 $16^2 - 16 = 240$，涨到 4.3 倍（约 $N$ 倍增速）——这就是为什么 CLIP 追求超大批次（几万），每个错配都是免费的负例老师，批次越大，记分板越难、学出的空间越锋利。
</details>

## 7. 选读：从对齐到 VLM，再通向机器人

CLIP 的两塔只在最后相乘，物理上是"各说各话、末尾对表"。视觉语言模型（VLM）再进一步：把视觉塔的输出当作**另一种外语的词元**，直接拼进语言模型的上下文里——图像变成"prompt 的一部分"，语言模型负责生成，于是能问答、能描述、能推理。这条"视觉信息以嵌入形态流入语言模型"的管道再往前一步，输出的就不再只是文字，而是机器人的**动作**——机器人卷最后一课的 VLA（视觉-语言-动作模型），正是这条管道的终点站。

## 8. 下一站

图文对齐给"找资料"装上了语义雷达。下一课把它接进大模型的工作流：先检索、再作答——RAG。

→ [RAG：先查资料再开口](./90-rag-retrieval.md)
