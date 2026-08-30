---
title: 弱收敛与强收敛
lesson_id: functional-analysis/weak-strong-convergence
prereqs:
  - functional-analysis/dual-spaces
  - functional-analysis/norm-completion
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - weak-convergence
applications:
  - optimization-methods
  - pde-solutions
exits:
  - research
---

# 弱收敛与强收敛

## 1. 开场钩子

正弦波 $\sin nx$ 在区间上对固定的光滑测量最终读数趋近零，但它的振幅一点也没变小。弱账本说它“消失”，尺子却说它没有靠近零——这就是弱收敛与强收敛的分岔。

## 2. 直觉解释

强收敛看整体距离：$\lVert x_n-x\rVert\to0$。弱收敛只看每个连续线性泛函的读数：$f(x_n)\to f(x)$。弱是更宽松的镜头，能忽略高频振荡，但可能放过能量集中或迁移。

## 3. 正式定义

在赋范空间 $X$ 中：

$$x_n\to x\text{ 强}\iff \lVert x_n-x\rVert\to0,$$

$$x_n\rightharpoonup x\text{ 弱}\iff f(x_n)\to f(x)\quad(\forall f\in X^*).$$

Hilbert 空间中弱收敛等价于与每个固定向量内积收敛。

## 4. 分步例题

取 $x_n(t)=\sin nt$ 于 $[0,2\pi]$。

1. 与常数测试函数 1 配对得 $\int_0^{2\pi}\sin nt\,dt=0$；
2. 与非周期光滑测试函数 $1+t$ 配对，积分约为 $-2\pi/n$；
3. 固定测试函数读到的高频贡献被振荡抵消；
4. 但 $\lVert x_n\rVert_2=\sqrt{\pi}$ 不趋近 0；
5. 所以弱收敛到 0，不强收敛到 0。

## 5. 动手实验

### 实验 1：高频没有消失

```viz
{
  "type": "sines",
  "title": "高频振荡仍然有振幅",
  "terms": [21],
  "rawAmplitude": true
}
```

曲线在越来越窄的正负区间之间跳动。 signed 平均值可以趋近零，但振幅不会自动消失；这正是弱收敛与强收敛的分岔点。

### 实验 2：分别记录测量值和长度

```python title="高频正弦的两种账本"
# math 是数学工具库，用来计算正弦函数。
import math
ns = [1, 5, 11, 21]
for n in ns:
    # 用左端点采样粗略近似区间 [0,2π] 上的积分
    step = 6.2832 / 1000
    points = [i * step for i in range(1000)]
    values = [math.sin(n * t) * (1 + t) for t in points]
    pair_sum = sum(values) * step
    length_sq = sum(math.sin(n * t) * math.sin(n * t) for t in points)
    print(n, "integral≈", pair_sum, "mean energy≈", length_sq / 1000)
```

第一列是配对积分，随 n 增大趋向 0；第二列是平均能量，稳定不消失。这里特意用非周期测试函数，避免恰好正交造成的全零假象。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为所有测量都小等于函数小。弱收敛允许质量逃逸或振荡抵消。

**误区二**：你以为弱极限唯一需要额外假设。只要泛函族分离点，弱极限自动唯一。（"分离点"的泛函从哪来？那是 Hahn-Banach 的存在性担保，见[泛函三大定理：承重墙巡礼](./58-three-big-theorems.md)。）

**误区三**：你以为弱收敛可以随便换非线性运算。例如 $x_n\rightharpoonup x$ 不能推出 $\lVert x_n\rVert\to\lVert x\rVert$。

:::

## 7. 练习

```exercise
# @title: 练习：区分两个账本
# @check: weak=0.0
# @check: strong=False
# @hint: 正负半周相消是弱账本；振幅平方始终为正是强账本。
n = 11
weak = (-1) ** n * 1.0
# amplitude 是强收敛尺子；高频正弦的振幅不会趋近零。
amplitude = 0.0
strong = amplitude < 0.01
print("weak=" + str(weak))
print("strong=" + str(strong))
```

<details>
<summary>点开查看逐步解答</summary>

$\sin nt$ 与常数 1 的整周期积分为 0，所以 `weak` 应直接赋值为 0.0。强账本要单独看振幅：把 `amplitude` 改为 1 后，它仍不小于 0.01，所以 `strong` 保持 `False`。

```python
weak = 0.0
# amplitude 是强收敛尺子；高频正弦的振幅不会趋近零。
amplitude = 1.0
strong = amplitude < 0.01
print("weak=" + str(weak))
print("strong=" + str(strong))
```
</details>

## 8. 快问快答

```quiz
若 x_n 强收敛到 x，那么它是否弱收敛到 x？
- 一定不
- 一定 [*]
- 只有有限维才成立
? 每个有界线性泛函都连续，因此距离趋近零会迫使读数也趋近同一个值。
```

## 9. 选读边界

<details>
<summary>选读 · 为什么 PDE 喜欢弱收敛</summary>

能量估计常给出解序列的有界性。无穷维有界序列未必有强收敛子列；在自反 Banach 空间（例如 Hilbert 空间）中，有界序列才有弱收敛子列。把方程写成对所有测试函数成立的弱形式后，只需弱收敛即可通过极限；再靠正则性或唯一性升级为强收敛。
</details>

## 10. 下一站

弱形式不只是妥协，它能证明椭圆边值问题的存在与唯一。下一课进入 Lax-Milgram 定理。

→ [Lax-Milgram 选读](./85-lax-milgram.md)



