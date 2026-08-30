---
title: 循环码与多项式视角
lesson_id: coding-theory/cyclic-polynomial-codes
prereqs:
  - coding-theory/convolutional-preview
  - numtheory/congruence
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin:
  - any
  - all
introduces_import: []
introduces_concepts:
  - cyclic-shift
  - generator-polynomial
applications:
  - crc-checks
  - ethernet-frames
exits:
  - engineering
  - research
---

# 循环码与多项式视角

## 1. 从一个场景开始

网络帧末尾常跟着一段 CRC 校验。它的数学底座不是神秘咒语，而是把二进制串看成多项式，再用余数检查除法是否干净。循环码把这个思想整理成完整结构。

## 2. 直觉解释

把码字 $c_0c_1\cdots c_{n-1}$ 写成多项式：

$$c(x)=c_0+c_1x+\cdots+c_{n-1}x^{n-1},$$

系数只在 $\mathbb F_2$ 中取 0 或 1。左移一位相当于乘 $x$；最高位的 1 掉出去时，用 $x^n\equiv1$ 把它接回最低位。这就是循环移位。

若一个码里所有码字的循环移位仍是码字，就叫循环码。

## 3. 正式定义

长度 $n$ 的二元循环码由一个**生成多项式** $g(x)$ 生成，且 $g(x)\mid x^n+1$ 在 $\mathbb F_2[x]$ 中成立。

码字是所有次数小于 $n$ 的倍式：

$$C=\lbrace m(x)g(x):\deg(m)<n-\deg(g)\rbrace.$$

接收多项式 $r(x)$ 除以 $g(x)$ 所得余式就是校验子；非零余式说明检测到错误。

## 4. 分步例题

取 $n=3$，$g(x)=1+x$。因为在 $\mathbb F_2$ 中：

$$x^3+1=(x+1)(x^2+x+1),$$

所以 $g(x)$ 可以生成长度 3 的循环码。

消息 1 给出码字 `110`（系数从低到高）。循环右移一位得 `011`；再移一位得 `101`。加上零码字，完整码为：

$$C=\lbrace000,110,011,101\rbrace.$$

接收 `111` 对应 $1+x+x^2$。除以 $1+x$ 得余式 $1$，非零，因此检错成功。

## 5. 动手实验

### 实验 1：三格钟面模拟位置轮换

```viz
{
  "type": "clockmod",
  "m": 3,
  "title": "位置编号模 3 循环"
}
```

位置 0、1、2 被 3 除后不断绕圈，就像码字的首尾循环移动。真正的循环码还要求整个向量一起转，钟面只是帮你抓住“周期性”。

### 实验 2：$\mathbb F_2$ 多项式余数机

```python title="二元多项式长除法"
received = [1, 1, 1]          # 系数从低到高：1 + x + x^2
generator = [1, 1]            # 1 + x

def poly_degree(p):
    deg = -1
    for i in range(len(p)):
        if p[i] == 1:
            deg = i           # 最高一个 1 所在下标就是次数
    return deg

def poly_sub_mod2(a, b):
    out = list(a)
    for i in range(len(b)):
        out[i] = (out[i] + b[i]) % 2   # 减法和加法在 F2 中相同
    return out

remainder = list(received)
while poly_degree(remainder) >= poly_degree(generator) and any(remainder): # any：列表里只要有一个 1 就为 True
    shift = poly_degree(remainder) - poly_degree(generator)
    shifted = [0] * shift + generator  # 把生成多项式升到对应次数
    remainder = poly_sub_mod2(remainder, shifted)

print("remainder =", remainder)
print("is_clean  =", all(v == 0 for v in remainder))   # all：所有元素都满足条件才为 True
```

把 `received` 改成 `[1, 1, 0]`，它是 $1+x=g(x)$，余数会变成全零。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 `111` 当普通整数除以 3 会给出同样余数。这里系数运算在 $\mathbb F_2$ 中，不是十进制整数除法。

**误区二**：你以为任何多项式都能当生成多项式。必须整除 $x^n+1$，且常数项通常不为 0。

**误区三**：以为 CRC 就是完整的纠错码。常用 CRC 主要用于高效检错，不负责定位每一个错误。

:::

## 7. 练习

```exercise
# @title: 练习：判断多项式能否被生成式整除
# @check: remainder=[0, 0]
# @check: is_clean=True
# @hint: received 的前两位恰好是 generator 本身；逐位做完模 2 加法（异或）后，用余数是否为全零来给 is_clean 定值。
received = [1, 1, 0]        # 系数从低到高：1 + x
generator = [1, 1]          # 生成多项式：1 + x

remainder = [
    received[0] + generator[0],
    received[1] + generator[1]
]                           # ← 还没取模 2，异或没有完成
is_clean = False            # ← 请改成根据余数是否为全零来判定

print(f"remainder={remainder}")
print(f"is_clean={is_clean}")
```

<details>
<summary>点开查看逐步解答</summary>

$1+x$ 除以自身当然余零。把 received 与 generator 对齐后逐位做模 2 加法（$\mathbb F_2$ 里减法就是加法）；第三位系数本来就是 0，不参与这次对齐相减：

```python
received = [1, 1, 0]
generator = [1, 1]
remainder = [
    (received[0] + generator[0]) % 2,
    (received[1] + generator[1]) % 2
]
is_clean = remainder == [0, 0]   # == 判断列表逐项相等，返回布尔值
print(f"remainder={remainder}")
print(f"is_clean={is_clean}")
```

输出为 `remainder=[0, 0]` 和 `is_clean=True`——整除意味着接收多项式是合法码字。
</details>

## 8. 快问快答

```quiz
循环码的生成多项式需要满足什么核心条件？
- 次数越小越好
- 整除 x^n+1 [*]
- 所有系数都是 1
? 只有整除 x^n+1 的生成式才能保证倍式的循环移位仍留在同一个码空间中。
```

## 9. 选读：为什么工程偏爱循环结构

<details>
<summary>选读 · 移位寄存器友好</summary>

乘以 $x$、异或固定模式、丢弃高位，这些动作几乎就是硬件移位寄存器的日常。BCH 码和 Reed-Solomon 码都建立在更精细的循环码理论之上；CRC 则保留了余数检查这一最轻量的分支。结构越规整，硬件实现往往越省电。

</details>

## 10. 下一站

当校验方程很多但每个方程都很稀疏时，现代 LDPC 码开始登场。

→ [LDPC 思想预告](./70-ldpc-preview.md)
