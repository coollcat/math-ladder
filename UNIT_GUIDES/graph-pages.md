# 图谱双页 · 实现细节（/graph 阶梯版图 与 /tree 课程家谱）

> **改 `src/components/ml-home/` 的图谱组件之前先读这份。** 2026-10 两页整体重做：
> /graph 的「同心环」与 /tree 的「千余节点整棵树」都已退役删除（`KnowledgeGraphRadial.js`、
> `KnowledgeGraphTree.js`、`treeLayout.js`、`PageIntro.js` 以及 `home.css` 里 `.ml-rg` / `.ml-tr` /
> `.ml-fg` 的全部样式）。旧版的踩坑史（双坐标系 `toElem`、`fitSel` 下限、筛选重排 vs 压暗）随之作废。

## 三张图的分工（刻意错开，别做成三张一样的图）

| 页面 | 组件 | 回答的问题 | 粒度 |
| --- | --- | --- | --- |
| 首页 | `HomeTree.js` + `homeTreeLayout.js` | 章与章一代代怎么托起（依赖结构） | 章 |
| `/graph` 知识图谱 | `KnowledgeAtlas.js` + `atlasModel.js` | 全站版图：每章属于哪个领域、在多高的台阶、我走到哪儿了 | 章卡 + 课方格 |
| `/tree` 课程家谱 | `LessonLineage.js` + `lineageLayout.js` | 一门课站在谁的肩上、它又解锁了谁 | 课 |

两页共用：`learnState.js`（课级四态，纯函数）、`useLearnState.js`（React hook）、
`src/css/graph-pages.css`（两页全部样式，类名前缀 `.ml-gp`（页面壳）/ `.ml-atlas`（版图）/ `.ml-lin`（家谱），在两个页面文件里 import）。

## 文件地图

| 文件 | 性质 | 职责 |
| --- | --- | --- |
| `ringLayout.js` | 纯函数 | **层级口径的唯一事实来源**：`chapterModel()`（难度等分位分 6 级 + 强先修单调上修）、`chainTo` / `closure` / `ringLabel`、`RING_NAMES`。同心环几何已删，文件名保留是因为各处文档登记的就是它 |
| `atlasModel.js` | 纯函数 | 版图矩阵：`buildAtlas()`（列＝层级、行＝七卷、格内按章难度→章号）、`chainOf` / `ancestorsOf` / `descendantsOf` / `searchChapters` |
| `learnState.js` | 纯函数 | `lessonStates(prog, last)` → 每课 `LOCKED/READY/CURRENT/DONE`；`PRED/SUCC` 课级邻接、`INDEX_BY_ID/INDEX_BY_TO`、`tally` |
| `lineageLayout.js` | 纯函数 | 家谱布局：`buildLineage(focus, {back, fwd})`、`suggestNext`、`pathToFocus`、`searchLessons`；常量 `CARD_W 196 / CARD_H 68 / COL_GAP 68 / MAX_PER_COL 14` |
| `useLearnState.js` | hook | SSR 返回 `null`；挂载后读 `progress.js`，`onProgressChange` 时重算 |
| `KnowledgeAtlas.js` | 组件 | /graph 的画与交互 |
| `LessonLineage.js` | 组件 | /tree 的画与交互（页面用 `BrowserOnly` + `require` 包，因为要读地址栏与 localStorage） |

纯函数模块都能 `node` 直接 import 单测；口径变更先改纯函数，组件只管画。

## /graph · 阶梯版图

- **怎么读**：往右是台阶（地基 / 主干 / 进阶 / 高等 / 深水 / 前沿），往下是领域（七卷）。一章一张卡，卡里一格一门课。
  整张图天然呈阶梯形——这就是本站的形状，不是排版失误。
- **层级算法没变**：版图的「第 k 列」就是旧同心环的「第 k 环」，口径全在 `ringLayout.js` 头注释
  （章难度＝本章课程平均先修深度，**别换算法**；只按强边 w≥2 上修）。别在组件里另写一套分级。
- **平时不画连线**（77 章三百多条章级边画全就是毛线）。悬停 / 键盘聚焦一章：直接先修卡绿（`is-up`）、直接后续卡橙（`is-down`），
  只画这几条线（强边实线、弱边虚线）；工具条「直接关系 / 全部来路与去向」切换闭包点亮。
  连线坐标在挂载后**量 DOM** 算（卡片尺寸随视口流动），`ResizeObserver` 触发重量。
- **点击 = 钉住**：右侧面板给最长先修链（`chainOf`）、按权重排的先修 / 后续 chip、本章课表、「看课程家谱」链接（`/tree?l=课id`）。
  Esc / 点版图空白取消。`?ch=N` 直达并钉住某章（家谱页「在版图里看本章」就跳这里）。
- **课表必须走服务器 JSON**：`fetch(${baseUrl}graph-chapters/NN.json)`（`npm run gen:chapters` 生成，`build` 自动重生成，
  无课章也出空 JSON 保证任何章号都 200）。这是「点击时从服务器加载」的语义本体——断网 / 404 在面板里**可见**，
  缓存只做会话内去重。别绕过它直接用 bundle 里的 `NODES` 画课表。
- **进度着色**：方格按 `learnState` 四态上色；`hasData=false`（一门没学）时切中性配色，不要把全站画成一片「未解锁」灰。
  无钉住时的 Overview 面板给进度、上次停在、「现在就能学」前 5 门。
- **⚠ bundle 未减重**：`full-graph-data.js` 的 `NODES/EDGES/DEPTH` 仍被 `chapterModel()` 与搜索 import。
  将来把章级模型挪到构建期预计算，`NODES` 才能甩出 bundle。

## /tree · 课程家谱

- **一次只看一门课**：`[更早根基·按章折叠] … 先修第 2 层 | 直接先修 | ★本课 | 直接后续 | 后续第 2 层 …`。
  数据依据（实测）：直接先修中位数 1、最多 4；3 步内祖先中位数 5、90 分位 10；整个祖先闭包中位数 39、最多 184——
  所以近处逐课画、远处按章折叠只报数。
- **布局口径**（全在 `lineageLayout.js` 头注释）：纳入按 BFS 最短步数（直接先修永远在图上）；分列按纳入子图内**最长路**（每条边严格朝右，无同列边 / 回头边）；
  列内（章号, 目录序）初排 + 两轮重心消叉；列超过 `MAX_PER_COL` 收成「还有 N 门」；焦点不在第 0 章时不往第 0 章走。
- **焦点与地址栏**：`?l=课程id`（如 `calculus%2Fchain`）。单击卡片换焦点走 `history.push`，可分享、可后退。
  默认焦点：`?l=` → 上次停留的课（`ml-last`）→ `arithmetic/addition`。
- 交互：Stepper 调「先修 / 后续 N 步内」；已学课淡化；悬停一张卡点亮它到焦点的路径（`pathToFocus`）；
  搜索下拉支持 ↑↓ 回车；有进度时摘要卡给「先补最底下的砖」（`suggestNext`，排除焦点自身）。
- **≤620px 改分层列表**（`LineageList`，不画连线），手机上横向画布不好用。

## 样式与断点（`graph-pages.css`）

- ≥1200：版图列头吸顶；≤1199：/graph 面板变右侧抽屉（z-index 300）；≤996：章卡改卡片流；≤620：面板变底部抽屉、家谱变列表；
  另有 `pointer: coarse` 与 `prefers-reduced-motion` 段。入场动画 `animation-fill-mode: backwards`（不用 `both`：结束后不保留动画终态，免得压住悬停 / 状态类的样式）。
- **⚠ Infima 的元素级规则带双 ID 尾巴**：`p / ul / ol / a / h1–h6 / table` 等规则写成 `:not(#\#):not(#\#)`（特异性 0,2,0,1 起），
  普通类选择器压不过。所以：
  1. 落在这些元素上的类选择器一律补尾巴：`.ml-atlas__xxx:not(#\#):not(#\#)`（伪元素要写在尾巴**之后**：`.x:not(#\#):not(#\#)::before`）；
  2. 面板 / 家谱里的小标题**不用 h2–h4**，写 `<p role="heading" aria-level="3">`——Infima 标题字号只能走 `--ifm-h*-font-size` 变量，类选择器改不动；
  3. 页面级的 h1 字号靠在页面作用域里改 `--ifm-h1-font-size`。
- 暗色下主按钮文字用 `var(--ml-paper)`；七卷配色只用 `--ml-vol1…7`（`custom.css`），这里不写 hex。

## 验收

`node scripts/check-graph-drill.mjs`（先 `npm run build`；或 `BASE=http://127.0.0.1:端口` 指向已起的服务；
playwright 是可选依赖，没装就打印「跳过」退出 0）。断言覆盖：版图章卡数 / 6 列 × 7 行 / 初始零连线 / 方格总数、
悬停画线 + 压暗、点击 fetch 200 且课表行数＝课数、再点与 Esc 取消、`?ch=` 直达并点课进 `/docs/`；
/tree 的 `?l=` 定焦、卡与线数量、单击换焦点写地址栏、`goBack` 回退；全程页面零报错。

调试注意：React 的 `onMouseEnter` 只认 `mouseover`（`mouseenter` 不冒泡）；node 测 dev server 带 `Accept: text/html`。
