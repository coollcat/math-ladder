---
title: 解析延拓选讲
lesson_id: complex-analysis/analytic-continuation
prereqs:
  - complex-analysis/power-series
  - complex-analysis/residue-theorem
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - analytic-continuation
applications:
  - special-functions
exits:
  - research
---

# 解析延拓选讲

## 1. 开场钩子

你只知道一个函数在小圆盘内的幂级数，却想知道它在远处长什么样。只要沿着一条没有奇点的路铺出一串重叠圆盘，每一盘接住上一盘的数据，函数就能继续走出去。这就是解析延拓。

## 2. 直觉解释

设幂级数在中心 $A$ 的圆盘内等于 $f$。若在圆盘边缘附近选一个新中心 $B$，用已有值造出新的泰勒级数，新级数可能越过旧边界。重复这个过程，就得到一串相邻圆盘；重叠区像接力棒，保证新展开不是另一个函数。

## 3. 正式事实

若 $f$ 和 $g$ 都在连通开集 $D$ 内解析，并且在一个有聚点的子集上相等，则

$$f(z)=g(z),\qquad z\in D.$$

这是解析函数的唯一性定理。它解释了为什么延拓一旦成功就没有任意性。

但延拓可能撞到奇点，也可能绕过分支点后回到同一位置却得到不同分支。$\log z$ 就是最典型的例子：绕原点一圈，辐角增加 $2\pi$。

## 4. 分步例题

已知

$$\log(1+z)=z-\frac{z^2}{2}+\frac{z^3}{3}-\cdots,\qquad |z|<1.$$

把中心移到 $z_0=0.5$。

1. 最近奇点仍是 $z=-1$；
2. 新半径为 $|0.5-(-1)|=1.5$；
3. 新圆盘越过旧圆盘右边界；
4. 它与旧圆盘有重叠区；
5. 因此函数的定义范围向右扩大了。

这不是发明新规则，而是同一个解析身份在新邻域里的重新展开。

## 5. 动手实验

### 实验 1（viz）：局部多项式为什么有边界

```viz
{
  "type": "taylor",
  "title": "ln(1+x) 的旧展开和最近奇点",
  "fn": "ln",
  "n": 9
}
```

拖动探针靠近 $x=-1$，误差急剧变大；越过去后无论加多少项都不再追上。复平面上，这是奇点挡住延拓路径的画面。

### 实验 2（python）：比较新旧中心的收敛半径

```python title="log(1+z) 从中心 0 移到 0.5"
old_center = 0
new_center = 0.5
singular_point = -1
old_radius = abs(old_center - singular_point)
new_radius = abs(new_center - singular_point)
print(old_radius)
print(new_radius)
```

旧半径为 1，新半径为 1.5。新圆盘与旧圆盘重叠，因此可以把旧数据合法地递给新展开。

### 实验 3（python）：重叠区的近似值抽查

```python title="旧展开在重叠点附近接近真值"
import math

x = 0.75
n = 12
true_value = math.log(1 + x)
old_partial = 0.0
term = x
power = 1
for k in range(n):
    # 条件表达式：k 为偶数时取正号，k 为奇数时取负号
    sign = 1 if k % 2 == 0 else -1
    old_partial += sign * term / power
    term *= x
    power += 1
print(round(true_value, 6))
print(round(old_partial, 6))
```

在旧圆盘内部且离边界不太近的位置，部分和已经贴近真值。这个共同值就是传给下一块圆盘的接力棒。

:::warning[常见误区]

**误区一**：你以为延拓可以随意编造。唯一性定理要求重叠区完全相同，不能只靠名字相同。

**误区二**：你以为所有函数都能无限延拓。奇点和自然边界会拦住路线。

**误区三**：你以为多值函数是错误。分支是多叶身份的一部分，需要指定路径和初始值。

:::

## 6. 练习

```exercise
# @title: 练习：移动中心后的最大半径
# @check: 1.5
# @hint: log(1+z) 的最近奇点在 z=-1；半径是新中心到奇点的距离。
new_center = 0.25       # 请改成例题中的新中心
singular_point = -1
radius = abs(new_center - singular_point)
print(radius)
```

<details>
<summary>点开查看逐步解答</summary>

新中心取 $0.5$，最近奇点是 $-1$，距离为 $|0.5-(-1)|=1.5$。

因此新泰勒级数的最大安全半径是 1.5。
</details>

## 7. 选读：Gamma 函数的延拓预告

<details>
<summary>选读 · 从阶乘走向复平面</summary>

正整数阶乘只定义在离散点上；Euler 积分最初在 $\operatorname{Re}w>0$ 定义 Gamma 函数，并满足 $\Gamma(n)=(n-1)!$。通过递推关系可以把它逐步延拓到除非正整数外的整个平面。那些非正整数是一阶极点，也正是延拓路上的障碍。
</details>

## 8. 下一站

现在把整章工具收拢成一张方法地图：什么时候看 CR 方程，什么时候算 Laurent 主部，什么时候闭合成围道，什么时候转向 $s$ 平面。

→ [复分析与方法地图](./120-method-map.md)
