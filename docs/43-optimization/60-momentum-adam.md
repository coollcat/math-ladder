---
title: 动量、RMSProp 与 Adam：优化器的进化史
lesson_id: optimization/momentum-adam
prereqs:
  - optimization/gradient-descent
volume: 5
layer: L7
track:
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - momentum-method
  - adaptive-step-size
  - adam-optimizer
applications:
  - neural-networks
  - deep-learning-training
exits:
  - data-ai
---

# 动量、RMSProp 与 Adam：优化器的进化史

## 1. 从一个场景开始

你在冰面上推一只木箱下山。最朴素的办法是每次都重新使劲、用完就停——这就是第 30 课的梯度下降。但滑过冰面的人都知道更聪明的推法：**顺着惯性往前溜**，让箱子带着攒下的速度继续走，只在方向偏了的时候纠正一下。

优化器的历史就是给这只木箱装零件的历史：1983 年的重球法给它装上**惯性**（动量）；2011 年前后出现的自适应方法给每个方向装上**减震器**（RMSProp）；2014 年的 Adam 把两件装备合体，成为深度学习的默认发动机。本课讲清这三个里程碑各自解决了什么疼。

## 2. 直觉解释

要治的病叫**病态山谷**：山谷在一个方向又宽又缓、另一个方向又窄又陡（第 30 课选读里的条件数问题）。普通梯度下降只有一副脚步：步子按陡壁的承受力调小之后，在宽缓的长轴上就磨蹭得像蜗牛——轨迹反复横跳、前进龟速。

三种解法的分工：

- **动量**：把历次梯度加权平均成"速度"。横向跳动的梯度正负相消，速度归零；沿谷方向的梯度始终同号，越滚越快——**震荡被平均掉，冲刺被累积出来**；
- **RMSProp**：给每个坐标单独装减震器——最近抖得凶的方向把步幅调小，平稳的方向放开手脚迈大步；
- **Adam**：动量管"往哪使劲"，RMSProp 管"使多大劲"，两者拼在一起，各取所长。

## 3. 正式定义

记参数为 $\theta$，当前梯度为 $g$，$\odot$ 表示逐元素相乘。三种更新规则（全部单行读法：从上往下先更新中间量，再挪参数）：

$$\text{普通下降：}\ \theta \leftarrow \theta-\eta\,g \qquad\qquad \text{动量：}\ v \leftarrow \beta v+g,\quad \theta \leftarrow \theta-\eta\,v$$

$$\text{RMSProp：}\ s \leftarrow \gamma s+(1-\gamma)\,(g\odot g),\quad \theta \leftarrow \theta-\eta\, g/(\sqrt{s}+\epsilon)$$

$$\text{Adam：}\ m \leftarrow \beta_1 m+(1-\beta_1)g,\quad s \leftarrow \beta_2 s+(1-\beta_2)(g\odot g),\quad \theta \leftarrow \theta-\eta\, \hat{m}/(\sqrt{\hat{s}}+\epsilon)$$

Adam 里的帽子是偏差修正：起步时 $m,s$ 都从零开始，前几步严重偏小，所以除以 $(1-\beta_1^t)$ 与 $(1-\beta_2^t)$ 补偿；$t$ 是步数编号。

| 符号 | 含义 |
| --- | --- |
| $\eta$ | 学习率（全局节奏） |
| $\beta$ 或 $\beta_1,\beta_2$ | 惯性系数：历史记忆占多大比重，常用 $0.9$ 上下 |
| $\gamma$ | 平方滑动平均的遗忘速度，常用 $0.9$ |
| $\epsilon$ | 防止除零的小垫片，如 $10^{-8}$ |
| $v$ 或 $m$ | 梯度的加权平均（速度/一阶矩） |
| $s$ | 梯度平方的加权平均（二阶矩），量纲是"剧烈程度" |

一个记忆锚点：$\beta v+g$ 展开就是把过去所有梯度按等比数列打折求和——**动量是梯度的指数移动平均**，这也是 Adam 名字里 moment estimation 的出处。

## 4. 分步例题

**例**：一维碗 $f(x)=x^2$，学习率 $\eta=0.1$，动量系数 $\beta=0.9$，起点 $x_0=4$。每步顺序：取梯度 $g=2x$，更新速度 $v\leftarrow 0.9v+g$，再挪位置 $x\leftarrow x-0.1v$。

| 步数 | 普通 GD 的 $x$ | 动量的 $v$ | 动量的 $x$ |
| --- | --- | --- | --- |
| 起点 | 4 | 0 | 4 |
| 1 | 3.2 | $0.9\times0+8=8$ | $4-0.8=3.2$ |
| 2 | 2.56 | $7.2+6.4=13.6$ | $3.2-1.36=1.84$ |
| 3 | 2.048 | $12.24+3.68=15.92$ | $1.84-1.592=0.248$ |

普通版每步只把距离乘 $0.8$；动量版的速度从 8 涨到 13.6 再涨到 15.92——它在**越跑越快**，三步就把普通版甩开一个身位。（纸上写干净的 $1.84$，程序里会显示 $1.83999\ldots$ 的浮点尾巴，属正常现象。）

再看第四步：$v_4=14.824$，$x_4=0.248-1.4824\approx-1.23$——**冲过了头**。惯性是双刃剑：它带来冲刺，也带来回摆，之后围绕谷底越晃越小（幅度每拍大约乘 $0.95$）。加速与超调是同一枚硬币的两面。

## 5. 动手实验

### 实验 1：先看清病态山谷的地形

下面的等高线图里，$f=x^2+25y^2$：沿横轴走得再远也不太升，竖向一步就被弹回来。把紫点拖到右侧山腰再放手想象它的下降路线——这就是本章一切优化技术面对的考场。

```viz
{
  "type": "contour-map",
  "title": "病态山谷：x 方向缓坡，y 方向陡壁",
  "expr": "x^2 + 25*y^2",
  "xmin": -5,
  "xmax": 5,
  "ymin": -1,
  "ymax": 1,
  "point": [-4, 0.6]
}
```

### 实验 2：三方赛跑——同样的起点，同样的终点线

目标函数 $f=0.05x^2+2y^2$（条件数拉满），终点线定在损失低于 $0.01$，赛程上限 600 步。固定随机种子保证三名选手拿到同一个起点。

```python title="病态山谷三方赛跑：数一数各自花几步"
import math                               # 待会用 sqrt 开平方
import random                             # 随机库：生成公平的共同起点

random.seed(7)                            # 固定种子：每次运行结果完全一致
x0 = random.uniform(-10, -8)              # uniform：区间内均匀随机小数
y0 = random.uniform(1.5, 2.5)

def grad(x, y):                           # f=0.05x^2+2y^2 的两个偏导
    return 0.1 * x, 4 * y

N = 600                                   # 赛程上限
goal = 0.01                               # 终点线：损失阈值

def announce(hit):                        # 把步数翻译成播报词
    return f"{hit} 步" if hit is not None else ">600 步未完赛"

x, y = x0, y0                             # —— 一号：普通 GD，eta=0.24 ——
hit_gd = None                             # None 表示尚未撞线
for t in range(N):
    gx, gy = grad(x, y)
    x = x - 0.24 * gx                     # 更新式：位置 -= 学习率 * 梯度
    y = y - 0.24 * gy
    if 0.05 * x * x + 2 * y * y < goal and hit_gd is None:
        hit_gd = t + 1                    # 首次越过终点线时记下步数

x, y, vx, vy = x0, y0, 0.0, 0.0           # —— 二号：动量，beta=0.9 ——
hit_mom = None
for t in range(N):
    gx, gy = grad(x, y)
    vx = 0.9 * vx + gx                    # 历史速度加权累积新梯度
    vy = 0.9 * vy + gy
    x = x - 0.24 * vx
    y = y - 0.24 * vy
    if 0.05 * x * x + 2 * y * y < goal and hit_mom is None:
        hit_mom = t + 1

x, y, sx, sy = x0, y0, 0.0, 0.0           # —— 三号：RMSProp，gamma=0.9 ——
hit_rms = None
for t in range(N):
    gx, gy = grad(x, y)
    sx = 0.9 * sx + 0.1 * gx * gx         # 平方梯度的指数滑动平均
    sy = 0.9 * sy + 0.1 * gy * gy
    x = x - 0.24 * gx / (math.sqrt(sx) + 1e-8)   # 除以均方根＝按颠簸程度缩步幅
    y = y - 0.24 * gy / (math.sqrt(sy) + 1e-8)
    if 0.05 * x * x + 2 * y * y < goal and hit_rms is None:
        hit_rms = t + 1

print("共同起点:", round(x0, 2), round(y0, 2))
print("普通 GD  :", announce(hit_gd))
print("动量     :", announce(hit_mom))
print("RMSProp  :", announce(hit_rms))
```

典型战报：动量 34 步撞线、RMSProp 45 步、普通 GD 要磨蹭 126 步。注意两个细节：动量的领先来自**冲刺惯性**而不是更大步长（学习率三家相同）；RMSProp 撞线后会在谷底附近绕一个半径约 $0.1$ 的小圈——步幅归一化让它"永远不知道该刹车"，这是自适应方法的经典余震。

### 实验 3：画出三条损失曲线

```python title="同一场比赛的对数记分牌"
import math                               # sqrt 用于 RMSProp 的均方根
import random                             # 重演一遍比赛：各代码块变量互不共享，需自带全套
import matplotlib.pyplot as plt           # 绘图库：画三条损失曲线

random.seed(7)                            # 与实验 2 相同的种子和起点，保证两局一致
x0 = random.uniform(-10, -8)
y0 = random.uniform(1.5, 2.5)
N = 600                                   # 这次画完全程

seqs = {"普通 GD": [], "动量": [], "RMSProp": []}   # 字典：名字 -> 损失序列

x, y = x0, y0
for t in range(N):
    gx, gy = 0.1 * x, 4 * y               # 梯度直接写在循环里，三个选手共用同一公式
    x = x - 0.24 * gx
    y = y - 0.24 * gy
    seqs["普通 GD"].append(0.05 * x * x + 2 * y * y)   # append：把损失追加到列表尾部

x, y, vx, vy = x0, y0, 0.0, 0.0
for t in range(N):
    gx, gy = 0.1 * x, 4 * y
    vx = 0.9 * vx + gx                    # 动量累积历史梯度
    vy = 0.9 * vy + gy
    x = x - 0.24 * vx
    y = y - 0.24 * vy
    seqs["动量"].append(0.05 * x * x + 2 * y * y)

x, y, sx, sy = x0, y0, 0.0, 0.0
for t in range(N):
    gx, gy = 0.1 * x, 4 * y
    sx = 0.9 * sx + 0.1 * gx * gx         # 均方滑动平均
    sy = 0.9 * sy + 0.1 * gy * gy
    x = x - 0.24 * gx / (math.sqrt(sx) + 1e-8)
    y = y - 0.24 * gy / (math.sqrt(sy) + 1e-8)
    seqs["RMSProp"].append(0.05 * x * x + 2 * y * y)

fig, ax = plt.subplots(figsize=(7, 3))     # 新建画布与坐标轴
for name, seq in seqs.items():             # items()：同时取出字典的键与值
    ax.plot(range(len(seq)), seq, label=name)
ax.set_yscale("log")                       # 对数纵轴：指数过程变直线
ax.set_xlabel("step")
ax.set_ylabel("loss")
ax.legend()
ax.grid(True)
```

对数纵轴下读图三条信息：普通 GD 的线在高位赖着慢慢挪；动量的线抢先俯冲到底；RMSProp 一路平推、却在底部留下一层明显的"抖动带"。图像与实验 2 的战报逐条对上——损失每降一个数量级要多少步，一眼可见。


### 快问快答

```quiz
RMSProp 对每个坐标除以历史梯度平方的平均开根号，最大的收益是什么？
- 从此再也不用调学习率了
- 陡峭方向自动收小步幅、平缓方向维持大步，一圈地形一个节奏 [*]
- 保证一定找到全局最优
? 它做的是"逐坐标分道限速"，缓解病态曲率带来的磨蹭；学习率本身依然要调，全局最优也与它无关。
```

:::warning[常见误区]

**误区一**："动量只会更快。" 惯性同样会放大超调：陡峭维度来回荡秋千。实践里动量常配合**较小的学习率**一起出场，快速与稳当互相找平衡。

**误区二**："用了 Adam 就不用调参。" $\epsilon$ 取太小时分母照样翻车，$\beta$、$\eta$ 各有脾气；Adam 只是降低了与地形的耦合，没有发放免调参金牌。

**误区三**："动量和 RMSProp 选一个就够了。" 它们治理的是两种病：动量治理**方向不齐**（震荡抵消），RMSProp 治理**尺度悬殊**（条件数）。病态山谷两病并发，所以 Adam 把两位医生请进同一间诊室。

:::

## 6. 练习

**练习 1**（概念）：把动量公式里的 $\beta$ 分别设成 $0$ 和趋近于 $1$，会发生什么？

<details>
<summary>点开查看逐步解答</summary>

$\beta=0$ 时 $v=g$，动量公式退化为普通梯度下降——没有惯性可言；$\beta$ 逼近 1 时几乎不过期遗忘，积攒的速度巨大，一方面冲刺猛、另一方面"刹车距离"变长，超调和震荡迟迟收不住。常用值 $0.9$ 大意是"平均近十步的意见"，是从迟钝与灵敏之间试出来的甜点位。
</details>

**练习 2**（判题）：一段缓坡上（$f(x)=0.05x^2$，导数只有 $0.1x$）普通 GD 爬得极慢。初始代码想改装成动量版，却把关键一行写错了——历史速度每步都被清空。修好它，让两行步数输出命中：

```exercise
# @title: 练习：把慢爬的梯度下降改装成动量加速
# @check: 88
# @check: 25
# @hint: 动量的灵魂是把历史存下来：v 应改为 beta*v + g（即 0.9*v + g）再去更新 x。
def grad_slow(x):
    return 0.1 * x          # 缓坡 f(x)=0.05*x^2 的导数

eta = 0.4                    # 两种方法使用同一个学习率

steps_plain = 0              # 步数计数器
x = 18.0                     # 出发位置
while abs(x) > 0.5 and steps_plain < 5000:   # 双保险：距谷底够近或到上限就停
    x = x - eta * grad_slow(x)
    steps_plain = steps_plain + 1
print(steps_plain)           # 普通 GD 的步数

v = 0.0                      # 速度槽：存放历史梯度信息
x = 18.0
steps_mom = 0
while abs(x) > 0.5 and steps_mom < 5000:
    g = grad_slow(x)
    v = g                    # ← 错了：每步覆盖旧速度，惯性凭空消失
    x = x - eta * v
    steps_mom = steps_mom + 1
print(steps_mom)             # 修好后应远小于普通版的步数
```

修好后输出 `88` 和 `25`：同样的小步幅，动量让缓坡上的行程缩短到不足三分之一。改错前的版本会打出 `88, 88`——两句一样就是"动量没生效"的铁证。

**练习 3**：回到实验 2 的赛场，把动量系数改成 $0.5$ 和 $0.99$ 各跑一局，观察撞线步数怎么变。

<details>
<summary>点开查看逐步解答</summary>

$\beta=0.5$ 记忆短，冲刺劲头打了对折，步数明显回升但仍快过普通 GD；$\beta=0.99$ 惯性巨大，可能更快撞线也可能因为余波绕圈反而变慢——它对学习率也更敏感。结论不是"越大越好"，而是**惯性与步长要搭配调试**：两者一起决定这颗球在山谷里的性格。
</details>

## 7. 选读：加速是有理论刻度的

<details>
<summary>选读 · 重球法的平方根折扣</summary>

对条件数为 $\kappa=\lambda_{\max}/\lambda_{\min}$ 的凸二次型，普通 GD 用最优学习率时的最差收缩率约为 $(\kappa-1)/(\kappa+1)$；重球动量把它压到约 $(\sqrt{\kappa}-1)/(\sqrt{\kappa}+1)$。条件数 $900$ 时，前者约 $0.998$（走一千步缩水一个数量级），后者约 $0.959$（一百步缩水超过两个数量级）——开方正是动量的数学回报。1983 年 Polyak 提出重球法只盯着二次型，2014 年 Adam 把"动量思想 + 二阶矩归一化 + 偏差修正"打包给非凸的神经网络世界，如今已是深度学习论文脚注里的默认角色。

</details>

## 8. 下一站

三位选手分享同一个起点、同一条梯度公式，爽快地跑完了比赛。但如果训练数据有百万条样本，"每步算全体梯度"本身就是奢侈——下一课我们开始抽签：一次只问一小撮数据的意见，让噪声成为路友而不是路障。

→ [随机梯度下降与噪声](./70-sgd-noise.md)
