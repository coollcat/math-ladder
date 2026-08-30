---
title: 第 40 章 · 信息论
description: 把不确定性变成可测量对象：熵、交叉熵、KL 散度、互信息与编码。
volume: 4
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 3
---

# 信息论

信息论回答一个看似主观的问题：“这条消息消除了多少意外？”熵把不确定性变成数，编码定理告诉我们压缩和传输的理论边界。

这一章按下面的路线图推进：

1. [什么是信息：惊讶可以度量](./10-self-information.md)——两条消息摆在一起："明天太阳从东边升起"和"明天彩票中了头奖"；
2. [熵：不确定性的期望](./20-entropy.md)——两个频道任你订阅：甲频道每小时播一次"一切正常"（概率 0.999），乙频道滚动播报地震、股市熔断、…；
3. [编码与压缩的下界](./30-coding-compression.md)——一份 100 MB 的原始传感器日志，ZIP 一压只剩 30 MB；
4. [典型序列：熵的下界为何可达](./35-typical-sequences.md)——抛一枚偏心硬币 100 次：几乎全部概率质量压在一小撮"典型序列"上，香农定理的地基在这里打桩；
5. [信道与噪声：在有干扰的世界里通信](./40-channel-noise.md)——你的耳机和手机之间隔着一张沙发、一堵墙，还有微波炉、WiFi 路由器在同一个频段上狂轰滥炸；
6. [交叉熵与对数损失：说错话的代价](./50-cross-entropy-loss.md)——价目表照去年的包裹统计制定，今年世界却变了样：拿过期的频率给真实的世界记账，月底那笔总账单就是交叉熵——机器学习天天优化的对数损失正是它的马甲；
7. [KL 散度：不对称的信息距离](./60-kl-divergence.md)——衡量两个分布差多远的第一标尺，但它有个怪脾气：从 A 到 B 和从 B 到 A，量出来的数值不一样；
8. [互信息：两个变量共享多少信息](./70-mutual-information.md)——温度计和湿度计各自都诚实，却在偷偷剧透彼此：两个变量平均共享几比特，特征筛选和医学检验都在为这笔“情报往来”计价；
9. [无损编码与 Huffman 编码](./80-huffman-coding.md)——摩尔斯电码靠发报员按频率拍脑袋分配长短，Huffman 算法接过接力棒：每次合并最轻的两捆树枝，自动生成理论最优的前缀码；
10. [困惑度与信道容量：语言模型和通信的共同标尺](./90-perplexity-channel-capacity.md)——一个管 AI 的脑子、一个管无线电的波，但语言的迷茫和链路的风浪，最终记在同一本熵账上。

## 前置回望

第 09 章的概率和期望、第 03 章的对数、第 15 章的级数收敛共同定义熵；现代机器学习里的交叉熵会从这里获得出生证明。

## 计划交互形态

已落地（主线四课全部上线）：

- 自信息曲线「越罕见越惊人」（自信息课，plot 组件）；
- 二元熵曲线 h(p) 与信道容量曲线 1−h(e)（熵 / 信道两课，plot 组件）；
- 四符号频数条形图——偏得越狠压得越多（《编码与压缩的下界》，datachart 组件）；变长码与香农下界的对照计算走浮窗 Python；
- 判题式练习与选择题四课全覆盖。

待实现：交互式编码长度压缩实验升级版、KL 散度地形漫游、互信息热力图，随交叉熵、KL、互信息等新课立项。

:::note[生产状态]

核心主线四门已上线（2026-08）：[什么是信息：惊讶可以度量](./10-self-information.md)、[熵：不确定性的期望](./20-entropy.md)、[编码与压缩的下界](./30-coding-compression.md)、[信道与噪声：在有干扰的世界里通信](./40-channel-noise.md)。同月第二批五门上线：[交叉熵与对数损失：说错话的代价](./50-cross-entropy-loss.md)、[KL 散度：不对称的信息距离](./60-kl-divergence.md)、[互信息：两个变量共享多少信息](./70-mutual-information.md)、[无损编码与 Huffman 编码](./80-huffman-coding.md)、[困惑度与信道容量：语言模型和通信的共同标尺](./90-perplexity-channel-capacity.md)。本批新课接通机器学习应用面。同月回填理论承重课[典型序列：熵的下界为何可达](./35-typical-sequences.md)，为香农第二定理补上严格版的地基——本章十门齐线。

:::

## 实战挑战 · 蓝牙、WiFi 与深空：三本抗干扰账

现实中的干扰形态不同，但信息论给出的预算思路一致：先让坏运气少发生，再让残余错误被编码纠正。下面三个场景都做了教学简化，工程机制是真的。

| 战场 | 真实机制 | 信息论视角 |
| --- | --- | --- |
| 蓝牙 | 经典蓝牙在 2.4 GHz 用 79 个 1 MHz RF 信道，连接态每秒跳 1600 次；AFH 会标记受扰信道并避开 | 跳频把集中干扰摊薄成零星丢失 |
| WiFi | 支持 DFS 的 5 GHz WLAN 检测到雷达信号后，必须按法规让出相关信道 | 先躲开已知窄带威胁，保住剩余容量 |
| 深空 | 现代深空链路用 Turbo/LDPC 这类接近香农限的前向纠错；往返延迟太大，不能靠反复重传 | 少量冗余换来极低残余错误率 |

### 第一本账：蓝牙自适应跳频

经典蓝牙规范给出 79 个信道，中心频率为 $f = 2402 + k$ MHz（$k$ 取 0 到 78），连接态跳速 1600 跳/秒。设微波炉污染其中 15 个，AFH 把它们全部剔除。

**(a)** 还剩多少可用信道？第一问已示范：

```exercise
# @title: 实战挑战：给蓝牙算抗干扰账本
# @check: 64
# @check: 6
# @check: 9600
# @check: 2480
# @check: 8
# @check: 640
# @check: 67
# @check: 30
# @check: 0.286
# @check: 0.714
# @check: 107
# @check: 3.6
# @hint: 蓝牙：64 是 2 的几次幂，选择开销=6×1600，最高频=2402+78；WiFi：剩 8 条、总容量 8×80、百分比取整；深空：载荷=150÷5，h(0.05) 和容量保留三位小数，安全比保留一位小数。
print(79 - 15)             # (a) 剩余可用信道数（已示范）
print()                    # (b) 区分全部可用信道所需的比特数
print()                    # (c) 每秒用于信道选择的比特吞吐量
print(12 + 4)              # (e) WiFi 让出 4 条后还剩几条——有 bug
print()                    # (f) 剩余 WiFi 总容量（Mbps）
print()                    # (g) 保留容量的整数百分比
print(150 * 5)             # (h) 码率 1/5 时的有效载荷速率——有 bug
print(round(1, 3))         # (i) 二元熵 h(0.05)，三位小数
print(round(1, 3))         # (j) BSC 容量，三位小数
print()                    # (k) 该链路可靠承载的最大载荷速率（取整）
print(round(1, 1))         # (l) 最大载荷 ÷ 实际载荷，一位小数
```

<details>
<summary>点开查看参考实现与逐步解答</summary>

```python
import math   # 数学函数库

# 蓝牙
clean_channels = 79 - 15
address_bits = 6                      # 2^6 = 64
hopping_cost = address_bits * 1600
top_frequency = 2402 + 78

print(clean_channels)
print(address_bits)
print(hopping_cost)
print(top_frequency)

# WiFi DFS：原计划 12 条信道，雷达触发后让出 4 条
wifi_channels_left = 12 - 4
wifi_capacity_left = wifi_channels_left * 80
wifi_percent_kept = round(wifi_capacity_left / (12 * 80) * 100)

print(wifi_channels_left)
print(wifi_capacity_left)
print(wifi_percent_kept)

# 深空 FEC：原始符号率 150 symbol/s，码率 1/5
raw_rate = 150
payload_rate = raw_rate // 5
p = 0.05
h_noisy = round(-p * math.log2(p) - (1 - p) * math.log2(1 - p), 3)
capacity = round(1 - h_noisy, 3)
max_payload = int(raw_rate * capacity)
safety_ratio = round(max_payload / payload_rate, 1)

print(payload_rate)
print(h_noisy)
print(capacity)
print(max_payload)
print(safety_ratio)
```

**(a)** $79-15=64$ 个。

**(b)** $64=2^6$：连续除以 2 六次归一，所以区分 64 个信道需要 **6 比特**。反过来验证 $2^6=64$ ✓。若只剔除 16 个坏信道剩 63 个呢？$2^6=64 \ge 63 > 32$，仍需 6 比特——比特数看的是向上取整后的幂。

**(c)** $6\times 1600=9600$ 比特/秒花在"下一跳去哪"这件事上。这是跳频协议的隐形开销：频率序列本身就是一条高速暗流，偷听者跟不上序列就跟不上对话。

**(d)** $f=2402+78=2480$ MHz。核对规范边界：最低 2402 MHz、最高 2480 MHz、间隔 78 MHz、共 79 个信道点——与「2.402–2.4835 GHz 频段」的描述吻合。

**(e)-(g)** WiFi 的 DFS 不是“硬扛雷达”：12 条计划信道让出 4 条后剩 8 条，总容量 $8\times80=640$ Mbps，保留比例取整为 67%。法规让频损失瞬时峰值，却避免雷达系统被持续撞击。

**(h)-(l)** 深空链路不能靠频繁重传，所以用码率 $1/5$ 的前向纠错：150 个原始符号只携带 30 比特有效载荷。若把原始符号错误简化成 $e=0.05$ 的二元对称信道，则 $h(0.05)\approx0.286$，容量约 0.714 比特/符号；理论最大载荷约 $150\times0.714=107$ bps，实际 30 bps 只用了不到三分之一预算，留下工程裕量给衰落、指向误差和非理想译码。

工程注脚：蓝牙 AFH 和 WiFi DFS 先躲开可识别干扰；深空 FEC 则兜住长延迟下不能反复重传的残余错误。三种战术合在一起，才是完整的抗干扰预算。

</details>

```quiz
蓝牙、WiFi DFS 和深空 FEC 的共同思想是什么？
- 把发射功率无限调大
- 先降低已知坏结果的发生机会，再用编码/协议兜住残余错误 [*]
- 加密能让干扰消失
? 蓝牙跳频和 WiFi 让频是在时间或频率上躲开强干扰；深空 FEC 承担长延迟下不能重传的残余错误。三者都在做“干扰预算”，不是靠魔法消灭噪声。
```

相关课程：[信道与噪声：在有干扰的世界里通信](./40-channel-noise.md)、[编码与压缩的下界](./30-coding-compression.md)，以及第 35 章的[通信模型与噪声](../35-coding-theory/10-channel-model.md)。

## 实战挑战 · 熵的负号别丢

熵的公式 $H = -\sum p_i \log_2 p_i$ 里那个**负号**不能丢——概率的对数是非正的，负号才让熵为正。分布 $(0.5, 0.25, 0.25)$ 的熵是 $1.5$ 比特。下面这题漏了负号，修到输出 `1.5`：

```exercise
# @title: 实战挑战：熵的负号别丢
# @check: 1.5
# @hint: 熵 = −Σ p·log2(p)，漏了负号就全变成负数。
import math

p = [0.5, 0.25, 0.25]
H = 0.0
for x in p:
    H = H + x * math.log(x, 2)    # ← 问题在这：漏了负号
print(round(H, 4))
```

<details>
<summary>点开查看逐步解答</summary>

熵要取负号：

```python
H = H - x * math.log(x, 2)   # −Σ p·log2(p)
print(round(H, 4))           # 1.5
```

改完：$H = -(0.5\times(-1) + 0.25\times(-2) + 0.25\times(-2)) = 0.5+0.5+0.5 = 1.5$ 比特。初始代码漏负号，得 $-1.5$——熵为负在物理上说不通（信息量不能是负的）。这个负号来自"概率的对数恒为负"，是熵能度量"不确定性"的起点。

</details>
