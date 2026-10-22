---
title: Čech 复形与数据覆盖
lesson_id: tdg/cech-complexes
prereqs:
  - tdg/simplicial-complexes
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cech-complex
applications:
  - sensor-coverage
exits:
  - data-ai
---

# Čech 复形与数据覆盖

## 1. 开场钩子

一片森林里的传感器各自监听一个小圆。若三个圆有共同交点，就可以说这三台设备共同看住同一个位置。把“共同覆盖”变成高维积木，就得到 Čech 复形。

## 2. 直觉解释

给每个数据点放一个半径 $\varepsilon$ 的球。两个球相交就连一条边；三个球有公共点就填一个三角形；四个球有公共点就填一个四面体。

它比只看点间距离更忠实：三点即使两两相交，也可能没有公共三重叠区。传感器网络里这正对应接力盲区。

## 3. 正式定义

给定点集 $P=\lbrace p_1,\ldots,p_n\rbrace$ 和半径 $\varepsilon>0$，Čech 复形定义为：

$$\check C_\varepsilon(P)=\lbrace \sigma\subset P\mid \bigcap_{p\in\sigma}\overline B(p,\varepsilon)\neq\varnothing\rbrace$$

也就是说，一个顶点子集成为单纯形，当且仅当对应闭球的交非空。

## 4. 分步例题

在直线上取中心 $0,1,2$，半径 0.8：

1. 球 0 与球 1 相交于区间 $(0.2,0.8)$；
2. 球 1 与球 2 相交于 $(1.2,1.8)$；
3. 球 0 与球 2 不相交，因为距离 2 超过半径和 1.6；
4. 因此只有两条边，没有三角形；
5. 复形是一条折线，$\chi=3-2=1$。

若半径改为 1.05，三球公共交集出现，复形填入三角形，$\chi=3-3+1=1$。

## 5. 动手实验

```viz
{
  "type": "fit",
  "n": 9
}
```

把九个点拖成一团、一条链或两个分离云团。想象每个点带固定小圆盘：拖动会改变两两重叠和可能的三重叠区。未来专属组件会画出这些圆并高亮公共交叠。

```python title="检查等半径三点的公共交叠必要条件"
centers = [[0, 0], [1, 0], [0.5, 0.8]]  # 覆盖圆的圆心首现：三点构成一个小三角形
radius = 0.8  # 所有球取同一个半径，这样「三球共点」才等价于最小包围圆半径不超过它
pairs_ok = []  # pairs_ok 收集两两交叠的点对，它们将成为 1 维单形

for i in range(3):  # 内层从 i+1 开始，保证每个点对只数一次，不会重复也不会自己配自己
    for j in range(i + 1, 3):
        dx = centers[i][0] - centers[j][0]
        dy = centers[i][1] - centers[j][1]
        dist = (dx * dx + dy * dy) ** 0.5
        if dist <= 2 * radius:  # 两球相交 ⇔ 圆心距 ≤ 半径之和；等半径时就是 2×radius
            pairs_ok.append((i, j))

print(pairs_ok)
```

平面上三点有公共交叠的充分必要条件是“能罩住三个中心的最小圆”半径不超过给定半径。锐角三角形用外接圆；直角或钝角三角形改用最长边的一半，因为直径圆已经是最小包围圆。

## 6. 练习

```exercise
# @title: 练习：判断 Čech 三角形
# @check: True
# @check: False
# @check: False
# @hint: 平面等半径球的三重交叠看最小包围圆：锐角三角形用外接圆，直角、钝角或共线时用最长边的一半比较。
triangles = [
    ([[0, 0], [1, 0], [0.5, 0.8]], 0.7),
    ([[0, 0], [2, 0], [1, 0.2]], 0.7),
    ([[-1, 0], [1, 0], [0, 0]], 0.5)
]

for points, radius in triangles:
    can_fill = False
    print(can_fill)
```

<details>
<summary>点开查看逐步解答</summary>

先用叉积判断面积：

```python  # 三个待判三角形各配一个半径：正三角、近似共线、退化成线段
triangles = [
    ([[0, 0], [1, 0], [0.5, 0.8]], 0.7),
    ([[0, 0], [2, 0], [1, 0.2]], 0.7),
    ([[-1, 0], [1, 0], [0, 0]], 0.5)
]
for points, radius in triangles:  # for points, radius in triangles 拆开元组：一组点 + 一个半径
    area2 = abs((points[1][0]-points[0][0])*(points[2][1]-points[0][1]) -  # 叉积的绝对值 = 平行四边形面积的两倍；用它顺带判断三点是否共线
                (points[1][1]-points[0][1])*(points[2][0]-points[0][0]))
    if area2 > 1e-9:  # 1e-9 是判零容差：浮点比较不能直接写 area2 > 0
        a = ((points[1][0]-points[2][0])**2 + (points[1][1]-points[2][1])**2) ** 0.5  # 三边长度按勾股定理算，后面要判断锐角还是钝角
        b = ((points[0][0]-points[2][0])**2 + (points[0][1]-points[2][1])**2) ** 0.5
        c = ((points[0][0]-points[1][0])**2 + (points[0][1]-points[1][1])**2) ** 0.5
        squared = [a*a, b*b, c*c]
        longest = max(squared)   # max 取最大平方边长
        # 最大边的平方小于另两边平方和时才是锐角；此时最小包围圆是外接圆。
        if longest < squared[0] + squared[1] + squared[2] - longest:  # 最长边的平方小于其余两边平方和 ⇔ 锐角三角形，此时最小包围圆就是外接圆
            circumradius = a * b * c / (2 * area2)  # 外接圆半径 R = abc / (4Δ)，而 area2 是 2Δ，所以分母写 2*area2
        else:
            circumradius = longest ** 0.5 / 2  # 直角或钝角时最小包围圆由最长边决定，半径取其一半
    else:
        longest = max((sum((points[i][k]-points[j][k])**2 for k in [0,1])) ** 0.5   # max 取最大值：共线时用最长边的一半
                      for i in range(3) for j in range(i))                          # 双层 for 的生成表达式：枚举全部点对
        circumradius = longest / 2
    can_fill = circumradius <= radius
    print(can_fill)
```

三组分别得到最小包围半径约 0.56、大于 1、1，因此输出 `True,False,False`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为两两相交就有公共点。三个圆可以形成中间空洞。

**误区二**：你以为阈值只是技术参数。它决定哪些覆盖关系存在，必须报告取值范围和敏感性。

**误区三**：你以为 nerve 判据处处可用。它依赖凸集、良覆盖等条件；采样稀疏或覆盖非凸时，经验 nerve 可能偏离真实并集的形状。

:::

## 8. 选读： nerve 定理

<details>
<summary>选读 · 为什么覆盖能保留形状</summary>

好的覆盖（例如凸集构成的良覆盖）满足 nerve 定理：覆盖集合及其交叠组成的 nerve 与这些集合的并集同伦等价。于是抽象高维单纯形确实记录了真实覆盖的拓扑。

但定理条件不能随便省略。采样不足、非凸覆盖和边界效应都会让经验 nerve 偏离底层形状。

</details>

## 9. 下一站

Čech 复形几何意义清楚，却要判断困难的高维交集。下一站介绍常用近似品：Vietoris-Rips 复形。

→ [Vietoris-Rips 复形](./70-vietoris-rips.md)
