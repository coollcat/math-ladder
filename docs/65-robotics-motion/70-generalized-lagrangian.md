---
title: 广义坐标与拉格朗日方程：动力学的系统化写法
lesson_id: robotics-motion/generalized-lagrangian
prereqs:
  - robotics-motion/jacobian-singularities
  - ode/newton-to-lagrange
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
  - generalized-coordinates
  - lagrangian
  - euler-lagrange-robotics
applications:
  - robot-arm-control
  - physics-engine
exits:
  - robotics-motion/manipulator-dynamics
---

# 广义坐标与拉格朗日方程：动力学的系统化写法

## 1. 从一个场景开始

新到的动力学工程师接到任务：给三连杆机械臂建运动方程。他按课本画了三张受力图——每个连杆标上重力、电机力矩，还有关节里成对出现、方向相反的**约束力**。6 个笛卡尔坐标、4 条杆长约束方程，解到最后发现：纸上写得最长的，恰恰是那些互相抵消、根本不做功的内力。

老师傅路过，丢下一句话："**别记流水账，记收支表。**"第 22 章《从牛顿到拉格朗日》已经把这套方法的推导讲过一遍——本课不重推，专讲一件事：机器人工程师怎么把它当成**流水线**用，让约束力自己从账上消失。

## 2. 直觉解释

两种记账法的区别：

- **牛顿法是流水账**：每个部件单独开户，杆与杆之间的约束力一笔不落。账目最多，但大部分条目最后互相冲销。
- **拉格朗日法是收支表**：只记两种钱——**动能**（进账）和**势能**（支出），记完自动出方程。约束力？它们从不做功，在能量账本上根本没有户头。

枢纽概念是**广义坐标**：只要个数等于自由度、且天然满足所有约束的一组数，就叫广义坐标 $q$。它一点都不新——正运动学课里的关节角就是它：三关节平面臂的 $q=(\theta_1,\theta_2,\theta_3)$，三个数管三件事，杆长约束从写方程起就自动成立。对比笛卡尔：6 个坐标还得补 4 条约束看住冗余。

拉格朗日量则是把两种钱轧成的一个数：

$$L = T - V$$

动能减势能，一个标量打包系统的全部动力学信息。直觉版读法：$T$ 说"跑多快"，$V$ 说"站多高"，方程描述两者如何互相兑换。

## 3. 正式定义

对每个广义坐标 $q_i$，欧拉-拉格朗日方程为

$$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot q_i}\right)-\frac{\partial L}{\partial q_i}=Q_i,\qquad i=1,\dots,n$$

逐项读法（这是本课的核心技能）：

| 项 | 读法 | 类比 |
| --- | --- | --- |
| $\partial L/\partial \dot q_i$ | 第 $i$ 号坐标的"动量账"（广义动量） | 速度变化要花多少力气 |
| $\dfrac{d}{dt}$ | 这本账随时间的变化率——注意 $q_i$ 依赖 $t$，是**全导数** | 别只对 $t$ 求偏导 |
| $\partial L/\partial q_i$ | 往哪边走能量更便宜的倾向（势能梯度的反面） | 下坡的推力 |
| $Q_i$ | 账本之外的力：电机力矩、摩擦（保守力已含在 $V$ 里） | 外来汇款 |

诚实边界：$L=T-V$ 与右边 $Q_i=0$ 只对保守系统自动成立；电机是要驱动机械臂的，它们从右边进场——这正是下一课 $M(q)\ddot q+\dots=\tau$ 的伏笔。

## 4. 分步例题

**例**：单摆，摆长 $L$、质量 $m$，取广义坐标 $q=\theta$（偏离竖直方向的角度）。推出运动方程。

1. 质心速率 $v=L\dot\theta$，动能 $T=\frac12 mL^2\dot\theta^2$；
2. 以最低点为基准，升高 $h=L(1-\cos\theta)$，势能 $V=mgL(1-\cos\theta)$；
3. 拉格朗日量 $L=T-V=\frac12 mL^2\dot\theta^2-mgL(1-\cos\theta)$；
4. 逐项读：$\partial L/\partial\dot\theta=mL^2\dot\theta$，对 $t$ 取全导数得 $mL^2\ddot\theta$；$\partial L/\partial\theta=-mgL\sin\theta$；
5. 代入方程（右边 $Q=0$）：$mL^2\ddot\theta+mgL\sin\theta=0$，约掉 $mL^2$——

$$\ddot\theta=-\frac{g}{L}\sin\theta$$

注意两处福利：杆的张力（约束力）全程没露面；$\theta$ 从竖直方向量起而不是从水平方向，几何本来就简单。选好广义坐标，方程已经赢了一半。

## 5. 动手实验

单摆的势能是一口"井"：$\theta=0$ 是井底，越偏离越贵。小角度时井壁近似抛物线（这正是小角近似的来源）：

```viz
{
  "type": "plot",
  "title": "单摆势能井 V(q) = 1 - cos(q)：井底在 0，两侧井壁越抖越陡",
  "expr": "1-cos(x)",
  "xmin": -6.28318,
  "xmax": 6.28318,
  "piAxis": true
}
```

### 实验 1（python）：给双连杆臂记能量账

```python title="双连杆臂的能量收支表：T、V 与拉格朗日量"
import math                                     # 三角函数标准库

# sliders: th1=60 [-90:90:15], th2=-90 [-150:150:15]

g = 9.8                                         # 重力加速度（米/秒²）
m1, m2 = 1.0, 1.0                               # 大臂、小臂的质量
L1, L2 = 2.0, 1.0                               # 大臂、小臂的长度
w1, w2 = 0.8, 1.2                               # 两个关节的角速度（广义速度）

r1 = math.radians(th1)                          # radians 把度换成弧度：肩角
r2 = math.radians(th2)                          # 肘角（相对大臂）

vc1 = 0.5 * L1 * w1                             # 大臂质心速率 = 半长 × 角速度
vc2x = -L1 * w1 * math.sin(r1) - 0.5 * L2 * (w1 + w2) * math.sin(r1 + r2)   # 小臂质心速度 x 分量（位置对时间求导）
vc2y = L1 * w1 * math.cos(r1) + 0.5 * L2 * (w1 + w2) * math.cos(r1 + r2)    # 小臂质心速度 y 分量
T = 0.5 * m1 * vc1**2 + 0.5 * m2 * (vc2x**2 + vc2y**2)                      # 动能账：两段质心的 ½mv² 相加

h1 = 0.5 * L1 * math.sin(r1)                    # 大臂质心离关节轴的高度
h2 = L1 * math.sin(r1) + 0.5 * L2 * math.sin(r1 + r2)                       # 小臂质心高度
V = m1 * g * h1 + m2 * g * h2                   # 势能账：质量 × g × 高度

print(f"动能 T = {round(T, 3)} 焦, 势能 V = {round(V, 3)} 焦")
print(f"拉格朗日量 L = T - V = {round(T - V, 3)} 焦")
```

拖动两个角度滑块：$T$ 只认广义速度（把 `w1` 调大试试），$V$ 只认姿态。整套计算只用了两个广义坐标，一根约束方程都没写——流水线的第一笔红利。

### 实验 2（python）：跑一遍方程，看能量守不守

```python title="从 60° 松手：欧拉-拉格朗日方程的最终形态 + 半隐式积分"
import math                                     # sin 与 pi 住这里

# sliders: th0=60 [10:170:10]

g, L = 9.8, 1.0                                 # 重力加速度与摆长
dt = 0.01                                       # 步长：一小段时间（秒）
th = math.radians(th0)                          # 初始角（弧度）
w = 0.0                                         # 初始角速度：静止松手

for step in range(201):                         # 模拟 2 秒
    alpha = -(g / L) * math.sin(th)             # 欧拉-拉格朗日方程的最终形态
    w = w + alpha * dt                          # 先更新速度（半隐式欧拉：能量不易飘）
    th = th + w * dt                            # 再用新速度更新角度
    if step % 50 == 0:                          # 每 50 步（0.5 秒）汇报一次
        E = 0.5 * L * L * w * w + g * L * (1 - math.cos(th))    # 机械能 = 动能 + 势能
        print(f"t = {round(step * dt, 2)}s  角度 {round(math.degrees(th), 1)}°  机械能 {round(E, 3)} 焦")
```

从 60° 松手，初始机械能 $mgL(1-\cos60^\circ)=4.9$ 焦。盯着最后一列：数值始终在 4.9 焦附近小幅波动、且不随时间单向漂移——摆荡把势能井底的钱换成动能、再换回去，总量纹丝不动（半隐式欧拉的能量误差只打转、不累积）。把 `th0` 拉到 170° 再跑：大幅摆荡依然守恒，小角近似早就不管用的领地。

```quiz
平面里一台三关节机械臂，选一组广义坐标最省事的做法是？
- 给每个连杆都写 x、y 两个坐标，一共 6 个
- 直接选 3 个关节角，让杆长约束自动满足 [*]
- 先解出末端坐标，再反推每个关节
? 广义坐标的个数等于自由度个数：3 个关节角天然满足所有杆长约束；6 个笛卡尔坐标反而要再补 3 条约束方程看住冗余，约束力也跟着进账本。
```

## 6. 练习

```exercise
# @title: 练习：30° 释放的摆，逐项读一遍
# @check: 精确角加速度 = -4.9
# @check: 小角近似 = -5.131
# @check: 近似误差百分比 = 4.7
# @check: 释放点机械能 = 1.313
# @hint: 精确值用 sin(th)，小角近似直接用 th 本身（弧度数值）；误差按"差多少 ÷ 精确值 × 100"算；机械能从静止释放就只剩势能 mgL(1-cos th)。
import math                                     # 三角函数标准库

g, L = 9.8, 1.0                                 # 重力加速度与摆长
th = math.radians(30)                           # 释放角 30° 换成弧度

alpha_exact = -(g / L) * th                     # ← 错误行
alpha_small = -(g / L) * th                     # 小角近似：sin(th) ≈ th
err_pct = abs(alpha_small - alpha_exact) / abs(alpha_exact) * 100   # 近似误差百分比
E = g * L * (1 - math.cos(th))                  # 静止释放时的机械能 = 势能

print(f"精确角加速度 = {round(alpha_exact, 3)}")
print(f"小角近似 = {round(alpha_small, 3)}")
print(f"近似误差百分比 = {round(err_pct, 1)}")
print(f"释放点机械能 = {round(E, 3)}")
```

第一行修好后（把 $\theta$ 换成 $\sin\theta$），30° 这个不大不小的角度会让小角近似露出 4.7% 的马脚——这就是为什么实验 2 坚持用完整方程而不是近似。

## 7. 选读：三行验证它就是牛顿第二定律

怀疑这套账本？拿最熟悉的一维弹簧验货：$L=\frac12 m\dot x^2-\frac12 kx^2$。逐项读法三步——$\partial L/\partial\dot x=m\dot x$，对 $t$ 取全导数得 $m\ddot x$，$\partial L/\partial x=-kx$。代入方程立得 $m\ddot x+kx=0$，与牛顿第二定律逐字吻合。账本没有魔法，只是把"力"换算成了"能量的斜率"。

## 8. 下一站

单摆是一号坐标的玩具；真实机械臂有 $n$ 个关节，把欧拉-拉格朗日流水线跑完，方程会自动整理成矩阵形态 $M(q)\ddot q+C(q,\dot q)\dot q+g(q)=\tau$——下一课就读这本"成品账"。
