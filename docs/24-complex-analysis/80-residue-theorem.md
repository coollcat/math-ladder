---
title: 留数定理
lesson_id: complex-analysis/residue-theorem
prereqs:
  - complex-analysis/laurent-singularities
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
  - residue
applications:
  - inverse-transforms
  - real-integrals
exits:
  - engineering
  - research
---

# 留数定理

## 1. 开场钩子

绕一大圈积分，听起来要做无穷多次微小累加。但若被积函数在圈内只有几个孤立奇点，答案常常只需要把每个洞里的一个系数相加。这个系数就是留数——围道积分剩下的净额。

## 2. 直觉解释

在孤立奇点 $z_0$ 的 Laurent 展开中，

$$f(z)=\cdots+\frac{a_{-2}}{(z-z_0)^2}+\frac{a_{-1}}{z-z_0}+a_0+a_1(z-z_0)+\cdots$$

只有 $a_{-1}/(z-z_0)$ 绕小圆一周不消掉，贡献 $2\pi i\,a_{-1}$。其余整数次幂的正负频率在一整圈里互相抵消。

留数定义为

$$\operatorname{Res}_{z=z_0}f=a_{-1}.$$

## 3. 正式定理

设 $C$ 是正向简单闭曲线。若在包含 $C$ 及其内部的开集上，$f$ 除内部有限个孤立奇点外解析，则

$$\oint_C f(z)\,dz=2\pi i\sum_{k=1}^{m}\operatorname{Res}_{z=z_k}f.$$

对一阶极点，

$$\operatorname{Res}_{z=z_0}\frac{g(z)}{h(z)}=\frac{g(z_0)}{h'(z_0)}$$

当 $g(z_0)\neq0$ 且 $h(z_0)=0,\ h'(z_0)\neq0$。

## 4. 分步例题

计算

$$\oint_{|z|=3}\frac{3}{z-1}\,dz+\oint_{|z|=3}\frac{5}{z+2}\,dz.$$

两个奇点都在圆内。

1. 第一个留数为 3；
2. 第二个留数为 5；
3. 总留数 $3+5=8$；
4. 积分为 $2\pi i\cdot8=16\pi i$；
5. 数值虚部长度约 50.265。

注意：若围道只包含其中一个极点，就只能加对应那个留数。

## 5. 动手实验

### 实验 1（viz）：半径变了，净额不变

```viz
{
  "type": "green-theorem",
  "title": "1/z 绕不同半径的小圆",
  "p": "-y/(x^2+y^2)",
  "q": "x/(x^2+y^2)",
  "radius": 0.6
}
```

拖动半径滑块。只要不越过原点，环流读数保持约 $2\pi$。留数描述的是拓扑净额，不是路径长度。

### 实验 2（python）：数值验证总留数

```python title="绕半径 3 的圆积分 3/(z-1)+5/(z+2)"
import math

N = 20000
R = 3                    # 围道半径必须大于 1，否则 z=1 会落在路径上
total = 0 + 0j
for k in range(N):
    t1 = 2 * math.pi * k / N
    t2 = 2 * math.pi * (k + 1) / N
    z1 = R * (math.cos(t1) + 1j * math.sin(t1))
    dz = R * ((math.cos(t2) - math.cos(t1)) + 1j * (math.sin(t2) - math.sin(t1)))
    total += (3 / (z1 - 1) + 5 / (z1 + 2)) * dz
residue_sum = total / (2 * math.pi * 1j)
print(round(residue_sum.real, 3))
print(round(residue_sum.imag, 3))
```

输出接近 `0 8`，说明总留数确实是 8。

### 实验 3（python）：一阶极点公式抽查

```python title="用 g(z0)/h'(z0) 求 1/(z^2+1) 在 z=i 的留数"
z0 = 1j
g_value = 1
h_prime = 2 * z0        # h(z)=z^2+1 的导数是 2z
residue = g_value / h_prime
print(f"{round(residue.real, 3)} {round(residue.imag, 3)}")
```

结果是 `0.0 -0.5`，也就是 $-i/2$。实部干净地打印为 $0.0$，没有负零干扰，全部信息都落在虚部 $-0.5$ 的负号上；下一课计算上半平面的定积分时用的正是这个一阶极点公式。

```quiz
围道积分绕孤立奇点一周后，Laurent 展开的哪一项留了下来？
- 常数项
- 正一次项
- 负一次项的系数 [*]
? 只有 z 的负一次幂在完整一周内不抵消，其系数就是留数。
```

:::warning[常见误区]

**误区一**：你以为留数就是奇点处的函数值。它是 Laurent 系数 $a_{-1}$，不是 $f(z_0)$。

**误区二**：你以为高阶极点只要乘一次分母。二阶以上要保留足够项再取 $a_{-1}$。

**误区三**：你以为圈内所有奇点都该算。必须检查每个奇点是否真的位于围道内部。

:::

## 6. 练习

```exercise
# @title: 练习：求有理函数的两个留数之和
# @check: 8.0
# @check: 50.265
# @hint: 函数是 3/(z-1)+5/(z+2)。围道 |z|=3 包含两个极点吗？先判断再求和。
import math

residue_sum = -3.0 + 5.0      # 请检查第一个符号是否正确
circular_length = abs(2 * math.pi * 1j * residue_sum)
print(round(residue_sum, 1))
print(round(circular_length, 3))
```

<details>
<summary>点开查看逐步解答</summary>

$z=1$ 和 $z=-2$ 都在 $|z|=3$ 内。两个一阶极点的留数分别是 3 和 5。

总和为 8，闭路积分为 $16\pi i$，模长为 $16\pi\approx50.265$。
</details>

## 7. 选读：为什么恰好是 $a_{-1}$

<details>
<summary>选读 · 整数次幂集体抵消</summary>

沿单位圆取 $z=e^{it}$，则

$$\oint z^n\,dz=\int_0^{2\pi}ie^{i(n+1)t}\,dt.$$

当 $n\neq-1$ 时指数积分在一个完整周期内为零；当 $n=-1$ 时被积式变成 $i$，积分长度为 $2\pi$。于是只有 $z^{-1}$ 项留下 $2\pi ia_{-1}$。
</details>

## 8. 下一站

留数定理不只是复平面内部的游戏。下一课把实积分看成半圆围道的一段，让上半平面的极点替我们算出看似棘手的定积分。

→ [定积分计算应用](./90-real-integrals.md)
