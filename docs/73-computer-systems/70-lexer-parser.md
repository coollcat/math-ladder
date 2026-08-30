---
title: 编译原理：词法与语法
lesson_id: computer-systems/lexer-parser
prereqs:
  - automata/regex-to-automata
  - automata/context-free-grammar
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_concepts:
  - token-longest-match
  - context-free-grammar
  - recursive-descent
  - precedence-layering
applications:
  - compiler-front-end
  - dsl-design
  - code-linting
exits:
  - engineering
---

# 编译原理：词法与语法

## 1. 从一个场景开始

`3 + 4 * 5` 等于多少？

你脱口而出 23。可如果老老实实从左往右算，$(3+4)\times5 = 35$。**你凭什么先算乘法？**

答案是：你脑子里有一套"分层规则"，而编译器把这套规则**写进了文法里**。这一课要做的，就是把那套看不见的规则挖出来，写成代码。

## 2. 直觉解释

读一句外文要分两步：**先认词，再断句**。

- **词法分析（lexing）**：把 `"3 + 4 * 5"` 这串字符切成 `3`、`+`、`4`、`*`、`5` 五个"词"（token）。它只管"哪些字符能凑成一个词"，**不管句子通不通**；
- **语法分析（parsing）**：检查这五个词的排列是否符合文法，并长成一棵**树**。树的结构决定了运算顺序。

关键洞察：**运算优先级不是查表查出来的，而是"长在树上的"**。乘法的节点比加法深一层，所以先算——后序遍历自然先算儿子再算父亲。

## 3. 正式定义

**token（记号）**：`类型` + `字面值` 的一对，如 `(num, "123")`、`(op, "+")`、`(id, "count")`。

**最长匹配原则（maximal munch）**：词法分析器在每个位置尝试所有可能的模式，取**能匹配到的最长**那一个。所以 `123` 是一个 token 而不是三个；`>=` 是一个 token 而不是 `>` 加 `=`。

**上下文无关文法（CFG）**：四元组 $G = (V, \Sigma, R, S)$，其中

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $V$ | 非终结符集 | 语法范畴，如 `expr`、`term`、`factor` |
| $\Sigma$ | 终结符集 | 就是 token 类型，如 `num`、`op`、`(` |
| $R$ | 产生式集 | 形如 $A \to \alpha$ 的重写规则 |
| $S$ | 开始符号 | 从它出发推导 |

**表达式的分层文法**（优先级全部由这个分层决定）：

$$\text{expr} \ \to\ \text{term}\ \bigl((\texttt{+}\mid\texttt{-})\ \text{term}\bigr)^*$$
$$\text{term} \ \to\ \text{factor}\ \bigl((\texttt{*}\mid\texttt{/})\ \text{factor}\bigr)^*$$
$$\text{factor} \ \to\ \texttt{num} \mid \texttt{id} \mid \texttt{(}\ \text{expr}\ \texttt{)}$$

**递归下降（recursive descent）**：每个非终结符写一个函数，函数体按产生式的右部依次调用其他函数（遇终结符就吃掉一个 token）。它是一种 **LL 分析**——从左到右读、构造最左推导。

**为什么分层就等于优先级**：越外层的非终结符，它的运算符**越晚被归约**，在树上就越靠**根**；越内层的越早归约、越靠**叶**。后序遍历先算叶，所以内层（乘除）先算。

## 4. 分步例题

**例**：用上面的文法分析 `3 + 4 * 5`。

1. `expr` 先调 `term`；
2. `term` 先调 `factor`，吃掉 `3`；接着看下一个 token 是 `+`，**不是 `*` 也不是 `/`**，所以 `term` 的循环不执行，返回 `3`；
3. 回到 `expr`：下一个 token 是 `+`，**匹配它的循环** → 吃掉 `+`，再调一次 `term`；
4. 第二个 `term`：吃掉 `4`，看到 `*`，进入自己的循环 → 吃掉 `*`，调 `factor` 吃掉 `5`，得 $4 \times 5 = 20$；
5. 回到 `expr`：$3 + 20 = 23$；
6. 树形：`+` 是根，左子 `3`，右子是 `*` 节点，其下是 `4` 和 `5`。**深度 3，最深的是乘法。**

## 5. 动手实验

### 实验 1（lab）：先看切词，再看树长出来

```lab
{
  "type": "lexer-parser",
  "title": "词法：最长匹配切 token；语法：递归下降长成树",
  "sliders": [
    { "name": "step", "label": "解析步", "min": 0, "max": 20, "step": 1, "value": 0 }
  ]
}
```

上方一排彩色小牌就是切好的 token（不同颜色是不同的类型）。拖"解析步"滑块，看树**从左到右、从下往上**一点点长出来——走到最后一步时，整棵表达式树完成。

做三个观察：

- 选 `3 + 4 * 5`：注意 `*` 节点是 `+` 节点的**儿子**而不是兄弟。树高 3；
- 选 `(a + b) * (c - 2)`：括号把 `+` **压到了** `*` 下面——括号的作用就是**强行改变树的形状**，它本身在树里不留下任何节点；
- 选 `x = 1 + 2 * 3`：根节点变成了 `=`，左子是 `x`、右子是整棵表达式。**赋值是优先级最低的操作**，所以它在最外层。

### 实验 2（python）：手写一个词法分析器

```python title="最长匹配：把字符流切成 token"
src = "x = 1 + 2 * 3"
i = 0
tokens = []
while i < len(src):
    ch = src[i]
    if ch == " ":                       # 空白：不是 token，直接跳过
        i = i + 1
        continue
    if ch.isdigit():                    # isdigit()：判断字符是不是 0~9
        j = i
        while j < len(src) and src[j].isdigit():
            j = j + 1                   # 最长匹配：一口气吃掉连续的所有数字
        tokens.append(("num", src[i:j]))
        i = j
        continue
    if ch.isalpha():                    # isalpha()：判断字符是不是字母
        j = i
        while j < len(src) and (src[j].isalnum() or src[j] == "_"):
            j = j + 1                   # 标识符：字母/数字/下划线
        tokens.append(("id", src[i:j]))
        i = j
        continue
    tokens.append(("op", ch))           # 剩下的都当单个字符的运算符
    i = i + 1

print(tokens)
print("token 数:", len(tokens))
```

输出 7 个 token。**这就是"最长匹配"的全部戏法**：在数字分支里用内层 `while` 一直吃到非数字为止。把 `src` 改成 `"x = 123 + y2"` 再跑一次，你会看到 `123` 是**一个** token 而不是三个——如果它被切成了三个，后面所有语法分析就全错了。

### 快问快答

```quiz
表达式的运算优先级（先乘除后加减）在编译器里通常是怎么实现的？
- 查一张「运算符优先级表」，遇到运算符就比较一下
- 靠文法的分层：低优先级运算放在外层非终结符，高优先级放在内层，于是它自然长在树的更深处 [*]
- 在词法分析阶段就把乘法 token 排到前面
? 递归下降里根本没有优先级表——优先级被「编码」进了产生式的嵌套结构：越内层的非终结符越早被归约，在语法树上就越深，而后序遍历先算深处。有些解析器（如算符优先分析）确实用优先级表，但主流手写解析器靠的都是分层。
```

:::warning[常见误区]

**误区一**："词法分析会检查语法错误。"
你以为 `3 + + 4` 会在词法阶段被拒——**不会**。词法分析器高高兴兴地切出 `3`、`+`、`+`、`4` 四个合法 token，语法分析器才会在"该出现 factor 的地方来了个 `+`"时报错。**词法管"词合不合法"，语法管"词序合不合法"，两层职责不能混。**

**误区二**："优先级是查表查出来的，所以调优先级就是改表。"
你以为改优先级是改数据——在递归下降解析器里，优先级**写在函数调用的嵌套结构里**，改优先级要改文法。这也是为什么 DSL 里加一个新运算符往往很痛：你得重新安排一层非终结符，并重新验证所有旧的表达式仍然解析成原来的树。

**误区三**："任何文法都能用递归下降解析。"
你以为它通用——递归下降（LL）要求**看到第一个 token 就能决定用哪条产生式**，因此无法处理**左递归**文法（如 `expr → expr + term`，会无限递归）。标准解法是把左递归改写成右递归加循环（正如本课文法里的 `('+' term)*`）。要直接吃下左递归，得用更强的 **LR 分析**（yacc/bison 那一族）。

:::

## 6. 练习

**练习 1**：这台递归下降求值器算 `3 + 4 * 5` 得 35。修到输出 `23`：

```exercise
# @title: 练习：乘法优先级去哪了
# @check: 23
# @hint: 优先级靠文法分层实现：外层的 expr 只处理低优先级的 +，内层的 term 才处理高优先级的 *。代码把两层 while 判断的操作符写反了
tokens = [("num", 3), ("op", "+"), ("num", 4), ("op", "*"), ("num", 5)]
pos = 0

def peek():
    if pos < len(tokens):
        return tokens[pos]
    return None

def factor():
    global pos
    t = peek()
    pos = pos + 1
    return t[1]

def term():                 # term 该处理 *（高优先级，绑得更紧）
    global pos
    left = factor()
    while peek() is not None and peek()[0] == "op" and peek()[1] == "+":   # ← 问题在这
        pos = pos + 1
        left = left + factor()
    return left

def expr():                 # expr 该处理 +（低优先级）
    global pos
    left = term()
    while peek() is not None and peek()[0] == "op" and peek()[1] == "*":   # ← 问题在这
        pos = pos + 1
        left = left * term()
    return left

print(expr())
```

**练习 2**：按本课文法，手算 `10 - 2 - 3` 的结果，并说出它的树形。若想让它等于 $10 - (2-3) = 11$，该怎么做？

<details>
<summary>点开查看逐步解答</summary>

1. `expr` 的循环是 `('+' | '-') term` 的**重复**，每次吃掉一个 `-` 和一个 term；
2. 第一次循环：$10 - 2 = 8$；第二次：$8 - 3 = 5$；
3. 所以结果是 **5**，树是"左倾"的链：`((10 - 2) - 3)`；
4. 要得到 11 必须加括号：`10 - (2 - 3)`。括号让内层 `expr` 先归约，把 `(2-3)` 变成右子树；
5. **这个性质叫结合性**：加减乘除在文法里是**左结合**（循环不断向左折叠）。要右结合（如赋值 `a = b = 0`、幂运算 `2**3**2`），就得把该层的循环改成右递归。**优先级管"先算谁"，结合性管"同级怎么配对"。**

</details>

## 7. 选读：LL 与 LR，以及"歧义文法"这个坑

<details>
<summary>选读 · 两种分析器的能力边界</summary>

| | LL（递归下降） | LR（移进-归约） |
| --- | --- | --- |
| 读的方向 | 左→右，最左推导 | 左→右，最右推导的逆 |
| 决定时机 | 看**开头**几个 token 就选产生式 | 读**完整**句柄才归约 |
| 左递归 | 不支持（要改写） | 支持 |
| 实现 | 手写，好调试 | 生成表，出错信息难懂 |
| 代表 | GCC 早期 C 前端、Clang、多数手写的解析器 | yacc / bison / 多数工业级语法 |

LR 能处理的文法严格多于 LL——因为"看过全部再决定"比"看头就决定"信息更多。但手写 LL 的出错信息与调试体验好得多，所以现代语言（Go、Rust、TypeScript）的手写解析器多半选 LL 或它的变体。

**歧义文法**是另一类麻烦：若一个句子能长出**两棵不同的树**，文法就歧义。经典例子是**悬空 else**：

```
stmt → if (expr) stmt | if (expr) stmt else stmt
```

句子 `if (a) if (b) x; else y;` 有两种解析——`else` 可以配内层 if，也可以配外层。C 语言用一条**不成文的规则**解决："else 与最近的未匹配 if 配对"。这条规则写在语言标准里，而不是文法里——**当文法解决不了时，就靠一条外部约定来裁决。**

</details>

## 8. 下一站

树建好了，编译器就能直接照着它生成代码了——可那样生成的代码又臭又长。真正的编译器还有一道工序：把树变成一种更规整的中间形式，然后**优化**。

→ [中间表示与优化](./80-ir-optimize.md)
