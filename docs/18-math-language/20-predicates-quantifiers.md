---
title: 谓词与量词
lesson_id: math-language/quantifiers
prereqs:
  - math-language/propositions
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
  - predicate
  - quantifier
applications:
  - database-queries
  - theorem-statements
exits:
  - research
---

# 谓词与量词

## 1. 从一个场景开始

“每个人都有不喜欢的水果”和“有水果每个人都不喜欢”，中文只换了几个字，意思却完全不同。前一句说的是人，后一句说的是水果。量词就是负责钉住这种顺序的钉子。

## 2. 直觉解释

谓词是一个带空位的判断机：$P(x)$ 表示“$x$ 是偶数”。把 $x=4$ 放进去得到真，把 $x=3$ 放进去得到假。在填满空位之前，它没有固定真假。

量词负责填空位：

- $\forall x\,P(x)$ 读作“论域里每个 $x$ 都满足 $P$”；
- $\exists x\,P(x)$ 读作“论域里至少有一个 $x$ 满足 $P$”。

论域是量词的边界。说“所有人都高”，是在全班还是在全人类？结论可以完全不同。

## 3. 正式定义

给定论域 $D$ 和谓词 $P(x)$：

$$\forall x \in D\,P(x) \text{ 表示每个 } x\in D \text{ 都使 } P(x) \text{ 为真。}$$

$$\exists x \in D\,P(x) \text{ 表示至少存在一个 } x\in D \text{ 使 } P(x) \text{ 为真。}$$

否定时，量词翻转、谓词否定：

$$\neg \forall x\,P(x) \equiv \exists x\,\neg P(x), \qquad \neg \exists x\,P(x) \equiv \forall x\,\neg P(x).$$

## 4. 分步例题

设论域是 $2,3,4$，$P(x)$ 表示“$x$ 是偶数”。

1. $\forall x\,P(x)$ 为假，因为 $3$ 是反例；
2. $\exists x\,P(x)$ 为真，$2$ 是 witness；
3. $\neg \forall x\,P(x)$ 为真，等价于“存在不是偶数的 $x$”；
4. 若把论域改成 $2,4$，同一个 $\forall x\,P(x)$ 就变成真。

## 5. 动手实验

### 实验 1：量词猎手

```viz
{
  "type": "quantifier-hunt",
  "title": "每个人都能找到朋友吗？",
  "domain": ["A", "B", "C"],
  "range": ["A", "B", "C"],
  "relations": [["A", "B"], ["B", "C"], ["C", "A"]],
  "form": ["forall"]
}
```

点击格子增删关系。全称量词要检查每一行；存在量词只要找到一格 witness。然后切换 $\forall\exists$ 和 $\exists\forall$，看顺序如何改变要求。

### 实验 2：小论域暴力检查

```python title="有限论域可以一个一个数"
groups = [["cat", "dog"], ["cat", ""], []]

for group in groups:              # groups 中的每一组轮流叫作 group
    count = 0
    for word in group:            # 对当前组里的每个词检查
        if word != "":            # != 表示不等于
            count = count + 1
    print(count)
```

输出 `2`、`1`、`0`。有限论域可以暴力检查；无限论域不能靠举例，必须证明。

## 6. 练习

```exercise
# @title: 练习：统计满足条件的元素
# @check: 2
# @check: 1
# @check: 0
# @hint: 只统计长度大于 3 的词；空列表一个也没有。
groups = [["bird", "fish", "ant"], ["bird", "ant"], []]   # 列表里再放列表；最后的 [] 是空列表
for group in groups:
    count = 0
    for word in group:
        count = count + 1
    print(count)
```

<details>
<summary>点开查看逐步解答</summary>

把循环里的计数行加上条件：

```python
groups = [["bird", "fish", "ant"], ["bird", "ant"], []]
for group in groups:
    count = 0
    for word in group:
        if len(word) > 3:   # len() 返回字符串长度
            count = count + 1
    print(count)
```

第一组 `bird` 和 `fish` 长度大于 3，计 2；第二组只有 `bird` 符合，计 1；空列表输出 0。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为找到三个正例就能证明 $\forall x\,P(x)$。有限论域可以逐个查；无限论域的三个正例只是抽查，一个反例就足够否定。

**误区二**：你以为“不是所有人都来”等于“所有人都不来”。前者只是 $\neg\forall$，翻转后是 $\exists$ 不来。

**误区三**：你以为量词顺序可以随便换。$\forall x\exists y\,R(x,y)$ 允许每个人找不同的 $y$；$\exists y\forall x\,R(x,y)$ 要求同一个 $y$ 服务所有人。

:::

## 8. 快问快答

```quiz
“没有会飞的猪”的否定是哪一句？
- 所有猪都会飞
- 至少有一只猪会飞 [*]
- 有一只猪不会飞
? 「没有会飞的猪」本身是全称否定；再否定整句时，量词翻转成「至少存在一只会飞的猪」。
```

## 9. 选读：量词顺序与依赖

<details>
<summary>选读 · 为什么 ∀∃ 弱于 ∃∀</summary>

$\forall x\exists y\,R(x,y)$ 允许 $y$ 依赖 $x$：甲可以找乙，乙可以找丙。它只要求每个 $x$ 各自有着落。$\exists y\forall x\,R(x,y)$ 则要求先选定一个公共 $y$，再接受所有 $x$ 的检查。后者的 witness 必须同时服务全部对象，所以更强；能推出前者的方向是单向的。

</details>

## 10. 下一站

量词让数学命题有了精确范围。接下来要把对象装进集合，把对应关系画成箭头，看看“函数”到底比“关系”严在哪里。

→ [集合、关系与函数](./30-sets-relations-functions.md)
