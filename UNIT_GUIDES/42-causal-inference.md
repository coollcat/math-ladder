# 第 42 章 · 因果推断 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线；原「九门全部未写」为写作当时快照）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 4 / layer L10 / track information-learning / stage research-elective（章级 difficulty 5，单课 3–5）

## 1. 章定位

相关性能预测观察，因果才能回答"如果干预会怎样"。全章沿一条主线推进：

```text
三层阶梯：看→做→想象 → SCM：把机制写成方程 → DAG 与 d-separation：图的读法
→ do 算子：干预分布的记号 → 混淆/碰撞/辛普森：为什么观察会骗人
→ 后门调整：安全的控制清单 → 工具变量：不控制也能识别 → 中介：效应怎么分账
→ 反事实：回到个体
```

写作红线：因果直觉必须**本章自带**——第 10 课内置"条件概率最小速成"。（原注「第 36/38 章只有 index 骨架、全章不得引用」为写作当时口径；两章现已分别建成 14/10 门，且章号 36/38 均小于 42，串 prereqs 合法且顺向。）图论语言可以直接复用第 29 章已完成的 DAG 课。

## 2. 前置覆盖

已存在且可直接依赖的真实前置（grep 核实过 lesson_id）：

- `graph-theory/graph-definition`、`graph-theory/topological-dag`（第 29 章有向图与拓扑序）：DAG 的结构与"箭头不含环"。
- `prob/stats`（期望与方差）：效应量度量的地基。
- `linalg-advanced/least-squares`（正规方程）：回归控制、OLS 偏差与 IV 的载体。
- `math-language/propositions`、`math-language/quantifiers`（命题与量词）：d-separation 的判定陈述。
- `prob/counting`（排列组合）：枚举路径与调整集。

**未产出警告**：index「前置回望」提到的第 220（条件独立）、第 240（实验设计金标准）没有合法 lesson_id。处置办法：

1. prereqs 只挂上表真实 id 或本章排前的课；
2. 条件概率 P(A|B)、条件独立记号在第 10 课用半页速成（含一个 2×2 表实例），第 30 课 d-separation 开头再回收一次；
3. "随机对照试验是金标准"作为常识性叙述出现，不挂前置；
4. 上游章节完成后回填 prereqs 并登记 ROADMAP 回填项。

## 3. 组件清单

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `datachart`（现有） | 合并 vs 分组条形对比，辛普森悖论主场 | 50 |
| `statdots`（现有） | 按混淆变量着色的散点，控制前后相关翻转 | 40/60 |
| `least-squares-fit`（现有） | 拖点拟合线，演示遗漏变量如何拖歪斜率 | 60/70 |
| `truth-table`（现有） | 链/叉/汇三种结构的阻断布尔表 | 30 |
| `plot`（现有） | 断点回归阶梯图、剂量反应曲线 | 70/80 |

### 新增定制组件（4 个，≤5 上限）

#### `causal-graph-editor`

- spec JSON 字段：`type`、`title`、`nodes`（名称+初始坐标）、`edges`（from/to 数组）、`treatment`、`outcome`。
- 画布：左侧节点箭头图（处理节点蓝、结果节点绿、其余灰）；右侧自动分类面板，列出每条边在 X→Y 视角下是链、叉还是汇结构。
- 交互：拖动节点改布局；点击两节点间空白添加/删除箭头；选中边显示它参与的所有两两点对结构类型。
- 动画：无（即时重算）；增删箭头时相邻面板淡入更新。
- 服务课：20/30/40。

#### `do-intervention-compare`

- spec JSON 字段：`type`、`title`、`nodes`、`edges`、`cpt`（各节点的离散条件概率表）、`do_var`、`do_val`。
- 画布：左右双联画同一张图——左为观察世界（箭头全部活着，边上流动粒子粗细∝条件概率），右为干预世界（指向 do 变量的入边剪断并虚化，粒子流重算）。
- 交互：滑块选 do(X=x) 取值；悬停节点显示两个世界里它的边缘分布对比条。
- 动画：粒子流持续缓慢流动；`prefers-reduced-motion` 时退化为静态粗细。
- 服务课：40/60。

#### `backdoor-path-finder`

- spec JSON 字段：`type`、`title`、`nodes`、`edges`、`treatment`、`outcome`、`adjustable`（可勾选的控制变量名数组）。
- 画布：X 到 Y 的全部路径逐条列出；当前勾选的控制集下每条路径标绿（已阻断）/红（仍是活后门）。
- 交互：勾选/取消控制变量即时重判；点击某条路径高亮其上的碰撞/非碰撞节点序列并解释阻断规则。
- 动画：无；判定结论徽标（"后门干净"）带一次性弹跳提示。
- 服务课：50/60（本章核心教具）。

#### `twin-world-slider`

- spec JSON 字段：`type`、`title`、`units`（个体列表，含背景变量）、`scm`（结构方程表达式字符串）、`treatment_levels`。
- 画布：上下平行两个世界——事实世界按观测处理值算结局，反事实世界同一批个体换另一种处理；中间连线逐个体对齐，效应长度即个体差异。
- 交互：总滑块统一切换"假如所有人都接受/都不接受处理"；点击单条连线放大该个体的两个结局数字。
- 动画：切换时连线长度渐变；提供重置。
- 服务课：90。

## 4. 课题切分

### 10 · 三层阶梯：相关、干预、反事实

- 文件：`10-causal-ladder.md`
- 核心概念：看（联合分布）、做（干预分布）、想象（反事实）三层不可互推；观察表格永远答不了干预问题。内含条件概率 P(Y\|T)=P(T,Y)/P(T) 最小速成。
- 边界：讲三层定义与一张 2×2 表的完整计算；不讲因果发现算法。
- 组件：`datachart` + `statdots`（均现有）。
- 判题 exercise：由列联表 T=1:(Y=1 有 40, Y=0 有 60)、T=0:(Y=1 有 25, Y=0 有 75) 计算条件概率并回答能否谈因果。正确解打印：
  ```text
  # @check: P(Y=1|T=1): 0.4
  # @check: P(Y=1|T=0): 0.25
  # @check: 观察差值: 0.15
  # @check: 因果结论: 无法判断
  ```
- 必写误区：条件概率缩小论域而不是传递原因；观察差值大不代表干预效应大；"控制变量"这个词在因果语境里是有代价的动作不是免费透视。

### 20 · 结构因果模型 SCM

- 文件：`20-scm.md`
- 核心概念：SCM=外生变量+结构方程；每个内生变量是被"制造"出来的，噪声是模型的一部分。
- 边界：讲确定性小模型加外生变量、马尔可夫ian 假设的口语版；不讲反事实的跨世界公理体系。
- 组件：`causal-graph-editor`（新，首秀）。
- 判题 exercise：Z=U₁（U₁ 等可能取 0/1）、X=2Z、Y=3X+Z，计算两种干预与观察下的期望。正确解打印：
  ```text
  # @check: E[Y|do(X=0)]: 0.5
  # @check: E[Y|do(X=2)]: 6.5
  # @check: 观察 E[Y]: 3.5
  ```
- 必写误区：E[Y\|X=0] 在这个模型里根本没有观测支撑（X 只能取偶数）；结构方程的方向不能靠拟合优度反推；噪声独立是对外生变量说的。

### 30 · DAG 与 d-separation

- 文件：`30-dag-dseparation.md`
- 核心概念：链、叉、汇三种基本结构；控制谁阻断谁——链和叉被中间点阻断，汇恰好相反（不控则断、控之则通）。
- 边界：讲二元小网络的 d-separation 判定与数值验证；不讲贝叶斯网络推理算法。
- 组件：`causal-graph-editor` + `truth-table` + `backdoor-path-finder`（前两者新/现混用）。
- 判题 exercise：二元素链 X→M→Y，CPT 为 P(M=1\|X=1)=0.9、P(M=1\|X=0)=0.2、P(Y=1\|M=1)=0.8、P(Y=1\|M=0)=0.3，数值验证控制 M 前后的独立性。正确解打印：
  ```text
  # @check: 不控制M: 0.75 vs 0.4
  # @check: 控制M=1 后: 0.8 vs 0.8
  # @check: d-separation 结论: 独立
  ```
- 必写误区："控制了就独立"对碰撞变量恰好说反；d-separation 是图上的可达性判断不是相关性强弱；路径方向要沿箭头逐段读。

### 40 · do 算子与干预分布

- 文件：`40-do-operator.md`
- 核心概念：do(X=x)=剪断所有指向 X 的箭头再按剩余机制采样；P(Y\|do(X)) 与 P(Y\|X) 是两个世界的量。
- 边界：讲干预的图操作语义与二元变量的完整手算；不讲反事实型 do 与图一致性公理。
- 组件：`do-intervention-compare`（新，主场）+ `statdots`（现有）。
- 判题 exercise：Z 二元等可能，P(Z=1\|X=1)=0.75，P(Y=1\|X=1,Z=0)=0.2、P(Y=1\|X=1,Z=1)=0.6，对比朴素条件与按 Z 加权修正。正确解打印：
  ```text
  # @check: 朴素条件概率: 0.5
  # @check: 后门公式修正: 0.4
  # @check: 差异来源: 混淆
  ```
- 必写误区：do 不是"以 X=x 为条件"的新记号而是分布本身变了；加权权重用 P(z) 不用 P(z\|X)；剪断的是入边不是出边。

### 50 · 混淆、碰撞与辛普森悖论

- 文件：`50-confounding-simpson.md`
- 核心概念：叉结构制造虚假相关（混淆），汇结构制造选择偏差（碰撞）；聚合与分层可以给出相反结论且都"算得没错"。
- 边界：讲两类陷阱与辛普森反转的完整计数；不讲选择偏差的图条件形式化（M-bias 留选读）。
- 组件：`backdoor-path-finder`（新）+ `datachart`（现有）。
- 判题 exercise：轻症层 T 15/20 成功、C 70/100；重症层 T 40/80、C 3/10；分别算分层成功率与总体成功率并指出反转。正确解打印：
  ```text
  # @check: 轻症: 0.75 vs 0.7
  # @check: 重症: 0.5 vs 0.3
  # @check: 总体: 0.55 vs 0.66
  ```
- 必写误区：辛普森悖论里没有任何一步算错，问题出在该不该合并；碰撞变量控制后会打开新路（"越控越偏"）；重症者更多接受 T 是分配机制造成的不是巧合数据。

### 60 · 后门调整与前门调整

- 文件：`60-backdoor-frontdoor.md`
- 核心概念：合法控制集的图判定——堵死所有从 X 出发经指入 X 的边抵达 Y 的路径；后门公式 P(Y\|do(X))=Σ_z P(Y\|X,z)P(z)。
- 边界：讲后门准则主用、前门准则只走一遍数值例；不讲 do-calculus 三条公理。
- 组件：`backdoor-path-finder`（新，主场）+ `do-intervention-compare`（新）+ `least-squares-fit`（现有）。
- 判题 exercise：A 是 X、Y 的共同原因（先验各半），P(X=1\|A=1)=0.9、P(X=1\|A=0)=0.1，P(Y=1\|X,A) 由表 (1,1)=0.9、(1,0)=0.7、(0,1)=0.5、(0,0)=0.3 给出，完成朴素值、两组 do 值与效应。正确解打印：
  ```text
  # @check: 朴素关联值: 0.88
  # @check: 调整后 do(X=1): 0.8
  # @check: 调整后 do(X=0): 0.4
  # @check: 因果效应: 0.4
  ```
- 必写误区：控制中介反而消灭部分真效应（后门管的是"假的路"）；调整集不必唯一也不必最小；朴素关联 0.88 高于真实效应是 A 把高危人群推进了 X 组。

### 70 · 工具变量与断点回归直觉

- 文件：`70-instrumental-variables.md`
- 核心概念：找一个只通过 X 影响 Y 的 Z，比值法 IV=Cov(Z,Y)/Cov(Z,X) 能在混淆存在时恢复真系数；断点回归是"阈值当硬币"的近亲。
- 边界：讲单工具二元情形的矩估计与两阶段直觉；不讲弱工具渐进理论与 LATE 一般定义（文字提及即可）。
- 组件：`least-squares-fit` + `plot`（均现有）。
- 判题 exercise：X=2Z+U、Y=1.5X+U，U 等可能 ±1 且独立于 Z，总体矩直接计算 OLS 斜率与 IV 估计。正确解打印：
  ```text
  # @check: OLS 斜率: 2.0
  # @check: IV 估计: 1.5
  # @check: 真实系数: 1.5
  ```
- 必写误区：U 同时抬高 X 和 Y 才造成 OLS 虚高 2.0；IV 有效要求 Z 对 Y 无直接通路（排除限制）不是只要相关就行；工具"弱"时分母抖动会让估计爆炸。

### 80 · 中介分析与直接间接效应

- 文件：`80-mediation-analysis.md`
- 核心概念：总效应拆成经 M 的间接部分与绕过 M 的直接部分；系数乘积 a×b 是间接效应的最小识别例子。
- 边界：讲线性无交互情形的三步回归分解；不讲反事实中介（NDE/NIE）的一般定义。
- 组件：`plot` + `causal-graph-editor`（现有/新）。
- 判题 exercise：已知 a=0.6、b=0.5、直接效应 c′=0.2，算间接、直接与中介占比。正确解打印：
  ```text
  # @check: 间接效应: 0.3
  # @check: 直接效应: 0.2
  # @check: 总效应: 0.5
  # @check: 中介占比: 0.6
  ```
- 必写误区：控制中介后剩下的才是直接效应，顺序不能反；间接=a×b 只在无交互时成立；M 本身可能有未被测量的混淆导致分解失真。

### 90 · 反事实与个体处理效应

- 文件：`90-counterfactuals-ite.md`
- 核心概念：固定个体的背景变量、替换处理值重跑结构方程得到反事实结局；ITE 异质性与 ATE 的关系。
- 边界：讲确定性 SCM 的孪生世界计算；不讲潜在结果框架的完备性讨论与跨界假设检验。
- 组件：`twin-world-slider`（新，主场）。
- 判题 exercise：Y=2X+D²，个体 1 背景 X=3 观测 D=1，个体 2 背景 X=1 观测 D=4，求各自反事实 Y(D=0) 与平均处理效应。正确解打印：
  ```text
  # @check: 反事实输出: 6, 2
  # @check: 个体效应: 1, 4
  # @check: 平均处理效应: 2.5
  ```
- 必写误区：反事实不是"另一个人的实际值"而是同一个人的另一支路；ITE 通常不可观测、ATE 可估但掩盖异质性；非线性模型里"平均的效应"不等于"效应的平均"。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | causal-inference/causal-ladder | prob/stats, math-language/propositions | 3 | causal-ladder, conditional-probability-recap |
| 18 | causal-inference/scm | causal-inference/causal-ladder, graph-theory/graph-definition | 4 | structural-causal-model, endogenous-variable |
| 19 | causal-inference/dag-dseparation | causal-inference/scm, graph-theory/topological-dag | 4 | d-separation, collider |
| 20 | causal-inference/do-operator | causal-inference/dag-dseparation | 4 | do-operator, intervention-distribution |
| 21 | causal-inference/confounding-simpson | causal-inference/do-operator | 4 | confounder, simpson-paradox |
| 22 | causal-inference/backdoor-frontdoor | causal-inference/confounding-simpson, linalg-advanced/least-squares | 5 | backdoor-criterion, adjustment-set |
| 23 | causal-inference/instrumental-variables | causal-inference/backdoor-frontdoor, linalg-advanced/least-squares | 5 | instrumental-variable |
| 24 | causal-inference/mediation-analysis | causal-inference/backdoor-frontdoor | 4 | mediation-analysis, direct-effect, indirect-effect |
| 25 | causal-inference/counterfactuals-ite | causal-inference/mediation-analysis | 5 | counterfactual, individual-treatment-effect |

元数据统一补：volume 4 / layer L10 / track information-learning / stage research-elective。第 50/60 课可加副支线 probability-statistics；introduces_math/import 全章预计为空（只用四则运算与求和），如实登记。

## 6. 整章验收清单

1. 九门课 validate/build 全绿；h2 体检逐页一致；行内花括号一律 `\lbrace\rbrace`、显示公式单行。
2. 四个新渲染器注册且有签名守卫；`do-intervention-compare` 的 CPT 数据驱动重算正确（抽查 3 组 do 值）；exercise 独立解法与 `@check` 逐字一致。
3. 第 10 课的条件概率速成自足可读——屏蔽第 36/38 章链接后课程依然闭环。
4. 每课 quiz 无 KaTeX；误区卡覆盖本指南列出的条目；`backdoor-path-finder` 在 360px 宽度下节点不重叠或可纵向滚动。
5. 浏览器实测：图编辑器增删箭头、双联画粒子流、路径勾选重判、孪生世界滑块、Alt+P 浮窗、路由往返无重复注入。
6. 报告写入 CONTENT_AUDIT.md，非阻塞项进 AUDIT_REPORTS/OPEN_ITEMS.md；ROADMAP 勾 checkbox 并登记上游章节完成后的 prereqs 回填项。
