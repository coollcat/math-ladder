---
title: 奇偶校验
lesson_id: coding-theory/parity-check
prereqs:
  - coding-theory/repetition-code
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
  - even-parity
applications:
  - serial-ports
  - memory-checks
exits:
  - engineering
---

# 奇偶校验

## 1. 从一个场景开始

老式串口每传一组数据都会多送一位：不是新消息，而是一句承诺——“这一整组的 1 应该有偶数个”。接收方一数，发现承诺破产，就知道信道捣乱了。

## 2. 直觉解释

偶校验给 $k$ 个数据位追加一个校验位，使整个块的 1 的总数变成偶数。校验位像一块拼图，专门补齐奇偶形状。

它很便宜：每 $k$ 位只花 1 位。但它也很有限：只能听见警报，不能指出凶手；而且若两位同时翻转，奇偶形状又恢复平衡，警报不会响。

## 3. 正式定义

对数据位 $d_1,\ldots,d_k$，定义偶校验位：

$$p=d_1+d_2+\cdots+d_k\pmod 2.$$

码字为 $(p,d_1,\ldots,d_k)$。接收时计算全部 $n=k+1$ 位的和模 2，称为**校验子**：

$$s=\sum_{i=1}^{n} c_i\pmod 2.$$

偶校验规则下，$s=0$ 表示通过检查，$s=1$ 表示检测到奇数个错误。

## 4. 分步例题

数据为 `1011`。

1. 数据中有 3 个 1；
2. 为了让总数变偶数，校验位补 1；
3. 码字是 `11011`（首位为校验位）；
4. 若第 4 位由 1 翻成 0，收到 `11001`；
5. 收到块只有 3 个 1，校验子为 1，报警。

若第 3、4 位同时翻转，收到 `11101`，仍有 4 个 1，校验子为 0；检错失败。

## 5. 动手实验

### 实验 1：二格钟面就是奇偶机器

```viz
{
  "type": "clockmod",
  "m": 2,
  "title": "每按一次代表遇到一个 1"
}
```

把滑杆 $k$ 调成 1，每按一次按钮相当于遇到一个 1。落点在 0 表示当前 1 的个数是偶数，落点在 1 表示奇数。这就是模 2 加法。

### 实验 2：编码与报警

```python title="偶校验编码器"
data = [1, 0, 1, 1]
parity = sum(data) % 2      # % 2：只保留除以 2 的余数，实现模 2 加法
codeword = [parity] + data  # +：连接两个列表

def syndrome(block):
    total = sum(block)      # sum 可直接统计列表里的 1
    return total % 2

received = list(codeword)
received[3] = 1 - received[3]   # 模拟第 4 位翻转

print("parity   =", parity)
print("codeword =", codeword)
print("received =", received)
print("syndrome =", syndrome(received))
```

把翻转语句执行两次，或改成一个函数连续翻转两个不同位置，再看校验子如何回到 0。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为校验位就是重复某一位。它由整组数据的奇偶性决定，位置换了值也要重算。

**误区二**：你以为校验子为 0 就一定无错。偶数个错会互相抵消，奇偶校验看不见它们。

**误区三**：你以为知道“有错”就能纠错。单个校验方程只有一个警报灯，无法区分哪一位翻转。

:::

## 7. 练习

```exercise
# @title: 练习：补上偶校验位并判断接收块
# @check: parity=1
# @check: syndrome=1
# @hint: 先数数据中的 1；接收后再对所有码位求和并取模 2。
data = [1, 1, 0, 1]
parity = 0
received = [1, 1, 1, 0, 0]
syndrome = 0

print(f"parity={parity}")
print(f"syndrome={syndrome}")
```

<details>
<summary>点开查看逐步解答</summary>

数据 `1101` 有三个 1，所以偶校验位为：

$$1+1+0+1\equiv1\pmod 2.$$

接收块 `11100` 也有三个 1，因此：

$$s=1+1+1+0+0\equiv1\pmod 2.$$

正确代码是：

```python
data = [1, 1, 0, 1]
received = [1, 1, 1, 0, 0]
parity = sum(data) % 2
syndrome = sum(received) % 2
print(f"parity={parity}")
print(f"syndrome={syndrome}")
```

</details>

## 8. 快问快答

```quiz
偶校验收到的块恰好有两位被翻转，校验子通常是多少？
- 1
- 0 [*]
- 无法确定
? 每次翻转都会让奇偶性反一次；两次翻转回到原来的偶数状态，所以普通奇偶校验不报警。
```

## 9. 选读：从一条警报到一组方程

<details>
<summary>选读 · 为什么需要更多校验位</summary>

一条奇偶方程只能给出 0 或 1 这两种诊断结果，信息量太少。若设计多条方程，让每位参与不同的组合，校验子就不只是警报，还能像地址一样指向出错位置。Hamming 码正是把这条路走到极致：用 3 条方程保护 4 个数据位，并能纠正 1 个错。

</details>

## 10. 下一站

要谈“安全区”和“最近邻居”，先要给二进制串之间的差异定一把尺子。

→ [Hamming 距离](./30-hamming-distance.md)
