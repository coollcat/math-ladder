# 第 45 章 · 机器学习数学 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 5 / layer L10 / track information-learning / stage university-core（index.md 已锁定）

## 1. 章定位

监督学习的一切都围绕一个问题：在有限数据上选出的函数，凭什么在没见过的数据上还有效？本章沿一条主线推进：

```text
数据与假设类 → 平方损失回归 → 逻辑回归与似然 → 决策边界与校准 → 正则化 → 核与大间隔 → 过拟合与验证 → 交叉验证与指标
```

前四课建立"损失 × 参数 × 预测"的训练闭环，中间两课给这个闭环装上"约束"（正则化、间隔），最后两课回答"怎么知道它真的好"。每课都要把同一个数据集从头用到尾（建议固定一组 12 点教学数据贯穿全章），让学生看到同一份数据在不同镜头下的样子；不能写成模型名词巡礼。

## 2. 前置覆盖

- 第 06 章 `functions/linear` 与 `fit` 组件是最小二乘的第一次接触；第 20 课从损失函数视角重讲，不再重复拖点实验本身。
- 第 21 章 `linalg-advanced/least-squares` 已用投影推导正规方程；本课引用其结论，重点放在梯度步训练与损失曲面。
- 第 09 章 `prob/stats`（均值方差）与 `prob/law`（大数定律）提供评估的概率语言。
- 第 13 章 `calculus/chain`、第 20 章 `multivariable/partial-gradient` 提供梯度工具；第 12 章 `complex/euler` 是 exp 的出生地，sigmoid 直接复用。
- **第 43 章现状（已更新）**：`docs/43-optimization/` 现已建成 12 门正式课，GD 家族、`momentum-adam`、`sgd-noise` 等均有合法 lesson_id 可引（原「只有 index 占位骨架」为写作当时快照）。GD 家族正式席位在第 43 章；本章第 20 课只写最简版本——固定学习率的梯度下降小循环（约十行），正文显式注明"动量/Adam/自适应学习率等完整版在第 43 章"。第 46 章同样按此口径处理。
- **卷四现状（已更新）**：第 36–42 章已全部建成（14/11/10/10/10/10/10 门），均有 lesson_id 可引（原「220–280 全部是 index 占位骨架」为写作当时快照）。index.md 前置回望里提到的"第 38 章评估思想"由本章第 85 课（cross-validation-metrics）自行承担（混淆矩阵、精确率/召回率在本章内出生）；经核实第 38 章不含指标课，**维持本章自担，无需回填 prereqs**（2026-08-28 已裁决）。
- ERM/VC/PAC 的理论化处理归第 41 章；本章泛化讨论保持在直觉层。

## 3. 组件清单

新增 5 个定制组件（顶格），其余复用现有渲染器。

### 新增：sigmoid-lab（决策边界雕刻台·逻辑回归版）

```viz
{ "type": "sigmoid-lab", "title": "一条 S 曲线切开两类", "w": 2, "b": -1 }
```

- spec 字段：`w`（斜率滑块初值）、`b`（偏置初值）；内置一组固定一维两色数据点。
- 画布：左侧数据带按预测概率着色；右侧 sigmoid 曲线随 w/b 实时变形 + 可拖阈值横线 + 准确率读数。
- 交互：w/b 滑块、阈值拖柄；「翻转标签」按钮看模型如何追着数据跑。
- 动画：无自动动画，即时重绘。
- 服务课：30（主）、40（阈值滑动与校准）。

### 新增：reg-path（正则化收缩路径）

```viz
{ "type": "reg-path", "title": "λ 变大时系数去哪了", "data": [[1, 2], [2, 4], [3, 7]] }
```

- spec 字段：`data`（小型二维回归数据）。
- 画布：横轴 log λ，两条系数路径线——L1 蓝、L2 橙；L1 路径触零时打「稀疏！」标记并高亮对应项消失。
- 交互：log λ 滑块；切换显示 L1/L2/两者；悬停读系数值。
- 动画：λ 拖动时路径游标平滑移动。
- 服务课：50（主）。

### 新增：kernel-lift（升维展开器）

```viz
{ "type": "kernel-lift", "title": "圆环套圆环怎么分开", "preset": "circle" }
```

- spec 字段：`preset`（"circle" 内外环 | "xor" 四象限）。
- 画布：左 2D 散点（两色不可分）；右升维后的 3D 曲面 z=x²+y² 与一张分割平面，两色点在曲面上被平面干净切开。
- 交互：「一键升维」触发点飞升至曲面的入场动画；视角拖转；preset 切换。
- 动画：有（升维飞行 + 平面落下）。
- 服务课：60（主）。

### 新增：complexity-curve（过拟合双曲线观测台）

```viz
{ "type": "complexity-curve", "title": "阶数拧过头会怎样", "n": 12 }
```

- spec 字段：`n`（样本数）。
- 画布：左拟合曲线叠加散点（训练点实心、验证点空心）；右训练误差/验证误差双曲线，当前阶数的动点在曲线上滑动。
- 交互：多项式阶数 d 滑块 1→12；d 过大时左图曲线扭出过拟合形状、右图动点爬升。
- 动画：有（d 变化的过渡插值）。
- 服务课：70（主）、80。

### 新增：cv-folds（交叉验证折叠器）

```viz
{ "type": "cv-folds", "title": "轮流当考卷", "n": 12, "k": 4 }
```

- spec 字段：`n`（样本数方块网格）、`k`（折数滑块 2–6）。
- 画布：n 个方块排成 k 行，当前验证折高亮；右侧每折分数条形图 + 均值 ± 波动读数。
- 交互：「下一折」按钮驱动轮换动画；k/n 滑块改布局；一键播放完整一轮。
- 动画：有（验证折轮换扫过）。
- 服务课：80（主）。

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `fit`（现有） | 拖点看最小二乘直线追赶 | 20 |
| `least-squares-fit`（现有） | 竖直残差与正规方程解 | 20 |
| `gradient-probe`（现有） | 在损失曲面上探梯度方向 | 20 |
| `contour-map`（现有） | L1 菱形 vs L2 圆的等值线几何 | 50 |
| `pca-projection`（现有） | 数据方向性与方差（特征缩放回扣） | 60 |
| `plot`（现有） | sigmoid/多项式等函数族 | 30/70 |

## 4. 八门课题切分

### 10 · 从数据到假设类：损失与泛化目标

- 文件：`10-from-data-to-model.md`
- 核心概念：机器学习三件套——数据、假设类（候选函数的范围）、损失（打分规则）；训练误差 ≠ 泛化能力，留出测试集是唯一的诚实检查。
- 边界：讲经验风险 vs 真风险直觉、训练/测试切分；不讲 VC 维与 PAC 形式理论（归第 41 章）。
- 组件：`complexity-curve`（新，提前预览）+ `datachart`（现有）+ Python 手算 MSE 与切分。
- 判题 exercise：手算 MSE 并按比例切分。目标输出 `1.33` / `2`（预测 [1,2,3] 对真实 [1,2,5]，MSE=4/3≈1.33；n=10、test_ratio=0.2 切出 2 个）。初始代码漏除 n 输出 4.0。
- 必写误区：你以为训练误差低就是学好了，其实可能是背题；你以为测试集可以反复用，其实多用一次就泄漏一次；你以为模型越复杂越值得买，其实假设类变大是双刃剑。

### 20 · 回归：平方损失与第一个梯度步

- 文件：`20-regression-loss.md`
- 核心概念：平方损失曲面是碗形的；梯度下降用"局部最陡下坡 × 学习率"一步步走到碗底；学习率太大震荡、太小磨蹭。
- 边界：讲一维参数的梯度步全流程与学习率手感；不讲动量/Adam/SGD（明确注明完整版在第 43 章）；不重推正规方程（50 章已做，只引用对比）。
- 组件：`least-squares-fit` + `gradient-probe` + `fit`（均现有）+ Python 十行梯度循环。
- 判题 exercise：(w−3)² 从 w=0 出发走两步。目标输出 `0.6` / `1.08`（lr=0.1，w₁≈0.6、w₂≈1.08，round(·,2)）。初始代码学习率写 0.01 输出 0.06/0.12。
- 必写误区：你以为梯度指向最低点，其实它只指脚下最陡的下坡方向；你以为学习率越大收敛越快，其实越过临界值会来回弹飞；你以为一步到位才叫收敛，其实足够接近就算赢。

### 30 · 逻辑回归与对数似然

- 文件：`30-logistic-regression.md`
- 核心概念：把线性输出挤进 (0,1) 得到概率预测 σ(wz)；对数似然把"找参数"变成"让见到的标签概率最大"；最大化似然 = 最小化交叉熵。
- 边界：讲一维 sigmoid、伯努利对数似然、交叉熵形式；不讲多分类 softmax 与凸性证明。
- 组件：`sigmoid-lab`（新）+ `plot`（现有）。
- 判题 exercise：实现 σ(z) 并检验两个哨兵值。目标输出 `0.5` / `True`（σ(0)=0.5；σ(−10)<0.001）。初始代码 exp(-z) 写成 exp(z) 导致第二行 False。
- 必写误区：你以为输出 0.9 是"90% 把握"的事实陈述，其实它依赖模型校准得好不好；你以为似然是概率分布，其实它是关于参数的函数；你以为交叉熵是新发明，其实它就是负的对数似然换了马甲。

### 40 · 决策边界、阈值与概率校准

- 文件：`40-decision-threshold-calibration.md`
- 核心概念：σ 输出连续概率，阈值把它切成离散决定；移动阈值在"抓更多正类"和"少冤枉负类"之间交换；好的模型还要概率说得准（校准）。
- 边界：讲阈值移动、混淆矩阵四格、可靠性直觉；不讲 ROC/AUC 曲线族与 Platt scaling（登记 BACKLOG，等卷四评估课分工后回填）。
- 组件：`sigmoid-lab`（新，阈值拖柄主场）。
- 判题 exercise：固定分数 [0.9,0.8,0.6,0.3,0.2]、真实标签 [1,1,0,0,0] 在阈值 0.5 下报 TP 与准确率。目标输出 `2` / `0.8`。初始代码把 >= 写成 > 使 0.8 分错位输出不同计数。
- 必写误区：你以为阈值天生就是 0.5，其实它该跟着代价走；你以为准确率高就是好模型，其实类别不平衡时它会说谎；你以为概率输出不用检查，其实没校准的 0.9 经常兑现不了。

### 50 · L1、L2 正则化与稀疏性

- 文件：`50-regularization.md`
- 核心概念：在损失上加惩罚把参数往零拽；L2 圆润均匀缩小，L1 有棱角会把小系数直接压到零（稀疏）；λ 是"信数据还是信简单"的旋钮。
- 边界：讲岭回归一维闭式解、L1 角点几何（contour-map 上菱形撞等值线）、λ 扫描；不讲 LASSO 求解算法与贝叶斯解释。
- 组件：`reg-path`（新）+ `contour-map`（现有）。
- 判题 exercise：数据 x=[1,2,3]、y=[2,4,7]，比较无惩罚与 λ=1 岭回归的 w。目标输出 `2.21` / `2.07`（Σxy/Σx²=31/14≈2.21；31/(14+1)≈2.07，round 两位）。初始代码把 λ 加到分子上。
- 必写误区：你以为正则化是万能减误差药，其实它用偏差换方差；你以为 L1 只是更狠的 L2，其实棱角才是稀疏的全部来源；你以为 λ 越大模型越稳越好，其实拉满就把模型压成了常数。

### 60 · 核技巧与大间隔：从相似度到 SVM

- 文件：`60-kernel-margin.md`
- 核心概念：有些数据在原空间怎么画直线都分不开，升维后却一目了然；核技巧让你不付升维成本就拿到高维内积；SVM 找的是"离两边都最远"的那条分界线（最大间隔）。
- 边界：讲圆环套圆环的经典例子、K(x,x')=xx'+x²x'² 的手算、间隔几何直觉；不讲对偶/KKT/SMO（归第 43 章）与 Mercer 定理。
- 组件：`kernel-lift`（新）+ `pca-projection`（现有，方向性回扣）。
- 判题 exercise：手算 K(1,2) 并核对它等于 φ(1)·φ(2)。目标输出 `6` / `True`（1×2+1²×2²=6）。初始公式漏掉平方项输出 2 / False。
- 必写误区：你以为核是"映射函数"，其实它是相似度分数，根本不必写出映射；你以为升维一定增加计算量，其实核技巧绕开了坐标计算；你以为分界线离哪边近无所谓，其实间隔就是对未来数据的保险距离。

### 70 · 过拟合、欠拟合与验证集

- 文件：`70-overfitting-validation.md`
- 核心概念：模型能力不足欠拟合（两头都差），能力过剩过拟合（训练漂亮、考试翻车）；验证集是用来"选模型"的数据，它也必须和最终评价隔离。
- 边界：讲多项式阶数作为复杂度旋钮、训练/验证双误差曲线、参数量 vs 样本量的第一道红线；不讲偏差-方差分解公式证明（登记 BACKLOG；严格版第 41 章已建成，可参）。
- 组件：`complexity-curve`（新主场）。
- 判题 exercise：参数清点——三次多项式有几个参数？12 个样本会被多少阶的多项式完全穿透？目标输出 `4` / `11`（阶数 d 有 d+1 个参数；d+1=12 → d=11）。初始代码 d 或 d−1 数错。
- 必写误区：你以为训练误差降不下去就是过拟合，其实那是欠拟合；你以为验证集用得越多越可靠，其实反复按它调参就把它用旧了；你以为复杂度只看参数个数，其实它还包括搜索的力度。

### 80 · 交叉验证与分类指标

- 文件：`80-cv-metrics.md`
- 核心概念：k 折交叉验证让每个样本都轮流当一次考官，比单次切分更稳；准确率之外必须看精确率/召回率这对张力。
- 边界：讲 k 折流程与方差直觉、混淆矩阵衍生的精确率/召回率；不讲分层采样细节、嵌套 CV 与 F-β 家族（BACKLOG 登记）。
- 组件：`cv-folds`（新主场）+ 复用第 40 课混淆矩阵记号。
- 判题 exercise：TP=2、FP=1、FN=0 时算精确率与召回率。目标输出 `0.67` / `1.0`（precision=2/3≈0.67 round 两位；recall=2/2=1.0）。初始代码分母写反输出 1.0 / 0.67。
- 必写误区：你以为五折一定比两折好，其实折数越高单折训练集越小、折间相关越强；你以为精确率和召回率能同时拉满，其实阈值一动它们就在换手；你以为交叉验证能替代独立测试集，其实它选完模型后仍要一次终审。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | ml-math/from-data-to-model | prob/stats, functions/linear | 3 | hypothesis-class, empirical-risk |
| 18 | ml-math/regression-loss | ml-math/from-data-to-model, linalg-advanced/least-squares | 4 | squared-loss, gradient-step |
| 19 | ml-math/logistic-regression | ml-math/regression-loss, calculus/transcendental | 4 | sigmoid, log-likelihood, cross-entropy |
| 20 | ml-math/decision-threshold-calibration | ml-math/logistic-regression | 3 | decision-threshold, probability-calibration |
| 21 | ml-math/regularization | ml-math/regression-loss | 4 | l2-regularization, l1-regularization, sparsity |
| 22 | ml-math/kernel-margin | ml-math/decision-threshold-calibration, linalg/dot-product | 5 | kernel-trick, margin, support-vector |
| 23 | ml-math/overfitting-validation | ml-math/kernel-margin, prob/stats | 4 | overfitting, validation-set |
| 24 | ml-math/cv-metrics | ml-math/overfitting-validation | 3 | cross-validation, precision-recall |

补充约定：

- 所有 prereqs 已 grep 核实存在且排前（prob/stats=09 章、functions/linear=06 章、linalg-advanced/least-squares=50 章、calculus/transcendental=13 章、linalg/dot-product=11 章）；章内链严格递增。
- 不引入任何第三方库；只用 math/random/statistics/matplotlib 与手写循环。教学数据全部用字面量数组或固定 seed，保证判题确定性。
- applications 建议 10/20 填 machine-learning、50 填 model-selection、80 填 evaluation；exits 一律含 data-ai。

## 6. 整章验收清单

1. 五个新 renderer（sigmoid-lab / reg-path / kernel-lift / complexity-curve / cv-folds）注册进 `RENDERERS`，validate 可识别，亮暗主题可读，canvas 非空白，各至少一门课真实消费。
2. 固定教学数据集贯穿全章成立：任取两课对照，学生看到的是同一份点的不同镜头。
3. 每课一个判题 exercise：初始代码能运行但不通过；独立正确解法与 `@check` 逐行一致（本文件给出的目标输出均已实测核验）。
4. 每处提到 GD/Adam/SVM 对偶的地方都显式注明"完整版在第 43 章"，不得悄悄展开重复建设。
5. MDX 双坑体检：`\lbrace`/`\rbrace` 替代字面花括号；显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测三类块 + Alt+P 浮窗 + 路由切换无重复注入；360px 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`；ROC/AUC、嵌套 CV、偏差-方差分解等未立项项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
