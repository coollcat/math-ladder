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
docs/17-what-next/             # 「下一程导读」导览章：不入图谱/知识树（gen-graph.mjs 与 ui/server.mjs 均排除 17- 前缀），豁免九段式
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
src/components/doc-widgets/    # PrereqPanel 前置知识面板、RailControls 右侧栏折叠控件
src/pages/index.js             # 首页（演算纸视觉体系，样式全在 home.css 的 .ml-home 作用域内）
src/pages/tree.js              # /tree 知识树页（章节/单元双模式 + 搜索 + 巨大画布，KnowledgeGraphTree v2）
src/pages/graph.js             # /graph 知识图谱页（逐课泳道，KnowledgeGraphFull）
src/components/ml-home/        # 首页数据与组件：data.js(章节/卷册聚合)、full-graph-data.js(生成器产物勿手改)、HomeTree(章级树)、KnowledgeGraphTree(知识树v2)、treeLayout.js(纯布局引擎：排除第0章/章节聚合/重心交叉消减/祖先后代位图)、LearningEntry.js(继续学习/进度条，引图谱数据，只在首页用)
scripts/validate.mjs           # 方法准入 + 依赖顺序校验（构建闸门）
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

服务形态与运维：

- 启动 `node server/sync-server.mjs --port 8787 --data ./server/data`（默认端口 8787，
  只监听 `127.0.0.1`，由 nginx 反代 `/api/`；环境变量 `ML_SYNC_PORT` / `ML_SYNC_DATA` 同样认）。
- **路由自带 `/api` 前缀**（`POST /api/login`、`POST /api/logout`、`GET|PUT /api/sync`），
  所以 nginx 的 `proxy_pass http://127.0.0.1:8787;` **不能加尾斜杠** —— 加了会把前缀剥掉，
  表现是后端全 404，而服务本身一切正常。服务默认支持跨域（`OPTIONS` 预检 204，回显 `Origin`
  而非写死 `*`，因为带 `Authorization` 的跨域请求在部分浏览器上不接受 `*`）；加 `--no-cors` 关闭。
- 服务端数据全在 `server/data/`：`accounts.json`（账号库）/ `tokens.json`（令牌，30 天有效）
  / `store/<user>.json`（每账号数据）。**已加 .gitignore，绝不入库**；备份就是打包这一个目录。
- **改账号不必重新出包**（账号不在 bundle 里了），在服务器上跑 `--add-user` 即可。
  ⚠️ 建号命令已经换了：云同步模式用 `server/sync-server.mjs --add-user/--list-users/--remove-user`，
  **`scripts/add-user.mjs` 只管得上纯静态模式那份 `src/data/accounts.json`（前端已不再 import）** ——
  拿它建号在站点上登不进去。
- **本地开发要测登录，得自己把后端起起来**（dev server 不带它）：
  `node server/sync-server.mjs --port 8787 --data ./server/data` 常驻一个终端，
  再 `set ML_SYNC_API=http://127.0.0.1:8787/api && npm start`。
  不设 `ML_SYNC_API` 时前端按同源 `/api` 走，而 dev server（3000 端口）上没有这个路由，
  现象是登录永远「连不上服务器」。

**API 契约与数据口径看这里**（不要凭记忆改字段名）：

| 要看什么 | 去哪看 |
| --- | --- |
| 正式口径（长期） | [`REGISTRATION.md`](REGISTRATION.md) 的「云同步」一节：同步范围、合并规则、降级口径、服务端数据目录 |
| 部署与验收 | [`deploy/README-部署.md`](deploy/README-部署.md)：nginx / systemd 配置、建号、curl 验收、备份恢复、常见问题 |
| 接口字段细节 | `server/sync-server.mjs` 的实现本身（`/api/login` `/api/logout` `GET|PUT /api/sync`） |

> 施工期的规范文件是 `.codebuddy/tmp-sync-spec.md`（临时文件，收尾会删）——
> **不要把长期文档链到它上面**，口径已经抄进上面两个文件了。

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

**踩过的坑，别再踩**：

1. `segments()` 的尺度必须用**分位数**而不是 max−min。tan(x) 在渐近线旁那几个
   采样值能到几万，拿 max−min 当尺子，真正的跳变反而「不够大」，整条 tan 会连成一根。
2. 断点要在**均匀采样上先找出来，再逐段自适应细分**。反过来（先细分再判断）
   细分会在渐近线旁插出一堆巨值，把判据彻底带偏。
3. 采样要 `healIsolated()` 补掉孤立的可去奇点。sin(x)/x 在 x=0 是 0/0，
   采样点又刚好落在 0 上，不补的话这条最该被看见的曲线中间会留个缺口。
   只补「两侧都算得出且彼此挨得近」的——1/x 在 0 两边是 ±64 那种悬崖不能补。
4. 曲线换算屏幕坐标前，y 要夹到视窗外 20 屏（`sySafe`）。1/x 在极点能算出 1e12，
   直接换算出的像素坐标大到 Canvas 会整条不画。
5. 拖画布/缩放时**只重画不重采样**，重采交给防抖回调；拖滑块走 rAF 合并。
   每帧几千次函数求值会拖成幻灯片。
6. 积分遇到算不出的点：内部点两侧差得远 → 报 NaN（真极点）；
   两侧挨得近 → 插值补上（可去奇点）；端点 → 用内侧两点线性外推。
   `∫₀¹⁰ sin(x)/x` 就是靠外推算出来的（1.65835 = Si(10)）。
7. JSX 里写 LaTeX 示例必须走字符串（`<code>{'\\frac{\\sin x}{x}'}</code>`）：
   花括号会被当表达式，`\f` 会被当换页符转义。

**立体模式另有几条**：

8. 自变量表跟着模式走（2D 是 `['x']`，3D 是 `['x','y']`），由 `build(src, { vars })`
   指定。**切模式必须把所有式子重新编译一遍**，否则 y 的身份（自变量/参数）是旧的。
   2D 下 y 仍然是可调参数，这点别改——已经有人用 y 当旋钮了。
9. 三个方向必须先归一到可比的尺度再投影，z 还要乘 zScale（0.6）夸张一下；
   曲面起伏通常比 xy 范围小一个量级，不夸张看上去就是一张平板。
10. 旋转**不需要重新采样**：采样发生在 xy 平面上，与视角无关。拖动画布只重投影重画；
    真要重采的只有改式子、拖参数、改域这三种情况。拖动时 surface 内部会把
    精度降到 1/4（lod=2），否则 1600 个面片逐帧重画会掉帧。
11. 只画一条曲面。两个曲面互相穿插时画家算法排不对前后，叠着反而是添乱。
    要对比就让人把两式相减看高度差。
12. `healGrid2` 分辨可去奇点与真极点，靠的是**往外再走一步看落差**，不是四邻是否相等：
    `1/(x²+y²)` 在原点四邻对称、四个值完全相等，但往外一步从 400 掉到 100（75%），
    那是尖峰不是平板，补上就是在悬崖上铺一块假地板。`sin(r)/r` 往外一步只掉 0.1%，可以补。
13. 中心差分的分母是 `xs[i+1] - xs[i-1]`（全跨度），不是它的两倍。
    `(f(x+h)-f(x-h))/2h` 里的 `2h` 恰好就是这个全跨度，再乘一次 2 会得到一半的导数。
    曲面法线由它给出，错了整张图的光影都是歪的。
14. 悬停探针（反投影求光标落在 z=0 平面的 (x,y)）：水平面投影是正交矩阵，
    逆变换就是转置；T 从 ry 里扣掉 z=0 平面的高度贡献。仰角压到接近 0 时
    ry 与 u、v 无关，反解除零爆炸——`|sin(el)| < 0.05` 直接放弃探针。
15. `extrema2` 的同类合并是**双规则**：候选相距 ≤4 格直接并（谷线/山脊这类
    候选密集的线状结构），或从候选出发走「高度与种子相差 <1%」的格子泛滥
    （涟漪环带这种近平通道整圈连得通）。两条缺一不可：涟漪环在对角扇区有
    十几格的候选空洞，光靠距离连不上；尖谷谷线每步落差 20%，光靠等高连不动。
    另外极小**不能按 |z| 降序**排：谷底尖端 z=0 会被排到最后被 limit 截掉，
    显示出来的反而全是谷线远端的「极小」——极小按 z 升序（最深的先）。
16. `healGrid2` 往外走一步的邻居要看守住边界：`z[k-2]` 在 j==1 时索引合法
    但**位置在上一行末尾**（比越界更隐蔽），负索引则靠 undefined→NaN 侥幸。
    显式给 NaN 才是「这一侧没有第二步」的正确表达。
17. 画布高度：CSS（`.ml-fn__plot` 的 440/360/300 响应式）是唯一事实来源，
    JS 侧别再抢着给默认 420——窄屏时画布比容器高 120px，底部被
    `overflow:hidden` 切掉。`workspace` 只把课文显式给的 `height` 传下去。

**嵌进课文时（2026-09-04 卷一回填 28 门课的实证）**：

18. **围栏写 ```lab，不是 ```viz**。see-function 注册在 `lab/registries/ch00.js`，
    写成 viz 会被 validate 以「未知 viz 类型」拦下；但 validate 对 lab 块**只查
    JSON 合法 + type 白名单 + 滑块规格，不查 funcs/params 字段**——字段错了照样放行，
    出错只发生在页面上，必须人工逐块核对。
19. **params 初值必须落在 [-10, 10]**：`workspace.js:582` 把滑块范围**写死**为
    `min=-10 / max=10 / step=0.05`，没有自定义入口。初值超范围（如 `{"C": 24}`）
    会被浏览器夹到 10，滑块把手与实际取值对不上，用户一拖曲线跳变。
    修法是用派生写法绕开（`C=24` 改成 `4*a` 且 `{"a": 6}`），不是硬塞超范围初值。
20. **3D 块的曲面要在 domain 内看得见**：`mode:"3d"` 时域是 `[-domain, domain]²`，
    `sqrt(R^2 - x^2 - y^2)` 这类式子必须让 R 的初值 ≈ domain，否则 R 远小于 domain
    时只有极小一块有值、R=0 或负则整块空白。另外**3D 下 y 是自变量不是参数**，
    `a*x + b*y + c` 里只有 `a/b/c` 进 params。
21. 除零式（`q/(p-1)` 这类）滑块能拖到分母为 0：JS 不崩（得 ±Infinity，曲线画不出来）。
    要么改式子，要么像 08 章 35 课那样**把它写成教学点**（"p=1 时该改用等差数列"）。

`lab/registries/ch00.js` 是**通用工具分册**，放不属于任何一章的站级组件
（validate.mjs 扫整个 registries/ 目录，新增分册不必改校验脚本）。

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
- **两个图谱页的分工（2026-09-02 定案）：/tree 画树、/graph 画泳道**
  | 页面 | 组件 | 画法 | 模式 |
  | --- | --- | --- | --- |
  | `/tree` 知识树 | `KnowledgeGraphTree` | 树（块布局） | 章节模式 = 边聚合到章；单元模式 = 逐课 805 节点（默认单元） |
  | `/graph` 知识图谱 | `KnowledgeGraphFull` | 泳道图 | **没有模式，只有排序**：按难度（默认）/ 按章号 |

  **/graph 一套渲染代码、两套粒度**（内容真不一样，不是换个排序）：
  | 档位 | 泳道 | 胶囊 | 连线 |
  | --- | --- | --- | --- |
  | **章档（默认）** | 卷（六卷） | 章（71 颗，胶囊上是章号） | 章级聚合先修边 `aggregateChapters()` + 章级血缘 |
  | 课档 | 章（71 条） | 课（811 门，胶囊上是先修深度） | 课级先修边 + 课级血缘 |

  两套都由 `VIEWS = [CHAPTER_VIEW, LESSON_VIEW]` 描述（nodes / edges / toolEdges / laneKeys / laneKeyOf /
  laneMain / laneSub / badge / label / tip / to / pills / stat），渲染代码只看 `view.*`，加档位只改这个数组。
  每档还有自己的排序开关（章档：按卷 / 按难度；课档：按章号 / 按难度），组件接口 `defaultView` + `defaultSort`。
  演变（都被用户当面否过，别再走）：曾分「章节模式 / 单元模式」两种模式，但内容完全一样（都是一章一排课），
  只有泳道顺序不同；后来把「按章节走」理解成泳道分组，用户指出**胶囊还是一门门的课**，于是改成章档为默认。
  **「按章节走」= 内容粒度是章，不是泳道叫什么。**
  难度度量：章难度 `CH_DIFF` / 卷难度 `VOL_DIFF`，都是所辖课程**平均先修深度**取整。
  `layout()` 会**剔除没有节点的泳道**（没有未归卷的章时「其它」那条就不出现）。
  走过的弯路（都别再走）：
  1. 单元模式做成「泳道 = 先修深度层」——画面上皮囊跟章节模式一样是一排排胶囊，只有左侧标签不同；
  2. 泳道按章、但横向按难度列铺开（跨泳道同列 = 同难度）——同一章同深度最多 6 门课会撞车，
     严格对齐要 126 个胶囊位 → 画布宽近 2 万 px。
  ⚠️ 已知小缺口：`CHAPTER_INFO` 来自 `allChapterGroups()`，只覆盖 VOLUMES 里写到的章；
     落在卷之外的章（目前 53、60、66 章）左侧会退化成「N 章」。要修得动 `data.js` 的卷区间，属数据层，暂不动。

  两处「章节 / 单元」是**同一对语义**（聚合 vs 逐课），只是画法不同——别再往 /graph 里塞树，那会变成两棵知识树。
  `KnowledgeGraphFull` 的模式由 `defaultMode` 属性给（默认 `'unit'`）。**改模式相关的逻辑，下面六处必须一起动**：`laneKeys(mode)` 泳道口径、`laneKeyOf(mode,i)` 取值、`layout(mode)`、`L2` 筛选后的泳道压实与**空泳道剔除**（否则筛选完图还是那么高）、`shownIn(mode,i)` 的显示过滤、`laneName(mode,key,count)` 左侧泳道名。
  左侧泳道标签是**两行**：上排 `难度 N`（`.ml-fg__band`，11.5px），下排章名（`.ml-fg__bandsub`，9.5px 更淡）。
  **两条文案纪律**（都是用户明确否掉后定下的）：
  1. 不要「第 N 层 / 第 N 章」这类序号套话——深度是个度量不是编号；节点 tooltip 与信息面板同理写「先修深度 5」；
  2. **不要写「· M 门」**（课数）。
  栏宽 `GUTTER=88px`：「难度 38」约 60px、章名 4 字约 46px，都塞得下。泳道高 48px 容得下两行。
- **单元模式从「第 3 层」起画**（`UNIT_MIN_DEPTH = 3`）：第 1 层是几门根课、第 2 层只有一门，画出来是顶部两条几乎空着的泳道，观感和章节模式差太远。这两层的课在章节模式里都在各章泳道的开头，切过去就能看。
  口径与知识树页排除第 0 章一致：**不适用的节点整个不进布局**（`shownIn()` 在布局、边、血缘边、节点渲染、搜索命中等各处都要过滤），不是画出来再 CSS 藏掉——后一种做法会留下指向空处的连线。
- **两个图页的筛选口径一致（2026-09-04 定案）：筛选 = 重排，不是擦淡留在原位**。
  点节点后无关的胶囊/连线一律隐藏，并且**重新排版**（撤掉空泳道/空层、层内压实槽位）；
  只把无关的擦淡留在原位＝画面大半是空的，用户明确否过。
  - /graph：`layoutRows(visible, …)` 每次筛选重排（空卷/空行整条撤掉，剩下的向左压实往上靠）。
  - /tree：`treeLayout.compactLayout(L, visible, opts)`（纯函数，可 node 单测）——撤空层、
    层内压成连续槽位、层内多行（单元模式章块网格）按 y 分簇且行距收一档，
    收尾再整体挪一次把内容框回原 viewBox（原布局的层带中位数松弛的平移量、不绕 0 居中，
    直接按中轴摆会被 SVG 裁掉一排胶囊）。
  - ⚠️ **CSS 特异性陷阱**：`.is-off`（隐藏）与靠后的 `.xxx.is-in`（入场淡入）同为「两个类」，
    按源码顺序后来者胜——知识树就因为 `.ml-tr__edge--branch.is-in` 写在后面，
    选中后无关连线擦不掉。隐藏类一律加 `.ml-tr__svg` 提权到三档（0,3,0），顺序不再影响结果。
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
- **账号与进度体系（2026-08-30 改版：无申请页、凭据不公示、进度全开放；2026-09-04 加固：账号去明文化 + 防枚举）**：登录页 `/login`（`src/pages/login.js`）**不再展示任何账号或密码**——只有表单 + 一句「账号由站方开通，凭据请联系维护者索取」；站内无注册页、无申请页（原 `/registration` 已删，导航只留「登录」）。**登录失败只有一句「用户名或密码不对」**：绝不区分「没这个账号」和「密码错」——分两句等于把账号名单摆出来让人一个个试。账号库 `src/data/accounts.json` 是 `{lookupSalt, decoySalt, users:[{u,salt,hash}]}`：`u = sha256(lookupSalt + ':' + 用户名小写)` 是**用户名索引**，库里没有任何明文字段（明文名单只留在站方本机的 `scripts/accounts-index.json`，gitignored、不进 bundle）。**2026-09-04 云同步改造后账号校验搬到服务端**：前端不再 import 这个文件（bundle 里一个账号哈希都没有），服务端账号库是 `server/data/accounts.json`、用 `sync-server.mjs --add-user/--list-users/--remove-user` 维护；上面这套旧口径只在「恢复前端账号库」的纯静态场景下才重新生效。校验入口只有 `src/auth/index.js` 的 `verifyAccount()`：账号不存在时拿 `decoySalt` 跑同样一次哈希、`safeEqual` 定长比较、遍历不提前 break —— 两条失败路径等耗（实测比值 0.95），登录页还统一加了 350ms 延迟。账号管理**已经换了命令**：云同步模式在服务器上跑 `node server/sync-server.mjs --add-user <用户名> <显示名> <密码>` / `--list-users` / `--remove-user`（改完不用重新出包）；**`node scripts/add-user.mjs`（`--list` / `--check` / `--remove` / `--migrate` / `--rotate-salt`）只在纯静态模式还用得上，那条路前端已经不再 import 账号库了**（细节见 `REGISTRATION.md`）。哈希口径在 `src/auth/index.js`（自实现 SHA-256，已与 node:crypto 做一致性测试）与 add-user.mjs 两侧必须一致，**改口径要两边一起改**。出包前跑 `node scripts/check-build-auth.mjs`（已串进 `构建Linux部署包.bat` 第 4 步，硬错误中止打包）：账号指纹没进 build、或产物里搜到 ≥7 字符的明文用户名 → 报错；短名命中 → 警告 + 打印上下文。
- **进度系统（命名空间存储）**：进度对所有人开放——未登录存本地游客空间 `ml-progress:guest` / `ml-exercises:guest`，登录后存 `ml-progress:<用户名>` 等账号空间（同一浏览器多账号互不混淆）；旧版无命名空间 key 由 `migrateLegacyProgress()` 首扫自动迁移。文末进度按钮标记后 dispatch `ml-progress-changed` 事件，右栏进度条监听同步。`enhanceProgress` 清除按钮只清当前空间。
- **存储层单一事实来源（2026-09-02）**：`src/learning/progress.js`。三份数据都走它——学完标记 `ml-progress:<ns>`、练习通过 `ml-exercises:<ns>`、**续学位置 `ml-last:<ns>`**（进课程页由 `enhancer.enhanceProgress()` 写入 `recordVisit`）。enhancer 与右栏挂件都 import 它，不要在别处再写一份 localStorage 读写。**它刻意不 import full-graph-data**（222KB 图谱）：enhancer 每页都会跑，引了就打进主包。
- **数据面板（2026-09-04 新增，右下角第三个圆钮 `ml-bk-fab`，Alt+D）**：`src/pyrunner/backup.js`，按需动态 import。**背景：云同步只在「部署了后端 + 已登录」时生效**——纯静态托管或后端挂了的时候，登录只换抽屉不搬东西，游客攒的进度登录后看着像「没了」；换设备更是全不带走（导出 `.json` 仍是唯一的离线兜底）。面板管四件事：① 导出（全部空间 / 单个空间 → `math-ladder-<空间>-<时间戳>.json`）；② 导入（**合并**为默认：进度取并集、笔记本按本子 id 合并单元、代码按内容去重；覆盖需二次确认）；③ 空间搬家（游客 → 当前账号，源空间保留）；④ 快照（`ml-snapshot:<ns>`，一空间一份，误删兜底）。跨空间读写 API 分别在 `progress.js` 的 `listSpaces/readSpace/writeSpace/clearSpaceNS` 与 `notebook.js`、`repo.js` 的 `peek*/write*`（**都显式传 ns**，避免误读当前空间）。三个坑：① 笔记本要用 `peekNotebook` 而不是 `load()`——`load()` 没数据时会自动造一本《我的笔记本》，导出的备份里就永远多一本用户没写过的；② `listSpaces` 的正则要排除 `ml-snapshot:<ns>`，否则快照键也冒充一个空间；③ 写的是当前打开的空间时，必须把内存里那份 `data` 置空并重渲染，否则面板还显示旧内容。**对用户必须说清**：没有后端替他存，换设备全靠那份 .json。
- **首页「继续学习」（2026-09-02）**：`src/components/ml-home/LearningEntry.js` 只被首页引用，可以安全 import 图谱数据。判定顺序：有停留记录且那课未学完 → 回到那课；那课已学完 → 顺延到课程顺序里的下一门未学课；既无停留记录也无学完标记 → 退回「随机翻一章」。水合安全：首渲染一律走随机分支，挂载后才换。按钮下方 `ProgressStrip` 显示已学节数/百分比/存在哪个空间。
- **论文下载（2026-08-30 改版：双路门禁）**：paper 卡片的「文献页面」对所有人开放；PDF 按钮由 `enhancer.js` 的 `paintPdfButton()` 决定去向——**已登录且有归档副本** → 虚线转实线、文案「⬇ 本地下载（x.x MB）」、`href` 指向 `/papers/xxx.pdf` 并带 `download`；**未登录**（或该条目没归档）→ 文案「⬇ 原站下载 / ⬇ PDF 下载」、新窗口打开原始地址。登录态在别的页面变化后，靠 `ml-auth-changed` 事件整体重刷按钮（`setAuth`/`clearAuth` 会 dispatch），不必等路由切换。
- **归档现状（2026-08-30）**：211 条条目里 **64 条有 PDF 副本（30.3%）**，共 62 份文件、375 MB（`static/papers/`，不入库）。剩下 147 条绝大多数是「只有 Wikipedia/官网页面」的条目——历史原著只有借阅受限的扫描件、1950–1990 年代期刊论文没有开放获取版本，这些既不编造链接也不硬凑，留 `@page` 即可。
- **归档流程**：`node scripts/fetch-papers.mjs`（增量抓 PDF 到 `static/papers/`，`--force` 全量、`--check` 体检）→ `node scripts/gen-references.mjs`（把 `@local64` + `@lsize` 写进条目）。两个顺序不能反：生成器只在**磁盘上真有该文件**时才写 `@local64`，所以没跑过下载的克隆会自然退化成「全部走原始地址」，绝不出死链。`static/papers/` 已加进 `.gitignore`（375 MB，可随时重抓），清单 `papers-local.json` 入库。`validate.mjs` 挂了第三条检查：副本缺失只**警告**不拦构建。
  **构建体积提醒**：这 375 MB 会原样进 `build/`。嫌大的话按「体积/价值」删（最大的几份：Sutton & Barto 教材 69.7 MB、Stable Diffusion 39 MB、Fourier 33 MB、Ars Conjectandi 28.4 MB、Cauchy 23.9 MB），删完跑一次 `gen-references.mjs` 就会自动不再引用。
- **右栏挂件（2026-08-29）**：`src/theme/TOCItems/index.js`（swizzle wrap）在右栏目录上方渲染「前置知识面板 + 学习进度条」；前置知识面板组件抽到 `src/components/doc-widgets/PrereqPanel.js` 供两处复用——正文内实例（`variant="inline"`）桌面隐藏、窄屏横条；右栏实例（`variant="toc"`）窄屏隐藏。阅读区拉宽：`main[class*='docMainContainer']` 容器 1140→1360px、正文列 58%→76%。
- **侧栏折叠（2026-09-02 定案）**：左侧章节导航**只用 Docusaurus 自带的「收起侧栏」按钮**（侧栏左下角），它会同步驱动 theme 内部的 `docMainContainer` / `docItemWrapper` 宽度；`RailControls` 只保留右侧把手（`ml-side-r-collapsed` 加在 `<html>` 上）。早先在左侧也挂过一个把手，那套 `display:none` 写法与新版 flex 布局打架（点了没反应），已删。折叠右侧后 `custom.css` 要同时松绑三层（`docItemCol` 的 `max-width:75%!important`、隐藏 `col--3`、容器的 1360px 上限置 `none`），少一层就铺不满。左侧章节默认折叠由 `docusaurus.config.js` 的 `sidebarCollapsed: true` 控制（只自动展开当前课所在的那条链）。

### 笔记本 / 代码仓库（2026-09-02 新增）

右下角现在有两个圆钮：**Py**（浮窗控制台，原本就有）与叠在它上方的**笔记**（数学笔记本，`Alt+N`）。

- **共用同一个 Python 命名空间**：笔记本单元跑在 `_ml_console_g` 里，与浮窗「▶ 运行」完全同一套变量——笔记本里 `x = 3`，浮窗里 `print(x)` 就是 3。实现上是 enhancer 新增的 `execInConsole(source, opts)`（导出给 notebook.js 用），与浮窗 `run()` 的差异只是不读槽位/滑块/判题。单元右键式的三个联动按钮：送到浮窗（`openInConsole({key:'nb'})`，不动随手算草稿）、取回浮窗代码、存进仓库。
- **数学向优化**：笔记单元支持 Markdown + `$...$`/`$$...$$`（KaTeX 按需 `import('katex')`，不进主包）；**浮窗控制台的 print 输出同样会渲染公式**（`appendText` 走 `mathout.setMathText`：先写纯文本再异步升级，判题比较的是 `normalizeOut(textOut)` 字符串、不读 DOM，所以不受影响）。内置 `show(x)`（`HELPER_PY`，每次运行前注入）把对象转成 LaTeX，装了 sympy 就走 `sympy.latex`。
- **模板库**：`TEMPLATES` 按 `g` 字段分组（入门 / 符号计算 / 数值方法 / 线性代数 / 概率统计 / 画图 / 数学写法），选单用 `<optgroup>` 渲染。新增模板只要往这个数组里加一项。**sympy 不用按钮**：`execInConsole` 与浮窗 `run()` 都会检测源码里的 `import sympy` 并 `loadPackage('sympy')`（与 matplotlib 同一套按需逻辑）。
- **公式输入器**（`formula.js`，浮窗工具条与笔记本工具条都有入口）：分类符号面板（常用/希腊/运算/关系/结构/函数）+ LaTeX 源码框 + 实时预览，插入到「最后一个被聚焦的输入框」的光标处（`focusin` 记录目标，面板自己的控件除外）。
  **插什么由目标类型决定（`targetKind()`）**：
  | 目标 | 插入内容 |
  | --- | --- |
  | 笔记单元 `.ml-nb__md` | **公式本身**：`$…$` / `$$…$$`（勾掉「包成公式」则插裸 LaTeX） |
  | Python 代码区 `.ml-console__editor` / `.ml-nb__code` | **代码**：`print(r"$$…$$")`（用 raw string 保住反斜杠；源码里的双引号换成单引号，别截断字符串） |
  | 其它输入框 | 按笔记的规矩插带定界符的公式 |

  往代码里塞裸 LaTeX 会直接语法错误，这条边界别模糊。插入时若光标不在行首会先补换行。
  配套：**笔记单元的编辑框被隐藏（渲染态）时也可能被外部改内容**，所以 md 单元的 `input` 处理里有一条 `if (ta.style.display === 'none') paintMd(wrap, cell)`——公式面板正是这么插进来的，不重画用户就看不到刚插的公式。
- **代码补全**（`complete.js`）：候选 = 静态词表（关键字/内置/常用方法名）+ `harvestWords(源码)` 抓到的自定义名 + 运行后从 `_ml_console_g` 取回的变量名。`Ctrl+空格` 唤出，`Tab` 有候选就补全、没候选照旧缩进两格。`attachComplete(ta)` 必须挂在编辑器自己的 `keydown` **之前**：它吃下的按键会 `stopImmediatePropagation`，否则补完还会多俩空格。
- **Python 运行时缓存**：`static/ml-pyodide-sw.js` 只拦截三个 CDN 域名下的 `wasm|js|mjs|zip|json|data|txt|whl|so` 请求，存进 Cache Storage（缓存名 `ml-pyodide-v1`，与 enhancer 的 `SW_CACHE` **必须同名**）；其余请求不调 `respondWith`，站点文件不受影响。enhancer 在 `initPyodide` 里注册 SW，并先用 `caches.match(base+'pyodide.asm.wasm')` 判断有没有缓存，有就把状态文案换成「从本地缓存装载」。
- **渲染坑**：Markdown 里的公式必须先抽成 token（私有区字符 `U+E000` 包裹下标），等排版完再换回 KaTeX 的 HTML——否则转义、切行、列表包装会把 LaTeX 里的 `<>&` 弄坏。**不要改用 `\u0000`**：构建链路（Rspack/SWC）见到它会在日志里刷 `Character { ... raw: Some(Atom("\0")) }`，且一旦被吞掉，空 token 会让正则把正文里每个数字都当成公式。
- **存储**：笔记本 `ml-notebook:<ns>`（含多本、多单元；**输出不落盘**，图片 base64 太大）、代码仓库 `ml-repo:<ns>`（条目 = `{id,name,code,from,at}`，上限 200 条，支持 .py 导入与 .json 导出）。都是本机 localStorage 的命名空间隔离，**不是云同步**——换设备要导出/导入。
- **仓库条目操作是竖排的**：载入 / 插入（追加到编辑器末尾，不覆盖）/ 改名 / 更新 / 删除，五颗按钮竖着排（横排在窄屏会挤成一团）。「插入」走 `api.insertSource`，「载入」走 `api.setSource`（替换整个槽位）。
- **面板与层叠**：三个面板（`控制台 / 笔记本 / 仓库`，外加公式输入器）都与 `.ml-console` 同构（固定定位 + 头部可拖）。层级由 `zorder.js` 统一管理：谁最后被点谁在最上面，每次交互按栈重排 z-index 为 1056/1057/1058（**不用递增写法**，否则点几十次就盖过圆钮 1060）。新增面板只要 `watchPanel(el)` + 打开时 `bringToFront(el)`。enhancer 跨代重建浮窗时会调 `dropNotebookShell()` 一并拆掉 `#ml-nb-fab` / `#ml-notebook` / `#ml-formula` / `#ml-repo`；各模块打开时检查 `document.contains(els.panel)`，不在就重建。`Root/index.js` 的 MutationObserver 已把 `#ml-notebook`、`#ml-repo` 加进「自留地」过滤，避免打字时重扫正文。

### 顶栏 v2（2026-09-02 整条重做）

- **Docusaurus 自带那条已被完全替换**：`src/theme/Navbar/index.js` 是 swizzle 后的整体接管（不是 wrap），`docusaurus.config.js` 的 `navbar.items` 已清空——**改导航请改组件里的 `LINKS`**，往 config 里加条目不会被渲染。
- 结构：左（朱砂印章「数」+ 数学阶梯 + 副标题）· 中（带图标的 4 个导航项）· 右（搜索 + 账号芯片/登录钮）· ≤996px 收成汉堡 + 下拉抽屉。视觉延续首页的「演算纸 × 印章朱砂」：暖纸底 + 方格纸底纹、墨蓝字、激活项是从中间 `scaleX` 长出来的朱砂下划线。
- **必须保留外层的 `navbar navbar--fixed-top`**：sticky 定位、`--ifm-navbar-height` 与侧栏/锚点的偏移计算都挂在上面，别换成自定义定位。
- **搜索框的类名不是 DocSearch-\***：本地搜索插件（`search-local`）渲染的是 `<div class="navbar__search"><input class="navbar__search-input">`，外观被 Infima 的 `.navbar__search-input` 和插件自带的 CSS module 共同管着。本站的覆盖规则一律写成 `.ml-nav .ml-nav__search .navbar__search-input`（三级选择器）——只写两级会和插件的 `.navbar__search-input:not(:focus)`（窄屏收成 2rem）撞成同权重，谁赢看打包顺序，不稳。
- **文档侧栏不依赖顶栏**：移动端那个侧栏抽屉由 `DocRoot/Layout/Sidebar` 自带（含 `ExpandButton`），所以顶栏换掉不影响课程目录的移动端使用；被去掉的只是「navbar items 抽屉」，那条我们自己有。
- **外观是一颗按钮循环三态**（亮 → 暗 → 自动），和 Docusaurus 原本那个一样：用 `useColorMode()`（`@docusaurus/theme-common`）取 `colorModeChoice`（`'light' | 'dark' | null`，null = 跟随系统）与 `setColorMode(v)`，选择由 Docusaurus 存进 localStorage、刷新保留。
  **图标别只靠 React state**：`colorModeChoice` 在 SSR 恒为 null、挂载后才校正，只用它会导致每次刷新先闪一下「自动」。所以三个图标全部渲染，由 CSS 按 `html[data-theme-choice='light'|'dark'|'system']` + `.ml-nav__modeicon[data-mode=...]` 决定显示哪个；该属性由 Docusaurus 用 `<head>` 里的内联脚本在首帧前写好。React state 只用来算 title / aria-label。
- **右侧控件统一 34px 高**（链接 / 登录 / 账号 / 外观 / 搜索 / 汉堡），共用一条中线——原先各用各的 padding，视觉重心会一高一低。激活下划线贴到 `bottom: .28rem`，别顶着文字。
- **顶栏的垂直居中靠「上下等宽 padding + min-height」**：选择器写成 `.navbar.ml-nav`（双类）压过 Infima 的 `.navbar`（单类，同权重时看级联顺序、不稳）；`height` + flex 居中那套在 padding 被覆盖时就会整体偏高。
- **入场动画不要给链接加纵向位移**：`translateY(-8px)` 配 `animation-fill-mode: both` 时，动画开始前的 backwards 填充会把元素先摆高 8px（看着就是「导航项靠上」）。链接改成纯淡入（`ml-nav-fade`）。
- **图标集** `src/components/icons.js`：24×24 描边式，`stroke="currentColor"`，一律 `aria-hidden`（语义由外层按钮/链接承担）。React 用 `<Icon name="home" size={17}/>`，手搓 DOM 用 `iconSvg('notebook', 24)`（笔记本圆钮走这条）。新增图标只改 `ICONS` 表。
- 圆钮上的「笔记」已改成**图标**：两个圆钮上下挨着，文字会糊成一团。图标版要显式 `display:flex` 居中（原来靠 button 默认的文字居中）。

### 首页与章级知识树（2026-08 重做）

- 首页视觉 = 「演算纸 × 印章朱砂」：方格纸网格底纹（`.ml-gridbg`）、暖纸底、衬线大标题、朱砂印章/书签条、印刷硬阴影。
- **口径更新（2026-09-02）：本站目标不再是「从 1+1 到傅里叶」——终点是人工智能与前沿数学**，傅里叶只是卷一「信号与变换」那一段的枢纽站。别在新写的文案里再把傅里叶当终点。顶栏副标题写作「从 1+1 到 AI 与前沿数学」。
- **六卷墙的卷首徽章「N 章 · M 课（已开课）」已删除**：章节数随时在变，写死的统计容易误导，芯片墙上数一数就够（数据在 `data.js` 的 `rangeLabel` / `range` 里，需要时还能取回来）。全部设计变量收在 `.ml-home` 作用域（home.css 顶部），**不要写成全局规则**，避免污染站内其他页面；英雄区规则必须带 `.ml-home .ml-hero` 前缀压过 custom.css 的旧 `.ml-hero`。
- **标题字体/字号必须走 Infima 变量**：Infima 的标题规则是 `h1:not(#\#):not(#\#)`（双 ID 特异性），任何类选择器都压不过；在 `.ml-home` 上改 `--ifm-heading-font-family / --ifm-h1-font-size / --ifm-h2-font-size`，小标题用 `.ml-home main h3 { --ifm-heading-font-family: ... }` 按元素继承退回无衬线。
- `HomeTree.js`（章级树）交互：滚动入场逐层生长 + 「重播生长」；**点击章节胶囊＝聚焦**——沿跨章先修边求上/下闭包，无关章节隐藏、可见各层横向重新居中（与 KnowledgeGraphTree 同一套 shifted 算法），绿=先修、橙=托起；双击或信息条按钮进入本章。实现要点：入场动画的逐节点 delay 在 SETTLE_MS 后统一清零（settled 状态），否则筛选切换会被旧延迟拖慢。
- **首页英雄区按钮（2026-09-02）**：只有「从第 0 课开始」与 `ContinueButton`（有记录→继续学习/下一课，没记录→随机翻一章）；原来的「看知识树生长」已删（/tree 的入口保留在导航栏与下方知识树小节）。按钮下方的 `ProgressStrip` 只在有记录（或未登录的游客空间也有学完标记）时才出现。
- **树整体收窄一档（2026-09-02）**：三处布局常量是一套，改一个要跟着改另两个——`KnowledgeGraphTree.js` 的 `LESSON_OPTS/CHAPTER_OPTS`、`HomeTree.js` 的 `PILL_W/PILL_H/GAP_X/LEVEL_H/TOP_PAD`、`home.css` 里对应的胶囊字号（`.ml-tr__svg .ml-fg__node text`、`.ml-ht__reveal text`）。现档位：单元模式胶囊 128×26 / 层距 62 / 章块最多 6 列，章节模式 112×26 / 层距 54，首页树 126×28 / 层距 70（`treeLayout.js` 的默认值已同步）。胶囊收窄后 `fitText` 可用宽度变小，字号不跟着降就会顶到圆角。

### 知识树页 /tree v3（2026-08-31 重做：紧凑块布局 + 渲染直改 DOM；v2 为 08-29 双模式）

- **排除第 0 章**：`treeLayout.js` 的 `filterCh0()` 在模块加载时把 `NODES` 里 `ch === 0`（Python 工具箱）整章剔除，并重映射 `EDGES`/`USE_AGG` 索引——第 0 章不再作为旁支挂根。注意这是**树页的视图层过滤**，不改 `full-graph-data.js` 源数据（/graph 与首页仍含第 0 章）。
- **单元模式 = 章节块布局（`blockLayout()`）**：章 DAG 决定约 20 个「带」（章粒度最长路径，`chapterLevels()`），每章的课在带内排成 ≤6 列的紧凑网格块（2026-09-02 由 5 列放宽到 6 列，块更接近正方形、横向占地更小）——**同章课程永远收在一个矩形块里**（v2 逐课最长路径会把一章拆到 5~8 层）。带内块按章 DAG 重心消叉排序 + 块级中位数对齐松弛（钳位防重叠）。章内边在块内走短弧线（同层弧深度随水平距离缩放、封顶 sagCap）。
- **章节模式 = `layeredLayout()`**：坐标分配已改为「层内紧凑槽位（绕中轴居中）+ 层间中位数对齐松弛」——层内零空洞（v2 旧算法「继承父 x + 逐层居中」实测占用率仅 65%、空洞 429 个）。曾试过 Buchheim 紧凑树：本图深窄（46 层、叶子多），占用率反跌到 20%，弃用。
- **渲染性能**：SVG 结构按模式 `useMemo` 静态化（805 节点 + 1125 边不随悬停/选中重渲染）；悬停/选中/搜索高亮与选中位移全部直改 DOM（`classList` 带 `__cls` 变更缓存、`transform`、`path d`）；React 只管工具栏与信息面板。挂载期事件监听（[] 依赖）经 `fnRef` 调最新闭包；`sel/hot` 在模式切换过渡渲染里可能越界，统一先夹紧（`selS/hotS`）再用。
- **布局与位图都在模块加载时算一次**（块布局 ~14ms），不随悬停重算；`aggregateChapters()`/`chainOf()`/`popcount()` 照旧。
- **搜索**：实时高亮命中（`is-search`），回车定位并循环轮询（`jumpTo(i, 1)` 同步平移缩放 + 聚焦筛选）；点击胶囊 `jumpTo(i)` 保留当前缩放只居中。
- **视图坐标有两套，混用就会「不居中」（2026-09-02 修）**：
  | | 世界坐标 | SVG 元素坐标 |
  | --- | --- | --- |
  | 来源 | 布局算的 `p.x / p.y`，x 以 0 为中轴，故 `L.minX` 是负的（单元模式 −2462） | `viewBox="minX 0 width height"` 平移后，`[0,width]×[0,height]`，画布的 CSS transform 作用在这一层 |
  | 换算 | 元素 x = 世界 x − `L.minX`；元素 y = 世界 y（viewBox 的 y 起点是 0） |

  坑位三处，都在 `applyView` / `fitSel` / `jumpTo` 里，已统一由 `toElem(b)` + `applyView(b, {center, noClamp})` 处理：
  1. `shiftPositions` 给的 `bounds` 是**世界坐标**，直接拿它算中心会偏出去 `|L.minX| × k` 像素（根节点选中最夸张：节点落在屏幕 x=4086，视口才 1200 宽）；
  2. 垂直居中原本写 `(vh − H)/2`，等于假设 `minY = 0`，选中内容一深就整体下移出屏；
  3. 拖到边的夹取上界写的是 `pad`，正确值是 `pad − e.minX × k`（内容在元素坐标里未必从 0 开始）。
  另：`fitSel` 的缩放下限从 0.15 提到 **0.42**——连通路径常纵贯全树，缩到 0.16 字都看不清；装不下时改为把**选中节点**摆到视口正中（装得下才整块居中）。`noClamp` 只给 fitSel / jumpTo 用，拖动与滚轮仍要夹住，否则一拖就把画布甩没了。
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
- localStorage key 清单：ml-progress（学完标记）/ ml-exercises（判题通过）/ ml-exercise-drafts（旧版遗留，只读兼容）/ ml-console（drafts 多槽位草稿 + pos）。

## 浮窗控制台与滑块系统（2026-09-01 定稿，踩坑实证）

- **滑块规格解析时机**：`parseSliders()` 只在点「▶ 浮窗实验」那一刻执行一次。用户在浮窗编辑器里改 `# sliders:` 行（改初值/范围/步长）必须**每次运行前重解析**——`run()` 读 source 后、注入参数前调 `refreshSliderSpec(source)`：规格有变就整行重建滑块（初值/上限按新行），没变就保持拖动位置。
- **双向同步语义**：拖滑块 = 滑块→代码（注入 `_ml_extra`）；「⇄ 从代码同步参数」= 代码→滑块（运行后从 `_ml_console_g` 读同名变量，clamp 回填）。代码里给滑块同名变量赋值会覆盖注入值，此时点同步滑块会跳到代码值。
- **模块级回调必须调 `st._run` 而不是 `run`**：`run` 是 `ensureConsole()` 内部局部常量，`renderSliders()` 等模块级函数够不着——直接调会 `ReferenceError: run is not defined`（260ms 防抖后爆，已踩）。`run` 定义后已 `st._run = run` 暴露。
- **`toJs({depth:1})` 默认把 Python dict 转成 Map**，`vals[s.name]` 永远 undefined——必须带 `dict_converter: Object.fromEntries`（已踩）。
- **跨代重建（HMR 结构性坑）**：`consoleState` 挂在 window 上跨热更新共享，旧面板按钮闭包永远是「造壳那一代」的代码——热更新后新修复装不进旧按钮，除非整页刷新。对策：
  - 模块代次 `window.__mlEnhancerGen` 每次模块重执行 +1，建壳时在 panel 上盖章 `panel.__mlGen = GEN`；
  - `ensureConsole()` 发现壳是旧代建的（或领养分支 `panelEl.__mlGen !== GEN`）→ `stashCurrent()` 保编辑内容 → 拆壳重建 → 结尾按 `st._restoreAfterBuild` 恢复；
  - **恢复时必须带完整槽位元数据**：`applySlot(restore.slot, {})` 会丢滑块规格/判题模式/恢复源。restore 要携带 opts = `{original, resetSource, title, prompt, exercise, sliders}`（来自 `st.originals[slot]`/`st.resets[slot]`/`st.slotTitle`/`st.prompt`/`st.exercise`/`st.sliders`）。
- 同步提示分三态，别一律说「没有可同步的滑块变量」：有赋值变化→「已把代码里的参数同步到滑块，自动重跑」；无赋值但滑块规格变了→「滑块已按代码里的 # sliders: 行更新」；都没有→「代码里没有给滑块变量赋新值，滑块保持不变」。

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
- **P2**：风格不一致、可延后的体验升级和非阻塞边界补强。登记到 `AUDIT_REPORTS/OPEN_ITEMS.md` 后择期处理（处理完即删除该行）。

批量任务收尾必须报告：已完成文件、新增/复用组件、validate/build/h2 结果、浏览器抽测结果、未完成项和下一入口。不接受"基本完成"这类不可验证结论。新会话先跑 `npm run validate`，再读 `ROADMAP.md` 当前状态与 `AUDIT_REPORTS/OPEN_ITEMS.md`。

## 文档维护纪律

- **只留活口**：`BACKFILL_LOG.md` / `CONTENT_AUDIT.md` / `ROADMAP.md` / `AUDIT_REPORTS/OPEN_ITEMS.md` 一律只登记**未完成**与**待改善**项。已交付批次的过程记录、已闭环的审计报告不留存——证据以 `npm run validate` + `npm run build` 全绿为准，课程本体与各章 index 才是课程清单的事实来源。
- **勿写死数字快照**：门数/图谱规模一律写"以 `node scripts/validate.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准"，避免文档随每次生产腐烂。
