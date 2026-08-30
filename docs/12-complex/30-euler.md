---
title: 欧拉公式
lesson_id: complex/euler
prereqs:
  - complex/polar
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 欧拉公式：e^(iθ) = cosθ + i·sinθ

## 1. 从一个场景开始

先看一个关于钱的问题。本金 1 元、年利率 100%，一年结算一次，年底拿 2 元。要是**每时每刻都在利滚利**呢？年底能拿到无穷多钱吗？

答案是约 **2.71828** 元——不多不少，卡在一个常数上。这个常数叫 e，是"自然增长之数"。而本章真正的爆点是：这个管增长的 e，转过头来竟然精确描述了**圆上的旋转**——

$$e^{i\pi} + 1 = 0$$

五个最重要的常数 $e, i, \pi, 1, 0$ 在一条公式里同框，被数学家们票选为"最美的公式"。它凭什么成立？本课拆给你看。

## 2. 直觉解释

**上半场：e 是谁。** 利滚利结算越频繁，$n$ 次结算后的本息 $\left(1+\dfrac1n\right)^n$ 就越大，但增长越来越慢——像追一条永远差半步的线。这条线的尽头就是 e ≈ 2.71828…。它是"连续复利"的极限，也是自然界一切平滑增长（人口、放射性衰变、充电曲线）共享的底数。

**下半场：e 怎么会跟旋转有关。** 上一课说过，单位圆上的点全体可以写成 $\cos\theta+i\sin\theta$。欧拉公式宣布：

$$e^{i\theta} = \cos\theta + i\sin\theta$$

也就是说，把 e 的指数从实数换成虚数，"增长"就变成了"转动"：$\theta$ 增大，$e^{i\theta}$ 沿单位圆逆时针跑圈。指数在这里换了身份——从"乘多少遍"变成"转多少弧度"。

## 3. 正式定义

**e 的出生证明**：让结算次数 $n$ 一路翻倍，本息 $\left(1+\dfrac{1}{n}\right)^{n}$ 步步爬升却永远够不着头——它逼近的那个数就叫 $e$，约等于 $2.71828\ldots$。（"逼近的尽头"如何严格化，要等下一章的极限语言来办理；本课先把这个数值事实用起来。）

**欧拉公式**：对所有实数 $\theta$，

$$e^{i\theta} = \cos\theta + i\sin\theta$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $e$ | 自然对数的底 | 连续复利极限，"自然增长之数" |
| $\mathrm{e}^{i\theta}$ | 虚指数幂 | 单位圆上辐角为 $\theta$ 的点 |
| 欧拉公式 | — | 上面的恒等式，对所有实数 $\theta$ 成立 |

取 $\theta=\pi$ 立刻得到 $e^{i\pi}=\cos\pi+i\sin\pi=-1$，移项即五大常数同框的 $e^{i\pi}+1=0$。

## 4. 分步例题

**例**：不背结论，推出 $e^{i\pi/2}$ 等于什么。

1. 代入欧拉公式：$e^{i\pi/2}=\cos\dfrac{\pi}{2}+i\sin\dfrac{\pi}{2}$；
2. 查单位圆：$\cos 90°=0$，$\sin 90°=1$；
3. 所以 $e^{i\pi/2}=i$——转四分之一圈，正好站上虚轴；
4. 两边平方：$e^{i\pi}=i^2=-1$，与直接代入 $\theta=\pi$ 的结果严丝合缝。旋转和代数互相咬合，一环没松。

## 5. 动手实验

$e^{i\theta}$ 的全部秘密就是"在单位圆上转角"。拖动圆上的点，看 $\cos\theta$ 与 $\sin\theta$ 如何随角度伸缩——公式不过是它们的组合：

```viz
{ "type": "unitcircle", "title": "单位圆：e^{iθ} 的跑道" }
```

### 实验 1（python）：e 的出生证明

```python title="利滚利的表格逼近"
import math

# 本金 1 元、年利率 100%，一年结算 n 次：年底本息 (1 + 1/n)**n
ns = [1, 10, 100, 10000]
for n in ns:
    total = (1 + 1/n) ** n
    print(f"n={n}: {round(total, 4)}")
# 表格步步逼近 2.7181…，却永远够不着头——这个极限就叫 e

print(math.e)        # math.e 是 Python 内置常量：e ≈ 2.718281828459045
print(math.exp(1))   # math.exp(x) 是官方版 e^x：输入 x，返回 e 的 x 次幂
print(math.exp(2))   # e² ≈ 7.389，验证：math.e ** 2 与它一致
```

### 实验 2（python）：拖动 θ，数值验证欧拉公式

```python title="e^(iθ) 与 cosθ+i·sinθ 并肩对照"
import math

# sliders: theta_deg=60 [0:360:15]

rad = math.radians(theta_deg)               # 度转弧度：cos/sin 只认弧度（第 7 章第一大坑）
left = math.e ** (1j * rad)                 # 左边：e^(iθ)。** 幂运算原生支持复数，不需要 cmath 库
right = math.cos(rad) + 1j * math.sin(rad)  # 右边：手拼 cosθ + i·sinθ

print(f"θ = {theta_deg}°")
print(f"e^(iθ) : 实部 {round(left.real, 4)}，虚部 {round(left.imag, 4)}")
print(f"cos/sin: cosθ {round(math.cos(rad), 4)}，sinθ {round(math.sin(rad), 4)}")
diff = abs(left - right)                    # 复数相减再 abs —— 差距的模长（上一课的用法）
print(f"差距 = {diff}")                     # 拖到哪都是 0.0 —— 两条路线完全重合
```

怎么玩：把 θ 从 $0°$ 拖到 $360°$，中间两行读数始终并肩——实部贴着 $\cos\theta$、虚部贴着 $\sin\theta$，差距行永远是 0.0（顶多剩 $10^{-16}$ 量级的浮点尘埃）。三个值得停留的站点：$\theta=90°$ 时左边恰好是 $i$；$\theta=180°$ 时是 $-1$；$\theta=360°$ 绕回 $1$。旋转这件事，已经被 $e^{i\theta}$ 一手包办。

### 实验 3（python）：θ = π，见证最美公式

```python title="e^(iπ) 落在哪里"
import math

z = math.e ** (1j * math.pi)
print(z)          # (-1+1.22e-16j)：虚部只剩浮点尘埃，实部正是 -1
print(z.real)     # -1.0
print(abs(z))     # 1.0 —— 它确实在单位圆上（模长恒为 1）
# 于是 e^(iπ) + 1 = 0：e、i、π、1、0 五大常数同框
```

### 快问快答

```quiz
模长 |e^(iθ)| 等于多少？
- e
- θ
- 1 [*]
? 由欧拉公式它是 cos²θ+sin²θ 的平方根，而第 7 章证明过这个和恒为 1。所以 e^(iθ) 永远贴着单位圆转。
```

:::warning[常见误区]

**误区一**："你以为 $e^{i\theta}$ 是普通的幂运算。" 它**不是**"e 乘自己若干遍"——那个定义连 $e^{\sqrt2}$ 都应付不了，更别说虚数次数了。$e^{i\theta}$ 是**旋转发生器**：喂进角度（弧度），吐出单位圆上的点。指数的含义在此升级。

**误区二**："你以为 `math.exp()` 也能吃复数。" `math.exp` 只收实数，塞复数进去会直接报错。复数情形统一写 `math.e ** (1j * θ)`——`**` 运算符原生支持复数，不需要任何额外的库。

**误区三**："你以为 θ 超过 2π 公式就失效。" 弧度要多大有多大：$\theta=10$ 就是多转一圈半，公式照常成立，周期性由 cos/sin 天生自带。

:::

## 6. 练习

**练习 1**：验证 $e^{i\pi}$ 落在单位圆上——打印它的模长。代码能跑但结果离谱，改到通过：

```exercise
# @title: 练习：e^(iπ) 的模长
# @check: 1.0
# @hint: "e 的 iπ 次方"要用 ** 幂运算；而且 i 和 π 得一起放进括号当指数：(1j * math.pi)
import math

# 目标：e^(iπ) 的模长应该是 1。下面这行把幂错写成了连乘！
print(round(abs(math.e * 1j * math.pi), 6))
```

**练习 2**：利用欧拉公式，用 $e^{i\theta}$ 和 $e^{-i\theta}$ 把 $\cos\theta$ 单独表示出来。

<details>
<summary>点开查看逐步解答</summary>

两式并排写出：

$$e^{i\theta}=\cos\theta+i\sin\theta, \qquad e^{-i\theta}=\cos\theta-i\sin\theta$$

（第二行用了 $\cos(-\theta)=\cos\theta,\ \sin(-\theta)=-\sin\theta$，第 7 章练习的老结论。）两式相加，正负 sin 抵消：

$$\cos\theta=\frac{e^{i\theta}+e^{-i\theta}}{2}, \qquad \text{同理相减得 } \sin\theta=\frac{e^{i\theta}-e^{-i\theta}}{2i}$$

三角函数从此可以写成指数的语言——这正是第 16 章傅里叶变换公式的长相。
</details>

## 7. 选读：为什么 e 会认识三角函数

<details>
<summary>选读 · 幂级数里两队人马自动列队</summary>

严格理由要到第 15 章（泰勒级数）才讲全，这里先剧透一句话版本：$e^x$、$\cos x$、$\sin x$ 都能展开成幂级数——比如 $e^x = 1+x+\frac{x^2}{2!}+\frac{x^3}{3!}+\cdots$。把 $x=i\theta$ 代进去，利用 $i^2=-1$ 反复化简，偶数次项全部变号回正、聚成 $\cos\theta$ 的级数；奇数次项带着一个孤零零的 $i$，聚成 $i\sin\theta$ 的级数。两支队伍自动列队，分毫不差。

所以欧拉公式不是巧合，而是"多项式般的运算法则 + $i^2=-1$"的必然产物。等第 15 章工具到位，欢迎回来把这场演出完整看一遍。

</details>

## 8. 下一站

欧拉公式给了每个复数一张身份证：**模长 × 角度**。两个复数相乘，身份证会怎么变化？答案漂亮得过分——辐角相加，模长相乘。乘法从此有了旋转的画面。

→ [复数乘法＝旋转＋伸缩](./40-multiplication.md)
