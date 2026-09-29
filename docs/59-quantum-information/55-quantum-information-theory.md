---
title: 量子信息论：von Neumann 熵与被限定的信道
lesson_id: quantum-information/quantum-information-theory
prereqs:
  - quantum-information/density-matrix
  - information/entropy
volume: 5
layer: L11
track:
  - information-learning
  - scientific-computing
stage: research-elective
difficulty: 5
---

# 量子信息论：von Neumann 熵与被限定的信道

## 1. 从一个场景开始

一封信最多能带多少信息？香农在 1948 年给了答案：**由它的不确定度决定，量与熵成正比。**

现在换一个载体：一个量子比特。它的状态不是"0 或 1"，而是 $\alpha|0\rangle + \beta|1\rangle$——理论上 $\alpha,\beta$ 是复数，**可以承载无穷多的经典信息**。

那它是不是能带走无限的信息？

**不行。** 这就是本课要算的账：量子态虽然"装得下"无穷多，但**读得出来**的经典信息有硬上界。这个上界叫 **Holevo 界**，而给量子态定义"不确定度"的那个量，叫 **von Neumann 熵**。

## 2. 直觉解释

先把"不确定度"这个想法搬过来。

经典里，一枚均匀硬币的不确定度是 1 bit，一枚必然正面的硬币是 0 bit。**不确定度 = 你还需要问多少个"是/否"问题才能确定答案。**

量子里，"状态"的载体从一个概率分布换成了一个**密度矩阵** $\rho$。要衡量它的不确定度，思路完全一样：

- **纯态**（比如确定的 $|0\rangle$）：完全知道状态是什么 → 熵为 0；
- **最大混合态**（一个完全随机的量子比特）：什么都不知道 → 熵最大。

而量子特有的怪事在于：**一个整体是纯态（熵为 0）的复合系统，它的每一个局部却可能是混合态（熵大于 0）**。

这听起来自相矛盾——"整体完全确定，局部却不确定"？**这正是纠缠的本质**：单独看每个粒子都是随机的，但两者合起来完全没有随机性（贝尔态的熵为 0）。这部分熵，就是纠缠的度量。

## 3. 正式定义

**von Neumann 熵**（量子版的香农熵）：

$$S(\rho) = -\operatorname{tr}(\rho\log\rho) = -\sum_i \lambda_i\log\lambda_i$$

其中 $\lambda_i$ 是密度矩阵 $\rho$ 的**特征值**（构成一个概率分布）。

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $\rho$ | 密度矩阵 | 半正定、迹为 1 的矩阵，描述量子态 |
| $\lambda_i$ | 特征值 | $\rho$ 的谱，满足 $\lambda_i \ge 0,\ \sum\lambda_i = 1$ |
| $S(\rho)$ | von Neumann 熵 | 单位是 qubit（以 2 为底） |
| $d$ | 维度 | $\rho$ 是 $d\times d$ 矩阵 |
| $\chi$ | Holevo 量 | 一组量子态带出的经典信息上界 |

**三条关键性质**：

1. **纯态熵为零**：$\rho = |\psi\rangle\langle\psi|$，特征值是 $(1,0,\dots,0)$，所以 $S = -1\log1 = 0$；
2. **最大混合态的熵最大**：$\rho = I/d$，特征值全是 $1/d$，所以 $S = \log d$，**这是 $d$ 维系统的熵上限**；
3. **酉演化不改变熵**：$S(U\rho U^\dagger) = S(\rho)$——**封闭系统的演化是可逆的，信息不丢**（这与热力学第二定律的"熵增"不矛盾：熵增来自与环境的纠缠）。

**Holevo 界**：若 Alice 以概率 $p_x$ 制备量子态 $\rho_x$，Bob 通过测量想恢复 $x$，则可获取的经典信息受限于

$$\chi = S\!\left(\sum_x p_x\rho_x\right) - \sum_x p_x\,S(\rho_x)$$

且**任何测量方案能提取的经典信息都不超过 $\chi$**。

**为什么是上界**：叠加是**复振幅**的叠加，不同态之间会**干涉**；测量时你只能选一组正交基，非正交的量子态**无法被完美区分**。这个"测不准"的口子，被 Holevo 界量化了。

## 4. 分步例题

**例 1（纯态熵为零）**：$\rho = |0\rangle\langle0| = \begin{pmatrix}1&0\\0&0\end{pmatrix}$。

特征值是 $(1, 0)$，所以

$$S = -1\log_2 1 - 0\log_2 0 = 0$$

（约定 $0\log 0 = 0$。）**状态完全确定，不需要问任何问题，熵为 0。**

**例 2（最大混合态）**：$\rho = \frac{I}{2} = \begin{pmatrix}1/2&0\\0&1/2\end{pmatrix}$。

特征值是 $(1/2, 1/2)$：

$$S = -\tfrac12\log_2\tfrac12 - \tfrac12\log_2\tfrac12 = 1 \text{ bit}$$

**一个完全是噪声的量子比特正好携带 1 bit 的不确定度**，与均匀硬币相同。

**例 3（贝尔态：整体纯、局部混）**：取 $|\Phi^+\rangle = \frac{1}{\sqrt2}(|00\rangle + |11\rangle)$。

整体是纯态：$S(\rho_{AB}) = 0$。

但只看 A 的约化密度矩阵（对 B 求偏迹）：

$$\rho_A = \operatorname{tr}_B|\Phi^+\rangle\langle\Phi^+| = \frac12|0\rangle\langle0| + \frac12|1\rangle\langle1| = \frac{I}{2}$$

于是 $S(\rho_A) = 1$ bit。

**整体熵 0，局部熵 1**——多出来的这 1 bit **全部来自纠缠**。这不是会计误差，而是"局部信息被隐藏进了关联里"的数学表述。

**例 4（Holevo 界的一个具体数字）**：Alice 以等概率发送 $|0\rangle$ 或 $|+\rangle = \frac{1}{\sqrt2}(|0\rangle+|1\rangle)$。

1. $\rho_x$ 都是纯态，所以 $S(\rho_x) = 0$，第二项为 0；
2. 平均态 $\rho = \frac12|0\rangle\langle0| + \frac12|+\rangle\langle+|$；
3. 算它的特征值：矩阵为 $\begin{pmatrix}3/4 & 1/4\\ 1/4 & 1/4\end{pmatrix}$，特征值约 $(0.8536,\ 0.1464)$；
4. $S(\rho) = -0.8536\log_2 0.8536 - 0.1464\log_2 0.1464 \approx 0.6009$ bit。

Holevo 界给出 $\chi \approx 0.60$。**可发送的信息不是 1 bit（两个等概率消息），而是不到 0.61 bit**——因为两个非正交态无法完美区分。

## 5. 动手实验

先手算 2×2 密度矩阵的 von Neumann 熵（用解析公式对角化）：

```python title="2×2 密度矩阵的熵：手算特征值"
import math

def entropy_2x2(rho):
    """2×2 密度矩阵的 von Neumann 熵（解析求特征值）"""
    a, b = rho[0][0], rho[0][1]
    c, d = rho[1][0], rho[1][1]
    trace = a + d
    det = a * d - b * c
    # 特征值是 λ² - tr·λ + det = 0 的两个根
    disc = trace * trace - 4 * det
    disc = max(disc, 0.0)                      # 数值误差保护
    root = math.sqrt(disc)
    l1 = (trace + root) / 2
    l2 = (trace - root) / 2
    S = 0.0
    for lam in (l1, l2):
        if lam > 1e-12:                        # 0·log0 约定为 0
            S = S - lam * math.log2(lam)
    return S, (l1, l2)

# 纯态 |0><0|
print("纯态 |0>：S =", round(entropy_2x2([[1, 0], [0, 0]])[0], 6))
# 最大混合态 I/2
print("最大混合态：S =", round(entropy_2x2([[0.5, 0], [0, 0.5]])[0], 6))
# 一半一半的 |0> 与 |1> 经典混合（同上）
print("经典混合 50/50：S =", round(entropy_2x2([[0.5, 0], [0, 0.5]])[0], 6))
```

输出 $0$、$1$、$1$——**纯态无不确定度，均匀混合正好 1 bit**。

再看纠缠那条"反直觉等式"：整体熵 0，局部熵 1：

```python title="贝尔态：整体纯，局部混"
import math

def bell_phi_plus_reduced_A():
    """|Φ+> = (|00> + |11>)/√2 对 B 求偏迹后的 ρ_A"""
    # 整体密度矩阵在基 {|00>,|01>,|10>,|11>} 下：
    # |Φ+><Φ+| 的元素：只有 (00,00)=(00,11)=(11,00)=(11,11)=1/2
    # 对 B 求偏迹（把 B 的指标抽掉）得到 A 的约化矩阵
    return [[0.5, 0], [0, 0.5]]        # 结果是 I/2

def entropy_2x2(rho):
    a, b = rho[0][0], rho[0][1]
    c, d = rho[1][0], rho[1][1]
    trace, det = a + d, a * d - b * c
    disc = max(trace * trace - 4 * det, 0.0)
    root = math.sqrt(disc)
    S = 0.0
    for lam in ((trace + root) / 2, (trace - root) / 2):
        if lam > 1e-12:
            S = S - lam * math.log2(lam)
    return S

S_global = 0.0                          # |Φ+> 是纯态，整体熵为 0
S_A = entropy_2x2(bell_phi_plus_reduced_A())
print(f"整体熵 S(AB) = {S_global}")
print(f"局部熵 S(A)  = {S_A}")
print(f"差额 {S_A - S_global} bit 全部来自纠缠")
```

**这个差额就是纠缠熵**——整体是纯的，但你把两个粒子分开看，各自都处于完全随机状态。

最后跑一遍 Holevo 界，看"非正交态送不出 1 bit"：

```python title="Holevo 界：非正交态的信息上限"
import math

def entropy_2x2(rho):
    a, b = rho[0][0], rho[0][1]
    c, d = rho[1][0], rho[1][1]
    trace, det = a + d, a * d - b * c
    disc = max(trace * trace - 4 * det, 0.0)
    root = math.sqrt(disc)
    S = 0.0
    for lam in ((trace + root) / 2, (trace - root) / 2):
        if lam > 1e-12:
            S = S - lam * math.log2(lam)
    return S

def holevo(p_list, rho_list):
    """χ = S(平均态) - Σ p_x S(ρ_x)"""
    # 平均态：逐元素加权求和
    n = len(rho_list[0])
    avg = [[sum(p * r[i][j] for p, r in zip(p_list, rho_list))
            for j in range(n)] for i in range(n)]
    term1 = entropy_2x2(avg)
    term2 = sum(p * entropy_2x2(r) for p, r in zip(p_list, rho_list))
    return term1 - term2

# 情形一：正交态 |0> 与 |1>
orth = [[[1, 0], [0, 0]], [[0, 0], [0, 1]]]
print(f"正交态（|0> 与 |1>）：χ = {holevo([0.5, 0.5], orth):.6f} bit")

# 情形二：非正交态 |0> 与 |+>
plus = [[0.5, 0.5], [0.5, 0.5]]
nonorth = [[[1, 0], [0, 0]], plus]
print(f"非正交（|0> 与 |+>）： χ = {holevo([0.5, 0.5], nonorth):.6f} bit")
```

对比两行：**正交态达到整整 1 bit（完美可区分），非正交态只有约 0.60 bit**。这就是 Holevo 界在具体任务上的体现——**量子态能不能被区分，取决于它们在希尔伯特空间里"正交不正交"**。

### 快问快答

```quiz
一个量子比特最多能携带多少经典信息？
- 无穷多，因为复振幅是连续量
- 1 个比特 [*]
- 2 个比特
? 量子比特虽然有无穷多个可能状态，但 Holevo 界说明：从一个量子比特里最多只能可靠提取 1 个经典比特。超密编码能传 2 个比特需要预先共享纠缠，且消耗的是两个量子比特的整体资源。
```

:::warning[常见误区]

**误区一**："量子比特可以装无穷多信息，所以量子通信无限快。" 
不是。**"装得下"和"取得出"是两件事**。一个量子比特的态是连续的，但测量只能给出有限结果，且非正交态无法完美区分。**Holevo 界正是这道闸门**：从 $n$ 个量子比特里最多提取 $n$ 个经典比特。

**误区二**："纯态的熵为 0，所以纯态什么都不携带。" 
熵为 0 说的是"不确定度为零"——**你完全知道状态是什么**。这与"没有信息"正好相反：一个确定的态是最理想的信息载体。相反，最大混合态熵最大，可它几乎什么都不携带（全是噪声）。

**误区三**："整体纯态，局部一定是纯态。" 
这是量子信息最反直觉的地方。贝尔态整体熵为 0，局部熵为 1——**局部的不确定性完全来自与另一部分的关联**。这也是为什么"纠缠"不能用经典关联去理解：经典里两个确定变量的联合分布一定确定，量子里不是。

**误区四**："von Neumann 熵就是香农熵换个名字。" 
形式上确实是 $\rho$ 特征值上的香农熵，但**含义变了**：香农熵描述"你对经典取值的不确定"，von Neumann 熵描述"态的混合程度"，而且**不能简单相加**（$S(\rho_A) + S(\rho_B) \ne S(\rho_{AB})$，甚至可能反向）。量子熵有一套自己的不等式体系。

:::

## 6. 练习

**练习 1**：下面的代码想算最大混合态的 von Neumann 熵，但忘了在 $\lambda=0$ 时按约定跳过（$0\log 0 = 0$），也没有正确处理数值误差。改到输出 `1.0`：

```exercise
# @title: 练习：最大混合态的熵
# @check: 1.0
# @hint: 特征值是 1/2 和 1/2，熵 = -(1/2·log2(1/2))×2 = 1；注意 λ>0 才取对数

import math
eigenvalues = [0.5, 0.5]
S = 0.0
for lam in eigenvalues:
    S = S - lam * math.log2(lam)     # ← 这里没检查 lam 是否为正
print(round(S, 6))
```

**练习 2**：Alice 以等概率发送三个量子态 $|0\rangle$、$|1\rangle$、$|+\rangle$。求平均态的熵与 Holevo 界，并判断"发送 3 个消息能否提取 $\log_2 3 \approx 1.585$ bit"。

<details>
<summary>点开查看逐步解答</summary>

三个态等概率，平均态：

$$\rho = \frac13|0\rangle\langle0| + \frac13|1\rangle\langle1| + \frac13|+\rangle\langle+|$$

算矩阵元素：$|0\rangle\langle0| = \begin{pmatrix}1&0\\0&0\end{pmatrix}$，$|1\rangle\langle1| = \begin{pmatrix}0&0\\0&1\end{pmatrix}$，$|+\rangle\langle+| = \begin{pmatrix}1/2&1/2\\1/2&1/2\end{pmatrix}$。

平均后：$\rho = \begin{pmatrix}1/3+1/6 & 1/6\\ 1/6 & 1/3+1/6\end{pmatrix} = \begin{pmatrix}1/2 & 1/6\\ 1/6 & 1/2\end{pmatrix}$

特征值：$1/2 \pm 1/6$，即 $(2/3, 1/3)$。

$$S(\rho) = -\tfrac23\log_2\tfrac23 - \tfrac13\log_2\tfrac13 \approx 0.9183 \text{ bit}$$

三个 $\rho_x$ 都是纯态（$S=0$），所以 $\chi = 0.9183$ bit。

**而发送 3 个等概率消息需要 $\log_2 3 \approx 1.585$ bit**——**缺口近 42%**，无法可靠区分。

```python
import math
def entropy_2x2(rho):
    a, b = rho[0][0], rho[0][1]
    c, d = rho[1][0], rho[1][1]
    tr, de = a + d, a * d - b * c
    root = math.sqrt(max(tr * tr - 4 * de, 0))
    S = 0.0
    for lam in ((tr + root)/2, (tr - root)/2):
        if lam > 1e-12:
            S -= lam * math.log2(lam)
    return S

print("平均态熵 =", round(entropy_2x2([[0.5, 1/6], [1/6, 0.5]]), 6))
print("需要的比特数 =", round(math.log2(3), 6))
print("缺口 =", f"{(1 - 0.9183/math.log2(3))*100:.1f}%")
```

**这正是量子密码学的基础**：窃听者无法完美区分非正交态，所以任何测量都会留下可检测的扰动。
</details>

## 7. 选读：量子信道容量与超密编码

<details>
<summary>选读 · 用纠缠换比特的两个方向</summary>

**超密编码（Superdense Coding）**：Alice 和 Bob 预先共享一个贝尔态。Alice 只发送**一个**量子比特给 Bob，Bob 却能读出 **2 个经典比特**。

怎么回事？因为 Alice 对**自己那一半**做的操作（$I$、$X$、$Z$、$XZ$）会把共享态变成四个**正交**的贝尔态之一。正交态可以完美区分，于是 2 bit 信息被传了出来。

**注意 Holevo 界没有被违反**：Bob 手里有**两个**量子比特（他自己的 + Alice 发来的），所以上界是 2 bit。纠缠充当了"预存的信息额度"。

**反方向：量子信道容量**。经典香农容量说 $C = \max I(X;Y)$。量子情形要复杂得多：

- **经典容量** $\chi$（Holevo 容量）——只用来传经典比特时的可达速率；
- **量子容量** $Q$——用来传量子态时，可能**小于**经典容量，也可能**大于**（LSD 定理给出"超加性"：两条信道合起来比分开用更强）；
- **纠缠辅助容量** $C_E$——双方有无限纠缠共享时，等于 $\log d + S(\rho)$。

**最反直觉的一条**：有些量子信道**完全不能传量子信息**（$Q=0$），却能传经典信息（$\chi>0$）——这叫"纠缠破坏信道"。**"能传什么"不再是一个数就能说清的事**，这正是量子信息论比香农理论复杂得多的原因。

**落点**：量子纠错码就是在这套框架下"把信息藏进纠缠里"的技术——它要把 $\chi$ 和 $Q$ 之间的差距管理好，才能让噪声中的量子计算可行。
</details>

## 8. 下一站

从 Bloch 球到纠缠、从密度矩阵到 von Neumann 熵，量子信息的入门工具已经配齐。下一站看量子计算里最著名的两个算法——它们把量子叠加真正变成了"加速"。

→ [Grover 与 Shor：量子加速的样板间](./85-grover-shor.md)：搜索与分解，量子优势的两个标杆。
