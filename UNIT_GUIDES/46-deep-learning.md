# 第 46 章 · 深度学习基础 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 13 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：13 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 5 / layer L7 / track information-learning / stage university-core（index.md 已锁定；计算图/反向传播两课可按主题单课覆盖 layer L7 保持不变，校验器只查词表合法性）

## 1. 章定位

深度网络是复合非线性函数。本章只回答四个问题：信号怎么前传、梯度怎么回传、深层为什么练不动、哪些结构让深层练得动：

```text
神经元与激活 → MLP 万能逼近 → 计算图前向 → 反向传播 → 初始化与梯度尺度 → 归一化 → 残差连接 → 学习率与训练诊断
```

前四课搭起"前向 + 反向"的完整闭环（一个贯穿全章的 2-4-1 教学小网络），后四课逐个拆解深层训练的拦路虎（梯度消失/爆炸、分布漂移、退化路径、步长失配）。每课都要在同一个教学网络上推进，让"加一层结构"的效果可对比；不能写成架构史巡礼。

## 2. 前置覆盖

- 第 13 章 `calculus/chain` 是链式法则出生地；第 20 章 `multivariable/jacobian-chain` 已把链式升级到向量函数——第 40 课的反向传播引用它，不重推。
- 第 11 章 `linalg/dot-product` 与 `linalg/matrix` 提供线性层的全部代数；第 21 章矩阵视角可选回扣。
- 第 09 章 `prob/stats` 提供均值/方差语言；第 03 章 `exponents/sqrt` 的 math.sqrt 用于标准差。
- 第 45 章 `ml-math/regression-loss` 已建立损失与最简梯度步（含"完整版在第 43 章"口径）；本章第 80 课直接复用其十行循环并注明 GD 家族全貌在第 43 章（该章现已建成 12 门，原「占位骨架」为写作当时快照）。
- 第 45 章 `ml-math/logistic-regression` 已讲 sigmoid 与交叉熵；本章第 10 课把它当作激活函数家族一员复用，不重推似然。

## 3. 组件清单

新增 5 个定制组件（顶格），其余复用现有渲染器。

### 新增：neuron-carve（决策面雕刻器）

```viz
{ "type": "neuron-carve", "title": "两个 ReLU 掰弯世界", "hidden": 2 }
```

- spec 字段：`hidden`（隐层 ReLU 神经元个数 1–4）。
- 画布：二维平面被每个 ReLU 的铰链折痕切割，叠加输出层后显示分段线性决策面与两色区域。
- 交互：拖动各神经元的权重/偏置手柄看折痕移动；「+1 神经元」按钮增加折痕；预设"异或"按钮一键摆出经典难题。
- 动画：无自动动画，拖动即时重绘。
- 服务课：10（激活的非线性作用）、20（万能逼近直觉）。

### 新增：backprop-flow（梯度回流动画）

```viz
{ "type": "backprop-flow", "title": "误差怎么倒着流回去", }
```

- spec 字段：固定小图 x → z=wx+b → h=ReLU(z) → y=vh+c，无需外部参数。
- 画布：节点式计算图，每条正向边标当前数值、每条边下方留局部导数槽位。
- 交互：点击任一节点触发该点的局部梯度计算并沿反向边流动画传播至 x；「单步反传」「整图反传」按钮。
- 动画：有（脉冲沿反向边传播 + 数值填入）。
- 服务课：30（前向）、40（反向主场）。

### 新增：init-variance（方差传播实验台）

```viz
{ "type": "init-variance", "title": "信号穿过十层还剩多少", "depth": 10, "scheme": "he" }
```

- spec 字段：`depth`（层数滑块 2–20）、`scheme`（"zeros" | "naive" | "xavier" | "he"）。
- 画布：逐层激活标准差条形图；爆炸（红）与消失（蓝）阈值带；对称塌缩方案下所有条形同高并打「全体阵亡」标记。
- 交互：depth/scheme 即时切换；悬停读每层 std 数值。
- 动画：切换方案时条形平滑过渡。
- 服务课：50（主）。

### 新增：norm-lens（归一化透视镜）

```viz
{ "type": "norm-lens", "title": "把分布拉回正中央", }
```

- spec 字段：内置一批漂移的激活值样本，无需外部参数。
- 画布：激活直方图 + 均值/标准差双指针；开关 BatchNorm（按批统计）与 LayerNorm（按样本统计）观察指针归位。
- 交互：三个状态开关（原始/BN/LN）；「注入漂移」按钮给数据加偏移再看重归位。
- 动画：有（直方图重排 + 指针滑动）。
- 服务课：60（主）。

### 新增：residual-compare（残差高速路对比）

```viz
{ "type": "residual-compare", "title": "深栈 vs 残差栈", "depth": 16 }
```

- spec 字段：`depth`（层数滑块 2–32）。
- 画布：并排两条梯度模长随深度衰减曲线——普通深栈指数衰减 vs 残差栈保持 ≥1 平台；恒等通路高亮为金色高速公路。
- 交互：depth 滑块；「放大浅层/深层」视图切换；悬停读某层梯度模长。
- 动画：有（曲线随 depth 重绘的过渡）。
- 服务课：70（主）。

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `dotprod`（现有） | 加权和 = 点积的几何 | 10 |
| `matrix`（现有） | 线性层即矩阵变换 | 10/30 |
| `plot`（现有） | 激活函数族曲线、loss 曲线 | 10/80 |
| `gradient-probe`（现有） | 学习率在损失曲面上的步长手感 | 80 |
| `contour-map`（现有） | 二维参数损失等值线 | 80 |

## 4. 八门课题切分

### 10 · 神经元：加权求和与激活

- 文件：`10-neuron-activation.md`
- 核心概念：人工神经元 = 线性加权求和 + 非线性激活；没有激活函数，多层线性叠加仍是一条直线变换，网络深度毫无意义；ReLU/sigmoid/tanh 各有性格。
- 边界：讲单神经元几何、三种常见激活的对比；不讲激活函数搜索与 GELU/Swish 家族（BACKLOG 登记）。
- 组件：`dotprod` + `matrix` + `plot`（均现有）+ Python 手写 relu。
- 判题 exercise：实现 relu 并检验两个哨兵值。目标输出 `0` / `3.5`（relu(−2.5)=0、relu(3.5)=3.5）。初始代码忘记截断直接返回输入输出 −2.5 / 3.5。
- 必写误区：你以为层数越多表达力越强，其实全是线性层等于零层；你以为激活只是"加点弯曲"，其实它是网络能切分空间的唯一来源；你以为 sigmoid 处处更好，其实两端饱和会把梯度掐死（第 50 课回收此伏笔）。

### 20 · MLP 与万能逼近的几何直觉

- 文件：`20-mlp-universal.md`
- 核心概念：隐层的每个 ReLU 在输入空间折出一道铰痕，k 个神经元能拼出 k+1 段分段线性曲线；足够多的折痕可以贴合任何连续曲线（万能逼近的构造版直觉）。
- 边界：讲一维分段线性的构造过程与参数清点；不讲 Cybenko 定理证明与高维推广细节。
- 组件：`neuron-carve`（新主场）+ `plot`（现有）。
- 判题 exercise：清点参数——k=3 时最多几段线性？2→4→1 的 MLP 有多少参数？目标输出 `4` / `17`（k+1=4；(2×4+4)+(4×1+1)=17）。初始代码漏算偏置项输出 14。
- 必写误区：你以为万能逼近意味着随便练都能学到目标函数，其实它只保证存在、不保证找得到；你以为参数多一定更好，其实拟合能力与可训练性是两回事；你以为神经元越多越费算力不值，其实折痕复用极其高效。

### 30 · 计算图与前向传播

- 文件：`30-computation-graph.md`
- 核心概念：任何网络都是一张计算图；前向传播沿边求值并把中间结果存下来——它们是稍后反向计算的原料。
- 边界：讲小图 x→z→h→y 的手工前向、"存中间量"的意义；不讲自动微分框架实现与内存优化（归第 55 章）。
- 组件：`backprop-flow`（新，先只用前向模式）+ Python 手工前向。
- 判题 exercise：手算 x=1.0 过 w₁=2,b₁=−1,ReLU,w₂=3,b₂=0.5 的前向。目标输出 `1.0` / `3.5`（h=ReLU(1.0)=1.0、y=3×1.0+0.5=3.5）。初始代码 ReLU 放错位置输出不同值。
- 必写误区：你以为前向就是算个答案，其实同时是在给反向铺路；你以为中间量可以随手丢，其实丢一个就要重算一遍；你以为图越大越好懂，其实先把三节点小图走通才能上大图。

### 40 · 反向传播逐步推导

- 文件：`40-backpropagation.md`
- 核心概念：反向传播 = 链式法则在计算图上的调度；每个节点的梯度 = 上游梯度 × 本地梯度；一次反向扫描就能拿到所有参数的梯度。
- 边界：讲上述 2-4-1 小网络的完整手推与梯度数值检验；不讲向量化批量形式推导与框架实现（Jacobian 视角见 40 章 multivariable/jacobian-chain）。
- 组件：`backprop-flow`（新主场，反向模式）+ Python 手推对照。
- 判题 exercise：同一张图算 ∂y/∂v 与 ∂y/∂w₁。目标输出 `1.0` / `3.0`（∂y/∂v=h=1.0；∂y/∂w₁=v·ReLU′(z)·x=3.0）。初始代码链式顺序接错输出 6.0。
- 必写误区：你以为梯度是对"输出"求的，其实每个参数都有自己的专属梯度；你以为 ReLU 在折点处不可导就出事，实践里取次梯度即可；你以为反向很神秘，其实它只是把乘法按依赖顺序排好队。

### 50 · 初始化、对称性与梯度尺度

- 文件：`50-initialization.md`
- 核心概念：全零初始化让同一层神经元永久相同（对称性塌缩）；权重方差过大逐层爆炸、过小逐层消失；Xavier/He 用 fan-in 把每层方差拉回 1。
- 边界：讲对称性灾难、方差传播的 √fan_in 缩放、He 初始化的直觉推导；不讲谱初始化与初始化的理论最优性证明。
- 组件：`init-variance`（新主场）+ Python 固定 seed 方差实验。
- 判题 exercise：量化缩放——fan_in=100、单位方差权重下激活 std 放大多少？He 初始化的标准差是多少？目标输出 `10.0` / `0.1414`（√100=10.0；round(√(2/100),4)=0.1414）。初始代码把 He 公式写成 √(2×fan_in) 输出 14.1421。
- 必写误区：你以为初始化随便设就行反正会学出来，其实起点坏到梯度根本流不动；你以为全零最安全，其实它让整个隐层变成一个神经元；你以为方差大信号强是好事，其实层层相乘只会爆炸。

### 60 · 归一化：BatchNorm 与 LayerNorm

- 文件：`60-normalization.md`
- 核心概念：训练时激活分布会漂移，把每批（BatchNorm）或每个样本的特征向量（LayerNorm）重新拉回零均值单位方差，能让下游层始终面对稳定的输入刻度。
- 边界：讲两种归一化的统计方向差异、γ/β 缩放平移自由度；不讲内部协变量偏移的历史争论与 Running statistics 实现细节。
- 组件：`norm-lens`（新主场）。
- 判题 exercise：对 [1,2,3] 手算标准化后的第一个元素。目标输出 `-1.2247` / `True`（(1−2)/σ≈−1.2247 round 4 位；归一化后均值绝对值 <1e-12）。初始代码用极差除输出不同值。
- 必写误区：你以为归一化改变模型表达力，其实 γ/β 能原样还原恒等映射；你以为 BN 和 LN 只是名字不同，其实统计的方向（跨批 vs 跨特征）完全不同；你以为归一化只在输入端需要，其实深层中间才是重灾区。

### 70 · 残差连接与梯度高速公路

- 文件：`70-residual-streams.md`
- 核心概念：残差块让 y = x + f(x)：默认行为是恒等映射，层只需学"修正量"；反向时梯度沿 +1 直通路径无损回流，深栈不再退化。
- 边界：讲恒等默认与梯度直通的分解式推导（∂y/∂x = 1 + ∂f/∂x）；不讲 ResNet 架构变体谱系与投影捷径细节。
- 组件：`residual-compare`（新主场）。
- 判题 exercise：五层堆叠 f(x)=0.5x 的对比——纯连乘梯度多大？残差版总梯度多大？目标输出 `0.03125` / `1.03125`（0.5⁵；1+0.5⁵，二进制精确）。初始代码把加法写成乘法输出 0.0009765625。
- 必写误区：你以为残差是"更多参数更强"，其实它常常让信息走得更顺而非更远；你以为加深必然更优，普通深栈不加捷径反而会退化；你以为跳跃连接绕过了学习，其实它把学习任务改简单了。

### 80 · 学习率调度与训练诊断

- 文件：`80-training-diagnostics.md`
- 核心概念：loss 曲线是网络的体检报告——震荡说明步子太大、平台可能卡在坏区、缓慢下降说明步子太小；学习率随训练推进退火（step decay 直觉版）兼顾起步速度与收尾精度。
- 边界：讲二次损失上的 lr 手感、典型病态曲线图谱、阶梯衰减一个例子；不讲 warmup 理论、AdamW 与余弦调度的完整分析（GD 全家桶归第 43 章，明确标注）。
- 组件：`gradient-probe` + `contour-map`（均现有）+ matplotlib loss 曲线实验。
- 判题 exercise：(w−2)² 分别用 lr=1.1 与 lr=0.5 走十步。目标输出 `12.38` / `True`（lr=1.1 发散，|w−2|≈12.38 round 两位；lr=0.5 一步命中 w=2.0）。初始代码把两个 lr 写反输出交换值。
- 必写误区：你以为 loss 上升就是 bug，其实震荡型发散正是 lr 过大的签名；你以为训练越久一定越好，其实过拟合后验证 loss 会掉头向上；你以为调度是玄学装饰，其实它是"先冲后稳"的工程必然。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | deep-learning/neuron-activation | functions/machine, linalg/dot-product | 3 | artificial-neuron, activation-function |
| 18 | deep-learning/mlp-universal | deep-learning/neuron-activation, linalg/matrix | 4 | multi-layer-perceptron, piecewise-linear-approximation |
| 19 | deep-learning/computation-graph | deep-learning/mlp-universal, calculus/chain | 4 | computation-graph, forward-pass |
| 20 | deep-learning/backpropagation | deep-learning/computation-graph, multivariable/jacobian-chain | 5 | backpropagation, local-gradient |
| 21 | deep-learning/initialization | deep-learning/backpropagation, prob/stats | 4 | weight-initialization, vanishing-gradient, exploding-gradient |
| 22 | deep-learning/normalization | deep-learning/initialization | 4 | batch-normalization, layer-normalization |
| 23 | deep-learning/residual-streams | deep-learning/backpropagation | 4 | residual-connection, identity-shortcut |
| 24 | deep-learning/training-diagnostics | deep-learning/residual-streams, ml-math/regression-loss | 4 | learning-rate-schedule, training-diagnosis |

补充约定：

- 所有 prereqs 已 grep 核实存在且排前（functions/machine=06 章、linalg/*=11 章、calculus/chain=13 章、prob/stats=09 章、multivariable/jacobian-chain=第 20 章 30 课、ml-math/regression-loss=第 45 章，排在本章之前）；章内链严格递增。
- 不引入第三方库；只用 math/random/statistics/matplotlib 与手写循环。涉及随机初始化的实验一律固定 seed 保证判题确定性。
- applications 建议统一填 deep-learning；exits 一律含 data-ai，50/70 可加 engineering。

## 6. 整章验收清单

1. 五个新 renderer（neuron-carve / backprop-flow / init-variance / norm-lens / residual-compare）注册进 `RENDERERS`，validate 可识别，亮暗主题可读，canvas 非空白，各至少一门课真实消费。
2. 贯穿教学网络成立：30/40 两课的计算图数值一致，学生能在纸面上复核每一格。
3. 每课一个判题 exercise：初始代码能运行但不通过；独立正确解法与 `@check` 逐行一致（本文件给出的目标输出均已实测核验）。
4. 所有指向 GD 家族/优化器的承诺显式注明"完整版在第 43 章"；prereqs 只引用真实存在的 lesson_id（原注的 300/340 即现第 43/47 章，均已建成，可正常引用）。
5. MDX 双坑体检：`\lbrace`/`\rbrace` 替代字面花括号；显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测三类块 + Alt+P 浮窗 + 路由切换无重复注入；360px 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`；GELU 家族、warmup、自动微分实现等未立项项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
