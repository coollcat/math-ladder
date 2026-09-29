---
title: 同调与 Betti 数：数一数有几个洞
lesson_id: tdg/homology-betti
prereqs:
  - tdg/fundamental-group
  - tdg/euler-characteristic
volume: 5
layer: L8
track:
  - geometry-space
  - information-learning
stage: university-core
difficulty: 4
---

# 同调与 Betti 数：数一数有几个洞

## 1. 从一个场景开始

一个球面和一个甜甜圈，怎么用数学语言说清楚"它们不一样"？

基本群给了第一个答案：甜甜圈上有一个"绕圈绕不回来"的方向，球面上没有。**但这只能抓一维的洞。**

球面的内部是空的（一个二维的洞），可球面上的任何闭曲线都能缩成一点——**基本群对此完全无感，它只能看见一维的洞。**

还有一个问题：基本群可能非常复杂（自由群、无限生成元），计算起来很痛苦，而且**基本群非交换**——这让比较两个空间变得麻烦。

同调群是另一个答案：**它专门数各维度的洞，而且是交换群，可以直接算。** 这就是本课的主题。

## 2. 直觉解释

先学会"数洞"的三个层次：

**第 0 层：连通分量。** 一个空间分几块？分开的块数就是 $\beta_0$。

**第 1 层：一维的洞。** 像甜甜圈中间那个穿透的洞、字母 B 的两个圈。绕这些洞走一圈回不来——这是 $\beta_1$。

**第 2 层：空腔。** 像球面内部那个被包住的空腔、气球里的气。这是 $\beta_2$。

**关键洞察**：要数洞，不需要知道"洞长什么样"，只需要知道**哪些圈 / 曲面是"绕不开的"**。

同调的做法很妙：**不去直接数洞，而是去数"边界刚好补不上"的东西**。

在三角形拼成的空间（复形）里，每条边有起点终点。把边首尾相接组成"链"，如果一条链**首尾闭合**，就称为**闭链**——它可能围出一个洞，也可能只是某个面的边界。

如果它正好是某个面的边界，那它"没什么特别的"（圈可以缩）；**如果它围出的东西补不上，那就是一个真正的洞**。

于是：

$$\text{同调群} = \frac{\text{闭链}}{\text{边界链}}$$

**"闭着但不能被填上"的东西，就是洞。** 这就是同调的全部思想。

## 3. 正式定义

在单纯复形（由点、边、三角形、四面体等拼成的空间）上：

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $C_k$ | $k$-链群 | $k$ 维单形的整数（或 $\mathbb{Z}_2$）线性组合 |
| $\partial_k$ | 边界算子 | 把 $k$-单形映到它的 $(k-1)$ 维边界 |
| $Z_k = \ker\partial_k$ | $k$-闭链群 | 边界为 0 的链（"闭合"） |
| $B_k = \text{Im}\,\partial_{k+1}$ | $k$-边界链群 | 作为 $(k+1)$-单形边界的链（"能填上"） |
| $H_k = Z_k/B_k$ | **$k$-同调群** | 商群——洞的代数账本 |
| $\beta_k$ | **Betti 数** | $\beta_k = \operatorname{rank} H_k$（洞的个数） |

**核心性质**：$\partial_{k-1}\circ\partial_k = 0$（简写 $\partial^2 = 0$）——**边界的边界是空**。

这条性质保证了 $B_k \subseteq Z_k$，商群才有意义。它和第 57 章外微分的 $d^2=0$ 是同一件事的两面。

**Euler 示性数与 Betti 数的关系**：

$$\chi = \sum_{k\ge0}(-1)^k\beta_k = \beta_0 - \beta_1 + \beta_2 - \cdots$$

**欧拉公式 $V - E + F = 2$ 只是它在球面上的特例**（$\beta_0=1, \beta_1=0, \beta_2=1$，于是 $1-0+1=2$）。

**常用小例子**：

| 空间 | $\beta_0$ | $\beta_1$ | $\beta_2$ |
| --- | :---: | :---: | :---: |
| 点 | 1 | 0 | 0 |
| 圆周 $S^1$ | 1 | **1** | 0 |
| 球面 $S^2$ | 1 | 0 | **1** |
| 圆环面（甜甜圈） | 1 | **2** | 1 |
| 两个分离的圆 | **2** | 2 | 0 |

## 4. 分步例题

**例 1（圆周 $S^1$：一个一维洞）**：把圆周拆成一个复形——两个顶点 $v_0, v_1$ 和两条边 $e_0, e_1$（各自连接两端）。

1. $C_1 = \langle e_0, e_1\rangle$，$C_0 = \langle v_0, v_1\rangle$；
2. $\partial_1(e_i) = v_1 - v_0$，所以 $Z_1 = \ker\partial_1 = \langle e_0 - e_1\rangle$（只有"绕一整圈"才闭合）；
3. $B_1 = \text{Im}\,\partial_2 = 0$（没有二维面）；
4. $H_1 = Z_1/B_1 \cong \mathbb{Z}$，于是 $\beta_1 = 1$ ✓

**一个圈绕不住，这就是圆周有一个一维洞的代数表述。**

**例 2（球面 $S^2$：一个二维洞，但 $\beta_1 = 0$）**：把球面三角剖分（如四面体的表面：$V=4, E=6, F=4$）。

1. $\beta_0 = 1$（整体连通）；
2. 每条闭曲线都能被三角形填满，所以 $Z_1 = B_1$，$H_1 = 0$，**$\beta_1 = 0$**；
3. $Z_2$ 由"整个球面"这一个闭曲面生成，但 $B_2 = 0$（没有三维体可填），所以 $H_2 \cong \mathbb{Z}$，**$\beta_2 = 1$**；
4. 验算：$\chi = \beta_0 - \beta_1 + \beta_2 = 1 - 0 + 1 = 2$，与 $V-E+F = 4-6+4 = 2$ **完全一致** ✓

**这就是基本群做不到的事**：球面的基本群是平凡的（"没有一维洞"），但它有 $\beta_2 = 1$。

**例 3（圆环面：$\beta_1 = 2$）**：甜甜圈表面。

1. $\beta_0 = 1$；
2. 一维洞有两个：**绕"甜甜圈圈身"的经线方向**与**穿"甜甜圈孔洞"的纬线方向**，两者独立；
3. 所以 $\beta_1 = 2$；
4. $\beta_2 = 1$（内部包着一个空腔）；
5. $\chi = 1 - 2 + 1 = 0$——圆环面的欧拉示性数是 0 ✓

**例 4（字母 B 的形状）**：把字母 B 看作一个平面图形（两条封闭的孔）。

1. $\beta_0 = 1$（连通）；
2. $\beta_1 = 2$（两个孔）；
3. $\beta_2 = 0$（平面图形没有内部空腔）；
4. $\chi = 1 - 2 + 0 = -1$。

## 5. 动手实验

先手算一个最小复形的同调——用 $\mathbb{Z}_2$ 系数（加法就是异或，最省事）：

```python title="手算同调：模 2 边界算子与 Betti 数"
def boundary_matrix_1(edges, vertices):
    """一维边界算子 ∂1：每条边 → 它的两个端点（模 2 系数）"""
    idx = {v: i for i, v in enumerate(vertices)}
    rows = len(vertices)
    cols = len(edges)
    M = [[0] * cols for _ in range(rows)]
    for j, (a, b) in enumerate(edges):
        M[idx[a]][j] = 1              # 模 2：起点 +1
        M[idx[b]][j] = 1              # 终点 +1（异或）
    return M

# 圆周：两个顶点、两条边，首尾相接
vertices = [0, 1]
edges = [(0, 1), (1, 0)]              # e0: 0→1, e1: 1→0
M = boundary_matrix_1(edges, vertices)
print("∂1 矩阵（行 = 顶点，列 = 边）：")
for row in M:
    print("  ", row)
print("列 e0 =", [M[i][0] for i in range(2)], " 列 e1 =", [M[i][1] for i in range(2)])
print("两列相同 → 核里含 e0 + e1（绕一圈），维数 1 → β1 = 1")
```

两列相同，说明 $e_0 + e_1$ 落到零——**这正是"绕一整圈"**。核空间的维数是 1，所以 $\beta_1 = 1$。

现在写一个通用的 Betti 数计算器（用 Gaussian 消元求秩）：

```python title="通用算法：用秩算出所有 Betti 数"
def rank_mod2(M, rows, cols):
    """模 2 高斯消元求秩"""
    M = [row[:] for row in M]
    r = 0
    for c in range(cols):
        pivot = -1
        for i in range(r, rows):
            if M[i][c]:
                pivot = i
                break
        if pivot < 0:
            continue
        M[r], M[pivot] = M[pivot], M[r]
        for i in range(rows):
            if i != r and M[i][c]:
                for j in range(cols):
                    M[i][j] ^= M[r][j]        # 模 2 消元：异或即相减
        r += 1
        if r == rows:
            break
    return r

def betti_from_complex(vertices, edges, faces):
    """用秩-零化度定理算 β0、β1、β2"""
    nv, ne, nf = len(vertices), len(edges), len(faces)
    d1 = boundary_matrix_1(edges, vertices)          # nv × ne
    idx_e = {e: i for i, e in enumerate(edges)}
    d2 = [[0] * nf for _ in range(ne)]               # ne × nf
    for j, tri in enumerate(faces):
        for a in range(3):
            e = (tri[a], tri[(a + 1) % 3])
            if e in idx_e:
                d2[idx_e[e]][j] ^= 1
            elif (e[1], e[0]) in idx_e:
                d2[idx_e[(e[1], e[0])]][j] ^= 1
    r1 = rank_mod2(d1, nv, ne)
    r2 = rank_mod2(d2, ne, nf)
    beta0 = nv - r1                    # β0 = dim ker ∂0 − dim Im ∂1
    beta1 = (ne - r1) - r2             # β1 = dim ker ∂1 − dim Im ∂2
    beta2 = nf - r2                    # β2 = dim ker ∂2（无 ∂3）
    return beta0, beta1, beta2

# 圆周
print("圆周：", betti_from_complex([0, 1], [(0, 1), (1, 0)], []))
# 三角形边界（同样是一个圆周）
tri_v = [0, 1, 2]
tri_e = [(0, 1), (1, 2), (2, 0)]
print("三角形边界：", betti_from_complex(tri_v, tri_e, []))
# 实心三角形（填上了面）
print("实心三角形：", betti_from_complex(tri_v, tri_e, [(0, 1, 2)]))
```

看三行输出：

- **圆周** $(1,1,0)$——一个一维洞；
- **三角形边界** $(1,1,0)$——同调群相同！**拓扑上它们确实是一回事**（同胚）；
- **实心三角形** $(1,0,0)$——**洞被填上了，$\beta_1$ 归零**。

**这就是同调在说的事**：填上那个面，一维洞就消失了。

最后用欧拉示性数交叉验证（两条路必须给出同一个数）：

```python title="交叉验证：V - E + F 与 β0 - β1 + β2"
def check(vertices, edges, faces, name):
    b0, b1, b2 = betti_from_complex(vertices, edges, faces)
    chi_alt = b0 - b1 + b2
    chi_direct = len(vertices) - len(edges) + len(faces)
    ok = "✓" if chi_alt == chi_direct else "✗"
    print(f"{name:>14}：β=({b0},{b1},{b2})  χ={chi_alt}  V-E+F={chi_direct}  {ok}")

check([0, 1], [(0, 1), (1, 0)], [], "圆周")
check([0, 1, 2], [(0, 1), (1, 2), (2, 0)], [], "三角形边界")
check([0, 1, 2], [(0, 1), (1, 2), (2, 0)], [(0, 1, 2)], "实心三角形")
# 四面体表面 = 球面
tet_v = [0, 1, 2, 3]
tet_e = [(0,1),(0,2),(0,3),(1,2),(1,3),(2,3)]
tet_f = [(0,1,2),(0,1,3),(0,2,3),(1,2,3)]
check(tet_v, tet_e, tet_f, "四面体表面")
```

四面体表面那一行给出 $\beta=(1,0,1)$、$\chi = 2$，与 $V-E+F = 4-6+4 = 2$ 吻合——**它就是球面**。

### 快问快答

```quiz
在单纯复形上，同调群 H_k 的定义是哪个商群？
- 边界链除以闭链
- 闭链除以边界链 [*]
- 链群除以边界链
? H_k = Z_k/B_k，即"闭合但不能被填上"的链模掉"能被填上"的链。这个商群的秩就是 Betti 数 β_k，也就是 k 维洞的个数。边界链一定是闭链（因为 ∂²=0），所以这个商群才有定义。
```

:::warning[常见误区]

**误区一**："同调群数的是'洞的形状'。" 
它数的是**洞的个数**（秩）以及**洞之间的缠绕关系**（挠部分），不关心洞在哪、有多大、什么形状。这是优点（拓扑不变量，与坐标无关），也是缺点（信息量有限）——**持久同调正是为了补上"洞有多大"这个信息而生的**。

**误区二**："基本群比同调群强，所以同调没用。" 
基本群确实携带更多信息（比如它不交换，能区分更细的结构），但**两项代价**：计算困难、不是交换群。而同调群是交换群，可化为矩阵的秩来计算——这正是它能在大规模数据（TDA）上跑起来的原因。Hurewicz 定理给出两者在低维的联系：当 $\pi_1$ 平凡时 $\pi_1 \cong H_1$ 的某个商。

**误区三**："$\beta_0$ 都是 1。" 
只有**连通**空间才有 $\beta_0 = 1$。两个分离的零件各贡献 1，所以 $\beta_0$ 就是连通分量的个数——这是它在聚类分析里被当作"簇数"用的原因。

**误区四**："用 $\mathbb{Z}$ 系数和 $\mathbb{Z}_2$ 系数算出来一样。" 
不一定。$\mathbb{Z}_2$ 系数下得不到"挠元"信息（比如实射影平面的 $H_1 = \mathbb{Z}_2$，是个有限群，Betti 数会是 0）。所以**"Betti 数"在某些空间上会丢掉挠部分**——严格说，Betti 数是同调群的自由部分的秩。

:::

## 6. 练习

**练习 1**：下面的代码想算"实心三角形"的 $\beta_1$，但忘记把填充的面贡献到的边界算进去，导致 $\beta_1$ 算成了 1（应该是 0）。补上 $\partial_2$ 的秩计算，改到输出 `(1, 0, 0)`：

```exercise
# @title: 练习：填上面之后 β1 应该归零
# @check: (1, 0, 0)
# @hint: 面 (0,1,2) 的边界是三条边 e0=(0,1)、e1=(1,2)、e2=(2,0)；它的存在让 Z1 全被"填上"，β1 = (ne - r1) - r2
def rank_mod2(M, rows, cols):
    M = [row[:] for row in M]
    r = 0
    for c in range(cols):
        pivot = -1
        for i in range(r, rows):
            if M[i][c]:
                pivot = i
                break
        if pivot < 0:
            continue
        M[r], M[pivot] = M[pivot], M[r]
        for i in range(rows):
            if i != r and M[i][c]:
                for j in range(cols):
                    M[i][j] ^= M[r][j]
        r += 1
        if r == rows:
            break
    return r

vertices = [0, 1, 2]
edges = [(0, 1), (1, 2), (2, 0)]
faces = [(0, 1, 2)]          # ← 实心三角形：这个面必须真的计入
nv, ne, nf = len(vertices), len(edges), len(faces)

d1 = [[0] * ne for _ in range(nv)]
for j, (a, b) in enumerate(edges):
    d1[a][j] = 1
    d1[b][j] = 1
r1 = rank_mod2(d1, nv, ne)

d2 = [[0] * nf for _ in range(ne)]
for j, tri in enumerate(faces):
    for a in range(3):
        e = (tri[a], tri[(a + 1) % 3])
        if e in edges:
            d2[edges.index(e)][j] ^= 1
r2 = rank_mod2(d2, ne, nf)          # ← 这里算对了吗？
beta0 = nv - r1
beta1 = (ne - r1) - r2
beta2 = nf - r2
print((beta0, beta1, beta2))
```

**练习 2**：一个复形由"两个分开的三角形"组成（互不相连，各自都没填面）。求它的 $(\beta_0, \beta_1, \beta_2)$。

<details>
<summary>点开查看逐步解答</summary>

两个分离的三角形，各自是一个圆周。

- $\beta_0 = 2$（两块）；
- $\beta_1 = 2$（每块贡献一个洞）；
- $\beta_2 = 0$（没填面，也没包住空腔）。

$$\chi = 2 - 2 + 0 = 0$$

**直接验证**：$V = 6$、$E = 6$、$F = 0$，$V - E + F = 0$ ✓ 一致。

```python
# 复用上面的 betti_from_complex，只是顶点编号要错开
vertices = [0, 1, 2, 10, 11, 12]
edges = [(0, 1), (1, 2), (2, 0), (10, 11), (11, 12), (12, 10)]
faces = []
print(betti_from_complex(vertices, edges, faces))   # 期望 (2, 2, 0)
```

**这解释了为什么 $\beta_0$ 常被直接当作"簇的个数"**——在聚类任务里，数据点连成的复形有几个连通块，$\beta_0$ 就是几。
</details>

## 7. 选读：从同调到持久同调

<details>
<summary>选读 · 把"洞"变成可以流动的量</summary>

经典同调有一个尴尬：**它只对已经确定的复形提问**。而真实数据是一堆带噪声的点，你没法确定"该在什么距离下连线"。

持久同调的办法是**让距离阈值流动起来**：

1. 设一个尺度参数 $\varepsilon$，把距离小于 $\varepsilon$ 的点两两连线，得到一个复形 $K_\varepsilon$；
2. 让 $\varepsilon$ 从 0 缓慢增大，复形逐渐长大：
   - $\varepsilon$ 很小时只有孤立的点（$\beta_0$ 很大，每点一块）；
   - 连起来后 $\beta_0$ 下降（簇在合并），**有些 $\beta_1$ 诞生**（环出现了）；
   - 环被三角形填上后 $\beta_1$ 又消失。

3. 每个洞都有一个**出生尺度**与**死亡尺度**，两者的差就是它的**持久性**。

**关键判据**：真实结构（信号）对应的洞持久性长，噪声造出来的洞瞬间生灭。于是把洞按"存活时间"排序，**长的留下、短的丢掉**——这就是在数据里做拓扑降噪。

把所有的（出生，死亡）对画在平面上，就是 **persistence diagram**；画成横条就是 **barcode**。

**为什么能算**：因为同调群可以写成矩阵秩（本课已演示），而在嵌套复形序列 $K_{\varepsilon_1}\subseteq K_{\varepsilon_2}\subseteq\cdots$ 上，这些秩的变化可以用**一次矩阵消元**全部读出来——这就是持久同调算法的核心，也是它能处理上万个点、几百维数据的工程原因。

**唯一还没说清的是：这些矩阵该从哪里来？** 从单纯复形——把点云按距离连成三角形、四面体。

→ [Vietoris-Rips 复形](./70-vietoris-rips.md)：数据点云怎么变成复形。
</details>

## 8. 下一站

同调和 Betti 数把"洞"变成了可计算的整数。但要让它们真的跑在数据上，还需要把点云变成复形的那一步。

→ [Vietoris-Rips 复形](./70-vietoris-rips.md)：从点云到复形的构造规则。
