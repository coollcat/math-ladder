---
title: LDPC 思想预告
lesson_id: coding-theory/ldpc-preview
prereqs:
  - coding-theory/cyclic-polynomial-codes
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - ldpc
  - tanner-graph
applications:
  - wifi
  - 5g
exits:
  - engineering
  - research
---

# LDPC 思想预告

## 1. 从一个场景开始

现代 Wi-Fi 和 5G 不靠一个天才方程扛住所有噪声，而靠几百条很“笨”的局部检查互相作证。LDPC 的名字很长——低密度奇偶校验码——但思想可以从一个玩具警报网开始。

## 2. 直觉解释

把每个码位看成一个变量节点，把每条奇偶方程看成一个检查节点：

- 变量节点只和少数检查节点相连；
- 检查节点也只看少数几位；
- 一位出错会让多条检查报警；
- 多个邻居交换线索，逐渐把嫌疑集中到出错位置。

这种二部图叫 **Tanner 图**。稀疏不是偷懒，而是让长块下的消息传递在计算上可行。

## 3. 正式定义

LDPC 码由一个 $m\times n$ 校验矩阵 $H$ 描述，要求 $H$ 中 1 的密度很低。合法码字仍满足：

$$Hc^T=\vec0\pmod2.$$

真实 LDPC 通常有数千到数百万位，每行、每列只有少量 1。软判决译码还会传递概率，而不只是 0/1 票数。

## 4. 分步例题

用 4 个位做微型演示，三条检查为：

```text
A: 位1 + 位2 = 0
B: 位1 + 位3 = 0
C: 位1 + 位4 = 0
```

发送 `1111` 时三条都通过。若第 2 位翻转，收到 `1011`：

1. A 检查位 1、2：$1+0=1$，报警；
2. B 检查位 1、3：$1+1=0$，安静；
3. C 检查位 1、4：$1+1=0$，安静；
4. 只有 A 报警，指向位 2。

若第 1 位翻转，A、B、C 同时报警；线索重叠让位置可辨。

## 5. 动手实验

### 实验：把校验子当线索指纹

```python title="小型稀疏检查网的硬判决线索"
received = [1, 0, 1, 1]       # 原本发送 1111，第 2 位被翻转
checks = [
    ("A", [0, 1]),            # A 检查列表下标 0 和 1，也就是位 1、2
    ("B", [0, 2]),            # B 检查位 1、3
    ("C", [0, 3])             # C 检查位 1、4
]

syndrome = []                 # 每项形如 (检查名, 是否报警)
for name, indexes in checks:
    total = 0
    for i in indexes:
        total += received[i]
    alarm = total % 2         # % 2：奇数个 1 就报警
    syndrome.append((name, alarm))

alarms = []
for item in syndrome:
    if item[1] == 1:
        alarms.append(item[0])

print("syndrome =", syndrome)
print("alarms   =", alarms)
print("suspect  =", "bit 2")
```

分别翻转其他下标并修改最后的嫌疑行，观察每种单错留下的报警指纹；真实 LDPC 用概率消息传递把这个思路扩展到长图。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为矩阵稀疏等于信息少。稀疏指的是每个约束只牵涉少数变量；整体约束数量仍然足够形成强码。

**误区二**：以为 LDPC 只会数报警票。高性能实现传递的是概率消息，能在多次迭代中修正中间判断。

**误区三**：以为迭代次数越多一定越好。过长迭代可能收敛慢或在小环上反复纠缠，工程要设停机条件。

:::

## 7. 练习

```exercise
# @title: 练习：计算稀疏校验子
# @check: alarms=['B']
# @hint: B 只检查位 1 和位 3；逐条求和后取模 2。
received = [1, 1, 0, 1]
a = (received[0] + received[1]) % 2
b = (received[0] + received[2]) + 1
c = (received[0] + received[3]) % 2
alarms = []
if a == 1:
    alarms.append("A")
if b == 1:
    alarms.append("B")
if c == 1:
    alarms.append("C")
print(f"alarms={alarms}")
```

<details>
<summary>点开查看逐步解答</summary>

三条检查分别是：

```text
A: 位1+位2 = (1+1)%2 = 0，安静
B: 位1+位3 = (1+0)%2 = 1，报警
C: 位1+位4 = (1+1)%2 = 0，安静
```

初始代码只有 b 那一行算错了：它把和加了 1 而不是对 2 取模，得到 2，永远不等于报警值 1。把那一行改成取模即可：

```python
b = (received[0] + received[2]) % 2   # 原来写成了 + 1，改成 % 2
a = (received[0] + received[1]) % 2
c = (received[0] + received[3]) % 2
alarms = []
if a == 1:
    alarms.append("A")
if b == 1:
    alarms.append("B")
if c == 1:
    alarms.append("C")
print(f"alarms={alarms}")
```

其余不动，最终输出 `alarms=['B']`。注意 received 仍是练习里的 `[1, 1, 0, 1]`：第 3 位被翻成了 0，而 B 恰好检查位 1 和位 3，所以指纹指向它。

</details>

## 8. 快问快答

```quiz
Tanner 图中的两类节点分别是什么？
- 发送节点与接收节点
- 变量节点与检查节点 [*]
- 数据节点与时钟节点
? 变量节点代表码位，检查节点代表奇偶方程；连线表示该位参与该方程。
```

## 9. 选读：为什么长块反而有利

<details>
<summary>选读 · 集中律的直觉</summary>

随机噪声在超长块里不会均匀得像理想曲线，但大数定律类的集中现象会让大多数局部证据彼此一致。稀疏图允许译码器只和少数邻居交流，却通过多轮传播汇聚全局判断。这正是 LDPC 在接近香农极限的同时保持可实现性的原因之一。

</details>

## 10. 下一站

检错、纠错都在加冗余；压缩却在去冗余。两者并不矛盾，下一课用熵把它们接起来。

→ [冗余与熵预告](./75-entropy-redundancy.md)
