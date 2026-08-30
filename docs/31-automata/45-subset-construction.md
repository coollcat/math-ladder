---
title: 子集构造
lesson_id: automata/subset-construction
prereqs:
  - automata/nfa-guessing
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
  - subset-construction
  - reachable-state-set
applications:
  - regex-compiler
exits:
  - engineering
---

# 子集构造

## 1. 从一个场景开始

NFA 像一支会分头的侦察队：每读一个符号，队员可能散开到几个房间。指挥官不必跟踪每个人，只要记录“现在哪些房间有人”。把每个可能的房间名单当成一个新状态，NFA 就变成了 DFA。

## 2. 直觉解释

对 NFA 的状态集合 $S$ 和输入符号 $a$，先看每个 $q\in S$ 读 $a$ 能到哪里，再把所有落点合并成一个集合 $T$。

于是新 DFA 的状态不是原来的单个状态，而是原状态的一个子集。接受子集的标准是：名单里至少有一个 NFA 接受态。

## 3. 正式构造

给定 NFA $M=(Q,\Sigma,\Delta,q_0,F)$，构造 DFA：

$$D=(2^Q,\Sigma,\delta_D,E(\lbrace q_0\rbrace),F_D)$$

其中

$$E(R)=\text{从 }R\text{ 只沿 }\varepsilon\text{ 边可达的状态集合}$$

$$\delta_D(S,a)=E\left(\bigcup_{q\in S}\Delta(q,a)\right),\qquad F_D=\lbrace S:S\cap F\neq\varnothing\rbrace$$

$2^Q$ 是幂集，也就是 $Q$ 的全部子集组成的集合。若允许 $\varepsilon$ 边，还要在每次合并后补上所有空步可达状态。

| NFA 世界 | DFA 翻译 |
| --- | --- |
| 当前可能处于若干状态 | 一个状态名，即这个集合 |
| 多条边产生多个落点 | 合并成下一集合 |
| 至少一条路径接受 | 集合与 $F$ 相交则接受 |

最坏会有 $2^n$ 个子集，所以 NFA 描述可能指数级短于最小 DFA；但这不增加识别能力。

## 4. 分步例题

取“倒数第二个符号是 $a$”的 NFA：起点 $S$ 可留在 $S$ 或经 $a$ 到 $A$；$A$ 经任意符号到 $F$。

1. 初始子集是 $\lbrace S\rbrace$；
2. 读 $a$ 得 $\Delta(S,a)=\lbrace S,A\rbrace$；
3. 从 $\lbrace S,A\rbrace$ 读 $a$：$S$ 给出 $\lbrace S,A\rbrace$，$A$ 给出 $F$，合并成 $\lbrace S,A,F\rbrace$；
4. 从 $\lbrace S,A\rbrace$ 读 $b$：$S$ 给出 $S$，$A$ 给出 $F$，合并成 $\lbrace S,F\rbrace$；
5. 只要新名单含 $F$，就存在一条已猜中“倒数第二个符号是 $a$”的路径；
6. 继续对所有可达子集重复，直到没有新集合出现；
7. 每个可达子集就是一个 DFA 状态。

## 5. 动手实验

### 实验 1（python）：把“房间名单”推进一步

```python title="子集构造的一步转移"
nfa = {                        # 每个 (状态, 符号) 对应可能落点列表
    ("S", "a"): ["S", "A"],
    ("S", "b"): ["S"],
    ("A", "a"): ["F"],
    ("A", "b"): ["F"],
}

def move(states, ch):          # states 用字符串缩写表示当前子集
    result = ""
    for state in states:
        targets = nfa[(state, ch)]
        for target in targets:
            if target not in result:   # 只在名单里没有时追加
                result = result + target
    return result

for current in ["S", "SA"]:
    print(f"{current} 读 a -> {move(current, 'a')}")
    print(f"{current} 读 b -> {move(current, 'b')}")
```

四个输出分别是 `SA`、`S`、`SAF`、`SF`。这里用相邻字母缩写集合，是为了让浮窗输出一眼可读；注意 `SA` 读 `a` 时必须把 `A` 的 `F` 也收进名单。

### 实验 2（python）：判定一个子集是否接受

```python title="名单里有 F 就接受"
def accepts_subset(states):
    return "F" in states       # in 判断字符串中是否含有某个字符

for name in ["S", "SF", "AF"]:
    print(f"{name}: {accepts_subset(name)}")
```

只有含 `F` 的名单返回 `True`，对应公式 $S\cap F\neq\varnothing$。

:::warning[常见误区]

你以为必须造出全部 $2^n$ 个子集。其实通常只造从初始集出发可达的子集。

你以为新 DFA 的接受态是整个 $F$。其实是任何与 $F$ 相交的子集。

你以为有 $\varepsilon$ 边时要给每条边单独加权。其实空步只是扩大当前可达集合，不消耗输入字符。

:::

## 6. 练习

```exercise
# @title: 练习：完成一次子集转移
# @check: SA
# @check: S
# @check: SF
# @hint: 从 S 出发读 a 有 S 和 A 两个落点；从 S 读 b 只有 S；从 SA 读 b 要合并 S 的 S 和 A 的 F。
def move_subset(states, ch):
    result = ""
    if ch == "a" and "S" in states:
        result = result + "A"
    return result

print(move_subset("S", "a"))
print(move_subset("S", "b"))
print(move_subset("SA", "b"))
```

期望输出是 `SA`、`S`、`SF`。初始代码漏掉了自环和来自 `A` 的边。

```quiz
子集构造得到的 DFA 状态是什么？
- NFA 的一条具体路径
- NFA 在某一步可能处于的状态集合 [*]
- NFA 接受串的集合
? 构造的核心是幂集状态：每个 DFA 状态记录一张“当前有人”的房间名单。
```

## 7. 选读：为什么能力不变

<details>
<summary>选读 · 双向模拟</summary>

从 DFA 的运行可以还原出 NFA 的当前可达集合；反过来，NFA 的任一接受路径上的每一步都落在对应子集里。两条模拟互相咬合，说明它们接受同一个语言。因此 NFA 只是表达方式的放松，不是计算能力的升级。
</details>

## 8. 下一站

有了确定性模型，就能给一类语言命名：凡是某台有限自动机能认的语言，都叫正则语言。接下来看它们如何组合。

→ [正则语言](./50-regular-languages.md)
