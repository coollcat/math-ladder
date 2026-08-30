# 第 18 章 · 数学语言与证明 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：已完成（磁盘 7 门正式课：10/20/30/40/50/60/70，与本指导登记的 7 门课题一一对应）
> 目标：7 门正式课  
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 2 / layer L8 / track algebra-structure / stage university-core

## 1. 章定位

本章不是逻辑学导论，而是把卷一已经反复出现的“为什么”变成可检查语言。读者离开时应该能：

- 分清命题、谓词和论域；
- 判断一个证明是在证原命题、逆否命题，还是偷换了量词；
- 用反例杀死猜想，用反证处理否定性结论；
- 写出基础步、归纳步和结论边界都清楚的归纳证明；
- 按清单自查自己的证明。

难度从 3 起步；第 60 课可用 difficulty 4。全章不引入第三方库，不新增 `math.*`。

## 2. 先做组件

四个 renderer 已于 2026-08-25 实现并提交。命名使用 camelCase 函数，JSON type 使用 kebab-case。

### truth-table

```viz
{
  "type": "truth-table",
  "title": "p => q 与它的朋友",
  "formula": "p=>q",
  "showColumns": ["p", "q", "not p", "p=>q", "q=>p"]
}
```

交互：点击 p/q 列头切换真值；高亮当前公式的假行；提供 `=>`、`<=>`、`and`、`or`、`not` 五种联结词。第一版支持固定模板即可，不要求解析任意公式。

### quantifier-hunt

```viz
{
  "type": "quantifier-hunt",
  "title": "所有人都有朋友吗？",
  "domain": ["A", "B", "C"],
  "predicate": "knows",
  "relations": [["A", "B"], ["B", "C"]],
  "form": ["forall", "exists"]
}
```

交互：切换 `forall exists` 与 `exists forall`；点击格子修改二元关系；系统显示 witness 和 counterexample。论域不超过 4 个元素。

### set-mapper

```viz
{
  "type": "set-mapper",
  "title": "箭头决定函数",
  "left": ["1", "2", "3"],
  "right": ["a", "b"],
  "arrows": [[0, 0], [1, 1], [2, 1]]
}
```

交互：拖动或点击建立箭头；自动判断关系是否为函数，进一步标注单射、满射、双射。必须允许出现“一对多”和“无像”，因为它们是误区来源。

### proof-trail

```viz
{
  "type": "proof-trail",
  "title": "把证明接回前提",
  "steps": [
    { "id": "P", "text": "n 是偶数" },
    { "id": "D", "text": "存在整数 k，使 n=2k" },
    { "id": "C", "text": "n^2 是偶数" }
  ],
  "edges": [["P", "D"], ["D", "C"]]
}
```

交互：拖动步骤卡形成有向无环依赖链；若造成循环或断链，显示“循环论证”或“缺少桥梁”。第一版可用预设正确序与错误序按钮代替自由拖拽。

## 3. 七门课题切分

### 10 · 命题与联结词（已完成）

- 文件：`docs/18-math-language/10-propositions-connectives.md`。
- 核心概念：命题的真值结构。
- 边界：讲五种基本联结词；不讲谓词、自然演绎和真值表算法优化。
- 钩子：天气预报说“如果下雨，我就带伞”。雨天没带伞才是承诺失败；晴天没带伞不构成逻辑矛盾。
- 组件：`truth-table`。
- 例题：把中文句子翻译成命题形式，再找出使条件句为假的唯一组合。
- exercise 目标输出三行：`False`、`True`、`True`。初始代码故意交换条件和结论。
- quiz：判断“p=>q 为真时 q 一定为真”是否成立，解释栏用纯文字。

### 20 · 谓词与量词（已完成）

- 文件：`docs/18-math-language/20-predicates-quantifiers.md`。
- 核心概念：量词绑定自由变量并确定论域。
- 边界：讲 forall/exists、否定和顺序；不讲不同无限基数的深层差异。
- 钩子：“每个人都有不喜欢的水果”和“有水果每个人都不喜欢”，听起来像，其实完全不同。
- 组件：`quantifier-hunt`。
- 分层实验：有限论域暴力检查 → 全称量词为什么不能靠举例 → 否定翻转规律。
- exercise 让学生对三个小论域打印计数结果，目标输出 `2`、`1`、`0`。
- 误区卡片必须包含“举例不能证明全称命题”和“not all 不等于 all not”。

### 30 · 集合、关系与函数（已完成）

- 文件：`docs/18-math-language/30-sets-relations-functions.md`。
- 核心概念：集合组织对象，箭头规则定义映射。
- 边界：讲属于、包含、关系和函数性质；不讲基数运算、序型和公理集合论。
- 钩子：把学生和座位画上箭头，一人多座、多人同座、有人没座，三种混乱立刻可见。
- 组件：`set-mapper`。
- exercise 打印三个判定结果，目标输出三行：`relation`、`function`、`bijection`。
- Python 中第一次出现集合字面量和字典映射时逐行加中文注释。

### 40 · 直接证明（已完成）

- 文件：`docs/18-math-language/40-direct-proof.md`。
- 核心概念：从定义和已知事实推出结论的依赖链。
- 边界：讲直接证明、逆否证明和分情况；不展开公理系统。
- 钩子：证明不是把答案写长，而是让每一步都能回答“凭什么”。
- 组件：复用 `proof-trail`，预设“奇数平方是奇数”的三条路径。
- 例题至少两条：偶数加偶数为偶数；若 n^2 为偶则 n 为偶（用逆否）。
- exercise 输出四个分类字符串：`even`、`odd`、`even`、`odd`。

### 50 · 反证与反例（已完成）

- 文件：`docs/18-math-language/50-contradiction-counterexample.md`。
- 核心概念：反例否定全称猜想，反证通过不可能性确立结论。
- 边界：两者并列但始终区分用途；不讲模型论意义下的独立性和不可判定。
- 钩子：想推翻“所有天鹅都是白色”，只需要一只黑天鹅；想证明“没有最大素数”，则要排除每一种可能。
- 组件：`quantifier-hunt` 的 counterexample 视图 + `proof-trail` 反证分支。
- 经典选读：根号 2 不是分数，完整推导放折叠块。
- exercise 打印三次判定：`counterexample`、`no counterexample`、`contradiction`。

### 60 · 归纳法进阶（已完成）

- 文件：`docs/18-math-language/60-induction-advanced.md`。
- 核心概念：基础步、归纳步和适用范围构成多米诺证明。
- 边界：讲强归纳与起始偏移；不讲良序定理的等价性证明细节。
- 钩子：第 08 章的多米诺只推倒从 1 开始的一排；这次让第一张牌站在 4 号位，并检查每一张能推倒后面三张。
- 组件：`proof-trail` 归纳模式，显式标出 base case、IH、IS。
- 例题一条标准求和，一条强递推，例如某类合法拆分数量满足前三项递推。
- exercise 输出前六项：`1` 到 `6` 或指定递推序列；初始代码漏掉基础步导致首项错误。

### 70 · 证明写作自查清单（已完成）

- 文件：`docs/18-math-language/70-proof-writing-checklist.md`。
- 核心概念：把证明质量变成可执行检查。
- 边界：不教新定理；所有例子回扣前六课。
- 钩子：数学写作的第一读者是怀疑你的朋友，不是替你补漏洞的老师。
- 组件：`proof-trail` 作为诊断器，加载一段含偷换量词、缺基础步、循环论证的错误证明。
- 正文给七问清单：论域是什么？每个符号在哪定义？用的是充分还是必要？是否处理空论域？每步凭什么？有没有反例？结论边界在哪？
- exercise 输出一份机器可查的检查摘要，四行固定文本。

## 4. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | math-language/propositions | [] 或卷一相关入口课 | 3 | proposition, connective |
| 18 | math-language/quantifiers | math-language/propositions | 3 | predicate, quantifier |
| 19 | math-language/sets-relations-functions | math-language/quantifiers | 3 | relation, function-property |
| 20 | math-language/direct-proof | math-language/sets-relations-functions | 3 | direct-proof |
| 21 | math-language/contradiction-counterexample | math-language/direct-proof | 3 | contradiction, counterexample |
| 22 | math-language/induction-advanced | math-language/contradiction-counterexample | 4 | strong-induction |
| 23 | math-language/proof-checklist | math-language/induction-advanced | 3 | proof-review |

`introduces_math`、`introduces_builtin`、`introduces_import` 默认空数组。若实现中真的用了新的受管工具，先在本文件登记理由，再写入课内出生证明。

## 5. 整章验收

1. 四个 renderer 上线且各有至少两课消费。
2. 七课全部有判题 exercise；正确解法由审查者独立写出。
3. 每页 h2 数量一致；KaTeX 显示公式单行；花括号用 `\lbrace`/`\rbrace`。
4. 浏览器抽测：truth-table 点击、quantifier-hunt 顺序切换、set-mapper 箭头判定、proof-trail 断链提示。
5. 移动端 360px 宽度下表格横向滚动、按钮不重叠。
6. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
