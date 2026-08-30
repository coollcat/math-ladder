---
title: 加法与交换律
lesson_id: arithmetic/addition
prereqs:
  - python-tools/conventions
  - python-tools/matplotlib
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 加法与交换律

## 1. 从一个场景开始

你很早遇见过 $1+1$。现在不妨停一秒看看：$3+5$ 和 $5+3$ 凭什么相等？"先给 3 个再给 5 个"和"先给 5 个再给 3 个"，结果总是一样吗？还是只是碰巧一样？

这种"看起来显然"的事，恰恰值得慢慢看清——后面许多更深的数学结论，也会从这样安静的观察里长出来。

## 2. 直觉解释

加法就是**数轴上向右跳**。

- $3+5$：从 0 出发，先右跳 3 步到 3，再右跳 5 步，落在 8。
- $5+3$：从 0 出发，先右跳 5 步，再右跳 3 步——还是落在 8。

跳的顺序不影响落点。另一种图像：把两堆石子合并成一堆——先倒哪堆不重要，总数一样。

## 3. 正式定义

**记号**：把"a 加 b"写作 $a+b$，读作"a 加 b"。相加的每个数叫**加数**，结果叫**和**。

自然数上的加法由"继续往后数"定义：

$$a + 0 = a, \qquad a + (k+1) = (a+k) + 1$$

翻译成人话："加 0 不变；加 $k{+}1$ 就是先加 $k$ 再多走一步。" 这两行是加法的**出生证明**（选读部分会看到交换律如何从中长出来）。

加法三条基本性质：

| 性质 | 内容 | 名字 |
| --- | --- | --- |
| 交换律 | $a+b=b+a$ | 换位置不变 |
| 结合律 | $(a+b)+c=a+(b+c)$ | 先算谁都不变 |
| 单位元 | $a+0=a$ | 0 是"加了白加" |

## 4. 分步例题

**例**：计算 $47 + 38$。

1. 拆开：$47 = 40+7$，$38 = 30+8$
2. 十位加十位：$40+30=70$
3. 个位加个位：$7+8=15$
4. 合并：$70+15=85$

竖式里第 4 步写成"进 1"：个位写 5，向十位进 1。**竖式不是新知识，只是性质 2、3 的记账格式。**

## 5. Python 验证

### 实验 1：交换律大规模抽查

```python title="随机抽一万对数验证 a+b == b+a"
import random

ok_count = 0
for trial in range(10000):
    a = random.randint(0, 999)
    b = random.randint(0, 999)
    if a + b == b + a:   # if：条件成立才执行缩进块；== 判断两边是否相等
        ok_count = ok_count + 1

print(f"10000 对随机数中，交换律成立 {ok_count} 次")
```

一万次全部成立。但注意：抽查一万次不等于证明了它永远成立——这正是"数值实验"与"证明"的区别（选读部分给真正的理由）。

### 实验 2：结合律与去括号

```python title="(a+b)+c 和 a+(b+c) 相等吗"
a, b, c = 128, 372, 500   # 多变量赋值：逗号右侧的值按顺序赋给左侧变量
print(f"(a+b)+c = {(a + b) + c}")
print(f"a+(b+c) = {a + (b + c)}")

d, e, f = 3, 17, 80       # 同样地：d=3，e=17，f=80
print(f"换个数: {(d + e) + f} vs {d + (e + f)}")
```

结合律告诉我们括号可以随便挪——这就是为什么 $3+17+80$ 不用写任何括号。

### 实验 3：高斯问题的图形化

```python title="累加和曲线 + 一条直线"
import matplotlib.pyplot as plt

ns = list(range(1, 21))
sums = []
total = 0
for n in ns:
    total = total + n
    sums.append(total)

plt.plot(ns, sums, marker="o", label="1+2+...+n")   # label：给这条线起名字，供图例使用
plt.plot(ns, ns, linestyle="--", label="y = n")
plt.legend()   # legend：显示左上角的线名对照表，配合上面的 label
plt.grid(True)
```

虚线是 $y=n$（每步只加 1），实线越爬越陡——每次新增的量本身在变大。这个"越来越陡"的形状，8 章会用公式 $1+2+\cdots+n=\frac{n(n+1)}{2}$ 精确捕捉。

### 实验 4：把交换律画出来——两条路线，同一落点

直觉部分说"先跳 3 再跳 5"和"先跳 5 再跳 3"落点相同，眼见为实。先动手玩一玩（直接拖动数轴上的圆点）：

```viz
{
  "type": "numberline",
  "title": "a + b：两条路线，同一个落点",
  "min": -2,
  "max": 20,
  "op": "+",
  "sliders": [
    { "name": "a", "min": 0, "max": 9, "step": 1, "value": 3 },
    { "name": "b", "min": 0, "max": 9, "step": 1, "value": 5 }
  ]
}
```

想改到代码层面的同学，用下面的 Python 版（首次运行需加载运行时）：

```python title="数轴上的两种跳法"
import matplotlib.pyplot as plt  # 导入画图库，plt 是约定短名

pairs = [(3, 5), (5, 3)]  # 元组 (3, 5)：一对捆在一起的数；列表里装两对，方便循环
fig, axes = plt.subplots(2, 1, figsize=(6, 2.8))  # figsize=(宽,高)：画布尺寸（英寸），首见；同时建 2 行 1 列两张子图

for k in range(2):
    a = pairs[k][0]  # pairs[k][0]：取第 k 对里的第一个数（下标从 0 数起）
    b = pairs[k][1]  # [1]：取第 k 对里的第二个数
    ax = axes[k]
    ax.hlines(0, 0, 9, color="lightgray", linewidth=6)  # 灰色粗线当数轴
    for p in range(10):
        ax.plot(p, 0, marker="|", markersize=9, color="gray")  # 每个整数刻度画一道
    # annotate：从 xytext 指向 xy 的箭头；arrowprops 里 lw 是箭头线宽
    ax.annotate("", xy=(a, 0), xytext=(0, 0),
                arrowprops=dict(arrowstyle="->", color="steelblue", lw=2.5))
    ax.annotate("", xy=(a + b, 0), xytext=(a, 0),
                arrowprops=dict(arrowstyle="->", color="tomato", lw=2.5))
    ax.scatter([a + b], [0], s=120, color="purple", zorder=3)  # s=点的大小；zorder=叠放层级（越大越在上层）。紫点 = 落点
    ax.set_title(f"{a} + {b}: 落点 {a + b}", fontsize=9)  # fontsize：标题字号
    ax.set_ylim(-0.7, 0.9)  # set_ylim：手动定纵轴范围，只留出写字的空间
    ax.set_yticks([])  # 隐藏纵轴

plt.tight_layout()  # 自动排版，防止子图重叠
```

两张小图的紫色圆点落在**同一个位置**——这就是交换律的几何面目。你可以把 `pairs` 改成 `[(7, 2), (2, 7)]` 再跑一遍验证。

### 实验 5：加法表热力图——对称性一眼可见

把 $0$ 到 $9$ 的完整加法表算出来，再给每个和涂上颜色：

```python title="10x10 加法表的颜色地图"
import matplotlib.pyplot as plt

size = 10
table = []
for i in range(size):
    row = []
    for j in range(size):
        row.append(i + j)
    table.append(row)

plt.imshow(table, origin="lower", cmap="viridis")  # imshow：把二维表格涂成颜色地图，数值大小→颜色深浅；origin="lower" 让第 0 行画在最下面；cmap 选配色方案
plt.colorbar(label="i + j")  # colorbar：旁边的颜色刻度条，说明哪种颜色对应哪个数
plt.xlabel("j")
plt.ylabel("i")
plt.title("addition table")
```

看两个细节：**整张图沿对角线镜像对称**——因为 $i+j=j+i$，交换律直接长在了图案里；颜色相同的斜带表示"和相同"，比如从 $(0,7)$ 到 $(7,0)$ 的那条带上所有格子都是 7。

### 快问快答

```quiz
3+5 与 5+3 相等的原因是？
- 数学书规定了它们必须相等
- "往后跳 5 步再跳 3 步"和"先 3 后 5"落在同一点：交换律 [*]
- 只有在小数字时才相等
? 交换律不是规定，而是"往后数"这个动作的必然推论——选读部分给出了完整论证。
```

:::warning[常见误区]

**误区一**："交换律对减法也成立。"
$5-3=2$ 而 $3-5=$ 一个我们还不会算的东西（下一课它叫 $-2$）。就算学完负数：$5-3 \neq 3-5$。交换的是**被减数和减数的地位**，这不一样。

**误区二**：竖式进位时忘了加进上来的 1。
进位标记是小纸条备忘，正式加的时候要真加上。

**误区三**："抽查了一万次都对，所以肯定永远对。"
实验提供信心，证明提供保证。本站两者都给你，并明确标注哪个是哪个。

:::

## 6. 练习

**练习 1**：用最快的方法心算 $98 + 37$（提示：把 98 补成 100）。

<details>
<summary>点开查看逐步解答</summary>

$98 + 37 = (100 - 2) + 37 = 100 + (37 - 2) = 135$。

依据：从 98 里借 2 给 37 还回去，总和不变（结合律的应用）。
</details>

**练习 2**：算 $1+3+5+\cdots$ 的前 5 个奇数之和、前 10 个奇数之和，各打印一行。先猜猜规律再看结果：

```exercise
# @title: 练习：奇数之和
# @check: 25
# @check: 100
# @hint: 第 k 个奇数是 2k - 1；循环两轮，或把 m in [5, 10] 写成外层循环
for m in [5, 10]:              # 外层换总数：先算前 5 个，再算前 10 个
    total = 0                  # 每轮开始前把累加器清零
    for k in range(1, m + 1):  # k 依次取 1,2,…,m
        total = total + k      # ← 问题在这：加的是 k 本身，还不是第 k 个奇数
    print(total)
```

跑出来后观察：25 = $5^2$，100 = $10^2$——**前 n 个奇数的和恰是 $n^2$**！这个惊人的整齐，第 8 章归纳法一课给出证明。

**练习 3**：小明说"$a+b+c$ 一定等于 $c+b+a$"。他用的哪些性质？用一行代码验证一组具体数字。

<details>
<summary>点开查看逐步解答</summary>

先用结合律重新打括号把 c 挪出来，再用交换律换位置——两次重排，每一步都合法。

```python
a, b, c = 23, 456, 7891
print((a + b + c) == (c + b + a))
```

任意有限多个数相加，顺序、括号都自由——这是交换律与结合律合力的结果。
</details>

## 7. 选读：交换律的真正理由

<details>
<summary>选读 · 从出生证明推出交换律</summary>

回顾定义：$a+0=a$ 且 $a+(k+1)=(a+k)+1$。要证 $a+b=b+a$，思路是对 $b$ 做归纳（严格版本在第 8 章）。先证一条**移位引理**：

1. 移位引理：$a+(k+1)=(a+1)+k$。对 $k$ 归纳：$k=0$ 时左边是 $a+1$、右边是 $(a+1)+0=a+1$，相等；若 $k$ 时成立，则 $a+(k+2)=\bigl(a+(k+1)\bigr)+1=\bigl((a+1)+k\bigr)+1=(a+1)+(k+1)$，每一步都只用了定义；
2. 有了移位引理，交换律对 $b$ 归纳：基础步 $a+0=a=0+a$（右边"$0+a=a$"要对 $a$ 归纳，是零的特殊性）；归纳步则一串等号走完：$a+(b+1)=(a+b)+1$（定义）$=(b+a)+1$（归纳假设）$=b+(a+1)$（定义倒回去）$=(b+1)+a$（移位引理）。

结论：交换律**不是**凭空规定的，它是"往后数"这一动作的两个必然推论。当年皮亚诺把这层逻辑写成公理体系后，整个自然数大厦的地基就再无含糊之处。

</details>

## 8. 下一站

$3-5$ 到底等于什么？数学家的回答很有想象力：**创造一个新的数，让它有意义**。

→ [减法与负数](./20-subtract-negative.md)
