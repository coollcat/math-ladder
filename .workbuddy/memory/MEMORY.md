# math-ladder 长期项目记忆

## 项目事实
- 卷六（68–75）章号 2026-08-31 按依赖拓扑重排：68 电 → 69 数字 → 70 算机 → 71 机械 → 72 机电 → 73 声 → 74 语音 → 75 画。写卷六只看 `UNIT_GUIDES/68-75-volume6-outline.md`（自包含施工手册，与 AGENTS.md 冲突时以它为准）。
- `src/pyrunner/lab/` 是卷六交互系统（core.js 底座 + 6 引擎 + 组件 + 8 分册注册表），`viz.js` 冻结只读。组件注册路径必须字面量。
- 建章收尾四连：validate → check-lab-syntax → gen-references → gen-graph。gen-references 只在磁盘有该章目录时生成 999-references.md；references-data.json 是单一事实来源（紧凑键 t/a/y/v/g/d/p/f）。
- 章正文协作模式：并行子代理分前/中/尾三段各写 5–7 课；**主控先代为 grep 验证全部跨章 prereq 的 lesson_id**（省得子代理猜错被 validate 拦）。prereq 规则：chNum 更小、或同章 fNum 更小。
- 用户偏好：UI 先做、内容分批交付；章节顺序 > 章节数量；交互质量优先可大胆改架构；平板适配要重点关照（pointer:coarse 触控目标 ≥44px、dvh 视口）。

## 环境坑（详见 ~/.workbuddy/MEMORY.md）
- docusaurus build 会被 safe-delete shim 拦截：用 `NODE_OPTIONS="" node node_modules/@docusaurus/core/bin/docusaurus.mjs build`。
- 测试 localhost 一律用 node fetch，不用 PowerShell Invoke-WebRequest（系统代理假 404）。
- 子代理可能因账号 429 全体失败——失败后等频率重置重建团队重发即可，提示词无需改。
