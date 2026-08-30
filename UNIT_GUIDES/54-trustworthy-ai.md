# 第 54 章 · 可信 AI 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 8 门正式课已建成（10/20/30/40/50/60/70/80）；规划名与落盘名有出入，以磁盘为准
> 目标：8 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L11 / track information-learning / stage research-elective / difficulty 3–5（index.md 已锁定）

## 1. 章定位

准确率只是模型的一个切面。本章把「这个模型能不能信」拆成八个可检验的问题，沿一条主线推进：

```text
校准诚实 → 分布错位 → 对抗攻击 → Conformal 区间 → 差分隐私 → 公平冲突 → 归因反事实 → 审计地图
```

前三课问「它何时失效」（置信度撒谎、世界变了、被故意欺骗），中间两课给两种数学承诺（覆盖保证、隐私预算），后三课问「对谁公平、凭什么、怎么审计」。每课都要落回同一句话：**可信不是感觉，是可以算出来、可以证伪的性质**。

**前置现实约束（写作红线）**：

- **口径更正**：卷四 36/38/39/40/41/42 与卷五 43/45 现已全部建成（原「220/240/250/260/270/280 与 300/320 全部是 index 占位骨架」为写作当时快照）。第 38 章检验、第 41 章泛化、第 45 章评估指标均已存在，可按实际 lesson_id 回填 prereqs。本章仍保留「统计直觉自带最小版」的自足设计，严格版出处改为注明第 36/41 章。
- 可引用的真实课只有：全卷一/二/三正式课、`rl/*`（第 50 章）、`graphs-networks/*`（第 53 章）、`topology-data-geometry/*`（第 58 章）、`engineering-cybernetics/*`（第 60 章）。最常用的是 `rl/reward-hacking`、`rl/rlhf-overview`（审计课回扣对齐失败案例）与 `linalg/dot-product`（对抗课线性打分）。
- 与第 45 章的分工：校准课不训练逻辑回归，直接给定「分数→标签」教学数据集；评估指标体系（ROC/AUC）留给第 45 章，本章只出生「可靠性图与 ECE」。

## 2. 前置覆盖

以下 prereqs 已逐一 grep 核实存在且排前：

- `prob/stats`、`prob/data-charts`、`prob/counting`（09 章）：均值、条形直方读法与基本计数。
- `prob/law`（09 章）：大数定律直觉——覆盖率长期趋近目标值的合法性来源。
- `functions/linear`（06 章）：线性打分函数 $s=w \cdot x + b$ 的载体。
- `linalg/dot-product`（11 章）：对抗课攻击方向的几何。
- `rl/reward-hacking`、`rl/rlhf-overview`（第 50 章，真实课）：审计课的对齐失败案例库。

Python 方面：只用已登记的 `math` / `random` / `statistics` / matplotlib，**禁 numpy/scipy**（保持与全卷一致，浮窗秒回）；所有判题输出用解析确定值或固定 seed，禁止随机数进 `@check`。

## 3. 组件清单（新增 5 个定制渲染器）

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `calibration-ruler` | 温度滑块缩放置信度，可靠图缺口与 ECE 联动 | 10（主）、80 回扣 |
| `drift-mirror` | 训练/部署双直方图镜像对比，整体平移 vs 单点离群 | 20（主） |
| `adv-push` | ε 圈套住样本点，一键沿攻击方向推出决策边界 | 30（主） |
| `conformal-net` | 分位数游标定区间宽度，测试点逐个命中/脱靶计数 | 40（主） |
| `privacy-blur` | 拉普拉斯噪声注入发布统计，ε 旋钮调模糊度 | 50（主） |

### 可实现规格

**calibration-ruler**
- spec 字段：`{ "type": "calibration-ruler", "title": "...", "bins": 5, "temperature": 1 }`；内置固定教学集 40 条（分数+0/1 标签字面量数组）；`bins` 滑块 3–10、`temperature` 滑块 0.5–3。
- 画布：横轴预测置信桶，每桶画成对柱——浅色=平均预测置信、深色=实际正确频率；对角虚线为完美校准；桶间缺口着色（红=过度自信、蓝=信心不足）；顶部 ECE 数值行随滑块实时重算。
- 交互：temperature 即时重缩放分数重分桶；bins 切换看粒度权衡；悬停桶显示样本数。动画：无（即时重绘）。

**drift-mirror**
- spec 字段：`{ "type": "drift-mirror", "title": "...", "shift": 0, "outlier": false }`；内置训练/部署两组各 200 条固定样本；`shift` 滑块 −3..3 平移部署分布；`outlier` 开关叠加一颗远离红点。
- 画布：上下镜像的两幅直方图重叠显示（训练蓝、部署橙），均值竖线各一根；右侧读数行：正类比例差、均值位移、报警灯（阈值线可拖）。核心叙事对比：**单点离群 ≠ 整体搬家**，两种问题要不同的探测器。
- 动画：shift 拖动的过渡插值（尊重 reduced-motion）。

**adv-push**
- spec 字段：`{ "type": "adv-push", "title": "...", "epsilon": 0.5, "trained-adv": false }`；二维两簇固定数据 + 线性分类器决策直线；`epsilon` 半径滑块 0–3；`trained-adv` 开关切换普通/对抗训练后的边界。
- 画布：散点 + 决策直线 + 以选中点为圆心的 ε 虚线圆；「发起攻击」按钮把点沿 $-\operatorname{sign}(w)$ 方向推到圆内最远处，越过分界线即变色闪烁；右侧显示打分 $s=w\cdot x$ 前后对比。
- 交互：换选中点（点击）、ε 滑块、开关重放。动画：推动补间 + 越界闪红一次。

**conformal-net**
- spec 字段：`{ "type": "conformal-net", "title": "...", "alpha": 0.1, "trial": 1 }`；内置 12 条固定校准分数（字面量）；`alpha` 滑块 0.05–0.3；`trial` 递增换一批测试点（洗牌 seed=trial，确定性）。
- 画布左：校准分数升序点列 + 分位数游标 $\hat{q}$ 竖线（位置按 $\lceil (n+1)(1-\alpha)\rceil$ 公式实时标注）；右：测试点逐个落下，各自预测区间画成竖线网，命中绿、脱靶红；角落覆盖率计数器与目标线 $1-\alpha$ 并排赛跑。
- 交互：α 滑块、「再抽一批」按钮、重置。动画：落点逐个出现（可跳过）。

**privacy-blur**
- spec 字段：`{ "type": "privacy-blur", "title": "...", "epsilon": 2, "query": "count" }`；内置 12 桶固定直方图字面量；`epsilon` 对数滑块 0.25–8。
- 画布上：真值直方图；下：注入拉普拉斯噪声后的发布直方图（seed 固定，「再发布一次」按钮 seed+1 重掷）；「相邻数据集 +1 人」开关高亮受影响桶并展示两次发布差值被噪声掩盖的效果。读数行：噪声尺度 $b=\Delta f/\varepsilon$ 与当前累计预算。
- 动画：噪声柱生长过渡（默认关）。

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `statdots`（现有） | 随机点抽样落地 | 10 抽样直觉 / 40 校准集抽样 |
| `coinlaw`（现有） | 频率趋近概率的大数定律 | 40 覆盖率长期合法性的地基 |
| `datachart`（现有） | 分组条形图 | 60 分组指标对比主场 |
| `least-squares-fit`（现有） | 线性模型拟合 | 70 归因的模型载体 |
| `plot`（现有） | 函数图像 | 10 温度缩放曲线 / 30 打分函数 |

验收：五个新 renderer 注册进 `RENDERERS`，dataset 签名守卫防重复注入，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 八门课题切分

### 10 · 校准：置信度诚实吗

- 文件：`10-calibration.md`
- 核心概念：模型说 90% 就该有约 90% 兑现——校准衡量「说的把握」与「实际频率」的差距；ECE 把可靠性图的缺口加权求和成一个数。
- 边界：讲可靠性图、ECE 计算与温度缩放的单参数修正直觉；不讲 Platt scaling 与贝叶斯校准理论；不训练任何模型（直接给分数数据）。
- 组件：`calibration-ruler`（主）+ `statdots`。
- 判题 exercise：分数 [0.9,0.8,0.7,0.6,0.3]、标签 [1,1,1,0,0]，按 ≥0.5 / <0.5 两桶手算 ECE（桶一缺口 0，桶二缺口 0.3，按样本数加权），打印：
  - `ECE = 0.06`
  初始代码忘了按桶内样本数加权（直接平均缺口得 0.15），能跑但不过。
- 必写误区：①输出 0.9 不是事实陈述而是模型的自我报告，没校准前经常兑现不了；②准确率高不代表校准好，两者是独立维度；③ECE 对分桶数敏感，比较不同模型的 ECE 必须同桶数。

### 20 · 分布之外：OOD 与漂移

- 文件：`20-ood-drift.md`
- 核心概念：「世界和训练数据还一样吗」有两种形态——个体离群（OOD 单点）与整体偏移（分布搬家），分别需要逐点打分和总体比较来探测。
- 边界：讲比例/均值位移这类一眼可见的漂移度量与报警阈值思想；不讲协变量偏移/概念偏移的形式定义与重要性加权修正（注明见第 41 章，规划中）；不做任何生成式 OOD 判别。
- 组件：`drift-mirror`（主）+ Python 手算比例差。
- 判题 exercise：训练集正类比例 200/1000=0.2，部署后 500/1000=0.5，阈值 0.1，打印：
  - `比例差 = 0.3`
  - `触发报警：True`
  初始代码把比较方向写反（`<` 阈值才报警），能跑但第二行 False。
- 必写误区：①离群的点不一定错、不离群的数据也可能整体变质，两件事不能互相替代检测；②阈值定多低都会误报和漏报，这是接受率与检出率的取舍（预告假设检验语言，见第 38 章，规划中）；③监控指标漂移≠性能一定下降，但它是免费的烟雾报警器。

### 30 · 对抗样本：一步攻击的数学

- 文件：`30-adversarial-examples.md`
- 核心概念：在线性模型上沿「压低得分」的方向挪一小步就能翻转标签；ε 球刻画扰动预算，对抗训练把「最坏情况」写进损失变成 min-max。
- 边界：讲线性打分的 FGSM 一步攻击与 ε 球几何；不讲深度网络的梯度混淆与迁移攻击（一句带过现象）；不讲 GAN/生成模型（归第 49 章）。
- 组件：`adv-push`（主）+ `plot` 画打分函数。
- 判题 exercise：$w=[1,1]$、$x=[3,1]$、原始得分 $s=4$，攻击 $x_{adv}=x-\varepsilon\cdot\operatorname{sign}(w)$，打印：
  - `eps=0.5 攻击后得分 = 3.0`
  - `标签翻转：False`
  - `eps=2.5 攻击后得分 = -1.0`
  - `标签翻转：True`
  初始代码把方向写成加号（$+\varepsilon\cdot\operatorname{sign}(w)$），能跑但四行得 5.0/False/9.0/False。
- 必写误区：①对抗样本不是随机噪声，是对着模型盲点精确定制的；②人类看不出差别≠模型距离不变，ε 球是模型视角的距离；③对抗训练提升鲁棒常以干净样本精度为代价——安全也有代价函数。

### 40 · Conformal prediction：带保证的预测区间

- 文件：`40-conformal-prediction.md`
- 核心概念：拿一批校准数据的误差分数取分位数当区间半径，只要数据可交换，未来新点的覆盖率就有 $\geq 1-\alpha$ 的硬保证——不需要知道任何分布形状。
- 边界：讲 split-conformal 流程（校准集、$\hat q$ 分位数公式、覆盖率验证）与可交换性前提的一句话警告（20 课的漂移正是它的天敌）；不讲完整 conformal 的泛化变体与条件覆盖不可能性定理。
- 组件：`conformal-net`（主）+ `coinlaw`（长期覆盖率趋近目标的地基）。
- 判题 exercise：校准分数排序后 [0.1,0.2,0.4,0.8,0.9]、$\alpha=0.1$、n=5，$k=\lceil(n+1)(1-\alpha)\rceil=5$，打印：
  - `qhat = 0.9`
  - `覆盖率保证至少 = 0.9`
  初始代码用平均分当半径（0.48），能跑但两行全错。
- 必写误区：①保证是对「长期频率」的边际覆盖，不是每个点都被盖住；②校准集和新数据必须可交换，分布一漂保证作废（回扣 20 课）；③区间宽是诚实的代价——模型越不确定网撒得越宽，这不是 bug 是功能。

### 50 · 差分隐私：可计算的保密

- 文件：`50-differential-privacy.md`
- 核心概念：发布统计前注入与单人影响成正比的噪声（拉普拉斯机制 $b=\Delta f/\varepsilon$），让「数据集里有你」这件事无法从结果反推；预算 ε 可加总、花完即止。
- 边界：讲计数查询的敏感度、拉普拉斯机制与预算组合的加法直觉；不讲指数机制、RDP 会计与联邦学习实现（BACKLOG 登记）；信息论语言注明见第 40 章（规划中）。
- 组件：`privacy-blur`（主）+ `datachart` 回扣。
- 判题 exercise：真值计数 42、全局敏感度 $\Delta f=1$、$\varepsilon=2$，另有两笔各 $\varepsilon=1$ 的查询，打印：
  - `拉普拉斯尺度 b = 0.5`
  - `两次查询总预算 = 2.0`
  - `同数据两次发布结果必然相同：False`
  初始代码把尺度写成 $\varepsilon$ 本身、预算取 max 而非求和，能跑但三行全错。
- 必写误区：①噪声保护的是「一个人在不在」，不是给数据加密；②预算是消耗品，同一数据反复提问会把隐私磨穿（差分攻击一句带过）；③ε 越小越私密也越没用，没有免费的双赢旋钮。

### 60 · 公平性：指标的内在冲突

- 文件：`60-fairness-conflict.md`
- 核心概念：校准（同等分数同等兑现）与错误率均衡（各组召回/误报一致）在基率不同的群体间一般不能同时成立；先算清每组混淆矩阵，冲突才有数字。
- 边界：讲分组混淆矩阵、召回率/选择率差异与「基率不同导致不可兼得」的数值演示；不讲公平性定义全集（十几种）与法律语境；形式化不可能性定理注明见第 41 章（规划中）。
- 组件：`datachart`（分组指标柱状主场）+ Python 混淆矩阵。
- 判题 exercise：A 组 TP=8/FN=2/FP=8/TN=82，B 组 TP=4/FN=16/FP=2/TN=78，打印：
  - `A 组召回率 = 0.8`
  - `B 组召回率 = 0.2`
  - `两组召回率相等：False`
  初始代码 B 组误用准确率（0.82）冒充召回率，能跑但后两行错。
- 必写误区：①「不看群体属性」的盲化模型照样可能歧视，因为代理特征会漏进来；②公平不是单一指标，选哪个指标就是在选价值观；③基率差异本身就会制造表面不公平，先把基率摆上台面再谈算法。

### 70 · 归因与反事实：模型的理由

- 文件：`70-attribution-counterfactual.md`
- 核心概念：把预测拆成「基线 + 各特征贡献」（线性模型贡献 = 权重×偏离均值），拆分必须精确还原预测；反事实解释回答「最少改多少能翻盘」。
- 边界：讲线性模型的贡献分解与反事实的最小改动搜索直觉（SHAP/LIME 只点名不展开）；不讲因果推断的 do 算子（归第 42 章）与 Shapley值的组合爆炸证明。
- 组件：`least-squares-fit` + Python 贡献分解。
- 判题 exercise：$f(x)=w\cdot x+b$，$w=[2,3]$、$b=1$、基线 $\bar{x}=[2,2]$、样本 $x=[4,1]$，打印：
  - `特征 a 的贡献 = 4.0`
  - `特征 b 的贡献 = -3.0`
  - `基线 + 全部贡献 = 12.0`（等于预测值）
  初始代码把权重×原始值当贡献（得 8 和 3），能跑但三行全错。
- 必写误区：①归因是解释不是原因——相关结构一变，同一模型的「理由」就变；②贡献可为负，负贡献也是解释的一部分，别只挑正的说故事；③反事实的「最小改动」依赖你允许改哪些特征，自由度不同答案完全不同。

### 80 · 审计地图：失败模式清单

- 文件：`80-audit-method-map.md`
- 核心概念：可信八问合成一张审计清单——拿到任何模型先走一遍「校准了吗？世界变了吗？怕攻击吗？区间呢？泄密吗？对谁公平？理由呢？」，每问对应本章一个工具与一个失败模式。
- 边界：讲工具选择逻辑与新场景演练；不引入任何新数学；对齐失败案例回扣 `rl/reward-hacking` 与 `rl/rlhf-overview`（真实课，正文互链）。
- 组件：全章组件速览（每个 renderer 静态露脸一次）+ `calibration-ruler` 收尾演示。
- 判题 exercise：实现 `recommend(question)` 返回对应工具名，四个分支：
  - `"calibration"`（问：置信度是否诚实）
  - `"drift"`（问：上线后整体表现为何下滑，先查什么）
  - `"conformal"`（问：给单次预测配一个有保证的区间）
  - `"dp"`（问：发布统计但不泄露个人）
  初始代码全部返回 `"todo"`，能跑但四行全不过。
- 必写误区：①审计不是上线前的仪式，是持续监控的循环；②工具之间会打架（隐私噪声伤公平统计、对抗训练伤校准），要记录取舍而不是假装全都要；③清单管住已知失败模式，未知风险仍需保留人的否决位。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | trustworthy-ai/calibration | prob/stats, prob/data-charts | 3 | calibration, expected-calibration-error |
| 18 | trustworthy-ai/ood-drift | trustworthy-ai/calibration | 4 | ood-detection, distribution-shift |
| 19 | trustworthy-ai/adversarial-examples | trustworthy-ai/ood-drift, linalg/dot-product | 4 | adversarial-example, epsilon-ball |
| 20 | trustworthy-ai/conformal-prediction | trustworthy-ai/ood-drift | 4 | conformal-prediction, coverage-guarantee, exchangeability |
| 21 | trustworthy-ai/differential-privacy | trustworthy-ai/calibration, prob/data-charts | 5 | differential-privacy, epsilon-budget, laplace-mechanism |
| 22 | trustworthy-ai/fairness-conflict | trustworthy-ai/calibration | 4 | fairness-metric-conflict, base-rate |
| 23 | trustworthy-ai/attribution-counterfactual | trustworthy-ai/fairness-conflict, functions/linear | 5 | feature-attribution, counterfactual-explanation |
| 24 | trustworthy-ai/audit-method-map | trustworthy-ai/attribution-counterfactual, rl/reward-hacking | 3 | （空） |

补充约定：

- 所有 prereqs 已核实存在且排前（章内链递增、跨章低章号），**严禁**指向排在本章之后的章（原注的 220/240/260/270/280/300/320 即现第 36/38/40/41/42/43/45 章，均排在本章之前且已建成，可正常引用）。
- track 全章 `information-learning`；layer 一律 `L11`；exits 一律含 `data-ai`；applications 建议按课填 model-audit / risk-monitoring / privacy-engineering 等。
- import 登记：不新增 `introduces_import`（math/random/statistics/matplotlib 均已登记）；`random` 只用于组件外演示且必须固定 seed，判题输出零随机。

## 6. 整章验收清单

1. 五个新 renderer（calibration-ruler / drift-mirror / adv-push / conformal-net / privacy-blur）注册进 `RENDERERS`，validate 可识别，签名守卫防重复注入，亮暗主题可读。
2. 每课至少两个可视化，判题 exercise 初始代码能运行但不通过，独立正确解法与 `@check` 逐行一致（本文件给出的目标输出均为解析计算，生产时须再用浮窗实测核验一遍）。
3. 占位章自查：第 38/41 等章现已建成，引用不必再带「（规划中）」字样；prereqs 按实际 lesson_id 核实存在且排前即可。
4. 每处统计理论（假设检验、信息论、do 算子、VC/PAC）只到直觉层并显式移交卷四；每课 quiz、误区卡齐备；20→40（漂移破坏可交换性）与 30→60（鲁棒-公平张力）形成交叉引用小闭环。
5. MDX 双坑体检：花括号用 `\lbrace`/`\rbrace`，显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测五组件交互、三类块与 Alt+P 浮窗、路由切换无重复注入；360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`；未立项项（Platt scaling、指数机制、Shapley 精确计算、条件覆盖）登记 `AUDIT_REPORTS/OPEN_ITEMS.md`；ROADMAP/BACKFILL_LOG 台账由主线程更新。
