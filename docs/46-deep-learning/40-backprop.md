---
title: 反向传播：梯度的回传流水线
lesson_id: deep-learning/backprop
prereqs:
  - calculus/chain
  - deep-learning/loss-descent
volume: 5
layer: L7
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: [math.tanh]
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - computational-graph
  - backpropagation
applications:
  - neural-network-training
exits:
  - data-ai
---

# 反向传播：梯度的回传流水线

## 1. 从一个场景开始

一台电视机出厂检验不合格。质检员不会把整条产线推倒重来，而是**从成品倒着查**：画面模糊是显像管的问题还是信号源的问题？每一站只回答"我对最终缺陷负多少责任、该往哪边调"，责任逐站向前传导直到元凶。

训练神经网络面对同样的问题：损失高了，上百万个权重各自该背多少锅？逐个试错要试到宇宙热寂——**反向传播**给出一条一次回传、全员定责的流水线。

## 2. 直觉解释

先把网络画成一张**计算图**：每个圆圈是一次简单运算（加、乘、tanh），箭头表示数据流向。

- **前向**：数据沿箭头流，顺手把每站的中间结果存下来；
- **反向**：误差从出口倒着流。每经过一站，用**链式法则**把"上游变化率 × 本站局部变化率"乘起来，得到损失对本站参数的敏感度。

第 13 章的链式法则 $(f \circ g)' = f' \cdot g'$ 在这里变成了流水线纪律：**沿途所有局部导数连乘**。前向存下的中间值，正是反向时各站现成的局部导数原料——这就是为什么反向传播又快又省：一遍前向 + 一遍反向，全体参数的梯度同时到手。

## 3. 正式定义

本课主角是一个三站小流水线：

$$z = wx \qquad a = z^2 \qquad L = (a - y)^2$$

从 $L$ 倒着算到 $w$：

$$\frac{\partial L}{\partial w} = \underbrace{2(a-y)}_{\partial L/\partial a} \cdot \underbrace{2z}_{\partial a/\partial z} \cdot \underbrace{x}_{\partial z/\partial w}$$

| 符号 | 含义 |
| --- | --- |
| $\partial L/\partial a$ | 出口站局部导数：损失对第二站输出的敏感度 |
| $\partial a/\partial z$ | 中间站局部导数：平方站的斜率 |
| $\partial z/\partial w$ | 入口站局部导数：$wx$ 对 $w$ 的斜率恰是 $x$ |
| 三项连乘 | 链式法则：一环扣一环的责任传导 |

真实网络里每层多一个环节（线性站 → 激活站 → …… → 损失站），纪律不变：**局部导数沿图反序连乘，多条路径相遇时相加**。

## 4. 分步例题

**例**：取 $x = 3,\ w = 0.5,\ y = 1$。

1. 前向：$z = 0.5 \times 3 = 1.5$；$a = 1.5^2 = 2.25$；$L = (2.25 - 1)^2 = 1.5625$；
2. 反向第一环：$\partial L/\partial a = 2(2.25 - 1) = 2.5$；
3. 反向第二环：$\partial a/\partial z = 2 \times 1.5 = 3$；
4. 反向第三环：$\partial z/\partial w = x = 3$；
5. 连乘：$\partial L/\partial w = 2.5 \times 3 \times 3 = 22.5$。

解读：损失对 $w$ 的敏感度高达 22.5——把 $w$ 减小一点点，损失会猛降。若学习率取 $0.01$，更新后 $w = 0.5 - 0.225 = 0.275$。

## 5. 动手实验

### 实验 1：拖动当前参数，看局部斜率指挥方向

```viz
{
  "type": "plot",
  "title": "蓝色是损失，橙色虚线是链式法则给出的切线",
  "expr": "(x - 2)^2",
  "expr2": "(w0 - 2)^2 + 2*(w0 - 2)*(x - w0)",
  "xmin": -1,
  "xmax": 5,
  "sliders": [
    { "name": "w0", "min": -1, "max": 5, "step": 0.1, "value": 0 }
  ]
}
```

拖动 `w0`：切线向右上倾斜时导数为正，更新式会减小参数；向右下倾斜时导数为负，更新式会增大参数。反向传播只是把这个“看局部斜率”的动作沿计算图倒着做完一整条流水线。

### 实验 2：数值梯度检查——给链式法则对答案

```python title="差分近似 vs 解析梯度"
import math

w, x, y = 0.5, 3.0, 1.0       # 参数、输入、正确答案

def loss(w):                   # 与 §4 完全相同的三站
    z = w * x
    a = z * z
    return (a - y) ** 2

eps = 0.0001                   # 微小扰动量
numeric = (loss(w + eps) - loss(w - eps)) / (2 * eps)   # 差分近似：割线斜率逼切线

z = w * x
analytic = 2 * (z*z - y) * (2 * z) * x                  # 链式法则连乘
print("数值梯度 =", round(numeric, 4))
print("解析梯度 =", round(analytic, 4))
```

两个数字几乎重合。这个"土办法"是深度学习工程师的**验钞机**：任何手写反向传播代码上线前，都要跟数值差分对一遍账。以后你写复杂的网络，随时可以用这两行抓自己的推导 bug。

### 实验 3：手写反向传播，驯服异或

单层线性网络永远学不会异或（XOR）：相同输出 0、不同输出 1。1969 年它一度判了感知机死刑，而两层网络轻松破解——现在我们亲手训一个：

```python title="2-4-1 网络 + 反向传播（纯循环版）"
import random
import math                     # 本课新工具 math.tanh：双曲正切，S 形，值域 -1..1
import matplotlib.pyplot as plt

random.seed(7)
X = [[0, 0], [0, 1], [1, 0], [1, 1]]    # 四个输入
Y = [0, 1, 1, 0]                         # 异或的正确答案

H = 4                                    # 隐层评委 4 位
W1 = [[random.uniform(-1, 1) for _ in range(2)] for _ in range(H)]   # uniform：[-1,1) 内随机取数
B1 = [0.0] * H                           # [0.0]*H：零复制 H 份
W2 = [random.uniform(-1, 1) for _ in range(H)]
B2 = 0.0
lr = 0.5
losses = []

def forward(x):
    zs, hs = [], []
    for j in range(H):
        z = W1[j][0]*x[0] + W1[j][1]*x[1] + B1[j]
        zs.append(z)
        hs.append(math.tanh(z))          # 隐层拍板：tanh
    o = B2
    for j in range(H):
        o = o + W2[j] * hs[j]
    p = 1 / (1 + math.exp(-o))           # 输出拍板：sigmoid 压成概率
    return zs, hs, p

for epoch in range(2000):
    total = 0.0
    for k in range(4):
        zs, hs, p = forward(X[k])
        err = p - Y[k]
        total += err * err
        do = 2 * err * p * (1 - p)               # 反向第一环：穿 sigmoid（导数 p(1-p)）
        B2 -= lr * do
        for j in range(H):
            dz = do * W2[j] * (1 - hs[j]**2)     # 第二环：穿 tanh（导数 1 - h^2）
            W1[j][0] -= lr * dz * X[k][0]        # 第三环：穿 w 到输入
            W1[j][1] -= lr * dz * X[k][1]
            B1[j] -= lr * dz
            W2[j] -= lr * do * hs[j]
    losses.append(total)

print("训练后的四道判断：")
for k in range(4):
    _, _, p = forward(X[k])
    print(X[k], "->", round(p, 2))

plt.plot(losses)
plt.xlabel("epoch")
plt.ylabel("MSE loss")
plt.grid(True)
```

看输出：四个概率逼近 $0, 1, 1, 0$——异或被攻克。损失曲线先陡降后拉平，与上一课的心电图完全吻合。这段几十行的循环，就是所有深度学习框架 `loss.backward()` 的本质。

### 快问快答

```quiz
反向传播时，某参数的梯度应该怎么得到？
- 把损失对所有参数求和
- 从损失出发，沿计算图把沿途局部导数连乘（多路径再相加）[*]
- 用参数当前的数值大小来估计
? 链式法则是流水线纪律：局部导数按反向顺序连乘；同一参数影响多条路径时贡献相加。
```

:::warning[常见误区]

**误区一**："更新时写成 $w + \eta \nabla L$。"——符号一丢，下山变登山，损失越训越大。负号是下山的全部秘密。

**误区二**："激活函数只是让输出好看。"——它是反向传播的关键环节：sigmoid/tanh 在饱和区导数接近 0，会把上游传来的梯度掐死（**梯度消失**）；ReLU 正区恒为 1 的斜率正是它流行的原因。

**误区三**："解析梯度算完就万事大吉。"——手推公式极易出错且错得悄无声息。养成习惯：像实验 2 那样先用数值差分对账，再谈训练。

:::

## 6. 练习

**练习 1**：把 §4 流水线的平方站换成三次方站（$a = z^3$），重算 $x=3,\ w=0.5,\ y=1$ 时 $\partial L/\partial w$（提示：$\partial a/\partial z = 3z^2$）。

<details>
<summary>点开查看逐步解答</summary>

前向：$z = 1.5$，$a = 3.375$，$L = (3.375-1)^2 \approx 5.64$。反向：$\partial L/\partial a = 4.75$，$\partial a/\partial z = 3 \times 2.25 = 6.75$，$\partial z/\partial w = 3$。连乘 $\approx 96.2$。平方站换立方站，中间环节的局部导数变了，但连乘纪律不变。
</details>

**练习 2**：修好下面的反向传播（注意这次正确答案是**负**的——梯度会指挥 $w$ 往哪边走？）：

```exercise
# @title: 练习：连乘三环
# @check: -24.0
# @check: 2.9
# @hint: a = z^2 对 z 的导数是 2*z；z = w*x 对 w 的导数就是 x 本身。
x = 2.0       # 输入
w = 0.5       # 当前权重
y = 4.0       # 正确答案
lr = 0.1      # 学习率

z = w * x             # 第一站
a = z * z             # 第二站
loss = (a - y) ** 2   # 第三站

dloss_da = 2 * (a - y)   # 已给出：出口局部导数
da_dz = 0                # ← 问题在这：a 对 z 的局部导数
dz_dw = 0                # ← 问题在这：z 对 w 的局部导数

grad_w = dloss_da * da_dz * dz_dw
print(grad_w)

w_new = w - lr * grad_w
print(round(w_new, 2))
```

grad 是负数意味着：当前 $a$ 比 $y$ 小，必须**增大** $w$ 才能抬高输出——负号在更新式里自动完成这次转向。

**练习 3**：概念题——为什么框架不直接用实验 2 的数值差分求梯度？

<details>
<summary>点开查看逐步解答</summary>

百万参数意味着百万次"扰动整个网络再跑一遍前向"，代价是反向传播的百万倍；而且差分有舍入误差。反向传播利用计算图共享中间结果：一次前向 + 一次反向就拿到**全部**参数的精确梯度。数值差分的角色退居二线——做正确性抽查（如实验 2）。
</details>

## 7. 选读：自动微分的前向与反向两种模式

<details>
<summary>选读 · 框架在你背后做了什么</summary>

把链式法则系统化的算法叫**自动微分**。前向模式从输入出发携带导数前进，一趟只得到损失对**一个**输入的导数；反向模式从输出出发倒扫一遍，同时拿到损失对**所有**中间量的导数。参数动辄百万的深度学习里，"一次回传全员定责"的反向模式碾压性胜出——这正是 PyTorch 记录计算图、调用 `backward()` 时发生的全部魔法。代价是要把前向中间值都存下来，这也是训练比推理更吃内存的原因。
</details>

## 8. 下一站

会训练了，但"训练成功"不等于"学到了真本事"。下一课看深度学习最经典的陷阱：模型把练习册背得滚瓜烂熟，考试却一塌糊涂——过拟合。

→ [过拟合初见](./50-overfitting.md)
