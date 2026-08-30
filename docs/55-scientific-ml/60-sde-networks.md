---
title: 随机微分方程与 SDE 网络
lesson_id: scientific-ml/sde-networks
prereqs:
  - scientific-ml/neural-ode-intro
  - stochastic-processes/brownian-motion
volume: 5
layer: L11
track:
  - scientific-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - stochastic-differential-equation
  - euler-maruyama-scheme
applications:
  - noisy-sensor-modeling
  - sde-data-augmentation
exits:
  - research
---

# 随机微分方程与 SDE 网络

## 1. 从一个场景开始

决定性模型说话总是斩钉截铁：仓库温度今天一定回到 20 度。可传感器画出来的曲线毛毛糙糙——趋势确实在回家，路上却一直在被看不见的手推搡。那双手叫分子碰撞、气动抖振、市场情绪，名字各异，数学长相相同。

上一课的神经 ODE 走的是一条确定的轨迹；这一课允许每一步都掷一次硬币。往演化方程里加一个噪声项，世界立刻活过来——这是**随机微分方程**的全部开场白。

## 2. 直觉解释

第 37 章布朗运动的最后一课说：它是随机游走缩到极限的产物 $B_t$。把它接进动力系统：

> 决定性的 $dx = \mu\, dt$ 说"按计划走"；再加一项 $\sigma\, dB_t$ 说"顺便接受命运的推搡"。

两个参数分工明确：**μ 定趋势，σ 定抖动**。工程直觉里还有一个反常识的关键尺度：微步 $\Delta t$ 内的推搡不是 $\sigma\,\Delta t$，而是 $\sigma\sqrt{\Delta t}$——系数从平方变开方。粗想是"每个微噪声很小，加起来应该按比例累加"，细算却发现随机游走的位移天生带着 $\sqrt{\Delta t}$ 的尺子（第 37 章 scaling 的结论在这里兑付）。

于是确定轨道不再是线而成了"走廊的中轴线"：不确定性像烟一样围绕它散开。顺带一句呼应：扩散模型的生成过程本质上是把这条故事倒着讲——逆时 SDE 从纯噪声一路走回有意义的样本（详见第 49 章）。

## 3. 正式定义

**随机微分方程**写作：

$$dx = \mu(x,t)\, dt \;+\; \sigma(x,t)\, dB_t$$

其数值主粮是**欧拉–丸山方法**（Euler–Maruyama），一句话改写普通欧拉法：

$$x_{n+1} = x_n + \mu(x_n)\,\Delta t + \sigma\,\sqrt{\Delta t}\; z_n, \qquad z_n \sim \text{标准正态或 }\pm 1\text{ 硬币}$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\mu(x)$ | 漂移率 | 计划内的速度场（上节课的 $f_\theta$ 换了姓氏）|
| $\sigma$ | 扩散强度 | 推搡的音量旋钮 |
| $B_t$ | 布朗运动 | 极限里的随机游走，处处连续处处不光滑 |
| $z_n$ | 标准化冲击 | 每步新掷的一枚"骰子"，均值为零 |

严格理论（伊藤积分为什么不能当普通黎曼和算、随机泰勒展开多出半阶项）属于第 66 章——本课保持会读会跑即可。

## 4. 分步例题

恒温走廊模型：$dx = -(x - m)\,dt + \sigma\,dB_t$，取 $m=20,\ \sigma=2,\ \Delta t = 0.25$（故 $\sqrt{\Delta t}=0.5$，$\sigma\sqrt{\Delta t}=1$），初值 $x_0=16$：

1. 漂移份额：$(20-16)\times 1\times 0.25 = 1.0$——先朝目标迈一格；
2. 世界 A 掷出 $z=+0.8$：噪声份额 $1\times 0.8 = 0.8$，落点 $16+1.0+0.8 = 17.8$；
3. 世界 B 同一起点掷出 $z=-0.9$：落点 $16+1.0-0.9 = 16.1$；
4. 两份剧本同样的计划、不同的骰运——单条路径没有预言价值，正是它逼我们学会看总体；
5. 多走几步会发现：路径迟早挤回 20 度附近晃悠，晃动的口径由 $\sigma^2/2\theta$ 支配（下一节实测）。

## 5. 动手实验

### 实验 1：走廊的中轴线

蓝线是均值回复的中心线 $(20+(x_0-20)e^{-k t})$；真实样本只是围着它冒烟：

```viz
{
  "type": "plot",
  "title": "SDE 走廊中心线：趋势终将回归，抖动终将环绕",
  "expr": "x0 + (m - x0)*exp(-k*x)",
  "label": "中心线",
  "xmin": 0,
  "xmax": 5,
  "sliders": [
    { "name": "k", "min": 0.2, "max": 2, "step": 0.05, "value": 1 },
    { "name": "x0", "min": 12, "max": 26, "step": 0.5, "value": 16 },
    { "name": "m", "min": 14, "max": 26, "step": 0.5, "value": 20 }
  ]
}
```

### 实验 2：欧拉–丸山，手搓一锅小仿真

```python title="固定种子的 EM 仿真：三条样本路径 + 一场终点体检"
import random                    # 老朋友：固定种子保证谁运行都同一剧本
import math                      # 用 sqrt 取噪声的 √Δt 尺度
import matplotlib.pyplot as plt

random.seed(2026)
theta = 1.0                      # 回归速度
m = 20.0                         # 目标温度
sigma = 2.0                      # 抖动强度
dt = 0.01                        # 微步长
n_steps = 500                    # 总时长 5 秒

def em_path():                   # 一条完整剧本：从 16 度出发
    x = 16.0
    traj = [x]
    for step in range(n_steps):
        z = random.choice([-1, 1])                  # 掷硬币：本步 ±1 冲击
        x = x + theta * (m - x) * dt + sigma * math.sqrt(dt) * z
        traj.append(x)
    return traj

paths = []                       # 收集三条留作画图
for p in range(3):
    paths.append(em_path())

finals = []                      # 批量体检：另跑 200 条只记终点
for p in range(200):
    finals.append(em_path()[-1]) # [-1]：取列表最后一个元素

mean_end = sum(finals) / len(finals)
std_end = math.sqrt(sum((v - mean_end) ** 2 for v in finals) / len(finals))

print("噪声两把尺子: σ·Δt =", round(sigma*dt, 4), " σ·√Δt =", round(sigma*math.sqrt(dt), 4))
print("200 条终点均值:", round(mean_end, 3), "（理论上该冲着", m, "去）")
print("200 条终点标准差:", round(std_end, 3), "（连续极限约", round(sigma/math.sqrt(2*theta), 3), "）")

for tr in paths:
    plt.plot([i * dt for i in range(len(tr))], tr)
plt.xlabel("time")
plt.ylabel("temperature")
```

跑出来的账目（Python 3.14 实测）：两把尺子 $0.02$ 对 $0.2$——差一个 $\sqrt{\Delta t}$；终点均值 $20.106$，围着目标 20 打转；终点标准差 $1.58$，与连续极限 $1.414$ 同量级（±1 剧本和有限步长的偏差如何消失，是第 66 章强收敛的话题）。三条路径终点分别落在 $21.72$、$19.91$、$18.0$——同一套参数，三种命运。

### 实验 3：判题小练兵

```exercise
# @title: 练习：平行世界的第一步
# @check: 17.8
# @check: 16.1
# @hint: 每步两件套：漂移 theta*(m-x)*h 加噪声 sigma*sq_h*z。漂移别忘了。
theta = 1.0      # 回归速度
m = 20.0         # 目标温度
sigma = 2.0      # 抖动强度
h = 0.25         # 步长
sq_h = 0.5       # √h 已经替你算好：就是 0.5

z_a = 0.8        # 平行世界 A 掷出的冲击
z_b = -0.9       # 平行世界 B 掷出的冲击

x = 16.0
x = x + sigma * sq_h * z_a            # ← 问题在这：只顾骰运，忘了漂移份额
print(x)

x = 16.0                              # 重置回同一初值，进入世界 B
x = x + sigma * sq_h * z_b
print(x)
```

修好后的两行输出是两条平行世界各自的第一步落点。注意它们的差别只在最后一项的符号与大小——EM 方法的骨架"漂移 + 抖动"从此可以闭着眼默写了。

## 常见误区

:::warning[常见误区]

**误区一**："噪声尺度用 σ·Δt 就够了。"错配会发生得很安静：噪声音量被悄悄调小成 0.02 而非 0.2，仿真看着也"差不多在抖"，但整体统计口径全偏——请养成核对 $\sqrt{\Delta t}$ 的肌肉记忆。

**误区二**："单条路径对得上就是好仿真。"随机世界的验收单位是总体（均值、方差、分布），单条路径的吻合只证明这一次骰运不错。判别指标还分强弱两档，第 66 章再分家产。

**误区三**："SDE 只属于金融。"分子布朗运动、量子测量噪声、社会传播、 diffusion 生成模型的采样器全是它的客户——尤其在数据增强里，给确定性轨迹撒噪声造伪样本已是科学机器学习的家常菜。

:::

```quiz
把欧拉法的更新式改成欧拉–丸山版本，核心变化是什么？
- 把时间步长换成更大的值，让噪声彼此抵消
- 每步额外加上一项噪声尺度乘以 sqrt(Δt) 再乘一枚新的随机数 [*]
- 删除漂移项，因为随机因素会自动覆盖计划内的运动
? 噪声天然携带 sqrt(Δt) 的尺度；漂移负责回归目标，噪声负责制造走廊，二者缺一不可。
```

## 6. 练习

**练习 1**：手算：同样 $\Delta t=0.25$、$\sigma=2$，若 $\Delta t$ 缩小为 $0.01$，噪声份额变成多少？两档步长的比值是多少？

<details>
<summary>点开查看逐步解答</summary>

$2\times\sqrt{0.01}=0.2$。相比大步长的 $1.0$ 缩小 5 倍——不是 25 倍。这就是平方根的脾气：**网格加密时噪声远比想象中顽强**，也是随机世界里精度换算永远带根号的原因。
</details>

**练习 2**：把实验 2 的 `random.choice([-1, 1])` 换成取值恒为 `1` 的"哑骰子"，终点均值大概落在哪？

<details>
<summary>点开查看逐步解答</summary>

每步恒定获得 $+\sigma\sqrt{\Delta t}=0.2$ 的同向推动，等效于给漂移增加了常数速度——稳态将从 20 上移约 $\sigma/\sqrt{2\theta}\cdot(\text{正号偏向})$，实际上均值会稳定在更高处。这个假实验提醒你：**检验随机代码的第一刀，是把骰子钝化后看系统是否退化回一个歪掉的决定性问题。**
</details>

**练习 3**：概念辨析：布朗运动"处处连续、处处不光滑"会让欧拉–丸山的截断误差分析失效吗？

<details>
<summary>点开查看逐步解答</summary>

经典确定性误差阶数确实失灵——路径导数不存在，泰勒展开只剩残缺的半阶。补救办法是对**期望意义下**的误差重新定阶：均方意义仍能拿到与网格相关的收敛速率，只是比光滑情形慢半阶。数值分析的账本没作废，只是换了一本记账汇率（详见第 66 章强弱收敛的分账）。
</details>

## 7. 选读：逆时 SDE 与生成模型

<details>
<summary>选读 · 把命运倒放</summary>

给一堆干净数据逐渐加噪的过程，本身就是一条 SDE——扩散模型训练时学的正是这条“加噪河”的流速场。生成时反过来：从纯噪声出发沿**逆时 SDE** 积分，把河流倒着走一遍就得到全新样本，导航图上标的方向正是分数函数——第 49 章的得分匹配与去噪路线在这条河边汇合。另一侧，科学计算里的 SDE 网络把这套采样器当作数据工厂：对稀缺的真实轨迹做逆时重采样增强，喂给下游代理模型更宽的训练分布。正向物理、逆向生成，同一个方程的正反面。

</details>

## 8. 下一站

有了带噪声的世界观，下一课换一副眼镜看反问题：不再纠结"怎么正则化"，而是问最精打细算的问题——下一个观测放哪里，才最值钱？

→ [参数辨识与观测设计](./70-parameter-identification-design.md)
