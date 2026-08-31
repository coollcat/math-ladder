---
title: PWM 与 H 桥驱动
lesson_id: mechatronics/pwm-hbridge
prereqs:
  - electronics/transistor-switch
  - mechatronics/dc-motor
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L8
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 3
introduces_concepts:
  - pulse-width-modulation
  - h-bridge
  - duty-cycle
  - current-ripple
  - switching-loss
applications:
  - motor-speed-control
  - led-dimming
  - switching-power-supply
exits:
  - engineering
---

# PWM 与 H 桥驱动

## 1. 从一个场景开始

机器人手臂要轻轻夹住一颗鸡蛋——电机需要以 5% 的力矩输出。可电源是 24 V 直流母线，开关一合就是满力矩，不是夹碎就是掉地上。怎么从"全有或全无"里取出"5%"？

答案是把开关合一下、断一下，开关频率高到电机来不及响应"通断"，只感受到**平均值**——通 5% 的时间，平均电压就是 5%。这就是 **PWM**（脉宽调制）。

但只调速度还不够：电机还要能**反转**（倒车）、能**刹车**（快速停转）。一个开关做不到这些——需要四个。这就是 **H 桥**：四个开关摆成 H 形，电机横在中间，通过不同开关组合实现正转、反转、制动、滑行四种模式。

## 2. 直觉解释

先看 PWM。想象水龙头：你无法把水流"调到 5%"再关掉（机械阀门有惯性），但可以以极快的频率开—关—开—关，每次开的时间占 5%。水桶的水位只取决于平均流入量，不取决于每一次开关的细节。PWM 做的就是这件事：用高频通断控制平均功率。

电机绕组有**电感**——电感是电流的惯性。电压方波让电流想"瞬间跳变"，但电感不让它跳，于是电流被磨成了一条带轻微波纹（纹波）的直流。开关频率越高，纹波越小；但开关损耗也越大（每次开关管子都要经历一段既通又断的过渡期，这段电阻大、发热多）。

再看 H 桥。四个 MOSFET 排成 H 的四条腿，电机在横杠位置：

```
  +V ──┬────────┬──
        │        │
       Q1      Q3
        │   M    │
  ──────┼──(M)──┼──
        │        │
       Q2      Q4
        │        │
  GND ─┴────────┴──
```

- **正转**：Q1 斩波 + Q4 常通 → 电流从左到右；
- **反转**：Q3 斩波 + Q2 常通 → 电流从右到左；
- **制动**：Q2 + Q4 同时通 → 电机两端短接，反电动势产生反向电流，动能全烧在绕组电阻上——制动转矩最大；
- **滑行**：全关 → 电流经二极管续流后归零，无转矩，靠惯性滑行。

## 3. 正式定义

PWM 方波的端电压 $V_\text{ab}(t)$ 是周期为 $T = 1/f_\text{sw}$ 的方波，占空比 $D \in [0,1]$：

$$
V_\text{ab}(t) = \begin{cases} V_\text{bus} & 0 \le t < D \cdot T \\ 0 & D \cdot T \le t < T \end{cases}
$$

平均电压 $\bar V = D \cdot V_\text{bus}$。

电枢回路的微分方程（$L$ 为电感、$R$ 为电阻、$E = K_e \omega$ 为反电动势）：

$$
L \frac{dI}{dt} = V_\text{ab}(t) - R \cdot I - E
$$

稳态时电流在一个 PWM 周期内的纹波峰峰值为（近似三角波，$T_\text{on} = D \cdot T$）：

$$
\Delta I_\text{pp} \approx \frac{(V_\text{bus} - E - R\bar I) \cdot D \cdot T}{L} \approx \frac{V_\text{bus} \cdot D \cdot (1-D)}{L \cdot f_\text{sw}}
$$

| 符号 | 含义 | 典型值 |
| --- | --- | --- |
| $D$ | 占空比 | 0–100% |
| $f_\text{sw}$ | 开关频率 | 1–60 kHz |
| $L$ | 电枢电感 | 0.1–5 mH |
| $\Delta I_\text{pp}$ | 电流纹波峰峰 | 越小越好 |
| $f_\text{sw} < 20\text{kHz}$ | 落入可听频段 | 电机会"啸叫" |

纹波率 = $\Delta I_\text{pp} / \bar I$，工程上要求 < 30%（否则铜损大、转矩脉动明显）。

## 4. 分步例题

**例**：$V_\text{bus} = 24$ V，$D = 60\%$，$f_\text{sw} = 20$ kHz，$L = 1$ mH，$R = 2\,\Omega$，$K_e = 0.05$，负载 $T_l = 0.03$ N·m。求稳态转速与纹波。

1. **平均电压**：$\bar V = 0.6 \times 24 = 14.4$ V。
2. **稳态转速**（$\bar I = T_l / K_e = 0.6$ A，$E = \bar V - R\bar I = 14.4 - 1.2 = 13.2$ V）：$\omega = E/K_e = 264$ rad/s $= 2521$ rpm。
3. **纹波近似**：$\Delta I_\text{pp} \approx \frac{24 \times 0.6 \times 0.4}{0.001 \times 20000} = 0.288$ A。
4. **纹波率**：$0.288 / 0.6 = 48\%$ → **偏高**，提示"提高 $f_\text{sw}$ 或加大 $L$"。

## 5. 动手实验

### 实验 1：拖着看（lab 组件）

切换正转/反转/制动/滑行四种模式，拖动占空比、开关频率、电感、负载滑块，观察 H 桥开关状态、端电压方波与电流纹波：

```lab
{
  "type": "pwm-hbridge",
  "title": "PWM 与 H 桥驱动",
  "mode": "fwd",
  "duty": 60,
  "fsw": 20,
  "L": 1,
  "Tl": 0.03
}
```

注意 $f_\text{sw} < 20$ kHz 时提示条会变红——电机在啸叫。

### 实验 2：自己算（Python）

```python title="占空比 → 平均电压 → 稳态转速"
Vbus = 24   # 母线电压（V）
Ke = 0.05   # 反电动势常数（V·s/rad）
R = 2       # 电枢电阻（Ω）
Tl = 0.03   # 负载转矩（N·m）
# 扫描占空比，计算转速与纹波率
L = 0.001   # 电感（H）
fsw = 20000 # 开关频率（Hz）
Iavg = Tl / Ke
for D in [0.2, 0.4, 0.6, 0.8, 1.0]:
    Vavg = D * Vbus
    E = Vavg - R * Iavg
    w = E / Ke
    rpm = w * 60 / (2 * 3.14159265)
    ripple = Vbus * D * (1 - D) / (L * fsw)
    rate = ripple / Iavg if Iavg > 0 else 0
    print(f"D={D:.0%}  Vavg={Vavg:.1f}V  rpm={rpm:.0f}  纹波={ripple:.3f}A  纹波率={rate:.0%}")
```

### 快问快答

```quiz
PWM 开关频率从 20 kHz 降到 5 kHz，电流纹波会变成几倍？
- 2 倍
- 4 倍 [*]
? 纹波与频率成反比，频率降 1/4 → 纹波 4 倍。但开关损耗也降 1/4——这就是"高频低纹波但发热大"与"低频高纹波但效率高"的取舍。
```

## 6. 常见误区

:::warning[常见误区]
- **「占空比 100% 就是堵转」**——堵转看的是电流，不是占空比。100% 占空比只是"一直给母线电压"，电流由 $I = (V_\text{bus} - E)/R$ 决定。电机堵转时 $E = 0$，电流才最大。
- **「制动就是把占空比设成 0」**——占空比为 0 是"滑行"（全关，靠惯性），不是"制动"。制动是 Q2 + Q4 同时通，主动短接绕组让反电动势产生反向电流。
- **「开关频率越高越好」**——不对。$f_\text{sw}$ 每翻倍，开关损耗翻倍（每次开关消耗固定能量 $\frac{1}{2} C_\text{oss} V^2$），管子会更烫。20 kHz 是人耳上限，也是大多数驱动的甜蜜点。
:::

## 7. 练习

```exercise
# @title: 计算制动时绕组消耗的功率
# @check: 0.58
# @hint: 制动时 E = 0.6*Vbus，P = E^2/R
# 母线 24V，R=2Ω，占空比 60% 制动模式（两端短接）。
# 反电动势 E = D * Vbus，绕组功率 P = E**2 / R（W）。
Vbus = 24
D = 0.6
R = 2
E = D * Vbus
P = E ** 2 / R
print(f"{P:.2f}")
```

<details>
<summary>选读 · 为什么滑行模式会有反压</summary>

滑行时四个开关全关，但电机有惯性 → 还在转 → 还有反电动势 $E$。绕组里的电流不能瞬间归零（电感不让），它必须找一条续流路径——H 桥每个 MOSFET 旁边都反并联一个二极管（body diode），电流就顺着二极管"绕回去"，把能量灌回母线电容。

这个过程中，端电压 $V_\text{ab}$ 不再是 0 或 $V_\text{bus}$，而是 $-V_\text{bus} \cdot \text{sign}(I)$（反压）。所以"滑行"并非"什么都不发生"——电机在把自己储存的动能反哺给电源，直到电流衰减到零。如果你看到母线电压在滑行瞬间微微升高，就是这个原因。

</details>

## 8. 下一站

有了 PWM 和 H 桥，我们能让电机正反转、调速、刹车。但电机怎么知道自己转到了什么位置？下一种传感器——编码器——登场。

→ [编码器与测速](./70-encoder-speed.md)
