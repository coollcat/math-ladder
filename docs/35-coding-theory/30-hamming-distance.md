---
title: Hamming 距离
lesson_id: coding-theory/hamming-distance
prereqs:
  - coding-theory/parity-check
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - hamming-distance
  - hamming-weight
applications:
  - error-control-coding
  - dna-sequence-comparison
exits:
  - engineering
  - research
---

# Hamming 距离

## 1. 从一个场景开始

`1010` 和 `1001` 只差最后两位；`0000` 和 `1111` 差四位。若噪声一次只爱翻一两位，前者更容易混淆。Hamming 距离就是给“差几位”造一把尺子。

## 2. 直觉解释

把两个等长二进制串上下对齐，逐位比较：

```text
x = 1 0 1 1 0
y = 1 1 0 1 1
      *   *  *
```

星号的数量是 3。这个数不关心差异发生在开头还是结尾，只关心有多少个位置不同。

一个码字的**重量**是与全零串的 Hamming 距离，也就是它包含 1 的个数。两个码字的距离可以看成“差向量”的重量。

## 3. 正式定义

对等长字符串 $x,y$，它们的 **Hamming 距离**是：

$$d(x,y)=\left|\lbrace i:x_i\ne y_i\rbrace\right|.$$

它满足三条距离公理：

- $d(x,y)\ge0$，且等于 0 当且仅当 $x=y$；
- $d(x,y)=d(y,x)$；
- $d(x,z)\le d(x,y)+d(y,z)$。

第三条叫三角不等式：绕道中间点不会更近。

## 4. 分步例题

求 $x=10100$ 与 $y=01101$ 的距离。

1. 对齐：`10100` 与 `01101`；
2. 第 1 位不同，第 2 位不同，第 3 位相同，第 4 位相同，第 5 位不同；
3. 差异位置集合是 $\lbrace1,2,5\rbrace$；
4. 所以 $d(x,y)=3$。

若信道最多翻转 1 位，这两个串不会互相冒充；但若可能翻转 3 位，接收方就无法凭“距离”保证区分它们。

## 5. 动手实验

### 实验：枚举所有 3 位串的两两距离

```python title="暴力列出全部距离"
words = []
for a in [0, 1]:                 # 第一位取 0 或 1
    for b in [0, 1]:             # 第二位也取 0 或 1
        for c in [0, 1]:         # 第三位继续枚举
            words.append([a, b, c])   # append：加入一个长度为 3 的列表

def dist(x, y):
    total = 0                    # total 是差异位置的计数器
    for i in range(len(x)):      # range(len(x)) 给出每个下标
        if x[i] != y[i]:
            total = total + 1    # 累加器：旧计数加新发现
    return total

pairs = []                       # 每项形如 (x, y, distance)
for i in range(len(words)):
    for j in range(i + 1, len(words)):  # j 从 i+1 开始，避免重复配对
        pair = (tuple(words[i]), tuple(words[j]))  # tuple：不可变序列，方便显示
        d = dist(words[i], words[j])
        pairs.append(pair + (d,))   # 单元素元组必须写成 (d,)

print("words =", words)
print("pairs =", pairs)
```

把 `words` 缩小成某个码的两个代表，观察距离；再把它扩成全部 8 个串，看看同一空间里远近如何分布。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为距离是把二进制串当整数相减。`011` 和 `100` 数值相差 1，但 Hamming 距离是 3。

**误区二**：你以为重量就是长度。重量只数 1 的个数，不是位数。

**误区三**：你以为两个码字距离大就一定可靠。还要看信道一次可能翻转多少位，以及是否存在其他更近的码字。

:::

## 7. 练习

```exercise
# @title: 练习：计算 Hamming 距离和重量
# @check: d_ab=3
# @check: d_bc=1
# @check: weight_b=2
# @hint: 逐位比较；重量就是 b 中 1 的个数。
a = [1, 0, 1, 1]
b = [0, 1, 1, 0]
c = [0, 1, 0, 0]
d_ab = 4
d_bc = 4
weight_b = sum(c)

print(f"d_ab={d_ab}")
print(f"d_bc={d_bc}")
print(f"weight_b={weight_b}")
```

<details>
<summary>点开查看逐步解答</summary>

对齐比较：

```text
a = 1 0 1 1
b = 0 1 1 0
    * *   *
```

所以 $d(a,b)=3$。再看：

```text
b = 0 1 1 0
c = 0 1 0 0
        *
```

$d(b,c)=1$。$b$ 中有两个 1，所以 `weight_b=2`。

```python
d_ab = sum(x != y for x, y in zip(a, b))   # zip 把两个串按位配对，!= 得到布尔值
d_bc = sum(x != y for x, y in zip(b, c))
weight_b = sum(b)
print(f"d_ab={d_ab}")
print(f"d_bc={d_bc}")
print(f"weight_b={weight_b}")
```

</details>

## 8. 快问快答

```quiz
两个等长串的 Hamming 距离为 0，说明什么？
- 它们的数值相等
- 它们每一位都相同 [*]
- 它们都全是 0
? 距离为 0 表示没有任何差异位置；两个串可以含有任意符号，只要逐位完全一致。
```

## 9. 选读：三角不等式为什么成立

<details>
<summary>选读 · 用差向量看一遍</summary>

在模 2 世界里，$x$ 与 $y$ 的差异可写成 $x+y$（异或）。于是：

$$x+z=(x+y)+(y+z).$$

右边两个差异向量同时为 1 时会抵消成 0，所以左边差异的位置数不会超过右边两项之和。这正是三角不等式。

</details>

## 10. 下一站

有了尺子，译码就可以变成找最近邻居。下一课正式定义最近邻译码。

→ [最近邻译码](./35-nearest-neighbor-decoding.md)
