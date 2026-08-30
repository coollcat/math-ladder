---
title: 激波：特征线相交之后
lesson_id: pde/nonlinear-shocks
prereqs:
  - pde/convective-characteristics
  - pde/flux-conservation
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
  - nonlinear-transport
  - shock-formation
applications:
  - traffic-flow
  - wave-breaking
exits:
  - engineering
---

# 激波：特征线相交之后

## 1. 从一个场景开始

海边的浪在深水区只是平滑地起伏，一到浅滩却越跑越陡、忽然立起、卷翻、拍碎。上一课的河水只会把峰原封不动搬走，为什么真实的浪会"追尾"自己？差别只有一处：河水的流速是常数 $c$，而浪的每个点跑多快，由它自己的高度说了算。

## 2. 直觉解释

把特征线的规则改一个字：原来"每点以速度 $c$ 被搬运"，现在"每点以速度 $u$ 被搬运"——$u$ 既是被搬的量，又是搬运的速度。谁高谁跑得快。

于是剖面下降的坡（左边高、右边低）要遭殃：后面跑得快，前面跑得慢，坡被不断压薄、变陡，最后立成峭壁。在时空图上，这正是特征线互相穿过：同一个位置同时来了几个"来客"，解这个单值函数就当不下去了。这一刻叫翻卷，翻卷之后接管的形态就是激波。

守恒律在这里也换了性格：通量从 $cu$ 变成 $u^2/2$——通量自己依赖 $u$，方程成了非线性的。叠加原理随之作废：两列波相加不再是解。

## 3. 正式定义

非线性输运方程（无粘 Burgers 方程）是：

$$u_t + u\,u_x = 0.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $u$ | 被输运的量 | 同时是自己的搬运速度 |
| $u_t$ | 固定地点的时间变化率 | 站着不动的观察者看到的浓度变化 |
| $u_x$ | 固定时刻的空间变化率 | 同一时刻沿轴的坡度 |

它也是上一卷守恒律 $u_t + F(u)_x = 0$ 取通量 $F(u)=\frac{u^2}{2}$ 的特例（因为 $F'(u)\,u_x = u\,u_x$）。

它的解只能**隐式**地写：

$$u(x,t) = f(x - u\,t).$$

其中 $f$ 仍是初始剖面，但 $u$ 出现在等号两侧：想知道 $u$，得先解出 $u$。特征线从出发点 $s$ 走出的路径是

$$x = s + f(s)\,t,$$

沿线取值恒为 $f(s)$——搬运的故事原样保留，只是各条线的斜率不再相同。

## 4. 分步例题

**例 1**：线性斜坡初值 $f(s)=1-s$（左高右低，后面处处比前面快）。

1. 特征线：$x = s + (1-s)t = t + s(1-t)$，解出 $s = \dfrac{x-t}{1-t}$；
2. 代回：$u = 1 - s = \dfrac{1-x}{1-t}$——斜坡情形能把隐式解完全解出来；
3. 剖面斜率为 $-\dfrac{1}{1-t}$：$t=0$ 时是 $-1$，$t=0.5$ 时 $-2$，$t=0.9$ 时 $-10$，越来越陡；
4. 追及账：从 $s=0$（速度 1）与 $s=0.5$（速度 0.5）出发的两团，间距依次 $0.5 \to 0.25 \to 0$；
5. $t=1$ 时斜率冲向无穷大，全部特征线同时挤到一点——斜坡立成峭壁，经典解到此为止。

**例 2**：隐函数验证——证明 $u=f(x-ut)$ 真实满足方程。

1. 令 $w = x - u t$，则 $u = f(w)$；
2. 对 $x$ 求偏导：$u_x = f'(w)(1 - t\,u_x)$，解出 $u_x = \dfrac{f'(w)}{1 + t\,f'(w)}$；
3. 对 $t$ 求偏导：$u_t = f'(w)(-u - t\,u_t)$，解出 $u_t = \dfrac{-u\,f'(w)}{1 + t\,f'(w)}$；
4. 相加：$u_t + u\,u_x = 0$，方程满足；分母 $1 + t\,f'(w)$ 就是变陡的计时器。

对比上一课：那里的解 $f(x-ct)$ 直接可写、永不变形；这里 $u$ 藏在等号两侧，分母一旦归零，导数爆炸，变形夺走一切。

## 5. 动手实验

### 实验 1：看斜坡被压成立峭壁

```viz
{
  "type": "plot",
  "title": "斜坡初值的剖面 u=(1-x)/(1-t)，滑块 t 当时间",
  "expr": "(1-x)/(1-t)",
  "expr2": "1-x",
  "xmin": -1, "xmax": 3,
  "sliders": [
    { "name": "t", "min": 0, "max": 0.9, "step": 0.01, "value": 0.5 }
  ]
}
```

蓝色是当前剖面，橙色虚线是初始斜坡。拖动 $t$：蓝线越转越陡——例 1 的公式在动。线性初值有个特殊癖好：所有特征线约好同一时刻 $t^\ast=1$ 一起相撞。

### 实验 2：特征线地图的折返

```viz
{
  "type": "plot",
  "title": "正弦初值的特征线映射 x = s + sin(s)*t",
  "expr": "x + sin(x)*t",
  "expr2": "x",
  "xmin": -4, "xmax": 4,
  "sliders": [
    { "name": "t", "min": 0, "max": 1.5, "step": 0.01, "value": 0.8 }
  ]
}
```

这张图横轴是出发点 $s$，纵轴是它在时刻 $t$ 的位置（橙色虚线是参照线 $y=x$）。$t<1$ 时曲线始终上行：每处只来一个客人，剖面还是单值函数。把 $t$ 拖过 $1$：曲线折出回头弯，三个出发点抢同一个位置——剖面翻卷，激波登场。折返的临界时刻恰好是 $t^\ast = 1$。

### 实验 3：解出隐式方程，验算方程

```python title="不动点迭代解 u = sin(x - u t)，再验残差"
import math

def solve_u(xx, tt):          # def 定义函数：解隐式方程 u = sin(xx - u*tt)
    u = 0.0
    for i in range(80):       # for 循环 80 次：反复把右端算出的新值存回 u
        u = math.sin(xx - u * tt)
    return u

t = 0.5         # 时刻
x = 1.0         # 位置
h = 0.0001      # 差分步长

u_mid = solve_u(x, t)
u_t = (solve_u(x, t + h) - solve_u(x, t - h)) / (2 * h)   # 中心差分近似 u_t
u_x = (solve_u(x + h, t) - solve_u(x - h, t)) / (2 * h)   # 中心差分近似 u_x
print(round(u_mid, 3))
print(round(u_t, 3))
print(round(u_x, 3))
print(round(u_t + u_mid * u_x, 4) + 0.0)   # 残差 u_t + u*u_x，应为 0
```

输出 `0.632`、`-0.353`、`0.559`、`0.0`。隐式方程不会自己吐出公式，但数值上 $u_t + u\,u_x = 0$ 严丝合缝——例 2 的代数在数字里兑现。

### 实验 4：把翻卷时刻量出来

```python title="扫描网格实测 t* = -1/min f'(s)"
import math

best = 100.0                    # 擂台：先放一个巨大的"最陡时刻"
s_best = 0.0
n = 2000                        # 把 [-π, π] 切成 2000 份
for i in range(n + 1):
    s = -math.pi + 2 * math.pi * i / n
    slope = math.cos(s)         # f'(s)=cos(s)：f(s)=sin(s) 的坡度
    if slope < 0:               # 只看在收缩的坡（后面比前面快）
        t_here = -1.0 / slope   # 这一段的翻卷候选时刻
        if t_here < best:       # 更早翻卷就换擂主
            best = t_here
            s_best = s
print(round(best, 3))
print(round(s_best, 3))
```

输出 `1.0` 和 `-3.142`：最陡的坡在 $s=\pm\pi$ 附近（那里 $f'=-1$），所以 $t^\ast = -1/(-1) = 1$——与实验 2 图上折返的时刻一致。

## 6. 练习

```exercise
# @title: 练习：修好非线性搬运的账本
# @check: 0.141
# @check: 3.071
# @check: 0.141
# @check: 1.0
# @hint: 一团流体带着出发时的速度上路：x = s0 + f(s0)*t；速度沿途不变，仍是 f(s0)；翻卷时刻 t* = -1/min f'，而 f'(s)=cos(s) 的最小值是 -1。
import math
s0 = 3.0        # 某团流体的出发位置
t = 0.5         # 经历的时间

speed0 = math.sin(s0)     # 出发点携带的速度（初值 f(s)=sin(s)）
print(round(speed0, 3))

x_now = s0 - speed0 * t   # ← 有错一：这团流体按 x = s0 + f(s0)*t 前进
print(round(x_now, 3))

u_now = math.sin(x_now)   # ← 有错二：非线性输运里速度不变，它仍是 speed0
print(round(u_now, 3))

min_slope = -1.0          # f'(s)=cos(s) 的最小值
t_star = 1 / min_slope    # ← 有错三：翻卷时刻 t* = -1/min f'，别丢了负号
print(round(t_star, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正后的账本：

```python
import math
s0 = 3.0
t = 0.5

speed0 = math.sin(s0)
print(round(speed0, 3))     # 0.141

x_now = s0 + speed0 * t
print(round(x_now, 3))      # 3.071

u_now = speed0
print(round(u_now, 3))      # 0.141

min_slope = -1.0
t_star = -1 / min_slope
print(round(t_star, 3))     # 1.0
```

```text
speed0 = sin(3) = 0.141
x_now = 3 + 0.141*0.5 = 3.071
u_now = 0.141：沿特征线照样保值
t* = -1/(-1) = 1.0
```

第一行与第三行相等正是本课主旨：每个质点携带自己的速度值一路不变；变的只是地图上谁追上了谁。

</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**：你以为把 $c$ 换成 $u$ 只是小改动。特征线从平行变成互相追赶，叠加原理作废，解可能只在有限时间内存在——非线性是质的跨越。

**误区二**：你以为 $t > t^\ast$ 之后解"消失"了。物理量还在：真实流体靠粘性把峭壁抹成薄陡层（激波），数学则换用弱解语言接管——那是后续课程的深水区。

**误区三**：你以为变陡是数值误差假象。$t^\ast = -1/\min f'$ 由方程自己决定，网格再细、步长再小，翻卷时刻分毫不让。

::::

## 8. 快问快答

```quiz
非线性输运 u_t + u*u_x = 0 里，特征线的前进速度是多少？
- 固定的常数 c
- 各点的 u 值本身 [*]
- 永远等于 1
? 上一课全河一个速度；这里谁高谁快，高的地方特征线冲在最前。
```

```quiz
初始剖面 f 处处递增（f' 恒为正）时，翻卷时刻 t* = -1/min f' 会怎样？
- 恰好等于 1
- 算出负数：正时间内特征线永远不相交 [*]
- 立刻翻卷
? 后面处处比前面慢，剖面只会越摊越平：收缩坡不存在，经典解永不翻卷。
```

## 9. 选读：翻卷时刻为什么是 -1/min f'

<details>
<summary>选读 · 坡度公式的分母爆炸</summary>

特征线映射 $x = s + f(s)t$ 把出发位置与当前位置一一点名。固定时刻 $t$，相邻两个出发点的间距是

$$\frac{\partial x}{\partial s} = 1 + f'(s)\,t.$$

只要它处处为正，映射一一对应，剖面仍是单值函数。例 2 的坡度公式里，同一个分母再次现身：

$$u_x = \frac{f'(s)}{1 + f'(s)\,t}.$$

收缩最猛的坡（$f'$ 最负）最先让分母归零，于是翻卷时刻

$$t^\ast = -\frac{1}{\min_s f'(s)}.$$

$f(s)=\sin s$ 的 $\min f'=-1$ 给出 $t^\ast=1$；斜坡 $f'\equiv -1$ 同样 $t^\ast=1$。初始剖面越"悬"，翻卷越早；没有收缩段（$\min f' \ge 0$）就永不翻卷。

</details>

## 10. 下一站

激波之后，非线性输运还要走很远（间断解、熵条件，留待后续）。现在折回另一条主线：弦被拨动后为什么会歌唱？下一课把弦切成小段问牛顿定律，推出波动方程。

→ [波动方程：弦的横振动](./70-wave-equation.md)
