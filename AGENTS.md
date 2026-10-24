# AGENTS.md · AI 协作指南

写给未来在这个仓库工作的 AI 与人类协作者。**动手前通读一遍**；本文件只放**红线、硬性闸门、影响面速查、流水线、并发规程**，其余施工细节已拆成技能，放在 [`_ai-workspace/skills/`](./_ai-workspace/skills/)（不入库）。

> 分层：本文件 = 红线与硬规则；[README.md](./README.md) = 一页看懂；[PROJECT_DOCS/](./PROJECT_DOCS/) = 七份分领域总览；[UNIT_GUIDES/](./UNIT_GUIDES/) = 实现细节与坑档案；[LESSON_TEMPLATE.md](./LESSON_TEMPLATE.md) = 写课模板（单一事实来源）；`_ai-workspace/skills/` = 动手前的分主题施工手册。

## 技能索引（细节都在这里，别在本文件里找）

| 要做什么 | 先读这个技能 |
| --- | --- |
| 找文件、认子系统、查七卷章号 | `math-ladder-project-map` |
| 跑命令、判断该跑哪道闸门、出包与后端 | `math-ladder-commands` |
| 写课 / 改课 / 围栏选择 / front matter | `math-ladder-lesson-writing` |
| 改顶栏、首页、配色、挂件、/graph 与 /tree | `math-ladder-ui-layout` |
| 改 enhancer.js、浮窗、判题、滑块、存储 key | `math-ladder-console-enhancer` |
| 加参考资料、归档 PDF | `math-ladder-papers-references` |
| 撞上怪现象（MDX 塌陷、乱码、假 404、OOM） | `math-ladder-known-pitfalls` |
| 派子代理 / 决定 P0/P1/P2 该怎么处理 | `math-ladder-review-contract` |
| 收尾自测清单 | `math-ladder-pre-ship-check` |
| 内容审查（缺口扫描 + 单课实跑） | `math-ladder-lesson-audit` |

## 项目是什么

「数学阶梯」：从 $1+1$ 到人工智能与前沿数学的中文交互式教程站。Docusaurus 3 纯静态站点，七卷 79 个章目录、**1029 门正式课**（口径见 `PROJECT_DOCS/02-content-system.md` 的「门数口径」，别自己数）。核心是一层**客户端 DOM 增强系统**（`src/pyrunner/enhancer.js`）：扫描 `pre[class*="language-"]`，按语言分派成浮窗按钮 / 判题 / 测验卡 / 文献卡 / 可视化组件。所有 Python 都在浮窗里用 Pyodide 单例执行。

**站点终点口径是「从 1+1 到 AI 与前沿数学」**——傅里叶只是卷一的信号枢纽站，不是终点。别再写「到傅里叶结束」。

## 硬红线（10 条，违反即返工）

1. **收尾必须 `validate` + `check:sync` + `build` 全绿**；并发写课时不跑 `validate` / `build`（见「并发规程」）。
2. **`docs/` 禁用 `.mdx`**，只用纯 markdown + 自定义围栏。
3. **MDX 双坑**（构建不报错，页面会整段塌成纯文本）：行内公式里不能出现字面 `\{` / `\}`（改 `\lbrace` / `\rbrace`，**注意补空格**，否则变未定义命令 `\lbraceX`）；显示公式 `$$…$$` 一律写成**单行**。
4. **不许删 React 管的 DOM**。quiz/viz/lab/paper 一律「隐藏原容器 + 把卡片插在其后」；python/exercise 只往 buttonGroup 加按钮（复制按钮保留）。所有注入必须有 `dataset.mlBound` 守卫，否则 MutationObserver 死循环。
5. **生成物勿手改**：`full-graph-data.js`、`lesson-count.js`、`static/prereqs/*.json`、`static/graph-chapters/*.json`、`docs/**/999-references.md`、`scripts/papers-local.json`。只改生成器或数据源。
6. **章节元数据只有一个源头**：各章 `index.md` 的 front matter `title / short / volume`。改完跑 `npm run gen:graph`；`check:sync` 会拦「忘了跑生成器」和「`src/` 里又长出 `CH_TITLES` / `CH_SHORT` 手写表」。
7. **`viz.js` 冻结只读**，新交互一律走 `src/pyrunner/lab/`（lab 围栏）。两个系统的归属不能换。
8. **判题 `@check` 必须实跑抄录**，不许心算；正文里「初始代码会输出 X」的描述必须与实跑一致。
9. **PDF 链接必须机器验证过**，宁缺毋滥、不编造 ID，拿不到就留 `@page`。
10. **云同步是可选的增强**：任何模块不得假设后端存在，后端挂了 / 断网 / 本地 `npm start` 都必须静默降级（三条降级纪律见 [PROJECT_DOCS/05](./PROJECT_DOCS/05-data-and-accounts.md)）。

## 硬性要求（写课八条硬闸门）

动手前必读：[LESSON_TEMPLATE.md](./LESSON_TEMPLATE.md)、[PROJECT_DOCS/02](./PROJECT_DOCS/02-content-system.md)、同章相邻课（段号与写法照同章多数来）。围栏语法、可视化优先级的上层实现与内容原则见 `math-ladder-lesson-writing`。

1. **一课一概念**。难节点可以大胆详细，篇幅不限；超长先自查是否混入了第二个概念。
2. **可视化优先级**：专属定制交互 → `viz` 网页组件 → 浮窗 Python → 静态文字。能用上层不用下层。
3. **首现必注释**：Python 里第一次出现的语法/函数/参数必须有中文注释。校验器管不到注释，这是写作纪律。
4. **front matter 登记一切新工具**（`introduces_math / introduces_builtin / introduces_import`），`prereqs` 指向更前的课。
5. **标题禁带数字前缀**：读者可见文本（`title:`、index 导览、互链文字、台账条目）写纯课程标题。反例 `[20 · 形式化数学与证明助手]` ✗ → `[形式化数学与证明助手]` ✓。例外：`ROADMAP.md` / `UNIT_GUIDES/` 内部清单可带编号定位。
6. **段号同章一致**，全站不统一是历史现状；写新课前查同章相邻课。
7. **`@check` 实跑抄录**；正文「初始代码会输出 X」必须与实跑一致（Python `round` 是银行家舍入，`1` 与 `1.0` 打印不同）。
8. **前向指引必须 grep 核实**：写「第 N 章会讲 X」之前确认那一章真讲了。踩过四次（凭空写出的「第 24 章空间解析几何」根本不存在；CLT 在 36 章不在 38 章；高斯积分在 20 章不在 14 章）。

## 改一处会牵动哪些文件（影响面速查）

| 你要改 | 必须一起看 / 一起改 |
| --- | --- |
| 章名 / 章短名 / 章属卷号 | 该章 `index.md` → `npm run gen:graph` → `npm run gen:references`（`999-references` 会抄一份 volume）→ `check:sync`、`validate` |
| 加一门课 / 删一门课 | 该章 `index.md` 课表 → `npm run gen:graph`（课数、节点、prereqs）→ `npm run gen:chapters` → `ROADMAP.md` 门数 → `BACKFILL_LOG.md` 去行 |
| 加一个 lab 组件 | `components/<kebab>.js` → 对应 `registries/chNN.js`（字面量 import）→ `node scripts/check-lab-syntax.mjs` |
| 加参考资料 / PDF | `scripts/references-data.json` → `gen-references.mjs`；有 PDF 先 `fetch-papers.mjs`（顺序不能反） |
| 改顶栏导航 | `src/theme/Navbar/index.js` 的 `LINKS`（**不是** `docusaurus.config.js` 的 `navbar.items`） |
| 改七卷配色 | 只改 `src/css/custom.css` 的 `--ml-vol1…7`（亮/暗各一份） |
| 改进度 / 练习存储 | `src/learning/progress.js`（唯一存储层）→ enhancer、右栏挂件、图谱双页的 `learnState.js`（课级四态）都从它 import |
| 改账号校验口径 | `src/auth/index.js` 与 `scripts/add-user.mjs` / `server/sync-server.mjs` **两侧一起改**（哈希口径 `sha256(salt + ':' + 密码)`） |
| 改 `/graph` / `/tree` 或其数据 | 层级 `ringLayout` / 版图 `atlasModel` / 家谱 `lineageLayout`；数据变了 `npm run gen:graph` → `npm run gen:chapters`；build 后跑 `node scripts/check-graph-drill.mjs` |

## 工作流

1. 从 [ROADMAP.md](./ROADMAP.md) 挑未完成课程 → 按规范写 → `npm run validate && npm run build` 全绿 → 勾掉 checkbox。
2. 改交互系统后：build 通过 + 手测三类块（python/quiz/exercise）+ 浮窗开关 + 路由切换后无重复注入（清单见 `math-ladder-pre-ship-check`）。
3. 改章名 / 加删课：`npm run gen:graph` + `npm run gen:chapters`，再跑 `check:sync`。
4. 大改动前可以先派子代理做对抗式审查（历史证明很值：上一轮抓到答案泄露级 bug）。

### 内容生产流水线（新章节 / 批量改动必走）

1. **规划先行**：读 VISION + LESSON_TEMPLATE + 本文件；跨章专属组件先汇总清单再实现。
2. **集群生成**：子代理并行分区，按目录切分零重叠，每区携带全量规范与统一术语表。
3. **整理线程**：汇总产物，统一术语 / front matter 体例 / 组件命名。
4. **批量对抗审核**：独立子代理只审不改——判题链实测、viz spec 对照渲染器、MDX 双坑体检、首现注释抽查、prereqs 顺序、h2 计数比对。
5. **终检合并**：问题回炉 → `validate` + `build` 全绿 + `mechanical-audit` 通过才算交付。
6. **prompt 要点**：每个代理 prompt 自带（a）判定标准全文（b）硬红线（c）输出格式（d）报告落盘路径。

### 并发规程（多写手同批生产，实证）

**共享规范先落文件**：把写课/审查规范写成临时 md，成员 prompt 只要求「先读某文件」，不把几千字规范复制进每个 prompt。任务结束删掉。

三条并发禁令（写进每个成员 prompt）：

1. **只写分配给自己的文件**，不碰任何 `index.md`、不碰已有课文的「下一站」链路——目录清单、课数计数、章内链路全部由 main 收尾时统一重排。
2. **不跑 `npm run validate` / `npm run build`**——并发跑会打架，由 main 统一跑（只读的 validate 例外，但结论只能当参考）。
3. **不写共享 memory 文件**——并发追加会整文件互相覆盖。

**额度中断要主动探**：子代理可能中途被额度打断且零落盘，重活派发后要探一次进度；回「卡住」就把主干拆出来先交付、其余重派。
**审查组与写手组并行**：写完一组就派一个审查员打一组，P0 直接修、P1/P2 报 main 定夺。
**跨组重复要 main 拍板**：判据是「重叠面有多大」——一方顺手用工具、另一方系统讲授，就用螺旋编排（承认句 + 前向指引）缝上，**不改编号**（改编号要牵动 prereqs、内部链接、index.md）。

### 生产与审查合同

裁决顺序、生产/审查代理权限边界、P0/P1/P2 三级分诊与收尾报告要求见 `math-ladder-review-contract`；文档维护纪律（只留活口 / 勿写死数字快照 / 细节下沉）同在该技能。
