---
title: 不可判定问题族
lesson_id: computability/undecidable-families
prereqs:
  - computability/reductions
volume: 3
layer: L4
track:
  - discrete-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - rice-theorem-intuition
applications:
  - program-analysis
  - compiler-safety
exits:
  - research
---

# 不可判定问题族

## 1. 从一个场景开始

停机问题不可判定之后，你可能以为只有这个奇怪的自指问题例外。事实更惊人：只要问题是关于程序“算出什么行为”，而不是程序文本长什么样，几乎所有非平凡性质都会掉进同一个家族。

这一课不是罗列名词，而是看归约如何让停机问题的影子覆盖一片大陆。

## 2. 直觉解释

比较两类描述程序的问题：

| 文本性质 | 行为性质 |
| --- | --- |
| 程序是否包含字母 `for` | 程序是否对所有输入输出 0 |
| 程序长度是否小于 100 | 程序是否存在某输入会死循环 |
| 变量名是否叫 `x` | 两个程序计算的函数是否相同 |

文本性质通常可以读字符判定；行为性质要看无限多个输入上的未来。若某个非空、非全体程序集合由纯行为划定边界，试图精确判定成员资格就常常撞上停机问题。

这不是巧合。取一个具有性质 $S$ 的程序 $T$，再取一个不具有 $S$ 的程序 $R$。给定任意程序 $P$ 和输入 $w$，构造新程序 $Q$：先模拟 $P(w)$；若停机就表现如 $T$，若不停机则表现如 $R$。于是“$P(w)$ 是否停机”被藏进“$Q$ 是否具有性质 $S$”里。后者若可判定，前者也可判定，矛盾。

## 3. 正式定义与核心定理

称程序的一个性质是**语义性质**，若它只依赖程序计算的部分函数，不依赖变量名、注释或书写顺序。称它**非平凡**，若至少有一个程序有该性质，也至少有一个程序没有。

**Rice 定理（直觉版）**：图灵可计算程序的任何非平凡语义性质都不可判定。

证明骨架是一次统一归约：

1. 设目标语义性质 $S$ 非平凡；
2. 取有 $S$ 的程序 $T$ 和没有 $S$ 的程序 $R$；
3. 对输入 $\langle P,w\rangle$ 构造程序 $Q_{P,w}$：先模拟 $P(w)$；若停则表现如 $T$，若不停则表现如 $R$；
4. $Q_{P,w}$ 有 $S$ 当且仅当 $P(w)$ 停机；
5. 若 $S$ 可判定，就得到停机判定器，矛盾。

定理很强大，但使用前必须检查三个条件：性质确实是语义的、确实非平凡、对象是足够强的图灵完备模型。

## 4. 分步例题

例 1：“程序是否对输入 0 输出 hello”是语义性质吗？

1. 改注释和变量名不影响答案，所以是语义的；
2. 存在会输出 hello 的程序，也存在不会的程序；
3. 性质非平凡；
4. 由 Rice 定理不可判定。

例 2：“程序源码中是否出现字符串 hello”呢？

1. 只需扫描文本即可判定；
2. 它不是语义性质：改写等价程序可能改变答案；
3. 所以 Rice 定理不适用。

例 3：“程序要么总是停机，要么总是死循环”呢？

1. 它排除了一些混合行为的程序，也允许一些程序；
2. 只依赖计算行为；
3. 因此也是非平凡语义性质，不可判定。

## 5. 动手实验

### 实验 1：影子传播链

```viz
{
  "type": "proof-trail",
  "title": "把停机藏进程序行为",
  "steps": [
    { "id": "原问", "text": "P(w) 会停吗？" },
    { "id": "包装", "text": "构造 Q：停后做 T，否则做 R" },
    { "id": "桥接", "text": "Q 有 S 当且仅当 P(w) 停" },
    { "id": "矛盾", "text": "若 S 可判，停机也可判" }
  ],
  "edges": [["原问", "包装"], ["包装", "桥接"], ["桥接", "矛盾"]]
}
```

这张链路图是许多不可判定结果的公共模板。不同问题只是换了目标行为 $S$，骨架不变。

### 实验 2：用有限表区分语法与语义

```python title="同一行为的不同写法"
programs = [
    {"name": "A", "source_has_zero": True, "outputs": [0, 0]},
    {"name": "B", "source_has_zero": False, "outputs": [0, 0]},
    {"name": "C", "source_has_zero": False, "outputs": [1, 0]}
]

def all_zero(program):             # 判断有限观察到的行为是否全为 0
    for value in program["outputs"]:
        if value != 0:
            return False           # 只要有一个非零就不是全零
    return True

for p in programs:
    print(p["name"], p["source_has_zero"], all_zero(p))
```

B 和 C 的源码都不含字符串 zero，但行为不同；A 与 B 源码标记不同，行为相同。这说明文本检查和行为检查不是同一种问题。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为所有关于程序的问题都不可判定。限制语言后，很多安全检查、类型检查和终止性分析可以做。

**误区二**：你以为 Rice 定理适用于一切数学结构。它是针对图灵完备程序模型的语义性质。

**误区三**：你以为“不可判定”意味着无法证明任何具体实例。单个程序当然可能被专门方法证出有或没有某性质；不可行的是通用总判定器。

:::

## 7. 练习

```exercise
# @title: 练习：给性质贴上正确标签
# @check: semantic
# @check: syntactic
# @hint: 第一问只看输出的有限行为；第二问只看源码是否包含某个字符。
properties = {
    "always_even_output": "syntactic",
    "contains_loop_keyword": "semantic"
}

print(properties["always_even_output"])
print(properties["contains_loop_keyword"])
```

初始字典故意把两个值互换。请修正标签：`always_even_output` 是关于计算结果的行为性质；`contains_loop_keyword` 只需扫描文本。

<details>
<summary>点开查看逐步解答</summary>

`always_even_output` 不关心程序怎样书写，只关心每次输出除以 2 的余数是否为 0，所以是语义性质；在图灵完备模型上且非平凡时，Rice 定理说明它不可判定。`contains_loop_keyword` 可以逐字符查找关键字，因此是语法性质。注意“输出永远是偶数”涉及无限多个输入，这正是一般无法通过有限扫描可靠决定的原因。

</details>

## 8. 快问快答

```quiz
应用 Rice 定理前必须确认哪件事？
- 程序源码长度固定
- 性质是非平凡的语义性质 [*]
- 问题一定包含循环关键字
? 若性质平凡，或者只是文本性质，定理的前提不成立，不能直接下结论。
```

## 9. 选读：从族到地图

<details>
<summary>选读 · 不可判定性的层级感</summary>

归约不仅能证明不可判定，还能按相对难度给问题分层。例如停机问题和它的补集之间有不对称关系；有些问题比停机问题更高，需要多次跳转或更复杂的 oracle 直觉。本章不展开算术层级，但保留这张地图很有用：不可判定不是一团黑雾，而是仍有结构的疆域。

</details>

## 10. 下一站

不可判定是能力边界，接下来换一把尺子：对可判定问题，寻找答案和验证答案所需的资源可能天差地别。

→ [P 与 NP](./50-p-np.md)
