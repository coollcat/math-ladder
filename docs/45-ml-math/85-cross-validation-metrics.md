---
title: 交叉验证与常见指标
lesson_id: ml-math/cross-validation-metrics
prereqs:
  - ml-math/overfitting
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cross-validation
  - confusion-matrix
  - precision-recall-f1
applications:
  - churn-prediction-reporting
  - screening-tool-audit
exits:
  - data-ai
---

# 交叉验证与常见指标

## 1. 从一个场景开始

病历只有 40 份，模型调参已经花掉一半住院医的耐心。第一次切分：验证准确率 $82\%$；换个随机种子重切：$71\%$。哪个数字该写进报告？都说"数据贵如金"，可单刀切分法把三成数据整段供起来只当裁判，用一次就退场——**贵的资产没有盘活**。

这一课补上评估的收官两件套：把数据轮转使用的**交叉验证**，和比单一准确率诚实得多的**混淆矩阵家族指标**。

## 2. 直觉解释

交叉验证的玩法像"全班轮流监考自己人"：把数据切成 $k$ 份，每轮让其中一份扮演考卷、其余 $k-1$ 份当课本；每份数据都会被考到恰好一次，$k$ 次成绩合起来既是均值也是波动范围——均值当点估计，最差折当下限保险。第 41 章从抽样角度讲过它的动机，本章负责把它拧进你的工作流：**在单次留出不可信、测试集舍不得花的尴尬地带，k 折是最划算的中庸**。

指标这边先拆穿一个惯犯。某病房确诊率只有 $3\%$，一个什么都不学的模型闭眼回答"全部健康"，准确率高达 $97\%$——**类别不平衡时，准确率是会被收买的**。真正要盯的是四个象限的账本（混淆矩阵）：真阳性、假警报、漏报与真阴性各占多少，再按问题性质挑指标：漏不起的看召回，烦不起假警报的看精确率，两头都要交代就用两者的调和平均 F1。

## 3. 正式定义

**k 折交叉验证**：将样本随机均分 $\mathcal{D}_1,\dots,\mathcal{D}_k$，第 $j$ 轮以 $\bigcup_{i\ne j}\mathcal{D}_i$ 训练、$\mathcal{D}_j$ 评估：

$$\mathrm{CV}_k=\frac{1}{k}\sum_{j=1}^{k}E_{val}^{(j)}$$

**混淆矩阵与指标**（正类="事件发生"）：

| 名称 | 公式 | 回答的问题 |
| --- | --- | --- |
| 精确率 $P$ | $\dfrac{TP}{TP+FP}$ | 报出来的警里有多少是真火 |
| 召回率 $R$ | $\dfrac{TP}{TP+FN}$ | 真火里有多少被喊了出来 |
| $F_1$ | $\dfrac{2PR}{P+R}$ | 两者的调和平均：谁掉链子都拉低总分 |
| 准确率 | $\dfrac{TP+TN}{TP+FP+FN+TN}$ | 全体判对的比例（不平衡时失真） |

注意 $F_1$ 为什么不用算术平均：一个 $P=0.99,R=0.01$ 的"哑炮模型"算术平均还有 0.5 的体面，调和平均直坠 0.02——**调和平均不许短板隐身**。

## 4. 分步例题

**例**：某折上模型的诊断账本为 $TP=12,\ FP=9,\ FN=4,\ TN=25$。

1. 准确率 $(12+25)/50=0.74$——看着还行；
2. 精确率 $12/(12+9)\approx0.571$：报警的人里四成多是狼来了；
3. 召回率 $12/(12+4)=0.75$：真患者里四分之一被漏掉了；
4. $F_1=2\times0.571\times0.75/(0.571+0.75)\approx0.649$；
5. 对照算术平均 $(0.571+0.75)/2=0.661$：温和多了。给院长汇报时选哪个数？取决于他怕漏诊还是怕过度检查——**指标的挑选本身就是决策的一部分**。

## 5. 动手实验

### 实验 1：不平衡世界里的准确率陷阱

横轴 $x$ 是少数派（真患者）占比，蓝线是无脑全猜"健康"者的准确率（恒等于多数派占比），橙线是一个真干事模型的准确率（可调精确率损耗 $fp$ 与召回率 $r$）。

```viz
{
  "type": "plot",
  "title": "谁在骗你：全猜多数派 vs 真模型的准确率",
  "expr": "1-x",
  "expr2": "(1-fp)*(1-x)+r*x",
  "label": "always-negative",
  "label2": "real model",
  "xmin": 0,
  "xmax": 0.3,
  "sliders": [
    { "name": "fp", "min": 0.02, "max": 0.2, "step": 0.01, "value": 0.08 },
    { "name": "r", "min": 0.5, "max": 1, "step": 0.05, "value": 0.85 }
  ]
}
```

交点在 $x^\ast=\dfrac{fp}{r+fp}$ 处：左边（样本更稀少时）无脑模型反而赢——准确率对它放行；右边真模型才翻身。拖动滑块体会：模型越差（$fp$ 越大），被收买的区间越宽。交叉验证选型之前，先确认评测指标没在这个斜坡上翻车。

### 实验 2：五折轮转，亲手拧一遍 CV

```python title="五折交叉验证：每折训练-评估一条龙"
import random

random.seed(9)                   # 固定洗牌种子，结果可复现

scores = [2.8, -2.6, 1.6, -1.7, -0.4, -0.9, 0.9, -2.2, 3.1, 0.4,
          0.2, 0.1, 1.9, -0.5, 2.4, -1.1, -1.2, 1.2, 1.5, 2.0,
          0.7, -0.15, -3.0, 2.6, -0.3]
labels = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
          1, 0, 1, 0, 1, 0, 1, 1, 0, 1,
          0, 0, 0, 1, 0]

idx = list(range(len(labels)))   # 先整体洗牌，再等分成五段
random.shuffle(idx)              # shuffle：原地打乱次序

def safe_div(a, b):
    return a / b if b else 0.0   # 分母为零时记 0，防止除零崩溃

def f1_at(cut, rows):            # 给定阈值，在一批样本上算 F1
    tp = sum(1 for s, lb in rows if s >= cut and lb == 1)
    fp = sum(1 for s, lb in rows if s >= cut and lb == 0)
    fn = sum(1 for s, lb in rows if s < cut and lb == 1)
    p, r = safe_div(tp, tp + fp), safe_div(tp, tp + fn)
    return safe_div(2 * p * r, p + r)

rows_all = sorted(zip(scores, labels), key=lambda kv: kv[0])   # 按分数排好，阈值取相邻中点
cuts = [(rows_all[i][0] + rows_all[i + 1][0]) / 2 for i in range(len(rows_all) - 1)]

folds = [idx[j:j + 5] for j in range(0, len(idx), 5)]          # 五折，每折 5 人
accs, f1s = [], []
for j, fold in enumerate(folds):
    train = [(scores[i], labels[i]) for i in idx if i not in fold]
    valid = [(scores[i], labels[i]) for i in fold]
    best_cut = max(cuts, key=lambda c: f1_at(c, train))         # 只用训练折挑阈值
    tp = sum(1 for s, lb in valid if s >= best_cut and lb == 1)
    fp = sum(1 for s, lb in valid if s >= best_cut and lb == 0)
    fn = sum(1 for s, lb in valid if s < best_cut and lb == 1)
    tn = len(valid) - tp - fp - fn
    acc = safe_div(tp + tn, len(valid))
    prec, rec = safe_div(tp, tp + fp), safe_div(tp, tp + fn)
    f1 = safe_div(2 * prec * rec, prec + rec)
    accs.append(acc); f1s.append(f1)
    print(f"fold{j}: cut={best_cut:+.2f} acc={acc:.2f} P={prec:.2f} R={rec:.2f} F1={f1:.2f}")

print(f"mean: acc={sum(accs)/5:.3f} F1={sum(f1s)/5:.3f}")
print(f"worst-fold F1={min(f1s):.3f}")
```

读表三步走：均值告诉你模型的一般水平；逐折波动提醒你单次留出有多碰运气（第 1 段场景里那对 82% 与 71% 就是这么来的）；最差折则是写给保守派的承诺书。另有一个细节值得咀嚼——阈值只许看训练折，若它偷看过验证折，五折会一致地漂亮给你看（泄漏，见下方误区卡）。

### 快问快答

```quiz
为什么全量标准化后再做交叉验证属于作弊？
- 标准化消耗太多计算资源
- 统计量的均值方差把验证折的信息泄进了训练流程 [*]
- 标准化后数值更大
? 每一折只能用"自己课本"上的统计量装配流水线，否则考卷内容提前进场，CV 成绩系统性虚高。
```

:::warning[常见误区]

**误区一**："重复跑很多次随机划分，取最好那次。" 选择本身就是过拟合于评估集：报告里应给出 CV 均值加波动范围，而不是狩猎成绩的最高温。

**误区二**："有了 F1 就不必再看混淆矩阵。" F1 是浓缩果汁——好喝但看不见果肉。给临床或风控的正式汇报永远附四象限原始计数，让读者自行加权。

**误区三**："测试集只能用一次太浪费。" 它的价值恰恰来自洁身自好：CV 用于反复比较候选，最终一次性动用的测试集才是整条流水线的终审法院。把它磨成日常报表之日，就是重新攒数据之时。

:::

## 6. 练习

**练习 1**（概念）：把第 4 步例题里的 $FN$ 从 4 改成 8（其他不变），三个指标谁动得最多？口述业务含义。

<details>
<summary>点开查看逐步解答</summary>

召回率跌向 $12/20=0.60$，F1 相随下探约 0.58，精确率纹丝不动（它根本看不见 FN 这一格）。业务含义：漏掉的病人多了，但已发出的警报纯度未变——若这条折来自癌症筛查，这是不能签字的成绩单。</details>

**练习 2**（判题）：初始代码把召回率的分子安到了精确率头上，还把 F1 写成了算术平均。请修好这个刚出锅的报告：

```exercise
# @title: 练习：把这份成绩单改正确
# @check: 0.571
# @check: 0.75
# @check: 0.649
# @check: True
# @hint: 精确率分母是 TP+FP、召回率分母是 TP+FN；F1 是调和平均 2*P*R/(P+R)。
tp, fp, fn, tn = 12, 9, 4, 25

precision = tp / (tp + fn)              # ← 错了：这其实是召回率的位置
recall = tp / (tp + fn)

f1 = (precision + recall) / 2           # ← 错了：短板能隐身的算术平均

acc = (tp + tn) / (tp + fp + fn + tn)

print(round(precision, 3))
print(round(recall, 3))
print(round(f1, 3))
print(f1 < (precision + recall) / 2)
```

修好后四行输出 `0.571`、`0.75`、`0.649` 和 `True`——最后一行顺带钉死本课梗概：真正的 F1 永远不超过自己的算术平均。

**练习 3**：实验 2 中把 `random.seed(9)` 连改成三个别的整数重跑。均值与最差折怎么变？如果有人坚持把最好种子的那组数字写进报告，你引用哪节内容反驳？

<details>
<summary>点开查看逐步解答</summary>

均值会在几个百分点内晃动、最差折的起伏最明显——这正是抽样噪声的呼吸节奏，与第 50 课实验 2 的波动带同一源头。反驳依据是本课误区一的逻辑：挑最好种子的行为本身就是在评估集上做选择，等于让审卷老师参赌。</details>

## 7. 选读：分层抽签与留一法的分寸

<details>
<summary>选读 · k 与分层</summary>

类比例悬殊时，纯随机分段可能让某折一张正类票都没有——那一折的召回率直接成了无意义的除零。工程答案叫**分层 k 折**：分段前按类别配额分配，保证每折的构成比例贴近全局。至于 k 的取值：k 越大单折训练集越满（偏差小）但折间相关越高、成本越大；留一法（k=n）把偏差做到极小却以高方差慢速度著称。没有免费午餐，只有与数据规模匹配的分寸。</details>

## 8. 下一站

零件到齐、纪律立规矩、考卷也封存了——现在值得回头再看一眼起点：把这些散件装回监督学习的形式化框架里，你会认出当年那间教室每一扇门。

→ [学习问题的形式化：经验风险最小化](../41-learning-theory/10-erm-formalize.md)
