---
title: 通信模型与噪声
lesson_id: coding-theory/channel-model
prereqs:
  - prob/law
  - linalg/matrix
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
  - binary-symmetric-channel
applications:
  - deep-space-communication
  - storage-devices
exits:
  - engineering
  - data-ai
---

# 通信模型与噪声

## 1. 从一个场景开始

深空探测器把一张照片拆成亿万个 0 和 1，穿过几光分宽的真空才到达地球。路上只要有几个位被翻转，画面就可能出现噪点。工程师不能对着宇宙喊“请重发一遍”，必须先设计一套能扛住噪声的语言。

## 2. 直觉解释

通信可以看成五个站点：

```text
原文 -> 编码器 -> 有噪声信道 -> 译码器 -> 估计的原文
```

最简单的信道只传送两个符号：0 和 1。噪声像一个看不见的小孩，每拿到一个位，都以某个概率把它翻转。这个概率通常叫 $p$。它不是“错误一定发生”，而是长期频率的模型。

## 3. 正式定义

**二元对称信道**（Binary Symmetric Channel, BSC）有两条规则：

- 发送 0 时，收到 0 的概率是 $1-p$，收到 1 的概率是 $p$；
- 发送 1 时，收到 1 的概率是 $1-p$，收到 0 的概率是 $p$。

若一次发送 $n$ 个位，且每个位独立出错，则整块完全正确的概率是：

$$(1-p)^n.$$

n 越大，“每一位都很可靠”也会被乘法稀释。

## 4. 分步例题

设 $p=0.01$，一块消息长 $n=100$。

1. 单个位正确的概率是 $0.99$；
2. 100 个位全部正确的概率是 $0.99^{100}\approx0.366$；
3. 也就是说，超过六成长块至少会错一位；
4. 每块的期望错误个数是 $np=100\times0.01=1$。

这不是说每块恰好错一个，而是大量长块平均下来约错一个。

## 5. 动手实验

### 实验 1：拉长消息，看风险怎么长大

```viz
{
  "type": "plot",
  "title": "蓝线是期望错误数，橙线是整块完全正确概率",
  "expr": "p*x",
  "label": "期望错误数",
  "expr2": "(1-p)^x",
  "label2": "全对概率",
  "xmin": 0,
  "xmax": 80,
  "sliders": [
    { "name": "p", "min": 0, "max": 0.12, "step": 0.005, "value": 0.01 }
  ]
}
```

拖动 $p$ 和横轴上的长度 $n$：即使 $p=0.01$ 很小，橙线也会随长度快速跌落；蓝线则按 $pn$ 直线上爬。

### 实验 2：用固定种子模拟一条信道

```python title="模拟 20 个位的翻转"
import random  # random 是随机数库；第 0 章已登场，这里用它制造噪声

p = 0.20                 # p：每个位被翻转的概率
n = 20                   # n：本次发送的消息长度
random.seed(2026)        # seed(2026)：固定随机起点，让课堂实验可重复

sent = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]
received = []            # received：空列表，用来收集收到的位
errors = []              # errors：记录哪些位置发生了翻转

for i in range(n):       # range(n)：产生 0 到 n-1 的下标序列
    flip = random.random() < p   # random.random() 返回 0 到 1 的随机小数
    if flip:             # if：当括号内条件成立时执行缩进语句
        received.append(1 - sent[i])   # append(x)：在列表末尾加入 x
        errors.append(i)
    else:
        received.append(sent[i])

print("sent    =", sent)
print("received=", received)
print("errors  =", errors)
print("count   =", len(errors))   # len(x)：列表 x 中元素个数
```

改小 `p` 或换掉 `seed`，错误的位置会变；但模型本身没有变——每个位仍然独立掷一次“噪声骰子”。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 $p=1\%$ 表示 100 位里恰好错 1 位。其实 1 只是长期平均值，可能一块全对、另一块错好几位。

**误区二**：你以为短消息可靠就能直接推出长消息可靠。独立错误要连乘，长块全对概率反而下降。

**误区三**：你以为信道模型就是真实物理层。BSC 只保留“翻转概率和独立性”这两个特征，真实系统还可能有突发错误和相关噪声。

:::

## 7. 练习

```exercise
# @title: 练习：应用固定错误图样
# @check: received=[1, 1, 1, 1, 1]
# @check: count=2
# @hint: 错误图样里的 1 表示该位翻转，0 表示保持不变；异或比普通加法更适合逐位更新。
message = [1, 0, 1, 1, 0]
pattern = [0, 1, 0, 0, 1]

received = [
    message[0] + pattern[0],
    message[1] + pattern[1],
    message[2] + pattern[2],
    message[3] + pattern[3],
    message[4] + pattern[4]
]

count = 5
print(f"received={received}")
print(f"count={count}")
```

<details>
<summary>点开查看逐步解答</summary>

逐位执行 XOR：相同得 0，不同得 1。

```text
message = 1 0 1 1 0
pattern = 0 1 0 0 1
received= 1 1 1 1 1
```

`pattern` 里有两个 1，所以错误数为 2。正确代码可写成：

```python
message = [1, 0, 1, 1, 0]
pattern = [0, 1, 0, 0, 1]
received = []
for i in range(5):
    received.append((message[i] + pattern[i]) % 2)
count = sum(pattern)
print(f"received={received}")
print(f"count={count}")
```

</details>

## 8. 快问快答

```quiz
某深空链路的单比特错误率从 0.001 降到 0.0001，发送长度从 10 位增加到 10000 位。每块期望错误数会怎样？
- 保持不变
- 变成 1 左右 [*]
- 必然变成 0
? 长度扩大了 1000 倍，错误率缩小了 10 倍，所以 np 从 0.01 变到 1。低错误率不等于长块无错。
```

## 9. 选读：为什么要先建模型

<details>
<summary>选读 · 抽象换来了什么</summary>

BSC 把电缆抖动、无线电衰落、存储介质缺陷等不同现象压缩成同一个数学问题：给定 $p$ 和独立性假设，怎样设计码字？这样，同一套编码理论既能帮助探测器，也能帮助二维码抗划痕。当然，若真实信道有突发错误，就要进一步引入突发信道或交织等模型；抽象不是宣称世界简单，而是先把最核心的困难看清。

</details>

## 10. 下一站

既然长消息几乎一定会遇到错误，就不能指望“不出错”，只能刻意加入冗余。下一课看检错与纠错的分工。

→ [冗余、检错与纠错](./15-redundancy-detection.md)
