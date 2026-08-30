---
title: 偏差、方差与不可约误差
lesson_id: learning-theory/bias-variance
prereqs:
  - learning-theory/generalization-gap
  - prob/stats
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
  - bias-variance-decomposition
  - irreducible-error
applications:
  - machine-learning
exits:
  - data-ai
---

# 偏差、方差与不可约误差

## 1. 从一个场景开始

射击队要选一人参赛。老张的 10 发全部聚成一团，可惜整体偏左三环；小李的 10 发围着靶心散开一圈，平均下来倒是正中。教练犯了难：**稳定的偏，和不稳的正，哪个更接近冠军？**

机器学习天天做这道选择题。"偏多少"叫偏差，"散多大"叫方差——这一课把总误差精确地拆成这两块，外加一块谁也消不掉的底噪。

## 2. 直觉解释

把每次训练看成选手上场打一靶：训练集不同，学到的模型就不同，预测随之摆动。

- **偏差**：所有弹着点的平均位置离开靶心多远——系统性瞄准错误。模型太简单、对数据里的规律视而不见时，偏差大（老张）。
- **方差**：弹着点彼此散开多远——发挥波动。模型太敏感、训练集换个样它就换一副面孔时，方差大（小李）。
- **不可约噪声**：风。再稳的手、再准的瞄，也吹不散风——数据自带的随机成分 $\sigma^2$，任何模型都无法消除。

关键的跷跷板：给选手换更精密的枪（更复杂的模型），瞄得越来越正（偏差降），但枪也越抖（方差升）。总成绩是三者之和，形状像一条山谷——我们要找谷底。

## 3. 正式定义

固定测试点 $x$，真实规律 $f(x)$，噪声方差 $\sigma^2$。设用训练集 $D$ 训出的预测为 $\hat{f}_D(x)$，期望 $\bar{f}(x) = \mathbb{E}_D[\hat{f}_D(x)]$——注意**期望是对"抽到哪份训练集"取的**。则平均平方误差分解为：

$$\mathbb{E}_D\big[(\hat{f}_D(x)-y)^2\big] = \underbrace{\big(\bar{f}(x)-f(x)\big)^2}_{\text{偏差}^2} + \underbrace{\mathbb{E}_D\big[(\hat{f}_D(x)-\bar{f}(x))^2\big]}_{\text{方差}} + \underbrace{\sigma^2}_{\text{不可约噪声}}$$

| 成分 | 白话 | 由什么决定 |
| --- | --- | --- |
| 偏差平方 | 平均预测离真相多远 | 模型假设类够不够丰富 |
| 方差 | 预测随训练集抽签晃动多厉害 | 模型对数据扰动有多敏感 |
| 不可约噪声 | 数据自带波动 | 世界本身，与模型无关 |

三个要点：分解只在平方损失下干净成立；"平均预测"$\bar{f}$ 是想象中"无数次重训的平均行为"，不是任何一个具体模型；第三块是地板——总误差永远不会低于 $\sigma^2$。

## 4. 分步例题

在测试点 $x_0$ 处，真值 $f(x_0)=2$，噪声标准差 $\sigma = 0.5$（即 $\sigma^2 = 0.25$）。考察两个候选模型各重训四次的表现：

1. **模型甲**（死板）：四次预测全是 $1.0$。平均预测 $\bar{f}=1.0$，偏差 $= 1.0 - 2 = -1$，偏差平方 $=1$；
2. 甲的方差：四次预测纹丝不动，方差 $=0$；
3. **模型乙**（善变）：四次预测为 $1.6,\ 2.4,\ 2.0,\ 2.0$。平均 $\bar{f}=2.0$，偏差 $=0$；
4. 乙的方差：$((−0.4)^2+(0.4)^2+0+0)/4 = 0.08$；
5. 合计总误差：甲 $= 1+0+0.25 = 1.25$；乙 $= 0+0.08+0.25 = 0.33$——本例乙胜，但若把甲的偏差换成 $-2$，天平立刻倒向甲。胜负取决于三块的相对大小，这正是下一节滑块实验要你亲手摸的东西。

## 5. 动手实验

### 实验 1（viz）：U 形谷底调参台

```viz
{
  "type": "plot",
  "title": "总误差 = 方差爬坡 + 偏差下坡 + 噪声地板",
  "expr": "v*x^2 + b/x + s",
  "xmin": 0.3,
  "xmax": 4,
  "sliders": [
    { "name": "v", "min": 0.1, "max": 1, "step": 0.05, "value": 0.5 },
    { "name": "b", "min": 0.5, "max": 4, "step": 0.1, "value": 2 },
    { "name": "s", "min": 0, "max": 2, "step": 0.1, "value": 0.8 }
  ]
}
```

横轴是模型复杂度（左简单右复杂）。任务卡：(1) 拖 `v`——右臂抬高，方差惩罚加重；(2) 拖 `b`——左臂抬高，偏差惩罚加重；(3) 拖 `s`——整条曲线连同谷底一起抬升：**无论怎么选复杂度，都压不过噪声地板**；(4) 找到谷底的横坐标，它就是"该用的复杂度"，而且随 `v`、`b` 的此消彼长左右移动。

### 实验 2（python）：蒙特卡洛拆解——亲手验证三方之和

```python title="两个学习器的偏差、方差、总误差实测"
import random
import statistics

sigma = 0.5            # 噪声标准差：真实规律 y = 2x + 噪声
x0 = 1.0               # 关心的测试点
f_x0 = 2.0             # 真值 f(1)

preds_a = []           # 均值器：无视 x，永远预测训练数据的 y 平均值
preds_b = []           # 邻居器：预测离 x0 最近的训练点的 y
errs_a = []
errs_b = []

for trial in range(3000):
    xs = []
    ys = []
    for k in range(5):
        xs.append(random.uniform(0.0, 1.0))            # uniform：区间内均匀取小数
        ys.append(2 * xs[k] + random.gauss(0, sigma))  # gauss：正态噪声样本

    mean_y = sum(ys) / len(ys)
    preds_a.append(mean_y)

    best_i = 0
    for i in range(1, 5):                              # 找离 x0 最近的训练点
        if abs(xs[i] - x0) < abs(xs[best_i] - x0):
            best_i = i
    preds_b.append(ys[best_i])

    y_fresh = f_x0 + random.gauss(0, sigma)            # 一条全新观测当考题
    errs_a.append((mean_y - y_fresh) ** 2)
    errs_b.append((ys[best_i] - y_fresh) ** 2)

for name, preds, errs in [("均值器", preds_a, errs_a), ("邻居器", preds_b, errs_b)]:
    center = statistics.mean(preds)
    bias_sq = (center - f_x0) ** 2                     # 偏差平方：平均预测偏离真值
    var = statistics.pvariance(preds)                  # pvariance：预测值的总体方差
    mse = statistics.mean(errs)                        # 实测总均方误差
    print(f"{name}  偏差平方={bias_sq:.3f}  方差={var:.3f}  总MSE={mse:.3f}")
```

典型输出：均值器偏差平方约 `1.0`、方差约 `0.1`；邻居器偏差平方不到 `0.15`、方差约 `0.3`；两者的总 MSE 都约等于自己两块之和再加 `0.25`——**噪声地板原形毕露**。均值器输在瞄歪（训练集全在 $[0,1]$，它的平均预测被拖到 $1.0$），邻居器输在手抖（噪声直通进预测）。

### 实验 3（python）：弹着点分布图

```python title="两支枪的弹着点：窄塔错位 vs 宽云围心"
import random
import matplotlib.pyplot as plt

preds_a = []
preds_b = []
for trial in range(1200):
    xs = [random.uniform(0.0, 1.0) for _ in range(5)]   # 列表推导式：一行造列表
    ys = [2 * x + random.gauss(0, 0.5) for x in xs]
    preds_a.append(sum(ys) / len(ys))
    nearest_i = 4                                       # 训练点都在 1 的左边，离 1 最近的必是最大者
    for k in range(5):
        if xs[k] > xs[nearest_i]:
            nearest_i = k
    preds_b.append(ys[nearest_i])

plt.hist(preds_a, bins=40, alpha=0.6, label="mean-predictor")   # alpha：透明度
plt.hist(preds_b, bins=40, alpha=0.6, label="nearest-neighbor")
plt.axvline(2, color="black", linestyle="--", label="truth")
plt.legend()
plt.xlabel("prediction at x0 = 1")
```

蓝色塔又窄又立在错误中心（高偏差低方差），橙色云又宽又围绕真值（低偏差高方差）——两张直方图就是"老张与小李"的弹孔墙。

### 快问快答

```quiz
把训练数据量扩大很多倍后，三项误差各自会怎么变？
- 三项都趋于零
- 偏差基本不动，方差会缩小，噪声地板原地不动 [*]
- 只有噪声会缩小
? 偏差由模型容量决定，跟数据多少无关；数据越多训练集之间越相似，方差缩小；噪声是世界自带的，谁来都不好使。
```

:::warning[常见误区]

**误区一**：你以为这里的方差是数据的方差。它度量的是**同一个学习流程在不同训练集上重训**时输出的波动，是"学习器的脾气"，不是某份数据内部的散布。

**误区二**：你以为低偏差就是好模型。偏差为零而方差爆炸的模型，总误差照样难看；评价永远看三方之和。

**误区三**：你以为换更强的模型能连噪声一起消灭。地板抬不走——试图用更复杂的模型去拟合噪声本身，只会推高方差，这就是过拟合成因的偏差方差版解释。

:::

## 6. 练习

**练习 1**：某个学习器在测试点上长期平均预测为 $3.5$，真值是 $2.0$，各次预测的标准差是 $2.0$，噪声方差是 $1.0$。补全三行输出：`2.25`、`4.0`、`7.25`：

```exercise
# @title: 练习：拼出误差分解
# @check: 2.25
# @check: 4.0
# @check: 7.25
# @hint: 偏差 = 平均预测 - 真值；方差 = 预测标准差的平方；总误差 = 偏差平方 + 方差 + 噪声方差
avg_pred = 3.5     # 该学习器的平均预测
truth = 2.0        # 测试点真值
pred_std = 2.0     # 各次预测的标准差
noise_var = 1.0    # 不可约噪声的方差

bias_sq = avg_pred - truth        # ← 有 bug：这是偏差本身，还要平方
print(bias_sq)

var_preds = pred_std              # ← 有 bug：方差是标准差的平方
print(var_preds)

total = 0                         # ← 占位：按公式把三块加起来
print(total)
```

**练习 2**：回到实验 1 的调参台。谷底的位置由偏差惩罚 `b` 和方差惩罚 `v` 共同决定：在滑块模型"总误差 = v·x² + b/x + s"里，谷底横坐标是 $(b/2v)^{1/3}$。不用跑程序，回答：(a) 拖哪个滑块能把谷底往右移？(b) 数据量大幅增加后，`v` 会变大还是变小，谷底往哪边走？

<details>
<summary>点开查看逐步解答</summary>

(a) 增大 `b`（或减小 `v`）：偏差惩罚变重时，需要更复杂的模型去压偏差，谷底右移——"宁可手抖也要瞄得正"。(b) 数据越多，不同训练集训出的模型越相似，方差项缩水，即 `v` **变小**；回看谷底公式 $(b/2v)^{1/3}$：分母里的 `v` 变小、比值变大，谷底和 (a) 里“减小 `v`”一样**右移**：**数据越充足，就越用得起更复杂的模型**——这与经典经验“数据越多越支持更复杂的模型”完全吻合。这条结论正是学习理论最实用的输出之一——下一课教你用一份真实数据把谷底实地找出来。
</details>

## 7. 选读：分解为什么成立

<details>
<summary>选读 · 加减一项平均预测</summary>

记 $\hat{f}=\hat{f}_D(x)$，$\bar{f}=\mathbb{E}_D[\hat{f}]$，$y=f+\varepsilon$ 且 $\varepsilon$ 与 $D$ 独立、均值为零。在 $(\hat{f}-y)^2$ 里加减 $\bar{f}$ 展开：

$(\hat{f}-y)^2 = (\hat{f}-\bar{f})^2 + (\bar{f}-f-\varepsilon)^2 + 2(\hat{f}-\bar{f})(\bar{f}-f-\varepsilon)$。

对 $D$ 取期望：第一项给出方差；第二项展开为 $(\bar{f}-f)^2 + \sigma^2$（交叉项因 $\mathbb{E}[\varepsilon]=0$ 消失）；第三项里 $\hat{f}-\bar{f}$ 的期望恰为零，整项归零。三块就此各就各位。整个推导只用了一件事：噪声独立于训练集且均值为零——这也是"分类问题的 0-1 损失没有如此干净的分解"的原因：那里没有可加减的中心化项让交叉项自动归零。

</details>

## 8. 下一站

理论说"谷底在某处"，可数据只给你一份——怎么实地找到该用的复杂度？答案是把考卷制度性地藏起来几份：交叉验证，机器学习工程师每天真正在用的仪式。

→ [交叉验证实战](./40-cross-validation.md)
