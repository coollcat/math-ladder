---
title: 归约
lesson_id: computability/reductions
prereqs:
  - computability/halting-problem
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - many-one-reduction
applications:
  - impossibility-proofs
  - algorithm-transfer
exits:
  - research
---

# 归约

## 1. 从一个场景开始

你不会开陌生的锁，但你会开自家门锁。如果有人告诉你：“这把陌生锁内部可以无损改装成你家那种锁”，你立刻就会开它了。改装器就是归约。

在计算理论里，归约不只是解题技巧，更是传播“困难”的管道：若难题 A 能变成 B，那么解决 B 就等于顺带解决 A。

## 2. 直觉解释

设你想解决问题 A，却只知道怎么解决问题 B。构造一个翻译器 $f$，把每个 A 实例 $x$ 变成 B 实例 $f(x)$，并且保证：

> $x$ 在 A 中是“是”实例，当且仅当 $f(x)$ 在 B 中是“是”实例。

这时就可以三步走：

1. 收到 A 的输入 $x$；
2. 计算 $f(x)$；
3. 用 B 的解法回答 $f(x)$，答案原样作为 A 的答案。

如果 B 可判定，A 也随之可判定。逆否命题更有力：若 A 已知不可判定，B 也不可判定。

## 3. 正式定义

设 $A,B$ 是同一字母表上的语言。若存在全函数 $f$ 使得对所有串 $x$，

$$x\in A \Longleftrightarrow f(x)\in B$$

并且存在图灵机对每个 $x$ 计算出 $f(x)$ 后停机，就称 $A$ **多一归约**到 $B$，记作 $A\le_m B$。

箭头的读法很关键：$\le_m$ 指向“至少同样难或更强”的问题。$A\le_m B$ 不表示 A 比 B 小得可怜，而是表示 B 承载了 A 的全部判定信息。

## 4. 分步例题

例 1：把“偶数”问题归约到“能被 4 整除”。

1. 输入自然数 $x$；
2. 翻译器输出 $f(x)=2x$；
3. 若 $x$ 是偶数，则 $2x$ 是 4 的倍数；
4. 若 $2x$ 是 4 的倍数，则 $x$ 是偶数；
5. 所以“判断偶数”可归约到“判断 4 的倍数”。

这个例子当然简单，但它展示了双向保真：翻译不能只把真例送过去，也要确保假例仍被目标问题拒绝。

例 2：若已知语言 A 不可判定，且构造了 $A\le_m B$。

1. 假设 B 有判定器；
2. 对任意 $x$，先算 $f(x)$，再调用 B 判定器；
3. 这会成为 A 的判定器；
4. 与 A 不可判定矛盾；
5. 因此 B 不可判定。

## 5. 动手实验

### 实验 1：归约流程链

```viz
{
  "type": "proof-trail",
  "title": "从 A 到 B 的单向桥",
  "steps": [
    { "id": "源问题", "text": "拿到 A 的实例 x" },
    { "id": "翻译", "text": "机械地算出 f(x)" },
    { "id": "保真", "text": "xA 当且仅当 f(x)B" },
    { "id": "借用", "text": "用 B 的解法回答" }
  ],
  "edges": [["源问题", "翻译"], ["翻译", "保真"], ["保真", "借用"]]
}
```

链条中最容易被忽略的是“保真”。一个只会映射正例的翻译器不是归约；假例的去向同样必须有确定答案。

### 实验 2：验证一个小翻译器

```python title="偶数到四倍数的翻译器"
def reduce_even_to_four(n):   # n 是自然数
    return 2 * n              # 翻译规则：乘以 2

def is_even(n):
    return n % 2 == 0         # % 取余数，余 0 说明是偶数

def is_multiple_of_four(n):
    return n % 4 == 0         # 目标语言的判定条件

samples = [1, 2, 3, 4, 7, 8]
for x in samples:
    y = reduce_even_to_four(x)
    print(x, is_even(x), y, is_multiple_of_four(y))
```

每行中第 2 个布尔值和第 4 个布尔值完全相同，这正是归约要求的等价关系。删掉中间某个样本再观察，也不会破坏规律；因为保真是对所有输入成立的性质。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为只需把难问题变成另一个问题就算成功。翻译必须可计算，而且真假方向都要保持。

**误区二**：你以为 $A\le_m B$ 说明 A 一定更容易。箭头说的是 B 至少能承载 A 的难度。

**误区三**：你以为不可判定性可以随意反向传播。由 $A\le_m B$ 且 A 不可判定只能推出 B 不可判定；反过来通常不行。

:::

## 7. 练习

```exercise
# @title: 练习：修复归约的保真性
# @check: True True
# @check: False False
# @hint: 源问题是“偶数”，目标问题是“大于等于 10 且为偶数”；翻译必须把偶数送进目标真区（不小于 10 的偶数），把奇数留在目标假区。
def reduce_to_big(n):
    return n % 10          # 初始翻译：把数字压回个位段——保真性已被破坏

def source_yes(n):
    return n % 2 == 0      # 源语言：n 是偶数

def target_yes(m):
    return m >= 10 and m % 2 == 0   # 目标语言：不小于 10 的偶数

def check_pair(n):
    return source_yes(n), target_yes(reduce_to_big(n))

s, t = check_pair(4)       # 解包赋值：一次取出两个判定结果
print(s, t)
s, t = check_pair(9)
print(s, t)
```

初始翻译器把 4 变成 4 % 10 = 4：源问题判真、目标问题却判假，等价被破坏（第一行两个布尔值不相等）。请修改 `reduce_to_big`，让两个布尔值在所有输入上都相同。

<details>
<summary>点开查看逐步解答</summary>

可以令 `reduce_to_big(n) = n + 10`：任何偶数加上 10 后仍是偶数，而且至少是 10，于是落进目标的真区；奇数加 10 还是奇数，两边都判假。这样第一行输出 `True True`，第二行输出 `False False`。若想体现非平凡翻译，也可以把小于 10 的偶数统一映射到 10、其余映射到自身。无论哪种写法，都必须同时照顾真假两个方向：只把真例送过去、不管假例去向的翻译器不是归约。

</details>

## 8. 快问快答

```quiz
已知 A 不可判定，并且 A 多一归约到 B。能推出什么？
- B 一定可判定
- B 一定不可判定 [*]
- A 与 B 一定相同
 ? 若 B 可解，翻译加 B 解法就解决了 A，与已知矛盾，所以 B 不可解。
```

## 9. 选读：归约的传递性

<details>
<summary>选读 · 桥可以连成路</summary>

若 $A\le_m B$ 且 $B\le_m C$，则复合两个可计算函数得到 $x\mapsto g(f(x))$，并且

$$x\in A \Leftrightarrow f(x)\in B \Leftrightarrow g(f(x))\in C$$

因此 $A\le_m C$。传递性让我们不必每次都从停机问题出发：已经证明的不可判定问题可以成为新的源头。下一课就用这条原则整理一批经典不可判定族。

</details>

## 10. 下一站

有了归约，停机问题开始繁殖。下一课看零函数、打印行为、程序等价等问题如何共享同一种“不可判定”的命运。

→ [不可判定问题族](./45-undecidable-families.md)
