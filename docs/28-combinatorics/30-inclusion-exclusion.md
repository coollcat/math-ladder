---
title: 容斥原理
lesson_id: combinatorics/inclusion-exclusion
prereqs:
  - combinatorics/permutations-combinations
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
  - inclusion-exclusion
applications:
  - survey-analysis
  - derangements-preview
exits:
  - exam
---

# 容斥原理

## 1. 从一个场景开始

班主任做统计："报数学社的举手"——45 只手；"报物理社的举手"——38 只手。她脱口而出"共 83 人"，班长提醒：有 12 人两个社都报了，刚才举了两次手。

正确人数是 $45 + 38 - 12 = 71$。重叠的部分被数了两次，减一次才公平。当圈子从两个变成三个、四个，"减回去"的节奏会越来越讲究——这就是容斥原理的全部剧情。

## 2. 直觉解释

把两个社团画成两圈相交的 Venn 图：

- 单独加 $|A| + |B|$ 时，交集 $A \cap B$ 被浇了两次颜料；
- 减去一次交集后恰好每块地皮只涂一遍。

三个圈时节奏变成"加 - 减 + 加"：

1. 先把三个集合全加上——两两交集各被数了 **2** 次；
2. 减去每个两两交集——但三重交集 $A \cap B \cap C$ 刚才加了 3 次又减了 3 次，归零了！它明明该被数 1 次；
3. 所以最后再**加回**三重交集一次。

奇数次进出就加、偶数次就减——符号跟着交集里集合个数的奇偶走。这不是巧合，而是"每个元素按它所属集合的个数获得补偿"的精确会计制度。

## 3. 正式定义

对任意有限集合 $A, B, C$：

$$|A \cup B| = |A| + |B| - |A \cap B|$$

$$|A \cup B \cup C| = |A| + |B| + |C| - |A \cap B| - |A \cap C| - |B \cap C| + |A \cap B \cap C|$$

一般形式：$n$ 个集合的并的大小等于

$$\sum_{\emptyset \ne S \subseteq \lbrace 1,\dots,n\rbrace} (-1)^{|S|+1}\ \Bigl|\bigcap_{i \in S} A_i\Bigr|$$

即对所有非空子集求和，奇数个集合取正号、偶数个取负号。它与德摩根定律联手还能算"都不满足"的人数：

$$N(\text{全不沾}) = N_{\text{总}} - |A \cup B \cup C|$$

## 4. 分步例题

100 名同学中：语文竞赛 60 人、数学竞赛 80 人、英语竞赛 50 人；语数双修 25 人、语英 20 人、数英 15 人；三门全报 10 人。问至少报一门的有多少？

1. 三项单加：$60 + 80 + 50 = 190$；
2. 两两交集各被数两次，逐一扣除：$190 - 25 - 20 - 15 = 130$；
3. 全报者被扣过头（三次加入、三次扣除后归零），加回一次：$130 + 10 = 140$；
4. 都不报的同学：$100 - 140 < 0$？警报！说明题设数据自相矛盾——至少一门的人数不可能超过总人数。真实问卷若给出此组数据，先怀疑统计口径，再怀疑有人举了假手。**容斥公式还是数据质检员。**

## 5. 动手实验

### 实验 1（python）：让机器执行加减节奏

```python title="三门选修课的容斥核算"
lang = 60        # 语文
math_c = 80      # 数学（变量名避开内置 math 库的名字）
eng = 50         # 英语

lm = 25          # 语 ∩ 数
le = 20          # 语 ∩ 英
me = 15          # 数 ∩ 英
all_three = 10   # 三门都选

union = lang + math_c + eng - lm - le - me + all_three   # 注意别漏掉三重交集这一项
print(union)

total_students = 160
neither = total_students - union    # 德摩根收尾：总人数减“至少一门”
print(neither)
```

补上 `+ all_three` 后输出 `140` 与 `20`：160 名学生里有 20 人对三大竞赛全部置身事外。初始版本算出的 130 会让"都不选"虚增到 30——三重交集的补偿金一分都不能少。

### 实验 2（matplotlib）：三个圈的会计现场

```python title="Venn 图与七块领地的标注"
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6.5, 5))
c1 = plt.Circle((0, 0.9), 1.7, color="#3b74d6", alpha=0.4)
c2 = plt.Circle((-1.4, -0.8), 1.7, color="#e8871e", alpha=0.4)
c3 = plt.Circle((1.4, -0.8), 1.7, color="#2e7d32", alpha=0.4)
for c in (c1, c2, c3):
    ax.add_patch(c)                       # 三个圆依次钉上画布
ax.text(-0.9, 1.5, "语文", fontsize=13)
ax.text(-2.3, -1.4, "数学", fontsize=13)
ax.text(1.9, -1.4, "英语", fontsize=13)
ax.text(0, 0, "10", fontsize=14)          # 中心：三门全报
ax.text(-0.75, 0.55, "15", fontsize=12)   # 语∩数 独有带
ax.text(0.75, 0.55, "10", fontsize=12)    # 语∩英 独有带
ax.text(0, -1.05, "5", fontsize=12)       # 数∩英 独有带
ax.set_xlim(-3.4, 3.4)
ax.set_ylim(-2.8, 2.8)
ax.set_aspect("equal")
```

七个区域各有自己的"被数次数账单"：中心被加 3 减 3 加 1；花瓣被加 2 减 1；外围独占区只加 1。盯着图核对第 5 节实验的公式，每一项都有了肉身。

:::warning[常见误区]

**误区一**：你以为容斥只是"见重叠就减"。三圈以上必须交替加减；只减不加会把中心地带清零，答案偏小。

**误区二**：你以为"至少两门"要用容斥硬算。其实它 = 两两交集之和 − 2×三重交集（$25+20+15-20=40$），直接从区域账单读数即可，不必背新公式。

**误区三**：你以为数据随便编都能套公式。像例题那样算出负数"都不参加"，是数据在报警；公式不会说谎，只会揭发。
:::

## 6. 练习

```quiz
40 人中每人至少会法语或德语之一；会法语 28 人，两种都会 9 人。会德语的有几人？
- 21 人 [*]
- 19 人
- 12 人
? 由容斥 40 = 28 + x − 9，解得 x = 21。列出方程后回代验算是计数的黄金习惯。
```

**练习 1**：某班 50 人，人人喜欢数学或物理：喜欢数学 32 人、喜欢物理 29 人。问两门都喜欢至多几人、至少几人？

<details>
<summary>点开查看逐步解答</summary>

由容斥 $\lvert M \cup P\rvert = 50 = 32 + 29 - \lvert M \cap P\rvert$ 强制交集恰为 $11$——"人人至少一门"把答案钉死了：恰好 **11** 人。若去掉"人人都喜欢"的条件，交集可以在 $11$（并集铺满全班）到 $29$（物理组整个并入数学组）之间滑动。约束越强，计数越死；约束一松，区间登场。
</details>

**练习 2**：程序想核对例题数据（160 名学生）并数出三门都不选的人数，但它漏发了三重交集的补偿金：

```exercise
# @title: 数据质检员
# @check: False
# @check: True
# @hint: 至少一门 = 三项之和 − 三个两两交集 + 三重交集。初始代码少了 + all_three，于是“全不选”虚增 10 人。
lang = 60
math_c = 80
eng = 50
lm, le, me = 25, 20, 15     # 多变量赋值：一行同时给三个名字发值
all_three = 10
total_students = 160

union = lang + math_c + eng - lm - le - me    # ← 问题在这：少了 + all_three

print(total_students - union == 30)   # 质检线 A：“全不选”不该是 30
print(total_students - union == 20)   # 质检线 B：正确答案是 20
```

修好后两行分别输出 `False` 和 `True`——初始版本把 10 位全选同学错划进了"全不选"。再把 `all_three` 改成 `0` 跑一次，两条质检线同时翻脸，体会这一项对账本的杠杆作用。

## 7. 选读：错位排列——容斥的高光时刻

<details>
<summary>选读 · 谁都没坐对自己的座位</summary>

$n$ 位观众寄存帽子，随机归还，问"无人拿对"有多少种方式？用容斥：全体排列 $n!$ 中减去"第 $i$ 人拿对"的事件（固定一人后有 $(n-1)!$ 种），但两人同时拿对被减了两次需加回……最终得到

$$D_n = n!\left(1 - \frac{1}{1!} + \frac{1}{2!} - \cdots + (-1)^n \frac{1}{n!}\right)$$

当 $n$ 增大，$D_n/n!$ 迅速逼近 $1/e \approx 0.3679$——概率论里最优雅的极限之一。容斥的"加减交替"在指数级细节中收敛出常数 $e$，这是它最惊艳的舞台。
</details>

## 8. 下一站

83 个人挤进 82 个座位必然有人站着——连具体怎么坐都不用知道。下一课研究这种"不看过程、只认抽屉"的暴力美学：鸽笼原理。

→ [鸽笼原理](./40-pigeonhole.md)
