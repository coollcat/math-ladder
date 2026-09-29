---
title: 哈密顿正则方程：二阶方程降成一阶对
lesson_id: hamiltonian/canonical-equations
prereqs:
  - hamiltonian/legendre-transform
  - ode/phase-portraits
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 7
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_concepts:
  - hamiltonian
  - canonical-equations
  - hamiltonian-vector-field
applications:
  - orbit-integration
  - molecular-dynamics
exits:
  - research
  - engineering
---

# 哈密顿正则方程：二阶方程降成一阶对

## 1. 从一个场景开始

要模拟一颗卫星绕地球转，你得知道它此刻在哪、以及此刻跑得多快——两个初始条件。可牛顿方程 $m\ddot q = F(q)$ 是**二阶**的：位置的变化率里套着位置的变化率。写进程序时，这两件事总在更新顺序上打架：先挪位置还是先改速度？顺序不同，长时间跑出来的轨道会飘到十万八千里外。

哈密顿力学给这件事换了个说法：把"位置"和"动量"并排当作**同一个平面上的两个坐标**，运动就变成"在平面上顺着一个箭头场往前走"。这一课要做三件事：把方程写出来、看清楚那个箭头场是能量等高线的切线、再用一步数值计算把"二阶降成一阶"落到地上。

## 2. 直觉解释

把 $(q, p)$ 看成一张地图上的坐标，$H(q,p)$ 是这张地图上的**海拔**。海拔相同的点连成等高线——在物理里它们就是"能量相同的那些状态"。

现在说一件关键的事：正则方程给出的运动方向，永远**沿着等高线**，既不爬坡也不下坡。

为什么？把方向向量写成 $\left(\dfrac{\partial H}{\partial p},\; -\dfrac{\partial H}{\partial q}\right)$，把它和梯度 $\left(\dfrac{\partial H}{\partial q},\; \dfrac{\partial H}{\partial p}\right)$ 做点乘：

$$\frac{\partial H}{\partial q}\cdot\frac{\partial H}{\partial p} + \frac{\partial H}{\partial p}\cdot\left(-\frac{\partial H}{\partial q}\right) = 0$$

点乘为零就是**垂直**。运动方向处处垂直于梯度，而梯度垂直于等高线——所以运动方向就是等高线的切线方向。这就是"能量守恒"在几何上的全部内容：**你在地图上走，但海拔表读数一动不动。**

还有一个附带的好处：一阶方程组的初始条件就是"地图上的一个点"，不需要再区分"先更新谁"。

## 3. 正式定义

设 $H(q, p)$ 是相空间上的光滑函数（$q, p$ 可以是多维，下面按一维写）。**哈密顿正则方程**是

$$\dot q = \frac{\partial H}{\partial p}, \qquad \dot p = -\frac{\partial H}{\partial q}$$

如果把二维写成"$2n$ 维向量 $\mathbf z = (q_1,\dots,q_n,p_1,\dots,p_n)$"，它可以紧凑地写成 $\dot{\mathbf z} = J\,\nabla H$，其中 $J$ 是那块"转 90 度"的矩阵（下一课讲辛结构时再正式登场）。

**它从哪来**（结论，推导归 22 章）：拉格朗日量 $L(q, v)$ 的欧拉–拉格朗日方程是 $\dfrac{\mathrm d}{\mathrm dt}\dfrac{\partial L}{\partial v} = \dfrac{\partial L}{\partial q}$。把 $p = \partial L/\partial v$ 认成动量，这一条就变成 $\dot p = \partial L/\partial q$；再用上一课的勒让德变换 $H = pv - L$，右边恰好化成 $-\partial H/\partial q$。

| 符号 | 名字 | 一句话含义 |
| --- | --- | --- |
| $q$ | 广义坐标 | 位置（或角度、电荷……），不一定是长度 |
| $p$ | 共轭动量 | 由 $p = \partial L/\partial v$ 定出，不一定是 $mv$ |
| $H(q,p)$ | 哈密顿量 | 相空间上的"海拔"，通常就是能量 |
| $\dot q, \dot p$ | 时间导数 | 对时间求导，物理里那一点就是 $\mathrm d/\mathrm dt$ |
| $\dfrac{\partial H}{\partial q}$ | 对 $q$ 的偏导 | 把 $p$ 当常数求导，反之亦然 |

三条直接推论：

1. **$H$ 守恒**：$\dfrac{\mathrm dH}{\mathrm dt} = \dfrac{\partial H}{\partial q}\dot q + \dfrac{\partial H}{\partial p}\dot p = \dfrac{\partial H}{\partial q}\dfrac{\partial H}{\partial p} - \dfrac{\partial H}{\partial p}\dfrac{\partial H}{\partial q} = 0$。若 $H$ 显含时间，则 $\mathrm dH/\mathrm dt = \partial H/\partial t$。
2. **相流不可压**：$\dfrac{\partial \dot q}{\partial q} + \dfrac{\partial \dot p}{\partial p} = \dfrac{\partial^2 H}{\partial q\partial p} - \dfrac{\partial^2 H}{\partial p\partial q} = 0$。这一条下一课会展开成刘维尔定理。
3. **对称性**：两个方程的差别只有一处负号。这个负号就是全部"力学"的来源——去掉它，$H$ 的等高线就不再是轨道了。

## 4. 分步例题

**例** 谐振子 $H = \tfrac12 p^2 + \tfrac12\omega^2 q^2$（取 $\omega = 1$），从 $q_0 = 1$、$p_0 = 0$ 出发，用步长 $h = 0.1$ 走**一步**辛欧拉。

1. 算偏导：$\dfrac{\partial H}{\partial q} = \omega^2 q = q$，$\dfrac{\partial H}{\partial p} = p$；
2. 先更新动量：$p_1 = p_0 - h\cdot q_0 = 0 - 0.1 \times 1 = -0.1$；
3. **再**用刚算出的 $p_1$ 更新位置：$q_1 = q_0 + h\cdot p_1 = 1 + 0.1 \times (-0.1) = 0.99$；
4. 查能量：$E_1 = \tfrac12(0.99^2 + 0.1^2) = 0.49505$，出发时是 $0.5$，掉了约 $0.99\%$；
5. 和精确解对照：$q(0.1) = \cos 0.1 = 0.99500$、$p(0.1) = -\sin 0.1 = -0.09983$。

一步 $h = 0.1$ 就精确到千分之几，看起来平淡无奇。真正的戏在后面：**第 2、3 步的先后顺序**决定了长期行为。如果第 3 步用的是**旧**的 $p_0$（那是显式欧拉），能量会一步步往上爬；用新的 $p_1$（辛欧拉），能量永远只在 $0.5$ 附近晃。第 60 课会把这件事算到底。

## 5. 动手实验

### 实验 1（lab）：相平面上的矢量场

```lab
{
  "type": "ham-phase-flow",
  "title": "相平面上拖一个点：轨道就是哈密顿量的等高线",
  "system": "harmonic",
  "q": 1.2,
  "p": 0,
  "sliders": [
    { "name": "k", "label": "刚度 k", "min": 0.3, "max": 2, "step": 0.05, "value": 1 },
    { "name": "a", "label": "势垒 a", "min": 0.2, "max": 2, "step": 0.05, "value": 1 }
  ]
}
```

灰箭头是矢量场 $\left(\partial H/\partial p,\; -\partial H/\partial q\right)$。**在画布上任意位置拖一下**：初始条件就搬过去了，轨道立刻重算，播放按钮让一个点沿轨道跑。切到"单摆"：那两条上下分岔的线是**分界线**（能量恰好等于 1），线内是来回摆、线外是绕圈转——同一条方程，两种命运。切到"双井"：两个"眼睛"是稳定平衡，中间原点是鞍点。注意所有轨道**永不相交**：一个点只能有一条命运。

### 实验 2（python）：走一圈，看能量表

```python
import math
omega = 1.0          # 角频率，H = p²/2 + ω²q²/2
h = 0.01             # 时间步长
q, p = 1.0, 0.0      # 初始条件：拉到位移 1 处松手
E0 = 0.5 * p * p + 0.5 * omega ** 2 * q * q
worst = 0.0
for i in range(157):                    # 157 × 0.01 = 1.57 ≈ 四分之一周期
    p = p - h * omega ** 2 * q          # ṗ = −∂H/∂q
    q = q + h * p                       # q̇ = +∂H/∂p（用刚更新的 p）
    E = 0.5 * p * p + 0.5 * omega ** 2 * q * q
    worst = max(worst, abs(E - E0))     # max() 留下最大的偏离
print(f"初始能量 {E0:.4f}，t = 1.57 时 {E:.4f}")
print(f"整条轨道上能量最大偏离 {worst:.2e}")
print(f"t = 1.57 时 q = {q:.4f}，精确解 cos(1.57) = {math.cos(1.57):.4f}")
```

输出是：`初始能量 0.5000，t = 1.57 时 0.5000`、`整条轨道上能量最大偏离 2.49e-03`、`t = 1.57 时 q = -0.0042，精确解 cos(1.57) = 0.0008`。四分之一周期后 $q$ 回到零附近，两条值差的那一点点是 $O(h)$ 的相位误差——步长减半它也会跟着减半。而能量那一栏的 $2.49\times10^{-3}$ 有个漂亮的性质：它是 $h/2$ 的量级（$h=0.01$），**不随时间增长**。把 `range(157)` 改成 `range(6280)`（跑十个周期），这个数还是差不多大。

### 快问快答

```quiz
正则方程里那个负号如果去掉，最直接的后果是什么？
- 能量不再守恒，因为 dH/dt 不再恒为零 [*]
- 方程会变成二阶的
- 动量不再等于质量乘速度
? 去掉负号后 dH/dt 变成两项相加的 2·(∂H/∂q)(∂H/∂p)，一般不为零；而带上负号两项正好抵消。
```

::::warning[常见误区]

**误区一**："哈密顿方程是新的一条物理定律。"
你以为它和牛顿定律并列——其实它和欧拉–拉格朗日方程是**同一个物理内容**的另一种坐标写法，可以由它推出来（本课 §3 已给出这段推导的骨架）。它的价值不在于"更对"，而在于**更好用**：一阶、对称、适合数值积分，也适合做坐标变换。

**误区二**："$q$ 是位置，$p$ 是动量，两者一个'实'一个'虚'。"
你以为它们地位不同——其实在正则方程里两者是**完全对称**的两个坐标，方程的形式只差一个负号。正因为对称，才能做"交换 $q$ 与 $-p$"这类变换（正则变换）而方程不变；也正因为对称，相空间的面积才有意义（下一课）。

**误区三**："初始条件要同时给定位置和速度，所以哈密顿形式和拉格朗日形式一样麻烦。"
其实两种形式的初始数据都是"两个数"（$(q_0,v_0)$ 或 $(q_0,p_0)$），差别在**演化规则的结构**：哈密顿流给出的每一步都是"相空间里的一次可逆搬动"，而随手写的显式欧拉不是。就是这个结构差别，让辛积分器能长期守住能量。

::::

## 6. 练习

**练习 1**：下面这段代码写了一步"辛欧拉"，但动量的符号抄反了，跑出来是 `1.01 0.1`——位移反而变大了。修到输出 `0.99 -0.1`：

```exercise
# @title: 练习：一步辛欧拉（H = (p² + q²)/2）
# @check: 0.99 -0.1
# @hint: ṗ = −∂H/∂q，那个负号不能丢；q 的更新要用刚算出来的新 p
h = 0.1
q = 1.0
p = 0.0
p = p + h * q       # ← 问题在这：应该是 p − h·q
q = q + h * p
print(q, p)
```

**练习 2**：对单摆 $H = \tfrac12p^2 - \cos q$，写出它的正则方程，并说明"分界线"（能量 = 1）在相图上是什么样子。

<details>
<summary>点开查看逐步解答</summary>

1. 算偏导：$\dfrac{\partial H}{\partial p} = p$，$\dfrac{\partial H}{\partial q} = \sin q$；
2. 套正则方程：$\dot q = p$，$\dot p = -\sin q$——这正是单摆方程 $\ddot q = -\sin q$ 写成的一阶对；
3. 找平衡点：$\dot q = \dot p = 0$ 要求 $p = 0$ 且 $\sin q = 0$，即 $q = 0, \pm\pi, \pm2\pi,\dots$；其中 $q = 0$ 是稳定平衡（摆垂在最低点），$q = \pm\pi$ 是不稳定平衡（摆笔直朝上）；
4. 分界线是能量恰好等于 $1$ 的那条轨道：$H = \tfrac12 p^2 - \cos q = 1$，即 $p = \pm\sqrt{2(1 + \cos q)} = \pm 2\left|\cos(q/2)\right|$；
5. 它经过不稳定平衡点 $(q, p) = (\pm\pi, 0)$，把相图分成"来回摆"（$H < 1$，闭合轨道）与"绕圈转"（$H > 1$，上下贯通的开放轨道）两个区域。分界线本身是**同宿轨道**：从鞍点出发、又回到鞍点，需要无穷长时间。

</details>

## 7. 选读：canonical 这个词

<details>
<summary>选读 · "正则"是"标准"的意思，不是"正则化"</summary>

canonical 在数学物理里一直是"标准形式"的意思（和"典范"同源），跟机器学习里的"正则化"（regularization，防过拟合那一套）没有半点关系。中文译作"正则"是历史选择。

真正值得一提的是**正则变换**：把 $(q, p)$ 换成新坐标 $(Q, P)$ 时，只要保持正则方程的形式不变，这对新坐标就是合法的。判据是泊松括号 $\lbrace Q, P\rbrace = 1$（第 40 课会正式定义它）。

一个立刻能用的例子：谐振子取 $Q = \arctan\dfrac{\omega q}{p}$、$P = H/\omega$。代进去你会看到新方程变成了 $\dot Q = \omega$、$\dot P = 0$——**$Q$ 匀速转，$P$ 一动不动**。所有复杂的椭圆轨道，在这套坐标里都是一条水平直线。这就是第 70 课"作用量–角变量"的预告，也是可积系统最原始的样板。

</details>

## 8. 下一站

一堆初始条件挤在相空间的某个小区域里。它们会一起散开吗？面积会不会被拉大、挤小？答案出人意料地干净——它恰好是"不可压"的。

→ [相空间与刘维尔定理](./30-liouville.md)
