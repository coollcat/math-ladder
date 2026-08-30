# 第 37 章 · 随机过程 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 11 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：11 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L5 / track probability-statistics / stage university-core / 章级 difficulty 4

## 1. 章定位

单个随机变量一刻就揭晓命运；随机过程是一整条不断分岔的时间线。本章沿主线推进：

```text
样本路径 → Markov 性质与转移矩阵 → Chapman-Kolmogorov 多步预测 → 吸收与常返 → 平稳分布与遍历性 → PageRank 实战 → 泊松过程 → 布朗运动
```

核心问题三个：状态怎么转移（20–30）、长期去向哪里（40–60）、连续时间怎么长出来（70–80）。每课都要有"一条看得见的路径"：粒子流、热力图或时间轴；不能只写矩阵公式。

## 2. 前置覆盖

- 第 36 章（同卷更前）已建立条件概率、期望方差、离散/连续分布家族与 CLT——本章每一步转移都直接调用，不重复推导。
- 第 29 章 `graph-theory/random-walk-preview` 已在图上预演过转移矩阵与平稳分布概念（introduces_concepts 已登记 transition-matrix-on-graph、stationary-distribution）。
- 第 21 章 `linalg-advanced/matrix-powers`、`linalg-advanced/eigenvalues` 已有矩阵幂与特征向量语言；第 08 章 `sequences/fibonacci` 已有递推时间步语言；第 10 章 `numtheory/mod` 的循环直觉可类比状态循环。

**概念登记纪律**：stationary-distribution 与 transition-matrix-on-graph 已在第 29 章 115 号课（random-walk-preview）注册（单一注册制）。本章第 50 课是它们的「转正深化」，introduces_concepts 只登记新概念（ergodicity 等），正文显式回链预告课。Markov 性质本身全站未出生，由本章 20 课注册。

本章不重复教矩阵乘法与特征值定义，不重复 36 章的泊松分布/指数分布入门（70 课从"过程"视角接手）。

## 3. 组件清单

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `dice`（现有） | 单步随机噪声源演示 | 10/80 |
| `path-gallery`（新增） | 同过程多条样本路径并排生长 + 均值带 | 10/80 |
| `matrix`（现有） | 转移矩阵数值展示 | 20/30 |
| `markov-flow`（新增） | 状态圆盘粒子按概率分流；吸收模式统计落点 | 20/30/40 |
| `matrix-heat`（新增） | P^k 热力图随 k 滑块演化，行向量收敛可见 | 30/50 |
| `eigen-direction`（现有） | 平稳分布 = 左特征向量的二维演示 | 50 |
| `coinlaw`（现有） | 时间平均 vs 空间平均对照回放 | 50 |
| `pagerank-web`（新增） | 点击增删网页链接，rank 半径动画重排 | 60 |
| `poisson-arrival`（新增） | 时间轴随机落点 + 计数/间隔双直方图 | 70 |
| `plot`（现有） | 泊松 pmf 与指数密度同框对比 | 70 |

### 新增组件规格

1. **path-gallery** —— spec 字段：`{"type":"path-gallery","process":"brownian","steps":100,"paths":12,"band":true}`（process ∈ randomwalk/brownian）。画布：多条半透明样本路径 + 白色均值线 + ±2σ 阴影带。交互：paths/steps 滑块、「重掷」按钮换种子、hover 单路径加亮。动画：「逐步生长」开关控制路径从左往右延伸。
2. **markov-flow** —— spec 字段：`{"type":"markov-flow","states":["晴","雨"],"transitions":[[0.8,0.2],[0.6,0.4]],"particles":60,"absorbing":[]}`。画布：状态圆盘节点，弧线宽度∝转移概率，粒子沿弧流动；吸收态画成方形并高亮。交互：点击弧编辑概率（行和自动归一化提示）；absorbing 模式追加落入各吸收态计数条与步数直方图。动画：requestAnimationFrame 连续粒子流，页面离开自动暂停。
3. **matrix-heat** —— spec 字段：`{"type":"matrix-heat","matrix":[[0.8,0.2],[0.6,0.4]],"k":1,"maxK":20}`。画布：P^k 数值热力图 + 每行向量的条形读数。交互：k 滑块（整数步进），单元格 hover 显数值。动画：无补间即时重算（小矩阵开销可忽略）。
4. **pagerank-web** —— spec 字段：`{"type":"pagerank-web","edges":[["A","B"],["A","C"],["B","C"],["C","A"]],"damping":1.0,"iterations":20}`。画布：有向图布局，节点半径∝PageRank，颜色深浅同步，边上箭头可点选。交互：先点源点再点点收点即加边（再点一次删除）；damping 滑块；rank 数值标签开关。动画：rank 更新时半径缓动过渡。
5. **poisson-arrival** —— spec 字段：`{"type":"poisson-arrival","lambda":2,"window":1,"speed":1}`。画布：横向时间轴上事件刻度逐个落下，上方滑动窗口计数曲线，右侧窗口计数与到达间隔双直方图实时累积。交互：λ、窗口宽滑块；播放/暂停/清空。动画：事件按指数间隔逐点生成，时间轴滚动。

验收：5 个新 renderer 注册进 `RENDERERS`，有源码签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 八门课题切分

### 10 · 从随机变量到随机过程

- 文件：`10-paths-processes.md`
- 核心概念一句话：随机过程是带时间索引的一族随机变量 {X(t)}，样本路径是一次实现的完整轨迹。
- 边界：讲过程/路径/有限维分布直觉；不讲严格的过程存在性定理（Kolmogorov 扩张定理一句提及即可）。
- 组件：`path-gallery`（新增）+ `dice`（现有）。
- 判题 exercise：给定递推 X(n+1) = X(n) + 1 + 噪声，其中噪声每步独立、零均值、方差 2，求 X(3) 的均值与方差（X(0)=5）。初始代码把每步总增量方差错算成 2 的平方（Var 算成 18）；学生改成逐步累加方差 2×3=6。@check 逐行：`mean_3 = 8.0`／`var_3 = 6.0`。
- 必写误区：路径是一条实现不是分布本身；同一过程的多个路径均值才回到确定趋势；有限维分布不能唯一确定过程性质（一句提及独立性才是关键假设）。

### 20 · Markov 性质与转移矩阵

- 文件：`20-markov-transition.md`
- 核心概念一句话：给定现在，未来与过去无关；转移矩阵每一行就是「站在该状态时下一步」的条件概率分布。
- 边界：讲 Markov 性质、转移矩阵行归一化、一步预测；不讲时齐/非时齐的一般理论。
- 组件：`markov-flow`（新增）+ `matrix`（现有）。
- 判题 exercise：天气链 P=[[0.8,0.2],[0.6,0.4]]（行=今天晴/雨），验证行和并求「今天晴、后天雨」的概率。初始代码两步概率写成单步乘积 0.8*0.2=0.16（漏了中途分岔求和）；学生改成 p1*p2+p2*p2 形式的两点求和（即矩阵行×列）。@check 逐行：`rows_sum_to_one = True`（容差判断）／`two_step_rain = 0.24`（round 两位）。
- 必写误区：行约定还是列约定必须全文一致（本课锁定行约定）；Markov ≠ 无记忆到"未来只依赖最后一步的概率值"以外的东西都不管——是说条件分布只看当前状态；现实很多过程不是 Markov（反例：只记股价最大值的过程）。

### 30 · Chapman-Kolmogorov 与多步预测

- 文件：`30-chapman-kolmogorov.md`
- 核心概念一句话：k 步转移矩阵就是 P 的 k 次幂；CK 方程是「中途任一分岔点求和」的矩阵语言。
- 边界：讲 P^k 计算与路径计数直觉；不讲一般状态的 CK 测度论形式。
- 组件：`matrix-heat`（新增）+ `markov-flow`（现有复用，多步档）+ `matrix`（现有）。
- 判题 exercise：同一天气链，求初始晴时三天后的分布。初始代码把 P^3 错写成标量乘法 `P * 3`；学生实现两次矩阵乘方（或用循环乘三次）。@check 单行：`after_3 = [0.752, 0.248]`（round 三位）。
- 必写误区：P^k 的 (i,j) 是"从 i 到 j"不是联合概率；矩阵乘法不可交换所以顺序虽在此无感、习惯必须立正；多步预测收敛现象先看见、下下课解释。

### 40 · 吸收链、常返与暂过

- 文件：`40-absorbing-recurrence.md`
- 核心概念一句话：常返态迟早回来，暂过态终会离开；吸收链里「最终落到哪个吸收态、平均花多久」都有确定答案。
- 边界：讲常返/暂过判据直觉与两态吸收链的精确计算；不讲一般吸收链 fundamental matrix 全套推导（给出结论式即可）。
- 组件：`markov-flow`（现有复用，absorbing 模式）+ `matrix-heat`（现有）。
- 判题 exercise：赌徒破产 N=3、起点 1、每周胜率 p=0.6，求最终到 3 的概率。初始代码用公平游戏公式 i/N=1/3；学生换成带偏差公式 (1−r)/(1−r³)（r=q/p）。@check 单行：`reach_3 = 0.4737`（round 四位）。
- 必写误区：暂过态被访问次数有限但可能很多次；公平赌局破产概率只由起点比例决定、不公平则严重偏向弱势方；"迟早发生"（概率 1）不等于"很快发生"（期望步数可以爆炸）。

### 50 · 平稳分布与遍历性

- 文件：`50-stationary-ergodic.md`
- 核心概念一句话：平稳分布满足 π=πP（左不动点）；不可约非周期链从任何起点收敛到它，且时间平均等于空间平均。
- 边界：讲不动点方程、收敛条件两条（不可约+非周期）、遍历性含义；不讲收敛速度谱隙理论。
- 组件：`matrix-heat`（现有复用，大 k 收敛）+ `eigen-direction`（现有）+ `coinlaw`（现有）。
- 判题 exercise：解天气链 π=[a,b]。初始代码按列约定解 π=Pπ 得出负分量（明显错）；学生改用 π=πP（转置视角）加归一化。@check 单行：`pi = [0.75, 0.25]`。
- 必写误区：π 是行向量左乘（与转移列约定之别是高频翻车点）；周期链有平稳分布但永不收敛；平稳 ≠ 卡死不动（个体持续游走、总体比例稳定）。

### 60 · PageRank：链接网上的马尔可夫链

- 文件：`60-pagerank-markov.md`
- 核心概念一句话：PageRank 就是「随机点击冲浪者」的平稳分布；阻尼项把任意图修成不可约非周期链。
- 边界：讲随机游走解释、阻尼因子作用、幂迭代算法；不讲个性化向量与垃圾链接攻防细节。
- 组件：`pagerank-web`（新增）。
- 判题 exercise：三页图 A→B,C；B→C；C→A，无阻尼幂迭代 20 轮求 rank。初始代码忘了按出度分配（整票投给单页），总质量爆炸数值明显错；学生给每个源的贡献除以出度数。@check 单行：`ranks = [0.5, 0.25, 0.25]`（round 两位）。
- 必写误区：悬空节点没有出边会漏质量（阻尼/修正正是为此）；rank 是访问频率不是页面数量；迭代轮数取固定值时结果要 round 展示（浮点渐近）。

### 70 · 泊松过程与等待时间

- 文件：`70-poisson-process.md`
- 核心概念一句话：稳定速率的稀有事件流在窗内计数服从泊松分布、相邻间隔服从指数分布——同一枚硬币的两面。
- 边界讲：独立增量与平稳增量的直觉陈述、计数/间隔互推；不讲齐次与非齐次过程的一般理论。
- 组件：`poisson-arrival`（新增）+ `plot`（现有）。
- 判题 exercise：公交车以 λ=2/小时 到达，求一小时内无车、恰 3 车的概率与平均等待。初始代码算 P(0) 时忘乘 e^(−λ)（得 1）；学生补 `math.exp(-lam)` 因子。@check 逐行：`P0 = 0.135`／`P3 = 0.180`（f-string `.3f`）／`EW = 0.5`。
- 必写误区：泊松分布的 λ 是单位时间强度、过程里还要乘窗口长度 t；指数间隔的无记忆性与几何分布是离散表亲；计数与间隔是同一过程两个视角不是两个独立对象。

### 80 · 布朗运动入门

- 文件：`80-brownian-motion.md`
- 核心概念一句话：缩放随机游走（步长 √Δt）的极限是布朗运动——连续但处处不平滑，方差随时间线性增长。
- 边界：讲缩放构造与三大性质（增量独立平稳、连续性、Var=t）；不讲 Ito 积分与 SDE（预告第 66 章 stochastic-analysis）。
- 组件：`path-gallery`（现有复用，process=brownian）+ `dice`（现有）。
- 判题 exercise：64 步、每步 ±√(1/64)，求终点位置的方差与标准差。初始代码步长写成线性 1/64（方差变 1/64）；学生给步长补 `math.sqrt`。@check 逐行：`var = 1.0`／`std = 1.0`。
- 必写误区：步长按 √Δt 缩放而不是 Δt——这是极限存在的代价；布朗路径连续但处处不可导（视觉上"毛刺无限细"）；Var(B(t))=t 是方差线性增长不是路径长度线性。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | stochastic/paths-processes | probadv/lln-clt, sequences/fibonacci | 4 | stochastic-process, sample-path |
| 18 | stochastic/markov-transition | stochastic/paths-processes | 4 | markov-property, transition-matrix |
| 19 | stochastic/chapman-kolmogorov | stochastic/markov-transition, linalg-advanced/matrix-powers | 4 | chapman-kolmogorov |
| 20 | stochastic/absorbing-recurrence | stochastic/chapman-kolmogorov | 4 | absorbing-chain, recurrence-transience |
| 21 | stochastic/stationary-ergodic | stochastic/absorbing-recurrence, linalg-advanced/eigenvalues | 5 | ergodicity, markov-convergence |
| 22 | stochastic/pagerank | stochastic/stationary-ergodic, graph-theory/random-walk-preview | 4 | pagerank, damping-factor |
| 23 | stochastic/poisson-process | probadv/discrete-family, probadv/continuous-family | 4 | counting-process, interarrival-time |
| 24 | stochastic/brownian-motion | stochastic/paths-processes, probadv/lln-clt | 5 | brownian-motion, scaling-limit |

注意：50 课**不得**重复登记 stationary-distribution（已在 graph-theory/random-walk-preview 出生），正文做「转正」回链即可；transition-matrix 在第 29 章 115 号课登记的是带 -on-graph 后缀的概念名，20 课登记无后缀通用版不冲突。所有 prereqs 已 grep 核实真实存在且编号在前（probadv/* 为 36 章规划课，属同卷更前章）。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；markov-flow 至少跨三课复用（flow/多步/absorbing 三档）。
2. 每课至少一个"看得见路径"的可视化入口；矩阵课必须有热力图或粒子流之一。
3. 每课一个判题 exercise：初始代码能运行但结果错，独立解法与 @check 逐行一致（数值见 §4，全部为确定性计算，禁用随机输出作判据；模拟演示放 viz/非判题 python 区）。
4. 每课有 quiz、误区卡、选读或边界说明；50 课对预告课的概念转正回链到位。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致（源 `^## ` vs 产物 `<h2`）；浏览器实测 exercise/quiz/viz；360px + dark 无溢出；markov-flow/poisson-arrival 动画离开页面停止（防后台耗电）。
7. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
