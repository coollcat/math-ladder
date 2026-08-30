# 第 39 章 · 贝叶斯统计 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L5 / track probability-statistics / stage university-core（章 difficulty 4，单课 3–4）

## 1. 章定位

贝叶斯方法把「当前信念」写成分布，让数据不断更新它。本章沿一条主线推进：

```text
条件概率与贝叶斯公式 → 先验/似然/后验三段式 → 共轭更新（Beta-Binomial）
→ 正态共轭与收缩 → 后验预测 → 边际似然与模型比较 → MCMC 游走 → 层次模型部分池化
```

写作纪律：每一课都让「分布如何变形」可见；先验不是原罪也不是魔法，是必须交代的假设。

## 2. 前置覆盖

- 第 09 章 `prob/law`（频率视角 + `random` 模拟）是对照面；第 38 章已建成，似然函数、标准误、抽样分布可直接挂 prereqs。
- **贝叶斯公式的出生地是第 36 章 `probability-advanced/bayes`**（原注「36 章尚未建成、全站无正式课引入贝叶斯」为写作当时口径，已过时）。保留当时的处理办法备查——
  - **本章第 10 课就是贝叶斯公式的全站出生地**：从缩小论域的条件概率出发，经乘法公式与全概率，现场推出贝叶斯公式并登记 `conditional-probability`、`bayes-theorem`；
  - 二项概率所需的组合计数回扣 `prob/counting`；
  - 正态记号在 40 课首次出现处现场交代。
- `inference/mle` 不作 prereqs（避免概念打架），但 30 课正文用一句话对照「MLE 是只看峰，贝叶斯是整条曲线都留下」。

## 3. 组件清单

| renderer | 状态 | 核心交互 | 服务课 |
| --- | --- | --- | --- |
| `bayes-bars` | 新增 | 离散假设条形图随「证据按钮」逐步更新 | 10/20/60 |
| `bayes-slab` | 新增 | Beta 先验曲线+数据滑块，后验曲线实时变形 | 30/50 |
| `mcmc-walk` | 新增 | 目标密度地形上随机游走，轨迹/直方图/步长联动 | 70 |
| `shrinkage-lab` | 新增 | 各组估计向全局中心收缩的滑杆实验 | 80 |
| `coinlaw` | 现有 | 频率派开场对照（频率稳定 vs 信念更新） | 10 开场 |

现有渲染器中无一贴合「分布更新」语义，故新增为主；正态共轭（40）、后验预测（50）与模型比较数值例（60 的第二段）用浮窗 matplotlib 三曲线叠加。新增组件规格：

### bayes-bars

- spec 字段：`hypotheses`（名称数组）、`prior`（初始权重数组）、`likelihoods`（每个假设下各证据的概率表）、`evidenceLabels`。
- 画布：横排竖条=各假设当前置信度；顶部证据按钮行；点击后旧条淡出、新条按贝叶斯因子比例生长动画。
- 交互：点证据按钮推进一步，「撤销」退回上一步，「重置」复原先验；悬停显示该步似然比。
- 动画：条形过渡 300ms；无循环。

### bayes-slab

- spec 字段：`alpha`、`beta`（先验伪计数滑块）、`successes`、`failures`（数据滑块）、`showLikelihood`。
- 画布：横轴 p∈[0,1] 三层——灰虚线先验、浅蓝似然（可关）、橙色后验实时重画；读数行给后验均值与等效样本数 α+β。
- 交互：四个滑块拖动即重算；「再掷 10 次正面」快捷键一键加数据看曲线被推着走。
- 动画：曲线形变插值即可，不做粒子。

### mcmc-walk

- spec 字段：`target`（预设名 beta-shape/gaussian/two-hump）、`stepSize`、`burnIn`、`speed`。
- 画布：背景目标密度地形（归一化曲线）；游走点轨迹逐段绘制，接受闪绿、拒绝闪红；下方累计样本直方图同步生长，可与目标曲线叠加比对。
- 交互：「走 1 步」「×100」「×2000」；stepSize/burnIn 滑块；「清空重来」。
- 动画：×1 单步动画，批量直接出图；running 重入守卫必须有。

### shrinkage-lab

- spec 字段：`groups`（各组 n 与观测均值的数组）、`priorMean`、`priorSd` 滑块。
- 画布：横轴均值纵轴各组；空心圆=组内原始估计，实心圆=收缩后估计，二者间画收缩箭头；全局先验中心画竖线。
- 交互：拖 priorSd 滑块看全体箭头伸缩；点击某组高亮其 n 并在侧栏给出该组加权计算式。
- 动画：箭头长度过渡 200ms。

## 4. 课题切分

### 10 · 条件概率与贝叶斯公式

- 文件：`10-bayes-rule.md`
- 核心概念：条件概率=缩小论域后的份额；贝叶斯公式把「原因→结果」翻转为「结果→原因」；基础比率决定一切。
- 边界：讲乘法公式、全概率公式与离散版贝叶斯公式；不讲连续条件分布（下一课起）、不站主观概率哲学立场。
- 组件：`bayes-bars` + `coinlaw`（开场对照）。
- 判题：患病率 1%、灵敏度 99%、假阳率 5%，算 P(病|阳性)。初始代码把灵敏度当答案输出 0.99。`@check: 0.167`。
- 必写误区：P(A|B)≠P(B|A)；丢掉基础比率会把罕见病检测变成大面积误报；条件概率是缩小论域不是因果强度（术语表口径）。

### 20 · 先验、似然与后验：信念的三段式

- 文件：`20-prior-likelihood-posterior.md`
- 核心概念：后验 ∝ 似然 × 先验；证据项只是归一化常数；今天的后验是明天的先验。
- 边界：讲离散假设上的完整更新流程，验证「两次顺序更新=一次合并更新」；不讲连续参数（下一课），不展开先验选取哲学（30 课边界内一句话）。
- 组件：`bayes-bars` 连点成链。
- 判题：两枚硬币（公平 p=0.5 / 弯币 p=0.9）各半怀疑，掷 3 次全正，算弯币后验。初始代码漏乘先验。`@check: 0.854`。
- 必写误区：证据项不能省（要归一化）；先验为 0 的假设永无翻身之日（0 乘任何似然都是 0）；后验是分布不是一个数。

### 30 · 连续参数与共轭：Beta-Binomial

- 文件：`30-beta-binomial.md`
- 核心概念：参数从格子长成曲线；Beta 先验遇二项似然，后验还是 Beta（α+=k，β+=n−k）——共轭让更新退化成加法。
- 边界：讲 Beta 形状参数直觉、共轭更新三步法、先验等效样本量 α+β 与数据的对话；不讲 Gamma/B 函数推导（选读一句递推）、不讲超先验。
- 组件：`bayes-slab`。
- 判题：均匀先验 Beta(1,1) 加上 7 正 3 反，输出后验均值并与 MLE 对照。初始代码返回 MLE 0.7。`@check: 0.667`。
- 必写误区：共轭是数学便利不代表世界真是 Beta；α β 是伪计数不是真实次数；先验强度 α+β 要和数据量 n 同尺度比较才有意义。

### 40 · 正态均值的共轭推断与精度加权

- 文件：`40-normal-conjugate.md`
- 核心概念：σ 已知时正态均值的更新=精度（1/方差）加权平均：后验均值介于先验与样本均值之间，谁精度高靠谁近。
- 边界：讲精度语言与数值例；未知方差的联合更新只点名 Normal-Inverse-Gamma 不展开；不讲多元正态。
- 组件：Python/matplotlib 三曲线（先验/似然/后验）叠加。
- 判题：先验 N(50, σ²=25)，数据 n=16、x̄=53、σ=5 已知。输出后验均值与后验标准差。初始代码做成了简单平均（权重各半）。`@check: 52.824` / `@check: 1.213`。
- 必写误区：精度加权不是五五开平均；「σ 已知」是教学简化（现实里 σ 也要学，点名后续路径）；后验标准差永远小于先验与数据各自的标准差吗？——是的，本课用数字验证这条「融合必缩」事实。

### 50 · 后验预测分布

- 文件：`50-posterior-predictive.md`
- 核心概念：学完参数还要预测新数据——对后验里每个参数值取平均；预测分布比「代入点估计」更胖，因为把参数不确定性算了进去。
- 边界：讲 Beta-Binomial 后验预测（拉普拉斯规则直觉）与一次伯努利预测的特殊性；不讲解析积分推导（选读用「积分号换求和」图示）。
- 组件：`bayes-slab`（后验 vs 预测对比读数）+ Python 直方图对比。
- 判题：接 30 课后验 Beta(8,4)：预测下一次正面概率与接下来 10 次的期望正面数。初始代码用了 MLE。`@check: 0.667` / `@check: 6.67`。
- 必写误区：后验预测≠把 p̂ 代回去（丢了参数不确定性）；预测区间天然比置信区间宽是特性不是缺陷；「下一次」与「未来十次的平均」精度不同。

### 60 · 边际似然与模型比较

- 文件：`60-marginal-likelihood-model-compare.md`
- 核心概念：证据 P(data|M)=似然对先验的平均；太能屈能伸的模型被摊薄，贝叶斯因子自动执行奥卡姆剃刀。
- 边界：讲两个离散小模型的完整证据计算与贝叶斯因子判读；不讲 Laplace 近似；先验敏感性只给一条警示不给系统方法。
- 组件：`bayes-bars`（把「模型」当假设复用）+ Python 数值例。
- 判题：公平硬币模型 A（p 固定 0.5）vs 四点网格 {0.2,0.4,0.6,0.8} 均匀先验模型 B，数据 10 投 5 正。输出两个证据。初始代码把「平均似然」写成「求和忘除」。`@check: 0.000977` / `@check: 0.000451`。
- 必写误区：证据是先验平均下的似然，不是最大似然（拿峰值比较必错）；贝叶斯因子依赖先验设置，换先验结论可能翻转；复杂模型输在摊薄而非拟合不好。

### 70 · MCMC：Metropolis-Hastings 游走

- 文件：`70-mcmc-metropolis.md`
- 核心概念：后验没有解析形状时，用「提议—按比率接受/拒绝」的随机游走画出它的地形；驻留时长 ∝ 后验密度。
- 边界：讲 MH 完整算法并用 Python 手写实现、肉眼版收敛诊断（轨迹+直方图对照目标）；详细平衡证明放选读；HMC 只留展望一段，不讲 Gibbs。
- 组件：`mcmc-walk` + `mcmc` python 块（`random` 已在 prob/law 出生；如需 exp 目标可用 math.exp，已在 series/handmade 出生）。
- 判题：确定性机制题——目标 f(x)∝1/x²，当前 x=1 提议 x'=2，对称提议。输出接受比率与 u=0.3 时的判定。初始代码把比率写成了 f(1)/f(2)。`@check: 0.25` / `@check: reject`。
- 必写误区：MCMC 样本是相关的，不是独立抽签；步长太大拒绝率高、太小游不动，都要烧更多样本；burn-in 前的样本不进直方图；轨迹图不是分布本身，直方图才是。

### 80 · 层次模型与部分池化

- 文件：`80-hierarchical-partial-pooling.md`
- 核心概念：小组数据容易被极端值绑架；两层结构让组估计向全局中心收缩——数据越少收得越多，这是精度加权（回扣 40 课）的自然结果。
- 边界：讲两层结构与收缩公式、棒球击球率式经典例；不讲三层以上结构与超先验的完整 MCMC 工作流（点名即可）。
- 组件：`shrinkage-lab`。
- 判题：先验 N(10, sd=2)；甲组 n=4 样本均值 14，乙组 n=100 样本均值 14。分别输出两组后验均值。初始代码对乙组也照抄小样本权重。`@check: 13.2` / `@check: 13.96`。
- 必写误区：部分池化≠全部混一起算平均（完全池化），也不等于各自为政（不池化）；收缩幅度由该组数据量与先验宽度共同决定；层次结构必须对应真实生成过程，不是「更高级所以随便套」。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | bayes/bayes-rule | prob/law, prob/stats | 3 | conditional-probability, bayes-theorem, base-rate |
| 18 | bayes/prior-likelihood-posterior | bayes/bayes-rule | 3 | prior-distribution, posterior-distribution |
| 19 | bayes/beta-binomial | bayes/prior-likelihood-posterior, prob/counting | 3 | conjugate-prior, beta-distribution |
| 20 | bayes/normal-conjugate | bayes/beta-binomial, inference/sampling-distribution | 4 | normal-conjugate, precision-weighting |
| 21 | bayes/posterior-predictive | bayes/beta-binomial | 3 | posterior-predictive |
| 22 | bayes/marginal-likelihood-model-compare | bayes/posterior-predictive | 4 | marginal-likelihood, bayes-factor, occams-razor |
| 23 | bayes/mcmc-metropolis | bayes/posterior-predictive, prob/law | 4 | markov-chain-monte-carlo, metropolis-hastings |
| 24 | bayes/hierarchical-partial-pooling | bayes/normal-conjugate, bayes/mcmc-metropolis | 4 | hierarchical-model, partial-pooling |

工具登记现状：import `random`/`statistics`/`matplotlib.pyplot` 与 `math.sqrt`/`math.exp` 均已出生，本章零新增 import；判题全部固定数据保证确定性，随机模拟只进非判题块。第 10 课是 `bayes-theorem` 全站唯一出生地，后续任何章引用贝叶斯公式 prereqs 都应指向 `bayes/bayes-rule`。

## 6. 整章验收清单

1. 四个新 renderer 注册进 `RENDERERS` 且 validate 可识别；每课至少一个定制可视化或三曲线 matplotlib 实验。
2. 每课一个判题 exercise：初始代码能跑但结果不对，独立解法实际输出与 `@check` 逐行一致（注意 0.854/52.824 这类位数敏感值用 round 指定位数）。
3. 第 10 课通过「贝叶斯公式出生证明」专项检查：公式推导现场完成、front matter 登记 introduces_concepts、正文无「我们在 220 学过」类表述。
4. 每课有 quiz、2–3 条误区卡、选读或边界说明；九段式骨架完整。
5. MDX 双坑自检：花括号用 `\lbrace`/`\rbrace`（Beta(a,b) 记号无需花括号，若写集合务必替换）；显示公式一律单行；改完跑 h2 计数体检。
6. prereqs 全部 grep 核实存在且更前（含跨章 inference/sampling-distribution）。
7. `npm run validate` → `npm run build` 全绿；手测三类互动块、Alt+P 浮窗、路由切换无重复注入；360px + dark 无溢出。
8. 报告合并进 `CONTENT_AUDIT.md`；回填候选登记 `AUDIT_REPORTS/OPEN_ITEMS.md`：`bayes-bars` → 未来 42-causal-inference 干预直觉课，`shrinkage-lab` → 45-ml-math 正则化课。
