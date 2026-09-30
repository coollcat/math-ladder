# 站点 UI · 实现细节（顶栏 / 首页 / 侧栏 / 挂件）,,> 从 `AGENTS.md` 下沉而来（2026-09-30 文档瘦身）。改顶栏、首页、右栏挂件、,> 侧栏折叠之前先读这份。

- **右栏挂件（2026-08-29）**：`src/theme/TOCItems/index.js`（swizzle wrap）在右栏目录上方渲染「前置知识面板 + 学习进度条」；前置知识面板组件抽到 `src/components/doc-widgets/PrereqPanel.js` 供两处复用——正文内实例（`variant="inline"`）桌面隐藏、窄屏横条；右栏实例（`variant="toc"`）窄屏隐藏。阅读区拉宽：`main[class*='docMainContainer']` 容器 1140→1360px、正文列 58%→76%。
- **侧栏折叠（2026-09-02 定案）**：左侧章节导航**只用 Docusaurus 自带的「收起侧栏」按钮**（侧栏左下角），它会同步驱动 theme 内部的 `docMainContainer` / `docItemWrapper` 宽度；`RailControls` 只保留右侧把手（`ml-side-r-collapsed` 加在 `<html>` 上）。早先在左侧也挂过一个把手，那套 `display:none` 写法与新版 flex 布局打架（点了没反应），已删。折叠右侧后 `custom.css` 要同时松绑三层（`docItemCol` 的 `max-width:75%!important`、隐藏 `col--3`、容器的 1360px 上限置 `none`），少一层就铺不满。左侧章节默认折叠由 `docusaurus.config.js` 的 `sidebarCollapsed: true` 控制（只自动展开当前课所在的那条链）。

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

### 独立阅读前端 ui/（2026-08-28 建成；2026-09-29 第五回路整体退役删除）

独立阅读前端（`fluent/`/`paper/` 两皮肤、`render.mjs` 渲染管线、`server.mjs` 皮肤服务器、
两个启动 bat）已全部删除，历史实现查 git。仍然通用的经验：
渲染管线的 token 生命周期思路（围栏保护 → 数学保护 → 渲染 → 回填）在主站 `enhancer.js`
里另有同类实现；localStorage 命名纪律（各前端用独立 key 前缀互不干扰）继续适用。

- 主站内容页右上角「前置知识」面板（2026-08-28）：`src/theme/DocItem/Layout/index.js` swizzle 用 `useDoc`（`@docusaurus/plugin-content-docs/client`）读 front matter 的 `prereqs`，经 `full-graph-data.js` 的 `NODES` 反查标题与链接；样式在 `custom.css` 的 `.ml-prereq`（桌面右浮动，≤996px 变正文顶部横条）。注意 theme-common/internal 里没有 docs 数据 hook。
