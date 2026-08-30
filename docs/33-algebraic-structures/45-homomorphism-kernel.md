---
title: 同态与核
lesson_id: algebraic-structures/homomorphism-kernel
prereqs:
  - algebraic-structures/isomorphism
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
  - homomorphism
  - kernel
applications:
  - hashing-structure
  - projection-methods
exits:
  - engineering
  - research
---

# 同态与核

## 1. 开场钩子

把精确到分钟的时钟压缩成上午、下午两格：很多分钟会被混在一起，但“时间先后相加”的规律仍然部分保留。

这种允许压扁却守规则的映射叫同态。被压到单位元的部分叫核。

## 2. 直觉解释

同构是完美翻译，同态是合格投影。它不再要求一对一，但仍要求：

$$f(a*b)=f(a)\circ f(b).$$

核收集所有被送到目标单位元的元素：

$$\ker f=\lbrace a\in G:f(a)=e_H\rbrace.$$

核越大，原系统丢掉的细节越多。

## 3. 正式定义

设 $\langle G,*\rangle$ 与 $\langle H,\circ\rangle$ 是群，映射 $f:G\to H$ 若对所有 $a,b\in G$ 满足

$$f(a*b)=f(a)\circ f(b),$$

则称 $f$ 为群同态。若 $f$ 还是双射，它就是同构。

同态把 $G$ 的单位元送到 $H$ 的单位元，并且 $f(a^{-1})=f(a)^{-1}$。

## 4. 分步例题

取 $f:\mathbb Z_6\to\mathbb Z_3$，定义 $f(x)=x\bmod3$：

1. $f(4)=1$，$f(5)=2$；
2. 左边 $f(4+5)=f(9\bmod6)=f(3)=0$；
3. 右边 $f(4)+f(5)=1+2=3\bmod3=0$；
4. 规则成立；
5. 核是 $\lbrace0,3\rbrace$，正好是 3 的倍数。

六个输入被均匀压进三个输出，每两个旧元素共用一个新身份。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "六格压成三格的同态",
  "left": ["0", "1", "2", "3", "4", "5"],
  "right": ["0", "1", "2"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 0], [4, 1], [5, 2]]
}
```

这张图故意不是单射：0 和 3 共享输出 0，1 和 4 共享输出 1。共享并不破坏同态，破坏的是“先加后取余”与“先取余后加”的一致性。

```python title="验证同态并列出核"
m = 6
target = 3

def f(x):
    return x % target

ok = True
kernel = []
for a in range(m):
    if f(a) == 0:
        kernel.append(a)
    for b in range(m):
        left = f((a + b) % m)
        right = (f(a) + f(b)) % target
        if left != right:
            ok = False

print("homomorphism:", ok)
print("kernel:", kernel)
```

36 对加法全部通过，核恰好有两个元素。

## 6. 练习

```exercise
# @title: 练习：找出模 8 到模 4 映射的核
# @check: homomorphism=True
# @check: kernel=[0, 4]
# @hint: 定义 f(x)=x%4，逐一检查 f((a+b)%8) 是否等于 (f(a)+f(b))%4。
m = 8
target = 4

def f(x):
    return x % 3

ok = True
kernel = []
for a in range(m):
    if f(a) == 0:
        kernel.append(a)
    for b in range(m):
        if f((a + b) % m) != (f(a) + f(b)) % target:
            ok = False

print("homomorphism=" + str(ok))
print("kernel=" + str(kernel))
```

<details>
<summary>点开查看逐步解答</summary>

应把函数改成：

```python
def f(x):
    return x % target
```

然后核是被 4 整除的输入：

$$\ker f=\lbrace0,4\rbrace.$$

例如 $f(5)=1$、$f(7)=3$，两者相加得 $0$；先算 $5+7=12\equiv4$ 再取余也是 $0$。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为多对一就不是好映射。同态允许压缩，只要运算顺序可以交换。

**误区二**：你以为核只是 0 一个点。满射之外的压缩会让整个子群一起落到单位元。

**误区三**：你以为核可以是任意子集。它是子群，而且决定哪些元素被视为“等价”。

:::

## 8. 快问快答

```quiz
群同态的核是什么？
- 所有输出为最大值的元素
- 所有被映射到目标单位元的元素 [*]
- 所有无法参与运算的元素
? 核度量同态压掉了哪一部分；它一定是定义域群的子群。
```

## 9. 选读：核与等价关系

<details>
<summary>选读 · 哪些元素被认成同一个</summary>

规定 $a\sim b$ 当且仅当 $f(a)=f(b)$。这自动满足自反、对称、传递。进一步可知

$$f(a)=f(b)\Longleftrightarrow ab^{-1}\in\ker f,$$

所以核像一枚印章：同一枚印章盖出的元素进入同一类。

</details>

## 10. 下一站

群管一种运算，环开始管理加减乘三种日常习惯。下一课升级到环与域。

→ [环与域](./50-rings-fields.md)
