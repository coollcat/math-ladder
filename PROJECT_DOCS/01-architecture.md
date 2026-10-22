# 01 · 整体架构

## 一句话

**纯静态的 Docusaurus 3 站点 + 一整层客户端 DOM 增强 + 一条离线生成的数据流水线**，可选挂一个零依赖 Node 同步服务。服务器只负责发文件；所有 Python 执行、判题、测验、可视化都在浏览器里发生。

## 架构图

```text
                    ┌─────────────────── 内容层（唯一源头） ───────────────────┐
  docs/NN-chapter/  │  index.md   front matter: title/short/volume  ← 章节元数据源头
  MM-lesson.md      │  MM-lesson.md  front matter + 九段式正文 + 交互围栏
                    │  999-references.md  ← 由 references-data.json 生成（勿手改）
                    └───────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        │                           │                            │
   validate.mjs              gen-graph.mjs                gen-references.mjs
   check-chapter-sync.mjs    gen-chapters-data.mjs        fetch-papers.mjs
   （闸门，不改文件）         （生成数据）                  （生成课文 / 抓 PDF）
        │                           │                            │
        │                    ┌──────┴────────────┐               │
        │                    ▼                   ▼               ▼
        │        full-graph-data.js      static/graph-chapters/ docs/**/999-references.md
        │        static/prereqs/*.json   （/graph 章课表数据）     static/papers/*.pdf
        │        lesson-count.js                                （不入库）
        ▼                    │
  docusaurus build ──────────┴──► build/（纯静态：HTML/CSS/JS/字体/PDF）
        │                              │
        ▼                              ├──► 任意静态服务器（纯静态形态）
  mechanical-audit.cjs                 │
  （h2 对比 / Python compile / MDX）   └──► nginx ─┬─► build/
                                                  └─► /api/ 反代 127.0.0.1:8787
                                                          │
                                                    server/sync-server.mjs（可选）
                                                    server/data/（唯一账本，绝不进包）
```

运行时一侧（全部在浏览器）：

```text
  Docusaurus 路由切换
        │
  src/theme/Root/index.js   MutationObserver（过滤交互面板自留地）
        │
  enhancer.scheduleEnhance()  →  enhanceAll()
        │
        ├─ 扫 pre[class*="language-"]，按语言分派
        │    python / exercise → 注入按钮，代码进浮窗（Pyodide 单例）
        │    quiz / paper      → 隐藏原容器 + 插卡片（水合安全）
        │    viz               → viz.js 查表渲染（冻结只读）
        │    lab               → lab/registry.js 动态 import 组件
        ├─ ensureFab()      两个圆钮 + 全局快捷键（首屏就建）
        ├─ ensureConsole()  浮窗面板（第一次真要打开时才建）
        └─ 按需动态 import   notebook / repo / backup / formula / complete
```

## 五个子系统

| 子系统 | 位置 | 一句话 | 详见 |
| --- | --- | --- | --- |
| 站点外壳 | `src/theme/` · `src/pages/` · `src/components/` · `src/css/` | 顶栏 swizzle 整体接管、首页、/tree、/graph、/function、右栏挂件 | [04-design-system.md](./04-design-system.md) |
| 内容层 | `docs/` | 79 章 1029 门课，纯 markdown + 四种交互围栏 | [02-content-system.md](./02-content-system.md) |
| 客户端交互 | `src/pyrunner/` | 浮窗 Python、判题、测验、viz/lab、笔记本、仓库、数据面板 | [03-interaction-system.md](./03-interaction-system.md) |
| 数据与账号 | `src/learning/` · `src/auth/` · `src/sync/` · `server/` | 命名空间 localStorage + 可选云同步 | [05-data-and-accounts.md](./05-data-and-accounts.md) |
| 构建与部署 | `scripts/` · `package.json` · 出包脚本 · `deploy/` | 三道闸门 + 数据生成 + 打包 | [06-build-and-deploy.md](./06-build-and-deploy.md) |

## 关键不变量（改架构前必须守住）

1. **生成物一律勿手改**。带「自动生成」头注释的文件只有生成器能写：
   - `src/components/ml-home/full-graph-data.js`（`gen-graph.mjs`）
   - `src/components/ml-home/lesson-count.js`（`gen-graph.mjs`）
   - `static/prereqs/<课id>.json`（`gen-graph.mjs`）
   - `static/graph-chapters/NN.json`（`gen-chapters-data.mjs`）
   - `docs/**/999-references.md`（`gen-references.mjs`）
   - `scripts/papers-local.json`（`fetch-papers.mjs`）
2. **章节元数据只有一个源头**：各章 `index.md` 的 front matter `title / short / volume`。`check-chapter-sync.mjs` 会拦下「改了章首页忘了跑生成器」和「`src/` 里重新长出 `CH_TITLES` / `CH_SHORT` 手写表」。
3. **门数只有一个算计口径**：`docs/NN-*/` 下的课文件减去 `index.md` / `999-references.md` / `COMPONENT_SPEC.md`，再排除第 17 章导览章的 3 门。详见 [02-content-system.md](./02-content-system.md)。
4. **`docs/` 禁用 `.mdx`**。整站靠纯 markdown 的围栏语法承载交互；写 `.mdx` 会绕开自定义围栏约定并引入 MDX 塌陷风险。
5. **客户端不做 DOM 删除**。quiz / viz / lab / paper 一律「隐藏原容器 + 把卡片插在其后」，绝不 `remove()` React 管的节点（会触发 `removeChild` 崩溃）。python / exercise 只往 buttonGroup 里加按钮，复制按钮保留。
6. **所有注入都要 dataset 守卫**（容器 `dataset.mlBound = '1'`），否则 MutationObserver 会自我触发死循环。
7. **两个可视化系统不能互换**：`viz.js` 冻结只读，新交互一律走 `lab`。见 [03-interaction-system.md](./03-interaction-system.md)。
8. **云同步是可选的增强**。任何模块在被 import 时不能假设后端存在；后端挂了、断网、本地 `npm start` 都必须静默降级。
9. **`npm run build` 不生成图谱数据**。它只跑 `validate → check:sync → gen:chapters → docusaurus build → mechanical-audit`。改了章名 / 增删课之后必须手跑 `npm run gen:graph`，否则 `check:sync` 会在下一次构建拦你。

## 依赖与体积要点

| 项 | 现状 | 注意 |
| --- | --- | --- |
| Docusaurus | 3.8 + preset-classic，`future.faster`（Rspack + SWC） | 构建产物行为与 webpack 等价，但体积/报错信息不同 |
| 数学 | `remark-math` + `rehype-katex`，KaTeX CSS 走本地 `static/katex.min.css` | 字体在 `static/fonts/`（60 个文件），不依赖外网 |
| 搜索 | `@easyops-cn/docusaurus-search-local`（中文分词、`hashed`） | 索引是构建产物，改课文后要重建才生效 |
| Pyodide | v0.26.4，从 jsdelivr / gcore 两个 CDN 拉 | 首次约 15 MB（wasm 9 MB + stdlib 6 MB）；`static/ml-pyodide-sw.js` 负责二次访问走缓存 |
| `viz.js` | 约 514 KB（526,351 B）/ 14,411 行 / 108 渲染器 | **冻结**：不进主包路径优化，不做拆分 |
| `lab/` | `components/` 180 个文件（179 个注册组件 + 1 个共用底座 `algebra-stage.js`）/ 29 个分册 / 6 个数值引擎 | 每个组件单独 chunk，按需 import |
| 首屏图谱数据 | `static/prereqs/*.json`（按课拆分）+ `lesson-count.js`（一个常量） | 刻意不让 `full-graph-data.js` 进主包 |