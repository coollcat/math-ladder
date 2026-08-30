# 第 40 章 · 信息论 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L10 / track information-learning / stage university-core（章 difficulty 3，单课 2–4）

## 1. 章定位

信息论把「这条消息消除了多少意外」变成可测量的数。本章沿一条主线推进：

```text
自信息（惊讶度） → 熵（平均意外） → 联合/条件熵与链式法则 → KL 散度
→ 交叉熵与对数损失 → 互信息 → Huffman 无损压缩 → 困惑度 → 信道容量
```

前半程（10–60）是「不确定性微积分」，后半程（70–90）是它在压缩、模型评测与通信三个方向的落地。

## 2. 前置覆盖

- `prob/stats`（期望——熵就是自信息的期望）、`exponents/log`（对数）、`prob/law`（频率与模拟）是地基。
- **第 35 章 `coding-theory/entropy-redundancy` 已把熵公式作为预告引入**：H 定义、二元熵山峰、`math.log2` 出生证明都在那课完成。因此本章：
  - 20 课挂 prereqs `coding-theory/entropy-redundancy`，正文明确「预告转正」——不再重复 log2 换底介绍，直接从自信息期望重新推导一遍熵，给出它为什么长这样的第二重理由；
  - 70/80 课分别挂 `coding-theory/entropy-redundancy` 与 `coding-theory/channel-model`（BSC 出生地）；纠错码内容（汉明码等）留在第 35 章，本章只讲信源编码与容量边界，两章在 method-map 里互相引流；
- `series/convergence` 仅在 40 课选读（Gibbs 不等式的凸性一句话）提及，不进 prereqs。
- 概率工具已就位（原注「220 未建成」为写作当时口径）：期望、条件概率与贝叶斯公式均已在第 36 章建成，`probability-advanced/*` 可正常引用。

## 3. 组件清单

| renderer | 状态 | 核心交互 | 服务课 |
| --- | --- | --- | --- |
| `self-info-meter` | 新增 | 按分布抽奖符号，头顶惊讶读数 −log₂p 与累计平均 | 10 |
| `entropy-scale` | 新增 | 类别概率滑杆自动归一化+熵读数条+最大熵参考线 | 20/80 |
| `joint-grid` | 新增 | 可编辑联合概率格，四读数（边际/条件/联合熵/互信息）联动 | 30/60 |
| `kl-asymmetry` | 新增 | P/Q 双组滑杆，KL 双向读数与逐项贡献条形 | 40/50 |
| `huffman-lab` | 新增 | 词频表→合并最小节点动画→码树展开+平均码长 vs 熵 | 70 |
| `plot` | 现有 | 二元熵曲线（回扣 190 同款）、BSC 容量曲线 C(p) | 20/90 |

新增组件规格（viz JSON 围栏接入，注册进 `RENDERERS`，dataset 守卫，暗色可读，canvas ≥260px）：

### self-info-meter

- spec 字段：`labels`（符号数组）、`probs`（概率数组，自动归一化）、`draws`。
- 画布：横排符号卡；每次抽中的符号放大弹跳并弹出气泡显示 −log₂p；顶部滚动读数「平均惊讶」逐渐逼近熵（伏笔 20 课）。
- 交互：「抽 1 次」「×100」「换分布预设」（均匀/偏斜/近确定）；悬停卡片常显该符号自信息。
- 动画：单次抽奖有弹跳；批量无粒子直接更新计数条。

### entropy-scale

- spec 字段：`categories`（类别数 2–8）、`probs` 初始值、`unit`（bits/nats 可选）。
- 画布：每类一根竖向滑杆，拖动后全部按比例归一（其余杆反向伸缩）；右侧大号熵读数+水平刻度条，均匀上限 log₂n 处画金色参考线。
- 交互：拖任意滑杆；「一键均匀」「一键确定」「随机扰动」按钮。
- 动画：滑杆与读数即时联动，无循环。

### joint-grid

- spec 字段：`rows`/`cols`（默认 2×2）、`cells`（初值）、`presets`（independent/xor/correlated 按钮）。
- 画布：网格单元面积∝概率（正方形缩放），行和/列和画在边缘作边际分布；右上角四行读数 H(X)、H(Y)、H(X,Y)、I(X;Y) 实时刷新。
- 交互：点选单元格后用滚轮或 +/- 按钮调值（保持总和为 1）；预设按钮一键切换三种典型结构。
- 动画：格子尺寸过渡 150ms。

### kl-asymmetry

- spec 字段：`categories`、`p`、`q` 初值。
- 画布：上下两组竖杆（P 橙 Q 蓝）；中部双向读数 D(P‖Q) 与 D(Q‖P) 大字并列；下方逐项贡献水平条形（含 p·log(p/q) 正负着色）。
- 交互：两组滑杆独立拖动；「交换 P/Q」按钮让不对称性当场现形。
- 动画：无，即时重算。

### huffman-lab

- spec 字段：`symbols`（字符数组）、`counts`（频数数组）、`mode`（auto/manual）。
- 画布：左侧频数表；中部合并动画——每步挑两个最小权重节点圈红并合成新节点上浮；完成后右侧展示码树（左 0 右 1）与每个符号的码字。
- 交互：「合并一步」「自动完成」「重置」；manual 模式允许学生自己点选两个节点合并（选错给行内提示不判负）；底部双读数：平均码长 vs 熵。
- 动画：逐步合并有位移动画；running 守卫防连点重入。

## 4. 课题切分

### 10 · 自信息：惊讶可以度量

- 文件：`10-self-information.md`
- 核心概念：信息量=意外程度 I(x)=−log₂ p(x)；独立性要求「意外可加」逼出对数；必然事件零信息。
- 边界：讲公理性动机（单调、独立可加、连续）与计算；不讲 Kolmogorov 复杂度、不讲连续微分熵。
- 组件：`self-info-meter`。
- 判题：给定分布 [1/2,1/4,1/8,1/8]，输出 p=1/8 的自信息与独立事件 p=1/2∧1/8=1/16 的联合自信息。初始代码忘了取对数输出倒数。`@check: 3.0` / `@check: 4.0`。
- 必写误区：信息量与「重要性/价值」无关（术语表口径）；0·log 0=0 是约定不是计算结果；比特是对数单位，与二进制位同名但先有单位后有存储实现。

### 20 · 熵：不确定性的期望

- 文件：`20-entropy.md`
- 核心概念：熵=平均惊讶=自信息的期望；均匀最大、确定最小；二元熵是一座对称小山。
- 边界：讲定义、非负性、均匀最大三条性质与计算；凸性论证放选读；相对熵不在本课。
- 组件：`entropy-scale` + `plot`（二元熵曲线，回扣 190 同款 expr）。
- 判题：对 [0.5,0.25,0.125,0.125] 从自信息期望出发重算熵（呼应 190 例），再算 8 符号均匀分布的熵。初始代码漏乘概率。`@check: 1.75` / `@check: 3.0`。
- 必写误区：熵是分布的属性不是某个具体结果的属性；熵大≠坏事（压缩希望低、保密希望高）；换底单位就变（bits/nats），比较前先统一。

### 30 · 联合熵、条件熵与链式法则

- 文件：`30-joint-conditional-entropy.md`
- 核心概念：H(X,Y)=H(X)+H(Y|X)；条件熵回答「知道 X 后 Y 平均还剩多少意外」；独立时条件熵=边际熵。
- 边界：讲离散联合表上的计算与链式法则；「条件作用平均不增熵」给数值验证不给证明；互信息留给 60 课。
- 组件：`joint-grid`。
- 判题：天气×带伞联合表（晴 0.75 雨 0.25；P(晴,拿伞)=0.1 等，全表见生产时定稿），输出 H(Y) 与 H(Y|X)。初始代码用 H(X,Y)−H(Y) 冒充条件熵。`@check: 0.881` / `@check: 0.605`。
- 必写误区：H(Y|X) 是平均值，单个 x 取值下的剩余意外可以更大；链式法则两种顺序答案相同；「知道更多平均更确定」只在平均意义成立。

### 40 · KL 散度：两种分布差多远

- 文件：`40-kl-divergence.md`
- 核心概念：D(P‖Q)=Σ p·log₂(p/q)——用 Q 当真去应对来自 P 的世界，平均多付的代价；非对称、非负、为零当且仅当相等。
- 边界：讲计算与非对称性演示、「完全排除可能致命」（q_i=0）警示；Gibbs 不等式证明放选读；不讲信息几何。
- 组件：`kl-asymmetry`。
- 判题：P=[0.5,0.5]、Q=[0.25,0.75]，输出两个方向的 KL。初始代码把两个方向算成同一个数。`@check: 0.208` / `@check: 0.189`。
- 必写误区：KL 不是距离（不对称、无三角不等式）；方向差可以巨大，「谁逼近谁」必须说清；Q 里出现 P 有 Q 无的符号时代价无穷大。

### 50 · 交叉熵与对数损失

- 文件：`50-cross-entropy-logloss.md`
- 核心概念：H(P,Q)=H(P)+D(P‖Q)——真实意外的固有部分+说谎税；机器学习的对数损失就是交叉熵的特例。
- 边界：讲恒等式、数值验证与 one-hot 分类损失的 −log 置信形式；softmax 与训练闭环留给第 45/46 章；互信息下一课。
- 组件：`kl-asymmetry`（加交叉熵读数模式复用）+ Python 多类计算。
- 判题：真标签 one-hot，模型 A 预测 [0.7,0.3]、模型 B 预测 [0.1,0.9]，输出两者以 bit 计的损失。初始代码用了 log 而非 log2 且没取负。`@check: 0.515` / `@check: 3.322`。
- 必写误区：H(P,P)=H(P)，自己骗自己零税但也就没有信息；损失低≠概率校准好（预告第 54 章）；跨任务比损失必须同底同词表。

### 60 · 互信息：变量间的信息纽带

- 文件：`60-mutual-information.md`
- 核心概念：I(X;Y)=H(X)+H(Y)−H(X,Y)——知道 Y 平均省下多少关于 X 的意外；独立 ⟺ 0；也等于 D(联合‖边际乘积)。
- 边界：讲计算、维恩图直觉与「抓得到非线性依赖」的 XOR 反例；不讲连续互信息与信息瓶颈；因果解读预告第 42 章。
- 组件：`joint-grid`（XOR/相关/独立三预设）。
- 判题：XOR 表输出 MI（保留 1 位小数），相关表 (0.4,0.1,0.1,0.4) 输出 MI 三位小数。初始代码用相关系数公式得 0。`@check: 0.0` / `@check: 0.278`。
- 必写误区：MI=0 当且仅当独立，而相关系数为 0 不是（XOR 是铁证）；I(X;Y)=I(Y;X) 对称但条件版不一定；MI 大不代表因果。

### 70 · 无损压缩与 Huffman 编码

- 文件：`70-huffman-coding.md`
- 核心概念：信源编码定理划界——平均码长低于熵必丢信息；Huffman 构造最优前缀码，平均码长落在 [H, H+1)。
- 边界：讲前缀约束、合并两最小的手工流程、与熵界限对照；不讲算术编码；信道编码定理下一课；纠错视角不与 190 重复。
- 组件：`huffman-lab`。
- 判题：频数 {a:8,b:4,c:2,d:2}（共 16 符号），输出 Huffman 平均码长与该分布熵。初始代码用固定 2 位编码。`@check: 1.75` / `@check: 1.75`——两数相等正是 2 的幂次频率下 Huffman 触底的彩蛋，正文必须点破。
- 必写误区：单个符号码长可以小于其自信息，被违反的是平均界限；Huffman 最优仅限逐符号编码，成对编码还能再压；等概率时无增益（熵已=log₂n）。

### 80 · 困惑度：模型的等效骰子面数

- 文件：`80-perplexity.md`
- 核心概念：困惑度=2^{交叉熵}——「模型眼里真实结果等效于掷几面均匀骰子」；语言模型评测的第一块基石。
- 边界：讲定义、计算与解读（面数类比）；跨词表不可比只警示；训练技巧与 scaling 全部留给卷五。
- 组件：`entropy-scale`（困惑度=2^H 读数模式）+ Python 对比好坏模型。
- 判题：真分布 [0.5,0.25,0.125,0.125]；模型 q=[0.4,0.3,0.2,0.1] 时输出交叉熵与困惑度，模型 q=p 时输出困惑度。初始代码忘开 2 次方。`@check: 1.801` / `@check: 3.48` / `@check: 3.36`。
- 必写误区：面数是类比不是真的只有那些类别；困惑度随底的定义惯例变化（默认 2^{CE}）；记忆型模型可以在评测集上骗出低困惑度。

### 90 · 信道容量与可靠传输的边界

- 文件：`90-channel-capacity.md`
- 核心概念：C=max over 输入分布 of I(X;Y)；BSC 的 C=1−h(p)；速率低于 C 就存在差错率任意小的传输（定理陈述级）。
- 边界：讲 BSC 容量公式、数值表与 C(p) 曲线；noisy channel theorem 只陈述不证明（第 35 章已预告，本站止步）；具体码怎么造是第 35 章的事，结尾互相引流。
- 组件：`plot`（容量曲线 1+(x·log x+(1−x)·log(1−x))/log 2）+ Python 数值表。
- 判题：输出 p=0.11 与 p=0.5 的 BSC 容量。初始代码忘了 1−h 或把 h(0.5) 算成 0.5。`@check: 0.5` / `@check: 0.0`。
- 必写误区：容量是可达上界，不是每次传输都无误的承诺；p>0.5 的信道容量与 1−p 相同（翻转输出即可利用）；香农定理保证码存在但不负责造码。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | info/self-information | prob/stats, exponents/log | 2 | self-information |
| 18 | info/entropy | info/self-information, coding-theory/entropy-redundancy | 3 | shannon-entropy, maximum-entropy |
| 19 | info/joint-conditional-entropy | info/entropy | 3 | joint-entropy, conditional-entropy, entropy-chain-rule |
| 20 | info/kl-divergence | info/entropy | 3 | kl-divergence |
| 21 | info/cross-entropy-logloss | info/kl-divergence | 3 | cross-entropy, log-loss |
| 22 | info/mutual-information | info/joint-conditional-entropy, info/kl-divergence | 3 | mutual-information |
| 23 | info/huffman-coding | info/entropy, coding-theory/entropy-redundancy | 4 | prefix-code, huffman-coding, source-coding-theorem |
| 24 | info/perplexity | info/cross-entropy-logloss | 3 | perplexity |
| 25 | info/channel-capacity | info/mutual-information, coding-theory/channel-model | 4 | channel-capacity, binary-symmetric-channel |

工具登记现状：`math.log2` 已在 `coding-theory/entropy-redundancy` 登记（introduces_math: [math.log2]），本章全程只用它与既有 `round`/`sum`/`math.log`；import `matplotlib.pyplot` 已出生；本章零新增 introduces_import/introduces_math。判题全部固定数据确定性输出。

## 6. 整章验收清单

1. 五个新 renderer 注册进 `RENDERERS` 且 validate 可识别；每课至少一个定制可视化；70 课 huffman-lab 的 manual 模式手测可选错路径。
2. 每课一个判题 exercise：初始代码能跑但结果不对，独立解法实际输出与 `@check` 逐行一致（注意 `0.0` 与 `0.000977` 这类格式敏感值）。
3. 「预告转正」专项检查：20 课不得重复 190 的 log2 出生仪式，但须给出熵的第二重推导；与 190 两处 method-map 引流链接有效。
4. 每课有 quiz、2–3 条误区卡、选读或边界说明；九段式骨架完整。
5. MDX 双坑自检：花括号用 `\lbrace`/`\rbrace`（集合 {0.2,0.4,...} 一律替换）；显示公式一律单行；改完跑 h2 计数体检（源 `^## ` vs 产物 `<h2`）。
6. prereqs 全部 grep 核实存在且更前（coding-theory 各课位于第 35 章，序在前 ✓）。
7. `npm run validate` → `npm run build` 全绿；手测三类互动块、Alt+P 浮窗、路由切换无重复注入；360px + dark 无溢出。
8. 报告合并进 `CONTENT_AUDIT.md`；回填候选登记 `AUDIT_REPORTS/OPEN_ITEMS.md`：`entropy-scale` 回填 `docs/35-coding-theory/75-entropy-redundancy.md`（其 plot 曲线可升级），`kl-asymmetry` → 未来 45-ml-math 损失函数课，`joint-grid` → 42-causal-inference 独立性课。
