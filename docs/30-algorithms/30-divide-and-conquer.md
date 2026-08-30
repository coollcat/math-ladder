---
title: 分治与主定理直觉
lesson_id: algorithms/divide-and-conquer
prereqs:
  - algorithms/asymptotic-growth
  - algorithms/loop-invariants
  - exponents/log
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
  - divide-and-conquer
  - recurrence-relation-runtime
  - master-theorem-intuition
applications:
  - merge-sort
  - binary-search
exits:
  - engineering
  - research
---

# 分治与主定理直觉

## 1. 从一个场景开始

要在 1024 张乱牌里找最大的一张，两两比较要 1023 次。换个思路：把牌分成两摞各 512 张，分别找最大再比一次——问题瞬间减半。"切一半、各自解决、合并结果"，这就是分治。

有序的名单还能更省：翻字典找「数学」不用从 A 页开始——直接翻中间，比一次就当场淘汰一半。**二分搜索**是分治的极简版：切一半之后只需解决**一半**（另一半出局），递推式从 $T(n) = 2T(n/2) + n$ 缩成 $T(n) = T(n/2) + 1$；百万人的名单七步定位（$2^{20}$ 已超过一百万）——对数的登场方式，就是这么朴素。

但分治到底省了多少？把"切一半"翻译成递推式，再用**递归树**把它算穿——本课的主角主定理就是这台计算器的说明书。

## 2. 直觉解释

分治算法的运行时间满足**递推式**。以归并排序为例：

- 把 $n$ 个元素切成两半：两半各需 $T(n/2)$；
- 合并两个有序半段需要逐个过一遍：约 $n$ 步；
- 于是 $T(n) = 2T(n/2) + n$。

画成**递归树**看总账：

```text
第0层        n              ← 合并代价 n
           /   \
第1层    n/2    n/2          ← 合并代价 n/2 + n/2 = n
        / \     / \
第2层 n/4 n/4 n/4 n/4        ← 又是合计 n
...（每层合计都是 n）
```

每层合并代价加起来恒为 $n$；树高是"对折到 1"的次数 $\log_2 n$。总代价 = 层数 × 每层 ≈ $n \log_2 n$。二分查找没有合并步骤（$T(n) = T(n/2) + 1$），每层只有常数，所以总共 $O(\log n)$。

## 3. 正式定义

形如

$$T(n) = a\, T(n/b) + f(n)$$

的递推式描述"切成 $a$ 份、每份大小 $n/b$、合并花 $f(n)$"的分治算法（$n=b^m$ 时有干净解）。**主定理直觉版**比较两股力量：

- 树顶的活：$f(n)$（根节点自己干的合并工作）；
- 树叶的活：$n^{\log_b a}$（底层所有小任务的总产能）。

| 谁占上风 | 结论 | 记忆口诀 |
| --- | --- | --- |
| 叶子重 | $T(n) = \Theta(n^{\log_b a})$ | 活都压在底层 |
| 两边同阶 | $T(n) = \Theta(f(n)\log n)$ | 每层均摊一层 $\log$ |
| 根重（多项式级更重） | $T(n) = \Theta(f(n))$ | 根部一口吞 |

归并排序 $a=2, b=2$：$n^{\log_2 2} = n$ 与 $f(n)=n$ 同阶 → 第二行 → $\Theta(n\log n)$。二分查找 $a=1,b=2,f=1$：叶子 $n^0=1$ 同阶 → $\Theta(\log n)$。

## 4. 分步例题

**例**：用递归树手算 $T(n) = 2T(n/2) + n$，$n=8$。

1. 第 0 层合并代价 $8$；分成 2 份进入第 1 层；
2. 第 1 层两个子问题各付 $4$，合计 $8$；
3. 第 2 层四个子问题各付 $2$，合计 $8$；
4. 第 3 层是八个规模为 1 的叶子。本题边界取 $T(1)=0$，叶子不再付合并代价，所以这层加 $0$；
5. 有合并代价的共 $\log_2 8=3$ 层，总代价 $8\times3=24$，正好等于 $n\log_2 n$；
6. 对照主定理：$n^{\log_2 2}=n$ 与 $f=n$ 同阶，第二行给 $\Theta(n\log n)$ ✓。

**例 2**：$T(n) = 4T(n/2) + n$。叶子产能 $n^{\log_2 4} = n^2$ 压过根的 $n$ → 第一行 → $\Theta(n^2)$：切得越碎、子问题越多，底层反而成为大头。

## 5. 动手实验

### 实验 1：拖动分支数，看谁在买单

蓝实线是主定理第一行的叶子总产能 $x^{\log_b a}$（随下面两个滑杆变）；橙色虚线是每层的合并代价 $f(n)=x$（归并型递归的标志）。拖动滑块调 $a$ 和 $b$，直接比较两股力量的量级：

```viz
{
  "type": "plot",
  "title": "叶子产能 x^(log_b a)：b 越大产能越低",
  "expr": "x ^ (log(a) / log(b))",
  "expr2": "x",
  "xmin": 1,
  "xmax": 64,
  "sliders": [
    { "name": "a", "min": 2, "max": 9, "step": 1, "value": 4 },
    { "name": "b", "min": 2, "max": 9, "step": 1, "value": 2 }
  ]
}
```

保持 $b=2$ 把 $a$ 从 2 拨到 4：曲线从贴着直线蹿到平方量级——多一个分支，底层就要多养一倍的子孙。

### 实验 2：实测归并排序 vs 冒泡排序的比较次数

```python title="数一数两种排序的比较次数"
import math
import random

def merge_sort_count(arr):          # 返回 (排好序的数组, 比较次数)
    if len(arr) <= 1:               # 递归出口：0 或 1 个元素天然有序
        return arr, 0
    mid = len(arr) // 2             # // 整除取中点：切一半
    left, c1 = merge_sort_count(arr[:mid])   # 切片 [mid:] 取后半段
    right, c2 = merge_sort_count(arr[mid:])
    merged = []
    i = j = 0
    comps = 0
    while i < len(left) and j < len(right):
        comps = comps + 1
        if left[i] <= right[j]:     # <= 保证稳定性：相等时左边先走
            merged.append(left[i])
            i = i + 1
        else:
            merged.append(right[j])
            j = j + 1
    merged = merged + left[i:] + right[j:]   # 收尾：某一边剩下的直接接上
    return merged, c1 + c2 + comps

def bubble_count(arr):              # 冒泡排序：相邻比较、逐轮冒泡
    arr = arr.copy()
    comps = 0
    for i in range(len(arr)):
        for j in range(len(arr) - 1 - i):
            comps = comps + 1
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]   # 多变量赋值交换两个元素
    return arr, comps

data = [random.randint(0, 999) for _ in range(64)]   # 列表推导式批量造 64 个随机数

_, m_comps = merge_sort_count(data)
_, b_comps = bubble_count(data)
print(f"64 个元素：归并 {m_comps} 次 vs 冒泡 {b_comps} 次比较")
print(f"理论主干：n*log2(n)={64 * math.log(64, 2):.0f}，n^2/2={64 * 64 // 2}")
```

归并的比较次数稳稳贴着 $n\log_2 n$ 的理论线，冒泡则死死锁在 $n^2$ 附近。把 64 改成 256 再跑：差距从几倍拉大到十几倍——增长率在兑现承诺。

### 快问快答

```quiz
分治 T(n) = 2T(n/2) + n 的递归树一共有多少层？
- n 层，每个元素一层
- log2(n) 层，对折到 1 为止 [*]
- 2 层，切一次就完
? 大小 n 的子问题每往下一层规模减半，减到 1 需要 log2(n) 次——层数就是对折次数。
```

:::warning[常见误区]

**误区一**："分治一定更快。" 若合并代价太高（比如每次合并要全表重扫好几遍），递归开销反而拖慢；主定理第三行就是警告。

**误区二**："子问题必须严格一半。" 二分查找只留一半（丢弃另一半）照样是分治家族成员；关键是**规模递减**而非对称。

**误区三**："递归树数层数就够了。" 还要问每层合计多少。层数 $\log n$ × 每层 $n$ 才是 $n\log n$ 的完整来历，漏乘一层账就错。

:::

## 6. 练习

**练习 1**：口头回答：$T(n) = 3T(n/3) + n$ 属于主定理哪一行？答案是多少？

<details>
<summary>点开查看逐步解答</summary>

$a=3,b=3$：叶子产能 $n^{\log_3 3} = n^1 = n$，与 $f(n)=n$ 同阶 → 第二行 → $\Theta(n\log n)$。有趣的是每层合计仍是 $n$（3 个 $n/3$），和归并同款。
</details>

**练习 2**：补齐代码，让 $n=16$ 的分治账目正确输出（从 16 对折到 1、每层合计为 $n$）：

```exercise
# @title: 练习：分治账目计算器
# @check: 4
# @check: 64
# @hint: 深度是"16 对折到 1"的次数，math.log(n, 2) 正好整数；每层合并合计恰好 n，总账 = 深度 × n。
import math

n = 16
levels = math.floor(math.log(n, 2)) + 1   # ← 多加的这个 1 把不干活的叶子层也算成了工作层
per_level = n // 2                    # ← 每层所有子任务的合并代价合计是多少？
total = levels * per_level

print(levels)
print(total)
```

**练习 3**：二分查找 $T(n) = T(n/2) + 2$（一次中点比较加一点杂务），用主定理判断量级。

<details>
<summary>点开查看逐步解答</summary>

$a=1, b=2$，叶子产能 $n^{\log_2 1} = 1$，与 $f(n)=2$ 同阶（都是常数）→ 第二行给 $\Theta(f \cdot \log n) = \Theta(\log n)$。杂务常数 2 只影响常数因子。
</details>

## 7. 选读：主定理为什么成立（第三行为何要求"多项式级更重"）

<details>
<summary>选读 · 三种力量的平衡术</summary>

递归树总账 = 各层代价之和。设叶子产能 $w = n^{\log_b a}$。几何直觉：若 $f(n)$ 比 $w$ 小得多（第一行），总和被等比增长的底层主导，像存款靠复利后期；若两者同阶（第二行），每层贡献近似相同，共 $\log n$ 层故乘上 $\log$；若 $f$ 比 $w$ 大得多且差距至少是 $n^\epsilon$ 级别（第三行的正则条件），顶部一层独大、下层按公比小于 1 的等比数列衰减，总和由根部决定。第三行要求"多项式级更重"正是为了排除 $f(n) = n/\log n$ 这类贴得太近的函数——它们差之毫厘却让等比衰减失效，属于主定理管不到的地带（可用递归树硬算或 Akra-Bazzi 方法兜底）。

</details>

## 8. 下一站

递归树把账算清了，也暴露了它的软肋：子问题一旦重叠，同一个格子会被从头重算千万遍。下一课看看一张表格如何把指数账单砍回线性。

→ [动态规划：从递推到记忆化](./35-dynamic-programming.md)
