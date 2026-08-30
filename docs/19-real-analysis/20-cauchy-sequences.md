---
title: 数列极限与 Cauchy 判据
lesson_id: real-analysis/cauchy-sequences
prereqs:
  - real-analysis/completeness-supremum
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin:
  - min
introduces_import: []
introduces_concepts:
  - cauchy-sequence
applications:
  - numerical-convergence
  - iterative-methods
exits:
  - research
  - scientific-computing
---

# 数列极限与 Cauchy 判据

## 1. 从一个场景开始

有时你不知道数列要去哪儿，只能看它后面的项是否彼此靠近。若从某一项起，任意两项都能被任意窄的 $\epsilon$ 带罩住，它就是 Cauchy 数列；实数完备性保证这样的数列有归宿。

## 2. 直觉解释

数列 $a_n=1+\frac1n$ 的项越来越靠近 1。判断它收敛，不一定先说出极限 1；可以问：

$$\text{是否存在 }N,\ \text{使 }m,n>N\text{ 时 }|a_m-a_n|<\epsilon.$$

这就是 Cauchy 判据。它只检查项与项之间的距离。

## 3. 正式定义

数列 $(a_n)$ 收敛到 $L$，当且仅当：

$$\forall \epsilon>0,\ \exists N,\ \forall n>N:\ |a_n-L|<\epsilon.$$

数列是 Cauchy 数列，当且仅当：

$$\forall \epsilon>0,\ \exists N,\ \forall m,n>N:\ |a_m-a_n|<\epsilon.$$

在实数中，收敛 $\Leftrightarrow$ Cauchy。

## 4. 分步例题

仍取 $a_n=1+\frac1n$。

1. 若 $m>n>N$，则 $|a_m-a_n|=\frac1n-\frac1m<\frac1n$；
2. 要让差小于 $\epsilon$，只需 $n>\frac1\epsilon$；
3. 取 $N>\frac1\epsilon$；
4. 因此数列是 Cauchy 数列；
5. 由完备性，它收敛到 1。

## 5. 动手实验

### 实验 1：尾部与 epsilon 带

```viz
{
  "type": "cauchy-tail",
  "title": "1+1/n 的 Cauchy 尾部",
  "expr": "1 + 1/n",
  "limit": 1,
  "tail": 10,
  "epsilon": 0.2
}
```

拖动 $N$ 和 $\epsilon$。橙点进入尾部后，若最大尾幅小于 $\epsilon$，判据通过。

### 实验 2：完备性对照

```viz
{
  "type": "completeness-ladder",
  "title": "Cauchy 区间最终夹住归宿",
  "target": 1.4142135623730951,
  "steps": 8
}
```

二分区间端点彼此靠近。完备性保证这类互相靠近的端点不会永远追不到一个实数。

### 实验 3：Python 计算 n>N 的尾部最大差

本课正式引入 `max` 和 `min`：不用它们时，只能逐项比较并手工记录当前最大值和最小值；有了它们，一行就能找出整段数据的两端。

```python title="检查第 10 项之后的最大尾幅"
def a(n):
    return 1 + 1 / n

values = []
for n in range(11, 51):
    values.append(a(n))

spread = max(values) - min(values)   # max/min：分别取列表中的最大值和最小值
print(round(spread, 4))
print("cauchy" if spread < 0.2 else "not yet")
```

输出 `0.0709` 和 `cauchy`。

## 6. 练习

```exercise
# @title: 练习：修正尾部最大差
# @check: 0.0709
# @check: cauchy
# @hint: Cauchy 看第 10 项之后任意两项的最大差，不是只看第 10 项和第 11 项。
def a(n):
    return 1 + 1 / n

spread = abs(a(10) - a(11))
verdict = "not yet"
print(round(spread, 4))
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

收集 n>10 的第 11 到第 50 项：

```python
def a(n):
    return 1 + 1 / n

values = []
for n in range(11, 51):
    values.append(a(n))

spread = max(values) - min(values)
```

最大值是 $a_{11}\approx1.0909$，最小值是 $a_{50}=1.02$，尾幅为 $\frac{39}{550}\approx0.070909$，四舍五入到 4 位就是 `0.0709`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：容易认为相邻项越来越近就是 Cauchy。相邻差趋零不能排除缓慢漂移。

**误区二**：容易以为通项趋于零就一定收敛。调和级数的项趋于零，但部分和发散。

**误区三**：容易忽略完备性在 Cauchy 判据中的作用。有理数中，逼近 $\sqrt2$ 的数列是 Cauchy 的，却没有有理数极限。

:::

## 8. 快问快答

```quiz
Cauchy 数列的定义检查什么？
- 只检查相邻两项
- 检查尾部任意两项的距离 [*]
- 只检查数列是否单调
? 定义要求 m,n 都大于 N 时 |a_m-a_n|<ε，不限于相邻项。
```

## 9. 选读：为什么实数中 Cauchy 必收敛

<details>
<summary>选读 · 夹出一个极限</summary>

若 $(a_n)$ 是 Cauchy 数列，则它有界。由 Bolzano-Weierstrass 性质（下一课正式兑现它：[单调有界必收敛与 Bolzano-Weierstrass](./25-monotone-bw.md)）可取收敛子列 $a_{n_k}\to L$。再利用 Cauchy 性质，把整条数列的尾部拉向同一个 $L$。若只在有理数中讨论，$L$ 可能缺失，这正是完备性要补上的洞。

</details>

## 10. 下一站

Cauchy 判据查“项与项彼此靠近”，可很多数列只肯交代两件更弱的事——方向单一、涨不出界。下一课为这类数列补一张收敛保证书，顺带兑现本课选读借用的 Bolzano-Weierstrass 性质；再往后才把 $\epsilon$ 语言搬去函数。

→ [单调有界必收敛与 Bolzano-Weierstrass](./25-monotone-bw.md)
