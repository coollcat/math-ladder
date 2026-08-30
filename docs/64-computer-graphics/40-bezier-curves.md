---
title: Bezier 曲线与 de Casteljau 套娃
lesson_id: graphics/bezier-curves
prereqs:
  - graphics/rasterization-barycentric
volume: 5
layer: L7
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - bezier-curve
  - linear-interpolation
applications:
  - font-outline
  - vector-graphics
exits:
  - graphics/phong-lighting
---

# Bezier 曲线与 de Casteljau 套娃

## 1. 从一个场景开始

在 PS 里用钢笔工具画一条优雅的曲线：你只拖了几个控制点，曲线就温柔地跟着走——拉一下"手柄"，弧度立刻变化，却永远不会失控飞走。

汽车车顶、手机字体、赛车游戏的赛道中心线，背后是同一位数学家：法国雷诺工程师 Pierre Bézier（以及独立发现的 de Casteljau）。他们要回答的问题一模一样：**怎么用寥寥几个点，让计算机生成一条光滑可控的曲线？**

## 2. 直觉解释

答案只有一个动作：**线性插值**（lerp）。

$$\text{lerp}(P_0, P_1, t) = (1-t)\,P_0 + t\,P_1$$

t=0 时站在 $P_0$，t=1 时走到 $P_1$，中间按比例混合——"从 A 走到 B 走了七成"就是它。

神奇的事发生在套娃时。以三个控制点为例：

1. 第一层：在线段 $P_0P_1$ 上取比例 t 的点，同时在 $P_1P_2$ 上也取比例 t 的点；
2. 第二层：把这两个新点连起来，再取比例 t 的点；
3. 让 t 从 0 连续滑到 1，第二层那个点的轨迹就是**二次 Bezier 曲线**。

没有公式背诵，没有微积分——只有"取点、连线、再取点"的幼儿园操作无限重复。控制点像提线木偶的线：拽动任何一个，整条曲线平滑跟随；曲线永远不出控制点围成的凸包，**可控性是白送的**。

## 3. 正式定义

对控制点列 $P_0, P_1, \dots, P_n$，n 次 Bezier 曲线定义为

$$B(t) = \sum_{k=0}^{n} \binom{n}{k}(1-t)^{n-k}\, t^k\, P_k, \qquad t \in [0,1]$$

常用低阶展开（必须背下来的两行）：

$$B_2(t) = (1-t)^2 P_0 + 2(1-t)t\, P_1 + t^2 P_2$$

$$B_3(t) = (1-t)^3 P_0 + 3(1-t)^2 t\, P_1 + 3(1-t)t^2\, P_2 + t^3 P_3$$

| 性质 | 内容 | 工程含义 |
| --- | --- | --- |
| 端点插值 | $B(0)=P_0,\ B(1)=P_n$ | 曲线段可以无缝拼接 |
| 凸包性 | 曲线不越出控制点多边形 | 碰撞检测可先查凸包 |
| 对称性 | 控制点倒序 → 曲线不变 | 方向无关 |
| 变差缩减 | 曲线比折线更"平顺" | 光滑性的直观保证 |

系数 $1, 3, 3, 1$ 与 $1, 2, 1$ 正是杨辉三角的第 n 行——概率论的二项式系数在这里客串几何角色。

## 4. 分步例题

**例**：二次 Bezier，$P_0=(0,0), P_1=(2,4), P_2=(4,0)$。求 $t=\frac12$ 的点。

1. 写权重：$(1-t)^2=\frac14$，$2(1-t)t=\frac12$，$t^2=\frac14$；
2. 配方 x 坐标：$\frac14\times0+\frac12\times2+\frac14\times4=0+1+1=2$；
3. 配方 y 坐标：$\frac14\times0+\frac12\times4+\frac14\times0=2$；
4. 结论：$B(\frac12)=(2,2)$——恰是中段最高处的对称点。

检查量级：起点 $(0,0)$、终点 $(4,0)$、被中段控制点向上提，曲线呈拱形且峰值在正中，$(2,2)$ 完全符合直觉。

## 5. 动手实验

### 实验 1（python）：de Casteljau 套娃动画机

```python title="三次 Bezier：套娃算法全流程（手写循环）"
import math
import matplotlib.pyplot as plt

# sliders: t=0.25 [0:1:0.02]

pts = [[0, 0], [1, 3], [4, 3], [5, 0]]      # 四个控制点：三次曲线
t_now = t

# 先画控制多边形（虚线）
cx = []
cy = []
for p in pts + [pts[0]]:
    cx.append(p[0])
    cy.append(p[1])
plt.plot(cx, cy, linestyle="--", color="gray", label="control polygon")

# 再采样整条曲线
curve_x = []
curve_y = []
for s in range(101):
    tt = s / 100
    cur = []                                # 第 0 层：复制控制点
    for p in pts:
        cur.append([p[0], p[1]])
    while len(cur) > 1:                     # 套娃：每层少一个点
        nxt = []
        for k in range(len(cur) - 1):
            ax = (1 - tt) * cur[k][0] + tt * cur[k + 1][0]   # lerp 的 x 分量
            ay = (1 - tt) * cur[k][1] + tt * cur[k + 1][1]
            nxt.append([ax, ay])
        cur = nxt
    curve_x.append(cur[0][0])
    curve_y.append(cur[0][1])
plt.plot(curve_x, curve_y, label="bezier")

# 最后画 t 时刻的"当前层"：看得到每一步插值
cur = []
for p in pts:
    cur.append([p[0], p[1]])
level = 0
while len(cur) > 1:
    lx = []
    ly = []
    for k in range(len(cur)):
        lx.append(cur[k][0])
        ly.append(cur[k][1])
    plt.plot(lx, ly, marker="o", label=f"layer {level}")
    nxt = []
    for k in range(len(cur) - 1):
        ax = (1 - t_now) * cur[k][0] + t_now * cur[k + 1][0]
        ay = (1 - t_now) * cur[k][1] + t_now * cur[k + 1][1]
        nxt.append([ax, ay])
    cur = nxt
    level += 1
plt.scatter([cur[0][0]], [cur[0][1]], color="tomato", zorder=3)
plt.title(f"de Casteljau at t={round(t_now, 2)}")
plt.legend(fontsize=8)
plt.axis("equal")                    # equal：两轴等比例，曲线形状不变形
plt.grid(True)
```

怎么玩：拖动滑块 t，红点沿曲线滑动，同时每一层的插值折线实时重排——三层灰线收缩成一点的过程就是 de Casteljau 全貌。t=0 与 t=1 时红点钉在首尾控制点上，亲眼验证端点插值。

### 实验 2（python）：拽动控制点，曲线如何跟随

```python title="控制点 y 坐标滑杆与曲线联动"
import math
import matplotlib.pyplot as plt

# sliders: py1=3 [-2:6:0.5]

P0 = [0, 0]
P1 = [1.5, py1]          # 只有中段控制点听滑杆指挥
P2 = [3, 0]

xs = []
ys = []
for s in range(81):
    tt = s / 80
    x = (1 - tt) ** 2 * P0[0] + 2 * (1 - tt) * tt * P1[0] + tt ** 2 * P2[0]
    y = (1 - tt) ** 2 * P0[1] + 2 * (1 - tt) * tt * P1[1] + tt ** 2 * P2[1]
    xs.append(x)
    ys.append(y)

peak = round(max(ys), 2)                 # 曲线最高点
plt.plot(xs, ys)
plt.scatter([P0[0], P1[0], P2[0]], [P0[1], P1[1], P2[1]])
print(f"P1.y={py1} -> curve peak={peak}")
```

怎么玩：把 py1 从 −2 拧到 6——曲线从下弯翻成上拱，但**起点、终点纹丝不动**。注意峰值永远到不了 py1 本身的高度：中间控制点只贡献一半权重（$2(1-t)t$ 最大值恰为 0.5），这是"提线但不越界"的定量版本。

### 快问快答

```quiz
Bezier 曲线会经过哪些控制点？
- 所有控制点
- 只有第一个和最后一个 [*]
- 一个都不经过
? 端点权重 (1-t)^n 与 t^n 在 t=0、1 时独占 1，其他项归零；中间控制点的权重在两端都是 0。所以曲线"出发于 P0、抵达于 Pn"，中途只被其余点牵引而不触碰。
```

:::warning[常见误区]

**误区一**："你以为控制点是曲线必须穿过的锚点。" 中间控制点只是"磁铁"不是"轨道钉"。想让曲线过某点，要么把它设为端点，要么用分段 Bezier 拼接并保证接缝处切向连续。

**误区二**："你以为控制点越多曲线越精细。" 高次 Bezier 数值不稳、局部牵一发动全身；工程实践全部使用低阶（二、三次）分段拼接——字体轮廓就是几千段三次曲线的接力。

**误区三**："你以为参数 t 是弧长的比例。" t 是插值比例不是里程表：t=0.5 对应的点未必把曲线分成等长两半。需要匀速运动时得另做弧长参数化（游戏里叫恒速跟随）。

:::

## 6. 练习

**练习 1**：三次 Bezier 控制点 x 坐标为 $0, 1, 2, 9$，求 $B(\frac12)$ 的 x 坐标。代码能跑但权重配错了：

```exercise
# @title: 练习：三次曲线的中点值
# @check: 2.25
# @hint: 三次权重是 (1/8, 3/8, 3/8, 1/8)，来自 (a+b)^3 展开——检查现在是不是四等分了
p0 = 0.0
p1 = 1.0
p2 = 2.0
p3 = 9.0

value = 0.25 * p0 + 0.25 * p1 + 0.25 * p2 + 0.25 * p3   # ← 问题在这：这是四等分平均
print(value)
```

改对后输出 2.25：$\frac18\times0+\frac38\times1+\frac38\times2+\frac18\times9=\frac{18}{8}=2.25$。四等分错误版本给出 3.0——权重差之毫厘，结果谬以千里。

**练习 2**：二次曲线 $P_0=(0,0), P_1=(2,4), P_2=(4,0)$ 在 $t=0.25$ 处的点坐标是多少？先按权重 $(0.5625,\ 0.375,\ 0.0625)$ 手算，再用代码验证。

<details>
<summary>点开查看逐步解答</summary>

x 坐标：$0.5625\times0+0.375\times2+0.0625\times4=0.75+0.25=1.0$；
y 坐标：$0.5625\times0+0.375\times4+0.0625\times0=1.5$。

```python
t = 0.25
x = (1 - t) ** 2 * 0 + 2 * (1 - t) * t * 2 + t ** 2 * 4
y = (1 - t) ** 2 * 0 + 2 * (1 - t) * t * 4 + t ** 2 * 0
print(round(x, 3), round(y, 3))
```

输出 1.0 和 1.5。早期 t 偏向 $P_0$ 一侧，点还在左坡上爬。
</details>

**练习 3**：两段三次 Bezier 拼接处要"光滑"，需要对什么量提出条件？

<details>
<summary>点开查看逐步解答</summary>

光滑 = 切线方向连续：前一段终点处的切向由（$P_3 - P_2$）决定，后一段起点切向由（$P_1' - P_0'$）决定。要求两个向量**共线且同向**（工程上常取等长，即 C1 连续）。字体与动画路径都靠这条规则让千万段小曲线看起来浑然一体。
</details>

## 7. 边界与适用条件

- Bezier 是**多项式参数曲线**：表达圆弧只能近似（常用 4 段三次拼整圆，误差 < 万分之一）；精确圆锥曲线请找有理Bezier（NURBS 家族）。
- 次数等于控制点数减一；升阶可增自由度但降低稳定性，降阶需误差控制。
- 本课公式基于均匀参数化；若控制点疏密悬殊，曲线速度会明显不均，交互编辑时需重参数化。

## 8. 选读：Bernstein 多项式的概率马甲

<details>
<summary>选读 · 杨辉三角为什么出现在曲线上</summary>

把 $B(t)$ 的系数 $\binom{n}{k}(1-t)^{n-k}t^k$ 单独看——这正是二项分布 $B(n,t)$ 的概率质量函数！于是 Bezier 曲线获得一个惊人读法：

$$B(t) = \mathbb{E}[\text{随机选中的那个控制点}]$$

想象扔 n 枚硬币、正面概率为 t，然后把"第 k 枚全正面"对应控制点 $P_k$ 取出来平均——期望恰好落在曲线上。凸包性由此秒证：期望永远落在样本的凸包内。杨辉三角、抛硬币、钢笔工具，三者在此合流——数学结构最迷人的时刻莫过于此。

</details>

## 9. 下一站

几何已经就位，画面却还是死板的纯色。最后一课回答"这块像素该多亮、高光落在哪里"——Phong 光照模型，用两次点积给场景注入光影生命。

→ [Phong 光照直觉](./50-phong-lighting.md)
