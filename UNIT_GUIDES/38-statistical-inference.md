# 第 38 章 · 统计推断与实验设计 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L5 / track probability-statistics / stage university-core（章 difficulty 4，单课 3–4）

## 1. 章定位

统计推断是在不完全信息中做负责任的结论。本章沿一条主线推进：

```text
统计量的抽样分布 → 估计好坏的标尺（偏差/MSE） → 最大似然估计 → Fisher 信息精度极限
→ 检验的两类错误 → p 值·效应量·功效 → 置信区间 → bootstrap 重采样 → A/B 实验
```

写作纪律：每一课都必须回答「这个结论离真值多远、有多可信」；全章反复围剿一个敌人——把 p 值当魔法印章。

## 2. 前置覆盖

- 第 09 章 `prob/stats`（均值/标准差/statistics 库出生地）与 `prob/law`（大数定律 + `random` 模拟思想）是直接地基。
- `exponents/log`（对数似然）、`calculus/rules`（求导找峰）、`functions/machine`（`math.ceil`）、`algebra/inequality`（拒绝域不等式）按需挂 prereqs。
- **第 36 章已建成（原注「尚未建成」为写作当时口径，现 14 门）**：条件概率、中心极限定理与正态曲线均可正常引用 `probability-advanced/*`。保留当时的处理办法备查——
  - 第 10 课用 `dice`/`statdots` 回扣频率稳定实验，把「样本均值的分布呈钟形」作为**可亲手复现的实验事实**给出，只陈述不证明 CLT；
  - 记号 $\mathcal{N}(\mu,\sigma^2)$ 与 z 分数分别在 10/50 课首次出现处现场构造并加中文说明；
  - 条件概率本章几乎不用，若个别选读需要，就地两句话补足，不开新坑。
- `linalg-advanced/least-squares` 只在 90 课选读里回扣一句（回归视角），不进 prereqs。

## 3. 组件清单

| renderer | 状态 | 核心交互 | 服务课 |
| --- | --- | --- | --- |
| `sampling-blender` | 新增 | 选总体+统计量，批量抽样搅拌出统计量直方图 | 10/20 |
| `mle-curve` | 新增 | 拖动参数 θ 找似然峰值，切换对数似然看曲率 | 30/40 |
| `power-grid` | 新增 | α/效应量/n 三滑块联动 H0-H1 双曲线、拒绝域阴影与四格计数 | 50/60/90 |
| `ci-resample` | 新增 | 一键再抽样画新区间条带，脱靶红色高亮 | 70 |
| `bootstrap-machine` | 新增 | 有放回重采样动画，统计量直方图累积+分位区间着色 | 80 |
| `dice` / `statdots` / `coinlaw` | 现有 | 频率稳定与分布形状回扣 | 10 开场 |
| `plot` | 现有 | 功效随 n 变化等单变量曲线 | 60 |

新增组件规格（全部走现有 viz JSON 围栏，注册进 `RENDERERS`，dataset 守卫防重复注入，暗色可读，canvas ≥260px）：

### sampling-blender

- spec 字段：`population`（数值数组或预设名 normal/uniform/skewed）、`statistic`（mean/median/max）、`n`、`draws`、`speed`。
- 画布：左侧总体直方图，右侧统计量抽样分布直方图实时生长，顶部读数（总体真值 vs 统计量均值 vs 经验标准差 vs 理论 SE）。
- 交互：「抽 1 组」「+100」「+2000」按钮 + n 滑块；换 statistic 下拉立即清空右图重建。
- 动画：抽样时小球从左袋飞入右柱（可关）；无连续循环。

### mle-curve

- spec 字段：`model`（bernoulli/normal-sigma-known）、`data`（如 `[1,1,0]` 或正态样本）、`thetaMin/thetaMax`。
- 画布：横轴 θ 的似然曲线（上）与对数似然（下，可切主视图），峰值金色标记，当前 θ 竖线。
- 交互：拖 θ 滑块或直接拖竖线；「显示曲率」开关叠加 Fisher 信息示意（40 课消费）。
- 动画：无（瞬时重算即可），θ 变化时读数 L(θ)、log L(θ) 同步刷新。

### power-grid

- spec 字段：`mu0`、`mu1`、`sigma`、`n`、`alpha`（滑块范围固定合理档位）。
- 画布：H0 与 H1 两条抽样分布曲线叠加，拒绝域红色阴影同时落在两曲线上；下方 2×2 四格表（真阴/假阳/假阴/真阳）按面积比例着色并给数字。
- 交互：α、效应量（μ1−μ0）、n 三个滑块；阴影与四格实时重排。
- 动画：无。

### ci-resample

- spec 字段：`mu`、`sigma`、`n`、`level`（0.90/0.95/0.99）、`maxIntervals`（默认 50）。
- 画布：水平真值竖线 + 逐次生成的置信区间条带堆叠；脱靶区间整条红、命中灰绿；侧栏计数「命中/总数」。
- 交互：「再抽一次」「+20」「清空」；level 下拉切换后清空重画。
- 动画：每条新区间淡入即可。

### bootstrap-machine

- spec 字段：`sample`（数值数组，默认内置一组 n=12 的身高样例）、`statistic`（mean/median）、`resamples`。
- 画布：上方原始样本点列；中间一次重采样的「抽中次数」点大小动画；下方统计量直方图累积，2.5%/97.5% 分位数之间着色为 percentile 区间。
- 交互：「重采样 ×1」「×200」「换统计量」；悬停直方图柱显示频数。
- 动画：×1 时逐个弹跳落点；×200 直接批量出图。

## 4. 课题切分

### 10 · 统计量与抽样分布

- 文件：`10-sampling-distribution.md`
- 核心概念：统计量自己也是随机变量——同一总体反复抽样，样本均值有自己的分布；标准误 $\sigma/\sqrt{n}$ 量化它的波动。
- 边界：讲总体/样本/统计量、抽样分布、标准误与 CLT 的实验版事实；不讲 CLT 证明、不讲正态密度推导。
- 组件：`sampling-blender` + `dice`（两骰子和的抽样分布回扣）+ `statdots`。
- 判题：总体 `[2,4,6,8]`，输出总体均值与 n=4 时理论标准误。初始代码把 σ 除以 n 而非 √n。`@check: 5.0` / `@check: 1.118`。
- 必写误区：抽样分布是统计量的分布不是总体的分布；n 翻倍 SE 只缩 √2 倍不是减半；大数定律说均值趋于稳定，不等于单次样本更接近真值。

### 20 · 点估计：偏差与均方误差

- 文件：`20-estimator-bias-mse.md`
- 核心概念：评价估计量看两个维度——偏差（瞄得准不准）与方差（手稳不稳），$\mathrm{MSE}=\text{偏差}^2+\text{方差}$。
- 边界：讲偏差/方差/MSE 分解并用固定小例子比较两个估计量；不讲一致性与渐近有效性定义，Cramér-Rao 只留一句预告给 40 课。
- 组件：`sampling-blender`（切 mean/median 对比直方图）。
- 判题：真值 θ=5；估计 A 恒返回 4.0，估计 B 无偏但方差 0.81。输出两者 MSE 并指认更优者。初始代码把 A 的方差算成 0.81（张冠李戴）。`@check: 1.0` / `@check: 0.81` / `@check: B`。
- 必写误区：无偏≠好（方差可能巨大）；MSE 不是绝对误差的平均；偏差不随 n 增大消失而方差会——两者病因不同。

### 30 · 最大似然估计 MLE

- 文件：`30-mle.md`
- 核心概念：似然是「参数取某值时已见数据出现的概率」；MLE 是让数据最不惊讶的参数；取对数把连乘变连加再求导找峰。
- 边界：讲 Bernoulli 与 σ 已知正态两个模型的完整求解；不讲充分统计量、不变性原理与数值优化实现。
- 组件：`mle-curve`。
- 判题：抛 3 次 2 正 1 反，输出 p̂ 与该处似然值。初始代码硬编码 p̂=0.5。`@check: 0.667` / `@check: 0.148`。
- 必写误区：似然不是 θ 的概率分布（积不出 1）；小样本极端数据让 MLE 荒谬（0 正 3 反 → p̂=0）；最大化似然≠最大化数据出现次数。

### 40 · Fisher 信息与估计精度极限

- 文件：`40-fisher-information.md`
- 核心概念：对数似然峰越尖=数据越挑剔=估计越准；Fisher 信息就是曲率，Bernoulli 的 SE(p̂)=√(p(1−p)/n)。
- 边界：讲曲率直觉、得分函数一句话版与上述 SE 公式的使用；不讲测度论定义与效率的严格证明。
- 组件：`mle-curve`（开曲率叠加）+ Python 数值验证 SE 随 n 收缩。
- 判题：p=0.8 时分别算 n=100 与 n=400 的 SE。初始代码忘了除以 n。`@check: 0.04` / `@check: 0.02`。
- 必写误区：Fisher 信息不是熵那种「信息量」（那是第 40 章的事）；曲线尖不尖依赖 n，跨 n 比较形状无意义；SE 给典型尺度不是硬上限。

### 50 · 假设检验与两类错误

- 文件：`50-hypothesis-testing-errors.md`
- 核心概念：无罪推定式思维——先立 H0 再看数据是否罕见到拒绝；第一类错误（冤枉 α）与第二类（放过 β）此消彼长。
- 边界：讲 H0/H1、拒绝域、α/β 与 σ 已知的单侧 z 检验完整五步流程；不讲 t 分布精确版（注明简化设定）、多重比较校正。
- 组件：`power-grid`。
- 判题：μ0=100、σ=15、n=36、x̄=106、α=0.05 单侧。输出 z 统计量与判定。初始代码打印 accept。`@check: 2.4` / `@check: reject`。
- 必写误区：不显著≠证明 H0 成立；α 是长期频率不是本次结论的错误概率；H0 必须放「想推翻的默认假设」，方向反了全盘皆输。

### 60 · p 值、效应量与统计功效

- 文件：`60-pvalue-effect-power.md`
- 核心概念：p 值=在 H0 世界里看到当前或更极端数据的概率；功效=真有差异时抓到它的概率=1−β；三者都被效应量和 n 牵着走。
- 边界：讲 p 值正确解读、均值差/Cohen d 直觉版、功效随 n 的曲线与样本量意识；不讲贝叶斯因子与精确功效公式推导。首用 `statistics.NormalDist().cdf` 必须中文注释（statistics 库已在 prob/stats 出生，无需新登记 import）。
- 组件：`power-grid` + `plot`（功效-n 曲线）。
- 判题：μ0=100、μ1=104、σ=15、n=100、α=0.05 单侧，用 NormalDist 算功效。初始代码忘记先算临界阈值。`@check: 0.85`。
- 必写误区：p=0.049 与 0.051 无本质差别；p 大≠效应小（可能只是 n 太小）；低功效实验的阳性结果反而更可疑（赢家诅咒，选读一段）。

### 70 · 置信区间：重复抽样的解释

- 文件：`70-confidence-intervals.md`
- 核心概念：95% CI 属于「程序」不属于「这一次」：同样做法反复用，约 95% 的区间罩住真值。
- 边界：讲 x̄±1.96·SE 的构造、覆盖率实验与正确口头解释清单；不讲 t 区间系数与精确覆盖问题。
- 组件：`ci-resample`。
- 判题：x̄=52.3、σ=8、n=64，输出区间两端。初始代码用了 1.645 且忘开方。`@check: 50.34` / `@check: 54.26`。
- 必写误区：「真值有 95% 概率在这个区间里」是错的（真值固定，随机的是区间）；95% 不是「数据 95% 落在区间内」；区间窄可能只因 n 大，不代表模型对。

### 80 · Bootstrap 与重采样推断

- 文件：`80-bootstrap.md`
- 核心概念：把手头样本当小总体，有放回重采样制造统计量的波动——没有公式的统计量（如中位数）也能做推断。
- 边界：讲 percentile bootstrap、为什么必须有放回、适用场景清单；不讲一致性理论与 BCa 校正。
- 组件：`bootstrap-machine`。
- 判题：样本 `[3,7,2,9,4]`，按给定索引 `[0,0,1,3,4]` 做一次有放回重采样，输出原均值与重采样均值。初始代码无放回去重导致均值错误。`@check: 5.0` / `@check: 5.2`。
- 必写误区：bootstrap 不能凭空造信息（样本有偏则推断有偏）；重采样次数多≠原始样本信息变多；无放回重采样永远还原原样本，有放回才是特性。

### 90 · A/B 实验设计与序贯监测

- 文件：`90-ab-test-design.md`
- 核心概念：实验三件套——随机分组消除混杂、事先定样本量（功效分析）、别偷看数据（peeking 让假阳性膨胀）。
- 边界：讲随机化、双比例样本量公式（z 版）、固定检查点补救；不讲 CUPED 与 bandit（预告卷五 RL）；最小二乘回归视角只在选读回扣 `linalg-advanced/least-squares` 一句。
- 组件：`power-grid`（定 n）+ Python 模拟 peeking 膨胀（matplotlib）。
- 判题：α=0.05 双侧（z=1.96）、功效 80%（z=0.84）、δ=2、σ=10，算每组样本量并向上取整。初始代码漏乘 2σ² 或忘平方。`@check: 392`。
- 必写误区：显著就停车的序贯偷看会让实际假阳性远超 α；A/B 显著≠业务有意义（必须配效应量）；分组不随机，后面所有检验都是空中楼阁。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | inference/sampling-distribution | prob/stats, prob/law | 3 | statistic, sampling-distribution, standard-error |
| 18 | inference/estimator-bias-mse | inference/sampling-distribution | 3 | estimator-bias, mean-squared-error |
| 19 | inference/mle | inference/estimator-bias-mse, exponents/log, calculus/rules | 4 | likelihood-function, maximum-likelihood |
| 20 | inference/fisher-information | inference/mle | 4 | fisher-information |
| 21 | inference/hypothesis-testing-errors | inference/sampling-distribution, algebra/inequality | 4 | null-hypothesis, type-i-error, type-ii-error |
| 22 | inference/pvalue-effect-power | inference/hypothesis-testing-errors | 4 | p-value, effect-size, statistical-power |
| 23 | inference/confidence-intervals | inference/hypothesis-testing-errors | 3 | confidence-interval, coverage-probability |
| 24 | inference/bootstrap | inference/confidence-intervals, prob/law | 3 | bootstrap-resampling |
| 25 | inference/ab-test-design | inference/pvalue-effect-power, inference/bootstrap | 4 | randomized-experiment, sample-size-planning, sequential-testing |

工具登记现状：`round`/`abs`/`sum`（卷一早已有）、`math.sqrt`/`math.log`（03 章）、`math.ceil`（functions/machine）、import `statistics`（prob/stats）/`random`（prob/law）/`matplotlib.pyplot`（python-tools/matplotlib）均已出生，本章无需新增 introduces_import；`statistics.NormalDist` 不是 math.* 前缀，不进 introduces_math，靠正文首现中文注释交代。判题一律用固定数据保证确定性输出；随机模拟只出现在非判题 python 块。

## 6. 整章验收清单

1. 五个新 renderer 注册进 `RENDERERS` 且 validate 可识别；每课至少一个定制可视化，高难课不得静态图凑数。
2. 每课一个判题 exercise：初始代码能跑但结果不对，独立解法实际输出与 `@check` 逐行一致（含小数位数）。
3. 每课有 quiz、2–3 条误区卡、选读或边界说明；九段式骨架完整。
4. MDX 双坑自检：行内花括号一律 `\lbrace`/`\rbrace`，显示公式单行；改完做 h2 计数体检（源 `^## ` 行数 vs 产物 `<h2` 数）。
5. prereqs 全部 grep 核实存在且更前；严禁引用 220/230（写作当时=现第 36/37 章，尚未落盘；现已建成，按 validate 规则可正常引用）的课程 id。
6. `npm run validate` → `npm run build` 全绿；浏览器手测 python/quiz/exercise 三类块、Alt+P 浮窗与路由切换无重复注入；360px + dark 无溢出。
7. 报告合并进 `CONTENT_AUDIT.md`；回填候选登记 `AUDIT_REPORTS/OPEN_ITEMS.md`：`power-grid`/`ci-resample` → 未来 54-trustworthy-ai 校准课，`mle-curve` → 45-ml-math 逻辑回归课。
