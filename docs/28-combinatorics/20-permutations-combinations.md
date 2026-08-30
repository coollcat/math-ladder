---
title: 排列、组合与多重集
lesson_id: combinatorics/permutations-combinations
prereqs:
  - combinatorics/count-principles
  - prob/counting
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
  - permutation-formula
  - combination-formula
  - multiset-permutation
applications:
  - lottery-odds
  - anagram-counting
exits:
  - exam
---

# 排列、组合与多重集

## 1. 从一个场景开始

班上选三人参加数学竞赛：

- 方案一：选出甲、乙、丙，分别负责代数、几何、编程——**谁干什么**很重要；
- 方案二：只宣布"这三位入选"，分工以后再议——**只认团队，不认座次**。

同样三个人，方案一要数顺序、方案二不数。数与不数之间差一个 $3! = 6$。这一课把"挑人 + 排座次"的两段式流程拆解成公式，并顺手解决一个更刁钻的问题——**字母都重复时，单词有多少种排法？**

## 2. 直觉解释

先想全排列：$n$ 个人站成一排，第一个位置 $n$ 种选择、第二个 $n-1$……连乘得 $n!$。

**排列 $P(n,k)$**：从 $n$ 人里挑 $k$ 人并安排座次 = 先挑后排的流水线：
$$n \times (n-1) \times \cdots \times (n-k+1)$$

**组合 $C(n,k)$**：只要团队不要座次。注意每个 $k$ 人团队在排列世界里被数了 $k!$ 次（队内随便怎么站都算新排列）——所以除回去即可：
$$C(n,k) = \frac{P(n,k)}{k!}$$

**多重集排列**：单词里的重复字母像同款制服——两个相同字母交换站位，外观毫无变化，却被全排列公式算成了两份。把每种字母的内部重排 $a!\, b!\, c!\dots$ 全部除掉，剩下的才是肉眼可辨的排法数。

## 3. 正式定义

| 对象 | 公式 | 场景 |
| --- | --- | --- |
| 全排列 | $n!$ | $n$ 人全站一排 |
| 排列 | $P(n,k) = \dfrac{n!}{(n-k)!}$ | 挑 $k$ 人且排序 |
| 组合 | $C(n,k) = \dfrac{n!}{k!\,(n-k)!}$ | 挑 $k$ 人不排序 |
| 多重集排列 | $\dfrac{n!}{a_1!\, a_2! \cdots a_m!}$ | $n$ 个物含 $m$ 类重复 |

两条常用恒等式（下一课杨辉三角会再次遇到它们）：对称式 $C(n,k) = C(n, n-k)$；帕斯卡递推

$$C(n,k) = C(n-1,\ k-1) + C(n-1,\ k)$$

递推的直观翻译："选了第 $n$ 号" + "没选第 $n$ 号"，两种命运瓜分全部方案——分类加法原理的一次完美亮相。

## 4. 分步例题

**例**：从 10 名志愿者中选 4 人组成宣传组，其中指定 1 人当组长（组长在选中者里产生）。共有多少种结果？

1. 选组长：10 种；
2. 从剩下 9 人中选 3 名组员（不排序）：$C(9,3) = \dfrac{9 \times 8 \times 7}{3 \times 2 \times 1} = 84$；
3. 两阶段串联用乘法：$10 \times 84 = 840$；
4. 换条路验算：先选 4 人团 $C(10,4) = 210$，团内定组长 4 种，得 $210 \times 4 = 840$ ✓。两条路线答案一致，计数无误——**换路验算是组合计数的黄金习惯**。

## 5. 动手实验

### 实验 1（viz）：排列与组合的分野现场

```viz
{
  "type": "counting",
  "title": "同一批圆点：团队 vs 座次",
  "n": 4,
  "k": 2
}
```

左半屏是组合：同一批圆点不管怎么站都只算一次；右半屏是排列：换个站位就是一条新排列，数量是左边的 $k!$ 倍。拖动滑块改 n 和 k，盯着两个数字的比值——它永远等于 $k!$。

### 实验 2（python）：用阶乘批量生产组合数

```python title="验证帕斯卡递推与对称性"
import math                       # math 库已在第 9 章介绍过 factorial

def C(n, k):
    return math.factorial(n) // (math.factorial(k) * math.factorial(n - k))
    # // 整除：组合数一定是整数，整除既准确又安全

print(C(10, 4))                   # 例题里的 210

all_ok = True                     # 打算抽查一批组合数的两条恒等式
for n in range(1, 9):
    for k in range(0, n + 1):
        if C(n, k) != C(n, n - k):            # 对称式
            all_ok = False
        if n >= 1 and 1 <= k < n and C(n, k) != C(n - 1, k - 1) + C(n - 1, k):
            all_ok = False                    # 帕斯卡递推
print(all_ok)
```

输出 `210` 与 `True`。恒等式不是背出来的——让机器扫过几百个组合数，它自然现形。

:::warning[常见误区]

**误区一**：你以为 $C(n,k)$ 与顺序无关所以任何场合都能用。若题目出现"第一名、第二名"，座次就是信息，必须乘回 $P$ 或分阶段处理。

**误区二**：你以为多重集排列照搬 $n!$ 就行。"LEVEL 有五个不同位置"是错觉——两个 L、两个 E 的互换肉眼不可见，多算了整整 $2! \times 2! = 4$ 倍。

**误区三**：你以为 $C(52,5)$ 这种大数必须先算分子再算分母会溢出。Python 的整数没有上限，但养成"边乘边除"或直接用整除的习惯，将来换语言不吃亏。
:::

## 6. 练习

```quiz
从 8 首歌里给晚会排出开场三连播（讲究先后），有几种排法？
- 56
- 336 [*]
- 512
? 顺序重要，用 P(8,3)=8×7×6=336。若只是“选三首”才是 C(8,3)=56。
```

**练习 1**：单词 MISSISSIPPI 有 11 个字母：M×1、I×4、S×4、P×2。写出多重集排列数并化简为整数。

<details>
<summary>点开查看逐步解答</summary>

$\dfrac{11!}{1!\, 4!\, 4!\, 2!} = \dfrac{39916800}{24 \times 24 \times 2} = 34650$。想象先把 11 个位置全排列，再让 4 个 I 内部互相对调、4 个 S 互相对调、两个 P 互相对调——每种内部戏法都不改变单词长相，所以要一并除掉。
</details>

**练习 2**：程序想数单词 LEVEL 的去重排列数，却少除了一个重复：

```exercise
# @title: LEVEL 有多少种站法
# @check: 30
# @hint: L 出现两次、E 也出现两次，分母要把两个 2! 都除干净。
import math

n = 5                              # 总字母数
repeat_factorial = math.factorial(2)
answer = math.factorial(n) // repeat_factorial    # ← 问题在这：只除了一个 2!
print(answer)
```

修好后输出 `30`：$120 \div (2 \times 2)$。初始版本的 60 把"L 与 E 各自内部对调"漏算了一半——重复字母每类都要交一次"外观不变税"。

## 7. 选读：圆桌排列

<details>
<summary>选读 · 转一圈不算新</summary>

$n$ 人围圆桌就座，旋转整体不改变相邻关系，因此每个座位配置被直线排列数了 $n$ 次（每人轮流坐头把交椅），圆排列数为 $n!/n = (n-1)!$。若再规定左右镜像也算同一种（手镯问题），还要除以 2。这类"模掉某种运动"的计数思想，正是卷三代数结构章群作用计数的预演。
</details>

## 8. 下一站

两类集合相交时，重叠区会被数两次。如何优雅地减回去、甚至推广到三个圈？容斥原理带着 Venn 图赶来救场。

→ [容斥原理](./30-inclusion-exclusion.md)
