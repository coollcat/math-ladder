# 03 · 客户端交互系统

## 一句话

整站的「活」全在 `src/pyrunner/`：一个 DOM 增强器扫描课文里的围栏代码块，按语言注入按钮或替换成组件；所有 Python 在浮窗里用 Pyodide 单例执行；笔记、代码仓库、备份都挂在同一套浮窗层上。

## 分派总表

`src/theme/Root/index.js` 挂一个 `MutationObserver`（过滤掉交互面板自身的 DOM 变更），变化时调度 `enhancer.scheduleEnhance()` → `enhanceAll()`。

| 围栏语言 | 处理 | 关键点 |
| --- | --- | --- |
| `python` | 往 `.theme-code-block` 的 buttonGroup 注入「▶ 浮窗运行」（带 `sliders:` 时是「▶ 浮窗实验」） | 复制按钮保留；代码进浮窗槽位 |
| `exercise` | 注入「▶ 在浮窗作答」，浮窗进入判题模式 | 走 `_ml_run`（全新沙盒），对照 `@check` |
| `quiz` | **隐藏原容器**，把测验卡插在其后 | 绝不 `remove()`，水合安全 |
| `paper` | 隐藏原容器，插文献卡 | PDF 按钮双路门禁（登录 → 本站副本 / 未登录 → 原站） |
| `viz` | 隐藏原容器，JSON 交给 `viz.js` 查表 | 前五卷老组件，**冻结只读** |
| `lab` | 同上，交给 `lab/index.js` 动态 import | 卷六及所有新增交互一律走这里 |

**选择器基准**：`pre[class*="language-"]`。语言类在 `pre` 和外层 `.theme-code-block` 上，**不在 `code` 元素上**——所以不能用 `code.language-x`。容器是 `pre.closest('.theme-code-block')`。源码必须按 `token-line` 逐行 join（`code.textContent` 没有换行）。

## 两个可视化系统

| | `viz.js` | `src/pyrunner/lab/` |
| --- | --- | --- |
| 形态 | 单体 14,411 行 / 约 514 KB / 108 个渲染器 | 一组件一文件（179 个注册组件，另 1 个共用底座 `algebra-stage.js`）+ 29 个分册注册表 + 6 个数值引擎 |
| 服务对象 | 前五卷既有内容 | 卷六 68–75、卷七 76–78、前五卷新增或重做的交互 |
| 引擎 | 无 | `circuit / mech / logic / dsp / media / audio` |
| 现状 | **冻结：不加不改** | **在建设中，新东西全放这里** |
| 白名单来源 | `validate.mjs` 用正则从 `viz.js` 抠 `RENDERERS` 的键 | `validate.mjs` 扫 `lab/registries/*.js` 目录取键（新增分册不用改校验脚本） |

### lab 的组件契约

```js
// components/<kebab>.js
export default function render(host, spec) {
  // …build DOM into host…
  return { slidersBox?, destroy? };
}
```

- 注册：`registries/chNN.js` 里写 `'名': () => import('../components/x.js')`，**必须字面量**（webpack 靠静态分析分包，变量拼路径会退化成整包加载）。
- 汇总：`registry.js` 合并全部分册，**改分册即可，不要动 registry.js**。
- 分册之间**不许重名**（后加载的会静默覆盖前面的），`validate.mjs` 会查重。
- 注册表共 29 个分册 / 179 个注册组件（`components/` 里另有一个共用底座 `algebra-stage.js`，被 15 个组件 import，不注册）：`ch00`（**通用工具分册**，如「看见函数」）· 卷一 `ch04 ch06 ch07 ch10 ch11 ch13 ch15 ch16` · 卷五 `ch47 ch50 ch53 ch61 ch62 ch64 ch65 ch66 ch67` · 卷六 `ch68–ch75` 每章一份 · 卷七 `ch76 ch77 ch78`。
- 分册按章划分只是**归类约定**，不是硬约束：05 / 08 / 09 章用了 `lab` 围栏但没有自己的分册，因为它们只嵌了 `ch00` 的 `see-function`。新加站级通用组件放 `ch00`，章专属组件才新建 `chNN.js`。

## 浮窗控制台

- **Py 圆钮**（右下角，`Alt+P`）：多槽位草稿。`scratch` 是随手算（持久命名空间，变量跨次保留）；从课程块/练习进入时是独立槽位（练习用全新沙盒）。
- **两段构建**（2026-10-10 拆）：`enhanceAll()` 每页只调 `ensureFab()`（圆钮 + 全局快捷键，廉价）；浮窗面板的大坨 DOM/监听/`applySlot`（含 `ml-console` 的 localStorage 读写）由 `ensureConsole()` 在用户真要打开时补齐。
- **Pyodide 单例**：v0.26.4，源只有 `cdn.jsdelivr.net` 与 `gcore.jsdelivr.net` 两个（npmmirror 的 pyodide 目录实测 404，已撤）；`static/ml-pyodide-sw.js` 缓存 wasm/stdlib 等大件。`PREAMBLE` 只注入一次，新增 Python 侧能力往 PREAMBLE 里加 `_ml_` 前缀函数。
- **三条致命坑**：① 模块级回调必须调 `st._run`（`run` 是 `ensureConsole()` 内部局部常量，直接调会在 260ms 防抖后 `ReferenceError`）；② `toJs({depth:1})` 必须带 `dict_converter: Object.fromEntries`（否则 Python dict 变 Map、滑块值全 undefined）；③ HMR 跨代重建靠 `window.__mlEnhancerGen` 盖章 + 完整槽位元数据恢复。
- 细节与全套滑块坑：`UNIT_GUIDES/console-notebook.md`。

## 判题（exercise）

- 走 `_ml_run`（全新沙盒，不污染随手算的命名空间），对比 `@check` 各行。
- `sameOutput()` 把期望值与实际输出拆 token 逐段比：两段都能解析成有限数时按**相对误差 1e-9** 比，否则精确字符串相等。**不加绝对下限**——那会让「0.1+0.2-0.3 ≠ 0」这类课的期望值 0 被误判通过。
- 通过记录写 `ml-exercises:<ns>`；改动初始代码会让旧草稿失效（key 是内容哈希，这是特性）。
- `<details>` 解答区里的片段块一律写 `py` 而不是 `python`，否则会注入运行按钮，学生一点必然 `SyntaxError`。

## 测验（quiz）

隐藏原容器 → 插测验卡 → 选项 / `[*]` 正确项 / `?` 解释行。题干**禁 KaTeX**（`$` 会与 markdown 冲突），`validate.mjs` 与 `mechanical-audit` 都会查。只能有一个 `[*]`。

## 笔记本 · 代码仓库 · 公式输入器 · 补全

| 模块 | 入口 | 存储 | 一句话 |
| --- | --- | --- | --- |
| 笔记本 | 右下角第二颗圆钮（`Alt+N`），`notebook.js` 按需动态 import | `ml-notebook:<ns>` | Markdown + KaTeX 单元 + 代码单元，与浮窗**共用同一个 Python 命名空间** |
| 代码仓库 | 浮窗工具条 / 面板 | `ml-repo:<ns>` | 浮窗代码的存档柜：本机/账号空间 + 导入导出 |
| 数据面板 | 顶栏右上角「数据」钮（`Alt+D` / `Alt+Shift+D`） | 导出 `.json` / `ml-snapshot:<ns>` | 导出、导入（默认合并）、空间搬家、快照 |
| 公式输入器 | 浮窗/笔记本工具条 | — | 按目标类型插不同东西：代码区插 `print(r"$$…$$")`，笔记区插 `$…$`，塞裸 LaTeX 会语法错误 |
| 补全 | 编辑器内 | — | 静态词表 + 自己起过的名字 + 控制台变量名，极简版 |

层叠统一由 `zorder.js` 管理：`z-index` 只用 **1056 / 1057 / 1058** 重排、**不递增**（递增几次就盖过圆钮 1060）。`watchPanel` 还负责窗口缩放时把面板夹回视口。

**数据面板的历史位置**：早先是右下角第三颗圆钮 `ml-bk-fab`，2026-09-29 搬到顶栏（`src/theme/Navbar/DataMenu.js`），旧 id 只剩清理逻辑。三者共用同一套逻辑，三种挂载形态：顶栏气泡（主）/ 登录页内嵌 / 浮窗。

## 看见函数（/function · `src/pyrunner/func/`）

纯 JS 内核，不依赖 React、不依赖 lab 底座：既能挂页面，也能被课文用 `lab` 围栏嵌进去（`type: "see-function"`，注册在 `ch00`）。两种模式：平面 `y=f(x)`（最多 6 条曲线）、立体 `z=f(x,y)`（曲面，只画一条）。

四条对外口径（改之前先想清楚会伤到谁）：

| 写法 | 含义 | 为什么 |
| --- | --- | --- |
| `ln` | 自然对数 | 全球一致 |
| `lg` / `log`（单参） | 常用对数（底 10） | 中国教材习惯，与 Python/Desmos 不同 |
| `log(b, x)` / `\log_2 x` | 指定底数 | — |
| `\sin^{-1} x` | **反正弦** asin(x) | 排版传统。要倒数请写 `\left(\sin x\right)^{-1}` |

除 `x` 外的未知标识符一律当**可调参数**（含 `theta`/`alpha` 这类希腊字母名），自动出滑块。

**内核实现的 21 条踩坑**（分位数尺度、断点顺序、`healIsolated`/`healGrid2`、3D 归一与 lod、积分端点外推、params 初值范围…）全部在 `UNIT_GUIDES/see-function.md` —— 改 `src/pyrunner/func/` 之前必读。

## 改交互系统时的手测清单

1. `npm run build` 通过（它会跑 `validate` + `check:sync` + `mechanical-audit`）。
2. 手测三类块：`python` 能开浮窗并运行、`quiz` 替换成卡片、`exercise` 判题通过/失败各一次。
3. 路由前进后退各一次，确认**没有重复注入**（dataset 守卫生效）。
4. `npm run clear` 后再跑一遍（缓存导致的假象最常见）。
5. 触屏尺寸下确认圆钮 / 面板不挡正文（`@media (pointer: coarse)` 那段）。