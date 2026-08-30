---
title: 可测函数
lesson_id: measure-lebesgue/measurable-functions
prereqs:
  - measure-lebesgue/cantor-outer-measure
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - measurable-function
  - simple-function
  - level-set
applications:
  - signal-thresholding
exits:
  - research
---

# 可测函数

## 1. 从一个场景开始

30 章 50 课我们见识过数学史上著名的恶棍：Dirichlet 函数——有理数处取 1、无理数处取 0。它在任何小区间里上下乱跳，上下和永远差 1，Riemann 积分当场拒收。

可它真有那么坏吗？换个问法："函数值超过 $\tfrac12$ 的那些 $x$ 在哪里？"答案是：全体有理数——上一课刚说过，这是零测集。"函数值低于 $\tfrac12$"呢？无理数，长度 1。**每一个水平切片的尺寸都清清楚楚**。勒贝格的安检口不查函数长什么样，只查水平切片量不量得出大小。

## 2. 直觉解释

看一个函数的新姿势：不看图像，看**等高线**。地形图上每条等高线告诉你"高于这个海拔的地方有多大"；把所有海拔的信息拼起来，整座山就定了。函数也一样：

- 对每个阈值 $t$，考察水平切片 $\lbrace x:f(x)\le t\rbrace$；
- 若这些切片全都可测（都能量出大小），函数就通过安检，叫**可测函数**；
- 通过安检后，积分机器就能用"切片面积"重建"山体体积"——这正是下一课的积分。

哪些常见函数能通过？常数、连续函数、单调函数全部过关；更妙的是，可测函数做加法、乘法、取极限（只要逐点收敛），结果仍然可测——安检一次，终身免检。Dirichlet 函数虽然被 Riemann 拒收，在勒贝格这里却是模范公民。

## 3. 正式定义

**定义（可测函数）**：设函数 $f$ 定义在可测集上。若对每个实数 $t$，水平子图

$$E_t=\lbrace x: f(x)\le t\rbrace$$

都是可测集，则称 $f$ 是**可测函数**。（用 $\lbrace f>t\rbrace$ 或 $\lbrace f\ge t\rbrace$ 作定义完全等价。）

**定义（简单函数）**：只取有限多个值的可测函数。它可以写成"高度 × 地盘"的和：

$$f(x)=\sum_{i=1}^{n}a_i\,\mathbf{1}_{E_i}(x)$$

其中 $\mathbf{1}_{E_i}$ 是指示函数：$x$ 落在地盘 $E_i$ 内取 1，否则取 0；各块地盘 $E_i$ 可测且互不相交。简单函数是勒贝格积分的积木——下一课你会看到整个积分理论就是拿积木搭出来的。

| 函数 | 安检结果 | 理由 |
| --- | --- | --- |
| 连续函数 | 通过 | 切片是闭集/开集，天然可测 |
| 单调函数 | 通过 | 切片是区间 |
| Dirichlet 函数 | 通过 | 切片要么是有理数集要么是无理数集，均可测 |
| 可测函数列的逐点极限 | 通过 | 水平切片对极限封闭 |

## 4. 分步例题

**例**：验证 $f(x)=x^2$ 在 $[-2,2]$ 上可测，并算出几片切片的长度。

1. 任取阈值 $t<0$：切片 $\lbrace x^2\le t\rbrace$ 是空集，测度 0；
2. 取 $t\ge 0$：不等式 $x^2\le t$ 等价于 $-\sqrt{t}\le x\le\sqrt{t}$，切片是闭区间；
3. 切片长度为 $2\sqrt{t}$——例如 $t=1$ 时长 2，$t=4$ 时恰好盖满全定义域长 4；
4. 一切切片都是区间（可测），所以 $x^2$ 可测。顺带发现：切片长度随 $t$ 连续增长，这条"切片长度曲线"就是 $2\sqrt{t}$——记住这个视角，第 40 课算积分时它会变成主角。

## 5. 动手实验

### 实验 1：曲线先上屏

```viz
{
  "type": "plot",
  "title": "抛物线 f(x)=x²",
  "expr": "x^2",
  "xmin": -2,
  "xmax": 2
}
```

这条曲线就是下面切片实验的对象。横轴是原像位置，纵轴是函数值；可测性问题关心的是“低于某个高度”的原像能不能量长度。

### 实验 2：拖动阈值，看水平切片怎么扫过抛物线

```python title="滑块实验：抛物线的水平切片"
# sliders: t=1 [0:4:0.25]
import math                       # 数学库：本课用到开方
import matplotlib.pyplot as plt   # 画图库

xs = []                            # 收集曲线上采样点的横坐标
ys = []
n_samples = 200                    # 在 [-2,2] 上采 200 个点
for k in range(n_samples + 1):
    x = -2 + 4 * k / n_samples     # 均匀撒点
    xs.append(x)
    ys.append(x * x)

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(xs, ys, linewidth=2)

band = []                          # 收集切片内的 x：满足 x*x <= t
for x in xs:
    if x * x <= t:
        band.append(x)
if band:                           # 切片非空才画阴影
    ax.axvspan(band[0], band[-1], color="mistyrose")   # axvspan：给一段横轴刷底色

print(f"阈值 t={t}，切片 [{round(-math.sqrt(t), 3)}, {round(math.sqrt(t), 3)}]，长度 {round(2*math.sqrt(t), 4)}")
ax.set_xlim(-2.2, 2.2)
```

拖动滑块 `t`：粉色阴影就是切片 $\lbrace f\le t\rbrace$。从 0 拉到 4，阴影从一条缝扩张成整个定义域——可测性说的是"每一帧都量得出宽度"。

### 实验 3：简单函数楼梯的精确兜底

```python title="向下取格，搭出有限层楼梯"
n = 2                                  # 二分细分数，格宽为 1/2^n
values = [0.35, 0.72, 0.96]            # 抽查三个函数值
step = 1 / (2 ** n)                    # ** 表示幂：2 ** n 就是 2 的 n 次方
approx_values = []                     # 收集向下取格后的值

for value in values:
    steps_down = math.floor(value / step)   # floor：不超过比值的最大整数
    approx = steps_down * step              # 只用有限格高度近似
    approx_values.append(approx)            # append：把结果接到列表末尾
    print(f"{value} -> {round(approx, 4)}")

print(f"n={n} 时抽查值的格宽为 {step}")
```

`n` 变大时，格宽 $\tfrac1{2^n}$ 变细，每个向下取格值都更贴近原函数。这正是选读里标准构造的数值版：每一层的地盘都可测，积木已经合格。

### 快问快答

```quiz
勒贝格安检口检查一个函数的什么部位？
- 检查函数图像是否连续不断
- 检查每个阈值下方的水平切片集合是否都可测 [*]
- 检查函数值是否有限个
? 可测性是关于水平切片集合的可测性；连续函数一定可测，但连续并不是可测的必要条件。
```

:::warning[常见误区]

**误区一**："可测函数就是能画出来的函数。"
画不出来与可测毫不冲突：Dirichlet 函数的图像在坐标纸上根本没法一笔画出，却完全可测。安检口查的是切片集合的资格，不是你手绘的功夫。

**误区二**："简单函数逼近需要无穷多层，所以简单函数没什么用。"
恰恰相反：无穷层正是由有限层搭起来的。下一课的积分先对简单函数给出公式，再让层数趋于无穷——积木虽小，大厦全靠它。

**误区三**："两个不可测函数加起来还是不可测。"
不一定！$f$ 不可测时，$g=-f$ 同样不可测，但 $f+g=0$ 平安无事。可测性对良好运算封闭，对"负负得正"这类巧合不设防。

:::

## 6. 练习

**练习 1**：下面的程序想打印抛物线切片的长度，但只算了半边：

```exercise
# @title: 练习：水平切片的长度
# @check: 2.0
# @check: 4.0
# @hint: x^2 <= t 的解在原点两侧对称：-sqrt(t) 到 sqrt(t)，总宽是 2*sqrt(t)，不是 sqrt(t)。
import math                     # 开方库

levels = [1, 4]                  # 两个阈值
for t in levels:
    left = -math.sqrt(t)         # 切片左端点
    right = math.sqrt(t)         # 切片右端点
    length = right               # ← 问题在这：切片长度漏了一半？
    print(round(length, 4))      # round(x, 4)：四舍五入到 4 位小数
```

修好后输出 2.0 与 4.0：阈值 4 的切片 $[-2,2]$ 恰好铺满定义域。切片长度关于阈值的关系 $2\sqrt{t}$，就是这条抛物线递给积分器的名片。

**练习 2**：证明两个可测函数之和仍可测（思路提示：$\lbrace f+g\le t\rbrace$ 能否拆成可数个 $\lbrace f\le s\rbrace\cap\lbrace g\le t-s\rbrace$ 的并？）

<details>
<summary>点开查看逐步解答</summary>

关键观察：$f(x)+g(x)\le t$ 当且仅当存在有理数 $q$ 使 $f(x)\le q$ 且 $g(x)\le t-q$（两个不足的误差总能塞进某个有理缝隙）。于是

$$\lbrace f+g\le t\rbrace=\bigcup_{q\in\mathbb{Q}}\Bigl(\lbrace f\le q\rbrace\cap\lbrace g\le t-q\rbrace\Bigr)$$

右边是可数个可测集之交再之并，仍可测。妙处在"借用有理数当中间商"：有理数可数，保证并是可数的。这套"有理数中间商"技巧在测度论里出场率极高。
</details>

## 7. 选读：可测函数的三明治定理

<details>
<summary>选读 · 简单函数的单调爬升</summary>

任何非负可测函数都能写成一路上升的简单函数列的极限。标准构造：把纵轴切成高度 $\tfrac{k}{2^n}$ 的细条，令

$$f_n(x)=\begin{cases}\dfrac{\lfloor 2^n f(x)\rfloor}{2^n}, & 0\le f(x)< n\\[2pt] n, & f(x)\ge n\end{cases}$$

$n$ 加大时条变细、封顶抬高，$f_n$ 从下方逐点爬向 $f$。每个 $f_n$ 只取有限个值，地盘全是切片 $\lbrace f\ge\tfrac{k}{2^n}\rbrace$——可测性代代相传。这个构造把"任意可测函数"化归为"简单函数"，是整座勒贝格大厦的施工电梯。

</details>

## 8. 下一站

积木已备好：简单函数、切片、测度。现在把它们组装成一台新积分机——先分类、后计数，让 Dirichlet 函数也能体面地谈面积。

→ [勒贝格积分思想](./40-lebesgue-integral.md)
