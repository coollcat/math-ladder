---
title: PSPACE 与指数时间
lesson_id: computability/pspace-exp-time
prereqs:
  - computability/complexity-map
volume: 3
layer: L4
track:
  - discrete-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - pspace
  - exptime
applications:
  - game-solving
  - planning-search
exits:
  - research
---

# PSPACE 与指数时间

## 1. 从一个场景开始

下一盘棋时，你不需要同时记住所有未来棋局；你可以递归地问：“如果我走这里，对方那样应，我还能赢吗？”问完一层就擦掉草稿，再问下一层。

这就是 PSPACE 的气质：草稿纸很小，但思考链条可以很长。

## 2. 直觉解释

多项式空间机器允许使用 $n^k$ 个工作格。它当然也可能花很长时间；不过只要每次递归都复用同一块工作区，就不必把整棵搜索树存下来。

深度优先搜索就是这样：栈上只放当前路径，兄弟分支依次尝试。若路径深度是多项式，每层记录多项式信息，总空间仍是多项式，尽管分支总数可能是指数。

指数时间类 EXPTIME 则直接放宽时间预算。它能枚举长度指数的状态序列，因此足以模拟多项式空间机器的所有可能格局。

## 3. 正式定义

$$PSPACE=DSPACE(n^{O(1)})$$

表示确定性图灵机只用多项式空间判定的语言类。

$$EXPTIME=\bigcup_{k\ge1}TIME(2^{n^k})$$

一个多项式空间机器在某输入上的不同格局数量至多是指数个；若走太久而不停，要么复现格局，要么进入可检测的循环结构。通过系统探索这些格局，可以在指数时间内模拟它，所以

$$PSPACE\subseteq EXPTIME$$

许多广义两人游戏的胜负判定天然落在 PSPACE 或 EXPTIME：状态可紧凑表示，但胜负链可能很长。

## 4. 分步例题

例题：判断一个小型取石游戏是否有先手必胜策略。规则：一堆 4 颗石子，每次取 1 或 2 颗；取走最后一颗者胜。

1. 状态只需记录剩余石数和轮到谁；
2. 从终局倒推：剩 0 颗且轮到你时，你没有动作，所以是败局；
3. 剩 1 或 2 颗时，当前玩家可一次取完，必胜；
4. 剩 3 颗时，无论取 1 还是 2，都会给对手留下 2 或 1，必败；
5. 剩 4 颗时，先手取 1 颗，把 3 颗留给对手，必胜。

整个过程只需要几个状态格，却展开了多条未来线。这正是空间小、时间分支多的典型形态。

## 5. 动手实验

### 实验 1：小草稿跑长链条

```viz
{
  "type": "proof-trail",
  "title": "空间小而链条长",
  "steps": [
    { "id": "入口", "text": "只保留当前局面" },
    { "id": "分支", "text": "依次尝试合法动作" },
    { "id": "回溯", "text": "擦掉本层临时记录" },
    { "id": "汇总", "text": "把胜负传回上一层" }
  ],
  "edges": [["入口", "分支"], ["分支", "回溯"], ["回溯", "汇总"]]
}
```

注意“擦掉”两个字。如果每一层的所有分支都永久保存，空间就会随树宽爆炸；复用草稿才体现 PSPACE 直觉。

### 实验 2：四颗石子的极小博弈树

```python title="取石游戏倒推表"
wins = {0: False}                     # 剩 0 颗且轮到你时，你已经输了

for stones in range(1, 5):            # 从小到大倒推，最多五个状态
    can_win = False                   # 先假设没有获胜动作
    for take in [1, 2]:               # 尝试两种合法动作
        if stones - take >= 0 and wins[stones - take] is False:  # is False 判断布尔值恰为假
            can_win = True            # 把必败态留给对手
            break
    wins[stones] = can_win
    print(stones, wins[stones])
```

表格显示剩 1、2、4 颗时先手必胜，剩 3 颗时必败。这里用字典保存全部五个结果是为了教学清晰；真正强调空间复用时，可以只保留最近两个状态。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 PSPACE 问题一定比 NP 问题难到不可碰。许多小游戏在小规模上仍能手工或程序求解。

**误区二**：你以为多项式空间意味着运行也多项式时间。空间允许重复使用，时间消耗可能指数增长。

**误区三**：你以为指数时间一定不可行。当输入规模固定很小，或者实际常数很小时，精确算法也可能跑得动。

:::

## 7. 练习

```exercise
# @title: 练习：修正取石倒推条件
# @check: 1 True
# @check: 2 True
# @check: 3 False
# @hint: 只要存在一种取法让对手落到必败态，当前玩家就必胜。
wins = {0: True}

for stones in range(1, 4):
    can_win = True
    for take in [1, 2]:
        if stones - take >= 0 and wins[stones - take] is False:
            can_win = True
            break
    wins[stones] = can_win
    print(stones, wins[stones])
```

初始表把剩 0 颗设为 True，语义颠倒：轮到你却没有石子，应当是输。请把起点改为 False，并把 `can_win` 初始值改成 False，只有找到对手必败的后继才置 True。

<details>
<summary>点开查看逐步解答</summary>

修正后：剩 1 或 2 颗时可直接取完，让对手进入状态 0，所以为 True；剩 3 颗只能给对手留下 2 或 1，两种后继对手都胜，所以为 False。倒推的核心是把“我赢”定义为“存在一个动作使对手输”，把“我输”定义为“所有动作都让对手赢”。

</details>

## 8. 快问快答

```quiz
PSPACE 相比 NP 更突出的资源特征是什么？
- 只允许常数时间
- 允许多项式空间且不限制时间为多项式 [*]
- 不允许递归
? PSPACE 强调工作空间受多项式约束，时间可以远超多项式。
```

## 9. 选读：萨维奇定理的方向感

<details>
<summary>选读 · 非确定空间可以确定性模拟</summary>

Savitch 定理证明 $NSPACE(f(n))\subseteq DSPACE(f(n)^2)$。粗略地说，可以用分治询问“能否在至多 $t$ 步内从格局 A 到格局 B”，并在递归中复用空间。这个平方开销在多项式层面不改变类的归属，因此 PSPACE 与 NPSPACE 相等。它也帮助解释为什么非确定性思想在空间复杂度中不像在时间复杂度中那样留下巨大未知缺口。

</details>

## 10. 下一站

本章的概念已经走完一圈。最后一课把这些工具收进一张方法地图，训练你在新问题前选择合适的证明武器。

→ [方法地图](./90-methods-map.md)
