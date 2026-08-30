---
title: 自注意力手算
lesson_id: transformer/self-attention
prereqs:
  - transformer/softmax-temperature
  - transformer/attention-qkv
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
  - self-attention
  - scaled-dot-product-attention
applications:
  - large-language-models
exits:
  - data-ai
---

# 自注意力手算

## 1. 从一个场景开始

前三课的零件各自能干一件事：词向量给语义坐标，QKV 派出三个分身，softmax 把分数变配比。现在把它们组装成一台完整的机器——**自注意力**（self-attention）。

"自"的含义：句子里的每个词**同时**发起查询、提供键与价值，全体互相打分。一次运算之后，每个词都换上了一个"吸收过全句语境"的新表示——"它"知道自己指谁，"苹果"知道自己是水果还是公司。这一课我们用纸笔算通一个三词句子，再用纯循环复现。

## 2. 直觉解释

把一句话想成一个**圆桌会议**：

1. 每位与会者发三张卡：问题卡 $q$（我想了解什么）、标签卡 $k$（我擅长什么话题）、内容卡 $v$（我能贡献的干货）；
2. 每个人拿自己的问题卡去跟所有人的标签卡配对打分（点积），再按配比把大家的内容卡**加权抄录**；
3. 散会后每人手里多了一份融合了全场智慧的笔记——这就是词的新表示。

注意会议是**全员同时**进行的：没有先后顺序，没有循环网络那种逐词排队——这正是 Transformer 训练能大规模并行的原因。

## 3. 正式定义

一行公式写尽自注意力：

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left( \frac{QK^{\mathsf T}}{\sqrt{d_k}} \right) V$$

| 符号 | 形状 | 含义 |
| --- | --- | --- |
| $Q$ | $n \times d_k$ | 全体查询向量按行堆叠 |
| $K$ | $n \times d_k$ | 全体键向量按行堆叠 |
| $V$ | $n \times d_v$ | 全体价值向量按行堆叠；$d_v$ 可不同于 $d_k$ |
| $QK^{\mathsf T}$ | $n \times n$ | 所有两两点积：打分表 |
| $\sqrt d$ | 标量 | 缩放因子：$d_k$ 大时点积方差大，不除会 softmax 饱和 |
| softmax 按行 | — | 每个 query 对全句的配比，行内总和为 1 |

## 4. 分步例题

**例**：句子「猫 追 球」。设 $d_k = 4$（缩放因子 $\sqrt 4 = 2$）、$d_v = 2$。"追"这一行的计算：

1. 打分：$\vec q_{追}$ 与三个键分别点积得 $(6,\ 2,\ 4)$——验证一格：若 $\vec q_{追} = (1, 2, 0, 1)$、$\vec k_{猫} = (2, 2, 1, 0)$，则 $1 \times 2 + 2 \times 2 + 0 + 0 = 6$ ✓；
2. 缩放：除以 2 得 $(3,\ 1,\ 2)$——不缩的话 6 这个分数已让 softmax 接近独断；
3. 配比：softmax$(3, 1, 2)$：指数为 $(20.09,\ 2.72,\ 7.39)$，总和 $30.19$，归一化得 $(0.665,\ 0.090,\ 0.245)$；
4. 加权汇总价值向量：$\vec v_{猫} = (1, 2)$、$\vec v_{追} = (0, 1)$、$\vec v_{球} = (3, 0)$：

$$\text{output}_{追} = 0.665\,(1, 2) + 0.090\,(0, 1) + 0.245\,(3, 0) = (1.40,\ 1.42)$$

"追"的新表示里，猫的贡献最大——动作词最关心的当然是施动者与受动者。其余两行同法炮制，得到完整的 $3 \times 3$ 注意力矩阵和三个新表示。

## 5. 动手实验

### 实验 1：缩放旋钮与冠军概率

```viz
{
  "type": "plot",
  "title": "拖动维度 d_k：缩放决定 softmax 是否独断",
  "expr": "exp(x/sqrt(d)) / (exp(x/sqrt(d)) + exp(2/sqrt(d)) + exp(4/sqrt(d)))",
  "xmin": 0,
  "xmax": 8,
  "sliders": [
    { "name": "d", "min": 1, "max": 16, "step": 1, "value": 4 }
  ]
}
```

横轴是“猫”得到的原始点积分，另外两个候选固定为 2 和 4；滑块是查询/键维度 $d_k$。把 $d_k$ 拖到 4 时，原始分 6 经过 $\sqrt{d_k}=2$ 缩放后正好对应正文中的 66.5% 冠军份额；再把 $d_k$ 拖大，曲线变得更平——这正是大维度必须除以 $\sqrt{d_k}$ 的直观理由。

### 实验 2：纯循环版自注意力

```python title="三词句子的完整自注意力"
import math

words = ["猫", "追", "球"]
Q = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]   # 每行一个词的查询
K = [[1.0, 0.0], [0.5, 0.5], [0.0, 1.0]]   # 键
V = [[1.0, 2.0], [0.0, 1.0], [3.0, 0.0]]   # 价值
scale = math.sqrt(2)                        # sqrt：平方根；本例 d=2

def softmax_row(scores):
    m = max(scores)                         # 防溢出的减最大值技巧
    exps = []
    for s in scores:
        exps.append(math.exp(s - m))
    total = sum(exps)
    return [e / total for e in exps]

attn = []                                   # 注意力权重矩阵
for i in range(3):                          # 第 i 个词发起查询
    row_scores = []
    for j in range(3):                      # 对第 j 个词的键打分
        s = (Q[i][0]*K[j][0] + Q[i][1]*K[j][1]) / scale
        row_scores.append(s)
    attn.append(softmax_row(row_scores))

for i in range(3):
    print(words[i], [round(w, 2) for w in attn[i]])

out_cat = [0.0, 0.0]                        # 猫的新表示：按第一行配比加权价值
for j in range(3):
    out_cat[0] += attn[0][j] * V[j][0]
    out_cat[1] += attn[0][j] * V[j][1]
print("猫的新表示:", [round(v, 2) for v in out_cat])
```

三层嵌套循环就是全部复杂度：打分、归一、加权。真实模型把这个三重循环换成两次大矩阵乘法交给 GPU——数学一模一样。

### 实验 3：注意力热力图

```python title="把注意力矩阵画成热力图"
import math
import matplotlib.pyplot as plt

# 每个代码块独立运行，这里先快速重建注意力矩阵
words = ["猫", "追", "球"]
Q = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
K = [[1.0, 0.0], [0.5, 0.5], [0.0, 1.0]]
attn = []
for i in range(3):
    scores = [(Q[i][0]*K[j][0] + Q[i][1]*K[j][1]) / math.sqrt(2) for j in range(3)]
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    t = sum(exps)
    attn.append([e / t for e in exps])

plt.imshow(attn, cmap="viridis")     # imshow：把二维列表当图像渲染
plt.colorbar(label="weight")
plt.xticks(range(3), words)          # xticks/yticks：给刻度贴文字标签
plt.yticks(range(3), words)
plt.xlabel("被看的词 (Key)")
plt.ylabel("发起方 (Query)")
```

每行颜色加起来恒为 1（行归一的视觉证据）。亮块=强关注。盯着图看：哪个词在主导全场？哪一对词几乎互不理睬？真实大模型的注意力图正是这样读的，只是行列变成几千个 token。

### 快问快答

```quiz
为什么点积打分后要先除以根号 d_k 再 softmax？
- 让结果变成整数
- 防止维度大时点积过大，softmax 进入饱和区失去梯度 [*]
- 节省计算时间
? d 维独立随机向量点积的方差正比于 d。不缩放则高分悬殊、softmax 输出接近 one-hot，梯度近乎为零，训练停滞。
```

:::warning[常见误区]

**误区一**："注意力矩阵是对称的。"——错。$i$ 看 $j$ 用的是 $\vec q_i \cdot \vec k_j$，而 $j$ 看 $i$ 是 $\vec q_j \cdot \vec k_i$，两组点积毫无理由相等："我看你"与"你看我"本来就是两回事。

**误区二**："softmax 按整张矩阵归一。"——按**行**归一：每一行是一个查询对全句的配比，行内和为 1；不同行之间无关。

**误区三**："有了自注意力就万事俱备。"——它有个致命盲区：把「狗咬人」和「人咬狗」的词向量集合打乱顺序喂进来，打分结果完全相同！注意力天然**排列不变**，位置信息必须额外注入——下一课的使命。

:::

## 6. 练习

**练习 1**：§4 中若去掉缩放直接对 $(6,\ 2,\ 4)$ 做 softmax，配比会怎样变化？心算量级即可。

<details>
<summary>点开查看逐步解答</summary>

指数差从 $e^{3-1}$ 变成 $e^{6-2}=e^4$：冠军份额暴涨到约 87%（原 66.5%）。缩放本质是给 logits 降温——除以 $\sqrt d$ 就是把分布从"独断"拉回"理性"。
</details>

**练习 2**：补完"追"的输出向量计算：

```exercise
# @title: 练习：算完输出向量
# @check: [0.665, 0.09, 0.245]
# @check: 1.4
# @check: 1.42
# @hint: out_y 与 out_x 的算法相同，只是把 V 下标的第一个数字换成 1（取各价值向量的第二个分量）。
import math

scaled = [3.0, 1.0, 2.0]                       # 缩放后的打分
V = [[1.0, 2.0], [0.0, 1.0], [3.0, 0.0]]       # 三个词的价值向量

weights = []
for s in scaled:
    weights.append(math.exp(s))                # 指数化，还没归一

total = weights[0] + weights[1] + weights[2]
weights = [round(w / total, 3) for w in weights]
print(weights)                                 # 注意力配比

out_x = weights[0]*V[0][0] + weights[1]*V[1][0] + weights[2]*V[2][0]
out_y = 0                                      # ← 问题在这：照抄上一行，V 的第一个下标改成 1
print(round(out_x, 2))
print(round(out_y, 2))
```

**练习 3**：概念题——因果语言模型（如 GPT）生成第 100 个词时，为什么只允许前 99 个位置参与注意力？

<details>
<summary>点开查看逐步解答</summary>

训练目标是预测"下一个词"，若能看到未来就会作弊（答案就在输入里）。实现上把注意力矩阵的上三角（未来位置）掩成负无穷，softmax 后那些位置的权重恰为 0——称为因果掩码。BERT 这类双向模型不做此限制，所以它擅理解而不擅续写。
</details>

## 7. 选读：多头注意力——开几桌并行圆桌会

<details>
<summary>选读 · 子空间分工</summary>

一组 QKV 只能捕捉一种关系模式。多头注意力把 $d$ 维空间切成若干份，每份独立跑一套自注意力（一张"头"），最后拼接线性融合。实践发现不同头自发分工：有的盯相邻词（局部语法），有的追踪长距离指代，有的对齐 rare 词。数学上是把一次 $d$ 维注意力换成 $h$ 次 $(d/h)$ 维注意力，总算力几乎不变而表达的关系种类翻倍。
</details>

## 8. 下一站

机器还剩最后一个盲区：它不知道谁在前谁在后。怎么在不破坏并行性的前提下，把"座位号"缝进词向量里？答案是一组优雅的正弦波。

→ [位置编码](./50-positional-encoding.md)
