---
title: Friis 公式与链路预算
lesson_id: radio/friis-budget
prereqs:
  - radio/antenna-gain
  - exponents/log
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
  - friis-equation
  - link-budget
  - dbm
applications:
  - wifi-coverage-planning
  - satellite-link
exits:
  - radio/multipath-fading
---

# Friis 公式与链路预算

## 1. 从一个场景开始

路由器说明书上印着：发射功率 20 dBm，灵敏度 −70 dBm。中间这 90 dB 的鸿沟，被墙、距离、天线瓜分殆尽——**还剩多少给"距离"？** 工程师回答这类问题从不算场强积分，而是列一张加减法账单，名叫**链路预算**。

账单的核心一行叫 Friis 公式。1946 年 Harald Friis 在贝尔实验室写下它时大概没想到，七十多年后每个 Wi-Fi 规划工具的内核里都躺着这一行。

## 2. 直觉解释

把发射功率想成泼出去的一桶水：随着距离拉远，水摊在越来越大的球面上，单位面积的"水量"按距离平方稀释（球面积 $4\pi d^2$ 越来越大）。接收天线像一只小杯子，只能接住球面上属于自己口径的那一小片。

于是整条链就是乘法：

$$P_r = P_t \times G_t \times G_r \times \left(\frac{\lambda}{4\pi d}\right)^2$$

四个因子各司其职：发多少、发得聚不聚、接得巧不巧、路上摊薄了多少。

直接做乘法容易算到眼花，工程师发明了 dB 记账法：**取对数后乘法变加法、除法变减法**。功率相对 1 毫瓦的分贝数记作 dBm：

$$P(\text{dBm}) = 10\log_{10}\frac{P}{1\text{ mW}}$$

20 dBm 就是 100 mW；−70 dBm 是 0.0000001 mW——对数刻度专治这种天文数字。

## 3. 正式定义

对数形式下，链路预算是一行加法：

$$P_r = P_t + G_t + G_r - L_{fs}$$

其中自由空间路径损耗（FSPL）为

$$L_{fs} = 20\log_{10}\left(\frac{4\pi d}{\lambda}\right)$$

工程速算版（d 用千米、f 用 MHz 时最顺手）：

$$L_{fs}\text{(dB)} = 32.44 + 20\log_{10} f_{\text{MHz}} + 20\log_{10} d_{\text{km}}$$

| 符号 | 单位 | 含义 |
| --- | --- | --- |
| $P_t$ | dBm | 发射功率 |
| $G_t, G_r$ | dBi | 收发天线增益 |
| $L_{fs}$ | dB | 自由空间损耗 |
| $P_r$ | dBm | 接收功率 |
| 灵敏度 | dBm | 解码所需的最低接收功率 |

**链路余量** = $P_r$ − 灵敏度。余量 >0 链路通；余量越大，抗衰落、抗穿墙的家底越厚。

## 4. 分步例题

**例**：家用路由器 EIRP 上限 20 dBm（中国 ISM 规定），收发各配 2 dBi 天线，工作在 2450 MHz，直线距离 10 米。求接收功率与对 −70 dBm 灵敏度的余量。

1. 算频率项：$\log_{10} 2450 \approx 3.39 \Rightarrow 20\times3.39 = 67.8$；
2. 算距离项：$d = 0.01$ km，$\log_{10} 0.01 = -2 \Rightarrow 20\times(-2) = -40$；
3. 合并 FSPL：$32.44 + 67.8 - 40 = 60.2$ dB；
4. 列账单：$P_r = 20 + 2 + 2 - 60.2 = -36.2$ dBm；
5. 余量：$-36.2 - (-70) = 33.8$ dB——家底非常厚，这就是为什么 10 米内 Wi-Fi 从不因为自由空间损耗而掉线。

检查量级：−36 dBm 属于"信号极强"区间（手机 Wi-Fi 图标满格通常在 −40 dBm 以上），账单自洽。

## 5. 动手实验

### 实验 1（viz）：衰减指数决定曲线脾气

```viz
{
  "type": "plot",
  "title": "相对接收功率 ∝ d^(-n)：自由空间 n=2，市区 n≈3.5",
  "expr": "x^(-n)",
  "label": "相对功率",
  "xmin": 0.5,
  "xmax": 8,
  "sliders": [
    { "name": "n", "min": 2, "max": 4, "step": 0.5, "value": 2 }
  ]
}
```

怎么玩：n=2 是 Friis 的自由空间世界；把 n 拉到 3.5 或 4，曲线在同样距离上塌得更狠——真实城市因建筑遮挡，等效指数常在 3~4 之间。距离翻倍时，n=2 只多赔 6 dB，n=4 要多赔 12 dB。

### 实验 2（python）：滑块拖距离，账单实时刷新

```python title="Wi-Fi 链路预算计算器"
import math

# sliders: distance_m=10 [1:100:1]

f_mhz = 2450          # 工作频率（MHz）
pt = 20               # 发射功率（dBm），中国 ISM 上限
gt = 2                # 发射天线增益（dBi）
gr = 2                # 接收天线增益（dBi）
sens = -70            # 接收机灵敏度（dBm）

d_km = distance_m / 1000
loss = 32.44 + 20 * math.log10(f_mhz) + 20 * math.log10(d_km)   # FSPL 速算公式
pr = pt + gt + gr - loss                                        # 链路预算加法
margin = pr - sens
print(f"d={distance_m}m FSPL={round(loss, 1)} dB")
print(f"Pr={round(pr, 1)} dBm, margin={round(margin, 1)} dB")

if margin < 0:       # if/else 分支首见于第 1 章实验
    print("断链！需要更大功率或更高增益")
else:
    print("链路可用")
```

怎么玩：从 1 米拖到 100 米，余量从约 54 dB 一路被啃到约 14 dB——正好每十年距离赔 20 dB，每翻一倍距离 FSPL 恰好涨 6 dB。这还只是自由空间的账：任何一堵墙再吃走十几 dB，余量立刻告急（墙的账单见本章挑战题）。

### 实验 3（python）：画出发射功率的"生存地图"

```python title="接收功率随距离的完整曲线"
import math
import matplotlib.pyplot as plt

pt, gt, gr, sens = 20, 2, 2, -70    # 同实验 2 的参数打包赋值
f_mhz = 2450

ds = []
prs = []
for i in range(1, 200):              # 距离 1 到 199 米
    d = float(i)
    loss = 32.44 + 20 * math.log10(f_mhz) + 20 * math.log10(d / 1000)
    ds.append(d)
    prs.append(pt + gt + gr - loss)

plt.plot(ds, prs, label="Pr(dBm)")
plt.axhline(sens, color="tomato", linestyle="--")   # 灵敏度生死线
plt.text(60, sens + 2, "sensitivity -70 dBm")
plt.xlabel("distance (m)")
plt.ylabel("Pr (dBm)")
plt.legend()
plt.grid(True)
```

纯几何上，曲线要到约 490 米才碰到红色虚线——自由空间里的 Wi-Fi 其实"跑得非常远"；但现实中几堵墙就能把这 400 多米的家底挥霍殆尽，这就是室内覆盖必须按墙计账的原因。

### 快问快答

```quiz
自由空间里距离翻倍，接收功率变为原来的多少？
- 一半（线性减半）
- 四分之一（平方反比）[*]
- 不变（真空不吸收）
? Friis 因子 (λ/4πd)² 中 d 在分母平方位置：d×2 则因子×1/4，即损耗 +6 dB。真空确实不吸收能量，是球面扩散把能量摊薄了。
```

:::warning[常见误区]

**误区一**："你以为负 dBm 是负功率。" 功率永远非负。−70 dBm 只是比 1 mW 低 70 dB 的极微弱信号（0.0000001 mW）——对数刻度里负号家常便饭。

**误区二**："你以为 Friis 公式适用于任何距离。" 它要求远场视距且 $d \gg \lambda$；贴近天线的近场区、以及隔着墙体时都不适用。室内规划要在 FSPL 基础上另加穿透损耗。

**误区三**："你以为加大发射功率就能无限续命。" 法规封顶（ISM 20 dBm EIRP）、电池扛不住、还会把邻居网络变成自己的背景噪音。工程上优先提高增益与选址，而不是蛮力加功率。

:::

## 6. 练习

**练习 1**：补全一条蓝牙链路的预算账单。参数：$P_t=20$ dBm、$G_t=3$ dBi、$G_r=2$ dBi、$L_{fs}=66$ dB。代码能跑但少算了一项：

```exercise
# @title: 练习：蓝牙链路还剩多少信号
# @check: -41
# @hint: 账单四项一个不能少：Pt + Gt + Gr − Loss；对照公式看现在漏了谁
pt = 20    # 发射功率 dBm
gt = 3     # 发射增益 dBi
gr = 2     # 接收增益 dBi
loss = 66  # 自由空间损耗 dB

pr = pt + gt - loss     # ← 问题在这：接收增益 gr 忘了入账
print(pr)
```

改对后输出 −41：四项相加 $20+3+2-66=-41$ dBm。若灵敏度是 −70 dBm，余量还有 29 dB，蓝牙十米内稳如老狗。

**练习 2**：某卫星下行链路 $P_t=30$ dBm、$G_t=30$ dBi、$G_r=20$ dBi、$L_{fs}=196$ dB。求 $P_r$ 与余量（灵敏度 −100 dBm），并判断通不通。

<details>
<summary>点开查看逐步解答</summary>

$P_r = 30 + 30 + 20 - 196 = -116$ dBm。低于灵敏度 −100 dBm，**余量 −16 dB，链路不通**。

这正是真实卫星通信的常态：靠地面站用大口径天线（高 $G_r$）或提高频段效率来救。验证：

```python
print(30 + 30 + 20 - 196)
```
</details>

**练习 3**：距离从 10 米增到 80 米（8 倍），FSPL 增加多少 dB？提示：8 倍 = 2³，每翻倍 6 dB。

<details>
<summary>点开查看逐步解答</summary>

翻倍三次：$2^3 = 8$，每次 +6 dB，共 **+18 dB**。代码验证：

```python
import math
l1 = 32.44 + 20 * math.log10(2450) + 20 * math.log10(0.01)
l2 = 32.44 + 20 * math.log10(2450) + 20 * math.log10(0.08)
print(round(l2 - l1, 1))
```

输出 18.1 ≈ 18 dB。心算法则"翻倍 +6 dB、十倍 +20 dB"是现场排障的利器。
</details>

## 7. 边界与适用条件

- Friis 公式描述的是**自由空间视距**传播；反射、绕射场景要用第 4 课的多径模型修正。
- 公式在 $d \to 0$ 时给出"增益"，物理荒谬——远场条件 $d \geq 2D^2/\lambda$ 是使用前提。
- dBm 加 dBi、减 dB 合法（同是对数域），但 **dBm 之间不能相加**当功率用；两个功率合成要先换回毫瓦。
- 中国 ISM 频段 EIRP ≤ 20 dBm（天线增益 <10 dBi 时），链路预算里的 $P_t+G_t$ 受这条法规约束。

## 8. 选读：为什么恰好是 20log₁₀

<details>
<summary>选读 · 从量纲倒推 FSPL 公式</summary>

Friis 因子 $\left(\frac{\lambda}{4\pi d}\right)^2$ 取对数：$20\log_{10}\frac{\lambda}{4\pi d}$（振幅类取 20 倍是因为功率是振幅平方，$10\log a^2 = 20\log a$）。拆开写：$20\log\lambda - 20\log(4\pi)$，常数部分并入 32.44；再把 $\lambda = c/f$ 代入，$\log c$ 也进常数，剩下的就是 $20\log f_{\text{MHz}} + 20\log d_{\text{km}}$。

所以速算公式的三个数字各有户口：32.44 是 $20\log_{10}(4\pi\times10^9/c)$ 化简后的残值（千米与兆赫兹的单位换算都藏在这里）；两个 20 来自"平方律"；频率与距离平权，因为它们以比值形式进入 λ/d。理解了户口，就不必死记公式——现场可自行重构。

</details>

## 9. 下一站

账单全绿却仍时不时卡顿？因为 Friis 描述的是"唯一的直射线"。现实空间里还有无数条反射线在接收点打架——下一课进入真正诡谲的无线信道：多径与衰落。

→ [多径与衰落](./40-multipath-fading.md)
