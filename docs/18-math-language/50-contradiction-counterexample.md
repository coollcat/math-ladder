---
title: 反证与反例
lesson_id: math-language/contradiction-counterexample
prereqs:
  - math-language/direct-proof
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
  - contradiction
  - counterexample
applications:
  - conjecture-testing
  - impossibility-proofs
exits:
  - research
---

# 反证与反例

## 1. 从一个场景开始

想推翻“所有天鹅都是白色”，一只黑天鹅就够了；想证明“没有最大素数”，却要排除每一种“最大”的可能。反例和反证都从反面进攻，但目标完全不同。

## 2. 直觉解释

**反例**针对全称命题。命题说“所有 $x$ 都有性质 $P$”，只要找到一个满足论域却破坏 $P$ 的对象，猜想立刻死掉。

**反证**针对要确立的结论。先假设结论不对，再从这个假设推出矛盾。既然“结论不对”会造出不可能的世界，结论就只能成立。

## 3. 正式定义

要否定 $\forall x\,P(x)$，只需给出一个 $a$ 使 $P(a)$ 为假。

要证明命题 $C$ 用反证法（也叫归谬法），步骤是：

1. 假设 $\neg C$；
2. 由定义、已知事实和逻辑规则推出 $A \land \neg A$；
3. 因为矛盾不可能成立，所以假设 $\neg C$ 不成立，故 $C$ 成立。

## 4. 分步例题

**例 1（反例）**：猜想“所有素数都是奇数”。取 $2$：它是素数，但不是奇数。猜想被否定。

**例 2（反证）**：证明 $\sqrt{2}$ 不是分数。

1. 假设 $\sqrt{2}=\frac{p}{q}$，其中 $p,q$ 是整数且已约到最简；
2. 则 $p^2=2q^2$，所以 $p^2$ 是偶数，从而 $p$ 是偶数；
3. 写 $p=2r$，代入得 $4r^2=2q^2$，即 $q^2=2r^2$，所以 $q$ 也是偶数；
4. $p,q$ 都是偶数，与“已约到最简”矛盾；
5. 因此 $\sqrt{2}$ 不是分数。

## 5. 动手实验

### 实验 1：找反例

```viz
{
  "type": "quantifier-hunt",
  "title": "所有人都有箭头吗？",
  "domain": ["甲", "乙", "丙"],
  "range": ["A", "B", "C"],
  "relations": [["甲", "A"], ["乙", "B"]],
  "form": ["forall"]
}
```

命题声称每个左元素都有箭头。丙没有，所以它就是反例。点击格子补上丙的箭头，反例消失，命题变真。

### 实验 2：反证链

```viz
{
  "type": "proof-trail",
  "title": "根号 2 反证骨架",
  "steps": [
    { "id": "假设", "text": "根号2=p/q 且已最简" },
    { "id": "平方", "text": "p^2=2q^2" },
    { "id": "p偶", "text": "p 是偶数" },
    { "id": "代入", "text": "q^2=2r^2" },
    { "id": "q偶", "text": "q 也是偶数" },
    { "id": "矛盾", "text": "p,q 有公因数 2，与最简矛盾" }
  ],
  "edges": [["假设", "平方"], ["平方", "p偶"], ["p偶", "代入"], ["代入", "q偶"], ["q偶", "矛盾"]]
}
```

这条链的终点不是结论，而是矛盾。矛盾一旦成立，最初的假设就被排除。

### 实验 3：机器找反例

```python title="在有限列表里找奇数反例"
def hunt(numbers):
    for n in numbers:
        if n % 2 == 1:    # 余数是 1，说明 n 是奇数
            return "counterexample"
    return "no counterexample"

print(hunt([2, 4, 5]))
print(hunt([2, 4, 6]))
print("contradiction")
```

前两行分别输出 `counterexample`、`no counterexample`。第三行只是标记另一种推理类型，不是由列表算出的结果。

## 6. 练习

```exercise
# @title: 练习：区分反例与反证
# @check: counterexample
# @check: no counterexample
# @check: contradiction
# @hint: 前两问看列表里有没有奇数；第三问只有在推理步骤里出现「矛盾」时才输出 contradiction。
def hunt(numbers):
    for n in numbers:
        if n % 2 == 0:
            return "counterexample"
    return "no counterexample"

def has_contradiction(steps):
    found = False
    for step in steps:
        if step == "矛盾":
            found = True
    return found

proof_steps = ["假设", "推导", "结论"]

print(hunt([2, 4, 5]))
print(hunt([2, 4, 6]))
if has_contradiction(proof_steps):
    print("contradiction")
else:
    print("counterexample")
```

<details>
<summary>点开查看逐步解答</summary>

把判断条件改成找奇数；再在 `proof_steps` 的推导之后加入「矛盾」，让结构检查真的找到它：

```python
def hunt(numbers):
    for n in numbers:
        if n % 2 == 1:
            return "counterexample"
    return "no counterexample"

def has_contradiction(steps):
    found = False
    for step in steps:
        if step == "矛盾":
            found = True
    return found

proof_steps = ["假设", "推导", "矛盾", "结论"]

print(hunt([2, 4, 5]))
print(hunt([2, 4, 6]))
if has_contradiction(proof_steps):
    print("contradiction")
else:
    print("counterexample")
```

$5$ 是奇数，所以第一组有反例；第二组全是偶数，没有反例。第三问的关键不是换标签：反证必须先有反向假设，并在推出「矛盾」后才得到结论。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为一个正例能证明全称命题。正例只能维持猜想活着；一个反例就能杀死它。

**误区二**：你以为反证的假设可以悄悄使用结论。反证只假设结论否定；中途若直接引用结论，就成了循环论证。

**误区三**：你以为推出荒谬结果就是矛盾。矛盾必须是 $A$ 与 $\neg A$ 同时成立，或与已证事实冲突；“我不喜欢这个结果”不算。

:::

## 8. 快问快答

```quiz
要否定“所有素数都是奇数”，最短的方法是什么？
- 证明所有合数都不是素数
- 找出一个偶素数 [*]
- 假设所有素数都是奇数并推出矛盾
? 全称命题只需一个反例。2 是素数且是偶数，猜想立即被否定。
```

## 9. 选读：为什么矛盾能排除假设

<details>
<summary>选读 · 排除不可能世界</summary>

经典逻辑接受“非矛盾原则”：同一语境下 $A$ 与 $\neg A$ 不能同时为真。若从 $\neg C$ 推出矛盾，说明 $\neg C$ 不能在任何满足公理的模型中出现；于是只剩 $C$。反证法并不创造新事实，而是把不可能世界从地图上删掉。

</details>

## 10. 下一站

现在能处理一步、两步的推理，也能处理“不可能”。下一课回到无穷步：把归纳法升级成能处理强递推和偏移起点的版本。

→ [归纳法进阶](./60-induction-advanced.md)
