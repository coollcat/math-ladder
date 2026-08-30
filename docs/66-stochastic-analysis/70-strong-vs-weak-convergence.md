---
title: 强收敛与弱收敛选讲
lesson_id: stochastic-analysis/strong-vs-weak-convergence
prereqs:
  - stochastic-analysis/sde-euler-maruyama
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - strong-convergence-order
  - weak-convergence-order
applications:
  - option-pricing-simulation
  - climate-ensemble-average
exits:
  - stochastic-analysis
---

# 强收敛与弱收敛选讲

## 1. 从一个场景开始

两家天气预报台在打擂台。甲台的招牌战绩是：随机抽一天对比，它报的逐小时气温曲线几乎和实测重合——**具体到某一条历史轨迹都贴得准**。乙台的长项则是：长期来看，它估的"七月中旬平均气温"极少失手——**要的是总量级的平均，不在乎单日剧情**。哪个更好？问题问错了：它们测的是两种不同的忠诚。数值解 SDE 也面对同一场拷问——本课就是那台用来给格式称重的天平，你会发现同一台 Euler-Maruyama 机器，在两杆秤上的读数竟然差出一整个数量级。

## 2. 直觉解释

**核心直觉：贴身跟踪是"强"，平均到位是"弱"；用途决定买哪一种。**

| 指标 | 提问方式 | 数学表达 | 适用场景 |
| --- | --- | --- | --- |
| 强收敛 | 单条路径级有多像？ | $\operatorname{E}\,\lvert X_T-\hat{X}_T\rvert^2$ 的方根 | 轨迹追踪、控制、filtering |
| 弱收敛 | 统计总量算得准吗？ | $\lvert\operatorname{E}f(X_T)-\operatorname{E}f(\hat{X}_T)\rvert$ | 定价、期望、稳态统计 |

两件常识帮你建立方位感：其一，路径贴合太好了自然平均也差不了——**强收敛推出弱收敛**（反过来不成立）；其二，欧式期权定价只要终点价的期望（弱的事），而风险敞口模拟关心整条最坏路径（强的事）。所以市面上无数论文里"Euler-Maruyama 收敛阶为 $\tfrac12$"与另一批论文里的"$1$"并不打架——前者谈强、后者谈弱。

## 3. 正式定义

设步长 $\Delta t_j=\tfrac{T}{N_j}$ 且 $N_{j+1}/N_j$ 固定。若存在 $C>0$：

$$\text{强：}\quad \Bigl(\operatorname{E}\lvert X_T-X_T^{(\Delta)}\rvert^{2}\Bigr)^{1/2}\le C\,\Delta t^{\alpha}\qquad\qquad \text{弱：}\quad \bigl\lvert\operatorname{E}f(X_T)-\operatorname{E}f(X_T^{(\Delta)})\bigr\rvert\le C\,\Delta t^{\beta}$$

则称格式的强阶为 $\alpha$、弱阶为 $\beta$。

| 符号 | 含义 |
| --- | --- |
| $X_T^{(\Delta)}$ | 步长 $\Delta t$ 下 EM 格式的终点 |
| $\operatorname{E}\lvert\cdot\rvert^2$ 开根 | 全体路径的平均平方误差——一杆秤读一个数 |
| 测试函数 $f$ | 你真正关心的统计量（例如收益封顶 $f(x)=(x-K)^+$）；弱阶允许对一类 $f$ 成立 |

对 Euler–Maruyama 的一般结论：$\alpha=\tfrac12$，$\beta=1$。上一课埋的伏笔在此兑现：噪声的振幅天生按 $\sqrt{\Delta t}$ 出手，盯单条轨迹时你逃不开这份粗粝；但翻到平均值那边，上下乱蹦的正负误差互相抵消，账面立刻体面起来。

## 4. 分步例题

**问**：某格式跑出两档终点均方根误差：$\Delta t=0.01$ 时 RMSE $=0.1200$；加密一倍（$\Delta t=0.005$）得 RMSE $=0.0600$。它是几阶的好手？若第二档换成 $0.0849$ 呢？

1. 网格比 $=2$，误差比 $=0.12/0.06=2$。恰好每次翻倍——线性缩放，判定：$\alpha=1$；
2. 若误差比是 $2/\sqrt{2}\approx1.414$（即 $0.12$ 对 $0.0849$）：这是"除以根号二"的节奏，判定：$\alpha=\tfrac12$；
3. 读法口诀：网格加倍、误差减半的是一阶；网格加倍、误差只缩小约三成的是半阶；
4. 应用一句：遇到后半种格式却预期前半种的精度，你就把网格加密量低估了四倍——预算就是这么超支的。

## 5. 动手实验

用已知真解的 GBM 当靶场（上一课的显式解直接当裁判），两杆秤同时上机：强秤抽多条路径求 RMS 误差，弱秤只比较终端均值。参数与上一课一致（$\mu=0.08$、$\sigma=0.2$、$T=1$、$S_0=100$）。

```python title="GBM 靶场：两杆秤同时称"
import random                     # 标准库随机模块；seed 固定保证可复现
import numpy as np                # 数值库：exp、sqrt、mean 都在这里

random.seed(77)
s0, mu, sig, T = 100.0, 0.08, 0.2, 1.0
paths_per_grid = 400              # 每档格子抽多少条路径

def em_terminal(dt):              # 一条 GBM 的 EM 终点价
    x = s0
    n = int(round(T / dt))
    for k in range(n):
        z = random.gauss(0.0, 1.0)
        x = x * (1.0 + mu * dt + sig * (dt ** 0.5) * z)   # 朴素 EM：扩散系数 ∝ s 不随状态变
    return x

def truth():                      # 显式解裁判
    return s0 * np.exp((mu - 0.5 * sig * sig) * T + sig * (T ** 0.5) * random.gauss(0.0, 1.0))

print("dt       强尺(RMS)     弱尺(|均值差|)")
for dt in [0.05, 0.025, 0.0125]:
    errs = []
    means_sim = []
    for i in range(paths_per_grid):
        sim = em_terminal(dt)
        errs.append(sim - truth())            # 同抽签配对的路径级偏差
        means_sim.append(sim)
    rms = np.sqrt(np.mean(np.square(errs)))   # square 平方后 mean 平均再开方
    weak_err = abs(np.mean(means_sim) - s0 * np.exp(mu * T))
    print(str(dt).ljust(9), str(round(float(rms), 3)).ljust(13), round(float(weak_err), 4))
```

读表要点：左侧强尺一栏大体按 $\sqrt{2}$ 相邻缩放（半阶的面相），右侧弱尺一栏接近相邻减半（一阶的面相）。抽样噪声会让个别行抖动——加大 `paths_per_grid` 再跑一次，轮廓就会稳下来。这正是两份文献对同一格式给出不同阶数的现场。

概念自检放一张时间轴对照图也行，不过这课的灵魂全在表格读数上，我们把交互配额留给下一课的密度云动画。

## 6. 常见误区

:::warning[常见误区]

- **"既然弱阶更高，平时就都说弱阶吧"** —— 措辞必须先声明用的是哪杆秤。对冲误差、最优停止这类路径敏感型问题，弱阶漂亮救不了命。
- **"误差比看起来接近 2 或 1.41 就能定案"** —— 单点抽样有噪声。规范做法是多档网格连看趋势，或固定种子做配对试验（上文代码正是这么干的）。
- **"强收敛必然意味着每条模拟路径都有意义"** —— 强阶说的是统计意义上的平均贴近，不是给你制造"第 42 号路径从此代表现实"的许诺。

:::

## 7. 练习

写一个"阶数预测器"，按公式 $\text{error}=C\,\Delta t^{p}$ 给出不同合同下的理论读数。初始代码把幂次安错了部位——修好并通过检查：

```exercise
# @title: 阶数预测器：别把幂装错位置
# @check: 1.0
# @check: 0.001
# @check: 0.5
# @hint: 合同形态是 C·Δt^p：常数 C 只是音量旋钮，Δt 才该被送上 p 次方的舞台。
import numpy as np    # sqrt 开平方

def predicted_strong(C, dt):
    return C ** 0.5 * dt        # ← 幂次跑到常数头上去了

def predicted_weak(C, dt):
    return C * dt               # 弱阶合同默认 p = 1

print(round(predicted_strong(2.0, 0.25), 3))
print(round(predicted_weak(1.0, 0.001), 4))
print(round(predicted_strong(2.0, 0.0625), 3))
```

<details>
<summary>点开查看逐步解答</summary>

```python
def predicted_strong(C, dt):
    return C * dt ** 0.5        # 强阶合同 p = 1/2：误差 ~ C·√Δt

def predicted_weak(C, dt):
    return C * dt               # 弱阶合同 p = 1：误差 ~ C·Δt

print(round(predicted_strong(2.0, 0.25), 3))     # 2×0.5   = 1.0
print(round(predicted_weak(1.0, 0.001), 4))      # 1×0.001 = 0.001
print(round(predicted_strong(2.0, 0.0625), 3))   # 2×0.25  = 0.5
```

第三条检查故意让你亲眼看半阶的代价：想从 $1.0$ 的误差压到 $0.5$，一阶格式只需把格子减半（$\Delta t=0.0005$ 就够），半阶格式却要把格子砍成十六分之一（$0.0625=1/16$）。预测器在手，实验预算不再拍脑袋。

</details>

```quiz
你的任务是为欧式看涨期权定价，只需要终端价格的一个期望值。哪杆秤是合适的验收标准？
- 强收敛阶
- 弱收敛阶 [*]
- 必须两者都达到最高才算合格
? 定价的原命题是 E[f(S_T)] 这个数本身；路径中段长得像不像毫无价值。所以弱阶（EM 达 1 阶）正是为这类任务量身定做的秤。
```

```quiz
同一个 Euler-Maruyama 格式，为何文献里既有"收敛阶 1/2"又有"收敛阶 1"的说法？
- 其中一方算错了
- 两处说的不是同一杆秤：1/2 是强阶、1 是弱阶 [*]
- 说法取决于编程语言
? 半阶的出处是单条路径级误差受噪声配速拖累；一阶的出处是平均意义下正负误差相互抵消。声明结论时补上"强/弱"两个字，一切之争烟消云散。
```

## 8. 选读证明：为什么"平均一下"白赚半个阶

<details>
<summary>选读：抵消机制的两行账</summary>

关键是把弱误差按增量展开并逐项记账。令终局函数 $f$ 光滑，路径级差值为

$$f(X_T^{(\Delta)})-f(X_T)\approx f'(X_T)\,(X_T^{(\Delta)}-X_T)+\frac12 f''\,(\cdots)^2+\cdots$$

取期望后，首项的关键在于 $\operatorname{E}[f'(X_T)(X^{(\Delta)}-X)]$ 的结构：把两者的差异逐步回溯到各段噪声增量的矩缺口。噪声的一段贡献形如

$$\sigma\sqrt{\Delta t}\,\Delta W\quad\text{与}\quad (\Delta B)^2-\Delta t,$$

前者对期望贡献为零（奇数矩消失），后者尺寸 $\Delta t$ 但**其影响经由二阶项进入账本后恰与 Itō 修正精妙相消**。于是留给弱误差的主导项只剩漂移侧的 $O(\Delta t)$ 缺口——阶数凭空抬升一级。

而强误差之所以享受不到这个福利，是因为它的判据卡在最不走运的那批路径上：RMS 把每一家的平方都收进账本，符号相反的两笔无法互相注销，于是半阶的噪声底噪原样浮现在天平上。Milstein 格式往格式里添 $\tfrac12\sigma\sigma'\bigl[(\Delta B)^2-\Delta t\bigr]$ 这一勺，等价于手工替强尺度付清了那笔二阶欠款——强阶升到 $1$。整条逻辑链的抵押物，仍然是那本二次变差的存折。

</details>

## 9. 下一站

单条路径说完了，是时候换一群粒子全体登台——[Fokker-Planck 方程](./80-fokker-planck.md)：看密度云如何沿着人群的整体命运流动。
