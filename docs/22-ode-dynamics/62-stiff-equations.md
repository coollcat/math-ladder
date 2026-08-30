---
title: 刚性方程：快慢两个时钟的折衷
lesson_id: ode/stiff-equations
prereqs:
  - ode/euler-runge-kutta
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
  - stiff-equation
  - implicit-euler
applications:
  - chemical-kinetics
  - circuit-simulation
exits:
  - engineering
  - scientific-computing
---

# 刚性方程：快慢两个时钟的折衷

## 1. 从一个场景开始

上一课的 Euler 与 RK4 让飞船能飞、气候能算。可化工厂的模拟工程师有个难言之隐：模拟一个平平无奇的反应，程序跑到半路数字冲上天——方程没错、代码没错、步长已经砍到 0.01 秒，还是炸。毛病出在方程的"体质"上：解里同时住着两个时钟，一个毫秒级衰亡，一个慢条斯理地转。**快时钟早已退场，它的幽灵却仍绑架着每一步的步长**。这一课看显式法怎么被逼疯，以及隐式法的一招治愈。

## 2. 直觉解释

主角方程：

$$y'=-50\,(y-\cos t),\qquad y(0)=0.$$

它的解里藏着两个时钟：$e^{-50t}$ 是快钟（时间常数 $1/50=0.02$ 秒，转眼衰亡），$\cos t$ 是慢钟（周期约 6.3 秒，慢慢摇）。真实解很快只剩慢钟的表演。

显式 Euler 一步的账本：

$$y_{n+1}=y_n+h\,f(t_n,y_n)=y_n-50h\,(y_n-\cos t_n).$$

单独盯住瞬态部分：每一步它被乘上**放大系数** $1-50h$。

- $h=0.01$：系数 0.5——每步减半，快钟乖乖退场；
- $h=0.04$：系数 0——一步清零，正好踩在悬崖边上；
- $h=0.05$：系数 $-1.5$——每步放大还变号，快钟的鬼魂越抖越大，**爆炸**。

稳定性判据一句话：$\lvert 1-50h\rvert<1$，即 $h<\dfrac{2}{50}=0.04$。注意这条门槛跟"想要多准"无关——快钟 0.1 秒后就退场了，可只要步长越界，连它留下的零头都会被逐步放大成天文数字。

隐式 Euler 换了个问法：不用起点斜率，而问"终点的斜率配不配这段路"——$y_{n+1}$ 出现在等式两边，先解再走：

$$y_{n+1}=y_n-50h\,(y_{n+1}-\cos t_{n+1}).$$

移项解出 $y_{n+1}$：分母是 $1+50h>1$，瞬态每步被**除**以一个大于 1 的数——永远缩水，任何步长都稳。代价是每步多解一个小方程。

## 3. 正式定义

**刚性方程**（白话版）：解里同时住着时间常数相差悬殊的快慢模态，而且快模态衰亡之后，数值方法仍被迫全程使用由快模态决定的小步长。

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\lambda$ | 衰减速率 | 模型问题 $y'=\lambda(y-g(t))$ 中 $\lambda<0$ |
| $\tau=1/\lvert\lambda\rvert$ | 时间常数 | 快钟衰亡的特征时间 |
| $1+h\lambda$ | 显式放大系数 | 每步瞬态被乘上的倍数 |
| 稳定 | 有界 | 数值解不随步数放大（与准不准无关） |

显式 Euler 对 $\lambda<0$ 的稳定条件：$\lvert1+h\lambda\rvert<1$，等价于 $h<2/\lvert\lambda\rvert$。

**隐式 Euler**：

$$y_{n+1}=y_n+h\,f(t_{n+1},y_{n+1}).$$

对 $\lambda<0$，它的放大系数是 $\dfrac{1}{1-h\lambda}$，分母恒大于 1——**任何步长都不放大**，术语叫无条件稳定。快钟再快，也只影响"每步解方程"的代数难度，不再绑架步长。

## 4. 分步例题

用主角方程、$y(0)=0$、步长 $h=0.1$ 走一步（终点 $t_1=0.1$）。

1. **显式**：起点斜率 $f(0,0)=-50(0-1)=50$，$y_1=0+0.1\times50=5.0$——真解此刻约 0.99，一步就冲高五倍；
2. **显式第二步**：$y_2=5+0.1\times(-50)(5-\cos 0.1)\approx-15.025$——开始翻着跟头放大；
3. **隐式**：把 $y_1$ 从等式两边解出来：$(1+50\times0.1)\,y_1=0+50\times0.1\cos0.1$，即 $y_1=\dfrac{5\cos0.1}{6}\approx0.829$；
4. **精确值**：$y(0.1)\approx0.990$。显式误差约 4.0，隐式误差约 $-0.16$——隐式偏保守，但毫发无伤地活着。

精确解的闭式（来历见选读）：

$$y(t)=\frac{2500\cos t+50\sin t}{2501}-\frac{2500}{2501}e^{-50t}.$$

## 5. 动手实验

### 实验 1：方向场里的两个时钟

```viz
{
  "type": "slope-field",
  "title": "y' = -50(y - cos t)：陡壁与缓坡共存",
  "expr": "-50*(y - cos(t))",
  "t0": 0,
  "y0": 0,
  "tmin": 0,
  "tmax": 3,
  "ymin": -1.5,
  "ymax": 1.5
}
```

离开余弦曲线半步，短线立刻近乎竖直——那就是快钟的悬崖：每秒把偏离往回拉 50 倍。橙线（精确轨迹）贴着慢钟 $\cos t$ 走。快钟只在最初 0.1 秒里真的干活，可它的陡壁永远立在那里。

### 实验 2：快慢时钟对照

```viz
{
  "type": "plot",
  "title": "快钟 e^(-k t) 与慢钟 cos t",
  "expr": "exp(-k*x)",
  "expr2": "cos(x)",
  "xmin": 0,
  "xmax": 1,
  "label": "e^(-kt)",
  "label2": "cos(t)",
  "sliders": [
    { "name": "k", "min": 2, "max": 50, "step": 1, "value": 50 }
  ]
}
```

把 $k$ 拖到 50：蓝线在 0.1 秒内归零，橙线才走到 0.54——快钟办完事退场，慢钟才刚热身。刚性的本质：数值方法明明只需要伺候慢钟，步长却被快钟的放大系数按着头定。

### 实验 3：显式 Euler 的生死开关

```python title="显式 Euler：拖动步长看生死"
import math
import matplotlib.pyplot as plt

# sliders: h=0.05 [0.005:0.08:0.005]

def f(t, y):
    return -50 * (y - math.cos(t))    # 斜率规则：照抄方程

n = int(3.0 / h)                      # int() 截断取整：0 到 3 秒要走几步
t, y = 0.0, 0.0                       # 两个变量一次赋值：时间与解都从 0 出发
ts, ys = [t], [y]                     # 时间与数值解两本账，先记起点
peak = 0.0                            # 登记整条轨迹上最大的 |y|
for k in range(n):
    y = y + h * f(t, y)               # 显式 Euler：起点斜率直接外推
    t = t + h
    ts.append(t)                      # append 把新样本接到列表末尾
    ys.append(y)
    if abs(y) > peak:                 # abs 取绝对值：只关心偏多远
        peak = abs(y)

print("h =", h)
print("最大 |y| =", f"{peak:.2e}")     # .2e 科学计数法，如 3.68e+10
print("t=3 的 y =", round(y, 3))
plt.plot(ts, ys, linewidth=1)
plt.show()
```

实测读数：h=0.01 时轨迹贴着余弦（t=3 的 y 约为 −0.987，与真解三位小数一致）；h=0.03 时开始抖动但有界（峰值 1.5）；h=0.04 踩线存活（峰值 2.0，幅度已经全错）；h=0.05 直接起飞——最大 |y| 冲到 3.68e+10。放大系数 $1-50h$ 越过 −1 的那一瞬，解从"贴轨"翻成"爆炸"。

### 实验 4：隐式 Euler 的治愈

```python title="隐式 Euler：同款方程，先解再走"
import math
import matplotlib.pyplot as plt

# sliders: h=0.1 [0.01:0.2:0.01]

def f(t, y):
    return -50 * (y - math.cos(t))

n = int(3.0 / h)
t, y = 0.0, 0.0
ts, ys = [t], [y]
for k in range(n):
    t = t + h
    y = (y + 50 * h * math.cos(t)) / (1 + 50 * h)   # 隐式更新式：从方程解出 y 的下一步
    ts.append(t)
    ys.append(y)

print("h =", h)
print("t=3 的 y =", round(y, 3))
plt.plot(ts, ys, linewidth=1)
plt.show()
```

滑块从 0.01 拖到 0.2，读数始终有界：h=0.1 时 t=3 的 y 约为 −0.986，h=0.2 时约 −0.985——步长是显式禁区五倍，依然稳如老狗。注意看轨迹：头几个峰看起来"矮半截"（约 0.95），那是步长 0.1 的采样点恰好错过了真实波峰的观感；稳态振幅实测约 0.999，只比真解瘪约 0.1%——隐式的稳定几乎不用"磨钝"来换。

### 实验 5：同框对质

```python title="显式 vs 隐式：同一步长 0.05 的两张答卷"
import math
import matplotlib.pyplot as plt

def f(t, y):
    return -50 * (y - math.cos(t))

h = 0.05
n = int(1.0 / h)

t, y = 0.0, 0.0
ts1, ys1 = [t], [y]
peak1 = 0.0
for k in range(n):
    y = y + h * f(t, y)               # 显式
    t = t + h
    ts1.append(t)
    ys1.append(y)
    if abs(y) > peak1:
        peak1 = abs(y)

t, y = 0.0, 0.0
ts2, ys2 = [t], [y]
for k in range(n):
    t = t + h
    y = (y + 50 * h * math.cos(t)) / (1 + 50 * h)   # 隐式
    ts2.append(t)
    ys2.append(y)

ts3, ys3 = [], []                     # 精确解的账本
for k in range(301):
    tt = 1.0 * k / 300
    ts3.append(tt)
    ys3.append((2500 * math.cos(tt) + 50 * math.sin(tt)) / 2501 - (2500 / 2501) * math.exp(-50 * tt))

print("显式 t=1 的 y =", round(ys1[-1], 3), " 峰值 =", f"{peak1:.2e}")   # [-1] 取列表最后一个元素
print("隐式 t=1 的 y =", round(ys2[-1], 3))
print("精确 t=1 的 y =", round(ys3[-1], 3))
plt.plot(ts1, ys1, linewidth=1, label="explicit")
plt.plot(ts2, ys2, linewidth=2, label="implicit")
plt.plot(ts3, ys3, linewidth=1, linestyle="--", label="exact")   # linestyle 线型：虚线
plt.legend()                          # legend 显示图例
plt.ylim(-2, 2)                       # ylim 定住纵轴：显式曲线很快越界出画
plt.show()
```

输出三行：显式 `−3325.032`（峰值 3.33e+03），隐式与精确同为 `0.557`。同一根时间轴上，显式法翻着跟头冲出画面，隐式法贴着真解走完全程——这就是"治愈"的直观形状。

## 6. 练习

```exercise
# @title: 练习：把假隐式改造成真隐式
# @check: 0.829
# @check: 0.99
# @hint: 隐式更新要从 y1 = y0 - 50h(y1 - cos t1) 里把 y1 解出来：移项后分母是 1 + 50h。
import math

h = 0.1
t1 = 0.1
y0 = 0.0

y1 = y0 + h * (-50) * (y0 - math.cos(t1))   # ← 有错：这是显式公式，只是把斜率取在了终点
print(round(y1, 3))

y_exact = (2500 * math.cos(t1) + 50 * math.sin(t1)) / 2501 - (2500 / 2501) * math.exp(-50 * t1)
print(round(y_exact, 3))
```

初始代码能跑，但第一行打印 `4.975`——比真解 0.99 高出四倍多。这是"显式斜率套在终点"的假隐式。真隐式要从方程里把 $y_1$ 解出来：$y_1=\dfrac{y_0+50h\cos t_1}{1+50h}$，第一行变成 `0.829`。

<details>
<summary>点开查看逐步解答</summary>

隐式 Euler 的方程 $y_1=y_0-50h(y_1-\cos t_1)$ 把含 $y_1$ 的项挪到左边：

```python
y1 = (y0 + 50 * h * math.cos(t1)) / (1 + 50 * h)
```

代入：$(1+5)y_1=5\cos0.1\approx4.975$，解得 $y_1\approx0.829$。它比真值 0.99 低一截（隐式偏保守），但对比显式的 4.975——一个活着，一个已经飞了。

可执行复查：

```python
import math

h = 0.1
t1 = 0.1
y0 = 0.0
y1 = (y0 + 50 * h * math.cos(t1)) / (1 + 50 * h)
print(round(y1, 3))
y_exact = (2500 * math.cos(t1) + 50 * math.sin(t1)) / 2501 - (2500 / 2501) * math.exp(-50 * t1)
print(round(y_exact, 3))
```

</details>

**练习 2**（思考）：RK4 每步采样四个斜率、精度高得多，它能大幅放松步长限制吗？

<details>
<summary>点开查看逐步解答</summary>

不能。RK4 的放大系数是 $1+z+\dfrac{z^2}{2}+\dfrac{z^3}{6}+\dfrac{z^4}{24}$（$z=h\lambda$）。代入 $z=-5$（即 $h=0.1$）：约 13.7，照爆不误。RK4 的实轴稳定边界大约在 $z\approx-2.79$，对应本方程 $h\approx0.056$——只比显式 Euler 的 0.04 宽四成。高阶提高了精度，稳定界的量级不变：**刚性面前，阶数不是护身符，换隐式才是**。

</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**：你以为数值爆炸是"步长大所以不准"的精度问题。机理是放大系数 $\lvert1+h\lambda\rvert>1$：误差每步被乘大——这是稳定性问题，与精度无关；哪怕快模态早已只剩零头，零头也会被乘成天文数字。

**误区二**：你以为稳定就等于精确。h=0.04 的显式解有界，但峰值 2.0 对真解约 1.0，幅度全错；隐式大步长同样稳而不准。稳定是入场券，精度要另买。

**误区三**：你以为隐式法是免费午餐。它每步要多解一个方程（线性方程一行代数，非线性方程要请迭代法），还会把慢动作磨钝一点；工程上更进一步的招法是自适应步长与 BDF 一族的刚性专用算法。

::::

## 8. 快问快答

```quiz
显式 Euler 解 y' = -50(y - cos t) 时，步长满足什么条件才稳定？
- h < 0.04 [*]
- h < 0.5
- 任何步长都稳定
? 放大系数是 1-50h，|1-50h|<1 等价于 0<h<0.04（即 2/50）。越线后快模态每步被放大，解爆炸。
```

## 9. 选读：精确解从哪来，隐式为何永远稳

<details>
<summary>选读 · 两个系数的来历与无条件稳定</summary>

稳态试探 $y_p=a\cos t+b\sin t$，代入 $y'+50y=50\cos t$ 后比照两端系数，得 $50a+b=50$、$50b-a=0$，解出 $a=\dfrac{2500}{2501}$、$b=\dfrac{50}{2501}$；瞬态部分 $Ce^{-50t}$ 由初值定出 $C=-a$。稳态幅度 $\sqrt{a^2+b^2}\approx1.0$。隐式的无条件稳定一行看完：把 $y_{n+1}=y_n-50h(y_{n+1}-\cos t_{n+1})$ 移项，瞬态放大系数是 $\dfrac{1}{1+50h}$，任何 $h>0$ 都小于 1——快钟被"除"而不是被"乘"，永远翻不了身。代价也已看到：$h=0.1$ 时稳态幅度约 $0.999$、只瘪约 $0.1\%$，相位略滞后。

</details>

## 10. 下一站

数值方法这把刀磨完了。下一课换一条思路：不再逐帧追踪受力，而是从能量出发，让方程自己长出来。

→ [从牛顿到拉格朗日](./65-newton-to-lagrange.md)
