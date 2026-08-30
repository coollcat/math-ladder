---
title: 子群与阶
lesson_id: algebraic-structures/subgroups-order
prereqs:
  - algebraic-structures/cyclic-groups
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - subgroup
  - order-of-element
applications:
  - periodic-motion
  - puzzle-state-space
exits:
  - research
---

# 子群与阶

## 1. 开场钩子

模 12 钟面上只允许走 4 格：你会反复停在 0、4、8。这个小圈有自己的单位元、逆元和封闭运算，像藏在群里的小钟表。

这样的小圈叫子群。它的大小藏着一条惊人的整除规律。

## 2. 直觉解释

子群是群里的“迷你群”：不带走大群的运算规则，但必须自己也能独立运作。

元素的阶是它转回单位元所需的最小步数。走 4 格的元素在模 12 加法中阶为 3；走 5 格的元素阶为 12。

$$\operatorname{ord}(g)=\min\lbrace k>0:g^k=e\rbrace.$$

## 3. 正式定义

设 $\langle G,*\rangle$ 是群，$H\subseteq G$ 且 $H\ne\varnothing$。若满足：

1. 封闭：$a,b\in H$ 时 $a*b\in H$；
2. 单位元：$e\in H$；
3. 逆元：$a\in H$ 时 $a^{-1}\in H$，

则 $H$ 是 $G$ 的子群，记作 $H\le G$。

有限群中，非空子集只要封闭就自动成为子群：重复取逆最终会得到单位元。

## 4. 分步例题

在模 12 加法群里：

1. 由 4 生成 $H=\lbrace0,4,8\rbrace$；
2. 检查任意两个元素相加仍落在 $H$；
3. 每个元素的相反数也在 $H$；
4. 所以 $H$ 是子群，大小为 3；
5. 大群有 12 个元素，$3$ 整除 $12$。

这不是巧合，下一课 Lagrange 定理会把它变成定理。

## 5. 动手实验

```viz
{
  "type": "clockmod",
  "m": 12,
  "k": 4
}
```

每次前进 4 格，钟面只照亮 0、4、8。这个小圈就是由步长 4 生成的子群；把 k 改成 5，照亮格数立刻变成 12。

```python title="从步长生成了集合，再检查子群"
n = 12
step = 4

cyclic_set = []
place = 0
for count in range(n):
    duplicate = False
    for old in cyclic_set:
        if old == place:
            duplicate = True
    if duplicate == False:
        cyclic_set.append(place)
    place = (place + step) % n

closed = True
for a in cyclic_set:
    for b in cyclic_set:
        result = (a + b) % n
        inside = False
        for item in cyclic_set:
            if item == result:
                inside = True
        if inside == False:
            closed = False

print("generated:", cyclic_set)
print("size:", len(cyclic_set))
print("closed:", closed)
```

改 `step` 为 5，会得到 12 个元素的大循环；改为 3，会得到大小 4 的子群。所有结果都整除 12。

## 6. 练习

```exercise
# @title: 练习：求模 10 中各步长的阶
# @check: order(2)=5
# @check: order(4)=5
# @check: order(5)=2
# @hint: 从 0 开始不断加 step，第一次回到 0 所用步数就是阶。
n = 10

def order(step):
    return 1

for step in [2, 4, 5]:
    print("order(" + str(step) + ")=" + str(order(step)))
```

<details>
<summary>点开查看逐步解答</summary>

把函数改成计数循环：

```python
def order(step):
    place = step
    count = 1
    # while 循环：条件成立时重复；这里在回到 0 前继续走
    while place != 0:
        place = (place + step) % n
        count = count + 1
    return count
```

于是：

| 步长 | 回到 0 的序列 | 阶 |
| --- | --- | --- |
| 2 | $2,4,6,8,0$ | 5 |
| 4 | $4,8,2,6,0$ | 5 |
| 5 | $5,0$ | 2 |

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为任何子集都是子群。缺少单位元或逆元的小圈子会立刻失格。

**误区二**：你以为元素的阶等于它的大小。阶是动作重复几次归零，不是数字本身的大小。

**误区三**：你以为子群大小只是碰巧整除。Lagrange 定理说明这是必然。

:::

## 8. 快问快答

```quiz
有限群里，一个非空封闭子集为什么自动是子群？
- 因为它一定只有一个元素
- 因为重复取逆会回到单位元 [*]
- 因为所有群都交换
? 设 a 在子集中，a,a^2,a^3,... 有限个位置里必有重复，由此可得 e 和逆元留在其中。
```

## 9. 选读：由子集生成的最小子群

<details>
<summary>选读 · 交出全部必要的元素</summary>

给定若干元素，把它们所有有限乘积和逆元都放进来，得到的集合就是它们生成的子群。它是所有包含这些元素的子群中最小的一个，就像给一组齿轮接上必需的传动件。

</details>

## 10. 下一站

子群把大群切成大小相同的小房间。下一课正式定义陪集，并证明 Lagrange 定理。

→ [Lagrange 定理选读](./35-lagrange.md)
