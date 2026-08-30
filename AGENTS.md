# AGENTS.md · AI 协作指南

本文件写给未来在这个仓库工作的 AI（以及人类协作者）。动手前先读完。

## 项目是什么

「数学阶梯」：从 1+1 到傅里叶变换的中文交互式数学教程。Docusaurus 3 静态站，核心是**客户端 DOM 增强系统**（`src/pyrunner/enhancer.js`）：扫描 `pre[class*="language-"]`（语言类在 pre 和外层 `.theme-code-block` 容器上，**不在 code 元素上**），按语言分派：

- `language-python` → 在容器的 buttonGroup 里注入「▶ 浮窗运行」按钮，点击把代码装进浮窗控制台运行；
- `language-exercise` → 注入「▶ 在浮窗作答」按钮，浮窗进入判题模式（对照 @check 输出）；
- `language-quiz` → 隐藏原容器，把内嵌测验卡片插到其后（不删除 React 节点，水合安全）；
- `language-paper` → 隐藏原容器，把论文文献卡插到其后（PDF 下载按钮走登录门禁，`@pdf64` 客户端解码）。

所有 Python 执行都发生在浮窗（Pyodide 单例）。正文代码块保持原生渲染（保留复制按钮），不做 DOM 手术。

## 常用命令

```bat
npm start          # 开发预览（已配置 --host :: 双栈监听）
npm run build      # 构建前自动执行 validate，不通过则中止
npm run validate   # 单独跑课程闭环校验
npm run clear      # 清缓存（行为诡异时第一步）
```

测试/脚本一律用 node 执行 fetch 等验证；**不要用 PowerShell 的 Invoke-WebRequest 测 localhost**（系统代理会返回假 404）。

## 目录结构

```
docs/NN-chapter/MM-lesson.md   # 全部课程内容（纯 markdown，禁用 .mdx）
docs/17-what-next/             # 「下一程导读」导览章：不入图谱/知识树（gen-graph.mjs 与 ui/server.mjs 均排除 17- 前缀），豁免九段式
src/pyrunner/enhancer.js       # 核心：浮窗控制台/按钮注入/测验/判题/进度
src/pyrunner/viz.js            # HTML 原生可视化：numberline / plot / sines
src/theme/Root/index.js        # MutationObserver 入口，路由变化后重扫描
src/theme/TOCItems/index.js    # 右栏挂件 swizzle：目录上方渲染前置知识 + 学习进度条
src/components/doc-widgets/    # PrereqPanel 等文档页挂件组件（正文/右栏两处复用）
src/pages/index.js             # 首页（演算纸视觉体系，样式全在 home.css 的 .ml-home 作用域内）
src/pages/tree.js              # /tree 知识树页（章节/单元双模式 + 搜索 + 巨大画布，KnowledgeGraphTree v2）
src/pages/graph.js             # /graph 知识图谱页（逐课泳道，KnowledgeGraphFull）
src/components/ml-home/        # 首页数据与组件：data.js(章节/卷册聚合)、full-graph-data.js(生成器产物勿手改)、HomeTree(章级树)、KnowledgeGraphTree(知识树v2)、treeLayout.js(纯布局引擎：排除第0章/章节聚合/重心交叉消减/祖先后代位图)
scripts/validate.mjs           # 方法准入 + 依赖顺序校验（构建闸门）
scripts/references-data.json   # 各章论文/文献数据（单一事实来源，手改这个）
scripts/gen-references.mjs     # 生成各章 999-references.md 参考资料条目（含 paper 围栏）
scripts/add-user.mjs           # 账号开通/重置/删除（仅站方本地使用，详见 REGISTRATION.md）
src/auth/index.js              # 登录态与 SHA-256（localStorage ml-auth；无公开注册）
src/data/accounts.json         # 账号库（salt+哈希，不存明文；构建时打进 bundle）
src/pages/login.js             # /login 登录页（默认账号直登，无注册/申请页）
REGISTRATION.md                # 账号与进度机制说明（维护者向，链接本文件）
ui/                            # 独立阅读前端（与 Docusaurus 主站并存，端口 9453/9454）
  server.mjs                   #   node 原生 http 双皮肤服务器（--skin fluent|hud --port N）
  render.mjs                   #   markdown→HTML 管线（marked + KaTeX 服务端渲染 + 自定义围栏卡片）
  fluent/                      #   雅致版皮肤（Fluent/Win11 风，端口 9453，入口 启动FluentUI.bat）
  hud/                         #   科幻版皮肤（FUI/HUD 风，端口 9454，入口 启动科幻UI.bat）
UNIT_GUIDES/                   # 单章课题切分与专属组件规格
AUDIT_REPORTS/OPEN_ITEMS.md    # 未结项与待改善清单（唯一留存的活口；处理完即删行）
LESSON_TEMPLATE.md             # 写课模板·单一事实来源（先读这个）
BACKFILL_LOG.md                # 未完成缺口台账（含回填铁律）
ROADMAP.md                     # 课程路线图 + 未完成进度 checkbox（读者侧入口是站内 /graph 知识图谱页）
CONTENT_AUDIT.md               # 现行内容口径 + 发布自检纪律
mechanical-audit.cjs           # 机械体检：h2 源/产物比对 + Python/viz 块扫描
```

### 参考资料条目与账号体系（2026-08-29 新增）

- **参考资料条目**：每章一个 `docs/NN-chapter/999-references.md`（编号 999 保证侧边栏垫底）。内容**只改 `scripts/references-data.json` 然后跑 `node scripts/gen-references.mjs`**（`--check` 模式可做闸门），不要手改生成的 md。每条文献是一个 ` ```paper ` 围栏（`# @title/@authors/@year/@venue/@tag/@desc/@page/@pdf64`），由 `enhancer.js` 的 `enhancePapers()` 渲染成文献卡（隐藏原容器 + 插卡，与 quiz 同一套水合安全模式）。**PDF 链接以 `@pdf64`（base64）写入条目**、客户端解码——静态 HTML 源码不再直接可读；这是混淆不是加密（边界声明见 REGISTRATION.md），手写条目仍可用明文 `@pdf`（两种写法兼容）。**validate.mjs 已挂双检查**：999-references 落后于 references-data.json → 硬错误；新章缺资料数据 → 警告。
- **排除口径与 17- 章一致**：`999-references.md` 不进知识图谱/知识树/首页统计（gen-graph.mjs 已排除）、不进独立阅读前端课程列表（ui/server.mjs 已排除），但进 Docusaurus 侧边栏与全站搜索。改完数据后重跑 gen-graph.mjs 同步 full-graph-data.js。
- **论文链接纪律**：arXiv ID 只写验证过的高把握条目（abs 页 + `arxiv.org/pdf/<id>` 下载链）；没把握的文献只给稳定的 Wikipedia/官网页面（`@page`），**宁缺毋滥，不编造 ID**。条目正文不放行内公式（MDX 塌陷风险）。
- **账号与进度体系（2026-08-29 晚间改版：无申请页，默认账号直登，进度全开放）**：登录页 `/login`（`src/pages/login.js`）直接展示默认账号（`admin` / `ml-2026`）；站内无注册页、无申请页（原 `/registration` 已删，导航只留「登录」）。追加账号仍用 `node scripts/add-user.mjs <用户名> <显示名> <密码>`（`--list`/`--remove` 见 `REGISTRATION.md`）。账号库 `src/data/accounts.json` 只存 salt+SHA-256 哈希；哈希口径在 `src/auth/index.js`（自实现 SHA-256，已与 node:crypto 做一致性测试）与 add-user.mjs 两侧一致。
- **进度系统（命名空间存储）**：进度对所有人开放——未登录存本地游客空间 `ml-progress:guest` / `ml-exercises:guest`，登录后存 `ml-progress:<用户名>` 等账号空间（同一浏览器多账号互不混淆）；旧版无命名空间 key 由 `migrateLegacyProgress()` 首扫自动迁移。文末进度按钮标记后 dispatch `ml-progress-changed` 事件，右栏进度条监听同步。`enhanceProgress` 清除按钮只清当前空间。
- **论文下载**：paper 卡片的 PDF 下载与文献页面对所有人开放，无登录门禁（`enhancer.js` 的 `buildPaperCard` 直接 `window.open`）。
- **右栏挂件（2026-08-29）**：`src/theme/TOCItems/index.js`（swizzle wrap）在右栏目录上方渲染「前置知识面板 + 学习进度条」；前置知识面板组件抽到 `src/components/doc-widgets/PrereqPanel.js` 供两处复用——正文内实例（`variant="inline"`）桌面隐藏、窄屏横条；右栏实例（`variant="toc"`）窄屏隐藏。阅读区拉宽：`main[class*='docMainContainer']` 容器 1140→1360px、正文列 58%→76%。

### 首页与章级知识树（2026-08 重做）

- 首页视觉 = 「演算纸 × 印章朱砂」：方格纸网格底纹（`.ml-gridbg`）、暖纸底、衬线大标题、朱砂印章/书签条、印刷硬阴影。全部设计变量收在 `.ml-home` 作用域（home.css 顶部），**不要写成全局规则**，避免污染站内其他页面；英雄区规则必须带 `.ml-home .ml-hero` 前缀压过 custom.css 的旧 `.ml-hero`。
- **标题字体/字号必须走 Infima 变量**：Infima 的标题规则是 `h1:not(#\#):not(#\#)`（双 ID 特异性），任何类选择器都压不过；在 `.ml-home` 上改 `--ifm-heading-font-family / --ifm-h1-font-size / --ifm-h2-font-size`，小标题用 `.ml-home main h3 { --ifm-heading-font-family: ... }` 按元素继承退回无衬线。
- `HomeTree.js`（章级树）交互：滚动入场逐层生长 + 「重播生长」；**点击章节胶囊＝聚焦**——沿跨章先修边求上/下闭包，无关章节隐藏、可见各层横向重新居中（与 KnowledgeGraphTree 同一套 shifted 算法），绿=先修、橙=托起；双击或信息条按钮进入本章。实现要点：入场动画的逐节点 delay 在 SETTLE_MS 后统一清零（settled 状态），否则筛选切换会被旧延迟拖慢。

### 知识树页 /tree v2（2026-08-29 重做：双模式 + 排除第 0 章）

- `/tree` 页（`KnowledgeGraphTree.js`）**重做为双模式**：顶部分段控件切「章节模式」（课级先修边聚合到章）与「单元模式」（逐课展开）。两种模式共用同一套巨大画布（平移/缩放/全屏）与交互，只是节点粒度不同。
- **排除第 0 章**：`treeLayout.js` 的 `filterCh0()` 在模块加载时把 `NODES` 里 `ch === 0`（Python 工具箱）整章剔除，并重映射 `EDGES`/`USE_AGG` 索引——第 0 章不再作为旁支挂根。注意这是**树页的视图层过滤**，不改 `full-graph-data.js` 源数据（/graph 与首页仍含第 0 章）。
- **纯布局引擎 `treeLayout.js`**（无 React 依赖，可用 node 单测）：`layeredLayout()` 做「最长路径分层 + 重心法交叉消减（Sugiyama 简化）+ 主父子树择优 + 逐层居中」，并预生成祖先/后代 `Uint8Array` 位图供渲染期 O(1) 判属；`aggregateChapters()` 聚合章级边；`chainOf()`/`popcount()` 供信息面板。**布局与位图都在模块加载时算一次**，不随悬停重算。
- **搜索**：实时高亮命中（`is-search`），回车定位并循环轮询（`jumpTo(i, 1)` 同步平移缩放 + 聚焦筛选）；点击胶囊 `jumpTo(i)` 保留当前缩放只居中。
- **性能取舍**：平移/缩放走直接 DOM（绕开 React 渲染）；悬停只高亮连通路径（绿先修/橙托起）、**不再整图暗化**（减少 ~1700 元素的重绘）；入场用层级错峰（无 IntersectionObserver 千余观察者）。主干先修边与「跨线支撑」边分层着色（`.ml-tr__edge--branch` 虚线淡入）。
- 样式在 `home.css` 末尾「知识树 v2」段（`.ml-tr__modes`/`.ml-tr__searchwrap`/`.ml-tr__legend`/`.ml-tr__edge--branch` 等）。

### 独立阅读前端 ui/（2026-08-28 两套皮肤完全重做）

- 定位：**静态为主 + 本地可玩**的两套独立阅读前端。公式服务端 KaTeX 渲染；quiz 客户端可点（答案仅 base64 混淆存 `data-qk`）；exercise/python 卡的「浮窗运行」由皮肤内置浮窗 Pyodide 控制台完成（判题走全新沙盒 `_ml_run`，随手算/python 卡走持久 `_ml_console_run`，matplotlib 懒加载出图）；viz 渲染为占位卡并链接主站对应页（`mainSiteLink`：目录与文件名都剥数字前缀）。
- **每套皮肤目录自包含**：`fluent/`（Win11 雅致风）与 `hud/`（FUI/HUD 科幻风）各自拥有 index.html + style.css + app.js + console.js + graph.js，互不引用、无 shared/ 目录；后端 `server.mjs`/`render.mjs` 不感知皮肤。
- `server.mjs`：node 原生 http，`--skin fluent|hud --port N`；`/api/meta`（章/课/卷册/edges/flat）、`/api/lesson?id=NN-dir/MM-file`（含 prev/next/prereqs/mainLink/interactive 计数）；`/vendor/*` 映射 `node_modules/katex/dist`（字体依赖这个映射）。lessonCache 上限 120。两个端口实例都服务整个 `ui/` 静态目录。
- `render.mjs` 管线顺序固定：`:::`提示块折叠 → 围栏保护（token `XQFENCEnQFX`）→ `$$`/`$` 数学保护（token `XQTEX..QFX`）→ marked → KaTeX 回填 → 卡片回填 → 相对 `.md` 链接改写为 hash 路由 → 与 fm.title 相同的首个 H1 去重。改顺序前先想清楚 token 生命周期。
- 皮肤合同：hash 路由 `#/`、`#/chap/NN-dir`、`#/read/NN-dir/MM-file`、`#/graph`；localStorage 只允许三个 key：`ml-ui-progress`（`{id:true}`，各端口 origin 隔离，互不相通是特性）、`ml-ui-console`（浮窗草稿）、`ml-ui-exercises`（判题通过，payload djb2 哈希为 key）。Pyodide v0.26.4，CDN 顺序 npmmirror → jsdelivr → gcore.jsdelivr（各 15s 超时）。
- 新增依赖需谨慎：`marked` 是唯一的渲染依赖（KaTeX 复用主站已有）。大改后用 node fetch 对 `/api/lesson` 全量跑一遍「无 XQ token 残留」体检；JS 语法检查用 `Get-Content -Raw -Encoding UTF8 | node --input-type=module --check`。
- viz 交互（2026-08-28）：`render.mjs` 把完整 spec 写进卡片的 `data-viz` 属性；皮肤内置 `viz.js` 就地渲染 10 类通用组件（plot/datachart/seq/sines/unitcircle/wave/dice/statdots/coinlaw/counting，覆盖全站约 55% 用量），其余章节专属类型保留占位卡走主站链接。canvas 颜色走皮肤各自定义的 `--viz-*` 变量。
- 主站内容页右上角「前置知识」面板（2026-08-28）：`src/theme/DocItem/Layout/index.js` swizzle 用 `useDoc`（`@docusaurus/plugin-content-docs/client`）读 front matter 的 `prereqs`，经 `full-graph-data.js` 的 `NODES` 反查标题与链接；样式在 `custom.css` 的 `.ml-prereq`（桌面右浮动，≤996px 变正文顶部横条）。注意 theme-common/internal 里没有 docs 数据 hook。

## 写课规范

**完整模板在 `LESSON_TEMPLATE.md`**（九段式骨架、viz/exercise/quiz 全语法、参考实现索引）。这里只列硬闸门：

1. 一课一概念（难节点章节可大胆详细，篇幅与时长不限；超长先自查是否混入第二概念）。
2. 可视化优先级：`viz`（HTML 即时交互）→ 浮窗 Python → 静态文字。能用上层不用下层。
3. Python 代码里**第一次出现**的任何语法/函数/参数必须有中文注释。
4. front matter 登记一切新工具（introduces_math / introduces_builtin / introduces_import），prereqs 指向更前的课。
5. `npm run validate` + `npm run build` 全绿才算完成。
6. **标题禁带数字前缀**：读者可见文本（front matter `title:`、index 导览、课程互链文字、报告与台账条目）一律写纯课程标题，**不写「NN ·」前缀**——编号只存在于文件名 `MM-slug.md`。
   反例 `[20 · 形式化数学与证明助手](./20-formal-proof-assistant.md)` ✗ → 正例 `[形式化数学与证明助手](./20-formal-proof-assistant.md)` ✓。
   （例外：`ROADMAP.md` / `UNIT_GUIDES/` 维护者内部清单可保留编号定位。）

## 三种互动组件的语法

### 判题式练习（优先用这个）

````md
```exercise
# @title: 练习标题
# @check: 期望输出第一行
# @check: 第二行（可多行，逐行比对，空行折叠）
# @hint: 卡住时给的提示
初始代码（设计成能跑但结果不对，让学生改到通过）
```
````

学生改动自动存 `ml-exercise-drafts`，通过记录存 `ml-exercises`（localStorage）。key 是内容哈希，改动初始代码会使旧草稿失效——这是特性。

### 选择题

````md
```quiz
问题文本（纯文字，不要放 KaTeX）？
- 错误选项
- 正确选项 [*]
? 解释文字（答对后显示）
```
````

### 可运行代码块

任何 ` ```python ` 围栏自动获得「▶ 浮窗运行」按钮：代码装进浮窗后可自由修改运行，matplotlib 出图自动显示。标题写在 fence 元信息 `title="..."`（渲染为 codeBlockTitle div）。

### 浮窗控制台

全站右下角 Py 按钮（Alt+P）。多槽位草稿：scratch 是随手算（持久命名空间、变量跨次保留）；从课程块/练习进入时是独立槽位（练习用全新沙盒执行）。「← 随手算」一键切回。

## 内容原则

- **可视化优先级金字塔**：`viz` 网页组件（零等待、人人可玩）→ 浮窗 Python 滑块实验（改代码级）→ 静态文字。同一实验优先提供 viz 版，Python 版作为深入与兜底。
- **一课一概念**：发现要"顺便讲 X"就拆新课，用编号缝隙插入。
- **首现必注释**：Python 任何首次出现的语法/函数/参数都要中文注释——校验器管不到注释，这是写作纪律。
- **工具必须有出生证明**：引入 sum/sqrt/random 这类东西的那一课，要先展示"没有它会怎样"。
- 中文行文，通俗类比优先；先暴力算再猜规律再（选读）证明。

## Windows 环境已知坑（都踩过）

| 坑 | 对策 |
| --- | --- |
| PS5.1 `Set-Content -Encoding UTF8` 会加 BOM | 改用 `[System.IO.File]::WriteAllText(path, text, new UTF8Encoding($false))` |
| PS5.1 读无 BOM UTF-8 按 GBK | 批量文本处理用 node，不要用 Get-Content/Raw 回写 |
| dev server 默认只绑 IPv4，localhost 解析成 ::1 连不上 | start 脚本已带 `--host ::`，别删 |
| 系统代理(Clash 等)劫持 localhost 测试请求 | 用 node fetch 验证；文档里提醒用户 TUN 模式加白 |
| terser 把中文转义成 `\uXXXX` | 在 bundle 里搜中文字符串要同时搜转义形式 |
| node 脚本里用 String.replace 插入含 `$` 的文本 | `$``、`$'`、$& 是替换特殊序列，会注入整段前缀/后缀（本次已踩：AGENTS.md 被复制一份）。改用 split/join 或函数替换器 |

## MDX 静默降级（最阴险的坑，构建不报错）

以下两种写法会让**该课从出错行起整体塌成纯文本**（`##` 标题、代码围栏全部失效），且 `npm run build` 照样绿：

| 坑 | 对策 |
| --- | --- |
| 行内公式里出现 `\{` 或 `\}`（如 `$\{1,2\}$`） | 改用 `\lbrace` / `\rbrace`（KaTeX 等价，不含字面花括号） |
| 显示公式 `$$...$$` 跨多行书写 | 显示公式**一律写成单行**（再长也要一行） |

体检方法（改完数学公式后必做）：对比 build 产物 `<h2` 数量与源文件 `^## ` 行数，或直接在页面里搜字面量 `## `。两者任一不匹配即为中招。

## 修改 enhancer.js 的注意事项

- 所有注入都有 dataset 守卫（容器的 mlBound）防 MutationObserver 死循环，新组件必须照做。
- **选择器基准**：`pre[class*="language-"]`，语言从 pre 的 className 里抓；容器是 `pre.closest('.theme-code-block')`。不要用 `code.language-x`（新版 Docusaurus 的 code 元素没有语言类）。
- 取源码必须按 token-line 逐行 join——code 的 textContent 没有换行。
- quiz/viz 隐藏原生容器并把组件插在其后（绝不 remove，防 React removeChild 崩溃）；python/exercise 只往 buttonGroup 加按钮（复制按钮保留）。
- run() 类异步函数必须有 running 重入守卫；练习判题走 _ml_run（全新沙盒），随手算/普通块走 _ml_console_run（持久命名空间）。
- Pyodide 单例 + PREAMBLE 只注入一次；新增 Python 侧能力往 PREAMBLE 里加 _ml_ 前缀函数。
- localStorage key 清单：ml-progress（学完标记）/ ml-exercises（判题通过）/ ml-exercise-drafts（旧版遗留，只读兼容）/ ml-console（drafts 多槽位草稿 + pos）。

## 工作流

1. 从 ROADMAP.md 挑未完成课程 → 按规范写 → `npm run validate && npm run build` 全绿 → 勾掉 checkbox。
2. 改交互系统后：build 通过 + 手测三类块（python/quiz/exercise）+ 浮窗开关 + 路由切换后无重复注入。
3. 大改动前可以先派子代理做对抗式审查（历史证明很值：上一轮抓到答案泄露级 bug）。

## 内容生产流水线（新章节/批量改动必走）

1. **规划先行**：动笔前读 VISION（层级/支线/卷册/编号总表）+ LESSON_TEMPLATE + 本文件；跨章专属组件先汇总清单再实现，防重复造轮子。
2. **集群生成**：多个子代理并行分区生产，按目录切分零重叠；每区携带全量规范上下文与统一术语表。
3. **整理线程**：集群完成后一个子代理汇总各区产物，统一术语/front matter 体例/组件命名，产出变更清单。
4. **批量对抗审核**：独立子代理只审不改——判题链实测、viz spec 对照渲染器、MDX 双坑体检（`\{` `\}` 与多行 `$$`）、首现注释抽查、prereqs 顺序、h2 计数比对。
5. **终检合并**：审核问题回炉后一个子线程终检，validate + build 全绿 + h2 体检（`node mechanical-audit.cjs`）通过才算交付。
6. **提示词模板要点**：每个代理 prompt 必须自带（a）判定标准全文（b）硬红线（c）输出格式（d）报告落盘路径。

## 生产与审查合同

冲突时按 `AGENTS.md → VISION.md → ROADMAP.md → LESSON_TEMPLATE.md → 对应 UNIT_GUIDES/*.md` 裁决。生产代理只在分配目录内改课和实现已批准组件；审查代理只读，不改源码。既有 URL、`lesson_id`、冻结编号和历史台账结论不得私自改写。

审查发现分三级：

- **P0**：数学错误、判题链断裂、页面塌陷、组件渲染错误、依赖倒置或红线命中。清零才能交付。
- **P1**：概念边界混乱、交互承诺失真、首现语法缺注释、移动端不可用或明显误导。当轮修复。
- **P2**：风格不一致、可延后的体验升级和非阻塞边界补强。登记到 `AUDIT_REPORTS/OPEN_ITEMS.md` 后择期处理（处理完即删除该行）。

批量任务收尾必须报告：已完成文件、新增/复用组件、validate/build/h2 结果、浏览器抽测结果、未完成项和下一入口。不接受"基本完成"这类不可验证结论。新会话先跑 `npm run validate`，再读 `ROADMAP.md` 当前状态与 `AUDIT_REPORTS/OPEN_ITEMS.md`。

## 文档维护纪律

- **只留活口**：`BACKFILL_LOG.md` / `CONTENT_AUDIT.md` / `ROADMAP.md` / `AUDIT_REPORTS/OPEN_ITEMS.md` 一律只登记**未完成**与**待改善**项。已交付批次的过程记录、已闭环的审计报告不留存——证据以 `npm run validate` + `npm run build` 全绿为准，课程本体与各章 index 才是课程清单的事实来源。
- **勿写死数字快照**：门数/图谱规模一律写"以 `node scripts/validate.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准"，避免文档随每次生产腐烂。
