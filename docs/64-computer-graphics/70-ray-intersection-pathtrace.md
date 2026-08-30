---
title: 光线求交与路径追踪入门
lesson_id: graphics/ray-intersection-pathtrace
prereqs:
  - graphics/texture-depth-blend
  - linalg/dot-product
  - numerical-analysis/monte-carlo-variance
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
  - ray-intersection
  - path-tracing
  - indirect-lighting
applications:
  - film-rendering
  - architectural-visualization
exits: []
---

# 光线求交与路径追踪入门

## 1. 从一个场景开始

前几课的光栅化管线快得惊人，但它有个天生的盲区：着色只看"光源直射到表面、表面直射到眼睛"这一条路。镜子里的像、玻璃后面的折射、墙角那份从隔壁墙面弹过来的柔光——这些**间接光照**让室内设计公司和电影特效公司都不得不换一条路：不从三角形出发去铺像素，而是**从眼睛出发，反着把光的路账一笔笔查回来**。

这条路就是光线追踪；再加上"随机多弹几跳、取平均"的蒙特卡洛外衣，就是今天电影渲染的主力：路径追踪。

## 2. 直觉解释

**第一步：发问。** 从眼睛穿过一个像素发一根光线，沿方向走，问一句"你最先撞到世界里的谁？"——回答只靠**求交**：光线与球联立得二次方程；光线与三角形联立，则请回第 30 课的重心坐标。谁最近谁说话。

**第二步：弹射。** 撞到表面后不急着结算，按材质的脾气决定下一步：镜面按反射角精确弹走，粗糙表面朝半空随机一跳。每条路径一路记录"谁发光、谁染色"，走到光源或弹射预算用完为止。

**第三步：平均。** 一个像素只发一根光线太赌运气，于是发成百上千根，把各条路径的亮度**取平均**——这正是第 44 章蒙特卡洛方法的落地：单条路径是随机样本，平均值是积分的估计，样本越多噪声越小。间接光照不再是"另算的特效"，它就是弹射路径途经的第二面墙、第三面墙，自动进了平均账。

## 3. 正式定义

**光线方程**：光线是"一个点加一个方向乘一个步长"：

$$R(t) = O + t\,D,\qquad t > 0$$

**光线与球求交**：把 $R(t)$ 代入球面方程 $\lVert P - C \rVert = r$，记 $M = O - C$，整理成关于 $t$ 的二次方程：

$$t^2 (D\cdot D) + 2t\,(D\cdot M) + (M\cdot M - r^2) = 0$$

判别式 $\Delta = (D\cdot M)^2 - (D\cdot D)(M\cdot M - r^2)$：负数=脱靶，零=擦边，正数=穿过（两个根，取较小的正根——先撞到近的那面）。

**光线与三角形求交**：交点必须同时满足光线方程和重心配方：

$$O + tD = (1-\beta-\gamma)A + \beta B + \gamma C$$

三个未知数 $t,\beta,\gamma$ 三个方程；解出后代入老判据验收：$\beta \ge 0$、$\gamma \ge 0$、$\beta+\gamma \le 1$ 才算真命中。第 30 课的边函数原班人马，这次在三维平面上当验收员。

**路径追踪骨架**（伪代码）：

```text
颜色[像素] = trace(眼睛, 穿过该像素的方向, 弹射上限)

trace(O, D, 深度):
    P = 找最近交点(O, D)          # 球用判别式，三角形用重心坐标
    if 没有交点: return 背景色
    if P 在光源上: return 光的颜色
    if 深度用完: return 环境光保底
    N = P 处的法线
    if P 是镜面:
        R = 反射方向(D, N)                        # 50 课公式反着用
        return 反射率 * trace(P, R, 深度 - 1)      # 递归：接着查下一跳
    else:
        随机方向 = 按材质分布随机抽一条出路         # 蒙特卡洛采样
        return 反照率 * trace(P, 随机方向, 深度 - 1)
```

递归一层就是一跳；随机方向那支让每条路径各走各路，成千上万条平均之后，从四面八方汇进眼睛的间接光就现了形。

## 4. 分步例题

**例**：眼睛在原点 $O=(0,0,0)$，光线方向 $D=(0,0,-1)$；球心 $C=(0,0,-5)$，半径 $r=2$。求撞击点。

1. $M = O - C = (0,0,5)$；
2. 系数：$D\cdot D = 1$，$D\cdot M = -5$，$M\cdot M - r^2 = 21$；
3. 方程：$t^2 - 10t + 21 = 0$；
4. 判别式：$\Delta = 100 - 84 = 16$，开方得 4；
5. 两根 $t = 3$ 或 $7$，取较小正根 $t=3$；
6. 撞击点 $R(3) = (0,0,-3)$。几何复核：$\lVert (0,0,-3)-(0,0,-5) \rVert = 2 = r$ ✓——离眼睛最近的入球点。

## 5. 动手实验

### 实验 1（viz）：把光线捋直成一根数轴

```viz
{
  "type": "plot",
  "title": "球求交的判别式图像：曲线何时扎进海平面",
  "expr": "(x - c)^2 - r^2",
  "xmin": 0,
  "xmax": 12,
  "sliders": [
    { "name": "c", "min": 1, "max": 9, "step": 0.5, "value": 5 },
    { "name": "r", "min": 1, "max": 4, "step": 0.25, "value": 2 }
  ]
}
```

怎么玩：横轴就是光线参数 t——把光线掰直放平，球在上面压出一道抛物线。曲线**扎进横轴下方** ⇔ 判别式为正 ⇔ 光线穿球，两个零点就是进出球的 t；曲线恰好吻在横轴上是擦边球；把 r 拉小或把 c 拉远，整条曲线浮出水面——脱靶。求交不是新运算，就是找这条抛物线的根。

### 实验 2（python）：2D 房间里的弹射账本

```python title="固定种子的迷你路径追踪：路径可复现"
import random                       # 随机库：这次用固定种子保证可复现
import math
import matplotlib.pyplot as plt

random.seed(11)                     # seed()：固定随机序列起点

WALLS = [
    ("x", 0.0, 1.0, 0.0),           # 左墙：x=0，内法线朝 +x
    ("x", 10.0, -1.0, 0.0),         # 右墙
    ("y", 0.0, 0.0, 1.0),           # 下墙
    ("y", 10.0, 0.0, -1.0),         # 上墙（x∈[4,6] 一段是亮窗）
]

def nearest_hit(ox, oy, dx, dy):    # 求交：与四面墙 + 中央斜镜
    t_best, kind_best = 1e9, "none"
    n_best = (0.0, 0.0)
    px = py = 0.0
    for axis, val, nx, ny in WALLS:
        if axis == "x":
            if dx == 0:
                continue            # 与墙平行：永不相交
            t = (val - ox) / dx
            px, py = val, oy + t * dy
            ok = t > 0.001 and 0.0 <= py <= 10.0    # 链式比较：范围判定
        else:
            if dy == 0:
                continue
            t = (val - oy) / dy
            px, py = ox + t * dx, val
            ok = t > 0.001 and 0.0 <= px <= 10.0
        if ok and t < t_best:
            if axis == "y" and val == 10.0 and 4.0 <= px <= 6.0:
                kind_best = "light"             # 撞进亮窗
            else:
                kind_best = "wall"
            t_best = t
            n_best = (nx, ny)
    if dx + dy != 0:                # 斜镜：直线 x+y=15，线段 (6,9)-(9,6)
        t = (15.0 - ox - oy) / (dx + dy)
        mx = ox + t * dx
        my = oy + t * dy
        if t > 0.001 and 6.0 <= mx <= 9.0 and 6.0 <= my <= 9.0 and t < t_best:
            t_best, kind_best, n_best = t, "mirror", (0.7071, 0.7071)
            px, py = mx, my
    if kind_best == "none":
        return None
    return t_best, kind_best, n_best, px, py

def trace(ox, oy, dx, dy, depth, path):    # 递归弹射：一跳一跳查账
    hit = nearest_hit(ox, oy, dx, dy)
    if hit is None:
        return 0.0
    t, kind, nrm, px, py = hit
    path.append((px, py))           # append：往路径折线加一个拐点
    if kind == "light":
        return 1.0                  # 撞进亮窗：满额亮度
    if depth == 0:
        return 0.0                  # 弹射预算用完：这条路径记黑
    nx, ny = nrm
    if kind == "mirror":
        dot = dx * nx + dy * ny     # 入射方向在法线上的投影
        rx = dx - 2 * dot * nx      # 反射：d − 2(d·n)n（50 课公式的亲戚）
        ry = dy - 2 * dot * ny
        return trace(px, py, rx, ry, depth - 1, path)
    th = random.uniform(-1.2, 1.2)  # uniform：绕内法线随机转一个角
    ca = math.cos(th)
    sa = math.sin(th)
    bx = nx * ca - ny * sa          # 旋转法线得新方向：漫反射随机一跳
    by = nx * sa + ny * ca
    return trace(px, py, bx, by, depth - 1, path)

vals = []
for k in range(6):
    ang = random.uniform(0.0, 1.5708)   # π/2≈1.5708：朝房间的半圈方向
    p = [(1.0, 1.0)]                # 眼睛固定在左下角
    vals.append(trace(1.0, 1.0, math.cos(ang), math.sin(ang), 6, p))
    xs = [q[0] for q in p]          # 列表推导：抽出折线的 x 序列
    ys = [q[1] for q in p]
    plt.plot(xs, ys, marker="o")    # marker="o"：每个拐点画个圆点
plt.plot([0, 10, 10, 0, 0], [0, 0, 10, 10, 0], color="gray")   # 房间轮廓
plt.plot([4, 6], [10, 10], linewidth=6)   # linewidth：粗线标出亮窗
plt.axis("equal")                   # 横纵等比例：房间才是正方形
plt.title("2D path tracing, seed=11")

print(f"6 条样本路径里 {round(sum(vals))} 条撞进亮窗")
for n in (50, 500):                 # 元组循环：两轮蒙特卡洛统计
    random.seed(5)                  # 同一种子：n=500 包含 n=50 的前 50 发
    acc = 0.0                       # 累加器清零
    for k in range(n):
        ang = random.uniform(0.0, 1.5708)
        acc = acc + trace(1.0, 1.0, math.cos(ang), math.sin(ang), 6, [])
    print(f"n={n}: 平均亮度 {round(acc / n, 3)}")
```

怎么玩：图中每条折线是一条从眼睛出发的弹射路径——碰到斜镜的精确折返（镜面），碰到灰墙的随机乱弹（漫反射）。默认 6 条里 1 条撞进亮窗。往下看统计：n=50 时平均亮度 0.32，n=500 时 0.324——样本多十倍，读数稳了。进阶：把代码里两处弹射预算 `6` 都改成 `1` 再跑，平均亮度跌到约 0.124——只许直视时世界暗一大截；预算 2 时约 0.182。**多出来的一多半亮度全是弹射带回来的间接光**，随深度逐步进账。

### 快问快答

```quiz
路径追踪为什么敢说能算出"间接光照"？
- 因为它给每个像素存了更多层深度账本
- 因为弹射路径把"光从别处反弹过来"的贡献也累加进了平均值 [*]
- 因为它把三角形切得更小更密
? 光栅化着色只看光源直射；路径追踪每弹一跳，上一跳表面就成了这一跳的"光源"，间接贡献随随机路径的平均自然进账——蒙特卡洛积分在渲染里的落地。
```

:::warning[常见误区]

**误区一**："你以为光线追踪慢在求交运算。" 单次求交是几行算术，真正的开销是弹射树的**指数分裂**：每命中一处还要向光源发影子光线、再随机弹跳。工程上靠 BVH（把场景装进嵌套包围盒，求交从全场景暴力降到对数级）和弹射深度控制续命。

**误区二**："你以为路径追踪在正向模拟光子。" 主流实现是**从眼睛反向走**：正向发射的光子几乎永远落不进瞳孔，反向走则每根光线都对应一个像素、必有贡献。名字里的"光路"没变，走的方向反了。

**误区三**："你以为画面上的噪点是 bug。" 那是蒙特卡洛估计的方差，是特性不是缺陷。样本数翻四倍，噪声约减半（1/√N 收敛，第 44 章的定律）；生产渲染还要叠降噪器把残余噪声抹平。

:::

## 6. 练习

**练习 1**：光线 $O=(0,0,0)$、$D=(0,0,-1)$；球心 $C=(0,0,-8)$、半径 $r=3$。求两个交点的 t。代码能跑但判别式抄丢了东西：

```exercise
# @title: 练习：这根光线什么时候撞上球
# @check: 11.0
# @check: 5.0
# @hint: 判别式是 b²−4ac，丢一项根就不对；对照第 3 节的公式逐项核对
a = 1.0        # D·D = 1（方向已归一化）
b = -16.0      # 2·(D·M)，M = O − C = (0,0,8)
c = 55.0       # M·M − r² = 64 − 9

disc = b * b - c          # ← 问题在这：判别式少乘了 4a
root = disc ** 0.5        # ** 0.5：幂运算开平方
t1 = (-b + root) / (2 * a)    # 远交点
t2 = (-b - root) / (2 * a)    # 近交点
print(t1)
print(t2)
```

改对后输出 11.0 与 5.0：判别式 $256-4\times55=36$，开方 6，$t=\dfrac{16\pm6}{2}$。渲染时取 $t=5$——较小的正根才是先撞上的那一面。

**练习 2**：三角形 $A(0,0,0), B(4,0,0), C(0,4,0)$，光线从 $O=(2,2,10)$ 沿 $(0,0,-1)$ 走。它命中了吗？命中点在哪？

<details>
<summary>点开查看逐步解答</summary>

1. 平面 z=0 与光线联立：$10 + t\times(-1) = 0 \Rightarrow t = 10$，交点 $P=(2,2,0)$；
2. 求 P 的重心坐标（第 30 课练习 2 算过同一个三角形）：$(\alpha,\beta,\gamma) = (0,\ 0.5,\ 0.5)$；
3. 验收：$\beta=0.5\ge0$、$\gamma=0.5\ge0$、$\beta+\gamma=1\le1$ ✓ 命中。

命中点恰好落在 BC 边上（α=0）——边界命中在路径追踪里照样算数，只是要小心别和相邻三角形的命中重复计数。
</details>

**练习 3**：只许直视亮窗的房间和允许弹射 6 跳的同一房间，亮度差多少？用实验 2 的数字说话，并解释差额从哪来。

<details>
<summary>点开查看逐步解答</summary>

实验 2 的统计：弹射预算 1 时平均亮度约 0.124，预算 6 时约 0.324——约 **2.6 倍**。差额全部来自间接光：先落在灰墙、再随机弹几跳进亮窗的那些路径，预算 1 时直接判黑，预算 6 时逐步把"墙反射的窗光"记进账本。真实房间里这条账更夸张：贴着窗户却背对窗户的桌面，亮度几乎全靠弹射进账——这正是光栅化着色永远算不出的那部分。
</details>

## 7. 边界与适用条件

- 本课的 2D 实验把方向采样压成"绕法线随机转角"；真实路径追踪按材质的双向反射分布函数（BRDF）采样，并配合重要性采样把光线往贡献大的方向引。
- 收敛速度是 1/√N：噪声减半要四倍样本。生产管线用降噪器、渐进式累积与对噪不敏感的色调映射兜底。
- 弹射深度不是越大越好：能量随弹射被反照率连乘衰减，深层贡献极小；俄罗斯轮盘（按存活概率提前终止）是无偏的省成本手段。
- 光线追踪与光栅化并非替代关系：现代引擎两者混用——光栅化铺主画面，光线追踪补镜子、软阴影与间接光。

## 8. 选读：渲染方程——路径追踪在解的那道题

<details>
<summary>选读 · 第 50 章的蒙特卡洛积分怎么搬进渲染</summary>

1986 年 Kajiya 把"某点朝眼睛方向发出多少光"写成一条方程：

$$L_o(x,\ \omega) = L_e(x,\ \omega) + \int_{\Omega} f(x,\ \omega_i,\ \omega)\,L_i(x,\ \omega_i)\,\cos\theta\ \mathrm{d}\omega_i$$

翻译过来：出射光 = 自发光 + 「从半球每个方向来的光 × 表面反射规则 × 余弦权重」的积分。积分号一出现，第 50 章的蒙特卡洛就该上场：按分布随机抽方向 $\omega_i$，算被积函数值，平均就是积分的估计——**一条随机弹射的路径，恰是渲染方程的一次采样**。路径追踪的全部魔法只是"把积分估出来"：无偏、通用、慢得诚实。

</details>

## 9. 下一站

从 1+1 一路走到这里：矩阵搬动物体，投影压平世界，光栅化铺满像素，光照点亮表面，贴图包上外衣，最后反着把光的账查清——图形学的第一圈闭环合拢了。去章节目录看看实战挑战：精灵变身流水线正等着你手算矩阵验收。

→ 返回[章节目录](./index.md)查看实战挑战与本卷全景
