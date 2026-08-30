---
title: 分布初步
lesson_id: functional-analysis/distributions-intro
prereqs:
  - functional-analysis/dual-spaces
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - distribution
applications:
  - impulse-signals
  - pde-weak-solutions
exits:
  - research
---

# 分布初步

## 1. 开场钩子

锤子敲钉、点电荷、瞬时脉冲，都集中在“一个时刻”或“一个点”。经典函数写不下这种理想对象；分布让它们成为合法的数学角色。

## 2. 直觉解释

不再问“函数在某点的值是多少”，而问“它作用在每个光滑测试函数上给出多少读数”。Dirac delta 不是普通函数，而是测量器：把测试函数送到它在原点的值。

## 3. 正式定义

**分布**是测试函数空间上的连续线性泛函。记：

$$\langle T,\varphi\rangle=T(\varphi).$$

若局部可积函数 $f$ 给出 $\langle f,\varphi\rangle=\int f\varphi$，就把 $f$ 嵌入分布。分布导数由[分部积分](../14-integrals/32-partial-integration.md)定义：

$$\langle T',\varphi\rangle=-\langle T,\varphi'\rangle.$$

## 4. 分步例题

Heaviside 阶跃 $H(x)=0$（$x<0$）、$1$（$x>0$）。

1. 对测试函数 $\varphi$ 定义 $H(\varphi)=\int_0^\infty\varphi(x)dx$；
2. 分部积分时边界项在无穷远消失；
3. 分部积分在零点产生 $-\varphi(0)$，代入分布导数定义的外层负号后变成 $+\varphi(0)$；
4. 因此 $H'=\delta$；
5. 跳跃的大小变成导数中的冲激强度。

## 5. 动手实验

### 实验 1：峰变窄而面积不变

```viz
{
  "type": "plot",
  "title": "近似单位冲激的高斯峰",
  "expr": "exp(-(x*x)/(2*eps*eps))/(eps*sqrt(2*pi))",
  "xmin": -3,
  "xmax": 3,
  "sliders": [
    { "name": "eps", "min": 0.25, "max": 1.5, "step": 0.05, "value": 0.5 }
  ]
}
```

把 eps 拖小时峰变高变窄；它对光滑测试函数的加权读数会越来越像“只取原点值”。

### 实验 2：用窄矩形逼近冲激

```python title="窄矩形对测试函数的读数"
epsilon = 0.25
center = 0.0
height = 1.0 / epsilon
points = [-0.5, -0.125, 0.0, 0.125, 0.5]
values = []
for x in points:
    if abs(x - center) <= epsilon / 2:
        # 高度选为 1/epsilon，使矩形面积保持 1
        values.append(height)
    else:
        values.append(0.0)
print(values)
print("area=", epsilon * height)
```

把 `epsilon` 改成 0.1、0.01，峰值升高而面积始终是 1；极限就是 Dirac delta。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 delta 在零点是无穷大的普通数。它是泛函，只有作用在测试函数后才有数值。

**误区二**：你以为不可微函数没有导数。分布意义下跳跃也有导数，强度等于跳量。

**误区三**：你以为任意怪函数都能当测试函数。测试函数必须足够光滑并带紧支集。

:::

## 7. 练习

```exercise
# @title: 练习：计算窄矩形的面积
# @check: area=1.0
# @hint: 冲激近似要求高度乘宽度不变。
width = 0.2
height = 10.0
area = width + height
print("area=" + str(area))
```

<details>
<summary>点开查看逐步解答</summary>

面积为 $0.2\times10=2$，不是 1。要让极限是单位冲激，高度应取 $1/0.2=5$，此时乘积为 1。

```python
width = 0.2
height = 5.0
area = width * height
print("area=" + str(area))
```
</details>

## 8. 快问快答

```quiz
Dirac delta 作用在测试函数 phi 上得到什么？
- 处处为零
- phi 在原点的值 [*]
- 无穷大
? delta 是连续线性泛函，输出必须是有限实数；它筛选测试函数在一点附近的信息。
```

## 9. 选读证明

<details>
<summary>选读 · 为什么 H' 等于 delta</summary>

按定义，$\langle H',\varphi\rangle=-\int_0^\infty\varphi'(x)dx=-\lim_{R\to\infty}\varphi(R)+\varphi(0)$。紧支集测试函数在大 R 处为零，所以结果为 $\varphi(0)=\langle\delta,\varphi\rangle$。
</details>

## 10. 下一站

分布会求导了，但弱导数要落在 $L^2$ 里才好解方程——下一课给"函数与弱导数都在 $L^2$"的函数类安一个家。弱解和分布是现代 PDE 的日常语言，Sobolev 空间就是这门语言的语法书。

→ [Sobolev 空间：弱导数的家](./92-sobolev-spaces.md)



