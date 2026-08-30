# 卷六 · 工程与系统（68–75）课题切分与组件规格

> 单一事实来源。写正文前先读 `LESSON_TEMPLATE.md`，再读本文件对应章段。
> 新交互一律走 **`lab` 围栏**（不是 `viz`），组件实现在 `src/pyrunner/lab/components/`，引擎在 `src/pyrunner/lab/engines/`。
> 旧 `viz.js` **只读不写**（108 个组件服务现有 741 门课，禁止改动）。

## 卷六定位

前五卷回答「数学是什么」；卷六回答「数学在真实机器里怎么落地」。四域：
声（68–69）、画（70）、电（71）、算（72–73）、机（74–75）。

依赖铁律：卷六**不发明数学**，只引用。每课的 `prereqs` 必须指到前五卷已建成的课
（常见引用点：12 复数/相量、16 傅里叶、22 ODE、40 信息论、43 优化、52 控制、60 工程控制论、
61 DSP、62 通信、63 无线电、64 图形学、65 机器人、27 逻辑、29 图论、30 算法、31 自动机、
32 可计算性、34 密码、35 编码、37 随机过程、44 数值分析）。

---

## 68 音频与声学基础 `docs/68-audio-acoustics/`

引擎：`audio.js` + `dsp.js`。核心是**能听见**——组件必须能出声。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 声音是空气的压强波 | `wave-basics` | 07 三角 |
| 20 | 频率、音高与八度 | `tone-sweep` | 68-10 |
| 30 | 振幅、声压级与分贝 | `db-meter` | 03 对数 / 68-10 |
| 40 | 等响曲线：人耳不平直 | `loudness-contour` | 68-30 |
| 50 | 谐波、音色与频谱 | `spectrum-live` | 16 傅里叶 / 68-20 |
| 60 | 拍频与音程 | `beats-audio` | 68-20 |
| 70 | 包络 ADSR：声音的骨架 | `adsr-shaper` | 06 函数 / 68-30 |
| 80 | 加法合成：音色是拼出来的 | `harmonic-builder` | 16 傅里叶 / 68-50 |
| 90 | 滤波与均衡 | `eq-sweep` | 61 DSP / 68-50 |
| 100 | 共振与房间模式 | `room-modes` | 22 ODE / 68-90 |
| 110 | 混响与卷积混响 | `convolution-reverb` | 61-20 卷积 / 68-100 |
| 120 | 延迟、回声与梳状滤波 | `delay-comb` | 68-110 |
| 130 | 动态范围压缩与限幅 | `compressor-lab` | 68-30 / 68-70 |
| 140 | 立体声与双耳线索 | `panning-binaural` | 68-110 |
| 150 | 音频与声学方法地图 | — | 全章 |
| 999 | 参考资料（gen-references 产物） | — | — |

**组件要点**：全部需要「▶ 播放/■ 停止」按钮 + 首次手势解锁；`spectrum-live` 用 AnalyserNode 实时 FFT；
`convolution-reverb` 用合成脉冲响应（指数衰减噪声）做 ConvolverNode；`room-modes` 画矩形房间模态 (nx,ny,nz) 频率栅格。

---

## 69 语音与音频智能 `docs/69-speech-audio/`

引擎：`audio.js` + `dsp.js`（MFCC/LPC/自相关）+ `media.js`（语谱图画布）。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 源-滤波器模型：人是怎样发声的 | `source-filter` | 68-50 / 68-110 |
| 20 | 分帧与短时分析 | `frame-window` | 61-80 窗函数 / 69-10 |
| 30 | 语谱图：声音的照片 | `spectrogram-lab` | 61-60 DFT / 69-20 |
| 40 | 梅尔刻度与听觉滤波组 | `mel-filterbank` | 69-30 |
| 50 | MFCC：语音识别的老饭碗 | `mfcc-lab` | 69-40 |
| 60 | 基频与音高检测 | `pitch-detect` | 69-30 / 61 自相关 |
| 70 | 清浊音与端点检测 VAD | `vad-lab` | 69-60 / 69-50 |
| 80 | 线性预测 LPC | `lpc-lab` | 61-100 自适应滤波 / 69-60 |
| 90 | 声码器：把语音压缩成参数 | `vocoder-lab` | 69-10 / 69-80 |
| 100 | 心理声学与感知掩蔽 | `masking-lab` | 40 信息论 / 68-40 |
| 110 | 音频编码：MP3/AAC 的取舍 | `audio-codec-lab` | 69-100 / 35 编码 |
| 120 | 关键词唤醒与端点检测 | `wake-word-lab` | 69-50 / 46 深度学习 |
| 130 | 语音识别概貌：从 HMM 到端到端 | `asr-overview` | 37 随机过程 / 47 Transformer |
| 140 | 语音合成与神经声码器 | `tts-overview` | 49 生成模型 / 69-90 |
| 150 | 语音与音频智能方法地图 | — | 全章 |

---

## 70 图像与视频 `docs/70-image-video/`

引擎：`media.js`（帧流/DCT/块匹配）+ `dsp.js`（2D FFT 复用）。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 图像是二元函数 | `image-pixels` | 06 函数 / 20 多元 |
| 20 | 采样与量化 | `sampling-quantize` | 61-10 采样 / 70-10 |
| 30 | 色彩空间与色度子采样 | `color-space` | 11 线性代数 / 70-20 |
| 40 | 图像卷积：模糊与锐化 | `image-conv` | 61-20 卷积 / 70-10 |
| 50 | 边缘检测与梯度 | `edge-detect` | 20 多元微积分 / 70-40 |
| 60 | 图像的二维傅里叶 | `image-fft` | 16 傅里叶 / 70-40 |
| 70 | DCT 与 8×8 块：能量集中 | `dct-block` | 61-85 DCT / 70-60 |
| 80 | 量化矩阵与 JPEG 取舍 | `jpeg-quant` | 40 信息论 / 70-70 |
| 90 | 视频是图像序列：帧率 | `frame-rate` | 61-10 采样 / 70-20 |
| 100 | 帧间差分与运动检测 | `frame-diff` | 70-90 |
| 110 | 块匹配与运动估计 | `motion-estimate` | 43 优化 / 70-100 |
| 120 | 帧间预测与残差 | `inter-predict` | 70-110 / 40 信息论 |
| 130 | I/P/B 帧与 GOP | `gop-structure` | 70-120 |
| 140 | 码率控制与率失真 | `rate-distortion` | 40 香农 / 70-130 |
| 150 | 图像与视频方法地图 | — | 全章 |

---

## 71 电子电路与电子设计 `docs/71-electronics/`

引擎：`circuit.js`（MNA + Newton-Raphson + 后向欧拉 + AC 扫频）。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 电荷、电流与电压 | `charge-current` | 06 函数 |
| 20 | 欧姆定律与电阻 | `ohm-lab` | 04 代数 / 71-10 |
| 30 | 基尔霍夫定律与节点分析 | `kcl-kvl` | 11 线性代数 / 71-20 |
| 40 | 分压、分流与戴维南等效 | `divider-thevenin` | 71-30 |
| 50 | 电容：电压的惯性 | `capacitor-lab` | 13 导数 / 71-30 |
| 60 | 电感：电流的惯性 | `inductor-lab` | 71-50 |
| 70 | RC 一阶响应与时间常数 | `rc-step` | 22 ODE / 71-50 |
| 80 | RLC 二阶与阻尼振荡 | `rlc-ring` | 22 ODE 二阶 / 71-70 |
| 90 | 相量法与阻抗 | `impedance-phasor` | 12 复数 / 71-80 |
| 100 | 交流功率与功率因数 | `ac-power` | 71-90 |
| 110 | 二极管与整流 | `diode-rectifier` | 71-90 / 15 级数 |
| 120 | 晶体管：开关与放大 | `transistor-switch` | 71-110 |
| 130 | 运算放大器：虚短与负反馈 | `opamp-lab` | 52 反馈 / 71-120 |
| 140 | 有源滤波器设计 | `active-filter` | 60-30 Bode / 71-130 |
| 150 | 振荡器与时钟 | `oscillator-circuit` | 71-140 / 22 极限环 |
| 160 | 电源、稳压与纹波 | `power-regulator` | 71-110 / 71-130 |
| 170 | ADC 与 DAC | `adc-dac` | 61-10 采样 / 40 量化 |
| 180 | 从原理图到 PCB | `pcb-flow` | 71-170 |
| 190 | 电子设计方法地图 | — | 全章 |

**组件要点**：`circuit.js` 提供 `netlist → 直流工作点 / 瞬态 / AC 扫频` 三种分析；
`opamp-lab` 走理想运放 + 负反馈约束（虚短）直接解，不进 MNA 迭代；`diode-rectifier` 用 Shockley 方程 + Newton 迭代。

---

## 72 数字系统与计算机组成 `docs/72-digital-systems/`

引擎：`logic.js`（门级事件驱动仿真 + 时序图 + 网表 DSL）。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 从模拟到数字：为什么离散 | `analog-vs-digital` | 61-10 采样 / 71-170 |
| 20 | 布尔代数与逻辑门 | `logic-gates` | 27 逻辑与集合 |
| 30 | 卡诺图与逻辑化简 | `karnaugh` | 72-20 |
| 40 | 组合逻辑：加法器 | `adder-lab` | 72-30 |
| 50 | 多路选择器与译码器 | `mux-decoder` | 72-40 |
| 60 | 锁存器与触发器 | `latch-flipflop` | 72-40 |
| 70 | 寄存器与移位寄存器 | `register-shift` | 72-60 |
| 80 | 计数器与时钟分频 | `counter-lab` | 72-70 |
| 90 | 同步状态机设计 | `fsm-lab` | 31 自动机 / 72-80 |
| 100 | 时序约束：建立与保持 | `timing-setup` | 72-60 / 72-90 |
| 110 | 二进制、定点与补码 | `twos-complement` | 10 数论 / 72-40 |
| 120 | ALU 设计 | `alu-lab` | 72-40 / 72-110 |
| 130 | 单周期数据通路 | `datapath-single` | 72-120 / 72-90 |
| 140 | 指令集与译码 | `isa-decode` | 31 形式语言 / 72-130 |
| 150 | 流水线与冒险 | `pipeline-hazard` | 72-130 / 72-140 |
| 160 | 存储层次与缓存 | `cache-lab` | 72-150 / 37 随机过程 |
| 170 | 总线、中断与 I/O | `bus-interrupt` | 72-160 |
| 180 | 数字系统方法地图 | — | 全章 |

---

## 73 计算机系统 `docs/73-computer-systems/`

引擎：`logic.js`（调度/缓存/页表动画可用纯逻辑仿真）+ 自建模拟器。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 程序是怎么跑起来的 | `program-lifecycle` | 72-140 / 31 自动机 |
| 20 | 进程与线程 | `process-thread` | 73-10 |
| 30 | 调度算法与权衡 | `scheduler-lab` | 43 优化 / 73-20 |
| 40 | 同步、互斥与死锁 | `deadlock-lab` | 29 图论 / 73-20 |
| 50 | 虚拟内存与分页 | `paging-lab` | 73-30 / 36 概率 |
| 60 | 文件系统与持久化 | `filesystem-lab` | 73-50 / 29 图论 |
| 70 | 编译原理：词法与语法 | `lexer-parser` | 31 形式语言 / 72-140 |
| 80 | 中间表示与优化 | `ir-optimize` | 29 图论 / 73-70 |
| 90 | 关系代数与 SQL 数学 | `relational-algebra` | 27 逻辑与集合 |
| 100 | 索引与 B 树 | `btree-lab` | 30 算法 / 73-90 |
| 110 | 事务与 ACID | `transaction-acid` | 73-100 / 27 逻辑 |
| 120 | 网络分层与协议栈 | `network-layers` | 62 通信 / 72-10 |
| 130 | 可靠传输与拥塞控制 | `tcp-congestion` | 52 控制 / 73-120 |
| 140 | 路由与转发 | `routing-lab` | 29 图论 / 73-120 |
| 150 | 分布式一致性 | `consensus-lab` | 73-140 / 27 逻辑 |
| 160 | 计算机系统方法地图 | — | 全章 |

---

## 74 机械工程 `docs/74-mechanical-engineering/`

引擎：`mech.js`（平面机构位置/速度解算 + 梁剪力弯矩挠度 + 应力场）。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 力、力矩与静力平衡 | `statics-balance` | 11 向量 / 05 几何 |
| 20 | 自由体图与约束反力 | `free-body` | 74-10 |
| 30 | 桁架与杆件内力 | `truss-lab` | 74-20 / 11 线性方程组 |
| 40 | 应力与应变 | `stress-strain` | 21 张量 / 74-30 |
| 50 | 材料本构与弹性模量 | `material-curve` | 74-40 |
| 60 | 梁的剪力图与弯矩图 | `beam-diagram` | 74-20 / 14 积分 |
| 70 | 梁的挠度与刚度 | `beam-deflection` | 22 ODE / 74-60 |
| 80 | 压杆稳定与屈曲 | `buckling-lab` | 22 特征值 / 74-70 |
| 90 | 扭转与轴设计 | `torsion-shaft` | 74-40 / 20 多元 |
| 100 | 疲劳与 S-N 曲线 | `fatigue-sn` | 38 统计 / 74-40 |
| 110 | 公差配合与尺寸链 | `tolerance-stack` | 09 概率 / 74-10 |
| 120 | 平面机构与自由度 | `mechanism-dof` | 74-10 / 29 图论 |
| 130 | 四连杆机构运动学 | `four-bar` | 65 正运动学 / 74-120 |
| 140 | 凸轮与从动件 | `cam-follower` | 74-130 |
| 150 | 齿轮传动与传动比 | `gear-train` | 08 数列 / 74-130 |
| 160 | 带传动与链传动 | `belt-chain` | 74-150 |
| 170 | 机械振动与隔振 | `vibration-isolation` | 22 ODE / 71 类比 |
| 180 | 有限元思想：把连续切成小块 | `fem-intro` | 44 数值 / 55 科学计算 |
| 190 | 机械工程方法地图 | — | 全章 |

---

## 75 机电、电机与嵌入式 `docs/75-mechatronics/`

引擎：`circuit.js` + `mech.js` + 控制离散化。

| 号 | 课 | lab 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 机电系统概貌：机+电+控 | `mechatronics-intro` | 60 工程控制论 / 74-10 |
| 20 | 直流电机原理与机械特性 | `dc-motor` | 71-60 / 74-10 |
| 30 | 电机的传递函数模型 | `motor-model` | 60-30 Bode / 75-20 |
| 40 | 无刷直流与电子换向 | `bldc-commutation` | 75-20 / 72 数字 |
| 50 | 步进电机与细分驱动 | `stepper-microstep` | 75-40 |
| 60 | PWM 与 H 桥驱动 | `pwm-hbridge` | 71-120 / 75-20 |
| 70 | 编码器与测速 | `encoder-speed` | 75-60 / 61 采样 |
| 80 | 传感器与信号调理 | `sensor-conditioning` | 71-130 运放 / 75-70 |
| 90 | PID 的数字实现 | `pid-discrete` | 52 控制 / 75-30 |
| 100 | 采样率与控制周期 | `control-timing` | 61-10 / 75-90 |
| 110 | 嵌入式与实时任务调度 | `rtos-task` | 73-30 调度 / 75-100 |
| 120 | 状态机与事件驱动 | `fsm-embedded` | 72-90 / 75-110 |
| 130 | 通信总线 UART/I2C/SPI/CAN | `bus-protocols` | 62 通信 / 72-170 |
| 140 | 电源完整性与去耦 | `decoupling-pdn` | 71-160 / 71-50 |
| 150 | EMC 与抗干扰设计 | `emc-design` | 63 无线电 / 75-140 |
| 160 | 从需求到样机：设计闭环 | `design-closure` | 60-65 需求闭环 / 全章 |
| 170 | 机电与嵌入式方法地图 | — | 全章 |

---

## 组件命名与实现约定

- 文件：`src/pyrunner/lab/components/<kebab-name>.js`，默认导出 `render(host, spec)`，返回 `{ slidersBox?, destroy? }`。
- 注册：`src/pyrunner/lab/registry.js` 用静态映射表 `名字 → () => import('./components/x.js')`（**必须是静态字面量**，
  否则 webpack 无法分包；`validate.mjs` 也靠扫这张表做白名单）。
- spec 是 JSON，字段自定，但 `title` 通用。滑块用统一 `sliders: [{name,min,max,step,value,label?}]`。
- 出声组件必须：`core.audio.unlock()` 在首个用户手势里调用；提供停止按钮；离开视图自动停（`core.onOffscreen`）。
- 主题：一律用 `core.themeColors()` 取色，禁止硬编码颜色（要跟随明暗主题）。
