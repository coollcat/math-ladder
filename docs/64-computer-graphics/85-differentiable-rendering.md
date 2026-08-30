---
title: 可微分渲染：让画面倒过来教参数
lesson_id: graphics/differentiable-rendering
prereqs:
  - graphics/ray-intersection-pathtrace
  - deep-learning/backprop
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
  - differentiable-rendering
  - inverse-rendering
  - photometric-loss
applications:
  - 3d-scene-reconstruction
  - material-capture
exits:
  - scientific-computing
---

# 可微分渲染：让画面倒过来教参数

## 1. 从一个场景开始

美术对着参考照片调材质：金属度调多少、粗糙度调多少、灯摆哪儿，全靠渲染一次、瞪一眼、再调一次——**正向渲染**是"参数 → 画面"，人肉在做的是它的反问题："画面 → 参数"。每一次试错都要等一帧渲染，调上百个参数时，这不是手艺，是苦刑。

**可微分渲染**（Differentiable Rendering）把第 46 课的反向传播接进渲染管线：只要"参数 → 画面"的每一步都可导，梯度就能从"画面差多少"一路倒着流回每个参数——让画面自己告诉你，金属度该加 0.07 还是减 0.03。

## 2. 直觉解释

回想训练神经网络的三步：前向算输出、对比真值得损失、反向传梯度改参数。把"网络"换成"渲染器"，剧本一字不改：

- **前向**：用当前参数渲染一张图；
- **损失**：逐像素比较渲染图与目标照片，差多少记多少账；
- **反向**：问每一个参数——"你动一丁点，每个像素会跟着动多少？"这就是 $\partial(\text{像素})/\partial(\text{参数})$，链式法则把它沿着管线倒传回去。

渲染管线里挤的全是"好脾气"的运算：矩阵乘法（第 10 课的仿射变换）、线性插值（第 30 课的重心坐标）、点积光照（第 50 课的 Phong）——处处光滑可导。所以梯度穿过整条管线，在数学上是顺理成章的；真正要小心的只有少数几个"坏脾气"的角落，本课误区卡再点名。

## 3. 正式定义

把渲染器看成一个多元函数 $R(\theta) \to I$：输入参数 $\theta$（灯光、材质、几何……），输出图像 $I$。定义光度损失：

$$L(\theta) = \sum_{p} \left( I_p(\theta) - I^{*}_p \right)^2$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\theta$ | 场景参数 | 想求的东西：材质系数、灯的位置、高斯的形状…… |
| $I_p$ | 渲染像素 | 前向渲染出的第 $p$ 个像素值 |
| $I^{*}_p$ | 目标像素 | 参考照片在第 $p$ 个像素的值 |

优化用第 43 章的老朋友——梯度下降：$\theta \leftarrow \theta - \eta \dfrac{\partial L}{\partial \theta}$，而梯度的每一项由**链式法则**沿"参数 → 场景 → 像素"的计算链条逐段相乘得到：

$$\frac{\partial L}{\partial \theta} = \sum_p 2\,(I_p - I^{*}_p)\cdot \frac{\partial I_p}{\partial \theta}$$

$\partial I_p / \partial \theta$ 正是"参数动一丁点，像素动多少"的敏感度表——渲染器的反向模式自动微分替你把这张表算出来。

## 4. 分步例题

把整个场景压到最简：一个像素，渲染公式 $I = x \cdot a$——几何固定（$x = 2$ 是"投到像素上的份量"），材质系数 $a$ 待求，目标像素 $I^{*} = 4$。

1. **前向**：初值 $a = 0$，渲染 $I = 2 \times 0 = 0$，残差 $I - I^{*} = -4$；
2. **梯度**：$\dfrac{\partial L}{\partial a} = 2\,(I - I^{*}) \cdot \underbrace{x}_{\text{穿透因子}} = 2 \times (-4) \times 2 = -16$——注意链式法则里那个 $x$：像素对 $a$ 的敏感度等于"单位 $a$ 渲染出多少"，这正是"穿透管线"的那一段；
3. **更新**：学习率 $\eta = 0.1$，$a \leftarrow 0 - 0.1 \times (-16) = 1.6$；
4. **再一轮**：$I = 3.2$，残差 $-0.8$，梯度 $2 \times (-0.8) \times 2 = -3.2$，$a \leftarrow 1.6 + 0.32 = 1.92$——参数一步比一步贴着真值 $a = 2$ 走。

四步里没有一步靠"瞪"：画面差多少、参数该动多少，全是链式法则的算术。

## 5. 动手实验

先看损失地形：把待求参数 $a$ 摆在横轴上，光度损失是一座碗——梯度下降就是沿碗壁往谷底滚：

```viz
{
  "type": "plot",
  "title": "光度损失碗：L(a) = (2a - 6)^2，谷底就是答案 a = 3",
  "expr": "(2*x-6)*(2*x-6)",
  "xmin": 0,
  "xmax": 4,
  "sliders": []
}
```

### 实验（python）：梯度下降滚进碗底

```python title="一维可微渲染：前向、残差、梯度、更新"
import math
import matplotlib.pyplot as plt

target = 6.0                    # 目标像素（参考照片给的值）
x = 2.0                         # 固定的几何份量：渲染公式 I = x * a
lr = 0.1                        # 学习率：每步敢走多大

a = 0.0                         # 参数初值：从全黑开始
hist = [a]                      # 记录参数轨迹
for step in range(8):
    render = x * a              # 前向：用当前参数渲染
    err = render - target       # 残差：画面差多少
    g = 2 * err * x             # 链式法则：dL/da = 2·err·(穿透因子 x)
    a = a - lr * g              # 梯度下降：往负梯度方向走一步
    hist.append(a)
    print("step", step, "a =", round(a, 3), "render =", round(x * a, 3))

xs = []
ys = []
for i in range(81):             # 画损失碗：a 从 0 到 4
    t = i * 0.05
    xs.append(t)
    ys.append((x * t - target) ** 2)

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(xs, ys, color="#95a5a6")                       # 损失碗
hs = []
hs_y = []
for v in hist:                  # 把参数轨迹钉在碗上
    hs.append(v)
    hs_y.append((x * v - target) ** 2)
ax.scatter(hs, hs_y, color="#c0392b", zorder=3)
ax.set_xlabel("a")
ax.set_ylabel("loss")
plt.show()
```

怎么玩：8 步之内 $a$ 从 0 滚到 $2.999$，渲染值贴住目标 6——碗上的红点沿碗壁一步比一步慢，谷底自动刹车（越接近谷底梯度越小，步子自然变小）。把 `x` 改成 0.5 再跑：收敛慢了一倍——几何份量小，参数的"话语权"就小，梯度也小，这就是穿透因子的物理含义。

```quiz
可微分渲染的"反向"一步，本质上是在计算什么？
- 把渲染图压缩得更小
- 每个场景参数动一丁点时，每个像素值会跟着变多少 [*]
- 把渲染图转换成线框模型
? 反向传播计算的就是敏感度表 d像素/d参数：链式法则沿渲染管线倒着逐段相乘，最后汇总成"参数该怎么改"的梯度。
```

::::warning[常见误区]

**误区一**："你以为渲染器天然可微。" 大部分运算确实光滑，但**遮挡边界**是例外：物体挪过临界位置，像素被突然挡住/露出，画面跳变、导数不存在。工程做法是把硬遮挡软化成渐变（比如对覆盖面积做平滑近似）——可微渲染器的论文里一大半笔墨都花在这类角落。

**误区二**："你以为有了梯度就万事大吉。" 梯度下降可能滚进**错误的谷**：换一盏灯也能解释照片（欠定问题），光凭一张图分不清"材质亮"还是"灯光亮"。实际系统要靠多视角照片、先验正则（别让参数乱飞）来锁住答案。

**误区三**："你以为学习率随意设。" 碗太陡、步子太大，参数会跨过谷底来回打摆甚至发散——第 46 课 LR 诊断那一课的病，在这里一模一样地复发。

::::

## 6. 练习

```exercise
# @title: 练习：把梯度穿过渲染公式
# @check: 2.4
# @check: 2.88
# @check: 2.98
# @hint: 链式法则别漏了穿透因子：dI/da = x = 2，梯度 = 2·(渲染值−目标)·x，不是 2·(渲染值−目标)。
import math

target = 6.0                    # 目标像素
x = 2.0                         # 几何份量：渲染 I = x * a
lr = 0.1                        # 学习率

a = 0.0
for step in range(3):
    render = x * a              # 前向渲染
    err = render - target       # 残差
    g = 2 * err                 # ← 问题在这：漏了穿透因子 dI/da = x
    a = a - lr * g
    print(round(a, 2))
```

<details>
<summary>点开查看逐步解答</summary>

补上链式法则的最后一环——渲染式 $I = x\,a$ 对 $a$ 求导得 $\partial I/\partial a = x = 2$：

```python
    g = 2 * err * x             # dL/da = 2·err·x
```

修正后三步：$a_1 = 0 - 0.1 \times (-24) = 2.4$；$a_2 = 2.4 + 0.48 = 2.88$；$a_3 = 2.88 + 0.096 \approx 2.98$——收敛到真值 $a = 3$。初始代码的梯度小了一半（少了因子 2），参数爬得慢一截：这不是"学得慢点而已"，而是**方向对了、步长算错**——真实管线里链上几十层，漏一段穿透因子，梯度就整个走样。可微渲染器替你自动做这条链，但链的每一段都得在。
</details>

**练习 2**：把"一个像素"扩成"一张 2×2 图"：渲染值 $I = [[2, 4], [6, 8]]$，目标全为 5。求总损失 $L = \sum (I_p - 5)^2$ 与 $\partial L / \partial I$ 的四个分量。

<details>
<summary>点开查看逐步解答</summary>

残差矩阵 $I - 5 = [[-3, -1], [1, 3]]$，平方求和：$L = 9 + 1 + 1 + 9 = 20$。梯度 $\partial L/\partial I_p = 2(I_p - 5) = [[-6, -2], [2, 6]]$——每个像素领到自己的"修正指令"，符号指向目标方向、大小正比差距。反向模式自动微分做的事，无非是把这张敏感度表继续往参数方向再乘下去。
</details>

## 7. 选读：管线上还有哪些"坏脾气"角落

除了遮挡跳变，至少还有三处：**光线的离散采样**——路径追踪用蒙特卡洛平均，采样数固定时目标函数带随机噪声，梯度也得跟着"降噪"（重参数化技巧让随机性不挡导数路）；**纹理寻址**——贴图坐标取整是阶梯函数，双向线性过滤就是为软化它而生；**可见性与阴影映射**——阴影图比较深度用了不等号，软化成平滑的深度差权重即可。工业级可微渲染器（如 Mitsuba 3、PyTorch3D）把这些角落逐个打磨光滑，换来一句承诺：任意场景参数，梯度随叫随到。

## 8. 下一站

管线通了，下一个问题是用它去"练"什么：如果场景干脆不是一个模型，而是一团雾呢？下一课的 NeRF 把整间屋子装进一枚网络。

→ [NeRF 与体渲染：把场景装进一枚 MLP](./90-nerf-volume-rendering.md)
