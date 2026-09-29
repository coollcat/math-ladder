---
title: 传输线：当导线比波长还长
lesson_id: electronics/transmission-line
prereqs:
  - electronics/impedance-phasor
  - electronics/ac-power
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L9
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_concepts:
  - transmission-line
  - characteristic-impedance
  - reflection-coefficient
  - standing-wave-ratio
  - quarter-wave-transformer
  - s-parameters
applications:
  - rf-matching
  - cable-termination
  - signal-integrity
exits:
  - engineering
  - research
---

# 传输线：当导线比波长还长

## 1. 从一个场景开始

同一根 1 米长的同轴电缆：接 1 MHz 的信号源，示波器在两端读到的电压几乎一样，导线就是一根"理想短接线"；换成 1 GHz 的信号源，同样的电缆让输出波形剧烈起伏，幅度还随频率忽大忽小——**明明什么都没改，导线像是换了脾气**。

变的不是导线，是信号波长。1 MHz 的波长约 200 m，1 m 的线只占 $\lambda/200$，可以当"一根导线"；1 GHz 的波长只有 0.2 m，1 m 的线比波长还长 5 倍，**线上各点的电压在同一时刻相差悬殊**。这时候导线必须当成一个**分布系统**来算——这就是传输线。

## 2. 直觉解释

集总参数的世界里，导线不过是把元件连起来的东西。可信号是要**花时间**才能从一端传到另一端的。如果这段时间短到可以忽略，导线就无所谓；一旦信号在线上"还没走完一个来回，它自己就已经变了"，导线沿途的电压分布就必须认真对待。

把长线切成无数个极小段：每一小段都有微小的串联电感和并联电容。**沿着导线看，电压和电流在不断地"充放电、再充放电"**，形成一对向前传播的波。线上任意一点的电压，其实是两列行波的叠加：

- 向前跑的**入射波**；
- 撞到负载（或任何阻抗不连续处）被弹回来的**反射波**。

反射波和入射波叠在一起，会**相互干涉**成驻波：线上某些位置永远是波峰、某些位置永远是波谷，幅度沿长度周期性起伏。负载和导线"脾性"（阻抗）越不搭，反射越强，驻波越明显——这就是第 1 节里那个"脾气变了"的根源。

## 3. 正式定义

**分布参数**（单位长度的电感 $L$、电容 $C$）决定两件事：

$$Z_0=\sqrt{\frac{L}{C}},\qquad v=\frac{1}{\sqrt{LC}},\qquad \lambda=\frac{v}{f}$$

$Z_0$ 叫**特征阻抗**，$\lambda$ 是线上波长。当线长 $\gtrsim \lambda/10$ 时必须按传输线处理。

**反射系数**（负载 $Z_L$ 相对导线 $Z_0$）：

$$\Gamma=\frac{Z_L-Z_0}{Z_L+Z_0},\qquad \text{VSWR}=\frac{1+\lvert\Gamma\rvert}{1-\lvert\Gamma\rvert}$$

$\Gamma=0$ 叫**匹配**（$Z_L=Z_0$），此时无反射、VSWR=1。

**无耗线的输入阻抗**与 **$\lambda/4$ 变换器**（$\beta=2\pi/\lambda$）：

$$Z_{in}(l)=Z_0\frac{Z_L+jZ_0\tan\beta l}{Z_0+jZ_L\tan\beta l},\qquad Z_{in}\Big(\frac{\lambda}{4}\Big)=\frac{Z_0^{2}}{Z_L}$$

| 符号 | 名字 | 单位 | 含义 |
| --- | --- | --- | --- |
| $Z_0$ | 特征阻抗 | Ω | 由 $L/C$ 决定，与线长无关 |
| $v$ | 传播速度 | m/s | 无耗线下 $=1/\sqrt{LC}$，约 $0.6c\sim0.8c$ |
| $\lambda$ | 线上波长 | m | $\lambda=v/f$，比真空中短 |
| $\Gamma$ | 反射系数 | — | 复数；模长 0~1，$0$ 表示匹配 |
| VSWR | 电压驻波比 | — | $\ge 1$；1 最好，$\infty$ 表示全反射 |
| $S_{11}$ | 输入反射系数 | — | 数值上就是 $\Gamma$，$20\log_{10}\lvert\Gamma\rvert$ 即回波损耗 |

**回波损耗**（return loss）常用 dB 表示：$\text{RL}=-20\log_{10}\lvert\Gamma\rvert$，越大越好（反射越弱）。

## 4. 分步例题

**例**：一根 $L=250$ nH/m、$C=100$ pF/m 的同轴电缆，负载 $Z_L=100$ Ω。求 $Z_0$、传播速度、100 MHz 时的波长、反射系数、VSWR、回波损耗，并设计一段 $\lambda/4$ 匹配线。

1. **特征阻抗**：$Z_0=\sqrt{250\times10^{-9}/100\times10^{-12}}=\sqrt{2500}=50\ \Omega$；
2. **速度**：$v=1/\sqrt{250\times10^{-9}\times100\times10^{-12}}=1/5\times10^{-9}=2\times10^{8}$ m/s（约 $0.67c$）；
3. **波长**：$\lambda=v/f=2\times10^{8}/1\times10^{8}=2$ m。所以 1 m 长的线在 100 MHz 已占半个波长，**必须按分布参数算**；
4. **反射系数**：$\Gamma=(100-50)/(100+50)=+0.333$；
5. **VSWR**：$(1+0.333)/(1-0.333)=2.0$——负载处电压峰值是最小值的 2 倍；
6. **回波损耗**：$\text{RL}=-20\log_{10}(0.333)=9.5$ dB，约 11% 的功率被反射回去；
7. **$\lambda/4$ 匹配**：在负载前插入一段特征阻抗 $Z_0'=\sqrt{50\times100}=70.7$ Ω、长度 $\lambda/4=0.5$ m 的线，就能把 100 Ω 变换成 50 Ω，实现匹配。

第 4~6 步就是射频里最常用的三个数：**反射系数、驻波比、回波损耗**，它们只是同一个 $\Gamma$ 的三种说法。

## 5. 动手实验

### 实验 1（viz）：驻波比随负载怎么变

```viz
{
  "type": "plot",
  "title": "VSWR 随负载电阻的变化（滑杆调特征阻抗 Z0）",
  "expr": "(1+abs((x-Z0)/(x+Z0)))/(1-abs((x-Z0)/(x+Z0)))",
  "label": "VSWR(Z_L)",
  "xmin": 1,
  "xmax": 500,
  "sliders": [
    { "name": "Z0", "min": 10, "max": 150, "step": 5, "value": 50 }
  ]
}
```

横轴是负载电阻 $Z_L$（1~500 Ω），纵轴是 VSWR。曲线像一个**谷**：谷底恰好落在 $Z_L=Z_0$ 处（那里 VSWR=1，完美匹配），离开 $Z_0$ 越远，曲线越陡地往上爬。拖动滑杆把 $Z_0$ 从 50 Ω 拧到 75 Ω，谷底整体右移——**"匹配"不是某个固定电阻值，而是负载恰好等于你这根线的特征阻抗**。曲线在 $Z_L\to0$ 和 $Z_L\to\infty$ 两端都趋于无穷，那是短路和开路的极端情形。

### 实验 2（python）：画出线上的驻波图案

```python title="失配线上的电压驻波：峰与谷"
import math                      # 数学工具库：用 pi、sqrt、log10
import matplotlib.pyplot as plt  # 画图库

Z0 = 50.0                        # 特征阻抗（Ω）
for ZL in [50.0, 100.0, 25.0, 0.0]:
    if ZL == 0.0:
        G = -1.0                 # 短路：Γ = (0-Z0)/(0+Z0) = -1
    else:
        G = (ZL - Z0) / (ZL + Z0)   # 反射系数（实数负载时为实数）
    vswr = (1 + abs(G)) / (1 - abs(G)) if abs(G) < 1 else float("inf")
    rl = -20 * math.log10(abs(G)) if G != 0 else float("inf")  # 回波损耗 dB
    print("ZL =", ZL, "Γ =", round(G, 3), "VSWR =", round(vswr, 2), "RL =", round(rl, 2), "dB")

# 画 ZL = 25 Ω 时的电压驻波 |V(z)|/|V+| 沿一个波长
G = (25.0 - Z0) / (25.0 + Z0)    # Γ = -1/3
us = []                          # 归一化位置 z/λ
mags = []                        # 归一化电压幅度
N = 400
for k in range(N):
    u = k / N                    # 0 ~ 1（一个波长）
    ang = 4 * math.pi * u        # 2βz = 4π·(z/λ)
    mag = math.sqrt(1 + G * G + 2 * G * math.cos(ang))  # |1 + Γ·e^{-2jβz}|
    us.append(u)
    mags.append(mag)

fig, ax = plt.subplots(figsize=(7, 2.5))     # 一块画布
ax.plot(us, mags, linewidth=1.5)             # 画驻波包络
ax.axhline(1 + abs(G), linestyle="--", linewidth=0.8)  # 波峰 1+|Γ|
ax.axhline(1 - abs(G), linestyle="--", linewidth=0.8)  # 波谷 1−|Γ|
ax.set_xlabel("位置 z / λ")                   # 横轴：沿线的位置
ax.set_ylabel("|V| / |V+|")                   # 纵轴：归一化电压
plt.tight_layout()
```

四行读数给出 $Z_L=50$（匹配，VSWR=1）、$100$、$25$（都 VSWR=2）、$0$（短路，VSWR→∞）的结果。图上那条上下波动的曲线就是**驻波包络**：它在 $1+\lvert\Gamma\rvert=1.333$ 和 $1-\lvert\Gamma\rvert=0.667$ 两条虚线之间来回，**比值恰好是 VSWR=2**。相邻波峰间隔是半个波长——实测中量出这个间隔，就能反推线上波长和传播速度，这是射频工程师标定电缆最常用的手法。

### 快问快答

```quiz
一根 50 Ω 的传输线接上一个纯电阻负载，测到 VSWR = 1。下面哪种说法一定成立？
- 负载电阻等于 50 Ω（在无耗线的前提下） [*]
- 线上没有电流
- 负载吸收了全部入射功率并且没有反射
? VSWR = 1 意味着反射系数模为零，对纯电阻负载就是 ZL = Z0 = 50 Ω。要注意「没有反射」只在无耗线前提下由 VSWR=1 推出；如果线上有损耗，衰减也会把反射波吃小，VSWR 看起来接近 1 但负载并未匹配。
```

## 6. 常见误区

:::warning[常见误区]

**误区一**："50 Ω 是同轴电缆的电阻。"
你以为 $Z_0$ 是导线的直流电阻——其实它和线的长短、铜的粗细几乎无关，而由**单位长度的电感和电容之比** $L/C$ 决定。一根很长的理想 50 Ω 线的**直流电阻**可能只有几欧姆，**特征阻抗**却是稳稳的 50 Ω。它不是能量损耗，而是行波在路上"电压与电流的比值"。

**误区二**："阻抗匹配只是为了拿到最大功率。"
你以为匹配是功率优化的手段——在射频里，匹配的首要目的是**抑制反射**：反射波会和入射波干涉，让信号波形失真、发射机功率反灌回来、接收灵敏度下降。匹配带来的最大功率传输只是其中一项好处，**波形完整性和系统稳定**往往更重要。

**误区三**："线末端开路，所以末端电压为零。"
你以为"没有负载"就没有电压——**开路意味着电流为零，电压反而加倍**。开路时 $\Gamma=+1$，入射波被原样正相弹回，末端叠加成 $2\lvert V^+\rvert$ 的波腹；短路（$\Gamma=-1$）才是末端电压为零、电流加倍。这组"反直觉"恰恰是传输线区别于集总电路的核心特征。

:::

## 7. 练习

**练习 1**：50 Ω 线上接一个 100 Ω 负载，驻波比是多少？下面这段代码把 VSWR 公式的分子分母弄反了，修到输出 `2.0`：

```exercise
# @title: 练习：100 Ω 负载的驻波比
# @check: 2.0
# @hint: 反射系数 Γ = (ZL − Z0)/(ZL + Z0)；驻波比 VSWR = (1 + |Γ|) / (1 − |Γ|)，分子是「1 加模」
Z0 = 50.0
ZL = 100.0
G = (ZL - Z0) / (ZL + Z0)            # 反射系数 = 1/3
VSWR = (1 - abs(G)) / (1 + abs(G))   # ← 问题在这：VSWR 的分子是「1 + |Γ|」
print(round(VSWR, 2))
```

**练习 2**：一根 75 Ω 的电视天线馈线要接到 300 Ω 的馈线（或反过来），用一段 $\lambda/4$ 线做匹配。这段匹配线的特征阻抗应该是多少？若工作频率是 200 MHz、线上波长 1 m，这段线该做多长？

<details>
<summary>点开查看逐步解答</summary>

1. **$\lambda/4$ 变换公式**：$Z_{in}(\lambda/4)=Z_0^{2}/Z_L$。要让 300 Ω 负载在 75 Ω 线上看起来像 75 Ω，需要 $75=Z_0'^2/300$；
2. **解出**：$Z_0'=\sqrt{75\times300}=\sqrt{22500}=150$ Ω；
3. **长度**：$\lambda/4=1/4=0.25$ m = 25 cm；
4. **注意带宽**：$\lambda/4$ 变换只在设计频率附近有效。偏离 1/4 波长后 $Z_{in}$ 不再等于 75 Ω，匹配变差——所以它常用于窄带（如单频道天线），宽带匹配要靠多节级联或渐变线。

一个实用推论：$\lambda/4$ 线能把**任意纯电阻**变换成另一个纯电阻，但变换比由 $Z_0'$ 决定，而 $Z_0'$ 的取值受加工精度限制；变换比越大（如 300 Ω 到 75 Ω 是 4 倍），匹配线越难做、带宽越窄。

</details>

## 8. 选读：电报方程与特征阻抗的来历

<details>
<summary>选读 · 从一段 $LC$ 到 $Z_0=\sqrt{L/C}$</summary>

把线切成极小段 $\Delta z$，每段有串联电感 $L\,\Delta z$ 和并联电容 $C\,\Delta z$。对一段写基尔霍夫定律，令 $\Delta z\to0$，得到一对偏微分方程——**电报方程**：

$$\frac{\partial v}{\partial z}=-L\frac{\partial i}{\partial t},\qquad \frac{\partial i}{\partial z}=-C\frac{\partial v}{\partial t}$$

两式互相代入，消去 $i$，得到关于电压的**波动方程**：

$$\frac{\partial^2 v}{\partial z^2}=LC\,\frac{\partial^2 v}{\partial t^2}$$

它的解是向右和向左两列行波之和 $v(z,t)=f(z-vt)+g(z+vt)$，其中波速 $v=1/\sqrt{LC}$。把向右行波代回第一个方程，会强制电压与电流满足一个固定比值：

$$\frac{v^+}{i^+}=\sqrt{\frac{L}{C}}=Z_0$$

**这就是特征阻抗的全部来历**：它不是人为规定的标准，而是波动方程自动要求"行波里电压与电流的比值"。

若考虑导线损耗，电报方程要补上串联电阻 $R$ 和并联电导 $G$：

$$Z_0=\sqrt{\frac{R+j\omega L}{G+j\omega C}}$$

低频时 $R$ 占主导，$Z_0$ 会随频率变化（这正是普通音频线没有"50 Ω"这个概念的原因）；高频时 $j\omega L\gg R$、$j\omega C\gg G$，才退化成稳定的实数 $Z_0=\sqrt{L/C}$。**所以"特征阻抗"是高频概念**——这也是本课放在相量与阻抗（第 90 课）之后的原因。

</details>

## 9. 下一站

导线比波长还长时，它不再是导线，而是一段会反射、会变换阻抗的器件——这是射频世界的入口。信号既然要在线路上跑，就必须回答"怎么可靠地把比特从这头送到那头"。

→ [通信系统：一条链路的模型](../62-communication-systems/10-link-model.md)
