---
title: 可靠传输与拥塞控制
lesson_id: computer-systems/tcp-congestion
prereqs:
  - computer-systems/network-layers
  - control/open-loop-closed-loop
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L10
track:
  - optimization-control
  - information-learning
stage: university-core
difficulty: 4
introduces_concepts:
  - congestion-window
  - slow-start-congestion-avoidance
  - additive-increase-multiplicative-decrease
  - fast-retransmit-recovery
applications:
  - transport-protocol
  - network-tuning
  - video-streaming
exits:
  - engineering
---

# 可靠传输与拥塞控制

## 1. 从一个场景开始

下载大文件时，速度表会画出一条奇特的曲线：**猛地窜上去，斜着往上爬，然后在某一刻骤然掉到谷底，再慢慢爬回来**——反复循环，像一把锯子。

这不是硬盘在忙，也不是服务器偷懒。**这条锯齿是整个互联网赖以不崩溃的呼吸节拍**，而刻下它的，是一套只有四个分支状态的算法。

## 2. 直觉解释

TCP 面对两个完全不同的问题：

| 问题 | 症状 | 靠什么感知 | 处方 |
| --- | --- | --- | --- |
| **丢包** | 某个包没到 | 超时 / 重复 ACK | **重传**（可靠传输） |
| **拥塞** | 路由器队列排满，开始丢包 | 只能靠"丢包"间接推断 | **减速**（拥塞控制） |

难点在于：TCP **看不见网络内部**。它不知道链路有多宽、队列有多长，只能靠"我发出去的东西有没有按时回来"来猜。

于是它用一套"试探—扩张—退让"的策略：**每个 RTT 把发送量加一点点（加性增），一旦发现丢包就把发送量砍一半（乘性减）。**

$$\text{AIMD：加性增、乘性减} \quad\Longrightarrow\quad \text{收敛到公平共享带宽}$$

## 3. 正式定义

**拥塞窗口 cwnd**：一个 RTT 内允许发出但尚未被确认的最大字节数（常以 MSS 为单位）。

**吞吐量上界**：

$$\text{吞吐} \approx \frac{\text{cwnd} \times \text{MSS}}{\text{RTT}}$$

**慢启动阈值 ssthresh**：区分两个增长阶段的门限。四个状态转移：

| 阶段 | 触发条件 | 每 RTT 的 cwnd 变化 | 增长率 |
| --- | --- | --- | --- |
| 慢启动 | $\text{cwnd} < \text{ssthresh}$ | $\text{cwnd} \leftarrow \text{cwnd} \times 2$ | 指数 |
| 拥塞避免 | $\text{cwnd} \ge \text{ssthresh}$ | $\text{cwnd} \leftarrow \text{cwnd} + 1$ | 线性 |
| 超时重传 | RTO 到期 | $\text{ssthresh} \leftarrow \text{cwnd}/2,\ \text{cwnd} \leftarrow 1$ | 乘性减到 1 |
| 快重传/快恢复 | 收到 3 个重复 ACK | $\text{ssthresh} \leftarrow \text{cwnd}/2,\ \text{cwnd} \leftarrow \text{ssthresh} + 3$ | 乘性减到半 |

| 符号 | 含义 | 典型值 |
| --- | --- | --- |
| cwnd | 拥塞窗口 | 初始 Linux 为 **10 MSS** |
| ssthresh | 慢启动阈值 | 初始通常很大（无穷） |
| RTO | 重传超时 | Linux 最小 **200 ms**，初始 **1 s** |
| RTT | 往返时延 | 同城 1 ms、跨省 30 ms、跨洋 150 ms |
| MSS | 最大报文段长度 | 1460 B（第 120 课） |

**为什么"3 个重复 ACK"就能判断丢包**：接收方收到乱序包时会重发对上一个有序包的确认。发送方连续收到 3 个同样的 ACK，说明**后面的包到了、中间那个没到**——几乎可以确定是丢了一个，不必等 RTO（几百毫秒）才反应。

## 4. 分步例题

**例**：$\text{ssthresh} = 16$，从 $\text{cwnd} = 1$ 出发。列出前 6 个 RTT 的 cwnd，并算 $\text{cwnd} = 16$、$\text{RTT} = 60$ ms 时的吞吐。

1. RTT 1：$\text{cwnd} = 2$（慢启动翻倍）；
2. RTT 2：$4$；RTT 3：$8$；RTT 4：$16$（达到阈值，下一轮切拥塞避免）；
3. RTT 5：$17$（线性 +1）；RTT 6：$18$；
4. 吞吐：$\dfrac{16 \times 1460 \times 8}{0.06} = \dfrac{186880}{0.06}\ \text{bit/s} \approx \mathbf{3.11\ Mbps}$；
5. 若此时超时：$\text{ssthresh} = 8$、$\text{cwnd} = 1$，吞吐瞬间掉到 $\dfrac{1460 \times 8}{0.06} \approx 0.19$ Mbps——**一个 RTT 之内掉到 6%**；
6. 随后慢启动只需 3 个 RTT 就回到 8，再线性爬到 16 需要 8 个 RTT。**爬得慢、跌得快**，这正是 AIMD 的形状。

## 5. 动手实验

### 实验 1（lab）：亲手点出那条锯齿

```lab
{
  "type": "tcp-congestion",
  "title": "TCP 拥塞控制：慢启动、拥塞避免与乘性减",
  "sliders": [
    { "name": "ssthresh", "label": "慢启动阈值", "min": 4, "max": 32, "step": 1, "value": 16 },
    { "name": "rtt", "label": "RTT (ms)", "min": 10, "max": 300, "step": 5, "value": 60 }
  ]
}
```

"推进 1 个 RTT" 逐步走，"触发超时重传"与"触发 3 次重复 ACK"用来注入丢包。读数里实时给出 cwnd、ssthresh、状态、吞吐与累计发送量。

做三组对照：

- 连点"推进 1 个 RTT"：看 cwnd 先翻倍（2→4→8→16），到阈值后变成 +1（16→17→18）。曲线由陡变缓的**拐点就是 ssthresh**；
- 爬到高处在"触发超时重传"：**cwnd 直接跌回 1**，红点标在图上；
- 再爬高后点"触发 3 次重复 ACK"：**只掉一半**（cwnd = ssthresh + 3），曲线跌幅明显小于超时。**这就是快恢复的价值：一个 RTT 内丢一个包，不该把一切推倒重来。**
- 把 RTT 从 60 ms 拖到 300 ms，看"吞吐"那一栏：**同样的 cwnd，吞吐掉到五分之一**。这就是为什么跨洋链路必须调窗口。

### 实验 2（python）：把锯齿算出来

```python title="cwnd 的锯齿：加性增、乘性减"
mss = 1460                 # 字节
rtt = 0.06                 # 秒
ssthresh = 16.0
cwnd = 1.0
phase = "slow"             # 阶段：slow 慢启动 / avoid 拥塞避免
rows = []

def tput(c):               # 吞吐(Mbps) = cwnd × MSS × 8 ÷ RTT
    return c * mss * 8 / rtt / 1e6

for r in range(1, 25):
    if phase == "slow":
        cwnd = min(cwnd * 2, ssthresh)     # 指数增长，但不超过阈值
        if cwnd >= ssthresh:
            phase = "avoid"
    else:
        cwnd = cwnd + 1                    # 加性增：每 RTT +1 MSS
    if r == 18:                            # 第 18 轮遇到一次超时重传
        ssthresh = max(cwnd / 2, 2)        # 乘性减：阈值砍半
        cwnd = 1.0                         # 窗口回到 1，重新慢启动
        phase = "slow"
        rows.append((r, cwnd, ssthresh, "← 超时"))
    else:
        rows.append((r, cwnd, ssthresh, ""))

for r, c, s, ev in rows:
    print(f"RTT {r:>2}  cwnd={c:>4.0f}  ssthresh={s:>4.0f}  {tput(c):>6.2f} Mbps {ev}")
print(f"\n最后：{tput(rows[-1][1]):.2f} Mbps；峰值：{tput(max(r[1] for r in rows)):.2f} Mbps")
```

看第 18 行那个断崖：`cwnd` 从 30 直接回到 1，吞吐从 5.8 Mbps 掉到 0.19 Mbps。**这就是你在下载器速度曲线上看到的那道坎。**

### 快问快答

```quiz
为什么 TCP 在慢启动阶段用指数增长，而过了阈值就改成线性增长？
- 因为线性增长实现起来更简单
- 因为慢启动要尽快探到可用带宽（离目标还远，可以激进），而拥塞避免阶段已经在阈值附近，必须小心试探，否则立刻丢包 [*]
- 因为路由器会强制限制指数增长
? ssthresh 记录的是「上次发生拥塞时窗口的一半」，也就是「上一次的安全水位」。离安全水位还远时，翻倍地冲过去代价很低；一旦越过，就必须每个 RTT 只加 1 个 MSS，慢慢摸出新的上限。这两段合起来就是「先粗探、后精调」。
```

:::warning[常见误区]

**误区一**："cwnd 越大越好，把它开到最大就能跑满带宽。"
你以为窗口只受自己控制——**cwnd 的上限由网络决定，不是由你决定**。窗口超过带宽时延积（BDP）之后，多出来的包只是堆在路由器队列里，导致排队时延暴涨，最终触发丢包、窗口被砍。**"跑满带宽"与"不制造排队"是矛盾的**：把队列填满意味着时延上升，而时延上升又会让你误判丢包。

**误区二**："丢包一定意味着网络拥塞。"
你以为两者等价——在有线网络里这个近似还行；但在 Wi-Fi、蜂窝网络上，**大量丢包来自无线链路的误码，与拥塞毫无关系**。传统 TCP 一律当成拥塞处理，于是在信号不好的地铁里会莫名其妙地越跑越慢。这正是新一代算法（BBR）与 QUIC 要解决的问题。

**误区三**："拥塞控制是 TCP 的专利，其他层不用管。"
你以为它在第 4 层就结束了——**拥塞是整个系统的性质**：路由器的队列管理（如 CoDel 主动丢包）、应用层的码率自适应（视频网站自动降清晰度）、QUIC 把拥塞控制搬到了用户态，都在做同一件事。**只有端系统合作，AIMD 才收敛；任何自私的发送方都能占便宜，也能拖垮整条链路。**

:::

## 6. 练习

**练习 1**：这台模拟器过了阈值还在翻倍，cwnd 爆炸到 128。修到输出 `19`：

```exercise
# @title: 练习：过了阈值还在指数增长
# @check: 19
# @hint: cwnd 达到 ssthresh 之后就要切到拥塞避免：每个 RTT 只加 1 个 MSS（加性增）。代码在两个阶段都翻倍
cwnd = 16.0          # 拥塞窗口（单位：MSS）
ssthresh = 16.0      # 慢启动阈值
for r in range(3):   # 推进 3 个 RTT
    if cwnd < ssthresh:
        cwnd = cwnd * 2        # 慢启动：每轮翻倍
    else:
        cwnd = cwnd * 2        # ← 问题在这：拥塞避免应该改成 cwnd + 1
print(int(cwnd))
```

**练习 2**：跨洋链路 RTT = 150 ms、MSS = 1460 B。要在单条 TCP 连接上跑满 1 Gbps，cwnd 至少需要多少个 MSS？若发生一次超时，需要多少个 RTT 才能爬回去？

<details>
<summary>点开查看逐步解答</summary>

1. 需要的窗口 $= \dfrac{1\ \text{Gbps} \times 0.15\ \text{s}}{1460 \times 8} = \dfrac{1.5\times10^8}{11680} \approx 12842$ 个 MSS（约 **18.8 MB**）；
2. 这个数字远超经典 TCP 头里 16 位窗口字段能表示的最大值 65535 字节（约 45 个 MSS）——**所以必须启用窗口扩大选项（window scaling）**，否则永远跑不满；
3. 超时后 cwnd 回到 1、ssthresh = 6421。慢启动阶段：$1 \to 6421$ 需要 $\log_2 6421 \approx 13$ 个 RTT；
4. 之后拥塞避免阶段从 6421 爬到 12842，每 RTT 加 1，需要 $12842 - 6421 = 6421$ 个 RTT ≈ **16 分钟**！；
5. 结论：长肥管道上一次超时的代价是灾难性的（16 分钟才能恢复）。这就是为什么高带宽长时延场景要用 **BBR 或多条并发连接**——**AIMD 的线性恢复，在 BDP 大起来之后就成了瓶颈。**

</details>

## 7. 选读：从丢包驱动到模型驱动

<details>
<summary>选读 · BBR 与拥塞控制的下一站</summary>

传统 TCP（Reno / CUBIC）把**丢包**当作拥塞信号。这个信号有两个毛病：来得**太晚**（队列已经满了才开始丢），而且**不可靠**（无线误码会误报）。

**BBR（Google，2016）** 换了一个思路：不去猜"丢了多少"，而是直接**测量**网络的两个物理极限：

$$\text{BDP} = \text{BtlBw（瓶颈带宽）} \times \text{RTprop（往返传播时延）}$$

- **BtlBw**：观测到的最大交付速率；
- **RTprop**：观测到的**最小** RTT（此时队列是空的）；
- 目标工作点：$cwnd = \text{BDP}$ ——**刚好填满管道，又不产生排队**。

BBR 周期性地把发送速率上调 25% 去探测带宽是否变大，再下调去排空队列。它因此能在浅缓冲、高带宽、有一定丢包率的链路上取得数倍于 CUBIC 的吞吐，代价是在与 CUBIC 共存时会抢占带宽（公平性问题，至今仍在争论）。

**QUIC** 则把整套拥塞控制放到了用户态（跑在 UDP 之上），于是算法可以按应用需要随时替换、随版本快速迭代——**这是"分层"与"端到端原则"的一次现实胜利。**

</details>

## 8. 下一站

TCP 管的是"两个端点之间"的事。那么"从这台机器到那台机器该走哪条路"，是谁在决定？

→ [路由与转发](./140-routing-lab.md)
