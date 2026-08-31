---
title: RLC 二阶与阻尼振荡
lesson_id: electronics/rlc-ring
prereqs:
  - electronics/rc-step
  - ode/second-order-unified
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L8
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_concepts:
  - second-order-response
  - damping-ratio
  - natural-frequency
  - overshoot
applications:
  - power-supply-ringing
  - snubber-design
exits:
  - engineering
---

# RLC 二阶与阻尼振荡

## 1. 从一个场景开始

给一块新画的板子上电，示波器探头点在 3.3 V 电源轨上。你期待看到一条从 0 爬到 3.3 V 的干净曲线，实际看到的却是：**电压冲到 4.4 V，回落到 2.8 V，再冲上去，来回摆动几次才稳住。**

芯片的绝对最大耐压是 3.6 V。这一次过冲，可能已经把 IO 打伤了。

罪魁祸首是电源走线的寄生电感（几 nH 到几百 nH）与去耦电容（几 µF）凑成的 **RLC 谐振回路**。而决定它是"振铃"还是"平滑"的，只有一个无量纲的数：$\zeta$。

## 2. 直觉解释

把 RLC 想成**弹簧挂重物浸在油里**：

| 机械系统 | RLC 电路 |
| --- | --- |
| 位移 $x$ | 电容电压 $v_C$ |
| 速度 $dx/dt$ | 电流 $i$ |
| 质量 $m$ | 电感 $L$（惯性） |
| 弹簧刚度 $k$ | $1/C$（弹性） |
| 阻尼系数 $c$ | 电阻 $R$（摩擦） |

三种油，三种世界：

- **油很稀**（$R$ 小）：拉一下重物，它荡过来荡过去，好几次才停——**欠阻尼**，有过冲；
- **油刚好**（$R = R_c$）：拉一下，它最快地回到平衡位置，且**一次不过冲**——**临界阻尼**；
- **油很稠**（$R$ 大）：重物慢吞吞地爬回平衡点——**过阻尼**，无过冲但迟钝。

关键洞察：**临界阻尼是"最快且不过冲"的那个甜点**，也是绝大多数工程设计的目标。

## 3. 正式定义

**RLC 串联电路的微分方程**（由 KVL）：

$$L\frac{di}{dt} + Ri + v_C = V_s, \qquad i = C\frac{dv_C}{dt}$$

消去 $i$：

$$\frac{d^2 v_C}{dt^2} + \frac{R}{L}\frac{dv_C}{dt} + \frac{1}{LC}v_C = \frac{V_s}{LC}$$

写成标准二阶形式 $\ddot{x} + 2\zeta\omega_n \dot{x} + \omega_n^2 x = \omega_n^2 V_s$：

$$\omega_n = \frac{1}{\sqrt{LC}}, \qquad \zeta = \frac{R}{2}\sqrt{\frac{C}{L}}, \qquad Q = \frac{1}{2\zeta}$$

**临界阻尼电阻**（令 $\zeta = 1$ 反解 $R$）：

$$R_c = 2\sqrt{\frac{L}{C}}$$

**三种响应**：

| 条件 | 类型 | 特征 |
| --- | --- | --- |
| $\zeta < 1$（$R < R_c$） | 欠阻尼 | 振铃、过冲，阻尼振荡频率 $f_d = f_n\sqrt{1-\zeta^2}$ |
| $\zeta = 1$（$R = R_c$） | 临界阻尼 | 最快无过冲 |
| $\zeta > 1$（$R > R_c$） | 过阻尼 | 单调爬升，无过冲但慢 |

**过冲量**（阶跃响应超出终值的百分比）：

$$\text{OS\%} = 100 \cdot \exp\left(\frac{-\pi\zeta}{\sqrt{1-\zeta^2}}\right)$$

| 符号 | 名字 | 单位 | 含义 |
| --- | --- | --- | --- |
| $\omega_n$ | 无阻尼自然角频率 | rad/s | $1/\sqrt{LC}$ |
| $f_n$ | 自然频率 | Hz | $\omega_n/2\pi$ |
| $\zeta$ | 阻尼比 | — | 无量纲，全章最重要的一个数 |
| $Q$ | 品质因数 | — | $1/(2\zeta)$，谐振锐度 |
| $R_c$ | 临界阻尼电阻 | Ω | $2\sqrt{L/C}$ |

## 4. 分步例题

**例**：$L = 1$ mH，$C = 1$ µF，$R = 20$ Ω，输入 5 V 阶跃。求 $\zeta$、$f_n$、过冲量与峰值电压。

1. **自然频率**：$\omega_n = 1/\sqrt{10^{-3}\times10^{-6}} = 1/\sqrt{10^{-9}} = 31623$ rad/s，即 $f_n = 31623/6.283 = 5033$ Hz；
2. **临界电阻**：$R_c = 2\sqrt{10^{-3}/10^{-6}} = 2\sqrt{1000} = 63.2$ Ω；
3. **阻尼比**：$\zeta = \dfrac{R}{R_c} = \dfrac{20}{63.2} = 0.316$（**欠阻尼**）；
4. **过冲**：$\text{OS} = e^{-\pi\times0.316/\sqrt{1-0.316^2}} = e^{-0.9927/0.9487} = e^{-1.0464} = 0.351 = 35.1\%$；
5. **峰值**：$5 \times (1 + 0.351) = 6.76$ V；
6. **振铃频率**：$f_d = 5033\times\sqrt{1-0.1} = 5033\times0.9487 = 4775$ Hz。

**这就是开头那块板子的故事**：5 V 电源冲到 6.76 V，超过 3.3 V 芯片绝对最大耐压的两倍。第 3 步那句"$\zeta = R/R_c$"值得单独记住——**阻尼比就是实际电阻与临界电阻的比值**，这是最快的心算法。

## 5. 动手实验

### 实验 1（lab）：一个 R，三种世界

```lab
{
  "type": "rlc-ring",
  "title": "RLC 二阶响应：欠阻尼、临界、过阻尼",
  "sliders": [
    { "name": "R", "label": "电阻 R", "min": 1, "max": 400, "step": 1, "value": 20 },
    { "name": "L", "label": "电感 L", "min": 0.1, "max": 10, "step": 0.1, "value": 1 },
    { "name": "Cu", "label": "电容 C", "min": 0.05, "max": 5, "step": 0.05, "value": 1 }
  ]
}
```

实线是当前 $R$ 的响应，两条虚影分别是临界（$R_c$）与两倍临界（$2R_c$）。把 R 从 1 Ω 慢慢拖到 400 Ω，看曲线如何变形：

- **R = 20 Ω**：明显振铃，冲到 6.7 V 附近，来回摆三四次；
- **R = 63 Ω**（$R_c$ 附近）：最快到位，一次不过冲——注意它比 R = 20 Ω 时**更早**到达终值，尽管"更黏"；
- **R = 200 Ω**：迟钝爬升，好几毫秒才接近 5 V。

再把 L 从 1 mH 拖到 4 mH：$R_c$ 变成 $2\sqrt{0.004/10^{-6}} = 126$ Ω——**同样的 R 从"欠阻尼"变成了"更欠阻尼"**。这就是为什么长走线（大 L）特别容易振铃。

### 实验 2（python）：把过冲算出来

```python title="阻尼比 → 过冲量，一条曲线看完三种世界"
import math

L, C, VS = 1e-3, 1e-6, 5.0
Rc = 2 * math.sqrt(L / C)                 # 临界阻尼电阻
fn = 1 / (2 * math.pi * math.sqrt(L * C)) # 自然频率（Hz）

print(f"R_c = {Rc:.1f} Ω    f_n = {fn:.0f} Hz")
print("R(Ω)    ζ        峰值(V)   过冲%")
for R in [5, 20, 40, 63, 100, 200, 400]:
    zeta = R / Rc                          # 阻尼比 = 实际电阻 / 临界电阻
    if zeta < 1:
        os_ = math.exp(-math.pi * zeta / math.sqrt(1 - zeta * zeta))
        peak = VS * (1 + os_)
    else:
        os_ = 0.0
        peak = VS
    print(f"{R:>4}   {zeta:5.3f}   {peak:7.3f}   {os_*100:5.1f}%")
```

七行输出把三种世界排成一列：$\zeta < 0.7$ 时过冲已经超过 4.6%，$\zeta = 1$ 时过冲归零。**工程上常取 $\zeta \approx 0.7$（$Q \approx 0.707$）**：过冲只有 4.3%，调节时间又接近最优——这就是第 140 课 Butterworth 滤波器的同一个数字。

### 快问快答

```quiz
一个 RLC 电路目前是欠阻尼（有过冲），希望改成临界阻尼且不动 L 和 C，应该怎么做？
- 减小串联电阻 R
- 增大串联电阻 R，直到等于 2√(L/C) [*]
- 增大电容 C
? 阻尼比 ζ = (R/2)·√(C/L)，与 R 成正比。欠阻尼说明 R 太小，要把 R 加大到临界值 2√(L/C)。这也正是缓冲（snubber）电路的做法：串联一颗几欧到几十欧的电阻来「吃掉」振铃。
```

:::warning[常见误区]

**误区一**："$\zeta$ 越小越好，响应越快。"
你以为阻尼小就快——其实**过冲本身就是一种慢**：冲过头还得荡回来， settle 到 ±1% 可能要十几个周期。最快的无过冲响应恰恰在 $\zeta = 1$；综合"快 + 小过冲"的最优区在 $\zeta \approx 0.7$。追求极小的 $\zeta$ 只会换来长时间振铃。

**误区二**："只要有过冲就一定有害。"
你在模拟信号的上升沿整形、开关电源的软启动里，一点点过冲常常可以接受甚至有利。真正的判断标准是**后级器件的绝对最大额定值**：3.3 V 器件过冲到 3.6 V 就可能永久性损伤。所以工程文档里写的不是"禁止过冲"，而是"过冲不超过绝对最大额定值并有降额"。

**误区三**："$\zeta$ 只跟电阻有关，所以加大 R 一定更安全。"
你以为加了电阻就万事大吉——加大 $R$ 确实提高 $\zeta$、压住振铃，但它同时**增大了直流压降和损耗**（$P = I^2R$）。在大电流电源轨上串几欧电阻是不可接受的。真正的解法是**减小寄生电感**（缩短走线、加宽铜箔、多层板用完整地平面），而不是靠电阻"治标"。

:::

## 6. 练习

**练习 1**：$L = 1$ mH、$C = 1$ µF 的 RLC 电路，临界阻尼电阻是多少？这段代码把根号里的 L 和 C 写反了，修到输出 `63.2`：

```exercise
# @title: 练习：临界阻尼电阻是多少
# @check: 63.2
# @hint: 临界条件是 ζ = 1，解出 R = 2√(L/C)。代码写成 √(C/L) 了；注意 L 要用亨利、C 用法拉
import math

L = 1e-3      # 电感（H）
C = 1e-6      # 电容（F）
Rc = 2 * math.sqrt(C / L)   # ← 问题在这：根号里应颠倒为 L/C
print(round(Rc, 1))
```

**练习 2**：$L = 1$ mH、$C = 1$ µF，希望把过冲压到 5% 以内。求所需的阻尼比与串联电阻，并估算振铃频率。

<details>
<summary>点开查看逐步解答</summary>

1. 由 $\text{OS} = e^{-\pi\zeta/\sqrt{1-\zeta^2}} \le 0.05$ 取对数：$-\dfrac{\pi\zeta}{\sqrt{1-\zeta^2}} \le \ln 0.05 = -3.0$，即 $\dfrac{\pi\zeta}{\sqrt{1-\zeta^2}} \ge 3.0$；
2. 平方化简：$\dfrac{9.87\zeta^2}{1-\zeta^2} \ge 9$，得 $\zeta^2 \ge \dfrac{9}{18.87} = 0.477$，所以 $\zeta \ge 0.69$；
3. 电阻：$R = \zeta \cdot R_c = 0.69 \times 63.2 = 43.6$ Ω（取标准值 43 Ω 或 47 Ω）；
4. 振铃频率：$f_n = 5033$ Hz，$f_d = 5033\sqrt{1-0.477} = 5033 \times 0.723 = 3640$ Hz。

**$\zeta \approx 0.69$ 又一次指向那个"魔数" 0.7。** 5% 过冲 → $\zeta \approx 0.69$；Butterworth 最平坦 → $Q = 0.707$ 即 $\zeta = 0.707$。这不是巧合：两者都在"平坦度"与"速度"之间取了同一个折中点。

</details>

## 7. 选读：特征根怎么决定三种世界

<details>
<summary>选读 · 从特征方程到三种响应</summary>

对方程 $\ddot{x} + 2\zeta\omega_n\dot{x} + \omega_n^2 x = \omega_n^2 V_s$，猜齐次解 $x = e^{st}$，得特征方程

$$s^2 + 2\zeta\omega_n s + \omega_n^2 = 0 \quad\Longrightarrow\quad s = -\zeta\omega_n \pm \omega_n\sqrt{\zeta^2 - 1}$$

根号里的 $\zeta^2 - 1$ 决定一切：

- **$\zeta > 1$**：两个不相等的**负实根**（$s = -\zeta\omega_n \pm \omega_n\sqrt{\zeta^2-1}$），响应是两个衰减指数之和，单调无振荡；
- **$\zeta = 1$**：**重根** $s = -\omega_n$，响应形如 $(A + Bt)e^{-\omega_n t}$——多出来的 $t$ 因子让它在所有无过冲响应里到达最快；
- **$\zeta < 1$**：一对**共轭复根** $s = -\zeta\omega_n \pm j\omega_n\sqrt{1-\zeta^2}$，实部给出衰减速率 $\zeta\omega_n$，虚部给出振荡角频率 $\omega_d = \omega_n\sqrt{1-\zeta^2}$。

于是响应写成 $x(t) = V_s\left[1 - e^{-\zeta\omega_n t}\bigl(\cos\omega_d t + \tfrac{\zeta}{\sqrt{1-\zeta^2}}\sin\omega_d t\bigr)\right]$。

对 $t$ 求导令其为零，可解出首次峰值时刻 $t_p = \pi/\omega_d$，代回即得正文的过冲公式。**过冲只取决于 $\zeta$，与 $\omega_n$、$L$、$C$ 的具体数值全都无关**——这就是"无量纲数"的威力：一个 $\zeta$ 概括了无穷多组参数的所有形状。

把 $s$ 平面画出来，$\zeta$ 相同意味着极点落在同一条从原点出发的射线上。这个视角在第 90 课的复平面与第 140 课的滤波器设计里会再次出现。

</details>

## 8. 下一站

振荡、衰减、相位差——当输入不再是阶跃而是正弦时，微分方程会退化成**复数代数**。

→ [相量法与阻抗](./90-impedance-phasor.md)
