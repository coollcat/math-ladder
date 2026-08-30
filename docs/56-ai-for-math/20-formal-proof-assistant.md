---
title: 形式化数学与证明助手
lesson_id: ai-math/formal-proof-assistant
prereqs:
  - ai-math/conjecture-proof
  - math-language/direct-proof
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - formal-proof
  - proof-checker
applications:
  - lean-mathlib
  - verified-software
exits:
  - data-ai
---

# 形式化数学与证明助手

## 1. 从一个场景开始

一篇论文的审稿人为什么可能看漏一步？因为人类证明写在自然语言里："显然"、"易得"、"不失一般性"……绝大多数时候没问题，偶尔酿成大祸——有的错误在发表十几年后才被发现。

证明助手的哲学是把这件事变得**机械**：证明必须写成形式语言（如 Lean），每一行要么是公理、要么引用推理规则和更早的行。检查器逐行审查，任何一步不合法就拒绝整个证明。社区维护的 Mathlib 库已有超过百万行这样的代码，每一条都在机器眼皮底下成立过。

## 2. 直觉解释

把形式化证明想象成**搭积木过河**：

- 每块积木是一个已知事实，上面印着它的"类型"（前提要求）；
- 推理规则是卡槽：要拼出结论 B，必须恰好插进"A → B"的槽型和一块叫 A 的积木；
- 证明助手是个零容忍的安检员：型号对不上，当场退回，绝不放行。

于是"这个证明对不对"从一个学术判断问题，变成一套可以机械核对的规则匹配。代价是：把人类证明翻译成积木语言往往比发现它还费劲（autoformalization 的难点，本章第 40 课再谈）。

## 3. 正式定义

**形式证明**是一个有限的语句序列 $\pi_1, \pi_2, \dots, \pi_n$，其中每个 $\pi_k$ 要么是公理，要么由推理规则作用于更早的语句得到。

最常用的规则是分离规则（modus ponens）：

$$\text{从 } A \to B \text{ 与 } A, \quad \text{推出 } B$$

| 对象 | 角色 |
| --- | --- |
| 公理 | 免检的出厂积木 |
| 推理规则 | 唯一允许的拼装方式 |
| 定理 | 最终拼出的那块成品积木 |

核心事实（呼应第 32 章可计算性）：**"序列 π 是否构成关于 φ 的合法证明"是可判定的**——检查器只需逐行核对引用与匹配。证明难在搜索，不在检查；这个落差正是机器能可靠介入的原因。

## 4. 分步例题

一个迷你证明库：已知三块积木

1. `P`（第 1 行，公理）；
2. `P → Q`（第 2 行，公理）；
3. `Q → R`（第 3 行，公理）。

目标：证出 `R`。

1. 第 4 行：对第 2、1 行用分离规则（P→Q 且 P），得 `Q`——安检员核对：规则需要箭头式与前件，两块都在库里 ✓；
2. 第 5 行：对第 3、4 行用分离规则（Q→R 且 Q），得 `R` ✓；
3. 终审：最后一行恰是目标 `R`，且每一步都引用了编号在前、类型匹配的积木——**证明成立**；
4. 反面教材：若第 5 行写成"对第 1、4 行用分离规则"，安检员会发现第 1 行不是箭头式——整份证明被拒；
5. 注意机器只保证"步骤合法"，不负责"这定理值不值得证"——意义仍在人这边。

## 5. 动手实验

### 热身：先接一条证明依赖链

```viz
{
  "type": "proof-trail",
  "title": "MP 两步接力",
  "steps": [
    { "id": "P", "text": "前提 P" },
    { "id": "P->Q", "text": "前提 P->Q" },
    { "id": "Q->R", "text": "前提 Q->R" },
    { "id": "Q", "text": "由 P 和 P->Q 得 Q" },
    { "id": "R", "text": "由 Q 和 Q->R 得 R" }
  ],
  "edges": [["P", "Q"], ["P->Q", "Q"], ["Q", "R"], ["Q->R", "R"]]
}
```

先点「检查」，确认每一步都能追到前提；再删掉中间一条边，看检查器如何指出“缺少桥梁”。

### 实验 1：亲手当一回证明检查器

```python title="十行代码的迷你证明助手"
known = ["P", "P->Q", "Q->R"]            # 公理库（列表下标 + 1 就是行号）
proof = [
    ("Q", "mp", 2, 1),                   # (结论, 规则, 箭头式的行号, 前件的行号)
    ("R", "mp", 3, 4),
]
target = "R"

def check():
    lines = known[:]
    if not proof:
        return "证明不成立: 没有任何推理步"
    for step in range(len(proof)):
        concl, rule, arrow_row, prem_row = proof[step]
        if rule != "mp":
            return f"第{step + len(known) + 1}步: 未知规则"
        if arrow_row < 1 or prem_row < 1 or arrow_row > len(lines) or prem_row > len(lines):
            return f"第{step + len(known) + 1}步: 引用了不存在的行"
        arrow = lines[arrow_row - 1]     # 行号从 1 数起，列表下标要减一
        premise = lines[prem_row - 1]
        if "->" not in arrow or arrow.split("->")[0] != premise:
            return f"第{step + len(known) + 1}步: 类型不匹配"
        if concl != arrow.split("->")[1]:
            return f"第{step + len(known) + 1}步: 结论不是箭头式的后件"
        lines.append(concl)
    if lines[-1] == target:
        return "证明成立"
    return "证明不成立: 最后一行不是目标"

print(check())
```

打印"证明成立"——检查器逐行核对了规则、行号、前件和应当推出的后件。试试把第二条改成 `("R", "mp", 3, 5)`（引用不存在的第 5 行），再跑一遍看它如何拦截。

### 实验 2：判题小练兵

```exercise
# @title: 练习：修复非法的证明链
# @check: 证明成立
# @hint: 第二步的前件应当是第一步刚推出的 Q——它在第几行？公理占 1~3 行。
known = ["P", "P->Q", "Q->R"]
proof = [
    ("Q", "mp", 2, 1),
    ("R", "mp", 3, 5),     # ← 问题在这：库里根本没有第 5 行
]
target = "R"

def check():
    lines = known[:]
    if not proof:
        return "证明不成立: 没有任何推理步"
    for step in range(len(proof)):
        concl, rule, arrow_row, prem_row = proof[step]
        if rule != "mp":
            return "未知规则"
        if arrow_row < 1 or prem_row < 1 or arrow_row > len(lines) or prem_row > len(lines):
            return "证明不成立: 引用了不存在的行"
        arrow = lines[arrow_row - 1]
        premise = lines[prem_row - 1]
        if "->" not in arrow or arrow.split("->")[0] != premise:
            return "证明不成立: 类型不匹配"
        if concl != arrow.split("->")[1]:
            return "证明不成立: 结论不是箭头式的后件"
        lines.append(concl)
    if lines[-1] == target:
        return "证明成立"
    return "证明不成立"

print(check())
```

初始版本会诚实报出"引用了不存在的行"。把 `5` 改成 `4`（第 4 行正是上一步刚挣来的 `Q`），安检员立即放行。更隐蔽的攻击也不行：若把第一条结论改成任意符号，检查器会拒绝，因为它必须等于 `P->Q` 的后件。你刚刚体验了形式化的日常：**修的不是数学，是对账单。**

```quiz
一个证明检查器说“证明成立”。这一定保证什么？
- 结论在现实中有用
- 从登记的前提和规则出发，目标确实可以逐步导出 [*]
- 前提本身必然符合直觉
? 检查器守住的是语法和规则边界；前提是否合理、定理是否有价值，仍要由人来审。
```

## 常见误区

:::warning[常见误区]

**误区一**："形式化就是把人类证明逐字翻译。"
往往要重构：人类靠直觉跳过的引理，机器要求显式补齐；反之某些"显然"的步骤机器一秒通过。翻译工作量常超预期数倍，这正是 autoformalization 成为研究热点的原因。

**误区二**："过了检查器就高枕无忧。"
检查器保证"这条证明链成立"，不保证你证的命题就是你想要的命题（定义写歪了照样自洽）。历史上出现过形式化完成后才发现陈述与原意有偏差的案例——陈述本身也要审。

**误区三**："形式化成本永远这么高。"
工具在快速进化：更强的自动化策略、AI 辅助补步（AlphaProof 在 Lean 里训练）、语料复用（Mathlib）都在压低成本。十年前要一周的形式化，如今可能一下午——趋势对 AI for Math 极其友好。

:::

## 6. 练习

**练习 1**：给检查器加第二条规则：从 A 和 B 同时可得 A∧B（合取引入），规则名记作 `"and"`。试着用它证明 P∧Q。

<details>
<summary>点开查看逐步解答</summary>

在 `check()` 里加分支：

```python
if rule == "and":
    if prem_row < 1 or arrow_row < 1 or prem_row > len(lines) or arrow_row > len(lines):
        return "引用越界"
    lines.append(lines[prem_row - 1] + "&" + lines[arrow_row - 1])
```

然后证明条目写 `("P&Q", "and", 1, 4)`（P 是第 1 行，Q 是第 4 行——上一课的分离规则先推出 Q）。真实证明助手里这就是 `constructor`/`And.intro` 一类策略的雏形。
</details>

**练习 2**：构造一个"每步都合法、但结论毫无用处"的形式证明，体会"正确 ≠ 有价值"。

<details>
<summary>点开查看逐步解答</summary>

比如反复使用 and 规则堆出 `((P&P)&P)&P...` 十层嵌套——每一步都无可指摘，但没有回答任何人关心的问题。这说明证明助手是**语法警察**而非**审美导师**；选题与方向感仍是人类（或下一代 AI）的核心竞争力。
</details>

**练习 3**：概念辨析：本课的检查器与第 18 章"直接证明"的关系是什么？

<details>
<summary>点开查看逐步解答</summary>

第 18 章教的是证明的**内容组织**（从已知到目标的路径设计）；本课的检查器管的是**格式合规**（每个引用是否成立）。前者像建筑师画图，后者像审图员验结构计算书。AI for Math 的雄心是把两者接起来：让模型学会画图，让内核守住底线。
</details>

## 7. 选读：Curry–Howard——证明即程序

<details>
<summary>选读 · 类型论的一瞥</summary>

Curry 在 1930 年代、Howard 在 1960 年代前后注意到一个深刻的对应：命题对应类型，证明对应程序，化简对应求值。"A→B 的证明"就是"输入 A 产出 B 的函数"。这不是普通比喻，而是命题与类型结构之间的对应；它解释了 Lean、Coq 这类系统为何基于类型论构建：检查证明与运行程序共用同一套机制。顺带的好处是"提取"能力——一个构造性的存在性证明可以直接跑出那个存在的东西。想深挖可从《Software Foundations》入门，全程可在浏览器里完成。
</details>

## 8. 下一站

积木与安检台都备好了，真正的难题浮出水面：组合爆炸之下，**谁来决定下一步搭哪块积木**？答案来自强化学习与围棋的同源智慧——树搜索加神经引导。

→ [搜索制导的证明](./30-search-guided-proving.md)
