---
title: Laplace 变换求解 ODE
lesson_id: ode-dynamics/laplace-transform
prereqs:
  - ode/separable-linear
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_concepts:
  - laplace-transform
  - transfer-function
applications:
  - control-theory
  - circuit-analysis
exits:
  - control-systems
  - signal-processing
---

# Laplace 变换求解 ODE

## 1. 从一个场景开始

电路里，开关突然合上，电压从 0 跳到 5V。这个"跳变"用经典方法处理很棘手（要分段求解再拼接），但 Laplace 变换把它变成一个简单的代数操作——$5/s$。整个微分方程变成了代数方程，解完再反变换回来就行。

## 2. 直觉解释

Laplace 变换就像一把"翻译器"：

- **时域**（原来的微分方程）：$y'' + 3y' + 2y = f(t)$，涉及导数，难解。
- **频域**（变换后的代数方程）：$s^2Y + 3sY + 2Y = F(s)$，只有乘法和加法，容易解。

翻译的关键规则：$y'(t) \to sY(s) - y(0)$，$y''(t) \to s^2Y(s) - sy(0) - y'(0)$。

导数变成了乘法，初值条件自动嵌入——这就是 Laplace 变换的魔法。

## 3. 正式定义

**Laplace 变换**：对函数 $f(t)$（$t \geq 0$），

$$\mathcal{L}\{f(t)\} = F(s) = \int_0^\infty e^{-st} f(t)\, dt$$

其中 $s$ 是复数参数（实际应用中取实部充分大的实数即可）。

**常用变换对**：

| $f(t)$ | $F(s)$ |
| --- | --- |
| $1$ | $1/s$ |
| $t^n$ | $n!/s^{n+1}$ |
| $e^{at}$ | $1/(s-a)$ |
| $\sin(\omega t)$ | $\omega/(s^2+\omega^2)$ |
| $\cos(\omega t)$ | $s/(s^2+\omega^2)$ |
| $\delta(t)$（脉冲） | $1$ |

**微分性质**：

$$\mathcal{L}\{f'(t)\} = sF(s) - f(0)$$

$$\mathcal{L}\{f''(t)\} = s^2F(s) - sf(0) - f'(0)$$

**卷积性质**：$\mathcal{L}\{f * g\} = F(s) \cdot G(s)$。

## 4. 分步例题

**例**：解 $y'' + 3y' + 2y = e^{-t}$，$y(0) = 0$，$y'(0) = 1$。

**第一步**：两边取 Laplace 变换。记 $Y = \mathcal{L}\{y\}$：

$$[s^2Y - s \cdot 0 - 1] + 3[sY - 0] + 2Y = \frac{1}{s+1}$$

**第二步**：整理：

$$(s^2 + 3s + 2)Y = 1 + \frac{1}{s+1} = \frac{s+2}{s+1}$$

**第三步**：解出 $Y$：

$$Y = \frac{s+2}{(s+1)(s^2+3s+2)} = \frac{s+2}{(s+1)^2(s+2)} = \frac{1}{(s+1)^2}$$

**第四步**：反变换。$\frac{1}{(s+1)^2} = \mathcal{L}\{te^{-t}\}$。

$$y(t) = te^{-t}$$

验证：$y(0) = 0$ ✓，$y'(0) = (1-t)e^{-t}\big|_{t=0} = 1$ ✓。

## 5. 动手实验

### 实验 1：数值 Laplace 变换验证

```python title="数值积分验证 L{e^{at}} = 1/(s-a)"
import numpy as np

def laplace_numerical(f, s, T=100):
    """用梯形法数值计算 Laplace 变换"""
    t = np.linspace(0, T, 10000)    # 从 0 到 T 的时间点
    dt = t[1] - t[0]                # 时间步长
    integrand = np.exp(-s * t) * f(t)  # 被积函数 e^{-st} f(t)
    return np.trapz(integrand, t)   # np.trapz：梯形法数值积分

# 验证 L{e^{2t}} = 1/(s-2)，对 s > 2
f = lambda t: np.exp(2 * t)
for s in [3, 4, 5]:
    numerical = laplace_numerical(f, s)
    exact = 1 / (s - 2)
    print(f"s={s}: 数值={numerical:.6f}, 精确={exact:.6f}, 误差={abs(numerical-exact):.2e}")
```

### 实验 2：用 Laplace 变换解微分方程（符号计算）

```python title="用 sympy 做 Laplace 变换求解"
from sympy import symbols, Function, laplace_transform, inverse_laplace_transform, exp, solve

t, s = symbols('t s')           # 定义符号变量
Y = symbols('Y')                # Y(s) 的符号

# y'' + 3y' + 2y = e^{-t}, y(0)=0, y'(0)=1
# Laplace 变换后：(s^2 + 3s + 2)Y - 1 = 1/(s+1)
eq = (s**2 + 3*s + 2) * Y - 1 - 1/(s + 1)
Y_sol = solve(eq, Y)[0]        # solve：解方程，返回解列表
print(f"Y(s) = {Y_sol}")

y_sol = inverse_laplace_transform(Y_sol, s, t)  # 反变换
print(f"y(t) = {y_sol}")
```

### 实验 3：阶跃响应的图形

```python title="RC 电路的阶跃响应"
import numpy as np
import matplotlib.pyplot as plt

# sliders: R=1.0 [0.5:5:0.5], C=1.0 [0.5:5:0.5]
# RC 电路：R i + (1/C) ∫i dt = V_step，即 RC y' + y = 1 (t>0)
# Laplace 解：Y(s) = 1/(s(RCs+1)) = 1/s - RC/(RCs+1)
# y(t) = 1 - e^{-t/(RC)}

tau = R * C                    # 时间常数
t = np.linspace(0, 5 * tau, 500)
y = 1 - np.exp(-t / tau)       # 阶跃响应

plt.plot(t, y, "b-", linewidth=2)
plt.axhline(y=0.632, color="red", linestyle="--", alpha=0.5, label="63.2% (t=τ)")
plt.axvline(x=tau, color="green", linestyle="--", alpha=0.5, label=f"τ = {tau:.1f}")
plt.xlabel("时间 t")
plt.ylabel("电压 y(t)")
plt.title(f"RC 阶跃响应 (R={R}, C={C})")
plt.legend()
plt.grid(True)
```

拖动滑块看 $R$ 和 $C$ 如何影响响应速度：$\tau = RC$ 越大，响应越慢。

### 实验 4：常见函数的 Laplace 变换对

```viz
{
  "type": "plot",
  "title": "Laplace 变换：时域函数 e^{-at}",
  "expr": "exp(-a*x)",
  "xmin": 0,
  "xmax": 5,
  "ymin": -0.5,
  "ymax": 2,
  "sliders": [
    {"name": "a", "min": -2, "max": 3, "step": 0.1, "value": 1}
  ]
}
```

拖动参数 a，观察时域函数 e^{-at} 的变化。a>0 时指数衰减（Laplace 变换为 1/(s-a)），a<0 时指数增长。a=0 时退化为常数 1（变换为 1/s）。这就是 Laplace 变换表中最基本的变换对。

## 6. 练习

```quiz
Laplace 变换 L{e^{at}} 等于什么？
- 1/(s+a)
- 1/(s-a) [*]
- a/(s²+a²)
? L{e^{at}} = ∫₀^∞ e^{-st}·e^{at} dt = ∫₀^∞ e^{-(s-a)t} dt = 1/(s-a)，要求 s>a 保证积分收敛。
```

```quiz
Laplace 变换把微分方程中的 y'(t) 变成什么？
- sY(s)
- sY(s) - y(0) [*]
- Y(s)/s
? 微分性质：L{y'(t)} = sY(s) - y(0)。导数变成了乘法，初值条件自动嵌入——这是 Laplace 变换的核心优势。
```

**练习 1**：用 Laplace 变换解 $y' + 2y = 4$，$y(0) = 1$。

```exercise
# @title: 一阶方程的 Laplace 变换
# @check: y(0) = 1.0
# @check: y(1) = 2.0
# @check: y(5) = 2.0
# @hint: sY - 1 + 2Y = 4/s → Y = (4/s + 1)/(s+2)
import numpy as np

# 用 Laplace 变换得到的解析解
def y(t):
    return 2 - np.exp(-2 * t)   # ← 改成正确的解（提示：平衡解是 2）

print(f"y(0) = {y(0)}")
print(f"y(1) = {y(1)}")
print(f"y(5) = {y(5)}")
```

**练习 2**：求 $\mathcal{L}\{t \sin(2t)\}$。

<details>
<summary>点开查看解答</summary>

利用 $\mathcal{L}\{t f(t)\} = -F'(s)$。

$F(s) = \mathcal{L}\{\sin(2t)\} = \frac{2}{s^2 + 4}$。

$F'(s) = \frac{-4s}{(s^2+4)^2}$。

所以 $\mathcal{L}\{t\sin(2t)\} = -F'(s) = \frac{4s}{(s^2+4)^2}$。
</details>

## 7. 选读：Laplace 变换为什么有效

<details>
<summary>选读 · 收敛条件与存在性</summary>

$\mathcal{L}\{f\}(s) = \int_0^\infty e^{-st}f(t)\,dt$ 的存在条件：$f$ 在 $[0, \infty)$ 上分段连续，且存在常数 $M, \alpha$ 使 $|f(t)| \leq Me^{\alpha t}$。此时积分对所有 $s > \alpha$ 收敛。

这个条件比 Fourier 变换宽松得多——$f$ 可以指数增长，只要 $e^{-st}$ 衰减得更快就行。这就是为什么 Laplace 变换在工程中更常用：物理系统的响应通常是指数有界的，条件自动满足。

反变换公式（Bromwich 积分）：

$$f(t) = \frac{1}{2\pi i}\int_{\gamma - i\infty}^{\gamma + i\infty} e^{st} F(s)\, ds$$

实际应用中，反变换靠查表或部分分式分解完成，很少直接算这个积分。

</details>

## 8. 下一站

Laplace 变换把整个方程一锅端。有没有更精细的方法，先解齐次方程，再用"常数变易"修补出非齐次的解？

→ [常数变易法](./27-variation-of-constants.md)
