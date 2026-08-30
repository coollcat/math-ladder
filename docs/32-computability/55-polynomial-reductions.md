---
title: 多项式归约
lesson_id: computability/polynomial-reductions
prereqs:
  - computability/p-np
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - karp-reduction
applications:
  - hardness-transfer
  - algorithm-design-lower-bounds
exits:
  - engineering
  - research
---

# 多项式归约

## 1. 从一个场景开始

把课程表问题变成图着色，需要给每位老师、每间教室和每节课造点，再把冲突画成边。如果这个变形本身就要天文数字般的时间，它就帮不了我们。

多项式归约要求翻译器不但保真，还要便宜。只有这样，困难才能在可行预处理内传播。

## 2. 直觉解释

上一章的多一归约只要求翻译器可计算；现在给它加预算：

1. 输入长度为 $n$；
2. 翻译器必须在 $n$ 的某个多项式时间内完成；
3. 输出长度也不能爆炸到失控；
4. 真假方向仍要完全保持。

这类转换常称 **Karp 归约**。它像一台标准化接口机：源问题先转成目标格式，再交给目标算法。

若目标问题有多项式算法，整条流水线仍是多项式：翻译一次，求解一次。因此已知难的问题可以通过这条管道把难度传给新问题。

## 3. 正式定义

设语言 $A,B\subseteq\Sigma^*$。若存在多项式时间可计算函数 $f$ 使

$$\forall x\in\Sigma^*,\quad x\in A \Longleftrightarrow f(x)\in B$$

则记 $A\le_p B$，称为 $A$ 多项式时间多一归约到 $B$。

两个常用推论：

1. 若 $A\le_p B$ 且 $B\in P$，则 $A\in P$；
2. 若 $A\le_p B$ 且 $B\le_p C$，则 $A\le_p C$。

第一个推论来自复合成本：多项式加多项式仍是多项式。第二个来自翻译器串联。

## 4. 分步例题

例题：把“正方形识别”归约到“矩形两边相等识别”。输入是一对边长 $(a,b)$。

1. 定义翻译 $f((a,b))=(a,b)$；
2. 源问题问 $a=b$ 吗；
3. 目标问题也问两条边是否相等；
4. 翻译只需复制两个数，时间是输入长度的线性级；
5. 真例映射成真例，假例映射成假例，所以这是多项式归约。

再看一个更有信息量的模板：若要把问题 A 转到 B，先写出 A 的每个 yes 特征，再设计 B 的结构去镜像这些特征，最后分别检查 yes 和 no 两个方向。

## 5. 动手实验

### 实验 1：多项式流水线

```viz
{
  "type": "proof-trail",
  "title": "Karp 归约的成本账",
  "steps": [
    { "id": "输入", "text": "源实例长度 n" },
    { "id": "翻译", "text": "f 在 n^k 内生成目标实例" },
    { "id": "求解", "text": "B 算法在 |f(n)|^j 内回答" },
    { "id": "合成", "text": "总时间仍是多项式" }
  ],
  "edges": [["输入", "翻译"], ["翻译", "求解"], ["求解", "合成"]]
}
```

关键在于输出尺寸。若 $|f(x)|$ 本身指数膨胀，即使目标算法是多项式，读写输出也可能失去多项式预算。

### 实验 2：给翻译器计时步数

```python title="线性翻译器的步数账单"
def translate(pair):              # pair 表示源问题实例
    a, b = pair                   # 解包：右边两个值同时赋给左边两个变量
    steps = 2                     # 读入两个分量各记一步
    encoded = (a, b)              # 复制成目标实例
    steps += 2                    # 写出两个分量各记一步
    return encoded, steps

for n in [10, 100, 1000]:         # n 只是输入规模的象征
    instance, cost = translate((n, n + 1))
    print(n, instance, cost)
```

这里成本恒为 4，因为固定两个字段。真实编码器还会遍历图的点和边，成本通常形如 $a|V|+b|E|$，仍属多项式。实验的重点是把“保真”和“预算”分开记账。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为只要能写出数学对应就行。对应必须由多项式时间算法实现。

**误区二**：你以为归约必须保留所有细节。只需保留判定 yes/no 所需的信息，其他结构可以丢。

**误区三**：你以为多项式归约能证明目标问题无解。它传递相对难度；除非源问题已被证明不在 P，否则不能得到绝对下界。

:::

## 7. 练习

```exercise
# @title: 练习：把展开式翻译改成紧凑参数
# @check: 2 True
# @check: 3 False
# @hint: 目标判定条件可以是 size 为偶数；翻译只需返回 n，不要生成 n 平方个对象。
def translate(n):
    pairs = []
    for i in range(n):
        for j in range(n):
            pairs.append((i, j))   # append 把新的配对追加到列表末尾
    return pairs

def target_yes(instance):
    return len(instance) > 0

instance = translate(2)   # 先把目标实例造出来，再交给判定函数
print(instance, target_yes(instance))
instance = translate(3)
print(instance, target_yes(instance))
```

初始代码生成 $n^2$ 个元素，虽然平方仍是多项式，但它没有体现“传紧凑参数”的要求。请让 `translate` 只返回整数参数，并修改 `target_yes` 使偶数规模为真、奇数规模为假。

<details>
<summary>点开查看逐步解答</summary>

可以把 `translate` 改成直接返回 `n`，把 `target_yes` 改成 `return n % 2 == 0`。于是输入 2 输出 `2 True`，输入 3 输出 `3 False`。这个练习强调两点：第一，输出对象越紧凑，下游算法读写它的成本越可控；第二，归约的等价关系写在目标判定的语义里，而不是靠展开所有细节来证明。

</details>

## 8. 快问快答

```quiz
Karp 归约比一般多一归约多了什么限制？
- 翻译函数必须在多项式时间计算 [*]
- 源问题和目标问题必须相同
- 只允许 yes 实例参与翻译
? 新增的是资源预算；真假双向保真本来就必须成立。
```

## 9. 选读：为什么箭头方向如此命名

<details>
<summary>选读 · 相对难度排序</summary>

$A\le_p B$ 的符号模仿“小于等于”：若 B 容易，则 A 也容易，所以 A 不会比 B 更难。这个序在 NP 内部帮助我们寻找极大元。若一个 NP 语言能让所有 NP 语言都归约到它，它就是 NP 难；若它自身还在 NP，就是 NP 完全。下一课正式组装这两个定义。

</details>

## 10. 下一站

有了多项式归约，我们可以给 NP 里的问题排出相对难度。下一课定义 NP 难与 NP 完全，并解释 Cook-Levin 定理为什么是整座大厦的地基。

→ [NP 完全性](./60-np-completeness.md)
