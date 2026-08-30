---
title: 路径积分与 Green 定理
lesson_id: multivariable/green-path-integrals
prereqs:
  - multivariable/double-integrals
volume: 2
layer: L7
track:
  - analysis-change
  - geometry-space
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - path-integral
  - circulation
  - green-theorem
  - curl-2d
applications:
  - fluid-circulation
  - work-and-energy
exits:
  - engineering
  - research
---

# 路径积分与 Green 定理

## 1. 从一个场景开始

风吹过一片湖面。小船沿一条曲线移动时，风做了多少功？若船绕闭圈一周，风是在推动旋涡，还是只是推来推去不做净功？路径积分把每小步的“力·位移”加起来。

## 2. 直觉解释

设力场为

$$\vec F(x,y)=\binom{P(x,y)}{Q(x,y)}.$$

路径 $\vec r(t)=(x(t),y(t))$ 上的一小段位移是

$$d\vec r=\binom{dx}{dy}.$$

功的微元是：

$$P\,dx+Q\,dy=\vec F\cdot d\vec r.$$

把所有微元相加，就是路径积分。

## 3. 正式定义

若 $C$ 由分段光滑参数化 $\vec r(t)=(x(t),y(t))$ 给出，$a\le t\le b$，则

$$\int_C\vec F\cdot d\vec r=\int_a^b\left[P(\vec r(t))x'(t)+Q(\vec r(t))y'(t)\right]dt.$$

也可简写成 $\int_C P\,dx+Q\,dy$。

若 $C$ 是逆时针闭路径，环流就是这条闭路径积分。

Green 定理说：

$$\oint_{\partial R}P\,dx+Q\,dy=\iint_R\left(\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}\right)dA.$$

括号里的量是二维旋度；它把边界上的旋转账本换算成区域内部的旋涡密度。

## 4. 分步例题

取

$$\vec F=(-y,x),\qquad C:x=\cos t,\ y=\sin t,\ 0\le t\le2\pi.$$

1. $dx=-\sin t\,dt$，$dy=\cos t\,dt$；
2. $P\,dx+Q\,dy=(-\sin t)(-\sin t)dt+(\cos t)(\cos t)dt$；
3. 被积函数 $=\sin^2t+\cos^2t=1$；
4. 环流 $=\int_0^{2\pi}1\,dt=2\pi$。

这个场绕原点旋转，单位圆一周得到正环流。

## 5. 动手实验

### 实验 1：路径功

```viz
{
  "type": "path-integral",
  "title": "力场沿路径做功",
  "p": "-y",
  "q": "x",
  "kind": "line",
  "end": 2
}
```

切换直线和弧线，调整弧高，或反向行进。两条路线的功不同；这说明力场不一定保守。

这里的两条路径共享端点 $(-1,0)$ 和 $(1,0)$；“反向路径”会把行进方向倒过来。只有比较相同端点间的路线，才能说明路径依赖性。

### 实验 2：闭路径环流

```viz
{
  "type": "green-theorem",
  "title": "环流与通量",
  "p": "-y",
  "q": "x",
  "radius": 1.2
}
```

拖动半径。单位旋涡场的环流随圆面积增长（半径为 $r$ 时约为 $2\pi r^2$）；通量为零，因为场沿切线而不穿出边界。

### 实验 3：Python 数值环流

```python title="用多边形逼近单位圆环流"
import math

n = 1000
circulation = 0.0
for k in range(n):
    t1 = 2 * math.pi * k / n
    t2 = 2 * math.pi * (k + 1) / n
    x = math.cos(t1)
    y = math.sin(t1)
    dx = math.cos(t2) - math.cos(t1)
    dy = math.sin(t2) - math.sin(t1)
    circulation = circulation + (-y) * dx + x * dy
print(round(circulation, 3))
direction = "counterclockwise"
conservative = "not conservative"
print(direction)
print(conservative)
```

输出 `6.283`、`counterclockwise`、`not conservative`。

## 6. 练习

```exercise
# @title: 练习：加密采样算环流
# @check: 6.283
# @check: counterclockwise
# @check: not conservative
# @hint: 四边形只能粗略逼近圆；把 n 增大到 1000，方向按角度增加。场 (-y,x) 绕圈做正功、沿不同路线功不同，所以它不保守——第三个字符串也要改。
import math

n = 4
circulation = 0.0
for k in range(n):
    t1 = 2 * math.pi * k / n
    t2 = 2 * math.pi * (k + 1) / n
    x = math.cos(t1)
    y = math.sin(t1)
    dx = math.cos(t2) - math.cos(t1)
    dy = math.sin(t2) - math.sin(t1)
    circulation = circulation + (-y) * dx + x * dy
print(round(circulation, 3))
direction = "clockwise"
conservative = "conservative"
print(direction)
print(conservative)
```

<details>
<summary>点开查看逐步解答</summary>

把采样数改成：

```python
n = 1000
```

方向按角度增加，所以路径是：

```python
direction = "counterclockwise"
```

场 $(-y,x)$ 沿不同路径可做不同功，因此：

```python
conservative = "not conservative"
```

最终环流四舍五入为 `6.283`。

可执行复查：

```python
import math

n = 1000
circulation = 0.0
for k in range(n):
    t1 = 2 * math.pi * k / n
    t2 = 2 * math.pi * (k + 1) / n
    x = math.cos(t1)
    y = math.sin(t1)
    dx = math.cos(t2) - math.cos(t1)
    dy = math.sin(t2) - math.sin(t1)
    circulation = circulation + (-y) * dx + x * dy
print(round(circulation, 3))
direction = "counterclockwise"
conservative = "not conservative"
print(direction)
print(conservative)
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为路径反向结果不变。功和环流都会变号。

**误区二**：你以为 Green 定理适合所有路径。它要求闭路径、方向正确，且偏导在区域内连续。

**误区三**：你以为场看起来旋转就一定非保守。判断要算旋度或检验势函数，不能只凭箭头印象。

:::

## 8. 快问快答

```quiz
Green 定理把哪两种账本连起来？
- 面积与周长
- 边界环流与内部旋度 [*]
- 体积与表面法线
? 二维 Green 定理说：闭边界上的切向环流等于区域内旋度的二重积分。
```

## 9. 选读：保守场的判据

<details>
<summary>选读 · 旋度为零只是起点</summary>

若存在势函数 $\phi$ 使 $P=\phi_x$、$Q=\phi_y$，则

$$\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}=0.$$

在单连通区域上，这个条件也保证路径积分只依赖端点。若区域有洞，零旋度还不足以保证保守。

</details>

## 10. 下一站

旋度为零只是起点：什么样的场真配得上"路径无关"这张身份证？下一课给保守场与势函数发证，功从此只认端点、不认走法。

→ [保守场与势函数](./62-conservative-fields.md)
