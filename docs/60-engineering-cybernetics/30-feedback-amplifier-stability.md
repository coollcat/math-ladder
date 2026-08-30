---
title: 反馈放大器的稳定性问题
lesson_id: engineering-cybernetics/feedback-amplifier-stability
prereqs:
  - engineering-cybernetics/state-observation-disturbance
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
  - phase-lag-instability
applications:
  - audio-amplifier-design
  - rocket-actuator-loop
exits:
  - engineering
---

# 反馈放大器的稳定性问题

## 1. 开场钩子

音响功放本该让信号更稳更干净，但设计不良时会发出啸叫或低频轰鸣。原因常常不是增益不够，而是某些频率下反馈信号晚到了半圈，纠正反而变成激励。

## 2. 直觉解释

负反馈要求回授信号和误差反相。若装置在高频引入接近 $180^\circ$ 的相位滞后，再叠加比较器的负号，回授就近似同相。此时增益仍大于 1，扰动每绕一圈都被放大，系统失稳。

## 3. 正式定义

单位反馈闭环传递函数为：

$$T(s)=\frac{L(s)}{1+L(s)}.$$

$L(s)$ 是开环回路增益。闭环极点满足：

$$1+L(s)=0.$$

若某个极点的实部为正，对应时间响应含增长项。工程上不只问稳定与否，还问离不稳定边界多远。

## 4. 分步例题

考虑离散近似：

$$G(z)=\frac{g}{z-a},$$

单位反馈闭环特征方程为 $z-a+g=0$。

1. 极点是 $z=a-g$；
2. 稳定条件是 $|a-g|<1$；
3. 若 $a=0.9$，$g=0.5$，极点是 $0.4$，衰减；
4. 若 $g=1.9$，极点是 $-1.0$，边界振荡；
5. 若 $g=2.1$，极点是 $-1.2$，交替发散。

## 5. 动手实验

### 实验 1：阻尼不足时的受迫振动

```viz
{
  "type": "resonance-lab",
  "title": "高增益回路像低阻尼振子",
  "m": 1,
  "c": 0.12,
  "k": 4,
  "force": 0.35,
  "omega": 2
}
```

驱频滑到固有频率附近，振幅迅速增大。降低阻尼或增大外力的组合，就是许多放大器失稳的直觉版。

### 实验 2：有界离散闭环仿真

```python title="反馈增益扫过稳定边界"
# sliders: gain=1.70 [0.20:2.20:0.05], a=0.90 [0.50:1.20:0.05]
h = 1.0                  # 步长：离散采样周期
end_time = 24.0          # 时间终点：观察 24 步
max_steps = int(end_time / h)
signal = 0.001           # 初始微小扰动
largest_abs = 0.0        # 记录最大幅值

for step in range(max_steps):
    largest_abs = max(largest_abs, abs(signal))
    plant_next = a * signal                    # 未建模简化装置
    signal = plant_next - gain * signal        # 单位负反馈闭合

print(f"终点时间={max_steps*h:.0f}步")
print(f"闭环极点={a-gain:.2f}")
print(f"最大幅值={largest_abs:.4f}")
print("判定=" + ("stable" if abs(a-gain)<1 else "unstable"))
```

把增益拖过 1.9，最大幅值从衰减转为增长。这个玩具模型只有一阶滞后；连续系统还会有多个相位滞后叠在一起。

## 6. 练习

```exercise
# @title: 练习：找稳定增益上限
# @check: 1.900
# @check: unstable
# @hint: 极点 z=a-g 的绝对值小于 1 才稳定；等号是振荡边界。
a = 0.9
gain_limit = a - 1   # 错：这是稳定下界，不是正向增益上限
verdict = "stable" if abs(a - 2.05) < 1 else "unstable"
print(f"{abs(gain_limit):.3f}")
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

由 $|0.9-g|<1$ 得 $-0.1<g<1.9$。这里正向增益上限是 $1.9$；$g=2.05$ 时极点为 $-1.15$，响应交替发散。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为负反馈一定稳定。相位滞后可能让它在一个频段变成正反馈。

**误区二**：你以为时域没炸就是安全。工程还要求增益裕度和相位裕度。

**误区三**：你以为模型阶数越低越保险。删掉的滞后恰恰可能决定稳定性。

:::

## 8. 选读：为什么高频危险

<details>
<summary>选读 · 储能与延迟</summary>

电容、电感、机械柔性、传输线和采样都会随频率产生相位移动。高频增益即使不大，只要在穿越频率附近仍有足够幅值，就可能把系统推过临界点。Bode 图正是把这些信息按频率摊开的工具。

</details>

## 9. 快问快答

```quiz
闭环极点出现在复平面哪里时不稳定？
- 实部小于零
- 实部大于零 [*]
- 虚部等于零
? 连续系统中实部为正的时间项会指数增长；虚部只描述振荡频率。
```

## 10. 下一站

要看见相位滞后，最好换一副眼镜：把频率当作横轴。下一课建立 Bode 图直觉。

→ [频率响应与 Bode 图直觉](./35-frequency-response-bode.md)
