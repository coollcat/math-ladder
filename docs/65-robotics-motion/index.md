---
title: 第 65 章 · 机器人与无人机的运动数学
description: 从旋转矩阵到四旋翼悬停：正逆运动学、拉格朗日动力学、轨迹跟踪、Kalman 融合、SLAM 定位建图、运动规划，以及视觉伺服、模仿学习与 VLA 前沿。
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
---

# 机器人与无人机的运动数学

机器人和无人机是应用数学的阅兵场：矩阵负责姿态，Jacobian 负责速度，拉格朗日方程负责受力，优化负责规划，滤波负责估计。本章把散落在各卷的工具组装成"会动的数学"，解释一台机械臂和一架四旋翼从建模到受控的全链路。

这一章按下面的路线图推进：

1. [位姿与坐标系](./10-pose-frames.md)——工厂里一台机械臂要去抓桌上的杯子；
2. [正运动学：二连杆手算](./20-forward-kinematics.md)——扫地机器人的小手臂要伸进沙发底够到一颗纽扣；
3. [路径规划：可视图与 A* 雏形](./30-planning-astar.md)——仓库里一台 AGV（自动搬运车）要从货架区驶向打包台，路上货架林立；
4. [采样规划：RRT 让树替你探路](./35-rrt-sampling-planning.md)——不铺格子撒骰子：随机样本、最近邻枝头、伸一步查碰撞，概率完备但不承诺最短；
5. [四元数选讲：免奇异的姿态语言](./40-quaternions-attitude.md)——阿波罗警报里那三个排成一平面的陀螺框架；
6. [逆运动学与数值求根](./50-inverse-kinematics.md)——从"手到肩"反着解：一问两答与不可达圆环；
7. [速度雅可比与奇异位形](./60-jacobian-singularities.md)——手臂伸直那一刻，关节在转、末端却僵了；
8. [广义坐标与拉格朗日方程：动力学的系统化写法](./70-generalized-lagrangian.md)——别记受力流水账，记能量收支表；
9. [机械臂动力学方程：一本三栏的力账](./80-manipulator-dynamics.md)——惯量、假力与重力各管一栏，静止悬停也要出力；
10. [四旋翼动力学与微分平坦选讲](./90-quadrotor-flatness.md)——想往右飞？整架飞机先歪头；
11. [计算力矩控制与轨迹跟踪](./100-computed-torque-tracking.md)——先把非线性整本抵消，再用 PD 收尾；
12. [LQR 回望与 MPC 入门：会看路面的控制器](./110-lqr-mpc-trajectory.md)——每一步都对着未来一小段路面重新求解；
13. [状态估计：卡尔曼滤波与 IMU/GNSS 融合直觉](./120-kalman-imu-gnss.md)——桥洞十秒失锁，滤波知道自己在瞎走。
14. [SLAM：边建图边找自己](./125-slam-pf-ekf.md)——粒子滤波几百张选票押上所有可能，EKF 用切线对付非线性。
15. [相机位姿与 SfM：从照片堆里同时解出自己在哪](./135-sfm-pose-estimation.md)——绕雕像拍一圈照片：视差三角测量与捆绑调整把位姿和点一起解出来；
16. [SLAM 现代后端：位姿图优化与 ICP 点云配准](./140-pose-graph-icp.md)——位姿图是弹簧网、ICP 是对接器：回环边一收紧，整圈漂移被摊平；
17. [视觉 SLAM：把相机当成主传感器](./145-visual-slam.md)——前端跟得住、后端没错账：特征点法与直接法的实时接力；
18. [视觉伺服：用像素误差直接开车](./150-visual-servoing.md)——误差别换算，在像素里闭环：图像雅可比按深度分配增益；
19. [力与阻抗控制：给机械臂装上手感](./155-impedance-control.md)——位置控制命令位置，阻抗控制命令手感：虚拟弹簧阻尼的三个旋钮；
20. [模仿学习与行为克隆：看一遍，学就会](./160-imitation-learning.md)——把示范当标注数据照单全收，再用 DAgger 给分布偏移补课；
21. [3DGS-SLAM：边飞边泼一张可微地图](./165-splatting-slam.md)——地图是一套可微的高斯参数：跟踪冻结地图调位姿，建图冻结位姿补地图；
22. [视觉-语言-动作：机器人基础模型](./170-vla-robot-foundation.md)——动作词元化：像聊天一样生成动作，语言成为任务规范器。

## 前置回望

第 7 章的单位圆是四元数平面特例的画布；第 11/21 章的向量、矩阵与特征值是姿态和雅可比的底座；第 20 章的偏导数表格在这里升级成速度放大器；第 22 章的 ODE 与《从牛顿到拉格朗日》供着动力学的能量账本；第 29/30 章的图与最短路通向运动规划；第 43 章的优化驱动逆解与 MPC；第 52 章的反馈与 LQR 是跟踪控制的引擎。

## 交互形态

- 每课配 `viz` 曲线仪表：可达距离、行列式触零、势能井、有效惯量、误差包络、代价抛物线、卡尔曼增益、EKF 切线、网格爆炸对比、重投影误差碗、损失碗、频率阶梯、高斯剖面；
- 判题式练习全部实跑校验（@check 逐行比对）；
- 浮窗 python 滑块实验：半角构造、转置迭代、能量账本、重力补偿、倾斜反解、两档阻尼、滚动 MPC、桥洞融合、粒子重采样、RRT 生长树、ICP 配准与回环摊账、描述子匹配、IBVS 收敛、阻抗退让、BC 拟合、1D 泼溅地图、动作词解码。

## 实战挑战 · 二连杆沙发底三连抓

**背景**。第 20 课开场那台钻沙发底的小机器人回来了：机械臂大臂 $L_1=3$ 米、小臂 $L_2=2$ 米，今晚要连抓三颗纽扣。为了手算可控，三关姿态全部采用特殊角——肩角 $\theta_1$ 与肘角 $\theta_2$ 只允许取 $90^\circ$ 或 $180^\circ$。开工前重申本课两条铁律：其一，$\theta_2$ 是相对大臂量的**相对角**，小臂真正的世界朝向是总角 $\theta_1+\theta_2$；其二，`math.cos` 与 `math.sin` 只认弧度，第 10 课就上岗的 `math.radians()` 是天天站岗的门卫。

**题目**。按下表配方依次出手（肘角一律相对大臂量起）：

- 关卡一 $(\theta_1,\theta_2)=(90^\circ,\ 90^\circ)$：除末端外，还要顺路报出**肘部**（大臂末端）的世界坐标；
- 关卡二 $(90^\circ,\ 180^\circ)$；
- 关卡三 $(180^\circ,\ 90^\circ)$。

特殊角的三角函数与教科书只差 $10^{-16}$ 量级的浮点尘埃，所以统一用 `round` 圆整再 `int` 收尾——落点必须是**精确整数**，绝不拿浮点数比大小。初始代码能跑，但埋着两处工程现场级事故：其中一处正是"把度当弧度直接喂给 `math.sin`"。把它修到四行检查全部通过。

```exercise
# @title: 实战挑战：三颗纽扣与两处事故隐患
# @check: 肘部 (0, 3)
# @check: 末端 (-2, 3)
# @check: 末端 (0, 1)
# @check: 末端 (-3, -2)
# @hint: 小臂的朝向由总角 theta1 + theta2 决定；而 theta2 进 cos/sin 之前必须先过 math.radians 这一关。
import math                                          # 标准库 math：角度换算与三角函数都住这里

L1, L2 = 3, 2                                        # 一行赋两个变量：大臂 3 米、小臂 2 米

def fk(deg1, deg2):                                  # def 自定义函数：输入两个关节角，单位都是"度"
    th1 = math.radians(deg1)                         # radians 把"度"翻译成"弧度"——cos/sin 只认弧度
    th12 = th1 + deg2                                # ← 坑 1 在这：deg2 没换汇就直接排进了弧度队，度假扮弧度冲进 sin/cos
    x = L1 * math.cos(th1) + L2 * math.cos(th1)      # ← 坑 2 在这：小臂那一项照抄了肩角——它明明装在大臂末端、绕自己的肘转
    y = L1 * math.sin(th1) + L2 * math.sin(th1)
    return x, y

def tidy(v):                                         # 浮点清洁工：专治 6.1e-17 一类的尘埃值
    return int(round(v))                             # round 先圆整到最近整数，int 再撕掉小数尾巴

poses = [(90, 90), (90, 180), (180, 90)]             # list 列表存三关配方：(肩角, 肘角)，全是特殊角

base_th = math.radians(poses[0][0])                  # poses[0][0] ＝关卡一的肩角（下标从 0 数起）
print(f"肘部 ({tidy(L1 * math.cos(base_th))}, {tidy(L1 * math.sin(base_th))})")   # f-string 把数值嵌进模板文字

tips = []                                            # 空列表：准备收纳三关落点
for deg1, deg2 in poses:                             # for 循环自动解包：每轮领走一对角度
    tip_x, tip_y = fk(deg1, deg2)                    # 多重赋值：一次接住函数返回的两个分量
    tips.append((tidy(tip_x), tidy(tip_y)))          # append 入队；圆括号把两个数打成元组
for tx, ty in tips:                                  # 第二趟循环：逐关亮出末端坐标
    print(f"末端 ({tx}, {ty})")
```

<details>
<summary>点开查看逐步解答</summary>

**坑 1 · 度当弧度直接喂三角函数。** `math.sin` 的合同写得明明白白："收弧度"。裸的 `deg2=180` 在弧度世界里相当于 $180$ rad，转掉十几整圈后落在毫不相干的角度上，落点自然四海为家。处方一行：进三角函数之前把总角整体 `math.radians()`。初学者最常见的翻车姿势恰恰是"肩角记得换、肘角忘了换"——因为两个角度常常分行书写，门卫只查验了一半队伍。

**坑 2 · 相对角当世界角使，小臂朝向抄错。** 本课符号表专门警告过：$\theta_2$ **相对大臂延长线**量起。小臂的世界朝向永远是总角 $\theta_1+\theta_2$。初始代码两项全用 `th1`，等于强行宣布"小臂与大臂齐头并进"，二连杆瞬间退化成一根 $5$ 米的长直杆——这也解释了为什么错误输出全都趴在过肩的那条射线上。

**修复后的手算复查。** 三关都落在单位圆的十字架上：

| 配方 | 肘部 | 总角 | 末端 |
| --- | --- | --- | --- |
| $(90^\circ,90^\circ)$ | $(0,3)$ | $180^\circ$ | $(0,3)+(2\cos180^\circ,\ 2\sin180^\circ)=(-2,3)$ |
| $(90^\circ,180^\circ)$ | $(0,3)$ | $270^\circ$ | $(0,3)+(0,-2)=(0,1)$ |
| $(180^\circ,90^\circ)$ | $(-3,0)$ | $270^\circ$ | $(-3,0)+(0,-2)=(-3,-2)$ |

三颗纽扣到基座的距离分别是 $\sqrt{13}\approx3.61$、$1$、$\sqrt{13}$，全部落在工作空间圆环 $[\,|L_1-L_2|,\ L_1+L_2\,]=[1,5]$ 内，物理可达 ✓。至于 `round + int` 为什么合法：特殊角的余弦与正弦离教科书值的偏差只有 $10^{-16}$ 量级（比如 $\cos90^\circ=6.1\times10^{-17}$），一刀圆整便与纸面手算严丝合缝——这正是第 10 课实验 2 干脆手写 `c90, s90 = 0, 1` 来躲浮点噪声的同款思路。

参考答案（运行输出恰为 @check 四行）：

```python
import math

L1, L2 = 3, 2

def fk(deg1, deg2):
    th1 = math.radians(deg1)                        # 肩角：度 → 弧度
    th12 = math.radians(deg1 + deg2)                # 总角（肘角是相对量）整体换成弧度
    x = L1 * math.cos(th1) + L2 * math.cos(th12)    # 大臂投影 + 小臂沿总角的投影
    y = L1 * math.sin(th1) + L2 * math.sin(th12)
    return x, y

def tidy(v):
    return int(round(v))                            # 圆整去尘埃，落点成为精确整数

poses = [(90, 90), (90, 180), (180, 90)]

th_first = math.radians(poses[0][0])
print(f"肘部 ({tidy(L1 * math.cos(th_first))}, {tidy(L1 * math.sin(th_first))})")

tips = []
for deg1, deg2 in poses:
    px, py = fk(deg1, deg2)
    tips.append((tidy(px), tidy(py)))
for tx, ty in tips:
    print(f"末端 ({tx}, {ty})")
```

</details>

相关课程：[正运动学：二连杆手算](./20-forward-kinematics.md)、[位姿与坐标系](./10-pose-frames.md)。

:::note[生产状态]

本章二十一门正式课全部齐线收官（2026-08-29 前沿回填：采样规划 RRT、SfM 相机位姿、位姿图与 ICP、视觉 SLAM、视觉伺服、阻抗控制、模仿学习、3DGS-SLAM、VLA）：九段式骨架完整，判题式练习的 @check 输出已逐条实跑校验，全章闭环 `npm run validate` 通过。

:::

## 实战挑战 · 单连杆的 sin 与 cos 别对调

一根长 $L=2$ 的连杆，关节角 $90^\circ$ 时，末端坐标是 $x = L\cos\theta$、$y = L\sin\theta$。下面这题把 sin 和 cos 对调了，修到输出 `0.0 2.0`：

```exercise
# @title: 实战挑战：sin 与 cos 别对调
# @check: 0.0 2.0
# @hint: x 分量用 cos、y 分量用 sin，别写反。
import math

L = 2.0                  # 连杆长度
theta = math.pi / 2      # 关节角 90°（弧度）
x = L * math.sin(theta)  # ← 问题在这：x 该用 cos
y = L * math.cos(theta)
print(round(x, 2), round(y, 2))
```

<details>
<summary>点开查看逐步解答</summary>

从 $x$ 轴起量角：水平分量用余弦，竖直分量用正弦：

```python
x = L * math.cos(theta)    # 2 * cos(90°) = 0
y = L * math.sin(theta)    # 2 * sin(90°) = 2
print(round(x, 2), round(y, 2))   # 0.0 2.0
```

改完：$\theta=90^\circ$ 时 $\cos=0$、$\sin=1$，末端在 $(0, 2)$——正上方。初始代码对调后得 $(2, 0)$，方向差了一整个直角。正运动学"从关节角到末端位置"的全部计算，都从这一对 sin/cos 的搭配开始，后面二连杆、三连杆只是把多段投影叠加起来。

</details>
