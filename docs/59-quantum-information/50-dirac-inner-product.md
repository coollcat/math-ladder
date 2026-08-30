---
title: 复内积空间回顾与 Dirac 记号
lesson_id: quantum-information/dirac-inner-product
prereqs:
  - complex/plane
  - functional-analysis/inner-product-hilbert
  - quantum-information/single-qubit-gates
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
  - bra-ket-notation
  - conjugate-transpose
applications:
  - quantum-computing
exits:
  - quantum-information/bloch-sphere
---

# 复内积空间回顾与 Dirac 记号

## 1. 从一个场景开始

开学第一课你领到一个笔袋：第 12 章的复数是圆珠笔，第 26 章的内积是直尺，第 11 章的列向量是橡皮筋。量子信息这门课前五讲一直在"随借随还"地用它们——本课把这三样工具正式装进一个书包，再给书包换一套新墨水。

新墨水叫**狄拉克记号**（Dirac notation）：物理学家嫌每次写"取转置、再逐项取共轭"太啰嗦，索性发明了一对会咬合的括号——右矢 $\lvert\psi\rangle$ 装状态，左矢 $\langle\phi\rvert$ 负责"打分"。两个一扣紧，$\langle\phi\rvert\psi\rangle$ 就是第 26 章那个内积，一分不多一分不少。墨水换了，数学一滴没变。

## 2. 直觉解释

想象插座与插头：右矢 $\lvert\psi\rangle$ 是一根竖直摆放的插头（列向量），左矢 $\langle\phi\rvert$ 是墙上横向排针的插座（行向量）。要"量合拍程度"，得把插头横过来插进去——但复数世界多一道工序：**插之前先照一次镜子**，把每个分量换成共轭（虚部翻号）。这面镜子就是共轭的物理意义所在：它保证自己和自己的合拍度 $\langle\psi\rvert\psi\rangle$ 永远是一个非负实数，可以当长度尺用。

为什么不照镜子的普通转置不行？给个反例尝尝：若左矢只是"躺平"不共轭，那 $\langle\psi\rvert\psi\rangle=\alpha^2+\beta^2$ 对 $\psi=(1,i)$ 会算出 $0$——一根明明存在的指针被记成长度为零，玻恩规则当场崩盘。照过镜子后得到 $1+1=2$ ✓。镜面咬合不是审美，是地基。

## 3. 正式定义

给定二维复向量，狄拉克记号的完整对照表：

$$\lvert\psi\rangle=\alpha\lvert0\rangle+\beta\lvert1\rangle,\qquad \langle\psi\rvert=\alpha^*\langle0\rvert+\beta^*\langle1\rvert,\qquad \langle\phi\rvert\psi\rangle=\alpha_\phi^*\,\alpha_\psi+\beta_\phi^*\,\beta_\psi$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\lvert\psi\rangle$ | 右矢（ket） | 列向量，旧朋友换新写法 |
| $\langle\psi\rvert$ | 左矢（bra） | 右矢的**共轭转置**：先虚部翻号，再竖躺为横 |
| $\langle\phi\rvert\psi\rangle$ | 内积（bra+ket 扣合） | 一个复数：分量的"共轭加权吻合度" |
| $\langle\psi\rvert\psi\rangle$ | 长度平方 | 恒为非负实数；单位态时恰为 1 |
| $U^\dagger$ | 共轭转置推广到矩阵 | 第 30 课酉矩阵条件 $U^\dagger U=I$ 里的那一撇 |

bra 与 ket 一扣合就叫"bra-ket"，拆开念正是 bracket（括号）——狄拉克的命名冷幽默。关键纪律只有一条：**遇到 bra，先共轭再相乘**，顺序错则概率全错。

## 4. 分步例题

**例 1**：记 $\lvert+\rangle=1/\sqrt2\,(\lvert0\rangle+\lvert1\rangle)$，手算 $\langle0\vert+\rangle$ 与 $\langle+\vert+\rangle$。

1. 写出左矢：$\langle0\rvert=(1,\ 0)$，$\lvert+\rangle$ 的列向量是 $(1/\sqrt2,\ 1/\sqrt2)^T$；
2. 实数情形共轭不动：$\langle0\vert+\rangle=1\cdot1/\sqrt2+0\cdot1/\sqrt2=1/\sqrt2$；
3. 自检归一化：$\langle+\vert+\rangle=1/2+1/2=1$ ✓ 这就是"单位态当长度尺"的兑现；
4. 翻译成玻恩规则："对 $\lvert+\rangle$ 测出 0 的概率"＝$\lvert\langle0\vert+\rangle\rvert^2=1/2$——上一章的概率公式，如今一行点乘就吐出来。

**例 2**：相对相位如何在内积里现形。设 $\lvert-\rangle=\frac{1}{\sqrt2}(\lvert0\rangle-\lvert1\rangle)$，求 $\langle+\vert-\rangle$。

1. $\langle+\rvert=1/\sqrt2\,(1,\ 1)$（实数，共轭不添乱）；
2. 扣合：$(1\cdot1+1\cdot(-1))/2=(1-1)/2=0$；
3. 读结论：两个"看起来都很均匀"的状态居然**正交**——在彼此的眼里对方完全透明；
4. 这正是 H 门的本职：它在 $\lvert0\rangle,\lvert1\rangle$ 基和 $\lvert+\rangle,\lvert-\rangle$ 基之间搬运描述。谁跟谁正交，从来不是"振幅大小"说了算，而是**相位差**——干涉的总开关，两课后正式开闸。

## 5. 动手实验

先用实向量找找"合拍度"的手感（实数的共轭是它自己，所以这儿看不出镜子，纯练点积直觉）：

```viz
{
  "type": "dotprod",
  "u": [3, 4],
  "v": [2, -1]
}
```

拖动蓝绿两支箭头：锐角绿色读数为正、钝角红色为负、垂直灰色归零。记住这个读数语义——下面换成复数后，"颜色"会藏在虚部里，但"角度定生死"不变。

### 实验（python）：共轭这道镜子工序

```python title="手搓 bra 与 ket 的扣合"
u = [3 + 4j, 0 + 0j]        # 右矢 |u>：两个复振幅
v = [1 + 1j, 2 + 0j]        # 右矢 |v>

# .conjugate()：取共轭——虚部翻号，这是 bra 的出厂设置
inner = u[0].conjugate() * v[0] + u[1].conjugate() * v[1]
print("内积 =", round(inner.real, 4), "+", round(inner.imag, 4), "i")

nu = abs(u[0]) ** 2 + abs(u[1]) ** 2      # 自己扣自己 = 长度平方
nv = abs(v[0]) ** 2 + abs(v[1]) ** 2
print("|u|^2 =", round(nu, 4), " |v|^2 =", round(nv, 4))

overlap_sq = round(abs(inner) ** 2 / (nu * nv), 4)   # 归一化重合度
print("归一化重合度 =", overlap_sq)
```

顺手验一条守恒律：交换左右箭头，内积应变成自己的共轭——`inner` 的实部不变、虚部翻号。跑完可以用同一句代码对调 `u`、`v` 复查。

### 快问快答

```quiz
从右矢变出左矢，正确工序是什么？
- 直接转置，矩阵横过来就行
- 先逐项取共轭，再转置成行向量 [*]
- 左矢是全新的对象，和右矢没有换算关系
? 共轭转置的镜子步骤不可省略，否则自己和自己都可能算出零或负数，长度尺失灵。
```

:::warning[常见误区]

**误区一**："你以为左矢就是转置。" 少了共轭这一步，$\langle\psi\rvert\psi\rangle$ 可以是零甚至任何东西；共轭保证了"自合拍恒正"这条底线。

**误区二**："你以为内积是个实数。" 复内积一般带虚部——虚部编码的是两条路径之间的**相位差账目**。真正直接当概率用的永远是它的模平方。

**误区三**："你以为 braket 只是换个写法好看。" 它是把'变换、对偶、投影'统一成代数的坐标纸：门作用写成 $U\lvert\psi\rangle$，期望值写成 $\langle\psi\rvert U^\dagger U\lvert\psi\rangle$，酉性 $U^\dagger U=I$ 当场变成一句'总长不变'的自检口令。

:::

## 6. 练习

**练习 1**：下面的代码想判断 $\lvert u\rangle=[1+i,\ i]$ 与 $\lvert v\rangle=[2,\ 1+i]$ 是否平行（即只差一个全局相位）。能跑，但它忘了 bra 的镜子工序——修到两个输出都正确为止：

```exercise
# @title: 练习：给内补上镜子工序
# @check: 18.0
# @check: 1.0
# @hint: 左矢的每一项都要先 .conjugate() 再去乘；第一行该输出内积模平方的四舍五入值，第二行的比值贴着 1 就说明只差全局相位。
u = [1 + 1j, 1j]
v = [2 + 0j, 1 + 1j]

inner = u[0] * v[0] + u[1] * v[1]       # ← 错在这：bra 忘了共轭
num = round(abs(inner) ** 2, 2)
print(num)

nu = abs(u[0]) ** 2 + abs(u[1]) ** 2
nv = abs(v[0]) ** 2 + abs(v[1]) ** 2
ratio = round(num / (nu * nv), 4)
print(ratio)
```

修好后读输出：模平方是 18.0，而 $\lVert u\rVert^2\lVert v\rVert^2=3\times6=18$，比值归一——两个状态互相之间"完全重叠"，即只差一个可忽略的全局相位。

<details>
<summary>练习 1 解法</summary>

```python
u = [1 + 1j, 1j]
v = [2 + 0j, 1 + 1j]

inner = u[0].conjugate() * v[0] + u[1].conjugate() * v[1]   # bra 先照镜子
num = round(abs(inner) ** 2, 2)
print(num)

nu = abs(u[0]) ** 2 + abs(u[1]) ** 2
nv = abs(v[0]) ** 2 + abs(v[1]) ** 2
ratio = round(num / (nu * nv), 4)
print(ratio)
```
</details>

**练习 2**：不写代码，仅凭共轭的定义回答：$\langle u\vert v\rangle$ 与 $\langle v\vert u\rangle$ 一定相等吗？它们之间有什么确定关系？

<details>
<summary>点开查看逐步解答</summary>

不必相等，但必有 $\langle v\vert u\rangle=\langle u\vert v\rangle^*$——互换左右等于整个表达式做一次镜像：实部不变、虚部翻号。证明只要一行：把内积展开成 $\sum_j u_j^* v_j$，所有项换成下标对调，正是逐项取共轭后的原式。

推论：**只有内积为实数的一对态才谈得上"对称"**；一般情况里先后有主次之分。用 Python 三行验证：

```python
u = [1 + 2j, 0 + 0j]
v = [0 + 1j, 1 + 0j]
a = u[0].conjugate() * v[0] + u[1].conjugate() * v[1]
b = v[0].conjugate() * u[0] + v[1].conjugate() * u[1]
print(round(a.real, 4), round(a.imag, 4))
print(round(b.real, 4), round(b.imag, 4))   # 实部相同、虚部相反
```
</details>

## 7. 选读：酉条件的 bra 语言速记

<details>
<summary>选读 · 用左矢重写一遍"门要合格"</summary>

第 30 课要求门矩阵满足 $U^\dagger U=I$，当时按矩阵行列硬验。现在换成 bra 语言：任取输入 $\lvert\psi\rangle$，输出是 $U\lvert\psi\rangle$，其长度平方为

$$\langle\psi\rvert U^\dagger U\lvert\psi\rangle=\langle\psi\rvert I\lvert\psi\rangle=\langle\psi\rvert\psi\rangle=1$$

中间夹着的 $U^\dagger U$ 像一枚"回程票"：先逆行再顺行必须精确抵消。换句话说，**保长度的门＝存在完美逆向的门**，这正好兑现了第 30 课"量子计算原则上不丢信息"的承诺。对 $H$ 手算一组即可置信：它的两列各自自合拍为 1、互扣为零，就是"列向量正交归一"的复数版说法。

</details>

## 8. 下一站

书包收好、墨水换毕。单比特的全部几何如今可以画进一颗星球：北极南极定轴，赤道走经度，每一个门都是一次拧动。

→ [Bloch 球：单量子比特的几何地图](./60-bloch-sphere.md)
