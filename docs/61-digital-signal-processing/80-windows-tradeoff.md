---
title: 窗函数与时频权衡
lesson_id: digital-signal-processing/windows-tradeoff
prereqs:
  - digital-signal-processing/dft-leakage
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
  - window-function
  - time-frequency-tradeoff
applications:
  - stft-spectrogram
  - eeg-time-freq
exits:
  - engineering
---

# 窗函数与时频权衡

## 1. 从一个场景开始

音乐软件的频谱瀑布图设置里藏着一个下拉框：Window —— Rectangular / Hann / Hamming / Blackman……选哪个？上一课已经证明：只要观察有限长，泄漏就逃不掉；但**泄漏的形状**掌握在你手里——矩形窗的旁瓣高耸（约 −13 dB），会把旁边的弱音埋掉；换一扇两端圆润的窗，旁瓣立刻矮下去几十个分贝。

天下没有免费的窗户：旁瓣变矮的代价是主瓣变胖——两个相邻频率从此糊成一团。本课把这笔交易摆在桌面上算清楚。

## 2. 直觉解释

矩形窗的问题出在**两端**：信号在窗口边缘被硬切，接缝跳变剧烈（正是泄漏的元凶）。既然如此，不如让信号在边缘「淡入淡出」——乘上一个中间高、两端平滑降到零的权重序列，这就是**窗函数**。

淡出抹平了接缝 → 高频旁瓣骤降；但淡出让有效数据集中在中央、等效窗长缩短 → 主瓣增宽，频率分辨率下降。一句话记住这场谈判：

**旁瓣高度管「惊扰邻居的程度」，主瓣宽度管「分清邻居的能力」，两者此消彼长。**

## 3. 正式定义

对样本 $x[n]$ 先加窗再作 DFT：$x_w[n] = w[n]\, x[n]$。常用窗（$n = 0, \ldots, N-1$）：

| 窗 | 公式 | 主瓣宽（桶） | 峰值旁瓣 |
| --- | --- | --- | --- |
| 矩形 | $w[n] = 1$ | 2 | 约 −13 dB |
| Hann（汉宁） | $w[n] = 0.5 - 0.5\cos\left(\frac{2\pi n}{N-1}\right)$ | 4 | 约 −31 dB |
| Hamming（海明） | $w[n] = 0.54 - 0.46\cos\left(\frac{2\pi n}{N-1}\right)$ | 4 | 约 −43 dB |
| Blackman（布莱克曼） | $w[n] = 0.42 - 0.5\cos\left(\frac{2\pi n}{N-1}\right) + 0.08\cos\left(\frac{4\pi n}{N-1}\right)$ | 6 | 约 −58 dB |

（表中数值为教科书常用参考值；dB 以主峰为 0 的相对高度。）注意 Hamming 并不把窗端点严格压到零——它给两端留了 8% 的余量，恰好把第一旁瓣抵消得更深。加窗后谱峰读数普遍偏低，需要除以窗的**相干增益**（矩形 1.0、Hann 与 Hamming 约 0.5）来校正幅度。

## 4. 分步例题

**例**：$N = 64$，求 Hann 窗与 Hamming 窗在中点 $n = 16$ 处的权重。

1. 通分角度：$\dfrac{2\pi \times 16}{64-1} = \dfrac{32\pi}{63} \approx 1.5957$ 弧度；
2. 余弦值：$\cos(1.5957) \approx -0.0249$；
3. Hann 权重：$0.5 - 0.5 \times (-0.0249) \approx 0.512$，保留两位小数是 **0.51**；
4. Hamming 权重：$0.54 - 0.46 \times (-0.0249) \approx 0.551$，即 **0.55**；
5. 观察：中点附近两窗几乎一样重（都接近半满），差别全在两端——Hann 归零、Hamming 留 8%。别小看这 8%，它就是 −31 与 −43 dB 之间的距离。

## 5. 动手实验

### 实验 1（viz）：窗形的胖瘦与高矮

```viz
{
  "type": "plot",
  "title": "三扇窗的形状：矩形 / Hann（蓝） / Hamming（橙虚线）",
  "expr": "0.5 - 0.5*cos(2*pi*x)",
  "expr2": "0.54 - 0.46*cos(2*pi*x)",
  "xmin": 0,
  "xmax": 1,
  "label": "hann"
}
```

横轴是窗内归一化位置，纵轴是权重。矩形窗是恒为 1 的水平直线（图外想象一下）：最「实」但边缘最硬。Hann 与 Hamming 几乎重合，只在两端分道扬镳——正是这毫厘之差决定了旁瓣高度差一个数量级。

### 实验 2（python 滑块）：同一根音，三种窗的谱对比

```python title="拖动音频率 f，比较矩形与 Hann 窗的泄漏山"
# sliders: f=5.5 [4:8:0.5]
import math                      # 用 pi、sin、cos 和 hypot
import matplotlib.pyplot as plt  # 画图库（卷一已引入）

N = 64                           # 窗口长度
fs = 64                          # 采样率：桶宽 1 Hz
raw = []                         # 原始正弦样本
for n in range(N):
    raw.append(math.sin(2 * math.pi * f * n / fs))

w_rect = []                      # 矩形窗：原样保留
for n in range(N):
    w_rect.append(raw[n])

w_hann = []                      # Hann 窗：淡入淡出
for n in range(N):
    v = 0.5 - 0.5 * math.cos(2 * math.pi * n / (N - 1))
    w_hann.append(raw[n] * v)

def mag(data, k):                # 第 k 桶幅度
    re = 0.0
    im = 0.0
    for n in range(N):
        ang = 2 * math.pi * k * n / N
        re = re + data[n] * math.cos(ang)
        im = im - data[n] * math.sin(ang)
    return math.hypot(re, im) / N

def spread(data):                # 幅度超 0.05 的桶数（山的占地）
    s = 0
    for k in range(1, N // 2):
        if mag(data, k) > 0.05:
            s = s + 1
    return s

print(f"矩形窗: 峰 {round(mag(w_rect, round(f)), 3)}, 占地 {spread(w_rect)} 桶")
print(f"Hann窗: 峰 {round(mag(w_hann, round(f)), 3) * 2}, 占地 {spread(w_hann)} 桶")

plt.figure(figsize=(7, 3))
plt.plot([mag(w_rect, k) for k in range(32)], color="gray", label="rect")
plt.plot([2 * mag(w_hann, k) for k in range(32)], color="tomato", label="hann x2")
plt.legend()
```

f=5.5 时典型打印：矩形窗峰约 0.31、占地 8 桶；Hann 窗（幅度已乘 2 校正相干增益）峰反升到约 0.42、**占地骤缩到 2 桶**，两侧涟漪几乎归零。把 f 拖回整数 5.0：两窗都干净，但 Hann 的主瓣更胖——邻桶被明显抬起。这就是权衡的现场：Hann 用「稍糊」换「不惊扰」。

### 快问快答

```quiz
要捕捉鼓点这类短促瞬态在时间上的准确位置，频谱分析该选？
- 越长的窗越好，频率信息最全
- 短窗：时间定位准，代价是频率分辨率变粗 [*]
- 换 Blackman 窗就能两全其美
? 时频不确定性是一笔硬账：窗越短，你越知道「何时」，越不知道「何频」。瀑布图正是用一串滑动短窗来同时保住两个维度的概貌——没有任何窗能绕开这笔交易。
```

:::warning[常见误区]

**误区一**：「Blackman 旁瓣最低，永远选它。」
它的主瓣宽达 6 桶：相邻频率直接糊死。分辨双音用 Hann/矩形，压制动态范围大的弱信号泄漏才轮到 Blackman。选窗先问场景。

**误区二**：「加窗后谱峰矮了，说明信号变弱了。」
信号没变弱，是窗的相干增益（Hann 约 0.5）摊薄了读数。工程谱仪都会自动乘回校正系数；实验 2 里打印前的 ×2 就是这件事的赤膊版。

**误区三**：「窗只影响频率轴。」
短窗让每个时刻只覆盖一小段数据——时域定位变好。STFT（短时傅里叶）就是靠沿时间滑动加窗，把这一权衡画成一张二维瀑布图；想跳出固定窗长的框框，那是小波变换的故事了。

:::

## 6. 练习

**练习 1**：计算 N=64 的窗权重。代码能跑但答案不对：

```exercise
# @title: 练习：Hann 与 Hamming 的中点权重
# @check: 0.51
# @check: 0.55
# @hint: 分母是 N-1=63 而不是 N！两端压到零的约定要求最后一个样本恰好走完整个余弦周期
import math

N = 64
n = 16                            # 中点附近的考察位置

w_hann = 0.5 - 0.5 * math.cos(2 * math.pi * n / N)       # ← 问题在这：分母写错
w_hamming = 0.54 - 0.46 * math.cos(2 * math.pi * n / N)

print(round(w_hann, 2))
print(round(w_hamming, 2))
```

把分母改成 `N - 1` 后输出 0.51、0.55。顺带观察：若把 n 取成 N-1=63，Hann 权重恰为 0——这就是「两端归零」约定的来历，也是它比矩形窗旁瓣低二十多个分贝的原因。

**练习 2**：脑电 α 波（约 10 Hz）与一个幅度只有它 5% 的 14 Hz 弱成分混在一起。用矩形窗还是 Hann？

<details>
<summary>点开查看逐步解答</summary>

矩形窗第一旁瓣约 −13 dB（约为主峰的 20%），比弱成分（5%）还高——α 泄漏的涟漪会淹没 14 Hz 处的真实小山，造成「这里什么都没有」的误诊。Hann 的 −31 dB（约 3%）低于 5%，弱峰得以探头。结论：检测「大信号旁边的弱信号」优先低旁瓣窗；这正是临床时频分析默认 Hann/Hamming 家族的原因。
</details>

## 7. 选读：为什么 Hamming 两端不归零反而更矮

<details>
<summary>选读 · 一阶导数与旁瓣抵消</summary>

Hann 是升余弦 $0.5-0.5\cos$：端点为零且一阶导数为零，「淡出」极其从容，但窗谱的第一旁瓣相位恰好与主瓣同号叠加到 −31 dB 就止步。Hamming 把系数微调为 $0.54-0.46$，故意在端点留 0.08 的高度：这点残留产生的旁瓣与主旁瓣**反相**，几乎精确抵消第一旁瓣，峰值旁瓣直落 −43 dB。代价是远端旁瓣衰减变慢。工程里还有 Kaiser 窗用一个可调参数在整条权衡曲线上自由取点——万变不离本课的谈判桌：主瓣宽度与旁瓣高度，二者只能交换、不能全赢。

</details>

## 8. 下一站

数字信号处理的主线到此打通：采样把世界搬进数字，卷积给了加工引擎，FIR/IIR 是引擎上的刀具，DFT 与窗函数让你看清频域战场。下一章把这些工具全部押上通信战场——把比特变成波形，再把波形从噪声里抢回来。

→ [第 62 章 · 通信系统](../62-communication-systems/index.md)
