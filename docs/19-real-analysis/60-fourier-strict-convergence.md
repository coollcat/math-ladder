---
title: Fourier 级数的分析视角
lesson_id: real-analysis/fourier-strict-convergence
prereqs:
  - real-analysis/uniform-convergence
  - fourier/square-wave
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - pointwise-convergence
  - gibbs-phenomenon
applications:
  - signal-reconstruction
  - spectral-methods
exits:
  - research
  - engineering
---

# Fourier 级数的分析视角

## 1. 从一个场景开始

第 16 章你看见方波合成时跳点旁总有一个尖包。现在要给出严格结论：部分和在连续点收敛到原函数，在跳点收敛到左右平均值；尖包高度不消失，只变窄。

## 2. 直觉解释

方波的部分和是：

$$S_M(x)=\frac4\pi\sum_{j=1}^M\frac{\sin((2j-1)x)}{2j-1}.$$

在连续平台上，$S_M(x)$ 逐渐贴住 $\pm1$。在跳点 $x=\pi$，每一项都是零，所以 $S_M(\pi)=0$，正是左右值 $+1$ 和 $-1$ 的平均。

但在跳点附近，部分和会冲过头。谐波越多，过冲宽度越小，高度却始终约为跳幅的 9%。

## 3. 正式定义

若函数分段光滑且有跳跃，则 Fourier 部分和在每个跳点收敛到：

$$\frac{f(x^-)+f(x^+)}{2}.$$

吉布斯现象指：靠近跳点处最大过冲不趋于零；经典方波的峰值比上台阶高出的量约为全跳幅的 9%。

逐点收敛允许每个点各自逼近；它不保证全域最大误差趋零，所以不是一致收敛。

## 4. 分步例题

取 $M=9$ 项奇次谐波。

1. 在跳点 $x=\pi$，$\sin(n\pi)=0$，所以 $S_9(\pi)=0$；
2. 在 $\left(0,\pi\right)$ 内扫描最大值，约为 $1.180$；
3. 台阶高度从 $-1$ 到 $1$，上半阶高度是 1；
4. 峰值比上台阶高 $(1.180-1)$；
5. 按全跳幅 2 计，工程上常说过冲约 9%。

## 5. 动手实验

### 实验 1：跳点与过冲

```viz
{
  "type": "fourier-gibbs-strict",
  "title": "部分和、跳点与过冲",
  "harmonics": 9,
  "halfWidth": 0.7
}
```

增大谐波数。红峰向跳点靠拢，高度几乎不变；跳点读数始终为 0。

### 实验 2：谐波叠加对照

```viz
{
  "type": "sines",
  "title": "奇次谐波叠加",
  "terms": [1, 3, 5, 7, 9]
}
```

只看前几项时，波形像正弦；加入更多奇次谐波后，平台变平、边沿变陡，但尖包仍在。

### 实验 3：Python 测跳点与峰值

```python title="跳点值、峰值与过冲比例"
import math

M = 9
def partial(x):
    total = 0.0
    for j in range(1, M + 1):
        n = 2 * j - 1
        total = total + math.sin(n * x) / n
    return 4 * total / math.pi

jump_value = partial(math.pi)
peak = 0.0
for k in range(1, 10000):
    x = math.pi * k / 10000
    peak = max(peak, partial(x))
overshoot = (peak - 1) * 50
print(round(jump_value, 3))
print(round(peak, 3))
print(round(overshoot, 1))
```

`round(..., 3)` 会保留三位小数的数值，但不会强制显示结尾的零，所以实际输出 `0.0`、`1.18`、`9.0`。

## 6. 练习

```exercise
# @title: 练习：测量跳点与过冲
# @check: 0.0
# @check: 1.18
# @check: 9.0
# @hint: 跳点是 π，不是 π/2；峰值要扫描 (0,π) 内很多点。
import math

M = 9
def partial(x):
    total = 0.0
    for j in range(1, M + 1):
        n = 2 * j - 1
        total = total + math.sin(n * x) / n
    return 4 * total / math.pi

jump_value = partial(math.pi / 2)
peak = jump_value
overshoot = 0.0
print(round(jump_value, 3))
print(round(peak, 3))
print(round(overshoot, 1))
```

<details>
<summary>点开查看逐步解答</summary>

跳点应为：

```python
import math

M = 9
def partial(x):
    total = 0.0
    for j in range(1, M + 1):
        n = 2 * j - 1
        total = total + math.sin(n * x) / n
    return 4 * total / math.pi

jump_value = partial(math.pi)
```

峰值要扫描：

```python
import math

M = 9
def partial(x):
    total = 0.0
    for j in range(1, M + 1):
        n = 2 * j - 1
        total = total + math.sin(n * x) / n
    return 4 * total / math.pi

peak = 0.0
for k in range(1, 10000):
    x = math.pi * k / 10000
    peak = max(peak, partial(x))

overshoot = (peak - 1) * 50
```

得到 `0.0`、`1.18`、`9.0`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：容易期待加更多谐波能消除过冲。高度基本不变，只有宽度收缩。

**误区二**：容易猜测跳点处部分和会选上台阶值。它收敛到左右平均值。

**误区三**：容易高估逐点收敛的强度。吉布斯现象正说明它不提供一致的全域误差控制。

:::

## 8. 快问快答

```quiz
方波 Fourier 部分和在跳点 π 收敛到几？
- 1
- -1
- 0 [*]
? 左极限是 1，右极限是 -1；Fourier 部分和收敛到平均值 0。
```

## 9. 选读：为什么不是一致收敛

<details>
<summary>选读 · 误差峰只是搬家</summary>

若 $S_M$ 一致收敛到方波，则全域最大误差应趋于零。但每个 $M$ 都有靠近跳点的峰，高度约为跳幅的 9%。$M$ 增大时，峰宽按约 $\frac1M$ 收缩，峰高不降，因此上确界误差不趋零。逐点收敛是真的，一致收敛是假的。

</details>

## 10. 下一站

实分析首批九课已经把完备性、Cauchy、单调有界与 Bolzano-Weierstrass、连续性、一致连续、中值定理、一致收敛、Riemann 可积性和 Fourier 逐点收敛连成一条严格化主线。$L^2$ 收敛留作后续扩展。

→ [第 19 章 · 实分析](./index.md)
