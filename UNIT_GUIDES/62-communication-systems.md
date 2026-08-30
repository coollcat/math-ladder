# 第 62 章 · 通信系统 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 11 门正式课已建成（10/20/30/40/50/60/70/80/85/90/100）；规划名与落盘名有出入，以磁盘为准
> 目标：11 门正式课（磁盘已齐线）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L11 / track information-learning + scientific-computing / stage research-elective / difficulty 4

## 1. 章定位

本章把「发消息」拆成一条可计算的流水线：消息变信号、信道变概率模型、接收变判决。主线推进：

```text
收发链路 → 基带码型 → ASK/FSK/PSK → QAM 星座 → AWGN 与眼图 → 匹配滤波判决 → 同步闭环 → 差错控制回望 → 香农容量 → 扩频多址（选讲）
```

两条贯穿线：①星座图把复数、旋转、概率焊在一台仪器上（40 课后每课都回星座）；②每个环节都回答「噪声进来后哪里先坏」。与第 40 章信息论分工：本 章**用**熵与容量的结论做工程判断，不重证香农定理；与第 35 章编码理论分工：80 课只回望复用，编码细节全部引用既有课。

## 2. 前置覆盖

- `coding-theory/channel-model`、`coding-theory/repetition-code`：信道与冗余的初等模型——10/80 课直接引用。
- `complex/plane`、`complex/polar`、`complex/multiplication`：IQ 平面即复平面，调制即旋转。
- `trig/wave-anatomy`、`trig/beats`：载波、相位与拍频语言。
- `fourier/spectrum`：带宽的频谱读法。
- `linalg/dot-product`：相关接收=投影打分的地基。
- `prob/stats`、`prob/law`：均值方差与大数定律——眼图直方图与误码率统计要用。
- `exponents/log`：对数与 dB 换算的出生地（50 课首现换算公式时回链）。

Python：只用已登记 `math`；55 类高斯噪声实验可用 `random.gauss`（该课登记 `[random]`）。禁 input()/while True。

## 3. 组件清单（新增 5 个定制渲染器）

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `source-channel-map` | 点击式收发流水线地图，令牌穿行动画 | 10（主），后续各课导航回扣 |
| `constellation-lab` | M-QAM 星座+噪声云+判决边界 | 40（主）、30/50 复用 |
| `noise-eye-diagram` | 示波器式眼图叠加，SNR/带宽可调 | 50（主）、20 回看码型 |
| `matched-filter` | 相关器扫描动画 + 蒙特卡洛判决计数 | 60（主）、70 定时复用 |
| `sync-probe` | 星座旋转 + PLL 追相环 + 定时早迟门 | 70（主） |

### 可实现规格

**source-channel-map**
- spec 字段：`{ "type": "source-channel-map", "title": "...", "noise": 0.2 }`；`noise` 滑块 0–1 控制信道段扭曲程度。阶段序列固定内置（信源→信源编码→信道编码→调制→信道→解调→信道解码→信源解码→信宿）。
- 画布：横向九个圆角盒子，盒子间箭头上有小方点令牌流动；「信道」盒子画成毛边噪区，noise 大时令牌过境时抖动变形。点击任一盒子，下方文字行显示该环节一句话职责（文案表内置于渲染器，中文）。
- 交互：点击选盒、noise 滑块；悬停高亮上下游两个相邻盒。
- 动画：令牌匀速流动（播放/暂停按钮，离屏暂停，reduced-motion 静态显示一行令牌）。

**constellation-lab**
- spec 字段：`{ "type": "constellation-lab", "title": "...", "order": 16, "sigma": 0.15, "phase": 0 }`；`order` 仅允许 4/16/64（正方形 QAM）；`phase` 为整体旋转角（度）。
- 画布：IQ 坐标面（两轴 −4..4），标准 QAM 格点画实心点并标注格雷码位串（可开关）；每次「接收一批」在理想点周围撒高斯散点（半透明累积，上限 500 点防卡顿）；判决边界画成网格虚线；错判点标红计数。
- 交互：order/sigma/phase 三滑块，「发送 200 符号」按钮，边界与位串显示开关；读出行显示理论最近邻距离与实测误码率。
- 动画：无强制连续动画；撒点用一次性批量绘制（避免逐帧循环）。

**noise-eye-diagram**
- spec 字段：`{ "type": "noise-eye-diagram", "title": "...", "snrDb": 12, "bandwidth": 0.6, "pulse": "nrz" }`；`bandwidth` 0.2–1 归一化低通带宽控制码间串扰；`pulse`: `"nrz"` / `"raised-cosine"`。
- 画布：左侧示波器式叠加区：随机比特流的许多 2 符号片段重叠描线（描线上限 120 条，超出淡出最旧），中央竖线为最佳采样时刻，水平中线为判决门限；右侧为采样时刻幅度直方图（双峰）。顶部读出「眼高/眼宽」估计值。
- 交互：snrDb、bandwidth 滑块，pulse 切换，「清屏重扫」按钮。
- 动画：描线逐条追加的持久示波器效果（requestAnimationFrame 节流，离屏暂停；静态模式一次画满 60 条）。

**matched-filter**
- spec 字段：`{ "type": "matched-filter", "title": "...", "waveform": "rect", "snrDb": 6, "threshold": 0.5 }`；`waveform`: `"rect"` / `"barker7"`（七位巴克码）。
- 画布三横带：发送模板 s(t)；接收 r(t)=±s(t)+噪声；相关输出 ∫r·s 随滑窗位置累加的曲线，峰值处立旗标，门限横线可调。右上计数板：「正确检测/漏检/虚警」三格，随试验次数累加。
- 交互：snrDb、threshold 滑块，waveform 切换，「连跑 100 次」蒙特卡洛按钮刷新计数板。
- 动画：相关窗口滑动扫描动画（单次约 3 秒，可暂停；静态模式直接显示完整相关曲线与峰值）。

**sync-probe**
- spec 字段：`{ "type": "sync-probe", "title": "...", "freqOffset": 0.05, "phaseOffset": 1.2, "loopGain": 0.08 }`；`freqOffset` 单位 rad/帧。
- 上画布：迷你星座（QPSK 四点）：接收点因频差整体缓慢旋转，PLL 补偿箭头以 loopGain 追踪角度误差，锁定后旋转停住、点云对齐理想位；下方角度误差条实时显示。下画布：符号定时眼图轨迹左右漂移，早/迟门两根采样针逐渐夹向眼睛中心。
- 交互：三个偏移量滑块（拖动即破坏锁定）、「注入相位跳变」按钮观察重新捕获；loopGain 过大时展示振铃失锁。
- 动画：本组件核心就是连续动画（锁捕过程），必须实现暂停与 reduced-motion 静态终态（直接画出锁定后的对齐状态）。

验收：五个 renderer 注册进 `RENDERERS`，dataset 签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费；所有随机撒点固定用可设种子的伪随机或限流绘制，避免低端设备卡顿。

## 4. 十一门课题切分

### 10 · 通信链路与收发模型

- 文件：`10-link-model.md`
- 核心概念：发射机-信道-接收机三段式；波特率与比特率由 $\text{R}_b=\text{R}_s\log_2 M$ 相联。
- 边界：讲链路分段职责与速率换算；不讲具体硬件实现与协议栈分层。
- 组件：`source-channel-map`（主）。
- 判题 exercise：Rs=1200 波特、M=8，打印 `比特率 = 3600.0 bps`（math.log2 参与，浮点输出）。初始代码写成 `Rs * M` 得 9600，能跑但错。
- 必写误区：①波特是符号率不是比特率，两者差 log₂M 倍；②信道不是导线，是有损有噪的数学对象；③信源编码压冗余、信道编码加冗余，方向相反不矛盾。

### 20 · 基带信号与码型

- 文件：`20-baseband-line-coding.md`
- 核心概念：比特如何铺成波形（NRZ/曼彻斯特）；跳变密度决定时钟恢复能力。
- 边界：讲 NRZ 与曼彻斯特两种码型的波形与跳变统计；不讲 HDB3/AMI 等电信码型族谱。
- 组件：`noise-eye-diagram` 回看（NRZ 无噪声基线眼型）+ 浮窗 Python 画码型波形。
- 判题 exercise：bits=[1,0,1,1,0,0]，统计 NRZ 相邻电平跳变次数并给曼彻斯特下限，打印 `NRZ 跳变次数 = 3`、`曼彻斯特跳变下限 = 6`。初始代码把「相同也算跳变」计成 5。
- 必写误区:①长连零让 NRZ 时钟失锁，这正是曼彻斯特存在的理由；②码型不改变信息量只改变波形；③基带≠低频废话，指不搬移载波。

### 30 · ASK、FSK 与 PSK

- 文件：`30-ask-fsk-psk.md`
- 核心概念：分别让幅度、频率、相位携带比特；抗噪性 PSK>FSK>ASK 的直觉排序。
- 边界：讲二进制三种调制的波形映射与 BPSK 相位表；不讲多进制 ASK 与相干/非相干解调差异证明。
- 组件：已有 `sines`/`wave` 展示三类波形 + `constellation-lab`（order=4 当 QPSK 预告）。
- 判题 exercise：bits=[1,0,1] 按 bit→180°/0° 映射 BPSK，打印 `BPSK 相位序列 = [180, 0, 180]`、`QPSK 符号数 = 4`。初始代码映射表写反（0→180）。
- 必写误区：①PSK 的信息在相位跳变处，看包络看不出比特；②ASK 最省事但一遇衰减就崩；③「180 度模糊」预告 70 课同步问题。

### 40 · QAM 星座图

- 文件：`40-qam-constellation.md`
- 核心概念：IQ 平面上同时调幅调相，M-QAM 用格点距离换取比特密度。
- 边界：讲星座、格雷映射思想与平均能量计算；不讲成形增益与非方形星座。
- 组件：`constellation-lab`（主）+ 已有 `complexplane` 回扣 IQ 即复平面。
- 判题 exercise：电平表 [-3,-1,1,3]，双层循环求 16-QAM 平均符号能量，打印 `平均符号能量 = 10.0`。初始代码用最大能量 18 充数。
- 必写误区：①星座点间距离才是抗噪资本，点越密越容易错；②能量取平均不是取峰值；③格雷编码让相邻点只差 1 比特，错一个符号只坏一个比特。

### 50 · AWGN、SNR 与眼图

- 文件：`50-awgn-snr-eye.md`
- 核心概念：白高斯噪声模型、dB 换算、眼图张开度=判决余量的可视化。
- 边界：讲 SNR 双向换算与眼图三要素（眼高眼宽交点）；不讲噪声的功率谱推导与匹配滤波的最优性证明（60 课讲）。
- 组件：`noise-eye-diagram`（主）+ 浮窗 Python（random.gauss 撒噪声直方图对照钟形曲线，登记 random）。
- 判题 exercise：Ps=1、Pn=0.01 求 dB，再反解 30 dB 的线性比，打印 `SNR = 20.0 dB`、`线性比 = 1000.0`（round 一位）。初始代码用 ln 代 log10。
- 必写误区：①dB 是比值不是单位，加减 dB 是乘除线性值；②眼图闭合先于误码爆发——余量是提前预警；③「平均功率」里的噪声方差对应 σ²，别拿 σ 当功率。

### 60 · 匹配滤波器与最大似然接收

- 文件：`60-matched-filter-detection.md`
- 核心概念：接收端不做波形还原而做打分：与模板的相关值越大越像；等价于白噪下的最大似然判决。
- 边界：讲内积打分、阈值判决与模板形状影响；不讲喀西比下界的推导。
- 组件：`matched-filter`（主）+ 已有 `dotprod` 回扣相关即点积。
- 判题 exercise：s=[1,1,-1]、r=[0.8,1.2,-0.9] 与模板 B=[-1,1,1] 各算相关，打印 `相关峰值 = 2.9`（round 一位）、`判决：模板 A`。初始代码用逐元素差的绝对值之和当相似度（越小越像却当越大）。
- 必写误区：①匹配滤波输出的时刻才有意义，整条曲线不必还原；②阈值放中间未必最优（先验不等时移向大概率侧）；③相关性高不代表没噪声，只是信噪比最大化。

### 70 · 载波同步与符号定时

- 文件：`70-carrier-sync-timing.md`
- 核心概念：接收机须自问两个问题——载波转了多少度、符号从哪一刻开始；PLL/早迟门用负反馈自动收敛答案。
- 边界：讲一阶 PLL 离散迭代与早迟门直觉；不讲科斯塔斯环电路与定时抖动的谱分析。
- 组件：`sync-probe`（主）+ `matched-filter` 回扣（相关峰位置即定时答案）。
- 判题 exercise：相位残差每步乘 K=0.5，初值 1.0 rad，逐步迭代到残差 <0.01，打印 `第 7 步锁定（残差 0.0078）`（round 四位）。初始代码固定打印 10 步后的最终残差不带步数。
- 必写误区：①频偏会让星座整体旋转不止停在偏角，必须反馈追踪；②环路增益太大追得猛会来回振铃；③同步失败的表现是「整片误码」，不是零星错误。

### 80 · 信道编码与差错控制回望

- 文件：`80-channel-coding-recap.md`
- 核心概念：在第 35 章工具箱里挑武器：检错（奇偶）、纠错（重复码表决、汉明码）如何在真实链路里排班。
- 边界：讲三种方案的适用场景对比与译码演示；不引入任何新码（LDPC/Turbo 只点名一句）。
- 组件：`source-channel-map` 回扣（信道编码盒点亮）+ 已有 `truth-table` 不复用、改用浮窗 Python 表决模拟。
- 判题 exercise：三重复制码收到 [(1,1,1),(0,1,0),(1,0,1)]，逐组多数表决，打印 `译码输出 = [1, 0, 1]`。初始代码用平均值四舍五入（0.667→1 会碰巧对，改成 (1,0,0) 组即翻车），改为严格多数比较。
- 必写误区：①编码冗余降低有效数据率，是花带宽买可靠；②检错和纠错是两种能力，CRC 只报错不改错；③级联顺序：内码先扛硬错误，外码扫尾。

### 85 · 信道容量与香农极限

- 文件：`85-channel-capacity.md`
- 核心概念：$C=B\log_2(1+S/N)$ 是带宽与信噪比换可靠传输的天花板。
- 边界：讲公式使用与工程推论（带宽换功率）；不复述定理证明（留给 260 信息论）。
- 组件：已有 `plot` 画 C/SNR 曲线（expr 含 log2 由正文给出换算说明，或用浮窗 matplotlib）+ `constellation-lab` 对照「点再密也超不过 C」。
- 判题 exercise：B=3000 Hz、SNR=30 dB，打印 `信道容量 ≈ 29902 bps`（round 取整）与 `谱效率 = 9.97 bps/Hz`（round 两位）。初始代码忘写 1+（log2(1000) 得 29897）。
- 必写误区：①C 是上界不是保证，达到它需要接近无限的编码复杂度；②dB 忘了换线性是最常见事故；③带宽翻倍在低 SNR 下比功率翻倍更划算，反之在高 SNR 区不成立。

### 90 · 扩频与多址选讲

- 文件：`90-spread-spectrum.md`
- 核心概念：用宽码片序列摊薄能量换取抗窄带干扰与多址能力，处理增益量化收益。
- 边界：讲处理增益公式与 CDMA 正交码思想一段话；不讲 RAKE 接收与功控闭环细节。
- 组件：浮窗 Python（扩频/解扩前后频谱对比 matplotlib）+ `source-channel-map` 回扣。
- 判题 exercise：码片率/比特率=128，打印 `处理增益 = 21.1 dB`（round 一位）。初始代码用自然对数得 48.5。
- 必写误区：①扩频不提升热噪下的容量，香农极限仍封顶；②正交码破坏（不同步）时互干扰回来；③本课选讲，重点记住「摊薄—再收集」的画面即可。

### 100 · 通信系统方法地图

- 文件：`100-method-map.md`
- 核心概念：按「瓶颈在哪」选工具的决策树复盘全章。
- 边界：讲方法选择与新场景演练；不引入新数学。
- 组件：全章组件速览串联。
- 判题 exercise：实现 `recommend(task)`：带宽紧预算松想提比特密度返回 `higher-qam`，接收端要挑最像模板返回 `matched-filter`，想知道理论天花板返回 `shannon-capacity`。三个 print 对应三行 @check（`higher-qam` / `matched-filter` / `shannon-capacity`）。初始代码分支全返回 `"wrong"`。
- 必写误区：①先诊断瓶颈（带宽/功率/同步）再选方案；②星座阶数、编码率、扩频因子互相牵制，不能各自拉满；③方法地图是导航页，参数推导回各课查。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | comm/link-model | coding-theory/channel-model, fourier/spectrum | 3 | transceiver-chain, symbol-rate |
| 18 | comm/baseband-line-coding | comm/link-model | 3 | line-coding, clock-recovery |
| 19 | comm/ask-fsk-psk | comm/baseband-line-coding, trig/wave-anatomy | 4 | ask, fsk, psk |
| 20 | comm/qam-constellation | comm/ask-fsk-psk, complex/plane | 4 | constellation, qam, gray-mapping |
| 21 | comm/awgn-snr-eye | comm/qam-constellation, prob/stats | 4 | awgn, snr, eye-diagram |
| 22 | comm/matched-filter-detection | comm/awgn-snr-eye, linalg/dot-product | 4 | matched-filter, maximum-likelihood |
| 23 | comm/carrier-sync-timing | comm/matched-filter-detection | 5 | phase-locked-loop, symbol-timing |
| 24 | comm/channel-coding-recap | coding-theory/repetition-code, comm/carrier-sync-timing | 3 | forward-error-correction |
| 85 | comm/channel-capacity | exponents/log, comm/channel-coding-recap | 4 | channel-capacity, shannon-limit |
| 25 | comm/spread-spectrum | comm/channel-capacity | 4 | processing-gain, cdma |
| 26 | comm/method-map | comm/spread-spectrum | 3 | （空） |

import 登记：仅 50 课登记 `[random]`（random.gauss）；其余只用 `math`。difficulty 主线 4，同步课 5（章内最难），入门与方法地图 3。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；`sync-probe`/`noise-eye-diagram` 两类连续动画组件必须有离屏暂停与 reduced-motion 静态模式。
2. 每课一个判题 exercise，初始代码能运行但不通过，独立解法与 `@check` 逐字一致；浮点检查一律 round 后比对（本指南给出的期望值已按 double 语义核验）。
3. 星座组件在 30/40/50/70 至少四课被真实消费，形成「一台仪器贯穿全章」的承诺兑现。
4. 与第 35/40 章的分界声明出现在 80/85 课正文（一句「详见/留待」即可），不重复推导。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；h2 计数体检通过；显示公式单行、`\lbrace\rbrace` 替代字面花括号。
6. 浏览器手测五组件交互、Alt+P 浮窗、路由往返无重复注入；360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
