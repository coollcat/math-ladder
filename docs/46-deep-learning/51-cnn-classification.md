---
title: CNN 图像分类：从像素到预测
lesson_id: deep-learning/cnn-classification
prereqs:
  - deep-learning/convolution-sharing
  - deep-learning/pooling-stride-padding
  - deep-learning/overfitting
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
  - cnn-architecture
  - flatten-layer
  - logits
applications:
  - computer-vision
  - image-classification
exits:
  - data-ai
---

# CNN 图像分类：从像素到预测

## 1. 从一个场景开始

第 46 章开篇的实战挑战里，我们靠"逐像素比对模板"识别手写数字——来一张新图，数它和模板"0""1"各有几格一样，谁多判谁。这套方法简单，却有个致命伤：数字**挪一格、斜一点、笔画粗细变一点**，逐像素比对的吻合数就崩了。模板匹配像拿一张固定的描红纸去罩，罩歪了就全错。

真正能扛住这些变化的方案，是把前两课的零件——**卷积**（48 课）和**池化**（49 课）——组装成一条完整的流水线，末端再接上熟悉的神经元打分。这条流水线有个名字：**卷积神经网络**（CNN，Convolutional Neural Network）。本课就把这条流水线从头到尾走通一遍：一张图进去，一个"它是几"的预测出来。

## 2. 直觉解释

CNN 分类是一条**五段流水线**，每段只做一件事：

| 段 | 动作 | 类比 | 出身 |
| --- | --- | --- | --- |
| ① 卷积 | 用几枚小核滑过全图，各提取一种局部图案（竖边、横边、角……） | 派不同特长的侦探分头巡逻 | 48 课 |
| ② 池化 | 把特征图切成小块，每块只留最强响应，图变小 | 选区投票，只留代表 | 49 课 |
| ③ 展平 | 把二维特征图拉成一维向量 | 把一桌散落的卡片收拢成一摞 | 本课 |
| ④ 全连接 | 神经元对整条向量做加权打分 | 裁判看完所有证据下总分 | 10 课 |
| ⑤ 输出 | 把分数翻译成"预测哪个类" | 宣布判决 | 本课 |

关键认知：**卷积和池化负责"把图读成几根有用的证据"**，**全连接负责"根据证据下判决"**。前半段省参数、抗平移，后半段做决策——两者分工，缺一不可。

## 3. 正式定义

**展平**：把 $H \times W$ 的特征图按行首尾相接，变成一个长度 $H \cdot W$ 的向量：

$$x = [\,f_{00},\ f_{01},\ \dots,\ f_{0,W-1},\ f_{10},\ \dots,\ f_{H-1,W-1}\,]$$

**全连接打分**（每个类别一条）沿用第 10 课的神经元：

$$z_c = w_c \cdot x + b_c$$

这里 $z_c$ 是"图像属于第 $c$ 类"的原始得分，深度学习里叫它 **logit**（逻辑值）。

**判决**：二分类时直接比较两个 logit，谁大判谁：

$$\hat y = \begin{cases} 0 & z_0 \ge z_1 \\ 1 & z_0 < z_1 \end{cases}$$

| 符号 | 含义 |
| --- | --- |
| $f_{ij}$ | 池化后特征图第 $i$ 行第 $j$ 列的响应 |
| $x$ | 展平后的一维向量（长度 $H \cdot W$） |
| $w_c$ | 类别 $c$ 的权重向量（与 $x$ 等长） |
| $z_c$ | 类别 $c$ 的 logit |
| $\hat y$ | 最终预测的类别编号 |

想读成"概率"而非裸分数？把两个 logit 送进 sigmoid（第 10 课见过的那条 S 曲线）就得到 0 到 1 之间的自信度；多分类则用 softmax 把 $k$ 个 logit 归一成一张概率表——那台机器第 47 章会正式登场。

## 4. 分步例题

识别一张 **6×6 的小图**：判断它是"竖线"（第 0 类）还是"横线"（第 1 类）。图上第 3 列全亮：

```
0 0 1 0 0 0
0 0 1 0 0 0
0 0 1 0 0 0
0 0 1 0 0 0
0 0 1 0 0 0
0 0 1 0 0 0
```

**① 卷积**：用 48 课那枚"左扣右加"的 3×3 竖边缘核扫它（stride=1，无填充），得到 4×4 特征图。竖条右侧的窗口打 $+3$、压着竖条的窗口打 $0$、左侧的窗口打 $-3$——每一行都是 `3, 0, -3, 0`：

$$F = \begin{pmatrix} 3 & 0 & -3 & 0 \\ 3 & 0 & -3 & 0 \\ 3 & 0 & -3 & 0 \\ 3 & 0 & -3 & 0 \end{pmatrix}$$

**② 池化**：2×2 最大池化，步长 2。每块取最大：

$$\begin{pmatrix} 3 & -3 \\ 3 & -3 \end{pmatrix} \xrightarrow{\text{取每块最大}} \begin{pmatrix} 3 & 0 \\ 3 & 0 \end{pmatrix}$$

左上块 $\lbrace 3,0,3,0\rbrace$ 取最大得 $3$；右上块 $\lbrace -3,0,-3,0\rbrace$ 取最大得 $0$；下两行同理。

**③ 展平**：两行首尾相接：

$$x = [3,\ 0,\ 3,\ 0]$$

**④ 全连接**：两个类别的权重分别是 $w_0=(1,0,1,0)$（竖线类只盯第 0、2 位）、$w_1=(0,1,0,1)$（横线类只盯第 1、3 位）：

$$z_0 = 1\cdot3 + 0\cdot0 + 1\cdot3 + 0\cdot0 = 6,\qquad z_1 = 0 + 1\cdot0 + 0 + 1\cdot0 = 0$$

**⑤ 输出**：$z_0 = 6 > z_1 = 0$，预测 $\hat y = 0$——竖线，正确。竖边缘的强响应 $3$ 恰好落进了"竖线类权重"盯着的槽位，而横线类盯着的槽位里全是 $0$，于是高分与低分一眼分明。

## 5. 动手实验

### 实验 1：跑通前两段——卷积出特征图

```python title="6×6 竖线图过 3×3 竖边缘核"
img = []                       # 空列表：先备好，再逐行填充
for r in range(6):             # range(6) 给出 0..5 六个行号
    row = []
    for c in range(6):         # 每行 6 列
        row.append(1 if c == 2 else 0)   # 条件表达式：第 2 列取 1，其余列取 0
    img.append(row)            # append 把整行接进图像

ker = [[-1, 0, 1],             # 3×3 竖边缘核：左列扣分、右列加分
       [-1, 0, 1],
       [-1, 0, 1]]

def corr2d(img, ker):          # def 自定义函数：互相关（48 课的原班机器）
    out_h = len(img) - len(ker) + 1        # 有效起点数 = 边长 − 核边长 + 1
    out_w = len(img[0]) - len(ker[0]) + 1
    out = []
    for i in range(out_h):
        row = []
        for j in range(out_w):
            acc = 0            # 累加器：本窗口总分先归零
            for u in range(len(ker)):
                for v in range(len(ker[0])):
                    acc += ker[u][v] * img[i + u][j + v]
            row.append(acc)
        out.append(row)
    return out

feat = corr2d(img, ker)
for row in feat:               # for 直接遍历列表：逐行亮出特征图
    print(row)
```

四行 `[3, 0, -3, 0]`——和 §4 手算一字不差。

### 实验 2：跑通后三段——池化、展平、打分、判决

```python title="最大池化 + 展平 + 全连接 + argmax 判决"
def maxpool2d(feat):           # 2×2 最大池化，步长 2
    h = len(feat)              # 特征图的高
    w = len(feat[0])           # 特征图的宽（第 0 行的长度）
    out = []
    for i in range(0, h, 2):   # range(0, h, 2)：从 0 到 h，每步跳 2
        row = []
        for j in range(0, w, 2):
            m = feat[i][j]     # 先假设左上角最大
            for di in range(2):
                for dj in range(2):
                    if feat[i + di][j + dj] > m:   # 若遇到更大的就换
                        m = feat[i + di][j + dj]
            row.append(m)
        out.append(row)
    return out

pooled = maxpool2d(feat)
flat = pooled[0] + pooled[1]   # 展平：两行列表相加 = 首尾相接

w = [[1, 0, 1, 0],             # 竖线类的权重
     [0, 1, 0, 1]]             # 横线类的权重
logits = [0, 0]                # 两个类别的 logit，先归零
for c in range(2):             # c：类别 0、1
    for k in range(4):         # k：展平向量的下标 0..3
        logits[c] += w[c][k] * flat[k]    # 加权累加：w·x 的手写版

print("展平向量:", flat)                    # [3, 0, 3, 0]
print("两个得分:", logits)                  # [6, 0]
print("预测类别:", 0 if logits[0] >= logits[1] else 1)   # 三元表达式：谁大判谁
```

输出 `预测类别: 0`。把 `img` 造图那行的 `c == 2` 改成 `r == 2`（横线图），竖边缘核再扫——特征图几乎全 0，两个得分都低，判决失去了底气。这正是"一枚核只认一种图案"的体现：想同时认出横线，就得再配一枚横线核（把核换成三行 `[1, 1, 1]`、`[0, 0, 0]`、`[-1, -1, -1]`）。

### 快问快答

```quiz
CNN 里"展平"这一步，把 4×4 的特征图变成了什么？
- 一个 4×4 的矩阵
- 一条长度 16 的一维向量 [*]
- 一个 4 维向量
? 展平按行首尾相接，把 H×W 的图拉成 H·W 长的一维向量，这样全连接层才能用 w·x 对它打分。
```

## 6. 常见误区

:::warning[常见误区]

- **"CNN 最后一定要接 softmax。"** 不一定。二分类用 sigmoid 或直接比 logit 也行；softmax 是多分类（$k \ge 3$）时的标准归一化，第 47 章见。
- **"池化只是为了让图变小，能省就省。"** 池化不止缩图：最大池化取"局部最强响应"，带来一点平移不变性——图案在窗口里小幅度挪动，最强响应还在，判决就稳。这是模板匹配求之不得的。
- **"全连接层是 CNN 的累赘。"** 卷积负责找特征、全连接负责综合决策，两者分工不同。现代网络也常用全局平均池化替代分类头的大全连接，但"把特征汇总成判决"这一步始终要有。

:::

## 7. 练习

**练习 1**：下面这段"池化 + 分类"能跑但池化取错了值，导致得分全错。病灶只有一处，修到输出 `3 0`、`3 0`、`6 0`、`0` 为止：

```exercise
# @title: 修好取错值的最大池化
# @check: 3 0
# @check: 3 0
# @check: 6 0
# @check: 0
# @hint: "最大"池化留的是窗口里的最大值；现在的比较方向恰好反了。
feat = [          # 卷积后的 4×4 特征图：竖边缘检测器的输出
    [3, 0, -3, 0],
    [3, 0, -3, 0],
    [3, 0, -3, 0],
    [3, 0, -3, 0],
]

pooled = []
for i in range(0, 4, 2):          # i、j 每次跳 2，切出不重叠的 2×2 块
    row = []
    for j in range(0, 4, 2):
        m = feat[i][j]
        for di in range(2):
            for dj in range(2):
                if feat[i + di][j + dj] < m:   # ← 问题在这：池化要留"最大"值
                    m = feat[i + di][j + dj]
        row.append(m)
    pooled.append(row)

print(pooled[0][0], pooled[0][1])   # 池化第一行
print(pooled[1][0], pooled[1][1])   # 池化第二行

flat = pooled[0] + pooled[1]        # 展平：两行首尾相接

w = [[1, 0, 1, 0],                 # 竖线类权重：只盯第 0、2 位
     [0, 1, 0, 1]]                 # 横线类权重：只盯第 1、3 位

logits = [0, 0]
for c in range(2):
    for k in range(4):
        logits[c] = logits[c] + w[c][k] * flat[k]

print(logits[0], logits[1])         # 两个得分
print(0 if logits[0] >= logits[1] else 1)   # 预测类别
```

<details>
<summary>点开查看逐步解答</summary>

病灶在池化的比较方向：`< m` 留下的是窗口里**最小**值，2×2 窗口 $\lbrace 3,0,3,0\rbrace$ 会捞出 $0$、$\lbrace 0,-3,0,-3\rbrace$ 会捞出 $-3$，展平后变成 $[0,-3,0,-3]$，两个得分都算错。

```python
if feat[i + di][j + dj] > m:   # 改成 > ：遇到更大的值才更新，留下最大值
    m = feat[i + di][j + dj]
```

改完：池化得 $\begin{pmatrix}3&0\\3&0\end{pmatrix}$，展平 $[3,0,3,0]$，$z_0 = 6$、$z_1 = 0$，预测 $0$——输出恰为 `3 0`、`3 0`、`6 0`、`0`。这就是 §4 手算的完整复现。

</details>

**练习 2**：思考题——把练习 1 里的"竖线类权重"和"横线类权重"互换，判决会变成什么？这说明权重向量在分类里扮演什么角色？

<details>
<summary>点开查看逐步解答</summary>

互换后 $z_0 = 0\cdot3 + 1\cdot0 + 0\cdot3 + 1\cdot0 = 0$、$z_1 = 1\cdot3 + 0\cdot0 + 1\cdot3 + 0\cdot0 = 6$，预测从 $0$ 翻成 $1$。权重向量 $w_c$ 决定"哪些证据对类别 $c$ 有利、各加多少分"——它是类别自己的"口味"；同一份展平向量 $x$，配不同口味就得出不同判决。训练 CNN 的本质，正是用梯度下降把这些口味从随机猜一步步调成"真懂"。

</details>

## 8. 选读：CNN 的三级抽象，恰好对应大脑视觉的三级加工

<details>
<summary>选读 · 从边缘到部件到对象</summary>

1980 年福岛邦彦的 Neocognitron、再到 1998 年 LeCun 的 LeNet，CNN 的层级设计一直呼应着神经科学的发现：初级视觉皮层（V1）的神经元只对特定朝向的边缘敏感（≈ 卷积核），随后逐级把局部边缘组合成角、部件、再到完整对象（≈ 深层特征图）。卷积层浅层学到的核往往是 Gabor 滤波式的边缘/纹理探测器，深层则编码"鼻子""轮子"这类语义部件——这也解释了为什么在 ImageNet 上训练好的浅层核可以直接搬到别的视觉任务里复用（迁移学习），因为"边缘"这件事在所有图片里都长一个样。

</details>

## 9. 下一站

至此，图像这条线从卷积、池化一路走到了"一张图进、一个预测出"的完整 CNN。但网络越深，训练时梯度越容易在半路蒸发或爆炸——给梯度修一条高速公路的[残差连接](./65-residual-path.md)，是深层网络能真正堆起来的关键。

→ [残差连接与深路梯度流](./65-residual-path.md)
