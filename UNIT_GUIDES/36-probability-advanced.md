# 第 36 章 · 概率进阶 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 14 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：14 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L5 / track probability-statistics / stage university-core / 章级 difficulty 3

## 1. 章定位

卷一用骰子和频率建立了「概率是什么」的直觉；本章把它升级成可计算的机器：先公理化，再装上条件概率这台变速箱，然后把随机现象压成变量与分布，最后让大数定律和中心极限定理解释"大量偶然为何长出稳定形状"。主线推进：

```text
公理化 → 条件概率/独立 → 贝叶斯 → 随机变量与 CDF → 离散分布家族 → 连续分布家族 → 期望方差运算律 → 联合/协方差/相关 → LLN 与 CLT
```

全章核心问题只有一个：**不确定性如何被精确计算**。每课都要有"改参数→看分布变形"的动手入口；不能写成分布查询手册。

## 2. 前置覆盖

- 第 09 章 `prob/law` 已建立概率频率定义与大数定律实验直觉；`prob/stats` 已建立平均数、方差、标准差（`statistics` 库已在该处诞生）；`prob/counting` 已有排列组合。
- 第 02 章 `fractions/ratio-proportion` 已提供比率/占比语言。
- 第 18 章 `math-language/sets-relations-functions` 已有集合、关系、函数记号（事件代数的语言地基）。
- 第 19 章 `real-analysis/cauchy-sequences` 已有严格极限语言（90 课 LLN/CLT 的严格化出口）。

**注意**：本章是条件概率、贝叶斯、随机变量等概念的合法出生地。原注「第 27 章只有 index 壳、这些词全站尚未登记」为写作当时口径——第 27 章现已建成 6 门，可正常引用；期望/方差是否重复登记，写课时先查 `prob/stats` 的 introduces_concepts 再定——本章新增登记的是**运算规则**（线性性、方差平移倍增律）而非均值方差本身。

本章不重复卷一的抛硬币频率稳定实验（直接引用 `prob/law` 结论），不重复教集合符号。

## 3. 组件清单

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `datachart`（现有） | 分类频数条形图（事件频率视角） | 10 |
| `venn-probe`（新增） | 点击维恩图区域着色，容斥数值实时联动 | 10 |
| `cond-tree`（新增） | 条件概率树拖支重算，路径乘积自动汇总 | 20/30 |
| `statdots`（现有） | 人群点阵展示基础比率 | 30/80 |
| `dice`（现有） | 掷骰模拟喂 PMF | 40/50 |
| `dist-lab`（新增） | 七大分布参数实验室，pmf/pdf/CDF 三视图切换 | 40/50/60/70 |
| `counting`（现有） | 组合数点阵（二项系数来源） | 50 |
| `plot`（现有） | 密度曲线滑块实验 | 60/90 |
| `corr-terrain`（新增） | ρ 滑块驱动散点云变形 + 协方差读数 | 80 |
| `coinlaw`（现有） | 频率稳定过程回放（LLN 半场） | 90 |
| `clt-grow`（新增） | 抽样均值直方图生长叠加正态轮廓 | 90 |

### 新增组件规格

1. **venn-probe** —— spec 字段：`{"type":"venn-probe","pa":0.6,"pb":0.5,"pab":0.25}`。画布：两圆维恩图（面积按概率近似比例），右侧公式面板实时显示 P(A)、P(B)、P(A∩B)、P(A∪B)、补集值。交互：点击八个区域切换着色选中；三个概率滑块驱动图形缩放。动画：无。
2. **cond-tree** —— spec 字段：`{"type":"cond-tree","branches":[{"label":"患病","p":0.01},{"label":"健康","p":0.99}],"sub":[{"label":"阳性","p":0.95},{"label":"阴性","p":0.05}]}`（两层树通用结构）。画布：两级概率树，边标概率与换算人数（基数模式可切）。交互：拖每支概率滑块，兄弟支自动归一化提示，叶节点累计路径乘积。动画：无。
3. **dist-lab** —— spec 字段：`{"type":"dist-lab","family":"binomial","n":10,"p":0.5,"view":"pmf"}`，family ∈ bernoulli/binomial/geometric/poisson/uniform/exponential/normal，view ∈ pmf/pdf/cdf。画布：中央柱状或曲线图，期望与方差以虚线标注在横轴。交互：家族 tab、参数滑块随家族切换、视图三选一切换。动画：无补间，即时重绘。
4. **corr-terrain** —— spec 字段：`{"type":"corr-terrain","rho":0.8,"n":200,"showLine":true}`。画布：二元正态散点云 + 回归线 + Cov/r 读数框。交互：ρ 滑块从 −1 到 1 变形云团；n 控制点数；「重抽样」换种子。动画：ρ 拖动时云团平滑插值变形。
5. **clt-grow** —— spec 字段：`{"type":"clt-grow","source":"dice","groupSize":10,"speed":1}`，source ∈ uniform/dice/exponential。画布：上层原始总体形状，下层样本均值直方图逐批落柱并叠加正态轮廓线与 √n 标尺。交互：groupSize 滑块、播放/暂停/清空。动画：逐批抽样落柱生长。

验收：5 个新 renderer 注册进 `RENDERERS`，有源码签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 九门课题切分

### 10 · 样本空间与概率公理

- 文件：`10-sample-space-axioms.md`
- 核心概念一句话：概率是给事件分配 [0,1] 数值且满足非负、规范性、可加性的函数——三条公理推出全部常用规则。
- 边界：讲柯尔莫哥洛夫三公理与容斥、单调性推论；不讲 σ-代数的测度论细节（一句预告第 25 章）。
- 组件：`venn-probe`（新增）+ `datachart`（现有）。
- 判题 exercise：由 P(A)=0.6、P(B)=0.5、P(A∩B)=0.25 求 P(A∪B)。初始代码直接相加输出 1.1（违反规范性）；学生补一处减去交集。@check 单行：`0.85`。
- 必写误区：概率为 1 不等于必然发生（连续情形预告）；互斥事件的并才能直接相加；P(A∪B) 超过 1 说明重复计数。

### 20 · 条件概率与独立性

- 文件：`20-conditional-independence.md`
- 核心概念一句话：条件概率是把样本空间缩小到已知事件后重新归一化；独立意味着 P(A∩B)=P(A)P(B)。
- 边界：讲条件概率定义、乘法公式、独立性判定；不讲全概率公式（留给 30 课当引桥）。
- 组件：`cond-tree`（新增）+ `statdots`（现有）。
- 判题 exercise：100 人中 20 人患病（检测必阳）、健康人 8 人假阳性，求 P(患病|阳性)。初始代码用 20/100=0.2（忘了以阳性人群为分母）；学生把分母改成阳性总数 28。@check 单行：`0.71`（round 两位）。
- 必写误区：P(A|B) ≠ P(B|A)；独立 ≠ 互斥（互斥恰恰强依赖）；缩小论域后分母不再是全体样本。

### 30 · 贝叶斯公式

- 文件：`30-bayes-rule.md`
- 核心概念一句话：贝叶斯公式把「看到结果反推原因」变成 先验 × 似然 再归一化的乘法链。
- 边界：讲全概率公式 + 贝叶斯公式与先验/后验语言；不讲主观先验哲学（第 39 章主场）。
- 组件：`cond-tree`（现有复用，反向读）+ `statdots`（现有）。
- 判题 exercise：甲乙两机产量占 6:4，次品率 2% 与 5%，求次品来自甲的概率。初始代码算 0.02/(0.02+0.05)（漏乘先验权重）；学生给两项各乘上 0.6/0.4。@check 逐行：`P = 0.032`／`posterior = 0.375`。
- 必写误区：基础比率被忽略是系统错误（先验必须乘进去）；似然是 P(证据|原因) 不能倒装；后验是比较相对大小不是绝对概率的直接读数。

### 40 · 随机变量与分布函数

- 文件：`40-random-variables.md`
- 核心概念一句话：随机变量是给每个样本点贴数字标签的函数；分布函数 F(x)=P(X≤x) 记录累积。
- 边界：讲随机变量定义、PMF、CDF 及其单调有界右连续性；不讲测度论意义的可测性。
- 组件：`dice`（现有）+ `dist-lab`（新增，离散 tab + CDF 视图）。
- 判题 exercise：X 取 1/2/3 概率 0.2/0.3/0.5，求 F(2) 与 F(2.5)。初始代码用 PMF 等值查表（F(2.5) 得 0）；学生改成累积所有 ≤x 的项。@check 逐行：`F(2) = 0.5`／`F(2.5) = 0.5`。
- 必写误区：随机变量不是"随机的变量"而是确定性函数；CDF 在任何点都有定义（不只格点）；单点概率与区间概率在离散/连续里待遇不同。

### 50 · 离散分布家族

- 文件：`50-discrete-family.md`
- 核心概念一句话：伯努利/二项/几何/泊松都是"数成功次数"这一件事在不同计时方式下的四个名字。
- 边界：讲四分布的场景识别与参数含义；不讲矩母函数推导与泊松定理完整证明（只数值演示 n 大 p 小）。
- 组件：`dist-lab`（新增）+ `counting`（现有）+ `dice`（现有）。
- 判题 exercise：n=5、p=0.5 的二项分布求 P(X=2)；p=0.5 的几何分布求首次成功在第 3 次的概率。初始代码组合数写成 n^k 或幂对称位置错；学生改正 C(n,k) 与 (1−p) 的指数。@check 逐行：`0.3125`／`0.125`。
- 必写误区：二项数的是 n 次试验总成功数、几何数的是首次成功前等待；泊松没有"试验次数上限"；参数 λ 是强度不是概率。

### 60 · 连续分布：均匀、指数、正态

- 文件：`60-continuous-family.md`
- 核心概念一句话：连续变量单点概率为零，概率等于密度曲线下面积——密度可以大于 1。
- 边界：讲 pdf 积分语义与三分布典型场景；不讲正态无处不在的原因（90 课 CLT 主场）。
- 组件：`dist-lab`（现有复用，连续 tab）+ `plot`（现有）。
- 判题 exercise：U[0,4] 求 P(X≤1.5) 与 P(1<X≤3)；λ=1 指数分布求 P(X≤1)。初始代码把 x 处密度值 0.25 直接当概率（还忘积分）；学生改成宽×高并补 `1 - math.exp(-lam)`。@check 逐行：`0.375`／`0.5`／`0.632`。
- 必写误区：pdf 值不是概率（可超过 1）；P(X=c)=0 不意味着 c 不可能发生；指数无记忆性是分布性质不是所有连续分布共性。

### 70 · 期望、方差与矩

- 文件：`70-expectation-variance.md`
- 核心概念一句话：期望对线性变换干净利落 E[aX+b]=aE[X]+b，方差只认斜率平方 Var(aX+b)=a²Var[X]。
- 边界：讲期望线性性、方差运算律、原点矩/中心矩命名；不讲切比雪夫不等式证明（90 课引用其结论即可）。
- 组件：`dist-lab`（现有复用，读数对照）+ 浮窗 Python 模拟验证线性性。
- 判题 exercise：X~Bin(10, 0.3)，Y=2X+1，求 E[Y] 与 Var[Y]。初始代码把方差也套了线性式 Var(Y)=2Var(X)+1 得 5.2；学生改成 a² 并去掉常数项。@check 逐行：`EY = 7.0`／`VarY = 8.4`（f-string `.1f` 格式）。
- 必写误区：期望永远存在但可能无穷（重尾一句提及）；方差变换不吃 b、要吃 a²；E[X²] ≠ (E[X])²——这正是方差的来源。

### 80 · 联合分布、协方差与相关

- 文件：`80-joint-covariance.md`
- 核心概念一句话：协方差是"同时偏离各自均值"的平均乘积；相关只是标准化协方差，且只能量出线性关系。
- 边界：讲联合表、边缘化、Cov 定义与独立性蕴含零协方差；不讲条件分布族与多元正态密度。
- 组件：`corr-terrain`（新增）+ `statdots`（现有）。
- 判题 exercise：2×2 联合表 P(1,1)=0.2、P(1,0)=0.3、P(0,1)=0.1、P(0,0)=0.4，求 Cov 并判断独立性。初始代码假设独立用 E[X]E[Y] 冒充 E[XY] 得 Cov=0；学生改为按联合表求积和。@check 逐行：`Cov = 0.05`（round 三位）／`independent = False`。
- 必写误区：零协方差推不出独立（非线性相关反例必须给）；相关只度量线性强度；边缘分布相加要对全表求和不是取最大。

### 90 · 大数定律与中心极限定理

- 文件：`90-lln-clt.md`
- 核心概念一句话：独立同分布的平均值既收敛到期望（LLN），又以 √n 收缩尺度围绕期望正态摆动（CLT）。
- 边界：讲两条定理的陈述、√n 尺度与标准误公式；不讲依概率收敛 vs 几乎必然的严格区分（选读折叠给 Cauchy 语言链接）。
- 组件：`clt-grow`（新增）+ `coinlaw`（现有）+ `plot`（现有）。
- 判题 exercise：μ=50、σ=8、n=16 的样本均值 X̄=54，求标准化的 z。初始代码忘了开根号（σ_X̄ 算成 8/16）；学生补 `math.sqrt(n)`。@check 单行：`z = 2.0`。
- 必写误区：LLN 说平均趋稳不是说短期偏差会"找补"；CLT 是样本均值的分布近似正态，不是总体变正态；√n 是标准误的分母——除 n 是高频错误。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | probadv/sample-space | math-language/sets-relations-functions, prob/counting | 3 | probability-axioms, additivity-rule |
| 18 | probadv/conditional-independence | probadv/sample-space | 3 | conditional-probability, statistical-independence |
| 19 | probadv/bayes-rule | probadv/conditional-independence | 3 | bayes-rule, prior-posterior |
| 20 | probadv/random-variables | probadv/bayes-rule | 3 | random-variable, cumulative-distribution-function |
| 21 | probadv/discrete-family | probadv/random-variables, prob/counting | 3 | bernoulli-trials, poisson-distribution |
| 22 | probadv/continuous-family | probadv/discrete-family | 4 | probability-density, exponential-distribution |
| 23 | probadv/expectation-variance | probadv/continuous-family, prob/stats | 3 | linearity-of-expectation, variance-rules |
| 24 | probadv/joint-covariance | probadv/expectation-variance | 4 | joint-distribution, covariance-correlation |
| 25 | probadv/lln-clt | probadv/joint-covariance, real-analysis/cauchy-sequences, prob/law | 4 | central-limit-theorem, standard-error |

introduces_import 全章预计为空（random/statistics/math 均已在卷一出生）；60 课若首次使用 `math.exp` 需核实其诞生地（exponents/log 一带）再决定是否登记 introduces_math。所有 prereqs 已 grep 核实真实存在且编号在前。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；每个至少一门课消费；dist-lab 至少跨三课复用。
2. 每课至少两个可视化入口；分布家族课必须有"改参数看变形"的滑块体验。
3. 每课一个判题 exercise：初始代码能运行但结果错，独立解法与 @check 逐行一致（数值见 §4，浮点一律 round/f-string 固定位数防抖动）。
4. 每课有 quiz、误区卡、选读或边界说明；判题 exercise 内禁用随机数（模拟演示放 viz/python 非判题区）。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致（源 `^## ` vs 产物 `<h2`）；浏览器实测 exercise/quiz/viz；360px + dark 无溢出。
7. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
