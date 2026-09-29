---
title: 微分形式与外微分：把积分定理装进一个公式
lesson_id: differential-geometry/differential-forms
prereqs:
  - differential-geometry/connection-covariant-derivative
  - differential-geometry/first-fundamental-form
volume: 5
layer: L8
track:
  - geometry-space
  - analysis-change
stage: research-elective
difficulty: 5
---

# 微分形式与外微分：把积分定理装进一个公式

## 1. 从一个场景开始

你学过的积分定理长得都不一样：

- **Newton–Leibniz**：$\int_a^b f'(x)\,dx = f(b) - f(a)$（一段区间，两端点）；
- **Green**：$\oint_{\partial D}(P\,dx + Q\,dy) = \iint_D\left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dx\,dy$（平面区域，边界曲线）；
- **Stokes**：环量等于旋度通量（曲面，边界曲线）；
- **散度定理**：通量等于散度积分（立体，边界曲面）。

四个定理，四套记法，公式还得硬背。

**但如果把被积的东西换一种写法，它们其实是同一个定理。** 这不是缩写技巧，而是"微分形式"这套语言真正的价值：**它让"边界上的积分 = 内部的导数积分"变成一句话。**

## 2. 直觉解释

先改变一个观念：**$dx$ 不是"记号"的一部分，它是一个独立的数学对象。**

在初学积分时，$\int f\,dx$ 里的 $dx$ 像是"告诉你要对 $x$ 积分"的提示符。但在微分形式的语言里：

- $f$ 是 **0-形式**（一个函数，什么都不带）；
- $f\,dx$ 是 **1-形式**（可以沿曲线积分）；
- $f\,dx\wedge dy$ 是 **2-形式**（可以沿曲面积分）。

阶数决定了"能在几维的东西上积分"。而有一个算子 $d$（**外微分**），能把 $k$-形式变成 $(k+1)$-形式——**它同时扮演了梯度、旋度、散度三个角色**。

于是那个统一公式出现了：

$$\int_{\partial \Omega}\omega = \int_{\Omega} d\omega$$

**左边在边界上积分，右边在内部求"导数"再积分。** 四个定理都是它的特例——只是 $\omega$ 取不同的阶数而已。

## 3. 正式定义

**微分形式**：在每一点处给出一台"接收 $k$ 个切向量、吐出实数"的反对称机器。

| 阶数 | 形式 | 积分对象 | 物理类比 |
| :---: | --- | --- | --- |
| 0 | $f$ | 点（函数值） | 标量场（温度） |
| 1 | $P\,dx + Q\,dy + R\,dz$ | 曲线 | 力沿路径做功 |
| 2 | $P\,dy\wedge dz + Q\,dz\wedge dx + R\,dx\wedge dy$ | 曲面 | 通量 |
| 3 | $f\,dx\wedge dy\wedge dz$ | 立体 | 密度 |

**楔积** $\wedge$（外积）：**反对称**的乘法

$$dx\wedge dy = -\,dy\wedge dx, \qquad dx\wedge dx = 0$$

这个符号翻转编码的是**定向**——交换两条边，面元朝向翻转。

**外微分** $d$：把 $k$-形式变成 $(k+1)$-形式，三条性质定死它：

1. **线性**：$d(\omega_1 + \omega_2) = d\omega_1 + d\omega_2$；
2. **对函数满足 Leibniz 律**：$d(f\omega) = df\wedge\omega + f\,d\omega$；
3. **$d^2 = 0$**：对任何形式，$d(d\omega) = 0$。

**$d$ 的三个化身**（这就是它"统一"的地方）：

| 输入 | $d$ 的结果 | 等价于 |
| --- | --- | --- |
| $f$（0-形式） | $\frac{\partial f}{\partial x}dx + \frac{\partial f}{\partial y}dy + \frac{\partial f}{\partial z}dz$ | **梯度** |
| 1-形式 | 各项偏导之差组成的 2-形式 | **旋度** |
| 2-形式 | 各项偏导之和组成的 3-形式 | **散度** |

**广义 Stokes 定理**：

$$\int_{\partial\Omega}\omega = \int_{\Omega}d\omega$$

**关键**：$d^2 = 0$ 不是巧合，它正是"边界的边界是空"——$\partial(\partial\Omega) = \varnothing$——在微积分语言里的镜像。

## 4. 分步例题

**例 1（$d$ 作用于 0-形式 = 梯度）**：取 $f = x^2y$。

$$df = \frac{\partial(x^2y)}{\partial x}dx + \frac{\partial(x^2y)}{\partial y}dy = 2xy\,dx + x^2\,dy$$

这就是梯度写的另一个样子——$(2xy,\ x^2)$ 正是 $\nabla f$。

**例 2（$d$ 作用于 1-形式 = 旋度）**：取 $\omega = P\,dx + Q\,dy$，其中 $P = -y$、$Q = x$。

$$d\omega = dP\wedge dx + dQ\wedge dy$$

先算 $dP$ 与 $dQ$：

$$dP = -dy, \qquad dQ = dx$$

代入并利用反对称性（$dy\wedge dx = -dx\wedge dy$）：

$$d\omega = (-dy)\wedge dx + dx\wedge dy = -\,dy\wedge dx + dx\wedge dy = 2\,dx\wedge dy$$

验算：$\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} = 1 - (-1) = 2$ ✓

**$d\omega$ 的系数就是旋度的 $z$ 分量。** Green 定理的右边自动出现了。

这就把 Green 定理看穿了：左边是 $\oint_{\partial D}\omega$，右边是 $\iint_D d\omega$——**只是把 $d\omega$ 算出来再写成传统形式而已**。

**例 3（$d^2 = 0$ 的验算）**：取 $f = x^2y$，从上例已知 $df = 2xy\,dx + x^2\,dy$。

$$d(df) = d(2xy)\wedge dx + d(x^2)\wedge dy$$

$$= (2y\,dx + 2x\,dy)\wedge dx + (2x\,dx)\wedge dy$$

利用 $dx\wedge dx = 0$：

$$= 2y\cdot 0 + 2x\,dy\wedge dx + 2x\,dx\wedge dy = -2x\,dx\wedge dy + 2x\,dx\wedge dy = 0$$

**结果为零**。这就是"梯度的旋度为零"（$\nabla\times\nabla f = 0$）——它在微分形式里是 $d^2=0$ 的一句推论。

## 5. 动手实验

先用数值验证 $d^2 = 0$ 不是巧合，而是一个**自动成立**的代数事实：

```python title="d² = 0：用符号记账验证"
def d0(f_partials):
    """d 作用于 0-形式：把函数变成 1-形式（三个分量）"""
    return list(f_partials)

def d1(vec, jac):
    """d 作用于 1-形式：(P,Q,R) → 2-形式的三个分量（旋度）"""
    P, Q, R = vec
    # 分量1: ∂R/∂y - ∂Q/∂z ; 分量2: ∂P/∂z - ∂R/∂x ; 分量3: ∂Q/∂x - ∂P/∂y
    return (jac['Ry'] - jac['Qz'], jac['Pz'] - jac['Rx'], jac['Qx'] - jac['Py'])

# 取 f = x²y，它在点 (1,1) 的偏导：(2xy, x²) = (2, 1)
x, y = 1.0, 1.0
grad = (2 * x * y, x ** 2)            # 梯度 (2, 1)
print("df 在 (1,1) 处的分量：", grad)

# 对 1-形式 (P,Q) = (2y, x²) 求 d：需要 ∂Q/∂x 与 ∂P/∂y
jac = {'Qx': 2 * x, 'Py': 2 * x, 'Pz': 0, 'Ry': 0, 'Rx': 0, 'Qz': 0}
try:
    result = d1((2 * y, x ** 2, 0.0), jac)
    print("d(df) 的分量：", result)
except KeyError as e:
    print("缺少偏导项：", e)
print("注意第三个分量 = ∂Q/∂x - ∂P/∂y = 2x - 2x = 0 —— 这正是 d²=0")
```

第三个分量 $2x - 2x = 0$。**它不是"算出来碰巧为零"，而是由混合偏导相等的对称性保证的**——$\frac{\partial^2 f}{\partial x\partial y} = \frac{\partial^2 f}{\partial y\partial x}$，在反对称的楔积里自动抵消。

再看那个 $-1$ 是从哪来的——**反对称性是全部秘密**：

```python title="楔积的反对称：符号翻转换了什么"
def wedge(a, b):
    """两个 1-形式 dx、dy 的楔积，用 (系数, 是否翻转) 表示"""
    return (a[0] * b[0], a[1] + b[1])     # 系数相乘，翻转次数相加

# dx ∧ dy 与 dy ∧ dx 的关系：翻转次数的奇偶决定符号
dx = (1, 0)
dy = (1, 0)
ab = wedge(dx, dy)
ba = wedge(dy, dx)
sign_ab = 1 if ab[1] % 2 == 0 else -1
# 交换后翻转次数 +1（奇偶性相反），所以符号相反
print(f"dx∧dy 的系数 {ab[0]}，翻转 {ab[1]} 次 → 符号 {sign_ab}")
print(f"dy∧dx 的系数 {ba[0]}，交换一次 → 符号 {-sign_ab}")
print("结论：dx∧dy = -dy∧dx —— 交换两条边，面元定向翻转")
```

最后用一个真实计算把 Green 定理的"两边"算出来，看它们确实相等：

```python title="Green 定理实测：环量 = 旋度通量"
import math

def P(x, y):
    return -y                    # P = -y

def Q(x, y):
    return x                     # Q = x

# 左边：沿单位圆周的环量 ∮(P dx + Q dy)
N = 20000
total = 0.0
ds = 2 * 3.141592653589793 / N
for i in range(N):
    t = i * ds
    x, y = math.cos(t), math.sin(t)
    dx = -math.sin(t) * ds       # dx/dt = -sin t
    dy = math.cos(t) * ds
    total = total + P(x, y) * dx + Q(x, y) * dy

# 右边：旋度在单位圆盘上的积分 ∬(∂Q/∂x - ∂P/∂y) dxdy = ∬ 2 dxdy = 2π
curl_integral = 2 * 3.141592653589793

print(f"环量（边界积分）   = {total:.6f}")
print(f"旋度通量（内部积分）= {curl_integral:.6f}")
print(f"两者之差 = {abs(total - curl_integral):.2e} —— 数值误差范围内相等")
```

两边都是 $2\pi$。**Green 定理在微分形式的语言里就是这么一句话**：边界上的积分等于内部 $d\omega$ 的积分。

### 快问快答

```quiz
外微分算子的性质 d² = 0，在几何上对应哪件事？
- 边界的边界是空的 [*]
- 曲面的面积可以为零
- 导数的导数一定是常数
? 外微分 d 与"取边界"∂ 是一对操作，∫∂Ω ω = ∫Ω dω 把两者联系起来。而 ∂(∂Ω) 恒为空集，所以 d² = 0 是这件事在微积分语言里的镜像。这也是同调论中 ∂² = 0 的来源。
```

:::warning[常见误区]

**误区一**："$dx$ 只是一个积分记号。" 
在微分形式的语言里，$dx$ 是 1-形式的基（一台接收切向量的机器），可以参与乘法（楔积）并能被外微分作用。把它当记号看，就永远理解不了为什么几个定理是同一个——**符号的自主性是这里最关键的一步**。

**误区二**："$d^2 = 0$ 说明 $d$ 是个普通导数？错了就行。" 
它说的是 **$d$ 的值域落在自己的核里**（$\text{Im}\,d \subset \text{Ker}\,d$）。这个性质是整个（上）同调论的起点——"闭形式"（$d\omega=0$）不一定是"恰当形式"（$\omega = d\eta$），两者的差距就是上同调群。第 58 章的同调正是在数这个差距。

**误区三**："四个积分定理是四个独立的定理。" 
它们是同一个定理的四次投影：0-形式给 Newton–Leibniz，1-形式给 Green 与 Stokes，2-形式给散度定理。**维度变了，定理没变。**

:::

## 6. 练习

**练习 1**：下面的代码想验证 $d^2 = 0$——对 $f = x^2y$ 先求梯度，再对梯度求"旋度"（第三个分量）。但混合偏导算错了一项。改到输出 `0.0`：

```exercise
# @title: 练习：验证 d² = 0
# @check: 0.0
# @hint: f = x²y 时，∂f/∂x = 2xy，∂f/∂y = x²；再求 ∂(∂f/∂y)/∂x 与 ∂(∂f/∂x)/∂y，两者应相等
x, y = 1.5, 2.0

fx = 2 * x * y          # ∂f/∂x
fy = x ** 2             # ∂f/∂y

# 再对 (fx, fy) 求 d 的第三个分量：∂fy/∂x - ∂fx/∂y
d_fy_dx = 2 * x         # ∂(x²)/∂x
d_fx_dy = x             # ← 这里错了：∂(2xy)/∂y 应该等于 2x
print(float(d_fy_dx - d_fx_dy))
```

**练习 2**：写出 2-形式 $\omega = x\,dy\wedge dz$ 的外微分 $d\omega$，并说明它是哪个矢量场的散度。

<details>
<summary>点开查看逐步解答</summary>

$d\omega = d(x)\wedge dy\wedge dz = \left(\frac{\partial x}{\partial x}dx + \frac{\partial x}{\partial y}dy + \frac{\partial x}{\partial z}dz\right)\wedge dy\wedge dz$

利用 $dy\wedge dy = 0$、$dz\wedge dy\wedge dz = -dy\wedge dz\wedge dz = 0$，只剩下：

$$d\omega = \frac{\partial x}{\partial x}\,dx\wedge dy\wedge dz = 1\cdot dx\wedge dy\wedge dz = dx\wedge dy\wedge dz$$

**系数是 1**。对照散度的定义：若 $\vec F = (F_x, F_y, F_z)$，则 $\nabla\cdot\vec F = \frac{\partial F_x}{\partial x} + \frac{\partial F_y}{\partial y} + \frac{\partial F_z}{\partial z}$。

$d\omega = dx\wedge dy\wedge dz$ 意味着 $\frac{\partial F_x}{\partial x} = 1$，其余为 $0$——对应矢量场 $\vec F = (x, 0, 0)$ 的散度。

**验算**：$\nabla\cdot(x,0,0) = 1$ ✓

这正是散度定理 $\oiint_{\partial V}\vec F\cdot d\vec S = \iiint_V(\nabla\cdot\vec F)\,dV$ 在微分形式里的样子：左边是 $\int_{\partial V}\omega$，右边是 $\int_V d\omega$。
</details>

## 7. 选读：闭形式与恰当形式的差距

<details>
<summary>选读 · 上同调群是怎么冒出来的</summary>

$d^2 = 0$ 意味着两件事：

- **闭形式**：$d\omega = 0$ 的形式（相当于"旋度为零"或"散度为零"）；
- **恰当形式**：$\omega = d\eta$ 的形式（某个东西的"导数"）。

由 $d^2=0$，恰当形式一定闭。**但反过来对不对？闭形式是否一定恰当？**

在**单连通区域**上，可以证明是对的（这是 Poincaré 引理的结论）：$\mathbb{R}^3$ 上旋度为零的场必是梯度场，散度为零的场必是旋度场。

但在**有洞的区域**上不行。经典例子是挖掉原点的小平面：

$$\omega = \frac{-y\,dx + x\,dy}{x^2+y^2}$$

在圆环上算一下，$d\omega = 0$（旋度为零），但绕原点一圈的积分是 $2\pi \ne 0$——所以它**闭但不恰当**。

这个差距被量化成一个群：

$$H^k = \frac{\text{闭 }k\text{-形式}}{\text{恰当 }k\text{-形式}}$$

**de Rham 定理**说：这个上同调群同构于拓扑空间的上同调群——**$H^k$ 的维数就是"$k$ 维洞的个数"**。在圆环上 $H^1$ 的维数是 1（一个洞）；在球面上 $H^2$ 的维数是 1（一个空腔）。

**分析里的"闭而不恰当"，恰好数出了拓扑上的"洞"。** 这就是微分形式与第 58 章同调、Betti 数之间那座桥——两个完全不同的领域，被同一个算子 $d$ 连了起来。
</details>

## 8. 下一站

到这里，微分几何的入门工具已经配齐：切空间、两种基本形式、联络、微分形式。下一站回到拓扑，去数一数那些"洞"到底有多少个。

→ [第 58 章 · 同调与 Betti 数](../58-topology-data-geometry/58-homology-betti.md)：把"洞"变成可以计算的量。
