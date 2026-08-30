---
title: 齐次坐标与仿射变换
lesson_id: graphics/homogeneous-affine
prereqs:
  - linalg/matrix
  - linalg/vectors
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
  - homogeneous-coordinate
  - affine-transform
applications:
  - game-engine
  - cad-software
exits:
  - graphics/perspective-projection
---

# 齐次坐标与仿射变换

## 1. 从一个场景开始

游戏引擎每秒要做上千万次这样的操作：把精灵**平移**到新位置，再**旋转**一个角度，顺便**缩放**一下。平移、旋转、缩放——三个动作听起来像一家人，可第 11 章的矩阵只认得后两个：旋转和缩放是线性变换，能用矩阵乘法一口气完成；**平移不行**——没有任何 2×2 矩阵能把所有点都挪动同一个位移。

工程师的解法优雅到近乎调皮：给每个点多加一个坐标。二维点 $(x,y)$ 写成三胞胎 $(x,y,1)$，平移瞬间就变成了矩阵乘法。这个"加一张门票"的小动作叫齐次坐标，它是整个图形学的地基。

## 2. 直觉解释

为什么平移进不了矩阵的门？矩阵乘法是"过原点的动作"：原点乘任何矩阵还是原点。而平移恰恰要把**原点本身也搬走**——血统不合。

齐次坐标的妙计：升到三维找帮手。把点写成 $(x, y, 1)$，第三位固定为 1，然后：

- 旋转、缩放的 2×2 矩阵扩成 3×3（左上角原样照搬）；
- 平移写成 $\begin{pmatrix}1&0&t_x\\ 0&1&t_y\\ 0&0&1\end{pmatrix}$——位移藏在最后一列。

验算：$\begin{pmatrix}1&0&t_x\\0&1&t_y\\0&0&1\end{pmatrix}\begin{pmatrix}x\\y\\1\end{pmatrix} = \begin{pmatrix}x+t_x\\ y+t_y\\ 1\end{pmatrix}$ ✓ 平移成了矩阵乘法！

从此三种动作统一成一种语言：任何一串变换 = 一串矩阵相乘 = **一个矩阵**。引擎只需为每个物体存一个 3×3 矩阵（三维场景是 4×4），世界立刻清爽。

## 3. 正式定义

**齐次坐标**：二维点 $(x,y)$ 对应三元组 $(x,y,w)$，其中 $w\neq0$；约定取 $w=1$ 表示"点"，$(x,y,0)$ 表示"方向向量"。还原时除以 $w$：$(x/w,\ y/w)$。

**仿射变换** = 线性部分 + 平移部分：

$$\begin{pmatrix}a&c&t_x\\ b&d&t_y\\ 0&0&1\end{pmatrix}\begin{pmatrix}x\\y\\1\end{pmatrix}=\begin{pmatrix}ax+cy+t_x\\ bx+dy+t_y\\ 1\end{pmatrix}$$

| 基本矩阵 | 形式 | 作用 |
| --- | --- | --- |
| 平移 T | 位移在最后一列 | 整体搬家 |
| 缩放 S | 对角线放缩放系数 | 拉伸 |
| 旋转 R(θ) | 左上角放 cos/sin 组合 | 绕原点转 |

$$R(\theta)=\begin{pmatrix}\cos\theta & -\sin\theta & 0\\ \sin\theta & \cos\theta & 0\\ 0&0&1\end{pmatrix}$$

**组合规则**：先作用的写右边。$M = T \cdot R \cdot S$ 表示先缩放、再旋转、最后平移——矩阵从右往左念，像读右到左的古文。

## 4. 分步例题

**例**：把点 $(2, 1)$ 先绕原点旋转 90°，再平移 $(3, 0)$。求终点并写出合成矩阵。

1. 写旋转矩阵（θ=90°）：cos=0、sin=1，得 $R=\begin{pmatrix}0&-1&0\\1&0&0\\0&0&1\end{pmatrix}$；
2. 写平移矩阵：$T=\begin{pmatrix}1&0&3\\0&1&0\\0&0&1\end{pmatrix}$；
3. 先旋转：$R\begin{pmatrix}2\\1\\1\end{pmatrix}=\begin{pmatrix}-1\\2\\1\end{pmatrix}$；
4. 再平移：结果加 $(3,0)$ 得 $\begin{pmatrix}2\\2\\1\end{pmatrix}$；
5. 合成矩阵：$M=T\cdot R=\begin{pmatrix}0&-1&3\\1&0&0\\0&0&1\end{pmatrix}$——一次乘法顶两步。

检查量级：旋转把点转到了第二象限 $(-1,2)$，再向右挪 3 格落回第一象限 $(2,2)$，几何直觉吻合。

## 5. 动手实验

### 实验 1（viz）：线性部分的舞台

```viz
{
  "type": "matrix",
  "title": "矩阵变换演示器：注意，平移不在这里！",
  "a": 0,
  "b": -1,
  "c": 1,
  "d": 0
}
```

怎么玩：拖动 a、b、c、d 四个滑杆改变左上角 2×2 线性块，网格和小房子跟着变形；点「左转90°」按钮正是例题里的 R。无论怎么拖，**房子永远绕着原点转、原点纹丝不动**——这就是线性变换的天花板。平移必须请齐次坐标出场。

### 实验 2（python）：手写矩阵流水线，让精灵走位

```python title="平移+旋转流水线（纯循环实现矩阵乘法）"
import math
import matplotlib.pyplot as plt

# sliders: ang_deg=90 [0:360:15]

th = math.radians(ang_deg)
R = [[math.cos(th), -math.sin(th), 0],
     [math.sin(th),  math.cos(th), 0],
     [0,             0,            1]]      # 行向量写法的旋转矩阵
T = [[1, 0, 3],
     [0, 1, 0],
     [0, 0, 1]]                              # 平移 (3, 0)

sprite = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]]   # 一个小 L 形精灵

def transform(pt, mats):                     # def：自定义函数（出生证明在第 8 章）
    v = [pt[0], pt[1], 1]                    # 齐次坐标：补上第三位 1
    for m in mats:                           # 依次过每一道工序
        out = []
        for row in range(3):
            s = 0
            for col in range(3):
                s = s + m[row][col] * v[col] # 矩阵乘向量：行乘列再求和
            out.append(s)
        v = out
    return [v[0], v[1]]

oxs = sprite + [sprite[0]]
oX = [p[0] for p in oxs]
oY = [p[1] for p in oxs]

nxs = []
for p in sprite:
    q = transform(p, [R, T])                 # 先 R 后 T：列表顺序即作用顺序
    nxs.append(q)

nxs.append(nxs[0])
nX = [p[0] for p in nxs]
nY = [p[1] for p in nxs]

plt.plot(oX, oY, linestyle="--", label="before")
plt.plot(nX, nY, label="after")
plt.scatter([0], [0], color="black")         # 原点参照物
plt.legend()
plt.axis("equal")                    # equal：两轴等比例，旋转形状不变形
plt.grid(True)
```

怎么玩：拖动 ang_deg，虚线精灵绕原点旋转后整体右移 3 格——两道工序被 `transform` 函数串成流水线。把 `[R, T]` 改成 `[T, R]` 再跑：结果不同了！先执行的平移会被后面的旋转"甩个方向"，位移本身也被转了 90°——这正是组合顺序不可交换的具象化。

### 实验 3（python）：绕任意点旋转 = 三明治组合

```python title="绕精灵自身中心 (1,1) 旋转的正确姿势"
import math
import matplotlib.pyplot as plt

# sliders: ang_deg=45 [0:180:5]

th = math.radians(ang_deg)
c, s = math.cos(th), math.sin(th)
T_to =   [[1, 0, -1], [0, 1, -1], [0, 0, 1]]   # 把中心挪到原点
R_mat =  [[c, -s, 0], [s, c, 0],  [0, 0, 1]]   # 在原点旋转
T_back = [[1, 0, 1],  [0, 1, 1],  [0, 0, 1]]   # 把中心送回去

sprite = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]]

def transform(pt, mats):
    v = [pt[0], pt[1], 1]
    for m in mats:
        out = []
        for row in range(3):
            acc = 0
            for col in range(3):
                acc = acc + m[row][col] * v[col]
            out.append(acc)
        v = out
    return [v[0], v[1]]

old_x = []
old_y = []
new_x = []
new_y = []
for p in sprite + [sprite[0]]:
    old_x.append(p[0])
    old_y.append(p[1])
    q = transform(p, [T_to, R_mat, T_back])    # 三明治：挪过去→转→挪回来
    new_x.append(q[0])
    new_y.append(q[1])

plt.plot(old_x, old_y, linestyle="--", label="before")
plt.plot(new_x, new_y, label="after")
plt.scatter([1], [1], color="tomato")          # 旋转中心
plt.legend()
plt.axis("equal")                    # equal：两轴等比例
plt.grid(True)
```

怎么玩：默认 45° 时精灵原地自转、中心红点不动。"绕任意点旋转"从来不是新变换，而是三个基本动作的固定三明治——引擎里所有花哨的关节动画都建立在这个套路上。

### 快问快答

```quiz
为什么 2x2 矩阵无论如何组合都做不出"平移"？
- 因为平移不是线性变换，而矩阵乘法必然保持原点不动 [*]
- 因为 2x2 太小装不下两个位移数
- 只要换一种乘法规则就可以
? 矩阵乘法是过原点的动作，原点乘任何矩阵仍是原点；平移要搬走原点本身，血统不合。升维加 w=1 之后，位移才有地方藏。
```

:::warning[常见误区]

**误区一**："你以为矩阵组合顺序无所谓。" $T\cdot R \neq R\cdot T$：先平移再旋转，位移会被旋转带着跑。口诀只有一句——**从右往左念**，最右边先作用。

**误区二**："你以为第三位恒为 1 所以是废笔。" 眼下它确实总输出 1，但下一课透视投影里它会变成除法的分母——齐次坐标的真正威力到那时才亮出来。

**误区三**："你以为 $(x,y,2)$ 是另一个点。" 它与 $(x,y,1)$ 表示同一个二维位置（还原时都要除以 w）；约定用 w=1 只是为了省掉那步除法。

:::

## 6. 练习

**练习 1**：点 $(1, 0)$ 先绕原点旋转 90°，再平移 $(2, 0)$。求终点坐标（打印 x 和 y 两行整数）。代码能跑但工序装反了：

```exercise
# @title: 练习：先转还是先搬？
# @check: 2
# @check: 1
# @hint: 引擎语义是"先旋转、后平移"；对照代码里 mats 列表的顺序——列表里靠前的先作用。
import math

th = math.radians(90)
c, s = round(math.cos(th)), round(math.sin(th))   # 90 度时 cos=0, sin=1

def apply(m, pt):                       # m 是 2x3 仿射矩阵（最后一列是平移）
    x = m[0][0] * pt[0] + m[0][1] * pt[1] + m[0][2]
    y = m[1][0] * pt[0] + m[1][1] * pt[1] + m[1][2]
    return [round(x), round(y)]

R = [[c, -s, 0], [s, c, 0]]             # 旋转（无平移部分）
T = [[1, 0, 2], [0, 1, 0]]              # 平移 (2, 0)

mats = [T, R]                            # ← 问题在这：顺序反了
p = apply(mats[0], [1, 0])
p = apply(mats[1], p)
print(p[0])
print(p[1])
```

改对后输出 2 和 1：正确次序是先旋转得 $(0,1)$，再向右挪 2 得 $(2,1)$。装反时会得到 $(0,3)$——平移先执行，旋转把那段位移甩到了 y 轴正方向。

**练习 2**：写出"先缩放 2 倍、再绕原点逆时针转 90°、最后平移 $(10, 5)$"的合成 3×3 矩阵（手算每个元素）。

<details>
<summary>点开查看逐步解答</summary>

按从右往左：$M=T\cdot R\cdot S$。

$$S=\begin{pmatrix}2&0&0\\0&2&0\\0&0&1\end{pmatrix},\quad R\cdot S=\begin{pmatrix}0&-2&0\\2&0&0\\0&0&1\end{pmatrix},\quad M=\begin{pmatrix}0&-2&10\\2&0&5\\0&0&1\end{pmatrix}$$

规律：合成后左上角 2×2 是各线性块的乘积，最后一列直接继承最后的平移量。
</details>

**练习 3**：方向向量用 $(x,y,0)$ 表示。用它过平移矩阵会得到什么？这解释了什么现象？

<details>
<summary>点开查看逐步解答</summary>

$(x,y,0)$ 过任何仿射矩阵，第三位保持 0，且**最后一列的位移加不上来**（乘的是 0）——方向向量只被旋转/缩放，从不被平移。这正是图形学区分"点"与"向量"的机制：法线、光照方向的计算因此天然免疫物体的摆放位置。
</details>

## 7. 边界与适用条件

- 齐次坐标的除法还原要求 $w \neq 0$；$w=0$ 的"无穷远点"在射影几何里有身份，但在渲染管线里对应"视线平行"，需要近平面裁剪兜底（下一课）。
- 仿射变换保持平行与比例，但不保角度与长度；需要保距的是刚体变换（旋转+平移，缩放系数为 1）。
- 本课全部用列向量右乘约定；DirectX 等采用行向量左乘，矩阵互为转置，读外部代码先确认阵营。

## 8. 选读：w 分量的前世今生

<details>
<summary>选读 · 从射影几何到显卡寄存器</summary>

齐次坐标诞生于 19 世纪的射影几何：给平面每点配一族等价三元组，"无穷远"从此有了代数地址。图形学 1970 年代把它接进管线时看中的正是两点——平移可矩阵化，投影可用同一个 w 除法表达。

现代 GPU 里，顶点着色器输出的就是四元组 $(x,y,z,w)$；硬件对前三个分量统一除以 w（透视除法），一个电路同时完成"归一化"与"近大远小"。当年为绕开"平移不合群"发明的门票，最终成了整条管线的出口闸门——数学工具常常这样，为 A 而生，却成全了 B。

</details>

## 9. 下一站

物体已经在正确的世界位置上站好。接下来轮到相机：三维场景如何被压扁成一张二维照片？答案是一组相似三角形，外加一次著名的除法。

→ [相机视图与透视投影](./20-perspective-projection.md)
