---
title: 卷积与线性时不变系统
lesson_id: digital-signal-processing/convolution-lti
prereqs:
  - digital-signal-processing/sampling-aliasing
  - linalg/dot-product
  - python-tools/matplotlib
volume: 5
layer: L8
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - linear-time-invariant
  - impulse-response
  - convolution-sum
applications:
  - audio-reverb
  - sensor-smoothing
exits:
  - engineering
---

# 卷积与线性时不变系统

## 1. 从一个场景开始

在大教堂里拍一下手，声音会拖着长长的尾巴——每一面墙壁都把声音延迟、削弱后送回来一点。你听到的不是一声脆响，而是**无数次回声的叠加**。

机器里到处是同一个动作：手环心率数值乱跳，工程师让每个读数和它前面几个读数做平均；修图软件的模糊滤镜，是每个像素与周围像素加权平均。它们的共同名字叫**卷积**——数字信号处理的心脏。

## 2. 直觉解释

要预测一个系统对任意输入的反应，不必穷举所有输入。只需先问：**轻轻敲一下会发生什么？**

- 敲一下 = 输入只在第 0 拍为 1、其余全为零（单位冲激 δ[n]）。
- 系统对这一下的完整回答叫**冲激响应** h[n]：比如教堂里逐渐衰减的回声串。
- 任何输入都能拆成一串错开时间、高低不同的敲击（第 0 拍敲 3 下、第 1 拍敲 1 下……）。

只要系统守两条纪律，答案就能自己拼出来：

| 纪律 | 内容 | 推论 |
| --- | --- | --- |
| 线性 | 两倍输入产生两倍输出；多个输入各自响应再相加 | 每次敲击的回声按力度缩放 |
| 时不变 | 今天敲和昨天敲，回声形状相同只差平移 | 第 k 拍的敲击复制出平移 k 格的 h |

于是输出 = 所有「平移并缩放过的 h」叠起来。这个叠加的机械动作就是卷积：**翻转、滑动、逐位乘、求和**。

## 3. 正式定义

**线性时不变系统（LTI）**：同时满足线性与时不变的离散系统。它被自己的冲激响应 $h[n]$ 完全刻画。

**卷积和**：LTI 系统对输入 $x[n]$ 的输出

$$y[n] = \sum_{k} x[k]\, h[n-k]$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $x[n]$ | 输入序列 | 第 n 个样本进入系统 |
| $h[n]$ | 冲激响应 | 对单位冲激的全部回应，系统的指纹 |
| $y[n]$ | 输出序列 | 加权重叠的总效果 |
| $n-k$ | 时间差 | k 时刻的输入对现在残留了多深 |

下标 $n-k$ 里藏着那个**翻转**。为什么必须翻？因为 $h[n-k]$ 问的是「k 当时的那一下，留到现在还剩多少」——越早的敲击衰减越多，因果性自动写进了公式。全长输出的长度为 $L_x + L_h - 1$（两序列长度之和减一）。

## 4. 分步例题

**例**：$x = [3, 2]$，$h = [1, 2]$。求 $y = x * h$。

1. 列框架：输出长度 $2 + 2 - 1 = 3$；
2. $y[0] = x[0]h[0] = 3$（只有第 0 拍的输入够得到这里）；
3. $y[1] = x[0]h[1] + x[1]h[0] = 6 + 2 = 8$（两代输入重叠）；
4. $y[2] = x[1]h[1] = 4$（最后一代输入的余波）；
5. 所以 $y = [3, 8, 4]$。

## 5. 动手实验

### 实验 1（python）：亲手翻转、滑动、求和

```python title="卷积机：逐行打印每个位置的乘加"
import matplotlib.pyplot as plt  # 画图库（卷一已引入）

xs = [3, 2]                      # 输入序列
hs = [1, 2]                      # 冲激响应
L = len(xs) + len(hs) - 1        # len：列表长度；输出总长 3

ys = []                          # 输出账本
for n in range(L):               # 外层：输出每一个位置
    acc = 0                      # 本位置累加器清零
    for k in range(len(xs)):     # 内层：扫每个历史输入
        j = n - k                # 它对应 h 的第几位（含翻转！）
        if 0 <= j < len(hs):     # 越界说明两者此刻不重叠
            acc = acc + xs[k] * hs[j]
    ys.append(acc)
    print(f"y[{n}] = {acc}")

print("完整输出:", ys)
```

打印结果与例题一致：`[3, 8, 4]`。把 `hs` 改成 `[1, 0, 0, 0.5]` 再跑一次——那是「原声加四分之一强度延迟回声」，输出立刻有混响感。内层 `if` 只在窗口与历史重叠时记账，正是卷积图解里滑窗进出画面的过程。

### 实验 2（python 滑块）：滑动平均去毛刺

```python title="拖动窗口长度 M，看噪声被抹平"
# sliders: M=7 [1:19:2]
import math                      # 用 pi 和 sin
import random                    # 随机数库（卷一已引入）
import matplotlib.pyplot as plt

N = 120                          # 信号长度
clean = []                       # 干净真信号：两个正弦的叠加
for n in range(N):
    v = math.sin(2 * math.pi * 3 * n / N) + 0.5 * math.sin(2 * math.pi * 8 * n / N)
    clean.append(v)

noisy = []                       # 带毛刺的观测值
for n in range(N):
    noisy.append(clean[n] + random.uniform(-0.5, 0.5))   # uniform(a,b)：a~b 均匀随机数

smoothed = []                    # M 点滑动平均的结果
half = M // 2                    # 整除取半：窗口半径
for n in range(N):
    acc = 0
    count = 0                    # 实际进窗的点数（边界处不足 M 个）
    for k in range(max(0, n - half), min(N, n + half + 1)):
        acc = acc + noisy[k]
        count = count + 1
    smoothed.append(acc / count)

plt.figure(figsize=(7, 3.2))     # 新建画布（宽 7、高 3.2 英寸）
plt.plot(noisy, color="lightgray", label="noisy")
plt.plot(smoothed, color="tomato", linewidth=2, label=f"avg {M}")
plt.legend()
```

灰线是带噪观测，红线是滑动平均。M=1 时红线完全藏进灰线里（没滤波）；M=7 毛刺明显消退、波形轮廓保留；拖到 M=19 很光滑，但快速成分也被削平、峰被推迟——滤波永远是一场取舍。这个「窗口滑过序列」的动作，正是 $h$ 全等于 $1/M$ 时的卷积。

### 快问快答

```quiz
计算卷积 y = x*h 时，为什么 h 要先翻转再滑动？
- 纯粹是数学惯例，不翻结果也一样
- 为了让输出序列更长
- 因果性：现在的输出只由过去与现在的输入贡献，翻转把时间方向钉死 [*]
? 不翻转算出来的是互相关（衡量两串数据像不像），不是系统输出。h[n-k] 里「越早的输入衰减越多」的物理因果，靠的就是这个方向。
```

:::warning[常见误区]

**误区一**：「卷积就是相关，反正都是乘加。」
差一个翻转天壤之别：卷积回答「系统如何响应」，相关回答「两串数据像不像」。第 62 章的匹配滤波器正是「相关」当主角、卷积当配角的一课，别认混。

**误区二**：「任何系统都能用冲激响应描述任意输入。」
反过来说才对：正因为假设了线性与时不变，一次冲激实验才能外推到一切输入。放大器削波、人耳自动增益这类非线性行为，冲激响应法就失效了。

**误区三**：「输出长度和输入一样长。」
全长卷积输出长 $L_x + L_h - 1$。工程软件常默认返回「与输入同长」的截断版，初学者因此对不上手算答案是高频事故。

:::

## 6. 练习

**练习 1**：修好这台卷积机。目标输出 $y = [3, 8, 4]$（即例题的 $x=[3,2]$、$h=[1,2]$）。代码能跑但结果不对：

```exercise
# @title: 练习：修好这台卷积机
# @check: 3
# @check: 8
# @check: 4
# @hint: 卷积的时间差是 n-k（往回看历史）。代码把 h 的下标写成了 n+k，等于丢了翻转——两处下标都要改回时间差的方向
xs = [3, 2]
hs = [1, 2]

for n in range(3):
    acc = 0
    for k in range(len(xs)):
        if 0 <= n + k < len(hs):     # ← 问题在这：下一行的下标方向反了
            acc = acc + xs[k] * hs[n + k]
    print(acc)
```

修正两处 `n + k` 为 `n - k` 后逐行输出 3、8、4：第一拍只有 $x[0]$ 到达；第二拍 $3 \times 2 + 2 \times 1 = 8$；第三拍只剩 $x[1]$ 的余波 $2 \times 2 = 4$。

**练习 2**：在例题数字上验证卷积交换律 $x * h = h * x$。

<details>
<summary>点开查看逐步解答</summary>

交换角色重算：新输入 $[1, 2]$、新冲激响应 $[3, 2]$，则 $y'[0] = 1 \times 3 = 3$；$y'[1] = 1 \times 2 + 2 \times 3 = 8$；$y'[2] = 2 \times 2 = 4$——同为 $[3, 8, 4]$。一般证明只需在定义式中换元 $j = n - k$：所有配对乘积的集合不变，只是登记顺序不同。卷积世界里「谁滤谁」是相互的。
</details>

## 7. 选读：为什么一次敲击终身受用

<details>
<summary>选读 · 从两条纪律推出卷积公式</summary>

先把输入写成冲激的展开：$x[n] = \sum_k x[k]\,\delta[n-k]$——每个样本是一发强度为 $x[k]$、时刻 $k$ 的敲击。系统作用记作 $T$。线性允许分配：$T(x) = \sum_k x[k]\,T(\delta[n-k])$。时不变说冲激响应整体平移：$T(\delta[n-k]) = h[n-k]$。合并即得 $y[n] = \sum_k x[k]\,h[n-k]$。分解、分配、平移——三步，一步不多。频域视角的另一半更漂亮：时域卷积对应频域相乘，滤波器设计因此可以完全在「频率形状」上做文章，60 号课见。

</details>

## 8. 下一站

卷积引擎装好了，往里装什么权重大有讲究。最经典的配方是加权滑动平均——**FIR 滤波器**：系数怎么选、为什么它能挑频率、以及它的亲戚 IIR 有何不同。

→ [FIR 滤波器：加权滑动平均](./50-fir-iir.md)
