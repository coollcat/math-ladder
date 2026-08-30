---
title: 决策树与集成：分段常数的投票
lesson_id: ml-math/decision-trees-ensembles
prereqs:
  - ml-math/overfitting
  - information/entropy
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
  - decision-tree
  - information-gain
  - gini-impurity
  - bagging
  - boosting
applications:
  - tabular-risk-scoring
  - medical-triage
exits:
  - data-ai
---

# 决策树与集成：分段常数的投票

## 1. 从一个场景开始

老瓜农挑瓜从不称重计算，而是问一串是非题：敲声浊响吗？→ 花纹开了吗？→ 蒂部枯萎吗？——三五个问题答完，手起刀落。每个问题把西瓜劈成两堆，好问题能让一堆里全是好瓜、另一堆全是生瓜。

这棵"问题树"就是决策树：本章前九课的模型都在画线、找平面，它换了个思路——**不画线，改问是非题**，把特征空间切成一小块一小块的常数格子。新问题立刻冒出来：先问哪个、在哪切、切几刀？第 40 章的熵早备好了尺子。

## 2. 直觉解释

决策树的每一刀都有两个讲究：

- **轴对齐**：每刀只平行于某一个坐标轴——"密度大于 0.55 吗"只问一个特征。许多把直尺切不开的斜向边界（第 75 课的戒指问题），树用几百根横平竖直的小刀阶梯式逼近；
- **挑最好的刀**：切之前，父节点里好瓜坏瓜混作一团；切完之后，两堆各自"更纯"才算好刀。**纯度**用熵量：一堆全是同类，熵为 0；五五开，熵最大。切刀带来的熵下降叫**信息增益**——增益最大的那一刀先切。

一刀切完在子节点里继续问、继续切，直到每块叶子足够纯。但你已经能闻到第 40 课过拟合的味道：切到每片叶子只剩一个瓜，等于把训练集背了下来。所以树必须"见好就收"——**剪枝**（限深、限叶或长完再回删）就是树模型的正则化。

## 3. 正式定义

数据集 $D$ 中正类占比为 $q$。两种纯度度量与切分准则：

$$H(q)=-q\log_2 q-(1-q)\log_2(1-q)\qquad \text{Gini}(q)=1-q^2-(1-q)^2$$

$$\text{增益}(D,\text{特征})=H(D)-\sum_{v}\frac{|D_v|}{|D|}\,H(D_v)$$

| 名称 | 含义 |
| --- | --- |
| $D_v$ | 按特征取值 $v$ 切出的子节点（轴对齐的每一刀） |
| 信息增益 | 父节点熵减去子节点加权熵：这一刀问出了多少比特 |
| 基尼不纯度 | 随机抽两个样本异类的概率；增益的免对数平替，CART 算法默认用它 |
| 剪枝 | 限制树深 / 叶样本数 / 长完后回删，把"背题"改成"学方法" |

两大集成流派（让很多棵树一起上）：

| | bagging（自举聚合） | boosting（提升） |
| --- | --- | --- |
| 做法 | 有放回抽样本，训练多棵**独立**的树，投票表决 | 串行训练：每棵新树专修上一棵的错处 |
| 治什么病 | 方差（单棵树易被样本抖动带偏） | 偏差（单棵树欠拟合的系统性错法） |
| 代表 | 随机森林 | GBDT、XGBoost |

## 4. 分步例题

**例**：十个瓜（六好四坏），比一比两个特征谁的刀更好。

1. **父节点熵**：$H(0.6)=-0.6\log_2 0.6-0.4\log_2 0.4\approx 0.971$ 比特——接近五五开的上限，够浑浊；
2. **特征甲「敲声」**：浊响 6 个（五好一坏），清脆 4 个（一好三坏）。子节点熵各为 $H(5/6)\approx0.650$ 与 $H(1/4)\approx0.811$；
3. **加权**：$0.6\times0.650+0.4\times0.811\approx0.715$，增益 $=0.971-0.715=\mathbf{0.256}$ 比特——一刀问出四分之一个比特；
4. **特征乙「触感」**：硬滑 5 个、软粘 5 个，但两堆都是三好二坏，各占 $H(0.6)=0.971$——加权熵纹丝不动，增益恰为 $\mathbf{0}$：这个问题问得再多也分不出好坏瓜；
5. **换基尼尺**：父 $=1-0.36-0.16=0.48$，甲切后加权 $0.6\times(1-\tfrac{25}{36}-\tfrac{1}{36})+0.4\times(1-\tfrac{1}{16}-\tfrac{9}{16})\approx0.317$，降幅 $0.163$——**与熵同判**（甲仍胜出）。基尼免掉对数、只算平方，这就是 CART 偏爱它的原因：同一次裁决，账更便宜。

## 5. 动手实验

### 实验 1：熵与基尼是同一口钟

蓝线是二分类熵 $H(x)$，橙线是放大两倍的基尼 $4x(1-x)$（放大只为同框比形状）：都在对齐五五开处封顶、两端归零——**越混浊越高**是共同的世界观。

```viz
{
  "type": "plot",
  "title": "熵（蓝）与两倍基尼（橙）：同一口钟",
  "expr": "-(x*log(x)+(1-x)*log(1-x))",
  "expr2": "4*x*(1-x)",
  "label": "entropy",
  "label2": "gini x 2",
  "xmin": 0.01,
  "xmax": 0.99
}
```

### 实验 2：手写 CART 一次分裂

八条记录、两个特征、标签一列。穷举每个特征的所有相邻阈值（取中点），基尼最低的那一刀胜出：

```python title="穷举阈值，让加权基尼最低的那刀胜出"
def gini(pos, total):                        # 基尼不纯度：随机抽两个异类的概率
    if total == 0:
        return 0.0
    q = pos / total
    return 1 - q * q - (1 - q) * (1 - q)

data = [                                     # 每行 [特征甲, 特征乙, 标签(1=好瓜)]
    [1, 5, 0], [1, 3, 0], [2, 6, 0], [2, 2, 0],
    [4, 4, 1], [4, 1, 1], [5, 3, 1], [5, 5, 1],
]
n = len(data)
base = gini(sum(row[2] for row in data), n)  # 父节点基尼
print("父节点基尼:", round(base, 4))

best_feat, best_thr, best_score = None, None, None
for f in range(2):                           # 逐个特征试刀
    vals = sorted(set(row[f] for row in data))   # set 去重再排序，得候选切点
    for i in range(len(vals) - 1):
        thr = (vals[i] + vals[i + 1]) / 2    # 相邻取值的中点作阈值
        left = [r for r in data if r[f] <= thr]
        right = [r for r in data if r[f] > thr]
        score = (len(left) * gini(sum(r[2] for r in left), len(left))
                 + len(right) * gini(sum(r[2] for r in right), len(right))) / n
        if best_score is None or score < best_score:
            best_feat, best_thr, best_score = f, thr, score
print("最优刀: 特征", best_feat, "阈值", best_thr, "加权基尼", round(best_score, 4))
```

胜者是特征甲在阈值 $3$ 的一刀：左边四条全是 $0$、右边四条全是 $1$——两个子节点基尼双双归零，一刀切出两片纯叶子。切开的纯净度一眼可见：

```viz
{
  "type": "datachart",
  "title": "阈值 3 一刀切开后：两片叶子各自纯净",
  "labels": ["左叶 好瓜", "左叶 坏瓜", "右叶 好瓜", "右叶 坏瓜"],
  "values": [0, 4, 4, 0]
}
```

### 实验 3：十五棵树投票——方差被踩平

同一批 12 个点（$x\ge 6$ 判 1，$x=8$ 故意标错当噪声）。单棵 stump（只切一刀的树）被 bootstrap 重抽样牵着鼻子走；十五棵投票后呢？

```python title="bagging 投票：单棵乱跳，人海稳住"
import random                                # 随机库（42 章出生）

random.seed(7)                               # 固定种子保证可复现
pts = [[i, 1 if (i >= 6 and i != 8) else 0] for i in range(12)]

def fit_stump(rows):                         # 在给定样本上挑基尼最低的一刀
    best_thr, best_w = None, None
    total = len(rows)
    for i in range(11):
        thr = i + 0.5
        left = [r for r in rows if r[0] <= thr]
        right = [r for r in rows if r[0] > thr]
        if not left or not right:            # 一侧空了这刀作废
            continue
        w = (len(left) * gini(sum(r[1] for r in left), len(left))
             + len(right) * gini(sum(r[1] for r in right), len(right))) / total
        if best_w is None or w < best_w:
            best_thr, best_w = thr, w
    return best_thr

B = 15                                       # 树的数量
stumps, single_err = [], []
for b in range(B):
    bag = []
    for i in range(12):
        bag.append(pts[random.choice(range(12))])   # 有放回抽 12 条=bootstrap
    thr = fit_stump(bag)
    stumps.append(thr)
    err = sum(1 for xx, yy in pts if (1 if xx > thr else 0) != yy)
    single_err.append(err / 12)
vote_err = 0
for xx, yy in pts:                           # 逐点开票：过半数树说 1 才判 1
    votes = sum(1 for thr in stumps if xx > thr)
    if (1 if votes > B / 2 else 0) != yy:
        vote_err += 1
print("十五刀:", stumps)
print("单棵错误率 最好:", round(min(single_err), 4), "平均:",
      round(sum(single_err) / B, 4), "最差:", round(max(single_err), 4))
print("投票错误率:", vote_err / 12)
```

战报：单棵错误率在 $0.083$ 到 $0.25$ 之间乱跳（平均 $0.139$）——bootstrap 里哪条噪声被抽得凶，刀口就被带到哪；十五棵投票后稳定在 $\mathbf{0.0833}$，**追平最好的单棵**。剩下的那一个错误恰是 $x=8$ 的噪声点：模型已把规律学满，误差只剩数据本身的病，投票治不了偏差。这正是随机森林"人多且各拿各的数据"的方差魔法。

### 快问快答

```quiz
bagging 里每棵树为什么必须先做有放回的重抽样？
- 为了让数据变多
- 让各棵树见到略不同的样本，彼此的错法互相抵消 [*]
- 为了加快训练速度
? 全体树看同一份样本会犯同样的错，投票毫无增益；重抽样制造独立性，方差才能被平均掉。
```

::::warning[常见误区]

**误区一**："树切得越纯越好。" 切到每片叶子只剩一个样本，训练误差为零、验证误差起飞——第 40 课的过拟合在树模型里以"过深"的形态复发。深度、叶样本量与剪枝才是树的容量旋钮。

**误区二**："基尼和熵会选出不同的刀。" 二分类下两者形状几乎重合（实验 1 的同一口钟），实际分裂几乎同判；差别在计算成本与理论出身，不在裁决结果。

**误区三**："boosting 和 bagging 都是'多棵树投票'，随便挑一个。" 两者治的病相反：bagging 独立并行压方差，boosting 串行纠错压偏差。数据噪声大时 boosting 会拼命去拟合噪声，反而 bagging 稳——选型前先问自己在治什么病。

::::

## 6. 练习

**练习 1**（概念）：实验 3 里投票已经追平最好的单棵树，能否再加树把噪声点 $x=8$ 也救回来？为什么？

<details>
<summary>点开查看逐步解答</summary>

救不回来。每棵 stump 在自己的 bootstrap 里看到的仍是"$x=8$ 标 0、但邻居都是 1"的矛盾样本，无论刀口 3.5 还是 8.5，它对 $x=8$ 的判决都有一半概率出错；投票只能平均掉**独立的随机错**，而这里 15 棵树共享同一个矛盾标签——错误是系统性的（偏差）。要治它得换药：加正则（剪枝、深度限制）或清洗标签。bagging 管方差、不管偏差，边界在此。
</details>

**练习 2**（判题）：换一批样本：8 个瓜四好四坏（父熵恰为 1 比特）。特征「纹理」把它们分成清晰 5 个（四好一坏）、模糊 3 个（零好三坏）。初始代码算增益时忘了按两支的样本数加权——修好它：

```exercise
# @title: 练习：加权的信息增益
# @check: 0.7219
# @check: 0.5488
# @hint: 增益 = 父熵 − Σ(该支占比 × 该支熵)；清晰支占 5/8，模糊支占 3/8，熵为零的支乘什么都行但别漏。
import math                                 # math.log 可指定底（第 03 章出生）

def h2(q):
    if q <= 0 or q >= 1:                    # 纯堆没有不确定性
        return 0.0
    return -q * math.log(q, 2) - (1 - q) * math.log(1 - q, 2)

print(round(h2(4 / 5), 4))                  # 清晰支的不纯度（已示范）

gain = h2(0.5) - h2(4 / 5)                  # ← 错了：两支要各按 5/8 与 3/8 加权
print(round(gain, 4))
```

修好后输出 `0.7219`、`0.5488`：清晰支的熵与增益各就各位。这刀切得不亏——半个比特的降幅，把"模糊"侧直接切成了纯堆（熵 0）。

**练习 3**：把实验 2 的 `data` 里 $[2,2,0]$ 改成 $[2,2,1]$（制造一个刺头），重跑代码看最优刀搬到哪里、加权基尼还剩多少。

<details>
<summary>点开查看逐步解答</summary>

特征甲在阈值 3 处的完美纯净被打破：左叶变成 3 条 0 加 1 条 1（基尼 $0.375$）、右叶仍是纯 1，加权基尼升到 $0.375\times4/8=0.1875$；其余阈值（含特征乙的所有刀）都更差，最优刀位置不动、成色打折。读法：**树的刀口由最挣钱的切法决定，噪声只会削薄它的利润，很少改变它的选址**——这与实验 3 的结论互为表里。
</details>

## 7. 选读：随机森林与 GBDT 的配方

<details>
<summary>选读 · 两大集成的完整配料表</summary>

随机森林 = bagging + **特征随机**：每刀只在随机抽的一部分特征里挑（比如每刀只准看 $\sqrt d$ 个），逼得各树连"偏好的问题"都不同，去相关再平均，方差压得更狠；代价是单棵更弱，靠人海补回。GBDT/XGBoost = boosting 的现代版：第 $t$ 棵树不改标签，改学**前面所有树的残差**（还差多少），每棵以小步幅（学习率）往上添——把"逐步纠错"做成了函数空间的梯度下降（第 43 章的语言：在函数的山谷里下山）。表格数据竞赛与工业风控榜上，这两个家族长期盘踞榜首；深度学习吃香原因是图像、文本这类连续信号，而表格里的非线性与交互，横平竖直的树格子恰好顺手。

</details>

## 8. 下一站

树把平面切成格子，靠的是"问对问题"；还有一类模型反着来——先保证问法够硬：找一条与两类样本都保持最大距离的分界线，再用核技巧把直线掰弯。下一课请出几何感拉满的支持向量机。

→ [核技巧与 SVM 大间隔](./75-kernel-svm-margin.md)
