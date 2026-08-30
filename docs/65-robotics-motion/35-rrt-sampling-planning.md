---
title: 采样规划：RRT 让树替你探路
lesson_id: robotics-motion/rrt-sampling-planning
prereqs:
  - robotics-motion/planning-astar
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - configuration-space
  - rapidly-exploring-random-tree
  - probabilistic-completeness
applications:
  - robot-arm-motion-planning
  - autonomous-driving-planning
exits:
  - reinforcement-learning
---

# 采样规划：RRT 让树替你探路

## 1. 从一个场景开始

机械臂要从收拢姿态伸进货架夹起一枚零件，路径上不能碰到货架、也不能碰到自己。第 30 课的 A* 在网格地图上如鱼得水，可机械臂的"地图"是**关节角空间**：6 个关节就是 6 个维度，每个维度还是连续取值的。想用 A*，就得把每一维切成格子——分辨率砍半，格子数翻 $2^6 = 64$ 倍；再加一个末端姿态维度，网格直接爆炸。**网格化在高维连续空间里是死路。**

RRT（Rapidly-exploring Random Tree，快速探索随机树）换了个思路：**不铺格子，撒骰子**。像藤蔓一样，从起点长出一棵树，每次随机选一个方向探一小步，能长就长、撞墙就撤——树会自己"绕"过障碍找到目标。

## 2. 直觉解释

想象在漆黑的房间里找出口：

- **A* 的做法**：先开灯把整个房间切成一平方米的格子，逐格标号再搜索——房间越大、要求越细，格子越多；
- **RRT 的做法**：不看全图，闭着眼往随机方向伸出脚试一步，踩到空地就在这里扎根，再从树上某个枝头继续伸——摸索久了，树自然铺满整个房间，出口早晚被碰到。

树的生长规则只有三条：**随机挑个目标点、找树上离它最近的枝头、朝它伸一步**。障碍物处的尝试会被拒绝，于是树枝自动在空旷区域密集生长——离障碍越远的地方枝越繁茂，这正是"快速探索"四个字的含义。

## 3. 正式定义

先把"地图"换个说法。机器人的所有可能姿态构成**配置空间**（C-space）：平面机器人是 $(x,y)$，机械臂是各关节角的组合。配置空间里的一个点 = 机器人的一种摆法；障碍物投进这个空间，就是**禁止区域** $C_{obs}$。

RRT 每一轮迭代做四件事：

| 步骤 | 记号 | 做什么 |
| --- | --- | --- |
| 1. 采样 | $x_{rand}$ | 在配置空间均匀抽一个随机点 |
| 2. 最近邻 | $x_{near}$ | 在现有树里找离 $x_{rand}$ 最近的节点 |
| 3. 延伸 | $x_{new}$ | 从 $x_{near}$ 朝 $x_{rand}$ 方向伸出步长 $\varepsilon$（不超过采样点本身） |
| 4. 碰撞检查 | — | 若 $x_{new}$ 和连线都落在自由空间，就把 $x_{new}$ 挂上树 |

$$x_{new} = x_{near} + \varepsilon \cdot \frac{x_{rand} - x_{near}}{\lVert x_{rand} - x_{near} \rVert}$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $x_{rand}$ | 随机样本 | 这一轮"想去"的方向 |
| $x_{near}$ | 最近邻节点 | 树上被选中出发的枝头 |
| $\varepsilon$ | 步长 | 每根树枝的最长长度 |
| $C_{obs}$ | 障碍区域 | 配置空间里机器人会撞的摆法集合 |

**概率完备**是 RRT 的核心承诺：只要路径存在，迭代次数够多时找到它的概率趋近 1。但它**不承诺最短**——树怎么长全凭随机，长出来的路常常歪歪扭扭。

## 4. 分步例题

二维平面，起点 $(0,0)$，步长 $\varepsilon = 1$。撒两个样本，手走两轮：

1. **样本 $x_{rand} = (3, 0)$**：树上只有根 $(0,0)$，它就是最近邻；距离 $\sqrt{9} = 3 > \varepsilon$，朝它伸 1 步 → 新节点 $(1, 0)$ 挂上树；
2. **样本 $x_{rand} = (3, 1)$**：树上有 $(0,0)$ 与 $(1,0)$，距离分别是 $\sqrt{10} \approx 3.16$ 与 $\sqrt{5} \approx 2.24$ → 最近邻是 $(1, 0)$；方向向量 $(2, 1)$，模长 $\sqrt{5}$，伸 1 步 → 新节点 $(1 + \tfrac{2}{\sqrt5},\ \tfrac{1}{\sqrt5}) \approx (1.89, 0.45)$；
3. 若样本恰好落在障碍里，或连线穿障碍，这一轮**整轮作废**——什么都不加，等下一轮骰子。

两个要点：最近邻**比**的是树上已有节点，不是采样点本身入树；延伸**封顶**在步长 $\varepsilon$，采样点再远也只伸一步。

## 5. 动手实验

先看网格为什么撑不住：把分辨率 $h$ 调细，二维网格数按 $(1/h)^2$ 涨，六关节机械臂的配置空间是六维——按 $(1/h)^6$ 涨，这就是必须换采样思路的原因。

```viz
{
  "type": "plot",
  "title": "网格爆炸：格点数随分辨率收细的涨法（二维 vs 六维）",
  "expr": "1/(x*x)",
  "label": "二维配置空间",
  "expr2": "1/(x^6)",
  "label2": "六维配置空间",
  "xmin": 0.2,
  "xmax": 1,
  "sliders": []
}
```

### 实验（python）：让 RRT 在圆障碍里长出一棵树

```python title="RRT：撒点、找最近枝头、伸一步、查碰撞"
import math
import random
import matplotlib.pyplot as plt

random.seed(7)                                   # 固定随机种子：每次运行长出同一棵树

start = (0.0, 0.0)                               # 起点（配置空间的一个点）
goal = (9.0, 6.0)                                # 目标
obstacles = [(4.0, 3.0, 1.6), (7.5, 5.2, 1.1)]   # 圆形障碍：(圆心x, 圆心y, 半径)

def hit_point(p):                                # 碰撞检查：单个点是否落进障碍
    for ox, oy, r in obstacles:
        if math.hypot(p[0] - ox, p[1] - oy) < r:
            return True
    return False

def hit_line(a, b):                              # 连线检查：把线段细分成 20 小段逐点查
    for i in range(21):
        t = i / 20                               # t 从 0 走到 1：线段上的位置比例
        p = (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))
        if hit_point(p):
            return True
    return False

parent = {start: None}                           # 父节点账本：每个节点记"我从哪个枝头长出来"
nodes = [start]
eps = 1.0                                        # 步长

for it in range(1200):                           # 最多撒 1200 个样本
    x_rand = (random.uniform(0, 10), random.uniform(0, 7))   # 均匀撒一个随机样本
    x_near = nodes[0]                            # 最近邻先假设是根节点
    for n in nodes:                              # 逐个比较，留下离样本最近的节点
        if math.hypot(n[0] - x_rand[0], n[1] - x_rand[1]) < math.hypot(x_near[0] - x_rand[0], x_near[1] - x_rand[1]):
            x_near = n
    d = math.hypot(x_rand[0] - x_near[0], x_rand[1] - x_near[1])
    if d < 1e-9:                                 # 样本恰好压在节点上：这轮没意义，跳过
        continue
    if d <= eps:                                 # 样本够近：直接收编样本本身
        x_new = x_rand
    else:                                        # 样本太远：朝它伸一个步长
        x_new = (x_near[0] + eps * (x_rand[0] - x_near[0]) / d,
                 x_near[1] + eps * (x_rand[1] - x_near[1]) / d)
    if hit_point(x_new) or hit_line(x_near, x_new):
        continue                                 # 撞墙：整轮作废，等下一轮骰子
    nodes.append(x_new)
    parent[x_new] = x_near

x_near = nodes[0]                                # 收尾：尝试把目标接上树
for n in nodes:
    if math.hypot(n[0] - goal[0], n[1] - goal[1]) < math.hypot(x_near[0] - goal[0], x_near[1] - goal[1]):
        x_near = n
connected = not hit_line(x_near, goal)
if connected:
    parent[goal] = x_near
print("树节点数 =", len(nodes), " 目标接上 =", connected)

path = []                                        # 沿父节点账本从目标爬回起点
p = goal if connected else nodes[-1]
while p is not None:
    path.append(p)
    p = parent[p]
path.reverse()

fig, ax = plt.subplots(figsize=(7, 5))           # 开一块画布
for ox, oy, r in obstacles:
    ax.add_patch(plt.Circle((ox, oy), r, color="#c0392b", alpha=0.6))   # 红圆 = 障碍
xs = []
ys = []
for n in nodes:
    xs.append(n[0])
    ys.append(n[1])
ax.scatter(xs, ys, s=6, color="#2c3e50")         # 树的全部节点
for n in nodes:                                  # 每个节点连一条到父节点的细线 = 树枝
    q = parent[n]
    if q is not None:
        ax.plot([n[0], q[0]], [n[1], q[1]], color="#95a5a6", linewidth=0.5)
ax.plot([p[0] for p in path], [p[1] for p in path], color="#27ae60", linewidth=2.5)   # 回收出的路径
ax.scatter([start[0], goal[0]], [start[1], goal[1]], color="#27ae60", s=90, zorder=3)
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.set_aspect("equal")                           # 横纵同比例：圆才不被压扁
plt.show()
```

怎么玩：灰色细枝是 1200 轮撒点长出的树——障碍周围明显稀疏（撞墙的尝试都被拒了），开阔区枝繁叶茂；绿线是沿父节点账本回收出的路径。把 `eps` 改成 0.3 再跑：树更密、长得更慢；改成 2.5：树长得快，但很多枝直接被障碍"弹回"。把 `random.seed(7)` 这行删掉：每次运行长出完全不同的一棵树——这正是"随机"的全部含义，而概率完备保证它们迟早都通。

```quiz
RRT 找到的路径值得信赖的是哪一点？
- 它一定是最短路径
- 只要路径存在，撒点次数够多就几乎必然能找到一条可行路径 [*]
- 它保证路径光滑无抖动
? RRT 的承诺是"概率完备"而非"最优"：路径通常歪歪扭扭，想要又短又光滑，还得靠后期的shortcut平滑或 RRT* 这类渐近最优变体。
```

::::warning[常见误区]

**误区一**："你以为随机采样点 $x_{rand}$ 本身会加入树。" 树收到的是从最近邻**朝它伸一步**的 $x_{new}$；只有样本恰好落在步长以内时，样本本身才被收编。入树的是"这一步的落点"，不是"愿望"。

**误区二**："你以为步长越大越好。" 步长太大，大量延伸撞进障碍被整轮作废，反而在狭窄通道前浪费骰子；步长太小，树长得磨磨蹭蹭。调 $\varepsilon$ 是采样规划最常见的手工活。

**误区三**："你以为 RRT 是 A* 的随机版，照样求最短路。" RRT 只承诺"找到一条可行的"，对路径长度毫无承诺——树往所有方向乱长，从不比较代价。想要渐近最短，去看本课选读的 RRT*。

::::

## 6. 练习

```exercise
# @title: 练习：给 RRT 装上"最近邻 + 延伸"引擎
# @check: 2.71
# @check: 0.71
# @check: 4
# @hint: 距离要开平方（或最近邻统一用平方距离比较），但伸树那一除必须用真实距离——否则步长就错了一半。
import math

nodes = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]   # 树上已有的三个节点
sample = (3.0, 1.0)                            # 本轮撒出的随机样本
eps = 1.0                                      # 步长

best = nodes[0]
best_d = None
for n in nodes:                                # 最近邻搜索
    dx = n[0] - sample[0]
    dy = n[1] - sample[1]
    d = dx * dx + dy * dy                      # ← 问题在这：平方距离直接当了伸树步长用
    if best_d is None or d < best_d:
        best_d = d
        best = n

dx = sample[0] - best[0]
dy = sample[1] - best[1]
x_new = (best[0] + dx / best_d, best[1] + dy / best_d)   # 朝样本伸一个步长
nodes.append(x_new)

print(round(x_new[0], 2))
print(round(x_new[1], 2))
print(len(nodes))
```

<details>
<summary>点开查看逐步解答</summary>

最近邻比大小用平方距离没问题（开不开方不改变大小顺序），但**延伸的分母必须是真实距离** $\sqrt{2}$：

```python
d = math.sqrt(dx * dx + dy * dy)               # 真实欧氏距离
x_new = (best[0] + eps * dx / d, best[1] + eps * dy / d)
```

修正后：最近邻是 $(2, 0)$，真实距离 $\sqrt{2} \approx 1.414$，伸 1 步落点 $(2 + \tfrac{1}{\sqrt2},\ \tfrac{1}{\sqrt2}) \approx (2.71, 0.71)$；树上节点 3 → 4。初始代码用平方距离 2 当分母，落点 $(2.5, 0.5)$——步长被悄悄折成了 $\tfrac{1}{\sqrt2}$。延伸公式里的"单位方向向量"靠 $\lVert x_{rand} - x_{near} \rVert$ 归一，这一除偷不得懒。
</details>

**练习 2**：机械臂有 6 个关节，每维想切成 50 格。配置空间的网格总数是多少？和二维平面（同样每维 50 格）差多少倍？

<details>
<summary>点开查看逐步解答</summary>

$50^6 = 156{,}250{,}000$ 个格子，二维是 $50^2 = 2{,}500$ 个，相差 $50^4 = 6{,}250{,}000$ 倍——六百多万倍。这就是"维度灾难"的具体面孔：网格法在配置空间的维数面前崩溃，而 RRT 的采样与维数无关——每轮永远只做"撒一点、比一轮、伸一步"，这正是它成为机械臂规划标配的原因。
</details>

## 7. 选读：RRT*——把"能走"升级成"越走越短"

RRT 的树只记"谁把我生出来"，从不问"走谁更近"。RRT* 在同一棵树上加了两笔账：**选父**——新节点入树时，不只看最近邻，而是在半径 $r$ 邻域里挑"起点→邻居→新节点"总代价最小的那个当父亲；**重连**——再把邻域里的老节点反过来检查：借道新节点是否更近？更近就改换父节点。每一步都在给树"剪枝整形"，迭代越多，路径越长越接近最优（渐近最优性）。代价是每轮多了邻域查询与重连计算——工程上常见的折中是：先用 RRT 快速找到可行解，再让 RRT* 慢慢把它磨短。

## 8. 下一站

树会探路了，但机械臂的配置空间只是故事的一半：三维空间里"旋转"怎么可靠地表示、怎么拼接，下一课的四元数接棒。

→ [四元数选讲：免奇异的姿态语言](./40-quaternions-attitude.md)
