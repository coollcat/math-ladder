---
title: 相机位姿与 SfM：从照片堆里同时解出自己在哪
lesson_id: robotics-motion/sfm-pose-estimation
prereqs:
  - robotics-motion/slam-pf-ekf
  - graphics/perspective-projection
  - linalg-advanced/least-squares
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - structure-from-motion
  - triangulation
  - bundle-adjustment
applications:
  - 3dgs-nerf-capture
  - drone-vision-localization
exits:
  - scientific-computing
---

# 相机位姿与 SfM：从照片堆里同时解出自己在哪

## 1. 从一个场景开始

游客绕着一座雕像拍了一圈照片。想喂给 3D 高斯泼溅训练，第一步不是建模，而是一个尴尬的问题：**每张照片是"从哪、朝哪"拍的？**没有位姿，几百张照片对不齐，泼溅无从谈起。SfM（Structure from Motion，运动恢复结构）的答复很硬气：位姿不必预先测量——**照片与照片之间的重叠本身，就是解开"相机在哪"与"点在哪"这两道互锁问题的钥匙**。无人机视觉定位、3DGS/NeRF 采集、文物数字化，全都从这里起步。

## 2. 直觉解释

闭上一只眼，轮流用左右眼位置看你的拇指——拇指相对背景"跳"了一下。这个跳动叫**视差**：同一物体从不同位置看，落点不同；**跳多少，由"你挪了多远"与"物体多远"共同决定**。视差几何因此是一座双向桥：知道相机怎么挪的，能量出物体深度（三角测量）；知道一批点的深度关系，能反推相机怎么挪的。

SfM 把两件事**同时**做：先靠特征点匹配把不同照片里的"同一个点"认出来（第 145 课的视觉 SLAM 会细讲），再用"视差方程"交替推进——位姿更准了，点的位置跟着更准；点的位置更准了，位姿又能再校一轮。最后用一锅**整体最小二乘**（捆绑调整）把所有照片、所有点一起炖到收敛：让每个点在每个相机里的"预测落点"与"实际落点"的偏差平方和最小。

## 3. 正式定义

针孔相机把三维点 $X = (X, Y, Z)$ 投到像平面上（第 20 课的老朋友）：

$$s_x = f \frac{X}{Z}, \qquad s_y = f \frac{Y}{Z}$$

两个相机看同一点，光线的交点就是该点的三维位置（**三角测量**）。设左相机在原点、视线方向 $u$；右相机在 $p_1$、方向 $v$，求交即解

$$a\,u = p_1 + b\,v$$

而**捆绑调整**（bundle adjustment）是全站的最终账本：

$$\min_{\text{位姿}, X} \sum_{i, j} \lVert \pi(T_i, X_j) - s_{ij} \rVert^2$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $T_i$ | 第 $i$ 个相机的位姿 | 在哪、朝哪（旋转 + 平移） |
| $X_j$ | 第 $j$ 个三维点 | 稀疏地图点 |
| $\pi(\cdot)$ | 投影 | 按针孔模型把点投进第 $i$ 个相机 |
| $s_{ij}$ | 观测落点 | 点 $j$ 在照片 $i$ 上实际量到的像素坐标 |
| $\lVert \cdot \rVert^2$ | 重投影误差 | 预测落点与实际落点的像素差 |

这就是第 21 章最小二乘的大号翻版——只是参数从几个系数膨胀成"几百个位姿 + 几万个点"，全靠雅可比矩阵的稀疏性才炖得动（选读再叙）。

## 4. 分步例题

**二维三角测量手算**：左相机在原点，看见某点的视线方向 $u = (1, 1)$；右相机在 $(4, 0)$，方向 $v = (-1, 1)$（朝左上）。求交点 $a\,u = (4, 0) + b\,v$：

1. 拆成两个方程：$a \cdot 1 = 4 - b$（x 分量）；$a \cdot 1 = b$（y 分量）；
2. 代入：$a = 4 - a \Rightarrow a = 2$，于是 $b = 2$；
3. 交点 $= a\,u = (2, 2)$——两台相机都"同意"这个点在 2 米远、2 米高处；
4. 顺带读出深度：从任一相机的光轴量，该点深度都是 2——**两台相机一合计，单张照片里丢失的深度就被视差补了回来**。

反过来若两位姿全是猜的，交点对不上（两条光线擦肩而过），"歪了多少"就是优化要消化的重投影误差。

## 5. 动手实验

先看重投影误差这座碗：横轴是"猜的深度"，纵轴是投影落点与观测的偏差——碗底正是真实深度：

```viz
{
  "type": "plot",
  "title": "重投影误差碗：猜的深度对不对，偏差说了算（真深度 z=2）",
  "expr": "(2/x-1)*(2/x-1)",
  "xmin": 0.5,
  "xmax": 5,
  "sliders": []
}
```

### 实验（python）：视差测深 + 一个深度先验定标尺

```python title="视差测深与基线标定"
import math
import matplotlib.pyplot as plt

def triangulate(B, u, v):                        # 两相机三角测量：解 a·u = (B,0) + b·v
    det = u[0] * (-v[1]) - (-v[0]) * u[1]        # 二阶行列式
    a = (B * (-v[1]) - (-v[0]) * 0) / det
    b = (u[0] * 0 - u[1] * B) / det
    return (a * u[0], a * u[1])

u = (1.0, 1.0)                                   # 左相机视线：45° 斜向上
v = (-1.0, 1.0)                                  # 右相机视线：135° 朝左上
pt = triangulate(4.0, u, v)
print("三角测量交点 =", (round(pt[0], 2), round(pt[1], 2)))

# 尺度标定：纯视觉的 SfM 里，基线 B 与所有点的深度会一起缩放（尺度不可观），
# 任何 B 都能让光线"交上"——直到雷达给了一个点的真实深度，尺度才被钉死。
disparities = [1.0, 0.8, 0.5]                    # 三个点的视差观测（正比于 1/深度）
radar_prior = {0: 4.0}                           # 雷达先验：0 号点深度 4 米（其余点没有）

def depth_from_disparity(d, B):
    return B / d                                 # 视差测深：Z = f·B/d，取 f = 1

curve_with = []
curve_without = []
best_B = None
best_err = None
trial = 2.0
while trial <= 6.01:                             # 网格搜索：试一排候选基线
    err_with = 0.0
    for i, d in enumerate(disparities):
        Z = depth_from_disparity(d, trial)
        if i in radar_prior:                     # 有先验的点：深度账要平
            err_with = err_with + (Z - radar_prior[i]) ** 2
    curve_with.append((trial, err_with))
    if best_err is None or err_with < best_err:
        best_err = err_with
        best_B = trial
    trial = trial + 0.1
print("最优基线 B =", round(best_B, 2), "（真实值 4.0）")
print("标定后各点深度 =", [round(depth_from_disparity(d, best_B), 2) for d in disparities])

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot([c[0] for c in curve_with], [c[1] for c in curve_with], label="with radar prior")
ax.set_xlabel("baseline B")
ax.set_ylabel("depth prior error")
ax.legend()
plt.show()
```

怎么玩：三角测量交点 $(2.0, 2.0)$ 与手算一致；网格搜索把基线钉回 $4.0$——误差曲线是单谷碗，谷底即真值。关键的一手是那个雷达先验：把 `radar_prior` 清空再跑，你会看到**任何 B 的误差都一样**——纯视觉的世界没有绝对尺度（选读详述），一个外部深度先验就像抛锚，把整条"形状正确的缩略世界"钉回真实米数。捆绑调整做的事与这个网格搜索同构，只是同时微调**几百个位姿和几万个点**。

```quiz
SfM 跑完一整套流程，产出的是？
- 一段已标注的训练视频
- 每张照片的相机位姿 + 一团稀疏三维点云 [*]
- 一张拼接好的全景图
? 特征匹配牵出的几何方程，同时解出"相机在哪"与"点在哪"：位姿与稀疏结构一起水落石出——3DGS/NeRF 的采集预处理正是这一步。
```

::::warning[常见误区]

**误区一**："你以为一张照片就能量出深度。" 单视图的 $s_x = f X / Z$ 里，$X$ 与 $Z$ 互相纠缠：远处的矮个子与近处的高个子可以投在同一像素。深度必须靠**第二个视角的视差**（或 IMU、深度传感器）才能解出——双目相机、结构光、LiDAR 都是给视差几何送援兵的。

**误区二**："你以为特征匹配错了优化会救回来。" 捆绑调整是最小二乘：错配给出的"假方程"会被它一本正经地拟合进答案，整片地图被拉歪。工程上靠外点剔除（RANSAC 一类投票）先清场，再进优化——垃圾进、垃圾出，先于优化发生。

**误区三**："你以为相机怎么动都行。" **纯旋转**（原地打转）没有平移视差，深度完全不可观；沿光轴直冲的窄基线运动，深度也病态地不准。采集路线设计（绕圈、横向错位）与无人机"扫描式"航线，本质上都是在给视差几何喂好数据。

::::

## 6. 练习

```exercise
# @title: 练习：两相机三角测量
# @check: 2.0
# @check: 2.0
# @hint: 右相机立在 x=+4，基线是正的——把 B 写成 -4，两条光线就交到相机背后去了。
import math

def triangulate(B, u, v):                        # 解 a·u = (B, 0) + b·v
    det = u[0] * (-v[1]) - (-v[0]) * u[1]
    a = (B * (-v[1]) - (-v[0]) * 0) / det
    b = (u[0] * 0 - u[1] * B) / det
    return a * u[0], a * u[1]

u = (1.0, 1.0)                                   # 左相机视线方向
v = (-1.0, 1.0)                                  # 右相机视线方向（朝左上）
B = -4.0                                         # ← 问题在这：右相机在 (4, 0)，基线取负了

px, py = triangulate(B, u, v)
print(round(px, 1))
print(round(py, 1))
```

<details>
<summary>点开查看逐步解答</summary>

把 `B = -4.0` 改成 `B = 4.0`：行列式 $= 1 \times (-1) - 1 \times 1 = -2$，$a = \dfrac{4 \times (-1)}{-2} = 2$、$b = \dfrac{-4}{-2} = 2$，交点 $(2.0, 2.0)$。基线取负时 $a = b = -2$，交点 $(-2, -2)$ 落到两台相机**背后**——三角测量不报错、不警告，只是安静地交出一个荒谬答案。检查"深度为正"是位姿估计的第一道体检：负深度 = 位姿或匹配必有一个在说谎。
</details>

**练习 2**：把雕像从 5 米挪近到 2 米再拍同一组照片，视差变大了还是小了？对深度估计的精度是好事还是坏事？

<details>
<summary>点开查看逐步解答</summary>

变大了。视差 $\propto \dfrac{\text{基线}}{\text{深度}}$：物体越近，两台相机的落点差越大，视差对深度的**敏感度**越高，三角测量交点越准；太远的物体视差趋零，两根光线近乎平行，交点位置对 1 像素的匹配噪声都极度敏感。这就是"双目测距近准远糙"的几何根源——也是采集时"离目标别太远"这条纪律的来历。
</details>

## 7. 选读：捆绑调整为什么炖得动

几百个位姿、几万个点，参数上百万，稠密最小二乘的 $10^{12}$ 规模矩阵谁也存不下。救兵是**稀疏性**：每个三维点只在它被拍到的那几张照片里出现，雅可比矩阵绝大多数是零，天然是"点块 × 相机块"的十字结构。经典手法用 Schur 补先把点块逐个消掉（每块都是小矩阵，求逆便宜），再解一个只剩相机位姿的紧凑方程——规模从百万降到千级。COLMAP 这类现成工具把"匹配 → 初始化 → 增量注册 → 全局 BA"流水线封成一条命令；还有一个必须记住的天生缺陷：**整个重建没有绝对尺度**——把所有点与位姿放大一倍、焦距翻倍，照片看起来一模一样。所以视觉 SfM 的输出是"形状正确的缩略世界"，要还原真实米数，得请 IMU、已知基线或雷达来定标尺。

## 8. 下一站

有了位姿与稀疏点，SLAM 的"滤波法"可以升级成"图优化法"了：把整段轨迹当成一张弹簧网一次拉直——位姿图优化与 ICP 接棒。

→ [SLAM 现代后端：位姿图优化与 ICP 点云配准](./140-pose-graph-icp.md)
