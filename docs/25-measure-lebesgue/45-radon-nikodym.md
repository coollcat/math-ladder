---
title: Radon-Nikodym 定理：密度的出生证
lesson_id: measure-lebesgue/radon-nikodym
prereqs:
  - measure-lebesgue/measurable-functions
  - measure-lebesgue/lebesgue-integral
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
---

# Radon-Nikodym 定理：密度的出生证

## 1. 从一个场景开始

掷一枚不均匀的硬币，正面概率 $0.7$。掷一个点，落在 $[0,1]$ 上的均匀分布。

两个完全不同的场景，你都习惯性地写出"密度"：$p(\text{正}) = 0.7$、$f(x) = 1$。

可你有没有想过——**"密度"到底是什么？凭什么它存在？**

在中学，密度是"概率除以长度"。但在测度论里，长度和概率都是**测度**，两个测度之间没有天然的除法。密度能从哪儿冒出来？

Radon-Nikodym 定理就是回答这个问题的：**它给出密度存在的充要条件，并把密度定义为两个测度的"导数"。**

## 2. 直觉解释

先看一个反例，说明密度不是白给的。

设 $\mu$ 是"数点测度"——只在 $x=0$ 处给出 $1$，其他地方都是 $0$。设 $\nu$ 是普通的长度测度。

问：$\mu$ 能写成 $\nu$ 的积分吗？也就是，存在 $f$ 使得 $\mu(A) = \int_A f\,d\nu$ 吗？

**不能。** 因为 $\nu$ 认为单点集 $\lbrace0\rbrace$ 的长度是 $0$，所以 $\int_{\lbrace0\rbrace} f\,d\nu = 0$，可 $\mu(\lbrace0\rbrace) = 1$。**长度测度看不见点，而点测度只盯着点**——它们根本不在同一个世界里。

这类"看得见别人看不见的东西"的测度，就叫**不绝对连续**。

反过来，如果 $\mu$ 只把正质量放在 $\nu$ 也认为是"大"的地方，密度就有希望存在。这正是**绝对连续** $\mu \ll \nu$ 的定义，也是定理的门槛。

## 3. 正式定义

**绝对连续**：设 $\mu,\nu$ 是同一个可测空间上的两个测度。若对任意可测集 $A$，

$$\nu(A) = 0 \;\Longrightarrow\; \mu(A) = 0$$

则称 $\mu$ 关于 $\nu$ 绝对连续，记作 $\mu \ll \nu$。

（读法："$\nu$ 认为可以忽略的集合，$\mu$ 也必须认为可以忽略。"）

**Radon-Nikodym 定理**：若 $\mu,\nu$ 是 $\sigma$-有限测度且 $\mu \ll \nu$，则存在非负可测函数 $f$，使得对一切可测集 $A$，

$$\mu(A) = \int_A f\,d\nu$$

且这样的 $f$ 在 $\nu$-几乎处处意义下**唯一**。这个 $f$ 记作

$$f = \frac{d\mu}{d\nu}$$

称为 $\mu$ 关于 $\nu$ 的 **Radon-Nikodym 导数**（也常直接叫"密度"）。

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $\mu,\nu$ | 两个测度 | 定义在同一个可测空间上 |
| $\mu \ll \nu$ | 绝对连续 | $\nu$ 的零测集也是 $\mu$ 的零测集 |
| $d\mu/d\nu$ | RN 导数 | 一个函数，不是数——"测度的导数" |
| $f$ | 密度 | 与 RN 导数是一回事 |
| $\sigma$-有限 | 前提条件 | 测度空间可以被可数个有限测度块覆盖 |
| a.e. | 几乎处处 | 允许在零测集上有例外 |

**链式法则**：若 $\mu \ll \nu \ll \lambda$，则

$$\frac{d\mu}{d\lambda} = \frac{d\mu}{d\nu}\cdot\frac{d\nu}{d\lambda} \quad (\lambda\text{-a.e.})$$

**换元公式**：

$$\frac{d\mu}{d\nu} = \frac{1}{d\nu/d\mu}$$

（当两个方向都绝对连续时成立。）

## 4. 分步例题

**例 1（离散情形：RN 导数就是比值）**：设 $\Omega = \lbrace1,2,3\rbrace$，$\nu$ 是计数测度（每个点权重 1），$\mu$ 满足 $\mu(\lbrace1\rbrace)=2,\ \mu(\lbrace2\rbrace)=0,\ \mu(\lbrace3\rbrace)=5$。

检验绝对连续：$\nu$ 下唯一零测集是 $\varnothing$，所以 $\mu\ll\nu$ 自动成立。

RN 导数：$f(1) = 2/1 = 2$，$f(2) = 0$，$f(3) = 5$。**离散世界里"密度"就是权重之比**——这是你早就熟悉的，只是没给它名字。

**例 2（连续情形：正态分布对长度测度的密度）**：

$$\mu(A) = \int_A \frac{1}{\sqrt{2\pi}\sigma}e^{-(x-\mu_0)^2/(2\sigma^2)}\,dx$$

对照定义，$\dfrac{d\mu}{d\lambda}(x) = \dfrac{1}{\sqrt{2\pi}\sigma}e^{-(x-\mu_0)^2/(2\sigma^2)}$，其中 $\lambda$ 是 Lebesgue 测度。

**这就是概率密度函数存在的理由**——它是概率测度对 Lebesgue 测度的 RN 导数。

**例 3（不绝对连续的反例，走一遍体系）**：

$$\mu = \delta_0, \qquad \nu = \lambda$$

取 $A = \lbrace0\rbrace$：$\lambda(A) = 0$，但 $\delta_0(A) = 1 \ne 0$。所以 $\delta_0 \not\ll \lambda$。

**定理的前提失败，所以密度不存在**——这解释了为什么"点质量"不能写成普通的密度函数（工程上要用 Dirac δ 这种广义函数来救场，但那已经不是函数了）。

**例 4（Lebesgue 分解：一般情形长什么样）**：若 $\mu \not\ll \nu$，仍然可以拆开：

$$\mu = \mu_{ac} + \mu_{sing}$$

其中 $\mu_{ac} \ll \nu$ 有密度，$\mu_{sing} \perp \nu$ 与 $\nu$ 相互奇异。**这就是 Lebesgue 分解定理**——RN 定理是它"有密度的那一半"。

## 5. 动手实验

先在有限集合上验证：RN 导数就是比值，而且链式法则自动成立。

```python title="离散版 RN 导数：有限集合上的密度就是权重比"
def rn_derivative(mu, nu):
    """计算离散情形下 mu 对 nu 的 RN 导数（逐点比值）"""
    f = {}
    for key in nu:
        if nu[key] == 0:
            continue                  # nu 为 0 的地方要求 mu 也为 0（绝对连续）
        f[key] = mu[key] / nu[key]     # 密度 = 权重之比
    return f

nu = {1: 1, 2: 1, 3: 1}               # 计数测度：每点权重 1
mu = {1: 2, 2: 0, 3: 5}               # 自定义测度
f = rn_derivative(mu, nu)
print("RN 导数 f =", f)

# 验证：用 f 积分（离散就是加权求和）应当还原 mu
for key in nu:
    integral = f.get(key, 0) * nu[key]
    print(f"  点 {key}：∫f dν = {integral}，μ 值 = {mu[key]}")
```

再验证**换元公式**——两个测度互换，密度互为倒数：

```python title="换元：dμ/dν 与 dν/dμ 互为倒数"
def rn_derivative(mu, nu):
    f = {}
    for key in nu:
        if nu[key] == 0:
            continue
        f[key] = mu[key] / nu[key]
    return f

nu = {1: 2, 2: 4, 3: 2}               # 一个"不均匀的计数测度"
mu = {1: 1, 2: 8, 3: 3}
d1 = rn_derivative(mu, nu)
d2 = rn_derivative(nu, mu)
for key in nu:
    print(f"  点 {key}：dμ/dν = {d1[key]:.4f}，dν/dμ = {d2[key]:.4f}，"
          f"乘积 = {d1[key] * d2[key]:.4f}")
```

每一行的乘积都是 $1.0000$——**`dμ/dν = 1 / (dν/dμ)` 在离散世界上也成立**。

最后用数值积分验证连续情形：用 RN 导数算出的积分确实还原概率。

```python title="连续情形：数值积分验证 RN 导数"
import math

def normal_pdf(x, mu0, sigma):        # 标准正态密度：它就是 RN 导数
    return math.exp(-((x - mu0) ** 2) / (2 * sigma ** 2)) / (math.sqrt(2 * math.pi) * sigma)

# 用矩形法在 [-8, 8] 上积分（第 14 章数值积分的思路）
N = 20000
lo, hi = -8.0, 8.0
dx = (hi - lo) / N
total = 0.0
for i in range(N):
    x = lo + (i + 0.5) * dx           # 取每个小区间中点
    total = total + normal_pdf(x, 0, 1) * dx
print(f"∫pdf dx = {total:.6f}   （应当接近 1，即总概率）")
```

积出来约等于 $1.000000$——**密度积回去就是概率测度，这正是定理要保证的事**。

### 快问快答

```quiz
Radon-Nikodym 定理保证密度存在的前提条件是什么？
- 两个测度必须都是概率测度
- 两个测度必须 σ-有限，且其中一个关于另一个绝对连续 [*]
- 两个测度必须相互奇异
? 绝对连续保证零测集不会互相矛盾，σ-有限保证定理的积分论证能进行下去。缺了任一条件，密度都可能不存在——比如点测度对长度测度就不行。
```

:::warning[常见误区]

**误区一**："任何两个测度之间都有密度。" 
不是。绝对连续是**必须核实的前提**。点测度 $\delta_0$ 对长度测度没有密度，这是最容易踩的坑——它也是 Lebesgue 分解里"奇异部分"的来源。写概率密度前，先问一句：这个分布在长度测度下有密度吗？

**误区二**："$d\mu/d\nu$ 是一个数。" 
它是**一个函数**（一个可测函数），而且只在 $\nu$-a.e. 意义下唯一——在零测集上可以任意改动，不影响积分结果。别把它当成"两个测度相除得到的常数"。

**误区三**："RN 导数存在就一定处处有定义。" 
定理只保证存在一个 a.e. 有定义的函数。$\nu$-零测集上的值完全不影响任何积分，所以那些点的取值是自由的（通常任取，比如取 0）。

:::

## 6. 练习

**练习 1**：下面的代码想算离散情形下的 RN 导数并验证它能还原 $\mu$，但把比值写反了。改到输出 `f = {1: 2.0, 2: 0.0, 3: 5.0}`：

```exercise
# @title: 练习：算出正确的 RN 导数
# @check: f = {1: 2.0, 2: 0.0, 3: 5.0}
# @hint: 密度是 dμ/dν——分子是 mu 的权重，分母是 nu 的权重，别写反

nu = {1: 1, 2: 1, 3: 1}
mu = {1: 2, 2: 0, 3: 5}

f = {}
for key in nu:
    f[key] = nu[key] / mu[key]      # ← 分子分母写反了，而且 mu[2]=0 会除零
print("f =", f)
```

**练习 2**：判断以下两对测度中，哪个方向绝对连续？是否存在 RN 导数？

- (a) $\mu = $ 长度测度，$\nu = $ 长度测度（同一个）；
- (b) $\mu = \delta_0 + \lambda$，$\nu = \lambda$。

<details>
<summary>点开查看逐步解答</summary>

**(a)** 双向都绝对连续（$\nu(A)=0 \Leftrightarrow \mu(A)=0$），RN 导数处处为 $1$。这是最简单的例子：一个测度对自己的密度恒等于 1。

**(b)** 检查 $\mu \ll \nu$？取 $A=\lbrace0\rbrace$：$\nu(A)=\lambda(A)=0$，但 $\mu(A) = \delta_0(A) + \lambda(A) = 1 \ne 0$。

所以 $\mu \not\ll \nu$——**不存在 RN 导数**。

但反过来 $\nu \ll \mu$ 成立（$\mu$ 比 $\nu$ 更大，$\mu$ 的零测集必然也是 $\nu$ 的零测集），此时 $d\nu/d\mu$ 存在，且在 $\lbrace0\rbrace$ 上取 $0$。

```python
# 用离散类比感受一下：把 {0} 想象成一个点
# 情形 (b) 的离散版
nu = {0: 0, 1: 1, 2: 1}     # 长度测度：单点长度为 0
mu = {0: 1, 1: 1, 2: 1}     # 加了点质量
for k in nu:
    if nu[k] == 0 and mu[k] != 0:
        print(f"点 {k}：ν 为 0 但 μ 不为 0 → μ 不绝对连续于 ν，RN 导数不存在")
```

这个反例正是"Lebesgue 分解"要把点质量单独拆出去的原因。
</details>

## 7. 选读：定理为什么成立

<details>
<summary>选读 · 用 Radon 测度思路看 RN 定理</summary>

定理的完整证明不短，但核心思路可以用一句话概括：**把密度当成一个"最优化"的解。**

设 $\nu$ 是有限测度。考虑所有满足"$\int g\,d\nu \le \mu$ 对一切可测集成立"的非负可测函数 $g$（直觉：$g$ 是一个"不超过真实密度"的候选下界）。取这些 $g$ 的上确界：

$$f = \sup\lbrace g : \int_A g\,d\nu \le \mu(A),\ \forall A\rbrace$$

这个上确界**逐点取**（可数多个 $g$ 取 max 仍是可测的），得到的 $f$ 就叫 **Radon-Nikodym 导数**。

关键一步：证明 $\mu - f\,d\nu$ 这个差测度**必然为零测度**——否则就能构造出一个比 $f$ 更大的合法下界，与上确界的定义矛盾。

绝对连续条件在这里的作用是：**保证差测度的支撑集必然是 $\nu$-零测集**。所以差只能是零。

这个思路有个漂亮的副产品：它完全是构造性的——密度不是"猜出来的"，而是作为一族下界的最小上界被"顶"出来的。从测度论的角度看，这与实数完备性里"上确界存在"扮演了同一个角色：**先证明存在，再讨论性质**。
</details>

## 8. 下一站

有了密度的出生证，很多原先"靠直觉用"的公式就有了严格基础。特别是在概率论里，条件期望这个最微妙的对象，其实就是一个 Radon-Nikodym 导数。

→ [概率论的测度论视角](./60-probability-as-measure.md)
