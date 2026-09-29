# 79 · 第二轮知识点回填施工单（39 门）

> 依据 `KNOWLEDGE_COVERAGE_AUDIT_v2.md`（2026-09-28 审查）。第一轮已补 22 门 + 卷七 3 章（76–78），本单处理**剩余全部主干/分支级缺口**。
> 写入前必读：`LESSON_TEMPLATE.md`（模板）、`docs/03-exponents/45-exp-log-functions.md`（九段式范本）、`docs/61-digital-signal-processing/55-iir-design.md`（新补课范本）。
> **每一门课开工前，先读同章相邻的一门现有课**，照它的 front matter 取 `layer`/`track`/`stage`/`difficulty`，并照它的 viz 用法。

## 0. 硬性规则（validate 会把关，违反即构建失败）

1. front matter 必填：`title`、`lesson_id`（`章slug/课slug`，斜杠分隔，禁 `id`）、`prereqs`（必须指向**排在本课之前**的课）、`introduces_math`/`introduces_builtin`/`introduces_import`（没有新工具就写 `[]`）。
2. 章号 ≥ 18 的课（卷二起）追加：`volume`（1–7，按章定）、`layer`（L0–L11，查 `VISION.md` §3.1 选最贴切）、`track`（只从 8 条支线 id 里选：algebra-structure / analysis-change / discrete-computing / geometry-space / probability-statistics / information-learning / optimization-control / scientific-computing）、`stage`（primary-intuition / secondary-tool / university-core / research-elective）、`difficulty`（1–5 整数）。
3. 九段式：`## 1. 从一个场景开始` → `2. 直觉解释` → `3. 正式定义`（KaTeX + 符号逐一列表） → `4. 分步例题`（编号步骤） → `5. 动手实验` → 误区卡 `:::warning[常见误区]`（2–3 条"你以为…其实…"） → `7. 练习` → 选读证明 `<details><summary>选读 …</summary>` → `## 9. 下一站`（相对链接带 `.md`）。
4. 每课至少 **1 个 viz 或 lab 交互 + 1 个 python 块 + 1 个 exercise + 1 个 quiz**（quiz 密度要求：新课全部配）。
   - `viz` 围栏内是 JSON，`type` 必须取自下方白名单；滑块四项 `min/max/step/value` 都必须写且为数字，`min < max`；表达式里只能出现 `x y t u v n` 与滑块名。
   - `exercise` 必须有 `# @title:`、`# @check:`（至少一行，写期望输出的完整行）、`# @hint:`；初始代码能跑但结果错。
   - `quiz` 恰好一个选项末尾带 `[*]`，问题行**禁止 KaTeX 公式**（不要 `$`），解释行以单个 `? ` 开头。
5. Python：任何**首次出现**的语法/函数/参数必须有中文注释；禁用 `input()` 与 `while True`；只能用此前课程已引入的 `math.*` 与第三方库（不确定就把用到的函数写进 `introduces_math` 并在正文先讲一句来历）。
6. 单文件 ≤300 行。中文写作，术语按 `LESSON_TEMPLATE.md` §9 统一。
7. 写完**更新本课所属章的 `index.md`**：在课列表里按编号插入一行链接（格式照抄现有行），必要时同步章 `description`。
8. 自检：跑 `node scripts/validate.mjs`，**只负责修与自己新增文件相关的报错**（其他文件的报错是别的施工组正在写的，不要动）。

## 1. 可用交互资源（不要发明新的 viz 类型）

- **viz 通用**：`plot`（函数图像，支持 `expr/expr2/refline/sliders`）、`numberline`、`sines`（正弦叠加，`terms`）、`fit`（拖点拟合）、`datachart`、`counting`、`matrix`、`vecadd`、`dotprod`、`projection`、`eigen-direction`、`svd-stretch`、`pca-projection`、`least-squares-fit`、`slope-field`、`phase-portrait`、`markov-chain-lab`、`coordinate-transform`、`operation-table`、`truth-table`、`quantifier-hunt`、`set-mapper`、`relation-checker`、`proof-trail`、`graph-builder`、`degree-lab`、`dfa-runner`、`elimination`、`span-space`、`det-area`、`gradient-probe`、`jacobian-grid`、`hessian-curvature`、`completeness-ladder`、`epsilon-delta-probe`、`riemann-upper-lower`、`pde-probe`、`flux-box`、`boundary-lab`、`heat1d-lab`、`heat2d-paint`、`separation-mode`、`eigen-boundary`、`payoff-matrix`、`spline-editor`、`finite-field-inverse-grid`、`cyclic-generator`、`moe-router`、`conv2d-slide`、`ica-rotate`、`quadratic-form`、`condition-number`、`taylor`、`seriesbuild`、`orthoproduct`、`spectrum`、`fourier-gibbs-strict`
- **lab**（卷六/卷七专用，注册表 `registries/chNN.js`）：按章已有组件见 `src/pyrunner/lab/registries/`。**本轮回填不新增 lab 组件**，需要交互时优先 viz；viz 实在不合适就用 python 块 / matplotlib。
- 拿不准某个 viz 的入参，就去 `docs/` 里 grep 该 `"type"` 的现有用例照抄字段。

## 2. 课表明细

### G1 · 卷一（4 门，volume 1）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/00-python-tools/15-modeling-loop.md` | 数学建模五步：把现实问题翻译成算式 | `python-tools/conventions` | `datachart` + python | ① 提出问题→抽象变量→建关系→求解→检验回代 五步闭环；② 一个贯穿案例（排队时间/手机套餐/水池进出水）走完五步；③ 假设的合理性检验与量纲检查（单位对了答案才不会离谱）；④ 模型失效的信号 |
| `docs/03-exponents/35-power-function.md` | 幂函数族：指数固定，底数在动 | `exponents/fractional-exponent` | `plot`（expr `x^a`，滑杆 a） | ① y=x^a 与指数函数 a^x 的对偶关系（谁固定谁在动）；② a=1,2,3,-1,1/2 五条典型曲线同框；③ 定义域随 a 变化（奇偶分母）；④ 第一象限内比较大小（x∈(0,1) 与 x>1 两段结论相反） |
| `docs/04-algebra/05-sets-logic-language.md` | 集合与逻辑用语：数学的第一套语法 | `arithmetic/precedence` | `set-mapper` + `truth-table` | ① 集合的三要素、列举法与描述法、∈/⊆/⊇；② 交并补与韦恩图；③ 命题、充分/必要/充要条件；④ 全称量词与存在量词及否定；⑤ 与 18 章「数学语言与证明」的接口 |
| `docs/09-probability/07-sampling-methods.md` | 抽样：从总体里挑出代表 | `probability/data-charts` | `datachart` + python | ① 总体/样本/样本量；② 简单随机抽样、分层抽样、系统抽样的操作与适用场景；③ 抽样偏差（幸存者偏差、自选择、便利样本）；④ 用随机数表与 Python 做一次分层抽样 |

### G2 · 卷二 分析与计算（3 门，volume 2）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/22-ode-dynamics/85-sturm-liouville.md` | Sturm-Liouville：边值问题为什么只有离散答案 | `ode-dynamics/second-order-unified` | `eigen-boundary` + python | ① 从两端固定弦振动引出边值问题；② S-L 标准形 (py')' + qy + λwy = 0；③ 本征值与正交本征函数族；④ 边界条件如何"筛"出离散谱；⑤ 通往 23 章分离变量与 16 章傅里叶 |
| `docs/23-pde-intro/95-special-functions.md` | 特殊函数：Bessel 与 Legendre 从哪里冒出来 | `pde-intro/separation-of-variables` | `plot` + python | ① 圆域/球域分离变量后剩下的常微分方程；② Bessel 方程与 J_n 的零点（鼓膜的泛音不是整数倍）；③ Legendre 方程与多项式 P_n 的正交性；④ 正交多项式家族总表（Legendre/Chebyshev/Laguerre/Hermite）；⑤ 数值计算与绘图 |
| `docs/23-pde-intro/135-fem-1d.md` | 有限元入门：把连续切成小段再拼起来 | `pde-intro/finite-difference-heat` | python（画形函数与解曲线） | ① 弱形式与分部积分降阶；② 分段线性基函数（帽子函数）；③ 刚度矩阵与载荷向量的组装；④ 一维杆/热传导算例与差分法对比；⑤ 为什么工程界偏爱 FEM（复杂边界与材料） |

### G3 · 卷二 泛函与代数（3 门，volume 2）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/26-functional-analysis/87-arzela-ascoli.md` | Arzelà–Ascoli：函数族什么时候能抽出收敛子列 | `functional-analysis/compact-operators` | `uniform-convergence-zoom` + python | ① 一致有界 + 等度连续 → 存在一致收敛子列；② 与 Bolzano-Weierstrass 的类比；③ 反例：只在逐点有界不够；④ Stone–Weierstrass 逼近定理作为姊妹结论 |
| `docs/33-algebraic-structures/38-sylow.md` | Sylow 定理：有限群的骨架由素数幂决定 | `algebraic-structures/lagrange` | `operation-table` + python | ① 拉格朗日定理的逆命题为什么不对（A₄ 无反例之外的细节）；② 三条 Sylow 定理；③ 用 n_p ≡ 1 mod p 且 n_p | |G| 判结构（15 阶群必循环）；④ 分类小阶群的套路 |
| `docs/33-algebraic-structures/88-representation-intro.md` | 表示论初步：把群变成矩阵 | `algebraic-structures/permutation-groups` | `matrix` + python | ① 表示 = 群同态 ρ:G→GL(V)；② 置换表示与正则表示；③ 特征标 χ(g)=tr ρ(g) 的魔力（不可约分解、正交关系）；④ 例子：C₃、S₃、二面体群的不可约表示；⑤ 通往 59 章量子信息与 67 章范畴论 |

### G4 · 卷三/二 混合（3 门）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/44-numerical-analysis/78-eigen-algorithms.md` | 特征值的数值解法：幂法与 QR 迭代 | `numerical-analysis/spectral-radius-iterative` | `eigen-direction` + python | ① 幂法：主特征值与主方向怎么"长出来"；② 反幂法与位移策略（求最小特征值、加速）；③ QR 迭代的直觉与收敛；④ 收敛慢与重根的情形；⑤ 用 numpy 无关的纯 Python 实现验证 |
| `docs/28-combinatorics/57-catalan-stirling.md` | Catalan 数与 Stirling 数：两类会数数的数列 | `combinatorics/recurrence-characteristic` | `counting` + python | ① Catalan 数的五个同构模型（括号、二叉树、凸多边形三角剖分、Dyck 路径、栈序列）；② 递推与通项 C_n = 1/(n+1)·C(2n,n)；③ 第一/第二类 Stirling 数（分堆、排列成环）；④ 用生成函数一口气解出递推 |
| `docs/29-graph-theory/128-extremal-ramsey.md` | 极图与 Ramsey：最少多少边逼出团，最多多少点必同色 | `graph-theory/max-flow` | `graph-builder` + python | ① Turán 定理与完全多部图（无 K_{r+1} 的最大边数）；② Ramsey 数 R(3,3)=6 的两种证明（抽屉 + 归纳）；③ R(3,3)=6 的可视化（K₅ 二着色的反例）；④ 为什么 Ramsey 数几乎都未知 |

### G5 · 卷三 密码与编码（4 门）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/30-algorithms/70-string-algorithms.md` | 字符串算法：KMP 与 Trie 为什么能省时间 | `algorithms/binary-search-tree` | `dfa-runner` + python | ① 朴素匹配为什么退化到 O(nm)；② 前缀函数 π 与失配指针，KMP 的均摊 O(n+m)；③ Trie 的结构与自动补全；④ 用 Trie 做词频统计的 Python 实现 |
| `docs/32-computability/97-randomized-parameterized.md` | 随机化、计数与参数化：三张新的复杂度地图 | `computability/complexity-map` | `dfa-runner` + python | ① 随机算法与 RP/BPP/ZPP（蒙特卡洛 vs 拉斯维加斯）；② #P 与计数问题的难度（为什么"数解"比"判有无"难）；③ 参数化复杂度与 FPT（核化、有界搜索树）；④ 近似—随机—参数化三条突围路线总表 |
| `docs/34-cryptography/85-mpc-he.md` | 安全多方计算与同态加密：让密文自己算 | `cryptography/zero-knowledge` | python（简化的加法同态演示） | ① 秘密分享与安全两方求和；② 不经意传输与混淆电路的直觉；③ 全同态加密（FHE）的自举与噪声增长；④ 应用：隐私求交、联邦学习、加密数据库查询 |
| `docs/35-coding-theory/74-modern-codes.md` | Polar 码与 Turbo 码：靠迭代逼近香农极限 | `coding-theory/ldpc-preview` | `plot`（BER 曲线）+ python | ① Turbo 码的并行级联与迭代译码；② 极化现象与信道极化、Polar 码构造（5G 控制信道）；③ 三种现代码（Turbo/LDPC/Polar）对比；④ 译码复杂度与延迟的工程取舍 |

### G6 · 卷四 统计（4 门，volume 4）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/37-stochastic-processes/66-renewal-process.md` | 更新过程：事件反复发生时的节拍 | `stochastic-processes/poisson-process` | `plot` + python | ① 计数过程 N(t) 与更新函数 m(t)=E[N(t)]；② 更新定理（长期速率 = 1/平均间隔）；③ 更新报酬过程与年龄/剩余寿命悖论；④ 应用：零件更换、保修策略 |
| `docs/38-statistical-inference/75-nonparametric.md` | 非参数统计：不假设分布也能推断 | `statistical-inference/bootstrap-resampling` | `datachart` + python | ① 直方图 vs 核密度估计（带宽的作用）；② 秩检验（Wilcoxon、Mann-Whitney）替代 t 检验；③ 非参数回归（局部平均/LOESS）直觉；④ 什么时候该用非参数方法 |
| `docs/39-bayesian-stats/96-particle-filter.md` | 粒子滤波：用一群样本追一个会动的隐状态 | `bayesian-stats/gibbs-sampling` | `plot` + python | ① 序贯重要采样与权重退化；② 重采样（SIR）算法；③ 与卡尔曼滤波的分工（线性高斯 vs 一般情形）；④ 一维目标跟踪的完整 Python 实现 |
| `docs/45-ml-math/90-gaussian-process.md` | 高斯过程：给函数本身先验 | `ml-math/kernel-svm-margin` | `plot` + python | ① 从多元高斯到函数分布；② 核函数 = 协方差函数（RBF/Matérn）；③ 预测均值与后验方差（不确定性自带）；④ 与贝叶斯线性回归/岭回归的关系；⑤ 超参数与复杂度 O(n³) |

### G7 · 卷五 优化与信息（4 门，volume 5）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/43-optimization/93-conic-programming.md` | 锥规划与 Fenchel 对偶：凸优化的统一舞台 | `optimization/kkt-duality` | `plot` + python | ① 二阶锥与半正定锥；② SOCP/SDP 标准形与能表达的问题（鲁棒最小二乘、最大割松弛）；③ Fenchel 共轭与共轭对偶；④ 内点法求解的复杂度直觉 |
| `docs/43-optimization/98-bayesian-optimization.md` | 贝叶斯优化：只许试三十次怎么找最优 | `optimization/objective-feasible` | `plot` + python | ① 昂贵黑箱函数的处境；② 代理模型（GP）+ 采集函数（EI/UCB）；③ 探索与利用的量化；④ 超参数调优与实验设计中的实例 |
| `docs/47-transformer/95-decoding-strategies.md` | 解码策略：模型吐出概率之后怎么办 | `transformer/kv-cache-inference-cost` | python | ① 贪心、beam search 与长度偏置；② 采样：温度、top-k、top-p（核采样）；③ 重复惩罚与对比解码直觉；④ 温度与 top-p 的联合调参实验（用给定的概率表手工跑） |
| `docs/48-embeddings-geometry/35-ann-index.md` | 近似最近邻：十亿向量里毫秒级找邻居 | `embeddings-geometry/nearest-neighbor` | python | ① 精确检索的 O(nd) 瓶颈；② 倒排索引 IVF、乘积量化 PQ 与 HNSW 图索引；③ 召回率—延迟—内存三方权衡；④ 用给定数据集手工做一次量化误差分析 |

### G8 · 卷五 博弈与 RL（3 门，volume 5）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/50-reinforcement-learning/240-marl.md` | 多智能体强化学习：一群学习者互相改变环境 | `reinforcement-learning/method-map` | python | ① 环境非平稳性为什么让 Q-learning 失效；② 独立学习、集中训练分散执行（CTDE）；③ 合作/竞争/混合三种设定与信用分配；④ 多智能体博弈中的均衡概念 |
| `docs/51-game-theory/22-mixed-strategy.md` | 混合策略：把"随机"当成一种策略 | `game-theory/nash-equilibrium` | `payoff-matrix` + python | ① 纯策略不存在均衡时为什么随机反而稳定；② 期望收益的无差异条件与均衡求解（2×2 公式）；③ Nash 均衡存在性定理（不动点视角）；④ 猜拳/点球/审计博弈实例 |
| `docs/51-game-theory/45-cooperative-shapley.md` | 合作博弈与 Shapley 值：功劳该怎么分 | `game-theory/auction-mechanism` | python | ① 特征函数与联盟；② Shapley 值的四条公理与排列加权公式；③ 手工算三人三联盟的例子；④ 出口：特征归因（XAI）、数据估值、VCG 机制与拍卖 |

### G9 · 卷五 控制与量子（4 门，volume 5）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/52-control/65-pontryagin.md` | Pontryagin 极大值原理：最优控制的另一半地图 | `control/lqr-optimal-control` | `phase-portrait` + python | ① 从变分法到最优控制（控制约束的存在）；② 哈密顿函数与协态方程、横截条件；③ 与 LQR/HJB 的关系；④ 最速降线与最短时间控制两个算例 |
| `docs/52-control/90-nonlinear-adaptive.md` | 非线性与自适应控制：当线性化不够用 | `control/lyapunov-stability` | `phase-portrait` + python | ① 反馈线性化（精确线性化与相对阶）；② 滑模控制的切换面与抖振；③ 自适应律与参数估计（MRAC 直觉）；④ 三种方法适用边界对比 |
| `docs/59-quantum-information/83-qft-phase-estimation.md` | 量子傅里叶变换与相位估计：Shor 算法的引擎 | `quantum-information/grover-shor` | `matrix` + python | ① QFT 的定义与线路实现（Hadamard + 受控相位）；② 相位估计线路与精度 1/2ⁿ；③ Shor 分解 = 相位估计求阶；④ 经典 FFT 与 QFT 的复杂度对比 |
| `docs/59-quantum-information/87-quantum-error-correction.md` | 量子纠错：不能克隆怎么备份 | `quantum-information/quantum-information-theory` | python | ① 不可克隆定理与退相干的两难；② 三比特重复码与比特翻转/相位翻转；③ Shor 九比特码与稳定子码直觉；④ 表面码与容错阈值定理 |

### G10 · 卷六 电路与机电（3 门，volume 6）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/68-electronics/165-dc-dc-converter.md` | DC-DC 变换器：开关 + 储能如何改电压 | `electronics/power-regulator` | python（画电感电流波形） | ① 线性稳压的效率天花板；② Buck 降压的开关两态与伏秒平衡；③ Boost 升压与 CCM/DCM；④ 纹波、开关频率与效率权衡 |
| `docs/68-electronics/195-transmission-line.md` | 传输线：当导线比波长还长 | `electronics/impedance-phasor` | `plot` + python | ① 分布参数与特征阻抗 √(L/C)；② 反射系数、驻波比与匹配；③ 阻抗变换（λ/4 变换器）；④ S 参数与史密斯圆图直觉（RF 入口） |
| `docs/72-mechatronics/45-foc-control.md` | 磁场定向控制：把交流电机当直流电机开 | `mechatronics/bldc-commutation` | python（画电流环波形） | ① Clarke/Park 变换把三相搬到旋转坐标系；② d-q 轴电流解耦与双闭环（电流环 + 速度环）；③ SVPWM 与转子位置反馈；④ 与 BLDC 六步换向的对比 |

### G11 · 卷六 感知 + 两门跨章补丁（4 门）

| 路径 | 标题 | prereqs | 交互 | 内容要点 |
| --- | --- | --- | --- | --- |
| `docs/74-speech-audio/145-speech-enhancement.md` | 语音增强与说话人：从降噪到分离 | `speech-audio/masking-lab` | `spectrogram-lab`（lab）或 python | ① 谱减法的直觉与"音乐噪声"；② 维纳滤波与 MMSE 估计；③ 说话人特征（i-vector/x-vector）与声纹识别；④ 鸡尾酒会问题与多说话人分离（与 61-97 ICA 呼应） |
| `docs/75-image-video/145-video-codecs.md` | 现代视频编码：H.264 到 AV1 的共同套路 | `image-video/rate-distortion` | python（画 RD 曲线对比） | ① 块划分与可变块尺寸；② 帧内预测方向、运动补偿精度（1/4 像素）；③ 环内去块滤波与样点自适应偏移；④ 熵编码（CABAC）与三代的增益来源 |
| `docs/64-computer-graphics/35-computational-geometry.md` | 计算几何：凸包、Voronoi 与三角剖分 | `computer-graphics/cross-product-normals` | `plot` + python | ① 凸包与 Graham 扫描/分治；② Delaunay 三角剖分与空圆性质；③ Voronoi 图与最近邻查询；④ 出口：65 章可视图规划、48 章 ANN 检索 |
| `docs/66-stochastic-analysis/97-black-scholes.md` | Black–Scholes：Itô 引理最著名的出口 | `stochastic-analysis/ito-lemma-gbm` | `plot` + python | ① 复制组合与无套利；② 风险中性测度下贴现价格是鞅；③ BS 公式与希腊字母（Δ/Γ/Vega）的直观含义；④ 用蒙特卡洛与公式对算验证 |

## 3. 收尾

- 全部写完后由主控统一跑 `node scripts/validate.mjs`，再跑 `node scripts/gen-graph.mjs` 刷新图谱数据。
- 更新 `ROADMAP.md` 的章门数表与此轮回填记录。
- 重复知识点按 `KNOWLEDGE_COVERAGE_AUDIT_v2.md` §5 做「权威落点 + 交叉引用」处理，**不删除任何既有课**。
