# 第 22 章 · ODE 与动力系统 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 12 门正式课已建成（10/15/20/30/40/50/55/60/62/65/70/80）
> 目标：12 门正式课（原「首批 6 门」为写作当时快照，15/55/62/65/70/80 六课系后续批次补入）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 2 / layer L9 / track analysis-change + scientific-computing / stage university-core

## 1. 章定位

微分方程把“现在怎么变”翻译成“将来会去哪”。本章沿一条主线推进：

```text
方向场 → 可分离/线性解法 → 平衡与稳定性 → 相图与线性化 → 振动共振 → 数值解法
```

每课都必须同时给出代数解释和几何轨迹；不能把 ODE 写成公式查表课。

## 2. 前置覆盖

- 第 13 章已建立导数、链式法则和基本函数导数。
- 第 14 章已建立黎曼和与数值积分思想。
- 第 21 章已建立特征值、特征方向和线性映射。

本章不重复推导一元导数；直接把它们用于“未知函数的变化率”。

## 3. 首批组件

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `slope-field` | 拖动初始点，显示方向场和前后轨迹 | 10/20/30/60 |
| `separable-flow` | 改参数和初值，观察解族流动 | 10/20 |
| `equilibrium-probe` | 自治方程的相线、平衡点与稳定性 | 20/30/40 |
| `phase-portrait` | 2×2 线性系统的向量场、特征方向与轨迹 | 40/50 |
| `resonance-lab` | 质量、阻尼、刚度与驱频实时实验 | 50 |
| `ode-solver-race` | Euler、Heun、RK4 的轨迹与误差赛跑 | 60 |

验收：每个 renderer 注册进 `RENDERERS`，有源码签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 六门课题切分

### 10 · 微分方程与方向场（已完成）

- 文件：`10-ode-slope-fields.md`
- 核心概念：ODE 规定切线方向；解是处处顺着方向场的曲线。
- 边界：讲一阶 ODE、初值问题和几何解；不讲存在唯一性证明。
- 组件：`slope-field` + `separable-flow`。
- 判题：由欧拉折线或给定解验证方程。
- 必写误区：方向场不是解；初值不同轨迹不同；导数记号里的 $y$ 是未知函数。

### 20 · 可分离与一阶线性方程（已完成）

- 文件：`20-separable-linear.md`
- 核心概念：可分离方程拆成两边积分；线性方程可用积分因子。
- 边界：讲可分离和一阶线性；不讲二阶解析解通法。
- 组件：`separable-flow` + `slope-field`。
- 判题：验证解或计算一阶线性解在终点的值。
- 必写误区：积分常数不能丢；先除以可能为零的因式要检查；线性不等于图像直线。

### 30 · 平衡点与稳定性（已完成）

- 文件：`30-equilibrium-stability.md`
- 核心概念：自治方程的平衡点满足 $f(y)=0$；扰动回落为稳定。
- 边界：讲一维平衡、吸引/排斥和半稳定；不讲 Lyapunov 函数一般理论。
- 组件：`equilibrium-probe` + `slope-field`。
- 判题：求平衡点并根据符号判断稳定性。
- 必写误区：平衡点不是“没有变化率的位置”这种含糊说法；导数为零的点未必稳定。

### 40 · 相图与线性化（已完成）

- 文件：`40-phase-portraits.md`
- 核心概念：二维系统用相图表示状态演化；Jacobian 特征值决定平衡类型。
- 边界：讲线性系统和平衡点线性化；不讲 Hartman-Grobman 定理证明。
- 组件：`phase-portrait` + `equilibrium-probe`。
- 判题：计算线性系统特征值并分类平衡点。
- 必写误区：相图坐标不是时间；复特征值对应旋转；鞍点有两个排斥/吸引方向。

### 50 · 振动、阻尼与共振（已完成）

- 文件：`50-vibration-resonance.md`
- 核心概念：二阶振动由质量、阻尼、刚度和驱频共同决定。
- 边界：讲阻尼分类、稳态振幅和共振直觉；不讲边界层与奇摄动。
- 组件：`resonance-lab` + `phase-portrait`。
- 判题：计算固有频率、阻尼比或稳态振幅。
- 必写误区：共振不一定是振幅无限大；阻尼不只会“变慢”，还会改变相位。

### 60 · Euler 法与 Runge-Kutta（已完成）

- 文件：`60-euler-runge-kutta.md`
- 核心概念：数值解用局部斜率外推；高阶方法用多个采样点降低误差。
- 边界：讲显式 Euler、Heun 和经典 RK4；不讲自适应步长控制实现。
- 组件：`ode-solver-race` + `slope-field`。
- 判题：手算一步 Euler 或 RK4，比较误差。
- 必写误区：步长减半误差不一定精确减半；数值稳定不等于公式正确。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | ode/slope-fields | calculus/chain | 4 | ordinary-differential-equation, slope-field |
| 18 | ode/separable-linear | ode/slope-fields | 4 | separable-equation, integrating-factor |
| 19 | ode/equilibrium-stability | ode/separable-linear | 4 | equilibrium, stability |
| 20 | ode/phase-portraits | ode/equilibrium-stability, linalg-advanced/eigenvalues | 4 | phase-portrait, linearization |
| 21 | ode/vibration-resonance | ode/phase-portraits | 5 | damped-oscillation, resonance |
| 22 | ode/euler-runge-kutta | ode/vibration-resonance, integrals/riemann | 4 | euler-method, runge-kutta |

首批课不引入第三方库；Python 只用已有循环、函数、列表、`math` 和浮点运算。

## 6. 整章验收

1. 六个 renderer 注册且 validate 可识别。
2. 每课至少两个定制可视化；高难课不得用静态图凑数。
3. 每课一个判题 exercise，初始代码能运行但不通过，独立解法与 `@check` 逐行一致。
4. 每课有 quiz、误区卡、选读或边界说明。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致；浏览器测 exercise/quiz/viz；360px + dark 无溢出。
7. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
