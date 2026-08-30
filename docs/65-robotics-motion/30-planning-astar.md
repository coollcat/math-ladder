---
title: 路径规划：可视图与 A* 雏形
lesson_id: robotics-motion/planning-astar
prereqs:
  - robotics-motion/forward-kinematics
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
  - heuristic-search
  - admissible-heuristic
applications:
  - warehouse-agv
  - game-ai
exits:
  - robotics-motion/quaternions-attitude
---

# 路径规划：可视图与 A* 雏形

## 1. 从一个场景开始

仓库里一台 AGV（自动搬运车）要从货架区驶向打包台，路上货架林立。它必须回答两个问题：**这条路能不能走通？哪条最省？**Dijkstra 这类全面最短路搜索能答，但仓库地图动辄百万格，它的"全面撒网"太奢侈。

人类司机的做法不同：盯着目的地估个"大概还要多远"，优先往**看起来更近**的方向探索。把这个直觉数学化，就是今天的主角——A* 算法。

## 2. 直觉解释

先把地图变成图：每个格子是一个节点，相邻格之间连边，边权是步长；货架格子直接删掉。于是"找路"变成了"找最短路"。

A* 的聪明之处是给每个候选格打一个综合分：

$$f(n)=g(n)+h(n)$$

- $g$：从起点走到 $n$ 已经花掉的代价——**过去账**；
- $h$：从 $n$ 到终点的乐观估计——**未来账**（网格上常用曼哈顿距离）；
- 每次挑 $f$ 最小的格子展开。"已花不少但前途无量"和"花得少却南辕北辙"被放在同一杆秤上比较。

关键在 $h$ 的性格：它必须**乐观**（从不高估真实剩余代价）。乐观保证 A* 永不冤枉好路——一旦某条路被选中，就没人能事后翻案。

## 3. 正式定义

**A\* 算法**：维护开放列表（候选 frontier），循环执行：

1. 取出 $f=g+h$ 最小的节点 $n$；
2. 若 $n$ 是终点，回溯路径结束；
3. 否则把 $n$ 的可通行邻居入列：算它们的 tentative g，更新来源指针。

| 符号 | 名字 | 性质 |
| --- | --- | --- |
| $g(n)$ | 已走代价 | 起点→n 的最小已知代价 |
| $h(n)$ | 启发式 | 曼哈顿距离 $\lvert x_1-x_2\rvert+\lvert y_1-y_2\rvert$ 等 |
| 可采纳 | h 不高估 | 保证找到的路径最短 |

三个极端帮你定位 A*：

- $h=0$：退化为 **Dijkstra**——只看过去账，稳妥而全面撒网；
- 只看 $h$：贪心最佳优先——直奔目标但可能被墙骗进死胡同；
- $0<h\le h^*$（真实剩余代价）：两者折中，**又快又稳**。

## 4. 分步例题

**例**：小网格上手动推演两步。起点 S 在 $(0,0)$，终点 G 在 $(4,2)$，无障碍。当前开放列表里有三个候选（坐标、g 值如下）：

1. 算各自的曼哈顿 h：P₁$(2,1)$：$\lvert4-2\rvert+\lvert2-1\rvert=3$；P₂$(1,2)$：$\lvert4-1\rvert+\lvert2-2\rvert=3$；P₃$(3,0)$：$\lvert4-3\rvert+\lvert2-0\rvert=3$；
2. 拼 f 值：P₁：$g=3$ → $f=6$；P₂：$g=2$ → $f=5$；P₃：$g=4$ → $f=7$；
3. 选最小 f：展开 P₂$(1,2)$——虽然它的 g 不是最小，但"位置好"扳回一局；
4. 直觉复核：P₂ 离终点直线最近且已走不远，先探它合情合理；
5. 若换成只比 g（Dijkstra），会先展开 P₃——朝反方向多绕一步，这就是启发式的价值。

## 5. 动手实验

### 实验 1（python）：8×8 仓库地图上的完整 A*

```python title="栅格 A*：热力图 + 规划路径"
import matplotlib.pyplot as plt

# 1 代表货架（障碍），0 代表可通行地面
grid = [
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [1, 1, 0, 1, 0, 0, 1, 1],
    [0, 0, 0, 1, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 1, 1, 0, 0],
]
start, goal = (0, 0), (7, 7)

def h(cell):                                   # 启发式：到终点的曼哈顿距离
    return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])

open_list = [(h(start), start)]                # 列表元素 (f, 格子)
g_best = {start: 0}                            # 每格已知的最小 g
parent = {start: None}

while open_list:
    open_list.sort()                           # f 最小的排最前
    f, cur = open_list.pop(0)
    if cur == goal:
        break
    for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        nxt = (cur[0] + dx, cur[1] + dy)
        in_bounds = 0 <= nxt[0] < 8 and 0 <= nxt[1] < 8
        if not in_bounds or grid[nxt[0]][nxt[1]] == 1:
            continue                           # 撞墙或出界：跳过
        new_g = g_best[cur] + 1
        if nxt not in g_best or new_g < g_best[nxt]:
            g_best[nxt] = new_g
            parent[nxt] = cur
            open_list.append((new_g + h(nxt), nxt))

path = []
node = goal
while node is not None:                        # 从终点沿 parent 指针回溯
    path.append(node)
    node = parent[node]
path.reverse()

print(f"路径长度 {g_best[goal]} 步")
print(path)

heat = [[g_best.get((r, c), -1) for c in range(8)] for r in range(8)]
plt.imshow(heat, cmap="viridis")               # 每个格子涂上它的最小 g 值
plt.colorbar(label="g value")
for (r, c) in path:
    plt.scatter(c, r, s=60, color="red", zorder=3)
```

红色珠串是 A* 找到的 14 步最短路径；背景热力图是每个格子被记录的最小 g——颜色由深到浅正是搜索波前推进的方向。把 `h` 函数改成 `return 0` 再跑一次：路径不变（可采纳性保底），但你可以在 `while` 里加计数器数一数展开了多少格——A* 明显少翻了很多格子。

### 实验 2（python）：数格子——h 到底省了多少

```python title="Dijkstra vs A* 的展开数对比"
import matplotlib.pyplot as plt   # 复用上一实验的 grid 与函数（浮窗同一命名空间）

def search(use_h):
    def hh(cell):
        return h(cell) if use_h else 0      # 关掉启发式＝Dijkstra
    opened = 0
    ol = [(hh(start), start)]
    gb = {start: 0}
    while ol:
        ol.sort()
        f, cur = ol.pop(0)
        opened = opened + 1
        if cur == goal:
            return opened
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nxt = (cur[0] + dx, cur[1] + dy)
            if not (0 <= nxt[0] < 8 and 0 <= nxt[1] < 8) or grid[nxt[0]][nxt[1]] == 1:
                continue
            ng = gb[cur] + 1
            if nxt not in gb or ng < gb[nxt]:
                gb[nxt] = ng
                ol.append((ng + hh(nxt), nxt))
    return opened

print(f"A*     展开格数 = {search(True)}")
print(f"Dijkstra 展开格数 = {search(False)}")
```

两个数字摆在一起，启发式的账一目了然。地图越大越空旷，差距越夸张——这正是大型仓库与游戏引擎都选 A* 家族的原因。

:::warning[常见误区]

**误区一**："你以为 h 越激进越好。" 把 h 写成"到终点的直线距离×0.001"确实快，但若某天高估了真实代价，最短性立刻作废。可采纳性是 A* 与"大概率对"算法的分界线。

**误区二**："你以为 A* 输出的折线路径能直接开车。" 栅格路径带着 90° 直角转弯，AGV 实际执行前要做平滑与转弯代价建模——规划器的输出是"路线意图"，不是方向盘指令。

**误区三**："你以为可视图和栅格图是一回事。" 可视图把障碍物顶点连线建图（路径更短更顺滑），栅格图把世界剁成方格（实现简单、查询快）。工程里常常两者混用：全局规划用可视图/采样，局部避障用栅格。

:::

## 6. 练习

**练习 1**：初始代码挑下一个展开格时只比了 h（贪心病发作），结果选错了格子。修成完整比较 f：

```exercise
# @title: 练习：按 f 值选出正确的展开格
# @check: 5
# @hint: f = g + h；逐项算出三个候选的 f 再取最小。
frontier = [(3, 2), (6, 1), (2, 5)]   # 三个候选格，每项是 (g, h)

best_f = None                          # None 表示"还没有任何候选"
for g, hh in frontier:
    score = hh                         # ← 错在这：只看了未来账，没拼上 g
    if best_f is None or score < best_f:
        best_f = score
print(best_f)
```

**练习 2**：构造一个"贪心被墙骗"的具体例子：在 5×5 地图上放一堵竖墙，让只看 h 的策略走进死胡同而 A* 顺利通过。用文字描述布局并说明两种策略各走了哪里。

<details>
<summary>点开查看逐步解答</summary>

布局示意（■ 为墙，S 起点 $(0,0)$，G 终点 $(4,4)$）：

```text
S . . . .
. . ■ . .
. . ■ . G
. . ■ . .
. . . . .
```

- 只看 h 的贪心：每步都往"离 G 曼哈顿距离更近"的格挪，会贴着墙右侧一路下冲到 $(1,2)$ 附近，然后被墙逼进死角反复横跳——除非加随机逃生，否则卡住；
- A*：候选 $(1,0)$ 与 $(0,1)$ 的 f 同为 $1+7=8$……继续推进后，绕行方向的格子虽然 g 大一点，但 f 更低，自然胜出，最终沿左半场绕过墙头到达 G。

一句话总结：**h 管"想去哪"，g 管"已经付了多少"；只信前者会被眼前的捷径骗，A* 让两本账互相制衡。**
</details>

## 7. 选读：可视图与采样法一瞥

<details>
<summary>选读 · 栅格之外的两条大路</summary>

**可视图**（visibility graph）：把多边形障碍的顶点两两连线，凡是穿过障碍的线删掉，剩下一张"看得见就连边"的稀疏图。在最短路意义下，最优路径一定由这些顶点线段组成（可以严格证明），所以求出来的路天然平滑、长度精确——CAD 与早期机器人学的宠儿。代价是障碍形状复杂时建图开销大。

**采样法**（RRT/RRT* 一族）：不建完整地图，而是不断向随机方向"伸枝"，长出一棵覆盖自由空间的树。高维空间（机械臂 6 个关节就是 6 维！）里栅格会维数爆炸，采样法却能工作——现代机械臂规划的标配思想。它与本课 A* 共享同一个内核哲学：**用可负担的探索换取足够好的路径**。

</details>

## 8. 下一站

路径有了，新问题立刻上门：转弯时朝向怎么记？翻滚叠加时姿态怎么算才不丢轴？下一课请出免奇异的姿态语言——四元数。

→ [四元数选讲：免奇异的姿态语言](./40-quaternions-attitude.md)
