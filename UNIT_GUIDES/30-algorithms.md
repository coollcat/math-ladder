# 第 30 章 · 算法与数据结构数学 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 9 门正式课已建成（10/20/30/35/37/40/50/60/65）；规划名与落盘名有出入，以磁盘为准
> 目标：9 门正式课（磁盘已齐线；65-union-find 为登记项，未立项）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 3 / layer L4 / track discrete-computing / stage university-core（index 基线 difficulty 3，主定理课可到 4）

## 1. 章定位

算法课教"怎么写"；本章教"凭什么对、慢在哪里"。主线推进：

```text
增长率记号 → 循环不变式 → 分治递归树 → 决策树下界 → 哈希期望分析 → 栈队列堆 → 图遍历记账
```

读者离开时应该能：对一个循环说出它的不变式并检查三要素；用递归树把 T(n)=2T(n/2)+O(n) 读成 n log n；解释为什么基于比较的排序躲不开 n log n；用期望值论证哈希平均很快；把 BFS 的 O(V+E) 一笔一笔账算出来。

## 2. 前置覆盖

- `numtheory/gcd` 已建立欧几里得算法与 `math.gcd`（出生地）——增长率课只回扣其步数行为，不重讲算法本身；`euclid` 组件直接复用。
- `numtheory/mod` 与 `clockmod` 是哈希除留余数的现成直觉源。
- `sequences/induction`、`math-language/induction-advanced` 已建立归纳证明风格——不变式三要素（初始化/保持/终止）直接套用，不重讲归纳法。
- `graph-theory/graph-definition`、`paths-connectivity`、`shortest-path`、`topological-dag` 已建立图语言与最短路——图遍历课是"BFS 距离=层数"的数学化，不重教 Dijkstra。
- `prob/counting` 与 `dice` 服务哈希课的生日界；`math-language/quantifiers` 保证复杂度命题量词表述准确。
- 工具登记现状：`math.factorial`、`math.gcd`、`math.ceil`/`math.floor`、`math.log2`（第 35 章 75 课）、`random`、`matplotlib.pyplot`、`statistics` 均已出生可复用；numpy、itertools、collections 全章禁用（队列用列表 + 头指针实现，正好是教学点）。

## 3. 组件清单

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `plot`（现有） | 函数族对比 | 10 |
| `euclid`（现有） | 辗转相除步进 | 10 |
| `domino`（现有） | 归纳多米诺隐喻不变式传递 | 20 |
| `clockmod`（现有） | 模 m 分桶直觉 | 50 |
| `datachart`（现有） | 桶长度直方图 | 50 |
| `matrix-power`（现有） | 邻接矩阵幂与可达性 | 70 |
| `growth-race`（新增） | 五种增长率赛跑与预算线 | 10 |
| `invariant-tracer`（新增） | 插入排序逐帧 + 不变式区间高亮 | 20 |
| `divide-tree`（新增） | 递归树展开合并、每层代价条 | 30 |
| `decision-tree-sort`（新增） | 三元素比较决策树展开 | 40 |
| `hash-buckets`（新增） | 键流落桶、链地址挂链、负载因子实时 | 50 |

新增组件规格：

### growth-race

- spec 字段：`budget`（操作预算滑块，如 10^6）、`curves`（固定五条：log n / n / n log n / n^2 / 2^n）、`maxN`。
- 画布：对数尺度曲线同框；竖直预算线与每条曲线的交点标出"最大可解规模 n"；下方表格随滑块刷新。
- 交互：拖 budget 与 maxN；悬停/点击曲线高亮并在表格中锁定行。
- 动画：无连续动画，交点标记淡入。

### invariant-tracer

- spec 字段：`array`（初始数组 ≤8 元素）、`algo`（首版仅 `insertion`）、`speed`。
- 画布：条形数组；绿色区=不变式成立的已排序前缀；橙色 key 卡片悬在上方；指针 j 与比较计数牌。
- 交互：「一步」执行一次比较或移动，「播放」连续推进，「重置」；每帧下方文字断言当前不变式（如"前 i 位是原前 i+1 个数的有序重排"）。
- 动画：交换/位移 150ms 平移；播放期间防重入。

### divide-tree

- spec 字段：`array`（长度为 2^k）、`mode`（merge/counting-inversions）、`showLayerCost`。
- 画布：上层自顶向下分裂、下层自底向上合并的双相树；右侧每层代价条累计为 n·层数。
- 交互：「分裂一层」「合并一层」分相按钮，「自动」播放；点击节点看该子问题规模。
- 动画：节点展开 200ms；合并阶段色块归并滑动。

### decision-tree-sort

- spec 字段：`items`（固定 3 个元素 a/b/c）、`leafHighlight`。
- 画布：二叉决策树，内部节点标比较式（a:b），叶标排列结果；路径随点击下行点亮。
- 交互：点击内部节点选择"是/否"分支走到叶；「展示全部叶」平铺 3!=6 个叶并显示最小深度 ceil(log2 6)=3。
- 动画：下行逐步点亮；无连续动画。

### hash-buckets

- spec 字段：`m`（桶数滑块 4–16）、`keys`（键数组）、`hashFamily`（首版仅 k mod m）、`collisionPolicy`（chaining）。
- 画布：一排桶槽，冲突键以链节竖挂；右上角负载因子 α=n/m 与冲突计数牌。
- 交互：拖 m 实时重散列（链条搬家动画）；「插入一个键」单步；「随机 20 键」批量演示后 datachart 直方图联动。
- 动画：落桶抛物线 250ms；调 m 时全部链条重排过渡。

## 4. 七门课题切分

### 10 · 大 O 记号与增长率

- 文件：`10-asymptotic-growth.md`
- 核心概念：大 O/Ω/Θ 把"规模变大时代价怎么长"压缩成增长等级；常数因子在渐近面前让位。
- 边界：讲三种记号定义直觉、五级增长率排序、欧几里得步数量级回扣；不讲严格极限定义式证明与复杂度类。
- 组件：`growth-race`（新增）+ `euclid`（现有）+ `plot`（现有）。
- 判题 exercise：n=1000 时二分/顺序查找最坏比较数 + gcd(1071,462) 除法步数。初始代码二分行写成 `int(math.log2(n))`（输出 9，丢掉了向上取整与 +1），学生改为 `math.ceil(math.log2(n + 1))`。期望输出：`二分查找最多比较: 10`、`顺序查找最多比较: 1000`、`欧几里得除法步数: 3`（步数由 while 循环实测统计——此处允许普通 while，非 while True）。math.ceil/math.log2 首现行加中文注释。
- 必写误区：①O(f) 是上界不是精确值，Θ 才是"同阶"；②log 的底在渐近意义下无关紧要（差常数因子）；③"快 10 倍的机器"改变常数，不改变增长等级的胜负。

### 20 · 循环不变式与正确性

- 文件：`20-loop-invariants.md`
- 核心概念：不变式是循环每轮开始时都为真的断言；初始化+保持+终止三步锁死正确性。
- 边界：讲线性搜索与插入排序两个不变式实例；不谈霍尔逻辑与程序验证器。
- 组件：`invariant-tracer`（新增）+ `domino`（现有，"每一轮都保持"的多米诺隐喻）。
- 判题 exercise：对 [5,2,4,6,1,3] 跑插入排序，打印处理完外层 i=2 后的数组。初始代码**漏掉内层结束后的落位语句 `arr[j] = key`**（能跑、会终止、但元素丢失，输出 [5, 5, 5, 6, 1, 3]），学生补上这一行即得正确轨迹。期望输出：`处理完 i=2 后数组: [2, 4, 5, 6, 1, 3]`、`外层已处理次数: 3`。
- 必写误区：①不变式弱到永真（如"数组是数组"）毫无用处，要强到终止时可推出结论；②落位语句正是恢复不变式的最后一步，删掉它循环照样停但结果错；③初始化成立要在循环前单独验证，不能想当然。

### 30 · 分治与主定理直觉

- 文件：`30-divide-conquer-recursion-tree.md`
- 核心概念：T(n)=aT(n/b)+f(n) 用递归树按层求和；三层比较（根重/叶重/每层均摊）给出答案。
- 边界：讲递归树法与主定理三种情形的直觉版（只陈述）；不讲 Akra-Bazzi 与代换法证明。
- 组件：`divide-tree`（新增）。
- 判题 exercise：T(n)=2T(n/2)+n、T(1)=0 求 T(8)，与 n·log₂n 对照。初始代码写成 `3 * T(n // 2) + n`（三路分裂，输出 38），学生把系数改回 2。期望输出：`T(8) = 24`、`n*log2(n) 参照: 24`（第二行由 `int(8 * math.log2(8))` 给出）。输入只用 2 的幂，回避取整歧义。
- 必写误区：①递归树的每层代价之和才是总数，只看叶子会算错；②主定理情形二"每层一样多"对应 n log n，不是 n²；③子问题规模必须真的趋近 1，否则递归不落地。

### 40 · 排序下界与决策树

- 文件：`40-sorting-lower-bound.md`
- 核心概念：比较排序的每个算法是一棵二叉决策树，n! 种结果逼出至少 log₂(n!) 次比较。
- 边界：讲决策树模型、三元素完整树、下界陈述与计数排序"绕过比较"的一句话口子；不实现计数排序，不讲斯坦纳树式优化。
- 组件：`decision-tree-sort`（新增）。
- 判题 exercise：4 个元素的排列数与最小比较次数下界。初始代码把叶数写成 `leaves = n`（输出 4 与 2），学生改为 `math.factorial(n)` 得 24 与 5。期望输出：`叶数 = 24`、`最小树高下界 = 5`（由 `math.ceil(math.log2(leaves))` 给出）。
- 必写误区：①下界针对"所有基于比较的算法"，不是某个实现写得差；②树高是最坏情形比较次数，最好情形可以更少；③log₂(n!)≈n log n 由斯特林近似桥接，本章只引用不推导。

### 50 · 哈希、冲突与期望分析

- 文件：`50-hashing-collisions.md`
- 核心概念：哈希把键压进有限桶，冲突不可避免；链地址法的平均代价由负载因子 α=n/m 决定。
- 边界：讲除留余数、链地址、负载因子与生日界；不讲开放寻址细节与全域哈希证明。
- 组件：`hash-buckets`（新增）+ `clockmod`（现有）+ `datachart`（现有，桶长直方图）+ `dice`（现有，生日模拟素材）。
- 判题 exercise：生日问题首次碰撞人数（365 天、阈值 0.5）+ 负载因子。初始代码把判断写成 `if p_no > 0.5: break`（方向反了，第 1 人就跳出，输出 1 和 0.0），学生改回 `if p_no < 0.5: break`。期望输出三行：`首次碰撞人数: 23`、`该人数下碰撞概率约: 0.507`、`负载因子: 1.25`（第三行由 10 键 8 桶 `round(keys / m, 2)` 正确给出作锚点）。浮点边界远离 0.5，判定稳定。
- 必写误区：①哈希快是平均意义，最坏仍可能全撞一桶；②α 控制的是链长期望长度，不是冲突总次数；③生日界说 23 人就有半数把握，直觉严重低估碰撞。

### 60 · 栈、队列与堆

- 文件：`60-stack-queue-heap.md`
- 核心概念：访问顺序约束（LIFO/FIFO/优先级）是数据结构的灵魂；堆用数组就能表示完全二叉树。
- 边界：讲栈/队列语义、堆的父子下标公式与 sift-up/down、优先队列用途；不讲斐波那契堆与左倾堆。
- 组件：Python 堆实验为主场（建堆、两次弹出的全过程打印）；`domino`（现有）做"sift 逐层修复"隐喻。
- 判题 exercise：对 [4,10,3,5,1] 建最大堆并弹出两次。初始代码 sift-down 的比较符号写成 `<`（建成最小堆，弹出 1 和 3），学生把两处比较改成 `>`。期望输出：`第一次弹出: 10`、`第二次弹出: 5`、`新堆顶: 4`。骨架代码给足（含注释），改动点只有比较符两处。
- 必写误区：①数组里 i 的孩子是 2i+1 与 2i+2，从 0 数起别错位；②建堆只需从最后一个非叶节点倒序 sift，O(n) 不是 O(n log n)；③栈和队列只是"插入删除位置受限"的列表，性能差异来自访问模式。

### 70 · 图遍历的数学：BFS、DFS 与记账

- 文件：`70-graph-traversal-accounting.md`
- 核心概念：BFS 用先进先出保证层序=最短跳数；O(V+E) 是"每个点入队一次、每条边扫一次"的记账结论。
- 边界：讲 BFS 距离性质、FIFO/LIFO 差异、V+E 记账法；不重教图定义与 Dijkstra（引用 第 29 章），不讲双连通分量。
- 组件：Python 遍历实验主场 + `matrix-power`（现有，邻接矩阵幂验证 k 步可达）。
- 判题 exercise：无向图边 1-2、1-3、3-5、5-4、2-4，从 1 出发求距离表。初始代码取队首写成 `node = queue.pop()`（LIFO，深度优先化，输出 [0, 1, 1, 3, 2]），学生改为头指针读法 `node = queue[head]; head += 1`（首现行中文注释：head 指向下一个要出队的元素）。期望输出：`距离表: [0, 1, 1, 2, 2]`、`顶点 4 的最短距离: 2`。
- 必写误区：①pop() 从尾部拿元素就把队列变成了栈，遍历性质整个改变；②BFS 距离只对无权图等于最短路，有权图要另请 Dijkstra；③V+E 里 E 按有向弧计，无向图存两份所以是 2E 次扫描。

插课缝隙：`65-union-find.md`（并查集与摊还分析直觉）预留 x5 号，依赖 70 课、与第 32 章 P-NP 无关、可与第 29 章图论互链。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | algorithms/asymptotic-growth | numtheory/gcd, sequences/sigma | 3 | big-o, theta-notation |
| 18 | algorithms/loop-invariants | algorithms/asymptotic-growth, math-language/induction-advanced | 3 | loop-invariant |
| 19 | algorithms/divide-conquer-recursion-tree | algorithms/loop-invariants, sequences/fibonacci | 3 | recursion-tree, master-theorem |
| 20 | algorithms/sorting-lower-bound | algorithms/divide-conquer-recursion-tree | 4 | decision-tree-model, lower-bound |
| 21 | algorithms/hashing-collisions | algorithms/sorting-lower-bound, numtheory/mod, prob/counting | 3 | hash-function, load-factor |
| 22 | algorithms/stack-queue-heap | algorithms/hashing-collisions | 3 | stack, queue, heap |
| 23 | algorithms/graph-traversal-accounting | algorithms/stack-queue-heap, graph-theory/paths-connectivity | 3 | bfs-distance, amortized-accounting |

工具登记预计全空（所用 math.*/random 均已出生）；若 70 号课最终引入 `collections.deque`，先在本文件登记理由再办出生证明，当前设计刻意用头指针规避。

## 6. 整章验收清单

1. 5 个新 renderer 注册且 validate 通过；每个新组件 ≥1 课真实消费（`invariant-tracer`、`hash-buckets` 各 ≥2 课更佳）；dataset 守卫与防重入守卫齐全。
2. 每课一个判题 exercise：独立解法与 `@check` 逐行一致；本指导所列期望输出（尤其 20/60 号课的追踪序列）须被实测复现；初始代码一律"能跑、能终止、结果明显不对"。
3. 与既有章节零重复：欧几里得只回扣、图定义不重讲、归纳法只引用；发现重推导即打回。
4. 每课 quiz ≥1、误区卡 2–3 条、每课 ≥1 个可玩交互（组件或 Python 实验）。
5. `npm run validate && npm run build` 全绿；h2 计数体检一致；行内花括号用 `\lbrace\rbrace`、显示公式单行。
6. 浏览器抽测五组件交互 + exercise 流 + Alt+P 浮窗 + 路由切换无重复注入；360px + dark 无溢出。
7. 报告合并 `CONTENT_AUDIT.md`；非阻塞项入 `AUDIT_REPORTS/OPEN_ITEMS.md`；ROADMAP 补本章进度小节。
