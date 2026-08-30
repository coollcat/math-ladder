---
title: Python 工具索引
description: 卷一用到的每个 Python 工具：一句话用途 + 它在哪一课出生
lesson_id: python-tools/python-index
prereqs: []
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# Python 工具索引

本站的原则是"工具必须有出生证明"——每个工具第一次出现的那一课，都会先给你看"没有它会怎样"。忘了某个工具是干嘛的、想回炉重造，就查这张表。

## 内置函数

| 工具 | 干什么 | 出生地 |
| --- | --- | --- |
| `sum()` | 把一串数加起来，累加器循环的官方快捷方式 | [本站 Python 约定](./10-conventions.md) |
| `round()` | 四舍五入到指定小数位 | [小数与十进制](../02-fractions/30-decimals.md) |
| `pow()` | 乘方，`pow(a, n)` 等价于 `a ** n` | [乘方：连乘的记号](../03-exponents/10-power.md) |
| `abs()` | 取绝对值，负数变正数 | [函数是机器](../06-functions/10-machine.md) |
| `math.floor()` | 向下取整（往更小的方向） | [函数是机器](../06-functions/10-machine.md) |
| `math.ceil()` | 向上取整（往更大的方向） | [函数是机器](../06-functions/10-machine.md) |
| `divmod()` | 一次返回商和余数这对搭档 | [整除、余数与模运算](../10-numbertheory/10-divisibility-mod.md) |

## math 模块

| 工具 | 干什么 | 出生地 |
| --- | --- | --- |
| `math.sqrt()` | 求平方根 | [平方根：已知面积求边长](../03-exponents/20-sqrt.md) |
| `math.log()` | 求对数（可指定底） | [对数：指数的反问句](../03-exponents/40-log.md) |
| `math.hypot()` | 直角三角形斜边长 $\sqrt{a^2+b^2}$ | [面积与勾股定理](../05-geometry/20-area-pythagoras.md) |
| `math.pi` | 圆周率 π ≈ 3.14159 | [圆周率 π](../05-geometry/30-circle-pi.md) |
| `math.sin()` | 正弦：单位圆上一点的纵坐标 | [单位圆上的 sin 与 cos](../07-trigonometry/10-unit-circle.md) |
| `math.cos()` | 余弦：单位圆上一点的横坐标 | [单位圆上的 sin 与 cos](../07-trigonometry/10-unit-circle.md) |
| `math.tan()` | 正切：影子之比，管"陡不陡" | [正切：影子之比与坡度](../07-trigonometry/15-tangent.md) |
| `math.radians()` | 角度转弧度 | [单位圆上的 sin 与 cos](../07-trigonometry/10-unit-circle.md) |
| `math.tau` | 一整圈的弧度 $2\pi$ ≈ 6.28319 | [弧度制](../07-trigonometry/20-radian.md) |
| `math.factorial()` | 阶乘 n!，从 1 连乘到 n | [排列与组合：数清楚每一种可能](../09-probability/10-counting.md) |
| `math.gcd()` | 最大公约数 | [最大公约数与欧几里得算法](../10-numbertheory/30-gcd-euclid.md) |
| `math.atan2()` | 由坐标 (y, x) 反推辐角，自动分辨象限 | [反三角函数：arcsin、arccos 与 atan2](../07-trigonometry/55-inverse-trig.md) |
| `math.degrees()` | 弧度转角度 | [模、辐角与极形式](../12-complex/25-polar.md) |
| `math.e` | 自然常数 e ≈ 2.71828 | [欧拉公式](../12-complex/30-euler.md) |
| `math.exp()` | e 的乘方 $e^x$ | [欧拉公式](../12-complex/30-euler.md) |
| `math.lcm()` | 最小公倍数 | [最小公倍数：钟表重逢问题](../10-numbertheory/32-lcm.md) |

## 第三方库

| 工具 | 干什么 | 出生地 |
| --- | --- | --- |
| `matplotlib.pyplot` | 让数据变成图：折线、散点、直方…… | [matplotlib 入门](./20-matplotlib.md) |
| `random` | 生成随机数，模拟"运气"的机器 | [matplotlib 入门](./20-matplotlib.md) |
| `statistics` | 均值、方差、标准差等统计量一键计算 | [平均数、方差与标准差](../09-probability/30-mean-variance.md) |
