---
title: 第 18 章 · 数学语言与证明
description: 把直觉翻译成命题、量词、集合与证明结构，为卷二的严格数学打地基。
volume: 2
layer: L8
track:
  - algebra-structure
stage: university-core
difficulty: 3
---

# 数学语言与证明

本章是卷二入口。它不追求背证明套路，而是把卷一已经反复使用过的“为什么”变成可检查的语言：命题怎样精确表述，量词顺序如何改变含义，反例何时杀死一个猜想，归纳法为何能到达无穷。

## 课程模块

1. [命题与联结词](./10-propositions-connectives.md)——把中文争论翻译成真假开关；
2. [谓词与量词](./20-predicates-quantifiers.md)——钉住“所有”“存在”和论域边界；
3. [集合、关系与函数](./30-sets-relations-functions.md)——用箭头纪律看清映射身份；
4. [直接证明](./40-direct-proof.md)——从定义出发搭可检查的推理链；
5. [反证与反例](./50-contradiction-counterexample.md)——分清推翻猜想与确立不可能；
6. [归纳法进阶](./60-induction-advanced.md)——处理强递推和偏移起点；
7. [证明写作自查清单](./70-proof-writing-checklist.md)——把“我觉得对”换成七个问题。

## 生产状态

七门正式课已完成，配套 `truth-table`、`quantifier-hunt`、`set-mapper` 与 `proof-trail` 四类交互。

## 实战挑战 · 真假话推理

> 改编自 2013 年国家公务员考试行测判断推理「真假话」真题（珠宝店失窃案）。这类题目是命题、联结词、矛盾关系与量词否定的一次综合阅兵。

**背景**：某珠宝店失窃，甲、乙、丙、丁四人涉嫌被拘审。审讯时四人各说了一句话：

- 甲：「案犯是丙。」
- 乙：「丁是案犯。」
- 丙：「如果我作案，那么丁是主犯。」
- 丁：「作案的不是我。」

已知**四个口供中只有一句是假的**。

**(1)** 找出互为矛盾的两句口供（回忆：一对矛盾命题必一真一假）。
**(2)** 由"只有一句假话"断定其余两句都是真话，据此推出：谁是案犯？谁是主犯？
**(3)** 把你推出的结论填进下面的验证器，让机器复核——四句话里应当恰好一句为假，且说假的人可以点名。

```exercise
# @title: 实战挑战：机器复核口供
# @check: 丁在说假
# @check: 1
# @hint: 唯一的假话只能在互相矛盾的乙与丁之间，所以甲和丙都说的是真话。先由甲的话确定丙是案犯，再由丙的话确定丁是主犯；把这两个事实代回下面的三个变量，运行后应恰好剩下一句假话。
bing_is_culprit = False   # ← 猜想：只有丁一人作案（这是待检验的错误版本）
ding_is_culprit = True
ding_is_master = True     # 丁是否为主犯

jia_says = bing_is_culprit                           # 甲："案犯是丙"
yi_says = ding_is_culprit                            # 乙："丁是案犯"
bing_says = (not bing_is_culprit) or ding_is_master  # 丙："如果我作案，那么丁是主犯"。蕴含 p⇒q 等价于"非 p 或者 q"（第 10 课真值表）
ding_says = not ding_is_culprit                      # 丁："作案的不是我"

count = 0
if not jia_says:
    print("甲在说假")
    count = count + 1
if not yi_says:
    print("乙在说假")
    count = count + 1
if not bing_says:
    print("丙在说假")
    count = count + 1
if not ding_says:
    print("丁在说假")
    count = count + 1

print(count)
```

<details>
<summary>点开查看完整推理与解答</summary>

**第一步（找矛盾）**：乙说"丁是案犯"，丁说"作案的不是我"——这两句互为否定，是一对矛盾命题，必然一真一假。唯一的那句假话就锁在这两人之间。

**第二步（绕开矛盾）**：既然唯一的假话被乙、丁占用，甲和丙说的都是真话：

1. 甲为真 → 案犯是丙；
2. 丙为真且丙确实作案 → 按蕴含规则（前提真则结论真），丁是主犯。

于是事实是：**丙和丁都涉案，丁是主犯**。

**第三步（回到矛盾）**：拿事实逐句核对：

| 口供 | 真假 |
| --- | --- |
| 甲"案犯是丙" | 真 |
| 乙"丁是案犯" | 真 |
| 丙"如果我作案，那么丁是主犯" | 真（前件后件都真） |
| 丁"作案的不是我" | **假** |

恰好一句假话，说假话的是**丁**；作案者是丙和丁（原题正确选项 B）。机器复核的正确版本只需改第一个变量：

```python
bing_is_culprit = True
ding_is_culprit = True
ding_is_master = True

jia_says = bing_is_culprit
yi_says = ding_is_culprit
bing_says = (not bing_is_culprit) or ding_is_master
ding_says = not ding_is_culprit

count = 0
if not jia_says:
    print("甲在说假")
    count = count + 1
if not yi_says:
    print("乙在说假")
    count = count + 1
if not bing_says:
    print("丙在说假")
    count = count + 1
if not ding_says:
    print("丁在说假")
    count = count + 1

print(count)
```

输出 `丁在说假` 和 `1`，与人工推理一致。行测考场上的"一找二绕三回"，就是本章矛盾关系与条件句知识的直接应用。

</details>

本挑战用到的工具出自 [命题与联结词](./10-propositions-connectives.md)（蕴含与真值表）与 [反证与反例](./50-contradiction-counterexample.md)（矛盾关系）。

## 实战挑战 · 蕴含的真值表

蕴含 $p \to q$ 只有一个"假"的情形：$p$ 真而 $q$ 假。下面这个函数把"蕴含为假的条件"直接当成了返回值，修到输出 `False`、`True`：

```exercise
# @title: 实战挑战：蕴含的真值表
# @check: False
# @check: True
# @hint: p→q 为假 当且仅当 p 真 q 假；函数应返回"是否成立"，而不是"是否为假"。
def implies(p, q):
    return p and not q    # ← 问题在这：这是"蕴含为假"的条件，应取反

print(implies(True, False))
print(implies(True, True))
```

<details>
<summary>点开查看逐步解答</summary>

蕴含 $p \to q$ 只在 $p$ 真、$q$ 假时为假，其余三种情况都为真：

```python
def implies(p, q):
    return not (p and not q)   # 取反："p 真且 q 假"的否定 = 蕴含成立
```

改完：`implies(True, False)` 里 $p$ 真 $q$ 假 → 蕴含假 → `False`；`implies(True, True)` 里 $p$ 真 $q$ 真 → 蕴含真 → `True`。初始代码返回 `p and not q`，恰好是"蕴含不成立"的判据本身。牢记：蕴含只在"前真后假"时翻车。

</details>
