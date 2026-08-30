---
title: 一维热方程
lesson_id: pde/heat-equation-1d
prereqs:
  - pde/initial-boundary-data
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - heat-equation
  - diffusion
applications:
  - heat-conduction
  - image-blurring
exits:
  - engineering
---

# 一维热方程

## 1. 从一个场景开始

把一滴热水滴进冷水，最初边界分明，随后峰变矮、范围变宽，最后几乎分不出你我。热方程把这句日常话写成局部变化率的平衡。

## 2. 直觉解释

热量总是从更热处流向更冷处。一点如果比两边都热，就会失去热量；比两边都冷，就会获得热量。

所以时间变化率取决于“弯曲程度”：邻点平均值高于自己就升温，低于自己就降温。扩散不是搬运一个固定峰，而是不断抹平差异。

## 3. 正式定义

一维热方程是：

$$u_t=k u_{xx}.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $k$ | 热扩散率 | 越大抹平越快 |
| $u_{xx}$ | 二阶空间导数 | 曲线的弯曲程度 |

若 $u_{xx}>0$，曲线像碗底，该点低于邻近平均值，于是 $u_t>0$。若 $u_{xx}<0$，曲线像峰顶，该点降温。

## 4. 分步例题

取 $u(x,t)=e^{-k\pi^2t}\sin(\pi x)$。

1. 时间偏导为 $u_t=-k\pi^2 e^{-k\pi^2t}\sin(\pi x)$；
2. 二阶空间导数为 $u_{xx}=-\pi^2 e^{-k\pi^2t}\sin(\pi x)$；
3. 因此 $ku_{xx}=u_t$；
4. 峰值因子 $e^{-k\pi^2t}$ 随时间衰减，但形状仍是正弦。

## 5. 动手实验

### 实验 1：热点如何摊开

```viz
{
  "type": "heat1d-lab",
  "title": "一维热扩散实验室",
  "center": 1,
  "height": 1,
  "width": 0.35,
  "diffusivity": 0.18
}
```

白点横向拖动可移动初始热点，纵向拖动可改变峰高。播放后峰高下降、宽度增加；提高扩散率会让摊开更快。

### 实验 2：矮宽峰与尖窄峰

```viz
{
  "type": "heat1d-lab",
  "title": "初始宽度影响衰减速度",
  "center": 1,
  "height": 1,
  "width": 0.18,
  "diffusivity": 0.18
}
```

同样的峰高，越窄的初始脉冲弯曲越强，因此降温越快。宽而平的分布本身已经很接近均匀。

### 实验 3：计算一点的弯曲效应

```python title="三点模板看出升降温"
k = 0.2
dx = 0.5
u_left = 0.4
u_center = 0.8
u_right = 0.2

# 二阶中心差分近似 u_xx
curvature = (u_left - 2 * u_center + u_right) / (dx * dx)
change_rate = k * curvature
print(round(curvature, 3))
print(round(change_rate, 3))
```

输出 `-4.0` 和 `-0.8`。中心点比两侧平均更热，弯曲度为负，所以开始降温。

## 6. 练习

```exercise
# @title: 练习：修正热点的变化率
# @check: -4.0
# @check: -0.8
# @hint: 先算三点二阶差商，再乘扩散率 k。
k = 0.2
dx = 0.5
u_left = 0.4
u_center = 0.8
u_right = 0.2

curvature = u_left + u_right
change_rate = curvature
print(round(curvature, 3))
print(round(change_rate, 3))
```

<details>
<summary>点开查看逐步解答</summary>

三点模板是：

```python
k = 0.2
dx = 0.5
u_left = 0.4
u_center = 0.8
u_right = 0.2

curvature = (u_left - 2 * u_center + u_right) / (dx * dx)
change_rate = k * curvature
print(round(curvature, 3))
print(round(change_rate, 3))
```

代入：

```text
(0.4-1.6+0.2)/0.25=-4.0
0.2*(-4.0)=-0.8
```

负变化率表示中心点冷却。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为热量会集中到一个地方。无源热方程只会抹平极值，不会凭空制造新峰。

**误区二**：你以为峰消失意味着能量消失。峰值下降的同时，空间宽度增加。

**误区三**：你以为扩散率和流速相同。这里没有整体搬运，只有局部重新分配。

:::

## 8. 快问快答

```quiz
热方程中 k 控制什么？
- 波形移动方向
- 抹平差异的快慢 [*]
- 边界长度
? k 越大，同样的弯曲程度产生的时间变化率越大。
```

## 9. 选读：极大值原理

<details>
<summary>选读 · 为什么不会冒出新最高温</summary>

在没有源和给定边界范围内，热方程的最大值不会在内部时间上升。若某点内部达到新的最大值，附近必然形成向下凹的峰形，使 $u_{xx}<0$，从而 $u_t<0$。这与“抹平差异”的直觉一致。

</details>

## 10. 下一站

连续图像很直观，计算机却只能存有限格点。下一步把 $u_{xx}$ 换成三点差分，看离散热方程怎么走。

→ [差分与稳定性](./50-finite-difference-heat.md)
