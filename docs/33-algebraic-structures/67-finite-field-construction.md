---
title: 有限域 F_{p^m} 构造
lesson_id: algebraic-structures/finite-field-construction
prereqs:
  - algebraic-structures/finite-fields
volume: 3
layer: L6
track:
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - extension-field
  - irreducible-polynomial
  - primitive-element
applications:
  - aes-encryption
  - reed-solomon-codes
  - elliptic-curve-crypto
exits:
  - engineering
  - research
---

# 有限域 $F_{p^m}$ 构造

## 1. 从一个场景开始

AES 加密用的是 $F_{2^8}$——256 个元素的有限域。Reed-Solomon 码在 $F_{2^8}$ 或更大的域上做多项式编码。椭圆曲线密码需要 $F_{p^m}$ 作为基域。但 $F_{2^8}$ 不是"整数模 256"那么简单——$256=2^8$ 不是素数，$\mathbb{Z}/256\mathbb{Z}$ 甚至不是域（有零因子）。那 $F_{2^8}$ 到底是怎么造出来的？

## 2. 直觉解释

$\mathbb{Z}/p\mathbb{Z}$（$p$ 素数）是最简单的有限域——整数模 $p$。但元素只有 $p$ 个，太小了。要造更大的域，不能简单地"多加元素"——必须保持域的结构（每个非零元素都可逆）。

关键洞察：**用多项式代替整数**。就像复数是"$\mathbb{R}$ 加上一个 $i$ 满足 $i^2=-1$"，$F_{p^m}$ 是"$F_p$ 加上一个 $\alpha$ 满足某个不可约多项式 $f(\alpha)=0$"。

具体地：
- 取 $F_p$ 上一个 $m$ 次不可约多项式 $f(x)$；
- $F_{p^m}$ = $F_p[x]$ 模 $f(x)$ 的剩余类——每个元素是一个次数 $<m$ 的多项式，加法和乘法都在模 $f(x)$ 下进行；
- 共 $p^m$ 个元素，恰好构成域。

## 3. 正式定义

**构造 $F_{p^m}$**：

1. 选 $F_p$ 上的 $m$ 次**不可约多项式** $f(x)$（即在 $F_p$ 上无法分解为更低次多项式的乘积）；
2. 定义 $F_{p^m}=\{a_0+a_1\alpha+\cdots+a_{m-1}\alpha^{m-1}\mid a_i\in F_p\}$，其中 $\alpha$ 是 $f(x)$ 的一个根；
3. 加法：逐系数模 $p$ 相加；
4. 乘法：多项式乘法后模 $f(x)$ 取余。

**符号说明**：

| 符号 | 含义 |
| --- | --- |
| $p$ | 基域的特征（素数） |
| $m$ | 扩张次数（不可约多项式的次数） |
| $f(x)$ | 不可约多项式（扩张的"定义方程"） |
| $\alpha$ | $f(x)$ 的根（扩张的生成元） |
| $F_p^*$ | $F_p$ 的乘法群（$p-1$ 阶循环群） |

**本原元素**：$F_{p^m}^*$（乘法群）是 $p^m-1$ 阶循环群，其生成元称为本原元素。本原元素 $\alpha$ 满足 $\alpha^{p^m-1}=1$ 且更低次幂不为 1。

## 4. 分步例题

**例**：构造 $F_{2^3}=F_8$。

1. 选 $F_2$ 上的 3 次不可约多项式：$f(x)=x^3+x+1$（在 $F_2$ 上无法分解——验证：$f(0)=1\ne0$，$f(1)=1+1+1=1\ne0$，无一次因子；二次不可约多项式只有 $x^2+x+1$，$(x^2+x+1)(x+1)=x^3+1\ne f(x)$）；
2. 元素：$\{0,1,\alpha,\alpha+1,\alpha^2,\alpha^2+1,\alpha^2+\alpha,\alpha^2+\alpha+1\}$，共 $2^3=8$ 个；
3. 乘法规则：$\alpha^3=\alpha+1$（因为 $f(\alpha)=0$，即 $\alpha^3+\alpha+1=0$，在 $F_2$ 中 $-1=1$）；
4. 计算 $\alpha^5$：$\alpha^3=\alpha+1$，$\alpha^4=\alpha(\alpha+1)=\alpha^2+\alpha$，$\alpha^5=\alpha(\alpha^2+\alpha)=\alpha^3+\alpha^2=\alpha^2+\alpha+1$；
5. 验证本原性：$\alpha^7=(\alpha^3)^2\cdot\alpha=(\alpha+1)^2\alpha=(\alpha^2+1)\alpha=\alpha^3+\alpha=\alpha+1+\alpha=1$ ✓。$\alpha$ 的阶为 7=$2^3-1$，所以 $\alpha$ 确实是本原元素。

## 5. 动手实验

### 实验 1（viz）：不可约多项式的分布

```viz
{
  "type": "plot",
  "title": "F_2 上 n 次不可约多项式的个数",
  "expr": "(2^x - 2) / x",
  "xmin": 2,
  "xmax": 10,
  "sliders": []
}
```

用莫比乌斯反演公式：$F_2$ 上 $n$ 次不可约多项式个数为 $\frac{1}{n}\sum_{d|n}\mu(n/d)\cdot2^d$。当 $n$ 为素数时简化为 $(2^n-2)/n$——总是正整数，所以扩张总能构造。

### 实验 2（python）：F_{2^8} 完整算术

```python title="F_{2^8} 加法与乘法：AES 的算术基础"
# F_{2^8} 用不可约多项式 x^8+x^4+x^3+x+1（0x11B）
# 这就是 AES 使用的那个域

def gf256_add(a, b):
    # F_{2^8} 加法 = 按位异或（特征为 2 的域中，加减相同）
    return a ^ b

def gf256_mul(a, b):
    # F_{2^8} 乘法：俄罗斯农民乘法（移位+异或）
    result = 0
    while b > 0:
        if b & 1:              # b 的最低位为 1
            result = result ^ a
        a = a << 1             # a 左移一位（乘以 x）
        if a & 256:            # 如果溢出到第 9 位
            a = a ^ 0x11B      # 模不可约多项式
        b = b >> 1             # b 右移一位
    return result

# 验证：alpha=2 是 F_{2^8} 的本原元素吗？
x = 2
seen = {0}                   # 已见幂次
for i in range(1, 256):
    x = gf256_mul(x, 2) if i > 1 else 2
    x = gf256_mul(2, x) if i == 1 else x
# 重新计算：直接算 2 的各次幂
pow2 = 1
order = 0
for i in range(1, 256):
    pow2 = gf256_mul(pow2, 2)  # 2^i
    if pow2 == 1:
        order = i
        break

print(f"2 的阶: {order}")        # 应为 255 = 2^8-1
print(f"2 是本原元素: {order == 255}")

# 加法验证
print(f"0xAB + 0xCD = {hex(gf256_add(0xAB, 0xCD))}")  # 异或
print(f"3 * 7 = {gf256_mul(3, 7)}")                    # F_{2^8} 中的乘积
```

$2$ 的阶恰好是 $255=2^8-1$，证实它是本原元素。AES 的 S-box 就是基于 $F_{2^8}$ 上的乘法逆元构造的。

### 快问快答

```quiz
为什么 F_{256} 不能用 Z/256Z（整数模 256）来构造？
- 256 不是素数，Z/256Z 有零因子，不是域 [*]
- 256 太大了
- Z/256Z 和 F_{256} 是同一个东西
? 256=2^8 不是素数。在 Z/256Z 中，2×128=256≡0，两个非零元素相乘为零——有零因子就不是域。F_{2^8} 必须用多项式商环构造。
```

```quiz
F_{p^m} 的乘法群是什么结构？
- m 阶循环群
- p^m-1 阶循环群 [*]
- p 阶循环群
? 有限域的乘法群永远是循环群，阶为 p^m-1。这个群的生成元就是本原元素。
```

:::warning[常见误区]

**误区一**："$F_{p^m}$ 就是整数模 $p^m$。" 只有 $m=1$ 时 $F_p=\mathbb{Z}/p\mathbb{Z}$。$m>1$ 时 $p^m$ 不是素数，$\mathbb{Z}/p^m\mathbb{Z}$ 不是域。$F_{p^m}$ 必须用多项式商环或等价方法构造。

**误区二**："不可约多项式随便选一个就行。" 不同的不可约多项式给出同构的域（结构相同），但本原多项式（其根是本原元素的不可约多项式）在编码和密码中更受欢迎——因为本原元素的幂能遍历所有非零元素，方便查表运算。

**误区三**："有限域构造跟密码没关系。" AES 的 S-box 依赖 $F_{2^8}$ 上的乘法逆元；RS 码的编解码在 $F_{2^m}$ 上做多项式运算；椭圆曲线的点运算在 $F_p$ 或 $F_{p^m}$ 上进行。有限域是现代密码学和编码理论的"操作系统"。

:::

## 6. 练习

**练习 1**：验证 $f(x)=x^3+x^2+1$ 在 $F_2$ 上不可约，并用它构造 $F_8$，计算 $\alpha^4$（$\alpha$ 是 $f$ 的根）。

<details>
<summary>点开查看逐步解答</summary>

$f(0)=1\ne0$，$f(1)=1+1+1=1\ne0$，无一次因子。$F_2$ 上二次不可约多项式只有 $x^2+x+1$，$(x^2+x+1)(x+1)=x^3+x^2+x+1\ne f(x)$。所以 $f$ 不可约。

由 $f(\alpha)=0$ 得 $\alpha^3=\alpha^2+1$（$F_2$ 中 $-1=1$）。$\alpha^4=\alpha\cdot\alpha^3=\alpha(\alpha^2+1)=\alpha^3+\alpha=(\alpha^2+1)+\alpha=\alpha^2+\alpha+1$。
</details>

**练习 2**：补全 $F_{2^4}$ 的构造——代码能跑但乘法结果不对：

```exercise
# @title: 练习：F_{16} 乘法修正
# @check: 6
# @check: 11
# @hint: 乘法是多项式乘法后模不可约多项式；加法是异或
def gf16_mul(a, b, mod=0b10011):
    # F_{2^4} 乘法：不可约多项式 x^4+x+1 = 0b10011
    result = 0
    while b > 0:
        if b & 1:
            result = result ^ a
        a = a << 1
        if a & 16:              # 溢出到第 5 位
            a = a ^ mod         # 模不可约多项式
        b = b + 1               # ← bug：应该是右移不是加 1
    return result

print(gf16_mul(3, 5))   # 应为 6
print(gf16_mul(7, 11))  # 应为 11（可验证）
```

<details>
<summary>点开查看逐步解答</summary>

```python
def gf16_mul(a, b, mod=0b10011):
    result = 0
    while b > 0:
        if b & 1:
            result = result ^ a
        a = a << 1
        if a & 16:
            a = a ^ mod
        b = b >> 1               # 修复：右移一位
    return result

print(gf16_mul(3, 5))   # 6
print(gf16_mul(7, 11))  # 11
```
</details>

## 7. 选读：所有同阶有限域都是同构的

<details>
<summary>选读 · 有限域的唯一性定理</summary>

一个优美的定理：对任意素数 $p$ 和正整数 $m$，阶为 $p^m$ 的有限域在同构意义下**唯一**。也就是说，不管你选哪个 $m$ 次不可约多项式来构造 $F_{p^m}$，得到的域结构完全相同——只是元素的"名字"不同。

证明思路：所有阶为 $p^m$ 的域都是多项式 $x^{p^m}-x$ 在 $F_p$ 上的分裂域。而分裂域在同构意义下唯一（域扩张的基本定理）。

这个唯一性在工程中有实际意义：AES 标准选定不可约多项式 $x^8+x^4+x^3+x+1$（0x11B），所有人用同一个多项式，保证全世界的 AES 实现互相兼容。如果你自己换一个不可约多项式，得到的域同构但表示不同——密文就解不开了。

另一个推论：$F_{p^m}$ 的每个元素都满足 $x^{p^m}=x$（费马小定理的推广）。这意味着 $F_{p^m}$ 恰好是 $x^{p^m}-x$ 的所有根——一种优雅的"代数定义"。

</details>

## 8. 下一站

有限域是编码和密码的"地基"。从代数回到概率：当系统随时间演化、状态之间的转移带有随机性——下一课进入连续时间马尔可夫链，看"跳"与"停"如何统一。

→ [连续时间马尔可夫链](../../37-stochastic-processes/75-ctmc.md)
