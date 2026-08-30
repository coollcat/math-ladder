---
title: 三角形光栅化与重心坐标
lesson_id: graphics/rasterization-barycentric
prereqs:
  - graphics/perspective-projection
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
  - rasterization
  - barycentric-coordinate
applications:
  - gpu-pipeline
  - font-rendering
exits:
  - graphics/bezier-curves
---

# 三角形光栅化与重心坐标

## 1. 从一个场景开始

上一课结束时，游戏里的每个三角形都还带着三个"漂浮在连续空间里"的顶点。而你的屏幕是刚硬的像素网格：一块 4K 屏有八百多万个格子，每格只能填一种颜色。

从"三个顶点"到"哪些像素亮、各亮什么颜色"，这一步叫**光栅化**（rasterization）。它是 GPU 每秒重复数十亿次的基本功，核心只有两个问题：**这个像素在不在三角形内？在的话，三个顶点的属性怎么按比例分给它？**

## 2. 直觉解释

先回答"在不在"。三角形有个好脾气：它完全由三条边围成。站在任意一条边上看，三角形内部永远在同一侧——于是规则诞生：**一个点在三角形内 ⇔ 它对三条边都站同一侧**。"侧"怎么判定？第 11 章的叉积一句话搞定：叉积的正负就是左右手性。

再回答"分多少"。想象三角形是三脚架吊起的一块调色板，三个顶点各提一桶颜料。板内任一点 P 离哪个顶点的"势力范围"近，就多蘸谁的色。数学上这组比例叫**重心坐标** $(\alpha,\beta,\gamma)$，几何身份极其漂亮：

$$\alpha = \frac{\text{三角形 } PBC \text{ 的面积}}{\text{三角形 } ABC \text{ 的面积}}$$

P 越靠近 A，子三角形 PBC 占比越大、α 越接近 1——"离谁近听谁多"。三个数恒满足 $\alpha+\beta+\gamma=1$，且 P 的坐标可以写成配方：

$$P = \alpha A + \beta B + \gamma C$$

颜色、深度、法线……任何逐顶点属性都用同一组权重插值。一个三角形被拍成百万个像素，每个像素只是这三个数字的不同配方。

## 3. 正式定义

设三角形顶点 $A, B, C$（逆时针），点 $P$。定义**边函数**（二维叉积）：

$$E_{AB}(P) = (B_x-A_x)(P_y-A_y) - (B_y-A_y)(P_x-A_x)$$

- $E_{AB}, E_{BC}, E_{CA}$ **同号**（全正或全负）⇔ P 在三角形内；
- 全三角形面积 $S = \dfrac{1}{2}E_{AB}(C)$。

**重心坐标**：

$$\alpha=\frac{E_{BC}(P)}{2S},\qquad \beta=\frac{E_{CA}(P)}{2S},\qquad \gamma=\frac{E_{AB}(P)}{2S}$$

| 性质 | 内容 |
| --- | --- |
| 归一化 | $\alpha+\beta+\gamma=1$ |
| 顶点取值 | 在 A 处 $(\alpha,\beta,\gamma)=(1,0,0)$，其余类推 |
| 外点 | 有负分量；符号恰好用于内外测试 |
| 插值 | 属性 $\phi(P)=\alpha\phi_A+\beta\phi_B+\gamma\phi_C$ |

## 4. 分步例题

**例**：$A(0,0), B(4,0), C(0,4)$，求 $P(1,1)$ 的重心坐标。

1. 总面积：$S = \dfrac12|AB\times AC| = \dfrac12\times4\times4=8$；
2. α（对顶点 A）：子三角形 PBC 面积 $=\dfrac12|(B-P)\times(C-P)|=\dfrac12|(3,-1)\times(-1,3)|=\dfrac12(9-1)=4$；
3. β（对顶点 B）：PCA 面积 $=\dfrac12|(C-A)\times(P-A)|=\dfrac12|0\times1-4\times1|=2$；
4. γ：直接用归一化 $\gamma = 1-0.5-0.25=0.25$；
5. 验算配方：$0.5A+0.25B+0.25C=(1,1)$ ✓。

结论：P 的颜色 = 一半听 A、四分之一听 B、四分之一听 C。

## 5. 动手实验

### 实验 1（viz）：三角形被顶点完全决定

```viz
{
  "type": "triangle",
  "title": "拖动三个顶点：三角形的一切随之改变"
}
```

怎么玩：拖动三个彩色顶点，三个内角实时重算。光栅化眼里没有别的信息——只有这三个位置；顶点一动，"哪些像素算内部、颜色怎么分"全部跟着重排。先建立这个"三顶点决定一切"的世界观。

### 实验 2（python）：亲手把一个三角形拍成像素

```python title="软件光栅化器：内外测试 + 重心插值着色"
import math
import matplotlib.pyplot as plt

A = [1.0, 1.0]
B = [9.0, 1.0]
C = [5.0, 8.0]                       # 逆时针排列的三角形

def edge(p1, p2, q):                 # 边函数：叉积判左右
    return (p2[0] - p1[0]) * (q[1] - p1[1]) - (p2[1] - p1[1]) * (q[0] - p1[0])

area2 = edge(A, B, C)                # 有向面积的两倍（分母）
img = []
for j in range(10):                  # 行循环：y 方向 10 个像素
    row = []
    for i in range(10):              # 列循环：x 方向
        px = i + 0.5                 # 像素中心采样：格子右上偏 0.5
        py = j + 0.5
        w_a = edge(B, C, [px, py]) / area2   # α：离 A 的势力权重
        w_b = edge(C, A, [px, py]) / area2   # β
        w_c = edge(A, B, [px, py]) / area2   # γ
        if w_a >= 0 and w_b >= 0 and w_c >= 0:
            shade = 30 + w_a * 200           # 靠近 A 越亮：用 α 直接当灰度配方
            row.append(round(shade))
        else:
            row.append(15)                   # 三角形外：深灰背景
    img.append(row)

plt.imshow(img, origin="lower", cmap="gray")   # cmap="gray"：灰度配色（首见参数）
plt.title("software rasterizer: alpha as brightness")
plt.colorbar(label="brightness")
```

怎么玩：跑一次，你会看到一块从左下角向顶点 A 渐亮的三角形——亮度就是 α 的等值线。把着色行改成 `shade = 30 + w_b * 200` 再跑：渐变方向转向 B。**同一套内外测试，换个权重就是换一种渐变**，这就是 GPU 插值纹理与颜色的方式。

### 实验 3（python）：滑块移动采样点，读出配方

```python title="任意点的重心坐标读数机"
import math

# sliders: px=2 [0:10:0.25], py=2 [0:10:0.25]

A = [0.0, 0.0]
B = [8.0, 0.0]
C = [0.0, 6.0]

def edge(p1, p2, q):
    return (p2[0] - p1[0]) * (q[1] - p1[1]) - (p2[1] - p1[1]) * (q[0] - p1[0])

area2 = edge(A, B, C)
w_a = edge(B, C, [px, py]) / area2
w_b = edge(C, A, [px, py]) / area2
w_c = edge(A, B, [px, py]) / area2
total = round(w_a + w_b + w_c, 6)      # 归一化自检：应恒等于 1.0

inside = "内" if (w_a >= 0 and w_b >= 0 and w_c >= 0) else "外"
print(f"P=({px},{py}) 在三角形的{inside}")
print(f"a={round(w_a, 3)}, b={round(w_b, 3)}, g={round(w_c, 3)}, sum={total}")

mix = w_a * 100 + w_b * 200 + w_c * 50   # 三桶颜料按配方勾兑
print(f"interpolated value={round(mix, 1)}")
```

怎么玩：默认点 $(2,2)$ 读出 $\alpha\approx0.417,\ \beta=0.25,\ \gamma\approx0.333$。把点拖到顶点 A 上：α 变 1、其余归零，勾兑值回到 100。拖到三角形外：某个分量变负——**负号就是"在外"的证据**，同时 sum 依然纹丝不动是 1。

### 快问快答

```quiz
判断"像素在不在三角形内"，最省事的几何量是？
- 像素到三条边中点的距离之和
- 三个边函数值的符号是否一致 [*]
- 像素是否在三角形外接圆里
? 边函数符号一致 ⇔ 对三条边同侧 ⇔ 在内部；外接圆会把远处的点也圈进来。GPU 硬件正是拿三个边函数做并行比较。
```

:::warning[常见误区]

**误区一**："你以为重心坐标必须都在 0 到 1 之间。" 只有点在三角形**内部**时才如此；外部点的分量会出现负值——这不是 bug，恰恰是内外测试的判定依据。

**误区二**："你以为逐像素采样用左上角就行。" 采样点选哪里决定了哪些像素被点亮；业界约定像素中心 $(i+0.5, j+0.5)$，因为它对边界最公平（避免双倍计数相邻三角形的公共边）。

**误区三**："你以为屏幕空间插值天经地义。" 在屏幕上线性插值深度和纹理坐标会有系统误差（因为投影除法是非线性）；真实管线做**透视校正插值**——对属性除以 w 后插值再除回来。本课的方案在正交视角下精确，透视下需打补丁。

:::

## 6. 练习

**练习 1**：三个顶点的红色分量分别为 $R_A=10$、$R_B=200$、$R_C=100$，某像素的重心坐标为 $(0.5, 0.25, 0.25)$。求该像素的红色分量。代码能跑但少蘸了一种颜料：

```exercise
# @title: 练习：给像素调一杯中间色
# @check: 80.0
# @hint: 配方 P = a·RA + b·RB + g·RC 三项一个不能少；检查现在漏了谁的权重
RA = 10.0
RB = 200.0
RC = 100.0

a = 0.5
b = 0.25
g = 0.25

value = b * RB + g * RC       # ← 问题在这：顶点 A 的份额没入账
print(value)
```

改对后输出 80.0：$0.5\times10+0.25\times200+0.25\times100=5+50+25=80$。

**练习 2**：用实验 3 的边函数手工计算 $P(2,2)$ 在 $A(0,0), B(4,0), C(0,4)$ 中的重心坐标（三位小数），并用配方验算。

<details>
<summary>点开查看逐步解答</summary>

有向总面积两倍：$E_{AB}(C)=4\times4-0\times0=16$。

1. $\alpha$：$E_{BC}(P)=(0-4)(2-0)-(4-0)(2-4)=-8+8=0 \Rightarrow \alpha=0/16=0$；
2. $\beta$：$E_{CA}(P)=(0-0)(2-4)-(0-4)(2-0)=0+8=8 \Rightarrow \beta=8/16=0.5$；
3. $\gamma$：$E_{AB}(P)=4\times2-0\times2=8 \Rightarrow \gamma=8/16=0.5$；
4. 结论 $(\alpha,\beta,\gamma)=(0,\ 0.5,\ 0.5)$——配方 $0.5B+0.5C=(2,2)$ ✓。

α 恰好为零说明 P 落在 BC 边上（它是 BC 的中点）。边界情形（某分量取零）正是管线裁决"共享边像素归哪个三角形"的关键现场。
</details>

**练习 3**：为什么显卡画一个大三角形比画一百万个小像素快得多？一句话说明光栅化"批量"的本质。

<details>
<summary>点开查看逐步解答</summary>

光栅化把"百万像素各自判断"压缩成"一个包围盒内的规则遍历"：只需对盒内像素逐个套用同一条边函数公式，且相邻像素可增量计算（边函数值只差固定常数）。批量本质 = 把无结构的逐点问题变成有规律的扫描问题。
</details>

## 7. 边界与适用条件

- 边函数符号依赖顶点顺序：本课约定逆时针为正；顺时针三角形所有符号翻转，工程实现常预先检测并统一绕向（背面剔除顺便免费获得）。
- 点恰落在共享边上时（分量=0），相邻两个三角形都想认领该像素；管线用固定规则（如 top-left rule）避免一像素画两次。
- 重心插值在透视相机下需透视校正；颜色通常误差不可见，深度与纹理坐标必须校正。

## 8. 选读：重心坐标的物理名字

<details>
<summary>选读 · 为什么叫"重心"</summary>

把三角形薄片挖去，只在三个顶点放质量 $\alpha,\beta,\gamma$（和为 1），这套质量的**质心**恰好落在 P——重心坐标因此得名。等质量 $(\frac13,\frac13,\frac13)$ 对应的就是中学里的"重心"（三条中线交点）。

这个力学视角解释了归一化的必然性：质量守恒要求三个数相加为 1；也解释了顶点处的退化：全部质量压在 A 上，质心就是 A。物理与几何在此互为注脚——第 11 章的线性组合语言贯穿始终。

</details>

## 9. 下一站

直线段拼得出硬边模型，却拼不出汽车流畅的车顶曲线。设计师们需要一种"拉一下控制点，曲线温柔跟随"的数学——Bezier 曲线与它著名的套娃算法即将登场。

→ [Bezier 曲线](./40-bezier-curves.md)
