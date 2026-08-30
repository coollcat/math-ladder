# 第 41 章 · 学习理论 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线；原「九门全部未写」为写作当时快照）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L10 / track information-learning / stage research-elective（章级 difficulty 4，单课 3–5）

## 1. 章定位

学习理论回答的不是"怎么训练"，而是"训练成功凭什么算数"。全章沿一条主线推进：

```text
ERM：训练误差能算 → 泛化界：训练好≠测试好 → 容量：模型类多大才可控
→ VC 维：容量的可计算刻度 → PAC：把"能学"写成数学命题
→ 偏差方差：误差三拆分 → 正则化：用容量换偏差 → 双下降：旧理论失效处
→ Scaling Laws：新时代的经验规律
```

写作红线：ML 直觉必须**本章自带**——前四课要把"模型/损失/训练/验证"这套语言从零立起来。（原注「第 45 章只是占位骨架，不能引用其任何课」为写作当时口径；第 45 章现已建成 10 门，可按实际 lesson_id 正常串 prereqs。）不能写成名词堆砌课，每个界都要有"没有它会发生什么"的出生证明。

## 2. 前置覆盖

已存在且可直接依赖的真实前置（grep 核实过 lesson_id）：

- `prob/stats`（第 09 章期望与方差）：一切误差度量的地基。
- `prob/law`（大数定律）：训练误差逼近期望风险的直觉版本。
- `prob/counting`（排列组合）：枚举二分、增长函数计数用。
- `exponents/log`（对数）：所有界的 ln 项。
- `math-language/quantifiers`（谓词与量词）：PAC 命题的 ∀ 分布 ∃ 假设结构。
- `linalg-advanced/least-squares`（正规方程）：ERM 的连续版实例。
- `calculus/rules`、`real-analysis/completeness-supremum`：极值存在性与求导。

**口径更正**：index「前置回望」提到的第 38 章（估计/置信区间）、第 40 章（KL/交叉熵）、第 45 章（正则化实践）现已全部建成，均有合法 lesson_id 可挂（原「只有 index 骨架」为写作当时快照）。处置办法：

1. 本章 prereqs 一律只挂上表真实 id 或本章排前的课；
2. 需要的统计底盘（条件期望、验证集思想）在第 10 课内自带最小版本；
3. 第 70 课的 KL 连接只做文字预告，不做公式依赖；
4. 上游章节完成后，回填 prereqs 并在 ROADMAP 登记回填项。

## 3. 组件清单

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `coinlaw`（现有） | 频率随试验数收敛，演示"训练误差→期望风险"的大数定律直觉 | 10 |
| `fit` / `least-squares-fit`（现有） | 拖数据点看最小二乘追线，作为 ERM 具象实例 | 10/70 |
| `statdots`（现有） | 重抽样散点叠加，展示同一总体的不同训练集 | 60 |
| `plot`（现有） | 风险曲线族、Scaling Law 幂律直线（配 matplotlib log-log） | 20/80/90 |

### 新增定制组件（4 个，≤5 上限）

#### `generalization-gap`

- spec JSON 字段：`type`、`title`、`hyp_class`（"intervals"|"thresholds"）、`delta`（滑块 0.01–0.5）、`m_max`。
- 画布：横轴样本量 m、纵轴误差；画理论界曲线 sqrt((ln\|H\|+ln(1/δ))/(2m))（单行 KaTeX 书写时花括号用 `\lbrace\rbrace`），叠加蒙特卡洛实测 gap 散点（固定种子）。
- 交互：拖 m 与 δ 滑块，界曲线实时重画；点击散点显示该次实验的训练/测试误差。
- 动画：无（重画即可）；暗色主题两曲线颜色对比需达标。
- 服务课：20/30。

#### `vc-shatter`

- spec JSON 字段：`type`、`title`、`points`（初始点坐标数组）、`family`（"interval"|"halfplane"|"rectangle"）。
- 画布：左侧平面点阵（interval 族时退化为一维轴），右侧 2^m 格子表逐格点亮表示可实现/不可实现的标法。
- 交互：增删/拖动点；一键"枚举全部参数"，格子表动画式逐格判定；显示当前 m 下能否被 shatter 的结论徽标。
- 动画：枚举过程逐步高亮（可跳过）；提供重置。
- 服务课：40。

#### `bias-variance-panel`

- spec JSON 字段：`type`、`title`、`true_fn`（表达式字符串）、`noise`、`degree`（滑块 0–9）、`trials`。
- 画布：主图为多次重采样各自拟合同阶多项式的灰色曲线族 + 红色平均预测线 + 绿色真函数；侧栏为测试误差分解条形（偏差平方 / 方差 / 噪声三段堆叠）。
- 交互：拖 degree 滑块看欠拟合（偏差主导）→ 过拟合（方差主导）；拖 noise 滑块看底座抬高。
- 动画：切换 degree 时曲线族渐变过渡；`prefers-reduced-motion` 时直切。
- 服务课：60/70。

#### `double-descent-curve`

- spec JSON 字段：`type`、`title`、`n_train`、`noise_level`、`model_family`（"poly"|"rff"）。
- 画布：横轴参数量（对数轴），纵轴风险；训练风险单调降到 0，测试风险在插值阈值 n_params≈n_train 处隆起后二次下降；阈值处竖直虚线。
- 交互：拖 n_train 与 noise 滑块，峰位随之移动；悬停显示该参数量下"有效自由度 vs 样本量"关系卡。
- 动画：无；但切换预设（经典区/现代区）时曲线平移过渡。
- 服务课：80。

## 4. 课题切分

### 10 · ERM 与训练/测试误差

- 文件：`10-erm-train-test.md`
- 核心概念：学习=在假设类里挑训练损失最小者（ERM）；训练误差低不代表未来误差低，因为同一个类里还有别的候选。
- 边界：讲损失、假设类、训练/测试划分与 ERM 定义；不讲优化算法（交给第 43 章）。
- 组件：`coinlaw` + `fit`（均现有）。
- 判题 exercise：三个训练点 (1,2)、(2,2)、(3,4)，比较候选 h1(x)=x 与 h2(x)=2 的训练 MSE 并选出 ERM 赢家。正确解打印：
  ```text
  # @check: h1 训练MSE: 0.67
  # @check: h2 训练MSE: 1.33
  # @check: ERM 选择: h1
  ```
- 必写误区：训练 MSE 是对"这个候选"算的，不是对整个类；ERM 是选择准则不是算法；测试点绝不能参与挑选。

### 20 · 泛化误差与样本复杂度

- 文件：`20-generalization-bound.md`
- 核心概念：泛化差距随样本量按 sqrt(ln\|H\|/(2m)) 收缩（有限类一致收敛界）；"要多多少样本"可以定量回答。
- 边界：讲有限假设类的一致收敛界与样本复杂度；不讲 Rademacher 复杂度。
- 组件：`generalization-gap`（新）+ `coinlaw`（现有）。
- 判题 exercise：\|H\|=100、δ=0.05，算 m=100 的界并反解 gap≤0.1 所需最小 m。正确解打印：
  ```text
  # @check: m=100 时泛化界: 0.195
  # @check: 达到 0.1 至少需要样本: 381
  ```
- 必写误区：界是概率保证不是确定性承诺；ln 里是 \|H\| 不是 2^\|H\|；样本复杂度的 ceil 不能四舍五入。

### 30 · 假设类容量与增长函数

- 文件：`30-hypothesis-capacity.md`
- 核心概念：增长函数 Π(m) 数"前 m 个点最多能被标出多少种正负组合"；有限类的界由 ln\|H\| 升级为 ln Π(m)。
- 边界：讲增长函数与有限类→无限类的过渡动机；不讲 Sauer 引理证明（第 40 课只用其结论形式）。
- 组件：`generalization-gap`（新）+ `counting`（现有）。
- 判题 exercise：一维间隔类的 Π(m)=m(m+1)/2+1，算 Π(3)、Π(4)，找首个 Π(m)<2^m 的 m。正确解打印：
  ```text
  # @check: growth(3) = 7
  # @check: growth(4) = 11
  # @check: 首个严格小于 2^m 的 m: 3
  ```
- 必写误区：增长函数是对"某个固定的点集"取最大，不是对所有点集求和；Π(m)=2^m 不代表能 shatter 更多的点。

### 40 · VC 维与 shattering

- 文件：`40-vc-dimension.md`
- 核心概念：VC 维=能被完全打碎的最大点数；它与分布无关、与学习算法无关，是假设类的纯几何属性。
- 边界：讲 shattering、常见类（间隔/阈值/半平面/矩形）的 VC 维与 Sauer 引理结论形式；不讲 VC 泛化界证明细节。
- 组件：`vc-shatter`（新，主场）。
- 判题 exercise：枚举一维间隔类在点 x=1,2,3 上能实现的正集个数，并与两点情形对比，得出 VC 维。正确解打印：
  ```text
  # @check: 两点可实现的标法数: 4
  # @check: 三点可实现的正集数: 7
  # @check: 间隔类的 VC 维: 2
  ```
- 必写误区：VC 维不是"能正确分类的最大点数"而是"能实现全部标法的最大点数"；三点 7<8 就足够否定 shattering；半平面在二维的 VC 维是 3 不是 2。

### 50 · PAC 学习框架

- 文件：`50-pac-learning.md`
- 核心概念："能学"的精确含义——对任意目标概念与任意分布，以至少 1−δ 的概率、把误差压到 ε 以下，且样本量只依赖 1/ε、1/δ、容量。
- 边界：讲可实现情形下的 PAC 定义与有限类样本复杂度；不讲不可实现（agnostic）情形与计算复杂性话题。
- 组件：`generalization-gap`（新）+ `quantifier-hunt`（现有，练 ∀∃ 读法）。
- 判题 exercise：\|H\|=1000、ε=0.05、δ=0.01，求最少样本数，再算 m=300 时"存在坏假设存活"的概率上界。正确解打印：
  ```text
  # @check: 最少样本: 231
  # @check: m=300 时失败概率上界: 0.000306
  ```
- 必写误区：δ 是概率失败率不是误差；"高概率"是对随机样本说的，不是对假设；两个量词 ∀∃ 的顺序不可交换。

### 60 · 偏差、方差与不可约误差

- 文件：`60-bias-variance.md`
- 核心概念：期望测试误差=偏差²+方差+噪声；模型复杂度推动两者反向变化，形成 U 形。
- 边界：讲回归平方损失下的分解推导；不讲分类 0-1 损失下的分解与集成方法。
- 组件：`bias-variance-panel`（新，主场）+ `statdots`（现有）。
- 判题 exercise：给定某测试点上平均预测 1.2、真值 1、模型方差 0.16、噪声方差 0.25，完成三拆分。正确解打印：
  ```text
  # @check: 偏差平方: 0.04
  # @check: 方差: 0.16
  # @check: 期望测试误差: 0.45
  # @check: 不可约误差: 0.25
  ```
- 必写误区：分解对"固定训练算法在随机数据上的期望"成立，单个模型谈不上方差；噪声项再好的模型也消不掉；偏差是系统性的，多训几个模型不会变小。

### 70 · 正则化的理论视角

- 文件： `70-regularization-theory.md`
- 核心概念：惩罚项收缩参数=缩小有效容量；结构风险最小化=训练损失+容量代价，岭回归是最小实例。
- 边界：讲以岭回归为例的收缩与有效自由度；不讲核技巧与谱方法证明。
- 组件：`bias-variance-panel`（新）+ `least-squares-fit`（现有）。
- 判题 exercise：过原点线性模型 w=Σxy/(Σx²+λ)，数据 x=[1,2,3]、y=[2,4,3]，比较 λ=0 与 λ=5 的斜率和训练 MSE。正确解打印：
  ```text
  # @check: 无正则斜率: 1.36
  # @check: lambda=5 斜率: 1.0
  # @check: 训练MSE 对比: 1.07 -> 1.67
  ```
- 必写误区：正则几乎必然抬高训练误差——这是特性不是 bug；λ=∞ 的极限是把预测钉在均值而不是 0（截距情形）；"有效容量"不是参数个数。

### 80 · 双下降与现代过参数化

- 文件：`80-double-descent.md`
- 核心概念：参数量越过插值阈值后测试风险再次下降；经典 U 形只是前半段故事。
- 边界：讲经验现象与插值阈值、隐式正则的解释直觉；不讲神经正切核与良性过拟合证明。
- 组件：`double-descent-curve`（新，主场）。
- 判题 exercise：给定参数量-风险表（20 为样本量），读出插值阈值、峰值与终值。正确解打印：
  ```text
  # @check: 插值阈值参数量: 20
  # @check: 测试风险峰值: 2.2
  # @check: 最终下降到: 0.4
  ```
- 必写误区：双下降不是推翻偏差方差而是推广它（峰右侧方差重新受控）；插值≠零泛化误差；"越大越好"只在峰右段且数据无噪时接近成立。

### 90 · Scaling Laws 的经验规律

- 文件：`90-scaling-laws.md`
- 核心概念：损失随规模呈幂律 L(N)=c·N^(−b)；log-log 直线让指数一眼可读。
- 边界：讲幂律拟合与外推风险；不讲 Chinchilla 最优分配的具体配方（只提结论方向）。
- 组件：`plot`（现有）+ 浮窗 matplotlib log-log 实验。
- 判题 exercise：已知 L(100)=2.0、L(10000)=0.2，拟合幂律并预测 L(1e6)。正确解打印：
  ```text
  # @check: 指数 b: 0.5
  # @check: 系数 c: 20.0
  # @check: L(1e6) 预测: 0.02
  ```
- 必写误区：幂律是从两点猜的规律，外推必须带不确定性；b 是 log-log 斜率不是损失下降百分比；数据、参数、算力三条曲线各有各的指数。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | learning-theory/erm-train-test | prob/stats, linalg-advanced/least-squares | 3 | empirical-risk-minimization, hypothesis-class |
| 18 | learning-theory/generalization-bound | learning-theory/erm-train-test, prob/law | 4 | generalization-gap, sample-complexity |
| 19 | learning-theory/hypothesis-capacity | learning-theory/generalization-bound, math-language/quantifiers | 4 | growth-function, hypothesis-class-capacity |
| 20 | learning-theory/vc-dimension | learning-theory/hypothesis-capacity, prob/counting | 4 | vc-dimension, shattering |
| 21 | learning-theory/pac-learning | learning-theory/vc-dimension, math-language/quantifiers | 5 | pac-learning |
| 22 | learning-theory/bias-variance | learning-theory/erm-train-test, prob/stats | 4 | bias-variance-decomposition, irreducible-error |
| 23 | learning-theory/regularization-theory | learning-theory/bias-variance, linalg-advanced/least-squares | 4 | structural-risk-minimization, l2-regularization |
| 24 | learning-theory/double-descent | learning-theory/regularization-theory, learning-theory/bias-variance | 5 | double-descent, interpolation-threshold |
| 25 | learning-theory/scaling-laws | learning-theory/double-descent, exponents/log | 3 | scaling-law, power-law-fit |

元数据统一补：volume 4 / layer L10 / track information-learning / stage research-elective。第 60 课可加副支线 probability-statistics；introduces_import 全章保持空（matplotlib 已在 00 章登记过，无需重复）。

## 6. 整章验收清单

1. 九门课 validate/build 全绿；源码 `^## ` 与产物 `<h2>` 逐页相等（MDX 双坑体检：行内花括号一律 `\lbrace\rbrace`、显示公式单行）。
2. 四个新渲染器注册进 RENDERERS 且有源码签名守卫；每门课至少一个定制 viz + 一个浮窗实验；exercise 初始代码能跑但结果不对，独立解法与 `@check` 逐字一致。
3. 每课 quiz 无 KaTeX、误区卡 2–3 条、选读或边界说明齐备。
4. prereqs 无一条指向虚构 id（写作当时的 240/260/320=现第 38/40/45 章，均已建成）；grep 复核全部真实存在。
5. 浏览器实测：vc-shatter 枚举、bias-variance-panel 滑块、double-descent-curve 峰移动、浮窗 Alt+P、路由往返无重复注入；360px + dark 无溢出。
6. 报告写入 CONTENT_AUDIT.md，非阻塞项进 AUDIT_REPORTS/OPEN_ITEMS.md；ROADMAP 勾 checkbox。
