# BACKFILL_LOG · 未完成缺口台账

> 本文件只登记**未了事项**。已完成批次一律不留存，交付证据以 `npm run validate` + `npm run build` 全绿为准。
> **不写死门数快照**：课程规模以 `node scripts/validate.mjs` / `node scripts/check-chapter-sync.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准。

## 回填铁律

1. **命名规则**：读者可见文本一律使用**纯课程标题**，禁止携带「NN ·」数字前缀——编号只存在于文件名（例外：`ROADMAP.md` 与 `UNIT_GUIDES/` 维护者台账可带编号定位）。
2. 新课排号优先用空隙号，保证 prereqs 全部指向**更前**的课程（validate 强校验）。
3. 每门新课九段式齐备、exercise 初始代码「能跑但不对」、首现语法必注释；`@check` 期望值必须实跑抄录；收尾 validate 全绿。
4. 占位课转正三件套：删 `draft: true` → 按九段式清单补正文 → 本章 index「待写」条目改回 `[纯标题](./slug)——钩子` 并按文件号重排。

## 未完成缺口

| 章 | 缺口 | 状态 |
| --- | --- | --- |

（当前无登记中的整章缺口；新增时按上表格式登记，做完即删行。）

## 常驻待办（跨批次）

1. 浏览器端抽测新课判题链与 viz/lab 渲染（口径：viz/lab 渲染非空白 / quiz 替换成卡片 / exercise 判题按钮通过与失败各一次 / python 运行按钮 / 控制台零报错）。
2. 每新建/转正一门课，同步：本章 index 链条 + `ROADMAP.md` checkbox + 本台账。
3. 存量 exercise 的参考解补齐（按章分批），补一批把该章从"只能人工推演"变成"机器可复核"。
