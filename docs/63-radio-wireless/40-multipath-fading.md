---
title: 多径与衰落：当电波学会走捷径和弯路
lesson_id: radio/multipath-fading
prereqs:
  - radio/friis-budget
  - trig/beats
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
  - multipath-propagation
  - coherence-bandwidth
  - doppler-shift
applications:
  - indoor-wifi
  - mobile-communication
exits:
  - radio/cellular-reuse
---

# 多径与衰落：当电波学会走捷径和弯路

## 1. 从一个场景开始

老式电视机的雪花时代有个都市传说：有人往天线旁一站，画面立刻模糊；挪半步，又清晰如初。今天轮到 Wi-Fi：同一房间，手机往左挪十厘米，信号从满格掉到两格——距离几乎没变。

Friis 公式对这一切保持沉默，因为它的世界里只有一条笔直的射线。现实空间里，墙壁、地板、金属柜把电波反射得到处都是，**无数条路径在接收点相遇、叠加、打架**。这一课看懂这场架，你就看懂了无线信道一半的脾气。

## 2. 直觉解释

两列同频的水波在水面相遇会怎样？第 7 章拍频实验的老朋友登场：

- 波峰遇波峰 → 叠得更高（**相长干涉**）；
- 波峰遇波谷 → 互相抵消（**相消干涉**）。

多径的本质一模一样：直射波走了 10 米，反射波绕了 10.06 米。这 6 厘米的路程差如果恰好是半个波长（2.4 GHz 时 λ 约 12.25 cm），反射波到达时正好反相——**两条路加起来的总能量，可能比一条路还弱**，深衰落谷就此形成。

所以"信号差"未必是"离得远"，可能只是你恰好站在某个方向的相消点上。挪几厘米改变路程差，相位关系重排，信号立刻复活——都市传说背后的几何真相。

频率维度同样遭殃：不同频率对同一段路程差的"容忍度"不同，有的频率相长、有的相消，一个信道内部会同时出现胖瘦不均的起伏（频率选择性衰落）。衡量信道"扛得住多宽带宽"的指标叫**相干带宽**。

## 3. 正式定义

**两径模型**：设直达波与反射波的时延差为 $\Delta\tau$，则信道幅频响应为

$$|H(f)| = \left|1 + e^{-j2\pi f \Delta\tau}\right| = 2\left|\cos(\pi f \Delta\tau)\right|$$

- $f = \dfrac{k+1/2}{\Delta\tau}$ 处出现衰落零点（相消）；
- $f = \dfrac{k}{\Delta\tau}$ 处出现峰值（相长）。

**相干带宽**（工程近似，50% 相关）：时延扩展为 $\sigma_\tau$ 的信道满足

$$B_c \approx \frac{1}{5\sigma_\tau}$$

信号带宽 $B_s > B_c$ 时发生**频率选择性衰落**；$B_s < B_c$ 时整个信道一起涨落，称**平坦衰落**。

**Doppler 频移**：收发相对速度 $v$、波长 $\lambda$、夹角 $\theta$ 时，

$$f_d = \frac{v}{\lambda}\cos\theta$$

## 4. 分步例题

**例 1**：室内实测时延扩展 $\sigma_\tau = 50$ ns，Wi-Fi 单信道带宽 20 MHz。判断衰落类型并求首个零点位置（按 $\Delta\tau = 50$ ns 估算）。

1. 相干带宽：$B_c = \dfrac{1}{5\times 50\times10^{-9}} = 4$ MHz；
2. 比较：$B_s = 20$ MHz 远大于 $B_c = 4$ MHz → **频率选择性衰落**；
3. 两径首个零点：$f_0 = \dfrac{1}{2\Delta\tau} = \dfrac{1}{10^{-7}} = 10$ MHz；
4. 结论：20 MHz 信道内横着一条 10 MHz 处的深谷——这正是 OFDM 把宽带拆成许多窄子载波的动机预告。

检查量级：室内时延扩展几十纳秒 → 相干带宽几 MHz，与教科书典型值一致。

**例 2**：汽车以 120 km/h 行驶，载波 2 GHz，求最大 Doppler 频移。

1. 换算速度：$120\text{ km/h} = 33.3$ m/s；
2. 换算波长：$\lambda = 3\times10^8 / 2\times10^9 = 0.15$ m；
3. 代入公式：$f_d = 33.3 / 0.15 \approx 222$ Hz；
4. 结论：最大 Doppler 约 222 Hz。相对 20 MHz 的信道宽度微不足道，但对载波相位跟踪是实打实的负担。

## 5. 动手实验

### 实验 1（viz）：两列波的打架现场

```viz
{
  "type": "beats",
  "title": "两路波叠加：多径干涉的数学骨架",
  "f1": 4,
  "f2": 5
}
```

怎么玩：上下两条细线是直达波与反射波的化身，紫色合波就是接收机实际感受到的强度。橙色包络忽大忽小——把它想象成你在房间里走动时经历的信号起伏，"走走停停的 Wi-Fi"有了第一幅肖像。

### 实验 2（python）：亲手画出信道的"心电图"

```python title="两径信道的幅频响应与相干带宽"
import math
import matplotlib.pyplot as plt

# sliders: tau_ns=50 [5:200:5]

tau = tau_ns * 1e-9               # 纳秒换算成秒：乘 10^(-9)
fs = []
hs = []
for k in range(401):
    f_mhz = k * 0.05              # 扫频 0 到 20 MHz，步长 0.05
    h = abs(2 * math.cos(math.pi * (f_mhz * 1e6) * tau))   # |H(f)| 公式
    fs.append(f_mhz)
    hs.append(h)

bc_mhz = round(1 / (5 * tau) / 1e6, 1)   # 相干带宽（MHz）

plt.plot(fs, hs)
plt.axvline(bc_mhz, color="tomato", linestyle="--")   # 相干带宽参考线
plt.title(f"|H(f)| two-ray, Bc={bc_mhz} MHz")
plt.xlabel("frequency (MHz)")
plt.ylabel("|H(f)|")
plt.grid(True)
print(f"Bc = {bc_mhz} MHz")
```

怎么玩：默认 50 ns 时，深谷正落在 10 MHz（练习 1 的答案可视化版），相干带宽 4 MHz 的红线把"平坦区"圈了出来。把 τ 拧小到 5 ns：谷跑到 100 MHz 开外，20 MHz 的 Wi-Fi 信道整体躺在平坦区——**时延扩展越小，信道越"宽容"**。

### 实验 3（python）：随机相位的合谋——Rayleigh 衰落雏形

```python title="多条随机路径叠加，幅度如何分布"
import math
import random
import matplotlib.pyplot as plt

N_PATHS = 12                      # 模拟 12 条随机相位的反射路径
trials = 3000
amps = []
for t in range(trials):
    re = 0.0                      # 合成波的实部累加器
    im = 0.0                      # 虚部累加器
    for k in range(N_PATHS):
        ph = random.random() * 2 * math.pi       # random.random()：取 [0,1) 均匀小数
        re = re + math.cos(ph)
        im = im + math.sin(ph)
    amps.append(math.sqrt(re * re + im * im))     # 合成幅度

plt.hist(amps, bins=40)           # hist：直方图，数每个幅度区间落了多少样本
plt.title("amplitude distribution of random-path sum")
plt.xlabel("amplitude")
plt.grid(True)

weak = 0                          # 统计深衰落占比
for a in amps:
    if a < 1.0:
        weak = weak + 1
print(f"P(amplitude<1.0)={round(weak / trials, 2)}")
```

大量随机相位矢量相加，幅度直方图挤向低值、拖着一条长尾——这正是 **Rayleigh 衰落**分布的形状。不到一成（约 8%）的样本幅度跌破 1.0：哪怕平均功率充足，深衰落在时间上仍频繁光顾，通信系统必须为此买保险（分集、均衡、OFDM 是后续的故事）。

### 快问快答

```quiz
手机原地震动一下都没动，Wi-Fi 信号却慢慢波动，最可能的解释是？
- 路由器功率在周期性漂移
- 房间里有人在走动，改变了反射路径的相位 [*]
- 手机电池影响接收灵敏度
? 多径合成取决于每条路径的相对相位；环境里任何物体移动都会改写这些相位，让接收点轮流经历相长与相消。
```

:::warning[常见误区]

**误区一**："你以为信号差就该换个更大功率的路由器。" 若你正处在多径相消点，加大功率只是把谷底整体抬高一点，换个位置站往往立竿见影——先动地方，再谈功率。

**误区二**："你以为多径纯粹是灾难。" OFDM 与 MIMO 技术反手利用多径：前者用窄子载波绕开深谷，后者把多条路径当作并行车道（并行车道怎么拧出来，第 92 课记账）。没有多径，宽带系统的部分潜力反而无处施展。

**误区三**："你以为相干带宽是信号的属性。" 它是**信道**的属性，由环境时延扩展决定；同一个 Wi-Fi 在空旷礼堂（Bc 大）与金属仓库（Bc 小）里面对的是完全不同的信道脾气。

:::

## 6. 练习

**练习 1**：两径时延差 $\Delta\tau = 50$ ns，求幅频响应第一个零点的频率（MHz，一位小数）。代码能跑但答案差了一倍：

```exercise
# @title: 练习：两径零点在哪
# @check: 10.0
# @hint: 零点条件 cos(π·f·Δτ)=0 要求 π·f·Δτ 取 π/2——检查分母里 Δτ 前面少了哪个系数
delta_tau = 50e-9    # 时延差（秒）

f0_hz = 1 / delta_tau        # ← 问题在这：漏了一个系数 2
print(round(f0_hz / 1e6, 1))
```

改对后输出 10.0：$f_0 = \dfrac{1}{2\times50\times10^{-9}} = 10$ MHz，对照实验 2 图上的深谷位置验证。

**练习 2**：高铁以 300 km/h 行驶，基站载波 2.6 GHz。求最大 Doppler 频移（取整数，单位 Hz）。

<details>
<summary>点开查看逐步解答</summary>

速度 $v = 300/3.6 \approx 83.3$ m/s；波长 $\lambda = 3\times10^8/(2.6\times10^9) \approx 0.1154$ m；$f_d = v/\lambda \approx 722$ Hz。

```python
import math
v = 300 / 3.6
lam = 3e8 / 2.6e9
print(round(v / lam))
```

输出 722。对子载波间隔几千赫兹的 LTE/5G 来说不到十分之一，但足以迫使系统做频偏估计与校正。
</details>

**练习 3**：某金属仓库实测 $\sigma_\tau = 200$ ns。蓝牙（1 MHz 带宽）与 Wi-Fi（20 MHz）谁会遭遇频率选择性衰落？

<details>
<summary>点开查看逐步解答</summary>

$B_c = 1/(5\times200\text{ ns}) = 1$ MHz。蓝牙 1 MHz 约等于 Bc，处于临界但基本平坦；Wi-Fi 20 MHz 远超 Bc，深陷选择性衰落——同一个仓库，两种待遇。判断式：$B_s > B_c$ 即中招。
</details>

## 7. 边界与适用条件

- 两径公式是最简模型：真实信道是几十上百条路径的叠加，统计上走向 Rayleigh（无视距主导）或 Rician（有强直射径）分布；本课实验 3 已让 Rayleigh 的形状现身。
- 相干带宽公式 $1/(5\sigma_\tau)$ 对应 50% 频率相关性的工程约定；要求 90% 相关时系数换成 50，数字会收紧十倍。
- Doppler 公式假设平面波与匀速运动；城市峡谷里的多次反射会让频移呈现展宽谱（Doppler 谱），不只是单根偏移。

## 8. 选读：为什么叫"相干"

<details>
<summary>选读 · 相干带宽与相干时间的家谱</summary>

"相干"（coherent）借自光学：两列波若保持稳定的相位关系就叫相干。频率相隔多远还"算熟识"（频率相关函数降到 0.5），由时延扩展倒数决定——这就是相干带宽 $B_c$；时间轴上同理，多普勒扩展的倒数给出**相干时间** $T_c \approx 1/f_d$，衡量信道多久"变一次脸"。

两个参数合起来给信道画像：$B_c$ 大、$T_c$ 大 → 宽带信号也平坦、变化慢，是最温和的信道；$B_c$ 小、$T_c$ 小 → 频率选择加快衰落双杀，OFDM 加交织编码的组合拳就是为它准备的。记住这对孪生参数，后面遇到 LTE/5G 参数表里的"子载波间隔 15 kHz""CP 长度 4.7 μs"，你会认出它们全是 $B_c$ 与时延扩展的直接后代。

</details>

## 9. 下一站

单个用户的信号保住了，新的问题浮出水面：一座城市几百万人同时要通信，而频谱只有窄窄一条——凭什么大家不打架？答案是一盘六边形的棋。

→ [蜂窝频率复用](./50-cellular-reuse.md)
