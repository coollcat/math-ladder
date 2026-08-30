---
title: 测量与玻恩规则
lesson_id: quantum-information/measurement-born
prereqs:
  - quantum-information/qubit
  - prob/law
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
  - born-rule
  - wavefunction-collapse
applications:
  - quantum-computing
  - quantum-cryptography
exits:
  - quantum-information/single-qubit-gates
---

# 测量与玻恩规则

## 1. 从一个场景开始

一台制备机器，每次都吐出**一模一样**的量子比特状态 $\left(\frac{\sqrt3}{2},\ \frac12\right)$。我们造一万台，同时测量，结果：约 7500 个读到 0，约 2500 个读到 1。

输入相同、仪器相同，输出却不同——经典物理里这叫仪器没调好，量子物理里这叫**公理**。随机性不是无知，是自然界的抽签机制本身。这一课讲清两件事：抽签概率由什么决定（玻恩规则），以及抽完之后世界发生了什么（坍缩）。

## 2. 直觉解释

上一课说过振幅不是概率。那概率从哪来？**玻恩规则**一句话：**概率是振幅模的平方**。

把量子状态想成一列水波：振幅像波峰的高度（可正可负可"虚"），而测量像只问"能量多少"——能量正比于高度的平方，符号信息在这一步被抹平。两个波可以相消（振幅抵消），但能量不会为负。

- 振幅 $\frac{\sqrt3}{2}$ → 概率 $\frac34$；
- 振幅 $-\frac12$ → 概率同样是 $\frac14$：负号在模平方里蒸发。

**坍缩**则是抽签之后的事：一旦读到 0，这个量子比特就**变成**了 $\lvert 0\rangle$——原来叠加里的另一半信息当场湮灭，不可恢复。测量既是读数，也是改写。

## 3. 正式定义

**玻恩规则**：对状态 $\lvert\psi\rangle=\alpha\lvert0\rangle+\beta\lvert1\rangle$，在基 $\lbrace\lvert0\rangle,\lvert1\rangle\rbrace$ 下测量：

$$P(0)=\lvert\alpha\rvert^2,\qquad P(1)=\lvert\beta\rvert^2$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $P(0)$ | 结果为 0 的概率 | 等于第一个振幅的模平方 |
| $\lvert x\rangle\langle x\rvert$ | 投影 | 测量在几何上是"投影到基方向再量长度" |
| 坍缩 | — | 测得 $x$ 后状态变为 $\lvert x\rangle$ |

两条铁律：

1. **归一化保证合法性**：$\lvert\alpha\rvert^2+\lvert\beta\rvert^2=1$ 恰好让两个概率加起来等于 1——这就是上一课归一化条件的物理身份；
2. **重复测量不变**：坍缩之后再测同一个量子比特，永远得到同一个结果（已经是 $\lvert0\rangle$ 了，按规则 $P(0)=1$）。随机只发生一次。

## 4. 分步例题

**例**：状态 $\lvert\psi\rangle=\frac{\sqrt3}{2}\lvert0\rangle+\frac12\lvert1\rangle$，预测 10000 次测量的统计结果。

1. 第一个振幅 $\alpha=\frac{\sqrt3}{2}$，模平方 $P(0)=\frac34=0.75$；
2. 第二个振幅 $\beta=\frac12$，模平方 $P(1)=\frac14=0.25$；
3. 验证归一化：$0.75+0.25=1$ ✓；
4. 大数定律（第 9 章）背书：10000 次独立重复测量中，出现 0 的频率会贴近 0.75——预计约 7500 次；
5. 但**单次**测量前无法预言具体哪一次是 0：玻恩规则只管分布，不管命运。

## 5. 动手实验

先在网页里看两条互补的概率曲线：随参数 θ 变化，$P_0=\cos^2\frac{\theta}{2}$ 与 $P_1=\sin^2\frac{\theta}{2}$ 此消彼长、总和恒为 1：

```viz
{
  "type": "plot",
  "title": "互补概率：此消彼长，总和恒为 1",
  "expr": "(cos(x/2))^2",
  "expr2": "(sin(x/2))^2",
  "xmin": 0,
  "xmax": 6.28
}
```

### 实验 1（python）：一万次抽签模拟

```python title="模拟玻恩规则的抽签"
import random
import math

p0 = 3 / 4                      # 例题状态给出的理论概率
n = 10000
count0 = 0
for trial in range(n):
    if random.random() < p0:    # random.random()：返回 [0,1) 均匀小数；小于 p0 就当抽到 0
        count0 = count0 + 1

print(f"理论 P(0) = {p0}")
print(f"实验频率 = {count0 / n}")   # 每次跑都会略有不同，但都贴着 0.75
```

每次运行数字都不同——这正是要点：**模拟复现的是分布，不是命运**。频率与理论的偏差通常在 1% 以内，样本越大越贴近（大数定律）。

### 实验 2（python）：三个状态的频率对比条形图

```python title="理论概率 vs 万次模拟频率"
import random
import math
import matplotlib.pyplot as plt

states = [
    ("A", math.sqrt(3) / 2, 0.5),        # (√3/2, 1/2)
    ("B", 1 / math.sqrt(2), 1 / math.sqrt(2)),   # 五五开
    ("C", 0.6, 0.8),
]
labels = []
theory = []
empirical = []
for name, alpha, beta in states:
    p0 = alpha ** 2                       # 实振幅：模平方就是普通平方
    labels.append(name)
    theory.append(p0)
    hits = 0
    for trial in range(10000):
        if random.random() < p0:
            hits = hits + 1
    empirical.append(hits / 10000)

pos = range(len(states))
width = 0.35   # 条宽：错开画两组柱子做对比
plt.bar([p - width / 2 for p in pos], theory, width, label="theory")
plt.bar([p + width / 2 for p in pos], empirical, width, label="simulated")
plt.xticks(list(pos), labels)   # 给横轴刻度换名字
plt.ylim(0, 1)
plt.legend()
```

三组柱子几乎齐平：万次抽签忠实兑现了玻恩规则。把代码里的 10000 改成 100 再跑一次——柱子开始参差，这是抽样噪声在提醒你样本量的分量。

### 快问快答

```quiz
对一个处于叠加态的量子比特测得 0 之后，立刻再测一次，结果是？
- 再次随机，五五开
- 一定还是 0 [*]
- 一定是 1
? 第一次测量已经让状态坍缩成 |0>，按玻恩规则此后 P(0)=1。随机只有第一次。
```

:::warning[常见误区]

**误区一**："你以为可以直接拿 α 当概率用。" $\left(\frac{1}{\sqrt2},-\frac{1}{\sqrt2}\right)$ 的第一个振幅约等于 0.707，若直接当概率用，两个"概率"加起来 1.414 > 1，直接穿帮。必须先取模平方。

**误区二**："你以为测量只是'看了一眼'，不惊动系统。" 在量子世界里，测量是与仪器的物理相互作用，必然扰动状态——坍缩不是技术的粗糙，是原理的一部分。

**误区三**："你以为单次测量就能检验概率。" 检验分布需要**重复制备同一状态**测很多次。"这一次为什么是 0"没有更深层答案可挖。

:::

## 6. 练习

**练习 1**：初始代码犯了"把振幅直接当概率"的典型错误，能跑但结果荒谬。修到通过：

```exercise
# @title: 练习：从振幅到概率再到次数
# @check: 0.36
# @check: 0.64
# @check: 360
# @hint: 玻恩规则要先把每个振幅取模平方（实数就是平方），得到概率后再乘总次数。
alpha = 0.6 + 0j
beta = 0.8 + 0j
shots = 1000

p0 = round(abs(alpha), 2)          # ← 错在这：忘了平方
p1 = round(abs(beta), 2)
print(p0)
print(p1)
print(int(shots * p0))             # int()：把小数截断取整
```

<details>
<summary>练习 1 解法</summary>

```python
alpha = 0.6 + 0j
beta = 0.8 + 0j
shots = 1000
p0 = round(abs(alpha) ** 2, 2)
p1 = round(abs(beta) ** 2, 2)
print(p0)
print(p1)
print(int(shots * p0))
```
</details>

**练习 2**：状态 $\lvert\psi\rangle=\frac{1+i}{2}\lvert0\rangle+\frac{1-i}{2}\lvert1\rangle$。测量结果的分布是什么？和"实数版" $\left(\frac{1}{\sqrt2},\frac{1}{\sqrt2}\right)$ 的分布比较。

<details>
<summary>点开查看逐步解答</summary>

两个振幅的模都是 $\frac{\sqrt2}{2}$，所以 $P(0)=P(1)=\frac12$——与实数版完全相同的**分布**。

这正是全局相位与相对相位的分界线示例：本例中两个振幅的相对相位变了，但在这个特定基底下测不出差别。差别要等门（下一课）介入后才会显形——相位是潜在的干涉资源。
</details>

## 7. 选读：投影语言下的玻恩规则

<details>
<summary>选读 · 为什么公式长成 |⟨x|ψ⟩|²</summary>

记 $\langle0\rvert\psi\rangle$ 为状态在 $\lvert0\rangle$ 方向上的内积分量（第 11 章投影系数的狄拉克写法）。对归一化状态，这个复数的模正是"状态里含多少 $\lvert0\rangle$"的度量：

$$P(0)=\lvert\langle0\rvert\psi\rangle\rvert^2$$

展开验证：$\langle0\rvert\psi\rangle=\alpha$（基的正交性吃掉 $\beta$ 项），公式退化为 $\lvert\alpha\rvert^2$。写成内积形式的好处是**换基不改规则**：无论沿哪个正交基测量，都是"内积取模平方"。这套语言在第 21 章谱定理处达到完满——测量算符的本征基就是所有可能的"提问方式"。

</details>

## 8. 下一站

测量只能被动读签，量子计算的力量在于**主动改写签筒**：用矩阵对状态做变换，让概率流向对我们有利的出口。这些矩阵就是量子门。

→ [单比特门与矩阵表示](./30-single-qubit-gates.md)
