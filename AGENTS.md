# AGENTS.md · AI 协作指南

本文件写给未来在这个仓库工作的 AI（以及人类协作者）。动手前先读完。

## 项目是什么

「数学阶梯」：从 1+1 到傅里叶变换的中文交互式数学教程。Docusaurus 3 静态站，核心是**客户端 DOM 增强系统**（`src/pyrunner/enhancer.js`）：扫描 `pre[class*="language-"]`（语言类在 pre 和外层 `.theme-code-block` 容器上，**不在 code 元素上**），按语言分派：

- `language-python` → 在容器的 buttonGroup 里注入「▶ 浮窗运行」按钮，点击把代码装进浮窗控制台运行；
- `language-exercise` → 注入「▶ 在浮窗作答」按钮，浮窗进入判题模式（对照 @check 输出）；
- `language-quiz` → 隐藏原容器，把内嵌测验卡片插到其后（不删除 React 节点，水合安全）；
- `language-paper` → 隐藏原容器，把论文文献卡插到其后（PDF 下载分两路：已登录取本站归档副本、未登录走原始地址；`@pdf64`/`@local64` 客户端解码）；
- `language-viz` → 隐藏原容器，整块 JSON 交给 `viz.js` 查表渲染（**前五卷老组件，只读不写**）；
- `language-lab` → 同构，交给 `lab/index.js` 动态 import 对应组件文件（**卷六新交互一律走这里**）。

所有 Python 执行都发生在浮窗（Pyodide 单例）。正文代码块保持原生渲染（保留复制按钮），不做 DOM 手术。

### 两套可视化组件：`viz`（只读）与 `lab`（新建专用）

| | `viz.js` | `src/pyrunner/lab/` |
| --- | --- | --- |
| 服务对象 | 前五卷 00–67 章，741 个代码块 | 卷六 68–75 章工程域 |
| 形态 | 单体 14,370 行 / 108 渲染器 / 约 400KB | 一组件一文件 + 注册表动态 import |
| 引擎 | 无 | `circuit/mech/logic/dsp/media/audio` 六个数值引擎 |
| 现状 | **冻结：不加不改** | **在建设中，新东西全放这里** |

`lab` 子系统自带：底座 `core.js`（主题色/画布/滑块/动画/音频壳）、六个引擎、
`components/` 组件目录、`registries/chNN.js` 分册注册表（validate 扫目录自动白名单，
**不需要手改 validate.mjs**）。详见 `UNIT_GUIDES/68-75-volume6-outline.md`。

## 常用命令

```bat
npm start          # 开发预览（已配置 --host :: 双栈监听）
npm run build      # 构建前自动执行 validate，不通过则中止
npm run validate   # 单独跑课程闭环校验
npm run clear      # 清缓存（行为诡异时第一步）
```

部署包（服务器性能不足以构建时用本机出包）：

```bat
构建Linux部署包.bat                 # npm ci -> docusaurus build -> 打成 math-ladder-build.zip（默认跳过 validate）
构建Linux部署包.bat --skip-install  # node_modules 已就绪时跳过安装
构建Linux部署包.bat --full          # 构建前先跑 validate   --clear 清缓存   --no-pause 不暂停
```

产物是**纯静态文件**（zip 内顶层为 `build/`），目标机 x86_64 Linux / glibc≥2.31 只需任意静态服务器托管，**不需要 Node、不需要在服务器上构建**。打包用系统自带 `tar.exe`（bsdtar，无 `zip` 命令时的替代），缺失时回退 PowerShell 的 ZipFile。

测试/脚本一律用 node 执行 fetch 等验证；**不要用 PowerShell 的 Invoke-WebRequest 测 localhost**（系统代理会返回假 404）。

## 目录结构

```
docs/NN-chapter/MM-lesson.md   # 全部课程内容（纯 markdown，禁用 .mdx）
docs/17-what-next/             # 「下一程导读」导览章：不入图谱/知识树（gen-graph.mjs 与 ui/server.mjs 均排除 17- 前缀），豁免九段式
src/pyrunner/enhancer.js       # 核心：浮窗控制台/按钮注入/测验/判题/进度
src/pyrunner/viz.js            # 前五卷可视化单体（108 渲染器 / 约 400KB，只读不写）
src/pyrunner/lab/              # 卷六工程组件系统（新交互一律走这里）
  core.js                      #   底座：themeColors/setupCanvas/buildSliders/anim/audio/onScreen…
  engines/                     #   数值引擎：circuit.js mech.js logic.js dsp.js media.js audio.js
  components/<kebab>.js        #   一组件一文件：export default render(host, spec) → {slidersBox?,destroy?}
  registries/chNN.js           #   分册注册表（ch68–ch75）：'名': () => import('../components/x.js') 必须字面量
  registry.js                  #   汇总八个分册（勿手改，改分册文件即可）
src/theme/Root/index.js        # MutationObserver 入口，路由变化后重扫描
src/theme/TOCItems/index.js    # 右栏挂件 swizzle：目录上方渲染前置知识 + 学习进度条
src/theme/DocItem/Layout/index.js  # 文档页布局 swizzle：正文横条前置知识 + RailControls 折叠把手
src/components/doc-widgets/    # PrereqPanel 前置知识面板、RailControls 左右侧栏折叠控件
src/pages/index.js             # 首页（演算纸视觉体系，样式全在 home.css 的 .ml-home 作用域内）
src/pages/tree.js              # /tree 知识树页（章节/单元双模式 + 搜索 + 巨大画布，KnowledgeGraphTree v2）
src/pages/graph.js             # /graph 知识图谱页（逐课泳道，KnowledgeGraphFull）
src/components/ml-home/        # 首页数据与组件：data.js(章节/卷册聚合)、full-graph-data.js(生成器产物勿手改)、HomeTree(章级树)、KnowledgeGraphTree(知识树v2)、treeLayout.js(纯布局引擎：排除第0章/章节聚合/重心交叉消减/祖先后代位图)
scripts/validate.mjs           # 方法准入 + 依赖顺序校验（构建闸门）
scripts/references-data.json   # 各章论文/文献数据（单一事实来源，手改这个）
scripts/gen-references.mjs     # 生成各章 999-references.md 参考资料条目（含 paper 围栏）
scripts/fetch-papers.mjs       # 把条目里的 PDF 抓到 static/papers/（--force 全量 / --check 体检）
scripts/papers-local.json      # 归档清单（生成器产物勿手改）：PDF 原始地址 → 本地文件名/字节数
static/papers/                 # 归档 PDF（体积大，不入库；见 .gitignore）
scripts/add-user.mjs           # 账号开通/重置/删除（仅站方本地使用，详见 REGISTRATION.md）
src/auth/index.js              # 登录态与 SHA-256（localStorage ml-auth；无公开注册）
src/data/accounts.json         # 账号库（salt+哈希，不存明文；构建时打进 bundle）
src/pages/login.js             # /login 登录页（不展示账号密码，无注册/申请页）
REGISTRATION.md                # 账号与进度机制说明（维护者向，链接本文件）
ui/                            # 独立阅读前端（与 Docusaurus 主站并存，端口 9453）
  server.mjs                   #   node 原生 http 皮肤服务器（--skin fluent --port N）
  render.mjs                   #   markdown→HTML 管线（marked + KaTeX 服务端渲染 + 自定义围栏卡片）
  fluent/                      #   雅致版皮肤（Fluent/Win11 风，端口 9453，入口 启动FluentUI.bat）
UNIT_GUIDES/                   # 单章课题切分与专属组件规格
UNIT_GUIDES/68-75-volume6-outline.md  # ★ 卷六施工手册（自包含：架构+写课SOP+组件SOP+引擎API+八章课表+坑清单）
AUDIT_REPORTS/OPEN_ITEMS.md    # 未结项与待改善清单（唯一留存的活口；处理完即删行）
LESSON_TEMPLATE.md             # 写课模板·单一事实来源（卷一到卷五先读这个；卷六直接读卷六施工手册）
BACKFILL_LOG.md                # 未完成缺口台账（含回填铁律）
ROADMAP.md                     # 课程路线图 + 未完成进度 checkbox（读者侧入口是站内 /graph 知识图谱页）
CONTENT_AUDIT.md               # 现行内容口径 + 发布自检纪律
mechanical-audit.cjs           # 机械体检：h2 源/产物比对 + Python/viz 块扫描
```

### 卷六章节编号（2026-08-31 按依赖拓扑重排）

按**依赖拓扑**编排，编号即学习顺序。旧顺序「声画电算机」把电排在声后面，
而声学要用到滤波器与电路知识，先修链是断的，故重排。重排是 8-循环置换，
`registries/` 的文件集合不变，故 `registry.js` 无需改动。

| 章 | 目录 | 主题 | 引擎 | 组件 | 课文 |
| --- | --- | --- | --- | --- | --- |
| 68 | `68-electronics` | 电子电路与电子设计 | circuit | 18/18 | **19/19 成稿** |
| 69 | `69-digital-systems` | 数字系统与计算机组成 | logic | 0/18 | 0/18 |
| 70 | `70-computer-systems` | 计算机系统 | logic | 15/15 | **16/16 成稿** |
| 71 | `71-mechanical-engineering` | 机械工程与力学 | mech | 18/18 | 0/19（组件现成，只差正文） |
| 72 | `72-mechatronics` | 机电系统与嵌入式 | circuit+mech | 16/16 | 0/17（组件现成，只差正文） |
| 73 | `73-audio-acoustics` | 音频与声学 | audio+dsp | 2/14 | 0/15 |
| 74 | `74-speech-audio` | 语音与音频智能 | audio+dsp+media | 0/14 | 0/15 |
| 75 | `75-image-video` | 图像与视频 | media+dsp | 0/14 | 0/15 |

侧边栏顺序由目录数字前缀自动生成，**不用改 `sidebars.js`**。建成一章后同步四件套：
`references-data.json` → `gen-references.mjs` → `gen-graph.mjs` → `ROADMAP.md`。

### 参考资料条目与账号体系（2026-08-29 新增）

- **参考资料条目**：每章一个 `docs/NN-chapter/999-references.md`（编号 999 保证侧边栏垫底）。内容**只改 `scripts/references-data.json` 然后跑 `node scripts/gen-references.mjs`**（`--check` 模式可做闸门），不要手改生成的 md。每条文献是一个 ` ```paper ` 围栏（`# @title/@authors/@year/@venue/@tag/@desc/@page/@pdf64`），由 `enhancer.js` 的 `enhancePapers()` 渲染成文献卡（隐藏原容器 + 插卡，与 quiz 同一套水合安全模式）。**PDF 链接以 `@pdf64`（base64）写入条目**、客户端解码——静态 HTML 源码不再直接可读；这是混淆不是加密（边界声明见 REGISTRATION.md），手写条目仍可用明文 `@pdf`（两种写法兼容）。**validate.mjs 已挂双检查**：999-references 落后于 references-data.json → 硬错误；新章缺资料数据 → 警告。
- **排除口径与 17- 章一致**：`999-references.md` 不进知识图谱/知识树/首页统计（gen-graph.mjs 已排除）、不进独立阅读前端课程列表（ui/server.mjs 已排除），但进 Docusaurus 侧边栏与全站搜索。改完数据后重跑 gen-graph.mjs 同步 full-graph-data.js。
- **论文链接纪律（2026-08-30 加固）**：arXiv ID 只写验证过的高把握条目（abs 页 + `arxiv.org/pdf/<id>` 下载链）；没把握的文献只给稳定的 Wikipedia/官网页面（`@page`），**宁缺毋滥，不编造 ID**。条目正文不放行内公式（MDX 塌陷风险）。
  **任何 `@f`（PDF）都必须是机器验证过的链接**，不许凭印象填。已验证可用的四条找源路径：

  | 场景 | 接口 | 拿什么 |
  | --- | --- | --- |
  | arXiv 论文 | `http://export.arxiv.org/api/query?id_list=<id>` 或 `?search_query=ti:"标题"` | 先用 **`id_list` 回查标题确认没张冠李戴**（踩过坑：`2312.00916` 根本不是 AlphaGeometry），再拼 `arxiv.org/pdf/<id>` |
  | 公版原著 | Gutenberg（`gutenberg.org/ebooks/search/?query=` → 详情页正则取 `.pdf`）→ 兜底 archive.org（`advancedsearch.php` → `metadata/<id>` → 找 `format` 含 PDF 的 file） | `files/<id>/<id>-pdf.pdf`（文本版，几百 KB）、`archive.org/download/<id>/<file>`（扫描件，10–50 MB） |
  | 现代论文 OA | OpenAlex（`api.openalex.org/works?filter=title.search:`）拿 DOI → Unpaywall（`api.unpaywall.org/v2/<doi>?email=`）拿 OA PDF | 老论文（1950–1990）OA 命中率只有两三成，别指望 |
  | 机构镜像 | 直接 candidate 探测 | 命中率靠运气，**必须验证** |

  验证一律是「`Range: bytes=0-2047` 取前 2 KB 看 `%PDF-` 魔数」；被反爬（返回 `text/html`）就换浏览器 UA 再走一次完整 GET（只读前 2 KB 就 abort）。**典型失败码**：`401/403` = 站点要登录或反爬（ACM `dl.acm.org/doi/pdf/` 恒 403；archive.org 借阅受限的书也 401），`429` = 限流（AMS），`text/html` = 被 Cloudflare 挡。**拿不到就留 `@page`，不要硬凑。**
  **HTTP 200 + `%PDF-` 只证明"那里有个 PDF"，不证明它就是条目要的那篇**——归档后还要做一次**对版核对**，踩过两次坑：
  1. `arxiv:2312.00916` 以为是 AlphaGeometry，用 `id_list` 回查发现是一篇心理学量表论文 → 撤掉；
  2. Hellman 主页 `publications/32.pdf` 以为是 1976 年 *New Directions in Cryptography*，实际是 #32 = 1979 年 *Privacy and Authentication* → 换成 `#24` 对应的 `24.pdf`。
  核对手段按可靠性排序：**来源页面上的标题/编号对照**（Hellman 的 publications.html、RAND 的 P295 页面、archive.org 搜索结果标题）> arXiv `id_list` 回查标题 > 解压 PDF 文本层搜关键词（`zlib.inflate` 各 `stream`，再取 `(...)` 字符串字面量；**扫描件和 CID 字体提取不出**，此时只能靠来源页面）。
  另外下载器 `fetch-papers.mjs` 重试时会轮换浏览器 UA——RAND 一类站点只认浏览器 UA，否则 403。
- **账号与进度体系（2026-08-30 改版：无申请页、凭据不公示、进度全开放）**：登录页 `/login`（`src/pages/login.js`）**不再展示任何账号或密码**——只有表单 + 一句「账号由站方开通，凭据请联系维护者索取」；站内无注册页、无申请页（原 `/registration` 已删，导航只留「登录」）。追加账号仍用 `node scripts/add-user.mjs <用户名> <显示名> <密码>`（`--list`/`--remove` 见 `REGISTRATION.md`）。账号库 `src/data/accounts.json` 只存 salt+SHA-256 哈希；哈希口径在 `src/auth/index.js`（自实现 SHA-256，已与 node:crypto 做一致性测试）与 add-user.mjs 两侧一致。
- **进度系统（命名空间存储）**：进度对所有人开放——未登录存本地游客空间 `ml-progress:guest` / `ml-exercises:guest`，登录后存 `ml-progress:<用户名>` 等账号空间（同一浏览器多账号互不混淆）；旧版无命名空间 key 由 `migrateLegacyProgress()` 首扫自动迁移。文末进度按钮标记后 dispatch `ml-progress-changed` 事件，右栏进度条监听同步。`enhanceProgress` 清除按钮只清当前空间。
- **论文下载（2026-08-30 改版：双路门禁）**：paper 卡片的「文献页面」对所有人开放；PDF 按钮由 `enhancer.js` 的 `paintPdfButton()` 决定去向——**已登录且有归档副本** → 虚线转实线、文案「⬇ 本地下载（x.x MB）」、`href` 指向 `/papers/xxx.pdf` 并带 `download`；**未登录**（或该条目没归档）→ 文案「⬇ 原站下载 / ⬇ PDF 下载」、新窗口打开原始地址。登录态在别的页面变化后，靠 `ml-auth-changed` 事件整体重刷按钮（`setAuth`/`clearAuth` 会 dispatch），不必等路由切换。
- **归档现状（2026-08-30）**：211 条条目里 **64 条有 PDF 副本（30.3%）**，共 62 份文件、375 MB（`static/papers/`，不入库）。剩下 147 条绝大多数是「只有 Wikipedia/官网页面」的条目——历史原著只有借阅受限的扫描件、1950–1990 年代期刊论文没有开放获取版本，这些既不编造链接也不硬凑，留 `@page` 即可。
- **归档流程**：`node scripts/fetch-papers.mjs`（增量抓 PDF 到 `static/papers/`，`--force` 全量、`--check` 体检）→ `node scripts/gen-references.mjs`（把 `@local64` + `@lsize` 写进条目）。两个顺序不能反：生成器只在**磁盘上真有该文件**时才写 `@local64`，所以没跑过下载的克隆会自然退化成「全部走原始地址」，绝不出死链。`static/papers/` 已加进 `.gitignore`（375 MB，可随时重抓），清单 `papers-local.json` 入库。`validate.mjs` 挂了第三条检查：副本缺失只**警告**不拦构建。
  **构建体积提醒**：这 375 MB 会原样进 `build/`。嫌大的话按「体积/价值」删（最大的几份：Sutton & Barto 教材 69.7 MB、Stable Diffusion 39 MB、Fourier 33 MB、Ars Conjectandi 28.4 MB、Cauchy 23.9 MB），删完跑一次 `gen-references.mjs` 就会自动不再引用。
- **右栏挂件（2026-08-29）**：`src/theme/TOCItems/index.js`（swizzle wrap）在右栏目录上方渲染「前置知识面板 + 学习进度条」；前置知识面板组件抽到 `src/components/doc-widgets/PrereqPanel.js` 供两处复用——正文内实例（`variant="inline"`）桌面隐藏、窄屏横条；右栏实例（`variant="toc"`）窄屏隐藏。阅读区拉宽：`main[class*='docMainContainer']` 容器 1140→1360px、正文列 58%→76%。

### 首页与章级知识树（2026-08 重做）

- 首页视觉 = 「演算纸 × 印章朱砂」：方格纸网格底纹（`.ml-gridbg`）、暖纸底、衬线大标题、朱砂印章/书签条、印刷硬阴影。全部设计变量收在 `.ml-home` 作用域（home.css 顶部），**不要写成全局规则**，避免污染站内其他页面；英雄区规则必须带 `.ml-home .ml-hero` 前缀压过 custom.css 的旧 `.ml-hero`。
- **标题字体/字号必须走 Infima 变量**：Infima 的标题规则是 `h1:not(#\#):not(#\#)`（双 ID 特异性），任何类选择器都压不过；在 `.ml-home` 上改 `--ifm-heading-font-family / --ifm-h1-font-size / --ifm-h2-font-size`，小标题用 `.ml-home main h3 { --ifm-heading-font-family: ... }` 按元素继承退回无衬线。
- `HomeTree.js`（章级树）交互：滚动入场逐层生长 + 「重播生长」；**点击章节胶囊＝聚焦**——沿跨章先修边求上/下闭包，无关章节隐藏、可见各层横向重新居中（与 KnowledgeGraphTree 同一套 shifted 算法），绿=先修、橙=托起；双击或信息条按钮进入本章。实现要点：入场动画的逐节点 delay 在 SETTLE_MS 后统一清零（settled 状态），否则筛选切换会被旧延迟拖慢。

### 知识树页 /tree v3（2026-08-31 重做：紧凑块布局 + 渲染直改 DOM；v2 为 08-29 双模式）

- **排除第 0 章**：`treeLayout.js` 的 `filterCh0()` 在模块加载时把 `NODES` 里 `ch === 0`（Python 工具箱）整章剔除，并重映射 `EDGES`/`USE_AGG` 索引——第 0 章不再作为旁支挂根。注意这是**树页的视图层过滤**，不改 `full-graph-data.js` 源数据（/graph 与首页仍含第 0 章）。
- **单元模式 = 章节块布局（`blockLayout()`）**：章 DAG 决定约 20 个「带」（章粒度最长路径，`chapterLevels()`），每章的课在带内排成 ≤5 列的紧凑网格块——**同章课程永远收在一个矩形块里**（v2 逐课最长路径会把一章拆到 5~8 层）。带内块按章 DAG 重心消叉排序 + 块级中位数对齐松弛（钳位防重叠）。章内边在块内走短弧线（同层弧深度随水平距离缩放、封顶 sagCap）。
- **章节模式 = `layeredLayout()`**：坐标分配已改为「层内紧凑槽位（绕中轴居中）+ 层间中位数对齐松弛」——层内零空洞（v2 旧算法「继承父 x + 逐层居中」实测占用率仅 65%、空洞 429 个）。曾试过 Buchheim 紧凑树：本图深窄（46 层、叶子多），占用率反跌到 20%，弃用。
- **渲染性能**：SVG 结构按模式 `useMemo` 静态化（805 节点 + 1125 边不随悬停/选中重渲染）；悬停/选中/搜索高亮与选中位移全部直改 DOM（`classList` 带 `__cls` 变更缓存、`transform`、`path d`）；React 只管工具栏与信息面板。挂载期事件监听（[] 依赖）经 `fnRef` 调最新闭包；`sel/hot` 在模式切换过渡渲染里可能越界，统一先夹紧（`selS/hotS`）再用。
- **布局与位图都在模块加载时算一次**（块布局 ~14ms），不随悬停重算；`aggregateChapters()`/`chainOf()`/`popcount()` 照旧。
- **搜索**：实时高亮命中（`is-search`），回车定位并循环轮询（`jumpTo(i, 1)` 同步平移缩放 + 聚焦筛选）；点击胶囊 `jumpTo(i)` 保留当前缩放只居中。
- 排坑：调试截图时 React 的 `onMouseEnter` 只认 `mouseover` 事件（`mouseenter` 不冒泡、React 不合成）；测 localhost 用 node fetch。
- 样式在 `home.css` 末尾「知识树 v2」段（`.ml-tr__modes`/`.ml-tr__searchwrap`/`.ml-tr__legend`/`.ml-tr__edge--branch` 等）。

### 独立阅读前端 ui/（2026-08-28 重做；科幻版 hud 已于 08-31 移除）

- 定位：**静态为主 + 本地可玩**的独立阅读前端。公式服务端 KaTeX 渲染；quiz 客户端可点（答案仅 base64 混淆存 `data-qk`）；exercise/python 卡的「浮窗运行」由皮肤内置浮窗 Pyodide 控制台完成（判题走全新沙盒 `_ml_run`，随手算/python 卡走持久 `_ml_console_run`，matplotlib 懒加载出图）；viz 渲染为占位卡并链接主站对应页（`mainSiteLink`：目录与文件名都剥数字前缀）。
- **皮肤目录自包含**：`fluent/`（Win11 雅致风）拥有自己的 index.html + style.css + app.js + console.js + graph.js；后端 `server.mjs`/`render.mjs` 不感知皮肤。
- `server.mjs`：node 原生 http，`--skin fluent --port N`；`/api/meta`（章/课/卷册/edges/flat）、`/api/lesson?id=NN-dir/MM-file`（含 prev/next/prereqs/mainLink/interactive 计数）；`/vendor/*` 映射 `node_modules/katex/dist`（字体依赖这个映射）。lessonCache 上限 120。实例服务整个 `ui/` 静态目录。
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
