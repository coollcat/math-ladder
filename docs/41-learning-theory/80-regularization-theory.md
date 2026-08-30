---
title: 正则化的理论视角
lesson_id: learning-theory/regularization-theory
prereqs:
  - learning-theory/bias-variance
  - linalg-advanced/least-squares
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
  - l2-regularization
  - ridge-regression
  - shrinkage
  - soft-thresholding
applications:
  - machine-learning
exits:
  - data-ai
---

# 正则化的理论视角

## 1. 从一个场景开始

你只有 6 个观测点，却想拟合斜率。OLS（最小二乘）每次重抽数据给出的斜率忽大忽小——单样本里一条离群点就能把直线拽得翘上天。老工程师拍板："给斜率上一根橡皮筋：它想跑多远，就先付多少罚金。"这根橡皮筋就是**正则化**。

在偏差方差那一课我们拆出了总误差的三块拼图；正则化是第一件被理论彻底驯服的旋钮：**主动往偏差里存钱，换取方差的大额返现**。本课以最经典的一维岭回归为手术台，把这台天平的每个刻度都读给你看。

## 2. 直觉解释

普通最小二乘只认一件事：训练误差越小越好。它对"系数多大"毫无戒心，于是数据的噪声全数转嫁给参数的颠簸。正则化的想法朴素到一句话：

> **评分时不再只看拟合误差，还要为"权重太大"额外扣分。**

扣分规则不同，性格迥异：

- **L2 罚（平方惩罚 $\lambda w^2$）**：弹簧式拉伸，阻力与距离成正比。每个权重都被均匀地往零拖，但永远拖不到零——温和派。
- **L1 罚（绝对值惩罚 $\lambda|w|$）**：过路费制，短途免费（小系数直接清零），长途按里程收费——剪刀手，产出稀疏解。

本课的主角是 L2。它的三个身份值得先混个脸熟：(1) **收缩器**——把估计值朝原点方向压；(2) **减震器**——数据抖动经过"求和再除"的流水线时被罚项缓冲；(3) **容量旋钮**——$\lambda$ 越大，有效模型空间越小，正如上一课把假设类管得越紧，保险费越便宜。

## 3. 正式定义

一维线性模型 $y = wx + \varepsilon$、$n$ 个观测，$\mathrm{S}_{xx}=\sum_i x_i^2$、$\mathrm{S}_{xy}=\sum_i x_i y_i$。岭回归在经验风险上附加权重的平方罚：

$$\hat w_\lambda \;=\; \arg\min_w \;\sum_{i=1}^{n}\big(y_i-wx_i\big)^2\;+\;\lambda\,w^2$$

对 $w$ 求导令其为零，闭式解一目了然：

$$\hat w_\lambda \;=\; \frac{\mathrm{S}_{xy}}{\mathrm{S}_{xx}+\lambda}$$

| 符号 | 名字 | 解读 |
| --- | --- | --- |
| $\lambda$ | 正则强度 | 橡皮筋刚度；$\lambda=0$ 退回 OLS，$\lambda\to\infty$ 斜率被拖向零但不精确为零 |
| $\mathrm{S}_{xx}$ | 数据杠杆量 | 它设定了 $\lambda$ 的天然单位——罚多大算"狠"，由数据自己说了算 |
| $\hat w_0$ | OLS 解 | 无罚时的裸奔估计 |

对照一下 L1 的软阈值算子（下一节练习登场）：$\hat w^{\text{L1}} = \mathrm{sgn}(r)\cdot\max(|r|-\lambda,\,0)$ ——先把 $\lambda$ 从幅度里削掉，剩下的部分连符号一起归还；不够削就干脆归零。这就是"剪刀手"的机械化成因。

## 4. 分步例题

某支实验记录了 $n=8$ 次"温度—发泡率"测试，汇总出 $\mathrm{S}_{xx}=10$、$\mathrm{S}_{xy}=21$（真斜率约 2）。

1. 不设防（$\lambda=0$）：$\hat w=21/10=2.1$——基本命中；
2. 温柔约束（$\lambda=30$）：$\hat w=21/40=0.53$——被拉低近四分之三，数据量太少时这是保命的折衷；
3. 重手（$\lambda=150$）：$\hat w=21/160=0.13$——几乎躺平，只剩噪声平均的水平。

三步看懂 $\lambda$ 的语义：它不是"误差调节器"，而是**在分子固定的情况下改变分母贴现率**。$\lambda$ 每增加一个 $\mathrm{S}_{xx}$，斜率就被腰斩一次（第 2 步的分母恰好翻了四倍）。选多大的 $\lambda$？答案藏在下一节的实测账本里。

## 5. 动手实验

### 实验 1（viz）：收缩曲线与它的天然标尺

```viz
{
  "type": "plot",
  "title": "斜率收缩 w(lam) = S_xy / (S_xx + lam)",
  "expr": "c/(d+x)",
  "xmin": 0,
  "xmax": 120,
  "sliders": [
    { "name": "c", "min": 5, "max": 30, "step": 0.5, "value": 21 },
    { "name": "d", "min": 2, "max": 20, "step": 0.5, "value": 10 }
  ]
}
```

横轴是 $\lambda$，纵轴是岭回归斜率，双曲 shape 永不变但位置随数据迁徙。任务卡：(1) 读出 $\lambda=0$ 处的起点（即 OLS 值）；(2) 求证曲线"减半点"恰在 $\lambda=\mathrm{S}_{xx}$ 处——拖动滑块 `d` 验证；(3) 把 `c` 翻倍再看整条曲线等比放大：**强度 $\lambda$ 与数据杠杆 $\mathrm{S}_{xx}$ 必须同尺度比较**，脱离单位谈"我用了 λ=100"毫无意义。

### 实验 2（python）：偏差买方、方差卖方的现场清算

真实规律仍是斜率 2 加高斯噪声；仅 6 个样本的小数据下，三种 $\lambda$ 各自重训 400 回合，在预测点 $x_0=2$ 上全面盘账：

```python title="不同 λ 下：斜率均值、波动、偏差平方、方差与总代价"
import random       # random：伪随机数（此前课程已介绍）
import statistics   # statistics：均值与两种方差函数

SIGMA = 0.6         # 噪声标准差：世界自带的抖动
X0B = 2.0           # 关心的预测点
REPSB = 400         # 重训回合数：抹掉单次运气

for lam_tag, lam in [("lam=0", 0.0), ("lam=1", 1.0), ("lam=4", 4.0)]:
    rng = random.Random(23)          # 固定种子：三档共享同样的数据历史，公平比较
    slopes_b = []
    preds_b = []
    for r in range(REPSB):
        sx = []
        sy = []
        for _ in range(6):           # 每次 6 个样本：小数据才需要保险
            xv = rng.uniform(0.0, 1.0)
            sx.append(xv)
            sy.append(2.0 * xv + rng.gauss(0, SIGMA))
        sxx = sum(v * v for v in sx)
        sxy = sum(sx[i] * sy[i] for i in range(6))
        w = sxy / (sxx + lam)        # 一维岭回归闭式解
        slopes_b.append(w)
        preds_b.append(w * X0B)
    msb = statistics.mean(slopes_b)
    sdb = statistics.pstdev(slopes_b)          # pstdev：斜率的总体标准差
    bsb = (msb - 2.0) ** 2                     # 偏差平方：平均斜率偏离真相
    vrb = statistics.pvariance(preds_b)        # pvariance：预测值的总体方差
    totb = bsb + vrb + SIGMA ** 2              # 总代价 = 偏差平方 + 方差 + 噪声地板
    print(f"{lam_tag}: slope_mean={msb:.2f} slope_std={sdb:.2f} "
          f"bias_sq={bsb:.3f} var={vrb:.2f} total={totb:.2f}")
```

典型输出：

| 档位 | slope_mean | slope_std | bias² | 方差 | 总代价 |
| --- | --- | --- | --- | --- | --- |
| λ=0 | 1.99 | 0.48 | 0.000 | 0.93 | 1.29 |
| λ=1 | 1.27 | 0.35 | 0.526 | 0.50 | 1.39 |
| λ=4 | 0.63 | 0.22 | 1.865 | 0.20 | 2.42 |

细品这张表：从 λ=0 到 λ=4，方差掉了 78%，偏差平方付出近两块的代价——本例中**橡胶绳太紧，得不偿失**；而在别的小样本场景（把样本数调到 4 试试），同一组 λ 的排序会反转。没有免费的午餐，只有因地制宜的天平。

### 快问快答

```quiz
把 λ 推向无穷大，L2 岭回归的斜率会怎样？
- 先被拉得越来越小，最终趋近于零但一般不完全等于零 [*]
- 会精确卡死在零并保持稀疏
- 会收敛到真实的斜率
? 闭式解 w = S_xy/(S_xx+λ) 的分母增速远快于分子，斜率像欠债还息一样渐进归零，只是除法永远是"逼近"而非"清零"。能制造精确零的是 L1 罚的软阈值机制——不够削的部分直接出局。
```

:::warning[常见误区]

**误区一**：你以为 λ 是越大越稳的好东西。总代价三项之和才是判据：本实验 λ=4 时方差确实降到地板价，但偏差罚单超过收益，总分反而垫底。正则强度永远要与数据杠杆 $\mathrm{S}_{xx}$ 和噪声水平一起谈。

**误区二**：你以为正则化是"去噪滤镜"。噪声地板 $\sigma^2$ 三项里纹丝不动——任何正则都动不了它；它管理的只是你对真值的判断质量（偏差）与你继承抖动的程度（方差）。

**误区三**：你以为 L2 也能剪枝。均匀收缩的所有人都不清零，产出稠密解；想要稀疏性请找 L1 或其他结构化罚。两者经常被混为一谈，效果却南辕北辙。

:::

## 6. 练习

**练习**：诊断报表交来三份残差与对应罚强 $(r,\lambda)$：$(5,2)$、$(-4,2)$、$(1,4)$。按 L1 软阈值规则修正它们：保留符号、幅度扣除 $\lambda$、不够扣则记零。

```exercise
# @title: 练习：L1 软阈值的三道关
# @check: 3
# @check: -2
# @check: 0
# @hint: 口诀 sgn(r) × max(|r| − λ, 0)：abs 取幅度、max 兜底归零，再把符号接回去
resid_list = [(5, 2), (-4, 2), (1, 4)]     # (残差 r, 罚强 λ)

def soft_threshold(r, lam):
    mag = abs(r) - lam                      # 第一关：扣钱（这一步没错）
    return mag                              # ← 有 bug：正负号丢了，且负幅度没归零

for r_val, lam_val in resid_list:
    print(soft_threshold(r_val, lam_val))   # max 与 abs 都是早已登记的老朋友
```

<details>
<summary>点开查看逐步解答</summary>

$(5,2)$：幅度 $5-2=3>0$，带正号得 **3**；

$(-4,2)$：幅度 $4-2=2>0$，符号为负得 **-2**——初版代码会把符号吞成 +2；

$(1,4)$：幅度 $1-4=-3\le0$，触发兜底归零得 **0**——初版代码会输出 -3 这种荒谬的"倒扣"。三行输出正是 L1 剪刀手的完整工作流：扣钱、还符号、不够就失业归零。与 L2 对比记忆：L2 处处留情不清零，L1 手起刀落产稀疏。

</details>

## 7. 选读：那笔交易为何划算

<details>
<summary>选读 · 一维岭回归的偏差方差清单</summary>

设真斜率为 $w^\*$，噪声方差 $\sigma^2$，各 $x_i$ 视为固定设计。由闭式解与 $\mathrm{S}_{xy}=w^\*\mathrm{S}_{xx}+\sum x_i\varepsilon_i$：估计量的期望为 $w^\*\cdot\dfrac{\mathrm{S}_{xx}}{\mathrm{S}_{xx}+\lambda}$——系统性地偏向零，偏差平方为 $\left(\dfrac{\lambda}{\mathrm{S}_{xx}+\lambda}\right)^2 w^{*\,2}$；而噪声项 $\sum x_i\varepsilon_i$ 经同样分母缩放后，方差为 $\sigma^2\dfrac{\mathrm{S}_{xx}}{(\mathrm{S}_{xx}+\lambda)^2}$。两个表达式同一个源：分母 $\mathrm{S}_{xx}+\lambda$ 同时出现在"牵引真值"与"压制噪声"两处，所以每收一分方差必付一份偏差——这不是实现细节的缺陷，而是罚项几何结构的宿命。二维以上的世界唯一的本质变化是：当数据在特征空间里呈细长分布时，长轴方向的系数几乎无可奈何（方差爆炸源），短轴方向固若金汤；岭回归仍均匀施力，真正的"选择性加固"要等隐式正则与神经切线核的故事开口。

</details>

## 8. 下一站

到目前为止的故事有个共同前提：复杂度升上去就要付方差的税，谷底之外皆是深渊。可深度学习端上来的成绩单公然违约——参数远超样本的网络照样泛化，测试误差越过插值门槛后不升反降。地图之外的疆域叫双下降。

→ [双下降：现代过参数化的意外曲线](./85-double-descent.md)
