---
title: 纠缠与贝尔不等式一瞥
lesson_id: quantum-information/entanglement-bell
prereqs:
  - quantum-information/single-qubit-gates
  - quantum-information/measurement-born
volume: 5
layer: L11
track:
  - information-learning
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - entanglement
  - bell-state
  - chsh-inequality
applications:
  - quantum-cryptography
  - quantum-teleportation
exits: []
---

# 纠缠与贝尔不等式一瞥

## 1. 从一个场景开始

把一对骰子分寄给北京和巴黎的朋友。两人各自掷骰，结果却**次次相同**：你掷出 3 的同一瞬间，地球另一端也必然是 3。骰子相距万里、互不通消息——这荒谬吗？

量子力学里这样的"骰子对"真实存在，叫**纠缠**（entanglement）。爱因斯坦称之为"幽灵般的超距作用"，并坚信背后藏着更深的约定（隐变量）。1964 年贝尔出手：他找到一个**可实验检验的判据**，把"世界究竟有没有事前约定"变成了一道算术题。本课用初等数学走完这道题的关键一步。

## 2. 直觉解释

两个量子比特的联合状态有四个基：$\lvert00\rangle,\lvert01\rangle,\lvert10\rangle,\lvert11\rangle$（"左边的比特是几、右边的比特是几"拼成的标签）。

其中最著名的一个是**贝尔态**：

$$\lvert\Phi^+\rangle=\frac{1}{\sqrt2}\bigl(\lvert00\rangle+\lvert11\rangle\bigr)$$

读它的含义：测出来要么是"双双 0"，要么是"双双 1"，各半；**永远不会出现一 0 一 1**。两地结果完美同步。

惊人的地方在于：这个状态**不能拆成**"左边某个状态 ⊗ 右边某个状态"。它不是两根独立的指针，而是**一根共同的指针**悬在四维空间里——"左边那个比特自己处于什么状态"这个问题已经没有答案。纠缠就是这种不可拆分的整体性。

## 3. 正式定义

**张量积**（速写）：两个单比特状态 $\begin{pmatrix}a\\b\end{pmatrix}$ 与 $\begin{pmatrix}c\\d\end{pmatrix}$ 拼联合状态的办法是把所有分量交叉相乘，得四维向量 $(ac,ad,bc,bd)^T$——维数从 2 变 $2\times2=4$，这就是量子计算存储威力与模拟困难的共同根源。

**纠缠态**：不能写成任何乘积态 $\lvert\psi\rangle_A\otimes\lvert\phi\rangle_B$ 的双比特状态。贝尔态 $\lvert\Phi^+\rangle$ 是最纯的样本。

**关联函数与 CHSH 组合**：两地各选测量方向（角度）$a,a'$ 与 $b,b'$，记 $E(a,b)$ 为两地结果乘积的平均值（同号 +1、异号 −1 的平均）。定义

$$S=\bigl|E(a,b)-E(a,b')\bigr|+\bigl|E(a',b)+E(a',b')\bigr|$$

| 阵营 | $S$ 的上限 | 含义 |
| --- | --- | --- |
| 经典隐变量（事前约定） | $S\le 2$ | 贝尔不等式 |
| 量子力学 | $S\le 2\sqrt2\approx2.828$ | Tsirelson 界 |

实验反复给出 $S>2$——世界不按"事前约定"运转。

## 4. 分步例题

**例 1**：求贝尔态四种联合结果的概率。

1. 写出振幅向量：$\frac{1}{\sqrt2}(1,0,0,1)^T$（对应标签 00, 01, 10, 11）；
2. 逐个取模平方：$P(00)=\frac12$，$P(01)=0$，$P(10)=0$，$P(11)=\frac12$；
3. 归一化检查：$\frac12+0+0+\frac12=1$ ✓；
4. 结论：只出现同步结果——这是"幽灵同步"的定量版。

**例 2（经典阵营的极限表演）**：假设每个光子对出厂时就带一份密约 λ（均匀随机的偏振角），两地测量各自返回"λ 是否过检偏器"的 ±1 判定。可以推出关联是斜线：

$$E_{cl}(\Delta)=1-\frac{2\Delta}{\pi}\qquad(\Delta\ \text{为两地角度差，弧度})$$

代入精心挑选的四角度 $a=0^\circ,\ a'=45^\circ,\ b=22.5^\circ,\ b'=67.5^\circ$：

1. $E_{cl}(a,b)=E_{cl}(22.5^\circ)=1-\frac{45}{180}=0.75$；
2. $E_{cl}(a,b')=E_{cl}(67.5^\circ)=1-\frac{135}{180}=0.25$；
3. $E_{cl}(a',b)=0.75$，$E_{cl}(a',b')=E_{cl}(-22.5^\circ)=0.75$；
4. $S_{cl}=|0.75-0.25|+|0.75+0.75|=0.5+1.5=2.0$——**贴着经典天花板**，一分不多。

## 5. 动手实验

量子阵营的关联函数是余弦曲线，经典阵营是斜线。两条曲线在一张图上短兵相接——凡斜线够不着而余弦够得着的地方，就是量子超车的路段：

```viz
{
  "type": "plot",
  "title": "关联函数对决：量子 cos(x) vs 经典折线",
  "expr": "cos(x)",
  "expr2": "1 - 2*abs(x)/pi",
  "xmin": -3.1416,
  "xmax": 3.1416
}
```

### 实验 1（python）：模拟"事前约定"的骰子工厂

```python title="隐变量模型：关联真的是一条斜线"
import random
import math

def classical_E(delta):
    # 密约 lambda：出厂时随机定好的偏振角
    agree = 0
    trials = 4000
    for t in range(trials):
        lam = random.uniform(0, math.pi)   # 均匀抽取 [0, π)
        a_side = 1 if math.cos(lam - delta / 2) >= 0 else -1   # 左地判定 ±1
        b_side = 1 if math.cos(lam + delta / 2) >= 0 else -1   # 右地判定 ±1
        if a_side == b_side:
            agree = agree + 1
    return 2 * agree / trials - 1          # 同号均值：(P同 - P异)

for deg in [0, 22.5, 45, 67.5]:
    d = math.radians(deg)
    print(f"Δ={deg:5.1f}°  E_cl ≈ {round(classical_E(d), 3)}  斜线公式 {round(1 - 2*d/math.pi, 3)}")
```

模拟值紧贴斜线公式——这个最简"出厂偏振角"模型给出了经典阵营的一条代表关联线；CHSH 组合还会对所有合法隐变量模型设下更普遍的天花板（选读部分给理由）。

### 实验 2（python）：CHSH 决算，量子越线

```python title="两边阵营的 S 值对比"
import math

# 例题 2 的四个角度（度）
a, ap, b, bp = 0, 45, 22.5, 67.5

def s_value(E):
    # 把四个角度差换算成弧度，分别查关联函数
    e_ab = E(math.radians(a) - math.radians(b))
    e_abp = E(math.radians(a) - math.radians(bp))
    e_apb = E(math.radians(ap) - math.radians(b))
    e_apbp = E(math.radians(ap) - math.radians(bp))
    return abs(e_ab - e_abp) + abs(e_apb + e_apbp)

def E_cl(delta):                       # 经典斜线关联（例题 2 的公式）
    return 1 - 2 * abs(delta) / math.pi

def E_q(delta):                        # 量子余弦关联
    return math.cos(delta)

print(f"经典 S = {round(s_value(E_cl), 4)}")
print(f"量子 S = {round(s_value(E_q), 4)}   （上限 2 被突破！）")
```

量子阵营交出约 **2.389 > 2**：只要实验测出这样的 S，"事前约定"世界观当场出局。真实物理实验（如 1982 年阿斯佩等人及 2015 年后的无漏洞实验）正是这么裁决的，贝尔、克劳泽、阿斯佩、蔡林格因此获 2022 年诺贝尔物理学奖。

### 快问快答

```quiz
测到 S 明显大于 2 意味着什么？
- 实验仪器坏了
- 测量结果之间传递了信号，违反相对论
- 世界无法用"事前约定的隐变量"解释 [*]
? 贝尔不等式的逻辑是排他性的：要么有事前约定（S≤2），要么没有。超过 2 排除的是前者，并不提供超光速通信通道。
```

:::warning[常见误区]

**误区一**："你以为纠缠能用来瞬间传报文。" 两地各自看本地结果都是纯随机序列，相关性要等**打电话对表**（经典信道）之后才浮现——对表本身受光速限制。纠缠放大的是相关性，不是通信带宽。

**误区二**："你以为贝尔态是'两个都藏好了同一个答案'。" 若真藏了答案，S 就不可能超过 2。纠缠强于一切隐藏约定——这正是本课全部计算的意义。

**误区三**："你以为四个基标签 00/01/10/11 是'两位数字'。" 它们是**一个**四维向量的四个坐标轴名字，拆开谈"第一个比特的状态"对纠缠态而言无定义。

:::

## 6. 练习

**练习 1**：初始代码忘了玻恩规则的模平方步骤，打印的是振幅而非概率。修到通过：

```exercise
# @title: 练习：贝尔态的联合概率
# @check: 00 0.5
# @check: 01 0.0
# @check: 10 0.0
# @check: 11 0.5
# @hint: 玻恩规则 = 振幅取模平方；这里是实数，平方即可。
inv_sqrt2 = 1 / 2 ** 0.5
labels = ["00", "01", "10", "11"]    # 四个联合结果的标签，按顺序对应振幅
amps = [inv_sqrt2, 0, 0, inv_sqrt2]

for k in range(4):
    p = amps[k]                      # ← 错在这：直接输出了振幅
    print(labels[k], round(p, 2))
```

期望输出里每行是"标签 + 概率"。初始代码跑起来像模像样，但打印的是振幅——0.71 和 0.0 都不是概率。

<details>
<summary>练习 1 解法</summary>

```python
inv_sqrt2 = 1 / 2 ** 0.5
labels = ["00", "01", "10", "11"]
amps = [inv_sqrt2, 0, 0, inv_sqrt2]
for k in range(4):
    p = float(amps[k]) ** 2    # 先转浮点，保证概率统一打印成 0.5、0.0 这类形式
    print(labels[k], round(p, 2))
```
</details>

**练习 2**：用例 2 的斜线公式，换一组角度（$a=0^\circ, a'=90^\circ, b=45^\circ, b'=135^\circ$）重算经典 $S$。结果如何？说明什么？

<details>
<summary>点开查看逐步解答</summary>

角度差依次为 $45^\circ, 135^\circ, -45^\circ, -45^\circ$，对应：

$$E_{cl}=\ 0.5,\ -0.5,\ 0.5,\ 0.5$$

于是

$$S_{cl}=|0.5-(-0.5)|+|0.5+0.5|=1+1=2$$

又是 2！这不是巧合：**任何**角度组合下经典 $S\le2$（贝尔不等式），个别组恰好顶格。量子阵营在同一组角度下交出

$$S_q=\lvert\cos45^\circ-\cos135^\circ\rvert+\lvert\cos(-45^\circ)+\cos(-45^\circ)\rvert=2\sqrt2\approx2.828$$

——恰好是量子力学全宇宙的**最大越线值**（Tsirelson 界）。想亲手扫描所有角度找最大？把实验 2 的代码套上两层循环即可。
</details>

## 7. 选读：为什么最简隐变量模型是斜线

<details>
<summary>选读 · 三角形面积论证</summary>

沿用例 2 中“按出厂偏振角过检偏器”的阈值判定，两地结果是 ±1 值，密约 λ 均匀随机。关联

$$E(\Delta)=\frac{2}{\pi}\int_0^{\pi} A(\lambda)B(\lambda-\Delta)\,d\lambda$$

关键观察：对固定的 λ，把 B 平移 Δ 相当于在圆上挪动分割点，**符号翻转的区间总长恰为 2Δ**（两段各 Δ），而圆周全长 $2\pi$。于是异号概率 $P_{异}=\frac{2\Delta}{2\pi}=\frac{\Delta}{\pi}$，同号概率 $P_{同}=1-\frac{\Delta}{\pi}$，代入定义：

$$E=P_{同}-P_{异}=1-\frac{2\Delta}{\pi}$$

一条由三角形围出的斜线。而贝尔的天才在于证明：不管合法的 ±1 隐变量判定函数长什么样，CHSH 组合恒不超过 2；这里算的是最能展示几何直觉的代表模型。量子余弦在 $\Delta=\pm\frac{\pi}{8}$ 处的斜率比这条经典斜线更陡，硬是从它的包围圈里探出头去。

</details>

## 8. 下一站

"左边那枚比特自己处于什么状态"对纠缠态没有答案——但账本可以记。下一课升级记账工具：密度矩阵把混合态、纠缠的局部视角与噪声的侵蚀全部纳入一本账。

→ [密度矩阵：混合态的账本](./45-density-matrix.md)
