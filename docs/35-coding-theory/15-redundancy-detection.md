---
title: 冗余、检错与纠错
lesson_id: coding-theory/redundancy-detection
prereqs:
  - coding-theory/channel-model
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
  - code-rate
applications:
  - qr-codes
  - compact-disc
exits:
  - engineering
  - life-reason
---

# 冗余、检错与纠错

## 1. 从一个场景开始

二维码被钥匙划了一道，手机仍能扫出来；老唱片有一圈划痕，音乐还能继续播放。它们都不是运气好，而是在数据里预先藏了“备用线索”。冗余就是为意外准备的座位。

## 2. 直觉解释

如果每个位都只表达新信息，任何一个翻转都会改变意思。编码理论反其道而行：把 $k$ 个信息位扩展成更长的 $n$ 个码位。多出来的 $n-k$ 个位不是废话，而是约束条件。

冗余有两种基本用途：

- **检错**：发现“这里不对”，然后请求重传；
- **纠错**：不用重传，接收方自己推断原来的码字。

## 3. 正式定义

一个块码把长度 $k$ 的消息映射成长度 $n$ 的码字，其中 $n\ge k$。**码率**定义为：

$$R=\frac{k}{n}.$$

**冗余率**可以用 $1-R$ 粗略描述：每传输一个码位中，有多少比例是为可靠性服务的空间。

检错码只需要把非法接收排除在外；纠错码还要让每个合法码字的“邻域”互不冲突。后者通常需要更强的结构。

## 4. 分步例题

比较三种方案，每种都保护 1 个信息位。

| 方案 | 码长 n | 信息位 k | 码率 R | 能力 |
| --- | ---: | ---: | ---: | --- |
| 不加冗余 | 1 | 1 | 1 | 不能检错 |
| 奇偶校验 | 2 | 1 | 0.5 | 能检出奇数个错 |
| 三重复读 | 3 | 1 | 0.3333 | 通常能纠正 1 个错 |

三重复读把 0 写成 000，把 1 写成 111。收到 010 时，最近的合法码字是 000，所以可判 0。代价是每 3 个传输位只有 1 个信息位。

## 5. 动手实验

### 实验 1：冗余越多，码率越低

```viz
{
  "type": "plot",
  "title": "k 个信息位加 r 个冗余位后的码率",
  "expr": "k/(k+x)",
  "label": "码率 k/(k+r)",
  "xmin": 0,
  "xmax": 30,
  "sliders": [
    { "name": "k", "min": 1, "max": 60, "step": 1, "value": 8 }
  ]
}
```

拖动 $k$ 再观察冗余位数 $r$：同样增加 10 个校验位，对短消息是很大开销，对长消息则可能只是少量折价。

### 实验 2：给同一段数据算三种账

```python title="比较不加码、偶校验和三重复读"
data = [1, 0, 1, 1]          # data：原始信息位

raw = list(data)             # list(x)：复制一份列表，避免改动原数据
parity = raw + [sum(raw) % 2]      # sum(x)：求和；模 2 得到偶校验位
triple = []
for bit in data:             # for bit in x：逐个取出列表元素
    triple.extend([bit, bit, bit]) # extend(y)：把列表 y 的元素逐个追加

def rate(k, n):              # def：定义函数；k 是信息位，n 是传输位
    return k / n             # return：函数把结果交回调用处

print("raw    =", raw, "rate =", rate(len(data), len(raw)))
print("parity =", parity, "rate =", rate(len(data), len(parity)))
print("triple =", triple, "rate =", rate(len(data), len(triple)))
```

输出会显示：三重复读最能容忍局部错误，但码率最低。工程从来不是只要“最强”，而是要在可靠性和开销之间选位置。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为冗余等于加密。加密隐藏内容，冗余公开地增加结构，两者目标完全不同。

**误区二**：你以为检错一定能纠错。知道“错了”和知道“哪一位错、原值是什么”之间还有很大距离。

**误区三**：你以为冗余越多越好。过多冗余会降低吞吐、增加延迟和能耗，甚至带来新的同步问题。

:::

## 7. 练习

```exercise
# @title: 练习：计算码率和冗余位数
# @check: rate=0.25
# @check: extra=12
# @hint: 码率是信息位除以总码长；冗余位数是总码长减去信息位。
k = 4
n = 16
rate = k * n
extra = n + k
print(f"rate={rate}")
print(f"extra={extra}")
```

<details>
<summary>点开查看逐步解答</summary>

码率要把信息位除以总码长：

$$R=\frac{4}{16}=0.25.$$

冗余位数要从总码长里减去信息位：

$$n-k=16-4=12.$$

所以两处改动分别是把乘法改成除法、把加法改成减法。

```python
rate = k / n             # 用除法得到信息位占比
extra = n - k            # 冗余位等于总长减去信息位
print(f"rate={rate}")
print(f"extra={extra}")
```

</details>

## 8. 快问快答

```quiz
一个检错码发现接收块非法，但无法判断原来属于哪个合法码字。它做到了什么？
- 纠错
- 检错 [*]
- 压缩
? 检错只需识别非法状态；纠错还必须在多个候选中可靠地选出原码字。
```

## 9. 选读：为什么“距离”会自然出现

<details>
<summary>选读 · 合法码字之间的空隙</summary>

如果把所有二进制串看成空间中的点，合法码字就像几座灯塔。噪声把发送点推离原位。若两座灯塔挨得太近，接收点可能同时靠近两者，译码就会犹豫；若它们彼此隔开足够远，就能各自拥有安全区。这个“隔开程度”下一组课会精确化成汉明距离。

</details>

## 10. 下一站

最直观的纠错方案是把每个位大声重复几次。下一课用多数表决把它算清楚。

→ [重复码与多数表决](./20-repetition-code.md)
