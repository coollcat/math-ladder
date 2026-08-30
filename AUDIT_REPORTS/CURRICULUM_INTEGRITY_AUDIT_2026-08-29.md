# 课程遗漏与断裂全量排查报告

> 排查日期：2026-08-29 · 排查范围：全站 68 章 / 866 个 md（730 门正式课）
> 排查手段：`validate.mjs` + `mechanical-audit.cjs` + `gen-graph.mjs` 三重基线 + 自定义全量扫描（编号缝隙 / front matter / 依赖 / 重复诞生 / 互动组件覆盖 / MDX 双坑 / references）
> 结论性质：**发现 2 处 P0（构建阻断 + 页面塌陷）、5 项 P1 缺口、3 类 P2 待改善**。均为新课程（本轮生产）收尾未闭环所致，可定向修复。

---

## 0. 执行摘要（一页看懂）

| 级别 | 问题 | 位置 | 一句话 |
| --- | --- | --- | --- |
| **P0** | 依赖倒置（构建阻断） | `65-robotics-motion/35-rrt-sampling-planning.md` | prereq 指向 50 号逆运动学，但本课是 35 号，`validate` 硬闸门报错、构建被阻止 |
| **P0** | 字面花括号（页面塌陷） | `16-fourier/68-spherical-harmonics.md` 第 58、189 行 | `$\{...\}$` 里的 `\{` `\}` 触发 MDX 静默降级，该课从出错行起塌成纯文本 |
| **P1** | 三章 index 未同步新课 | 16 / 64 / 65 章 `index.md` | 5 门新课已落盘但章首页路线图没登记，且"门数收官"文案已过时 |
| **P1** | 两门正式课缺 exercise | `38/85`、`61/85` | 违反「exercise 100%」铁律（历史遗留） |
| **P1** | 台账门数快照过时 | `ROADMAP.md` / `BACKFILL_LOG.md` | 写 725 门，实际 730 门；5 门新课未登记 checkbox |
| **P2** | `introduces_concepts` 重复诞生 48 处 | 见 §4.1 | 违反 VISION §7「概念出生地单一注册」，其中 3 处章内重复是真问题 |
| **P2** | mechanical-audit 环境噪音 | 全局 | 1837 个 problem 中约 1832 个是 Windows 中文 stdin 的 surrogate 编码噪音，非课程问题 |

**已核实无碍**（详见 §5）：章节 00–67 连续无缺；`lesson_id` 前缀各章自洽（`graphics/` / `robotics-motion/` / `fourier/`）无双轨；references-data.json 每章齐全；quiz 密度全站达标（≥1/3）；140 个「孤立课」均为 index/references/速查页，设计如此。

---

## 1. 排查方法与基线数据

### 1.1 三重工具输出（2026-08-29 实测）

| 工具 | 结果 |
| --- | --- |
| `node scripts/validate.mjs` | **1 个断层**（65-35 依赖倒置），exit 1，构建被阻止 |
| `node mechanical-audit.cjs` | markdown=866，sourceH2=6538 / builtH2=6506，problems=1837（约 1832 为环境噪音，见 §4.2） |
| `node scripts/gen-graph.mjs` | **730 门课 / 993 条先修线** |

### 1.2 自定义全量扫描维度

章节连续性、每章文件编号、front matter 完整性（title/lesson_id/volume/layer/track/stage/difficulty）、prereqs 存在性/顺序、孤立节点、`introduces_*` 重复诞生、exercise/quiz 覆盖、MDX 双坑、references 章覆盖。

> 说明：排查期间发现 `validate` 两次运行报错不同（第一次 6 个断层、第二次 3 个、第三次 1 个），根因是**这些新课程文件仍在被并发写入**（两次分别抓到 64-90、16-68 处于半成品态）。本报告以最后一次稳定运行为准。

---

## 2. P0 断裂（构建阻断 / 页面塌陷）

### 2.1 `65-robotics-motion/35-rrt-sampling-planning.md` 依赖倒置

```
✗ 65-robotics-motion/35-rrt-sampling-planning.md: prereq "robotics-motion/inverse-kinematics"
  (65-robotics-motion/50-inverse-kinematics.md) 排在本课之后或同位——依赖必须先讲
```

- 本课 `lesson_id: robotics-motion/rrt-sampling-planning`，prereqs 含 `robotics-motion/inverse-kinematics`（50 号课）。35 < 50，依赖必须先讲 → 硬闸门阻断构建。
- **内容核查**：正文第 47 行「配置空间（C-space）」是自己定义的，并未真正引用第 50 课的逆运动学内容。这个 prereq 是多余的。
- **建议**（任选其一）：
  - (a) 直接删掉 prereq `robotics-motion/inverse-kinematics`（正文自包含，最省事）；
  - (b) 若坚持保留「关节角空间」概念依赖，应把本课移号到 50 之后（代价大，会牵动 40 四元数等后续课的编号与 index）。

### 2.2 `16-fourier/68-spherical-harmonics.md` 字面花括号（MDX 双坑）

第 58 行与第 189 行各有一处 `$\{...\}$`（含字面 `\{` `\}`）：

- 第 58 行：`$\{c_0{=}1, c_3{=}0.4\}$`
- 第 189 行：`$\{Y_0^0, Y_1^{-1..1}, Y_2^{-2..2}\}$`

按 AGENTS.md「MDX 静默降级」铁律，行内公式出现字面 `\{` / `\}` 会让**该课从出错行起整体塌成纯文本**（`##` 标题、代码围栏全部失效），且 `npm run build` 照样绿——这是最阴险的一类。`mechanical-audit.cjs` 的 `literal escaped brace` 检测已命中（唯一一例）。

- **修复**：`\{` → `\lbrace`、`\}` → `\rbrace`（KaTeX 等价，不含字面花括号）。

---

## 3. P1 遗漏（内容完整性缺口）

### 3.1 三章 index 未同步新课程（违反 BACKFILL_LOG 铁律 4）

本轮共 5 门新课落盘，但三份章首页路线图均未登记，且「收官」文案门数已过时：

| 章 | 磁盘新增课 | index 现状 |
| --- | --- | --- |
| 16 傅里叶 | `68-spherical-harmonics.md` | 课程列表止于 70-summary，缺 68 号 |
| 64 图形学 | `85-differentiable-rendering`、`90-nerf-volume-rendering`、`95-3d-gaussian-splatting` | 列表止于 80-method-map，仍写「十二门课已齐线收官」，实际 15 门 |
| 65 机器人 | `35-rrt-sampling-planning.md` | 列表 30 → 40 直接跳号，缺 35 号，仍写「十三门正式课全部齐线收官」，实际 14 门 |

**修复**：三份 index 各补上对应课程条目（纯标题 + 相对链接），并按文件号重排；同步改写「收官」文案门数。

### 3.2 两门正式课缺 exercise（违反「exercise 维持 100%」）

| 课 | 现状 | 说明 |
| --- | --- | --- |
| `38-statistical-inference/85-multiple-testing-fdr.md` | 无 exercise（连 quiz/viz 也没有，仅 2 个 python 块） | 多重检验与 FDR，正式课，历史遗留缺口 |
| `61-digital-signal-processing/85-dct-jpeg.md` | 有 viz + quiz，**无 exercise** | DCT 与 JPEG，正式课，历史遗留缺口 |

其余正式课均逐课配判题练习（intro.md、00 章三张速查页 formula-sheet / python-index / glossary 属豁免）。

### 3.3 台账门数快照过时

- `ROADMAP.md` 第 15 行写「725 门正式课」，`BACKFILL_LOG.md` 第 4 行写「794 门课闭环」，均落后于当前 **730 门**（gen-graph 实测）。
- 5 门新课（16-68、64-85/90/95、65-35）均未登记进 ROADMAP 各章 checkbox 与 BACKFILL_LOG。
- 按 AGENTS.md「勿写死数字快照」纪律，ROADMAP/BACKFILL_LOG 的门数口径应改为「以 `node scripts/gen-graph.mjs` / `node scripts/validate.mjs` 最近一次输出为准」。

---

## 4. P2 待改善

### 4.1 `introduces_concepts` 重复诞生 48 处

`introduces_math/builtin/import` 的重复诞生此前已清零（详见记忆库），但 **`introduces_concepts` 从未做过单一注册校验**，本轮首次全量扫描命中 48 处。分三类：

**A. 章内重复（3 处，真问题，建议直接修复）**：

| 概念 | 重复位置 |
| --- | --- |
| `augmenting-path` | `29-graph-theory/80-bipartite-matching.md` + `29-graph-theory/125-max-flow.md` |
| `statistical-power` | `38-statistical-inference/40-ab-testing.md` + `38-statistical-inference/55-sufficiency-np.md` |
| `computational-graph` | `46-deep-learning/35-computational-graph.md` + `46-deep-learning/40-backprop.md` |

> 处理方式：保留更早的出生地声明，后者删去 `introduces_concepts` 里的该词（正文引用仍可保留）。

**B. 跨章重复（约 39 处，需教学决策）**：典型如 `quaternion`（64-25 与 65-40）、`lagrangian`/`generalized-coordinates`（22-65 与 65-70）、`markov-property`（37-10 与 50-40）、`stationary-distribution`（29-115 / 37-30 / 53-70 三处）、`positional-encoding`（47-50 与 64-90，后者为本轮新课引入）、`sensitivity-function`（52-80 与 60-45）等。

> 这些多为「螺旋上升」设计——同一概念在不同卷/应用域重新引入（学生可能只学单卷）。但 VISION §7 白纸黑字「概念出生地，单一注册」。二选一：
> - 统一出生地：删去后续课的重声明，并给后续课补 prereq 指向出生地（会新增跨章边，需过 `validate` 顺序校验）；
> - 或改纪律：在 VISION §7 补充「跨卷允许按应用域重复引入」的例外条款，把跨章重复定为合法、只罚章内重复。

**C. index 与课重复（6 处，无害但建议清理）**：`03-exponents/index.md` 声明 `math.log`、`07-trigonometry/index.md` 声明 `math.cos/sin/tan/radians/tau` 等——index 是章首页，本不该声明 `introduces_*`（不入图谱、gen-graph 会过滤）。建议清掉 index 里的 introduces 字段，把出生地留在正式课。

### 4.2 mechanical-audit 的 Python compile 环境噪音

`mechanical-audit.cjs` 报 problems=1837，其中约 **1832 条**是 `Python compile failed: UnicodeEncodeError: surrogates not allowed`——根因是 Windows 下 `spawnSync('python', …)` 把含中文注释的 stdin 转成未配对 surrogate，Python 拒绝编译。**这是工具链在 Windows 的已知盲区，非课程问题**（同一脚本在 Linux/macOS 会正常）。真实非噪音 problem 仅 5 条：1 条字面花括号（§2.2）+ 4 条 missing build page（§4.3）。

> 可选改进：`mechanical-audit.cjs` 的 `spawnSync` 改用 `input: Buffer.from(block.code, 'utf8')` 并传 `encoding: 'buffer'`，或直接跳过本机的 Python 编译检查，避免噪音淹没真实问题。

### 4.3 build 目录落后（4 个 missing build page）

`mechanical-audit.cjs` 报 4 个 `missing build page`：`16-fourier/68`、`64-computer-graphics/85`、`64-computer-graphics/90`、`65-robotics-motion/35`——均为本轮新课尚未 build。sourceH2=6538 vs builtH2=6506 的 32 个差值亦源于此。**重新 `npm run build` 即消**（但 16-68 会因 §2.2 的字面花括号永久塌陷，必须先修）。

---

## 5. 已核实无碍的项（避免误报）

| 维度 | 结论 |
| --- | --- |
| 章节连续性 | 00–67 共 68 章连续，无缺章 |
| `lesson_id` 前缀 | 64 章统一 `graphics/`、65 章统一 `robotics-motion/`、16 章统一 `fourier/`，无双轨 |
| prereqs 存在性 | 0 个「指向不存在课」，全部可解析 |
| references 数据 | `references-data.json` 每章齐全，无缺章条目 |
| quiz 密度 | 全站达标（≥1/3），仅 intro.md 无 quiz（豁免） |
| 孤立课 140 个 | 全部为 index.md / 999-references.md / 00 章三张速查页 / intro.md，设计如此，非断裂 |
| 编号跳号 | 各章 x5 缝隙号插课是**有意为之**（ROADMAP 既定策略），非断裂 |
| 元数据（volume/layer/track/stage/difficulty） | ch≥18 全部齐备，0 缺失 |

---

## 6. 建议修复清单（按优先级）

| 序 | 动作 | 影响 | 验证 |
| --- | --- | --- | --- |
| 1 | 修 `16-fourier/68` 两处 `\{`→`\lbrace`、`\}`→`\rbrace` | P0 页面塌陷 | `node mechanical-audit.cjs` 花括号归零 + h2 计数比对 |
| 2 | 删 `65-robotics-motion/35` 的 prereq `inverse-kinematics`（正文自包含） | P0 构建阻断 | `npm run validate` 全绿 |
| 3 | 三章 index 补 5 门新课条目并改「收官」文案 | P1 index 未同步 | 逐章对账文件号 |
| 4 | 补 `38/85`、`61/85` 两课的 exercise | P1 exercise 缺口 | @check 实跑校验 |
| 5 | ROADMAP / BACKFILL_LOG 门数改动态口径 + 登记 5 门新课 checkbox | P1 台账过时 | — |
| 6 | 清理 3 处章内 concept 重复诞生；跨章 39 处按 §4.1 二选一裁决 | P2 单一注册 | 复扫归零或修订 VISION |
| 7 | （可选）`mechanical-audit.cjs` 绕过 Windows surrogate 噪音 | P2 环境噪音 | problems 数大幅回落 |

收尾必跑：`npm run validate` + `npm run build` + `node mechanical-audit.cjs` 三者全绿（其中 mechanical-audit 仅需确认「字面花括号 + 多行 $$」两类归零，Python compile 噪音可豁免）。
