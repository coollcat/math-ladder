---
title: Hamming(7,4) 码
lesson_id: coding-theory/hamming-74-code
prereqs:
  - coding-theory/generator-parity-matrices
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
  - hamming-code
  - syndrome-decoding
applications:
  - ecc-memory
  - early-computing
exits:
  - engineering
  - research
---

# Hamming(7,4) 码

## 1. 从一个场景开始

1950 年前后，计算机读带常常出错。Richard Hamming 的想法漂亮得近乎倔强：给 4 个数据位配 3 个校验位，让每一个可能出错的位置都拥有独一无二的“门牌号”。

## 2. 直觉解释

Hamming(7,4) 把 7 个位置编号 1 到 7，并把编号写成三位二进制：

```text
1=001  2=010  3=011  4=100
5=101  6=110  7=111
```

三条奇偶方程分别检查编号中含有 1、2、4 的位置。若某一位翻转，且仅这一位翻转，三条方程产生的校验子恰好等于该位置的编号。

## 3. 正式定义

常用布局是：

| 位置 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 角色 | p1 | p2 | d1 | p4 | d2 | d3 | d4 |

校验方程为：

$$p_1=d_1+d_2+d_4,\quad p_2=d_1+d_3+d_4,\quad p_4=d_2+d_3+d_4\pmod 2.$$

接收后的三个校验子组成地址：

$$s=s_1+2s_2+4s_3.$$

若只有一个错，$s$ 就是出错位置；$s=0$ 表示通过检查。

## 4. 分步例题

数据 $d_1d_2d_3d_4=1011$。

1. $p_1=1+0+1=0$；
2. $p_2=1+1+1=1\pmod2$；
3. $p_4=0+1+1=0$；
4. 码字按位置排列为 `0110011`；
5. 假设第 6 位翻成 0，收到 `0110001`；
6. 三条校验子分别是 0、1、1，地址为 $0+2+4=6$；
7. 翻回第 6 位，恢复 `0110011`。

## 5. 动手实验

### 实验：校验子地址机

```python title="Hamming(7,4)：编码、注错、定位"
d = [1, 0, 1, 1]                 # 数据位 d1,d2,d3,d4
p1 = (d[0] + d[1] + d[3]) % 2    # 检查位置 1,3,5,7
p2 = (d[0] + d[2] + d[3]) % 2    # 检查位置 2,3,6,7
p4 = (d[1] + d[2] + d[3]) % 2    # 检查位置 4,5,6,7

codeword = [p1, p2, d[0], p4, d[1], d[2], d[3]]
received = list(codeword)        # 复制码本后再注入单个错误
received[5] = 1 - received[5]    # 翻转下标 5，也就是第 6 位

s1 = sum(received[i] for i in [0, 2, 4, 6]) % 2   # 生成器表达式逐个取位
s2 = sum(received[i] for i in [1, 2, 5, 6]) % 2
s3 = sum(received[i] for i in [3, 4, 5, 6]) % 2
address = s1 + 2 * s2 + 4 * s3

corrected = list(received)
if address != 0:
    corrected[address - 1] = 1 - corrected[address - 1]

print("codeword  =", codeword)
print("received  =", received)
print("syndrome  =", (s1, s2, s3))
print("address   =", address)
print("corrected =", corrected)
```

把翻转下标换成 0 到 6 的其他值，地址应始终等于“下标加一”。这就是 Hamming 设计的核心。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为位置从 0 开始编号。经典 Hamming 门牌号从 1 开始，这样 0 号才能留给“无错”。

**误区二**：你以为校验子非零就一定是一个错。两个甚至多个错也可能碰巧产生同一个非零地址，导致纠错失败。

**误区三**：你以为 7 位里有 4 个数据位，所以码率是 4。码率是 $4/7$。

:::

## 7. 练习

```exercise
# @title: 练习：修正地址权重
# @check: address=6
# @check: corrected=[0, 1, 1, 0, 0, 1, 1]
# @hint: 三位校验子从左到右对应的权值是 1、2、4，而不是 4、2、1。
received = [0, 1, 1, 0, 0, 0, 1]
s = [0, 1, 1]
weights = [4, 2, 1]
address = sum([s[0] * weights[0], s[1] * weights[1], s[2] * weights[2]])
corrected = list(received)
if address > 0:
    corrected[address] = 1 - corrected[address]

print(f"address={address}")
print(f"corrected={corrected}")
```

<details>
<summary>点开查看逐步解答</summary>

地址公式是：

$$s_1+2s_2+4s_3=0\times1+1\times2+1\times4=6.$$

第 6 位对应列表下标 5，所以定位后要再减 1：

```python
received = [0, 1, 1, 0, 0, 0, 1]
s = [0, 1, 1]
weights = [1, 2, 4]   # 从左到右的权值是 1、2、4
address = s[0] * weights[0] + s[1] * weights[1] + s[2] * weights[2]
corrected = list(received)
if address > 0:
    corrected[address - 1] = 1 - corrected[address - 1]
print(f"address={address}")
print(f"corrected={corrected}")
```

于是打印 `address=6`，并恢复出 `[0, 1, 1, 0, 0, 1, 1]`。

</details>

## 8. 快问快答

```quiz
Hamming(7,4) 收到块后校验子为 000，最合理的初步结论是什么？
- 一定没有发生任何错误
- 通过三条奇偶检查 [*]
- 一定是全零码字
? 零校验子表示当前块满足全部方程。偶数个错误可能抵消，所以不能证明绝对无误。
```

## 9. 选读：为什么刚好装满

<details>
<summary>选读 · 完美码的小账本</summary>

共有 $2^4=16$ 个合法码字。每个码字周围半径为 1 的球包含自身加上 7 个单错邻居，共 8 个串。总覆盖数为：

$$16\times8=128=2^7.$$

所有 7 位串刚好被互不重叠地分完。因此 Hamming(7,4) 是完美码：没有浪费，也没有遗漏。

</details>

## 10. 下一站

“能纠几个错”不该靠感觉。下一课用最小距离把它变成一条精确边界。

→ [纠错能力与最小距离](./55-minimum-distance.md)
