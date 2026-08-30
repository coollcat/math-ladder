---
title: 纠错能力与最小距离
lesson_id: coding-theory/minimum-distance
prereqs:
  - coding-theory/hamming-74-code
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - minimum-distance
  - sphere-packing-bound
applications:
  - link-budget-design
  - ecc-selection
exits:
  - engineering
  - research
---

# 纠错能力与最小距离

## 1. 从一个场景开始

两个合法码字离得越远，噪声越难把一个伪装成另一个。但“离得远”还不够，工程评审会追问：到底能保证纠几位、检几位？最小距离就是答案的源头。

## 2. 直觉解释

给码中每一对码字量 Hamming 距离，最短的那一对决定全码的短板。若最短距离是 5：

- 错 1 位：仍在原码字的半径 1 邻域内；
- 错 2 位：仍然更靠近原码字；
- 错 3 位：可能正好落在两座灯塔中间，最近邻不再可靠。

因此 5 距离码能保证纠 $\lfloor(5-1)/2\rfloor=2$ 个错。

## 3. 正式定义

一个码 $C$ 的**最小距离**是：

$$d_{\min}=\min_{\substack{c,c'\in C\\c\ne c'}}d(c,c').$$

它保证：

- 可检测任意不超过 $d_{\min}-1$ 个错；
- 可纠正任意不超过 $t=\left\lfloor\dfrac{d_{\min}-1}{2}\right\rfloor$ 个错。

若以每个码字为中心画出半径 $t$ 的 Hamming 球，不同球互不重叠。球填充界为：

$$|C|\sum_{i=0}^{t}\binom{n}{i}\le 2^n.$$

## 4. 分步例题

取上一课前的线性码：

$$C=\lbrace00000,11100,00111,11011\rbrace.$$

1. 逐对计算距离：`11100` 与 `00111` 距离为 4；
2. `11100` 与 `11011` 在第 3、4、5 位不同，距离为 3；
3. `00111` 与 `11011` 在第 1、2、3 位不同，距离为 3；
4. 所以 $d_{\min}=3$；
5. 纠错半径是 $\lfloor(3-1)/2\rfloor=1$；
6. 检错范围是 $d_{\min}-1=2$。

这个码每块传 2 个信息位，用 5 个码位换来纠 1 个错的能力。

## 5. 动手实验

### 实验：让程序找短板

```python title="枚举码字对并计算最小距离"
code = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1],
    [1, 1, 0, 1, 1]
]

def dist(x, y):
    count = 0
    for i in range(len(x)):
        count += x[i] != y[i]   # 布尔值 True 按 1 参与加法
    return count

d_min = len(code[0]) + 1        # 先设成比可能最大距离还大的哨兵值
best_pair = None
for i in range(len(code)):
    for j in range(i + 1, len(code)):  # 只比较上三角，避免重复
        d = dist(code[i], code[j])
        if d < d_min:
            d_min = d
            best_pair = (i, j)   # 记录取得最小值的一对下标

t = (d_min - 1) // 2            # // 是整除，自动向下取整
detect = d_min - 1
print("d_min =", d_min)
print("pair  =", best_pair)
print("t     =", t)
print("detect=", detect)
```

往 `code` 里加入一个重量为 1 的串，$d_{\min}$ 会立刻跌到 1；这就是为什么编码必须整体设计，而不是只保护个别码字。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为最小距离可以包含零码字与自己。公式必须取两个不同码字；否则最小值永远是 0。

**误区二**：你以为 $d=4$ 能纠 2 个错。实际只能保证纠 $\lfloor3/2\rfloor=1$ 个错，同时可检 3 个错。

**误区三**：你以为球不重叠就一定能找到这样的码。球填充界只是必要条件；寻找好码还要满足代数和图结构等更强约束。

:::

## 7. 练习

```exercise
# @title: 练习：修正最小距离和纠错半径
# @check: d_min=3
# @check: t=1
# @hint: 不要把零码字和自己配对；先找出所有非零码字的重量。
code = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1],
    [1, 1, 0, 1, 1]
]
d_min = 5
t = d_min // 2
print(f"d_min={d_min}")
print(f"t={t}")
```

<details>
<summary>点开查看逐步解答</summary>

三个非零码字的重量分别是 3、3、4。因为这是线性码，最小距离等于最小非零重量：

$$d_{\min}=3.$$

所以：

$$t=\left\lfloor\frac{3-1}{2}\right\rfloor=1.$$

初始代码误用了最大观察距离，并且没有做减一再整除。

```python
d_min = len(code[0])
for i in range(1, len(code)):
    for j in range(i + 1, len(code)):
        distance = sum(x != y for x, y in zip(code[i], code[j]))
        d_min = min(d_min, distance)
t = (d_min - 1) // 2
print(f"d_min={d_min}")
print(f"t={t}")
```

</details>

## 8. 快问快答

```quiz
某码的最小距离是 6。它能保证检测几个错、纠正几个错？
- 检 5 个，纠 2 个 [*]
- 检 6 个，纠 3 个
- 检 5 个，纠 5 个
? 检测上限是 d-1=5；纠错半径是 floor((d-1)/2)=floor(5/2)=2。
```

## 9. 选读：完美码与边界

<details>
<summary>选读 · 等号什么时候成立</summary>

Hamming(7,4) 有 16 个码字，半径 1 的球各含 8 个串，总覆盖数恰好是 $128=2^7$，所以球填充界取等号。这类码叫完美码。多数实用码不能达到等号；它们在码率、距离、译码复杂度和延迟之间寻找更现实的平衡。

</details>

## 10. 下一站

块码一次看一整块。卷积码则带着记忆工作，让当前输出依赖最近的过去。

→ [卷积码直观预告](./60-convolutional-preview.md)
