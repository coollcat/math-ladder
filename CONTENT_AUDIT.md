# CONTENT_AUDIT · 内容完整度审计（现行口径）

> 本文件只记录**当前口径与未了事项**。逐批次的过程性报告与已闭环结论一律不留存。
> 判定标准：`LESSON_TEMPLATE.md` 九段式（难节点大胆详细版）+ MDX 安全规则 + 方法准入。

## 现行全站口径（2026-08-28）

| 项 | 状态 |
| --- | --- |
| 闭环课程 | **779 门**（`node scripts/validate.mjs` 权威输出） |
| 图谱规模 | 以 `node scripts/gen-graph.mjs` 最近一次输出为准（**勿写死数字快照**） |
| 方法准入登记 | math ×26、builtin ×9、import ×7 |
| validate / build | 全绿 |
| 内容缺口 | 仅剩 23 章 PDE 后六门，明细见 `BACKFILL_LOG.md` |
| 待改善项 | 见 `AUDIT_REPORTS/OPEN_ITEMS.md` |

## 发布自检纪律（每轮收尾必须执行）

- `npm run validate` 绿 + `npm run build` 绿 + h2 计数比对通过；
- exercise 初始代码"可运行、必不通过"，独立解法可通过；
- 新增 viz 渲染器逐个 canvas 非空白抽测；路由往返无重复注入；
- MDX 双坑自查：行内公式无字面 `\{` `\}`、显示公式 `$$` 一律单行。
