---
title: 重复码与多数表决
lesson_id: coding-theory/repetition-code
prereqs:
  - coding-theory/redundancy-detection
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
  - repetition-code
  - majority-vote
applications:
  - sensor-networks
  - low-power-links
exits:
  - engineering
---

# 重复码与多数表决

## 1. 从一个场景开始

教室太吵，你把纸条上的“0”连写五遍。对方收到 `0 1 0 0 0`，即使有两个字迹被蹭花，也会自然判成 0。重复不是优雅的数学起点，却是最诚实的纠错模型。

## 2. 直觉解释

$n$ 重复码把每个信息位复制 $n$ 次，通常取奇数 $n$。接收方不试图找出哪几次被翻转，只数 0 和 1 哪边更多：

- 收到 `00011`，三个 0 赢两个 1，判 0；
- 收到 `11101`，四个 1 赢一个 0，判 1；
- 若 $n$ 是偶数且票数相同，就没有天然赢家。

多数表决把“局部错误”交给整体投票消化。

## 3. 正式定义

对奇数 $n=2t+1$，编码为：

$$E(b)=\underbrace{bb\cdots b}_{n\text{ 位}}.$$

译码规则是输出出现次数更多的符号。若接收块中翻转位数不超过 $t$，正确符号仍占至少 $t+1$ 票，所以一定纠回。

例如 $n=5$ 时 $t=2$：任意 1 或 2 个错都能纠正；但 3 个错会把整块推到另一个合法码字的势力范围。

## 4. 分步例题

发送位是 1，使用 5 重复码，码字为 `11111`。

1. 信道翻转第 2、5 位，收到 `10110`；
2. 数票：1 有 3 张，0 有 2 张；
3. 多数是 1，所以译码结果为 1；
4. 若第 1、2、5 位都翻，收到 `00110`，0 有 3 张，表决就会误判为 0。

因此 5 重复码的安全边界是：最多纠 2 个错。

## 5. 动手实验

### 实验 1：三重复读的错误率骤降

```viz
{
  "type": "plot",
  "title": "横轴是单比特错误率 p",
  "expr": "x",
  "label": "不重复：错误率 p",
  "expr2": "3*x^2 - 2*x^3",
  "label2": "三重复读后出错概率",
  "xmin": 0,
  "xmax": 0.3,
  "sliders": []
}
```

橙线表示三位中至少有两位出错的概率。当 $p$ 很小时，它大约只有 $3p^2$；小错误必须同时凑够两次，才骗得过多数。

### 实验 2：手写投票机

```python title="5 重复码：编码、注入固定噪声、表决"
def encode_repeat(bit, n):        # def：定义函数；bit 是一个信息位
    return [bit] * n              # [x] * n：把列表 [x] 重复 n 次

def majority_decode(block):       # block 是收到的长度为 n 的列表
    ones = sum(block)             # sum：把 True/1 全部相加，得到 1 的票数
    zeros = len(block) - ones     # len：总票数减去 1 的票数
    if ones > zeros:
        return 1
    return 0

sent_bit = 1
codeword = encode_repeat(sent_bit, 5)
received = [1, 0, 1, 1, 0]

print("codeword =", codeword)
print("received =", received)
print("decoded  =", majority_decode(received))
```

把 `received` 改成 `[1, 1, 0, 0, 0]`，表决仍然正确；再改成 `[0, 0, 0, 1, 1]`，它就跨过边界。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为重复码能纠正所有错误。它能纠正的数量不超过一半减一；超过半数会变成自信的错误。

**误区二**：你以为偶数重复更划算。偶数长度可能出现平票，还需要额外规则打破平局。

**误区三**：你以为表决前要先找到错误位置。多数表决不需要定位，只需要统计全局票数。

:::

## 7. 练习

```exercise
# @title: 练习：修正多数表决
# @check: decoded=1
# @check: votes=3
# @hint: 先统计 1 的个数；若它严格大于总长的一半，就返回 1。
block = [1, 0, 1, 1, 0]
ones = sum(block)

if ones < len(block) / 2:
    decoded = 1
else:
    decoded = 0
votes = ones + 1

print(f"decoded={decoded}")
print(f"votes={votes}")
```

<details>
<summary>点开查看逐步解答</summary>

`block` 中有三个 1、两个 0。多数条件应是“大于一半”，不是“小于一半”：

```python
block = [1, 0, 1, 1, 0]
ones = sum(block)

if ones > len(block) / 2:
    decoded = 1
else:
    decoded = 0
votes = ones
print(f"decoded={decoded}")
print(f"votes={votes}")
```

于是 `decoded=1`，`votes=3`。

</details>

## 8. 快问快答

```quiz
4 重复码收到 0110，普通多数表决会遇到什么问题？
- 必然判 0
- 必然判 1
- 平票，无法直接判决 [*]
? 0 和 1 各有两张票。除非额外规定平票时报错或请求重传，否则没有多数可依。
```

## 9. 选读：错误概率为什么按平方下降

<details>
<summary>选读 · 三重复读的失败事件</summary>

设单比特错误率为 $p$。三重复读失败等价于至少两位出错，共有三种情况：

$$3p^2(1-p)+p^3=3p^2-2p^3.$$

当 $p$ 很小时，$p^2$ 比 $p$ 小得多，所以错误率大幅下降。不过码率也降到三分之一。这个交换正是编码理论的第一课。

</details>

## 10. 下一站

重复码可靠但昂贵。能不能只加一位，就至少发现许多错误？下一课看奇偶校验。

→ [奇偶校验](./25-parity-check.md)
