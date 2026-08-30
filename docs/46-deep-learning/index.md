---
title: 第 46 章 · 深度学习基础
description: 从多层感知机和反向传播到初始化、归一化、残差连接与训练稳定性。
volume: 5
layer: L7
track:
  - information-learning
stage: university-core
difficulty: 4
---

# 深度学习基础

深度网络不是简单堆层，而是用复合非线性函数表示复杂关系。本章关注信号如何前传、梯度如何回传，以及哪些结构让深层训练变得可能。

这一章按下面的路线推进，15 门主干全部上线：

1. [神经元、线性层与激活函数](./10-neuron-layer.md)——你的邮箱每秒都在做一道判断题：新来的这封邮件，是垃圾邮件吗？；
2. [万能逼近的几何直觉](./15-universal-approximation.md)——一道道坡坎如何折纸般拼出任意形状；
3. [前向传播：数据流过网络](./20-forward-pass.md)——一张手写数字图片有 … 个像素；
4. [损失函数与梯度下降](./30-loss-descent.md)——洗澡时调水温：手一伸，太烫——往冷拧一点；
5. [计算图与自动微分](./35-computational-graph.md)——把链式法则交给图去机械回扫；
6. [反向传播：梯度的回传流水线](./40-backprop.md)——一台电视机出厂检验不合格；
7. [初始化、对称性与梯度尺度](./45-initialization-symmetry.md)——起跑线画在哪，信号才不炸不灭；
8. [卷积与权值共享](./48-convolution-sharing.md)——同一枚 3×3 小印章盖遍全图，看图的参数账单从 25.6 万瘦身到 1 万；
9. [池化、步长与填充](./49-pooling-stride-padding.md)——三个控制特征图尺寸与感受野的旋钮：切块派代表、窗口跳着走、边缘补一圈 0；
10. [过拟合初见](./50-overfitting.md)——两位同学备考：一位背答案，一位懂方法；
11. [CNN 图像分类：从像素到预测](./51-cnn-classification.md)——把卷积、池化、展平、全连接串成一条流水线：一张图进、一个预测出；
12. [BatchNorm 与 LayerNorm](./55-normalization-layers.md)——给每层装上自动稳压器；
13. [RNN 与 LSTM：把时间卷进网络](./60-rnn-lstm.md)——同一枚权重印章沿时间盖下去，梯度却在连乘里蒸发或爆炸，三扇门救场；
14. [残差连接与深路梯度流](./65-residual-path.md)——给梯度修一条永不塌方的高速路；
15. [学习率调度与训练诊断](./75-lr-diagnostics.md)——读懂仪表盘，在正确的时机换挡。

:::note[生产状态]

12 门主干全部上线（万能逼近 / 计算图与自动微分 / 初始化与对称性 / BatchNorm-LayerNorm / 残差连接 / 学习率调度于 2026-08-27 补齐，卷积与权值共享于 2026-08-28 插入 45 与 50 之间）；「MLP」「反向传播推导」两模块由 10 / 40 号课承载，不再单列。2026-08-28 又在 55 与 65 之间插入《RNN 与 LSTM：把时间卷进网络》（编号 60，序列建模补线，梯度连乘与 LSTM 门控判题链均已实测），并在 48 与 50 之间插入《池化、步长与填充》（编号 49，卷积课的直接续篇，尺寸公式与感受野堆叠判题链均已实测）。2026-08-28 再插《CNN 图像分类：从像素到预测》（编号 51，卷积池化后的图像支线收尾，五段流水线前向与最大池化判题链均已实测）。全章现共 15 门。

:::

## 前置回望

第 13 章的链式法则、第 21 章的矩阵变换、第 43 章的梯度下降和第 45 章的分类损失共同构成主干。

## 计划交互形态

已落地（14 门主干课全部上线）：

- 激活函数实验——拖动 k 看 ReLU 与 sigmoid 的 S 曲线陡峭程度（《神经元、线性层与激活函数》，plot 组件）；
- 矩阵变换可视化——没有激活的一层只会把整个平面拉斜（《前向传播》，matrix 组件）；
- 损失地形拖点寻谷——只许看局部坡度（《损失函数与梯度下降》，contour-map 组件）；
- 链式法则切线对照图（《反向传播》，plot 组件）与最小二乘拟合演示（《过拟合初见》，fit 组件）；
- 卷积核滑动打分与互相关手写实验——双重循环逐格算 9 格加权和 + 参数账单随图像尺寸对账（《卷积与权值共享》，浮窗 Python：纯列表实现 + matplotlib 边缘探测对照图）；
- 保留率指数曲线 s^t 滑块、RNN 前向四步手算对拍与 20 步梯度连乘实测、LSTM 三扇门一帧走账（《RNN 与 LSTM：把时间卷进网络》，plot 组件 + 浮窗 Python）；
- 初始化方差传播、残差连接对比、学习率诊断等实验由浮窗 Python 承载；判题式练习 13 课全覆盖（多数另有选择题）。

待实现：专属的反向传播梯度流动画与残差连接对比训练器，登记择期。

## 实战挑战 · 手写数字识别（4×4 像素极简版）

真实的 MNIST 数据集由 LeCun、Cortes、Burges 于 1998 年从美国国家标准技术研究院（NIST）的手写数字库整理而来：70000 张 28×28 灰度图，是深度学习的"果蝇"。本题情境为教学原创——把它压缩到 4×4 的黑白像素，用本章第 10、20 课的知识就能徒手识别。

模板匹配分类器的规则：给"0"和"1"各存一张标准像（16 个像素的 0/1 列表）；来一张新图，分别数出与两张标准像**逐像素相同**的个数（吻合数），谁高判谁。

一张可疑的新图（疑似"1"，顶部笔画缺失、底部歪斜）已拉平成 16 格：

```exercise
# @title: 实战挑战：4x4 像素版 MNIST
# @check: 3
# @check: 14
# @check: 1
# @hint: 数吻合数的循环照抄第一段；判决打印 0 或 1——比较两个吻合数即可。
u  = [0,0,0,0, 0,1,1,0, 0,0,1,0, 0,0,1,1]   # 待识别图像（已拉平）
t0 = [0,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,0]   # 模板"0"（一个圆环）
t1 = [0,0,1,0, 0,1,1,0, 0,0,1,0, 0,1,1,1]   # 模板"1"

hits0 = 0
for i in range(16):
    if u[i] == t0[i]:
        hits0 = hits0 + 1
print(hits0)          # 与模板"0"的吻合像素数（已示范）

hits1 = 0             # ← 问题在这：照抄上面的循环，统计与模板"1"的吻合数
print()               # ← 问题在这：打印与模板"1"的吻合数

print()               # ← 问题在这：判决——hits 谁大就打印几
```

<details>
<summary>点开查看逐步解答</summary>

与新图逐格比对：模板"0"只有 3 格对上（它期待的大圆环几乎全被打破）；模板"1"对上 14 格——除了缺失的顶笔和挪位的底衬，其余全部吻合。

```python
u  = [0,0,0,0, 0,1,1,0, 0,0,1,0, 0,0,1,1]
t0 = [0,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,0]
t1 = [0,0,1,0, 0,1,1,0, 0,0,1,0, 0,1,1,1]

h0 = sum(u[i] == t0[i] for i in range(16))   # True 当 1 数：布尔值求和即计数
h1 = sum(u[i] == t1[i] for i in range(16))
print(h0)
print(h1)
print(1 if h1 > h0 else 0)
```

输出 `3`、`14`、`1`：判定为"1"。这套"逐像素打分"就是最古老的模板匹配；把打分换成 $w \cdot x + b$ 再让梯度下降学 $w$，就升级成了本章的神经元——MNIST 上真实神经网络能把错误率压到 1% 以下（LeCun et al. 1998 的 LeNet 论文表格），而线性分类器只能到约 12%：多层结构和非线性激活合计带来约 11 个百分点的差距。
</details>

相关课程：[神经元、线性层与激活函数](./10-neuron-layer.md)（加权打分）、[过拟合初见](./50-overfitting.md)（为什么测试集绝不能提前看）。

## 现实挑战 · 图像、语音与 EEG 分类

同一套“特征向量 + 最近模板”的数学，能跨过三种传感器：

- **图像**：4×4 手写数字压成四个区域的墨水密度，判断 0 还是 1；
- **语音**：短命令词提取低/中/高频能量和过零率，判断 no 还是 yes；
- **EEG**：脑电分段估计 delta/theta/alpha/beta 相对功率，判断睁眼还是闭眼。

下面的数值是教学压缩值，不是原始录音或原始脑电；真实系统还要做采样、去噪、标准化和大规模数据验证。但“比较样本离哪个原型更近”这个决策骨架是一样的。

```exercise
# @title: 三种传感器的最近模板分类
# @check: image 1
# @check: speech 0
# @check: eeg 0
# @hint: 对每个特征算差的平方并累加，得到到两个原型的距离；返回距离更近的那一类。
def predict(sample, class0, class1):
    return 0    # ← 问题在这：现在永远猜 0，请改成最近平方距离判决

image        = [0, 3, 1, 7]
image_zero   = [4, 4, 4, 4]
image_one    = [0, 2, 1, 8]

speech       = [2, 5, 6, 4]
speech_no    = [2, 4, 7, 3]
speech_yes   = [7, 4, 2, 5]

eeg          = [6, 6, 3, 7]
eeg_open     = [6, 6, 3, 7]
eeg_closed   = [4, 7, 9, 2]

print("image", predict(image, image_zero, image_one))
print("speech", predict(speech, speech_no, speech_yes))
print("eeg", predict(eeg, eeg_open, eeg_closed))
```

<details>
<summary>点开查看逐步解答</summary>

对每一维计算差值平方再相加，就是最简单的平方欧氏距离；哪边距离小，就判给哪类。

```python
def distance_squared(a, b):
    total = 0
    for i in range(len(a)):
        diff = a[i] - b[i]
        total = total + diff * diff
    return total

def predict(sample, class0, class1):
    if distance_squared(sample, class0) <= distance_squared(sample, class1):
        return 0
    return 1

image      = [0, 3, 1, 7]
image_zero = [4, 4, 4, 4]
image_one  = [0, 2, 1, 8]
speech     = [2, 5, 6, 4]
speech_no  = [2, 4, 7, 3]
speech_yes = [7, 4, 2, 5]
eeg        = [6, 6, 3, 7]
eeg_open   = [6, 6, 3, 7]
eeg_closed = [4, 7, 9, 2]

print("image", predict(image, image_zero, image_one))
print("speech", predict(speech, speech_no, speech_yes))
print("eeg", predict(eeg, eeg_open, eeg_closed))
```

输出依次是 `image 1`、`speech 0`、`eeg 0`。把这里的“手工原型”换成可学习的权重和偏置，再用第 30、40 课的损失和反向传播调整它们，就成了神经网络分类器。
</details>
