# AGENTS.md · AI 协作指南

写给未来在这个仓库工作的 AI 与人类协作者。**动手前通读一遍**；具体实现细节不在这份文件里，按「各子系统」一节的指针跳过去。

> 分层：本文件 = 硬规则与踩坑；[README.md](./README.md) = 一页看懂；[PROJECT_DOCS/](./PROJECT_DOCS/) = 七份分领域总览；[UNIT_GUIDES/](./UNIT_GUIDES/) = 实现细节与坑档案；[LESSON_TEMPLATE.md](./LESSON_TEMPLATE.md) = 写课模板（单一事实来源）。

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

## 常用命令

```bat
npm start            :: 开发预览（--host :: --port 9452，改文件自动刷新）
npm run build        :: validate → check:sync → gen:chapters → docusaurus build → mechanical-audit
npm run validate     :: 课程闭环校验（front matter / 先修顺序 / 方法准入 / 围栏结构）
npm run check:sync   :: 章节信息同步闸门（各章 index.md ↔ 生成物 CHAPTER_INFO）
npm run gen:graph    :: 重生成 full-graph-data.js + static/prereqs/ + lesson-count.js（★ 不在 build 里）
npm run gen:chapters :: 重生成 static/graph-chapters/（/graph 点章时按需加载的课表）
npm run audit        :: 机械体检（h2 源/产物比对 + Python compile + MDX 塌陷扫描，需先有 build/）
npm run clear        :: 清 Docusaurus 缓存（行为诡异时第一步）
```

**`npm run build` 不生成图谱数据**。改了章名 / 加删课后必须手跑 `npm run gen:graph`，否则 `check:sync` 会在下一次构建拦你。

出包（本机构建，服务器不用装 Node）：

```bat
构建Linux部署包.bat                 :: 默认带 server/ 与 deploy/；server/data 账本绝不进包
构建Linux部署包.bat --no-server     :: 纯静态包（只有 build/）
构建Linux部署包.bat --full          :: 构建前先跑 validate    --clear 清缓存    --no-pause 不暂停
构建Linux部署包.bat --loose         :: 死链降为警告           --no-papers 不打 PDF 归档
```

云同步后端（可选，服务器才需要 Node 20+）：

```bat
node server/sync-server.mjs --add-user <用户名> <显示名> <密码>   :: 建号（--list-users / --remove-user 同理）
node server/sync-server.mjs --port 8787 --data ./server/data      :: 起服务（默认只监听 127.0.0.1）
```

测试与脚本一律用 node 执行 fetch；**不要用 PowerShell 的 `Invoke-WebRequest` 测 localhost**（系统代理会返回假 404）。部署细节见 [deploy/README-部署.md](./deploy/README-部署.md) 与 [PROJECT_DOCS/06](./PROJECT_DOCS/06-build-and-deploy.md)。

## 目录结构（精简版）

```text
docs/NN-chapter/index.md            章首页：title/short/volume 的唯一源头 + 本章课表
docs/NN-chapter/MM-lesson.md        课程正文（纯 markdown，九段式 + 交互围栏）
docs/NN-chapter/999-references.md   参考资料（gen-references.mjs 生成，勿手改）
docs/17-what-next/                  「下一程导读」导览章：不入图谱/知识树，豁免九段式
docs/intro.md                       站内「怎么用本站」读者页

src/pyrunner/enhancer.js            ★ 核心：按钮注入/浮窗控制台/判题/测验/文献卡/进度
src/pyrunner/viz.js                 前五卷可视化单体（14,411 行 / 108 渲染器，冻结只读）
src/pyrunner/lab/                   新交互唯一去处：core.js 底座 + 6 引擎 + 注册组件（components/ 文件数比注册组件多，多出来的是只被 import、不注册的共用底座，如 algebra-stage.js / rl-common.js / graph-kit.js / aut-graph-base.js） + 29 个 registries/
src/pyrunner/notebook.js            数学笔记本（与浮窗共用 Python 命名空间）
src/pyrunner/repo.js                代码仓库（浮窗代码的存档柜）
src/pyrunner/backup.js              数据面板：导出/导入/空间搬家/快照
src/pyrunner/formula.js             公式输入器（按目标类型插不同写法）
src/pyrunner/complete.js            补全（静态词表 + 用户命名）
src/pyrunner/mathout.js             KaTeX 唯一加载口（浮窗与笔记本共用）
src/pyrunner/zorder.js              浮窗层叠（1056/1057/1058 重排，不递增）
src/pyrunner/func/                  「看见函数」内核（expr/latex/analyze/plot/surface/keypad/workspace）
src/learning/progress.js            进度/练习/续学位置的存储层（命名空间 + 旧 key 迁移）
src/auth/index.js                   登录态 + SHA-256 + 服务端 /api/login
src/sync/index.js                   云同步（防抖 2s、30s 重试、静默降级、事件 ml-sync-changed）
src/theme/Root/index.js             MutationObserver 入口（过滤交互面板自留地）
src/theme/Navbar/index.js           顶栏：swizzle 整体接管（改导航改这里的 LINKS）
src/theme/TOCItems/index.js         右栏挂件：前置知识面板 + 学习进度条
src/theme/DocItem/Layout/index.js   文档页布局：正文横条前置知识 + 侧栏折叠把手
src/pages/                          首页 / tree / graph / function / login
src/components/ml-home/             首页组件 + full-graph-data.js(生成物) + 图谱双页（KnowledgeAtlas/LessonLineage + 纯函数 ringLayout/atlasModel/lineageLayout/learnState）
src/components/FunctionLab/         看见函数页面壳
src/css/                            custom.css(全站) home.css nav.css auth.css graph-pages.css(/graph 与 /tree)
static/                             fonts/ katex.min.css ml-pyodide-sw.js prereqs/(生成物) graph-chapters/(生成物)

scripts/validate.mjs                课程闭环闸门
scripts/check-chapter-sync.mjs      章节信息同步闸门
scripts/gen-graph.mjs               生成图谱数据 + prereqs + 课数
scripts/gen-chapters-data.mjs       按章拆分图谱数据
scripts/gen-references.mjs          生成 999-references.md（--check 是闸门）
scripts/fetch-papers.mjs            抓 PDF 归档（--check 体检）
scripts/check-build-auth.mjs        出包自检（打包脚本已串）
scripts/references-data.json        参考资料唯一数据源（手改这个）
mechanical-audit.cjs                机械体检（build 的最后一步）
server/                             可选云同步后端（零第三方依赖）+ server/data/ 账本
deploy/                             nginx / systemd / 部署手册
PROJECT_DOCS/                       文档中心（架构/内容/交互/设计/数据/构建/维护）
UNIT_GUIDES/                        45 份单章施工手册与子系统实现细节
```

## 各子系统一句话 + 去哪看

| 子系统 | 一句话 | 入口 | 详见 |
| --- | --- | --- | --- |
| 内容体系 | 七卷 79 章 1029 课，编号/九段式/front matter/闸门 | `docs/` | [PROJECT_DOCS/02](./PROJECT_DOCS/02-content-system.md) |
| 交互系统 | 浮窗、判题、测验、viz/lab、笔记本、仓库、数据面板 | `src/pyrunner/` | [PROJECT_DOCS/03](./PROJECT_DOCS/03-interaction-system.md) |
| 视觉与布局 | 演算纸×朱砂 token、字体、断点、类名前缀、z-index | `src/css/` | [PROJECT_DOCS/04](./PROJECT_DOCS/04-design-system.md) |
| 数据与账号 | 命名空间 localStorage + 可选云同步 | `src/learning/` · `src/auth/` · `src/sync/` | [PROJECT_DOCS/05](./PROJECT_DOCS/05-data-and-accounts.md) |
| 构建与部署 | 三道闸门 + 出包 + 两种形态 | `package.json` / 出包脚本 | [PROJECT_DOCS/06](./PROJECT_DOCS/06-build-and-deploy.md) |
| 顶栏/首页/右栏 | swizzle 接管、首页视觉、挂件、侧栏折叠 | `src/theme/` | [UNIT_GUIDES/site-ui.md](./UNIT_GUIDES/site-ui.md) |
| 图谱双页 | /graph 阶梯版图（六级台阶×七卷，一章一卡一格一课）、/tree 课程家谱（一次看一门课的先修与后续） | `src/components/ml-home/` | [UNIT_GUIDES/graph-pages.md](./UNIT_GUIDES/graph-pages.md) |
| 浮窗/笔记本/仓库 | 滑块、槽位、层叠、模板库 | `src/pyrunner/` | [UNIT_GUIDES/console-notebook.md](./UNIT_GUIDES/console-notebook.md) |
| 看见函数 | 拼式子出图，2D/3D，四条对数与反三角口径 | `src/pyrunner/func/` | [UNIT_GUIDES/see-function.md](./UNIT_GUIDES/see-function.md) |
| 论文链接与归档 | 找源、验证、归档顺序 | `scripts/references-data.json` | [UNIT_GUIDES/paper-links.md](./UNIT_GUIDES/paper-links.md) |
| 云同步运维 | nginx 反代、CORS、本地测登录 | `server/` | [UNIT_GUIDES/sync-backend.md](./UNIT_GUIDES/sync-backend.md) |

图谱两页的分工是**刻意的分歧不是漏改**：`/tree` 筛选＝重排，`/graph` 筛选＝只压暗不重排。层级算法的唯一事实来源是 `ringLayout.js` 的头注释（同心环画法已退役，算法保留给两层布局复用）。

## 写课：动手前必读

1. [LESSON_TEMPLATE.md](./LESSON_TEMPLATE.md)（完整模板：九段式、四种围栏语法、术语表）。
2. [PROJECT_DOCS/02](./PROJECT_DOCS/02-content-system.md)（编号规则、front matter 字段、三道闸门、门数口径）。
3. **同章相邻课**——段号与写法照同章多数来（`## 6` 是「常见误区」还是「练习」各章不同）。

八条硬闸门：

1. **一课一概念**。难节点可以大胆详细，篇幅不限；超长先自查是否混入了第二个概念。
2. **可视化优先级**：专属定制交互 → `viz` 网页组件 → 浮窗 Python → 静态文字。能用上层不用下层。
3. **首现必注释**：Python 里第一次出现的语法/函数/参数必须有中文注释。校验器管不到注释，这是写作纪律。
4. **front matter 登记一切新工具**（`introduces_math / introduces_builtin / introduces_import`），`prereqs` 指向更前的课。
5. **标题禁带数字前缀**：读者可见文本（`title:`、index 导览、互链文字、台账条目）写纯课程标题。反例 `[20 · 形式化数学与证明助手]` ✗ → `[形式化数学与证明助手]` ✓。例外：`ROADMAP.md` / `UNIT_GUIDES/` 内部清单可带编号定位。
6. **段号同章一致**，全站不统一是历史现状；写新课前查同章相邻课。
7. **`@check` 实跑抄录**；正文「初始代码会输出 X」必须与实跑一致（Python `round` 是银行家舍入，`1` 与 `1.0` 打印不同）。
8. **前向指引必须 grep 核实**：写「第 N 章会讲 X」之前确认那一章真讲了。踩过四次（凭空写出的「第 24 章空间解析几何」根本不存在；CLT 在 36 章不在 38 章；高斯积分在 20 章不在 14 章）。

四种围栏速查（完整语法见模板）：`python`（自动获得「▶ 浮窗运行」，`title="…"` 渲染成块标题，`sliders:` 行注入变量）· `py`（片段，不注入按钮，`<details>` 解答区专用）· `exercise`（`# @title` / `# @check` 可多行 / `# @hint` + 初始代码）· `quiz`（题干 + `- 选项` + 正确项加 `[*]` + `?` 解释行）· `viz`（JSON，走 viz.js，冻结）· `lab`（JSON，走 lab 组件）。

内容原则：中文行文、通俗类比优先；先暴力算再猜规律再（选读）证明；**工具必须有出生证明**——引入 `sum/sqrt/random` 的那一课要先展示「没有它会怎样」。跨章重复只声明分工不删课，统一用 `:::note[与别章的分工]` 放在正文标题之前。

## 改 UI：动手前必读

1. [PROJECT_DOCS/04](./PROJECT_DOCS/04-design-system.md)（token、字体、断点 996/620/480、类名前缀、z-index 分层）。
2. 对应 `.css` 文件的头注释（`custom.css` 顶部有大段「为什么这么写」的账）。
3. 要改顶栏 / 首页 / 挂件 / 侧栏折叠，再读 [UNIT_GUIDES/site-ui.md](./UNIT_GUIDES/site-ui.md)；要改 /tree /graph，读 [UNIT_GUIDES/graph-pages.md](./UNIT_GUIDES/graph-pages.md)。

**顶栏**是 swizzle **整体接管**：改导航改 `src/theme/Navbar/index.js` 里的 `LINKS`，改 `docusaurus.config.js` 的 `navbar.items` 不会被渲染；外层必须保留 `navbar navbar--fixed-top`（sticky 与锚点偏移都挂在它上面）；搜索覆盖一律写 `.ml-nav .ml-nav__search .navbar__search-input` 三级选择器（两级会与插件撞权重）。

**Infima 变量覆盖必须写在 `body` 上，不是 `:root`**：Infima 把变量声明在 `:root:not(#\#):not(#\#)` 上（特异性 2,1,0），普通 `:root`（0,1,0）无论排多后面都压不过（实测主按钮仍是 Infima 蓝）。标题字族要走 `--ifm-heading-font-family` 这类变量。

**首页视觉**全部收在 `.ml-home` 作用域，不要写成全局规则。**七卷配色**只在 `custom.css` 的 `--ml-vol1…7`（亮/暗各一份）改；各页面一律用 `var(--ml-volN)` 取色（`.ml-rg` 别名已删除）。

**图谱三张图分工刻意错开**：首页章级树（`HomeTree.js`）、`/graph` 阶梯版图（全站版图与进度）、`/tree` 课程家谱（单课来路去向）。层级算法唯一事实来源仍是 `ringLayout.js` 头注释（同心环画法已退役，算法保留）。版图连线在挂载后量 DOM（ResizeObserver），平时不画线；`/graph` 课表必须 fetch `static/graph-chapters/NN.json`（失败要可见，不许静默白屏）；`/tree` 的焦点写地址栏 `?l=`（`history.push`，要能后退还原）。口径都在纯函数模块里（`atlasModel` / `lineageLayout` / `learnState`）。

## 改浮窗 / enhancer：动手前必读

1. [PROJECT_DOCS/03](./PROJECT_DOCS/03-interaction-system.md)（分派总表、两个可视化系统、判题口径）。
2. [UNIT_GUIDES/console-notebook.md](./UNIT_GUIDES/console-notebook.md)（滑块、槽位、HMR 跨代、层叠、模板库的全部坑）。

`enhancer.js` 的六条不可忘：

- 选择器基准 `pre[class*="language-"]`，语言从 `pre` 的 className 抓；容器是 `pre.closest('.theme-code-block')`。**不要用 `code.language-x`**（新版 Docusaurus 的 code 元素没有语言类）。
- 取源码必须按 `token-line` 逐行 join——`code.textContent` 没有换行。
- 每个注入点都要 `container.dataset.mlBound === '1'` 守卫（先判再取源+哈希，省掉每轮对已绑定块的白算）。
- 异步 `run()` 类函数必须有 running 重入守卫；练习判题走 `_ml_run`（全新沙盒），随手算/普通块走 `_ml_console_run`（持久命名空间）。
- **FAB 与面板是两段构建**：`enhanceAll()` 每页只调 `ensureFab()`（圆钮 + 快捷键，廉价）；面板的大坨 DOM/监听/`applySlot` 由 `ensureConsole()` 在真要打开时补齐。跨代逻辑：FAB 与面板各自 `__mlGen` 盖章、各自重建；面板开关函数挂在 `st._setOpen/_isOpen/_toolApi/closeLightbox` 上供 FAB 处理器取用。改这段前读函数头注释。
- 浮窗三条致命坑：① 模块级回调必须调 `st._run`（`run` 是 `ensureConsole()` 内部局部常量，直接调会在 260ms 防抖后 `ReferenceError`）；② `toJs({depth:1})` 必须带 `dict_converter: Object.fromEntries`（否则 Python dict 变 Map、滑块值全 undefined）；③ HMR 跨代重建靠 `window.__mlEnhancerGen` 盖章 + 完整槽位元数据恢复。

**localStorage key 清单**（改数据前先看这张表，别自创新 key）：`ml-progress:<ns>` / `ml-exercises:<ns>` / `ml-last:<ns>` / `ml-notebook:<ns>` / `ml-repo:<ns>` / `ml-snapshot:<ns>` / `ml-auth` / `ml-console` / `ml-console-mode` / `ml-auth-fail` / `ml-sync-state`。`ml-exercise-drafts` 是旧版遗留，只读兼容。完整说明见 [PROJECT_DOCS/05](./PROJECT_DOCS/05-data-and-accounts.md)。

## 参考资料与论文归档：动手命令

**唯一数据源是 `scripts/references-data.json`**，各章 `999-references.md` 是生成物。

```bat
node scripts/gen-references.mjs          :: 把数据写成各章 999-references.md
node scripts/gen-references.mjs --check  :: 只体检不写（validate 会调；落后即硬错误）

:: 要归档 PDF 时（顺序不能反：先有文件，生成器才肯写 @local64）
node scripts/fetch-papers.mjs            :: 抓进 static/papers/（--force 全量 / --check 体检）
node scripts/gen-references.mjs
```

- 每条文献是一个 `paper` 围栏：`# @title/@authors/@year/@venue/@tag/@desc/@page/@pdf64`，由 `enhancer.enhancePapers()` 渲染成卡片。
- PDF 链接以 `@pdf64`（base64）写入、客户端解码——**混淆不是加密**。手写条目仍可写明文 `@pdf`。
- `static/papers/` 不入库，`scripts/papers-local.json` 入库；没有副本时站点自然退化成「全部走原始地址」，不会死链。
- 条目正文不放行内公式（MDX 塌陷风险）。找源、Range 魔数验证、失败码案例见 [UNIT_GUIDES/paper-links.md](./UNIT_GUIDES/paper-links.md)。

## 闸门之外的低频脚本（想查的时候手动跑）

| 命令 | 查什么 |
| --- | --- |
| `node scripts/check-index-links.mjs [docs目录]` | 章首页是否漏收本章课（有漏收退出码 1） |
| `node scripts/check-links.mjs [docs目录]` | 课内相对链接断链（默认解析 `<仓库根>/docs`；有断链退出码 1，`--warn` 只报不拦） |
| `node scripts/check-lab-syntax.mjs` | lab 组件语法（复制成 `.mjs` 后 `node --check`，绕开 CommonJS 误报） |
| `node scripts/check-lab-registry.mjs` | lab 围栏 `type` ↔ 注册表交叉核对：**用了没登记 / 登记了没文件 / type 重复 / 围栏 JSON 坏死**四种静默失效（build 与 validate 都不拦） |
| `node scripts/lab-engine-selftest.mjs` | 六个数值引擎的数学正确性 |
| `node scripts/check-graph-drill.mjs` | `/graph` 阶梯版图 + `/tree` 课程家谱运行时验收（**先 `npm run build`**；playwright 可选，`PLAYWRIGHT_DIR` 指包目录、`PW_CHANNEL=msedge` 用本机 Edge） |
| `node scripts/audit-unit-guides.mjs` | `UNIT_GUIDES/` 里的章号引用审计（旧号段复活、章号越界） |
| `python scripts/audit-py-syntax.py docs` | 全部 `python` / `exercise` 块 `compile()`（刻意不收 `py` 片段） |
| `python scripts/audit-py-checks.py docs` | `@check` 期望值的小数位数分布（位数越多越脆） |
| `python scripts/audit-py-solutions.py docs --run` | 抽参考答案实跑，验证 `@check` 真能跑出来（**不加 `--run` 只做静态抽取**） |
| `node scripts/check-answer-leak.mjs docs` | 判题泄露体检（P0 清零才算过）：初始代码是否原样就能过 `@check`、**无条件** `print` 是否多于 `@check` 行数、初始代码是否自己就报错、hint 或打印字面量是否直接给答案。刻意的「一跑就抛错」题要在围栏里写 `# @expect-error: 原因` 才豁免 |
| `npm run check:py-run` | **在浏览器同款运行时里真跑**每个 `python` 块（`compile()` 证明不了跑得起来）。运行时是 Pyodide v0.26.4 = CPython 3.12 / matplotlib 3.5.2 / numpy 1.26.4，首次先跑 `npm run setup:pyodide-runtime` 备齐。**别用本机 python 代替**：本机 3.14 + matplotlib 3.11 的口径会把浏览器里正常的课文报成缺陷（`boxplot(labels=…)` 就是活例，3.5.2 有这个参数、3.11 已删）。跨文件会清命名空间与 pyplot 状态，同页之内则按浏览器语义保留持久命名空间 |

## 提交前自测（改交互系统时）

1. `npm run build` 通过（含 `validate` + `check:sync` + `mechanical-audit`）。
2. 手测三类块：`python` 能开浮窗并运行、`quiz` 替换成卡片、`exercise` 判题通过与失败各一次。
3. 路由前进后退各一次，确认**没有重复注入**（`dataset.mlBound` 守卫生效）。
4. `npm run clear` 后再跑一遍（缓存造成的假象最常见）。
5. `@media (pointer: coarse)` 下确认圆钮与面板不挡正文。
6. 页面控制台零报错；改动涉及浮窗与笔记本时，两者各开关一次、跨页再开一次。

## 已知坑

### MDX 静默降级（最阴险，构建不报错）

以下写法会让**该课从出错行起整体塌成纯文本**（`##` 标题、代码围栏全部失效），而 `npm run build` 照样绿：

| 坑 | 对策 |
| --- | --- |
| 行内公式里出现字面 `\{` 或 `\}`（如 `$\{1,2\}$`） | 改 `\lbrace` / `\rbrace`（KaTeX 等价）；**替换后补一个空格**，否则变成未定义命令 `\lbraceX`（KaTeX 不报构建错） |
| 显示公式 `$$…$$` 跨多行 | 一律写成**单行**（再长也要一行） |

体检：`npm run build` 的最后一步 `mechanical-audit.cjs` 会对比每课源 `^## ` 行数与产物 `<h2` 数量，不等即 problems 阻断。它也会扫字面 `\{` / `\}`、多行 `$$`、quiz 里的 `$`。

### Windows 环境（都踩过）

| 坑 | 对策 |
| --- | --- |
| PS5.1 的 `Set-Content -Encoding UTF8` 会加 BOM | 用 `[System.IO.File]::WriteAllText(path, text, New-Object UTF8Encoding($false))` |
| PS5.1 读无 BOM UTF-8 按 GBK | 批量文本处理用 node，别用 `Get-Content -Raw` 回写 |
| dev server 默认只绑 IPv4，`localhost` 解析成 `::1` 连不上 | start 脚本已带 `--host ::`，别删 |
| 系统代理（Clash 等）劫持 localhost 测试请求 | 用 `node -e "fetch(…)"` 验证；文档里提醒用户 TUN 模式加白 |
| terser 把中文转义成 `\uXXXX` | 在 bundle 里搜中文字符串要同时搜转义形式 |
| node 脚本里用 `String.replace` 插入含 `$` 的文本 | 反引号、`$'`、`$&` 都是替换特殊序列，会注入整段前缀/后缀（曾把 AGENTS.md 复制一份）。改用 split/join 或函数替换器 |
| PowerShell 管道 `Get-Content \| node --check` 假语法错误 | 管道会把 UTF-8 重编码成 GBK 毁掉中文（正则里中文变 `???` 报 "Nothing to repeat"）。用 `cmd /c "node --check < file"` 走原字节 stdin |
| 「改了代码用户还说没效果」 | 端口上跑的是旧 dev server 进程。先确认 9452 上是不是当前代码，必要时 `npm start -- --port 3000` 或杀旧进程 |
| `cmd 2>&1` 把 stdout 变成 CLIXML 噪音流 | 要读脚本输出就 `node x.mjs \| Out-File -Encoding utf8 _out.txt` 再 `Get-Content -Tail`；判断成败看 `$LASTEXITCODE` |
| 正则批量改 `docs/**.md` 匹配不到（文件是 CRLF） | 模式里一律写 `\r?\n`；替换时把行尾捕获进分组回写，别把文件改成混合行尾 |
| 块注释里出现 `*/` 会提前闭合注释 | 写 `docs/NN-*` 路径时换个说法，或把 `*` 与 `/` 拆开 |
| dev server 多次热编译后 OOM / Rspack 缓存损坏 | 先 `NODE_OPTIONS=--max-old-space-size=8192`，再 `npx.cmd docusaurus clear` |

### 调试与 E2E

- **node 探测 dev server 必须带 `Accept: text/html` 请求头**，否则所有非 `/` 页面返回 Express 风格 `Cannot GET /xxx` 404（history fallback 只对 `Accept: text/html` 生效）。浏览器正常但 node fetch 全 404 先查这个。
- **站点路由剥数字前缀**：`/docs/arithmetic/division`，不是 `/docs/01-arithmetic/40-division`。路由 404 排查顺序：确认客户端 h1 是不是「找不到页面」（history fallback 让任何路径都 HTTP 200，node fetch 200 ≠ 路由存在）→ 查 `.docusaurus/routes.js` → `npm run clear`。
- **`999-references.md` 的 git stat 假阳性**：被生成器重写后 git 全显示 M，实际内容一致。`git add -u; git reset -q` 刷新索引即可。
- **站点没有 favicon**：`/favicon.ico` 404 会在控制台留一条无地址的错误，E2E 断言「零 console error」之前先拦掉它，否则每次都假红。

### 两个口径（最容易搞错）

- **门数**：`validate.mjs` 报的是**全量 markdown 文件数**（含 index / references / intro，当前 1191）；**正式课 1029** 要减 `index.md` / `999-references.md` / `COMPONENT_SPEC.md` / `docs/intro.md` 并排除 17 章 3 门导览课。`check:sync` 与 `gen-graph` 用后者。完整推导见 [PROJECT_DOCS/02](./PROJECT_DOCS/02-content-system.md)。
- **章节信息**：`docs/NN-*/index.md` 的 `title/short/volume` 是唯一源头 → `gen-graph.mjs` → `full-graph-data.js` 的 `CHAPTER_INFO` → 首页/知识树/图谱。`check-chapter-sync.mjs` 守着这条链。章首页 `title` 带排版前缀（`第 16 章 · …`），比对时要脱掉 `^第 \d+ 章 · `；`gen-graph.mjs` 与 `check-chapter-sync.mjs` 各有一份 `stripPrefix`，两边口径必须一致。

## 七卷速查（章号即学习顺序）

| 卷 | 章 | 主题 | 定位 |
| --- | --- | --- | --- |
| 卷一 | 00–16（+17 导览） | 数学地基：算术→代数→函数→微积分→级数→傅里叶枢纽 | 全部可交互，工具都有出生证明 |
| 卷二 | 18–26 | 数学语言、实分析、多元、线代进阶、ODE/PDE、复分析、测度、泛函 | 从计算工具走向严格结构 |
| 卷三 | 27–35 | 逻辑集合、组合、图论、算法、自动机、可计算性、代数结构、密码、编码 | 离散与计算语言 |
| 卷四 | 36–42 | 概率进阶、随机过程、统计推断、贝叶斯、信息论、学习理论、因果 | 不确定性下做推断 |
| 卷五 | 43–67 | 优化、深度学习、Transformer、生成模型、RL、可信 AI、信号/通信/图形/机器人、随机分析、范畴论 | 应用 AI 与工程前沿 |
| 卷六 | 68–75 | 电子电路→数字系统→计算机系统→机械→机电→音频→语音→图像 | **落地卷**：只引用前五卷，不发明新数学 |
| 卷七 | 76–78 | 相对论、哈密顿力学、脑机接口 | 把数学搬到物理与神经科学 |

新增卷号要同步四处：`scripts/validate.mjs` 的 `REGISTRY.volume` 与 `expectedVolume()`、`src/pyrunner/lab/registry.js` 的分册 import、`src/components/ml-home/data.js` 的 `VOLUMES` 文案、`src/css/custom.css` 的 `--ml-volN`（亮/暗各一份）。**章名、章属卷号、课数不在这里写**——它们在各自 `index.md` 的 front matter 里。

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
2. 改交互系统后：build 通过 + 手测三类块（python/quiz/exercise）+ 浮窗开关 + 路由切换后无重复注入。
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

冲突时按 **AGENTS.md → VISION.md → ROADMAP.md → LESSON_TEMPLATE.md → PROJECT_DOCS/* → UNIT_GUIDES/*** 裁决。生产代理只在分配目录内改课和实现已批准组件；审查代理只读，不改源码。既有 URL、`lesson_id`、冻结编号（00–17）与历史台账结论不得私自改写。

审查发现分三级：**P0**（数学错误、判题链断裂、页面塌陷、组件渲染错误、依赖倒置、红线命中）清零才能交付；**P1**（概念边界混乱、交互承诺失真、首现语法缺注释、移动端不可用）当轮修复；**P2**（风格、可延后的体验升级）登记后择期处理，处理完即删。详细分级与收尾清单见 [PROJECT_DOCS/07](./PROJECT_DOCS/07-maintenance.md)。

批量任务收尾必须报告：已完成文件、新增/复用组件、validate/build/h2 结果、浏览器抽测结果、未完成项与下一入口。不接受「基本完成」这类不可验证结论。新会话先跑 `npm run validate`，再读 `ROADMAP.md` 当前状态。

## 文档维护纪律

- **只留活口**：`ROADMAP.md` / `CONTENT_AUDIT.md` / `BACKFILL_LOG.md` 一律只登记**未完成**与**待改善**项；已交付批次的过程记录与已闭环报告不留存。证据以 `validate` + `build` 全绿为准。
- **勿写死数字快照**：门数 / 图谱规模一律写「以 `node scripts/validate.mjs` / `node scripts/check-chapter-sync.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准」。
- **细节下沉**：本文件只留硬规则与坑，实现细节写进 `UNIT_GUIDES/` 或 [PROJECT_DOCS/](./PROJECT_DOCS/)。新增文档要登记进 [PROJECT_DOCS/README.md](./PROJECT_DOCS/README.md) 的地图。
- 历史档案：`UNIT_GUIDES/CHANGELOG-2026-09.md` 是 2026-09 三个回路的过程记录，**是历史不是规范**；仍生效的结论已抄回本文件。