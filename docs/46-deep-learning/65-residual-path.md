---
title: 残差连接与深路梯度流
lesson_id: deep-learning/residual-path
prereqs:
  - deep-learning/normalization-layers
volume: 5
layer: L7
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - residual-connection
applications:
  - resnet-vision
exits:
  - data-ai
---

# 残差连接与深路梯度流

## 1. 从一个场景开始

午休时玩传话游戏：一句话从第一个人耳语出发，经十个人接力，到队尾往往面目全非——每一站都损耗一点忠实度，十站下来荡然无存。聪明的改法是给每人一张**原话复印件**：你既可以复述自己听到的加工版本，也可以直接掏出复印件对照。有复印件兜底，传三十站也不至于走样。

深层网络的梯度回传正是这个游戏的数学版。没有复印件时，梯度每过一层都要乘一个小于 1 的局部系数，几十层乘下来几乎归零（第 55 课铺垫过的消失问题，归一化救了一半但救不到底；上一课的 LSTM 则在时间轴上用门控救了另一半）。2015 年何恺明等人在 ResNet 里给出的改法优雅至极——**加一条直通线**：

$$y = F(x) + x .$$

## 2. 直觉解释

**核心直觉：把"乘性通道"升级成"加性通道"，梯度从此有了保底限速。**

对一个普通块 $y=F(x)$ 求导，层与层之间的梯度是**相乘**的：

$$\frac{\partial L}{\partial x}=\frac{\partial L}{\partial y}\cdot \frac{\partial F}{\partial x} .$$

只要 $|\partial F/\partial x|$ 小于 1（sigmoid/tanh 饱和区趋近于零，ReLU 死区干脆为零），几十层连乘之后梯度按指数湮灭。这就是深网络"加层反而更差"的老病根——不是学不会，是**指令传不到后排**。

换成残差块 $y=F(x)+x$ 后，同一枚导数变成

$$\frac{\partial L}{\partial x}=\frac{\partial L}{\partial y}\cdot\underbrace{\Bigl(\frac{\partial F}{\partial x}+\underbrace{1}_{\text{恒等线}}\Bigr)}_{\text{加法！}} .$$

原来的乘性小数多了一个 **+1**：哪怕学习分支的梯度彻底饱和为零，恒等线仍保证信号原封不动地通过。大量 layers 连乘时，$0.01^{50}$ 与 $(1+0.01)^{50}\approx1.64$ 的差距就是绝望与健康的距离。

换个角度看"学习负担"的变化也顺理成章：网络不再被迫在整条映射里硬背 $H(x)$，只需学**相对当前输入的修正量** $F(x)=H(x)-x$；理想情况下它甚至可以学到全零——什么也不做永远合法。深层的堆叠因此变成对"增量"的精修，而不是对全景的重描。

## 3. 正式定义

**残差块（residual block）**：

$$y=F(x,\,\lbrace W_i \rbrace)+x,$$

其中 $F$ 是两三层带非线性激活的小变换（学习分支），$x$ 经恒等映射直接旁路求和。整段复合后：

- 前向：任何一块都默认输出"输入本身 + 修正量"；
- 反向：块的雅可比矩阵为 $\nabla F+\mathbf{I}$——单位阵 $\mathbf{I}$ 是永不断流的高速路；
- 维数不匹配时（比如通道翻倍），恒等线换成一个 $1\times1$ 卷积做投影即可。

与初始化/归一化的分工（本课结语口径）：He 配方保证**起跑**不爆炸不消亡，LayerNorm 保证**途中**分布不漂移，残差连接保证**纵深**方向梯度有一条永不塌方的主干道——训练稳定三件套至此集齐。

## 4. 分步例题

**问**：比较"40 层普通 tanh 网"与"40 个残差块"在均处饱和区的总梯度增益（设每个普通层系数 $0.005$、每个残差块的有效因子 $1.005$）。

1. 普通网：$0.005^{40}=10^{40\times\log_{10}0.005}=10^{-93.98}$ —— 任何 float32 都存不下，梯度等于蒸发；
2. 残差网：$(1.005)^{40}=e^{40\ln1.005}\approx e^{0.1998}\approx1.22$ —— 稳稳活着；
3. 结论：差距不是"几十倍"，而是**坍塌与否**的天堑。这也正是 152 层的 ResNet 当年能直接训起来的原因——每一层的 +1 都是给后排的一张通行证。

## 5. 动手实验

拖动底数滑块，感受"每层保留率"如何决定 30 层后的幸存者——指数作弊器一览无余：

```viz
{
  "type": "plot",
  "title": "层级存活曲线 keep^depth",
  "expr": "keep^x",
  "xmin": 0,
  "xmax": 30,
  "sliders": [
    { "name": "keep", "min": 0.6, "max": 1.05, "step": 0.01, "value": 0.9 }
  ]
}
```

再用纯解析量把两种结构的对比印出来（全部确定性计算，无需种子）：

```python title="无跳线 vs 有跳线的层级增益"
def plain_net_gain(per_layer, depth):
    out = per_layer
    for _ in range(depth - 1):
        out = out * per_layer        # 乘性地一路变小
    return out

def residual_net_gain(per_layer, depth):
    factor = 1 + per_layer           # 雅可比 = ∇F + I
    out = factor
    for _ in range(depth - 1):
        out = out * factor           # 底数 > 1：健康缓增
    return out

for d in [5, 10, 20]:
    p = plain_net_gain(0.005, d)
    r = residual_net_gain(0.005, d)
    if p < 0.0001:
        p_str = str("%.2e" % p) + "  ← 已蒸发"
    else:
        p_str = str(p)
    print("深度", d, "普通:", p_str, "| 残差:", round(r, 3))
```

打印结果一目了然：普通列深度 10 就已经 `1.00e-23 ← 已蒸发`，残差列稳定在 `1.05` 一档缓慢爬坡。

## 6. 常见误区

:::warning[常见误区]

- **"加了跳线就一定更好"** —— 对浅网络收益不大甚至平白增加显存；它的威力要在"足够深 + 存在饱和风险"的场景兑现。
- **"$F$ 分支可以偷懒输出零？那这层没用了"** —— 全零输出恰恰是合法且常被证实的解：该块退化为恒等映射，由后续块决定是否启用，这正是"可学习的深度"思想。
- **"恒等线要配个权重让它更灵活"** —— 直接给跳线挂标量门控会重新引入"又一条会死亡的乘性通道"；ResNet 的关键恰在于这条线**裸奔**。

:::

## 7. 练习

下面的块丢失了直通线，还把梯度判断搞错了正负——修到三条检查通过：

```exercise
# @title: 给块补回高速公路
# @check: 1
# @check: 3
# @check: 3
# @hint: 输出应为 F(x)+x；导数为 F'(x)+1；F(t)=(t−1)² 的导数是 2(t−1)，在 x=2 处等于 2
def block_value(x):
    fx = (x - 1) ** 2          # 学习分支 F(t) = (t−1)²
    return fx                  # ← 恒等线没接！应加上 x 本身

def grad_of_block(x):
    # F 的导数是 2(x−1)；合成的梯度应是 F'(x) + 1
    return 2 * (x - 1)         # ← 只算了分支的导数，+1 的恒等贡献丢了

x = 2.0
print(block_value(x))                       # F+x 应为 1+2 = 3
print(grad_of_block(x))                     # 合成导数 = 2+1 = 3
eps = 0.001                                 # 数值微分交叉验证
slope = (block_value(x + eps) - block_value(x)) / eps
print(int(slope + 0.5))                     # 取整梯度 ≈ 3
```

<details>
<summary>点开查看逐步解答</summary>

补线之后一切通顺：

```python
def block_value(x):
    fx = (x - 1) ** 2
    return fx + x                # 残差合成

def grad_of_block(x):
    return 2 * (x - 1) + 1       # 分支导数 + 恒等的 +1
```

- 第一行：$F(2)=1$、$x=2$，合成输出 $3$；
- 第二行：$F'(2)=2$，加恒等贡献得 $3$；
- 第三行是数值微分复核：修正后 $(g(2.001)-g(2))/0.001\approx3.001$，取整打印 `3`——解析导数与有限差分手拉手验证同一事实。

初始版本漏掉的正是"复制复印件"那一步：前向少送一份 $x$、反向少送一份 $+1$。
</details>

## 8. 选读证明： Ensemble 视角与 Highway 对比

<details>
<summary>选读：ResNet 为什么像隐式集成</summary>

Veit 等（NeurIPS 2016）展开递归：$y_3 = F_3(F_2(F_1(x)+x)+F_2(F_1(x)+x)+F_1(x)+x)$——每展开一层，路径数翻倍，$N$ 层共有 $2^{N}$ 条"可选通路"。真正有大梯度贡献的多是短路径（删掉任意一两层，性能只轻微抖动而非崩盘），于是 ResNet 行为更像 $2^{N}$ 条浅路线的隐式集成，而非一根独杆深塔。这一视角解释了它与 Highway 网络（带门控的跳线，门控 sigmooid 权重可学习并可能关闭）的关键差异：门的关闭是一条乘性支路，随时可能退回"类普通深塔"的病态；而无条件恒等线没有任何旋钮可供命运拨弄。
</details>

## 9. 下一站

主干道通了、稳压器装了、起跑线画正了——最后一课负责司机的油门习惯：[学习率调度与训练诊断](./75-lr-diagnostics.md)，教你看懂损失曲线，并在正确的时候踩对踏板。
