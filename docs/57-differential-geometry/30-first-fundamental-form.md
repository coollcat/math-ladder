---
title: 第一基本形式：曲面上的量尺
lesson_id: differential-geometry/first-fundamental-form
prereqs:
  - differential-geometry/surface-tangent-space
  - linalg/dot-product
  - multivariable/jacobian-chain
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
  - first-fundamental-form
  - surface-area-element
applications:
  - cartography
  - sheet-metal-manufacturing
exits:
  - differential-geometry/geodesics
---

# 第一基本形式：曲面上的量尺

## 1. 从一个场景开始

在平面地图上量布料、裁铁皮，一把直尺走天下。可制图员早就发现怪事：墨卡托地图上**格陵兰岛看起来比非洲还大**，实际非洲面积是它的十几倍。把球面摊到平面上必然拉伸某些地区——那么在球面本身上，"一公里"到底该怎么定义？

平面上的勾股定理 $ds^2 = dx^2 + dy^2$ 默默失效了：曲面上的微小位移有两个旋钮 $(du, dv)$ 参与，而且两个方向还可能互相歪着。这一课的成果是一台**随身量尺**：曲面上每一点自带三个数，凭它们就能在弯的世界里完成长度、角度、面积的全部测量。

## 2. 直觉解释

站在曲面一点，朝任意方向挪一小步。上一课说过，这一步的主部是两个偏导方向的混合：

$$d\vec P = \vec r_u\, du + \vec r_v\, dv$$

它的长度平方用点积展开（平方就是自己乘自己）：

$$\| d\vec P \|^2 = \underbrace{\vec r_u \cdot \vec r_u}_{E}\, du^2 + \underbrace{2\,\vec r_u \cdot \vec r_v}_{2F}\, du\,dv + \underbrace{\vec r_v \cdot \vec r_v}_{G}\, dv^2$$

三个系数 **E、F、G** 就是曲面上每一点自带的"度量三件套"：

- $E$：只拧 $u$ 旋钮时，每单位参数走得有多快（经线方向的疏密）；
- $G$：只拧 $v$ 旋钮的对应版本；
- $F$：两个方向的"歪斜程度"——为 0 表示经纬两向正交。

平面上的勾股定理是它的特例 $E=G=1, F=0$；球面上的 $G$ 会随纬度缩水（纬线圈越靠近极点越短）——格陵兰之谜的病灶就在这里。

## 3. 正式定义

**第一基本形式**：曲面 $S$ 上一点的二次型

$$ds^2 = E\, du^2 + 2F\, du\, dv + G\, dv^2, \qquad E = \vec r_u \cdot \vec r_u,\quad F = \vec r_u \cdot \vec r_v,\quad G = \vec r_v \cdot \vec r_v$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $ds$ | 弧长微元 | 曲面上微小位移的真实长度 |
| $E, F, G$ | 度量系数 | 每点一套，随点连续变化 |
| $\sqrt{EG - F^2}\, du\,dv$ | 面积微元 | 小平行四边形的面积 |
| $\cos\theta = \dfrac{F}{\sqrt{EG}}$ | 夹角公式 | 两坐标方向夹角的余弦 |

有了它，曲面上任意切向量 $(du, dv)$ 的长度、两条切向量的夹角、一块区域的面积，全部可以纯用 $E,F,G$ 算出——**不需要抬头看曲面嵌在哪个三维空间里**。这个"自带宇宙规律"的思想，一路通向本章后续的 Riemann 度量、流形直觉与广义相对论语言。

## 4. 分步例题

**例**：半径 $a=2$ 的圆柱面 $\vec r(u,v) = (2\cos u,\ 2\sin u,\ v)$。

1. 求 $\vec r_u = (-2\sin u,\ 2\cos u,\ 0)$，$\vec r_v = (0,\ 0,\ 1)$；
2. 算三件套：$E = 4\sin^2u + 4\cos^2u = 4$，$F = 0$（水平方向点竖直方向），$G = 1$；
3. 于是 $ds^2 = 4\,du^2 + dv^2$——恰好是把圆柱侧面剪开摊平后、以水平坐标 $2u$ 写出的平面勾股定理！**圆柱面天生平坦**；
4. 斜跨一小步 $du=\pi,\ dv=3$ 的长度：$\sqrt{4\pi^2 + 9} \approx 6.963$；
5. 面积微元 $\sqrt{EG-F^2}\,du\,dv = 2\,du\,dv$：摊平后的普通矩形面积 ✓。

## 5. 动手实验

### 实验 1：球面度量为什么随纬度缩水

取球面参数化（极角 $\phi$ 从北极 0 到赤道 $\pi/2$），算得 $E=1,\ F=0,\ G=\sin^2\phi$。看住 $G$ 因子：

```viz
{
  "type": "plot",
  "title": "球面的 G = sin²φ：拧动经度旋钮的实际速度随纬度衰减",
  "expr": "sin(x)^2",
  "xmin": 0,
  "xmax": 3.14
}
```

北极处（$\phi=0$）因子为 0——拧经度旋钮原地不动（呼应上一课北极退化问题）；赤道处满格 1。墨卡托投影为了保形状硬把每条纬线拉回同一宽度，高纬地区便被吹胀。

### 实验 2：给整张球面的 G 因子画热力图

```python title="球面度量系数 G 的颜色地图"
import math
import matplotlib.pyplot as plt

rows = []
phis = [math.pi * k / 24 for k in range(25)]     # 极角从 0(北) 到 π/2(赤道)
for phi in phis:
    row = []
    for j in range(48):
        row.append(math.sin(phi) ** 2)           # 该极角处的 G 值
    rows.append(row)

plt.imshow(rows, origin="lower", cmap="viridis", aspect="auto")   # origin="lower" 让北极行画在最下
plt.colorbar(label="G = sin^2(phi)")
plt.xlabel("经度方向")
plt.ylabel("极角 phi")
print("北极 G =", round(rows[0][0], 3), "; 赤道 G =", round(rows[-1][0], 3))
```

整幅图沿水平方向均匀（$G$ 不挑经度），沿竖直方向由黑渐亮——度量随位置变化的"地形图"，这就是 Riemann 度量的雏形。

### 实验 3：滑块实验——纬线圈到底多长

```python title="滑块实验：用第一基本形式算纬线圈长"
# sliders: phi_deg=60 [0:90:5]
import math

R = 1.0                                   # 单位球
phi = math.radians(phi_deg)               # 极角（0=北极, 90°=赤道）
lat_len_metric = 2 * math.pi * R * math.sin(phi)   # 周长 = ∫ sqrt(G) du = 2π·R·sin φ
flat_guess = 2 * math.pi * R              # 平面错觉：以为每条纬线都和赤道一样长
print("真实周长 =", round(lat_len_metric, 3))
print("平面错觉 =", round(flat_guess, 3))
```

拖到 `phi_deg=90`：两数相等（赤道没被冤枉）；拖到 30：真实周长只有错觉的一半——**地图软件必须知道这份缩水表才能诚实报距离**。

### 快问快答

```quiz
曲面上某点的 F 不等于 0 说明什么？
- 该点海拔不为零
- 经度方向与纬度方向在该点不正交 [*]
- 该曲面一定是球面
? F 是两个偏导方向的点积：非零即歪斜。比如斜纹布面上的横竖纱线不垂直，织进参数化里 F 就不为零。
```

:::warning[常见误区]

**误区一**："$E,F,G$ 是描述曲面的三个常数。" 它们**逐点变化**：圆柱的三件套倒是常数（所以它平坦），但球面的 $G=\sin^2\phi$ 随纬度一路变。写成函数才是常态。

**误区二**："$ds^2$ 是一条曲线的长度。" 它是**微小位移的长度平方**：真正的曲线长度要沿路径把 $\sqrt{E\,du^2+2F\,du\,dv+G\,dv^2}$ 积分起来——下一课测地线就干这件事。

**误区三**："知道了 $E,F,G$ 还得看三维图像才算得动。" 恰恰相反：长度、角度、面积公式只用这三个系数。住在曲面里的二维生物没有"第三维眼睛"，照样几何得井井有条——这正是第一基本形式最深的用意。

:::

## 6. 练习

**练习 1**：圆柱半径 $a=2$，从参数点 $(u_0,v_0)$ 走一小步 $du=\pi,\ dv=3$。程序已备好，但 $E$ 抄错了：

```exercise
# @title: 练习：用度量三件套算圆柱斜步长
# @check: 4
# @check: 1
# @check: 6.963
# @hint: r_u = (-a·sin u, a·cos u, 0)，点积自己得 E = a² = 4，不是 1。
import math

a = 2.0
E = 1.0                       # ← 问题在这：忘了 E 是 r_u 点自己的长度平方 = a²
F = 0.0
G = 1.0
du = math.pi
dv = 3.0
length = math.sqrt(E * du * du + 2 * F * du * dv + G * dv * dv)   # 第一基本形式的完整用法
print(int(E))
print(int(G))
print(round(length, 3))
```

**练习 2**：单位球面上，北纬 60°（极角 30°）纬线圈的周长是多少？它等于同纬度"平面错觉"值的几倍？

<details>
<summary>点开查看逐步解答</summary>

极角 $\phi=30°$，$\sin 30°=0.5$，周长 $=2\pi\times0.5=\pi\approx3.142$；错觉值 $2\pi\approx6.283$，恰好一半。顺带一提：这条纬线不是球面测地线（下一课见分晓），但在它上面量长度，用的正是本课的 $G=\sin^2\phi$。
</details>

## 7. 选读：面积微元的来历

<details>
<summary>选读 · 为什么 sqrt(EG − F²) 是小平行四边形面积</summary>

小位移 $du\,\vec r_u$ 与 $dv\,\vec r_v$ 张成一个小平行四边形，其面积等于叉积模长。三维向量恒等式给出

$$\left\| \vec r_u \times \vec r_v \right\|^2 = \|\vec r_u\|^2\,\|\vec r_v\|^2 - (\vec r_u \cdot \vec r_v)^2 = EG - F^2$$

开根号即得面积微元 $\sqrt{EG-F^2}\,du\,dv$。两个立即的检验：平面 $E=G=1,F=0$ 给出 1（不放大）；$F\to\pm\sqrt{EG}$ 时面积趋零（两方向共线，曲面捏皱）。第 20 章 Jacobian 行列式的"面积放大率"，在曲面语言里换了个马甲。
</details>

## 8. 下一站

量尺到手，可以问大问题了：曲面上从 A 到 B，怎么走最近？平面上答案当然是直线；球面上北京到纽约的最短路却拐进了北冰洋。下一课研究曲面上的"最直路径"——测地线。

→ [测地线：曲面上的最直路径](./50-geodesic-path.md)
