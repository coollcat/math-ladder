---
title: 匹配滤波器与最大似然接收
lesson_id: communication-systems/matched-filter
prereqs:
  - communication-systems/noise-snr-eye
  - digital-signal-processing/convolution-lti
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
  - matched-filter
  - correlation-receiver
  - maximum-likelihood-receiver
applications:
  - radar-detection
  - sonar-echo
exits:
  - engineering
---

# 匹配滤波器与最大似然接收

## 1. 从一个场景开始

你把耳朵贴上铁轨，远处传来火车的隆隆声——可风向一变，声音就淹没在沙沙的杂音里。老司机的耳朵并不更灵敏，只是脑子里存着一段「期待的形状」，杂音来一笔一笔地对：形状合上的那一瞬，他点头：「车来了。」数字接收机面对同样的处境：一个符号波形跌进整片噪声的海。凭什么抱怨运气？这一课证明存在一种**最好的捞法**，而且它出奇地简单——把发送波形翻个面、滑过去比一比。

## 2. 直觉解释

把接收采样排成一列数 $r$，把「预期的符号形状」也排成一列 $s$（模板）。相关得分就是**逐点相乘再求和**：

- 对得上的位置：正乘正、负乘负，贡献全是正数；
- 错开的位置：正负号打架，正负抵消。

所以模板与接收信号越合拍，总分越高。这就是卷积课见过的老朋友——只不过卷积先把模板**左右翻转**再滑动，于是「翻转后做卷积」恰好等价于「不翻转直接做相关」。这个翻转不是花招：它让系统的冲激响应正好是发送波形的镜像 $h(t)=s(T-t)$，故得名**匹配滤波器**——一副按信号量身定做的眼镜。

## 3. 正式定义

设某符号对应的发送波形为 $s(t)$，观测区间长度为 $T$，白噪声每样本方差 $\sigma^2$。接收机计算统计量

$$y = \int_0^T r(t)\,s(t)\,\mathrm{d}t = \sum_i r_i\,s_i$$

并把多个候选模板各算一遍，取得分最高者为判决结果。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $E = \sum_i s_i^2$ | 模板能量 | 波形自身的平方和，功劳簿的本金 |
| $y$ 中的信号项 | 干净得分 | 无噪声时应得 $E$ |
| $y$ 中的噪声项 | 摇晃量 | 方差 $\sigma^2 E$——乘了同样的权重 |
| 输出 SNR | 判决余量 | $E/\sigma^2$，任何其他线性滤波都达不到 |

关键账目：单个采样点的信噪比只有 $s_i^2/\sigma^2$；而匹配滤波把整个符号区间的 $L$ 个点攒成一笔，信号项长成 $E$、噪声只以 $\sqrt{E}$ 的步幅晃动——**样本攒几个，余量就白赚几倍**。这不靠魔法：按窄带等效口径折算就是课程反复出现的道理——时间换功率，观测越久越笃定。

## 4. 分步例题

**例**：两个候选符号模板 $s_0 = [+1,+1,-1]$ 与 $s_1 = [-1,+1,+1]$（能量都是 3），接收采样 $r = [+1,+2,0]$。判谁发的？

1. 各算相关分：$\langle r,s_0\rangle = 1\times1 + 2\times1 + 0\times(-1) = 3$；
2. $\langle r,s_1\rangle = 1\times(-1) + 2\times1 + 0\times1 = 1$；
3. $3 > 1$，判 $s_0$ 发过——注意得分只用了三次乘加；
4. 判决域从哪划线？两个候选的中线由 $\langle r,s_0\rangle = \langle r,s_1\rangle$ 决定，即 $r_0 - r_2 = 0$ 这张斜平面——一侧全判 $s_0$，另一侧全判 $s_1$。候选更多时，平面随之切成若干片，这就是星座图最近邻判决的前身；
5. 换个角度复核：算距离 $\lVert r - s_0\rVert^2 = 0+1+1=2$，$\lVert r - s_1\rVert^2 = 4+1+1=6$——离 $s_0$ 更近，与得分大小完全同向。**「得分最大」与「距离最近」互为镜像**，后者正是 40 号课解码星座点用的那把尺。

## 5. 动手实验

相关的本质是一列乘加运算的时间序列，三件套渲染器没有对应形态——本课实验交给 matplotlib 兜底（选型口诀的最后一层）。

### 实验 1（python 滑块）：雾有多大，得分有多少晃动

```python title="拖动 sigma，看相关得分的抖动范围"
# sliders: sigma=0.8 [0:3:0.1]
import random                    # 随机数库（卷一已引入）
random.seed(7)                   # 固定随机种子：人人看到同一片噪声海洋
import matplotlib.pyplot as plt

N = 300                          # 试验次数
scores = []                      # 每次试验的相关得分
for i in range(N):
    wave = []                    # 这次收到的三个采样
    for j in range(3):
        clean = [1, 1, -1][j]    # 发送的干净形状 s0 = [+1,+1,-1]
        wave.append(clean + random.gauss(0, sigma))   # gauss：正态噪声一个采样
    score = 0                    # 相关得分累加器
    for j in range(3):
        score = score + wave[j] * [1, 1, -1][j]       # 逐点相乘再求和
    scores.append(score)

mean = sum(scores) / len(scores)                     # 得分的平均值
print(f"理论均值 E=3，实测 {round(mean, 2)}")

plt.figure(figsize=(7, 2.6))
plt.hist(scores, bins=24, color="steelblue")         # hist：频数直方图
plt.axvline(mean, color="tomato", linewidth=1.4)     # axvline：竖直线
plt.axvline(-3, color="gray", linewidth=0.8)         # 若发的是反相符号，分数约聚在 -3
```

σ 从小拖到大：直方图的中心纹丝不动地钉在 $E=3$ 上，晃动的裙摆却越来越宽——**中心即信号，裙摆即噪声**。裙摆一旦宽到能越过 0 这条中线甚至够到对侧天体，误判就开始发生；裙摆宽度 $\sigma\sqrt{E}$ 全由 sigma 决定，这正是正式定义表格里的账。

### 实验 2（python）：滑动相关峰——先把时间轴找回来

```python title="相关得分随平移量滑出一个尖峰"
import random                    # 随机数库
random.seed(42)                  # 固定随机种子
import matplotlib.pyplot as plt

template = [1, 1, 1, -1, -1]     # 已知的发送形状（五点脉冲）
shift_true = 6                   # 回波真实的迟到格数（雷达测距的猎物）
echo = []                        # 接收回波序列
for i in range(20):
    v = 0.0                      # 大多数时刻只有噪声
    k = i - shift_true           # 对照模板的下标：不同则为 0
    if 0 <= k and k < len(template):
        v = template[k]          # 迟到的那段模板，原样浮现
    echo.append(v + random.gauss(0, 0.35))

offsets = range(0, 13)           # 尝试的全部平移量
totals = []                      # 每个平移量的相关得分
for off in offsets:
    total = 0.0
    for i in range(len(echo)):
        k = i - off
        if 0 <= k and k < len(template):
            total = total + echo[i] * template[k]     # 重叠区间内乘加
    totals.append(total)

best = 0                          # 记录最高分的下标起点
for i in range(1, len(totals)):
    if totals[i] > totals[best]:
        best = i
print(f"最强回波迟到了 {offsets[best]} 格，真实值 {shift_true}")

plt.figure(figsize=(7, 2.6))
plt.plot(list(offsets), totals, marker="o", color="steelblue")   # marker='o'：线上画圆点
plt.axvline(shift_true, color="tomato", linewidth=1)
```

蓝色曲线在真实迟到位置（红线）附近竖起一座孤峰——其余平移位置上正负号互相践踏，只剩噪声的碎浪。雷达、声呐与 GPS 接收机的「测距」，测的就是这座峰的位置；数字通信的「定时同步」（下一课的主角）找的是同一座峰。

### 快问快答

```quiz
同样一段接收数据，接收机换成比模板短一半的截断版去打分，会发生什么？
- 得分峰值更高、更锐利
- 攒进的能量变少，输出余量缩小一半 [*]
- 完全不影响，反正取最大者判决
? 相关是把整个模板区间的能量攒成一笔；模板缺半截，信号项少攒一半，噪声摇晃也随之失去同比例的对冲——余量按 E 缩水。这就是为什么完整的符号窗口一个都不能丢。
```

:::warning[常见误区]

**误区一**：「匹配滤波器把信号放大了。」
它一分贝的信号增益都不提供：滤波输出里信号项和噪声项被同一组权重塑形。它改善的只是**判决那个瞬间**的信噪比分配——把分散在整个符号区间的微弱证据集中到一次表决上。

**误区二**：「模板必须是精确的波形逐样本副本，工程上做不到。」
接收机需要的不是相位精知的微波形，而是已知形状的基带模板。幅度偏差被增益校准吸收，唯一致命的是未知的旋转与时移——这正是下一课同步系统存在的理由。

**误区三**：「最优接收机从此不再犯错。」
匹配滤波只是在固定功率与带宽下把出错概率压到理论的最低档，绝非清零：模板分界线附近的噪声永远有一半概率掀翻判决。彻底消灭错误要靠下一节的另一路援军——冗余。

:::

## 6. 练习

**练习 1**：一份双模板接收机的打分代码能跑但全盘皆输：

```exercise
# @title: 练习：把相关性当裁判
# @check: 4
# @check: 0
# @check: 0
# @hint: 相关的打分法则是逐点先相乘再累加：得分 = Σ 接收值 × 模板值；两条模板都照此办理，最后比谁分高
r = [1, 2, -1]                   # 接收到的三个采样
t0 = [1, 1, -1]                  # 候选符号 0 的模板
t1 = [-1, 1, 1]                  # 候选符号 1 的模板

score0 = 0                       # 模板 0 的得分累加器
score1 = 0                       # 模板 1 的得分累加器
for i in range(len(r)):
    score0 = score0 + r[i] + t0[i]   # ← 问题在这：相关是逐点相乘，不是相加
    score1 = score1 + r[i] - t1[i]   # ← 问题在这：模板该乘上接收值，不是减掉

decided = 0                      # 默认判符号 0
if score0 < score1:
    decided = 1                  # 只有 1 更高分才改判

print(score0)
print(score1)
print(decided)
```

修好后输出 4、0、0：模板 0 的乘加和 $1+2+1=4$ 力压模板 1 的 $-1+2-1=0$，判决维持默认的 0——两位候选差距悬殊时，噪声（本题没有加）再凶一点也不会轻易翻转。这两行乘法就是整套最优接收理论的全部算术。

**练习 2**：若两个模板的能量不同（比如 $s_0$ 是三连正脉冲、$s_1$ 只有单点），裸比相关分对谁有利？

<details>
<summary>点开查看逐步解答</summary>

有利能量大的那个：它与噪声毫不相干的相关项期望为 0，但**波动幅度随能量增长**，就像一个筹码更多的赌徒每次赢得也多——仅仅因为嗓门大就获胜不公平。公平的裁判是比较归一化后的量，例如 $\langle r,s\rangle/E$ 或干脆比较距离 $\lVert r-s\rVert^2$（自动扣除能量项）。这也解释了 QAM 外圈星座点能量更大、为何接收端要用带先验调整的判据；真正的核心一句话：**最大似然判距最近，相关只是等能量情形下的捷径**。
</details>

## 7. 选读：为什么它是白噪声下的最优

<details>
<summary>选读 · 三行说完的似然论证</summary>

模型：收到 $r = s_k + n$，其中 $n$ 每维独立、服从 $\mathcal{N}(0,\sigma^2)$。问哪颗星最可能发出？答：使概率密度最大的那颗。高斯密度的指数上是 $-\lVert r-s_k\rVert^2 / 2\sigma^2$，密度最大 ⇔ 平方距离最小 ⇔ 展开后 $\langle r,s_k\rangle$ 减常数 $\lVert s_k\rVert^2/2$ 最大。候选能量全部相等时，第二项是公共常数，只剩纯粹的滑动相关——这就是「匹配滤波 = 最大似然接收」的完整身世。方差越小（σ 小），指数惩罚越陡，等高线越收缩，误判区间塌缩得越快；这也再次预告了 BER 对 SNR 的指数敏感。
</details>

## 8. 下一站

接收机的算术已经无懈可击——但它的每一笔账都预设了载波没转歪、节拍没踩偏。这两个隐含假设一旦破产，再优的判决也是在回答错误的问题。

→ [载波同步与符号定时](./70-carrier-sync-timing.md)
