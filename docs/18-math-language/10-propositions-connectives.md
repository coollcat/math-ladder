---
title: 命题与联结词
lesson_id: math-language/propositions
prereqs:
  - sequences/induction
volume: 2
layer: L8
track:
  - algebra-structure
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - proposition
  - connective
applications:
  - legal-reasoning
  - programming-conditions
exits:
  - research
---

# 命题与联结词

## 1. 从一个场景开始

朋友说：“如果明天下雨，我就带伞。”第二天没下雨，他也没带伞。他食言了吗？直觉说不；可很多人一写条件句就把它误当成“下雨和带伞必须同时发生”。把这句话拆成真假开关，争论会立刻停。

## 2. 直觉解释

**命题**是一台只能显示“真”或“假”的机器。比如“$7$ 是素数”显示真，“$2+2=5$”显示假；而“请关门”不是命题，因为它不是在陈述一个可判断的事实。

联结词像电路接头：

- “并且”要求两盏灯都亮；
- “或者”只要求至少一盏亮；
- “如果……那么……”更像承诺：只要没有出现“前提兑现却结果落空”，承诺就没有被打破。

## 3. 正式定义

设 $p$、$q$ 是命题。

| 名称 | 记号 | 为真的条件 |
| --- | --- | --- |
| 否定 | $\neg p$ | $p$ 为假 |
| 合取 | $p \land q$ | $p,q$ 都真 |
| 析取 | $p \lor q$ | 至少一个真 |
| 蕴含 | $p \Rightarrow q$ | $p$ 假，或 $q$ 真 |
| 等价 | $p \Leftrightarrow q$ | $p,q$ 同真同假 |

蕴含 $p \Rightarrow q$ 中，$p$ 叫前提，$q$ 叫结论。它只有一种情况为假：$p$ 真而 $q$ 假。

## 4. 分步例题

把“若 $n$ 是偶数，则 $n^2$ 是偶数”记为 $p \Rightarrow q$：

1. $p$：$n$ 是偶数；
2. $q$：$n^2$ 是偶数；
3. 要反驳它，必须找到一个偶数 $n$，而 $n^2$ 是奇数；
4. 这样的 $n$ 不存在，所以条件句成立。

再看逆命题 $q \Rightarrow p$：“若 $n^2$ 是偶数，则 $n$ 是偶数”。它也真，但真不是因为和原命题长得像，而是需要单独证明。

## 5. 动手实验

### 实验 1：真值表反例行

```viz
{
  "type": "truth-table",
  "title": "p => q 与它的朋友",
  "formula": "p=>q",
  "showColumns": ["p", "q", "not p", "p=>q", "q=>p"]
}
```

先看红色行：$p$ 真而 $q$ 假。这是 $p \Rightarrow q$ 唯一的塌陷点。再点「换主公式」，观察逆命题 $q \Rightarrow p$ 的假行搬了家。

### 实验 2：Python 布尔开关

```python title="用 Python 检查联结词"
p = True    # True 是布尔值“真”
q = False   # False 是布尔值“假”

print(p and q)   # and：两个都真才真
print(p or q)    # or：至少一个真就真
print(not p)     # not：真变假，假变真
```

输出 `False`、`True`、`False`。把 $q$ 改成 `True` 再跑，只有第一行会变。

## 6. 练习

```exercise
# @title: 练习：三个联结词
# @check: False
# @check: True
# @check: False
# @hint: and 要求两个都真；or 只要求一个真；not 会翻转 p。
p = True
q = False
print(p or q)
print(p and q)
print(not q)
```

<details>
<summary>点开查看逐步解答</summary>

先把三个 `print` 的表达式按目标顺序改成 `p and q`、`p or q`、`not p`。

1. `p and q` 是“真并且假”，结果 `False`；
2. `p or q` 是“真或者假”，至少一个真，结果 `True`；
3. `not p` 把 `True` 翻成 `False`。

```python
p = True
q = False
print(p and q)
print(p or q)
print(not p)
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 $p \Rightarrow q$ 意味着 $q \Rightarrow p$。其实“下雨则带伞”不等于“带伞则下雨”。逆命题要单独证明。

**误区二**：你以为前提为假时条件句“没意义”。数学约定它为真：前提根本没有兑现，就不存在“承诺失败”。

**误区三**：你以为“或者”必须二选一。数学里的 $\lor$ 是包容或：两个都真也算真。

:::

## 8. 快问快答

```quiz
p => q 为真时，下列哪句话一定成立？
- q 一定为真
- 若 p 为真，则 q 一定为真 [*]
- p 一定为假
? 条件句只在 p 真而 q 假时为假。若 p 本身为假，无论 q 如何都不破坏它。
```

## 9. 选读：为什么假前提能推出真条件句

<details>
<summary>选读 · 从承诺的角度理解</summary>

把 $p \Rightarrow q$ 看作规则“满足 $p$ 时，必须保证 $q$”。检查规则是否被破坏，只需要看 $p$ 成立的场合。若 $p$ 从未成立，就没有任何违规样本，规则保持完好。这个约定让“所有偶数都能被 $2$ 整除”在空论域或非偶数上不会莫名变假，也让证明可以安全地分情况讨论。

</details>

## 10. 下一站

命题只处理整句真假。可数学常说“对所有偶数……”“存在一个素数……”，变量一进来，真假就要看论域。下一课请出量词。

→ [谓词与量词](./20-predicates-quantifiers.md)
