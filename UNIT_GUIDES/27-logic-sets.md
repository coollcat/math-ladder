# 第 27 章 · 逻辑与集合 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：6 门正式课已建成；本版以磁盘基线为准  
> 元数据基线：volume 3 / layer L4 / track discrete-computing / stage university-core / difficulty 3  
> 身份规则：目录号为 27，`lesson_id` 与剥离数字后的课程 slug 保持不变

## 1. 章定位

第 18 章给出命题、量词、集合、关系和函数的基础词汇；第 27 章把它们推进为可判定、可构造、可证明的结构语言。主线是：

```text
论证有效性 → 模型与量词 → 集合代数 → 关系/等价/序 → 单射满射双射 → 可数性与基数
```

## 2. 已建成课表

| 文件 | lesson_id | 核心概念 | 主要交互 |
| --- | --- | --- | --- |
| `10-propositional-deduction.md` | `logic-sets/propositional-deduction` | 论证有效性、MP/MT/HS、经典谬误 | truth-table、proof-trail、Python 穷举 |
| `20-predicates-models.md` | `logic-sets/predicates-models` | 论域、解释、witness/反例、量词否定 | quantifier-hunt、Python 模型体检 |
| `30-set-algebra.md` | `logic-sets/set-algebra` | 并交补差、德摩根、双包含法 | truth-table、特征向量与 Venn 图 |
| `40-relations-equivalence-order.md` | `logic-sets/relations-equivalence-order` | 自反/对称/传递/反对称、等价类、偏序 | relation-checker、Python/matplotlib |
| `50-functions-injective-surjective.md` | `logic-sets/functions-bijective` | 函数三勋章、有限枚举、可逆判据 | set-mapper、Python 分类统计 |
| `60-countability-cardinality.md` | `logic-sets/countability` | 等势、可数无穷、对角线法 | 对角线路径与翻转实验 |

章首页另设真实场景综合挑战「权限审计」，串联条件句、有限模型、对称差、等价划分和双射判据。

## 3. 边界与依赖

- 不重复第 18 章的联结词、量词和函数定义；每课只在需要时回望。
- 前置全部指向更早课程；跨章消费方继续使用稳定 `logic-sets/*` 身份。
- 全章不引入新的 Python 库或受管内置函数。
- MDX 显示公式保持单行；集合花括号使用 `\lbrace` / `\rbrace`。

## 4. 组件现状与后续升级

已上线：truth-table、proof-trail、quantifier-hunt、relation-checker、set-mapper。  
非阻塞升级项：哈斯图拖拽编辑器、划分透镜和对角线步进组件仍可按模板回填制度立项；现有浮窗实验已完成主线演示，不阻塞本章交付。

## 5. 验收记录

1. 六门正式课均含九段式骨架、判题 exercise 和误区卡。
2. 章首页包含真实场景综合大题，判题链需保持“初始错、修后中”。
3. `npm run validate`、`npm run build`、`node mechanical-audit.cjs`、h2 对比和浏览器抽测全绿后才能宣布收口。
4. P2 升级项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`，不在正式课里虚报已实现。
