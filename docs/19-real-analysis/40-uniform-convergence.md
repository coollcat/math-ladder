---
title: 一致收敛与交换次序
lesson_id: real-analysis/uniform-convergence
prereqs:
  - real-analysis/epsilon-delta-continuity
  - series/power
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
  - uniform-convergence
applications:
  - function-approximation
  - numerical-series
exits:
  - research
  - scientific-computing
---

# 一致收敛与交换次序

## 1. 从一个场景开始

一个班每个学生都在进步，不代表全班整体已经达到目标线；可能总有人落在后面。函数列也一样：每个点逐点收敛，不等于全域一致收敛。

## 2. 直觉解释

取函数列

$$f_n(x)=\frac{\sin(nx)}{n}.$$

对每个固定 $x$，分母增大，$f_n(x)\to0$。更强的是：全域最大误差就是 $\frac1n$，不依赖 $x$。这叫一致收敛。

一致收敛允许很多“整体交换”：例如连续函数列的一致极限仍连续。

对**单个函数**的连续性做同样的“整体检查”，得到的就是 32 号课的 [一致连续](./32-uniform-continuity.md)：那边要求 $\delta$ 不许看位置，本课要求 $N$ 不许看 $x$——同一个“整体升级”语法在两个对象上的重演。

## 3. 正式定义

$f_n$ 在 $D$ 上一致收敛到 $f$，当且仅当：

$$\forall \epsilon>0,\ \exists N,\ \forall n>N,\ \forall x\in D:\ |f_n(x)-f(x)|<\epsilon.$$

关键等价条件是：

$$\sup_{x\in D}|f_n(x)-f(x)|\to0.$$

逐点收敛只要求每个固定 $x$ 的误差趋零；一致收敛要求最慢点也趋零。

## 4. 分步例题

在 $D=\mathbb R$ 上取 $f_n(x)=\frac{\sin(nx)}{n}$，极限函数 $f(x)=0$。

1. 任意 $x$ 满足 $\lvert f_n(x)\rvert\le\frac1n$；
2. 所以 $\sup_x\lvert f_n(x)-0\rvert\le\frac1n$；
3. 取 $x=\frac{\pi}{2n}$ 时误差正好是 $\frac1n$；
4. 因此上确界误差等于 $\frac1n$；
5. $\frac1n\to0$，所以 $f_n$ 一致收敛到 0。

## 5. 动手实验

### 实验 1：全域误差缩放

```viz
{
  "type": "uniform-convergence-zoom",
  "title": "sin(nx)/n 的一致收敛",
  "mode": "sin",
  "n": 10,
  "probe": 1
}
```

拖动探针。无论放在哪里，误差都不会超过 $\frac1n$；全域最慢点也同步下降。

### 实验 2：图像对照

```viz
{
  "type": "plot",
  "title": "n=10：蓝线是 sin(10x)/10，橙线是 0",
  "expr": "sin(10*x)/10",
  "expr2": "0",
  "xmin": -3.14,
  "xmax": 3.14
}
```

振幅被 $\frac1{10}$ 压平。增大 $n$ 的方式可以想象成整条曲线被压向零线。

### 实验 3：Python 比较两种误差

```python title="逐点误差和上确界误差"
import math

n = 10
probe_x = math.pi / (2 * n)
point_error = abs(math.sin(n * probe_x) / n)
sup_error = 1 / n
print(round(point_error, 4))
print(round(sup_error, 4))
print("uniform" if sup_error < 0.2 else "not uniform yet")
```

输出 `0.1`、`0.1`、`uniform`。

## 6. 练习

```exercise
# @title: 练习：从逐点误差升级到 sup 误差
# @check: 0.1
# @check: 0.1
# @check: uniform
# @hint: sin(nx)/n 的全域最大绝对值是 1/n；取 n=10。
import math

n = 5
probe_x = math.pi / (2 * n)
point_error = abs(math.sin(n * probe_x) / n)
sup_error = point_error
verdict = "pointwise only"
print(round(point_error, 4))
print(round(sup_error, 4))
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

把 $n$ 改成 10：

```python
n = 10
sup_error = 1 / n
```

在 $x=\frac{\pi}{2n}$ 处误差达到 $\frac1{10}$，所以：

```text
point error at x=π/(2n)≈0.1
sup error=0.1000
```

因为 $\frac1{10}<0.2$，判定为 `uniform`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：容易以为每个点都收敛就一定一致收敛。最慢点可能长期拖后。

**误区二**：容易期待连续函数列的极限一定连续。逐点收敛可能把连续函数折成跳跃函数；一致收敛才有更好的继承性。

**误区三**：容易把“极限函数存在”直接当成可交换极限与求导。还需要对函数列本身有一致收敛等条件。

:::

## 8. 快问快答

```quiz
一致收敛比逐点收敛强在哪里？
- 只需要检查一个点
- N 可以对所有 x 通用 [*]
- 误差不需要趋于零
? 一致收敛的 N 不依赖 x；同一件 epsilon 带要罩住全域。
```

## 9. 选读：交换次序的警告

<details>
<summary>选读 · 极限和求导不能随便换</summary>

对 $f_n(x)=\frac{\sin(nx)}{n}$，函数值一致收敛到 0。但导数是 $f_n'(x)=\cos(nx)$，它不随 $n$ 收敛。因此“$f_n\to f$”本身不足以推出“$f_n'\to f'$”。若要交换极限和求导，通常还需要导数列一致收敛。

</details>

## 10. 下一站

一致收敛给了函数逼近的整体控制。下一课把同样的“夹逼”思想带回面积：用下和与上和定义 Riemann 积分。

→ [Riemann 积分的严格定义](./50-riemann-upper-lower.md)
