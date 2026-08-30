---
title: Bootstrap 重采样：自己造误差带
lesson_id: statistical-inference/bootstrap-resampling
prereqs:
  - statistical-inference/confidence-interval
  - probability-advanced/inverse-transform-sampling
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - bootstrap-resample
  - percentile-interval
  - empirical-distribution
applications:
  - small-sample-inference
  - ab-test-error-bars
exits:
  - data-ai
---

# Bootstrap 重采样：自己造误差带

## 1. 从一个场景开始

猫咖老板娘想给会员卡定价，需要知道一个数：会员**每个月在店里花多少钱，典型水平是多少**。她翻了 40 位会员的账单，把月消费从小到大排开，取正中间——中位数 188.5 元。要发新闻稿时问题来了：置信区间课教过给均值配 ± 误差带的公式，可那配方查表只收均值、比例这些名门望族；**中位数没有现成的标准误公式**，难道就光秃秃报一个 188.5？

统计学里最漂亮的应变方案诞生于 1979 年：既然只有这 40 笔账单，那就把这 40 个数字当作一座微缩标本馆，反复从里面重新抽样，亲手模拟出"再抽一次会得多少"——这套方法叫 **Bootstrap**（靴襻法，取名于"拽着自己的靴子把自己提起来"）。它不需要任何公式，只需要一台能不厌其烦抽签的计算机。

## 2. 直觉解释

三步剧本：

1. **立标本**：把 40 个月消费额写在小球上，倒进袋子里。这只袋子就是"手头唯一拥有的总体缩影"；
2. **造世界**：摸出一颗记下数字、**放回去**，再摸——重复 40 次，得到一份"假想的另一批账单"，算出它的中位数。这是平行宇宙 1 号的中位数；
3. **开连锁**：把第 2 步重复几千次，几千个宇宙的中位数就会散落成一片云。这片云的散步范围，就是我们要的误差带。

为什么放回？因为我们的目标是"假装重做一次抽样"——原世界里每个顾客被抽中的机会彼此独立，谁也不该被排除在下次抽签之外。这一握"放回"是整套方法的命门：不放回的重排是另一个门派（下一课的主角），两者别搞混。

至于"怎么均匀地摸球"？前置课刚教过：`random.random()` 掷出 0 到 1 的均匀数，乘以 40 再砍掉小数部分，恰好等概率地落在 0 到 39 号座位上——逆变换采样最便宜的离散款，一台现成的摸球机。

## 3. 正式定义

**经验分布** $\hat F$：把样本观测值各赋 $1/n$ 概率的离散分布——它是总体分布 $F$ 的替身演员。

**Bootstrap 重抽样**：从 $\hat F$ 中独立、有放回地抽取 $n$ 个值，得到一份重抽样本；对每份重抽样本计算统计量 $\hat\theta^{*}$。

**Bootstrap 标准误与百分位区间**：重复 $B$ 次后，

$$\mathrm{SE}_{boot}=\hat\theta^{\,*}\text{ 的标准差}, \qquad \mathrm{CI}_{95\%}=\left[\hat\theta^{\,*}_{(2.5\%)},\ \hat\theta^{\,*}_{(97.5\%)}\right]$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\hat F$ | 经验分布 | 样本自己扮演的迷你总体 |
| $\hat\theta^{*}$ | 重抽统计量 | 某个平行宇宙里算出的估计值 |
| $B$ | 世界个数 | 重抽次数，典型取几百到几千 |
| $\hat\theta^{*}_{(q)}$ | 分位数 | 把 $B$ 个值排序后位于第 $q$ 百分位的那个 |

解读要点：误差带回答的是"**如果总体真是这袋球，重新抽样会抖多大**"。它把"不知总体"这个死结转译成"用经验分布顶上"的工程决定；数学上可以证明，只要样本足够代表总体，$\hat F$ 的抖动就近似 $F$ 的抖动——这是大数定律在背后做的担保。

## 4. 分步例题

**例**：袖珍版演示。某五天客流为 $[212,198,245,188,230]$，中位数 $\hat\theta=212$。手工造三个平行宇宙：

1. 重抽得 $[245,198,198,230,188]$（有的日子被摸两次）→ 排序后中位数 $198$；
2. 重抽得 $[188,188,212,230,230]$ → 中位数 $212$；
3. 重抽得 $[245,245,245,230,188]$ → 中位数 $245$。

三个宇宙给出的答案从 198 漂到 245。真实调查只有一次（212），但这三次预演透露了关键事实：**换一手同样规模的样本，中位数可能晃出三十多**。"晃动幅度"不是拍脑袋猜的，是可以批量生产后直接量出来的——这正是正式定义里 $B=5000$ 次循环在做的事。

## 5. 动手实验

### 实验 1（python）：5000 个宇宙的中位数散成一片云

```python title="猫咖 40 位会员：中位数的 bootstrap 误差带"
import random                     # 随机库
import matplotlib.pyplot as plt   # 绘图库短名 plt

random.seed(2026)                 # 固定种子：你的浏览器和课本长同一片云

# 生成 40 位会员的月消费：八成五是普通档，一成五是高消费档（右上拖尾从此来）
customers = []
for day in range(40):
    if random.random() < 0.15:                          # 15% 的概率开出一位高消费者
        customers.append(int(random.gauss(600, 120)))   # gauss(mu, sigma)：钟形抽样，前面课已登场
    else:
        customers.append(int(random.gauss(180, 40)))

n = len(customers)
s0 = sorted(customers)
median_obs = (s0[n // 2 - 1] + s0[n // 2]) / 2          # 偶数个取正中间两值的平均

medians_b = []                    # 攒 B 个平行宇宙的中位数
B = 5000
for b in range(B):
    resample = []
    for i in range(n):
        resample.append(customers[int(random.random() * n)])   # ← 全课核心：有放回地重抽一枚
    resample.sort()
    medians_b.append((resample[n // 2 - 1] + resample[n // 2]) / 2)

medians_b.sort()
lo = medians_b[int(0.025 * B)]    # 排序后掐头：2.5% 分位数
hi = medians_b[int(0.975 * B)]    # 去尾：97.5% 分位数
mb_mean = sum(medians_b) / len(medians_b)
bse = (sum((v - mb_mean) ** 2 for v in medians_b) / len(medians_b)) ** 0.5   # 平方平均再开根

print(median_obs)
print(lo, hi)
print(round(bse, 2))

plt.hist(medians_b, bins=30, color="steelblue")
plt.axvline(median_obs, color="red", linewidth=2)       # 现实世界站的位置
plt.axvline(lo, color="gray", linestyle="--")           # 误差带左端
plt.axvline(hi, color="gray", linestyle="--")
```

打印三行：`188.5`、`164.0 203.5`、`9.5`。红竖线是现实的中位数 188.5 元，两侧灰虚线之间就是老板娘可以放心写进定价报告的话术："**中位数约 188.5 元，bootstrap 区间 164.0 至 203.5 元**"。5000 个宇宙里其实只有 68 种互不相同的中位数取值——离散世界的直方图长成台阶而不是平滑山坡，纯属正常。顺带留意：这份账单的**均值约 223 元**，比中位数高出近 35 元——少数高消费档把均值拽向右边，这就是实验当初选中位数的全部理由（也是下一场实验的对轴）。

### 实验 2（python）：对均值这件事，公式带和自助带长得像吗

中位数没有公式可查，可均值有（$\bar{x}\pm1.96\,s/\sqrt{n}$）。拿同一个样本让两条路线正面比武——如果自助带和公式带贴在一起，我们就有了信任 bootstrap 的实物证据：

```python title="均值的两种误差带对照"
import random                     # 随机库
import matplotlib.pyplot as plt   # 绘图库短名 plt

random.seed(2026)
customers = []                    # 与实验 1 同一批账单（种子相同所以一模一样）
for day in range(40):
    if random.random() < 0.15:
        customers.append(int(random.gauss(600, 120)))
    else:
        customers.append(int(random.gauss(180, 40)))

n = len(customers)
mean_obs = sum(customers) / n
ssum = 0
for v in customers:
    ssum += (v - mean_obs) ** 2
sd = (ssum / (n - 1)) ** 0.5      # 样本标准差：除以 n-1 的那版（第 1 课的修正）

half_formula = 1.96 * sd / n ** 0.5     # 公式带半宽 = 1.96 × 标准误

means_b = []                      # 自助路线
for b in range(5000):
    total = 0
    for i in range(n):
        total += customers[int(random.random() * n)]
    means_b.append(total / n)
means_b.sort()
lo_b = round(means_b[int(0.025 * 5000)], 1)
hi_b = round(means_b[int(0.975 * 5000)], 1)
bm_mean = sum(means_b) / len(means_b)
bse_mean = (sum((v - bm_mean) ** 2 for v in means_b) / len(means_b)) ** 0.5

print(round(mean_obs, 2))
print(round(mean_obs - half_formula, 1), round(mean_obs + half_formula, 1))
print(lo_b, hi_b)
print(round(bse_mean, 2))

plt.hist(means_b, bins=30, color="steelblue")
plt.axvline(mean_obs - half_formula, color="tomato", linestyle="--")   # 公式带左端
plt.axvline(mean_obs + half_formula, color="tomato", linestyle="--")   # 公式带右端
plt.axvline(lo_b, color="gray", linestyle="--")                        # 自助带左端
plt.axvline(hi_b, color="gray", linestyle="--")
```

打印 `223.35`、`181.2 265.5`、`185.3 268.2`、`21.13`：公式半宽 $42.2$ 恰好约为 bootstrap 标准误 $21.1$ 的两倍（$1.96$ 倍系数的邻居），两条带几乎重叠——自助方法通过了"已知答案"的校验。细看灰线们相对红心微微右偏：消费分布在右侧拖尾，bootstrap 如实把这点歪斜也复制进了宇宙里，而中心极限公式只会画对称带。**没有公式的地方它兜底，有公式的地方它还能补细节**。

### 快问快答

```quiz
Bootstrap 第一步「从 40 个数据里有放回地重抽 40 个」，如果改成不打乱重排或改成不放回抽样，会发生什么？
- 没关系，结果一样可信
- 每份重抽样本千篇一律或丢失随机性，误差带会被系统性做窄甚至缩成零 [*]
- 只是跑得慢一点而已
? 原样照抄会让每个宇宙都交出同一份答案（散布为零）；不放回则变成下一课的置换思想，抽出的世界偏离「重做一次独立抽样」的本意。放回是保证宇宙间有差异又有代表性的机关。
```

:::warning[常见误区]

**误区一**："你以为放回不放回无所谓。" 有放回才有重样的组合与适度的重复——宇宙之间因此既有差异又遵守同一经验分布。改成不放回就滑向了置换检验的世界观；两边各自正确，但回答的是两个不同的问题，串门子必出错。

**误区二**："你以为 95% 自助区间说'总体的 95% 成员落在这里'。" 它丈量的是**统计量的不确定度**，不是个体的散布范围。"会员消费的中位数在 164 到 204"与"九成半会员的消费在这范围"完全是两句话，后者宽得多且是另一个概念（那是参考区间的事）。

**误区三**："你以为 bootstrap 万能。" 给最大值这种盯着尾巴看的统计量造误差带，它会系统性地失灵（尾部信息太少，经验分布在那里力不从心）；时间上相关的序列也要先切块再重抽。还有，它的"95% 覆盖"是近似承诺，依赖样本本身已比较像总体——十来个小样本上的自信要有保留。

:::

## 6. 练习

先做一道修机器的练习：下面这台"宇宙复印机"能跑，可它输出的三个数一模一样——显然哪里坏了。

```exercise
# @title: 练习：修好这台「平行宇宙复印机」
# @check: 198
# @check: 212
# @check: 245
# @hint: 病灶一行忘了「有放回」：把 data[i] 换成 data[int(random.random() * n)]，让 11 个座位人人有机会被反复抽中
import random               # 随机库

random.seed(2026)           # 固定种子：判题输出才可复现
data = [212, 198, 245, 188, 230, 275, 205, 198, 260, 182, 224]   # 连续 11 天的单日客流
n = len(data)

medians_b = []              # 300 个平行宇宙各自的中位数
for b in range(300):
    sample_b = []           # 本宇宙的开箱清单
    for i in range(n):
        pick = data[i]      # ← 病灶：天天按原顺序照抄一遍，所有宇宙坍缩成一个
        sample_b.append(pick)
    sample_b.sort()         # 排序后才好取中位数
    medians_b.append(sample_b[5])   # 11 个数的正中间：第 5 号下标

medians_b.sort()            # 宇宙们的答案排队，准备读分位数
print(medians_b[7])         # 2.5% 分位近似：int(0.025*300)=7
print(medians_b[150])       # 正中间的宇宙
print(medians_b[-8])        # 97.5% 分位近似：倒数第 8 个即下标 292
```

<details>
<summary>点开查看逐步解答</summary>

病灶行替换为一枚真正的均匀摸球机：

```python
pick = data[int(random.random() * n)]   # 均匀数乘 n 再砍断成索引：有放回地抽一枚（逆变换采样的离散特例）
```

其余一字不动（改其他行会挪动随机数消耗次序，判题就不认了）。跑通后打印 `198`、`212`、`245`：300 个宇宙的中位数散布开了，95% 区间约 198 到 245。病码时代三个宇宙交的都是 `212`——复印件当然不会抖；只有引进放回的掷签，不确定性才被真正"重新发明"出来。

</details>

**练习 2**：老板娘现在还想知道"极差"（最大减最小）稳不稳。公式手册更帮不上忙了——请口述一条 bootstrap 路线，并说说结果解读时要防什么。

<details>
<summary>点开查看逐步解答</summary>

流程完全同构：有放回重抽 40 枚 → 记录 max−min → 重复几千次 → 排序取 2.5% 与 97.5% 分位。要防的坑恰好在误区三预告过：极差紧盯着分布两端，而经验分布在两端最没底气（极端值本来就少），重抽世界里的极差往往偏小，误差带偏乐观。所以结论要降级使用："在我们见过的账单范围内，极差的波动大致如此"——这正是"方法能算"与"结论敢多信"的分界线。

</details>

**练习 3**：同学提议："B 从 5000 提到 50000，误差带是不是就更可信了？顺便实验结论也更显著了吧？"拆穿这句话里的两个偷换。

<details>
<summary>点开查看逐步解答</summary>

偷换一：加大 B 只是把"电脑掷签"自身的蒙特卡洛噪音磨平，让区间端点的最后一位小数稳定下来——它改善的是**计算精度**，不会让现实抽样固有的抖动变小（那由样本量决定，归克拉美-罗管）。偷换二："显著"是比较效应与不确定性的裁定语，造再多宇宙也改变不了手上这 40 张账单的信息量——p 值不为所动。预算充足时五千加到一万意思一下即可，剩下的钱不如多请几位会员喝咖啡（真的扩大样本）。

</details>

## 7. 选读：凭什么"样本冒充总体"是被允许的

<details>
<summary>选读 · 代入原则与它的边界</summary>

整套方法的合法性来自**代入原则**（plug-in principle）：想问 $\hat\theta$ 在真总体 $F$ 下怎么抖，却不知道 $F$；于是先用经验分布 $\hat F$ 当替身。大数定律保证样本够大时 $\hat F$ 逐点逼近 $F$，于是"在 $\hat F$ 世界里重抽的抖动"逼近"在 $F$ 世界里重抽的抖动"。边界也随之清楚：凡是 $\hat F$ 严重失真的地方，方法就失真——分布极深的尾部（极值类统计量）、强相关的时间序列（需块状重抽 block bootstrap）、以及与样本选取方式纠缠的复杂抽样设计，都是替身演不像的戏路。1979 年 Efron 提出它时的惊艳之处正在于：把"不知道总体"从拦路虎变成了可管理的近似误差。

</details>

## 8. 下一站

至此我们学会了给任何统计量配误差带。还剩最后一块拼图："A 组比 B 组高了 7 分钟"，这句话是货真价实的差距，还是抽奖运气？下一课你将重逢今天这套"亲手制造平行世界"的手艺——只是岗位换了：不再丈量单臂的不确定性，而是直接裁决两组标签是否真的无关。

→ [置换检验](./80-permutation-tests.md)
