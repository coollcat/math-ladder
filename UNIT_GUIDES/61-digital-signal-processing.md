# 第 61 章 · 数字信号处理 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 15 门正式课已建成（磁盘多于本指导登记的 11 门课题，改名/拆并以磁盘为准）
> 目标：15 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L8 / track analysis-change + scientific-computing / stage university-core / difficulty 4

## 1. 章定位

本章是卷一第 16 章「信号与变换枢纽」的工程落地深化：傅里叶的连续公式在这里变成可运行、可滤波、可谱分析的数字算法。主线推进：

```text
采样与混叠 → 卷积与 LTI → 冲激响应/差分方程 → Z 变换零极点 → FIR/IIR 设计 → DFT 泄漏 → FFT 分治 → 窗函数权衡 → 多速率重采样 → 自适应滤波（选讲）
```

纪律：**不重复推导 DFT 定义与采样定理的证明**（16 章 `fourier/dft` 已给）；本章只做「工程化深化」——泄漏、窗、实现成本、稳定性这些 16 章没碰的问题。每课都要回到同一句话：连续直觉如何在有限个数字上成立、何时失效。

## 2. 前置覆盖

- `fourier/dft`：采样定理一句话版、频率桶、手搓 DFT 公式（含实部虚部拆解）。
- `fourier/spectrum`、`fourier/square-wave-gibbs`：频谱读法、谐波叠加与 Gibbs。
- `trig/beats`、`trig/wave-anatomy`：波的叠加语言。
- `complex/polar`、`complex/euler`、`complex/multiplication`：复数极形式与旋转乘法——Z 平面与 $e^{j\omega}$ 的地基。
- `sequences/sigma`：求和记号——卷积的双重求和要直接使用。
- `ode/vibration-resonance`：共振直觉——极点靠近单位圆时响应拔高的对照。
- `engineering-cybernetics/frequency-response-bode`：频率响应读图法（50 课可回扣）。

Python 方面：全章只用已登记的 `math` 与 matplotlib；**不引入 numpy**（Pyodide 环境约束），所有 DFT/卷积用纯循环实现且 N ≤ 64 保证浮窗秒回。若个别课用 `random` 造噪声，按规范在 front matter 登记。

## 3. 组件清单（新增 5 个定制渲染器）

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `sampling-lab` | 连续波 + 采样杆 + 混叠鬼影三联动，拖频率/采样率 | 10（主）、90 回扣 |
| `convolution-machine` | 翻转-滑动-求和动画机，核可换 | 20（主）、30 回扣 |
| `z-plane` | 单位圆上拖零极点，频率响应实时重画 | 40（主）、50 回扣 |
| `filter-designer` | FIR/IIR 参数台 + 含噪信号过滤演示 | 50（主）、80 回扣 |
| `dft-spectrum` | 波形窗 + 频谱条双面板，观察泄漏 | 60（主）、70/80 复用 |

### 可实现规格

**sampling-lab**
- spec 字段：`{ "type": "sampling-lab", "title": "...", "freq": 3, "fs": 12, "mode": "single" }`；`freq`（1–10 Hz）、`fs`（2–24 Hz）滑块；`mode`: `"single"` 或 `"mix"`（叠加 2.7 Hz 第二音）。
- 上画布：连续模拟曲线（细线）+ 采样竖杆（粗 stem）；下画布：由样本线性插值的重建曲线（实色）+ 按折叠公式算出的混叠正弦（虚线红）。顶部数值行显示 `f_alias` 与奈奎斯特线。
- 交互：两个滑块实时重绘；拖动即见「fs 降到 2f 以下时红线接管重建」。
- 动画：播放按钮让时间轴滚动、样本逐点落下（复用 `addAnimationControls`，离屏暂停，`prefers-reduced-motion` 出静态帧）。

**convolution-machine**
- spec 字段：`{ "type": "convolution-machine", "title": "...", "preset": "moving-average", "length": 4, "gain": 0.6 }`；`preset`: `"moving-average"` / `"echo"`（延迟冲激）/ `"custom"`（用数组字段 `h` 直接给核）。
- 画布三条横带：输入条形 x[k]、当前窗口内翻转核 h[-k+n]（逐格高亮、重叠区着色）、输出条形 y[·]（已算出的格子亮起）；角标显示当前 n 与累加和。
- 交互：n 滑块或左右步进按钮逐格推；preset 下拉换核并即时清空重放。
- 动画：播放键让 n 自动推进（约 400 ms 一格）；静态模式下停在 n=窗口中心。

**z-plane**
- spec 字段：`{ "type": "z-plane", "title": "...", "poles": [[0.8, 0]], "zeros": [[1, 0]], "draggable": true }`；坐标对 `[re, im]`。
- 上画布：单位圆、实轴虚轴、极点画 ×、零点画 ○，均可指针拖拽（半径限制 0–1.2）；下画布：$|H(e^{j\omega})|$ 曲线，ω 从 0 到 π，按 $H(z)=\prod(z-z_i)/\prod(z-p_j)$ 逐点求值实时重画；标注峰值频率与峰值增益。
- 交互：拖极点看谐振峰跟着角度跑；拖到圆外画布给出「不稳定」红色提示条。
- 动画：单位圆上一枚 $e^{j\omega}$ 相量匀速扫圈，在下图画出对应动点（可暂停）。

**filter-designer**
- spec 字段：`{ "type": "filter-designer", "kind": "fir", "taps": 7, "cutoff": 0.25, "poleR": 0.9 }`；`kind`: `"fir"` / `"iir"`；`cutoff` 为归一化频率（0.05–0.45）；FIR 用窗函数法（汉宁窗截断 sinc），IIR 用单极点 $h[n]=r^n u[n]$。
- 双画布：上为幅度响应 dB 曲线（0..π），带通带/阻带目标阴影；下为冲激响应 stem 图。右侧「演示」区：正弦混合信号过滤波器的前后波形对比。
- 交互：taps（奇数 3–21）、cutoff、poleR 三滑块；FIR/IIR 切换钮；「播放演示」按钮滚动显示输入（两音+噪点）与输出波形。
- 动画：演示波形横向滚动（唯一动画点，默认关闭待手动开启）。

**dft-spectrum**
- spec 字段：`{ "type": "dft-spectrum", "title": "...", "n": 32, "freq": 4.5, "window": "rect" }`；`n` 仅允许 16/32/64；`freq` 连续（单位：桶，可半桶）；`window`: `"rect"` / `"hann"` / `"hamming"`。
- 左画布：N 点采样波形 + 当前窗包络轮廓；右画布：$|X[k]|$ 条形谱（只画 0..N/2），悬停任一条显示桶号与对应 Hz。
- 交互：freq 滑块从整数桶拖到半桶立刻看到裙边泄漏；window 切换对比旁瓣抑制；n 切换看分辨率变化。
- 动画：无强制动画；可选相位缓推按钮展示泄漏形态稳定（尊重 reduced-motion）。

验收：每个 renderer 注册进 `RENDERERS`，有源码签名守卫（dataset 守卫防重复注入），亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 十一门课题切分

### 10 · 信号、采样与混叠

- 文件：`10-sampling-aliasing.md`
- 核心概念：采样是把连续信号压成数列；采样率不足时高频会折叠成低频伪装（混叠）。
- 边界：讲折叠公式 $f_{alias}=|((f+f_s/2)\bmod f_s)-f_s/2|$ 与抗混叠必要性；不讲重建内插的数学证明（90 课只做工程处理）。
- 组件：`sampling-lab`（主）+ 已有 `sines` 回扣拍频。
- 判题 exercise：给定 fs=100、f=230，先打印奈奎斯特频率再按折叠公式算混叠频率。正确解输出两行：`奈奎斯特频率 = 50.0 Hz`、`混叠频率 = 30.0 Hz`。初始代码用 `f % fs` 当折叠（得 30 但写法错误会漏掉负折叠情形，改成 f=170 即暴露错值 70），保证能跑但概念不对。
- 必写误区：①混叠不是噪声也不是丢点，是能量换了频率位置；②「两倍」是严格大于，恰好等于两倍仍会塌缩成直流样序列；③采样前的模拟低通不能省，采样后补救来不及。

### 20 · 卷积与 LTI 系统

- 文件：`20-convolution-lti.md`
- 核心概念：LTI 系统完全由一个核刻画，输出=翻转-滑动-加权和（卷积）。
- 边界：讲离散卷积定义式与翻转滑动机制；不讲连续卷积积分与交换律证明（一句带过）。
- 组件：`convolution-machine`（主）+ 已有 `seq` 展示输出数列生成。
- 判题 exercise：手写双重循环卷积 x=[1,2,3]、h=[1,0,2]，打印 `y = [1, 2, 5, 4, 6]`。初始代码内层写成 `h[k]`（未翻转位移），输出错误列表但能运行。
- 必写误区：①输出长度是 N+L-1 不是 max(N,L)；②翻转的是核不是输入，翻错方向结果不对称地错；③「线性时不变」两个词各有含义，缺一不可卷积。

### 30 · 冲激响应与差分方程

- 文件：`30-impulse-response-difference-eq.md`
- 核心概念：冲激输入的输出（冲激响应）唯一确定系统；差分方程是它的递推压缩表示。
- 边界：讲一阶反馈差分方程与递推求解；不讲二阶通用解法与状态空间（那是第 52 章控制的事）。
- 组件：`convolution-machine` 回扣（把递推结果与卷积核对上）+ 浮窗 Python 递推实验。
- 判题 exercise：递推 y[n]=0.5y[n−1]+x[n]，冲激输入 6 点，打印 `冲激响应前 6 项：` 与 `[1.0, 0.5, 0.25, 0.125, 0.0625, 0.03125]`（全部精确二进制小数，输出稳定）。初始代码丢掉反馈项 y[n−1]，输出全是冲激本身。
- 必写误区：①递推需要初值约定（y[−1]=0），不说清楚就得不到唯一答案；②冲激响应衰减快慢由反馈系数决定，不是输入长度；③IIR 的「无限」指响应理论不归零，不是程序死循环。

### 40 · Z 变换与零极点

- 文件：`40-z-transform-poles.md`
- 核心概念：Z 变换把差分方程变成代数；分母多项式的根（极点）决定谐振与稳定性。
- 边界：讲 Z 变换定义、一阶系统的零极点和单位圆上的频率响应；不讲收敛域分区讨论与逆变换围道法。
- 组件：`z-plane`（主）+ 已有 `complexmult` 回扣复数乘法即旋转。
- 判题 exercise：一阶系统 H(z)=1/(1−0.8z⁻¹)，用 `complex()`+`math.cos/sin` 在 ω=0 与 ω=π 两处求幅度增益并保留两位：`直流增益约 5.0`、`高频增益约 0.56`。初始代码忘记除以分母（直接打印 1.0 和 1.0）。
- 必写误区：①极点在圆内才稳定，「越接近圆越尖锐但越危险」；②频率响应只在单位圆上取值，不是整个平面；③复数增益的「幅度」要取模，别拿实部当增益。

### 50 · FIR 与 IIR 滤波器

- 文件：`50-fir-iir-filters.md`
- 核心概念：FIR 用有限抽头加权求和（稳定但费算力），IIR 用反馈递推（省算力但有失稳风险）。
- 边界：讲滑动平均/指数平滑两类原型与阶数权衡；不讲切比雪夫/椭圆逼近理论与双线性变换设计法。
- 组件：`filter-designer`（主）+ `z-plane` 回扣（IIR 极点半径即平滑记忆长度）。
- 判题 exercise：对含尖峰序列 x=[1,1,1,5,1,1,1] 做 3 点滑动平均（因果式，历史补零），打印 `滤波输出：[0.33, 0.67, 1.0, 2.33, 2.33, 2.33, 1.0]`（round 两位）。初始代码窗口开成向后取数（非因果）导致输出整体左移一位。
- 必写误区：①滑动平均有半个窗长的群延迟，尖峰会「迟到」；②FIR 无条件稳定不代表无失真；③IIR 系数量化的敏感性一句带过即可，不展开。

### 60 · DFT 与频谱泄漏

- 文件：`60-dft-leakage.md`
- 核心概念：截断窗内整周期分量落进单个桶；非整周期则能量裙边铺满邻近桶（泄漏）。
- 边界：讲泄漏成因与「桶对齐」判据；不讲 DTFT 连续谱推导（16 章已有连续视角）。
- 组件：`dft-spectrum`（主）+ 已有 `spectrum` 对照回扣（16 章直观版）。
- 判题 exercise：N=32、x[n]=cos(2π·4n/N)，双层循环算 DFT 取模，打印 `峰在 4 号桶，幅度 0.5`、`泄漏检查：5 号桶幅度 0.0`（round 一位）。初始代码忘除 N（得 16.0），能跑但检查不过。
- 必写误区：①泄漏不是计算误差，是截断的物理后果；②实信号谱对称，后半段是镜像别误读成新频率；③频率分辨率由记录时长决定，加长信号比加密采样有用。

### 70 · FFT 的分治直觉

- 文件：`70-fft-divide-conquer.md`
- 核心概念：偶/奇下标拆半递归，N² 次乘法降到 (N/2)log₂N。
- 边界：讲奇偶拆分的计数论证与两级手算展开；不讲位反转排序与原位实现的工程细节。
- 组件：`dft-spectrum` 复用（验证 FFT 结果与直接 DFT 一致）+ 浮窗 Python 计数实验。
- 判题 exercise：统计 N=32 时直接 DFT 与 FFT 的复数乘法次数，打印 `DFT: 1024 次`、`FFT: 80 次`。初始代码把 FFT 次数写成 N·log₂N 整体（320）而非 (N/2)·log₂N。
- 必写误区：①FFT 不是新变换，是 DFT 的快速算法，结果逐点相同；②加速比来自复用对称性，不是近似；③log₂N 只有对 N 是 2 的幂才这么干净，其他长度有混合基版本（一句带过）。

### 80 · 窗函数与时频权衡

- 文件：`80-windows-time-frequency.md`
- 核心概念：加窗是用主瓣变宽换旁瓣变矮；时间上越平滑，频率上越干净但分辨越钝。
- 边界：讲矩形/汉宁/海明的定性档案表与相干增益；不讲 Kaiser 参数族与最优窗设计定理。
- 组件：`dft-spectrum` 的 window 字段为主战场 + `filter-designer` 回扣（FIR 设计里的同一批窗）。
- 判题 exercise：按周期定义 w[n]=0.5(1−cos(2πn/N))（N=32）生成汉宁窗，打印 `窗起点 = 0.0` 与 `相干增益 = 0.5`（sum(w)/N 恰为精确值）。初始代码用 N−1 做分母且漏掉 0.5 系数，两个检查都挂。
- 必写误区：①没有「最好的窗」，只有针对旁瓣或分辨率的取舍；②加窗会让幅值整体缩水，定量分析要除以相干增益；③两端压低意味着信号首尾信息被削弱，短记录尤其明显。

### 90 · 多速率处理与重采样

- 文件：`90-multirate-resampling.md`
- 核心概念：抽取降采样率必须先抗混叠低通；插值升采样率要补零再加平滑镜像滤除。
- 边界：讲整数倍抽取/插值与滤波器顺序铁律；不讲分数倍重采样的多相实现。
- 组件：`sampling-lab` 回扣（降采样就是它滑块调低的场景）+ 浮窗 Python 抽取实验。
- 判题 exercise：x[n]=cos(2π·6n/24)（fs=24 Hz 的 6 Hz 音），每 4 点取 1，打印 `抽取后：[1.0, 1.0]` 与 `混叠到：0.0 Hz`（折叠公式复用 10 课）。初始代码不做任何检查直接宣称「6 Hz 安全」（新采样率 6 Hz 下它恰折叠到 0）。
- 必写误区：①先滤后抽不可交换，顺序错了污染无法逆转；②抽取后的「安全」要看新奈奎斯特率，不看旧的；③插值补零产生的镜像是真实能量，不平滑掉会听到哨音。

### 100 · 自适应滤波选讲

- 文件：`100-adaptive-filtering.md`
- 核心概念：LMS 用瞬时误差梯度微调权系数，滤波器自己学出形状。
- 边界：讲单步 LMS 更新与权向量演化的直觉；不讲收敛性证明与 RLS 家族。
- 组件：浮窗 Python 为主（matplotlib 画误差下降曲线）+ `filter-designer` 对照固定滤波器的局限。
- 判题 exercise：u=[1,0.5,0.25]、d=0.4、μ=0.08、w 从零起步做一次更新，打印 `误差 = 0.4` 与 `新权系数：[0.03, 0.02, 0.01]`（round 两位）。初始代码把 μ 加成了减（权往负走），能跑但方向反了。
- 必写误区：①学习率太大振荡发散，不是越大越快越好；②自适应滤波学的是「期望关系」，输入与噪声无关性破坏时学歪；③本课是选讲，收敛理论不在考试范围。

### 110 · DSP 方法地图

- 文件：`110-method-map.md`
- 核心概念：把十一课收拢成「拿到任务→选工具」的决策树。
- 边界：讲方法选择逻辑与新问题演练；不引入任何新数学。
- 组件：全章组件速览（每个渲染器露一次脸，静态截图式调用）。
- 判题 exercise：仿照第 29 章方法地图（120 课）的推荐器风格，实现 `recommend(task)` 返回工具名：去毛刺保趋势返回 `moving-average`，看有哪些频率返回 `spectrum`，降采样前必备步骤返回 `anti-aliasing`。三个 print 对应三行 @check（`moving-average` / `spectrum` / `anti-aliasing`）。初始代码全部分支返回 `"wrong"`。
- 必写误区：①工具选择先问「时域还是频域问题」再问参数；②同一滤波需求常有 FIR/IIR 两条路，按算力与稳定性裁决；③方法地图是导航不是替代推导。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | dsp/sampling-aliasing | fourier/dft, trig/beats | 4 | sampling-theorem, aliasing |
| 18 | dsp/convolution-lti | dsp/sampling-aliasing, sequences/sigma | 4 | convolution, lti-system |
| 19 | dsp/impulse-response-difference-eq | dsp/convolution-lti | 4 | impulse-response, difference-equation |
| 20 | dsp/z-transform-poles | dsp/impulse-response-difference-eq, complex/polar | 4 | z-transform, pole-zero |
| 21 | dsp/fir-iir-filters | dsp/z-transform-poles | 4 | fir-filter, iir-filter |
| 22 | dsp/dft-leakage | fourier/dft, dsp/fir-iir-filters | 4 | spectral-leakage |
| 23 | dsp/fft-divide-conquer | dsp/dft-leakage | 4 | fft |
| 24 | dsp/windows-time-frequency | dsp/dft-leakage | 4 | window-function |
| 25 | dsp/multirate-resampling | dsp/sampling-aliasing, dsp/windows-time-frequency | 4 | decimation, upsampling |
| 26 | dsp/adaptive-filtering | dsp/fir-iir-filters, linalg-advanced/least-squares | 5 | lms-adaptive-filter |
| 27 | dsp/method-map | dsp/adaptive-filtering | 3 | （空） |

import 登记：全章只用 `math` 与 matplotlib（均已登记）；若 90/100 课用 `random` 造测试数据，在该课 front matter 登记 `[random]`。禁 input()/while True；DFT/卷积循环规模 ≤64×64。

## 6. 整章验收清单

1. 五个新 renderer 注册进 `RENDERERS` 且 validate 可识别，签名守卫防 MutationObserver 重注入。
2. 每课至少两个可视化（定制 viz 或滑块 python），判题 exercise 初始代码能运行但不通过，独立解法与 `@check` 逐字一致（浮点行必须 round 后比对）。
3. 每课 quiz、误区卡、选读边界齐备；60/70/80 三课互相引用形成泄漏-窗-FFT 小闭环。
4. 不出现 numpy/cmath/scipy；所有公式显示态单行、花括号用 `\lbrace\rbrace`。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；h2 源码/产物计数一致。
6. 浏览器实测五组件拖拽、浮窗三类块与路由切换；360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
