# 第 55 章 · 科学计算与神经算子 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 8 门正式课已建成（10/20/30/40/50/60/70/80）；规划名与落盘名有出入，以磁盘为准
> 目标：8 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 5 / layer L11 / track scientific-computing + information-learning / stage research-elective（index.md 已锁定，章级 difficulty 5；exits 建议 engineering + data-ai）

## 1. 章定位

科学机器学习＝方程约束＋数据驱动＋可微程序。本章沿一条主线推进：

```text
计算图与自动微分 → 把方程变成损失(PINN) → 深度即时间(Neural ODE) → 噪声进入方程(SDE)
→ 反推参数(逆问题) → 决定在哪测量(观测设计) → 函数映射函数(神经算子) → 压缩物理(降阶与多保真)
```

与传统数值的分界（对第 23 章的承诺）：第 23 章负责网格、差分格式与 CFL 稳定性的传统路线（已完成 `pde/from-ode-to-pde` 至 `pde/cfl-stability` 六课）；本章**不再推导任何差分格式**，传统数值只以「对照组」身份出场——每个神经方法都必须回答「和第 23 章的方法比，贵多少、准多少、什么时候才值得」。每课同时给出数学对象（方程/泛函）与学习对象（损失/参数化）；不能写成论文名词罗列课。

## 2. 前置覆盖

真实存在的前置课（已 grep 核实 lesson_id）：

- `multivariable/jacobian-chain`、`calculus/chain`：链式法则是一切自动微分的地基，第 10 课把它升级成「按计算图记账」。
- `ode/euler-runge-kutta`：数值积分语言直接搬进 Neural ODE 与 SDE。
- `pde/heat-equation-1d`、`pde/finite-difference-heat`、`pde/cfl-stability`：PINN 的物理对象与传统数值对照组。
- `linalg-advanced/condition-number`：逆问题病态性的度量。
- `linalg-advanced/svd-low-rank`、`linalg-advanced/pca-compression`：降阶模型的奇异值能量语言。
- `fourier/spectrum`：神经算子谱层的直觉来源。
- `prob/law`、`prob/stats`：噪声统计与大数定律的最低配额。
- `integrals/numeric`：核积分算子的数值落地。

占位骨架处置（**不得写进 prereqs**）——**口径更正**：以下各章现已建成正式课，可按实际 lesson_id 正常串 prereqs；下文保留当时的「自带最小版」策略备查：

- 第 46 章 deep-learning 已建成 → 反向传播最小版仍在第 10 课手搓自带（元组记账版，不用 class）；正文提一句「工程框架版见第 46 章」。
- 第 43 章 optimization 已建成 → 优化器仍只做「沿负梯度走」的定性描述，Adam/动量一律不展开。
- 第 44 章 numerical-analysis 已建成 → 仍不比较浮点舍入行为，误差话题只谈「残差 vs 真误差」。
- 第 66 章 stochastic-analysis 已建成 10 门 → SDE 仍只讲 Euler-Maruyama 直觉版；Itô 引理可注明「严格版见第 66 章」并按需回填 prereq。
- 第 49 章 generative-models 已建成 → diffusion/score 仍只在第 40 课结尾一句展望，不进正文。

## 3. 组件清单

index「计划交互形态」→ 组件映射：微分方程残差热力图→`pinn-residual-map`；Neural ODE 轨迹回流→`neural-ode-flow`；逆问题观测稀疏实验→`inverse-misfit`；低秩降阶模式选择器→本期用 `svd-stretch`+`pca-projection`+浮窗 scree 实验顶替，`rom-mode-picker` 登记 BACKLOG（新增预算已满 5）。

| renderer | 核心交互 | 服务课 | 状态 |
| --- | --- | --- | --- |
| `ad-graph-flow` | 计算图正向填值/反向梯度双色流动 | 10 | 新增 |
| `jacobian-grid` | 改输入看多元链式记账 | 10 | 现有 |
| `pinn-residual-map` | 试函数曲线+配点残差热力图 | 20/50 | 新增 |
| `least-squares-fit` | 纯数据拟合基线（无物理对照） | 20 | 现有 |
| `fd-heat-stencil` | 差分格式对照组 | 20 | 现有 |
| `heat1d-lab` | 热方程真解参照 | 20 | 现有 |
| `contour-map` | 参数空间损失地形 | 20/50 | 现有 |
| `neural-ode-flow` | 离散深度阶梯 vs 连续流+伴随回流 | 30 | 新增 |
| `ode-solver-race` | Euler/RK 误差赛跑 | 30 | 现有 |
| `slope-field` | 向量场背景板 | 30/40 | 现有 |
| `sde-paths` | 样本路径束与均值±std 包络 | 40 | 新增 |
| `inverse-misfit` | 拖观测数据看 misfit 谷形状 | 50/60 | 新增 |
| `condition-number` | 观测算子病态放大 | 50 | 现有 |
| `plot` | misfit/敏感度/收敛曲线 | 50/60/80 | 现有 |
| `spectrum` | 频率分量截断＝算子的谱层 | 70 | 现有 |
| `svd-stretch` | 快照奇异值能量谱 | 80 | 现有 |
| `pca-projection` | 快照云主模态投影 | 80 | 现有 |

新增组件规格（kebab-case type，注册进 `viz.js` RENDERERS，带 dataset 守卫，亮暗主题可读）：

### ad-graph-flow

```viz
{ "type": "ad-graph-flow", "title": "一个表达式的正反向",
  "expr": "y = x*x + 3*x", "xValue": 2 }
```

- spec 字段：`expr`（展示字符串）、`xValue`（滑块）。
- 画布：表达式 DAG（节点圆圈+边）；正向蓝色数值按拓扑序填充，反向红色梯度自输出端回流；每节点两行读数 value / grad。
- 交互：拖 `xValue` 滑块全体读数即时更新；按钮「单步正向」「单步反向」「播放」。
- 动画：节点逐个点亮；回流时边上有方向流动感。
- 服务课：10（主）。

### pinn-residual-map

```viz
{ "type": "pinn-residual-map", "title": "残差在哪里大",
  "trial": "a*x*(1-x)", "equation": "-u'' = 1",
  "sliders": [ { "name": "a", "min": -1, "max": 1, "step": 0.05, "value": 0.2 } ],
  "points": 24 }
```

- spec 字段：`trial`（试函数表达式）、`equation`（展示字符串）、`sliders`（参数）、`points`（配点数）。
- 画布：上方试函数 u(x) 曲线；下方区间内配点散点，颜色编码逐点残差绝对值（绿小红大）+右侧色标。
- 交互：滑块调参数；悬停配点文本读出该点残差；按钮「加密配点」。
- 动画：参数变化时颜色平滑过渡（<200ms）。验收点：a=0.5 时全图变绿。
- 服务课：20（主）、50。

### neural-ode-flow

```viz
{ "type": "neural-ode-flow", "title": "深度即时间",
  "field": "dz/dt = -z", "layers": 5, "x0": 1.0 }
```

- spec 字段：`field`（展示字符串，内部用预设右端函数表驱动）、`layers`（滑块 1–50）、`x0`（初值滑块）。
- 画布：横轴为深度 z 同时标注时间 t；向量场箭头＋离散步阶梯折线 vs 连续解曲线；开启伴随时反向虚线箭头沿轨迹回流。
- 交互：滑块调层数看阶梯逼近连续曲线；开关「显示伴随反向」；按钮「走一层」单步。
- 动画：回流虚线定向流动；层数变化时阶梯重排。
- 服务课：30（主）。

### sde-paths

```viz
{ "type": "sde-paths", "title": "噪声如何改变轨迹",
  "drift": -1.0, "diffusion": 0.2, "paths": 12, "seed": 420 }
```

- spec 字段：`drift`、`diffusion`（滑块）、`paths`（路径数滑块）、`seed`。
- 画布：多条半透明样本路径＋确定性 ODE 解粗线＋均值±std 扇形包络。
- 交互：滑块调漂移/扩散/路径数；「换一批」（seed+1）；扩散拉到 0 时路径收拢到 ODE 线（确定性极限哨兵）。
- 动画：路径逐步向右生长。
- 服务课：40（主）。

### inverse-misfit

```viz
{ "type": "inverse-misfit", "title": "数据能钉住参数吗",
  "model": "u(t)=exp(-k*t)", "trueK": 0.5, "obsTimes": [1, 2], "noise": 0.0 }
```

- spec 字段：`model`（预设模型名）、`trueK`（真值虚线标注）、`obsTimes`（观测时刻数组）、`noise`（噪声滑块）。
- 画布：左侧观测数据点（可纵向拖动＝改观测值）；右侧 misfit(k) 曲线随拖动实时重画，标注最优 k 与谷底曲率读数。
- 交互：按钮「1/2/4 个观测」切换对比；拖数据点；噪声滑块看谷底漂移与变平。
- 动画：无，即时重绘。验收点：单观测时谷底平缓（多解），四观测时尖锐。
- 服务课：50（主）、60。

## 4. 八门课题切分

### 10 · 自动微分与计算图

- 文件：`10-ad-graphs.md`
- 核心概念：公式展开成计算图；正向模式沿图记值、反向模式沿图收梯度；链式法则＝局部导数沿边相乘（`multivariable/jacobian-chain` 的图版升级）。
- 边界：讲元组手工实现的正/反向模式与两种模式的成本权衡；不讲 class 封装、张量广播与框架 API（第 46 章）。
- 组件：`ad-graph-flow`（新）+ `jacobian-grid`（现有）。
- 判题 exercise：用 (值, 导数) 元组对实现 f(x)=x³+2x 的正向模式求 f(2) 与 f'(2)。初始代码乘积法则漏掉第二项（输出 `12` / `4`）；正确解 `print(fval)` → `12`、`print(fder)` → `14`。@check 两行：`12` / `14`。
- 必写误区：你以为自动微分是数值差分，其实它是精确的链式法则记账，没有截断误差；反向传播不是神经网络专利，只是反向模式的调度策略；前向模式一次只算一个输入方向，多维输入成本会爆炸。

### 20 · 物理信息神经网络（PINN）

- 文件：`20-pinn-residual-loss.md`
- 核心概念：把 PDE 改写成残差 R=0，损失＝数据项＋λ·配点残差项；试函数用硬约束先吃掉边界条件（u=a·x·(1−x) 天然满足两端为零）；训练＝让残差全域变小。
- 边界：讲残差泛函、配点、硬/软约束之别与一维泊松例子；不讲网络架构与自适应采样；与第 23 章（PDE 差分数值解）的分界照 §1 执行——差分逐格有稳定保证，PINN 无网格但只有软保证，两条误差账并列展示。
- 组件：`pinn-residual-map`（新）+ `fd-heat-stencil` + `heat1d-lab` + `least-squares-fit`（均现有）。
- 判题 exercise：试函数 u=a·x·(1−x) 解 −u″=1，在 xs=[0.25, 0.5, 0.75] 上扫 a∈[0.25, 0.5, 0.75]，打印最优 a 与最大绝对残差。初始代码曲率符号写反（输出 `0.25` / `1.5`）；正确输出 `0.5` / `0.0`（R=−u″−1=2a−1，解析解 a=1/2 即 u=x(1−x)/2）。@check 两行：`0.5` / `0.0`。
- 必写误区：你以为 PINN「学会了方程」，其实只是把残差压到配点上很小，点之间无人担保；边界条件不硬约束时，软约束权重失衡会让解整体跑偏；残差小≠解准，必须跟真解误差对照（本课用 heat1d-lab）。

### 30 · Neural ODE 与连续深度

- 文件：`30-neural-ode.md`
- 核心概念：残差块堆叠 z(k+1)=z(k)+f(z(k)) 就是欧拉法的离散步；层数↔步长、深度↔时间；连续极限下反向传播换成沿时间的伴随回流（倒放录像）。
- 边界：讲离散→连续视角转换、伴随法直觉与固定小网络的深度实验；不讲伴随方程推导与内存论证的严格版（选读折叠块给三句话版）。
- 组件：`neural-ode-flow`（新）+ `ode-solver-race` + `slope-field`（均现有）。
- 判题 exercise：dz/dt=−z、z(0)=1，分别用 N=2 与 N=100 步欧拉积分到 t=1 并 round 三位。初始代码漏乘右端函数（线性衰减，输出 `0.0` / `0.0`）；正确输出 `0.25` / `0.366`（精确解 e⁻¹≈0.368）。@check 两行：`0.25` / `0.366`。
- 必写误区：层数越多不一定越好——相当于步长更细，收益递减而成本照涨；Neural ODE 不取代数值求解器，内部仍靠求解器积分，只是把「学什么」换成「场长什么样」；连续深度不是无限深的免费午餐。

### 40 · 随机微分方程与噪声

- 文件：`40-sde-noise.md`
- 核心概念：dX=f(X)dt+g(X)dW＝确定性漂流＋随机踢脚；布朗运动增量方差正比于步长；Euler-Maruyama＝欧拉法多加 g·√h·标准正态项。
- 边界：讲常数扩散一维例子（OU 过程）、√h 缩放来历与路径束统计；不讲 Itô 引理与 Fokker-Planck（正文注明「严格版见第 66 章」）；生成模型联系只留一句展望。
- 组件：`sde-paths`（新）+ `slope-field`（现有）。
- 判题 exercise：dX=−Xdt+0.1dW、X(0)=1、h=0.01、T=1、固定 seed 跑 20000 条路径，打印终点 std（round 两位）、终点均值（round 两位）、分类 0.05<std<0.08。初始代码忘乘 √h（噪声放大十倍：std 跳到 ≈0.66 量级、均值仍 ≈0.37、分类 False）；正确输出 `0.07` / `0.37` / `True`（理论 std=√(σ²(1−e⁻²)/2)≈0.066，EM 离散均值 0.99¹⁰⁰≈0.366，均在舍入安全区，与具体 seed 无关）。@check 三行：`0.07` / `0.37` / `True`。
- 必写误区：噪声项不是「加个随机数」，必须带 √h——否则噪声强度随步长漂移；单条路径不代表系统，SDE 的预言是分布级的；确定性极限 g=0 应退回 ODE 解——这是检验实现的第一道哨兵。

### 50 · 逆问题与正则化

- 文件：`50-inverse-regularization.md`
- 核心概念：正问题=参数→数据，逆问题=数据→参数；观测少或有噪时 misfit 谷底又平又斜（病态），Tikhonov 正则项＝给参数上一道「别太怪」的软栏杆（`linalg-advanced/condition-number` 的动态版）。
- 边界：讲一维衰减率反演、敏感度放大账与 L2 正则直觉；不讲贝叶斯后验采样与稀疏正则完整理论（第 39 章，L1 一句带过）。
- 组件：`inverse-misfit`（新）+ `condition-number` + `contour-map` + `plot`（均现有）。
- 判题 exercise：真值 k=0.5 给出 u₁=e⁻ᵏ、u₂=e⁻²ᵏ，用比值式 k=ln(u₁/u₂) 反演；再把 u₂ 加 0.01 重算。初始代码比值颠倒（输出 `-0.5` / `-0.473`）；正确输出 `0.5` / `0.473`（δu₂=0.01 被 1/u₂≈2.7 倍放大成 Δk≈0.027）。@check 两行：`0.5` / `0.473`。
- 必写误区：数据多不等于解得出——方向不对的信息只会重复放大同一个盲区；正则不是作弊，是把物理先验明码标价写进目标函数；残差最小≠参数正确，病态问题里一片参数共享同一个小残差。

### 60 · 参数辨识与观测设计

- 文件：`60-parameter-identification.md`
- 核心概念：可辨识性=数据能否唯一钉住参数；敏感度 s(t)=∂u/∂k 指出哪个时刻的观测最有含金量（衰减方程峰值在 t*=1/k）；观测设计＝把有限测量预算花在敏感度峰上。
- 边界：讲单参数敏感度分析与采样时刻选择；不讲 Fisher 信息矩阵与最优实验设计一般理论（一句展望即可）。
- 组件：`inverse-misfit`（新，复用）+ `plot`（现有）。
- 判题 exercise：k=0.5 时对 t∈[0.5, 1, 2, 5, 10] 计算 |s(t)|=t·e^(−kt)，打印最优时刻与该处敏感度（round 三位）。初始代码错拿观测值 u(t) 当敏感度（单调递减，输出 `0.5` / `0.779`）；正确输出 `2` / `0.736`（峰值 t*=1/k=2）。@check 两行：`2` / `0.736`。
- 必写误区：信号最强的时刻未必最值得测——要测的是「参数变化时信号变多少」；重复测量同一敏感度方向是预算浪费；不可辨识的参数组合加再多数据也救不了，要先改观测量而不是改算法。

### 70 · 神经算子

- 文件：`70-neural-operators.md`
- 核心概念：PINN 学一个解，神经算子学「方程族→解函数」的映射本身；实现抓手是把网络层写成核积分算子（对输入函数加权平均再非线性）；谱视角＝在有限频率分量上做线性变换（`fourier/spectrum` 的语言）。
- 边界：讲函数到函数映射直觉、「参数不随网格数变」的网格无关主张与谱层思想；不讲 FNO 张量实现与收敛理论。注意措辞：网格无关说的是参数量不变，不是精度不变。
- 组件：`spectrum` + `plot`（均现有）+ 浮窗「同一函数的两种表示」实验。
- 判题 exercise：函数 y² 用系数表示（3 个数）与网格采样表示；对 n=2 面板 Simpson 与 n=100 复合 Simpson 在 [0,1] 积分。打印 len(coeffs)、round(I_fine,3)、|I_coarse−I_fine|<1e-6 布尔。初始代码粗分辨率误用梯形（输出 `3` / `0.333` / `False`）；正确输出 `3` / `0.333` / `True`（Simpson 对二次多项式精确，任何合法分辨率都给出同一个 1/3——「表示不依赖分辨率」的可计算版）。@check 三行：`3` / `0.333` / `True`。
- 必写误区：神经算子不是在所有分辨率下同样准——只是同一套参数可用于不同网格，误差仍随网格变化；它不取代 PINN，两者学的对象维度不同（点求值 vs 整族映射）；核积分不是普通矩阵乘法——权重来自可学习核函数且随输入变化。

### 80 · 降阶模型与多保真

- 文件：`80-reduced-order-fidelity.md`
- 核心概念：大量解快照往往活在低维子空间里（POD＝SVD 的能量语言，`linalg-advanced/svd-low-rank` 直接接管）；保真层级＝贵而准的仿真×快而糙的代理，用少量高保真样本校正低保真输出。
- 边界：讲快照矩阵、模态截断能量占比与「校正式」思想；不讲 Galerkin 投影完整流程与误差界。
- 组件：`svd-stretch` + `pca-projection`（均现有）+ 浮窗 scree/重构实验。
- 判题 exercise：三条二维快照 [1,2]、[2,4]、[1,2] 组成快照集；用行列式判独立行得秩；把全部能量投到主方向 u=(1,2)/√5 上算捕获百分比（round 一位）。初始代码按条数平均能量（输出 `3` / `33.3`）；正确输出 `1` / `100.0`（三条共线，秩 1，能量全捕获）。@check 两行：`1` / `100.0`。
- 必写误区：快照越多模态不一定越多——秩只由真正不同的形态决定；降阶不是万能压缩，超出训练形态的新解会灾难性失真（外推陷阱）；低保真模型不是废料，它的趋势正是校正项要利用的对象。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | scientific-ml/ad-graphs | multivariable/jacobian-chain, calculus/chain | 4 | computational-graph, automatic-differentiation |
| 18 | scientific-ml/pinn-residual-loss | scientific-ml/ad-graphs, pde/heat-equation-1d, linalg-advanced/least-squares | 5 | pinn, collocation-points, physics-residual, hard-constraint |
| 19 | scientific-ml/neural-ode | scientific-ml/pinn-residual-loss, ode/euler-runge-kutta | 5 | neural-ode, continuous-depth, adjoint-state |
| 20 | scientific-ml/sde-noise | scientific-ml/neural-ode, prob/law | 5 | stochastic-differential-equation, brownian-motion, euler-maruyama |
| 21 | scientific-ml/inverse-regularization | scientific-ml/pinn-residual-loss, linalg-advanced/condition-number | 4 | inverse-problem, ill-posedness, tikhonov-regularization |
| 22 | scientific-ml/parameter-identification | scientific-ml/inverse-regularization | 4 | identifiability, sensitivity-analysis, observation-design |
| 23 | scientific-ml/neural-operators | scientific-ml/pinn-residual-loss, fourier/spectrum, linalg-advanced/svd-low-rank | 5 | neural-operator, kernel-integral-operator, discretization-invariance |
| 24 | scientific-ml/reduced-order-fidelity | linalg-advanced/svd-low-rank, linalg-advanced/pca-compression, scientific-ml/neural-operators | 4 | pod, reduced-order-model, multi-fidelity |

补充约定：

- 所有 prereqs 已 grep 核实存在且排在本课之前（multivariable/*=第 20 章、calculus/chain=13 章、pde/*=第 23 章、ode/*=第 22 章、linalg-advanced/*=第 21 章、fourier/spectrum=16 章、prob/law=09 章）。
- 工具登记口径：math.exp/log/sqrt/pi、random、statistics、matplotlib 均已出生（python-tools/matplotlib、prob/stats 等），无需重复登记；**禁 numpy/scipy/torch**——矩阵运算与求导全部手写循环+元组实现；全章避免 class 语法（元组与字典足够）。正文首次出现的任何语法当场中文注释并如实登记 introduces_*。
- 单课 layer 建议：40 课可在 applications 登记 physics-simulation；track 全章保持 index 锁定的两项不动。
- 禁 input()/while True；随机实验一律固定 seed 并在文中说明可复现性。

## 6. 整章验收清单

1. 五个新 renderer（ad-graph-flow / pinn-residual-map / neural-ode-flow / sde-paths / inverse-misfit）注册进 RENDERERS，validate 可识别，亮暗主题可读，各至少一门课真实消费。
2. 每课至少两个可视化（viz 组件或 matplotlib 实验），高难课不得静态文字凑数；每课与传统数值或解析解有一处对照。
3. 每课一个判题 exercise：初始代码能运行但不通过；独立正确解法与 @check 逐行一致（生产时须实测核验本文件给出的目标输出）。
4. 每课有 quiz、2–3 张误区卡、选读或边界说明；占位章引用按磁盘现状核实（绝大多数相关章现已建成），prereqs 只引真实存在且排前的 lesson_id。
5. MDX 双坑体检：花括号用 \lbrace\rbrace；显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测三类交互块 + Alt+P 浮窗 + 路由切换无重复注入；360px + dark 无溢出。
7. 结论合并进 CONTENT_AUDIT.md；非阻塞项（如 rom-mode-picker）登记 AUDIT_REPORTS/OPEN_ITEMS.md。
