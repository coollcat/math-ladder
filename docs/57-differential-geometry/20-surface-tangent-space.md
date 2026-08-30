---
title: 曲面参数化与切空间
lesson_id: differential-geometry/surface-tangent-space
prereqs:
  - differential-geometry/param-curve-arc-length
  - linalg/basis
  - multivariable/partial-gradient
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
  - surface-parametrization
  - tangent-space
  - tangent-plane
applications:
  - globe-navigation
  - terrain-analysis
exits:
  - differential-geometry/first-fundamental-form
---

# 曲面参数化与切空间

## 1. 从一个场景开始

一只蚂蚁生活在篮球表面。它的世界明明是**二维的**——前后左右随便走，没有上下——可我们抬头看，它的家分明弯在三维空间里。

更奇怪的问题来了：蚂蚁在球面上某一点想"直走"，它脚下那条切线方向该指向哪？球面在该点根本是弯的，哪里来的直线？这一课的回答是微分几何最优雅的思想之一：**弯的世界上的每个点，都随身携带一个平面的替身**——替身负责所有"方向"和"直线"的事务，曲面本体只管弯曲。

## 2. 直觉解释

先解决"怎么描述曲面"。地球仪的做法：给每一对 $(u,v)$（经度、纬度）指定一个三维坐标点。这就是**参数化**——两个参数像经纬两台旋钮，转动旋钮就走到曲面上不同的点。

在固定的一对旋钮值附近做两个思想实验：

1. **只拧经度旋钮**（$u$ 变，$v$ 冻结）：你在曲面上沿一条"纬线方向"滑动，得到一个位移方向 $\vec r_u$；
2. **只拧纬度旋钮**（$v$ 变，$u$ 冻结）：得到另一个独立的滑动方向 $\vec r_v$。

把放大镜对准这一点：曲面的弯被放大到看不见，剩下的就是一张小平面，上面所有可能的前进方向恰好由 $\vec r_u$ 和 $\vec r_v$ 混合搭出来（第 11 章的话说：它们张成一个平面）。这张平面就是**切平面**，配上原点后叫**切空间**——曲面上每一点的"平面替身"。

## 3. 正式定义

**曲面片**：映射 $\vec r(u,v) = \bigl(x(u,v),\ y(u,v),\ z(u,v)\bigr)$，定义域是平面上一块矩形；要求两个偏导向量不共线（否则曲面在那里"捏皱了"）。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\vec r(u,v)$ | 参数化 | 两台旋钮 (u, v) 对应的三维位置 |
| $\vec r_u,\ \vec r_v$ | 偏导向量 | 只拧一台旋钮时的瞬时位移方向 |
| $T_pS$ | 切空间 | 该点处 $\vec r_u,\vec r_v$ 的一切线性组合 |
| $\vec n$ | 法向量 | 同时垂直于 $\vec r_u,\vec r_v$ 的方向 |

$$T_pS = \left\lbrace a\,\vec r_u + b\,\vec r_v \ \middle|\ a,b \in \mathbb R \right\rbrace$$

$\vec r_u$ 的每个分量按多元函数偏导数规则求出：

$$\vec r_u = \left( \frac{\partial x}{\partial u},\ \frac{\partial y}{\partial u},\ \frac{\partial z}{\partial u} \right), \qquad \vec r_v = \left( \frac{\partial x}{\partial v},\ \frac{\partial y}{\partial v},\ \frac{\partial z}{\partial v} \right)$$

法向量记作 $\vec n$：取 $\vec r_u \times \vec r_v$ 的方向（叉乘给出同时垂直于两个因子的箭头）并归一化，$\pm$ 两个朝向都合法。**曲线穿过一点的切线必落在该点的切空间里**——这是切空间名字的来历，也是下一课量长度的地基。

## 4. 分步例题

**例**：圆柱面 $\vec r(u,v) = (\cos u,\ \sin u,\ v)$，考察点 $u_0=\pi/3,\ v_0=2$。

1. 拧 $u$ 旋钮：$\vec r_u = (-\sin u,\ \cos u,\ 0)$，代入得 $(-0.866,\ 0.5,\ 0)$——水平圆环方向的瞬时速度；
2. 拧 $v$ 旋钮：$\vec r_v = (0,\ 0,\ 1)$——竖直向上；
3. 切空间 = 水平切向与竖直方向的一切混合：任何"贴着柱面爬"的速度都在其中；
4. 抽查一个候选位移 $\vec d_1=(0.52,\ -0.3,\ 1.5)$：它是不是切向量？下一节用数值裁决；
5. 法向量应从柱心指向外（或反向）：$(\cos u_0,\ \sin u_0,\ 0)=(0.5,\ 0.866,\ 0)$——垂直于上面两个方向 ✓。

## 5. 动手实验

### 实验 1：两个方向张成整个平面

拖动蓝、绿两支箭头（分别扮演 $\vec r_u$ 与 $\vec r_v$；紫色那支是它们的和），再看组合能到达哪里——只要蓝、绿两支箭头不共线，一切 $a\vec u+b\vec v$ 就铺满整张平面：

```viz
{
  "type": "vecadd",
  "title": "切空间的配方：任意切向位移 = a·r_u + b·r_v",
  "u": [2, 1],
  "v": [-1, 2]
}
```

### 实验 2：球面上的切平面补丁

```python title="画出球面网格 + 北纬30°某点的切平面三角形"
import math
import matplotlib.pyplot as plt

phis = [math.pi * k / 12 for k in range(13)]            # 极角从北到南取 13 条纬线
lams = [2 * math.pi * k / 24 for k in range(25)]        # 经度绕一圈取 25 条经线
X, Y, Z = [], [], []
for phi in phis:
    row_x, row_y, row_z = [], [], []
    for lam in lams:
        row_x.append(math.sin(phi) * math.cos(lam))     # 球面参数化三个分量
        row_y.append(math.sin(phi) * math.sin(lam))
        row_z.append(math.cos(phi))
    X.append(row_x)
    Y.append(row_y)
    Z.append(row_z)

fig = plt.figure(figsize=(5, 4))
ax = fig.add_subplot(projection="3d")                   # 首现参数：projection="3d" 开三维画布
ax.plot_wireframe(X, Y, Z, color="lightgray", linewidth=0.5)   # 线框图：只画网格线

phi0, lam0 = math.pi / 3, math.pi / 4                   # 考察点：北纬 60°、东经 45°
p0 = [math.sin(phi0) * math.cos(lam0),
      math.sin(phi0) * math.sin(lam0),
      math.cos(phi0)]
e_phi = [math.cos(phi0) * math.cos(lam0),
         math.cos(phi0) * math.sin(lam0),
         -math.sin(phi0)]                               # 只拧极角旋钮的方向 r_phi（单位球上）
e_lam = [-math.sin(lam0), math.cos(lam0), 0.0]          # 只拧经度旋钮的方向 r_lam
tri = [p0,
       [p0[j] + 0.4 * e_phi[j] for j in range(3)],      # 切平面三角形三个顶点：p0、p0+0.4·r_phi
       [p0[j] + 0.4 * e_lam[j] for j in range(3)]]      # 以及 p0+0.4·r_lam
ax.plot([p0[0]], [p0[1]], [p0[2]], marker="o", color="red")
print("切平面三角顶点:", [[round(v, 2) for v in pt] for pt in tri])
```

灰色球面上的红点是考察点，三角形是从该点铺开的切平面一小角——它"切"着球，却不属于球面本身。

### 实验 3：滑块实验——圆柱上的切向量随点转动

```python title="滑块实验：圆柱 r_u 随角度 u0 变化"
# sliders: u0=45 [0:360:15]
import math

a = 2.0                                   # 圆柱半径
th = math.radians(u0)                     # radians：把角度制换成弧度制（三角函数吃弧度）
ru = [-a * math.sin(th), a * math.cos(th), 0.0]
rv = [0.0, 0.0, 1.0]
normal = [a * math.cos(th), a * math.sin(th), 0.0]
print("r_u =", [round(v, 3) for v in ru])
print("r_v =", [round(v, 3) for v in rv])
print("法向 =", [round(v, 3) for v in normal])
```

拖动 `u0` 一圈：竖直的 $\vec r_v$ 纹丝不动，水平的 $\vec r_u$ 和法向手拉手同步旋转——**切空间逐点不同**，这正是曲面几何比平面几何难也更有趣的地方。

### 快问快答

```quiz
为什么球面北极点附近不能再用本课的经纬参数化？
- 因为北极太冷，参数会结冰
- 因为所有经线在北极汇聚，r_lambda 缩成零向量，两个方向不再独立 [*]
- 因为北极点的切空间是三维的
? 在北极无论怎么拧经度旋钮都不挪窝：偏导向量退化成零，张不出平面。好的参数化要求两个偏导处处独立。
```

:::warning[常见误区]

**误区一**："切平面是曲面的一部分。" 它是**想象出来的替身**：贴在考察点上、由两个偏导向量张成的平面，一般只有一小块落在曲面附近。说"蚂蚁脚下的平面"没问题，说"曲面上有块平面"就走味了。

**误区二**："$\vec r_u$ 和 $\vec r_v$ 总该互相垂直、长度为 1。" 完全不必！它们只是"各拧各的旋钮"的瞬时速度，夹角和长短随参数化随意。什么时候能放心当正交基用？下一课的第一基本形式专门管这本账。

**误区三**："法向量只有一个。" 垂直方向有正负两个朝向，$\vec n$ 与 $-\vec n$ 同样合法；选定哪个叫"定向"，是拓扑章（曲面分类）里真正较真的问题。

:::

## 6. 练习

**练习 1**：圆柱在 $u_0=\pi/3$ 处有两个候选位移：$\vec d_1=(0.52,-0.3,1.5)$ 与 $\vec d_2=(\cos u_0,\sin u_0,1)$。判别谁贴着柱面（切向）、谁戳出去（径向）：与**真正的法向量**做点积，绝对值近 0 判切向、近 1 判径向。程序已备好，但法向量填错了：

```exercise
# @title: 练习：谁贴着柱面走？
# @check: 0.0
# @check: 1.0
# @hint: 圆柱的法向量从截面圆心水平指向外：(cos u0, sin u0, 0)。竖直向量只是 r_v，当不了法官。
import math

u0 = math.pi / 3
normal = [0.0, 0.0, 1.0]        # ← 问题在这：这不是圆柱的法向，这只是竖直方向
d1 = [0.52, -0.3, 1.5]
d2 = [math.cos(u0), math.sin(u0), 1.0]

def dot(p, q):                  # 三维点积：对应分量相乘再求和
    return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]

print(round(abs(dot(d1, normal)), 3))
print(round(abs(dot(d2, normal)), 3))
```

**练习 2**：平面 $\vec r(u,v)=(u,\ v,\ 3)$ 的切空间是什么？和曲面本身什么关系？

<details>
<summary>点开查看逐步解答</summary>

$\vec r_u=(1,0,0)$，$\vec r_v=(0,1,0)$，切空间是所有 $(a,b,0)$——恰是过点 $(u,v,3)$ 的水平面。平面的切空间与自身平行重合：**平坦 = 替身和本人一样大**。这就是"弯曲程度"的直觉起点：越弯，替身与本人的偏差越大，后续 Gauss 曲率课将把这个偏差变成数字。
</details>

## 7. 选读：放大极限为什么恰好是平面

<details>
<summary>选读 · 可微性 = 切平面良好存在</summary>

固定 $v$，把 $\vec r(u_0+\Delta u, v_0)-\vec r(u_0, v_0)$ 除以 $\Delta u$ 再取极限，得 $\vec r_u$；对 $v$ 同理。多元微积分的可微性条件保证：微小位移的主部恰好是线性组合 $\Delta u\,\vec r_u+\Delta v\,\vec r_v$，误差是二阶小量——也就是说，**显微镜下曲面与切平面的偏离比放大倍数更快地消失**。若某个参数化做不到这点（比如尖锥顶点），那里就没有良好的切平面，本课整套机器失效。微分几何的地盘是"光滑"二字，边界就在这种尖点上。

</details>

## 8. 下一站

切空间解决了"方向住在哪"，但还没回答"多长"。同一支切向量，在不同曲面、同一点的不同朝向上，量出来的长度规矩并不相同——曲面上需要自带的勾股定理。下一课请出第一基本形式：每一点专属的量尺。

→ [第一基本形式](./30-first-fundamental-form.md)
