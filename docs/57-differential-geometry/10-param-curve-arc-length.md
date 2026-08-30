---
title: 参数曲线：速度与弧长
lesson_id: differential-geometry/param-curve-arc-length
prereqs:
  - calculus/chain
  - integrals/ftc
  - linalg/vectors
  - trig/radian
volume: 5
layer: L8
track:
  - geometry-space
  - analysis-change
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - parametric-curve
  - velocity-vector
  - speed
  - arc-length
applications:
  - flight-paths
  - computer-animation
exits:
  - differential-geometry/surface-tangent-space
---

# 参数曲线：速度与弧长

## 1. 从一个场景开始

过山车轨道有一段是竖直回环：小车从底部冲上去，翻个圈再下来。想用函数 $y=f(x)$ 描述这条轨道，立刻卡壳——**同一个 $x$ 对应上下两个 $y$**，函数规则直接违约。

问题不在轨道，在描述方式。数学家的解法干脆利落：不再问"$y$ 是 $x$ 的什么"，而是引入一个**参数**（比如时间 $t$），让横纵坐标各自跟着 $t$ 走。这一招解锁了圆、螺旋线、心形线乃至曲面上的一切路径——微分几何的大门就从这里推开。

## 2. 直觉解释

把参数曲线想成一段**电影胶片**：

- 每个时刻 $t$ 对应一帧画面，画面里质点站在位置 $\vec r(t)$；
- 从第 $t$ 帧到第 $t+\Delta t$ 帧，质点挪了一小步 $\vec r(t+\Delta t)-\vec r(t)$；
- 把这一步除以经过的时间，就是这附近的"平均挪动"；$\Delta t$ 压到零，得到**瞬时速度向量**。

速度向量自带两份信息：**指向哪**（切线路径方向）和**多快**（它的长度，叫速率）。一元微积分里导数是一个数，这里的导数是一个箭头——微分几何的第一口气，就是把"变化率"从数升级成向量。

## 3. 正式定义

**参数曲线**：映射 $\vec r(t) = \bigl(x(t),\ y(t)\bigr)$，其中 $x(t),y(t)$ 是可微函数，$t$ 在区间内取值。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\vec r(t)$ | 位置向量 | 时刻 t 质点在哪 |
| $\vec r\,'(t)=\bigl(x'(t),\,y'(t)\bigr)$ | 速度向量 | 每个分量分别求导 |
| $\|\vec r\,'(t)\|$ | 速率 | 速度向量的长度：多快（不含方向） |
| $s$ | 弧长 | 沿曲线走过的总路程 |

**速率**与**弧长**的定义式（显示公式各一行）：

$$\text{速率} = \left\| \vec r\,'(t) \right\| = \sqrt{x'(t)^2 + y'(t)^2}$$

$$s = \int_a^b \left\| \vec r\,'(t) \right\| \, dt$$

直觉核对：一小段时间 $dt$ 里走过的路长约 $\|\vec r\,\'\|dt$（速率乘时间，和匀速运动 $路程=速度\times时间$ 同款），把这些小段全加起来就是积分。曲线若是 $y=f(x)$ 的图像（取 $t=x$），公式恰好塌缩成你在积分课见过的 $\int \sqrt{1+f'(x)^2}\,dx$——老朋友换了一身新衣裳。

## 4. 分步例题

**例 1**：单位圆 $\vec r(t) = (\cos t,\ \sin t)$，$t$ 从 $0$ 走到 $2\pi$。

1. 求速度向量：两个分量分别求导，$\vec r\,'(t) = (-\sin t,\ \cos t)$；
2. 求速率：$\sqrt{\sin^2 t + \cos^2 t} = 1$，恒等于 1（匀速走圆）；
3. 积分：$s = \int_0^{2\pi} 1\,dt = 2\pi$——圆周长就这么掉出来了。

**例 2**：抛物线弧 $\vec r(x) = (x,\ x^2)$，$x$ 从 0 到 1。

1. 速度向量 $(1,\ 2x)$；速率 $\sqrt{1+4x^2}$；
2. 这个速率随 $x$ 增大而增大（抛物线越往上越陡）；
3. $\int_0^1 \sqrt{1+4x^2}\,dx$ 没有初等好算的答案——别慌，下面用机器一寸寸量出来，约等于 **1.479**。

## 5. 动手实验

### 实验 1：看住"被积函数"

被积的量是速率 $\sqrt{1+4x^2}$。拖动没有滑块也没关系——先把这条曲线的形状看进眼里：起点不低、越往右越高。

```viz
{
  "type": "plot",
  "title": "抛物线的速率 sqrt(1+4x^2)：曲线下的面积就是弧长",
  "expr": "sqrt(1 + 4*x*x)",
  "xmin": 0,
  "xmax": 1
}
```

### 实验 2：把单位圆切成小弦

```python title="用 200 段小弦逼近圆周长"
import math
import matplotlib.pyplot as plt

n = 200                       # 切成多少段小弦
xs = []
ys = []
arc = 0.0                     # 弧长累加器
px, py = 1.0, 0.0             # 上一个采样点，从 t=0 出发
for i in range(n + 1):
    t = 2 * math.pi * i / n   # 参数 t 均匀扫过 [0, 2π]
    cx = math.cos(t)
    cy = math.sin(t)
    xs.append(cx)
    ys.append(cy)
    if i > 0:
        seg = math.sqrt((cx - px) ** 2 + (cy - py) ** 2)   # 相邻两点的小弦长（勾股定理）
        arc = arc + seg
    px, py = cx, cy

plt.plot(xs, ys)
plt.axis("equal")             # 首现参数：让横纵轴比例一致，圆才不被压扁
print("小弦总长", round(arc, 4))
print("真实周长", round(2 * math.pi, 4))
```

200 段小弦的总长与 $2\pi$ 只差在小数点后第四位。切的段数越多，弦长之和越贴近真弧长——这正是弧长积分的定义过程。

### 实验 3：滑块实验——陡峭程度如何拉长曲线

```python title="滑块实验：曲线 (t, a·sin t) 的形状与速率"
# sliders: a=1.5 [-2:2:0.1]
import math
import matplotlib.pyplot as plt

n = 300
xs, ys, speeds = [], [], []
arc = 0.0
px, py = 0.0, 0.0
for i in range(n + 1):
    t = 6 * i / n
    cx = t
    cy = a * math.sin(t)
    xs.append(cx)
    ys.append(cy)
    speeds.append(math.sqrt(1 + (a * math.cos(t)) ** 2))   # 速率 = sqrt(1 + y'^2)
    if i > 0:
        arc = arc + math.sqrt((cx - px) ** 2 + (cy - py) ** 2)
    px, py = cx, cy

fig, axes = plt.subplots(2, 1, figsize=(6, 4))   # 两张子图：上面画曲线，下面画速率
axes[0].plot(xs, ys)
axes[0].set_title(f"(t, {a}·sin t)，数值弧长 ≈ {round(arc, 3)}")
axes[1].plot(xs, speeds)
axes[1].set_title("速率随 t 变化")
plt.tight_layout()
```

拖动滑块把 `a` 调大：上图波浪变陡，下图的速率峰随之拔高，弧长读数一路上涨——**弯曲本身就在制造长度**。

### 快问快答

```quiz
同一条曲线用两种不同的快慢走完，哪个量保证不变？
- 每一时刻的速度向量
- 走完全程的总弧长 [*]
- 中间某一时刻的速率
? 参数化像"开车风格"：开得急慢只改变每刻的速度向量与速率；总路程由曲线本身决定，换参数化不动它。
```

:::warning[常见误区]

**误区一**："速度和速率是一回事。" 速度是向量（有方向），速率是它的长度（纯数字）。匀速圆周运动的速率恒为 1，但速度向量每一秒都在转向。

**误区二**："求弧长就是把 $dx$ 加起来。" 水平投影加起来永远是区间长度（实验里那样只能得 1）；真正要加的是**小弦长** $\sqrt{dx^2+dy^2}$，斜着的路比水平影子长。

**误区三**："走得快的参数化算出的弧长更长。" 弧长对参数化不敏感：把 $t$ 换成 $2t$ 只是快进播放，速率翻倍但时间减半，总账不变（选读给出一行证明）。

:::

## 6. 练习

**练习 1**：下面的程序想把抛物线 $y=x^2$ 在 $[0,1]$ 上的弧长一寸寸量出来，但它加错了东西。修好它：

```exercise
# @title: 练习：用小弦长量抛物线弧长
# @check: 1.479
# @hint: 每段该加的是"小弦长"：math.sqrt(dx*dx + dy*dy)，不是水平步长 dx。
import math

n = 1000
a, b = 0.0, 1.0
dx = (b - a) / n
total = 0.0
for i in range(n):
    x0 = a + i * dx
    x1 = x0 + dx
    dy = (x1 * x1) - (x0 * x0)
    total = total + dx          # ← 问题在这：加的是水平步长，不是斜着的小弦
print(round(total, 3))
```

**练习 2**：直线段 $\vec r(t)=(t,\ 2t)$，$t\in[0,1]$。先用本课公式手算它的弧长，再用"两点间距离"直接验证。

<details>
<summary>点开查看逐步解答</summary>

速度向量 $(1, 2)$，速率 $\sqrt{1+4}=\sqrt{5}$，弧长 $=\int_0^1 \sqrt5\,dt=\sqrt5\approx2.236$。

直接验证：起点 $(0,0)$、终点 $(1,2)$，距离 $\sqrt{1^2+2^2}=\sqrt5$ ✓。直线段的两种算法必须一致——这是弧长公式的最低要求。
</details>

## 7. 选读：为什么弧长不怕换参数

<details>
<summary>选读 · 重参数化不变性的一行证明</summary>

设新参数 $u$ 与旧参数 $t$ 满足 $t=t(u)$（单调即可）。链式法则给出新速度向量 $\dfrac{d\vec r}{du}=\dfrac{d\vec r}{dt}\cdot\dfrac{dt}{du}$，于是新速率 $=\|$旧速率$\|\cdot\bigl|\tfrac{dt}{du}\bigr|$。对新参数积分并换元 $t=t(u)$：

$$\int_{u_0}^{u_1} \left\| \vec r\,'(t(u)) \right\| \left| \frac{dt}{du} \right| du = \int_{t_0}^{t_1} \left\| \vec r\,'(t) \right\| dt$$

右边正是原参数下的弧长。绝对值保证倒着走（$dt/du<0$）也只是换个方向数同一长度。**弧长属于曲线，不属于走法**——这个不变性是下一课"切空间"能安全讨论"方向"的前提。

</details>

## 8. 下一站

现在我们会在平面上沿一条弯路走了。可如果脚下的世界本身就是弯的——比如一只蚂蚁生活在篮球表面——它的"直走"和"速度"该怎么定义？下一课给曲面上的每个点配一个"平面替身"：切空间。

→ [曲面参数化与切空间](./20-surface-tangent-space.md)
