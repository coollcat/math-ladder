---
title: 图灵机
lesson_id: computability/turing-machine
prereqs:
  - computability/computational-models
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
  - turing-machine
  - configuration
applications:
  - computation-foundations
  - automata-theory
exits:
  - research
---

# 图灵机

## 1. 从一个场景开始

假如你只剩一条无限长的纸带、一个能看清当前格子的眼睛、一支能擦写的笔和一张有限规则表，还能完成加法、搜索甚至解释程序吗？图灵的回答是：只要问题可被机械计算，这套简陋装备原则上就够了。

这不是说它高效，而是说它的规则简单到没有魔法。正因如此，它成了讨论“什么是算法”的公共底座。

## 2. 直觉解释

把图灵机想成一个极度守规矩的抄表员：

1. 纸带被分成一格一格，某些格子写着符号，空白处也有一个固定符号；
2. 抄表员每次只盯一个格子；
3. 他的内心只有有限种状态，例如“正在找 A”“刚看见 A”“准备停机”；
4. 规则表告诉他：当前状态加当前符号，决定写什么、往左还是往右、下一刻进入哪个状态。

没有任何一步靠灵感。可是只要规则设计得好，许多局部动作连起来就能完成全局任务。就像蚂蚁不懂地图，却能用局部痕迹走出路径。

## 3. 正式定义

一台确定性单带图灵机是一个七元组

$$M=(Q,\Sigma,\Gamma,\delta,q_0,q_{acc},q_{rej})$$

| 符号 | 名字 | 直觉含义 |
| --- | --- | --- |
| $Q$ | 状态集 | 有限的内心状态 |
| $\Sigma$ | 输入字母表 | 输入串允许出现的符号 |
| $\Gamma$ | 带字母表 | 纸带上可写的符号，含空白符且 $\Sigma\subseteq\Gamma$ |
| $\delta$ | 转移函数 | 规则 $(q,a)\mapsto(q',a',D)$ |
| $q_0$ | 起始状态 | 开机时的内心状态 |
| $q_{acc}$ | 接受状态 | 判定为是的停机状态 |
| $q_{rej}$ | 拒绝状态 | 判定为否的停机状态 |

$D$ 只取 $L$ 或 $R$，表示读写头左移或右移。一个完整局面叫**格局**，包括当前状态、整条带内容和读写头位置。机器的一次计算就是格局序列。

## 4. 分步例题

设计一台检查输入是否恰好是 `01` 的图灵机，空白符记作 `_`。

1. 从状态 `start` 看第 0 格。
2. 若看见 `0`，写下 `X`，右移，进入状态 `want1`；意思是“欠一个 1”。
3. 在 `want1` 若看见 `1`，写下 `Y`，右移，进入状态 `checkEnd`。
4. 在 `checkEnd` 若看见 `_`，进入接受状态。
5. 其他情形都进入拒绝状态。

对输入 `01`，轨迹是 `start/0` 到 `want1/1`，再到 `checkEnd/_`，最后接受。对输入 `001`，第一步写 X 后仍看到 0；若规则没有给 `want1/0` 一条继续路线，机器就拒绝。局部规则表完成了整体判断。

## 5. 动手实验

### 实验 1：用证明链看关键局面

```viz
{
  "type": "proof-trail",
  "title": "识别 01 的三个关键局面",
  "steps": [
    { "id": "开局", "text": "start 看到 0" },
    { "id": "欠1", "text": "写 X，右移，等待 1" },
    { "id": "收尾", "text": "写 Y，右移，检查末端" },
    { "id": "接受", "text": "看到空白，接受" }
  ],
  "edges": [["开局", "欠1"], ["欠1", "收尾"], ["收尾", "接受"]]
}
```

这条链强调图灵机的记忆不只来自纸带，也来自有限状态。`want1` 这个名字本身就是一句备忘：“我已经消费了 0，现在必须见到 1。”

### 实验 2：用 Python 模拟规则表

```python title="小型图灵机模拟器"
tape = ["_", "0", "1", "_"]   # 列表模拟纸带，_ 表示空白符
head = 1                      # 读写头下标，表示当前盯着哪一格
state = "start"               # 当前状态
rules = {
    ("start", "0"): ("want1", "X", "R"),
    ("want1", "1"): ("check_end", "Y", "R"),
    ("check_end", "_"): ("accept", "_", "S")
}                             # 字典用键值对保存转移规则

steps = 0
while state != "accept" and state != "reject":
    symbol = tape[head]       # 读取当前格子的符号
    key = (state, symbol)     # 元组作为字典键：状态加眼前符号
    if key not in rules:      # in 先判断键是否存在，避免 KeyError
        state = "reject"
        break                 # break 立刻跳出当前循环
    new_state, new_symbol, direction = rules[key]
    # 解包赋值：一次取出规则中的新状态、新符号和方向
    tape[head] = new_symbol   # 擦写当前格
    if direction == "R":
        head += 1             # 右移一格
    elif direction == "L":    # elif 表示上面的 if 不成立时再检查这里
        head -= 1             # 左移一格
    state = new_state
    steps += 1
    print("".join(tape), head, state)  # join 把字符列表拼成字符串
    if steps >= 10:           # 教学保护：防止错误规则跑太远
        break

print(state, steps)
```

你会看到三次转移后进入 `accept`。试着把第二条规则的键改成 `("want1", "0")`，机器会在下一步找不到规则而拒绝；这就是“规则表决定命运”。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为无限纸带意味着无限内存已经可用。纸带只是潜在可延长；一次计算在停机前只访问了有限多格。

**误区二**：你以为状态必须记住整个历史。状态集有限，长记忆只能写在纸带上。

**误区三**：你以为图灵机擅长一切计算任务。它证明的是可计算性的底线，不代表交互、实时或高效工程实现的理想模型。

:::

## 7. 练习

```exercise
# @title: 练习：补上拒绝多余输入的转移
# @check: reject 2
# @hint: want1 看见 0 说明开头不是单个 0；应直接进入拒绝态，不要继续移动。
tape = ["_", "0", "0", "1", "_"]
head = 1
state = "start"
rules = {
    ("start", "0"): ("want1", "X", "R"),
    ("want1", "0"): ("check_end", "X", "R"),
    ("want1", "1"): ("check_end", "Y", "R"),
    ("check_end", "0"): ("check_end", "0", "R"),
    ("check_end", "1"): ("check_end", "1", "R"),
    ("check_end", "_"): ("accept", "_", "S")
}

steps = 0
while state != "accept" and state != "reject" and steps < 10:
    key = (state, tape[head])
    if key not in rules:
        break
    state, new_symbol, direction = rules[key]
    tape[head] = new_symbol
    if direction == "R":
        head += 1
    steps += 1

if key not in rules:
    state = "reject"

print(state, steps)
```

初始代码把第二个 0 错误地送进 `check_end`，然后一路扫到空白并错误接受。修复后：第一次转移读第一个 0 并右移；第二次转移在 `want1` 读到第二个 0 后直接进入 `reject`，输出 `reject 2`。

<details>
<summary>点开查看逐步解答</summary>

把 `("want1", "0")` 的目标改为 `reject`，写入符可用 `X` 或保持原符。轨迹如下：`start` 读第一个 0，写 X 右移；`want1` 读第二个 0，进入拒绝态。循环条件发现已停机，于是共执行两次转移。这个练习提醒我们：接受条件和拒绝条件都必须覆盖所有局部情况，漏掉一种输入形态就会让机器行为含糊。

</details>

## 8. 快问快答

```quiz
图灵机的“有限控制”主要限制什么？
- 纸带长度必须是有限数
- 内部状态数量必须有限 [*]
- 每条输入的长度必须有限
? 无限纸带是潜在空间；有限控制指 Q 是有限集合，长信息要外化到带子上。
```

## 9. 选读：为什么这个模型如此有说服力

<details>
<summary>选读 · 局部规则与机械可执行</summary>

图灵模型的每个动作只需要三种信息：当前状态、当前符号和一条规则。它不需要预先知道输入全长，也不需要在一步内做任意大的搜索。任何愿意按表格执行的代理人都能复现同样的计算。Church-Turing 论题进一步主张：直觉上的有效可计算函数都可以由图灵机计算。这不是数学定理，而是对“机械计算”概念的经验性刻画；但几十年来未见反例，使它成为理论计算机科学的公共假设。

</details>

## 10. 下一站

图灵机可能接受、拒绝，也可能一直跑下去。下一课把这三种命运分开，并解释为什么“语言的可判定”要求机器在每条输入上都给出裁决。

→ [可判定性与语言](./20-decidability-languages.md)
