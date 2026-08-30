---
title: 单比特门与矩阵表示
lesson_id: quantum-information/single-qubit-gates
prereqs:
  - quantum-information/measurement-born
  - linalg/matrix
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
  - quantum-gate
  - unitary-matrix
applications:
  - quantum-computing
exits:
  - quantum-information/entanglement-bell
---

# 单比特门与矩阵表示

## 1. 从一个场景开始

经典计算机靠逻辑门干活：与、或、非，把比特搅来搅去算出答案。量子计算机也要"搅"它的比特——但规则完全不同：**量子门是矩阵乘法**。一个门就是一个 2×2 矩阵，作用在状态向量上，把布洛赫球上的箭头拧到新位置。

问题立刻来了：是不是任何矩阵都能当量子门？不行——测量概率要守恒，变换不许把单位向量拉长压扁。能上岗的矩阵有个名字：**酉矩阵**。本课认识三个最常用的量子门 X、Z、H，并亲手用循环实现它们。

## 2. 直觉解释

把状态想成布洛赫球上的一根指针，量子门就是**拧指针的手**：

- **X 门**（量子非门）：绕 x 轴转 180°，北极 $\lvert0\rangle$ 与南极 $\lvert1\rangle$ 对调——矩阵正是第 11 章见过的"交换两个坐标"$\begin{pmatrix}0&1\\1&0\end{pmatrix}$；
- **Z 门**：绕 z 轴转 180°，赤道翻面——只给 $\lvert1\rangle$ 的振幅乘 $-1$，$\lvert0\rangle$ 原地不动。它动的是相位，单看概率什么都没变，埋下干涉的伏笔；
- **H 门**（Hadamard）：先把确定拧成均匀叠加——$\lvert0\rangle$ 进去，"五五开"出来。制造叠加，全靠它。

三件事共用一套语言：**矩阵左乘**。门序列 = 矩阵连乘；先做的门写在右边。

## 3. 正式定义

**量子门**：作用在 $n$ 个量子比特上的量子门是一个 $2^n\times2^n$ 的**酉矩阵** $U$，满足

$$U^\dagger U = I$$

其中 $U^\dagger$ 是共轭转置（转置再逐项取共轭），$I$ 是单位矩阵。

| 门 | 矩阵 | 一句话人设 |
| --- | --- | --- |
| X | $\begin{pmatrix}0&1\\1&0\end{pmatrix}$ | 翻转：$\lvert0\rangle\leftrightarrow\lvert1\rangle$ |
| Z | $\begin{pmatrix}1&0\\0&-1\end{pmatrix}$ | 相位反转：给 $\lvert1\rangle$ 振幅乘 $-1$ |
| H | $\frac{1}{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix}$ | 均分：确定态变五五开叠加 |

为什么必须是酉？直观版：$U^\dagger U=I$ 说的是**长度守恒**——输入向量长度 1，输出还得是 1，否则模平方之和不再是 1，玻恩规则的账就对不上了。副产品：酉矩阵必可逆（$U^{-1}=U^\dagger$），量子计算因此**原则上不丢失信息**——这是它和经典逻辑门的深刻分野。

## 4. 分步例题

**例 1**：手算 $H\lvert0\rangle$。

1. 写出状态向量：$\lvert0\rangle=\begin{pmatrix}1\\0\end{pmatrix}$；
2. 第一行乘向量：$\frac{1}{\sqrt2}(1\cdot1+1\cdot0)=\frac{1}{\sqrt2}$；
3. 第二行乘向量：$\frac{1}{\sqrt2}(1\cdot1+(-1)\cdot0)=\frac{1}{\sqrt2}$；
4. 结果 $\frac{1}{\sqrt2}\begin{pmatrix}1\\1\end{pmatrix}$：两个振幅等大——下一课将看到它测出 0/1 各半。

**例 2**：手算门链 $Z \cdot H \lvert0\rangle$（先 H 后 Z）。

1. 例 1 已算出中间态 $\frac{1}{\sqrt2}(1,\ 1)^T$；
2. Z 门给第二个振幅乘 $-1$：得 $\frac{1}{\sqrt2}(1,\ -1)^T$；
3. 读结果：振幅一正一负、模平方仍各半——**概率与上一例相同，相位相反**。这个差别现在隐形，干涉时显形；
4. 顺带验算矩阵版：$ZH=\frac{1}{\sqrt2}\begin{pmatrix}1&1\\-1&-1\end{pmatrix}$，左乘 $\lvert0\rangle$ 得同一列向量 ✓。

## 5. 动手实验

X 门在平面上的动作一目了然：小房子被沿对角线镜像，$(1,0)$ 和 $(0,1)$ 两点互换——这正是"翻转"的几何本体：

```viz
{
  "type": "matrix",
  "title": "X 门＝交换两坐标的镜像动作",
  "a": 0,
  "b": 1,
  "c": 1,
  "d": 0
}
```

### 实验 1（python）：手写矩阵乘复向量

```python title="双循环实现量子门"
import math

# 复数向量用 Python 列表装复数表示；矩阵用"列表的列表"按行存放
def mat_vec(M, v):                     # def 定义函数（出生证明在第 8 章）
    out = []
    for row in M:                      # 逐行取出矩阵的行
        s = 0 + 0j                     # 累加器从复数零起步
        for k in range(len(row)):      # len(row)：这一行有几个元素
            s = s + row[k] * v[k]      # 行元素乘向量分量再累加
        out.append(s)
    return out

inv_sqrt2 = 1 / math.sqrt(2)
X = [[0, 1], [1, 0]]
Z = [[1, 0], [0, -1]]
H = [[inv_sqrt2, inv_sqrt2], [inv_sqrt2, -inv_sqrt2]]

ket0 = [1, 0]
after_H = mat_vec(H, ket0)
print(f"H|0> = [{round(after_H[0].real, 4)}, {round(after_H[1].real, 4)}]")

after_ZH = mat_vec(Z, after_H)
print(f"ZH|0> 实部 = [{round(after_ZH[0].real, 4)}, {round(after_ZH[1].real, 4)}]")
print(f"ZH|0> 虚部 = [{round(after_ZH[0].imag, 4)}, {round(after_ZH[1].imag, 4)}]")
```

第二行输出 $[0.7071, -0.7071]$，与例 2 手算严丝合缝。整个实现没有借助任何线性代数库——矩阵乘法本来就是两层循环的事。

### 实验 2（python）：酉性体检与恒等式 HZH = X

```python title="验证 H 是酉矩阵，且 H·Z·H = X"
import math

def mat_mul(A, B):
    n = len(A)
    m = len(B[0])
    inner = len(B)
    out = []
    for i in range(n):
        row = []
        for j in range(m):
            s = 0
            for k in range(inner):
                s = s + A[i][k] * B[k][j]
            row.append(round(s, 10))   # 抹掉浮点尘埃便于阅读
        out.append(row)
    return out

inv_sqrt2 = 1 / math.sqrt(2)
H = [[inv_sqrt2, inv_sqrt2], [inv_sqrt2, -inv_sqrt2]]
Z = [[1, 0], [0, -1]]
X = [[0, 1], [1, 0]]

print("HZH =", mat_mul(mat_mul(H, Z), H))
print("X   =", X)
```

`HZH` 打印出来恰是 X——三道工序合成一次翻转。这类"门代数"恒等式是优化量子线路的主要手段：能合并的门别多跑。

### 快问快答

```quiz
哪个门能把确定态 |0> 变成 0/1 各半的叠加？
- X
- Z
- H [*]
? 例 1 刚算过：H|0> 的两个振幅都是 1/√2，模平方各为 1/2。
```

:::warning[常见误区]

**误区一**："你以为 H 是'半次翻转'。" H 与 X 没有数量关系：$HH=I$（做两次回到原状），而两次 X 也回原状——但 H 的本领是**在基之间搬运叠加**，X 只会交换。说 H 是"半 X"，就像说旋转 90° 是"半次平移"。

**误区二**："你以为 Z 门没用——它没改变任何概率。" 单独看确实测不出，但夹在两个 H 之间就现形为 X（实验 2）。相位是看不见的货币，干涉是兑现的时刻（下一课的贝尔态全靠它）。

**误区三**："你以为任何可逆矩阵都能当量子门。" 可逆不够，还要**保内积**：$\begin{pmatrix}2&0\\0&1/2\end{pmatrix}$ 可逆，却把长度为 1 的向量拉成别的长度——概率总和崩了，不能上岗。

:::

## 6. 练习

**练习 1**：初始代码的矩阵乘向量在第二行漏乘了一个元素，能跑但结果残缺。补全它：

```exercise
# @title: 练习：修复 H 门对 |1> 的作用
# @check: 0.7071
# @check: -0.7071
# @hint: 矩阵乘向量的每一行都要完整地"行乘列"：第二行应累加 H[1][0]*ket0[1] 与 H[1][1]*ket0[1] 两项；负号藏在第二列。
import math

H = [[1 / math.sqrt(2), 1 / math.sqrt(2)],
     [1 / math.sqrt(2), -1 / math.sqrt(2)]]
ket1 = [0, 1]

out = [H[0][0] * ket1[0] + H[0][1] * ket1[1],
       H[1][0] * ket1[0]]                # ← 错在这：第二行少加了 H[1][1]*ket1[1]
print(round(out[0], 4))
print(round(out[1], 4))
```

修好后读一读输出：$H\lvert1\rangle=\frac{1}{\sqrt2}(1,-1)^T$——振幅一正一负，那个负号正是 Z 门与干涉戏法的火种。

<details>
<summary>练习 1 解法</summary>

```python
import math

H = [[1 / math.sqrt(2), 1 / math.sqrt(2)],
     [1 / math.sqrt(2), -1 / math.sqrt(2)]]
ket1 = [0, 1]
out = [H[0][0] * ket1[0] + H[0][1] * ket1[1],
       H[1][0] * ket1[0] + H[1][1] * ket1[1]]
print(round(out[0], 4))
print(round(out[1], 4))
```
</details>

**练习 2**：证明 Z 门满足 $ZZ=I$，并解释"Z 门的自逆"在物理上意味着什么。

<details>
<summary>点开查看逐步解答</summary>

$$ZZ=\begin{pmatrix}1&0\\0&-1\end{pmatrix}\begin{pmatrix}1&0\\0&-1\end{pmatrix}=\begin{pmatrix}1&0\\0&(-1)(-1)\end{pmatrix}=I$$

矩阵层面就是 $(-1)^2=1$。物理含义：连续做两次相位翻转等于没做——就像照两次镜子回到自己。所有量子门都可逆，且逆还是量子门（酉矩阵的逆 $U^\dagger$ 依然酉），这保证量子线路里没有任何操作是"覆水难收"的。

用代码验一遍：

```python
print([[1, 0], [0, -1]][0])
print([0 * 1 + (-1) * 0, 0 * 0 + (-1) * (-1)])
```
</details>

## 7. 选读：酉性的代数面孔

<details>
<summary>选读 · 列向量正交归一</summary>

$U^\dagger U=I$ 展开成分量语言：**各列向量彼此正交，且都是单位长度**（复数版的正交：内积为零要取共轭）。对 2×2 情形，设两列为 $u,v$，条件即 $\langle u,u\rangle=\langle v,v\rangle=1$ 且 $\langle u,v\rangle=0$。

检验 H：两列都是 $(\frac{1}{\sqrt2},\pm\frac{1}{\sqrt2})$，各自长度平方 $\frac12+\frac12=1$ ✓；内积 $\frac12-\frac12=0$ ✓。几何图像随之而来：**每个量子门都是布洛赫球的一次刚体旋转**（差一个全局相位）——量子计算就是一场精确的指针芭蕾。

</details>

## 8. 下一站

一个比特再花样翻新也只是抽签。真正的魔法发生在**两个**比特之间：它们的联合状态可以缠成一个无法拆分的整体——纠缠，以及那道让爱因斯坦不服的贝尔不等式。

→ [纠缠与贝尔不等式一瞥](./40-entanglement-bell.md)
