---
title: 常数变易法
lesson_id: ode-dynamics/variation-of-constants
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
difficulty: 3
introduces_concepts:
  - variation-of-parameters
  - particular-solution
applications:
  - forced-oscillations
  - control-theory
exits:
  - green-functions
---

# 常数变易法

## 1. 从一个场景开始

弹簧振子自然振动时满足 $y'' + \omega^2 y = 0$，解是 $A\cos\omega t + B\sin\omega t$。但如果加上外力 $f(t)$，方程变成 $y'' + \omega^2 y = f(t)$——齐次解不够用了。常数变易法的思路是：把齐次解里的"常数" $A, B$ 换成"函数" $A(t), B(t)$，让它们适应外力的干扰。

## 2. 直觉解释

齐次方程的通解是 $y_h = c_1 y_1 + c_2 y_2$。常数变易法说：把 $c_1, c_2$ 变成 $u_1(t), u_2(t)$，代入非齐次方程，看看 $u_1', u_2'$ 应该是什么。

为什么这样做能找到特解？因为 $u_1(t), u_2(t)$ 可以"实时调节"每个基解的权重，让整体满足非齐次方程。就像乐队演奏时，每个乐手的音量要随乐谱变化——常数变易就是这个"音量调节器"。

## 3. 正式定义

**一阶线性方程**：$y' + p(t)y = g(t)$。

齐次解：$y_h = Ce^{-\int p\,dt}$。常数变易：设 $y = u(t)e^{-\int p\,dt}$，代入得：

$$u'(t) = g(t) e^{\int p\,dt}$$

$$u(t) = \int g(t) e^{\int p\,dt}\, dt + C$$

通解：

$$y = e^{-\int p\,dt}\left[\int g(t) e^{\int p\,dt}\, dt + C\right]$$

**二阶线性方程**：$y'' + p(t)y' + q(t)y = g(t)$。

已知齐次解 $y_1, y_2$。设特解 $y_p = u_1(t)y_1 + u_2(t)y_2$，其中：

$$u_1' = -\frac{y_2 g}{W}, \quad u_2' = \frac{y_1 g}{W}$$

$W = y_1 y_2' - y_2 y_1'$ 是 Wronskian 行列式。

**与叠加原理的关系**：非齐次方程的通解 = 齐次通解 + 一个特解。常数变易法是构造特解的系统方法。

## 4. 分步例题

**例 1**：解 $y' + y = e^{2t}$，$y(0) = 0$。

**第一步**：齐次解 $y_h = Ce^{-t}$。

**第二步**：常数变易，设 $y = u(t)e^{-t}$。

**第三步**：$u' = e^{2t} \cdot e^{t} = e^{3t}$。

**第四步**：$u = \frac{1}{3}e^{3t} + C$。

**第五步**：$y = e^{-t}\left(\frac{1}{3}e^{3t} + C\right) = \frac{1}{3}e^{2t} + Ce^{-t}$。

**第六步**：$y(0) = \frac{1}{3} + C = 0 \Rightarrow C = -\frac{1}{3}$。

$$y = \frac{1}{3}(e^{2t} - e^{-t})$$

**例 2**：解 $y'' + y = \sec t$（$-\pi/2 < t < \pi/2$）。

1. 齐次解：$y_1 = \cos t$，$y_2 = \sin t$。
2. Wronskian：$W = \cos t \cdot \cos t - \sin t \cdot (-\sin t) = 1$。
3. $u_1' = -\frac{\sin t \cdot \sec t}{1} = -\tan t$，$u_2' = \frac{\cos t \cdot \sec t}{1} = 1$。
4. $u_1 = \ln|\cos t|$，$u_2 = t$。
5. 特解：$y_p = \cos t \cdot \ln|\cos t| + t \sin t$。
6. 通解：$y = c_1 \cos t + c_2 \sin t + \cos t \ln|\cos t| + t\sin t$。

## 5. 动手实验

### 实验 1：一阶方程的常数变易

```python title="y' + y = e^{2t} 的数值解 vs 解析解"
import numpy as np                      # numpy：数值数组库，np.linspace / np.exp 都在这里
import matplotlib.pyplot as plt         # 绑图库，负责画图
from scipy.integrate import odeint  # odeint：数值解 ODE 的函数

# 解析解
def y_exact(t):                         # def 定义函数：本例的解析解
    return (np.exp(2*t) - np.exp(-t)) / 3  # 常数变易得到的闭式

# 数值解
def ode_rhs(y, t):                      # 斜率函数；odeint 要求参数顺序是 (y, t)
    return np.exp(2*t) - y              # 把 y'=e^{2t}-y 的右端原样抄成代码

t = np.linspace(0, 3, 200)              # 在 [0, 3] 上均匀取 200 个点当时间网格
y_num = odeint(ode_rhs, 0, t).flatten()  # 第二个参数是初值 y(0)=0；flatten 把二维结果压成一维

plt.plot(t, y_exact(t), "b-", linewidth=2, label="解析解")   # "b-" 是蓝色实线，label 供图例使用
plt.plot(t, y_num, "r--", linewidth=2, label="数值解")       # "r--" 是红色虚线：两条越贴合越好
plt.xlabel("t")                          # 横轴标签
plt.ylabel("y(t)")                        # 纵轴标签
plt.title("常数变易法解 y'+y=e^(2t)")        # 图标题
plt.legend()                             # 照 label 画出图例
plt.grid(True)                           # 打开网格线，方便读数值
```

### 实验 2：参数变化的直觉

```python title="u1(t) 和 u2(t) 如何随时间变化"
import numpy as np                      # numpy：数组与向量化三角函数
import matplotlib.pyplot as plt         # 绑图库

# y'' + y = sin(2t), y1=cos t, y2=sin t
# u1' = -sin(t)*sin(2t), u2' = cos(t)*sin(2t)
t = np.linspace(0, 10, 500)             # [0, 10] 均匀取 500 个时刻
u1 = np.zeros_like(t)                   # zeros_like：造一个和 t 同样形状的全零数组，装 u₁(t)
u2 = np.zeros_like(t)                   # 同理，装 u₂(t)

dt = t[1] - t[0]                        # 相邻两格的时间间隔，就是数值积分用的步长
for i in range(1, len(t)):              # 从第 2 个点开始，逐格向前推进（用前一格的结果）
    u1[i] = u1[i-1] + (-np.sin(t[i-1]) * np.sin(2*t[i-1])) * dt   # 左矩形法累加 u₁'=-y₂g/W
    u2[i] = u2[i-1] + (np.cos(t[i-1]) * np.sin(2*t[i-1])) * dt    # 同理累加 u₂'=y₁g/W

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 5), sharex=True)   # 2 行 1 列两个子图，共用横轴
ax1.plot(t, u1, "b-", label="u₁(t)")    # 上图：第一个权重函数
ax1.set_ylabel("u₁(t)")                # 子图改轴标签要用 set_ 前缀
ax1.legend()                            # 子图的图例要单独开
ax1.grid(True)                          # 子图网格线

ax2.plot(t, u2, "r-", label="u₂(t)")    # 下图：第二个权重函数
ax2.set_ylabel("u₂(t)")                 # 下图纵轴标签
ax2.set_xlabel("t")                    # 只有最下面那张图需要横轴标签
ax2.legend()
ax2.grid(True)
plt.suptitle("常数变易：权重函数 u₁(t), u₂(t)")   # suptitle 是整张图的大标题
plt.tight_layout()                      # 自动收紧子图间距，免得标签被裁掉
```

$u_1, u_2$ 不是常数——它们随时间调节，让 $u_1 y_1 + u_2 y_2$ 跟上外力的节奏。

### 实验 3：共振现象的常数变易视角

```python title="当外力频率接近自然频率时"
import numpy as np                      # numpy：sin 与 linspace
import matplotlib.pyplot as plt         # 绑图库

# sliders: omega_f=0.9 [0.1:2.0:0.1]
# y'' + y = sin(omega_f * t), 自然频率=1
from scipy.integrate import odeint      # 数值积分器

def ode(y, t):                          # 把二阶方程拆成两个一阶方程：状态是 [y, y']
    return [y[1], np.sin(omega_f * t) - y[0]]   # 第一项是 y'，第二项是 y''=外力-回复力

t = np.linspace(0, 50, 2000)            # 观测 50 秒，取 2000 个点
sol = odeint(ode, [0, 0], t)            # 初值 [y(0), y'(0)] = [0, 0]，结果每行是一个时刻的状态

plt.plot(t, sol[:, 0], linewidth=1)     # [:, 0] 取所有行第 0 列，即位移 y 的整条轨迹
plt.xlabel("t")                         # 横轴标签
plt.ylabel("y(t)")                       # 纵轴标签
plt.title(f"受迫振动：ω_f = {omega_f}")    # f-string：把滑块当前值写进标题
plt.grid(True)                          # 网格线
```

拖动 $\omega_f$ 接近 1（自然频率）：振幅越来越大——共振！当 $\omega_f = 1$ 时，常数变易法给出 $y_p = -\frac{t}{2}\cos t$，振幅随时间线性增长。

### 实验 4：解的变分可视化

```viz
{
  "type": "plot",
  "title": "常数变易法：齐次解 + 特解",
  "expr": "a*exp(-x) + (exp(2*x)-exp(-x))/3",
  "xmin": 0,
  "xmax": 1.7,
  "sliders": [
    {"name": "a", "min": -2, "max": 2, "step": 0.1, "value": 0}
  ]
}
```

y'+y=e^{2t} 的通解 = 齐次解 Ce^{-t} + 特解 (e^{2t}-e^{-t})/3。拖动滑块 a 改变常数 C，观察不同初值条件下的解曲线如何从齐次解"分叉"出去。窗口只画到 $x=1.7$：再往右 $e^{2t}$ 会把曲线甩到几十上百，初期那点「分叉」的细节就全被压扁了——放大初期才是这张图要看的。

## 6. 练习

```quiz
常数变易法的核心思想是什么？
- 把齐次解中的常数换成函数，代入非齐次方程求解 [*]
- 直接猜测特解的形式
- 用数值方法逼近解
? 常数变易法把 y_h = c₁y₁ + c₂y₂ 中的常数 c₁, c₂ 换成函数 u₁(t), u₂(t)，让它们适应外力的干扰。
```

```quiz
一阶方程 y'+p(t)y=g(t) 的通解公式是什么？
- y = e^{-∫p dt} · ∫g·e^{∫p dt} dt + Ce^{-∫p dt} [*]
- y = Ce^{-∫p dt}
- y = ∫g dt + C
? 通解 = e^{-∫p dt}[∫g(t)e^{∫p dt} dt + C]。齐次解是 Ce^{-∫p dt}，特解是 e^{-∫p dt}∫g·e^{∫p dt} dt。
```

**练习 1**：用常数变易法解 $y' - 2y = t$，$y(0) = 1$。

```exercise
# @title: 常数变易法练习
# @check: y(0) = 1.0
# @check: y(1) = 8.49
# @hint: 齐次解 y_h = Ce^{2t}，u' = te^{-2t}，用分部积分
import numpy as np       # 本题其实用不到 numpy，保留导入是为了和正文保持一致

def y(t):                # 候选解：现在是个常函数，待改成真解
    return 1.0           # ← 改成正确解：先对上初值 y(0)=1，再让 y(1) 落到 @check 的值

print(f"y(0) = {y(0):.1f}")   # f-string 的 :.1f 表示保留 1 位小数；第一行与 @check 对应
print(f"y(1) = {y(1):.2f}")   # :.2f 保留 2 位小数；第二行与 @check 对应
```

**练习 2**：常数变易法和待定系数法有什么区别？各自适用于什么情况？

<details>
<summary>点开查看解答</summary>

**待定系数法**：只适用于 $g(t)$ 是多项式、指数、正弦余弦及其组合的情况。猜一个特解形式，代入确定系数。简单但受限。

**常数变易法**：适用于任何 $g(t)$（只要能算出积分）。更通用但可能积分困难。

选择策略：$g(t)$ 形式好→待定系数；$g(t)$ 复杂→常数变易。
</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为常数变易只是把 $C$ 换成 $u(t)$ 的记号游戏。真正的动作是**代回非齐次方程**，靠这一步逼出 $u'(t)$；不代回，$u$ 可以随便写。

**误区二**：你以为一阶公式里的 $e^{\int p\,dt}$ 和 $e^{-\int p\,dt}$ 可以互换。齐次解带负号，积分号里的因子带正号——写反会让整条公式失去意义。

**误区三**：你以为二阶情形可以直接套一阶公式。二阶需要两个齐次解 $y_1, y_2$ 和一个 Wronskian $W$；若 $W=0$（两解线性相关），常数变易法就无从下手。

**误区四**：你以为算出 $u_1, u_2$ 就得到通解。特解只补上非齐次的那一份，通解还要再加齐次解 $c_1y_1+c_2y_2$，初值由这两个常数承担。

:::

## 8. 选读：Green 函数——常数变易的终极形态

<details>
<summary>选读 · 从特解公式到 Green 函数</summary>

常数变易法给出的特解可以写成积分形式：

$$y_p(t) = \int_0^t G(t, s) g(s)\, ds$$

其中 $G(t, s) = \frac{y_1(s)y_2(t) - y_2(s)y_1(t)}{W(s)}$ 就是 **Green 函数**。

Green 函数的物理意义：$G(t, s)$ 是在时刻 $s$ 施加一个脉冲（$\delta$ 函数），到时刻 $t$ 的响应。整个特解就是把所有时刻的脉冲响应叠加起来。

这和卷积定理完全一致：Laplace 变换下，$\mathcal{L}\lbrace f * g\rbrace = F(s)G(s)$。Green 函数就是时域里的传递函数。

</details>

## 9. 下一站

齐次解加特解这套拼装手艺至此齐活。可解出来只回答了"会怎样"，还没回答"稳不稳"：两条起始相差一点点的解，会越走越近还是越离越远？下一课把答案画在一条**相线**上——平衡点分成吸引、排斥与半稳三类。

→ [平衡点与稳定性](./30-equilibrium-stability.md)

如果更想先看复变函数那条线，也可以跳到 [Liouville 定理](../24-complex-analysis/72-liouville.md)——"有界整函数只能是常数"，第 24 章的主线。
