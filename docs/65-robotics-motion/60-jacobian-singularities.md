---
title: 速度雅可比与奇异位形
lesson_id: robotics-motion/jacobian-singularities
prereqs:
  - robotics-motion/inverse-kinematics
  - multivariable/jacobian-chain
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
  - velocity-jacobian
  - singular-configuration
  - force-amplification
applications:
  - robot-arm-control
  - haptic-device
exits:
  - robotics-motion/generalized-lagrangian
---

# 速度雅可比与奇异位形

## 1. 从一个场景开始

TRY 搬运机器人要把一根 3 米的梁竖着举过头顶。手臂完全伸直的那一刻，操作员发现一个怪事：关节电机在转，梁却只在"沿手臂方向"上挪动，想横着微调半厘米都做不到——关节在动，末端却"僵"住了。

这不是电机故障，而是构型本身的问题。给这台变速箱装上仪表——**速度雅可比**，"僵"的那一刻会显示成一个清清楚楚的数字：行列式等于零。

## 2. 直觉解释

关节转速和末端速度之间隔着一张**线性地图**：给一组关节转速 $(\dot q_1,\dot q_2)$，末端速度 $(v_x,v_y)$ 就唯一确定，而且是"各关节贡献相加"的线性组合。这张地图就是雅可比矩阵 $J$——第 20 章那个偏导数表格的机器人上岗版：

$$(v_x,v_y)^T = J(\theta)\,(\dot q_1,\dot q_2)^T$$

线性地图有个"体检指标"：**行列式**。它衡量这张地图把输入压扁了多少。二连杆的行列式有一个极漂亮的闭式：

$$\det J = L_1 L_2 \sin\theta_2$$

肘角一转，行列式跟着呼吸：折叠或伸直（$\theta_2=0$ 或 $\pi$）时 $\sin\theta_2=0$，地图把二维输入压成一维——某个方向的末端速度凭空消失。这样的姿势叫**奇异位形**（singularity）。反过来，在奇异附近想让它"补回"那个方向的一点点速度，关节就得疯转——速度被 $1/\sin\theta_2$ 放大。

## 3. 正式定义

对二连杆（杆长 $L_1,L_2$，肩角 $\theta_1$、肘角 $\theta_2$，总角 $\theta_1+\theta_2$）：

$$J=\begin{pmatrix}-L_1 s_1-L_2 s_{12} & -L_2 s_{12}\\ L_1 c_1+L_2 c_{12} & L_2 c_{12}\end{pmatrix}$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $s_1,c_1$ | 肩角三角 | $\sin\theta_1$、$\cos\theta_1$ |
| $s_{12},c_{12}$ | 总角三角 | $\sin(\theta_1+\theta_2)$、$\cos(\theta_1+\theta_2)$——小臂按总角摆 |
| $\det J$ | 体检指标 | $L_1L_2\sin\theta_2$，只看肘角 |
| 奇异位形 | $\det J=0$ | 伸直或完全折叠，末端丢失一个运动方向 |

行列式怎么来的？把 $2\times2$ 按定义展开，交叉项借两角差公式 $\sin\theta_{12}\cos\theta_1-\cos\theta_{12}\sin\theta_1=\sin\theta_2$ 合并，$L_1L_2$ 提出来——肩角 $\theta_1$ 整个消失，僵不僵只看肘。

## 4. 分步例题

**例**：$L_1=2$、$L_2=1$，$\theta_1=90^\circ$（大臂竖直）、$\theta_2=0^\circ$（伸直）。两关节都以 1 rad/s 转，求末端速度。

1. 总角 $\theta_1+\theta_2=90^\circ$，查单位圆：$s_1=1$、$c_1\approx0$、$s_{12}=1$、$c_{12}\approx0$；
2. 填矩阵：$J=\begin{pmatrix}-3 & -1\\ \approx0 & \approx0\end{pmatrix}$——第二行几乎全零；
3. 乘转速：$v_x=-3-1=-4$、$v_y\approx0$；
4. 读结果：末端速度恰好沿手臂方向（竖直），大小 4 米/秒——横着的那半格速度彻底消失；
5. 体检：$\det J=L_1L_2\sin0^\circ=0$ ✓ 奇异位形实锤。

## 5. 动手实验

先看体检指标随肘角的呼吸：曲线是 $\det J=2\sin\theta_2$，在 $0$ 与 $\pm\pi$ 处触零——两端的"僵直带"一目了然：

```viz
{
  "type": "plot",
  "title": "行列式 det J = 2·sin(肘角)：触零即奇异",
  "expr": "2*sin(x)",
  "xmin": -3.14159,
  "xmax": 3.14159,
  "piAxis": true
}
```

### 实验 1（python）：行列式扫描与伸直瞬间的速度塌缩

```python title="从灵活到僵直：det 与速度放大倍数"
import math                                     # 三角函数标准库

L1, L2 = 2, 1                                   # 大臂 2、小臂 1

for deg in [90, 60, 30, 15]:                    # 从最灵活走向僵直
    s = math.sin(math.radians(deg))             # 肘角正弦：行列式的灵魂
    amp = 1 / s                                 # 奇异方向的速度放大倍数 ~ 1/sin
    print(f"肘角 {deg:>2}°: det = {round(L1 * L2 * s, 1)}, 放大倍数 {round(amp, 1)}")

th1, th2 = math.radians(90), 0.0                # 伸直位形：手臂竖直朝天
s1, c1 = math.sin(th1), math.cos(th1)
s12, c12 = math.sin(th1 + th2), math.cos(th1 + th2)
vx = (-L1 * s1 - L2 * s12) * 1 + (-L2 * s12) * 1        # qdot = (1, 1) 时的末端速度
vy = (L1 * c1 + L2 * c12) * 1 + (L2 * c12) * 1
print(f"伸直时末端速度 = ({round(vx, 6)}, {round(vy, 6)})")
```

第一行 $90^\circ$：det 满、放大 1 倍，想怎么动就怎么动；走到 $15^\circ$，放大倍数 3.9 倍起步，再往下翻得更凶——"僵"不是开关，是越伸直越费劲的连续谱。

### 实验 2（python）：要在僵住的方向动 1 米/秒，关节得多疯？

```python title="克莱姆法则解 J·qdot=(1,0)"
import math                                     # 浮窗同一命名空间

L1, L2 = 2, 1

for deg in [90, 15]:                            # 好姿势 vs 逼近伸直
    th2 = math.radians(deg)
    s12, c12 = math.sin(th2), math.cos(th2)     # 肩角取 0：总角就是肘角
    a = -L2 * s12                               # J[0][0]
    b = -L2 * s12                               # J[0][1]
    c = L1 + L2 * c12                           # J[1][0]
    d = L2 * c12                                # J[1][1]
    det = L1 * L2 * math.sin(th2)               # 行列式公式，避开数值误差
    q1 = (d * 1 - b * 0) / det                  # 克莱姆法则：行列式之比解二元一次方程组
    q2 = (-c * 1 + a * 0) / det
    speed = math.hypot(q1, q2)                  # 合转速大小
    print(f"肘角 {deg:>2}°: 所需关节转速 = ({round(q1, 1)}, {round(q2, 1)}), 合计 {round(speed, 1)} rad/s")
```

同样是"末端沿径向 1 米/秒"，好姿势只要 $(0,-1)$，伸到 $15^\circ$ 就要 $(1.9,-5.7)$——关节转速被放大了近 6 倍，再伸下去电机先烧。这就是奇异附近的"速度账单"。

### 快问快答

```quiz
手臂在什么位形下最"僵"？
- 完全折叠成一团时
- 手臂完全伸直或完全折叠（肘角 0 或 180 度） [*]
- 关节转速最大的时刻
? det J = L1·L2·sin(肘角)，肘角 0 或 180 度时行列式归零，末端在径向以外的方向失去速度能力。
```

:::warning[常见误区]

**误区一**："你以为奇异就是机械卡死。" 关节照样转得动，卡住的是"关节转速 → 末端速度"这张地图——它把某些方向的输入压没了。机械结构没坏，坏的是自由度。

**误区二**："你以为奇异附近只是慢。" 速度被压扁的另一面是力的放大（对偶关系 $J^T$）：奇异附近微小的关节力矩能撑住巨大的末端力——这既是"一夫当关"的省力，也是"一碰就爆"的失控。

**误区三**："你以为加减速器能救奇异。" 放大的是比值 $1/\sin\theta_2$，功率上限不变：电机再强，横向上该没速度还是没速度。工程解法是规划时就避开奇异区（奇异性躲避），不是硬闯。

:::

## 6. 练习

**练习 1**：初始代码把雅可比的第二列抄成了第一列（小臂项丢了独立性），能跑但速度错。修到与公式一致：

```exercise
# @title: 练习：伸直手臂的末端速度与行列式
# @check: 速度 = (-4.0, 0.0)
# @check: 行列式 = 0.0
# @hint: 雅可比第一列含 L1 与 L2 两项、第二列只含小臂项；行列式有现成公式 L1*L2*sin(th2)，伸直时 sin(0)=0。
import math                                     # 三角函数标准库

L1, L2 = 2, 1                                   # 大臂 2、小臂 1
th1 = math.radians(90)                          # 肩角 90°：大臂竖直
th2 = 0.0                                       # 肘角 0°：小臂排成一条直线

s1, c1 = math.sin(th1), math.cos(th1)
s12, c12 = math.sin(th1 + th2), math.cos(th1 + th2)
s2 = math.sin(th2)                              # 肘角自己的正弦，专供行列式公式

J11 = -L1 * s1 - L2 * s12
J12 = -L1 * s1 - L2 * s12                       # ← 错在这：第二列该是 -L2*s12
J21 = L1 * c1 + L2 * c12
J22 = L1 * c1 + L2 * c12                        # ← 同病：该是 L2*c12

vx = J11 * 1 + J12 * 1                          # 关节转速 qdot = (1, 1)
vy = J21 * 1 + J22 * 1
det = L1 * L2 * s2                              # 行列式公式

print(f"速度 = ({round(vx, 6)}, {round(vy, 6)})")
print(f"行列式 = {round(det, 6)}")
```

**练习 2**：把练习 1 的 $\theta_2$ 改成 $180^\circ$（完全折叠），重算 $\det J$ 与末端速度。回答：折叠奇异和伸直奇异在物理画面上有什么不同？（提示：一个朝里僵、一个朝外僵。）

<details>
<summary>点开查看逐步解答</summary>

$\theta_2=180^\circ$：$s_2=\sin180^\circ=0$，$\det J=0$ ✓ 仍是奇异。此时小臂折回大臂上，两杆叠成一根"半长杆"（长 $|L_1-L_2|=1$），末端贴着肩。末端速度只剩沿"叠杆"方向（径向朝里）的分量，切向消失——与伸直时的"朝外僵"互为镜像。

数值上：$s_{12}=\sin270^\circ=-1$、$c_{12}\approx0$，$v_x=-2\cdot1-1\cdot(-1)=-1$、$v_y\approx0$；放大倍数同为 $1/\sin\theta_2\to\infty$。工程上折叠奇异叫"肘部内奇点"，伸直叫"边界奇点"——规划器对后者的处理通常是限位（根本不许伸到 0），对前者是绕肘。
</details>

## 7. 选读：力的对偶与雅可比的另一半

<details>
<summary>选读 · Jᵀ：力矩与力的翻译官</summary>

静力学里末端受力 $\vec F$ 时，各关节需要输出的力矩是 $\vec\tau=J^T\vec F$。雅可比的转置把"速度地图"反过来用：速度被 $J$ 放大的方向，力就被 $J^T$ 压小——这正是功率守恒 $\vec F^T\vec v=\vec\tau^T\dot q$ 的推论。

于是奇异附近的两幅画面天然成对：伸直的手臂可以"白嫖"结构刚性——竖直撑住巨梁几乎不费力矩（$\vec F$ 沿臂方向时 $\vec\tau\approx0$）；但想让它横移一毫米，$J^{-1}$ 里 $1/\det J$ 的爆炸会把关节转速或力矩需求顶上天。做遥操作与触觉设备（haptic）的人对这对画面最敏感：奇异附近设备要么"推不动"，要么"反弹伤人"，都源自同一个行列式。

</details>

## 8. 下一站

位置、速度都说清了，该轮到"力气"：要让机械臂按轨迹动起来，每个关节得输出多少力矩？牛顿的矢量账本在多连杆上会越记越乱——下一课换一本能量账本：广义坐标与拉格朗日方程。

→ [广义坐标与拉格朗日方程：动力学的系统化写法](./70-generalized-lagrangian.md)
