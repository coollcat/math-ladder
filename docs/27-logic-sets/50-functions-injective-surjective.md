---
title: 函数、单射满射与双射
lesson_id: logic-sets/functions-bijective
prereqs:
  - logic-sets/relations-equivalence-order
  - math-language/sets-relations-functions
  - functions/inverse-composite
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
  - injective
  - surjective
  - bijection
  - inverse-function-criterion
applications:
  - hash-maps
  - unique-id-design
exits:
  - research
---

# 函数、单射满射与双射

## 1. 从一个场景开始

第 18 章你已经知道函数是"每个输入恰好一个出口"的箭头纪律。但酒店前台关心的更具体：

- 客人（输入）→ 房间（输出）：每个客人必须有且只有一个房间——这是函数纪律；
- 经理还想保证**不同客人不拼房**——这是单射；
- 店长盯着报表叹气：**没有一间房空着**——这是满射；
- 两件事都做到、客人与房间一一配对，那么"凭房号反查客人"的登记表就能建立——这就是双射带来的**可逆**。

三枚勋章，三种管理强度。本课把它们逐一验明正身。

## 2. 直觉解释

把箭头图画出来，三枚勋章各有肉眼标准：

- **单射**（injective）：箭头不许"会师"——两个箭头永不指向同一个靶子。水平线检验的离散版；
- **满射**（surjective）：右列全员中弹——靶场上没有一个靶子被漏掉；
- **双射**（bijective）：完美舞会——左队每人牵手一位右队来宾，无人落单、无人争抢。

有限集合上还有一条铁律：从 $n$ 人到 $m$ 靶要单射，必须 $n \le m$；要满射必须 $n \ge m$。想两者兼得？人数必须分毫不差。这条"数人头"逻辑正是下一章鸽笼原理的心跳。

## 3. 正式定义

设 $f : A \to B$。

| 勋章 | 定义 | 等价说法 |
| --- | --- | --- |
| 单射 | $a_1 \ne a_2 \Rightarrow f(a_1) \ne f(a_2)$ | 逆否形式：$f(a_1)=f(a_2) \Rightarrow a_1=a_2$ |
| 满射 | $\forall b \in B,\ \exists a,\ f(a)=b$ | 像 $f(A)$ 铺满整个 $B$ |
| 双射 | 单射且满射 | 每个 $b$ 恰有**一个**原像 |

**可逆判据**：$f$ 存在逆函数 $g : B \to A$（即 $g(f(a)) = a$ 对一切 $a$ 成立）当且仅当 $f$ 是双射。单射保证反查不撞车，满射保证反查处处可用——两枚勋章缺一不可。

## 4. 分步例题

设 $A = \lbrace 1,2,3\rbrace$（客人），$B = \lbrace a, b\rbrace$（标间）。

1. 枚举全部函数：每人二选一，共 $2^3 = 8$ 种指派方案；
2. 检查单射：三个客人抢两个房间，必有两人同房（抽屉！），单射数 = **0**；
3. 检查满射：只有"全睡 a"和"全睡 b"两种方案会让某间房空着，其余 $8 - 2 = 6$ 种都是满射；
4. 双射数 = 0（人数对不上）。若换成 $A' = \lbrace 1,2\rbrace$，则双射恰好 $2! = 2$ 种——人数相等时，双射就是"全排列"的另一种说法。

## 5. 动手实验

### 实验 1（viz）：亲手拆装一枚双射

```viz
{
  "type": "set-mapper",
  "title": "四位客人 vs 四个房间",
  "left": ["客1", "客2", "客3", "客4"],
  "right": ["101", "102", "103", "104"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

当前是教科书式双射。先点掉客4通往 104 的箭头，再让它指向 101：两位客人挤同一间房，结论栏显示普通函数——不重复的资格丢了，函数资格还在；此时再删去任意一支箭头（某位客人两手空空），才会降级为一般关系（还不是函数）。恢复按钮随时待命。

### 实验 2（python）：枚举所有函数并分类统计

```python title="穷举 3 人 → 2 房的全部 8 种指派"
guests = 3
rooms = 2

total_functions = 0     # 计数器：函数总数
surjections = 0         # 满射计数
injections = 0          # 单射计数
for code in range(rooms ** guests):        # rooms**guests = 2^3 = 8 种编码
    assignment = []                        # 解码：把编号拆成每人的选择
    remaining = code
    for g in range(guests):
        choice = remaining % rooms         # 取余：末位房间号
        assignment.append(choice)
        remaining = remaining // rooms     # 整除：砍掉已读的末位
    total_functions = total_functions + 1

    covers = [0, 0]                        # 每间房被住次数
    for r in assignment:
        covers[r] = covers[r] + 1
    is_surj = (covers[0] > 0) and (covers[1] > 0)
    if is_surj:
        surjections = surjections + 1

    distinct = True                        # 单射检查：两两互不相同？
    for i in range(guests):
        for j in range(i + 1, guests):
            if assignment[i] == assignment[j]:
                distinct = False
    if distinct:
        injections = injections + 1

print(total_functions)
print(injections)
print(surjections)
```

输出 `8`、`0`、`6`，与例题的手算完全吻合。把 `guests` 改成 `2` 再跑：总数 4、单射 2、满射 2、双射 2——方才那句"人数相等时双射=全排列"当场兑现。

:::warning[常见误区]

**误区一**：你以为单射就是"每个输入有不同的输出值"，于是 $f(x)=x^2$ 在实数上是单射。其实 $f(-2)=f(2)=4$ 已经撞车；判断单射要看**整个定义域**，不能只看一段。

**误区二**：你以为满射由公式自己决定。满射永远相对陪域而言：$x^2$ 从 $\mathbb{R}$ 到 $[0, +\infty)$ 是满射，到 $\mathbb{R}$ 就不是——换陪域等于换考卷。

**误区三**：你以为逆函数就是把符号反过来写。只有双射才有全局逆；$x^2$ 的"平方根"在实数上不得不挑正半边，正是因为原函数不是单射，反查表本身就有歧义。

:::

## 6. 练习

```quiz
从 5 元素集合到 4 元素集合的单射存在吗？
- 存在，只要安排得当
- 不存在：5 个输入抢 4 个输出必撞车 [*]
- 无法确定，取决于具体函数
? 抽屉原理的雏形：输入多于输出时单射必然失败。下一章把它正式化。
```

**练习 1**：判断 $f(n) = n+1$（自然数集到自身）是单射还是满射，并说明它为什么没有逆函数。

<details>
<summary>点开查看逐步解答</summary>

单射：$n_1 + 1 = n_2 + 1$ 强制 $n_1 = n_2$ ✓。满射：$0$ 没有任何原像（$n+1 \ge 1$）✗。差一个 $0$，满射告吹；反查表对 $0$ 无解，逆函数无法定义。这个例子说明：单射只差一步到双射，而那一步可能永远跨不过去。
</details>

**练习 2**：分类器已经能识别双射，但它检查单射时偷懒只比了相邻项。补成完整的两两比较：

```exercise
# @title: 修好单射检查器
# @check: function
# @hint: 初始代码只比相邻两项，抓不住“隔着人撞车”。需要双重循环比较所有 i<j 的对。
left_size = 4
right_size = 4
arrows = [[0, 0], [1, 1], [2, 0], [3, 2]]

counts = [0] * left_size            # [0]*4：复制四个零当计数器
for a in arrows:
    counts[a[0]] = counts[a[0]] + 1
is_function = True
for c in counts:
    if c != 1:
        is_function = False

images = []
for a in arrows:
    images.append(a[1])             # 收集每支箭头的靶子

injective = True
for i in range(len(images) - 1):
    if images[i] == images[i + 1]:  # ← 问题在这：只比了相邻两项
        injective = False

covered = [0] * right_size
for img in images:
    covered[img] = covered[img] + 1
surjective = True
for c in covered:
    if c == 0:
        surjective = False

if not is_function:
    print("relation")
elif injective and surjective:
    print("bijection")
elif injective:
    print("injective")
elif surjective:
    print("surjective")
else:
    print("function")
```

修好后输出 `function`：客 1 与客 3 隔着客 2 共用 101 号房，相邻检查完全失明。数据里靶子 103 无人认领，满射也不成立——普通函数，仅此而已。

## 7. 选读：复合运算保持勋章

<details>
<summary>选读 · 勋章的代数</summary>

设 $f : A \to B$，$g : B \to C$。两条短链合成一条长链 $g \circ f$ 时：两个单射合成单射（各自不撞车，接力也不会撞）；两个满射合成满射（各层全覆盖，串联后仍全覆盖）；两个双射合成双射，且 $(g\circ f)^{-1} = f^{-1} \circ g^{-1}$——脱衣服顺序要倒过来。但注意"一好一坏"不给保证：$g$ 是单射推不出 $g\circ f$ 是单射，短板决定上限。
</details>

## 8. 下一站

"一样多 = 存在双射"这句口号对无限集合将爆出惊雷：偶数竟然和全体整数一样多。下一课请希尔伯特旅馆的老板亲自接待无穷位客人。

→ [可数性与基数入门](./60-countability-cardinality.md)
