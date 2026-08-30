---
title: 第 45 章 · 机器学习数学
description: 用回归、逻辑回归、正则化、核方法和交叉验证建立监督学习的数学骨架。
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 4
---

# 机器学习数学

监督学习的核心是从数据中找一个能泛化的函数。本章把损失、参数、正则化和评估连起来，避免把模型当成黑盒咒语。

这一章按下面的路线图推进：

1. [损失函数与经验风险](./10-loss-function.md)——你造了个房价估价模型；
2. [线性回归：从数据到预测线](./20-linear-regression.md)——中介手里有一摞成交记录：面积和总价；
3. [逻辑回归与交叉熵](./30-logistic-regression.md)——广告系统要在 50 毫秒内决定给不给某位用户展示一条广告；
4. [过拟合、欠拟合与验证](./40-overfitting-validation.md)——你给 6 个历史成交点拟合房价曲线；
5. [数据、假设类与泛化目标](./50-data-hypothesis-generalization.md)——奶茶销量模型开进新城，第一周全线跑偏；
6. [L1、L2 正则化与稀疏性](./55-l1l2-regularization-sparsity.md)——评分卡只许带十二个字段上车；
7. [决策边界与概率校准](./65-calibration-decision-boundary.md)——同一天标红的两名患者，一位真高危、一位只是压线；
8. [决策树与集成：分段常数的投票](./70-decision-trees-ensembles.md)——先问哪个特征、在哪一刀，熵掉得最多就先切；十五棵树投票把方差踩平；
9. [核技巧与 SVM 大间隔](./75-kernel-svm-margin.md)——直尺怎么摆都切不开的同心圆戒指，站高一层就一刀两断；
10. [交叉验证与常见指标](./85-cross-validation-metrics.md)——同一批病历换个切法，成绩从 82% 掉到 71%。

## 前置回望

第 06 章的函数与图像变换给出"用曲线描述关系"的第一课；第 11 章的投影和基变换解释最小二乘；第 38 章的评估思想和第 43 章的优化器负责训练闭环。

## 计划交互形态

已落地（本章十课全覆盖）：

- 平方损失与绝对损失对照曲线——对大误差的态度差异（《损失函数与经验风险》，plot 组件）；
- 残差平方和驱动拟合线追向谷底（《线性回归：从数据到预测线》，least-squares-fit 组件）；
- sigmoid 参数实验——k 管陡峭、c 管中心（《逻辑回归与交叉熵》，plot 组件）；
- 容量扫描示意图——训练误差与验证误差分道扬镳（《过拟合、欠拟合与验证》，plot 组件）；梯度下降训练走浮窗 Python；
- 判题式练习与选择题全章覆盖；
- 经验风险波动带 + 固定种子重复抽样实验（《数据、假设类与泛化目标》）；
- L2 缩水对 L1 软阈值报价曲线、网格系数路径扫税率（《L1、L2 正则化与稀疏性》）；
- 行动门槛拖动实验、五档随访可靠性图（《决策边界与概率校准》）；
- 熵与基尼同框钟形曲线、阈值切分纯净度条形图、CART 一次分裂穷举与十五棵 bootstrap 树投票（《决策树与集成：分段常数的投票》，plot / datachart 组件 + 浮窗 Python）；
- 最宽走廊调宽实验、同心圆升维前后可分性对照、核函数对账练习（《核技巧与 SVM 大间隔》）；
- 不平衡准确率陷阱曲线、五折轮转训练评估流水线（《交叉验证与常见指标》）。

待实现：「损失曲面与决策边界联动」升级为专属组件继续排队——现阶段以 plot 组件与浮窗实验覆盖教学主线。

:::note[生产状态]

本章九门课已齐线：损失函数与经验风险、线性回归、逻辑回归与交叉熵、过拟合与验证、数据分布与泛化目标、L1/L2 正则化、决策边界与概率校准、核技巧与 SVM、交叉验证与常见指标全部上线，判题链与 viz/Python 实验均已实测。2026-08-28 又在 65 与 75 之间插入《决策树与集成：分段常数的投票》（编号 70，树模型与集成补线，CART 分裂与 bootstrap 投票判题链均已实测）。全章现共 10 门。

:::

## 实战挑战 · 房价预测第一课

真实场景：某二手房平台想用一个最简单的模型给房源估价（经典题型，数据为教学简化）。现有四条成交记录：

| 面积 $x$（平米） | 40 | 60 | 80 | 100 |
| --- | --- | --- | --- | --- |
| 总价 $y$（万元） | 190 | 270 | 350 | 430 |

模型取预测线 $\hat{y}=wx+b$。**(a)** 用首尾两点法求斜率 $w$ 与截距 $b$（$w=\dfrac{y_{末}-y_{首}}{x_{末}-x_{首}}$），并预测 90 平米房源的总价；**(b)** 最小二乘法用全部四个点，公式为

$$w=\frac{nS_{xy}-S_xS_y}{nS_{xx}-S_x^2},\qquad b=\frac{S_y-wS_x}{n}$$

其中 $n=4$，$S_x=280$，$S_y=1240$，$S_{xx}=21600$，$S_{xy}=94800$——算出的斜率会与 (a) 相同吗？**(c)** 一套 85 平米的房源挂牌 380 万，你的模型认为该挂多少？误差几万？

```exercise
# @title: 实战挑战：两条路求出同一条线
# @check: 4.0
# @check: 30.0
# @check: 390.0
# @check: True
# @check: 10.0
# @hint: (a) 斜率 = 总价差除以面积差；(b) 把五个统计量代进公式再和 w 比一比；(c) 差额取绝对值。
area = [40, 60, 80, 100]
price = [190, 270, 350, 430]

w = (price[3] - price[0]) / (area[3] - area[0])   # 首尾两点法求斜率，已示范
b = price[0] - w * area[0]
print(w)                     # (a)-1 截距前先看斜率
print(b)                     # (a)-2 截距
print(w * 90 + b)            # (a)-3 预测 90 平米总价

same = False                 # (b) 最小二乘算出的斜率等于 w 吗？改成比较表达式
print(same)

print(0)                     # (c) 挂牌价与本模型估价差额的绝对值（万元）
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** $w=(430-190)/(100-40)=240/60=4$；$b=190-4\times40=30$；预测 $\hat y(90)=4\times90+30=390$ 万元。

**(b)** 代入公式：分子 $4\times94800-280\times1240=379200-347200=32000$；分母 $4\times21600-280^2=86400-78400=8000$；$w=32000/8000=4$，$b=(1240-4\times280)/4=30$——**与首尾两点法完全一致**。原因：这批数据恰好严格落在直线 $y=4x+30$ 上，最小二乘自然精确还原它；真实房价数据带噪声时两条路就会分道扬镳，那时以最小二乘为准。

**(c)** 模型估价 $4\times85+30=370$ 万，挂牌 380 万，差额 $10$ 万。是模型错了还是卖家贪心了？仅凭四个点无法裁决——这正是第 40 课"验证集"要解决的问题。

```python
area = [40, 60, 80, 100]
price = [190, 270, 350, 430]

w = (price[3] - price[0]) / (area[3] - area[0])
b = price[0] - w * area[0]
print(w)
print(b)
print(w * 90 + b)

m_ls = (4 * 94800 - 280 * 1240) / (4 * 21600 - 280 * 280)
print(m_ls == w)

print(abs(380 - (w * 85 + b)))
```

</details>

相关课程：[线性回归：从数据到预测线](./20-linear-regression.md)（正规方程的完整推导）、[损失函数与经验风险](./10-loss-function.md)（为什么选平方账本）、[过拟合、欠拟合与验证](./40-overfitting-validation.md)（四个点够不够）。

## 实战挑战 · 医疗风险预警

真实场景：某社区医院做早期筛查。教学简化后，每位居民的风险分 $t$ 已由年龄、血压和检测指标压成一个数；随访诊断给出标签 $y=1$ 表示“确认需要干预”。同一结构也用于信贷风控——把症状换成还款特征、把确诊换成逾期即可。

| 风险分 $t$ | -3 | -1 | 0 | 1 | 2 |
| --- | --- | --- | --- | --- | --- |
| 确诊标签 $y$ | 0 | 1 | 0 | 0 | 1 |

预警模型用 $\hat y=\dfrac{1}{1+e^{-t}}$。**(a)** 算出 $t=-3,0,2$ 的概率并保留三位小数；**(b)** 阈值取 0.5 时，谁被预警？召回率是多少？**(c)** 若临床上不愿漏掉脆弱人群，把阈值降到 0.25，召回率恢复到多少？新增几例假警报？

```exercise
# @title: 实战挑战：阈值降低换回了什么
# @check: 0.047
# @check: 0.5
# @check: 0.881
# @check: 0.5
# @check: 2
# @hint: 先把风险分送进 sigmoid；召回率只看确诊者有没有被抓住；假警报是被预警但随访标签为 0 的人数。
import math

scores = [-3, -1, 0, 1, 2]
labels = [0, 1, 0, 0, 1]

def risk_prob(score):
    return score                        # ← 错了：裸分数不是概率，要过 sigmoid

def recall_at(cut):
    hits, misses = 0, 0
    for i in range(len(scores)):
        warned = risk_prob(scores[i]) >= cut
        if labels[i] == 1:
            if warned:
                hits += 1
            else:
                misses += 1
    return hits / (hits + misses)

def false_alarms_at(cut):
    count = 0
    for i in range(len(scores)):
        if labels[i] == 0 and risk_prob(scores[i]) >= cut:
            count += 1
    return count

print(round(risk_prob(-3), 3))
print(round(risk_prob(0), 3))
print(round(risk_prob(2), 3))
print(recall_at(0.5))
print(false_alarms_at(0.25))
```

<details>
<summary>点开查看逐步解答</summary>

三个哨兵概率分别是 $\sigma(-3)\approx0.047$、$\sigma(0)=0.500$、$\sigma(2)\approx0.881$（代码用 `round(p, 3)` 取三位小数，而 Python 打印时会省掉末尾的 0，所以中间这个在屏幕上显示为 `0.5`——数值是同一个）。阈值 0.5 只预警 $t=1,2$；两位确诊者中只有 $t=2$ 被抓住，召回率 $1/2=0.5$。阈值降到 0.25 后，$t=-1,0,1,2$ 都被预警，两位确诊者全部命中，但 $t=0,1$ 这两位未确诊者是假警报——召回率换到了 1.0，代价是 **2 例假警报**。医疗筛查和信贷风控都要在这个天平上公开说明选择。

```python
import math

scores = [-3, -1, 0, 1, 2]
labels = [0, 1, 0, 0, 1]

def risk_prob(score):
    return 1 / (1 + math.exp(-score))   # exp：以 e 为底的指数函数

def recall_at(cut):
    hits, misses = 0, 0
    for i in range(len(scores)):
        warned = risk_prob(scores[i]) >= cut
        if labels[i] == 1:
            if warned:
                hits += 1
            else:
                misses += 1
    return hits / (hits + misses)

def false_alarms_at(cut):
    count = 0
    for i in range(len(scores)):
        if labels[i] == 0 and risk_prob(scores[i]) >= cut:
            count += 1
    return count

print(round(risk_prob(-3), 3))
print(round(risk_prob(0), 3))
print(round(risk_prob(2), 3))
print(recall_at(0.5))
print(false_alarms_at(0.25))
```

</details>
