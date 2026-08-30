---
title: 线性码
lesson_id: coding-theory/linear-codes
prereqs:
  - coding-theory/nearest-neighbor-decoding
  - linalg/basis
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - linear-code
  - finite-field-f2
applications:
  - communication-systems
  - storage-coding
exits:
  - engineering
  - research
---

# 线性码

## 1. 从一个场景开始

逐个设计几百万个合法码字太累。线性代数说：只需要选几个基向量，其余码字会自动生成。把普通加法换成“异或”，整座码本就有了骨架。

## 2. 直觉解释

在二进制世界里，只有两个数：0 和 1。加法按“相同为 0，不同为 1”进行，也叫异或：

```text
0 + 0 = 0    1 + 0 = 1
0 + 1 = 1    1 + 1 = 0
```

这个系统常记作 $\mathbb F_2$。线性码就是 $\mathbb F_2^n$ 中对加法和数乘封闭的子集合，因此全零码字一定在里面。

若能找到 $k$ 个线性无关的基码字，所有 $2^k$ 个组合就是完整码本。

## 3. 正式定义

一个 **$[n,k]$ 线性码**是向量空间 $\mathbb F_2^n$ 的 $k$ 维子空间 $C$：

- 长度都是 $n$；
- 含零向量；
- 任意两个码字逐位异或后仍在 $C$；
- 任意码字乘 0 得零向量，乘 1 保持不变。

$n$ 是码长，$k$ 是维数，码率为 $k/n$。

## 4. 分步例题

取两个基码字：

$$g_1=110,\qquad g_2=101.$$

枚举所有消息 $(a,b)\in\mathbb F_2^2$：

| 消息 | 码字 |
| --- | --- |
| 00 | 000 |
| 10 | 110 |
| 01 | 101 |
| 11 | 110+101=011 |

四个码字都含有偶数个 1；任意两个异或后仍是其中之一。因此这是一个 $[3,2]$ 线性偶校验码。

## 5. 动手实验

### 实验：用基向量生成整座码本

```python title="枚举 F2 上的线性组合"
g1 = [1, 1, 0]              # 第一个基码字
g2 = [1, 0, 1]              # 第二个基码字

def add_binary(x, y):
    out = []
    for i in range(len(x)):
        out.append((x[i] + y[i]) % 2)   # % 2：把普通和变成异或
    return out

def scale(bit, x):
    if bit == 0:
        return [0] * len(x)   # 数乘 0 把每个位变成 0
    return list(x)            # 数乘 1 保持原码字

code = []
for a in [0, 1]:              # 枚举第一个坐标
    for b in [0, 1]:          # 枚举第二个坐标
        term1 = scale(a, g1)
        term2 = scale(b, g2)
        code.append(add_binary(term1, term2))

print("g1 =", g1)
print("g2 =", g2)
print("code =", code)
```

把 `g2` 改成 `[1, 1, 0]`，它会被 `g1` 生成；输出里会出现重复码字，说明两个基不再独立。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为任意一批二进制串都能叫线性码。必须验证封闭性；缺零向量或异或后跑出集合都不行。

**误区二**：你以为线性码中的加法是普通整数加法。这里每位都要取模 2，所以 1 加 1 等于 0。

**误区三**：你以为码字个数等于 $k$。$k$ 是基的数量，完整线性码有 $2^k$ 个码字。

:::

## 7. 练习

```exercise
# @title: 练习：检查线性码封闭性
# @check: c_xor=[1, 1, 0, 1]
# @check: in_code=True
# @hint: 逐位异或后，再和码本中的每一项比较。
code = [
    [0, 0, 0, 0],
    [1, 0, 1, 1],
    [0, 1, 1, 0],
    [1, 1, 0, 1]
]
x = [1, 0, 1, 1]
y = [0, 1, 1, 0]
c_xor = [
    x[0] + y[0],
    x[1] + y[1],
    x[2] + y[2],
    x[3] + y[3]
]
in_code = False

print(f"c_xor={c_xor}")
print(f"in_code={in_code}")
```

<details>
<summary>点开查看逐步解答</summary>

每一位做模 2 加法：

```text
1011
0110
----
1101
```

所以：

```python
x = [1, 0, 1, 1]
y = [0, 1, 1, 0]
code = [[0, 0, 0, 0], [1, 0, 1, 1], [0, 1, 1, 0], [1, 1, 0, 1]]
c_xor = [
    (x[0] + y[0]) % 2,
    (x[1] + y[1]) % 2,
    (x[2] + y[2]) % 2,
    (x[3] + y[3]) % 2
]
in_code = c_xor == code[3]   # == 判断列表逐项相等，返回布尔值
print(f"c_xor={c_xor}")
print(f"in_code={in_code}")
```

</details>

## 8. 快问快答

```quiz
某个二进制码自称线性码，但不含全零码字。这个说法有什么问题？
- 只要其他码字够多就没关系
- 一定不是线性码 [*]
- 只要把 0 加入即可自动成立
? 线性空间必须含零向量。任何码字与自身相加得到全零串，封闭性迫使它在码中。
```

## 9. 选读：为什么封闭性能换来效率

<details>
<summary>选读 · 基向量就是压缩表</summary>

普通块码可能要保存全部 $M$ 个码字。线性码只需保存 $k$ 个独立基向量，编码时按消息系数把它们相加。译码器也能利用子空间结构：接收块减去候选码字后，若结果不在码中，就能排除该候选。下一课把这个思想写成矩阵。

</details>

## 10. 下一站

生成矩阵负责“从消息造码字”，校验矩阵负责“检查码字是否合法”。两者是一枚硬币的两面。

→ [生成矩阵与校验矩阵](./45-generator-parity-matrices.md)
