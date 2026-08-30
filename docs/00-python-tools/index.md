---
title: 第 0 章 · Python 工具箱与速查表
description: 写数学代码前的装备检查，外加三张随翻随用的地图：公式速查表、Python 工具索引与术语表。
---

# Python 工具箱与速查表

在爬数学阶梯之前，先把登山杖检查一遍。这一章不教新数学——你只上两门装备课：

1. [本站 Python 约定](./10-conventions.md)——把你会的基础语法对齐到"用代码研究数学"的用法上；顺便见证第一个工具 `sum()` 的诞生；
2. [matplotlib 入门](./20-matplotlib.md)——学会让数字变成图。

装备之外还有三张随翻随用的地图。**不必一次读完**：往后学卷一时忘了公式、忘了函数、忘了术语，就回来翻：

3. [公式速查表](./30-formula-sheet.md)——卷一所有公式的一行版索引，忘了就来翻；
4. [Python 工具索引](./40-python-index.md)——每个用过的函数记着用途和出生地；
5. [术语表](./50-glossary.md)——关键术语的中英对照一句话版。

学完这章，你就装好了后续动手实验最常用的编程装备；那三张地图会一直陪你走到卷一结束。

## 章节大题：把工具箱串成一条流水线

这一章没有新数学，但工具的熟练度决定后面每一章的体验。下面的代码把**变量、f-string、for 循环、累加器、def 函数、sum()** 六件装备一次性串起来——它能跑，但结果不对。把它修到三行检查全部通过：

```exercise
# @title: 章节大题：三角形数的流水线
# @check: n=10: 55
# @check: n=100: 5050
# @check: sum 验证: True
# @hint: 两处暗坑：range 想包含 n 本身要写到 n + 1；累加器是 total = total + k 而不是覆盖。最后一行拿 sum(range(...)) 和你的函数对答案。
def tri(n):
    total = 0
    for k in range(1, n):
        total = k
    return total

for n in [10, 100]:
    print(f"n={n}: {tri(n)}")

print(f"sum 验证: {tri(100) == sum(range(1, 101))}")
```

<details>
<summary>点开查看逐步解答</summary>

代码里埋了两处本章讲过的经典错误：

1. `range(1, n)` 含头不含尾，算到 $n-1$ 就停了——改成 `range(1, n + 1)`；
2. `total = k` 是**覆盖**不是累加，每轮把旧和丢掉了——改成 `total = total + k`。

修好后的完整代码：

```python
def tri(n):
    total = 0
    for k in range(1, n + 1):
        total = total + k
    return total

for n in [10, 100]:
    print(f"n={n}: {tri(n)}")

print(f"sum 验证: {tri(100) == sum(range(1, 101))}")
```

第三行检查让你亲手验证：自己写的循环和内置的 `sum()` 算出同一个 5050——这正是《本站 Python 约定》里"`sum()` 的诞生"那一段的结论。
</details>

工具箱检查完毕。下一站进入第 1 章：从加法开始，把这些装备真正用到数学问题上。

## 实战挑战 · 卷一结业综合卷

这张卷子横跨全卷一的代表性考点。如果你刚翻开本书，**先跳过这一节**——等你走过十六站、抵达傅里叶门口，再回来计时作答：先只靠自己和浮窗做完，再对答案。

**情境原创（综合第 1、3、4、8、9 章核心考点）**。「梯云奶茶」开业第一周，你既是老板又是记账员。五天的销量（单位：杯）如下：

| 周一 | 周二 | 周三 | 周四 | 周五 |
| :--: | :--: | :--: | :--: | :--: |
| 12 | 19 | 15 | 22 | 27 |

每杯售价 9 元、原料成本 5 元，店面每天固定租金 40 元。回答六个小问：

- **(a) 运算律与负数**：周三的当日利润是多少元？（利润 = 收入 − 总成本 − 租金；提示：用分配律先算每杯毛利）
- **(b) 一元一次方程**：会员日想让当日利润恰好 80 元（销量仍按周三的 15 杯计），定价应定为每杯多少元？
- **(c) 幂与求和**：「半价券裂变」活动里，知道活动的人数每周翻倍：第 1 周新增 2 人，第 2 周新增 4 人……问第几周**单周新增人数首次突破 10000**？到那一周为止，累计共有多少人知道？
- **(d) 古典概型**：店庆抽奖箱里有 5 个红球、3 个白球，摸一球，摸中红球的概率是多少？
- **(e) 统计**：计算五天销量的总体方差。
- **(f) 思辨**：有股东说"开业首日只卖出 12 杯，这家店不行"。用大数定律反驳他。

一张卷子六道输出。下面的代码每一问都留了一个坑，全部修到通过才算交卷：

```exercise
# @title: 结业综合卷 · 梯云奶茶的一周
# @check: 20
# @check: 13
# @check: 14
# @check: 32766
# @check: 0.625
# @check: 27.6
# @hint: (a) 成本是 5 元乘以杯数，别忘了再减租金；(b) 设定价 x 列方程 15×(x−5)−40=80；(c) 翻倍是乘 2 不是加 1000，累计人数把每周新增 2+4+8+…全加起来；(d) 红球才是 5 个；(e) 手头这 5 天就是全部数据，方差除以 n 不是 n−1
sales = [12, 19, 15, 22, 27]
price = 9
cost_per_cup = 5
rent = 40

profit = sales[2] * price - cost_per_cup        # (a) ← 坑一
x = 80 // 15 + cost_per_cup                     # (b) ← 坑二

new_knowers = 2                                 # (c)：第 1 周新增 2 人
week = 1
while new_knowers <= 10000:
    new_knowers = new_knowers + 1000            # ← 坑三：传播是翻倍
    week = week + 1
total_knowers = new_knowers                     # ← 坑四：这不是累计人数

p_red = 3 / 8                                   # (d) ← 坑五

mean = 0                                        # (e)
for s in sales:
    mean = mean + s
mean = mean / len(sales)
spread = 0
for s in sales:
    spread = spread + (s - mean) ** 2
variance = spread / (len(sales) - 1)            # ← 坑六

print(profit)
print(x)
print(week)
print(total_knowers)
print(p_red)
print(variance)
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** 收入 $15 \times 9$，成本 $15 \times 5$。用分配律合并：$15 \times (9-5) = 60$ 元毛利，再减租金 40，**利润 20 元**。（若某天销量低于 10 杯，这一项会变成负数——负号自动报告亏损，这正是负数的本职工作。）

**(b)** 设定价 $x$：$15(x-5) - 40 = 80 \Rightarrow 15(x-5) = 120 \Rightarrow x - 5 = 8 \Rightarrow x = 13$。验算：$15 \times 8 - 40 = 80$ ✓。

**(c)** 单周新增是 $2, 4, 8, 16, \ldots$，即第 $k$ 周新增 $2^k$ 人。要 $2^k > 10000$：$2^{13} = 8192$ 不够，$2^{14} = 16384$ 够了——**第 14 周**。累计人数是把每周新增全加起来：$2 + 4 + \cdots + 2^{14} = 2^{15} - 2 = 32766$ 人（等比求和，或直接逐周累加验证）。

**(d)** 8 个等可能结果里红球占 5 个：$P = \frac{5}{8} = 0.625$。

**(e)** 五步流程：均值 $\mu = \frac{95}{5} = 19$；偏差 $-7, 0, -4, 3, 8$（和为 0 ✓）；平方和 $49+16+9+64 = 138$；除以 $n = 5$（手头数据就是全部，用总体方差）得 **27.6**。

**(f)** 首日 12 杯只是一次随机抽样，样本量为 1 的结论全是噪音。大数定律说：只有让"天数"这个样本越滚越大，日均销量才会稳定贴向真实的期望水平。正确的做法是记录足够多天再看平均——单日波动由标准差描述，判断"行不行"要看长期均值加波动区间，而不是一天的运气。

完整参考答案：

```python
sales = [12, 19, 15, 22, 27]
price = 9
cost_per_cup = 5
rent = 40

profit = sales[2] * (price - cost_per_cup) - rent   # 20

x = (80 + rent) // sales[2] + cost_per_cup          # 13

new_knowers = 2
week = 1
while new_knowers <= 10000:
    new_knowers = new_knowers * 2                   # 翻倍传播
    week = week + 1
total_knowers = 0
for k in range(1, week + 1):
    total_knowers = total_knowers + 2 ** k          # 逐周累加 = 32766

p_red = 5 / 8                                       # 0.625

mean = 0
for s in sales:
    mean = mean + s
mean = mean / len(sales)                            # 19.0
spread = 0
for s in sales:
    spread = spread + (s - mean) ** 2               # 138
variance = spread / len(sales)                      # 27.6

print(profit)
print(x)
print(week)
print(total_knowers)
print(p_red)
print(variance)
```

</details>

**相关课程回链**：(a) [乘法与分配律](../01-arithmetic/30-multiplication.md)、[减法与负数](../01-arithmetic/20-subtract-negative.md)；(b) [一元一次方程](../04-algebra/30-linear-equation.md)；(c) [乘方](../03-exponents/10-power.md)、[求和记号 Σ](../08-sequences/11-sigma.md)；(d) [概率与大数定律](../09-probability/20-law-of-large-numbers.md)；(e) [平均数、方差与标准差](../09-probability/30-mean-variance.md)；(f) 大数定律的现实应用——赌场、保险与民调都靠它吃饭。

交卷之后，去 [Python 工具索引](./40-python-index.md) 把这一路用到的家伙事儿再点一遍名——卷二的信号处理马上就要用到它们了。
