---
title: 第 27 章 · 逻辑与集合
description: 用命题、谓词、关系与基数建立计算机和严格数学共享的语言。
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
---

# 逻辑与集合

本章把“真、假、包含、对应”变成可操作的结构。逻辑决定论证是否有效，集合决定讨论范围，关系和函数则把对象组织成现代数学与计算模型的基本形状。

## 学习路线

1. [命题逻辑与自然演绎](./10-propositional-deduction.md)：论证有效性、推理规则与经典谬误——第 18 章真值表的"造句篇"；
2. [谓词、量词与模型](./20-predicates-models.md)：论域与解释如何决定真假，量词否定律与反例搜索；
3. [集合运算与证明](./30-set-algebra.md)：并交补差、德摩根与双包含法，特征向量让恒等式接受机器检验；
4. [关系、等价与序](./40-relations-equivalence-order.md)：自反对称传递三体检，等价类切分世界，偏序搭起台阶；
5. [函数、单射满射与双射](./50-functions-injective-surjective.md)：三枚勋章与可逆判据，"一样多"的箭头标准；
6. [可数性与基数入门](./60-countability-cardinality.md)：希尔伯特旅馆、对角线扫描与康托尔的对角线反击。

第 18 章已教过命题、谓词、集合的基础词汇；本章是它们的深化：从"会写公式"进阶到"会判定、会构造、会证明"。

本章你会学到：

1. [命题逻辑与自然演绎](./10-propositional-deduction.md)——第 18 章你已经会写 p⇒q 这类真值表了；
2. [谓词、量词与模型](./20-predicates-models.md)——第 18 章你见过 ∀（所有）和 ∃（存在），也知道量词顺序一换含义就变；
3. [集合运算与证明](./30-set-algebra.md)——购物网站的商品筛选器是集合运算的日常马甲；
4. [关系、等价与序](./40-relations-equivalence-order.md)——同一个班级里藏着两套完全不同的"关系网"；
5. [函数、单射满射与双射](./50-functions-injective-surjective.md)——第 18 章你已经知道函数是"每个输入恰好一个出口"的箭头纪律；
6. [可数性与基数入门](./60-countability-cardinality.md)——希尔伯特旅馆有无穷多个房间，客满。

## 前置回望

卷一的代数、函数、计数与归纳提供了具体例子；本章把它们抽象成能描述算法和证明的语言。

## 交互形态

- 真值表自动生成器（已上线：truth-table）；
- 量词反例搜索盘（已上线：quantifier-hunt）；
- 关系性质检查器（已上线：relation-checker）；
- 集合运算 Venn 实验（当前用 matplotlib 圆圈图 + 特征向量实验替代）；

:::note[生产状态]

6 个规划模块已全部建成正式课并通过课程闭环校验；专属拖拽组件以已上线 viz 类型 + 浮窗实验实现。

:::

## 实战挑战 · 花瓶疑案：只有一人说真话

办公室的花瓶碎了一地，目击者把嫌疑锁定在甲、乙、丙三人中的某一个。三句话出口，案情反而更乱：

> 甲："**不是我**干的。"
> 乙："是 **丙** 干的。"
> 丙："**乙在说谎。**"

已知侦探确认：**三人中恰好只有一人说了真话**，且花瓶确为其中一人所为。

**(a)** 花瓶是谁打碎的？
**(b)** 说真话的又是谁？

别急着猜——让程序替你审讯所有可能性：

```exercise
# @title: 实战挑战：花瓶疑案
# @check: 甲
# @hint: 丙那句“乙在说谎”等价于“不是丙干的”。初始代码把丙当成了自首，方向正好弄反。
suspects = ["甲", "乙", "丙"]
for guilty in suspects:            # 枚举：轮流假设每个人是肇事者
    said_a = guilty != "甲"        # 甲的话“不是我”何时为真
    said_b = guilty == "丙"        # 乙的话“是丙干的”何时为真
    said_c = guilty == "丙"        # ← 问题在这：丙说的是“乙在说谎”，即“不是丙”
    truths = said_a + said_b + said_c   # True 按 1、False 按 0 参与求和
    if truths == 1:                # 侦探条件：恰好一人说真话
        print(guilty)
```

<details>
<summary>点开查看逐步解答</summary>

把三种假设逐一过堂（✓ 表示该句为真）：

| 假设 | 甲：“不是我” | 乙：“是丙” | 丙：“乙说谎” | 真话数 |
| --- | --- | --- | --- | --- |
| 甲干的 | ✗ | ✗ | ✓（乙确实说谎了） | **1** ✓ |
| 乙干的 | ✓ | ✗ | ✓ | 2 ✗ |
| 丙干的 | ✓ | ✓ | ✗ | 2 ✗ |

只有"甲干的"同时满足"恰好一人说真话"。所以 **(a) 肇事者是甲；(b) 说真话的是丙**。

程序化思路正是本章第 10 课的招牌动作：枚举全部赋值 → 数出真命题个数 → 用约束筛掉不合格世界。这类"真假话"题是公务员行测判断推理的经典题型（本题为情境原创表述），通法永远是**假设 + 计数**，而不是灵光一闪。

相关课程：[命题逻辑与自然演绎](./10-propositional-deduction.md)（枚举赋值判定论证）、[谓词、量词与模型](./20-predicates-models.md)（把约束写成可检验的条件）。
</details>

## 实战挑战 · 权限审计：把一章工具连成一次体检

一家小型工作室要迎接安全审计。管理员把四位同事对四个系统的权限写成了矩阵，又临时拟了三条规则。审计员不关心谁“应该有权限”，只关心三件事：规则有没有被违反？同权限的人怎么分组？四把一次性审计钥匙能否一一发完？

| 同事 | 数据库 | 构建 | 部署 | 审计 | 权限级 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 安 | 有 | 有 | 无 | 有 | 3 |
| 彬 | 有 | 无 | 无 | 有 | 1 |
| 彩 | 无 | 无 | 有 | 有 | 2 |
| 东 | 无 | 有 | 有 | 有 | 2 |

三条访问规则是：

1. 若安能用构建，则彬也能用构建；
2. 若彬能用部署，则彩不能用部署；
3. 若彩能用审计，则东也能用审计。

下面的程序已经会数违规规则、分权限组，并检查钥匙分配是不是双射；但它算“安与彬的权限对称差”时误用了“并”。修好这一处，让审计报告逐行过关：

```exercise
# @title: 权限矩阵综合审计
# @check: 权限对称差: ['构建']
# @check: 违规规则数: 1
# @check: 同权限组数: 3
# @check: 审计钥匙分配: bijection
# @hint: 对称差是“只在其中一边”：A∪B 会把两边都有的一项也留下。这里应检查两个权限位不相等。
employees = ["安", "彬", "彩", "东"]
resources = ["数据库", "构建", "部署", "审计"]
grants = [
    [1, 1, 0, 1],
    [1, 0, 0, 1],
    [0, 0, 1, 1],
    [0, 1, 1, 1],
]                                  # 行=员工，列=系统；1 表示有权访问

violations = 0
if grants[0][1] == 1 and grants[1][1] != 1:
    violations = violations + 1    # 规则 1：安有构建时，彬也必须有
if grants[1][2] == 1 and grants[2][2] != 0:
    violations = violations + 1    # 规则 2：彬有部署时，彩不能有
if grants[2][3] == 1 and grants[3][3] != 1:
    violations = violations + 1    # 规则 3：彩有审计时，东也要有

difference = []
for j in range(len(resources)):
    if grants[0][j] == 1 or grants[1][j] == 1:   # ← 问题在这：这是并集条件
        difference.append(resources[j])
print("权限对称差: " + str(difference))
print("违规规则数: " + str(violations))

levels = [3, 1, 2, 2]
groups = []
for i in range(len(employees)):
    found = -1
    for g in range(len(groups)):
        if levels[groups[g][0]] == levels[i]:
            found = g
    if found == -1:
        groups.append([i])
    else:
        groups[found].append(i)
print("同权限组数: " + str(len(groups)))

keys = [0, 1, 2, 3]
counts = [0] * len(keys)
for key in keys:
    counts[key] = counts[key] + 1
images = []
for key in keys:
    images.append(key)
injective = True
for i in range(len(images)):
    for j in range(i + 1, len(images)):
        if images[i] == images[j]:
            injective = False
surjective = True
for count in counts:
    if count == 0:
        surjective = False
print("审计钥匙分配: " + ("bijection" if injective and surjective else "function"))
```

<details>
<summary>点开查看逐步解答</summary>

- 安的权限集合是「数据库、构建、审计」，彬的是「数据库、审计」。两边都有的「数据库」「审计」被消去，对称差只剩构建，所以第一行应为 `['构建']`。
- 三条规则中只有第 1 条被违反：安确实能用数据库，而彬不能。第 2 条的前件为假，逻辑上自动通过。
- 权限级 3、1、2 把四人分成「安」「彬」「彩和东」三组；同一权限级定义的等价关系正好给出一个划分。
- 四把钥匙编号 0、1、2、3 恰好发给四人，无重复也无遗漏，所以是双射。

这道题没有引入新工具：条件句来自第 10 课，权限矩阵是第 20 课的有限模型，对称差来自第 30 课，分组依赖第 40 课的等价关系，钥匙检查使用第 50 课的双射判据。至于不断追加的日志流水，只要给每条记录配上递增序号，就能排成可数队列——第 60 课的可数性在这里留下了回声。
</details>

