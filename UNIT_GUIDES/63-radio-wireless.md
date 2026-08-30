# 第 63 章 · 无线电与无线信道 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 12 门正式课已全部建成齐线（方法地图已于本轮回填补上 95 号位）。
> 目标：12 门课题全部落盘。
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L9 / track scientific-computing + optimization-control / stage research-elective / difficulty 4

## 1. 章定位

无线电把信号交给空间：距离、地形、天线、噪声、反射体和移动速度共同决定一个比特能否抵达。主线推进：

```text
传播机制 → 天线增益 → Friis 链路预算 → 噪声级联 → 大尺度损耗 → 阴影衰落 → 多径时延 → Doppler → 小尺度衰落统计 → 分集/OFDM → 蜂窝复用
```

两条贯穿线：①**dB 是本章的母语**——30 课建立 dB 记账法后，后续每课的数字都必须走同一套加减流水；②大尺度（平均规律）与小尺度（随机起伏）的分界反复出现，70 课用概率统计收网。与第 62 章分工：本章管「信号在空间里发生什么」，调制与同步全部引用不重讲；与第 36 章概率进阶分工：Rayleigh/Rician 只给分布形状与工程含义，不推导概率密度积分。

## 2. 前置覆盖

- `trig/wave-anatomy`、`trig/radian`：波、相位与角度制——10/20/65 课的地基。
- `exponents/log`、`exponents/sci-notation`：对数与数量级——dB 体系的出生证明。
- `geometry/pythagoras`、`geometry/angle-triangle`：距离与几何视线判断。
- `prob/stats`、`prob/law`：均值方差与大数定律；`prob/data-charts`：直方图读法。
- `functions/linear`：对数距离模型的直线化读图。
- `trig/beats`：多径叠加即拍频思想的空间版。
- `statistics.NormalDist` 为新工具：55 课首次使用须中文注释并登记 `[statistics]`。

Python：只用已登记 `math` 与 matplotlib；蒙特卡洛实验用 `random` 的课照常登记。禁 input()/while True。

## 3. 组件清单（新增 5 个定制渲染器）

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `wavefront-propagation` | 波前圆环动画 + 四种传播机制切换 | 10（主）、60 多径回看 |
| `antenna-pattern` | 极坐标方向图，阵列参数实时重塑 | 20（主）、80 扇区化回看 |
| `link-budget-lab` | dB 流水账滑块台 + 余量仪表 | 30（主）、40/50 复用公式 |
| `multipath-fading` | 衰落时间序列 + 直方图 + K 因子调节 | 70（主）、65 Doppler 回看 |
| `cellular-reuse` | 六边形蜂窝着色 + 同频干扰几何 | 80（主） |

### 可实现规格

**wavefront-propagation**
- spec 字段：`{ "type": "wavefront-propagation", "title": "...", "mechanism": "los", "frequencyMhz": 900, "distance": 100 }`；`mechanism`: `"los"` / `"reflection"` / `"diffraction"` / `"scattering"`。
- 画布：俯视 2D 地图：左侧发射塔图标发出同心扩张圆环（半径随时间增长、透明度衰减），右侧接收机图标；按机制叠加固定障碍物——reflection 画一面斜墙并高亮折线路径，diffraction 画刀刃边缘并画出绕过棱角的弯曲路径，scattering 画一片粗糙点阵向各方向溅射短线。每条路径旁标注相对长度与损耗条。
- 交互：机制下拉框、frequencyMhz 滑块（影响绕射弯曲程度与每环损耗）、沿地图拖动接收机改 distance（pointer 拖拽，x 轴投影为距离）；「显示多径叠加」开关让反射+直射同时存在并画干涉色带。
- 动画：圆环持续外扩（播放/暂停，离屏暂停；reduced-motion 显示三圈静态环）。

**antenna-pattern**
- spec 字段：`{ "type": "antenna-pattern", "title": "...", "elements": 4, "spacing": 0.5, "steerDeg": 0 }`；`elements` 1–8，`spacing` 单位波长 0.1–1.5，`steerDeg` 相位步进 −180..180（波束指向）。
- 画布：极坐标 dB 方向图（外圈 0 dB、内圈 −20 dB 刻度环）：单阵元方向图 × 阵列因子合成闭合曲线填充半透明；主瓣宽度（−3 dB 夹角）与最大旁瓣电平自动标注；左下角小插图画阵列物理排布（点阵 + 当前相位箭头）。
- 交互：三滑块实时重绘；指针悬停任一角度显示该方向增益读数（一条可拖动扫描线）；「对比偶极子」按钮叠加基准虚线。
- 动画：无强制动画；可选雷达式扫描线旋转开关（默认关，reduced-motion 下禁用）。

**link-budget-lab**
- spec 字段：`{ "type": "link-budget-lab", "title": "...", "ptxDbm": 30, "distanceKm": 1, "freqMhz": 900, "gtxDbi": 0, "grxDBi": 0, "sensitivityDbm": -100 }`。
- 画布：纵向瀑布记账表：发射功率逐行减去自由空间损耗（FSPL 由 d、f 实时计算）、馈线损耗、加天线增益，落到接收功率一行；右侧大号余量仪表盘（接收功率 − 灵敏度），绿/黄/红三区配色，负值整表变红闪一次。底部迷你对数距离曲线标出当前工作点。
- 交互：七个量全部滑块；预设按钮 GSM/WiFi/卫星一键填参；所有改动即时重算并在表尾显示 FSPL 中间值。
- 动画：数值变化时的补间滚动（200 ms，纯装饰；reduced-motion 直接跳终值）。除此之外是静态计算器型组件。

**multipath-fading**
- spec 字段：{ "type": "multipath-fading", "rays": 8, "kFactor": 0, "speedMs": 5, "thresholdDb": -10 }；`rays` 2–16 条等幅或高斯幅度随机相位的正弦相量；`kFactor` 0–10 决定是否加入一条主导直射径；`speedMs` 折算 Doppler 决定时间轴快慢。
- 画布：上幅：接收幅度 |r(t)| 时间序列滚动窗口（约 400 个采样点可见，向左流动），门限横线与穿越次数计数；下幅：同批样本的直方图叠 Rayleigh（K=0）或 Rician（K>0）参考曲线（归一化形状，非拟合）。右上小罗盘：各径相量实时旋转合成的动画指针。
- 交互：四滑块 + 「暂停采集」按钮；hover 时间序列显示瞬时值与当前相量和分解。
- 动画：核心即连续动画（时间序列流动 + 相量旋转），必须离屏暂停；reduced-motion 输出一段预生成序列的静态截图与直方图。

**cellular-reuse**
- spec 字段：`{ "type": "cellular-reuse", "clusterN": 7, "pathLossExp": 3.5 }`；`clusterN` 仅允许 1/3/4/7。
- 画布：7×7 六边形网格按簇图案着色（N 种颜色循环复用），中心小区放一个可拖动的移动台圆点；同频小区以粗描边高亮并可开关连线到移动台；侧栏读出最近同频距离 D 与估算 S/I = (D/R)^γ（γ 即 pathLossExp）及一根 S/I 仪表条（阈值线画在 18 dB 参考处）。
- 交互：clusterN 下拉、γ 滑块、拖动移动台看 S/I 随位置连续变化（越靠近本小区基站越高）；「隐藏颜色只看干扰」模式帮助理解同频几何。
- 动画：无强制动画；选中小区轻微脉冲高亮可省略。

验收：五个 renderer 注册进 `RENDERERS`，签名守卫防重复注入，亮暗主题可读；三个含持续动画的组件（wavefront/multipath/可选扫描线）统一走 `addAnimationControls` 规范。

## 4. 十二门课题切分

### 10 · 无线电波与传播机制

- 文件：`10-propagation-mechanisms.md`
- 核心概念：直射、反射、绕射、散射四种机制决定能量如何绕过障碍抵达接收机。
- 边界：讲四种机制的几何画面与频率依赖定性规律；不讲菲涅尔区积分与 UTD 一致性绕射理论。
- 组件：`wavefront-propagation`（主）+ 已有 `wave` 回扣波动性。
- 判题 exercise：功率随距离平方反比，距离变为 3 倍时损耗增量 $20\log_{10}3$，打印 `距离变三倍损耗增加 = 9.5 dB`（round 一位）。初始代码系数写成 10 得 4.8。
- 必写误区：①频率越高越接近光直线走，绕射能力越弱；②反射不是吸收，多径恰恰来自反射；③「看得见」不等于「传得到」，还要看损耗与噪声。

### 20 · 天线方向性与增益

- 文件：`20-antenna-gain.md`
- 核心概念：天线把能量攒成方向束，方向图刻画各方向增益；阵列用间距与相位差电子转向。
- 边界：讲方向图读法、dBi 含义与均匀直线阵的波束控制直觉；不讲互阻抗与馈电网络设计。
- 组件：`antenna-pattern`（主）。
- 判题 exercise：口径 D=1 m、f=2.4 GHz（λ=0.125 m）抛物面增益 G=(πD/λ)²，打印 `抛物面增益 = 28.0 dB`（先线性后取 dB，round 一位）。初始代码漏平方得 14.0。
- 必写误区：①增益不是放大器凭空造能，是把别的方向挪过来；②dBi 基准是无方向理想天线，dBd 差 2.15；③间距超过 λ 会长出栅瓣，能量跑错方向。

### 30 · Friis 公式与链路预算

- 文件：`30-friis-link-budget.md`
- 核心概念：Friis 自由空间损耗公式 + 收发两端增益记账 = 接收功率；余量为正是开通判据。
- 边界：讲 dB 加减流水与 FSPL 工程式（32.44 常数版）；不讲天线有效孔径推导。
- 组件：`link-budget-lab`（主）+ 已有 `plot` 画损耗-距离对数曲线。
- 判题 exercise：d=1 km、f=900 MHz，FSPL=20log₁₀(d)+20log₁₀(f)+32.44，Ptx=30 dBm，打印 `自由空间损耗 = 91.5 dB`、`接收功率 = -61.5 dBm`（均 round 一位）。初始代码常数写成 22.44。
- 必写误区：①dBm 减 dB 得 dBm，单位混加是最高频事故；②频率翻倍同样距离损耗加 6 dB，5G 毫米波要靠密集组网补；③链路预算是必要条件，衰落余量没留照样掉线（后面课回收）。

### 40 · 噪声系数与级联损耗

- 文件：`40-noise-figure-cascade.md`
- 核心概念：Friis 级联公式说明第一级低噪放 dominates，后级噪声被前级增益压扁。
- 边界：讲两级级联 F 公式与等效噪声温度一句话；不讲多级优化算法与器件噪声模型。
- 组件：浮窗 Python 数值实验为主 + `link-budget-lab` 把 NF 并进余量表。
- 判题 exercise：F1=2、G1=100、F2=6，F=F1+(F2−1)/G1=2.05，打印 `级联噪声系数 = 3.12 dB`（round 两位）。初始代码把两个 NF 的 dB 值直接相加得 10.8。
- 必写误区：①dB 不能直接相加求级联 NF，必须回线性域；②第一级的增益是盾牌，先衰减再放大就救不回来了；③插损也是「负增益」，会抬高整链 NF。

### 50 · 大尺度路径损耗模型

- 文件：`50-path-loss-models.md`
- 核心概念：真实环境用对数距离模型 PL(d)=PL(d₀)+10n·log₁₀(d/d₀)，指数 n 概括环境。
- 边界：讲 n 取值经验范围与测量拟合思路；不讲射线追踪与标准宏模型（COST231 点名即可）。
- 组件：已有 `plot` 画不同 n 的损耗曲线族 + `link-budget-lab` 换用 n 幂律模式对照。
- 判题 exercise：PL(1km)=90 dB、n=3.5，求 d=4 km 处损耗，打印 `4 km 处路径损耗 = 111.1 dB`（round 一位）。初始代码 n 固定用 2。
- 必写误区：①n 不是物理常数是拟合结果，换街区就要重新测；②自由空间 n=2 是下限，城市常在 3–4；③参考点 d₀ 要选在远场，室内拿 1 米当 d₀ 会系统性偏差。

### 55 · 阴影衰落与对数正态模型

- 文件：`55-shadowing-lognormal.md`
- 核心概念：同样距离下损耗围绕均值随机晃动，dB 域呈正态（对数正态）；覆盖设计要预留 σ 余量。
- 边界：讲 σ、分位点余量 zσ 与覆盖率的关系；不讲相关阴影场的空间相关性建模。
- 组件：浮窗 Python（random.gauss 撒直方图对照钟形，登记 random）+ `link-budget-lab` 加一行「阴影余量」演示吃掉余量的过程。
- 判题 exercise：σ=8 dB，要求 90% 位置覆盖率，margin=z·σ，z 用 statistics.NormalDist().inv_cdf(0.9) 求，打印 `阴影余量 = 10.3 dB`（round 一位；inv_cdf(0.9)≈1.2816，积≈10.25 向上舍入）。初始代码直接用 σ 当余量得 8.0。
- 必写误区：①阴影是慢变量（跨几十米相关），别和小尺度快衰落混谈；②「平均达标」≠「九成地点达标」，余量就是买保险；③对数正态指 dB 域正态，线性域严重右偏。

### 60 · 多径、时延扩展与相干带宽

- 文件：`60-delay-spread-coherence.md`
- 核心概念：多条路径不同到达时间把信号「拖尾」；RMS 时延扩展的倒数尺度上给出相干带宽。
- 边界：讲功率时延谱、均值/RMS 时延扩展定义与 Bc≈1/(5στ) 经验式；不讲信道抽头建模的统计估计。
- 组件：`wavefront-propagation` 开多径叠加回看几何 + 浮窗 Python 计算给定 PDP 的 στ。
- 判题 exercise：时延 [0,1,3] μs、功率 [0.5,0.3,0.2]，算 RMS 时延扩展与相干带宽，打印 `RMS 时延扩展 = 1.14 微秒`（round 两位）、`相干带宽 ≈ 176 kHz`（Bc*1000 round 取整）。初始代码用最大时延 3 当扩展得 67 kHz。
- 必写误区：①时延扩展看的是功率加权的散布，不是最晚那一条；②信号带宽 > 相干带宽才会频率选择性失真，窄带系统安然无恙；③拖尾是同一信号的多份拷贝，不是回声噪声。

### 65 · Doppler 展宽与相干时间

- 文件：`65-doppler-coherence-time.md`
- 核心概念：移动让每条径产生频移 fd=(v/λ)cosθ，多径频移散布导致信道自身随时间变化。
- 边界：讲最大多普勒频移、多普勒谱展宽画面与 Tc≈0.423/fd 经验式；不做 Jakes 谱推导。
- 组件：`multipath-fading` 提前登场（speedMs 滑块观察序列快慢）+ 已有 `beats` 回扣频移叠加。
- 判题 exercise：v=20 m/s、f=900 MHz，fd_max=v/λ，60 度入射角再乘 cosθ，打印 `最大多普勒频移 = 60.0 Hz`、`60 度入射角 = 30.0 Hz`（均 round 一位；λ=c/f 先算）。初始代码除成 f/λ。
- 必写误区：①频移有正负取决于迎面还是远离，展宽才是整体效果；②步行速度的几十赫兹对语音无害，对子载波窄的 OFDM 是灾难；③相干时间内才可视为信道不变，这给导频密度定节奏。

### 70 · Rayleigh 与 Rician 衰落

- 文件：`70-rayleigh-rician-fading.md`
- 核心概念：无直射径时包络服从 Rayleigh 分布（深衰落常见）；有主导径时变 Rician，K 因子度量主导强度。
- 边界：讲两分布形状、K 因子含义与中断概率查表用法；不推导概率密度与矩函数。
- 组件：`multipath-fading`（主战场：kFactor 从 0 拉起看直方图从瑞利滑向莱斯）。
- 判题 exercise：Ω=1 归一化瑞利包络，P(r<1)=1−e^(−1)，打印 `瑞利衰落低于门限概率 = 0.632`（round 三位）。初始代码指数符号写反得负概率。
- 必写误区：①深衰落 20–30 dB 是常态不是故障，链路预算必须为此留衰落余量；②平均信噪比相同，有无直射径的中断表现天差地别；③分贝域的「正态」是阴影课的事，本课是线性包络域。

### 75 · 分集、均衡与 OFDM 直觉

- 文件：`75-diversity-equalization-ofdm.md`
- 核心概念：对抗衰落的三大件——分集（多条独立路赌不一起坏）、均衡（逆滤波补偿拖尾）、OFDM（把宽带拆成一堆窄带正交子载波）。
- 边界：讲三种思想的直觉与适用场景；不讲 MMSE 权求解与 FFT 实现细节。
- 组件：已有 `sines` 演示正交子载波互不干扰 + 浮窗 Python 两支路联合中断率模拟。
- 判题 exercise：单支路中断率 p=0.1，两独立支路联合中断 p²，打印 `两支路中断概率 = 0.01`（round 四位）；子载波间隔 1 kHz、带宽 1 MHz，打印 `1 MHz 可容子载波 = 1000 个`。初始代码把 p+p 当联合概率得 0.2。
- 必写误区：①分集收益来自「独立」，两副贴在一起的天线几乎白装；②均衡放大深谷处的噪声，不是免费复原；③OFDM 用循环前缀吃掉拖尾，代价是吞吐率打折。

### 80 · 蜂窝复用与干扰几何

- 文件：`80-cellular-reuse.md`
- 核心概念：频率隔开足够距离重复使用，D/R=sqrt(3N) 给出复用距离，S/I≈(3N)^{γ/2} 给出干扰底。
- 边界：讲簇结构、复用因子与 S/I 缩放律；不讲扇区化天线下倾与频率规划软件。
- 组件：`cellular-reuse`（主）+ `antenna-pattern` 回扣扇区分裂波束。
- 判题 exercise：N=7、γ=4，打印 `复用距离比 = 4.58`（sqrt(21) round 两位）、`同频干扰比 ≈ 441`（(3N)^{γ/2} 格式化为整数）。初始代码 sqrt(N) 得 2.65。
- 必写误区：①复用因子越大容量越稀但干扰越小，是权衡不是优劣；②S/I 公式的 γ 用的是当地实测路径损耗指数；③六边形是解析便利，真实小区是不规则梅干形。

### 90 · 无线系统方法地图

- 文件：`90-method-map.md`
- 核心概念：按「问题发生在哪一环」选工具的决策复盘。
- 边界：讲方法选择与新场景演练；不引入新数学。
- 组件：全章五组件速览串联。
- 判题 exercise：实现 `recommend(task)`：算够不够得通返回 `link-budget`，信号忽强忽弱秒级抖动返回 `small-scale-fading`，规划频率间隔返回 `reuse-plan`。三个 print 对应三行 @check（`link-budget` / `small-scale-fading` / `reuse-plan`）。初始分支全返回 `"wrong"`。
- 必写误区：①先分大尺度还是小尺度问题再动手；②dB 记账贯穿一切环节，任何一处单位混用全表作废；③方法地图不替代测量，参数最终来自现场。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | radio/propagation-mechanisms | trig/wave-anatomy, exponents/log | 3 | wavefront, multipath |
| 18 | radio/antenna-gain | radio/propagation-mechanisms, trig/radian | 4 | antenna-pattern, antenna-gain |
| 19 | radio/friis-link-budget | radio/antenna-gain | 4 | friis-equation, link-budget |
| 20 | radio/noise-figure-cascade | radio/friis-link-budget | 4 | noise-figure |
| 21 | radio/path-loss-models | radio/friis-link-budget | 4 | path-loss-exponent |
| 55 | radio/shadowing-lognormal | radio/path-loss-models, prob/stats | 4 | lognormal-shadowing, fade-margin |
| 22 | radio/delay-spread-coherence | radio/propagation-mechanisms, trig/beats | 4 | delay-spread, coherence-bandwidth |
| 65 | radio/doppler-coherence-time | radio/delay-spread-coherence | 4 | doppler-shift, coherence-time |
| 23 | radio/rayleigh-rician-fading | radio/doppler-coherence-time, prob/stats | 5 | rayleigh-fading, rician-k-factor |
| 75 | radio/diversity-equalization-ofdm | radio/rayleigh-rician-fading | 4 | diversity, ofdm |
| 24 | radio/cellular-reuse | radio/path-loss-models, geometry/pythagoras | 4 | frequency-reuse, co-channel-interference |
| 25 | radio/method-map | radio/cellular-reuse | 3 | （空） |

import 登记：55 课登记 `[statistics]`（NormalDist.inv_cdf，首现必注释）；55/75 若用 random 撒样登记 `[random]`；其余只用 math/matplotlib。difficulty 主干 4，70 课（章内统计高峰）5。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；`wavefront-propagation`/`multipath-fading` 连续动画组件必须离屏暂停 + reduced-motion 静态模式。
2. 每课一个判题 exercise，初始代码能运行但不通过；@check 期望输出与本指南所列逐字一致（浮点一律 round 后比对，负数格式注意 `-61.5` 的连字符）。
3. dB 记账一致性专项检查：30/40/50/55/80 五课出现的损耗/增益数字能在 `link-budget-lab` 里复现。
4. 与第 62 章（调制同步）、36 章（概率推导）的分界声明出现在对应课正文一句带过。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；h2 源码/产物计数一致；显示公式单行、花括号 `\lbrace\rbrace`。
6. 浏览器手测：五组件拖拽/滑块、蜂窝拖动 S/I 实时刷新、路由往返无重复注入、360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
