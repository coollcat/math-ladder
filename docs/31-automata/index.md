---
title: 第 31 章 · 形式语言与自动机
description: 把模式识别变成状态转移：正则语言、有限自动机与上下文无关入门。
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
---

# 形式语言与自动机

自动机是只看当前状态和输入符号就能决定下一步的机器。它解释了搜索模式、词法解析、协议状态和计算边界。

本章你会学到：

1. [语言、字母表与字符串](./10-alphabet-language.md)——密码锁只认一串按键：7-3-7-3 能开门，3-7-3-7 可能报警；
2. [有限状态机直觉](./20-fsm-intuition.md)——地铁闸机只有两种心情：锁住和放开；
3. [DFA 正式定义](./30-dfa-formal.md)——一台安检门承诺：不管队伍怎么排，每个人走到入口时，门都只有一个明确决定；
4. [NFA 与猜测](./40-nfa-guessing.md)——走进迷宫时，你可以同时想象“走左边的我”和“走右边的我”：只要有一个人拿到奖品，整个策略就算成功；
5. [子集构造](./45-subset-construction.md)——NFA 像一支会分头的侦察队：每读一个符号，队员可能散开到几个房间；
6. [正则语言](./50-regular-languages.md)——如果一台门卫认识访客册 $A$，另一台认识 $B$，能不能造一台只放行“两边都同意”的门卫？；
7. [正则表达式与有限自动机](./55-regex-to-automata.md)——搜索框里的一行 `ab*c` 背后是一张小地图：读 $a$，然后绕圈吃掉若干 $b$，最后读 $c$ 才能出去；
8. [泵引理与非正则语言](./60-pumping-lemma.md)——一台只有五格记忆的机器，却被迫读完一段很长很长的输入；
9. [最小 DFA 直觉](./65-minimal-dfa.md)——两个保安看似站在不同岗位，可无论将来发生什么，他们做出的放行决定永远相同；
10. [下推自动机与栈](./70-pda-stack.md)——编辑器怎么知道 ((())) 配平，而 (())) 多了一个右括号？；
11. [上下文无关文法](./75-context-free-grammar.md)——一句中文可以被切成主语、谓语、宾语；
12. [解析树与歧义](./80-parse-trees.md)——“我看见了拿着望远镜的人”有两种意思：我用望远镜看人，或者看的人拿着望远镜；
13. [CYK 与 DP 解析选讲](./85-cyk-parsing.md)——句子一长，手画所有树会爆炸；
14. [自动机方法地图](./90-method-map.md)——学完一章工具，最大的风险是看见什么都想画状态图，或者明明是括号配对却硬写 DFA。

## 前置回望

集合定义语言，图论描述转移，逻辑刻画拒绝与接受条件；本章让“规则”拥有机器形状。

## 交互形态

已落地：十四门正式课每门都配判题练习、选择题（quiz）与浮窗 Python 实验。

以下专属状态图组件尚未实现，需求集中在 `UNIT_GUIDES/31-automata.md`：

- 状态机编辑器；
- 字符串喂入动画；
- NFA 转 DFA 可视化；
- 接受路径高亮。

:::note[生产状态]

14 门正式课草案已完成：每门都有判题练习、选择题和浮窗实验。专属状态图组件尚未实现，生产侧需求集中在 `UNIT_GUIDES/31-automata.md`。本章当前按“草案完成”进入集成审查，不冒充已实现全部理想教具。

:::

## 课程入口

1. [语言、字母表与字符串](./10-alphabet-language.md)
2. [有限状态机直觉](./20-fsm-intuition.md)
3. [DFA 正式定义](./30-dfa-formal.md)
4. [NFA 与猜测](./40-nfa-guessing.md)
5. [子集构造](./45-subset-construction.md)
6. [正则语言](./50-regular-languages.md)
7. [正则表达式与有限自动机](./55-regex-to-automata.md)
8. [泵引理与非正则语言](./60-pumping-lemma.md)
9. [最小 DFA 直觉](./65-minimal-dfa.md)
10. [下推自动机与栈](./70-pda-stack.md)
11. [上下文无关文法](./75-context-free-grammar.md)
12. [解析树与歧义](./80-parse-trees.md)
13. [CYK 与 DP 解析选讲](./85-cyk-parsing.md)
14. [自动机方法地图](./90-method-map.md)

## 实战挑战 · 教学串口协议的状态机

一块嵌入式板子通过类似 UART 的线路接收定长帧：起始位是 `0`，随后恰好 3 个数据位，再跟 1 个偶校验位，最后必须是停止位 `1`。校验位的选择规则很简单——让 **3 个数据位中 `1` 的总数变成偶数**。

**(a)** 实现 `accept_frame(frame)`，判断输入是否恰好是一整帧。五个候选是 `001011`、`011001`、`001001`、`011000`、`0010111`。

**(b)** 思考：为什么只需要“当前阶段”和“见过几个 1”这类有限格子，就能判定任意长的线路序列？

初始代码能跑，但埋了两个真实协议里常见的错误：奇偶检查反了，而且帧结束后还可能放过多余位。请修好它。

```exercise
# @title: 实战挑战：串口协议帧校验器
# @check: True
# @check: True
# @check: False
# @check: False
# @check: False
# @hint: 先让三个数据位中 1 的数量和校验位合成偶数；再看停止位；最后必须拒绝停止位之后的任何多余输入。

def accept_frame(frame):
    stage = "start"                      # 当前协议阶段就是有限状态
    data_seen = 0                        # 已收到的数据位数
    ones = 0                             # 数据位中见过的 1 的数量

    for bit in frame:
        if stage == "start":
            if bit != "0":
                return False
            stage = "data"
        elif stage == "data":
            if bit == "1":
                ones = ones + 1          # 只累计数据位的 1，不包含校验位
            data_seen = data_seen + 1
            if data_seen == 3:
                stage = "parity"
        elif stage == "parity":
            need = "0" if ones % 2 == 1 else "1"   # ← 偶校验要求对吗？
            if bit != need:
                return False
            stage = "stop"
        elif stage == "stop":
            if bit != "1":
                return False
            stage = "done"               # ← 之后再来一位该怎么处理？

    return stage == "done"

for frame in ["001011", "011001", "001001", "011000", "0010111"]:
    print(accept_frame(frame))
```

<details>
<summary>点开查看逐步解答</summary>

两处修改：

1. 奇偶条件改成 `"0" if ones % 2 == 0 else "1"`。例如 `001011` 的数据位是 `010`，只有一个 1，所以校验位要是 1；`011001` 的数据位是 `110`，已有两个 1，所以校验位要是 0。
2. 在循环开头加一个分支：`if stage == "done": return False`。否则停止位后的噪声位会被静默忽略，接收方可能把残帧当成完整帧。

修正后五行输出依次是 `True`、`True`、`False`、`False`、`False`。

**(b)** 的答案在于历史可以压扁：协议只需要记住五个阶段之一、已收数据位数 0–3、以及数据位中 1 的数量 0–3。线路可以任意长，但这些记忆都有固定上限——这正是第 30 课 DFA 的工程化身。若还要处理线路空闲、字节间隔或重同步，就继续增加显式状态，而不是偷偷记住整个历史。
</details>

课程回链：[DFA 正式定义](./30-dfa-formal.md)（转移表与终态判定）、[正则表达式与有限自动机](./55-regex-to-automata.md)（词法扫描的同一思想）、[自动机方法地图](./90-method-map.md)（什么时候该升级模型）。

## 实战挑战 · 状态翻转：数 1 的奇偶

一台微小的自动机判断二进制串里"1"的个数是奇是偶：状态 0 表示偶数、状态 1 表示奇数，每遇到一个 1 就翻转一次状态。下面这题遇 1 却把状态重置成了 0，修到输出 `1`：

```exercise
# @title: 实战挑战：状态翻转
# @check: 1
# @hint: 遇到 1 要"翻转"状态（0↔1），即 state = 1 - state，不是重置为 0。
state = 0              # 初始：0 个 1，偶数 → 状态 0
s = "1011"             # 二进制串（含 3 个 1）
for ch in s:           # 逐个读入字符
    if ch == "1":
        state = 0      # ← 问题在这：该翻转，不是重置
print(state)
```

<details>
<summary>点开查看逐步解答</summary>

"奇偶"是两状态自动机的经典：遇 1 翻转，遇 0 不动：

```python
if ch == "1":
    state = 1 - state   # 0 变 1、1 变 0
print(state)            # 1
```

改完：串 `1011` 有三个 1，状态 $0 \to 1 \to 0 \to 1$，最终 `1`（奇数）。初始代码遇 1 就重置为 0，等于永远"忘记"之前数过几个。这个"读一个字符、按规则换状态、读完看终态"的三步，正是 DFA 的全部工作方式——状态翻转是它最微小的活标本。

</details>
