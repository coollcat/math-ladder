---
title: 最近邻译码
lesson_id: coding-theory/nearest-neighbor-decoding
prereqs:
  - coding-theory/hamming-distance
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
  - nearest-neighbor-decoding
applications:
  - flash-memory-controller
  - satellite-links
exits:
  - engineering
  - data-ai
---

# 最近邻译码

## 1. 从一个场景开始

接收端收到 `001`，它不是合法码字。此时最有用的假设往往是：信道只翻了很少几位，原码字应该离它最近。最近邻译码把这个朴素直觉变成明确规则。

## 2. 直觉解释

把合法码字想象成几座灯塔，收到的块是一个迷路的点。译码器测量它到每座灯塔的距离：

- 若某座灯塔唯一最近，就选它；
- 若多座灯塔并列最近，规则无法裁决，应报告平票或请求重传；
- 若所有候选都很远，说明噪声可能超过设计范围。

## 3. 正式定义

给定码 $C\subseteq\lbrace0,1\rbrace^n$ 和接收块 $r$，最近邻译码输出：

$$\hat c=\arg\min_{c\in C}d(r,c),$$

前提是最小值唯一。若有多个 $c$ 同时取得最小距离，则称出现**译码平票**。

在二元对称信道中，若各位独立且错误概率 $p<1/2$，翻转少的解释通常概率更大。

## 4. 分步例题

取偶校验码：

$$C=\lbrace000,011,101,110\rbrace.$$

收到 $r=001$：

| 候选 | 距离 |
| --- | ---: |
| 000 | 1 |
| 011 | 1 |
| 101 | 1 |
| 27 | 3 |

`001` 到 `000` 差第 3 位，到 `011` 差第 2 位，到 `101` 差第 1 位——三者都是 1。因此这是三方平票，不能安全判决。

再收 $r=111$：到 `011`、`101`、`110` 都只差 1 位，到 `000` 差 3 位，也是三方平票。事实上，这门码的任何非码字都与三个码字等距——最小距离只有 2，纠错半径为零，它只能检错、不能纠错。

## 5. 动手实验

### 实验：给每个接收块列距离表

这里复用第 19 章 Cauchy 判据课已经引入的内置函数 `min()`。没有它时，我们要先设一个“目前最小值”，再逐项比较替换；有了它，才能把“从一堆距离里取最小”这个意图直接交给 Python。下面仍保留手动扫描，用来解释它到底做了什么。

```python title="最近邻搜索和平票检测"
code = [
    [0, 0, 0],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0]
]

def hamming(x, y):
    count = 0
    for i in range(len(x)):       # range(len(x)) 遍历所有下标
        count += x[i] != y[i]     # True 会当作 1 相加，False 当作 0
    return count

def neighbors(r):
    table = []                    # 收集 (候选, 距离) 二元组
    best = None                   # None 表示还没有找到任何候选
    for c in code:
        d = hamming(r, c)
        table.append((tuple(c), d))
        if best is None or d < best:   # is None：判断变量是否尚未赋值
            best = d
    winners = []
    for item in table:
        if item[1] == best:
            winners.append(item[0])
    return best, winners, table

received = [0, 0, 1]
best, winners, table = neighbors(received)
print("table   =", table)
print("best    =", best)
print("winners =", winners)
print("unique  =", len(winners) == 1)
```

把 `received` 改成 `[1, 1, 1]`，你会看到三方平票；改成 `[1, 1, 0]` 则有唯一最近邻。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为总能选一个看起来不错的候选。平票时强行选择会把不确定性伪装成确定结论。

**误区二**：你以为最近邻一定能还原原文。它只是最大似然的近似；若错误超过设计半径，就会纠到错误码字。

**误区三**：你以为必须先知道发送的是哪个码字。译码恰恰是在不知道原文的情况下，用码本结构推断。

:::

## 7. 练习

```exercise
# @title: 练习：找出唯一最近邻或报告平票
# @check: best=1
# @check: winners=3
# @hint: 分别计算到 000、011、101、110 的距离；winners 记录取得最小距离的数量。
received = [0, 0, 1]
distances = [4, 4, 4, 4]
best = min(distances)
winners = len(distances)
print(f"best={best}")
print(f"winners={winners}")
```

<details>
<summary>点开查看逐步解答</summary>

逐个计算接收块 `001`：

```text
d(001,000)=1
d(001,011)=1
d(001,101)=1
d(001,110)=3
```

最小值是 1，取得这个值的候选有 3 个。正确代码为：

```python
distances = [1, 1, 1, 3]
best = min(distances)
winners = 0
for d in distances:
    if d == best:
        winners += 1              # +=：把右侧结果加回左边的计数器
print(f"best={best}")
print(f"winners={winners}")
```

输出是 `best=1`、`winners=3`。三个候选并列说明 `001` 落在三个决策区的交界上，这正是第 4 节三方平票的数字版。

</details>

## 8. 快问快答

```quiz
最近邻译码遇到两座灯塔并列最近，最稳妥的做法是什么？
- 随机挑一个并声称成功
- 报告平票或请求重传 [*]
- 自动选择字典序较小的码字
? 并列说明当前接收块落在两个决策区边界上；除非系统另有约定，否则不应隐藏这份不确定。
```

## 9. 选读：从几何到概率

<details>
<summary>选读 · 为什么“近”常常等于“更像”</summary>

设单比特错误率为 $p<1/2$。若接收块与候选 $c$ 距离为 $d$，产生这条接收块的概率大约含因子 $p^d(1-p)^{n-d}$。因为 $p<1-p$，距离每增加 1，概率大约缩小 $\frac{p}{1-p}$ 倍。因此最小距离通常对应最大概率。但当信道相关或 $p\ge1/2$ 时，就要更换更合适的译码度量。

</details>

## 10. 下一站

逐一比较所有码字太慢。线性结构能让整座码本由几个基向量生成。

→ [线性码](./40-linear-codes.md)
