---
title: 实数完备性与上确界
lesson_id: real-analysis/completeness-supremum
prereqs:
  - calculus/limits
  - math-language/sets-relations-functions
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - supremum
  - completeness
applications:
  - numerical-root-finding
  - optimization
exits:
  - research
  - engineering
---

# 实数完备性与上确界

## 1. 从一个场景开始

有理数里可以不断列出平方小于 2 的数：1，1.4，1.41，1.414……它们有上界，却没有最大值。若数轴在这里漏了一个洞，“最紧的上界”就不存在。实数完备性的作用，正是把这个洞补成 $\sqrt2$。

## 2. 直觉解释

一个数集的所有上界里，最小的那个叫**上确界**。它可以理解为“从上方压下来的最低天花板”。

完备性则像一条承诺：只要区间不断嵌套、长度趋于零，并且每个区间都由实数端点围成，它们最终必夹住一个实数。

## 3. 正式定义

数 $U$ 是集合 $S$ 的上界，当且仅当对所有 $x\in S$ 都有 $x\le U$。

数 $s$ 是上确界，记作 $\sup S=s$，当且仅当：

1. $s$ 是上界；
2. 任何比 $s$ 更小的数都不是上界。

| 对象 | 含义 |
| --- | --- |
| 最大值 | 必须属于集合 |
| 上确界 | 不必属于集合 |
| 完备性 | 合理嵌套区间必交于一个实数 |

## 4. 分步例题

设

$$S=\lbrace x\in\mathbb R:0\le x,\ x^2<2\rbrace.$$

1. $1.4$ 在 $S$ 中，因为 $1.4^2<2$；
2. $1.5$ 是上界，因为 $1.5^2>2$；
3. 任何小于 $\sqrt2$ 的数都会被某个更近的近似超过；
4. 任何大于 $\sqrt2$ 的数都偏大；
5. 所以 $\sup S=\sqrt2$，但 $\sqrt2$ 不满足 $x^2<2$，不属于 $S$。

## 5. 动手实验

### 实验 1：二分嵌套区间

```viz
{
  "type": "completeness-ladder",
  "title": "用嵌套区间夹住 √2",
  "target": 1.4142135623730951,
  "steps": 5
}
```

拖动迭代步数。橙色区间越来越窄；紫点是被夹住的 $\sqrt2$。

### 实验 2：尾部逼近预告

```viz
{
  "type": "cauchy-tail",
  "title": "近似数列的尾部",
  "expr": "1 + 1/n",
  "limit": 1,
  "tail": 8,
  "epsilon": 0.25
}
```

完备性常和 Cauchy 判据一起出现：区间端点彼此靠近时，它们会共同逼近一个实数。

### 实验 3：Python 二分

```python title="二分夹逼 √2"
low = 0.0
high = 2.0
for step in range(14):
    middle = (low + high) / 2
    if middle < 1.4142135623730951:
        low = middle
    else:
        high = middle

print(round(low, 6))
print(round(high, 6))
print(round(high - low, 6))
```

输出 `1.414185`、`1.414307`、`0.000122`。

## 6. 练习

```exercise
# @title: 练习：加细嵌套区间
# @check: 1.414185
# @check: 1.414307
# @check: 0.000122
# @hint: 把二分次数从 4 增加到 14；每次保留包含 √2 的半边。
low = 0.0
high = 2.0
for step in range(4):
    middle = (low + high) / 2
    if middle < 1.4142135623730951:
        low = middle
    else:
        high = middle

print(round(low, 6))
print(round(high, 6))
print(round(high - low, 6))
```

<details>
<summary>点开查看逐步解答</summary>

把循环次数改为 14：

```text
for step in range(14):
    middle = (low + high) / 2
    if middle < 1.4142135623730951:
        low = middle
    else:
        high = middle
```

程序会得到：

```text
low≈1.4141845703
high≈1.4143066406
width≈0.0001220703
```

四舍六入到 6 位就是判题要求的三个数。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：容易把上确界当成最大值。$\sup S=\sqrt2$，但 $\sqrt2$ 不在 $S$ 中。

**误区二**：容易以为有上界就一定有最大值。有理数集 $\lbrace x:x^2<2\rbrace$ 有上界，却没有有理数最大值。

**误区三**：容易把近似到 1.414 当成已经等于 $\sqrt2$。有限小数只是区间端点，上确界是精确归宿。

:::

## 8. 快问快答

```quiz
集合 {1, 1.4, 1.41} 的上确界是多少？
- 1.4142
- 1.41 [*]
- 0
? 有限集的上确界就是最大值。1.4142 是另一个更大数据集的归宿，不属于这里。
```

## 9. 选读：完备性的两种说法

<details>
<summary>选读 · 确界原理与区间套</summary>

确界原理说：非空有上界的实数集必有上确界。区间套原理说：若闭区间 $I_1\supset I_2\supset I_3\supset\cdots$ 的长度趋于零，则交集中恰有一个实数。两者都表达同一件事：实数轴没有可被夹逼逼出的漏洞。

</details>

## 10. 下一站

有了完备的地基，就能问“无穷多个近似值是否彼此靠近”。下一课把这种靠近写成 Cauchy 判据。

→ [数列极限与 Cauchy 判据](./20-cauchy-sequences.md)
