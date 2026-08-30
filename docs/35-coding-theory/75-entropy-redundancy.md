---
title: 信息论衔接：冗余与熵预告
lesson_id: coding-theory/entropy-redundancy
prereqs:
  - coding-theory/ldpc-preview
  - exponents/log
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
  - shannon-entropy-preview
applications:
  - compression-pipeline
  - communication-budget
exits:
  - data-ai
  - research
---

# 信息论衔接：冗余与熵预告

## 1. 从一个场景开始

压缩算法拼命删冗余，纠错码拼命加冗余，它们是不是互相拆台？其实不是。先删掉无用的统计冗余，再按信道需要加入结构化保护，才是现代通信流水线。

## 2. 直觉解释

如果一个符号总是出现，它几乎没有新意；如果十二个符号几乎等可能，猜中任何一个都很费信息。**熵**衡量平均不确定度，单位通常是比特。

编码理论关心两件事：

- 信源编码尽量让平均码长靠近熵；
- 信道编码再按噪声水平加入可控冗余。

## 3. 正式定义

离散信源取值 $x_i$，概率为 $p_i$，熵定义为：

$$H(X)=-\sum_i p_i\log_2 p_i.$$

约定 $0\log_2 0=0$。二元信源的熵简化为：

$$h(p)=-p\log_2p-(1-p)\log_2(1-p).$$

当 $p=0$ 或 1 时没有不确定性，$h(p)=0$；当 $p=1/2$ 时最不可预测，$h(p)=1$ 比特每符号。

## 4. 分步例题

信源概率为 $0.5,0.25,0.125,0.125$。

1. 四项贡献分别是 $0.5\times1$、$0.25\times2$、$0.125\times3$、$0.125\times3$；
2. 相加得到 $0.5+0.5+0.375+0.375=1.75$；
3. 所以 $H=1.75$ 比特每符号；
4. 若给四个符号固定 2 位编号，平均长度 2 位，仍有约 0.25 比特的压缩空间。

这 0.25 比特属于统计冗余；信道编码随后可能故意把它换成抗错结构。

## 5. 动手实验

### 实验 1：二元熵的小山峰

```viz
{
  "type": "plot",
  "title": "横轴 p 是符号 1 出现的概率",
  "expr": "-(x*log(x)+(1-x)*log(1-x))/log(2)",
  "label": "二元熵 h(p)",
  "xmin": 0.01,
  "xmax": 0.99,
  "sliders": []
}
```

曲线在 $p=0.5$ 处达到最高点 1。越靠近 0 或 1，结果越确定，可用更短的平均码长表达。

### 实验 2：第一次正式使用 math.log2

以前我们见过 `math.log`；换底公式 $\log_bx=\frac{\ln x}{\ln b}$ 能算任意底。为了频繁写二进制熵，这里引入直接工具 `math.log2`：

$$\texttt{math.log2}(x)=\log_2x.$$

```python title="计算四符号信源的熵"
import math  # math 已在早期课程登场；本课首次使用它的 log2 方法

probabilities = [0.5, 0.25, 0.125, 0.125]
entropy = 0                     # 熵是各项贡献之和
for p in probabilities:
    if p > 0:
        term = -p * math.log2(p)   # log2(p)：返回以 2 为底的对数
        entropy += term

average_fixed_length = 2 * len(probabilities) / len(probabilities)
print("entropy =", entropy)
print("fixed   =", average_fixed_length)
print("saving  =", average_fixed_length - entropy)
```

把概率改成 `[1, 0, 0, 0]`，熵会变成 0；改成 `[0.25, 0.25, 0.25, 0.25]`，熵正好是 2。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为冗余都是坏事。统计冗余妨碍压缩，但受控代数冗余正是纠错的燃料。

**误区二**：你以为熵是消息的重要程度。它度量概率分布的不确定性，不评价内容是否有意义。

**误区三**：以为压缩后再纠错一定浪费。顺序通常相反：先源编码去统计冗余，再信道编码加保护结构。

:::

## 7. 练习

```exercise
# @title: 练习：比较平均码长与熵
# @check: entropy=1.5
# @check: saving=0.5
# @hint: 概率为 0.5,0.25,0.25；固定 2 位编码的平均长度仍是 2。
import math  # 本课已正式介绍 log2

probabilities = [0.5, 0.25, 0.25]
entropy = 0
for p in probabilities:
    entropy += p * math.log2(p)   # 少了负号是常见错误
average_length = len(probabilities)
saving = average_length + entropy
print(f"entropy={entropy}")
print(f"saving={saving}")
```

<details>
<summary>点开查看逐步解答</summary>

熵为：

$$0.5\times1+0.25\times2+0.25\times2=1.5.$$

固定两位编码的平均长度也是 2，所以节省：

$$2-1.5=0.5.$$

正确代码要把贡献前加负号，并用减法求节省量。

```python
probabilities = [0.5, 0.25, 0.25]
entropy = 0
for p in probabilities:
    entropy += p * math.log2(p)
entropy = -entropy                 # 每项自信息是负的对数，最后统一取负更直观
average_length = 2
saving = average_length - entropy
print(f"entropy={entropy}")
print(f"saving={saving}")
```

</details>

## 8. 快问快答

```quiz
某个二元信源永远输出 1。它的二元熵是多少？
- 1
- 0 [*]
- 无穷大
? 结果完全确定，接收者不需要新信息；因此熵为 0。
```

## 9. 选读：两条定理的分工

<details>
<summary>选读 · 香农的两端</summary>

无损源编码定理解释了平均码长能压到哪里：逼近熵。 noisy channel coding theorem 则说，只要速率低于信道容量，就存在能让错误率任意小的码。前者负责效率，后者负责可靠；本章讲的是后者的入门结构，第 40 章会把两端完整展开。

</details>

## 10. 下一站

现在可以把重复码、Hamming 码、循环码、卷积码和 LDPC 放回同一张地图。

→ [编码理论方法地图](./80-method-map.md)
