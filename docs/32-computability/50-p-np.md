---
title: P 与 NP
lesson_id: computability/p-np
prereqs:
  - computability/undecidable-families
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - polynomial-verifier
  - nondeterministic-polynomial-time
applications:
  - scheduling
  - combinatorial-search
exits:
  - engineering
  - research
---

# P 与 NP

## 1. 从一个场景开始

给你一个数独答案，检查每行每列很快；从头找出答案却可能要试很多格。密码也一样：验证钥匙能开锁容易，盲猜钥匙可能极难。

P 与 NP 把这种差别形式化：P 里的问题能在多项式时间内解决；NP 里的问题若有正确答案，就能在多项式时间内验证。它们是否相等，是计算机科学最著名的未解问题之一。

## 2. 直觉解释

NP 不是“非多项式”，而是 **Nondeterministic Polynomial time** 的缩写。更好的日常翻译是“可高效验证的 yes 实例”。

想象搜索迷宫：

1. 找出口可能要尝试大量岔路；
2. 但如果有人递来一张路线图，你只需沿图走一遍；
3. 路线图长度不能太夸张，检查时间也要可控；
4. 这张短路线图叫**证书**。

若每个 yes 实例都有这样的短证书，并且证书总能在多项式时间内查完，这个问题就在 NP。

## 3. 正式定义

**P** 是所有可在多项式时间内由确定性图灵机判定的语言组成的类：存在常数 $c,k$，机器在 $O(n^k)$ 内对长度为 $n$ 的输入接受或拒绝。

**NP** 是存在多项式时间验证器的语言组成的类。验证器 $V(x,c)$ 接收输入 $x$ 和候选证书 $c$，满足：

$$x\in L \Longleftrightarrow \exists c,\ |c|\le p(|x|),\ V(x,c)=1$$

其中 $p$ 是多项式，$c$ 的长度受输入规模的多项式限制。

显然 $P\subseteq NP$：找到答案的算法本身就可以当作验证器，忽略证书。反向是否成立即 $P\overset?=NP$，至今未解。

## 4. 分步例题

例题：子集和问题——给定一组正整数，问能否选出一些数使其和恰好等于目标。

1. **搜索视角**：每个数可选可不选，暴力检查最多 $2^n$ 个子集。
2. **证书视角**：若答案是 yes，证书就是选中的下标列表。
3. **验证步骤**：把证书中的数相加；
4. **比较**：判断总和是否等于目标；
5. **代价**：列表长度不超过 $n$，加法和比较都是多项式时间，所以属于 NP。

注意：这个论证没有说子集和一定难解，也没有证明 P 不等于 NP。它只说明“yes 有短证明”。

## 5. 动手实验

### 实验 1：指数搜索空间

```viz
{
  "type": "plot",
  "title": "二选一决策的数量爆炸",
  "expr": "2^x",
  "xmin": 1,
  "xmax": 10
}
```

曲线显示 $2^x$。想象一条高度为 $x^k$ 的多项式曲线：当 $k$ 固定时，指数曲线终会远超它。NP 允许搜索树巨大，但要求每条成功路径的证明仍然短小可查。

### 实验 2：先验证，再谈搜索

```python title="子集和的证书验证器"
numbers = [3, 7, 12, 25, 40]      # 候选数字列表
target = 22                       # 目标和

certificate = [0, 1]              # 证书：选中下标 0 和 1

def verify_subset(indices):       # indices 是候选证书
    total = 0                     # 累加器从 0 开始
    for i in indices:
        if i < 0 or i >= len(numbers):  # 越界证书直接拒绝
            return False, total
        total += numbers[i]       # 把选中数字加入总和
    return total == target, total # 只有总和恰好等于目标才算有效

ok, seen = verify_subset(certificate)
print(ok, seen)
```

证书 `[0, 1]` 对应 3 加 7，总和 10，所以验证失败。只取 `[0, 2]` 也只有 15，同样过不了关；把它改成 `[0, 1, 2]` 后，3 加 7 加 12 正好命中目标 22。你可以继续尝试重复下标或越界下标，体会验证器必须拒绝所有作弊证书。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 NP 表示“不可能在多项式时间解决”。那是对 NP 的常见误读；若 P 等于 NP，NP 问题全部有多项式算法。

**误区二**：你以为 no 实例也有短证书。NP 的定义只保证 yes 方向存在可验证证书；no 方向对应补集类。

**误区三**：你以为指数搜索必然必要。某些看似巨大的搜索空间有动态规划或组合捷径；“尚未找到快算法”不等于“已证明不存在”。

:::

## 7. 练习

```exercise
# @title: 练习：修复证书验证器
# @check: False 5
# @check: True 22
# @hint: 重复使用同一个下标会作弊；应检查新下标是否已经出现过。
numbers = [5, 8, 9, 14]
target = 22

def verify_subset(indices):
    total = 0
    for i in indices:
        total += numbers[i]
    return total == target, total

ok, total = verify_subset([0, 0, 3])   # 解包赋值：取出判定结果与总和
print(ok, total)
ok, total = verify_subset([0, 1, 2])
print(ok, total)
```

初始代码允许重复取第 0 个数，错误证书会得到 24 并被判假；但问题更严重：同一个下标被重复计入。请加入已见下标检查，使重复证书在第二个重复项处立即失败，并返回当时的部分和 5。正确证书 5 加 8 加 9 应通过。

<details>
<summary>点开查看逐步解答</summary>

维护 `seen = []`。每轮遇到下标 `i` 时，先判断 `i in seen`；若在，立即返回假和当时累加器里的总和 5。否则追加 `i` 并累加。对 `[0, 0, 3]`，第二个 0 被拒绝；对 `[0, 1, 2]`，5 加 8 加 9 正好是 22，返回真。验证器的时间随证书长度线性增长，而证书长度不超过数字个数，因此符合 NP 的多项式验证要求。

</details>

## 8. 快问快答

```quiz
一个问题属于 NP 的关键理由是什么？
- 目前只能写指数算法
- yes 实例有多项式长度的证书并能快速验证 [*]
- 所有实例都能立刻解决
? NP 的定义围绕高效验证，而不是我们对算法的无知。
```

## 9. 选读：两种等价视角

<details>
<summary>选读 · 验证器与非确定机</summary>

NP 也可以用非确定性图灵机定义：机器在每一步可以“猜”一个分支，若存在某个猜测序列导致多项式时间内接受，则输入属于语言。验证器视角把猜测序列显式写成证书；非确定机视角把证书隐藏在分支选择中。两个定义等价，因为猜测序列长度和时间都可由多项式约束。这个等价让我们可以在直觉和证明之间自由切换。

</details>

## 10. 下一站

P 与 NP 的分界还没看清，但困难可以在 NP 内部传播。下一课给归约加上多项式时间限制，准备定义“最难的那批代表”。

→ [多项式归约](./55-polynomial-reductions.md)
