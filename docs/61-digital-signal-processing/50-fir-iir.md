---
title: FIR 滤波器：加权滑动平均
lesson_id: digital-signal-processing/fir-iir
prereqs:
  - digital-signal-processing/convolution-lti
volume: 5
layer: L8
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - fir-filter
  - moving-average
  - low-pass-response
applications:
  - heart-rate-smoothing
  - sensor-denoise
exits:
  - engineering
---

# FIR 滤波器：加权滑动平均

## 1. 从一个场景开始

智能手环的心率数字在跑步时疯狂跳动：130、97、142……没法看。工程师的做法人尽皆知——**取最近几个读数的平均**再显示。奇怪的是，这个「求平均」的土办法其实是一台正经的**频率选择器**：它恰好放过慢速的真实心率变化，压掉快速的可恶毛刺。

为什么「平均」会挑频率？挑得好不好由什么决定？本课把滑动平均升级成可以自由配权的 **FIR 滤波器**，并用傅里叶的语言说清它的挑选规则。

## 2. 直觉解释

上一课的卷积引擎需要一个冲激响应 $h$。FIR 滤波器就是给 $h$ 填上**有限个常数权重**：输出 $y[n]$ 等于输入窗内各样本的加权和。

- 全部权重取 $1/M$：就是 M 点滑动平均；
- 中间大、两头小的钟形权重：平滑得更温柔，边缘伪影更小；
- 权重有正有负：还能做「突出变化」的微分效果。

为什么平均能压高频？想象一根上下乱抖的快曲线：相邻值一正一负互相抵消，加起来接近零；而慢曲线相邻值几乎相同，平均后原样保留。**平均 = 让快速振荡自己跟自己打架。**

## 3. 正式定义

**FIR 滤波器（有限冲激响应）**：冲激响应只有有限长非零项的滤波器。M 阶 FIR 的输出

$$y[n] = \sum_{k=0}^{M-1} h[k]\, x[n-k]$$

这正是卷积——只是 $h$ 由设计者自由填写。对频率为 $f$（单位：周期/样本）的正弦输入，稳态输出的幅度被放大 $H(f)$ 倍：

$$H(f) = \left| \sum_{k=0}^{M-1} h[k]\, e^{-2\pi i k f} \right|$$

滑动平均（$h[k] = 1/M$）代入后化简为：

$$H(f) = \left| \frac{\sin(\pi M f)}{M \sin(\pi f)} \right|$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $h[k]$ | 滤波系数 | 第 k 个抽头的权重，设计的全部自由度 |
| $f$ | 数字频率 | 周期/样本；0 是直流、0.5 是最高频 |
| $H(f)$ | 幅频响应 | 该频率通过滤波器后被乘的倍数 |
| 零点 | $H(f)=0$ 处 | 被完全消灭的频率，$\sin(\pi M f)=0$ 给出 |

$H(f)$ 在 $f=0$ 附近接近 1（低频直通），随频率升高整体走低、并在若干频率处触零——一台名副其实的**低通滤波器**。

## 4. 分步例题

**例**：4 点滑动平均（$M=4$），问它对各频率成分下多狠的手？

1. 写出响应：$H(f) = \left|\sin(4\pi f)\right| / \left(4\left|\sin(\pi f)\right|\right)$；
2. 低频 $f = 0.125$（8 拍一个周期）：$H = 1 / (4 \times 0.3827) \approx 0.65$——保留约三分之二，轻度削弱；
3. 触零点：$\sin(4\pi f) = 0$ 且分母不为零，即 $f = 0.25, 0.5, \ldots$。$f=0.25$（4 拍一个周期）的成分**彻底消失**——因为它每相邻样本反号，4 个一求和恰好正负全抵消；
4. 结论：滑动平均是一台「偏心」的机器，对 $f=1/M, 2/M, \ldots$ 处的频率有灭点。想除掉某个已知干扰频率？把 $M$ 取成它的周期的整数倍就行。

## 5. 动手实验

### 实验 1（viz）：响应曲线随 M 变形

下图是滑动平均的幅频响应（横轴数字频率 0~0.5）。拖动 M 看它如何呼吸：

```viz
{
  "type": "plot",
  "title": "M 点滑动平均的幅频响应 H(f)",
  "expr": "abs(sin(pi*m*x)/(m*sin(pi*x)))",
  "xmin": 0,
  "xmax": 0.5,
  "sliders": [
    { "name": "m", "min": 2, "max": 11, "step": 1, "value": 4 }
  ]
}
```

M=2 时只在 $f=0.5$ 有个零点；M 越大，低通平台越窄、灭点越多、过渡越陡——但通带也跟着变矮变窄，「钝刀子」效应加剧。在 $f$ 接近 0 处曲线恒为 1：直流与慢变化永远直通。

### 实验 2（python）：灭点实战——精准切除快纹波

```python title="滑动平均 vs 混合信号：看快成分被斩草除根"
# sliders: M=4 [2:10:1]
import math                      # 用 pi、sin 和 cos
import matplotlib.pyplot as plt

N = 64                           # 样本数
f_slow = 0.05                    # 慢成分：数字频率 0.05（要保留）
f_fast = 0.25                    # 快成分：恰好在 M 点平均的灭点上（要删除）

sig = []                         # 混合输入
for n in range(N):
    v = math.sin(2 * math.pi * f_slow * n) + 0.6 * math.sin(2 * math.pi * f_fast * n)
    sig.append(v)

out = []                         # M 点滑动平均输出
for n in range(N):
    acc = 0
    for k in range(M):
        idx = n - k              # 只用当前与过去 M 个样本（因果！）
        if idx >= 0:
            acc = acc + sig[idx]
    out.append(acc / M)

def amp(data, f):                # 测某频率成分的实际幅度（投影法）
    s = 0.0                      # 与 sin 的内积
    c = 0.0                      # 与 cos 的内积
    for n in range(len(data)):
        s = s + data[n] * math.sin(2 * math.pi * f * n)
        c = c + data[n] * math.cos(2 * math.pi * f * n)
    return 2 * math.hypot(s, c) / len(data)

print(f"滤波前快成分幅度: {round(amp(sig, f_fast), 2)}")
print(f"滤波后快成分幅度: {round(amp(out, f_fast), 2)}")
print(f"滤波后慢成分幅度: {round(amp(out, f_slow), 2)}")

plt.figure(figsize=(7, 3.2))
plt.plot(sig, color="lightgray", label="input")
plt.plot(out, color="seagreen", linewidth=2, label=f"avg {M}")
plt.legend()
```

默认 M=4 时打印大约 `0.58`、`0.01`、`0.89`：快纹波被灭点几乎清零，慢成分保留约九成——理论预测是 $H(0.05)\approx 0.94$，投影读数略低是因为 64 点窗口没有盖满慢波的整数个周期（这正是下一课「频谱泄漏」的提前露面）。把 M 滑到 5 再跑——灭点搬家，快成分立刻还魂。**滤波器设计 = 把灭点摆到敌人阵地上。**

### 快问快答

```quiz
FIR 里的 F（Finite，有限）指的是什么？
- 系数值必须是有限小数
- 冲激响应只有有限长：给一发冲激，输出最多持续 M 拍就归零 [*]
- 频率响应的范围有限
? FIR 无反馈回路，冲激滑出窗口后输出彻底清零。有反馈的 IIR 则会让响应理论上永远拖尾——这是两大家族最本质的分界。
```

:::warning[常见误区]

**误区一**：「窗口越大滤波越好。」
M 增大确实压噪声更狠，但低通平台同步变窄、信号自身的快速成分遭殃，且输出相对输入整体延迟 $(M-1)/2$ 拍。实时心率显示延迟半秒，用户可不会管你信噪比多漂亮。

**误区二**：「FIR 无反馈所以怎么设计都不会出错。」
无反馈只保证「有限记忆」，不保证增益合理——系数乱配可以让某些频率放大数倍。稳定与好用之间还隔着一张响应曲线。

**误区三**：「滑动平均是万金油去噪法。」
它假设噪声快、信号慢。若干扰恰好落在通带里（比如慢漂移），平均只会把它原样奉送；若信号本身有 $f=1/M$ 附近的成分，反而被灭点误杀。先看频谱再选滤波器。

:::

## 6. 练习

**练习 1**：计算 M 点滑动平均对给定数字频率的增益 $H(f)$，各保留两位小数。代码能跑但答案不对：

```exercise
# @title: 练习：滑动平均的增益表
# @check: 0.65
# @check: 0.0
# @check: 0.9
# @hint: 公式 H = |sin(pi*M*f)| / (M*|sin(pi*f)|)。代码漏了分母里的 M——没有它算出来的是别的滤波器
import math

cases = [(4, 0.125), (4, 0.25), (5, 0.05)]   # (M, f) 组合
for M, f in cases:
    gain = abs(math.sin(math.pi * M * f)) / abs(math.sin(math.pi * f))   # ← 少除一个 M
    print(round(gain, 2))
```

补上分母的 M 后逐行输出 0.65、0.0、0.9。第二行的 0.0 是灭点：f=0.25 对 M=4 正好每样本反号求和归零。第三行 0.9 说明慢成分基本无损——这就是实验 2 里慢波形幸存的数学解释。

**练习 2**：想用滑动平均消灭数字频率 f=0.2 的干扰且尽量保真，M 取几？

<details>
<summary>点开查看逐步解答</summary>

灭点条件 $\sin(\pi M f) = 0$ 即 $M f$ 为整数；取最小解 $M = 5$（此时 $H(0.2)=0$）。验证相邻整数：M=10 也满足但平台更窄、延迟更大，能用却不划算。工程口诀：**灭点频率 = 整数/采样数**，先写干扰频率的倒数再取整。
</details>

## 7. 选读：亲戚 IIR 与一页对比

<details>
<summary>选读 · IIR：把输出也接回输入</summary>

若允许方程带上过去的**输出**，如 $y[n] = 0.9\,y[n-1] + x[n]$，就得到 IIR（无限冲激响应）滤波器：一发冲激进来的影响以几何级数衰减、理论上永不归零。代价是必须小心稳定性——权重配猛了输出会爆炸；好处是极少几个系数就能做出很陡的频率选择（FIR 要几十上百个抽头才追平）。选择口诀：相位敏感（音频、脑电形态学）用 FIR 的线性相位；算力紧张、只要幅频（温度平滑）用 IIR 省钱。两者都是卷积思想的后代，只是 $h$ 一个写在明处、一个藏在递归里。

</details>

## 8. 下一站

滤波器在频率上动刀，前提是你看得见频率。下一课回到 DFT：当信号的频率不肯落在桶上时，谱图会撒谎——**频谱泄漏**登场，而窗函数正是它的克星与共谋。

→ [DFT 与频谱泄漏](./60-dft-leakage.md)
