# 第 44 章 · 数值分析 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 10 门正式课已建成（磁盘多于本指导登记的 8 门课题，改名/拆并以磁盘为准）
> 目标：10 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 5 / layer L6 / track scientific-computing + optimization-control / stage university-core（index.md 已锁定；蒙特卡洛课可按主题单课覆盖 layer L5，校验器只查词表合法性）

## 1. 章定位

纸上的精确公式进入有限位浮点数后，误差从哪里来、被放大多少、用什么算法能压住——这是本章唯一的主线：

```text
浮点表示 → 舍入误差与稳定算法 → 问题条件 vs 算法稳定 → LU/Cholesky → QR 最小二乘 → 迭代法与谱半径 → 插值与数值微积分 → 蒙特卡洛
```

前半章（10–30）建立"误差世界观"，中间（40–60）是解线性方程组的两条路线，后半章（70–80）把误差分析推广到微积分与随机方法。每课都必须同时给出"算出来是什么"和"还能信几位"两个答案；不能写成算法步骤查表课。

## 2. 前置覆盖

- 第 21 章 `linalg-advanced/condition-number` 只讲了奇异值条件数与误差放大直觉（其边界明确"不讲浮点格式细节"），本章第 10/20 课正好接管浮点层；第 30 课把"问题条件"与"算法稳定"两个概念分开，是对 50 章的升级而非重复。
- 第 21 章 `linalg-advanced/elimination` 讲了 2×2 消元与解空间分类；第 40 课的 LU 是它的记账升级（保存乘子），不重推消元。
- 第 21 章 `linalg-advanced/least-squares` 用投影解释正规方程；第 50 课从数值角度回答"为什么实际软件不硬解正规方程"。
- 第 14 章 `integrals/numeric` 是数值积分实验版；第 70 课只做严格误差阶分析（O(h²)/O(h⁴)），不再重复实验搭建。
- 第 22 章 `ode/euler-runge-kutta` 已建立截断误差与步长直觉；第 70 课引用其语言但不重讲。
- 第 09 章 `prob/law`（大数定律）是蒙特卡洛的概率地基。

**numpy 决策（留给主线程）**：全库目前只有 `graphs-networks/spectral-layout`（第 53 章）登记过 `introduces_import: [numpy]`，而校验器按章节号排序，53 排在 44 之后、不能为 310 背书。本课程表默认**纯手写循环实现矩阵运算**（2×2/3×3 规模完全够用）；若主线程决定让 310 作为 numpy 的全站出生地，须在第 40 课 front matter 登记 `introduces_import: [numpy]` 并给出生证明段，后续课顺延复用。两种方案 validate 都能过，但只能二选一。

## 3. 组件清单

新增 4 个定制组件（≤5 上限内），其余全部复用现有渲染器。

### 新增：float-gaps（浮点间隙显微镜）

```viz
{ "type": "float-gaps", "title": "0.1 附近的浮点邻居", "value": 0.1, "zoom": 20 }
```

- spec 字段：`value`（观察点）、`zoom`（放大倍率滑块 1–100）。
- 画布：以 value 为中心的数轴，放大后画出相邻可表示浮点的刻度线与 ulp 间隔标注；value 本身若不可精确表示，用红点显示真实落点 vs 十进制意图位置。
- 交互：拖 value 滑块跨数量级（1e-3 → 1e3），看间隔随指数变宽变窄；zoom 放大镜叠加。
- 动画：无，即时重绘。
- 服务课：10（主）、20。

### 新增：gram-schmidt-lab（正交化步进台）

```viz
{ "type": "gram-schmidt-lab", "title": "两根向量掰垂直", "v1": [3, 0], "v2": [4, 3] }
```

- spec 字段：`v1`、`v2`（二维初始向量）。
- 画布：两根原向量 + 正交化后的 q₁/q₂（带直角标记）+ 投影虚线 + R 系数读数。
- 交互：拖动 v₁/v₂ 端点改输入；按钮「减去投影」「归一化」逐步执行 Gram-Schmidt；随时一键重置。
- 动画：步进按钮驱动，不做自动循环。
- 服务课：50（主）。

### 新增：iterative-sweep（迭代法收敛观测器）

```viz
{ "type": "iterative-sweep", "title": "Jacobi 点列", "matrix": [4, 1, 1, 3], "rhs": [5, 6], "method": "jacobi" }
```

- spec 字段：`matrix`（2×2 行优先展开）、`rhs`、`method`（"jacobi" | "seidel"）。
- 画布：左侧迭代点列 (xₖ) 轨迹走向真解星标；右侧谱半径读数 ρ<1 绿 / ρ≥1 红。
- 交互：滑块改四个系数与初值；jacobi/seidel 切换对比收敛速度；「走一步」「走十步」「重置」。
- 动画：按按钮推进，发散时点列红色外飞。
- 服务课：60（主）。

### 新增：mc-convergence（蒙特卡洛收敛器）

```viz
{ "type": "mc-convergence", "title": "撒点估 π", "target": "pi", "nMax": 20000 }
```

- spec 字段：`target`（"pi" | "mean"，先只实现 pi）、`nMax`（总点数上限）。
- 画布：左单位方形撒点（命中蓝/未中灰）；右 log-log 误差收敛图，参考斜率 -1/2 直线与实时估计值读数。
- 交互：滑块控 N；「重新抽样」（换 seed）看不同实现的抖动；速度档位。
- 动画：有，批量撒点渐进绘制。
- 服务课：80（主）。

### 复用现有渲染器

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `condition-number`（现有） | 改奇异值看误差椭圆放大 | 30 |
| `svd-stretch`（现有） | 奇异轴拉伸与病态倾向 | 30 |
| `elimination`（现有） | 逐步归一/消元/回代动画（LU 的骨架） | 40 |
| `least-squares-fit`（现有） | 拖点看残差与正规方程解 | 50 |
| `projection`（现有） | 向量投影几何 | 50 |
| `diagonalize-grid` 或 `matrix-power`（现有） | 特征基下的伸缩 → 谱半径语义 | 60 |
| `taylor`（现有） | 截断误差的多项式逼近视角 | 70 |
| `riemann` + `quadrature`（现有） | 复合梯形/Simpson 分割加密 | 70 |
| `plot`（现有） | 误差随 h 的对数直线 | 20/70 |

## 4. 八门课题切分

### 10 · 浮点表示与机器精度

- 文件：`10-floating-point.md`
- 核心概念：双精度浮点是"符号 × 指数 × 有效位"的刻度尺；相邻可表示数的间隔随数量级变宽；机器精度 ε 是"1 加不上之前的最小间隔"。
- 边界：讲 IEEE 双精度的直觉模型、ulp 与机器精度；不讲 IEEE 位级编码细节与次正规数规则。
- 组件：`float-gaps`（新）+ `float-gaps` 跨量级实验 + Python eps 循环。
- 判题 exercise：对折求机器精度并分类。目标输出 `double` / `True`（eps 对折至失效后 ×2 得 ε≈2.22e-16，按阈值 <1e-15 分类 double；第二行判断 ε>1e-17）。初始代码阈值写错输出 `single`。
- 必写误区：你以为 0.1 存的是 0.1，其实是最接近它的二进制分数；你以为浮点误差均匀分布，其实间隔随指数跳宽；你以为 ε 是能加到 1 上的最小数，其实是第一个加不上的间隔的一半。

### 20 · 舍入误差与算法稳定性

- 文件：`20-roundoff-stability.md`
- 核心概念：舍入误差会被减法消去灾难性放大（catastrophic cancellation）；同一数学问题不同算法的误差行为天差地别；累加顺序本身就能改变结果。
- 边界：讲有效数字损失机理、求根公式有理化改造、求和顺序实验；不讲区间运算与误差界的一般证明。
- 组件：`float-gaps`（新）+ `plot` + Python 求和顺序对照实验。
- 判题 exercise：连加十个 0.1 并判断落点。目标输出 `False` / `True`（total==1.0 为 False，total<1.0 为 True）。初始代码第二行写成 total>1.0 输出 False/False。
- 必写误区：你以为加法顺序无关紧要，其实浮点加法不满足结合律；你以为结果差一点点无所谓，其实消去后相对误差可能丢掉一半有效位；你以为乘法也危险，其实单次乘法只舍入一次。

### 30 · 问题条件与算法稳定

- 文件：`30-conditioning-stability.md`
- 核心概念：条件数属于"问题"（输入扰动被放大多少），稳定性属于"算法"（输出是否接近某扰动输入的精确解）；病态问题换算法救不了，良态问题坏算法照样翻车。
- 边界：讲 2×2 条件数应用、向后误差直觉、"好问题×坏算法 / 坏问题×好算法"四象限；不讲范数理论与向后稳定性形式证明（50 章 condition-number 课已讲 κ 定义，本课不重复推导）。
- 组件：`condition-number` + `svd-stretch`（均现有）+ 四象限对照表。
- 判题 exercise：由奇异值算 κ 并分类。目标输出 `2048` / `ill-conditioned`（σ₁=64、σ₂=0.03125 二进制精确，κ=2048>1000）。初始代码用减法或阈值写反。
- 必写误区：你以为残差小就解得准，其实病态问题里多个解共享小残差；你以为行列式大就稳，其实方向不平衡才致命；你以为换更精密的数据类型能治病态，其实只是推迟爆炸。

### 40 · 直接法：LU 与 Cholesky

- 文件：`40-lu-cholesky.md`
- 核心概念：LU 把高斯消元的乘子记账保存，一次分解多次求解；对称正定矩阵可用 Cholesky 减半工作量且天然稳定。
- 边界：讲 3×3 以内的 Doolittle 记账、前代/回代、SPD 的 Cholesky；不讲选主元的完整策略分析与复杂度常数优化。
- 组件：`elimination`（现有，作为 LU 骨架动画）+ 手写 Python 三重循环。
- 判题 exercise：A=[[4,2],[2,3]]、b=[6,7] 做 LU 并前代回代。目标输出 `0.5` / `2.0`（x₁=0.5、x₂=2.0，全程二进制精确）。初始代码回代顺序颠倒。
- 必写误区：你以为每次右端都要重新消元，其实 U 和 L 可以存下来复用；你以为 Cholesky 只是快，其实它对 SPD 天然不需要选主元；你以为零除零才算失败，其实乘子上出现极小非零数同样是信号。

### 50 · 正交化：QR 与最小二乘

- 文件：`50-qr-least-squares.md`
- 核心概念：Gram-Schmidt 把任意列组掰成标准正交基；QR 解最小二乘等价于投影但数值上远比正规方程稳。
- 边界：讲 2×2/3×2 手算 Gram-Schmidt、R 因子的记账含义、为什么 ‖Qᵀb−Rx‖ 免受 κ(A²) 放大；不讲 Householder 变换与完整舍入误差证明。
- 组件：`gram-schmidt-lab`（新）+ `least-squares-fit` + `projection`（现有）。
- 判题 exercise：v₁=(3,0)、v₂=(4,3) 正交化并报 R 因子与正交性检验。目标输出 `4.0` / `3.0` / `0.0`（r₁₂=4、r₂₂=3、q₁·q₂=0）。初始代码忘记减投影分量。
- 必写误区：你以为正交化只是"好看"，其实它把问题的条件平方根化了；你以为 R 是新发明，其实它就是消元系数换了记法；你以为 q·q=1 就够了，其实 q₁·q₂=0 才是正交的本分。

### 60 · 迭代法与谱半径

- 文件：`60-iterative-methods.md`
- 核心概念：把 A 拆成"容易求逆的对角部分 + 余项"得到不动点迭代；收敛与否由迭代矩阵谱半径 ρ<1 决定；Jacobi 与 Gauss-Seidel 是两种拆法。
- 边界：讲 Jacobi/Gauss-Seidel 的 2×2 全流程与谱半径判据；不讲 SOR 松弛、共轭梯度与 Krylov 子空间。
- 组件：`iterative-sweep`（新）+ `diagonalize-grid` 或 `matrix-power`（现有，谱半径=特征值最大模的语言衔接）。
- 判题 exercise：A=[[4,1],[1,3]]、b=[5,6] 跑 20 步 Jacobi 并四舍五入。目标输出 `0.818` / `1.727`（真解 x=9/11、y=19/11，ρ=√(1/12)<1 保证 20 步收敛到位）。初始代码漏除对角元导致发散数字。
- 必写误区：你以为迭代法是直接法的劣化版，其实大规模稀疏时它是唯一现实选择；你以为步数越多一定越准，其实 ρ≥1 时越走越远；你以为 Gauss-Seidel 总是更快，其实只是通常更快、方向依赖谱结构。

### 70 · 插值、数值微分与积分

- 文件：`70-interp-diff-integ.md`
- 核心概念：多项式插值是"过点拟合"，节点多未必更好（Runge 现象预告）；数值微分误差 O(h)~O(h²)，h 太小又撞上舍入误差地板；复合梯形 O(h²)、Simpson O(h⁴) 有严格的误差阶。
- 边界：讲线性插值、两点中心差商、复合梯形/Simpson 误差阶验证；不讲样条理论与 Romberg 完整递推（14 章已做过积分实验，本课只补误差分析，不重建实验）。
- 组件：`taylor` + `riemann` + `quadrature` + `plot`（均现有）。
- 判题 exercise：n=100 复合梯形算 ∫₀¹x²dx 并检查误差。目标输出 `0.33335` / `True`（梯形值 0.33335，误差 <2e-5）。初始代码退化为左端点黎曼和输出 `0.32835` / `False`。
- 必写误区：你以为分割越细永远越准，其实数值微分在 h 过小时被舍入误差反噬；你以为 Simpson 只是"梯形加点权"，其实权重背后是抛物线精确性；你以为插值多项式阶越高越贴合，其实两端会剧烈振荡。

### 80 · 蒙特卡洛方法与方差缩减

- 文件：`80-monte-carlo.md`
- 核心概念：随机采样把积分/期望变成计数；误差按 O(1/√N) 收敛，与维度无关是它最大的本钱；方差缩减是在样本上做聪明的加减法。
- 边界：讲撒点估 π、均值估计的 √N 定律、固定 seed 可复现性与对偶变量一个例子；不讲 MCMC 与重要性采样的一般理论（贝叶斯卷承接）。
- 组件：`mc-convergence`（新）+ `statdots`（现有）+ Python 固定 seed 实验。
- 判题 exercise：N=20000 撒点估 π 并分类。目标输出 `close` / `True`（|est−π|<0.05 分类 close；est>3.0）。初始代码用 x*y<=1 判命中（恒真）输出 `far` / `False`。
- 必写误区：你以为 N 翻倍精度翻倍，其实只改善约 √2 倍；你以为随机数每次都该不同，其实科学计算要固定 seed 才可复现；你以为蒙特卡洛低维很亏，其实它在高维反而碾压网格法。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | numerical-analysis/floating-point | fractions/decimals | 3 | floating-point, machine-epsilon |
| 18 | numerical-analysis/roundoff-stability | numerical-analysis/floating-point, series/taylor | 4 | roundoff-error, algorithmic-stability |
| 19 | numerical-analysis/conditioning-stability | numerical-analysis/roundoff-stability, linalg-advanced/condition-number | 4 | backward-error |
| 20 | numerical-analysis/lu-cholesky | linalg-advanced/elimination, numerical-analysis/conditioning-stability | 4 | lu-decomposition, cholesky-factorization |
| 21 | numerical-analysis/qr-least-squares | numerical-analysis/lu-cholesky, linalg-advanced/least-squares | 4 | qr-decomposition, gram-schmidt |
| 22 | numerical-analysis/iterative-methods | numerical-analysis/lu-cholesky, linalg-advanced/matrix-power | 4 | jacobi-iteration, spectral-radius |
| 23 | numerical-analysis/interp-diff-integ | series/taylor, integrals/numeric | 4 | polynomial-interpolation, finite-difference, composite-quadrature |
| 24 | numerical-analysis/monte-carlo | prob/law, integrals/numeric | 3 | monte-carlo-method, variance-reduction |

补充约定：

- 所有 prereqs 已 grep 核实存在且排在前面（fractions/decimals=02 章、series/taylor=15 章、linalg-advanced/*=50 章、integrals/numeric=14 章、prob/law=09 章）。
- 单课 layer 建议：10–60 维持 L6；70 可挂 L9（数值微积分靠近 ODE 数值解语义域）；80 可挂 L5（概率主题），track 一律保持 scientific-computing。
- 不引入任何第三方库：只用 math/random/statistics/matplotlib 与手写循环（numpy 决策见 §2，留主线程裁决）。

## 6. 整章验收清单

1. 四个新 renderer（float-gaps / gram-schmidt-lab / iterative-sweep / mc-convergence）注册进 `RENDERERS`，validate 可识别，亮暗主题可读，canvas 非空白，各至少一门课真实消费。
2. 每课至少两个可视化（viz 组件或 matplotlib 实验），高难课不得静态文字凑数。
3. 每课一个判题 exercise：初始代码能运行但不通过；独立正确解法与 `@check` 逐行一致（本文件给出的目标输出均已实测核验）。
4. 每课有 quiz、2–3 张误区卡、选读或边界说明。
5. MDX 双坑体检：`\lbrace`/`\rbrace` 替代字面花括号；显示公式一律单行；逐课比对源 `^## ` 数与产物 `<h2` 数。
6. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；浏览器实测三类块 + Alt+P 浮窗 + 路由切换无重复注入；360px 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
