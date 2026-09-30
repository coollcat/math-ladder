# 2026-09-29 三个回路 · 变更历史档案,,> 从 `AGENTS.md` 下沉而来（2026-09-30 文档瘦身）。**这份是历史记录，不是规范**；,> 仍然生效的结论已抄回 `AGENTS.md`（MDX 两条、门数口径、章节信息源头）。,> 仍然生效但已随代码删除的部分：`/chapters` 章簇详图（第五回路退役）。

## 2026-09-29 变更速记（本轮审查与重构）

**知识图谱 /graph v3 —— 环＝层级，不再按固定难度阈值切**
- 新增纯布局引擎 `src/components/ml-home/ringLayout.js`（无 React，可 node 单测）：
  ① 章难度 = 本章课平均先修深度，按**等分位**分 6 环（每环章数相近）；
  ② 按**强先修边**（≥2 门课的跨章先修）单调上修，保证先修章的环号不大于被托起章；
  ③ 卷序下限（第 1 环只放卷一「数学地基」，卷五/卷六不进最内两环）。
  实测 9/15/13/13/10/14 章、难度区间单调、**0 条强边朝内**（旧版 32 条）。
- 连线分两档：strong（74 条，默认画）／weak（219 条单课交叉引用，默认藏，可勾选放出）。
  面板里强/弱先修分开计数并标注——只报总入度会让读者去找一条图上没有的线。
- 导航：右侧**按环分组的章目录**、选中章的**先修链面包屑**（地基 → … → 本章，每节可点）、
  方向键空间导航、双击居中、`/`-无关的搜索框同时搜章名与课名。
- 入场动画改为**纯 CSS animation + `--d` 延迟**：原先靠挂载后加 `.is-in`，SSR 出来的
  HTML 全是 `opacity:0`，JS 没跑起来时整张图空白。
- 标签字数按各环**弦长**预算（`layoutRings().labelBudget`），不再写死 4 字。

**数据面板搬到右上角（第四次搬家，这次是终局）**
- 顶栏右上角新增「数据」钮 → 面板落在钮的**下方**（`src/theme/Navbar/DataMenu.js` +
  `src/css/nav.css` 的 `.ml-nav__datapop`；面板本体仍是 `backup.js` 的 `mountBackup`）。
- 入口统一走窗口事件 `ml-open-data`：顶栏账号菜单、窄屏抽屉、Alt+D、登录页按钮都只是"请求"，
  面板只有一份实现。`backup.js` 的 inline 实例改为**集合**持有（多落点并存不再互相拆台）。
- `/login` 不再自挂面板，只留说明 + 一颗直达按钮。

**Infima 变量覆盖必须写 `body` 不写 `:root`**
- Infima 的变量规则是 `:root:not(#\#):not(#\#)`（双 ID，特异性 2,1,0），普通 `:root` 压不过它。
  实测写在 `:root` 里的 `--ifm-color-primary:#c2401c` 解析出来仍是 Infima 蓝。
  主色 / 页面底色 / 标题字族的覆盖都在 `custom.css` 的 `body { … }` 与 `[data-theme='dark'] body { … }`。

**Python 运行时（数据准确性的根子）**
- 删除实测 404 的 npmmirror 源；`loadImportsFor()` 用 `loadPackagesFromImports(source)`
  按 import 自动装包——此前只特判 `sympy`/`matplotlib`，**scipy 永远装不上**（22 处课文的 t 检验/卡方/ANOVA 全报 ModuleNotFoundError）。装不到的包（torch 等）给一句人话。
- `static/ml-pyodide-sw.js` 的 activate 只清 `ml-pyodide-*`（原先"凡不是自己就删"，会顺手清掉同源其它 Cache Storage 使用者）。

**判题与练习**
- `sameOutput` 增加大整数分支：≥16 位纯整数走字符串比（Number() 超 2^53 后 `2**100` 与 `2**100+1` 同值，错答案会被判对）。`scripts/audit-py-solutions.py` 同步。
- 本轮修掉 7 处不可达 `@check`、4 处与判题对不上的参考解、2 处"初始代码本来就通过"的练习、2 处跑不起来/结论错的示例块（含 `docs/33-…/67` 那个会**死循环冻住标签页**的脚手架）。

---

## 2026-09-29 第二回路：全站补课 + 缺口复审查（+82 门课）

> 门数/图谱规模以 `node scripts/validate.mjs` 与 `node scripts/gen-graph.mjs` 最近一次输出为准，**本文不写死数字快照**（见「文档维护纪律」）。

**补课范围**：审计报告 v1（`_ai-workspace/reports/KNOWLEDGE_COVERAGE_AUDIT_v1.md`）列出的 53 项缺口全部闭环——48 项独立成课、5 项判定为章内已覆盖。另新建**卷七 76–78**（相对论 / 哈密顿力学 / 脑机接口），各 8 门 + 各 8 个 lab 组件。复审查结论见 `_ai-workspace/reports/KNOWLEDGE_COVERAGE_AUDIT_v2.md`（v2），施工单见 `UNIT_GUIDES/79-second-pass-backfill.md`。

### ⚠️ 本轮新增课文大面积违反了「MDX 静默降级」两条既有规范（已全部改正）

本轮补的 82 门课里，有一批踩了本文上面 `## MDX 静默降级` 已经写明、但没被遵守的两个坑：

- **4 门课写了跨行 `$$…$$`** → 该课从出错行起整体塌成纯文本：`## 4.`～`## 8.` 不再渲染成 `<h2>`（产物里变成段落中的字面文本）、`<details>` 被转义成 `&lt;details>`、公式也不再渲染。
  受影响：`43-optimization/93-conic-programming`、`43-optimization/98-bayesian-optimization`、`47-transformer/95-decoding-strategies`、`66-stochastic-analysis/97-black-scholes`。
- **24 个文件用了 `\{` `\}`**（行内或显示公式里），另有 18 处缩进式 `$$`。
- **`npm run build` 全程绿灯**，只有 `node mechanical-audit.cjs` 能抓出来（它的 h2 对比正是本文那套体检方法的自动化版）。

教训与对策：

1. **写课的自检必须跑 `npm run audit`**，不能只看 `validate` + `build` 的结果。本轮正是因为只跑了后两者才漏过。
2. **改 `\{`→`\lbrace` 时必须在后面补一个空格或 `{}`**：`\{` 是控制符号、后面可直接跟字母，但 `\lbrace` 是**控制词**，`\{X` 直接替换会得到 `\lbraceX`——KaTeX 会当成未定义命令 `\lbraceX`（且不报构建错）。正确写法是 `\lbrace X`（数学模式忽略空格，语义等价）。本轮修复时踩过这个坑，共 25 处。
3. 建议后续把 `mechanical-audit.cjs` 并入 `npm run build` 的闸门（目前它不在闸门内，所以才能"绿灯放行"）。

**顺带修掉的链接缺陷**：5 处站内绝对路径 `/docs/...` 改为相对路径（Docusaurus 下必 404），1 处指路错误（`59-quantum-information/85` 原称相位估计「留给下一程」，实际 `83` 在其之前）。新增两把长期自查工具：`scripts/check-index-links.mjs`（章首页是否漏收本章课）与 `scripts/check-links.mjs`（全站相对链 + 站内绝对链）。

## 2026-09-29 第三回路：章节信息收口（/chapters 章簇详图已在该回路引入、第五回路退役）

> **现状（2026-09-29 第五回路）**：`/chapters` 页面、`ChapterClusterGraph.js`、`clusterLayout.js`、
> `home.css` 的 `.ml-cc` 段与 `check-chapters-page.mjs` 均已删除；独立阅读前端 `ui/`（fluent/paper
> 两皮肤）连同两个启动 bat 一并退役。课级细节的入口改为 **/graph 的课级钻取**（见「两个图谱页
> 的分工」）。本回路中仍然有效的部分只有「章节信息只有一个源头」与「七卷配色收口」。

### 二、（原「/chapters 章簇详图」一节，已随第五回路退役删除）

该页与 `clusterLayout.js` 的全部设计经验中仍然通用的一条：**同心环上叠课点时，
环半径解方程的思路**（把每簇张角写成 `2·asin((cr+缝/2)/r)` 后对 r 二分）已在 /graph
钻取的课圈布局里继承；其余细节随代码删除，历史可查 git。当年 `check:chapters`
运行时验收抓到的「CSS 变量名对不上会静默退化成黑色」教训，已沉淀在上方「配色」段落。
