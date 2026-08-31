---
title: 状态机与事件驱动
lesson_id: mechatronics/fsm-embedded
prereqs:
  - logic-sets/propositional-deduction
  - mechatronics/rtos-task
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L8
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 3
introduces_concepts:
  - finite-state-machine
  - event-driven
  - interrupt-queue
  - debounce-fsm
  - frame-parser
applications:
  - button-debounce
  - serial-protocol-parser
  - vending-machine
exits:
  - engineering
---

## 1. 从一个场景开始

你给单片机写了一个按键程序：`while (1) { if (按键按下) { 做事 } }`。结果按一下，程序"做事"做了三次——因为机械触点抖动，按下瞬间电平在 0 和 1 之间跳了好几回，每次跳变都被 `if` 抓到了。

再换一个场景：串口收到一帧数据 `0xAA 03 D1 D2 D3 CRC`。你不能写 `while (收到字节) { 判断是不是第 N 个字节 }`——因为字节是异步到达的，两次收到的间隔可能隔几十毫秒，中间 CPU 还得去干别的。怎么把"断续到达的字节流"组织成"完整的一帧"？

这两个问题的答案都是同一种结构：**有限状态机（FSM）**。它把程序的逻辑从"一条直线"变成"一张状态图"——当前在哪个状态，收到什么事件，就跳到哪个状态。嵌入式编程的核心不是算法，是**组织对异步事件的响应**。

## 2. 直觉解释

状态机像一栋楼：每间房是一个**状态**（"等按键""等数据""等校验"），门是**转移**（按下了、收到字节了、定时到了）。你永远只在某一间房里——收到一个事件就找当前房间的门，走到下一间。没有门的事件就忽略。

关键纪律：**中断只做一件事——把事件丢进队列。主循环从队列取出事件，推进状态机。** 这叫"事件驱动"。为什么不让中断直接跑状态机？因为中断要快——跑长了会堵住其他中断。队列是中断（快、短）和主循环（慢、长）之间的缓冲。

对比传统的"轮询 + 延时"：主循环 `if (按键) { 延时 10ms; if (还按下) { 做事 } }`。坏处是延时 10 ms 期间 CPU 啥都干不了——对实时系统是灾难。事件驱动的响应延迟只有几微秒（中断响应 + 排队），而轮询的平均延迟 = 轮询周期 / 2 + 消抖时间。

两种经典 FSM：

1. **按键消抖**：4 个状态（IDLE → DB_PRESS → PRESSED → DB_REL），事件是"按下""松开""10 ms 定时到"。只有定时到时还保持原电平才确认——抖动会被"定时内电平变化"挡掉。
2. **串口帧解析**：4 个状态（SYNC → LEN → PAYLOAD → CRC），事件是"收到字节"。收到帧头 0xAA 进入 LEN，读长度后进入 PAYLOAD，收满后进入 CRC，校验通过/失败都回到 SYNC。任何时刻收到意外字节都能"优雅回退"。

## 3. 正式定义

有限状态机是一个五元组：

$$
M = (S,\ \Sigma,\ \delta,\ s_0,\ F)
$$

| 符号 | 含义 |
| --- | --- |
| $S$ | 有限状态集 |
| $\Sigma$ | 事件（输入）集 |
| $\delta: S \times \Sigma \to S$ | 转移函数 |
| $s_0 \in S$ | 初始状态 |
| $F \subseteq S$ | 接受状态（可选） |

运行规则：当前状态 $s$，收到事件 $e$，下一个状态 $s' = \delta(s, e)$。若 $\delta(s, e)$ 未定义，则忽略该事件（保持在 $s$）。

**事件驱动架构**的两段式：

```
中断 ISR:  事件入队（O(1)，几条指令）
主循环:    while (队列非空) { e = 出队; s = δ(s, e) }
```

响应延迟对比：

$$
t_\text{poll} = \frac{T_\text{poll}}{2} + t_\text{debounce},\qquad t_\text{event} = t_\text{ISR} + t_\text{queue}
$$

典型值：$t_\text{poll} \approx 15$ ms（轮询周期 10 ms + 消抖 10 ms）、$t_\text{event} \approx 0.1$ ms。

## 4. 分步例题

**例**：按键消抖 FSM，当前在 IDLE 状态，收到事件序列 `press, tick, release, tick`。

1. IDLE + press → DB_PRESS（启动 10 ms 定时器）；
2. DB_PRESS + tick → PRESSED（确认按下，上报按键事件）；
3. PRESSED + release → DB_REL（启动 10 ms 定时器）；
4. DB_REL + tick → IDLE（确认松开，上报抬起事件）。

**抖动场景**：`press, release, press, tick`。

1. IDLE + press → DB_PRESS；
2. DB_PRESS + release → IDLE（10 ms 内弹起 → 判为抖动，丢弃）；
3. IDLE + press → DB_PRESS（重新启动定时）；
4. DB_PRESS + tick → PRESSED。

抖动被消除了——只有持续按下超过 10 ms 才被确认。

## 5. 动手实验

### 实验 1：拖着看（lab 组件）

切换"按键消抖"和"串口帧解析"两种 FSM，点事件按钮模拟中断入队，点"单步"模拟主循环出队，观察状态转移图、事件队列与延迟对比：

```lab
{
  "type": "fsm-embedded",
  "title": "嵌入式状态机",
  "fsm": "debounce",
  "poll": 10,
  "len": 3
}
```

开"自动喂事件"看随机事件流下状态机的行为。注意底部延迟条——事件驱动（绿色）比轮询（红色）短两个数量级。

### 实验 2：自己算（Python）

```python title="按键消抖状态机仿真"
# 模拟事件序列下状态机的跳转
def next_state(state, event):
    # 状态转移表：消抖 FSM
    table = {
        ("IDLE", "press"): "DB_PRESS",
        ("DB_PRESS", "tick"): "PRESSED",
        ("DB_PRESS", "release"): "IDLE",   # 抖动
        ("PRESSED", "release"): "DB_REL",
        ("DB_REL", "tick"): "IDLE",
        ("DB_REL", "press"): "PRESSED",     # 抖动
    }
    return table.get((state, event), state)  # 未定义 → 保持

events = ["press", "release", "press", "tick", "release", "tick"]
state = "IDLE"
for ev in events:
    new = next_state(state, ev)
    print(f"{state:10} + {ev:8} → {new}")
    state = new
print(f"最终状态: {state}")
```

### 快问快答

```quiz
事件驱动架构中，中断 ISR 的职责是什么？
- 执行状态机全部逻辑
- 只把事件放入队列，主循环处理 [*]
? 中断要快——跑状态机会堵住其他中断。ISR 只入队（几条指令），主循环慢慢出队处理。这是"快中断慢主循环"的分治。
```

## 6. 常见误区

:::warning[常见误区]
- **「状态越多越好」**——状态越多，转移边数 $O(|S|^2)$ 爆炸。消抖只要 4 个状态，串口解析也只要 4 个。如果发现状态超过十几个，通常是"把数据当状态"了——把"已收到第 3 个字节"这种计数信息放进状态变量（`mem.n`），而不是开 200 个状态。
- **「中断里直接跑状态机」**——能跑，但不该跑。中断里跑长了会阻塞低优先级中断，而且状态机里可能有慢操作（写显示、发数据）。正确做法是中断入队、主循环出队。
- **「FSM 只能做协议解析」**——FSM 是一种**通用建模工具**：电机控制（启动→加速→匀速→减速→停止）、充电管理（预充→恒流→恒压→满电）、用户界面（菜单导航）全是 FSM。只要是"等事件 → 响应"的场景都适用。
:::

## 7. 练习

```exercise
# @title: 串口帧解析状态机
# @check: SYNC
# @hint: 收到 0xAA 从 SYNC 进 LEN，收到 data 从 LEN 进 PAYLOAD
# 串口帧解析 FSM，当前状态 SYNC。
# 事件序列: "aa" "data" "data" "data" "ok"
# 写出每个事件后的状态，最后一行的状态是什么？
states = ["aa", "data", "data", "data", "ok"]
cur = "SYNC"
transitions = {
    ("SYNC", "aa"): "LEN",
    ("SYNC", "data"): "SYNC",
    ("LEN", "data"): "PAYLOAD",
    ("PAYLOAD", "data"): "PAYLOAD",
    ("PAYLOAD", "ok"): "SYNC",
}
for ev in states:
    cur = transitions.get((cur, ev), cur)
    print(cur)
```

<details>
<summary>选读 · 为什么 Mealy 机和 Moore 机不一样</summary>

状态机有两种定义：

- **Moore 机**：输出只取决于当前状态。$y = f(s)$。消抖 FSM 里"上报按键"只在 PRESSED 状态发生——这就是 Moore 机。
- **Mealy 机**：输出取决于状态**和输入**。$y = f(s, e)$。串口解析里"丢弃非帧头字节"发生在 SYNC 状态收到非 0xAA 字节时——输出依赖输入。

Moore 机更简单（输出与时钟同步），但状态可能更多（同一逻辑要拆成多个状态）。Mealy 机状态更少，但输出与输入异步——在时序电路里可能产生毛刺。

嵌入式软件里几乎都用 Moore 机：状态 = 结构，事件 = 输入，状态内的动作 = 输出。这样代码是 `switch(state) { case IDLE: ... }` 的结构，可读性好。Mealy 机更多出现在硬件描述语言（VHDL/Verilog）里。

</details>

## 8. 下一站

状态机管的是"怎么响应事件"，但事件要在芯片之间传递——下一种技术让多个芯片用两根线互相对话。

→ [通信总线 UART/I2C/SPI/CAN](./130-bus-protocols.md)
