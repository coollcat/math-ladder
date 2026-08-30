---
title: 上下文无关文法
lesson_id: automata/context-free-grammar
prereqs:
  - automata/pda-stack
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
  - context-free-grammar
  - production-rule
applications:
  - programming-language-syntax
exits:
  - research
---

# 上下文无关文法

## 1. 从一个场景开始

一句中文可以被切成主语、谓语、宾语；一段程序也能被切成表达式、语句、函数体。上下文无关文法用一条条替换规则描述这种嵌套，而不关心左右两侧夹着什么。

## 2. 直觉解释

文法像菜谱：从开始符号出发，不断把某个变量替换成右侧模式，直到只剩终结符。

- 变量是非终局类别，如句子、表达式；
- 终结符是最终产物，如单词、括号；
- 产生式规定合法替换；
- 开始符号是整段结构的入口。

## 3. 正式定义

上下文无关文法（CFG）是四元组

$$G=(V,\Sigma,P,S)$$

其中 $V$ 是变量集，$\Sigma$ 是终结符集，二者不相交；$P$ 是产生式集，$S\in V$ 是开始符号。每条产生式形如

$$A\to \alpha,\quad A\in V,\ \alpha\in(V\cup\Sigma)^*$$

左边只有一个变量，右边任意。推导用 $\Rightarrow$ 表示一次替换，用 $\Rightarrow^*$ 表示零步或多步。文法生成的语言是

$$L(G)=\lbrace w\in\Sigma^*:S\Rightarrow^*w\rbrace$$

每个上下文无关语言都可被 PDA 识别；反之亦然。

| 记号 | 名字 | 例子 |
| --- | --- | --- |
| $S$ | 开始变量 | 整个平衡括号串 |
| $A,B$ | 变量 | 中间语法类别 |
| $a,b$ | 终结符 | 实际字符 |
| $\Rightarrow$ | 推导一步 | 用规则替换左侧一个变量 |
| $\Rightarrow^*$ | 多步推导 | 直到没有变量 |

## 4. 分步例题：平衡括号与 $a^n b^n$

平衡括号文法：

$$S\to (S)\mid SS\mid\varepsilon$$

推导 `(())()`：

1. $S\Rightarrow SS$；
2. 第一个 $S\Rightarrow(S)\Rightarrow((S))\Rightarrow(())$；
3. 第二个 $S\Rightarrow()$；
4. 所以 $S\Rightarrow^*(())()$。

$a^n b^n$ 文法：

$$S\to aSb\mid\varepsilon$$

推导 `aabb`：

1. $S\Rightarrow aSb$；
2. 内层 $S\Rightarrow ab$；
3. 外层包住得 $aabb$；
4. 规则保证每个前加的 `a` 都有一个后加的 `b` 相配。

## 5. 动手实验

### 实验 1（python）：模拟最长优先推导

```python title="展开 S -> aSb"
def derive(n):                 # n 表示嵌套层数
    result = ""
    for i in range(n):         # 每层先放一个 a
        result = result + f"a({i}) "
    result = result + "S"
    for i in range(n - 1, -1, -1):   # 倒序补上 b，展示包裹顺序
        result = result + f" b({i})"
    return result

for n in [0, 1, 2]:
    print(f"n={n}: {derive(n)}")
```

这不是正式解析器，而是把“外层规则包住内层结果”的过程摊开。数字编号帮助你看出哪一对 `a,b` 来自同一层。

### 实验 2（python）：递归检查平衡括号

```python title="文法思想的递归版"
def balanced(text):
    if len(text) == 0:                 # S -> epsilon
        return True
    depth = 0                          # depth 记录未闭合的左括号数
    for ch in text:
        if ch == "(":
            depth = depth + 1
        elif ch == ")":
            depth = depth - 1
            if depth < 0:              # 右括号提前出现
                return False
    return depth == 0                  # 最后必须全部闭合

for word in ["", "(())", "(()"]:
    print(f"{word}: {balanced(word)}")
```

计数器是栈内容的摘要：栈里如果只有一种括号，只需知道数量，不必保存每个符号身份。

:::warning[常见误区]

你以为上下文无关意味着“没有上下文信息”。准确说是一条规则的左边不能有邻居，不代表语义不依赖上下文。

你以为 CFG 能表达一切嵌套约束。它能处理单栈嵌套，但不能自然要求三种数量相等，如 $a^n b^n c^n$。

你以为推导唯一才算文法好。有些合法文法会产生多棵树，这就是下一课的歧义问题。

:::

## 6. 练习

```exercise
# @title: 练习：判断哪些串由 S->aSb|ε 生成
# @check: True
# @check: True
# @check: False
# @hint: 语言恰好是所有相等数量的若干 a 后接相同数量的 b。
def in_language(text):
    seen_b = False
    count_a = 0
    count_b = 0
    for ch in text:
        if ch == "a":
            count_a = count_a + 1
        elif ch == "b":
            seen_b = True
            count_b = count_b + 1
        else:
            return False
    return count_a == count_b

print(in_language(""))
print(in_language("aaabbb"))
print(in_language("abab"))
```

初始代码只比较了两种字母的数量，还没使用 `seen_b` 拒绝 `a` 出现在 `b` 之后；第三个样例交替出现 `a` 和 `b`，无法由 $S\to aSb$ 包出来，应返回假。

```quiz
下面哪一组规则属于上下文无关文法允许的形式？
- A -> aB，B -> b [*]
- AB -> a
- aB -> Ab
? CFG 每条产生式的左边必须恰好是一个变量；AB 或含终结符的左边都不允许。
```

## 7. 选读：规范化预处理

<details>
<summary>选读 · 为什么解析前要改写规则</summary>

直接写给人类的文法常有空规则、单位规则或多分叉。下一课会先把它们整理成“二元组合”和“单字符生成”两种整齐形状，再交给区间动态规划。这样每个内部节点都恰好分成两个孩子，算法就不用一边解析一边猜特殊规则的用法。
</details>

## 8. 下一站

同一句话可能有多种切法。把推导画成树以后，“歧义”不再靠感觉争论，而成了树的计数问题。

→ [解析树与歧义](./80-parse-trees.md)
