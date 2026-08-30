---
title: 四旋翼动力学与微分平坦选讲
lesson_id: robotics-motion/quadrotor-flatness
prereqs:
  - robotics-motion/manipulator-dynamics
  - robotics-motion/quaternions-attitude
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
  - underactuated-system
  - differential-flatness
applications:
  - drone-trajectory
  - drone-photography
exits:
  - robotics-motion/computed-torque-tracking
---

# 四旋翼动力学与微分平坦选讲

## 1. 从一个场景开始

航拍导演提的要求听着简单："无人机从 A 平移到 B，镜头全程朝前。"可四旋翼压根没有朝右的推进器——它只有四个朝上的螺旋桨。想往右加速？整架飞机必须先**向右倾斜**，让推力矢量斜过去，才"借"得到水平力。

四个输入管六个自由度，这在动力学里有个名字：**欠驱动**。更神的是，这类系统有一张隐藏的快捷方式——**微分平坦**：位置和偏航角一旦定好，倾角、推力全部可以**代数算出**，一行微分方程都不用积。航拍航线能提前一帧不差地算完整条，靠的就是它。

## 2. 直觉解释

先看平面版（只保留高度、水平位置和俯仰角）：推力 $T$ 沿机身轴，前倾角 $\theta$，动力学两行写完：

$$m\ddot x=-T\sin\theta,\qquad m\ddot z=T\cos\theta-mg$$

读法：推力的水平分量管横移，竖直分量管高度——**两件事共用一个推力矢量**，这就是欠驱动的全部麻烦与全部机遇。

机遇在哪？把两式倒过来看：假如目标加速度 $(\ddot x,\ddot z)$ 已经给定，那么

$$T=m\sqrt{\ddot x^2+(\ddot z+g)^2},\qquad \theta=\operatorname{atan2}(-\ddot x,\ \ddot z+g)$$

推力和倾角被**代数地**决定了。也就是说：**轨迹一旦画好，姿态和油门是轨迹的"影子"**——这就是微分平坦。悬停是它的特例：$\ddot x=0$、$\ddot z=0$ 给出 $T=mg$、$\theta=0$，机翼水平悬着。

## 3. 正式定义

**欠驱动系统**：控制输入个数少于位形自由度个数的系统。四旋翼三维版是 6 个自由度对 4 个输入（总推力 + 三个姿态力矩）。

**微分平坦**：若存在一组**平坦输出** $\sigma$，使系统全状态与全输入都能写成 $\sigma$ 及其有限阶导数的函数（不含积分），则系统平坦。

| 对象 | 平面四旋翼 | 读法 |
| --- | --- | --- |
| 平坦输出 $\sigma$ | $(x,z)$ | 你真正关心的航迹 |
| 推力 $T$ | $m\lvert\ddot\sigma+(0,g)\rvert$ | 轨迹二阶导的模 |
| 倾角 $\theta$ | $\operatorname{atan2}(-\ddot x,\ddot z+g)$ | 推力方向自动给出 |
| 三维版 $\sigma$ | $(x,y,z,\psi)$ | 位置三件套 + 偏航角 |

诚实边界：平坦性是**这一族动力学**的运气，不是普遍性质；机械臂全驱动、四旋翼这族欠驱动，恰好都平坦，而带接触碰撞的系统多半不平坦。不平坦时就得请出下一课的通用套路。

## 4. 分步例题

**例**：质量 $1$ 公斤的四旋翼想悬停在原高度、同时以 $a_x=2$ 米每二次方秒向右加速。求推力与倾角。

1. 高度锁定：$\ddot z=0$，加速度矢量 $=(2,\ 9.8)$（向上托住重力的份额也在里面）；
2. 推力模长：$T=\sqrt{2^2+9.8^2}=\sqrt{4+96.04}=10.0$ 牛；
3. 倾角：$\theta=\operatorname{atan2}(-2,\ 9.8)$，负号表示**向右加速要向右倾**（按本文符号约定），约 $11.5^\circ$；
4. 对比悬停：推力只多了约 $2\%$——四旋翼加速几乎不靠"加大油门"，靠**挪方向**；
5. 复查：水平分量 $T\sin\theta=10\times0.2=2$ 牛，恰是 $ma_x$ ✓。

## 5. 动手实验

推力账：横移需求越大，推力从悬停的 $9.8$ 牛往上爬——但斜率温和，1 倍重力加速度的横移也只要 1.41 倍悬停推力：

```viz
{
  "type": "plot",
  "title": "总推力随水平加速度需求变化（质量 1kg）：1g 横移仅 1.41 倍悬停推力",
  "expr": "sqrt(9.8^2 + x^2)",
  "xmin": 0,
  "xmax": 20
}
```

### 实验 1（python）：正弦横移的倾斜账本

```python title="给定轨迹 x(t)，代数反解每刻的倾角与推力"
import math                                     # 三角函数标准库

g = 9.8                                         # 重力加速度
m = 1.0                                         # 机身质量
A, w = 0.5, 2.0                                 # 横移轨迹 x = A·sin(w·t) 的振幅与角频率

for t in [0, 0.5, 1.0, 1.5, 2.0]:               # 每半秒采样一次
    ax = -A * w * w * math.sin(w * t)           # 平坦公式：加速度是轨迹的二阶导（解析求好）
    T = m * math.sqrt(g * g + ax * ax)          # 推力 = 加速度矢量的模
    pitch = math.degrees(math.atan2(-ax, g))    # 倾角 = atan2(水平, 竖直)——推力方向
    print(f"t = {round(t, 2)}s  加速度 {round(ax, 2)}, 推力 {round(T, 2)} 牛, 倾角 {round(pitch, 1)}°")
```

横移最猛的时刻倾角也不过约 $10^\circ$，推力只比悬停多零点几牛——商用无人机载人杯里的咖啡几乎感觉不到机动，因为机动全靠"微微歪头"。改 `A` 或 `w` 再跑：轨迹越激进，倾角与推力涨得越快，平坦公式当场给出该姿势的"体力报价"。

### 实验 2（python）：绕圈的机，永远斜向圆心

```python title="圆轨迹：倾角恒定、方向指向圆心"
import math                                     # atan2 与 pi 住这里

g = 9.8                                         # 重力加速度
R, w = 1.25, 1.0                                # 圆半径与角频率

for t in [0.0, math.pi / 2]:                    # 取圆上两个正交时刻
    x, y = R * math.cos(w * t), R * math.sin(w * t)         # 平坦输出：位置
    ax, ay = -R * w * w * math.cos(w * t), -R * w * w * math.sin(w * t)     # 向心加速度
    tilt = math.degrees(math.atan2(math.sqrt(ax * ax + ay * ay), g))        # 合倾角大小
    heading = math.degrees(math.atan2(ay, ax))  # 倾斜方向（加速度指向）
    print(f"位置 ({round(x, 2)}, {round(y, 2)})  合倾角 {round(tilt, 1)}°  指向 {round(heading, 0)}° 方位")
```

两个时刻合倾角都是约 $7.3^\circ$，指向从正北转到了正西——机腹始终斜向圆心，像握着一根看不见的绳子转圈。匀速圆周是"平坦性最美"的展品：轨迹定，姿态定，连倾斜方向都是常数模长。

```quiz
四旋翼想在悬停中开始向右水平加速，正确的操作是？
- 只加大左侧两个电机的转速
- 整机向右倾斜，让推力矢量斜向右 [*]
- 先猛增总推力，水平力会自然出现
? 四个螺旋桨全都近似朝上，水平方向没有直接执行器；唯一的水平力来源是推力矢量的水平分量，而它只能靠倾斜机体来制造。
```

## 6. 练习

```exercise
# @title: 练习：一脚油门 1g 的横移
# @check: 总推力 = 13.86
# @check: 前倾角 = 45.0
# @check: 过载倍数 = 1.41
# @hint: 推力矢量要同时干两件事：竖直分量扛住重力、水平分量提供 ax，模长是 sqrt(g² + ax²)；倾角用 atan2(ax, g) 求度数；过载倍数 = 推力 ÷ 悬停推力。
import math                                     # sqrt 与 atan2 住这里

g = 9.8                                         # 重力加速度
m = 1.0                                         # 机身质量
ax = 9.8                                        # 想要的水平加速度：整整 1g

T = m * g                                       # ← 错误行
pitch = math.degrees(math.atan2(ax, g))         # 前倾角：推力方向的反读
overload = T / (m * g)                          # 过载倍数：相对悬停推力

print(f"总推力 = {round(T, 2)} 牛")
print(f"前倾角 = {round(pitch, 1)} 度")
print(f"过载倍数 = {round(overload, 2)}")
```

修好第一行（模长 $\sqrt{g^2+a_x^2}$ 而不是 $mg$）：1g 横移要 1.41 倍悬停推力、前倾整整 $45^\circ$——手机运镜软件里的"急停"，就是这一瞬间的事。

## 7. 选读：轨迹生成一瞥——最小抖动多项式

平坦性把"规划姿态"化简成"规划位置"。最常用的砖块是五次多项式 $x(t)=10t^3-15t^4+6t^5$：它从 $0$ 平滑走到 $1$，端点速度、加速度全为零（起降无顿挫）。代进 $t=\frac12$ 验证：$10\cdot\frac18-15\cdot\frac1{16}+6\cdot\frac1{32}=1.25-0.9375+0.1875=0.5$，对称居中 ✓。把每段拼起来得到整条航线，再用平坦公式逐时刻反解倾角与推力——商用无人机的航线因此可以**完全离线**算好，机上只管执行。

## 8. 下一站

四旋翼用平坦性"抄近道"：先把轨迹定死，姿态自动跟出。机械臂没有现成的平坦输出，却有一招更通用的"整本抵消"——在力矩里实时减去 $C\dot q+g$、再乘上 $M(q)$ 的逆，把强非线性系统硬生生掰成双积分器。这就是下一课的**计算力矩控制**。
