# 第 25 章 · 测度论与 Lebesgue 入门 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 7 门正式课已建成（10/20/30/40/50/55/60）；课题名与落盘名有出入，以磁盘为准
> 目标：7 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 2 / layer L8 / track analysis-change + probability-statistics / stage research-elective（index 已标 difficulty 5，单课可在 4–5 间浮动）

## 1. 章定位

Riemann 积分切开横轴；Lebesgue 先测量纵轴上的水平层。本章沿一条主线推进：

```text
Riemann 失效案例 → 外测度 → 可测集 → 可测函数 → 水平层积分 → 收敛定理 → 概率=测度
```

这是全站第一条 research-elective 主线：允许严格陈述与证明直觉，但**每课必须有一个可玩交互**（canvas 组件或浮窗 Python 实验），不许纯文字。读者离开时应该能回答三个问题：哪些函数可积了、哪些极限可以交换、"概率是测度"到底省掉了什么。

## 2. 前置覆盖

- `integrals/riemann` 与 `real-analysis/riemann-upper-lower` 已建立上下和、分割与 Riemann 可积判据——本章直接引用其失效，不重推定义。
- `real-analysis/completeness-supremum` 已建立上确界语言；外测度的 inf 定义直接复用。
- `real-analysis/uniform-convergence` 已讨论逐点收敛交换次序的危险——收敛定理课回扣但不重讲。
- `multivariable/double-integrals` 已建立 Fubini 直觉；本章只在误区卡提一句联系。
- `prob/law` 已建立频率稳定性与大数定律实验；概率测度课把它升级为公理视角，不重复掷硬币模拟代码。
- 工具登记现状：`math.floor`（06/functions）、`random`/`matplotlib.pyplot`（00 工具箱）、`statistics`（09/30）均已出生，直接用并注释即可；numpy 全章禁用。

## 3. 组件清单

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `riemann-upper-lower`（现有） | 调分割数看上下和夹逼与失效 | 10 |
| `outer-cover`（新增） | 拖滑块增减覆盖区间，实时累加总长 | 20 |
| `cantor-length`（新增） | 步进挖三分，段数与剩余总长联动 | 30 |
| `preimage-band`（新增） | 拖一条水平值带，高亮原像在横轴的位置 | 40 |
| `lebesgue-layers`（现有改造候选：plot 不够用时新增） | 滑层数 k，水平切条重建面积并与竖直柱对比 | 50 |
| `coinlaw`（现有） | 频率趋稳作为测度大数定律引子 | 70 |

新增组件规格（JSON type 用 kebab-case，函数名 camelCase，dataset 守卫照 AGENTS.md）：

### outer-cover

- spec 字段：`points`（目标散点数组，模拟可数集）、`epsilon`（总长预算滑块）、`maxIntervals`。
- 画布：上半画散点集，下半画一排区间及其长度条；每拖一格自动生成下一根更短的覆盖区间并扣减预算。
- 交互：滑块控制区间个数 k 与 epsilon；显示当前总长与"是否盖住全部点"判定。
- 动画：新区间出现时 200ms 缩放入场；无连续动画。

### cantor-length

- spec 字段：`steps`（0–7 步进滑块）、`ratio`（默认 3，挖中间几分之一）。
- 画布：一行嵌套区间条；右侧数字牌显示 2^n 段数与剩余总长 (2/3)^n。
- 交互：拖步进或点「下一步/重置」按钮。
- 动画：挖除段闪红后消失；可选关。

### preimage-band

- spec 字段：`expr`（受控表达式，如 `"x*x"`）、`bandLow`/`bandHigh`（水平带位置）。
- 画布：上方函数曲线，下方数轴；值带内的曲线段投影到数轴形成高亮原像区。
- 交互：拖动带的上沿与下沿；显示原像是否由若干区间拼成。
- 动画：无，纯联动。

### lebesgue-layers

- spec 字段：`expr`、`xmin`/`xmax`、`layers`（水平层数滑块）、`mode`（`horizontal` / `vertical` 对比开关）。
- 画布：同一函数两种切割方式同框，右下角显示两套近似积分值。
- 交互：层数滑块 + 模式切换按钮。
- 动画：层数变化时色带渐变填充。

## 4. 七门课题切分

### 10 · Riemann 的裂缝（从狄利克雷函数说起）

- 文件：`10-riemann-crisis.md`
- 核心概念：处处不连续函数让上下和永不相遇，说明"可积"依赖集合的长度行为。
- 边界：讲失效案例与"长度需要公理"的动机；不讲测度论公理系统本身（留给 20）。
- 组件：`riemann-upper-lower`（现有）+ Python 理论值实验。
- 判题 exercise：狄利克雷函数在 [0,1] 上 n=4 分割的上和/下和。初始代码把每段 sup 写成 `y_max = 0`（能跑、输出错），学生改成 1 即通过。期望输出三行：`上和 = 1.0`、`下和 = 0.0`、`Riemann 可积: False`（第三行由 `abs(upper-lower) < 1e-9` 自动得出）。
- 必写误区：①"不可积"不等于"积不出来"，而是上下和不夹逼；②任何小区间里既有有理数又有无理数是论证核心，不是废话；③Lebesgue 不是把 Riemann 推翻，而是扩容。

### 20 · 外测度：用覆盖定义长度

- 文件：`20-outer-measure.md`
- 核心概念：外测度是"盖住它所需区间总长的下确界"，可数集外测度可以为零。
- 边界：讲外测度定义、次可加性与零测集例子；不讲 Carathéodory 判据证明（30 只给直觉版）。
- 组件：`outer-cover`（新增）。
- 判题 exercise：eps=0.2，用长度 eps/2^(n+1)、n=0..3 的四根区间盖有理点列。初始代码把指数写成 `2 ** n` 且 `range(1, 5)`（整体错位，输出 0.09375），学生把范围改回从 0 起（或指数改回 n+1）即得 0.1875。期望输出：`覆盖总长 = 0.1875`、`总长 < 0.15: True`。
- 必写误区：①外测度对一切集合都有定义，但它不是好"长度"（不可加）；②"总长可以任意小"靠的是下确界，不是某一次具体覆盖；③零测集可以有无穷多个点。

### 30 · 可测集与康托尔集

- 文件：`30-measurable-sets.md`
- 核心概念：满足卡氏条件的集合才配得上"可加的长度"；康托尔集是"测度为零却不可数"的招牌。
- 边界：讲可测集封闭性与康托尔构造；不讲 σ-代数的抽象定义全文与不可测集构造（Vitali 只留一句选读钩子）。
- 组件：`cantor-length`（新增）。
- 判题 exercise：n=4 与 n=6 步后的段数与剩余总长。初始代码把段数写成 `2 ** (n - 1)`、长度写成 `(1/3) ** n`（两处概念错误），学生分别改为 `2 ** n` 与 `(2/3) ** n`。期望输出两行：`n=4: 段数 16, 总长 0.198`、`n=6: 段数 64, 总长 0.088`。
- 必写误区：①康托尔集测度为零但不是空集；②"可测"是对补与可数并封闭，不是对一切子集；③开区间长度相加是起点，不是全部。

### 40 · 可测函数与"几乎处处"

- 文件：`40-measurable-functions.md`
- 核心概念：可测 = 值域水平带的原像可测；"几乎处处"忽略零测集上的捣乱。
- 边界：讲原像条件、简单函数与几乎处处相等；不讲可测函数的构造性逼近定理证明。
- 组件：`preimage-band`（新增）。
- 判题 exercise：f(x)=x 在 [0,1] 上用 4 层简单函数（floor 到 1/4 格）逼近。初始代码把层宽写成 `0.2`，学生改为 `0.25`。期望输出：`分层值 [0.0, 0.25, 0.5, 0.75]`、`下积分 = 0.375`。
- 必写误区：①狄利克雷函数其实可测——它坏在 Riemann 不坏在 Lebesgue；②"几乎处处"不是"除了有限个点"；③简单函数是有限值，不是有限定义域。

### 50 · Lebesgue 积分：先量高度再乘底

- 文件：`50-lebesgue-integral.md`
- 核心概念：从下方用简单函数逼近，积分是"层值 × 层宽"之和的上确界。
- 边界：讲非负函数的定义与单调性、线性两条初性质；不讲一般可积函数的正负部拆分细节（一句话提及）。
- 组件：`lebesgue-layers`（新增）。
- 判题 exercise：f(x)=x² 在 [0,1]，k=10 层的下逼近。初始代码把层值写成 `(i + 1) / k`（上逼近，输出 0.385），学生改成 `i / k` 得 0.285。期望输出：`k=10 下积分 ≈ 0.285`、`真值 1/3 ≈ 0.333`。
- 必写误区：①水平层切割的"宽度"是集合的测度，不是区间端点差；②下逼近单调升向真值，这正是单调收敛定理的地基；③Lebesgue 判据一句话：有界函数 Riemann 可积 ⇔ 不连续点集零测（陈述不证明）。

### 60 · 三大收敛定理

- 文件：`60-convergence-theorems.md`
- 核心概念：单调收敛、Fatou、控制收敛分别在什么前提下允许 lim 与积分交换。
- 边界：讲三大定理陈述、反例族与应用姿势；不讲证明（MCT 证明可选读折叠，Fatou/DCT 只述）。
- 组件：Python 尖峰函数族实验（matplotlib 多帧）+ `seq`（现有，画积分值数列）。
- 判题 exercise：g_n = n·χ₍0,1/n₎ 的积分列表。初始代码把面积写成 `(1 / n) ** 2`，学生改为 `n * (1 / n)`。期望输出：`积分 [1.0, 1.0, 1.0, 1.0]`、`点态极限几乎处处为 0，极限与积分不可交换`（第二行固定文本）。
- 必写误区：①没有控制函数时逐点收敛照样不能换序；②DCT 的控制函数要对全体 n 一致；③Fatou 给的是不等式，不是等式。

### 70 · 概率就是测度

- 文件：`70-probability-as-measure.md`
- 核心概念：概率空间是总质量为 1 的测度空间；可加性统一了容斥与大数定律的语言。
- 边界：讲概率公理的测度读法、事件域=σ-代数直觉、密度=按权重分配质量的比喻；不讲 Radon-Nikodym 定理（55 缝隙选读候选）。
- 组件：`coinlaw`（现有）+ Python 骰子事件可加性验算。
- 判题 exercise：骰子事件 A=偶数、B=大于 3。初始代码忘减交：`p_union = p_a + p_b`，学生补 `- p_ab`。期望输出：`P(A 并 B) = 0.667`、`可加性检验通过: True`（第二行由 `abs(...) < 1e-9` 判定）。
- 必写误区：①P(A∪B)=P(A)+P(B) 只在互斥时成立；②样本点是零测的，单点概率为零不等于不可能（连续情形）；③"概率是测度"不是比喻，是同一套公理。

插课缝隙：`55-rademacher-or-rn.md`（Radon-Nikodym 直觉选讲）预留 x5 号，不动主链。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | measure-lebesgue/riemann-crisis | real-analysis/riemann-upper-lower | 4 | dirichlet-function |
| 18 | measure-lebesgue/outer-measure | measure-lebesgue/riemann-crisis, real-analysis/completeness-supremum | 5 | outer-measure, null-set |
| 19 | measure-lebesgue/measurable-sets | measure-lebesgue/outer-measure | 5 | measurable-set, cantor-set |
| 20 | measure-lebesgue/measurable-functions | measure-lebesgue/measurable-sets | 4 | measurable-function, almost-everywhere, simple-function |
| 21 | measure-lebesgue/lebesgue-integral | measure-lebesgue/measurable-functions | 5 | lebesgue-integral |
| 22 | measure-lebesgue/convergence-theorems | measure-lebesgue/lebesgue-integral, real-analysis/uniform-convergence | 5 | monotone-convergence, dominated-convergence, fatou-lemma |
| 23 | measure-lebesgue/probability-as-measure | measure-lebesgue/convergence-theorems, prob/law | 4 | probability-measure |

`introduces_math`/`introduces_builtin`/`introduces_import` 预计全空；若 60 号课要用 `statistics.mean` 之类，先确认已在 09/30 出生，否则当场办证。

## 6. 整章验收清单

1. 4 个新 renderer 注册进 `RENDERERS`，validate 可识别，各有 ≥2 课真实消费（`lebesgue-layers` 至少 1 课）；canvas 非空白、亮暗主题可读。
2. 每课一个判题 exercise：初始代码能跑但错，审查者独立写出另一解法且与 `@check` 逐行一致；本指导给出的期望数值须被实测复现。
3. 每课至少一个可玩交互（组件或 Python 实验），research-elective 不豁免。
4. 每课 2–3 条误区卡、≥1 个 quiz 或折叠详解；三大收敛定理的证明取舍与本指导边界一致。
5. `npm run validate && npm run build` 全绿；h2 计数体检（源 `^## ` vs 产物 `<h2`）逐页一致。
6. 行内公式无字面花括号（用 `\lbrace\rbrace`）；显示公式一律单行。
7. 浏览器抽测：viz 点击、exercise 通过流、Alt+P 浮窗、路由切换无重复注入；360px + dark 无溢出。
8. 报告合并进 `CONTENT_AUDIT.md`，非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`；ROADMAP 补本章进度小节。
