---
title: PAC 学习框架：可能近似正确
lesson_id: learning-theory/pac-learning
prereqs:
  - learning-theory/vc-dimension
  - learning-theory/capacity-consistency
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
  - pac-learning
  - confidence-parameter
  - sample-budgeting
applications:
  - machine-learning
exits:
  - data-ai
---

# PAC 学习框架：可能近似正确

## 1. 从一个场景开始

快递分拣中心要上一台"错件识别机"。采购部把供应商叫来开会，只问两个问题：

1. "上线后真实错件率能压到多少？"——供应商不敢承诺零，报价单写 **ε**（比如百分之一）；
2. "这个数字有几分把握？"——供应商再补一个保险条款，失败概率不超过 **δ**（比如百分之五）。

学习理论把这套商业惯例升格成数学合同：**(ε, δ)-保证**。"可能"对应 δ，"近似正确"对应 ε——合起来就是 **PAC**（Probably Approximately Correct）。这一课把合同逐条翻译成样本量的价格表。

## 2. 直觉解释

前两课的零件已经齐了：单条规则的赌注会指数衰减（$e^{-2n\varepsilon^2}$），多规则的并集代价是乘上 $M$ 或 $\ln \Pi_{\mathcal H}(2n)$。把它们拧在一起，PAC 承诺长这样：只要样本量

$$n \;\ge\; \frac{\ln\!\big(2\Pi_{\mathcal{H}}(2n)/\delta\big)}{2\varepsilon^{2}}$$

那么无论数据分布多么刁钻、ERM 选中哪条规则，都有至少 $1-\delta$ 的概率使它的真实风险不超过库内最优再加 $\varepsilon$。有限类只是特例（$\Pi=n$ 条规则时回到 $\ln(2M/\delta)$）。

两个旋钮的价目表截然不同：**精度 ε 坐在平方分母上，收紧它是真金白银的贵**；**置信 δ 躲在对数里，翻几番也花不了几个钱**。这也解释了工业界的实际做法——宁可把把握度报到三个九，也很少有人敢把误差压小十倍。

## 3. 正式定义

| 符号 | 名字 | 白话 |
| --- | --- | --- |
| $\varepsilon$ | 近似参数 | 与库内最优的错误率差距上限 |
| $\delta$ | 置信参数 | 合同整体失效的概率上限 |
| $\Pi_{\mathcal H}(2n)$ | 行为计数 | $2n$ 个点上可实现贴法数，VC 维控制它 |
| $h^\*$ | 库内最优 | $\mathcal H$ 中真实风险最低者 |

**PAC 可学习（叙述式定义）**：称 $\mathcal H$ 在样本复杂度 $m_{\mathcal H}(\varepsilon,\delta)$ 内 PAC 可学，若存在算法使得对一切分布，当样本数超过该函数时，输出以概率 $\ge 1-\delta$ 满足 $R(\hat h)\le R(h^\*)+\varepsilon$。

要点有二：(1) 保证是**两维折衷**——既不承诺每次都对（留 δ），也不承诺完美（留 ε）；(2) 对**最坏分布**统一成立，这是它在理论上的硬气之处。由 Sauer 引理 $\Pi_{\mathcal H}(2n)\le(2en/h)^h$ 可得 VC 有限时的显式价目：

$$m_{\mathcal H}(\varepsilon,\delta) \;=\; O\!\left(\frac{h\ln(1/\varepsilon)+\ln(1/\delta)}{\varepsilon^{2}}\right)$$

## 4. 分步例题

沿用门槛规则库设定（$\varepsilon,\delta$ 含义同前），三笔账看清哪些因素真正烧钱：

1. $M=50$ 条规则、$\delta=0.05$、$\varepsilon=0.05$：

$$\frac{\ln(2\cdot 50/0.05)}{2\cdot 0.05^2}=\frac{\ln 2000}{0.005}=\frac{7.601}{0.005}\approx 1520.2 \Rightarrow n\ge 1521$$

2. 同时收紧两头：$M=200$、$\delta=0.01$、$\varepsilon=0.10$：

$$\frac{\ln(40000)}{0.02}\approx 529.8 \Rightarrow n\ge 530$$

宽裕的精度救了场——尽管库更大、置信更高，样本反而更省。可见 $\varepsilon$ 掌生杀。

3. 把第 1 问的精度腰斩至 $\varepsilon=0.025$：分母缩小四倍，$1520.2\times 4\approx 6080.8\Rightarrow n\ge 6081$。**ε 减半 = 预算 ×4**，这就是平方律的獠牙。

## 5. 动手实验

### 实验 1（python）：合同的违约实测

带噪声的分拣线上跑 120 回合 ERM（噪声率 0.12，即库内最优本身就有约 0.12 的错误率），每次训练后换一批全新考卷验收：

```python title="120 回合抽检：鸿沟从未击穿 0.15 的红线"
import random       # random：伪随机数（此前课程已介绍）
import math         # math.log 与 math.sqrt 同为老朋友

MGRID = list(range(41))     # 候选门槛取整网格 0..40，库容量 41

def pac_round(rng, n_train):
    xs_tr = []
    ys_tr = []
    for _ in range(n_train):
        x = rng.uniform(0.0, 40.0)
        y = 1 if x >= 20 else 0
        if rng.random() < 0.12:        # 一成二标签噪声：世界自带的欺骗
            y = 1 - y
        xs_tr.append(x); ys_tr.append(y)
    best_err = None; best_t = None
    for t in MGRID:                    # ERM：枚举全部门槛挑训练误差最小者
        e = 0
        for k in range(n_train):
            if int(xs_tr[k] >= t) != ys_tr[k]:
                e += 1
        if best_err is None or e < best_err:
            best_err = e; best_t = t
    train_err = best_err / n_train
    fresh_x = []; fresh_y = []
    for _ in range(4000):              # 全新考卷：独立重抽当验收
        x = rng.uniform(0.0, 40.0)
        y = 1 if x >= 20 else 0
        if rng.random() < 0.12:
            y = 1 - y
        fresh_x.append(x); fresh_y.append(y)
    test_err = sum(1 for k in range(4000)
                   if int(fresh_x[k] >= best_t) != fresh_y[k]) / 4000
    return train_err, test_err

rng = random.Random(11)                # 固定种子可复现（同一随机流的教学简化）
gaps = []
viol_eps = 0.15                        # 合同红线：泛化鸿沟不得超过 0.15
count_bad = 0
R = 120
for r in range(R):
    tr, te = pac_round(rng, 150)
    gaps.append(te - tr)
    if te - tr > viol_eps:
        count_bad += 1
print(f"{R} rounds: mean gap={sum(gaps)/len(gaps):.3f} "
      f"max gap={max(gaps):.3f} worst-exceeds-{viol_eps}:{count_bad}")
print("bound with M=41,n=150,del=0.05:",
      round(math.sqrt(math.log(2 * len(MGRID) / 0.05) / (2 * 150)), 3))
```

典型输出：

| 指标 | 实测值 |
| --- | --- |
| 平均鸿沟 | 0.003 |
| 最坏鸿沟 | 0.057 |
| 击穿红线次数 | 0 |

以及理论上界 $\sqrt{\ln(2\times 41/0.05)/(2\times 150)} \approx 0.157$。读法有三层：平均而言 ERM 极其诚实（0.003）；最坏的运气回合也远在红线之下；而理论界站着不动却从不失守——保守的界胜过灵活的空头支票。（随机流跨回合共享属教学简化；严谨版需每回换种子。）

### 实验 2（viz）：价目曲线速查器

```viz
{
  "type": "plot",
  "title": "样本需求 n(k, eps) = k / eps^2，k = ln(2M/delta)/2",
  "expr": "k/x^2",
  "xmin": 0.05,
  "xmax": 0.5,
  "sliders": [
    { "name": "k", "min": 1, "max": 15, "step": 0.05, "value": 6.45 }
  ]
}
```

横轴是目标精度 $\varepsilon$，纵轴是所需样本量，旋钮 $k$ 打包了容量与置信（$\ln(2M/\delta)$ 的一半）。任务卡：(1) 默认 $k=6.45$ 正是 $M=10^4,\delta=0.05$ 的上节旧账，读出 $\varepsilon=0.1$ 处约为 645；(2) 把横坐标拖到 0.05 看 $k/\varepsilon^2$ 冲天而起；(3) 拖 $k$ 翻倍，对比纵轴整体只涨一截——再次确认置信与容量的"折扣地位"。

### 快问快答

```quiz
想让误差券从 ε=0.1 收紧到 ε=0.05，其他不动，样本预算大约要付出什么代价？
- 翻倍就够
- 四倍左右：精度坐在分母的 ε 平方上 [*]
- 不用加样本，改小 δ 就行
? 价目公式按 ln(2M/δ)/(2ε²) 计费。ε 减半把分母砍成四分之一，本课题库里正是 1521 到 6081 的实算。置信 δ 收得再紧也只是对数级的小钱，真正烧钱的是精度。
```

:::warning[常见误区]

**误区一**：你以为 PAC 是"模型大概率完全正确"。Approximately Correct 里没有完美的位置——就算 δ 兑现，仍有最多 ε 的真实差距赖着不走。

**误区二**：你以为 ε 和 δ 是一回事。ε 说"差多少"，δ 说"这份差评有多可靠"；一个是产品指标，一个是审计条款，混淆会把两笔账记到一起。

**误区三**：你拿 PAC 界当预算审批的精算表。界担保的是最坏分布下的下限安全，现实数据往往让你需要远少于公式的样本；把它当"绝不超支的天花板"用，别当"刚好花这么多"用。

:::

## 6. 练习

**练习**：风控团队候选了 $M=80$ 棵决策树，要求误差不超过库内最优再加 $\varepsilon=0.2$，置信水平 $98\%$（$\delta=0.02$）。(a) 至少要多少标注样本？(b) 若只批到 $n=60$ 条，实际能签的 $\varepsilon$ 下限是多少？(c) 数据翻倍到 120 条后，这张新契约的 $\varepsilon$ 又能压到多少？

```exercise
# @title: 练习：给风控模型签一份样本合同
# @check: 113
# @check: 0.274
# @check: 0.194
# @hint: (a) n ≥ ln(2M/δ)/(2ε²) 再 ceil；(b)(c) 反解 ε ≥ sqrt(ln(2M/δ)/(2n)) 后 round 三位
import math            # math.log 与 math.ceil 此前课程均已正式引入

M_rules = 80           # 候选规则数
delta_conf = 0.02      # 置信参数：98% 把握
eps_goal = 0.20        # 目标近似精度

need = math.log(2 * M_rules / delta_conf) / (2 * eps_goal)   # ← 有 bug：ε 忘了平方
print(math.ceil(need))

n_have = 60
eps_real = 0                    # ← 占位：用 sqrt(ln(2M/δ)/(2·n_have)) 补全并 print(round(..., 3))
print(round(eps_real, 3))

n_more = n_have * 2             # 数据翻倍后再谈一次判
eps_better = 0                  # ← 占位：同样公式换 n = n_more，round 三位后打印
print(round(eps_better, 3))
```

<details>
<summary>点开查看逐步解答</summary>

(a) $n \ge \dfrac{\ln(160/0.02)}{2\times 0.04} = \dfrac{\ln 8000}{0.08} = \dfrac{8.987}{0.08} \approx 112.34$，向上取整得 **113**。

(b) 只有 60 条：$\varepsilon \ge \sqrt{8.987/120} = \sqrt{0.07489} \approx 0.274$。买不起精度就卖精度。

(c) 样本翻倍到 120：$\varepsilon \ge \sqrt{8.987/240} \approx 0.194$。注意改进幅度只有约 0.08——平方根的老脾气：样本翻倍，精度红利减半，与第一课的鸿沟收缩曲线遥相呼应。

</details>

## 7. 选读：为什么"同时对全体规则成立"是灵魂

<details>
<summary>选读 · 逐点保证如何破产</summary>

只对 ERM 选中的那条 $\hat h$ 写单规则界是不合法的：$\hat h$ 是看完数据才决定的，"固定一条规则"的前提被打破——它恰是赌局里的赢家，天然带偏差。补救动作是把保证升级为对全库的**一致收敛**：所有 $h$ 同时满足 $|\hat R(h)-R(h)|\le\varepsilon_{\text{unif}}$。这样无论谁被选中都自动免检。升级的成本是一次并集求和，把计数对象从 $M$ 换成行为数 $\Pi(2n)$（无效样本减半的技术细节涉及对称化论证，此处不展开）。由此得到的正是正文那个双参数合同：分子 $\ln\Pi$ 记录着复杂度的发票，分母 $\varepsilon^2$ 记录精度的电费——PAC 定义不过是把这张发票签上了日期和骑缝章。

</details>

## 8. 下一站

分类世界的账本理顺了。但工程师的日常更多是回归拟合：不是"抓没抓住"，而是"偏了几毫米"。当平方损失遇上过于勤劳的最小化器，需要一根缰绳——正则化，而它恰好又是对抗方差的理论武器。

→ [正则化的理论视角](./80-regularization-theory.md)
