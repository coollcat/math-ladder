---
title: 多重检验与 FDR
lesson_id: statistical-inference/multiple-testing-fdr
prereqs:
  - statistical-inference/hypothesis-testing
  - statistical-inference/ab-test
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
  - multiple-testing
  - bonferroni-correction
  - false-discovery-rate
  - benjamini-hochberg
applications:
  - genomics-screening
  - experiment-platforms
exits:
  - data-ai
---

# 多重检验与 FDR

## 1. 从一个场景开始

某 App 的增长团队决定突击一晚：同时上线 **100 个改动实验**——按钮换个绿色、文案加个感叹号、图标描个边……每个实验都用第 40 课的标准流程跑 A/B 检验，显著性水平 $\alpha=0.05$。第二天早上，复盘会上有 10 个实验"显著获胜"，庆功邮件发出去了。

坏消息藏在一张纸上：如果这 100 个改动其实**全部无效**，单次检验仍然有 5% 的概率错报成功；做了 100 次，"至少冤枉报功一次"的概率高达 $1-0.95^{100}\approx 99.4\%$。换句话说，那 10 个"显著获胜"里，很可能混着好几个纯靠运气登台的假阳性。

单独一次检验像在安静房间里听枪声，一点响动都躲不过耳朵；一万次检验像在靶场里开枪，弹着点密密麻麻——你再也分不清哪声是信号、哪些是回音。**多重检验**研究的就是这张嘈杂靶场的秩序：如何一边放箭、一边控制误伤率。

## 2. 直觉解释

先做最笨的记账：设 $m$ 个假设里无效的占绝大多数，每个都以 $\alpha$ 的概率"蒙混过关"。假阳性的**个数期望**是 $\alpha\times m$：

$$E[V]=0.05\times m \qquad \text{（V = 被宣布为发现的无Effect假设个数）}$$

- 100 个检验：平均冤枉 5 个；
- 一万个基因：平均冤枉 500 个——期刊第一页全是无辜者。

最直白的止血法是**邦费罗尼校正**：把单人预算摊给全体，只许 $p\le\alpha/m$ 的过关。m=10000 时门槛降到十万分之五——假阳性几乎绝迹，但真效应也大面积漏网（功效雪崩）。

1995 年 Benjamini 和 Hochberg 换了个更务实的账本：与其追求"零冤案"（控制家族错误率 FWER），不如保证**"宣布的成绩单里水货占比"不超过约定值 q**——这就是**错误发现率 FDR**。考点不让全对没关系，只要答错的占比受控；科学筛查要的正是这种可以规模化生存的诚实。
## 3. 正式定义

设共检验 $m$ 个假设，得到 p 值 $p_{(1)}\le p_{(2)}\le\dots\le p_{(m)}$（从小到大排序）。记

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $V$ | 假发现数 | 被拒绝的原假设里其实为真的个数 |
| $R$ | 发现总数 | 被拒绝的原假设总个数 |
| $\mathrm{FWER}$ | 家族错误率 | $P(V\ge1)$：至少出现一个假阳性的概率 |
| $\mathrm{FDR}=E[V/\max(R,1)]$ | 错误发现率 | 宣布的发现中假货占比的期望 |

**Bonferroni 校正**（控 FWER）：门槛 $\alpha/m$，凡 $p_i\le\alpha/m$ 者拒绝。

**Benjamini–Hochberg 程序**（控 FDR）：给定水位 $q$，

$$k=\max\left\lbrace i:\ p_{(i)}\le \frac{i\,q}{m}\right\rbrace, \qquad \text{拒绝最小的 } k \text{ 个假设}$$

读法要点：阈值线从左到右**线性爬坡**（第 i 名的配额是 $iq/m$），要找的是**最后一个**仍在线下方的名次，然后一口气把前 k 名全部录取——哪怕中间某些名次自己越了线，也会被后面的名额"捞回来"。在独立（或轻度相关）假设下，BH 保证 $\mathrm{FDR}\le q$。

## 4. 分步例题

**例**：周末连跑 6 个小实验，p 值从小到大为 $0.001,\ 0.008,\ 0.039,\ 0.041,\ 0.42,\ 0.75$，取 $q=0.05$。

1. 配额线逐名算：$q/m=0.05/6\approx0.00833$，第 i 名的门槛是 $i\times0.00833$：$0.0083,\ 0.0167,\ 0.025,\ 0.0333,\ 0.0417,\ 0.05$；
2. 逐名对照：$0.001\le0.0083$ ✓；$0.008\le0.0167$ ✓；$0.039>0.025$ ✗；$0.041>0.0333$ ✗；$0.42>0.0417$ ✗；$0.75>0.05$ ✗；
3. 找最大达标名次 $k=2$，**录取前两名**；
4. 三种口径对比：裸奔 $0.05$ 收 4 个（后两个随时可能是假货）；Bonferroni 只收 $p\le0.00833$ 的 1 个；BH 收 2 个，且保证成绩单里的水货平均不超过 5%。

技巧提示：若把步骤 2 写成"遇到第一个 ✗ 就停"就会在本例幸存却在未来翻车——真正要做的是扫完全部名次再取最大达标者（下一节练习专治这个手癖）。
## 5. 动手实验

### 实验 1（python）：1200 个假设的三种命运

```python title="一千两百个假设的三种命运"
import random                     # 随机库（第 0 章登场）
import matplotlib.pyplot as plt   # 绘图模块起短名 plt

random.seed(99)                   # 固定随机种子：1200 人名单人人相同
M_TOTAL = 1200                    # 假设总数
N_EFFECT = 60                     # 其中真正有效的假设个数
Q = 0.05                          # 愿意接受的错误发现率上限

pvals = []
truth = []
for idx in range(M_TOTAL):
    if idx < N_EFFECT:
        pvals.append(random.random() / 1000)   # 真金：p 值挤在千分位附近
        truth.append(True)
    else:
        pvals.append(random.random())          # 镀金：p 值均匀铺满 0~1
        truth.append(False)

naive_tp = 0                      # 裸奔阈值 0.05 的战果：真发现计数
naive_fp = 0                      # 同一阈值混进来的假阳性
for idx in range(M_TOTAL):
    if pvals[idx] <= Q:
        if truth[idx]:
            naive_tp = naive_tp + 1
        else:
            naive_fp = naive_fp + 1

order = sorted(range(M_TOTAL), key=lambda i: pvals[i])   # 全体下标按 p 值升序排队
cutoff_rank = 0                   # BH 认可的最大名次 k
for r in range(1, M_TOTAL + 1):
    if pvals[order[r - 1]] <= Q * r / M_TOTAL:
        cutoff_rank = r           # 不停车！一路记住满足条件的最新名次

bh_tp = 0                         # 前 cutoff_rank 名里的真货
for i in order[:cutoff_rank]:
    if truth[i]:
        bh_tp = bh_tp + 1
bh_fp = cutoff_rank - bh_tp

bonf_line = Q / M_TOTAL           # Bonferroni 铁闸门：每人只分到 0.05/1200
bo_tp = 0
bo_fp = 0
for idx in range(M_TOTAL):
    if pvals[idx] <= bonf_line:
        if truth[idx]:
            bo_tp = bo_tp + 1
        else:
            bo_fp = bo_fp + 1

print(f"裸奔0.05 ：真发现 {naive_tp}，假阳性 {naive_fp}，水货占比 {round(naive_fp / (naive_tp + naive_fp), 3)}")
print(f"BH(q=0.05)：拒绝 {cutoff_rank} 个，真 {bh_tp} 假 {bh_fp}，水货占比 {round(bh_fp / cutoff_rank, 3)}")
print(f"Bonferroni ：收 {bo_tp} 真 / {bo_fp} 假，另有 {N_EFFECT - bo_tp} 个真效应被拦在门外")

fake_ps = []                      # 画图：无效假设的 p 值铺成的地毯
true_ps = []                      # 有效假设的 p 值堆成的蓝柱
for idx in range(M_TOTAL):
    if truth[idx]:
        true_ps.append(pvals[idx])
    else:
        fake_ps.append(pvals[idx])

plt.hist(fake_ps, bins=40, color="wheat")
plt.hist(true_ps, bins=40, color="steelblue")
plt.axvline(Q, color="tomato", linewidth=2)   # 红线：裸奔阈值深深切进地毯里
```

默认输出读起来像判决书：裸奔阈值喊出 **117 个发现，其中 57 个水货（占比 48.7%）**——一半庆功宴席位坐的是运气；BH 拒绝 **63 个，真货 60、水货仅 3（4.8%≤5%，守约）**；Bonferroni 表现得像个洁癖保安：0 假阳性，却也只放进 4 个真发现，56 个真效应被拦在门外。图上更直观——米色地毯是 1140 个无效假设铺出的均匀场子，蓝色柱体是 60 位真金挤在最左格，而红色阈值线毫无防备地切走了一大块米色。

### 实验 2（python）：家庭越大，白捡的"显著"越家常便饭

```python title="全家出动：检验越多，假阳性越家常便饭"
import random                     # 随机库（第 0 章登场）
import matplotlib.pyplot as plt   # 绘图模块起短名 plt

random.seed(8)                    # 固定随机种子：模拟结果可以复刻
Q = 0.05                          # 单次检验的名义水平
FAMS = 400                        # 各规模重复模拟 400 个"家庭"
sizes = [20, 50, 100, 300]        # 每个家庭同时进行的检验数

rates_naive = []                  # 裸奔下出假阳性的家庭占比
rates_guard = []                  # Bonferroni 守门后的同类占比
theory = []                       # 1-(1-Q)^m 理论值，画成虚线

def fam_rate(m, mode):
    hit_fams = 0                  # 至少出一次假阳性的家庭数
    for f in range(FAMS):
        found = False
        for h in range(m):
            if mode == "naive":
                thr = Q           # 裸奔：每颗子弹门槛不变
            else:
                thr = Q / m       # 守门：门槛压窄到 Q/m
            if random.random() <= thr:
                found = True      # 只要中一颗，全家就挂上"出过事"标签
                break             # 这个家庭的命运已定，提前收工
        if found:
            hit_fams = hit_fams + 1
    return hit_fams / FAMS

for m in sizes:
    rn = fam_rate(m, "naive")
    rg = fam_rate(m, "guard")
    rates_naive.append(rn)
    rates_guard.append(rg)
    theory.append(round(1 - (1 - Q) ** m, 3))
    print(f"m={m}: 裸奔家庭中招率 {rn} | 理论 {round(1 - (1 - Q) ** m, 3)} | 守门后 {rg}")

plt.plot(sizes, rates_naive, marker="o", color="tomato")     # 实测裸奔曲线
plt.plot(sizes, theory, linestyle="--", color="gray")        # 理论虚线几乎重合
plt.plot(sizes, rates_guard, marker="o", color="steelblue")  # 守门后贴地飞行
plt.xlabel("number of tests m")
plt.ylabel("share of families with a false positive")
```

打印结果复述了理论公式 $1-(1-\alpha)^m$ 的爬坡：裸奔策略的家庭中招率从 m=20 时的 `0.635` 一路涨到 m=300 时的 `1.0`——所有家庭都洗不清嫌疑；同一批数据换成 Bonferroni 门槛后，四档占比都趴在 `0.05` 上下纹丝不动。这正是两个审计口径的分野：FWER 求"绝不冤枉"，FDR 求"冤枉的不超过口头承诺的比例"。

### 实验 3（viz）：家族越大，白捡的「显著」越躲不掉

拖滑块调假设总数 m，看裸奔策略的家庭中招率 $1-(1-\alpha)^m$ 怎么爬向 1。

```viz
{ "type": "plot", "xmin": 1, "xmax": 1200, "expr": "1-(1-a)^x", "expr2": "0.05", "label": "1-(1-α)^m（裸奔）", "label2": "α = 0.05（目标）", "color2": "#e8833a", "sliders": [{ "name": "a", "min": 0.01, "max": 0.2, "step": 0.01, "value": 0.05 }] }
```

这条曲线是「一个假阳性都不出」的概率的补集。$m=20$ 时已经爬到 $0.64$，$m=100$ 时是 $0.994$，$m=300$ 之后基本贴住 1——只要检验够多，「一个都没冤枉」几乎是不可能的。橙色水平线是你原本想要的 $\alpha=0.05$；两条线之间的距离，就是多重比较没校正时白送出去的错误率。把 $\alpha$ 拖到 0.01 只能把曲线往右推一点，$m=100$ 处仍有 $0.634$——**收紧单次阈值治不了家族膨胀，只有换记账口径（Bonferroni 或 BH）才行**。

### 快问快答

```quiz
关于 FDR 与 FWER 的区别，下面哪种说法符合 BH 程序的账本？
- BH 保证“至少出一个假阳性”的概率不超过 q，与邦费罗尼的目标相同
- BH 保证“宣布的发现里假货占比的期望”不超过 q，允许出假阳性，只要占比受控 [*]
- BH 把每个检验的门槛统一压到 q/m，从此假阳性绝迹
? FWER 问的是 P(V≥1)——一次冤案都不许出，邦费罗尼为此把门槛压到 α/m，代价是功效雪崩；FDR 问的是 E[V/max(R,1)]——成绩单里水货的平均占比。BH 在 q=0.05 时可以出几个假阳性，只要它们占拒绝总数的比例平均不超过 5%，换来的是真效应大面积获救（实验 1 里 BH 用 3 个水货换回 56 个被 Bonferroni 拦在门外的真效应）。
```

:::warning[常见误区]

**误区一**：「你以为 FDR 和 FWER 是同一件事，只是名字不同。」两个指标问的根本不是同一个问题：FWER 问「至少出一个假阳性」的概率，FDR 问「公布出来的发现里假货占比的期望」。本课实验 1 里 BH 在 q=0.05 下拒绝了 63 个、其中 3 个假的（占比 0.048），换成 FWER 口径这 3 个假阳性一个都不许有——而按 Bonferroni 收紧到 $0.05/1200\approx4.17\times10^{-5}$ 之后，只剩 4 个真发现过关，另外 56 个真效应全被拦在门外。**控得越严，抓到的真货越少**。

**误区二**：「你以为 BH 的门槛是 $q/m$，和 Bonferroni 一样。」BH 的门槛是第 $i$ 名的 $iq/m$，逐名不同，而且**随名次放宽**。m=1200、q=0.05 时，第 1 名要压到 $4.17\times10^{-5}$，第 63 名放行到 $0.00263$，最后一名 $0.05$——跨度一千多倍。正是这个「后面的名次有更大配额」的设计，让 BH 能把 Bonferroni 漏掉的 56 个真发现捞回来。

**误区三**：「你以为 q=0.05 意味着最多 5% 的假设是假的。」q 管的是**被你宣布为发现的那一批**里的假货比例，不是全部假设。实验 1 里 1200 个假设有 1140 个本来就是无效的，全局假货率高达 95%——但 BH 只把 63 个送上领奖台，这 63 个里假货 3 个、占比 4.8%，符合承诺。换句话说：FDR 是「成绩单的质量指标」，不是「整个考场的水平」。

:::

## 6. 练习

**练习**：第 4 节技巧提示预告过的手癖专治题。六个假设的 p 值已从小到大排好，q=0.05，下面这段“遇到第一个越线就收工”的 BH 扫描会漏掉谁？修到输出正确的录取名次：

```exercise
# @title: 练习：BH 程序——扫完全部名次再定 k
# @check: 5
# @check: 0.04
# @hint: BH 找的是“仍在线下方的最大名次”，不是“第一个越线的名次”——去掉 break 扫完全部 i，让最后一个达标者说了算；拒绝的是前 k 名整体，中间越线的名次会被大 k 捞回来
pvals = [0.001, 0.02, 0.024, 0.03, 0.04, 0.3]   # 六个假设的 p 值（已升序排列）
m = len(pvals)      # len：数组长度，这里就是假设总数
q = 0.05            # 愿意接受的错误发现率上限（FDR 水位）

k = 0               # BH 认可的最大达标名次
for i in range(1, m + 1):
    if pvals[i - 1] <= q * i / m:   # 第 i 名的配额线是 i*q/m
        k = i
    else:
        break        # ← 有 bug：遇到第一个越线就收工，后面达标的名次全被漏掉

print(k)             # BH 拒绝前 k 个假设
print(pvals[k - 1])  # 临界名次的 p 值：它应恰好压在自己的配额线之下
```

<details>
<summary>点开查看逐步解答</summary>

配额线逐名算（q/m = 0.05/6 ≈ 0.00833）：第 1 名门槛 0.0083，p=0.001 ✓；第 2 名门槛 0.0167，p=0.02 ✗；第 3 名门槛 0.025，p=0.024 ✓；第 4 名门槛 0.0333，p=0.03 ✓；第 5 名门槛 0.0417，p=0.04 ✓；第 6 名门槛 0.05，p=0.3 ✗。最大达标名次 k=5，**录取前五名**。注意第 2 名自己越了线（0.02 > 0.0167），却被 k=5 一口气“捞”了回来——BH 拒绝的是前 k 名整体，不是逐名过线者。初始代码在 i=2 处就 break，只收 1 个，把第 3、4、5 名三个真达标者全放跑了；临界名次的 p 值 0.04 也对得上：0.04 ≤ 5×0.05/6 ≈ 0.0417 ✓。

</details>

## 7. 选读：BH 为什么恰好控住 $q$

<details>
<summary>选读 · 从「期望假货数」到「假货占比」的一步</summary>

本课把 BH 当成操作手册用：把 p 值排序、找最大达标名次 $k$、拒绝前 $k$ 名。为什么这个动作恰好让「拒绝集里的假货占比」的期望不超过 $q$？关键一步只用到「无效假设的 p 值在 $[0,1]$ 上均匀」这一条。

设总共有 $m$ 个假设，其中 $m_0$ 个是真的无效。若全部 $m$ 个都无效（$m_0=m$），按 BH 拒绝 $k$ 个时，这 $k$ 个全是假的，占比是 1——听起来要崩。但「拒绝 $k$ 个」这个事件本身有概率约束：要让第 $k$ 名达标，需要第 $k$ 小的 p 值 $\le kq/m$，而 $m$ 个均匀分布的第 $k$ 阶次序统计量的期望正是 $k/(m+1)$。把两边放在一起，就能算出 $E[V/R]\le q$（$V$ 是假阳性数、$R$ 是拒绝总数）。

严格的结论是 Benjamini–Hochberg 1995 年的定理：**当 p 值独立时**，BH 在水平 $q$ 下满足$E[V/\max(R,1)]\le q\cdot m_0/m\le q$。注意那个 $m_0/m$：无效假设越少（真效应越多），实际上界越松，BH 越保守——这也是为什么它比 Bonferroni 强得多。

两个边界条件值得记住。**独立性可以放松到正相关**（PRDS 条件），这是 2001 年 Benjamini 与 Yekutieli 补的；但**负相关会破功**，那时要换成 BY 程序，把门槛再除以调和数 $\sum_{i=1}^{m}1/i\approx\ln m+0.577$，$m=1200$ 时约除以 7.7——比 BH 严得多，也就丢掉了更多真发现。

还有一条实用推论：既然上界里带着 $m_0/m$，把 $m_0$ 估出来再代回去会更松（这叫自适应 BH 或 Storey 的 q-value）。本课实验 1 里 1200 个假设有 60 个真效应，$m_0/m=0.95$，修正幅度很小；但如果 1200 个里有一半是真的，自适应版本能把功效显著抬上去。

出处：Benjamini & Hochberg (1995), *JRSS-B* 57(1): 289–300；Benjamini & Yekutieli (2001), *Annals of Statistics* 29(4): 1165–1188；Storey (2002), *JRSS-B* 64(3): 479–498。三篇都在讨论「多重比较该按什么记账」，而记账口径的选择到今天仍是实验科学里的活跃话题。

</details>

## 8. 下一站

多重检验校正完毕，还差最后一课把整套工具箱钉在它最该在的地方——实验本身。下一课回到数据的产地：随机化、区组、混杂与功效，看前面所有工具在坏设计面前会如何集体失灵。

→ [实验设计：随机化、区组与混杂](./90-experimental-design.md)