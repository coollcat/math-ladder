# 第 47 章 · Transformer 数学 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 9 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：9 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L11 / track information-learning / stage research-elective（章级 difficulty 5）

## 1. 章定位

Transformer 的关键不是神秘架构，而是「两两打分、按分加权」。本章沿一条主线推进：

```text
token 查表成向量 → 排列不变性问题 → QKV 几何角色 → 缩放点积注意力与 softmax → 多头子空间分工 → 位置编码与 RoPE 旋转 → LayerNorm/残差/FFN 三件套 → KV cache 成本账
```

每课必须同时给出张量形状账和几何图像；不能把注意力写成公式默写课，也不能堆名词。

## 2. 前置覆盖

真实存在的前置课（已 grep 核实 lesson_id）：

- `linalg/dot-product`、`linalg/projection`、`linalg/matrix`、`linalg/basis`：打分＝点积、加权汇总＝投影组合、W_Q/W_K/W_V＝三个可学坐标系。
- `complex/polar`、`complex/multiplication`：RoPE 的旋转本质。
- `trig/wave-anatomy`：正弦位置编码的多频率波。
- `prob/stats`：均值方差语言（LayerNorm、缩放论证）。
- `sequences/sigma`：连乘记号（自回归视角）。
- `calculus/chain`：FFN 与反向传播选读段的链式语言。

占位骨架处置（**不得写进 prereqs**）——**口径更正**：以下各章现已建成正式课，可按实际 lesson_id 正常串 prereqs；下文保留当时的「自带最小版」策略备查：

- 第 46 章 deep-learning 为占位 → MLP/反向传播的最小版在 70 课以选读折叠块内联（两层加权和＋逐元素非线性＋"误差往回传"三句话版）。
- 第 40 章 information-theory 为占位 → softmax 只做「把分数压成概率」的直觉版；正文可提一句「信息论严格版见第 40 章」，但不建 prereqs。
- 第 43 章 optimization 为占位 → 「这些矩阵怎么被训练出来」只做定性说明。

## 3. 组件清单

index「计划交互形态」→ 组件映射：注意力权重热力图→`attention-heatmap`；QKV 向量投影实验→复用 `dotprod`+`projection`；多头注意力分流器→`multi-head-splitter`；位置编码波形比较器→`pe-wave-compare`。

| renderer | 核心交互 | 服务课 | 状态 |
| --- | --- | --- | --- |
| `token-embed-probe` | 点 token 高亮查表行向量 | 10 | 新增 |
| `shuffle-mean` | 拖换 token 顺序，看聚合输出变不变 | 20 | 新增 |
| `dotprod` | 两向量夹角与点积读数＝打分 | 30 | 现有 |
| `projection` | 向 v 投影＝按权重取内容 | 30 | 现有 |
| `attention-heatmap` | N×N 权重热力图，滑块调缩放/掩码 | 40（50 复用） | 新增 |
| `multi-head-splitter` | 同句双头热力图并排切换拼接 | 50 | 新增 |
| `sines` | 多频率正弦叠加＝位置编码波形 | 60 | 现有 |
| `complexmult` | 复数乘法旋转＝RoPE 相对位移 | 60 | 现有 |
| `statdots` | 一组分量数值的均值方差条 | 70 | 现有 |
| `plot` | O(n²) vs O(n) 增长曲线 | 80 | 现有 |

新增组件规格（kebab-case type，注册进 `viz.js` RENDERERS，带 dataset 守卫）：

### token-embed-probe

```json
{ "type": "token-embed-probe", "title": "查表就是取行",
  "tokens": ["猫", "狗", "鸟", "鱼"], "dim": 4, "seed": 340 }
```

画布：上方 token 按钮 + 下方 tokens×dim 色块矩阵。交互：点击/方向键选 token，高亮对应行并文本读出各维数值。动画：无，即时高亮。

### shuffle-mean

```json
{ "type": "shuffle-mean", "title": "平均看不见顺序",
  "tokens": ["我", "很", "爱", "你"], "values": [2, -1, 3, 1] }
```

画布：上排 token 卡片，下方两栏读数——「纯平均」「位置加权聚合」。交互：拖拽交换卡片位置；开关「带位置」。动画：交换时 CSS 平移过渡。验收点：关闭位置时任何排列读数相同。

### attention-heatmap

```json
{ "type": "attention-heatmap", "title": "谁在看谁",
  "tokens": ["小猫", "追", "老鼠"],
  "q": [[1,0],[0,1],[1,1]], "k": [[1,1],[0,1],[1,0]],
  "scale": 1.0, "maskFuture": false }
```

画布：N×N 权重方格热力图 + 行列标签。交互：滑块调 scale（softmax 温度），开关因果掩码；悬停格子文本读数。动画：数值变化时颜色渐变（<200ms）。scale 必须同时改读数与颜色。

### multi-head-splitter

```json
{ "type": "multi-head-splitter", "title": "两个头各自看什么",
  "tokens": ["它", "把", "苹果", "吃", "了"],
  "heads": [
    { "name": "指代头", "weights": [[..]] },
    { "name": "动宾头", "weights": [[..]] }
  ] }
```

画布：同一句的两套热力图并排 + 底部合并输出条。交互：按钮「只看头1／头2／拼接／平均」；滑块调单头强度。动画：切换淡入。weights 数组长度必须等于 tokens²，非法时报错文案。

### pe-wave-compare

```json
{ "type": "pe-wave-compare", "title": "每个维度一种频率",
  "dims": [ { "freq": 1.0 }, { "freq": 0.5 } ],
  "positions": 32, "mode": "sinusoidal" }
```

画布：横轴为位置 m，画所选维度对的 sin/cos 波形 + 当前位置游标竖线 + 读数向量。交互：滑块选维度对与位置 m；按钮切 RoPE 模式（纵轴换成角度 mθ 标注）；「自动播放」让游标匀速扫过（可停）。动画：仅游标移动，波形静态。

## 4. 八门课题切分

### 10 · 分词与查表：token 怎么变成向量

- 文件：`10-token-tables.md`
- 核心概念：tokenization 把文本切成离散单元；嵌入查表＝one-hot 乘矩阵取行。
- 边界：讲 BPE 直觉（常见整词、罕见拆子词）与查表的矩阵语义；不讲词表训练算法与嵌入的训练（那是 350）。
- 组件：`token-embed-probe` + 浮窗打印向量。
- 判题 exercise：给定平行数组 words/vecs 写 embed(word)，初始代码恒返回第一行。正确输出 `print(embed("狗"))` → `[0, 1]`；`print(len(vecs[2]))` → `2`。@check 两行：`[0, 1]` / `2`。
- 必写误区：token 不是"单词"的同义词（可能是子词/字符）；查表没有"理解"，只是取行；不同 token 的向量维度相同但内容无关，直到被训练调整。

### 20 · 排列不变性：为什么平均会丢顺序

- 文件：`20-permutation-invariance.md`
- 核心概念：对所有 token 做同一个聚合（如平均）后输出与输入顺序无关——序列信息丢失；位置必须显式进入计算。
- 边界：讲置换不变/等变的直觉与小数值例；不讲群论正式定义。
- 组件：`shuffle-mean`。
- 判题 exercise：scores=[3,1,2] 与 [1,2,3]，mean 两栏都输出 `2.0`；位置加权和分别输出 `5` 与 `8`。初始代码把加权和写成普通和。@check 四行：`2.0` / `2.0` / `5` / `8`。
- 必写误区："不变"是性质不是缺陷描述——集合问题里它反而是优点；加位置信息≠把下标当数值直接加进向量（要设计编码方案）；词袋模型是排列不变的极端例子。

### 30 · QKV：查询、键与值的几何

- 文件：`30-qkv-geometry.md`
- 核心概念：每个位置拿 Q 去"提问"、K 当"标签"、V 装"内容"；打分＝Q·K 点积（回扣 `linalg/dot-product`），汇总＝按分数加权 V（回扣 `linalg/projection`）；三个 W 矩阵是三个可学的基变换。
- 边界：讲 2 维手算例与几何角色；不讲这些矩阵如何被梯度学出（选读段定性提反向传播）。
- 组件：`dotprod` + `projection`。
- 判题 exercise：q=[1,2]，keys=[[2,0],[0,2],[1,1]]，手写双重循环求点积列表并取出最高分的 key。初始代码漏乘 k 分量。@check 两行：`[2, 4, 3]` / `[0, 2]`。
- 必写误区：Q/K/V 不是三种"数据"，是同一条向量的三次不同投影；打分高的 key 不一定贡献大（还要看 V 和归一化）；注意力不是检索数据库——key/value 都参与训练。

### 40 · 缩放点积注意力与 softmax

- 文件：`40-scaled-dot-product.md`
- 核心概念：完整公式 Attention(Q,K,V)=softmax(QKᵀ/√d)V 单行给出；√d 缩放的方差论证（维度越大点积越散→softmax 饱和）；手写 softmax 循环（减最大值防 exp 溢出是必写工程要点）。
- 边界：讲缩放的模拟验证与 softmax 数值习惯；不讲 log-sum-exp 的推导细节、不讲注意力变体。
- 组件：`attention-heatmap`。
- 判题 exercise：scores=[2,1,0]，softmax 后 `[round(p,3)]` 输出 `[0.665, 0.245, 0.09]`，概率和 round 两位 `1.0`。初始代码忘除 total。@check 两行：`[0.665, 0.245, 0.09]` / `1.0`。
- 必写误区：softmax 不是"归一化函数"那么平淡——指数放大差距，温度能锐化/抹平；不减最大值在大分数下会溢出（浮窗里就能复现 OverflowError）；除 √d 改变的是分布形状，不只是数值尺度。

### 50 · 多头注意力的子空间分工

- 文件：`50-multi-head-subspaces.md`
- 核心概念：多头＝并行多组 QKV 小投影，各头在低维子空间捕捉不同关系（指代/修饰/位置…），concat 后再线性混合。
- 边界：讲 2 头小例与子空间直觉；不讲头剪枝、张量并行等工程话题。
- 组件：`multi-head-splitter` + 复用 `attention-heatmap`。
- 判题 exercise：head1=[2,4]、head2=[0,6]，逐分量平均合并 merge(a,b)，初始代码丢掉 b。@check 一行：`[1.0, 5.0]`。
- 必写误区：多头不是"多算几遍更准"，而是不同关系解耦；头的输出维度 = d_model/头数（总账守恒）；concat 之后必须有再混合的 W_O，否则各头互不相认。

### 60 · 位置编码与旋转外推（RoPE）

- 文件：`60-positional-rope.md`
- 核心概念：正弦编码＝给每个维度配不同频率的波（回扣 `trig/wave-anatomy`）；RoPE＝把 q/k 对当作复数按位置角度旋转（回扣 `complex/polar`、`complex/multiplication`），点积只依赖相对距离 m−n。
- 边界：讲绝对正弦编码与二维 RoPE 旋转直觉；不讲 ALiBi、长度外推技术综述。
- 组件：`sines` + `complexmult` + `pe-wave-compare`。
- 判题 exercise：theta=0.1，rot(v,m) 用 cos/sin 构造旋转，q=k=[1,0]。`round(dot(rot(q,3),rot(k,1)),3)` 与 `round(dot(rot(q,5),rot(k,3)),3)` 都是相对距离 2 → `0.98` / `0.98`。初始代码旋转公式少一项符号。@check 两行：`0.98` / `0.98`。
- 必写误区：位置编码加在输入上（正弦）与作用在注意力里（RoPE）是两种挂载点；相对位置性质来自旋转的角度差，不是来自 sin 本身；cos(0.2)≈0.98 说明远处 token 的打分仍可能接近——外推性要靠频率谱设计。

### 70 · LayerNorm、残差与前馈层

- 文件：`70-layernorm-residual-ffn.md`
- 核心概念：LayerNorm 把单个 token 向量拉回零均值单位方差再做仿射（回扣 `prob/stats`）；残差＝默认直通、层只学修正量 x+f(x)；FFN＝逐 token 独立的两层加权和＋非线性。
- 边界：讲单向量 LayerNorm 手算与残差直觉；不讲 BatchNorm 对比与训练动力学；MLP/反向传播最小版放选读折叠块（第 46 章，见 §2；原「330 占位」为写作当时口径）。
- 组件：`statdots` + 浮窗 matplotlib 前后对比散点。
- 判题 exercise：layer_norm([1,2,3]) 总体方差、eps=1e-8：归一化后 `[round(x,3)]` → `[-1.225, 0.0, 1.225]`；std round 三位 → `0.816`。初始代码忘了除 std。@check 两行：`[-1.225, 0.0, 1.225]` / `0.816`。
- 必写误区：LayerNorm 沿特征维而不是沿 batch/序列维统计；残差的"恒等"指默认通路，不是输出恒等；FFN 对每个位置独立作用，位置间不交流。

### 80 · KV cache 与推理成本

- 文件：`80-kv-cache-cost.md`
- 核心概念：自回归生成天然逐 token 因果；缓存历史 K/V 后每步只需新 q 对全部历史 k 打分，每步成本从 O(t²) 降到 O(t)，代价是缓存随序列线性增长（GQA/MQA 提一句即可）。
- 边界：讲因果掩码下的增量计算与计数账；不讲量化、投机解码等推理工程谱系。
- 组件：`plot`（n² 与 n 曲线叠加）+ 浮窗计步实验。
- 判题 exercise：n=5，无缓存每步重算 t×t 打分 Σt²=`55`，有缓存每步 t 次 Σt=`15`。初始代码两处都累加 t。@check 两行：`55` / `15`。
- 必写误区：KV cache 省的是计算不是内存——显存反而涨；缓存有效的前提是因果掩码（未来不影响过去）；"快了"不等于"便宜了"，长序列的成本大头会转移到访存。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | transformer/token-tables | linalg/vectors, linalg/matrix | 3 | tokenization, embedding-lookup |
| 18 | transformer/permutation-invariance | transformer/token-tables | 4 | permutation-invariance |
| 19 | transformer/qkv-geometry | transformer/permutation-invariance, linalg/dot-product, linalg/projection | 4 | query-key-value |
| 20 | transformer/scaled-dot-product | transformer/qkv-geometry, prob/stats | 5 | scaled-dot-product-attention, softmax |
| 21 | transformer/multi-head | transformer/scaled-dot-product, linalg/basis | 4 | multi-head-attention |
| 22 | transformer/positional-rope | transformer/multi-head, complex/polar, trig/wave-anatomy | 5 | positional-encoding, rope-rotation |
| 23 | transformer/layernorm-residual | transformer/scaled-dot-product, prob/stats | 4 | layer-normalization, residual-connection |
| 24 | transformer/kv-cache | transformer/layernorm-residual, sequences/sigma | 4 | kv-cache, causal-mask |

工具登记口径：`math.exp`（complex/euler）、`math.sqrt`（exponents/sqrt）、`math.cos/sin/pi`（trig/unit-circle 等）、`sum`（python-tools/conventions）、`random`+`matplotlib`（python-tools/matplotlib）、`abs/min/max`（functions/machine 与更早课）均已出生，**无需重复登记**；若正文用到未列出生地的语法，按首现注释规范当场登记。禁 input()/while True；所有注意力计算手写循环，不用 numpy（numpy 到第 53 章才出生）。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；`attention-heatmap` 在 40/50 两课真实消费。
2. 每课至少一个定制可视化 + 一个浮窗实验；判题 exercise 初始代码能跑但不过，独立解法与 @check 逐行一致。
3. prereqs 全部指向真实存在的更前课程（§5 表），不得出现 330 内部、260、300 的假 id。
4. 显示公式一律单行；花括号用 \lbrace\rbrace；quiz 无 KaTeX。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；h2 计数体检通过。
6. 浏览器实测三类交互块 + Alt+P 浮窗 + 路由切换无重复注入；360px + dark 无溢出。
7. 报告结论合并进 `CONTENT_AUDIT.md`；非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
