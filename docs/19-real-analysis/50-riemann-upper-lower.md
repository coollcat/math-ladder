---
title: Riemann 积分的严格定义
lesson_id: real-analysis/riemann-upper-lower
prereqs:
  - real-analysis/uniform-convergence
  - integrals/riemann
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - upper-sum
  - lower-sum
applications:
  - area-computation
  - probability-density
exits:
  - research
  - engineering
---

# Riemann 积分的严格定义

## 1. 从一个场景开始

第 14 章的黎曼和用中点、左端点或右端点取样，已经能算面积。但严格定义不能依赖“运气好选到好采样点”。它要用每格的下确界和上确界，从下方和上方同时夹逼。

## 2. 直觉解释

把区间切成小格。每格画两个矩形：

- 下矩形高度取函数在该格的下确界；
- 上矩形高度取函数在该格的上确界。

下和从下面托住面积，上和从上面压住面积。分割越细，两者越接近；若能逼出同一个数，函数 Riemann 可积。

## 3. 正式定义

对分割 $P:a=x_0<x_1<\cdots<x_n=b$，令

$$m_i=\inf_{x\in[x_{i-1},x_i]}f(x),\qquad M_i=\sup_{x\in[x_{i-1},x_i]}f(x).$$

下和与上和分别是：

$$L(f,P)=\sum_{i=1}^n m_i\Delta x_i,\qquad U(f,P)=\sum_{i=1}^n M_i\Delta x_i.$$

若 $\sup_P L(f,P)=\inf_P U(f,P)$，这个公共值就是 Riemann 积分。

## 4. 分步例题

取 $f(x)=x^2$，区间 $[0,2]$，均匀分成 $n=10$ 格。

1. 第 $i$ 格左端点是 $\frac{2(i-1)}{10}$，下和用它的平方；
2. 第 $i$ 格右端点是 $\frac{2i}{10}$，上和用它的平方；
3. 下和 $=2.28$；
4. 上和 $=3.08$；
5. 差为 $0.8$。加细到 $n=100$ 时，差缩到 $0.08$。

## 5. 动手实验

### 实验 1：上和与下和夹逼

```viz
{
  "type": "riemann-upper-lower",
  "title": "x² 的上下和",
  "expr": "x^2",
  "xmin": 0,
  "xmax": 2,
  "n": 10
}
```

拖动格数。绿柱从下方托起，红框从上方压下；读数中的差随 $n$ 缩小。

### 实验 2：中点黎曼和对照

```viz
{
  "type": "riemann",
  "title": "中点采样：x²",
  "expr": "x^2",
  "xmin": 0,
  "xmax": 2,
  "n": 10
}
```

严格定义不依赖中点，但中点和常落在下和与上和之间，是很好的数值对照。

### 实验 3：Python 计算上下和

```python title="均匀分割的上下和"
def f(x):
    return x * x

a = 0.0
b = 2.0
n = 10
width = (b - a) / n
lower = 0.0
upper = 0.0
for i in range(n):
    left = a + i * width
    right = left + width
    lower = lower + f(left) * width
    upper = upper + f(right) * width

print(round(lower, 4))
print(round(upper, 4))
print(round(upper - lower, 4))
```

输出 `2.28`、`3.08`、`0.8`。

## 6. 练习

```exercise
# @title: 练习：补全上下和
# @check: 2.28
# @check: 3.08
# @check: 0.8
# @hint: x² 在 [0,2] 上递增；下和用左端点，上和用右端点。
def f(x):
    return x * x

a = 0.0
b = 2.0
n = 10
width = (b - a) / n
lower = 0.0
upper = 0.0
for i in range(n):
    left = a + i * width
    right = left + width
    lower = lower + f(right) * width
    upper = upper + f(left) * width

print(round(lower, 4))
print(round(upper, 4))
print(round(upper - lower, 4))
```

<details>
<summary>点开查看逐步解答</summary>

$x^2$ 在每格递增，所以：

```python
def f(x):
    return x * x

a, b, n = 0.0, 2.0, 10
width = (b - a) / n
lower = 0.0
upper = 0.0
for i in range(n):
    left = a + i * width
    right = left + width
    lower = lower + f(left) * width
    upper = upper + f(right) * width

print(round(lower, 4))
print(round(upper, 4))
print(round(upper - lower, 4))
```

代入 $n=10$：

```text
lower=2.28
upper=3.08
upper-lower=0.80
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：容易默认上和总取右端点。只有递增函数才如此；一般函数要取每格上确界。

**误区二**：容易以为函数有定义就可积。有界且间断不太多的函数才可积；严重间断会破坏夹逼。

**误区三**：容易把上下和之差小误读成积分值本身。差小说明可积，积分值是被两者共同夹出的公共数。

:::

## 8. 快问快答

```quiz
Riemann 可积的直觉条件是什么？
- 上和与下和必须完全相等
- 上和与下和之差可以被任意压小 [*]
- 函数必须单调递增
? 当分割无限加细时，若 U-L 能趋于 0，上下和夹出同一个积分值。
```

## 9. 选读：间断点如何捣乱

<details>
<summary>选读 · Dirichlet 函数不可积</summary>

令 $f(x)=1$ 当 $x$ 为有理数，$f(x)=0$ 当 $x$ 为无理数。任何小区间内都有有理数和无理数，所以每格下确界为 0、上确界为 1。任何分割都有 $L=0$、$U=1$，差永远是 1，不可积。间断“太密”会阻止上下和靠拢。

</details>

## 10. 下一站

严格积分处理面积；严格收敛分析处理函数逼近。下一课把两者精神合起来，重新审视 Fourier 部分和在跳点附近的行为。

→ [Fourier 级数的分析视角](./60-fourier-strict-convergence.md)
