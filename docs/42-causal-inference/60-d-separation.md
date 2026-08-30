---
title: DAG、路径与 d-分离
lesson_id: causal-inference/d-separation
prereqs:
  - causal-inference/scm
volume: 4
layer: L10
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - d-separation
  - path-blocking
applications:
  - observational-studies
  - feature-selection
exits:
  - data-ai
---

# DAG、路径与 d-分离

## 1. 从一个场景开始

灯塔学院的教务长盯着一组数据犯嘀咕：报了辅导班的学生，期末平均分确实更高。他想在总结报告里加一句"控制一切可疑因素以示严谨"，于是把**自学能力**、**每周刷题量**、甚至**家长群讨论热度**全都塞进了对照清单。数据科老师看完直摇头："你这一把按下去，有两条路会被掐断，一条会凭空来电。"

上一课我们用方程装下了因果世界；这一课解决操作层面的问题——给定一张箭头图，如何**系统地**判断哪些关联通路开着、哪些控制真正管用？答案是本章的电路检修规程：d-分离。

## 2. 直觉解释

沿用第 30 课的三种接头，再配上电流比喻：

- **链** $X \to M \to Y$：影响顺管道流过中间人，控住 $M$ 就是关阀门；
- **叉** $X \leftarrow Z \to Y$：共同原因朝两边发射，控住 $Z$ 即断两翼；
- **对撞** $X \to C \leftarrow Y$：平时天然断流（两条原因各过各的），**一旦条件化于 $C$，反而通电**——就像门口登记簿：平时无人讨论它，一旦你只研究"登过记的人"，进门的两种来路就互相攀扯起来。

于是"判断 $X$ 与 $Y$ 是否还有关联流动"变成纯图论作业：

1. 找出连接 $X$ 与 $Y$ 的每条**路径**（沿边行走、方向可逆、不重复经过节点）；
2. 对路径上的每个**中间节点**做一次"接头检测"；
3. 一条路只要有一个中间节点断流，整条路熄火；全部被掐断时，称 $X$ 与 $Y$ 被 $Z$ **d-分离**。

字母 d 是 *directional* 的缩写：这套判据吃着箭头的方向吃饭。

## 3. 正式定义

设 $\mathcal{G}$ 为 DAG，$X,Y,Z$ 为其不相交节点集。节点判定规则：

| 中间节点形态 | 通电条件 | 断电条件 |
| --- | --- | --- |
| 链 / 叉（至多一边箭头指入） | 未被 $Z$ 控制 | 被 $Z$ 控制 |
| 对撞（两边箭头都指入） | 被 $Z$ 控制 | 未被 $Z$ 控制 |

**d-分离定义**：

$$X \perp_d Y \mid Z \;\Longleftrightarrow\; \text{每条连接 } X \text{ 与 } Y \text{ 的路径都至少含一个断电节点}$$

它承诺的是图上的独立性骨架：若分布由该图忠实地生成，则 d-分离成立当且仅当真实分布里相应（条件）独立成立。这正是第 36 章"条件独立性"在因果图上领取的几何身份证。

## 4. 分步例题

教学图四件套：$Z$ 自学能力、$X$ 辅导班、$M$ 刷题量、$Y$ 考试分、$W$ 家长群讨论度；边为 $Z{\to}X,\ Z{\to}Y,\ X{\to}M,\ M{\to}Y,\ X{\to}W,\ Y{\to}W$。$X$ 到 $Y$ 共三条简单路径：

1. **主链** $X \to M \to Y$：想问辅导班的总效果时会保留它；
2. **后门叉** $X \leftarrow Z \to Y$：混着"学霸自己爱报班"的老故事；
3. **对撞岔** $X \to W \leftarrow Y$：平时安静，就怕有人去"控制讨论度"。

逐条通电检查（空手不控任何变量）：主链开着，后门开着，对撞关闭——**2 条亮路**。改控 $\lbrace Z, M\rbrace$：主链被 $M$ 掐灭，后门被 $Z$ 掐灭，对撞依旧安静——**0 条亮路**，达到 d-分离，此时观察到的残余相关只能来自因果关系本身。反之若只控 $W$：前两条照旧亮着不说，第三条还被硬生生点亮——**3 条全亮**，比什么都不控更糟。

## 5. 动手实验

### 实验 1（viz）：每种控制法留下几条亮路

```viz
{
  "type": "datachart",
  "title": "X–Y 之间仍开着的路径条数（共 3 条候选路径）",
  "labels": ["不控制", "控 Z 能力", "控 M 刷题", "控 Z 和 M", "控 W 讨论度"],
  "values": [2, 1, 1, 0, 3]
}
```

最矮的那根柱才是想要的安全区；最高那根是"多控更稳"幻觉的代价。值得注意的是"控 Z"与"控 M"各自只堵住一条路——单一动作治不了两条病根。

### 实验 2（python）：可复用的路径判定器

```python title="三步判定器：数一数还亮着的路"
edges = {("z", "x"), ("z", "y"), ("x", "m"),     # 有向边集合：箭头从左指向右
         ("m", "y"), ("x", "w"), ("y", "w")}
paths = [["x", "m", "y"], ["x", "z", "y"],       # 三条简单路径，手工枚举一次即可
         ["x", "w", "y"]]

def passes(left, mid, right, cond):
    # 检测路径片段 left—mid—right 上，中间节点 mid 通不通电
    enters_left = (left, mid) in edges           # 左邻的箭头是否指入 mid
    enters_right = (right, mid) in edges         # 右邻的箭头是否指入 mid
    if enters_left and enters_right:
        return mid in cond                       # 对撞：被控制才通电
    return mid not in cond                       # 链或叉：控制即断电

def is_open(path, cond):
    checks = []
    for i in range(1, len(path) - 1):            # 逐一检查路径内部的每个节点
        checks.append(passes(path[i - 1], path[i], path[i + 1], cond))
    return all(checks)                           # any/all：全程畅通才算开路

tests = [("不控制 ", []),      ("控 Z   ", ["z"]),
         ("控 M   ", ["m"]),    ("控 M,Z ", ["m", "z"]),
         ("控 W   ", ["w"]),    ("控 Z,W ", ["z", "w"])]
for label, cond in tests:
    hits = 0
    lit = []
    for p in paths:
        if is_open(p, cond):
            hits += 1
            lit.append("-".join(p))              # join：把列表拼成带分隔符的字符串
    print(label, "开路", hits, "条:", lit)
```

输出六行，亮路条数依次为 `2, 1, 1, 0, 3, 2`，与 viz 完全一致。把它当作检修仪接入新电路：只要替换 `edges` 与 `paths` 两行，任何小图的联通诊断立刻可跑。

### 快问快答

```quiz
研究者只想考察"戒烟贴"X 对"肺功能"Y 的效果，图中香烟摄入量 M 是贴片的中介渠道。他顺手把 M 也放进回归控制变量，主要后果是什么？
- 让估计更加精确，没有副作用
- 把 X 经由 M 流向 Y 的因果通道也一起关掉了，测到的是被削弱的剩余效应 [*]
- 打开了新的混杂，完全推翻结论
? 控制中介等于"冻结管道"。它未必引入新偏差，但会把想测的总效应截短成直接部分——这是"控得越多越严谨"幻象的另一副面孔，和对撞陷阱正好互为镜像。
```

:::warning[常见误区]

**误区一**：你以为 d-分离说"$X$ 与 $Y$ 无关"。它只担保图中蕴含的无条件或条件独立性；图没分离，数据也可能碰巧无关。d-分离给出的是"保证独立"的方向，不是"必然相关"的预测。

**误区二**：你以为对撞点的后代可以随便碰。条件化于对撞节点的子孙同样会把路点亮（比如用"获得奖学金"当代理去控"录取名单"）。完整规则要到选读里才补齐。

**误区三**：你以为找出所有路径靠肉眼就够了。节点一多路径数爆炸，人工枚举必漏。工业实现用可达性算法（活跃边传播）代替路径枚举——思想与今天写的迷你判定器一致，只是不再显式列路。

:::

## 6. 练习

**练习 1**：初始判定器的对撞分支写错了，导致通电灯常灭。补好它，输出应为 `[2, 1, 1, 0, 3, 2]`：

```exercise
# @title: 练习：修好判定器的对撞开关
# @check: [2, 1, 1, 0, 3, 2]
# @hint: 判据分两支：左右箭头同时指入 mid 属于对撞，mid 在 cond 里才通电；否则走常规规则，mid 不在 cond 里才通电
edges = {("z", "x"), ("z", "y"), ("x", "m"),
         ("m", "y"), ("x", "w"), ("y", "w")}
paths = [["x", "m", "y"], ["x", "z", "y"], ["x", "w", "y"]]
test_sets = [[], ["z"], ["m"], ["m", "z"], ["w"], ["z", "w"]]

def passes(left, mid, right, cond):
    enters_left = (left, mid) in edges
    enters_right = (right, mid) in edges
    if enters_left and enters_right:
        hit = mid not in cond        # ← 有 bug：对撞点被控制应该【通电】而非断电
    else:
        hit = mid not in cond
    return hit

def path_open(p, cond):
    verdicts = []
    for i in range(1, len(p) - 1):
        verdicts.append(passes(p[i - 1], p[i], p[i + 1], cond))
    return all(verdicts)

open_counts = []
for cond in test_sets:
    n_open = 0
    for p in paths:
        if path_open(p, cond):
            n_open += 1
    open_counts.append(n_open)
print(open_counts)
```

**练习 2**：课后有人声称"既然控制 $W$ 会点亮新路，那我干脆把 $X$ 的所有下游后代统统加入控制集，一步到位"。这套操作的致命伤在哪里？

<details>
<summary>点开查看逐步解答</summary>

三个问题层层递进。第一，下游后代中藏着中介与中介的后代（如刷题量 $M$ 及其在考试分身上的折射），控制它们是在主动拆除待估的因果管道；第二，$X$ 与 $Y$ 的公共后代 $W$ 正是对撞结构，纳入控制立刻凭空开门，制造原本不存在的伪相关；第三，这一招并没有覆盖真正的病灶——指向 $X$ 的后门（自学能力那条叉）。正确姿势恰恰相反：**候选控制集应优先从 $X$ 的非下游亲属中挑**，让每一条后门路径都恰好踩到一个链/叉节点上。
</details>

## 7. 选读：对撞者的后代也 contagious

<details>
<summary>选读 · 完整版阻断规则</summary>

标准定义里，对撞节点 $C$ 的"通电开关"不是 $C \in Z$ 本身，而是"$C$ **或它的任一下游后代**落在 $Z$ 里"。直觉：后代会继承 $C$ 的信息——高考分是"录取名单"的后代，盯着获奖者回溯也会打开原对撞之门。据此可得两条漂亮的推论：其一，一张 DAG 的每一组 d-分离陈述，等价于把图"道德化"（moral graph：同父连线、再去方向）后相应的图分割；其二，给定同一份联合分布，满足它全部独立性的最小 DAG 可能不止一张，这批等价类共享的正是那套无向骨架与 v 形结构——这也解释了为什么某些箭头方向必须交给干预实验去裁决。
</details>

## 8. 下一站

检修规程在手，关联通路一览无余。但"看到哪条路亮着"与"算出干预后的分布"之间还差最后一块基石：do 算子的正式定义。

→ [do 算子与干预分布](./70-do-operator.md)
