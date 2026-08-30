---
title: 无损编码与 Huffman 编码
lesson_id: information/huffman-coding
prereqs:
  - information/coding-compression
volume: 4
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - huffman-code
applications:
  - zip-deflate
  - jpeg-huffman-tables
exits:
  - data-ai
---

# 无损编码与 Huffman 编码

## 1. 从一个场景开始

摩尔斯电码在 1838 年上线时干了一件聪明事：字母 E 只发一个点，生僻的 Q 却要拖四个符号——发报员按字母的出场频率分配了长短功。可惜它是人工拍的土办法，分隔靠停顿硬凑。一百多年后，1952 年 MIT 的一份课程作业给出数学化答案：David Huffman 设计出一套算法，能对任何概率分布自动生成**理论上最优的前缀码**。

压缩课已经用"码长记账"确认过：最优平均码长贴着熵的地板。但这课要把账升级成实物——**真正生成那些二进制码字、用它打包消息、再原样解包回来**。ZIP、JPEG 这些每天在你硬盘上跑的格式，内部都留着一间 Huffman 工坊。

## 2. 直觉解释

哈夫曼树的种法一句话：**每次把最轻的两捆树枝绑成一捆**，反复合并直到只剩一根主干——这就是贪心的全部。

为什么贪心在这里不吃亏？看收益结构：一个符号的码每深一层，它的概率就多乘一分代价，所以最深的叶子理应留给最罕见的机会。把最小的两位先按进最深处，正是全局最优的第一步；此后场上剩下一堆"虚拟字符"（捆绑后的新节点）等着同样的待遇，问题的形状一模一样，于是同样的道理层层生效。（严格的交换论证放在选读。）

从主干往回看每个符号走了几步，得到各家的码长；给沿途岔路口登记 0 和 1，得到码字本体。因为所有符号都住在树梢叶子上（半路借宿是要封号的），**任何一个码字都不会撞上另一个的开头**，解码时不必问路就能切分比特流。

## 3. 正式定义

**哈夫曼算法**：对概率 $p_1,\ldots,p_n$ 反复执行「取出最小的两个节点，合并为新节点，权重相加」，$n-1$ 轮后得到的二叉树上，从根到每片叶子的路径登记出各符号的码字 $c_i$，路径长度就是码长 $l_i$。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| 叶子 | 符号驻地 | 只允许真符号住叶子，天然互不为前缀 |
| 新节点 | 虚拟字符 | 两捆树枝的合计权重，继续参加排行 |
| $l_i$ | 码长 | 根到该叶子的步数 |
| 平均码长 $L=\sum p_i l_i$ | 实际账单 | 保证落在熵下界之上、至多高一比特 |

它连着上一课的信源编码定理：在所有前缀码里，哈夫曼码的平均码长**最小**（整数码长的世界冠军）。多义性也一并声明：0 与 1 的标签可全盘互换、并列概率可以换座，甚至整棵树都可能长成别的最优形状——但平均码长的冠军只有同一个量级。

## 4. 分步例题

**例**：四符号 甲 0.4、乙 0.35、丙 0.15、丁 0.1，约定"轻者优先入座，谁更轻谁领本轮的 0"，且每轮新到的数位接在各家码字的**开头**——树是从根往叶子读的，越晚发生的合并离根越近。

1. 第 1 轮：最轻的两捆是丁 0.1、丙 0.15，合并为 0.25——丁领 0、丙领 1；
2. 第 2 轮：场上剩 0.25、乙 0.35、甲 0.4，最轻两捆是 0.25 与乙——捆上全员头补 0、乙补 1：丁变 00、丙变 01、乙是 1；
3. 第 3 轮：剩 甲 0.4 与 0.6 的合体——甲更轻领 0，合体一族头补 1；
4. 揭晓：**甲=0，乙=11，丙=101，丁=100**；
5. 结账：$L=0.4\times1+0.35\times2+0.15\times3+0.1\times3=1.85$ 比特/符号——与压缩课手工记账完全吻合，这次连码字都有实体了；
6. 试打包一段 "甲乙丁"：`0`+`11`+`100`=`011100`，六个比特送出门。

## 5. 动手实验

### 实验 1（viz）：频数落差就是压缩的燃料

```viz
{
  "type": "datachart",
  "title": "20 条记录里的出场频数：柱差越大越有得赚",
  "labels": ["甲", "乙", "丙", "丁"],
  "values": [8, 7, 3, 2]
}
```

占比恰好 0.4、0.35、0.15、0.1——正是例题那份概率的花名册。定长码要 $\lceil\log_2 4\rceil=2$ 位人人平等，合计 40 位；按频数配码只要 37 位（$20\times1.85$）。冷眼看省得不多？把柱子的高度差进一步拉大试试——落差悬殊时差距会突然变脸。

### 实验 2（python）：种树、打包、解包一条龙

```python title="迷你哈夫曼全程演练"
import math   # log2 用于对照熵下界

probs = [0.4, 0.35, 0.15, 0.1]
names = ["甲", "乙", "丙", "丁"]

nodes = []                          # 待办清单：[合计概率, 该族的符号名单]
for i in range(len(probs)):
    nodes.append([probs[i], [names[i]]])
codes = {}                          # 码字账本：符号 -> 二进制串
while len(nodes) > 1:
    nodes.sort()                    # 嵌套列表排序按首元素比较：轻者站队首
    light = nodes.pop(0)            # pop(0)：摘走最轻的一族
    heavy = nodes.pop(0)            # 再摘次轻的
    for name in light[1]:
        codes[name] = "0" + codes.get(name, "")     # 新数位写在开头：这一轮离树根又近一层；get：没立过户就从空串起步
    for name in heavy[1]:
        codes[name] = "1" + codes.get(name, "")
    nodes.append([light[0] + heavy[0], light[1] + heavy[1]])

msg = ""                            # 编码一段 "甲乙丁"
for name in ["甲", "乙", "丁"]:
    msg = msg + codes[name]

restored = []                       # 解码：反复找出当前开头的码字吃掉它
cur = msg
while cur != "":
    hit = False
    for name in names:
        if cur.startswith(codes[name]):   # startswith：串是否以指定前缀开场
            restored.append(name)
            cur = cur[len(codes[name]):]  # 切片 [n:]：丢掉开头 n 个字符
            hit = True
            break
    if not hit:
        break                       # 没有任何码字接得住：非法比特流

avg_len = 0                         # 平均码长与熵下界的双城记
for i in range(len(names)):
    avg_len = avg_len + probs[i] * len(codes[names[i]])
h = 0
for p in probs:
    h = h - p * math.log2(p)

print(f"码表 {codes}")
print(f"甲乙丁 打包后 {msg}，解码复原 {restored}")
print(f"平均码长 {round(avg_len, 2)} 对照熵下界 {round(h, 2)}")
```

运行可见码表 `甲:0 / 乙:11 / 丙:101 / 丁:100`、"甲乙丁"以 `011100` 出门又被原样接回；1.85 对 1.8 的差距，正是整数码长世界付给熵地板的那笔税。动手把它推向极限：把 `probs` 换成 `[0.5, 0.25, 0.125, 0.125]` 重跑——平均码长与熵双双落定 1.75，一比特税都不剩。

### 快问快答

```quiz
给定一组概率之后，最终的哈夫曼码表是唯一确定的吗？
- 当然唯一，算法是死的
- 不是：0 和 1 标签可互换，平局概率还能调换座次 [*]
- 唯一，除非程序写错了
? 算法只在"挑最轻两捆"处指路；哪捆挂左哪捆挂右、同权重怎么排队都没规定。万变不离其宗的是平均码长始终贴住同一个最优值。
```

:::warning[常见误区]

**误区一**："你以为常用字符配短码随手排排就行。" 未经检验的直觉排序很容易造出 A=0、B=01 这种半截撞车——前缀条件是刚性的合规红线，不是锦上添花。哈夫曼树天然住在合规区里。

**误区二**："你以为学完本课就懂了 ZIP 的全部。" ZIP（DEFLATE）的主力是 LZ77 抓"重复出现的片段"，Huffman 只是收尾工序；一阶哈夫曼对付不了跨字符的相关性。压缩史是一场接力赛，别把最后一棒认成全场冠军。

**误区三**："你以为通信双方必须揣着同一张静态码表。" 自适应哈夫曼（Gallager 在 1978 年、Knuth 在 1985 年推进的 FGK 与 Vitter 变体）允许双方边通信边同步更新树——早期传真机和高性价比压缩器里留下过足迹。动态江湖一直很热闹。

:::

## 6. 练习

**练习 1**：下面这份实现想把四个符号压到位，但它的合并总在绑架重量级选手——找到并修好那行代码：

```exercise
# @title: 练习：贪心捡错了石头
# @check: 1.85
# @check: 1
# @hint: pop() 不带参数时从列表尾巴下手。刚才排序就是为了让最轻的站在开头——两次都该从队首搬人。
import math   # 数学函数库

probs = [0.4, 0.35, 0.15, 0.1]
names = ["甲", "乙", "丙", "丁"]
nodes = []
for i in range(len(probs)):
    nodes.append([probs[i], [names[i]]])

lengths = {}                        # 各符号的最终码长
while len(nodes) > 1:
    nodes.sort()                    # 排序后轻者站队首
    a = nodes.pop(0)
    b = nodes.pop()                 # ← 问题在这：它去队尾搬了最重的
    for name in a[1] + b[1]:
        lengths[name] = lengths.get(name, 0) + 1
    nodes.append([a[0] + b[0], a[1] + b[1]])

avg_len = 0
for i in range(len(names)):
    avg_len = avg_len + probs[i] * lengths[names[i]]

print(round(avg_len, 2))
print(lengths["甲"])
```

<details>
<summary>点开查看判题参考实现</summary>

```python
import math   # 数学函数库

probs = [0.4, 0.35, 0.15, 0.1]
names = ["甲", "乙", "丙", "丁"]
nodes = []
for i in range(len(probs)):
    nodes.append([probs[i], [names[i]]])

lengths = {}
while len(nodes) > 1:
    nodes.sort()
    a = nodes.pop(0)
    b = nodes.pop(0)          # 与队友并肩站上队首：两小合一
    for name in a[1] + b[1]:
        lengths[name] = lengths.get(name, 0) + 1
    nodes.append([a[0] + b[0], a[1] + b[1]])

avg_len = 0
for i in range(len(names)):
    avg_len = avg_len + probs[i] * lengths[names[i]]

print(round(avg_len, 2))
print(lengths["甲"])
```

一行之差天壤之别：错误版本反复绑架重兵入深谷，平均码长飙到 2.15，王牌符号甲反而分到 3 位超长码——贪心贪的不是"快"，是"轻"。

</details>

**练习 2**：合法码裁判：给定码表判定是否满足前缀条件。直接查看下面的参考实现，重点弄清为什么必须双向检查：

<details>
<summary>点开查看参考解答</summary>

```python
codes = {"甲": "0", "乙": "11", "丙": "101", "丁": "100"}   # 实验 2 刚种出来的那棵树

def is_prefix_free(table):
    items = list(table.items())          # items：把字典拆成 (键, 值) 对的列表
    for a_name, a_code in items:
        for b_name, b_code in items:
            if a_name == b_name:
                continue                 # 自己跟自己比对没有意义
            if b_code.startswith(a_code):
                return False             # 有人的开头被别人占了
    return True

print(is_prefix_free(codes))             # 这张合法表应判 True
```

坑就在单向检查：只问"我是不是你的前缀"会漏掉"你是不是我的前缀"；对每一对码字互相查一遍才算闭环。把这行码表换成冒名顶替案 `{"A": "0", "B": "01"}` 再跑，裁判立刻翻脸报 False。

</details>

**练习 3**：信源五个符号，概率 0.4、0.2、0.2、0.1、0.1。手工跑一轮哈夫曼贪心写出一张码表，并指出哪一步因"平局"出现了可选版本。

<details>
<summary>点开查看逐步解答</summary>

第 1 轮合并两个 0.1 得捆 A（0.2）；第 2 轮场上站着**三个并列的 0.2**（两位原装加捆 A）和一个 0.4——平局就在这里出现，任选其中两个先结合都算合规贪心。比如选捆 A 与一位原装 0.2 结成捆 B（0.4）；第 3 轮剩下另一位原装 0.2 与两个 0.4（符号甲、捆 B），最轻两格是 0.2 与任一 0.4；第 4 轮收根。

有意思的是：这些平局怎么破，码长的"长相"真的会不同——把实验 2 的代码换个平局顺序多跑几遍，能得到 甲 2 位、其余 2/2/3/3 的版本，也能得到 甲 1 位、某小符号 4 位的夸张版本。但无论哪条路线，加权求和恒等于 $L=0.4\times2+0.2\times2+0.2\times2+0.1\times3+0.1\times3=2.2$ 比特一类的不变值（该信源的真实熵约 2.12，哈夫曼贴着地板只差整数的税）。万变的是姿态，不变的是账单——多重最优的活教材。

</details>

## 7. 选读：为什么"最轻两捆先合"不会吃亏

<details>
<summary>选读 · 交换论证两分钟入门</summary>

任取一棵最优前缀树观察：码字最深的地方必有两位同胞兄弟叶子——独苗深码砍掉父亲一层只会更省。不妨设最深的一对席位坐着 $u,v$。交换论证开始：若实际概率最小的两位 $a,b$ 没坐在这对席上，就让 $a$ 与 $u$ 换座、$b$ 与 $v$ 换座。由于 $a$ 的概率不超过 $u$，搬进更深席位的 $a$ 只会让加权码长降或持平，$b$ 同理——于是存在一棵**最浅两片叶子恰是最小两位**的最优树，即这两位在同一父结点下互为手足。把它们的父亲视作权重 $p_a+p_b$ 的虚拟字符，问题规模减一、性质照旧，归纳到底就证明贪心每一步都踩在最优轨道上。"搬座位不增代价"的手法叫交换论证，配上归纳法就是贪心正确性的黄金搭档。

</details>

## 8. 下一站

编码、信道两条线各自见底，信息论还欠一笔总账：评测排行榜上的"困惑度"到底是何方神圣？它与香农容量如何共用一把标尺？收官课上，语言的迷茫与信道的风浪将在同一张资产负债表上对齐。

→ [困惑度与信道容量](./90-perplexity-channel-capacity.md)
