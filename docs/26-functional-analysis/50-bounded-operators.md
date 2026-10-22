---
title: 线性算子与有界性
lesson_id: functional-analysis/bounded-operators
prereqs:
  - functional-analysis/norm-completion
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - bounded-operator
applications:
  - numerical-stability
  - differential-operators
exits:
  - engineering
  - research
---

# 线性算子与有界性

## 1. 开场钩子

矩阵能把平面旋转、拉伸、压扁。函数空间也需要类似的机器：微分、积分、卷积都是算子。但有些机器会把极小的输入放大成巨大输出，这类算子不能随便交换极限。

## 2. 直觉解释

线性算子保持加法和数乘；有界算子则保证输入方向的长度不会被无限放大。所谓“有界”，不是所有输出的长度有界，而是放大倍率有一个统一上限。

## 3. 正式定义

设 $X,Y$ 是赋范空间。线性算子 $T:X\to Y$ 有界，若存在常数 $C$ 使：

$$\lVert T(x)\rVert_Y\le C\lVert x\rVert_X.$$

最小的可能常数叫**算子范数**：

$$\lVert T\rVert=\sup_{x\ne0}\frac{\lVert T(x)\rVert}{\lVert x\rVert}.$$

有限维空间上线性映射必有界；无穷维中微分算子常常只在更小定义域上有界。

## 4. 分步例题

取 $A=\begin{pmatrix}2&1\\1&2\end{pmatrix}$。

1. 输入 $(1,1)$ 被放大 3 倍；
2. 输入 $(1,-1)$ 只被放大 1 倍；
3. 一般输入 $(x,y)$ 输出 $(2x+y,x+2y)$；
4. 在欧氏范数下最大拉伸出现在方向 $(1,1)$；
5. 因此 $\lVert A\rVert=3$。

## 5. 动手实验

### 实验 1：看方向如何被拉伸

```viz
{
  "type": "linear-map",
  "title": "算子作用：方向决定放大倍率",
  "matrix": [2, 1, 1, 2]
}
```

拖动蓝色输入点。画布会显示 $T(v)$ 的坐标；把输出长度除以输入长度，就得到当前方向的增益。试一下 $(1,1)$ 和 $(1,-1)$，分别读出 3 倍和 1 倍。

### 实验 2：扫描方向找最大增益

```python title="离散方向的最大增益"
# math 是数学工具库，用来计算 cos 和 sin。
import math
angles = [0.0, 0.3927, math.pi / 4, 1.1781, math.pi / 2]   # 在 0 到 π/2 之间取五个角度试算
best = 0.0                          # 擂台变量：记住扫到的最大增益
for t in angles:                    # 直接遍历列表里的每个元素
    # cos/sin 把角度转为单位向量
    x = math.cos(t)                 # 单位圆上的横坐标
    y = math.sin(t)                 # 单位圆上的纵坐标：x²+y² 恒为 1
    out_x = 2 * x + y               # 算子的第一行：[2, 1] 作用在 (x, y) 上
    out_y = x + 2 * y               # 第二行：[1, 2]
    out_len_sq = out_x * out_x + out_y * out_y   # 输出向量的长度平方
    gain = out_len_sq ** 0.5        # ** 0.5 就是开平方
    if gain > best:                 # if 比较：只有更大才换擂主
        best = gain                 # 换擂主
print("norm≈", best)                # 扫到的最大增益就是算子范数的近似
```

加密 `angles` 会越来越接近真实算子范数 3。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为有界指像集有界。它指把单位球映成有界集，也就是全局放大倍率受控。

**误区二**：你以为线性和连续总是分开讨论。在赋范空间之间，线性算子连续与有界等价。

**误区三**：你以为有限维经验可直接搬到无穷维。无穷维单位球不紧，很多“取最大值”的说法要换成上确界。

:::

## 7. 练习

```exercise
# @title: 练习：计算对角算子的范数
# @check: norm=3.0
# @hint: 对角矩阵在欧氏范数下的最大增益是各绝对特征值的最大者。
scales = [-3.0, 1.0, 2.0]   # 对角算子的三个缩放因子
norm = abs(scales[1])       # ← 擂主拿错了下标：应从第一个开始
print("norm=" + str(norm))   # 与 @check 对位
```

<details>
<summary>点开查看逐步解答</summary>

三个方向分别放大 $3,1,2$ 倍；符号表示翻转，不影响长度。最大绝对值是 3，所以应遍历三个数并保留最大绝对值。

```python
scales = [-3.0, 1.0, 2.0]   # 三个缩放因子
norm = abs(scales[0])       # 擂主从第一个开始：|−3| = 3
if abs(scales[1]) > norm:   # 逐个比较，取绝对值最大的那个
    norm = abs(scales[1])   # 换擂主
if abs(scales[2]) > norm:   # 第三个再比一遍
    norm = abs(scales[2])   # 换擂主
print("norm=" + str(norm))   # norm=3.0
```
</details>

## 8. 快问快答

```quiz
线性算子有界的直观含义是什么？
- 所有输出都必须小于 1
- 存在统一常数控制放大倍率 [*]
- 只能作用于零向量
? 有界允许输出变大，但放大幅度不能随方向或位置失去控制。
```

## 9. 选读证明

<details>
<summary>选读 · 连续与有界等价</summary>

若有界，则 $\lVert Tx-Ty\rVert\le\lVert T\rVert\lVert x-y\rVert$，故连续。反之若连续但不有界，可选单位向量 $x_n$ 使 $\lVert Tx_n\rVert>n$；令 $y_n=x_n/n$，则 $\lVert y_n\rVert\to0$ 而 $\lVert Ty_n\rVert>1$，破坏在零点的连续性。
</details>

## 10. 下一站

有界算子有自己的“影子测量员”。下一课研究对偶空间：线性泛函如何给向量打分。

→ [对偶空间](./55-dual-spaces.md)



