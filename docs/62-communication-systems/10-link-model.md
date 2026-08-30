---
title: 通信链路与收发模型
lesson_id: communication-systems/link-model
prereqs:
  - prob/stats
volume: 5
layer: L11
track:
  - information-learning
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - transceiver-chain
  - symbol
  - baud-rate
applications:
  - voice-message
  - uart-serial
exits:
  - engineering
---

# 通信链路与收发模型

## 1. 从一个场景开始

按下微信的语音键，1 秒的声音开始了它的奇幻漂流：变成数字、打包、调制到高频、从天线射进空气，撞上墙壁、躲过微波炉、混着噪声抵达另一根天线，再被一步步还原成声音。整个过程不到百毫秒，出错率低到可以忽略。

这条流水线的每个工位都对应一类数学。本章的任务是把流水线一台台拆开看：为什么非要这么多级？每一级到底在跟哪种「坏东西」作斗争？

## 2. 直觉解释

把通信系统想象成**跨国邮寄一件玻璃工艺品**：

| 工位 | 通信系统里的名字 | 它对付的困难 |
| --- | --- | --- |
| 打包加固 | 信源编码 + 信道编码 | 体积太大 / 路上磕碰 |
| 贴运单写地址 | 调制 | 声音跑不远，要驮在高频波上 |
| 运输途中 | 信道 | 噪声、衰落、干扰 |
| 拆包验货 | 解调 + 译码 | 把磕碰造成的错误修回来 |

两个关键词汇先行登场：发送端把若干比特捆成一个**符号**（symbol），每次发出一个符号；符号的发送速度叫**波特率**（baud）。就像快递既论「件数」也论「货物总量」，通信既论波特率也论比特率——两者的换算正是下一节的算术。

## 3. 正式定义

数字通信系统的标准链路（自左向右）：

$$\text{比特} \to \text{信道编码} \to \text{映射为符号} \to \text{脉冲成形/调制} \to \text{信道} \to \text{解调} \to \text{判决} \to \text{译码} \to \text{比特}$$

| 符号/术语 | 名字 | 含义 |
| --- | --- | --- |
| $M$ | 电平数/符号集大小 | 一个符号能取的不同状态数 |
| $\log_2 M$ | 每符号比特数 | 捆绑效率 |
| $R_B$ | 波特率 | 每秒发出的符号个数 |
| $R_b = R_B \log_2 M$ | 比特率 | 每秒搬运的信息量（bps） |
| 判决 | decision | 接收端把带噪波形「投票」回最近的符号 |

链路哲学一句话：**发送端负责把信息变得抗揍，接收端负责在挨打后认出原文。** 中间的信道是唯一不受你控制的环节，整条链路的设计本质上都是围绕它做的防御工事。

## 4. 分步例题

**例**：某串口设备以 2400 波特发送 16 电平的符号（每个符号可取 16 种值）。比特率是多少？

1. 每符号能携带的信息量：$\log_2 16 = 4$ 比特（16 = 2×2×2×2，四次二选一）；
2. 波特率 $R_B = 2400$ 符号/秒；
3. 比特率 $R_b = 2400 \times 4 = 9600$ bps——这正是老式调制解调器「9600」型号名的由来；
4. 反向运用：若想在不提高波特率的前提下翻倍比特率，只能把电平数翻倍（16→256 电平才多 4 bit）——但电平越密，噪声稍一推挤就认错符号，第 50 号课会算这笔账。

## 5. 动手实验

### 实验 1（python）：四级流水线走一遍

```python title="把两个字母送进迷你通信链路"
import matplotlib.pyplot as plt  # 画图库（卷一已引入）

message = "hi"                   # 原始消息
bits = []                        # 第一站：信源编码——字符变比特
for ch in message:
    code = ord(ch)               # ord：字符的编码数值（如 h 是 104）
    bits.append((code >> 1) % 2) # 右移后取余：拿出倒数第二位做演示
    bits.append(code % 2)        # 拿出最后一位

symbols = []                     # 第二站：映射——每 2 比特捆成 1 个四电平符号
for i in range(0, len(bits), 2):
    symbols.append(2 * bits[i] + bits[i + 1])

received = list(symbols)         # 第三站：信道——理想信道原样送达
decided = received               # 第四站：判决——最近电平即原符号（此处无噪声）

rebuilt_bits = []                # 第五站：逆映射回比特
for s in decided:
    rebuilt_bits.append(s // 2)  # 整除取商：高位
    rebuilt_bits.append(s % 2)   # 取余：低位

print(f"原始比特: {bits}")
print(f"发送符号: {symbols}")
print(f"还原比特: {rebuilt_bits}")
print("链路无差错:", bits == rebuilt_bits)
```

运行可见比特流被捆包、运输、拆包的全过程，`链路无差错: True`。把第三站的 `list(symbols)` 改成 `[s if s != 3 else 1 for s in symbols]` 模拟一次信道捣乱，再看输出——判决环节会忠实放大错误。真实系统靠信道编码兜底，第 35 章的老朋友该出场了。

### 实验 2（python 滑块）：噪声往符号上泼脏水

```python title="拖动噪声强度 sigma，看接收端的处境"
# sliders: sigma=0.3 [0:1.2:0.1]
import random                    # 随机数库（卷一已引入）
import matplotlib.pyplot as plt

levels = [-3, -1, 1, 3]          # 四个标准电平
N = 60                           # 每个电平发 60 次
rx = []                          # 接收到的（带噪）取值
tx = []                          # 记录实际发的是哪个电平
errors = 0                       # 判决错误计数

for sent in levels:
    for i in range(N):
        r = sent + random.gauss(0, sigma)   # gauss(mu,sd)：均值为 mu、标准差为 sd 的正态噪声样本
        guess = levels[0]                   # 判决：找最近的电平
        for L in levels:
            if abs(r - L) < abs(r - guess):
                guess = L
        rx.append(r)
        tx.append(sent)
        if guess != sent:
            errors = errors + 1

print(f"误码 {errors} / {4 * N}")

plt.figure(figsize=(7, 2.6))
plt.scatter(rx, tx, s=12, color="steelblue")    # 纵轴=发送电平，横轴=接收值
plt.yticks(levels)                              # yticks：指定纵轴刻度的位置
plt.axvline(-2, color="gray", linewidth=0.8)    # 判决边界画出来
plt.axvline(0, color="gray", linewidth=0.8)
plt.axvline(2, color="gray", linewidth=0.8)
```

sigma=0 时每列蓝点是一条细线；慢慢拖大噪声，各列开始「越界串门」——点越过灰色判决边界的那部分就是误码来源。这个图是眼图与星座图的胚胎，50 号课将给它加上时间轴。

### 快问快答

```quiz
波特率 1200、每符号 3 比特，比特率是多少？
- 400 bps
- 1200 bps
- 3600 bps [*]
? 每符号 3 比特意味着符号集有 8 种状态（2 的 3 次方），比特率 = 1200 × 3 = 3600 bps。波特数的是「包裹件数」，比特数的是「货量」，别混。
```

:::warning[常见误区]

**误区一**：「数字通信 = 绝对不出错。」
判决之前的波形是彻头彻尾的模拟信号，噪声该来还来。数字化的功劳不是消灭错误，而是把连续的失真**量子化成离散的错与不错**，再用编码把错误率压到工程可忽略。

**误区二**：「波特率就是比特率的别名。」
只有二电平系统（M=2）两者才相等。Wi-Fi 用 256-QAM 时一个符号驮 8 比特，比特率是波特率的 8 倍。

**误区三**：「带宽越宽信噪比自然越高。」
带宽与信噪比是两个独立旋钮：加宽带宽多占了频谱资源但同时也放进更多噪声功率（第 85 号课的香农公式会把两者拧在一起）。

:::

## 6. 练习

**练习 1**：补全换算。代码能跑但答案不对：

```exercise
# @title: 练习：从波特率到比特率
# @check: 4
# @check: 9600
# @hint: 16 种电平 = 四次二选一，每符号比特数是 log2(16)。代码里用整除砍半算错了方向
import math

baud = 2400                      # 波特率：每秒符号数
levels = 16                      # 电平数

bits_per_symbol = levels // 2    # ← 问题在这：这不是每符号的比特数
rate = baud * bits_per_symbol

print(bits_per_symbol)
print(rate)
```

改为 `bits_per_symbol = round(math.log2(levels))   # log2：16 是 2 的几次方，答案就是每符号比特数（round 保证打印整数）` 后输出 4、9600——老式调制解调器的经典档位就此还原。

**练习 2**：为什么链路里「先信道编码、再调制」，反过来行不行？

<details>
<summary>点开查看逐步解答</summary>

顺序体现分工：信道编码在**比特层**添加受控冗余（第 35 章的汉明码们），调制在**波形层**把比特驮上载波。若先调制后编码，冗余比特已经变成了波形的一部分，接收端无法在解调时区分「信息」与「保护」——纠错必须发生在判决之后、且以比特为对象。一句话：编码管逻辑层的对错，调制管物理层的运输，层次不可倒置。
</details>

## 7. 选读：链路预算的一句话预告

<details>
<summary>选读 · 发射功率去哪了</summary>

工程师拿到新电台第一件事是算「链路预算」：发射功率 − 路径损耗 + 天线增益 − 各种损耗 ≥ 接收灵敏度。它回答「这股信号到对面还剩多少力气对抗噪声」。本课刻意不展开，因为那属于 63 章无线电的世界；这里只需记住结论的形状——功率按距离的平方甚至四次方衰减，而噪声底却纹丝不动，所以远程通信永远在与平方反比定律谈判。

</details>

## 8. 下一站

流水线的最上游还没打开：比特序列变成电脉冲的第一步叫**基带传输**，而码型（line code）的选择决定了线路上有没有直流、能不能自己报时钟。

→ [基带脉冲与码型](./20-line-coding.md)
