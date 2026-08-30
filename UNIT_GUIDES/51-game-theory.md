# 第 51 章 · 博弈论与机制设计 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 6 门正式课已建成（10/20/30/40/50/60）；**真缺口 1 门：零和博弈与 minimax（拟 25 号位）**
> 目标：9 门课题中 6 门已落盘，混合策略并入 20 课、机制设计并入 40 课，零和 minimax 待产
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L11 / track optimization-control / stage research-elective（章级 difficulty 4）

## 1. 章定位

当每个人的最优选择取决于别人的选择，普通优化失效。本章沿一条主线推进：

```text
收益矩阵与占优 → 纯策略纳什均衡 → 混合策略与无差异 → 零和 minimax → 重复博弈与合作 → 不完全信息与信念更新 → 拍卖四种格式 → 机制设计与激励兼容 → 在线学习与无悔
```

两条贯穿问题：①稳定状态长什么样（均衡）；②规则怎么反过来被设计（机制）。每课先博弈表后公式；禁止"囚徒困境讲十遍、机制设计一句带过"的失衡结构。

## 2. 前置覆盖

真实存在的前置课（已 grep 核实 lesson_id）：

- `algebra/inequality`、`algebra/linear-equation`：占优比较与无差异方程求解。
- `prob/stats`：期望＝概率加权平均——混合策略收益的全部家当。
- `prob/law`：频率解释混合比例。
- `functions/linear`、`sequences/sigma`：期望收益直线与累计求和。
- `rl/return-discount`：贴现因子 γ 的语言（重复博弈直接复用）。
- `rl/bandit-regret`：遗憾的定义与多臂背景——90 课的直接续接。

占位骨架处置（**不得写进 prereqs**）——**口径更正**：以下各章现已建成正式课，可按实际 lesson_id 正常串 prereqs；下文保留当时的「自带最小版」策略备查：

- 第 43 章 optimization 已建成 → minimax 与拉格朗日思想仍本章自带，不引用。
- 第 39 章 bayesian-stats 已建成 → 贝叶斯信念更新仍在 60 课内联两行最小版（先验×似然→归一化），注明系统版见第 39 章。
- 第 50 章虽完整但只取两课作 prereqs（return-discount、bandit-regret），避免整章依赖过重。

## 3. 组件清单

index「计划交互形态」→ 组件映射：收益矩阵均衡探测器→`payoff-matrix`；最佳响应轨迹图→`best-response-flow`；拍卖竞价模拟器→`auction-sim`；无悔算法累计损失实验→`regret-race`。

| renderer | 核心交互 | 服务课 | 状态 |
| --- | --- | --- | --- |
| `payoff-matrix` | 格子悬停看双向最佳响应箭头 + 占优剔除 | 10/20/40/80 | 新增 |
| `best-response-flow` | 期望收益双直线交点 + 最佳响应阶梯 | 30 | 新增 |
| `coinlaw` | 硬币频率收敛＝混合比例的频率解释 | 30 | 现有 |
| `plot` | 收益曲线补充图 | 50 | 现有 |
| `dice` | 掷骰先验直觉 | 60 | 现有 |
| `auction-sim` | 四种拍卖制跑价与收入读数 | 70/80 | 新增 |
| `regret-race` | 三条累计损失折线赛跑 | 90 | 新增 |

新增组件规格：

### payoff-matrix

```json
{ "type": "payoff-matrix", "title": "谁都不想动",
  "rowNames": ["合作", "背叛"], "colNames": ["合作", "背叛"],
  "rowPayoff": [[3, 0], [5, 1]], "colPayoff": [[3, 0], [5, 1]] }
```

画布：2×2（可扩 2×3）格子矩阵，每格上行甲收益、下行乙收益。交互：悬停/触点某格时高亮该列甲的最大值格与该行乙的最大值格并画箭头；按钮「剔除劣策略」逐轮灰化非最佳响应行列；剩余唯一格标记为均衡。动画：灰化淡出 200ms。rowPayoff 与 colPayoff 尺寸必须一致，非法时报错文案。

### best-response-flow

```json
{ "type": "best-response-flow", "title": "让对方无所谓",
  "rowPayoff": [[0.5, 0.8], [0.9, 0.2]] }
```

画布：上半随对方混合比例 q 变化的两条期望收益折线（交点即无差异点），下半自己的最佳响应阶梯图。交互：滑块调自己混合概率 p（显示当前期望）与四个收益元素（±0.1 步进）；读数 q*、p* 与均衡期望值。动画：参数变化即时重绘，无播放。

### auction-sim

```json
{ "type": "auction-sim", "title": "四种拍卖一台戏",
  "valuations": [3, 7, 12],
  "formats": ["english", "dutch", "first", "second"],
  "shadeFactor": 0.8 }
```

画布：各家估值/出价条形 + 价格钟横线 + 成交者标记 + 卖方收入读数。交互：按钮切换四种格式；滑块改估值与一级拍卖压价系数 shadeFactor；英式逐档抬价/荷式逐档降价由「单步」驱动。动画：价格钟步进移动 <200ms，可关。

### regret-race

```json
{ "type": "regret-race", "title": "后悔值越追越小",
  "expertLosses": [[0, 1, 0, 1, 1], [1, 0, 1, 0, 0]],
  "eta": 1.0 }
```

画布：专家 A/B 与算法三条累计损失折线 + 当前遗憾差值读数框。交互：滑块 η；点击损失格翻转 0/1 自定义对手序列；按钮单步前进/重置。动画：仅步进推进，不做自动连播。

## 4. 九门课题切分

### 10 · 收益矩阵与占优策略

- 文件：`10-payoff-dominance.md`
- 核心概念：博弈＝玩家×策略×收益；严格/弱占优；迭代剔除劣策略是第一把剪刀。
- 边界：讲二人离散博弈与剔除流程；不讲连续策略与反应函数。
- 组件：`payoff-matrix`。
- 判题 exercise：game 行保守值 row_floor(i) 取每行甲收益最小者：row_floor(0)=`0`、row_floor(1)=`1`（据此选行 1）。初始代码写成取最大。@check 两行：`0` / `1`。
- 必写误区：占优是比较整行/整列，不是比单个格子；弱占优不能保证唯一剔除结论；收益是序数也够用时别硬解释成金额。

### 20 · 纳什均衡：谁都不想单方面改

- 文件：`20-nash-equilibrium.md`
- 核心概念：NE＝互为最佳响应的策略组合；用「列最大∩行最大」在 2×2 里找纯策略 NE；囚徒困境与协调博弈对照。
- 边界：讲纯策略 NE 判定；不讲存在性定理证明（混合版下一课自然带出）。
- 组件：`payoff-matrix`。
- 判题 exercise：对称囚徒困境 A=B=[[3,0],[5,1]]，双重最佳响应筛选输出 cells=[[1, 1]]。初始代码把"列最优"误查成"行最优"。@check 一行：`[[1, 1]]`。
- 必写误区：NE 不是"最好的结果"，是"没有动力偏离的状态"；均衡可以多个也可以不存在（纯策略下）；帕累托更优的组合未必是均衡——这是困境的来源。

### 30 · 混合策略与无差异原理

- 文件：`30-mixed-strategies.md`
- 核心概念：以概率混合策略；均衡条件变成「让对方对我的选择无差异」；解一元线性方程得混合比例。
- 边界：讲 2×2 无差异方程求解；不讲支撑集理论与一般解法。
- 组件：`best-response-flow` + `coinlaw`（频率视角：长期频率≈混合概率）。
- 判题 exercise：P=[[0.5,0.8],[0.9,0.2]]（守门员扑救博弈），q*=(P01−P11)/[(P01−P11)+(P10−P00)] round 三位 → `0.6`；均衡期望收益 → `0.62`。初始代码分母漏第二项。@check 两行：`0.6` / `0.62`。
- 必写误区：混合是为了不被预测，不是"平均更稳"；你的混合比例由对方的收益决定，不是由你自己的收益决定；零概率支撑的纯策略不在均衡里也要会读。

### 40 · 零和博弈与 minimax

- 文件：`40-zero-sum-minimax.md`
- 核心概念：一方所得即另一方所失；maximin ≤ minimax（纯策略）；差距存在时必须混合——石头剪刀布的教训。
- 边界：讲 2×3 矩阵的行最小/列最大账本；不讲 von Neumann 定理证明与 LP 对偶。
- 组件：`payoff-matrix`。
- 判题 exercise：M=[[4,1,6],[2,3,5]]：floors=`[1, 2]`、maximin=`2`、ceilings=`[4, 3, 6]`、minimax=`3`。初始代码 min/max 全写反。@check 四行：`[1, 2]` / `2` / `[4, 3, 6]` / `3`。
- 必写误区：maximin 是"保底"，minimax 是"封顶"，二者不是同一玩家的量；2<3 说明无鞍点——安全做法反而要随机；零和假设在现实协作场景常被滥用。

### 50 · 重复博弈与合作直觉

- 文件：`50-repeated-games-cooperation.md`
- 核心概念：无限重复＋足够看重未来（贴现 γ）时，合作可以成为均衡；以牙还牙＝先合作再模仿对方上一手。
- 边界：讲有限重复的倒推崩溃与无限重复的影子；不讲民间定理与触发策略谱系。
- 组件：浮窗 TFT 锦标赛模拟 + `plot`（累计收益折线）。
- 判题 exercise：round_payoff 编码 C=1/D=0（3/3、5/0、0/5、1/1），opp=[1,0,0,1,1]，TFT 出招序列 my_moves=`[1, 1, 0, 0, 1]`、总得分=`12`。初始代码恒背叛得 9。@check 两行：`[1, 1, 0, 0, 1]` / `12`。
- 必写误区："无限重复"指没有确定的最后一轮，不是时间真的无限；γ 太小时合作瓦解——合作的寿命由贴现决定；以牙还牙不是宽恕策略的极端，两败俱伤循环可能发生。

### 60 · 不完全信息与信念更新

- 文件：`60-incomplete-info-beliefs.md`
- 核心概念：玩家有私有"类型"；观察到的行动/信号是类型的证据；贝叶斯更新两行版（先验×似然→归一化）把概率从 0.5 改到 0.727。
- 边界：讲信号与后验计算；不讲 PBE/序贯均衡定义（展望一句话）。
- 组件：`dice`（先验直觉）+ 浮窗更新计算。
- 判题 exercise：prior=[0.5,0.5]、lik=[0.8,0.3]：全概率 total=`0.55`、强者后验 round 三位 `0.727`。初始代码忘乘先验。@check 两行：`0.55` / `0.727`。
- 必写误区：更新改的是信念分布，不是世界本身；似然≠后验——虚张声势更像强者的行为不等于发出者是强者；共同知识缺失才是"不完全信息"的要害，不只是信息少。

### 70 · 拍卖与收入等价直觉

- 文件：`70-auctions-revenue.md`
- 核心概念：英式/荷式/一级/二级四种格式的出价逻辑；二级封价中"报真实估值"是占优策略；一级要压价；收入等价的直觉版陈述。
- 边界：讲四种格式机制对比与二级占优验证；不讲风险厌恶修正与合谋分析。
- 组件：`auction-sim`。
- 判题 exercise：bids=[7,12,5]，二级封价：赢家下标 winner=`1`、成交价 price=`7`。初始代码按一级逻辑付自己报价。@check 两行：`1` / `7`。
- 必写误区：二级拍卖报高价不会多赚（付别人的价），报低价只会白输；一级压价幅度取决于竞争强度与风险态度；收入等价是理想条件下的事——条件一破收入就分化。

### 80 · 机制设计与激励兼容

- 文件：`80-mechanism-design-ic.md`
- 核心概念：把博弈规则当设计变量：机制＝结果映射＋付费规则；激励兼容（说真话最优）与个体理性（参与不亏）两大约束；VCG＝二级价格的推广一瞥。
- 边界：讲 IC/IR 定义与单件分配验证；不讲 VCG 一般效率证明与预算平衡悖论细节。
- 组件：`auction-sim`（二级＝VCG 特例）+ `payoff-matrix`（规则改变前后对比）。
- 判题 exercise：my_value=8、other_max=6，utility(report)：赢则 my_value−other_max：report=8→`2`、report=10→`2`、report=5→`0`——抬价无益压价有损。初始代码误以为付自己报价。@check 三行：`2` / `2` / `0`。
- 必写误区：机制设计是逆向博弈论——先定规则再看均衡；IC 是每个参与者逐人的性质，不是系统整体美德；好机制常要在效率、收入、简单性之间做取舍，VCG 并不全赢。

### 90 · 在线学习与无悔算法

- 文件：`90-online-learning-regret.md`
- 核心概念：遗憾 R_T＝固定最优策略收益 − 算法累计收益；指数权重按 e^(−η·损失) 分配信任；η 控制探索；无悔＝R_T/T→0。
- 边界：讲 EW 算法五轮手算与遗憾记账；不讲下界匹配与镜像下降推广。
- 组件：`regret-race`。
- 判题 exercise：losses=[[0,1,0,1,1],[1,0,1,0,0]]、η=1、权重按 math.exp(−η·loss) 更新：算法累计损失 round 三位 `2.962`、专家累计 `[3.0, 2.0]`。初始代码权重永不更新恒对半分得 2.5。@check 两行：`2.962` / `[3.0, 2.0]`。
- 必写误区：遗憾小是相对事后最优的差距，不代表绝对损失小；对手可以是自适应的——EW 的保证对任意序列成立；η 过大追涨杀跌，过小学得慢，没有免费午餐。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | gametheory/payoff-dominance | prob/stats, algebra/inequality | 3 | payoff-matrix, dominated-strategy |
| 18 | gametheory/nash-equilibrium | gametheory/payoff-dominance | 4 | nash-equilibrium, best-response |
| 19 | gametheory/mixed-strategies | gametheory/nash-equilibrium, algebra/linear-equation | 4 | mixed-strategy, indifference-principle |
| 20 | gametheory/zero-sum-minimax | gametheory/mixed-strategies | 4 | zero-sum-game, maximin-minimax |
| 21 | gametheory/repeated-games | gametheory/nash-equilibrium, rl/return-discount, sequences/sigma | 4 | repeated-game, tit-for-tat |
| 22 | gametheory/incomplete-info-beliefs | gametheory/mixed-strategies, prob/law | 4 | bayesian-type, belief-updating |
| 23 | gametheory/auctions-revenue | gametheory/payoff-dominance, gametheory/incomplete-info-beliefs | 4 | auction-formats, revenue-equivalence-intuition |
| 24 | gametheory/mechanism-design | gametheory/auctions-revenue | 5 | mechanism-design, incentive-compatibility |
| 25 | gametheory/online-regret | gametheory/mixed-strategies, rl/bandit-regret | 4 | regret, exponential-weights |

工具登记口径：`min/max` 已出生（real-analysis/cauchy-sequences 等）、`sum/abs/round/math.exp` 均已出生，无需登记；matplotlib/random 出生于 python-tools。禁 input()/while True；所有收益/期望计算手写循环，禁 numpy（第 53 章才出生）。

## 6. 整章验收清单

1. 四个新 renderer 注册且 validate 可识别；`payoff-matrix` 至少被 10/20/40/80 四课消费。
2. 每课判题 exercise 初始代码能运行但结果不对；@check 与独立解法逐字一致（列表含空格格式一致）。
3. prereqs 全部指向真实存在且更前的课（§5 表核实过 chNum 顺序：rl/* 属第 50 章 < 380 合法）。
4. MDX 双坑体检：显示公式单行；花括号 \lbrace\rbrace；quiz 题干纯文字无 KaTeX。
5. `npm run validate` + `node scripts/gen-graph.mjs` + `npm run build` 全绿；h2 计数一致。
6. 浏览器实测三类块 + Alt+P 浮窗判题链；路由切换无重复注入；360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`；非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
