# 第 52 章 · 控制与反馈 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 8 门正式课已建成（10/20/30/40/50/60/70/80）；规划名与落盘名有出入，以磁盘为准
> 目标：8 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L9 / track optimization-control / stage research-elective / difficulty 3–5（index.md 已锁定）

## 1. 章定位

控制是把「会变化的系统」变成「听指挥的系统」的数学。本章沿现代控制的主线推进：

```text
反馈思想 → 状态空间 → 极点与稳定 → 可控可观 → Lyapunov 证书 → LQR 最优 → PID 实战 → 扰动与鲁棒
```

前三课搭好语言（误差驱动、状态向量、特征值定生死），中间三课给出现代控制的两大问（能不能控住？凭什么说稳？）与最优答案（LQR），最后两课回到工程最常用的 PID 与扰动现实收束。

**与第 60 章（已完成正式课）的边界，必须逐课自查**：

- 第 60 章讲**工程系统思想**：黑箱输入输出、观测与诊断的组织叙事、频域工具（Bode/Nyquist/灵敏度函数）、大系统分层。本章（第 52 章）讲**现代状态空间数学**：状态方程、可控可观判据、Lyapunov/LQR 的推导与直觉。
- 本章**全程不做频域**：不出现 Bode 图、Nyquist 曲线、灵敏度函数 $S(s)$；鲁棒性只在时域讲「扰动压缩比与裕度直觉」，正文一句话互链 `engineering-cybernetics/frequency-response-bode` 与 `engineering-cybernetics/robust-control-tradeoff` 作为延伸站（只能出现在「下一站」/选读，不得写进 prereqs——第 60 章排在本章之后，validate 会拦截）。
- 第 60 章的 `state-observation-disturbance` 是工程叙事版；本章第 20 课给出正式状态空间方程，不引用对方为前置，读者从任一章进来都应能自洽。
- 第 60 章生产报告明确要求：「若扩展第 52 章，先建立正式 PID/LQR 课程，再与第 60 章互链」——本章交付即兑现该承诺。

## 2. 前置覆盖

以下 prereqs 已逐一 grep 核实存在且排前：

- `functions/linear`（06 章）：一次函数语言，反馈误差放大的最小地基。
- `linalg/matrix`、`linalg/vectors`（11 章）：矩阵乘向量即变换。
- `linalg-advanced/eigenvalues`、`linalg-advanced/rank-nullspace`（50 章）：特征值与秩判据直接使用，**不再重教计算**。
- `multivariable/partial-gradient`（40 章）：Lyapunov 课求 $V$ 的梯度用。
- `ode/equilibrium-stability`、`ode/phase-portraits`、`ode/vibration-resonance`（60 章）：平衡点稳定性、相平面、二阶振动直觉全部现成，本章升级为「反馈改变它们」。
- `sequences/sigma`（08 章）：PID 积分项 = 累加器，$\Sigma$ 语言现成。

**口径更正**：第 43 章（优化）与第 44 章（数值分析）均已建成（12/10 门），可按实际 lesson_id 正常串 prereqs；原「300/310 只有 index 骨架、任何课不得 prereq 指向其内部」为写作当时快照。LQR 仍只做标量/2×2 解析解，注明「一般维度的数值 Riccati 与优化算法见第 44/43 章」；RL 视角一句话互链 `rl/bellman-optimality`（真实课，可正文引用不可当 prereq 滥用）。

Python 方面：全章只用已登记的 `math` / `random` / `statistics` / matplotlib，**禁 numpy**（Pyodide 约束且本章排在第 53 章引入 numpy 之前）；矩阵运算一律手写双重循环，规模 ≤2×2，浮窗秒回。

## 3. 组件清单（新增 5 个定制渲染器）

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `feedback-loop` | 开环 vs 闭环双轨对比，注扰按钮看闭环回血 | 10（主）、80 回扣 |
| `pole-mover` | 拉增益滑块看闭环极点在复平面迁徙 + 响应联动 | 30（主）、20 回扣 |
| `reachability-map` | 逐次施力看可达域层层扩张、缺秩红灯 | 40（主） |
| `pid-lab` | Kp/Ki/Kd 三旋钮 + 场景库 + 抗扰实验 | 50（主）、70 回扣 |
| `lqr-tradeoff` | Q/R 权衡曲面联动 K、极点与响应双面板 | 60（主）、70 对比 |

### 可实现规格

**feedback-loop**
- spec 字段：`{ "type": "feedback-loop", "title": "...", "kp": 9, "disturbance": 5 }`；`kp` 滑块 0–20、`disturbance` 滑块 −10..10；另有内置「增益漂移」模式（实际增益 g 滑块 0.5–1.5）。
- 画布：上方目标线 $r$ 与两条稳态水平线（开环灰虚线、闭环实色线）；下方三根柱（目标/开环/闭环）+ 误差读数。「注入扰动」按钮触发一段过渡过程动画：开环跳上新台阶不动，闭环弹起后指数回落。
- 动画：有（过渡过程曲线，复用 `addAnimationControls`，离屏暂停，`prefers-reduced-motion` 出静态终态）。

**pole-mover**
- spec 字段：`{ "type": "pole-mover", "title": "...", "preset": "inverted-pendulum", "k": 2 }`；preset：`"spring-damper"` / `"double-integrator"` / `"inverted-pendulum"`，各自固定 A、B 与单参数反馈律 $u=-k \cdot x_1$；`k` 滑块范围按 preset 定（约 0–6）。
- 画布左：复平面，左半平面铺绿色安全罩；开环极点画灰 ×，闭环极点画橙 ×，随 k 拖动迁徙并留尾迹；闯入右半平面立即亮红色「不稳定」横幅。画布右：对应闭环阶跃响应实时重画。
- 交互：k 滑块 + preset 下拉；可选播放键自动扫 k（尊重 reduced-motion）。

**reachability-map**
- spec 字段：`{ "type": "reachability-map", "title": "...", "preset": "car", "steps": 2 }`；preset：`"car"`（可控）/ `"stuck-satellite"`（B 方向受限的不可控例）；`steps` 滑块 1–3。
- 画布：以 $B, AB, A^2B$ 为列向量逐层张出的可达区域阴影；「施加一次推力」按钮动画叠加下一层并画出新增箭头；右上判定灯（秩满=绿 / 缺秩=红）+ 一句缺口方向提示。可观性对偶在课文中用同一张图的镜像叙事说明，组件不加第二个面板。
- 动画：有（层叠扩张补间）。

**pid-lab**
- spec 字段：`{ "type": "pid-lab", "title": "...", "scene": "cruise", "kp": 4, "ki": 0, "kd": 0 }`；scene：`"cruise"`（一阶惯性）/ `"heater"`（大滞后）/ `"pendulum-angle"`（摆角）；三旋钮滑块范围 0–10（步长 0.1）。
- 画布：设定值阶梯线 + 响应曲线；读数区显示超调 %、稳态误差、调节时间（±2% 带宽）。「注入负载扰动」按钮在中途叠加阶跃扰动看恢复过程。控制器离散化用固定步长欧拉（JS 内实现，dt=0.02，仿真 ≤4000 步保证流畅）。
- 动画：响应曲线生长动画（默认开、可关）。

**lqr-tradeoff**
- spec 字段：`{ "type": "lqr-tradeoff", "title": "...", "preset": "double-integrator", "q": 1, "r": 1 }`；`q`、`r` 对数滑块 0.1–10；preset 同 pole-mover 家族（标量或 2×2 保证解析可解）。
- 画布左：一族初值的闭环状态衰减轨迹；右：对应控制量消耗 $\lvert u\rvert(t)$ 曲线；顶部长驻读数 K、闭环极点；底部一条「省力 ↔ 快速」权衡轴，当前 (q,r) 映射为上面的游标点。
- 交互：q/r 任一动即重解 Riccati（2×2 用解析公式，JS 实现）；preset 切换。动画：轨迹重放播放键。

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `resonance-lab`（现有） | 质量-阻尼-刚度-驱频实验 | 10 开场类比（阻尼≈反馈耗散） |
| `slope-field`（现有） | 方向场与轨迹 | 20 回扣 |
| `phase-portrait`（现有） | 2×2 系统向量场与特征方向 | 20/30 |
| `equilibrium-probe`（现有） | 相线与平衡点稳定性 | 30 回扣 |
| `diagonalize-grid`（现有） | 特征方向分解网格 | 30 回扣 |
| `contour-map`（现有） | 标量函数等高线 | 50（V(x) 的等高线主场） |
| `gradient-probe`（现有） | 等高线上探梯度 | 50 |
| `plot`（现有） | 函数图像兜底 | 70/80 响应曲线备用 |

验收：五个新 renderer 注册进 `RENDERERS`，dataset 签名守卫防重复注入，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 八门课题切分

### 10 · 反馈：让误差替你开车

- 文件：`10-feedback-open-closed.md`
- 核心概念：开环按标称一步到位，闭环持续比较目标与输出的误差并修正；反馈把扰动和漂移的影响压缩约 $1/(1+k_p)$ 倍。
- 边界：讲开环/闭环、比例反馈与误差压缩比直觉；不讲传递函数与框图代数（那是频域语言，本章不用）。
- 组件：`feedback-loop`（主）+ `resonance-lab` 开场类比。
- 判题 exercise：单位增益对象、比例控制 $u=k_p(r-y)$、输出端叠加扰动 $d$。设 $r=10,k_p=9,d=5$，打印三行：
  - `开环无扰动输出：10.0`
  - `开环受扰输出：15.0`
  - `闭环受扰输出：9.5`（解 $y=9(10-y)+5$）
  初始代码闭环写成 $k_p r/(1+k_p)$（丢扰动项），能跑但第三行得 9.0。
- 必写误区：①反馈不是消除误差而是持续消化误差，「静差」是比例反馈的固有代价；②开环精度依赖标定，标定一漂就全线漂；③闭环变慢变稳不是白给的——增益太大会振荡（预告 30 课极点迁徙）。

### 20 · 从高阶 ODE 到状态空间

- 文件：`20-state-space-models.md`
- 核心概念：任何高阶 ODE 都能打包成一阶向量系统 $\dot{x}=Ax+Bu$；「状态」是最小记忆——今天的状态加规律足以算出明天。
- 边界：讲二阶转一阶向量的标准打包法与欧拉步进仿真；不讲一般线性变换标准化（能控标准型推导）与传递函数。
- 组件：`phase-portrait` + `slope-field` 回扣 + Python 手搓欧拉步进。
- 判题 exercise：把 $\ddot{\theta}=-4\theta-2\dot{\theta}$ 打包成 $A=\begin{pmatrix}0&1\\-4&-2\end{pmatrix}$（正文用 `\begin{pmatrix}`，勿写字面花括号），从 $x=[1,0]$ 出发走一步欧拉（dt=0.1），打印：
  - `theta_next = 1.0`
  - `omega_next = -0.4`
  初始代码把 A 两行装反，能跑但两行全错。
- 必写误区：①状态不是「位置」而是「足够推演未来的全部信息」（摆的位置+速度才完整）；②$u$ 是入口、$A$ 是天性——自由响应由 A 决定，控制只是顺着力场推；③打包方式不唯一，但特征值唯一。

### 30 · 极点定生死：特征值与反馈移极点

- 文件：`30-pole-placement.md`
- 核心概念：A 的特征值实部决定自由响应的命运（负=衰减、正=爆炸、虚=振荡）；反馈 $u=-Kx$ 把系统变成 $A-BK$，等于亲手搬走极点。
- 边界：讲连续系统 $\operatorname{Re}\lambda<0$ 判据与单参数极点配置；不讲离散系统 $|\lambda|<1$ 的完整平行理论（一句带过并提醒与第 23 章 CFL 数值稳定性的语境区别：数值稳定性≠系统稳定性）；不讲多变量 K 的自由度设计。
- 组件：`pole-mover`（主）+ `equilibrium-probe`/`diagonalize-grid` 回扣。
- 判题 exercise：不稳定对象 $\dot{x}=0.5x+u$，反馈 $u=-kx$，要闭环特征值为 $-3$，打印：
  - `开环稳定吗：False`
  - `所需增益 k = 3.5`
  - `闭环特征值 = -3.0`
  初始代码符号写反（$k=a-\text{target}$），能跑但输出 −3.5 与 4.0。
- 必写误区：①「稳定」是对平衡点而言的局部性质，不是系统道德证书；②极点搬到离虚轴越远响应越快，但控制量越大（预告 LQR 权衡）；③复特征值=振荡衰减，别看到复数就报错。

### 40 · 可控性与可观性

- 文件：`40-controllability-observability.md`
- 核心概念：可控问「推力够不够摸到所有状态」（Kalman 秩判据 $\operatorname{rank}[B\ AB]=n$），可观问「从输出能否反推状态」；二者互为对偶。
- 边界：讲 2 维系统的可控性矩阵与能达域直觉 + 对偶陈述；不讲 Gramian 定量度量、最小实现与系统分解定理。
- 组件：`reachability-map`（主）+ Python 手算可控性矩阵行列式。
- 判题 exercise：两个 2×2 预设，手算 $[B\ AB]$ 行列式并判可控，打印：
  - `系统一可控：True`（A=[[0,1],[0,0]], B=[0,1]ᵀ，det=−1）
  - `系统二可控：False`（A=[[1,0],[0,2]], B=[1,0]ᵀ，det=0）
  初始代码把可控性矩阵误拼成 $[B\ B]$，恒奇异，能跑但两行全 False。
- 必写误区：①可控是「能力」不是「性能」，可控的系统也可以调得很烂；②行列式为零只是 2 维判据，一般维度看秩；③不可观不是传感器坏了，是结构上就照不到那个方向。

### 50 · Lyapunov 证书

- 文件：`50-lyapunov-certificates.md`
- 核心概念：找一个像「能量」的正定函数 V，只要沿轨道 V 单调下降，平衡点就渐近稳定——这是不解方程的稳定性证明术。
- 边界：讲正定/负定直觉、一维与二维例子、V 沿轨迹求导的链式验证；不讲 LaSalle 不变性原理与反例构造理论（60 章明确留给本章的就是这个直觉层）。
- 组件：`contour-map`（V 的等高线主场）+ `gradient-probe` + Python 验证 $V'$ 符号。
- 判题 exercise：$\dot{x}=-x^3$，取 $V=x^2$，打印：
  - `V(2) = 4`
  - `V'(2) = -32`
  - `V 沿轨道单调下降，原点渐近稳定：True`
  初始代码动力学写成 $+x^3$，能跑但第三行 False。
- 必写误区：①找不到 Lyapunov 函数≠不稳定，只是没找到证书；②V 是「能量记账本」，不是系统轨迹本身；③$\dot V<0$ 要对所有非零状态成立，抽查几个点不算证明。

### 60 · LQR：最优控制的权衡

- 文件：`60-lqr-optimal-control.md`
- 核心概念：LQR 把「调得多快」与「花多少力」写进二次代价 $J=\int(qx^2+ru^2)\,\mathrm{d}t$，最优反馈增益 K 由 Riccati 方程给出——Q/R 就是「速度 vs 省力」的两个旋钮。
- 边界：讲标量系统的 HJB/Riccati 推导（一元二次方程级别）与 Q/R 权衡直觉；不讲一般维度的数值解法与 Kalman 滤波组合（LQG 一句带过）；优化算法通用理论注明「见第 43 章（规划中）」。
- 组件：`lqr-tradeoff`（主）+ Python 解标量 Riccati。
- 判题 exercise：$\dot{x}=x+u$、$J=\int(qx^2+ru^2)dt$，$q=3,r=1$：Riccati $P^2-2P-3=0$ 取正根。打印：
  - `最优 P = 3.0`
  - `最优 K = 3.0`
  - `r 增大到 3 后 K 变小：True`（此时 $K=(1+\sqrt{10})/3\approx0.46$）
  初始代码取了负根且 K 忘除 r，能跑但前两行错。
- 必写误区：①「最优」只对你自己写的 J 成立，换了代价函数冠军就换人；②r 调大系统变慢变温柔，不是参数失灵；③Riccati 的正根才有意义，负根对应「能量为负」的荒谬账本。

### 70 · PID：工程界的常青树

- 文件：`70-pid-tuning.md`
- 核心概念：P 看现在（误差越大推越狠）、D 看趋势（提前刹车）、I 记过去（累积误差消灭静差）；三个旋钮各管一段时间视角。
- 边界：讲三作用直觉、P 静差公式 $e_{ss}=r/(1+k_p)$ 与积分消静差、粗调手感；不讲 Ziegler-Nichols 整定表与频域整定（第 60 章领地）；不重复 60 章振动阻尼推导，只回扣对照。
- 组件：`pid-lab`（主）+ `plot` 兜底。
- 判题 exercise：直流增益为 1 的对象、单位反馈，$r=10,k_p=4$，打印：
  - `P 控制稳态误差 = 2.0`（$10/(1+4)$）
  - `PI 控制稳态误差 = 0.0`（只要 ki>0，静差必死）
  初始代码用 $r/k_p$ 当静差（得 2.5 且第二行同样错），能跑但两行全不过。
- 必写误区：①D 不是「预测未来」，是对测量噪声最敏感的放大器，实践中常弃用；②I 能消静差也会积累滞后（积分饱和一句带过）；③PID 不需要状态空间知识也能用——这正是它统治工业的原因，也是它调不好的原因。

### 80 · 扰动抑制与鲁棒性

- 文件：`80-disturbance-rejection.md`
- 核心概念：扰动从哪里进入决定了它有多难缠；反馈带宽越高抑制越强，但裕度越小——鲁棒性是「压扰动」与「怕模型错」之间的讨价还价。
- 边界：讲负载扰动下的稳态分析、I 的结构性作用、增益/相位裕度的时域直觉版一句话；**不讲** Bode/Nyquist/灵敏度函数（正文显式互链 `engineering-cybernetics/sensitivity-function` 与 `robust-control-tradeoff` 作下一站）；不讲随机扰动与卡尔曼滤波。
- 组件：`pid-lab`（注扰实验主场）+ `feedback-loop` 回扣 + Python 仿真对照。
- 判题 exercise：对象 $\dot y=-y+u+d$，$r=10$，$t=10$ 秒时 $d$ 阶跃到 5，$k_p=4$，仿真至稳态（dt=0.01、T=20，解析稳态可验：P 控制 $y_{ss}=9$，PI 控制 $y_{ss}=10$），打印：
  - `P 控制最终误差 = 1.0`
  - `PI 控制最终误差 = 0.0`
  初始代码积分项累加的是 $r$ 不是误差（积分饱和式跑飞），能跑但两行全错。
- 必写误区：①抑制扰动靠的是环路增益不是勇气，P 有静差的根源就是环路直流增益有限；②鲁棒不等于皮实——过度追求性能会把裕度吃光，模型一小错就翻车；③本章的时域裕度直觉与第 60 章的频域灵敏度是同一枚硬币的两面。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | control/feedback-open-closed | functions/linear | 3 | open-loop, closed-loop, feedback-error |
| 18 | control/state-space-models | control/feedback-open-closed, ode/phase-portraits | 4 | state-space-model, state-vector |
| 19 | control/pole-placement | control/state-space-models, linalg-advanced/eigenvalues | 4 | closed-loop-poles, pole-placement |
| 20 | control/controllability-observability | control/pole-placement, linalg-advanced/rank-nullspace | 4 | controllability, observability, kalman-rank-criterion |
| 21 | control/lyapunov-certificates | control/pole-placement, multivariable/partial-gradient | 5 | lyapunov-function, positive-definite |
| 22 | control/lqr-optimal-control | control/lyapunov-certificates, control/controllability-observability | 5 | quadratic-cost, riccati-equation, lqr |
| 23 | control/pid-tuning | control/feedback-open-closed, sequences/sigma | 4 | pid-controller, steady-state-error |
| 24 | control/disturbance-rejection | control/pid-tuning, control/lqr-optimal-control | 5 | disturbance-rejection, robustness-margin |

补充约定：

- 所有 prereqs 已核实存在且严格排前（章内链递增、跨章低章号）；**严禁**指向排在本章之后的章（原注的 490/300/310 即现第 60/43/44 章：43/44 排在本章之前可引，第 60 章排后不可引）。
- track 全章 `optimization-control`；20/30/80 若做数值仿真实验可追加 `scientific-computing`。exits 一律含 `engineering`。
- import 登记：全章只用 `math`/`random`/`statistics`/matplotlib（均已登记），不新增 `introduces_import`；判题输出全部解析确定值，**不用随机数**（如需演示噪声，固定 seed 且不进 @check）。

## 6. 整章验收清单

1. 五个新 renderer（feedback-loop / pole-mover / reachability-map / pid-lab / lqr-tradeoff）注册进 `RENDERERS`，validate 可识别，签名守卫防 MutationObserver 重注入，亮暗主题可读。
2. 每课至少两个可视化（定制 viz 或滑块 python），判题 exercise 初始代码能运行但不通过，独立正确解法与 `@check` 逐行一致（浮点行 round 后比对）。
3. 边界自查表逐课过一遍：全文搜 `Bode`/`Nyquist`/`传递函数` 只允许出现在「不讲/下一站」句式里；prereqs 无第 60 章及任何排后章号。
4. 每课 quiz、误区卡齐备；60/70 互相引用形成「现代 vs 经典」对照小闭环；80 结尾与第 60 章互链兑现生产承诺。
5. MDX 双坑体检：矩阵公式用 `\begin{pmatrix}`（KaTeX 环境内安全，勿写转义花括号 `\{`/`\}`，集合记号改 `\lbrace`/`\rbrace`），显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测五组件拖拽、三类块与 Alt+P 浮窗、路由切换无重复注入；360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`，未立项项（Ziegler-Nichols 整定、LQG、离散控制、Gramian）登记 `AUDIT_REPORTS/OPEN_ITEMS.md`；ROADMAP/BACKFILL_LOG 台账由主线程更新。
