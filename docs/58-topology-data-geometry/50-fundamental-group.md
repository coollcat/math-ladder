---
title: 基本群入门
lesson_id: tdg/fundamental-group
prereqs:
  - tdg/surface-classification
volume: 5
layer: L8
track:
  - geometry-space
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - fundamental-group
applications:
  - loop-detection
exits:
  - research
---

# 基本群入门

## 1. 开场钩子

在平地上散步，任何一圈都能连续收缩成一个点。但在甜甜圈表面，绕洞口一圈的绳套无论怎样滑动，都不会凭空穿过洞壁消失。回路能否收缩，正是基本群记录的信息。

## 2. 直觉解释

取一个基点，考虑从它出发又回到它的所有连续回路。两条回路等价，当且仅当一条能连续变形为另一条。

圆周上的回路可按绕圈数分类：顺时针两圈、逆时针一圈、不动，都是不同类。平面上的所有回路都能收缩，所以只有一类。

## 3. 正式定义

设 $X$ 道路连通，$p\in X$。以 $p$ 为端点的回路是连续映射 $\gamma:[0,1]\to X$ 且 $\gamma(0)=\gamma(1)=p$。同伦等价类构成一个群，称为基本群：

$$\pi_1(X,p)$$

群运算把两条回路先后走一遍。道路连通空间中不同基点的基本群在同构意义下相同。

## 4. 分步例题

**平面**：$\pi_1(\mathbb R^2)=0$，任意回路收缩成基点。

**去掉原点的平面**：$\pi_1(\mathbb R^2\setminus\lbrace 0\rbrace)\cong\mathbb Z$，不变量是绕原点的带符号圈数。

**轮胎面**：有两个独立方向，绕大环和小环的回路分别生成 $\mathbb Z\oplus\mathbb Z$。

## 5. 动手实验

```viz
{
  "type": "plot",
  "title": "绕数采样：角度随时间增长",
  "expr": "sin(w * x)",
  "expr2": "cos(w * x)",
  "xmin": 0,
  "xmax": 6.28,
  "sliders": [
    { "name": "w", "min": -3, "max": 3, "step": 1, "value": 1 }
  ]
}
```

这不是完整的基本群计算器，但滑杆 `w` 表示有符号圈数：正数逆时针，负数顺时针，0 是可收缩回路。

```python title="用角度增量近似绕数"
import math  # math 提供反三角函数 atan2 和圆周率 pi

loop = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 0]]
angle_sum = 0

for k in range(1, len(loop)):
    previous = loop[k - 1]
    current = loop[k]
    raw_turn = math.atan2(current[1], current[0]) - math.atan2(previous[1], previous[0])
    # % 把相邻转角规范到 (-pi, pi]，避免跨越正负分界时误判方向
    turn = (raw_turn + math.pi) % (2 * math.pi) - math.pi
    angle_sum += turn

winding = round(angle_sum / (2 * math.pi))
print(winding)
```

这个版本把单位圆上一圈的有符号转角累加起来，再折算成绕数；示例输出 1。

```quiz
圆周上回路的绕数属于哪个集合？
- 只有 0 和 1
- 全体整数，方向用符号区分 [*]
- 全体实数
? 回路可以不动、顺时针绕或多圈，也可以逆时针绕；带方向的整数正好记录这些类。
```

## 6. 练习

```exercise
# @title: 练习：给回路贴绕数标签
# @check: clockwise-1
# @check: zero
# @check: counter-clockwise-2
# @hint: 用 atan2 计算相邻向量的夹角差并求和；总和除以 2π 后四舍五入。
loops = [
    [[1, 0], [0, -1], [-1, 0], [0, 1], [1, 0]],
    [[1, 0], [2, 0], [1, 0]],
    [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 0]]
]

for points in loops:
    total = 0
    print("unknown")
```

<details>
<summary>点开查看逐步解答</summary>

用向量夹角累计有符号转角：

```python
import math  # math 提供常数 pi 和反三角函数 atan2

loops = [
    [[1, 0], [0, -1], [-1, 0], [0, 1], [1, 0]],
    [[1, 0], [2, 0], [1, 0]],
    [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 0]],
]

for points in loops:
    total = 0.0
    for k in range(1, len(points)):
        x1, y1 = points[k - 1]
        x2, y2 = points[k]
        # % 先折回周期区间，再把转角规范到 (-pi, pi]，避免绕圈时跳变
        turn = math.atan2(y2, x2) - math.atan2(y1, x1)
        turn = (turn + math.pi) % (2 * math.pi) - math.pi
        total += turn
    winding = round(total / (2 * math.pi))
    labels = {2: "counter-clockwise-2", 1: "counter-clockwise-1", 0: "zero", -1: "clockwise-1"}
    print(labels[winding])
```

第一条顺时针一圈，输出 `clockwise-1`；第二条退回原地，输出 `zero`；第三条逆时针两圈，输出 `counter-clockwise-2`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为回路形状相同才等价。基本群只要求存在连续变形，不要求长度或速度一致。

**误区二**：你以为绕两圈等于绕一圈。基本群记录的是带符号圈数，$\mathbb Z$ 中 2 和 1 是不同元素，多绕的一圈不会凭空抵消。

**误区三**：你以为基本群只看洞的数量。它还记录缠绕顺序和不可交换性；数字 8 的两个生成元通常不可交换。

:::

## 8. 选读：为什么基点可以换

<details>
<summary>选读 · 用道路搬运回路</summary>

若 $\alpha$ 是从 $p$ 到 $q$ 的道路，则回路先沿 $\alpha$ 到 $q$，在 $q$ 绕行，再逆着 $\alpha$ 回到 $p$。这给出两类回路之间的对应。

不同道路可能使同构相差一个共轭。群结构本身仍被保留，因此道路连通空间常直接写 $\pi_1(X)$。

</details>

## 9. 下一站

绕圆周的回路在更高空间里可能被解开。下一站用覆盖空间给这种“解缠”画一张楼梯图。

→ [覆盖空间预告](./55-covering-spaces.md)
