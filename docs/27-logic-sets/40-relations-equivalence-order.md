---
title: 关系、等价与序
lesson_id: logic-sets/relations-equivalence-order
prereqs:
  - logic-sets/set-algebra
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - relation-properties
  - equivalence-relation
  - partition
  - partial-order
applications:
  - data-clustering
  - task-scheduling
exits:
  - research
---

# 关系、等价与序

## 1. 从一个场景开始

同一个班级里藏着两套完全不同的"关系网"：

- "和我在同一个小组"——把全班切成几个互不重叠的小圈子，圈里人人平等；
- "比我高年级"——没有圈子，只有台阶：一年级 < 二年级 < 三年级，谁高谁低一清二楚。

前一种关系擅长**分类**（数据库分组、聚类算法），后一种关系擅长**排序**（任务依赖、排行榜）。本课给这两类关系做体检，看看它们各自必须通过哪几项指标。

## 2. 直觉解释

一个二元关系 $R$ 就是集合内部的一张"✓/×"表格：行是发起者 $a$，列是接收者 $b$，格子打勾表示 $a\,R\,b$。三项体检指标用肉眼就能看图识别：

- **自反**：对角线全打勾——每个人都和自己有关系（自己等于自己）；
- **对称**：表格沿对角线镜像——$a$ 勾了 $b$，$b$ 必勾回 $a$（像握手）;
- **传递**：只要 $a \to b \to c$ 两段都通，$a \to c$ 就不许缺席（近亲的近亲还是近亲）。

三条全过 = **等价关系**：它的使命是把集合切分成等价类，类内一律平等、类间互不相交。只过自反 + 传递、且坚决不对称的关系叫**偏序**：它的使命是搭台阶。对称与反对称的分野，正是"圈子"与"台阶"的分野。

## 3. 正式定义

设 $R \subseteq A \times A$ 是集合 $A$ 上的二元关系。

| 性质 | 定义 | 直观 |
| --- | --- | --- |
| 自反 | $\forall a,\ a\,R\,a$ | 对角线全 1 |
| 对称 | $a\,R\,b \Rightarrow b\,R\,a$ | 矩阵关于对角线对称 |
| 传递 | $a\,R\,b \wedge b\,R\,c \Rightarrow a\,R\,c$ | 有中转必有直达 |

- 三者兼备 → **等价关系**，记作 $\sim$。元素 $a$ 的**等价类** $[a] = \lbrace x : x \sim a\rbrace$。全体等价类构成 $A$ 的**划分**：互不相交、并起来恰是 $A$。
- 自反 + 反对称（$a\,R\,b$ 且 $b\,R\,a$ 则 $a=b$）+ 传递 → **偏序**，记作 $\le$；若再要求任意两元素可比，则为**全序**。

核心定理（划分 ↔ 等价）：每个等价关系给出一个划分；每个划分也按"同块即相关"定义出一个等价关系。两种描述一一对应。

## 4. 分步例题

在 $A = \lbrace 0,1,2,3,4,5\rbrace$ 上考虑"模 3 同余"关系 $a \sim b \Leftrightarrow 3 \mid (a-b)$。

1. 自反？$3 \mid 0$ 恒成立，对角线全通 ✓；
2. 对称？$3\mid(a-b)$ 推出 $3 \mid (b-a)$（差个正负号而已）✓；
3. 传递？$3\mid(a-b)$ 且 $3\mid(b-c)$ 时两差相加得 $a-c$，仍被 3 整除 ✓；
4. 所以它是等价关系。等价类恰好三个：$\lbrack 0\rbrack = \lbrace 0,3\rbrace$，$\lbrack 1\rbrack = \lbrace 1,4\rbrace$，$\lbrack 2\rbrack = \lbrace 2,5\rbrace$——六个人被切成三间宿舍，每间内部"同余"，房间之间零重叠。

对照反例："不超过" $\le$ 在同一集合上自反、传递、反对称，但不对称（$1 \le 2$ 而 $2 \not\le 1$）——它是偏序，画出哈斯图就是一条链子。

## 5. 动手实验

### 实验 1（viz）：关系体检仪

```viz
{
  "type": "relation-checker",
  "title": "点出来的关系体检",
  "elements": ["0", "1", "2"],
  "pairs": [["0", "1"], ["1", "0"], ["1", "2"], ["2", "1"]]
}
```

初始关系确实对称——$0 \leftrightarrow 1$、$1 \leftrightarrow 2$ 都是双向边；但传递灯先红了：$0 \to 1 \to 2$ 走得通，$0 \to 2$ 这条直达近道却缺席（反向同理）。顺便留意反对称灯——它此刻已经是红的，$0 \leftrightarrow 1$ 这对双向边正是它的死穴，待会儿补自反对角线也救不了它。现在动手修补：点亮 $(0,2)$ 和 $(2,0)$，补近道的同时保住对称；再点「补自反对角线」填满对角线——自反、对称、传递三盏灯齐绿，反对称红灯常亮。这正是等价关系的模样；而偏序走的是另一条路：自反、反对称、传递，唯独不要对称。

### 实验 2（python）：关系体检仪

```python title="三项性质逐一体检"
relations = [
    [1, 1, 0],
    [1, 1, 1],
    [0, 1, 1],
]                                  # 行=发起者 i，列=接收者 j；1 表示 i R j

reflexive = True
for i in range(3):
    if relations[i][i] != 1:       # 只看对角线
        reflexive = False

symmetric = True
for i in range(3):
    for j in range(3):
        if relations[i][j] != relations[j][i]:   # 检查镜像位是否一致
            symmetric = False

transitive = True
for i in range(3):
    for k in range(3):
        reachable = False          # 先假设 i 到 k 没有任何中转路径
        for j in range(3):
            if relations[i][j] == 1 and relations[j][k] == 1:
                reachable = True   # 找到中转 j：i→j→k 两段皆通
        if reachable and relations[i][k] == 0:   # 能中转却没有直达 => 违反传递性
            transitive = False

print("自反: " + str(reflexive))   # str()：把布尔值转成文字再拼接
print("对称: " + str(symmetric))
print("传递: " + str(transitive))
```

输出 `自反: True`、`对称: True`、`传递: False`。这张表是"互为好友或同组"？可惜传递性掉链子：小明连小红、小红连小刚，小明却没连小刚——朋友圈不满足近亲传递。

### 实验 3（matplotlib）：把关系画成热力图

```python title="两个关系矩阵的对比"
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(8, 3.6))   # 一排两张子图
same_group = [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 1, 1],
]                                   # “同小组”：块状对角 => 划分的样子
not_later = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [1, 1, 1, 0],
    [1, 1, 1, 1],
]                                   # “年级不超过我”：下三角 => 台阶的样子
axes[0].imshow(same_group, cmap="Greens")     # imshow：把数字矩阵涂成色块
axes[0].set_title("equivalence: blocks")
axes[1].imshow(not_later, cmap="Blues")
axes[1].set_title("order: triangle")
```

左图的对角色块一眼暴露划分（两间宿舍）；右图的三角形是偏序的标准剪影——反对称让矩阵只能在一半区域放 1。**形状即性质**，这是矩阵视角的最大红利。

:::warning[常见误区]

**误区一**：你以为"不是对称关系"就等于"反对称"。其实两者可以都不成立：$a\,R\,b$ 与 $b\,R\,a$ 部分共存部分不共存时，既不对称也不反对称。

**误区二**：你以为等价类可以部分重叠。其实类的重叠必然导致重合：若 $x$ 同时属于 $[a]$ 和 $[b]$，由传递性可证 $[a] = [b]$——要么全同，要么毫无交集。

**误区三**：你以为偏序里任何两个元素都能比大小。那是全序的特权；偏序允许"不可比"——比如任务依赖图里两个互不牵制的任务，谁先谁后随你挑。

:::

## 6. 练习

```quiz
“互为笔友”在人群上通常满足哪条性质？
- 自反：自己不算自己的笔友
- 对称：你是我笔友则我是你的 [*]
- 传递：我和你、你和他是笔友，我和他未必是
? 笔友关系通常对称，但不自反，也未必传递；三条都过不了，所以它不是等价关系。
```

**练习 1**：证明"绝对值相等"是实数集上的等价关系，并写出 3 的等价类。

<details>
<summary>点开查看逐步解答</summary>

自反：$|x| = |x|$ 平凡成立。对称：$|x|=|y|$ 与 $|y|=|x|$ 是同一句话。传递：$|x|=|y|$ 且 $|y|=|z|$ 则 $|x|=|z|$。全部通过，是等价关系。$[3] = \lbrace 3, -3\rbrace$——绝对值把数轴折叠起来，每一对镜像点合并成一个类。
</details>

**练习 2**：实验 1 的体检仪已经能跑，但它漏了一项常见检查——**反对称**。补一段代码，判断示例矩阵是否反对称：

```exercise
# @title: 补写反对称检查
# @check: 自反: True
# @check: 对称: True
# @check: 反对称: False
# @hint: 反对称要求：i≠j 时 relations[i][j] 和 relations[j][i] 不能同时为 1。注意它与“对称”并不矛盾地同时被检查。
relations = [
    [1, 1, 0],
    [1, 1, 1],
    [0, 1, 1],
]

reflexive = True
for i in range(3):
    if relations[i][i] != 1:
        reflexive = False

symmetric = True
for i in range(3):
    for j in range(3):
        if relations[i][j] != relations[j][i]:
            symmetric = False

print("自反: " + str(reflexive))
print("对称: " + str(symmetric))

antisymmetric = True
for i in range(3):
    for j in range(3):
        if i != j:                          # ← 问题在这：条件骨架已给好，请补上“双向都是 1 就违规”的判断
            pass                            # pass：占位语句，暂时什么都不做
print("反对称: " + str(antisymmetric))
```

修好后第三行输出 `反对称: False`——因为 0→1 与 1→0 双双打通。把矩阵换成上一节 `not_later` 的下三角再试，应输出 `True`。

## 7. 选读：商集——把等价类当作新元素

<details>
<summary>选读 · 一个集合的"压缩包"</summary>

给定等价关系后，把每个等价类**整体看作一个新元素**，收集起来的集合叫商集 $A/\sim$。"模 3 同余"把六个整数压成三个类；整数模 $n$ 的商集正是第 10 章时钟算术的正式户口。更妙的是：线性空间对"平行向量"取商得到射影几何，连续函数对"差一个零测集"取商得到 $L^p$ 空间——**先分类、再把类当点**，是现代数学反复使用的升维杠杆。
</details>

## 8. 下一站

关系负责组织对象，函数则是纪律最严明的关系。下一课给函数颁发三枚勋章——单射、满射、双射，并让它们回答一个问题：什么叫"一样多"？

→ [函数、单射满射与双射](./50-functions-injective-surjective.md)
