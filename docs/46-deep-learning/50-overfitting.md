---
title: 过拟合初见
lesson_id: deep-learning/overfitting
prereqs:
  - deep-learning/backprop
  - ml-math/overfitting
volume: 5
layer: L7
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - overfitting
  - train-test-split
applications:
  - model-evaluation
exits:
  - data-ai
---

# 过拟合初见

## 1. 从一个场景开始

两位同学备考：

- **甲**把三年模拟题的每道题答案**背得滚瓜烂熟**，模拟卷次次满分；
- **乙**只总结了一套朴素的解题套路，模拟卷 70 分。

上了考场，题目全是新的：甲当场傻眼只拿了 20 分，乙稳稳拿下 80。第 45 章已给过拟合与验证集下了正式定义；本课在神经网络语境里**亲手制造一次过拟合并当场抓获**——毕竟深度网络是全世界最勤奋的"背诵者"，参数够多时它能一字不差地记住训练集，连数据里的噪声一起。

## 2. 直觉解释

模型的"记性"叫**容量**：

- 容量太小（直线模型拟合弯曲的数据）：训练、考试都差——这叫**欠拟合**，属于没学会；
- 容量适中：抓住趋势、忽略噪声，两边都好；
- 容量太大（能穿过每个点的曲线）：把噪声也当规律背下来——训练分满分，考试分崩盘，这就是**过拟合**。

判断标准只有一个：**看没见过的数据上的表现**。所以手头数据必须劈成两半——训练集负责教，测试集负责考，考试卷绝不允许提前泄露。

## 3. 正式定义

| 概念 | 定义 |
| --- | --- |
| 训练误差 | 模型在训练集上的损失/错误率 |
| 测试误差（泛化误差） | 在从未参与训练的数据上的表现 |
| 过拟合 | 训练误差低而测试误差明显更高 |
| 正则化 | 给损失加"复杂度罚金"，抑制参数走极端 |
| 早停 | 监控验证误差，一旦回升就停止训练 |

第 41 章偏差–方差分解告诉我们：过拟合对应低偏差、高方差——模型对训练样本的具体取值过于敏感。深度网络容量天然巨大，过拟合不是"会不会"而是"何时发生"的问题。

## 4. 分步例题

**例**：两位天气预报员比武。甲的记忆法：把去年 365 天每天的天气全部背下（训练准确率 100%），预测新一天时只能瞎蒙（今年实测 30%，跟抛硬币差不多）。乙的单特征规则：只看云量，多云报阴雨（去年 70%，今年 65%）。

1. 甲：训练 100%，测试 30%，落差 70 个百分点 → 教科书式过拟合；
2. 乙：训练 70%、测试 65%，落差仅 5 个点 → 学到的是真规律；
3. 结论：**比较落差，而不是只看训练分**。甲的训练分更高，却是更差的预报员。

## 5. 动手实验

### 实验 1：拖动数据点，体会"趋势派"的克制

```viz
{
  "type": "fit",
  "title": "最小二乘直线：抓趋势，不追噪声",
  "n": 7
}
```

拖动任意一个点上下乱跑，直线只是微微点头，不会疯狂追随——这是容量小的美德。想象换成一条可自由弯折的九次曲线，它会精确穿过每个点（含你制造的噪声），训练误差归零、换批数据立刻翻车。

### 实验 2：记忆型模型 vs 规律型模型

```python title="最近邻查表 vs 一条趋势线"
import random                     # 随机数在第 0 章引入
import matplotlib.pyplot as plt

random.seed(20)
def true_rule(x):
    return 2.0 * x                # 世界背后的真实规律

train_x = [k * 0.5 for k in range(12)]            # 训练输入
train_y = [true_rule(x) + random.uniform(-1, 1) for x in train_x]   # 带噪声的答案

test_x = [0.3 + k * 0.47 for k in range(10)]      # 测试输入：刻意与训练集错开
test_y = [true_rule(x) + random.uniform(-1, 1) for x in test_x]

# 模型 A：死记硬背（最近邻查表：谁离得近就抄谁的答案）
def memorizer(qx):
    best_i, best_d = 0, abs(train_x[0] - qx)
    for i in range(len(train_x)):
        d = abs(train_x[i] - qx)
        if d < best_d:
            best_d = d
            best_i = i
    return train_y[best_i]

# 模型 B：学趋势（闭式解的最小二乘斜率与截距，第 21 章的老朋友）
sx = sum(train_x)
sy = sum(train_y)
sxx = sum(x * x for x in train_x)                 # sum 配推导式：列表元素求和
sxy = sum(train_x[i] * train_y[i] for i in range(len(train_x)))
n = len(train_x)
slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
intercept = (sy - slope * sx) / n

def avg_err(model, xs, ys):                       # 平均绝对误差
    total = 0.0
    for i in range(len(xs)):
        total += abs(model(xs[i]) - ys[i])
    return total / len(xs)

print(f"记忆型 A —— 训练 {avg_err(memorizer, train_x, train_y):.2f} / 测试 {avg_err(memorizer, test_x, test_y):.2f}")
print(f"趋势型 B —— 训练 {avg_err(lambda v: slope*v+intercept, train_x, train_y):.2f} / 测试 {avg_err(lambda v: slope*v+intercept, test_x, test_y):.2f}")
print(f"学到的斜率 {slope:.2f} 截距 {intercept:.2f}（真实规律是 y=2x）")

xs = list(train_x) + list(test_x)
plt.scatter(train_x, train_y, label="train")
plt.scatter(test_x, test_y, marker="x", label="test")
plt.plot(xs, [slope * v + intercept for v in xs], color="green", label="model B")
plt.legend()
plt.grid(True)
```

在这组随机种子下，模型 A 的训练误差精确为 0（它连噪声都抄下来了），测试误差约为 $0.71$；模型 B 的训练、测试误差约为 $0.41$ 和 $0.64$。B 的测试成绩只小幅更好，但落差约 $0.23$，明显小于 A 的 $0.71$，而且学到的斜率 $1.93$ 接近真实规律 2。**比较落差和规律是否稳定，而不是只看训练分**。

### 快问快答

```quiz
训练误差持续下降、验证误差却先降后升，这说明什么？
- 学习率太小
- 从拐点起模型开始过拟合 [*]
- 数据集太大
? 验证误差回升说明模型在往"背训练细节"的方向走。这正是早停法的依据：在拐点附近收手。
```

:::warning[常见误区]

**误区一**："参数多必然过拟合。"——不一定。现代超大网络配合早停、正则化、大数据常常既深又准；真正危险的是**参数多而数据少且不看验证集**的组合。

**误区二**："过拟合了就该删掉一半数据。"——方向反了！增大数据量才是解药之一；删数据只会让模型更依赖背诵。其他解药：正则化、早停、数据增强、换更小容量的模型。

**误区三**："在测试集上反复调参没关系。"——用测试集调参等于提前看考卷，它会悄悄泄漏成新的过拟合。规范做法再劈一份验证集用于调参，测试集只在最后开一次封。

:::

## 6. 练习

**练习 1**：某模型训练误差 0.02、测试误差 0.31；另一模型训练 0.15、测试 0.17。谁是更值得上线的那个？为什么？

<details>
<summary>点开查看逐步解答</summary>

选第二个。第一个落差 0.29（严重过拟合），第二个落差 0.02 且绝对成绩更好。上线看的是**未来数据的预期表现**，测试误差才是它的代理指标。
</details>

**练习 2**：算出两位"考生"的模拟–真题正确率落差，并判断谁在过拟合：

```exercise
# @title: 练习：量化过拟合
# @check: 80.0
# @check: -10.0
# @hint: 落差 = 模拟正确率 - 真题正确率。乙真题比模拟还稳，落差会是负数。
acc_a_mock = 20 / 20 * 100    # 甲：模拟题全对（%）
acc_a_real = acc_a_mock       # ← 问题在这：这是照抄模拟成绩——真题其实只对了 2 道（共 10 道）
acc_b_mock = 14 / 20 * 100    # 乙：模拟对 14 道
acc_b_real = 8 / 10 * 100     # 乙：真题对 8 道

gap_a = acc_a_mock - acc_a_real
gap_b = acc_b_mock - acc_b_real

print(round(gap_a, 1))
print(round(gap_b, 1))
```

甲的落差高达 80 个百分点——标准的过拟合画像；乙为负说明其能力稳定甚至超常发挥。

**练习 3**：给实验 2 的记忆型模型支招：至少说两条让它测试成绩改善的办法。

<details>
<summary>点开查看逐步解答</summary>

①增加训练数据：密密麻麻的样本让"最近邻"永远落在真实规律附近；②给它降容量或加正则：比如限制它只能用直线（就是模型 B）；③集成平均：多个随机扰动版本的平均预测能抵消单点的噪声记忆。
</details>

## 7. 选读：双下降——容量故事的现代反转

<details>
<summary>选读 · 当模型大到离谱</summary>

经典 U 形曲线说：容量超过某个甜点后测试误差上升。但 2019 年前后的研究发现，当参数量大到**远超样本数**（如现代大语言模型）并充分训练后，测试误差会再次下降——这条"双下降"曲线动摇了"越大越糟"的传统直觉。一种解释：超大模型有足够冗余去找到既拟合数据又平滑的解（隐式正则化）。教训：容量与泛化的关系比教科书曲线更微妙，但"必须盯住验证误差"这条纪律从未失效。
</details>

## 8. 下一站

至此你已握住深度学习的主干：神经元 → 前向传播 → 损失下山 → 反向回传 → 泛化警戒线。现在把第 48、49 课的卷积与池化组装起来，看一张图如何从像素一路走到"它是几"的预测。

→ [CNN 图像分类：从像素到预测](./51-cnn-classification.md)
