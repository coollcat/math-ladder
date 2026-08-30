---
title: 集合、关系与函数
lesson_id: math-language/sets-relations-functions
prereqs:
  - math-language/quantifiers
volume: 2
layer: L8
track:
  - algebra-structure
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - relation
  - function-property
applications:
  - data-modeling
  - function-composition
exits:
  - research
---

# 集合、关系与函数

## 1. 从一个场景开始

把学生和座位画上箭头：一人抢两个座位、两个人挤同一座位、有人没有座位，三种混乱一眼可见。“函数”不是随便画箭头，而是给每个输入发唯一出口。

## 2. 直觉解释

集合是“哪些对象在场”的名册。关系是名册之间允许的任意箭头；函数是加了纪律的箭头：左集合每个元素必须射出恰好一支箭。

在这条纪律之上还有两个荣誉称号：

- 单射：不同输入不撞同一个输出；
- 满射：右集合每个元素都被射中。

两者同时成立就是双射——一一对应。

## 3. 正式定义

设 $A,B$ 是集合。笛卡尔积

$$A \times B = \lbrace (a,b) : a\in A,\ b\in B \rbrace$$

的任意子集 $R$ 都叫从 $A$ 到 $B$ 的关系。

关系 $f \subseteq A\times B$ 是函数，当且仅当每个 $a\in A$ 恰好属于一个有序对 $(a,b)$。此时记 $f(a)=b$。

函数 $f$ 是单射，当 $a_1\ne a_2$ 时必有 $f(a_1)\ne f(a_2)$；是满射，当每个 $b\in B$ 都有至少一个 $a$ 使 $f(a)=b$。

## 4. 分步例题

设 $A=\lbrace 1,2,3\rbrace$，$B=\lbrace a,b\rbrace$。

1. 箭头 $1\to a$，$2\to b$，$3\to a$ 是函数；
2. 因为 $a$ 被两个输入共用，它不是单射；
3. 因为 $a,b$ 都被射中，它是满射；
4. 所以它是普通满射，不是双射。

若删去 $3\to a$，左侧 $3$ 没有像，函数纪律被破坏，连函数都不是。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "箭头决定函数身份",
  "left": ["1", "2", "3"],
  "right": ["a", "b", "c"],
  "arrows": [[0, 0], [1, 1], [2, 0]]
}
```

点击中间圆点增删箭头。先让某个左元素有两个箭头，看它跌回“一般关系”；再构造一一对应，看双射亮出结论。

```python title="用计数器判定函数纪律"
def describe(arrows):
    left_counts = []
    for row in arrows:
        count = 0
        for item in row:
            if item == 1:
                count = count + 1
        left_counts.append(count)   # append：把新数接到列表末尾

    for count in left_counts:
        if count != 1:
            return "relation"
    return "function"

print(describe([[1, 0], [0, 1], [1, 0]]))
print(describe([[1, 0], [0, 1]]))
```

输出 `relation`、`function`。第一组左元素 3 有两支箭头，所以不是函数。

## 6. 练习

```exercise
# @title: 练习：关系、函数与双射
# @check: relation
# @check: function
# @check: bijection
# @hint: 先检查每个左元素是否恰好一个 1；双射还要求右列都至少一个 1，且不同左元素不指向同一列。第二组的右列 1 没有 1。
arrows = [
    [[1, 1], [1, 0]],
    [[1, 0], [1, 0]],
    [[0, 1], [1, 0]],
]
for item in arrows:
    print("relation")
```

<details>
<summary>点开查看逐步解答</summary>

```python
arrows = [
    [[1, 1], [1, 0]],
    [[1, 0], [1, 0]],
    [[0, 1], [1, 0]],
]

def classify(item):
    for row in item:
        count = 0
        for value in row:
            if value == 1:
                count = count + 1
        if count != 1:
            return "relation"

    width = len(item[0])          # len() 返回列表长度
    right_counts = [0] * width    # * 复制列表里的初始值
    images = []
    for row in item:
        column = 0
        for value in row:
            if value == 1:
                right_counts[column] = right_counts[column] + 1
                images.append(column)
            column = column + 1

    for count in right_counts:
        if count == 0:
            return "function"
    for i in range(len(images)):
        for k in range(i + 1, len(images)):
            if images[i] == images[k]:
                return "function"
    return "bijection"

for item in arrows:
    print(classify(item))
```

第一组左元素 1 指出两支箭头，所以只是关系；第二组每个输入有唯一像，但右列 1 没有被射中，所以是普通函数；第三组一一对应，是 `bijection`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为一个输入对应多个输出只是“多值函数”。在本章定义下它是关系，不是函数；要处理多值必须另立定义。

**误区二**：你以为满射由公式本身决定。满射总是相对指定的陪域 $B$ 而言；把 $B$ 缩小成实际像，同一个映射可能变成满射。

**误区三**：你以为“每个输出都有输入”就是单射。那是满射的方向；单射管的是不同输入不能共用同一个输出。

:::

## 8. 快问快答

```quiz
一个从 A 到 B 的映射要成为函数，最少必须满足什么？
- 每个 b 都有 a 指向它
- 每个 a 恰好指向一个 b [*]
- 不同 a 不能指向同一个 b
? 函数纪律只要求左集合每个元素有唯一像。满射和单射是额外性质。
```

## 9. 选读：为什么双射能谈“一样多”

<details>
<summary>选读 · 计数的箭头版本</summary>

有限集合可以直接数个数；无限集合不能数完，数学改用双射比较大小。若两个集合之间存在双射，就称它们等势。自然数与偶数看似一个多一倍，但 $n\mapsto 2n$ 是双射，所以二者等势。这个箭头标准会在卷三逻辑与集合章继续生长。

</details>

## 10. 下一站

有了集合、关系和量词，终于可以追问“证明”本身：一条推理链凭什么把前提送到结论？下一课搭直接证明的骨架。

→ [直接证明](./40-direct-proof.md)
