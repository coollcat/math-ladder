---
title: matplotlib 入门
lesson_id: python-tools/matplotlib
introduces_import:
  - matplotlib
  - matplotlib.pyplot
  - random
prereqs:
  - python-tools/conventions
---

# matplotlib 入门

## 1. 从一个场景开始

上一课你算出了 $1+2+\cdots+100 = 5050$。但如果把 $n=1,2,3,\dots,20$ 的结果全列出来，你能**看出**规律吗？数字一多，很难一眼看出形状——所以我们需要图。

## 2. 直觉：plot 就是"在方格纸上描点连线"

小学画过气温折线图吧？横轴日期、纵轴温度，一天一个点，连起来就是趋势。`matplotlib` 干的就是这件事，只是描点的速度是每秒几百万个。

## 3. 约定用法

本站统一这样开头：

```python title="固定开场：导入并起个短名"
import matplotlib.pyplot as plt   # as plt：给这个长库名起一个约定短名
```

`as plt` 是给这个库起了个短名，之后所有功能都通过 `plt.xxx` 调用。三个最常用的函数：

| 函数 | 作用 |
| --- | --- |
| `plt.plot(x, y)` | 把点 $(x_1,y_1),(x_2,y_2),\dots$ 用线连起来 |
| `plt.scatter(x, y)` | 只描点，不连线 |
| `plt.title / xlabel / ylabel / grid` | 加标题、轴标签、网格线 |

**不需要调用 `plt.show()`**——本站的运行器会自动把图抓出来显示（在你自己的电脑上运行时才需要 `show()`）。

x 和 y 是两组等长的列表：第 1 个 x 配第 1 个 y 组成第一个点，以此类推。

## 4. Python 验证

### 演示：累加和的形状

```python title="1+2+...+n 的结果长什么样？"
import matplotlib.pyplot as plt

ns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
sums = []
total = 0
for n in ns:
    total = total + n
    sums.append(total)   # append：往列表末尾追加一个元素——每算出一个新和就记一笔

print(f"n=10 时累加和 = {sums[-1]}")

plt.plot(ns, sums, marker="o")   # marker="o"：每个数据点画成圆点，看得更清
plt.title("triangular numbers")
plt.xlabel("n")
plt.ylabel("1+2+...+n")
plt.grid(True)
```

运行后先看到一行 `n=10 时累加和 = 55`，随后是一张向上弯的折线图。

这些点连起来像一条**向上弯的曲线**，不是直线。它到底是什么曲线？第 8 章揭晓——现在你只需要记住这种"先画出来再猜"的工作方式。

## 5. 动手实验

### 实验 1：平方数

```python title="每个数的平方"
# sliders: N=10 [2:30:1]
import matplotlib.pyplot as plt

ns = list(range(1, N + 1))   # list(range(...))：把"数列生成器"变成真正的列表；N 由滑块注入，代码里别再赋值
squares = []
for n in ns:
    squares.append(n * n)

plt.plot(ns, squares, marker="o", color="tomato")
plt.grid(True)
plt.title("n squared")
```

拖动滑块把 `N` 从 10 加到 30：曲线后半段越来越陡——平方数的增长自带"加速度"，而且画到越远处弯得越明显。曲线的"陡峭程度"不同，正是后面导数一章要精确刻画的东西。

### 实验 2：散点与自定义

```python title="scatter 与颜色"
import matplotlib.pyplot as plt

xs = [1, 2, 3, 4, 5]
ys = [3, 1, 4, 1, 5]

plt.scatter(xs, ys, color="purple")
plt.grid(True)
```

改改数据、换换颜色（`color` 可以用 `"skyblue"`、`"green"` 等英文单词），跑几次找找手感。

### 实验 3：模拟掷两个骰子：次数可调

先认识新工具：`random.randint(1, 6)` 相当于掷一次骰子——在 1 到 6 里等可能地取一个整数（随机的细节第 9 章细讲）。现在把"掷两颗骰子、求点数之和"重复 $n$ 次（次数由滑块控制），看看哪些和更常见：

```python title="掷 n 次双骰子：和的分布"
# sliders: n=100 [10:2000:10]
import random
import matplotlib.pyplot as plt

sums = []
for trial in range(n):   # n 由滑块注入：拖一下，重新掷 n 次
    die1 = random.randint(1, 6)
    die2 = random.randint(1, 6)
    sums.append(die1 + die2)

print(f"一共记录了 {len(sums)} 个和")   # len：数一数列表里装了几个元素

# hist：直方图——把数据按区间分箱、数每箱有几个；bins 指定分箱边界，rwidth 是柱宽比例
plt.hist(sums, bins=range(2, 14), align="left", rwidth=0.8, color="mediumseagreen")  # align="left"：柱子对齐在区间左端（和 bins 配合才居中）
plt.xticks(range(2, 13))             # xticks：强制横轴只在这些整数处标刻度
plt.xlabel("sum of two dice")
plt.ylabel("count")
plt.grid(True, axis="y")
```

把滑块当实验旋钮用：`n` 很小（几十次）时，柱子高矮全凭运气，每次运行长得都不一样；慢慢拖大 `n`，图形中间高、两边低的山形越来越稳，**7 稳坐峰顶**。单次投掷毫无规律，大量重复却显出稳定的形状——"乱中有序"需要足够的重复来兑现，这正是模拟的价值，第 9 章会用概率解释这座山的形状。

### 快问快答

```quiz
只描点、不连线，该用哪个函数？
- plt.plot
- plt.scatter [*]
- plt.grid
? plot 把相邻的点连成线，scatter 只留下一堆数据点；grid 负责开网格线。实验 3 里两者都摸过了。
```

:::warning[常见误区]

**误区一**：忘了写 `import matplotlib.pyplot as plt`。
第一行就是它。没有它，`plt` 这个名字根本不存在。

**误区二**：x 和 y 列表长度不一样。
`plt.plot([1,2,3], [1,2])` 会报错——点必须成对出现。

**误区三**：以为必须写 `plt.show()`。
在本站不需要；输出区的图是运行器自动捕获的。本地写脚本时才需要 `show()`。

:::

## 6. 练习

**练习 1**：画出 $y = 3n$ 在 $n=1..10$ 的图像（用循环构造列表）。它和实验 2 的曲线有什么本质区别？

<details>
<summary>点开查看逐步解答</summary>

```python
import matplotlib.pyplot as plt

ns = list(range(1, 11))
ys = []
for n in ns:
    ys.append(3 * n)

plt.plot(ns, ys, marker="o")
plt.grid(True)
```

区别：$3n$ 的图像是**直线**（每次加固定的 3），而 $n^2$ 每次加的是 $3,5,7,9,\dots$ 越加越多，所以向上弯。"增量是否恒定"区分了直线与曲线——这是第 13 章导数思想的种子。
</details>

**练习 2**：把上面“累加和”演示的 `marker="o"` 去掉、换成 `linestyle="--"` 再跑一次，观察变化。（开放题，无标准答案）

这里 `linestyle="--"` 表示用虚线连线：线条样式变了，数据点对应的形状不变。

<details>
<summary>提示</summary>

```python
import matplotlib.pyplot as plt

ns = list(range(1, 11))
sums = []
total = 0
for n in ns:
    total = total + n
    sums.append(total)

plt.plot(ns, sums, linestyle="--")
```

参数可以组合使用，比如 `color="green", linestyle="--", marker="s"`。matplotlib 的可调项非常多，但本站只用这几个基本款，够用了。
</details>

**练习 3（判题）**：画图前得先备料——构造前 4 个平方数组成的列表并整行打印。下面的代码跑是能跑，但算的是立方：

```exercise
# @title: 练习：为画图准备数据
# @check: [1, 4, 9, 16]
# @hint: 循环里多乘了一个 n；改成 append(n * n) 就好。range(1, 5) 产生 1,2,3,4
squares = []
for n in range(1, 5):
    squares.append(n * n * n)
print(squares)
```

改到输出恰好是 `[1, 4, 9, 16]` 为止。这份"备料—检查—再画图"的流程，正是所有 matplotlib 实验的固定工序。

## 7. 选读：为什么叫 pyplot？

<details>
<summary>选读 · 从 MATLAB 到 pyplot</summary>

matplotlib 库模仿了另一个老牌数学软件 MATLAB 的画图方式，`pyplot` 就是"Python 版的 plot 工具"。你只需要知道 `import matplotlib.pyplot as plt` 这一行是全世界数据分析者的共同开场白即可。

</details>

## 8. 下一站

工具齐了。现在正式开始爬阶梯：**第 1 章 · 加法**——连它都有你想不到的深意。

→ [加法与交换律](../01-arithmetic/10-addition.md)
