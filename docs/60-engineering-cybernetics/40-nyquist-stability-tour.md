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

对开环传递函数 $L(s)$，设右半平面开环极点数为 $P$，Nyquist 轨迹**顺时针**包围 $-1$ 的净圈数为 $N$，右半平面闭环极点数为 $Z$。本课全程用**顺时针为正**这一个约定，于是判据写成：

$$Z=P+N.$$

**符号约定必须先说清，否则差一个负号。** 不少教材取「逆时针为正」并把判据写成 $Z=P-N$；两者是同一条式子换了 $N$ 的正负号。本课后面所有读数、例题、组件都统一用上面的形式，遇到别的书写法先确认它的 $N$ 朝哪边数，再代公式。

本课先处理 $P=0$ 的最小相位回路：此时 $Z=N$，于是「不包围 $-1$（$N=0$）⟺ 闭环没有右半平面极点」。

## 4. 分步例题

取三个实极点的回路：

$$L(s)=\frac{K}{(s+1)(s+2)(s+3)}.$$

1. 开环极点是 $-1,-2,-3$，全在左半平面，所以 $P=0$；
2. 高频时 $L$ 缩到原点；
3. 低频时实部为正，起点在右半平面；
4. 负频率轨迹是正频率轨迹关于实轴的镜像；
5. 只要 $K$ 不大到让轨迹**绕** $-1$ 一圈，就有 $N=0$，因此 $Z=0$，闭环稳定。

**为什么必须是三个极点，两个不行。** 这一条是整课的枢纽，值得单独算。若只有两个极点，$L(j\omega)$ 的相角是 $-\arctan(\omega/a)-\arctan(\omega/b)$，它的取值范围是 $(-180^\circ, 0)$——**永远到不了** $-180^\circ$。于是轨迹绝不穿过负实轴，那个「最左点」只是实部最小的地方，而那里的虚部并不为零（$a=1,b=2$ 时最左点 $\mathrm{Re}\,L=-0.716$ 处 $\mathrm{Im}\,L=-1.77$），它从 $-1$ 的**下方**掠过，从不与 $-1$ 重合也不绕它。

后果是硬性的：两个极点时闭环特征式是 $s^2+(a+b)s+(ab+K)=0$，两根之和 $=-(a+b)<0$、之积 $=ab+K>0$，两根实部恒为 $-(a+b)/2$，**与 $K$ 无关**。这种回路对任何 $K>0$ 都稳定，增益裕度是无穷大——它根本演示不了「包围 ⟹ 失稳」。

三个极点才让相角真的走到 $-180^\circ$。相位穿越点由 $\arctan(\omega/a)+\arctan(\omega/b)+\arctan(\omega/c)=180^\circ$ 定出，解出来是一个很干净的值：

$$\omega_0=\sqrt{ab+bc+ca}.$$

在 $\omega_0$ 处轨迹恰好落在负实轴上，模长是 $|L(j\omega_0)|=K/\big[(a+b+c)(ab+bc+ca)-abc\big]$。令它等于 $1$ 就得到临界增益：

$$K^*=(a+b+c)(ab+bc+ca)-abc.$$

代入 $a=1,\,b=2,\,c=3$：$\omega_0=\sqrt{11}=3.3166$，$K^*=6\times11-6=60$；此时 $L(j\omega_0)=-1$ 精确成立。这与 Routh 判据对 $s^3+6s^2+11s+(6+K)$ 算出的结论一致：$K<60$ 稳定，$K>60$ 有两个右半平面极点。

## 5. 动手实验

### 实验 1（lab）：把 K 推到临界增益

拖 K，看轨迹怎么鼓起来绕过 $-1$。

```lab
{ "type": "nyquist-stability-tour", "title": "K 加到多少会失稳", "K": 20, "a": 1, "b": 2, "c": 3 }
```

默认 $K=20$、$a=1$、$b=2$、$c=3$，临界增益 $K^*=(a+b+c)(ab+bc+ca)-abc=60$。此时轨迹的实部最小值是 $-0.716$，离橙色菱形还远，读数给 $N=0$、$Z=0$、增益裕度 $3\times$。按「跳到临界」，K 被顶到 60：轨迹正好压在 $-1$ 上，读数变成「正踩在 K* 上」、裕度 $1.00\times$——闭环极点在虚轴上（可验算 $s^3+6s^2+11s+66$ 在 $K=60$ 时的根是 $-6$ 和 $\pm j\sqrt{11}$），这就是临界稳定。

再多拖到 90（1.5 倍临界），$N$ 翻成 **2**、$Z$ 也成 2——闭环长出两个右半平面极点。**注意 N 是 2 不是 1**：轨迹在那里两次穿过负实轴（一次上行一次下行），包围数是整圈数，所以是 2。读数栏的「卷绕数 ✓ Routh 一致」就是在说这两条独立算出来的数对上了。

再把 $b$ 从 2 拖到 4：$K^*$ 变成 $(1+4+3)(4+12+3)-1\cdot4\cdot3=8\times19-12=140$，同一个 $K=20$ 反而更安全了（裕度 $7\times$）。**判据从来不是「K 大不大」，是「轨迹绕没绕过去」**。

### 实验 2：画出复平面轨迹

```python title="三阶回路的 Nyquist 半支"
# sliders: K=20 [5:120:1]
import math                      # 数学库：提供 cos 和 sin 参数化辅助
import matplotlib.pyplot as plt  # 绘图库：画复平面曲线

frequencies = []                 # 存放选出的有限频率点
real_parts = []                  # L 的实部
imag_parts = []                  # L 的虚部
end_index = 200                  # 最大步数：把参数区间分成 200 份

for n in range(end_index + 1):
    theta = -math.pi / 2 + math.pi * n / end_index
    omega = math.tan(theta)      # tan：正切映射，把角度铺成覆盖低频到高频的频率点
    if abs(omega) < 1000:        # 数值终点保护，避免极端值
        # 分母 = (jw+1)(jw+2)(jw+3) = (6 - 11w^2) + j(11w - w^3)
        re_d = 6 - 11 * omega * omega
        im_d = 11 * omega - omega ** 3
        denominator = re_d ** 2 + im_d ** 2
        real = K * re_d / denominator
        imag = -K * im_d / denominator   # 分子乘的是分母的共轭，虚部取负
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

把 $K$ 从默认的 20 往上拖：曲线整体外扩并转向。$K=60$ 时它正好穿过红色临界点（$\omega_0=\sqrt{11}$ 处 Re 到 $-1$、Im 恰为 $0$——这正是三极点才有的「真穿越」）；再往上，曲线从「在 $-1$ 右侧」变成「把 $-1$ 圈在里面」。这里只画正频段；完整 Nyquist 图还要补镜像和连接弧。

**自己验一下读数**：这段代码扫描的是整条有限折线，所以「距临界点最近平方」取的是折线上所有点到 $-1$ 的最小距离 ——注意它**不是**穿越点处的距离。$K=20$ 时它读 $0.2618$、$K=60$ 时读 $0.0361$，都在离 $-1$ **更近**的邻近频率上取到，不是穿越点自己（$K=20$ 时穿越点 $L(j\sqrt{11})=-1/3$，到 $-1$ 的距离平方是 $(2/3)^2=0.4444$）。想看穿越点就单独把 $\omega=\sqrt{11}$ 代进去：$L(j\sqrt{11})=-K/60$，$K=60$ 时正好是 $-1$。

### 实验 3：用极点做粗判

```exercise
# @title: 练习：最小相位系统的粗判
# @check: 0
# @check: stable
# @hint: 开环没有右半平面极点且轨迹不包围 -1 时，P=0 且 N=0。
open_loop_unstable_poles = 0  # open_loop_unstable_poles 对应 Nyquist 判据里的 P，这里由题面给定
clockwise_encirclements = 1  # clockwise_encirclements 对应判据里的 N，本课约定顺时针为正
closing_poles = open_loop_unstable_poles + clockwise_encirclements  # Z = P + N：本课第 3 节的约定。题面故意把 N 填成 1（最小相位回路并未包围 -1，应为 0），于是判据给出不稳定、与下面两行 @check 对不上——这就是要你改的地方
verdict = "unstable" if closing_poles > 0 else "stable"  # 条件表达式（三元式）首现：条件为真取前面那个值，否则取 else 后面的
print(closing_poles)
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

按本课第 3 节的约定 $Z=P+N$（顺时针为正）。开环极点都在左半平面，所以 $P=0$；最小相位回路中轨迹不包围 $-1$，顺时针净圈数 $N=0$，应把误记成 1 的包围数改回 0；代入得闭环右半平面极点数 $Z=0$，稳定。（若换用逆时针为正的教材，$N$ 与公式同时换号，结论一致。）

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
