# 第 56 章 · AI for Math 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 9 门正式课已建成（磁盘多于本指导登记的 8 门；40 号猜想生成机为指导未登记的新增课）
> 目标：9 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 5 / layer L11 / track information-learning / stage research-elective（index.md 已锁定，章级 difficulty 5；exits 建议 research + data-ai）

## 1. 章定位

AI for Math 的全部杠杆来自一个不对称性：**生成便宜、机械验证更便宜、可靠生成昂贵**。本章把「数学发现」拆成可检验的搜索、表示与反馈问题，沿一条主线推进：

```text
猜想与反例(可检验性) → 命题即类型(形式化) → 目标栈与战术(证明助手)
→ 表达式树与重写(符号计算) → 生成与检验的不对称(LLM 边界)
→ 搜索即证明(MCTS) → 先验引导搜索(神经引导) → 自然语言进形式世界(Autoformalization)
```

立场纪律：不神化模型能力。每课都要落到一个「学生能在浮窗里亲手跑完」的微型闭环（提议→检验→裁决）；凡涉及大模型的地方只用黑箱接口描述（「给定前文按下一位概率续写」），不展开内部结构。不能写成新闻综述课。

## 2. 前置覆盖

真实存在的前置课（已 grep 核实 lesson_id）：

- `math-language/propositions`、`math-language/quantifiers`、`math-language/contradiction-counterexample`、`math-language/direct-proof`：命题逻辑语言、量词与反例方法论（第 18 章）——本章的形式化起点。
- `computability/halting-problem`、`computability/p-np`：为什么证明搜索可能永不停机、为什么启发式不可避免（第 32 章）。
- `rl/bandit-regret`：UCB 与探索/利用的形式账（第 50 章）——第 60 课的选择准则原样上岗。
- `numtheory/primes`：素性检验是全章的默认「机械验证器」。
- `calculus/rules`：符号微分的需求来源（求导法则的重写化）。
- `sequences/fibonacci`：递归已出生，树遍历直接可用。

占位骨架处置（**不得写进 prereqs**）——**口径更正**：以下各章现已建成正式课，可按实际 lesson_id 正常串 prereqs；下文保留当时的「自带最小版」策略备查：

- 第 27 章 logic-sets 已建成 → 一阶逻辑词汇仍只用第 18 章已建立的命题/量词版本；正文注明「严格版见第 27 章」。
- 第 47 章 transformer 已建成 → LLM 仍只当黑箱概率机器；「注意力内部见第 47 章」一句即可。
- 第 40 章 information-theory 已建成 → 熵/困惑度仍只作比喻词，不做公式展开。
- 第 45 章 ml-math 已建成 → 仍不讨论模型训练细节与微调。
- 第 39/41 章已建成 → 可按实际 lesson_id 引用；本章仍不以其内部概念作硬前置。

## 3. 组件清单

index「计划交互形态」→ 组件映射：自然语言到命题转换器→`nl-to-formal`；证明步骤依赖树→复用现有 `proof-trail`；反例搜索棋盘→`conjecture-board`；形式化校验流水线演示→`goal-state-stack`+浮窗迷你检查器。

| renderer | 核心交互 | 服务课 | 状态 |
| --- | --- | --- | --- |
| `conjecture-board` | 公式格条批量染色找首个反例 | 10/50 | 新增 |
| `truth-table` | 真值表穷举验证重言式 | 10/20 | 现有 |
| `quantifier-hunt` | 量词辖域狩猎 | 10/80 | 现有 |
| `proof-trail` | 证明步骤依赖树生长 | 20/30 | 现有 |
| `set-mapper` | 谓词外延集合映射 | 20/80 | 现有 |
| `goal-state-stack` | 战术按钮驱动目标栈压弹 | 30 | 新增 |
| `term-rewriter` | 表达式树点击重写步进 | 40 | 新增 |
| `operation-table` | 运算规则表对照（重写规则清单语义） | 40 | 现有 |
| `plot` | 分支因子指数增长曲线 | 60 | 现有 |
| `statdots` | 随机模拟计数条 | 60 | 现有 |
| `mcts-tree` | 选择-扩展-模拟-回传四阶段动画 | 60/70 | 新增 |
| `nl-to-formal` | 句子成分卡片拖入形式槽位 | 80/10 | 新增 |

新增组件规格（kebab-case type，注册进 `viz.js` RENDERERS，带 dataset 守卫，亮暗主题可读；画布文字一律纯文本，不用 KaTeX）：

### conjecture-board

```viz
{ "type": "conjecture-board", "title": "这个猜想撑到哪里",
  "formula": "n*n + n + 41", "rangeMax": 120 }
```

- spec 字段：`formula`（关于 n 的安全表达式，复用 plot 的表达式求值器）、`rangeMax`（滑块上限）。
- 画布：n=0..rangeMax 的格子条，素数绿、合数红并在悬停时显示因式分解；前段连绿区自动标注「猜想带」宽度读数。
- 交互：滑块调 rangeMax；按钮「跳到第一个反例」（无反例时提示撑满）；悬停查任意格。
- 动画：格子批量渐进染色。
- 服务课：10（主）、50。

### goal-state-stack

```viz
{ "type": "goal-state-stack", "title": "目标栈与战术",
  "goals": ["forall x, P(x) -> Q(x)", "P(a)", "|- Q(a)"],
  "tactics": ["intro", "apply", "exact"] }
```

- spec 字段：`goals`（初始目标串数组）、`tactics`（预设战术按钮名，语义由渲染器内置脚本表驱动）。
- 画布：竖直目标栈卡片＋底部战术按钮排＋右侧「已证结论」托盘；非法操作抖动并给出原因文案。
- 交互：点战术按钮对栈顶执行预设变换（拆前提生成子目标/代入实例/引用事实收尾）；「撤销」「重置」。
- 动画：压栈/弹栈 CSS 过渡。
- 服务课：30（主）、20。

### term-rewriter

```viz
{ "type": "term-rewriter", "title": "一步步重写表达式",
  "tree": ["+", ["*", "var", "var"], ["*", ["num", 3], "var"]],
  "rules": ["product", "constant", "linear"] }
```

- spec 字段：`tree`（嵌套数组表达式树，叶子为 `"var"` 或 `["num", v]`）、`rules`（可用重写规则名）。
- 画布：二叉表达式树（节点框+连线），当前可重写子树高亮呼吸；右侧规则清单与步骤历史。
- 交互：点击子树+选规则应用重写，树变形并记历史；「撤销」「重置」；底部对照原始树的数值求值读数。
- 动画：子树替换淡入＋连线重排过渡。
- 服务课：40（主）。

### mcts-tree

```viz
{ "type": "mcts-tree", "title": "选择-扩展-模拟-回传",
  "preset": "bandit3", "cExplore": 2.0 }
```

- spec 字段：`preset`（内置小树场景：bandit3 / proof-mini）、`cExplore`（探索常数滑块 0–4）。
- 画布：搜索树节点显示 访问次数/累计价值；候选节点头顶 UCB 分数气泡；「利用↔探索」天平指针。
- 交互：「走一个阶段」按四阶段推进（选择路径高亮→扩展新叶→模拟滚动→回传数字沿路径上浮）；滑块调 cExplore 看 UCB 排序实时翻转；「自动演示」连播可停。
- 动画：回传数值上浮；阶段切换淡入。
- 服务课：60（主）、70。

### nl-to-formal

```viz
{ "type": "nl-to-formal", "title": "一句话的两种翻译",
  "sentence": "所有大于 2 的素数都是奇数",
  "slots": ["domain", "condition", "conclusion"],
  "variants": ["forall p, prime(p) -> odd(p)", "forall p, p>2 and prime(p) -> odd(p)"] }
```

- spec 字段：`sentence`（自然语句）、`slots`（形式槽位名）、`variants`（两个候选形式化，纯文本记法）。
- 画布：上方句子成分卡片（量词/限定条件/结论谓词），下方两个槽位面板各组装出一个变体；底部内置小样例域（如 {2,3,4,9}）真值翻牌器。
- 交互：把成分卡片拖入槽位组装语句；按钮「在样例域上求值」即时判定两变体真假；真值不同时高亮差异卡片。
- 动画：拖拽吸附＋真值翻牌翻转。
- 服务课：80（主）、10。

## 4. 八门课题切分

### 10 · 猜想、反例与可检验性

- 文件：`10-conjecture-counterexample.md`
- 核心概念：数学发现的循环＝猜→小域实验→证明或反例；猜想必须是可判定的明确陈述（回扣 `math-language/propositions`）；一个反例终结一个猜想。
- 边界：讲实验驱动的猜想方法论与欧拉素数生成二次式案例；不谈归纳法的哲学地位。
- 组件：`conjecture-board`（新）+ `truth-table` + `quantifier-hunt`（均现有）。
- 判题 exercise：写试除法素性检验，找使 n²+n+41 为合数的最小 n，打印该 n 与函数值。初始代码只扫 range(30) 找不到反例（输出 `none` / `none`）；正确输出 `40` / `1681`（=41²）。@check 两行：`40` / `1681`。
- 必写误区：「试了很多都对」不是证明——欧拉二次式撑到 n=39 照样崩；多数错误猜想死在小域里，先跑再说；论域表述不清时反例无处安放，猜想要先写成可判定命题。

### 20 · 命题即类型：形式化直觉

- 文件：`20-propositions-as-types.md`
- 核心概念：把「A 且 B」「A 或 B」「A→B」看成构造规则；证明＝按规则组装的对象；「A→B 的证明就是一个把 A 的证明变成 B 的证明的程序」（Curry-Howard 直觉版）。
- 边界：讲联结词的引入/消去规则并与真值表对照；不讲依值类型与公理体系。
- 组件：`truth-table` + `proof-trail` + `set-mapper`（均现有）。
- 判题 exercise：用函数实现 and/or/impl，穷举 8 种赋值验证分配律违例数为 0、重言式 (A→B)∨(B→A) 违例数为 0。初始代码 impl 写成 a and (not b)（输出 `2` / `8`）；正确输出 `0` / `8`。@check 两行：`0` / `8`。
- 必写误区：形式化不是「把符号抄一遍」，是把每个推理步骤降到机器可查的构造规则；真值表只管命题逻辑重言式，管不了「对所有自然数」这类无穷论断；impl 定义错一点整个验证就塌——形式世界的脆弱性正是它的价值。

### 30 · 证明助手工作流

- 文件：`30-proof-assistant-workflow.md`
- 核心概念：证明助手＝目标栈＋战术语言；每个战术把当前目标改写成更简单的子目标（拆前提/代入实例/引用引理）直到变成已知事实；可信内核只做最后核对。
- 边界：讲目标-战术循环与最小前向链检查器；用伪战术名不绑定具体 Lean 语法；不课示理引擎实现。
- 组件：`goal-state-stack`（新）+ `proof-trail`（现有）+ 浮窗迷你检查器实验。
- 判题 exercise：事实集合 {P}，规则表 rules=[("Q","R"),("P","Q")]，反复套用到不动点，打印事实总数与 "R" 是否可得。初始代码单遍扫描（顺序不利时漏推导，输出 `2` / `False`）；正确输出 `3` / `True`。@check 两行：`3` / `True`。
- 必写误区：证明助手不会「替你想」——它只保证你写的每步都被查过，创造性仍在人（或搜索）这边；单遍应用规则不是不动点，必须循环到没有新事实；战术失败不破坏全局状态，这是工作流能大胆试错的前提。

### 40 · 符号计算与计算机代数

- 文件：`40-symbolic-computation.md`
- 核心概念：表达式＝树，运算＝重写规则；符号微分就是把乘积/链式法则变成两条树重写规则；「先微分后化简」与数值求值分离。
- 边界：讲嵌套元组表达式树、递归微分器与求值器；不讲多项式 GCD、Gröbner 基与化简的组合爆炸管理。
- 组件：`term-rewriter`（新）+ `operation-table`（现有）+ 浮窗递归微分器。
- 判题 exercise：f=('+',('*','var','var'),('*',['num',3],'var'))，写 eval 树求值与 diff 树微分，打印 f(2) 与 df(2)。初始代码乘积法则少加 l*dr 项（输出 `10` / `2`）；正确输出 `10` / `7`（df=1·x+x·1+3）。@check 两行：`10` / `7`。
- 必写误区：CAS 不「懂」数学，它只会按规则搬树，化简不漂亮是常态；符号导数不化简会指数膨胀，工程系统都在跟树的大小搏斗；数值代入放最后一步，提前代入就丢掉了符号信息。

### 50 · LLM 的数学推理与幻觉边界

- 文件：`50-llm-reasoning-bounds.md`
- 核心概念：LLM＝按概率续写的生成器而非定理证明器；核心不对称＝生成便宜、机械验证便宜、可靠生成昂贵；幻觉＝未经检验的流畅输出；正确姿势＝generate-and-check（模型提议、程序裁决）。
- 边界：讲黑箱接口、采样温度对「胆量」的定性影响、验证优先架构；不讲注意力机制（第 47 章）与训练方法。
- 组件：`conjecture-board`（复用）+ 浮窗「提议池×检验器」模拟（固定 seed 的伪提议器＋确定性素性检验）。
- 判题 exercise：候选声明列表 ["2", "3", "4", "9", "15", "17"] 过素性检验器，打印接受数与拒绝数。初始代码从 i=1 起找因子（任何数都有因子 1，全军覆没，输出 `0` / `6`）；正确输出 `3` / `3`（2、3、17 过关）。@check 两行：`3` / `3`。
- 必写误区：模型「会算术」是错觉——它在预测 token，算对靠语料模式；输出自信≠正确，流畅度与真值解耦，唯一防线是独立检验器；检验器自己出 bug 比没有还糟（本课初始代码就是检验器 bug 的现场教学）。

### 60 · 蒙特卡洛树搜索与证明策略

- 文件：`60-mcts-proof-search.md`
- 核心概念：证明＝树搜索：节点是目标状态、边是推理步；MCTS 用「选择-扩展-模拟-回传」四阶段分配思考预算；UCB1 公式平衡利用与探索（`rl/bandit-regret` 的公式原样上岗）；不可判定性背景（`computability/halting-problem`）解释为什么必须有启发式。
- 边界：讲 UCB1 手算与四阶段演示；不讲 RAVE、渐进放宽与并行化。
- 组件：`mcts-tree`（新）+ `plot` + `statdots`（均现有）。
- 判题 exercise：三臂老虎机 A(访问 1,均值 1.0)、B(1,0.0)、C(1,0.5)，总次数 N=3，c=2：打印第一次 UCB 选择与（设选中臂获回报 0 后）第二次选择。初始代码「最少访问优先、平局取先」（输出 `A` / `A`）；正确输出 `A` / `C`（第一轮 UCB：A≈3.10 > C≈2.60 > B≈2.10；更新后 C≈2.85 > B≈2.35 > A≈2.17）。@check 两行：`A` / `C`。
- 必写误区：MCTS 不是靠运气模拟就能证明定理——rollout 质量决定上限，纯随机模拟在数学树上几乎总是废物；没有探索项搜索会永远困在第一个像样的分支；UCB 的平衡随总次数自动转向利用，这是对数项设计不是超参魔法。

### 70 · 神经引导定理证明

- 文件：`70-neural-guided-proof.md`
- 核心概念：把 50 课的生成器和 60 课的搜索拼装：网络给每个候选步打先验分（policy）、给局面估值（value）；搜索按分数排序扩展前沿，验证器最终把关——三个角色各司其职。
- 边界：讲小图上最佳优先 vs 朴素搜索的手算对比；不讲 AlphaZero 式自我博弈与证明步嵌入训练。
- 组件：`mcts-tree`（复用）+ `plot`（现有）。
- 判题 exercise：固定小证明图 adjacency={'S':['B','A'],'B':['D','E'],'A':['C','G']}，目标 'G'，启发值 h: S=9,B=8,A=1,D=7,E=6,C=5,G=0。贪心最好优先（每步弹出 h 最小的前沿节点）与朴素 BFS 各统计弹出到目标的节点数。初始代码引导分支漏排序（退化成 BFS，输出 `7` / `7`）；正确输出 `3` / `7`（贪心路径 S,A,G；BFS 弹序 S,B,A,D,E,C,G）。@check 两行：`3` / `7`。
- 必写误区：引导分越自信未必越好——错误的强先验会把搜索带进死胡同且难爬出来，要靠探索兜底；神经引导的全部价值以「最终被机械检验接受」为兑现条件，验证不可省略；启发式学的是分布规律，遇到罕见引理会失灵——这正是人机分工点。

### 80 · Autoformalization 与数学语料

- 文件：`80-autoformalization.md`
- 核心概念：把人类语言的数学陈述翻译成机器可检的形式语句；歧义藏在量词辖域与隐含论域里（`quantifier-hunt` 的实战版）；数学语料基准既是燃料也是污染源（测试题泄漏进训练语料＝成绩造假）。
- 边界：讲辖域歧义的双翻译对照与小域求值裁决；不讲大规模语料构建与数据清洗工程。
- 组件：`nl-to-formal`（新）+ `quantifier-hunt` + `set-mapper`（均现有）。
- 判题 exercise：把「所有素数都是奇数」的两个形式化（论域含 2 / 排除 2）在素数表 [2, 3, 5, 7] 上分别求值并打印两个布尔。初始代码论域错从 3 起（跳过 2，输出 `True` / `True`）；正确输出 `False` / `True`。@check 两行：`False` / `True`。
- 必写误区：翻译不是「换个记号」——每次省略论域都可能翻转真值；基准分数高≠懂数学，题目若在训练语料中出现过考的是记忆；形式化的价值不在写出语句，而在「此后每一步都可被机器质询」。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | ai-for-math/conjecture-counterexample | math-language/contradiction-counterexample, numtheory/primes | 3 | conjecture, counterexample-search |
| 18 | ai-for-math/propositions-as-types | ai-for-math/conjecture-counterexample, math-language/propositions | 4 | propositions-as-types, introduction-elimination-rules |
| 19 | ai-for-math/proof-assistant-workflow | ai-for-math/propositions-as-types | 4 | proof-assistant, tactic, goal-state |
| 20 | ai-for-math/symbolic-computation | ai-for-math/proof-assistant-workflow, calculus/rules | 3 | expression-tree, term-rewriting, symbolic-differentiation |
| 21 | ai-for-math/llm-reasoning-bounds | ai-for-math/conjecture-counterexample | 4 | generate-and-check, hallucination, verifier-asymmetry |
| 22 | ai-for-math/mcts-proof-search | ai-for-math/llm-reasoning-bounds, rl/bandit-regret, computability/halting-problem | 4 | monte-carlo-tree-search, ucb1, proof-as-search |
| 23 | ai-for-math/neural-guided-proof | ai-for-math/mcts-proof-search | 5 | policy-prior, value-heuristic, neural-guided-search |
| 24 | ai-for-math/autoformalization | ai-for-math/propositions-as-types, math-language/quantifiers | 4 | autoformalization, scope-ambiguity, benchmark-contamination |

补充约定：

- 所有 prereqs 已 grep 核实存在且排在本课之前（math-language/*=18 章、numtheory/primes=10 章、calculus/rules=13 章、rl/bandit-regret=50 章、computability/*=32 章）。
- 工具登记口径：random、statistics、matplotlib、math 均已出生（python-tools/matplotlib、prob/stats 等），无需重复登记；递归在 sequences/fibonacci 已出生，树遍历直接可用；**不需要任何第三方库**（无 torch/transformers/lean 桥接，一切模拟手写）。
- LLM 相关演示一律用固定 seed 的本地伪提议器代替真实模型调用，文中明说这是教学替身。
- 禁 input()/while True（MCTS/链式推导用固定次数或 do-while 改写的 for 循环到不动点，附最大迭代护栏）。

## 6. 整章验收清单

1. 五个新 renderer（conjecture-board / goal-state-stack / term-rewriter / mcts-tree / nl-to-formal）注册进 RENDERERS，validate 可识别，亮暗主题可读，各至少一门课真实消费。
2. 每课至少一个定制可视化 + 一个浮窗闭环实验；判题 exercise 初始代码能跑但不过，独立解法与 @check 逐行一致（生产时须实测核验本文件给出的目标输出）。
3. 每课有 quiz、2–3 张误区卡、选读或边界说明；占位章引用按磁盘现状核实（相关章现已建成），prereqs 只引真实存在且排前的 lesson_id。
4. 全章不出现 KaTeX 于 quiz/viz；画布文字纯文本记法（forall/and/or）。
5. MDX 双坑体检：花括号用 \lbrace\rbrace；显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测三类交互块 + Alt+P 浮窗 + 路由切换无重复注入；360px + dark 无溢出。
7. 结论合并进 CONTENT_AUDIT.md；非阻塞项登记 AUDIT_REPORTS/OPEN_ITEMS.md。
