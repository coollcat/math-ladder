---
title: 状态、观测与扰动
lesson_id: engineering-cybernetics/state-observation-disturbance
prereqs:
  - engineering-cybernetics/blackbox-input-output
  - ode/phase-portraits
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
  - hidden-state
  - observation-model
applications:
  - rocket-telemetry
  - manufacturing-diagnostics
exits:
  - engineering
---

# 状态、观测与扰动

## 1. 开场钩子

航天测控屏上常显示几十条曲线，但真正的火箭姿态、速度和燃料质量不可能全部直接看到。传感器给的是带噪声的观测；风是扰动；控制必须基于估计出来的状态。

## 2. 直觉解释

状态是“今天加上规律，足以算明天”的最小记忆。观测是状态投影到传感器的影子；扰动是外部推力。生产线里，真实在制品数量可能是状态，扫码数是观测，急单和缺料是扰动。

## 3. 正式定义

线性模型写成：

$$x_{k+1}=Ax_k+Bu_k+w_k,\qquad y_k=Cx_k+v_k.$$

$x$ 是状态，$w$ 是过程扰动，$v$ 是测量噪声。若 $C=I$，全部状态可见；若 $C$ 只取部分分量，就需要观测器。

最简单的一维校正观测器为：

$$\hat x_{k+1}=a\hat x_k+b u_k+l(y_k-\hat y_k).$$

$l$ 越大越相信测量，但也越容易把噪声当状态。

## 4. 分步例题

设某慢变温度满足 $x_{k+1}=0.9x_k+d_k$，传感器读数为 $y_k=x_k+v_k$。

1. 若没有过程扰动和噪声，令 $\hat x_0=y_0$ 即可跟踪；
2. 若 $d_k=0.2$ 持续加热而模型不知道，预测会越来越低；
3. 校正项 $l(y-\hat y)$ 把偏差按比例加回估计；
4. 取 $l=0.5$ 能较快修正缓慢偏差；
5. 若 $v$ 很大，应减小 $l$ 并做平滑。

## 5. 动手实验

### 实验 1：相图里盘旋回原点的轨迹

```viz
{
  "type": "phase-portrait",
  "title": "姿态角与角速度回到原点",
  "matrix": [-0.2, 1, -2, -0.8],
  "x0": 2,
  "y0": 0
}
```

横轴是角度，纵轴是角速度。图里是一个稳定螺旋：相图上没有"沿直线走"的不变方向，只有轨迹顺着速度场一圈圈向内盘旋、收回原点。只看角度可能短暂变好，但角速度仍指向错误方向；状态空间同时看两者。

### 实验 2：一维观测器仿真

```python title="温度状态的有限时段观测"
# sliders: l=0.45 [0.05:0.95:0.05], disturbance=0.15 [0:0.40:0.01], noise=0.08 [0:0.30:0.01]
a = 0.90                 # 模型中的状态衰减系数
x_true = 10.0            # 真实状态：先假设初始温度已知
x_hat = 8.0              # 观测器估计值：故意给一个错误初值
h = 1.0                  # 步长：每个采样周期
end_time = 12.0          # 时间终点：只仿真 12 个周期
max_steps = int(end_time / h)

for step in range(max_steps):
    process_error = noise * ((step % 7) - 3) / 3   # 有界伪噪声，不用随机循环
    measured = x_true + process_error              # 带噪声的观测
    innovation = measured - x_hat                  # 新息：测量和预测的差
    x_hat = a * x_hat + l * innovation             # 校正观测器更新
    x_true = a * x_true + disturbance              # 真实系统受持续小扰动

print(f"终点时间={max_steps*h:.0f}周期")
print(f"真实终值={x_true:.2f}")
print(f"估计终值={x_hat:.2f}")
print(f"绝对误差={abs(x_true-x_hat):.2f}")
```

增大校正增益 $l$，对持续扰动的响应更快；拖得太大，伪噪声也会被放大成估计抖动。

## 6. 练习

```exercise
# @title: 练习：从位置序列恢复平均速度
# @check: 2.00
# @check: -1.00
# @hint: 位移差除以时间差得到平均速度；最后一段位移是负数。
positions = [0, 2, 4, 3]
h = 1
speed_ab = positions[1] - positions[0]            # 错：位移差有了，但忘了除以时间
speed_cd = (positions[-1] + positions[2]) / h     # 错：掉头段应该用减号
print(f"{speed_ab:.2f}")
print(f"{speed_cd:.2f}")
```

<details>
<summary>点开查看逐步解答</summary>

A 到 B 的速度是 $(2-0)/1=2$；C 到 D 的速度是 $(3-4)/1=-1$。初始代码第一行忘了除以时间步长，第二行把掉头段的减号写成了加号。位置只是观测，差分后才能得到速度这类派生状态。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为测到的就是状态。传感器通常只是状态的部分、滞后或噪声版本。

**误区二**：你以为所有扰动都该实时抵消。频繁动作可能放大成本和执行器磨损。

**误区三**：你以为观测器增益越大越好。它提高响应速度，也降低抗噪能力。

:::

## 8. 选读：可观测性

<details>
<summary>选读 · 影子能否还原物体</summary>

若有限时间内的一组输出能唯一确定初始状态，就说系统可观测。线性时不变系统的常用判据检查由 $C,A C,\dots,A^{n-1}C$ 拼成的矩阵是否满秩。不可观测的状态只能靠机理假设或增加传感器补齐。

</details>

## 9. 快问快答

```quiz
新息指的是什么？
- 执行器和模型的功率差
- 测量值与当前估计预测值的差 [*]
- 目标值和参考值的商
? 新息表示观测带来了多少新信息，观测器用它修正状态估计。
```

## 10. 下一站

当反馈对象变成高增益放大器，相位滞后会让“纠正”变成“火上浇油”。下一课看稳定性问题的经典起点。

→ [反馈放大器的稳定性问题](./30-feedback-amplifier-stability.md)
