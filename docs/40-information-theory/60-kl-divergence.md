---
title: KL 散度：不对称的信息距离
lesson_id: information/kl-divergence
prereqs:
  - information/cross-entropy-loss
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
  - kl-divergence
applications:
  - forecast-scoring
  - distribution-matching
exits:
  - data-ai
---

# KL 散度：不对称的信息距离

## 1. 从一个场景开始

上一课结账时，糊涂台的价目表让每个符号平均多付了冤枉钱——那笔"多余账单"我们只当零头记了。信息论不给它当零头：Kullback 和 Leibler 在 1951 年把这笔钱正式命名，**KL 散度**（KL divergence），从此它成了衡量"两个分布差多远"的第一标尺。变分推断、知识蒸馏、策略优化……凡是想让一个分布去模仿另一个分布的地方，都在压低这个数。

但它有个怪脾气：从 A 到 B 和从 B 到 A，量出来的数值不一样。这一课就把这股"不对称劲"掰开看清。

## 2. 直觉解释

想象你带着一张错误的心里地图进入真实世界：世界上真实发生的每件事，按你地图的定价都要重新结一次账——**真事的意外程度 $-\log_2 p_i$ 换成你以为的 $-\log_2 q_i$，单价高了还是低了**。把这个"惊吓偏差"按真实频率加权平均，就是 KL 散度：

> **D(p‖q) = 真实世界的人拿着你的假地图过日子，平均每条消息多吃几比特惊吓。**

两个立竿见影的推论：

- 什么地方都不错的唯一办法是地图画得跟领土一模一样：任何一格偏了都只会添乱，所以 **D ≥ 0，且只在 p = q 时归零**；
- 不对称毫无神秘：拿 q 地图逛 p 领土，错的是"以为很常见的事不常见"；反方向则是"以为罕见的事天天见"。两种地图错的位置不同、吃到的惊吓也不同。

## 3. 正式定义

对同一字母表上的两个分布 $p,q$：

$$D_{KL}(p\,\Vert\,q)=\sum_{i=1}^{n}p_i\log_2\frac{p_i}{q_i}=H(p,q)-H(p)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\Vert$ | 双竖线读法 | 读作"p 相对于 q"，顺序神圣不可交换 |
| $p_i/q_i$ | 定价比 | 你的报价比真实概率贵了几倍 |
| $H(p,q)-H(p)$ | 冤枉钱视角 | 交叉熵减掉理论底价，即上一课的盈余 |
| $D\ge 0$ | Gibbs 不等式 | 只在两分布完全重合处取零 |

三条性格必须一起背：(1) **非负**，取等当且仅当 $p=q$；(2) **不对称**，一般 $D(p\Vert q)\ne D(q\Vert p)$；(3) **不是距离**——三角不等式也不成立，所以教材坚持叫"散度"不叫"距离"。机器学习里的惯例黑话：拟合数据分布用 $D(\text{data}\Vert \text{model})$ 叫前向 KL，让模型去猜数据叫反向 KL，两者最优解的性格完全不同——这是不对称性换来的自由。

## 4. 分步例题

**例**：继续沿用上一课的账本：真实 $p=(0.125,0.5,0.125,0.25)$，价目表 $q=(0.5,0.25,0.125,0.125)$。

1. 正向逐格结账：$\frac{p_i}{q_i}$ 依次为 $\frac14,\ 2,\ 1,\ 2$；
2. 逐项乘权：$0.125\times(-2)+0.5\times1+0.125\times0+0.25\times1$；
3. 注意中间混进了负项！单个格子可能"标贵了"贡献负惊喜，加总依然为正：$-0.25+0.5+0+0.25=0.5$ 比特；
4. 用恒等式复核：上节课已算出 $H(p,q)=2.25$、$H(p)=1.75$，差恰为 $0.5$ ✓；
5. 反向再来一遍 $D(q\Vert p)$：$0.5\times2+0.25\times(-1)+0+0.125\times(-1)=0.625$ 比特——同一个账本的两个方向，一个是 0.5，一个是 0.625，**连差值本身都精确可验：$0.625-0.5=0.125$**。不对称不是近似误差，是真金白银的性格差异。

## 5. 动手实验

### 实验 1（viz）：谷底、陡壁与傻距离参照线

```viz
{
  "type": "plot",
  "title": "D(a‖x) 的山谷与绝对差 |x-a| 的直线参照",
  "expr": "a*log(a/x)/log(2)+(1-a)*log((1-a)/(1-x))/log(2)",
  "expr2": "abs(x-a)",
  "xmin": 0.02,
  "xmax": 0.98,
  "sliders": [
    { "name": "a", "min": 0.05, "max": 0.95, "step": 0.05, "value": 0.3 }
  ]
}
```

横轴是你的假设分布给出的概率，纵轴是散度。拖动滑块观察三件事：谷底永远在 $x=a$（说实话最便宜）；曲线两侧都向上翘但不镜像——$a$ 越偏离 0.5，两边陡缓差距越大；绿色直线 $|x-a|$ 这条"小学生距离"看着对称美观，可它在两端全无威慑力：预测概率压到 0.01 而 truth 是 0.9 时，直线只走了 0.89 格，KL 已冲上天际。**惩罚过度自信，正是 KL 比"差的绝对值"高级的原因。**

### 实验 2（python）：一张账本，三种算法，两个方向

```python title="KL 的三种算法对照与双向差异"
import math   # 数学函数库

world = [0.125, 0.5, 0.125, 0.25]      # 真实分布 p（甲乙丙丁）
belief = [0.5, 0.25, 0.125, 0.125]     # 心里的价目表 q

def cross_entropy(p, q):               # 上节课的老朋友，原样搬来
    total = 0
    for i in range(len(p)):
        if q[i] > 0:                   # 价目表该格开过价才有钱可收
            total = total - p[i] * math.log2(q[i])
    return total

def entropy(p):
    total = 0
    for i in range(len(p)):
        if p[i] > 0:
            total = total - p[i] * math.log2(p[i])
    return total

def kl_direct(p, q):                   # 直接照定义式算：sum p*log(p/q)
    total = 0
    for i in range(len(p)):
        if p[i] > 0:                   # 真实里不会发生的事件不结账
            total = total + p[i] * math.log2(p[i] / q[i])
    return total

ab_id = cross_entropy(world, belief) - entropy(world)
ba_id = cross_entropy(belief, world) - entropy(belief)
print(f"恒等式 H(p,q)-H(p)：D(world||belief) = {round(ab_id, 3)}")
print(f"直接定义式同题复算      = {round(kl_direct(world, belief), 3)}")
print(f"调转枪口 D(belief||world) = {round(kl_direct(belief, world), 3)}")
print(f"两个方向相差           = {round(kl_direct(belief, world) - ab_id, 3)}")
```

两条路线在正向严丝合缝地给出 0.5（这正是 $D=H(p,q)-H(p)$ 的数值验证），调转方向却得到 0.625——最后一行的 0.125 就是不对称性的实物标本。顺手改改 `belief` 让它更接近 `world`：两个方向的数值都会缩水，且**永远同号向零收拢**，这条性质下一节的判题练习还会用到。

### 快问快答

```quiz
如果算出 D(p‖q) 恰好等于 0，下列哪个结论必然成立？
- p 与 q 都是均匀分布
- p 与 q 完全相同 [*]
- q 至少有一格概率为 0
? 散度的全部质量只能来自偏差，一步不偏才够得着零。而"都是均匀分布"只是并列的特殊情形之一，不是必然条件。
```

:::warning[常见误区]

**误区一**："你以为 KL 就是两点间直线的聪明版本。" 它不对称、不满足三角不等式，单位还是比特而非长度。更像"从起点出发爬这座坡有多费劲"——换个起点，坡就换了形状。

**误区二**："你以为 $D(p\Vert q)\approx D(q\Vert p)$ 至少差不多。" 本课实测差了 0.125，而且分布越偏斜差距越大。训练 GAN 之类别纠结为何换了个方向结果大变样——数学早就在公式里写明了。

**误区三**："你以为程序跑出负数只是浮点噪声。" KL 在数学上保证非负，见到负值九成是把方向或权重抄反了。负的散度是最好的实现体检报警器，别浪费它。

:::

## 6. 练习

**练习 1**：把本课的直接定义式亲手实现一遍。下面的代码能跑，但方向贴反了——改到通过：

```exercise
# @title: 练习：方向对了才算数
# @check: 0.5
# @check: 0.625
# @hint: kl(world, belief) 度量"按 world 发生的事逐一结账"——加权要用 world 的份额，比值的分子也必须是 world。
import math   # 数学函数库

world = [0.125, 0.5, 0.125, 0.25]
belief = [0.5, 0.25, 0.125, 0.125]

def kl(correct, claimed):
    total = 0
    for i in range(len(correct)):
        if correct[i] > 0:
            total = total + claimed[i] * math.log2(claimed[i] / correct[i])   # ← 问题在这：权重和分子都用了 claimed
    return total

print(kl(world, belief))
print(kl(belief, world))
```

<details>
<summary>点开查看判题参考实现</summary>

```python
import math   # 数学函数库

world = [0.125, 0.5, 0.125, 0.25]
belief = [0.5, 0.25, 0.125, 0.125]

def kl(correct, claimed):
    total = 0
    for i in range(len(correct)):
        if correct[i] > 0:
            total = total + correct[i] * math.log2(correct[i] / claimed[i])
    return total

print(kl(world, belief))
print(kl(belief, world))
```

正确的顺序：`p 相对于 q` = 拿 $p$ 加权、拿 $p/q$ 取对数。两个方向分别给 0.5 和 0.625——它们不相等本身就是答案的一部分。

</details>

**练习 2**：构造对称巧合：$p=(0.8,0.2)$ 对 $q=(0.2,0.8)$ 时两个方向的散度都是 1.2。这说明 KL 其实是对称的吗？

<details>
<summary>点开查看逐步解答</summary>

不能以孤例定法则。这一对的每格比值恰好互为倒数、且权重呈镜像，负项正项两两配对抵消，纯属结构的巧合。本课主线的 $(p,q)$ 已经给出 0.5 对 0.625 的实锤反例。教训：判断"是否对称"要看代数结构（$p_i\log_2(p_i/q_i)$ 里 p 兼任权重与分子），不是挑几个样本试试手感。

</details>

**练习 3**：垃圾邮件过滤器最初把"促销、发票、中奖"三类词的真实出现频率估得过高。从 KL 的角度解释为什么这类偏差会让系统"风声鹤唳"，以及为什么补采集几万封正常邮件能让它安静下来。

<details>
<summary>点开查看逐步解答</summary>

过滤器心里的分布 q 把常 occurring 于垃圾邮件的词压得太重，真实分布 p 则证明这些词偶尔也在正常邮件里露脸。按真实频率结账，正常邮件每封都在"惊讶溢价"上交税——误杀率居高不下。补充真实语料就是在修正 q 使其贴合 p：每一格偏差缩小，$D(p\Vert q)$ 随之下降， filter 的"心理预期"回归现实，自然不再草木皆兵。整个更新过程就是一个朴素的散度最小化工程。

</details>

## 7. 选读：Gibbs 不等式的两行证明

<details>
<summary>选读 · 一条切线性质就够了</summary>

取自然对数情形，用一条几乎肉眼可见的不等式：对任意 $t>0$，$\ln t\le t-1$（曲线 $\ln t$ 在 $t=1$ 处的切线之下爬行）。把它用在 $t=q_i/p_i$ 上并乘 $p_i$ 求和：$\sum p_i\ln(q_i/p_i)\le\sum p_i(q_i/p_i-1)=\sum q_i-\sum p_i=0$。移项立得 $\sum p_i\ln(p_i/q_i)\ge0$——这就是 Gibbs 不等式，取等的唯一途径是每条切线等号同时成立，即所有 $q_i=p_i$。换个底数只差常数因子，结论照旧。顺带一提：1951 年 Kullback 与 Leibler 写下这篇文章时，目的本是给统计学找一个"判别信息量"的度量；七十年后它成了深度学习的每日口粮，论文标题里那个"information"至今仍在收取利息。

</details>

## 8. 下一站

到目前为止我们的镜头一直对着"错误"：错误的价目表、错误的地图。现在把镜头转九十度——两个**都没错**的变量之间，到底共享了多少情报？"知道 Y 之后 X 少了几分惊讶"，这个天然的问题有一个漂亮的答案：互信息。

→ [互信息](./70-mutual-information.md)
