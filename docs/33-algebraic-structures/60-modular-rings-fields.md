---
title: 模运算中的环和域
lesson_id: algebraic-structures/modular-rings-fields
prereqs:
  - algebraic-structures/polynomial-ring
volume: 3
layer: L2
track:
  - algebra-structure
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - modular-ring
applications:
  - hashing
  - cryptography
exits:
  - engineering
  - research
---

# 模运算中的环和域

## 1. 开场钩子

模 12 钟表可以做加法和乘法，却不是好除法系统：3 乘 4 会撞回 0。

换成模 7 后，每个非零数字突然都能“倒转”。素数在这里改变了结构身份。

## 2. 直觉解释

$\mathbb Z_n$ 把所有整数按余数分成 $n$ 格。加法和乘法都先按普通规则算，再取余数。

能否求倒数取决于 $\gcd(a,n)$。互素时有逆元；否则会被卡住，甚至成为零因子。

## 3. 正式定义

在 $\mathbb Z_n=\lbrace0,1,\ldots,n-1\rbrace$ 上定义

$$a+_nb=(a+b)\bmod n,\qquad a\times_nb=(ab)\bmod n.$$

这两种运算使 $\mathbb Z_n$ 成为交换幺环。元素 $a$ 有乘法逆元当且仅当

$$\gcd(a,n)=1.$$

因此 $\mathbb Z_n$ 是域当且仅当 $n$ 是大于 1 的素数。

## 4. 分步例题

比较 $\mathbb Z_6$ 与 $\mathbb Z_7$：

1. 在 $\mathbb Z_6$ 中，$2\times3=0$，出现零因子；
2. 在 $\mathbb Z_7$ 中找 3 的逆元：尝试 $1,2,3,4,5$；
3. $3\times5=15\equiv1$，所以 $3^{-1}=5$；
4. 每个 1 到 6 都与 7 互素；
5. 所以 $\mathbb Z_7$ 是域。

## 5. 动手实验

```viz
{
  "type": "clockmod",
  "m": 7,
  "k": 3
}
```

把每次步长调成 3 并连续前进。模 7 的素数钟没有小圈排斥：从任意非零格出发都会走遍全部格子。

```viz
{
  "type": "finite-field-inverse-grid",
  "title": "Z12 乘法网格：缺失的逆元",
  "modulus": 12,
  "filters": ["equals-one", "equals-zero", "nonzero-zero-product"],
  "selectedRow": 5,
  "selectedCol": 5
}
```

横向选被乘数 $a$，纵向选乘数 $b$。第 1、5、7、11 行能找到 1；2、3、4 等行的“等于 1”过滤器一片空白，它们就是不可逆的非零元素。

```python title="列出模 12 与模 13 的乘法逆元"
for n in [12, 13]:
    inverse_table = []
    for a in range(1, n):
        inverse = None   # None 表示这一轮还没发现逆元
        for b in range(1, n):
            if (a * b) % n == 1:
                inverse = b
        inverse_table.append(inverse)
    print(n, inverse_table)
```

模 12 表里会出现 `None`；模 13 表里每格都有一个 1 到 12 的数。这就是“环”和“域”的肉眼区别。

## 6. 练习

```exercise
# @title: 练习：求模 11 的逆元
# @check: inv(2)=6
# @check: inv(5)=9
# @check: inv(10)=10
# @hint: 寻找 b 使 (a*b)%11==1。10 的平方在模 11 下是多少？
n = 11
answers = {2: None, 5: None, 10: None}   # 字典：给三个键各留一个待求答案
for a in answers:
    answers[a] = 0

for key in answers:
    print("inv(" + str(key) + ")=" + str(answers[key]))
```

<details>
<summary>点开查看逐步解答</summary>

把每个占位值改成搜索：

```python
n = 11
answers = {2: None, 5: None, 10: None}   # 字典：给三个键各留一个待求答案
for key in answers:                      # 逐个处理待求的数
    for b in range(1, n):                # 在 1..10 里挨个试乘数
        if (key * b) % n == 1:           # 乘积除以 n 余 1，说明 b 就是逆元
            answers[key] = b

for key in answers:                      # 沿用原题的逐行打印格式，别改成 print(answers)
    print("inv(" + str(key) + ")=" + str(answers[key]))
```

注意最后一步：判题要的是逐行 `inv(2)=6` 这样的输出，直接 `print(answers)` 会打印整个字典 `{2: 6, 5: 9, 10: 10}`，过不了检查。

验证：

$$2\cdot6=12\equiv1,\quad5\cdot9=45\equiv1,\quad10^2=100\equiv1.$$

</details>

## 7. 常见误区

**误区一**：你以为模运算只能用于加法。只要先普通乘再取余，乘法同样封闭。

**误区二**：你以为每个非零数都有倒数。只有在模素数或与其互素时才有保证。

**误区三**：你以为负数需要新系统。$-2$ 就是 $n-2$ 的另一个名字。

## 8. 快问快答

```quiz
Z_n 成为域的核心条件是什么？
- n 必须是偶数
- n 必须是素数 [*]
- 必须包含负数
? 素数模保证 1 到 n-1 全部与 n 互素，从而都有乘法逆元。
```

## 9. 选读：扩展欧几里得的快速路径

<details>
<summary>选读 · 不用穷举找逆元</summary>

第 10 章的欧几里得算法可以写成

$$au+nv=\gcd(a,n).$$

若 $\gcd(a,n)=1$，两边取模 $n$ 得 $au\equiv1$，所以 $u\bmod n$ 就是逆元。这在密码学中比逐个尝试高效得多。

</details>

## 10. 下一站

模素数给出了最直接的有限域。下一课正式认识有限域，并预告不是所有有限域都能这样简单造出。

→ [有限域入门](./65-finite-fields.md)
