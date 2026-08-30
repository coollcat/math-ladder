---
title: 无线系统方法地图
lesson_id: radio/method-map
prereqs:
  - radio/cellular-reuse
  - radio/diversity-equalizer-ofdm
volume: 5
layer: L9
track:
  - scientific-computing
  - optimization-control
stage: research-elective
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts: []
applications:
  - wireless-network-planning
  - link-engineering
exits:
  - engineering
---

# 无线系统方法地图

## 1. 从一个场景开始

实习第一天，导师甩来三句话：①"新基站覆盖半径能不能到 5 公里？"②"地铁里视频怎么一进隧道就卡？"③"两个小区为什么互相打架？"

三门都是无线问题，工具却完全不同。本章从电波到 MIMO 走了十二课，这一课把它们摆上一张分诊台：**先判断问题发生在链路的哪一环，再取对应的课**。

## 2. 直觉解释

一条无线链路从发射机到接收机要过五道关，每道关有一类失效模式与一件对应工具：

```text
发射功率 → 传播损耗 → 阴影起伏 → 多径抖动 → 噪声叠加 → 判决
   │           │          │           │          │
 预算表     Friis/路径损耗  余量设计     分集/OFDM    噪声级联
 (30 课)     (10/70 课)    (70 课)      (40/90 课)   (60 课)
```

分诊口诀两句：

1. **先分大尺度还是小尺度**：问题在"平均信号够不够"是大尺度（预算、损耗、复用），在"信号忽强忽弱秒级抖动"是小尺度（多径、衰落、均衡）；
2. **dB 记账贯穿一切**：任何一环的单位混用（dB 与倍数、dBm 与 dB），全表作废。

## 3. 正式定义

方法地图（决策表）：

| 需求关键词 | 首选工具 | 本章出处 |
| --- | --- | --- |
| 覆盖够不够、半径多远 | 链路预算表 | Friis 预算课 |
| 平均信号随距离怎么掉 | 路径损耗模型 | 路径损耗与阴影课 |
| 阴影导致的位置概率 | 对数正态余量 | 路径损耗与阴影课 |
| 信号秒级忽强忽弱 | 多径衰落 / 分集 / OFDM | 多径、分集 OFDM 课 |
| 信噪比逐级恶化 | 噪声系数级联 | 噪声级联课 |
| 频率打架、同频干扰 | 蜂窝复用 | 蜂窝复用课 |
| 移动导致频移 | Doppler 与相干时间 | Doppler 课 |
| 一点多个天线 | MIMO 空间复用 | MIMO 课 |

## 4. 分步例题

**例 1**：导师问题①"覆盖 5 公里"。

1. "覆盖"是平均信号问题 → 大尺度 → 链路预算；
2. 打开 Friis 表：发射功率 + 天线增益 − 路径损耗 + 接收增益 ≥ 灵敏度；
3. 5 公里的路径损耗按 70 课模型代入，余量不够就升天线或加功率；
4. 路线：`link-budget`。

**例 2**：问题②"地铁里视频卡"。

1. "一进隧道就卡"是秒级剧烈起伏 → 小尺度多径（隧道壁反射）；
2. 工具是分集与 OFDM（90 课）：多天线兜底 + 子载波摊薄频率选择性衰落；
3. 路线：`small-scale-fading`。

**例 3**：问题③"两个小区打架"。

1. "打架"是同频干扰 → 蜂窝复用（50 课）；
2. 查复用因子 N 与 S/I 缩放律，决定是否裂小区或调频率计划；
3. 路线：`reuse-plan`。

## 5. 动手实验

### 实验 1：把分诊台写成代码

```python title="按需求关键词推荐方法"

def recommend(task):                       # 关键词分诊：先具体后一般
    if '打架' in task or '同频' in task or '频率' in task:
        return 'reuse-plan'                # 频率规划问题 → 蜂窝复用
    if '忽强忽弱' in task or '卡' in task or '抖动' in task:
        return 'small-scale-fading'        # 秒级起伏 → 多径/分集/OFDM
    if '覆盖' in task or '半径' in task or '预算' in task:
        return 'link-budget'               # 平均信号够不够 → 链路预算
    if '噪声' in task or '灵敏度' in task:
        return 'noise-cascade'             # 信噪比逐级恶化 → 噪声级联
    return 'ask-measurement'               # 都不像？先去现场测

print(recommend('新基站覆盖半径能不能到 5 公里'))
print(recommend('地铁里视频一进隧道就卡'))
print(recommend('两个小区为什么互相打架'))
```

输出 `link-budget`、`small-scale-fading`、`reuse-plan`。兜底分支是 `ask-measurement`：方法地图不替代测量，描述不清的问题先去现场拿数据。

### 实验 2：五道关各扣多少 dB

```python title="把一条链路的预算表算完（全 dB 记账）"
tx_power = 43.0        # 发射功率 43 dBm（约 20 W）
tx_gain = 17.0         # 发射天线增益 dBi
path_loss = 138.0      # 5 公里路径损耗 dB（70 课模型代入）
shadow = 8.0           # 阴影余量 dB
rx_gain = 0.0          # 手机天线增益 dBi
sensitivity = -100.0   # 接收灵敏度 dBm

budget = tx_power + tx_gain - path_loss - shadow + rx_gain   # 全程加减，没有乘法
print(round(budget, 1))
print(round(budget - sensitivity, 1))                        # 正数=有富余，负数=不达标
```

输出 `-86.0` 与 `14.0`。预算表就是一列加减法：43 + 17 − 138 − 8 + 0 = −86 dBm 落地信号，比灵敏度 −100 高出 14 dB 富余。**任何一处把 dB 当倍数乘了，整张表立刻报废**——这是地图上写得最大的警告。

## 6. 练习

```exercise
# @title: 练习：补全分诊台
# @check: link-budget
# @check: small-scale-fading
# @check: reuse-plan
# @hint: 先查具体的（频率打架、忽强忽弱），再兜底查覆盖类；都不像就返回追问测量。
def recommend(task):
    if '打架' in task or '同频' in task or '频率' in task:
        return 'wrong'                     # ← 有错：频率规划问题应返回 reuse-plan
    if '忽强忽弱' in task or '卡' in task or '抖动' in task:
        return 'wrong'                     # ← 有错：秒级起伏应返回 small-scale-fading
    if '覆盖' in task or '半径' in task or '预算' in task:
        return 'wrong'                     # ← 有错：覆盖问题应返回 link-budget
    return 'ask-measurement'

print(recommend('新基站覆盖半径能不能到 5 公里'))
print(recommend('地铁里视频一进隧道就卡'))
print(recommend('两个小区为什么互相打架'))
```

<details>
<summary>点开查看逐步解答</summary>

修正版：

```python
def recommend(task):
    if '打架' in task or '同频' in task or '频率' in task:
        return 'reuse-plan'
    if '忽强忽弱' in task or '卡' in task or '抖动' in task:
        return 'small-scale-fading'
    if '覆盖' in task or '半径' in task or '预算' in task:
        return 'link-budget'
    return 'ask-measurement'

print(recommend('新基站覆盖半径能不能到 5 公里'))   # link-budget
print(recommend('地铁里视频一进隧道就卡'))          # small-scale-fading
print(recommend('两个小区为什么互相打架'))          # reuse-plan
```

```text
分诊次序：先具体（频率/起伏）后一般（覆盖/预算），最后兜底追问测量。
每一条分支都对应本章一门课——地图是目录，推导在课里。
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你不分大尺度小尺度就动手。覆盖问题调不动分集，抖动问题加多少功率都白搭——先分类再开药，是无线工程第一纪律。

**误区二**：你在 dB 记账里混用乘法。dB 世界只有加减（乘 10 等价于加 10 dB）；一处把 dB 当倍数相乘，整条链路的账全错。

**误区三**：你以为地图能替代测量。所有模型（Friis、对数正态、Rayleigh）都是统计近似，参数最终来自现场路测——地图负责导航，路测负责填数。

:::

## 8. 快问快答

```quiz
「信号忽强忽弱、秒级抖动」应该从哪门课找工具？
- 小尺度：多径衰落、分集与 OFDM [*]
- 大尺度：链路预算与路径损耗
- 蜂窝复用与频率规划
? 秒级起伏是多径干涉的小尺度现象，对应分集与 OFDM；链路预算管的是平均信号够不够。
```

```quiz
链路预算表里的运算为什么只有加法和减法？
- 因为全程用 dB 记账，乘除化成了加减 [*]
- 因为无线电信号只会衰减不会增益
- 因为规范禁止使用乘法
? dB 是对数单位：增益相乘 = dB 相加，损耗相除 = dB 相减。一处单位混用全表作废。
```

## 9. 选读：新场景演练

<details>
<summary>选读 · 拿一张真实工单走一遍地图</summary>

工单：「工业园区新装三个基站，测速用户反馈：白天网速正常，晚上八点后掉到十分之一。」

1. **分诊**：不是覆盖（白天正常），不是多径（晚上才坏）→ 时变因素 → 干扰或负载；
2. **第一嫌疑**：晚上用户多 → 小区负载升高 → 查基站的调度统计（超出本地图，属网络侧）；
3. **第二嫌疑**：晚上开启的工业设备产生同频干扰 → 回到复用课：扫频确认干扰源频率 → 调整频率计划或加滤波；
4. **动手次序**：先扫频（测量！），再查负载，最后改参数——地图告诉你的不是答案，而是**排除的顺序**。

这张地图的终身用法：遇到新症状，先在五道关里问"它最像哪一关"，然后去那一课取工具；取完工具回来，如果没修好，把这一关从嫌疑名单划掉，往下走。**排查的次序感，比任何单个公式都值钱。**

</details>

## 10. 下一站

无线电分册到此收官。回到[章节目录](./index.md)回顾全章地图，或顺着卷五继续往下走——信号之后是信息，第 40 章的信息论会回答"一条信道最多能可靠送多少比特"这个终极问题。
