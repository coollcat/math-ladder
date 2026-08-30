---
title: 复级数与幂级数
lesson_id: complex-analysis/power-series
prereqs:
  - complex-analysis/cauchy-riemann
  - series/taylor
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
  - radius-of-convergence
applications:
  - numerical-evaluation
exits:
  - engineering
  - research
---

# 复级数与幂级数

## 1. 开场钩子

实数世界里的泰勒级数像一条安全区间；到了复平面，它升级成一个真正的圆盘。圆内处处收敛，圆外立刻发散。这个“收敛圆”不是装饰，而是解析函数的生命范围。

## 2. 直觉解释

复数列 $a_n$ 收敛到 $A$，等价于实部序列和虚部序列都收敛。复项级数同理：把每项的实部和虚部分别累加，两条账本都要稳定。

幂级数为

$$\sum_{n=0}^{\infty} a_n(z-z_0)^n.$$

它是以 $z_0$ 为中心的无穷多项式。若存在 $R>0$ 使 $|z-z_0|<R$ 时收敛、$|z-z_0|>R$ 时发散，就称 $R$ 为收敛半径。边界圆必须单独检查。

## 3. 正式定义

比值判别法常用形式：若

$$\lim_{n\to\infty}\left|\frac{a_{n+1}}{a_n}\right|=\rho,$$

则

$$R=\frac1{\rho}$$

当 $\rho=0$ 时 $R=+\infty$，当 $\rho=+\infty$ 时 $R=0$。根值判别法给出同样的半径：

$$R^{-1}=\limsup_{n\to\infty}|a_n|^{1/n}.$$

幂级数在收敛圆内部可逐项求导和积分；因此它的和函数在圆内自动解析。

## 4. 分步例题

求 $\sum z^n/n!$ 的收敛半径。

1. 系数比：$\left|\dfrac{a_{n+1}}{a_n}\right|=\dfrac{1}{n+1}$；
2. 令 $n\to\infty$，得到 $\rho=0$；
3. 所以 $R=+\infty$；
4. 这正是指数函数 $e^z$ 的展开式；
5. 它在整个复平面解析。

再看几何级数 $\sum z^n$：系数比为 1，所以 $R=1$。圆内和为 $1/(1-z)$，奇点 $z=1$ 恰好站在单位圆上。

## 5. 动手实验

### 实验 1（viz）：泰勒多项式的局部贴合

```viz
{
  "type": "taylor",
  "title": "e^x 的多项式逼近是 e^z 在实轴上的切片",
  "fn": "exp",
  "n": 6
}
```

增大项数，橙色曲线贴住蓝色曲线。复平面上同样的多项式会在整个平面逼近 $e^z$，因为收敛半径无穷大。

### 实验 2（viz）：ln(1+x) 的边界警报

```viz
{
  "type": "taylor",
  "title": "奇点 x=-1 决定收敛半径",
  "fn": "ln",
  "n": 8
}
```

把探针拖过 $x=-1$，多项式不再追上真函数。对应到复平面，$z=-1$ 是 $\log(1+z)$ 的分支点，距离中心恰好为 1。

### 实验 3（python）：在复平面的三个点上试几何级数

```python title="sum z^n 在 |z|=0.5 与 |z|=1.2 的部分和"
points = [0.5 * (1 + 1j), -0.5j, 1.2 * (1 + 1j)]
for z in points:
    partial = 0 + 0j       # 复数部分和从原点出发
    term = 1 + 0j          # 当前项 z^n 从 n=0 开始
    for n in range(12):
        partial = partial + term
        term = term * z
    print(f"|z|={round(abs(z), 2)}, S={round(partial.real, 3)} + {round(partial.imag, 3)}i")
```

$|z|<1$ 的两个点迅速靠近理论值 $1/(1-z)$；$|z|>1$ 的部分和开始逃逸。

:::warning[常见误区]

**误区一**：你以为收敛域一定是区间。复变量的收敛域通常是以中心为基础的开圆盘。

**误区二**：你以为圆外一定发散、圆内一定一致收敛。内部确实有很好的性质，但边界点要逐个判断。

**误区三**：你以为公式 $1/(1-z)$ 到处都能代替级数。代数表达式有自己的定义域；级数只在收敛圆内代表它。

:::

## 6. 练习

```exercise
# @title: 练习：计算 sum (2z)^n / n! 的收敛半径
# @check: inf
# @hint: 先用比值判别法求出相邻系数比的极限 0，再把这个精确极限写入 ratio_limit。
n = 10
ratio_limit = 2 / n      # 初始代码用固定 n 冒充极限；请先数学求出极限并替换它
if ratio_limit == 0:
    # float("inf") 生成正无穷，表示收敛半径没有边界
    radius = float("inf")
else:
    radius = 1 / ratio_limit
print(radius)
```

<details>
<summary>点开查看逐步解答</summary>

相邻系数比为

$$\left|\frac{2^{n+1}/(n+1)!}{2^n/n!}\right|=\frac{2}{n+1}\to0.$$

数学上先求出 $\rho=0$，因此代码应写 `ratio_limit = 0`，输出 `inf` 表示 $R=+\infty$。整函数 $e^{2z}$ 在全平面解析。
</details>

## 7. 选读：为什么最近奇点挡住收敛圆

<details>
<summary>选读 · 收敛圆不是随机围墙</summary>

以中心 $z_0$ 作最大的开圆盘，使函数在这个盘内解析。只要圆内没有奇点，函数就能展开成收敛到它的幂级数；一旦圆碰到奇点或分支点，泰勒系数无法继续维持足够快的衰减。因此实轴上看到的突然失灵，常常是复平面上某个看不见的奇点在拉警戒线。
</details>

## 8. 下一站

现在可以给解析函数做一件实函数做不到的事：沿复平面里的曲线积分。下一课定义围道积分，并看看它与路径形状有什么关系。

→ [围道积分](./50-contour-integrals.md)
