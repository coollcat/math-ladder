# CONTENT_AUDIT · 内容完整度审计（现行口径）

> 本文件只记录**当前判定标准与未了事项**。逐批次的过程性报告与已闭环结论一律不留存。
> **不写死门数 / 缺口计数的数字快照**：需要时现场跑下面这三条命令取最新值。
> 判定标准：`LESSON_TEMPLATE.md` 九段式（难节点大胆详细版）+ MDX 安全规则 + 方法准入。

## 现行判定标准

| 项 | 怎么取当前值 |
| --- | --- |
| 闭环课程与依赖顺序 | `node scripts/validate.mjs`（权威输出） |
| 章名/短名/卷号与图谱规模 | `node scripts/check-chapter-sync.mjs` / `node scripts/gen-graph.mjs` |
| 内容缺口（九段式 / 练习 / 可视化 / 误区 / 选读 / 首现注释） | `node _ai-workspace/skills/math-ladder-lesson-audit/scripts/scan-gaps.mjs .` |
| 单课实跑（python 块 / 判题链 / MDX 三坑） | `python _ai-workspace/skills/math-ladder-lesson-audit/scripts/run-lesson.py <课.md>` |
| 站内相对链接断链 | `node scripts/check-links.mjs docs` |
| 章首页是否漏收本章课 | `node scripts/check-index-links.mjs docs` |

## 长期待改善方向（不设日期，做完即删行）

- **判题链的机器可验证性**：存量 exercise 里只有一小部分带可运行参考解，其余 `@check` 只能人工推演。新题一律要求带「能独立跑通 `@check` 的完整参考解」；存量按章分批补。
- **no-visual 课**：仍有课程只有浮窗 Python、没有网页交互。按「专属定制交互 → viz → 浮窗 Python → 静态文字」的优先级逐章补，优先补交互密度最低的章。
- **首现中文注释**：Python 里第一次出现的语法/函数/参数必须有中文注释，校验器管不到，属写作纪律，靠审查兜底。
- **组件规格落地**：各章 `COMPONENT_SPEC.md` 里登记过、尚无实现的组件，按落点课逐个实现或明确废弃。
- **登记但未排期的整章空白**：见 `ROADMAP.md` 同名小节。

## 发布自检纪律（每轮收尾必须执行）

- `npm run validate` 绿 + `npm run check:sync` 绿 + `npm run build` 绿（含 `mechanical-audit` 的 h2 比对）；
- exercise 初始代码「可运行、必不通过」，独立解法可通过；
- 新增 lab / viz 组件逐个抽测画布非空白；路由往返无重复注入；
- MDX 双坑自查：行内公式无字面 `\{` `\}`、显示公式 `$$` 一律单行、quiz 里无 `$`。
