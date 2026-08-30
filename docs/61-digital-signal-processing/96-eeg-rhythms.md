---
title: 脑电节律与伪迹地图
lesson_id: digital-signal-processing/eeg-rhythms
prereqs:
  - digital-signal-processing/sampling-aliasing
  - digital-signal-processing/fir-iir
  - digital-signal-processing/dft-leakage
  - digital-signal-processing/windows-tradeoff
volume: 5
layer: L8
track:
  - analysis-change
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - eeg-rhythm-bands
  - spectrum-line-identification
  - artifact-triage
applications:
  - eeg-recording
  - clinical-neurophysiology
exits:
  - engineering
  - data-ai
---

# 脑电节律与伪迹地图

## 1. 从一个场景开始

本章开篇的[实战挑战](./index.md)里，那台忘装抗混叠滤波器的脑电台已经让你领教过伪装术：60 Hz 直采时，50 Hz 的市工频残留折成假频，堂而皇之地顶替了 10 Hz 的 α 节律——你以为受试者放松得很好，其实看的是墙里电线的心跳。后来你给台子装上抗混叠滤波、按临床指南（ACNS 建议常规脑电采样不低于 256 Hz，正是[采样与混叠](./10-sampling-aliasing.md)那笔账）重新采样，混叠惨案不再发生。可屏幕上还是一条抖动的曲线：**大脑在说话，但谱还没读**。

时域里一锅粥的曲线，作一次 DFT 后立刻自报家门：枕区立着一座 10 Hz 的山头，50 Hz 处钉着一根细得扎眼的谱线。本课只学一件事——**读脑电的图谱线**：大脑自己的节律住在哪几层楼、不请自来的伪迹各自长什么样、看见了该怎么开处置单。至于把搅在一起的源干净拆开的数学，那是下一课 ICA 的事，这里一个字不讲。

## 2. 直觉解释

把大脑想成一座**广播大楼**：不同楼层各驻着一批电台，各自占用固定的频段。神经科学按频率给楼层起了名——1~4 Hz 的 δ 层（深睡）、4~8 Hz 的 θ 层（嗜睡）、8~13 Hz 的 α 层（闭眼放松时枕区最旺）、13~30 Hz 的 β 层（睁眼专注）。这是公开的生理学事实，也是全世界脑电室共用的「节目单」。闭眼放松时枕区 α 独大，一睁眼 α 就被压制——电台换班了，频率表可没变。

读谱就是**拿节目单对频率认台**。而伪迹是不请自来的插播，各有各的长相：

- **工频干扰**：墙里电线漏进来的市电（中国 50 Hz），在谱上是一根**钉死不动的细线**——整点报时的固定广告位，常还带着 100 Hz 的倍频伴舞；
- **眨眼伪迹**：眼球角膜与视网膜之间天然存在电位差，眨眼时眼皮一合，这个电位经头皮传进额区电极——低频、大幅、集中在**前额**；
- **肌电**：咬牙、皱眉、绷脖子时肌肉的放电，铺满高频段的**一地毛刺**。

时域里它们和脑波搅成一团；到了频谱上，各有各的座位号。**先认台，再谈内容**——这就是整张伪迹地图的读法。

## 3. 正式定义

对采样率 $f_s$ 的一段 $N$ 点脑电，第 $k$ 桶幅度沿用[ DFT 与频谱泄漏](./60-dft-leakage.md)的定义：

$$|X[k]| = \frac{1}{N}\left| \sum_{n=0}^{N-1} x[n]\, e^{-2\pi i kn/N} \right|$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\Delta f = f_s / N$ | 桶宽 | 相邻两桶相差的赫兹数；$f_s=256$、$N=1024$ 时每桶 0.25 Hz |
| 节律带 | band | 按频率划分的大脑电台楼层：δ 1–4 / θ 4–8 / α 8–13 / β 13–30 Hz |
| 谱线 | spectral line | 能量集中在单一频率的细峰，如 50 Hz 工频 |
| 宽谱 | broadband | 能量摊在一段连续频率上的毛刺，如肌电 |

读谱前还有两件本课前几课备好的工具：想让谱峰干净利落，截取窗口要让目标频率落在整数桶上（60 号课的 on-bin 账）；真实数据带噪声、怕旁瓣惊扰弱峰，加窗从 Hann 起手（[窗函数与时频权衡](./80-windows-tradeoff.md)的谈判桌）。

## 4. 分步例题

一段临床规格的脑电：$f_s = 256$ Hz、$N = 1024$ 点（恰好 4 秒）。读它，只走四步。

**第 1 步 · 算桶宽**：$\Delta f = 256 / 1024 = 0.25$ Hz。谱上每一格是 0.25 Hz，4 秒观察给了我们够细的刻度。

**第 2 步 · 找节律**：全谱最强峰立在 40 号桶——$40 \times 0.25 = 10$ Hz，落在 α 层（8–13）。受试者闭眼放松，枕区 α 独大，对上了节目单。θ、β 楼层只有矮矮的噪底小丘，没有山头。

**第 3 步 · 认伪迹**：50 Hz 处（200 号桶）立着一根细线，高度约是 α 峰的三成——节律带止于 30 Hz，30 以上没有大脑电台，这根线只有一个身份：**工频**。再往左看，1 Hz 以下还趴着一座大幅宽山，探到 0 号桶附近——低于 δ 层的地基晃动，是眨眼尾迹与电极漂移的地盘。

**第 4 步 · 开处置单**：认清身份，处置路线立刻分明——

| 谱上长相 | 身份 | 处置路线 |
| --- | --- | --- |
| 一根细线钉死在 50 Hz（常带 100 Hz 倍频） | 工频干扰 | 陷波器精确切除：FIR 的灭点摆到 50 Hz（[ FIR 滤波器](./50-fir-iir.md)） |
| 1 Hz 以下的缓漂与大幅宽山 | 电极漂移、眨眼尾迹 | 高通：把地基以下的晃动整个滤走 |
| 高频段一地毛刺 | 肌电（咬牙、皱眉、颈肌） | 低通收敛 + 记录时放松：滤波只能截，不能挑 |
| 与大脑节律同层楼的大幅源（眨眼 vs 慢波） | **源混叠** | 滤波按频率切、切不开 → 下一课 ICA 按**源**切 |

这张表就是本课的地图。前三行是「按频率切」能解决的；第四行是它的边界——频率上抱团的两个源，滤波刀法再精也无能为力。

## 5. 动手实验

### 实验 1（viz）：一座乱麻，两根谱线

```viz
{
  "type": "spectrum",
  "title": "拖动频率1 穿过四层节律带；频率2 钉在 50——工频细线纹丝不动",
  "f1": 10,
  "a1": 1,
  "f2": 50,
  "a2": 0.12
}
```

上面的时域线是一团乱麻，下面的频谱立刻把住户点名。把「频率1」从 1 拖到 30：山头依次穿过 δ、θ、α、β 四层楼；「频率2」钉在 50 不动——工频广告位从不换台。这份「时域看不出、频域一照现形」的对比，正是读谱的全部动机。

### 实验 2（python 滑块）：亲手给合成脑电读峰

合成一段 4 秒、256 Hz 的脑电：一个可拖动的节律 + 50 Hz 工频 + 少量噪声，算谱、报出两根主峰的赫兹数，并画出 0~53 Hz 的谱图。

```python title="合成脑电读谱：α 山头搬家，工频不动"
# sliders: f_alpha=10 [1:30:1]
import math
import matplotlib.pyplot as plt  # 画图库（卷一已引入）

fs = 256                  # 采样率（Hz）：ACNS 建议临床脑电不低于它
N = 1024                  # 样本点数：4 秒 × 256 Hz，桶宽 0.25 Hz
x = []
for n in range(N):
    t = n / fs            # 该样本落在第几秒
    wiggle = ((n * 37) % 23 - 11) / 40   # 确定性小噪声：不用随机数，人人同一张谱
    v = math.sin(2 * math.pi * f_alpha * t) + 0.3 * math.sin(2 * math.pi * 50 * t) + wiggle
    x.append(v)

def mag(k):               # 第 k 桶幅度（60 号课的原班机器）
    re = 0.0
    im = 0.0
    for n in range(N):
        ang = 2 * math.pi * k * n / N
        re = re + x[n] * math.cos(ang)
        im = im - x[n] * math.sin(ang)
    return math.hypot(re, im) / N

mags = []                 # mags[k] = 第 k 桶幅度：先算完整张谱，再读图
for k in range(213):      # 算到 212 号桶 = 53 Hz：装下全部节律带与工频线
    mags.append(mag(k))

best = 1                  # 全谱最强桶：节律山头的座位号
for k in range(2, len(mags)):
    if mags[k] > mags[best]:
        best = k
mains = 121               # 30 Hz（121 号桶）以上没有大脑电台，高峰皆嫌疑犯
for k in range(122, len(mags)):
    if mags[k] > mags[mains]:
        mains = k

print(f"节律山头: {round(best * fs / N)} Hz（{best} 号桶）")
print(f"工频细线: {round(mains * fs / N)} Hz（{mains} 号桶）")

freqs = []                # 每桶对应的频率刻度，画图当横轴
for k in range(213):
    freqs.append(k * fs / N)
plt.figure(figsize=(7, 3))
plt.plot(freqs, mags, color="tomato")
plt.title("synthetic EEG spectrum")
plt.xlabel("Hz")          # 横轴标注：赫兹
plt.show()
```

默认 $f_{alpha}=10$ 时打印 `节律山头: 10 Hz（40 号桶）`、`工频细线: 50 Hz（200 号桶）`。把滑块拖到 3（δ）、6（θ）、20（β）：山头跟着搬家，工频细线在 200 号桶纹丝不动。图上你还能看到 10 与 50 之间满地不足 0.01 的噪底——噪声不认座位，摊得到处都是。

### 实验 3（python）：三种伪迹的谱画像

工频、眨眼、肌电各合成一段，谱像并排一挂——伪迹地图的三种「通缉照」：

```python title="伪迹三家谱：一根线、一座山、一地毛刺"
import math
import matplotlib.pyplot as plt  # 画图库（卷一已引入）

fs = 256                  # 采样率（Hz）
N = 512                   # 每段 2 秒：512 个样本，桶宽 0.5 Hz
x_mains = []              # 工频：50 Hz 一根独线
x_blink = []              # 眨眼：低频大幅
x_emg = []                # 肌电：高频宽谱
EMG_F = [44, 51, 58, 66, 75, 85, 96, 108]   # 肌电占的八根高频线（生理范围约 20~150 Hz）
for n in range(N):
    t = n / fs
    x_mains.append(0.3 * math.sin(2 * math.pi * 50 * t))
    x_blink.append(2.0 * math.sin(2 * math.pi * 0.4 * t) + 0.8 * math.sin(2 * math.pi * 0.7 * t))
    v = 0.0
    for f in EMG_F:       # 八根高频细线摞成一撮毛刺
        v = v + 0.06 * math.sin(2 * math.pi * f * t + 0.7 * f)
    x_emg.append(v)

def mag(sig, k):          # 第 k 桶幅度；这次把信号也当成参数传进来
    re = 0.0
    im = 0.0
    for n in range(N):
        ang = 2 * math.pi * k * n / N
        re = re + sig[n] * math.cos(ang)
        im = im - sig[n] * math.sin(ang)
    return math.hypot(re, im) / N

buckets = 250             # 画 0~125 Hz：奈奎斯特 128 以内，装下肌电的高频地盘
freqs = []
for k in range(buckets):
    freqs.append(k * fs / N)

fig, axs = plt.subplots(1, 3, figsize=(11, 2.8))   # 一行三栏：三种伪迹各占一格
panels = [(axs[0], x_mains, "mains 50 Hz"),
          (axs[1], x_blink, "blink < 1 Hz"),
          (axs[2], x_emg, "EMG broadband")]
for ax, sig, name in panels:   # 元组解包：一次领出画布、信号与标题
    ax.plot(freqs, [mag(sig, k) for k in range(buckets)], color="steelblue")
    ax.set_title(name, fontsize=8)
plt.tight_layout()
plt.show()
```

三栏对照着看：左栏 50 Hz 一根独线，别处几乎全空；中栏能量全趴在 1 Hz 以下摊成宽山（0.4 Hz 配 2 秒窗口骑在桶缝上，正是 60 号课的泄漏像——真实眨眼本就不是周期波）；右栏高频段立着八根细线摞出的毛刺带。**一根线、一座山、一地毛刺**——三种谱像，三种处置。

### 快问快答

```quiz
一位清醒睁眼的受试者，额区记录里出现 2 Hz 附近的大幅慢波山头，这山最可能的身份是？
- 深睡眠 δ 节律
- 眨眼伪迹 [*]
- 工频谱线
? 清醒受试者不该有 δ。眨眼伪迹正是低频、大幅、常驻额区的插播大户——大幅慢波先验身份再判读，别急着写诊断报告。
```

## 6. 常见误区

:::warning[常见误区]

**误区一**：「谱上有峰，就是大脑在放电。」
50 Hz 工频的谱线可以比 α 峰高出几十倍。峰只说明「有能量」，不说明「是大脑」——先按地图验身份：节律带内对节目单，带外先当嫌疑犯。

**误区二**：「伪迹就是高频噪声，低通一滤就干净。」
三类伪迹里两类不在高频：工频是 50 Hz 的细线（低通会把 β 连带切掉，得用陷波精准点杀），眨眼干脆是低频大幅（低通不但拦不住，还正中下怀）。先看谱像，再选刀。

**误区三**：「只要滤波器够好，任何伪迹都能滤掉。」
滤波是按频率切的刀。眨眼伪迹的能量趴在 1~4 Hz 一带，与 δ/θ 慢波住在同一层楼——切狠了大脑自己的慢波陪葬，留低了眨眼还在。频率上抱团的源要换一把按「源」切的刀，那是下一课 ICA 的开场白。

:::

## 7. 练习

**练习 1（判题）**：下面这段代码从合成脑电里找两根主峰。它能跑通，但报出来的数是「座位号」不是赫兹——修到两行输出都是整数频率为止：

```exercise
# @title: 练习：把谱峰读成赫兹
# @check: 10
# @check: 50
# @hint: 桶编号是「第几号座位」，不是赫兹：桶宽 = fs ÷ N = 0.25 Hz。座位号乘桶宽再取整，才是频率
import math

fs = 256                  # 采样率（Hz）：临床脑电的起步门槛
N = 1024                  # 样本点数：4 秒 × 256 Hz
x = []
for n in range(N):
    t = n / fs            # 该样本落在第几秒
    wiggle = ((n * 37) % 23 - 11) / 40   # 确定性小噪声：不用随机数，人人同一张谱
    v = math.sin(2 * math.pi * 10 * t) + 0.3 * math.sin(2 * math.pi * 50 * t) + wiggle
    x.append(v)           # 10 Hz α 节律 + 50 Hz 工频 + 少量噪声

def mag(k):               # 第 k 桶幅度（60 号课的原班机器）
    re = 0.0
    im = 0.0
    for n in range(N):
        ang = 2 * math.pi * k * n / N
        re = re + x[n] * math.cos(ang)
        im = im - x[n] * math.sin(ang)
    return math.hypot(re, im) / N

mags = []                 # mags[k] = 第 k 桶幅度
for k in range(220):      # 只算到 55 Hz：节律带止于 30，嫌疑区查到工频即可
    mags.append(mag(k))

best = 1                  # 全谱最强桶：节律山头的座位号
for k in range(2, len(mags)):
    if mags[k] > mags[best]:
        best = k
mains = 121               # 30 Hz（121 号桶）以上没有大脑电台，高峰皆嫌疑犯
for k in range(122, len(mags)):
    if mags[k] > mags[mains]:
        mains = k

print(best)               # ← 问题在这：座位号直接当赫兹报了
print(mains)              # ← 同样的病：还差最后一步换算
```

<details>
<summary>点开查看逐步解答</summary>

程序没崩，它在撒谎：`best` 和 `mains` 是 DFT 的**桶编号**（座位号），不是频率。桶宽 $\Delta f = f_s / N = 256/1024 = 0.25$ Hz，频率 = 座位号 × 桶宽。把最后两行改成：

```python
print(round(best * fs / N))
print(round(mains * fs / N))
```

重跑输出 `10` 与 `50`。对账：10 Hz 配 4 秒窗口恰好 40 个整周期，落在 40 号桶（60 号课的 on-bin 无泄漏位）；50 Hz 恰好 200 个整周期，落在 200 号桶。两个峰都站得笔直，说明这段合成脑电没骑桶缝——真实数据要先挑窗（80 号课）再这么读。

</details>

**练习 2（概念题）**：处置单最后一行写着「源混叠，滤波切不开」。用自己的话解释：为什么频率上抱团的两个源，滤波刀法再精也无能为力？

<details>
<summary>点开查看逐步解答</summary>

参考说法（意思对即可）：滤波器的全部本领是「按频率分配通过权」——它只认频率，不认来源。眨眼与 δ/θ 慢波的能量混在同一低频段，任何频率响应曲线要么同时放行、要么同时拦下，找不到一条只切眨眼、放过大脑的边界线。要拆开就得换维度：利用多路导联里两种源**空间分布不同**（眨眼独占额区、α 遍布枕区），把「按频率切」换成「按源切」——这正是下一课 ICA 登场的理由。
</details>

## 8. 选读：工频的谐波家族与折叠回廊

<details>
<summary>选读 · 50 Hz 从不单独作案</summary>

市电工频是 50 Hz 的正弦，但墙上设备的开关与整流会让它的**倍频**也漏进记录：100、150、200 Hz……在 $f_s = 256$（奈奎斯特 128 Hz）下数一数这个家族的座位：50 与 100 正坐；150 超过镜子，折回 $|256 - 150| = 106$；200 折回 $256 - 200 = 56$——**便宜设备不装抗混叠滤波时，谱上会出现 56 Hz 的幽灵细线**，正是 10 号课折叠回廊的回马枪。这也解释了临床门槛为何是 256 Hz：兴趣带宽到约 100 Hz，再留足余量给抗混叠滤波器的缓坡滚降，顺带让 FFT 吃上 2 的幂。陷波器对付这个家族有两种思路：每根线摆一个灭点，或把 50 Hz 基波陷掉后让高通顺手清走低频尾迹——选哪种，先看谱上站着一根线还是一排线。

</details>

## 9. 下一站

节律带认完了，伪迹也验明正身，处置单上却留着最后一行没划掉：眨眼与大脑在频率上抱团，滤波这把按频率切的刀够不着。要把它划掉，得换一把按「源」切的刀——下一课，去鸡尾酒会上学独立成分分析。

→ [ICA 与盲源分离：鸡尾酒会上挑声音](./97-ica-blind-source.md)
