---
title: 正则表达式与有限自动机
lesson_id: automata/regex-to-automata
prereqs:
  - automata/regular-languages
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
  - regular-expression
  - thompson-construction
applications:
  - lexical-analysis
  - search-patterns
exits:
  - engineering
---

# 正则表达式与有限自动机

## 1. 从一个场景开始

搜索框里的一行 `ab*c`，背后其实是一张小地图：读 $a$，然后绕圈吃掉若干 $b$，最后读 $c$ 才能出去。正则表达式是给人看的路线图，自动机是机器执行的地图。

## 2. 直觉解释

正则表达式只有三种运算（连接、选择、星号），外加三个不能再拆的零件：字符、空串、空语言。

| 写法 | 名字 | 语言含义 |
| --- | --- | --- |
| $a$ | 字符 | 只含字符串 $a$ |
| $\varepsilon$ | 空串 | 不消耗字符，语言 $\lbrace\varepsilon\rbrace$ |
| $\varnothing$ | 空语言 | 什么都不匹配 |
| $RS$ | 连接 | 先匹配 $R$ 再匹配 $S$ |
| $R\mid S$ | 选择 | 匹配 $R$ 或匹配 $S$ |
| $R^*$ | 星号 | 把 $R$ 重复零次或多次 |

优先级通常是：星号最高，连接其次，选择最低。所以 $ab^*$ 表示一个 $a$ 后面跟零个或多个 $b$，而不是整串 $ab$ 重复。

## 3. 正式定义

给定字母表 $\Sigma$，正则表达式递归定义为：

$$\varnothing,\ \varepsilon,\ a\ (a\in\Sigma),\quad R+S,\ RS,\ R^*$$

这里的加号与竖线同义：$R+S$ 就是 $R\mid S$。它们分别表示语言 $\varnothing$、$\lbrace\varepsilon\rbrace$、$\lbrace a\rbrace$、$L(R)\cup L(S)$、$L(R)L(S)$、$(L(R))^*$。Kleene 定理说：

$$L\text{ 正则}\iff L\text{ 可由某个正则表达式表示}\iff L\text{ 被 DFA/NFA 识别}$$

从表达式到 NFA 可以按语法结构拼装：选择做并联，连接做串联，星号加回路。这就是 Thompson 构造的思想。

## 4. 分步例题：翻译 $a(b\mid c)^*d$

Thompson 构造把「按结构拼装」落成四条机械规则，每条只管一小片：

| 表达式零件 | 拼法 | 新增状态 |
| --- | --- | --- |
| 字符 $a$ | 画一条带字符的边 $s\xrightarrow{a}f$ | 2 |
| 连接 $RS$ | R 的终点直接当 S 的起点，接上即合并 | 0 |
| 选择 $R\mid S$ | 新起点 $s$、新终点 $f$：$s\xrightarrow{\varepsilon}R_{\text{起}}$、$s\xrightarrow{\varepsilon}S_{\text{起}}$、$R_{\text{终}}\xrightarrow{\varepsilon}f$、$S_{\text{终}}\xrightarrow{\varepsilon}f$ | 2 |
| 星号 $R^*$ | 新起点 $s$、新终点 $f$：$s\xrightarrow{\varepsilon}R_{\text{起}}$、$s\xrightarrow{\varepsilon}f$（零次，直接出去）、$R_{\text{终}}\xrightarrow{\varepsilon}R_{\text{起}}$（绕回）、$R_{\text{终}}\xrightarrow{\varepsilon}f$（出去） | 2 |

逐件拼这一次：

1. $a$ 是一条只读 $a$ 的边：$S\xrightarrow{a}A$；
2. $(b\mid c)^*$ 先在 $b$ 与 $c$ 之间并联，再套星号：入口 $L$ 可空步选 $b$ 支或 $c$ 支，两支走完都汇到 $E$；$E$ 要么空步绕回 $L$，要么空步出去到 $T$；
3. 走进星号时，$A$ 还能直接空步跳到 $T$——这就是「零次」，空串也是合法长度；
4. $T\xrightarrow{d}F$ 是最后一条边，$F$ 是唯一接受态；
5. 因此接受形如 $ad$、$abd$、$acd$、$abcbd$ 的串；
6. $abc$ 缺少最后的 $d$，拒绝（读完停在回路附近，不在 $F$）；
7. $adb$ 在 $d$ 后多出字符，也拒绝（$F$ 没有出边，多出的 $b$ 无处可走）。

拼出来的 ε-NFA 一共 10 个状态、12 条边，全部由零件机械拼出，没有一处是为这道题手画的捷径。下一节就让它跑起来。

## 5. 动手实验

### 实验 1（python）：手工匹配 $a(b\mid c)^*d$

```python title="不用正则库，先看结构"
def match_pattern(text):
    if len(text) < 2:                 # 至少要有首尾 a/d
        return False
    if text[0] != "a":                # 下标 0 是第一个字符
        return False
    if text[len(text) - 1] != "d":    # 最后一个字符必须是 d
        return False
    for ch in text[1:len(text) - 1]:  # 切片取第 2 个字符到倒数第 2 个字符
        if ch != "b" and ch != "c":
            return False
    return True

for word in ["ad", "abcd", "acbd", "abc"]:
    print(f"{word}: {match_pattern(word)}")
```

这段代码把表达式结构直接展开：首字符、可循环中段、尾字符。改一个条件，就相当于改一张自动机箭头。

### 实验 2（python）：让拼出来的 ε-NFA 跑起来

```python title="平行状态集合模拟 ε-NFA"
nfa = {                          # 每个 (状态, 符号) 对应可能落点列表；"ε" 表示空步
    ("S", "a"): ["A"],
    ("A", "ε"): ["L", "T"],
    ("L", "ε"): ["B", "C"],
    ("B", "b"): ["B2"],
    ("C", "c"): ["C2"],
    ("B2", "ε"): ["E"],
    ("C2", "ε"): ["E"],
    ("E", "ε"): ["L", "T"],
    ("T", "d"): ["F"],
}
start, finish = "S", "F"         # 起点与唯一接受态

def closure(states):             # closure：把所有靠空步可达的状态也收进名单
    stack = list(states)         # list(...) 复制一份，免得把传进来的名单改坏
    reached = list(states)
    while stack:
        s = stack.pop()          # pop() 取出并移除名单最后一项
        for nxt in nfa.get((s, "ε"), []):   # get：没有空步出边时返回空列表
            if nxt not in reached:            # not in 检查名单里还没有它
                reached.append(nxt)           # append：往名单尾部加一项
                stack.append(nxt)
    return reached

def accepts(text):
    current = closure([start])   # 读之前先走完所有空步
    for ch in text:              # 每读一个字符，所有平行状态同时前进一步
        moved = []
        for s in current:
            moved = moved + nfa.get((s, ch), [])
        current = closure(moved)
        if not current:          # 平行世界全灭：任何一条路都读不下去了
            return False
    return finish in current

for word in ["ad", "abd", "acd", "abcbd", "abc", "adb"]:
    print(f"{word}: {accepts(word)}")
```

六行输出依次是 `True`、`True`、`True`、`True`、`False`、`False`，与上一节的逐条判断一一对应。`adb` 的故事值得单独讲：读完 `ad` 时平行集合里已经有 $F$，但输入还没结束，而 $F$ 一条出边也没有，于是所有路同时断掉。

### 实验 3（viz）：选择与交集的布尔预览

```viz
{
  "type": "truth-table",
  "formula": "p or q",
  "showColumns": ["p", "q", "p or q", "p and q", "not p", "not q"]
}
```

若 $p$ 代表“匹配了 $R$”，$q$ 代表“匹配了 $S$”，那么 $R\mid S$ 在一根固定字符串上的核心判断就是 `p or q`；上一课 $L(R)\cap L(S)$ 的核心则是 `p and q`。整类语言的封闭性还要靠机器构造，但选择和交集的语义差异已经在这里显形。

:::warning[常见误区]

你以为 $ab^*$ 会匹配 `abab`。其实星号只作用于紧邻的 $b$；想重复整个 $ab$ 要写 $(ab)^*$。

你以为正则表达式一定能数任意括号深度。其实普通有限自动机记不住无界计数，这类语言通常超出正则范围。

你以为空串可有可无。其实 $a^*$ 里“零个 a”就是 $\varepsilon$，这是很多匹配错误的原因。

:::

## 6. 练习

```exercise
# @title: 练习：修好 (ab)* 的匹配器
# @check: True
# @check: False
# @check: True
# @hint: 空串要接受；奇数长度拒绝；剩余字符必须按 a,b,a,b... 配对。
def match_ab_star(text):
    if len(text) % 2 != 0:      # % 取余；余数不为 0 说明长度是奇数
        return True
    for i in range(0, len(text), 2):   # range(start, stop, step) 每 2 步取一个下标
        if text[i] != "a" or text[i + 1] != "a":
            return False
    return True

print(match_ab_star(""))
print(match_ab_star("aba"))
print(match_ab_star("ab"))
```

期望输出依次是 `True`、`False`、`True`。初始代码有两处错：奇数长度误返回真，且第二字符检查成了 `a`。

```quiz
正则表达式 a|bc 表示什么？
- a 后面跟 b 或 c
- 字符串 a，或者字符串 bc [*]
- 字符串 ac 或 abc
? 连接优先级高于选择，所以右边整体是 bc；若想要 a 后面跟 b 或 c，应写 a(b|c)。
```

## 7. 选读：编译器的三步走

<details>
<summary>选读 · 表达式 → NFA → DFA</summary>

词法分析器常先把每个 token 的模式变成小型 NFA，再并联成一个大 NFA；接着用子集构造得到 DFA，并在接受状态上标注优先级；最后最小化或直接生成查表代码。这样源代码里的人类语法就变成了运行时的高效状态转移。
</details>

## 8. 下一站

既然有这么多正则工具，自然要问边界在哪里。泵引理就是那根探出正则世界之外的探针。

→ [泵引理与非正则语言](./60-pumping-lemma.md)
