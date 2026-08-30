---
title: 第 58 章 · 拓扑与数据几何
description: 从橡皮几何到点云复形：用不变量、连通性和持久同调读出数据的形状。
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
---

# 拓扑与数据几何

拓扑研究“撕开或粘合才会改变”的性质。本章先建立开集、连通、紧致、Hausdorff 与同胚的直觉，再进入 Euler 示性数、曲面分类、基本群和覆盖空间；后半章把同一套语言搬到离散数据上，讨论单纯复形、Čech 覆盖、Vietoris-Rips 复形、持久同调与 mapper 图。

## 课程定位

- 卷五研究选修支线：连接表示嵌入、图网络、可信 AI 与科学计算；
- 前半部分属于分析与高等微积分的语言地基；
- 后半部分是现代 AI 数学中的拓扑数据分析（TDA）入口；
- 全章反复强调：TDA 揭示候选形状特征，不自动给出因果或神秘结论。

## 前置回望

本章前半以集合与映射的语言为主，第 27 章的集合-关系-函数基本功是最好的垫脚石；进入 TDA 后，点云的距离度量回到第 11 章的向量语言，过滤过程中连通块的合并则衔接第 29 章图论的连通分量。持久同调本身在本章从零建立，不预设更深的前置工具。

## 课程入口

1. [形状在不撕开不粘合下的不变性](./10-shape-invariants.md)——咖啡杯和甜甜圈共享一根"洞"，橡皮泥世界里杯柄能慢慢捏成环身；配可拖拽散点连通实验与浮窗 Python 的连通块计数练习。
2. [开集与拓扑空间](./15-open-sets.md)——地铁站 500 米服务圈的边界住户争议逼出开集定义：只收内部点；配开圆盘边界图像与"找出不属于开区间的点"判题练习。
3. [连通性与道路连通](./20-connectedness.md)——传感器各自监听百米，左右两区若无接力链，整片网络感知即断开；配可拖拽散点连通实验与传感器网络连通判定练习。
4. [紧致性直觉](./25-compactness.md)——无限长的地图上找最低点可能越走越远，有界闭区域让搜索"跑不掉"；配抛物线谷底移动图像与紧致区间筛选练习。
5. [Hausdorff 与分离条件选讲](./30-hausdorff.md)——两辆公交停在同一坐标，导航就说不清"到的是哪一辆"，分离公理要求任意两点可被不相交邻域分开；配数轴上两点的小实验与分离判断练习。
6. [同胚与橡皮几何](./35-homeomorphism.md)——陶瓷杯捏不成甜甜圈，理想橡皮可以：关键是对应关系双向连续；配"圆到椭圆的连续变形"图像与构造 R 到开区间同胚的练习。
7. [Euler 示性数](./40-euler-characteristic.md)——足球、立方体、金字塔外观迥异，顶点-棱-面账本却可能算出同一个数；配三角形复形的 Euler 账本图像与由示性数反推环柄数的练习。
8. [曲面分类直观](./45-surface-classification.md)——闭定向曲面千姿百态，其实一个整数编号（亏格）就排好了座次；配亏格预算曲线与修正闭定向曲面亏格的练习。
9. [基本群入门](./50-fundamental-group.md)——平地上的绳圈都能缩成一点，甜甜圈上绕洞一圈的绳套永远退不掉；配绕数采样的角度增长曲线与给回路贴绕数标签的练习。
10. [覆盖空间预告](./55-covering-spaces.md)——表针从 11 点走到 1 点只跨一格，真实时间已转一整圈：把直线卷到圆上就是最简单的覆盖；配正弦周期投影图像与两点是否同像的判断练习。
11. [单纯复形](./60-simplicial-complexes.md)——三维扫描仪吐出的不是连续曲面而是散乱点云，得先把点连成边、边围成三角形；以补全合法三角形复形的判题练习开场，浮窗 Python 给出手检脚本。
12. [Čech 复形与数据覆盖](./65-cech-complexes.md)——森林里三个传感器的监听圆若有公共交点，它们就共同看住同一位置；配可拖拽散点的覆盖交叠实验与 Čech 三角形判定练习。
13. [Vietoris-Rips 复形](./70-vietoris-rips.md)——社交网络的"朋友的朋友"常被自动拉进同一群：够近就连边、互相连边的团结成高维积木；配阈值扫描散点实验与 Rips 过滤过程练习。
14. [persistence diagram 和 barcode](./75-persistence-diagrams.md)——阈值慢慢推大，有的洞刚出生就消失，有的活得很宽才值得认真解释；配出生-死亡持久图与把持久区间搬上图上点的练习。
15. [mapper 图概览](./80-mapper-graphs.md)——几百个客户或细胞直接看点云会糊成一片：先用镜头函数切重叠条带，再聚类连线；配聚类连线演示与相邻簇连接练习。
16. [拓扑数据分析应用](./85-tda-applications.md)——TDA 不是万能洞检测器，它的价值是先把问题翻译成可检验的形状假设；配五步工作流演练与敏感性摘要生成练习。
17. [拓扑方法地图](./90-method-map.md)——学完一章最大的风险是看见数据就想算持久同调：这一课专练"什么问题该进哪个拓扑入口"；配最小充分方法选择判题练习。

## 生产状态

17 门正式课草案已完成。已有交互形态包括可拖拽散点、函数图像和浮窗 Python 实验；未实现的橡皮变形实验室、开集画板、亏格探索器、Rips 过滤盘、持久图盘和 mapper 盘统一登记在 `COMPONENT_SPEC.md`，本轮不冒充已上线。

## 实战挑战 · EEG α 节律的环形流形体检

**背景**。脑电（EEG）研究常把一段时间序列嵌入“延迟坐标”：横轴是当前电压，纵轴是隔 $\tau$ 后的电压。经过滤波、去伪迹和归一化后，一段稳定的 α 节律（大约 8–12 Hz）可能在延迟平面上形成接近闭合的环。拓扑数据分析不诊断疾病，只问一个可检验的形状问题：这个点云是否存在跨阈值稳健的 $H_1$ 环状候选。下面用四个相位质心做最小计算实验。

**题目**。某导联的一段 α 频段 epoch 已做去伪迹和 z-score 归一化。取延迟 $\tau$ 约为四分之一周期，再把轨迹按相位折成四个单位圆质心：右、上、左、下。

**(a)** 相邻两个质心的欧氏距离是多少？

**(b)** 在 Rips 阈值 $\varepsilon=1.5$ 下，4 个质心生成多少条边？图形是不是一个环？

**(c)** 对角距离为 2；当 $\varepsilon=2$ 时对角边加入并填满高维单纯形。这个 $H_1$ 候选的持久度是多少？

```exercise
# @title: 实战挑战：EEG α 节律环形判定
# @check: 1.41
# @check: 4
# @check: cycle
# @check: 0.59
# @hint: 相邻距离用平方和开方；阈值内边数形成四边形时输出 cycle。持久度是死亡阈值减出生阈值。
points = [[1, 0], [0, 1], [-1, 0], [0, -1]]
threshold = 1.5
death = 2.0

nearest_neighbor = max(abs(points[0][0]), abs(points[0][1]))   # 错：这不是两点距离
edge_count = 0                                                  # 错：还没有统计所有点对
verdict = "noise"
persistence = 0                                                 # 错：还没有用死亡值减出生值

print(f"{nearest_neighbor:.2f}")
print(edge_count)
print(verdict)
print(f"{persistence:.2f}")
```

<details>
<summary>点开查看逐步解答</summary>

相邻质心是单位圆上相隔四分之一周长的两点，距离为 $\sqrt{1^2+1^2}=\sqrt2\approx1.41$。因此阈值 1.5 只连接四条相邻边，不连两条对角线；这是一个四边形环。对角边在 2.0 加入后环被填掉，持久度为 $2-\sqrt2\approx0.59$。

```python
points = [[1, 0], [0, 1], [-1, 0], [0, -1]]
threshold = 1.5
death = 2.0

birth = None
edge_count = 0
for i in range(len(points)):
    for j in range(i + 1, len(points)):
        dx = points[i][0] - points[j][0]
        dy = points[i][1] - points[j][1]
        distance = (dx * dx + dy * dy) ** 0.5   # **0.5 表示开平方
        if birth is None or distance < birth:
            birth = distance
        if distance <= threshold:
            edge_count += 1

verdict = "cycle" if edge_count == len(points) else "noise"
persistence = death - birth
print(f"{birth:.2f}")
print(edge_count)
print(verdict)
print(f"{persistence:.2f}")
```

这里的 `cycle` 只是形状假设标签。真实 EEG 还要报告采样率、延迟 $\tau$、滤波边界、伪迹剔除、窗口长度、最大点数和多阈值敏感性；不能由一个环直接推断认知状态或临床结论。

</details>

相关课程：[Vietoris-Rips 复形](./70-vietoris-rips.md)、[persistence diagram 和 barcode](./75-persistence-diagrams.md)、[拓扑数据分析应用](./85-tda-applications.md)。

## 实战挑战 · 欧拉示性数：拓扑不变量

欧拉示性数 $\chi = V - E + F$ 是拓扑不变量——橡皮泥随便捏，它都不变。立方体有 8 个顶点、12 条棱、6 个面，$\chi = 8 - 12 + 6 = 2$。下面这题把减号写成了加号，修到输出 `2`：

```exercise
# @title: 实战挑战：欧拉示性数
# @check: 2
# @hint: 公式是 V − E + F，棱数 E 前面是减号。
V, E, F = 8, 12, 6    # 立方体的顶点、棱、面数
chi = V + E - F       # ← 问题在这：E 前应是减号
print(chi)
```

<details>
<summary>点开查看逐步解答</summary>

欧拉示性数是 $V - E + F$：

```python
chi = V - E + F    # 8 - 12 + 6
print(chi)         # 2
```

改完：$\chi = 8 - 12 + 6 = 2$。初始代码得 $14$。$\chi = 2$ 意味着这个曲面与球面同胚；而甜甜圈（环面）的 $\chi = 0$。这个"加加减减"出来的整数，是本章拓扑数据分析里判断形状"洞"的个数（Betti 数）的近亲——形状变了它才变，这正是拓扑不变量的威力。

</details>
