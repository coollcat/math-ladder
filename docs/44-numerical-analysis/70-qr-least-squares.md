---
title: 正交化：QR 分解与最小二乘
lesson_id: numerical-analysis/qr-least-squares
prereqs:
  - numerical-analysis/floating-point
volume: 5
layer: L6
track:
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - orthogonalization
  - qr-decomposition
  - least-squares-projection
applications:
  - sensor-data-fitting
  - machine-learning-preview
exits:
  - engineering
  - data-ai
---

# 正交化：QR 分解与最小二乘

## 1. 从一个场景开始

水文站用四个传感器标定一条"水位—流量"的近似直线，数据点是 $(0,1)$、$(1,1)$、$(2,3)$、$(3,2)$。想找直线 $y=kx+m$ 穿过它们？代入立刻发现：四个方程只有两个未知数——**方程比未知数多**，四条直线要求不可能同时满足，精确解根本不存在。

工程师要的不是"无解"这两个字，而是那一条让总体误差最小的**最公平折中**。求它最稳的办法，来自一类特殊的矩阵：正交矩阵。这就是 QR 分解与最小二乘的故事。

## 2. 直觉解释

先认识主角的性格。**正交矩阵**是一台"只旋转、不拉伸"的变换机：任何向量经过它，方向可以转、长度一丝不变。原因藏在列向量里——它的列彼此垂直且都是单位长度（一组正交基）。既然不改变长度，它也就**不放大误差**：浮点尘埃进去多大，出来还是多大。这是数值世界里最宝贵的品质之一。

QR 分解把任意矩阵 $A$ 的列"掰正"成这组标准正交基：

$$A = QR$$

其中 $Q$ 的列就是掰正后的正交基，$R$ 是一个上三角矩阵，记录每个原始列在各个基方向上的投影长度（"剥掉公共成分"的账目）。掰正的经典手工做法是 **Gram–Schmidt 过程**：像理发一样，逐个把新列里与已处理方向平行的部分剪掉，剩下的长度归一化后就得到新的基向量。

有了 $Q$，最小二乘豁然开朗：让 $Ax$ 尽量接近 $b$，几何上就是把 $b$ **正交投影到各列张成的空间**里——残差 $b-Ax$ 恰好垂直于该空间。而投影坐标在正交基下只需逐列做内积：

$$Rx = Q^{\mathsf T} b$$

左边是三角系统，回代即得。整个流程没有"把方程平方再加倍"的操作，误差全程被正交性护送。

## 3. 正式定义

设 $m\times n$ 矩阵 $A$（$m\ge n$）各列线性无关，则存在分解 $A=QR$：

| 名词 | 含义 |
| --- | --- |
| 正交性 | $q_i^{\mathsf T} q_j=\delta_{ij}$：同列为 1，异列为 0 |
| Gram–Schmidt | $v_j=a_j-\sum_{i<j}(q_i^{\mathsf T}a_j)\,q_i$，再除以自身长度 |
| $R$ 的元素 | $r_{ij}=q_i^{\mathsf T}a_j$（对角元是被剥干净后的剩余长度） |
| 最小二乘解 | 使 $\lVert Ax-b\rVert_2$ 最小的 $\hat{x}$，等价于正规方程 $A^{\mathsf T}A\hat{x}=A^{\mathsf T}b$ |

两条命令性的对比记在心里：

$$\kappa(A^{\mathsf T}A)=\kappa(A)^2,\qquad \text{正交变换不改长度（}\lvert r\rvert_{ij}\text{路径无放大）}$$

法方程先平方了条件数，等于**主动把病态程度翻番**；QR 路线绕开这一步，把好钢用在刀刃上。

## 4. 分步例题

**例**：把 $A=\begin{pmatrix} 1 & 2 \\ 1 & 0 \end{pmatrix}$ 正交化（列分别记 $a_1,a_2$）。

1. 第一列自身长度的平方 $1^2+1^2=2$，故 $r_{11}=\sqrt2$，$q_1=\frac{1}{\sqrt2}(1,1)^{\mathsf T}$；
2. 第二列先扣除它在 $q_1$ 方向的影子：$r_{12}=q_1^{\mathsf T}a_2=\frac{2}{\sqrt2}=\sqrt2$；
3. 剪完剩下的垂直残余 $v=a_2-r_{12}q_1=(2,0)^{\mathsf T}-(1,1)^{\mathsf T}=(1,-1)^{\mathsf T}$；
4. 归一化：$r_{22}=\sqrt{1^2+(-1)^2}=\sqrt2$，$q_2=\frac{1}{\sqrt2}(1,-1)^{\mathsf T}$；
5. 验收：$q_1^{\mathsf T}q_2=\frac12-\frac12=0$ ✓，两个长度都是 1 ✓。

于是 $R=\begin{pmatrix}\sqrt2 & \sqrt2 \\ 0 & \sqrt2\end{pmatrix}$。现在把它用于引子的四点拟合：设计矩阵 $A$ 两列分别是全 1 与 $(0,1,2,3)$，右端 $b=(1,1,3,2)^{\mathsf T}$——同样两步内积加一次回代，答案 $k=0.5,\ m=1.0$ 就是那条"最公平"的直线（下一节机器验证）。

## 5. 动手实验

### 实验 1：亲手拖出一台最小二乘机

拖动下面的数据点，蓝色直线会追着给出当前的最小二乘解，右侧表格实时汇报总误差。试着拉出一个"离群点"，观察直线如何固执地两头兼顾——这正是"公平折中"的日常面目。

```viz
{
  "type": "fit",
  "n": 6
}
```

### 实验 2：Gram–Schmidt 流水线与"长度守恒"

```python title="两列正交化：账目 R 与三条验收"
import math                    # 开方 sqrt 是第 3 章登记过的老朋友

a1 = [1.0, 1.0]
a2 = [2.0, 0.0]

r11 = math.sqrt(a1[0] ** 2 + a1[1] ** 2)     # 第一列的长度
q1 = [a1[0] / r11, a1[1] / r11]              # 除以长度：单位向量

r12 = q1[0] * a2[0] + q1[1] * a2[1]          # 内积：第二列在 q1 上的影子有多长
v = [a2[0] - r12 * q1[0], a2[1] - r12 * q1[1]]   # 剪掉平行分量

r22 = math.sqrt(v[0] ** 2 + v[1] ** 2)
q2 = [v[0] / r22, v[1] / r22]

dotp = q1[0] * q2[0] + q1[1] * q2[1]       # 验收一：应严格垂直
print(abs(dotp) < 1e-12)                   # 双精度噪声远小于门槛才放行
print(round(r11, 4), round(r12, 4), round(r22, 4))
lensq = q1[0] ** 2 + q1[1] ** 2            # 验收二：单位长度
print(abs(lensq - 1) < 1e-12)
```

输出三行：`True`、`1.4142 1.4142 1.4142`、`True`——三笔账全是 $\sqrt2$，与例题手算完全咬合。"绝对值小于门槛"式判断是浮点世界表达"等于零/等于一"的正确姿势（第 10 课的反面教训在这里结成正果）。

### 实验 3：同一场拟合法方程与 QR 对表

```python title="四点直线拟合：两种路线，同一个答案"
import math                       # 开方 sqrt：登记过的老朋友

xs = [0, 1, 2, 3]
ys = [1, 1, 3, 2]
m_pts = len(xs)                            # len：列表元素个数

sx = sum(xs); sy = sum(ys)                 # sum 连加整张表
sxx = sum(t * t for t in xs)               # 生成器表达式：边遍历边累乘累加
sxy = sum(xs[i] * ys[i] for i in range(m_pts))

det_ = m_pts * sxx - sx * sx               # 法方程系数阵的行列式
slope_ne = (m_pts * sxy - sx * sy) / det_
inter_ne = (sxx * sy - sx * sxy) / det_
print(slope_ne, inter_ne)

c0 = [1.0, 1.0, 1.0, 1.0]                  # QR 路线：列一是常数项
c1 = [float(t) for t in xs]                # float()：整数批量转浮点
r11g = math.sqrt(sum(t * t for t in c0))
q0 = [t / r11g for t in c0]
r01 = sum(q0[i] * c1[i] for i in range(4))
v1 = [c1[i] - r01 * q0[i] for i in range(4)]
r22g = math.sqrt(sum(t * t for t in v1))
q1g = [t / r22g for t in v1]
beta2 = sum(q1g[i] * ys[i] for i in range(4)) / r22g          # 回代：先解斜率
beta1 = (sum(q0[i] * ys[i] for i in range(4)) - r01 * beta2) / r11g
print(beta2, beta1)

resid2 = sum((ys[i] - (slope_ne * xs[i] + inter_ne)) ** 2 for i in range(m_pts))
rn = resid2 ** 0.5                         # 总残差的欧几里得长度
print(resid2, round(rn, 4))
```

两条路线打印出同一组数：斜率 `0.5`、截距 `1.0`——例题预言应验。残差平方和恰为干净的 `1.5`，其平方根四舍五入后是 `1.2247`。本例矩阵很乖所以两条路都漂亮；真正分出高下的战场见选读前的提醒——条件数一旦变大，法方程会率先缴械。

### 快问快答

```quiz
数值计算里更推荐哪条最小二乘求解路线？
- 先列法方程 AᵀAx=Aᵀb 再消元，因为步骤少
- 先把 A 正交化成 QR 再回代 Rx=Qᵀb，因为构造 AᵀA 会把条件数翻平方 [*]
- 两者永远给出一模一样的浮点结果
? κ(AᵀA)=κ(A)²：病态输入下法方程的有效位数掉得更快；QR 只旋转不拉伸，不给误差加杠杆。
```

:::warning[常见误区]

**误区一**："最小二乘拟合也该穿过所有点。" 它的定义恰恰相反：允许残差存在，去最小化残差的平方和。硬要过点就回到了插值——那是另一个契约。

**误区二**："正交化就是把每列除以自己的长度。" 那只保证单位长度，不保证彼此垂直。必须先把与新列共线的既有成分全部减掉（Gram–Schmidt 的核心一步），再归一化。

**误区三**："QR 又快又准，法方程一无是处。" 平方级问题在小型良态场景完全够用，甚至因为矩阵更小更快；分歧只在病态与大规模时不可调和。选择依据是条件数诊断，不是信仰。

:::

## 6. 练习

**练习 1**（概念）：解释为什么"残差垂直于所有列"等价于"各列在残差上的总贡献为零"，并由此说明它为什么应当是最小值点的特征。

<details>
<summary>点开查看逐步解答</summary>

最小化的目标 $f(x)=\lVert Ax-b\rVert^2$ 在谷底处沿任何列方向 $a_i$ 平移都不再下降，微分条件正是 $a_i^{\mathsf T}(Ax-b)=0$ 对一切 $i$ 成立——也就是残差与每一列内积为零、整体垂直于列空间。直觉版：若残差还朝某列方向歪着，把解朝那边挪一点就能削短它，说明还没到底；歪不过任何列了，才是公平折中的终点。
</details>

**练习 2**（判题）：这段代码想把 $a_2$ 投影成正交基的第二根柱子，但忘了从 $a_2$ 里剪掉 $q_1$ 方向的分量。补上那一行，三个判定恢复健康。

```exercise
# @title: 练习：修好正交化的剪刀
# @check: True
# @check: 1.4142
# @check: True
# @hint: v = a2 − r12·q1，其中 r12 是 q1 与 a2 的内积；少减一刀，两列就没分开。
import math

a1 = [1.0, 1.0]
a2 = [2.0, 0.0]

r11 = math.sqrt(a1[0] ** 2 + a1[1] ** 2)
q1 = [a1[0] / r11, a1[1] / r11]

r12 = q1[0] * a2[0] + q1[1] * a2[1]
v = [a2[0], a2[1]]            # ← 错了：还没有剪掉 q1 方向的影子

r22 = math.sqrt(v[0] ** 2 + v[1] ** 2)
q2 = [v[0] / r22, v[1] / r22]

dotp = q1[0] * q2[0] + q1[1] * q2[1]
print(abs(dotp) < 1e-12)
print(round(r22, 4))
print(abs(q1[0] ** 2 + q1[1] ** 2 - 1) < 1e-12 and abs(r11 - math.sqrt(2)) < 1e-9)
```

修好后输出 `True`、`1.4142`、`True`：垂直性回来了，剩余长度回到教科书值 $\sqrt2$，而第三行顺带确认第一根本来就没问题——故障只在剪刀那一下。

**练习 3**：往实验 3 的数据里追加第五点 $(1,\ 5)$（传感器明显抽风的一天）。用组件或代码重算斜率截距，并对照残差解释这个离群点如何"绑架"直线。

<details>
<summary>点开查看逐步解答</summary>

五点法方程：$\Sigma x=7,\ \Sigma y=12,\ \Sigma x^2=15,\ \Sigma xy=21$，行列式 $5\times15-49=26$；斜率 $=(5\times21-7\times12)/26=(105-84)/26=21/26\approx0.808$，截距 $=(15\times12-7\times21)/26=33/26\approx1.269$。直线上扬近半——单个点凭平方惩罚撬动了全局。实践药方：先画散点查异常，再做稳健回归（换平方为更温和的损失），这是第 41 章 ERM 思想的预告片。
</details>

## 7. 选读：Householder 反射——生产级 QR 的真实工艺

<details>
<summary>选读 · 为什么实际软件不用朴素 Gram–Schmidt</summary>

经典 Gram–Schmidt 在浮点里有个隐患：当新列与既有方向几乎共线时，"剪掉影子"是两个大数相减，灾难性相消会把残余方向的精度啃掉。修正式（每列重复投影两次）能救急；工业级的默认武器则是 Householder 反射：构造一个对称正交矩阵 $H=I-2vv^{\mathsf T}/(v^{\mathsf T}v)$，它像镜面一样把整列映到第一坐标轴上，随后对剩余子矩阵递归。全部操作都是整列的旋转反射，没有任何"大减小"的相消窗口，稳定性与并行性双优。数值库里的 LAPACK、numpy.linalg.qr 默认走的这条路。概念链条没变：Q 仍是正交基，R 仍是投影账本——只是账本换了支更稳的笔来写。

</details>

## 8. 下一站

方阵有 LU、超定组有 QR，可当矩阵大到百万行还塞满零（网格温度场、电网潮流）时，连存下分解因子都成了奢侈。这时该轮到"猜了再修"的迭代思想重新登场——这次的对象是一整个向量场。

→ [迭代法与谱半径](./75-spectral-radius-iterative.md)
