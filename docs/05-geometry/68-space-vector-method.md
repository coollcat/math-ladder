---
title: 空间向量与立体几何：把角度算成点积
lesson_id: geometry/space-vector-method
prereqs:
  - geometry/space-coords
  - geometry/solid-angles
volume: 1
layer: L3
track:
  - geometry-space
stage: secondary-tool
difficulty: 3
introduces_math:
  - math.acos
  - math.asin
  - math.degrees
introduces_builtin:
  - min
  - max
introduces_import: []
---

# 空间向量与立体几何：把角度算成点积

## 1. 从一个场景开始

一个正方体，棱长 1。问：**面对角线与体对角线之间的夹角是多少度？**

拿铅笔在橡皮上比划，或者尝试作辅助线——你会发现空间里"看上去垂直"其实有 60°、70°、90° 三种命。纯几何推理要作一条条辅助线，稍有偏差就推不下去。

但如果把这两个方向写成两根**向量**，答案就是两次点积、一次反余弦的事，而且是精确值，不需要"看出来"。

## 2. 直觉解释

空间里的每个方向都可以用一组坐标表示。这不是新东西——你在坐标纸上用 $(x,y)$ 表示平面上的点，空间里只是多了一个高度的坐标 $z$。

一旦方向变成了三个数，**"夹角"就从几何问题变成了算术问题**。平面向量告诉你：两个方向的夹角可以用它们的点积算出来。空间里一模一样，只是数字从两个变成三个。

这就是坐标法的全部秘密：**不用看图，只管算数**。几何题里那些"作辅助线—找相似—比比例"的表演，全都可以换成加减乘除。

## 3. 正式定义

**空间向量**：$\vec{a} = (a_1, a_2, a_3)$，表示从原点出发指向点 $(a_1,a_2,a_3)$ 的方向与长度。

**模（长度）**：$|\vec{a}| = \sqrt{a_1^2 + a_2^2 + a_3^2}$——两次勾股定理叠在一起。

**数量积（点积）**：$\vec{a}\cdot\vec{b} = a_1b_1 + a_2b_2 + a_3b_3$

两个等价说法，是全部计算的起点：

$$\vec{a}\cdot\vec{b} = |\vec{a}|\,|\vec{b}|\cos\theta \qquad\Longrightarrow\qquad \cos\theta = \frac{\vec{a}\cdot\vec{b}}{|\vec{a}|\,|\vec{b}|}$$

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $\vec{a}=(a_1,a_2,a_3)$ | 空间向量 | 三个分量分别是 $x,y,z$ 方向的位移 |
| $|\vec{a}|$ | 模 | 向量的长度，永远非负 |
| $\vec{a}\cdot\vec{b}$ | 数量积 | 一个实数（不是向量） |
| $\theta$ | 夹角 | $\vec{a},\vec{b}$ 的夹角，范围 $[0,\pi]$ |
| $\vec{n}$ | 法向量 | 与某个平面垂直的向量，平面角的全部钥匙 |

**法向量怎么找**：设平面内两个不共线向量为 $\vec{u},\vec{v}$，令 $\vec{n}=(x,y,z)$ 同时满足

$$\vec{n}\cdot\vec{u} = 0, \qquad \vec{n}\cdot\vec{v} = 0$$

这两个方程是齐次的，三个未知数——解集是一条直线，任取一个非零方向就是法向量。**"设—解—取"三步，是空间几何题最常见的动作。**

## 4. 分步例题

**例 1（异面直线夹角）**：正方体 $ABCD\text{-}A_1B_1C_1D_1$ 棱长 1，求 $A_1C_1$ 与 $BD$ 的夹角。

1. 建系：以 $A$ 为原点，$AB,AD,AA_1$ 分别为 $x,y,z$ 轴；
2. 顶点坐标：$A_1=(0,0,1), C_1=(1,1,1), B=(1,0,0), D=(0,1,0)$；
3. 方向向量：$\overrightarrow{A_1C_1}=(1,1,0)$，$\overrightarrow{BD}=(-1,1,0)$；
4. 点积 $= 1\times(-1)+1\times1+0=0$，所以夹角为 $90°$——用眼睛完全看不出来，算一次就知道。

**例 2（面对角线与体对角线的夹角）**：求 $\overrightarrow{AC}=(1,1,0)$ 与 $\overrightarrow{AC_1}=(1,1,1)$ 的夹角。

1. 点积 $=1+1+0=2$；
2. 模：$|\overrightarrow{AC}|=\sqrt2$，$|\overrightarrow{AC_1}|=\sqrt3$；
3. $\cos\theta = \dfrac{2}{\sqrt2\cdot\sqrt3} = \sqrt{\dfrac{2}{3}} \approx 0.8165$；
4. $\theta \approx 35.26°$。这就是开头那道题的答案——**不是 45°，也不是 30°**。

**例 3（点到平面距离）**：点 $P$ 到过点 $A$、法向量为 $\vec{n}$ 的平面的距离

$$d = \frac{|\overrightarrow{AP}\cdot\vec{n}|}{|\vec{n}|}$$

分子是投影长度，分母把 $\vec{n}$ 归一化——**距离就是"在法向量方向上投影有多长"**。

## 5. 动手实验

先看一个直觉：把同一个数量积公式用在平面与空间，夹角随分量变化的样子。

```viz
{
  "type": "plot",
  "title": "cos θ 随点积/模长乘积变化（θ 越小 cos 越接近 1）",
  "expr": "x/sqrt(1+x^2)",
  "label": "cos θ（设 |a||b| 归一）",
  "xmin": 0,
  "xmax": 10,
  "sliders": [
    { "name": "k", "min": 1, "max": 3, "step": 1, "value": 1 }
  ]
}
```

然后是核心实验：把向量运算写成函数，然后用来算上面三道例题。**改坐标，答案立刻跟着变**——这就是坐标法比作辅助线强的地方。

```python title="空间向量工具箱：加减、点积、模、夹角"
import math                       # math.acos：反余弦，把比值换回角度

def sub(p, q):                    # 向量减法：终点减起点 = 方向向量
    return (p[0] - q[0], p[1] - q[1], p[2] - q[2])

def dot(u, v):                    # 数量积：对应分量相乘再相加
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]

def norm(u):                      # 模：三个分量的平方和开根号
    return math.sqrt(dot(u, u))   # 点积自己 = 模的平方

def angle(u, v):                  # 夹角：先算余弦，再反余弦
    c = dot(u, v) / (norm(u) * norm(v))
    c = max(-1.0, min(1.0, c))    # 浮点误差可能让 c 略微超出 ±1，夹一下更稳
    return math.degrees(math.acos(c))   # math.degrees：弧度换角度

A1, C1 = (0, 0, 1), (1, 1, 1)
B, D = (1, 0, 0), (0, 1, 0)
u = sub(C1, A1)
v = sub(D, B)
print("A1C1 与 BD 的夹角：", round(angle(u, v), 4), "度")

A, C = (0, 0, 0), (1, 1, 0)
w = sub(C, A)
x = sub(C1, A)
print("面对角线与体对角线夹角：", round(angle(w, x), 4), "度")
```

输出 `90.0` 和 `35.2644`。第一题点积恰好为 0（垂直），第二题就是开头那道题的 $35.26°$——**手算与代码互相印证**。

再看"设—解—取"求法向量，这里用解方程组的直觉做法：

```python title="求法向量：与平面内两个向量都垂直"
def cross(u, v):                  # 两向量叉积的方向：与 u、v 都垂直的向量
    return (u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0])

u = (1, 0, 0)                     # 平面 xOy 内的两个方向
v = (0, 1, 0)
n = cross(u, v)
print("法向量：", n)              # 得到 (0, 0, 1)，正是 z 方向
print("与 u 点积：", dot(n, u))
print("与 v 点积：", dot(n, v))
```

两次点积都是 $0$——法向量与平面内所有方向都垂直。**"设 $\vec n=(x,y,z)$ 解两个点积方程"和这个叉积是同一件事**：解出来的那族解的方向，就是叉积的方向。

### 快问快答

```quiz
已知两个非零空间向量，点积等于零说明什么？
- 两个向量一定相等
- 两个向量互相垂直 [*]
- 两个向量的模长相等
? 由 a·b = |a||b|cosθ 可知，非零向量点积为零只能来自 cosθ = 0，也就是夹角 90 度。这是后面所有法向量计算的依据。
```

:::warning[常见误区]

**误区一**："空间里看起来垂直就是垂直。" 
立体图形画在纸上经过了投影，$90°$ 会被画成各种角度，$35°$ 也可能看着像 $90°$。**唯一可信的是算出来的数**——例 1 的 $90°$ 是点积为零算出来的，例 2 的 $35.26°$ 光看图绝对看不出来。

**误区二**："法向量只有一个。" 
满足两个垂直条件的解构成**一整条直线**，$\vec{n}$ 和 $2\vec{n}$、$-\vec{n}$ 都是法向量。求点到平面距离时代入 $\dfrac{|\overrightarrow{AP}\cdot\vec n|}{|\vec n|}$ 会约掉倍数，所以取哪个都不影响答案——但取 $\vec n$ 时别忘了解出来的是方向，不是唯一向量。

**误区三**："线面角可以直接用 $\cos\theta = \dfrac{\vec a\cdot\vec n}{|\vec a||\vec n|}$。" 
那是**直线与法向量**的夹角，而线面角是它与**平面**的夹角，两者互为余角：$\sin\theta_{\text{线面}} = |\cos\theta_{\text{线与法向量}}|$。这里是最容易丢分的地方，务必想清楚再下标。

:::

## 6. 练习

**练习 1**：下面的代码想算 $\overrightarrow{AC}=(1,1,0)$ 与 $\overrightarrow{AC_1}=(1,1,1)$ 的夹角，但结果明显不对。改到输出 `35.2644`（保留四位小数）：

```exercise
# @title: 练习：点积求夹角
# @check: 35.2644
# @hint: cosθ = (a·b)/(|a||b|)——分子是点积，分母是两个模相乘；别把点积算成了模
import math

def dot(u, v):
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]

def norm(u):
    return math.sqrt(dot(u, u))

a = (1, 1, 0)
b = (1, 1, 1)
c = dot(a, b) / (norm(a) * norm(b))    # ← 这里的分母用对了吗？
print(round(math.degrees(math.acos(c)), 4))
```

**练习 2**：求正方体中体对角线与底面所成角。

<details>
<summary>点开查看逐步解答</summary>

体对角线 $\overrightarrow{AC_1}=(1,1,1)$，底面法向量 $\vec n=(0,0,1)$。

线面角与"直线与法向量夹角"互余，所以先算余弦：

$$\cos\theta_{\text{线与}\vec n} = \frac{1}{\sqrt3} \approx 0.5774$$

于是 $\sin\theta_{\text{线面}} = 0.5774$，$\theta_{\text{线面}} \approx 35.26°$。

```python
import math
a = (1, 1, 1)
n = (0, 0, 1)
cos_with_normal = (a[0]*n[0] + a[1]*n[1] + a[2]*n[2]) / math.sqrt(3)
print(round(math.degrees(math.asin(cos_with_normal)), 4))
```

有意思的是，这个角与例 2 的面对角线夹角**数值相同**（都是 $35.26°$），但来源不同——一个是两条线的夹角，一个是线与面的夹角。这正是坐标法的好处：不同的几何问题，落在同一套算术上。
</details>

## 7. 选读：为什么点积能算出夹角

<details>
<summary>选读 · 余弦定理的一次改写</summary>

在平面里，设 $\vec a, \vec b$ 起点相同，夹角为 $\theta$。由余弦定理

$$|\vec a - \vec b|^2 = |\vec a|^2 + |\vec b|^2 - 2|\vec a||\vec b|\cos\theta$$

左边展开坐标形式：

$$|\vec a-\vec b|^2 = (a_1-b_1)^2+(a_2-b_2)^2+(a_3-b_3)^2 = |\vec a|^2+|\vec b|^2-2(a_1b_1+a_2b_2+a_3b_3)$$

两边对照，立刻得到

$$\vec a\cdot\vec b = |\vec a||\vec b|\cos\theta$$

**点积的代数定义（分量相乘求和）与几何定义（模乘余弦）是同一件事的两种写法。** 这条桥一搭好，几何里所有关于角度、距离的问题就都可以翻译成坐标运算——这也是第 11 章「向量」会系统展开的内容，那里你会看到它如何长成矩阵和线性变换。
</details>

## 8. 下一站

有了坐标法，空间里的距离与角度都不再需要"看出来"。但还有一个更难的问题在等着：**一个点到球面的距离、球面上的最短路径怎么算？** 那需要把球面自己的坐标系搭起来。

→ [球的截面、球面距离与外接球](./70-sphere-circum.md)
