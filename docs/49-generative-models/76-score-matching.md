---
title: Score matching 直觉
lesson_id: generative/score-matching
prereqs:
  - generative/diffusion-denoising
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
  - score-function
  - langevin-dynamics
  - denoising-score-matching
applications:
  - image-generation
  - scientific-simulation
exits:
  - data-ai
---

# Score matching 直觉

## 1. 从一个场景开始

上一次玩扩散模型，你带着网络学的本领是"看着这帧脏图，猜出里面混了哪种噪声"。猜完就扣、扣完再走，几十步后雪花显影成图。

现在把镜头贴近一格问一个问题：**"扣掉一点噪声"到底是朝哪边挪了挪？**答案是——朝着**概率更高的地方**挪了一小步。如果把数据的密度想成一片起伏的山地，那么每一步去噪都在顺着山坡往高处走。这片山坡在每个位置都装着一枚看不见的指北针，箭头指向"此地最该前进的方向"。学会读出整套指针阵列，就是本课的主角 score matching；而顺着指北针边走边抖的那个采样法子，叫朗之万动力学。

## 2. 直觉解释

**Score 是什么？**把对数密度 $\ln p(x)$ 看成海拔图，score 就是这张图的坡度向量 $-$ 上山的方向。三个立刻要立的旗杆：

- **只要坡度，不要海拔绝对值**：配分函数（第 39 章那个怎么积都积不动的分母 $Z$）决定海拔的零点在哪，但乘一个常数再取对数，导数纹丝不动——**学会指北针不需要知道山顶有多高**；
- **去噪 = 读坡度**：给真实数据盖一层已知方差的高斯噪声，网络的任务变成"看脏点猜干净方向"，这被证明恰好在拟合周围的 score（专业名叫 denoising score matching）——上一课的损失函数悄悄换了身衣服继续生效；
- **采样 = 循着坡走**：随机放一颗珠子，每一步"沿 score 前进一点 + 抖动一下"。抖动绝不是计算误差，它是整个方法的灵魂：不抖的珠子只会滑进出发侧的山头；带一点抖动，珠子才有翻梁串门的门票，走够了步数，停留位置的频率就画出整片 $p(x)$。

于是同一套机械同时回答了两大问题："如何评估分布"（读坡度）与"如何从分布生成"（照着走）。

## 3. 正式定义

$$\text{score 函数：}\quad s(x) = \nabla_x \ln p(x), \qquad \text{朗之万迭代：}\quad x_{t+1} = x_t + \eta \cdot s(x_t) + \sqrt{2\eta}\,\varepsilon$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $s(x)$ | score 场 | 每个位置一根指针：上山方向 |
| $\eta$ | 步长 | 每次沿指针走多大的一小步 |
| $\varepsilon$ | 高斯抖动 | $\sqrt{2\eta}$ 规模的踢腿，防止珠子在原地睡死 |

两条关键事实：

1. **常数免疫**：若 $q(x) = c \cdot p(x)$（$c$ 为任意正常数），则 $s_q = s_p$ 逐点相等——这就是"不必知道 $Z$"的严格说法；
2. **极限即目标**：$\eta$ 足够小、步数足够多时，轨迹的平稳分布恰好是 $p(x)$ 本身；采样器与密度模型在这一刻合二为一。

## 4. 分步例题

例一（单峰）：标准高斯 $p(x) \propto e^{-x^2/2}$，故 $\ln p = -x^2/2 + \text{常数}$。

1. 求导得 score：$s(x) = -x$——一根直直指回原点的弹簧；
2. 位置 $-2$ 的指针指向右方（力度 2）；位置 $1$ 指向左方（力度 1）：离原点越远回拉越猛，正是高斯的性格；
3. 例二（双峰）：$p(x) \propto e^{-(x+2)^2/2} + e^{-(x-2)^2/2}$，展开导数并用公共分母合并：
4. $s(x) = \dfrac{-(x{+}2)e^{-(x+2)^2/2} - (x{-}2)e^{-(x-2)^2/2}}{e^{-(x+2)^2/2} + e^{-(x-2)^2/2}}$。代入 $x=0$：分子两项大小相等、方向相反，整体为零——正中鞍点是一处"谁也不偏袒"的驻留点，等权双峰里从这里出发的确定性爬山会卡死在原地；打破僵局的唯一办法，正是朗之万里的那次踢腿。

## 5. 动手实验

### 实验 1（viz）：先看山，再看指针阵

第一张图画出刚才的双峰山地本身；第二张把它换成同位置的指针阵列（横轴此时代表**时间**，纵轴是当前所在位置；拖动橙色起点，同一条黑色箭头缝里走出不同的爬坡命运）：

```viz
{
  "type": "plot",
  "title": "等权双峰的概率山地 p(x)",
  "expr": "exp(-(x+2)^2/2)/sqrt(2*pi)/2 + exp(-(x-2)^2/2)/sqrt(2*pi)/2",
  "xmin": -7,
  "xmax": 7,
  "sliders": []
}
```

```viz
{
  "type": "slope-field",
  "title": "同一座山的 score 方向场",
  "expr": "(-((y+2)*exp(-(y+2)^2/2))-(y-2)*exp(-(y-2)^2/2))/(exp(-(y+2)^2/2)+exp(-(y-2)^2/2))",
  "tmin": -2,
  "tmax": 6,
  "ymin": -7,
  "ymax": 7,
  "t0": -1,
  "y0": 5.5
}
```

观察橙线：起点 5.5 一路下坡折返、稳稳落座右峰顶部；把起点拖到左边，命运镜像反转。再把起点拖到 0 附近试试——橙线会赖在原地打晃：那是例题说过的鞍点，光有坡度推不动，非等一阵大风（抖动）不可。

### 实验 2（python）：几百颗珠子一起抖，抖出整片分布

```python title="朗之万采样：从指北针走到分布"
import math
import random
import matplotlib.pyplot as plt

random.seed(77)
steps_done = 0

def mix_density(x):
    return 0.5 * math.exp(-0.5 * (x + 2) ** 2) + 0.5 * math.exp(-0.5 * (x - 2) ** 2)

def score(x):
    top = -(x + 2) * math.exp(-0.5 * (x + 2) ** 2) \
        - (x - 2) * math.exp(-0.5 * (x - 2) ** 2)
    bottom = math.exp(-0.5 * (x + 2) ** 2) + math.exp(-0.5 * (x - 2) ** 2)
    return top / bottom                # 例题那条双峰公式

eta = 0.12                              # 步长：一步一步轻轻地走
kicks = math.sqrt(2 * eta)              # 踢腿规模与步长配套
walkers = []
for i in range(500):
    walkers.append(random.uniform(-6, 6))   # 五百颗珠子随机撒在山谷间

for t in range(120):
    nxt = []
    for x in walkers:
        eps = random.gauss(0, 1)        # 每步独立的高斯踢腿
        nxt.append(x + eta * score(x) + kicks * eps)
    walkers = nxt
    steps_done += 1

xs, ys = [], []
for x in [k / 100 for k in range(-700, 701, 14)]:
    xs.append(x)
    ys.append(mix_density(x))           # 理论曲线待会儿压在直方图上

plt.hist(walkers, bins=48, density=True, alpha=0.55, label="langevin samples")
plt.plot(xs, [y / 2.5066 for y in ys], linewidth=3, label="target p(x)")
plt.legend()
left = sum(1 for x in walkers if x < 0)
print("珠子总数 500, 左谷占比:", round(left / 5), "%")
print("走了", steps_done, "步")
```

橙色直方图的轮廓几乎复刻蓝色理论曲线——**样本自己长出了密度**。左谷占比约五成且每次运行分毫不差（种子固定）：等权双峰连平局都平得明明白白。

### 实验 3（python）：抹掉分母，指针分毫不动

```python title="同一个方向场，两种海拔标尺"
import math

def raw_height(x):
    return math.exp(-0.5 * (x - 2) ** 2)            # 未归一化：没有除以 Z

def normed_height(x):
    return math.exp(-0.5 * (x - 2) ** 2) / 2.5066   # 除以 sqrt(2*pi)

h = 1e-5

def slope(f, x):                                     # 数值求导当坡度
    return (f(x + h) - f(x - h)) / (2 * h)

for probe in [0.5, 1.5, 3.5]:                        # 避开峰顶 2.0：那里的坡度恰为 0
    a, b = slope(raw_height, probe), slope(normed_height, probe)
    # 除以常数后再做比值，两条坡度完全同步（后者按比例放大回来）
    ratio = b / a
    print(f"x={probe}: 未归一化坡度 {round(a, 5)}, 缩放系数 {round(ratio, 6)}")
```

缩放系数恒等于 $1/\sqrt{2\pi} \approx 0.39894$ 且逐位稳定：归一化常数只是给所有坡度统一打折，方向一丝未变。训练网络时大可对未归一化的能量函数径直求导——$Z$ 从头到尾没出场的机会。

### 快问快答

```quiz
朗之万采样里的随机踢腿可以删掉吗？
- 可以，删掉走得更快更准
- 不能：没有踢腿珠子会困在最近的峰顶或鞍点，画不出全部分布 [*]
- 可以，但要把步长调大一万倍弥补
? 踢腿承担着“翻山越梁”的探索任务：持续小幅扰动加上无限长时间，理论上能走遍所有谷地，这正是平稳分布收敛到 p(x) 的前提条件。
```

:::warning[常见误区]

**误区一**："你以为 score 是某个最佳地点。" 它是一个**处处有定义的方向场**，每根指针都是局部信息；不存在唯一的"score 点"，只有无数支路牌。

**误区二**："你以为抖动是可以打磨掉的数值瑕疵。" 没有抖动就没有跨峰通勤，也就没有平稳分布收敛这回事；衰减抖动反而是工程上的精调手段。

**误区三**："你以为学 score 必须手握海量原始样本。" 数据稀薄的地区靠"加噪铺路"：在高斯噪声笼罩过的位置照样能读到当地坡度，全部噪声等级拼起来才是完整的地图——这也是扩散式多尺度训练的真正动机。

:::

## 6. 练习

**练习**：写出高斯家族自己的指北针。$N(m, s^2)$ 的 score 是 $-(x-m)/s^2$——现在的代码丢了一个平方：

```exercise
# @title: 练习：接回被弄丢的平方
# @check: -0.25
# @check: -2.0
# @check: -0.33
# @hint: 对照公式 -(x-m)/(s*s)。三条测试数据的宽度分别是 2、0.5、3，没有一条是 1。
import math

def score(x, m, s):
    return -(x - m) / s       # ← 问题在这：分母少了个平方，宽山变陡了

print(round(score(1, 0, 2), 2))
print(round(score(2.5, 2, 0.5), 2))
print(round(score(5, 2, 3), 2))
```

<details>
<summary>点开查看逐步解答</summary>

改为 `return -(x - m) / (s * s)` 后输出依次为 $-0.25$、$-2.0$、$-0.33$。物理直觉复查：瘦高斯（$s=0.5$）两侧悬崖陡峭，指针力气达 $2.0$；胖高斯（$s=3$）平缓，只剩 $0.33$ 的推送力——平方项就是这种"山体形状决定坡度大小"的数学化身。漏写平方会把所有山的坡度错报一个量级，朗之万踏出去的步幅跟着全乱。
</details>

## 7. 选读：三件套并成一件事

<details>
<summary>选读 · 去噪、得分与极大似然的同一条走廊</summary>

对高斯核 $x_{\text{脏}} = x + \sigma\varepsilon$ 直接推导可证：给定脏点的条件下，最优的"干净方向猜测"乘上一个只依赖 $\sigma$ 的系数后，就等于真分布在脏点处的 score ——所以扩散模型的均方误差训练是在用海量伪数据逐点撒网式地拟合全空间 score（此即 denoising score matching 的内容）。

而 score 又与极大似然有一条正式纽带：$\ln p_\theta$ 的梯度可以改写成 score 差的期望积分（Fisher 散度形式），意味着把 score 拟合到位，也就同步推进了似然。至此三大工具互相收编：VAE 给近似、Flow 给精确账本、GAN 给对抗裁决、Score 给方向导航——它们的名字不同，测的全是"分布之间差多少"这件事。差的方式到底有多少种花样？下一课的最优传输会给这张地图补最后一块拼图。
</details>

## 8. 下一站

你可能已经嗅到：这一章的每个家族都随身带着一把"分布距离"的尺子——KL 散度、JS 散度、极大似然、对抗值……最后一课我们把所有尺子摆上柜台，介绍那位对支撑不重叠也保持温柔的度量先生 Wasserstein，并为整张生成模型地图收官。

→ [最优传输与分布匹配展望](./84-optimal-transport-outlook.md)
