---
title: 量子比特与叠加
lesson_id: quantum-information/qubit
prereqs:
  - linalg/basis
  - complex/polar
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
  - qubit
  - superposition
  - global-phase
  - bloch-sphere
applications:
  - quantum-computing
exits:
  - quantum-information/measurement-born
---

# 量子比特与叠加

## 1. 从一个场景开始

抛一枚硬币，落定前用手掌盖住——它是正面还是反面？你可以说"它已经是其中之一，只是我不知道"。量子力学请你想得更野一点：一枚**旋转中的硬币**在被掀开之前，谈论"它到底是哪面"可能根本没有意义——它处于两者的**叠加**里，掀开的瞬间才"抽签定型"。

量子计算机的最小信息单元**量子比特**（qubit）就是这样一枚永不落定的硬币。本课不碰任何物理实验设备：一个量子比特就是一个二维复向量，叠加就是向量加法。第 12 章的复数和第 11 章的基，在这里合流。

## 2. 直觉解释

先把经典比特摆上台面：它只有两个状态，0 或 1，像开关只能开或关。用第 11 章的语言，这两个状态可以写成两个基向量：

- $\lvert 0\rangle = \begin{pmatrix}1\\0\end{pmatrix}$，$\lvert 1\rangle = \begin{pmatrix}0\\1\end{pmatrix}$

量子比特的关键升级是：**它的状态可以是这两个基向量的任意"复数加权混合"**，只要混合之后总长度为 1。比如

$\begin{pmatrix}0.6\\0.8\end{pmatrix}$ 既不是 $\lvert 0\rangle$ 也不是 $\lvert 1\rangle$，而是一个合法的新状态——这就是**叠加**。

几何图像：把所有合法状态画出来，恰好是一个球的表面——**布洛赫球**（Bloch ball）。北极是 $\lvert 0\rangle$，南极是 $\lvert 1\rangle$，赤道上是各种"五五开"的均匀叠加。经典比特只有南北两个点可选；量子比特拥有整个球面。

## 3. 正式定义

**狄拉克记号**（Dirac notation）：$\lvert 0\rangle$ 读作"右矢 0"，本质就是列向量；$\langle\psi\rvert$（左矢）是它的共轭转置，两者拼成内积 $\langle\phi\rvert\psi\rangle$（第 21 章的内积穿上新衣裳）。

**量子比特**：一个量子比特的状态是二维复内积空间中的单位向量：

$$\lvert\psi\rangle=\alpha\lvert 0\rangle+\beta\lvert 1\rangle,\qquad \lvert\alpha\rvert^2+\lvert\beta\rvert^2=1$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\alpha,\beta$ | 振幅 | 复数，不是概率（区别在下一课爆发） |
| $\lvert\alpha\rvert$ | 振幅的模 | 复数的"长度"，第 12 章的定义 |
| 归一化条件 | — | 两个模平方之和为 1 |
| 全局相位 | $e^{i\varphi}$ 因子 | 整体转一圈，物理不变 |

**全局相位**：$\lvert\psi\rangle$ 与 $e^{i\varphi}\lvert\psi\rangle$（整体乘同一个单位复数）视为**同一个物理状态**——就像把整张照片统一调亮一档，画面内容没变。真正有物理效应的是两个振幅之间的**相对**相位。

## 4. 分步例题

**例 1**：判断 $(3, 4)$（实振幅）能否成为量子比特状态，若不能请修正。

1. 检查归一化：$3^2+4^2=25\neq 1$，太长了，不合格；
2. 除以总长度 $\sqrt{25}=5$：得 $(3/5,\ 4/5)$；
3. 复查：$(3/5)^2+(4/5)^2=9/25+16/25=1$ ✓ 合法；
4. 它的含义先按下不表——"测量时会怎样"正是下一课的主题。

**例 2**：验证 $\left(\dfrac{1+i}{2},\ \dfrac{1-i}{2}\right)$ 是合法状态。

1. 第一个振幅的模：$\lvert(1+i)/2\rvert=\sqrt{2}/2$，模平方为 $1/2$；
2. 第二个振幅的模：$\lvert(1-i)/2\rvert=\sqrt{2}/2$，模平方也是 $1/2$；
3. 相加得 1 ✓ 合法；
4. 注意它和"实数版"$\left(\frac{\sqrt2}{2},\frac{\sqrt2}{2}\right)$ 模平方完全相同——但相对相位不同，后续遇上门的操作时分道扬镳。

## 5. 动手实验

先玩网页组件：左图是振幅所在的复平面（拖动紫点，注意模长读数），右图是单位圆上的相位角——全局相位转再多圈，也只是"原地转圈"：

```viz
{ "type": "complexplane", "title": "一个振幅的复平面肖像：模长才是要紧量", "z": [0.6, 0.8] }
```

```viz
{ "type": "unitcircle", "title": "全局相位：转圈不改变身份" }
```

### 实验 1（python）：用"实部虚部对"装配量子比特

```python title="归一化检查器"
import math

# 一个量子比特状态用两个复数表示：Python 原生支持复数，1j 就是虚数单位 i
state = [3 + 0j, 4 + 0j]

# abs() 用在复数上返回它的模（第 12 章的定义：sqrt(实部^2 + 虚部^2)）
norm_sq = abs(state[0]) ** 2 + abs(state[1]) ** 2   # 模平方之和
print(f"归一化前模平方和 = {norm_sq}")

length = math.sqrt(norm_sq)          # 向量总长度
normalized = [state[0] / length, state[1] / length]
print(f"归一化后: α={normalized[0]}, β={normalized[1]}")
new_norm = abs(normalized[0]) ** 2 + abs(normalized[1]) ** 2
print(f"归一化后模平方和 = {round(new_norm, 6)}")
```

### 实验 2（python）：布洛赫球的剖面地图

布洛赫球常用参数化：$\lvert\psi\rangle=\cos\frac{\theta}{2}\lvert 0\rangle+e^{i\varphi}\sin\frac{\theta}{2}\lvert 1\rangle$。拖动滑块看状态箭头如何从北极扫向南极：

```python title="布洛赫球 x-z 剖面：θ 扫描"
import math
import matplotlib.pyplot as plt

# sliders: theta_deg=60 [0:180:15]

th = math.radians(theta_deg)   # 度转弧度（三角函数只认弧度）
phi = 0.0                      # 本图锁定经度 φ=0，只看剖面

fig, ax = plt.subplots(figsize=(5, 5))
circle = plt.Circle((0, 0), 1, fill=False, color="lightgray")   # 画半径 1 的圆当球剖面轮廓
ax.add_patch(circle)

a = math.cos(th / 2)                       # 北极方向的权重
b = math.sin(th / 2) * (math.cos(phi) + 1j * math.sin(phi))   # 南极方向的权重（带相位）
x = 2 * (a * b.conjugate()).real           # 布洛赫矢量 x 分量（标准公式）
z = a ** 2 - abs(b) ** 2                   # z 分量：北极 1、南极 -1

ax.axhline(0, color="gray", linewidth=0.5)
ax.axvline(0, color="gray", linewidth=0.5)
ax.annotate("", xy=(x, z), xytext=(0, 0),
            arrowprops=dict(arrowstyle="->", color="purple", lw=2.5))
ax.scatter([0], [1], color="steelblue", s=80)
ax.scatter([0], [-1], color="tomato", s=80)
ax.text(0.06, 1.02, "|0> 北极", fontsize=10)
ax.text(0.06, -1.14, "|1> 南极", fontsize=10)
ax.set_title(f"θ={theta_deg}°  α={round(a,3)}  β={round(b.real,3)}", fontsize=10)
ax.set_xlim(-1.3, 1.3)
ax.set_ylim(-1.3, 1.3)
ax.set_aspect("equal")   # 横纵比例一致，圆不被压扁
```

θ=0° 时箭头竖直向上（纯 $\lvert 0\rangle$）；θ=90° 时斜着指向"五五开"叠加；θ=180° 时倒向南极。经典比特只有两个端点，量子比特占满整条直径扫出的球面。

### 快问快答

```quiz
下面哪个说法正确？
- 叠加态就是"一半是 0 一半是 1"
- 叠加态是两个基向量的复数加权组合，权重可以任意（只要归一化） [*]
- 叠加态是一种测量误差
? 权重 α、β 可以是任何满足归一化的复数，"五五开"只是众多叠加中的一个特例。
```

:::warning[常见误区]

**误区一**："你以为 α 和 β 就是概率。" 它们是**复数振幅**，可以为负、可以为虚——这正是干涉的火种。概率要到下一课才登场：先取模平方。现在只需记住：振幅能做的事比概率多得多。

**误区二**："你以为 $(1,0)$ 和 $(i,0)$ 是两个不同的量子比特。" 整体相差一个单位模复数叫全局相位，物理上完全不可区分。可区分的是**相对**相位——两个振幅之间的夹角。

**误区三**："你以为叠加意味着比特'同时是 0 和 1'各存一份。" 叠加是一个**全新的单一状态**，好比琴弦上同时存在的基音与泛音合成一个波形，而不是"两根弦"。

:::

## 6. 练习

**练习 1**：下面的初始代码能跑，但归一化方法错了——它把模**直接相加**而不是按平方和开根号。修到输出正确为止：

```exercise
# @title: 练习：修复归一化
# @check: 0.36
# @check: 0.64
# @hint: 总长度应按 sqrt(α模平方 + β模平方) 计算；概率是"归一化后再取模平方"。
alpha = 3 + 0j
beta = 4 + 0j

total = abs(alpha) + abs(beta)             # ← 错在这：长度不是模的普通相加
p0 = round((abs(alpha) / total) ** 2, 2)
p1 = round((abs(beta) / total) ** 2, 2)
print(p0)
print(p1)
```

<details>
<summary>练习 1 解法</summary>

```python
alpha = 3 + 0j
beta = 4 + 0j
length = (abs(alpha) ** 2 + abs(beta) ** 2) ** 0.5   # 先平方求和，再开根号
p0 = round((abs(alpha) / length) ** 2, 2)
p1 = round((abs(beta) / length) ** 2, 2)
print(p0)
print(p1)
```
</details>

**练习 2**：下列哪些是合法的量子比特状态？先自己判断，再点开核对。

- 甲：$(2, 0)$；乙：$\left(\frac{1}{\sqrt2}, -\frac{1}{\sqrt2}\right)$；丙：$\left(\frac{i}{\sqrt2}, \frac{-i}{\sqrt2}\right)$

<details>
<summary>点开查看逐步解答</summary>

- 甲：$2^2+0=4\neq1$，未归一化，**不合法**（除非除以 2）；
- 乙：两个模都是 $1/\sqrt2$，模平方各 $1/2$，和为 1，**合法**。负号是相对相位 $\pi$，将来会被 Z 门利用；
- 丙：模同样各为 $1/\sqrt2$，**合法**。这里的相对相位是 $-i/i=-1$……等等，两振幅之比为 $-1$，所以丙和乙其实是**同一个物理状态**（只差全局相位 $i$）！

用 Python 快速验算丙：

```python
import math

alpha = 1j / math.sqrt(2)   # i/√2
beta = -1j / math.sqrt(2)   # -i/√2
print(round(abs(alpha) ** 2 + abs(beta) ** 2, 6))
```

</details>

## 7. 选读：为什么必须是复数

<details>
<summary>选读 · 实数振幅不够用吗</summary>

如果只用实数振幅，叠加照样能定义、概率照样能凑出——早期物理学家确实这么试过。真正的分水岭是**相位操作**：量子计算需要一种门，能把某个振幅乘上 $-1$ 或 $i$ 来制造"此消彼长"的干涉，而实数世界里"乘 $i$"无处安放。

更深的理由来自相对论与演化方程的匹配（薛定谔方程里 $i$ 是主角），那超出本课范围。这里记住结论：**复数不是装饰，是让"干涉"这门武功可以施展的内力**。第 12 章那句"复数乘法＝旋转＋伸缩"在这里兑现：量子门对振幅做的，恰恰就是旋转与伸缩。

</details>

## 8. 下一站

状态备好了，怎么"读出"它？测量是量子世界最奇特的一步：结果随机、读完即毁。概率公式长什么样、为什么说"振幅的模平方"，下一课给出量子力学的抽签规则。

→ [测量与玻恩规则](./20-measurement-born.md)
