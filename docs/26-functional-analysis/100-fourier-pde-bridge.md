---
title: 泛函分析回望傅里叶与 PDE
lesson_id: functional-analysis/fourier-pde-bridge
prereqs:
  - functional-analysis/spectrum-eigenvalues
  - fourier/summary
  - functional-analysis/weak-strong-convergence
  - functional-analysis/distributions-intro
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - operator-fourier-bridge
applications:
  - heat-equation
  - spectral-methods
exits:
  - engineering
  - research
---

# 泛函分析回望傅里叶与 PDE

## 1. 开场钩子

卷一用正弦波拆声音；本章已经把这些波看成 Hilbert 空间的特征向量。现在同一个视角还能解热方程：每个频率按自己的指数速度冷却。

## 2. 直觉解释

热方程 $u_t=u_{xx}$ 中，二阶导数像一台算子。正弦模态是它的特征方向，特征值是 $-n^2$。初始温度分解成频率坐标后，时间演化只是给每个坐标乘上衰减因子。

## 3. 正式定义

设初始温度 $u(x,0)=\sum_n c_ne_n(x)$。对合适边界条件下的热方程，形式解为：

$$u(x,t)=\sum_n c_ne^{-\mu_nt}e_n(x).$$

高频对应大 $\mu_n=n^2$，因此最先消失；长时间只留下低频轮廓。

## 4. 分步例题

取前三个系数 $(1,0.5,-0.25)$，令 $\mu_n=n^2$。

1. $t=0$ 时坐标为 $(1,0.5,-0.25)$；
2. $t=0.1$ 时分别乘 $e^{-0.1},e^{-0.4},e^{-0.9}$；
3. 得约 $(0.905,0.335,-0.102)$；
4. 第三号高频衰减最快；
5. 能量从细节流向更简单的低频形态。

## 5. 动手实验

### 实验 1：听见/看见频率基

```viz
{
  "type": "sines",
  "title": "热方程的谱坐标",
  "terms": [1, 3, 5]
}
```

这个动画演示奇频率叠加的直觉；热方程的真实模态还要按边界条件换成相应正弦特征函数，并各自乘上冷却因子。

### 实验 2：观察谱衰减

```viz
{
  "type": "plot",
  "title": "冷却因子 exp(-n^2 t)",
  "expr": "exp(-(n^2)*x)",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "n", "min": 1, "max": 5, "step": 1, "value": 1 }
  ]
}
```

拖大 n 后同一时刻的剩余比例迅速变小；这就是高频细节先冷却的原因。

```python title="每个频率的冷却因子"
# math 是数学工具库，math.exp 计算 e 的幂。
import math
coeffs = [1.0, 0.5, -0.25]
t = 0.1
for n in [1, 2, 3]:
    factor = math.exp(-n * n * t)
    print(n, coeffs[n - 1] * factor)
```

把 `t` 从 0.1 改到 1，再改到 5，看高频坐标如何先归零。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为傅里叶只是计算技巧。它也是正交投影、算子谱和群表示思想的交汇点。

**误区二**：你以为所有频率衰减一样快。拉普拉斯算子的谱决定冷却率，通常高频更快。

**误区三**：你以为形式级数自动就是经典解。要检查收敛性、边界条件和初始数据所属空间。

:::

## 7. 练习

```exercise
# @title: 练习：计算谱衰减后的坐标
# @check: value=0.36787944117144233
# @hint: 一号频率的因子是 exp(-1*t)。
# math 是数学工具库，math.exp 计算 e 的幂。
import math
c1 = 1.0
t = 1.0
factor = math.exp(t)
value = c1 * factor
print("value=" + str(value))
```

<details>
<summary>点开查看逐步解答</summary>

一号模态的衰减率是 $\mu_1=1$，所以因子是 $e^{-1}$，坐标约为 0.367879。初始代码漏了负号，导致增长而不是冷却。

```python
import math
c1 = 1.0
t = 1.0
factor = math.exp(-t)
value = c1 * factor
print("value=" + str(value))
```
</details>

## 8. 快问快答

```quiz
为什么热方程的高频细节消失最快？
- 因为频率数字更大所以不重要
- 因为对应衰减率更大，衰减因子更小 [*]
- 因为温度不能有负值
? 解的形式是 exp(-mu*t)。mu=n^2 越大，同一时间的因子越小。
```

## 9. 选读总结

<details>
<summary>选读 · 全章结构图</summary>

函数空间提供点；范数与完备化提供距离；内积提供角度；有界算子搬运点；对偶负责测量；伴随平衡内外账本；谱列出固有参数；紧性与弱收敛处理无穷维；[三大定理](./58-three-big-theorems.md)托住地基；Lax-Milgram、[Sobolev 空间](./92-sobolev-spaces.md)与分布把语言推向 PDE。傅里叶分析正是这条链上最亮的实例。
</details>

## 10. 下一站

理论终点不是结束，而是新的入口：数值分析会把这里的算子和谱变成稳定算法，优化与学习则会继续借用对偶与能量语言。

→ 回到 [第 26 章](./index.md) 查看后续集成计划



