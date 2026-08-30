---
title: 特征值判决书：稳定性与相图
lesson_id: control/stability-eigenvalues
prereqs:
  - control/state-space-model
  - linalg-advanced/eigenvalues
  - ode/phase-portraits
volume: 5
layer: L9
track:
  - optimization-control
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - eigenvalue-stability-criterion
  - phase-portrait-classification
applications:
  - inverted-pendulum
  - aircraft-dynamics
exits:
  - engineering-cybernetics
---

# 特征值判决书：稳定性与相图

## 1. 从一个场景开始

把扫帚倒立在指尖：稍一歪就倒，怎么扶都白搭。把钟摆挂在钉子上：拨一下晃几圈，最后自己回到最低点。两个都是平衡点，命运却截然相反。

不用一次次试——**算一次特征值，结局立刻宣判**。这一课把第 21 章"特征值=不变方向的缩放因子"翻译成动力系统的生死簿：它也是第 10 课"高增益会不会震荡"之问的最终答案。

## 2. 直觉解释

离散系统的演化是 $x_{k+1} = A x_k$。把初始状态拆到 A 的各个特征方向上：

$$x_0 = c_1 v_1 + c_2 v_2 \quad\Longrightarrow\quad x_k = c_1\,\lambda_1^k v_1 + c_2\,\lambda_2^k v_2$$

每个方向各自乘 $k$ 次 $\lambda_i$：

- $|\lambda_i| < 1$：越乘越小，这个方向**往回缩**（稳定方向）；
- $|\lambda_i| > 1$：越乘越大，这个方向**往外炸**（不稳定方向）；
- $\lambda_i < 0$ 或复数：每步还带翻转/旋转，产生振荡。

所以整个系统的命运由**最大的那个 $|\lambda_i|$** 决定：只要有一个方向出界，整体就不稳定。相图上，这些特征方向就是轨迹汇聚或逃散的"骨架线"。

## 3. 正式定义

对离散系统 $x_{k+1} = Ax_k$：

$$\text{渐近稳定} \iff |\lambda_i(A)| < 1 \quad (\text{对所有特征值})$$

对连续系统 $\dot{x} = Ax$，条件换成实部：

$$\text{渐近稳定} \iff \operatorname{Re}\lambda_i(A) < 0$$

下面的迹-行列式分类表描述连续相图 $x'=Ax$；离散系统的渐近稳定仍按上面的模长判决。二维连续系统按迹 $\tau = a+d$ 与行列式 $\Delta = ad-bc$ 分类（判别式 $\tau^2 - 4\Delta$）：

| 判别 | 分类 | 相图长相 |
| --- | --- | --- |
| $\Delta>0,\ \tau<0$ | 稳定结点 | 轨迹从四面八方汇入原点 |
| $\Delta>0,\ \tau>0$ | 不稳定结点 | 轨迹被推离原点 |
| $\Delta<0$ | 鞍点 | 一个方向吸、一个方向吐 |
| 判别式 $<0,\ \tau<0$ | 稳定螺旋 | 边转边缩进去 |
| 判别式 $<0,\ \tau=0$ | 中心 | 一圈一圈永远转 |

## 4. 分步例题

**例 1（不稳定）**：$A=\begin{bmatrix}1.4 & 0.4\\ -0.4 & 0.4\end{bmatrix}$

1. 迹与行列式：$\tau = 1.4 + 0.4 = 1.8$，$\Delta = 1.4\times0.4 - 0.4\times(-0.4) = 0.56 + 0.16 = 0.72$；
2. 特征方程 $\lambda^2 - \tau\lambda + \Delta = 0$ 即 $\lambda^2 - 1.8\lambda + 0.72 = 0$；
3. 判别式 $3.24 - 2.88 = 0.36$，开方得 0.6；
4. $\lambda_{1,2} = (1.8 \pm 0.6)/2 = 1.2,\ 0.6$；
5. 判决：$|1.2| > 1$ → **不稳定**。虽然 0.6 方向拼命收缩，1.2 方向照样把它甩出去。

**例 2（鞍点）**：$A=\begin{bmatrix}1.5 & 0\\ 0 & 0.5\end{bmatrix}$

$\lambda = 1.5, 0.5$。横轴方向每次放大一半再放大……不，放大 1.5 倍跑路；纵轴方向每步减半回家。只有恰好落在纵轴上的初值能回到原点，其余全部沿横轴逃逸——这就是"先吸后吐"的鞍点。

## 5. 动手实验

### 实验 1：相图实验室

拖动白点换初始状态，拖动滑块改矩阵。默认参数是连续系统的稳定结点；试试让 $\tau > 0$ 变成不稳定结点，再把判别式调负看螺旋：

```viz
{
  "type": "phase-portrait",
  "title": "x' = Ax 的相图：紫箭头速度场，绿线不变方向",
  "matrix": [-0.8, 0.3, 0, -0.9],
  "x0": 1.5,
  "y0": 0.2
}
```

左上角实时显示分类（stable node / saddle / spiral…）。找到一组参数让分类变成 `saddle`，再用白点验证：是不是只有贴着绿线的初值才回得了家？

### 实验 2：数值迭代看模态此消彼长

```python title="沿两个特征方向分别演化 20 步"
import math

lam_stable = 0.6     # 例 1 的收缩方向
lam_unstable = 1.2   # 例 1 的发散方向

c1, c2 = 1.0, 0.01   # 初值在两个方向上的分量
for k in [0, 5, 10, 15, 20]:
    part_stable = c1 * lam_stable ** k      # ** 幂运算：0.6 的 k 次方
    part_unstable = c2 * lam_unstable ** k
    print(f"k={k:2d}: 收缩分量={part_stable:.6f}, 发散分量={part_unstable:.6f}")

verdict = max(abs(lam_stable), abs(lam_unstable))   # max：取两者较大值
print(f"|λ| 最大值 = {verdict} → " + ("稳定" if verdict < 1 else "不稳定"))
```

收缩分量 20 步后只剩亿分之一，可发散分量哪怕起点只有 0.01 也翻了 30 多倍。**稳定性是短板决定的全局属性**——这正是控制工程"一个方向失稳全盘皆输"的数学出处。

### 实验 3：判题小练兵

```exercise
# @title: 练习：给矩阵写判决书
# @check: 1.2
# @check: 0.6
# @check: 不稳定
# @hint: 行列式是主对角线乘积减副对角线乘积（ad-bc），别把元素配错对；判决标准是所有 |λ| 都小于 1。
a, b, c, d = 1.4, 0.4, -0.4, 0.4
import math  # sqrt：解特征方程判别式的平方根

tr = a + d                       # 迹 = 对角线之和
det = a * c - b * d              # ← 问题在这：行列式的四个元素配错了对
disc = math.sqrt(tr * tr - 4 * det)
lam1 = (tr + disc) / 2
lam2 = (tr - disc) / 2
print(round(lam1, 2))
print(round(lam2, 2))

if abs(lam1) < 1 and abs(lam2) < 1:
    print("稳定")
else:
    print("不稳定")
```

修好之后把矩阵改成 `[0.8, 0.3, 0.0, 0.9]` 再跑一遍：迹 1.7、积 0.72、判别式 0.01，两个模都小于 1。注意别把它直接塞回实验 1 的连续相图：同一个数字矩阵在 $x'=Ax$ 里是不稳定结点，在离散差分里却会让状态衰减——判决表不能串用。

## 常见误区

:::warning[常见误区]

**误区一**："特征值为负就是不稳定。"
连续系统只看实部符号：$\operatorname{Re}\lambda<0$ 是好事（衰减），虚部带来的是振荡而不是发散。离散系统则看模长。两张判决表别串门。

**误区二**："只要有一个稳定方向就安全。"
例 1 已经演示：0.6 方向缩得再快，1.2 方向照样接管一切。稳定性要求**全体**特征值合格。

**误区三**："非对称矩阵没有特征值可用。"
实矩阵的特征值可能成对出现为共轭复数 $a \pm bi$——它们对应螺旋模态，判据照用（模长/实部）。真正麻烦的是亏损矩阵（特征向量不够用），那属于选读级话题。

:::

## 6. 练习

**练习 1**：判断下列矩阵（离散系统）是否稳定：
(a) $\begin{bmatrix}0.9 & 0.2\\ 0 & 0.95\end{bmatrix}$；(b) $\begin{bmatrix}-1.1 & 0\\ 0 & 0.5\end{bmatrix}$。

<details>
<summary>点开查看逐步解答</summary>

(a) 三角矩阵特征值就在对角线上：0.9 与 0.95，全部小于 1 → 稳定。
(b) 特征值 −1.1 与 0.5。$|-1.1| = 1.1 > 1$ → 不稳定。注意 −1.1 每步还会**翻一次号**：轨迹在轴两侧来回跳着变大。
</details>

**练习 2**：第 10 课说一阶闭环增益越大越好。现在给对象加一个惯性（二阶）：$A=\begin{bmatrix}0 & 1\\ -(g) & 2.0\end{bmatrix}$ 形如弹簧-阻尼系统。取增益使 $g=0.6$，判断稳定性；再取 $g=1.2$ 比较。

<details>
<summary>点开查看逐步解答</summary>

$\tau = 2.0$ 固定，$\Delta = g$。
$g=0.6$：判别式 $4 - 2.4 = 1.6 > 0$，两正根，大的那个 $(2+\sqrt{1.6})/2 \approx 1.63 > 1$ → 不稳定。
$g=1.2$：判别式 $4 - 4.8 = -0.8 < 0$，特征值变复数，实部 $\tau/2 = 1 > 0$（模长 $\sqrt{1.2} \approx 1.10 > 1$）→ 不稳定螺旋。
教训：二阶世界里"猛踩油门"会让惯性反噬——两种增益都翻车，只是死法不同（发散结点 vs 发散螺旋）。高增益不再免费，必须配 D（刹车）或重新设计回路，这正是下一课 PID 登场的理由。
</details>

**练习 3**：中心型矩阵 $\begin{bmatrix}0 & 1\\ -1 & 0\end{bmatrix}$ 的特征值是多少？它稳定吗？

<details>
<summary>点开查看逐步解答</summary>

$\lambda^2 + 1 = 0$ → $\lambda = \pm i$，模长恰为 1。轨迹绕原点转圈既不散也不聚——李雅普诺夫（Lyapunov）意义下"稳定但非渐近稳定"。无摩擦单摆的理想化模型就是这样。
</details>

## 7. 选读：迹-行列式平面一张图

<details>
<summary>选读 · 把分类表画成地图</summary>

以 $\tau$ 为横轴、$\Delta$ 为纵轴：抛物线 $\Delta = \tau^2/4$ 上方是复特征值区（螺旋/中心），下方是实特征值区（结点/鞍点）；$\Delta < 0$ 整片是鞍点；纵轴左侧（$\tau<0$ 且 $\Delta>0$）是稳定区。设计控制器时，工程师脑子里就揣着这张地图：反馈的作用是把 $(\tau, \Delta)$ 这枚图钉从危险区搬进左半平面。连续系统的对应版本是"搬到左半平面 $\operatorname{Re}\lambda<0$"，奈奎斯特图（第 60 章）会给出频率域的同款判决。

</details>

## 8. 下一站

判决书能告诉你"会不会稳"，但没告诉你"怎么调到稳"。工程上最常用的三味药——比例、积分、微分——各有分工又互相牵制，它们的配伍之道就是 PID 控制。

→ [PID 控制：三股力量的分工](./40-pid-control.md)
