---
title: 卷积码直观预告
lesson_id: coding-theory/convolutional-preview
prereqs:
  - coding-theory/minimum-distance
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
  - convolutional-code
  - encoder-state
applications:
  - deep-space-telemetry
  - mobile-communication
exits:
  - engineering
---

# 卷积码直观预告

## 1. 从一个场景开始

块码像把信切成一张张卡片分别包装；卷积码更像连续讲话——现在的发音取决于当前音节，也受上一个音节的口型影响。这种“记忆”让纠错可以边流边做。

## 2. 直觉解释

看一个最小的系统卷积编码器。输入序列是 $u_1,u_2,\ldots$，每来一个位就输出两位：

```text
c1 = 当前输入
c2 = 当前输入 XOR 上一位输入
```

编码器只需要记住“上一位”是什么。这个一位记忆就是它的状态：状态 0 表示上一位是 0，状态 1 表示上一位是 1。

同一个输入位，在不同状态下会产生不同的第二输出位。

## 3. 正式定义

本课使用的率 $1/2$ 前馈卷积编码器为：

$$c_{j,1}=u_j,\qquad c_{j,2}=u_j+u_{j-1}\pmod2.$$

初始时令 $u_0=0$。长度 $L$ 的输入产生长度 $2L$ 的输出，码率为 $1/2$。

真实卷积码通常有多个移位寄存器和更长约束长度；维特比算法会在状态图中搜索与接收序列总体距离最小的路径。

## 4. 分步例题

输入 `101`，初始状态为 0。

| 步骤 | 输入 | 上一位 | 输出 |
| ---: | ---: | ---: | --- |
| 1 | 1 | 0 | `11` |
| 2 | 0 | 1 | `01` |
| 3 | 1 | 0 | `11` |

所以编码输出是 `110111`。若再补一个终止位 0，最后一步输入 0、上一位 1，追加输出 `01`，完整终止序列变为 `11011101`。

## 5. 动手实验

### 实验：一步步推进状态机

```python title="带状态的率 1/2 卷积编码器"
bits = [1, 0, 1]              # 待编码的输入流
previous = 0                  # 初始状态：上一位输入设为 0
output = []                   # 收集所有输出位

for index in range(len(bits)): # 按时间步遍历输入
    current = bits[index]
    first = current
    second = current + previous   # 还未取模，下一步统一处理
    output.append(first)
    output.append(second % 2)     # % 2 实现异或
    previous = current            # 状态向前推进一格

print("input  =", bits)
print("output =", output)
print("state  =", previous)
```

把 `bits` 改成 `[1, 1, 1]`，你会看到相同输入因状态不同而输出交替变化；这正是卷积码和重复码最大的差别。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为卷积码就是多项式乘法里的普通卷积数值。这里系数和加法都在 $\mathbb F_2$ 上进行。

**误区二**：你以为编码器只需记住当前输入。状态来自过去的若干输入，忘记状态就会丢掉第二路校验信息。

**误区三**：以为维特比算法每次只看一步。它比较的是整条路径的累计代价，而不是孤立地判决单个位。

:::

## 7. 练习

```exercise
# @title: 练习：修复状态更新时机
# @check: output=[1, 1, 0, 1, 1, 1]
# @check: final_state=1
# @hint: 第二个输出要用“当前输入 XOR 更新前的上一位”；全部算完后再更新 previous。
bits = [1, 0, 1]
previous = 0
output = []
for i in range(len(bits)):
    current = bits[i]
    previous = current
    first = current
    second = current + previous
    output.append(first)
    output.append(second % 2)
final_state = previous
print(f"output={output}")
print(f"final_state={final_state}")
```

<details>
<summary>点开查看逐步解答</summary>

正确顺序是先用旧的 `previous` 计算，再更新状态：

```python
bits = [1, 0, 1]
previous = 0
output = []
for current in bits:
    first = current
    second = current + previous
    output.append(first)
    output.append(second % 2)
    previous = current
final_state = previous
print(f"output={output}")
print(f"final_state={final_state}")
```

逐步输出为 `11`、`01`、`11`，合并成 `[1,1,0,1,1,1]`。关键就是把 `previous = current` 移到两个输出都算完之后。

</details>

## 8. 快问快答

```quiz
卷积编码器收到相同的输入位 1，为什么可能输出不同的两位？
- 因为信道随机翻转
- 因为编码器的状态可能不同 [*]
- 因为输出位数不确定
? 第二个输出由当前输入和历史状态共同决定；状态不同，同一输入就会走向不同的分支。
```

## 9. 选读：状态图的走法

<details>
<summary>选读 · 为什么叫路径</summary>

本例只有两个状态。每收到一个输入位，状态要么保持，要么翻转，同时吐出两位。把所有可能画出来，就得到一张小状态图。接收端看到带噪输出后，维特比算法给每条候选路径记分，保留较优者，最终回溯出最像发送序列的那条路径。

</details>

## 10. 下一站

如果码字还能像珠链一样循环滚动，就会得到另一类优雅结构：循环码。

→ [循环码与多项式视角](./65-cyclic-polynomial-codes.md)
