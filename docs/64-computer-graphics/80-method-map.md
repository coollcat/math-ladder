---
title: 图形学方法地图
lesson_id: graphics/method-map
prereqs:
  - graphics/ray-intersection-pathtrace
  - graphics/phong-lighting
  - graphics/texture-depth-blend
volume: 5
layer: L7
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts: []
applications:
  - computer-graphics
  - game-development
exits:
  - engineering
---

# 图形学方法地图

## 1. 从一个场景开始

产品经理甩来三个需求：①首页的 Logo 要在鼠标滑过时转起来；②场景里角色要能躲到墙后面；③App 图标要圆润光滑带高光。三条需求听起来都是"图形学"，该从哪一课找工具？

本章走完了几何管线与光线两大半场，这一课做收束：**给你一张"问题发生在哪一环 → 用哪件工具"的分诊台**，再用三个真实需求演练一遍。

## 2. 直觉解释

图形学的问题，先按"谁在算"分成两大阵营：

```text
光栅化（实时阵营）                     光线追踪（离线阵营）
  模型 → 矩阵搬运 → 投影到屏幕           从相机发射光线 → 问先撞到谁
  逐三角形填充像素                        逐像素反向追光
  快（一秒 60 帧），光影靠公式骗眼睛       慢（一帧几分钟），光影是算出来的
```

**第一个分诊问题永远是：实时还是离线？** 游戏画面、界面动效走光栅化；电影特效、产品渲染图走光线追踪。

阵营之内再分诊：

- 几何问题（位置、形状、运动）→ 回到**矩阵**（仿射变换、四元数）；
- 遮挡问题（谁在前谁在后）→ 回到**深度测试**（z-buffer）；
- 颜色问题（亮暗、材质、高光）→ 回到**光照模型**（Phong/PBR）；
- 光滑轮廓与曲线 → 回到 **Bezier 与细分**。

## 3. 正式定义

方法地图（决策表）：

| 需求关键词 | 首选工具 | 本章出处 |
| --- | --- | --- |
| 物体要动/转/缩放 | 仿射矩阵 + 四元数 | 齐次仿射、四元数两课 |
| 谁挡住谁 | z-buffer 深度测试 | 纹理深度混合课 |
| 表面亮暗与高光 | Phong / PBR 光照 | Phong 光照课 |
| 轮廓要光滑、圆角 | Bezier + 细分 | Bezier、细分两课 |
| 镜面、阴影、焦散 | 光线追踪 | 光线求交课 |
| 贴图细节远近不一 | Mipmap 纹理过滤 | 纹理深度混合课 |
| 大场景只画可见部分 | 视锥裁剪 + 包围盒 | 透视投影课 |

## 4. 分步例题

**例 1**：需求①"Logo 随鼠标转起来"。

1. 实时交互 → 光栅化阵营；
2. "转"是几何运动 → 仿射矩阵（每帧根据鼠标位置更新旋转角）；
3. 结论：`affine-transform`，一课搞定，不需要光照与追踪。

**例 2**：需求②"角色躲到墙后面"。

1. 实时渲染 → 光栅化；
2. "谁挡谁"是遮挡判定 → z-buffer 逐像素比深度；
3. 结论：`z-buffer`——而且它免费：显卡每帧本来就做。

**例 3**：需求③"图标圆润带高光"。

1. "圆润光滑"是曲线需求 → Bezier 轮廓；
2. "高光"是颜色需求 → Phong 的镜面项；
3. 结论：`bezier` 打底 + 光照上色，两课各出一招。

## 5. 动手实验

### 实验 1：把分诊台写成代码

```python title="按需求关键词推荐工具"

def recommend(task):                       # 只做关键词分诊，够用就好
    if '挡' in task or '前后' in task or '遮挡' in task:
        return 'z-buffer'                  # 遮挡问题 → 深度测试
    if '光滑' in task or '圆角' in task or '曲线' in task:
        return 'bezier'                    # 轮廓问题 → Bezier/细分
    if '转' in task or '平移' in task or '缩放' in task:
        return 'affine-transform'          # 运动问题 → 仿射矩阵
    if '镜子' in task or '倒影' in task or '反射' in task:
        return 'raytracing'                # 镜面效果 → 光线追踪
    return 'ask-more'                      # 描述太模糊，追问细节

print(recommend('让物体转起来'))
print(recommend('判断两个物体谁挡住谁'))
print(recommend('给 Logo 加光滑圆角'))
print(recommend('镜面地板的倒影'))
```

输出 `affine-transform`、`z-buffer`、`bezier`、`raytracing`。注意分诊顺序：遮挡与轮廓的关键词先查——它们比"运动"更具体，先匹配specific的再兜底通用的，是写分类器的通用次序。

### 实验 2：同一个场景，两条路线的成本账

```python title="一帧画面的像素数与光线数的数量级对比"
W, H = 1920, 1080                          # 一帧的分辨率
triangles = 200000                         # 场景里的三角形数量

raster_ops = triangles                     # 光栅化：每个三角形处理一遍
ray_ops = W * H                            # 追踪：每个像素至少一条主光线

print(raster_ops)
print(ray_ops)
print(round(ray_ops / raster_ops))         # 数量级之比
```

输出 `200000`、`2073600`、`10`。主光线就要 10 倍工作量，反弹两次再加三个数量级——**这就是为什么电影渲染一帧要几分钟而游戏一帧只有 16 毫秒**。路线选择的本质是在这个数量级鸿沟上做取舍。

## 6. 练习

```exercise
# @title: 练习：补全分诊台
# @check: affine-transform
# @check: z-buffer
# @check: bezier
# @hint: 分支顺序很重要：先查具体关键词（挡/光滑），最后才兜底查运动类；都查不到时返回追问。
def recommend(task):
    if '挡' in task or '前后' in task or '遮挡' in task:
        return 'wrong'                     # ← 有错：遮挡问题应返回 z-buffer
    if '光滑' in task or '圆角' in task or '曲线' in task:
        return 'wrong'                     # ← 有错：轮廓问题应返回 bezier
    if '转' in task or '平移' in task or '缩放' in task:
        return 'wrong'                     # ← 有错：运动问题应返回 affine-transform
    if '镜子' in task or '倒影' in task or '反射' in task:
        return 'raytracing'
    return 'ask-more'

print(recommend('让物体转起来'))
print(recommend('判断两个物体谁挡住谁'))
print(recommend('给 Logo 加光滑圆角'))
```

<details>
<summary>点开查看逐步解答</summary>

修正版：

```python
def recommend(task):
    if '挡' in task or '前后' in task or '遮挡' in task:
        return 'z-buffer'
    if '光滑' in task or '圆角' in task or '曲线' in task:
        return 'bezier'
    if '转' in task or '平移' in task or '缩放' in task:
        return 'affine-transform'
    if '镜子' in task or '倒影' in task or '反射' in task:
        return 'raytracing'
    return 'ask-more'

print(recommend('让物体转起来'))              # affine-transform
print(recommend('判断两个物体谁挡住谁'))      # z-buffer
print(recommend('给 Logo 加光滑圆角'))        # bezier
```

```text
分诊逻辑：遮挡 → 深度测试；轮廓 → 曲线细分；运动 → 仿射矩阵；
镜面反射 → 光线追踪；全都靠不上 → 追问需求，不要瞎猜。
```

分诊台的价值不在覆盖所有情况，而在**把模糊的人类语言翻译成具体的课程入口**——剩下的推导，回各课去查。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你不先问"实时还是离线"就直接选算法。两个阵营的假设完全不同（逐三角形 vs 逐像素），选错阵营，后面全白做。

**误区二**：你以为炫酷效果背后是很深的新数学。拆开看全是本章三件套的组合：**矩阵乘法 + 插值 + 查表**。水体、毛发、爆炸的"高级感"来自参数调校与堆料，不是新定理。

**误区三**：你以为方法地图能替代测量与试验。地图只负责导航；参数（摩擦系数、粗糙度、衰减率）最终来自实测与试错——地图上没有"参数该填几"。

:::

## 8. 快问快答

```quiz
拿到一个图形需求，第一个该问的分诊问题是什么？
- 实时还是离线渲染 [*]
- 用什么编程语言
- 模型有多少个顶点
? 实时走光栅化（逐三角形、公式化光影），离线走光线追踪（逐像素、物理化光影）。阵营选错，后面全盘皆错。
```

```quiz
「角色要能躲到墙后面」最直接对应的工具是什么？
- z-buffer 深度测试 [*]
- Phong 光照模型
- Bezier 曲线细分
? 谁挡谁就是遮挡判定，显卡每帧免费做的深度测试正好胜任，不需要额外算法。
```

## 9. 选读：地图之外的下一程

<details>
<summary>选读 · 两块没讲的高地，与一条刚通车的新干线</summary>

1. **着色器编程**：本章的变换、光栅化、光照都发生在 GPU 的可编程阶段（顶点着色器、片元着色器）里。你写的每一段 Phong 其实就是一小段着色器代码——语言不同，数学一字不差。
2. **物理模拟**：布料、流体、破碎属于另一条支线（数值 ODE/PDE），与第 22 章动力系统和第 23 章 PDE 的工具直接接轨。
3. **神经渲染**：把渲染管线做成可求导的函数，让照片反过来教场景参数——"梯度下降"遇上"渲染器"。这条新干线已在本章通车：接下来三课从可微分渲染一路讲到 NeRF 与 3D 高斯泼溅；第 55 章的物理信息神经网络是同一思想的近亲。

图形学是"看得见的数学"：每学一章，屏幕上就多一种可玩的验证。往后你在任何地方遇到矩阵、插值、判别式，都可以回头想想它在屏幕上长什么样。

</details>

## 10. 下一站

两条传统管线之后，图形学还有一条 2020 年代的新干线——**神经渲染**：把渲染器做成可求导的函数，让照片反过来教场景。下一课把可微分渲染接上第 46 章的反向传播。

→ [可微分渲染：让画面倒过来教参数](./85-differentiable-rendering.md)
