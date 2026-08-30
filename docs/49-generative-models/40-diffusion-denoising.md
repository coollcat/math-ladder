---
title: 扩散模型去噪直觉
lesson_id: generative/diffusion-denoising
prereqs:
  - generative/maximum-likelihood
  - stochastic-processes/markov-chain
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
  - forward-diffusion
  - denoising
applications:
  - image-generation
exits:
  - data-ai
---

# 扩散模型去噪直觉

## 1. 从一个场景开始

你在 AI 绘画工具里输入"一只戴宇航头盔的猫"，进度条上雪花噪声缓缓"显影"成图。它不是一次画成的，而是几十步里每一步只做一点微小修正。

为什么不一步到位？想想揉纸：把地图揉成纸团只要一秒，展开复原却很难——但如果**每次只轻轻揉一点**，那么"反向轻轻抚平一点"就变得容易学。扩散模型（以 2020 年的 DDPM 论文为代表）正是这个思路的数学化：前向加噪有固定公式、不用学；要学的只是**每一小步的反操作**。

## 2. 直觉解释

两个方向的戏份完全不对等：

- **前向（加噪）**：把真实信号 $x_0$ 反复掺入随机噪声，走 $T$ 步后信号彻底淹没，只剩纯噪声。这步不需要任何学习——公式是写死的；
- **反向（去噪）**：从纯噪声出发往回走。每一步问网络："这一步里掺了哪些噪声？"预测出来、扣掉一点、再走下一步。

为什么小步反而强？因为每一步只挪一点点，"该扣掉的噪声"形状简单（近似一小团高斯），网络容易学会；上千个简单步骤接力，就能完成"从噪声到名画"的整体奇迹。这与第 37 章马尔可夫链的思想同源：**每步只依赖上一步**，长链却能走出复杂轨迹。

还有一个隐藏彩蛋：如果对同一个起点反复加噪很多次再取平均，随机噪声互相抵消，剩下的恰是"缩水后的原始信号"。**均值里藏着记忆**——这正是去噪可行的数学根基（下一实验亲手验证）。

## 3. 正式定义

前向过程的单步公式（DDPM 版）：

$$x_t = \sqrt{1-\beta}\, x_{t-1} + \sqrt{\beta}\; \varepsilon, \qquad \varepsilon \sim N(0,1)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $x_t$ | 第 $t$ 步状态 | 一张（被逐步污染的）图或一段信号 |
| $\beta$ | 噪声调度 | 每步掺入的噪声强度；$\sqrt{1-\beta}$ 同时轻微缩小旧信号 |
| $\varepsilon$ | 标准高斯噪声 | 本步掺入的随机扰动 |

两个关键性质：

1. **方差守恒**：若 $x_{t-1}$ 的方差约为 1，则新方差为 $(1-\beta) + \beta = 1$——信号缩多少，噪声就补多少，画面始终"亮度正常"，只是越来越花；
2. **训练目标**：网络 $\varepsilon_\theta(x_t, t)$ 学的是"看着被污染的 $x_t$，猜出本步掺入的 $\varepsilon$"。损失就是猜错程度（均方误差），它是变分下界的简化形式——极大似然家族的现代成员。

## 4. 分步例题

取一维"图像"：一个亮度值 $x_0 = 8$；固定 $\beta = 0.1$；为方便核对，把三步的噪声定成 $\varepsilon_1=1,\ \varepsilon_2=-1,\ \varepsilon_3=1$。

1. 第 1 步：$x_1 = \sqrt{0.9}\times 8 + \sqrt{0.1}\times 1 \approx 7.5895 + 0.3162 = 7.9057$；
2. 第 2 步：$x_2 = \sqrt{0.9}\times 7.9057 - 0.3162 \approx 7.5000 - 0.3162 = 7.1838$；
3. 第 3 步：$x_3 = \sqrt{0.9}\times 7.1838 + 0.3162 \approx 6.8155 + 0.3162 = 7.1317$；
4. 观察：信号成分每步乘 $0.9487$（即 $\sqrt{0.9}$）：$8 \to 7.59 \to 7.20 \to 6.83$，缓慢衰减；噪声成分在旁边小幅晃动。走一百多步后信号将衰到可以忽略——这就是"揉碎"的全过程。

## 5. 动手实验

### 实验 1（viz）：信号均值与噪声波动

蓝线是信号的期望成分 $x_0\sqrt{1-\beta}^x$，橙线是噪声的标准差 $\sqrt{1-(1-\beta)^x}$。拖动初始幅度 $a$ 和噪声调度 $\beta$：蓝线慢慢掉向零，橙线爬向 1。

```viz
{
  "type": "plot",
  "title": "扩散的两个成分：信号均值与噪声标准差",
  "expr": "a*sqrt((1-b)^x)",
  "expr2": "sqrt(1-(1-b)^x)",
  "label": "信号均值",
  "label2": "噪声标准差",
  "xmin": 0,
  "xmax": 60,
  "sliders": [
    { "name": "a", "min": -10, "max": 10, "step": 0.5, "value": 8 },
    { "name": "b", "min": 0.01, "max": 0.2, "step": 0.01, "value": 0.06 }
  ]
}
```

### 实验 2（python）：看一条信号被一步步揉进噪声

```python title="加噪时间轴"
import random
import math
import matplotlib.pyplot as plt

random.seed(11)                  # 固定种子：每次运行产生同一串随机数
n = 32
signal = []                      # 原始“图像”：一条平滑起伏的亮度曲线
for k in range(n):
    signal.append(math.sin(k / n * math.pi * 2) * 5 + 6)

beta = 0.06
state = signal[:]                # [:] ：复制整份列表，避免改坏原件

frames = [(0, state)]            # 记录关键帧：(步数, 快照)
for t in range(1, 61):
    nxt = []                     # 装下一步的新状态
    for k in range(n):
        eps = random.gauss(0, 1)             # gauss(0,1)：抽一个标准正态噪声
        nxt.append(math.sqrt(1 - beta) * state[k] + math.sqrt(beta) * eps)
    state = nxt
    if t % 15 == 0:              # 每 15 步存一张快照
        frames.append((t, state))

fig, axes = plt.subplots(len(frames), 1, figsize=(6, 1.4 * len(frames)))
for i in range(len(frames)):
    t, snap = frames[i]
    axes[i].plot(range(n), snap, marker=".", markersize=3)
    axes[i].set_title(f"t = {t}", fontsize=8)
    axes[i].set_ylim(-4, 14)

plt.tight_layout()               # 自动排版防重叠
```

五张小图从清晰正弦到一片毛毛草草——信号还在（轮廓隐约可见），但信噪比一路跳水。

### 实验 3（python）：均值里的记忆

```python title="同一位置反复加噪再取平均"
import random
import math
import matplotlib.pyplot as plt

random.seed(23)
n = 32
signal = []
for k in range(n):
    signal.append(math.sin(k / n * math.pi * 2) * 5 + 6)

beta = 0.06
steps = 30
trials = 300                     # 同一起点重复加噪的次数
avg = []
for k in range(n):
    acc = 0
    for m in range(trials):
        x = signal[k]
        for t in range(steps):   # 独立地走一遍 30 步加噪
            eps = random.gauss(0, 1)         # 与公式一致：均值 0、标准差 1
            x = math.sqrt(1 - beta) * x + math.sqrt(beta) * eps
        acc = acc + x
    avg.append(acc / trials)     # 三百次结果的平均

plt.plot(range(n), signal, linewidth=3, label="original")
plt.plot(range(n), avg, label="mean after noise")
plt.legend()
```

橙色线（加噪三十步后的平均）比原信号矮了一大截——缩到了 $(\sqrt{1-\beta})^{30} = 0.94^{15} \approx 0.40$ 倍——但**形状分毫不差**。噪声在平均中自我湮灭，信号在均值中永生。去噪网络的使命，就是把这份"平均知识"一步补回来。

### 快问快答

```quiz
扩散模型中被训练的网络学到的是什么？
- 直接从纯噪声一步生成成品图
- 预测某一步里掺入的噪声，供反向过程逐次扣除 [*]
- 判断图片是不是猫
? 每一步只做一次"局部去噪预测"，成品是几十上百步接力的结果。把大困难切成一千个小任务，正是扩散模型的立身之本。
```

:::warning[常见误区]

**误区一**："你以为反向过程是把噪声'减回去'。" 网络只能**预测**本步噪声的期望并部分扣除，且每步还注入少量新随机性——所以同一提示词两次生成结果不同。确定性复现需要专门技巧。

**误区二**："你以为前向过程也要训练。" 前向是写死的物理过程（固定公式），零参数零学习；训练全部发生在反向预测器身上。别把两头都当成神经网络。

**误区三**："你以为步数越多画质必然越好。" 步数太少显影粗糙，太多则等待漫长且收益递减；工程上有各类加速采样器用二三十步逼近千步质量。步数是权衡项，不是美德。

:::

## 6. 练习

**练习 1**：把单步加噪公式修对。现在它能跑，但信号不缩、噪声不掺——图会越走越亮而不是越来越花：

```exercise
# @title: 练习：写对加噪这一步
# @check: 7.91
# @check: -7.27
# @hint: 新状态 = sqrt(1-beta) 乘旧状态，再加上 sqrt(beta) 乘噪声。两个系数各司其职，缺一不可。
import math

def add_noise(x, eps, beta):
    return x + beta * eps          # ← 问题在这：旧信号没缩放，噪声也没按比例掺

print(round(add_noise(8, 1, 0.1), 2))
print(round(add_noise(-8, 1, 0.1), 2))
```

第二行故意用了负亮度的输入：修好后输出 $-7.27$，说明公式对负值同样成立。

**练习 2**：取 $\beta = 0.06$，问信号成分衰到一半以下需要几步？

<details>
<summary>点开查看逐步解答</summary>

每步信号乘 $\sqrt{1-\beta}=\sqrt{0.94}\approx 0.9695$。设走了 $t$ 步后剩一半：

$(\sqrt{0.94})^t < 0.5 \;\Longleftrightarrow\; t \ln 0.9695 < \ln 0.5$

数值验证：

```python
import math
c = math.sqrt(0.94)
t = 0
x = 1.0
while x >= 0.5:          # while：条件成立就一直循环（这里保证会结束）
    x = x * c
    t = t + 1
print(t)                 # 23 步左右
```

约二十三步信号过半——与直觉"每步只丢百分之三，得走不少步"一致。真实的 DDPM 用上千步、每步更小的 $\beta$，把整个过程切得更细腻。
</details>

## 7. 选读：为什么"猜噪声"等价于拟合分布

<details>
<summary>选读 · 从去噪到分数</summary>

把"预测噪声"换算一下就是"预测密度坡度"：对高斯加噪模型可以推出，最优去噪方向恰好等于数据对数密度的梯度 $-\nabla_x \log p(x)$，文献里称**分数**（score）。于是扩散采样等价于沿着学习到的"概率坡面"向下滚落、边滚边抖动——这就是 score matching 与朗之万动力学的入口。

这也回答了一个深层疑问：GAN 不写密度也能生成，扩散模型看似绕开了密度，实际上却通过"每步去噪"间接刻画了整条密度坡面。第 49 章后续课程（ELBO 与变分推断、Normalizing Flow 的可逆变换）会把这张家族地图补完。

</details>

## 8. 下一站

上一课的直觉还欠着半本账：β 被固定、反向过程只有轮廓。下一课把 DDPM 的账本摊开算完——β 怎么随步数调度、反向每步的均值方差是多少、"猜噪声"这个训练目标从哪儿塌缩出来。算清之后，你手里就有了一套能真正落地的生成机器。

→ [扩散模型的完整推导：加噪与去噪的账本](./42-diffusion-math.md)
