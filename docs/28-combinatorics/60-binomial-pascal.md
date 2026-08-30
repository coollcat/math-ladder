---
title: 二项式系数与杨辉三角
lesson_id: combinatorics/binomial-pascal
prereqs:
  - combinatorics/permutations-combinations
  - combinatorics/recurrence-characteristic
  - sequences/induction
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
  - pascal-triangle
  - binomial-theorem
applications:
  - polynomial-expansion
  - probability-mass
exits:
  - exam
  - research
---

# 二项式系数与杨辉三角

## 1. 从一个场景开始

$(a+b)^2 = a^2 + 2ab + b^2$，$(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3$——系数 $1,2,1$ 与 $1,3,3,1$ 看着眼熟？把 $(a+b)^4$ 展开是 $1,4,6,4,1$。这些数字正是 $C(n,k)$！

为什么展开多项式会跟"从 n 个里挑 k 个"撞衫？因为 $a^{n-k} b^k$ 这一项就是**从 n 个括号里挑出恰好 k 个贡献 b** 的产物——每一项系数都是一场选择。本课把这张"选择地图"（杨辉三角）与二项式定理正式接线。

## 2. 直觉解释

把杨辉三角的每个数看作一个路口的"到达路线数"：你只能从左上或右上两个邻居走下来。

- 左邻来的路 = "这个位置不选第 $n$ 号物品"；
- 右邻来的路 = "选第 $n$ 号物品"。

于是每个格子的数 = 两邻之和——这正是上一课的帕斯卡恒等式，也是组合计数的分类加法。整座三角就是"所有子集的地图"：第 $n$ 行第 $k$ 格告诉你，$n$ 个候选里挑 $k$ 个有多少挑法。

行和的秘密更妙：$\sum_k C(n,k) = 2^n$——一行所有数加起来等于 $n$ 个元素的全体子集个数（每个元素只有"进/不进"两种命运）。地图的总面积就是选择宇宙的大小。

## 3. 正式定义

**杨辉三角递推**（西方称帕斯卡三角，中国贾宪早四百年）：

$$C(0,0) = 1, \qquad C(n,k) = C(n-1,k-1) + C(n-1,k), \qquad C(n,n)=C(n,0)=1$$

**二项式定理**：

$$(a+b)^n = \sum_{k=0}^{n} C(n,k)\, a^{n-k} b^{k}$$

| 性质 | 内容 | 一句话理由 |
| --- | --- | --- |
| 对称性 | $C(n,k)=C(n,n-k)$ | 挑 k 个 = 剩下 n−k 个 |
| 行和 | $\sum_{k=0}^n C(n,k) = 2^n$ | 子集双命运计数 |
| 单峰性 | 系数先增后减 | 挑一半最难挑 |

## 4. 分步例题

**例**：展开 $(a + b)^5$ 并指出 $a^2 b^3$ 的系数。

1. 写骨架：$(a+b)^5 = \sum_k C(5,k)\, a^{5-k} b^k$；
2. 第 5 行系数：$1, 5, 10, 10, 5, 1$；
3. 逐项落位：$a^5 + 5a^4b + 10a^3b^2 + 10a^2b^3 + 5ab^4 + b^5$；
4. 所以 $a^2 b^3$ 的系数是 $C(5,3) = 10$——"5 个括号里挑 3 个交出 $b$"；
5. 验算行和：$1+5+10+10+5+1 = 32 = 2^5$ ✓。

## 5. 动手实验

### 实验 1（python）：造一座三角并体检

```python title="递推生成杨辉三角前 8 行"
rows = []                       # 收集每一行
for n in range(8):
    row = [1]                   # 每行以 1 开头
    for k in range(1, n):
        left_up = rows[n - 1][k - 1]     # 左肩
        right_up = rows[n - 1][k]        # 右肩（可能不存在时不会进来）
        row.append(left_up + right_up)
    if n > 0:
        row.append(1)           # 每行以 1 结尾（第 0 行只有一个 1）
    rows.append(row)

print(rows[5])                  # 第 5 行应为 1,5,10,10,5,1

symmetry_ok = True              # 体检：对称性 + 行和
for r in rows:
    if r != list(reversed(r)):  # reversed()：反向迭代器，list() 把它变回列表
        symmetry_ok = False
    if sum(r) != 2 ** rows.index(r):
        symmetry_ok = False
print(symmetry_ok)
```

输出 `[1, 5, 10, 10, 5, 1]` 和 `True`。两百年前的贾宪三角，今天用七行代码养出来，且对称性与行和自动合格。

### 实验 2（matplotlib）：系数热力图里的山谷

```python title="给杨辉三角涂色"
import matplotlib.pyplot as plt
import math

size = 13
grid = [[0] * size for _ in range(size)]   # 双重推导：size×size 的零矩阵；_ 表示“用不到的循环变量”
for i in range(size):
    for j in range(i + 1):                 # 只填左下半区，右上保持 0
        grid[i][j] = math.factorial(i) // (math.factorial(j) * math.factorial(i - j))

plt.imshow(grid, cmap="magma")            # magma 配色：数值越大越亮
plt.colorbar(label="C(n, k)")
plt.xlabel("k")
plt.ylabel("n")
```

亮度沿每行向中间隆起、向两侧塌成暗谷——单峰性的像素写真。对角线上 $C(n,n)=1$ 的暗点连成边缘，帕斯卡递推就藏在这片明暗地形里。

:::warning[常见误区]

**误区一**：你以为杨辉三角只是速算装饰。它是组合数的完整数据库：热力图、恒等式、概率分布（下一卷二项分布的钟形曲线）全部由它供货。

**误区二**：你以为 $(a+b)^n$ 展开项数是 $n$ 项。其实是 $n+1$ 项（k 从 0 数到 n）；漏掉两端会让行和对不上 $2^n$。

**误区三**：你以为系数对称是巧合。挑 $k$ 个上场的队员与挑 $n-k$ 个坐板凳的队员是同一个动作——对称性来自"补集视角"，不是运气。
:::

## 6. 练习

```quiz
(a + b) 的 7 次方展开式中，a 的 4 次方乘 b 的 3 次方这一项的系数是？
- 35 [*]
- 21
- 12
? 系数是 C(7,3)=7!/(3!·4!)=35。挑 3 个括号交出 b，剩下 4 个交出 a。
```

**练习 1**：用"双命运计数"解释为什么第 $n$ 行所有系数之和为 $2^n$，并据此心算 $2^{10}$ 对应的第 10 行行和。

<details>
<summary>点开查看逐步解答</summary>

$n$ 个元素构造子集时每个元素面临"入选 / 落选"两种命运，独立决定，由乘法原理共 $2^n$ 个子集。按"入选个数"分类清点：选 0 个有 $C(n,0)$ 种、选 1 个 $C(n,1)$……合计即行和，所以行和必为 $2^n$。第 10 行行和 $= 2^{10} = 1024$。
</details>

**练习 2**：程序想算 $C(7,3)$ 当展开系数，分母却写重了：

```exercise
# @title: 展开 (a+b)^7 的关键系数
# @check: 35
# @hint: 分母两个因子分别来自“挑中的 k!”与“没挑中的 (n−k)!”。初始代码把第二个因子也写成了 k。
import math

n = 7
k = 3
coefficient = math.factorial(n) // (math.factorial(k) * math.factorial(k))
# ← 问题在这：第二个阶乘应该是 (n−k) 的
print(coefficient)
```

修好后输出 `35`。初始版本算出的 140 是"分子不变、分母缩水"的结果——组合数公式里每个因子都有岗位，顶替者立刻让数字翻车。

## 7. 选读： hockey stick 与朱世杰恒等式

<details>
<summary>选读 · 三角形上的斜线求和</summary>

在杨辉三角里沿斜线求和：$C(2,2)+C(3,2)+\cdots+C(7,2) = C(8,3)$。一般地

$$\sum_{i=r}^{n} C(i,r) = C(n+1,\ r+1)$$

形状像一根曲棍球杆（hockey stick identity），元代朱世杰《四元玉鉴》已在使用。证明只需反复套帕斯卡递推：把杆头一项不断"折"进下一层。这条恒等式是竞赛计数里最常用的换汇工具之一，也是后续"格路计数"的起点。
</details>

## 8. 下一站

当递推都写不顺时，把整个数列打包成一个"多项式背包"——这正是第 55 课[普通生成函数入门](./55-generating-functions.md)干的事，而本课的帕斯卡三角正是 $(1+x)^n$ 背包的系数面板。先带着全套计数武器去下一章，看它们如何长成图论的骨架：

→ [图论 · 图的定义与现实建模](../29-graph-theory/10-graph-definition.md)
