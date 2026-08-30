---
title: 复分析与方法地图
lesson_id: complex-analysis/method-map
prereqs:
  - complex-analysis/analytic-continuation
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - complex-analysis-workflow
applications:
  - method-selection
exits:
  - engineering
  - research
---

# 复分析与方法地图

## 1. 开场钩子

学完整章最容易丢的不是定理，而是“下一步该用哪件工具”。这一课不再引入新概念，而是把十三站串成一张决策地图：看到函数先找洞，找到洞再问主部，能闭合就算净额，想把区域搬个家就走 Möbius 变换，遇到动态系统就去 $s$ 平面。

## 2. 直觉解释

复分析的三条主线可以这样记：

1. **结构线**：CR 方程说明局部只有旋转伸缩；
2. **积分线**：围道把全局信息压缩成奇点账本；
3. **变换线**：Laplace 把时间行为搬到 $s$ 平面读稳定性。

三条线的枢纽都是解析刚性：一点附近的规整会决定很远处的形状。

## 3. 方法速查表

| 问题症状 | 首选工具 | 判断关键 |
| --- | --- | --- |
| 问是否可复导 | Cauchy-Riemann 方程 | $u_x=v_y$ 且 $u_y=-v_x$ 是否在开区域成立 |
| 局部逼近函数值 | 幂级数 | 最近奇点决定收敛半径 |
| 沿曲线累积 | 围道积分 | 参数化 $dz=z'(t)dt$，注意方向 |
| 闭路无奇点 | Cauchy-Goursat | 单连通且函数解析则积分为零 |
| 已知边界还原内部 | Cauchy 公式 | 找出围道内的 $z_0$ |
| 奇点附近狂野 | Laurent 级数 | 数负幂：零个、有限个、无穷多个 |
| 计算实定积分 | 半圆围道 | 大弧贡献趋于零，加上半平面留数 |
| 解线性常微分系统 | Laplace 变换 | 极点位置与初值一起决定响应 |
| 把一块区域搬成另一块 | Möbius 变换 | 行列式 $ad-bc\neq 0$，三点定一变换 |

## 4. 分步例题

面对

$$I=\int_0^\infty\frac{x\sin x}{x^2+4}\,dx,$$

按地图走四步：

1. 被积函数含 $\sin x$，改写成 $e^{iz}$ 的实部或虚部；
2. 上半平面奇点为 $z=2i$；
3. Jordan 引理压住上半大弧；
4. 只需计算该极点的留数，最后取对应实部或虚部。

同样的流程不需要逐项寻找原函数。

## 5. 动手实验

### 实验 1（viz）：把三种典型波形放进一张图

```viz
{
  "type": "plot",
  "title": "衰减、临界与增长对应左轴、虚轴、右轴",
  "expr": "exp(a*x)*cos(4*x)",
  "xmin": -2,
  "xmax": 2,
  "sliders": [
    { "name": "a", "min": -1, "max": 1, "step": 0.1, "value": -0.6 }
  ]
}
```

$a<0$ 是左半平面稳定模式，$a=0$ 是纯振荡边界，$a>0$ 是右半平面增长模式。

### 实验 2（python）：写一个迷你选路器

```python title="根据问题特征推荐方法"
def recommend(has_singularity, closed_path):
    if has_singularity and closed_path:
        return "residue-theorem"
    if has_singularity:
        return "laurent-series"
    if closed_path:
        return "cauchy-goursat"
    return "local-power-series"

cases = [
    [False, False],
    [False, True],
    [True, False],
    [True, True],
]
for has_hole, is_closed in cases:
    print(recommend(has_hole, is_closed))
```

输出依次是局部幂级数、Cauchy 定理、Laurent 分析、留数定理。真实解题还要检查方向、区域和收敛域。

### 实验 3（quiz 小结）

下面这道题检查你是否能把符号和几何分开。

```quiz
函数在一点的复导数存在，能否立刻断言它在该点解析？
- 可以，两者完全等价
- 不行，解析还要求周围一个开区域内都可导 [*]
- 只要实部和虚部连续就可以
? 一点复可导只是必要条件；解析还要求一个开邻域内处处复可导。Goursat 定理进一步说明，区域上复可导本身已足够推出积分性质。
```

:::warning[常见误区]

**误区一**：你以为方法可以只凭关键词选择。同一个表达式在不同围道和区域内会得到不同答案。

**误区二**：你以为算出留数就结束。还要确认大弧贡献、实轴奇点和分支切割。

**误区三**：你以为 Laplace 与围道积分无关。逆变换正是用 Bromwich 围道和留数完成的。

:::

## 6. 练习

```exercise
# @title: 练习：给四个任务排序选工具
# @check: cauchy-riemann
# @check: power-series
# @check: laurent-series
# @check: residue-theorem
# @hint: 分别对应局部可导、局部逼近、奇点分类、闭路净额。
answers = ["residue-theorem", "cauchy-riemann", "laurent-series", "power-series"]
targets = ["check differentiability", "approximate near center", "classify isolated hole", "evaluate closed contour"]
for task in targets:
    # index 查出当前任务在列表中的序号
    number = targets.index(task)
    print(answers[number])
```

<details>
<summary>点开查看逐步解答</summary>

1. 检查可微性 → Cauchy-Riemann；
2. 中心附近近似 → 幂级数；
3. 孤立奇点分类 → Laurent 级数；
4. 闭围道净额 → 留数定理。

初始列表故意打乱顺序；最终打印必须按题目要求逐行输出四个名称。
</details>

## 7. 选读：通往后续章节的门

<details>
<summary>选读 · 这章在哪里再次出现</summary>

偏微分方程中的调和函数会继续使用共轭调和对；控制课程会用 $s$ 平面极零点设计反馈；测度论与泛函分析会把这里的积分概念放到更一般的函数空间；数值分析则会研究围道积分和变换反演的稳定算法。
</details>

## 8. 下一站

第 24 章到此收束。你可以回到知识图谱，看看这条 analysis-change 支线如何连接多元微积分、ODE、测度论和泛函分析。

→ [第 24 章 · 复分析](./index.md)
