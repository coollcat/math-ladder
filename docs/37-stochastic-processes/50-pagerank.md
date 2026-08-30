---
title: PageRank：互联网上的马尔可夫链
lesson_id: stochastic-processes/pagerank
prereqs:
  - stochastic-processes/stationary-distribution
  - graph-theory/graph-definition
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - pagerank
  - damping-teleport
applications:
  - search-ranking
  - citation-analysis
exits:
  - data-ai
---

# PageRank：互联网上的马尔可夫链

## 1. 从一个场景开始

1998 年，两位博士生要给上百亿张网页排座次：谁该排在搜索结果第一位？数链接个数？太容易被刷——建一万个空壳页指向自己就行。布林与佩奇的答案堪称本章前四课的完美合奏：

> 想象一个随机冲浪者，每一步都从当前网页的链接里**均匀随机**挑一条点下去。他一生中停留在每个网页的时间占比，就是那个网页的 PageRank。

停留占比——正是平稳分布；点击跳转——正是转移矩阵；"从哪出发无所谓"——正是遍历性。一个商业帝国的大门，钥匙全是这一章练过的基本功。

## 2. 直觉解释

**核心直觉：投票，但票值不等价。** 每个网页把自己的一票按出链数量**均分**给指向的页面；而投票者本身的分量由它的 PageRank 决定——被权威网站推荐一次，胜过被十个无名小站推荐。这不是循环论证吗？是的，而且是故意的：重要性定义本身就是一个不动点方程 $\pi P=\pi$，解出它就是排名。

两个现实障碍必须修补：

- **死胡同**：某网页没有任何出链（冲浪者被困）；
- **蜘蛛网**：一小圈页面互相引用、拒绝外出。

两者都会破坏"冲浪者自由漫步"的图景。Google 的修法简单粗暴又优雅：每一步都以小概率 $1-d$ **瞬移**到全网随机某页（想象冲浪者偶尔感到无聊）。这个"无聊因子"让整张图重新连通且无周期，遍历性定理重新生效——数学条件在这里变成了产品决策。

## 3. 正式定义

把网页集看作有向图：$j$ 指向 $i$ 则记一条边。设 $d\in(0,1)$ 为阻尼系数（实践中约取 0.85），定义 Google 矩阵

$$G=\ d\,M+\frac{1-d}{N}\mathbf{1}\mathbf{1}^\top, \qquad M_{ij}=\begin{cases}\dfrac{1}{\text{outdeg}(j)} & j\to i\\[4pt] 0 & \text{否则}\end{cases}$$

**PageRank 向量** $\pi$ 是 $G$ 的平稳分布：

$$\pi = \pi G \qquad \Longleftrightarrow \qquad \pi_i=(1-d)\cdot\frac{1}{N}+d\sum_{j\to i}\frac{\pi_j}{\text{outdeg}(j)}$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\text{outdeg}(j)$ | 出链度 | 页面 j 指向多少个页面；一票分成的份数 |
| $M$ | 链接矩阵 | 列归一的"纯投票"转移矩阵 |
| $d$ | 阻尼系数 | 跟随链接的概率；1−d 是瞬移概率 |
| $\pi_i$ | PageRank | 长期停留占比；全体求和为 1 |

读第二行的方程：你的分数 = 一点点保底流量（人人有份的瞬移）+ 邻居们按出链数摊派给你的加权票。注意**入度大不等于分数高**——票还要看是谁投的。

## 4. 分步例题

**例**：三页小网：X 只链接 Y；Y 链接 X 和 Z；Z 只链接 Y。取 $d=0$（先看纯投票版），求 PageRank。

1. 写流量守恒（流出=流入，30 课的老配方）：$\pi_X=\frac{1}{2}\pi_Y$，$\pi_Z=\frac{1}{2}\pi_Y$，$\pi_Y=\pi_X+\pi_Z$；
2. 前两式代入第三式：$\pi_Y=\frac{1}{2}\pi_Y+\frac{1}{2}\pi_Y$ ✓ 恒成立——自由度剩一个；
3. 归一化定夺：$0.5\pi_Y+\pi_Y+0.5\pi_Y=2\pi_Y=1$，得 $\pi_Y=0.5$；
4. 结论：$\pi=(0.25,\ 0.5,\ 0.25)$。Y 是唯一的枢纽：所有人最终都要路过它，尽管它自己慷慨地把票分给了别人。**送出去的票不减自己的分**——PageRank 最反直觉也最深刻的一课。

## 5. 动手实验

### 实验 1（python）：五页玩具互联网上的幂迭代

```python title="幂迭代求五页网络的 PageRank"
import matplotlib.pyplot as plt

links = {                            # 有向图的邻接表：键=页面，值=它指向谁
    "A": ["B", "C"],
    "B": ["C"],
    "C": ["A"],
    "D": ["C", "E"],
    "E": ["A", "D"],                 # E 被 D 指向，也把票分给 A 和 D
}
pages = list(links.keys())
N = len(pages)

rank = {}                            # 初始：人人平分 1/N
for pg in pages:
    rank[pg] = 1 / N

d = 0.85                             # 阻尼系数：跟链接走 vs 瞬移
for it in range(60):                 # 幂迭代 60 轮，足够收敛
    nxt = {}
    for pg in pages:
        share = (1 - d) / N          # 保底：瞬移带来的基础流量
        for src in pages:            # 扫描所有可能投给 pg 的页面
            outs = links[src]
            if pg in outs:
                share = share + d * rank[src] / len(outs)
        nxt[pg] = share
    rank = nxt

order = sorted(pages, key=lambda pg: rank[pg], reverse=True)   # 按分数从高到低排队
for pg in order:
    bar = "#" * int(rank[pg] * 200)
    print(f"{pg}: {round(rank[pg], 4)} {bar}")

plt.bar(order, [rank[pg] for pg in order], color="steelblue")
plt.ylabel("PageRank")
```

跑完看排名再对照链接表：得分王未必是入链最多的——C 收下 B 的全票以及 A、D 各一半票，所以登顶。再看 A 和 B：A 拿到 C 的全票和 E 的一半票，稳居第二；B 只有 A 的一半票，落到第三。"谁投你、投了多少票"永远比单纯数入链更重要。

### 实验 2（python）：阻尼系数 d 是怎么救场的

```python title="对比 d=1（无瞬移）与 d=0.85 的收敛行为"
links = {"A": ["B"], "B": ["C"], "C": ["A"]}        # 三页死环：每页只有一条出路
pages = list(links.keys())
N = len(pages)

def power_iter(d, rounds):
    rank = {"A": 1.0, "B": 0.0, "C": 0.0}           # 初始全押 A：让演化过程看得见
    errors = []                                      # 记录相邻两轮分布的总变化量
    for it in range(rounds):
        nxt = {}
        for pg in pages:
            share = (1 - d) / N                      # 瞬移保底流量（d=1 时为零）
            for src in pages:
                if pg in links[src]:
                    share = share + d * rank[src] / len(links[src])
            nxt[pg] = share
        err = 0.0                                    # 本轮更新量的大小
        for pg in pages:
            err = err + abs(nxt[pg] - rank[pg])
        rank = nxt
        errors.append(err)
    return errors

e_fast = power_iter(0.85, 12)
e_slow = power_iter(1.0, 12)                         # 无瞬移：质量沿死环匀速转圈，永不落定
print(f"d=0.85 各轮变化量: {[round(e, 3) for e in e_fast]}")
print(f"d=1.00 各轮变化量: {[round(e, 3) for e in e_slow]}")
```

`d=1` 时质量沿着 A→B→C 的死环匀速转圈、永不落定，变化量恒定不为零；加上 15% 的瞬移，链条立刻非周期化，变化量指数跳水奔向零。**一行代码修复了遍历性定理的全部条件**——这就是阻尼系数存在的全部理由。

### 快问快答

```quiz
网页 X 只有 1 条入链，但入链来自全站分数最高的页面；网页 Y 有 50 条入链，全来自无名小站。谁的 PageRank 更可能更高？
- 一定是 Y，50 票压倒 1 票
- 更可能是 X，因为票值取决于投票者的分量 [*]
- 一样高，PageRank 不看出链结构
? 分数沿链接按 outdeg 摊薄后传递：权威页面的单票可以顶几十张杂票。这正是"投票者分量由不动点决定"的设计精髓。
```

:::warning[常见误区]

**误区一**："你以为 PageRank 就是数入链。" 入链只是原料，权重才是货币：来自高分行、出链少的页面，一票千金；来自低分行、百链齐发的导航站，一票毛毛雨。实验 1 里 B 的遭遇就是这个原理的现场演示。

**误区二**："你以为链接出去会'漏掉'自己的分数。" 分数的传递规则是把自身权重按出链**分发副本**，自己一分不少地留在原地继续参与下一轮。例题里的枢纽 Y 送光了所有票仍是全场第一——慷慨无损权威。

**误区三**："你以为阻尼系数是对作弊网站的惩罚。" 它不是道德装置而是数学保险：消灭死胡同与周期环，保证遍历性定理的条件成立、幂迭代必然收敛。没有它，整个算法在某些图结构上直接罢工。

:::

## 6. 练习

**练习 1**：把例题的三页网络交给代码判官：初始代码想当然地给三人平分秋色——用流量守恒解出真正的份额：

```exercise
# @title: 练习：谁是三页小网的枢纽
# @check: 0.25
# @check: 0.5
# @check: 0.25
# @hint: 守恒方程：πX = πY/2，πZ = πY/2，再用三者之和为 1 收尾；保留两位小数
pi_x = round(1 / 3, 2)         # ← 平分是偷懒答案，Y 其实独占鳌头
pi_y = round(1 / 3, 2)
pi_z = round(1 / 3, 2)
print(pi_x)
print(pi_y)
print(pi_z)
```

修好后回看例题的四步推导：方程组只有两条独立 + 归一化补刀，和 30 课解天气链平稳分布的手法一模一样——PageRank 不过是多边版的平稳分布习题。

**练习 2**：若给例题的网络加上阻尼 $d=0.85$，Y 的分数会比 0.5 高还是低？

<details>
<summary>点开查看逐步解答</summary>

瞬移项给每人保底 $(1-d)/3=0.05$，但不能把剩下的分数直接按纯投票比例缩放——每个页面的入票来源不同。按 §3 的方程组列式：

$$\pi_X=0.05+\frac{0.85}{2}\pi_Y,\quad \pi_Z=0.05+\frac{0.85}{2}\pi_Y,\quad \pi_Y=0.05+0.85(\pi_X+\pi_Z)$$

对称性给出 $\pi_X=\pi_Z$。代入第三式：

$$\pi_Y=0.05+1.7\left(0.05+\frac{0.85}{2}\pi_Y\right)=0.135+0.7225\pi_Y$$

解得 $\pi_Y=\frac{0.135}{0.2775}\approx0.486<0.5$，另两页各约 $0.257$。

比纯投票版略低——瞬移抹平了一部分结构性优势。一般规律：d 越小，排名越接近"人人平等"；d 越大，链接结构的话语权越大。0.85 是"尊重链接但保留随机性"的经验折中。
</details>

## 7. 选读：从 PageRank 到今天的排序

<details>
<summary>选读 · 一个特征向量的一万种后续</summary>

PageRank 本质上是幂迭代求最大特征向量（30 课选读埋过的线），这套框架后来长成了整个"图上中心性"家族：特征向量中心性、HITS 的枢纽-权威双评分、个性化 PageRank 做推荐系统……第 53 章《图与网络》会把全家福铺开。

而搜索引擎本身早已超越单一指标：内容相关性、用户行为信号、反作弊策略层层叠加，PageRank 只是众多票仓之一。有趣的是它的思想反向渗透回了科学界——论文引用网络、蛋白质相互作用网、甚至足球传球网都在用同一个"随机游走停留下来的地方最重要"的范式。马尔可夫 1906 年在诗歌里数出的那条链，一百多年后仍在为人类的信息世界记账。
</details>

## 8. 下一站

静态链的全部主线到此收官：状态、转移、路径求和、不动点、吸收与逃逸、以及登上商业巅峰的应用。下一章《统计推断》换一个方向提问——不再问"已知规则，数据会怎样"，而是反过来："手头这批数据，暴露了规则的哪些秘密？"概率论由此转身走向统计学。

→ [第 38 章 · 统计推断](../38-statistical-inference/index.md)
