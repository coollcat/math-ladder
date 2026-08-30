---
title: 假设类容量与一致性：多大的模型学得会
lesson_id: learning-theory/capacity-consistency
prereqs:
  - learning-theory/generalization-gap
volume: 4
layer: L10
track:
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - finite-hypothesis-class
  - hypothesis-class-capacity
  - sample-complexity
  - consistency
applications:
  - machine-learning
exits:
  - data-ai
---

# 假设类容量与一致性：多大的模型学得会

## 1. 从一个场景开始

公司要给客服邮件自动打"急/缓"标签。你从历届前辈的笔记里翻出一本小抄，上面工整列着 $M$ 条现成判定规则——"包含'退款'就急"、"正文超两屏就急"……上任第一天你要做一件事：拿手头 $n$ 封已标注邮件当模拟考，让每条规则跑一遍，挑错得最少的。

上一课（训练误差与泛化鸿沟）已经预警过：模拟考冠军的真实成绩通常虚高。这一课回答更前面的一个问题：**这本小抄有多厚，才会决定虚高多少？** 小抄只有 3 条时，几乎不可能有一条恰好押中全部考题，冠军可信；小抄有十亿条时，总有一条纯粹靠运气全对，冠军是骗子。把"厚薄"写进泛化误差的账本，就是本课的全部任务。

## 2. 直觉解释

把假设类 $\mathcal{H}$ 的规模 $M$ 想象成选手池的人数：

- **人越多，越容易蒙出好成绩**。$M$ 条规则里随便哪条都想当模拟考冠军，考官得多留几分余量去防"有人碰巧满分"。这份防作弊预算随 $\ln M$ 增长——人数翻倍只多付一点点，这就是容量进入账本的方式。
- **但好处是真的**：库里人多，说明"真本事规则"更可能在其中。若最优规则的错误率是 $\varepsilon^\*$，只要数据够多、库不太离谱，模拟考冠军的真实错误率就能被压到 $\varepsilon^\* + \varepsilon$ 附近。

两股力量合起来叫**一致性**：模型不会永远幼稚——样本充足时，经验风险最小化的答案收敛到库内最优。学习理论的第一个定量承诺就是：要兑现它，需要多少份样本？答案是

$$n \ \gtrsim\ \frac{\ln(2M/\delta)}{2\varepsilon^2}$$

三个观察值得记牢：对数让容量极不敏感（$M$ 扩大一万倍，$\ln M$ 只翻一倍）；代价主要由 $1/\varepsilon^2$ 这个平方项承担；想更有把握（更小的失败率 $\delta$），只需按 $\ln(1/\delta)$ 缓慢加样本。

## 3. 正式定义

| 符号 | 名字 | 要点 |
| --- | --- | --- |
| $\mathcal{H}$ | 假设类 | 本课限**有限**情形，条数记 $M$ |
| $\hat{h}$ | ERM 输出 | 在 $n$ 个样本上训练误差最小的那条规则 |
| $\varepsilon$ | 近似精度 | 允许与库内最优差多少 |
| $\delta$ | 置信参数 | 整个保证失效的概率上限 |

**一致泛化界（有限类）**：以至少 $1-\delta$ 的概率，同时对库内每一条规则成立

$$R(h) \;\le\; \hat{R}(h) + \sqrt{\frac{\ln(2M/\delta)}{2n}}$$

左边的 $R(h)$ 是真实风险，右端第二项是与库规模挂钩的防作弊余量。它是单条规则界（上一课）对所有 $M$ 条规则做一次概率并集的结果，所以对**选出来的** $\hat h$ 也成立——这解除了"用同一批数据既选又评"的原罪。

**样本复杂度**：要求 ERM 输出满足 $R(\hat h)\le R(h^\*)+\varepsilon$ 时所需的最少样本量约为上式反解：

$$n \;\ge\; \frac{\ln(2M/\delta)}{2\varepsilon^2}$$

## 4. 分步例题

取置信参数 $\delta = 0.05$，允许偏差 $\varepsilon = 0.05$。

1. 小抄只有 $M=1000$ 条规则。代入公式：

$$\frac{\ln(2\cdot 1000/0.05)}{2\cdot 0.05^2} = \frac{\ln 40000}{0.005} = \frac{10.597}{0.005} \approx 2119.3 \;\Rightarrow\; n \ge 2120$$

2. 小抄暴涨一千倍，$M=10^6$ 条：

$$\frac{\ln(4\times 10^{7})}{0.005} = \frac{17.504}{0.005} \approx 3500.9 \;\Rightarrow\; n \ge 3501$$

3. 对比两次：库扩大了 **1000 倍**，样本需求只增加约 65%——$\ln$ 的缩放威力；而把 $\delta$ 从 0.05 收紧到 0.00005，分子只从 $\ln 40000=10.60$ 变为 $\ln(8\times10^7)=18.20$，样本需求仅涨七成。"更自信"意外地便宜。

## 5. 动手实验

### 实验 1（viz）：防作弊余量的衰减曲线

```viz
{
  "type": "plot",
  "title": "余量 b(n) = s / sqrt(n)：样本越多，兜底越便宜",
  "expr": "s/sqrt(x)",
  "xmin": 1,
  "xmax": 50,
  "sliders": [
    { "name": "s", "min": 0.3, "max": 3, "step": 0.05, "value": 1.16 }
  ]
}
```

横轴是样本量 $n$，纵轴是界里的余量项，$s=\sqrt{\ln(2M/\delta)/2}$ 把库的厚度压成一个旋钮。任务卡：(1) 先在 $s=1.16$（对应 $M=10^4,\ \delta=0.05$）读出 $n=100$ 与 $n=1600$ 处的余量；(2) 把 $s$ 拖到最大（相当于疯狂扩容），曲线整体抬高但形状不变——容量影响的是高度不是坡度，坡度永远是 $n^{-1/2}$；(3) 思考：想让余量减半，样本要几倍？

### 实验 2（python）：阈值规则库的一致性三连拍

一维世界里真相是"x 不小于 20 就亮灯"，另有 10% 标签噪声。库内容量取决于候选门槛个数，我们只看 ERM 学出的门槛在不同样本量下诚实与否：

```python title="阈值库：训练误差、测试误差与鸿沟随 n 收窄"
import random       # random：伪随机数（此前课程已介绍）
import statistics   # statistics：均值等统计函数

def make_dataset(n, rng):
    pts = []
    for _ in range(n):
        x = rng.uniform(0.0, 40.0)                 # uniform：区间内均匀抽小数
        truth = 1 if x >= 20 else 0                # 世界真相：过了 20 就亮灯
        if rng.random() < 0.1:                     # 一成概率翻转标签——噪声地板来源
            truth = 1 - truth
        pts.append([x, truth])
    return pts

def fit_threshold(pts):
    # 库 = 全体"门槛规则"，ERM 就是枚举相邻样本间的门缝挑错最少的
    srt = sorted(pts)                              # sorted：按 x 排队
    cand = [min(p[0] for p in srt) - 1.0]          # min：最小值；极端门槛先入候选
    for i in range(len(srt) - 1):
        cand.append((srt[i][0] + srt[i + 1][0]) / 2)  # 每条相邻缝隙一个候选门槛
    best_err = None
    best_t = None
    for t in cand:
        err = sum(1 for p in srt if int(p[0] >= t) != p[1])  # int：布尔转 0/1 计错
        if best_err is None or err < best_err:
            best_err = err
            best_t = t
    return best_t

REPS = 300                  # 同样实验重复三百遍平均掉运气
rng = random.Random(7)      # 固定种子，人人可复现
for n in [50, 200, 800]:
    train_errs = []
    test_errs = []
    for r in range(REPS):
        tr = make_dataset(n, rng)
        t = fit_threshold(tr)
        te = sum(1 for p in tr if int(p[0] >= t) != p[1]) / n        # 训练错误率
        train_errs.append(te)
        fresh = make_dataset(1000, rng)                               # 全新考生当测试集
        terr = sum(1 for p in fresh if int(p[0] >= t) != p[1]) / len(fresh)
        test_errs.append(terr)
    trm = statistics.mean(train_errs)
    tem = statistics.mean(test_errs)
    print(f"n={n}: train={trm:.3f} test={tem:.3f} gap={tem - trm:.3f}")
```

典型输出：

| n | train | test | gap |
| --- | --- | --- | --- |
| 50 | 0.097 | 0.116 | 0.019 |
| 200 | 0.100 | 0.104 | 0.004 |
| 800 | 0.099 | 0.101 | 0.002 |

三条曲线一起走向 0.10 附近的噪声地板——训练误差不再下降（它早被噪声托底），但**鸿沟稳定收缩**：这正是余量项 $n^{-1/2}$ 的肉身形态，也回应实验 1 里"坡度不变"的观察。

### 快问快答

```quiz
小抄从一千条扩到一百万条（一千倍），要维持同样的保证，新增样本的需求大约是？
- 同步乘一千倍
- 只增加六成左右，因为预算跟着 ln M 走 [*]
- 完全不用变
? 余量项吃的是 ln(2M/δ)：M 乘 1000，ln 部分从约 ln2000≈7.6 涨到约 ln(2×10^6÷50)=10.6，需求比例约 10.6/7.6≈1.4，也就是四成上下的小幅上涨——对数是容量党最好的朋友。
```

:::warning[常见误区]

**误区一**：你以为库越大必然过拟合。库大只是"可能有人运气好"的风险变贵，前提仍是库里得有 low-risk 规则可学；真实约束来自两头，见下一节误区二。

**误区二**：你以为对数意味着无限大的库免费。当 $M\to\infty$ 公式直接爆炸——现实中的连续族（直线、阈值区间）条数无限，却又能学，秘密在于它们的有效维度有限。这就是下一课 VC 维要补的洞。

**误区三**：你以为训练误差到零任务就结束。界说的是 $R(\hat h)\le R(h^\*)+\varepsilon$ 以概率 $1-\delta$ 成立：即便完美拟合考卷，$\varepsilon$ 与 $\delta$ 两笔账照付不误。

:::

## 6. 练习

**练习**：你是密码审计员。规则库共 $M=10^4$ 条"登录尝试模式"判据，希望挑出的判据真实错误率与库内最优相差不超过 $\varepsilon=0.1$，且整套结论有 $95\%$ 置信（$\delta=0.05$）。先算最少样本量；再反向思考：如果只批给你 $n=800$ 条样本，这套机制实际能承诺的 $\varepsilon$ 是多少？

```exercise
# @title: 练习：规则库审计的样本账本
# @check: 645
# @check: 0.09
# @hint: 正向问题用 n ≥ ln(2M/δ)/(2ε²) 并向上取整；反向问题是解出 ε ≥ sqrt(ln(2M/δ)/(2n))，最后 round 到三位小数
import math           # math.log 自然对数此前已介绍；math.ceil 向上取整也是老朋友

M_rules = 10 ** 4     # 规则库条数
eps_target = 0.1      # 允许的近似差距
delta_conf = 0.05     # 保证失效的概率上限

need = math.log(2 * M_rules / delta_conf)         # ← 有 bug：忘了除以 2*eps_target 平方
print(round(need))                                # ← 还有 bug：这不是向上取整，该换 math.ceil

bound_at_800 = math.sqrt(math.log(2 * M_rules / delta_conf) / (2 * 800))
print(bound_at_800)                               # ← 方向对了：请改成 round(..., 3)
```

<details>
<summary>点开查看逐步解答</summary>

第一问：$n \ge \dfrac{\ln(2\times10^4/0.05)}{2\times 0.01} = \dfrac{\ln 400000}{0.02} = \dfrac{12.899}{0.02} \approx 644.96$，向上取整得 **645**。（注意必须 ceil：小数部分"差一点"就意味着保证差一口气。）

第二问：反解 $\varepsilon \ge \sqrt{\ln(400000)/(2\times 800)} = \sqrt{12.899/1600} = \sqrt{0.008062} \approx 0.0898$，round 后即 **0.09**。批到的样本比理想少，就把精度让给 $\varepsilon$——工程谈判的经典句式："钱不够，指标松一点。"

</details>

## 7. 选读：并集Bound为何一分钟搭好

<details>
<summary>选读 · 从一条规则到一整本小抄</summary>

上一课的单规则界说：固定 $h$ 且其 $R(h)\ge\varepsilon$ 时，$n$ 个独立样本全部被它侥幸答对的概率不超过 $e^{-2n\varepsilon^2}$。现在库里 $M$ 条规则各自都想赌一把"看起来不错"：由并集不等式（至少一人出事的概率 ≤ 各自出事概率之和），坏消息总概率至多 $M e^{-2n\varepsilon^2}$。再照顾到我们用的是训练误差而非真实风险的两侧偏差，放个保险系数翻倍成 $2M e^{-2n\varepsilon^2}$。令它 $\le\delta$ 解出 $\varepsilon$，就是正文的余量公式。整个推导只用了两块砖：单规则指数衰减 + 并集求和——但注意砖块数量随 $M$ 线性增长，这正是对数无法救药的根源之一，也是后续 VC 维改用"增长函数计数"的动机。

</details>

## 8. 下一站

公式的软肋已经亮明：真实世界的规则库从不数得清——所有可能的直线、所有可能的深度网络，$M=\infty$。可它们偏偏学得好，说明"数条数"数错了对象。该数的是**能实现的行为多样性**：VC 维登场。

→ [VC 维与 shattering：给模型复杂度定量](./60-vc-dimension.md)
