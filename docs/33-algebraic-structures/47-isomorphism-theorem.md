---
title: 群同态基本定理
lesson_id: algebraic-structures/isomorphism-theorem
prereqs:
  - algebraic-structures/homomorphism-kernel
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
  - first-isomorphism-theorem
applications:
  - structure-analysis
  - modular-arithmetic
exits:
  - engineering
  - research
---

# 群同态基本定理

## 1. 从一个场景开始

上一课学到正规子群可以把群"压扁"成商群。上上一课学到同态也是一种压扁。这两种压扁是同一件事吗？

群同态基本定理给出了响亮的回答：**是的，每一种同态压扁都精确对应一个商群。**

## 2. 直觉解释

同态 $f:G\to H$ 把 $G$ 的元素映到 $H$。核 $\ker f$ 收集所有被压到单位元的元素，像是一个"压缩袋"。

把 $G$ 的元素按核分组：两个元素在同一组当且仅当它们的像相同。这些组正好是 $\ker f$ 的陪集。商群 $G/\ker f$ 就是这些组构成的新群。

基本定理说：这个新群和 $f$ 的像（$H$ 中被 $f$ 覆盖的部分）长得一模一样。

## 3. 正式定义

**第一同构定理**：设 $f:G\to H$ 是群同态，则

$$G/\ker f \cong \operatorname{im} f$$

其中 $\operatorname{im}f=\lbrace f(g):g\in G\rbrace$ 是 $f$ 的像。

同构映射 $\bar{f}:G/\ker f\to\operatorname{im}f$ 定义为

$$\bar{f}(g\ker f)=f(g).$$

| 符号 | 含义 |
| --- | --- |
| $\ker f$ | 同态的核：$\lbrace g\in G:f(g)=e_H\rbrace$ |
| $\operatorname{im} f$ | 同态的像：$\lbrace f(g):g\in G\rbrace$ |
| $G/\ker f$ | $G$ 模核的商群 |
| $\bar{f}$ | 诱导的同构映射 |

## 4. 分步例题

**例**：$f:\mathbb{Z}\to\mathbb{Z}_6$，$f(x)=x\bmod 6$。

1. $f$ 是同态：$f(a+b)=(a+b)\bmod 6=(a\bmod 6+b\bmod 6)\bmod 6=f(a)+f(b)$；
2. $\ker f=\lbrace x\in\mathbb{Z}:x\bmod 6=0\rbrace=6\mathbb{Z}$；
3. $\operatorname{im}f=\lbrace 0,1,2,3,4,5\rbrace=\mathbb{Z}_6$（$f$ 是满射）；
4. 第一同构定理：$\mathbb{Z}/6\mathbb{Z}\cong\mathbb{Z}_6$；
5. 验证：$\bar{f}(3+6\mathbb{Z})=f(3)=3$，$\bar{f}(9+6\mathbb{Z})=f(9)=3$，同一个陪集映到同一个值。

**例**：$f:\mathbb{Z}_8\to\mathbb{Z}_4$，$f(x)=x\bmod 4$。

1. 验证同态：$f((a+b)\bmod 8)=(a+b)\bmod 4$，$f(a)+f(b)=(a\bmod 4+b\bmod 4)\bmod 4$，相等；
2. $\ker f=\lbrace 0,4\rbrace$；
3. $\operatorname{im}f=\lbrace 0,1,2,3\rbrace=\mathbb{Z}_4$；
4. $\mathbb{Z}_8/\lbrace 0,4\rbrace\cong\mathbb{Z}_4$。

## 5. 动手实验

### 实验 1（python）：验证第一同构定理

```python title="Z_12 → Z_4 的同态与商群"
n = 12
target = 4

def f(x):
    return x % target

# 找核
kernel = [x for x in range(n) if f(x) == 0]  # 列表推导：筛选满足条件的元素
print(f"核 ker f = {kernel}")

# 找像
image = sorted(set(f(x) for x in range(n)))  # set 去重
print(f"像 im f = {image}")

# 构造商群 Z_12 / ker f
cosets = {}
for x in range(n):
    rep = min(c for c in range(n) if c % len(kernel) == x % len(kernel))  # 选最小代表元
    coset_key = frozenset((x + k) % n for k in kernel)  # 陪集
    if coset_key not in cosets:
        cosets[coset_key] = f(rep)

print(f"商群元素数: {len(cosets)}")
print(f"像的元素数: {len(image)}")
print(f"同构? {len(cosets) == len(image)}")
```

商群大小等于像的大小——这是同构的必要条件。

### 实验 2（python）：验证映射是同构

```python title="逐一验证 bar{f} 保运算"
n = 8
target = 4

def f(x):
    return x % target

kernel = [x for x in range(n) if f(x) == 0]

def coset_rep(x):
    """返回 x 所在陪集的最小代表元"""
    coset = frozenset((x + k) % n for k in kernel)
    return min(coset)

# 验证 bar{f}(aK * bK) = bar{f}(aK) + bar{f}(bK)
ok = True
for a in range(n):
    for b in range(n):
        # 左边：先运算再映射
        left = f((a + b) % n)
        # 右边：先映射再运算（在像中）
        right = (f(a) + f(b)) % target
        if left != right:
            ok = False

print(f"同态性质验证: {ok}")
print(f"核: {kernel}")
print(f"陪集代表: {[coset_rep(x) for x in range(n)]}")
```

所有 64 对加法都通过，确认同态性。

### 实验 3（viz）：同态的分解图

```viz
{
  "type": "set-mapper",
  "title": "Z_8 → Z_4：核 {0,4} 把 8 个元素压成 4 个",
  "left": ["0", "1", "2", "3", "4", "5", "6", "7"],
  "right": ["0", "1", "2", "3"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3], [4, 0], [5, 1], [6, 2], [7, 3]]
}
```

0 和 4 共享输出 0（核的成员），1 和 5 共享输出 1，以此类推。每一对就是一个陪集。

:::warning[常见误区]

**你以为同态基本定理只是存在性结果。** 其实它给出了**显式的同构映射** $\bar{f}(g\ker f)=f(g)$，不只是说"存在某个同构"。

**你以为商群 $G/\ker f$ 的元素是单个元素。** 其实元素是陪集 $g\ker f$，同构映射把整个陪集送到 $f(g)$。

**你以为核越大信息丢失越多。** 确实如此，但基本定理精确量化了：丢失的部分恰好是核，保留的部分恰好是像。

:::

## 6. 练习

```exercise
# @title: 练习：用第一同构定理求 Z_12/{0,6} ≅ ?
# @check: kernel=[0, 6]
# @check: image=[0, 1, 2, 3, 4, 5]
# @check: quotient_size=6
# @hint: 定义 f(x)=x%6，找出核和像，验证 |商群|=|像|
n = 12

def f(x):
    return x % 8  # ← 这里有问题

kernel = [x for x in range(n) if f(x) == 0]
image = sorted(set(f(x) for x in range(n)))
quotient_size = n // len(kernel) if len(kernel) > 0 else 0

print(f"kernel={kernel}")
print(f"image={image}")
print(f"quotient_size={quotient_size}")
```

```quiz
第一同构定理的核心等式是什么？
- G ≅ H
- G/ker(f) ≅ im(f) [*]
- ker(f) ≅ im(f)
? 第一同构定理：G/ker(f) ≅ im(f)。商群与像同构，不是核与像同构。
```

```quiz
同态 f: G→H 的核 ker f 一定是 G 的什么？
- 正规子群 [*]
- 任意子集
- H 的子群
? ker f 是 G 的正规子群。这是因为对任意 g∈G 和 k∈ker f，有 f(gkg⁻¹)=f(g)f(k)f(g)⁻¹=f(g)e·f(g)⁻¹=e，所以 gkg⁻¹∈ker f。
```

## 7. 选读：第二、第三同构定理

<details>
<summary>选读 · 同构三兄弟</summary>

第一同构定理之外还有两个：

**第二同构定理**（钻石定理）：若 $H\le G$ 且 $N\trianglelefteq G$，则 $HN/N\cong H/(H\cap N)$。

**第三同构定理**：若 $N\trianglelefteq G$ 且 $N\le M\le G$，则 $(G/N)/(M/N)\cong G/M$。

第三定理的直觉：先用 $N$ 压一次，再用 $M/N$ 压一次，等价于直接用 $M$ 压一次。三层压缩可以合并为两层。

</details>

## 8. 下一站

群只管一种运算。现实中的代数结构常常同时有加法和乘法——下一课进入环与域的世界。

→ [环与域](./50-rings-fields.md)
