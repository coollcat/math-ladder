---
title: 参数辨识与观测设计
lesson_id: scientific-ml/parameter-identification-design
prereqs:
  - scientific-ml/inverse-problems
  - linalg-advanced/least-squares
  - linalg-advanced/condition-number
volume: 5
layer: L11
track:
  - scientific-computing
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - parameter-identification
  - sensitivity-matrix
  - optimal-sensor-placement
applications:
  - sensor-placement
  - orbit-determination
exits:
  - engineering
---

# 参数辨识与观测设计

## 1. 从一个场景开始

低轨卫星的衰减率 $k$ 未知，而每一次测高都占用地面上站的可见弧段——弓在弦上，钱却有限。本章开头已经领教过"两个读数反推一个参数"；这一课把问题升级成商业决策：**预算给定，下一次测量放在哪天才最值钱？**

第 20 课的逆问题里，我们的武器是正则化——数据病态时往解里掺先验。这一课换战略：与其事后补救，不如事前布局。同样的预算，布点讲究能少花一个数量级的冤枉钱。

## 2. 直觉解释

对数化以后，卫星剩余高度模型变成一条直线：$\ln h = \ln C - k\,t$。用两颗钉子（两次观测）钉住这条直线：

- 钉子挨得近（比如第 2 天和第 3 天）：读数抖一毫米，直线绕着它们疯狂打转——**力臂太短**；
- 钉子拉开（第 2 天和第 30 天）：同样一抖，直线的倾角几乎不动。

还有一类"假病态"要拆穿：把时间的单位换成小时，$t$ 这一列瞬间膨胀成原来的 24 倍，矩阵条件数跟着翻天覆地——但信息量分毫未变。**先记账（中心化、配平量纲），再谈花钱买传感器**，是工程老手的动作顺序。

## 3. 正式定义

模型 $h(t) = C e^{-kt}$ 线性化为 $y = b + a t$（$y=\ln h$，$a=-k$）。取 $N$ 次观测后堆叠出**灵敏度矩阵**：

$$A = \begin{bmatrix} 1 & -t_1 \\ \vdots & \vdots \\ 1 & -t_N \end{bmatrix}, \qquad A^{\mathsf{T}}A\,\hat{\theta} = A^{\mathsf{T}}y$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $t_i$ | 观测时刻 | 设计变量：在哪测 |
| $\hat\theta$ | 参数估计 | 要反推的 $(b, -k)$ |
| $\det(A^{\mathsf{T}}A)$ | 信息量代理 | 越大越好；两点设计下就是间距平方 |
| $\kappa(A^{\mathsf{T}}A)$ | 条件数 | 噪声放大倍数的上限标签 |

两点设计的漂亮结论：$N=2$ 时 $\det = (t_2-t_1)^2$——**只取决于间距，不取决于绝对位置**。斜率估计的标准差与它成反比，这就是"力臂"的代数化身。

## 4. 分步例题

比较两套两天布点方案：

1. 方案甲 $\lbrace 2, 3\rbrace$：$\det = (3-2)^2 = 1$，稀薄到滑稽——倒数第一名的候选；
2. 方案乙 $\lbrace 2, 30\rbrace$：$\det = 28^2 = 784$，斜率标准差缩小 $\sqrt{784}=28$ 倍；
3. 但先别急着夸乙：算它的原始条件数，$\kappa(A^{\mathsf{T}}A)\approx 1045$，比甲的约 $223$ 还吓人——拉得越开，账面数字越难看；
4. 记账招式登场：两套布点都把时间列中心化，两列立刻正交。甲的条件数从约 $223$ 掉到 $4$，乙从约 $1045$ 掉到 $196$——**没有动用任何一次新观测，纯粹是把账本摆正了**；
5. 结论分两层：真实的信息缺口看行列式（要拉开），虚胖的条件数靠整理账本（要配平）。两条战线都不能省。

## 5. 动手实验

### 实验 1：拖一把散点，看直线稳不稳

这是最小二乘工作台：拖动数据点让它们挤成一团，再拖向两端铺开——观察拟合线斜率像不像被噪声晃动的仪表针：

```viz
{ "type": "fit", "n": 6 }
```

点越聚拢，直线越长袖善舞；两端一沉一浮挂上砝码，它就立刻老实。你刚亲手演示了行列式的几何含义。

### 实验 2：全网格找最佳观测日

```python title="扫描所有两天组合：行列式、最优布点与记账体检"
import math

days = list(range(1, 31))            # range 生成的整数列表套上 list() 再进循环

best_pair = None                     # 记录冠军布点（第几天, 第几天）
best_det = -1                        # 行列式越大 = 信息越多
worst_det = None

for i in range(len(days)):
    for j in range(i + 1, len(days)):   # j 从 i+1 起：只考虑后面的日子
        t1 = days[i]
        t2 = days[j]
        det = (t2 - t1) ** 2            # 两点设计的全部秘密就在这一个公式
        if best_det == -1 or det > best_det:
            best_det = det
            best_pair = (t1, t2)        # 元组打包：一行装走两个值
        if worst_det is None or det < worst_det:
            worst_det = det

print("冠军布点:", best_pair, " 行列式:", best_det)
print("垫底行列式:", worst_det, "（所有相邻日并列）")
print("两者标准差之比:", round(math.sqrt(best_det / worst_det), 1), "倍")

# --- 记账体检：同一对测点 {2,3}，中心化前后 ---
t1, t2 = 2, 3                          # 元组解包：一行领回两个值
n_pts = 2
sum_t = t1 + t2
sum_t2 = t1 * t1 + t2 * t2
det_raw = n_pts * sum_t2 - sum_t * sum_t          # 一般布点的行列式公式
tr_raw = n_pts + sum_t2                            # 对称矩阵的对角线之和
gap = math.sqrt(tr_raw * tr_raw - 4 * det_raw)     # 特征值公式的判别块
lmax = (tr_raw + gap) / 2
kappa_raw = lmax * lmax / det_raw                  # 条件数 = 最大特征值的平方除以行列式

t_mid = (t1 + t2) / 2                              # 中心化的支点
spread = (t1 - t_mid) ** 2 + (t2 - t_mid) ** 2
kappa_centered = max(n_pts, spread) / min(n_pts, spread)

print("布点 {2,3} 原始条件数约:", round(kappa_raw), "；中心化后:", kappa_centered)
```

实测输出：冠军布点是两端 $(1, 30)$、行列式 841；垫底的行列式只有 1，标准差悬殊 29 倍；布点 {2,3} 的条件数从约 223 掉到 4——条件数的大头居然是记账方式贡献的。

### 实验 3：判题小练兵

```exercise
# @title: 练习：给衰减率挑观测日
# @check: 4
# @check: 64
# @check: 4.0
# @hint: 两点设计的行列式是「间距」的平方；写成了和的平方是本关唯一的坑。
import math

def det_design(t1, t2):
    return (t1 + t2) ** 2       # ← 问题在这：起作用的是两天的距离，不是位置的和

print(det_design(2, 4))
print(det_design(2, 10))

ratio = det_design(2, 10) / det_design(2, 4)
print(math.sqrt(ratio))         # sqrt：开根号得到标准差的缩放倍数
```

改好后前两行是行列式 $4$ 与 $64$，第三行告诉你换这套布点能把斜率的标准差压成四分之一。注意第三问的答案只认**相对距离**——把两边各加 5 天，答案纹丝不动。

## 常见误区

:::warning[常见误区]

**误区一**："预算翻倍就多买一倍传感器。"布点不讲究时，加再多同质样本也只是在同一处钉重复的钉子——信息量按独立性计件，不看采购单金额。先把已有观测的位置排开，才是性价比之王。

**误区二**："条件数高就该上更精密的仪器。"实验 2 显示大头可能是没有中心化的记号病——配平量纲免费拿回几百倍的数值体面，仪器一分钱不用加。

**误区三**："把观测堆到远端一定赚。"动力学模型只是近似，远端时刻会把模型的系统误差也一起放大进灵敏度；极端布点买来的是数学上的稳定、物理上的幻觉。设计永远要在信息、偏差与成本之间走钢丝。

:::

```quiz
提高参数辨识精度，下列哪种做法通常最值得优先尝试？
- 不动现有布点，直接把传感器精度调高一档
- 先检查是否该中心化、拉开观测时刻的跨度，再谈加设备 [*]
- 把所有观测集中安排在最方便操作的一天附近
? 行列式给出信息量的硬指标：跨度决定它；条件数里还有一大块只是记账造成的假病态。精度账要先审布置，再审硬件。
```

## 6. 练习

**练习 1**：手算：布点 $\lbrace 5, 9\rbrace$ 与 $\lbrace 15, 17\rbrace$ 的行列式各是多少？哪个方案斜率更稳？

<details>
<summary>点开查看逐步解答</summary>

$(9-5)^2=16$ 与 $(17-15)^2=4$：前者标准差缩为后者的 $2/4=0.5$ 倍。注意位置 $\lbrace 15,17\rbrace$ 远离原点也不救场——起作用的只有 2 天对 4 天的间距，"看起来更后期的数据"没有特权。
</details>

**练习 2**：在方案 $\lbrace 2, 30\rbrace$ 中间补一个第 15 天的观测（共三点），直觉判断它会怎样改写误差地图。

<details>
<summary>点开查看逐步解答</summary>

中间点几乎不改两端决定的间距信息（行列式增幅有限），却在模型失真时充当裁判：若远端读数偏离中间点的延长线，你会第一时间怀疑模型而非噪声——这正是练习在三端走钢丝的"偏差哨兵"。很多卫星任务宁可砍掉一颗远端传感器也要保一个中段校准弧段。
</details>

**练习 3**：概念辨析：本课与第 20 课的正则化是什么关系？

<details>
<summary>点开查看逐步解答</summary>

同一枚硬币的两面：逆问题的不适定可以用"事后"的正则项压制（承认数据欠约束、往先验收缩），也可以"事前"靠观测设计增加独立约束（让矩阵天生良态）。工程次序一般是先设计、后正则化——能用一天观测解决的病态，不必请 Tikhonov 出山收编。
</details>

## 7. 选读：D-最优设计的正式名字

<details>
<summary>选读 · 让行列式说话的学科</summary>

"挑观测使 $\det(A^{\mathsf{T}}A)$ 最大"在统计实验设计里有正式户口：D-最优设计（D-optimal design），其理论基础是 Fisher 信息矩阵——行列式最大化等价于最小化参数协方差椭球的体积。非线性模型（如本课的指数）还要迭代：先用当前参数猜测线性化，再更新布点、再辨识，循环推进。经典应用遍历工业试验配方、地震台网选址与航天器定轨的调度。第 21 章的条件数、第 44 章的病态分析在这里拧成一股绳：**好的实验设计是一切下游算法的起跑线。**

</details>

## 8. 下一站

辨识、拟合、加速的接力到此跑完最后一棒。还剩一个问题悬而未决：替身学的是"这批函数长什么样"，能不能直接学"规则本身"？下一课登场的神经算子给你答案。

→ [神经算子与函数到函数映射](./80-neural-operator-map.md)
