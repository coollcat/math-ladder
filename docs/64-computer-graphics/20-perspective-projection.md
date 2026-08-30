---
title: 相机视图与透视投影
lesson_id: graphics/perspective-projection
prereqs:
  - graphics/homogeneous-affine
  - functions/linear
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
  - pinhole-camera
  - perspective-projection
applications:
  - game-rendering
  - ar-navigation
exits:
  - graphics/rasterization-barycentric
---

# 相机视图与透视投影

## 1. 从一个场景开始

站在笔直的公路中央向远方望：两侧的电线杆越远越矮、越靠越拢，最后在地平线上汇成一点。真实世界里的电线杆一样高，是**你的眼睛**把它们画成了这样。

游戏画面要骗过眼睛，就必须复刻这套把戏：三维世界如何压进二维屏幕，还压得让人信以为真？答案小得惊人——一次除法。

## 2. 直觉解释

想象针孔相机：光线从物体出发，穿过一个小孔，投到对面的屏幕上。设孔在原点、屏幕在距离 $f$ 处。物体上的点 $(x, y, z)$（$z$ 是深度）投到屏幕哪里？

连一条从原点到该点的直线——它像扇子一样张开，深度 $z$ 越大张得越开，屏幕上挪得越多；但屏幕本身只有固定大小，所以**除以深度**：

$$x_{\text{屏}} = f \cdot \frac{x}{z}, \qquad y_{\text{屏}} = f \cdot \frac{y}{z}$$

这就是**透视投影**的全部。近处的点 $z$ 小，除以小数放大 → 近大；远处的点 $z$ 大，除以大数缩小 → 远小；平行的铁轨因为 $x/z$ 比值趋同而在远处汇聚。初中相似三角形直接给出这两行公式——图形学最深的魔法往往长着最朴素的脸。

## 3. 正式定义

**针孔模型**：相机位于原点，朝 $+z$ 看，焦距 $f$（投影面距离）。空间点 $(x,y,z)$ 的屏幕坐标为

$$x_s = f\frac{x}{z}, \qquad y_s = f\frac{y}{z}$$

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $f$ | 焦距 | 控制视野宽窄：f 大=望远镜 |
| $z$ | 深度 | 必须 >0，否则公式失真 |
| 视锥 | frustum | 能被看见的空间四棱锥 |

**近平面与远平面**：$z$ 太小时除法爆炸（数值溢出），太远时精度浪费——渲染管线只保留 $z \in [z_{near}, z_{far}]$ 之间的切片，锥外几何直接裁掉。

**正交投影**对照：不做除法、直接丢掉 $z$（$x_s=x$），平行线永远平行——CAD 图纸和"上帝视角"小游戏用它，牺牲立体感换测量方便。

## 4. 分步例题

**例**：相机焦距 $f=2$，求点 $(3, 2, 6)$ 与 $(3, 2, 12)$ 的屏幕坐标。

1. 第一点：$x_s = 2\times\dfrac{3}{6} = 1.0$，$y_s = 2\times\dfrac{2}{6} \approx 0.67$；
2. 第二点（深度翻倍）：$x_s = 2\times\dfrac{3}{12} = 0.5$，$y_s = 2\times\dfrac{2}{12}\approx0.33$；
3. 对比：同一个空间点，深度加倍后屏幕坐标精确减半；
4. 结论：屏幕坐标与深度成反比——"近大远小"不是修辞，是这个除法的字面效果。

检查量级：两点都在画面内且方向一致（同象限），只是大小减半，符合"沿视线后退"的物理直觉。

## 5. 动手实验

### 实验 1（viz）：焦距与深度如何改写斜率

```viz
{
  "type": "plot",
  "title": "屏幕坐标 x_s = f·x/z：斜率 = 焦距 ÷ 深度",
  "expr": "f*x/z",
  "label": "屏幕坐标",
  "xmin": -4,
  "xmax": 4,
  "sliders": [
    { "name": "f", "min": 0.5, "max": 3, "step": 0.25, "value": 1 },
    { "name": "z", "min": 1, "max": 8, "step": 0.5, "value": 2 }
  ]
}
```

怎么玩：固定 z 拖 f——直线变陡，相当于换长焦镜头（视野收窄、物体显大）；固定 f 拖 z——直线躺平，深度越大的平面被压得越扁。每个"深度层"都是一条过原点直线，整个三维场景就这样被逐层拍扁。

### 实验 2（python）：给立方体拍一张旋转照片

```python title="线框立方体的透视投影（手写循环）"
import math
import matplotlib.pyplot as plt

# sliders: yaw_deg=30 [0:90:5]

yaw = math.radians(yaw_deg)
c, s = math.cos(yaw), math.sin(yaw)
F = 2.0          # 焦距
DIST = 6.0       # 相机后撤距离：把立方体推远避免 z 太小

verts = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
         [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]]
edges = [[0, 1], [1, 2], [2, 3], [3, 0],
         [4, 5], [5, 6], [6, 7], [7, 4],
         [0, 4], [1, 5], [2, 6], [3, 7]]

proj = []        # 收集八个顶点的屏幕坐标
for v in verts:
    xr = c * v[0] + s * v[2]           # 绕 y 轴旋转的 x 分量
    yr = v[1]                          # 竖直轴是 y 轴，高度保持不变
    zr = -s * v[0] + c * v[2]          # 绕 y 轴旋转的 z 分量
    z = zr + DIST                      # 深度整体加偏移，保证 >0
    proj.append([F * xr / z, F * yr / z])   # 透视除法：本课主角

for e in edges:
    a = proj[e[0]]
    b = proj[e[1]]
    plt.plot([a[0], b[0]], [a[1], b[1]], marker="o")

plt.title(f"cube at yaw={yaw_deg} deg")
plt.axis("equal")                    # equal：两轴等比例，立方体不变形
plt.grid(True)
```

怎么玩：拖动 yaw_deg，立方体绕竖直轴转动——远侧棱自动比近侧短，立体感全靠透视除法凭空捏造。把 `F * xr / z` 改成 `xr`（去掉除法）再跑一次：画面瞬间"拍扁"，变成正交投影——两张图对比，你就亲眼见到了第三维是怎么被除掉的。

### 实验 3（python）：滑块对比两种投影的性格

```python title="同一排柱子的两种命运"
import math
import matplotlib.pyplot as plt

# sliders: spacing=2 [1:4:1]

F = 2.0
DIST = 10.0
xs_persp = []
ys_persp = []
xs_ortho = []
heights = []

for k in range(6):                     # 六根等高等距的柱子顶点
    x = (k - 2.5) * spacing            # 以原点对称排开
    z = DIST + k * 3                   # 每根更远一点，制造纵深
    xs_persp.append(F * x / z)
    ys_persp.append(0)                 # 顶点画在同一水平线上便于比较
    xs_ortho.append(x)
    heights.append(z)

plt.scatter(xs_persp, ys_persp, color="tomato", label="perspective")
plt.scatter(xs_ortho, ys_persp, color="steelblue", label="orthographic")
plt.legend()
plt.title("same pillars: two projections")
plt.grid(True)

print(f"正交间距恒为 {spacing}; 透视远端间距仅 {round(xs_persp[5]-xs_persp[4], 2)}")
```

怎么玩：蓝点是"图纸世界"——间距永远均匀；红点是"眼睛世界"——间距按深度比例坍缩。CAD 选蓝、游戏选红，选择标准只有一条：你要测量，还是要沉浸。

### 快问快答

```quiz
渲染管线为什么必须设一个近平面（near plane）？
- 防止玩家看到自己角色的内部贴图
- 深度接近 0 时透视除法数值爆炸，必须提前裁剪 [*]
- 为了节省电费
? x_s = f·x/z 中 z→0 时结果冲向无穷大，浮点数直接溢出。近平面把 z 很小的切片裁掉，是数值安全阀。
```

:::warning[常见误区]

**误区一**："你以为焦距越大看得越广。" 反了：f 越大斜率越陡、同样屏幕装下的场景越小——那是望远镜；广角镜头对应小 f。摄影里的"焦距"与这里的几何量同源同向。

**误区二**："你以为透视投影是矩阵乘法的一种。" 它包含**除法**，不是线性变换也不是仿射变换；管线用上一课埋伏的 w 分量把除法推迟到最后一步统一执行，但本质没变。

**误区三**："你以为远处的东西真的变小了。" 物体的实际尺寸从未改变，改变的只是它在屏幕上的张角。透视投影忠实记录的是"从相机看过去的角度"，而非物体的物理大小。

:::

## 6. 练习

**练习 1**：相机 $f=2$，求点 $(3, 2, 6)$ 的屏幕坐标（两位小数，打印两行）。代码能跑但除错了对象：

```exercise
# @title: 练习：这一针孔扎对了没有
# @check: 1.0
# @check: 0.67
# @hint: 公式是 f·x/z 与 f·y/z——分母永远是深度 z；检查现在除了谁
f = 2.0
point = [3, 2, 6]

xs = point[0] / f * point[2]     # ← 问题在这：乘了 z 又除了 f，全反了
ys = point[1] / f * point[2]
print(round(xs, 2))
print(round(ys, 2))
```

改对后输出 1.0 和 0.67：$2\times3/6=1.0$、$2\times2/6\approx0.67$。

**练习 2**：两根等高电线杆位于 $(\pm 4, 0, 10)$ 与 $(\pm 4, 0, 20)$（成对），$f=1$。分别求四者的屏幕横坐标，并验证"同一深度的两杆间距随深度减半而减半"。

<details>
<summary>点开查看逐步解答</summary>

深度 10 的对子：$x_s=\pm 4/10=\pm0.4$，间距 0.8；深度 20 的对子：$\pm0.2$，间距 0.4。深度翻倍 → 间距减半 ✓。代码：

```python
for d in [10, 20]:
    left = 1 * (-4) / d
    right = 1 * 4 / d
    print(round(right - left, 3))
```

输出 0.8 和 0.4。铁轨汇成一点的"灭点"，就是这串间距趋近于零的极限。
</details>

**练习 3**：为什么 CAD 软件和《模拟城市》俯视图常用正交投影？说出一条收益、一条代价。

<details>
<summary>点开查看逐步解答</summary>

收益：平行线保持平行、同尺寸物体屏幕上等大，测量与布局不变形；代价：没有近大远小，纵深信息丢失，人眼觉得"不真实"。工程制图要的是可测性，游戏上帝视角要的是全局感——两者都宁可放弃立体错觉。
</details>

## 7. 边界与适用条件

- 投影公式要求相机坐标系下 $z>0$；世界坐标需先经**视图变换**（把相机挪到原点的刚体逆变换）才能代入公式。
- 除法在 $z \to 0$ 处发散：近平面裁剪不是可选优化，而是数学必需。
- 屏幕坐标还要经视口映射（缩放+平移到像素网格）才是最终像素位置；本课的 $(x_s,y_s)$ 是连续坐标。

## 8. 选读：4×4 投影矩阵与 w 的绝杀

<details>
<summary>选读 · 把除法藏进第四个分量</summary>

真正的管线并不当场做除法，而是左乘一个 4×4 矩阵：

$$P=\begin{pmatrix}f&0&0&0\\0&f&0&0\\0&0&A&B\\0&0&-1&0\end{pmatrix}$$

乘完得到 $(fx,\ fy,\ Az+B,\ -z)$——注意第四分量变成了 $-z$！硬件最后统一执行透视除法 $\frac{x}{w}$，一次电路同时完成三件事：投影到屏幕、压缩深度进 [0,1]（A、B 由远近平面定）、保留符号供裁剪判断。

这就是齐次坐标 w 的终极用途：它让"不可矩阵化的除法"也能搭上矩阵流水线的车。上一课说 w=1 像门票，这一课你会看到检票员只在出口出现一次。

注意约定：上面的末行 $(0,0,-1,0)$ 是 OpenGL“相机朝 $-z$ 看”的写法。本课正文让相机朝 $+z$ 看，因此对应的第四行应写成 $(0,0,1,0)$；深度压缩系数 $A,B$ 也要随这个符号约定一起调整。

</details>

## 9. 下一站

屏幕坐标还是连续的小数，而显示器是离散的像素格子。三角形如何被切成像素？颜色又如何从三个顶点公平地"流"到每个像素中心？光栅化登场。

→ [三角形光栅化与重心坐标](./30-rasterization-barycentric.md)
