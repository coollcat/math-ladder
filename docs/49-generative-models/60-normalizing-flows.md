---
title: Normalizing Flow 与雅可比行列式
lesson_id: generative/normalizing-flows
prereqs:
  - generative/sampling
  - probability-advanced/transformations
  - probability-advanced/inverse-transform-sampling
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
  - change-of-variables
  - jacobian-determinant
  - normalizing-flow
  - affine-coupling
applications:
  - image-generation
  - density-estimation
exits:
  - data-ai
---

# Normalizing Flow 与雅可比行列式

## 1. 从一个场景开始

观察拉面师傅的工作台：一团粗细均匀的面（一个规规矩矩的标准高斯），被他双手反复拉扯、折叠——出锅时已经是一根细处极细、粗处极粗的复杂面条（目标数据分布）。

Normalizing Flow 的野心正是这道工序：**写不出目标分布的公式没关系，只要能造出一串可逆变换，把简单分布一步步"捏"成它**。唯一的要求是师傅得当心记账：哪里把面团压密了（密度升高）、哪里拉稀了（密度降低），每一笔都要落到一本账上——这本账的名字叫雅可比行列式。

## 2. 直觉解释

把概率想成不可压缩的水。我们只搬水、不添不减：

- **总体积守恒**：任何一段区间里的概率总量，变换前后必须相等；
- **局部密度伸缩**：若变换把一小段长度为 $\Delta$ 的区间压缩成 $\Delta/3$，为了总量不变，新位置的密度就得恰好变成原来的 $3$ 倍。

所以每个可逆变换自带一台"局部拉伸率测量仪"：在一点附近量出它把体积缩放了多少倍，再把新密度按这个比例反着修正回去。多维情形这台仪器就是雅可比行列式的绝对值 $|\det J|$；取对数后，$\ln|\det J|$ 成了流水账上一个纯加法的修正项。

一维特例一眼看穿：若 $x = T(z)$，则 $p_X(x) = p_Z(z)\,/|T'(z)|$——分母就是那根一维"拉伸率"。

## 3. 正式定义

设 $z \sim p_Z$（通常是标准高斯），可逆变换 $x = T(z)$：

$$\ln p_X(x) = \ln p_Z\big(T^{-1}(x)\big) - \ln\left|\det \frac{\partial T}{\partial z}\bigg|_{z = T^{-1}(x)}\right.$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $T^{-1}(x)$ | 逆映射 | 从数据点回到基础空间的坐标 |
| $J$ | 雅可比矩阵 | 变换的一阶偏导矩阵（第 21 章的老朋友） |
| $\det J$ | 行列式 | 局部体积缩放率，带符号；取绝对值后进账本 |

两条关键性质：

1. **流动可以叠**：多层可逆变换 $T_3 \circ T_2 \circ T_1$ 串联时，账本按链式法则逐层累加——总账 = 各层 $\ln|\det J|$ 之和，再多层的复杂度也不失控；
2. **双向免费**：一旦各层可逆，同一个网络既能正向生成（采样 $z$ 往前推）也能精确算出每个数据点的对数密度（反向收账）——这是 VAE 花多大力气也拿不到的精确似然。

## 4. 分步例题

一维手算：$z \sim N(0,1)$，标准高斯密度 $\varphi(z) = \frac{1}{\sqrt{2\pi}} e^{-z^2/2}$；仿射流 $T(z) = 1 + 2z$（平移 $m=1$、拉伸 $s=2$）。求 $x=3$ 处的新密度。

1. 回基础空间：$z = T^{-1}(3) = (3-1)/2 = 1$；
2. 查基础价目：$\varphi(1) = \frac{1}{\sqrt{2\pi}} e^{-1/2} \approx 0.2420$；
3. 记体积账：一维拉伸率 $|T'| = s = 2$，密度按反比修正，除以 2；
4. 合账：$p_X(3) = 0.2420 / 2 = 0.1210$；取对数即 $\ln p_X(3) = \ln\varphi(1) - \ln 2 \approx -1.419 - 0.693 = -2.112$。整个 Flow 家族的训练（极大似然！），就是在每个数据点上把这四步自动化。

## 5. 动手实验

### 实验 1（viz）：拖动平移与拉伸，看高斯被掰成什么形状

橙线是流过的数据分布 $\varphi\big((x-m)/s\big)/s$，蓝线是原始标准高斯。拖 $m$：整座山平移，高度纹丝不动；拖大 $s$：山体摊宽、峰顶必须塌下来凑齐总面积；拖小 $s$：珠子挤窄、峰顶蹿高。"瘦高必补矮胖，面积永远归一"——这就是账本在暗中执行的守恒律。

```viz
{
  "type": "plot",
  "title": "仿射流：基础高斯 → 数据分布",
  "expr": "exp(-x^2/2)/sqrt(2*pi)",
  "expr2": "exp(-((x-m)/s)^2/2)/(s*sqrt(2*pi))",
  "label": "基础高斯",
  "label2": "流出的数据分布",
  "xmin": -8,
  "xmax": 10,
  "sliders": [
    { "name": "m", "min": -4, "max": 4, "step": 0.5, "value": 1 },
    { "name": "s", "min": 0.4, "max": 3, "step": 0.1, "value": 2 }
  ]
}
```

### 实验 2（python）：手算对数密度，再用数值积分验账

```python title="单层仿射流的密度账"
import math

def log_phi(z):
    # 标准高斯的对数密度：常数尾巴 -ln(sqrt(2*pi)) 加抛物线主体
    return -0.5 * z * z - math.log(math.sqrt(2 * math.pi))

def flow_logpdf(x, m, s):
    z = (x - m) / s                # 第一步：回到基础空间
    return log_phi(z) - math.log(s)  # 第二步：查基础价目、扣体积账

for x in [3, 1, -1]:
    v = flow_logpdf(x, 1, 2)
    print(f"x={x:>3}: ln p={round(v, 4)}, p={round(math.exp(v), 4)}")

total = 0.0
k = -7000
while k <= 7000:
    x = k * 0.001                  # 在 [-7, 7] 上铺细格子做矩形积分
    total += math.exp(flow_logpdf(x, 1, 2)) * 0.001
    k += 1
print("数值积分的总面积:", round(total, 3))
```

三行密度与例题逐位吻合（$x=-1$ 与 $x=3$ 对称同值），积分面积约 $1.001$——账本自洽。真实 Flow 里被替换掉的只是"查 $\varphi$"与"算 $\ln|\det J|$"这两步的实现者，格局未动。

### 实验 3（python）：仿射耦合层——让账本便宜到一次乘法

深层网络若每层都是稠密映射，$\det J$ 要付 $O(d^3)$ 天价。RealNVP 式耦合层把每层劈成两半：一半原样通过，另一半只接受第一半的仿射指挥。它的雅可比天然是**下三角阵**，而行列式只看对角线：

```python title="两维耦合层的雅可比为什么又便宜又准"
import math

def couple(x):
    a, b = x                       # a 原样通行；b 由 a 的函数去伸缩
    return [a, b * math.exp(0.3 * a)]

x = [1.0, 2.0]
J_cols = []                        # 数值雅可比：逐列做微小位移测偏导
h = 1e-6
for j in range(2):
    xp = list(x); xm = list(x)
    xp[j] += h; xm[j] -= h         # 正向列差分与负向列差分
    fp, fm = couple(xp), couple(xm)
    col = [(fp[i] - fm[i]) / (2 * h) for i in range(2)]  # 列表推导式：一行算一列
    J_cols.append(col)

row_hi = [J_cols[0][0], J_cols[1][0]]
row_lo = [J_cols[0][1], J_cols[1][1]]
det_num = row_hi[0] * row_lo[1] - row_hi[1] * row_lo[0]
print("雅可比上排:", [round(v, 4) for v in row_hi])
print("雅可比下排:", [round(v, 4) for v in row_lo])
print("数值行列式:", round(det_num, 4))
print("理论值 exp(0.3*a):", round(math.exp(0.3 * x[0]), 4))
```

上排第二位恒为零（第一半不依赖第二半）、对角线第二个元素恰是 $e^{g}$——行列式只剩这一个因子，一次查表搞定。真实网络里的尺度器 $g$ 由神经网络承担，技巧一字不改。

### 快问快答

```quiz
仿射耦合层为什么能把雅可比行列式算得飞快？
- 因为矩阵阶数只有 2
- 因为它是三角阵，行列式等于对角元连乘，一次乘法到手 [*]
- 因为它根本不需要计算行列式
? 上半块原样通过使雅可比出现整条零列，矩阵退化成三角形；三角阵的行列式就是沿对角线的乘积，百万维也只有百万次乘法。
```

:::warning[常见误区]

**误区一**："你以为随便一个网络都能当流。" 必须**严格可逆**且雅可比好算；普通前馈网络两个条件都不满足，所以可用结构被限死在耦合层、自回归掩码等少数几款。

**误区二**："你以为 $\ln|\det J|$ 可以单独当损失。" 它不是密度而是修正系数；丢了基础密度那一项，优化器会学出一个处处乱奖乱罚的怪账本。

**误区三**："你以为多层数会让公式指数膨胀。" 账本逐层相加；十层变换的总修正就是十个 $\ln|\det J|$ 相加——线性增长而已。

:::

## 6. 练习

**练习**：给同一支仿射流补全对数密度的"体积账"。现在的代码能跑，但账本缺了一行：

```exercise
# @title: 练习：把体积账记进对数密度
# @check: -2.11
# @check: -1.61
# @hint: 对数域里除以 s 等于减去 log(s)。三个测试点的 z 分别是 1、0、-1。
import math

def log_phi(z):
    return -0.5 * z * z - math.log(math.sqrt(2 * math.pi))

def flow_logpdf(x, m, s):
    z = (x - m) / s
    return log_phi(z)              # ← 问题在这：拉伸率的修正没入账

print(round(flow_logpdf(3, 1, 2), 2))
print(round(flow_logpdf(1, 1, 2), 2))
```

<details>
<summary>点开查看逐步解答</summary>

修法是把返回值改为 `return log_phi(z) - math.log(s)`。核对：$x=3$ 时 $z=1$，得 $-1.419 - 0.693 = -2.11$；$x=1$ 时 $z=0$，得 $-0.919 - 0.693 = -1.61$。漏记一笔的后果立竿见影：所有 $s \neq 1$ 的模型都会得到系统性歪曲的概率报价——把同一批数据放在两种 $s$ 下比较似然，输赢全颠倒了。
</details>

## 7. 选读：与逆向变换采样的血缘关系

<details>
<summary>选读 · CDF 也是一支隐形的流</summary>

第 36 章的逆变换采样其实早已做过同样的事：取均匀分布 $u \in (0,1)$，令 $x = F^{-1}(u)$，便得到目标分布的样本。它正是一个把"最简单的分布"掰成目标分布的可逆变换，其雅可比恰是密度函数本身 $f(F^{-1}(u))$。所不同者：逆变换采样要求能显式写出 $F^{-1}$（昂贵甚至做不到），Flow 则反过来——先随便给一个数据点 $x$，靠可逆网络现算它落在基础空间的坐标与密度。一个管"怎么采样"，一个管"评估与拟合"，一对镜像互为补充。
</details>

## 8. 下一站

流家族 everything 都记得清清楚楚：每个样本有精确密度，代价是被可逆性捆住手脚。另一派人干脆掀桌：不要密度了，直接训练造假者与鉴别手面对面对砍——胜负本身就是对分布差异的度量。下一课走进这场著名的极小极大博弈。

→ [GAN 的极小极大博弈](./68-gan-minimax.md)
