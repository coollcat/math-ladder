# 第 20 章 · 多元微积分 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（10/15/20/30/40/50/55/60/62/65）
> 目标：10 门正式课（原「首批 6 门」为写作当时快照，15/55/62/65 四课系后续批次补入）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 2 / layer L7 / track analysis-change + optimization-control / stage university-core

## 1. 章定位

本章把一元微积分的“斜率、链式法则、曲率、面积”升级为高维对象：

```text
等高线 → 偏导与梯度 → Jacobian → Hessian → 二重积分 → 路径积分与 Green 定理
```

每课都要回答同一个问题：一元图像里的某个熟悉形状，进入二维后变成了什么？不能把多元微积分写成公式清单。

## 2. 前置覆盖

- 第 13 章 `calculus/rules`、`calculus/chain` 已给出一元求导和链式法则。
- 第 14 章 `integrals/riemann` 已建立分割、取样、求和、极限。
- 第 21 章 `linalg-advanced/linear-maps`、`eigenvalues`、`positive-definite` 已给出矩阵、特征方向和正定性。

新课不重复推导一元法则，只做高维升级。

## 3. 首批组件

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `contour-map` | 拖动点，显示函数值、等高线带与局部高度 | 10/20 |
| `gradient-probe` | 拖点和方向，数值偏导、梯度箭头与方向导数 | 20 |
| `jacobian-grid` | 拖动源点，显示映射网格变形和 Jacobian 矩阵 | 30 |
| `hessian-curvature` | 改二次曲面系数，显示 Hessian、特征方向和分类 | 40 |
| `riemann2d` | 调整网格，用小柱体逼近矩形上的体积 | 50 |
| `green-theorem` | 调整闭路径，显示向量场、环流与通量 | 60 |
| `path-integral` | 调整路径，数值计算力场做的功 | 60 |

验收：每个 renderer 注册进 `RENDERERS`，有源码签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 六门课题切分

### 10 · 多元函数与等高线（已完成）

- 文件：`10-multivariable-functions.md`
- 核心概念：二元函数的图像是曲面，等高线是曲面的地图。
- 边界：讲定义域、等高线和高度切片；不讲拓扑流形。
- 组件：`contour-map` + `gradient-probe`。
- 判题：计算给定点的函数值并判断两点是否同高。
- 必写误区：等高线密集不代表函数值大，而代表变化快；地图不是曲面本身。

### 20 · 偏导数与梯度（已完成）

- 文件：`20-partial-gradient.md`
- 核心概念：偏导固定其他变量；梯度指向最陡上升方向。
- 边界：讲一阶偏导、梯度和方向导数；不讲 Frechet 导数证明。
- 组件：`gradient-probe` + `contour-map`。
- 判题：由公式计算偏导和梯度。
- 必写误区：偏导不是“另一个导数”；梯度垂直于等高线；方向导数要单位化方向。

### 30 · Jacobian 与多元链式法则（已完成）

- 文件：`30-jacobian-chain.md`
- 核心概念：Jacobian 是一阶线性放大器的矩阵。
- 边界：讲 2→2 映射、偏导矩阵和行列式；不讲反函数定理完整证明。
- 组件：`jacobian-grid` + `linear-map`。
- 判题：计算 Jacobian、行列式和某点的局部放大率。
- 必写误区：Jacobian 不是数；面积放大率是绝对值；链式法则是矩阵乘法。

### 40 · Hessian 与局部形状（已完成）

- 文件：`40-hessian-shape.md`
- 核心概念：Hessian 用二阶偏导描述局部碗状、鞍状或圆柱状。
- 边界：讲二阶对称矩阵、判别式和特征方向；不讲 Taylor 余项估计。
- 组件：`hessian-curvature` + `quadratic-form`。
- 判题：计算 Hessian、行列式并分类临界点。
- 必写误区：Hessian 是矩阵；临界点不只极大极小；正定对应局部谷底。

### 50 · 二重积分与 Fubini 直觉（已完成）

- 文件：`50-double-integrals.md`
- 核心概念：二重积分把区域切成小面积，乘高度后求和。
- 边界：讲矩形上的二重黎曼和与累次积分；不讲一般测度论。
- 组件：`riemann2d` + 已有 `riemann`。
- 判题：计算矩形上的二重黎曼和或简单累次积分。
- 必写误区：先 x 后 y 通常都能算，但不代表积分永远可交换；高度可为负。

### 60 · 路径积分与 Green 定理（已完成）

- 文件：`60-green-path-integrals.md`
- 核心概念：路径积分累加力场做的功；闭路径环流可与内部旋度联系。
- 边界：讲数值路径积分、简单闭曲线和 Green 定理直觉；不讲微分形式。
- 组件：`path-integral` + `green-theorem`。
- 判题：计算给定路径上的功或环流。
- 必写误区：路径方向改变符号；Green 定理要求闭路径和合适方向；不是所有向量场都是保守场。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | multivariable/level-sets | calculus/chain, linalg/matrix | 4 | multivariable-function, level-set |
| 18 | multivariable/partial-gradient | multivariable/level-sets | 4 | partial-derivative, gradient |
| 19 | multivariable/jacobian-chain | multivariable/partial-gradient | 4 | jacobian |
| 20 | multivariable/hessian-shape | multivariable/jacobian-chain | 4 | hessian |
| 21 | multivariable/double-integrals | multivariable/hessian-shape, integrals/riemann | 4 | double-integral |
| 22 | multivariable/green-path-integrals | multivariable/double-integrals | 5 | path-integral, circulation |

首批课不引入第三方库；Python 只用已有循环、函数、列表和浮点运算。若确需 `zip`、`enumerate`、`abs` 等，先在正文给出生证明并按规范登记。

## 6. 整章验收

1. 七个 renderer 注册且 validate 可识别。
2. 每课至少两个定制可视化；高难课不得用静态图凑数。
3. 每课一个判题 exercise，初始代码能运行但不通过，独立解法与 `@check` 逐行一致。
4. 每课有 quiz、误区卡、选读或边界说明。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致；浏览器测 exercise/quiz/viz；360px + dark 无溢出。
7. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
