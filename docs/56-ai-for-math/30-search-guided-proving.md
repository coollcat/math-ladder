---
title: 搜索制导的证明：从穷举到神经引导
lesson_id: ai-math/search-guided-proving
prereqs:
  - ai-math/formal-proof-assistant
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - tree-search-proof
  - neural-guided-search
applications:
  - alphageometry
  - automated-tactic-search
exits:
  - data-ai
---

# 搜索制导的证明：从穷举到神经引导

## 1. 从一个场景开始

上一课的检查器能判断“这一步对不对”，但它不会告诉你**该走哪一步**。证明搜索的残酷之处在于分支：一个几何问题里，过一点可以画无数条辅助线；一个策略库里，可用的推理动作成百上千。若每步有一千个动作、搜索一百层，仅一条路径的数量级就是 $10^{300}$——远超可观测宇宙的原子数，**暴力穷举必死**。

AlphaGeometry 的破局之道是双引擎协作：符号引擎负责"只走合法步"（上课的检查器），神经网络负责"猜哪条路最像人走的"。这套"直觉 + 严格"的组合拳，让它在 2024 年 1 月发表于 Nature，在 30 道国际数学奥林匹克几何题的基准上解出 25 道，接近人类金牌选手平均水平（此前最好系统只解出 10 道）。本课用一个小游戏复刻它的骨架。

## 2. 直觉解释

把证明过程画成一棵树：

- **节点** = 半成品证明状态（已知哪些事实）；
- **边** = 一步推理动作；
- **叶子** = 终局：要么抵达定理（成功），要么走进死胡同。

搜索就是在树上找一条通往成功的路。三种走法：

1. **穷举**：每个岔口都试到底——保证找到但会累死；
2. **贪心**：每次只走"看起来最近"的路——快，但容易被死胡同骗进去；
3. **引导搜索**（MCTS + 神经网络）：像老练的探险者，既尊重经验值（网络评分），又给冷门路口留探索机会。

这里已经能看到 explore/exploit 权衡的雏形；第 50 章会用 bandit 语言把它系统化——只不过那里的“臂”换成了推理动作。

## 3. 正式定义

蒙特卡洛树搜索（MCTS）反复执行四步：

$$\text{选择（UCB 准则）} \to \text{扩展} \to \text{模拟评估} \to \text{回传更新}$$

其中选择步骤用置信上界公式平衡新旧岔口：

$$\mathrm{UCB}(v) = \frac{Q(v)}{n(v)} + c\,\sqrt{\frac{\ln N}{n(v)}}$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $Q(v)/n(v)$ | 经验价值 | 节点 $v$ 过往的平均回报（exploit）|
| $\sqrt{\ln N / n(v)}$ | 探索奖励 | 越少被访问越受鼓励（explore）|
| $c$ | 探索系数 | 两股力量的汇率 |

这里的 $N$ 是父节点的访问次数。访问越少，$\sqrt{\ln N/n(v)}$ 越大；一旦反复失败，探索奖励就会衰减：

```viz
{
  "type": "plot",
  "title": "探索奖励随访问次数衰减",
  "expr": "sqrt(log(100)/x)",
  "xmin": 1,
  "xmax": 50
}
```

曲线不是最终选择值，而是公式里的探索项：新岔口靠它获得机会，老岔口则必须用真实回报留住搜索器。

在定理证明场景里，“模拟评估”可能被替换为价值网络打分或符号引擎的可达性判断。要特别注意：上面的 UCB 是可运行的教学模型；AlphaGeometry 的实际流程并不是标准 MCTS，而是符号演绎引擎和语言模型交替——语言模型提议辅助构造，符号引擎负责演绎与把关。

## 4. 分步例题

24 点游戏：给你 $3, 3, 8, 8$ 四个数，加减乘除随意组合，凑出 24。

1. 直觉路线一：$3+3=6$，剩 $\lbrace 6, 8, 8\rbrace$；$6+8=14$，再 $+8=22$ ✗、$\times8=112$ ✗……此枝全灭；
2. 回溯换招：$8-3=5$，剩 $\lbrace 5, 3, 8\rbrace$；$5\times8=40$，$40\div?=…$ 依然到不了 24；
3. 关键构造：先做除法 $8\div3=\frac{8}{3}$——分数状态！多数人类玩家到此止步；
4. 继续：$3-\frac{8}{3}=\frac{1}{3}$；最后 $8\div\frac{1}{3}=24$ ✓；
5. 复盘：胜出的前两步在贪心评分里都**更差**（离 24 更远），穷举会找到它们但要烧大量节点——这正是"评估函数盲区需要探索补偿"的活标本。

## 5. 动手实验

### 实验 1：亲手跑一棵微型证明树

```python title="24 点求解器：递归 + 回溯"
target = 24.0
tolerance = 0.000001      # 浮点比较容差：不能直接用 ==
stats = [0]               # 用列表当计数器：函数之间共享的可变盒子

def search(vals, exprs):
    # 递归：函数调用自己——每层少一个数，直到只剩 1 个
    stats[0] += 1
    if len(vals) == 1:
        if abs(vals[0] - target) < tolerance:
            print(f"解法: {exprs[0]}")
            return True
        return False
    n = len(vals)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            rest_v = []
            rest_e = []
            for k in range(n):
                if k != i and k != j:
                    rest_v.append(vals[k])
                    rest_e.append(exprs[k])
            a, b = vals[i], vals[j]
            tries = [
                (a + b, "(" + exprs[i] + "+" + exprs[j] + ")"),
                (a * b, "(" + exprs[i] + "*" + exprs[j] + ")"),
                (a - b, "(" + exprs[i] + "-" + exprs[j] + ")"),
            ]
            if abs(b) > 1e-09:                       # 防止除零
                tries.append((a / b, "(" + exprs[i] + "/" + exprs[j] + ")"))
            for v, e in tries:
                rest_v.append(v)
                rest_e.append(e)
                if search(rest_v, rest_e):
                    return True
                rest_v.pop()                         # 回溯：撤销这次尝试
                rest_e.pop()
    return False

found = search([3.0, 3.0, 8.0, 8.0], ["3", "3", "8", "8"])
print(f"是否找到: {found}")
print(f"探索节点数: {stats[0]}")
```

注意解出来的表达式带着分数中间态——正是分步例题第 3 步那步"反直觉"的构造。`stats` 会告诉你机器为此翻了多少个节点。

### 实验 2：判题小练兵

```exercise
# @title: 练习：换个目标再搜一次
# @check: 10.0
# @check: True
# @hint: 目标改成 10 之后，1,2,3,4 有整数解（提示：4*2+3-1）；只改 target 一处即可。
target = 99.0             # ← 问题在这：这个目标根本凑不出来
tolerance = 0.000001
stats = [0]

def search(vals, exprs):
    stats[0] += 1
    if len(vals) == 1:
        if abs(vals[0] - target) < tolerance:
            return True
        return False
    n = len(vals)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            rest_v = []
            rest_e = []
            for k in range(n):
                if k != i and k != j:
                    rest_v.append(vals[k])
                    rest_e.append(exprs[k])
            a, b = vals[i], vals[j]
            tries = [
                (a + b, "(" + exprs[i] + "+" + exprs[j] + ")"),
                (a * b, "(" + exprs[i] + "*" + exprs[j] + ")"),
                (a - b, "(" + exprs[i] + "-" + exprs[j] + ")"),
            ]
            if abs(b) > 1e-09:
                tries.append((a / b, "(" + exprs[i] + "/" + exprs[j] + ")"))
            for v, e in tries:
                sol = search(rest_v + [v], rest_e + [e])
                if sol:
                    return True
    return False

print(round(target, 1))
found = search([1.0, 2.0, 3.0, 4.0], ["1", "2", "3", "4"])
print(found)
```

目标 99 时程序会老实回答 False（并烧掉几千个节点）。改对后第一行打印 10.0，第二行 True。想看具体解法？把实验 1 版本的 print 搬过来即可——两份代码合体就是完整的求解报告。

## 常见误区

:::warning[常见误区]

**误区一**："搜索到了证明，就等于理解了证明。"
AlphaGeometry 的许多构造连专家都惊叹"超人类创意"——但系统自己并不知道为什么好。发现与理解是两件事，前者已被自动化，后者仍是开放问题。

**误区二**："启发式只是加速，不影响结果。"
错了。评估函数决定树往哪长：有偏的网络会把搜索永久引离某些区域——**偏见直接改变能被找到的定理集合**。"谁的数据训练了这双手"因此成为科学方法论问题。

**误区三**："MCTS 就是蒙特卡洛随机模拟。"
经典 MCTS 用随机 rollout 评估叶子；现代变体（AlphaZero 系）已用神经网络替代随机模拟。名字里的"蒙特卡洛"是历史遗产，内核是 UCB 式的最优 arms 选择。

:::

## 6. 练习

**练习 1**：手算：某节点访问 9 次、平均回报 0.6，兄弟节点只访问过 1 次（父节点共 100 次访问）。取 c=1，算两个节点的 UCB 并判断下一步选谁。

<details>
<summary>点开查看逐步解答</summary>

老节点：$0.6 + \sqrt{\ln 100 / 9} = 0.6 + 0.715 \approx 1.32$。
新节点：平均回报未知按 0 计，$0 + \sqrt{\ln 100 / 1} \approx 2.15$。
选新节点——尽管战绩空白，探索奖励把它顶了上去。多玩几轮后若它确实差，访问次数上升、奖励衰减，天平自动回摆。
</details>

**练习 2**：把实验 1 的容差 `tolerance` 改成 1e-15 再跑，观察还找不找得到 24 点的解，解释原因。

<details>
<summary>点开查看逐步解答</summary>

这台机器通常找不到：解经过 $8/3$ 这样的无限小数，浮点结果与 24 的误差约为 $10^{-14}$，会被 $10^{-15}$ 的门挡住。教训：数值搜索的容差不是细节而是**语义声明**——你要的是“数学上的相等”还是“工程上的够近”？精确答案请用分数运算（Python 标准库 fractions 可做到，此处留作延伸）。
</details>

**练习 3**：概念辨析：证明搜索与第 30 章的算法遍历（DFS/BFS）本质区别是什么？

<details>
<summary>点开查看逐步解答</summary>

结构上是同一种树遍历；差别在于**目标与资源**：算法课的图是给定的、有限的，遍历追求确定性完备；证明搜索的树是动态生成的、指数级的，完备性买不起，只能用启发式换可行性。于是"怎么剪枝""信谁的评价"成了核心——这正是引入概率与学习的入口。
</details>

```quiz
启发式函数在证明搜索中只是让程序跑得更快吗？
- 是，只要完整穷举还在，最终结果完全不变
- 不是，它会决定先探索哪些状态，可能让某些证明永远没被搜到 [*]
- 是，只要神经网络足够大就不会有偏见
? 启发式改变搜索顺序和剪枝边界。计算资源有限时，被系统性降权的区域等于被推得更远；“能否找到”因此依赖评估函数。
```

## 7. 选读：AlphaGeometry 流程拆解

<details>
<summary>选读 · 双引擎如何交接棒</summary>

AlphaGeometry 的循环：(1) 符号引擎 DDAR 从当前图形出发尽量演绎新事实；(2) 若卡壳，语言模型提议一个辅助点构造（如"取 AB 中点 E"）；(3) 引擎继续在新图上演绎；(4) 循环直至目标出现。语言模型的训练数据不需要人类示范——先随机生成定理，再用符号引擎反推需要的构造，自造大量"题目 + 灵感"对。这套"引擎造数据教模型，模型带引擎跳出局部"的自举，与 AlphaZero 自我对弈同宗。Nature 论文（Trinh 等，2024）的消融实验显示：单独保留任一引擎时，解题能力都会大幅下降——两个引擎缺一不可。
</details>

## 8. 下一站

会搜证明了，最后一站反过来：**机器能不能提出值得证的猜想**？拉马努金的梦话、连分数里的 π、以及 2021 年那台"猜想机器"，将为本章收尾。

→ [猜想生成机](./40-conjecture-generation-machine.md)
