---
title: 交叉熵与对数损失：说错话的代价
lesson_id: information/cross-entropy-loss
prereqs:
  - information/entropy
volume: 4
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cross-entropy
  - log-loss
applications:
  - weather-forecast-scoring
  - ml-classification-loss
exits:
  - data-ai
---

# 交叉熵与对数损失：说错话的代价

## 1. 从一个场景开始

还记得压缩那课的定价规则吗？拿到一份频率表，就按 $-\log_2 q_i$ 给每个符号定单价——频率表越准，账单越省。现在设想一个倒霉的分拣员：他手里的价目表是照着**去年的**包裹统计做的，而今年的世界变了。

月底一结账：真实出现的每个符号，都按那张过期的价目表收了钱。这份"拿错误的频率给真实的世界记账"的总账单，就是**交叉熵**（cross-entropy）。机器学习里每天被优化几亿万次的**对数损失**（log loss），正是它换了个马甲：预测分布就是模型的价目表，真实标签就是这个世界。

## 2. 直觉解释

交叉熵回答一个问题：**用你以为的分布 q 去伺候真实分布 p 的世界，平均每条消息要付多少比特？**

把价目表类比说完：

- 价目表和世界完全吻合（q = p）：每件商品都按"理想价"成交，总账单就是世界的熵 $H(p)$——理论最低消费；
- 价目表错位：便宜货标了天价、热门货标了地板价。常见的东西天天挨宰，罕见的东西偶尔也挨一笔大的——账单必然变厚；
- 最笨的均匀价目表（什么都说一样可能）：二选一的世界里恒付 1 比特，多一分冤枉钱都跑不掉。

注意惩罚是**不对称**的：低估一件高频商品的稀缺性，天天都在亏；高估低频商品的风险只偶尔兑现。所以同一张错表的害处取决于它错在哪格——这正是"对真实分布加权平均"这件事的含义。

## 3. 正式定义

真实分布为 $p_1,\ldots,p_n$，模型/假设分布为 $q_1,\ldots,q_n$，则**交叉熵**定义为：

$$H(p,q)=-\sum_{i=1}^{n} p_i \log_2 q_i$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $p_i$ | 真实分布 | 世界实际的发生频率，求期望以它为权 |
| $q_i$ | 假设分布 | 你贴出的价目表，单价是 $-\log_2 q_i$ |
| $H(p,q)$ | 交叉熵 | 拿错码表干活的平均码长/平均罚金 |
| $H(p)$ | 熵 | 价目表完全正确时的最低账单 |

两条铁律值得背下来：(1) **恒有 $H(p,q)\ge H(p)$**，当且仅当 $q=p$ 取等——瞎编的价目表只会更贵；(2) 二分类单样本的对数损失公式：

$$\text{loss} = -(y\log_2 q + (1-y)\log_2(1-q))$$

其中 $y\in\lbrace 0,1\rbrace$ 是真实标签、$q$ 是模型给出的正类概率——标签对上哪个档位，就只收那一档的钱（另一项自动归零）。

## 4. 分步例题

**例**：某地天气只有晴、雨、雪三态，真实气候频率 $p=(0.5,\ 0.25,\ 0.25)$。糊涂台的长期预报单是 $q=(0.25,\ 0.25,\ 0.5)$，精准台则与气候一致。

1. 先算世界的底价：$H(p)=0.5\times1+0.25\times2+0.25\times2=1.5$ 比特；
2. 给糊涂台记账：晴报价 2 比特、雨报价 2 比特、雪报价 1 比特，$H(p,q_{糊})=0.5\times2+0.25\times2+0.25\times1=1.75$ 比特；
3. 结出冤枉钱：$1.75-1.5=0.25$ 比特/天——不多，但乘上一年就是 91 比特的纯浪费；
4. 对照精准台：$H(p,p)=H(p)=1.5$ ✓ 触底。再看看二元特例：真猫样本上模型只敢喊"猫概率 0.25"，罚金 $-\log_2 0.25=2$ 比特——越是确定地说错话，单笔罚得越狠。

## 5. 动手实验

### 实验 1（viz）：谷底永远在"说实话"的位置

```viz
{
  "type": "plot",
  "title": "对数损失随预报 q 变化：真实下雨概率为 a 时谷底在 x=a",
  "expr": "-(a*log(x)/log(2)+(1-a)*log(1-x)/log(2))",
  "xmin": 0.02,
  "xmax": 0.98,
  "sliders": [
    { "name": "a", "min": 0.05, "max": 0.95, "step": 0.05, "value": 0.3 }
  ]
}
```

横轴是预报员嘴里的下雨概率，纵轴是真实概率为 $a$ 时的平均对数损失。拖动滑块改变真实气候：整条 U 形曲线跟着平移，**但谷底始终钉在 x=a**——无论你多想让曲线配合你，最省钱的策略永远是说实话。这个性质叫"诚实鼓励"（proper scoring），对数损失因此成了评分天气预报和训练神经网络的共同标准。

### 实验 2（python）：两个预报员的月度对账单

```python title="30 天天气的模拟月账"
import random   # 随机库：抽签模拟每天的真实天气
import math     # log2 在这里

random.seed(7)                  # 固定随机种子：每次运行复现同一份月历
true_p = [0.5, 0.25, 0.25]      # 真实气候频率：晴 / 雨 / 雪
stations = [
    ("糊涂台", [0.25, 0.25, 0.5]),
    ("精准台", [0.5, 0.25, 0.25]),
]

def draw_weather():
    r = random.random()         # random.random()：生成 [0,1) 内的小数
    acc = 0                     # 轮盘游标：累加各天气的概率占比
    for i in range(len(true_p)):
        acc = acc + true_p[i]
        if r < acc:
            return i
    return len(true_p) - 1      # 浮点兜底：边界情况归最后一格

bills = []                      # 收集两个台的总账单，画图用
for name, table in stations:
    total = 0                   # 本月罚金累加器
    for day in range(30):
        w = draw_weather()
        total = total - math.log2(table[w])   # 当天按该台的价目表扣钱
    bills.append(total)
    print(f"{name} 月账单 {round(total, 2)} 比特，日均 {round(total / 30, 2)}")

import matplotlib.pyplot as plt
plt.bar(["糊涂台", "精准台"], bills)
plt.axhline(30 * 1.5, color="red", linestyle="--")   # axhline：画一条水平参考线（红色虚线 = 理论底线）
```

红虚线是理论底线 $30\times1.5=45$ 比特：糊涂台稳稳地悬在它上方，精准台贴线飞行（随机波动让它偶尔越线半比特）。月复一月，"每符号贵零点几比特"就会滚成看得见的差距。

### 快问快答

```quiz
某分类器每题都蒙对（准确率满分），但置信度清一色 0.51。它的平均对数损失大约是多少？
- 接近 0，全对了嘛
- 约 1 比特 [*]
- 约 51 比特
? 罚金是负对数：-log2(0.51) 约 0.974，每题都要交近 1 比特的模糊税。准确率看不见这份税，但对数损失看得见——它量的从来不是对错，而是把握。
```

:::warning[常见误区]

**误区一**："你以为答对了就不该收费。" 准确率眼里 51% 和 99% 是一样的"对"，对数损失却在区分底气。0.99 的把握答错一次罚约 6.6 比特，是 0.6 把握答错的十倍以上——损失函数逼模型学会谦虚。

**误区二**："你以为输出概率凑个 0 或 1 更干脆。" $\log_2 0$ 发散到无穷：把话说死的人只要翻车一次就直接破产。工程实现一律加极小量 ε 保命（概率截断在 $\lbrack \varepsilon, 1-\varepsilon\rbrack$ 里），这不是胆小，是对数损失的数学性格。

**误区三**："你以为交叉熵是个对称的距离。" $H(p,q)\ne H(q,p)$：价目表归谁写，账差得很远。给它做对称化手术是下一课的事，先记住它天生偏科。

:::

## 6. 练习

**练习 1**：四个符号的真实频率为 甲 0.125、乙 0.5、丙 0.125、丁 0.25；糊涂台把它们报成 甲 0.5、乙 0.25、丙 0.125、丁 0.125。下面的代码能跑但账算反了——改到通过：

```exercise
# @title: 练习：谁的权重，谁的单价
# @check: 2.25
# @check: 1.75
# @check: 0.5
# @hint: 循环里两个下标分工不同：p[i] 是世界真实的份额，负责加权；-log2(q[i]) 才是该符号的单价。现在两个角色串了戏。
import math   # 数学函数库

world = [0.125, 0.5, 0.125, 0.25]     # 真实分布 p
priced = [0.5, 0.25, 0.125, 0.125]    # 预测的价目表 q

def cross_entropy(p, q):
    total = 0
    for i in range(len(p)):
        total = total - q[i] * math.log2(p[i])   # ← 问题在这：拿着价目表当权重，拿着世界当价格
    return total

def entropy(p):
    total = 0
    for i in range(len(p)):
        total = total - p[i] * math.log2(p[i])
    return total

ce = cross_entropy(world, priced)
h = entropy(world)
print(ce)
print(h)
print(ce - h)
```

<details>
<summary>点开查看判题参考实现</summary>

```python
import math   # 数学函数库

world = [0.125, 0.5, 0.125, 0.25]
priced = [0.5, 0.25, 0.125, 0.125]

def cross_entropy(p, q):
    total = 0
    for i in range(len(p)):
        total = total - p[i] * math.log2(q[i])   # 按 p 加权，按 -log2(q) 计价
    return total

def entropy(p):
    total = 0
    for i in range(len(p)):
        total = total - p[i] * math.log2(p[i])
    return total

ce = cross_entropy(world, priced)
h = entropy(world)
print(ce)
print(h)
print(ce - h)
```

交叉熵永远"以真实者为权、以假设者计价"；这组数字全是 2 的幂搭出来的精确值：$H(p,q)=2.25$、$H(p)=1.75$、盈余恰 0.5 比特。

</details>

**练习 2**：两条二分类测试样本：第一条真标签是"猫"，模型给猫概率 0.25；第二条真标签是"非猫"，模型给猫概率 0.5。手算各条损失与平均值。

<details>
<summary>点开查看逐步解答</summary>

第一条：$-\log_2 0.25=2$ 比特；第二条取非猫一侧：$-\log_2(1-0.5)=1$ 比特。平均 $(2+1)/2=1.5$ 比特。注意第二条"只给了对方一半可能"其实答得不坏，仍要交整整 1 比特——对数损失只认概率质量落在哪一边，不问最终判词。

</details>

**练习 3**：医院部署一个肺炎筛查模型。为什么宁可微调到多数输出 0.8 左右，也不允许它输出整整 1.0？

<details>
<summary>点开查看逐步解答</summary>

设某天来了一个罕见的假阴性病例：若模型曾以 1.0 自信排除，这一条的罚金是 $-\log_2 0$ 发散——单次事故在理论上不可承受，实测里表现为数值爆炸、梯度失控。把概率压在 0.8~0.98 区间等于买保险：边际罚金换极端免疫。行业里的标签平滑、概率截断都是这道保险的不同保额。

</details>

## 7. 选读：为什么偏偏是对数损失

<details>
<summary>选读 · 诚实鼓励不是巧合而是唯一解</summary>

固定真实分布 p 看交叉熵 $H(p,q)=E_p\lbrack-\log_2 q\rbrack$：要让期望罚金最小，就要让 $E_p\lbrack\log_2 q\rbrack$ 最大。而对数函数的图像永远压在自己切线的下方（凹性），于是任何不均匀的 q 都会"平摊吃亏"：$E_p\lbrack\log_2 q\rbrack\le\log_2 E_p\lbrack q\rbrack=\log_2 1=0$，等号只在 q=p 处成立。换句话说，对数标尺下谎言的平均期望必然为正——这是无数种可用的打分规则里几乎唯一的"说了实话绝不后悔"设计。统计学家古德与杰恩斯上世纪五六十年代把它确立为评分规则理论的基石，后来它化名 log loss 登陆 Kaggle 与深度学习框架，出生证明落款仍是香农的那一页。

</details>

## 8. 下一站

交叉熵超出熵的那部分冤枉钱（本例里的 0.25 和 0.5 比特）在信息论里有个专属户口：KL 散度。它把"两个分布差多少"变成一个数，却顽固地拒绝当距离——偏科到底。下一课就去验明它的正身。

→ [KL 散度](./60-kl-divergence.md)
