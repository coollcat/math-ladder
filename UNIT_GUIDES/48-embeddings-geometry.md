# 第 48 章 · 表示与嵌入 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 9 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：9 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L11 / track information-learning + geometry-space / stage research-elective（章级 difficulty 4）

## 1. 章定位

嵌入把「意义」变成坐标：距离、夹角、方向都开始说话。本章沿一条主线推进：

```text
表示的目标 → 分布式语义词向量 → 余弦相似度与各向异性 → 对比学习拉近推远 → 最近邻检索 ANN → 潜在空间插值与算术 → 高维集中几何 → 流形假设与降维观察
```

每课都要同时回答两问：这个空间怎么学出来？在这个空间里怎么做事情（检索/插值/降维）？不能写成工具名词巡礼。

## 2. 前置覆盖

真实存在的前置课（已 grep 核实 lesson_id）：

- `linalg/dot-product`、`linalg/vectors`、`linalg/projection`：点积＝相似度、余弦＝归一化点积。
- `linalg-advanced/svd-low-rank`：各向异性＝奇异值高度集中。
- `linalg-advanced/pca-compression`：线性降维的基准做法。
- `multivariable/level-sets`：流形＝等值面直觉的地基。
- `transformer/token-tables`（第 47 章，更前）：查表向量的衔接起点——本章回答"这张表怎么学出来"。
- `prob/stats`、`prob/law`：均值方差与频率语言（集中几何模拟）。

占位骨架处置（**不得写进 prereqs**）——**口径更正**：以下各章现已建成正式课，可按实际 lesson_id 正常串 prereqs；下文保留当时的「自带最小版」策略备查：

- 第 40 章 information-theory 占位、第 45 章 ml-math 占位 → 「学习压力」（什么损失逼出好表示）在本章内用最小损失函数语言自带；KL 语言一律不用或仅直觉版并注明严格版见第 40 章。
- 高维正态分布严格版在第 36 章（已建成 14 门）→ 随机向量实验全部用 ±1 随机向量与均匀球面采样替代，不引用高斯公式。

## 3. 组件清单

index「计划交互形态」→ 组件映射：词向量方向罗盘→`cosine-compass`；对比学习吸引排斥动画→`contrast-pull`；ANN 分区检索演示→`ann-partition`；高维球壳集中实验→`highdim-shell`。

| renderer | 核心交互 | 服务课 | 状态 |
| --- | --- | --- | --- |
| `pca-projection` | 拖投影方向看方差/残差 | 10、80 | 现有 |
| `cosine-compass` | 两词向量的夹角罗盘与 cos 读数 | 20、30 | 新增 |
| `vecadd` | 向量加法平行四边形＝类比算术 | 20、60 | 现有 |
| `svd-stretch` | 奇异值集中＝各向异性 | 30 | 现有 |
| `dotprod` | 点积打分 | 30、40 | 现有 |
| `contrast-pull` | 正样本拉近、负样本推远的动画 | 40 | 新增 |
| `ann-partition` | 分区检索访问顺序演示 | 50 | 新增 |
| `interp-morph` | 潜在空间两点间插值游标 | 60 | 新增 |
| `highdim-shell` | 维度滑块下的距离/夹角直方图 | 70 | 新增 |

新增组件规格：

### cosine-compass

```json
{ "type": "cosine-compass", "title": "方向罗盘",
  "words": { "国王": [2, 1], "王后": [1.8, 1.4], "香蕉": [-1, 2] },
  "pick": ["国王", "王后"], "normalize": false }
```

画布：单位圆罗盘 + 两根词向量针 + 夹角弧。交互：下拉选两个词；开关 normalize（归一化后长度差消失，只剩角度）；读数显示点积、模长、余弦三栏。动画：无。

### contrast-pull

```json
{ "type": "contrast-pull", "title": "拉近正例推远负例",
  "anchor": [0, 0], "positive": [3, 1],
  "negatives": [[1, 3], [-1, 2]], "lr": 0.3, "margin": 1.0 }
```

画布：锚（黑）、正样本（绿）、负样本（红）散点与连线。交互：按钮「走一步对比更新」按当前梯度方向移动样本；滑块 lr 与 margin；按钮重置。动画：每次点击平滑位移约 300ms，可连点累积。

### ann-partition

```json
{ "type": "ann-partition", "title": "先分区再找邻居",
  "points": [[..]×20], "query": [5, 4], "leafSize": 4 }
```

画布：平面点集 + KD 式递归分割矩形。交互：拖动查询十字准星；滑块 leafSize；按钮「步进下一分区」依次高亮访问顺序，另一按钮切暴力扫描对比。读数：访问点数 vs 总点数、找到的最近邻是否一致。动画：步进闪烁为主，不做自动连播。

### interp-morph

```json
{ "type": "interp-morph", "title": "两个意思之间的路",
  "a": [1, 1], "b": [4, 3], "c": [1, 4],
  "labels": ["起点", "终点", "第三概念"] }
```

画布：二维潜在面板上 A/B/C 三点 + A→B 插值游标 + 中途"样例方块"随 t 变形（颜色/形状参数线性混合）。交互：拖 t 滑块或直接拖游标；按钮「A−B+C 平移」演示类比算术（整体平移到新点）。动画：t 自动往返播放开关。

### highdim-shell

```json
{ "type": "highdim-shell", "title": "高维都挤在壳上",
  "dim": 3, "samples": 400, "seed": 350 }
```

画布：左侧随机单位向量云（三维投到二维）；右侧「与固定参考向量的夹角」直方图。交互：维度滑块 2–500；按钮重新抽样（种子固定可复现）。读数：夹角中位数、90% 区间宽度随维度收窄。动画：直方图条形过渡 <200ms。

## 4. 八门课题切分

### 10 · 表示学习的目标：把意义放进坐标

- 文件：`10-representation-goal.md`
- 核心概念：好表示＝在相关度量下语义关系可计算；反面起点 one-hot：任意两词等距正交，毫无结构。
- 边界：讲目标与评价口径（最近邻、线性探针）；不讲具体训练算法（后面课讲）。
- 组件：浮窗算 one-hot 距离 + 复用 `pca-projection` 预告降维。
- 判题 exercise：三个 one-hot 词向量，写 dist2(a,b) 逐分量平方距离，初始代码忘平方。cat/dog 与 cat/fish 都输出 `2` / `2`——证明全等距无结构。@check 两行：`2` / `2`。
- 必写误区：one-hot 不是"坏向量"，是"没有学习压力的中性表示"；表示好坏依赖任务与度量，没有绝对最好的空间；嵌入维度大不等于信息多。

### 20 · 分布式语义与词向量

- 文件：`20-distributional-semantics.md`
- 核心概念：「看一个词的邻居就知道它」；共现统计压缩成稠密向量后，方向携带语义，向量算术能做类比。
- 边界：讲共现矩阵直觉与小规模手算类比；不讲 word2vec 的负采样推导细节。
- 组件：`cosine-compass` + `vecadd`。
- 判题 exercise：king=[1,1,0,1]、man=[1,0,0,0]、woman=[0,1,1,0]，逐分量 king−man+woman 输出 `[0, 2, 1, 1]`。初始代码把减法写成加法。@check 一行：`[0, 2, 1, 1]`。
- 必写误区：分布式假设是统计规律不是因果解释；类比算术在高频规则词对上才明显，不是万能语法；词向量里的"性别/时态"方向是事后发现，不是设计好的。

### 30 · 余弦相似度与各向异性

- 文件：`30-cosine-anisotropy.md`
- 核心概念：余弦＝夹角的尺度无关度量（归一化后点积）；各向异性＝所有向量挤进窄锥（奇异值集中），导致点积普遍偏高、区分度下降。
- 边界：讲余弦计算与锥形挤压的 SVD 图像；不讲温度校准的训练侧修复方案细节。
- 组件：`cosine-compass` + `svd-stretch`。
- 判题 exercise：u=[1,2]、v=[2,4]、w=[-1,2]，cosine(u,v)=`1.0`、cosine(u,w)=`0.6`（round 两位）。初始代码忘了开方。@check 两行：`1.0` / `0.6`。
- 必写误区：余弦忽略长度是有利也有害——模长本身可能携带信息；各向异性不是"向量太像"，是分布形状病态；点积相似度和余弦相似度在未归一化时不等价。

### 40 · 对比学习与 triplet 损失

- 文件：`40-contrastive-triplet.md`
- 核心概念：不定义"意义"，只定义拉力/推力：anchor 与 positive 靠近、与 negative 推开到 margin 之外；InfoNCE 是它的多负样本推广（直觉版）。
- 边界：讲三元组损失与 margin 的作用；不讲批内难例挖掘工程与 InfoNCE 温度推导。
- 组件：`contrast-pull` + `dotprod`。
- 判题 exercise：anchor=[0,0]、pos=[2,0]、neg=[2,1]、margin=2：d(a,p)=4、d(a,n)=5 → loss=`1`；换 neg=[10,0] 后被 margin 地板截断 → `0`。初始代码无 margin 无截断，输出 `-1` / `-96`。@check 两行：`1` / `0`。
- 必写误区：loss=0 不代表完美，只代表满足 margin 约束；负样本太容易会让模型学不到东西（难例才有梯度）；对比学习学出的是相对结构，坐标本身无绝对含义。

### 50 · 最近邻搜索与 ANN

- 文件：`50-nearest-neighbor-ann.md`
- 核心概念：暴力扫描 O(n) 不可扩展；ANN 用分而治之（分区树/图导航）牺牲一点点召回换几十倍速度；权衡曲线是核心账。
- 边界：讲 KD 分区直觉与召回率概念；不讲 HNSW 跳层实现与乘积量化编码。
- 组件：`ann-partition`。
- 判题 exercise：四点二维找 target=[4,2] 最近点下标 `2` 及该点 `[5, 1]`。初始代码比较方向反了且初值设超大数恒不更新。@check 两行：`2` / `[5, 1]`。
- 必写误区："近似"可能返回次优邻居——要盯召回率不是单次结果；索引结构对高维会退化（维度诅咒预告）；插入/删除频繁时静态索引需要重建。

### 55 缝隙备用：本课若超载，检索评测指标（recall@k）拆到 `55-recall-at-k.md`。

### 60 · 潜在空间插值与算术

- 文件：`60-latent-interpolation-arithmetic.md`
- 核心概念：线性插值 t·b+(1−t)a 在好空间里对应语义渐变；向量算术＝方向的语义组合；坏空间里直线穿越低密度区会产生怪异样本。
- 边界：讲线性插值与平移算术；不讲测地线插值与 Riemannian 度量。
- 组件：`interp-morph` + `vecadd`。
- 判题 exercise：a=[2,0]、b=[4,2]，lerp(a,b,t)=(1−t)a+tb：t=0.25 → `[2.5, 0.5]`；t=0.5 → `[3.0, 1.0]`。初始代码漏掉 (1−t) 端点项。@check 两行：`[2.5, 0.5]` / `[3.0, 1.0]`。
- 必写误区：插值路径是直线是数学选择不是"最自然路径"；两端点的凸组合不一定落在数据流形上；类比算术成立要求方向在空间里近似全局一致。

### 70 · 高维空间的集中几何

- 文件：`70-highdim-concentration.md`
- 核心概念：维度升高后，随机向量的夹角集中在 90° 附近、距离集中在壳层上——「最近」与「次近」差距缩小，这是维度诅咒的精确版。
- 边界：讲 ±1 随机向量点积的典型大小 √d 与集中现象；不讲 Levy 引理与测度集中证明。
- 组件：`highdim-shell`。
- 判题 exercise：dim=400，点积标准差 typical=sqrt(dim) → `20.0`；典型余弦 typical/dim → `0.05`。初始代码把典型大小猜成线性 dim*0.1。@check 两行：`20.0` / `0.05`。（蒙特卡洛验证放正文非判题块，种子固定。）
- 必写误区：高维下"几乎所有向量近乎正交"是概率陈述不是逐对事实；欧氏距离与余弦排序在高维可能给出不同答案；维度诅咒惩罚的是"区分度"，不是"距离会变大"。

### 80 · 流形假设与降维观察

- 文件：`80-manifold-reduction.md`
- 核心概念：高维数据常住在低维弯曲子结构（流形）上；PCA 只能抓线性骨架（回扣 50 章），弯曲结构要用保邻域的非线性方法；降维图上的距离不可过度解读。
- 边界：讲内在维数直觉与 PCA/t-SNE 定位；不讲 t-SNE/UMAP 算法实现与困惑度调参。
- 组件：复用 `pca-projection` + 浮窗 matplotlib 圆环采样实验。
- 判题 exercise：半径 5 的圆上取点 pts=[[5,0],[0,5],[-5,0],[0,-5]]，r=hypot 反推 → `5.0`；用角度 π/4 生成圆上点 round 三位 → `3.536 3.536`。初始代码 r 写成坐标求和。@check 两行：`5.0` / `3.536 3.536`。
- 必写误区：二维投影聚在一起不代表高维相近，反之亦然；流形假设是经验规律不是定理；PCA 的主成分是全局线性方向，抓不住环形/曲面结构。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | embeddings/representation-goal | transformer/token-tables, linalg/dot-product | 3 | representation-learning |
| 18 | embeddings/distributional-semantics | embeddings/representation-goal, prob/stats | 3 | distributional-hypothesis, word-vector |
| 19 | embeddings/cosine-anisotropy | embeddings/distributional-semantics, linalg-advanced/svd-low-rank | 4 | cosine-similarity, anisotropy |
| 20 | embeddings/contrastive-triplet | embeddings/cosine-anisotropy | 4 | contrastive-loss, triplet-loss |
| 21 | embeddings/nearest-neighbor-ann | embeddings/contrastive-triplet | 4 | approximate-nearest-neighbor, recall-rate |
| 22 | embeddings/latent-interpolation | embeddings/nearest-neighbor-ann, linalg/vectors | 3 | latent-space-interpolation |
| 23 | embeddings/highdim-concentration | embeddings/latent-interpolation, prob/law | 5 | concentration-of-measure-intuition |
| 24 | embeddings/manifold-reduction | embeddings/highdim-concentration, multivariable/level-sets, linalg-advanced/pca-compression | 4 | manifold-hypothesis, intrinsic-dimension |

工具登记口径：`math.sqrt/hypot/pi/cos/sin` 均已出生（exponents/sqrt、geometry/pythagoras、geometry/circle-pi、trig/unit-circle）；`abs/min/max` 已出生；matplotlib/random 出生于 python-tools。本章禁 numpy（第 53 章才出生），全部循环手写。若用到 `sorted`（非受管内置）无需登记但首现仍需中文注释。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别，每课至少一个定制组件真实消费。
2. 每课判题 exercise 初始代码能运行但结果不对；@check 与独立解法逐字一致（含空格与列表格式）。
3. prereqs 全部指向真实存在且更前的 lesson_id；不得出现 320/260/220（=现第 45/40/36 章，均已建成）内部 id。
4. MDX 双坑体检：`\lbrace`/`\rbrace`、显示公式单行、quiz 无 KaTeX。
5. `npm run validate` + `node scripts/gen-graph.mjs` + `npm run build` 全绿；h2 计数一致。
6. 浮窗实测：判题链、草稿保存、路由切换无重复注入；360px + dark 无溢出。
7. 结论写入 `CONTENT_AUDIT.md`；P2 项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
