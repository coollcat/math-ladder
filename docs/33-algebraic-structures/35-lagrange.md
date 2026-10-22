---
title: Lagrange 定理选读
lesson_id: algebraic-structures/lagrange
prereqs:
  - algebraic-structures/subgroups-order
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - coset
  - lagrange-theorem
applications:
  - finite-group-search
  - cryptography
exits:
  - research
---

# Lagrange 定理选读

## 1. 开场钩子

12 个客人要分成若干桌，每桌人数固定。若每桌都坐 5 人，无论怎样安排都会剩人。

群论给出更严格的版本：子群作为“桌子”，只能以能整除全群人数的方式摆放。

## 2. 直觉解释

取子群 $H$ 和一个元素 $g$，把 $H$ 整体平移成

$$gH=\lbrace g*h:h\in H\rbrace.$$

这叫左陪集。不同的陪集要么完全相同，要么毫无交集；每个元素恰好住进一间房，而且每间房大小都等于 $|H|$。

所以若房间数为 $[G:H]$，就有

$$|G|=[G:H]\,|H|.$$

这就是 Lagrange 定理。

## 3. 正式定义与结论

设 $H\le G$，$G$ 有限。对 $g\in G$，左陪集定义为

$$gH=\lbrace gh:h\in H\rbrace.$$

所有互不相同的左陪集把 $G$ 划分成等大的块，因此

$$|G|=[G:H]\cdot|H|,$$

其中 $[G:H]$ 是左陪集个数。特别地，子群的阶必整除群阶。

## 4. 分步例题

取模 6 加法群 $G=\lbrace0,1,2,3,4,5\rbrace$，子群 $H=\lbrace0,3\rbrace$：

1. $0+H=\lbrace0,3\rbrace$；
2. $1+H=\lbrace1,4\rbrace$；
3. $2+H=\lbrace2,5\rbrace$；
4. $3+H=\lbrace3,0\rbrace=0+H$；
5. 三间房各 2 人，总数 $3\times2=6$。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "模 6 加法的三个陪集房间",
  "left": ["0", "1", "2", "3", "4", "5"],
  "right": ["0+H", "1+H", "2+H"],
  "arrows": [[0, 0], [3, 0], [1, 1], [4, 1], [2, 2], [5, 2]]
}
```

六个人被三间等大的房间接收：$\lbrace0,3\rbrace$、$\lbrace1,4\rbrace$、$\lbrace2,5\rbrace$。没有谁被漏掉，也没有两间房重叠。

```python title="枚举陪集并检查划分"
n = 6                    # 群阶：整数 0..5 关于模 6 加法
subgroup = [0, 3]        # 子群 {0,3}：它的阶是拉格朗日定理里的除数
whole = [0, 1, 2, 3, 4, 5]   # 整个群
cosets = []              # 陪集账本：每个陪集是一个列表
covered = []             # 已经盖过戳的元素，避免重复记账

for g in whole:          # 用每个元素当代表去生成陪集
    candidate = []       # 这一次生成的候选陪集
    for h in subgroup:   # 与子群里的每个元素相加
        value = (g + h) % n   # 加完取模，保证还落在 0..5
        candidate.append(value)   # 加进候选陪集
        already = False           # 这个值盖过戳没有
        for old in covered:       # 回头看账本
            if old == value:
                already = True
        if already == False:      # 没盖过才记
            covered.append(value)
    duplicate = False    # 这个候选陪集是不是已经有同样的了
    for old_coset in cosets:   # 与已有陪集逐个比对
        same = True      # 先假定相同
        for item in old_coset:   # 逐元素核对
            found = False
            for value in candidate:   # 注意内层循环变量也叫 value，只在这个小作用域里用
                if value == item:
                    found = True
            if found == False:   # 有元素找不到 → 不是同一间房
                same = False
        if same:             # 全部对上 → 判定重复
            duplicate = True
    if duplicate == False:   # 新的才收进账本
        cosets.append(candidate)

print("cosets:", cosets)             # 逗号分隔打印：一共三间房
print("room_size:", len(subgroup))   # len 取每间房的人数 = 子群阶
print("rooms:", len(cosets))         # 房间数 = 陪集个数
print("product:", len(subgroup) * len(cosets))   # 两者相乘正好等于群阶：这就是拉格朗日定理
```

输出应为三个大小 2 的陪集，乘积回到 6。把 `subgroup` 改成 `[0,2,4]` 或 `[0]` 再跑一遍。

## 6. 练习

```exercise
# @title: 练习：补全模 7 加法的陪集数量
# @check: group_order=7
# @check: subgroup_order=1
# @check: number_of_cosets=7
# @hint: 取平凡子群 {0}。每间房只有一个人，房间数就是群阶。
n = 7            # 群阶 7：质数，所以只有平凡子群
subgroup = [1, 3]   # ← 这不是子群；题目提示应取平凡子群 {0}

group_order = n              # 群阶就是 n
subgroup_order = len(subgroup)   # 子群阶 = 元素个数
number_of_cosets = 0   # ← 还没算：按拉格朗日定理是 群阶 ÷ 子群阶

print("group_order=" + str(group_order))     # 第一行与 @check 对位
print("subgroup_order=" + str(subgroup_order))   # 第二行与 @check 对位
print("number_of_cosets=" + str(number_of_cosets))   # 第三行与 @check 对位
```

<details>
<summary>点开查看逐步解答</summary>

应先把平凡子群修正为 `[0]`。于是每个 $g$ 的陪集是

$$g+\lbrace0\rbrace=\lbrace g\rbrace.$$

七个元素各占一房，所以房间数为 7。公式给出

$$7=7\times1.$$

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为子群大小可能随便选。有限群中它必须整除群阶。

**误区二**：你以为 Lagrange 定理说每个整除数都有子群。它只保证存在子群时阶整除；反向命题一般不成立。

**误区三**：你以为陪集是子群。除自身外，普通陪集通常没有单位元，也不是子群。

:::

## 8. 快问快答

```quiz
一个 15 阶群可能有多大规模为 4 的子群吗？
- 可能，因为 4 比 15 小
- 不可能，因为 4 不整除 15 [*]
- 只有交换群才可能
? Lagrange 定理要求子群阶整除群阶；15 不能被 4 整除。
```

## 9. 选读证明

<details>
<summary>选读 · 陪集为何等大且不重叠</summary>

构造映射 $H\to gH$，$h\mapsto gh$。左乘 $g$ 可消去：若 $gh_1=gh_2$，两边左乘 $g^{-1}$ 得 $h_1=h_2$，所以大小不变。

若 $g_1H$ 与 $g_2H$ 有公共元素 $x$，可写 $x=g_1h_1=g_2h_2$。任取 $g_1h\in g_1H$：

$$g_1h=g_2h_2h_1^{-1}h\in g_2H.$$

反向同理，因此两间房重合。

</details>

## 10. 下一站

Lagrange 定理只说子群的阶必须整除群的阶，可整除成立时子群未必存在。下一课先请出一类"可以压扁群"的特殊子群——正规子群，看商群如何把大群叠成小群。

→ [正规子群与商群](./37-normal-subgroup-quotient.md)
