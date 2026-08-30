---
title: 下推自动机与栈
lesson_id: automata/pda-stack
prereqs:
  - automata/minimal-dfa
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
  - pushdown-automaton
  - stack-memory
applications:
  - bracket-checking
  - syntax-analysis
exits:
  - engineering
---

# 下推自动机与栈

## 1. 从一个场景开始

编辑器怎么知道 `((()))` 配平，而 `(()))` 多了一个右括号？DFA 数不了任意深度，因为它只有有限格。给机器加一根盘子叠：左括号放一只盘子，右括号取走一只，最后盘架必须空。

## 2. 直觉解释

栈是只能在一端操作的存储器：

- push：把新符号放在顶上；
- pop：取走最上面的符号；
- peek/top：看顶端但不取走。

下推自动机（PDA）= 有限控制 + 栈。它仍然逐字符读输入，但每步可以根据当前状态、输入符号和栈顶改状态，并替换栈顶的一段符号。

## 3. 正式直觉定义

非确定 PDA 通常写成七元组：

$$M=(Q,\Sigma,\Gamma,\Delta,q_0,Z_0,F)$$

| 符号 | 含义 |
| --- | --- |
| $Q$ | 有限状态集 |
| $\Sigma$ | 输入字母表 |
| $\Gamma$ | 栈字母表 |
| $\Delta$ | 转移关系 |
| $q_0$ | 初始状态 |
| $Z_0$ | 栈底符号 |
| $F$ | 接受状态集 |

一条转移形如

$$(p,a,X)\to(q,\gamma)$$

表示读到输入符号 $a$（可为 $\varepsilon$）、栈顶为 $X$ 时，转到 $q$ 并用 $\gamma$ 替换 $X$。常见接受约定有两种：终态接受要求读完输入并进入 $F$，栈不必为空；空栈接受要求读完输入并弹空栈，可以不用 $F$。教材会明确选哪一种。

PDA 能认的语言类正好是上下文无关语言，严格强于正则语言。

## 4. 分步例题：识别 $a^n b^n$

约定栈底为 `$`，遇到 `a` 放 `A`。

1. 输入 `aabb`，初始栈 `$`；
2. 读第一个 `a`：push `A`，栈 `A$`；
3. 读第二个 `a`：再 push `A`，栈 `AA$`；
4. 读第一个 `b`：pop 一个 `A`，栈 `A$`；
5. 读第二个 `b`：再 pop，栈回到 `$`；
6. 输入耗尽且栈中只剩底符，接受；
7. 对 `aabbb`，最后多出的 `b` 找不到 `A` 可弹，失败。

## 5. 动手实验

### 实验 1（python）：括号检查器

```python title="用列表模拟栈"
stack = []                     # 空列表模拟空栈；末尾当作栈顶
text = "((()))()"
ok = True

for ch in text:
    if ch == "(":
        stack.append(ch)       # append：入栈，把元素放到列表末尾
    elif ch == ")":
        if len(stack) > 0:
            stack.pop()        # pop()：出栈，移除并返回末尾元素
        else:
            ok = False         # 想弹出却已空，说明右括号过多

if ok and len(stack) == 0:
    print("accept")
else:
    print("reject")
```

改成 `"()("` 再跑：过程没有提前报错，但结束后栈不空，所以拒绝。这解释了为什么必须检查“读完且栈空”。

### 实验 2（python）：打印栈顶变化

```python title="看见下推与弹出"
stack = ["$"]                  # $ 是不会弹掉的栈底符号；列表末尾当作栈顶
steps = ["a", "a", "b", "b"]

for symbol in steps:
    if symbol == "a":
        stack.append("A")
    elif symbol == "b" and stack[len(stack) - 1] == "A":
        stack.pop()
    print(f"read {symbol}, top={stack[len(stack) - 1]}, stack={''.join(reversed(stack))}")  # reversed()：倒序列表再粘接，让列表末尾的栈顶显示在字符串左端
```

输出依次显示 `A$`、`AA$`、`A$`、`$` 的栈形变化：两个 `a` 先后把 `A` 压上顶，两个 `b` 再把它们逐个弹掉——和第 4 节手推的每一步完全一致。注意 `reversed(stack)` 先把列表倒过来，`''.join` 才把它粘成字符串：因为列表末尾才是栈顶，倒序后栈顶恰好排在字符串左端。

:::warning[常见误区]

你以为栈是随机存取数组。其实标准 PDA 只看栈顶，不能跳到中间读取。

你以为栈空等于接受。很多定义还要求输入耗尽或进入特定状态；必须统一约定。

你以为 PDA 只是多了存储所以更强一点。它确实超越正则语言，但仍不能识别所有需要两个独立计数比较的结构，如 $a^n b^n c^n$。

:::

## 6. 练习

```exercise
# @title: 练习：修好多类型括号检查
# @check: True
# @check: True
# @check: False
# @hint: 左括号记录对应右括号；遇到右括号时，栈顶必须是同一类。
def check_brackets(text):
    stack = []
    for ch in text:
        if ch == "(":
            stack.append("(")
        elif ch == "[":
            stack.append("[")
        elif ch == ")" and len(stack) > 0:
            stack.pop()
        elif ch == "]" and len(stack) > 0:
            stack.pop()
    return len(stack) == 0

print(check_brackets("([])"))
print(check_brackets("[()]"))
print(check_brackets("([)]"))
```

初始代码只检查栈非空，没有检查类型匹配，因此第三行错误地返回真。

```quiz
PDA 比 DFA 多了哪种关键能力？
- 可以同时读多个输入字符
- 可以使用后进先出的无界栈 [*]
- 可以修改已经读过的输入
? 栈提供无界深度记忆，使若干 a 后接相同数量 b 这类上下文无关结构可识别。
```

## 7. 选读：确定性 PDA 的边界

<details>
<summary>选读 · DPDA 与 CFL</summary>

确定性 PDA（DPDA）每一步至多一个可用动作，适合高效语法分析，但它认得的确定性上下文无关语言是真子类。例如偶数回文这类天然需要猜测对称中心的语言，常需要非确定 PDA。这个区别直接影响解析器设计。
</details>

## 8. 下一站

栈给了机器执行模型；上下文无关文法则给出生成规则。两者是同一片语言的两种写法。

→ [上下文无关文法](./75-context-free-grammar.md)
