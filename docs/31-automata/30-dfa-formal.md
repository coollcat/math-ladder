---
title: DFA 正式定义
lesson_id: automata/dfa-formal
prereqs:
  - automata/fsm-intuition
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
  - deterministic-finite-automaton
  - extended-transition-function
applications:
  - lexical-scanning
  - input-validation
exits:
  - engineering
---

# DFA 正式定义

## 1. 从一个场景开始

一台安检门承诺：不管队伍怎么排，每个人走到入口时，门都只有一个明确决定。没有犹豫，没有抽签。要把这个承诺变成数学对象，我们需要五个部件和一个函数。

## 2. 直觉解释

确定性有限自动机（DFA）就是“每一步唯一下一跳”的状态机。圆圈是状态，箭头是读到一个符号后的去向，起点有一个箭头尾巴，双圈是接受状态。

读完整串后停在哪个圈，决定接受还是拒绝。中间停在哪里不是答案，终点才是。

## 3. 正式定义

DFA 是五元组

$$M=(Q,\Sigma,\delta,q_0,F)$$

| 符号 | 名字 | 要求 |
| --- | --- | --- |
| $Q$ | 有限状态集 | 元素叫状态 |
| $\Sigma$ | 输入字母表 | 有限非空 |
| $\delta$ | 转移函数 | $\delta:Q\times\Sigma\to Q$ |
| $q_0$ | 初始状态 | $q_0\in Q$ |
| $F$ | 接受状态集 | $F\subseteq Q$ |

扩展转移函数 $\delta^*(q,w)$ 表示从 $q$ 开始读完整个串 $w$ 后的位置：

$$\delta^*(q,\varepsilon)=q,\qquad \delta^*(q,wa)=\delta(\delta^*(q,w),a)$$

DFA 接受 $w$ 当且仅当 $\delta^*(q_0,w)\in F$。它认识的所有串组成语言 $L(M)$。

## 4. 分步例题：偶数个 a

令 $Q=\lbrace E,O\rbrace$，$\Sigma=\lbrace a,b\rbrace$，$q_0=E$，$F=\lbrace E\rbrace$。

1. 读到 $a$ 就在 $E,O$ 之间翻转：$\delta(E,a)=O$，$\delta(O,a)=E$；
2. 读到 $b$ 原地不动：$\delta(E,b)=E$，$\delta(O,b)=O$；
3. 检查 $aba$：$E\xrightarrow{a}O\xrightarrow{b}O\xrightarrow{a}E$；
4. 终点是 $E\in F$，所以 $aba$ 被接受；
5. 检查 $aa$：$E\to O\to E$，也被接受；
6. 检查 $a$：终点是 $O\notin F$，拒绝。

这台机器不用等浮窗就能跑——点「步进」，看读取头沿输入带前进：

```viz
{
  "type": "dfa-runner",
  "title": "偶数个 a：DFA 运行器",
  "states": ["E", "O"],
  "alphabet": ["a", "b"],
  "transitions": [["E", "a", "O"], ["O", "a", "E"], ["E", "b", "E"], ["O", "b", "O"]],
  "start": "E",
  "accepting": ["E"],
  "input": "aba"
}
```

怎么玩：双圈是接受态（$E$），单圈是普通态；橙色加亮的圆是读取头所在的状态，加亮的箭头是刚走完的那条转移。在输入框里换一个串再「一键跑完」——试试 $a$ 与 $aa$，正好对应例题第 6 步与第 5 步的判定。拖动圆圈可以重排布局。

## 5. 动手实验

### 实验 1（python）：用字典当转移表

```python title="DFA 逐步运行器"
delta = {                      # 字典用键找值；这里键是二元组，值是下一状态
    ("E", "a"): "O",
    ("E", "b"): "E",
    ("O", "a"): "E",
    ("O", "b"): "O",
}

def run_dfa(text):             # def 定义一个函数，之后可以用名字反复调用
    state = "E"                # q0 是偶数个 a
    for ch in text:            # 字符串被 for 逐字符遍历
        state = delta[(state, ch)]
    return state               # return 把终态交还给调用处

for word in ["", "a", "aa", "aba"]:
    end = run_dfa(word)        # 调用函数并保存返回值
    print(f"{word} -> {end}")
```

空串停在 `E`，因此有零个 `a`，当然符合“偶数个”。把任意一行字典值改坏，比如把 `("O","a")` 指回 `O`，观察哪些判定出错。

### 实验 2（python）：补上接受判定

```python title="终态决定语言"
def accept_even_a(text):
    state = "E"
    for ch in text:
        if ch == "a":
            state = "O" if state == "E" else "E"   # 条件表达式：条件成立取前值，否则取后值
    return state == "E"       # == 先比较真假，return 返回布尔值

for word in ["b", "ab", "aab"]:
    print(f"{word}: {accept_even_a(word)}")
```

输出分别是 `True`、`False`、`True`。这三行就是语言 $L(M)$ 的抽样检查。

:::warning[常见误区]

你以为每个状态都必须有接受或不接受的标签。其实接受是集合属性：单圈状态也可能属于 $F$，图中常用双圈提示。

你以为缺箭头就是拒绝。其实标准 DFA 的 $\delta$ 必须处处有定义；想拒绝就让它进入一个所有符号都自环的死状态。

你以为中途经过接受态就算成功。其实必须读完全部字符，再看终态。

:::

## 6. 练习

```exercise
# @title: 练习：让 DFA 拒绝奇数个 b
# @check: False
# @check: True
# @check: True
# @hint: 用状态 E 表示"目前见过偶数个 b"（初始就在 E）；读到 b 就在 E 和 B 之间切换，读到 a 原地不动。接受条件是终点为 E。
def even_b(text):
    state = "B"
    for ch in text:
        if ch == "b":
            state = "B"
    return state == "E"

print(even_b("aba"))
print(even_b("abb"))
print(even_b(""))
```

初始代码始终停在 `B`，三行全被拒绝。修正两处：初始状态应为 `E`（零个 b 也是偶数），且读到 `b` 时要在 `E`、`B` 间切换，例如 `state = "B" if state == "E" else "E"`。修好后 `aba`（一个 b）拒绝，`abb`（两个 b）与空串接受。

```quiz
哪一条是 DFA 区别于一般状态直觉的关键？
- 有多个起始状态
- 每个状态读每个符号都有唯一下一状态 [*]
- 可以在读到一半时提前宣布接受
? DFA 的确定性来自“当前状态加当前输入”有且只有一个下一状态；判定发生在读完输入后。
```

## 7. 选读：死状态的必要性

<details>
<summary>选读 · 为什么不能留空白箭头</summary>

若输入 $ab$ 在状态 $q$ 读不到 $b$ 的箭头，机器就没有数学意义上的下一位置，五元组也不再定义一个完整 DFA。工程代码常把缺失键当作报错，但理论模型要求预先安排死状态：它读任何符号都留在原地，且不属于 $F$。
</details>

## 8. 下一站

DFA 很守纪律，但有时我们希望说“存在一条路就行”，而不是指定唯一路径。下一次让机器学会合法地猜。

→ [NFA 与猜测](./40-nfa-guessing.md)
