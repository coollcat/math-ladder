---
title: CYK 与 DP 解析选讲
lesson_id: automata/cyk-parsing
prereqs:
  - automata/parse-trees
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - chomsky-normal-form
  - cyk-parsing
applications:
  - compiler-parsing
  - structured-prediction
exits:
  - engineering
---

# CYK 与 DP 解析选讲

## 1. 从一个场景开始

句子一长，手画所有树会爆炸。CYK 算法不问“整句怎么切”，先问“每一小段可能是哪类”，再像拼乐高一样把小答案合成大答案。这是动态规划在语法上的标准演出。

## 2. 直觉解释

先把文法改写成乔姆斯基范式（CNF）：规则只允许

$$A\to BC\quad\text{或}\quad A\to a$$

然后建一张三角表。第 $1$ 层放单字符的类别；第 $k$ 层检查长度为 $k$ 的区间能否由两个更短区间拼成。

若开始符号 $S$ 出现在覆盖全串的顶格，字符串属于文法。

## 3. 正式递推

设输入 $w=a_1a_2\cdots a_n$，用 $T[i,j]$ 表示能推导子串

$$a_i a_{i+1}\cdots a_j$$

的全部变量集合。CNF 下：

$$T[i,i]=\lbrace A:A\to a_i\rbrace,\qquad T[i,j]=\bigcup_{k=i}^{j-1}\lbrace A:\exists(B,C),\ A\to BC,\ B\in T[i,k],\ C\in T[k+1,j]\rbrace$$

$w\in L(G)$ 当且仅当 $S\in T[1,n]$。

长度为 $n$ 的串有约 $n^2/2$ 个区间；每个区间最多尝试 $n-1$ 个切点和若干规则，因此朴素 CYK 是 $O(n^3)$ 级。

## 4. 分步例题

取 CNF 文法：

$$S\to AB\mid SS,\quad A\to a,\quad B\to b$$

检查 `abab`：

1. 长度 1：两个 `a` 都给出 $A$，两个 `b` 都给出 $B$；
2. 长度 2：区间 `ab` 由 $A\cdot B$ 得 $S$；区间 `ba` 没有 $B\cdot A$ 规则，为空；
3. 长度 3：`aba` 和 `bab` 的每种切法都无法让左右变量配上规则；
4. 长度 4：从中间切开，左半 `ab` 有 $S$，右半 `ab` 也有 $S$，规则 $S\to SS$ 命中；
5. 全串格含 $S$，所以接受。

## 5. 动手实验

### 实验 1（python）：填 CYK 表

```python title="对 abab 运行小型 CYK"
single = {                     # 单字符规则：终结符 -> 可能变量
    "a": "A",
    "b": "B",
}
pairs = {                      # 二元规则：BC -> 能产生它的左边集合
    ("A", "B"): "S",
    ("S", "S"): "S",
}
text = "abab"
chart = {}                     # 代码下标从 0 开始；(i,j) 表示闭区间的变量串

for i in range(len(text)):
    chart[(i, i)] = single[text[i]]     # 元组 (i,i) 表示单字符区间

for span in range(2, len(text) + 1):    # span 是子串长度
    for left in range(0, len(text) - span + 1):
        right = left + span - 1
        found = ""
        for cut in range(left, right):
            for b in chart[(left, cut)]:
                for c in chart[(cut + 1, right)]:
                    produced = pairs.get((b, c), "")   # get：查不到时返回默认空串
                    for variable in produced:
                        if variable not in found:
                            found = found + variable
        chart[(left, right)] = found

for key in sorted(chart.keys()):        # keys() 取出全部字典键；sorted 排序便于阅读
    print(f"{key}: {chart[key]}")
print(f"top contains S: {'S' in chart[(0, len(text) - 1)]}")
```

最后一行应为 `True`。把 `text` 改成 `abb` 再跑，顶格没有 $S$，输出变假。

### 实验 2（python）：只看关键合并

```python title="手工复算顶格"
pairs = {                      # 与上一个 CYK 表使用同一组二元规则
    ("A", "B"): "S",
    ("S", "S"): "S",
}
left_half = "S"                # 左半 ab 的变量集合
right_half = "S"               # 右半 ab 的变量集合
hits = ""

for left_var in left_half:
    for right_var in right_half:
        hits = hits + pairs.get((left_var, right_var), "")
print(f"combine {left_half} | {right_half} -> {hits}")
print("accepted" if "S" in hits else "rejected")
```

这段实验放大了最后一步：左半 `ab` 提供 $S$，右半也提供 $S$，规则 $S \to SS$ 正好命中。

:::warning[常见误区]

你以为任意 CFG 都能直接套公式。必须先转成 CNF，否则三分叉或 $\varepsilon$ 规则会破坏“两块合一”的递推。

你以为表里存字符串就是完整解析树。基础 CYK 只判成员；要恢复树还需回溯每个变量的切点和左右孩子。

你以为 CYK 总是最快解析器。它稳定且适合教学与稠密语法，但很多工程 LR/LR 类分析器在合适文法上更快。

:::

## 6. 练习

```exercise
# @title: 练习：检查二元规则的顺序
# @check: S
# @check: none
# @check: True
# @hint: 规则是 S -> A B，所以左格必须是 A、右格必须是 B；ba 的顺序相反。
def cell_for(text):
    if len(text) == 2:
        single = {"a": "A", "b": "B"}   # 先把输入字符换成对应变量
        left = single.get(text[0], "?")
        right = single.get(text[1], "?")
        pairs = {("B", "A"): "S"}       # 这里故意写反了，请对照 S -> A B
        return pairs.get((left, right), "none")
    return "none"

first = cell_for("ab")
second = cell_for("ba")
third = "S" in first
print(first)
print(second)
print(third)
```

期望输出是 `S`、`none`、`True`。初始代码把 `A B` 写成了反序，因此第一、三行不对；把键改成 `("A", "B")` 即可通过。

```quiz
CYK 要求文法先转换成哪种规范形状？
- 每条规则右边至少三个符号
- 乔姆斯基范式：A -> BC 或 A -> a [*]
- 所有规则都必须含 epsilon
? CNF 保证每个非叶节点恰好分成两个孩子，这是区间动态规划的基础。
```

## 7. 选读：从判定到最佳树

<details>
<summary>选读 · 概率 CYK</summary>

给每条产生式一个概率后，把布尔“并”换成概率乘积与最大值，就能在每个区间保留最佳子树。递推变成加权动态规划，常用于句法分析和结构预测。此时不仅要记录变量，还要记录得分和回溯指针。
</details>

## 8. 下一站

零件已经齐了：正则、上下文无关、栈、泵引理和动态规划。最后一课把它们摆进同一张方法地图，避免以后拿着锤子找钉子。

→ [自动机方法地图](./90-method-map.md)
