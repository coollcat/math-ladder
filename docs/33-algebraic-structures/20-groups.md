---
title: 群的定义与非群反例
lesson_id: algebraic-structures/groups
prereqs:
  - algebraic-structures/binary-operation
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
  - group
  - inverse-element
applications:
  - symmetry-analysis
  - error-correcting-codes
exits:
  - research
---

# 群的定义与非群反例

## 1. 开场钩子

魔方复原靠一连串转动。有些步骤看似复杂，却总有一串反向步骤能把魔方带回起点。

“动作可接龙、顺序分组不影响结果、每个动作都能撤销”——这就是群的日常版本。

## 2. 直觉解释

群不是一群数，而是一套可逆动作系统。四个条件像安全检查：

1. 封闭：动作接动作仍是合法动作；
2. 结合：先分组还是后分组不改变结果；
3. 单位元：存在“什么都不做”；
4. 逆元：每个动作都有撤销方式。

交换律不是群的要求。穿袜子和穿鞋都能接龙、都能撤销，但顺序不能随便换。

## 3. 正式定义

设 $G$ 配有二元运算 $*$。

$$\langle G,*\rangle$$

称为群，当且仅当：

| 公理 | 写法 |
| --- | --- |
| 结合律 | $(a*b)*c=a*(b*c)$ |
| 单位元 | 存在 $e$，$a*e=e*a=a$ |
| 逆元 | 每个 $a$ 有 $a^{-1}$，$a*a^{-1}=a^{-1}*a=e$ |

若还满足 $a*b=b*a$，则称阿贝尔群。

## 4. 分步例题

检查三个候选：

1. 整数加法：逆元是相反数，是阿贝尔群；
2. 整数乘法：0 没有乘法逆元，所以全体整数不是群；
3. 正有理数乘法：单位元 1，任意 $x$ 的逆是 $1/x$，是阿贝尔群。

第三个例子中，很多数被排除了：0 不能进来，负数若进来也不违反群公理，但这套例子只选了正有理数。

## 5. 动手实验

```viz
{
  "type": "operation-table",
  "title": "模 5 加法：四个公理一起体检",
  "elements": [0, 1, 2, 3, 4],
  "operation": "(a+b) mod 5",
  "highlight": ["identity", "inverses", "commuting-pairs"],
  "selectedRow": 2,
  "selectedCol": 3
}
```

点击任意单元格选中一对输入；蓝色行和橙色列是两条可独立控制的轴。这张表的交换差异为空，0 所在行列保持原值，互逆对沿绿色对称带出现。

```python title="给模 n 加法做群体检"
n = 5
elements = [0, 1, 2, 3, 4]

def add_mod(a, b):
    return (a + b) % n

closed = True
for a in elements:
    for b in elements:
        if add_mod(a, b) not in elements:   # not in：检查结果是否跳出集合
            closed = False

associative = True
for a in elements:
    for b in elements:
        for c in elements:
            if add_mod(add_mod(a, b), c) != add_mod(a, add_mod(b, c)):
                associative = False

inverse_of_2 = None
for b in elements:
    if add_mod(2, b) == 0:
        inverse_of_2 = b

print("closed=", closed)
print("associative=", associative)
print("inverse(2)=", inverse_of_2)
```

模 5 加法把超过 4 的结果绕回圆圈。0 是单位元；2 的逆元是 3，因为 $2+3=5\equiv0$。

```quiz
下列哪一条不是群公理？
- 结合律
- 存在单位元
- 交换律 [*]
? 阿贝尔群额外要求交换律，普通群不需要。
```

## 6. 练习

```exercise
# @title: 练习：找到模 7 加法的逆元
# @check: inverse[1]=6
# @check: inverse[3]=4
# @check: inverse[5]=2
# @hint: 对每个 a 寻找 b，使 (a+b)%7==0。
n = 7
answers = {}   # 字典：把每个输入 a 和它的答案配成一对
for a in [1, 3, 5]:
    answers[a] = None   # 先占位，表示还没找到逆元

for key in answers:
    answers[key] = 0

print("inverse[1]=" + str(answers[1]))
print("inverse[3]=" + str(answers[3]))
print("inverse[5]=" + str(answers[5]))
```

<details>
<summary>点开查看逐步解答</summary>

模 7 加法中，$a$ 的逆元是 $7-a$：

$$1+6=7\equiv0,\quad3+4=7\equiv0,\quad5+2=7\equiv0.$$

所以三行分别是 6、4、2。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为所有运算都自然满足结合律。减法就不满足：$(5-3)-1\ne5-(3-1)$。

**误区二**：你以为没有交换律就没有逆元。矩阵乘法不可交换，但许多可逆矩阵仍组成群。

**误区三**：你以为 0 总该在系统里。是否包含 0 取决于运算；乘法群里 0 通常会被开除。

:::

## 8. 选读：为什么逆元唯一

<details>
<summary>选读 · 用单位元夹住答案</summary>

设 $b,c$ 都是 $a$ 的逆元。利用结合律：

$$b=b*(a*c)=(b*a)*c=e*c=c.$$

所以逆元唯一。这解释了记号 $a^{-1}$ 为什么安全。

</details>

## 9. 下一站

有些群特别守秩序：一个元素不断重复，就能生成整个系统。下一课看循环群与生成元。

→ [循环群与生成元](./25-cyclic-groups.md)
