---
title: 循环群与生成元
lesson_id: algebraic-structures/cyclic-groups
prereqs:
  - algebraic-structures/groups
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cyclic-group
  - generator
applications:
  - clock-arithmetic
  - pseudorandom-generators
exits:
  - engineering
  - research
---

# 循环群与生成元

## 1. 开场钩子

钟表的时针只有一个基本动作：走一格。走 13 格等于走 1 格，走 24 格回到原点。

一个动作反复使用，竟能覆盖整张时刻表。这样的群叫循环群。

## 2. 直觉解释

在模 $n$ 加法群里，取元素 $g$，不断计算

$$g,\quad g+g,\quad g+g+g,\quad\ldots$$

若这些结果最终覆盖全部 $n$ 个元素，就称 $g$ 是生成元。

模 5 加法中，2 的幂次序列是 $0,2,4,1,3,0$。五个格都被踩到，所以 2 能独自带动整个群。

## 3. 正式定义

若群 $G$ 中存在 $g\in G$，使每个 $a\in G$ 都可写成 $g^k$（加法记号下为 $kg$），则称 $G$ 为循环群，记作

$$G=\langle g\rangle.$$

使 $g^k=e$ 的最小正整数 $k$ 叫元素的阶。若阶为 $n$，则 $g$ 生成的集合恰有 $n$ 个元素。

## 4. 分步例题

看模 6 加法群：

1. 取 $g=1$：序列 $0,1,2,3,4,5$，生成全群；
2. 取 $g=2$：序列 $0,2,4,0$，只生成长度 3 的循环；
3. 取 $g=5$：序列 $0,5,4,3,2,1$，也是生成元；
4. 所以模 6 加法群有生成元 1 和 5，它们的阶都是 6。

能否生成全群由步长和模数的最大公约数决定：$\gcd(g,n)=1$ 时才行。

## 5. 动手实验

```viz
{
  "type": "cyclic-generator",
  "title": "步长如何带动整个钟面",
  "modulus": 12,
  "step": 5,
  "power": 3,
  "showAll": true
}
```

右图横轴是次数 $k$，纵轴是落点 $kg\bmod n$；点击或拖动任一幂点，左圆同步显示当前位置。把 step 改成 4 后，右侧点列只剩三个高度，左侧也只照亮三格。

```viz
{
  "type": "clockmod",
  "m": 12,
  "k": 5
}
```

把“每次 +k”调成 5，连续点击前进。12 格钟不会遗漏任何位置，所以 5 是模 12 加法的生成元。改成 4 后只会访问 0、4、8 三格。

```python title="枚举步长并判断是否能生成全群"
n = 12
for step in [1, 2, 3, 4, 5, 6, 7]:
    visited = [False] * n   # 列表乘法：复制 n 个 False 作为“未访问”标记
    place = 0
    for count in range(n):
        visited[place] = True
        place = (place + step) % n

    total = 0
    for item in visited:
        if item:
            total = total + 1
    print("step", step, "visited", total)
```

输出中只有与 12 互素的步长会显示 `visited 12`。

## 6. 练习

```exercise
# @title: 练习：找出模 10 加法的小生成元
# @check: smallest_generator=1
# @check: another_generator=3
# @hint: 步长要与 10 互素。不要只看第一圈是否回到 0，还要统计访问过的格子数。
n = 10
generators = []
for step in [1, 2, 3, 4, 5, 6, 7, 8, 9]:
    visited_count = 1

smallest_generator = generators[0] if generators else -1
another_generator = generators[1] if len(generators) > 1 else -1
print("smallest_generator=" + str(smallest_generator))
print("another_generator=" + str(another_generator))
```

<details>
<summary>点开查看逐步解答</summary>

应把 `generators.append(step)` 放在判断之后，并统计真正访问过的格子：

```python
n = 10
generators = []
for step in range(1, n):
    visited = [False] * n   # visited：记录每个余数是否出现过
    place = 0
    for count in range(n):
        visited[place] = True
        place = (place + step) % n

    total = 0
    for item in visited:
        if item:
            total = total + 1
    if total == n:
        generators.append(step)

print(generators)
```

输出生成元是 1、3、7、9。最小的两个是 1 和 3；互素判定和逐格访问判定给出同一张名单。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为只要最后回到 0 就是生成元。模 6 加法里步长 2 也会回 0，但只走过 0、2、4。

**误区二**：你以为循环群一定交换。由单个元素生成的确会交换；这句话本身就是循环群的重要性质。

**误区三**：你以为元素的阶等于群的大小。子循环的阶可以整除群阶但不等于群阶，例如模 6 中的 2。

:::

## 8. 快问快答

```quiz
在模 8 加法群里，哪个元素一定能生成整个群？
- 2
- 4
- 7 [*]
? 2 只到偶数，4 只到 0 和 4；7 与 8 互素，每一步都会访问新位置。
```

## 9. 选读：循环群必交换

<details>
<summary>选读 · 幂次相加</summary>

任取 $g^m,g^n$。乘法记号下：

$$g^m*g^n=g^{m+n}=g^{n+m}=g^n*g^m.$$

加法记号同理。单个齿轮带动的世界必然没有先后之争。

</details>

## 10. 下一站

生成元能造出全群，也能造出较小的圈。下一课把这些圈命名为子群，并追问“阶”的规律。

→ [子群与阶](./30-subgroups-order.md)
