---
title: 网络流与最大流最小割定理
lesson_id: graph-theory/max-flow
prereqs:
  - graph-theory/paths-connectivity
  - graph-theory/shortest-path
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - flow-network
  - max-flow-min-cut
  - augmenting-path
applications:
  - logistics-planning
  - network-capacity-design
exits:
  - engineering
  - research
---

# 网络流与最大流最小割定理

## 1. 从一个场景开始

水库要给花园供水，中间隔着几根粗细不一的水管。每根管子每秒最多通过的升数是死的，水在管口不会排队也不能倒灌。问：这套管网一秒钟最多能往花园送多少水？

试着加压试试看——加到某个程度，总有一批管子同时"顶满"。这时候就算把水源换成一整片湖泊，总量也一动不动：**瓶颈已经齐了**。这一课的任务，是把"瓶颈决定总流量"这句话变成一条能算、能证、还能编程的定理。

## 2. 直觉解释

先暴力试。随便挑一条从水源到花园的路，沿路看看哪根管子最细，就按那个最细的量送水——细管顶满，粗管还有余。送完第一条再回头找第二条还没堵死的路，继续推……

一个 4 根管子的迷你网络（数字是容量）：

$$s\xrightarrow{3}a,\quad a\xrightarrow{2}t,\quad s\xrightarrow{2}b,\quad b\xrightarrow{3}t,\quad a\xrightarrow{1}b$$

1. 沿 $s\to a\to t$ 推：路上最细的是 $a\to t$（容量 2），推 2；
2. 沿 $s\to b\to t$ 推：最细的是 $s\to b$（容量 2），推 2；
3. 再看还有没有活路：$s\to a$ 还剩 1，$a$ 自己去不了 $t$ 了，但可以借道 $a\to b$（容量 1），$b\to t$ 也还剩 1——于是再推 1。

三路合计 $2+2+1=5$。换个角度问：如果有人在源头只挖一刀，想让水完全过不去，他要切断哪些管子？只切 $s\to a$ 和 $s\to b$，代价恰好 $3+2=5$。"最多送多少"和"最少切多少"撞出了同一个数——这不是巧合，而是本课的主角定理。

## 3. 正式定义

**流网络**是有向图 $G=(V,E)$，每条边 $(u,v)$ 带容量 $c(u,v)\ge 0$；指定源点 $s$ 与汇点 $t$。网络上的**流**是给每条边分配的 $f(u,v)$，满足两条规矩：

| 规矩 | 内容 | 人话 |
| --- | --- | --- |
| 容量限制 | $0\le f(u,v)\le c(u,v)$ | 水不能超载 |
| 流量守恒 | 除 $s,t$ 外，$\sum_{u}f(u,v)=\sum_{w}f(v,w)$ | 中间点进多少出多少 |

流的**值**定义为汇点收到的净流量 $|f|$。

**割**是把顶点劈成两半 $(S,T)$：$s\in S$、$t\in T$；割的容量是所有从 $S$ 指向 $T$ 的边的容量总和。它是"一刀断流"的最低成本报价单（注意方向：只数顺着的边，逆向的边白送不收钱）。

**定理（Ford–Fulkerson，1956）**：任意流网络上，最大流的值等于最小割的容量。

对偶读法："能送多少"的 upper bound 由"哪里最窄"说了算。切断方案的报价和网络的真实运力，是同一个数的两张面孔。

## 4. 分步例题

拿第 2 节的网络完整走一遍账本：

1. **初始**：全部流量记 0；
2. **第一条增广路** $s\to a\to t$：各段剩余容量为 $3,2$，取最小得推送量 2；更新后 $s\to a$ 余 1、$a\to t$ 满；
3. **第二条** $s\to b\to t$：剩余 $2,3$，推 2；此后 $s\to b$ 满、$b\to t$ 余 1；
4. **第三条** $s\to a\to b\to t$：剩余 $1,1,1$，推 1；现在 $a\to t$、$s\to b$、$a\to b$ 全满；
5. **停机判断**：从 $s$ 出发沿还有余量的边走，只能到 $a$（借道已满的边不算），再也够不着 $t$ ——增广路找没了；
6. **验收对偶**：让 $S=\lbrace s\rbrace$，跨出去的边恰好是 $s\to a$ 和 $s\to b$，割容量 $3+2=5=\lvert f\rvert$。两个界互相咬合，值 5 就是全局最优。

注意第 6 步为什么会咬合：任何流都必须穿过每一刀，所以 $|f|\le$ 任一割容量；而算法停在"找不到增广路"时，被 $S$ 圈住的那刀容量恰好被流占满——上下界贴面，谁也动不了。

## 5. 动手实验

### 实验 1（viz）：把增广循环点开来看

```viz
{
  "type": "proof-trail",
  "title": "迷你水管网的五步流水账",
  "steps": [
    { "id": "零流", "text": "全网初始流量全 0，合法但保守" },
    { "id": "路一", "text": "沿 s-a-t 推 2：受限于最细的 a-t" },
    { "id": "路二", "text": "沿 s-b-t 推 2：受限于 s-b" },
    { "id": "补刀", "text": "沿 s-a-b-t 推 1：借用 A 的多余入口与 B 的备用出口" },
    { "id": "断供", "text": "从 s 沿有残量的边再也到不了 t" },
    { "id": "对偶", "text": "割 {s} 的报价 5 = 当前流量 5，双界面合" }
  ],
  "edges": [["零流", "路一"], ["路一", "路二"], ["路二", "补刀"], ["补刀", "断供"], ["断供", "对偶"]]
}
```

重点体会"补刀"那一步：路不一定 shortest、也不一定要"顺着来"，只要沿途每段都还有余量就能推进。

### 实验 2（python）：BFS 找增广路 + 枚举所有割对拍

```python title="同一张网络：算法算最大流，暴力算最小割"
caps = {                          # 字典：键是“起点-终点”，值是容量
    ("s", "a"): 3,
    ("a", "t"): 2,
    ("s", "b"): 2,
    ("b", "t"): 3,
    ("a", "b"): 1,
}
nodes = ["s", "a", "b", "t"]

def find_path(residual):          # def 定义函数；residual 是“剩余容量”字典
    queue = ["s"]                 # 列表当队列：先进先出
    parent = {"s": None}          # 记录“我从哪个点走来的”，用于回溯路径
    while queue:
        current = queue.pop(0)    # pop(0)：取出队头元素
        if current == "t":
            path = []
            hop = "t"
            while hop != "s":
                path.append(hop)
                hop = parent[hop]
            path.append("s")
            return path[::-1]     # [::-1] 把列表整个倒序
        for (u, v) in caps:
            if u == current and residual[(u, v)] > 0 and v not in parent:
                parent[v] = current
                queue.append(v)
    return None

residual = dict(caps)             # dict(x)：复制一份字典，别改坏原始容量
total_flow = 0
for round_no in range(10):        # 有界循环：最多 10 轮，整数容量下一定够用
    path = find_path(residual)
    if path is None:
        break                     # break：提前跳出循环
    push = min(caps.values())     # 先随便取个上限，下面逐段收紧
    for i in range(len(path) - 1):
        push = min(push, residual[(path[i], path[i + 1])])   # min 取最小：瓶颈即推送量
    total_flow = total_flow + push
    for i in range(len(path) - 1):
        e = (path[i], path[i + 1])
        residual[e] = residual[e] - push

print("max_flow =", total_flow)

best_cut = 99999                  # 打擂台变量：记录目前见到最小的割容量
for mask in range(1 << len(nodes)):   # 1 << n 是 2 的 n 次方：枚举所有分队方案
    in_S = [(mask >> i) % 2 == 1 for i in range(len(nodes))]   # 每位代表一个点是否划入 S
    if not in_S[0] or in_S[3]:    # 必须 s 在 S 里、t 不在，才是合法的一刀
        continue
    cut = 0
    for (u, v) in caps:
        cut += caps[(u, v)] * (in_S[nodes.index(u)] and not in_S[nodes.index(v)])
    best_cut = min(best_cut, cut)

print("min_cut =", best_cut)
```

两条输出都是 `5`——定理在小网络里现场兑现。把 `caps` 里任何一根管子加大，重跑一遍：只有横跨"最窄那一刀"的管子才会抬高总流量，其余怎么加都白搭。

:::warning[常见误区]

**误区一**：你以为最宽的总闸就是运力上限。总源头的 3+2=5 只是巧合的上限之一；换张网，最细的单管远小于最大流也远大于它——起作用的从来是"一整刀"，不是某一根管。

**误区二**：你以为中间点会存水。守恒条款下，任何非 $s,t$ 的点"进多少出多少"；如果你算出一个中途积压 2 的方案，账一定记错了某条入边或出边。

**误区三**：你以为割的容量要把两边所有边都算上。只数**从 $S$ 指向 $T$** 的边；逆向边的容量不计费——它属于"白送的方向"，这正是让对偶证明严丝合缝的关键约定。

:::

## 6. 练习与快问快答

下面的三条增广路已经排好队，剩你最关键的两件事没修：每条路**该推多少**、以及最后总共推了多少。初始代码一股脑被"最后一根管子"接管，没有做瓶颈比较：

```exercise
# @title: 练习：三条增广路一共送多少水
# @check: 2
# @check: 2
# @check: 1
# @check: 5
# @hint: 一条路的推送量 = 路上最细那根管的剩余容量，用打擂台逐段取最小；推完记得把每根管的余量扣掉。
paths = [
    ["s-a", "a-t"],        # 第一条增广路：水源经 A 到花园
    ["s-b", "b-t"],        # 第二条：水源经 B 到花园
    ["s-a", "a-b", "b-t"]  # 第三条：绕 A 借道 B 的补刀路线
]
room = {"s-a": 3, "a-t": 2, "s-b": 2, "b-t": 3, "a-b": 1}   # 每根管的剩余容量

total = 0
for edges in paths:
    push = 99                      # ← 问题在这：下面直接被覆盖，没有比较
    for e in edges:
        push = room[e]
    for e in edges:
        room[e] = room[e] - push
    total = total + push
    print(push)

print(total)
```

<details>
<summary>点开查看逐步解答</summary>

比较要用**打擂台**写法——先立一个大数当擂主，逐段挑战：

```python
push = 99
for e in edges:
    if room[e] < push:
        push = room[e]
```

三条路依次推出 $2,2,1$，总计 $5$；扣完余量后五根管子全部归零，对照第 4 节的手工账本一格不差。选读部分会解释：即便允许"沿反方向退水"，算法最终仍停在同一个 5 上。
</details>

```quiz
最大流等于最小割容量，这个等式告诉我们什么？
- 找到任何一个割，它的容量就是网络的最大流量
- 只要算出最小割的报价，就知道运力上限；两者总是在顶满时相遇 [*]
- 最大流和最小割只是名字像，数值毫无关系
? 对偶等式说的是两个优化问题的答案相同：任何合法流 ≤ 任何割容量，而算法能让它们同时达到同一个数。
```

```quiz
找增广路时应该挑什么路线？
- 只能挑边数最少的最短路
- 只要沿途每段的剩余容量都大于零，任意一条从水源到花园的路线都可以 [*]
- 必须从头到尾不经过任何已经流过的点
? 容量还剩就是活路，绕行没问题；只有"全都满了"才算断供。第三条增广路的 a-b 正是一条新开的边。
```

## 7. 选读：反向边为什么不是耍赖

<details>
<summary>选读 · 残量网络里的"退水"魔法</summary>

朴素的找路法有个著名陷阱：先手运气差时会卡在次优解。解法是在残量网络里给每条边配一条**反向边**，剩余容量等于已推走的流量——允许后来的水流把前面的水"劝退"回上游。

为什么这不破坏正确性？把退水想成记账：正向推 1 又反向退 1，合并后等于这 1 从未发生，所以任何"带退水"的流序列都能翻译回一个干净的普通流。于是不变式只有一个方向上的单调性（总流量每轮至少涨 1，整数容量必然终止），最后由"无增广路 ⇔ 存在贴满的割"完成对偶闭合。

代价是效率：最坏情形一轮只能涨 1。选最短增广路（BFS 版，Edmonds–Karp）后轮数被压进多项式范围——大网络里"怎么找路"和"能不能找到"一样重要。
</details>

## 8. 边界与本课不做什么

费用流（每根管子另有单价）、多源多汇网络、动态到达的在线调度都不在本课射程内——它们是同一舞台的续集。本课给你的核心资产是对偶的眼光：**上限与瓶颈是同一个数的两种身份**。带着它去看任何资源分配系统（货运、带宽、人力、预算），你都会本能地先找那"一刀"。

## 9. 下一站

第 29 章到此收官。网络流是图论通往工程世界最宽的一道桥：第 53 章「图与网络」会把流量视角铺满真实系统建模，无线通信章里蜂窝小区的资源分配也在流的语言里说事——图的骨架加上概率与优化的血肉之后，这条桥还要再长一次。

→ [网络模型](../53-graphs-networks/10-network-models.md)
