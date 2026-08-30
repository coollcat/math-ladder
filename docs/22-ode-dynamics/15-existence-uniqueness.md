---
title: 解的存在与唯一：什么时候一个初值只定一条路
lesson_id: ode/existence-uniqueness
prereqs:
  - ode/slope-fields
volume: 2
layer: L9
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - existence-uniqueness
  - lipschitz-condition
  - picard-iteration
applications:
  - numerical-methods
  - modeling-validity
exits:
  - engineering
  - data-ai
---

# 解的存在与唯一：什么时候一个初值只定一条路

## 1. 从一个场景开始

[方向场课](./10-ode-slope-fields.md)说过一句底气很足的话："初值负责从满平面的瞬时指令中选出**一条**轨迹。"可这句话是一份合同，合同有生效条款：过这一点**真的有解吗**？解**只有一条吗**？本章后面的相图课全程默认过每点恰有一条轨迹，下一章 PDE 的适定性判据更是把存在、唯一、稳定当判据使用——这份合同到底何时成立、何时作废？本课当一回合同审计员。

## 2. 直觉解释

给定 $\frac{dy}{dt} = f(t, y)$ 和初值 $y(t_0) = y_0$，三种命运都可能出现：

| 命运 | 白话 | 典型现场 |
| --- | --- | --- |
| 无解 | 空枪：指令在起点根本没定义 | $f$ 在初值点本身没定义 |
| 多解 | 分岔：从同一起点走出两条路 | 斜率函数在初值处"太猛" |
| 唯一 | 正常：起点定死一条路 | 斜率函数光滑温柔 |

关键变量是斜率函数 $f$ 对 $y$ 的"脾气"。若 $f$ 随 $y$ 变化得**温和**（相邻起点给出相邻斜率），轨迹就锁死唯一；若 $f$ 随 $y$ 变化得**猛烈**（小差异被放大成大差异），同一初值就可能裂出多条解。

## 3. 正式定义

**皮卡–林德洛夫定理**（局部版）：设 $f(t, y)$ 与 $\frac{\partial f}{\partial y}$ 在初值点 $(t_0, y_0)$ 的某个矩形邻域内**连续**，则初值问题在该邻域内**存在唯一解**。

唯一性条件的另一常用写法是 **Lipschitz 条件**：存在常数 $L$，使得对邻域内任意两点

$$\lvert f(t, y_1) - f(t, y_2) \rvert \le L\, \lvert y_1 - y_2 \rvert$$

| 条件 | 白话 | 保证什么 |
| --- | --- | --- |
| $f$ 连续 | 指令场没有断点 | 解**存在**（至少一条） |
| $\partial f/\partial y$ 连续 | 对 $y$ 的脾气温和 | 解**唯一**（至多一条） |
| Lipschitz（$\partial f/\partial y$ 连续 ⇒ Lipschitz） | 脾气有上限 | 唯一性的代用判据 |

## 4. 分步例题

**例 1**（合同生效）：$y' = y$，$y(0) = 2$。

1. $f(t, y) = y$ 处处连续；
2. $\partial f/\partial y = 1$ 处处连续——脾气最温和；
3. 判决：过 $(0, 2)$ 存在唯一解 $y = 2e^t$。方向场课的承诺全额兑现。

**例 2**（唯一性条款作废）：$y' = \sqrt{y}$，$y(0) = 0$。

1. $f(t, y) = \sqrt{y}$ 在 $y \ge 0$ 连续——存在性条款仍生效（至少有解）；
2. $\partial f/\partial y = \dfrac{1}{2\sqrt{y}}$ 在 $y = 0$ 处**爆炸**——脾气在初值点变得无限猛；
3. 验收两条都合法的解：$y \equiv 0$（常数零：$\frac{dy}{dt} = 0 = \sqrt{0}$）与 $y = \frac{t^2}{4}$（$\frac{dy}{dt} = \frac{t}{2} = \sqrt{\frac{t^2}{4}}$）。**同一个初值，两条命运**——唯一性失效。

**例 3**（存在性条款作废）：$y' = \dfrac{1}{y^2}$，$y(0) = 0$。

1. $f(t, y) = y^{-2}$ 在 $y = 0$ 处没有定义——指令场在起点本身是断点；
2. 判决：过该点的解**不存在**（空枪）。定理的前提不是装饰，少一条就翻车一条。

## 5. 动手实验

### 实验 1（viz）：分岔现场——同一初值的两条解

```viz
{
  "type": "plot",
  "title": "y'=sqrt(y), y(0)=0：两条解从原点分岔",
  "expr": "x^2/4",
  "expr2": "0",
  "xmin": 0,
  "xmax": 3
}
```

怎么玩：横轴是时间 $t$。蓝线是 $y = \frac{t^2}{4}$，橙线是 $y \equiv 0$——两条曲线都从原点 $(0, 0)$ 出发（初值相同），却从这里各自精彩。方向场的箭头在原点处"允许原地踏步，也允许起飞"，这就是脾气过猛的代价。

### 实验 2（python）：给两条解做残差体检

```python title="两条解都过体检：残差全为 0"
import math

def resid_zero(t):
    # 候选解一：y ≡ 0（常数零）。残差 = y' − sqrt(y)
    return 0.0 - math.sqrt(0.0)

def resid_quad(t):
    # 候选解二：y = t^2/4。y' = t/2，sqrt(y) = t/2
    y = t ** 2 / 4
    dy = t / 2
    return dy - math.sqrt(y)

print(round(resid_zero(2.0), 6))   # 残差 0 → 合法解
print(round(resid_quad(2.0), 6))   # 残差 0 → 也是合法解
```

怎么玩：两行都打印 `0.0`——两条解都严格满足方程与初值。唯一性失效不是"理论家的吹毛求疵"，它意味着从 $(0,0)$ 出发，未来真的可以二选一。

### 实验 3（python）：皮卡迭代——把解一层层"榨"出来

存在性的证明手法本身就是一个数值算法：把方程改写成积分形式 $y(t) = 1 + \int_0^t y(s)\,ds$，反复代入（$y_0$ 取常数，每轮把上一轮喂进积分号），解从迭代里自己长出来。

```python title="皮卡迭代 6 轮逼近 e^t"
import math

# sliders: t_show=1.0 [0.2:2.0:0.2]

N = 50                       # 数值积分的步数（步长越小越准）
h = t_show / N
y = []
for i in range(N + 1):
    y.append(1.0)            # 第 0 轮：常数函数 y0(t) = 1

for iteration in range(1, 7):                        # 皮卡迭代 6 轮
    new_y = [1.0]                                    # 每轮从初值 y(0)=1 出发
    for i in range(1, N + 1):
        acc = new_y[i - 1] + h * (y[i - 1] + y[i]) / 2   # 梯形法攒积分：y_{n+1} = 1 + ∫y_n
        new_y.append(acc)
    y = new_y

print(f"皮卡第 6 轮在 t={t_show} 的值 ≈ {round(y[N], 4)}")
print(f"官方解 e^t 在同一点的值 ≈ {round(math.exp(t_show), 4)}")
```

怎么玩：滑杆默认 $t = 1$，读数约 `2.7181` 对官方 `2.7183`——只差万分之二。多迭代几轮（把 `range(1, 7)` 改大）读数继续逼近。存在性定理不是玄学：它把"解存在"变成了一台可执行的迭代机器。

## 6. 练习

**练习 1**：验证 $y = \frac{t^2}{4}$ 确实满足 $y' = \sqrt{y}$、$y(0) = 0$。下面的代码能跑但结果不对，改到通过：

```exercise
# @title: 练习：给分岔解做残差体检
# @check: 0.0
# @hint: y = t^2/4 的导数是 t/2，不是 t^2/2——检查 dy 的系数
import math

def resid(t):
    y = t ** 2 / 4
    dy = t ** 2 / 2        # ← 导数抄错了系数
    return dy - math.sqrt(y)

print(round(resid(2.0), 6))
```

**练习 2**：判断 $y' = 3 y^{2/3}$、$y(0) = 0$ 有几条解，并至少写出两条。

<details>
<summary>点开查看逐步解答</summary>

$\frac{\partial f}{\partial y} = 2 y^{-1/3}$ 在 $y = 0$ 爆炸——唯一性失效，和 $\sqrt{y}$ 同款。两条解：$y \equiv 0$；以及分离变量得 $y = t^3$（$\frac{dy}{dt} = 3t^2 = 3(t^3)^{2/3}$）。甚至更多：$y = 0$（走到任意时刻 $a$）之后接 $y = (t - a)^3$ 的拼接解全是合法解——脾气过猛的方程能裂出整整一个家族。
</details>

**练习 3**：线性方程 $y' = a(t) y + b(t)$（$a, b$ 连续）为什么从不分岔？

<details>
<summary>点开查看逐步解答</summary>

$\frac{\partial f}{\partial y} = a(t)$ 只依赖 $t$、对 $y$ 是常数——天然 Lipschitz（$L = \max \lvert a(t)\rvert$）。所以只要 $a, b$ 连续，任何初值都唯一定向。第 20 课的一阶线性方程通解公式从不担心"两条命运"，法律依据就在这里。
</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**："你以为定理保证的是全局唯一。" 皮卡–林德洛夫给的是**局部**唯一：在初值附近的矩形里合同生效。轨迹走出邻域后需要重新续约——解可能在远处撞上新的脾气失控点。

**误区二**："你以为 Lipschitz 就是 $\partial f/\partial y$ 连续。" 反过来才对：偏导连续**推出** Lipschitz，但 Lipschitz 可以在偏导不连续时仍成立（比如 $f(y) = \lvert y\rvert$ 在 0 处 Lipschitz 却不可导）。Lipschitz 是更宽的判据。

**误区三**："你以为存在唯一性只管 ODE 课本。" 下一章 PDE 的适定性三判据（存在、唯一、稳定）直接继承本课——数值方法的收敛性证明也以"唯一解存在"为前提。这是整条计算数学流水线的开工许可。

**误区四**："你以为连续就足够唯一。" $\sqrt{y}$ 处处连续（在定义域上），却在 $y = 0$ 处给出两条解——存在与唯一是**两条独立条款**，连续只保证前者。

**误区五**："你以为唯一性失效说明方程坏了。" $y' = \sqrt{y}$ 在任何 $y_0 > 0$ 的初值处都唯一得很（$\partial f/\partial y$ 在那里有限）——失效只发生在脾气失控的具体点，换个初值合同照常生效。

**误区六**："你以为数值方法能替你兜底。" 在分岔初值处，数值轨迹走哪条支路取决于舍入误差与步长——机器的"选择"没有数学地位。唯一性是先于计算的**理论合同**。

::::

## 8. 快问快答

```quiz
y' = sqrt(y) 在初值 y(0) = 0 处有几条解？
- 恰好一条
- 至少两条（y 恒为 0 与 y = t^2/4） [*]
- 零条：sqrt 在 0 处没定义
? sqrt(0) = 0 有定义，存在性条款生效；但 1/(2·sqrt(y)) 在 0 处爆炸，唯一性条款作废——两条解都合法。皮卡迭代（实验 3）兑现的存在性与此并不矛盾：有解，且不止一条。
```

## 9. 选读：为什么"脾气有上限"能锁死唯一

<details>
<summary>选读 · 唯一性证明的四行骨架</summary>

设 $y_1, y_2$ 都从同一起点出发。两者的差满足

$$\lvert y_1(t) - y_2(t)\rvert = \Big\lvert \int_{t_0}^{t} \big[f(s, y_1) - f(s, y_2)\big]\,ds \Big\rvert \le \int_{t_0}^{t} L\,\lvert y_1(s) - y_2(s)\rvert\,ds$$

第二步正是 Lipschitz 条件。令 $g(t) = \lvert y_1(t) - y_2(t)\rvert$，得 $g(t) \le L\int_{t_0}^t g(s)\,ds$、且 $g(t_0) = 0$——**格朗沃尔不等式**当场宣判：这样的 $g$ 只能恒等于零。直觉版：差距每一步至多按比例 $L$ 复利增长，而本金是零——零的本金永远长不出利息，两条轨迹只能重叠。存在性那一半则由皮卡迭代兑现：迭代列是 Cauchy 列，完备性（Banach 课的手艺）保证极限真的存在。

</details>

## 10. 下一站

合同审计完毕：何时有解、何时唯一，心里有账。下一课回到正面解题——两类最常见的方程（可分离、一阶线性）有现成的代数解法。

→ [可分离与一阶线性方程](./20-separable-linear.md)
