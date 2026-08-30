---
title: 命题逻辑与自然演绎
lesson_id: logic-sets/propositional-deduction
prereqs:
  - math-language/propositions
  - math-language/direct-proof
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
  - argument-validity
  - natural-deduction
  - modus-ponens
  - formal-fallacy
applications:
  - software-verification
  - exam-logic
exits:
  - research
---

# 命题逻辑与自然演绎

## 1. 从一个场景开始

第 18 章你已经会写 $p \Rightarrow q$ 的真值表了。但真值表只是**单词表**——这一课要学**造句**：给定几条前提，怎样一步一步、每步都无可指责地推出结论？

> 前提一：如果明天下雨，运动会就取消。
> 前提二：明天下雨。
> 结论：运动会取消。

这三句话放在一起，结论是"被逼出来"的，不管你喜不喜欢。这种"被逼出来"的感觉，就是本课要拆解的对象。

## 2. 直觉解释

**论证**是一串句子：开头的叫**前提**，最后一句叫**结论**。我们关心的不是每句话本身真假，而是它们之间的**挤压关系**：前提真的时候，结论有没有可能逃掉？

- 如果前提真时结论**不可能假**，这个论证叫**有效**（valid）；
- 如果存在一种情况让前提全真而结论却假，那这就是论证的**死穴**——找到一行反例，论证就塌了。

自然演绎则是"不查全表、走捷径"的推理艺术：用几条人人认可的**小步规则**，从前提走到结论。每一步都很小，连起来却能走很远。

## 3. 正式定义

设 $\Gamma$ 是一组命题公式（前提），$\varphi$ 是一个公式（结论）。称论证"$\Gamma \vdash \varphi$"**语义有效**，当且仅当不存在一种赋值使 $\Gamma$ 中每个公式为真而 $\varphi$ 为假。

| 记号 | 名字 | 内容 | 有效吗 |
| --- | --- | --- | --- |
| MP | 肯定前件 | $p \Rightarrow q,\ p \vdash q$ | 有效 |
| MT | 否定后件 | $p \Rightarrow q,\ \lnot q \vdash \lnot p$ | 有效 |
| HS | 假言三段论 | $p \Rightarrow q,\ q \Rightarrow r \vdash p \Rightarrow r$ | 有效 |
| — | 肯定后件 | $p \Rightarrow q,\ q \vdash p$ | 谬误 |
| — | 否定前件 | $p \Rightarrow q,\ \lnot p \vdash \lnot q$ | 谬误 |

注意"有效"说的是**形状**，不是内容："所有猫都会飞，苏格拉底是猫……"内容荒唐也可以有效；反过来，前提结论碰巧都真的论证也可能是谬误。**有效性属于论证，真假属于命题。**

## 4. 分步例题

**例**：用小步规则证明：由 $p \Rightarrow q$、$q \Rightarrow r$ 和 $p$，能推出 $r$。

1. 前两行是两条条件句前提：$p \Rightarrow q$，$q \Rightarrow r$；
2. 用假言三段论（HS）把它们接起来：$p \Rightarrow r$；
3. 第三行给出前提 $p$；用肯定前件（MP）从 $p \Rightarrow r$ 得到 $r$；
4. 审计一下反方向：如果有人再给出 $\lnot r$，则由 MT 从 $p \Rightarrow r$ 得 $\lnot p$，与第 3 行相撞；
5. 所以在原有前提下 $r$ 必然成立。整条主证明只用了 HS 和 MP，MT 负责解释为什么逃不出这条链。

看：没有一步需要"灵感"，全部是机械的小跳。这就是自然演绎的力量——**证明可以被检查，而不只是被相信**。

## 5. 动手实验

### 实验 1（viz）：条件句只有一行是假的

```viz
{
  "type": "truth-table",
  "title": "p=>q 的四行体检",
  "formula": "p=>q",
  "showColumns": ["p", "q", "not p", "p=>q"]
}
```

红色行就是 $p \Rightarrow q$ 的唯一死穴：前提真而结论假。MT 的原理一眼可见：只要最后一列为真，就永远轮不到"q 假"的那一行，于是"p 真"也被排除。

### 实验 2（viz）：把推理链接成有向图

```viz
{
  "type": "proof-trail",
  "title": "三段论接力",
  "steps": [
    { "id": "A", "text": "p=>q 且 q=>r（两条前提）" },
    { "id": "B", "text": "任取真值：若 p 假则 p=>q 自动真" },
    { "id": "C", "text": "p 真 时由 MP 得 q" },
    { "id": "D", "text": "q 真 时由 MP 得 r" },
    { "id": "E", "text": "无论哪种情况 r 都成立" },
    { "id": "F", "text": "故 p=>r（HS 得证）" }
  ],
  "edges": [["A", "C"], ["A", "D"], ["B", "E"], ["C", "E"], ["D", "E"], ["E", "F"]]
}
```

初始箭头已经给出一条完整依赖链。连点几次「撤销一步」拆掉链条尾部，或干脆「清空」重搭，再看「检查」怎么判——证明缺一座桥，结论就悬在半空。

### 实验 3（python）：穷举赋值，机器验有效

```python title="枚举全部赋值，检验肯定前件是否有效"
def implies(a, b):
    return 1 - a * (1 - b)     # p=>q 的数值版：只有 p=1 且 q=0 时返回 0

counterexamples = 0             # 反例计数器，先清零
for p in [0, 1]:               # for + 列表：让 p 依次取 0 和 1 两种赋值
    for q in [0, 1]:
        premise1_ok = implies(p, q) == 1   # 第一条前提 p=>q 是否为真
        premise2_ok = (p == 1)             # 第二条前提 p 是否为真
        conclusion_ok = (q == 1)           # 结论 q 是否为真
        if premise1_ok and premise2_ok and not conclusion_ok:  # and：两者都真才真；not：真假取反
            counterexamples = counterexamples + 1
            print("发现反例: p=" + str(p) + " q=" + str(q))

if counterexamples == 0:       # if / else：二选一执行
    print("无反例，论证有效")
```

没有任何赋值能让前提全真而结论假——MP 的有效性被机器盖章。把第二行前提换成 `q == 1`、结论换成 `p == 1`（即"肯定后件"），再跑一次看看会发生什么。

:::warning[常见误区]

**误区一**：你以为"结论是真的"就能说明推理没问题。其实有效性只看前提与结论之间的必然联系；瞎猫碰上死耗子的论证依然是坏论证。

**误区二**：你以为"肯定后件"和"肯定前件"长得差不多，效果也差不多。其实方向完全相反：箭头只能顺着走（由因推果），不能倒着走（见果就断因）。

**误区三**：你以为真值表只适用于简单公式。其实任何命题逻辑论证都能用真值表判定——变量多时表会爆炸，所以才需要自然演绎这样的捷径。

:::

## 6. 练习

```quiz
论证"如果下雨地就湿；现在地湿了；所以下过雨"犯了什么错误？
- 偷换了论题
- 肯定后件：地湿也可能因为洒水车 [*]
- 否定前件：没下雨不代表地不湿
? 条件句只保证"下雨则地湿"，不保证"地湿必因下雨"。逆行推理必须找到反例行才能定性为谬误。
```

**练习 1**：用纸笔判断"否定前件"是否有效：写出它全部四种赋值里前提为真的那些行。

<details>
<summary>点开查看逐步解答</summary>

前提是 $p \Rightarrow q$ 且 $\lnot p$。逐行扫描：$p$ 必须为假，于是只剩 $p=0, q=0$ 和 $p=0, q=1$ 两行满足两条前提。在 $p=0, q=1$ 这行，结论 $\lnot q$ 为假——反例到手，论证无效。"我没带伞不代表天不下雨"，就是这个反例的日常版。
</details>

**练习 2**：下面的程序想找出"肯定后件"的反例行，但跑完输出了两行——其中有一行是冒牌的。修好它：

```exercise
# @title: 揪出“肯定后件”的唯一反例
# @check: p=0 q=1
# @hint: 反例行要同时满足两条前提为真且结论为假。初始代码只筛了前提，把 p=1,q=1 这行也放进来了。
def implies(a, b):
    return 1 - a * (1 - b)

bad_conclusion = None           # 先准备一个空位，稍后填入“结论为假”的判断结果
for p in [0, 1]:
    for q in [0, 1]:
        premises_hold = (implies(p, q) == 1) and (q == 1)
        bad_conclusion = (p == 0)
        if premises_hold:                       # ← 问题在这：漏了 and bad_conclusion
            print("p=" + str(p) + " q=" + str(q))
```

修好后输出恰好一行 `p=0 q=1`——这正是"下雨则地湿，现在地湿"论证的死穴。

**练习 3**（概念折叠题）：为什么 MT（否定后件）有效？用一句话说出它与逆否命题的关系。

<details>
<summary>点开查看逐步解答</summary>

$p \Rightarrow q$ 与其逆否命题 $\lnot q \Rightarrow \lnot p$ 在所有赋值下真假完全一致（对照实验 1 的表格即可验证）。于是 MT 的前提"$p \Rightarrow q$ 且 $\lnot q$"等于说"逆否命题的两条前提成立"，由 MP 直接得到 $\lnot p$。MT 就是"穿了一件马甲的 MP"。
</details>

## 7. 选读：可靠性与完备性

<details>
<summary>选读 · 这套游戏为什么公平</summary>

现代数理逻辑对上面整套机制有两个总评：

- **可靠性**（soundness）：凡能从 $\Gamma$ 用推理规则走到的结论 $\varphi$，在语义上确实被 $\Gamma$ 蕴含——机器不会骗人；
- **完备性**（completeness）：凡语义上被蕴含的结论，都存在一条有限长度的形式推导——捷径永远够用。

这两条合起来（哥德尔 1930 年证明）意味着：**"能一步步推出来"与"事实上必然真"在命题逻辑里是同一件事**。你在本课练的每一次小步跳跃，都在这座大桥上。
</details>

## 8. 下一站

命题是完整的句子，但数学更需要谈论"所有的数""某个元素"。下一课把逻辑的探照灯打进句子内部——量词登场，模型现身。

→ [谓词、量词与模型](./20-predicates-models.md)
