---
title: 从随机游走缩放出布朗运动
lesson_id: stochastic-analysis/random-walk-scaling
prereqs:
  - stochastic-processes/brownian-motion
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - donsker-scaling-limit
  - diffusive-speed-calibration
applications:
  - monte-carlo-path-engine
exits:
  - stochastic-analysis
---

# 从随机游走缩放出布朗运动

## 1. 从一个场景开始

打开行情软件看一只活跃股票：秒线毛糙，切成分钟线还是那么毛糙，切到日线竟认不出彼此有什么区别。上一门课你已经背下了布朗运动的三条公理；这一章开学第一课要亲自动手把它**制造**出来——原料只需要一枚硬币，外加两根可调的旋钮：时间刻度 $\Delta t$ 和步长 $\varepsilon$。你会看到，配速拧错一档，粒子不是冻死就是沸腾；只有唯一一档配速，能让离散的脚步凝聚成那条连续弥漫的曲线。

## 2. 直觉解释

**核心直觉：总方差是"步数 × 单步方差"，两根旋钮必须互相咬合。**

设每过 $\Delta t$ 秒挪一步，步长以等概率取 $+\varepsilon$ 或 $-\varepsilon$。走到时刻 $t$ 共挪了

$$n=\frac{t}{\Delta t}$$

步。各步独立且均值为零，于是**方差相加**（第 03 章的老规矩）：

$$\text{末位置方差}=n\varepsilon^2=\frac{t}{\Delta t}\cdot\varepsilon^2 = t\cdot\frac{\varepsilon^2}{\Delta t}.$$

盯着因子 $\varepsilon^2/\Delta t$ 看，它是一台配速表：

| 配速选择 | 方差的归宿 | 局面 |
| --- | --- | --- |
| $\varepsilon=\Delta t$ | $t\cdot\Delta t\to 0$ | 冻结：粒子原地抖动然后消失 |
| $\varepsilon=\sqrt{\Delta t}$ | $t$（不多不少） | 临界：凝聚出非平凡的连续曲线 |
| $\varepsilon=\Delta t^{0.25}$ | $t/\sqrt{\Delta t}\to\infty$ | 沸腾：能量无界爆发 |

只有 $\sqrt{\ }$ 这一档让方差不多不少恰好等于流逝的时间——这正是上一门课"$\sqrt{\Delta t}$ 步长"看似别扭的真正来历：它不是被规定的，而是**算出来的**。

## 3. 正式定义

固定时间刻度 $\Delta t$，令 $\varepsilon=\sqrt{\Delta t}$，定义缩放随机游走：

| 符号 | 含义 |
| --- | --- |
| $S_n=X_1+\cdots+X_n$ | 前 $n$ 步的位置，$X_i$ 等概率取 $\pm\sqrt{\Delta t}$ |
| $n(t)=\lfloor t/\Delta t\rfloor$ | 到时刻 $t$ 走过的步数（向下取整） |
| $B^{(\Delta)}_t$ | 缩放过程：$S_{n(t)}$，即"把 $t/\Delta t$ 步累计起来当作 $t$ 时刻的位置" |
| 方差核验 | $\operatorname{Var}(B^{(\Delta)}_t)=n(t)\,\Delta t\to t$ |

**Donsker 缩放极限（本章的基石定理）**：当 $\Delta t\to 0$ 时，整个随机函数 $B^{(\Delta)}_\bullet$ 在分布意义下收敛到标准布朗运动 $B_\bullet$。

这里"分布意义下"指的是：随便挑有限个时刻 $t_1,\dots,t_k$ 问联合位置，答案处处贴拢；路径级整体命题（一致连续性、不可微性等）也会一并继承。它把「抛硬币游戏」正式升级成「微分方程的原料」——下一节起我们就有资格对 $B_t$ 说 $dB$ 了。

## 4. 分步例题

**问**：取 $\Delta t=0.0025$ 秒（四百分之一秒），观察 $t=4$ 秒。问走了多少步？步长多大？末位置典型幅度多大？

1. 步数 $n=t/\Delta t=4/0.0025=1600$ 步；
2. 步长 $\varepsilon=\sqrt{0.0025}=0.05$；
3. 末位置方差 $=n\varepsilon^2=1600\times 0.0025=4$；
4. 典型幅度（标准差）$=\sqrt{4}=2$，与布朗运动理论值 $\operatorname{Var}(B_4)=4$ 完全一致。

反面对照：如果偷懒把步长也写成 $0.0025$（忘开根号），方差只剩 $1600\times 0.0025^2=0.01$——粒子在四秒里只蔓延了 $0.1$ 的幅度，等于没走。配速表上这一眼，值得你在心里多挂两秒。

## 5. 动手实验

先用网页组件直观感受"指数旋钮"：拖动 $p$ 寻找那条既不会塌向零轴、也不会疯狂起飞的包络线 $c\,t^{p}$——你会发现全平面只有 $p=0.5$ 这一档刚刚好。

```viz
{
  "type": "plot",
  "title": "扩散包络 c·t^p：拖着 p 找临界配速",
  "expr": "c*x^p",
  "xmin": 0,
  "xmax": 10,
  "sliders": [
    { "name": "c", "min": 0.4, "max": 1.6, "step": 0.1, "value": 1 },
    { "name": "p", "min": 0.1, "max": 0.95, "step": 0.05, "value": 0.5 }
  ]
}
```

再玩真的：同一枚硬币序列（同一个种子），放进三档越来越细的时间刻度里跑，看看 $\pm\sqrt{\Delta t}$ 配速是不是真的把三条终点送进同一个量级。

```python title="同一枚硬币，三种时间刻度"
import random                     # 标准库随机模块；seed 固定保证可复现
import matplotlib.pyplot as plt   # 绘图模块（约定别名 plt）

random.seed(2026)
T = 4                             # 观察窗口 [0, T] 秒
for dt in [0.04, 0.01, 0.0025]:   # 三档时间刻度：步子越切越碎
    eps = dt ** 0.5               # 关键配速：步长 = 时间刻度的平方根
    pos = 0.0
    xs, ys = [0.0], [0.0]
    for k in range(int(T / dt)):  # int() 把步数向下取整成循环上限
        pos = pos + eps * random.choice((-1.0, 1.0))  # choice：从元组中等概率抽一个方向
        xs.append((k + 1) * dt)
        ys.append(pos)
    plt.plot(xs, ys, linewidth=0.8, label="dt=" + str(dt))  # label 配合图例区分三条路径
    print("dt =", dt, "  终点位置 =", round(pos, 2), "  理论典型幅度 =", round(T ** 0.5, 2))

env = [x ** 0.5 for x in xs]      # 列表推导：逐点算出上包络 √t
plt.plot(xs, env, color="red", linestyle="--")     # linestyle 指定虚线样式
plt.plot(xs, [-v for v in env], color="red", linestyle="--")
plt.legend()                      # 显示上面各条 label 组成的图例
plt.xlabel("time")
plt.ylabel("position")
plt.show()
```

三个终点大多会挤在红色喇叭口以内；理论上它们的绝对值不超过 $\pm 2$ 的概率约七成、不超过 $\pm 4$ 的概率约九成半。若你把步长改成 `eps = dt` 再跑一遍，三条路径会被死死摁在横轴附近——亲手复现一次"冻结"。

## 6. 常见误区

:::warning[常见误区]

- **"反正都是随机走，步长取什么都行"** —— 不是。步长必须按 $\sqrt{\Delta t}$ 配速：取 $\Delta t$ 会冻结，取 $\Delta t^{0.25}$ 会沸腾，极限根本不存在。
- **"Donsker 收敛就是把终点的分布算对"** —— 不够。它是整个函数（整条路径）层面的收敛：粗看像不像、细看毛糙度对不对，都要一起交代。
- **"方差等于 4，所以终点大概在 4 附近"** —— 别忘了第 09 章的忠告：方差开根号才是典型幅度。方差 4 对应幅度约 $2$。

:::

## 7. 练习

修复下面这个"典型幅度计算器"。它的作者把方差当成了幅度交了上去——修到三条检查通过为止：

```exercise
# @title: 找回平方根配速
# @check: 3.0
# @check: 1.0
# @check: 0.2
# @hint: 末位置方差 = 步数 × 单步方差；而单步 ±√dt 的方差是 dt 本身。先算方差，再开根号。
def typical_span(n, dt):
    # n 步、步长按 sqrt(dt) 配速的随机游走，走完的典型幅度应该是多少？
    return n * dt            # ← 这是方差，不是幅度：还差临门一脚

print(round(typical_span(900, 0.01), 3))
print(round(typical_span(25, 0.04), 3))
print(round(typical_span(400, 0.0001), 3))
```

<details>
<summary>点开查看逐步解答</summary>

方差 $=n\cdot\Delta t$，幅度是它的平方根：

```python
def typical_span(n, dt):
    return (n * dt) ** 0.5       # 先乘出总方差，再用 0.5 次幂开根号

print(round(typical_span(900, 0.01), 3))     # (9.0)**0.5 = 3.0
print(round(typical_span(25, 0.04), 3))      # (1.0)**0.5 = 1.0
print(round(typical_span(400, 0.0001), 3))   # (0.04)**0.5 ≈ 0.2
```

第三行的输入刻意阴险：$400\times 0.0001=0.04$ 是个小方差，开完根号才回到 $0.2$。错把方差当幅度的人，在这里会把答案缩小成原来的二十分之一。

</details>

再来一道配速直觉题：

```quiz
把时间刻度从 Δt = 0.01 直接换成 Δt = 0.04（步子变四倍大的一步），按平方根配速，单步步长应该怎么变？
- 也变成四倍：ε = 0.2
- 变成两倍：ε = 0.1 [*]
- 保持不变：ε = 0.05
? 平方根配速要求步长 = √Δt：√0.04 = 0.2？不对，原来是 √0.01 = 0.1，新的步长是 √0.04 = 0.2……等等，正确读法是从旧到新：新步长 / 旧步长 = √4 = 2。时间放大四倍，幅度只放大两倍——平方根法则永远在场。
```

## 8. 选读证明：为什么唯一的临界配速恰好是根号

<details>
<summary>选读：配速指数 α 的一道悬崖</summary>

设步长 $\varepsilon=(\Delta t)^{\alpha}$，其中 $\alpha\ge 0$ 是"配速指数"。总方差为

$$\operatorname{Var}=\;t\cdot(\Delta t)^{2\alpha-1}.$$

- 若 $2\alpha-1>0$（即 $\alpha>\tfrac12$）：方差随 $\Delta t\to 0$ 塌缩为零，极限是一条冻结的水平线；
- 若 $2\alpha-1<0$（即 $\alpha<\tfrac12$）：方差爆炸，任何时刻的尾巴都比天宽；
- 若 $\alpha=\tfrac12$：方差恒等于 $t$，粒子在每个尺度上都"活着"。

这就是把 $\sqrt{\Delta t}$ 称为**临界速度**的全部数学内容。至于为什么极限对象偏偏是高斯的：第 08 章的中心极限定理保证 $S_{n}/\sqrt{n}$ 的分布在 $n\to\infty$ 时贴向 $N(0,1)$，而逐时刻贴拢再加上独立增量的结构，正好拼出布朗运动公理的全部四条——定理的完整形态叫 Donsker 不变性原理，命题名字里的"不变"说的是：不管硬币、骰子还是别的什么零均值原料，配速对了都涌向同一个布朗运动。

</details>

## 9. 下一站

布朗运动到手了，但它到底是个什么脾气的怪物——[布朗运动的三副面孔](./20-brownian-three-faces.md)：处处连续、无处可微、放大之后还认得自己。
