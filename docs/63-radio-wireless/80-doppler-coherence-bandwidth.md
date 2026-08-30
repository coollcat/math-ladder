---
title: 多径、Doppler 与相干带宽
lesson_id: radio/doppler-coherence-bandwidth
prereqs:
  - radio/path-loss-shadowing
  - radio/multipath-fading
volume: 5
layer: L9
track:
  - scientific-computing
  - optimization-control
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - doppler-spread
  - coherence-time
  - fast-slow-fading
applications:
  - high-speed-rail-coverage
  - lte-parameter-design
exits:
  - radio/diversity-equalizer-ofdm
---

# 多径、Doppler 与相干带宽

## 1. 从一个场景开始

高铁上刷视频，比在家里容易卡；打电话时快步走，杂音比坐着多。你追着基站跑，频率悄悄变了调——**Doppler 频移**进了场。

第 40 课已经见过 Doppler 公式与相干带宽的身影，但那一课的主角是多径干涉本身；本课把两根坐标轴各自立传：一根是**频率轴**（时延扩展 ↔ 相干带宽），一根是**时间轴**（多普勒扩展 ↔ 相干时间）。两对"互补宽度"拼在一起，才是无线信道的完整画像。

## 2. 直觉解释

火车鸣笛从身边掠过：接近时变尖、远离时变低——波源与你的相对速度把每秒到达的波峰数改写了。电磁波同款：你朝基站走，接收频率微微升高；背对它走，微微降低。频移量 $f_d = \dfrac{v}{\lambda}\cos\theta$，正对最大、垂直为零。

多径让事情升级：几十条反射路径从**不同角度**涌来，每条带着自己的频移，从几赫兹到上百赫兹不等——一根纯净的载波谱线被糊成一撮**多普勒谱**，宽度就是 $f_{d,\max} = v/\lambda$。谱在抖，信道就在变脸。

于是有了两张"考卷"：

- **时间考卷**：信道多久变一次脸？由多普勒扩展的倒数——**相干时间**回答；
- **频率考卷**：相邻多远的频率还"同涨同跌"？由时延扩展的倒数——**相干带宽**（第 40 课已介绍）回答。

两张考卷互相独立：快衰落与频率选择性可以单独出现，也可以联手发难。

## 3. 正式定义

**Doppler 频移与扩展**：收发相对速度 $v$、波长 $\lambda$、来波夹角 $\theta$ 时，

$$f_d = \frac{v}{\lambda}\cos\theta$$

全向多径下频移铺满 $\pm f_{d,\max}$，$f_{d,\max} = v/\lambda$，称为（单边）**多普勒扩展** $B_d$。

**相干时间**：信道冲激响应保持"相识"的时间尺度（50% 相关，Clarke 模型）：

$$T_c \approx \frac{0.423}{f_{d,\max}}$$

**快慢衰落判据**：符号周期 $T_s$ 与相干时间比大小——$T_c < T_s$ 为**快衰落**（一个符号内信道变脸），$T_c > T_s$ 为**慢衰落**。

| 量 | 公式 | 反义词伙伴 | 一句话 |
| --- | --- | --- | --- |
| 相干带宽 $B_c$ | $\approx 1/(5\sigma_\tau)$ | 时延扩展 $\sigma_\tau$ | 频率轴：多近的频率还同涨同跌 |
| 相干时间 $T_c$ | $\approx 0.423/B_d$ | 多普勒扩展 $B_d$ | 时间轴：多久变一次脸 |

两对宽度互为倒数——**环境拖泥带水（扩展大），信道就记性差（相干小）**，这是本课全部公式背后的同一句话。

## 4. 分步例题

**例 1**：高铁以 350 km/h 行驶，基站载波 2.6 GHz。求最大 Doppler 频移与相干时间。

1. 换算速度：$350/3.6 \approx 97.2$ m/s；
2. 换算波长：$\lambda = 3\times10^8 / 2.6\times10^9 \approx 0.115$ 米；
3. 最大频移：$f_{d,\max} = 97.2 / 0.115 \approx 843$ Hz；
4. 相干时间：$T_c = 0.423/843 \approx 0.5$ 毫秒；
5. 判据：LTE 子帧长 1 毫秒 > $T_c$——**半个子帧内信道就换了张脸**，频偏估计与导频密度必须按高铁场景加码。

**例 2**：郊区实测时延扩展 $\sigma_\tau = 1\ \mu s$。LTE 的 15 kHz 子载波与 20 MHz 整带宽，各面对什么衰落？

1. 相干带宽：$B_c = 1/(5\times10^{-6}) = 200$ kHz；
2. 子载波：15 kHz 远小于 200 kHz → 每条子载波经历**平坦衰落**；
3. 整带宽：20 MHz 远大于 200 kHz → 整体**频率选择性衰落**；
4. 结论：同一片郊区，宽带"原生"必中招——但切成 15 kHz 的窄条后条条平坦，这正是下一课 OFDM 的入场券。

## 5. 动手实验

### 实验 1（viz）：频移旋钮上的角度与速度

```viz
{
  "type": "plot",
  "title": "Doppler 频移 fd = (v/λ)·cosθ：正对最大，垂直为零",
  "expr": "v*cos(x*pi/180)/lam",
  "label": "fd(Hz)",
  "xmin": 0,
  "xmax": 180,
  "sliders": [
    { "name": "v", "min": 0, "max": 120, "step": 5, "value": 30 },
    { "name": "lam", "min": 0.1, "max": 1, "step": 0.05, "value": 0.15 }
  ]
}
```

怎么玩：横轴是来波方向与运动方向的夹角。$v=30$ m/s、$\lambda=0.15$ 米（2 GHz）时，正对方向频移 200 Hz、垂直方向归零、背对方向 −200 Hz。把 $v$ 拧到 120（高铁级），整条余弦放大四倍——**多普勒谱的宽度就是速度的体温计**。

### 实验 2（python）：高铁信道的"变脸时刻表"

```python title="速度换相干时间：快慢衰落的分界线"
# sliders: v_kmh=350 [0:400:5], f_ghz=2.6 [0.7:6:0.1]

lam = 0.3 / f_ghz          # 波长（米）：3e8 / (f_ghz × 1e9) 化简即 0.3/f_ghz
v = v_kmh / 3.6            # km/h 换 m/s：除以 3.6
fd = v / lam               # 最大多普勒频移（Hz）
tc_ms = 0.423 / fd * 1000  # 相干时间（毫秒）：0.423/fd 再换算单位

print(f"fd_max = {round(fd)} Hz, Tc = {round(tc_ms, 2)} ms")
if tc_ms < 1:
    print("Tc 短于 1 ms 子帧：高铁快衰落，需密集导频")
else:
    print("Tc 长于 1 ms 子帧：慢衰落，常规设计可用")
```

怎么玩：默认复现例 1 的 843 Hz 与 0.50 ms。速度拧到 0：频移消失、相干时间无穷大——静止世界没有时间轴的烦恼；拧到 15 km/h（骑行）：$T_c$ 约 15 毫秒，信道对 1 ms 子帧而言近乎永恒不变。**快慢不是绝对速度，是信道变脸与符号节奏的赛跑**。

### 实验 3（python）：移动接收机的信号心电图

```python title="八条路径的运动合成：起伏周期就是相干时间"
import math
import random
import matplotlib.pyplot as plt

random.seed(11)                     # 固定种子：八条路径的剧本每次相同
fd = 200.0                          # 最大多普勒（Hz），对应 30 m/s @ 2 GHz
paths = []
for k in range(8):
    ang = random.uniform(0, 2 * math.pi)   # uniform：区间内取均匀随机角
    paths.append((math.cos(ang), random.uniform(0, 2 * math.pi)))

ts = []
amps = []
for i in range(300):
    t = i * 1e-5                    # 步长 0.01 毫秒，共 3 毫秒
    re = 0.0
    im = 0.0
    for cos_a, ph in paths:         # 每条路径：相位随时间以 fd·cosθ 转动
        re = re + math.cos(2 * math.pi * fd * cos_a * t + ph)
        im = im + math.sin(2 * math.pi * fd * cos_a * t + ph)
    ts.append(t * 1000)
    amps.append(math.sqrt(re * re + im * im))

plt.plot(ts, amps)
plt.axhline(2.0, color="tomato", linestyle="--")   # 深谷警戒线
plt.xlabel("time (ms)")
plt.ylabel("amplitude")
plt.grid(True)
```

怎么玩：波形在约 0.5~2 毫秒的节奏里起落——数量级正是 $T_c \approx 2.1$ ms（200 Hz 的倒数）。把代码里 `fd` 改成 800（高铁档）：起伏压缩四倍，1 ms 子帧内经历完整过山车。**多普勒扩展越大，时间轴上的信道越"善变"**。

### 快问快答

```quiz
相干时间的长短由哪个信道参数决定？
- 时延扩展的倒数
- 多普勒扩展的倒数 [*]
- 发射功率的大小
? 相干时间约等于 0.423 除以最大多普勒频移：动得越快、频谱糊得越宽，信道变脸越勤。时延扩展的倒数是相干带宽，管的是频率轴。
```

:::warning[常见误区]

**误区一**："你以为 Doppler 会把信号推出整个信道。" 几百赫兹对几兆赫兹的信道宽度是九牛一毛；真正的伤害在相位层——载波相位跟踪失锁、导频失效，星座整体旋转糊成一团。

**误区二**："你以为手机不动，信道就不动。" 第 40 课的都市传说是答案：周围行人、车辆、摇动的树叶都在改写路径相位，静止的你照样经历起伏——多普勒谱是"环境+你"的合谋。

**误区三**："你以为快衰落就是信号弱。" 快慢说的是变脸节奏（时间轴），选择性说的是胖瘦不均（频率轴），深浅说的是谷有多深（幅度轴）。三根轴互相独立，处方各不相同。

:::

## 6. 练习

**练习 1**：慢跑者 $v = 30$ m/s、载波 2 GHz。求最大 Doppler 频移（Hz，取整）与相干时间（微秒，取整）。代码能跑但频移算错了：

```exercise
# @title: 练习：从速度到相干时间
# @check: 200
# @check: 2115
# @hint: fd = v/λ 是除法——检查是不是顺手写成了乘法；Tc 的单位换算乘 10 的 6 次方
v = 30.0            # 速度（m/s）
lam = 0.15          # 波长（米），2 GHz 对应

fd = v * lam        # ← 问题在这：乘除号用反了
tc_us = round(0.423 / fd * 1e6)
print(round(fd))
print(tc_us)
```

改对后输出 200 与 2115：$f_d = 30/0.15 = 200$ Hz，$T_c = 0.423/200 \approx 2115\ \mu s$。慢跑者的信道 2 毫秒才变一次脸，对毫秒级符号是"慢性子"。

**练习 2**： Wi-Fi 的 OFDM 符号长 3.2 微秒。家里步行 1.5 m/s、3.5 GHz 的信道，对这个符号算快衰落还是慢衰落？

<details>
<summary>点开查看逐步解答</summary>

$\lambda = 0.3/3.5 \approx 0.0857$ 米，$f_d = 1.5/0.0857 \approx 17.5$ Hz，$T_c = 0.423/17.5 \approx 24$ 毫秒。

```python
lam = 0.3 / 3.5
fd = 1.5 / lam
print(round(0.423 / fd * 1000, 1))
```

输出 24.2（毫秒）。相干时间是符号时长的约 7500 倍——室内信道对单个符号"永远不变脸"，是标准慢衰落；Wi-Fi 要操心的从来是频率轴（宽带选择性），不是时间轴。
</details>

**练习 3**：某信道 $T_c = 1$ ms 且 $B_c = 200$ kHz。各给一个"安全"与"危险"的信号例子（带宽、符号时长自定）。

<details>
<summary>点开查看逐步解答</summary>

安全示例：带宽 100 kHz、符号 10 ms——频率低于 $B_c$（平坦）、时长短于 $T_c$（慢变），双考全过。

危险示例：带宽 5 MHz、符号 5 ms——频率上被切成好几段深浅不一（选择性），时间上符号还没发完信道已变脸（快衰落），双杀组合，必须 OFDM 加交织加导频全套伺候。

判断式就两行：$B_s$ 对 $B_c$、$T_s$ 对 $T_c$，各自比大小。
</details>

## 7. 边界与适用条件

- $T_c \approx 0.423/f_d$ 与 $B_c \approx 1/(5\sigma_\tau)$ 都绑定"50% 相关"的工程约定，换相关门限系数就变；比较数量级够用，精确设计查对应定义。
- Clarke 模型假设散射体全向均匀、天线全向；城市峡谷的谱会缺角、高铁的谱会聚成双峰，实际系统按实测谱设计导频与估频器。
- 大规模 MIMO 天线阵对同一用户的多径角度做了"集齐再判"，信道等效被平均得近乎不变（信道硬化），快衰落的牢骚会随天线数增加而减弱——这是 5G 大规模天线的意外红利（空间复用的账本在第 92 课结算）。

## 8. 选读：0.423 这个怪系数从哪来

<details>
<summary>选读 · Clarke 谱与贝塞尔函数的一次过零</summary>

全向散射下，接收信号自相关随时间差按第一类零阶贝塞尔函数 $J_0(2\pi f_d \Delta t)$ 衰减。信道"还算相识"的天然断点取自相关首次跌破 0.5 的时刻——解 $J_0(x) = 0.5$ 得 $x \approx 1.32$，换算 $\Delta t = 1.32/(2\pi f_d) = 0.423/f_d$。0.423 不是经验拍脑袋，是贝塞尔函数的户口本；要求 90% 相关时它会收紧到约 0.06，判据更严苛。

</details>

## 9. 下一站

两根轴的体检报告都拿到了：频率轴有深谷、时间轴会变脸。处方在哪？时间、空间、频率三路下注的分集，把星座拧回来的均衡器，以及化整为零的 OFDM——下一课凑齐抗衰落三板斧。

→ [分集、均衡与 OFDM 直觉](./90-diversity-equalizer-ofdm.md)
