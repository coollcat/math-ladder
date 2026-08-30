---
title: 散度定理与 Stokes：三维的边界定理
lesson_id: multivariable/divergence-stokes
prereqs:
  - multivariable/green-path-integrals
  - multivariable/double-integrals
volume: 2
layer: L7
track:
  - analysis-change
  - geometry-space
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - divergence-theorem
  - surface-flux
  - curl-3d
  - stokes-theorem
applications:
  - electromagnetism
exits:
  - engineering
---

# 散度定理与 Stokes：三维的边界定理

## 1. 从一个场景开始

一栋楼装了集中供暖，物业想知道管道网络**总共给楼里补了多少热气**。挨个房间测漏风量又慢又烦；暖通工程师掏出的账本却只有一行字：**从外墙流出去的暖气总和，等于屋内每一台散热器产热的总和**。隔壁电气工程师验收接地网时用的是同一句话，流体工程师校验水库水量时念的还是它。这句"墙上的账等于屋里的账"，在数学里有两个名字——散度定理和 Stokes 定理，它们都是[路径积分与 Green 定理](./60-green-path-integrals.md)那一课的三维成人礼。

## 2. 直觉解释

回忆 Green 定理的姿态："想知道环流绕着圈走了多少劲？去看圈内每个点的旋涡密度，加总即可。"它说的是同一件事的两面：**边界的账，能换成内部的账**。

把它搬进三维世界，升维有两条路：

- **路 A · 把"区域"从平面变成立体**：平面区域的边界是一条线；立体区域的边界是一个**闭合曲面**。沿曲面累加的不再是"力乘位移"，而是**通量**——单位时间穿过曲面的水量（整个建筑的穿风量）。内部账本变成了散度的体积积分。这条路的终点叫**散度定理**。
- **路 B · 把"边界"从线变成面**：一条空间闭曲线本身不够围住什么，但它可以是一个**张紧曲面**的边缘。曲线上的环量，等于穿过这张面的"旋涡密度磁通"。这条路的终点叫 **Stokes 定理**。

两种读法的口号相同：**要查出口的进出，不必守着墙根点人头，去屋里数生产者就行。**

## 3. 正式定义

| 符号 | 含义 |
| --- | --- |
| $\vec F=(P,Q,R)$ | 三维向量场：每一点放一支箭 |
| $d\vec S=\vec n\,dS$ | 曲面上的有向面元，$\vec n$ 是单位法向 |
| 外法向 | 对封闭曲面而言指离所包实体**之外**的那一侧 |
| $\operatorname{div}\vec F$ | $\dfrac{\partial P}{\partial x}+\dfrac{\partial Q}{\partial y}+\dfrac{\partial R}{\partial z}$：这点的"净流出率" |
| $\operatorname{curl}\vec F$ | 三个偏导拼成的旋涡探针，见下方公式 |

**散度定理**：设 $E$ 是由分片光滑闭曲面 $S$ 围成的立体，则

$$\iint_S \vec F\cdot\vec n\,dS=\iiint_E \operatorname{div}\vec F\,dV.$$

**Stokes 定理**：设光滑曲面 $S$ 以分段光滑闭曲线 $\partial S$ 为边界，绕向与 $\vec n$ 符合右手法则（四指沿边界绕向、拇指即 $\vec n$），则

$$\oint_{\partial S} \vec F\cdot d\vec r=\iint_S (\operatorname{curl}\vec F)\cdot\vec n\,dS,$$

其中 $\operatorname{curl}\vec F=\Big(\dfrac{\partial R}{\partial y}-\dfrac{\partial Q}{\partial z},\ \dfrac{\partial P}{\partial z}-\dfrac{\partial R}{\partial x},\ \dfrac{\partial Q}{\partial x}-\dfrac{\partial P}{\partial y}\Big)$。

三维旋度的第一分量正是上一课的二维旋度 $\dfrac{\partial Q}{\partial x}-\dfrac{\partial P}{\partial y}$ 换了个坐标层戏台登场。两张定理卡片并排放：等号左边永远站在**边界**上（曲面积分或环线积分），右边永远在**内部**求和（体积分或面积分）。

## 4. 分步例题

**例 1 · 放射状风场的球面通量**：$\vec F=(x,y,z)$，$S$ 是单位球面。

1. 先算内部账：$\operatorname{div}\vec F=1+1+1=3$，于是 $\iiint_E 3\,dV=3\times\dfrac43\pi=4\pi$；
2. 再验墙上账：球面上外法向恰是 $\vec n=(x,y,z)$，故 $\vec F\cdot\vec n=x^2+y^2+z^2=1$；
3. 通量 $=\displaystyle\iint_S 1\,dS=$ 球面面积 $4\pi$。两边相等 ✓。

**例 2 · 旋转场的 Stokes 结账**：$\vec F=(-y,x,0)$，取平放在 $xy$ 平面上的单位圆盘，边界是单位圆。

1. 沿逆时针单位圆的环流上一课已算过：参数代入后积得 $2\pi$；
2. 内部账：$\operatorname{curl}\vec F=(0,0,\dfrac{\partial x}{\partial x}-\dfrac{\partial(-y)}{\partial y})=(0,0,2)$；
3. 右手法向下 $\vec n=(0,0,1)$，故 $(\operatorname{curl}\vec F)\cdot\vec n=2$，面积分为 $2\times\pi\times1^2=2\pi$ ✓。

边界线积分麻烦的时候换内幕面积分来算（或反之），这就是这对定理最大的人情味。

## 5. 动手实验

### Python · 给立方体六面记通量流水账

没有现成网页组件能给三维封画作结账演示，这里退到浮窗 Python：把"四面八方穿墙"的账本一行行列出来，画成柱状图，跟内部散度账本当场对数。

```python title="单位立方体的六面通量流水账"
import matplotlib.pyplot as plt  # 绘图库，负责把数字画成图

# 场 F(x,y,z) = (x, y, z)：每一点都沿位置箭头方向流动
faces = ["x=1", "y=1", "z=1", "x=0", "y=0", "z=0"]
fluxes = [1, 1, 1, 0, 0, 0]       # 各面通量：场分量乘外法向后逐面结算

fig, ax = plt.subplots(figsize=(6, 3))   # 新建一张宽 6 高 3 英寸的画布
ax.bar(faces, fluxes,                    # 柱状图：横轴面名、纵轴通量
       color=["#e8871e" if v >= 0 else "#5a8fbb" for v in fluxes])
ax.axhline(0, color="#888", linewidth=0.8)   # 零刻度基线
ax.set_title("F=(x,y,z) 穿过单位立方体各面的通量")
plt.show()                               # 渲染画布
print("六面净通量 =", sum(fluxes))       # sum 把列表所有元素相加
print("散度账本 =", 3 * 1)               # div=3 乘体积 1
```

输出 `六面净通量 = 3`、`散度账本 = 3`：三个正侧面各流出 1，三个背面恰好无处可出——放射状的水流只在"顺风面"离场。把场换成 $(-y,x,0)$ 再跑一遍，你会看到六面全是 0：这种纯打旋的场碰不到任何外墙，它的旋转本领只能走 Stokes 那条路用环流量计费。

## 6. 常见误区

:::warning[常见误区]
- **你以为通量只能是非负数，其实"进来"也记一笔**：某个面上 $\vec F\cdot\vec n<0$ 表示水流穿越方向与外法向相反——是入库不是出库。净通量是六笔正负账的代数和，这正是"账户余额"而非"流水总额"。
- **你以为曲面随便选，其实账要配平**：Stokes 里张在同一闭曲线上的两张曲面答案相同，前提是它们的法向一致地满足右手法则；一旦其中一张翻了面，等号立刻差出一个符号。
- **你以为散度高就是温度高，其实是"开着阀门的程度"**：div 描述此点净喷出的速率密度，恒为负的点更像下水道口（汇聚）。它与场自身大小无关——巨大的均匀平行风可以处处散度为零。
:::

## 7. 练习

下面这份立方体流水账记错了一笔账。先在心里用散度估出净通量该是多少，再把记错的那面改成正确的出入库记账：

```exercise
# @title: 立方体六面通量对账
# @check: -1
# @check: 3
# @check: 4
# @check: 4
# @hint: 散度 = 2 + (-1) + 3，净通量应当和它对上；哪个面对不上就查哪个面——场在 y=1 处的纵向分量是 -1，而这一面的"朝外方向"恰恰是 +y。
# 场 F(x,y,z) = (2x, -y, 3z)；立方体占满 [0,1] 三轴
# 通量 = 场在"朝外方向"上的分量 × 面积（各面面积都是 1）

out_east = 2       # x=1 面：朝外即 +x 方向，场的横向分量 2*1=2
out_west = 0       # x=0 面：朝外即 -x 方向，场的横向分量 2*0=0
out_north = 1      # ← y=1 面：朝外是 +y 方向，可场的纵向分量是 -y……
out_south = 0      # y=0 面：朝外是 -y 方向，场在 y=0 处为 0
out_top = 3        # z=1 面：竖直分量 3*1=3
out_bottom = 0     # z=0 面

net = out_east + out_west + out_north + out_south + out_top + out_bottom
print(out_north)
print(out_top)
print(int(net))

div_total = 2 - 1 + 3      # 散度：三个方向的产出率相加
print(div_total * 1)       # 乘体积 1，这是账本应有的结余
```

<details>
<summary>点开查看逐步解答</summary>

第一步先用最省力的账本定下目标：$\operatorname{div}\vec F=2+(-1)+3=4$，乘体积 1，**净通量必须是 4**。

六面里只有一处能出错：北面（$y=1$）。那里的场纵向分量是 $-y=-1$，而这面的外法向指着 $+y$；两者相乘得**负**——这一面是进口，不是出口。正确记法 `out_north = -1`。

修好后打印：`-1`（北面入库）、`3`（顶面出库）、`4`（净通量）、`4`（散度账本）。四行互相咬合，散度定理当场兑现。顺手体会一下场的设计：横向一头喷一头静、纵向中间吸收、竖直一路抬升——它们搅在一起时，靠肉眼看箭头几乎不可能结账，靠公式却是三秒的事。

</details>

```quiz
用 Stokes 定理把一条闭曲线的环流量改写成曲面积分时，曲面的法向该怎么定？
- 任选一侧都能得到同样的数值
- 让曲线的正绕向和法向符合右手定则，选反了差一个负号 [*]
- 必须选指向上方的那一侧
? 四指沿着曲线的正绕向弯曲，拇指所指即法向。翻转法向相当于把整套定向反过来，结果差一个符号；至于"向上"并不是普遍规定。
```

## 8. 边界与选读

本课把二维的 Green 定理升维成两件三维兵器，完成了"边界账本"家族的收官。但它不解决的问题同样要心里有数：曲面本身的取法种数与"曲面片的截断修补"（洞、多重连通域）需要更细的分类讨论；电磁波的传播、Maxwell 方程组的完整舞台在第 23 章 PDE 才正式搭建；而"任意维边界如何机械生成这些公式"要请微分形式出场，那是研究阶段的另一套语言。此外，这两条定理只管线性叠加的小尺账，湍流那种非线性大戏不在服务范围内。

<details>
<summary>选读 · 为什么散度就该那样定义：小盒子的极限</summary>

把某点附近切成一只棱长 $h$ 的小盒。对 $x$ 向而言，左壁流入约 $P(x-h/2)\,h^2$，右壁流出约 $P(x+h/2)\,h^2$，净流出 $=[P(x+h/2)-P(x-h/2)]h^2\approx \dfrac{\partial P}{\partial x}h^3$。三对壁面同理，合计 $\big(\tfrac{\partial P}{\partial x}+\tfrac{\partial Q}{\partial y}+\tfrac{\partial R}{\partial z}\big)h^3$。除以盒体积 $h^3$ 再令 $h\to0$，每单位体积的净流出率正是散度的定义式——**散度是"盒子缩成一点"过程的极限产物**。散度定理不过是把这个过程反向放大：全空间的无数微盒拼接时，相邻盒子之间的墙面账目两两抵消（同一道墙被两侧各记一笔、符号相反），唯一幸存的就是最外层封闭曲面的大账。Stokes 的来历类似：张面上铺满微小箭头环路，相邻小环的内边相消，只剩外缘一圈。

</details>

## 9. 下一站

Green、散度定理、Stokes 到齐后，"边界读内部"的思想已经三连击成功。下一章让这套场论语言第一次对付真正的难题：随时间演化的温度会怎么渗进一根铁棍？

→ [多元微积分](./index.md)
