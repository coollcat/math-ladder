# 第 43 章 · 优化 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 12 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：12 门正式课（磁盘已齐线；原「八门全部未写」为写作当时快照）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 5 / layer L7 / track optimization-control / stage university-core（章级 difficulty 4，单课 3–5）

## 1. 章定位

优化把愿望写成目标函数，再在可行范围内找最好的选择。全章沿一条主线推进：

```text
目标与可行域 → 凸性：局部好=全局好 → 一阶/二阶最优性条件 → 梯度下降与学习率
→ 动量/RMSProp/Adam → SGD：噪声也是正则 → 拉格朗日：约束下的驻点 → KKT 与对偶
```

写作红线：梯度、Hessian、正定性直接建在第 20 章多元微积分和第 21 章线代进阶之上，**不重推导**；每课都要有"等高线上的轨迹"这一几何画面，不能写成公式查表课。第 44 章数值分析现已建成 10 门（原「只有 index 骨架」为写作当时口径）；浮点误差话题仍只做一句预告，不进 prereqs。

## 2. 前置覆盖

已存在且可直接依赖的真实前置（grep 核实过 lesson_id）：

- `multivariable/partial-gradient`、`multivariable/hessian-shape`（第 20 章）：梯度是下降方向的几何地图，Hessian 定曲率。
- `multivariable/jacobian-chain`（链式法则的多元版）：SGD 反传式更新与复合目标。
- `linalg-advanced/positive-definite`、`linalg-advanced/eigenvalues`：凸性与条件数判定。
- `linalg-advanced/condition-number`：病态问题里 GD 为什么走之字。
- `linalg-advanced/least-squares`：无约束优化的解析可解实例。
- `calculus/rules`、`calculus/transcendental`、`calculus/chain`（第 13 章）：一元极值与求导。
- `real-analysis/completeness-supremum`（第 19 章）：紧集上连续函数取到最值的存在性。
- `ode/euler-runge-kutta`（第 22 章）：梯度下降=梯度流 ODE 的显式欧拉离散，收敛性对照。

本章不重复推导偏导与特征分解；第一课用半页把它们"接线"到优化语言。

## 3. 组件清单

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `contour-map`（现有） | 等高线 + 可拖点，全章的公共地图 | 10/20/40/50/70 |
| `gradient-probe`（现有） | 任意点的梯度向量实时显示 | 10/30/40 |
| `hessian-curvature`（现有） | 二阶形状（碗/鞍）可视化 | 20/30 |
| `quadratic-form`（现有） | 正定矩阵的水平椭圆族 | 20/40 |
| `condition-number`（现有） | 椭圆越扁 GD 越走之字 | 40 |
| `plot`（现有） | 一维损失曲线、动量轨迹时间序列 | 40/50/90 |

### 新增定制组件（4 个，≤5 上限）

#### `convex-chord`

- spec JSON 字段：`type`、`title`、`expr`（一元表达式）、`domain`、`sample_points`（可选预置测试区间组）。
- 画布：上半为函数曲线 + 两端点弦（绿=弦在上方、红=被击穿）；下半为逐子区间的中点判据热力条（满足/违反/相等三色）。
- 交互：拖动两个端点扫过定义域；切换预设函数（x²、x³、\|x\|、sin）；一键扫描全部等分子区间并汇总违反数。
- 动画：端点拖动即时重画；扫描结果按序点亮（可跳过）。
- 服务课：20。

#### `gd-step-size`

- spec JSON 字段：`type`、`title`、`quad_a`（f(x)=ax² 的 a）、`x0`、`lr_max`、`steps`。
- 画布：左为一维碗形曲线上的迭代折线（点+箭头），右为学习率-发散相图（横轴 lr，纵轴放大率 \|1−2a·lr\|，安全区/振荡区/发散区分色带）。
- 交互：lr 滑块从 0.05 扫到发散区之外；点击相图任意位置把该 lr 发射到左侧重放迭代。
- 动画：迭代步进播放（每帧一步，可暂停）；`prefers-reduced-motion` 时直接画完整折线。
- 服务课：40（主场）/50。

#### `optimizer-race`

- spec JSON 字段：`type`、`title`、`loss`（预设键："ill-scaled-quadratic"|"saddle"|"rosenbrock"）、`start`、`lr`、`optimizers`（启用名单 gd/momentum/nesterov/rmsprop/adam）。
- 画布：等高线背景上各优化器轨迹同场赛跑（颜色区分），右侧当前损失对数曲线并列下坠。
- 交互：勾选/取消参赛者、调 lr 与起始点；单步模式逐帧推进；悬停轨迹显示当前参数与梯度。
- 动画：默认自动播放（每帧一步，带暂停/重置）；离屏自动暂停，复用 `addAnimationControls` 约定。
- 服务课：50/60。

#### `kkt-point-probe`

- spec JSON 字段：`type`、`title`、`expr`、`constraints`（g(x,y)≤0 形式的列表，支持圆/直线模板）、`mode`（"lagrange"|"inequality"）。
- 画布：目标函数淡色等高线 + 可行域阴影；候选点显示 ∇f 与 ∓λ∇g 的箭头对，共线时出现"平衡"徽标；不等式模式下边界内点/边界点/无效点三态着色。
- 交互：拖动候选点找驻点；λ 滑块手动配平两根箭头；切换约束激活/失活看互补松弛翻转。
- 动画：无（即时重算）；徽标出现一次性弹跳。
- 服务课：70/80。

## 4. 课题切分

### 10 · 目标函数、可行域与最优性

- 文件：`10-objectives-feasibility.md`
- 核心概念：优化三要素=决策变量、目标、可行域；全局最优的定义与存在性（紧集+连续⇒有最值）；网格搜索是最朴素的算法基线。
- 边界：讲最优性的数学定义与网格法及其分辨率教训；不讲算法复杂度与 NP-hard 现象。
- 组件：`contour-map` + `gradient-probe`（均现有）。
- 判题 exercise：f=x²+y²−x 在 [−1,1]² 上先粗网格（步长 1，扫描顺序 x 外层升序、y 内层升序，平局取先到者）再细网格（步长 0.5）。正确解打印：
  ```text
  # @check: 粗网格最优: 0, 0 值 0.0
  # @check: 细网格最优: 0.5, 0 值 -0.25
  ```
- 必写误区：最优点可以在可行域内部也可以在边界上；粗网格的最优不是真最优（分辨率陷阱）；"没有最大"与"无界"是两种不同的坏消息。

### 20 · 凸集、凸函数与局部全局

- 文件：`20-convexity.md`
- 核心概念：凸集（连线不出集合）与凸函数（弦不低于曲线）；凸问题里局部最优即全局最优。
- 边界：讲定义、中点判据与凸/凹/非凸分类；不讲强凸与次梯度。
- 组件：`convex-chord`（新，主场）+ `hessian-curvature`（现有）。
- 判题 exercise：对 x²、x³、\|x\| 在三个区间 [−1,1]、[−1,0]、[0,1] 上做中点检验并统计违反数。正确解打印：
  ```text
  # @check: x^2 违反区间数: 0
  # @check: x^3 违反区间数: 2
  # @check: abs(x) 违反区间数: 0
  ```
- 必写误区：局部通过中点检验不代表整体凸（x³ 在 [−1,1] 全区间恰好蒙混过关）；\|x\| 在尖点不可导却仍是凸函数；凸函数的和仍是凸函数但差未必。

### 30 · 一阶与二阶最优性条件

- 文件：`30-optimality-conditions.md`
- 核心概念：∇f=0 是必要条件；Hessian 正定⇒局部极小、负定⇒极大、不定⇒鞍点；凸时一阶条件升级为充要。
- 边界：讲无约束情形的完整判定流程；不讲约束版（交给 70/80 课）。
- 组件：`gradient-probe` + `hessian-curvature`（均现有）。
- 判题 exercise：f=x²+xy+y²−3x，求驻点、Hessian 特征值（降序）、分类与函数值。正确解打印：
  ```text
  # @check: 驻点: 2, -1
  # @check: Hessian 特征值: 3.0, 1.0
  # @check: 类型: 局部极小
  # @check: f 值: -3.0
  ```
- 必写误区：驻点是候选不是答案，必须查 Hessian；特征值全正是正定的充分条件这里够用但不等于"逐个分量看对角线"；凸函数的驻点同时是全局最优。

### 40 · 梯度下降、学习率与收敛

- 文件：`40-gradient-descent.md`
- 核心概念：沿负梯度走；固定学习率的命运由 lr 与曲率乘积决定——收敛/衰减振荡/极限环/发散四态；病态椭圆让轨迹走之字。
- 边界：讲二次目标下的精确四态分析与条件数直觉；不讲线搜索与自适应步长实现（预告 50 课）。
- 组件：`gd-step-size`（新，主场）+ `contour-map` + `condition-number`（现有）。
- 判题 exercise：f(x)=x²，从 x₀=2 出发跑 20 步固定学习率 GD，报告四种 lr 的终点。正确解打印：
  ```text
  # @check: lr=0.2 终点: 0.0
  # @check: lr=0.5 终点: 0.0
  # @check: lr=0.9 终点: 0.023
  # @check: lr=1.0 终点: 2.0
  # @check: lr=1.1 终点: 76.68
  ```
- 必写误区：学习率不是越小越好只是更慢；lr=1/L 时出现永不收敛的极限环（幅度不变）；之字行走是条件数问题不是随机噪声。

### 50 · 动量、RMSProp 与 Adam 直觉

- 文件：`50-momentum-adam.md`
- 核心概念：动量累积速度冲过平坦区、抑制高频震荡；RMSProp 给每个坐标自适应步长；Adam=两者相加加偏差修正。
- 边界：讲三种机制的更新规则与一维手算一步；不讲收敛率证明与 Nesterov 的理论差异细节（race 里可对比轨迹）。
- 组件：`optimizer-race`（新，主场）+ `gd-step-size`（新）。
- 判题 exercise：Adam 单步手算——x₀=2、g=4、β₁=0.9、β₂=0.999、α=0.1、ε 忽略。正确解打印：
  ```text
  # @check: 一步后 m: 0.4
  # @check: 一步后 v: 0.016
  # @check: 偏差修正后步长: 0.1
  # @check: 更新后 x: 1.9
  ```
- 必写误区：偏差修正只在初期起作用，去掉它前几步会迈得极小；动量能越过浅坑也可能冲过谷底（超调是特性）；Adam 不是"永远最好"，race 里换损失就能看到翻车。

### 60 · 随机梯度下降与噪声

- 文件：`60-sgd-noise.md`
- 核心概念：mini-batch 用有噪梯度换算力；梯度估计噪声按 1/sqrt(b) 缩小；等效于给 GD 注入温度，大 batch 小噪声要配套学习率。
- 边界：讲批大小-方差-步长的三角关系与线性标度规则直觉；不讲方差缩减技术与分布式通信开销。
- 组件：`optimizer-race`（新）+ 浮窗 matplotlib 噪声轨迹实验（random 已登记，无需新增 import）。
- 判题 exercise：每样本梯度=真实梯度+N(0,1) 噪声，批均值的标准差随 b 变化，问 b=1、b=100 的标准差与匹配方差所需步数比。正确解打印：
  ```text
  # @check: b=1 梯度噪声标准差: 1.0
  # @check: b=100 梯度噪声标准差: 0.1
  # @check: 匹配方差所需步数比: 100
  ```
- 必写误区：SGD 单步变差不等于总效果变差（多走几步还自带逃离鞍点的红利）；噪声不会消失只会缩小；batch 增大 k 倍不等于训练加速 k 倍。

### 70 · 拉格朗日乘数法

- 文件：`70-lagrange-multipliers.md`
- 核心概念：等值线与约束曲线相切处出极值；∇f 与 ∇g 共线引出 λ；λ 的符号与大小读出"放松约束值多少钱"。
- 边界：讲等式约束的几何推导与灵敏度解释；不讲一般化的约束规格（交给 80 课）。
- 组件：`kkt-point-probe`（新，首秀，mode=lagrange）+ `contour-map`（现有）。
- 判题 exercise：min x²+y² s.t. x+y=4，求驻点、λ，并用 b=4.1 验证灵敏度 d(最优值)/db=−λ。正确解打印：
  ```text
  # @check: 驻点: 2.0, 2.0
  # @check: lambda: -4.0
  # @check: b=4.1 时最优值增量: 0.405
  ```
- 必写误区：λ 的符号取决于把 g 写成 =0 还是 f+λ(g−b) 的约定，全书必须统一一种；灵敏度公式只在约束微扰时近似成立；切点可能不止一个要逐一比较。

### 80 · KKT 条件与对偶问题

- 文件：`80-kkt-duality.md`
- 核心概念：KKT=拉格朗日+不等式：平稳性、原始可行、对偶可行、互补松弛四件套；对偶函数给出下界，强对偶时缝隙闭合。
- 边界：讲凸问题+线性约束下的完整闭环实例；不讲 Slater 条件的证明与非凸对偶间隙案例（文字点名即可）。
- 组件：`kkt-point-probe`（新，主场，mode=inequality）。
- 判题 exercise：min x²+y² s.t. x+y≥4，对偶函数 g(λ)=4λ−λ²/2（λ≥0），算三个采样点的对偶值并对齐强弱对偶。正确解打印：
  ```text
  # @check: g(2): 6.0
  # @check: g(4): 8.0
  # @check: g(8): 0.0
  # @check: 对偶最优 lambda: 4.0
  # @check: 弱对偶检查: 8.0 <= 8.0
  ```
- 必写误区：互补松弛说"约束不动摇则 λ=0、约束贴边则可非零"，两者可以同时非零吗？不可以；对偶永远是下界方向别记反；弱对偶成立不需要凸，强对偶才需要额外条件。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | optimization/objectives-feasibility | real-analysis/completeness-supremum, multivariable/level-sets | 3 | objective-function, feasible-region |
| 18 | optimization/convexity | optimization/objectives-feasibility, linalg-advanced/positive-definite | 3 | convex-set, convex-function |
| 19 | optimization/optimality-conditions | optimization/convexity, multivariable/hessian-shape, linalg-advanced/eigenvalues | 4 | first-order-condition, second-order-condition, saddle-point |
| 20 | optimization/gradient-descent | optimization/optimality-conditions, ode/euler-runge-kutta, linalg-advanced/condition-number | 4 | gradient-descent, learning-rate |
| 21 | optimization/momentum-adam | optimization/gradient-descent | 4 | momentum, rmsprop, adam |
| 22 | optimization/sgd-noise | optimization/momentum-adam, multivariable/jacobian-chain | 5 | stochastic-gradient-descent, mini-batch |
| 23 | optimization/lagrange-multipliers | optimization/convexity, multivariable/partial-gradient | 4 | lagrange-multiplier |
| 24 | optimization/kkt-duality | optimization/lagrange-multipliers, linalg-advanced/positive-definite | 5 | kkt-condition, dual-problem, strong-duality |

元数据统一补：volume 5 / layer L7 / track optimization-control / stage university-core。第 40/50/60 课建议加副支线 scientific-computing；introduces_math/import 全章预计为空（math 与 matplotlib 均已在前登记），如实留空数组。

## 6. 整章验收清单

1. 八门课 validate/build 全绿；h2 体检逐页一致；行内花括号 `\lbrace\rbrace`、显示公式一律单行。
2. 四个新渲染器注册进 RENDERERS 且签名守卫齐全；`optimizer-race` 复用 `addAnimationControls`（播放/暂停/重置、离屏暂停、reduced-motion 静态模式）。
3. 每门课至少一个定制 viz + 一个浮窗实验；exercise 初始代码能运行但结果错误，独立解法与 `@check` 逐字一致（重点复核 40 课 lr=0.9 的符号与 80 课对偶值）。
4. 全章统一 λ 符号约定（L=f+λ(g−b) 口径），70/80 两课与 quiz 解释不得互相矛盾。
5. prereqs 无一条指向虚构 id（写作当时的 310/320=现第 44/45 章，均已建成）；grep 复核全部真实存在且排前。
6. 浏览器实测：chord 拖拽扫描、step-size 相图点击发射、race 多优化器同屏、KKT 平衡徽标、Alt+P 浮窗、路由往返无重复注入；360px + dark 无溢出。
7. 报告写入 CONTENT_AUDIT.md，非阻塞项进 AUDIT_REPORTS/OPEN_ITEMS.md；ROADMAP 勾 checkbox。
