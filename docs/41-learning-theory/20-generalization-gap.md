---
title: 训练误差与泛化鸿沟
lesson_id: learning-theory/generalization-gap
prereqs:
  - learning-theory/erm
  - prob/stats
volume: 4
layer: L10
track:
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - generalization-gap
  - train-test-split
applications:
  - machine-learning
exits:
  - data-ai
---

# 训练误差与泛化鸿沟

## 1. 从一个场景开始

一个学生把去年的模拟卷反复做了 100 遍，模拟成绩 99 分；上了考场换了新题，只考了 60 分。机器学习模型天天上演同一出戏：在训练数据上近乎完美，一上线遇到新样本就翻车。

这一课把"失常的那几十分"变成一个可以计算的对象：**训练误差**和**测试误差**之间的差，叫**泛化鸿沟**。我们要看清它从哪来、多大、怎么随样本量缩水。

## 2. 直觉解释

背题的学生脑子里装的是一张**查询表**：见到做过的题，报出背好的答案；没见过的题，只能瞎蒙。

机器也有同款：**记忆器（查表分类器）**把每条训练数据的答案原封不动存下来。它在训练集上必然满分——答案就是它抄的；可新数据里没有它的存货，命中全凭运气。

所以鸿沟的第一来源已经现形：**死记硬背也能拿模拟考高分**。第二来源是运气：手头这批样本总有抽样波动，对它调参调得越狠，越是在拟合波动本身。两个来源指向同一个解药——**更多的数据**：题库覆盖面越大，背题越不划算，波动也越被平均掉。

## 3. 正式定义

沿用上一课的记号：ERM 选出的规则是 $\hat{h}$，损失用 0-1 损失。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $R(\hat{h})$ | 泛化风险 | $\hat{h}$ 在真实分布上的错误率，高考 |
| $\hat{R}(\hat{h})$ | 训练误差 | $\hat{h}$ 在训练集上的错误率，模拟考 |
| $\text{gap}$ | 泛化鸿沟 | 两者之差 $R(\hat{h}) - \hat{R}(\hat{h})$ |

单看一条固定规则的 $\hat{R}(h)$，大数定律保证它贴近 $R(h)$。麻烦出在"挑过的规则"：我们对 $|\mathcal{H}|$ 条候选规则同时比较，总有一条运气特别好。概率论里的 union bound（并集上界）给出一个干净好用的结论：

$$\hat{R}(h) \le R(h) + \sqrt{\frac{\ln(2|\mathcal{H}|/\delta)}{2n}} \quad \text{以至少 } 1-\delta \text{ 的概率对所有 } h \in \mathcal{H} \text{ 同时成立}$$

读法：只要样本量 $n$ 足够大，**库里所有规则**的模拟考成绩都同时不会虚高超过右边那个数。它随 $n$ 按 $1/\sqrt{n}$ 缩水，随库的大小按 $\sqrt{\ln|\mathcal{H}|}$ 缓慢膨胀。

## 4. 分步例题

假设类里有 $|\mathcal{H}| = 1000$ 条规则，取置信水平 $\delta = 0.05$。

1. 代入公式：$\ln(2 \times 1000 / 0.05) = \ln(40000) \approx 10.60$；
2. 当 $n = 100$：$\sqrt{10.60 / 200} = \sqrt{0.053} \approx 0.23$——模拟考成绩可能虚高 23 个百分点，基本不可信；
3. 当 $n = 10000$：$\sqrt{10.60 / 20000} = \sqrt{0.00053} \approx 0.023$——虚高压缩到约 2 个百分点；
4. 样本量扩大 100 倍，界只缩小 10 倍：这就是平方根律的脾气，想精度翻倍得花四倍数据；
5. 注意界几乎不怪罪假设类大小：库扩大 1000 倍（$\ln$ 只从 6.9 涨到 13.8），代价远小于样本量的一次缩水。

## 5. 动手实验

### 实验 1（viz）：泛化界随样本量衰减

```viz
{
  "type": "plot",
  "title": "一致泛化界：n 越大，模拟考越可信",
  "expr": "sqrt(log(2*m/d)/(2*x))",
  "expr2": "0.05",
  "xmin": 30,
  "xmax": 3000,
  "sliders": [
    { "name": "m", "min": 10, "max": 5000, "step": 10, "value": 1000 },
    { "name": "d", "min": 0.05, "max": 1, "step": 0.05, "value": 0.05 }
  ]
}
```

曲线是"模拟考最多虚高多少"；橙色水平线标在 5%，可当作"可信"的门槛。任务卡：(1) 把滑块 `m`（假设类大小）拉满再拉回零头，观察曲线几乎不动——$\ln$ 的功劳；(2) 沿横轴向右读曲线，找到它跌破橙线所需的样本量；(3) 放宽 `d` 到 0.2，看"要求变松"如何立刻换来更小的界。

### 实验 2（python）：记忆器实测——随机标签下的满分与裸考

```python title="给纯噪声贴标签，查表分类器能学到什么"
import random

xs = list(range(40))                     # 40 个输入点：编号 0 到 39
labels = []
for x in xs:
    labels.append(random.randint(0, 1))  # 纯抛硬币贴标签：数据里没有任何规律

cut = 20                                 # 前 20 个当训练集，后 20 个当测试集
train_xs = xs[:cut]
train_ys = labels[:cut]

memory = {}                              # 字典：空的花括号，之后用 memory[键]=值 存取
for i in range(cut):
    memory[train_xs[i]] = train_ys[i]    # 把训练题的标准答案整本抄进小抄

hits = 0
for i in range(cut):
    if memory[train_xs[i]] == train_ys[i]:
        hits = hits + 1
print(f"训练集命中率: {hits / cut}")     # 小抄对暗号，当然满分

hits_new = 0
for j in range(cut, len(xs)):            # range(cut, 末尾)：只考没见过的题
    x = xs[j]
    pred = memory.get(x, 0)              # get：查小抄，查不到就默认蒙 0
    if pred == labels[j]:
        hits_new = hits_new + 1
print(f"新题命中率:   {hits_new / cut}")
```

多跑几次：训练命中率永远是 `1.0`，新题命中率在 `0.5` 上下抖动——数据里根本没有规律，记忆器却交出了完美的模拟考成绩。

### 实验 3（python）：训练规模救不了死记硬背

```python title="不同训练规模下，记忆器的新题表现"
import random
import matplotlib.pyplot as plt

sizes = [10, 40, 160]
test_accs = []
for n in sizes:
    agree = 0
    for trial in range(300):                 # 每种规模重复 300 次取平均
        memory = {}
        for k in range(n):
            memory[k] = random.randint(0, 1)
        x_new = n                            # 一道全新题：编号恰好没见过
        guess = memory.get(x_new, 1)         # 查不到，蒙 1
        answer = random.randint(0, 1)
        if guess == answer:
            agree = agree + 1
    test_accs.append(agree / 300)

plt.bar([str(n) for n in sizes], test_accs, color="steelblue")
plt.axhline(0.5, color="tomato", linestyle="--")
plt.ylim(0, 1)
plt.ylabel("new-question accuracy")
```

三根柱子都贴着红色虚线（瞎蒙线 50%）打转——**训练规模从 10 涨到 160，记忆器在新题上的本事一分未涨**。涨的只是"背下来的题更多了"。这就是过拟合的最赤裸形态。

### 快问快答

```quiz
把测试集看过一遍后，根据结果调整了模型，再看第二遍——此时的测试成绩还公平吗？
- 公平，看的次数不影响分数
- 不公平，测试集已经被用来指导选择了，变成了另一种训练集 [*]
- 只要多测几次取平均就公平了
? 测试集的价值在于"从未参与任何决策"。一旦你根据它的反馈改了模型，信息就从考场漏进了书房——这正是第 40 课交叉验证要制度性防范的事。
```

:::warning[常见误区]

**误区一**：你以为"训练误差为零说明学得好"。查表式记忆器训练误差恒为零；判断学没学会的唯一标准是没见过的数据。

**误区二**：你以为测试集可以反复看。看第一次它是考官，看你照着它改完模型再看第二次时，它已经是你的家教了。

**误区三**：你以为泛化界是平均误差。它是高概率保证："至多这么多、且对全库同时成立"。实际鸿沟常常比界小得多——界是安全网，不是预测值。另外这个简单版界只适用于有限假设类；神经网络的参数空间是天文数字级的连续空间，需要更深的理论（本章后续模块）。

:::

## 6. 练习

**练习 1**：补全记忆器的考试程序。训练命中率已算好；新题那半边还没接上。改到两行输出分别是 `1.0` 和 `0.5`：

```exercise
# @title: 练习：查表分类器的两场考试
# @check: 1.0
# @check: 0.5
# @hint: 新题循环遍历 test_xs，用 memory.get(x, 'A') 取预测（没见过的编号蒙 A），答对计数最后除以 len(test_xs)
train_xs = [1, 2, 3, 4]
train_ys = ['A', 'B', 'A', 'B']
test_xs = [3, 9]              # 一道旧题，一道全新题
test_ys = ['A', 'B']

memory = {}
for i in range(len(train_xs)):
    memory[train_xs[i]] = train_ys[i]

hits_train = 0
for i in range(len(train_xs)):
    if memory[train_xs[i]] == train_ys[i]:
        hits_train = hits_train + 1
print(hits_train / len(train_xs))

hits_test = 0                 # ← 占位：改成"新题命中率"，目标输出 0.5
print(hits_test / len(test_xs))
```

**练习 2**：实验 2 里标签完全是随机的，为什么新题命中率约是 0.5 而不是 0？

<details>
<summary>点开查看逐步解答</summary>

因为记忆器对新题的猜测是固定的（`get` 默认蒙 0 或蒙 1），而新题的真实标签是一枚均匀硬币。固定策略对均匀硬币的长期命中率恰是 50%——这是大数定律的直接后果。值得玩味的是：命中率 0.5 说明"毫无本事"，但训练集上的 100% 让它看起来像天才；鸿沟大到荒谬，正是随机标签实验要揭穿的事。
</details>

## 7. 选读：界里为什么冒出一个 ln

<details>
<summary>选读 · 并集上界的直觉</summary>

对一条**事先指定**的规则 $h$，霍夫丁不等式说：$\hat{R}(h)$ 偏离 $R(h)$ 超过 $\epsilon$ 的概率不超过 $2e^{-2n\epsilon^2}$。但 ERM 是在 $|\mathcal{H}|$ 条规则里挑的，我们关心的命题是"**没有任何一条**规则虚高超过 $\epsilon$"。

坏运气落在任意一条头上都会毁掉这个命题，而互不排斥的坏运气概率会叠加：把 $|\mathcal{H}|$ 条的上界相加（union bound），令总和仍不超过 $\delta$，解出 $\epsilon$ 就得到本课的公式。$\ln|\mathcal{H}|$ 正是"$|\mathcal{H}|$ 个坏运气的叠加税"。指数换对数的交换极其划算——这也是为什么"有限库"的学习理论如此乐观，以及为什么理论家随后花了三十年对付无限库。

无限库的第一个路标叫 **VC 维**：问一个假设类最多能"打碎"几个点。打碎一个点集，意思是这组点能实现的全部正负标法，类里都有规则做到。一维区间能打碎两个点；三个点时会漏掉"两头垃圾、中间正常"这种标法，所以它的 VC 维停在 2。VC 维衡量的不是参数个数，而是假设类能制造独立区分的能力；后续理论会用它替换这里的 $\ln|\mathcal{H}|$，让泛化界的形状继续成立。本课先记住这个直觉即可。

```python title="枚举一维区间能给出的标法"
points = [0, 1, 2]                       # 三个待分类的位置
bounds = [-1, 0.5, 1.5, 2.5, 3.5]        # 区间端点：左闭右开
patterns = []

for left in bounds:
    for right in bounds:
        if left >= right:                # 区间左端必须小于右端
            continue
        pattern = ""
        for point in points:
            if point >= left:
                if point < right:
                    pattern = pattern + "1"   # 字符串拼接：把命中点记成 1
                else:
                    pattern = pattern + "0"
            else:
                pattern = pattern + "0"
        if pattern not in patterns:
            patterns.append(pattern)

print(len(patterns))
print(sorted(patterns))
```

输出是 `7` 种，而不是 $2^3=8$ 种；缺的正是 `101`——两头判垃圾、中间判正常。这就是“三个点打不碎”的具体样子。

</details>

## 8. 下一站

鸿沟讲的是"考不准"；接下来换个角度问：就算考得准，**该选哪种枪法**？稳定地偏左三环的老张，和围绕靶心乱飞一圈的小李——偏差与方差的经典对决。

→ [偏差、方差与不可约误差](./30-bias-variance.md)
