---
title: 偏导数与梯度
lesson_id: multivariable/partial-gradient
prereqs:
  - multivariable/level-sets
volume: 2
layer: L7
track:
  - analysis-change
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - partial-derivative
  - gradient
applications:
  - optimization
  - sensitivity-analysis
exits:
  - data-ai
  - engineering
---

# 偏导数与梯度

## 1. 从一个场景开始

飞机同时受风速和油门影响。想知道油门的单独作用，就暂时让风速不动；想知道风速的单独作用，就暂时锁住油门。这两个“单独变化率”就是偏导数。

## 2. 直觉解释

对二元函数 $f(x,y)$：

- $f_x$ 固定 $y$，只让 $x$ 动；
- $f_y$ 固定 $x$，只让 $y$ 动。

把两个偏导竖排成向量，就是梯度：

$$\nabla f=\binom{f_x}{f_y}.$$

梯度指向函数上升最快的方向，长度表示有多陡。

## 3. 正式定义

偏导数用一元导数定义：

$$f_x(x,y)=\lim_{h\to0}\frac{f(x+h,y)-f(x,y)}h,$$

$$f_y(x,y)=\lim_{h\to0}\frac{f(x,y+h)-f(x,y)}h.$$

对在这一点可微的二元函数（「可微」比「偏导存在」苛刻得多——[上一课](./15-two-var-limits.md)的反例偏导都在，却连连续都保不住），沿单位方向 $\vec u=(u_1,u_2)$ 的方向导数是：

$$D_{\vec u}f=\nabla f\cdot\vec u.$$

若 $\vec u$ 不是单位向量，必须先除以自身长度。

## 4. 分步例题

取

$$f(x,y)=x^2+xy+y^2.$$

1. 固定 $y$，对 $x$ 求导：$f_x=2x+y$；
2. 固定 $x$，对 $y$ 求导：$f_y=x+2y$；
3. 在 $(1,2)$：$f_x=2+2=4$，$f_y=1+4=5$；
4. 梯度是 $(4,5)$，长度为 $\sqrt{41}$；
5. 沿正东方向 $(1,0)$ 的方向导数是 $4$。

## 5. 动手实验

### 实验 1：梯度探针

```viz
{
  "type": "gradient-probe",
  "title": "梯度与方向导数",
  "expr": "x^2 + x*y + y^2",
  "point": [1, 2],
  "angle": 0
}
```

拖动白点和角度滑块。紫色箭头是梯度；橙色是探路方向。当橙色与紫色重合时，方向导数最大。

### 实验 2：等高线与梯度对照

```viz
{
  "type": "gradient-probe",
  "title": "等高线上的梯度方向",
  "expr": "x^2 + x*y + y^2",
  "point": [1, 2]
}
```

白线是等高线，紫色箭头是当前点的梯度。在梯度非零处，它会指向高度增大最快的一侧，并与光滑等高线垂直；橙色箭头仍用来试方向导数。

### 实验 3：Python 数值偏导

```python title="用小步长近似偏导"
def f(x, y):
    return x * x + x * y + y * y

h = 0.0001
x = 1.0
y = 2.0
fx = (f(x + h, y) - f(x - h, y)) / (2 * h)
fy = (f(x, y + h) - f(x, y - h)) / (2 * h)
print(round(fx, 3))
print(round(fy, 3))
print([round(fx, 3), round(fy, 3)])
```

输出 `4.0`、`5.0`、`[4.0, 5.0]`。Python 的 `round(4.0, 3)` 仍保留浮点数形式。

## 6. 练习

```exercise
# @title: 练习：修正偏导公式
# @check: 4.0
# @check: 5.0
# @check: [4.0, 5.0]
# @hint: 对 y 求偏导时，x 是常数；xy 的导数就是 x。
def f(x, y):
    return x * x + x * y + y * y

x = 1.0
y = 2.0
fx = 2 * x + y
fy = x + y
print(round(fx, 3))
print(round(fy, 3))
print([round(fx, 3), round(fy, 3)])
```

<details>
<summary>点开查看逐步解答</summary>

这段初始代码的函数定义和 `x,y` 都没问题；真正错在 $f_y$ 的公式：$x$ 对 $y$ 是常数，所以 $xy$ 对 $y$ 求导得 $x$。完整数值版：

```python
x = 1.0
y = 2.0
fx = 2 * x + y
fy = x + 2 * y
```

所以：

```text
fx=4.0
fy=5.0
gradient=[4.0, 5.0]
```

符号推导也一致：$f_y=x+2y$。

可执行复查：

```python
x = 1.0
y = 2.0
fx = 2 * x + y
fy = x + 2 * y
print(round(fx, 3))
print(round(fy, 3))
print([round(fx, 3), round(fy, 3)])
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为偏导数是“另一个变量的导数”。它是固定其余变量后的一元导数。

**误区二**：你以为任何一点的梯度都必然沿等高线法线走。在可微且梯度非零的点，梯度垂直于光滑等高线并指向最快升高；临界点附近这个几何说法要单独检查。

**误区三**：你以为方向导数只要点乘任意方向。方向必须单位化，否则长度会冒充陡度。

:::

## 8. 快问快答

```quiz
梯度方向与等高线的关系是什么？
- 平行
- 垂直 [*]
- 成 45°
? 在可微且梯度非零的光滑点，沿等高线移动时函数值不变，而梯度指向变化最快方向，所以二者垂直。
```

## 9. 选读：为什么梯度是最陡上升

<details>
<summary>选读 · 夹角公式一眼看穿</summary>

方向导数是 $D_{\vec u}f=\nabla f\cdot\vec u=\lVert\nabla f\rVert\cos\theta$。当 $\vec u$ 与非零梯度同向时，$\cos\theta=1$，值最大；反向时最小；垂直时为零。可微函数的光滑等高线上函数不增不减，因此在梯度非零处梯度垂直于它。

</details>

## 10. 下一站

偏导描述一个输入的小扰动如何影响一个输出。若有许多输入和许多输出，这些偏导会排成矩阵——Jacobian。

→ [Jacobian 与多元链式法则](./30-jacobian-chain.md)
