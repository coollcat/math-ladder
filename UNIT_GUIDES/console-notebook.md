# 浮窗 / 笔记本 / 代码仓库 · 实现细节与踩坑,,> 从 `AGENTS.md` 下沉而来（2026-09-30 文档瘦身）。**改 `src/pyrunner/enhancer.js`,> 的浮窗与滑块部分、`notebook.js`、`repo.js`、`backup.js`、`formula.js` 之前先读这份。**,> 三条最致命的坑另有一句话版放在 `AGENTS.md` 的同名小节。

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
