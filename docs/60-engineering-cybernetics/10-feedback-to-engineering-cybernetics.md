---
title: 从反馈控制到工程控制论
lesson_id: engineering-cybernetics/feedback-to-engineering-cybernetics
prereqs:
  - ode/vibration-resonance
  - fourier/spectrum
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - engineering-cybernetics
applications:
  - rocket-attitude-control
  - power-grid-frequency
exits:
  - engineering
---

# 从反馈控制到工程控制论

## 1. 开场钩子

火箭遇阵风时姿态会偏，电网负荷突增时频率会掉。设备完全不同，但都要连续测量偏差、计算纠正量、执行修正动作，并防止纠正过头。工程控制论研究的就是这种跨装置的共同结构。

## 2. 直觉解释

一个反馈回路有四个角色：

| 角色 | 火箭例子 | 电网例子 |
| --- | --- | --- |
| 被控量 | 姿态角 | 系统频率 |
| 传感器 | 陀螺仪 | 相量测量装置 |
| 控制律 | 舵面指令 | 发电功率调整 |
| 执行器 | 液压舵机 | 调速器和调频机组 |

反馈的价值不是宣称“消灭误差”，而是在不确定环境中让误差有界并收敛到可用范围。

## 3. 正式定义与历史定位

离散闭环可写成：

$$x_{k+1}=A x_k+B u_k+E d_k,\qquad u_k=K(r_k-Cx_k).$$

$x_k$ 是状态，$d_k$ 是扰动，$r_k$ 是参考值，$K$ 是反馈增益。闭环矩阵近似为 $A-BKC$ 后，特征值位置决定偏差是否衰减。

钱学森《工程控制论》的历史贡献，是把控制规律、信息反馈、稳定调节和工程实现统一成可分析的系统科学。它继承了 Nyquist、Bode、Wiener 等人的成果，服务于当时航天与飞行器工程；后来 Kalman 等人继续发展状态空间方法。我们学习的是学科脉络，不把复杂成就简化成个人神话。

## 4. 分步例题

设温度偏离目标 $e_0=4$ 度，控制器每步消除当前误差的比例为 $g$。

1. $e_{k+1}=(1-g)e_k$；
2. 若 $g=0.2$，五步后误差是 $4(0.8)^5\approx1.31$；
3. 若 $g=1.2$，误差符号翻转并被放大；
4. 数学边界是 $|1-g|<1$，即 $0<g<2$；
5. 真实系统还有延迟、饱和和噪声，所以工程增益通常远比边界保守。

## 5. 动手实验

### 实验 1：反馈强度改变扰动残留

```viz
{
  "type": "plot",
  "title": "单位扰动的残留随增益下降",
  "expr": "load/(1+x)",
  "xmin": 0,
  "xmax": 10,
  "sliders": [
    { "name": "load", "min": 0.2, "max": 2, "step": 0.1, "value": 1 }
  ]
}
```

曲线先快速下降，之后收益递减。过大的增益还会触发未建模动态风险，这张静态图看不到。

### 实验 2：有界闭环仿真

```python title="五步温控闭环"
# sliders: gain=0.35 [0.05:1.20:0.05], e0=4 [1:8:1]
h = 0.05            # 时间步长：每次更新的间隔
end_time = 0.25     # 时间终点：仿真只运行到这里
max_steps = int(end_time / h)

error = e0          # 当前量和目标的差
history = []
for step in range(max_steps + 1):
    history.append(error)
    correction = gain * error       # 控制作用与当前误差成正比
    error = error - h * correction  # Euler 更新：用小步长逼近连续变化

print(f"终点时间={step*h:.2f}s")
print(f"最终误差={error:.3f}")
print("轨迹=" + ", ".join(f"{value:.2f}" for value in history))
```

把增益拖大，早期收敛更快；超过 2 时序列振荡。真实回路还会叠加传感器噪声，所以保守裕度不可省略。

## 6. 练习

```exercise
# @title: 练习：判断反馈增益是否稳定
# @check: stable
# @check: unstable
# @hint: 对 e(k+1)=(1-g)e(k)，要看更新系数绝对值是否小于 1。
def judge(gain):
    # 经验法则先只按 gain<1 判断——跑一遍看看 1.7 会被怎么分类
    return "stable" if gain < 1 else "unstable"

print(judge(1.7))
print(judge(2.2))
```

<details>
<summary>点开查看逐步解答</summary>

初始代码只检查 `gain < 1`，会把仍稳定的 1.7 误判为不稳定。正确条件是 $|1-g|<1$，所以 $g=1.7$ 收敛，$g=2.2$ 发散。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为反馈就是自动化全部。没有可靠传感信息和执行约束，公式不能变成工程。

**误区二**：你以为增益越大越好。高增益低频压误差，也可能放大噪声或激发高频不稳定。

**误区三**：你以为《工程控制论》只是书名。它代表把对象、信息、算法和物理约束放进统一框架的方法。

:::

## 8. 选读：为什么叫“工程”控制论

<details>
<summary>选读 · 数学结构与装置约束</summary>

纯数学可以研究抽象映射的稳定性；维纳的控制论更关注通信、控制和有机系统的共同语言。《工程控制论》的侧重点是把伺服机构、飞行器、导航和调节装置翻译成传递函数、稳定性判据和可实现算法。材料、时延、饱和、测量误差因此不是附加说明，而是问题的一部分。

</details>

## 9. 快问快答

```quiz
工程控制论最关心下面哪件事？
- 只推导最优控制公式
- 把控制规律、信息反馈、稳定性和工程实现统一分析 [*]
- 用更多名词替换机械设计
? 它的系统科学视角强调对象、信息、算法和物理装置不能拆开看。
```

## 10. 下一站

有了回路还不够。下一课先把系统、环境、信息和调节切开，避免把所有复杂现象都笼统叫作反馈。

→ [系统、环境、信息和调节](./15-systems-information-regulation.md)
