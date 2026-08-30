---
title: 最小 DFA 直觉
lesson_id: automata/minimal-dfa
prereqs:
  - automata/pumping-lemma
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
  - equivalent-states
  - dfa-minimization
applications:
  - lexical-scanner-generation
exits:
  - engineering
---

# 最小 DFA 直觉

## 1. 从一个场景开始

两个保安看似站在不同岗位，可无论将来发生什么，他们做出的放行决定永远相同。那就该合并岗位。DFA 最小化问的正是：哪些状态在所有未来面前都无法区分？

## 2. 直觉解释

一个状态的价值不在名字，而在它还能怎样影响判定。若从状态 $p$ 和 $q$ 出发，读完任何剩余串后接受性都一样，它们就是等价状态。

最小 DFA 把每个等价类压成一个状态。多余状态不是“没用”，只是“和另一个作用重复”。

## 3. 正式定义

对 DFA 的两个状态 $p,q$，称 $p\equiv q$，当对所有字符串 $z$：

$$\delta^*(p,z)\in F \iff \delta^*(q,z)\in F$$

最小化的基本关系有三条：

1. 一个接受态和一个非接受态一定不等价；
2. 若读某个符号后到达已知不等价的两个状态，则原状态也不等价；
3. 反复传播这些差异，直到找不到新的区分证据。

Myhill-Nerode 定理进一步说：不可区分关系对应的等价类数量就是最小 DFA 的状态数。

| 情况 | 结论 |
| --- | --- |
| 存在 $z$ 只能区分 $p,q$ | $p,q$ 必须分开 |
| 所有 $z$ 都不能区分 | 可合并 |
| 状态从起点不可达 | 先删除，不参与语言 |

## 4. 分步例题

考虑认偶数个 $a$ 的 DFA，有状态 $E,O$，只有 $E$ 接受。

1. 取区分串 $z=\varepsilon$；
2. 从 $E$ 读空串停在接受态；
3. 从 $O$ 读空串停在非接受态；
4. 所以 $E\not\equiv O$；
5. 每个状态自成一类；
6. 这台机器已经是最小 DFA，不能再合并。

再看一台多余机器：有两个复制版偶态 $E_1,E_2$ 和两个奇态 $O_1,O_2$。

1. $E_1,E_2$ 对任何后续串结果相同；
2. $O_1,O_2$ 也相同；
3. 合并成两类 $\lbrace E_1,E_2\rbrace,\lbrace O_1,O_2\rbrace$；
4. 得到两态最小机。

把这台带冗余的机器装进运行器跑一跑——你会看到复制态占着四个户口却从未给出不同判定：

```viz
{
  "type": "dfa-runner",
  "title": "带复制态的机器：冗余肉眼可见",
  "states": ["E1", "E2", "O1", "O2"],
  "alphabet": ["a", "b"],
  "transitions": [["E1", "a", "O1"], ["E1", "b", "E1"], ["E2", "a", "O2"], ["E2", "b", "E2"], ["O1", "a", "E1"], ["O1", "b", "O1"], ["O2", "a", "E2"], ["O2", "b", "O2"]],
  "start": "E1",
  "accepting": ["E1", "E2"],
  "input": "aba"
}
```

怎么玩：多换几个串（空串、`a`、`abab`）——从起点 $E_1$ 出发怎么走都只经过 $E_1$、$O_1$ 两个户口，$E_2$、$O_2$ 是原样复制的空岗，判定永远相同。下面实验 2 的手工合并，收割的正是这种「怎么看都一样」的状态对。

## 5. 动手实验

### 实验 1（python）：用短串找区分证据

```python title="检查两个状态是否可区分"
delta = {                      # 一台故意带重复状态的机器
    ("E1", "a"): "O1", ("E1", "b"): "E1",
    ("O1", "a"): "E1", ("O1", "b"): "O1",
    ("E2", "a"): "O2", ("E2", "b"): "E2",
    ("O2", "a"): "E2", ("O2", "b"): "O2",
}
accepting = ["E1", "E2"]

def run_from(state, rest):     # 从指定状态继续运行
    now = state
    for ch in rest:
        now = delta[(now, ch)]
    return now in accepting    # 返回布尔值：是否落在接受集合

for z in ["", "a", "aa"]:
    print(f"z={z}: E1->{run_from('E1', z)}, O1->{run_from('O1', z)}")
```

$z=\varepsilon$ 已经让 `E1` 与 `O1` 不同；而 `E1` 和 `E2` 在三个测试串上始终同真假。

### 实验 2（python）：手工合并等价状态

```python title="把重复岗位压缩"
delta = {                      # 复制上一块的小型转移表，让本块可单独运行
    ("E1", "a"): "O1", ("E1", "b"): "E1",
    ("O1", "a"): "E1", ("O1", "b"): "O1",
    ("E2", "a"): "O2", ("E2", "b"): "E2",
    ("O2", "a"): "E2", ("O2", "b"): "O2",
}

accepting = ["E1", "E2"]       # 旧机器的两个接受状态

def run_from(state, rest):     # 从指定状态继续运行
    now = state
    for ch in rest:
        now = delta[(now, ch)]
    return now in accepting

def run_minimized(text):
    state = "E"
    for ch in text:
        if ch == "a":
            state = "O" if state == "E" else "E"
    return state == "E"

for word in ["a", "aa", "aba"]:
    old = run_from("E1", word)         # 旧机器从 E1 开始
    new = run_minimized(word)
    print(f"{word}: old={old}, minimized={new}")
```

需要先运行上一个代码块，让 `run_from` 存在于随手算命名空间。两列输出一致，才说明合并没有改变语言。

:::warning[常见误区]

你以为状态名不同就要保留。其实最小化只看未来行为，不看标签。

你以为只比较一步转移。其实要比较所有可能后续串；一步相同也可能被更长的串区分。

你以为不可达状态也要合并。正确流程通常先删不可达部分，再压缩可达等价类。

:::

## 6. 练习

```exercise
# @title: 练习：找到区分串并判断等价
# @check: True
# @check: False
# @check: True
# @hint: state_b 应表示“奇数个 a”——把 % 2 == 0 改成判断余数为 1；空串（零个 a）就能区分偶态与奇态。
def state_a(rest):
    return len([ch for ch in rest if ch == "a"]) % 2 == 0   # 列表推导式：按条件收集字符

def state_b(rest):
    return len([ch for ch in rest if ch == "a"]) % 2 == 0

print(state_a(""))
print(state_b(""))
print(state_a("aa") == state_a("aaaa"))
```

期望输出依次是 `True`、`False`、`True`。初始代码把 B 也写成了偶数个 a；把它改回“奇数个 a”，`A` 与 `B` 才会被空串区分。

```quiz
两个 DFA 状态可以合并的核心条件是什么？
- 它们的名字相近
- 对所有剩余输入串，接受结论完全相同 [*]
- 它们都有指向自己的自环
? 合并依据是不可区分性：不存在任何后缀让两个状态一真一假。
```

## 7. 选读：表格填满算法

<details>
<summary>选读 · 从已知不同到传递差异</summary>

先建一张所有状态对的表，标记“接受性不同”的对。然后扫描每对 $(p,q)$：若某个符号使 $(\delta(p,a),\delta(q,a))$ 已被标记，就标记 $(p,q)$。反复扫到没有新标记为止。剩下未标记者互相等价，可安全合并。这个朴素算法清晰，效率更高的算法会反向传播区分集合。
</details>

## 8. 下一站

有限记忆的最小形态已经清楚。现在给它加一根可以无限长但有纪律的栈，看看括号配对如何成为可计算语言。

→ [下推自动机与栈](./70-pda-stack.md)
