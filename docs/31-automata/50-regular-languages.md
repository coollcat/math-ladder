---
title: 正则语言
lesson_id: automata/regular-languages
prereqs:
  - automata/subset-construction
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
  - regular-language
  - closure-properties
applications:
  - text-search
  - protocol-validation
exits:
  - research
---

# 正则语言

## 1. 从一个场景开始

如果一台门卫认识访客册 $A$，另一台认识 $B$，能不能造一台只放行“两边都同意”的门卫？能不能放行“先过 A 再过 B”的人？正则语言的封闭性就是这些组装说明书。

## 2. 直觉解释

**正则语言**就是某个 DFA（等价地某个 NFA）能识别的语言。它不代表“所有规则”，只代表“有限状态够用的规则”。

两个正则机器可以并联、串联或循环使用。并联对应并集，串联对应连接，循环对应星号闭包。

## 3. 正式定义与封闭性

语言 $L$ 是正则的，当且仅当存在 DFA $M$ 使 $L=L(M)$。正则语言类对下列运算封闭：

$$A\cup B,\quad AB,\quad A^*,\quad \bar A,\quad A\cap B$$

| 运算 | 直觉 | 构造要点 |
| --- | --- | --- |
| 并 $A\cup B$ | 任一台收下就收下 | 平行运行两台，终态组合属于 $(F_A\times Q_B)\cup(Q_A\times F_B)$ |
| 连接 $AB$ | 先跑完 A 再跑 B | 加入空转移或在乘积状态上传递“已完成 A” |
| 星 $A^*$ | 重复零次或多次 | 加新的起点/终点和回跳边 |
| 补 $\bar A$ | 反转结果 | DFA 终态与非终态互换 |
| 交 $A\cap B$ | 两台都要收下 | 乘积构造，终态对是 $F_A\times F_B$ |

封闭性说的是：输入保证正则时，输出仍正则。它不能反着用来说明某个语言一定正则。

## 4. 分步例题：乘积机判交集

设 $A$ 认偶数个 $a$，状态 $E,O$；$B$ 认以 $b$ 结尾，状态 $N,Y$。

1. 新状态写成组合：$(E,N),(E,Y),(O,N),(O,Y)$；
2. 读入一个符号时，两个分量各自转移；
3. 例如 $(E,N)$ 读 $b$ 变 $(E,Y)$；
4. 接受组合只有 $(E,Y)$；
5. 因此这台乘积 DFA 正好识别“偶数个 $a$ 且以 $b$ 结尾”；
6. 这证明该交集语言正则。

这台乘积机也能直接上手——四个组合状态各就各位，接受态只有 $(E,Y)$：

```viz
{
  "type": "dfa-runner",
  "title": "乘积 DFA：偶数个 a 且以 b 结尾",
  "states": ["(E,N)", "(E,Y)", "(O,N)", "(O,Y)"],
  "alphabet": ["a", "b"],
  "transitions": [["(E,N)", "a", "(O,N)"], ["(E,N)", "b", "(E,Y)"], ["(E,Y)", "a", "(O,Y)"], ["(E,Y)", "b", "(E,Y)"], ["(O,N)", "a", "(E,N)"], ["(O,N)", "b", "(O,Y)"], ["(O,Y)", "a", "(E,Y)"], ["(O,Y)", "b", "(O,Y)"]],
  "start": "(E,N)",
  "accepting": ["(E,Y)"],
  "input": "abab"
}
```

怎么玩：在输入框换串再「一键跑完」，试着找出哪些串能走到 $(E,Y)$——$a$ 只管 $E/O$ 翻转、$b$ 只管 $N/Y$ 升级，两条记账互不干扰。这正是乘积构造「各记各的账」的视觉版。

## 5. 动手实验

### 实验 1（viz）：单个串上的布尔封闭性

```viz
{
  "type": "truth-table",
  "formula": "p and q",
  "showColumns": ["p", "q", "p and q", "p or q", "not p"]
}
```

把 $p$ 看作固定字符串 $w$ 是否属于 $A$，把 $q$ 看作是否属于 $B$。表格里的 `and` 就是这一根弦上的交集判定，`or` 是并集，`not p` 是补集。整类语言的封闭性还需要机器构造，但布尔层先让语义可见。

### 实验 2（python）：并联两台小机器

```python title="同一根弦分别问两台 DFA"
def even_a(text):              # A：偶数个 a
    state = "E"
    for ch in text:
        if ch == "a":
            state = "O" if state == "E" else "E"
    return state == "E"

def ends_b(text):              # B：以 b 结尾
    if len(text) == 0:         # len 已在前置课引入；== 比较是否相等
        return False
    last = text[len(text) - 1] # 通过下标取出最后一个字符
    return last == "b"

for word in ["aab", "aa", "b"]:
    print(f"{word}: even={even_a(word)}, ends_b={ends_b(word)}, both={even_a(word) and ends_b(word)}")
```

第三列 `both` 就是单次判定的交集。真正的乘积机会同时推进两个状态，但结论完全一致。

:::warning[常见误区]

你以为“正则”等于“正则表达式好写”。其实两者描述的是同一个语言类，但可读性和简洁度不同。

你以为封闭性可以证明某语言正则。其实只能从已知正则语言造出新正则语言；否定要用泵引理等工具。

你以为补 DFA 时也要补字母表。其实字母表保持不变，只反转终态集合。

:::

## 6. 练习

目标语言是：所有**非空**、至少含一个 `a` 且以 `b` 结尾的串。请让 `rule()` 同时完成这三项判定。

```exercise
# @title: 练习：写出三重判定
# @check: False
# @check: True
# @check: False
# @hint: 三重条件是长度大于 0、包含 a、以 b 结尾。逐个测试三个样例。
def has_a(text):
    answer = False
    for ch in text:
        if ch == "a":
            answer = True
    return answer

def ends_b(text):
    if len(text) == 0:
        return False
    return text[len(text) - 1] == "b"

def rule(text):
    return has_a(text)

print(rule(""))
print(rule("ab"))
print(rule("ba"))
```

初始代码只检查了是否包含 `a`，还没有把“以 b 结尾”纳入三重判定；让 `rule()` 同时使用 `has_a()` 和 `ends_b()`。

```quiz
已知 A 和 B 都是正则语言，哪一句一定成立？
- A 的补集可能是非正则的
- A 与 B 的交集仍是正则语言 [*]
- A 与 B 的连接一定是空语言
? 正则语言对补、并、交、连接和星号闭包都封闭；交集可用乘积自动机构造。
```

## 7. 选读：为什么乘积状态数相乘

<details>
<summary>选读 · 同步时钟</summary>

两台 DFA 必须在同一输入位置同步走一步，因此联合状态是配对 $(p,q)$。若第一台有 $m$ 个状态、第二台有 $n$ 个，乘积最多 $mn$ 个状态。很多配对从起点不可达，实际机器往往更小。
</details>

## 8. 下一站

封闭性给了组装方式，但工程里更常用一种紧凑写法来描述模式。正则表达式正是这种写法，而且能机械地变回自动机。

→ [正则表达式与有限自动机](./55-regex-to-automata.md)
