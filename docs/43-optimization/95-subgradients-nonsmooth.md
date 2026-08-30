---
title: 次梯度与非光滑优化：L1 的几何
lesson_id: optimization/subgradients-nonsmooth
prereqs:
  - optimization/convexity
  - optimization/gradient-descent
volume: 5
layer: L7
track:
  - optimization-control
  - information-learning
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - subgradient
  - subdifferential
  - soft-threshold-operator
applications:
  - lasso-sparsity
  - robust-statistics
exits:
  - ml-math/linear-regression
---

# 次梯度与非光滑优化：L1 的几何

## 1. 从一个场景开始

把一块 V 形折纸立在桌上，你盯着折缝底端问自己："这里是最低点吗？"脚下的地面是两条斜坡拼成的尖角——左边朝上、右边也朝上，可在正下方，"坡度"这个词失灵了：它同时拥有两个方向的坡，谁的坡度也不该代表全体。

这正是 $f(x)=\lvert x\rvert$ 在原点的处境。梯度下降（第 30 课）要求每点都有明确的下坡方向，可函数在最关键的谷底偏偏不可导。机器学习里最有名的稀疏化工具 **L1 正则** $\lambda\lvert w\rvert$ 把同样的尖角铺满了整个参数空间——如果连方向都算不出，凭什么它能训练？

本课给出答案：尖点不是绝境，而是一个**装着一整筒指南针的地方**。

## 2. 直觉解释

光滑的山坡上，每个点只有一个合法的"坡度报告"：切线斜率 $f'(x)$。而在尖点上，任何一条从左侧斜率过渡到右侧斜率之间的斜线，都满足同一件事——**整条线贴着函数的下沿躺平**（画出来试试：过 $(0,0)$、斜率 0.4 的直线全程压在 $\lvert x\rvert$ 下面）。

这些"合法斜率"的全体就叫**次梯度**。对 $\lvert x\rvert$ 的原点来说，一切介于 $-1$ 与 $1$ 之间的斜率都是合法报告，于是那里有一整筒指南针：

$$\partial \lvert x\rvert \big|_{x=0} = [-1,\,1]$$

要在谷底站稳，只需筒里能翻出一只指向零坡度的指南针——即 $0\in\partial f(x)$。这句话就是光滑世界"$f'(x)=0$ 才能驻留"的非光滑版本，而且一出生就自带全局保证（凸函数专用）。至于"把权重推到零上钉死"的稀疏魔法，答案同样藏在尖角的平坦筒底里——第 5 节实验将亲手拧出这颗螺钉。

## 3. 正式定义

设 $f$ 是凸函数，$g$ 是 $f$ 在点 $x$ 处的一个**次梯度**当且仅当：

$$f(y)\;\ge\; f(x) + g\,(y-x) \quad \text{对所有 } y \text{ 成立}$$

右边那条直线叫**支撑线**：无论从哪儿看，它都躺在函数图像下方且恰好在 $x$ 处相接。全部次梯度的集合记作 $\partial f(x)$，称为**次微分**。

| 记号 | 名字 | 光滑点/尖点的表现 |
| --- | --- | --- |
| $\partial f(x)$ | 次微分（一个集合） | 光滑时退化为单点 $\lbrace f'(x)\rbrace$ |
| $g\in\partial f(x)$ | 一根合法指南针 | 尖点处是一整个区间 |
| $0\in\partial f(x)$ | 全局最小的充要条件（凸） | 无需可导 |
| 支撑线 | $f(y)\ge f(x)+g(y-x)$ | 碗的下方、顶点相接 |

三个立刻能用的事实：

1. $\lvert x\rvert$ 在 $x>0$ 处 $\partial=\lbrace 1 \rbrace$、在 $x<0$ 处 $\partial=\lbrace -1 \rbrace$、在 $0$ 处 $\partial=[-1,1]$；
2. 多个凸函数相加，次微分逐个收集再合并：$\lvert w\rvert+\dfrac12(cw-b)^2$ 在 $w=0$ 处的次微分区间的中心由数据决定，两端仍由 $\pm1$ 掌管；
3. **判定最优不再需要除法，只需要查成员**：$0$ 在不在那个集合里。

## 4. 分步例题

求 $\min f(w)=\lvert w\rvert+\dfrac{(c\,w-b)^2}{2}$ 的最优解（$c,b$ 是常数），并观察 L1 的影子。

1. 分段扫平：当 $w>0$ 时 $f'(w)=1+c(cw-b)$；当 $w<0$ 时 $f'(w)=-1+c(cw-b)$，两段各自光滑、可以正常置零；
2. 报出原点的次微分：$\partial f(0)=[-1,1]+c(cb)$，即以 $t=c\,b$ 为中心、宽为 $[-1,1]$ 的区间 $[t-1,\,t+1]$；
3. 判定：若 $\lvert t\rvert\le1$，则 $0\in\partial f(0)$，**$w^\ast=0$ 就是全局最小**——任何正或负的一小步都会同时抬高 |w| 和二次项的一部分；
4. 若 $t>1$（或 $t<-1$），原点筒里没有零坡度，必须离开尖角回到光滑段求解：$w^\ast=t-\lambda^{\ast}$ 形如 $\operatorname{sign}(t)\,\max(\lvert t\rvert-1,\,0)$——这就是**软阈值算子**的原型；
5. 结论：数据证据不够强（$\lvert t\rvert\le1$）时，最优点被尖角**吸在零上**。"有的系数干脆为零"这件事从猜想变成了两行不等式的必然。

## 5. 动手实验

### 实验 1（python）：尖点上的一筒指南针

```python title="拖动 x0 和斜率 g，看支撑线是否始终躺在 |x| 下方"
# sliders: x0=0 [-3:3:0.25], gg=-0.75 [-1:1:0.25]
import matplotlib.pyplot as plt

xs = []
pts = []
for i in range(121):                             # range(121)：i 依次取 0 到 120
    x = -6 + i * 0.1                             # 从 -6 均匀走到 6
    xs.append(x)
    pts.append(abs(x))                           # abs 内置函数：绝对值（第 5 章引入）

base = abs(x0)                                   # 切点的函数值
support = []                                     # 支撑线的纵坐标
for x in xs:
    support.append(base + gg * (x - x0))

plt.plot(xs, pts, linewidth=3, label="f(x)=|x|")
plt.plot(xs, support, linestyle="--", label="support line")
plt.scatter([x0], [base], color="tomato", zorder=5)
plt.legend()
plt.grid(True)
```

怎么玩：只要滑杆 gg 落在 $[-1,1]$ 区间内，虚线就全程不冒头——它是合法的次梯度支撑线。把 gg 拖到 $-1$ 或 $1$ 以外再跑一次：虚线的某一侧立刻翘到红线上方，宣告非法。再单独把 x0 停在 0、gg 停在 0：水平虚线贴住谷底，这就是 $0\in\partial f(0)$ 的画面。

### 实验 2（python）：软阈值曲线与"精确归零"

```python title="W(t)=sign(t)*max(|t|-lam,0)：lam 越大，归零的平台越宽"
# sliders: lam=1 [0:2.5:0.1]
import matplotlib.pyplot as plt

def soft(t, lam):
    if abs(t) <= lam:                            # 数据证据不足：直接归零
        return 0
    if t > 0:                                    # 证据偏正：减掉门槛后保留
        return t - lam
    return t + lam                               # 证据偏负：对称处理

ts = []
ws = []
ids = []                                         # 对照组：普通的最小二乘解 t
for i in range(101):                             # range(101)：i 依次取 0 到 100
    t = -5 + i * 0.1
    ts.append(t)
    ws.append(soft(t, lam))
    ids.append(t)

plt.axhline(0, color="gray", linewidth=0.8)      # 补一条水平参考线
plt.plot(ts, ids, linestyle="--", color="gray", label="no penalty (t)")
plt.plot(ts, ws, linewidth=2.5, label=f"L1 solution (lam={lam})")
plt.xlabel("t (unconstrained fit)")
plt.ylabel("solved weight")
plt.legend()
plt.grid(True)
```

怎么玩：lam=0 时橙线与灰虚线重合（没有惩罚）；lam=1 时 $t$ 在 $[-1,1]$ 的整段全被压成**严格的 0**，只有证据够强的分量才带着缩短量出场。对照第 20 课的直觉——L2 惩罚是把每个系数按比例缩小、永不精确为零；L1 惩罚把一批系数**一刀切零**，这就是稀疏性。软件工程视角：`soft` 正是近端算法里 $\lambda\lvert\cdot\rvert$ 的近端映射，实战求解器每天都在调用它。

### 快问快答

```quiz
在 |x| 的原点处，"存在一个次梯度等于 0"意味着什么？
- 原点是全局最小点 [*]
- 原点是局部极大点
- 函数在此处其实可导
? 次微分区间的中心恰好在 -1 到 1 之间扫过 0，说明左右两侧的下坡合力互相抵消，任何挪动都不降反升。凸函数世界里这一条就是全局最优的通行证。
```

:::warning[常见误区]

**误区一**："你以为不可导就没法优化。" 可导只是"方向唯一"的特权标志；次微分用集合补全了方向账本，判优条件从 $f'=0$ 升级成 $0\in\partial f$，照样运行。

**误区二**："你以为拿次梯度集合的平均值走一步最稳妥。" 在 $\lvert x\rvert$ 的原点平均恰好得到 0，看似聪明实则原地踏步——集合里的数字不是拿来平均的步长表，而是用来做成员判定的候选说明书。

**误区三**："你以为 L1 只是让权重'变小一点'。" 观察软阈值曲线：平台处的值精确等于 0，不是"接近"。这是尖角的几何馈赠——证据不足的最优解干脆住在尖点上。

:::

## 6. 练习

**练习 1**（概念口答）：二维尖角 $f(x,y)=\lvert x\rvert+\lvert y\rvert$ 在原点的次微分长什么样？用几句话画出它的形状。

<details>
<summary>点开查看逐步解答</summary>

两个尖角叠加，次微分各自贡献一个区间再整体组合：$\partial f(0,0)=[-1,1]\times[-1,1]$——一个实打实的**正方形**。横向挪动的合法斜率范围由第一维负责，纵向由第二维负责。有趣的是在点 $(0,1)$ 处变成 $[-1,1]\times\lbrace 1\rbrace$：光滑维收成单点、尖点维保持区间。判定 $(0,0)$ 是最小点只需检查坐标 $(0,0)$ 是否属于该正方形——显然属于。
</details>

**练习 2**（判题）：把练习目标写成通用形式：一维最小二乘加上 L1 惩罚后，闭式解是软阈值算子 $W(t)=\operatorname{sign}(t)\cdot\max(\lvert t\rvert-\lambda,\,0)$。下面的实现只抄对了正的一半，负半轴全被吞掉了——修复它并输出三条结果。

```exercise
# @title: 练习：给负半轴把丢失的一半找回来
# @check: 3
# @check: -3
# @check: 0
# @hint: abs(t)-lam 决定"是否归零"，t 的符号决定"留下正还是负"；一行式 max(t-lam, 0) 把负数证据一律拍成了 0。
def soft(t, lam):
    return max(t - lam, 0)          # ← 问题在这：只处理了正半轴的逻辑

print(round(soft(5, 2)))
print(round(soft(-5, 2)))
print(round(soft(5, 5)))
```

修复方向是拆成三支：$\lvert t\rvert\le\lambda$ 时归零；$t>0$ 时返回 $t-\lambda$；$t<0$ 时返回 $t+\lambda$。修好后输出 `3`、`-3`、`0`——正值削减 2 剩 3，负值对称地剩 $-3$，证据恰好等于阈值时踩在尖点上精确输出 0。初版第一行侥幸正确、负半轴全军覆没：对称性丢一半，L1 的判零平台就歪了。

**练习 3**（选做）：把例题里的 $\lambda$ 也当成变量重算 $\partial f(0)$，说明 $\lambda$ 增大如何改变"判零门槛"。

<details>
<summary>点开查看逐步解答</summary>

$\lvert w\rvert$ 在原点的次微分换成 $[-\lambda,\lambda]$，于是判零条件变成 $\lvert t\rvert\le\lambda$。惩罚越重、合法筒越宽、越多系数被判零——调节 $\lambda$ 就是在拧"稀疏水龙头"，与软阈值平台的宽度 $2\lambda$ 相互印证。
</details>

## 7. 边界与适用条件

- 次梯度下降虽可用，但固定步长只在邻域徘徊、递减步长才有 $O(1/\sqrt{k})$ 慢速收敛——比光滑世界的表现糙得多；实战多改用近端方法配合分块光滑部分。
- "$0\in\partial f$"的等价性靠**凸性**背书：非凸函数上一个零次梯度点只是驻点，可能是假山谷。
- 本课的定义针对凸函数；更一般的局部 Lipschitz 函数有 Clarke 次微分等推广，思想一致但技术条款增多。
- 收集次微分时不许乱套链式法则：合成函数的次微分链式规则只在温和条件下成立，随手展开可能漏项。

## 8. 选读：为什么支撑线总是存在

<details>
<summary>选读 · 上图的分离平面一瞥</summary>

把函数图像上方的区域 $\mathrm{epi}(f)=\lbrace (y,s): s\ge f(y)\rbrace$ 当成一个凸集合（凸函数弦不等式的直接翻译）。在边界点 $(x,f(x))$ 上，凸集分离定理说总存在一张过该点、把整个上图推在一侧的平面；只要它在 $x$ 处不竖直，就能写成 $s=f(x)+g(y-x)$ 的形态——系数 $g$ 即次梯度。因此支撑线的存在性其实是"凸集可以被平面托住"这件事的函数版表述。数据科学里常见的合页损失、绝对偏差损失都是这一节定义下的常客：光滑部分拿梯度，尖角部分查名单，两边合流就能继续下山。

</details>

## 9. 下一站

尖角归档之后，优化章还剩最后一块拼图：当数据由看不见的隐变量产生，似然里 log 裹着"和"，连梯度都写不干净。下一课看 EM 算法怎么用「软指派 + 闭式更新」这对坐标上升把最后这座山登完——它也是生成模型里 ELBO 的祖先。至于 L1 与平方损失合体的 LASSO 战场，改天在第 45 章线性回归里再会。

→ [EM 算法：隐变量的坐标上升](./96-em-coordinate-ascent.md)
