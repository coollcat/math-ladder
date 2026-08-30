---
title: ASK、FSK 与 PSK
lesson_id: communication-systems/ask-fsk-psk
prereqs:
  - communication-systems/link-model
  - trig/wave-anatomy
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
  - carrier-modulation
  - ask
  - fsk
  - psk
applications:
  - optical-fiber-ook
  - bluetooth-gfsk
exits:
  - engineering
---

# ASK、FSK 与 PSK：载波的三个旋钮

## 1. 从一个场景开始

基带信号跑不远：频率太低的天线得有山那么高，而且直流成分一路衰减。解决方案优雅至极——找一列高频正弦波当**驮马**（载波），让比特去拧它的旋钮。正弦波恰好有三个可调参数：

$$A\sin(2\pi f t + \varphi)$$

拧幅度 A 是 **ASK**（幅移键控），拧频率 f 是 **FSK**（频移键控），拧相位 φ 是 **PSK**（相移键控）。光纤里的光强开关是 ASK，蓝牙的 GFSK 是 FSK 的亲戚，Wi-Fi 与卫星通信的骨架是 PSK——三个旋钮各霸一方。

## 2. 直觉解释

三个旋钮的物理画面：

- **ASK**：比特 1 时灯亮、0 时灯灭（最简版叫 OOK，通断键控）。手电筒发摩尔斯电码就是它。缺点：信道增益一起伏，幅度就被篡改，抗噪弱。
- **FSK**：比特 1 用 1200 Hz、0 用 2200 Hz（老式调制解调器的贝尔 103 就这么干）。频率信息藏在「过零的疏密」里，幅度起伏伤不了它——抗噪更强，但占带宽更宽。
- **PSK**：所有比特用同一个频率同一幅度，只翻转相位起点——1 对应 0°、0 对应 180°。接收端比较相位就能判读；功率效率最高，但要求收发双方时钟咬合得很准。

一句话对比：**ASK 问「多亮」，FSK 问「多快」，PSK 问「从哪个角度出发」。**

## 3. 正式定义

设载波 $c(t) = A_c \sin(2\pi f_c t)$，比特周期为 $T_b$。三种键控在第 $k$ 个比特期间的发送波形：

| 键控 | 波形 | 比特 → 参数 |
| --- | --- | --- |
| 2-ASK | $A_k \sin(2\pi f_c t)$，$A_k \in \lbrace 0, A_c\rbrace$ | 1→有载波，0→无 |
| 2-FSK | $\sin(2\pi f_k t)$，$f_1$ 与 $f_0$ 两档 | 1→高频档，0→低频档 |
| 2-PSK | $\sin(2\pi f_c t + \varphi_k)$，$\varphi_k \in \lbrace 0, \pi\rbrace$ | 1→同相，0→反相 |

（表中花括号用 $\lbrace\ \rbrace$ 记「取值集合」。）判决逻辑也各不相同：ASK 比幅度门限；FSK 比两个频率哪个更「合拍」——把波形分别乘上两支探针再积分（相关接收的雏形）；PSK 看相位与参考的夹角。三者的接收机都将在 50 号课的噪声世界里重新接受考验。

## 4. 分步例题

**例**：比特串 `1001` 用 2-FSK 发送，$f_1 = 8$ Hz、$f_0 = 4$ Hz、每比特持续 0.5 秒。写出频率序列并数跳变。

1. 按位查表：`1`→8 Hz，`0`→4 Hz，`0`→4 Hz，`1`→8 Hz；
2. 频率时间表：[8, 4, 4, 8]，总时长 $4 \times 0.5 = 2$ 秒；
3. 载波在比特边界是否连续？8 与 4 的交界处相位一般对不齐——工程上要么允许相位跳（简单），要么用连续相位版本 CPFSK（蓝牙 GFSK 的路线）；
4. 数一数：4 比特里发生 2 次频率切换（1→0 与 0→1），切换点就是接收端最关心的时刻。

## 5. 动手实验

### 实验 1（viz）：载波旋钮台

下面的控件就是一台正弦波旋钮机：拖 A 是 ASK 的动作，拖 f 是 FSK 的动作，拖 φ（相位）是 PSK 的动作——三种调制共享同一具机身：

```viz
{
  "type": "wave",
  "title": "载波三旋钮：A=ASK，f=FSK，phi=PSK",
  "A": 1,
  "f": 2,
  "phi": 0
}
```

把 φ 拖到 3.1（约 π）：波形整体上下翻转——这正是 2-PSK 里比特 0 与比特 1 的差别。把 f 从 1 拖到 4：过零点变密，这是 FSK 两档频率的视觉差距。把 A 拖到最小：接近 OOK 的「灭灯」状态。

### 实验 2（python）：亲手合成一段 FSK 波形

```python title="把比特串 1001 驮上双频载波"
import math                      # 用 pi 和 sin
import matplotlib.pyplot as plt

bits = [1, 0, 0, 1]              # 待发送比特
f1, f0 = 8, 4                    # 比特 1 / 0 对应的两档频率
half = 16                        # 每比特画 16 个采样点

t_all = []                       # 时间轴
y_all = []                       # 合成波形
for k in range(len(bits)):       # 逐比特拼接
    freq = f1 if bits[k] == 1 else f0   # 三元表达式：条件成立取前者
    for i in range(half):
        t = (k * half + i) / (8 * max(f1, f0) * half)   # 时间轴缩放：让每比特画出整数个载波周期
        t_all.append(t)
        y_all.append(math.sin(2 * math.pi * freq * t))

plt.figure(figsize=(7, 2.6))
plt.plot(t_all, y_all, color="steelblue")
for k in range(1, len(bits)):
    plt.axvline(k * 2 / max(f1, f0), color="tomato", linewidth=0.8, linestyle="--")   # 比特边界（每比特 0.25 秒）
```

蓝线前半段密（8 Hz、每比特两个整周期）、中间两段疏（4 Hz、每比特一个整周期）、结尾又转密。红色虚线是比特边界——真实接收机就在这些时刻附近做频率判决。试着交换 f1、f0 再跑：波形「反读」，说明频率与比特的对照表必须双方约定。

### 快问快答

```quiz
深空探测器的信号到达地球时已极弱且幅度起伏大，三个旋钮里最不该依赖哪个？
- 相位 phi
- 频率 f
- 幅度 A [*]
? 幅度在长距离信道里被衰落与增益起伏反复改写，ASK 最容易误判；PSK/FSK 把信息藏进角度与节奏，对幅度损伤免疫得多。这就是深空与卫星链路偏爱 PSK 家族的原因。
```

:::warning[常见误区]

**误区一**：「ASK 灭灯时接收端知道是 0。」
恰恰相反：0 与「信号太弱/遮挡」无法区分。所以实用 ASK 都要留一个非零的底电平（幅移而非通断），或者配合信道编码兜底。

**误区二**：「PSK 的相位跳变可以随意发生。」
相位突变等于频谱里砸进大量带外能量（想想方波的尖角）。工程实现用差分编码（DPSK）或连续相位调制来软化这些棱角，蓝牙的 GFSK 更是用高斯滤波把频率切换磨圆。

**误区三**：「三个旋钮只能单拧。」
QAM（正交幅度调制）同时拧幅度与相位，一符号驮 8 甚至 10 比特——Wi-Fi 7 的 4096-QAM 是旋钮组合拳的极致。那是 40 号课的正餐，这里先记住：旋钮越多、刻度越密，越怕噪声。

:::

## 6. 练习

**练习 1**：解码一段神秘 FSK。接收机测得每比特期间的载波频率如下，还原比特串并统计误码：

```exercise
# @check: 10110
# @check: 1
# @title: 练习：FSK 判决器
# @hint: 频率更接近 f1=9 就判 1，更接近 f0=3 就判 0——即与中点 6 比较。代码的判决方向写反了
f1, f0 = 9, 3                    # 约定：1 用高频档，0 用低频档；中点 6
measured = [9, 3, 11, 8, 3]      # 接收端测到的频率（含测量噪声）
truth = "10010"                  # 发送端的真实比特串

decoded = ""                     # 判决结果串
errors = 0                       # 与真值对照的误码计数
for i in range(len(measured)):
    bit = 0 if measured[i] > (f1 + f0) / 2 else 1   # ← 问题在这：方向反了
    decoded = decoded + str(bit)
    if bit != int(truth[i]):
        errors = errors + 1

print(decoded)
print(errors)
```

把判决条件改成「大于中点判 1」后输出 `10110` 和 `1`：前三位干净利落；第 4 位测得 8 Hz——发送的明明是低档 0，却被噪声推过了中点，判决翻成 1，成为唯一误码。这正是 FSK 判决器在噪声下的日常。

**练习 2**：2-PSK 里若时钟偏移半比特，解调会发生什么？

<details>
<summary>点开查看逐步解答</summary>

PSK 的信息全在相位的起点上，半比特偏移意味着采样时刻落在两个相位状态的过渡区，判决近似抛硬币。这就是 PSK 对同步最挑剔的原因；对比 FSK——频率在比特内部处处存在，偏一点照样测得出疏密。工程对策是 70 号课的同步电路：先用强结构（前导码）对表，再开始正式收货。
</details>

## 7. 选读：为什么载波必须是正弦

<details>
<summary>选读 · 频谱的通行证</summary>

天线尺寸约需达到波长四分之一才高效辐射：语音 3 kHz 的波长是 100 公里，而 2.4 GHz 才 12.5 厘米——驮上高频载波，天线才能缩进手机。此外各国频谱法规按频率划分用途，调制本质上是给信号办一张「指定频段的通行证」：把基带频谱整体平移到 $f_c$ 两侧。至于为什么偏偏选正弦当驮马——它是唯一经过线性系统后仍保持自身形状（只改幅度与相位）的波形，这让整条射频链路的数学始终在线性代数的舒适区里。

</details>

## 8. 下一站

波形发出去了，可信道里埋伏着噪声。多强的噪声会推翻判决？工程师为什么盯着一张「眼睛」形状的图看运气？

→ [AWGN、SNR 与眼图](./50-noise-snr-eye.md)
