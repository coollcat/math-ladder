# 第 19 章 · 实分析 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 9 门正式课已建成（10/20/25/30/32/35/40/50/60）
> 目标：9 门正式课（原「首批 6 门」为写作当时快照，25/32/35 三课系后续批次补入）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 2 / layer L8 / track analysis-change / stage university-core

## 1. 章定位

第 13–16 章已经让学生会算极限、级数、积分和 Fourier 逼近；本章把这些工具放回严格地基：

```text
完备性 → 数列 Cauchy 判据 → epsilon-delta 连续性 → 一致收敛 → 上下和积分 → Fourier 逐点收敛
```

每课都要暴露一个直观失效点：为什么必须有实数完备性？逐点收敛为什么不够？为什么上下和必须夹逼？

## 2. 前置覆盖

- 第 13 章 `calculus/limits` 已建立直观极限和左右探针。
- 第 14 章 `integrals/riemann` 已建立分割、取样、求和。
- 第 15 章 `series/convergence`、`series/power` 已建立部分和与逐点逼近。
- 第 16 章 `fourier/square-wave` 已观察吉布斯现象。

本章不重复入门计算；只把“想多近有多近”升级为量词和界。

## 3. 首批组件

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `completeness-ladder` | 二分区间、上下界与嵌套区间收缩 | 10 |
| `cauchy-tail` | 数列尾项、epsilon 带与尾幅 | 20 |
| `epsilon-delta-probe` | 拉动 epsilon，自动搜索 delta | 30 |
| `uniform-convergence-zoom` | 函数列、探针误差与上确界误差 | 40 |
| `riemann-upper-lower` | 上和、下和与分割加细 | 50 |
| `fourier-gibbs-strict` | 部分和、跳点与过冲测量 | 60 |

验收：每个 renderer 注册进 `RENDERERS`，有源码签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 六门课题切分

### 10 · 实数完备性与上确界

- 文件：`10-completeness-supremum.md`
- 核心概念：上确界是最小上界；完备性保证合理夹逼有归宿。
- 边界：讲上界、上确界、最大值区别和二分嵌套；不讲构造性实数模型。
- 组件：`completeness-ladder` + `cauchy-tail`。
- 判题：给数集找上界/上确界，或输出区间端点。
- 必写误区：上确界不必属于集合；有上界不等于有最大值；有限小数近似不是精确 sup。

### 20 · 数列极限与 Cauchy 判据

- 文件：`20-cauchy-sequences.md`
- 核心概念：收敛数列的尾项必能进入 epsilon 带；实数中 Cauchy 等价收敛。
- 边界：讲数列极限、Cauchy 尾幅和夹逼；不讲拓扑完备化。
- 组件：`cauchy-tail` + `completeness-ladder`。
- 判题：输出数列尾部最大差或判断 Cauchy。
- 必写误区：项趋于零不等于级数收敛；Cauchy 看两两项差，不只看相邻项。

### 30 · 函数极限与连续性

- 文件：`30-epsilon-delta-continuity.md`
- 核心概念：epsilon 控制输出，delta 控制输入；连续是把极限值接到函数值。
- 边界：讲逐点 epsilon-delta 和简单不一致例子；不讲度量空间一般拓扑。
- 组件：`epsilon-delta-probe` + `plot`。
- 判题：对线性函数求给定 epsilon 的 delta。
- 必写误区：delta 不唯一；epsilon 先说，delta 后找；极限存在不要求函数值存在。

### 40 · 一致收敛与交换次序

- 文件：`40-uniform-convergence.md`
- 核心概念：一致收敛看全定义域最慢误差，不看某个固定点。
- 边界：讲逐点/一致区别、连续性继承和幂级数内部交换直觉；不讲 Arzela-Ascoli。
- 组件：`uniform-convergence-zoom` + `plot`。
- 判题：计算函数列在某点误差或上确界误差。
- 必写误区：每个点都收敛不等于一致收敛；连续函数列的极限未必连续；交换次序需要条件。

### 50 · Riemann 积分的严格定义

- 文件：`50-riemann-upper-lower.md`
- 核心概念：上和、下和夹逼；上下和之差能任意小才可积。
- 边界：讲有界函数、规则分割和可积性直觉；不讲 Lebesgue 判据。
- 组件：`riemann-upper-lower` + 已有 `riemann`。
- 判题：计算规则分割的上和、下和或差。
- 必写误区：上和不总是取右端点；可积不等于原函数初等；间断多可能破坏可积性。

### 60 · Fourier 级数的分析视角

- 文件：`60-fourier-strict-convergence.md`
- 核心概念：部分和逐点收敛有条件；跳点收敛到左右平均值，吉布斯过冲不消失。
- 边界：讲 Dirichlet 条件、跳点值和吉布斯现象；不讲 $L^2$ 理论完整证明。
- 组件：`fourier-gibbs-strict` + 已有 `sines`。
- 判题：计算跳点部分和值或过冲比例。
- 必写误区：部分和在跳点不必等于函数值；逐点收敛不等于一致收敛；过冲高度不随项数消失。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | real-analysis/completeness-supremum | calculus/limits, math-language/sets-relations-functions | 4 | supremum, completeness |
| 18 | real-analysis/cauchy-sequences | real-analysis/completeness-supremum | 4 | cauchy-sequence |
| 19 | real-analysis/epsilon-delta-continuity | real-analysis/cauchy-sequences | 4 | epsilon-delta |
| 20 | real-analysis/uniform-convergence | real-analysis/epsilon-delta-continuity, series/power | 5 | uniform-convergence |
| 21 | real-analysis/riemann-upper-lower | real-analysis/uniform-convergence, integrals/riemann | 4 | upper-sum, lower-sum |
| 22 | real-analysis/fourier-strict-convergence | real-analysis/uniform-convergence, fourier/square-wave | 5 | pointwise-convergence, gibbs-phenomenon |

首批课不引入第三方库；Python 只用已有循环、函数、列表、`math` 和浮点运算。

## 6. 整章验收

1. 六个 renderer 注册且 validate 可识别。
2. 每课至少两个定制可视化；高难课不得用静态图凑数。
3. 每课一个判题 exercise，初始代码能运行但不通过，独立解法与 `@check` 逐行一致。
4. 每课有 quiz、误区卡、选读或边界说明。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致；浏览器测 exercise/quiz/viz；360px + dark 无溢出。
7. 结论合并进根目录 `CONTENT_AUDIT.md`。
