# 07 · 维护契约

## 一句话

**只留活口、不写死数字、P0 清零才交付**。这份文档定的是「怎么判断一件事做完了」和「文档该长什么样」，不是操作手册。

## 优先级分级

| 级别 | 判定 | 处理 |
| --- | --- | --- |
| **P0** | 数学错误、判题链断裂、页面塌陷、组件渲染错误、依赖倒置、红线命中（MDX 双坑 / 未验证 PDF 链接 / 破坏降级纪律） | **清零才能交付** |
| **P1** | 概念边界混乱、交互承诺失真、首现语法缺注释、移动端不可用或明显误导 | **当轮修复** |
| **P2** | 风格不一致、可延后的体验升级、非阻塞边界补强 | 登记后择期处理，处理完即删该行 |

不收「基本完成」这类不可验证结论。批量任务收尾必须报告：已完成文件、新增/复用组件、validate / build / h2 结果、浏览器抽测结果、未完成项与下一入口。

## 文档维护纪律

1. **只留活口**。`ROADMAP.md` / `CONTENT_AUDIT.md` / `BACKFILL_LOG.md` / `_ai-workspace/reports/OPEN_ITEMS.md` 一律只登记**未完成**与**待改善**项。已交付批次的过程记录、已闭环的审计报告不留存——证据以 `validate` + `build` 全绿为准，课程本体与各章 `index.md` 才是课程清单的事实来源。
2. **不写死数字快照**。门数 / 章数 / 文件大小一律写「以 `node scripts/validate.mjs` / `node scripts/check-chapter-sync.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准」。确实需要一个当前值时，同时写明取数命令。
3. **一份事实只写一处**。上层写「是什么、去哪看」，下层（`UNIT_GUIDES/`、代码头注释）写「怎么做、坑在哪」。重复的地方一律改成链接。
4. **新增文档先登记**。新文档必须出现在 [PROJECT_DOCS/README.md](./README.md) 的地图里，写清读者对象与「什么时候必须改」；没有维护触发条件的文档不该存在。
5. **`UNIT_GUIDES/` 的状态行不作进度依据**。那些「全部未写 / 已建成 N 门」是写作当时的快照，普遍滞后于磁盘；进度只看 `ROADMAP.md` 与命令输出。

## 文档优先级仲裁

当多份文档冲突，按这个顺序取值：

```text
AGENTS.md（硬规则/红线）
  → VISION.md（长期路线）
    → ROADMAP.md（进度）
      → LESSON_TEMPLATE.md（写法）
        → PROJECT_DOCS/*（分领域总览）
          → UNIT_GUIDES/*（实现细节与坑）
```

例外：卷六/卷七施工手册声明「与上述冲突以本文件为准」，因为它们更新且是分卷专属；但它们不能推翻 AGENTS.md 的红线。

既有 URL、`lesson_id`、冻结编号（00–17）与历史台账结论**不得私自改写**。

## 一轮收尾的检查清单

**必跑（硬闸门）**

- [ ] `npm run validate` 全绿
- [ ] `npm run check:sync` 全绿（改了章首页就必须先 `npm run gen:graph`）
- [ ] `npm run build` 全绿（含 `mechanical-audit`，problems 必须为 0）
- [ ] 若动过 `docs/**`：观察 `mechanical-audit` 的 h2 与 Python compile 两项是否 0 问题

**按改动类型加跑**

- [ ] 改章名 / 加删课 / 改 `index.md` → `npm run gen:graph` + `npm run gen:chapters`
- [ ] 改 `references-data.json` → `node scripts/gen-references.mjs`（`--check` 是闸门）
- [ ] 加 PDF → `fetch-papers.mjs` 再 `gen-references.mjs`（顺序不能反）
- [ ] 改 lab 组件 → `node scripts/check-lab-syntax.mjs` + `node scripts/lab-engine-selftest.mjs`
- [ ] 改章首页收录 → `node scripts/check-index-links.mjs`
- [ ] 改课内链接 → `node scripts/check-links.mjs`
- [ ] 改 `/graph` 钻取 → `npm run build` 后 `node scripts/check-graph-drill.mjs`
- [ ] 改 `enhancer.js` / 浮窗 → 手测 python/quiz/exercise 三类块 + 浮窗开关 + 路由往返无重复注入
- [ ] 改 `src/css/**` → 996 / 620 两个断点 + 暗色 + reduced-motion
- [ ] 出包 → `node scripts/check-build-auth.mjs`（打包脚本已串）

**文档同步**

- [ ] 新增/删除文档是否登记进 [PROJECT_DOCS/README.md](./README.md) 的地图
- [ ] 有没有把会变的数字写死
- [ ] 改动是否让 `AGENTS.md` 的某条红线失效（失效就改那条，别留旧说法）

## 已知的过时点（截至本文写作时）

这些地方存在「文档说 A、磁盘是 B」，处理时以磁盘与命令输出为准，不要照抄文档：

| 位置 | 过时之处 | 正确做法 |
| --- | --- | --- |
| `ROADMAP.md` 正文 | 引用 `INTERACTION_AUDIT.md` / `KNOWLEDGE_COVERAGE_AUDIT_v2.md` / `PLANNED_NOT_IMPLEMENTED.md`，这些文件已不在仓库根（被 `.gitignore` 挡在 `_ai-workspace/` 之外） | 交互覆盖率以当前代码扫描为准；不要再引用这些文件名 |
| `CONTENT_AUDIT.md` / `BACKFILL_LOG.md` | 分别写着「779 门」「794 门」的历史快照，与当前正式课数差得远 | 以 `node scripts/validate.mjs` 与 `node scripts/check-chapter-sync.mjs` 输出为准；这两个文件本身只该留「未完成项」 |
| `ROADMAP.md` 正文 | 引用 `INTERACTION_AUDIT.md` / `KNOWLEDGE_COVERAGE_AUDIT_v2.md` / `PLANNED_NOT_IMPLEMENTED.md`——这三个文件已不在仓库里（`.gitignore` 把它们挡在 `_ai-workspace/` 之外，且目录已清空） | 交互覆盖率以当前代码扫描为准，不要再引用这些文件名 |
| `VISION.md` §4 各卷表 | 部分章表仍写「L2→L8 桥」这类旧归层措辞，与 front matter 现状不完全一致（VISION 自称是「规范性应然口径」） | 实际归类以各课 front matter 的 `layer/track/stage` 为准；VISION 不作现状盘点 |
| `UNIT_GUIDES/*.md` 的状态行 | 多数停在写作当时（「0/18」「全部未写」「目标 N 门」） | 以磁盘章节与 `ROADMAP.md` 为准；那些状态行不是进度依据 |
| `deploy/README-部署.md` | 小节编号重复：建第一个账号与「首次上线：老账号平移」都编成 4.2 | 按标题文字定位，别按编号 |
| `scripts/check-links.mjs` / `check-index-links.mjs` | 默认 docs 路径写死成旧机器的绝对路径（`D:/桌面/…`） | 传参运行：`node scripts/check-links.mjs <docs 目录>`，或先改默认值 |

## 留给未来接手的检查项

每轮交接前问自己四句话：

1. **这个数字从哪来的？** 若答不出命令，就删掉或改成「以某命令输出为准」。
2. **这条规矩还有代码支撑吗？** 功能删了、规则没删，是文档腐烂的主要来源。
3. **这件事写在第几层？** 实现细节留在 `UNIT_GUIDES/` 与代码头注释，上层只留结论与指针。
4. **下一个接手的人能在 10 分钟内找到入口吗？** 从 [README.md](../README.md) 试一遍，卡住就修入口。