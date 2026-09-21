---
title: 朴素贝叶斯
lesson_id: ml-math/naive-bayes
prereqs:
  - ml-math/l1l2-regularization-sparsity
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - naive-bayes-classifier
  - conditional-independence
  - laplace-smoothing
applications:
  - spam-filtering
  - text-classification
  - medical-diagnosis
exits:
  - probabilistic-graphical-models
---

# 朴素贝叶斯

## 1. 从一个场景开始

你的邮箱里躺着一封新邮件，标题是"免费赢取百万大奖"。你一眼就认出这是垃圾邮件——因为"免费"和"大奖"这些词你只在垃圾邮件里见过。

但你凭什么这么确信？你的大脑做了一个快速计算：在你过去收到的邮件中，含"免费"的邮件有 90% 是垃圾邮件，含"大奖"的有 95% 是——两个证据叠加，几乎铁证如山。

这就是朴素贝叶斯（Naïve Bayes）的核心思路：**用贝叶斯定理把"看到证据后更新信念"这件事算出来**。"朴素"的意思是假装每个词独立起作用——虽然"免费"和"大奖"可能同时出现并非巧合，但这个简化的假设让计算变得极其高效。

## 2. 直觉解释

想象你是一个法庭上的陪审员。

- **先验**：在看任何证据之前，你认为被告有罪的概率是 10%（因为同类案件的定罪率就是 10%）；
- **证据**：现场发现了被告的指纹（证据 A）；
- **似然**：如果有罪，指纹出现的概率 80%；如果无罪，指纹误匹配的概率 5%；
- **后验**：看到指纹后，你把"有罪"的信念从 10% 更新到——一个更高的数。

贝叶斯定理就是这个"信念更新公式"。朴素贝叶斯把它应用到分类上：给定一堆特征（词频、像素、数值），算出"属于垃圾邮件"和"属于正常邮件"的后验概率，哪个大就归哪类。

"朴素"的简化在于：每看到一个新证据，你都**独立地**乘以它的似然比——好像每个证据是不同证人的独立证词。现实中证据之间可能有关联（"免费"和"大奖"经常一起出现），但这个简化让计算从"指数爆炸"变成了"线性累加"。

## 3. 正式定义

给定特征向量 $x=(x_1,\ldots,x_d)$ 和类别 $y\in\{0,1\}$（二分类），贝叶斯分类器选择

$$\hat{y}=\arg\max_{c\in\{0,1\}}\; P(y=c)\prod_{j=1}^{d}P(x_j\mid y=c)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $P(y=c)$ | 先验概率 | 类别 $c$ 在训练集中出现的频率 |
| $P(x_j\mid y=c)$ | 类条件概率 / 似然 | 类别为 $c$ 时特征 $j$ 取该值的概率 |
| $\prod_j P(x_j\mid y=c)$ | 朴素假设 | 特征之间在给定类别下条件独立 |
| $\hat{y}$ | 预测类别 | 后验概率最大的类 |

取对数把连乘变累加（避免下溢）：

$$\hat{y}=\arg\max_c\;\left[\log P(y=c)+\sum_{j=1}^{d}\log P(x_j\mid y=c)\right]$$

**高斯朴素贝叶斯**：连续特征假设 $P(x_j\mid y=c)=\mathcal{N}(\mu_{jc},\sigma_j^2)$，即每个类别的每个特征服从独立的高斯分布。

**拉普拉斯平滑**：离散特征中某组合从未出现时 $P=0$，整条乘积归零。修补方法是给每个计数加 1：

$$P(x_j=v\mid y=c)=\frac{\text{count}(x_j=v,\,y=c)+\alpha}{\text{count}(y=c)+\alpha\cdot|\mathcal{V}_j|}$$

其中 $\alpha=1$ 是拉普拉斯平滑，$|\mathcal{V}_j|$ 是特征 $j$ 的取值个数。

## 4. 分步例题

**例**：用两个词判断邮件是否为垃圾。训练数据 4 封：垃圾 2 封（含"免费"1 次、含"会议"0 次）、正常 2 封（含"免费"0 次、含"会议"2 次）。新邮件同时含"免费"和"会议"。

1. **先验**：$P(\text{垃圾})=2/4=0.5$，$P(\text{正常})=0.5$；
2. **似然（加拉普拉斯平滑，$\alpha=1$）**：
   - $P(\text{免费}\mid\text{垃圾})=(1+1)/(2+2)=0.5$（垃圾邮件词频表："免费"出现 1 次，总词数 2，加平滑 2 个词）
   - $P(\text{会议}\mid\text{垃圾})=(0+1)/(2+2)=0.25$
   - $P(\text{免费}\mid\text{正常})=(0+1)/(2+2)=0.25$
   - $P(\text{会议}\mid\text{正常})=(2+1)/(2+2)=0.75$
3. **后验（未归一化）**：
   - 垃圾：$0.5\times0.5\times0.25=0.0625$
   - 正常：$0.5\times0.25\times0.75=0.09375$
4. **判定**：$P(\text{正常})>P(\text{垃圾})$——判定为**正常邮件**！
5. **关键洞察**："会议"的证据太强了（正常邮件的标志词），压过了"免费"的垃圾信号。朴素贝叶斯不是简单数票，而是**按证据强度加权投票**。

## 5. 动手实验

### 实验 1（viz）：高斯朴素贝叶斯的决策边界

```viz
{
  "type": "plot",
  "title": "两个类别的高斯似然：蓝=正常，红=垃圾",
  "expr": "exp(-(x-m1)^2/(2*s1^2))/(s1*sqrt(2*3.14159))",
  "expr2": "exp(-(x-m2)^2/(2*s2^2))/(s2*sqrt(2*3.14159))",
  "label": "P(x|正常)",
  "label2": "P(x|垃圾)",
  "xmin": -3,
  "xmax": 8,
  "sliders": [
    { "name": "m1", "min": 0, "max": 5, "step": 0.1, "value": 2 },
    { "name": "s1", "min": 0.5, "max": 3, "step": 0.1, "value": 1 },
    { "name": "m2", "min": 2, "max": 7, "step": 0.1, "value": 5 },
    { "name": "s2", "min": 0.5, "max": 3, "step": 0.1, "value": 1 }
  ]
}
```

怎么玩：拖 $m_1, m_2$ 改变两类的中心位置——两条曲线的交叉点就是决策边界。拖 $\sigma$ 改变方差——方差越大边界越模糊，分类越不确定。这就是高斯朴素贝叶斯在单个特征维度上的几何。

### 实验 2（python）：从零实现垃圾邮件分类器

```python title="朴素贝叶斯分类器：训练+预测+拉普拉斯平滑"
import math

# 训练数据：每封邮件用 [含"免费", 含"会议"] 表示，1=出现 0=未出现
X_train = [[1, 0], [1, 0], [0, 1], [0, 1]]  # 4 封邮件的词频
y_train = [1, 1, 0, 0]                        # 1=垃圾 0=正常

# 统计先验
n_spam = sum(y_train)                          # 垃圾邮件数
n_total = len(y_train)                         # 总邮件数
p_spam = n_spam / n_total                      # 先验：P(垃圾)
p_ham = 1 - p_spam                             # 先验：P(正常)

# 统计似然（带拉普拉斯平滑，alpha=1）
alpha = 1                                      # 拉普拉斯平滑参数
vocab_size = 2                                 # 特征取值个数（0或1）

def count_feature(x_train, y_train, feat_idx, feat_val, label):
    """统计特征 feat_idx 取 feat_val 且类别为 label 的样本数"""
    return sum(1 for x, y in zip(x_train, y_train)
               if x[feat_idx] == feat_val and y == label)

def likelihood(feat_idx, feat_val, label):
    """计算 P(x_j=feat_val | y=label)，带拉普拉斯平滑"""
    count = count_feature(X_train, y_train, feat_idx, feat_val, label)
    total = sum(1 for y in y_train if y == label)  # 该类别的样本总数
    return (count + alpha) / (total + alpha * vocab_size)

# 预测新邮件 [1, 1]（同时含"免费"和"会议"）
new_mail = [1, 1]

# 对数后验（避免连乘下溢）
log_p_spam = math.log(p_spam)                  # log 先验
log_p_ham = math.log(p_ham)
for j in range(2):                             # 遍历每个特征
    log_p_spam += math.log(likelihood(j, new_mail[j], 1))
    log_p_ham += math.log(likelihood(j, new_mail[j], 0))

print(f"P(垃圾) 未归一化: {math.exp(log_p_spam):.5f}")
print(f"P(正常) 未归一化: {math.exp(log_p_ham):.5f}")
print(f"判定: {'垃圾' if log_p_spam > log_p_ham else '正常'}")
```

运行结果：$P(\text{垃圾})\approx0.0625$，$P(\text{正常})\approx0.09375$，判定为**正常**——和手算一致。朴素贝叶斯的"朴素"在这里发挥作用：即使两个词同时出现，我们也是把它们的似然**相乘**而非考虑联合分布。

### 快问快答

```quiz
一封训练集中从未出现过的邮件（所有词都是生词），朴素贝叶斯会怎么处理？
- 直接报错崩溃
- 完全依赖先验概率来判定 [*]
- 随机分类
? 拉普拉斯平滑保证了似然不为零，各特征贡献近似相同，后验退化为先验之比——训练集里谁多就判谁。
```

:::warning[常见误区]

**误区一**："朴素贝叶斯的'朴素'意味着它很弱。" 恰恰相反——在文本分类、垃圾过滤等高维稀疏问题上，朴素贝叶斯的效果常常出人意料地好。条件独立假设虽不成立，但它带来的偏差往往被方差的大幅降低所补偿（偏差-方差权衡的又一个案例）。

**误区二**："似然为零时模型就废了。" 这正是拉普拉斯平滑存在的意义。加 $\alpha=1$ 相当于给每个可能的取值都预设了一个"虚拟样本"，保证没有任何概率被清零。$\alpha$ 本身也可以作为超参数来调。

**误区三**："朴素贝叶斯的概率值可以直接当置信度。" 后验概率通常**过度自信**——独立性假设放大了证据叠加效果。需要可靠概率估计时，还需做校准（第 65 课）。

:::

## 6. 练习

**练习 1**（概念）：如果训练集中正常邮件有 100 封、垃圾邮件只有 5 封，先验概率会对分类结果产生什么影响？朴素贝叶斯的这个特性是优点还是缺点？

<details>
<summary>点开查看逐步解答</summary>

先验 $P(\text{垃圾})=5/105\approx0.048$——除非证据非常强烈，否则分类器倾向于判为正常。类别不平衡时可能漏检垃圾邮件。解决办法：调整先验或降低判垃圾的阈值。
</details>

**练习 2**（判题）：下面的代码想计算似然但忘了加拉普拉斯平滑——修好它让预测正确。

```exercise
# @title: 练习：加上拉普拉斯平滑
# @check: 0.500
# @check: 正常
# @hint: 分母应该加 alpha*vocab_size（即 1*2=2），分子加 alpha（即 1）。
X_train = [[1, 0], [1, 0], [0, 1], [0, 1]]
y_train = [1, 1, 0, 0]
alpha = 1

def likelihood(feat_idx, feat_val, label):
    count = sum(1 for x, y in zip(X_train, y_train)
                if x[feat_idx] == feat_val and y == label)
    total = sum(1 for y in y_train if y == label)
    return count / total                    # ← 错了：没有加平滑

p_spam = 0.5
p_ham = 0.5
new_mail = [1, 1]

lp_s = math.log(p_spam)
lp_h = math.log(p_ham)
for j in range(2):
    lp_s += math.log(likelihood(j, new_mail[j], 1))
    lp_h += math.log(likelihood(j, new_mail[j], 0))

print(round(math.exp(lp_s), 3))
print('垃圾' if lp_s > lp_h else '正常')
```

把 `count / total` 改成 `(count + alpha) / (total + alpha * 2)` 后，输出 `0.500` 和 `正常`——与例题结论一致。没有平滑时 $P(\text{会议}\mid\text{垃圾})=0$，整条乘积直接归零，模型完全忽略了"免费"的垃圾信号。

**练习 3**（选做）：用高斯朴素贝叶斯的公式，手算：$x=3$，类 0 的均值 $\mu_0=1$、方差 $\sigma_0^2=1$，类 1 的均值 $\mu_1=5$、方差 $\sigma_1^2=1$，先验等概率。$x$ 应该归哪类？

<details>
<summary>点开查看逐步解答</summary>

$P(x\mid c=0)=\frac{1}{\sqrt{2\pi}}e^{-(3-1)^2/2}=\frac{1}{\sqrt{2\pi}}e^{-2}\approx0.054$

$P(x\mid c=1)=\frac{1}{\sqrt{2\pi}}e^{-(3-5)^2/2}=\frac{1}{\sqrt{2\pi}}e^{-2}\approx0.054$

先验相同、似然相同——判为**任意一类**，分类器完全不确定。因为 $x=3$ 正好在两类均值的正中间，对称性让天平完全平衡。
</details>

## 7. 选读：从贝叶斯定理到后验概率的推导

<details>
<summary>选读 · 贝叶斯定理的完整推导</summary>

贝叶斯定理是条件概率的直接推论：$P(A\mid B)=P(B\mid A)P(A)/P(B)$。在分类语境下：$P(y=c\mid x)=P(x\mid y=c)P(y=c)/P(x)$。$P(x)$ 对所有类别相同，分类只取决于分子。朴素假设把 $P(x\mid y=c)$ 拆成 $\prod_j P(x_j\mid y=c)$——从 $d$ 维联合分布降为 $d$ 个一维分布的乘积，参数量从指数级降到线性级。
</details>

## 8. 下一站

朴素贝叶斯用概率算距离，下一课换一种完全不同的思路：不建模、不训练，直接看"谁离我最近"——K 近邻分类器，一种连公式都懒得出的"懒惰学习者"。

→ [K 近邻](./62-knn.md)
