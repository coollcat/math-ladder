---
title: 双下降：现代过参数化的意外曲线
lesson_id: learning-theory/double-descent
prereqs:
  - learning-theory/regularization-theory
  - learning-theory/cross-validation
volume: 4
layer: L10
track:
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - overparameterization
  - interpolation-threshold
  - double-descent
  - minimum-norm-solution
applications:
  - machine-learning
exits:
  - data-ai
---

# 双下降：现代过参数化的意外曲线

## 1. 从一个场景开始

把前几课的经验压缩成一句口号："复杂度越过谷底，过拟合深渊恭候。"可 Belkin 等人 2019 年、Nakkiran 等人的系列实验纷纷翻案：把深度网络的宽度一路加大，测试误差先冲上一座刺眼的高峰，然后**掉头向下**，走进比经典谷底更低的新大陆。

更古怪的是山脊的位置——恰好落在"参数个数等于样本个数"、网络可以完美背下全部训练数据的临界点上。左边要求交卷留错题，右边反而交满分卷，考官却打出了更高的真分数。这条形如"W"的曲线叫**双下降**（double descent），它推翻的不是理论，而是我们对"哪种假设类值得信任"的默认选项。

## 2. 直觉解释

拆开看，谜团由两个部件拼成：

- **插值门槛左边的老剧本**：参数少于样本时，模型学不完整、还容易沾染噪声；复杂度上升确实先降后升——经典 U 形没有失效。
- **门槛右边的现代剧本**：参数超过样本后，能精确插值的解有无穷多个，选哪个成了新问题。梯度下降天然偏爱其中**权重最短**的那一个（同一残差下范数最小的插值解），这种选择偏好被称为**隐式正则化**——没写进损失函数的罚项，藏在优化算法的行走方式里。

参数冗余带来的是选择余地而非混乱：特征维度越多，就越存在一条"既贴合训练标签、又平滑懒惰地穿过空白区域"的低范数通道。类比记忆宫殿：房间越大，越能腾出一条笔直走廊直达出口；拥挤的小屋只能横冲直撞。

于是全景是一条组合曲线：经典下降、峰值灾难、现代再下降。峰值不是过渡的杂音，而是两种制度交接时的阵痛。

## 3. 正式定义

| 符号 | 名字 | 要点 |
| --- | --- | --- |
| $p$ | 参数量 | 本课以线性模型特征维度为代表 |
| $n$ | 样本量 | 两者之比是核心变量 |
| $\Phi \in \mathbb{R}^{n\times p}$ | 设计矩阵 | 行为样本特征，$p\ge n$ 时解空间无穷大 |
| $\hat w_{\mathrm{mn}}$ | 最小范数插值解 | 在所有满足 $\Phi w=y$ 的解里取 $\lVert w\rVert_2$ 最小者 |

**双下降的解剖图**（测试误差对 $p/n$ 作图）：第一谷（经典正则区最优）；**插值峰**（$p\approx n$ 处 Gram 矩阵接近奇异，解的范数剧烈膨胀）；第二坡下行进入**现代区**（$p\gg n$ 时最小范数解趋于稳定且泛化良好）。注意本课所有曲线均为多回合重训的平均行为——单次抽签可能偏离平均。

峰值为何会存在？$p<n$ 时 $\Phi^\top\Phi$ 尚满秩，解唯一而温和；$p$ 一旦逼近 $n$，列向量开始在 $n$ 维空间里"首尾相挤"，求逆放大微小噪声（条件数的黄昏），插值解被迫摆出巨大系数才能同时命中每个含噪标签；越过门槛后新增维度提供了大量互相抵消的平坦方向，反把范数重新压回地面。**峰是稀缺性焦虑的极值，而不是复杂度本身的罪证。**

## 4. 分步例题

一个两行三步的小算术，看懂"最小范数挑了谁"。设单条训练样本特征为 $(2,\,2)$、标签为 $6$，欠约束方程：

$$2a + 2b = 6 \quad\Leftrightarrow\quad a + b = 3$$

1. 解空间是一条直线上的无穷多点——插值不止一种做法；
2. 候选甲 $(0,3)$：范数平方 $0^2+3^2=9$；候选乙 $(1.5,\,1.5)$：$1.5^2+1.5^2=4.5$。同样命中标签，范数差了一倍；
3. 求 $\min a^2+b^2\ \text{s.t.}\ a+b=3$：对称性（或求导 $2a\delta a+2b\delta b$ 配合 $\delta a=-\delta b$）给出 $a=b$。**最小范数解天生喜欢平摊权重**——过大的负担压给谁都会抬高总分。

这条性质正是梯度下降在现代区的护身符：它找到的插值解自动向"均匀分摊、谁都别逞强"的形态收敛，等效于上一课一根看不见的橡皮筋。

## 5. 动手实验

### 实验 1（python）：亲手滑过那道坎

高斯随机特征下的线性回归：真相藏在一个 50 维向量里，样本固定 20 条，特征维度 $D$ 从 2 一路加到 36，跨过 $D=n$ 的悬崖。全部求解采用带微量阻尼的最小二乘（模拟隐式正则的核心机制）：

```python title="特征维度扫描：从经典谷到插值峰再到现代区"
import random       # random：伪随机数（此前课程已介绍）
import math         # math.sqrt：老朋友

def gauss_jordan_inv(A):
    # 高斯-若尔当消元求逆：Gauss-Jordan 主元选取 + 单位阵陪跑
    nD = len(A)
    Mx = [row[:] + [1.0 if i == j else 0.0 for j in range(nD)]
          for i, row in enumerate(A)]
    for col in range(nD):
        piv = max(range(col, nD), key=lambda rr: abs(Mx[rr][col]))
        if abs(Mx[piv][col]) < 1e-12:          # 主元太小：注入微扰防奇异
            Mx[piv][col] += 1e-9
        Mx[col], Mx[piv] = Mx[piv], Mx[col]
        pv = Mx[col][col]
        Mx[col] = [v / pv for v in Mx[col]]
        for rr in range(nD):
            if rr != col and Mx[rr][col] != 0.0:
                f = Mx[rr][col]
                Mx[rr] = [a - f * bv for a, bv in zip(Mx[rr], Mx[col])]
    return [row[nD:] for row in Mx]

NTR5 = 20             # 样本量：悬崖就设在 D = 20
REPS5 = 5             # 每个 D 重训五回取平均
SIG5 = 0.35           # 标签噪声
MTE5 = 200            # 每回合的全新测试样本数
DT5 = 50              # 真实规律所在的维度

for D in [2, 6, 12, 17, 19, 20, 22, 28, 36]:
    tte = 0.0
    ttr = 0.0
    for rep in range(REPS5):
        rng5 = random.Random(2100 + rep)          # 每 D 每回合换种子：消灭巧合
        b5 = []
        for j in range(DT5):                      # 抽出本轮"世界真相"的权重向量
            b5.append(rng5.gauss(0, 1))
        nb = math.sqrt(sum(v * v for v in b5))
        b5 = [v / nb * 2.0 for v in b5]           # 归一并定标：真相范数恒为 2
        X5 = []
        Y5 = []
        for _ in range(NTR5):
            row = [rng5.gauss(0, 1) for _ in range(D)]   # 只有前 D 维特征可见
            X5.append(row)
            Y5.append(sum(row[j] * b5[j] for j in range(D))
                      + SIG5 * rng5.gauss(0, 1))     # 观测 = 可见部分投影 + 噪声
        Gm = [[sum(X5[i][a] * X5[i][b2] for i in range(NTR5))
               for b2 in range(D)] for a in range(D)]
        rhs = [sum(X5[i][j] * Y5[i] for i in range(NTR5)) for j in range(D)]
        for j in range(D):
            Gm[j][j] += 1e-4 * NTR5                  # 微弱阻尼＝隐形正则化
        Gi = gauss_jordan_inv(Gm)
        w5 = [sum(Gi[a][k] * rhs[k] for k in range(D)) for a in range(D)]
        tr_acc = 0.0
        for i in range(NTR5):
            pd = sum(w5[j] * X5[i][j] for j in range(D)) - Y5[i]
            tr_acc += pd * pd
        ttr += tr_acc / NTR5                         # 训练均方误差累计
        te_acc = 0.0
        for _ in range(MTE5):
            row = [rng5.gauss(0, 1) for _ in range(DT5)]
            base = sum(row[j] * b5[j] for j in range(DT5))
            pred = sum(w5[j] * row[j] for j in range(min(D, DT5)))
            te_acc += (pred - base) ** 2
        tte += te_acc / MTE5                         # 测试均方误差累计
    print(f"D={D}: train={ttr / REPS5:.4f} test={tte / REPS5:.3f}")
```

典型输出（关注 test 列）：

| D | train | test |
| --- | --- | --- |
| 2 | 0.1200 | 3.750 |
| 12 | 0.0630 | 3.232 |
| 17 | 0.0323 | 3.247 |
| 19 | 0.0031 | 6.158 |
| 20 | 0.0029 | **22.867** |
| 22 | 0.0000 | 3.359 |
| 28 | 0.0000 | 2.611 |
| 36 | 0.0000 | 2.463 |

剧情完整：(2→12) 经典下坡；(19) 训练误差趋零的同时测试误差已经异动——Gram 矩阵开始缺氧；(20) 一头撞上 **22.9** 的插值峰；(22 之后) 一边保持训练误差严格为零，一边降到 **2.46** 的现代区水平——不仅收复失地，还低于经典谷底附近任何一站。把重训五回换成十回，峰的高度抖动，位置雷打不动。

### 快问快答

```quiz
恰好到达插值门槛（参数个数 ≈ 样本个数）时，最小范数插值最有名的表现是什么？
- 训练误差清零，测试误差同时冲上戏剧性的峰值 [*]
- 训练误差也很大，因为数据装不下
- 测试误差达到全程最低，进入黄金时代
? 门槛的定义就是"刚好能把每个含噪标签都记住"：训练误差趋近于零。但此时解的选择余地几乎为零，Gram 矩阵濒临奇异，解被迫承担巨大系数去逐条迁就噪声——泛化灾难集中爆发。真正的舒适区在右侧的现代区，那里冗余才换来低范数的从容。
```

:::warning[常见误区]

**误区一**：你以为双下降宣告"模型永远不怕大"。现代区的良好泛化依赖隐式正则真的在工作（优化偏好低范数、架构与数据尺度匹配）；违反这些前提的巨型模型照样在门槛右边翻车。

**误区二**：你以为峰值只由"参数/样本"比值决定。计数口径因架构而异——宽网络的窗内有效维度、重复特征、数据增强都会搬动峰的位置。它是几何事件，不是简单的除法。

**误区三**：你以为经典 U 形曲线作废了。小数据、缺乏冗余特征的场景里，谷底逻辑依旧精准统治；双下降是把地图向东扩了一张，不是撕掉了西半张。

:::

## 6. 练习

**练习**：接住本课的主线账本。三条特征的迷你数据集 $y=(3,3,7)$：

- **状态甲（容量不足）**：只剩截距模型 $\hat y=c$。写出它的 OLS 解（等于什么统计量？）、并算出训练均方误差；
- **状态乙（恰好插值）**：改用二次多项式 $\hat y=c_0+c_1x+c_2x^2$ 过三点 $x=0,1,2$，求出三个系数与权重范数平方，对比状态甲的权重预算。

```exercise
# @title: 练习：容量、插值与权重账本
# @check: 4.3
# @check: 3.56
# @check: 2
# @check: 17.0
# @hint: 截距模型取均值 13/3；残差平方逐一累加后除以 3；二次系数用差分法 c2=(y0+y2−2y1)/2 再回代
y_list = [3, 3, 7]

# —— 状态甲：只有截距 ——
c_hat = sum(y_list) / len(y_list)         # OLS 截距 = 标签均值
print(round(c_hat, 1))

resid_sq = 0                              # ← 占位：把每个残差的平方累起来
mse_a = resid_sq / len(y_list)            # ← 占位：除以样本数得训练均方误差
print(round(mse_a, 2))

# —— 状态乙：二次多项式过三点 x = 0,1,2 ——
c2_coef = (y_list[0] + y_list[2] - 2 * y_list[1]) / 2   # 二阶差分一半：已示范
c1_coef = 0                               # ← 占位：用 x=1 与 x=0 两条方程相减求一次项
c0_coef = y_list[0]                       # 截距即 x=0 处的标签：免费送你
print(round(c2_coef))                     # ← 有 bug：应当打印的是……想一想哪一格对应 @check

norm_sq_b = c0_coef ** 2                  # ← 有 bug：三位权重都要计入范数平方
print(round(norm_sq_b, 2))
```

<details>
<summary>点开查看逐步解答</summary>

**状态甲**：$\hat c=13/3\approx 4.3$。残差：$3-\frac{13}{3}=-\frac43$、同左、$7-\frac{13}{3}=\frac83$；平方和 $\frac{16+16+64}{9}=10.67$，除以 3 得 $\frac{32}{9}\approx 3.56$。想插值？数学上根本不可能——**容量的天花板卡死了所有努力**。

**状态乙**：$f(0)=c_0=3$；$f(1)=c_0+c_1+c_2=3$；$f(2)=c_0+2c_1+4c_2=7$。相减得 $c_1+c_2=0$、$2c_1+4c_2=4$，解出 $c_2=2$、$c_1=-2$。三个权重 $3,-2,2$ 全部平方求和：$9+4+4=\mathbf{17}$（脚本按浮点路径打印 `17.0`）。

对读两态：从 3.56 的擦边误差别谈插值；一旦跨入可插值区，训练误差归零的同时权重预算从约 4.1（线性两参量级）跳到 17——**插值不免费**。现代区的希望在于：更多冗余参数进来后，最小范数机制能在无数可行解中重新选出便宜的那一个，这正是实验 1 里峰后的下坡动力。

</details>

## 7. 选读：最小范数解就是 λ→0 的岭回归

<details>
<summary>选读 · 隐式正则化的分析力学</summary>

把上一课的岭回归闭式解 $\hat w_\lambda=(\Phi^\top\Phi+\lambda I)^{-1}\Phi^\top y$ 对 $\lambda\to 0^+$ 取极限：当 $p\ge n$ 且 $\Phi$ 行满秩时，$(\Phi^\top\Phi+\lambda I)^{-1}$ 恰好收敛到广义逆 $\Phi^{T}(\Phi\Phi^\top)^{-1}$ 组成的最小范数解 $\hat w_{\mathrm{mn}}=\Phi^{\top}(\Phi\Phi^{\top})^{-1}y$。也就是说：**显式正则调到零的瞬间，并未失去一切约束——目标函数面上的曲率仍在挑选范数最小的幸存者**。几何直观：可行解仿射空间 $\lbrace w:\Phi w=y\rbrace$ 中离原点最近的点必垂直于该空间，而这个垂直投影由 $\Phi^\top$ 张成；梯度下降从零出发沿 $\Phi^\top$ 的列张成子空间迭代，故其极限永远停在同一个投影点上。这解释了为何"不做正则化的深度学习"罕见发生：优化算法本身就是一位沉默的正则主义者。至于现代区泛化如何定量刻画——平坦度、有效维度与神经切线核等工具，属于后续研究前沿课程的门票。

</details>

## 8. 下一站

个体模型的地形看清之后，镜头拉远：把算力、数据、参数当成三种可兑换的资源，损失随规模整体怎么走？工业界几百亿美元的开销，押注在一条可以在对数坐标纸上画直线的经验曲线上。

→ [Scaling Laws：堆料背后的经验规律](./90-scaling-laws.md)
