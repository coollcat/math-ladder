---
title: Laurent 级数与孤立奇点
lesson_id: complex-analysis/laurent-singularities
prereqs:
  - complex-analysis/cauchy-goursat
  - complex-analysis/cauchy-integral-formula
  - series/power
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
  - laurent-series
  - isolated-singularity
applications:
  - circuit-singularity
exits:
  - engineering
  - research
---

# Laurent 级数与孤立奇点

## 1. 开场钩子

$e^z$ 在全平面规规矩矩，$e^{1/z}$ 却在 $z=0$ 附近疯狂振荡：无穷多个负幂挤进一个点。泰勒级数只擅长正幂；要看清洞周围的形状，需要允许负幂登场。这就是 Laurent 级数。

## 2. 直觉解释

在以 $z_0$ 为中心的圆环内，函数可展开为

$$\sum_{n=-\infty}^{\infty}a_n(z-z_0)^n.$$

负幂部分叫主部，正幂及常数部分叫解析部。孤立奇点按主部的“脾气”分类：

- 可去奇点：没有负幂；
- 极点：有限个负幂；
- 本性奇点：无穷多个负幂。

主部越深，函数在奇点附近的行为越狂野。

## 3. 正式定义

若 $f$ 在去心圆盘

$$\lbrace z:0<|z-z_0|<R\rbrace$$

内解析，则存在唯一 Laurent 展开

$$f(z)=\sum_{n=-\infty}^{-1}a_n(z-z_0)^n+\sum_{n=0}^{\infty}a_n(z-z_0)^n.$$

系数由积分给出，其中

$$a_n=\frac{1}{2\pi i}\oint_C\frac{f(w)}{(w-z_0)^{n+1}}\,dw.$$

实际计算常用已知展开式和代数运算。

## 4. 分步例题

在 $z_0=0$ 附近展开

$$\frac{\sin z}{z}.$$

1. 已知 $\sin z=z-z^3/3!+z^5/5!-\cdots$；
2. 除以 $z$：得到 $1-z^2/3!+z^4/5!-\cdots$；
3. 没有负幂；
4. 因此 $z=0$ 是可去奇点；
5. 补定义值为 1 后，函数在原点解析。

再看 $e^{1/z}$：

$$e^{1/z}=1+z^{-1}+\frac{z^{-2}}{2!}+\frac{z^{-3}}{3!}+\cdots.$$

负幂有无穷多项，所以 $0$ 是本性奇点。

## 5. 动手实验

### 实验 1（viz）：奇点决定实轴上的失灵半径

```viz
{
  "type": "taylor",
  "title": "ln(1+x) 的泰勒展开撞上分支点",
  "fn": "ln",
  "n": 7
}
```

中心在 0 的正幂级数无法越过 $-1$。复平面上，这个边界不是直线，而是以 0 为圆心、半径为 1 的圆。

### 实验 2（python）：截断 Laurent 级数看主部

```python title="比较 sin(z)/z 和 exp(1/z) 的幂次"
for n in range(1, 6):
    z = 10 ** (-n)          # 10 ** (-n) 生成很小的正数
    regular = (z - z ** 3 / 6) / z
    wild = 1 + 1 / z + 1 / (z * z * 2)
    print(f"z={z}, regular={round(regular, 6)}, wild={round(wild, 3)}")
```

`regular` 越来越接近 1；`wild` 以惊人的速度冲大。这就是可去奇点与本性奇点的直观差别。

### 实验 3（python）：用代数找极点阶数

```python title="检查 1/(z*(z-1)^2) 的负幂结构"
# 在 z=0 附近，(z-1)^(-2)=1+2z+3z^2+...
z = 0.01
principal_at_zero = 1 / z * (1 + 2 * z + 3 * z * z)
actual = 1 / (z * ((z - 1) ** 2))
print(round(principal_at_zero, 6))
print(round(actual, 6))
print("pole order at zero = 1")
```

在 0 处主部只有 $z^{-1}$ 倍的解析因子，所以是一阶极点；在 1 处则是二阶极点。

:::warning[常见误区]

**误区一**：你以为分母为零就一定是极点。若分子也消失得足够快，可能是可去奇点。

**误区二**：你以为所有无穷坏点都是本性奇点。还必须确认它孤立且主部确实有无穷多负幂。

**误区三**：你以为同一个函数只有一个 Laurent 展开。不同圆环可以有不同的展开中心邻域。

:::

## 6. 练习

```exercise
# @title: 练习：给三个函数分类
# @check: removable
# @check: pole
# @check: essential
# @hint: 展开后数负幂：没有负幂、有限负幂、无穷负幂分别对应三类。
kinds = ["pole", "removable", "essential"]
# 目标顺序：sin(z)/z、1/z、exp(1/z)
order = [kinds[0], kinds[1], kinds[2]]
for kind in order:
    print(kind)
```

<details>
<summary>点开查看逐步解答</summary>

1. $(\sin z)/z=1-z^2/3!+\cdots$，无负幂，所以是 `removable`。
2. $1/z$ 只有一个负一次项，所以是 `pole`。
3. $e^{1/z}=1+z^{-1}+z^{-2}/2!+\cdots$，负幂无穷多，所以是 `essential`。

正确顺序应为 `removable`、`pole`、`essential`。
</details>

## 7. 选读：本性奇点的爆裂行为

<details>
<summary>选读 · Casorati-Weierstrass 直觉</summary>

本性奇点的任何去心邻域内的像都稠密地铺满复平面：任意给定目标复数，都能找到一串点趋近奇点，使函数值趋近它。Picard 定理更强：最多除去一个例外值，每个值都会被无穷多次取到。这解释了为什么“越来越乱”不是数值误差，而是结构性狂野。
</details>

## 8. 下一站

Laurent 主部里最关键的一项是 $a_{-1}(z-z_0)^{-1}$。它的系数叫留数；下一课把所有小洞的贡献加起来，得到威力巨大的留数定理。

→ [留数定理](./80-residue-theorem.md)
