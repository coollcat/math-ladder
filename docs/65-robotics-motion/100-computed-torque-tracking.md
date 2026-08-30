---
title: 计算力矩控制与轨迹跟踪
lesson_id: robotics-motion/computed-torque-tracking
prereqs:
  - robotics-motion/manipulator-dynamics
  - robotics-motion/quadrotor-flatness
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
  - computed-torque-control
  - feedback-linearization
  - tracking-error
applications:
  - robot-arm-control
  - cnc-machine
exits:
  - robotics-motion/lqr-mpc-trajectory
---

# 计算力矩控制与轨迹跟踪

## 1. 从一个场景开始

焊枪要沿一条焊缝以恒定速度走完，误差不许超过一毫米。试出来的现象很气人：同一个比例-微分（PD）控制器，手臂伸直时跟得挺稳，一折叠就开始画圈振荡——因为上一课说过，**惯量随姿势变**：同一组增益，对"重姿势"是软脚虾，对"轻姿势"是神经刀。

思路于是反过来：与其调增益迁就非线性的机器，不如**先把机器的非线性整本抵消**，把任何姿势都变成同一个人畜无害的双积分器，再用最普通的 PD 收尾。这就是**计算力矩控制**（computed torque control），也叫反馈线性化。

## 2. 直觉解释

回到 80 课的三栏账 $M(q)\ddot q+C(q,\dot q)\dot q+g(q)=\tau$。控制器现在握着笔：力矩 $\tau$ 由我们自己填。那就一次付清三栏——

$$\tau=M(q)\,v+C(q,\dot q)\dot q+g(q)$$

其中 $v$ 是我们想给机械臂的"加速度命令"。代回方程，两边 $M\ddot q$ 对 $M v$、$C$ 栏对 $C$ 栏、$g$ 栏对 $g$ 栏，全部冲销，只剩

$$\ddot q=v$$

不管手臂伸直还是折叠、甩快还是甩慢，被抵消后的机器只剩一个赤裸裸的双积分器：你命令什么加速度，它就给什么加速度——第 22 章最基础的 $v=at$ 从此对所有姿势通用。

这个加速度命令 $v$ 也不是随便填的：装上 PD 反馈去追期望轨迹 $q_d(t)$。记误差 $e=q_d-q$，令

$$v=\ddot q_d+K_d\dot e+K_p e$$

代入 $\ddot q=v$，得到误差的宿命：

$$\ddot e+K_d\dot e+K_p e=0$$

这正是弹簧-阻尼振子的标准方程——选好 $K_p$、$K_d$，误差必然指数归零。前馈（$\ddot q_d$ 项）负责"跟上"，反馈（$K_p$、$K_d$ 项）负责"纠偏"。

## 3. 正式定义

**计算力矩控制律**：

$$\tau=M(q)\left(\ddot q_d+K_d\dot e+K_p e\right)+C(q,\dot q)\dot q+g(q),\qquad e=q_d-q$$

| 项 | 身份 | 读法 |
| --- | --- | --- |
| $M(q)(\cdots)$ | 惯量折算 | 想要的加速度 × 当前的"重量"，翻译成力矩 |
| $C(q,\dot q)\dot q+g(q)$ | 前馈抵消栏 | 把科氏假力与重力一口气预付 |
| $\ddot q_d$ | 轨迹前馈 | 期望轨迹自带的加速度 |
| $K_p$、$K_d$ | 刚度与阻尼 | 只伺候误差，不伺候机器 |

参数读法：把 $K_p=\omega_n^2$、$K_d=2\zeta\omega_n$ 与标准二阶系统对齐——$\omega_n$ 是误差收敛的快慢档，$\zeta$ 是味道旋钮（$\zeta=1$ 临界阻尼：最快不超调）。**模型越准，抵消越干净**；模型有残差时误差方程多出扰动项，这是它对模型精度的依赖（选读再谈）。

## 4. 分步例题

**例**：取 $K_p=25$（故 $\omega_n=5$），求临界阻尼的 $K_d$，并估计初始误差 $e(0)=1$ 弧度衰减到 0.1 的时间。

1. 临界阻尼要求 $\zeta=1$：$K_d=2\omega_n=2\times5=10$；
2. 临界阻尼的误差解形如 $e(t)=(1+\omega_n t)\,e^{-\omega_n t}$（重根的标配解）；
3. 令 $(1+5t)e^{-5t}=0.1$：试 $t=0.46$，$(1+2.3)\times e^{-2.3}=3.3\times0.1003\approx0.331$，还太大；
4. 再试 $t=0.92$：$(1+4.6)\times e^{-4.6}=5.6\times0.01005\approx0.056<0.1$，已越过；
5. 夹出答案约 $t\approx0.85$ 秒——半秒清零是工业焊缝跟踪的日常节奏。

## 5. 动手实验

临界阻尼的误差包络 $(1+5t)e^{-5t}$：先凸后陡降，一秒内贴地：

```viz
{
  "type": "plot",
  "title": "临界阻尼误差包络 (1+5t)·exp(-5t)：0.85 秒左右过 0.1 线",
  "expr": "(1+5*x)*exp(-5*x)",
  "xmin": 0,
  "xmax": 1
}
```

### 实验 1（python）：线性化魔法现场验证

```python title="变惯量 + 重力的标量臂：抵消前后对比"
import math                                     # cos 与 sin 住这里

# sliders: q=1.0 [-1.5:1.5:0.25], vd=2.0 [-3:3:0.5]

Kp, Kd = 25.0, 10.0                             # 刚度与阻尼：临界搭档
qd, dqd, ddqd = 0.5, 0.0, 0.0                   # 期望位置/速度/加速度（此处静止目标）

q = q                                           # 当前关节角（滑块）
dq = 0.5                                        # 当前关节角速度
M = 2.0 + math.cos(q)                           # 变惯量：随姿势在 1 到 3 之间变
grav = 9.8 * math.sin(q)                        # 重力项（摆式关节）

e = qd - q                                      # 跟踪误差
de = dqd - dq                                   # 误差速度
v = ddqd + Kd * de + Kp * e                     # 加速度命令（前馈 + PD）

tau_lin = M * v + grav                          # 计算力矩控制律（本例 C 项为零）
acc_after = (tau_lin - grav) / M                # 抵消后机器的真实加速度
print(f"加速度命令 v = {round(v, 3)}, 抵消后实际加速度 = {round(acc_after, 3)}")

tau_pd = Kd * de + Kp * e                       # 裸 PD：不懂惯量与重力
acc_pd = (tau_pd - grav) / M                    # 裸 PD 的实际加速度
print(f"裸 PD 加速度 = {round(acc_pd, 3)}, 与命令偏差 = {round(acc_pd - v, 3)}")
```

计算力矩那一行，实际加速度与命令**逐位相等**——无论滑块把姿势搬去哪里。裸 PD 的加速度却随姿势漂移：同一个命令，重姿势欠火候、轻姿势过了头。这就是"焊枪折叠就画圈"的数字版。

### 实验 2（python）：两档阻尼的误差宿命

```python title="误差方程积分：欠阻尼震荡 vs 临界阻尼直落"
import math                                     # 本实验只需四则运算

Kp = 25.0                                       # 刚度固定
dt = 0.01                                       # 步长（秒）

for Kd in [2.0, 10.0]:                          # 欠阻尼 vs 临界阻尼
    e, de = 1.0, 0.0                            # 初始误差 1 弧度、静止
    marks = []
    for step in range(0, 151):                  # 模拟 1.5 秒
        if step % 25 == 0:                      # 每 0.25 秒记录一次
            marks.append(round(e, 3))
        dde = -Kd * de - Kp * e                 # 误差方程：ë + Kd·ė + Kp·e = 0
        de = de + dde * dt                      # 半隐式欧拉：先速度
        e = e + de * dt                         # 后位置
    print(f"Kd = {Kd}: 误差轨迹 {marks}")
```

`Kd = 2` 一档：误差冲过零点反复振荡、慢慢衰减——焊枪画圈的元凶。`Kd = 10` 一档：误差单调俯冲，1.25 秒时只剩约 $0.02$。参数没变机器没变，变的只是**给误差配的弹簧阻尼**——因为非线性已经被前馈整本付清，二阶方程才得以原样生效。

```quiz
计算力矩控制先用模型抵消非线性，再用 PD 收尾，这么做的核心收益是？
- 电机省电：抵消后力矩总量变小
- 全姿态等效成同一个双积分器，一组增益处处一致 [*]
- 可以不再需要关节角传感器
? 抵消后误差服从统一的线性方程，Kp、Kd 不必随姿势重调；省电与传感器都与此无关——抵消栏本身常常还要多花力矩。
```

## 6. 练习

```exercise
# @title: 练习：配一组临界阻尼增益
# @check: 固有频率 = 5.0
# @check: 临界阻尼系数 = 10.0
# @check: 0.46 秒后误差包络 = 0.331
# @hint: 固有频率是 Kp 的平方根；临界阻尼要求 Kd = 2 倍固有频率（忘乘 2 是本题埋的雷）；包络公式 (1 + wn*t)·exp(-wn*t) 只在临界阻尼时成立。
import math                                     # sqrt 与 exp 住这里

Kp = 25.0                                       # 刚度（工程上先定它）
t = 0.46                                        # 考察时刻（秒）

wn = math.sqrt(Kp)                              # 固有频率：收敛快慢档
Kd = wn                                         # ← 错误行
envelope = (1 + wn * t) * math.exp(-wn * t)     # 临界阻尼的误差包络

print(f"固有频率 = {round(wn, 1)}")
print(f"临界阻尼系数 = {round(Kd, 1)}")
print(f"0.46 秒后误差包络 = {round(envelope, 3)}")
```

修好那行（补上 2 倍）：$\omega_n=5$、$K_d=10$、包络值 $0.331$——离初始误差 1 还剩三分之一，节奏与例题的半秒清零吻合。

## 7. 选读：模型不准怎么办

真实机械臂的 $M$、$g$ 从来测不准：负载变了、摩擦藏在每个关节。残差进入误差方程就成了扰动 $\tilde\tau$，临界阻尼会把它压成有界的小误差，但压不成零。工程三件套由此登场：**鲁棒控制**（按最坏残差加边界项）、**自适应控制**（在线估计负载参数）、以及把"沿轨迹的即时抵消"升级成"滚动窗口里的全局统筹"——模型预测控制，下一课的主角。

## 8. 下一站

计算力矩控制是"走一步看一步"的即时抵消：每瞬间把账付清。要是轨道前方有一个已知转弯，能不能提前规划接下来 2 秒的力矩序列，让跟踪误差与能耗一起最小？这就是 LQR 的看家本领与 MPC（模型预测控制）的滚动版——下一课把两代控制器请上同一台机械臂。
