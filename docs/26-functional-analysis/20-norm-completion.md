---
title: 范数与完备化
lesson_id: functional-analysis/norm-completion
prereqs:
  - functional-analysis/function-spaces
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - norm
applications:
  - error-measurement
exits:
  - research
---

# 范数与完备化

## 1. 开场钩子

两条曲线都能逼近同一段真实信号，但一条误差均匀地小，另一条只在大多数点小。说“接近”之前，必须先选择一把尺子。

## 2. 直觉解释

范数是向量长度的推广。对函数来说，它可以问最大偏差有多高，也可以问总能量有多大。不同尺子会给出不同答案，因此没有唯一“正确距离”，只有适合问题的距离。

## 3. 正式定义

向量空间 $V$ 上的**范数**是函数 $\lVert\cdot\rVert:V\to[0,\infty)$，满足正定性、齐次性和三角不等式：

$$\lVert v\rVert=0\Leftrightarrow v=0,\quad \lVert kv\rVert=|k|\lVert v\rVert,\quad \lVert u+v\rVert\le\lVert u\rVert+\lVert v\rVert.$$

常用 $p$ 范数定义为：

$$\lVert x\rVert_p=\left(\sum_{i=1}^n |x_i|^p\right)^{1/p},\qquad \lVert x\rVert_\infty=\max_i |x_i|.$$

若序列满足 $\lVert x_m-x_n\rVert\to0$，称为 Cauchy 列；空间中所有 Cauchy 列都有极限时称为**完备**。

## 4. 分步例题

取 $x=(3,-4,12)$。

1. $L_1$ 长度是 $3+4+12=19$；
2. $L_2$ 长度是 $\sqrt{9+16+144}=13$；
3. $L_\infty$ 长度只看最大绝对值，等于 $12$；
4. 同一个点在三把尺子下有三种长度；
5. 但在固定维数的向量空间中，三者互相控制：小误差在某一种意义下成立时，另两种不会任意坏。

## 5. 动手实验

### 实验 1：单位球的形状随 p 改变

```viz
{
  "type": "plot",
  "title": "第一象限的单位球边界",
  "expr": "(1 - x^p)^(1/p)",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "p", "min": 1, "max": 8, "step": 0.1, "value": 2 }
  ]
}
```

$p=1$ 是直线段的一部分，对应菱形；$p=2$ 是圆弧；$p$ 很大时趋近方形角。

### 实验 2：给离散信号量三种误差

```python title="同一个信号的三个长度"
# samples 是某传感器在四个时刻的误差
samples = [0.2, -0.8, 0.6, -0.1]
l1 = abs(samples[0]) + abs(samples[1]) + abs(samples[2]) + abs(samples[3])
l2 = (l1 * 0)  # 学生可改为平方和开方的完整式
linf = 0       # 学生可改为最大绝对误差
print("L1=", l1)
print("L2=", l2)
print("Linf=", linf)
```

把 `l2` 改成各绝对值平方相加后开平方，把 `linf` 改成最大绝对值，观察三种误差的排序。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为长度只有勾股定理一种。函数空间中，最大误差、平均能量、总偏差各自都是合法范数。

**误区二**：你以为 Cauchy 列一定在原空间收敛。有理数中的 $1,1.4,1.41,\dots$ 是 Cauchy 列，但极限 $\sqrt2$ 不在有理数里。

**误区三**：你以为完备化只是添加几个点。它要添加所有“该有极限却没有极限”的等价 Cauchy 列类。

:::

## 7. 练习

```exercise
# @title: 练习：计算最大误差范数
# @check: Linf=0.9
# @hint: L_inf 不做平方，也不求和；先取绝对值，再找最大数。
errors = [0.3, -0.9, 0.2]
value = abs(errors[0]) + abs(errors[1])
print("Linf=" + str(value))
```

<details>
<summary>点开查看逐步解答</summary>

三个绝对值分别是 $0.3,0.9,0.2$，最大者是 $0.9$。所以输出应为 `Linf=0.9`。

```python
errors = [0.3, -0.9, 0.2]
value = abs(errors[0])
if abs(errors[1]) > value:
    value = abs(errors[1])
if abs(errors[2]) > value:
    value = abs(errors[2])
print("Linf=" + str(value))
```
</details>

## 8. 快问快答

```quiz
下列哪一项最适合描述“屏幕像素颜色与标准值的最大偏差”？
- 平方误差求和
- 最大绝对误差 [*]
- 向量个数
? 只要有一个通道严重偏色，用户就能看见，所以最大绝对误差更贴近这种需求。
```

## 9. 选读证明

<details>
<summary>选读 · 完备化的构造思路</summary>

先把 Cauchy 列 $(x_n)$ 当作候选点；若两个候选列满足 $\lVert x_n-y_n\rVert\to0$，视为同一个新点。原空间按常值列嵌入其中；范数由 $\lVert[(x_n)]\rVert=\lim_n\lVert x_n\rVert$ 定义。这个构造把有理数补成实数，也能把不完备赋范空间补成 Banach 空间。
</details>

## 10. 下一站

完备的赋范空间有一个专门名字。下一课看 Banach 空间为什么让迭代、方程和解的存在性变得可靠。

→ [Banach 空间](./30-banach-spaces.md)



