---
title: 梯度下降、学习率与收敛
lesson_id: optimization/gradient-descent
prereqs:
  - optimization/convexity
  - multivariable/partial-gradient
volume: 5
layer: L7
track:
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - gradient-descent
  - learning-rate
applications:
  - neural-networks
  - logistics
exits:
  - data-ai
  - engineering
---

# 梯度下降、学习率与收敛

## 1. 从一个场景开始

浓雾封山，你被困在半山腰，看不见谷底，只能用脚感受脚下的坡度。策略朴素到不能再朴素：**感觉哪边更陡地向下，就朝那边挪一小步；落地后再重新感受。** 一百步之后，你多半已经站在碗底了。

梯度下降就是这个策略的数学版——它也是训练神经网络、推荐系统、本站第 45 章一切模型的引擎。

## 2. 直觉解释

上一章说过：梯度 $\nabla f$ 指向**最陡上升**方向（第 20 章梯度探针里的紫箭头）。那么负梯度 $-\nabla f$ 就是最陡下降方向——脚下坡度最陡的下山路。

每一步走多远？由一个旋钮控制：**学习率** $\eta$（读作 eta）。

- $\eta$ 太小：步子碎得像蚂蚁挪动，一千步还在半山腰；
- $\eta$ 太大：一步跨过谷底落到对面山坡，甚至越荡越高——直接被弹出山谷；
- $\eta$ 合适：以稳定的节奏收敛到谷底。

梯度下降 = **方向**（负梯度）+ **步长**（学习率），两件套缺一不可。

## 3. 正式定义

从初始点 $x_0$ 出发，反复执行：

$$x_{k+1} \;=\; x_k \;-\; \eta\,\nabla f(x_k), \qquad \eta>0$$

| 符号 | 含义 |
| --- | --- |
| $x_k$ | 第 $k$ 步时的位置（参数向量） |
| $\nabla f(x_k)$ | 该点的梯度，上升最快的方向 |
| $\eta$ | 学习率：每步沿下降方向走的比例 |

对凸函数（如二次型），可以精确算出收敛条件。以一维 $f(x)=\lambda x^2/2$ 为例，更新式给出 $x_{k+1}=(1-\eta\lambda)x_k$，于是：

$$\lvert 1-\eta\lambda\rvert<1 \;\Longleftrightarrow\; 0<\eta<\frac{2}{\lambda}$$

学习率必须落在窗口里才收敛；超过右端点，迭代发散。**这个窗口由地形曲率 $\lambda$ 决定**——越陡的碗，允许的步子越小。

## 4. 分步例题

**例**：$f(x)=x^2$，即 $\nabla f=2x$；取 $\eta=0.25$，$x_0=4$。

1. 第 1 步：$x_1=4-0.25\times2\times4=4\times(1-0.5)=2$；
2. 第 2 步：$x_2=2\times0.5=1$；
3. 第 3 步：$x_3=0.5$；
4. 规律浮出水面：每一步都把距离**砍半**，$x_k=4\times0.5^k$——几何衰减；
5. 收敛判据核对：$\lambda=2$，窗口是 $0<\eta<1$；$\eta=0.25$ 在窗内 ✓。若改 $\eta=0.9$，因子变成 $1-1.8=-0.8$，绝对值 $0.8<1$：仍然收敛，但正负交替——轨迹在谷底两侧来回弹跳着靠近；再加大到 $\eta=1.05$，因子 $-1.1$，绝对值超过 1，发散。

## 5. 动手实验

### 实验 1：梯度探针——先看清"往哪边走"

拖动白点到任意位置：紫色箭头是该点的梯度（最陡上升），橙色箭头是你选的方向。**梯度下降永远选紫箭头的反方向。**

```viz
{
  "type": "gradient-probe",
  "title": "f = x² + y²：紫箭头指上坡，反方向才是下坡",
  "expr": "x^2 + y^2",
  "point": [2, 1]
}
```

把白点拖到 $(2,-1)$、$(0.5,0.5)$ 再看：箭头长短在变（离谷底越远坡越陡），但指向始终严格背对原点——对这只完美的碗，负梯度就是回家的直线。

### 实验 2：学习率赛跑——四种命运

```python title="不同学习率的下降轨迹对比"
import math

def gd_path(eta, x0=4.0, steps=10):
    path = [x0]
    x = x0
    for k in range(steps):
        x = x - eta * 2 * x        # 更新式：x 减去学习率乘梯度 2x
        path.append(x)
    return path

for eta in [0.05, 0.25, 0.55, 1.05]:
    path = gd_path(eta)
    tail = ", ".join(f"{v:.3g}" for v in path[:6])   # :.3g 三位有效数字格式化
    print(f"eta={eta}: {tail}")
```

四个结局一目了然：`0.05` 磨蹭（10 步后还剩 $4\times0.9^{10}\approx1.39$）；`0.25` 砍半冲刺；`0.55` 在谷底两侧弹跳着靠近（负因子）；`1.05` 越跳越高——发散。想画成图的话：

```python title="误差随步数的指数衰减与爆炸"
import matplotlib.pyplot as plt

def gd_path(eta, x0=4.0, steps=10):
    path = [x0]
    x = x0
    for k in range(steps):
        x = x - eta * 2 * x        # 更新式：x 减去学习率乘梯度 2x
        path.append(x)
    return path

steps = list(range(11))
fig, ax = plt.subplots(figsize=(7, 3))       # figsize：画布宽高（英寸）
for eta in [0.05, 0.25, 0.55, 1.05]:
    errs = [abs(v) for v in gd_path(eta)]    # abs 取绝对值：离谷底的距离
    ax.plot(steps, errs, marker="o", markersize=3, label=f"eta={eta}")
ax.set_yscale("log")                          # 对数纵轴：指数过程变直线
ax.set_xlabel("step")
ax.set_ylabel("|x_k|")
ax.legend()
ax.grid(True)
```

对数坐标下，收敛的三条线都是直线（斜率即 $-\ln\lvert1-2\eta\rvert$），发散那条掉头向上——理论窗口 $0<\eta<1$ 与图像完全吻合。

### 快问快答

```quiz
学习率调得过大，最可能发生什么？
- 收敛速度只是稍微变慢
- 迭代在谷底两侧震荡甚至发散，误差越来越大 [*]
- 结果不变，只是多算几步
? 更新因子 |1-eta*lambda| 超过 1 时，每步误差不降反升——这就是损失曲线突然起飞的常见原因。
```

:::warning[常见误区]

**误区一**："梯度为零的点就是我们要的最小值。" 零梯度只保证是驻点：可能是极大、可能是鞍点。凸性（上一课）才能把驻点升级成全局最小。

**误区二**："学习率应该越大越快。" 窗口上限 $2/\lambda$ 是硬约束：越过它不是"快"，是发散。实践中常从小步长试起，逐步加大。

**误区三**："非凸问题上梯度下降毫无用处。" 恰恰相反——深度学习全靠它。只是在非凸地形上它只承诺找到"不错的局部低点"，不再承诺全局最优。工具的边界要心里有数。

:::

## 6. 练习

**练习 1**（概念）：$f(x)=3x^2$ 的收敛窗口是什么？$\eta=0.8$ 行不行？

<details>
<summary>点开查看逐步解答</summary>

$\lambda=3$（因为 $f=\lambda x^2/2$ 即 $\lambda=6$ 时对应 $f=3x^2$……小心系数！直接用更新式：$x_{k+1}=x_k-\eta\cdot6x_k=(1-6\eta)x_k$，要求 $\lvert1-6\eta\rvert<1$ 得 $0<\eta<1/3$）。$\eta=0.8$ 远超窗口，因子 $1-4.8=-3.8$，发散。**别死记公式，写出更新因子再看绝对值**最保险。
</details>

**练习 2**（判题）：下面的梯度下降循环想把 $x$ 从 4 走到 0.001 以内并数出用了几步。初始代码的学习率漏乘了梯度系数 2，请修正后运行：

```exercise
# @title: 练习：数一数砍半收敛要几步
# @check: 12
# @check: 0.00098
# @hint: f(x)=x^2 的梯度是 2*x；更新式应为 x = x - eta * 2 * x。步数会在 x 第一次小于等于 0.001 前停止累计。
x = 4.0
eta = 0.25     # 学习率
steps = 0      # 步数计数器

while steps < 100 and x > 0.001:   # 双重保险：防呆上限 100 步
    x = x - eta * x                # ← 错了：这里相当于 eta=0.125 的效果，收敛慢得多
    steps = steps + 1

print(steps)          # 正确版本恰好需要 12 步（每次距离砍半）
print(round(x, 5))    # 终点位置，保留 5 位小数
```

修好后输出 `12` 和 `0.00098`：$4\times0.5^{12}=0.0009765625$，四舍五入正是 0.00098。

**练习 3**：把实验 2 中 `gd_path` 的更新行改成 `x = x - eta * x`（丢掉梯度系数），预测四种学习率的新结局，再运行验证。

<details>
<summary>点开查看逐步解答</summary>

新因子是 $1-\eta$：`0.05`→0.95 更磨蹭；`0.25`→0.75 温和收敛；`0.55`→0.45 反而比原来稳（不再弹跳）；`1.05`→−0.05 微弱震荡但收敛。同一套代码，梯度系数变了，窗口就整个平移——这解释了为什么实际训练里"归一化输入"如此重要：**把曲率拉平，窗口才装得下大步长**。
</details>

## 7. 选读：为什么二次型上能算得这么干净

<details>
<summary>选读 · 特征值视角</summary>

对二次型 $f(x)=\frac12 x^{\mathsf T}A x$（$A$ 对称正定，第 21 章的老朋友），梯度是 $Ax$。把 $x_0$ 在 $A$ 的特征向量基下展开，每个分量独立演化：

$$v_i^{(k)}=(1-\eta\lambda_i)^k v_i^{(0)}$$

整体收敛当且仅当所有因子的绝对值小于 1，即 $\eta < 2/\lambda_{\max}$；而收敛快慢由**最慢的分量**决定——条件数 $\kappa=\lambda_{\max}/\lambda_{\min}$ 越大，$\eta$ 越不敢大、长轴方向走得越慢，等高线图上表现为轨迹在窄谷里 zigzag。病态曲率是优化器加速技术（动量、Adam 等，后续课程）存在的根本理由。

</details>

## 8. 下一站

到目前为止我们都在自由地满山走。但现实问题总戴着镣铐：预算固定、资源有限、路径不许出界。约束下的最优点藏在"相切"的那一瞬间——拉格朗日乘数法登场。

→ [拉格朗日乘数法](./40-lagrange-multipliers.md)
