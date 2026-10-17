# 04 · 视觉与布局

## 一句话

视觉体系是**演算纸 × 印章朱砂**：暖纸底、墨蓝正文、朱砂做强调，衬线字只用于展示性标题。所有设计变量集中在 `src/css/custom.css` 的 `:root` 与 `body`，各页面再用一层作用域类（`.ml-home` / `.ml-nav` / `.ml-rg` / `.ml-ht` / `.ml-fn` / `.ml-auth`）把规则圈住。

## 样式文件分工

| 文件 | 作用域 | 谁 import |
| --- | --- | --- |
| `src/css/custom.css` | 全站：Infima 变量覆盖、阅读排版、所有交互卡（quiz/exercise/viz/lab/浮窗/挂件） | `docusaurus.config.js` 的 `theme.customCss` |
| `src/css/home.css` | 首页 `.ml-home` + 章级树 `.ml-ht` + 图谱 `.ml-rg` | `src/pages/index.js`（构建后与全站同一张表） |
| `src/css/nav.css` | 顶栏 `.ml-nav` + 数据下拉 | `src/theme/Navbar/index.js` |
| `src/css/auth.css` | 登录页 `.ml-auth` | `src/pages/login.js` |
| `src/components/FunctionLab/style.css` | 看见函数 `.ml-fn` / `.ml-fnlab` | `src/components/FunctionLab/index.js` |

注意：`home.css` 虽由 `index.js` import，构建后与全站样式同表，所以**它里面的每条规则仍然必须带作用域前缀**，否则会漏到别的页面。

## 颜色 token（`custom.css` 的 `:root`，暗色在 `[data-theme='dark']`）

| 变量 | 亮色 | 语义 |
| --- | --- | --- |
| `--ml-paper` | `#fbf8f1` | 暖纸底（整站页面底色） |
| `--ml-card` | `#ffffff` | 卡片/浮起面 |
| `--ml-ink` | `#26324b` | 墨蓝：正文与标题 |
| `--ml-ink-soft` | 墨蓝 62% | 次要文字 |
| `--ml-vermilion` | `#c2401c` | 印章朱砂：品牌与强调（暗色 `#e8734f`，因为原色对比度只有 3.14:1） |
| `--ml-danger` | `#b3261e` | 错误红 |
| `--ml-search` | `#6b4ea3` | 搜索命中（原先用 Infima info 色只有 1.95:1，看不见） |
| `--ml-up` / `--ml-up-ink` | `#2e7d32` | 「托起它的先修」绿（正文色另给深一档） |
| `--ml-down` / `--ml-down-ink` | `#e8871e` / `#b45309` | 「被它托起的后续」橙 |
| `--ml-vol1…7` | 见下 | 七卷配色，**全站唯一一份**，亮/暗各一组 |

七卷色：卷一 `#2f5fa8` 墨蓝 · 卷二 `#0e8a7c` 青碧 · 卷三 `#96690f` 藤黄 · 卷四 `#c2401c` 朱砂 · 卷五 `#7b4ea3` 紫檀 · 卷六 `#4a7c2f` 松绿 · 卷七 `#8a5a2b` 赭棕。**新增卷只在这一处加色**，别在任何作用域里再写 hex。`.ml-rg` 里那套是别名，不是第二份。

Infima 主色也接进印章体系（`--ifm-color-primary*` 7 个），**只写在 `body` 块里**：

```css
/* Infima 把变量声明在 :root:not(#\#):not(#\#) 上，特异性 (2,1,0)，普通 :root (0,1,0) 压不过 */
body { --ifm-color-primary: #c2401c; /* … */ }
```

## 字体

| 用途 | 值 |
| --- | --- |
| 展示性标题 / 印章感 | `--ml-display`：`Georgia, 'Times New Roman', 'Songti SC', STSong, SimSun, serif` |
| 代码 / 数字 | `--pyr-mono`：`'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace` |
| 标题字族入口 | `--ifm-heading-font-family: var(--ml-display)`（Infima 标题是双 ID 特异性，**只能走变量**，直接改选择器压不过） |
| KaTeX | 本地 `static/fonts/`（60 个文件）+ `static/katex.min.css`，不依赖外网 |

字号阶梯收在 `body` 里：`--ifm-h1-font-size: clamp(1.9rem, 3.4vw, 2.5rem)`、`h2 1.55rem`、`h3 1.2rem`、`h4 1.02rem`。课程页 `.markdown h1` 有更具体的一档（theme-classic 设 3rem），正文标题保持原样，那是刻意的阅读排版。

## 圆角 · 动效 · 触控

| 变量 | 值 | 用在哪 |
| --- | --- | --- |
| `--ml-radius-ctl` | 6px | 小控件：按钮、输入框、下拉、选项 |
| `--ml-radius-block` | 8px | 区块：题卡、提示条、图框 |
| `--ml-radius-card` | 10px | 卡片：笔记本单元、仓库条目、空间行 |
| `--ml-radius-panel` | 12px | 浮窗面板 |
| `--ml-radius-surface` | 14px | 大画布/展示框：图谱、树、英雄区 |
| `--ml-radius-pill` | 999px | 胶囊、徽章 |
| `--ml-t-fast` / `--ml-t-base` / `--ml-t-slow` / `--ml-t-enter` | 0.14 / 0.18 / 0.32 / 0.6s | 即时反馈 / 常规 hover / 面板展开 / 入场描画 |
| `--ml-ease` / `--ml-ease-spring` | `cubic-bezier` | 常规（spring 只给同心环节点入场） |
| `--ml-lift` | -1px | hover 抬起量，全站统一一档 |
| `--ml-tap` | 40px | 触控命中区下限 |

新增交互一律用这三档时长与一档抬起量——此前全站并存 4 套时长、3 种位移，手感是散的。

## 断点与移动端策略

| 断点 | 含义 | 主要处理 |
| --- | --- | --- |
| `≥ 997px` | 桌面（Infima 默认） | 侧栏常驻、右栏挂件可见 |
| `≤ 996px` | 平板 / 手机 | 侧栏抽屉化；顶栏收成一行；右栏内容折叠；图谱画布与工具栏适配 |
| `≤ 768px` | 窄屏 | 文档正文与部分面板的单列布局 |
| `≤ 620px` | 小手机 | 顶栏压缩（品牌文字 + 搜索 + 登录 + 汉堡放不下）、部分卡片单列 |
| `≤ 480px` | 极窄 | 顶栏进一步压缩 |
| `@media (pointer: coarse)` | 触屏（鼠标桌面不受影响） | 触控目标放大到 ≥44px、滚动隔离 `overscroll-behavior: contain`、浮窗头部内边距加大 |
| `@media (prefers-reduced-motion: reduce)` | 减少动效偏好 | 动画与过渡时长归零，但**保留**颜色/透明度的瞬时变化（否则 hover 反馈会一起消失） |

注意 `996` 是 Infima 的分界（不是 `1024`）：写 `min-width: 997px` / `max-width: 996px` 成对使用，别自己另选一个数。

## 类名前缀约定

| 前缀 | 归属 |
| --- | --- |
| `.ml-nav…` | 顶栏与其下拉/抽屉 |
| `.ml-home…` / `.ml-hero…` / `.ml-wall…` / `.ml-cta-band` | 首页 |
| `.ml-ht…` | 首页章级知识树 |
| `.ml-rg…` / `.ml-fg…` / `.ml-tree-head` | /graph 同心环与 /tree |
| `.ml-fn…` / `.ml-fnlab…` | 看见函数 |
| `.ml-auth…` | 登录页 |
| `.ml-console…` / `.ml-fab…` / `.ml-slider…` | 浮窗控制台与圆钮 |
| `.ml-nb…` / `.ml-notebook…` | 数学笔记本 |
| `.ml-repo…` | 代码仓库 |
| `.ml-backup…` / `.ml-ba…` | 数据面板 |
| `.ml-formula…` / `.ml-ac…` | 公式输入器与补全候选框 |
| `.ml-quiz…` / `.ml-exercise…` / `.ml-solve…` / `.ml-progress…` | 四类课程卡 |
| `.ml-viz…` / `.ml-lab…` / `.ml-paper…` | 可视化 / lab 组件 / 文献卡 |
| `.ml-prereq…` / `.ml-toc-widgets…` / `.ml-rail-btn…` | 前置知识面板 / 右栏挂件 / 侧栏折叠把手 |
| `.py-runner…`（历史前缀） | 代码块按钮组，沿用早期命名，别改 |

## z-index 分层（唯一一份）

| 值 | 是谁 |
| ---: | --- |
| 400 | 右侧栏折叠把手 `.ml-rail-btn` |
| 1055 | 浮窗面板 `.ml-console` |
| **1056 / 1057 / 1058** | `zorder.js` 给三个浮窗（控制台 / 笔记本 / 仓库）按「最近交互」重排的槽位，**不递增** |
| 1060 | 右下角圆钮 `.ml-fab`——永远压在最上层，始终点得到 |
| 1070 | 灯箱 `.ml-lightbox`、补全候选框 |

**不要新增递增的 z-index**。点几十次就把面板推到几千，迟早盖过圆钮；`zorder.js` 的做法是重新派号。

## 新增 UI 的规矩

1. **先找作用域类**。新页面/新面板先定一个 `.ml-xxx` 根类，所有规则都以它为前缀；不要写裸标签选择器或全局 `div` 规则。
2. **颜色/间距/圆角/时长一律用变量**，不写 hex 字面量。拿不到变量时整条声明会失效（`border` 直接消失，这是踩过的坑）。
3. **改 Infima 变量就写到 `body`**，别写 `:root`（特异性压不过）。
4. **焦点可见**：全站已有 `:where(button, a, input, …):focus-visible` 兜底。若某处写了 `outline: none`，必须补偿一个更明显的焦点样式，不然键盘用户找不到焦点。
5. **动效给 reduced-motion 留出口**：用 `transition` 变量，别用 `!important` 或 JS 写死时长。
6. **暗色必须给**：每个新 token 都要在 `[data-theme='dark']` 里给一份，并检查对比度（正文尺度 ≥4.5:1）。
7. **移动端自测 996 / 620 两个断点**，触屏再看 `pointer: coarse` 那条——圆钮和面板最容易挡正文。

站点 UI 的实现细节（顶栏 v2、首页、右栏挂件、侧栏折叠、三态外观按钮）在 `UNIT_GUIDES/site-ui.md`；图谱双页布局与坐标换算在 `UNIT_GUIDES/graph-pages.md`。