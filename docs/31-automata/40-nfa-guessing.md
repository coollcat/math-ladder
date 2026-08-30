---
title: NFA 与猜测
lesson_id: automata/nfa-guessing
prereqs:
  - automata/dfa-formal
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
  - nondeterministic-finite-automaton
  - epsilon-transition
applications:
  - pattern-matching
  - search-pruning
exits:
  - research
---

# NFA 与猜测

## 1. 从一个场景开始

走进迷宫时，你可以同时想象“走左边的我”和“走右边的我”：只要有一个人拿到奖品，整个策略就算成功。非确定有限自动机（NFA）就是把这种“平行猜测”写成严格对象。

## 2. 直觉解释

NFA 读一个符号时，可以有零条、一条或多条可用箭头。机器不掷骰子，而是把所有可能性都追下去。只要至少一条路径读完输入后落在接受状态，输入就被接受。

$\varepsilon$ 转移是不耗字符的跳跃，用来表达“随时可以先做某个准备动作”。

## 3. 正式定义

NFA 也是五元组

$$M=(Q,\Sigma,\Delta,q_0,F)$$

区别在于 $\Delta$ 不是单值函数，而是关系：

$$\Delta \subseteq Q\times(\Sigma\cup\lbrace\varepsilon\rbrace)\times Q$$

若 $(q,a,r)\in\Delta$，就在状态 $q$ 读到 $a$（或空步）后可能到达 $r$。NFA 接受 $w$ 当且仅当存在一条从 $q_0$ 消耗完 $w$ 的路径，终点在 $F$。

| 对比项 | DFA | NFA |
| --- | --- | --- |
| 每个状态读一个符号 | 恰好一条边 | 零条或多条边 |
| 空串转移 | 不允许 | 允许 |
| 接受条件 | 唯一路径终点接受 | 至少一条路径接受 |

## 4. 分步例题

设 $\Sigma=\lbrace a,b\rbrace$，想认“倒数第二个符号是 $a$”的串。

1. 从起点 $S$ 反复猜：当前这个 $a$ 是否就是倒数第二位？
2. 若不猜，读 $a$ 或 $b$ 都留在 $S$；
3. 一旦猜中，沿 $a$ 跳到 $A$；
4. 从 $A$ 再消耗任意一个符号到接受态 $F$；
5. 例如 $bab$：$S\xrightarrow{b}S\xrightarrow{a}A\xrightarrow{b}F$，接受；
6. $abb$ 只有两条路：一直留在 $S$，或在第二个 $b$ 处尝试失败，最终无接受路径，拒绝。

## 5. 动手实验

### 实验 1（python）：手工列出所有当前状态

```python title="NFA 的平行世界"
transitions = {                # 一个键对应一个列表：列表里是所有可能去的下一状态
    ("S", "a"): ["S", "A"],
    ("S", "b"): ["S"],
    ("A", "a"): ["F"],
    ("A", "b"): ["F"],
}

def step(states, ch):          # states 是当前所有平行状态组成的列表
    next_states = []           # 准备收集下一时刻的全部落点
    for state in states:
        # get：某条猜测提前失败时没有后继边；返回空列表让这条路消失
        targets = transitions.get((state, ch), [])
        for target in targets:
            next_states.append(target)       # append：往列表尾部加入元素
    return next_states

current = ["S"]
for ch in "bab":
    current = step(current, ch)
    print(f"读 {ch} 后：{current}")
```

最后一行包含 `F`，说明至少一条猜测成功。这就是 NFA 的接受语义。

### 实验 2（python）：去掉重复后再判定

```python title="合并平行世界"
transitions = {                # 与实验 1 相同：每个键对应所有可能落点
    ("S", "a"): ["S", "A"],
    ("S", "b"): ["S"],
    ("A", "a"): ["F"],
    ("A", "b"): ["F"],
}

def unique(items):             # 自制去重函数，保持逻辑可见
    seen = []                  # seen 记录已经出现过的状态
    result = []
    for item in items:
        if item not in seen:   # not in 检查元素不在列表里
            seen.append(item)
            result.append(item)
    return result

def step_nfa(states, ch):      # 独立命名，表示“NFA 推进一步”
    answer = []
    for state in states:
        # 没有可用箭头的路径直接终止，不会报错
        for target in transitions.get((state, ch), []):
            answer.append(target)
    return answer

states = ["S"]
for ch in "abba":
    states = unique(step_nfa(states, ch))
print(states)
print("F" in states)           # in 判断列表中是否存在某个元素
```

最后一行会输出 `False`：`abba` 的倒数第二位是 `b`，任何"猜中倒数第二个 a"的路径都无法在读完最后一位时恰好停在 `F`。把输入改成 `"abaa"` 再跑——倒数第二位正是 `a`，平行集合里会出现 `F`。

:::warning[常见误区]

你以为 NFA 会随机选边。其实它的语义是“存在性”：有一条接受路径即接受，所有路径失败才拒绝。

你以为多条边让 NFA 更强。其实它能认的语言和 DFA 完全一样，只是描述常常更短。

你以为 $\varepsilon$ 边消耗了空字符。其实它不前进输入位置，只扩展当前可达状态。

:::

## 6. 练习

```exercise
# @title: 练习：找出唯一的接受猜测
# @check: ['S']
# @check: ['S', 'A']
# @check: ['F']
# @hint: 第一行读 b；第二行读 a 时既可留下也可猜中；第三行读最后一个 b 后进入 F。
def guess_step(states, ch):
    answer = []
    for state in states:
        if state == "S" and ch == "b":
            answer.append("S")
        if state == "S" and ch == "a":
            answer.append("S")
        if state == "A" and ch == "a":
            answer.append("F")
        if state == "A" and ch == "b":
            answer.append("F")
    return answer

print(guess_step(["S"], "b"))
print(guess_step(["S"], "a"))
print(guess_step(["A"], "b"))
```

初始代码漏掉了第二条边 `S --a--> A`，导致第二行少了平行猜测。

```quiz
一个输入被 NFA 拒绝的确切含义是什么？
- 最短路径失败了
- 所有消耗完输入的路径都没有停在接受状态 [*]
- 存在一条路径停在普通状态
? NFA 的否定要对全部路径量化：不存在任何接受路径才算拒绝。
```

## 7. 选读：指数条路径，线性状态

<details>
<summary>选读 · 为什么模拟 NFA 要带状态集合</summary>

最坏情况下，$n$ 步可能有接近指数数量的具体路径，但它们只会落在 $n$ 个状态里。因此聪明的模拟器每步维护“当前可达状态集合”，而不是枚举路径。这个思想正是下一课子集构造的种子。
</details>

## 8. 下一站

既然每一步都能算出所有可达状态，就可以把这些集合本身当成新 DFA 的状态。猜谜机器马上被翻译回守纪律的门卫。

→ [子集构造](./45-subset-construction.md)
