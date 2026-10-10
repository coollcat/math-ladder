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
npm run build      # 构建前自动执行 validate + check:sync，任一不通过则中止
npm run validate   # 单独跑课程闭环校验
npm run check:sync # 单独跑章节信息同步校验（见「章节信息只有一个源头」）
npm run gen:graph  # 重生成 full-graph-data.js（课节点/先修边/深度 + CHAPTER_INFO）
npm run gen:chapters # 重生成 static/graph-chapters/（按章拆分的课数据，/graph 钻取用）
npm run clear      # 清缓存（行为诡异时第一步）
```

部署包（服务器性能不足以构建时用本机出包）：

```bat
构建Linux部署包.bat                 # npm ci -> docusaurus build -> 打成 math-ladder-build.zip（默认跳过 validate）
构建Linux部署包.bat --skip-install  # node_modules 已就绪时跳过安装
构建Linux部署包.bat --full          # 构建前先跑 validate   --clear 清缓存   --no-pause 不暂停
构建Linux部署包.bat --no-server     # 纯静态包。默认 server\（云同步+建号 CLI）与 deploy\（部署指南）都打进包，server\data 账本绝不进包（打包后还有 zip 条目扫描兜底）；--with-server 是保留的旧别名
```

产物是**纯静态文件**（zip 内顶层为 `build/`），目标机 x86_64 Linux / glibc≥2.31 只需任意静态服务器托管，**不需要 Node、不需要在服务器上构建**。打包用系统自带 `tar.exe`（bsdtar，无 `zip` 命令时的替代），缺失时回退 PowerShell 的 ZipFile（先把要打的条目拷进 `_zip_stage\` 再压缩，保证两条路径产出的目录结构一致）。

云同步后端（**可选**，带上它才需要服务器装 Node 20+）：

```bat
node server/sync-server.mjs --add-user <用户名> <显示名> <密码>   :: 建号（--list-users / --remove-user 同上）
node server/sync-server.mjs --port 8787 --data ./server/data      :: 起服务（默认端口 8787，只监听 127.0.0.1）
```

部署步骤、nginx 与 systemd 配置、验收与备份命令全在 [`deploy/README-部署.md`](deploy/README-部署.md)。

测试/脚本一律用 node 执行 fetch 等验证；**不要用 PowerShell 的 Invoke-WebRequest 测 localhost**（系统代理会返回假 404）。

## 目录结构

```
docs/NN-chapter/MM-lesson.md   # 全部课程内容（纯 markdown，禁用 .mdx）
docs/17-what-next/             # 「下一程导读」导览章：不入图谱/知识树（gen-graph.mjs 排除 17- 前缀），豁免九段式
src/pyrunner/enhancer.js       # 核心：浮窗控制台/按钮注入/测验/判题/进度
src/pyrunner/notebook.js       # 数学笔记本（Markdown+KaTeX 单元 / 与浮窗共用 Python 命名空间），按需动态 import
src/pyrunner/repo.js           # 代码仓库（浮窗代码的存档柜：本机/账号空间 + 导入导出）
src/pyrunner/backup.js         # 数据面板（右下角第三圆钮）：进度/笔记本/代码 导出、导入、空间搬家、快照，按需动态 import
src/pyrunner/formula.js        # 公式输入器（符号面板 + 实时预览，插入到光标处），按需动态 import
src/pyrunner/complete.js       # 代码补全（静态词表 + 自己起过的名字 + 控制台变量名），极简版
src/pyrunner/mathout.js        # 输出里的 $$…$$ / $…$ 渲染；KaTeX 的唯一加载口（浮窗与笔记本共用）
src/pyrunner/zorder.js         # 浮窗层叠：最近点过的排最上面（1056/1057/1058 重排，不递增）
src/pyrunner/func/             # 「看见函数」子系统（站级工具，/function 页面 + lab 组件）
  expr.js                      #   算式内核：tokenizer + Pratt parser + 编译求值 + AST→LaTeX/文本
  latex.js                     #   LaTeX → 算式（\frac/\sqrt/^/\left…\right/希腊字母）
  analyze.js                   #   数值分析：采样/自适应细分/断裂检测/零点/极值/导数/积分/交点
  plot.js                      #   2D 画布：自适应网格、曲线分段绘制、标注、缩放平移、框选积分区间
  surface.js                   #   3D 画布：z=f(x,y) 曲面，正交投影 + 画家算法，拖动旋转
  keypad.js                    #   微软数学式符号键盘 + 占位符（\placeholder{}）光标编辑
  workspace.js                 #   组装：2D/3D 模式切换、多曲线叠加、参数滑块、性质面板、两套预设
static/ml-pyodide-sw.js        # 只缓存三个 Pyodide CDN 静态资源的 Service Worker（运行时不再重复下载）
src/learning/progress.js       # 学习进度/练习通过/续学位置的存储层（命名空间 + 旧 key 迁移），不引图谱数据
src/pyrunner/viz.js            # 前五卷可视化单体（108 渲染器 / 约 400KB，只读不写）
src/pyrunner/lab/              # 卷六工程组件系统（新交互一律走这里）
  core.js                      #   底座：themeColors/setupCanvas/buildSliders/anim/audio/onScreen…
  engines/                     #   数值引擎：circuit.js mech.js logic.js dsp.js media.js audio.js
  components/<kebab>.js        #   一组件一文件：export default render(host, spec) → {slidersBox?,destroy?}
  registries/chNN.js           #   分册注册表（ch68–ch75）：'名': () => import('../components/x.js') 必须字面量
  registry.js                  #   汇总八个分册（勿手改，改分册文件即可）
src/theme/Root/index.js        # MutationObserver 入口，路由变化后重扫描
src/theme/Navbar/index.js      # 顶栏：整条重写的自定义实现（swizzle 整体接管，取代 Docusaurus 自带那条）
src/css/nav.css                # 顶栏样式（.ml-nav 作用域，由 Navbar/index.js import）
src/components/icons.js        # 图标集：ICONS 路径表 + <Icon/>（React）+ iconSvg()（原生 DOM）
src/theme/TOCItems/index.js    # 右栏挂件 swizzle：目录上方渲染前置知识 + 学习进度条
src/theme/DocItem/Layout/index.js  # 文档页布局 swizzle：正文横条前置知识 + RailControls 折叠把手
src/components/doc-widgets/    # PrereqPanel 前置知识面板（按课 fetch static/prereqs/<id>.json，不引整表）、RailControls 右侧栏折叠控件
src/pages/index.js             # 首页（演算纸视觉体系，样式全在 home.css 的 .ml-home 作用域内）
src/pages/tree.js              # /tree 知识树页（章节/单元双模式 + 搜索 + 巨大画布，KnowledgeGraphTree v2）
src/pages/graph.js             # /graph 知识图谱页（同心环，KnowledgeGraphRadial，点击章钻取课）
src/components/ml-home/        # 首页数据与组件：data.js(章节/卷册聚合，章节名与卷号来自生成数据，只留首页文案)、full-graph-data.js(生成器产物勿手改，含 CHAPTER_INFO)、lesson-count.js(生成器产物：只有 LESSON_COUNT 一个常量)、HomeTree(章级树)、KnowledgeGraphTree(知识树v2)、KnowledgeGraphRadial(/graph 同心环+课级钻取)、ringLayout.js(/graph 纯布局引擎：难度分位分环 + 强先修单调上修)、treeLayout.js(纯布局引擎：排除第0章/章节聚合/重心交叉消减/祖先后代位图)、LearningEntry.js(继续学习/进度条，引图谱数据，只在首页用)
scripts/validate.mjs           # 方法准入 + 依赖顺序校验（构建闸门）
scripts/check-chapter-sync.mjs # 章节信息同步闸门：各章 index.md 的 title/short/volume ↔ 生成物 CHAPTER_INFO（构建闸门）
scripts/gen-chapters-data.mjs  # 把 full-graph-data.js 按章拆成 static/graph-chapters/NN.json（/graph 钻取按需 fetch，首屏不再带全量课数据）
scripts/references-data.json   # 各章论文/文献数据（单一事实来源，手改这个）
scripts/gen-references.mjs     # 生成各章 999-references.md 参考资料条目（含 paper 围栏）
scripts/fetch-papers.mjs       # 把条目里的 PDF 抓到 static/papers/（--force 全量 / --check 体检）
scripts/papers-local.json      # 归档清单（生成器产物勿手改）：PDF 原始地址 → 本地文件名/字节数
static/papers/                 # 归档 PDF（体积大，不入库；见 .gitignore）
scripts/add-user.mjs           # 账号开通/重置/删除/迁移（仅站方本地使用，详见 REGISTRATION.md）
scripts/accounts-index.json    # 站方本地明文台账（gitignored、不进 bundle；--list/--rotate-salt 用）
scripts/check-build-auth.mjs   # 出包自检（两种出包都跑，脚本自动认部署形态）：纯静态→账号指纹必须进包；云同步→产物里搜到账号数据就是泄漏；另查明文账号名与数据面板 chunk
src/auth/index.js              # 登录态（localStorage ml-auth）与 SHA-256；登录走服务端 POST /api/login（失败只有一句「用户名或密码不对」，连不上是另一句）
src/sync/index.js              # 云同步：拉取/推送（防抖 2 秒）、syncStatus/onSyncChange、后端不可达时静默降级；事件 ml-sync-changed
src/data/accounts.json         # 旧的前端账号库（无明文字段）。**前端已不再 import** —— 账号校验搬到服务端了，文件留着只当离线兜底的备用口径
src/pages/login.js             # /login 登录页（不展示账号密码，无注册/申请页，失败只给一句通用提示）
server/                        # 云同步后端（**可选增强**，零第三方依赖）
  sync-server.mjs              #   node:http 同步服务：登录/登出/GET|PUT /api/sync + 权威合并 + 按 IP 限流；子命令 --add-user/--list-users/--remove-user
  data/                        #   服务端数据（gitignore）：accounts.json 账号库 / tokens.json 令牌 / store/<user>.json 每账号数据
deploy/                        # 部署配置（出包默认带上）
  nginx-math-ladder.conf       #   静态根 build/ + /api/ 反代 127.0.0.1:8787 + 缓存头
  math-ladder-sync.service     #   systemd unit（普通用户运行、Restart=always、日志进 journald）
  README-部署.md               #   从解压到验收的完整步骤（含备份与常见问题）
REGISTRATION.md                # 账号、进度与云同步口径说明（维护者向，链接本文件）
UNIT_GUIDES/                   # 单章课题切分与专属组件规格
UNIT_GUIDES/68-75-volume6-outline.md  # ★ 卷六施工手册（自包含：架构+写课SOP+组件SOP+引擎API+八章课表+坑清单）
UNIT_GUIDES/see-function.md       #   看见函数内核 21 条踩坑（改 src/pyrunner/func/ 前必读）
UNIT_GUIDES/graph-pages.md        #   /tree 与 /graph 实现细节：布局、钻取、筛选口径、CSS 陷阱
UNIT_GUIDES/site-ui.md            #   顶栏 / 首页 / 右栏挂件 / 侧栏折叠 的实现细节
UNIT_GUIDES/console-notebook.md   #   浮窗滑块、笔记本、代码仓库、公式输入器的实现细节
UNIT_GUIDES/paper-links.md        #   论文链接找源与验证、PDF 归档流程
UNIT_GUIDES/sync-backend.md       #   云同步服务的运维细节（nginx、本地测登录）
UNIT_GUIDES/CHANGELOG-2026-09.md  #   2026-09-29 三个回路的变更历史档案
_ai-workspace/                 # ★ AI 工作产物（**不入库**，纯本地目录）：reports/ 放审计与回填报告、架构图；ai-memory/ 放其它 AI 工具散落的记忆
  reports/OPEN_ITEMS.md        #   未结项与待改善清单（唯一留存的活口；处理完即删行）
LESSON_TEMPLATE.md             # 写课模板·单一事实来源（卷一到卷五先读这个；卷六直接读卷六施工手册）
BACKFILL_LOG.md                # 未完成缺口台账（含回填铁律）
ROADMAP.md                     # 课程路线图 + 未完成进度 checkbox（读者侧入口是站内 /graph 知识图谱页）
CONTENT_AUDIT.md               # 现行内容口径 + 发布自检纪律
mechanical-audit.cjs           # 机械体检：h2 源/产物比对 + Python/viz 块扫描（Python compile 一次进程批量跑，见文件内注释）
```

### 云同步后端（2026-09-04 新增 · `server/` + `src/sync/`，**可选增强**）

站点原来是纯静态的，学习数据只存在访客浏览器里，换设备全靠导 `.json`。现在加了一个
零第三方依赖的 Node 同步服务（`server/sync-server.mjs`，只用 `node:http` / `node:fs` /
`node:crypto`），配合前端 `src/sync/index.js` 把三样数据上云：**学习进度**（已学标记 /
练习通过 / 续学位置）、**数学笔记本**、**代码仓库**，按账号隔离，换设备自动跟随。

**它是可选的增强，不是依赖。** 三条降级纪律（改这块代码时别破坏）：

1. 没部署后端 / 后端挂了 / 断网 / 本地 `npm start`，站点照常能学 —— 同步模块只是
   `syncStatus().state === 'nobackend'`，**不报错、不弹异常、不阻断任何操作**；
2. 同步失败只标记「有改动没同步」，数据留本地，下次变更或下次登录重试，
   失败后至少隔 30 秒才再试（不做重试风暴）；
3. 唯一例外是**登录**：账号校验只在服务端（`POST /api/login`），所以没有后端就**没有登录**
   （登录页提示「连不上服务器，已切换到本地模式」）。课程、浮窗、判题、进度记录不受影响。

服务形态与运维（启动命令、nginx `proxy_pass` 尾斜杠、CORS、本地测登录的 `ML_SYNC_API`）
全部在 [`UNIT_GUIDES/sync-backend.md`](UNIT_GUIDES/sync-backend.md)，改这块先读它。

**API 契约与数据口径看这里**（不要凭记忆改字段名）：

| 要看什么 | 去哪看 |
| --- | --- |
| 正式口径（长期） | [`REGISTRATION.md`](REGISTRATION.md) 的「云同步」一节：同步范围、合并规则、降级口径、服务端数据目录 |
| 部署与验收 | [`deploy/README-部署.md`](deploy/README-部署.md)：nginx / systemd 配置、建号、curl 验收、备份恢复、常见问题 |
| 接口字段细节 | `server/sync-server.mjs` 的实现本身（`/api/login` `/api/logout` `GET|PUT /api/sync`） |

### 看见函数（/function · src/pyrunner/func/）

一个「拼式子 → 立刻看见形状」的站级工具页，顶栏入口「看见函数」。两种模式：
**平面** y = f(x)（最多叠 6 条曲线）与 **立体** z = f(x, y)（曲面，只画一条）。
内核是纯 JS（不依赖 React、不依赖 lab 底座），所以既能挂在页面，也能被课文用
` ```lab ` 围栏嵌进去（type 为 `see-function`，注册在 `lab/registries/ch00.js`；
3D 用法给 `mode: "3d"` 与 `domain`，2D 给 `view`）。

**四条对外口径**（都是刻意选的，改之前先想清楚会伤到谁）：

| 写法 | 含义 | 为什么 |
| --- | --- | --- |
| `ln` | 自然对数 | 全球一致 |
| `lg` / `log`(单参) | 常用对数（底 10） | 中国教材习惯，与 Python/Desmos 不同 |
| `log(b, x)` / `\log_2 x` | 指定底数 | — |
| `\sin^{-1} x` | **反正弦** asin(x) | 排版传统。要倒数请写 `\left(\sin x\right)^{-1}` |

除 `x` 外的未知标识符一律当**可调参数**（含 `theta`/`alpha` 这类希腊字母名），
自动出滑块；未知的多字母名 + `(`，单字母按乘法、多字母报「不认识的函数」。

**内核实现的 21 条踩坑**（分位数尺度、断点顺序、`healIsolated`/`healGrid2`、3D 归一与 lod、
积分端点外推、params 初值范围、`lab` 围栏与 3D domain…）已整体下沉到
[`UNIT_GUIDES/see-function.md`](UNIT_GUIDES/see-function.md) —— **改 `src/pyrunner/func/` 之前必读**。
`lab/registries/ch00.js` 是通用工具分册（validate 扫整个 registries/ 目录，新增分册不必改校验脚本）。

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

### 卷七 · 物理与前沿交叉（2026-09-29 建卷：76–78）

由一次覆盖度核查（拉格朗日力学 / 相对论 / 脑机接口三处空白）触发。定位与卷六同构：**只引用前六卷的数学，把工具搬到物理与神经科学的主战场**。

| 章 | 目录 | 主题 | 组件 | 课文 | 引擎 |
| --- | --- | --- | --- | --- | --- |
| 76 | `76-relativity` | 狭义相对论与时空几何 | 8/8 | 8/8 成稿 | 无（纯 canvas 绘制） |
| 77 | `77-hamiltonian-mechanics` | 哈密顿力学与对称性 | 8/8 | 8/8 成稿 | 无 |
| 78 | `78-brain-computer-interface` | 脑机接口的数学 | 8/8 | 8/8 成稿 | 无 |

三条编排纪律（写新课前先读）：

1. **不重讲**：拉格朗日力学与最小作用量原理归 22 章 65 号与 26 章 95 号；EEG 频谱、节律带与伪迹归 61 章 96/97 号。卷七只在 §1/§2 用两三句话回扣并给双向链接。
2. **工具都有出生地**：每门课的 §8 下一站或正文都要指回它借用的前置课（洛伦兹变换 ← 12 章线性变换；辛结构 ← 21 章二次型；卡尔曼 ← 52 章）。
3. **应用锚点必须真实可检验**：GPS 的 38 微秒、μ 子寿命、Pound–Rebka 式红移、Hodgkin–Huxley、BrainGate——不写"某研究表明"式的空话。

新增卷号时别忘了四处：`scripts/validate.mjs` 的 `REGISTRY.volume` 与 `expectedVolume()`、`src/pyrunner/lab/registry.js` 的分册 import、`src/components/ml-home/data.js` 的 `VOLUMES`（卷册介绍文案）、`src/css/custom.css` 的 `--ml-volN`（亮/暗各一份，`.ml-rg` 是它的别名，**不要在作用域里再写 hex**）。章名、章属卷号、课数都不用手写——它们在**各章自己的 `index.md` front matter** 里（见「章节信息只有一个源头」）。

### 参考资料条目与账号体系（2026-08-29 新增）

- **参考资料条目**：每章一个 `docs/NN-chapter/999-references.md`（编号 999 保证侧边栏垫底）。内容**只改 `scripts/references-data.json` 然后跑 `node scripts/gen-references.mjs`**（`--check` 模式可做闸门），不要手改生成的 md。每条文献是一个 ` ```paper ` 围栏（`# @title/@authors/@year/@venue/@tag/@desc/@page/@pdf64`），由 `enhancer.js` 的 `enhancePapers()` 渲染成文献卡（隐藏原容器 + 插卡，与 quiz 同一套水合安全模式）。**PDF 链接以 `@pdf64`（base64）写入条目**、客户端解码——静态 HTML 源码不再直接可读；这是混淆不是加密（边界声明见 REGISTRATION.md），手写条目仍可用明文 `@pdf`（两种写法兼容）。**validate.mjs 已挂双检查**：999-references 落后于 references-data.json → 硬错误；新章缺资料数据 → 警告。

- **两个图谱页的分工：/tree 画树、/graph 画同心环**（半径＝层级、颜色＝卷，一章一颗圆点，点击章在图上原位展开课点）。
  **/tree 筛选＝重排、/graph 筛选＝只压暗不重排，这是刻意的分歧不是漏改**；环算法的唯一事实来源是
  `src/components/ml-home/ringLayout.js` 的头部注释。布局、钻取、闭包高亮、CSS 特异性陷阱等细节在
  [`UNIT_GUIDES/graph-pages.md`](UNIT_GUIDES/graph-pages.md)。
- **`KnowledgeGraphFull.js`（旧泳道图）已于 2026-09-30 删除**（确认无引用；泳道按卷分行，卷序≠难度序，
  读者看得见「排得下」、看不出「谁托着谁」）。历史实现查 git。

- **论文链接纪律**：任何 `@f`（PDF）都必须是机器验证过的链接，**宁缺毋滥、不编造 ID**，拿不到就留 `@page`。
  四条找源路径、`Range` 魔数验证法、失败码与两次对版核对的案例在
  [`UNIT_GUIDES/paper-links.md`](UNIT_GUIDES/paper-links.md)。条目正文不放行内公式（MDX 塌陷风险）。

- **账号与进度体系**：无注册页、无申请页，凭据不公示；**登录失败只有一句「用户名或密码不对」**
  （绝不区分「没这个账号」与「密码错」，分两句等于把账号名单摆出来让人试）。账号校验已搬到服务端
  （`server/data/accounts.json`，用 `sync-server.mjs --add-user/--list-users/--remove-user` 维护），
  前端不再 import `src/data/accounts.json`；`scripts/add-user.mjs` 只管纯静态模式那份。哈希口径在
  `src/auth/index.js` 与 `scripts/add-user.mjs` 两侧，**改口径要两边一起改**；出包前跑
  `node scripts/check-build-auth.mjs`（已串进打包脚本，硬错误中止）。完整口径见
  [`REGISTRATION.md`](REGISTRATION.md)。

- **进度系统（命名空间存储）**：进度对所有人开放——未登录存本地游客空间 `ml-progress:guest` / `ml-exercises:guest`，登录后存 `ml-progress:<用户名>` 等账号空间（同一浏览器多账号互不混淆）；旧版无命名空间 key 由 `migrateLegacyProgress()` 首扫自动迁移。文末进度按钮标记后 dispatch `ml-progress-changed` 事件，右栏进度条监听同步。`enhanceProgress` 清除按钮只清当前空间。
- **存储层单一事实来源（2026-09-02）**：`src/learning/progress.js`。三份数据都走它——学完标记 `ml-progress:<ns>`、练习通过 `ml-exercises:<ns>`、**续学位置 `ml-last:<ns>`**（进课程页由 `enhancer.enhanceProgress()` 写入 `recordVisit`）。enhancer 与右栏挂件都 import 它，不要在别处再写一份 localStorage 读写。**它刻意不 import full-graph-data**（222KB 图谱）：enhancer 每页都会跑，引了就打进主包。
- **数据面板（2026-09-04 新增，右下角第三个圆钮 `ml-bk-fab`，Alt+D）**：`src/pyrunner/backup.js`，按需动态 import。**背景：云同步只在「部署了后端 + 已登录」时生效**——纯静态托管或后端挂了的时候，登录只换抽屉不搬东西，游客攒的进度登录后看着像「没了」；换设备更是全不带走（导出 `.json` 仍是唯一的离线兜底）。面板管四件事：① 导出（全部空间 / 单个空间 → `math-ladder-<空间>-<时间戳>.json`）；② 导入（**合并**为默认：进度取并集、笔记本按本子 id 合并单元、代码按内容去重；覆盖需二次确认）；③ 空间搬家（游客 → 当前账号，源空间保留）；④ 快照（`ml-snapshot:<ns>`，一空间一份，误删兜底）。跨空间读写 API 分别在 `progress.js` 的 `listSpaces/readSpace/writeSpace/clearSpaceNS` 与 `notebook.js`、`repo.js` 的 `peek*/write*`（**都显式传 ns**，避免误读当前空间）。三个坑：① 笔记本要用 `peekNotebook` 而不是 `load()`——`load()` 没数据时会自动造一本《我的笔记本》，导出的备份里就永远多一本用户没写过的；② `listSpaces` 的正则要排除 `ml-snapshot:<ns>`，否则快照键也冒充一个空间；③ 写的是当前打开的空间时，必须把内存里那份 `data` 置空并重渲染，否则面板还显示旧内容。**对用户必须说清**：没有后端替他存，换设备全靠那份 .json。
- **首页「继续学习」（2026-09-02）**：`src/components/ml-home/LearningEntry.js` 只被首页引用，可以安全 import 图谱数据。判定顺序：有停留记录且那课未学完 → 回到那课；那课已学完 → 顺延到课程顺序里的下一门未学课；既无停留记录也无学完标记 → 退回「随机翻一章」。水合安全：首渲染一律走随机分支，挂载后才换。按钮下方 `ProgressStrip` 显示已学节数/百分比/存在哪个空间。

- **论文下载与归档**：PDF 按钮双路门禁（已登录且有归档副本 → 本地下载；否则 → 原站），登录态变化靠
  `ml-auth-changed` 整体重刷。归档流程 `fetch-papers.mjs` → `gen-references.mjs`，**顺序不能反**
  （生成器只在磁盘上真有文件时才写 `@local64`），清单 `papers-local.json` 入库、`static/papers/` 不入库。
  细节与构建体积提醒见 [`UNIT_GUIDES/paper-links.md`](UNIT_GUIDES/paper-links.md)。

- **右栏挂件与侧栏折叠**：右栏渲染前置知识面板 + 学习进度条（`TOCItems` swizzle）；左侧折叠只用
  Docusaurus 自带按钮，右侧把手是 `RailControls`；折叠右侧后 `custom.css` 要同时松绑三层，少一层铺不满。
  细节在 [`UNIT_GUIDES/site-ui.md`](UNIT_GUIDES/site-ui.md)。

### 笔记本 / 代码仓库（2026-09-02 新增）

共用同一个 Python 命名空间（`execInConsole`：笔记本里 `x = 3`，浮窗里 `print(x)` 就是 3）；
笔记本 `ml-notebook:<ns>`、代码仓库 `ml-repo:<ns>` 都是本机 localStorage 的命名空间隔离，**不是云同步**。
公式输入器按目标类型决定插什么（代码区插 `print(r"$$…$$")`，笔记区插 `$…$`，塞裸 LaTeX 会语法错误）。
层叠由 `zorder.js` 统一管理：**z-index 只用 1056/1057/1058 重排、不递增**（递增几次就盖过圆钮 1060）。
滑块规格每次运行前重解析、HMR 跨代重建、模板库与补全等坑全部在
[`UNIT_GUIDES/console-notebook.md`](UNIT_GUIDES/console-notebook.md) —— 改浮窗/笔记本之前必读。

### 顶栏与首页

顶栏是 swizzle **整体接管**：**改导航改组件里的 `LINKS`，改 `docusaurus.config.js` 的 `navbar.items`
不会被渲染**；外层必须保留 `navbar navbar--fixed-top`（sticky 与锚点偏移都挂在它上面）；
搜索覆盖一律写成 `.ml-nav .ml-nav__search .navbar__search-input` 三级选择器（两级会与插件撞权重，不稳）。
首页视觉 = 演算纸 × 印章朱砂，全部设计变量收在 `.ml-home` 作用域，**不要写成全局规则**；
Infima 标题规则是双 ID 特异性，改字号字族要走 `--ifm-heading-font-family` 这类变量。
**站点终点口径是「从 1+1 到 AI 与前沿数学」，别再拿傅里叶当终点。**
三态外观按钮、图标集、HomeTree 聚焦、树布局三处常量等细节在
[`UNIT_GUIDES/site-ui.md`](UNIT_GUIDES/site-ui.md)。

### 知识树 /tree 与前置知识面板

`treeLayout.js` 在模块加载时做 `filterCh0()`（**视图层过滤**，不动 `full-graph-data.js` 源数据，
/graph 与首页仍含第 0 章）；单元模式＝章节块布局、章节模式＝层内紧凑槽位 + 层间中位数对齐松弛。
**视图坐标有两套**（世界坐标 `L.minX` 为负 / SVG 元素坐标），换算统一走 `toElem()` +
`applyView(b, {center, noClamp})`，混用会「不居中」；`fitSel` 缩放下限 0.42。
细节与坑在 [`UNIT_GUIDES/graph-pages.md`](UNIT_GUIDES/graph-pages.md)。
内容页右上角「前置知识」面板由 `DocItem/Layout` swizzle 读 front matter 的 `prereqs`
（theme-common/internal 里没有 docs 数据 hook），样式在 `custom.css` 的 `.ml-prereq`。
独立阅读前端 `ui/` 已于 2026-09-29 整体退役删除，历史实现查 git。

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
7. **段编号同章必须一致，全站不统一是历史现状**：`## 6` 是「常见误区」还是「练习」各章不同——
   04 章是 8 段（误区卡不占号、`## 8` 下一站），05/09/13 章是 9 段（`## 6 常见误区`、`## 9 下一站`）。
   04 章老课自身就 8/9 混用（35 课 9 段、55 课 8 段）。
   写新课前先 `search_content` 查同章相邻课的段标题，**照同章多数来**，别照抄别的章。
8. **判题块的两条自检（闸门都查不到）**：
   (a) `@check` 的值必须是「按 @hint 改完后代码的实际输出」——**实跑**，别心算。
   Python 的 `round` 是银行家舍入（`round(2.5)=2`、`round(0.125,2)=0.12`），
   int/float 打印不同（`1` vs `1.0`）；
   (b) 正文里「初始代码会输出 X」的描述必须与实跑一致——学生一跑就穿帮。
9. **前向指引必须 grep 核实**：写「第 N 章会讲 X」之前先确认那一章真的讲了。
   踩过四次：凭空写的「第 24 章空间解析几何」根本不存在；「Σ1/k² 的严格证明」
   在 15 章其实只是"记悬案"；CLT 在 36 章不在 38 章；高斯积分在 20 章不在 14 章。

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

**` ```py ` = 片段，不要运行（2026-09-28 定）**：`<details>` 解答区里常有「只展示改对的那一两行」的片段（缩进的单行、`return`/`break` 单独出现），它们**不是能独立跑的程序**。标成 `python` 会被注入运行按钮，学生一点必然 `SyntaxError`（unexpected indent / 'return' outside function / 'break' outside loop）。这种块一律写 ` ```py `：Prism 的 `py` 就是 `python` 的别名（已验证 `Prism.languages.py === Prism.languages.python`），照样高亮；而 enhancer 的语言分派是 `lang === 'python'`，`py` 不匹配 → 不注入按钮。已按此口径改过 15 处。

**判题比对带浮点容差（2026-09-28 改）**：`sameOutput()` 把期望值与实际输出拆成 token 逐段比，两段都能解析成有限数就按**相对误差 1e-9** 比，否则仍走精确字符串相等。先前是纯字符串相等，1099 个练习里 594 个期望值是小数（最脆的一个 17 位：`value=0.36787944117144233`），学生换等价但运算顺序不同的写法末位一变就被判错。**容差不加绝对下限**：加了就等于给接近 0 的期望值开口子——反例是 `docs/44-numerical-analysis/10-floating-point` 那个练习，它考的正是「0.1+0.2-0.3 不等于 0 而是 5.55e-17」，学生答 0 若被判对就是把这一课教反了。

**两个 Python 审计脚本**（不属于构建闸门，想查的时候手动跑）：

```bat
python scripts/audit-py-syntax.py docs          # 全部 python/python3/exercise 块逐个 compile()，报语法错误
python scripts/audit-py-checks.py docs          # 扫 exercise 的 @check，列出期望值的小数位数分布（位数越多越脆）
```

`audit-py-syntax.py` 刻意**不**收 ` ```py `（片段本来就编译不过）。当前基线：2921 个块、0 语法错误。

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
| PowerShell 管道 `Get-Content \| node --check` 假语法错误 | 管道会把 UTF-8 重编码成 GBK 毁掉中文（正则里中文变 `???` 报 "Nothing to repeat"）。用 `cmd /c "node --check < file"` 原字节 stdin 验语法 |
| 「改了代码用户还说没效果」：端口上跑的是旧 dev server 进程 | `npm start` 自带 `--port 9452`；若被旧进程占着，先确认端口上是不是当前代码，必要时追加 `-- --port 3000` 起新实例，或杀旧进程 |
| `cmd 2>&1` 把 stdout 变成 CLIXML 噪音流，中文行用 `Select-String` 过滤还会整段丢失 | 要读脚本输出就 `node x.mjs \| Out-File -Encoding utf8 _out.txt` 再 `Get-Content -Tail`；判断成败看 `$LASTEXITCODE` 而不是输出内容 |
| 正则批量改 `docs/**.md` 匹配不到（文件是 CRLF） | 模式里一律写 `\r?\n`；替换时把行尾捕获进分组回写（`'```lab$1$2$1```'`），别把文件改成混合行尾 |

## 调试与 E2E 验证（2026-09-01 定稿）

- **node 探测 Docusaurus dev server 必须带 `Accept: text/html` 请求头**，否则所有非 `/` 页面返回 Express 风格 `Cannot GET /xxx` 404（history fallback 只对 `Accept: text/html` 生效）。浏览器正常但 node fetch 全 404 先查这个。
- **站点路由剥数字前缀**：真实路由是 `/docs/arithmetic/division` 而非 `/docs/01-arithmetic/40-division`。路由 404 排查顺序：确认客户端 h1 是不是「找不到页面」（history fallback 让任何路径都 HTTP 200，node fetch 200 ≠ 路由存在）→ 查 `.docusaurus/routes.js` 真实注册路径 → `npm run clear`。
- **999-references.md 的 git stat 假阳性**：被 `gen-references.mjs` 重写后 git 全显示 M，实际内容/哈希与 HEAD 一致。`git add -u; git reset -q` 刷新索引即可。validate 的 references 检查是内容比对（`gen-references.mjs --check`），与 mtime 无关。
- **tabbit 浏览器 E2E（Windows）**：`"%LOCALAPPDATA%\Tabbit\LocalAgent\bin\tabbit-cli.exe" nodejs --task <任务名> < 脚本.js`。`nodejs` 模式下 stdin 直接给 **JS 代码**（不是 JSON 帧），用 CMD `< file` 重定向传；脚本里用 `page.getByRole`/`page.locator` 操作，监听 `page.on('pageerror')` 抓页面异常。.ps1 含中文路径时无 BOM UTF-8 会乱码，用相对路径 + `Set-Location`。

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
- **FAB 与面板是两段构建（2026-10-10 拆）**：`enhanceAll()` 每页只调 `ensureFab()`（两个圆钮 +
  全局快捷键，廉价）；浮窗面板的大坨 DOM/监听/`applySlot`（含 ml-console 的 localStorage 读+写）
  等用户真要打开时由 `ensureConsole()` 补齐——圆钮点击、快捷键、`openInConsole()` 都会先走它。
  跨代（HMR）逻辑：FAB 与面板各自 `__mlGen` 盖章、各自重建；面板上的开关函数挂在
  `st._setOpen/_isOpen/_toolApi/closeLightbox` 上供 FAB 处理器取用。改这段前读函数头注释。
- localStorage key 清单：ml-progress（学完标记）/ ml-exercises（判题通过）/ ml-exercise-drafts（旧版遗留，只读兼容）/ ml-console（drafts 多槽位草稿 + pos）。

## 浮窗控制台与滑块系统（2026-09-01 定稿，踩坑实证）

三条最致命的：① 模块级回调必须调 `st._run`（`run` 是 `ensureConsole()` 内部局部常量，直接调会在
260ms 防抖后 `ReferenceError`）；② `toJs({depth:1})` 必须带 `dict_converter: Object.fromEntries`
（否则 Python dict 变 Map、滑块值全 undefined）；③ HMR 跨代重建靠 `window.__mlEnhancerGen` 盖章 +
完整槽位元数据恢复。滑块规格每次运行前重解析、双向同步三态提示等全部细节在
[`UNIT_GUIDES/console-notebook.md`](UNIT_GUIDES/console-notebook.md)。

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

## 批量子代理生产的并发规程（2026-09-04 卷一 28 门回填实证）

多人同写一批课时，绝大多数返工来自**并发冲突**而不是写错内容。以下全是本次踩过的：

**共享规范先落文件**：把写课规范与审查规范写成 `.codebuddy/tmp-*.md`，成员 prompt 只要求
「先读某某文件」，而不是把几千字规范复制到每个 prompt——口径统一且省 token。任务结束后删除。

**三条并发禁令（写进每个成员的 prompt）**：

1. **只写分配给自己的文件，不碰任何 `index.md`、不碰已有课文的「下一站」链路**
   ——多人同章会互相覆盖。目录清单、课数计数、章内链路全部由 main 在收尾时统一重排
   （本次五处 `index.md` 与七处链路都是这么收的，事后核对发现写手之间还有信息差：
   W2 建议 45 课指向 65，实际中间还夹着 W1 的 50/55/60）。
2. **不跑 `npm run validate` / `npm run build`**——并发跑会打架，由 main 统一跑。
   （只读的 validate 例外，但结论只能当参考。）
3. **不写 `.codebuddy/memory/`**——并发追加会整文件互相覆盖。本次发生过一次全量重置，
   审计结论与执行总览全部丢失。**memory 一律由 main 在收尾时统一写。**

**额度中断要主动探**：子代理可能中途被额度打断且**零落盘**（本次 W4 分到最重的 5 门，
到收尾才发现一门都没写）。重活派发后要探一次进度，回「卡住」或「5 门一口气写完会掉质量」
就把主干拆出来先交付、其余重派（W10 接手完成）。

**审查组与写手组并行**：不必等全部写完再开审——写完一组就派一个审查员打一组。
审查员用 `mode: acceptEdits`，P0 直接修、P1/P2 报 main 定夺，比来回传话快一个数量级。

**跨组重复要 main 拍板**：不同写手分到相邻主题时会重复讲授（本次两次：
50↔65 的空间坐标、54↔66 的联立判别式）。判据是看「重叠面有多大」——
若一方只是顺手用工具、另一方才是系统讲授，就用螺旋编排（承认句 + 前向指引）缝上，
**不改编号**；改编号要牵动 prereqs、内部链接、index.md，代价远大于收益。

## 生产与审查合同

冲突时按 `AGENTS.md → VISION.md → ROADMAP.md → LESSON_TEMPLATE.md → 对应 UNIT_GUIDES/*.md` 裁决。生产代理只在分配目录内改课和实现已批准组件；审查代理只读，不改源码。既有 URL、`lesson_id`、冻结编号和历史台账结论不得私自改写。

审查发现分三级：

- **P0**：数学错误、判题链断裂、页面塌陷、组件渲染错误、依赖倒置或红线命中。清零才能交付。
- **P1**：概念边界混乱、交互承诺失真、首现语法缺注释、移动端不可用或明显误导。当轮修复。
- **P2**：风格不一致、可延后的体验升级和非阻塞边界补强。登记到 `_ai-workspace/reports/OPEN_ITEMS.md` 后择期处理（处理完即删除该行）。

批量任务收尾必须报告：已完成文件、新增/复用组件、validate/build/h2 结果、浏览器抽测结果、未完成项和下一入口。不接受"基本完成"这类不可验证结论。新会话先跑 `npm run validate`，再读 `ROADMAP.md` 当前状态与 `_ai-workspace/reports/OPEN_ITEMS.md`。

## 文档维护纪律

- **只留活口**：`BACKFILL_LOG.md` / `CONTENT_AUDIT.md` / `ROADMAP.md` / `_ai-workspace/reports/OPEN_ITEMS.md` 一律只登记**未完成**与**待改善**项。已交付批次的过程记录、已闭环的审计报告不留存——证据以 `npm run validate` + `npm run build` 全绿为准，课程本体与各章 index 才是课程清单的事实来源。
- **勿写死数字快照**：门数/图谱规模一律写"以 `node scripts/validate.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准"，避免文档随每次生产腐烂。

## 仍然生效的口径（原 2026-09-29 三个回路，明细已归档）

三个回路的**过程记录**（环布局 v3、数据面板第四次搬家、Infima 变量覆盖写 `body`、Pyodide 装包修复、
判题大整数分支、+82 门课补课与 MDX 整改）全部移入
[`UNIT_GUIDES/CHANGELOG-2026-09.md`](UNIT_GUIDES/CHANGELOG-2026-09.md)。**那份是历史记录，不是规范。**
仍留在本文的只有下面两条长期口径：

- **门数口径（重要，别再搞错）**：`正式课` = `docs/NN-*/` 下 `.md` 课文件 − `index.md` − `999-references.md` − `COMPONENT_SPEC.md`。**17 章「下一程导读」的 3 门导览课不计入任何一卷**（导览章，不入图谱/知识树），此口径与 `gen-graph.mjs` 排除 `17-` 前缀后的结果一致。另一个常被混淆的数字：`validate.mjs` 报的是**全量 markdown 文件数**（含 index 与 references），不是正式课数。
- **跨章重复：只声明分工，不删课**。全站统一用 `:::note[与别章的分工]`（放在 front matter 之后、正文标题之前），索引见 `_ai-workspace/reports/DEDUPE_PLAN.md`。

**MDX 整改教训**（详见 CHANGELOG）要紧的两条：① **塌陷体检已并入构建闸门**——
`npm run build` 的最后一步就是 `mechanical-audit.cjs`（2026-09-30 起，problems 级阻断、warnings 只告警；
本机没有 python 时 compile 体检自动降级为预警）；
② `\{` → `\lbrace` 替换后要补一个空格，否则变成未定义命令 `\lbraceX`（KaTeX 不报构建错）。
站内链接自查工具：`scripts/check-index-links.mjs`（章首页是否漏收本章课）与 `scripts/check-links.mjs`。

---

## 章节信息收口（2026-09-29 第三回路；本节仍然生效）

### 一、章名/章属卷号/课数，全站只有一个源头：各章自己的 `index.md`

在此之前，同一件事有三份口径：`data.js` 的 `CHAPTER_META` 手写第 0–16 章的 title/short、`CH_TITLES` 手写 18–78 章的标题、`CH_SHORT` 又手写一遍短名；`data.js` 的 `volumeOf()` 与 `validate.mjs` 的 `expectedVolume()` 各写一套章号→卷号的区间。**改课改名时必漏**——66/67 章就真的漏过，图谱 tooltip 退化成「66 章」。

现在的口径（改章节信息前先读这一段）：

```
docs/NN-*/index.md 的 front matter：title / short / volume   ← 唯一源头
        │
        ├─ scripts/gen-graph.mjs  ──→  full-graph-data.js 的 CHAPTER_INFO（生成物，勿手改）
        │                                   │
        │                                   └─→  src/components/ml-home/data.js
        │                                          CHAPTERS / allChapterGroups() / volumeOf()
        │                                          （首页、知识树、图谱全从这里取）
        └─ scripts/check-chapter-sync.mjs  ──  比对上面这条链有没有断（构建闸门）
```

四条纪律：

1. **章名要改，去改那一章的 `index.md`**，然后跑 `npm run gen:graph`。**不要在 `data.js` 里再写一份**。
2. **`data.js` 现在只留两类东西**：① 卷一各章的首页文案（`VOL1_PROSE` 的 desc/tools——那是给读者看的介绍语，不是元数据）；② 卷册级介绍 `VOLUMES`（卷名/范围/描述，纯 UI 文案）。章名、短名、卷号、课数一律来自生成物。
3. **`npm run build` 现在先过 `validate` + `check:sync` 两道闸门**。`check:sync` 会同时拦下「改了章首页忘了跑生成器」和「src/ 里又长出第二份手写章表」（它只认 `const CH_TITLES = …` 这类**声明**，注释里提到名字不算违规）。
4. `999-references.md` 的 front matter 会**抄一份章首页的 volume/layer/track/stage/difficulty**（`gen-references.mjs` 的行为）。所以给章首页补 `volume` 之后，记得跑一次 `node scripts/gen-references.mjs`，否则 `validate` 会报「999-references 落后」。

**七卷配色**已从 `.ml-rg` 作用域提到 `:root`（`src/css/custom.css` 的 `--ml-vol1…7`，亮/暗各一份）；`.ml-rg` 只是别名。**新增卷时只在这一个地方加色**，别在作用域里再写 hex。

### 二、本轮踩到的两个小坑（都跟注释有关）

1. **块注释里不能出现 `*/`**：写「源头是 `docs/NN-*/index.md`」这种路径时，`*/` 会**提前闭合块注释**，随后整段中文被当代码解析，报 `SyntaxError: Unexpected identifier`。这一轮在 `gen-graph.mjs` 与一个临时脚本上各踩一次。写路径时改成「各章自己的 index.md」，或把 `*` 与 `/` 拆开。
2. **`docs/` 章节 front matter 的 `title` 带排版前缀**：形如 `第 16 章 · 傅里叶级数与傅里叶变换`。比对/生成时要脱掉 `^第 \d+ 章 · ` 再当章名用（`gen-graph.mjs` 与 `check-chapter-sync.mjs` 各有一份 `stripPrefix`，两边口径必须一致）。