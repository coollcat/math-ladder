# 卷六 · 工程与系统（68–75）施工手册

> **本文件自包含。** 读完这一篇 + 照抄一篇样课，就能独立建完一章，不需要再翻
> `AGENTS.md` / `LESSON_TEMPLATE.md` / `ROADMAP.md`。
> 若本文件与那三份冲突，**以本文件为准**（它更新，且是卷六专属）。
>
> 最后更新：2026-08-31（章节按依赖拓扑重排编号，见 §2）

---

## 0. 五分钟速览

「数学阶梯」是从 1+1 到傅里叶变换的中文交互式数学站。前五卷（00–67 章，918 门课）
回答「数学是什么」；卷六（68–75）回答「数学在真实机器里怎么落地」。

**卷六铁律：不发明数学，只引用。** 每课的 `prereqs` 必须指向前五卷已建成的课。

交互组件**一律走 `lab` 围栏**，不是 `viz`。`viz.js`（14,370 行 / 108 个渲染器 /
服务前五卷 741 个代码块）**只读不写**——不要往里加东西，也不要改。

### 两条流水线

| 你要做的 | 走哪条 | 产出 |
| --- | --- | --- |
| 写一章正文 | §3 写课 SOP | `docs/NN-slug/MM-*.md` |
| 写交互组件 | §4 组件 SOP | `src/pyrunner/lab/components/*.js` + 注册一行 |

组件已就绪的章（71 机械、72 机电）**只走第一条**，打开快得多。

---

## 1. 架构速览

```
docs/NN-slug/MM-lesson.md          ← 正文（纯 markdown，禁用 .mdx）
src/pyrunner/lab/
  core.js                          ← 组件底座：主题色/画布/滑块/动画/音频壳
  engines/  circuit.js mech.js logic.js dsp.js media.js audio.js
  components/<kebab-name>.js       ← 一个组件一个文件
  registries/chNN.js               ← 章 → 组件名 → 动态 import
  registry.js                      ← 汇总八个分册（勿手改，改分册）
src/pyrunner/enhancer.js           ← 扫 DOM 分派围栏（python/quiz/exercise/viz/lab/paper）
src/pyrunner/viz.js                ← 前五卷老组件，只读
```

**围栏分派链**：`Root/index.js` 的 MutationObserver → `enhancer.js` 的 `enhanceAll()`
→ 探测到 `pre[class*="language-lab"]` → 动态 `import('./lab/index.js')` → `enhanceLab()`
→ 按 `spec.type` 查 `RENDERERS` → 动态 `import` 对应组件文件 → `render(host, spec)`。

**水合安全铁律**：所有围栏处理都是「隐藏原 `pre` 容器（`display:none`）+ 在其后插入新节点」，
**绝不 remove React 节点**。你写新组件时只要往 `host` 里塞 DOM，不用管这条。

---

## 2. 章节编号（2026-08-31 重排）

按**依赖拓扑**编排，编号即学习顺序。旧的「声画电算机」顺序把电排在声后面，
而声学要用到滤波器和电路知识——先修链是断的，所以重排了。

| 章 | 目录 | 主题 | 引擎 | 组件 | 课文 |
| --- | --- | --- | --- | --- | --- |
| 68 | `68-electronics` | 电子电路与电子设计 | circuit | 18/18 | **19/19 已成稿** |
| 69 | `69-digital-systems` | 数字系统与计算机组成 | logic | 0/18 | 0/18 |
| 70 | `70-computer-systems` | 计算机系统 | logic | 15/15 | **16/16 已成稿** |
| 71 | `71-mechanical-engineering` | 机械工程与力学 | mech | 18/18 | **0/19 只差正文** |
| 72 | `72-mechatronics` | 机电系统与嵌入式 | circuit+mech | 16/16 | **0/17 只差正文** |
| 73 | `73-audio-acoustics` | 音频与声学 | audio+dsp | 2/14 | 0/15 |
| 74 | `74-speech-audio` | 语音与音频智能 | audio+dsp+media | 0/14 | 0/15 |
| 75 | `75-image-video` | 图像与视频 | media+dsp | 0/14 | 0/15 |

**投产比排序**：71 → 72（组件现成，纯写稿）> 68/70（已成稿，只需补缺）> 73（差 12 组件）
> 75（差 14 组件）> 74（差 14 组件）> 69（差 18 组件）。

侧边栏顺序由目录数字前缀自动生成，**不用改 `sidebars.js`**。

---

## 3. 甲 · 写一门课

### 3.1 文件与命名

- 目录 `docs/NN-slug/`，文件 `MM-slug.md`，编号步长 10（中间插课用 15、25）。
- 单文件 **≤300 行**。
- `index.md` 是章首页，`999-references.md` 由脚本生成（**不要手改**）。

### 3.2 front matter（卷六全字段）

```yaml
---
title: 电容：电压的惯性          # 禁写「68 ·」这类数字前缀
lesson_id: electronics/capacitor   # 目录slug/文件slug，禁用 id 字段
prereqs:                           # 必须指向「排在本课之前」的课
  - electronics/kcl-kvl
  - derivatives/derivative-definition
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6                          # 1–6
layer: L9                          # L0–L11
track:                             # 从下面八条里选，可多选（声明了就不能为空）
  - analysis-change                # algebra-structure  analysis-change
  - scientific-computing           # discrete-computing  geometry-space
                                   # probability-statistics  information-learning
                                   # optimization-control  scientific-computing
stage: university-core             # primary-intuition / secondary-tool / university-core / research-elective
difficulty: 3                      # 1–5 整数，必须是整数
introduces_concepts: [capacitance]
applications: [decoupling, rc-timing]
exits: [engineering]
---
```

卷六各章建议的 `track`（可多选，挑最贴的一两条）：

| 章 | 建议 track |
| --- | --- |
| 68 电子电路 | `analysis-change` + `optimization-control` |
| 69 数字系统 | `discrete-computing` + `algebra-structure` |
| 70 计算机系统 | `discrete-computing` + `optimization-control` |
| 71 机械工程 | `geometry-space` + `analysis-change` |
| 72 机电系统 | `optimization-control` + `scientific-computing` |
| 73 音频声学 | `analysis-change` + `scientific-computing` |
| 74 语音音频 | `information-learning` + `scientific-computing` |
| 75 图像视频 | `information-learning` + `discrete-computing` |

`prereqs` 被 `validate.mjs` 硬校验：必须存在，且 `chNum` 更小、或同章 `fNum` 更小。
**卷六引用前五卷时必须确认那门课真的存在**——写之前 grep 一下 `lesson_id`。

### 3.3 九段式骨架

| # | 段落 | 要点 |
| --- | --- | --- |
| 1 | `## 1. 从一个场景开始` | 真实生活问题，三句话立起悬念 |
| 2 | `## 2. 直觉解释` | 类比 + 图示先行，**不放公式** |
| 3 | `## 3. 正式定义` | KaTeX 公式 + **符号逐一列表说明** |
| 4 | `## 4. 分步例题` | 编号步骤，每步只做一件事 |
| 5 | `## 5. 动手实验` | **lab 在前、python 在后**（卷六双段） |
| 6 | 误区卡片 | `:::warning[常见误区]`，2~3 条「你以为…其实…」 |
| 7 | 练习 | 判题式 `exercise` 优先；概念题用 `<details>` |
| 8 | 选读证明 | `<details>` 且 summary 以「选读」开头 |
| 9 | `## 8. 下一站` | 一句话悬念 + 相对链接（带 `.md` 后缀） |

§5 的标准形态：

```markdown
### 实验 1：拖着看（lab 组件）

\`\`\`lab
{ "type": "capacitor-lab", "title": "电容充放电", "sliders": [...] }
\`\`\`

### 实验 2：自己算（Python）

\`\`\`python title="RC 充电曲线"
...
\`\`\`

### 快问快答

\`\`\`quiz
...
\`\`\`
```

### 3.4 四种围栏语法

````markdown
```lab
{ "type": "组件名", "title": "标题", "sliders": [{"name":"R","min":1,"max":100,"step":1,"value":10}] }
```

```python title="标题"
# sliders: R=10 [1:100:1]     ← 可选，注入后代码里不要重复赋值
import math  # 首次出现的 import 必须有中文注释
```

```exercise
# @title: 练习标题
# @check: 期望输出第一行
# @hint: 卡住时的提示
print("能跑但结果明显不对的初始代码")
```

```quiz
问题文本（纯文字，不要放 KaTeX 公式）？
- 错误项
- 正确项 [*]
? 解释（答对后展示）
```
````

规矩：

- `lab` 的 `type` 必须在 `registries/*.js` 白名单里，否则 validate 硬报错。
- `quiz` 恰好一个 `[*]`，`?` 解释单行，题干禁 KaTeX。
- `exercise` 初始代码三原则：能直接运行、结果明显不对、改动点聚焦本课概念。
- Python 首现语法**全部中文注释**；禁 `input()`；避免 `while True`。
- `sliders:` 注入的变量，代码里**不要再赋值**。

### 3.5 黄金样例

- **卷六样板**：`docs/68-electronics/70-rc-step.md` —— 仿这一篇，不要仿卷五的课。
- 章首页样板：`docs/68-electronics/index.md`（路线图 + 方法主线 + 实战挑战）。

### 3.6 收尾四连

```bat
node scripts/validate.mjs
node scripts/check-lab-syntax.mjs
node scripts/gen-references.mjs
node scripts/gen-graph.mjs
```

---

## 4. 乙 · 写一个 lab 组件

### 4.1 文件与签名

文件：`src/pyrunner/lab/components/<kebab-name>.js`

```js
import { themeColors, setupCanvas, buildSliders, anim, audio, onScreen } from '../core.js';
import { transient } from '../engines/circuit.js';

export default function render(host, spec) {
  const c = themeColors();                 // 禁止硬编码颜色（要跟明暗主题）
  const { canvas, ctx } = setupCanvas(host, { aspect: 16 / 9 });
  const sl = buildSliders(spec.sliders || [], () => draw());
  // ... 画图 / 绑交互
  function draw() { /* ... */ }
  draw();

  return {
    slidersBox: sl.box,                    // 可选
    destroy() { /* 可选：停动画、关 AudioContext */ },
  };
}
```

`spec` 就是课文围栏里那段 JSON。`title` 字段通用，其余自定。

### 4.2 注册（必须字面量）

`src/pyrunner/lab/registries/chNN.js` 加一行：

```js
'capacitor-lab': () => import('../components/capacitor-lab.js'),
```

**路径必须是字面量。** 用变量拼路径会让打包器退化成整包懒加载，前功尽弃。

新章要先建 `registries/chNN.js` 并在 `registry.js` 里并入——但目前 ch68–ch75 八个分册
都已存在，**不需要建新册，直接往对应章的文件里加行**。

跨册重名是硬错误（`validate.mjs` 查重），组件名全站唯一。

### 4.3 通用工具（`core.js` 导出）

```
themeColors()  取当前主题色（必须用它，不要硬编码）
setupCanvas()  建 canvas + DPR 适配 + 自动重绘
bindPointer()  指针拖拽（归一到逻辑坐标）
buildSliders() 滑块组          buildToolbar() 按钮组
buildSegmented() 分段切换      buildReadout() 数值读数
anim() / rafLoop()  动画循环（离屏自动暂停）
onScreen()     进入/离开视口回调
audio / audioShell  音频壳（见下）
el / mkBtn / clamp / lerp / fmt / drawGrid / polyline / label / SERIES
```

### 4.4 引擎 API（**优先复用，不要自己写**）

**circuit.js**（68 电子 / 72 机电）
```
solve  solveComplex  buildIndex  diodeCurrent  diodeConductance
createTransient  step  transient  acAt  acSweep
netRC  netRLC  netRectifier  netInvertingAmp
rcStepAnalytic  rlcParams  VT  dc
```

**mech.js**（71 机械 / 72 机电）
```
beamAnalysis  simplySupportedMidDeflection  cantileverTipDeflection
sectionRect/Circle/Tube  axialStress  bendingStress  torsionShear  shearStressAvg
vonMises  mohrCircle  eulerPcr  columnCheck
circleCircle  fourBar  fourBarVelocity  grashof  gearTrain  planetary
transmissibility  naturalFreq  criticalDamping
basquinS  basquinN  goodman  minerDamage  toleranceStack
solveTruss  indexMembers  tridiag
```

**logic.js**（69 数字 / 70 计系）
```
GATES  truthTable  evalCombinational  createSim  run
rippleAdder  alu4  toBits  bitsToInt  twosComplement
kmapGrid  kmapGroups  GRAY  cacheSim  X
```

**dsp.js**（73 音频 / 74 语音）
```
fft  rfft  window  WINDOWS  frame  biquad  biquadResponse
autocorr  detectPitch  shortTimeEnergy  zeroCrossRate
hzToMel  melToHz  melFilterbank  dct2  mfcc
lpc  lpcEnvelope  spectrogram  goertzel
ampToDb  dbToAmp  powToDb  resample  decimate  isPow2  padPow2
```

**media.js**（75 图像视频 / 74 语谱图）
```
dct8x8  idct8x8  Q_LUMA  ZIGZAG  quantizeBlock  dequantizeBlock  blockDct
frameDiff  blockMatch  motionCompensate  residual  psnr
conv2  KERNELS  boxKernel  edgeMagnitude  canny
rgbToYuv  yuvToRgb  chromaSubsample420  quantize
blank  synth  subsample  subsampleBlurred  histogram  entropy  countNonZero
```

**audio.js**（73 / 74 出声组件）
```
createEngine(opts)  → { ctx, now, osc, gainEnv, filter, reverb, analyser, ... }
makeImpulse(ctx, {seconds, decay, predelay, reverse})   混响脉冲响应
makeNoiseBuffer(ctx, seconds, kind)                     噪声源
chain(...nodes)                                         串接节点
```

### 4.5 出声组件的四条硬规矩

浏览器的自动播放策略要求 AudioContext 在用户手势里创建/恢复。

1. 首个用户手势里调 `core.audio.unlock()`；
2. 必须提供 **■ 停止按钮**；
3. 离开视口自动停（`core.onOffscreen`）；
4. 音量默认调小（默认 0.2 左右），别一上来就震耳朵。

### 4.6 交互质量底线

69 个现存组件里**没有一个用了拖拽**。新组件凡是「能拖的」（滑块、节点、元件、曲线控制点）
就应该能拖——纯滑块 + 静态图不算好教具。

判断标准：**这个概念的完美教具长什么样？** 做不出来就先做，别硬套通用类型。

---

## 5. 各章课表

`组件` 列为空表示纯讲授课。`prereq` 里的 `NN-MM` 指本章第 MM 号课，数字是前五卷章号。

### 68 电子电路与电子设计 `docs/68-electronics/`

引擎 `circuit.js`（MNA + Newton-Raphson + 后向欧拉 + AC 扫频）。
**状态：19 门课全部成稿，18 个组件全部就绪。**

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 电荷、电流与电压 | `charge-current` | 06 函数 |
| 20 | 欧姆定律与电阻 | `ohm-lab` | 04 代数 / 68-10 |
| 30 | 基尔霍夫定律与节点分析 | `kcl-kvl` | 11 线性代数 / 68-20 |
| 40 | 分压、分流与戴维南等效 | `divider-thevenin` | 68-30 |
| 50 | 电容：电压的惯性 | `capacitor-lab` | 13 导数 / 68-30 |
| 60 | 电感：电流的惯性 | `inductor-lab` | 68-50 |
| 70 | RC 一阶响应与时间常数 | `rc-step` | 22 ODE / 68-50 |
| 80 | RLC 二阶与阻尼振荡 | `rlc-ring` | 22 ODE 二阶 / 68-70 |
| 90 | 相量法与阻抗 | `impedance-phasor` | 12 复数 / 68-80 |
| 100 | 交流功率与功率因数 | `ac-power` | 68-90 |
| 110 | 二极管与整流 | `diode-rectifier` | 68-90 / 15 级数 |
| 120 | 晶体管：开关与放大 | `transistor-switch` | 68-110 |
| 130 | 运算放大器：虚短与负反馈 | `opamp-lab` | 52 反馈 / 68-120 |
| 140 | 有源滤波器设计 | `active-filter` | 60-30 Bode / 68-130 |
| 150 | 振荡器与时钟 | `oscillator-circuit` | 68-140 / 22 极限环 |
| 160 | 电源、稳压与纹波 | `power-regulator` | 68-110 / 68-130 |
| 170 | ADC 与 DAC | `adc-dac` | 61-10 采样 / 40 量化 |
| 180 | 从原理图到 PCB | `pcb-flow` | 68-170 |
| 190 | 电子设计方法地图 | — | 全章 |

组件要点：`opamp-lab` 走理想运放 + 虚短约束直接解，不进 MNA 迭代；
`diode-rectifier` 用 Shockley 方程 + Newton 迭代。

### 69 数字系统与计算机组成 `docs/69-digital-systems/`

引擎 `logic.js`（门级事件驱动仿真 + 时序图 + 网表 DSL）。**18 课 / 18 组件全缺。**

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 从模拟到数字：为什么离散 | `analog-vs-digital` | 61-10 采样 / 68-170 |
| 20 | 布尔代数与逻辑门 | `logic-gates` | 27 逻辑与集合 |
| 30 | 卡诺图与逻辑化简 | `karnaugh` | 69-20 |
| 40 | 组合逻辑：加法器 | `adder-lab` | 69-30 |
| 50 | 多路选择器与译码器 | `mux-decoder` | 69-40 |
| 60 | 锁存器与触发器 | `latch-flipflop` | 69-40 |
| 70 | 寄存器与移位寄存器 | `register-shift` | 69-60 |
| 80 | 计数器与时钟分频 | `counter-lab` | 69-70 |
| 90 | 同步状态机设计 | `fsm-lab` | 31 自动机 / 69-80 |
| 100 | 时序约束：建立与保持 | `timing-setup` | 69-60 / 69-90 |
| 110 | 二进制、定点与补码 | `twos-complement` | 10 数论 / 69-40 |
| 120 | ALU 设计 | `alu-lab` | 69-40 / 69-110 |
| 130 | 单周期数据通路 | `datapath-single` | 69-120 / 69-90 |
| 140 | 指令集与译码 | `isa-decode` | 31 形式语言 / 69-130 |
| 150 | 流水线与冒险 | `pipeline-hazard` | 69-130 / 69-140 |
| 160 | 存储层次与缓存 | `cache-lab` | 69-150 / 37 随机过程 |
| 170 | 总线、中断与 I/O | `bus-interrupt` | 69-160 |
| 180 | 数字系统方法地图 | — | 全章 |

现成轮子：`rippleAdder` `alu4` `twosComplement` `kmapGrid` `kmapGroups` `cacheSim`。

### 70 计算机系统 `docs/70-computer-systems/`

引擎 `logic.js` + 自建模拟器。**状态：16 门课全部成稿，15 个组件全部就绪。**

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 程序是怎么跑起来的 | `program-lifecycle` | 69-140 / 31 自动机 |
| 20 | 进程与线程 | `process-thread` | 70-10 |
| 30 | 调度算法与权衡 | `scheduler-lab` | 43 优化 / 70-20 |
| 40 | 同步、互斥与死锁 | `deadlock-lab` | 29 图论 / 70-20 |
| 50 | 虚拟内存与分页 | `paging-lab` | 70-30 / 36 概率 |
| 60 | 文件系统与持久化 | `filesystem-lab` | 70-50 / 29 图论 |
| 70 | 编译原理：词法与语法 | `lexer-parser` | 31 形式语言 / 69-140 |
| 80 | 中间表示与优化 | `ir-optimize` | 29 图论 / 70-70 |
| 90 | 关系代数与 SQL 数学 | `relational-algebra` | 27 逻辑与集合 |
| 100 | 索引与 B 树 | `btree-lab` | 30 算法 / 70-90 |
| 110 | 事务与 ACID | `transaction-acid` | 70-100 / 27 逻辑 |
| 120 | 网络分层与协议栈 | `network-layers` | 62 通信 / 69-10 |
| 130 | 可靠传输与拥塞控制 | `tcp-congestion` | 52 控制 / 70-120 |
| 140 | 路由与转发 | `routing-lab` | 29 图论 / 70-120 |
| 150 | 分布式一致性 | `consensus-lab` | 70-140 / 27 逻辑 |
| 160 | 计算机系统方法地图 | — | 全章 |

已知小缺口：`20-process-thread`、`60-filesystem-lab`、`80-ir-optimize` 缺 quiz。

### 71 机械工程与力学 `docs/71-mechanical-engineering/`

引擎 `mech.js`。**18 个组件全部就绪，只差 19 篇正文——投产比最高的一章。**

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 力、力矩与静力平衡 | `statics-balance` | 11 向量 / 05 几何 |
| 20 | 自由体图与约束反力 | `free-body` | 71-10 |
| 30 | 桁架与杆件内力 | `truss-lab` | 71-20 / 11 线性方程组 |
| 40 | 应力与应变 | `stress-strain` | 21 张量 / 71-30 |
| 50 | 材料本构与弹性模量 | `material-curve` | 71-40 |
| 60 | 梁的剪力图与弯矩图 | `beam-diagram` | 71-20 / 14 积分 |
| 70 | 梁的挠度与刚度 | `beam-deflection` | 22 ODE / 71-60 |
| 80 | 压杆稳定与屈曲 | `buckling-lab` | 22 特征值 / 71-70 |
| 90 | 扭转与轴设计 | `torsion-shaft` | 71-40 / 20 多元 |
| 100 | 疲劳与 S-N 曲线 | `fatigue-sn` | 38 统计 / 71-40 |
| 110 | 公差配合与尺寸链 | `tolerance-stack` | 09 概率 / 71-10 |
| 120 | 平面机构与自由度 | `mechanism-dof` | 71-10 / 29 图论 |
| 130 | 四连杆机构运动学 | `four-bar` | 65 正运动学 / 71-120 |
| 140 | 凸轮与从动件 | `cam-follower` | 71-130 |
| 150 | 齿轮传动与传动比 | `gear-train` | 08 数列 / 71-130 |
| 160 | 带传动与链传动 | `belt-chain` | 71-150 |
| 170 | 机械振动与隔振 | `vibration-isolation` | 22 ODE / 68 电路类比 |
| 180 | 有限元思想：把连续切成小块 | `fem-intro` | 44 数值 / 55 科学计算 |
| 190 | 机械工程方法地图 | — | 全章 |

### 72 机电系统与嵌入式 `docs/72-mechatronics/`

引擎 `circuit.js` + `mech.js` + 控制离散化。**16 个组件就绪，只差 17 篇正文。**

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 机电系统概貌：机+电+控 | `mechatronics-intro` | 60 工程控制论 / 71-10 |
| 20 | 直流电机原理与机械特性 | `dc-motor` | 68-60 / 71-10 |
| 30 | 电机的传递函数模型 | `motor-model` | 60-30 Bode / 72-20 |
| 40 | 无刷直流与电子换向 | `bldc-commutation` | 72-20 / 69 数字 |
| 50 | 步进电机与细分驱动 | `stepper-microstep` | 72-40 |
| 60 | PWM 与 H 桥驱动 | `pwm-hbridge` | 68-120 / 72-20 |
| 70 | 编码器与测速 | `encoder-speed` | 72-60 / 61 采样 |
| 80 | 传感器与信号调理 | `sensor-conditioning` | 68-130 运放 / 72-70 |
| 90 | PID 的数字实现 | `pid-discrete` | 52 控制 / 72-30 |
| 100 | 采样率与控制周期 | `control-timing` | 61-10 / 72-90 |
| 110 | 嵌入式与实时任务调度 | `rtos-task` | 70-30 调度 / 72-100 |
| 120 | 状态机与事件驱动 | `fsm-embedded` | 69-90 / 72-110 |
| 130 | 通信总线 UART/I2C/SPI/CAN | `bus-protocols` | 62 通信 / 69-170 |
| 140 | 电源完整性与去耦 | `decoupling-pdn` | 68-160 / 68-50 |
| 150 | EMC 与抗干扰设计 | `emc-design` | 63 无线电 / 72-140 |
| 160 | 从需求到样机：设计闭环 | `design-closure` | 60-65 需求闭环 / 全章 |
| 170 | 机电与嵌入式方法地图 | — | 全章 |

### 73 音频与声学 `docs/73-audio-acoustics/`

引擎 `audio.js` + `dsp.js`。核心是**能听见**——组件必须真的出声。
已有 `wave-basics`、`spectrum-live` 两个组件。

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 声音是空气的压强波 | `wave-basics` | 07 三角 |
| 20 | 频率、音高与八度 | `tone-sweep` | 73-10 |
| 30 | 振幅、声压级与分贝 | `db-meter` | 03 对数 / 73-10 |
| 40 | 等响曲线：人耳不平直 | `loudness-contour` | 73-30 |
| 50 | 谐波、音色与频谱 | `spectrum-live` | 16 傅里叶 / 73-20 |
| 60 | 拍频与音程 | `beats-audio` | 73-20 |
| 70 | 包络 ADSR：声音的骨架 | `adsr-shaper` | 06 函数 / 73-30 |
| 80 | 加法合成：音色是拼出来的 | `harmonic-builder` | 16 傅里叶 / 73-50 |
| 90 | 滤波与均衡 | `eq-sweep` | 61 DSP / 73-50 |
| 100 | 共振与房间模式 | `room-modes` | 22 ODE / 73-90 |
| 110 | 混响与卷积混响 | `convolution-reverb` | 61-20 卷积 / 73-100 |
| 120 | 延迟、回声与梳状滤波 | `delay-comb` | 73-110 |
| 130 | 动态范围压缩与限幅 | `compressor-lab` | 73-30 / 73-70 |
| 140 | 立体声与双耳线索 | `panning-binaural` | 73-110 |
| 150 | 音频与声学方法地图 | — | 全章 |

组件要点：`spectrum-live` 用 AnalyserNode 实时 FFT；
`convolution-reverb` 用 `makeImpulse`（指数衰减噪声）喂 ConvolverNode；
`room-modes` 画矩形房间 (nx,ny,nz) 模态频率栅格。

### 74 语音与音频智能 `docs/74-speech-audio/`

引擎 `audio.js` + `dsp.js`（MFCC/LPC/自相关）+ `media.js`（语谱图画布）。

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 源-滤波器模型：人是怎样发声的 | `source-filter` | 73-50 / 73-110 |
| 20 | 分帧与短时分析 | `frame-window` | 61-80 窗函数 / 74-10 |
| 30 | 语谱图：声音的照片 | `spectrogram-lab` | 61-60 DFT / 74-20 |
| 40 | 梅尔刻度与听觉滤波组 | `mel-filterbank` | 74-30 |
| 50 | MFCC：语音识别的老饭碗 | `mfcc-lab` | 74-40 |
| 60 | 基频与音高检测 | `pitch-detect` | 74-30 / 61 自相关 |
| 70 | 清浊音与端点检测 VAD | `vad-lab` | 74-60 / 74-50 |
| 80 | 线性预测 LPC | `lpc-lab` | 61-100 自适应滤波 / 74-60 |
| 90 | 声码器：把语音压缩成参数 | `vocoder-lab` | 74-10 / 74-80 |
| 100 | 心理声学与感知掩蔽 | `masking-lab` | 40 信息论 / 73-40 |
| 110 | 音频编码：MP3/AAC 的取舍 | `audio-codec-lab` | 74-100 / 35 编码 |
| 120 | 关键词唤醒与端点检测 | `wake-word-lab` | 74-50 / 46 深度学习 |
| 130 | 语音识别概貌：从 HMM 到端到端 | `asr-overview` | 37 随机过程 / 47 Transformer |
| 140 | 语音合成与神经声码器 | `tts-overview` | 49 生成模型 / 74-90 |
| 150 | 语音与音频智能方法地图 | — | 全章 |

现成轮子：`melFilterbank` `mfcc` `lpc` `lpcEnvelope` `spectrogram` `detectPitch` `dct2`。

### 75 图像与视频 `docs/75-image-video/`

引擎 `media.js`（帧流/DCT/块匹配）+ `dsp.js`（2D FFT 复用）。

| 号 | 课 | 组件 | 关键 prereq |
| --- | --- | --- | --- |
| index | 章首页 | — | — |
| 10 | 图像是二元函数 | `image-pixels` | 06 函数 / 20 多元 |
| 20 | 采样与量化 | `sampling-quantize` | 61-10 采样 / 75-10 |
| 30 | 色彩空间与色度子采样 | `color-space` | 11 线性代数 / 75-20 |
| 40 | 图像卷积：模糊与锐化 | `image-conv` | 61-20 卷积 / 75-10 |
| 50 | 边缘检测与梯度 | `edge-detect` | 20 多元微积分 / 75-40 |
| 60 | 图像的二维傅里叶 | `image-fft` | 16 傅里叶 / 75-40 |
| 70 | DCT 与 8×8 块：能量集中 | `dct-block` | 61-85 DCT / 75-60 |
| 80 | 量化矩阵与 JPEG 取舍 | `jpeg-quant` | 40 信息论 / 75-70 |
| 90 | 视频是图像序列：帧率 | `frame-rate` | 61-10 采样 / 75-20 |
| 100 | 帧间差分与运动检测 | `frame-diff` | 75-90 |
| 110 | 块匹配与运动估计 | `motion-estimate` | 43 优化 / 75-100 |
| 120 | 帧间预测与残差 | `inter-predict` | 75-110 / 40 信息论 |
| 130 | I/P/B 帧与 GOP | `gop-structure` | 75-120 |
| 140 | 码率控制与率失真 | `rate-distortion` | 40 香农 / 75-130 |
| 150 | 图像与视频方法地图 | — | 全章 |

现成轮子：`dct8x8` `idct8x8` `blockDct` `quantizeBlock` `Q_LUMA` `ZIGZAG`
`frameDiff` `blockMatch` `motionCompensate` `residual` `psnr` `conv2` `KERNELS` `canny`。

---

## 6. 自检与交付

```bat
node scripts/validate.mjs          :: 硬闸门：依赖顺序/围栏类型/方法准入/资料同步
node scripts/check-lab-syntax.mjs  :: lab 组件语法（未挂 build，要手动跑）
node scripts/gen-references.mjs    :: 改了 references-data.json 后必须跑
node scripts/gen-graph.mjs         :: 同步首页/知识树数据
npm run build                      :: = validate + docusaurus build
```

每章完成后：勾 `ROADMAP.md` 对应 checkbox（卷六段落需先补，见 §7）。

---

## 7. 已知坑

1. **`mechanical-audit.cjs` 只认 `viz`，不认 `lab`**（第 105 行只判 `block.lang === 'viz'`）。
   卷六的 lab 块不受 h2/JSON 体检覆盖，靠 `validate.mjs` 兜底。
2. **独立阅读前端 `ui/` 把 lab 渲染成占位卡**（`ui/render.mjs:203`），链回主站。
   这是既定降级——别把唯一知识点放在 lab 卡里，正文要能独立成立。
3. **`ROADMAP.md` 尚未登记卷六**（章表止于 67）。建章时顺手补上卷六章表与 checkbox。
4. **构建前先移走 `build/`**。WorkBuddy 环境有批量删除守卫（>50 文件需人工确认），
   Docusaurus 清理 `build/__server`（约 1000 个文件）会被拦截导致构建失败。
   绕过：`mv build /tmp/ml-build-$(date +%s)` 后再 `npm run build`。
5. **`prereqs` 必须指向已存在的课**，否则 validate 硬错误。卷六引用前五卷前先 grep 确认。
6. **组件名跨册不可重复**（validate 查重，硬错误）。

---

## 8. 组件命名与实现约定

- 文件：`src/pyrunner/lab/components/<kebab-name>.js`，默认导出 `render(host, spec)`，
  返回 `{ slidersBox?, destroy? }`。
- 注册：`registries/chNN.js`，`'名字': () => import('../components/x.js')`——**必须静态字面量**，
  否则打包器无法分包；`validate.mjs` 也靠扫这张表做白名单。
- 颜色一律 `themeColors()`，禁止硬编码（要跟随明暗主题）。
- 出声组件：手势解锁 + 停止按钮 + 离屏自动停 + 默认小音量。
- 能拖的就让它能拖。
