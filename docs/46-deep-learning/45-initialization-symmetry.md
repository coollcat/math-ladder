---
title: 初始化、对称性与梯度尺度
lesson_id: deep-learning/initialization-symmetry
prereqs:
  - deep-learning/backprop
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
  - symmetry-breaking
  - xavier-he-initialization
applications:
  - training-stability
exits:
  - data-ai
---

# 初始化、对称性与梯度尺度

## 1. 从一个场景开始

流水线上两名工人领到**一模一样的工具、一模一样的工位说明**，然后开始各自拧螺丝。不管干多少轮，两人的产出永远步调一致——因为他们收到的一切指令都相同，犯错也犯在同一处。想让他们分工，必须从一开始就给他们**不同的起点**。

神经网络同一层的神经元如果初始化成同样的权重，反向传播回来给它们的梯度也一字不差——更新之后依然一模一样。一百个神经元集体沦为一个人的复读机：这就是**对称死锁**。解药是随机初始化；但"乱给"又有讲究——给的太猛信号爆炸、给的太怯信号消失。本课回答一个问题：**起跑线画在哪？**

## 2. 直觉解释

**核心直觉：信号穿层时方差像传声筒，放大还是衰减由权重的"嗓门方差 × 输入路数"决定。**

一个线性层的输出 $a = w_1 x_1 + w_2 x_2 + \cdots + w_n x_n$ 是 $n$ 路独立信号的和。第 09 章"独立变量方差相加"的规则立刻给出：

$$\mathrm{Var}(a)=\underbrace{n}_{\text{路数}}\cdot \underbrace{\mathrm{Var}(w)}_{\text{单个权重嗓门}}\cdot \underbrace{\mathrm{Var}(x)}_{\text{信号当前强度}} .$$

想让信号一层层传下去不肥不瘦（$\mathrm{Var}$ 保持不变），就必须满足

$$\mathrm{Var}(w)=\frac{1}{n}.$$

三个后果立刻浮现：

| 若 $\mathrm{Var}(w)$ | 每过一层 | 20 层连乘的结局 |
| --- | --- | --- |
| 太大（如 $2/n$） | 方差 ×2 | $2^{20}\approx10^{6}$ —— 输出爆炸 |
| 太小（如 $0.5/n$） | 方差减半 | $2^{-20}\approx10^{-6}$ —— 输出气若游丝 |
| 恰好 $1/n$ | 保持 | 数值安稳 |

## 3. 正式定义

权重初始化的两条公理：

1. **打破对称**：同一层任意两个神经元的初始权重向量不得相同（实践中：从连续分布抽样，撞车概率为零）；
2. **控制尺度**：让前向信号方差逐层守恒。经典配方：

| 配方 | 方差 | 适用 |
| --- | --- | --- |
| Xavier/Glorot | $\mathrm{Var}(w)=\dfrac{1}{n_{\text{in}}}$ | tanh/sigmoid 等双向激活 |
| He(Kaiming) | $\mathrm{Var}(w)=\dfrac{2}{n_{\text{in}}}$ | ReLU 家族 |

He 配方里的因子 2 来自一个残酷事实：ReLU 把负半轴直接清零——一半信号被杀，输出方差恰好腰斩；想在下一层维持同样音量，进门的方差就得先翻倍补偿。

## 4. 分步例题

**问**：某层有 60 个输入，激活用 ReLU。按 He 配方，每个权重应从标准差多大的分布中抽取？

1. He 要求 $\mathrm{Var}(w)=2/60$；
2. 标准差 = 方差开根号：$\sigma=\sqrt{2/60}=\sqrt{0.03333}\approx 0.1826$；
3. 对照 Xavier：$\sqrt{1/60}\approx0.1291$——两者的比值恰为 $\sqrt2\approx1.414$（那一倍的损失就补在这里）。

顺手算一下"忘开根号"的经典笔误：把 0.0333 当作标准差直接用，等价于方差取了 $0.0011$——信号每层缩水到原来的千分之一量级，深层必然消亡。

## 5. 动手实验

固定种子跑一次"20 层深度电梯"，观察两种配方的差别：

```python title="二十层方差的两种命运"
import random                       # 第 0 章的老朋友
random.seed(46)                     # 固定种子保证复现

def one_signal_chain(var_w, depth, n_in):
    """信号穿过 depth 个线性层后的实际方差（模拟估计）。"""
    xs = []                          # 这一批输入同时出发，逐层看它们的方差
    for i in range(200):
        xs.append(random.gauss(0, 1))
    for _ in range(depth):
        nxt = []
        for value in xs:
            acc = 0.0
            for _ in range(n_in):    # n_in 路求和近似线性层（忽略偏置）
                acc += value * random.gauss(0, var_w ** 0.5)
            nxt.append(acc)
        xs = [v / n_in for v in nxt] # 方差按 n·Var(w) 放大后此处整体归位，便于对照
    return sum(v * v for v in xs) / len(xs)

for name, vw in [("Xavier 1/n", 1 / 64), ("偏小 0.5/n", 0.5 / 64)]:
    est = one_signal_chain(vw, 20, 64)
    print(name, "->", round(est, 5))     # Xavier 档应稳定在 1 附近；偏小档趋近 0
```

输出里 Xavier 行稳稳落在 `1` 左右，偏小行一路滚向 `0`——这就是"信号蒸发"的数值实证。把 `vw` 改成 `2.5/64` 再跑，你会得到巨大的数字（梯度爆炸的前奏）。

## 6. 常见误区

:::warning[常见误区]

- **"全都初始化成 0 最干净"** —— 0 初始化是最严重的对称死锁：每个神经元完全一致，网络等效宽度为 1。（偏置 b 可以安全置 0，因为打破对称靠的是 w。）
- **"He 比 Xavier 新所以通用"** —— 因子 2 是给 ReLU 的半轴损耗准备的；tanh 双向激活用它反而会让信号翻倍膨胀。配方跟着激活函数走。
- **"初始化决定一切"** —— 它只是让前几轮训练站在可行区；与它配套的第 55 课归一化、第 75 课学习率调度共同组成训练稳定三件套。

:::

## 7. 练习

初始代码把"方差"当成了"标准差"，还漏了 ReLU 补偿——修到三条检查通过：

```exercise
# @title: 起跑线上的两个数字
# @check: 0.1291
# @check: 0.1826
# @check: 0.7071
# @hint: 先算方差再开根号；He 配方分子是 2；最后一行问 Xavier/He 的标准差之比——顺便验一下 √0.5 是多少
def weight_sigma(n_in, recipe):
    return recipe / n_in            # ← 返回的是方差，不是标准差！而且 He 还差一个因子

print(round(weight_sigma(60, 1), 4))       # Xavier：标准差 √(1/60)
print(round(weight_sigma(60, 2), 4))       # He：标准差 √(2/60)
print(round(weight_sigma(60, 1) ** 0.5 / weight_sigma(60, 2) ** 0.5, 4))   # 两配方之比
```

<details>
<summary>点开查看逐步解答</summary>

修正版一行即可：

```python
def weight_sigma(n_in, recipe):
    return (recipe / n_in) ** 0.5     # 先定方差 recipe/n_in，再开根号成标准差

print(round(weight_sigma(60, 1), 4))   # 0.1291
print(round(weight_sigma(60, 2), 4))   # 0.1826
print(round(weight_sigma(60, 1) / weight_sigma(60, 2), 4))   # 0.7071
```

第三行的比值为 $\sqrt{(1/60)/(2/60)}=\sqrt{0.5}=0.7071$——Xavier 的"嗓门"天然比 He 小一号，因为 ReLU 已经替它多扛了一倍的损耗。初始代码的三处毛病：返回值没开根号、He 档少乘 2、第三行对已错误的结果再做无意义的开根号。
</details>

## 8. 选读证明：Glorot 的前后兼顾

<details>
<summary>选读：为什么 Xavier 用的是 1/n_in（或者 sometimes 2/(n_in+n_out)）</summary>

只保前向给出 $\mathrm{Var}(w)=1/n_{\text{in}}$；只保反向（梯度$\delta$ 的方差沿层回传守恒）给出 $\mathrm{Var}(w)=1/n_{\text{out}}$。当 $n_{\text{in}}\neq n_{\text{out}}$ 时两头无法同时精确满足，Glorot 建议折中：

$$\mathrm{Var}(w)=\frac{2}{n_{\text{in}}+n_{\text{out}}}.$$

推导要点只有两条既有事实：误差信号 $\delta=\partial L/\partial a$ 反向经过线性层时方差乘上 $n_{\text{out}}\cdot\mathrm{Var}(w)$（与正向对称）；双向激活在原点附近近似恒等映射，斜率因子视作 1。两个方程联立、调和平均收尾——全部素材就是第 09 章方差相加加上一句"对称性要求"。
</details>

## 9. 下一站

起跑线画好了。不过全连接网络看图还有一块心病：参数随图像大小暴涨——下一课给网络换上一枚会"扫着看"的小印章：[卷积与权值共享](./48-convolution-sharing.md)。
