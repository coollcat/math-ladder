---
title: 分离变量：把时间和空间拆开算
lesson_id: pde/separation-of-variables
prereqs:
  - pde/heat-equation-1d
  - pde/initial-boundary-data
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - separation-of-variables
  - modal-eigenvalue
  - modal-half-life
applications:
  - heat-conduction
  - vibration-modes
exits:
  - engineering
---

# 分离变量：把时间和空间拆开算

## 1. 从一个场景开始

一根一米长的细铜杆，两端死死插在 0 度的冰水里。现在把杆中间的某一小段加热成一个鼓包，然后松手。第 40 课已经告诉你"弯曲越厉害的地方温度掉得越快"，第 30 课告诉你"端点条件决定了热量能不能从两头跑掉"。可这两条都只是定性描述——真正的问题是：**任意时刻、任意位置的温度，写出来是什么？**

一个 PDE 同时管着 $x$ 和 $t$ 两个变量，看起来无从下手。三百年前的数学家试了一个大胆的赌注：假设答案能写成"一个只管 $x$ 的函数，乘一个只管 $t$ 的函数"。赌对了，PDE 就裂成两个 ODE。

## 2. 直觉解释

先玩一个更简单的游戏。假设温度分布是"某个固定的空间形状，整体按比例缩水"：

```text
t=0   形状 ▁▃▅▇▅▃▁   高度 1.00
t=1   形状 ▁▃▅▇▅▃▁   高度 0.72   ← 形状没变，只是整体变矮
t=2   形状 ▁▃▅▇▅▃▁   高度 0.52
```

这类解叫"驻波式解"：形状钉在原地不动，只有幅度一路衰减。它显然不能描述所有情况（现实里的鼓包会边摊开边变矮），但它是**一类**货真价实的解，而且是最重要的一类。

赌注的数学写法就是 $u(x,t) = X(x)\,T(t)$：空间归空间，时间归时间，两者只以乘法耦合。把它塞进热方程，神奇的事发生了——凡是含 $t$ 的量都被赶到等式一边，凡是含 $x$ 的量都被赶到另一边。

于是出现一句关键的话：**左边只依赖 $t$，右边只依赖 $x$，而它们对任意 $(x,t)$ 都必须相等。** 一个不吃 $x$ 的量，要恒等于一个不吃 $t$ 的量——唯一的可能是两者都等于同一个常数。

## 3. 正式定义

取杆长 $L$、热扩散率 $k$，两端固定的热方程定解问题：

$$u_t = k\,u_{xx}, \quad u(0,t)=u(L,t)=0, \quad u(x,0)=f(x).$$

设 $u(x,t)=X(x)T(t)$，代入：

$$X(x)\,T'(t) = k\,X''(x)\,T(t) \;\Longrightarrow\; \frac{T'(t)}{k\,T(t)} = \frac{X''(x)}{X(x)} = -\lambda.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\lambda$ | 分离常数（特征值） | 两边被迫共用的那个常数，取负号是为了解出正弦 |
| $X_n$ | 特征函数（第 $n$ 号模态） | 空间形状，$X_n(x)=\sin\frac{n\pi x}{L}$ |
| $T_n$ | 时间因子 | 衰减规律，$T_n(t)=e^{-k\lambda_n t}$ |
| $\lambda_n$ | 第 $n$ 号特征值 | $\lambda_n=\left(\frac{n\pi}{L}\right)^2$ |

两个 ODE 分别求解：

$$X''+\lambda X=0,\ X(0)=X(L)=0 \;\Longrightarrow\; X_n(x)=\sin\frac{n\pi x}{L},\ \lambda_n=\left(\frac{n\pi}{L}\right)^2,$$

$$T'+k\lambda_n T=0 \;\Longrightarrow\; T_n(t)=e^{-k\lambda_nt}.$$

乘回来，得到一整族解（$n=1,2,3,\dots$）：

$$u_n(x,t)=\sin\frac{n\pi x}{L}\;e^{-k\left(\frac{n\pi}{L}\right)^2t}.$$

## 4. 分步例题

**例 1**：$L=1$、$k=0.1$，写出前两个模态并比较它们的"寿命"。

1. $n=1$：$\lambda_1=\pi^2\approx9.870$，衰减率 $k\lambda_1\approx0.987$，半衰期 $\dfrac{\ln 2}{0.987}\approx0.702$；
2. $n=2$：$\lambda_2=(2\pi)^2\approx39.478$，衰减率 $\approx3.948$，半衰期 $\dfrac{0.6931}{3.948}\approx0.1756$；
3. 结论：模态编号翻倍，半衰期缩到约四分之一——因为 $\lambda_n$ 按 $n^2$ 增长。

**例 2**：验证 $u_1$ 确实满足热方程（取 $x=0.3$、$t=0.5$）。

1. $u_1=\sin(0.3\pi)\,e^{-0.1\pi^2\cdot0.5}\approx0.8090\times0.6105\approx0.4939$；
2. 时间导数 $u_t=-k\pi^2u_1\approx-0.1\times9.870\times0.4939\approx-0.4875$；
3. 空间二阶导数 $k\,u_{xx}=k(-\pi^2u_1)\approx0.1\times(-9.870\times0.4939)\approx-0.4875$；
4. 两者相等：$u_t=k\,u_{xx}$ 成立。

## 5. 动手实验

### 实验 1：三条带看懂一次分离

```viz
{
  "type": "separation-mode",
  "title": "分离变量：X(x) 空间形状 / T(t) 时间衰减 / u=X·T 乘积解",
  "n": 2,
  "k": 0.25,
  "mode": "dirichlet"
}
```

上下三条带是同一次分离的三张脸。拖动 $n$：空间形状多出波峰波谷，时间曲线掉得更快。切到"两端绝热"，空间形状从正弦换成余弦——边界条件直接改写可用模态的花名册。

### 实验 2：逐点验算 $u_t = k\,u_{xx}$

```python title="中心差分验证分离解满足热方程"
import math

k = 0.1          # 热扩散率

def u(x, t):     # def 定义函数：第 1 号分离解 sin(pi*x)*exp(-k*pi^2*t)
    return math.sin(math.pi * x) * math.exp(-k * math.pi ** 2 * t)

x = 0.3          # 位置
t = 0.5          # 时刻
h = 0.0001       # 差分步长

ut = (u(x, t + h) - u(x, t - h)) / (2 * h)                  # 时间方向中心差分
uxx = (u(x + h, t) - 2 * u(x, t) + u(x - h, t)) / (h * h)   # 空间二阶差分
print(round(u(x, t), 4))
print(round(ut, 4))
print(round(k * uxx, 4))
```

输出 `0.4939`、`-0.4875`、`-0.4875`。后两个数一模一样：$u_t$ 与 $k\,u_{xx}$ 严丝合缝。这不是画出来的像，是逐点恒等。

### 实验 3：三个模态的寿命表

```python title="模态编号越大，活得越短"
import math

k = 0.1
for n in range(1, 4):        # range(1, 4) 依次生成 1、2、3
    lam = (n * math.pi) ** 2            # ** 是幂运算：(n*pi) 的平方
    half = math.log(2) / (k * lam)      # math.log 是自然对数 ln
    print(n, round(lam, 3), round(half, 4))
```

输出 `1 9.87 0.7023`、`2 39.478 0.1756`、`3 88.826 0.078`。同一根杆上，$n=1$ 的大鼓包能撑 0.7 个时间单位，$n=3$ 的细碎波纹 0.078 就没了。**细节先死，轮廓后死**——这条规律是后面所有模态分析的地基。

## 6. 练习

```exercise
# @title: 练习：给第 2 号模态算一笔衰减账
# @check: 39.478
# @check: 3.948
# @check: 0.1756
# @hint: λ_n 是 (n*pi/L) 的平方，不是 n*pi/L。漏掉平方会让后面两个数一起错，且错得"看起来还算合理"。
import math

L = 1.0          # 杆长
k = 0.1          # 热扩散率
n = 2            # 模态编号

lam = n * math.pi / L          # ← 有错：λ 是 (n*pi/L)^2，这里漏了平方
rate = k * lam
half = math.log(2) / rate
print(round(lam, 3))
print(round(rate, 3))
print(round(half, 4))
```

<details>
<summary>点开查看逐步解答</summary>

修正版：

```python
import math

L = 1.0
k = 0.1
n = 2

lam = (n * math.pi / L) ** 2
rate = k * lam
half = math.log(2) / rate
print(round(lam, 3))     # 39.478
print(round(rate, 3))    # 3.948
print(round(half, 4))    # 0.1756
```

```text
λ₂ = (2π/1)² = 4π² = 39.478
衰减率 = 0.1 × 39.478 = 3.948
半衰期 = 0.6931 / 3.948 = 0.1756
```

对照第 1 号模态的半衰期 0.7023：$n$ 从 1 到 2，半衰期正好是四分之一。这是 $\lambda_n\propto n^2$ 的直接后果。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为分离变量是在瞎猜碰运气。它是有结构担保的：方程线性、齐次、系数不随 $x,t$ 变，才允许把变量拆开。换成非线性方程（比如 65 课的 Burgers 方程），这套立刻失效。

**误区二**：你以为那个常数取负是习惯。$\lambda>0$ 时 $X''+\lambda X=0$ 解出正弦，正弦才能在 $x=0$ 与 $x=L$ 同时为零；$\lambda\le 0$ 只剩零解——一根处处零度的杆，毫无信息（选读里给出完整论证）。

**误区三**：你以为一个模态就能描述任意初始形状。单个 $u_n$ 只能描述"正好是 $\sin(n\pi x/L)$ 形状"的初值。一般的鼓包要很多个模态叠加，那是下一课的工作。

:::

## 8. 快问快答

```quiz
分离变量里那个「两边被迫共用的常数」为什么取负号？
- 为了解出正弦，好让两端同时为零 [*]
- 因为温度不能是负的
- 因为时间必须能倒流
? λ 取正时空间方程 X''+λX=0 解出正弦，正弦在 x=0 与 x=L 处恰好为零；λ 取负只能得到处处为零的平凡解。
```

```quiz
模态编号 n 变成原来的 2 倍时，它的衰减半衰期怎么变？
- 缩到约四分之一 [*]
- 缩到约二分之一
- 保持不变
? λ_n 正比于 n 的平方，半衰期是 ln2 除以 kλ_n，所以 n 翻倍半衰期变成四分之一：细节先死、轮廓后死。
```

## 9. 选读：为什么 λ 取负只剩零解

<details>
<summary>选读 · 三种情形逐一排除</summary>

空间方程是 $X''+\lambda X=0$，边界条件 $X(0)=X(L)=0$。

**$\lambda<0$**：记 $\lambda=-\mu^2$（$\mu>0$），解为 $X=Ae^{\mu x}+Be^{-\mu x}$。由 $X(0)=0$ 得 $B=-A$，于是 $X=2A\sinh(\mu x)$；再由 $X(L)=0$ 得 $2A\sinh(\mu L)=0$，而 $\sinh(\mu L)\neq0$，所以 $A=0$，$X\equiv0$。

**$\lambda=0$**：解为 $X=Ax+B$，两个端点条件给出 $B=0$、$AL=0$，故 $A=B=0$，还是零解。

**$\lambda>0$**：解为 $X=A\cos(\sqrt\lambda x)+B\sin(\sqrt\lambda x)$。$X(0)=0$ 给出 $A=0$；$X(L)=0$ 给出 $\sin(\sqrt\lambda L)=0$，即 $\sqrt\lambda L=n\pi$——这正是 $\lambda_n=(n\pi/L)^2$ 的来历。

一句话总结：**边界条件对 $\lambda$ 做了一次筛选，只有离散的一串 $\lambda$ 能留下非零解。** 这串数叫谱，对应的函数叫特征函数——"特征"（eigen）这个词就是从这里进入数学的。

</details>

## 10. 下一站

我们只证明了"正弦能当模态"，可如果两端不是冰水而是绝热的棉花层呢？边界条件一换，模态花名册整个换掉。下一课把三种典型边界摆在一起，看清**特征函数是被边界筛出来的**：[特征函数与边界](./100-eigenfunction-boundary.md)。
