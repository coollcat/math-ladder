---
title: 二元运算与单位元
lesson_id: algebraic-structures/binary-operation
prereqs:
  - algebraic-structures/laws-preview
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - binary-operation
  - identity-element
applications:
  - state-machines
  - puzzle-solving
exits:
  - research
---

# 二元运算与单位元

## 1. 开场钩子

遥控器上有两个按钮：静音再按一次恢复原声，开关再按一次关掉灯。“按按钮”也是一种运算：两个状态合成一个新状态。

我们想问的不是按钮长什么样，而是这套操作有没有“什么都不做”的特殊元素。

## 2. 直觉解释

二元运算是一台吃两个输入、吐一个输出的机器。关键限制是封闭性：输入来自集合，输出也必须留在同一集合里。

单位元 $e$ 更安静：任何元素碰到它都不改变。

$$a*e=e*a=a.$$

加法里的 $0$、乘法里的 $1$、字符串拼接里的空串，都是不同外壳下的同一种想法。

## 3. 正式定义

设 $S$ 是非空集合。函数

$$*:S\times S\to S$$

叫 $S$ 上的二元运算。若存在 $e\in S$ 使所有 $a\in S$ 都有

$$a*e=e*a=a,$$

则称 $e$ 为运算的单位元。若左右单位元都存在且相等，单位元唯一。

注意：定义只要求输出落在 $S$ 中，并不要求交换或结合。

## 4. 分步例题

取集合 $S=\lbrace e,r\rbrace$，其中 $r$ 表示“翻转灯的开关”。定义接连按下：

1. $e*e=e$：不做加不做，仍不做；
2. $e*r=r*r=e$：翻转一次或两次的效果；
3. $r*e=r$：先翻转后不动；
4. $e$ 就是单位元。

这张表虽小，已经是后面群论的雏形。

## 5. 动手实验

```viz
{
  "type": "operation-table",
  "title": "灯开关的小运算表",
  "elements": ["e", "r"],
  "operation": "table",
  "table": [["e", "r"], ["r", "e"]],
  "highlight": ["identity", "inverses"]
}
```

先点行标题选第一个动作，再点列标题选第二个动作；中间格子会显示接龙结果。绿色对角线正好说明 $e$ 是单位元，每个元素都可逆。

```python title="检查一张运算表是否封闭并找单位元"
names = ["e", "r"]
table = [
    ["e", "r"],
    ["r", "e"]
]

closed = True
for row in table:
    for value in row:
        found = False
        for name in names:
            if name == value:
                found = True
        if found == False:
            closed = False

identity = None   # None 表示“还没有找到候选值”
for candidate_index in range(len(names)):
    good = True
    for i in range(len(names)):
        if table[i][candidate_index] != names[i]:
            good = False
        if table[candidate_index][i] != names[i]:
            good = False
    if good:
        identity = names[candidate_index]

print("closed:", closed)
print("identity:", identity)
```

第一个双重循环查封闭性；第二个循环轮流假设某个元素是单位元，并从行、列两侧验证。

## 6. 练习

```exercise
# @title: 练习：修复乘法单位元检查
# @check: closed=True
# @check: identity=1
# @hint: 集合本身已经乘法封闭；单位元必须让每个 a 左乘、右乘都保持不变。当前代码误把“结果等于 e”当成了恒等条件。
values = [-1, 0, 1]

closed = True
for a in values:
    for b in values:
        if (a * b) not in values:
            closed = False

identity = None
for e in values:
    keeps_e = True
    for a in values:
        if e * a != e:
            keeps_e = False
    if keeps_e:
        identity = e

print("closed=" + str(closed))
print("identity=" + str(identity))
```

<details>
<summary>点开查看逐步解答</summary>

集合 $\lbrace-1,0,1\rbrace$ 两两相乘仍在集合里，所以 `closed=True`。初始代码检查的是“乘完是否还等于 $e$”，这会误认 $0$，因为 $0$ 乘任何数都还是 $0$。

单位元要检查两个方向：

```python
values = [-1, 0, 1]
identity = None
for e in values:
    keeps_all = True
    for a in values:
        if a * e != a or e * a != a:
            keeps_all = False
    if keeps_all:
        identity = e

print(identity)
```

只有 $e=1$ 对每个 $a$ 都满足

$$a\cdot1=1\cdot a=a.$$

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为输出超出集合只是“特殊情况”。对二元运算来说，那叫破坏封闭性，系统直接不合格。

**误区二**：你以为单位元一定一眼可见。在自定义运算表里，它可能藏在任何位置，需要双侧验证。

**误区三**：你以为只要 $a*e=a$ 就够了。那是左单位元；完整单位元还要求 $e*a=a$。

:::

## 8. 快问快答

```quiz
一个集合上的二元运算最基本的要求是什么？
- 必须可交换
- 必须有单位元
- 任取两个集合内元素，结果仍在集合内 [*]
? 封闭性是二元运算的第一道门槛；交换律和单位元都是额外结构。
```

## 9. 选读：单位元唯一

<details>
<summary>选读 · 两行短证明</summary>

设 $e$ 和 $f$ 都是单位元。因为 $e$ 是单位元且 $f$ 在集合中，

$$e*f=f.$$

又因为 $f$ 也是单位元，

$$e*f=e.$$

所以 $f=e$。

</details>

## 10. 下一站

有了封闭运算，还可以要求结合性和逆元。三条规则合在一起，就得到本章主角：群。

→ [群的定义与非群反例](./20-groups.md)
