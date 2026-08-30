---
title: Nyquist 稳定判据直观
lesson_id: engineering-cybernetics/nyquist-stability-tour
prereqs:
  - engineering-cybernetics/frequency-response-bode
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - nyquist-contour
  - encirclement-count
applications:
  - flight-control-certification
  - power-electronics-loop-check
exits:
  - engineering
---

# Nyquist 稳定判据直观

## 1. 开场钩子

飞行控制系统认证时，工程师不能只试几个输入。Nyquist 判据用一条复平面曲线检查所有连续频率：开环回路轨迹是否围着临界点 $-1$ 转，转了多少圈。

## 2. 直觉解释

闭环特征是 $1+L(s)=0$，危险等价于 $L(s)=-1$。把 $\omega$ 从 $-\infty$ 扫到 $+\infty$，画出 $L(j\omega)$ 的实部和虚部：

| 现象 | 含义 |
| --- | --- |
| 曲线离 $-1$ 很远 | 裕度较大 |
| 曲线穿过 $-1$ | 闭环极点落在虚轴上 |
| 顺时针包围 $-1$ | 通常对应不稳定闭环 |
| 曲线贴近 $-1$ 但不包围 | 稳定但裕度小 |

若开环已有不稳定极点，包围圈数必须按判据补偿，不能简单套用“不围就好”。

## 3. 正式表述

对开环传递函数 $L(s)$，设右半平面开环极点数为 $P$，Nyquist 轨迹顺时针包围 $-1$ 的净圈数为 $N$，右半平面闭环极点数为 $Z$。常用计数约定写成：

$$Z=P-N.$$

不同教材对 $N$ 的符号定义可能相反，使用公式前必须统一“顺时针为正还是负”。本课先处理 $P=0$ 的最小相位例题：只要不包围 $-1$，闭环就没有右半平面极点。

## 4. 分步例题

取：

$$L(s)=\frac{K}{(s+1)(s+2)}.$$

1. 开环极点是 $-1,-2$，所以 $P=0$；
2. 高频时 $L$ 缩到原点；
3. 低频时实部为正，起点在右半平面；
4. 负频率轨迹是正频率轨迹关于实轴的镜像；
5. 只要 $K$ 不大到让轨迹包住 $-1$，就有 $N=0$，因此 $Z=0$，闭环稳定。

## 5. 动手实验

### 实验 1：画出复平面轨迹

```python title="二阶回路的 Nyquist 半支"
# sliders: K=1.8 [0.5:6.0:0.1]
import math                      # 数学库：提供 cos 和 sin 参数化辅助
import matplotlib.pyplot as plt  # 绘图库：画复平面曲线

frequencies = []                 # 存放选出的有限频率点
real_parts = []                  # L 的实部
imag_parts = []                  # L 的虚部
end_index = 120                  # 最大步数：把参数区间分成 120 份

for n in range(end_index + 1):
    theta = -math.pi / 2 + math.pi * n / end_index
    omega = math.tan(theta)      # tan：正切映射，把角度铺成覆盖低频到高频的频率点
    if abs(omega) < 1000:        # 数值终点保护，避免极端值
        denominator = (2 - omega * omega) ** 2 + (omega * 3) ** 2
        real = K * (2 - omega * omega) / denominator
        imag = -K * (3 * omega) / denominator
        frequencies.append(omega)
        real_parts.append(real)
        imag_parts.append(imag)

plt.plot(real_parts, imag_parts)     # 横轴 Re，纵轴 Im
plt.axhline(0, linewidth=0.8)        # axhline：画水平参考线
plt.axvline(0, linewidth=0.8)        # axvline：画垂直参考线
plt.scatter([-1], [0], color="red", zorder=3) # 标出临界点 -1
plt.xlabel("Re L(jw)")
plt.ylabel("Im L(jw)")
plt.grid(True)

closest = min((value + 1) ** 2 + imag_parts[i] ** 2 for i, value in enumerate(real_parts)) # enumerate：同时给出下标和实部
print(f"最大频率={max(abs(w) for w in frequencies):.1f}")
print(f"距临界点最近平方={closest:.4f}")
```

增大 $K$，曲线整体外扩并可能越过红色临界点。这里只画正频段；完整 Nyquist 图还要补镜像和连接弧。

### 实验 2：用极点做粗判

```exercise
# @title: 练习：最小相位系统的粗判
# @check: 0
# @check: stable
# @hint: 开环没有右半平面极点且轨迹不包围 -1 时，P=0 且 N=0。
open_loop_unstable_poles = 0
clockwise_encirclements = 1
closing_poles = open_loop_unstable_poles + clockwise_encirclements
verdict = "unstable" if closing_poles > 0 else "stable"
print(closing_poles)
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

按本课第 3 节的约定 $Z=P-N$。开环极点都在左半平面，所以 $P=0$；最小相位例题中轨迹不包围 $-1$，顺时针净圈数 $N=0$，应把误记的包围数改为 0；代入得闭环右半平面极点数 $Z=0$，稳定。（换用顺时针为负的教材约定时，公式写法不同但结论一致。）

</details>

## 6. 概念快问快答

```quiz
开环稳定时，最简单的 Nyquist 稳定条件是什么？
- 曲线必须经过原点
- 曲线不包围临界点 -1 [*]
- 曲线必须完全在虚轴右侧
? 对 P=0 的开环稳定系统，不包围 -1 对应 Z=0；但一般系统必须计入 P 和符号约定。
```

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为只画正频率就完整。负频率镜像和无穷半径连接弧也是判据的一部分。

**误区二**：你以为不包围就一定稳。开环不稳定时必须正确计入 $P$。

**误区三**：你以为穿过附近才算危险。距离太近意味着小参数漂移就可能失稳。

:::

## 8. 选读：为什么是 $-1$

<details>
<summary>选读 · 从特征方程到临界点</summary>

单位负反馈闭环满足 $1+L=0$，也就是 $L=-1$。$-1$ 表示幅值为 1、相位翻转 $180^\circ$；再加上反馈比较器的负号，回授恰好与扰动同相。Nyquist 方法把这组条件变成几何可见的包围关系。

</details>

## 9. 与 Bode 图互查

Bode 图适合读增益裕度和相位裕度；Nyquist 图适合看整体轨迹、条件稳定和多频段交叠。工程认证常常两张图都要，必要时再加时域仿真。

## 10. 下一站

知道稳定还不够。下一课量化“扰动到底被压掉多少”，这就是灵敏度函数。

→ [灵敏度函数](./45-sensitivity-function.md)
