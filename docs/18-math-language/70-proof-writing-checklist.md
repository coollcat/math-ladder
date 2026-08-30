---
title: 证明写作自查清单
lesson_id: math-language/proof-checklist
prereqs:
  - math-language/induction-advanced
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
  - proof-review
applications:
  - mathematical-writing
  - code-review
exits:
  - research
---

# 证明写作自查清单

## 1. 从一个场景开始

数学写作的第一读者不是替你补漏洞的老师，而是认真怀疑你的朋友。清单不是把证明变成官僚表格，而是把“我觉得对了”换成七个可检查问题。

## 2. 直觉解释

一个证明至少要有四类地址：

- 论域地址：在讨论哪些对象；
- 定义地址：每个符号从哪来；
- 推理地址：每一步凭什么；
- 边界地址：结论覆盖到哪里，哪里排除。

缺任何一个，读者就会被迫替作者猜。

## 3. 七问清单

1. 论域是什么？空论域会不会破坏命题？
2. 每个变量和符号在哪定义？
3. 用的是“充分”“必要”，还是把两者混在一起？
4. 全称命题是否真的覆盖所有情况？存在命题是否给出 witness？
5. 归纳法有没有基础步、归纳步和准确范围？
6. 有没有循环论证、偷换量词或使用未证结论？
7. 结论边界在哪？哪些情况明确不保证？

## 4. 分步例题

检查这段“证明”：对所有实数 $x$，$x^2\ge 0$，因为取 $x=1$ 时 $1\ge0$。

1. 论域是所有实数；
2. 样本 $x=1$ 只是一个正例；
3. 全称命题不能由单个正例证明；
4. 修正：按 $x\ge0$ 与 $x<0$ 分情况，分别用平方定义或 $(-a)^2=a^2$；
5. 结论边界是实数；若论域换成复数，大小比较本身要先重新定义。

## 5. 动手实验

### 实验 1：诊断错误证明

```viz
{
  "type": "proof-trail",
  "title": "找出断链和循环",
  "steps": [
    { "id": "论域", "text": "x 是整数" },
    { "id": "样本", "text": "取 x=1 成立" },
    { "id": "全称", "text": "所以所有整数成立" },
    { "id": "结论", "text": "命题得证" }
  ],
  "edges": [["论域", "样本"], ["样本", "全称"], ["全称", "结论"]]
}
```

链虽然连通，但“样本”到“全称”这一步没有合法推理。依赖链能查结构，查语义要靠清单第七问。

### 实验 2：机器化检查摘要

```python title="把清单变成四项摘要"
checks = ["domain", "quantifier", "base-case", "cycle"]

for item in checks:
    if item == "cycle":
        print("no-" + item)
    else:
        print(item + "-ok")
```

输出 `domain-ok`、`quantifier-ok`、`base-case-ok`、`no-cycle`。真实证明不能完全交给机器，但机器能逼你把检查项写清楚。

## 6. 练习

```exercise
# @title: 练习：生成正确检查摘要
# @check: domain-ok
# @check: quantifier-ok
# @check: base-case-ok
# @check: no-cycle
# @hint: cycle 这一项要输出 no-cycle；其他三项输出自身加 -ok。
checks = ["domain", "quantifier", "base-case", "cycle"]
for item in checks:
    print(item + "-ok")   # + 可以把两个字符串拼在一起
```

<details>
<summary>点开查看逐步解答</summary>

```python
checks = ["domain", "quantifier", "base-case", "cycle"]
for item in checks:
    if item == "cycle":
        print("no-" + item)
    else:
        print(item + "-ok")
```

最后一项表示“没有循环”，所以前缀是 `no-`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为清单会限制创造力。它先拦住结构错误；结构安全后，灵感才有地方落脚。

**误区二**：你以为符号越多越严格。未定义符号反而制造漏洞；严格来自每个符号都有出生地。

**误区三**：你以为检查一次就永久有效。改一个前提、换一个论域，清单要重新走一遍。

:::

## 8. 快问快答

```quiz
“取 x=1 成立”能证明“对所有整数成立”吗？
- 能，因为 1 是整数
- 能，只要再取 x=2
- 不能，全称命题不能由单个正例证明 [*]
? 有限正例只是抽查。全称命题需要覆盖论域的推理，或有限论域的完整枚举。
```

## 9. 选读：把清单迁移到代码审查

<details>
<summary>选读 · 数学证明与程序正确性</summary>

代码审查也问同样的问题：输入论域是什么？边界值是否处理？循环变量是否定义清楚？终止条件会不会漏掉空输入？有没有用未验证的假设保证终止？第 18 章的语言会一路流向算法正确性和形式化证明。

</details>

## 10. 下一站

第 18 章的证明语言已经搭好。下一章进入实分析：把“越来越近”变成能用 $\varepsilon$ 和 $\delta$ 检查的严格极限。

→ [第 19 章 · 实分析](../19-real-analysis/index.md)
