---
title: NP 完全性
lesson_id: computability/np-completeness
prereqs:
  - computability/polynomial-reductions
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - np-hard
  - np-complete
applications:
  - complexity-classification
  - algorithm-planning
exits:
  - engineering
  - research
---

# NP 完全性

## 1. 从一个场景开始

如果有人在 NP 这片大陆上找到一座最高峰，并且所有山峰都能用缆车连到它，那么只要证明这座峰有快路径，整片大陆都有快路径。

NP 完全问题就是这样一批“代表”。它们既属于 NP，又能承载 NP 中所有问题的难度。

## 2. 直觉解释

两个头衔要分开：

| 头衔 | 要求 | 直觉 |
| --- | --- | --- |
| NP 难 | 所有 NP 语言都能多项式归约到它 | 至少和 NP 里任何问题一样难 |
| NP 完全 | 属于 NP，同时是 NP 难 | NP 内部的最难代表 |

一个 NP 难问题可以比 NP 更广，甚至可能不可判定；NP 完全问题一定在 NP，所以每个 yes 实例都有短证书。

Cook-Levin 定理给出第一块多米诺：布尔公式的 satisfiability 是 NP 完全的。它把任意多项式时间非确定计算的历史编码成一组布尔子句：变量表示“某时某带格写着某符”，子句表达合法转移。于是“存在接受分支”等价于“公式可满足”。

## 3. 正式定义

语言 $L$ 是 **NP 难**，若对所有 $A\in NP$ 都有 $A\le_p L$。

语言 $L$ 是 **NP 完全**，若：

1. $L\in NP$；
2. 对所有 $A\in NP$，$A\le_p L$。

**Cook-Levin 定理**：SAT 是 NP 完全的。

由此得到一条实用链：若某个已知的 NP 完全问题 $K$ 满足 $K\le_p L$，且 $L\in NP$，则 $L$ 也是 NP 完全。理由是所有 NP 问题先到 $K$，再到 $L$；复合仍是多项式。

## 4. 分步例题

例题：证明新问题 $L$ 是 NP 完全的标准清单。

1. **成员资格**：写出 $L$ 的候选答案证书；
2. **验证器**：说明检查证书只需多项式时间；
3. **源问题**：选择已知 NP 完全问题 $K$；
4. **构造翻译**：把每个 $K$ 实例变成 $L$ 实例；
5. **双向保真**：分别证明 yes 到 yes、no 到 no；
6. **预算检查**：确认翻译时间是多项式；
7. **结论**：由 $K\le_p L$ 与 $L\in NP$ 得 $L$ NP 完全。

漏掉第 5 步是最常见错误。只展示若干正例映射成功，无法排除假例混入目标真例。

## 5. 动手实验

### 实验 1：困难传播塔

```viz
{
  "type": "proof-trail",
  "title": "从 Cook-Levin 到新问题",
  "steps": [
    { "id": "地基", "text": "SAT 是 NP 完全" },
    { "id": "中转", "text": "已知完全问题 K 可归约到 L" },
    { "id": "成员", "text": "L 有多项式验证器" },
    { "id": "结论", "text": "L 也是 NP 完全" }
  ],
  "edges": [["地基", "中转"], ["中转", "成员"], ["成员", "结论"]]
}
```

实际研究很少每次直接从 SAT 出发。已经证明的中转站像接力棒，让后来者只需完成最后一跳。

### 实验 2：给“是否 NP 完全”做体检

```python title="NP 完全资格核对表"
candidates = [
    {"name": "mystery", "in_np": True, "known_npc_reduces": True},
    {"name": "toy", "in_np": True, "known_npc_reduces": False},
    {"name": "oracle", "in_np": False, "known_npc_reduces": True}
]

def classify(item):                 # item 是资格字典
    if item["in_np"] and item["known_npc_reduces"]:
        return "NP-complete"
    if item["in_np"]:
        return "in NP but not shown NPC"
    return "not shown in NP"

for c in candidates:
    print(c["name"], classify(c))
```

这个程序当然不能替你证明定理；它只是检查证据是否齐全。`known_npc_reduces=True` 必须背后真的有一份双向保真的归约证明。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 NP 完全等于不可能解决。小规模实例、参数化算法、近似算法和特殊结构仍可能有很好方案。

**误区二**：你以为只要问题是指数搜索就自动 NP 完全。必须证明属于 NP，并给出从已知 NP 完全问题的多项式归约。

**误区三**：你以为证明 NP 完全后工程就结束。识别哪些实例来自受限场景，常常比贴标签更有价值。

:::

## 7. 练习

```exercise
# @title: 练习：补齐资格判定条件
# @check: NP-complete
# @check: missing membership
# @check: missing hardness
# @hint: 两个字段都为真才输出 NP-complete；缺成员资格优先报 missing membership。
def npc_status(in_np, known_npc_reduces):
    if known_npc_reduces:
        return "NP-complete"
    if in_np:
        return "missing hardness"
    return "missing membership"

print(npc_status(True, True))
print(npc_status(False, True))
print(npc_status(True, False))
```

初始代码只要看到归约证据就宣布完全性，忽略了还必须先确认问题在 NP。请调整判断顺序和分支。

<details>
<summary>点开查看逐步解答</summary>

正确逻辑是先检查 `in_np`。若为假，即使有归约也只能报告 `missing membership`；若为真但没有从已知 NP 完全问题的归约，则报告 `missing hardness`；两者都满足才返回 `NP-complete`。这对应正式定义的两个必要条件，缺一不可。

</details>

## 8. 快问快答

```quiz
一个问题已经是 NP 难，还需要什么才是 NP 完全？
- 证明它没有指数算法
- 证明它属于 NP [*]
- 把它改写成 SAT
? NP 完全等于 NP 难加 NP 成员资格；后者由短证书验证保证。
```

## 9. 选读：为什么 P 等于 NP 会撼动全部代表

<details>
<summary>选读 · 一荣俱荣的逻辑</summary>

设任一 NP 完全问题 $K$ 有多项式算法。对任意 $A\in NP$，存在 $A\le_p K$。先花多项式时间翻译，再调用 $K$ 的多项式算法，就得到 $A$ 的多项式算法。因此任何一个 NP 完全问题进入 P，都会使所有 NP 问题进入 P。这就是为什么研究者常把注意力集中在这些枢纽问题上。

</details>

## 10. 下一站

Cook-Levin 定理的主角值得单独拆开。下一课手工评估小型布尔公式，再看 SAT 如何被规范化成 3-SAT。

→ [SAT 与 3-SAT](./65-sat-three-sat.md)
