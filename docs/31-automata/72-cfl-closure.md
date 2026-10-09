---
title: CFL 的封闭性
lesson_id: automata/cfl-closure
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
  - cfl-closure-properties
  - cfl-non-closure
applications:
  - compiler-design
  - language-theory
exits:
  - research
---

# CFL 的封闭性

## 1. 从一个场景开始

你正在设计一个编译器的语法检查器。已知"匹配的括号"是 CFL，"a 的个数等于 b 的个数"也是 CFL。如果程序要求同时满足两个条件（交集），语法检查器还能用 PDA 实现吗？

这个问题的答案出人意料：CFL 对交不封闭。

## 2. 直觉解释

CFL 由 CFG（上下文无关文法）或 PDA（下推自动机）识别。CFG 的产生式可以自由拼接两个文法，所以并、连接、星号运算天然保持 CFL 性质。

但交和补需要"同时追踪两件事"。PDA 只有一个栈，无法同时模拟两台 PDA——就像一个人同时用两只手弹两架钢琴，栈不够用。

## 3. 正式定义与定理

**封闭性定理**：上下文无关语言对以下运算封闭：

| 运算 | 符号 | 证明思路 |
| --- | --- | --- |
| 并 | $L_1\cup L_2$ | 新起始符 $S\to S_1\mid S_2$ |
| 连接 | $L_1L_2$ | 新起始符 $S\to S_1S_2$ |
| 星号 | $L^*$ | 新起始符 $S\to S_1S\mid\varepsilon$ |
| 反转 | $L^R$ | 将每条产生式右端反转 |

**不封闭定理**：CFL 对交和补不封闭。

设 $L_1=\lbrace a^nb^nc^m:n,m\ge0\rbrace$，$L_2=\lbrace a^mb^nc^n:m,n\ge0\rbrace$，两者都是 CFL（分别由 CFG $S_1\to AB,\ A\to aAb\mid\varepsilon,\ B\to cB\mid\varepsilon$ 和类似文法生成）。但

$$L_1\cap L_2=\lbrace a^nb^nc^n:n\ge0\rbrace$$

由 CFL 泵引理已知这不是 CFL。因此 CFL 对交不封闭。

由德摩根律 $\overline{L_1\cap L_2}=\overline{L_1}\cup\overline{L_2}$，若 CFL 对补封闭，则对交也封闭（因为交可以用补和并表达：两次取补、一次取并就能拼出交）。既然对交不封闭，对补也不封闭。

## 4. 分步例题

**例**：证明 $L_1=\lbrace a^nb^nc^m:n,m\ge0\rbrace$ 是 CFL。

1. 构造 CFG：$S\to AB$，$A\to aAb\mid\varepsilon$，$B\to cB\mid\varepsilon$；
2. $A$ 生成 $\lbrace a^nb^n:n\ge0\rbrace$，$B$ 生成 $\lbrace c^m:m\ge0\rbrace$；
3. $S$ 先调用 $A$ 生成匹配的 $a,b$，再调用 $B$ 生成任意多 $c$；
4. 所有串形如 $a^nb^nc^m$，且 $n,m$ 独立，确实是 CFL。

**例**：用 CFG 构造证明并运算封闭。

1. 设 $G_1=(V_1,\Sigma,R_1,S_1)$ 生成 $L_1$，$G_2=(V_2,\Sigma,R_2,S_2)$ 生成 $L_2$（假设 $V_1\cap V_2=\varnothing$）；
2. 构造 $G=(V_1\cup V_2\cup\lbrace S\rbrace,\Sigma,R_1\cup R_2\cup\lbrace S\to S_1\mid S_2\rbrace,S)$；
3. $S$ 选 $S_1$ 则生成 $L_1$ 的串，选 $S_2$ 则生成 $L_2$ 的串；
4. 所以 $L(G)=L_1\cup L_2$。

## 5. 动手实验

### 实验 1（python）：构造并运算的文法

```python title="两个 CFG 的并"
# CFG 用产生式字典表示：左符号 -> 右侧选项列表
grammar1 = {
    "S": ["AB"],
    "A": ["aAb", ""],  # "" 代表 ε（空串）
    "B": ["cB", ""]
}
grammar2 = {
    "S": ["CD"],
    "C": ["aC", ""],
    "D": ["bDc", ""]
}

def generate(symbol, grammar, depth=0):
    """从给定符号出发，按文法生成一个串（贪心选第一个产生式）"""
    if depth > 8:  # 递归深度限制，防止无限展开
        return ""
    if symbol not in grammar:  # 终结符：直接返回
        return symbol
    # 选第一条产生式
    production = grammar[symbol][0]
    result = ""
    for ch in production:  # 遍历产生式右侧的每个符号
        result += generate(ch, grammar, depth + 1)
    return result

# 并运算：新起始符 S -> S1 | S2
print("L1 样本:", generate("S", grammar1))
print("L2 样本:", generate("S", grammar2))
```

两个文法独立生成各自的样本。并运算只需一个新起始符做选择。

### 实验 2（python）：验证交集反例

```python title="检查 a^nb^nc^n 是否可由 CFG 生成"
# 已知 {a^n b^n c^n} 不是 CFL
# 数值验证：尝试用简单 CFG 生成它——失败是意料之中的

def check_abc_triple(s):
    """检查串是否形如 a^n b^n c^n"""
    na = s.count("a")
    nb = s.count("b")
    nc = s.count("c")
    # 还要检查顺序：先全是 a，再全是 b，再全是 c
    expected = "a" * na + "b" * nb + "c" * nc
    return s == expected and na == nb == nc and na > 0

# L1 ∩ L2 的成员应该是 a^n b^n c^n
test_strings = ["abc", "aabbcc", "aaabbbccc", "aabb", "aabbc", "ab"]
for s in test_strings:
    print(f"'{s}' in L1∩L2? {check_abc_triple(s)}")
```

$a^nb^nc^n$ 的成员可以枚举验证，但关键事实是：没有任何 CFG 能恰好生成它们全体。

### 实验 3（viz）：封闭性关系图

```viz
{
  "type": "proof-trail",
  "title": "CFL 封闭性一览",
  "steps": [
    { "id": "union", "text": "并: 封闭 ✓" },
    { "id": "concat", "text": "连接: 封闭 ✓" },
    { "id": "star", "text": "星: 封闭 ✓" },
    { "id": "intersect", "text": "交: 不封闭 ✗" },
    { "id": "complement", "text": "补: 不封闭 ✗" }
  ],
  "edges": [["union", "concat"], ["concat", "star"]]
}
```

:::warning[常见误区]

**你以为 CFL 对所有集合运算都封闭。** 其实 CFL 只对并、连接、星、反转封闭；对交和补不封闭。

**你以为交不封闭意味着交集一定不是 CFL。** 其实交集"有时"是 CFL（比如两个相同语言的交），只是"不一定"是 CFL。

**你以为补不封闭可以单独证明。** 实际上常借助德摩根律从交的不封闭推出补的不封闭。

:::

## 6. 练习

```exercise
# @title: 练习：构造并运算的 CFG
# @check: ab: True
# @check: aabb: True
# @check: aaabbb: True
# @check: abb: True
# @check: aabbbb: True
# @check: aab: False
# @hint: S -> S1 | S2 的含义是「属于 L1 或属于 L2 都算数」；让 in_union 把 in_L1 和 in_L2 都试一遍。
# L1 = {a^n b^n}, L2 = {a^n b^2n}
# 并集 L1 ∪ L2：一个串只要属于 L1 或 L2 就算数，
# 这正是 CFG 新起始符 S -> S1 | S2 的含义。

def in_L1(s):
    # s = a^n b^n：长度是 2n，前 n 个 a、后 n 个 b
    if len(s) % 2 != 0 or not s:      # 长度不是偶数直接排除
        return False
    n = len(s) // 2                   # // 是整除（向下取整）
    return s == "a" * n + "b" * n

def in_L2(s):
    # s = a^n b^2n：长度是 3n，前 n 个 a、后 2n 个 b
    if len(s) % 3 != 0 or not s:
        return False
    n = len(s) // 3
    return s == "a" * n + "b" * (2 * n)

# 并运算：S -> S1 | S2
def in_union(s):
    return in_L1(s)          # ← 只走了 S1，漏掉了 S -> S1 | S2 的另一半

tests = ["ab", "aabb", "aaabbb", "abb", "aabbbb", "aab"]
for t in tests:
    print(f"{t}: {in_union(t)}")
```

```quiz
CFL 对以下哪种运算不封闭？
- 并
- 连接
- 交 [*]
- 星号
? CFL 对并、连接、星号封闭，但对交不封闭。反例：{a^nb^nc^m} ∩ {a^mb^nc^n} = {a^nb^nc^n} 不是 CFL。
```

```quiz
若 CFL 对补封闭，能推出什么？
- CFL 对交也封闭 [*]
- 正则语言变成了 CFL
- PDA 可以模拟 Turing 机
? 由德摩根律 L1∩L2 = 补(补(L1)∪补(L2))。若 CFL 对补封闭，则补(L1)和补(L2)仍是 CFL，并也是 CFL，再取补得交。所以补封闭⇒交封闭。已知交不封闭，所以补也不封闭。
```

## 7. 选读：正则交的特殊情况

<details>
<summary>选读 · CFL 与正则语言的交</summary>

虽然 CFL 对一般交不封闭，但 CFL 与正则语言的交仍是 CFL。证明思路：构造一台 PDA 模拟原 CFL 的栈操作，同时用 DFA 状态追踪正则语言的条件。两者的组合机器仍是 PDA（栈只有一个），所以交集是 CFL。

这个结果在编译器设计中很实用：语法分析（CFL）与词法分析（正则）的交可以统一处理。

</details>

## 8. 下一站

CFL 的工具箱已经齐备：泵引理划边界，封闭性做组合。还差一件称手的生成工具——下一课用上下文无关文法把「主语、谓语、宾语」这样的层次一句话讲清楚。

→ [上下文无关文法](./75-context-free-grammar.md)
