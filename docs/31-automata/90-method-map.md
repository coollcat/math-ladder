---
title: 自动机方法地图
lesson_id: automata/method-map
prereqs:
  - automata/cyk-parsing
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
  - chomsky-hierarchy
  - automata-method-selection
applications:
  - lexical-analysis
  - syntax-analysis
  - computability-boundaries
exits:
  - research
---

# 自动机方法地图

## 1. 从一个场景开始

学完一章工具，最大的风险是看见什么都想画状态图，或者明明是括号配对却硬写 DFA。这一课不引入新定理，只做一件事：给问题选对记忆模型。

## 2. 直觉解释

选择机器的关键问题是：识别时必须记住多少无界信息？

1. 只需有限个结论：DFA/NFA；
2. 要比较一个嵌套深度：PDA/CFL；
3. 要同时追踪多个独立无界计数：通常超出 CFL；
4. 要通用算法和停机保证：进入可计算性与复杂度章。

乔姆斯基层级把这些语言排成一列：

$$\text{正则语言}\subsetneq\text{上下文无关语言}\subsetneq\text{可判定语言}\subsetneq\text{可枚举语言}$$

严格包含说明每一层都有上一台机器做不到的事。

## 3. 方法对照表

| 方法 | 记忆核心 | 典型问题 | 关键工具 |
| --- | --- | --- | --- |
| DFA | 固定状态 | 固定关键词校验、偶数个某符号 | 转移表、最小化 |
| NFA | 平行状态集合 | 模式存在性、宽松匹配 | 子集构造 |
| 正则表达式 | 结构化模式 | 词法 token、搜索规则 | Thompson 构造 |
| 泵引理 | 重复状态反证 | 判断不是正则 | 找坏长串 |
| PDA | 栈 | 括号、回文、$a^n b^n$ | push/pop |
| CFG | 嵌套规则 | 程序语法、表达式层次 | 推导、解析树 |
| CYK/DP | 区间表 | CNF 成员判定、概率解析 | 动态规划 |

## 4. 分步例题：三道题选三种机

**题 A**：用户名只允许字母数字且长度不超过 16。

1. 长度上限固定，信息量有限；
2. 可以用 17 个计数状态加字符类别转移；
3. 选 DFA 或正则表达式。

**题 B**：检查任意深度 `(...)` 是否平衡。

1. 深度无界；
2. 但只需一种栈符号的数量；
3. 选 PDA；工程实现可用栈计数器。

**题 C**：要求字符串中 $a,b,c$ 数量都相等。

1. 需要同时比较两个独立差值；
2. 一根栈不能同时保存两组无界对应；
3. 超出 CFL，应交给更强的计算模型或改约束。

## 5. 动手实验

### 实验 1（viz）：把问题映射到方法

```viz
{
  "type": "set-mapper",
  "left": ["偶数个a", "括号平衡", "anbncn", "关键词扫描"],
  "right": ["有限状态", "栈", "更强模型"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 0]]
}
```

这张映射盘刻意粗糙：真实工程还要考虑错误恢复、性能和文法可维护性。但它能阻止第一层错配——不要用 DFA 硬扛无界嵌套。

### 实验 2（python）：自动给出建议标签

```python title="根据特征选模型"
def choose_model(needs_unbounded_nesting, needs_two_counts):
    if needs_unbounded_nesting and needs_two_counts:
        return "stronger model"
    if needs_unbounded_nesting:
        return "pda"
    return "dfa"

cases = [
    {"name": "even-a", "nesting": False, "two": False},
    {"name": "brackets", "nesting": True, "two": False},
    {"name": "three-counts", "nesting": True, "two": True},
]

for case in cases:
    answer = choose_model(case["nesting"], case["two"])
    print(f"{case['name']}: {answer}")
```

字典里的方括号表示列表，花括号表示字典；`case["name"]` 用键取值。这个函数只是决策表原型，不是形式语言判定器。

:::warning[常见误区]

你以为高级模型永远更好。其实能用 DFA 时，正则引擎通常更快、更易优化和验证。

你以为 CFG 只用于编译器。它也出现在配置语言、数据交换格式、自然语言结构和某些学习模型的输出约束里。

你以为层级包含关系允许随意上移。每上一层通常牺牲效率、确定性或可判定性质；先确认下层真的不够。

:::

## 6. 练习

```exercise
# @title: 练习：输出正确方法标签
# @check: dfa
# @check: pda
# @check: stronger model
# @hint: 无界嵌套但只有一个计数用 pda；两个独立无界计数超出 CFL；固定类别用 dfa。
def model_for(nesting, two_counts):
    if nesting:
        return "dfa"
    if nesting and two_counts:
        return "pda"
    return "unknown"

print(model_for(False, False))
print(model_for(True, False))
print(model_for(True, True))
```

期望输出依次是 `dfa`、`pda`、`stronger model`。初始代码把第一个条件写得太宽，导致后面分支不可达。

```quiz
下面哪个任务最适合普通 DFA？
- 判断任意长 XML 标签嵌套是否配平
- 检查二进制串中 1 的个数是否为偶数 [*]
- 判断 a、b、c 三种字符数量是否都相等
? 偶数性只需一个有限状态；另外两项都需要无界记忆或多组独立计数。
```

## 7. 选读：通往下一章的三张门牌

<details>
<summary>选读 · 图灵机会补上什么</summary>

PDA 只有一根栈；图灵机有可来回移动的工作带，因此能模拟多个独立存储流。下一章会用图灵机定义可判定与可枚举，再讨论停机问题和复杂度类。本章的方法地图会变成那张更大地图的一角。
</details>

## 8. 本章回望

第 31 章从字母表出发，经过 DFA、NFA、子集构造、正则表达式的等价三角形，用泵引理划界；随后加入栈，进入上下文无关文法、解析树与 CYK。你带走的不是一个名词表，而是“记忆形状决定语言能力”的设计直觉。
