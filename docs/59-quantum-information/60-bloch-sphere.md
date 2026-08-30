---
title: Bloch 球：单量子比特的几何地图
lesson_id: quantum-information/bloch-sphere
prereqs:
  - quantum-information/dirac-inner-product
  - quantum-information/single-qubit-gates
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
  - bloch-vector
  - axis-angle-rotation
applications:
  - quantum-computing
exits:
  - quantum-information/interference-hadamard
---

# Bloch 球：单量子比特的几何地图

## 1. 从一个场景开始

第 10 课见过一句预告："所有合法状态画出来是一个球的表面。"当时只能把它当一句诗读。现在书包里有了 bra-ket，这句诗可以变成一张**正式的地图**：每个量子比特都是一颗星球上的一个点，纬度 $\theta$、经度 $\phi$ 两个角就锁定了它。

这张地图的妙处立刻兑现：上一章那些矩阵门——X、Z、H——在地图上全部长成了**绕某根轴拧某个角度**的动作。代数是账本，几何是航海图；本课把两本对齐。

## 2. 直觉解释

先算一笔参数账。一般状态 $\lvert\psi\rangle=\alpha\lvert0\rangle+\beta\lvert1\rangle$ 里藏着四个实数（α、β 各带实部虚部），但真正的自由度没这么多：

1. 归一化 $\lvert\alpha\rvert^2+\lvert\beta\rvert^2=1$ 划掉一个；
2. 全局相位 $\exp(i\varphi)$ 不改变物理身份，再划掉一个；
3. 剩下 **2 个实数**——恰好是一张球面需要的两个角度：纬度与经度。

所以"两个复数的状态"从来不是四维怪物，而是一个**可以在掌上转动的星球**。北极 $\lvert0\rangle$、南极 $\lvert1\rangle$ 是经典比特仅有的两个驻点；赤道全是五五开的叠加，转一圈经度等于扫过所有相对相位。

## 3. 正式定义

**布洛赫球参数化**：任何单比特态都能写成且只能写成

$$\lvert\psi(\theta,\varphi)\rangle=\cos(\theta/2)\,\lvert0\rangle+\exp(i\varphi)\sin(\theta/2)\,\lvert1\rangle,\qquad \theta\in[0,\pi],\ \varphi\in[0,2\pi)$$

由它派生的**布洛赫矢量**把状态钉到三维坐标上：

| 分量 | 公式 | 读法 |
| --- | --- | --- |
| $x$ | $2\operatorname{Re}(\alpha^*\beta)$，用文字说就是"α 的共轭乘 β，取实部再翻倍" | 沿 x 轴伸出多远 |
| $y$ | $2\operatorname{Im}(\alpha^*\beta)$，同式取虚部再翻倍 | 相位差的正弦账目 |
| $z$ | $\lvert\alpha\rvert^2-\lvert\beta\rvert^2=\cos\theta$ | 纬度计：北极 +1、南极 −1 |

注意那个容易看漏的**半角**：概率用的是 $\cos^2(\theta/2)$ 而 z 坐标用的是整角 $\cos\theta$——同一颗星球，两种刻度。三个分量永远满足 $x^2+y^2+z^2=1$（自己扣自己恒为 1），这就是地图是"球面"而非"球内"的原因。

## 4. 分步例题

**例 1**：把 $(\theta,\varphi)=(120^\circ,\ 0^\circ)$ 的点翻译回振幅。

1. 半角：θ/2 = 60°；
2. $\alpha=\cos60^\circ=1/2$，$\beta=\sin60^\circ=\sqrt3/2$（经度为 0，相位因子取 1）；
3. 概率读出：测得 0 的概率 $=1/4$，测得 1 的概率 $=3/4$ ✓ 和为 1；
4. 纬度核对：$z=\cos120^\circ=-1/2$，负值说明指针已越过赤道偏向南半球。

**例 2**：给上一章的几个门发"几何身份证"。

1. X 门交换南北极 ⇒ 绕 **x 轴转 180°**——名字不是白叫的；
2. Z 门让赤道翻面（只翻 $\lvert1\rangle$ 振幅符号）⇒ 绕 **z 轴转 180°**；
3. H 门把北极送到赤道上经度 0 处 ⇒ 绕"斜轴"(x+z 方向) 转 180°，或者拆成两步读：先 90° 换轴再 180°；
4. 一般规律：**每个单比特酉门＝绕某根过球心直径转某个角的刚体旋转**。矩阵乘法从今天起可以脑补成拧螺丝。

## 5. 动手实验

拖一下下面的曲线就能看到"同球两制"：蓝线是测 0 的概率 $\cos^2\frac{x}{2}$（半角，弯得急），红线是纬度 $z=\cos x$（整角，走得匀）。同一个纬度 θ，两种计量同时读：

```viz
{
  "type": "plot",
  "title": "纬度联动：概率 cos(x/2)^2 与高度 cos(x)",
  "expr": "(cos(x/2))^2",
  "expr2": "cos(x)",
  "xmin": 0,
  "xmax": 3.1416,
  "piAxis": true
}
```

读图要点：θ=90° 处蓝线恰在 0.5（五五开），红线归零（指针躺平在赤道）；θ=0 与 π 两端两条线都封死在两端——经典双点是量子连续谱的特例。注意蓝线是半角函数 $\cos^2(x/2)$、红线是整角函数 $\cos x$，两条曲线同屏对照。

### 实验（python）：赤道巡航——经度 φ 扫描

```python title="锁定纬度 θ=90 度，沿赤道开一圈"
import math
import matplotlib.pyplot as plt

# sliders: phi_deg=30 [0:360:15]

ph = math.radians(phi_deg)   # 经度角转弧度
th = math.pi / 2             # 锁定纬度：θ = 90°，正好躺在赤道上

a = math.cos(th / 2)                                       # α = cos(θ/2)
b = math.sin(th / 2) * (math.cos(ph) + 1j * math.sin(ph))  # β = e^{iφ}·sin(θ/2)

x = round(2 * (a * b.conjugate()).real, 3)   # 共轭打头阵：bra 在前才是合拍的内积
y = round(2 * (a * b.conjugate()).imag, 3)
z = round(a ** 2 - abs(b) ** 2, 3)

fig, ax = plt.subplots(figsize=(5, 5))
circle = plt.Circle((0, 0), 1, fill=False, color="lightgray")
ax.add_patch(circle)
ax.annotate("", xy=(x, y), xytext=(0, 0),
            arrowprops=dict(arrowstyle="->", color="purple", lw=2.5))
ax.set_title(f"x={x}, y={y}, z={z}", fontsize=11)
ax.axhline(0, color="gray", linewidth=0.5)
ax.axvline(0, color="gray", linewidth=0.5)
ax.scatter([x], [y], color="tomato", s=70)
ax.set_xlim(-1.3, 1.3)
ax.set_ylim(-1.3, 1.3)
ax.set_aspect("equal")
```

这是俯瞰视角：屏幕平面就是 x-y 面（z 轴垂直屏幕指向你），紫箭头从球心指向指针落点。拖动滑块时北南方向完全不动——你在做的是**纯经度航行**，也就是绕 z 轴旋转的前半段。

### 快问快答

```quiz
一个经典比特若被画进布洛赫地图，它能停留在哪些点上？
- 整个球面随便逛
- 只能待在南北两极 [*]
- 待在赤道上任意一点
? 经典比特只会取 0 或 1，对应北极与南极；赤道全都是非零相对相位的叠加态，经典世界里没有这个选项。
```

:::warning[常见误区]

**误区一**："你以为纬度 θ 直接就是概率角。" 概率吃的是半角：$\theta=120^\circ$ 时测 1 的概率是 $\sin^260^\circ=\frac34$ 而不是 $\sin^2120^\circ$。差一个除二，天壤之别。

**误区二**："你以为全局相位白费——那经度 φ 是怎么回事？" 全局相位是**整颗星球一起转**（谁也看不见）；经度是**球面上两点之间的相对朝向**（门能看见、干涉能用）。一个是整体平移，一个是内部构造。

**误区三**："你以为只有南北极和赤道合法。" 球面上每一点都是合法量子态，中低纬度只是"不太均匀的叠加"——大多数真实算法恰恰在这些中间纬度行军。

:::

## 6. 练习

**练习 1**：下面这段代码想把态 $\lvert\psi\rangle=\frac{1+i}{2}\lvert0\rangle+\frac{-1+i}{2}\lvert1\rangle$ 投影成布洛赫坐标 $(x,y,z)$。能跑，但它丢了 bra 的镜子工序——修到三个输出都正确为止：

```exercise
# @title: 练习：先共轭，再投影
# @check: 0.0
# @check: 1.0
# @check: 0.0
# @hint: 内积要把 alpha 先 .conjugate() 再去乘 beta；这组振幅模平方恰好各占一半，所以 z 应该是 0。
import math

alpha = (1 + 1j) / 2
beta = (-1 + 1j) / 2

inter = alpha * beta                       # ← 错在这：少了 conjugate 这步镜子
x = round(inter.real * 2, 4)
y = round(inter.imag * 2, 4)
z = round(abs(alpha) ** 2 - abs(beta) ** 2, 4)
print(x)
print(y)
print(z)
```

修好后的落点是 $(0,\ 1,\ 0)$——正好在赤道上、对着 y 轴的方向；这个小球点的经度就是两振幅间的相位差 $\frac{\pi}{2}$。

<details>
<summary>练习 1 解法</summary>

```python
alpha = (1 + 1j) / 2
beta = (-1 + 1j) / 2

inter = alpha.conjugate() * beta   # bra 的镜子工序补上
x = round(inter.real * 2, 4)
y = round(inter.imag * 2, 4)
z = round(abs(alpha) ** 2 - abs(beta) ** 2, 4)
print(x)
print(y)
print(z)
```
</details>

**练习 2**：上一章说 H 门"把北极送到赤道"。请只用地图推理：如果一个门把 $\lvert0\rangle$ 送到赤道经度 0 的点、把 $\lvert1\rangle$ 送到赤道经度 π 的点，它的旋转轴不可能落在哪根坐标轴上？转轴大致指向哪里？

<details>
<summary>点开查看逐步解答</summary>

绕 **z 轴**的任何转动都原地不动南北两极——所以两极被搬去赤道时，z 轴先排除。绕**赤道平面内的轴**（x 或 y 方向）转半圈，会把北极直送南极（X 门就是绕 x 轴的实例），也送不到赤道。两次尝试两头都错，说明答案是折中的：转轴必须与南北连线成 **45° 角**——恰好一半一半时，两极才会双双跌落到赤道上。再由两落点经度分别为 0 与 π 可定出轴向：正是 x、z 两轴正方向合成的对角线（纬度 45°、经度 0）。这正对应第 30 课实验 2 验过的恒等式 $HZH=X$：沿斜轴拧半圈，等价于一次翻转。

一句话记忆：三根坐标轴各管一摊——x 管换人（翻转）、z 管纯相位，而 H 的斜轴专门负责在"极点"和"赤道"之间摆渡。
</details>

## 7. 选读：为什么偏偏是半角

<details>
<summary>选读 · 从球面回到向量的一场换汇</summary>

直觉版答案：测量概率随门的角度走的是**双倍速**。绕 x 轴转 $\pi$ 就完成了南北互换，可过程中每个小转角 $\delta$ 对振幅的贡献按 $\frac{\delta}{2}$ 计入——因为自旋这类二维表示天生是"转两圈才回原样"的旋量结构。写开就是链式法则那一下：

$$P_1=\sin^2\frac{\theta}{2},\qquad \frac{dP_1}{d\theta}=\frac{1}{2}\sin\theta$$

概率变化的峰值出现在赤道（$\theta=90^\circ$）而不是极点，正对应上面 viz 图里蓝线最陡的位置。更深的理由要等群论登场（SU(2) 是 SO(3) 的双层覆盖），此处只留一个钩子：**量子世界的角，几乎都要先除以二才落到你能测量的纸上**。

</details>

## 8. 下一站

地图在手，是时候用它破一桩悬案了：同一个 H 门连敲两次，明明每次都在剧烈搅动振幅，为什么最后一切如初？答案藏在两个字里——干涉。

→ [干涉直觉与 Hadamard 实验](./70-interference-hadamard.md)
