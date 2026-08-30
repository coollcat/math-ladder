---
title: 正运动学：二连杆手算
lesson_id: robotics-motion/forward-kinematics
prereqs:
  - robotics-motion/pose-frames
  - trig/unit-circle
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - forward-kinematics
  - workspace
applications:
  - robot-arm-control
  - legged-robot
exits:
  - robotics-motion/planning-astar
---

# 正运动学：二连杆机械臂手算

## 1. 从一个场景开始

扫地机器人的小手臂要伸进沙发底够到一颗纽扣。它有两个关节，各转了一个角度——那么**手臂末端（夹爪）到底落在哪？**

这个问题叫**正运动学**（forward kinematics）：已知全部关节角，求末端位姿。它是单行道：正向好算，反向（"想够到那颗纽扣，关节该转多少"）难得多——那是逆运动学，本课末尾只留个路标。

## 2. 直觉解释

把两条杆想成**首尾相接的两个向量**：

- 大臂从肩出发，方向由 $\theta_1$ 决定；
- 小臂接在大臂末端，方向由"总角度"$\theta_1+\theta_2$ 决定（注意：$\theta_2$ 是相对大臂的关节角，不是相对地面！）；
- 末端位置 = 两个向量**相加**——第 11 章的向量加法直接上岗。

所以正运动学的全部内容就是：把两个长度已知、方向已知的向量加起来，读出终点的横纵坐标。三角函数负责"方向变坐标"，加法负责拼接。

## 3. 正式定义

设大臂长 $L_1$、小臂长 $L_2$，关节角 $\theta_1,\theta_2$（弧度），记 $c_{12}=\cos(\theta_1+\theta_2)$、$s_{12}=\sin(\theta_1+\theta_2)$，则末端坐标为：

$$x=L_1\cos\theta_1+L_2 c_{12},\qquad y=L_1\sin\theta_1+L_2 s_{12}$$

| 符号 | 名字 | 易错点 |
| --- | --- | --- |
| $\theta_1$ | 肩角 | 相对世界系 x 轴量起 |
| $\theta_2$ | 肘角 | **相对大臂**延长线量起，不是相对世界系 |
| 工作空间 | 可达区域 | 半径 $|L_1-L_2|$ 到 $L_1+L_2$ 的圆环 |

公式怎么来的？两步：大臂贡献 $(L_1\cos\theta_1, L_1\sin\theta_1)$；小臂按总角贡献 $(L_2c_{12}, L_2s_{12})$；相加即得。它其实是上一课位姿链 $T_{世←大}\cdot T_{大←小}$ 只取平移列的特例——矩阵语言在这里自动坍缩成两个余弦两个正弦。

## 4. 分步例题

**例**：$L_1=2$ 米、$L_2=1$ 米、$\theta_1=30^\circ$、$\theta_2=60^\circ$。求末端坐标。

1. 算总角：$\theta_1+\theta_2=90^\circ$；
2. 查单位圆：$\cos30^\circ=\frac{\sqrt3}{2}$、$\sin30^\circ=\frac12$；$\cos90^\circ=0$、$\sin90^\circ=1$；
3. 代 x 公式：$x=2\times\frac{\sqrt3}{2}+1\times0=\sqrt3\approx1.732$；
4. 代 y 公式：$y=2\times\frac12+1\times1=2$；
5. 结论：末端在 $(1.732,\ 2)$。几何复查：大臂斜向右上到 $(1.732,1)$，小臂竖直向上再走 1 米 ✓。

顺手观察一个惊人事实：若把 $\theta_2$ 换成 $-60^\circ$（肘部反折），终点会不同吗？总角变成 $-30^\circ$：$x=1.732+\frac{\sqrt3}{2}\approx2.598$，$y=1-\frac12=0.5$——不同了。但存在**别的角度对**给出完全相同的终点（肘上/肘下两种姿势），这是逆运动学多解的种子。

## 5. 动手实验

网页组件先上场：拖动两个箭头首尾相接，紫色合成向量就是"末端"。感受一下：改变第二段的方向时，它绕的是**第一段的末端**而不是原点——这正是"肘角是相对量"：

```viz
{ "type": "vecadd", "title": "二连杆＝两个向量首尾相接", "u": [1.5, 0.9], "v": [0.7, -0.7] }
```

### 实验 1（python）：FK 函数与工作空间云图

```python title="二连杆正运动学"
import math
import matplotlib.pyplot as plt

# sliders: th1_deg=30 [0:180:15], th2_deg=60 [-180:180:15]

def fk(L1, L2, t1, t2):
    t12 = t1 + t2                       # 总角：小臂相对世界的朝向
    x = L1 * math.cos(t1) + L2 * math.cos(t12)
    y = L1 * math.sin(t1) + L2 * math.sin(t12)
    return x, y

th1 = math.radians(th1_deg)
th2 = math.radians(th2_deg)

elbow = (2 * math.cos(th1), 2 * math.sin(th1))   # 肘部＝大臂末端
tip = fk(2, 1, th1, th2)
print(f"肘部 ({round(elbow[0], 3)}, {round(elbow[1], 3)})")
print(f"末端 ({round(tip[0], 3)}, {round(tip[1], 3)})")

fig, ax = plt.subplots(figsize=(6, 6))
ax.plot([0, elbow[0], tip[0]], [0, elbow[1], tip[1]],
        marker="o", linewidth=3, color="steelblue")   # 手臂骨架折线
ax.scatter([0], [0], s=120, color="black")

xs, ys = [], []
for a in range(0, 360, 10):
    for b in range(-150, 151, 15):
        p = fk(2, 1, math.radians(a), math.radians(b))
        xs.append(p[0])
        ys.append(p[1])
ax.scatter(xs, ys, s=4, color="lightgray")   # 扫出全部可达点＝工作空间
ax.set_aspect("equal")
ax.set_title("蓝线=当前姿态，灰点=可达工作空间")
```

灰点铺成一个圆环：内径 $|2-1|=1$、外径 $2+1=3$——够不着自己的肩膀根，也够不着三米以外。这个环形就是这台"机器人"的天花板与地板。

### 实验 2（python）：同一终点的两种姿势

```python title="肘上 vs 肘下：多解一瞥"
import math

def fk(L1, L2, t1, t2):
    t12 = t1 + t2
    return (L1 * math.cos(t1) + L2 * math.cos(t12),
            L1 * math.sin(t1) + L2 * math.sin(t12))

pose_a = fk(1, 1, math.radians(90), math.radians(-90))   # 大臂竖起，小臂折回水平
pose_b = fk(1, 1, math.radians(0), math.radians(90))     # 大臂平放，小臂竖起
print(f"姿势A 终点: ({round(pose_a[0], 4)}, {round(pose_a[1], 4)})")
print(f"姿势B 终点: ({round(pose_b[0], 4)}, {round(pose_b[1], 4)})")
```

两组截然不同的角度，终点坐标逐位相同——正运动学是多对一的。反过来求角度时答案不唯一，机器人必须靠附加规则（比如"优先肘上"）做选择。不妨在纸上画一画这两根"等腰直角"手臂：一个从北侧够到 $(1,1)$，一个从东侧。

### 快问快答

```quiz
二连杆的工作空间是什么形状？
- 一个实心圆盘
- 一个圆环（内外半径都是杆长的函数） [*]
- 一条圆周线
? 最远能伸直达 L1+L2，最近只能折叠到 |L1-L2|，两者之间都能到达——圆环。
```

:::warning[常见误区]

**误区一**："你以为 θ₂ 也从地面量起。" 肘角是大臂与小臂的**夹角**（相对量）。把它当绝对角用，末端会飞到莫名其妙的地方——实验 1 里故意用 `t1 + t2` 就是在提醒这件事。

**误区二**："你以为给定终点就唯一确定角度。" 正向多对一，反向一对多。真实控制器还要避开自身碰撞、关节限位，选择比求解更费心。

**误区三**："你以为角度可以直接喂给 cos/sin。" Python 三角函数只认弧度。`math.radians()` 是每节课都要站岗的门卫。

:::

## 6. 练习

**练习 1**：初始代码把肘角误当成世界角使用（忘了加 $\theta_1$），能跑但末端跑偏。修到通过：

```exercise
# @title: 练习：修复二连杆 FK
# @check: 1.732
# @check: 2.0
# @hint: 小臂的朝向是 theta1 + theta2（总角），cos/sin 都要吃这个总角。
import math

L1, L2 = 2, 1
t1 = math.radians(30)
t2 = math.radians(60)

x = L1 * math.cos(t1) + L2 * math.cos(t2)    # ← 错在这：两处都把 t2 当成了世界角
y = L1 * math.sin(t1) + L2 * math.sin(t2)
print(round(x, 3))
print(round(y, 3))
```

**练习 2**：证明"末端到基座距离" $r$ 满足 $r^2=L_1^2+L_2^2+2L_1L_2\cos\theta_2$，并用它解释工作空间为什么是环。提示：对向量模平方展开。

<details>
<summary>点开查看逐步解答</summary>

末端向量 $\vec r=\vec L_1+\vec L_2'$，模平方：

$$r^2=(\vec L_1+\vec L_2')\cdot(\vec L_1+\vec L_2')=L_1^2+L_2^2+2\vec L_1\cdot\vec L_2'$$

关键一步：两向量夹角恰是肘角 $\theta_2$（小臂相对大臂），所以点积 $=L_1L_2\cos\theta_2$。于是

$$r^2=L_1^2+L_2^2+2L_1L_2\cos\theta_2$$

（这就是余弦定理换了马甲。）$\theta_2=0$ 时 $r=L_1+L_2$ 最大；$\theta_2=\pi$ 时 $r=|L_1-L_2|$ 最小。注意 $r$ 与 $\theta_1$ 无关——转肩不改距离，只改方位，圆环由此而来。这条公式也是逆运动学的钥匙：给定目标点先算出要求的 $\theta_2$。
</details>

## 7. 选读：逆运动学的路标

<details>
<summary>选读 · 从"够不到"到数值法</summary>

练习 2 的公式已经把二连杆逆解送到嘴边：目标距离 $d$ 给定后，$\cos\theta_2=\frac{d^2-L_1^2-L_2^2}{2L_1L_2}$，若右边落在 $[-1,1]$ 外，目标在工作空间外——物理上不可达，多少算法都救不了。可达时反余弦给出肘角，再用几何定出肩角。

三连杆以上就没有这么干净的闭式了，工业界主流是**数值迭代**：把"末端误差"当作多元函数，用 Jacobian（第 20 章）指示每次该往哪个方向拧各关节。这条线索在第 43 章优化与本章规划课之后会合——数学工具从来是团队作战。

</details>

## 8. 下一站

手臂知道怎么伸了，可仓库里还有货架挡路。下一课解决另一个层面的问题：从起点到终点，整条路线该怎么选——可视图与 A* 的直觉。

→ [路径规划：可视图与 A* 雏形](./30-planning-astar.md)
