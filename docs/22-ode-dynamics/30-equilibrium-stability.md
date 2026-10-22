---
title: 平衡点与稳定性
lesson_id: ode/equilibrium-stability
prereqs:
  - ode/separable-linear
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
  - equilibrium
  - stability
applications:
  - population-models
  - control-systems
exits:
  - engineering
  - research
---

# 平衡点与稳定性

## 1. 从一个场景开始

铅笔立在桌上也是“平衡”，但轻碰就倒；碗底的球被碰一下会滚回来。微分方程的平衡点同样有性格：有的吸引，有的排斥，有的只在一侧稳定。

## 2. 直觉解释

自治方程不显含时间：

$$\frac{dy}{dt}=f(y).$$

平衡点 $y^*$ 满足 $f(y^*)=0$。若附近的解随时间回到它，就是稳定；若离开它，就是不稳定。

一维相线把 $y$ 轴画成一条水平线，用箭头表示上方和下方的运动方向。

## 3. 正式定义

平衡点满足：

$$f(y^*)=0.$$

若 $f'(y^*)<0$，附近扰动被压回，通常稳定；若 $f'(y^*)>0$，扰动被放大，通常不稳定；若 $f'(y^*)=0$，需要看符号变化，可能是半稳定。

## 4. 分步例题

取

$$\frac{dy}{dt}=y(2-y).$$

1. 平衡点满足 $y(2-y)=0$，得 $y=0$ 和 $y=2$；
2. $f'(y)=2-2y$；
3. $f'(0)=2>0$，所以 0 不稳定；
4. $f'(2)=-2<0$，所以 2 稳定；
5. 初值 $y_0=3$ 会减少并趋向 2；初值 $0.5$ 会增加并趋向 2。

## 5. 动手实验

### 实验 1：相线探针

```viz
{
  "type": "equilibrium-probe",
  "title": "y' = y(2-y) 的平衡点",
  "expr": "y*(2-y)",
  "ymin": -1,
  "ymax": 3,
  "y0": 3
}
```

拖动上方相线上的初值。绿点吸引，红点排斥；下方时间线显示实际归宿。

### 实验 2：方向场对照

```viz
{
  "type": "slope-field",
  "title": "y' = y(2-y) 的方向场",
  "expr": "y*(2-y)",
  "t0": 0,
  "y0": 3,
  "ymin": -1,
  "ymax": 3
}
```

在 $y=2$ 附近短线几乎水平；偏离后箭头指向它。在 $y=0$ 附近，箭头离开它。

### 实验 3：Python 判断稳定性

```python title="用导数判断两个平衡点"
def f(y):                     # def 定义函数：自治方程的斜率规则 f(y)=y(2-y)
    return y * (2 - y)        # 逻辑斯蒂型：y=0 与 y=2 两处斜率为零，即两个平衡点

def f_prime(y):               # 一阶导 f'(y)=2-2y：判稳定性的工具
    return 2 - 2 * y          # 对 y(2-y) 求导；代入平衡点看正负号即可定型

equilibria = [0, 2]           # 列表装下两个平衡点，下面逐个判决
status0 = "stable" if f_prime(equilibria[0]) < 0 else "unstable"   # 条件表达式：导数为负才被吸回，记 stable
status2 = "stable" if f_prime(equilibria[1]) < 0 else "unstable"   # 同一判据用在 y=2 那个平衡点上
print(equilibria)             # 打印列表本身会带方括号：[0, 2]
print(status0)                # 逐行打印判决，顺序就是 @check 的顺序
print(status2)                # 第二个平衡点的结论
```

输出 `[0, 2]`、`unstable`、`stable`。

## 6. 练习

```exercise
# @title: 练习：修正平衡点稳定性
# @check: [0, 2]
# @check: unstable
# @check: stable
# @hint: f'(y)=2-2y。导数小于零才是稳定。
def f_prime(y):                        # 待修正的导数公式
    return 2 + 2 * y                   # ← 符号抄错了：代入 y=0 与 y=2 会得出相反的结论

equilibria = [0, 2]                    # 平衡点本身没写错，问题出在导数
status0 = "stable" if f_prime(equilibria[0]) < 0 else "unstable"   # 判据：导数为负 → 稳定
status2 = "stable" if f_prime(equilibria[1]) < 0 else "unstable"   # 同一判据，用第二个平衡点
print(equilibria)                      # 第一行：打印平衡点列表
print(status0)                         # 第二行：第一个平衡点的判决
print(status2)                         # 第三行：第二个平衡点的判决
```

<details>
<summary>点开查看逐步解答</summary>

由 $f(y)=y(2-y)$ 展开得 $f(y)=2y-y^2$，所以：

```python
def f_prime(y):              # f'(y)=2−2y：负数表示稳定，正数表示不稳定
    return 2 - 2 * y         # 平衡点 y=0 处 f'=2>0（不稳），y=2 处 f'=−2<0（稳）

equilibria = [0, 2]          # 列表装两个平衡值，下面按下标取
status0 = "stable" if f_prime(equilibria[0]) < 0 else "unstable"   # 条件表达式：斜率负则判稳
status2 = "stable" if f_prime(equilibria[1]) < 0 else "unstable"   # 对第二个平衡值同样判断
print(equilibria)            # 打印列表
print(status0)               # 第一个平衡点的判决
print(status2)               # 第二个平衡点的判决
```

代入：

```text
f'(0)=2，不稳定
f'(2)=-2，稳定
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为平衡点就是“导数等于零的点”这么简单。必须明确是对哪个变量求导，并且它表示 $f(y)=0$。

**误区二**：你以为导数为零就稳定。稳定性要看附近扰动的去向。

**误区三**：你以为稳定点永远到达不了。数学上常是渐近逼近；物理上可能很快难以区分。

:::

## 8. 快问快答

```quiz
一维自治方程中，f'(y*)<0 通常说明什么？
- y* 不稳定
- y* 稳定 [*]
- y* 一定是半稳定
? 导数为负表示小扰动产生的速度会把解推回 y*。
```

## 9. 选读：半稳定点

<details>
<summary>选读 · 一侧吸引，一侧排斥</summary>

取 $y'=y^2$。$y=0$ 是平衡点，且 $f'(0)=0$。初值为负时解上升趋向 0；初值为正时解增大并在有限时间内冲向无穷。这样的点叫半稳定。判断它不能只看一阶导数，要看 $f(y)$ 在两侧的符号。

</details>

## 10. 下一站

一维相线只能前后移动。下一课把状态升级成二维向量，用相图和特征值研究节点、鞍点和螺旋。

→ [相图与线性化](./40-phase-portraits.md)
