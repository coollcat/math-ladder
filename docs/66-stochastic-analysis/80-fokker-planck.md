---
title: Fokker-Planck 方程：样本路径到密度演化
lesson_id: stochastic-analysis/fokker-planck
prereqs:
  - stochastic-analysis/sde-euler-maruyama
  - pde/heat-equation-1d
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - fokker-planck-equation
  - density-evolution
  - stationary-density
applications:
  - population-density-forecast
  - neuron-spiking-hazard-models
exits:
  - stochastic-analysis
---

# Fokker-Planck 方程：样本路径到密度演化

## 1. 从一个场景开始

追踪一只蜜蜂，你得到的是一条永不安分的布朗式轨迹；可要是问养蜂人"蜂群会聚在哪儿"，他会带你看一朵缓缓流动、边界扩散的**云**。个体与群体之间隔着一层统计镜头：把 SDE 的无数条样本路径竖起来看截面，截面形状随时间如何变化？答案是一道偏微分方程——Fokker-Planck（又称 Kolmogorov 前向方程）。它是第 23 章热方程的随机升级版：热方程只有漫灌，这里还多了一股可以定向搬运的"风"。本课从单粒子方程一步跨到密度方程，并把"云最终停在哪"一锤定音。

## 2. 直觉解释

**核心直觉：密度云的命运 = 漂移的风 + 扩散的散。**

盯住一个小区间 $[x, x+dx]$ 里的粒子存量 $p(t,x)\,dx$，它只可能因两种原因被改变：

| 进出通道 | 搬运机制 | 类比 |
| --- | --- | --- |
| 对流 | 各处粒子按漂移速度整体移动 | 风推着蒲公英 |
| 扩散 | 左右邻居噪声不对称地互相渗透 | 热量从高温处渗向低温处 |

SDE 已经替我们预演过这两种力：$b$ 就是风的方向和风速，$\sigma$ 决定渗透强度。把它们翻译成密度语言后：风搬走的是**概率质量**本身；扩散项(二阶导)则负责把任何尖锐的初始分布熨平——第 23 章那口锅还是同一口锅，只是灶上多了一股定向气流。

## 3. 正式定义

设粒子满足 $dX_t=b(X_t)\,dt+\sigma(X_t)\,dB_t$ 且互不相撞（全同粒子），其密度 $p(t,x)$ 遵守 **Fokker–Planck 方程**：

$$\frac{\partial p}{\partial t}=-\frac{\partial}{\partial x}\bigl[b(x)\,p\bigr]+\frac{1}{2}\,\frac{\partial^{2}}{\partial x^{2}}\bigl[\sigma^{2}(x)\,p\bigr].$$

| 符号 | 含义 |
| --- | --- |
| $p(t,x)\,dx$ | 时刻 $t$ 在 $x$ 附近一小格里找到粒子的概率 |
| $-\partial_x(b\,p)$ | 对流项：风向搬运概率质量的净流出 |
| $\frac12\partial_x^2(\sigma^2 p)$ | 扩散项：噪声导致的浓度抹平 |
| 质量守恒 | 全直线积分恒为 $1$——云可以变形，粒子不会凭空消失 |

两个立刻能做的检验：让 $b=0$、$\sigma$ 为常数，方程塌缩成标准热方程，解正是第 36 章那族正态密度—— diffusion-only 时高斯核当仁不让；再让方程左端置零，就得到下节例题的定音锤：平稳分布。

## 4. 分步例题

**问**：OU 型方程 $dX=-\theta(X-\mu)dt+\sigma\,dB$（$\theta,\sigma>0$ 为常数）的蜂群最终停在哪朵形状里？

1. 写平稳条件 $\dfrac{\partial p}{\partial t}=0$，代入方程得流量平衡：

$$0=-\bigl[b\,p\bigr]'+\frac12\bigl[\sigma^{2}p\bigr]'' ;$$

2. 取最简情形——零通量解（$bp=\tfrac12(\sigma^2p)'$），整理成 $p'/p=2b/\sigma^{2}=2[-\theta(x-\mu)]/\sigma^{2}$；
3. 逐项积分：$\ln p=-\theta(x-\mu)^2/\sigma^{2}+\text{const}$，即 $p(x)\propto e^{-\theta (x-\mu)^2/\sigma^2}$——正比于均值为 $\mu$、方差为 $\sigma^{2}/(2\theta)$ 的正态密度；
4. 记住因子 **2**：方差分母里的它来自 FP 系数 $\tfrac12$ 与回归拉力的联手折扣——回归越快（$\theta$ 大）或噪声越小（$\sigma$ 小），云收得越紧。

一句话总结该课脉络：单个粒子的永恒流浪（$\theta$ 在远处拽着不放），落到群体层面却是一朵安定的钟形云。

## 5. 动手实验

让整群粒子亲自投票：放出一大群 EM 粒子跑 OU 方程，抽三帧快照画直方图叠上理论钟形线，看看实测的频率柱是不是乖乖爬向解析平稳云。

```python title="千蜂群的三帧直方图 vs 理论钟形"
import random                     # 标准库随机模块；seed 固定保证可复现
import numpy as np                # 数值库：exp、sqrt 与圆周率 np.pi 都在这里
import matplotlib.pyplot as plt   # 绘图模块

random.seed(5150)
m = 1500                          # 粒子数：蜂群规模
T, dt = 1.6, 0.04                 # 总时长与 EM 步长
frames = [10, 25, 40]             # 抽查的三个步号：早期 / 中期 / 接近平稳
theta, mu, sig = 2.0, 3.0, 1.0    # 回归速率 / 云心 / 噪声强度
X = [-2.0] * m                    # 全体粒子出发点同在左侧远处

for k in range(frames[-1] + 1):
    if k in frames:
        fig, ax = plt.subplots(figsize=(7, 2.6))          # subplots 返回画布与坐标轴对象
        ax.hist(X, bins=40, density=True, alpha=0.55, range=(-2, 8))   # hist：直方图；density 归一化面积
        v = sig * sig / (2 * theta)                       # 平稳方差 σ²/(2θ)
        grid = np.linspace(-2.0, 8.0, 200)
        pdf = np.exp(-((grid - mu) ** 2) / (2 * v)) / np.sqrt(2 * np.pi * v)   # 理论钟形线
        ax.plot(grid, pdf, color="red", linewidth=1.4, label="stationary N(mu, s²/2θ)")
        ax.set_title("step " + str(k))
        ax.legend()
        plt.show()
    for i in range(m):            # 一轮 EM 步进：全体粒子同步落子
        X[i] += theta * (mu - X[i]) * dt + sig * random.gauss(0.0, 1.0) * (dt ** 0.5)

print("理论平稳标准差 =", round(np.sqrt(sig * sig / (2 * theta)), 3))    # 应为 0.5
```

读图要点：第一帧粒子还挤在出发点附近的一根尖柱上；中间帧开始被 $\mu$ 右侧的风一路押送并摊薄；末帧直方图的外轮廓已经紧贴红色钟形——群体平均的命运曲线，就这样从个体混沌里浮出来。最后打印行给出平稳标准差的理论值 $0.5$，供你目测三帧直方图的宽度逼近谁。

## 6. 常见误区

:::warning[常见误区]

- **"FP 描述的是某个粒子的确定性行为"** —— 它掌管的从来是全体路径的系综统计。单粒子依旧我行我素地乱撞，安宁只属于密度这张集体照。
- **"对流项就是把密度平移过去那么简单"** —— 平移只对常速度成立。$b$ 随位置变化时，风会把云撕扯变形（粒子在风速梯度两侧聚集或拉开），所以写成了散度形式。
- **"扩散系数凭直觉抄成 $\sigma$"** —— 方程里端坐的是 $\sigma^{2}$：第一课的方差语言在这里再次接管话语权。漏平方的话，你的平稳宽度会错成一整个 $\sqrt{2}$ 因子。

:::

## 7. 练习

实现平稳云宽计算器。初始代码丢了那个决定性的因子 2（也忘了先平方再除）——修好全部检查：

```exercise
# @title: 平稳云宽修正案
# @check: 0.5
# @check: 1.0
# @check: 0.5
# @hint: 平稳方差 = sigma² / (2·θ)：噪声先进平方，θ 手里只握着分母上的那半张票。
import numpy as np    # sqrt 开平方

def stationary_sd(theta, sigma):
    return np.sqrt(sigma / theta)      # ← 两处账都记错了

print(round(stationary_sd(2.0, 1.0), 2))
print(round(stationary_sd(8.0, 4.0), 2))
print(round(stationary_sd(0.5, 1.0), 2))
```

<details>
<summary>点开查看逐步解答</summary>

```python
def stationary_sd(theta, sigma):
    return np.sqrt(sigma * sigma / (2 * theta))     # 先平方，再除以 2θ

print(round(stationary_sd(2.0, 1.0), 2))    # √(1/4)   = 0.5
print(round(stationary_sd(8.0, 4.0), 2))    # √(16/16) = 1.0
print(round(stationary_sd(0.5, 1.0), 2))    # √(1/1)   = 1.0
```

第三条检查最有戏：$\theta=0.5$ 是个慢悠悠的弱弹簧，公式里 $2\theta=1$ 恰好被 $\sigma^2=1$ 抵平——宽度反而正好 $1$。错版在这里给出 $1.41$，连量级都站不住。顺带走一遍数量级直觉：**回归速率翻两番（×4），平稳带宽减半（÷2）**，因为方差对 θ 是反比、对开方再取半格。错版输出的 $0.707$ 恰是金融利率模型与传感器去噪方案里最常见的标定事故来源：漏掉的正是那个专属因子 2。

</details>

```quiz
Fokker-Planck 方程右边的两项分别掌管什么？
- 都是扩散，只是写法不同
- 第一项管风的定向搬运（对流），第二项管噪声的浓度抹平（扩散） [*]
- 第一项管噪声、第二项管漂移
? −∂x(bp) 是概率质量的定向流出率；½∂x²(σ²p) 让尖峰变胖变缓。前者改云的位置轮廓，后者改云的胖瘦纹理。
```

```quiz
其他参数不动，仅把噪声 σ 从 1 加倍到 2，OU 的平稳云会发生什么？
- 宽度不变，只是中心移动
- 宽度变为原来的 2 倍 [*]
- 宽度变为原来的 4 倍
? 平稳宽度 = σ/√(2θ)，与 σ 成正比。σ 翻倍 → 宽度翻倍。（对照：若问的是方差，则因 σ² 直接翻四倍——问"宽度"还是"方差"，答案差一个平方，务必看清。）
```

## 8. 选读证明：从无穷小账本挤出那条方程

<details>
<summary>选读：守恒律 + 两条增量的单价</summary>

第 23 章的热方程来自一个朴素守恒律「区间存量的变化 = 净流入」。这里沿用同一框架，只是单价表换了：

1. **对流的价格**：区间 $[x,x+dx]$ 内粒子以速度 $b(x)$ 整体迁徙，左端流进率 $b(x)p(t,x)$、右端流出率 $b(x+dx)p(t,x+dx)$，净流出为 $\partial_x(b\,p)\,dx$；
2. **扩散的价格**：单步 $dt$ 里每个粒子位移的方差是 $\sigma^2dt$。细看边界交换，随机游走的反证排法给单位时间净通量为 $-\tfrac12\partial_x(\sigma^2p)\,dx$——那个 $\tfrac12$ 来自二阶矩恰好等于时间微元（二次变差的又一次点名）；

将两类通量代回「$\partial_t(p\,dx)=$ −总净流出」并用一次[分部积分](../14-integrals/32-partial-integration.md)把导数搬到 $p$ 头上，即得：

$$\partial_t p=-\partial_x(b\,p)+\tfrac12\partial_x^2(\sigma^2\,p).$$

回头看这是何等划算的交易：一条逐点无规的更新规则，竟在系综层积攒出一条光滑可解的 PDE。第 37 章马尔可夫链的平稳分布在连续极限下的对应物，正是本课那朵钟形云——离散见首、连续见尾。

</details>

## 9. 下一站

既然平稳云的公式已经到手，不如选一朵最有名气的云深交——[Ornstein-Uhlenbeck 过程](./90-ornstein-uhlenbeck.md)：均值回归的全套家谱，从半衰期说到自相关。
