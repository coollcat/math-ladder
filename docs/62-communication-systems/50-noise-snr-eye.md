---
title: AWGN、SNR 与眼图
lesson_id: communication-systems/noise-snr-eye
prereqs:
  - communication-systems/ask-fsk-psk
  - prob/stats
volume: 5
layer: L11
track:
  - information-learning
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - awgn
  - snr
  - bit-error-rate
applications:
  - link-quality-test
  - receiver-debug
exits:
  - engineering
---

# AWGN、SNR 与误码：噪声如何挤扁一只眼睛

## 1. 从一个场景开始

深夜的高速路上迎面开来两辆车：灯光分得很开，你一眼分辨；若是大雾天两束光晕成一片，就只能猜。接收机面对的就是这条「路」——发送的电平是那两束车灯，噪声是雾。

实验室里，工程师把千万段接收波形叠画在同一张图上，得到一张中间空透、形如眼睛的图案。**眼睛张得越开，链路越健康**；噪声与抖动一点点把眼皮压下来，压到闭拢的那天，误码率爆炸。本课给「雾」建立数学模型，并把「眼睛」变成可计算的量。

## 2. 直觉解释

通信工程的标准反派叫 **AWGN**（加性高斯白噪声），三个定语各管一事：

- **加性**：噪声是「叠加」在信号上的独立坏东西——收到 = 发送 + 噪声；
- **白**：功率在所有频率上均匀分布（像白光含全部颜色）；
- **高斯**：每个时刻的噪声值服从正态分布——大量微小干扰源叠加的必然结果（第 36 章中心极限定理的老朋友）。

对抗它的本钱用**信噪比 SNR** 度量：信号功率除以噪声功率。工程师偏爱分贝刻度：SNR 每多 6 dB，相当于电压上的噪声余量翻倍——眼睛重新睁开一圈。

## 3. 正式定义

发送二电平符号 $s \in \lbrace -A, +A\rbrace$（花括号记取值集合），接收端得到

$$r = s + n, \qquad n \sim \mathcal{N}(0, \sigma^2)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\sigma$ | 噪声标准差 | 雾的浓度；越大越难分辨 |
| $P_s = A^2$ | 信号功率 | 电平的平方 |
| $P_n = \sigma^2$ | 噪声功率 | 方差即平均噪声能量 |
| SNR | 信噪比 | $P_s / P_n$；分贝值 $= 10\log_{10}(P_s/P_n)$ |
| BER | 误码率 | 判决错误的比特占比，链路的期末成绩 |

判决规则朴素至极：$r > 0$ 判 $+A$，否则判 $-A$（判决门限居中）。误码发生在「发 −A 却加上了超过 A 的正噪声」这类时刻；SNR 越高，正态尾巴越过门限的概率呈指数级缩小——这就是为什么 BER 对 SNR 极其敏感。

## 4. 分步例题

**例**：发送 ±1 电平，噪声标准差 $\sigma = 0.5$。求 SNR 与分贝值。

1. 信号功率：电平平方的期望 $P_s = 1$；
2. 噪声功率：$P_n = \sigma^2 = 0.25$；
3. 信噪比：$\mathrm{SNR} = 1 / 0.25 = 4$（4 倍）；
4. 分贝值：$10\log_{10}(4) \approx 6.0$ dB——工程口诀「6 dB 一重天」，每加 6 dB 噪声电压余量翻倍；
5. 直觉核对：噪声摆幅平均只有信号的一半，判决边界在 0 处留有整段安全区——眼睛半睁，误码偶发；若 σ 涨到 1（SNR=0 dB），雾与灯一样亮，约六分之一的判决要翻车（用本课选读的 $Q$ 函数可以精确算出：$Q(1)\approx 0.16$）。

## 5. 动手实验

### 实验 1（python 滑块）：雾中点列

```python title="拖动 sigma，看误码从尾巴里长出来"
# sliders: sigma=0.5 [0:1.5:0.1]
import random                    # 随机数库（卷一已引入）
import matplotlib.pyplot as plt

N = 400                          # 试验次数
errors = 0                       # 误码计数
rx = []                          # 接收值
tx = []                          # 发送电平

for i in range(N):
    sent = random.choice([-1, 1])           # 随机发一个电平
    r = sent + random.gauss(0, sigma)       # 加性高斯噪声
    guess = 1 if r > 0 else -1              # 门限判零
    if guess != sent:
        errors = errors + 1
    rx.append(r)
    tx.append(sent)

print(f"sigma={sigma}, 误码 {errors}/{N} = {round(errors / N, 3)}")

plt.figure(figsize=(7, 2.8))
plt.scatter(rx, tx, s=10, color="steelblue")
plt.axvline(0, color="tomato", linewidth=1)     # 判决门限
plt.yticks([-1, 1])
```

σ 从 0 拖到 1.5：右侧蓝团（发 +1）不断有成员越过红色门限叛逃到负半区——每一次越界都是一次误码。注意误码永远先从分布的**尾巴**开始冒头，而不是从靠近门限的主体。

### 实验 2（python）：亲手画一只眼睛

```python title="叠加 40 段两比特波形，得到眼图"
import random                    # 随机数库
import matplotlib.pyplot as plt

pts = 16                         # 每比特的采样点数
noise = 0.35                     # 固定噪声强度便于对比
plt.figure(figsize=(7, 3))

for trial in range(40):          # 叠画 40 段随机双比特波形
    s1 = random.choice([-1, 1])
    s2 = random.choice([-1, 1])
    xs = []
    ys = []
    for i in range(2 * pts):
        base = s1 if i < pts else s2        # 前后半各是一个符号
        x = i / pts - 0.5                   # 时间轴以中点跳变为 0
        xs.append(x)
        ys.append(base + random.gauss(0, noise))
    plt.plot(xs, ys, color="steelblue", linewidth=0.6, alpha=0.5)   # alpha：透明度

plt.axvline(0, color="tomato", linewidth=1)
plt.axhline(0, color="gray", linewidth=0.8)
```

图中央那只「眼睛」的两只眼皮分别是 ±1 电平带，交叉处是跳变区。把 noise 改成 0.8 再跑：眼皮压向中线，睁开度缩水——判决余量肉眼可见地消失。真实示波器正是用「无限次叠加」画出这张体检图的。

### 快问快答

```quiz
SNR 从 6 dB 提升到 12 dB，意味着噪声电压余量大约变成原来的几倍？
- 2 倍 [*]
- 4 倍
- 不变，只是写法不同
? 分贝差 6 dB 对应功率比 10 的 0.6 次方约 4 倍，开方到电压幅度即 2 倍。工程师口中的「6 dB 一重天」说的就是眼图睁开度翻倍。
```

:::warning[常见误区]

**误区一**：「SNR 够高就万事大吉。」
噪声只是反派之一：时钟抖动、码间串扰、相位失真都会在 SNR 漂亮时独立弄翻判决。眼图的「宽度」（水平张开度）量的正是定时余量——眼睛不仅要睁得高，还要睁得宽。

**误区二**：「BER 是链路的固定属性。」
BER 随 SNR 呈指数变化：SNR 微降几分贝，BER 可能恶化一千倍。所以工程规格总写成「在 SNR ≥ x dB 时 BER ≤ y」，单报一个数都是耍流氓。

**误区三**：「高斯假设是数学家的洁癖。」
它是大量相互独立的小干扰叠加的极限形态（中心极限定理），有线与无线信道在多数场景都惊人地贴合。当然也有例外——脉冲型干扰（点火线圈、微波炉）是重尾巴的，那要靠交织与编码另行对付。

:::

## 6. 练习

**练习 1**：一份测试报告给了原始数据，请算出误码率与信噪比分贝值。代码能跑但两行都不对：

```exercise
# @title: 练习：从测试数据到 BER 与 SNR
# @check: 0.012
# @check: 6.0
# @hint: BER = 错误数 / 发送总数（别乘别的）；SNR = 信号功率 / 噪声功率，分贝值别忘了乘 10
import math

errors = 24                      # 判决错误的比特数
total = 2000                     # 发送的比特总数
sigma = 0.5                      # 噪声标准差

ber = errors / (total * 2)       # ← 问题在这：分母凭空翻倍了
snr_db = math.log10(1 / sigma ** 2)   # ← 问题在这：少了换算系数

print(round(ber, 3))
print(round(snr_db, 1))
```

修正后输出 0.012 与 6.0：每千比特错 12 个属于「勉强能用」，把 σ 减半即可换来 6 dB——误码率会断崖式下跌，这正是实验 1 里亲眼见过的指数效应。

**练习 2**：为什么眼图要在「最佳采样时刻」（眼睛最张处）判决？

<details>
<summary>点开查看逐步解答</summary>

眼图的水平轴是时间：跳变交叉区（眼角）波形混乱、电平未定；只有眼睛中央电平最稳定、离两个错误门限都最远。在最佳时刻采样等于用足全部垂直余量；采早或采晚了，同样的噪声更容易推过界。同步系统（70 号课）的全部意义就是死死咬住这个时刻。
</details>

## 7. 选读：误码率的解析形状

<details>
<summary>选读 · Q 函数一瞥</summary>

对 ±A 二电平系统可以精确算出 BER：需要噪声超过 A 才出错，故 $\mathrm{BER} = Q(A/\sigma)$，其中 $Q(x)$ 是标准正态尾部的积分。它的数值性格极其鲜明：x 每增加约 1，BER 掉一到两个数量级——SNR=4（6 dB）时 $\mathrm{BER}=Q(2)\approx 0.02$，SNR=16（12 dB）时已降到 $3\times10^{-5}$ 附近。这条陡峭曲线是整个数字通信的定心丸：只要挤进高 SNR 区间，「绝对可靠」就从幻想变成工程参数。

</details>

## 8. 下一站

有了 SNR 与 BER 这套度量衡，终于能回答通信理论最宏大的问题：一条给定带宽、给定信噪比的信道，**极限容量**到底是多少？1948 年香农用一个公式终结了争论。

→ [信道容量与香农极限](./85-shannon-capacity.md)
