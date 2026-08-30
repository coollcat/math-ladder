# 第 49 章 · 生成模型 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 11 门正式课已建成（磁盘多于本指导登记的 9 门课题，改名/拆并以磁盘为准）
> 目标：11 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L11 / track information-learning / stage research-elective（章级 difficulty 5；70/80/90 可单课加 probability-statistics 副支线）

## 1. 章定位

生成模型学的是数据的分布，不是标签。各家族是同一问题的不同回答方式：

```text
生成问题地图 → 自回归链式分解 → ELBO 天平（VAE）→ 重参数化闭环 → 可逆流与雅可比 → GAN 极小极大 → 扩散逐步去噪 → score 与朗之万采样 → 最优传输展望
```

每课必须先给「这个家族用什么量换什么量」的账本，再给公式；禁止五族并列名词轰炸。主线暗线：**所有方法都在回答「怎么把简单分布搬到数据分布」**。

## 2. 前置覆盖

真实存在的前置课（已 grep 核实 lesson_id）：

- `prob/law`、`prob/stats`：频率、期望、方差——采样实验的底座。
- `sequences/sigma`：连乘记号（自回归分解 p(x)=∏p(xₜ|x₋t)）。
- `calculus/chain`、`multivariable/jacobian-chain`：变量变换与雅可比。
- `multivariable/partial-gradient`、`multivariable/level-sets`：score＝对数密度梯度。
- `exponents/log`：对数似然语言。
- `linalg/vectors`：z 空间与 x 空间的坐标语言。

占位骨架处置（**不得写进 prereqs**）——**口径更正**：以下各章现已建成正式课，可按实际 lesson_id 正常串 prereqs；下文保留当时的「自带最小版」策略备查：

- 第 39 章 bayesian-stats 占位 → 贝叶斯更新（先验×似然→归一化）在 30 课内联两行最小版。
- 第 40 章 information-theory 占位 → 熵/KL/交叉熵只用直觉版（平均惊讶、非对称差异），正文注明严格版见第 40 章，**不建 prereq**；KL 的座位在第 40 章，本章不设独立 KL 课。
- 第 51 章 game-theory 在本章之后 → GAN 只自带「两个玩家互相拉扯」直觉与极小极大记号，注明形式化的 Nash 语言见第 51 章。
- 第 43 章 optimization 占位 → 训练即梯度下降只做一句话回顾。

## 3. 组件清单

index「计划交互形态」→ 组件映射：一维分布变形器→`dist-morpher`；ELBO 重构与 KL 天平→`elbo-balance`；可逆流轨迹追踪→`flow-trace`；扩散加噪去噪时间轴→`diffusion-timeline`。

| renderer | 核心交互 | 服务课 | 状态 |
| --- | --- | --- | --- |
| `statdots` | 数据点云与直方 | 10 | 现有 |
| `plot` | 密度曲线、损失曲线 | 10/30/40 | 现有 |
| `ar-chain-sampler` | 条件概率表逐格采样动画 | 20 | 新增 |
| `elbo-balance` | 重构-KL 天平 | 30 | 新增 |
| `flow-trace` | z↔x 双栏可逆映射轨迹 | 50 | 新增 |
| `jacobian-grid` | 网格拉伸压缩＝局部伸缩因子 | 50 | 现有 |
| `gradient-probe` | 沿梯度方向挪点＝朗之万雏形 | 60/80 | 现有 |
| `diffusion-timeline` | 加噪/去噪时间轴步进 | 70 | 新增 |
| `contour-map` | 二维密度等高线上爬坡 | 80 | 现有 |
| `dist-morpher` | 一维密度手柄拖拽变形 | 10/80/90 | 新增 |

新增组件规格：

### ar-chain-sampler

```json
{ "type": "ar-chain-sampler", "title": "一步步掷出序列",
  "states": ["晴", "雨"], "pFirst": [0.6, 0.4],
  "trans": [[0.8, 0.2], [0.4, 0.6]], "steps": 8 }
```

画布：时间轴格子链 + 当前步骤所用的条件概率双色条（累积分布）。交互：「采样下一步」按条落针；「手动选」模式下点击半格指定状态；重置按钮。动画：每步约 300ms 填格 + 落针下落。

### elbo-balance

```json
{ "type": "elbo-balance", "title": "重构与 KL 的拉锯",
  "klWeight": 1.0, "blur": 0.3 }
```

画布：天平——左盘平均重构误差、右盘 KL 代价，横梁倾角对应 −ELBO 大小；下方小窗显示当前"解码模糊度"。交互：滑块 blur（越模糊重构越差但 KL 越小）与 klWeight；读数三栏：重构项、KL 项、ELBO。动画：横梁弹性摆动后停稳。

### flow-trace

```json
{ "type": "flow-trace", "title": "可逆变换不丢信息",
  "layers": 2, "kind": "scale-shift" }
```

画布：上栏 z 空间标准网格，下栏 x 空间被逐层变换后的网格与密度色阶。交互：拖动 z 平面一点，x 平面像随动并画出轨迹；滑块层数 1–3 复合映射；读数：局部伸缩 |dy/dx| 与密度比。动画：拖动即时跟手，无独立播放。

### diffusion-timeline

```json
{ "type": "diffusion-timeline", "title": "加噪易，去噪难",
  "steps": 10, "beta": 0.15, "shape": "two-cluster" }
```

画布：一排小面板 t=0…T 展示一维双峰点云逐渐化成噪声。交互：滑块拖 t 观看任意时刻；按钮「正向一步」「反向一步」（反向用真实中心演示理想去噪）；读数：当前 t 的均值方差。动画：步进过渡 <250ms，不做自动连播。

### dist-morpher

```json
{ "type": "dist-morpher", "title": "捏一个分布",
  "handles": [ { "x": 0.25, "h": 1.0 }, { "x": 0.75, "h": 0.6 } ] }
```

画布：一维分段线性密度曲线 + 底部直方采样点 + 面积恒等于 1 的提示条。交互：拖 3–5 个手柄改变峰位/峰高；按钮「重新采样」。动画：无独立动画，即时重绘。90 课复用时叠加第二条目标曲线显示搬运方向箭头。

## 4. 九门课题切分

### 10 · 生成问题：判别、显式与隐式密度

- 文件：`10-generative-question.md`
- 核心概念：判别学 p(y|x)，生成学 p(x) 并能采样；「显式密度/隐式样本/得分」三种可学习对象的地图；采样＝在累积分布上落指针。
- 边界：讲问题定义与家族地图；不讲任何具体模型内部。
- 组件：`statdots` + `dist-morpher`。
- 判题 exercise：probs=[0.5,0.3,0.2]，sample_index(u) 在累积分布上返回面号：u=0.2→`0`，u=0.7→`1`，u=0.95→`2`。初始代码比较方向写反恒返回最后一面。@check 三行：`0` / `1` / `2`。
- 必写误区："能采样"和"有密度公式"是两种能力，很多模型只有其一；生成不是记忆回放——新样本要落在训练点之间；概率必须归一，直方图高度≠概率（组距要除）。

### 20 · 自回归模型：概率的链式分解

- 文件：`20-autoregressive-factorization.md`
- 核心概念：联合分布拆成条件连乘 p(x)=∏p(xₜ|x₋t)；每个条件都是一个小分类问题；顺序选择本身就是建模决定。
- 边界：讲链式法则分解与小条件表采样；不讲 Transformer 实现细节（那是 340）、不讲曝光偏差的修复方案。
- 组件：`ar-chain-sampler`。
- 判题 exercise：转移表 trans=[[0.8,0.2],[0.4,0.6]]、p_first=[0.6,0.4]，路径 [0,1,1] 连乘 → round 四位 `0.072`；路径 [1,0,1] → `0.032`。初始代码无条件用第一行转移。@check 两行：`0.072` / `0.032`。
- 必写误区：链式分解恒等成立，"自回归模型"特指用神经网络参数化每个条件；条件顺序不同联合不变，但学习难度大不相同；生成时错误会沿链条放大。

### 30 · VAE 之一：隐变量与 ELBO 天平

- 文件：`30-vae-elbo.md`
- 核心概念：引入隐变量 z 解释数据；真实对数似然算不了，改最大化下界 ELBO＝重构项−KL(q(z|x)‖p(z))（KL 直觉版，严格版见第 40 章）；天平两端此消彼长。
- 边界：讲 ELBO 结构与两项含义；不讲变推断的推导证明与后验坍缩理论（误区卡提及现象）。
- 组件：`elbo-balance` + `plot`（ELBO 随 blur 变化曲线）。
- 判题 exercise：true_x=4、recon=[3,5]、q=[0.9,0.1]、kl_penalty=0.5：加权绝对误差 err=`1.0`，简化 ELBO=-err-penalty=`-1.5`。初始代码忘 abs 得 -0.8 与 0.3。@check 两行：`1.0` / `-1.5`。
- 必写误区：ELBO 是下界不是近似值——差距就是 q 与真后验的 KL；重构项太强会把 z 用成查表码本（无泛化）；KL 项太强会 posterior collapse，解码器无视 z。

### 40 · VAE 之二：重参数化与训练闭环

- 文件：`40-reparameterization.md`
- 核心概念：把随机性移出计算图：z = μ + σ·ε，ε 是与参数无关的标准噪声，梯度得以流向 μ 和 σ；编码器-解码器闭环就此可训。
- 边界：讲高斯版重参数化与前向数值例；不讲一般分布的重参数化技巧族。
- 组件：`plot`（损失下降）+ 浮窗采样实验（固定 ε 改 μσ）。
- 判题 exercise：μ=2.0、σ=0.5、eps=[1.0,-1.0,2.0]，z=μ+σε 逐分量 → `[2.5, 1.5, 3.0]`。初始代码忘乘 σ。@check 一行：`[2.5, 1.5, 3.0]`。
- 必写误区：σ 必须 >0（实践中过 softplus/exp 保证）；重参数化不改变分布，只改变梯度的来路；ε 固定时才能公平比较两组参数。

### 50 · Normalizing Flow：可逆变换与雅可比行列式

- 文件：`50-normalizing-flow.md`
- 核心概念：一维变量替换 p_y(y)=p_x(x)·|dx/dy|：密度被局部伸缩倒数缩放；堆叠可逆层把简单分布揉成复杂分布，且似然始终可算。
- 边界：讲一维公式与两层复合数值例；不讲耦合层（RealNVP）构造与三角雅可比优化。
- 组件：`flow-trace` + 复用 `jacobian-grid`。
- 判题 exercise：f(x)=2x 把 [0,1] 均匀分布搬到 [0,2]：py(0.5)=`0.5`、py(1.5)=`0.5`、py(2.5)=`0.0`。初始代码忘除伸缩因子。@check 三行：`0.5` / `0.5` / `0.0`。
- 必写误区：可逆是硬约束——信息不许丢失；密度变大处必是网格被压缩处（伸缩<1）；复合时雅可比是连乘，一层爆炸全链爆炸。

### 60 · GAN：造假者与鉴伪者的拉锯

- 文件： `60-gan-minimax.md`
- 核心概念：生成器与判别器的极小极大博弈 min_G max_D；理想平衡＝生成分布等于真实分布、判别器处处 50%；不稳定训练与模式坍缩是现象不是 bug 传说。
- 边界：讲博弈结构与二维小例的 maximin 手算；不讲 Nash 形式化（第 51 章正式化）、不讲 WGAN 距离改进推导。
- 组件：`gradient-probe` + 浮窗 maximin 循环。
- 判题 exercise：payoff_G=[[3,1],[2,4]]（行=G 列=D，零和）：G 的保守收益 worst(g)=min 行内 → g=1 时 worst=`2` 最大，故 maximin 选择 pick=`1`。初始代码初值 999 忘初始化。@check 两行：`1` / `2`。
- 必写误区：GAN 训练目标不是损失下降而是找到均衡——loss 值本身几乎无意义；模式坍缩＝多个 z 映到同一批输出，多样性塌了；判别器太强会让生成器梯度失去方向。

### 70 · 扩散模型：逐步加噪与学会去噪

- 文件：`70-diffusion-denoising.md`
- 核心概念：正向过程是固定的随机加噪（数据→噪声），反向过程用网络学一小步去噪；生成＝从纯噪声迭代走回数据；「小步多走」让每步任务足够简单。
- 边界：讲前向调度与理想化反向直觉；不讲 DDPM 方差参数推导与采样器加速谱系。
- 组件：`diffusion-timeline`。
- 判题 exercise：data=10、x₀=0、α=0.4，迭代 x←x+α(data−x) 四步取 round 两位：`[4.0, 6.4, 7.84, 8.7]`。初始代码写成一步跳到 α·data 恒 4.0。@check 一行：`[4.0, 6.4, 7.84, 8.7]`。
- 必写误区：加噪是已知规则不用学，学的是反向；每步只删一点噪声——一次到位的去噪任务太难；调度（β 序列）决定噪声预算的时间分配。

### 80 · Score 与朗之万采样

- 文件：`80-score-langevin.md`
- 核心概念：score＝∇log p(x)，指向密度上升最快的方向；跟着 score 走＋适量抖动（Langevin）就能从噪声走到数据；扩散模型的去噪器本质是在估 score。
- 边界：讲高斯 score 公式与爬山数值例；不讲 sliced score matching 的估计器细节。
- 组件：复用 `contour-map` + `gradient-probe` + `dist-morpher`（造目标密度）。
- 判题 exercise：高斯 μ=0、var=1，从 x=3 出发步长 0.5，score=-(x−μ)/var 迭代三次 round 三位：`[1.5, 0.75, 0.375]`。初始代码符号写反越走越远。@check 一行：`[1.5, 0.75, 0.375]`。
- 必写误区：score 是向量场不是单点性质；纯爬坡只会停在最近一个峰，抖动负责跨谷探多峰；低密度区 score 估计最不可靠——这正是扩散要多级噪声的原因。

### 90 · 最优传输展望：把沙搬进坑

- 文件：`90-optimal-transport-outlook.md`
- 核心概念：OT 问「最省力的搬运方案」：单调配对是一维最优解；代价与 Wasserstein 距离直觉；与前几族的联系（另一种"分布对齐"答案）。
- 边界：讲一维单调传输与代价矩阵直觉；标注为展望课，不讲 Kantorovich 对偶与 Sinkhorn 迭代。
- 组件：`dist-morpher`（双曲线搬运箭头模式）。
- 判题 exercise：src=[1,2,9]、dst=[2,4,6] 排序后一一配对总搬运量 Σ|s−d| → `6`。初始代码忘 abs 得 0。@check 一行：`6`。
- 必写误区：贪心就近配对可以劣于全局排序配对（举反例）；OT 是方案层面的距离，不是逐点函数唯一确定；W 距离对"错一点点"的惩罚温和，与 KL 的非对称严苛形成对照。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | genmodels/generative-question | prob/law, sequences/sigma | 3 | explicit-density, implicit-generative-model |
| 18 | genmodels/autoregressive-factorization | genmodels/generative-question, calculus/chain | 4 | autoregressive-factorization |
| 19 | genmodels/vae-elbo | genmodels/autoregressive-factorization, exponents/log | 5 | latent-variable, evidence-lower-bound |
| 20 | genmodels/reparameterization | genmodels/vae-elbo, prob/stats | 4 | reparameterization-trick |
| 21 | genmodels/normalizing-flow | genmodels/reparameterization, multivariable/jacobian-chain | 5 | change-of-variables-density, normalizing-flow |
| 22 | genmodels/gan-minimax | genmodels/reparameterization | 4 | adversarial-minimax, mode-collapse |
| 23 | genmodels/diffusion-denoising | genmodels/generative-question, prob/law | 5 | forward-noising, denoising-process |
| 24 | genmodels/score-langevin | genmodels/diffusion-denoising, multivariable/partial-gradient | 5 | score-function, langevin-dynamics-intuition |
| 25 | genmodels/optimal-transport-outlook | genmodels/score-langevin, integrals/riemann | 3 | optimal-transport-outlook |

工具登记口径：`math.exp/log/sqrt/pi/cos/sin`、`sum/min/max/abs/round`、`random`+`matplotlib` 全部已出生（出生地见 §2 与既有课程），无需重复登记。禁 input()/while True；蒙特卡洛实验固定 random.seed 并展示种子；全部循环手写、禁 numpy。若 30 课用到字典存概率表，dict 属于 Python 基础语法，首现仍须中文注释。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；`dist-morpher` 至少被 10/80/90 三课消费。
2. 每课判题 exercise 初始代码能跑但结果不对；@check 与独立解法逐字一致。
3. 占位章处置合规：prereqs 无第 39/40/43 章内部 id（现三章均已建成，如需可回填）；熵/KL 直觉版注明第 40 章；GAN 注明第 51 章正式化。
4. MDX 双坑体检：显示公式单行（Attention/ELBO/change-of-variables 公式最长也要一行）；花括号 \lbrace\rbrace。
5. `npm run validate` + `node scripts/gen-graph.mjs` + `npm run build` 全绿；h2 计数一致。
6. 浮窗实测三类块 + 判题链 + 草稿保存；路由切换无重复注入；360px + dark 无溢出。
7. 结论写入 `CONTENT_AUDIT.md`；P2 登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
