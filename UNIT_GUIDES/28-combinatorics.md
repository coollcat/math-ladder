# 第 28 章 · 组合数学 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 7 门正式课已建成（10/20/30/40/50/55/60）；规划名与落盘名有出入，以磁盘为准
> 目标：7 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 3 / layer L4 / track discrete-computing / stage university-core（index 基线 difficulty 3，生成函数课可到 4）

## 1. 章定位

卷一 09 章已经会算"从 33 选 6"；本章把零散技巧升级为系统方法。主线推进：

```text
分类分步系统化 → 多重集与隔板 → 容斥 → 鸽笼 → 递推与特征方程 → 二项式结构 → 生成函数
```

读者离开时应该能：把"有多少种方式"翻译成正确的计数模型（有序/无序/重复/约束），在直接数不动时改走容斥、递推或生成函数三条迂回路线，并且知道自己用的是哪条。

## 2. 前置覆盖

- `prob/counting` 已建立乘法原理、阶乘、P(n,k) 与 C(n,k) 基本公式——本章不再推导这些公式，直接进阶到多重集与带约束场景。
- `sequences/induction` 与 `math-language/induction-advanced` 已建立归纳法（含强归纳）——递推课直接使用，不重讲多米诺。
- `sequences/fibonacci` 已建立递推与斐波那契实例——特征方程课把它作为"老朋友的新解释"。
- `prob/law`、`dice` 组件可作鸽笼课生日问题的模拟素材；`coinlaw` 服务二项式分布联动。
- 工具登记现状：`math.factorial`（prob/counting）、`math.sqrt`、`random`、`matplotlib.pyplot` 均已出生；**`math.comb` 全站未登记**——按出生证明制度放在本卷 60 号课：先手写 factorial 版组合数，再引入 `math.comb` 对比验证，`introduces_math` 登记 `math.comb`。
- numpy 禁用；判题代码不用 itertools/collections（全站未登记）。

## 3. 组件清单

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `counting`（现有） | n/k 联动网格与杨辉点阵 | 10/60 |
| `fibspiral`（现有） | 斐波那契生长直觉 | 50 |
| `coinlaw`（现有） | 抛硬币频率→二项式联动 | 60 |
| `dice`（现有） | 骰子和的分布（鸽笼生日问题素材） | 40 |
| `seq`（现有） | 数列图像化 | 50/70 |
| `grid-paths`（新增） | 格路点击规划与计数联动 | 20/60 |
| `inclusion-venn`（新增） | 三圆区域点击高亮、公式项联动 | 30 |
| `pigeon-hole`（新增） | 鸽子自动入笼直到冲突动画 | 40 |
| `genfunc-coeff`（新增） | 多项式相乘看系数提取 | 70 |

新增组件规格：

### grid-paths

- spec 字段：`rows`/`cols`（网格尺寸 ≤6×6）、`blockedCells`（障碍格数组）、`showCount`。
- 画布：起点左下、终点右上的格网；合法路径条数大字显示；可选叠加杨辉数标签每格 C 值。
- 交互：点击格子逐格铺路（只能右/上）；「随机一条」按钮动画描线；拖动滑块改网格大小。
- 动画：描线 300ms 缓动；计数即时刷新无连续动画。

### inclusion-venn

- spec 字段：`sizes`（|A|/|B|/|C| 滑块值）、`pairwise`（两两交大小）、`triple`（三交大小）、`universeTotal`。
- 画布：三圆维恩图切成 7 个可点区域，各区域填色深浅表示人数；右侧公式 |A∪B∪C|=Σ−Σ+Σ 逐项点亮对应区域。
- 交互：拖五个滑块；点任一区域高亮公式中包含它的项；「只看独属 A」过滤按钮。
- 动画：公式项点亮淡入；无连续动画。

### pigeon-hole

- spec 字段：`holes`（笼子数）、`pigeons`（鸽子数滑块）、`mode`（simple/strong 加强式阈值）。
- 画布：一排笼子格子；鸽子依次飞入当前最空笼（加强模式显示"至少 k 只"阈值线）。
- 交互：「放一只」单步、「全部放入」播放、重置；冲突（超阈值）笼子红色震动提示并冻结。
- 动画：飞行 200ms/只；播放期间按钮防重入。

### genfunc-coeff

- spec 字段：`factors`（受控因子列表，如 ["1+x", "1+x+x^2"]）、`maxDegree`（截断次数）。
- 画布：左侧因子多项式系数条，右侧乘积系数条形图；选中某次幂高亮所有贡献组合。
- 交互：勾选/取消因子实时重乘；点乘积某根条形列出贡献分解（哪些次幂配对而来）。
- 动画：条形高度过渡 200ms；无连续动画。

## 4. 七门课题切分

### 10 · 分类分步的系统化：先建模再数数

- 文件：`10-counting-models.md`
- 核心概念：计数错误九成来自模型选错——每个自由度是"有序/无序/可重复"中的哪一种要先答出来。
- 边界：讲函数计数 n^m 与单射计数两个新模型 + 加法原理的"不重不漏"审查；不讲斯特林数。
- 组件：`counting`（现有）+ Python 双计数对照实验（同一对象用两种模型数出同值）。
- 判题 exercise：3 元定义域到 4 元陪域。初始代码把函数总数写成 `n ** m`（方向反了，输出 81），学生改为 `m ** n` 得 64；单射行保持正确作对照。期望输出：`函数总数: 64`、`单射总数: 24`（单射由 `m*(m-1)*(m-2)` 或阶乘比给出）。
- 必写误区：①n^m 还是 m^n 取决于"谁对每个位置提供选项"；②单射要逐步扣减选项，不是 m^n 减去什么；③分类之间必须互斥，否则加法原理多算。

### 20 · 多重集排列与隔板法

- 文件：`20-multiset-stars-bars.md`
- 核心概念：重复字母的重排数是 n! 除以各组重复度的阶乘；非负整数解个数用隔板转成组合。
- 边界：讲重排公式与 x₁+…+x_k=n 非负/正解两种隔板；不讲带上下界约束的容斥二次加工（留 30 一句话钩子）。
- 组件：`grid-paths`（新增：格路与组合同构的可视锚点）。
- 判题 exercise：MISSISSIPPI 重排数 + x+y+z=10 解数。初始代码分母漏掉 S 的 4!（只除 I 组和 P 组，输出 831600），学生补第二个 `// factorial(4)`。期望输出：`重排数: 34650`、`方程解数: 66`（第二行由 `factorial(12)//(factorial(2)*factorial(10))` 正确给出作对照）。数字全部整型精确，无浮点风险。
- 必写误区：①除的是"每组重复度"，组漏一个全盘错；②隔板里"非负"与"正整数"差 1，板数与星数别混；③重排是把相同字母当不同再除，不是先分组再排。

### 30 · 容斥原理

- 文件：`30-inclusion-exclusion.md`
- 核心概念：并集大小 = 奇数个集合交的和 − 偶数个集合交的和；符号交替是灵魂。
- 边界：讲两集/三集公式与"至少一位"应用；不讲一般 n 集合公式推导与错装信封完整推导（错排留 quiz 钩子）。
- 组件：`inclusion-venn`（新增）。
- 判题 exercise：1..100 中 3 或 5 的倍数（33+20−6=47）+ 三集合数值例（30,25,20；两两 8,7,6；三交 2）。初始代码三集合忘加最后一项 `+ triple`（输出 54），学生补上得 56。期望输出：`3 或 5 的倍数个数: 47`、`三集合并大小: 56`。
- 必写误区：①"至少"类问题默认用容斥而不是直接数；②符号交替记成"加减加减"按交的元数走；③两两交给的是 |A∩B| 不是"A 且仅 B"。

### 40 · 鸽笼原理

- 文件：`40-pigeonhole.md`
- 核心概念：n+1 只鸽子进 n 个笼必有双鸽；加强版给出"至少 k 只"的下界。
- 边界：讲简单形式、加强形式与经典构造题（月份、余数、整除对）；不讲 Ramsey 理论。
- 组件：`pigeon-hole`（新增）+ `dice`（现有，生日冲突模拟素材）。
- 判题 exercise：12 个月里保证有人同月生所需人数 + 任取若干整数保证两数之差是 7 的倍数所需个数。初始代码把答案写成 `boxes`（少 1，输出 12 和 7），学生都改成 `boxes + 1`。期望输出：`至少人数: 13`、`整除对所需个数: 8`。
- 必写误区：①鸽笼只保证"存在"，不给找到的方法；②构造鸽笼（按余数分类）才是解题核心，套公式没用；③加强式的 ceil 是上取整，不是四舍五入。

### 50 · 递推关系与特征方程

- 文件：`50-recurrence-characteristic.md`
- 核心概念：线性齐次递推的通解由特征根拼成；初值决定系数。
- 边界：讲二阶情形 aₙ=p·aₙ₋₁+q·aₙ₋₂、特征方程与比值收敛；不讲重根情形与非齐次特设法。
- 组件：`fibspiral`（现有）+ `seq`（现有）+ Python 特征根数值验证。
- 判题 exercise：L₀=2、L₁=3、Lₙ=Lₙ₋₁+Lₙ₋₂（卢卡斯数列）前八项 + 相邻比。初始代码把初值写成 `a0=1, a1=1`（退化成斐波那契，输出 [1,1,2,...]），学生改回 2 和 3。期望输出：`前八项 [2, 3, 5, 8, 13, 21, 34, 55]`、`相邻项之比趋近: 1.6176`（由 `round(seq[-1]/seq[-2], 4)` 给出，55/34 精确落位）。
- 必写误区：①同一递推不同初值长出完全不同的数列；②特征根求的是 t²=pt+q 的根，移项符号易反；③比值收敛到较大根，不是黄金分割数的倒数。

### 60 · 二项式系数与杨辉三角进阶

- 文件：`60-binomial-identities.md`
- 核心概念：帕斯卡法则生成三角；对称、范德蒙卷积与吸管恒等式是三大主力工具。
- 边界：讲恒等式组与组合证明思路（讲故事数对象）；不讲广义二项式系数与负指标。
- 组件：`counting`（现有杨辉点阵）+ `coinlaw`（现有，(a+b)ⁿ 与路径计数互证）。
- 判题 exercise：C(10,3)、范德蒙 ΣC(6,i)C(4,4−i)、吸管 Σᵢ₌₃⁹ C(i,3)。初始代码吸管求和上限写成 8（得 C(9,4)=126），学生改为 9 得 210。期望输出：`C(10,3) = 120`、`范德蒙恒等式和: 210`、`吸管恒等式和: 210`（前两行初始即正确作锚点）。组合数计算用本请新出生的 `math.comb`（首现行中文注释：math.comb(n,k) 返回从 n 个里取 k 个的组合数）。
- 必写误区：①吸管恒等式的"吸管"方向沿斜线走，上下限差一就换了一个 C；②范德蒙把"两边合计选人"拆成左边出几个；③组合证明优先于代数展开，讲得出故事才算懂。

### 70 · 普通生成函数入门

- 文件：`70-generating-functions.md`
- 核心概念：数列塞进多项式系数后，乘法变成卷积，计数问题变成代数操作。
- 边界：讲 OGF 记法、有限截断乘法、硬币组合与线性递推的 OGF 解法直觉；不讲收敛性分析与指数型生成函数。
- 组件：`genfunc-coeff`（新增）+ `seq`（现有）。
- 判题 exercise：面额 {1,2,3} 不限量凑 n 元的方案数（OGF 为 1/((1−x)(1−x²)(1−x³)) 的系数）。初始代码 DP 内层写成 `range(c, amount)`（永远够不到 amount 位，两行全 0），学生改成 `range(c, amount + 1)`。期望输出：`凑 6 元方法数: 7`、`凑 10 元方法数: 14`（DP 与 genfunc-coeff 组件展示的多项式乘积互相印证）。
- 必写误区：①生成函数是"系数携带信息"的形式对象，暂时不问 x 收敛与否；②无限面额对应几何级数 1/(1−x^c)，截断到需要的次数即可；③DP 三层循环的外层面额内层金额顺序决定方案是否计序。

插课缝隙：`65-catalan.md`（卡特兰数：括号/出栈/三角剖分）预留 x5 号，依赖 60 与 grid-paths。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | combinatorics/counting-models | prob/counting | 3 | counting-model, injection-count |
| 18 | combinatorics/multiset-stars-bars | combinatorics/counting-models | 3 | multiset-permutation, stars-and-bars |
| 19 | combinatorics/inclusion-exclusion | combinatorics/multiset-stars-bars | 3 | inclusion-exclusion |
| 20 | combinatorics/pigeonhole | combinatorics/inclusion-exclusion | 3 | pigeonhole-principle |
| 21 | combinatorics/recurrence-characteristic | combinatorics/pigeonhole, sequences/fibonacci, math-language/induction-advanced | 3 | recurrence-relation, characteristic-equation |
| 22 | combinatorics/binomial-identities | combinatorics/recurrence-characteristic | 3 | pascal-rule, vandermonde, hockey-stick |
| 23 | combinatorics/generating-functions | combinatorics/binomial-identities | 4 | ordinary-generating-function |

工具登记：60 号课 `introduces_math: [math.comb]`（须先展示 factorial 手搓版，履行出生证明）；其余课预计空表。

## 6. 整章验收清单

1. 4 个新 renderer 注册且 validate 通过；`grid-paths` ≥2 课消费，其余新组件各 ≥1 课真实消费；dataset 守卫齐全。
2. 每课一个判题 exercise：初始代码能跑但结果明显不对，改动点 ≤2 处且聚焦本课概念；独立解法与 `@check` 逐行一致，期望数值实测复现（本章大量整型精确值，禁止引入浮点打印）。
3. 与 `prob/counting` 零重叠：基本 P/C 公式一律以引用口吻出现；发现重新推导即打回。
4. 每课 quiz ≥1、误区卡 2–3 条；每课至少一个 viz 或 Python 可玩实验。
5. `npm run validate && npm run build` 全绿；h2 计数体检一致；`\lbrace\rbrace` 替代行内花括号、显示公式单行。
6. 浏览器抽测四组件 + exercise 流 + Alt+P 浮窗 + 路由切换；360px + dark 无溢出。
7. 报告合并 `CONTENT_AUDIT.md`；非阻塞项入 `AUDIT_REPORTS/OPEN_ITEMS.md`；ROADMAP 补进度小节并勾选 math.comb 出生记录。
