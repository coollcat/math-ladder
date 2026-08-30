---
title: 频率响应与 Bode 图直觉
lesson_id: engineering-cybernetics/frequency-response-bode
prereqs:
  - engineering-cybernetics/feedback-amplifier-stability
  - fourier/spectrum
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - bode-plot
  - crossover-frequency
applications:
  - servo-design
  - vibration-isolation
exits:
  - engineering
---

# 频率响应与 Bode 图直觉

## 1. 开场钩子

给结构缓慢加热，它跟得上；快速摇晃，它可能跟不上还放大振动。Bode 图把这两种命运放在同一张图上：横轴是频率，一张图看幅值衰减，另一张看相位滞后。

## 2. 直觉解释

稳态输入 $A\sin(\omega t)$ 经过线性系统后仍是同频正弦，只是幅值和相位改变。低频段常近似直通；转折频率之后幅值下降、相位滞后增加。控制设计关心穿越频率：开环幅值为 1 的位置，因为稳定裕度在那里最容易流失。

## 3. 正式定义

一阶低通系统：

$$G(s)=\frac{K}{\tau s+1}.$$

在 $s=j\omega$ 处：

$$|G(j\omega)|=\frac{K}{\sqrt{1+(\omega\tau)^2}},\qquad \phi=-\arctan(\omega\tau).$$

分贝幅值为 $20\log_{10}|G|$。$\omega=1/\tau$ 时幅值约为 $K/\sqrt2$，相位约 $-45^\circ$。

## 4. 分步例题

取 $K=10$，$\tau=0.5$ 秒，$\omega=4$ 弧度/秒。

1. $\omega\tau=2$；
2. 幅值为 $10/\sqrt{5}\approx4.472$；
3. 分贝值为 $20\log_{10}(4.472)\approx13.0$ dB；
4. 相位为 $-\arctan(2)\approx-63.4^\circ$；
5. 输出比输入慢约 0.277 秒，即 $63.4^\circ/(4\times57.3^\circ)$。

## 5. 动手实验

### 实验 1：正弦叠加的频率感

```viz
{
  "type": "sines",
  "title": "低频与高频成分",
  "terms": [1, 3]
}
```

第一项代表容易跟踪的低频成分，第二项代表更难跟踪的高频成分。真实 Bode 图会进一步说明每个频率被放大或削弱多少。

### 实验 2：扫频画出幅值与相位

```python title="一阶系统的有限频率扫描"
# sliders: K=10 [1:20:1], tau=0.50 [0.10:2.00:0.05]
import math                     # 数学库：用 sqrt、atan 和 log10
import matplotlib.pyplot as plt # 绘图库：画两条曲线

frequencies = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0] # 时间终点不是时间而是频率上限
magnitudes = []
dbs = []
phases = []
for omega in frequencies:       # 有界 for 循环逐点扫频
    magnitude = K / math.sqrt(1 + (omega * tau) ** 2)
    magnitudes.append(magnitude)
    dbs.append(20 * math.log10(magnitude))          # log10：常用对数；分贝公式用它压缩幅值比例
    phases.append(-math.degrees(math.atan(omega * tau))) # atan：反正切，给出一阶系统的相位滞后

fig, axes = plt.subplots(2, 1, figsize=(7, 5))      # 建 2 行 1 列子图
axes[0].plot(frequencies, dbs, marker="o")          # 上图画分贝幅值
axes[0].set_ylabel("gain (dB)")
axes[0].grid(True, which="both")
axes[1].plot(frequencies, phases, marker="o")       # 下图画相位角
axes[1].set_xlabel("frequency (rad/s)")
axes[1].set_ylabel("phase (deg)")
axes[1].grid(True)
plt.tight_layout()

print(f"转折频率={1/tau:.2f}")
print(f"直流增益dB={20*math.log10(K):.1f}")
print(f"最高频相位={phases[-1]:.1f}")
```

调大 $\tau$，转折点向左移动，系统在更低频率就开始滞后。

## 6. 练习

```exercise
# @title: 练习：计算分贝增益
# @check: -6.99
# @hint: 先算 |G|=K/sqrt(1+(w*tau)^2)，再取 20*log10(|G|)。
import math
K = 1.0
tau = 1.0
omega = 2.0
db = math.log10(abs(K)) / 20.0   # 错：只对直流增益取了对数，还把系数放错了位置
print(f"{db:.2f}")
```

<details>
<summary>点开查看逐步解答</summary>

$|G|=1/\sqrt{1+4}=1/\sqrt{5}\approx0.4472$；分贝值是 $20\log_{10}(0.4472)\approx-6.99$。初始代码既没有先算幅值，又把 20 除了进去。

</details>

## 7. 概念快问快答

```quiz
Bode 图的穿越频率指哪里？
- 相位等于零的位置
- 开环幅值等于 1 的位置 [*]
- 输入信号停止的位置
? 幅值穿越频率附近同时有较高回路增益和明显相位滞后，是评估裕度的关键位置。
```

## 8. 常见误区

:::warning[常见误区]

**误区一**：你以为只看幅值就够。同样的幅值下多几十度相位差可能从稳定变成失稳。

**误区二**：你以为转折频率就是截止一切。它只是开始明显衰减和滞后的标志。

**误区三**：你以为 Bode 图适用于任意非线性系统。严格频率响应主要面向线性化后可用的工况。

:::

## 9. 选读：斜率记忆法

<details>
<summary>选读 · 渐近线</summary>

单极点在转折频率后幅值大约每十倍频降 20 dB，相位趋向 $-90^\circ$；两个极点则分别变为每十倍频 40 dB 和 $-180^\circ$。零点方向相反。渐近线不能代替精确计算，但能快速判断风险区。

</details>

## 10. 下一站

Bode 图分开看幅值和相位，Nyquist 图把它们绕成一条闭合曲线，直接面对临界点 $-1$。

→ [Nyquist 稳定判据直观](./40-nyquist-stability-tour.md)
