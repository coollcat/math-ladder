---
title: 协方差的几何：SPD 流形上的脑电分类
lesson_id: bci/spd-manifold
prereqs:
  - bci/eeg-csp
  - differential-geometry/riemann-metric-manifold
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 7
layer: L10
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 5
introduces_concepts:
  - spd-manifold
  - affine-invariant-metric
  - geodesic-midpoint
  - riemannian-eeg-classifier
applications:
  - riemannian-eeg-decoding
  - brain-computer-interface
exits:
  - research
  - data-ai
---

# 协方差的几何：SPD 流形上的脑电分类

## 1. 从一个场景开始

上一课我们拿两类协方差矩阵 $\Sigma_1$、$\Sigma_2$ 求广义特征向量。现在要做一个看起来更简单的操作：**把同一个受试者两段试次的协方差平均一下**，好让估计更稳。

怎么平均？最自然的做法是逐元素相加除以二。可这个"平均矩阵"有个古怪的毛病：它的**行列式比两头的都大**。协方差的行列式是什么？是各方向方差撑出的"体积"——体积凭空变大，意味着你造出了一个**谁都不像**的协方差：既不是甲，也不是乙，而是一个被吹胀的冒牌货。用了几十次试次平均出来的"模板"，反而比单个试次更离谱。

问题出在一个我们平时从不留意的假设上：**协方差矩阵不住在平直空间里**。它住在一个弯曲的空间——**对称正定矩阵流形**——在那里，"直线"和"平均"都要重新定义。

## 2. 直觉解释

先看 $1\times 1$ 的退化情形：$1\times 1$ 的 SPD 矩阵就是一个正数（方差）。两个方差 1 和 4，"平均"是多少？

- **算术平均**：$(1+4)/2 = 2.5$；
- **几何平均**：$\sqrt{1\times 4} = 2$。

哪个更像"平均"？想象你在比较两台设备的噪声：甲是乙的 $\times 4$，乙是甲的 $\div 4$。用算术平均，得到的 2.5 离 4 只有 1.5，离 1 却有 1.5——嗯，差不多。但换成"甲比乙大 4 倍"，算术平均给出的 2.5 是"甲比平均大 1.6 倍、平均比乙大 2.5 倍"，**两边的倍数根本不对称**。几何平均给出 2：甲是它的 2 倍，它是乙的 2 倍——**左右完全对称**。

方差是"能量的尺度"，天然是乘性的。所以正确的平均应该在**取对数之后**做：$\exp\left(\frac{\ln 1 + \ln 4}{2}\right) = 2$。

把这个想法推到矩阵上，就得到整章的骨架：**先把矩阵搬到"对数坐标"里，在那里做欧氏几何，再搬回来**。而对数坐标里的距离，就是那条著名的**仿射不变度量**。

## 3. 正式定义

### SPD 流形

$\mathcal{P}_n = \left\lbrace A\in\mathbb{R}^{n\times n} : A = A^{\mathsf{T}},\ A \succ 0 \right\rbrace$。它是 $\mathbb{R}^{n(n+1)/2}$ 里的一个**开凸锥**（不是子空间：两个 SPD 矩阵之差未必 SPD）。

### 仿射不变度量

对 $A, B\in\mathcal{P}_n$，定义

$$d\!\left(A, B\right) = \left\lVert \log\!\left(A^{-1/2} B A^{-1/2}\right) \right\rVert_F$$

其中 $A^{-1/2}$ 是 SPD 平方根的逆（对称矩阵谱定理保证存在唯一），$\log$ 是**矩阵对数**，$\lVert\cdot\rVert_F$ 是 Frobenius 范数。它叫"仿射不变"，因为对任意可逆矩阵 $C$：

$$d\!\left(CAC^{\mathsf{T}},\ CBC^{\mathsf{T}}\right) = d\!\left(A, B\right)$$

**这条性质正是脑电需要的**：换一组电极、做一次可逆的空间混合（比如重新参考、或上一课那个 CSP 变换），两点之间的距离不该改变。欧氏距离 $d_E\left(A,B\right) = \lVert A - B\rVert_F$ 完全没有这个性质——换个参考电极，所有距离全变。

### 测地线、几何平均与最近均值分类

$A$ 到 $B$ 的测地线（流形上的"直线"）是

$$A\#_t B = A^{1/2}\left(A^{-1/2}BA^{-1/2}\right)^{t}A^{1/2}, \qquad t\in\left[0,1\right]$$

$t = 1/2$ 给出**几何平均** $A\#B$，它满足两个漂亮的性质：$d\!\left(A, A\#B\right) = d\!\left(A\#B, B\right) = \frac{1}{2}d\!\left(A,B\right)$，且行列式**不再被吹胀**。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\mathcal{P}_n$ | SPD 流形 | $n\times n$ 对称正定矩阵全体，开凸锥 |
| $A^{-1/2}BA^{-1/2}$ | 白化后的 $B$ | 用 $A$ 当"尺子"重新量 $B$，消掉坐标选择的影响 |
| $\log$ | 矩阵对数 | SPD 矩阵的 $\log$ 一定有定义（特征值全正） |
| $A\#B$ | 几何平均 | 测地线中点，$d$ 意义下左右等距 |
| $\operatorname{MDM}$ | 最近均值分类 | 判给距离最小的那个类均值，本课的分类器 |

### $2\times 2$ 的特殊结构

$2\times 2$ 的 SPD 矩阵可以写成一个标量（行列式）乘一个行列式为 1 的矩阵：$A = e^{\tau/2}\tilde{A}$，$\tau = \ln\det A$。可以验证：

$$d\!\left(A,B\right)^2 = 2\,d_{\mathbb{H}}\!\left(z_A, z_B\right)^2 + \frac{1}{2}\left(\tau_A - \tau_B\right)^2$$

其中 $z = \left(b + i\right)/c$ 把 $\tilde{A}$ 送到**上半个平面**，$d_{\mathbb{H}}$ 是双曲距离。也就是说：**$2\times 2$ 的 SPD 流形 = 双曲平面 × 一条直线**，曲率全部住在双曲平面那一半里。本课的实验就是在这块平面上拖点。

## 4. 分步例题

**例**：$A = I$、$B = \operatorname{diag}\!\left(4, 1\right)$。算距离、算几何平均。

**第 1 步 · 白化**：$A^{-1/2} = I$，所以 $A^{-1/2}BA^{-1/2} = \operatorname{diag}\!\left(4,1\right)$。

**第 2 步 · 取对数**：$\log\operatorname{diag}\!\left(4,1\right) = \operatorname{diag}\!\left(\ln 4, \ln 1\right) = \operatorname{diag}\!\left(1.3863, 0\right)$。

**第 3 步 · 取 Frobenius 范数**：

$$d\!\left(I, \operatorname{diag}\!\left(4,1\right)\right) = \sqrt{1.3863^2 + 0^2} = \ln 4 = \mathbf{1.3863}$$

**第 4 步 · 对照欧氏距离**：$\lVert I - \operatorname{diag}\!\left(4,1\right)\rVert_F = \sqrt{9 + 0} = 3.0$。两个数字差了一倍多，而且欧氏那个随"单位换算"变——把电压从 mV 改成 µV，矩阵整体乘 $10^6$，欧氏距离跟着变，仿射不变距离**纹丝不动**。

**第 5 步 · 再算一个纯"体积"的例子**：$\operatorname{diag}\!\left(4,4\right) = 4I$，$\log 4I = \left(\ln 4\right)I$，于是 $d = \sqrt{2\ln^2 4} = \sqrt{2}\ln 4 = 1.9605$。$\sqrt{2}$ 这个因子就是从"两个方向同时膨胀"来的。

**第 6 步 · 几何平均**：$I\#\operatorname{diag}\!\left(4,1\right) = \operatorname{diag}\!\left(\sqrt{1\times 4}, \sqrt{1\times 1}\right) = \operatorname{diag}\!\left(2, 1\right)$。验证两点等距：$d\!\left(I, \operatorname{diag}\!\left(2,1\right)\right) = \ln 2$，$d\!\left(\operatorname{diag}\!\left(2,1\right), \operatorname{diag}\!\left(4,1\right)\right) = \ln 2$ ✓ 各占一半。

**第 7 步 · 和算术平均比一比**：算术平均是 $\operatorname{diag}\!\left(2.5, 1\right)$。它的行列式 2.5 **大于** 两头的行列式（1 和 4）的几何平均 2。这就是第 1 节说的"体积被吹胀"：$2.5 \gt 2$，多出来的那一块是凭空造的。

## 5. 动手实验

### 实验 1（lab）：在上半个平面里拖测试点

```lab
{
  "type": "bci-spd-manifold",
  "title": "左侧是形状部分（行列式为 1）所在的双曲平面，红点可拖；右侧是 ln det 那一维；背景着色 = 最近均值分类的判定区域",
  "u": 1.6,
  "v": 0.75,
  "tau": 0
}
```

- 背景的**蓝/橙渐变色**就是判定区域：蓝的更靠近类 1 均值、橙的更靠近类 2。灰色的双曲网格线（竖直线 + 以实轴为直径的半圆）是这块空间的"坐标纸"——注意它们**越靠近实轴越挤**，这就是曲率的形状；
- 拖红点在平面上走一圈：读数里的两个距离 $d\!\left(A, A_1\right)$、$d\!\left(A, A_2\right)$ 会告诉你它什么时候换阵营。**分界线不是欧氏垂直平分线**，而是一条向外弯的弧；
- 点按钮「把测试点放到 diag(4,1)」：红点跳到 $z = 2i$ 且 $\ln\det = \ln 4$，读数应给出 $d\left(I, \operatorname{diag}\!\left(4,1\right)\right) = 1.3863$——第 3 步的手算结果在实验里复现；
- 拖 **ln det 滑块**：红点在双曲平面上的位置不动，但判定边界会**跟着滑动**。这是 $2\times 2$ 结构最直观的后果：距离里有两项，改变体积那一项会重新分配"谁更近"；
- 把 ln det 调到和某个类均值一样：此时判定完全由形状（双曲距离）决定，边界退化成两条测地线之间的垂直平分线。

### 实验 2（python）：把 $2\times 2$ 的矩阵对数手写出来

```python
import math                        # 标准库：对数、开方

def det(A):                        # 2x2 行列式
    return A[0][0] * A[1][1] - A[0][1] * A[1][0]

def mul(A, B):                     # 2x2 矩阵乘法
    return [[sum(A[i][k] * B[k][j] for k in range(2)) for j in range(2)] for i in range(2)]

def sqrtm(A):                      # SPD 平方根：sqrt(A) = (A + sqrt(det) I) / sqrt(tr A + 2 sqrt(det))
    s = math.sqrt(det(A))
    t = math.sqrt(A[0][0] + A[1][1] + 2 * s)
    return [[(A[0][0] + s) / t, A[0][1] / t], [A[1][0] / t, (A[1][1] + s) / t]]

def invm(A):                       # 2x2 逆
    d = det(A)
    return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]

def logm(A):                       # 对称正定的矩阵对数（用特征值）
    tr, dt = A[0][0] + A[1][1], det(A)
    g = math.sqrt(tr * tr / 4 - dt)              # 特征值 = tr/2 ± g
    l1, l2 = tr / 2 + g, tr / 2 - g
    if abs(l1 - l2) < 1e-14:
        return [[math.log(l1), 0.0], [0.0, math.log(l1)]]
    a = (math.log(l1) - math.log(l2)) / (l1 - l2)
    b = (l1 * math.log(l2) - l2 * math.log(l1)) / (l1 - l2)
    return [[a * A[0][0] + b, a * A[0][1]], [a * A[1][0], a * A[1][1] + b]]

def dist(A, B):                    # 仿射不变距离 ||log(A^-1/2 B A^-1/2)||_F
    s = sqrtm(A)
    L = logm(mul(invm(s), mul(B, invm(s))))
    return math.sqrt(sum(L[i][j] ** 2 for i in range(2) for j in range(2)))

I2 = [[1.0, 0.0], [0.0, 1.0]]
print(f"d(I, diag(4,1)) = {dist(I2, [[4.0, 0.0], [0.0, 1.0]]):.6f}")
print(f"d(I, 4I)        = {dist(I2, [[4.0, 0.0], [0.0, 4.0]]):.6f}")

# 几何平均 = 测地线中点：两个距离应各占一半
M = [[2.0, 0.0], [0.0, 1.0]]
print(f"d(I, 中点) = {dist(I2, M):.6f}   d(中点, diag(4,1)) = {dist(M, [[4.0, 0.0], [0.0, 1.0]]):.6f}")

# 仿射不变性：随便做个可逆变换，距离不该变
C = [[2.0, 1.0], [0.5, 1.5]]
Ct = [[C[0][0], C[1][0]], [C[0][1], C[1][1]]]
A, B = [[3.0, 1.0], [1.0, 2.0]], [[1.5, -0.4], [-0.4, 2.5]]
print(f"d(A,B) = {dist(A, B):.6f}   d(CAC', CBC') = {dist(mul(mul(C, A), Ct), mul(mul(C, B), Ct)):.6f}")
```

输出会是 `1.386294`、`1.960516`、两个 `0.693147`，以及最后两个**一模一样**的数——仿射不变性在数值上成立。

### 快问快答

```quiz
为什么脑电分类偏爱仿射不变距离，而不是直接把协方差矩阵当向量算欧氏距离？
- 因为欧氏距离计算量太大
- 因为换参考电极、换通道混合方式会整体改变欧氏距离，而仿射不变距离不受影响 [*]
- 因为仿射不变距离总是更小，分类更容易
? 欧氏距离没有不变性：重新参考或做一次可逆空间混合，所有距离全变；仿射不变距离在任意可逆 C 下保持不变，跨设备、跨被试迁移时更稳。
```

::::warning[常见误区]

**误区一**："平均几个协方差矩阵，就是逐元素相加除以个数。"
你以为矩阵求平均和数字求平均一样——算术平均会让**行列式凭空变大**（两支 $\det = 1$ 与 $\det = 4$ 的平均，算术给出 2.5，几何给出 2）。样本越少、通道越多，膨胀越严重。用它当分类模板，等于拿一个谁都不像的矩阵去比对真实试次。

**误区二**："仿射不变距离只是换了个公式，效果差不多。"
你以为两种距离是同一件事的两种写法——欧氏距离**没有不变性**：重新参考、换一组电极、做一次可逆的空间混合，所有距离全变。仿射不变距离在任意可逆 $C$ 下严格不变，这正是它能跨设备、跨被试迁移的根本原因。把矩阵"拉直成向量"再用欧氏方法，丢掉的就是这条性质。

**误区三**："曲率是数学家的玩具，工程上用平直近似就行。"
你以为弯一点无所谓——它带来的不是小数点后的差别，而是**分类器的行为差异**。算术平均的膨胀是系统性的、随维度指数累积的偏差；切空间投影的"切点选在哪里"会直接改变分类边界。这些都不是"近似得差一点"，而是"用错了会坏"。

::::

## 6. 练习

**练习 1**：算 $I$ 与 $\operatorname{diag}\!\left(4,1\right)$ 之间的仿射不变距离。下面的代码算的是**欧氏距离**（把两个矩阵逐元素相减再取 Frobenius 范数），得到 3.0：

```exercise
# @title: 练习：算 SPD 流形上的距离
# @check: 1.3863
# @hint: 先把 B 用 A 白化成 A^(-1/2) B A^(-1/2)，再取矩阵对数、算 Frobenius 范数。这里 A 是单位阵，白化那一步不用做，直接对 B 取对数即可——对角矩阵的对数就是对对角元取对数。
import math                        # 标准库：对数

A = [[1.0, 0.0], [0.0, 1.0]]       # 类 1 的均值协方差（单位阵）
B = [[4.0, 0.0], [0.0, 1.0]]       # 类 2

d = math.sqrt(sum((A[i][j] - B[i][j]) ** 2 for i in range(2) for j in range(2)))  # ← 问题在这
print(f"{d:.4f}")
```

**练习 2**：回答三个问题。(a) 为什么 $d\!\left(I, 4I\right) = \sqrt{2}\ln 4$ 比 $d\!\left(I, \operatorname{diag}(4,1)\right) = \ln 4$ 大？(b) 用算术平均得到的 $\operatorname{diag}\!\left(2.5, 1\right)$ 的行列式是多少，几何平均的呢？(c) 如果把所有矩阵都乘一个常数 $c$（比如把 mV 换成 µV 以外的单位换算），仿射不变距离会怎么变？

<details>
<summary>点开查看逐步解答</summary>

1. (a) $\operatorname{diag}\!\left(4,1\right)$ 只在**一个方向**上膨胀 4 倍，$\log$ 之后是 $\operatorname{diag}\!\left(\ln 4, 0\right)$，范数就是 $\ln 4$；$4I$ 在**两个方向同时**膨胀 4 倍，$\log$ 之后是 $\left(\ln 4\right)I$，两个分量各贡献 $\ln^2 4$，范数是 $\sqrt{2\ln^2 4} = \sqrt{2}\ln 4$。一般地，$d\!\left(A, cA\right) = \sqrt{n}\left|\ln c\right|$（$n$ 是维数）；
2. (b) 算术平均 $\operatorname{diag}\!\left(2.5, 1\right)$ 的行列式是 **2.5**；几何平均 $\operatorname{diag}\!\left(2,1\right)$ 是 **2**。而 $\sqrt{\det I \cdot \det\operatorname{diag}\left(4,1\right)} = \sqrt{4} = 2$——**几何平均恰好保住了行列式**，算术平均把它抬高了 25%。用几十个试次做算术平均，这个膨胀会累积，分类模板会系统性偏离所有真实试次；
3. (c) 距离**不变**。$cA$ 与 $cB$ 的白化结果是 $\left(cA\right)^{-1/2}\left(cB\right)\left(cA\right)^{-1/2} = A^{-1/2}BA^{-1/2}$，$c$ 直接约掉。这条性质意味着：**换一个电压单位、或换一个前置放大器的增益，分类器不用重新训练**——这正是它取代欧氏距离的根本原因。

**为什么几何平均能保住行列式**：$\det\left(A\#B\right) = \sqrt{\det A\cdot\det B}$（因为 $\det$ 把矩阵乘法变成乘法，而测地线中点的指数部分是"特征值开方"）。行列式在 SPD 流形上扮演的是"体积坐标 $\tau = \ln\det$"，而 $\tau$ 那一维的测地线中点当然是算术平均 $\left(\tau_A + \tau_B\right)/2$——对应回去正是几何平均。

</details>

## 7. 选读：从最近均值到切空间，与「膨胀」的代价

<details>
<summary>选读 · MDM、切空间投影与无监督迁移</summary>

**最近均值分类（MDM）** 是 SPD 流形上最朴素的分类器，也是很多脑机接口论文的基线：对每个类，用几何平均把训练试次的协方差汇总成一个类中心 $C_1, C_2$（几何平均有闭式迭代算法，不会像算术平均那样膨胀）；测试时算 $d\!\left(X, C_1\right)$ 与 $d\!\left(X, C_2\right)$，判给更近的那个。整个过程**没有任何可训练参数**，却常常打败调过参的 CSP+LDA——原因就在于它对**协方差本身的几何**是诚实的。

**切空间投影**把流形"拍平"到一点处的切空间，就能接上任意欧氏分类器。在类中心 $C$ 处的投影是

$$\operatorname{Log}_C\!\left(X\right) = C^{1/2}\log\!\left(C^{-1/2}XC^{-1/2}\right)C^{1/2}$$

它把每个 $n\times n$ 矩阵变成一个对称矩阵（$\frac{n(n+1)}{2}$ 维向量），再送进 LDA 或 SVM。有意思的是：**CSP 是这个框架的一个特例**——当切点是单位阵、且只保留对角线时，就退回"对数方差特征"（上一课第 6 步那几个数）。

**"膨胀"的代价有多大**。上面那个 $2.5 \gt 2$ 的例子只是两个矩阵平均。若把 $K$ 个试次做算术平均，行列式的膨胀会随离散度指数增长——粗略地说，$\ln\det\left(\text{算术平均}\right) \approx \frac{1}{K}\sum_k \ln\det X_k + \text{方差项}$，多出来的那一项**恒为正**。这就是为什么"用算术平均算 ERP/协方差模板"在小样本、高维（通道多）时会明显掉精度：维度越高，膨胀越狠。换成几何平均，这一项直接消失。

**无监督迁移**是这套几何最漂亮的应用：换被试、换场次时，各人的协方差整体"漂移"（电极位置、阻抗、当天状态都不同）。做法是**用无标签的目标域数据算一个几何均值 $\bar{C}_{\text{target}}$，再把所有数据（含训练集）用 $\bar{C}_{\text{target}}^{-1/2}$ 白化一次**。因为仿射不变距离在白化下不变，这一步把两个域的分布对齐了，而标签一个都不用。这是黎曼几何在脑机接口里最实战的一条经验——**校准时间从半小时压到几分钟**，靠的就是第 3 节那条不变性。

</details>

## 8. 下一站

到这里，解码链上的数学工具已经齐了：点过程、贝叶斯、卡尔曼、空间滤波、流形几何。但它们都在回答同一个问题——**"看到这些信号，刺激是什么"**。反过来问更有意思：这批神经元**一共能传递多少信息**？一个脉冲值几个比特？这就是信息论登场的地方。

→ [神经编码能传多少比特：互信息与容量](./70-information-rate.md)
