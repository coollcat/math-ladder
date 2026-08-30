---
title: Laplace 与 Poisson：直接问稳态长什么样
lesson_id: pde/laplace-poisson
prereqs:
  - pde/fourier-pde-synthesis
  - pde/flux-conservation
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
  - steady-state
  - five-point-stencil
  - relaxation-iteration
  - maximum-principle
applications:
  - heat-conduction
  - electrostatics
exits:
  - engineering
---

# Laplace 与 Poisson：直接问稳态长什么样

## 1. 从一个场景开始

一块方形金属薄板，左边紧贴 100 度的热水管，右边紧贴 0 度的冰水管，上下两边包着绝热棉。刚接上的那一瞬间，板上的温度乱七八糟；可如果你不管过程、只想知道**等足够久之后**的画面，时间变量就成了一个累赘。

第 40 课到 110 课一直在追"每一时刻长什么样"。这一课换一个问题：**终点长什么样？** 把 $u_t=0$ 代进热方程，时间项消失，剩下的是一个只关于空间的方程——它比热方程古老，也比热方程更"干净"，解它甚至不需要知道初值，只要边界。

## 2. 直觉解释

想象一张绷在铁丝框上的肥皂膜：铁丝的形状（边界）一旦固定，膜面就会自己塌到唯一的一个位置上。那个位置的特征非常朴素：

**每一处的高度，都正好是它四周邻居高度的平均。**

这个"均值性质"就是 Laplace 方程的几何灵魂。谁比邻居平均高，就会被邻居拉下来；谁比邻居平均低，就会被邻居托上去。反复这么拉扯，全场收敛到一个处处等于四邻平均的状态。

如果在膜下面放一根加热棒（源），被加热的那一小片就要"高于四邻平均"才能把热量持续送出去——这就是 Poisson 方程 $\Delta u=-f$ 里那个 $f$ 的物理含义。

## 3. 正式定义

热方程 $u_t=k\Delta u$ 令 $u_t=0$，并按是否有源分两家：

$$\Delta u = \frac{\partial^2u}{\partial x^2}+\frac{\partial^2u}{\partial y^2}=0 \quad\text{(Laplace)}, \qquad \Delta u=-f \quad\text{(Poisson)}.$$

在步长 $h$ 的正方形网格上，用五点模板离散（记 $u_{i,j}$ 的四个邻居为"上下左右"）：

$$\frac{u_{i-1,j}+u_{i+1,j}+u_{i,j-1}+u_{i,j+1}-4u_{i,j}}{h^2}=-f_{i,j} \;\Longrightarrow\; u_{i,j}=\frac{u_{i-1,j}+u_{i+1,j}+u_{i,j-1}+u_{i,j+1}+h^2f_{i,j}}{4}.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\Delta u$ | Laplace 算子 | 两个方向二阶偏导之和，衡量"比邻居平均高多少" |
| $f$ | 源项 | 单位体积的供热强度；$f>0$ 是热源，会把局部抬高 |
| $h$ | 网格步长 | 相邻格点的间距；$h^2f$ 是源在这一格的总贡献 |
| $\omega$ | 松弛因子 | 每轮朝目标值走多远；$\omega=1$ 是 Jacobi，$>1$ 是超松弛 |

迭代格式（加权 Jacobi / SOR）：

$$u_{i,j}^{\text{新}}=u_{i,j}+\omega\left(\frac{u_{i-1,j}+u_{i+1,j}+u_{i,j-1}+u_{i,j+1}+h^2f_{i,j}}{4}-u_{i,j}\right).$$

边界值始终不动，只更新内点；反复扫全场直到不再变化。

## 4. 分步例题

**例 1**：一个内点，四邻是 $0.8,\ 0.4,\ 0.6,\ 0.2$，取 $h=0.5$，中心供热 $f=2$。

1. 四邻之和 $0.8+0.4+0.6+0.2=2.0$；
2. 源项贡献 $h^2f=0.25\times2=0.5$；
3. 新值 $u=\dfrac{2.0+0.5}{4}=0.625$；
4. 若撤掉热源（$f=0$），新值回落到 $2.0/4=0.5$——热源把这一点抬高了 $0.125$，正好是 $h^2f/4$。

**例 2**：一维退化。左右两端分别是 1 和 0、上下绝热的板，稳态应该是什么？

1. 上下绝热意味着 $y$ 方向没有变化，问题退化成一根杆：$\Delta u=u_{xx}=0$；
2. $u_{xx}=0$ 的解是直线，两端 1 和 0 定出 $u(x)=1-x$；
3. 数值实验会给出 $1.0,\ 0.875,\ 0.75,\ 0.625,\ 0.5,\ 0.375,\ 0.25,\ 0.125,\ 0.0$——一条完美的等差数列。

## 5. 动手实验

### 实验 1：一格一格把稳态"摸"出来

```viz
{
  "type": "laplace-relax",
  "title": "松弛迭代：左右固定温度，中央可选一块热源",
  "mode": "laplace",
  "f": 1.2,
  "omega": 1
}
```

按"单步"看每一轮全体内点被替换成四邻平均（加上源项）之后的样子；按播放让它自动收敛。切到 Poisson 模式并拖动 $f$：中央被顶起一个包，源越强包越高。把 $\omega$ 推过 1（超松弛）收敛明显加快，推到接近 2 边缘时开始抖动。

### 实验 2：松弛多少轮才收敛

```python title="九乘九网格：打印中心点随迭代轮数的变化"
N = 9
grid = [[0.0] * N for _ in range(N)]      # 列表推导：造一个 9x9 的全零表格
for j in range(N):
    grid[j][0] = 1.0                      # 左边界 = 1
    grid[j][N - 1] = 0.0                  # 右边界 = 0

def relax(v, times):                      # 做 times 轮 Jacobi 松弛
    for _ in range(times):                # 下划线变量名：这个计数用不到，只是占位
        new = [row[:] for row in v]       # 整表复制：新值必须基于同一批旧值
        for j in range(1, N - 1):
            for i in range(1, N - 1):
                new[j][i] = (v[j - 1][i] + v[j + 1][i] + v[j][i - 1] + v[j][i + 1]) / 4
        for i in range(1, N - 1):         # 上下绝热：边界行抄内侧一行
            new[0][i] = new[1][i]
            new[N - 1][i] = new[N - 2][i]
        v = new
    return v

grid = relax(grid, 1)
print(round(grid[4][4], 3))               # 一轮之后：只有紧邻边界的格子动了一下
grid = relax(grid, 19)
print(round(grid[4][4], 3))               # 二十轮
grid = relax(grid, 180)
print(round(grid[4][4], 3))               # 二百轮
print([round(grid[4][i], 3) for i in range(N)])
```

输出 `0.0`、`0.211`、`0.5`，最后一行是 `[1.0, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0.0]`。第一轮中心还是 0——信息一格一格往里爬，中心要等 $N/2$ 轮才"知道"边界的存在。两百轮后整行是完美等差数列，与例 2 的解析直线 $u=1-x$ 分毫不差。

### 实验 3：稳态就是热方程跑到时间的尽头

```python title="把热方程一直算下去，看它趋向谁"
N = 9
u = [[0.0] * N for _ in range(N)]
for j in range(N):
    u[j][0] = 1.0
    u[j][N - 1] = 0.0

r = 0.2                                   # 差分比 r = k*dt/h^2，二维须不超过 0.25
for _ in range(400):                      # 时间推进四百步
    new = [row[:] for row in u]
    for j in range(1, N - 1):
        for i in range(1, N - 1):
            nb = u[j - 1][i] + u[j + 1][i] + u[j][i - 1] + u[j][i + 1]
            new[j][i] = u[j][i] + r * (nb - 4 * u[j][i])
    for i in range(1, N - 1):
        new[0][i] = new[1][i]
        new[N - 1][i] = new[N - 2][i]
    u = new

print(round(u[4][4], 3))
print(round(abs(u[4][4] - 0.5), 4))       # 与解析直线中点的差距
```

输出 `0.5` 与 `0.0`。热方程跑够久之后，中心点停在 0.5，与解析直线 $u=1-x$ 的中点差距小到四位小数都看不出来。**两条路通向同一个终点**：一条追着时间跑，一条直接问终点。

## 6. 练习

```exercise
# @title: 练习：给一个内点做 Poisson 更新
# @check: 0.625
# @check: 0.5
# @hint: 离散 Poisson 是 4u = 四邻之和 + h²f，源项前面是加号；f>0 是热源，会把该点抬高。
up = 0.8          # 上邻居
down = 0.4        # 下邻居
left = 0.6        # 左邻居
right = 0.2       # 右邻居
h = 0.5           # 网格步长
f = 2.0           # 源强：正值表示供热

poisson = (up + down + left + right - h * h * f) / 4   # ← 有错：源项应是 +h²f，这里写成了减
laplace = (up + down + left + right) / 4               # 撤掉热源，退化为 Laplace
print(round(poisson, 3))
print(round(laplace, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正版：

```python
up, down, left, right = 0.8, 0.4, 0.6, 0.2
h = 0.5
f = 2.0

poisson = (up + down + left + right + h * h * f) / 4
laplace = (up + down + left + right) / 4
print(round(poisson, 3))     # 0.625
print(round(laplace, 3))     # 0.5
```

```text
四邻之和 = 0.8 + 0.4 + 0.6 + 0.2 = 2.0
h²f      = 0.25 × 2 = 0.5
带源新值 = (2.0 + 0.5) / 4 = 0.625
无源新值 = 2.0 / 4 = 0.5
```

源的贡献是 $h^2f/4=0.125$。注意它的量级：源强翻倍，抬升翻倍；网格加密一倍（$h$ 减半），同样源强的抬升变成四分之一——**离散格式必须尊重 $h^2$，否则换网格时答案会变。**

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 Laplace 方程比热方程"简单所以该先学"。它其实是热方程的终点：$u_t\to0$ 时剩下的就是 $\Delta u=0$。先学谁只是口味问题，硬说它更简单是因果倒置。

**误区二**：你以为松弛迭代跑几轮就收敛。信息每轮只往内传播一格，$N\times N$ 的网格大约要 $N^2$ 量级的轮数才能把边界的影响送到中心。这正是超松弛（$\omega>1$）与多重网格方法存在的理由。

**误区三**：你以为源项符号随便写。$\Delta u=-f$ 里 $f>0$ 是热源，会抬高局部；写成加号等于把暖气片换成冰箱。判断依据很简单：稳态下热源必须持续往外送热，所以源点要**高于**四邻平均。

:::

## 8. 快问快答

```quiz
没有热源的稳态温度场，区域内部能不能出现比所有边界值都高的热点？
- 不能，极值只可能出现在边界上 [*]
- 可以，只要边界温差足够大
- 取决于网格分辨率
? 这是最大值原理：Δu=0 的解，最大最小值一定在边界上取到；只有 Poisson 方程带正源时，内部才可能冒出峰值。
```

```quiz
把热方程一直算下去，最终会趋向什么？
- Laplace 方程的解，也就是稳态 [*]
- 一个永不停止的周期振荡
- 数值发散
? u_t = kΔu，当 u_t 趋于 0 时剩下的就是 Δu=0。稳态不是另一个问题，就是时间演化的终点。
```

## 9. 选读：最大值原理怎么证

<details>
<summary>选读 · 三步反证，看清极值为什么被赶到边界</summary>

**命题**：在有界区域 $\Omega$ 内 $\Delta u=0$，则 $u$ 的最大值和最小值都在边界 $\partial\Omega$ 上取到。

**证明思路**（以最大值为例）：

1. 假设最大值在内部某点 $p$ 取到，且严格大于边界上的所有值。那么 $p$ 附近四个方向都是"下坡"，即在 $p$ 处 $u_{xx}\le0$ 且 $u_{yy}\le0$。
2. 由 $\Delta u=u_{xx}+u_{yy}=0$，两个非正数之和为零，只能 $u_{xx}=u_{yy}=0$——曲面在 $p$ 处是平的。
3. 继续往 $p$ 的邻居重复同样的推理，平坦性会一格一格扩散到整个连通区域，最终推出 $u$ 处处等于同一个常数，与"严格大于边界"矛盾。

结论：**无源稳态是"没有惊喜"的场**——它夹在边界的最大最小值之间，内部绝不冒尖。这条性质有两个实用价值：

- **唯一性**：两组边界条件相同的稳态解之差满足 $\Delta w=0$ 且边界为零，由最大值原理 $w\equiv0$，故解唯一。
- **误差哨卡**：数值解如果冒出超过边界范围的极值，一定是代码写错了（或源项符号反了），不用怀疑物理。

</details>

## 10. 下一站

稳态是时间演化的终点，可过程本身还有一整块没碰：二维、可涂可画、还能亲手把 $r$ 推过稳定线看它炸开。下一课做一个完整的小项目：**[二维热扩散项目](./130-heat-2d-project.md)**。
