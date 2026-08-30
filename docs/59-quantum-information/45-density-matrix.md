---
title: 密度矩阵：混合态的账本
lesson_id: quantum-information/density-matrix
prereqs:
  - quantum-information/measurement-born
  - linalg-advanced/svd-low-rank
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
  - density-matrix
  - mixed-state
  - partial-trace
  - decoherence
applications:
  - quantum-computing
  - quantum-error-correction
exits:
  - quantum-information/dirac-inner-product
---

# 密度矩阵：混合态的账本

## 1. 从一个场景开始

第 20 课的制备机器很敬业：每次都吐出一模一样的 $\left(\frac{\sqrt3}{2},\ \frac12\right)$。真实实验室里的机器会**手抖**——比如九成的日子给出 $\lvert+\rangle$，一成的日子退化成 $\lvert0\rangle$。这时"一支箭"的账本 $\lvert\psi\rangle$ 记不下了：**先掷经典骰子，再按骰面出箭**，这种"概率混概率"的对象叫**混合态**，全书此前只字未提。

两桩悬案也等着新账本：其一，第 40 课的纠缠态对"左边那枚自己处于什么状态"拒绝作答；其二，第 90 课 Bob 没接到电话时手里的"一比一白噪声"一直没有正式身份。**密度矩阵** $\rho$ 一本账全记下——它是量子信息从"理想纯态"走向"真实世界"的第一张门票。

## 2. 直觉解释

把量子状态想成一支箭（第 10 课预告过的那颗"状态星球"上的一根指针；星球的全图第 60 课发货，这里只借一句承诺：**合法的箭住在球面上**）。

- **纯态**：箭就插在球面上某一点，方向斩钉截铁——这是前九课的唯一角色；
- **混合态**：先把经典骰子掷出去，再按骰面从几支候选箭里抽一支。合成后的账不再是一支箭，而是"箭的抽签分布"；
- **完全混合态**：骰子完全均匀、箭平均指向所有方向——合成结果缩到**球心**：什么都不知道。

新账本 $\rho$ 怎么记？对角元记**各基底的经典概率**（骰面的账），非对角元记**相干性**——箭与箭之间的相位账，量子信息全押在这里。后面会看到：纯态贴着球面，混合态缩进球内；**退相干**（噪声）干的事，就是把箭从球面慢慢拽向球心。

## 3. 正式定义

对状态 $\lvert\psi\rangle=\alpha\lvert0\rangle+\beta\lvert1\rangle$，**密度矩阵**定义为其**外积**（列向量乘行向量，铺成矩阵）：

$$\rho=\lvert\psi\rangle\langle\psi\rvert=\begin{pmatrix}\lvert\alpha\rvert^2 & \alpha\beta^*\\ \alpha^*\beta & \lvert\beta\rvert^2\end{pmatrix},\qquad \rho_{\text{混合}}=\sum_i p_i\,\lvert\psi_i\rangle\langle\psi_i\rvert$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\lvert\psi\rangle\langle\psi\rvert$ | 外积 | 第 20 课投影 $\lvert x\rangle\langle x\rvert$ 的完整体：bra 与 ket 不扣合，并排铺开成矩阵 |
| $\operatorname{Tr}(\rho)$ | 迹 | 对角元之和；任何合法账本恒为 1（概率总账） |
| $\operatorname{Tr}(\rho^2)$ | 纯度 | 判纯混的试金石：等于 1 是纯态，小于 1 是混合态 |
| $\rho^2=\rho$ | 纯态判据 | 只有纯态的账平方后不变号 |
| $\operatorname{Tr}_B$ | 偏迹 | 把系统 B 的下标"抓和对角"，只留 A 的账 |
| $I/2$ | 完全混合账本 | 对角 $\frac12$、非对角 0：一比一白噪声的正式身份 |

## 4. 分步例题

**例 1（纯态账平不变）**：$\lvert+\rangle$ 的振幅 $\alpha=\beta=\frac{1}{\sqrt2}$。

1. 铺账本：$\rho=\begin{pmatrix}1/2 & 1/2\\ 1/2 & 1/2\end{pmatrix}$；
2. 算平方，逐格核对：左上 $=\frac14+\frac14=\frac12$，右上同样是 $\frac12$，四格全与原账相同；
3. $\rho^2=\rho$ ✓ 纯度 $\operatorname{Tr}(\rho^2)=1$ ✓——纯态的账平方后分毫不差。

**例 2（混合态缩水）**：一半 $\lvert0\rangle$ 一半 $\lvert1\rangle$ 的经典混合。

1. 铺账本：$\rho=\frac12\begin{pmatrix}1&0\\0&0\end{pmatrix}+\frac12\begin{pmatrix}0&0\\0&1\end{pmatrix}=\begin{pmatrix}1/2&0\\0&1/2\end{pmatrix}$；
2. 算平方：对角元各变成 $\frac14$——$\rho^2=\begin{pmatrix}1/4&0\\0&1/4\end{pmatrix}\ne\rho$；
3. 纯度 $=\frac14+\frac14=\frac12<1$：账缩水了，箭缩进了球内；
4. 关键对照：这本账的测量分布 $P(0)=P(1)=\frac12$，与例 1 的 $\lvert+\rangle$ **完全相同**！玻恩规则在计算基下分不清它们——分清它们的只有非对角元（$\frac12$ 对 $0$）：一道 $\mathrm{H}$ 门就能验明正身，$\lvert+\rangle$ 过门回 $\lvert0\rangle$，混合态过门照样各半。

**例 3（偏迹：纠缠的局部账）**：贝尔态 $\lvert\Phi^+\rangle=\frac{1}{\sqrt2}(\lvert00\rangle+\lvert11\rangle)$ 的联合账本铺开成 $4\times4$：$\rho=\frac12\begin{pmatrix}1&0&0&1\\0&0&0&0\\0&0&0&0\\1&0&0&1\end{pmatrix}$。只留 A 的账（对 B 的下标抓和，块内取对角元）：

1. 左上格：$\rho_{00,00}+\rho_{01,01}=\frac12+0=\frac12$；右上格：$\rho_{00,10}+\rho_{01,11}=0+0=0$；
2. 左下格对称地是 $0$；右下格：$\rho_{10,10}+\rho_{11,11}=0+\frac12=\frac12$；
3. 于是 $\operatorname{Tr}_B(\rho)=\begin{pmatrix}1/2&0\\0&1/2\end{pmatrix}=I/2$——"左边那枚自己什么状态"的答案到了：**完全混合**，等价于一比一白噪声（第 90 课例 2 的悬案就此销案）。

## 5. 动手实验

混合比例 p 从 0（纯 $\lvert0\rangle$）扫到 1（纯 $\lvert1\rangle$），账本 $p\lvert0\rangle\langle0\rvert+(1-p)\lvert1\rangle\langle1\rvert$ 的纯度与指针半径同步缩水——两端贴球面（纯度 1），中点缩到球心（纯度 0.5）：

```viz
{
  "type": "plot",
  "title": "混合比例 p：纯度与球面半径同步缩水",
  "expr": "x^2 + (1-x)^2",
  "expr2": "abs(2*x-1)",
  "xmin": 0,
  "xmax": 1
}
```

读图要点：蓝线是纯度 $\operatorname{Tr}(\rho^2)$、橙线是指针离球心的距离，两条曲线在中点 $p=0.5$ 同时触底——完全混合态住在球心，这就是"混合态缩进球内"的定量版。

退相干的快慢由环境决定：拖动滑块换环境"手笔"，非对角元按指数曲线蒸发：

```viz
{
  "type": "plot",
  "title": "退相干：非对角元的指数蒸发",
  "expr": "exp(-x/t2)",
  "xmin": 0,
  "xmax": 5,
  "sliders": [
    { "name": "t2", "min": 0.2, "max": 3, "step": 0.1, "value": 1 }
  ]
}
```

### 实验 1（python）：纯态与混合态的 ρ² 测试

```python title="两本账各算一次平方"
alpha = 0.6          # 实数振幅 α（复数情形要等下一课的镜子工序）
beta = 0.8           # 0.36 + 0.64 = 1，归一化合法

rho = [[alpha * alpha, alpha * beta],       # 外积铺账本：行乘列
       [beta * alpha, beta * beta]]

def mat_mul(A, B):   # 2×2 矩阵乘法：行乘列再累加（第 30 课门矩阵同款算法）
    C = [[0, 0], [0, 0]]
    for i in range(2):
        for j in range(2):
            s = 0
            for k in range(2):
                s = s + A[i][k] * B[k][j]
            C[i][j] = s
    return C

def trace(M):        # 迹：对角线元素之和
    return M[0][0] + M[1][1]

r2 = mat_mul(rho, rho)
print("纯态 rho^2 =", round(r2[0][0], 4), round(r2[0][1], 4), round(r2[1][0], 4), round(r2[1][1], 4))
print("纯态纯度 =", round(trace(r2), 4))

mixed = [[0.5, 0], [0, 0.5]]      # 例 2 的经典混合账本
m2 = mat_mul(mixed, mixed)
print("混合 rho^2 =", round(m2[0][0], 4), round(m2[0][1], 4), round(m2[1][0], 4), round(m2[1][1], 4))
print("混合纯度 =", round(trace(m2), 4))
```

第一行回读账本本身——$\rho^2$ 与 $\rho$ 四格全等；第三行的 $\begin{pmatrix}0.25&0\\0&0.25\end{pmatrix}$ 则明显小于原账。**平不变的是纯态，越平越小的缩水账是混合态**。

### 实验 2（python）：贝尔态的偏迹

```python title="从 4×4 联合账本抓出 A 的局部账"
rho = [
    [0.5, 0.0, 0.0, 0.5],     # 贝尔态 |Φ+> 的联合账本（例 3）
    [0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0],
    [0.5, 0.0, 0.0, 0.5],
]

red = [[0.0, 0.0], [0.0, 0.0]]
for i in range(2):
    for j in range(2):
        s = 0
        for k in range(2):
            s = s + rho[2 * i + k][2 * j + k]   # 偏迹：A 的下标照旧，B 的下标抓和
        red[i][j] = s

print("A 的约化账本 =", red[0][0], red[0][1], red[1][0], red[1][1])
```

输出正是 $I/2$ 的四个格子。这台"抓和机器"就是从纠缠态提取局部描述的标准工序——Bob 手里的白噪声，账面上长这个样子。

### 实验 3（python）：退相干的逐步台账

```python title="每步偷走两成相干，看账本对角化"
# sliders: steps=2 [0:6:1]

c = 0.5            # |+> 账本的非对角元初值：相干性满格
p = 0.2            # 每一步环境偷走的相干份额（退相干强度）

for m in range(steps + 1):
    purity = 0.5 + 2 * c ** 2
    print(f"第{m}步  非对角元={round(c, 4)}  纯度={round(purity, 4)}")
    c = c * (1 - p)     # 非对角元每步乘 (1-p)：环境抽走 p 份额
```

非对角元一步步衰减、纯度跟着滑落，对角元 $\frac12$ 始终纹丝不动——账本正在**对角化**。把滑块拖到 6：纯度跌到 0.53 附近，账本几乎是对角的 $I/2$。退相干不是"概率变了"，是**相位账被没收**。

### 快问快答

```quiz
混合态与某个纯态在计算基下测出完全相同的分布，靠什么把它们区分开？
- 再多测几次，分布会慢慢变得不同
- 看非对角元：纯态有相干性，混合态没有 [*]
- 根本区分不开，它们就是同一个状态
? 分布只由对角元决定；非对角元藏着相位账。一道 H 门就能让差别现形：纯态过门归位，混合态过门照样各半。
```

:::warning[常见误区]

**误区一**："你以为混合态就是叠加态的别名。" 例 2 与例 1 的分布完全相同却命运迥异——叠加是振幅层面的相加（相干），混合是骰子层面的抽签（无相干）。判据是 $\rho^2$：平不变的是叠加，缩水的是混合。

**误区二**："你以为对角元是振幅。" 对角元是模平方后的经典概率，永远非负、总和为 1；振幅的正负与虚实全部记在**非对角元**里——那才是量子资源的仓库。

**误区三**："你以为退相干会改变测量概率。" 实验 3 里对角元从头到尾没动：退相干没收的是非对角元（相位账），测量分布不变，但干涉能力已死。第 70 课说"相位是隐形货币"——退相干烧掉的就是这笔存款。

:::

## 6. 练习

**练习 1**：实验 3 的一次性版本。初始代码把"环境偷走的份额"当成了"留下的份额"，能跑但账算反了——修到通过：

```exercise
# @title: 练习：退相干一次的账
# @check: 0.2
# @check: 0.58
# @hint: 强度 p 表示环境偷走 p 份额，账本里留下的是 (1-p) 份额；纯度公式是 0.5 + 2c²。
c0 = 0.5          # |+> 账本的非对角元初值
p = 0.6           # 退相干强度

c = c0 * p        # ← 错在这：被偷走的是 p 份额，留下的应是 (1-p) 份额
purity = round(0.5 + 2 * c ** 2, 2)
print(round(c, 2))
print(purity)
```

修好后的 $c=0.5\times0.4=0.2$、纯度 $0.5+2\times0.04=0.58$——一道退相干，账本从纯态（纯度 1）滑向球内。

<details>
<summary>练习 1 解法</summary>

```python
c0 = 0.5
p = 0.6

c = c0 * (1 - p)     # 留下的份额：1 - p
purity = round(0.5 + 2 * c ** 2, 2)
print(round(c, 2))
print(purity)
```
</details>

**练习 2**：不写代码，手算"一半 $\lvert+\rangle$ 一半 $\lvert-\rangle$"的混合账本，再与例 2 的账本对照。

<details>
<summary>点开查看逐步解答</summary>

两支箭的账本分别是 $\frac12\begin{pmatrix}1&1\\1&1\end{pmatrix}$ 与 $\frac12\begin{pmatrix}1&-1\\-1&1\end{pmatrix}$，对半混合（非对角元正负相消）：

$$\rho=\begin{pmatrix}1/2&0\\0&1/2\end{pmatrix}=I/2$$

与例 2 那本"一半 $\lvert0\rangle$ 一半 $\lvert1\rangle$"的账**完全相同**——不同的骰面组合可以记出同一本账。这不是缺陷而是设计：$\rho$ 故意只保留**可测量**的信息，抹掉制备过程的流水账。想还原骰面？得回到制备记录，账本本身不背供。
</details>

## 7. 选读：纯度、半径与秩的三重奏

<details>
<summary>选读 · 为什么纯度等于 (1+|r|²)/2</summary>

单比特的任何账本都能写成 $\rho=\frac12(I+x\sigma_x+y\sigma_y+z\sigma_z)$：单位矩阵打底，三个实数 $x,y,z$ 是账本的"指向旋钮"（第 60 课的布洛赫矢量正是它们）。代入纯度公式逐项化开，交叉项全部互相抵消，只剩：

$$\operatorname{Tr}(\rho^2)=\frac{1+x^2+y^2+z^2}{2}=\frac{1+\lvert r\rvert^2}{2}$$

纯态 $\lvert r\rvert=1$ 给纯度 1（球面），完全混合 $r=0$ 给纯度 $\frac12$（球心）——第 5 节两条曲线在这一个公式里合龙。用第 21 章的谱语言再说一遍：$\rho$ 的特征值是一组非负、总和为 1 的数，纯度是它们的平方和；纯态意味着特征值为 $(1,0)$——秩一矩阵，SVD 只剩一根奇异轴（这正是 prereq 里低秩视角的用武之地）；混合态秩至少为 2，平方和必然小于 1。偏迹则保住"非负、迹一、纯度不增"三件事：局部账永远不会比联合账更纯——纠缠的真身，是整体账里局部怎么也拿不走的那部分纯度。

</details>

## 8. 下一站

这本账里 $\lvert\psi\rangle\langle\psi\rvert$ 的外积记法到处跑，αβ* 的星号也越写越密。下一课给整章换一套正式的记账笔墨：bra 就是共轭转置，ket 就是列向量——狄拉克记号，把散装工具清算成一套合身内衣。

→ [复内积空间回顾与 Dirac 记号](./50-dirac-inner-product.md)
