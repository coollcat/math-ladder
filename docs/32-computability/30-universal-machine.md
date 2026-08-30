---
title: 通用图灵机
lesson_id: computability/universal-machine
prereqs:
  - computability/decidability-languages
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
  - universal-turing-machine
  - program-encoding
applications:
  - interpreters
  - virtual-machines
exits:
  - engineering
  - research
---

# 通用图灵机

## 1. 从一个场景开始

计算器只会算术，游戏机只跑某个卡带，可现代电脑却能安装不同软件。秘密不在硬件无限聪明，而在硬件愿意解释描述：它读入程序，把程序当作数据来执行。

图灵把这个思想推到极限。既然每台图灵机都能写成有限符号串，就可以造一台机器读入“机器描述加输入”，然后替那台机器运行。

## 2. 直觉解释

把普通图灵机 $M$ 想成一位厨师，输入是食材。通用图灵机 $U$ 则像一位全能助理：

1. 纸带前半段写着厨师 $M$ 的完整菜谱；
2. 中间用分隔符隔开；
3. 后半段放着今天的食材；
4. 助理每次查看菜谱中与“当前状态和当前食材”匹配的那一行；
5. 然后在模拟纸带区擦写、移动，并把 $M$ 的当前状态更新为新状态。

$U$ 本身仍然只有有限状态和有限规则表。它的强大来自编码：别人的无限多张规则表被压成可以放在带上的数据。

## 3. 正式定义

若存在图灵机 $U$，对任意编码 $\langle M,w\rangle$ 满足

$$U(\langle M,w\rangle)=M(w)$$

则称 $U$ 为**通用图灵机**。这里 $\langle M,w\rangle$ 表示把机器描述 $M$ 和输入 $w$ 编码成一个串。

| 组成部分 | 在 $U$ 的纸带上扮演什么 |
| --- | --- |
| $\langle M\rangle$ | 被解释的程序 |
| 分隔符 | 区分程序与数据 |
| $w$ | 被处理的数据 |
| 工作区 | 模拟 $M$ 的带内容、状态和读写头 |

只要编码足够规整，$U$ 就能逐条查找 $\langle M\rangle$ 的转移规则。查找和搬运会带来多项式甚至更高开销，但不改变“能否算出结果”。

## 4. 分步例题

假设有两台极小机器的规则都写成替换表：

1. 机器 `flip` 遇到 `0` 改成 `1`；遇到 `1` 改成 `0`。
2. 机器 `echo` 不改符号，只保留原字符。

通用解释器收到 `(flip, "010")` 时：

1. 读入名字 `flip`；
2. 从规则库找到对应表；
3. 对输入第 0 位执行 `0 -> 1`；
4. 输出 `101`。

换成 `(echo, "010")` 时，同一个解释器查另一张表，不改字符，只返回原串。解释器没有变成两台机器；它只是按描述切换行为。

## 5. 动手实验

### 实验 1：看“描述也是数据”

```viz
{
  "type": "proof-trail",
  "title": "通用机的三层身份",
  "steps": [
    { "id": "外层", "text": "U 按自己的固定规则运行" },
    { "id": "中层", "text": "带上的 M 描述被当作数据读取" },
    { "id": "内层", "text": "工作区模拟 M 的每一步" },
    { "id": "输出", "text": "M(w) 的结果成为 U 的结果" }
  ],
  "edges": [["外层", "中层"], ["中层", "内层"], ["内层", "输出"]]
}
```

分层不是三个物理机器，而是同一台机器上的三种视角。这个嵌套正是后来停机问题能“谈论自己”的原因。

### 实验 2：手写迷你解释器

```python title="一个只认识两种规则的通用机"
library = {
    "flip": {"0": "1", "1": "0"},
    "echo": {"0": "0", "1": "1"}
}                             # 外层字典保存多个程序，内层字典保存替换表

def run(program_name, text):  # program_name 是要解释的程序名
    if program_name not in library:   # 先检查是否能找到描述
        return "no such program"
    table = library[program_name]     # 取出这张替换表
    result = ""
    for symbol in text:               # 按顺序读输入串中的每个字符
        if symbol not in table:       # 先检查当前符号是否在替换表中
            return "crash"            # 初始版本用 crash 表示解释失败
        result = result + table[symbol]
    return result

print(run("flip", "010"))
print(run("echo", "010"))
```

第一行输出 `101`，第二行输出 `010`。把 `run` 里的 `table` 固定写成 `library["flip"]`，解释器就失去通用性；这个小改动能帮你看见“读描述”到底发生在哪一行。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为通用机必须为每个任务内置一条专用规则。它只需要一条元规则：按描述查表并执行。

**误区二**：你以为编码方式影响可计算性结论。只要编码可机械解码，具体格式不改变是否存在通用机。

**误区三**：你以为模拟一定一样快。通用化通常带来额外开销；通用性保证能力边界，而不是性能等价。

:::

## 7. 练习

```exercise
# @title: 练习：让解释器识别未知符号
# @check: unknown-symbol
# @check: 010
# @hint: 内层替换表可能没有当前符号；应返回统一错误标记，不要直接下标取值。
library = {
    "echo": {"0": "0", "1": "1"}
}

def run(program_name, text):
    if program_name not in library:
        return "no such program"
    table = library[program_name]
    result = ""
    for symbol in text:
        if symbol not in table:
            return "crash"             # 初始版本把未知符号笼统记为崩溃
        result = result + table[symbol]
    return result

print(run("echo", "2"))
print(run("echo", "010"))
```

初始代码不会抛出异常，但第一个调用只输出笼统的 `crash`。判题环境需要看到更精确的 `unknown-symbol`，表示“程序存在、输入符号不在替换表里”。请把失败标记改成这个专用名称。

<details>
<summary>点开查看逐步解答</summary>

在循环中加入：

```text
if symbol not in table:
    return "unknown-symbol"
```

把原来返回 `crash` 的那一行改成返回 `unknown-symbol`。这样 `run("echo", "2")` 返回精确错误标记，而合法串 `010` 仍逐位通过 `echo` 表，输出 `010`。通用解释器不仅要能执行已知描述，还要对无法解码或越界的描述给出明确失败，否则后续讨论“输入不合法”时会混淆层次。

</details>

## 8. 快问快答

```quiz
通用图灵机最关键的思想是什么？
- 把一台机器的描述和数据一起放在输入上 [*]
- 给每种语言单独造一台无限大机器
- 让所有程序都一步完成
 ? 通用性来自“程序即数据”：同一套固定规则可以解释不同的有限描述。
```

## 9. 选读：自我引用为什么不再神秘

<details>
<summary>选读 · 编码打开了递归之门</summary>

一旦 $\langle M\rangle$ 可以作为输入，就没有理由禁止把它交还给 $M$ 自己。于是会出现诸如“读入自己的描述并统计符号数”的程序，也会出现更危险的“问自己是否会停”的结构。这种自我引用并不违反逻辑；真正不可行的，是在下一课中要求某台总停机机器对所有程序准确预测停机。通用性提供了舞台，对角化才可能登场。

</details>

## 10. 下一站

现在我们有了能运行一切程序的机器。下一课追问更锋利的问题：能否提前知道任一程序在任一输入上会不会停下？

→ [停机问题](./35-halting-problem.md)
