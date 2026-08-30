---
title: 变分推断、ELBO 与 VAE
lesson_id: generative/elbo-vae
prereqs:
  - generative/maximum-likelihood
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - latent-variable
  - variational-inference
  - elbo
  - reparameterization-trick
applications:
  - image-generation
  - representation-learning
exits:
  - data-ai
---

# 变分推断、ELBO 与 VAE

## 1. 从一个场景开始

请一位漫画家画"一张笑脸"。真正落笔前他脑子里的工作极简：几个旋钮——嘴咧多开、眼挤多弯、头发多密。旋钮位置一拨定，画面就画出来了。

生成模型的潜变量路线正是如此：数据由少数看不见的旋钮产生。训练它需要回答一个反向问题——**看着成品图，反推旋钮大概怎么摆**。这个反推在数学上叫后验，麻烦在于它压根算不出来（原因马上讲）。于是有人提议：既然算不出，就让神经网络学着去**猜**它。整门变分推断与 VAE 的戏，都围着这个"猜"字展开。

## 2. 直觉解释

回顾贝叶斯的账本：$p(z \mid x) = p(x \mid z)\, p(z) \,/\, p(x)$。分子都是我们自己写的、好办；**分母 $p(x)$ 要对所有的旋钮组合积分求和，组合爆炸，算不动**——这就是"后验收不了"的全部原因。

变分推断的招数：找一个看得见数据的网络 $q(z \mid x)$ 当后验的替身演员。但要保证替身演得像，需要一把尺子同时管两头：

- **重构项**（往数据拉）：按替身给的旋钮摆位真的去解码成图，像不像原图？；
- **KL 正则**（往规矩拉）：替身的摆法离"出厂标准设置"（标准正态分布）太远就要罚分——否则整个旋钮盘没有统一坐标系，之后根本无法凭空拧旋钮做生成。

两个方向的力互相拉扯，综合得分就叫 **ELBO**。它的直觉版本：我们真正想要的目标 $\ln p(x)$ 是一间很高很高的天花板，够不着也量不准；ELBO 是天花板下方一盏挂灯的高度——**永远不高于天花板，而且随时能算出具体数值**。能把灯往上顶多高，就把优化器派上去顶多高。

## 3. 正式定义

$$\text{ELBO}(q) = \mathbb{E}_{z \sim q(z \mid x)}\big[\ln p(x \mid z)\big] - \mathrm{KL}\big(q(z \mid x)\,\|\,p(z)\big)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $z$ | 潜变量 | 旋钮读数，通常是低维向量 |
| $p(z)$ | 先验 | 出厂设置：标准正态 $N(0, I)$ |
| $q(z \mid x)$ | 近似后验 | 编码器：看着数据猜旋钮的可学习替身 |
| $p(x \mid z)$ | 解码分布 | 旋钮摆位落地成数据的条件分布 |
| $\mathrm{KL}(q \| p)$ | 散度 | 替身与出厂设置的偏差税，非负 |

性质两条：

1. **下界身份**：$\text{ELBO} \le \ln p(x)$ 恒成立，差距正好是替身与真后验之间的散度——替身演得越像，灯越贴近天花板；
2. **最大化 ELBO 一石二鸟**：重构项推着解码器拟合数据（这正是极大似然那套灵魂），KL 项拉着编码器规训自己，两股力的合力决定了模型最终的画风。

## 4. 分步例题

最裸的玩具：旋钮只有一个实数 $z$，解码器是恒等映射，数据点 $x = 2$。取重构惩罚 $(z-2)^2$、KL 为 $z^2$（即 $N(z,1)$ 对 $N(0,1)$ 的散度），总分 $S(z) = -(z-2)^2 - \lambda z^2$，$\lambda$ 是 KL 的砝码重量。

1. $\lambda = 0$：KL 不罚分，最优 $z^* = 2$ 贴住数据——可惜旋钮盘被各人带跑，一盘散沙；
2. $\lambda = 1$：令导数为零 $-2(z-2) - 2z = 0$，解得 $z^* = 1$：一半贴数据、一半归队，总分恰为 $-1 - 1 = -2$；
3. $\lambda = 5$：罚分重了，最优挪向 $z^* = 1/3$，几乎躺平在原点，代价是重构平平；
4. 结论一览：砝码越重潜在点越靠向标准正态、画像越平庸；砝码越轻画像越锐利、旋钮盘越失序。VAE 的全部调参艺术都在这根滑杆上。

## 5. 动手实验

### 实验 1（viz）：偏离开厂设置，要交多少散度税

横轴是替身均值 $m$，纵轴是 $\mathrm{KL}\big(N(m, v)\,\|\,N(0,1)\big)$。拖动方差滑块 $v$ 和均值滑块 $m$：曲线谷底始终悬在 $x = m$ 处；把 $v$ 拧到 1，免税；无论怎么调，谷底高度 $(v - 1 - \ln v)/2$ 从不为负——这就是"歪了自己身上要长税"。

```viz
{
  "type": "plot",
  "title": "KL 散度税单：N(m, v) 偏离 N(0, 1)",
  "expr": "((x-m)*(x-m)+v-1-log(v))/2",
  "xmin": -4,
  "xmax": 4,
  "sliders": [
    { "name": "m", "min": -3, "max": 3, "step": 0.1, "value": 2 },
    { "name": "v", "min": 0.2, "max": 4, "step": 0.1, "value": 1 }
  ]
}
```

### 实验 2（python）：天平两端实测——最优旋钮随砝码移动

把例题那只单旋钮玩具数值化，扫描三个砝码档位找峰值：

```python title="不同 KL 砝码下的最优旋钮读数"
import math

def score(z, weight):
    # 总分 = 重构的好感减去 KL 罚金（都是负号下的平方）
    return -((z - 2) ** 2) - weight * z * z

for weight in [0.2, 1.0, 5.0]:
    best_z, best_s = 0.0, -1e9
    k = -400
    while k <= 400:
        z = k / 100                  # 候选旋钮从 -4 扫到 4
        s = score(z, weight)
        if s > best_s:
            best_s, best_z = s, z
        k += 1
    rec = -((best_z - 2) ** 2)       # 该读数下的重构分
    reg = weight * best_z * best_z   # 该读数下的 KL 税
    print(f"砝码 {weight}: 最优 z={round(best_z, 2)}, "
          f"重构分 {round(rec, 2)}, 罚金 {round(reg, 2)}")
```

输出与例题求导结果完全一致（$1.67 / 1.0 / 0.33$）。重货压舱时罚金近乎清零，轻货放行时数据才敢站出来说话——两边谁也不肯让谁。

### 实验 3（python）：重参数化——把骰子从梯度路上挪开

估计 $\mathbb{E}_{z \sim N(m,1)}[z^2]$ 随 $m$ 的变化时，朴素做法每个 $m$ 都重新掷一次骰子，估计线抖得厉害；重参数化写 $z = m + \varepsilon$、固定一整套 $\varepsilon$，扰动只从旁边输入，曲线立刻平滑——这正是"梯度能顺着 m 流回去"的手写版证明。

```python title="同一批 ε：重参数化前的抖动对比"
import random
import matplotlib.pyplot as plt

random.seed(5)
eps_pool = []                    # 固定的整组标准正态噪声
for i in range(60):
    eps_pool.append(random.gauss(0, 1))

def estimate(m, reuse):
    acc = 0.0
    for e in eps_pool:
        if reuse:
            eps = e                          # 同一枚骰子复读：z = m + eps
        else:
            eps = random.gauss(0, 1)         # 每次 with 新骰子：路径断了
        acc += (m + eps) ** 2
    return acc / len(eps_pool)

xs, smooth, jumpy = [], [], []
k = 0
while k < 24:
    m = -2 + k * 0.2
    xs.append(m)
    smooth.append(estimate(m, True))
    jumpy.append(estimate(m, False))
    k += 1

plt.plot(xs, smooth, linewidth=3, label="fixed eps")
plt.plot(xs, jumpy, label="fresh dice every step")
plt.legend()
```

橙线毛刺丛生（不同步的抽样噪声），蓝线安顺流畅。真实 VAE 里这条蓝线的斜率就是流向编码器的梯度，抖动的估计等于让训练对着雪花屏调旋钮。

### 快问快答

```quiz
为什么说 ELBO 是“够得着的天花板下沿”？
- 它总是恰好等于 ln p(x)，只是写法不同
- 它永远不超过 ln p(x)，且不用算出难以求解的分母就能求值 [*]
- 它是一个可以人工随意设定的超参数
? 差距恰是替身与真后验的距离，代入任何 q 都能当场算出一个具体数值；不断把 q 调像，灯就被顶得越接近天花板。
```

:::warning[常见误区]

**误区一**："你以为编码器输出的是一个数。" 输出的是一个分布（通常 $N(\mu, \sigma^2)$）；采样发生在 $z = \mu + \sigma\varepsilon$ 这一步。确定性编码器会切断后续采样链路。

**误区二**："你以为 KL 项越小越好。" 它是拉锯的一方而非反派：零税意味着替身彻底无视数据，画出来全是千篇一律的平均脸。权衡才是设计本意。

**误区三**："你以为 VAE 生成必糊是个谜。" 模糊有明确成因——解码分布在像素上取平均，加上 KL 把潜分布压成光滑的一团，锐利度与覆盖广度天然互斥。这不是 bug，是天平的形状。

:::

## 6. 练习

**练习**：补全 KL 闭式公式 $\big(\mu^2 + \sigma^2 - 1 - \ln \sigma^2\big)/2$。下面的代码能跑，但对公式的抄写出了岔子：

```exercise
# @title: 练习：抄对 KL 散度的闭式账
# @check: 0.0
# @check: 2.0
# @check: 1.31
# @hint: 公式里出现两次 σ²，还有一项要减 ln σ²。现在的代码既丢了尾巴又没除以 2。
import math

def kl_to_standard(mu, sigma):
    s2 = sigma * sigma               # 先把方差备好，免得抄错次数
    return mu ** 2 + s2              # ← 问题在这：尾巴两项和除法都不见了

print(round(kl_to_standard(0, 1), 2))
print(round(kl_to_standard(2, 1), 2))
print(round(kl_to_standard(1, 2), 2))
```

<details>
<summary>点开查看逐步解答</summary>

修好的函数体应为 `return (mu ** 2 + s2 - 1 - math.log(s2)) / 2`。三行输出依次是：$(0+1-1-\ln 1)/2 = 0.0$；$(4+1-1-\ln 1)/2 = 2.0$；$(1+4-1-\ln 4)/2 = 2 - \ln 2 \approx 1.31$。自查口诀：均值和方差同时为零、单位方差时必须免税为零。
</details>

## 7. 选读：下界不等式与重参数化的来历

<details>
<summary>选读 · 两句推导碎片，不铺全套分析</summary>

把贝叶斯分母 $p(x)$ 写成对任意 $q$ 的期望 $\mathbb{E}_q[p(x \mid z)p(z)/q(z \mid x)]$，再用 Jensen 不等式（对数的凹性把期望压进去）一步得到 $\ln p(x) \ge \text{ELBO}$。散度视角同样一句话：$\mathrm{KL}(q \| \text{posterior}) = \ln p(x) - \text{ELBO}$，右侧恒非负，等号只在替身完全复刻真后验时成立。

重参数化则是微积分层面的搬家动作：从 $N(\mu, \sigma^2)$ 抽样等同于 $z = \mu + \sigma\varepsilon$，$\varepsilon$ 与参数无关。随机的部分被剥离成一进一出的旁路，$\mu, \sigma$ 所在的主干从此处处可微，梯度畅通——工程实现里那一行看似随手的两行加乘，就是这个技巧的全部实体。
</details>

## 8. 下一站

替身编码器终究是在"猜"潜空间的样子。另一支思路更激进：与其猜，不如直接构造一批**可逆变换**，把一个规规矩矩的高斯硬掰成数据分布——掰的过程必须记账，记账的工具叫雅可比行列式。下一课从一维开始手掰。

→ [Normalizing Flow 与雅可比行列式](./60-normalizing-flows.md)
