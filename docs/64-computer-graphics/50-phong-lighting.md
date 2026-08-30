---
title: Phong 光照直觉
lesson_id: graphics/phong-lighting
prereqs:
  - graphics/perspective-projection
  - linalg/dot-product
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
  - phong-reflection
  - lambert-cosine-law
applications:
  - game-shading
  - product-rendering
exits:
  - graphics/ray-tracing-preview
---

# Phong 光照直觉

## 1. 从一个场景开始

同一个 3D 场景，关掉光照是一张扁平的剪纸；打开光照，球有了圆润的体积感、金属有了刺眼的高光、墙角陷进柔和的阴影里。像素还是那些像素，变的全是**亮度**。

1975 年 Bui Tuong Phong 提出的这个模型至今仍在每块显卡里跑（作为基础层）。它的全部内容是一行公式加一个物理直觉：**亮度取决于表面朝向与光线方向的夹角**。

## 2. 直觉解释

Phong 把像素收到的光拆成三份工资：

- **环境光 ambient**：房间里的底噪——没被任何光源直射也黑不到零，给个保底常数；
- **漫反射 diffuse**：粗糙表面的主力。一束光照到斜面上的能量密度按 $\cos\theta$ 打折（θ 是法线与光线夹角）——正午阳光垂直地面最毒，傍晚斜射就温柔，这就是 Lambert 余弦定律的日常版本；
- **镜面高光 specular**：光滑表面的奖金。光有反射方向，若你的眼睛恰好站在反射线附近，就看到亮斑；站位越准越亮，用 $(\text{对准程度})^n$ 惩罚偏离——指数 n 越大高光越小越锐（塑料 n≈10，镜子 n≈100）。

两次点积搞定前两名的度量：$\max(0, N\cdot L)$ 管漫反射，$(\max(0, R\cdot V))^{\alpha}$ 管高光。第 11 章那句"点积 = 夹角的余弦"，在这里变成每一颗像素的明暗。

## 3. 正式定义

$$I = k_a + k_d\,\max(0,\ N\cdot L) + k_s\,\max(0,\ R\cdot V)^{\alpha}$$

| 符号 | 名字 | 取值 |
| --- | --- | --- |
| $k_a$ | 环境光系数 | 小常数，如 0.1 |
| $k_d$ | 漫反射系数 | 材质底色强度 |
| $k_s$ | 镜面反射系数 | 光滑度预算 |
| $\alpha$ | 高光指数 | 越大斑点越小 |
| $N$ | 法线（单位向量） | 垂直表面朝外 |
| $L$ | 光线方向（单位向量） | 表面指向光源 |
| $V$ | 视线方向（单位向量） | 表面指向眼睛 |
| $R$ | 反射方向 | $R = 2(N\cdot L)N - L$ |

三个 max(0, ·) 是防呆设计：光在背面时点积为负，物理上不该有照明，取零截断。

## 4. 分步例题

**例**：某像素处 $N\cdot L = 0.5$，$R\cdot V = 0.9$；材质 $k_a=0.1, k_d=0.8, k_s=0.4, \alpha=10$。求最终亮度。

1. 漫反射项：$k_d\times0.5 = 0.8\times0.5 = 0.4$；
2. 高光指数：$0.9^{10} \approx 0.349$（偏离一点点，奖金大缩水）；
3. 镜面项：$0.4\times0.349 \approx 0.140$；
4. 合计：$I = 0.1+0.4+0.140 = 0.64$——六成半亮，中等偏亮的漫反射面上浮着一小片高光。

检查量级：三份工资都在 0~1 区间内相加，结果 0.64 无需截断；若超过 1 则要 clip 到 1（过曝）。

## 5. 动手实验

### 实验 1（viz）：夹角如何决定亮度

```viz
{
  "type": "dotprod",
  "title": "把绿箭头当法线 N、蓝箭头当光线 L：夹角余弦就是亮度",
  "u": [3, 1],
  "v": [2, 0]
}
```

怎么玩：拖动蓝色箭头（光线 L）绕原点转动，盯住读数里的 cos 夹角与橙色投影长度——投影越长（点积越大），对应像素越亮。转到垂直（90°）时投影消失、漫反射归零；再转过去变成负数，被 max(0,·) 一刀切回零：**背光面不发光**。

### 实验 2（python）：给一颗球打光

```python title="Phong 着色的球体（逐像素循环）"
import math
import matplotlib.pyplot as plt

# sliders: kd=80 [0:100:5], alpha=12 [2:40:1]

kd = kd / 100
ka = 0.15                       # 环境光保底
ks = 0.45
lx, ly, lz = 0.27, 0.36, 0.89   # 光线方向（已归一化的固定值）

img = []
for j in range(60):             # 屏幕行
    row = []
    ny = (j - 29.5) / 30        # 映射到 [-1, 1]
    for i in range(60):         # 屏幕列
        nx = (i - 29.5) / 30
        r2 = nx * nx + ny * ny
        if r2 > 1:
            row.append(20)      # 球外背景
            continue            # continue：跳过本轮循环剩余部分
        nz = math.sqrt(1 - r2)  # 球面法线的 z 分量（勾股定理）
        diff = nz * lz + nx * lx + ny * ly          # 点积 N·L
        if diff < 0:
            diff = 0.0
        rx = 2 * diff * nx - lx    # 反射向量 R = 2(N·L)N − L
        ry = 2 * diff * ny - ly
        rz = 2 * diff * nz - lz
        spec = rz                  # 视线朝 +z，R·V 就是 R 的 z 分量
        if spec < 0:
            spec = 0.0
        bright = ka + kd * diff + ks * spec ** alpha
        if bright > 1:
            bright = 1.0           # 过曝截断
        row.append(round(bright * 255))
    img.append(row)

plt.imshow(img, origin="lower", cmap="gray")
plt.title(f"kd={round(kd, 2)}, alpha={alpha}")
```

怎么玩：默认参数下球体右上被照亮（光源方向 lx,ly 为正）、左下没入黑暗、高光点悬在明暗交界偏光源一侧。拧大 alpha：高光收缩成针尖（金属感）；拧小到 2：整颗球泛白（塑料感）。进阶：手动把代码里的 `lx, ly` 改成负数再跑——光源搬家，明暗界线整体翻面。

### 实验 3（python）：滑块看高光指数的锋利度

```python title="(R·V)^alpha 曲线：奖金的衰减速度"
import math
import matplotlib.pyplot as plt

# sliders: alpha=10 [1:50:1]

xs = []
ys = []
for s in range(101):
    rv = s / 100                # R·V 从 0 到 1
    xs.append(rv)
    ys.append(rv ** alpha)      # 指数惩罚曲线

plt.plot(xs, ys)
plt.title(f"specular falloff, alpha={alpha}")
plt.xlabel("R dot V")
plt.ylabel("weight")
plt.grid(True)

print(f"RV=0.9 时高光权重 {round(0.9 ** alpha, 3)}; RV=0.99 时 {round(0.99 ** alpha, 3)}")
```

怎么玩：alpha=1 是一条直线（人人有奖）；拉到 40 只剩贴着 1.0 的窄条存活——只有几乎正对反射线的视线才分到高光。塑料与金属的区别，就是这个数字的区别。

### 快问快答

```quiz
为什么高光的颜色通常等于光源颜色，而不是物体颜色？
- 编程时图省事的历史遗留
- 镜面反射是光直接弹进眼睛，未经物体染色 [*]
- 物体颜色在高光区被自动取反了
? 漫反射是光进入表层再散射出来，带上了材质色素；镜面高光是表面直接反射的光路，白光照上来的还是白光。想渲染"彩色金属"需要更物理的模型（PBR 的金属度参数）。
```

:::warning[常见误区]

**误区一**："你以为法线可以不归一化就点积。" $N\cdot L$ 只有在两者都是单位向量时才等于 $\cos\theta$；长度 2 的法线会让漫反射凭空翻倍。归一化是着色器的第一行纪律。

**误区二**："你以为忘了 max(0, ·) 只是小事。" 背光面的点积为负，负数乘系数后反而拉暗再翻转符号——画面会出现"背面比夜还黑、甚至闪烁发亮"的灵异现象。三个截断一个都不能省。

**误区三**："你以为 Phong 是物理正确的。" 它是经验拟合：能量不守恒、高光与菲涅尔效应无关。PBR（基于物理的渲染）补上了这些；但 Phong 用一次点积的成本给出八成观感，至今仍活在移动端与风格化渲染里。

:::

## 6. 练习

**练习 1**：按本课公式计算总亮度（两位小数）：$k_a=0.1, k_d=0.8, k_s=0.4$，$N\cdot L=0.5$，$R\cdot V=0.9$，$\alpha=10$。代码能跑但高光没打折：

```exercise
# @title: 练习：这颗像素有多亮
# @check: 0.64
# @hint: 镜面项是 ks·(R·V)^alpha——指数惩罚不能丢；对照公式检查现在的幂运算
ka = 0.1
kd = 0.8
ks = 0.4
nl = 0.5
rv = 0.9
alpha = 10

value = ka + kd * nl + ks * rv      # ← 问题在这：少了 ** alpha
print(round(value, 2))
```

改对后输出 0.64：$0.1+0.4+0.4\times0.9^{10}\approx0.1+0.4+0.14$。漏掉指数时得 0.86——高光肥大到失真。

**练习 2**：正午阳光垂直照在屋顶（入射角 0°），傍晚斜射成 60° 入射。傍晚单位面积接收的直射光是正午的几倍？（用 Lambert 余弦定律）

<details>
<summary>点开查看逐步解答</summary>

Lambert：接收量 ∝ $\cos\theta$（θ 为光线与法线/竖直方向的夹角）。

- 正午 θ=0°：$\cos 0 = 1$（全额）；
- 傍晚 θ=60°：$\cos 60 = 0.5$（一半）。

傍晚是正午的 **0.5 倍**。代码：

```python
import math
noon = math.cos(math.radians(0))
dusk = math.cos(math.radians(60))
print(round(dusk / noon, 2))
```

输出 0.5。同一颗太阳，角度一变功率减半——地表温度昼夜起伏的第一推动力。
</details>

**练习 3**：多盏灯同时照射时，Phong 公式怎么扩展？会不会出现 I>1？怎么办？

<details>
<summary>点开查看逐步解答</summary>

对每盏灯各算一遍 diffuse+specular 再求和：$I = k_a + \sum_i (k_d\max(0,N\cdot L_i)+k_s\max(0,R_i\cdot V)^{\alpha})$。叠加后很容易超过 1（过曝白斑）；管线在写入帧缓冲前统一 clamp 到 1，或用色调映射（tone mapping）柔和压缩高亮区。
</details>

## 7. 边界与适用条件

- Phong 是**局部光照**：只算"光源→表面→眼睛"的直接路径，不算遮挡——影子必须靠阴影贴图等额外机制伪造。
- 所有方向向量须在同一坐标系且归一化；法线随变换矩阵更新时要用法线矩阵（逆转置）而非模型矩阵本身。
- 高光指数 α 与系数没有物理单位，调参依赖美术眼感；追求测量级真实请转向 PBR 与辐射度学。

## 8. 选读：从 Phong 到 PBR 差在哪一步

<details>
<summary>选读 · 经验模型与物理模型的分水岭</summary>

Phong 把材质概括为三个标量 $(k_a,k_d,k_s)$ 加一个指数，本质是"看起来像就行"的经验拟合。PBR 则回到辐射度学：能量守恒（出射不超过入射）、菲涅尔方程（掠射角反射增强——水面远处反光强）、微表面理论（粗糙度决定法线分布）。Blinn-Phong 是中间站：把"算反射向量 R"换成"算半程向量 H=(L+V)/2"，一次减法提速且高光形状更圆——老手游时代的性能明星。

学习路径上 Phong → Blinn-Phong → PBR 是同一主题的三次重写：直觉层（本课）、工程折中层、物理保真层。掌握本课的两个点积，后面两层只是换更讲究的权重表。

</details>

## 9. 下一站

本章五课走完了"顶点 → 屏幕 → 像素 → 颜色"的主干道。还有一条完全不同的路线：不去变换三角形，而是从相机出发向每个像素发射一根光线，倒查它击中了世界里的什么——光线追踪预览将为你打开这扇门。

→ 返回[章节目录](./index.md)查看实战挑战与本卷全景
