# 卷七 · 物理与前沿交叉（76–78）施工手册

> 2026-09-29 建卷。本文件是卷七的**自包含施工与维护依据**：架构、课表、专属组件、坑清单。
> 写课通用规范（九段式、四种围栏语法、判题自检）**不在本文件重复**，以
> `LESSON_TEMPLATE.md` + `UNIT_GUIDES/68-75-volume6-outline.md` §3/§4 为准；
> 本文件只写卷七的增量与差异。

## 0. 五分钟速览

**卷七回答的问题：前六卷的数学，在物理与神经科学的主战场上怎么用？**

- 76 狭义相对论与时空几何：线性变换（12/21 章）如何长出洛伦兹变换，二次型（21 章）如何变成闵可夫斯基度量；
- 77 哈密顿力学与对称性：勒让德变换把拉格朗日（22/26 章已讲）翻个面，相空间 + 辛结构接住数值积分（44 章）；
- 78 脑机接口的数学：点过程与贝叶斯（36/39 章）、卡尔曼（52 章）、判别分析（21 章）、信息论（40 章）在一条电极—解码—刺激链上合流。

**三条编排纪律**（写新课前先读，违反即返工）：

1. **不重讲**。拉格朗日力学与最小作用量原理归 22 章 65 号（`ode/newton-to-lagrange`）与 26 章 95 号（`functional-analysis/calculus-of-variations`）；EEG 频谱、节律带与伪迹归 61 章 96/97 号。卷七只在 §1/§2 用两三句话回扣 + 给双向链接。
2. **工具都有出生地**。每门课都要能追回它借用的前置课（洛伦兹变换 ← 12 章线性变换；辛结构 ← 21 章二次型；卡尔曼 ← 52 章）。front matter 的 `prereqs` 是硬校验，别只写在正文里。
3. **应用锚点必须真实可检验**。GPS 的 38 微秒、μ 子寿命、Pound–Rebka 式红移、Hodgkin–Huxley、BrainGate——不写"某研究表明"式的空话，也不编造临床数字。

## 1. 架构速览

| | 前六卷 | 卷七 |
| --- | --- | --- |
| 交互围栏 | `viz`（00–67，冻结）/ `lab`（68–75） | **一律 `lab`** |
| 组件底座 | `viz.js` 单体 / `lab/core.js` | `lab/core.js`（复用，不新增引擎） |
| 数值引擎 | circuit / mech / logic / dsp / media / audio | **不新增引擎**：卷七的数值内核（洛伦兹变换、辛积分、点过程）都是十几行，直接写在组件里 |
| 出声组件 | 73/74 章有 | **无** |

卷七组件全部是「canvas + 滑块 + 可拖指针」三件套，主题色走 `themeColors()`，动画走 `anim()` / `rafLoop()`（离屏自动停）。

## 2. 章节编号

章号即学习顺序，76 → 77 → 78。76 在 77 之前是刻意的：77 章 80 号《从粒子到场》要用 76 章的闵可夫斯基度量把"场"摆进时空。

| 章 | 目录 | 主题 | 层 | 支线 | 组件 | 课文 |
| --- | --- | --- | --- | --- | ---: | ---: |
| 76 | `76-relativity` | 狭义相对论与时空几何 | L8 | analysis-change + geometry-space | 8 | 8 |
| 77 | `77-hamiltonian-mechanics` | 哈密顿力学与对称性 | L9 | analysis-change + scientific-computing | 8 | 8 |
| 78 | `78-brain-computer-interface` | 脑机接口的数学 | L11 | information-learning + probability-statistics | 8 | 8 |

## 3. 写一门课（卷七增量）

- front matter 全字段同卷六，`volume: 7`；`stage` 用 `university-core`（76/77）或 `research-elective`（78）。
- 课表里的 `lesson_id` **不要自创**（`relativity/*`、`hamiltonian/*`、`bci/*` 三套命名空间）。
- §5 标准形态：lab 实验在前、python 实验在后，末尾可加「快问快答」quiz。
- `index.md` 章首页四段：章 front matter → 路线图（8 条）→ 方法主线 → 生产状态 → 实战挑战（exercise + details）。
- 判题 `@check` 必须**本机 python 实跑**取得（浮窗里用的是 Pyodide 的 CPython，行为一致）；浮点末位别心算。

## 4. 写一个 lab 组件（卷七增量）

- 文件 `src/pyrunner/lab/components/{rel,ham,bci}-<kebab>.js`，默认导出 `render(host, spec) → { slidersBox?, destroy? }`。
- **前缀即所有权**：76 用 `rel-`、77 用 `ham-`、78 用 `bci-`。跨册重名是 `validate.mjs` 硬错误。
- 参数一律从 `spec` 读并给默认值（课文里的初值只是初值，不要把数值写死在组件里）；组件自带的 `sliders` 默认值与课文围栏的 `sliders` 合并（参考 `ham-symplectic.js` 的 `mergeSpec`）。
- `destroy()` 必须停 rAF / 解绑监听：`anim()` 返回的 `stop()` 或 `rafLoop()` 的 `stop()`。
- 组件顶部的注释块要写清「字段 / 能拖什么 / 看什么」——卷七组件普遍比卷六多一层"物理直觉提示"，写在注释里，课文里再复述一遍。

## 5. 课表

### 76 `docs/76-relativity/` · 狭义相对论与时空几何

| 文件 | title | 组件 |
| --- | --- | --- |
| `10-light-speed-postulate.md` | 光速不变：为什么"同时"是相对的 | `rel-simultaneity` |
| `20-lorentz-transform.md` | 洛伦兹变换：保光速的唯一线性变换 | `rel-lorentz` |
| `30-time-dilation.md` | 时间膨胀与长度收缩：μ 子为什么活得那么久 | `rel-muon` |
| `40-velocity-addition.md` | 速度合成与快度：为什么追不上光 | `rel-rapidity` |
| `50-minkowski-interval.md` | 闵可夫斯基时空：把时间装进度量 | `rel-lightcone` |
| `60-four-momentum.md` | 四维矢量与相对论动力学：E=mc² 的真身 | `rel-collision` |
| `70-doppler-aberration.md` | 相对论多普勒与光行差 | `rel-doppler` |
| `80-equivalence-principle.md` | 等效原理与引力红移：广义相对论的门槛 | `rel-gravity-clock` |

### 77 `docs/77-hamiltonian-mechanics/` · 哈密顿力学与对称性

| 文件 | title | 组件 |
| --- | --- | --- |
| `10-legendre-transform.md` | 勒让德变换：从速度换到动量 | `ham-legendre` |
| `20-canonical-equations.md` | 哈密顿正则方程：二阶方程降成一阶对 | `ham-phase-flow` |
| `30-liouville.md` | 相空间与刘维尔定理：密度不可压 | `ham-liouville` |
| `40-poisson-brackets.md` | 泊松括号与守恒量 | `ham-poisson` |
| `50-noether.md` | 诺特定理：对称就是守恒 | `ham-symmetry` |
| `60-symplectic-integrator.md` | 辛结构与辛积分：能量为什么不漂 | `ham-symplectic` |
| `70-hamilton-jacobi.md` | 哈密顿–雅可比方程与可积系统 | `ham-action-angle` |
| `80-field-gateway.md` | 从粒子到场：作用量语言的门口 | `ham-field` |

### 78 `docs/78-brain-computer-interface/` · 脑机接口的数学

| 文件 | title | 组件 |
| --- | --- | --- |
| `10-spike-model.md` | 神经元为什么放电：膜电位与积分点火 | `bci-integrate-fire` |
| `20-rate-coding.md` | 脉冲串的数学：发放率、调谐曲线与点过程 | `bci-tuning-curve` |
| `30-bayesian-decoding.md` | 神经解码 I：贝叶斯解码与群体向量 | `bci-population-vector` |
| `40-kalman-decoding.md` | 神经解码 II：卡尔曼滤波与光标控制 | `bci-kalman-cursor` |
| `50-eeg-csp.md` | 脑电的正问题与反问题：源定位与空间滤波 | `bci-csp` |
| `60-spd-manifold.md` | 协方差的几何：SPD 流形上的脑电分类 | `bci-spd-manifold` |
| `70-information-rate.md` | 神经编码能传多少比特：互信息与容量 | `bci-mutual-info` |
| `80-closed-loop.md` | 闭环脑机接口：刺激、辨识与自适应 | `bci-closed-loop` |

## 6. 自检与交付

```bat
node scripts/validate.mjs            :: 硬闸门：依赖顺序/围栏类型/方法准入/资料同步
node scripts/check-lab-syntax.mjs    :: lab 组件语法（未挂 build，要手动跑）
node scripts/gen-references.mjs      :: 改了 references-data.json 后必须跑
node scripts/gen-graph.mjs           :: 同步首页/知识树/同心环数据
npm run build                        :: = validate + docusaurus build
```

## 7. 已知坑（卷七新增，卷六那份照旧有效）

1. **卷号白名单**：`scripts/validate.mjs` 的 `REGISTRY.volume` 与 `expectedVolume()` 必须同时扩到 7（`expectedVolume` 里 76–78 要落到 7，否则报「volume 与章所属卷不一致」）。建新卷时这两处是一对，改一个忘一个必炸。
2. **分册汇总要手加**：`src/pyrunner/lab/registry.js` 是汇总文件，新章要在那里 import + 并进 `RENDERERS`；`registries/chNN.js` 则各自新建（validate 扫目录自动白名单，不用改 validate）。
3. **首页与图谱三处联动**：`src/components/ml-home/data.js` 的 `VOLUMES` / `CH_TITLES` / `CH_SHORT` / `volumeOf()`，加 `/graph` 同心环的第七色（`home.css` 的 `--rg-v7` 亮暗两版 + `KnowledgeGraphRadial.js` 的 `VOL_COLORS`）。少一处表现为「新章显示成『76 章』或图上无色」。
4. **参考条目没法联网核验时就别写 PDF**：本机可能没有外网（`en.wikipedia.org` 会被解析到非公网地址）。此时只写 `@page`（标准维基条目名），**绝不**写 `@pdf` / arXiv ID，并把"待联网核验"记进 `_ai-workspace/reports/OPEN_ITEMS.md`。
5. **物理课比工程课更容易写出"看起来对"的错公式**：卷七定稿前必须逐条自查符号约定（正则方程的正负号、辛欧拉先更新动量、洛伦兹变换的 $\\gamma$ 出现位置、间隔的 $(+,-,-,-)$ 约定、卡尔曼的预测/更新两步），并且**课文手算例题的数值要与 python 实跑对得上**。
6. **比较 Fisher 信息前先统一角度单位**（78 章首轮对抗审查抓到的错）：$J=T(f')^{2}/f$ 里 $f'$ 是对弧度求导，得到的是 1/弧度²；拿它直接和"1/度²"的高斯 $J_{max}$ 比会差 $(180/\pi)^{2}\approx3283$ 倍，结论当场反过来——余弦最陡处的信息其实只有高斯最优点的约 $1/12$。凡是 $J$ 的表格与对照，**在表头写清单位**。
7. **"稳定"不等于"衰减更快"**（78 章 80 号第二轮自检抓到的错）：闭环特征方程 $z^{3}-az^{2}+g=0$ 的主导根随 $g$ **先降后升**——$a=0.9$ 时 $g=0$ 是 0.900、$g=0.3$ 是 0.8004、$g=0.5$ 是 0.9276。闭环的收益是**调节与跟踪能力**，不是无条件更快的衰减；写这类结论前先数值求一次根。
8. **正文引用的打印数字要对上 `format` 位数**（76/77 首轮审查抓到两处）：代码写 `{worst:.4f}` 就别在正文里引 `14371.106017`；展示算式时中间量要与最终值同一精度（`299.79²` 配 `89875` 是把截断值和未截断值混用）。学生一跑就对账，这类不一致最伤信任。
