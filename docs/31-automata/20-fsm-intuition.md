---
title: 有限状态机直觉
lesson_id: automata/fsm-intuition
prereqs:
  - automata/alphabet-language
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - finite-state-machine
  - state-transition
applications:
  - turnstiles
  - protocol-handshakes
exits:
  - engineering
---

# 有限状态机直觉

## 1. 从一个场景开始

地铁闸机只有两种心情：锁住和放开。投币不会让放行的闸机继续变开，刷卡也不会让锁住的门凭空打开；真正决定反应的，是“现在处于哪种状态”。这台小机器就是有限状态机。

## 2. 直觉解释

状态是一格记忆。闸机不需要记住今天进过多少人，只要记住“是否已经收到一次有效投入”。输入符号到来时，机器根据当前状态跳到下一个状态。

可以把状态画成圈，把转移画成箭头。箭头上的标签写明触发符号；双圈表示接受状态。

## 3. 正式直觉版定义

有限状态机由三件核心工具组成：

| 部件 | 意思 |
| --- | --- |
| 状态集 | 机器可能处的几种情况 |
| 输入字母表 | 允许喂入的符号 |
| 转移关系 | 当前状态加输入，决定下一状态 |

本课先不追究每个细节，只抓一条铁律：**机器的下一步只依赖当前状态和当前输入，不依赖完整历史**。

## 4. 分步例题：闸机

设状态为“锁定”和“放行”，输入为“投币”和“通过”。

1. 锁定 + 投币 → 放行；
2. 放行 + 通过 → 锁定；
3. 锁定 + 通过 → 仍是锁定；
4. 放行 + 投币 → 仍是放行，多余投入不叠加。

于是序列“投币、通过”成功通行；“通过、投币”虽然也消耗了同样符号，却因为顺序不同而失败。

## 5. 动手实验

### 实验 1（python）：给闸机装上两格记忆

```python title="闸机状态逐步转移"
state = "locked"              # 初始状态：locked 表示锁住
actions = ["coin", "pass", "coin", "coin", "pass"]

for action in actions:        # for 会依次取出列表中的每个动作
    if action == "coin":      # if 检查条件是否成立
        state = "open"
    elif action == "pass":    # elif 表示否则再检查另一个条件
        if state == "open":
            state = "locked"
    print(f"{action} 之后 -> {state}")
```

默认序列会经历锁定、放行、锁定、放行、锁定。删掉第一个 `"coin"` 后再运行，后面的 `"pass"` 无法开门。这就是“历史压缩成一个状态”的力量。

### 实验 2（python）：只回答最后能不能过

```python title="把过程折叠成最终结论"
state = "locked"
events = ["coin", "pass"]

for event in events:
    if state == "locked" and event == "coin":
        state = "open"
    elif state == "open" and event == "pass":
        state = "locked"

if state == "open":
    print("有人正在通过")
else:
    print("闸机关着")
```

循环结束后，变量 `state` 只保存了整段历史的必要摘要。

:::warning[常见误区]

你以为状态越多越聪明。其实好状态机的目标是保留“将来需要的最少信息”。

你以为同一输入永远有同一动作。其实还要问当前状态；同一个“通过”在锁定和放行时效果完全不同。

你以为状态机会记住完整输入。其实它只保留能把未来判断清楚的那一小块历史。

:::

## 6. 练习

```exercise
# @title: 练习：修好电梯门状态
# @check: open
# @check: closed
# @check: open
# @hint: 关门按钮只在门开着时生效；呼叫按钮会让关闭的门打开。
state = "closed"
buttons = ["call", "close", "call"]

for button in buttons:
    if button == "close":
        state = "closed"
    if button == "call":
        state = "closed"
    print(state)
```

期望输出是 `open`、`closed`、`open`。初始代码错在把“呼叫”一律写成关门。

```quiz
闸机在放行状态又收到一次投币，最合理的直觉模型是什么？
- 状态变成锁定
- 保持放行 [*]
- 机器崩溃
? 已经开门时，额外投币没有新的状态信息；转移可以回到原状态。
```

## 7. 选读：为什么“有限”重要

<details>
<summary>选读 · 状态数有限意味着什么</summary>

状态数有限，说明无论输入多长，机器都不会发明新格子去存历史。它只能不断把旧历史压进固定的几个桶里。这个限制后来会带来真正的数学后果：有些语言无论设计多少个有限状态都无法识别。
</details>

## 8. 下一站

闸机的直觉已经够用，但要证明“某台机器一定认某个语言”，还得把状态、字母表、起始点、箭头和接受圈一个不少地写清楚。

→ [DFA 正式定义](./30-dfa-formal.md)
