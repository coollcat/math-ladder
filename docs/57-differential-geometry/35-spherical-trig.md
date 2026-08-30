---
title: 球面三角与球面几何选讲
lesson_id: differential-geometry/spherical-trig
prereqs:
  - differential-geometry/first-fundamental-form
  - trig/solving-triangles
volume: 5
layer: L8
track:
  - geometry-space
  - analysis-change
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - great-circle-distance
  - spherical-law-of-cosines
  - haversine-formula
  - spherical-excess
applications:
  - gps-geodesy
  - aviation-routing
exits:
  - robotics-motion/pose-frames
---

# 球面三角与球面几何选讲

## 1. 从一个场景开始

打开地图软件查"北京到上海的距离"，它报出约一千零几十公里。可你手中只有两对经纬度数字，并没有现成的尺子——手机是拿什么算出来的？

把同样的疑问放大：飞机从伦敦飞洛杉矶，航图上看着笔直向东的大圆弧线在平面世界地图上反而向北凸出一个大弯；导航卫星每天给全球亿万台设备报距离，靠的全是同一套数学。这些问题的共同底座叫做**球面三角**——第 30 课的第一基本形式给了我们曲面量尺，本课就在最常见的那只"球"上，把它用成趁手的工具。

## 2. 直觉解释

先解决一个根本问题：**球面上的"直线"是什么？**

在橘子皮上绷一根橡皮筋，它会自然收紧成一段**大圆**弧——过球心切出的圆，球面上最大的那种圆。赤道是经度圈都是大圆，而纬线圈不是（越往两极越小）。绷紧橡皮筋选的就是最短路线，所以大圆就是球面对"直线"的答复。

两点间的球面距离于是等于：连接两点的大圆劣弧长度 $s=R\cdot\theta$，其中 $\theta$ 是这段弧对应的圆心角（弧度）。剩下的难题只有一个：给定两点的经纬度，怎么求出 $\theta$？

平面几何里我们用余弦定理串起三条边一个角（第 7 章）。球面也有一份余弦定理，形状惊人地神似：

$$\cos c=\cos a\,\cos b+\sin a\,\sin b\,\cos C$$

两边三夹一，$c$ 就到手。还记得第一基本形式的忠告吗？"公式里的每个字母都得按曲面自己的尺子读"——这里的边长一律以**弧度计角**（除以半径前的圆心角），这是球面三角最容易翻车的暗桩。

## 3. 正式定义

**球面三角形**：球面上三点，用三段大圆劣弧两两相连围成的图形。

| 符号 | 名字 | 读法 |
| --- | --- | --- |
| $a,b,c$ | 三条边（弧度制） | 圆心角即"边长" |
| $A,B,C$ | 对应三个顶点的内角 | 大圆弧之间的夹角 |
| $R$ | 球半径 | 地球取均值约 6371 km |
| $E=A+B+C-\pi$ | **角盈** | 内角和超出 180° 的部分 |

**球面余弦定理**：$\;\cos c=\cos a\cos b+\sin a\sin b\cos C$。

**半正矢（haversine）变体**——数值计算实际用的版本，专治小距离时浮点精度的咳嗽：

$$\operatorname{hav}(\theta)=\sin^2\frac{\theta}{2},\qquad \operatorname{hav}(c/R)=\operatorname{hav}(\Delta\varphi)+\cos\varphi_1\,\cos\varphi_2\,\operatorname{hav}(\Delta\lambda)$$

其中 $\varphi_1,\varphi_2$ 是两点的纬度、$\Delta\lambda$ 是经度差。求距再走倒动作：$s=2R\arcsin\sqrt{\operatorname{hav}(\cdot)}$。

**Girard 角盈定理**：球面三角形面积恰为 $\dfrac{E}{4\pi}\times 4\pi R^2=E\,R^2$——多出来的内角和直接就是面积（弧度单位制下）。

## 4. 分步例题

**例一（北极的三直角三角形）**：从北极点沿两条相隔 90° 的经线走到赤道，再沿赤道返回。

1. 北极处的夹角是两条经线的夹角：$90°$；
2. 大圆与子午线的交角在每个交点也是 $90°$（经线垂直于赤道）；
3. 于是内角和 $A+B+C=270°$，角盈 $E=\pi/2$；
4. 面积 $=E\,R^2=\pi R^2/2$——恰好是八分之一球面。**平面上绝无可能有三个直角的三角形**，这就是曲率的签名；
5. 顺带检查极限方向：当三角形缩到城市尺度时，$E\to0$，平面欧几里得几何重新接管——GPS 在自家小区里用平面勾股也不会错得离谱。

**例二（手算半个实际查询）**：设两城同在北半球且经度恰好相同（正南正北），纬度差 $\Delta\varphi=10°=0.1745$ 弧度。大圆退化为子午线的一段：

1. 弧长 $s=R\,\Delta\varphi=6371\times0.1745\approx1112$ 公里；
2. 同题的粗糙版"每度 111 公里"$\times10\approx1110$——同在一条经线上时两种算法吻合；
3. 差别出现在**斜着跨经度**的时刻：下节实验把这件事算给你看。

## 5. 动手实验

### 实验 1（python）：亲手实现导航软件的距离引擎

```python title="半正矢公式：从两对经纬度到公里数"
# sliders: lat2=31.2 [0:60:0.4]
import math                                     # 数学库：sin/cos/asin/radians

R = 6371                                        # 地球平均半径（公里）
lat1, lon1 = 40.0, 116.4                        # 北京（课程近似坐标，度）
lon2 = 121.5                                    # 上海经度固定，纬度交给滑杆

def hav(theta):                                 # 半正矢函数：sin(t/2) 的平方
    t = math.radians(theta)                     # 度转弧度——参数以“度”进来必须先换币种
    return math.sin(t / 2) ** 2

h = hav(lat2 - lat1) \
    + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * hav(lon2 - lon1)
distance = 2 * R * math.asin(math.sqrt(h))      # 反解距离：2R·arcsin(√h)
print("大圆距离 =", round(distance), "公里")

plane = 111 * math.hypot(lat2 - lat1, lon2 - lon1)   # 平面勾股近似：hypot 是直角三角形斜边
print("平面近似 =", round(plane), "公里")
```

拖动 lat2 滑杆：目标越靠近北京，两条曲线答数越贴近（小范围平面几何够用）；拉到三亚一带后，平面近似开始明显虚高——因为经度一格代表的实地距离被 $\cos\varphi$ 压薄了，平面版照单全收。题目设定为上海附近（lat2≈31.2）时，正确答案约 **1081 公里**，平面版报 1129，差出将近半个京沪高铁站的距离。

### 实验 2（python）：为什么纬度越高，经度越发"不值钱"

```python title="画出一格经度的实地弧长随纬度的变化"
# sliders: phi=60 [0:85:5]
import math
import matplotlib.pyplot as plt                 # 画图库（卷一已引入）

lats = []
kms = []
for d in range(0, 86, 2):                       # 从赤道一路列到北极圈
    lats.append(d)
    kms.append(111.32 * math.cos(math.radians(d)))   # 一格经度的弧长 ∝ cos(纬度)

mark = 111.32 * math.cos(math.radians(phi))     # 当前滑杆纬度处的一格经度实长
plt.plot(lats, kms, label="1 degree of longitude")
plt.axvline(phi, linestyle="--", color="tomato")   # 竖直参考线钉住当前纬度
plt.scatter([phi], [mark], color="tomato", zorder=5)
plt.xlabel("latitude (deg)")
plt.ylabel("km per degree")
plt.legend()
plt.grid(True)
```

怎么玩：滑杆停在赤道时一格经度足有 111 公里；拖到 60°N 只剩一半（55.6 公里），挪到 80°N 只剩四分之一。这解释了两件事：为什么极地航线看起来"抄近道"，以及为什么球面三角公式里要专门埋一个 $\cos\varphi_1\cos\varphi_2$ 因子——那就是对不同纬度上经度折扣的对账。

### 快问快答

```quiz
在半径为 R 的球面上，一个球面三角形的内角和最大能超过多少？
- 只能非常接近 180 度
- 可以一直大到接近 270 度乘以任意倍数，没有上界 [*]
- 固定恰好是 360 度
? 内角和减去 pi 的角盈对应面积 E·R^2，面积越大角盈越大——把三个顶点铺满整个半球甚至更夸张的组合，内角和可以逼近任意大的值。平面上 180 度的天花板，是零曲率世界的特产。
```

:::warning[常见误区]

**误区一**："你以为经纬度可以像 x、y 一样直接进 sin 和 cos。" 度与弧度是两种货币，混用会让公式输出成千上万公里的荒谬值——判题练习就埋了这颗雷。经验法则：先 `radians()` 后进函数。

**误区二**："你以为地球上'最短路径'在地图上是直线。" 墨卡托地图保的是方向（等角），不是里程；大圆航线在多数投影里都显弯曲。看地图估航程，别信目测直线。

**误区三**："你以为纬线圈也算大圆。" 只有球面半径最大的圆才配叫大圆；沿着纬线走会在东西向旅程中一路"绕远"。若你从北京沿 40°N 直飞纽约，会绕到比必要路程远上百公里的地方。

:::

## 6. 练习

**练习 1**（概念口答）：一个球面三角形的内角和是 200°，它在半径 2 的球面上占了多少面积？

<details>
<summary>点开查看逐步解答</summary>

角盈 $E=200°-180°=20°=20\times\pi/180\approx0.349$ 弧度。由 Girard 定理，面积 $=E\,R^2=0.349\times4\approx1.397$ 平方单位。反过来这也提供了一种量面积的怪招：拿测角仪扫一遍顶点就行。
</details>

**练习 2**（判题）：把实验 1 的距离引擎改造成独立作业。下面的版本整体能跑，但作者忘了做"货币兑换"——所有角度带着度数的身价直接冲进了三角函数。修复并让两行输出恢复原样。

```exercise
# @title: 练习：先换汇，再三角
# @check: 1081
# @check: 1129
# @hint: sin 和 cos 只认识弧度；每处以“度”书写的经纬度进函数前都要过一遍 math.radians。
import math

R = 6371                          # 地球平均半径（公里）
lat1, lon1 = 40.0, 116.4          # 北京
lat2, lon2 = 31.2, 121.5          # 上海

def hav(theta):
    s = math.sin(theta / 2)
    return s * s

h = hav(lat2 - lat1) \
    + math.cos(lat1) * math.cos(lat2) * hav(lon2 - lon1)   # ← 问题在这：cos 直接吃了度数
distance = 2 * R * math.asin(math.sqrt(h))
print(round(distance))

plane = 111 * math.hypot(lat2 - lat1, lon2 - lon1)
print(round(plane))
```

修复口径：`hav` 函数内部补一句 `theta = math.radians(theta)`，两个 cos 也要分别换成 `math.cos(math.radians(lat1))` 与 `math.cos(math.radians(lat2))`。修好后两行稳定输出 1081 与 1129——大圆距离才是真话，平面近似用它自己多出的 48 公里提醒你别忘 $\cos\varphi$ 折扣。

**练习 3**（选做）：只用余弦定理解例一的北极三角形：三边各是多少弧度？验证三个内角都是直角。

<details>
<summary>点开查看逐步解答</summary>

三段大圆都是四分之一赤道：$a=b=c=\pi/2$。代公式 $\cos C=(\cos c-\cos a\cos b)/(\sin a\sin b)$（边的余弦定理反解角）：分子 $\cos(\pi/2)-0=0$，所以 $\cos C=0$、$C=\pi/2$；对称可得三个角全是直角。用边的公式验角、用角的公式验边——球面余弦定理的两个方向互为校对。
</details>

## 7. 边界与适用条件

- 本课把地球当**标准球体**；真实的地球是椭球（赤道半径比极半径长约 21 公里），高精度大地测量要用椭球面的精确弧长算法，差值在高铁路网级别已经不能忽略。
- 距离计算不涉及地形高程——"飞行两小时"的地表大圆与爬山的路面里程完全是两回事。
- 半正矢公式在小距离下数值稳，但在近对跖点（直径两端）精度退化，环球级航线要改用versed sine 变体或向量法。
- 角盈定理只在**正曲率**球面成立；双曲面上的三角形内角和小于 180°，那是后续 Gauss 曲率课要交接的另一副手套。

## 8. 选读：等角航线吃掉的里程

<details>
<summary>选读 · 斜恒向线与墨卡托地图</summary>

航海时代的水手偏爱一种叫**等角航线（rhumb line）**的走法：罗盘指向恒定不变的路。它在墨卡托地图上是笔直的一条线，掌舵不需要不断调整船头。代价是——这条螺旋般的路径比同两点的大圆要多烧燃料，纬度越高亏得越多。现代远程民航基本都走大圆分段（随后按空管要求折线化），再配惯性/卫星组合导航实时更新位置。等角航线的书桌余晖留在了帆船赛和飞行员的心算备份里。

</details>

## 9. 下一站

球面这一支工具我们先卸到这里：大圆、半正矢、角盈，足以支撑天球坐标、大地测量与任何"地球当棋盘"的问题。同样的语言马上要在机器人身上再来一轮——机械臂末端到底朝向哪边、姿态如何拼接旋转，都是三角学离开地面之后的续集。

→ [位姿与坐标系](../65-robotics-motion/10-pose-frames.md)
