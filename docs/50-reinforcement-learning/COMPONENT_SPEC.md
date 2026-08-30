---
title: 第 50 章 · 强化学习可视化组件规格
description: 未来网格世界、Bellman、Q 表、探索与策略梯度教具的统一规格。
draft: true
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
lesson_id: rl/component-spec
introduces_import: []
---

# 强化学习专属组件规格

本文是第 50 章后续组件的实现前规格，不是当前页面可用的运行组件声明。所有组件实现时必须注册进 `src/pyrunner/viz.js` 的 `RENDERERS`，并遵守 MutationObserver 的 dataset 守卫、隐藏原生容器但不删除 React 节点、移动端触控和暗色主题约定。

## 统一约束

| 约束 | 要求 |
| --- | --- |
| 教学规模 | 默认网格不超过 6×6；episode 上限默认 40；训练步上限默认 3000 |
| 可中断 | 所有连续过程必须有停止按钮；单次动画帧只做有界更新 |
| 可复现实验 | 随机种子必须显式展示并可修改；重置后回到同一种子初始状态 |
| 状态守卫 | 容器写入 `mlBound` 或既有专用 dataset；路由切换不得重复注入 |
| 可访问性 | 每个按钮有文字或 aria-label；探针读数用文本输出，不只靠颜色 |
| 数学口径 | V 表示长期回报期望；Q 表示先执行一个动作的长期期望；策略表示动作规则 |

## gridworld-policy-arrows

**目的**：让读者直接看到策略不是分数，而是一张“每个状态该往哪走”的规则图。

### 数据

```json
{
  "type": "gridworld-policy-arrows",
  "title": "网格世界策略箭头",
  "cols": 4,
  "rows": 4,
  "start": [0, 0],
  "goal": [3, 3],
  "walls": [[1, 1], [2, 2]],
  "gamma": 0.9,
  "seed": 370,
  "maxSteps": 40,
  "values": [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 10]],
  "policy": [["R", "R", "R", "D"], ["R", "U", "D", "D"], ["R", "D", "L", "D"], ["R", "R", "R", "G"]]
}
```

### 必备交互

- 点击空格切换普通格、墙、起点、终点四种编辑状态。
- 点击或拖拽起点到任意非墙格子；拖拽过程中显示候选坐标。
- 双轴探针：鼠标悬停或手指长按时同时显示 x/y 坐标、当前价值 $V(x,y)$ 和策略动作。
- 键盘方向键可在焦点格间移动；Enter 打开格子类型菜单。
- 提供“重置”“随机扰动价值”“按贪心规则重画箭头”按钮。

### 渲染验收

1. 墙上不绘制策略箭头。
2. 起点和终点始终有文本标签，不只靠色块。
3. 探针在 4K 缩放和移动端均不遮挡网格边缘。
4. 修改任一状态后，箭头场只在下一次“重画”或自动重算完成后变化，不出现半帧错位。

## bellman-backup-wave

**目的**：把 Bellman 更新的“即时奖励 + 折扣未来”展开成从下一状态流回当前状态的波纹。

### 数据

```json
{
  "type": "bellman-backup-wave",
  "title": "Bellman backup 波纹",
  "currentValue": 2.0,
  "nextValues": [3.0, 5.5],
  "probabilities": [0.4, 0.6],
  "rewards": [1.0, 0.0],
  "gamma": 0.9,
  "mode": "expectation"
}
```

### 必备交互

- 滑块控制即时奖励、折扣因子和最多四个下一状态的奖励。
- 概率输入必须校验总和等于 1，误差容限 0.001。
- `expectation` 模式对所有分支求期望；`optimality` 模式先对分支取 max。
- 播放备份动画时显示公式逐步替换：旧值、目标值、TD error、新估计。
- 动画最长 2 秒，支持停止和重放；不自动循环。

### 渲染验收

1. 单行显示公式；KaTeX 渲染失败时退化为等宽文本而非空白。
2. 期望模式不出现 max；最优模式明确标出被选中的分支。
3. 数值精度固定四位小数，避免浮点尾巴干扰阅读。

## q-table-heatmap

**目的**：把 Q 表的行状态、列动作和数值大小放在同一张热力图中，并区分“表中的数”与“策略”。

### 数据

```json
{
  "type": "q-table-heatmap",
  "title": "Q 表热度",
  "states": ["低电量", "中电量", "高电量"],
  "actions": ["省电", "巡航", "冲刺"],
  "q": [[1, 2, 0], [2, 4, 3], [0, 5, 7]],
  "visits": [[8, 2, 0], [4, 12, 3], [0, 20, 30]],
  "epsilon": 0.15,
  "seed": 140,
  "maxUpdatesPerFrame": 20
}
```

### 必备交互

- 点击单元格后可直接编辑 Q 值或清零访问次数。
- “单步更新”“10 步”“播放/停止”三个学习控件；播放时每帧最多处理 `maxUpdatesPerFrame`。
- 颜色图例显示最小值、最大值和中位数；色盲模式下叠加数值。
- 切换显示层：Q 值、访问次数、当前 epsilon-greedy 动作概率。

### 渲染验收

1. 未访问单元格显示“未试过”，不用零值伪装成确定判断。
2. 学习暂停后表格不再变化；重置恢复初始 Q、访问计数和随机序列。
3. 最大 episode 数达到上限时自动停止并提示，而不是继续静默训练。

## epsilon-explore-lab

**目的**：分离探索概率、学习率和奖励噪声三者的影响。

### 数据

```json
{
  "type": "epsilon-explore-lab",
  "title": "探索实验室",
  "arms": [0.25, 0.45, 0.65],
  "epsilonStart": 0.4,
  "epsilonEnd": 0.02,
  "decay": 0.99,
  "alpha": 0.1,
  "seed": 151,
  "horizon": 1200,
  "batchSize": 20
}
```

### 必备交互

- 滑块调整 epsilon 起点、终值、衰减率、学习率和 batch size。
- “跑一批”每次最多执行 `batchSize` 步；“自动播放”每帧最多一批且可停止。
- 同屏显示累计 regret、最佳臂命中率和每个臂的经验均值置信带。
- 支持保存最近一次种子和参数为 URL hash，方便课堂复现。

### 渲染验收

1. regret 曲线必须说明纵轴单位是相对最优均值的期望损失。
2. 改变种子后曲线变化，但参数标签同步更新。
3. 达到 horizon 后自动停止；重置会重建伪随机流。

## policy-gradient-trajectory

**目的**：展示一条轨迹上的 log-probability score 如何乘上折扣回报，再变成参数更新。

### 数据

```json
{
  "type": "policy-gradient-trajectory",
  "title": "REINFORCE 轨迹记账",
  "stateLabels": ["出发", "路口", "坡顶", "终点"],
  "actions": ["左", "右"],
  "logits": [0.2, -0.2],
  "trajectory": [
    { "state": 0, "action": 1, "reward": 0 },
    { "state": 1, "action": 1, "reward": 0 },
    { "state": 2, "action": 0, "reward": 10 }
  ],
  "gamma": 0.95,
  "baseline": 3,
  "learningRate": 0.05,
  "seed": 170,
  "maxEpisodes": 100
}
```

### 必备交互

- 时间轴逐帧高亮 $(s_t,a_t,r_{t+1})$ 三元组。
- 拖动 baseline 时同步显示原始梯度和中心化梯度。
- 点击任一动作节点显示 $\log\pi$、score 向量和对应 $G_t$。
- “重放轨迹”“抽样新轨迹”“应用一次更新”分开控制；更新前后参数差异以条形图呈现。

### 渲染验收

1. 不把策略概率画成“分数”；必须注明它是动作分布。
2. baseline 变化时梯度期望不变，样本波动读数应可见地改变。
3. 抽样新轨迹不得超过 `maxEpisodes`；到达上限后按钮禁用。

## reward-shaping-sandbox

**目的**：暴露代理奖励与真实效用之间的裂缝，让读者亲手制造和识别 reward hacking。

### 数据

```json
{
  "type": "reward-shaping-sandbox",
  "title": "奖励塑造沙盘",
  "candidateCount": 6,
  "trueWeights": { "quality": 1, "safety": 5, "speed": 0.2 },
  "proxyWeights": { "clicks": 1, "quality": 0.05, "violationPenalty": 0.01 },
  "constraints": { "maxViolation": 0.02, "maxSteps": 200 },
  "seed": 200
}
```

### 必备交互

- x/y 双轴沙盘：横轴为速度得分探针，纵轴为安全得分探针；点击或拖拽生成候选行为。
- 左右两个总分面板分别显示代理奖励和真实效用。
- 可添加硬约束线；违反约束的行为即使代理分最高也标记为不可上线。
- “让模型优化代理分”按钮在有界搜索内运行，最多 `maxSteps` 次，并可随时停止。

### 渲染验收

1. 每个候选行为必须同时显示代理分和真实效用，禁止只显示优化目标。
2. 代理分最高但真实效用低于阈值的行为自动打上 hacking 标记。
3. 权重为负数或超过设定范围时禁用优化按钮并解释原因。

## 实现优先级

1. `gridworld-policy-arrows`：覆盖 MDP、价值和策略三个核心概念。
2. `q-table-heatmap`：支撑 TD/Q-learning 的在线学习直觉。
3. `bellman-backup-wave`：服务本章最核心递推式。
4. `epsilon-explore-lab` 和 `reward-shaping-sandbox` 并列，分别承接探索与对齐。
5. `policy-gradient-trajectory` 最后实现，依赖优势函数教学稳定后再上线。

## 回填点位

| 组件 | 首选回填课程 |
| --- | --- |
| gridworld-policy-arrows | MDP、Bellman 最优、策略迭代、价值迭代 |
| q-table-heatmap | TD 学习、Q-learning |
| epsilon-explore-lab | epsilon-greedy、bandit regret |
| bellman-backup-wave | Bellman 期望、Bellman 最优、TD 学习 |
| policy-gradient-trajectory | REINFORCE、baseline 与方差降低 |
| reward-shaping-sandbox | 奖励 hacking、RLHF 概览 |
