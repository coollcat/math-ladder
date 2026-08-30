---
title: PINN：把物理方程写进损失函数
lesson_id: scientific-ml/pinn
prereqs:
  - pde/heat-equation-1d
  - ode/euler-runge-kutta
  - linalg-advanced/least-squares
volume: 5
layer: L11
track:
  - scientific-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - physics-informed-loss
  - collocation-residual
applications:
  - heat-transfer-surrogate
  - wavefield-reconstruction
exits:
  - engineering
---

# PINN：把物理方程写进损失函数

## 1. 从一个场景开始

一根受热的金属杆，你只有三个温度传感器的读数——数据太稀，拟合出的曲线千奇百怪。但你手里还有另一样东西：热传导方程。它对杆上**每一个点、每一个瞬间**都成立，等于请来一位无处不在的老师。

**物理信息神经网络（PINN）**的思路就一句话：训练模型时，除了"要贴住数据点"，再加一条罚则——"在随机撒下的考位上，不许违反方程"。数据负责局部真相，物理负责全局自洽。

## 2. 直觉解释

普通拟合像只对答案的学生：三个数据点能背出无数条曲线。PINN 像一位既对答案又查步骤的老师：

- **数据损失**：在传感器位置上，预测值与观测值的差（答案错没错）；
- **物理残差**：把模型的预测代入微分方程，两边相减剩多少（步骤违不违规）。残差为零说明这条曲线是方程的合法解。

两个损失加权求和，一起压到最小。于是稀疏的数据被方程"撑开"，填满整个时空域——这正是传统数值格式与机器学习的一次握手。

本课用一个能精确手算的小例子拆开这台机器：不用神经网络，用一族抛物线当"迷你模型"，把损失函数的两个零件逐个看清楚。

## 3. 正式定义

稳态一维细杆的温度 $u(x)$ 满足 $u''(x) = 0$（无内热源），边界条件 $u(0)=0,\ u(1)=1$。

PINN 的总损失：

$$\mathcal{L}(\theta) = \underbrace{\frac{1}{N}\sum_{i=1}^{N}\bigl(u_\theta(s_i) - y_i\bigr)^2}_{\text{数据损失}} + \lambda\,\underbrace{\frac{1}{M}\sum_{j=1}^{M} R(x_j)^2}_{\text{物理损失}}$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\theta$ | 模型参数 | 网络（或本课的多项式系数） |
| $(s_i, y_i)$ | 数据点 | 传感器位置与读数 |
| $R(x)$ | 残差 | 方程左边减右边：$R(x) = u_\theta''(x) - 0$ |
| $(x_j)$ | 配点 | 随机撒的"考点"，只代方程不给答案 |
| $\lambda$ | 物理权重 | 两股力量的汇率 |

真解是 $u(x)=x$。我们取一族自动满足边界条件的候选解（ansatz）：

$$u_a(x) = x + a\,x(x-1)$$

无论 $a$ 取多少，$u_a(0)=u_a(1)=0+0$ 的修正项都消失——边界条件被结构保证，剩下的自由度全靠物理残差去约束。

## 4. 分步例题

对候选解 $u_a$ 逐步验算：

1. 边界检查：$u_a(0) = 0 + a\cdot 0\cdot(-1) = 0$ ✓；$u_a(1) = 1 + a\cdot1\cdot0 = 1$ ✓；
2. 二阶导数：$u_a''(x) = 2a$（$x^2$ 的二阶导是 2，一次项归零）；
3. 残差：$R(x) = 2a - 0 = 2a$，处处相同——参数错了，全杆一起错；
4. 取 $a = 0.1$：残差 0.2，物理损失 $R^2 = 0.04$；取 $a = 0$：残差为 0，正是真解；
5. 结论：物理损失单独就能锁定 $a=0$。若再叠加噪声数据，最优 $a$ 会偏离零——数据与物理开始讨价还价。

## 5. 动手实验

### 实验 1：拖动参数，看候选解向真解收拢

蓝线是候选解 $u_a$，橙色虚线是真解 $u=x$：

```viz
{
  "type": "plot",
  "title": "候选解 u=x+a·x(x-1)，边界自动满足，斜率随 a 变",
  "expr": "x + a*x*(x - 1)",
  "expr2": "x",
  "label": "候选解",
  "label2": "真解",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "a", "min": -0.5, "max": 0.5, "step": 0.05, "value": 0.25 }
  ]
}
```

两端钉死不动（边界条件的功劳），中间鼓包或塌陷由 $a$ 控制。把 $a$ 调到 0，两线重合——你手动完成了一次"物理损失清零"。

### 实验 2：让程序自己找到最优点

```python title="扫描参数 a：数据损失 + 物理损失"
import matplotlib.pyplot as plt

lam = 1.0        # 物理权重 λ
data_target = 0.3   # 观测暗示的最优 a（带噪数据的意见）

def total_loss(a):
    data_part = (a - data_target) ** 2     # 数据损失：离观测意见越远越罚
    phys_part = (2 * a) ** 2               # 物理损失：残差 R=2a，取平方均值
    return data_part + lam * phys_part

best_a = None
best_loss = None
a_grid = []
loss_grid = []
k = -50
while k <= 50:
    a = k * 0.01                            # 从 -0.5 扫到 0.5
    L = total_loss(a)
    a_grid.append(a)
    loss_grid.append(L)
    if best_loss is None or L < best_loss:  # 记录迄今最小损失
        best_loss = L
        best_a = a
    k += 1

print(f"最优 a = {round(best_a, 3)}")
print(f"对应总损失 = {round(best_loss, 4)}")
print(f"此时物理残差 R = {round(2 * best_a, 3)}")

plt.plot(a_grid, loss_grid)
plt.xlabel("a")
plt.ylabel("total loss")
```

理论最优 $a^\star = 0.06$（令导数 $2(a-0.3) + 8a = 0$），扫描结果应精确复现。注意它**既不是纯数据意见（0.3）也不是纯物理意见（0）**——λ 决定了这场谈判的成交价。

### 实验 3：判题小练兵

```exercise
# @title: 练习：算三个候选参数的总损失
# @check: 0.09
# @check: 0.07
# @check: 0.36
# @hint: 数据损失是平方惩罚 (a-0.3)^2，别写成线性；物理损失是残差平方 (2a)^2。
data_target = 0.3

def total_loss(a):
    data_part = (a - data_target) * 2      # ← 问题在这：惩罚忘了平方
    phys_part = (2 * a) ** 2
    return data_part + phys_part

for a in [0.0, 0.06, 0.3]:
    print(round(total_loss(a), 2))
```

平方惩罚是"离得越远罚得越狠"，线性版本会给出负损失这种荒谬结果。改对后三个损失分别是 0.09、0.07、0.36——最小值落在 $a=0.06$，与实验 2 的扫描一致。

## 常见误区

:::warning[常见误区]

**误区一**："PINN 是数值求解器的替代品。"
对手光滑、域规则的问题，有限差分/有限元又快又准（见第 23 章）。PINN 的主场是无网格、反问题、多物理场耦合这类传统格式头疼的场景——它是补充，不是革命。

**误区二**："配点越多一定越好。"
配点是"考点"不是数据：撒太多会拖慢训练且互相冗余，撒太少又约束不住解空间。工程做法是自适应加考点——专挑残差大的区域补考。

**误区三**："λ 固定为 1 就万事大吉。"
数据损失和物理损失的量纲、大小常常差几个数量级，λ 实际上是两套单位的汇率。调 λ 是 PINN 最玄学也最关键的工序，近年已有自动平衡权重的方案。

:::

```quiz
在 PINN 中，"配点"上的观测值通常是什么？
- 必须由温度传感器实测得到
- 只要求模型代入方程后的残差变小 [*]
- 用来替代边界条件，所以可以完全不管数据
? 配点不是数据点：它只检查候选解是否违反方程。真实观测仍然来自数据项，边界条件则可以用硬约束或软约束处理。
```

## 6. 练习

**练习 1**：手算：$\lambda = 10$ 时，最优 $a^\star$ 变成多少？（提示：极小化 $(a-0.3)^2 + 40a^2$。）

<details>
<summary>点开查看逐步解答</summary>

导数 $2(a-0.3) + 80a = 0$ → $82a = 0.6$ → $a^\star = 0.0073$。

物理话语权放大 10 倍，成交价就从 0.06 被拉向 0——λ 就是天平上的砝码。
</details>

**练习 2**：把实验 2 的 `data_target` 改成 0.0（数据与物理意见一致），观察最优 a 与损失曲线形状的变化。

<details>
<summary>点开查看逐步解答</summary>

$a^\star = 0$，两条证据指向同一点，总损失恰好在原点触底且曲线更陡峭（两项梯度同号叠加）。这解释了 PINN 的理想工况：数据与物理互证时收敛飞快；两者打架时才需要小心调 λ。
</details>

**练习 3**：概念辨析：配点上的残差为什么用"平方"而不是绝对值？

<details>
<summary>点开查看逐步解答</summary>

平方处处可导、大误差罚得更重，让优化器获得平滑且方向明确的信号——这与最小二乘（第 21 章）选择平方的理由一脉相承。代价是对离群残差过敏，所以也有用 Huber 类折中损失的研究。
</details>

## 7. 选读：导数从哪来？

<details>
<summary>选读 · 自动微分 vs 有限差分</summary>

真实 PINN 里 $u_\theta$ 是神经网络，残差里的导数用**自动微分**精确计算：框架记录前向计算的每一步，反向遍历即可得到 $\partial u/\partial t$、$\partial^2 u/\partial x^2$ 的解析值，没有差分近似误差（对比第 60 课欧拉法的截断误差）。这是"可微编程"送给物理机器学习的核心礼物——也是第 46 章的主角之一。本课的多项式例子里导数干脆手写（$u'' = 2a$），先让你看清损失函数的骨架。

</details>

## 8. 下一站

正向算完，该倒着问了：从有限的、带噪声的观测里反推热源参数——逆问题比正问题凶险得多，因为答案可能不唯一且对噪声极度敏感。

→ [逆问题与正则化](./20-inverse-problem-regularization.md)
