# 第 23 章 · 偏微分方程入门生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：10–140 共十七门正式课已全部建成齐线（90–140 六门已于本轮回填，六个专属渲染器 separation-mode / eigen-boundary / fourier-pde-synth / laplace-relax / heat2d-paint / pde-classifier 已注册）。
> 写法：`LESSON_TEMPLATE.md` 九段式  
> 元数据基线：volume 2 / layer L9 / track analysis-change + scientific-computing / stage university-core

## 1. 已完成课程与组件

| 课程 | 核心概念 | 专属交互 |
| --- | --- | --- |
| `10-from-ode-to-pde.md` | PDE 记号、时空切片、行波方程 | `pde-probe` |
| `20-flux-conservation.md` | 通量、积分/微分守恒、源汇 | `flux-box` |
| `30-initial-boundary-data.md` | 初值、Dirichlet / Neumann / 周期边界 | `boundary-lab` |
| `40-heat-equation-1d.md` | 扩散、弯曲度与峰值衰减 | `heat1d-lab` |
| `50-finite-difference-heat.md` | 三点模板、显式格式、`r <= 1/2` | `fd-heat-stencil` |
| `55-cfl-stability.md` | CFL 数、迎风格式、放大因子 | `stability-plane` |

每门课都有九段式叙事、两个 viz 实验、一个浮窗 Python 实验、判题练习、quiz、误区卡和选读内容。六个渲染器共用 `addAnimationControls`，支持播放/暂停/重置、离屏暂停和 `prefers-reduced-motion` 静态模式。

## 2. 校验证据

- 全站口径以 `node scripts/validate.mjs` 与 `node scripts/gen-graph.mjs` 最近一次输出为准（勿写死数字快照）。
- 六门新课源文件 `^##` 总数 60，构建产物 `<h2>` 总数 60；逐课均为源码和产物各 10 个。
- 显示公式单行，无字面 `\{` / `\}`；quiz 无 KaTeX。
- 对抗审查修正了第 10 课余弦值、第 40 课差分输出，并补齐多个折叠详解的独立运行变量。
- Playwright 冒烟通过：每页两个 canvas 非空白，拖拽会改变画面，路由往返无重复注入，`Alt+P` 浮窗开关正常。
- 已覆盖桌面 1100×850 与明暗主题变量复用；尚未做完整窄屏视觉回归。

## 3. Python 与 API 登记

本批不引入 numpy，所有实验保持零等待、可运行，并复用既有受管工具：

| 课程 | 实验要点 |
| --- | --- |
| 10 | 中心差分验证 `u_t+u_x`，复用 `math.sin` |
| 18 | 边界通量与净变化记账 |
| 19 | 三种离散端点规则，复用 `sum` |
| 20 | 三点曲率和热方程变化率 |
| 21 | 显式热格式一层更新 |
| 55 | 扫描放大因子最大值，复用三角函数和 `math.sqrt` |

## 4. 待产队列

| 编号 | 课程 | 组件 |
| --- | --- | --- |
| 22 | 对流方程与特征线 | `advection-characteristics` |
| 23 | 波动方程 | `wave1d-lab` |
| 24 | 达朗贝尔解 | `dalembert-split` |
| 25 | 分离变量 | `separation-mode` |
| 26 | 特征函数与边界 | `eigen-boundary` |
| 27 | Fourier 合成 PDE 解 | `fourier-pde-synth` |
| 28 | Laplace 与 Poisson | `laplace-relax` |
| 29 | 二维热扩散项目 | `heat2d-paint` |
| 30 | 分类与方法地图 | `pde-classifier` |

下一步按 ROADMAP 口径推进 90–140 六门：`separation-mode` → `eigen-boundary` → `fourier-pde-synth` → `laplace-relax` → `heat2d-paint` → `pde-classifier`；六个组件目前均未实现。
