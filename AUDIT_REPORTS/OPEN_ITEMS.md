# OPEN_ITEMS · 未结项与待改善清单

> 整合日期：2026-08-28 · 整合范围：`AUDIT_REPORTS/OPEN_ITEMS.md` × `UNIT_GUIDES/`（35 份）× `VISION.md`
> 本文件是**唯一活口清单**。全站历史审计报告（217 份）已闭环归档删除；已修复项一律不留存。
> 裁决顺序：`AGENTS.md → VISION.md → ROADMAP.md → LESSON_TEMPLATE.md → UNIT_GUIDES/*`。冲突时按此顺序，不得反向。
> 清理时逐条复核，处理完即删除该行。

---

## 零、整合结论（先看这里）

### 0.1 三份文档的真实关系

| 来源 | 性质 | 能否作为进度依据 |
| --- | --- | --- |
| `VISION.md` | 长期路线总纲（十一层 × 八支线 × 五卷编号总表 × 开发波次） | ✅ 编号与定位的唯一权威 |
| `ROADMAP.md` | 进度台账，与磁盘基线同步 | ✅ 唯一进度事实来源 |
| `UNIT_GUIDES/*.md` | **历史批次的生产指导档案**（组件规格 + 课边界 + 验收清单） | ❌ 状态行普遍滞后于磁盘 |

**核心结论**：三者的「未完成项」并不冲突，而是**层级不同**——`UNIT_GUIDES` 里成片的"待产/未开工"绝大多数是**写作当时的快照**，课程早已落盘。曾经唯一的真缺口（23 章 PDE 后六门）已于 2026-08-28 回填清零；另补齐 51 章零和 minimax、63 章方法地图与 64 章四个缺口号位，全站 862 门闭环全绿。`UNIT_GUIDES` 保留价值在于**组件规格与课边界约定**，不在进度。

### 0.2 UNIT_GUIDES 与磁盘基线的偏差（三类）

| 偏差类型 | 表现 | 处置 |
| --- | --- | --- |
| **A. 状态行滞后**（普遍） | 声明"全部未写/待产"，实际课程已建成。典型：43 optimization「八门课全部未写」实际已建成；54 trustworthy-ai「8 门全部待产」实际已建成；270(41) learning-theory「九门全部未写」实际已建成；25/28/30「未开工」实际已建成 | ✅ 已按 D1(a) 为 35 份全部加档案头注 |
| **B. 硬冲突**（仅 1 处，P0） | `23-pde-intro.md`：状态行写「10–55 六门已完成，60 号及之后九门待产」，待产表列编号 `22–30`（对流/波动/达朗贝尔/…）；磁盘实际是 60/65/70/75/78 已交付、待写的是 `90/100/110/120/130/140` 六门 | ✅ 已随 PDE 后六门回填一并订正 |
| **C. 覆盖窄于实际** | 19/20/21/22 只登记"首批六课"，后续批次从未回写指导 | 低优先级，随触随修 |

### 0.3 本次整合暴露的文档一致性缺陷（汇总）

| # | 缺陷 | 规模 | 等级 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | 编号双轨：UNIT_GUIDES 仍用旧号段（130/160/220/…/490），与 VISION §4 的 18–67 连续章号冲突 | 10+ 处 | P1 | ✅ 已订正（2026-08-28 两轮扫描清零，含「第 N 章」与裸「NNN 章」两种形式；§2.1 映射表已补全留作查阅） |
| 2 | 失效引用 `AUDIT_REPORTS/BACKLOG.md`（该文件已不存在，活口只有 OPEN_ITEMS.md） | 32 处 | P2 | 已批量改为 `OPEN_ITEMS.md` |
| 3 | 文件名 `270-learning-theory.md` 与内容标题「第 41 章」不符 | 1 处 | P2 | 已重命名为 `41-learning-theory.md` |
| 4 | 过期的「占位章」判定：多处写「第 45 章 ml-math 占位 → 不得引用」「第 43 章 optimization 占位」，但这些章早已建成正式课 | 6+ 处 | P1 | ✅ 已订正（2026-08-28 逐处重写为「已建成 + 保留自带最小版策略」；45 章 85 课经核实维持自担，无需回填 prereqs） |
| 5 | 写死数字快照：`23-pde-intro.md`「202 个 Markdown / 145 门正式课」、`31-automata.md` 同口径，违反 AGENTS.md「勿写死数字」纪律 | 2 处 | P2 | ✅ 已订正（23 章随 PDE 回填改动态口径；31 章同口径句 2026-08-28 订正） |
| 6 | `44-numerical-analysis.md` 的 numpy 出生地决策挂起，明确标注「留给主线程」 | 1 处 | P1 | ✅ 已裁决选 (b)：44 章维持纯手写循环，numpy 出生地留在 53 章（课文仅 70 课选读提及 `numpy.linalg.qr` 一句，无 import、无登记，与决策自洽） |

---

## 二、文档一致性缺陷（P1 · 逐处清单）

### 2.1 编号双轨映射表（旧号段 → 现章号）

依据 `VISION.md` §4「2026-08-26 卷二至卷五主表集中重排」。卷三映射经自洽校验（110→27、130→29、160→32、190→35 线性步长 10）。

| 旧号 | 现章 | 章节 | | 旧号 | 现章 | 章节 |
| --- | ---: | --- | --- | ---: | --- | --- |
| 110 | 27 | 逻辑与集合 | | 320 | 45 | 机器学习数学 |
| 130 | 29 | 图论 | | 330 | 46 | 深度学习 |
| 160 | 32 | 可计算性与复杂度 | | 340 | 47 | Transformer 数学 |
| 190 | 35 | 编码理论 | | 360 | 49 | 生成模型 |
| 220 | 36 | 概率进阶 | | 370 | 50 | 强化学习 |
| 230 | 37 | 随机过程 | | 390 | 52 | 控制理论 |
| 240 | 38 | 统计推断 | | 400 | 53 | 图与网络 |
| 250 | 39 | 贝叶斯统计 | | 450 | 58 | 拓扑与数据几何 |
| 260 | 40 | 信息论 | | 460 | 66 | 随机分析 |
| 270 | 41 | 学习理论 | | 490 | 60 | 工程控制论与系统工程 |
| 280 | 42 | 因果推断 | | | | |
| 300 | 43 | 优化 | | 310 | 44 | 数值分析 |

> 注：部分指导中的「NNN/NN」连写（如 `math.log2`（190/75）、130/115）是**旧章号/课号**缩写——`190/75` = 第 35 章 75 号课（entropy-redundancy），`130/115` = 第 29 章 115 号课（random-walk-preview），已就地改写为新章号/课号表述。

### 2.2 待修正位置清单

✅ 已全部订正（2026-08-28 两轮）：首轮订正 12 处清单项（9 处先前批次已修 + 3 处真缺口）；对抗审查复扫发现「NNN 章」裸形式漏网 20 余处（37/30/62/40/36/38/41/43/48/42 等章指导），已按 §2.1 完整映射表逐处订正。终扫「第 N 章」与裸形式均归零（历史引语与自解释映射注除外；验收指令行的旧号以「写作当时快照」注记保留）。

### 2.3 过期的「占位章」判定（影响 prereqs 串线，优先于编号修正）

✅ 已全部订正（2026-08-28）：56/55/51 三份指导的「占位」条目改写为「已建成 + 保留自带最小版策略」；45 章的 prereqs 悬置经核实 38 章不含指标课后裁决维持自担。

---

## 四、章节卫生（单点，随触随修）

✅ 已清零：`16-fourier/50-transform` 动手解已升级为「正反双向换算」判题练习（2026-08-28）。

## 五、知识树与图谱

- 工具使用但诞生课不在先修链的 **214 处血缘缺口**：已决定暂不批量补 prereq；若后续做「跨链血缘虚线」再重新评估高价值单修。
- 知识图谱终点课缺「终点」视觉徽标，method-map / 选读 / 纯练习课易被误读为漏连。
- ★★☆ 及以下跨章断桥继续排队：先逐条核实课程语义，再小批量补前置；不在一轮里集中改编号或整章结构。

## 五·五、COMPONENT_SPEC 体系（章内未来组件规格 · 第四类未完成项）

> 2026-08-28 审核新发现。此类项此前散落在 11 个章目录内，从未进入任何台账。

11 个章各有一份 `COMPONENT_SPEC.md`，登记**尚未实现的专属组件设计稿**。共约 **70 个待实现组件**：

| 章 | 登记组件 | 章 | 登记组件 |
| --- | --- | --- | --- |
| 24 复分析 | `domain-coloring`、`conformal-grid`、`contour-path`、`residue-probe`、`pole-zero-plane`、`laplace-s-plane` | 33 代数结构 | `operation-table`*、`group-explorer`、`cyclic-generator`*、`isomorphism-map`、`polynomial-ring-lab`、`homomorphism-kernel-map`、`finite-field-inverse-grid`* |
| 26 泛函分析 | `norm-unit-balls`、`operator-action`、`dual-probe`、`adjoint-map`、`spectrum-map`、`weak-strong-convergence` | 35 编码理论 | `noisy-channel`、`parity-checker`、`hamming-cube`、`linear-code-grid`、`syndrome-decoder`、`distance-sphere` |
| 29 图论 | ~~`degree-lab`~~✅ 已实现（回填 20 号课）、~~`graph-builder`~~✅ 已实现（回填 10 号课）、`traversal-race`、`shortest-path-race`、`mst-cut`、`topo-sort-drag`、`bipartite-matching`、`euler-hamilton-lab`、`planar-crossing`、`coloring-board` | 50 强化学习 | `gridworld-policy-arrows`、`bellman-backup-wave`、`q-table-heatmap`、`epsilon-explore-lab`、`policy-gradient-trajectory`、`reward-shaping-sandbox` |
| 31 自动机 | ~~`dfa-runner`~~✅ 已实现（回填 30/50/65 三课）、`nfa-guesser`、`subset-construction`、`regex-nfa-map`、`pda-stack`、`parse-tree-builder` | 53 图网络 | `adjacency-matrix-lightup`、`graph-layout-dragger`、`laplacian-spectrum-layout`、`random-walk-particles`、`pagerank-flow`、`gnn-message-passing` |
| 32 可计算性 | `turing-machine-runner`、`halting-search`、`reduction-map`、`np-search-space`、`sat-solver-lab` | 58 拓扑数据几何 | `rubber-deformation-lab`、`open-set-painter`、`surface-genus-explorer`、`rips-filtration`、`persistence-diagram`、`mapper-graph` |
| | | 60 工程控制论 | `blackbox-io-probe`、`bode-margin-lab`、`nyquist-stability-tour`、`large-system-hierarchy`、`fault-tree-editor`、`queue-throughput-lab` |

（\* 33 章 `operation-table`/`cyclic-generator`/`finite-field-inverse-grid` 三个 index 已声明「已接入首批专属组件」，需与规格文档对账后销账。）

**现状评估（合规，无需紧急处置）**：
- 12 份（含 2026-08-28 补建的 67 章）全部带 `draft: true`，且被 `scripts/validate.mjs`、`scripts/gen-graph.mjs`、`mechanical-audit.cjs` 三处显式排除（按文件名 `COMPONENT_SPEC.md`）。
- ~~`ui/server.mjs` 靠正则巧合过滤~~ ✅ 已补显式排除 `COMPONENT_SPEC.md` + `draft: true` 跳过（2026-08-28）。
- 各课正文均未引用未上线组件名，符合红线。

**高价值实现顺序**（按受益课数）：~~31 `dfa-runner`~~✅ > ~~29 `degree-lab`~~✅ > ~~29 `graph-builder`~~✅ > 53 图网络六件（内含共享 `GraphMatrixLab` 工具）> 33/35/58 章。

> **2026-08-29 状态**：`dfa-runner`（31 章，回填 30/50/65 三课）、`degree-lab`（29 章，回填 20 号课）、`graph-builder`（29 章，回填 10 号课）已实现并注册 `RENDERERS`；其余约 67 个组件仍属多批次特性开发，请按上述顺序单批立项。

## 六、组件扩展（viz 渲染器能力升级，可回填多课）

- `truth-table`：从白名单模板升级为安全的命题公式解析与行高亮挑战；先把当前 `(p,q)` 状态映射到四行之一并整行高亮（第 20 章复审遗留 NEEDS-VIZ-PASS）。
- `quantifier-hunt`：增加量词槽位拖拽与最小反例挑战。
- `set-mapper`：升级为拖线构造盘，支持左右集合大小与目标挑战。
- `proof-trail`：增加步骤类型、合法迁移规则和语义错误反馈。
- `contour-map`：如需出版级光滑等值线，升级为 Marching Squares 拓扑连接与样条平滑。
- `least-squares-fit`：多项式拟合、正则化和病态正规方程留待数值分析或机器学习数学章。
- `svd-stretch`：如需高维演示，引入受控数值分解工具并补充分解存在性证明。
- `phase-portrait`：重复特征值与 Jordan 型、亏损特征向量需要专门课程和组件。
- `distributive`：增加同一面积的交换律旋转模式。
- `factoring`：把负数拼块从「符号账本」升级成真正的正负面积拼图，保留 p、q、pq、p+q 的联动读数。
- `inequality`：新增零等待数轴解集组件，支持边界拖动、开闭区间、试探点和「乘负数镜像翻面」操作日志。
- `fraction`：增加可选的百分数模式或把分母上限扩到 100。
- `roundline`：新增最近整数数轴，显示左右整数、`.5` 中界和误差。
- `curverace`：第 3 章已上线同尺度四线对照和探针读数；后续可加同一 x 回放、归一化视图和对数尺度切换。
- `plot`：为不连续函数增加 staircase 绘制模式、跳变断口或开闭端点标记。
- `triangle`：增加边长显示、三角形不等式边界模式和「为什么三边定一角」的挑战读数。
- `pytha`：增加勾股重排证明动画（4 个直角三角形从斜置正方形滑入两矩形加双正方形）。
- `sector`：增加「弧长 / 弦长」高亮切换和同一占比下的单位圆对照。
- `piroll`：把尺规刻度原点与初始接触点对齐，并保留接触点轨迹。
- `contour-gradient`：合并等高线背景、梯度箭头、方向导数探针。
- `jacobian-grid`：重构双平面视图并 auto-fit，支持局部小方块的线性近似。
- `riemann2d`：按定义域和函数高度自适应投影，补精确值/黎曼和/误差读数。
- `path-integral`：支持同端点多路径、反向按钮和端点拖拽。
- 大奇异值下复用 `svd-stretch` 时需要坐标自动缩放或局部轴放大，避免条件数课图形被裁剪。

### 6.1 从 UNIT_GUIDES 归档的未立项组件规格

以下组件在 UNIT_GUIDES 中有完整规格但未实现，若对应章要深化可直接取用：

- **31 自动机**：`dfa-runner`（30/40/45/50/55 五课受益，收益最高）、`subset-construction`、`pda-stack`（建议做成共享底层动画控件供未来编译器章复用）、`parse-tree-builder`（需与 85 号 CYK 回溯指针兼容，避免两套树数据格式分裂）
- **30 算法**：`growth-race`、`invariant-tracer`、`divide-tree`、`decision-tree-sort`、`hash-buckets`；预留缝隙课 `65-union-find.md`
- **43 优化**：`convex-chord`、`gd-step-size`、`optimizer-race`、`kkt-point-probe`
- **44 数值分析**：`float-gaps`、`gram-schmidt-lab`、`iterative-sweep`、`mc-convergence`
- **54 可信 AI**：`calibration-ruler`、`drift-mirror`、`adv-push`、`conformal-net`、`privacy-blur`

## 七、交互路线候选（未立项）

- 卷一中段优先级最高：复合流水线拖拽台、反函数镜像折纸、三旋钮统一变换器、杨辉三角递推器。
- 卷一分析段：极限 ε/N 探针、求导相位轮盘、换元内外层变形器、Taylor 截断误差地图、正交性矩阵、连续谱动画、混叠折叠演示。
- 循环卷积小实验应随未来「卷积定理」专门课文立项（第 16 章枢纽课已保守收缩为线性与时移）。

## 八、VIZ 渲染器能力缺口

- `renderPlot`：logAxis 支持（44-floating-point 现象不可读）；~~散点/标记层~~✅ 已加 `points: [[x,y],…]` + `pointsColor`（2026-08-29，尚未回填具体课程 viz spec）；~~y=x 参考线字段~~✅ 已加 `refline: "y=x"`、~~expr2 自定义颜色~~✅ 已加 `color`/`color2`（2026-08-28）。
- `contour-map`：可选 rect 覆盖层画可行域（43-objective-feasible）。
- `spectrum`：非整数频率演示开关或泄漏演示按钮（16-60/65、61-60 组件 caption 已诚实但能力缺位）。
- `cyclic-generator`：乘法群模式 g^k mod n（34-diffie-hellman 已按加法群改写课文规避）。
- ~~`datachart`：逐柱着色/高亮字段~~ ✅ 已支持可选 `colors` 数组（2026-08-28，未指定时维持默认蓝）。
- `proof-trail`：公理卡指定与定向删边。
- ~~`sines`：暂停键~~ ✅ 已加暂停/播放按钮（2026-08-28，等幅模式同样可用）。

## 九、VIZ 低频边界（单点，随触随修）

✅ 已修（2026-08-28）：`numberline` 拖拽钳制（复核发现已在位）+ 补「结果出轴端贴边提示」；`curverace` 领先者判定 NaN 守卫（探针落定义域外不再抢占）；`phase-portrait` classify() 输出改中文；`proof-trail` 状态消息双显合一（只走 caption）。

- `sector` r≥4.5 半径视觉饱和；`piroll` 行程外框剧透答案。
- `statdots` 三读数同行窄屏裁字；`clockmod` 右侧分解式窄屏溢出；`fit` 的「平均误差」实为均方误差（改名或加注；主站 viz.js 未搜到该字样，需在 ui 皮肤或调用 spec 侧再核实）。
- ~~`boundary-lab` 切边界模式不清 history 热图条带混叠~~✅ 已修（2026-08-29，切模式清 history/time/lastHistory）；~~`pde-probe` 幅值>1.25 削顶~~✅ 已修（2026-08-29，波形钳到显示带并加 ⚠ 提示）。
- `set-mapper` 中文节点名溢出圆外、移动端点击热区偏小（60 章管理学借用处集中）。
- `seq` geom 滑杆 step 0.1 与 r=1.618 类初值不对齐首拖跳变。
- ~~`fraction` num=0 时 rim 把手消失~~✅ 已修（2026-08-28，把手常驻，零份时灰色停在正上方）。
- ~~`truth-table`「切换 p/q」仅顶部小字反馈~~✅ 已修（2026-08-28，当前 (p,q) 行整行橙色高亮）。
- ~~`proof-trail` 预置边使「按顺序连链」指令空转~~✅ 已修（2026-08-28，预置完整链条时初始提示改为「先点清空再自己连一遍」）。

### 9.1 无头浏览器全量巡检新发现（2026-08-28，真实 Chrome 逐组件实测）

- ~~**[P2] `30-algorithms/65-binary-search-tree.md` 实验 3/实验 4 孤立运行报 NameError**~~ ✅ 已修（2026-08-28）：实验 3 前加「按顺序先运行实验 2，直接单跑会 NameError」注记。
- ~~`proof-trail` 状态消息双显~~ ✅ 已修（2026-08-28，见第九节）。
- ~~`markov-chain-lab` / `moe-router` 柱状图填充色近黑~~ ✅ 已修（2026-08-28）：根因是 `themeColors()` 缺 `accent`/`accent2` 字段导致 `fillStyle=undefined` 沿用近黑描边色，已在主题表补齐主色/副色（共修复 12 处引用）。`moe-router`「路由原始总分」小标签与第一根柱重叠为纯间距问题，未动。
- `set-mapper`（补充已登记项）：中列点阵小圆 13px 半径装不下 11px 的 `i→j` 标签，相邻圆文字互相粘连（如 `0→00→10→2` 连成一串），且左右主连线穿过点阵造成视觉打结；功能正常（点击可增删箭头、分类读数正确），纯可读性问题。
- `plot`：图例文字贴近右缘时被裁剪（见 50-precedence 双读法图例）。

## 十、登记队列（无结构性缺口，等前置落地后串线）

- 机械设计线：应力张量选讲挂在 50 章 125 号张量课后；梁弯曲=ODE 应用例（60）；公差配合=正态应用；疲劳 S-N=幂律拟合。
- 65 章采样规划 RRT 仍为登记缺口（MPC / Kalman 归宿已落地）。
- 未立项项（原登记于各 UNIT_GUIDES 的 BACKLOG 条目，现统一归此）：Platt scaling、差分隐私指数机制与 RDP 会计、Shapley 值精确计算、Conformal 条件覆盖、Ziegler-Nichols 整定、LQG、离散控制、Gramian、GELU 家族、warmup 理论、自动微分框架实现、嵌套 CV、偏差-方差分解、rom-mode-picker。

## 十一、校验器加固（`scripts/validate.mjs` 盲区）

✅ 六条全部落地（2026-08-28）：

1. **MDX 双坑**：`mechanical-audit.cjs` 原已内置字面 `\{`/`\}`（problem 级）与跨多行 `$$`（problem 级）检测；本轮实测曾当场揪出 46 章 51 课残留一处并修复。
2. **「详解输出格式 == `@check`」**：`mechanical-audit.cjs` 新增预警级检测——详解代码块全部为字面量 print 却无一命中 `@check` 期望时报 `[warn]`（动态计算的详解不误报）。
3. **quiz 解释行格式**：`validate.mjs` 新增硬闸门——`??` 开头的解释行直接 error（32 章 10 处已先改单 `?`，现库为零）。
4. **UNIT_GUIDES 章号引用校验**：新增 `scripts/audit-unit-guides.mjs`（`npm run audit:guides`），查不存在的章号 + 旧号段两种形式复活，含历史引语 EXEMPT 白名单。
5. **`ui/server.mjs` 内部文档显式排除**：✅ 已落地——`scanDocs` 显式排除 `COMPONENT_SPEC.md` 并跳过 `draft: true`。
6. **缩进式 `$$` 预警**：✅ 已入 `mechanical-audit.cjs`（`[warn]` 级，围栏状态机跳过代码块内 `$$`）。

## 十二、2026-08-28 审核结论（第二轮）

对首轮整合做了一次独立复核，结论分三类：

### A. 已核实为真、维持登记的项

| 项 | 核实结果 |
| --- | --- |
| 32 章 quiz `??` | ✅ 精确 10 处，与登记一致（全站合规解释行 687 处） |
| 全站无 `draft: true` 正式课 | ✅ 仅 11 份 COMPONENT_SPEC 带 draft，符合预期 |
| MDX 双坑现状 | ✅ 字面 `\{`/`\}` **0 处**，跨多行 `$$` **0 处**（历史 9 门课问题已彻底清零） |

### B. 首轮记错、已订正的项

| 项 | 原登记 | 实际 | 处置 |
| --- | --- | --- | --- |
| 缩进式 `$$` | 3 处，清单含 47 章 | **16 处**；47 章已修复，21/36/38/42 章 5 处从未登记 | 已重写该条目，附完整逐处清单 |
| 「45 处占位标记」 | 疑为内容缺口 | **绝大多数是 exercise 留空**（`print(round(0))` 等，设计如此），非缺陷 | 已判定为非问题，不登记 |

### C. 首轮遗漏、本次补入的项

1. **COMPONENT_SPEC 体系**（§五·五）——11 份、约 70 个待实现组件，此前从未进入任何台账，是真正的第四类未完成项。
2. **`ui/server.mjs` 隐性过滤**（§五·五 + 第十一节第 5 条）——靠正则巧合过滤内部文档，脆弱点。
3. ~~校验器第 5、6 条加固~~（§十一原第 5、6 条）✅ 均已落地：`ui/server.mjs` 显式排除 + 缩进 `$$` 预警入 `mechanical-audit.cjs`。

### D. 建议加入但尚未登记的方向（供下轮取舍）——✅ 三项均已处置（2026-08-28）

| 方向 | 依据 | 处置 |
| --- | --- | --- |
| 29 章 `_generate.mjs` 残留 | 生成脚本留在 `docs/29-graph-theory/` 内 | ✅ 已在文件头加冻结注记（重跑会覆盖回填课），按「加注说明」方案闭环 |
| 67 章四件规划组件 | index 明列四件未上线 | ✅ 已补建 `docs/67-category-theory/COMPONENT_SPEC.md`（draft:true，含完整规格），index 改为一句指引 |
| 各章 index「计划交互形态」双份维护 | 与 COMPONENT_SPEC 重复 | ✅ 已逐章核对：24/26/60 原已合规、35 实为已落地清单、67 已转指针；无残留双份维护 |

---

## 十三、执行顺序建议（对齐 VISION §8 波次）

| 序 | 动作 | 依赖 | 产出验证 |
| --- | ---: | --- | --- |
| 1 | ~~拍板 D1 / D2 / D3~~ ✅ 已裁决（D1→(a)，D2→(b)，均见 §0.2/§0.3 处置列） | — | 完成 |
| 2 | ~~按 D1 处置 UNIT_GUIDES~~ ✅ 35 份头注齐备 | 1 | 完成 |
| 4 | ~~订正 §2.2 编号双轨~~ ✅ 旧号段扫描归零 | 2 | 完成 |
| 5 | ~~§2.3 过期占位判定订正 + prereqs 回填~~ ✅ 已订正；45 章 85 课经核实维持自担 | 4 | 完成（validate 无 lesson_id 告警） |
| 6 | 单点卫生剩余项（`16-fourier/50-transform` 思维量升级等）随触随修；缩进 `$$`（含 23/51 章新检出 4 处）已全部顶格清零、预警已入 `mechanical-audit.cjs`；32 章 `??` 已全部改单 `?`；`ui/server.mjs` 显式排除已落地 | — | 逐项销账；扫描数归零 |
| 8 | COMPONENT_SPEC 组件按 §五·五 顺序实现（31→29→53→…） | — | 每组件 `RENDERERS` 注册 + 正文回填 |
| 9 | ~~校验器加固~~ ✅ 六条全部落地（见第十一节终态） | — | 完成 |
| 10 | 组件扩展 / viz 缺口（第六、八节）择期；已实现 `dfa-runner`/`degree-lab` 两组件与 §八/§九 多项（2026-08-28），其余仍登记 | — | 登记后删行 |
| 11 | ~~§十二-D 三个方向取舍~~ ✅ 全部处置（见第十二节 D 表） | — | 完成 |

---

## 十四、项目体积优化（待立项 · 2026-08-29 基线盘点）

> 用户指示「之后再尝试优化项目体积」。本节为开工前的基线数据与方案清单，立项后按行销账。

### 14.1 体积基线（2026-08-29 实测）

| 位置 | 体积 | 说明 |
| --- | ---: | --- |
| `build/`（部署产物） | **224 MB** | 优化主战场 |
| ├ `build/docs/` | 102 MB | 862 页 HTML，单页 ~120–260 KB（KaTeX 双份输出 + 正文） |
| ├ `build/assets/js/` | 79.4 MB | 888 个 chunk（按路由 lazy 拆分，最大单文件 0.9 MB，属 Docusaurus 正常形态） |
| ├ **`build/search-index.json`** | **39.4 MB** | ⚠ 单点最大可优化项：docusaurus-search-local 全站明文单文件索引，搜索时整包下载 |
| └ `build/fonts/` | 1.2 MB | KaTeX 字体 60 个（20 字形 × ttf/woff/woff2 三格式，ttf/woff 属冗余 fallback） |
| `node_modules/` | 2.4 GB | 部署不需要，归档/迁移时可排除 |
| `docs/` 源码 | 9.2 MB | 862 门课 |
| `.docusaurus/` 缓存 | 5.1 MB | `npm run clear` 可清 |

### 14.2 优化方向（按收益排序）

1. **search-index.json 39.4 MB → 预计 ≤8 MB**（收益最大）：后处理脚本裁剪索引条目（正文只保留标题 + 前 N 字 + 元数据），挂进 build 流程；或改用 gzip 产物 + 客户端 DecompressionStream 解压。注意保留 `hashed: true` 的分片机制与中文分词效果回归验证。
2. **KaTeX 字体 60 → 20 个（省 ~0.8 MB）**：`stylesheets` 引用的 `/katex.min.css` 为本地维护版时，可把 CSS 内 `url(*.ttf)`/`url(*.woff)` 源删掉只留 woff2（现代浏览器全支持）；同步删 `build/fonts`、`static` 下对应 ttf/woff。
3. **每页 HTML 体积（102 MB 总量）**：主因是 KaTeX 输出 MathML + HTML 双份。可选 `output: 'html'`（体积约减半，牺牲部分无障碍读屏）；或维持现状（单页浏览体积影响小，优先级低）。
4. **node_modules / 缓存**：部署管线里排除即可；无代码改动。

### 14.3 约束与验收

- 改动不得影响搜索召回质量（用代表性关键词抽查命中）；构建必须 `validate + build + mechanical-audit` 全绿。
- 任何裁剪脚本须可重入（幂等）并登记进 `package.json` scripts，避免成为「绕过闸门的手工步骤」。
- 收益按「部署产物体积 / 首屏下载字节数」两个口径分别记录。

## 十五、2026-08-30 卷二~卷五交互抽查遗留

> 五个子代理全量扫描 18–66 章（574 viz / 698 exercise / 599 quiz / 1140 python）：未注册类型 0、JSON 失败 0、MDX 双坑 0、Pyodide 违禁依赖 0。「文案超前于实现」的 3 处 P1（conv2d-slide 逐格乘积读数 + pattern 切换、fit 删点）已按补控件方式修复（2026-08-30，build 全绿），不再登记。以下为未处理项。

### 15.1 P0（渲染器真值默认，一处模式四处修）

`Number(x)||默认` 会把合法的 0 静默替换为真值默认，导致组件画面与课文矛盾：

| 位置 | 现象 |
| --- | --- |
| `viz.js` `renderElimination`（rhs 两行） | `21-linear-algebra-advanced/20-rank-nullspace.md` 的 `rhs:[0,0]` 被换成 [7,12]，齐次方程演示画出 0=−2，与课文「0=0」直接矛盾 |
| `viz.js` `renderSvdstretch`（b 位） | `21/110-condition-number.md` 对角矩阵 [10,0,0,0.1] 被静默加剪切 |
| `viz.js` `renderEigendirection` / `renderLinearmap` | 同模式待修（当前课程数据侥幸未踩） |

修法：照抄 `renderPhaseportrait` 的 `Number.isFinite` 范例统一替换。

### 15.2 P1（卷四：文字与代码对账，共 6 处）

1. `36/45-joint-distributions.md:116-124`：引用输出应为 `0.0909 0.2975`（正文误写 0.0121 且「远高于」方向反）；116 行注释「红=6」与打印的 `row_sum[5]`（红=5）错位。
2. `39/70-marginal-likelihood.md:100-119`：实验 2 漏乘 C(10,6)=210，实算 ml≈0.0004、BF≈473.7，与正文 0.0909 / 2.26 三处矛盾。
3. `37/30-stationary-distribution.md:82`：正文 π=(5/8,3/8)，viz 矩阵 [[0.8,0.2],[0.5,0.5]] 实收敛 (5/7,2/7)。
4. `41/index.md:101-143`：第一幕 `<details>` 缺就近闭合，「实战挑战」（含判题练习）被吞进答案折叠块。
5. `42/30-confounders-dags.md:75-84`：伯克森 datachart「独立性预测」柱取全人群口径 25，应按池内口径 44.4（否则与正文负相关结论反向）。
6. `38/85-multiple-testing-fdr.md`：全课无 exercise/quiz，与 38 章 index「全章全覆盖」承诺冲突（补课或改承诺）。

### 15.3 P1（卷三：体例）

- `docs/29-graph-theory/` 100/105/110/115 四课页尾互链带「NN ·」前缀（冻结的 `_generate.mjs` 历史遗留）；若解冻重跑需先清理其 `nextText` 数据，否则扩散全章。

### 15.4 P2（择期）

- `viz.js` `renderIcaRotate`：draw() 里 `sl.state.steps !== undefined ? sl.state.angle : 0` 条件写反（`steps` 恒 undefined → 滑块永远无效）。该组件全站 0 引用，首用前必修。
- `55/70-parameter-identification-design.md:81`：fit 组件后接「行列式」文案，错位（行列式属实验 2 python）。
- `61/85-dct-jpeg.md:163-164`：图例「u=12 细纹」越界（8×8 DCT 频率索引仅 0–7）。
- 卷四零散数值 P2（37/80 差值 0.446 非「未过 0.35」、41/50 quiz 解释数字、40/40 1−h(0.49)≈0.0003、39/70 贝叶斯因子 1:93、36/37 章 index 状态行自相矛盾、「（python)」笔误 5 处、37/55 与 39/80 两处新语法缺注释）。
- 卷二 P2：`21/90`、`21/110`、`24/90`、`24/100`、`24/110` 五处互链文字带「NN ·」前缀；`20/62` 唯一无 quiz 课、`20/65` 唯一无 viz 课（已有诚实兜底声明，备查）。
- 建议给 validate/mechanical-audit 增补「全量 viz 块 JSON.parse + type 对 RENDERERS 键集合」机械闸门（本轮审计中只读代理曾误报 `%` 运算符不支持，机械校验可杜绝此类误报/漏报）。
