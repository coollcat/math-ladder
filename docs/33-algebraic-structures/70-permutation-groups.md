---
title: 置换群与对称
lesson_id: algebraic-structures/permutation-groups
prereqs:
  - algebraic-structures/finite-fields
volume: 3
layer: L2
track:
  - algebra-structure
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - permutation-group
  - symmetric-group
applications:
  - shuffling
  - symmetry-analysis
exits:
  - engineering
  - research
---

# 置换群与对称

## 1. 开场钩子

一副四张牌可以洗成很多顺序：第一张去第三位，第二张去第一位，等等。

洗牌不是数字加法，而是位置的搬运。所有可能的搬运放在一起，构成一个群。

## 2. 直觉解释

置换是一一重排：每个位置恰好被占用一次，没有空位也没有挤压。

两个置换接连执行，仍是置换；什么都不做是单位元；任何重排都可以倒回去。因此 $n$ 个对象的所有置换组成群，叫对称群 $S_n$。

## 3. 正式定义

集合 $\lbrace1,2,\ldots,n\rbrace$ 到自身的双射称为一个 **$n$ 元置换**。所有 $n$ 元置换在复合运算下组成的群称为对称群：

$$S_n=\lbrace \sigma:\lbrace1,\ldots,n\rbrace\to\lbrace1,\ldots,n\rbrace\ \text{且}\ \sigma\ \text{是双射}\rbrace.$$

若按“先 $\tau$ 后 $\sigma$”复合，则：

$$ (\sigma\circ\tau)(i)=\sigma(\tau(i)). $$

$n=3$ 时 $|S_3|=3!=6$；一般地 $|S_n|=n!$。

## 4. 分步例题

设 $\sigma=[2,0,1]$ 表示位置 0 的牌到第 2 格，位置 1 到第 0 格，位置 2 到第 1 格。取

$$\tau=[0,2,1].$$

1. 先做 $\tau$：位置 0 不动；
2. 再做 $\sigma$：它把原位置 0 送到 2；
3. 所以 $(\sigma\circ\tau)(0)=2$；
4. 同理得到复合表 $[2,1,0]$；
5. 这仍是一个双射。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "三张牌的一个置换",
  "left": ["旧0", "旧1", "旧2"],
  "right": ["新0", "新1", "新2"],
  "arrows": [[0, 2], [1, 0], [2, 1]]
}
```

点击圆点改变箭头。合法置换必须每行一条箭头、每列只被射中一次；只要出现分叉或落单，就不再是置换。

```python title="用列表计算置换复合"
sigma = [2, 0, 1]
tau = [0, 2, 1]
composition = [None] * len(sigma)   # None 占位：稍后逐个填入复合结果

for i in range(len(sigma)):
    composition[i] = sigma[tau[i]]

print(composition)
```

这里列表下标表示旧位置，值表示新位置。`composition[i]` 先问 $\tau$ 把 $i$ 送到哪里，再让 $\sigma$ 接力。

## 6. 练习

```exercise
# @title: 练习：求四张牌的复合与逆
# @check: composition=[3, 0, 2, 1]
# @check: sigma_inverse=[1, 2, 0, 3]
# @hint: 复合用 p[q[i]]；逆元要反查“谁把我送到当前位置”。
sigma = [2, 0, 1, 3]
tau = [3, 1, 0, 2]
composition = [0, 0, 0, 0]
sigma_inverse = [0, 0, 0, 0]

for i in range(4):
    composition[i] = tau[sigma[i]]
    sigma_inverse[sigma[i]] = sigma_inverse[sigma[i]] + 1

print("composition=" + str(composition))
print("sigma_inverse=" + str(sigma_inverse))
```

<details>
<summary>点开查看逐步解答</summary>

复合应改为先 $\tau$ 后 $\sigma$，逆元则反查每个位置的去向：

```python
sigma = [2, 0, 1, 3]
tau = [3, 1, 0, 2]
composition = [None] * len(sigma)   # None 占位：稍后逐个填入复合结果
sigma_inverse = [None] * len(sigma)

for i in range(len(sigma)):
    composition[i] = sigma[tau[i]]
    sigma_inverse[sigma[i]] = i

print(composition)
print(sigma_inverse)
```

于是：

$$[\sigma(\tau(0)),\sigma(\tau(1)),\sigma(\tau(2)),\sigma(\tau(3))]=[3,0,2,1].$$

逆元反查则得到 `[1,2,0,3]`。

</details>

## 7. 常见误区

**误区一**：你以为任何列表都是置换。必须检查值不重复且范围完整。

**误区二**：你以为置换复合一定交换。先翻面再旋转，通常不同于先旋转再翻面。

**误区三**：你以为对称只有镜像。旋转、循环移位、洗牌都是对称动作。

## 8. 快问快答

```quiz
S_5 有多少个元素？
- 10
- 25
- 120 [*]
? 五个对象的全排列数为 5!=120。
```

## 9. 选读：轮换记号

<details>
<summary>选读 · 把长链条缩短</summary>

置换 $[1,2,0]$ 可写成轮换 $(0\,1\,2)$：0 到 1，1 到 2，2 回到 0。不相交轮换可以交换，例如 $(0\,1)(2\,3)$。这种记号让逆元一目了然：倒读每个轮换即可。

</details>

## 10. 下一站

置换群常描述物体的对称。下一课用群作用统一“物体”和“动作”，并学会数出真正不同的图案。

→ [群作用与计数选讲](./75-group-actions-counting.md)
