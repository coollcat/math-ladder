# 数学阶梯 · 从数感到前沿

从 $1+1$ 一路长到人工智能与前沿数学的中文交互式教程站。Docusaurus 3 静态站点，课文是纯 Markdown；每个概念尽量配一段**能在浏览器里改、能立刻跑出结果**的 Python，以及拖得动的网页可视化。

## 现在的规模

数字会随每次生产变化，**不要照抄本表**，下面给了现算命令。

| 项 | 现值 | 口径 |
| --- | ---: | --- |
| 卷 | 7 | 00–16 / 18–26 / 27–35 / 36–42 / 43–67 / 68–75 / 76–78 |
| 章目录 | 79 | `docs/NN-*/` 目录数，含第 17 章「下一程导读」导览章 |
| 正式课 | **1029** | 章目录里的 `.md` − `index.md` − `999-references.md` − `COMPONENT_SPEC.md` − 17 章 3 门导览课 |
| 正式课正文 | 约 21.9 万行 | 中位数 210 行/课 |
| 交互围栏 | viz 819 · lab 229 · exercise 1184 · quiz 1053 · paper 295 | 全 `docs/` 计（另 `python` 1865 / `py` 140） |

现算（两条命令的口径不同，别混）：

```bat
node scripts/validate.mjs            :: 报「1191」= 全量 markdown 文件数（含 index / references / 导览课 / intro）
node scripts/check-chapter-sync.mjs  :: 报「78 章 / 1029 门课」= 上图谱的章数与正式课数
```

两个数字为什么不一样、每种口径怎么定义，见 [PROJECT_DOCS/02-content-system.md](./PROJECT_DOCS/02-content-system.md) 的「门数口径」一节。

## 三步跑起来

前置：Node.js 18+（装一次）。云同步后端是可选的，本地不装也能学完整站。

```bat
:: 方式 A：双击 启动.bat（会自动 npm install、拉起 dev server，并尝试启动本地同步服务）
:: 方式 B：命令行
npm install        :: 仅第一次
npm start          :: 打开 http://localhost:9452
```

打不开 `localhost` 就换 **http://127.0.0.1:9452**（已配双栈监听）。若开着 Clash 等代理的 TUN/系统代理，把 localhost 加白，或用 `node -e "fetch(...)"` 验证而不是 PowerShell。

看到页面后：左侧选章 → 正文里点代码块的 **▶ 浮窗运行** → 改数字再跑。全站右下角有 **Py**（Alt+P）与笔记本（Alt+N）两颗圆钮，页面右上角「数据」钮是备份/搬家入口。

## 站点上有什么

| 入口 | 路由 | 一句话 |
| --- | --- | --- |
| 首页 | `/` | 演算纸视觉 + 七卷版图 + 继续学习 |
| 怎么用本站 | `/docs/intro` | 三类交互积木、方法准入制度的读者版说明 |
| 知识图谱 | `/graph` | 同心环：半径＝层级、颜色＝卷，点章在图上展开该章课点 |
| 知识树 | `/tree` | 先修关系树，章节/单元双模式 + 搜索 |
| 看见函数 | `/function` | 拼式子立刻出图，2D 多曲线 / 3D 曲面 |

## 目录导航

| 路径 | 是什么 |
| --- | --- |
| `docs/NN-chapter/MM-lesson.md` | 全部课程内容（纯 `.md`，**禁用 `.mdx`**） |
| `src/pyrunner/` | 客户端交互系统：浮窗 Python、判题、测验、viz/lab 渲染、笔记本、数据面板 |
| `src/theme/` · `src/pages/` · `src/components/` | 站点外壳：顶栏、首页、两个图谱页、看见函数、右栏挂件 |
| `static/` | 字体、KaTeX 资源、生成物（`prereqs/`、`graph-chapters/`）、论文归档（不入库） |
| `scripts/` | 校验闸门、数据生成器、审计脚本 |
| `server/` | 可选云同步后端（零第三方依赖）+ 建号 CLI |
| `deploy/` | nginx / systemd 配置与部署手册 |
| `UNIT_GUIDES/` | 单章施工手册与各子系统实现细节（改代码前读） |
| `PROJECT_DOCS/` | **文档中心**：架构、内容、交互、设计、数据、构建、维护七份总览 |

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm start` | 开发预览（`--host :: --port 9452`，改文件自动刷新） |
| `npm run build` | 生产构建：`validate → check:sync → gen:chapters → docusaurus build → mechanical-audit` |
| `npm run validate` | 课程闭环校验：front matter、先修顺序、方法准入、围栏结构 |
| `npm run check:sync` | 章节信息同步校验：各章 `index.md` ↔ 生成物 `CHAPTER_INFO` |
| `npm run gen:graph` | 重生成 `full-graph-data.js` + `static/prereqs/` + `lesson-count.js`（**不在 build 里，改章节信息或增删课后必须手跑**） |
| `npm run gen:chapters` | 重生成 `static/graph-chapters/`（/graph 课级钻取数据） |
| `npm run audit` | 机械体检：h2 源/产物比对、Python compile、MDX 塌陷扫描 |
| `npm run serve` / `npm run clear` | 预览 `build/` / 清 Docusaurus 缓存（行为诡异时第一步） |

出包与部署：

```bat
构建Linux部署包.bat              :: 本机构建并打 math-ladder-build.zip（默认带 server/ 与 deploy/）
构建Linux部署包.bat --no-server  :: 纯静态包（只有 build/，登录与云同步不可用）
构建Linux部署包.bat --full       :: 构建前先跑 validate（默认跳过）
```

部署步骤、nginx/systemd 配置、验收与备份全在 [deploy/README-部署.md](./deploy/README-部署.md)；构建与出包细节见 [PROJECT_DOCS/06-build-and-deploy.md](./PROJECT_DOCS/06-build-and-deploy.md)。

## 常见问题

| 症状 | 原因与解法 |
| --- | --- |
| `npm start` 起不来 / 端口占用 | 换端口：`npm start -- --port 9453`；`netstat -ano \| findstr :9452` 找占用进程 |
| 页面能开但公式是源码 | KaTeX 字体没加载：确认访问的是本站 9452 端口而不是缓存的旧页；`npm run clear` 后重启 |
| 点 ▶ 运行一直转圈 | 首次要下载 Pyodide 运行时（wasm 约 9 MB + 标准库约 6 MB）；源只有 jsdelivr 与 gcore 两个，Service Worker 会在首次成功后缓存 |
| 本机 fetch 返回诡异 404 | 代理软件（Clash/v2ray）劫持 localhost。用 `node -e "fetch(...)"` 测，别用 PowerShell 的 Invoke-WebRequest |
| 改了配置但页面没变 | `npm run clear`；仍不对就确认 9452 端口上跑的是不是当前代码（可能是旧 dev server 进程） |
| 登录页提示「连不上服务器」 | 没起同步服务或没设 `ML_SYNC_API`。本地测试见 [PROJECT_DOCS/05-data-and-accounts.md](./PROJECT_DOCS/05-data-and-accounts.md) |
| 新加的课不出现在图谱/首页 | 忘了 `npm run gen:graph`（`npm run build` 不会自动跑它） |
| 课文某个 `##` 之后整段变成纯文本 | MDX 塌陷：行内公式里有字面 `\{` / `\}`，或多行 `$$`。见 [AGENTS.md](./AGENTS.md) 的「MDX 静默降级」 |

## 文档地图

| 文档 | 一句话 | 给谁看 |
| --- | --- | --- |
| [PROJECT_DOCS/README.md](./PROJECT_DOCS/README.md) | 文档中心地图：每份文档写什么、谁该读、什么时候该改 | 所有人 |
| [PROJECT_DOCS/01-architecture.md](./PROJECT_DOCS/01-architecture.md) | 整体架构与关键不变量（生成物、唯一源头、水合安全） | 想改结构的人 |
| [PROJECT_DOCS/02-content-system.md](./PROJECT_DOCS/02-content-system.md) | 课程体系、编号、front matter、九段式、三道闸门、门数口径 | 写课的人 |
| [PROJECT_DOCS/03-interaction-system.md](./PROJECT_DOCS/03-interaction-system.md) | 浮窗/判题/测验/viz 与 lab/笔记本/仓库/数据面板/看见函数 | 改交互的人 |
| [PROJECT_DOCS/04-design-system.md](./PROJECT_DOCS/04-design-system.md) | 颜色 token、字体、断点、类名前缀、新增 UI 的规矩 | 改样式的人 |
| [PROJECT_DOCS/05-data-and-accounts.md](./PROJECT_DOCS/05-data-and-accounts.md) | 命名空间存储、账号体系、云同步契约与降级纪律 | 碰数据/账号的人 |
| [PROJECT_DOCS/06-build-and-deploy.md](./PROJECT_DOCS/06-build-and-deploy.md) | 构建管线、出包、两种部署形态、验收与排障 | 出包与运维 |
| [PROJECT_DOCS/07-maintenance.md](./PROJECT_DOCS/07-maintenance.md) | P0/P1/P2 分级、文档维护纪律、收尾检查清单、已知过时点 | 维护者 |
| [AGENTS.md](./AGENTS.md) | AI/协作者动手前必读的硬规则与已知坑（300+ 行，值得通读） | 所有改代码的人 |
| [VISION.md](./VISION.md) | 长期定位：十一层主轴、八条支线、七卷编号总表 | 规划与选题 |
| [ROADMAP.md](./ROADMAP.md) | 进度台账：逐章门数、已完成 checkbox、剩余缺口 | 找活干的人 |
| [LESSON_TEMPLATE.md](./LESSON_TEMPLATE.md) | 写课模板（单一事实来源）：九段式、围栏语法、术语表 | 写课的人 |
| [REGISTRATION.md](./REGISTRATION.md) | 账号、进度命名空间、云同步合并规则与安全边界 | 运维与账号管理 |
| [CONTENT_AUDIT.md](./CONTENT_AUDIT.md) | 发布自检纪律与现行内容口径 | 发布前 |
| [BACKFILL_LOG.md](./BACKFILL_LOG.md) | 未完成缺口台账与回填铁律 | 补课 |
| [UNIT_GUIDES/](./UNIT_GUIDES/) | 45 份单章施工手册与子系统实现细节 | 动手改具体模块前 |
| [deploy/README-部署.md](./deploy/README-部署.md) | Linux 部署手册：解压到验收、备份、常见故障 | 上线 |
| [server/README.md](./server/README.md) | 同步服务自身的启动、建号、接口与数据文件 | 运维 |
| [docs/intro.md](./docs/intro.md) | 站内「怎么用本站」读者页 | 读者 |

**入口原则**：先看这份 README 找方向 → 按上表跳到对应文档 → 要动手时再读 [AGENTS.md](./AGENTS.md) 的硬规则和 `UNIT_GUIDES/` 里对应模块的实现细节。任何一份文档只写它那一层的事实，不再互相抄。