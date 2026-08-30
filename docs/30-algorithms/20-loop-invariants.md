---
title: 循环不变式与正确性
lesson_id: algorithms/loop-invariants
prereqs:
  - math-language/induction-advanced
  - sequences/induction
  - python-tools/conventions
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - loop-invariant
  - initialization-maintenance-termination
  - correctness-proof
applications:
  - program-verification
  - algorithm-review
exits:
  - engineering
  - research
---

# 循环不变式与正确性

## 1. 从一个场景开始

一段累加代码跑了一万组测试全对。它能证明"对任意长度的列表都正确"吗？测试只能覆盖有限个输入，而列表长度没有上限。

数学家的做法：给循环找一个**每圈都成立的承诺**，然后像多米诺一样推出结论。这个承诺就是循环不变式——它是归纳法在代码世界的化身。

## 2. 直觉解释

把循环想成转圈圈的摩天轮，不变式是**每次座舱经过最低点时你都检查的那句话**：

> "到目前为止，累加器 acc 恰好等于已扫过元素的总和。"

- 转动**前**（一圈都还没转）：acc = 0，扫过 0 个元素——承诺成立；
- 每转一圈：新元素加入 acc，"已扫过"也多一个——承诺继续成立；
- 转**完**停下：扫过的就是全部元素，所以 acc 等于总和——这正是我们要的结论！

三步曲有个口诀：**起点成立、每圈保住、终点收货**。数学上分别叫初始化、保持、终止。

## 3. 正式定义

对循环 `for k in range(...)` 与变量状态 $S_k$（第 $k$ 圈结束时的快照），**循环不变式**是关于状态的命题 $P(k)$，满足三条：

| 性质 | 含义 | 对应归纳法 |
| --- | --- | --- |
| 初始化 | 循环开始前 $P(0)$ 为真 | 基础步 |
| 保持 | 若 $P(k)$ 真，则该圈执行后 $P(k{+}1)$ 真 | 归纳步 |
| 终止 | 循环结束时，$P$ 连同停止条件给出所需结论 | 结论提取 |

以累加为例，不变式 $P(k)$："第 $k$ 圈结束后，$\text{acc} = x_1 + x_2 + \cdots + x_k$"。保持性的验证只需盯住单圈代码 `acc = acc + x[k]`——这正是归纳法"只证一步、其余交给链条"的省力哲学。

## 4. 分步例题

**例**：用不变式证明下面代码算出的是列表所有数之和。

```python
nums = [3, 6, 9]
total = 0
for v in nums:
    total = total + v
```

1. **写不变式**：第 $k$ 圈后，`total` 等于 `nums` 前 $k$ 个元素之和；
2. **初始化**：开跑前 `total = 0`，前 0 个数的和定义为 0 ✓；
3. **保持**：设第 $k$ 圈后承诺成立，第 $k+1$ 圈执行 `total = total + nums[k]`，于是新值 = 前 $k$ 个之和 + 第 $k{+}1$ 个 = 前 $k{+}1$ 个之和 ✓；
4. **终止**：循环共跑 `len(nums)` 圈，结束时 `total` = 全部元素之和——正是目标。

注意我们**从未运行程序**就得到了对一切列表成立的结论——这就是不变式的威力。

## 5. 动手实验

### 实验 1：先把“保持性”推倒一次

不变式的三步曲和多米诺链同构：第一块立住是初始化，倒下一块推倒下一块是保持性，最后一块倒下就是终止时收货。把间距拉大，观察归纳步在哪里断掉：

```viz
{
  "type": "domino",
  "n": 8
}
```

只要有一处够不着，后面的结论就全部悬空；这比口头强调“每圈都要保住”更直观。

### 实验 2：给不变式拍 X 光片

每圈都检查一次"承诺还成立吗"，把偏差画成图——健康的不变式偏差恒为 0：

```python title="逐圈验证不变式：acc == 前缀和"
import matplotlib.pyplot as plt

nums = [3, 1, 4, 1, 5, 9, 2, 6]

acc = 0
prefix = 0          # 用另一条"标准答案"通道独立计算前缀和
residuals = []      # residual（残差）= acc 减去真实前缀和，理想情况恒为 0
for step in range(len(nums)):
    acc = acc + nums[step]
    prefix = prefix + nums[step]
    residuals.append(acc - prefix)   # append：记录本圈残差

print(f"每圈残差: {residuals}")
print(f"全部为 0 吗: {max(abs(r) for r in residuals) == 0}")   # 全体残差绝对值全为 0 才算通过

plt.plot(range(1, len(nums) + 1), residuals, marker="o")
plt.axhline(0, color="gray", linestyle="--")   # 零线：不变式健康线
plt.xlabel("round k")
plt.ylabel("acc - prefix_sum")
plt.title("invariant health check")
plt.ylim(-1, 1)
```

把 `acc = acc + nums[step]` 改成 `acc = acc + step` 再跑一次——折线立刻离开零线，不变式被破坏的瞬间一目了然。

### 实验 3：插入排序内圈的不变式

插入排序的核心循环有一个更漂亮的不变式："左半段永远有序"。逐步打印出来看它如何一格格扩张：

```python title="观察'前缀已有序'不变式"
cards = [5, 2, 8, 1, 9]

for i in range(1, len(cards)):
    key = cards[i]              # 抽出的牌
    j = i - 1
    while j >= 0 and cards[j] > key:   # while：条件满足就一直把大牌右移
        cards[j + 1] = cards[j]
        j = j - 1
    cards[j + 1] = key          # 把抽出的牌插回空位
    print(f"第 {i} 圈后: {cards}")
```

每一行输出里，左边那截前缀始终有序——不变式肉眼可见地长大，直到吞下整副牌。

### 快问快答

```quiz
验证循环正确性时，"初始化"这一条检查的是什么？
- 变量的名字取得好不好
- 循环开始前不变式是否已经成立 [*]
- 循环体里有没有注释
? 初始化对应归纳法的基础步：第一圈开始之前承诺必须先站得住，否则后面保得再好也没用。
```

:::warning[常见误区]

**误区一**："测试通过 = 正确性证明。" 测试是对有限输入抽样；不变式证明覆盖所有输入。两者是侦察兵和宪法的关系。

**误区二**："不变式要在循环中途才成立。" 不变式必须在**第一圈之前**就成立，且在每圈之后都成立——包括还没进门的时刻。

**误区三**："找到不变式就算证完了。" 三条缺一不可：忘了终止条件，你可能证出一个永不停止的循环"很正确"。

:::

## 6. 练习

**练习 1**：说出实验 2 中插入排序外层循环第 $i$ 圈后的不变式，并指出它为什么在第 0 圈前成立。

<details>
<summary>点开查看逐步解答</summary>

不变式："第 $i$ 圈后，cards 的前 $i$ 个元素构成有序序列（原集合相同的元素重排而已）。"第 0 圈前前缀只有 1 个元素，单个元素天然有序——基础步白送。
</details>

**练习 2**：下面的累加器有两处破坏不变式的 bug（起点错、漏加元素），修到两条输出命中为止：

```exercise
# @title: 练习：修复被破坏的不变式
# @check: 18
# @check: 4
# @hint: 不变式是"第 k 圈后 acc 等于前 k 个数之和"。检查两件事：acc 的出发值、到底加进了哪些元素。
nums = [3, 4, 5, 6]
acc = 1                    # ← 出发值对吗？前 0 个数的和应该是多少？
count = 0
for v in nums[1:]:         # ← 切片 [1:] 从下标 1 取到末尾——是不是漏掉了谁？
    acc = acc + v
    count = count + 1

print(acc)     # 期望：四个数之和
print(count)   # 期望：加过的元素个数
```

**练习 3**：线性查找循环的不变式是什么？（提示：与"target 不在前 k 个里"有关）

<details>
<summary>点开查看逐步解答</summary>

不变式："第 $k$ 圈时，若 target 在列表中，则它的下标 $\ge k$。"于是循环正常走完（没触发 break）意味着 target 不在任何位置，返回 -1 是对的；提前 break 则正好抓到它。两个出口都被不变式看管。
</details>

## 7. 选读：不变式、归纳法与停机

<details>
<summary>选读 · 三条性质为什么足够</summary>

把"第 $k$ 圈后 $P(k)$ 成立"看成数列命题。初始化给 $P(0)$，保持性给出 $P(k) \Rightarrow P(k+1)$，由数学归纳法（18-math-language 卷与 sequences 卷都练过）得对所有 $k$ 成立。循环恰在 $t$ 圈后停止且满足退出条件，于是 $P(t)$ 与退出条件同时为真——结论从这两者的合取中读出。反过来，若只能证明 $P(t)$ 却无法界定 $t$（比如 while True），正确性论证就悬空了：这就是"终止"不可省略的原因，也与可计算性卷讨论的停机问题遥相呼应。

</details>

## 8. 下一站

正确性有了保障，接下来追性能。有一类算法靠"切一半"把 $n^2$ 打到 $n\log n$——下一课拆解**分治**这台碎纸机。

→ [分治与主定理直觉](./30-divide-and-conquer.md)
