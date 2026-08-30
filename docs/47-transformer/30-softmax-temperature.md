---
title: Softmax 与温度
lesson_id: transformer/softmax-temperature
prereqs:
  - transformer/attention-qkv
  - complex/euler
  - information/entropy
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
  - softmax
  - sampling-temperature
applications:
  - text-generation
  - classification-heads
exits:
  - data-ai
---

# Softmax 与温度

## 1. 从一个场景开始

问 ChatGPT"天空为什么是蓝色"，它并不是从数据库里捞出一句标准答案——它的每一步都在**掷骰子**：先给词表里十万个候选词各打一个分，再把分数变成一张概率表，然后按表抽签。"蓝"可能占六成，"青"一成半，"绿"半成……

把任意分数变成合法概率表的机器叫 **softmax**；而控制这张表"独断还是民主"的旋钮，叫**温度**。同一个模型，温度低像老学究句句笃定，温度高像醉汉妙语连珠。

## 2. 直觉解释

softmax 是两步流水线：

1. **指数放大**：每个分数 $s$ 变成 $e^s$。指数是好胜的放大器——分数差 2，指数后差距拉到 $e^2 \approx 7.4$ 倍。负分也没问题：$e^{-1}=0.37$，永远为正；
2. **归一化**：全部相加再逐个去除。于是每个值落在 0 与 1 之间、总和恰好 1——一张标准概率表。

**温度 $T$** 控制放大器的增益：先把分数除以 $T$ 再过指数。$T$ 小（如 0.5）→ 分数被拉大 → 冠军通吃，分布尖锐；$T$ 大（如 2）→ 分数被压平 → 群雄并立，分布平坦。极端情形：$T \to 0$ 退化成"只选最高分"，$T \to \infty$ 均匀乱抽。

## 3. 正式定义

对一组分数 $z_1, \dots, z_n$ 和温度 $T > 0$：

$$\text{softmax}(z)_i = \frac{e^{z_i / T}}{\sum_{j=1}^{n} e^{z_j / T}}$$

| 性质 | 内容 |
| --- | --- |
| 保序 | 分数大的概率仍大；温度只改形状不改排名 |
| 归一 | 所有输出非负且总和恒为 1 |
| 极限 | $T \to 0$ 趋向 one-hot（全押冠军）；$T \to \infty$ 趋向均匀分布 |
| 平移不变 | 全部分数同加常数结果不变（分子分母同乘同一因子） |

第 40 章的熵在这里现身：温度越高分布越接近均匀，**熵越大**；温度越低越确定，熵越小。"模型幻觉"的一种技术表述就是：低温自信地抽中了错误答案。

## 4. 分步例题

**例**：三个候选词得分 $z = (2,\ 1,\ 0)$。

1. $T=1$：指数后 $(e^2, e^1, e^0) = (7.389,\ 2.718,\ 1)$，总和 $11.107$；
2. 归一化：$(0.665,\ 0.245,\ 0.090)$——冠军词拿走三分之二；
3. $T=2$：先减半得 $(1,\ 0.5,\ 0)$，指数 $(2.718,\ 1.649,\ 1)$，总和 $5.367$；
4. 归一化：$(0.506,\ 0.307,\ 0.186)$——排名未动，但差距明显缓和；
5. 结论：**升温不改变谁最热，只改变热得多悬殊**。

## 5. 动手实验

### 实验 1：温度滑块下的冠军概率

```viz
{
  "type": "plot",
  "title": "三个候选 [x, 0, -1] 中冠军的概率随温度变化",
  "expr": "exp(x/t) / (exp(x/t) + 1 + exp(-1/t))",
  "xmin": -2,
  "xmax": 3,
  "sliders": [
    { "name": "t", "min": 0.25, "max": 3, "step": 0.05, "value": 1 }
  ]
}
```

横轴是冠军的原始分数 $x$，纵轴是它被抽中的概率。拖小 $t$：S 曲线陡然立起——分数稍高就几乎必中；拖大 $t$：曲线瘫平——即使领先也未必赢。生成文本的"创造力"旋钮，本体就是这么一条曲线。

### 实验 2：手写 softmax 并对比三种温度

```python title="纯循环版 softmax"
import math
import matplotlib.pyplot as plt

scores = [2.0, 1.0, 0.0]              # 三个候选词的原始分数
words = ["蓝", "青", "绿"]

def softmax(zs, T):
    m = max(zs)                       # 减最大值防溢出：exp(700) 会爆掉
    exps = []
    for s in zs:
        exps.append(math.exp((s - m) / T))
    total = sum(exps)
    return [e / total for e in exps]

for T in [0.5, 1.0, 2.0]:
    probs = softmax(scores, T)
    print(f"T={T}: {[round(p, 3) for p in probs]}")

fig, axes = plt.subplots(1, 3, figsize=(9, 3))   # 一行三张子图
for k in range(3):
    probs = softmax(scores, [0.5, 1.0, 2.0][k])
    axes[k].bar(words, probs)         # 柱状图：类别名配高度
    axes[k].set_title(f"T={[0.5, 1.0, 2.0][k]}")
    axes[k].set_ylim(0, 1)

plt.tight_layout()
```

三张柱状图讲完整个故事：$T=0.5$ 时"蓝"一家独大；$T=2$ 时三家差距缩小。打印行还藏着一个工程细节——先减去最大分数再做指数，防止大分数把浮点数撑爆，这是所有框架里 softmax 的标配姿势。

### 快问快答

```quiz
把温度从 1 升到 10，softmax 输出的排名会改变吗？
- 高分词可能跌到后面
- 排名不变，只是各概率被拉近 [*]
- 所有概率变成相等
? 先除以同一个正数 T 不改变大小顺序，所以排名纹丝不动；变化的只是尖锐程度。想换排名得改分数本身。
```

:::warning[常见误区]

**误区一**："softmax 输出就是真实概率。"——它是模型打分的归一化，反映的是模型的自信而非世界的真相。90% 的自信配上错误的答案，就是所谓的自信幻觉。

**误区二**："温度只影响生成文风，与注意力无关。"——注意力内部的权重同样由 softmax 产生，只是通常固定 $T=1$（另配缩放）；温度作为用户旋钮主要出现在采样阶段。

**误区三**："实现 softmax 直接对原分数求 e 的次方。"——大分数下 `math.exp` 直接溢出崩溃。务必使用"减最大值"技巧：利用平移不变性，结果不变、数值安全。

:::

## 6. 练习

**练习 1**：手算 $z = (1,\ 0)$ 在 $T=1$ 时的 softmax。（提示：$e \approx 2.718$）

<details>
<summary>点开查看逐步解答</summary>

$(e, 1)/(e+1) \approx (0.731,\ 0.269)$。对照 sigmoid：两个候选的 softmax 中，第一项恰好等于 $\sigma(z_1 - z_2)$——二分类时两者是一家。
</details>

**练习 2**：修好这个二选一概率程序：

```exercise
# @title: 练习：补全 softmax
# @check: 0.88
# @check: 0.12
# @hint: 第二个词的概率 = 它的指数 / 总和。两条概率加起来必须正好是 1。
import math   # math.exp 已在第 12 章登场

scores = [2.0, 0.0]     # 两个候选词的分数
T = 1.0                 # 温度

total = math.exp(scores[0]/T) + math.exp(scores[1]/T)   # 分母：指数之和
p0 = math.exp(scores[0]/T) / total
p1 = 0                  # ← 问题在这：第二个词的概率怎么算？

print(round(p0, 2))
print(round(p1, 2))
```

**练习 3**：概念题——写诗机器人该用高温还是低温？医疗问答呢？

<details>
<summary>点开查看逐步解答</summary>

写诗要新颖的搭配与意外意象，宜用较高温度换取多样性；医疗问答宁可平淡也不能出错，宜用低温甚至近似贪心（$T \to 0$），并辅以检索校验。温度的选择本质是在"多样性价值"与"错误代价"之间做权衡。
</details>

## 7. 选读：温度与熵的对偶

<details>
<summary>选读 · 从统计物理借来的名字</summary>

统计物理里，玻尔兹曼分布给出状态 $i$ 的概率正比于 $e^{-E_i / T}$：低温系统冻结在最低能量态，高温系统在诸态间游走。softmax 把能量换成了分数、负号挪进了比较方式，数学骨架完全一致——"温度"这个名字正是直接继承。用信息论的话说：$T \to 0$ 时分布熵趋近 0（零意外），$T \to \infty$ 时熵达到上界 $\log n$（最大意外）。控制温度就是在控制输出的信息量。
</details>

## 8. 下一站

零件到齐：词向量、QKV 打分、softmax 配比。现在把它们组装成 Transformer 的心脏——自注意力，并用纸笔算通一个三词句子。

→ [自注意力手算](./40-self-attention.md)
