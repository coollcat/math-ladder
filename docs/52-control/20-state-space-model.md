---
title: 状态空间：把动力学装进矩阵
lesson_id: control/state-space-model
prereqs:
  - control/open-loop-closed-loop
  - linalg/matrix
  - ode/slope-fields
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
  - state-space-model
applications:
  - cascaded-tanks
  - vehicle-platoon
exits:
  - engineering-cybernetics
---

# 状态空间：把动力学装进矩阵

## 1. 从一个场景开始

水厂有两级水箱：泵把水打进高位箱 A，A 满了溢流到低位箱 B，用户从 B 取水。你只盯着 B 的水位做控制，总会慢半拍——因为 B 的未来藏在 A 的**现在**里。

单输入单输出的"一个数状态"不够用了。我们需要一种记法，把系统内部**所有互相牵动的量**一起记账。这套记法叫**状态空间**，它是现代控制的通用语言：从火箭姿态到大电网，工程师交接口的第一张表都是它。

## 2. 直觉解释

把系统想象成游戏角色：

- **状态** = 存档。它记录"此刻需要知道的一切"（位置、速度、各箱水位……），加上输入就能推出下一帧；
- **矩阵 A** = 演化规则卡："存档里的每个数下一步怎么互相影响"；
- **矩阵 B** = 操作杆接线图："玩家的每个按键如何注入存档"。

于是"预测未来"退化成一个机械动作——**每一步做一次矩阵乘向量**。复杂系统的行为，被压缩成一张表格和一套重复的乘法。

## 3. 正式定义

离散时间线性系统的状态空间模型：

$$x_{k+1} = A\,x_k + B\,u_k$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $x_k$ | 状态向量 | 第 $k$ 步的完整存档，$n$ 个分量 |
| $u_k$ | 输入向量 | 第 $k$ 步的操作/控制 |
| $A$ | 状态矩阵 | 内部量的相互作用，$n \times n$ |
| $B$ | 输入矩阵 | 外部操作如何进入状态 |

连续时间版本写作 $\dot{x} = Ax + Bu$，两者用欧拉一步 $\Delta t$ 相互转化（选读）。

**双水箱例子**（每步约一分钟）：

$$x_{k+1}^{(1)} = 0.7\,x_k^{(1)} + 0.2\,u_k \qquad x_{k+1}^{(2)} = 0.3\,x_k^{(1)} + 0.8\,x_k^{(2)}$$

读法：A 箱每分钟保留七成、泵补入两成；B 箱接收 A 溢流的三成、自身保留八成。写成矩阵就是 $A=\begin{bmatrix}0.7 & 0\\ 0.3 & 0.8\end{bmatrix}$、$B=\begin{bmatrix}0.2\\ 0\end{bmatrix}$——注意控制只直接碰 A 箱，对 B 箱的影响必须**经过状态的接力**。

## 4. 分步例题

从空箱 $x_0 = (0, 0)$ 出发，恒定开泵 $u = 5$：

1. 第 1 步：$x_1^{(1)} = 0.7 \times 0 + 0.2 \times 5 = 1.0$；$x_1^{(2)} = 0.3 \times 0 + 0.8 \times 0 = 0$；
2. 第 2 步：$x_2^{(1)} = 0.7 \times 1 + 1 = 1.7$；$x_2^{(2)} = 0.3 \times 1 + 0.8 \times 0 = 0.3$；
3. 观察：B 箱在第 2 步才开始动——影响沿着 $A$ 的左下角那条"管道"传递；
4. 继续迭代会看到两箱水位先后爬升，最终稳定在各自的平衡值；
5. 整个过程没有任何新思想，只是**反复执行同一张演化规则卡**。

## 5. 动手实验

### 实验 1：把 A 当成一次变换来摸底

下面这个组件平时用来玩线性变换，这里请把它当成"一步演化规则卡"：拖动四个滑块摆出 $A$（紫色虚线是它的特征方向——第 30 课的主角，先混个脸熟）：

```viz
{
  "type": "matrix",
  "title": "双水箱矩阵 A = [[0.7, 0], [0.3, 0.8]]",
  "a": 0.7,
  "b": 0,
  "c": 0.3,
  "d": 0.8
}
```

### 实验 2：纯 Python 迭代两箱水位

```python title="手写矩阵乘向量，跑 40 分钟水位"
import matplotlib.pyplot as plt

A = [[0.7, 0.0], [0.3, 0.8]]   # 嵌套列表：按行存放的矩阵
B = [0.2, 0.0]
u = 5.0                        # 泵的开度恒定

def matvec(M, x):
    # 矩阵乘向量：第 i 行与 x 对应相乘再求和
    out = []
    for i in range(len(M)):
        s = 0.0
        for j in range(len(x)):
            s = s + M[i][j] * x[j]
        out.append(s)
    return out

x = [0.0, 0.0]                 # 两箱初始水位
hist_a = []
hist_b = []
for k in range(40):
    ax_new = matvec(A, x)
    bu_new = [B[0] * u, B[1] * u]
    x = [ax_new[0] + bu_new[0], ax_new[1] + bu_new[1]]
    hist_a.append(x[0])
    hist_b.append(x[1])

print(f"第10分钟: A={hist_a[9]:.2f}, B={hist_b[9]:.2f}")
print(f"第40分钟: A={hist_a[-1]:.2f}, B={hist_b[-1]:.2f}")

plt.plot(hist_a, label="tank A")
plt.plot(hist_b, label="tank B")
plt.xlabel("minute")
plt.ylabel("level")
plt.legend()
```

两条曲线先后爬升又趋稳：A 箱先到位，B 箱被 A 拖着走。稳态值可由 $x_\star = A x_\star + B u$ 解出——留给练习。

### 实验 3：判题小练兵

```exercise
# @title: 练习：手动推演一步状态
# @check: 1.7
# @check: 0.3
# @hint: 第二行分量来自 A 的第二行 (0.3, 0.8)：0.3*x1 + 0.8*x2 + 0*u，注意第二个分量取 x2 而不是 x1。
A = [[0.7, 0.0], [0.3, 0.8]]
B = [0.2, 0.0]
u = 5.0
x = [1.0, 0.0]

x1n = A[0][0] * x[0] + A[0][1] * x[1] + B[0] * u
x2n = A[1][0] * x[0] + A[1][1] * x[0] + B[1] * u   # ← 问题在这：第二个分量抄错了状态位
print(round(x1n, 2))
print(round(x2n, 2))
```

这一步正是分步例题的第 2 步。改对后再把 `x` 换成 `[1.7, 0.3]` 推一步，就得到第 3 步——状态空间模型的全部预测能力都藏在这两行乘法里。

## 常见误区

:::warning[常见误区]

**误区一**："状态空间表示是唯一的。"
同一个系统可以换坐标：把 $(x_1, x_2)$ 组合成"总量 + 差值"，得到完全不同却等价的 $A'$。状态像坐标系，选得好分析省一半力（第 30 课的对角化就是选坐标的艺术）。

**误区二**："B 里是零的分量说明控制失效了。"
只是**不直接**作用。控制可以借状态接力影响全系统——能不能彻底影响，是"可控性"问题，本章暂按下不表。

**误区三**："离散和连续模型随便混写。"
$x_{k+1} = Ax_k$ 与 $\dot{x}=Ax$ 的稳定性条件不同（一个是 $|\lambda|<1$，一个是 $\operatorname{Re}\lambda<0$）。拿到模型先问一句：这是差分还是微分？

:::

## 6. 练习

**练习 1**：求双水箱的稳态水位（令 $x_\star = A x_\star + Bu$，即解线性方程组）。

<details>
<summary>点开查看逐步解答</summary>

第一行：$x_1^\star = 0.7x_1^\star + 1$ → $0.3x_1^\star = 1$ → $x_1^\star = 10/3 \approx 3.33$。
第二行：$x_2^\star = 0.3x_1^\star + 0.8x_2^\star$ → $0.2x_2^\star = 0.3 \times 10/3 = 1$ → $x_2^\star = 5$。

对照仿真（实验 2 实跑输出）：第 40 分钟 A=3.33、B=5.00（原始浮点约 3.3333 与 4.9980），两箱均已到位，与解析值吻合 ✓。
</details>

**练习 2**：把实验 2 中的 `u` 改成闭环规则 `kp * (r - x[1])`（盯住 B 箱调泵），取 `r=4.0`、`kp=2.0` 跑一遍。B 箱能稳到目标吗？A 箱停在哪？

<details>
<summary>点开查看逐步解答</summary>

稳态方程：$x_2^\star = 4$ 代入第二行得 $x_1^\star = (0.2 \times 4)/0.3 = 8/3 \approx 2.67$；第一行反解泵量 $u = (x_1^\star - 0.7x_1^\star)/0.2 = 4$。闭环把 B 箱精确送到目标，代价是 A 箱停在 2.67——反馈重新分配了整个系统的落点。
</details>

**练习 3**：判断：若把 A 改成 $\begin{bmatrix}0.7 & 0\\ 0 & 0.8\end{bmatrix}$（切断 0.3 那条管道），B 箱还能被泵影响吗？

<details>
<summary>点开查看逐步解答</summary>

不能。B 行变成 $x_{k+1}^{(2)} = 0.8 x_k^{(2)}$，初值为零则永远为零；B 列的输入通道也是零。这个玩具例子预告了"可控性"：有些状态无论怎么操作都够不着。
</details>

## 7. 选读：连续模型如何变离散

<details>
<summary>选读 · 欧拉一步的矩阵版</summary>

对 $\dot{x} = A_c x + B_c u$ 用最朴素的前向欧拉（步长 $\Delta t$）：

$$x_{k+1} = (I + \Delta t\,A_c)\,x_k + \Delta t\,B_c\,u_k$$

于是 $A = I + \Delta t A_c$、$B = \Delta t B_c$。更精确的做法有矩阵指数 $e^{A_c \Delta t}$（第 22 章 ODE 与数值方法课的常客）。要点是：**离散与连续之间隔着一张转换表，别拿错**。第 60 课 ode/euler-runge-kutta 讲过的步长陷阱在这里原样生效。

</details>

## 8. 下一站

演化规则卡已经到手。但拿到卡片不等于知道结局：有的矩阵把一切拉回原点，有的把一切甩出去，还有的先转圈再放大。判决书就写在 A 的特征值里。

→ [特征值判决书：稳定性与相图](./30-stability-eigenvalues.md)
