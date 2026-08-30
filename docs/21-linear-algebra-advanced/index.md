---
title: 第 21 章 · 线性代数进阶
description: 从矩阵计算走向结构：方程组、秩、特征值、谱定理、SVD、PCA 与低秩近似。
volume: 2
layer: L6
track:
  - geometry-space
  - scientific-computing
stage: university-core
difficulty: 4
---

# 线性代数进阶

卷一的向量、点积和矩阵变换是前哨；本章建立完整的高维结构语言。线性方程组的解空间、特征方向、奇异值和数据压缩会连成同一条线索。

本章你会学到：

1. [高斯消元与解空间](./10-gaussian-elimination.md)——两条直线相交，答案是一个点；
2. [秩、零空间与维数](./20-rank-nullspace.md)——一个矩阵有多少“真正独立的信息”？；
3. [行列式的几何意义](./30-determinant-geometry.md)——单位正方形面积是 1；
4. [特征值与不变方向](./40-eigenvalues.md)——大多数向量经过矩阵变换后会又转向又伸缩；
5. [对称矩阵与谱定理](./45-symmetric-spectral-theorem.md)——对称矩阵的特征方向保证互相垂直：谱定理，SVD 与正定的共同法律；
6. [SVD 与低秩近似](./50-svd-low-rank.md)——任何线性变换都可以拆成三个动作：先把输入转到一组合适的轴，再沿这些轴伸缩，最后转到输出位置；
7. [PCA 与高维压缩](./60-pca-compression.md)——一张云雾状的散点图，看似每个点都要两个坐标；
8. [正定二次型](./70-positive-definite.md)——把一个碗放在桌上，无论小球从哪个水平方向移动，高度都会上升；
9. [最小二乘与正规方程](./80-least-squares.md)——三个点很少恰好落在一条直线上；
10. [向量空间与线性映射](./90-linear-maps.md)——图形引擎能旋转、拉伸、剪切整张平面，却不能把所有点统一右移一步还自称“线性变换”；
11. [相似与对角化](./100-diagonalization.md)——同一台机器，用标准坐标看是“旋转加剪切”的复杂动作；
12. [Jordan 标准形：不可对角化时的第二套坐标](./105-jordan-form.md)——重复特征值只剩一条不变方向时，对角化当场破产：Jordan 块把动作拆成“伸缩 + 一次推搡”，幂照样好算；
13. [条件数与数值稳定性](./110-condition-number.md)——两个方程组在纸上都“有唯一解”，在计算机里表现却可能天差地别；
14. [矩阵幂与图传播](./120-matrix-powers.md)——一个人今天在 A 城或 B 城，明天按概率移动；
15. [张量与 einsum](./125-tensors-einsum.md)——张量是“多维数组 + 变换规则”，einsum 是它的通用记号；matrix 网格盘让下标肉眼可见。

## 生产状态

首批七课（10–60）、第二批六课（70–120）、张量 einsum 收官课与 Jordan 标准形补链课（105）已全部上线，本章十五门正式课齐装满员。本章是现代 AI 数学的第一优先地基层；后续可按需扩展正定二次型应用与更稳定的最小二乘数值方法。

## 实战挑战 · 用转移矩阵给网页打分（PageRank 幂法）

搜索引擎排序的经典难题：网页互相引用，谁也不服谁，"重要"该怎么定义？Brin 和 Page 在 1998 年的 Google 原始论文（*The Anatomy of a Large-Scale Hypertextual Web Search Engine*, Computer Networks 30, 107–117）里给出一个漂亮的回答：想象一个**随机冲浪者**，每一步都沿着当前页面的链接等概率跳走——一个页面重要，当且仅当冲浪者长期停留在它上面的概率大。这道题的情境为教学原创简化，模型即出自该论文。

把三页迷你互联网写成列随机矩阵 $P$（第 $j$ 列 = 从页面 $j$ 出发的去向）：

$$P=\begin{pmatrix}0&0&1\\ \tfrac12&0&0\\ \tfrac12&1&0\end{pmatrix}$$

出链规则：A 一半去 B、一半去 C；B 只去 C；C 只回 A。分布向量 $\vec p_k$ 的三个分量是"随机冲浪者第 $k$ 步停在 A、B、C 的概率"。本题超前的理论一句：若 $P^k\vec p_0$ 收敛，极限就是 $P$ 关于特征值 1 的特征向量（平稳分布），这正是本站[矩阵幂与图传播](./120-matrix-powers.md)与[特征值与不变方向](./40-eigenvalues.md)合奏的地方。

**(a)** 核对 $P$ 每一列的和都是 1。

**(b)** 从均匀分布 $\vec p_0=(\tfrac13,\tfrac13,\tfrac13)$ 出发走两步，算出 $\vec p_2=P^2\vec p_0$。

**(c)** 验证 $\vec\pi=(\tfrac25,\tfrac15,\tfrac25)$ 是平稳分布：逐分量核对 $P\vec\pi=\vec\pi$。第一问已示范思路，第二问藏了一个 bug：

```exercise
# @title: 实战挑战：PageRank 两步传播与平稳检验
# @check: 0.5
# @check: 0.167
# @check: 0.333
# @check: True
# @check: True
# @check: True
# @hint: 两步传播要把“乘一次 P”这个动作连做两次；平稳检验把 π 代回 P·π 后逐分量比较。
P = [[0.0, 0.0, 1.0],
     [0.5, 0.0, 0.0],
     [0.5, 1.0, 0.0]]   # 第 j 列是从页面 j 出发的去向比例

def step(v):
    out = [0.0, 0.0, 0.0]          # 结果向量先清零
    for i in range(3):             # 第 i 个分量 = P 第 i 行点乘 v
        s = 0.0
        for j in range(3):
            s = s + P[i][j] * v[j]
        out[i] = s
    return out

p = [1/3, 1/3, 1/3]   # 均匀初始分布
p2 = step(p)          # ← 这里只乘了一次 P：两步传播应该是 step(step(p))

print(round(p2[0], 3))
print(round(p2[1], 3))
print(round(p2[2], 3))

pi = [2/5, 1/5, 2/5]  # 猜测的平稳分布
ppi = step(pi)
print(abs(ppi[0] - pi[0]) < 0.000001)
print(abs(ppi[1] - pi[1]) < 0.000001)
print(abs(ppi[2] - pi[2]) < 0.000001)
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** 三列分别是 $(0,\tfrac12,\tfrac12)$、$(0,0,1)$、$(1,0,0)$，每列和都是 1 ✓。

**(b)** 一步一步来。第一步：

$$P\vec p_0=\Big(0+0+\tfrac13,\ \tfrac12\cdot\tfrac13,\ \tfrac12\cdot\tfrac13+\tfrac13\Big)=\Big(\tfrac13,\ \tfrac16,\ \tfrac12\Big)$$

第二步（用 $\vec p_1$ 再乘一次 $P$）：

$$P\vec p_1=\Big(\tfrac12,\ \tfrac16,\ \tfrac13\Big)$$

所以打印 `0.5`、`0.167`、`0.333`。注意 B 页两步后只有 $\tfrac16$——它只进不出，权重全被 C 拿走了。

**(c)** 把 $\vec\pi=(\tfrac25,\tfrac15,\tfrac25)$ 代回：

- 第一分量：$1\cdot\tfrac25=\tfrac25$ ✓
- 第二分量：$\tfrac12\cdot\tfrac25=\tfrac15$ ✓
- 第三分量：$\tfrac12\cdot\tfrac25+1\cdot\tfrac15=\tfrac15+\tfrac15=\tfrac25$ ✓

三行都打印 `True`。$\vec\pi$ 各分量相加为 1，且和为正——它是特征值 1 的特征向量。对比 (b)：从均匀分布出发两步就到了 $(0.5,0.167,0.333)$，正朝着 $(0.4,0.2,0.4)$ 走；真正的 Google 在数十亿维上做同样的迭代（再加阻尼因子处理悬空页），这就是幂法。

工程回看：整个算法没有一行求逆、没有解方程组——只用"反复乘同一个矩阵"，这正是[相似与对角化](./100-diagonalization.md)里 $A^k=PD^kP^{-1}$ 思想的数值化身。

</details>

相关课程：[矩阵幂与图传播](./120-matrix-powers.md)（转移矩阵幂）、[特征值与不变方向](./40-eigenvalues.md)（平稳分布=λ=1 的特征向量）、[条件数与数值稳定性](./110-condition-number.md)。

## 实战挑战 · 特征向量：方向不变的检验

特征向量的判据：$Av = \lambda v$，作用后方向不变、只按 $\lambda$ 伸缩。矩阵 $A=\begin{pmatrix}2&1\\1&2\end{pmatrix}$ 作用在 $v=(1,1)$ 上应该得到 $(3,3)$。下面这题把第二个分量算漏了一项，修到输出 `3 3` 和 `3.0`：

```exercise
# @title: 实战挑战：特征向量的检验
# @check: 3 3
# @check: 3.0
# @hint: Av 的每个分量都要把整行点乘 v 做完；第二行还有 A[1][1]*v[1]。
A = [[2, 1], [1, 2]]
v = [1, 1]

av0 = A[0][0] * v[0] + A[0][1] * v[1]    # 2*1 + 1*1 = 3
av1 = A[1][0] * v[0]                      # ← 问题在这：漏了 A[1][1]*v[1]

print(av0, av1)
print(av0 / v[0])                          # 特征值 = 分量比值
```

<details>
<summary>点开查看逐步解答</summary>

矩阵乘向量，每个输出分量是**整行**与向量的点积：

```python
av1 = A[1][0] * v[0] + A[1][1] * v[1]   # 1*1 + 2*1 = 3
```

改完：$Av = (2+1,\ 1+2) = (3,3)$，输出 `3 3`；分量比值 $3/1 = 3.0$ 就是特征值 $\lambda$。初始代码第二个分量只算 $1$，得到 $(3,1)$——方向都变了，谈不上特征向量。$Av=\lambda v$ 的"方向不变"检验，全靠每个分量都算满。

</details>
