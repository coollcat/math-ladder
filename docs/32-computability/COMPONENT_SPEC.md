---
title: 第 32 章 · 可视化组件规格
draft: true
lesson_id: computability/component-spec
volume: 3
layer: L4
track:
  - discrete-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 第 32 章 · 未来可视化组件规格

> 本文件只登记未来组件规格，不声明实现状态。正文当前只引用 `plot`、`truth-table`、`proof-trail` 和浮窗 Python。实现前不得把下列类型写入正式课程。

## 全局硬性约定

1. 每个组件必须有无障碍名称、键盘可达的主操作、暂停或重置控制。
2. 所有自动播放默认停止；步进上限必须显式设置。
3. 所有二维状态图、参数平面和相空间必须同时支持 x/y 双轴拖拽：横向改变 x 参数，纵向改变 y 参数，禁止只允许单轴滑块替代。
4. 触摸、鼠标和键盘事件应产生同一份状态变更；拖拽时显示当前坐标与单位。
5. 状态更新必须可撤销至少一步；路由切换后不得重复挂载。
6. 组件文案使用中文；机器符号保留 ASCII 名称时要有中文解释。
7. 渲染失败要显示可读错误，不能白屏。

## 1. turing-machine-runner

### 目标

让学生逐格观察读写头、纸带、有限状态和规则表如何共同决定下一格局。组件是步进模拟器，不是无限执行器。

### 建议数据契约

```json
{
  "type": "turing-machine-runner",
  "title": "识别 01 的图灵机",
  "alphabet": ["_", "0", "1", "X", "Y"],
  "blank": "_",
  "start": "start",
  "accept": "accept",
  "reject": "reject",
  "tape": ["_", "0", "1", "_"],
  "head": 1,
  "rules": [
    { "state": "start", "read": "0", "write": "X", "move": "R", "next": "want1" },
    { "state": "want1", "read": "1", "write": "Y", "move": "R", "next": "check_end" },
    { "state": "check_end", "read": "_", "write": "_", "move": "S", "next": "accept" }
  ],
  "maxSteps": 100
}
```

### 必备交互

1. 单步、后退、重置和最多 100 步的播放控制；
2. 当前状态、当前符号和命中的规则高亮；
3. 未命中规则时进入明确的 reject 或 error 状态；
4. 可编辑带格子，但编辑后必须重置计算历史；
5. 规则表按 state/read 排序，缺失组合用灰色标出。

### 教学状态

- 初始：显示输入和 start 状态。
- 运行中：每步显示旧格局、命中规则、新格局。
- 接受：绿色终局，显示总步数。
- 拒绝：红色终局，说明未命中规则或进入 reject。
- 保护停止：达到 maxSteps 时显示“教学保护停止”，不冒充拒绝。

### 验收

1. 输入 `01` 能接受，输入 `00`、`10`、空串能按规则拒绝或保护停止。
2. 后退一步能恢复上一步 tape/head/state。
3. maxSteps 到达后不再继续执行。

## 2. halting-search

### 目标

展示有限搜索无法证明永不停机：学生可以推进一个程序的有界轨迹，但“尚未停”不能被解释成“不会停”。

### 建议数据契约

```json
{
  "type": "halting-search",
  "title": "为什么超时不等于不停",
  "programTrace": [
    { "step": 0, "state": 0, "value": 8 },
    { "step": 1, "state": 0, "value": 7 },
    { "step": 2, "state": 0, "value": 6 }
  ],
  "budget": [1, 50],
  "observedStates": [8, 7, 6],
  "diagonalTableSize": 4
}
```

### 必备交互

1. 时间预算滑块控制模拟步数，默认不超过 30；
2. “对角翻转”按钮在有限表上生成叛逆者行；
3. 三态结论只能显示 stopped / running / budget-exhausted，禁止显示 never-halts；
4. 二维参数面板支持 x/y 双轴拖拽：x 表示初始值，y 表示预算步数；
5. 若观察到重复状态，显示 cycle evidence；否则只显示 no evidence in budget。

### 教学状态

- budget 内停机：显示证据和步数。
- budget 内出现循环：提示这是死循环证据，但仍不是通用判定器。
- budget 用尽：强调未知，而不是否定。
- 对角模式：显示第 i 行第 i 格被翻转后的矛盾样例。

### 验收

1. 任何情况下 UI 都不输出 never halts 作为确定结论。
2. 双轴拖拽数值变化后，结论标签立即重新评估。
3. budget 最大值受组件限制，不允许无界执行。

## 3. reduction-map

### 目标

把归约画成有方向的管道，突出双向保真、翻译成本和困难传播方向。

### 建议数据契约

```json
{
  "type": "reduction-map",
  "title": "不可判定性与 NP 难度的传播",
  "nodes": [
    { "id": "halt", "label": "HALT", "known": "undecidable" },
    { "id": "rice", "label": "非平凡语义性质", "status": "unknown" },
    { "id": "sat", "label": "SAT", "known": "NP-complete" },
    { "id": "threeColor", "label": "三着色", "status": "unknown" }
  ],
  "edges": [
    { "from": "halt", "to": "rice", "translatorCost": "computable" },
    { "from": "sat", "to": "threeColor", "translatorCost": "polynomial" }
  ]
}
```

### 必备交互

1. 点击节点查看定义、yes/no 条件和证据清单；
2. 点击边检查翻译器是否满足 yes 到 yes 与 no 到 no；
3. 提供 cost 档位 computable / polynomial / exponential；
4. exponential 边不得用于传播 NP 完全性结论，UI 要给出警告；
5. 支持从源问题沿出边传播 known 标记，未知目标保持 unknown。

### 二维布局

主画布采用 difficulty-x/resource-y 平面：

| 轴 | 含义 | 操作 |
| --- | --- | --- |
| x | 相对难度档位 | 横向拖动节点 |
| y | 时间或空间资源等级 | 纵向拖动节点 |

拖拽只能改变展示坐标，不能自动改写证明状态；每次拖动要在 tooltip 显示两轴数值。

### 验收

1. 从已知不可定节点沿 computable 多一归约可传播 undecidable。
2. 从 SAT 沿 polynomial 边可传播 NP-hard，但目标仍需单独验证 NP 成员资格。
3. 断开保真开关时，传播按钮禁用并解释原因。

## 4. np-search-space

### 目标

让证书验证与指数搜索分离可见：左侧是大搜索树，右侧是短证书路径，中间是多项式验证器。

### 建议数据契约

```json
{
  "type": "np-search-space",
  "title": "子集和：找答案 versus 查答案",
  "items": [3, 7, 12, 25],
  "target": 22,
  "branchingMode": "include-or-skip",
  "certificate": [0, 2],
  "maxLeaves": 64
}
```

### 必备交互

1. n 控制项数，最大建议 6，防止真实展开指数级搜索树；
2. 搜索树可用折叠形式表示，超过 maxLeaves 时显示省略层；
3. 学生点击证书下标，右侧逐步累加并检查 target；
4. 提供错误证书样本：越界、重复、漏项、总和不等；
5. 显示当前证书长度和验证步数。

### 二维参数平面

提供 items-n/target-ratio 平面：

1. x 轴表示物品数量，横向拖动；
2. y 轴表示目标占总和的比例，纵向拖动；
3. 平面上叠加三个区域：已找到证书、验证失败、预算内未见；
4. “预算内未见”必须使用中性色，不得染成不可解。

### 验收

1. 同一证书重复验证结果一致。
2. 修改 target 后旧证书自动转为待验证。
3. n 超过安全上限时切换为抽象树，不实际枚举所有叶子。

## 5. sat-solver-lab

### 目标

用小规模 CNF 展示文字、子句、赋值、单元传播和冲突学习的前置直觉。课堂版变量数不超过 6，子句数不超过 12。

### 建议数据契约

```json
{
  "type": "sat-solver-lab",
  "title": "CNF 检查清单",
  "variables": ["x", "y", "z"],
  "clauses": [
    { "literals": [["x", true], ["y", false]] },
    { "literals": [["y", true], ["z", false]] },
    { "literals": [["x", false], ["z", true], ["y", true]] }
  ],
  "assignment": { "x": null, "y": null, "z": null },
  "allowPropagation": true
}
```

### 必备交互

1. 点击变量切换 unassigned / true / false；
2. 每个子句实时显示 satisfied / falsified / unit / unresolved；
3. unit 子句高亮唯一未赋值文字，并可一键传播；
4. 出现 falsified 子句时显示冲突原因，允许回退最近一次赋值；
5. 提供随机公式按钮，但保证规模上限固定；
6. 不宣称 DPLL 或 CDCL 完整实现，只做教学级传播与回溯。

### 二维状态图

提供 variable-x/clause-y 冲突矩阵：

| 区域 | 含义 |
| --- | --- |
| 行 | 变量 |
| 列 | 子句 |
| 格子 | 该变量在该子句中的正/负/缺席状态 |

矩阵支持 x/y 双轴拖拽选择矩形区域，批量查看或导出选中格子的文字说明；单格点击仍然可用。

### 验收

1. 全真、全假、混合赋值的求值结果与手工真值一致。
2. unit 传播只赋值唯一剩余文字，且记录传播链。
3. 冲突后回退一步能恢复子句状态和赋值计数。
4. 变量和子句超过上限时禁止随机生成并提示原因。

## 实施优先级

1. `turing-machine-runner`：支撑本章第一主线，规格最成熟。
2. `sat-solver-lab`：直接服务 SAT、3-SAT、NP 完全性和后续密码学。
3. `np-search-space`：把 P/NP 的核心差别做成可操作对比。
4. `reduction-map`：适合作为章末复习与图谱入口。
5. `halting-search`：概念价值高，但要特别小心 UI 不输出错误的确定性结论。

## 回填候选课程

| 组件 | 首选回填 |
| --- | --- |
| turing-machine-runner | 15 图灵机、20 可判定性与语言、30 通用图灵机 |
| halting-search | 35 停机问题、45 不可判定问题族 |
| reduction-map | 40 归约、55 多项式归约、90 方法地图 |
| np-search-space | 50 P 与 NP、60 NP 完全性 |
| sat-solver-lab | 65 SAT 与 3-SAT、70 图着色/团/独立集 |
