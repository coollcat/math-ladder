---
title: 逻辑回归与交叉熵
lesson_id: ml-math/logistic-regression
prereqs:
  - ml-math/loss
  - exponents/three-curves
  - probability-advanced/random-variable
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - sigmoid
  - cross-entropy
applications:
  - ad-selection
  - spam-filtering
exits:
  - data-ai
---

# 逻辑回归与交叉熵

## 1. 从一个场景开始

广告系统要在 50 毫秒内决定给不给某位用户展示一条广告。它需要的不是"点击量是多少元"，而是一个概率：**这位用户点这条广告的机会有多大？**

线性回归的输出是整条数轴——可能是 3，也可能是负数，拿来当概率显然荒谬。我们需要一台"概率发生器"：输入任意分数，输出永远落在 0 和 1 之间。

## 2. 直觉解释

第 15 章见过 S 形曲线 $e^x$ 的亲戚——现在把它加工成标准件：**sigmoid 函数** $\sigma(t)=\dfrac{1}{1+e^{-t}}$。

它的性格：

- 输入 0 → 输出 0.5（不偏不倚）；
- 输入越大越接近 1（几乎确定会发生）；
- 输入越小越接近 0（几乎不会发生）；
- 永远温和，从不越界。

于是模型分两节车厢：先用直线打分 $t=wx+b$（分数可以任意大），再把分数塞进 sigmoid 压成概率 $p=\sigma(t)$。决策边界藏在 $p=0.5$ 处——恰好是 $t=0$，也就是直线 $wx+b=0$：**逻辑回归其实是披着概率外衣的线性分类器**。

## 3. 正式定义

**模型**：$p=\sigma(wx+b)=\dfrac{1}{1+e^{-(wx+b)}}$

**损失**：不能用平方损失吗？可以用，但有个更合身的——对单个样本，若真实标签为 $y\in\lbrace 0,1\rbrace$、预测概率为 $p$：

$$L(y,p)=-y\ln p-(1-y)\ln(1-p)$$

读法："是正类就罚 $-\ln p$（预测越接近 1 罚越轻）；是负类就罚 $-\ln(1-p)$"。全数据集取平均即**交叉熵损失**。它与最大似然估计（第 39 章）血脉相通：最小化交叉熵 = 让观察到的标签在模型眼里"最不惊讶"。

| 符号 | 含义 |
| --- | --- |
| $t=wx+b$ | 线性打分（logit） |
| $p=\sigma(t)$ | 预测的正类概率 |
| 决策边界 | $t=0$ 即 $wx+b=0$，特征空间里的一条直线 |

## 4. 分步例题

**例**：模型取 $w=0.5,\ b=-1$（即打分 $t=0.5x-1$）。一位用户特征 $x=4$。

1. 打分：$t=0.5\times4-1=1$；
2. 过 sigmoid：$p=\dfrac{1}{1+e^{-1}}=\dfrac{1}{1+0.368}\approx0.731$；
3. 若该用户真的点了（$y=1$）：损失 $-\ln(0.731)=0.313$——罚得温和，因为预测方向正确且自信适中；
4. 对照一个瞎蒙模型（恒报 $p=0.5$）：同样情形损失 $-\ln 0.5=0.693$；好模型的账单只有它的一半不到；
5. 反面教材：若模型自信地报 $p=0.999$ 而用户没点（$y=0$），损失 $-\ln(0.001)\approx6.9$——**罚单爆炸**。交叉熵最恨"自信的错误"。

## 5. 动手实验

### 实验 1：调 sigmoid 的形状与位置

```viz
{
  "type": "plot",
  "title": "p = 1/(1+exp(-k*(x-c)))：k 管陡峭，c 管中心",
  "expr": "1/(1+exp(-k*(x-c)))",
  "expr2": "0.5",
  "label": "p(x)",
  "label2": "boundary",
  "xmin": -6,
  "xmax": 6,
  "sliders": [
    { "name": "k", "min": 0.2, "max": 3, "step": 0.1, "value": 1 },
    { "name": "c", "min": -4, "max": 4, "step": 0.1, "value": 0 }
  ]
}
```

橙色虚线是 0.5 参考线：曲线穿过它的横坐标恰为 $c$——这就是决策边界的位置。拖大 $k$，S 形收紧成"跳崖"，分类变果断但概率变得非黑即白。

### 实验 2：算一遍概率与罚单

```python title="sigmoid 与交叉熵的手工实现"
import math

def sigmoid(t):
    return 1 / (1 + math.exp(-t))       # exp：以 e 为底的指数函数

def ce_loss(y, p):                      # 单个样本的交叉熵
    if y == 1:
        return -math.log(p)
    return -math.log(1 - p)

w, b = 0.5, -1.0
x_user = 4
p = sigmoid(w * x_user + b)
print(round(p, 3))                      # 点击概率估计
print(round(ce_loss(1, p), 3))          # 用户真点了：罚多少
print(round(ce_loss(0, p), 3))          # 用户没点：罚多少
print(round(-math.log(0.5), 3))         # 瞎蒙基准 0.693
```

四行输出 `0.731 / 0.313 / 1.313 / 0.693`：预测偏向"会点"时，点了的罚单轻、没点的罚单重——损失的两个分支像天平两端。

```python title="交叉熵的爆炸区"
import matplotlib.pyplot as plt

ps = []
for k in range(1, 100):
    ps.append(k / 100)

loss_pos = [-math.log(p) for p in ps]          # y=1 时：-ln p
plt.plot(ps, loss_pos, label="loss when y=1")
plt.axvline(0.5, color="gray", linestyle="--") # axvline：竖直参考线
plt.xlabel("predicted p")
plt.ylabel("loss")
plt.legend()
plt.grid(True)
```

曲线在 $p\to 0$ 处垂直起飞——把"确定会发生"说成"几乎不可能"要付出无穷代价。这个爆炸不是缺陷而是设计：**惩罚必须配得上错误的自信**。

### 快问快答

```quiz
逻辑回归名字里有"回归"，它实际做的是？
- 预测连续数值的回归任务
- 通过概率输出做二分类任务 [*]
- 数据降维
? 它"回归"的是 logit（对数几率）这个连续量；输出经 sigmoid 变成概率后，按 0.5 阈值切分就是分类器。
```

:::warning[常见误区]

**误区一**："sigmoid 的输出就是真实概率。" 训练好的模型输出的叫"校准前概率"：可能系统性偏高或偏低。需要可信的概率时要做校准（如 Platt 缩放）——这是本章后续"概率校准"模块的主题。

**误区二**："逻辑回归画不出弯曲的分类线。" 对特征做变换（多项式特征、核技巧）后边界照样弯曲；单层直线的局限属于"原始特征空间"，不属于模型哲学。

**误区三**："交叉熵比平方损失'更高级'所以总用它。" 在概率输出场景它确实更合身（梯度不饱和、与似然相通）；但在纯回归任务上平方损失仍是首选。工具跟着问题走。

:::

## 6. 练习

**练习 1**（概念）：决策边界 $wx+b=0$ 上移动一点，概率如何变化？远离边界呢？

<details>
<summary>点开查看逐步解答</summary>

贴着边界时 $t\approx0$，sigmoid 斜率最大（$\sigma'(0)=0.25\times w$）：挪一小步概率变化最快——这是模型"最犹豫也最敏感"的地带。深入两侧后 $p$ 趋近 0 或 1，同样的位移几乎不再改变概率。广告系统里"边界附近的用户"正是最值得花预算说服的人群。
</details>

**练习 2**（判题）：初始代码忘了过 sigmoid、也没写损失公式。请补全两处后运行：

```exercise
# @title: 练习：算出点击概率和交叉熵罚单
# @check: 0.731
# @check: 0.313
# @check: 0.693
# @hint: p = 1/(1+exp(-t))；y=1 时损失是 -log(p)；瞎蒙模型的 p 是 0.5。
import math

w = 0.5
b = -1.0
x_user = 4

t = w * x_user + b
p = t                          # ← 错了：裸打分不是概率，要过 sigmoid
print(round(p, 3))

loss = 0                       # ← 学生任务：改成 -math.log(p)
print(round(loss, 3))

print(round(-math.log(0.5), 3))   # 瞎蒙基准：任何模型都该比它强
```

三行命中后对照第 4 步例题逐项复核：概率 0.731、正确方向的罚单 0.313、以及必须打败的及格线 0.693。

**练习 3**：实验 2 第一段中把 w 改成 0（只留 b=-1），概率变成多少？这说明 w 控制的是什么？

<details>
<summary>点开查看逐步解答</summary>

$t=b=-1$，$p=\sigma(-1)\approx0.269$——与用户特征无关的常数输出：特征彻底失声。w 正是把特征"翻译成分数"的音量旋钮；w 为零意味着模型什么都没学到，只剩偏置在独白。
</details>

## 7. 选读：为什么不用平方损失训练概率

<details>
<summary>选读 · 梯度的视角</summary>

若对 $p=\sigma(wx+b)$ 强行用平方损失，链式法则会带出因子 $\sigma'(t)$：当打分 $t$ 很大或很小时 $\sigma'\approx0$，梯度随之冻结——模型错了却"感觉不到错"，学不动（梯度消失的迷你版）。换成交叉熵，梯度化简后恰好是 $(p-y)x$：误差直接乘特征，没有任何缩水因子——预测越错、学得越猛。这一行梯度是深度学习里"输出层配交叉熵"约定的全部理由。

</details>

## 8. 下一站

模型能拟合只是第一步；真正的战场是它面对没见过的数据时表现如何——过拟合如何发生、怎么提前发现、又该怎么治？

→ [过拟合、欠拟合与验证](./40-overfitting-validation.md)
