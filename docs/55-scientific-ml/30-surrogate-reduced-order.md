---
title: 替代模型与降阶
lesson_id: scientific-ml/surrogate-models
prereqs:
  - scientific-ml/inverse-problems
  - linalg-advanced/svd-low-rank
  - fourier/coefficients
volume: 5
layer: L11
track:
  - scientific-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - surrogate-model
  - reduced-order-model
applications:
  - aerodynamic-design-loop
  - weather-emulation
exits:
  - engineering
---

# 替代模型与降阶

## 1. 从一个场景开始

一套翼型气动仿真跑一次要 8 小时，而设计迭代需要试上万个外形——按部就班要算一个世纪。工程师的对策分两步：

1. **替代模型（surrogate）**：先花预算跑几百次真仿真，用这些样本训一个"替身"，替身回答一次只要微秒；
2. **降阶（ROM）**：再发现替身关心的状态其实挤在几个主模式里，把百万维流场压成十维坐标去演化。

这一课用傅里叶级数当解剖标本：复杂信号的主能量往往集中在少数模态上——这就是"降阶"两个字全部的底气。

## 2. 直觉解释

**替代模型**像给名画家雇学徒：真迹（昂贵仿真）只看几百张，学徒学会风格后可以飞快临摹新构图。风险也一目了然——让学徒画他没见过的题材（训练分布之外），多半露馅。

**降阶**像压缩音乐：一首曲子的频谱里，真正撑起听感的往往只有几个频率。把小能量的高频砍掉，文件小了百倍，耳朵几乎无感。流场、温度场同理：把状态投影到少数"主模式"上，动力学可以在几十维的小空间里近似演化。

两件事的公分母是同一个信念：**复杂性常是表面的，有效自由度往往很低。**

## 3. 正式定义

**替代模型**：用样本对 $\bigl(x_i, f(x_i)\bigr)$ 训练 $\hat{f}$，使 $\hat{f}(x) \approx f(x)$ 且评估代价极低。

**降阶模型**：把高维状态 $u \in \mathbb{R}^n$ 投影到 $r$ 个基模式 $\phi_1,\dots,\phi_r$ 上：

$$u(z) \approx \sum_{k=1}^{r} a_k\,\phi_k, \qquad r \ll n$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\phi_k$ | 基模式 | 预先找好的"主旋律"（POD/傅里叶模态等）|
| $a_k$ | 模态坐标 | 每个模式的音量 |
| $r$ | 截断阶数 | 保真度与速度的滑杆 |

截断误差由被丢弃模态的能量决定：丢掉的平方幅度之和越小，替身越忠实（SVD 视角见第 21 章）。

## 4. 分步例题

最迷你的替代实验：真模型是 $f(x)=x^2$（假设它很贵）。

1. 预算只够采样两次：取 $x=0$ 得 0，$x=1$ 得 1；
2. 用两点拟合最简单的线性替代模型：$\hat{f}(x)=x$；
3. 拿它预测没见过的 $x=2$：替身说 2，真相是 4——误差 100%；
4. 加采一个点 $x=2$，三点恰好确定抛物线：$\hat{f}=x^2$，处处精确；
5. 教训：**保真度是用样本数买的**，而且买哪里很重要——两点选在 $(0,3)$ 与 $(1,3)$ 就远不如跨开距离。实验设计的学问全在"钱花在刀刃上"。

## 5. 动手实验

### 实验 1：单模态替身漏掉了什么

蓝线是"贵仿真" $y=\sin x + 0.3\sin 3x$，橙虚线是只保留基频的廉价替身：

```viz
{
  "type": "plot",
  "title": "真实信号与单模态替代模型",
  "expr": "sin(x) + 0.3*sin(3*x)",
  "expr2": "sin(x)",
  "label": "真仿真",
  "label2": "单模态替身",
  "xmin": 0,
  "xmax": 7,
  "sliders": []
}
```

两条线大形相似、细节走样——被丢弃的 3 次谐波正是误差的全部来源。下一课的天气预报挑战里，这对应"大形势报得准、局部细节靠参数化"的老毛病。

### 实验 2：投影法造替身并量化误差

```python title="傅里叶投影：系数、重构与逐级误差"
import math
import matplotlib.pyplot as plt

M = 64                                   # 采样点数
xs = []
ys = []                                  # 昂贵仿真只在填这张表时跑一遍
for i in range(M):
    x = 2 * math.pi * i / M
    xs.append(x)
    ys.append(math.sin(x) + 0.3 * math.sin(3 * x))

# 正交投影：每个模态的系数 = 信号与该模态的内积 × 归一化因子
sum1 = 0.0
sum3 = 0.0
for i in range(M):
    sum1 = sum1 + ys[i] * math.sin(xs[i])
    sum3 = sum3 + ys[i] * math.sin(3 * xs[i])
c1 = 2 * sum1 / M
c3 = 2 * sum3 / M
print(f"学到的系数: c1={round(c1, 3)}, c3={round(c3, 3)}")

err1 = 0.0                               # 单模态替身的均方误差
err13 = 0.0                              # 双模态替身
rec_curve = []                           # 替身的重构曲线，供画图用
for i in range(M):
    rec1 = c1 * math.sin(xs[i])
    rec13 = rec1 + c3 * math.sin(3 * xs[i])
    rec_curve.append(rec1)
    d1 = ys[i] - rec1
    d13 = ys[i] - rec13
    err1 = err1 + d1 * d1
    err13 = err13 + d13 * d13
print(f"MSE 单模态: {round(err1 / M, 4)}")
print(f"MSE 双模态: {round(err13 / M, 8)}")

plt.plot(xs, ys, label="truth")
plt.plot(xs, rec_curve, linestyle="--", label="surrogate")
plt.legend()
```

双模态替身的误差应当掉到机器精度量级——因为我们造的就是精确的两项合成；而单模态误差稳定在 $0.3^2/2 = 0.045$ 附近，正好是被丢模态的能量。**误差不是玄学，是可以提前算出的账。**

### 实验 3：判题小练兵

```exercise
# @title: 练习：算保留前 k 个模态的能量占比
# @check: 0.88
# @check: 0.96
# @hint: 能量占比 = 已保留模态的能量和 ÷ 全部模态的能量和，别除以模态个数。
coeffs = [1.0, 0.3, 0.2]          # 各模态振幅（振幅平方才是能量）

energies = []
total = 0.0
for c in coeffs:
    e = c * c                     # 能量 = 振幅的平方
    energies.append(e)
    total = total + e

kept = 1.0
ratio = kept / len(coeffs)        # ← 问题在这：分母应该是总能量
print(round(ratio, 2))

kept2 = energies[0] + energies[1]
ratio2 = kept2 / len(coeffs)
print(round(ratio2, 2))
```

修好分母后得到 0.88 与 0.96：第二个模态只带来 0.09 的能量，却把覆盖率推过 95%——典型的"长尾越往后越不值钱"，这正是降阶敢于截断的理由。

## 常见误区

:::warning[常见误区]

**误区一**："替身在训练点上准，就到处都准。"
替代模型继承一切机器学习的软肋：分布外输入上的外插可能荒腔走板。工程惯例是在使用时附带不确定性估计，离训练簇太远的查询退回真仿真。

**误区二**："截断丢掉的模态永远不重要。"
某个工况下能量微小的高频模态，换一组边界条件可能突然放大（共振）。安全关键场景要么保留更多模态，要么对被丢子空间做误差界监控。

**误区三**："降阶就是有损压缩，随便挑个维度数。"
r 的选择应基于能量谱的拐点和下游任务的容差，不是拍脑袋。第 21 章 SVD 的奇异值衰减曲线就是现成的决策图。

:::

```quiz
判断降阶模型该保留多少个模态时，最可靠的直接依据是什么？
- 模态编号必须凑成偶数
- 被保留模态的能量占全部能量的比例和任务容差 [*]
- 训练样本越多，就一定只保留一个模态
? 截断误差由被丢弃模态的能量决定。能量占比能说明近似账本，下游容差则决定这本账是否够用。
```

## 6. 练习

**练习 1**：手算：模态振幅 $[2, 1]$，保留第一个模态的能量占比是多少？

<details>
<summary>点开查看逐步解答</summary>

能量 $[4, 1]$，总量 5；保留占比 $4/5 = 80\%$。

注意陷阱：若误用振幅直接相加会得 $2/3 ≈ 67\%$——**能量必须先平方再比**。
</details>

**练习 2**：把实验 2 的真信号改成 `sin(x) + sin(5*x)`（两个等幅模态），单模态替身的 MSE 会变成多少？

<details>
<summary>点开查看逐步解答</summary>

被丢的是幅度 1 的 5 次谐波：$\mathrm{MSE} = 1^2/2 = 0.5$，比原来的 0.045 差一个数量级。教训：截断损失不取决于你留了几个，取决于丢了多重。
</details>

**练习 3**：概念辨析：替代模型与本卷反复出现的"浮窗 Python 实验"有什么共同精神？

<details>
<summary>点开查看逐步解答</summary>

都是"用便宜的近似换取探索速度"：viz 组件秒开免装环境，替身模型微秒出解；两者也都要求使用者清楚近似的边界——viz 只演示设计好的参数范围，替身只在训练分布内可信。快与信，永远是配对着谈的。
</details>

## 7. 选读：神经算子——想学"整个函数到函数的映射"

<details>
<summary>选读 · 超越有限维</summary>

普通网络学"向量进、标量出"；神经算子想学"函数进、函数出"：给它看一批扩散方程的初条件与终条件，学会一个对**任意分辨率网格**都成立的求解算子。代表工作 FNO（Fourier Neural Operator, 2021）在频率域做线性变换加非线性激活，把卷积换成"全局谱混合"。它与经典 ROM 的分工：ROM 在固定模式内演化、可解释可证稳；神经算子端到端学映射、灵活但难保证。两条路线正在合流——这也是本章标题"科学计算与神经算子"的由来。
</details>

## 8. 下一站

本章主线到此收束：物理当老师（PINN）、病态用正则驯服（逆问题）、昂贵用替身加速（本课）。章末实战挑战带你从 Richardson 的 6 周手算预报一路走到流体替身，亲手体验这条技术演化线。

→ [本章导览与实战挑战 · 数值预报与替身](./index.md)
