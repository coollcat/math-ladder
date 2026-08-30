---
title: 排序下界与决策树
lesson_id: algorithms/sorting-lower-bound
prereqs:
  - algorithms/divide-and-conquer
  - combinatorics/pigeonhole
  - prob/counting
  - math-language/contradiction-counterexample
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
  - decision-tree-model
  - comparison-sort-lower-bound
  - worst-case-height
applications:
  - algorithm-limit-analysis
  - library-sort-design
exits:
  - research
  - engineering
---

# 排序下界与决策树

## 1. 从一个场景开始

归并排序 $O(n\log n)$，快排平均也是 $O(n\log n)$。总有人不服气："再优化优化，搞个 $O(n)$ 的比较排序行不行？"

这一课证明一件惊人的事：**不行**——只要你的武器只有"比较两个元素谁大"，就存在一个谁也突破不了的天花板 $\Omega(n \log n)$。而且证明不依赖任何具体算法，靠的是数一数"可能性"。

## 2. 直觉解释

把排序过程想象成一场**二十个问题游戏**：算法每次比较一对元素，相当于问一次"a 在 b 前面吗"；得到是/否的回答后继续追问。

- $n$ 个元素有 $n!$ 种可能的排列顺序，排序前哪一种都可能——游戏开始时答案空间有 $n!$ 个"嫌疑人"；
- 每次比较只回答"是/否"，最好情况也只能把嫌疑对半砍；
- 要从 $n!$ 个嫌疑人里锁定唯一的真凶，至少需要问 $\log_2(n!)$ 次。

这就是**决策树**视角：每个内部节点是一次比较、两个孩子代表两种回答，而叶子必须一一对应 $n!$ 种最终排列。树高 = 最坏情况提问次数，于是问题变成纯粹的数叶子题。

## 3. 正式定义

**比较排序的决策树**是一棵二叉树：内部节点标注一次比较 $a_i \le a_j$，两棵子树对应两种结果；每个叶节点对应一种输入排列下的完整输出顺序。算法在**某输入**上的比较次数 = 该输入沿树走到叶子的路径长度；**最坏情况**次数 = 树高 $h$。

二叉树高度 $h$ 至多容纳 $2^h$ 片叶子，而正确性要求叶子数 $\ge n!$，于是

$$2^h \ge n! \quad\Longrightarrow\quad h \ge \lceil \log_2 (n!) \rceil$$

再用阶乘增长（$\log_2 n! = \log_2 1 + \log_2 2 + \dots + \log_2 n \approx n\log_2 n$）得：任何比较排序最坏情况至少 $\Omega(n\log n)$ 次比较。

## 4. 分步例题

**例**：三个元素 $a, b, c$ 排序，最坏情况最少比几次？

1. 可能的排列共 $3! = 6$ 种；
2. 决策树需要至少 6 片叶子；高度为 2 的树最多 $4$ 片——不够；
3. 高度 3 的树最多 $8 \ge 6$ 片——够用；
4. 所以 $h \ge \lceil\log_2 6\rceil = 3$。策略确实存在：先比 $a,b$，胜者再比 $c$……三次必定位次齐全 ✓。
5. 结论：$n=3$ 时天花板恰好被贴住；$n$ 越大，$\lceil\log_2 n!\rceil$ 与归并排序的实际表现越接近。

注意第 2 步的推理方式：不构造算法也能断言极限——这是**下界证明**与上界分析的分水岭。

## 5. 动手实验

### 实验 1：上下界夹出同一条曲线

选读部分的初等论证给出 $\frac{n}{2}(\log_2 n - 1) \le \log_2 n! \le n \log_2 n$。把两条边界画出来——真曲线被夹在中间窄带里，所以同阶：

```viz
{
  "type": "plot",
  "title": "log2(n!) 的上下夹逼：上界与下界",
  "expr": "x * log(x)",
  "expr2": "(x / 2) * (log(x) - 1)",
  "xmin": 2,
  "xmax": 30,
  "sliders": []
}
```

两条边界的差只有约一半的线性项，而主项 $n\log n$ 完全一致——这就是 $\log_2 n! = \Theta(n\log n)$ 的图像版。

### 实验 2：亲手数叶子和树高

```python title="计算各规模的叶子需求与高度下限"
import math

for n in [2, 3, 4, 5, 10, 20]:
    perms = 1
    for k in range(2, n + 1):       # 连乘 2*3*...*n 得到 n!
        perms = perms * k
    height_bound = math.ceil(math.log(perms, 2))   # ceil 向上取整：叶子不够就得加高一层
    print(f"n={n:>3}  排列数 n!={perms:>25}  树高下限={height_bound}")   # >3 / >25：右对齐并撑到指定宽度，表格不歪（首见语法）
```

观察 $n=10$ 那一行：362 万种排列，但只要 22 次聪明的提问就能分辨——对半砍的指数威力。

### 实验 3：跟决策树玩猜序游戏

```python title="三元素排序的最优提问策略"
def sort3(a, b, c):
    # 手写最优决策树：最多三次比较覆盖全部 6 种排列；comps 记录实际提问数
    comps = 1                       # 第 1 问：a 和 b 谁小？
    if a <= b:
        if b <= c:                  # 第 2 问：已有序就提前收工
            return (a, b, c), comps + 1
        comps = comps + 1           # 第 2 问已问（b<=c 为否）
        if a <= c:                  # 第 3 问定乾坤
            return (a, c, b), comps + 1
        return (c, a, b), comps + 1
    if a <= c:
        return (b, a, c), comps + 1
    comps = comps + 1
    if b <= c:
        return (b, c, a), comps + 1
    return (c, b, a), comps + 1

for triple in [(1, 2, 3), (2, 1, 3), (3, 2, 1)]:
    result, used = sort3(*triple)   # * 解包：把元组拆成三个参数
    print(f"{triple} -> {result}，比较 {used} 次")
```

有的输入两次就能交卷（运气好），但最坏情况永远卡在 3 次——下界管的就是这个"永远"。

### 快问快答

```quiz
为什么非比较排序可以绕过 n log n 天花板？
- 因为它们偷偷用了更多比较次数
- 因为它们利用了键的具体取值信息，不再只靠比大小 [*]
- 因为天花板只对外国算法生效
? 计数排序、基数排序直接按值"对号入座"，不走"两两比较"这棵决策树，所以证明的前提不适用——代价是要额外空间或限定整数键。
```

:::warning[常见误区]

**误区一**："下界说明所有排序都要 $n\log n$。" 它只约束**基于比较**的模型；计数排序对小的整数键就是 $O(n+k)$。

**误区二**："平均情况和最坏情况一样受罚。" 本课证的是最坏情况；比较排序的平均下界同样存在，但要更精细的论证。

**误区三**："叶子数等于 $n!$ 就一定高效。" 叶子够了只解决可行性，路径是否均衡还看树的形状——坏 pivot 的快排正是长歪了的决策树。

:::

## 6. 练习

**练习 1**：四个元素排序，最坏情况至少几次比较？有没有可能 4 次搞定？

<details>
<summary>点开查看逐步解答</summary>

$4! = 24$ 片叶子需求；高度 4 只装 $16 < 24$ 片，不够；高度 5 装 $32 \ge 24$，所以下限是 $\lceil\log_2 24\rceil = 5$。合并排序思路可达 5 次——天花板再次被贴住。
</details>

**练习 2**：补全代码：算出 $n=4$ 的排列数与树高下限（连乘起点错了、取整方向反了都会露馅）：

```exercise
# @title: 练习：四元素的天花板
# @check: 24
# @check: 5
# @hint: n! 从 2 连乘到 n；树高是 ceil(log2(n!))——叶子不够时要往上加层。
import math

n = 4
perms = 1
for k in range(1, n):                    # ← 连乘范围不对，漏了谁又多了谁？
    perms = perms * k
height_bound = math.floor(math.log(perms, 2))   # ← 高度不够装不下所有叶子时，该向哪个方向取整？

print(perms)
print(height_bound)
```

**练习 3**：用反例思维反驳这句话："只要每次都比较当前最小和最大，就能少于 $n\log n$ 次。"

<details>
<summary>点开查看逐步解答</summary>

无论比较的对象怎么挑，每一次仍只是决策树里的一个二元分叉；$n!$ 片叶子的硬需求纹丝不动。挑对象再聪明只能改变树的形状（让某些输入提前收工），压不掉树高的对数下限——这正是决策树模型的妙处：它把"算法自由度"全部压缩进树形里统一清算。
</details>

## 7. 选读：从 log2(n!) 到 n log n 的最后一公里

<details>
<summary>选读 · 斯特林近似速览</summary>

对 $n!$ 取对数：$\log_2 n! = \sum_{k=1}^{n} \log_2 k$。每一项 $\log_2 k \le \log_2 n$ 给出上界 $n \log_2 n$；另一方面一半的项 $\ge \log_2 (n/2) = \log_2 n - 1$，给出下界约 $\frac{n}{2}(\log_2 n - 1)$——上下界同阶，故 $\log_2 n! = \Theta(n \log n)$。更精细的斯特林公式 $n! \approx \sqrt{2\pi n}\,(n/e)^n$ 还能算出差常数项 $n \log_2 e \approx 1.44 n$，解释了为什么归并排序的比较次数略低于 $\log_2 n!$ 也能成立。

</details>

## 8. 下一站

天花板之下，还有一场"查找有多快"的军备竞赛——哈希表宣称 $O(1)$。下一课看看它是拿什么付的账单。

→ [哈希、冲突与期望分析](./50-hashing-collisions.md)
